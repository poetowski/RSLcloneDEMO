import { ChampionDef } from '../types';

// The second champion (docs/DESIGN_DECISIONS.md 4.2). Rarity, role, faction,
// affinity and when she joins are Jakub's decisions. Her name, personality,
// backstory, the reason she joins, her kit and her art are not designed yet:
// until they are, the proof of concept's sun priestess stands in for the
// body, the stats and the skills (renamed plainly).
export const sanguineSupport: ChampionDef = {
  id: 'sanguine_support',
  name: 'Sanguine Support',
  title: 'name to come',
  role: 'Support',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'sanguine_dominion',
  color: '#e0505a',
  muzzle: [54, 56],
  stats: { hp: 1200, atk: 100, def: 65, spd: 110, crit: 0.06 },
  lore: 'A champion of the Sanguine Dominion, a power from a world of its own. She joins after the first battle, and her job is to teach sustain. Her name, personality, backstory and the reason she joins are still open.',
  skills: [
    {
      id: 'bolt', name: 'Bolt', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Fires a bolt at an enemy. 35% chance to place Burn for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'ranged',
      hits: [{ mult: 1.0, fx: 'fire_burst' }],
      projectile: 'sun_orb',
      statuses: [{ status: 'burn', turns: 2, chance: 0.35, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'mending', name: 'Mending', tag: 'All allies', slot: 2, cooldown: 3,
      desc: 'Heals all allies by 15% of their max HP and grants ATK Up for 2 turns.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'heal_sun' }],
      healAllies: 0.15,
      statuses: [{ status: 'atk_up', turns: 2, to: 'allies' }],
      castFx: 'cast_gold',
      ai: { priority: 2 },
    },
    {
      id: 'smite', name: 'Smite', tag: 'All enemies', slot: 3, cooldown: 4,
      desc: 'Strikes all enemies: places Heal Block for 2 turns and has a 60% chance to place Burn for 2 turns.',
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
