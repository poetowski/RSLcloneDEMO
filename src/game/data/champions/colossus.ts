import { ChampionDef } from '../types';

export const colossus: ChampionDef = {
  id: 'colossus',
  name: 'Mwamba',
  title: 'the Starforged',
  role: 'Tank',
  rarity: 'legendary',
  affinity: 'arcane',
  faction: 'nyota',
  color: '#ffc850',
  stats: { hp: 1650, atk: 86, def: 78, spd: 92, crit: 0.04 },
  lore: 'The guardian the first star-smiths raised to keep the Skyforge. Mwamba has stood at the heart of the forge for a thousand years, and it decides who may carry the fire it guards.',
  passive: {
    id: 'starforged_core',
    name: 'Starforged Core',
    desc: 'The first time Mwamba falls below 50% HP, its core overloads: ATK Up and DEF Up for 2 turns.',
    kind: 'overdrive',
    value: 0.5,
    statuses: [
      { status: 'atk_up', turns: 2 },
      { status: 'def_up', turns: 2 },
    ],
  },
  skills: [
    {
      id: 'gravity_fist', name: 'Gravity Fist', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A punch that folds gravity around the fist. 30% chance to place SPD Down for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.05, fx: 'gravity_fist' }],
      statuses: [{ status: 'spd_down', turns: 2, chance: 0.3, to: 'targets' }],
      shake: 2,
      ai: { priority: 1 },
    },
    {
      id: 'magnetic_pull', name: 'Magnetic Pull', tag: 'All enemies', slot: 2, cooldown: 3,
      desc: 'Drags every enemy toward its core: damages all enemies, 50% chance to place ATK Down for 2 turns, and Mwamba Taunts for 2 turns.',
      target: 'enemies', anim: 'attack2', approach: 'none',
      hits: [{ mult: 0.6, fx: 'magnet_pulse' }],
      statuses: [
        { status: 'atk_down', turns: 2, chance: 0.5, to: 'targets' },
        { status: 'taunt', turns: 2, to: 'self' },
      ],
      castFx: 'cast_teal',
      ai: { priority: 2 },
    },
    {
      id: 'starfall_protocol', name: 'Starfall Protocol', tag: 'All enemies', slot: 3, cooldown: 5,
      desc: 'Calls down a rain of forged stars on all enemies. 35% chance to Stun each for 1 turn.',
      target: 'enemies', anim: 'attack3', approach: 'none',
      hits: [{ mult: 1.0, fx: 'starfall' }],
      statuses: [{ status: 'stun', turns: 1, chance: 0.35, to: 'targets' }],
      castFx: 'cast_gold',
      shake: 5,
      ai: { priority: 3 },
    },
  ],
};
