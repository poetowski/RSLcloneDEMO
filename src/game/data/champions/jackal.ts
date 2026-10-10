import { ChampionDef } from '../types';

export const jackal: ChampionDef = {
  id: 'jackal',
  name: "Kha'zir",
  title: 'the Jackal Warden',
  role: 'Tank',
  rarity: 'epic',
  affinity: 'force',
  faction: 'sunscar',
  color: '#2aa890',
  stats: { hp: 1600, atk: 82, def: 77, spd: 97, crit: 0.05 },
  lore: "Sworn guardian of the Sunscar necropolis. Kha'zir has watched the tomb gates for three hundred years behind the mask of the jackal god; he weighs every intruder's heart and finds it wanting.",
  skills: [
    {
      id: 'jackal_bite', name: "Jackal's Bite", tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Hooks an enemy with the khopesh-glaive. 30% chance to place Weaken for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'slash_gold' }],
      statuses: [{ status: 'weaken', turns: 2, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'wardens_vigil', name: "Warden's Vigil", tag: 'All allies', slot: 2, cooldown: 3,
      desc: "Howls the tomb-guard's vow: all allies gain Counterattack for 2 turns and Kha'zir Taunts for 2 turns.",
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'vigil' }],
      statuses: [
        { status: 'counter', turns: 2, to: 'allies' },
        { status: 'taunt', turns: 2, to: 'self' },
      ],
      castFx: 'cast_gold',
      actorFx: 'howl',
      ai: { priority: 2 },
    },
    {
      id: 'weighing_hearts', name: 'Weighing of Hearts', tag: 'Single enemy', slot: 3, cooldown: 4,
      desc: 'Strips every buff from an enemy, then brings the glaive down on them and places Weaken for 2 turns.',
      target: 'enemy', anim: 'attack3', approach: 'melee',
      hits: [{ mult: 1.8, fx: 'slash_gold' }],
      stripBuffs: true,
      statuses: [{ status: 'weaken', turns: 2, to: 'targets' }],
      shake: 5,
      ai: { priority: 3 },
    },
  ],
};
