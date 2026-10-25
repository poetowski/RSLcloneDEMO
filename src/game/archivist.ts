// The Master Archivist: the player, and the save that remembers them. Stage
// stars, the last team, Academy chapters read, settings, the tutorial, its
// lessons and the Journey's claimed quests live here, and what summons
// champions: the Stardust found, the Soulstars merged from it and the wish
// made at the Wishing Star; the champions owned, with their Weaver Matrices,
// live in the Reliquary. Stored
// in localStorage; every access is guarded because storage can be missing
// (private windows) and the game must still run.
import { LOCATIONS, STARTERS, allStages, stage } from './data/campaign';
import { JOURNEY } from './data/challenges';
import { champion, CHAMPIONS } from './data/champions';
import { MATRIX_LAYOUT, PATTERN_IDS, SPOOL_STATS } from './data/matrix';
import { FACTIONS, ROLES } from './data/meta';
import { Wish } from './data/summoning';
import { LocationDef, Stats } from './data/types';
import { fragmentDrop, rollDrops } from './reliquary/drops';
import { Grade, rollSpool, sameSpool, ThreadSpool, wovenStats } from './reliquary/matrix';
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
  /** the tutorial: not played to its end yet, skipped, or done (the Journey's first quest) */
  tutorial: TutorialState;
  /** the Journey's quests claimed, in order */
  claimed: string[];
  /** Stardust found and not merged yet (the fragments) */
  fragments: number;
  /** Soulstars merged and not spent yet (the shards) */
  shards: number;
  /** the faction and the role wished for at the Wishing Star */
  wish: Wish;
  /** champions summoned so far */
  summons: number;
  /** the tutorial's later lessons shown to their end or closed ('summon': the first summon) */
  lessons: string[];
}

export type TutorialState = 'todo' | 'skipped' | 'done';

