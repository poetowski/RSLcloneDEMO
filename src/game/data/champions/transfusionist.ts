import { ChampionDef } from '../types';

// The Transfusionist (docs/DESIGN_DECISIONS.md section 67, 2026-11-02, my design on
// Jakub's word: "3 more sanguine dominion elites", one per class): an Elite Support
// of the Sanguine Dominion, Tide; a field doctor with a great glass flask of blood on
// her back, a tube running from it to a long brass needle. Blood here means life, so
// she gives it. Her name, kit, numbers, affinity and look stand in until Jakub sets
// them. She is summoned.
export const transfusionist: ChampionDef = {
  id: 'transfusionist',
  name: 'Transfusionist',
  role: 'Support',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'sanguine_dominion',
  color: '#ee6660',
  stats: { hp: 1300, atk: 86, def: 66, spd: 106, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A field doctor of the Sanguine Dominion, whose name means that blood is life, and who has taken the name at its word. What the flask on her back holds was given freely, and she gives it on. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'draw_blood', name: 'Draw Blood', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Pricks one enemy with the long needle, and heals the ally with the lowest max HP but her for 8% of her max HP.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.9, fx: 'needle_prick' }],
      healLowest: 0.08,
      ai: { priority: 1 },
    },
    {
      id: 'open_the_flask', name: 'Open the Flask', tag: 'All allies', slot: 2, cooldown: 5,
      desc: 'Opens the flask to her whole line: every ally, herself included, heals for 15% of their max HP. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'transfusion' }],
      healAllies: 0.15,
      ai: { priority: 2, when: 'allyHurt' },
    },
  ],
  passive: {
    id: 'bedside_rounds',
    name: 'Bedside Rounds',
    desc: 'At the end of her turn, the ally with the lowest max HP other than her gains Regen for 2 turns. Then Bedside Rounds rests for 1 of her turns.',
    kind: 'tend',
    value: 0,
    statuses: [{ status: 'regen', turns: 2 }],
    cooldown: 1,
    others: true,
    fx: 'bedside_drop',
  },
};
