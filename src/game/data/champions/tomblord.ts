import { ChampionDef } from '../types';

export const tomblord: ChampionDef = {
  id: 'tomblord',
  name: 'Anhotep',
  title: 'the Tomb Lord',
  role: 'Control',
  rarity: 'legendary',
  affinity: 'void',
  faction: 'sunscar',
  color: '#4cd43a',
  muzzle: [42, 50],
  stats: { hp: 1400, atk: 100, def: 68, spd: 96, crit: 0.06 },
  lore: 'The god-king who refused to die. Anhotep sealed himself in gold and linen to outlast the sun itself, and the sands have finally given him back.',
  passive: {
    id: 'undying',
    name: 'Undying',
    desc: 'The first time Anhotep falls, he rises again with 25% HP and every debuff removed.',
    kind: 'undying',
    value: 0.25,
  },
  skills: [
    {
      id: 'grave_touch', name: 'Grave Touch', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Sends a grasp of tomb-light at an enemy. 40% chance to place Poison for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'ranged',
      hits: [{ mult: 1.0, fx: 'grave' }],
      projectile: 'grave_orb',
      statuses: [{ status: 'poison', turns: 2, chance: 0.4, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'curse_ages', name: 'Curse of Ages', tag: 'All enemies', slot: 2, cooldown: 3,
      desc: 'Lays the curse of the dead kings on all enemies: 40% chance each to place Weaken and SPD Down for 2 turns.',
      target: 'enemies', anim: 'attack2', approach: 'ranged',
      hits: [{ mult: 0.6, fx: 'curse' }],
      statuses: [
        { status: 'weaken', turns: 2, chance: 0.4, to: 'targets' },
        { status: 'spd_down', turns: 2, chance: 0.4, to: 'targets' },
      ],
      castFx: 'cast_green',
      ai: { priority: 2 },
    },
    {
      id: 'eternal_tomb', name: 'Eternal Tomb', tag: 'Single enemy', slot: 3, cooldown: 4,
      desc: 'Seals an enemy in a golden sarcophagus: Stuns for 1 turn and places Heal Block for 2 turns.',
      target: 'enemy', anim: 'attack3', approach: 'ranged',
      hits: [{ mult: 1.3, fx: 'sarcophagus' }],
      statuses: [
        { status: 'stun', turns: 1, to: 'targets' },
        { status: 'heal_block', turns: 2, to: 'targets' },
      ],
      castFx: 'cast_green',
      shake: 3,
      ai: { priority: 3 },
    },
  ],
};