/** The save as stored under `KEY`. */
interface SaveJson {
  version: 3;
  stars: Record<string, number>;
  team: string[];
  read: string[];
  settings: MasterArchivist['settings'];
  reliquary: ReliquaryJson;
  /** since the tutorial and the Journey (2026-10-24); a save without them reads 'todo' and none claimed */
  tutorial?: TutorialState;
  claimed?: string[];
  /** since summoning (2026-10-25); a save without them holds none, wishes nothing and has seen no lesson */
  fragments?: number;
  shards?: number;
  wish?: Wish;
  summons?: number;
  lessons?: string[];
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
  return { stars: {}, team: [...STARTERS], read: [], settings: { speed: 1, auto: false }, reliquary, tutorial: 'todo', claimed: [], fragments: 0, shards: 0, wish: {}, summons: 0, lessons: [] };
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
      a.reliquary = Reliquary.fromJSON(s.reliquary ?? {}, MATRIX_LAYOUT, PATTERN_IDS);
      a.stars = { ...s.stars };
      if (Array.isArray(s.team)) a.team = [...s.team];
      if (s.tutorial === 'skipped' || s.tutorial === 'done') a.tutorial = s.tutorial;
      if (Array.isArray(s.claimed)) a.claimed = s.claimed.filter((id) => typeof id === 'string');
      a.fragments = count(s.fragments);
      a.shards = count(s.shards);
      a.summons = count(s.summons);
      if (s.wish && typeof s.wish === 'object') a.wish = { faction: s.wish.faction, role: s.wish.role };
      if (Array.isArray(s.lessons)) a.lessons = s.lessons.filter((id) => typeof id === 'string');
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

/** A saved count: a whole number, never below zero. */
function count(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
}

/**
 * Drops ids the catalog no longer has (renamed or removed content), gives
 * every starter its soul file and every cleared stage's champion its own, so
 * a save survives stages that change what they bring (since summoning only
 * 1-1 brings one; every champion a save already holds stays).
 */
function validated(a: MasterArchivist): MasterArchivist {
  const champions = new Set(CHAMPIONS.map((c) => c.id));
  const stages = new Set(allStages().map((s) => s.id));
  a.reliquary.keepOnly((id) => champions.has(id));
  for (const id of Object.keys(a.stars)) if (!stages.has(id)) delete a.stars[id];
  for (const id of STARTERS) a.reliquary.recruit(id, false);
  for (const s of allStages()) if (s.recruit && cleared(a, s.id)) a.reliquary.recruit(s.recruit, false);
  // a wish only names a faction and a role that exist
  if (!a.wish.faction || !(a.wish.faction in FACTIONS)) delete a.wish.faction;
  if (!a.wish.role || !(a.wish.role in ROLES)) delete a.wish.role;
  a.team = a.team.filter((id) => a.reliquary.has(id));
  // a save whose team is gone (champions renamed or removed) starts from the starters
  if (!a.team.length) a.team = [...STARTERS];
  // the Journey is claimed in order: its quests up to the first one not claimed (removed quests drop out)
  const claimed = new Set(a.claimed);
  const upTo = JOURNEY.findIndex((q) => !claimed.has(q.id));
  a.claimed = JOURNEY.slice(0, upTo < 0 ? JOURNEY.length : upTo).map((q) => q.id);
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
  const s: SaveJson = {
    version: 3, stars: a.stars, team: a.team, read: a.read, settings: a.settings, reliquary: a.reliquary.toJSON(), tutorial: a.tutorial, claimed: a.claimed,
    fragments: a.fragments, shards: a.shards, wish: a.wish, summons: a.summons, lessons: a.lessons,
  };
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

/** Records a clear without finding spools or Stardust (the ?progress deep link). Returns the champion recruited by a first clear, if any. */
export function recordClear(a: MasterArchivist, stageId: string, stars: number): string | undefined {
  const recruited = clear(a, stageId, stars);
  saveArchivist(a);
  return recruited;
}

/** What a campaign victory brought: the champion a first clear recruits (1-1's), the spools and the Stardust it found. */
export interface VictoryReward {
  recruited?: string;
  spools: ThreadSpool[];
  fragments: number;
}

/**
 * Records a campaign victory: its stars, the champion of a first clear, the
 * spools it finds (spools drop from every stage, Jakub, 2026-10-24), which
 * come into the stock with the NEW badge, and its Stardust (Jakub,
 * 2026-10-25: "campaign nodes drop these fragments").
 */
export function recordVictory(a: MasterArchivist, stageId: string, stars: number, rng: () => number = Math.random): VictoryReward {
  const recruited = clear(a, stageId, stars);
  const spools = rollDrops(stageId, stars, rng);
  for (const s of spools) a.reliquary.addSpool(s, true);
  const fragments = fragmentDrop(stageId, stars);
  a.fragments += fragments;
  saveArchivist(a);
  return { recruited, spools, fragments };
}

/** Stars and the first-clear recruit, without saving. */
function clear(a: MasterArchivist, stageId: string, stars: number): string | undefined {
  const first = !cleared(a, stageId);
  a.stars[stageId] = Math.max(a.stars[stageId] ?? 0, stars);
  const r = stage(stageId).recruit;
  if (first && r && !isUnlocked(a, r)) {
    a.reliquary.recruit(r);
    return r;
  }
  return undefined;
}

/** Every spool the archivist holds: loose in the stock and woven in a matrix. */
export function spoolsHeld(a: MasterArchivist): number {
  return a.reliquary.spools().length + a.reliquary.files().reduce((n, f) => n + f.matrix.spools().length, 0);
}

/**
 * Development and screenshots (?spools=1): 24 sample spools, every pattern in
 * turn. A sample spool the archivist already holds, loose or woven, is not
 * added again, so the link can be opened any number of times.
 */
export function stockSample(a: MasterArchivist) {
  let seed = 11;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const sample = Array.from({ length: 24 }, (_, i) => rollSpool(PATTERN_IDS[i % PATTERN_IDS.length], (i % 3) as Grade, SPOOL_STATS[(i * 5) % SPOOL_STATS.length], rnd));
  const held = [...a.reliquary.spools(), ...a.reliquary.files().flatMap((f) => f.matrix.spools())];
  for (const s of sample) {
    const i = held.findIndex((h) => sameSpool(h, s));
    if (i >= 0) held.splice(i, 1);
    else a.reliquary.addSpool(s);
  }
}

export function totalStars(a: MasterArchivist): number {
  return Object.values(a.stars).reduce((x, y) => x + y, 0);
}

/** A new account: the tutorial starts on its own while it was neither finished nor skipped and no stage is cleared yet. */
export function tutorialDue(a: MasterArchivist): boolean {
  return a.tutorial === 'todo' && totalStars(a) === 0;
}

/** Demo helper: everything recruited and every stage cleared with one star. */
export function unlockEverything(a: MasterArchivist) {
  for (const c of CHAMPIONS) a.reliquary.recruit(c.id, false);
  for (const s of allStages()) a.stars[s.id] = Math.max(a.stars[s.id] ?? 0, 1);
  saveArchivist(a);
}
