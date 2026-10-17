// Pure battle rules: turn meter, skill resolution, statuses, cooldowns,
// affinities, counterattacks and passives. No rendering here: the view
// replays the returned events. Rules are documented in docs/MECHANICS_GUIDE.md.
import { AFFINITY_BONUS, affinityEdge } from '../data/meta';
import { STATUSES } from '../data/statuses';
import { ChampionDef, PassiveDef, SkillDef, StatId, Stats, StatusId, TeamId } from '../data/types';
import { Rng } from './rng';

export interface StatusInst {
  id: StatusId;
  turns: number;
  /** shield: remaining absorb */
  value: number;
  source: string;
  /** placed during its holder's own turn: it starts counting down at the holder's next turn */
  fresh?: boolean;
}

/** A champion entering battle, optionally as a boss. */
export interface Combatant {
  def: ChampionDef;
  boss?: boolean;
  /** the champion's stats with its Weaver Matrix; its base stats when absent */
  stats?: Stats;
}

export interface Unit {
  uid: string;
  champion: ChampionDef;
  /** stats in this battle: the champion's, or with its Weaver Matrix, plus a stat passive (stage power is applied separately) */
  stats: Stats;
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
  /** Overdrive already triggered */
  overdriven: boolean;
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
  | { kind: 'passive'; target: string; name: string; hit: number; effect: PassiveDef['kind']; source?: string }
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
const POISON_PCT = 0.05;
const BURN_PCT = 0.06;
const REGEN_PCT = 0.15;
const DAMAGE_SCALE = 4.8;
/** damage taken is multiplied by DEF_SCALE / DEF: twice the DEF, half the damage */
const DEF_SCALE = 40;
const DEF_UP = 0.16;
const DEF_DOWN = 0.12;
/** RES over the placer's ACC resists debuffs: RES_SCALE points over halve their chance (a stand-in) */
const RES_SCALE = 100;

/**
 * The share of a debuff's chance that lands on an enemy (Jakub, 2026-10-11:
 * the placer's ACC is compared against the target's RES): all of it while ACC
 * is at least RES, then RES_SCALE / (RES_SCALE + RES - ACC).
 */
export function landShare(acc: number, res: number): number {
  return res > acc ? RES_SCALE / (RES_SCALE + res - acc) : 1;
}

/**
 * The stats a champion fights with: a stat passive adds to them here, in
 * battle only (Jakub, 2026-10-12: the collection shows the champion's stats
 * without it, and it is extra, outside the stat budget).
 */
export function battleStats(def: ChampionDef, stats: Stats): Stats {
  const p = def.passive;
  if (p?.kind !== 'stat' || !p.stat) return stats;
  return { ...stats, [p.stat]: Math.round((stats[p.stat] + p.value) * 1000) / 1000 };
}

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
  /** the champion whose turn it is, from startTurn to endTurn */
  acting: Unit | null = null;

