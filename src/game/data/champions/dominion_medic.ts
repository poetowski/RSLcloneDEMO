import { ChampionDef } from '../types';

// The Dominion Medic (docs/DESIGN_DECISIONS.md section 17, Jakub's brief of
// 2026-10-12): a Common, Support, Tide. His kit is one skill, an A1 that heals
// every ally by 10% of his own max HP; "nothing else". A field medic with no
// weapon, a tunic in red and black stripes, healing potions round his waist.
// Read by the game: his faction is the Sanguine Dominion (his name, and the
// Dominion's red and black). Stand-ins until Jakub sets them: the stats (on
// the Common budget, ATK at the floor as he never strikes), the skill's name
// (Tonic) and text, the lore line and the stage whose first clear brings him.
// An A1 that strikes no enemy never answers a blow (no counterattack).
export const dominionMedic: ChampionDef = {
  id: 'dominion_medic',
  name: 'Dominion Medic',
  role: 'Support',
  rarity: 'common',
  affinity: 'tide',
  faction: 'sanguine_dominion',
  color: '#e8727c',
  stats: { hp: 1360, atk: 70, def: 64, spd: 106, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A field medic of the Sanguine Dominion, a power from a world of its own: no weapon, a tunic striped red and black, healing potions hanging round his waist. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'tonic', name: 'Tonic', tag: 'All allies', slot: 1, cooldown: 0,
      desc: "Uncorks a potion from his belt for the whole team: every ally heals by 10% of the Dominion Medic's max HP.",
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'tonic' }],
      healAllies: 0.1,
      healOf: 'caster',
      ai: { priority: 1 },
    },
  ],
};
