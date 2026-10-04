// Pure battle rules: turn meter, skill resolution, statuses, cooldowns.
// No rendering here — the view replays the returned events.
// Rules are documented in docs/MECHANICS_GUIDE.md.
import { HeroDef, SkillDef, StatusId, TeamId } from '../data/types';
import { STATUSES } from '../data/statuses';
import { Rng } from './rng';

export interface StatusInst {
  id: StatusId;
  turns: number;
  /** shield: remaining absorb */
  value: number;
  source: string;
}

export interface Unit {
  uid: string;
  hero: HeroDef;
  team: TeamId;
  /** 0 = front, 1 = back-top, 2 = back-bottom */
  slot: number;
  hp: number;
  maxHp: number;
  /** turn meter 0..100 */
  tm: number;
  cooldowns: Record<string, number>;
  statuses: StatusInst[];
  alive: boolean;
}

export type BattleEvent =
  | { kind: 'damage'; target: string; amount: number; crit: boolean; absorbed: number; hit: number }
  | { kind: 'heal'; target: string; amount: number; hit: number }
  | { kind: 'status'; target: string; status: StatusId; turns: number; hit: number }
  | { kind: 'resist'; target: string; status: StatusId; hit: number }
  | { kind: 'expire'; target: string; status: StatusId; hit: number }
  | { kind: 'cleanse'; target: string; status: StatusId; hit: number }
  | { kind: 'tm'; target: string; delta: number; hit: number }
  | { kind: 'death'; target: string; hit: number };

export interface SkillResult {
  actor: string;
  skill: SkillDef;
  /** primary target (single-target skills) */
  target?: string;
  /** everyone affected, for AoE presentation */
  targets: string[];
  events: BattleEvent[];
}

export const TURN_FULL = 100;
const CRIT_MULT = 1.5;
const POISON_PCT = 0.05;
const REGEN_PCT = 0.075;

export class Battle {
  units: Unit[] = [];
  rng: Rng;
  turn = 0;

  constructor(player: HeroDef[], enemy: HeroDef[], seed = 1) {
    this.rng = new Rng(seed);
    const mk = (h: HeroDef, team: TeamId, slot: number): Unit => ({
      uid: `${team === 'player' ? 'p' : 'e'}${slot}`,
      hero: h,
      team,
      slot,
      hp: h.stats.hp,
      maxHp: h.stats.hp,
      tm: this.rng.range(0, 12),
      cooldowns: {},
      statuses: [],
      alive: true,
    });
    player.forEach((h, i) => this.units.push(mk(h, 'player', i)));
    enemy.forEach((h, i) => this.units.push(mk(h, 'enemy', i)));
  }

  get(uid: string): Unit {
    const u = this.units.find((x) => x.uid === uid);
    if (!u) throw new Error('no unit ' + uid);
    return u;
  }

  alive(team?: TeamId): Unit[] {
    return this.units.filter((u) => u.alive && (!team || u.team === team));
  }

  foes(u: Unit): Unit[] {
    return this.alive(u.team === 'player' ? 'enemy' : 'player');
  }

  allies(u: Unit): Unit[] {
    return this.alive(u.team);
  }

  has(u: Unit, s: StatusId): boolean {
    return u.statuses.some((x) => x.id === s);
  }

  // --- derived stats -------------------------------------------------------

  speed(u: Unit): number {
    let k = 1;
    if (this.has(u, 'spd_up')) k += 0.25;
    if (this.has(u, 'spd_down')) k -= 0.25;
    return u.hero.stats.spd * k;
  }

  attack(u: Unit): number {
    let k = 1;
    if (this.has(u, 'atk_up')) k += 0.25;
    if (this.has(u, 'atk_down')) k -= 0.25;
    return u.hero.stats.atk * k;
  }

  defense(u: Unit): number {
    let k = 1;
    if (this.has(u, 'def_up')) k += 0.4;
    if (this.has(u, 'def_down')) k -= 0.3;
    return u.hero.stats.def * k;
  }

  // --- turn meter ----------------------------------------------------------

