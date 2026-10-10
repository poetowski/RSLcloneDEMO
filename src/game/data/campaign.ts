// The campaign: locations (one combat background each) holding stages, in a
// line the player crosses from left to right. Clearing a stage for the first
// time opens the next one and can bring a new champion; clearing the last
// stage of a location opens the next location. Difficulty is tuned with
// `npm run balance` (see docs/MECHANICS_GUIDE.md, "Difficulty curve").
//
// Zone 1 follows Jakub's working notes (docs/DESIGN_DECISIONS.md section 5):
// ten stages on a dim island, in the arc contact, the settlement, escalation,
// the turning point and leaving. The notes are not locked. Stages have no
// names; their texts quote the notes; the enemies are copies of the two
// champions that exist, standing in for the warriors of both worlds until
// enemies are designed. Zone 2 is a node on the map whose stages wait for him.
import { LocationDef, StageDef } from './types';

/**
 * The campaign world map in pixels: two screens wide and one tall, scrolled
 * sideways. Location `map` positions (the campaign nodes) are in this space;
 * `overview` is how many times smaller the whole-world overview is drawn.
 */
export const WORLD_MAP = { w: 1280, h: 360, overview: 2 };

/** Champions the player owns from the start. */
export const STARTERS = ['azure_warrior'];

const CONTACT = 'Azure Crown and Sanguine Dominion warriors meet where they should not be able to.';
const SETTLEMENT = 'The settlement and its surroundings.';
const ESCALATION = 'Two worlds in one place draw more through, or trigger a larger engagement.';

export const LOCATIONS: LocationDef[] = [
  {
    id: 'zone1',
    chapter: 'I',
    name: 'A Dim Island',
    zone: 'zone1',
    blurb: 'A small settlement on a dim island under an open sky. The broken loom has connected warriors from two worlds here, the Azure Crown and the Sanguine Dominion, who would never meet naturally.',
    map: { x: 300, y: 152 },
    stages: [
      {
        id: '1-1',
        blurb: `${CONTACT} The first battle.`,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'azure_warrior' }],
        power: 0.35,
        recruit: 'sanguine_support',
      },
      {
        id: '1-2',
        blurb: CONTACT,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'sanguine_support' }],
        power: 0.84,
      },
      {
        id: '1-3',
        blurb: `${SETTLEMENT} The pair fight together for the first time.`,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'azure_warrior' }],
        power: 0.78,
      },
      {
        id: '1-4',
        blurb: SETTLEMENT,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'sanguine_support' }],
        power: 0.89,
      },
      {
        id: '1-5',
        blurb: SETTLEMENT,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'azure_warrior' }, { champion: 'sanguine_support' }],
        power: 0.54,
      },
      {
        id: '1-6',
        blurb: ESCALATION,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'sanguine_support' }, { champion: 'sanguine_support' }],
        power: 0.66,
      },
      {
        id: '1-7',
        blurb: ESCALATION,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'azure_warrior' }, { champion: 'sanguine_support' }],
        power: 0.59,
      },
      {
        id: '1-8',
        blurb: ESCALATION,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'azure_warrior' }, { champion: 'azure_warrior' }],
        power: 0.66,
      },
      {
        id: '1-9',
        blurb: 'The turning point.',
        enemies: [{ champion: 'azure_warrior' }, { champion: 'sanguine_support' }, { champion: 'azure_warrior' }],
        power: 0.59,
      },
      {
        id: '1-10',
        blurb: 'Leaving the island, on to the next area.',
        enemies: [{ champion: 'azure_warrior', boss: true }, { champion: 'sanguine_support' }, { champion: 'sanguine_support' }],
        power: 0.59,
      },
    ],
  },
  {
    // Zone 2 of the notes (DESIGN_DECISIONS.md 5.4): a node on the map, its stages not designed yet
    id: 'zone2',
    chapter: 'II',
    name: 'A Mystic Arena',
    blurb: 'A mystic arena in a deep forest, inside Court of Root territory.',
    requires: '1-10',
    map: { x: 1040, y: 152 },
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
