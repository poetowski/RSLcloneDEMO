// The Reliquary: every champion the Master Archivist owns, as a Hero Soul
// File with its Weaver Matrix, and every loose Thread Spool (the stock, shown
// in Weaving). It is the aggregate root and the only writer of both, so a
// spool is always in exactly one place: the stock or one slot. Terms and
// invariants: docs/DDD.md 2.6, 4.7, 6.5.
import { MatrixLayout, PatternId, SpoolStat } from '../data/types';
import { fits, Grade, sameSpool, SlotIndex, threadSpool, ThreadSpool, WeaverMatrix } from './matrix';

/** Hero Soul File: an entity, one champion's record in the Reliquary. Identity: the champion id. */
export interface HeroSoulFile {
  /** the ChampionDef it records; one file per champion */
  readonly champion: string;
  readonly matrix: WeaverMatrix;
  /** recruited and not opened on the champion page yet (the NEW badge) */
  readonly fresh: boolean;
}

/** A loose spool in the stock, and whether it is a new find nobody has looked at yet (the NEW badge in Weaving). */
export interface StockEntry {
  readonly spool: ThreadSpool;
  readonly fresh: boolean;
}

/** The Reliquary as saved. Spools are kept by slot index, so a save outlives a change of the layout; a new find in the stock carries `fresh`. */
export interface ReliquaryJson {
  files: { champion: string; fresh: boolean; slots: (ThreadSpool | null)[] }[];
  stock: (ThreadSpool & { fresh?: boolean })[];
}

export class Reliquary {
  private readonly souls = new Map<string, HeroSoulFile>();
  private readonly stock: StockEntry[] = [];

  constructor(private readonly layout: MatrixLayout) {}

  /**
   * Rebuilds a saved Reliquary without losing a valid spool: each goes back
   * into its slot when the slot still takes it, otherwise into the stock.
   * Malformed entries are dropped, and so are spools of a pattern not in
   * `patterns` when it is given (the placeholder patterns, gone 2026-10-11).
   */
  static fromJSON(json: Partial<ReliquaryJson>, layout: MatrixLayout, patterns?: readonly PatternId[]): Reliquary {
    const r = new Reliquary(layout);
    const known = (raw: unknown) => !patterns || patterns.includes((raw as { pattern?: string } | null)?.pattern ?? '');
    for (const raw of json.stock ?? []) if (known(raw)) r.salvage(raw, undefined, (raw as { fresh?: unknown } | null)?.fresh === true);
    for (const f of json.files ?? []) {
      if (typeof f?.champion !== 'string') continue;
      const first = !r.souls.has(f.champion);
      if (first) r.recruit(f.champion, !!f.fresh);
      (f.slots ?? []).forEach((raw, i) => known(raw) && r.salvage(raw, first && i < 6 ? [f.champion, i as SlotIndex] : undefined));
    }
    return r;
  }

  toJSON(): ReliquaryJson {
    return {
      files: this.files().map((f) => ({ champion: f.champion, fresh: f.fresh, slots: f.matrix.slots.map((s) => s.spool) })),
      stock: this.stock.map((e) => (e.fresh ? { ...e.spool, fresh: true } : e.spool)),
    };
  }

  /** A first clear recruits a champion; a champion already here is left as it is. */
  recruit(champion: string, fresh = true): HeroSoulFile {
    const known = this.souls.get(champion);
    if (known) return known;
    const file: HeroSoulFile = Object.freeze({ champion, matrix: WeaverMatrix.empty(this.layout), fresh });
    this.souls.set(champion, file);
    return file;
  }

  has(champion: string): boolean {
    return this.souls.has(champion);
  }

  file(champion: string): HeroSoulFile {
    const f = this.souls.get(champion);
    if (!f) throw new Error(`no soul file for "${champion}"`);
    return f;
  }

  /** Every soul file, in the order the champions were recruited. */
  files(): HeroSoulFile[] {
    return [...this.souls.values()];
  }

  /** The champion page was opened: the NEW badge goes. Returns whether anything changed. */
  markSeen(champion: string): boolean {
    const f = this.souls.get(champion);
    if (!f?.fresh) return false;
    this.souls.set(champion, Object.freeze({ ...f, fresh: false }));
    return true;
  }