  /** Fills every turn meter until someone reaches 100. Returns the actor. */
  advance(): Unit {
    const live = this.alive();
    let best: Unit | null = null, bestT = Infinity;
    for (const u of live) {
      const t = (TURN_FULL - u.tm) / this.speed(u);
      if (t < bestT - 1e-9 || (Math.abs(t - bestT) < 1e-9 && best && this.speed(u) > this.speed(best))) {
        best = u;
        bestT = t;
      }
    }
    const t = Math.max(0, bestT);
    for (const u of live) u.tm = Math.min(TURN_FULL, u.tm + this.speed(u) * t);
    best!.tm = TURN_FULL;
    this.turn++;
    return best!;
  }

  /** Start-of-turn ticks (poison, regen). `skip` = stunned/frozen. */
  startTurn(u: Unit): { events: BattleEvent[]; skip: boolean } {
    const events: BattleEvent[] = [];
    if (this.has(u, 'poison')) {
      const dmg = Math.round(u.maxHp * POISON_PCT);
      this.applyDamage(u, dmg, false, 0, events, true);
    }
    if (u.alive && this.has(u, 'regen')) {
      const amt = Math.min(u.maxHp - u.hp, Math.round(u.maxHp * REGEN_PCT));
      if (amt > 0) {
        u.hp += amt;
        events.push({ kind: 'heal', target: u.uid, amount: amt, hit: 0 });
      }
    }
    const skip = u.alive && (this.has(u, 'stun') || this.has(u, 'freeze'));
    return { events, skip };
  }

  /** End of the actor's turn: TM reset, durations and cooldowns tick down. */
  endTurn(u: Unit): BattleEvent[] {
    const events: BattleEvent[] = [];
    u.tm = 0;
    for (const s of [...u.statuses]) {
      s.turns--;
      if (s.turns <= 0) {
        u.statuses.splice(u.statuses.indexOf(s), 1);
        events.push({ kind: 'expire', target: u.uid, status: s.id, hit: 0 });
      }
    }
    for (const k of Object.keys(u.cooldowns)) u.cooldowns[k] = Math.max(0, u.cooldowns[k] - 1);
    return events;
  }

  ready(u: Unit, s: SkillDef): boolean {
    return (u.cooldowns[s.id] ?? 0) <= 0;
  }

  /** Units the actor may click for this skill (taunt is enforced here). */
  validTargets(u: Unit, s: SkillDef): Unit[] {
    switch (s.target) {
      case 'enemy': {
        const foes = this.foes(u);
        const taunters = foes.filter((f) => this.has(f, 'taunt'));
        return taunters.length ? taunters : foes;
      }
      case 'enemies':
        return this.foes(u);
      case 'ally':
      case 'allies':
        return this.allies(u);
      case 'self':
        return [u];
    }
  }

  // --- resolution ----------------------------------------------------------

  useSkill(actor: Unit, skill: SkillDef, targetUid?: string): SkillResult {
    const events: BattleEvent[] = [];
    let primary: Unit | undefined;
    let targets: Unit[];
    if (skill.target === 'enemy' || skill.target === 'ally') {
      const valid = this.validTargets(actor, skill);
      primary = valid.find((v) => v.uid === targetUid) ?? valid[0];
      targets = primary ? [primary] : [];
    } else {
      targets = this.validTargets(actor, skill);
    }
    if (skill.cooldown > 0) actor.cooldowns[skill.id] = skill.cooldown + 1;

    const last = skill.hits.length - 1;
    skill.hits.forEach((h, hi) => {
      if (h.mult <= 0) return;
      for (const t of targets) {
        if (!t.alive) continue;
        const dmg = this.rollDamage(actor, t, skill, h.mult);
        const dealt = this.applyDamage(t, dmg.amount, dmg.crit, hi, events);
        if (skill.lifesteal && dealt > 0 && actor.alive) {
          const amt = Math.min(actor.maxHp - actor.hp, Math.round(dealt * skill.lifesteal));
          if (amt > 0) {
            actor.hp += amt;
            events.push({ kind: 'heal', target: actor.uid, amount: amt, hit: hi });
          }
        }
      }
    });

    // support effects land on the last hit
    if (skill.healAllies) {
      for (const a of this.allies(actor)) {
        const amt = Math.min(a.maxHp - a.hp, Math.round(a.maxHp * skill.healAllies));
        if (amt > 0) {
          a.hp += amt;
          events.push({ kind: 'heal', target: a.uid, amount: amt, hit: last });
        }
      }
    }
    if (skill.cleanse) {
      for (const a of this.allies(actor)) {
        const deb = a.statuses.find((s) => !STATUSES[s.id].buff);
        if (deb) {
          a.statuses.splice(a.statuses.indexOf(deb), 1);
          events.push({ kind: 'cleanse', target: a.uid, status: deb.id, hit: last });
        }
      }
    }
    for (const app of skill.statuses ?? []) {
      const recipients = app.to === 'self' ? [actor] : app.to === 'allies' ? this.allies(actor) : targets.filter((t) => t.alive);
      for (const r of recipients) {
        if (!r.alive) continue;
        if (app.chance !== undefined && !this.rng.chance(app.chance)) {
          if (!STATUSES[app.status].buff) events.push({ kind: 'resist', target: r.uid, status: app.status, hit: last });
          continue;
        }
        const value = app.value ? Math.round(actor.maxHp * app.value) : 0;
        this.addStatus(r, app.status, app.turns, value, actor.uid);
        events.push({ kind: 'status', target: r.uid, status: app.status, turns: app.turns, hit: last });
      }
    }
    if (skill.tmTargets) {
      for (const t of targets) {
        if (!t.alive) continue;
        const before = t.tm;
        t.tm = Math.max(0, Math.min(TURN_FULL, t.tm + skill.tmTargets));
        events.push({ kind: 'tm', target: t.uid, delta: t.tm - before, hit: last });
      }
    }
    return { actor: actor.uid, skill, target: primary?.uid, targets: targets.map((t) => t.uid), events };
  }

