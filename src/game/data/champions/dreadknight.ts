import { ChampionDef } from '../types';

export const dreadknight: ChampionDef = {
  id: 'dreadknight',
  name: 'Vorhaal',
  title: 'the Dread Knight',
  role: 'Bruiser',
  rarity: 'legendary',
  affinity: 'void',
  faction: 'coven',
  color: '#a44cff',
  stats: { hp: 1550, atk: 104, def: 73, spd: 100, crit: 0.06 },
  lore: "Once the Order's greatest knight, Vorhaal bargained with the Coven for a blade that cannot break. It drinks a little of every soul it cuts, and a little of his.",
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
      desc: 'Impales an enemy and drinks their soul, healing Vorhaal by 60% of the damage dealt.',
      target: 'enemy', anim: 'attack2', approach: 'melee',
      hits: [{ mult: 1.45, fx: 'slash_violet' }],
      lifesteal: 0.6,
      ai: { priority: 2 },
    },
    {
      id: 'dread_sweep', name: 'Dread Sweep', tag: 'All enemies', slot: 3, cooldown: 4,
      desc: 'A rising sweep that sends a wave of dread through all enemies. 60% chance to place DEF Down for 2 turns.',
      target: 'enemies', anim: 'attack3', approach: 'center',
      hits: [{ mult: 1.05, fx: 'shockwave' }],
      statuses: [{ status: 'def_down', turns: 2, chance: 0.6, to: 'targets' }],
      shake: 5,
      ai: { priority: 3 },
    },
  ],
};
