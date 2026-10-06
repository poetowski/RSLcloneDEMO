import { ChampionDef } from '../types';

export const sunspear: ChampionDef = {
  id: 'sunspear',
  name: 'Imara',
  title: 'the Sunspear',
  role: 'Bruiser',
  rarity: 'epic',
  affinity: 'force',
  faction: 'nyota',
  color: '#ff5fb0',
  muzzle: [40, 67],
  stats: { hp: 1350, atk: 108, def: 68, spd: 106, crit: 0.15 },
  lore: 'Captain of the Spear Guard of Nyota. Imara dances the old spear forms with a blade of hard light, and no stranger climbs the Baobab Steps without answering to her.',
  skills: [
    {
      id: 'sunspear_flurry', name: 'Sunspear Flurry', tag: 'Single enemy, 2 hits', slot: 1, cooldown: 0,
      desc: "Two quick thrusts of the hard-light spear. 50% chance to raise a Shield worth 10% of Imara's max HP for 2 turns.",
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.55, fx: 'spear_thrust' }, { mult: 0.55, fx: 'spear_thrust' }],
      statuses: [{ status: 'shield', turns: 2, chance: 0.5, to: 'self', value: 0.1 }],
      ai: { priority: 1 },
    },
    {
      id: 'spear_spiral', name: 'Spiral of Spears', tag: 'All enemies, 2 hits', slot: 2, cooldown: 3,
      desc: 'Spins through the enemy line with the spear blazing, hitting all enemies twice. 40% chance to place DEF Down for 2 turns.',
      target: 'enemies', anim: 'attack2', approach: 'center',
      hits: [{ mult: 0.45, fx: 'spear_spiral' }, { mult: 0.45, fx: 'spear_spiral' }],
      statuses: [{ status: 'def_down', turns: 2, chance: 0.4, to: 'targets' }],
      shake: 2,
      ai: { priority: 2 },
    },
    {
      id: 'sunfall_javelin', name: 'Sunfall Javelin', tag: 'Single enemy', slot: 3, cooldown: 4,
      desc: 'Leaps high and hurls the spear like a falling star: heavy damage, and Weaken for 2 turns.',
      target: 'enemy', anim: 'attack3', approach: 'ranged',
      hits: [{ mult: 2.0, fx: 'javelin_burst' }],
      projectile: 'sun_javelin',
      statuses: [{ status: 'weaken', turns: 2, to: 'targets' }],
      shake: 4,
      ai: { priority: 3 },
    },
  ],
};
