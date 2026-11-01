import { ChampionDef } from '../types';

// The Gravedigger (docs/DESIGN_DECISIONS.md section 48, Jakub's request of
// 2026-11-01 for the Ashveil Reign's second Common Damage, "be very creative
// and propose both and design and deliver"): my proposal, built on that word; a
// hunched dried corpse with a long spade who finishes what others began. The
// roster's first `execute`: Shallow Grave strikes harder below 40% HP. Stand-ins
// until Jakub sets them: all of it (the name, the kit, Bloom, the numbers, the
// lore line, the art). He is summoned.
export const gravedigger: ChampionDef = {
  id: 'gravedigger',
  name: 'Gravedigger',
  role: 'Damage',
  rarity: 'common',
  affinity: 'bloom',
  faction: 'ashveil_reign',
  color: '#8c6a4a',
  stats: { hp: 1000, atk: 110, def: 56, spd: 104, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'He dug for the Ashveil Reign until he fell into his work, and climbed out with the spade still in his hands. He measures everyone he meets. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'spade_cut', name: 'Spade Cut', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A chop of the spade\'s edge at one enemy, with a 25% chance of Slow for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1, fx: 'spade_cut' }],
      statuses: [{ status: 'spd_down', turns: 1, chance: 0.25, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'shallow_grave', name: 'Shallow Grave', tag: 'Single enemy', slot: 2, cooldown: 4,
      desc: 'The spade driven down into one enemy, for half as much again if it is below 40% HP.',
      target: 'enemy', anim: 'attack2', approach: 'melee',
      hits: [{ mult: 1.2, fx: 'shallow_grave' }],
      execute: { below: 0.4, mult: 1.5 },
      shake: 2,
      ai: { priority: 2 },
    },
  ],
};
