import { ChampionDef } from '../types';

// The Crossbowman (Jakub's brief, docs/DESIGN_DECISIONS.md section 58,
// 2026-11-01): an Elite Damage of the Azure Crown, Tide (abstract: it sets
// nothing in his look); city medieval dress in green, yellow and blue, a fancy
// hat with a feather, a big mustache, a crossbow. His kit: an A1 on one target
// with a good multiplier, an A2 on one target that places DEF Down for 2 turns
// on a cooldown of 3, and a passive of +20% critical damage always. Stand-ins:
// the skills' and the passive's names, the lore, A1's 1.25 (the top of its
// norm), A2's 1.4 and the stats (on the Elite budget). He is summoned.
export const crossbowman: ChampionDef = {
  id: 'crossbowman',
  name: 'Crossbowman',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'azure_crown',
  color: '#d8b83c',
  muzzle: [27, 53],
  stats: { hp: 1010, atk: 124, def: 58, spd: 102, crit: 0.1, critDmg: 1, acc: 0, res: 0 },
  lore: 'A master of a city\'s crossbow guild under the Azure Crown, who dresses for the parade even on the way to a war, and has never yet had to fire twice. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'guild_shot', name: 'Guild Shot', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Shoulders the crossbow and looses a bolt at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1.25, fx: 'bolt_strike' }],
      projectile: 'crossbow_bolt',
      ai: { priority: 1 },
    },
    {
      id: 'armour_breaker', name: 'Armour Breaker', tag: 'Single enemy', slot: 2, cooldown: 3,
      desc: 'Drops to one knee, takes his time and drives a heavy bolt through one enemy\'s armour, placing DEF Down on it for 2 turns.',
      target: 'enemy', anim: 'attack2', approach: 'none',
      hits: [{ mult: 1.4, fx: 'armour_breach' }],
      projectile: 'heavy_bolt',
      statuses: [{ status: 'def_down', turns: 2, to: 'targets' }],
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'masters_eye',
    name: 'Master\'s Eye',
    desc: 'In battle the Crossbowman always has +20% C.DMG on top of his stats.',
    kind: 'stat',
    stat: 'critDmg',
    value: 0.2,
  },
};
