import { ChampionDef } from '../types';

export const knight: ChampionDef = {
  id: 'knight',
  name: 'Sir Aldric',
  title: 'the Lionguard',
  role: 'Tank',
  rarity: 'epic',
  affinity: 'arcane',
  faction: 'dawn',
  color: '#4f8ae6',
  stats: { hp: 1500, atk: 78, def: 78, spd: 100, crit: 0.05 },
  lore: 'Last knight-captain of the Order of Dawn. Aldric swore to hold the northern passes when the Oath broke, and he has not lowered his shield since.',
  skills: [
    {
      id: 'valiant_strike', name: 'Valiant Strike', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Slashes an enemy. 35% chance to place DEF Down for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'slash' }],
      statuses: [{ status: 'def_down', turns: 2, chance: 0.35, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'shield_bash', name: 'Shield Bash', tag: 'Single enemy', slot: 2, cooldown: 3,
      desc: 'Bashes an enemy with the shield. 75% chance to Stun for 1 turn.',
      target: 'enemy', anim: 'attack2', approach: 'melee',
      hits: [{ mult: 1.3, fx: 'bash' }],
      statuses: [{ status: 'stun', turns: 1, chance: 0.75, to: 'targets' }],
      shake: 3,
      ai: { priority: 2 },
    },
    {
      id: 'aegis_oath', name: 'Aegis Oath', tag: 'All allies', slot: 3, cooldown: 4,
      desc: "Raises the blade to the dawn: Shields all allies (20% of Aldric's max HP) and grants DEF Up for 2 turns. Aldric Taunts for 2 turns.",
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'holy' }],
      statuses: [
        { status: 'shield', turns: 2, to: 'allies', value: 0.2 },
        { status: 'def_up', turns: 2, to: 'allies' },
        { status: 'taunt', turns: 2, to: 'self' },
      ],
      castFx: 'cast_gold',
      ai: { priority: 3 },
    },
  ],
};
