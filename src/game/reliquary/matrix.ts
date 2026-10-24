// The Weaver Matrix: six slots in two triangles, each with a stat node,
// holding Thread Spools. A spool is a value and so is a matrix: every change
// returns a new matrix. A spool carries a main stat and strands; a strand on a
// choice slot that matches a neighbouring fixed slot's stat is attuned. Weave
// Patterns count spools over the whole matrix; where a spool sits never matters
// to them, and each woven pattern adds its stat. Rules: docs/MECHANICS_GUIDE.md
// 14; terms and invariants: docs/DDD.md 2.6, 4.7, 6.5.
import { ATTUNE_BONUS, CORE_WEAVE_PATTERNS, MAIN_VALUE, SPD_STRAND, SPD_STRAND_CAP, SPOOL_STATS, STAT_OF, STRAND_COUNT, STRAND_RANGE, STRAND_STATS } from '../data/matrix';
import { MatrixLayout, PatternId, SpoolStat, StatId, Stats, StatNode, WeavePatternDef } from '../data/types';

export type SlotIndex = 0 | 1 | 2 | 3 | 4 | 5;

/** 0 Ashen, 1 Silver, 2 Gilded. */
export type Grade = 0 | 1 | 2;

/** One stat a spool carries: flat or % ATK, HP and DEF, critical rate and damage in points, SPD, ACC and RES flat. */
export interface StatBonus {
  readonly stat: SpoolStat;
  readonly value: number;
}

/** Thread Spool: a value object. No identity, equal when its fields are equal, never changed in place. */
export interface ThreadSpool {
  /** the Weave Pattern it counts toward */
  readonly pattern: PatternId;
  readonly grade: Grade;
  /** its main stat, which decides the slots it fits; the value follows the grade */
  readonly main: StatBonus;
  /** the additional stats, one per grade step */
  readonly strands: readonly StatBonus[];
}

/**
 * Makes a spool and enforces its rules: the main value comes from the grade;
 * the grade sets how many strands it has; a strand never repeats the main stat
 * or another strand; strand values stay inside the grade's range, and a SPD
 * strand is always +1. Throws on anything else.
 */
export function threadSpool(pattern: PatternId, grade: Grade, stat: SpoolStat, strands: readonly (readonly [SpoolStat, number])[]): ThreadSpool {
  if (typeof pattern !== 'string' || !pattern) throw new Error(`a spool needs a pattern, got ${String(pattern)}`);
  if (grade !== 0 && grade !== 1 && grade !== 2) throw new Error(`unknown grade ${String(grade)}`);
  if (!SPOOL_STATS.includes(stat)) throw new Error(`unknown stat "${String(stat)}"`);
  if (!Array.isArray(strands) || strands.length !== STRAND_COUNT[grade]) throw new Error(`a grade ${grade} spool has ${STRAND_COUNT[grade]} strands`);
  const seen = new Set<SpoolStat>([stat]);
  const [lo, hi] = STRAND_RANGE[grade];
  const out = strands.map(([s, v]) => {
    if (!STRAND_STATS.includes(s)) throw new Error(`unknown strand "${String(s)}"`);
    if (seen.has(s)) throw new Error(`strand ${s} repeats a stat of the spool`);
    seen.add(s);
    const ok = s === 'spd' ? v === SPD_STRAND : Number.isInteger(v) && v >= lo && v <= hi;
    if (!ok) throw new Error(`strand ${s} +${v} is outside its range`);
    return Object.freeze({ stat: s, value: v });
  });
  return Object.freeze({ pattern, grade, main: Object.freeze({ stat, value: MAIN_VALUE[stat][grade] }), strands: Object.freeze(out) });
}

/** Rolls a new spool: random strands that obey the rules. */
export function rollSpool(pattern: PatternId, grade: Grade, stat: SpoolStat, rng: () => number): ThreadSpool {
  const pool = STRAND_STATS.filter((s) => s !== stat);
  const [lo, hi] = STRAND_RANGE[grade];
  const strands: [SpoolStat, number][] = [];
  for (let i = 0; i < STRAND_COUNT[grade]; i++) {
    const s = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    strands.push([s, s === 'spd' ? SPD_STRAND : lo + Math.floor(rng() * (hi - lo + 1))]);
  }
  return threadSpool(pattern, grade, stat, strands);
}

export function sameSpool(a: ThreadSpool, b: ThreadSpool): boolean {
  return (
    a.pattern === b.pattern &&
    a.grade === b.grade &&
    a.main.stat === b.main.stat &&
    a.strands.length === b.strands.length &&
    a.strands.every((s, i) => s.stat === b.strands[i].stat && s.value === b.strands[i].value)
  );
}

/** Whether a slot's stat node takes this spool. */
export function fits(node: StatNode, spool: ThreadSpool): boolean {
  return node.kind === 'fixed' ? node.stat === spool.main.stat : node.stats.includes(spool.main.stat);
}

/** The slots of a layout that take this spool, in slot order: one for most main stats, the three choice slots for a base stat in %. */
export function slotsFor(layout: MatrixLayout, spool: ThreadSpool): SlotIndex[] {
  return layout.flatMap((node, i) => (fits(node, spool) ? [i as SlotIndex] : []));
}

/** One of the six slots: its stat node and the spool in it, if any. */
export interface MatrixSlot {
  readonly index: SlotIndex;
  readonly node: StatNode;
  readonly spool: ThreadSpool | null;
}

