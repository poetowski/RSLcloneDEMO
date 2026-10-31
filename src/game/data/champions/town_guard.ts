import { ChampionDef } from '../types';

// The Town Guard (Jakub's brief, docs/DESIGN_DECISIONS.md section 41,
// 2026-10-31, the worksheet's recommended options): a Common Tank of the Azure
// Crown, Ember (abstract: it sets nothing in his look); light armour, a sword
// and a round shield, boots, no helmet, long blonde hair. One A1 on one enemy,
// and an A2 on one enemy with a 50% chance of ATK Down for 1 turn, cooldown 3.
// No passive. Jakub approved the names, the lore line and the art as shown
// (2026-10-31); the texts, the multipliers (1.0, 1.3) and the stats (the
// sturdy option, on the Common budget) wait for his balance. He is summoned.
export const townGuard: ChampionDef = {
  id: 'town_guard',
  name: 'Town Guard',
  role: 'Tank',
  rarity: 'common',
  affinity: 'ember',
  faction: 'azure_crown',
  color: '#6f9ad8',
  stats: { hp: 1320, atk: 82, def: 70, spd: 94, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A town guard of the Azure Crown, who kept the gate of a quiet market town until the Loom broke and the road brought war to it. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'watch_cut', name: 'Watch Cut', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A plain cut of the sword at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1, fx: 'sword_cut' }],
      ai: { priority: 1 },
    },
    {
      id: 'shield_check', name: 'Shield Check', tag: 'Single enemy', slot: 2, cooldown: 3,
      desc: 'Drives the rim of his round shield into one enemy. 50% chance to place ATK Down for 1 turn.',
      target: 'enemy', anim: 'attack2', approach: 'melee',
      hits: [{ mult: 1.3, fx: 'mace_blow' }],
      statuses: [{ status: 'atk_down', turns: 1, chance: 0.5, to: 'targets' }],
      ai: { priority: 2 },
    },
  ],
};