  /** Drops the soul files of champions the catalog no longer has; their spools go back to the stock. */
  keepOnly(known: (champion: string) => boolean) {
    for (const f of this.files()) {
      if (known(f.champion)) continue;
      for (const s of f.matrix.spools()) this.stow(s);
      this.souls.delete(f.champion);
    }
  }

  /** A spool comes into the stock; `fresh` marks a new find with the NEW badge. */
  addSpool(spool: ThreadSpool, fresh = false) {
    this.stow(spool, fresh);
  }

  /** Moves a spool from the stock into a slot; a displaced spool goes back to the stock. */
  equip(champion: string, index: SlotIndex, spool: ThreadSpool) {
    const at = this.stock.findIndex((e) => sameSpool(e.spool, spool));
    if (at < 0) throw new Error('that spool is not in the stock');
    const f = this.file(champion);
    const { matrix, removed } = f.matrix.equip(index, spool);
    this.stock.splice(at, 1);
    if (removed) this.stow(removed);
    this.replace(f, matrix);
  }

  /** Takes the spool out of a slot, back into the stock. */
  unequip(champion: string, index: SlotIndex) {
    const f = this.file(champion);
    const { matrix, removed } = f.matrix.unequip(index);
    if (removed) this.stow(removed);
    this.replace(f, matrix);
  }

  /** Unravels a loose spool: it leaves the Reliquary for good. A woven spool must be taken out first. */
  unravel(spool: ThreadSpool) {
    const at = this.stock.findIndex((e) => sameSpool(e.spool, spool));
    if (at < 0) throw new Error('that spool is not in the stock');
    this.stock.splice(at, 1);
  }

  /** The loose spools, in the order they came in. */
  spools(): ThreadSpool[] {
    return this.stock.map((e) => e.spool);
  }

  /** The loose spools with their NEW badges, in the order they came in. */
  entries(): readonly StockEntry[] {
    return this.stock;
  }

  /** How many loose spools still wear the NEW badge. */
  freshCount(): number {
    return this.stock.filter((e) => e.fresh).length;
  }

  /** The spool was looked at: every loose copy of it loses the NEW badge. Returns whether anything changed. */
  markSpoolSeen(spool: ThreadSpool): boolean {
    let changed = false;
    this.stock.forEach((e, i) => {
      if (!e.fresh || !sameSpool(e.spool, spool)) return;
      this.stock[i] = Object.freeze({ spool: e.spool, fresh: false });
      changed = true;
    });
    return changed;
  }

  /** Weaving was left: every NEW badge goes. Returns whether anything changed. */
  markStockSeen(): boolean {
    const changed = this.stock.some((e) => e.fresh);
    this.stock.forEach((e, i) => (this.stock[i] = e.fresh ? Object.freeze({ spool: e.spool, fresh: false }) : e));
    return changed;
  }

  /** Loading: a valid spool goes into its slot when the slot takes it, otherwise into the stock. */
  private salvage(raw: unknown, slot?: [string, SlotIndex], fresh = false) {
    const s = readSpool(raw);
    if (!s) return;
    if (!slot || !fits(this.file(slot[0]).matrix.slots[slot[1]].node, s)) {
      this.stow(s, fresh);
      return;
    }
    const f = this.file(slot[0]);
    const { matrix, removed } = f.matrix.equip(slot[1], s);
    if (removed) this.stow(removed);
    this.replace(f, matrix);
  }

  private stow(spool: ThreadSpool, fresh = false) {
    this.stock.push(Object.freeze({ spool, fresh }));
  }

  private replace(f: HeroSoulFile, matrix: WeaverMatrix) {
    this.souls.set(f.champion, Object.freeze({ ...f, matrix }));
  }
}

/** A spool from saved data, or null when it is malformed. */
function readSpool(raw: unknown): ThreadSpool | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as { pattern?: unknown; grade?: unknown; main?: { stat?: unknown }; strands?: { stat?: unknown; value?: unknown }[] };
  try {
    const strands = (s.strands ?? []).map((t) => [t.stat as SpoolStat, t.value as number] as const);
    return threadSpool(s.pattern as PatternId, s.grade as Grade, s.main?.stat as SpoolStat, strands);
  } catch {
    return null;
  }
}