  constructor(player: Combatant[], enemy: Combatant[], opts: BattleOptions = {}) {
    this.rng = new Rng(opts.seed ?? 1);
    const power = opts.enemyPower ?? 1;
    const bossHp = opts.bossHp ?? 1.6;
    const mk = (c: Combatant, team: TeamId, slot: number): Unit => {
      const k = team === 'enemy' ? power : 1;
      const stats = battleStats(c.def, c.stats ?? c.def.stats);
      const hp = Math.round(stats.hp * k * (c.boss ? bossHp : 1));
      return {
        uid: `${team === 'player' ? 'p' : 'e'}${slot}`,
        champion: c.def,
        stats,
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
        overdriven: false,
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
    return u.stats.spd * k;
  }

  attack(u: Unit): number {
    let k = 1;
    if (this.has(u, 'atk_up')) k += 0.25;
    if (this.has(u, 'atk_down')) k -= 0.25;
    return u.stats.atk * u.atkMul * k;
  }

  defense(u: Unit): number {
    let k = 1;
    if (this.has(u, 'def_up')) k += DEF_UP;
    if (this.has(u, 'def_down')) k -= DEF_DOWN;
    return u.stats.def * k;
  }

  /** The critical rate a unit strikes with: its stats, and a passive that grows as its allies fall (Big Ears'). */
  critRate(u: Unit): number {
    return u.stats.crit + this.fallenBonus(u, 'crit');
  }

  /** Fallen (passive): `value` for each fallen ally of the holder, up to `max`. */
  fallenBonus(u: Unit, stat: StatId): number {
    const p = u.champion.passive;
    if (p?.kind !== 'fallen' || p.stat !== stat) return 0;
    const fallen = this.units.filter((x) => x.team === u.team && x !== u && !x.alive).length;
    return Math.min(p.max ?? Infinity, fallen * p.value);
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
    this.acting = u;
    const events: BattleEvent[] = [];
    if (this.has(u, 'poison')) this.applyDamage(u, Math.round(u.maxHp * POISON_PCT), false, 0, 0, events, 'poison');
    if (u.alive && this.has(u, 'burn')) this.applyDamage(u, Math.round(u.maxHp * BURN_PCT), false, 0, 0, events, 'burn');
    if (u.alive && this.has(u, 'regen')) this.heal(u, Math.round(u.maxHp * REGEN_PCT), 0, events);
    const skip = u.alive && (this.has(u, 'stun') || this.has(u, 'freeze'));
    return { events, skip };
  }

  /** End of the actor's turn: a passive that acts now, then TM reset, durations and cooldowns tick down (a status placed during this turn starts counting at the next). */
  endTurn(u: Unit): BattleEvent[] {
    const events: BattleEvent[] = [];
    // still the holder's turn: a Shield it gives itself now covers its next turn, like any status placed on its own turn
    this.tend(u, events);
    if (this.acting === u) this.acting = null;
    u.tm = u.alive ? Math.min(TURN_FULL - 1, u.pendingTm) : 0;
    u.pendingTm = 0;
    for (const s of [...u.statuses]) {
      if (s.fresh) {
        s.fresh = false;
        continue;
      }
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
      case 'ally': {
        // a skill that gives its user the effect too is aimed at someone else while anyone else
        // stands (the Walking Bush's Thicket: himself and one chosen ally)
        const all = this.allies(u);
        if (!s.statuses?.some((x) => x.to === 'self')) return all;
        const others = all.filter((a) => a !== u);
        return others.length ? others : all;
      }
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
        if (dmg.crit) this.rebuke(t, actor, hi, events);
        if (skill.lifesteal && dealt > 0 && actor.alive) this.heal(actor, Math.round(dealt * skill.lifesteal), hi, events);
        for (const app of skill.statuses ?? []) {
          if (app.perHit && app.to === 'targets' && t.alive) this.tryApply(actor, t, app.status, app.turns, app.chance, app.value, hi, events);
        }
      }
    });

    // support effects land on the last hit
    if (skill.healAllies) {
      for (const a of this.allies(actor)) this.heal(a, Math.round((skill.healOf === 'caster' ? actor.maxHp : a.maxHp) * skill.healAllies), last, events);
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
    // a status reaches each unit once per skill: alone, the Walking Bush is his own chosen ally
    const given = new Set<string>();
    for (const app of skill.statuses ?? []) {
      if (app.perHit) continue;
      const recipients = app.to === 'self' ? [actor] : app.to === 'allies' ? this.allies(actor) : targets;
      for (const r of recipients) {
        if (!r.alive || given.has(r.uid + app.status)) continue;
        given.add(r.uid + app.status);
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
    if (skill.tmAllies) {
      for (const a of this.allies(actor)) {
        if (a === actor) continue;
        const before = a.tm;
        a.tm = Math.max(0, Math.min(TURN_FULL, a.tm + skill.tmAllies));
        events.push({ kind: 'tm', target: a.uid, delta: a.tm - before, hit: last });
      }
    }
    if (skill.tmLowestAlly) {
      // after the heals; never the actor, whose own meter resets at its turn end
      const low = this.allies(actor).filter((a) => a !== actor).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      if (low) {
        const before = low.tm;
        low.tm = Math.max(0, Math.min(TURN_FULL, low.tm + skill.tmLowestAlly));
        events.push({ kind: 'tm', target: low.uid, delta: low.tm - before, hit: last });
      }
    }
    if (skill.selfTm && !asCounter) actor.pendingTm = skill.selfTm;
    // a passive answering the blow on each ally it struck comes after the hit
    this.ward(actor, damaged, last, events);

    const result: SkillResult = { actor: actor.uid, skill, target: primary?.uid, targets: targets.map((t) => t.uid), events, counter: asCounter, counters: [] };

    // counterattacks: each damaged defender holding Counterattack answers once with A1;
    // one whose A1 strikes no enemy (the Dominion Medic's heal) has no answer to give
    if (!asCounter && actor.team !== undefined) {
      for (const d of damaged) {
        if (!d.alive || !actor.alive || d.team === actor.team) continue;
        if (!this.has(d, 'counter') || this.has(d, 'stun') || this.has(d, 'freeze')) continue;
        if (d.champion.skills[0].target !== 'enemy') continue;
        result.counters.push(this.useSkill(d, d.champion.skills[0], actor.uid, true));
      }
    }
    return result;
  }

  private tryApply(actor: Unit, r: Unit, status: StatusId, turns: number, chance: number | undefined, value: number | undefined, hit: number, events: BattleEvent[]) {
    // a debuff on an enemy meets its RES; a certain one rolls only when RES cuts it
    const land = (chance ?? 1) * (!STATUSES[status].buff && r.team !== actor.team ? landShare(actor.stats.acc, r.stats.res) : 1);
    if ((chance !== undefined || land < 1) && !this.rng.chance(land)) {
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
    const crit = this.rng.chance(this.critRate(a));
    const edge = affinityEdge(a.champion.affinity, t.champion.affinity);
    let dmg = this.attack(a) * mult * DAMAGE_SCALE;
    dmg *= DEF_SCALE / this.defense(t);
    dmg *= 1 + edge * AFFINITY_BONUS;
    if (s.execute && t.hp / t.maxHp < s.execute.below) dmg *= s.execute.mult;
    // a critical hit adds the attacker's critical damage (1 = +100%: double damage)
    if (crit) dmg *= 1 + a.stats.critDmg;
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
    const p = t.champion.passive;
    if (t.hp <= 0 && t.alive) {
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
        this.mourn(t, hit, events);
      }
    } else if (t.alive && p?.kind === 'overdrive' && !t.overdriven && t.hp / t.maxHp < p.value) {
      // the core overloads once: a second phase for bosses like Mwamba
      t.overdriven = true;
      events.push({ kind: 'passive', target: t.uid, name: p.name, hit, effect: 'overdrive' });
      for (const st of p.statuses ?? []) {
        this.addStatus(t, st.status, st.turns, 0, t.uid);
        events.push({ kind: 'status', target: t.uid, status: st.status, turns: st.turns, hit });
      }
    }
    return lost;
  }

  /**
   * Places a status, or refreshes it to the longer duration. Durations count
   * the holder's own turns: a status placed during the holder's turn (a
   * self-buff, a Rebuke answering a critical hit) starts counting at its next
   * turn, so a 1-turn Freeze always skips a turn and a 2-turn ATK Up covers two.
   */
  addStatus(u: Unit, id: StatusId, turns: number, value: number, source: string) {
    const fresh = u === this.acting;
    const ex = u.statuses.find((s) => s.id === id);
    if (ex) {
      // compare what is left after this turn's tick with the new duration
      const left = fresh && !ex.fresh ? ex.turns - 1 : ex.turns;
      ex.turns = Math.max(left, turns);
      ex.value = Math.max(ex.value, value);
      if (fresh) ex.fresh = true;
      return;
    }
    u.statuses.push({ id, turns, value, source, ...(fresh ? { fresh } : {}) });
  }

  /**
   * Tend (passive): at the end of its holder's turn, skipped or not, the ally
   * with the lowest max HP, the holder included, receives the passive's
   * statuses; then it rests for `cooldown` of the holder's turns (the Jungle
   * Herder's Herder's Ward: a Shield of 10% of his max HP every second turn,
   * from his first). Ties go to the one lower on HP, then to the front.
   */
  private tend(u: Unit, events: BattleEvent[]) {
    const p = u.champion.passive;
    if (p?.kind !== 'tend' || !u.alive || (u.cooldowns[p.id] ?? 0) > 0) return;
    const ward = [...this.allies(u)].sort((x, y) => x.maxHp - y.maxHp || x.hp / x.maxHp - y.hp / y.maxHp || x.slot - y.slot)[0];
    // the rest counts the holder's own turns, and this turn's cooldowns tick right after
    u.cooldowns[p.id] = (p.cooldown ?? 0) + 1;
    events.push({ kind: 'passive', target: ward.uid, name: p.name, hit: 0, effect: 'tend', source: u.uid });
    for (const st of p.statuses ?? []) this.tryApply(u, ward, st.status, st.turns, undefined, p.value, 0, events);
  }

  /**
   * Ward (passive): each ally of the holder, the holder included, that an
   * enemy skill damaged and left standing may receive the passive's statuses
   * after the hit, once per skill, with the passive's chance (Emissary
   * Handlings' Unbroken Flag: a Shield of 15% of his max HP, half the time).
   */
  private ward(actor: Unit, damaged: Set<Unit>, hit: number, events: BattleEvent[]) {
    for (const d of damaged) {
      if (!d.alive || d.team === actor.team) continue;
      for (const h of this.allies(d)) {
        const p = h.champion.passive;
        if (p?.kind !== 'ward') continue;
        if (p.chance !== undefined && !this.rng.chance(p.chance)) continue;
        events.push({ kind: 'passive', target: d.uid, name: p.name, hit, effect: 'ward', source: h.uid });
        for (const st of p.statuses ?? []) this.tryApply(h, d, st.status, st.turns, undefined, p.value, hit, events);
      }
    }
  }

  /** Fallen (passive): the fall of an ally raises its holder's stat (`fallenBonus`); shown while the bonus still grows. */
  private mourn(t: Unit, hit: number, events: BattleEvent[]) {
    for (const h of this.allies(t)) {
      const p = h.champion.passive;
      if (p?.kind !== 'fallen') continue;
      const fallen = this.units.filter((x) => x.team === h.team && x !== h && !x.alive).length;
      const cap = p.max ?? Infinity;
      if (Math.min(cap, fallen * p.value) <= Math.min(cap, (fallen - 1) * p.value) + 1e-9) continue;
      events.push({ kind: 'passive', target: h.uid, name: p.name, hit, effect: 'fallen' });
    }
  }

  /** Rebuke (passive): a critical hit on its holder below the threshold answers the attacker, then the passive rests. */
  private rebuke(t: Unit, attacker: Unit, hit: number, events: BattleEvent[]) {
    const p = t.champion.passive;
    if (p?.kind !== 'rebuke' || !t.alive || !attacker.alive || t.team === attacker.team) return;
    if (t.hp / t.maxHp >= p.value || (t.cooldowns[p.id] ?? 0) > 0) return;
    // the rest counts the holder's own turns: one more if it is its turn now
    t.cooldowns[p.id] = (p.cooldown ?? 0) + (t === this.acting ? 1 : 0);
    events.push({ kind: 'passive', target: t.uid, name: p.name, hit, effect: 'rebuke', source: attacker.uid });
    for (const st of p.statuses ?? []) this.tryApply(t, attacker, st.status, st.turns, undefined, undefined, hit, events);
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
