import { ChampionDef } from '../types';

// The Harvest Specialist (Jakub's brief, docs/DESIGN_DECISIONS.md section 45,
// 2026-10-31: the golden wheat, the sturdy stats, the rest of the worksheet's
// recommended options): a Common Support of the Sanguine Dominion, Tide (his
// "you choose for optimizing": Tide strikes Ember, the roster's commonest,
// strong); a farmer with a huge sheaf of golden wheat. One skill: an A1 on
// one enemy that takes 20% of its Turn Meter. No A2, no passive. Jakub
// approved the affinity, the name, the lore line and the art as shown
// (2026-10-31); the text, A1's 1.0 and the stats (the sturdy option, on the
// Common budget) wait for his balance. He is summoned.
export const harvestSpecialist: ChampionDef = {
  id: 'harvest_specialist',
  name: 'Harvest Specialist',
  role: 'Support',
  rarity: 'common',
  affinity: 'tide',
  faction: 'sanguine_dominion',
  color: '#e0b448',
  stats: { hp: 1320, atk: 88, def: 66, spd: 98, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A harvest specialist of the Sanguine Dominion who feeds its armies, and knows that a field cut at the right hour holds an enemy back better than a wall. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'threshing_blow', name: 'Threshing Blow', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Swings the sheaf into one enemy and takes 20% of its Turn Meter.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1, fx: 'chaff_burst' }],
      tmTargets: -20,
      ai: { priority: 1 },
    },
  ],
};
