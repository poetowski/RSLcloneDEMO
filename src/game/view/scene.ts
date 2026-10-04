// The battle scene: runs the turn loop, asks the player (or AI) for actions
// and turns each SkillResult into choreography — approach, attack animation,
// frame-accurate hits, projectiles, effects, numbers, return to formation.
import { Clock, ease } from '../../engine/clock';
import { H, Screen, W } from '../../engine/screen';
import { decide, Decision } from '../battle/ai';
import { Battle, BattleEvent, SkillResult, Unit } from '../battle/battle';
import { STATUSES } from '../data/statuses';
import { HeroDef, SkillDef, StatusId, TeamId } from '../data/types';
import { Assets } from './assets';
import { FxLayer } from './fx';
import { Hud, SkillSlot } from './hud';
import { UnitView } from './unit';
import { ZoneView } from './zone';

export interface SceneOptions {
  seed: number;
  auto: boolean;
  speed: number;
}

/** Where projectiles leave each ranged hero (forward, up) in px. */
const MUZZLE: Record<string, [number, number]> = {
  archer: [20, 43],
  frostmage: [34, 47],
};

const CHEST_FX = new Set(['slash', 'slash_fire', 'slash_violet', 'hit', 'chi', 'bash', 'ice_burst']);

export class BattleScene {
  readonly clock = new Clock();
  battle!: Battle;
  views = new Map<string, UnitView>();
  readonly fx: FxLayer;
  readonly zone: ZoneView;
  readonly hud: Hud;
  auto: boolean;
  private speeds = [1, 2, 3];
  private speedIdx = 0;
  active?: UnitView;
  choice: { actor: Unit; skill: SkillDef; resolve: (d: Decision) => void } | null = null;
  hoverUnit: UnitView | null = null;
  private shakeAmp = 0;
  private flash = 0;
  winner: TeamId | null = null;
  private t = 0;
  private runId = 0;
  private shadows: HTMLCanvasElement[];
  private lastReal = 0;

  constructor(
    private screen: Screen,
    private a: Assets,
    private player: HeroDef[],
    private enemy: HeroDef[],
    opts: SceneOptions,
  ) {
    this.fx = new FxLayer(a, this.clock);
    this.zone = new ZoneView(a);
    this.hud = new Hud(a);
    this.auto = opts.auto;
    this.speedIdx = Math.max(0, this.speeds.indexOf(opts.speed));
    this.clock.speed = this.speeds[this.speedIdx];
    this.shadows = [34, 28, 22, 16].map((w) => makeShadow(w));
    this.setup(opts.seed);
  }

  private setup(seed: number) {
    this.battle = new Battle(this.player, this.enemy, seed);
    this.views.clear();
    const sp = this.zone.json.spawns;
    for (const u of this.battle.units) {
      const [x, y] = (u.team === 'player' ? sp.player : sp.enemy)[u.slot];
      const v = new UnitView(u.uid, u.hero, u.team, this.a, x, y);
      v.tm = u.tm;
      this.views.set(u.uid, v);
    }
    this.winner = null;
    this.active = undefined;
    this.hud.title = null;
  }

  view(uid: string): UnitView {
    return this.views.get(uid)!;
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
    v.tm = 0;
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
    await this.clock.wait(250);
    await Promise.all(
      vs.map(async (v, i) => {
        await this.clock.wait(i * 70);
        await this.clock.tween(v, { x: v.homeX }, Math.abs(v.homeX - v.x) * 2.6, ease.outQuad);
        v.play('idle');
      }),
    );
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
    if (w === 'player') this.hud.showTitle('VICTORY', '#fff6c0', '#f0a020', 'Frostfang Ruins cleared');
    else this.hud.showTitle('DEFEAT', '#ffd0c0', '#c02020', 'Your heroes have fallen');
  }

