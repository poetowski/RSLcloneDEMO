// The campaign: locations (one combat background each) holding stages, in a
// line the player crosses from left to right. Clearing a stage for the first
// time opens the next one and can bring a new champion; clearing the last
// stage of a location opens the next location. Difficulty is tuned with
// `npm run balance` (see docs/MECHANICS_GUIDE.md, "Difficulty curve").
//
// Zone 1, the Fracture Reach, follows Jakub's working notes
// (docs/DESIGN_DECISIONS.md section 5): ten stages in the arc contact, the
// settlement, escalation, the turning point and leaving. The notes are not locked. Stages have no
// names; their texts quote the notes; the enemies are copies of the two
// champions that exist, standing in for the warriors of both worlds until
// enemies are designed. Zone 2, the Verdant Grove, is a node on the map whose
// stages wait for him. Both names are his (2026-10-11).
import { LocationDef, StageDef } from './types';

/**
 * The campaign world map in pixels: one screen tall and a screen and a half
 * wide, scrolled sideways. Location `map` positions (the campaign nodes) are in
 * this space; `overview` is how many times smaller the whole-world overview is
 * drawn. The map grows east area by area: a new area widens it by its stretch,
 * and everything west of the stretch keeps its pixels (tools/art/map.ts).
 */
export const WORLD_MAP = { w: 960, h: 360, overview: 2 };

/** Champions the player owns from the start. */
export const STARTERS = ['captain_gareth'];

const CONTACT = 'Azure Crown and Sanguine Dominion warriors meet where they should not be able to.';
const SETTLEMENT = 'The settlement and its surroundings.';
const ESCALATION = 'Two worlds in one place draw more through, or trigger a larger engagement.';

export const LOCATIONS: LocationDef[] = [
  {
    id: 'zone1',
    chapter: 'I',
    name: 'Fracture Reach',
    zone: 'zone1',
    blurb: 'A farming settlement in the reach of the rift, under an open sky. The broken loom has connected warriors from two worlds here, the Azure Crown and the Sanguine Dominion, who would never meet naturally.',
    map: { x: 322, y: 198 },
    stages: [
      {
        id: '1-1',
        blurb: `${CONTACT} The first battle.`,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'captain_gareth' }],
        power: 0.48,
        recruit: 'rime_scholar',
      },
      {
        id: '1-2',
        blurb: CONTACT,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'rime_scholar' }],
        power: 0.81,
      },
      {
        id: '1-3',
        blurb: `${SETTLEMENT} The pair fight together for the first time.`,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'captain_gareth' }],
        power: 1.03,
      },
      {
        id: '1-4',
        blurb: SETTLEMENT,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'rime_scholar' }],
        power: 0.86,
      },
      {
        id: '1-5',
        blurb: SETTLEMENT,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'captain_gareth' }, { champion: 'rime_scholar' }],
        power: 0.67,
        // a stand-in: the stage that brings the Skirmisher is not Jakub's
        recruit: 'skirmisher',
      },
      {
        id: '1-6',
        blurb: ESCALATION,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'rime_scholar' }, { champion: 'rime_scholar' }],
        power: 0.9,
      },
      {
        id: '1-7',
        blurb: ESCALATION,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'captain_gareth' }, { champion: 'rime_scholar' }],
        power: 0.82,
        // a stand-in: the stage that brings the Lineholder is not Jakub's
        recruit: 'lineholder',
      },
      {
        id: '1-8',
        blurb: ESCALATION,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'captain_gareth' }, { champion: 'captain_gareth' }],
        power: 0.71,
      },
      {
        id: '1-9',
        blurb: 'The turning point.',
        enemies: [{ champion: 'captain_gareth' }, { champion: 'rime_scholar' }, { champion: 'captain_gareth' }],
        power: 0.74,
        // a stand-in: the stage that brings the Quartermaster is not Jakub's
        recruit: 'quartermaster',
      },
      {
        id: '1-10',
        blurb: 'Leaving the reach, on to the next area.',
        enemies: [{ champion: 'captain_gareth', boss: true }, { champion: 'rime_scholar' }, { champion: 'rime_scholar' }],
        power: 0.76,
      },
    ],
  },
  {
    // Zone 2 of the notes (DESIGN_DECISIONS.md 5.4): a node on the map, its stages and its art not designed yet
    id: 'zone2',
    chapter: 'II',
    name: 'Verdant Grove',
    blurb: 'A grove deep in the forest, inside Court of Root territory.',
    requires: '1-10',
    map: { x: 722, y: 206 },
    stages: [],
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

/** The combat background a stage is fought on: its location's. */
export function zoneOf(stageId: string): string {
  const l = locationOf(stageId);
  if (!l.zone) throw new Error(`location "${l.id}" has stages but no zone`);
  return l.zone;
}

/** The stage whose first clear recruits this champion (undefined for starters). */
export function recruitStage(championId: string): StageDef | undefined {
  return allStages().find((s) => s.recruit === championId);
}

/** Bosses take this many times their stage HP. */
export const BOSS_HP = 1.6;
