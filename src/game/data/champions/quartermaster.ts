import { ChampionDef } from '../types';

// The Quartermaster (docs/DESIGN_DECISIONS.md section 14, Jakub's brief of
// 2026-10-12): a Common of the Azure Crown, Support, Bloom. A1 a basic hit, not
// strong; A2 heals all allies by 15% of his max HP, then grants 15% Turn Meter
// to the ally with the lowest HP after the heal. A walking stick, brown leather
// clothes, a backpack, a blue insignia on the front. Stand-ins until Jakub sets
// them: the stats (on the Common budget), both skills' names and texts, A1's
// multiplier (0.9, the floor of the norms), A2's cooldown, the lore line and
// the stage whose first clear brings him. Readings: "lowest HP" is the lowest
// share of max HP, and the Turn Meter goes to an ally other than himself (his
// own meter resets as his turn ends).
export const quartermaster: ChampionDef = {
  id: 'quartermaster',
  name: 'Quartermaster',
  role: 'Support',
  rarity: 'common',
  affinity: 'bloom',
  faction: 'azure_crown',
  color: '#c89a68',
  stats: { hp: 1140, atk: 88, def: 64, spd: 104, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'The quartermaster of the Azure Crown, a power from a world of its own: brown leather, a pack on his back, the Crown\'s blue insignia on his chest and a walking stick for the long roads. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'stick_rap', name: 'Stick Rap', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A plain rap of the walking stick at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.9, fx: 'stick_rap' }],
      ai: { priority: 1 },
    },
    {
      id: 'field_rations', name: 'Field Rations', tag: 'All allies', slot: 2, cooldown: 3,
      desc: "Hands out supplies from his pack: every ally heals by 15% of the Quartermaster's max HP. Then the ally with the lowest HP, other than himself, gains 15% Turn Meter.",
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'rations' }],
      healAllies: 0.15,
      healOf: 'caster',
      tmLowestAlly: 15,
      ai: { priority: 2, when: 'allyHurt' },
    },
  ],
};
