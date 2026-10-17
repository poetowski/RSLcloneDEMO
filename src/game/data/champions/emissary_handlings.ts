import { ChampionDef } from '../types';

// Emissary Handlings (docs/DESIGN_DECISIONS.md section 22, Jakub's proposal of
// 2026-10-17): an Elite of the Azure Crown, Tank; a tall human in medium
// armour and a blue cloak, holding a flag banner, no other weapon, a proud
// look. A1 Banner Strike, an attack on one enemy with a 20% chance of Stun;
// A2 Rallying Standard, no attack, DEF Up on all allies for 2 turns, cooldown 5
// (the norms allow an A2 cooldown of 3-5 since); his A3 the passive Unbroken
// Flag: whenever an enemy attacks an ally, a 50% chance of a Shield of 15% of
// his max HP on that ally for 1 turn. Jakub, the same day: the Shield comes
// after the hit, and it can be his own. Stand-ins until Jakub sets them: the
// affinity (he will set the four affinities later), the stats (on the Elite
// budget, a little under it for the passive), the texts, A1's multiplier (1.0,
// a plain attack), the Stun's 1 turn (the norm for control), the lore line and
// the stage whose first clear brings him. Read by the game: an attack is an
// enemy skill that damages the ally, and each ally it struck rolls once per
// skill, however many hits it took.
export const emissaryHandlings: ChampionDef = {
  id: 'emissary_handlings',
  name: 'Emissary Handlings',
  role: 'Tank',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'azure_crown',
  color: '#4f8ae6',
  stats: { hp: 1400, atk: 84, def: 74, spd: 96, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: "An emissary of the Azure Crown, a power from a world of its own: tall, in medium armour and a blue cloak, he carries the Crown's standard and no other weapon, and carries it proudly. Like every champion, a fragment the Archivist recollects.",
  skills: [
    {
      id: 'banner_strike', name: 'Banner Strike', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Swings the pole of his banner into one enemy. A 20% chance to place Stun on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'banner_strike' }],
      statuses: [{ status: 'stun', turns: 1, chance: 0.2, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'rallying_standard', name: 'Rallying Standard', tag: 'All allies', slot: 2, cooldown: 5,
      desc: 'Plants the standard and rallies the line: places DEF Up on all allies for 2 turns. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'rally' }],
      statuses: [{ status: 'def_up', turns: 2, to: 'allies' }],
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'unbroken_flag',
    name: 'Unbroken Flag',
    desc: 'Whenever an enemy attacks an ally, himself included, a 50% chance after the hit to place a Shield of 15% of his max HP on that ally for 1 turn.',
    kind: 'ward',
    value: 0.15,
    chance: 0.5,
    statuses: [{ status: 'shield', turns: 1 }],
  },
};