  /** Showcase loop: the owner of `skillId` performs it again and again on fresh HP. */
  async demo(skillId: string, targetSlot = 0) {
    const id = ++this.runId;
    await this.intro();
    const actor = this.battle.units.find((u) => u.hero.skills.some((s) => s.id === skillId));
    if (!actor) return;
    const skill = actor.hero.skills.find((s) => s.id === skillId)!;
    while (id === this.runId) {
      for (const u of this.battle.units) {
        u.hp = u.maxHp;
        u.alive = true;
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
    this.setup(Math.floor(Math.random() * 1e9));
    void this.run();
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
      const first = actor.hero.skills.find((s) => this.battle.ready(actor, s)) ?? actor.hero.skills[0];
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
    if (this.auto && this.choice) {
      const d = decide(this.battle, this.choice.actor);
      this.choice.resolve(d);
    }
  }

  cycleSpeed() {
    this.speedIdx = (this.speedIdx + 1) % this.speeds.length;
    this.clock.speed = this.speeds[this.speedIdx];
  }

  togglePause() {
    this.clock.paused = !this.clock.paused;
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

  private async goHome(v: UnitView) {
    if (v.dead) return;
    await this.runTo(v, v.homeX, v.homeY, 420);
    v.x = v.homeX;
    v.y = v.homeY;
    v.facing = v.homeFacing;
    v.play('idle');
  }

  private dir(v: UnitView) {
    return v.homeFacing === 'R' ? 1 : -1;
  }

  async perform(res: SkillResult) {
    const actor = this.view(res.actor);
    const skill = res.skill;
    const targets = res.targets.map((u) => this.view(u));
    const primary = res.target ? this.view(res.target) : targets[0];
    const dir = this.dir(actor);
    const cx = targets.reduce((s, t) => s + t.x, 0) / Math.max(1, targets.length);
    const cy = targets.reduce((s, t) => s + t.y, 0) / Math.max(1, targets.length);

    if (skill.slot > 1) this.hud.showBanner(skill.name, actor.team === 'player' ? '#ffe9a0' : '#ffc0b0');

    // --- approach
    let moved = false;
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
    }
    if (moved) actor.facing = actor.homeFacing;

    // --- events grouped per hit, applied as the choreography reaches them
    const remaining = new Set(res.events);
    const applyWhere = (pred: (e: BattleEvent) => boolean) => {
      for (const e of res.events) {
        if (!remaining.has(e) || !pred(e)) continue;
        remaining.delete(e);
        this.applyEvent(e, skill, actor);
      }
    };
    const pendings: Promise<unknown>[] = [];
    let landed = 0;
    const hitCount = skill.hits.length;

    if (skill.castFx) pendings.push(this.fx.spawn(skill.castFx, actor.x, actor.y, { layer: 'ground', loops: 3 }));

    const onHit = (k: number) => {
      const fxName = skill.hits[k]?.fx;
      const groupFx = (t: UnitView, delay = 0) =>
        pendings.push(
          (async () => {
            if (delay) await this.clock.wait(delay);
            this.spawnHitFx(fxName, t, actor);
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
        const m = MUZZLE[actor.hero.id] ?? [16, 40];
        const from = { x: actor.x + dir * m[0], y: actor.y - m[1] };
        for (const t of targets) {
          const trail = skill.projectile === 'ice_shard' ? ['#f2feff', '#a6ecff', '#5cc4ea'] : skill.projectile === 'arrow_venom' ? ['#eaffc8', '#4cd43a', '#155a1e'] : undefined;
          pendings.push(this.fx.projectile(skill.projectile, from, t.chest(), { speed: skill.projectile === 'ice_shard' ? 460 : 620, arc: skill.projectile.startsWith('arrow') ? 8 : 0, trail }).then(() => groupFx(t)));
        }
      } else if (skill.target === 'allies') {
        targets.forEach((t, i) => groupFx(t, i * 80));
      } else if (fxName === 'ice_spikes' || fxName === 'shockwave') {
        if (fxName === 'shockwave') this.fx.spawn('shockwave', cx, cy, { layer: 'ground' });
        targets.forEach((t, i) => groupFx(t, fxName === 'ice_spikes' ? 60 + i * 90 : 60 + Math.abs(t.x - actor.x) * 0.6));
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
        const m = MUZZLE.archer;
        for (let n = 0; n < 3; n++) {
          void this.fx.projectile('arrow', { x: actor.x + dir * m[0], y: actor.y - m[1] - 6 }, { x: actor.x + dir * (60 + n * 14), y: -30 }, { speed: 900 });
        }
      } else if (e === 'drain') {
        // handled after the hit via lifesteal wisps
      }
    };

    await actor.play(skill.anim, { hit: onHit, event: onEvent });
    if (leapP) await leapP;
    // make sure every hit landed (projectiles may still be in the air)
    let guard = 0;
    while (landed < hitCount && guard++ < 200) await this.clock.wait(16);
    await Promise.all(pendings);

    // lifesteal: soul wisps fly back to the actor before the heal shows
    if (skill.lifesteal && primary) {
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

    actor.play('idle');
    if (moved) await this.goHome(actor);
    // death animations finish before the next turn
    let g2 = 0;
    while ([...this.views.values()].some((v) => v.dead && v.alpha > 0) && g2++ < 300) await this.clock.wait(16);
    // snap displayed HP to the truth
    for (const u of this.battle.units) {
      const v = this.view(u.uid);
      v.hp = u.hp;
      this.syncStatuses(v);
    }
  }

  private spawnHitFx(name: string | undefined, t: UnitView, actor: UnitView) {
    if (!name) return;
    const flip = actor.homeFacing === 'L';
    if (CHEST_FX.has(name)) {
      const c = t.chest();
      void this.fx.spawn(name, c.x, c.y, { layer: 'top', flip, additive: name === 'hit' || name === 'chi' });
    } else if (name === 'crack') {
      void this.fx.spawn('crack', t.x, t.y, { layer: 'ground' });
      const c = t.chest();
      void this.fx.spawn('hit', c.x, c.y, { layer: 'top', additive: true });
    } else if (name === 'holy') {
      void this.fx.spawn('holy', t.x, t.y + 2, { layer: 'top', additive: true });
      void this.clock.wait(160).then(() => this.fx.spawn('shield_up', t.x, t.y, { layer: 'top', additive: true }));
    } else if (name === 'heal') {
      void this.fx.spawn('heal', t.x, t.y, { layer: 'top', additive: true });
    } else {
      void this.fx.spawn(name, t.x, t.y, { layer: name === 'ice_spikes' ? 'world' : 'top', z: t.y + 1 });
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
      if (e.kind === 'damage') void this.fx.spawn('poison', v.x, v.y, { layer: 'top' });
      if (e.kind === 'heal') void this.fx.spawn('heal', v.x, v.y, { layer: 'top', additive: true });
      this.applyEvent(e, null);
      await this.clock.wait(120);
    }
  }

  /** Presents one battle event on the units it concerns. */
  private applyEvent(e: BattleEvent, skill: SkillDef | null, actor?: UnitView) {
    const v = this.view(e.target);
    // above the HP bar and the status icon row
    const top = () => v.head().y - 30;
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
          if (!v.dead && !v.frozenSolid && v.hasAnim('hurt') && v.anim !== 'death') {
            void v.play('hurt').then(() => {
              if (!v.dead && v.anim === 'hurt') v.play('idle');
            });
          }
          if (e.crit) {
            this.flash = 0.18;
            this.fx.text(v.uid, v.x, top() - 10, 'CRITICAL', { color: '#ffb040', variant: 'bold' });
          }
        }
        if (e.amount > 0) {
          this.fx.text(v.uid, v.x, top(), String(e.amount), e.crit ? { color: '#ffe060', gradient: '#ff8a20', variant: 'bold', scale: 2, outline: '#2a0a04' } : { color: skill ? '#ffffff' : '#b6ff7a', variant: 'bold', outline: '#2a0a10' });
        }
        if (e.absorbed) this.fx.text(v.uid, v.x, top(), `ABSORB ${e.absorbed}`, { color: '#ffe48a' });
        break;
      }
      case 'heal':
        v.hp = Math.min(v.maxHp, v.hp + e.amount);
        this.fx.text(v.uid, v.x, top(), `+${e.amount}`, { color: '#8cff7a', variant: 'bold', outline: '#06280e' });
        this.fx.particles.burst(v.x, v.y - 20, 6, ['#eaffc8', '#a2f56a', '#4cd43a'], { speed: 30, up: 40, gravity: -30, life: 700 });
        break;
      case 'status': {
        const def = STATUSES[e.status];
        this.syncStatuses(v);
        this.fx.text(v.uid, v.x, top(), def.name.toUpperCase(), { color: def.color });
        if (e.status === 'taunt') void this.fx.spawn('taunt', v.x, v.head().y - 6, { layer: 'top' });
        else if (e.status === 'poison') void this.fx.spawn('poison', v.x, v.y, { layer: 'top' });
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
      case 'expire':
        this.removeStatus(v, e.status);
        break;
      case 'tm':
        v.tm = this.battle.get(v.uid).tm;
        this.fx.text(v.uid, v.x, top(), `${Math.round(e.delta)}% TURN`, { color: '#8fd0ff' });
        break;
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
    void actor;
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
    this.zone.update(real);
    for (const v of this.views.values()) v.update(dt);
    this.fx.update(dt);
    this.shakeAmp = Math.max(0, this.shakeAmp - real * 0.02);
    this.flash = Math.max(0, this.flash - real / 400);
    this.render(real);
  }

  private render(real: number) {
    const ctx = this.screen.ctx;
    const hud = this.hud;
    hud.beginFrame();
    ctx.save();
    if (this.shakeAmp > 0) ctx.translate(Math.round((Math.random() - 0.5) * this.shakeAmp * 2), Math.round((Math.random() - 0.5) * this.shakeAmp));
    this.zone.drawBack(ctx);
    // shadows + markers under the feet
    const valid = new Set(this.validTargets());
    for (const v of this.views.values()) {
      if (v.dead && v.alpha < 0.05) continue;
      const k = Math.min(3, Math.floor(v.h / 14));
      const s = this.shadows[k];
      ctx.globalAlpha = v.alpha;
      ctx.drawImage(s, Math.round(v.x - s.width / 2), Math.round(v.y - s.height / 2) + 1);
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
    // depth-sorted units and world effects
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
    hud.drawTopBar(ctx, this.zone.json.name, this.battle.turn);
    hud.drawTurnMeter(ctx, [...this.views.values()], this.active);
    hud.drawControls(
      ctx,
      { auto: this.auto, speed: this.speeds[this.speedIdx], paused: this.clock.paused },
      { auto: () => this.toggleAuto(), speed: () => this.cycleSpeed(), pause: () => this.togglePause() },
    );
    if (this.active && !this.winner) hud.drawHeroPanel(ctx, this.active);
    if (this.choice) {
      const c = this.choice;
      const slots: SkillSlot[] = c.actor.hero.skills.map((s) => ({ skill: s, cooldown: c.actor.cooldowns[s.id] ?? 0, selected: s === c.skill }));
      hud.drawSkills(ctx, slots, (s) => this.pickSkill(s), this.t);
      const group = c.skill.target === 'enemies' || c.skill.target === 'allies';
      hud.drawPrompt(ctx, group ? 'Click a target or the skill again' : c.skill.target === 'ally' ? 'Choose an ally' : 'Choose a target');
      // unit click regions
      for (const v of this.views.values()) {
        if (!valid.has(v.uid)) continue;
        const b = v.bounds();
        hud.regions.push({ x: b.x, y: b.y, w: b.w, h: b.h + 6, click: () => this.clickUnit(v), hover: () => (this.hoverUnit = v) });
      }
    }
    // unit info tooltips while the player is choosing (shown under the unit so bars stay visible)
    if (this.choice) {
      for (const v of this.views.values()) {
        if (v.dead) continue;
        const b = v.bounds();
        const tip = () => ({
          title: v.hero.name,
          sub: `${v.hero.role}  -  HP ${Math.round(v.hp)}/${v.maxHp}  SPD ${v.hero.stats.spd}`,
          body: v.statuses.map((s) => `${STATUSES[s.id].name} (${s.turns})`).join(', ') || v.hero.title,
          color: v.hero.color,
        });
        const region = hud.regions.find((r) => r.x === b.x && r.y === b.y && r.click);
        if (region) {
          region.tip = tip;
          region.tipBelow = true;
        } else hud.regions.unshift({ x: b.x, y: b.y, w: b.w, h: b.h, tip, tipBelow: true });
      }
    }
    hud.drawBanner(ctx, real);
    if (this.clock.paused && !this.winner) hud.showTitle('PAUSED', '#d8e2f4', '#7a88a8');
    if (!this.clock.paused && hud.title?.text === 'PAUSED') hud.title = null;
    hud.drawTitle(ctx, real, this.winner ? { label: 'PLAY AGAIN', click: () => this.restart() } : undefined);
    hud.drawTooltip(ctx);
  }

  // ---------------------------------------------------------------------------
  // input
  // ---------------------------------------------------------------------------

  pointerMove(x: number, y: number) {
    this.hud.mouse = { x, y };
    this.hoverUnit = null;
    const r = this.hud.hit(x, y);
    r?.hover?.();
    this.screen.display.style.cursor = r?.click ? 'pointer' : 'default';
  }

  click(x: number, y: number) {
    this.pointerMove(x, y);
    this.hud.hit(x, y)?.click?.();
  }

  key(k: string) {
    const c = this.choice;
    if (k === 'a') this.toggleAuto();
    else if (k === 's') this.cycleSpeed();
    else if (k === 'p' || k === 'Escape') this.togglePause();
    else if (c && ['1', '2', '3'].includes(k)) this.pickSkill(c.actor.hero.skills[Number(k) - 1]);
    else if (c && (k === 'Enter' || k === ' ')) {
      const group = c.skill.target === 'enemies' || c.skill.target === 'allies' || c.skill.target === 'self';
      if (group) c.resolve({ skill: c.skill });
      else {
        const t = this.hoverUnit && this.validTargets().includes(this.hoverUnit.uid) ? this.hoverUnit.uid : this.validTargets()[0];
        c.resolve({ skill: c.skill, target: t });
      }
    } else if (this.winner && (k === 'Enter' || k === ' ')) this.restart();
  }
}

function makeShadow(w: number): HTMLCanvasElement {
  const h = Math.max(4, Math.round(w * 0.28));
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
