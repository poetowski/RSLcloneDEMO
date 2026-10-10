import { ChampionDef } from '../types';

export const stalker: ChampionDef = {
  id: 'stalker',
  name: 'Akhet',
  title: 'the Dune Stalker',
  role: 'Damage',
  rarity: 'rare',
  affinity: 'force',
  faction: 'sunscar',
  color: '#3a58c0',
  stats: { hp: 1000, atk: 118, def: 58, spd: 118, crit: 0.11 },
  lore: 'A dune stalker who walks where the wind erases footprints. Akhet sells his daggers to the Sunscar court and his silence to no one.',
  skills: [
    {
      id: 'twin_fangs', name: 'Twin Fangs', tag: 'Single enemy, 2 hits', slot: 1, cooldown: 0,
      desc: 'Two crossing dagger cuts. Each hit has a 25% chance to place Poison for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.55, fx: 'slash_dagger' }, { mult: 0.55, fx: 'slash_dagger' }],
      statuses: [{ status: 'poison', turns: 2, chance: 0.25, to: 'targets', perHit: true }],
      ai: { priority: 1 },
    },
    {
      id: 'scorpion_sting', name: 'Scorpion Sting', tag: 'Single enemy', slot: 2, cooldown: 3,
      desc: 'Vanishes into the sand and stabs an enemy from behind: places Heal Block and Weaken for 2 turns.',
      target: 'enemy', anim: 'attack2', approach: 'blink',
      hits: [{ mult: 1.45, fx: 'sting' }],
      statuses: [
        { status: 'heal_block', turns: 2, to: 'targets' },
        { status: 'weaken', turns: 2, to: 'targets' },
      ],
      ai: { priority: 2 },
    },
    {
      id: 'mirage_assault', name: 'Mirage Assault', tag: 'Single enemy, 4 hits', slot: 3, cooldown: 4,
      desc: 'Strikes an enemy four times from every side. +50% damage against targets below 40% HP. Akhet ends his turn with 25% Turn Meter.',
      target: 'enemy', anim: 'attack3', approach: 'blink',
      hits: [{ mult: 0.5, fx: 'slash_dagger' }, { mult: 0.5, fx: 'slash_dagger' }, { mult: 0.5, fx: 'slash_dagger' }, { mult: 0.5, fx: 'sting' }],
      execute: { below: 0.4, mult: 1.5 },
      selfTm: 25,
      ai: { priority: 3 },
    },
  ],
};
