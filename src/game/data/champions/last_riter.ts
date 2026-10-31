import { ChampionDef } from '../types';

// The Last Riter (Jakub's brief, docs/DESIGN_DECISIONS.md section 42,
// 2026-10-31, the worksheet's recommended options): a Common Support of the
// Azure Crown, Ember (abstract: it sets nothing in her look); a priestess in
// white under a dark-blue dress with a small gold crown, a big yellow cope
// with its hood up, an ornate casket of olibanum in her hands. She never
// strikes: an A1 that heals her and shields the ally with the lowest max HP
// but her, and an A2 that takes 75% of one enemy's turn meter and heals that
// same ally, cooldown 4. No passive. Stand-ins until Jakub sets them: the
// names and texts of both skills, the stats (the fast option, on the Common
// budget, ATK at the floor) and the lore line. She is summoned.
export const lastRiter: ChampionDef = {
  id: 'last_riter',
  name: 'Last Riter',
  role: 'Support',
  rarity: 'common',
  affinity: 'ember',
  faction: 'azure_crown',
  color: '#e8c04a',
  stats: { hp: 1260, atk: 70, def: 64, spd: 110, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A rite-keeper of the Azure Crown who walks behind its soldiers with a casket of olibanum and says the last rites over those who fall; where her smoke drifts, the dying stand a little longer. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'incense_veil', name: 'Incense Veil', tag: 'Self, one ally', slot: 1, cooldown: 0,
      desc: 'Sweet smoke from the casket: she heals by 10% of her max HP, and the ally other than her with the lowest max HP gains a Shield of the same value for 1 turn. No attack.',
      target: 'self', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'incense_veil' }],
      healSelf: 0.1,
      statuses: [{ status: 'shield', turns: 1, value: 0.1, to: 'lowestMaxHpOther' }],
      ai: { priority: 1 },
    },
    {
      id: 'last_unction', name: 'Last Unction', tag: 'Single enemy, one ally', slot: 2, cooldown: 4,
      desc: 'She opens the casket and its smoke drifts over one enemy, taking 75% of its Turn Meter. The ally other than her with the lowest max HP heals by 30% of her max HP. No attack.',
      target: 'enemy', anim: 'attack2', approach: 'none',
      hits: [{ mult: 0, fx: 'unction_smoke' }],
      tmTargets: -75,
      healLowest: 0.3,
      ai: { priority: 2 },
    },
  ],
};
