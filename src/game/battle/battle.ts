// Pure battle rules: turn meter, skill resolution, statuses, cooldowns,
// affinities, counterattacks and passives. No rendering here: the view
// replays the returned events. Rules are documented in docs/MECHANICS_GUIDE.md.
import { AFFINITY_BONUS, affinityEdge } from '../data/meta';
import { STATUSES } from '../data/statuses';
import { ChampionDef, SkillDef, StatusId, TeamId } from '../data/types';
import { Rng } from './rng';

export interface StatusInst {
  id: StatusId;
  turns: number;
  /** shield: remaining absorb */
  value: number;
  source: string;
}

/** A champion entering battle, optionally as a boss. */
export interface Combatant {
  def: ChampionDef;
  boss?: boolean;
}

export interface Unit {
  uid: string;
  champion: ChampionDef;
  team: TeamId;
  /** 0 = front, 1 = back-top, 2 = back-bottom */
  slot: number;
  boss: boolean;
  hp: number;
  maxHp: number;
  /** stage scaling applied to Attack */
  atkMul: number;
  /** turn meter 0..100 */
  tm: number;
  cooldowns: Record<string, number>;
  statuses: StatusInst[];
  alive: boolean;
  /** Undying already spent */
  revived: boolean;
  /** turn meter granted for the end of this turn (selfTm skills) */
  pendingTm: number;
}

export type BattleEvent =
  | { kind: 'damage'; target: string; amount: number; crit: boolean; absorbed: number; edge: -1 | 0 | 1; hit: number; dot?: StatusId }
  | { kind: 'heal'; target: string; amount: number; hit: number }
  | { kind: 'blocked'; target: string; hit: number }
  | { kind: 'status'; target: string; status: StatusId; turns: number; hit: number }
  | { kind: 'resist'; target: string; status: StatusId; hit: number }
  | { kind: 'expire'; target: string; status: StatusId; hit: number }
  | { kind: 'cleanse'; target: string; status: StatusId; hit: number }
  | { kind: 'dispel'; target: string; status: StatusId; hit: number }
  | { kind: 'tm'; target: string; delta: number; hit: number }
  | { kind: 'revive'; target: string; hp: number; hit: number }
  | { kind: 'death'; target: string; hit: number };

export interface SkillResult {
  actor: string;
  skill: SkillDef;
  /** primary target (single-target skills) */
  target?: string;
  /** everyone affected, for AoE presentation */
  targets: string[];
  events: BattleEvent[];
  /** true when this action is a counterattack */
  counter?: boolean;
  /** counterattacks triggered by this action, already resolved */
  counters: SkillResult[];
}

export const TURN_FULL = 100;
const CRIT_MULT = 1.5;
const POISON_PCT = 0.05;
const BURN_PCT = 0.06;
const REGEN_PCT = 0.075;
const WEAKEN_MULT = 1.25;
const DAMAGE_SCALE = 4.8;

export interface BattleOptions {
  seed?: number;
  /** enemy stat multiplier (HP and ATK) for campaign stages */
  enemyPower?: number;
  /** extra HP multiplier for bosses */
  bossHp?: number;
}

export class Battle {
  units: Unit[] = [];
  rng: Rng;
  turn = 0;

  constructor(player: Combatant[], enemy: Combatant[], opts: BattleOptions = {}) {
    this.rng = new Rng(opts.seed ?? 1);
    const power = opts.enemyPower ?? 1;
    const bossHp = opts.bossHp ?? 1.6;
    const mk = (c: Combatant, team: TeamId, slot: number): Unit => {
      const k = team === 'enemy' ? power : 1;
      const hp = Math.round(c.def.stats.hp * k * (c.boss ? bossHp : 1));
      return {
        uid: `${team === 'player' ? 'p' : 'e'}${slot}`,
        champion: c.def,
        team,
        slot,
        boss: !!c.boss,
        hp,
        maxHp: hp,
        atkMul: k,
        tm: this.rng.range(0, 12),
        cooldowns: {},
        statuses: [],
        alive: true,
        revived: false,
        pendingTm: 0,
      };
    };
    player.forEach((c, i) => this.units.push(mk(c, 'player', i)));
    enemy.forEach((c, i) => this.units.push(mk(c, 'enemy', i)));
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
    return u.champion.stats.spd * k;
  }

