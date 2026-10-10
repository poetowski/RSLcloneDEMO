// The battle scene: runs the turn loop, asks the player (or AI) for actions
// and turns each SkillResult into choreography — approach, attack animation,
// frame-accurate hits, projectiles, effects, numbers, counterattacks, return
// to formation. Presentation rules: docs/MECHANICS_GUIDE.md "Presentation".
import { Clock, ease } from '../../engine/clock';
import { H, W } from '../../engine/screen';
import { decide, Decision } from '../battle/ai';
import { Battle, BattleEvent, Combatant, SkillResult, Unit } from '../battle/battle';
import { starsFor } from '../battle/sim';
import { BOSS_HP } from '../data/campaign';
import { champion } from '../data/champions';
import { STATUSES } from '../data/statuses';
import { ChampionDef, EnemySlot, SkillDef, StageDef, Stats, StatusId, TeamId, ZoneDef } from '../data/types';
import { Assets } from './assets';
import { FxLayer } from './fx';
import { Hud, ResultsInfo, SkillSlot } from './hud';
import { UnitView } from './unit';
import { ZoneView } from './zone';

export interface BattleSetup {
  player: ChampionDef[];
  /** each player champion's stats with its Weaver Matrix (base stats when absent) */
  playerStats?: Stats[];
  enemy: EnemySlot[];
  zone: ZoneDef;
  /** campaign stage (labels, power); absent for practice and demos */
  stage?: StageDef;
  seed: number;
  auto: boolean;
  speed: 1 | 2 | 3;
  /** dev/screenshots only: scales enemy HP (?hp=0.1) */
  enemyHp?: number;
}

export interface BattleOutcome {
  winner: TeamId;
  survivors: number;
  stars: 1 | 2 | 3;
  turns: number;
}

export interface BattleHooks {
  /** called once when the battle ends; returns what the results panel shows */
  finish?(o: BattleOutcome): ResultsInfo;
  next?(): void;
  retry?(): void;
  /** leave the battle (map, retreat, end of a demo) */
  exit?(): void;
  /** the player changed auto or speed (saved as the new default) */
  settings?(auto: boolean, speed: 1 | 2 | 3): void;
}

/** Effects that glow (drawn additively). */
const ADDITIVE = new Set(['hit', 'chi', 'holy', 'heal', 'heal_sun', 'fire_burst', 'revive', 'counter', 'dispel', 'vigil', 'shield_up', 'sun_orb', 'spear_thrust', 'spear_spiral', 'javelin_burst', 'sound_burst', 'rhythm', 'rhythm_pulse', 'crescendo', 'magnet_pulse', 'starfall', 'overdrive']);

