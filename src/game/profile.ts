// The player's save data: recruited champions, stage stars, last team and
// settings. Stored in localStorage; every access is guarded because storage
// can be missing (private windows) and the game must still run.
import { LOCATIONS, STARTERS, allStages, stage } from './data/campaign';
import { CHAMPIONS } from './data/champions';
import { LocationDef } from './data/types';

export interface Profile {
  version: 1;
  /** recruited champions (starters are implied) */
  unlocked: string[];
  /** best stars per stage id, 1..3 (missing = never cleared) */
  stars: Record<string, number>;
  /** last team used, in formation order */
  team: string[];
  /** recruited champions not yet opened in the collection */
  fresh: string[];
  /** Academy chapters read */
  read: string[];
  settings: { speed: 1 | 2 | 3; auto: boolean };
}

const KEY = 'oathbound.profile.v1';

export function defaultProfile(): Profile {
  return { version: 1, unlocked: [], stars: {}, team: [...STARTERS], fresh: [], read: [], settings: { speed: 1, auto: false } };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const p = JSON.parse(raw) as Profile;
    if (p.version !== 1) return defaultProfile();
    return { ...defaultProfile(), ...p, settings: { ...defaultProfile().settings, ...p.settings } };
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage unavailable: progress lives for this session only
  }
}

export function isUnlocked(p: Profile, id: string): boolean {
  return STARTERS.includes(id) || p.unlocked.includes(id);
}

export function roster(p: Profile): string[] {
  return CHAMPIONS.filter((c) => isUnlocked(p, c.id)).map((c) => c.id);
}

export function cleared(p: Profile, stageId: string): boolean {
  return (p.stars[stageId] ?? 0) > 0;
}

export function locationOpen(p: Profile, loc: LocationDef): boolean {
  return !loc.requires || cleared(p, loc.requires);
}

/** A stage is playable when its location is open and the previous stage there is cleared. */
export function stageOpen(p: Profile, stageId: string): boolean {
  for (const loc of LOCATIONS) {
    const i = loc.stages.findIndex((s) => s.id === stageId);
    if (i < 0) continue;
    if (!locationOpen(p, loc)) return false;
    return i === 0 || cleared(p, loc.stages[i - 1].id);
  }
  return false;
}

/** The newest playable stage (where the campaign map focuses). */
export function frontier(p: Profile): string {
  const open = allStages().filter((s) => stageOpen(p, s.id));
  const uncleared = open.filter((s) => !cleared(p, s.id));
  return (uncleared[0] ?? open[open.length - 1]).id;
}

/** Records a victory. Returns the champion recruited by a first clear, if any. */
export function recordClear(p: Profile, stageId: string, stars: number): string | undefined {
  const first = !cleared(p, stageId);
  p.stars[stageId] = Math.max(p.stars[stageId] ?? 0, stars);
  const r = stage(stageId).recruit;
  let recruited: string | undefined;
  if (first && r && !isUnlocked(p, r)) {
    p.unlocked.push(r);
    p.fresh.push(r);
    recruited = r;
  }
  saveProfile(p);
  return recruited;
}

export function totalStars(p: Profile): number {
  return Object.values(p.stars).reduce((a, b) => a + b, 0);
}

/** Demo helper: everything recruited and every stage cleared with one star. */
export function unlockEverything(p: Profile) {
  for (const c of CHAMPIONS) if (!isUnlocked(p, c.id)) p.unlocked.push(c.id);
  for (const s of allStages()) p.stars[s.id] = Math.max(p.stars[s.id] ?? 0, 1);
  saveProfile(p);
}
