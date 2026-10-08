// The Reliquary: every champion the Master Archivist owns, as a Hero Soul
// File with its Weaver Matrix, and every loose Thread Spool (the stock). It is
// the aggregate root and the only writer of both, so a spool is always in
// exactly one place: the stock or one slot. Terms and invariants:
// docs/DDD.md 2.6, 4.7, 6.5.
import { MatrixLayout, PatternId, StatId } from '../data/types';
import { fits, sameSpool, SlotIndex, threadSpool, ThreadSpool, WeaverMatrix } from './matrix';

/** Hero Soul File: an entity, one champion's record in the Reliquary. Identity: the champion id. */
export interface HeroSoulFile {
  /** the ChampionDef it records; one file per champion */
  readonly champion: string;
  readonly matrix: WeaverMatrix;
  /** recruited and not opened on the champion page yet (the NEW badge) */
  readonly fresh: boolean;
}

/** The Reliquary as saved. Spools are kept by slot index, so a save outlives a change of the layout. */
export interface ReliquaryJson {
  files: { champion: string; fresh: boolean; slots: (ThreadSpool | null)[] }[];
  stock: ThreadSpool[];
}

export class Reliquary {
  private readonly souls = new Map<string, HeroSoulFile>();
  private readonly stock: ThreadSpool[] = [];

  constructor(private readonly layout: MatrixLayout) {}

  /**
   * Rebuilds a saved Reliquary without losing a valid spool: each goes back
   * into its slot when the slot still takes it, otherwise into the stock.
   * Malformed entries are dropped.
   */
  static fromJSON(json: Partial<ReliquaryJson>, layout: MatrixLayout): Reliquary {
    const r = new Reliquary(layout);
    for (const raw of json.stock ?? []) r.salvage(raw);
    for (const f of json.files ?? []) {
      if (typeof f?.champion !== 'string') continue;
      const first = !r.souls.has(f.champion);
      if (first) r.recruit(f.champion, !!f.fresh);
      (f.slots ?? []).forEach((raw, i) => r.salvage(raw, first && i < 6 ? [f.champion, i as SlotIndex] : undefined));
    }
    return r;
  }

  toJSON(): ReliquaryJson {
    return {
      files: this.files().map((f) => ({ champion: f.champion, fresh: f.fresh, slots: f.matrix.slots.map((s) => s.spool) })),
      stock: [...this.stock],
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
      this.stock.push(...f.matrix.spools());
      this.souls.delete(f.champion);
    }
  }

  addSpool(spool: ThreadSpool) {
    this.stock.push(spool);
  }

  /** Moves a spool from the stock into a slot; a displaced spool goes back to the stock. */
  equip(champion: string, index: SlotIndex, spool: ThreadSpool) {
    const at = this.stock.findIndex((s) => sameSpool(s, spool));
    if (at < 0) throw new Error('that spool is not in the stock');
    const f = this.file(champion);
    const { matrix, removed } = f.matrix.equip(index, spool);
    this.stock.splice(at, 1);
    if (removed) this.stock.push(removed);
    this.replace(f, matrix);
  }

  /** Takes the spool out of a slot, back into the stock. */
  unequip(champion: string, index: SlotIndex) {
    const f = this.file(champion);
    const { matrix, removed } = f.matrix.unequip(index);
    if (removed) this.stock.push(removed);
    this.replace(f, matrix);
  }

  /** The loose spools. */
  spools(): readonly ThreadSpool[] {
    return this.stock;
  }

  /** Loading: a valid spool goes into its slot when the slot takes it, otherwise into the stock. */
  private salvage(raw: unknown, slot?: [string, SlotIndex]) {
    const s = readSpool(raw);
    if (!s) return;
    if (!slot || !fits(this.file(slot[0]).matrix.slots[slot[1]].node, s)) {
      this.stock.push(s);
      return;
    }
    const f = this.file(slot[0]);
    const { matrix, removed } = f.matrix.equip(slot[1], s);
    if (removed) this.stock.push(removed);
    this.replace(f, matrix);
  }

  private replace(f: HeroSoulFile, matrix: WeaverMatrix) {
    this.souls.set(f.champion, Object.freeze({ ...f, matrix }));
  }
}

/** A spool from saved data, or null when it is malformed. */
function readSpool(raw: unknown): ThreadSpool | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as { pattern?: unknown; main?: { stat?: unknown; value?: unknown } };
  try {
    return threadSpool(s.pattern as PatternId, s.main?.stat as StatId, s.main?.value as number);
  } catch {
    return null;
  }
}
