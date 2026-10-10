// The Master Archivist: the player, and the save that remembers them. Stage
// stars, the last team, Academy chapters read and settings live here; the
// champions owned, with their Weaver Matrices, live in the Reliquary. Stored
// in localStorage; every access is guarded because storage can be missing
// (private windows) and the game must still run.
import { LOCATIONS, STARTERS, allStages, stage } from './data/campaign';
import { champion, CHAMPIONS } from './data/champions';
import { MATRIX_LAYOUT } from './data/matrix';
import { LocationDef, Stats } from './data/types';
import { wovenStats } from './reliquary/matrix';
import { Reliquary, ReliquaryJson } from './reliquary/reliquary';

export interface MasterArchivist {
  /** best stars per stage id, 1..3 (missing = never cleared) */
  stars: Record<string, number>;
  /** last team used, in formation order */
  team: string[];
  /** Academy chapters read */
  read: string[];
  settings: { speed: 1 | 2 | 3; auto: boolean };
  /** the champions owned (starters included) and their Weaver Matrices */
  reliquary: Reliquary;
}

/** The save as stored under `KEY`. */
interface SaveJson {
  version: 3;
  stars: Record<string, number>;
  team: string[];
  read: string[];
  settings: MasterArchivist['settings'];
  reliquary: ReliquaryJson;
}

/**
 * An older save: version 2 (the game before Jakub's own content replaced the
 * proof of concept's) or version 1 (the proof of concept, "Oathbound"). The
 * champions and stages they hold no longer exist, so only the settings and
 * the Academy chapters read carry over, once.
 */
interface OldSaveJson {
  version: 1 | 2;
  read: string[];
  settings: MasterArchivist['settings'];
}

const KEY = 'tlrol.save.v3';
/** Older saves, newest first. */
const OLD_KEYS = ['tlrol.save.v2', 'oathbound.profile.v1'];

export function newArchivist(): MasterArchivist {
  const reliquary = new Reliquary(MATRIX_LAYOUT);
  for (const id of STARTERS) reliquary.recruit(id, false);
  return { stars: {}, team: [...STARTERS], read: [], settings: { speed: 1, auto: false }, reliquary };
}

/**
 * The archivist from stored text: the current save, else an older save (its
 * settings and reading on a new game), else a new game. Ids the catalog no
 * longer has are dropped, every starter has its soul file and every cleared
 * stage has brought its champion.
 */
export function readSave(raw: string | null, rawOld: string | null = null): MasterArchivist {
  const a = newArchivist();
  try {
    if (raw) {
      const s = JSON.parse(raw) as Partial<SaveJson>;
      if (s.version !== 3) return a;
      a.reliquary = Reliquary.fromJSON(s.reliquary ?? {}, MATRIX_LAYOUT);
      a.stars = { ...s.stars };
      if (Array.isArray(s.team)) a.team = [...s.team];
      keepHabits(a, s);
    } else if (rawOld) {
      const s = JSON.parse(rawOld) as Partial<OldSaveJson>;
      if (s.version !== 1 && s.version !== 2) return a;
      keepHabits(a, s);
    }
  } catch {
    return newArchivist(); // unreadable save: a new game
  }
  return validated(a);
}

/** The Academy chapters read and the settings, over the defaults. */
function keepHabits(a: MasterArchivist, s: Partial<Pick<SaveJson, 'read' | 'settings'>>) {
  if (Array.isArray(s.read)) a.read = [...s.read];
  a.settings = { ...a.settings, ...s.settings };
}

/**
 * Drops ids the catalog no longer has (renamed or removed content), gives
 * every starter its soul file and every cleared stage's champion its own, so
 * a save survives stages that change what they bring.
 */
function validated(a: MasterArchivist): MasterArchivist {
  const champions = new Set(CHAMPIONS.map((c) => c.id));
  const stages = new Set(allStages().map((s) => s.id));
  a.reliquary.keepOnly((id) => champions.has(id));
  for (const id of Object.keys(a.stars)) if (!stages.has(id)) delete a.stars[id];
  for (const id of STARTERS) a.reliquary.recruit(id, false);
  for (const s of allStages()) if (s.recruit && cleared(a, s.id)) a.reliquary.recruit(s.recruit, false);
  a.team = a.team.filter((id) => a.reliquary.has(id));
  return a;
}

