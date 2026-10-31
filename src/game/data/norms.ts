// Balance norms: the numeric guardrails every champion and stage must respect.
// Enforced by tests/content.test.ts and reported by `npm run balance`.
// Changing a norm is a design decision: update docs/MECHANICS_GUIDE.md too.
import { STATUSES } from './statuses';
import { ChampionDef, Rarity, SkillDef, Stats } from './types';

/** Weighted stat sum used to compare champions of different roles on one scale. */
export function statScore(s: Stats): number {
  return s.hp / 12 + s.atk * 1.1 + (s.def - 40) * 2.25 + s.spd * 1.3 + s.crit * 300;
}

/**
 * Target stat score per rarity. A champion must land within BUDGET_TOLERANCE of it.
 * What rarity gates is not decided yet (docs/DESIGN_DECISIONS.md 2.2): these
 * are the proof of concept's budgets carried over (Elite at the old Rare,
 * Heroic at Epic, Mythic at Legendary).
 */
export const RARITY_BUDGET: Record<Rarity, number> = {
  common: 390,
  elite: 425,
  heroic: 440,
  mythic: 455,
};
export const BUDGET_TOLERANCE = 0.05;

/** Allowed stat ranges (sanity limits, not targets). */
export const STAT_LIMITS = {
  hp: [900, 1700],
  atk: [70, 130],
  def: [56, 80],
  spd: [90, 125],
  crit: [0.025, 0.15],
} as const;

/** Total damage multiplier (sum of hit mults) allowed per slot, single target vs AoE. */
export const SKILL_NORMS: Record<1 | 2 | 3, { cooldown: [number, number]; single: [number, number]; aoe: [number, number] }> = {
  1: { cooldown: [0, 0], single: [0.9, 1.25], aoe: [0.5, 0.8] },
  // A2 cooldown 4: Jakub's Bloodhound (2026-10-12), whose Taunt rests a turn longer;
  // 5: his Emissary Handlings' Rallying Standard and Big Ears' Dart Volley (2026-10-17)
  2: { cooldown: [3, 5], single: [1.1, 1.6], aoe: [0.5, 1.1] },
  // A3 cooldown 6: Jakub's Necromancer's Raise Dead (2026-10-18), a revive
  3: { cooldown: [4, 6], single: [1.3, 2.6], aoe: [0.7, 1.2] },
};

/** Status application norms: durations in turns. */
export const STATUS_NORMS = {
  /** hard control (stun, freeze) never lasts longer than this */
  maxControlTurns: 1,
  /** any other status */
  maxTurns: 3,
  /** a guaranteed (chance 1) hard control effect is only allowed on A3 */
  guaranteedControlSlot: 3,
};

export function totalMult(s: SkillDef): number {
  return s.hits.reduce((a, h) => a + h.mult, 0);
}

export function isAoe(s: SkillDef): boolean {
  return s.target === 'enemies';
}

export function budgetDelta(c: ChampionDef): number {
  return statScore(c.stats) / RARITY_BUDGET[c.rarity] - 1;
}

