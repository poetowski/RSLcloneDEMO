import { ChampionDef } from '../types';

export const warrior: ChampionDef = {
  id: 'warrior',
  name: 'Brakka Ironhide',
  title: 'the Berserker',
  role: 'Damage',
  rarity: 'rare',
  affinity: 'force',
  faction: 'clans',
  color: '#d9443f',
  stats: { hp: 1150, atk: 118, def: 62, spd: 104, crit: 0.1 },
  lore: 'A clan champion of the frozen north who fights with an axe in each hand and a war song on his lips. He follows Aldric because the knight once refused to leave him behind.',
  skills: [
    {
      id: 'rending_chop', name: 'Rending Chop', tag: 'Single enemy, 2 hits', slot: 1, cooldown: 0,
      desc: 'Chops an enemy twice with both axes.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.6, fx: 'slash_fire' }, { mult: 0.6, fx: 'slash_fire' }],
      ai: { priority: 1 },
    },
    {
      id: 'whirlwind', name: 'Whirlwind', tag: 'All enemies, 2 hits', slot: 2, cooldown: 3,
      desc: 'Spins into the enemy line, hitting all enemies twice.',
      target: 'enemies', anim: 'attack2', approach: 'center',
      hits: [{ mult: 0.5, fx: 'slash_fire' }, { mult: 0.5, fx: 'slash_fire' }],
      ai: { priority: 2 },
    },
    {
      id: 'skullsplitter', name: 'Skullsplitter', tag: 'Single enemy', slot: 3, cooldown: 4,
      desc: 'Leaps onto an enemy with a crushing double slam. +50% damage against targets below 50% HP. Places DEF Down for 2 turns.',
      target: 'enemy', anim: 'attack3', approach: 'leap',
      hits: [{ mult: 2.2, fx: 'crack' }],
      execute: { below: 0.5, mult: 1.5 },
      statuses: [{ status: 'def_down', turns: 2, to: 'targets' }],
      shake: 6,
      ai: { priority: 3 },
    },
  ],
};
