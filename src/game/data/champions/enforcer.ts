import { ChampionDef } from '../types';

// The Enforcer (docs/DESIGN_DECISIONS.md section 15, Jakub's brief of
// 2026-10-12): a Common of the Sanguine Dominion, Damage, Ember. Crimson
// medium armour, a dark helmet, a long bastard sword, a black hexagon on the
// torso. A1 an attack; a passive of +10% critical rate, always on (his answer:
// a flat bonus). Jakub, the same day: a passive that gives a permanent stat
// boost is extra, never paid for from the stat budget, and it works in combat
// only, so his stats in the collection show 2.5% C.RATE and the passive says
// the rest. Stand-ins until Jakub sets them: the stats (on the Common budget),
// the names Heavy Cut and Keen Edge and their texts, A1's multiplier (1.0, a
// plain attack), the lore line and the stage whose first clear brings him.
export const enforcer: ChampionDef = {
  id: 'enforcer',
  name: 'Enforcer',
  role: 'Damage',
  rarity: 'common',
  affinity: 'ember',
  faction: 'sanguine_dominion',
  color: '#dc4c5c',
  stats: { hp: 1040, atk: 108, def: 62, spd: 98, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'An enforcer of the Sanguine Dominion, a power from a world of its own: crimson armour of middle weight, a dark helmet, a long bastard sword and the black hexagon on his chest. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'heavy_cut', name: 'Heavy Cut', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A two-handed cut of the long bastard sword at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'long_cut' }],
      ai: { priority: 1 },
    },
  ],
  passive: {
    id: 'keen_edge',
    name: 'Keen Edge',
    desc: 'In battle the Enforcer always has +10% C.RATE on top of his stats.',
    kind: 'stat',
    stat: 'crit',
    value: 0.1,
  },
};
