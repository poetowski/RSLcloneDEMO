import { ChampionDef } from '../types';

// The Veil Adept (Jakub's brief, docs/DESIGN_DECISIONS.md section 98,
// 2026-11-07: an Elite Damage of the Ashveil Reign, "a dark adept", two
// skills; the name, the look and the kit are my proposal, approved with his
// "go"). A slender woman in a high-collared black robe, a veil of grey ash-cloth
// over her face with the violet light showing through at the eyes, bone bangles
// on her bare forearms, the Reign's white bone pinned at her throat; her shadow
// on the floor is darker than anyone's and lags behind her. Shadow Feast is her
// shadow rising under the enemy. No passive. Stand-ins: the names, texts, every
// number, the affinity, the stats (on the Elite budget) and the lore line.
// Summoned.
export const veilAdept: ChampionDef = {
  id: 'veil_adept',
  name: 'Veil Adept',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'ashveil_reign',
  color: '#8a6ab8',
  muzzle: [29, 45],
  stats: { hp: 1120, atk: 112, def: 56, spd: 106, crit: 0.1, critDmg: 1, acc: 0, res: 0 },
  lore: 'The adepts of the Ashveil Reign give up their faces to the veil and their shadows to the dark. Hers took to it better than she did: it is hungry, and it does not always wait for her. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'veilfire', name: 'Veilfire', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Casts a bolt of black fire from her palm at one enemy. A 30% chance to place DEF Down on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1.0, fx: 'veilfire_burst' }],
      projectile: 'veilfire_bolt',
      statuses: [{ status: 'def_down', turns: 1, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'shadow_feast', name: 'Shadow Feast', tag: 'Single enemy', slot: 2, cooldown: 4,
      desc: 'Her shadow rises from the floor under one enemy and bites it twice. She heals by 30% of the damage dealt, and places Heal Block on it for 2 turns.',
      target: 'enemy', anim: 'skill', approach: 'none',
      hits: [{ mult: 0.7, fx: 'shadow_bite' }, { mult: 0.7, fx: 'shadow_bite_back' }],
      statuses: [{ status: 'heal_block', turns: 2, to: 'targets' }],
      lifesteal: 0.3,
      castFx: 'cast_violet',
      ai: { priority: 2 },
    },
  ],
};