export class BattleScene {
  readonly clock = new Clock();
  battle!: Battle;
  views = new Map<string, UnitView>();
  readonly fx: FxLayer;
  readonly zone: ZoneView;
  readonly hud: Hud;
  auto: boolean;
  private speeds: (1 | 2 | 3)[] = [1, 2, 3];
  private speedIdx = 0;
  active?: UnitView;
  choice: { actor: Unit; skill: SkillDef; resolve: (d: Decision) => void } | null = null;
  hoverUnit: UnitView | null = null;
  private shakeAmp = 0;
  private flash = 0;
  winner: TeamId | null = null;
  results: ResultsInfo | null = null;
  private resultsT = 0;
  private t = 0;
  private runId = 0;
  private shadows: HTMLCanvasElement[];
  private lastReal = 0;
  paused = false;
  demoSkill: string | null = null;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private a: Assets,
    readonly setup: BattleSetup,
    private hooks: BattleHooks = {},
  ) {
    this.fx = new FxLayer(a, this.clock);
    this.zone = new ZoneView(a, setup.zone);
    this.hud = new Hud(a);
    this.auto = setup.auto;
    this.speedIdx = Math.max(0, this.speeds.indexOf(setup.speed));
    this.clock.speed = this.speeds[this.speedIdx];
    this.shadows = [34, 28, 22, 16].map((w) => makeShadow(Math.round(w * setup.zone.shadow.stretch), w));
    this.build(setup.seed);
  }

  private build(seed: number) {
    const s = this.setup;
    const enemy: Combatant[] = s.enemy.map((e) => ({ def: champion(e.champion), boss: e.boss }));
    this.battle = new Battle(
      s.player.map((def, i) => ({ def, stats: s.playerStats?.[i] })),
      enemy,
      { seed, enemyPower: s.stage?.power ?? 1, bossHp: BOSS_HP },
    );
    if (s.enemyHp) {
      for (const u of this.battle.alive('enemy')) u.hp = u.maxHp = Math.max(1, Math.round(u.maxHp * s.enemyHp));
    }
    this.views.clear();
    const sp = this.zone.json.spawns;
    for (const u of this.battle.units) {
      const [x, y] = (u.team === 'player' ? sp.player : sp.enemy)[u.slot];
      const v = new UnitView(u.uid, u.champion, u.team, this.a, x, y, u.maxHp, u.boss);
      v.tm = u.tm;
      this.views.set(u.uid, v);
    }
    this.winner = null;
    this.results = null;
    this.active = undefined;
    this.hud.title = null;
  }

  view(uid: string): UnitView {
    return this.views.get(uid)!;
  }

  get stageLabel(): string {
    const st = this.setup.stage;
    return st ? `Stage ${st.id}` : this.demoSkill ? 'Academy demonstration' : 'Practice';
  }

  // ---------------------------------------------------------------------------
  // flow
  // ---------------------------------------------------------------------------

  async run() {
    const id = ++this.runId;
    const live = () => id === this.runId;
    await this.intro();
    while (live() && !this.battle.winner()) {
      const before = new Map([...this.views].map(([k, v]) => [k, v.tm]));
      const actor = this.battle.advance();
      await this.animateMeters(before);
      if (!live()) return;
      const av = this.view(actor.uid);
      this.active = av;
      const st = this.battle.startTurn(actor);
      if (st.events.length) {
        await this.playTicks(st.events);
        await this.clock.wait(250);
      }
      if (this.battle.winner()) break;
      if (!actor.alive) {
        this.battle.endTurn(actor);
        this.active = undefined;
        await this.settleDeaths();
        continue;
      }
      if (st.skip) {
        const frozen = this.battle.has(actor, 'freeze');
        this.fx.text(av.uid, av.x, av.head().y - 6, frozen ? 'FROZEN' : 'STUNNED', { color: frozen ? '#a6ecff' : '#fff070', variant: 'bold' });
        await this.clock.wait(750);
        this.endTurn(actor);
        await this.clock.wait(150);
        continue;
      }
      let d: Decision;
      if (actor.team === 'player' && !this.auto) d = await this.awaitChoice(actor);
      else {
        await this.clock.wait(actor.team === 'enemy' ? 420 : 260);
        d = decide(this.battle, actor);
      }
      if (!live()) return;
      const res = this.battle.useSkill(actor, d.skill, d.target);
      await this.perform(res);
      if (!live()) return;
      this.endTurn(actor);
      await this.clock.wait(160);
    }
    if (!live()) return;
    this.active = undefined;
    await this.clock.wait(500);
    this.outro(this.battle.winner()!);
  }

  private endTurn(actor: Unit) {
    const ev = this.battle.endTurn(actor);
    const v = this.view(actor.uid);
    v.tm = actor.tm;
    for (const e of ev) this.applyEvent(e, null);
    this.syncStatuses(v);
  }

  private async intro() {
    const vs = [...this.views.values()];
    for (const v of vs) {
      const off = v.team === 'player' ? -60 - v.homeX * 0.3 : W + 60 + (W - v.homeX) * 0.3;
      v.x = off;
      v.facing = v.homeFacing;
      v.play('run');
    }
    const st = this.setup.stage;
    if (st && !this.demoSkill) this.hud.showBanner(`Stage ${st.id}`, '#ffe9a0');
    await this.clock.wait(250);
    await Promise.all(
      vs.map(async (v, i) => {
        await this.clock.wait(i * 70);
        await this.clock.tween(v, { x: v.homeX }, Math.abs(v.homeX - v.x) * 2.6, ease.outQuad);
        v.play('idle');
      }),
    );
    const boss = vs.find((v) => v.boss);
    if (boss && !this.demoSkill) {
      this.hud.showTitle('BOSS', '#ffd0c0', '#c02020', `${boss.champion.name}, ${boss.champion.title}`);
      void this.fx.spawn('taunt', boss.x, boss.head().y - 8, { layer: 'top' });
      this.shake(3);
      await this.clock.wait(1300);
    }
    this.hud.showTitle('FIGHT!', '#fff0a0', '#f08a20');
    await this.clock.wait(950);
    this.hud.title = null;
  }

  private outro(w: TeamId) {
    this.winner = w;
    for (const v of this.views.values()) {
      if (v.dead) continue;
      if (v.team === w && v.hasAnim('skill')) void v.play('skill').then(() => v.play('idle'));
    }
    const survivors = this.battle.alive('player').length;
    const outcome: BattleOutcome = { winner: w, survivors, stars: starsFor(this.setup.player.length, survivors), turns: this.battle.turn };
    this.results = this.hooks.finish?.(outcome) ?? { victory: w === 'player', stars: outcome.stars, turns: outcome.turns, stageId: this.setup.stage?.id };
    this.resultsT = 0;
  }

  /** Showcase loop: the owner of `skillId` performs it again and again on fresh HP. */
  async demo(skillId: string, targetSlot = 0) {
    const id = ++this.runId;
    this.demoSkill = skillId;
    await this.intro();
    const actor = this.battle.units.find((u) => u.champion.skills.some((s) => s.id === skillId));
    if (!actor) return;
    const skill = actor.champion.skills.find((s) => s.id === skillId)!;
    while (id === this.runId) {
      for (const u of this.battle.units) {
        u.hp = u.maxHp;
        u.alive = true;
        u.revived = false;
        u.overdriven = false;
        u.statuses = [];
        u.cooldowns = {};
        const v = this.view(u.uid);
        v.hp = v.lagHp = u.hp;
        v.dead = false;
        v.alpha = 1;
        v.statuses = [];
        v.shield = 0;
        v.stunned = false;
        v.setFrozen(false);
        if (v.anim !== 'idle') v.play('idle');
      }
      this.active = this.view(actor.uid);
      const valid = this.battle.validTargets(actor, skill);
      const target = valid[Math.min(targetSlot, valid.length - 1)]?.uid;
      await this.clock.wait(500);
      const res = this.battle.useSkill(actor, skill, target);
      await this.perform(res);
      await this.clock.wait(1100);
    }
  }

  restart() {
    this.build(Math.floor(Math.random() * 1e9));
    void this.run();
  }

  stop() {
    this.runId++;
  }

  private async animateMeters(before: Map<string, number>) {
    const jobs: Promise<void>[] = [];
    for (const u of this.battle.units) {
      const v = this.view(u.uid);
      v.tm = before.get(u.uid) ?? v.tm;
      if (!u.alive) continue;
      jobs.push(this.clock.tween(v, { tm: u.tm }, 360, ease.inOutQuad));
    }
    await Promise.all(jobs);
  }

  private awaitChoice(actor: Unit): Promise<Decision> {
    return new Promise((resolve) => {
      const first = actor.champion.skills.find((s) => this.battle.ready(actor, s)) ?? actor.champion.skills[0];
      this.choice = {
        actor,
        skill: first,
        resolve: (d) => {
          this.choice = null;
          this.hoverUnit = null;
          resolve(d);
        },
      };
    });
  }

  pickSkill(s: SkillDef) {
    const c = this.choice;
    if (!c || !this.battle.ready(c.actor, s)) return;
    const group = s.target === 'allies' || s.target === 'enemies' || s.target === 'self';
    if (c.skill === s && group) c.resolve({ skill: s });
    else c.skill = s;
  }

  private validTargets(): string[] {
    const c = this.choice;
    if (!c) return [];
    return this.battle.validTargets(c.actor, c.skill).map((u) => u.uid);
  }

  clickUnit(v: UnitView) {
    const c = this.choice;
    if (!c) return;
    if (!this.validTargets().includes(v.uid)) return;
    c.resolve({ skill: c.skill, target: v.uid });
  }

  toggleAuto() {
    this.auto = !this.auto;
    this.hooks.settings?.(this.auto, this.speeds[this.speedIdx]);
    if (this.auto && this.choice) {
      const d = decide(this.battle, this.choice.actor);
      this.choice.resolve(d);
    }
  }

  cycleSpeed() {
    this.speedIdx = (this.speedIdx + 1) % this.speeds.length;
    this.clock.speed = this.speeds[this.speedIdx];
    this.hooks.settings?.(this.auto, this.speeds[this.speedIdx]);
  }

  togglePause() {
    if (this.results) return;
    this.paused = !this.paused;
    this.clock.paused = this.paused;
  }

  // ---------------------------------------------------------------------------
  // choreography
  // ---------------------------------------------------------------------------

  private async runTo(v: UnitView, x: number, y: number, speed = 380) {
    const dist = Math.hypot(x - v.x, y - v.y);
    if (dist < 2) return;
    v.facing = x >= v.x ? 'R' : 'L';
    v.play('run');
    this.fx.spawn('dust', v.x, v.y, { layer: 'ground' });
    await this.clock.tween(v, { x, y }, (dist / speed) * 1000, ease.linear);
  }

  /** Vanish in a puff of sand and reappear at (x, y). */
  private async blinkTo(v: UnitView, x: number, y: number, facing: 'R' | 'L') {
    void this.fx.spawn('sand_puff', v.x, v.y, { layer: 'top' });
    await this.clock.tween(v, { alpha: 0 }, 110, ease.inQuad);
    v.x = x;
    v.y = y;
    v.facing = facing;
    void this.fx.spawn('sand_puff', x, y, { layer: 'top' });
    await this.clock.wait(90);
    await this.clock.tween(v, { alpha: 1 }, 110, ease.outQuad);
  }

  private async goHome(v: UnitView, blink = false) {
    if (v.dead) return;
    if (blink) await this.blinkTo(v, v.homeX, v.homeY, v.homeFacing);
    else await this.runTo(v, v.homeX, v.homeY, 420);
    v.x = v.homeX;
    v.y = v.homeY;
    v.facing = v.homeFacing;
    v.play('idle');
  }

  private dir(v: UnitView) {
    return v.homeFacing === 'R' ? 1 : -1;
  }

  async perform(res: SkillResult, top = true) {
    const actor = this.view(res.actor);
    const skill = res.skill;
    const targets = res.targets.map((u) => this.view(u));
    const primary = res.target ? this.view(res.target) : targets[0];
    let dir = this.dir(actor);
    const cx = targets.reduce((s, t) => s + t.x, 0) / Math.max(1, targets.length);
    const cy = targets.reduce((s, t) => s + t.y, 0) / Math.max(1, targets.length);

    if (res.counter) {
      this.hud.showBanner('COUNTERATTACK', '#ffd27a');
      void this.fx.spawn('counter', actor.x, actor.head().y - 10, { layer: 'top', additive: true });
      this.fx.text(actor.uid, actor.x, actor.head().y - 30, 'COUNTER', { color: '#ffd27a', variant: 'bold' });
      await this.clock.wait(260);
    } else if (skill.slot > 1) this.hud.showBanner(skill.name, actor.team === 'player' ? '#ffe9a0' : '#ffc0b0');

    // --- approach
    let moved = false;
    let blinked = false;
    if (skill.approach === 'melee' && primary) {
      moved = true;
      await this.runTo(actor, primary.x - dir * 38, primary.y + 1);
    } else if (skill.approach === 'center') {
      moved = true;
      await this.runTo(actor, cx - dir * 34, cy + 2);
    } else if (skill.approach === 'ranged') {
      moved = true;
      const ty = primary ? primary.y : cy;
      await this.runTo(actor, actor.homeX + dir * 72, actor.y + (ty - actor.y) * 0.25, 340);
    } else if (skill.approach === 'blink' && primary) {
      // strikes from behind: reappear past the target, facing back at it
      moved = blinked = true;
      await this.blinkTo(actor, primary.x + dir * 36, primary.y + 1, actor.homeFacing === 'R' ? 'L' : 'R');
      dir = -dir;
    }
    if (moved && !blinked) actor.facing = actor.homeFacing;

    // --- events grouped per hit, applied as the choreography reaches them
    const remaining = new Set(res.events);
    const applyWhere = (pred: (e: BattleEvent) => boolean) => {
      for (const e of res.events) {
        if (!remaining.has(e) || !pred(e)) continue;
        remaining.delete(e);
        this.applyEvent(e, skill);
      }
    };
    // buffs stripped before the first hit land first
    applyWhere((e) => e.kind === 'dispel');
    const pendings: Promise<unknown>[] = [];
    let landed = 0;
    const hitCount = skill.hits.length;

    if (skill.castFx) pendings.push(this.fx.spawn(skill.castFx, actor.x, actor.y, { layer: 'ground', loops: 3 }));
    const flip = actor.facing === 'L';
    const muzzle = () => {
      const m = actor.champion.muzzle ?? [16, 40];
      return { x: actor.x + (actor.facing === 'R' ? 1 : -1) * m[0], y: actor.y - m[1] };
    };

    const onHit = (k: number) => {
      const fxName = skill.hits[k]?.fx;
      const groupFx = (t: UnitView, delay = 0) =>
        pendings.push(
          (async () => {
            if (delay) await this.clock.wait(delay);
            this.spawnHitFx(fxName, t, flip);
            applyWhere((e) => e.hit === k && e.target === t.uid);
          })(),
        );

      if (skill.id === 'arrow_rain') {
        targets.forEach((t, i) => {
          pendings.push(
            (async () => {
              await this.clock.wait(260 + i * 90);
              for (let n = 0; n < 4; n++) {
                const ox = (n - 1.5) * 9 + (Math.random() - 0.5) * 4;
                const p = this.fx.projectile('arrow_fall', { x: t.x + ox - 30 * dir, y: -20 }, { x: t.x + ox, y: t.chest().y + 6 - n * 3 }, { speed: 720, rotate: false });
                if (n === 0) await p.then(() => groupFx(t));
                await this.clock.wait(40);
              }
            })(),
          );
        });
      } else if (skill.projectile) {
        const from = muzzle();
        const trails: Record<string, string[]> = {
          ice_shard: ['#f2feff', '#a6ecff', '#5cc4ea'],
          arrow_venom: ['#eaffc8', '#4cd43a', '#155a1e'],
          sun_orb: ['#fffbe0', '#ffd060', '#d0401a'],
          grave_orb: ['#e4ffd8', '#8af07a', '#155a1e'],
          sun_javelin: ['#e8fff8', '#36d0c0', '#b02a8c'],
          sound_ring: ['#e8fff8', '#90f5e2', '#18908a'],
        };
        const arcs: Record<string, number> = { grave_orb: 14, sun_javelin: 10 };
        const slow = skill.projectile === 'ice_shard' || skill.projectile === 'grave_orb' || skill.projectile === 'sound_ring';
        for (const t of targets) {
          pendings.push(this.fx.projectile(skill.projectile, from, t.chest(), { speed: slow ? 440 : 620, arc: skill.projectile.startsWith('arrow') ? 8 : arcs[skill.projectile] ?? 0, trail: trails[skill.projectile], rotate: skill.projectile !== 'sun_orb' }).then(() => groupFx(t)));
        }
      } else if (skill.target === 'allies') {
        targets.forEach((t, i) => groupFx(t, i * 80));
      } else if (skill.target === 'enemies') {
        if (fxName === 'shockwave') {
          this.fx.spawn('shockwave', cx, cy, { layer: 'ground' });
          targets.forEach((t) => groupFx(t, 60 + Math.abs(t.x - actor.x) * 0.6));
        } else targets.forEach((t, i) => groupFx(t, 60 + i * 90));
      } else {
        targets.forEach((t) => groupFx(t));
      }
      landed++;
      if (skill.shake) this.shake(skill.shake);
    };

    let leapP: Promise<void> | null = null;
    const onEvent = (e: string) => {
      if (e === 'jump' && primary) {
        const info = actor.animInfo(skill.anim);
        const from = actor.frame;
        const hitFrame = info.hits[0] ?? from + 1;
        const dur = actor.timeBetween(skill.anim, from, hitFrame);
        const sx = actor.x, sy = actor.y, ex = primary.x - dir * 34, ey = primary.y + 1;
        const prox = { k: 0 };
        leapP = (async () => {
          const stop = this.clock.onTick(() => {
            actor.x = sx + (ex - sx) * prox.k;
            actor.y = sy + (ey - sy) * prox.k;
            actor.h = Math.sin(prox.k * Math.PI) * 46;
          });
          await this.clock.tween(prox, { k: 1 }, Math.max(80, dur), ease.linear);
          stop();
          actor.h = 0;
          this.fx.spawn('dust', actor.x, actor.y, { layer: 'ground' });
        })();
        moved = true;
      } else if (e === 'shoot' && skill.id === 'arrow_rain') {
        const m = muzzle();
        for (let n = 0; n < 3; n++) {
          void this.fx.projectile('arrow', { x: m.x, y: m.y - 6 }, { x: actor.x + dir * (60 + n * 14), y: -30 }, { speed: 900 });
        }
      } else if (e === 'cast' && skill.actorFx) {
        const hd = actor.head();
        void this.fx.spawn(skill.actorFx, hd.x + (actor.facing === 'R' ? 8 : -8), hd.y + 8, { layer: 'top', flip: actor.facing === 'L', additive: true });
      }
    };

    await actor.play(skill.anim, { hit: onHit, event: onEvent });
    if (leapP) await leapP;
    // make sure every hit landed (projectiles may still be in the air)
    let guard = 0;
    while (landed < hitCount && guard++ < 200) await this.clock.wait(16);
    await Promise.all(pendings);

    // lifesteal: soul wisps fly back to the actor before the heal shows
    if (skill.lifesteal && primary && res.events.some((e) => e.kind === 'heal' && e.target === actor.uid)) {
      const ws: Promise<void>[] = [];
      for (let n = 0; n < 4; n++) {
        ws.push(
          (async () => {
            await this.clock.wait(n * 70);
            await this.fx.projectile('wisp', primary.chest(), actor.chest(), { speed: 260, arc: 18 + n * 6, rotate: false, trail: ['#fbe8ff', '#a44cff', '#3a0f5a'] });
          })(),
        );
      }
      await Promise.all(ws);
    }
    applyWhere(() => true);
    await this.clock.wait(skill.target === 'allies' ? 300 : 180);

    if (!actor.dead) actor.play('idle');
    if (moved) await this.goHome(actor, blinked);
    await this.settleDeaths();
    // counterattacks answer once the attacker is back in formation; the
    // battle already resolved them, so displayed HP snaps only at the very end
    for (const c of res.counters) await this.perform(c, false);
    if (top) this.snap();
  }

  /** Waits for death and revive animations to finish. */
  private async settleDeaths() {
    let g = 0;
    while ([...this.views.values()].some((v) => (v.dead && v.alpha > 0) || v.anim === 'rise' || (v.anim === 'death' && !v.dead)) && g++ < 400) await this.clock.wait(16);
  }

  /** Snaps displayed HP and statuses to the battle state. */
  private snap() {
    for (const u of this.battle.units) {
      const v = this.view(u.uid);
      v.hp = u.hp;
      this.syncStatuses(v);
    }
  }

  private spawnHitFx(name: string | undefined, t: UnitView, flip: boolean) {
    if (!name) return;
    const an = this.a.fx.json.anims[name];
    if (!an) return;
    if (name === 'crack') {
      void this.fx.spawn('crack', t.x, t.y, { layer: 'ground' });
      const c = t.chest();
      void this.fx.spawn('hit', c.x, c.y, { layer: 'top', additive: true });
    } else if (name === 'holy') {
      void this.fx.spawn('holy', t.x, t.y + 2, { layer: 'top', additive: true });
      void this.clock.wait(160).then(() => this.fx.spawn('shield_up', t.x, t.y, { layer: 'top', additive: true }));
    } else if (name === 'ice_spikes') {
      void this.fx.spawn(name, t.x, t.y, { layer: 'world', z: t.y + 1 });
    } else if (an.ay > 0.8) {
      // ground-anchored effects stand on the target's feet
      void this.fx.spawn(name, t.x, t.y + 1, { layer: 'top', additive: ADDITIVE.has(name), flip });
    } else {
      const c = t.chest();
      void this.fx.spawn(name, c.x, c.y, { layer: 'top', flip, additive: ADDITIVE.has(name) });
    }
  }

  private shake(amp: number) {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
  }

  private syncStatuses(v: UnitView) {
    const u = this.battle.get(v.uid);
    v.statuses = u.statuses.map((s) => ({ id: s.id, turns: s.turns }));
    v.shield = u.statuses.find((s) => s.id === 'shield')?.value ?? 0;
    v.stunned = u.alive && u.statuses.some((s) => s.id === 'stun');
    v.setFrozen(u.alive && u.statuses.some((s) => s.id === 'freeze'));
  }

  private async playTicks(events: BattleEvent[]) {
    for (const e of events) {
      const v = this.view(e.target);
      if (e.kind === 'damage') void this.fx.spawn(e.dot === 'burn' ? 'burn' : 'poison', v.x, v.y, { layer: 'top' });
      if (e.kind === 'heal') void this.fx.spawn('heal', v.x, v.y, { layer: 'top', additive: true });
      this.applyEvent(e, null);
      await this.clock.wait(140);
    }
    await this.settleDeaths();
  }

  /** Presents one battle event on the unit it concerns. */
  private applyEvent(e: BattleEvent, skill: SkillDef | null) {
    const v = this.view(e.target);
    // above the HP bar and the status icon row
    const top = () => v.head().y - 30 - (v.boss ? 8 : 0);
    switch (e.kind) {
      case 'damage': {
        v.hp = Math.max(0, v.hp - e.amount);
        if (e.absorbed) v.shield = Math.max(0, v.shield - e.absorbed);
        v.flash = 1;
        v.shake = 1;
        if (skill) {
          this.clock.hitStop(e.crit ? 90 : 55);
          const c = v.chest();
          this.fx.particles.burst(c.x, c.y, e.crit ? 10 : 6, ['#ffffff', '#ffe890', '#f0a020', '#7a3a10'], { speed: 90, up: 30, gravity: 220, life: 420 });
          if (!v.dead && !v.frozenSolid && v.hasAnim('hurt') && v.anim !== 'death' && v.anim !== 'rise') {
            void v.play('hurt').then(() => {
              if (!v.dead && v.anim === 'hurt') v.play('idle');
            });
          }
          if (e.crit) {
            this.flash = 0.18;
            this.fx.text(v.uid, v.x, top() - 10, 'CRITICAL', { color: '#ffb040', variant: 'bold' });
          }
          if (e.edge > 0) this.fx.text(v.uid, v.x, top() - 10, 'STRONG HIT', { color: '#ff9a50' });
          else if (e.edge < 0) this.fx.text(v.uid, v.x, top() - 10, 'WEAK HIT', { color: '#8fa0c0' });
        }
        if (e.amount > 0) {
          this.fx.text(v.uid, v.x, top(), String(e.amount), e.crit ? { color: '#ffe060', gradient: '#ff8a20', variant: 'display', outline: '#2a0a04' } : { color: !skill ? (e.dot === 'burn' ? '#ffb070' : '#b6ff7a') : e.edge > 0 ? '#ffd0a0' : '#ffffff', variant: 'bold', outline: '#2a0a10' });
        }
        if (e.absorbed) this.fx.text(v.uid, v.x, top(), `ABSORB ${e.absorbed}`, { color: '#ffe48a' });
        break;
      }
      case 'heal':
        v.hp = Math.min(v.maxHp, v.hp + e.amount);
        this.fx.text(v.uid, v.x, top(), `+${e.amount}`, { color: '#8cff7a', variant: 'bold', outline: '#06280e' });
        this.fx.particles.burst(v.x, v.y - 20, 6, ['#eaffc8', '#a2f56a', '#4cd43a'], { speed: 30, up: 40, gravity: -30, life: 700 });
        break;
      case 'blocked':
        this.fx.text(v.uid, v.x, top(), 'HEAL BLOCKED', { color: '#ff6a6a', variant: 'bold' });
        void this.fx.spawn('blocked', v.x, v.head().y - 14, { layer: 'top' });
        break;
      case 'status': {
        const def = STATUSES[e.status];
        this.syncStatuses(v);
        this.fx.text(v.uid, v.x, top(), def.name.toUpperCase(), { color: def.color });
        const cue: Partial<Record<StatusId, () => void>> = {
          taunt: () => void this.fx.spawn('taunt', v.x, v.head().y - 6, { layer: 'top' }),
          poison: () => void this.fx.spawn('poison', v.x, v.y, { layer: 'top' }),
          burn: () => void this.fx.spawn('burn', v.x, v.y, { layer: 'top' }),
          counter: () => void this.fx.spawn('counter', v.x, v.head().y - 10, { layer: 'top', additive: true }),
        };
        if (cue[e.status]) cue[e.status]!();
        else if (e.status !== 'shield' && e.status !== 'freeze' && e.status !== 'stun') void this.fx.spawn(def.buff ? 'buff' : 'debuff', v.x, v.y, { layer: 'top', additive: def.buff });
        break;
      }
      case 'resist':
        this.fx.text(v.uid, v.x, top(), 'RESIST', { color: '#c0c8d8' });
        break;
      case 'cleanse':
        this.syncStatuses(v);
        this.fx.text(v.uid, v.x, top(), 'CLEANSED', { color: '#eaffc8' });
        break;
      case 'dispel': {
        const had = v.statuses.some((s) => s.id === e.status);
        this.removeStatus(v, e.status);
        this.fx.text(v.uid, v.x, top(), `-${STATUSES[e.status].name.toUpperCase()}`, { color: '#9fb0cc' });
        if (had) {
          const c = v.chest();
          void this.fx.spawn('dispel', c.x, c.y, { layer: 'top', additive: true });
        }
        break;
      }
      case 'expire':
        this.removeStatus(v, e.status);
        break;
      case 'tm':
        v.tm = this.battle.get(v.uid).tm;
        this.fx.text(v.uid, v.x, top(), `${e.delta > 0 ? '+' : ''}${Math.round(e.delta)}% TURN`, { color: '#8fd0ff' });
        break;
      case 'revive':
        // Undying: falls, then rises again
        void (async () => {
          await this.clock.wait(120);
          await v.play('death');
          v.hp = e.hp;
          v.lagHp = e.hp;
          this.syncStatuses(v);
          void this.fx.spawn('revive', v.x, v.y + 1, { layer: 'top', additive: true });
          this.fx.text(v.uid, v.x, top() - 6, 'UNDYING!', { color: '#a2f56a', variant: 'display', outline: '#06280e' });
          this.shake(2);
          if (v.hasAnim('rise')) await v.play('rise');
          v.play('idle');
        })();
        break;
      case 'passive': {
        // a passive wakes mid-fight (Overdrive): banner, the burst on the body, its name over the head
        this.hud.showBanner(e.name, v.team === 'player' ? '#ffe9a0' : '#ffc0b0');
        void this.fx.spawn('overdrive', v.x, v.y + 1, { layer: 'top', additive: true });
        this.fx.text(v.uid, v.x, top() - 6, 'OVERDRIVE!', { color: '#ffd860', variant: 'display', outline: '#3a1a06' });
        this.flash = Math.max(this.flash, 0.12);
        this.shake(3);
        break;
      }
      case 'death':
        v.dead = true;
        v.stunned = false;
        v.setFrozen(false);
        v.statuses = [];
        v.shield = 0;
        void (async () => {
          await this.clock.wait(120);
          await v.play('death');
          void this.fx.spawn('death', v.x, v.y, { layer: 'top' });
          await this.clock.tween(v, { alpha: 0 }, 500, ease.inQuad);
        })();
        break;
    }
  }

  private removeStatus(v: UnitView, s: StatusId) {
    v.statuses = v.statuses.filter((x) => x.id !== s);
    if (s === 'freeze') v.setFrozen(false);
    if (s === 'stun') v.stunned = false;
    if (s === 'shield') v.shield = 0;
  }

  // ---------------------------------------------------------------------------
  // frame
  // ---------------------------------------------------------------------------

  frame(now: number) {
    const real = this.lastReal ? Math.min(100, now - this.lastReal) : 16;
    this.lastReal = now;
    const dt = this.clock.update(real);
    this.t += real;
    if (!this.paused) this.zone.update(real);
    for (const v of this.views.values()) v.update(dt);
    this.fx.update(dt);
    this.shakeAmp = Math.max(0, this.shakeAmp - real * 0.02);
    this.flash = Math.max(0, this.flash - real / 400);
    if (this.results) this.resultsT += real;
    this.render(real);
  }

  private render(real: number) {
    const ctx = this.ctx;
    const hud = this.hud;
    hud.beginFrame();
    ctx.save();
    if (this.shakeAmp > 0) ctx.translate(Math.round((Math.random() - 0.5) * this.shakeAmp * 2), Math.round((Math.random() - 0.5) * this.shakeAmp));
    this.zone.drawBack(ctx);
    const valid = new Set(this.validTargets());
    const sh = this.setup.zone.shadow;
    for (const v of this.views.values()) {
      if ((v.dead && v.alpha < 0.05) || v.alpha <= 0) continue;
      const k = Math.min(3, Math.floor(v.h / 14));
      const s = this.shadows[k];
      ctx.globalAlpha = v.alpha;
      ctx.drawImage(s, Math.round(v.x - s.width / 2 + sh.dx), Math.round(v.y - s.height / 2) + 1);
      ctx.globalAlpha = 1;
      if (v === this.active && !this.winner) hud.drawMarkers(ctx, v, 'active', this.t, false);
      if (valid.has(v.uid) && this.choice) {
        const allyTarget = this.choice.skill.target === 'allies' || this.choice.skill.target === 'ally' || this.choice.skill.target === 'self';
        const group = this.choice.skill.target === 'enemies' || this.choice.skill.target === 'allies';
        const hovered = this.hoverUnit === v || (group && !!this.hoverUnit && valid.has(this.hoverUnit.uid));
        hud.drawMarkers(ctx, v, allyTarget ? 'heal' : 'target', this.t, hovered);
      }
    }
    this.fx.drawLayer(ctx, 'ground');
    const items: { z: number; draw: (c: CanvasRenderingContext2D) => void }[] = [];
    for (const v of this.views.values()) {
      if (v.dead && v.alpha <= 0) continue;
      const acting = v === this.active ? 0.5 : 0;
      items.push({ z: v.y + acting, draw: (c) => (v.draw(c), v.drawOverlays(c)) });
    }
    items.push(...this.fx.worldItems());
    items.sort((p, q) => p.z - q.z);
    for (const it of items) it.draw(ctx);
    this.zone.drawFire(ctx);
    this.fx.drawLayer(ctx, 'top');
    this.zone.drawFront(ctx);
    this.zone.drawLighting(ctx);
    ctx.restore();
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,250,235,${this.flash})`;
      ctx.fillRect(0, 0, W, H);
    }

    // --- HUD
    for (const v of this.views.values()) hud.drawUnitBars(ctx, v);
    this.fx.drawTexts(ctx);
    hud.drawTopBar(ctx, this.setup.zone.name, this.stageLabel, this.battle.turn);
    hud.drawTurnMeter(ctx, [...this.views.values()], this.active);
    if (this.demoSkill) {
      hud.button(ctx, 'demo_back', W - 104, 6, 96, 20, 'BACK', { click: () => this.hooks.exit?.(), icon: 'mi_back' });
    } else if (!this.results) {
      hud.drawControls(
        ctx,
        { auto: this.auto, speed: this.speeds[this.speedIdx], paused: this.paused },
        { auto: () => this.toggleAuto(), speed: () => this.cycleSpeed(), pause: () => this.togglePause() },
      );
    }
    if (this.active && !this.winner) hud.drawHeroPanel(ctx, this.active);
    if (this.choice && !this.paused) {
      const c = this.choice;
      const slots: SkillSlot[] = c.actor.champion.skills.map((s) => ({ skill: s, cooldown: c.actor.cooldowns[s.id] ?? 0, selected: s === c.skill }));
      hud.drawSkills(ctx, slots, (s) => this.pickSkill(s), this.t);
      const group = c.skill.target === 'enemies' || c.skill.target === 'allies';
      hud.drawPrompt(ctx, group ? 'Click a target or the skill again' : c.skill.target === 'ally' ? 'Choose an ally' : 'Choose a target');
      for (const v of this.views.values()) {
        if (!valid.has(v.uid)) continue;
        const b = v.bounds();
        hud.regions.push({ x: b.x, y: b.y, w: b.w, h: b.h + 6, click: () => this.clickUnit(v), hover: () => (this.hoverUnit = v) });
      }
      // unit info tooltips (shown under the unit so the bars stay visible)
      for (const v of this.views.values()) {
        if (v.dead) continue;
        const b = v.bounds();
        const tip = () => ({
          title: v.champion.name,
          sub: `${v.champion.role}  -  HP ${Math.round(v.hp)}/${v.maxHp}  SPD ${this.battle.get(v.uid).stats.spd}`,
          body: v.statuses.map((s) => `${STATUSES[s.id].name} (${s.turns})`).join(', ') || v.champion.title,
          color: v.champion.color,
        });
        const region = hud.regions.find((r) => r.x === b.x && r.y === b.y && r.click);
        if (region) {
          region.tip = tip;
          region.tipBelow = true;
        } else hud.regions.unshift({ x: b.x, y: b.y, w: b.w, h: b.h, tip, tipBelow: true });
      }
    }
    hud.drawBanner(ctx, real);
    hud.drawTitle(ctx, real);
    if (this.paused) {
      hud.drawPause(
        ctx,
        { resume: () => this.togglePause(), retreat: () => this.hooks.exit?.(), auto: () => this.toggleAuto(), speed: () => this.cycleSpeed() },
        { auto: this.auto, speed: this.speeds[this.speedIdx] },
        !!this.hooks.exit,
      );
    }
    if (this.results) {
      hud.drawResults(ctx, this.results, this.resultsT, {
        next: () => (this.hooks.next ? this.hooks.next() : this.hooks.exit?.()),
        retry: () => (this.hooks.retry ? this.hooks.retry() : this.restart()),
        map: () => this.hooks.exit?.(),
      });
    }
    hud.drawTooltip(ctx);
  }

  // ---------------------------------------------------------------------------
  // input
  // ---------------------------------------------------------------------------

  pointerMove(x: number, y: number): boolean {
    this.hoverUnit = null;
    const r = this.hud.pointer(x, y);
    return !!r?.click;
  }

  click(x: number, y: number) {
    this.pointerMove(x, y);
    this.hud.hit(x, y)?.click?.();
  }

  key(k: string) {
    const c = this.choice;
    if (this.results) {
      if (k === 'Enter' || k === ' ') {
        if (!this.hud.activate()) (this.results.victory ? this.hooks.next : this.hooks.retry)?.();
      } else if (k.startsWith('Arrow')) this.hud.navigate(k.slice(5).toLowerCase() as 'up');
      return;
    }
    if (k === 'Escape' || k === 'p') {
      if (this.demoSkill) this.hooks.exit?.();
      else this.togglePause();
      return;
    }
    if (this.paused) {
      if (k === 'Enter' || k === ' ') this.hud.activate();
      else if (k.startsWith('Arrow')) this.hud.navigate(k.slice(5).toLowerCase() as 'up');
      return;
    }
    if (k === 'a') this.toggleAuto();
    else if (k === 's') this.cycleSpeed();
    else if (c && ['1', '2', '3'].includes(k)) this.pickSkill(c.actor.champion.skills[Number(k) - 1]);
    else if (c && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown')) {
      // cycle targets with the arrows
      const list = this.validTargets().map((u) => this.view(u)).sort((p, q) => p.y - q.y);
      if (!list.length) return;
      const i = this.hoverUnit ? list.indexOf(this.hoverUnit) : -1;
      const step = k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1;
      this.hoverUnit = list[(i + step + list.length) % list.length];
    } else if (c && (k === 'Enter' || k === ' ')) {
      const group = c.skill.target === 'enemies' || c.skill.target === 'allies' || c.skill.target === 'self';
      if (group) c.resolve({ skill: c.skill });
      else {
        const t = this.hoverUnit && this.validTargets().includes(this.hoverUnit.uid) ? this.hoverUnit.uid : this.validTargets()[0];
        c.resolve({ skill: c.skill, target: t });
      }
    }
  }
}

function makeShadow(w: number, base: number): HTMLCanvasElement {
  const h = Math.max(4, Math.round(base * 0.28));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot((x + 0.5 - w / 2) / (w / 2), (y + 0.5 - h / 2) / (h / 2));
      if (d > 1) continue;
      const i = (y * w + x) * 4;
      img.data[i] = 6;
      img.data[i + 1] = 8;
      img.data[i + 2] = 20;
      img.data[i + 3] = d < 0.6 ? 120 : 80;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