export function loadArchivist(): MasterArchivist {
  let raw: string | null = null;
  let rawOld: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) rawOld = OLD_KEYS.map((k) => localStorage.getItem(k)).find((v) => v) ?? null;
  } catch {
    // storage unavailable: a new game for this session
  }
  const a = readSave(raw, rawOld);
  // an older save is read once; its entry is left as it was
  if (!raw && rawOld) saveArchivist(a);
  return a;
}

/** The archivist as stored text. */
export function writeSave(a: MasterArchivist): string {
  const s: SaveJson = { version: 3, stars: a.stars, team: a.team, read: a.read, settings: a.settings, reliquary: a.reliquary.toJSON() };
  return JSON.stringify(s);
}

export function saveArchivist(a: MasterArchivist) {
  try {
    localStorage.setItem(KEY, writeSave(a));
  } catch {
    // storage unavailable: progress lives for this session only
  }
}

export function isUnlocked(a: MasterArchivist, id: string): boolean {
  return a.reliquary.has(id);
}

/** Recruited and not opened on the champion page yet: the NEW badge. */
export function isFresh(a: MasterArchivist, id: string): boolean {
  return a.reliquary.has(id) && a.reliquary.file(id).fresh;
}

/** Whether any champion still shows its NEW badge. */
export function anyFresh(a: MasterArchivist): boolean {
  return a.reliquary.files().some((f) => f.fresh);
}

/** A champion's stats in battle: with its Weaver Matrix when owned, its base stats otherwise. */
export function battleStats(a: MasterArchivist, id: string): Stats {
  const base = champion(id).stats;
  return a.reliquary.has(id) ? wovenStats(base, a.reliquary.file(id).matrix) : base;
}

export function roster(a: MasterArchivist): string[] {
  return CHAMPIONS.filter((c) => isUnlocked(a, c.id)).map((c) => c.id);
}

export function cleared(a: MasterArchivist, stageId: string): boolean {
  return (a.stars[stageId] ?? 0) > 0;
}

export function locationOpen(a: MasterArchivist, loc: LocationDef): boolean {
  return !loc.requires || cleared(a, loc.requires);
}

/** A stage is playable when its location is open and the previous stage there is cleared. */
export function stageOpen(a: MasterArchivist, stageId: string): boolean {
  for (const loc of LOCATIONS) {
    const i = loc.stages.findIndex((s) => s.id === stageId);
    if (i < 0) continue;
    if (!locationOpen(a, loc)) return false;
    return i === 0 || cleared(a, loc.stages[i - 1].id);
  }
  return false;
}

/** The newest playable stage (where the campaign map focuses). */
export function frontier(a: MasterArchivist): string {
  const open = allStages().filter((s) => stageOpen(a, s.id));
  const uncleared = open.filter((s) => !cleared(a, s.id));
  return (uncleared[0] ?? open[open.length - 1]).id;
}

/** Records a victory. Returns the champion recruited by a first clear, if any. */
export function recordClear(a: MasterArchivist, stageId: string, stars: number): string | undefined {
  const first = !cleared(a, stageId);
  a.stars[stageId] = Math.max(a.stars[stageId] ?? 0, stars);
  const r = stage(stageId).recruit;
  let recruited: string | undefined;
  if (first && r && !isUnlocked(a, r)) {
    a.reliquary.recruit(r);
    recruited = r;
  }
  saveArchivist(a);
  return recruited;
}

export function totalStars(a: MasterArchivist): number {
  return Object.values(a.stars).reduce((x, y) => x + y, 0);
}

/** Demo helper: everything recruited and every stage cleared with one star. */
export function unlockEverything(a: MasterArchivist) {
  for (const c of CHAMPIONS) a.reliquary.recruit(c.id, false);
  for (const s of allStages()) a.stars[s.id] = Math.max(a.stars[s.id] ?? 0, 1);
  saveArchivist(a);
}
