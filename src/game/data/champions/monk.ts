import { ChampionDef } from '../types';

export const monk: ChampionDef = {
  id: 'monk',
  name: 'Master Tenzo',
  title: 'the Iron Fist',
  role: 'Support',
  rarity: 'epic',
  affinity: 'wild',
  faction: 'temple',
  color: '#f39432',
  stats: { hp: 1150, atk: 94, def: 60, spd: 116, crit: 0.15 },
  lore: 'The last master of the Still Peak temple. Tenzo teaches that a closed fist and an open palm are the same hand; his enemies rarely stay to learn the rest.',
  skills: [
    {
      id: 'flurry', name: 'Flurry of Fists', tag: 'Single enemy, 3 hits', slot: 1, cooldown: 0,
      desc: 'Strikes an enemy three times in rapid succession.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.38, fx: 'chi' }, { mult: 0.38, fx: 'chi' }, { mult: 0.46, fx: 'chi' }],
      ai: { priority: 1 },
    },
    {
      id: 'serenity', name: 'Serenity', tag: 'All allies', slot: 2, cooldown: 3,
      desc: 'Centers his chi: heals all allies by 18% of their max HP, removes one debuff from each and places Regen for 2 turns.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'heal' }],
      healAllies: 0.18,
      cleanse: true,
      statuses: [{ status: 'regen', turns: 2, to: 'allies' }],
      castFx: 'cast_green',
      ai: { priority: 4, when: 'allyHurt' },
    },
    {
      id: 'dragon_kick', name: 'Dragon Kick', tag: 'Single enemy', slot: 3, cooldown: 4,
      desc: 'A flying kick charged with chi. 60% chance to Stun for 1 turn.',
      target: 'enemy', anim: 'attack3', approach: 'leap',
      hits: [{ mult: 1.9, fx: 'chi' }],
      statuses: [{ status: 'stun', turns: 1, chance: 0.6, to: 'targets' }],
      shake: 4,
      ai: { priority: 3 },
    },
  ],
};
