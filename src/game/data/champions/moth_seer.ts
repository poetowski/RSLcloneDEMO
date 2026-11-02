import { ChampionDef } from '../types';

// The Moth Seer (docs/DESIGN_DECISIONS.md section 70, 2026-11-02, my design on Jakub's
// word: "3 new elite for court of root"): an Elite Support of the Court of Root, Bloom;
// a slender figure in a bark mask with great pale moth wings and a lantern of fireflies.
// Its name, kit, numbers, affinity and look stand in until Jakub sets them. It is
// summoned.
export const mothSeer: ChampionDef = {
  id: 'moth_seer',
  name: 'Moth Seer',
  role: 'Support',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'court_of_root',
  color: '#d8cfae',
  muzzle: [16, 46],
  stats: { hp: 1260, atk: 88, def: 62, spd: 112, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'Nobody in the Court of Root knows whether the Moth Seer was a person who grew wings or a moth that learned to stand. It carries a lantern of fireflies, wears a mask of bark, and goes wherever the light is failing. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'dust_wing', name: 'Dust Wing', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'One beat of the wings sends a puff of dust at one enemy, with a 30% chance of ATK Down for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 0.9, fx: 'moth_strike' }],
      projectile: 'moth_puff',
      statuses: [{ status: 'atk_down', turns: 1, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'night_powder', name: 'Night Powder', tag: 'All allies', slot: 2, cooldown: 4,
      desc: 'Spreads its wings over its line: one debuff comes off every ally, and every other ally gains 20% Turn Meter. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'night_powder' }],
      cleanse: true,
      tmAllies: 20,
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'soft_powder',
    name: 'Soft Powder',
    desc: 'When an enemy skill damages an ally, the Moth Seer included, and leaves it standing, a 30% chance to place Regen on that ally for 1 turn.',
    kind: 'ward',
    value: 0,
    chance: 0.3,
    statuses: [{ status: 'regen', turns: 1 }],
    fx: 'soft_powder',
  },
};
