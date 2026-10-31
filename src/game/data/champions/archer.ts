import { ChampionDef } from '../types';

// The Archer (Jakub's brief, docs/DESIGN_DECISIONS.md section 43, 2026-10-31,
// the worksheet's recommended options): a Common Damage of the Sanguine
// Dominion, Bloom (abstract: it sets nothing in his look); a lean hunter with
// a short bow in a hunting vest, no helmet, bald with a goatee. One skill: an
// A1 on one enemy that ignores 15% of its Defense. No A2, no passive.
// Stand-ins until Jakub sets them: the skill's name and text, A1's 1.0, the
// stats (the fast option, on the Common budget) and the lore line. He is
// summoned.
export const archer: ChampionDef = {
  id: 'archer',
  name: 'Archer',
  role: 'Damage',
  rarity: 'common',
  affinity: 'bloom',
  faction: 'sanguine_dominion',
  color: '#c8584a',
  muzzle: [27, 52],
  stats: { hp: 960, atk: 112, def: 56, spd: 112, crit: 0.04, critDmg: 1, acc: 0, res: 0 },
  lore: 'A hunter of the Sanguine Dominion who learned to find the soft place under a beast\'s hide, and now finds it under armour. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'piercing_shot', name: 'Piercing Shot', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Looses an arrow at one enemy that ignores 15% of its Defense.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1, fx: 'pierce_shot' }],
      projectile: 'hunt_arrow',
      ignoreDef: 0.15,
      ai: { priority: 1 },
    },
  ],
};
