// The campaign: locations (one combat background each) holding stages.
// Clearing a stage for the first time recruits its champion; clearing the
// last stage of a location opens the next one. Difficulty is tuned with
// `npm run balance` (see docs/MECHANICS_GUIDE.md, "Difficulty curve").
import { LocationDef, StageDef } from './types';

/**
 * The campaign world map in pixels: three screens wide, two tall. Stage and
 * location `map` positions are in this space; `overview` is how many times
 * smaller the whole-world overview is drawn.
 */
export const WORLD_MAP = { w: 1920, h: 720, overview: 3 };

/** Champions the player owns from the start. */
export const STARTERS = ['knight', 'warrior', 'archer'];

export const LOCATIONS: LocationDef[] = [
  {
    id: 'frostfang',
    chapter: 'I',
    name: 'Frostfang Ruins',
    zone: 'frostfang',
    blurb: 'A temple of the old Oath, swallowed by ice. The Frostfang Coven holds its broken halls.',
    map: { x: 534, y: 140 },
    stages: [
      {
        id: '1-1',
        name: 'The Frozen Gate',
        blurb: 'Two Coven sentries guard the outer gate. Break through before the alarm spreads.',
        enemies: [{ champion: 'monk' }, { champion: 'frostmage' }],
        power: 0.85,
        recruit: 'monk',
        map: { x: 450, y: 232 },
      },
      {
        id: '1-2',
        name: 'Hall of Icicles',
        blurb: 'The witch Ysolde waits in the hall of a thousand icicles, with the dread knight at her side.',
        enemies: [{ champion: 'dreadknight' }, { champion: 'monk' }, { champion: 'frostmage' }],
        power: 0.92,
        recruit: 'frostmage',
        map: { x: 654, y: 192 },
      },
      {
        id: '1-3',
        name: 'Throne of the Dread Knight',
        blurb: 'Vorhaal sits on the frozen throne of the Order he betrayed. End his watch.',
        enemies: [{ champion: 'dreadknight', boss: true }, { champion: 'monk' }, { champion: 'frostmage' }],
        power: 0.95,
        recruit: 'dreadknight',
        map: { x: 786, y: 124 },
      },
    ],
  },
  {
    id: 'sunscar',
    chapter: 'II',
    name: 'Sunscar Ruins',
    zone: 'sunscar',
    blurb: 'The necropolis of the sun kings rises from the dunes. Something under the sand is waking.',
    requires: '1-3',
    map: { x: 1356, y: 428 },
    stages: [
      {
        id: '2-1',
        name: 'Dunes of Ash',
        blurb: 'Tomb raiders vanish in these dunes. Find out who has been taking them.',
        enemies: [{ champion: 'jackal' }, { champion: 'stalker' }],
        power: 1.35,
        recruit: 'stalker',
        map: { x: 1212, y: 504 },
      },
      {
        id: '2-2',
        name: 'The Sunken Colonnade',
        blurb: 'Half the colonnade is buried. The jackal-masked warden and two stalkers guard what is left.',
        enemies: [{ champion: 'jackal' }, { champion: 'stalker' }, { champion: 'stalker' }],
        power: 0.88,
        recruit: 'jackal',
        map: { x: 1398, y: 540 },
      },
      {
        id: '2-3',
        name: 'Temple of the Burning Sun',
        blurb: 'Nefret sings the dawn hymn at the sun altar. Her light burns the unworthy.',
        enemies: [{ champion: 'jackal' }, { champion: 'priestess' }, { champion: 'stalker' }],
        power: 0.9,
        recruit: 'priestess',
        map: { x: 1560, y: 472 },
      },
      {
        id: '2-4',
        name: 'Tomb of Anhotep',
        blurb: 'The god-king wakes. Seal the tomb again, if anything can.',
        enemies: [{ champion: 'tomblord', boss: true }, { champion: 'jackal' }, { champion: 'priestess' }],
        power: 0.8,
        recruit: 'tomblord',
        map: { x: 1698, y: 392 },
      },
    ],
  },
  {
    id: 'nyota',
    chapter: 'III',
    name: 'Nyota Highlands',
    zone: 'nyota',
    blurb: 'Above the desert rises the high plateau of the Free City of Nyota, where star-smiths forge with fallen starlight. Its guardians test everyone who climbs.',
    requires: '2-4',
    map: { x: 1422, y: 176 },
    stages: [
      {
        id: '3-1',
        name: 'The Baobab Steps',
        blurb: 'The stair-road winds up the escarpment between baobabs older than the Oath. The Spear Guard bars the way.',
        enemies: [{ champion: 'sunspear' }, { champion: 'starsinger' }],
        power: 1.35,
        recruit: 'sunspear',
        map: { x: 1578, y: 304 },
      },
      {
        id: '3-2',
        name: 'The Hall of Echoes',
        blurb: "In the singing hall the griots keep the city's memory in light and sound. They will not hand it to strangers.",
        enemies: [{ champion: 'sunspear' }, { champion: 'starsinger' }, { champion: 'starsinger' }],
        power: 0.98,
        recruit: 'starsinger',
        map: { x: 1704, y: 224 },
      },
      {
        id: '3-3',
        name: 'Heart of the Skyforge',
        blurb: 'Mwamba, the guardian of the forge, wakes from its thousand-year watch. Prove you are worthy of its fire.',
        enemies: [{ champion: 'colossus', boss: true }, { champion: 'sunspear' }, { champion: 'starsinger' }],
        power: 0.85,
        recruit: 'colossus',
        map: { x: 1812, y: 140 },
      },
    ],
  },
];

export function allStages(): StageDef[] {
  return LOCATIONS.flatMap((l) => l.stages);
}

export function stage(id: string): StageDef {
  const s = allStages().find((x) => x.id === id);
  if (!s) throw new Error(`unknown stage "${id}"`);
  return s;
}

export function locationOf(stageId: string): LocationDef {
  const l = LOCATIONS.find((x) => x.stages.some((s) => s.id === stageId));
  if (!l) throw new Error(`no location for stage "${stageId}"`);
  return l;
}

/** The stage whose first clear recruits this champion (undefined for starters). */
export function recruitStage(championId: string): StageDef | undefined {
  return allStages().find((s) => s.recruit === championId);
}

/** Bosses take this many times their stage HP. */
export const BOSS_HP = 1.6;
