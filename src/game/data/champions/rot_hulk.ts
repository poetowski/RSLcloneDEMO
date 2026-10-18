import { ChampionDef } from '../types';

// The Rot Hulk (docs/DESIGN_DECISIONS.md section 29, Jakub's brief of
// 2026-10-18): the Ashveil Reign's second champion, a Common, Tank, Ember. A
// big, fat abomination in patches of many colours, "not any legendary hero
// just a rot bulk of entry level". Kit: "A1 - attack single target. has 25%
// chance to inflict Poison for 2 turns"; nothing else. Stand-ins until Jakub
// sets them: the stats (on the Common budget: the most HP of the Commons and
// the floor of SPD), the name Putrid Slam and its text, A1's multiplier (1.0),
// the lore line and the stage whose first clear brings him.
export const rotHulk: ChampionDef = {
  id: 'rot_hulk',
  name: 'Rot Hulk',
  role: 'Tank',
  rarity: 'common',
  affinity: 'ember',
  faction: 'ashveil_reign',
  color: '#a8b47e',
  stats: { hp: 1500, atk: 80, def: 64, spd: 90, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A hulk of the Ashveil Reign, stitched together out of the rotting flesh of many: a bloated mass of mismatched patches, slow, dull and hard to put down. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'putrid_slam', name: 'Putrid Slam', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Brings both fists down on one enemy. A 25% chance to place Poison on it for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'putrid_slam' }],
      statuses: [{ status: 'poison', turns: 2, chance: 0.25, to: 'targets' }],
      shake: 3,
      ai: { priority: 1 },
    },
  ],
};
