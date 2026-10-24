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
// enemies are designed. Zone 2, the Verdant Grove, has ten placeholder stages
// Jakub asked for to test the area in game (2026-10-13): their texts quote the
// arc of his notes (5.4: approach, arrival, the contest, the outcome; "not
// about arena", so the contest takes place in something that only looks like
// one), and their enemies are copies of the champions that exist, standing in
// until he dictates them. Both names are his (2026-10-11). Zone 3, the Moonlit
// Basin, named and described by Jakub (2026-10-17), has ten placeholder stages
// like Zone 2's, so it can be played and seen in game: their texts walk his
// description from the grove's roots to the eastern hills, their enemies are
// copies of the roster, their powers are tuned stand-ins; 3-1, 3-2 and 3-3
// bring the Skeleton, the Rot Hulk and the Bellringer, the Ashveil Reign's first
// champions (stand-ins). Zone 4, Earth Scars, named and described by Jakub
// (2026-10-18), the easternmost place, has ten placeholder stages he asked for
// "like in the past": their texts walk his description, from the steppe and its
// two ravines to the camp, the yaks, the mountains and the zeppelin; their
// enemies are copies of the roster and their powers tuned stand-ins; 4-1 brings
// the Necromancer, the Ashveil Reign's first Elite, 4-2 the Automated Soul, its
// second, and 4-3 Irving Wellbington, its third (stand-ins). Zone 5, the Snowy
// Mesa, named and described by Jakub (2026-10-19), east of Earth Scars, has ten
// placeholder stages he asked for: their texts walk his description, from the
// mesa's top to the arbiter on it; their enemies are copies of the roster and
// their powers tuned stand-ins; no champion joins there.
//
// Every stage drops Thread Spools of its area's two Weave Patterns (Jakub,
// 2026-10-24: exactly two sets per area). Which two each area holds is a
// stand-in: the Reach the basics (Sunder, Vigor), the Grove speed and guard
// (Pulse, Ward), the Basin the debuff contest (Focus, Tranquility), the Scars
// critical rate (Needle, Sunder again) and the Mesa critical damage (Apex,
// Pulse again), so every pattern drops somewhere.
import { LocationDef, StageDef } from './types';

/**
 * The campaign world map in pixels: one screen tall and three screens wide,
 * scrolled sideways. Location `map` positions (the campaign nodes) are in this
 * space; `overview` is how many times smaller the whole-world overview is
 * drawn (three times smaller it fills the screen's width, so a wider map needs a
 * smaller one). The map grows east area by area: a new area widens it by its stretch,
 * and everything west of the stretch keeps its pixels (tools/art/map.ts).
 */
export const WORLD_MAP = { w: 1920, h: 360, overview: 3 };

/** Champions the player owns from the start. */
export const STARTERS = ['captain_gareth'];

const CONTACT = 'Azure Crown and Sanguine Dominion warriors meet where they should not be able to.';
const SETTLEMENT = 'The settlement and its surroundings.';
const ESCALATION = 'Two worlds in one place draw more through, or trigger a larger engagement.';
const APPROACH = 'Travelling through the forest. The Court of Root are a presence, not just enemies.';
const ARRIVAL = 'Meeting the Court of Root. They have rules.';
const CONTEST = 'The contest, in something that only looks like an arena.';
const OUTCOME = 'Winning, losing, being judged.';
// Zone 3: Jakub's description of the Moonlit Basin (2026-10-17), from the grove's roots to the eastern hills
const BEYOND = 'Beyond the trailing roots of Verdant Grove, the soil gradually pales into silver sand.';
const BASIN = 'A low-lying basin floor carpeted in glowing twilight-moss.';
const REEDS = 'Pale, glass-like reeds sway softly without a breeze, catching the moonlight in shimmering hues of pale blue and violet.';
const MOTES = 'Small, airborne dust-motes of bioluminescent flora drift across the sunken landscape.';
const POOLS = 'Soft, pearlescent halos over quiet, crystal-clear tide-pools.';
const SWELL = 'The ground begins its gentle swell toward the sharp silhouette of the eastern hills.';
// Zone 4: Jakub's description of Earth Scars (2026-10-18), from the steppe to the zeppelin in its sky
const STEPPE = 'A steppe under the day sky, the land furthest to the east.';
const RAVINES = 'Two deep ravines run across it from west to east, neither like the other.';
const YURTS = 'Yurts stand on the steppe, small colourful flags running like a chain up very long poles.';
const YAKS = 'A few wild yaks roam nearby.';
const PEAKS = 'Far off, a little to the left, a very big mountain with a snowy peak; on its right a twin, a little lower.';
const ZEPPELIN = 'Far off in the sky, a zeppelin flies.';
// Zone 5: Jakub's description of the Snowy Mesa (2026-10-19), from the mesa's top to the arbiter on it
const MESA_TOP = 'The top of a snow-capped tabletop mountain.';
const MESAS = 'Many more tabletop mountains all round, all connected with many candles.';
const SUNSET = 'The time before sunset.';
const CASTLE = 'On the mesa to the left a castle, its huge chimney breathing purple dust and particles.';
const STORM = 'A snowstorm approaches from the right.';
const ARBITER = 'A few trees, and a big arbiter statue like a Buddha holding a big sword.';