/** Weaver Matrix: a value object of six slots. Every change returns a new matrix. */
export class WeaverMatrix {
  readonly slots: readonly MatrixSlot[];

  private constructor(slots: MatrixSlot[]) {
    this.slots = Object.freeze(slots.map((s) => Object.freeze(s)));
  }

  static empty(layout: MatrixLayout): WeaverMatrix {
    return new WeaverMatrix(layout.map((node, i) => ({ index: i as SlotIndex, node, spool: null })));
  }

  /** Puts a spool into a slot; returns the new matrix and the spool it displaced. */
  equip(index: SlotIndex, spool: ThreadSpool): { matrix: WeaverMatrix; removed: ThreadSpool | null } {
    if (!fits(this.slots[index].node, spool)) throw new Error(`slot ${index} does not take a ${spool.main.stat} spool`);
    return this.with(index, spool);
  }

  unequip(index: SlotIndex): { matrix: WeaverMatrix; removed: ThreadSpool | null } {
    return this.with(index, null);
  }

  /** The spools in the matrix, in slot order. */
  spools(): ThreadSpool[] {
    return this.slots.flatMap((s) => (s.spool ? [s.spool] : []));
  }

  private with(index: SlotIndex, spool: ThreadSpool | null) {
    const slots = this.slots.map((s) => (s.index === index ? { ...s, spool } : s));
    return { matrix: new WeaverMatrix(slots), removed: this.slots[index].spool };
  }
}

/** A Weave Pattern woven in a matrix, and how many times. */
export interface WovenPattern {
  readonly pattern: WeavePatternDef;
  /** 6 spools of a 2-piece pattern weave it 3 times; a 4-piece pattern at most once */
  readonly times: number;
}

/** Finds the woven patterns of a matrix: counts spools per pattern and never looks at their slots. Results follow catalog order. */
export class WeavePatternEvaluator {
  constructor(private readonly catalog: readonly WeavePatternDef[]) {}

  evaluate(matrix: WeaverMatrix): WovenPattern[] {
    const count = new Map<PatternId, number>();
    for (const s of matrix.spools()) {
      if (!this.catalog.some((p) => p.id === s.pattern)) throw new Error(`unknown weave pattern "${s.pattern}"`);
      count.set(s.pattern, (count.get(s.pattern) ?? 0) + 1);
    }
    return this.catalog
      .map((pattern) => ({ pattern, times: Math.floor((count.get(pattern.id) ?? 0) / pattern.pieces) }))
      .filter((w) => w.times > 0);
  }
}

/** The champion stats a choice slot is attuned to: those of the fixed slots beside it. */
export function attunedStats(matrix: WeaverMatrix, index: SlotIndex): StatId[] {
  if (matrix.slots[index].node.kind === 'fixed') return [];
  const out: StatId[] = [];
  for (const j of [(index + 5) % 6, (index + 1) % 6]) {
    const n = matrix.slots[j].node;
    if (n.kind === 'fixed') out.push(STAT_OF[n.stat]);
  }
  return out;
}

/** The value of a strand in its slot: +ATTUNE_BONUS when the slot is attuned to the stat it adds to. */
export function strandValue(matrix: WeaverMatrix, index: SlotIndex, strand: StatBonus): number {
  return strand.value + (attunedStats(matrix, index).includes(STAT_OF[strand.stat]) ? ATTUNE_BONUS : 0);
}

/** Everything a matrix's spools add, by spool stat: main stats, strands with attunement, SPD strands capped at SPD_STRAND_CAP. */
export function matrixBonus(matrix: WeaverMatrix): Record<SpoolStat, number> {
  const add = Object.fromEntries(SPOOL_STATS.map((s) => [s, 0])) as Record<SpoolStat, number>;
  let spdStrands = 0;
  for (const slot of matrix.slots) {
    if (!slot.spool) continue;
    add[slot.spool.main.stat] += slot.spool.main.value;
    for (const st of slot.spool.strands) {
      const v = strandValue(matrix, slot.index, st);
      if (st.stat === 'spd') spdStrands += v;
      else add[st.stat] += v;
    }
  }
  add.spd += Math.min(SPD_STRAND_CAP, spdStrands);
  return add;
}

/**
 * A champion's stats with its matrix: the spools' percents and the woven
 * patterns' fractions of the base, then the flat additions; critical rate and
 * damage by points; ACC and RES flat.
 */
export function wovenStats(base: Stats, matrix: WeaverMatrix, patterns: readonly WeavePatternDef[] = CORE_WEAVE_PATTERNS): Stats {
  const b = matrixBonus(matrix);
  const woven = Object.fromEntries(Object.keys(base).map((k) => [k, 0])) as Record<StatId, number>;
  for (const w of new WeavePatternEvaluator(patterns).evaluate(matrix)) woven[w.pattern.bonus.stat] += w.pattern.bonus.value * w.times;
  const pct = (k: 'hp' | 'atk' | 'def', p: number, flat: number) => Math.round(base[k] * (1 + p / 100 + woven[k]) + flat);
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return {
    hp: pct('hp', b.hpPct, b.hp),
    atk: pct('atk', b.atkPct, b.atk),
    def: pct('def', b.defPct, b.def),
    spd: base.spd + b.spd + Math.round(base.spd * woven.spd),
    crit: r3(base.crit + b.crit / 100 + woven.crit),
    critDmg: r3(base.critDmg + b.critDmg / 100 + woven.critDmg),
    acc: base.acc + b.acc + woven.acc,
    res: base.res + b.res + woven.res,
  };
}