/** Problems with a champion against the norms; empty when it complies. */
export function auditChampion(c: ChampionDef): string[] {
  const out: string[] = [];
  const d = budgetDelta(c);
  if (Math.abs(d) > BUDGET_TOLERANCE) out.push(`stat score ${statScore(c.stats).toFixed(0)} is ${(d * 100).toFixed(1)}% off the ${c.rarity} budget ${RARITY_BUDGET[c.rarity]}`);
  for (const [k, [lo, hi]] of Object.entries(STAT_LIMITS)) {
    const v = c.stats[k as keyof Stats];
    if (v < lo || v > hi) out.push(`${k} ${v} outside ${lo}-${hi}`);
  }
  c.skills.forEach((s, i) => {
    if (s.slot !== i + 1) out.push(`${s.id}: slot ${s.slot} in position ${i + 1}`);
    const n = SKILL_NORMS[s.slot];
    if (s.cooldown < n.cooldown[0] || s.cooldown > n.cooldown[1]) out.push(`${s.id}: cooldown ${s.cooldown} outside ${n.cooldown.join('-')}`);
    const m = totalMult(s);
    if (m > 0) {
      const [lo, hi] = isAoe(s) ? n.aoe : n.single;
      if (m < lo - 1e-9 || m > hi + 1e-9) out.push(`${s.id}: total multiplier ${m.toFixed(2)} outside ${lo}-${hi} (${isAoe(s) ? 'AoE' : 'single'})`);
    }
    for (const st of s.statuses ?? []) {
      const hard = st.status === 'stun' || st.status === 'freeze';
      if (hard && st.turns > STATUS_NORMS.maxControlTurns) out.push(`${s.id}: ${st.status} for ${st.turns} turns`);
      if (!hard && st.turns > STATUS_NORMS.maxTurns) out.push(`${s.id}: ${st.status} for ${st.turns} turns`);
      if (hard && (st.chance ?? 1) >= 1 && s.slot < STATUS_NORMS.guaranteedControlSlot) out.push(`${s.id}: guaranteed ${st.status} on A${s.slot}`);
    }
  });
  // a passive's control lasts a single turn too, and a passive that answers blows has to rest between answers
  const p = c.passive;
  for (const st of p?.statuses ?? []) {
    const hard = st.status === 'stun' || st.status === 'freeze';
    if (hard && st.turns > STATUS_NORMS.maxControlTurns) out.push(`${p!.id}: ${st.status} for ${st.turns} turns`);
    if (!hard && st.turns > STATUS_NORMS.maxTurns) out.push(`${p!.id}: ${st.status} for ${st.turns} turns`);
  }
  if (p?.kind === 'rebuke' && !(p.cooldown && p.cooldown >= 1)) out.push(`${p.id}: a rebuke needs a cooldown`);
  // a stat passive is extra, outside the budget (Jakub, 2026-10-12): it only has to name its stat
  if (p?.kind === 'stat' && !p.stat) out.push(`${p.id}: a stat passive needs a stat`);
  // so is a fallen passive, which also needs its cap; tend, ward, retaliate and remedy have something to give,
  // a chance between 0 and 1 when they roll one; a retaliation hurts the attacker, and a remedy, answering a
  // debuff, only helps (a debuff would answer itself)
  if (p?.kind === 'fallen' && (!p.stat || !p.max)) out.push(`${p.id}: a fallen passive needs a stat and a cap`);
  if (p?.kind === 'purge' && (p.statuses?.length || p.value)) out.push(`${p.id}: a purge passive only lifts debuffs`);
  if (p?.kind === 'immune' && (!p.immuneTo || STATUSES[p.immuneTo].buff)) out.push(`${p.id}: an immune passive names a debuff`);
  if (p?.kind === 'brace' && (!p.statuses?.length || p.statuses.some((st) => !STATUSES[st.status].buff))) out.push(`${p.id}: a brace passive gives its holder buffs`);
  if ((p?.kind === 'tend' || p?.kind === 'ward' || p?.kind === 'retaliate' || p?.kind === 'remedy') && !p.statuses?.length) out.push(`${p.id}: a ${p.kind} passive needs statuses`);
  if (p?.chance !== undefined && !(p.chance > 0 && p.chance <= 1)) out.push(`${p.id}: a chance of ${p.chance}`);
  if (p?.kind === 'retaliate' && p.statuses?.some((st) => STATUSES[st.status].buff)) out.push(`${p.id}: a retaliation places debuffs`);
  if (p?.kind === 'remedy' && p.statuses?.some((st) => !STATUSES[st.status].buff)) out.push(`${p.id}: a remedy gives buffs`);
  if (p?.self && p.kind !== 'ward') out.push(`${p.id}: only a ward guards its holder alone`);
  // a defy answers a critical hit on its holder with something for the holder: buffs, a heal or both
  if (p?.kind === 'defy' && !p.statuses?.length && !p.value) out.push(`${p.id}: a defy passive needs statuses or a heal`);
  if (p?.kind === 'defy' && p.statuses?.some((st) => !STATUSES[st.status].buff)) out.push(`${p.id}: a defy passive gives its holder buffs`);
  return out;
}