  rollDamage(a: Unit, t: Unit, s: SkillDef, mult: number): { amount: number; crit: boolean } {
    const crit = this.rng.chance(a.hero.stats.crit);
    let dmg = this.attack(a) * mult * 4.8;
    dmg *= 100 / (100 + this.defense(t));
    if (s.execute && t.hp / t.maxHp < s.execute.below) dmg *= s.execute.mult;
    if (crit) dmg *= CRIT_MULT;
    dmg *= this.rng.range(0.92, 1.08);
    return { amount: Math.max(1, Math.round(dmg)), crit };
  }

  /** Applies damage through shields; returns HP actually lost. */
  applyDamage(t: Unit, amount: number, crit: boolean, hit: number, events: BattleEvent[], dot = false): number {
    let absorbed = 0;
    const sh = t.statuses.find((s) => s.id === 'shield');
    if (sh && !dot) {
      absorbed = Math.min(sh.value, amount);
      sh.value -= absorbed;
      if (sh.value <= 0) {
        t.statuses.splice(t.statuses.indexOf(sh), 1);
        events.push({ kind: 'expire', target: t.uid, status: 'shield', hit });
      }
    }
    const lost = Math.min(t.hp, amount - absorbed);
    t.hp -= lost;
    events.push({ kind: 'damage', target: t.uid, amount: amount - absorbed, crit, absorbed, hit });
    if (t.hp <= 0 && t.alive) {
      t.alive = false;
      t.statuses = [];
      t.tm = 0;
      events.push({ kind: 'death', target: t.uid, hit });
    }
    return lost;
  }

  addStatus(u: Unit, id: StatusId, turns: number, value: number, source: string) {
    const ex = u.statuses.find((s) => s.id === id);
    if (ex) {
      ex.turns = Math.max(ex.turns, turns);
      ex.value = Math.max(ex.value, value);
      return;
    }
    u.statuses.push({ id, turns, value, source });
  }

  winner(): TeamId | null {
    if (!this.alive('enemy').length) return 'player';
    if (!this.alive('player').length) return 'enemy';
    return null;
  }

  /** Predicted next `n` actors (for the turn-order preview). Does not mutate. */
  preview(n: number): string[] {
    const sim = this.alive().map((u) => ({ uid: u.uid, tm: u.tm, spd: this.speed(u) }));
    const out: string[] = [];
    for (let k = 0; k < n && sim.length; k++) {
      let best = sim[0], bestT = Infinity;
      for (const s of sim) {
        const t = (TURN_FULL - s.tm) / s.spd;
        if (t < bestT) {
          bestT = t;
          best = s;
        }
      }
      for (const s of sim) s.tm += s.spd * bestT;
      best.tm = 0;
      out.push(best.uid);
    }
    return out;
  }
}
