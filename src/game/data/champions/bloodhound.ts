import { ChampionDef } from '../types';

// The Bloodhound (docs/DESIGN_DECISIONS.md section 16, Jakub's brief of
// 2026-10-12): a Common of the Sanguine Dominion, Tank, Ember, the first
// champion on four legs: a dog, the Dominion's insignia on his collar. A1 an
// attack; A2 a 1-turn Taunt on cooldown 4 (the norms allow an A2 cooldown of
// 3-4 since). Stand-ins until Jakub sets them: the stats (on the Common
// budget), the names Bite and Bay and their texts, A1's multiplier (1.0, a
// plain attack), the lore line and the stage whose first clear brings him.
export const bloodhound: ChampionDef = {
  id: 'bloodhound',
  name: 'Bloodhound',
  role: 'Tank',
  rarity: 'common',
  affinity: 'ember',
  faction: 'sanguine_dominion',
  color: '#cf7f45',
  stats: { hp: 1300, atk: 82, def: 64, spd: 100, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A hound of the Sanguine Dominion, a power from a world of its own: a big black-and-tan bloodhound with long ears, the Dominion\'s red hexagon on his collar. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'bite', name: 'Bite', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Lunges at one enemy and bites.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'bite' }],
      ai: { priority: 1 },
    },
    {
      id: 'bay', name: 'Bay', tag: 'Self', slot: 2, cooldown: 4,
      desc: 'Bays at the enemy and draws them to himself: the Bloodhound gains Taunt for 1 turn.',
      target: 'self', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'bay' }],
      statuses: [{ status: 'taunt', turns: 1, to: 'self' }],
      ai: { priority: 2 },
    },
  ],
};
