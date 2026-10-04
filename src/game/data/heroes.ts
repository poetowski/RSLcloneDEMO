// The six heroes of the proof of concept. Stats are placeholders tuned so a
// battle lasts ~10-14 turns; the kits are what matter here.
import { HeroDef } from './types';

export const KNIGHT: HeroDef = {
  id: 'knight',
  name: 'Sir Aldric',
  title: 'the Lionguard',
  role: 'Tank',
  faction: 'Order of Dawn',
  color: '#4f8ae6',
  stats: { hp: 1500, atk: 78, def: 95, spd: 98, crit: 0.1 },
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
      desc: 'Raises the blade to the dawn: Shields all allies (15% of Aldric\'s max HP) and grants DEF Up for 2 turns. Aldric Taunts for 2 turns.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'holy' }],
      statuses: [
        { status: 'shield', turns: 2, to: 'allies', value: 0.15 },
        { status: 'def_up', turns: 2, to: 'allies' },
        { status: 'taunt', turns: 2, to: 'self' },
      ],
      castFx: 'cast_gold',
      ai: { priority: 3 },
    },
  ],
};

export const WARRIOR: HeroDef = {
  id: 'warrior',
  name: 'Brakka Ironhide',
  title: 'the Berserker',
  role: 'Damage',
  faction: 'Clans of the North',
  color: '#d9443f',
  stats: { hp: 1200, atk: 120, def: 55, spd: 104, crit: 0.2 },
  skills: [
    {
      id: 'rending_chop', name: 'Rending Chop', tag: 'Single enemy, 2 hits', slot: 1, cooldown: 0,
      desc: 'Chops an enemy twice with both axes.',
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
      id: 'skullsplitter', name: 'Skullsplitter', tag: 'Single enemy', slot: 3, cooldown: 4,
      desc: 'Leaps onto an enemy with a crushing double slam. +50% damage against targets below 50% HP. Places DEF Down for 2 turns.',
      target: 'enemy', anim: 'attack3', approach: 'leap',
      hits: [{ mult: 2.2, fx: 'crack' }],
      execute: { below: 0.5, mult: 1.5 },
      statuses: [{ status: 'def_down', turns: 2, to: 'targets' }],
      shake: 6,
      ai: { priority: 3 },
    },
  ],
};

export const ARCHER: HeroDef = {
  id: 'archer',
  name: 'Sylwen',
  title: 'the Wildwood Ranger',
  role: 'Damage',
  faction: 'Wildwood',
  color: '#4a8c40',
  stats: { hp: 1020, atk: 112, def: 48, spd: 112, crit: 0.22 },
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

export const FROSTMAGE: HeroDef = {
  id: 'frostmage',
  name: 'Ysolde',
  title: 'the Frost Witch',
  role: 'Control',
  faction: 'Frostfang Coven',
  color: '#5cc4ea',
  stats: { hp: 1080, atk: 104, def: 50, spd: 108, crit: 0.15 },
  skills: [
    {
      id: 'ice_shard', name: 'Ice Shard', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Hurls a shard of ice. 30% chance to place SPD Down for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'ranged',
      hits: [{ mult: 1.0, fx: 'ice_burst' }],
      projectile: 'ice_shard',
      statuses: [{ status: 'spd_down', turns: 2, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'blizzard', name: 'Blizzard', tag: 'All enemies', slot: 2, cooldown: 3,
      desc: 'Calls ice spikes beneath all enemies. 50% chance to place SPD Down for 2 turns.',
      target: 'enemies', anim: 'attack2', approach: 'ranged',
      hits: [{ mult: 0.75, fx: 'ice_spikes' }],
      statuses: [{ status: 'spd_down', turns: 2, chance: 0.5, to: 'targets' }],
      castFx: 'cast_ice',
      shake: 3,
      ai: { priority: 2 },
    },
    {
      id: 'glacial_prison', name: 'Glacial Prison', tag: 'Single enemy', slot: 3, cooldown: 4,
      desc: 'Encases an enemy in ice, dealing heavy damage and Freezing them for 1 turn.',
      target: 'enemy', anim: 'attack3', approach: 'ranged',
      hits: [{ mult: 1.5, fx: 'ice_burst' }],
      statuses: [{ status: 'freeze', turns: 1, to: 'targets' }],
      castFx: 'cast_ice',
      ai: { priority: 3 },
    },
  ],
};

export const DREADKNIGHT: HeroDef = {
  id: 'dreadknight',
  name: 'Vorhaal',
  title: 'the Dread Knight',
  role: 'Bruiser',
  faction: 'Frostfang Coven',
  color: '#a44cff',
  stats: { hp: 1550, atk: 98, def: 82, spd: 96, crit: 0.12 },
  skills: [
    {
      id: 'cursed_cleave', name: 'Cursed Cleave', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Cleaves an enemy with the runeblade. 30% chance to place ATK Down for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'slash_violet' }],
      statuses: [{ status: 'atk_down', turns: 2, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'soul_rend', name: 'Soul Rend', tag: 'Single enemy', slot: 2, cooldown: 3,
      desc: 'Impales an enemy and drinks their soul, healing Vorhaal by 50% of the damage dealt.',
      target: 'enemy', anim: 'attack2', approach: 'melee',
      hits: [{ mult: 1.45, fx: 'slash_violet' }],
      lifesteal: 0.5,
      ai: { priority: 2 },
    },
    {
      id: 'dread_sweep', name: 'Dread Sweep', tag: 'All enemies', slot: 3, cooldown: 4,
      desc: 'A rising sweep that sends a wave of dread through all enemies. 60% chance to place DEF Down for 2 turns.',
      target: 'enemies', anim: 'attack3', approach: 'center',
      hits: [{ mult: 0.95, fx: 'shockwave' }],
      statuses: [{ status: 'def_down', turns: 2, chance: 0.6, to: 'targets' }],
      shake: 5,
      ai: { priority: 3 },
    },
  ],
};

export const MONK: HeroDef = {
  id: 'monk',
  name: 'Master Tenzo',
  title: 'the Iron Fist',
  role: 'Support',
  faction: 'Temple of the Still Peak',
  color: '#f39432',
  stats: { hp: 1150, atk: 94, def: 60, spd: 116, crit: 0.15 },
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

export const PLAYER_TEAM = [KNIGHT, WARRIOR, ARCHER];
export const ENEMY_TEAM = [DREADKNIGHT, MONK, FROSTMAGE];
export const ALL_HEROES = [...PLAYER_TEAM, ...ENEMY_TEAM];
