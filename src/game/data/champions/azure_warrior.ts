import { ChampionDef } from '../types';

// The starter (docs/DESIGN_DECISIONS.md 4.1). Rarity, role, faction, affinity
// and when he joins are Jakub's decisions. His name, personality, backstory,
// kit and art are not designed yet: until they are, the proof of concept's
// berserker stands in for the body, the stats and the skills (renamed plainly).
export const azureWarrior: ChampionDef = {
  id: 'azure_warrior',
  name: 'Azure Warrior',
  title: 'name to come',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'azure_crown',
  color: '#4f8ae6',
  stats: { hp: 1150, atk: 118, def: 62, spd: 104, crit: 0.1 },
  lore: 'A warrior of the Azure Crown, a power from a world of its own. He joins from the start, and his job is to teach how damage works. His name, personality and backstory are still open.',
  skills: [
    {
      id: 'strike', name: 'Strike', tag: 'Single enemy, 2 hits', slot: 1, cooldown: 0,
      desc: 'Hits an enemy twice.',
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
      id: 'leaping_blow', name: 'Leaping Blow', tag: 'Single enemy', slot: 3, cooldown: 4,
      desc: 'Leaps onto an enemy for one heavy blow. +50% damage against targets below 50% HP. Places DEF Down for 2 turns.',
      target: 'enemy', anim: 'attack3', approach: 'leap',
      hits: [{ mult: 2.2, fx: 'crack' }],
      execute: { below: 0.5, mult: 1.5 },
      statuses: [{ status: 'def_down', turns: 2, to: 'targets' }],
      shake: 6,
      ai: { priority: 3 },
    },
  ],
};
