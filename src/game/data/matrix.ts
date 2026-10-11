// Weaver Matrix catalog: the six slots in two triangles and their names, the
// spool grades, the main-stat values, the strand rules and the core Weave
// Patterns. Rules and invariants: docs/MECHANICS_GUIDE.md 14, docs/DDD.md 4.7.
//
// Jakub's (docs/DESIGN_DECISIONS.md section 9, 2026-10-11): the slot names
// and what each takes, and the eight core Weave Patterns with their stats,
// values and pieces. Stand-ins until he sets them: the grades' main-stat
// values, the strands and attunement (carried over from the approved outline).
import { MatrixLayout, SpoolStat, StatId, StatNode, WeavePatternDef } from './types';

/** Every champion stat once; the record type makes the compiler insist on all of them. */
const STATS: Record<StatId, true> = { hp: true, atk: true, def: true, spd: true, crit: true, critDmg: true, acc: true, res: true };
export const STAT_IDS: readonly StatId[] = Object.keys(STATS) as StatId[];

/** Every stat a spool can carry, with its short name. */
export const SPOOL_STAT_NAME: Record<SpoolStat, string> = {
  atk: 'ATK',
  hp: 'HP',
  def: 'DEF',
  atkPct: 'ATK %',
  hpPct: 'HP %',
  defPct: 'DEF %',
  spd: 'SPD',
  crit: 'C.RATE',
  critDmg: 'C.DMG',
  acc: 'ACC',
  res: 'RES',
};
export const SPOOL_STATS: readonly SpoolStat[] = Object.keys(SPOOL_STAT_NAME) as SpoolStat[];

/** The champion stat a spool stat adds to: ATK % and flat ATK both add to ATK. */
export const STAT_OF: Record<SpoolStat, StatId> = {
  atk: 'atk', hp: 'hp', def: 'def', atkPct: 'atk', hpPct: 'hp', defPct: 'def', spd: 'spd', crit: 'crit', critDmg: 'critDmg', acc: 'acc', res: 'res',
};

const fixed = (stat: SpoolStat): StatNode => ({ kind: 'fixed', stat });
const choice = (...stats: SpoolStat[]): StatNode => ({ kind: 'variable', stats });
/** the "base stats" every choice slot takes: ATK, HP or DEF in % of base */
const BASE_STATS: SpoolStat[] = ['atkPct', 'hpPct', 'defPct'];

/**
 * The two triangles, slot 1 at the top and clockwise (Jakub's names): the
 * fixed slots take flat ATK, DEF and HP; the choice slots take the base stats
 * in %, East Meridian also SPD, Nadir critical rate and damage, West Meridian
 * ACC and RES.
 */
export const MATRIX_LAYOUT: MatrixLayout = [
  fixed('atk'),
  choice('spd', ...BASE_STATS),
  fixed('def'),
  choice('crit', 'critDmg', ...BASE_STATS),
  fixed('hp'),
  choice('acc', 'res', ...BASE_STATS),
];

/** The slots' names, in MATRIX_LAYOUT order (Jakub's: Zenith = 1 ... WestMeridian = 6). */
export const SLOT_NAMES = ['Zenith', 'East Meridian', 'East Horizon', 'Nadir', 'West Horizon', 'West Meridian'] as const;

export const GRADES = ['Ashen', 'Silver', 'Gilded'] as const;

/**
 * Main stat by grade: flat ATK, HP and DEF (sized to what 4, 7 and 10% of a
 * starter's base give), the base stats in %, critical rate and damage in
 * points, SPD, ACC and RES flat. Stand-ins.
 */
export const MAIN_VALUE: Record<SpoolStat, readonly [number, number, number]> = {
  atk: [5, 8, 11],
  hp: [50, 85, 120],
  def: [3, 5, 7],
  atkPct: [4, 7, 10],
  hpPct: [4, 7, 10],
  defPct: [4, 7, 10],
  spd: [2, 3, 4],
  crit: [4, 7, 10],
  critDmg: [6, 10, 15],
  acc: [8, 14, 20],
  res: [8, 14, 20],
};

/** The stats a strand can be: the base stats in %, critical rate in points, SPD. */
export const STRAND_STATS: readonly SpoolStat[] = ['hpPct', 'atkPct', 'defPct', 'crit', 'spd'];
/** Strands per grade. */
export const STRAND_COUNT: readonly [number, number, number] = [1, 2, 3];
/** The range a strand rolls in, by grade (same units as the main stat); SPD strands are always SPD_STRAND. */
export const STRAND_RANGE: readonly [number, number][] = [[1, 1], [1, 2], [1, 3]];
export const SPD_STRAND = 1;
/** The most SPD a matrix's strands can add together. */
export const SPD_STRAND_CAP = 4;
/** What an attuned strand gains. */
export const ATTUNE_BONUS = 1;

/**
 * The core Weave Patterns (Jakub's CoreWeavePatterns, 2026-10-11): each is a
 * 2-piece pattern adding one stat every time it is woven. His StatType names:
 * Speed, Attack, Defense, Health, CritRate, CritDamage, Accuracy, Resistance.
 */
export const CORE_WEAVE_PATTERNS: readonly WeavePatternDef[] = [
  { id: 'pattern_pulse', name: 'Pulse', pieces: 2, bonus: { stat: 'spd', value: 0.12 } },
  { id: 'pattern_sunder', name: 'Sunder', pieces: 2, bonus: { stat: 'atk', value: 0.15 } },
  { id: 'pattern_ward', name: 'Ward', pieces: 2, bonus: { stat: 'def', value: 0.15 } },
  { id: 'pattern_vigor', name: 'Vigor', pieces: 2, bonus: { stat: 'hp', value: 0.15 } },
  { id: 'pattern_needle', name: 'Needle', pieces: 2, bonus: { stat: 'crit', value: 0.12 } },
  { id: 'pattern_apex', name: 'Apex', pieces: 2, bonus: { stat: 'critDmg', value: 0.2 } },
  { id: 'pattern_focus', name: 'Focus', pieces: 2, bonus: { stat: 'acc', value: 20 } },
  { id: 'pattern_tranquility', name: 'Tranquility', pieces: 2, bonus: { stat: 'res', value: 20 } },
];

export const PATTERN_IDS: readonly string[] = CORE_WEAVE_PATTERNS.map((p) => p.id);

export function pattern(id: string): WeavePatternDef | undefined {
  return CORE_WEAVE_PATTERNS.find((p) => p.id === id);
}

/** The short name of a champion stat: "C.RATE", "ACC". */
export const STAT_NAME: Record<StatId, string> = { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD', crit: 'C.RATE', critDmg: 'C.DMG', acc: 'ACC', res: 'RES' };

/** What a pattern gives when woven `times` times, as text: "+12% SPD", "+20 ACC". */
export function patternBonusText(p: WeavePatternDef, times = 1): string {
  const { stat, value } = p.bonus;
  const v = value * times;
  return stat === 'acc' || stat === 'res' ? `+${v} ${STAT_NAME[stat]}` : `+${Math.round(v * 100)}% ${STAT_NAME[stat]}`;
}
