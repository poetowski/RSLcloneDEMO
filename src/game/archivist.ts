// The Master Archivist: the player, and the save that remembers them. Stage
// stars, the last team, Academy chapters read and settings live here; the
// champions owned, with their Weaver Matrices, live in the Reliquary. Stored
// in localStorage; every access is guarded because storage can be missing
// (private windows) and the game must still run.
import { LOCATIONS, STARTERS, allStages, stage } from './data/campaign';
import { CHAMPIONS } from './data/champions';
import { MATRIX_LAYOUT } from './data/matrix';
import { LocationDef } from './data/types';
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
  version: 2;
  stars: Record<string, number>;
  team: string[];
  read: string[];
  settings: MasterArchivist['settings'];
  reliquary: ReliquaryJson;
}

/** The proof of concept's save ("Oathbound"), read once and migrated. */
interface SaveJsonV1 {
  version: 1;
  /** recruited champions (the starters were implied) */
  unlocked: string[];
  stars: Record<string, number>;
  team: string[];
  fresh: string[];
  read: string[];
  settings: MasterArchivist['settings'];
}

const KEY = 'tlrol.save.v2';
const KEY_V1 = 'oathbound.profile.v1';

export function newArchivist(): MasterArchivist {
  const reliquary = new Reliquary(MATRIX_LAYOUT);
  for (const id of STARTERS) reliquary.recruit(id, false);
  return { stars: {}, team: [...STARTERS], read: [], settings: { speed: 1, auto: false }, reliquary };
}

/**
 * The archivist from stored text: the current save, else a version 1 save
 * (migrated), else a new game. Ids the catalog no longer has are dropped, and
 * every starter has its soul file.
 */
export function readSave(raw: string | null, rawV1: string | null = null): MasterArchivist {
  const a = newArchivist();
  try {
    if (raw) {
      const s = JSON.parse(raw) as Partial<SaveJson>;
      if (s.version !== 2) return a;
      a.reliquary = Reliquary.fromJSON(s.reliquary ?? {}, MATRIX_LAYOUT);
      copy(a, s);
    } else if (rawV1) {
      const s = JSON.parse(rawV1) as Partial<SaveJsonV1>;
      if (s.version !== 1) return a;
      for (const id of s.unlocked ?? []) a.reliquary.recruit(id, (s.fresh ?? []).includes(id));
      copy(a, s);
    }
  } catch {
    return newArchivist(); // unreadable save: a new game
  }
  return validated(a);
}

/** The fields both save versions share, over the defaults. */
function copy(a: MasterArchivist, s: Partial<Pick<SaveJson, 'stars' | 'team' | 'read' | 'settings'>>) {
  a.stars = { ...s.stars };
  if (Array.isArray(s.team)) a.team = [...s.team];
  if (Array.isArray(s.read)) a.read = [...s.read];
  a.settings = { ...a.settings, ...s.settings };
}

/** Drops ids the catalog no longer has (renamed or removed content) and gives every starter its soul file. */
function validated(a: MasterArchivist): MasterArchivist {
  const champions = new Set(CHAMPIONS.map((c) => c.id));
  const stages = new Set(allStages().map((s) => s.id));
  a.reliquary.keepOnly((id) => champions.has(id));
  for (const id of STARTERS) a.reliquary.recruit(id, false);
  a.team = a.team.filter((id) => a.reliquary.has(id));
  for (const id of Object.keys(a.stars)) if (!stages.has(id)) delete a.stars[id];
  return a;
}

export function loadArchivist(): MasterArchivist {
  let raw: string | null = null;
  let rawV1: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) rawV1 = localStorage.getItem(KEY_V1);
  } catch {
    // storage unavailable: a new game for this session
  }
  const a = readSave(raw, rawV1);
  // a version 1 save is migrated once; the old entry is left as it was
  if (!raw && rawV1) saveArchivist(a);
  return a;
}

/** The archivist as stored text. */
export function writeSave(a: MasterArchivist): string {
  const s: SaveJson = { version: 2, stars: a.stars, team: a.team, read: a.read, settings: a.settings, reliquary: a.reliquary.toJSON() };
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
