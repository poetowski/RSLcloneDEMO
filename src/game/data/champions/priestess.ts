import { ChampionDef } from '../types';

export const priestess: ChampionDef = {
  id: 'priestess',
  name: 'Nefret',
  title: 'the Sun Priestess',
  role: 'Support',
  rarity: 'epic',
  affinity: 'arcane',
  faction: 'sunscar',
  color: '#ffc040',
  muzzle: [54, 56],
  stats: { hp: 1200, atk: 100, def: 65, spd: 110, crit: 0.06 },
  lore: 'High priestess of the burning sun. Nefret carries the dawn in her staff and the noon in her temper; the dynasty\'s dead still rise when she sings.',
  skills: [
    {
      id: 'solar_lance', name: 'Solar Lance', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Fires a shard of sunlight at an enemy. 35% chance to place Burn for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'ranged',
      hits: [{ mult: 1.0, fx: 'fire_burst' }],
      projectile: 'sun_orb',
      statuses: [{ status: 'burn', turns: 2, chance: 0.35, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'dawn_blessing', name: 'Blessing of Dawn', tag: 'All allies', slot: 2, cooldown: 3,
      desc: 'Spreads her wings of light: heals all allies by 15% of their max HP and grants ATK Up for 2 turns.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'heal_sun' }],
      healAllies: 0.15,
      statuses: [{ status: 'atk_up', turns: 2, to: 'allies' }],
      castFx: 'cast_gold',
      ai: { priority: 2 },
    },
    {
      id: 'sun_wrath', name: 'Wrath of the Sun', tag: 'All enemies', slot: 3, cooldown: 4,
      desc: 'Calls pillars of sunfire on all enemies: places Heal Block for 2 turns and has a 60% chance to place Burn for 2 turns.',
      target: 'enemies', anim: 'attack3', approach: 'ranged',
      hits: [{ mult: 0.85, fx: 'fire_pillar' }],
      statuses: [
        { status: 'heal_block', turns: 2, to: 'targets' },
        { status: 'burn', turns: 2, chance: 0.6, to: 'targets' },
      ],
      castFx: 'cast_gold',
      shake: 3,
      ai: { priority: 3 },
    },
  ],
};
