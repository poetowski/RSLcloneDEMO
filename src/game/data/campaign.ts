// The campaign: locations (one combat background each) holding stages, in a
// line the player crosses from left to right. Clearing a stage for the first
// time opens the next one and can bring a new champion; clearing the last
// stage of a location opens the next location. Difficulty is tuned with
// `npm run balance` (see docs/MECHANICS_GUIDE.md, "Difficulty curve").
//
// Zone 1 follows Jakub's working notes (docs/DESIGN_DECISIONS.md section 5):
// ten stages on a dim island, in the arc contact, the settlement, escalation,
// the turning point and leaving. The notes are not locked. Stage names and
// texts quote the notes; the enemies are copies of the two champions that
// exist, standing in for the warriors of both worlds until enemies are designed.
import { LocationDef, StageDef } from './types';

/**
 * The campaign world map in pixels: two screens wide and one tall, scrolled
 * sideways. Stage and location `map` positions are in this space; `overview`
 * is how many times smaller the whole-world overview is drawn.
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
    map: { x: 500, y: 140 },
    stages: [
      {
        id: '1-1',
        name: 'Contact',
        blurb: `${CONTACT} The first battle.`,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'azure_warrior' }],
        power: 0.35,
        recruit: 'sanguine_support',
        map: { x: 110, y: 200 },
      },
      {
        id: '1-2',
        name: 'Contact',
        blurb: CONTACT,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'sanguine_support' }],
        power: 0.84,
        map: { x: 210, y: 178 },
      },
      {
        id: '1-3',
        name: 'The Settlement',
        blurb: `${SETTLEMENT} The pair fight together for the first time.`,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'azure_warrior' }],
        power: 0.78,
        map: { x: 318, y: 208 },
      },
      {
        id: '1-4',
        name: 'The Settlement',
        blurb: SETTLEMENT,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'sanguine_support' }],
        power: 0.89,
        map: { x: 424, y: 186 },
      },
      {
        id: '1-5',
        name: 'The Settlement',
        blurb: SETTLEMENT,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'azure_warrior' }, { champion: 'sanguine_support' }],
        power: 0.54,
        map: { x: 528, y: 214 },
      },
      {
        id: '1-6',
        name: 'Escalation',
        blurb: ESCALATION,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'sanguine_support' }, { champion: 'sanguine_support' }],
        power: 0.66,
        map: { x: 636, y: 184 },
      },
      {
        id: '1-7',
        name: 'Escalation',
        blurb: ESCALATION,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'azure_warrior' }, { champion: 'sanguine_support' }],
        power: 0.59,
        map: { x: 742, y: 212 },
      },
      {
        id: '1-8',
        name: 'Escalation',
        blurb: ESCALATION,
        enemies: [{ champion: 'azure_warrior' }, { champion: 'azure_warrior' }, { champion: 'azure_warrior' }],
        power: 0.66,
        map: { x: 848, y: 182 },
      },
      {
        id: '1-9',
        name: 'The Turning Point',
        blurb: 'The turning point.',
        enemies: [{ champion: 'azure_warrior' }, { champion: 'sanguine_support' }, { champion: 'azure_warrior' }],
        power: 0.59,
        map: { x: 956, y: 206 },
      },
      {
        id: '1-10',
        name: 'Leaving',
        blurb: 'Leaving the island, on to the next area.',
        enemies: [{ champion: 'azure_warrior', boss: true }, { champion: 'sanguine_support' }, { champion: 'sanguine_support' }],
        power: 0.59,
        map: { x: 1080, y: 176 },
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
