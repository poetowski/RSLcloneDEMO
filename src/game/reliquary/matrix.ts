// The Weaver Matrix: six slots in a hexagon, each with a stat node, holding
// Thread Spools. A spool is a value and so is a matrix: every change returns
// a new matrix. Weave Patterns count spools over the whole matrix; where a
// spool sits never matters. Terms and invariants: docs/DDD.md 2.6, 4.7, 6.5.
import { STAT_IDS } from '../data/matrix';
import { MatrixLayout, PatternId, StatId, StatNode, WeavePatternDef } from '../data/types';

export type SlotIndex = 0 | 1 | 2 | 3 | 4 | 5;

/** One stat a spool carries. */
export interface StatBonus {
  readonly stat: StatId;
  readonly value: number;
}

/** Thread Spool: a value object. No identity, equal when its fields are equal, never changed in place. */
export interface ThreadSpool {
  /** the Weave Pattern it counts toward */
  readonly pattern: PatternId;
  /** its main stat, which decides the slots it fits */
  readonly main: StatBonus;
}

/** Makes a spool; throws on an empty pattern, an unknown stat or a value that is not positive. */
export function threadSpool(pattern: PatternId, stat: StatId, value: number): ThreadSpool {
  if (typeof pattern !== 'string' || !pattern) throw new Error(`a spool needs a pattern, got ${String(pattern)}`);
  if (!STAT_IDS.includes(stat)) throw new Error(`unknown stat "${String(stat)}"`);
  if (!(value > 0) || !Number.isFinite(value)) throw new Error(`a spool's ${stat} must be positive, got ${value}`);
  return Object.freeze({ pattern, main: Object.freeze({ stat, value }) });
}

export function sameSpool(a: ThreadSpool, b: ThreadSpool): boolean {
  return a.pattern === b.pattern && a.main.stat === b.main.stat && a.main.value === b.main.value;
}

/** Whether a slot's stat node takes this spool. */
export function fits(node: StatNode, spool: ThreadSpool): boolean {
  return node.kind === 'fixed' ? node.stat === spool.main.stat : node.stats.includes(spool.main.stat);
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
