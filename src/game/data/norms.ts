// Balance norms: the numeric guardrails every champion and stage must respect.
// Enforced by tests/content.test.ts and reported by `npm run balance`.
// Changing a norm is a design decision: update docs/MECHANICS_GUIDE.md too.
import { ChampionDef, Rarity, SkillDef, Stats } from './types';

/** Weighted stat sum used to compare champions of different roles on one scale. */
export function statScore(s: Stats): number {
  return s.hp / 12 + s.atk * 1.1 + s.def * 0.9 + s.spd * 1.3 + s.crit * 150;
}

/** Target stat score per rarity. A champion must land within BUDGET_TOLERANCE of it. */
export const RARITY_BUDGET: Record<Rarity, number> = {
  common: 390,
  uncommon: 410,
  rare: 425,
  epic: 440,
  legendary: 455,
};
export const BUDGET_TOLERANCE = 0.05;

/** Allowed stat ranges (sanity limits, not targets). */
export const STAT_LIMITS = {
  hp: [900, 1700],
  atk: [70, 130],
  def: [40, 100],
  spd: [90, 125],
  crit: [0.05, 0.3],
} as const;

/** Total damage multiplier (sum of hit mults) allowed per slot, single target vs AoE. */
export const SKILL_NORMS: Record<1 | 2 | 3, { cooldown: [number, number]; single: [number, number]; aoe: [number, number] }> = {
  1: { cooldown: [0, 0], single: [0.9, 1.25], aoe: [0.5, 0.8] },
  2: { cooldown: [3, 3], single: [1.1, 1.6], aoe: [0.5, 1.1] },
  3: { cooldown: [4, 5], single: [1.3, 2.6], aoe: [0.7, 1.2] },
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
  return out;
}