export const LOCATIONS: LocationDef[] = [
  {
    id: 'zone1',
    chapter: 'I',
    name: 'Fracture Reach',
    zone: 'zone1',
    blurb: 'A farming settlement in the reach of the rift, under an open sky. The broken loom has connected warriors from two worlds here, the Azure Crown and the Sanguine Dominion, who would never meet naturally.',
    map: { x: 322, y: 198 },
    patterns: ['pattern_sunder', 'pattern_vigor'],
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
        // a stand-in: the stage that brings the Follower is not Jakub's
        recruit: 'follower',
      },
      {
        id: '1-5',
        blurb: SETTLEMENT,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'captain_gareth' }, { champion: 'rime_scholar' }],
        power: 0.92,
        // a stand-in: the stage that brings the Skirmisher is not Jakub's
        recruit: 'skirmisher',
      },
      {
        id: '1-6',
        blurb: ESCALATION,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'rime_scholar' }, { champion: 'rime_scholar' }],
        power: 0.9,
        // a stand-in: the stage that brings the Dominion Medic is not Jakub's
        recruit: 'dominion_medic',
      },
      {
        id: '1-7',
        blurb: ESCALATION,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'captain_gareth' }, { champion: 'rime_scholar' }],
        power: 0.73,
        // a stand-in: the stage that brings the Lineholder is not Jakub's
        recruit: 'lineholder',
      },
      {
        id: '1-8',
        blurb: ESCALATION,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'captain_gareth' }, { champion: 'captain_gareth' }],
        power: 0.71,
        // a stand-in: the stage that brings the Bloodhound is not Jakub's
        recruit: 'bloodhound',
      },
      {
        id: '1-9',
        blurb: 'The turning point.',
        enemies: [{ champion: 'captain_gareth' }, { champion: 'rime_scholar' }, { champion: 'captain_gareth' }],
        power: 0.68,
        // a stand-in: the stage that brings the Quartermaster is not Jakub's
        recruit: 'quartermaster',
      },
      {
        id: '1-10',
        blurb: 'Leaving the reach, on to the next area.',
        enemies: [{ champion: 'captain_gareth', boss: true }, { champion: 'rime_scholar' }, { champion: 'rime_scholar' }],
        power: 0.7,
        // a stand-in: the stage that brings the Enforcer is not Jakub's
        recruit: 'enforcer',
      },
    ],
  },
  {
    // Zone 2 of the notes (DESIGN_DECISIONS.md 5.4), its background painted on Jakub's brief (2026-10-12);
    // its ten stages are placeholders to test it in game (2026-10-13): enemies, powers and texts are stand-ins
    id: 'zone2',
    chapter: 'II',
    name: 'Verdant Grove',
    zone: 'zone2',
    blurb: 'A grove deep in the forest, inside Court of Root territory.',
    requires: '1-10',
    map: { x: 722, y: 206 },
    patterns: ['pattern_pulse', 'pattern_ward'],
    stages: [
      {
        id: '2-1',
        blurb: APPROACH,
        enemies: [{ champion: 'follower' }, { champion: 'follower' }],
        power: 1.03,
        // a stand-in: the stage that brings the Walking Bush is not Jakub's
        recruit: 'walking_bush',
      },
      {
        id: '2-2',
        blurb: APPROACH,
        enemies: [{ champion: 'follower' }, { champion: 'follower' }, { champion: 'follower' }],
        power: 0.7,
        // a stand-in: the stage that brings the Wild Speaker is not Jakub's
        recruit: 'wild_speaker',
      },
      {
        id: '2-3',
        blurb: ARRIVAL,
        enemies: [{ champion: 'lineholder' }, { champion: 'follower' }, { champion: 'quartermaster' }],
        power: 0.89,
        // a stand-in: the stage that brings the Jungle Herder is not Jakub's
        recruit: 'jungle_herder',
      },
      {
        id: '2-4',
        blurb: ARRIVAL,
        enemies: [{ champion: 'bloodhound' }, { champion: 'follower' }, { champion: 'dominion_medic' }],
        power: 0.99,
        // a stand-in: the stage that brings the Associate is not Jakub's
        recruit: 'associate',
      },
      {
        id: '2-5',
        blurb: CONTEST,
        enemies: [{ champion: 'enforcer' }, { champion: 'skirmisher' }, { champion: 'follower' }],
        power: 0.82,
        // a stand-in: the stage that brings Emissary Handlings is not Jakub's
        recruit: 'emissary_handlings',
      },
      {
        id: '2-6',
        blurb: CONTEST,
        enemies: [{ champion: 'lineholder' }, { champion: 'rime_scholar' }, { champion: 'follower' }],
        power: 0.81,
        // a stand-in: the stage that brings the Black Rhino is not Jakub's
        recruit: 'black_rhino',
      },
      {
        id: '2-7',
        blurb: CONTEST,
        enemies: [{ champion: 'bloodhound' }, { champion: 'enforcer' }, { champion: 'quartermaster' }],
        power: 1.02,
        // a stand-in: the stage that brings Red Cloak is not Jakub's
        recruit: 'red_cloak',
      },
      {
        id: '2-8',
        blurb: CONTEST,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'follower' }, { champion: 'follower' }],
        power: 0.76,
        // a stand-in: the stage that brings the Grove Keeper is not Jakub's
        recruit: 'grove_keeper',
      },
      {
        id: '2-9',
        blurb: OUTCOME,
        enemies: [{ champion: 'captain_gareth' }, { champion: 'rime_scholar' }, { champion: 'dominion_medic' }],
        power: 0.83,
        // a stand-in: the stage that brings Big Ears is not Jakub's
        recruit: 'big_ears',
      },
      {
        id: '2-10',
        blurb: `${OUTCOME} The last stage of the area.`,
        enemies: [{ champion: 'follower', boss: true }, { champion: 'captain_gareth' }, { champion: 'rime_scholar' }],
        power: 0.71,
      },
    ],
  },
  {
    // Zone 3, named and described by Jakub (2026-10-17, DESIGN_DECISIONS.md 5.6); its ten stages are
    // placeholders like Zone 2's, so the area can be played: enemies, powers and texts are stand-ins
    id: 'zone3',
    chapter: 'III',
    name: 'Moonlit Basin',
    zone: 'zone3',
    blurb: 'Beyond the trailing roots of Verdant Grove, the soil gradually pales into silver sand, giving rise to low-lying basin floor carpeted in glowing twilight-moss.',
    requires: '2-10',
    map: { x: 1084, y: 200 },
    patterns: ['pattern_focus', 'pattern_tranquility'],
    stages: [
      {
        id: '3-1',
        blurb: BEYOND,
        enemies: [{ champion: 'associate' }, { champion: 'follower' }, { champion: 'walking_bush' }],
        power: 0.92,
        // a stand-in: the stage that brings the Skeleton is not Jakub's
        recruit: 'skeleton',
      },
      {
        id: '3-2',
        blurb: BASIN,
        enemies: [{ champion: 'grove_keeper' }, { champion: 'wild_speaker' }, { champion: 'follower' }],
        power: 0.84,
        // a stand-in: the stage that brings the Rot Hulk is not Jakub's
        recruit: 'rot_hulk',
      },
      {
        id: '3-3',
        blurb: REEDS,
        enemies: [{ champion: 'jungle_herder' }, { champion: 'big_ears' }, { champion: 'follower' }],
        power: 0.75,
        // a stand-in: the stage that brings the Bellringer is not Jakub's
        recruit: 'bellringer',
      },
      {
        id: '3-4',
        blurb: REEDS,
        enemies: [{ champion: 'emissary_handlings' }, { champion: 'skirmisher' }, { champion: 'rime_scholar' }],
        power: 0.81,
      },
      {
        id: '3-5',
        blurb: MOTES,
        enemies: [{ champion: 'black_rhino' }, { champion: 'enforcer' }, { champion: 'dominion_medic' }],
        power: 0.86,
      },
      {
        id: '3-6',
        blurb: POOLS,
        enemies: [{ champion: 'red_cloak' }, { champion: 'bloodhound' }, { champion: 'associate' }],
        power: 0.84,
      },
      {
        id: '3-7',
        blurb: POOLS,
        enemies: [{ champion: 'jungle_herder' }, { champion: 'grove_keeper' }, { champion: 'big_ears' }],
        power: 0.81,
      },
      {
        id: '3-8',
        blurb: SWELL,
        enemies: [{ champion: 'emissary_handlings' }, { champion: 'captain_gareth' }, { champion: 'associate' }],
        power: 0.75,
      },
      {
        id: '3-9',
        blurb: SWELL,
        enemies: [{ champion: 'black_rhino' }, { champion: 'red_cloak' }, { champion: 'dominion_medic' }],
        power: 0.8,
      },
      {
        id: '3-10',
        blurb: `${SWELL} The last stage of the area.`,
        enemies: [{ champion: 'black_rhino', boss: true }, { champion: 'grove_keeper' }, { champion: 'big_ears' }],
        power: 0.76,
      },
    ],
  },
  {
    // Zone 4, named and described by Jakub (2026-10-18, DESIGN_DECISIONS.md 5.7); its ten stages are placeholders
    // like the areas' before it ("create also 10 placehold levels like in the past"): enemies, powers and texts are stand-ins
    id: 'zone4',
    chapter: 'IV',
    name: 'Earth Scars',
    zone: 'zone4',
    blurb: 'The easternmost land, beyond the Moonlit Basin and its eastern hills: a steppe under the day sky, cut by two deep ravines.',
    requires: '3-10',
    map: { x: 1452, y: 190 },
    patterns: ['pattern_needle', 'pattern_sunder'],
    stages: [
      {
        id: '4-1',
        blurb: STEPPE,
        enemies: [{ champion: 'skeleton' }, { champion: 'follower' }, { champion: 'wild_speaker' }],
        power: 0.83,
        // a stand-in: the stage that brings the Necromancer is not Jakub's
        recruit: 'necromancer',
      },
      {
        id: '4-2',
        blurb: RAVINES,
        enemies: [{ champion: 'rot_hulk' }, { champion: 'skirmisher' }, { champion: 'enforcer' }],
        power: 0.84,
        // a stand-in: the stage that brings the Automated Soul is not Jakub's
        recruit: 'automated_soul',
      },
      {
        id: '4-3',
        blurb: RAVINES,
        enemies: [{ champion: 'skeleton' }, { champion: 'skeleton' }, { champion: 'big_ears' }],
        power: 0.81,
        // a stand-in: the stage that brings Irving Wellbington is not Jakub's
        recruit: 'irving_wellbington',
      },
      {
        id: '4-4',
        blurb: YURTS,
        enemies: [{ champion: 'black_rhino' }, { champion: 'red_cloak' }, { champion: 'grove_keeper' }],
        power: 0.66,
      },
      {
        id: '4-5',
        blurb: YURTS,
        enemies: [{ champion: 'rot_hulk' }, { champion: 'associate' }, { champion: 'bloodhound' }],
        power: 0.95,
      },
      {
        id: '4-6',
        blurb: YAKS,
        enemies: [{ champion: 'jungle_herder' }, { champion: 'skeleton' }, { champion: 'rime_scholar' }],
        power: 0.82,
      },
      {
        id: '4-7',
        blurb: YAKS,
        enemies: [{ champion: 'emissary_handlings' }, { champion: 'red_cloak' }, { champion: 'follower' }],
        power: 0.71,
      },
      {
        id: '4-8',
        blurb: PEAKS,
        enemies: [{ champion: 'lineholder' }, { champion: 'big_ears' }, { champion: 'associate' }],
        power: 0.87,
      },
      {
        id: '4-9',
        blurb: PEAKS,
        enemies: [{ champion: 'rot_hulk' }, { champion: 'captain_gareth' }, { champion: 'grove_keeper' }],
        power: 0.84,
      },
      {
        id: '4-10',
        blurb: `${ZEPPELIN} The last stage of the area.`,
        enemies: [{ champion: 'red_cloak', boss: true }, { champion: 'skeleton' }, { champion: 'rot_hulk' }],
        power: 0.81,
      },
    ],
  },
  {
    // Zone 5, named and described by Jakub (2026-10-19, DESIGN_DECISIONS.md 5.8); its ten stages are placeholders
    // like the areas' before it ("create also combat background and 10 placeholder stages"): enemies, powers and texts are stand-ins
    id: 'zone5',
    chapter: 'V',
    name: 'Snowy Mesa',
    zone: 'zone5',
    blurb: 'East of Earth Scars, the top of a snow-capped tabletop mountain, many more all round it, all connected with many candles.',
    requires: '4-10',
    map: { x: 1768, y: 194 },
    patterns: ['pattern_apex', 'pattern_pulse'],
    stages: [
      {
        id: '5-1',
        blurb: MESA_TOP,
        enemies: [{ champion: 'skeleton' }, { champion: 'rot_hulk' }, { champion: 'follower' }],
        power: 0.89,
      },
      {
        id: '5-2',
        blurb: MESAS,
        enemies: [{ champion: 'black_rhino' }, { champion: 'associate' }, { champion: 'follower' }],
        power: 0.7,
      },
      {
        id: '5-3',
        blurb: MESAS,
        enemies: [{ champion: 'irving_wellbington' }, { champion: 'skirmisher' }, { champion: 'wild_speaker' }],
        power: 0.8,
      },
      {
        id: '5-4',
        blurb: SUNSET,
        enemies: [{ champion: 'jungle_herder' }, { champion: 'necromancer' }, { champion: 'enforcer' }],
        power: 0.74,
      },
      {
        id: '5-5',
        blurb: CASTLE,
        enemies: [{ champion: 'lineholder' }, { champion: 'automated_soul' }, { champion: 'quartermaster' }],
        power: 0.81,
      },
      {
        id: '5-6',
        blurb: CASTLE,
        enemies: [{ champion: 'emissary_handlings' }, { champion: 'big_ears' }, { champion: 'grove_keeper' }],
        power: 0.81,
      },
      {
        id: '5-7',
        blurb: STORM,
        enemies: [{ champion: 'bloodhound' }, { champion: 'red_cloak' }, { champion: 'dominion_medic' }],
        power: 0.94,
      },
      {
        id: '5-8',
        blurb: STORM,
        enemies: [{ champion: 'rot_hulk' }, { champion: 'automated_soul' }, { champion: 'necromancer' }],
        power: 0.7,
      },
      {
        id: '5-9',
        blurb: ARBITER,
        enemies: [{ champion: 'irving_wellbington' }, { champion: 'captain_gareth' }, { champion: 'rime_scholar' }],
        power: 0.77,
      },
      {
        id: '5-10',
        blurb: `${ARBITER} The last stage of the area.`,
        enemies: [{ champion: 'irving_wellbington', boss: true }, { champion: 'necromancer' }, { champion: 'automated_soul' }],
        power: 0.67,
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
