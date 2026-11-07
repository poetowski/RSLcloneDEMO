import { ChampionDef } from '../types';

// The Pikeman (Jakub's brief, docs/DESIGN_DECISIONS.md section 89, 2026-11-07):
// an Elite Damage of the Azure Crown, his idea of a pikeman; the kit, the look
// and Bloom are my proposal, approved with his "all is fine ... go and
// deliver". A veteran of the Crown's pike square: an open helmet with a small
// azure plume, a breastplate over a doublet quartered azure and white with
// puffed, slashed sleeves, a pike nearly twice his height with a Crown pennant
// under its head, a short sword at his hip, stubble. Level Pikes stops a charge:
// it takes Turn Meter from every enemy. Stand-ins: the names, texts, every
// number, the stats (on the Elite budget) and the lore line. He is summoned.
export const pikeman: ChampionDef = {
  id: 'pikeman',
  name: 'Pikeman',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'azure_crown',
  color: '#c9ced8',
  stats: { hp: 1100, atk: 112, def: 60, spd: 104, crit: 0.1, critDmg: 1, acc: 0, res: 0 },
  lore: 'Twenty years in the front rank of the Azure Crown\'s pike square, and every charge that ever came at it stopped a pike\'s length short. He keeps the pennant clean and the point sharper. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'pike_thrust', name: 'Thrust', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Drives the pike into one enemy from a step away.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.15, fx: 'pike_pierce' }],
      ai: { priority: 1 },
    },
    {
      id: 'level_pikes', name: 'Level Pikes', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'Lowers the pike and sweeps it through every enemy, stopping their charge: takes 15% of each one\'s Turn Meter.',
      target: 'enemies', anim: 'attack2', approach: 'center',
      hits: [{ mult: 0.65, fx: 'pike_sweep' }],
      tmTargets: -15,
      shake: 1,
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'set_against_the_charge',
    name: 'Set Against the Charge',
    desc: 'When an enemy skill damages him and leaves him standing, a 30% chance that he takes Counterattack for 1 turn. Then it rests for 1 of his turns.',
    kind: 'ward',
    value: 0,
    self: true,
    chance: 0.3,
    cooldown: 1,
    statuses: [{ status: 'counter', turns: 1 }],
    fx: 'pike_set',
  },
};
