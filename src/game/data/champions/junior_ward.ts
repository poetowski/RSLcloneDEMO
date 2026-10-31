import { ChampionDef } from '../types';

// The Junior Ward (Jakub's brief, docs/DESIGN_DECISIONS.md section 44,
// 2026-10-31, the worksheet's recommended options): an enemy of the Sanguine
// Dominion, Common, Tank, Bloom (abstract: it sets nothing in his look); a
// tall young man with a long spear, a black tunic, bare arms. Enemy only: he
// is never summoned and is not in the collection (ENEMIES in index.ts). An A1
// on one enemy, and a passive: when an enemy skill damages him, a 25% chance
// of DEF Up on himself for 2 turns, then a rest of 1 of his turns, ready from
// the start. Stand-ins until Jakub sets them: the names and texts, A1's 1.0,
// the stats (the sturdy option, on the Common budget) and the lore line.
export const juniorWard: ChampionDef = {
  id: 'junior_ward',
  name: 'Junior Ward',
  role: 'Tank',
  rarity: 'common',
  affinity: 'bloom',
  faction: 'sanguine_dominion',
  color: '#b84a48',
  stats: { hp: 1380, atk: 80, def: 68, spd: 94, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A junior of the Sanguine Dominion\'s ward, tall for his years and given a spear longer than he is; he has not lost a fight yet, and has not fought many. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'long_thrust', name: 'Long Thrust', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Lunges and drives the long spear into one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1, fx: 'dead_thrust' }],
      ai: { priority: 1 },
    },
  ],
  passive: {
    id: 'hold_fast',
    name: 'Hold Fast',
    desc: 'When an enemy attack hits him, a 25% chance to gain DEF Up for 2 turns. Then it rests for 1 of his turns.',
    kind: 'ward',
    self: true,
    chance: 0.25,
    cooldown: 1,
    value: 0,
    statuses: [{ status: 'def_up', turns: 2 }],
    fx: 'brace_dust',
  },
};
