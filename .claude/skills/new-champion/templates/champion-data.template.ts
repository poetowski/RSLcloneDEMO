// TEMPLATE: copy to src/game/data/champions/<id>.ts, register it in
// src/game/data/champions/index.ts (CHAMPIONS order = collection order), and
// keep every number inside src/game/data/norms.ts. The values below are a
// legal epic Bruiser so the file passes the norms as-is.
import { ChampionDef } from '../types';

export const spearwarden: ChampionDef = {
  id: 'spearwarden',
  name: 'Template',
  title: 'the Spear Warden',
  role: 'Bruiser', // Tank | Bruiser | Damage | Support | Control
  rarity: 'epic', // common | uncommon | rare | epic | legendary  (sets the stat budget)
  affinity: 'wild', // force > wild > arcane > force; void is neutral
  faction: 'wildwood', // dawn | clans | wildwood | coven | temple | sunscar
  color: '#4a8c40', // signature hue: name text in the UI; match the art's main ramp
  // muzzle: [24, 46],  // ranged champions only: projectile origin [forward, up] from the feet
  // statScore = hp/12 + atk*1.1 + (def-40)*2.25 + spd*1.3 + crit*300  must land within 5% of the rarity budget
  // (epic 440). This one: 108.3 + 110 + 63 + 135.2 + 22.5 = 439
  stats: { hp: 1300, atk: 100, def: 68, spd: 104, crit: 0.075 },
  lore: 'Two or three sentences in the voice of the world: who they are, what they guard, what they want.',
  skills: [
    {
      // A1: cooldown 0, single 0.9-1.25 total multiplier (AoE 0.5-0.8)
      id: 'template_a1', name: 'Warden Thrust', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Drives the spear into an enemy. 30% chance to place DEF Down for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.05, fx: 'slash' }], // one entry per hit frame of the animation
      statuses: [{ status: 'def_down', turns: 2, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      // A2: cooldown 3, single 1.1-1.6 (AoE 0.5-1.1)
      id: 'template_a2', name: 'Rally the Grove', tag: 'All allies', slot: 2, cooldown: 3,
      desc: 'Raises the spear and rallies the team: all allies gain ATK Up for 2 turns.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'buff' }],
      statuses: [{ status: 'atk_up', turns: 2, to: 'allies' }],
      castFx: 'cast_green',
      ai: { priority: 2 },
    },
    {
      // A3: cooldown 4-5, single 1.3-2.6 (AoE 0.7-1.2); guaranteed hard control only here, 1 turn
      id: 'template_a3', name: 'Thornspear', tag: 'Single enemy, 2 hits', slot: 3, cooldown: 4,
      desc: 'Two driving thrusts. +50% damage against targets below 40% HP.',
      target: 'enemy', anim: 'attack3', approach: 'melee',
      hits: [{ mult: 0.9, fx: 'slash' }, { mult: 1.0, fx: 'hit' }],
      execute: { below: 0.4, mult: 1.5 },
      shake: 3,
      ai: { priority: 3 },
    },
  ],
};