  attack(u: Unit): number {
    let k = 1;
    if (this.has(u, 'atk_up')) k += 0.25;
    if (this.has(u, 'atk_down')) k -= 0.25;
    return u.champion.stats.atk * u.atkMul * k;
  }

  defense(u: Unit): number {
    let k = 1;
    if (this.has(u, 'def_up')) k += 0.4;
    if (this.has(u, 'def_down')) k -= 0.3;
    return u.champion.stats.def * k;
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

  /** Start-of-turn ticks (poison, burn, regen). `skip` = stunned/frozen. */
  startTurn(u: Unit): { events: BattleEvent[]; skip: boolean } {
    const events: BattleEvent[] = [];
    if (this.has(u, 'poison')) this.applyDamage(u, Math.round(u.maxHp * POISON_PCT), false, 0, 0, events, 'poison');
    if (u.alive && this.has(u, 'burn')) this.applyDamage(u, Math.round(u.maxHp * BURN_PCT), false, 0, 0, events, 'burn');
    if (u.alive && this.has(u, 'regen')) this.heal(u, Math.round(u.maxHp * REGEN_PCT), 0, events);
    const skip = u.alive && (this.has(u, 'stun') || this.has(u, 'freeze'));
    return { events, skip };
  }

  /** End of the actor's turn: TM reset, durations and cooldowns tick down. */
  endTurn(u: Unit): BattleEvent[] {
    const events: BattleEvent[] = [];
    u.tm = u.alive ? Math.min(TURN_FULL - 1, u.pendingTm) : 0;
    u.pendingTm = 0;
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

  useSkill(actor: Unit, skill: SkillDef, targetUid?: string, asCounter = false): SkillResult {
    const events: BattleEvent[] = [];
    let primary: Unit | undefined;
    let targets: Unit[];
    if (skill.target === 'enemy' || skill.target === 'ally') {
      // counterattacks ignore taunt: they answer whoever hit them
      const valid = asCounter ? this.foes(actor) : this.validTargets(actor, skill);
      primary = valid.find((v) => v.uid === targetUid) ?? valid[0];
      targets = primary ? [primary] : [];
    } else {
      targets = this.validTargets(actor, skill);
    }
    if (skill.cooldown > 0 && !asCounter) actor.cooldowns[skill.id] = skill.cooldown + 1;

    if (skill.stripBuffs) {
      for (const t of targets) {
        for (const s of t.statuses.filter((x) => STATUSES[x.id].buff)) {
          t.statuses.splice(t.statuses.indexOf(s), 1);
          events.push({ kind: 'dispel', target: t.uid, status: s.id, hit: 0 });
        }
      }
    }

    const last = skill.hits.length - 1;
    const damaged = new Set<Unit>();
    skill.hits.forEach((h, hi) => {
      if (h.mult <= 0) return;
      for (const t of targets) {
        if (!t.alive) continue;
        const dmg = this.rollDamage(actor, t, skill, h.mult);
        const dealt = this.applyDamage(t, dmg.amount, dmg.crit, dmg.edge, hi, events);
        damaged.add(t);
        if (skill.lifesteal && dealt > 0 && actor.alive) this.heal(actor, Math.round(dealt * skill.lifesteal), hi, events);
        for (const app of skill.statuses ?? []) {
          if (app.perHit && app.to === 'targets' && t.alive) this.tryApply(actor, t, app.status, app.turns, app.chance, app.value, hi, events);
        }
      }
    });

    // support effects land on the last hit
    if (skill.healAllies) {
      for (const a of this.allies(actor)) this.heal(a, Math.round(a.maxHp * skill.healAllies), last, events);
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
      if (app.perHit) continue;
      const recipients = app.to === 'self' ? [actor] : app.to === 'allies' ? this.allies(actor) : targets;
      for (const r of recipients) {
        if (!r.alive) continue;
        this.tryApply(actor, r, app.status, app.turns, app.chance, app.value, last, events);
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
    if (skill.selfTm && !asCounter) actor.pendingTm = skill.selfTm;

    const result: SkillResult = { actor: actor.uid, skill, target: primary?.uid, targets: targets.map((t) => t.uid), events, counter: asCounter, counters: [] };

    // counterattacks: each damaged defender holding Counterattack answers once with A1
    if (!asCounter && actor.team !== undefined) {
      for (const d of damaged) {
        if (!d.alive || !actor.alive || d.team === actor.team) continue;
        if (!this.has(d, 'counter') || this.has(d, 'stun') || this.has(d, 'freeze')) continue;
        result.counters.push(this.useSkill(d, d.champion.skills[0], actor.uid, true));
      }
    }
    return result;
  }

  private tryApply(actor: Unit, r: Unit, status: StatusId, turns: number, chance: number | undefined, value: number | undefined, hit: number, events: BattleEvent[]) {
    if (chance !== undefined && !this.rng.chance(chance)) {
      if (!STATUSES[status].buff) events.push({ kind: 'resist', target: r.uid, status, hit });
      return;
    }
    const v = value ? Math.round(actor.maxHp * value) : 0;
    this.addStatus(r, status, turns, v, actor.uid);
    events.push({ kind: 'status', target: r.uid, status, turns, hit });
  }

  /** Heals unless Heal Block is present; returns HP restored. */
  heal(u: Unit, amount: number, hit: number, events: BattleEvent[]): number {
    if (!u.alive || amount <= 0) return 0;
    if (this.has(u, 'heal_block')) {
      events.push({ kind: 'blocked', target: u.uid, hit });
      return 0;
    }
    const amt = Math.min(u.maxHp - u.hp, amount);
    if (amt <= 0) return 0;
    u.hp += amt;
    events.push({ kind: 'heal', target: u.uid, amount: amt, hit });
    return amt;
  }

  rollDamage(a: Unit, t: Unit, s: SkillDef, mult: number): { amount: number; crit: boolean; edge: -1 | 0 | 1 } {
    const crit = this.rng.chance(a.champion.stats.crit);
    const edge = affinityEdge(a.champion.affinity, t.champion.affinity);
    let dmg = this.attack(a) * mult * DAMAGE_SCALE;
    dmg *= 100 / (100 + this.defense(t));
    dmg *= 1 + edge * AFFINITY_BONUS;
    if (this.has(t, 'weaken')) dmg *= WEAKEN_MULT;
    if (s.execute && t.hp / t.maxHp < s.execute.below) dmg *= s.execute.mult;
    if (crit) dmg *= CRIT_MULT;
    dmg *= this.rng.range(0.92, 1.08);
    return { amount: Math.max(1, Math.round(dmg)), crit, edge };
  }

  /** Applies damage through shields (damage over time ignores them); returns HP actually lost. Handles death and Undying. */
  applyDamage(t: Unit, amount: number, crit: boolean, edge: -1 | 0 | 1, hit: number, events: BattleEvent[], dot?: StatusId): number {
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
    events.push({ kind: 'damage', target: t.uid, amount: amount - absorbed, crit, absorbed, edge, hit, ...(dot ? { dot } : {}) });
    if (t.hp <= 0 && t.alive) {
      const p = t.champion.passive;
      if (p?.kind === 'undying' && !t.revived) {
        t.revived = true;
        t.hp = Math.max(1, Math.round(t.maxHp * p.value));
        t.statuses = t.statuses.filter((s) => STATUSES[s.id].buff);
        events.push({ kind: 'revive', target: t.uid, hp: t.hp, hit });
      } else {
        t.alive = false;
        t.statuses = [];
        t.tm = 0;
        events.push({ kind: 'death', target: t.uid, hit });
      }
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
}

/** Convenience for tests and tools: champions without boss flags. */
export function combatants(defs: ChampionDef[]): Combatant[] {
  return defs.map((def) => ({ def }));
}
