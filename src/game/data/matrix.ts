// Weaver Matrix catalog (approved 2026-10-10): the six slots in two triangles,
// the spool grades, the main-stat values and the strand rules. Rules and
// invariants: docs/MECHANICS_GUIDE.md 14, docs/DDD.md 4.7.
//
// Weave Patterns are not defined yet: PATTERN_IDS only names the draft ids
// that spools and their art carry until Jakub defines the patterns.
import { MatrixLayout, StatId, StatNode } from './types';

/** Every stat once; the record type makes the compiler insist on all of them. */
const STATS: Record<StatId, true> = { hp: true, atk: true, def: true, spd: true, crit: true };
export const STAT_IDS: readonly StatId[] = Object.keys(STATS) as StatId[];

const fixed = (stat: StatId): StatNode => ({ kind: 'fixed', stat });
const choice = (...stats: StatId[]): StatNode => ({ kind: 'variable', stats });

/**
 * The two triangles: slots 1, 3 and 5 (indices 0, 2, 4) are fixed to ATK, DEF
 * and HP; slots 2, 4 and 6 are a choice, and only slot 2 takes SPD and only
 * slot 4 takes CRIT.
 */
export const MATRIX_LAYOUT: MatrixLayout = [
  fixed('atk'),
  choice('spd', 'atk', 'hp', 'def'),
  fixed('def'),
  choice('crit', 'atk', 'hp', 'def'),
  fixed('hp'),
  choice('atk', 'hp', 'def'),
];

export const GRADES = ['Ashen', 'Silver', 'Gilded'] as const;

/** Main stat by grade: ATK, HP and DEF in % of base, CRIT in points of chance, SPD flat. */
export const MAIN_VALUE: Record<StatId, readonly [number, number, number]> = {
  atk: [4, 7, 10],
  hp: [4, 7, 10],
  def: [4, 7, 10],
  crit: [4, 7, 10],
  spd: [2, 3, 4],
};

/** Strands per grade. */
export const STRAND_COUNT: readonly [number, number, number] = [1, 2, 3];
/** The range a strand rolls in, by grade (same units as the main stat); SPD strands are always SPD_STRAND. */
export const STRAND_RANGE: readonly [number, number][] = [[1, 1], [1, 2], [1, 3]];
export const SPD_STRAND = 1;
/** The most SPD a matrix's strands can add together. */
export const SPD_STRAND_CAP = 4;
/** What an attuned strand gains. */
export const ATTUNE_BONUS = 1;

/** Draft pattern ids and names (the patterns' rules and values wait for Jakub). */
export const PATTERN_IDS = ['lifethread', 'tension', 'selvage', 'glint', 'quickweft', 'fraybite', 'bloodweft', 'wardknot'] as const;
export const PATTERN_NAMES: Record<(typeof PATTERN_IDS)[number], string> = {
  lifethread: 'Lifethread',
  tension: 'Tension',
  selvage: 'Selvage',
  glint: 'Glint',
  quickweft: 'Quickweft',
  fraybite: 'Fray-Bite',
  bloodweft: 'Bloodweft',
  wardknot: 'Wardknot',
};
