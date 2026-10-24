// How Thread Spools read on screen, shared by the MATRIX tab, Weaving, the
// campaign's stage list and the results panel: the colours of the patterns
// and grades, a spool's stats as text, a slot's rule, and the UI parts that
// picture a spool (tools/art/ui/matrix.ts).
import { GRADES, MATRIX_LAYOUT, pattern, patternBonusText, SLOT_NAMES, SPOOL_STAT_NAME } from '../data/matrix';
import { SpoolStat, StatNode } from '../data/types';
import { SlotIndex, slotsFor, StatBonus, strandValue, ThreadSpool, WeaverMatrix } from '../reliquary/matrix';

/** text colour of each pattern: the light step of its spool's thread (tools/art/ui/matrix.ts); Pulse a step deeper, apart from Needle's gold */
export const PATTERN_TINT: Record<string, string> = {
  pattern_pulse: '#ffa030', pattern_sunder: '#ff6a5a', pattern_ward: '#9fd0ff', pattern_vigor: '#a2f56a',
  pattern_needle: '#ffe890', pattern_apex: '#ff8ad0', pattern_focus: '#d89cff', pattern_tranquility: '#6ad8bc',
};

/** grade name colour: the cap metal */
export const GRADE_TINT = ['#a08a7a', '#cfd8e6', '#efc04a'];

export const patternName = (id: string) => pattern(id)?.name ?? id;

/** "ATK +8", "ATK % +7%", "C.DMG +10%", "ACC +14" */
export function statText(s: SpoolStat, v: number): string {
  const pct = s === 'atkPct' || s === 'hpPct' || s === 'defPct' || s === 'crit' || s === 'critDmg';
  return `${SPOOL_STAT_NAME[s].replace(' %', '')} +${v}${pct ? '%' : ''}`;
}

/** What a slot takes: "flat ATK", "SPD or a base stat in %", "C.RATE, C.DMG or a base stat in %". */
export function ruleText(n: StatNode): string {
  if (n.kind === 'fixed') return `flat ${SPOOL_STAT_NAME[n.stat]}`;
  const special = n.stats.filter((s) => s !== 'atkPct' && s !== 'hpPct' && s !== 'defPct').map((s) => SPOOL_STAT_NAME[s]);
  return `${special.join(', ')} or a base stat in %`;
}

/** The rule written inside an empty slot: its own stats, one a line, then "or %". */
export function emptyLabel(n: StatNode): string[] {
  if (n.kind === 'fixed') return [SPOOL_STAT_NAME[n.stat]];
  const special = n.stats.filter((s) => s !== 'atkPct' && s !== 'hpPct' && s !== 'defPct');
  return [...(special.includes('crit') ? ['CRIT'] : special.map((s) => SPOOL_STAT_NAME[s])), 'or %'];
}

/** A strand as it counts in its slot: "ATK +2% +1" when attuned. */
export function strandText(m: WeaverMatrix, i: SlotIndex, st: StatBonus): string {
  const extra = strandValue(m, i, st) - st.value;
  return `${statText(st.stat, st.value)}${extra ? ` +${extra}` : ''}`;
}

/** "Gilded. Main C.DMG +15%; strands ATK +2%, SPD +1. 2 Apex spools weave +20% C.DMG." */
export function spoolSummary(s: ThreadSpool): string {
  const p = pattern(s.pattern);
  return `${GRADES[s.grade]}. Main ${statText(s.main.stat, s.main.value)}; strands ${s.strands.map((st) => statText(st.stat, st.value)).join(', ')}.${p ? ` ${p.pieces} ${p.name} spools weave ${patternBonusText(p)}.` : ''}`;
}

/** The slots a spool fits by name: "Zenith", "East Meridian, Nadir or West Meridian". */
export function fitsText(s: ThreadSpool): string {
  const names = slotsFor(MATRIX_LAYOUT, s).map((i) => SLOT_NAMES[i]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : (names[0] ?? 'no slot');
}

/** The 18x18 icon of a spool. */
export const spoolIcon = (s: ThreadSpool) => `spool_${s.pattern}_${s.grade}`;

/** The large art of a spool (Weaving's cards and panel). */
export const spoolArt = (s: ThreadSpool) => `bigspool_${s.pattern}_${s.grade}`;

/** The small rose that lights the slots a spool fits: rose_0 ... rose_5 for one slot, rose_135 for the three choice slots. */
export const roseMark = (s: ThreadSpool) => 'rose_' + slotsFor(MATRIX_LAYOUT, s).join('');
