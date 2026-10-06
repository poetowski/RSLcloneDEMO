import { ChampionDef } from '../types';

export const archer: ChampionDef = {
  id: 'archer',
  name: 'Sylwen',
  title: 'the Wildwood Ranger',
  role: 'Damage',
  rarity: 'rare',
  affinity: 'wild',
  faction: 'wildwood',
  color: '#4a8c40',
  muzzle: [20, 43],
  stats: { hp: 1020, atk: 112, def: 48, spd: 112, crit: 0.22 },
  lore: 'A ranger of the Wildwood who can split a falling snowflake at a hundred paces. Her arrows are fletched with feathers from birds she has never let go hungry.',
  skills: [
    {
      id: 'swift_shot', name: 'Swift Shot', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Looses a quick arrow at an enemy.',
      target: 'enemy', anim: 'attack1', approach: 'ranged',
      hits: [{ mult: 1.05, fx: 'hit' }],
      projectile: 'arrow',
      ai: { priority: 1 },
    },
    {
      id: 'venom_arrow', name: 'Venom Arrow', tag: 'Single enemy', slot: 2, cooldown: 3,
      desc: 'A kneeling shot with a venom-tipped arrow. Places Poison for 3 turns and has a 50% chance to place SPD Down for 2 turns.',
      target: 'enemy', anim: 'attack2', approach: 'ranged',
      hits: [{ mult: 1.1, fx: 'poison' }],
      projectile: 'arrow_venom',
      statuses: [
        { status: 'poison', turns: 3, to: 'targets' },
        { status: 'spd_down', turns: 2, chance: 0.5, to: 'targets' },
      ],
      ai: { priority: 2 },
    },
    {
      id: 'arrow_rain', name: 'Arrow Rain', tag: 'All enemies', slot: 3, cooldown: 4,
      desc: 'Fires a volley into the sky that rains on all enemies and decreases their Turn Meter by 15%.',
      target: 'enemies', anim: 'attack3', approach: 'ranged',
      hits: [{ mult: 0.8, fx: 'hit' }],
      tmTargets: -15,
      ai: { priority: 3 },
    },
  ],
};
