import { ChampionDef } from '../types';

// Big Ears (docs/DESIGN_DECISIONS.md section 24, Jakub's proposal of
// 2026-10-17): an Elite of the Court of Root, Damage; a small humanoid with a
// large head and two big ears, blowing poisoned darts at enemies. A1 an attack
// on one enemy with a 35% chance of Poison for 1 turn; A2 Dart Volley, an attack
// on all enemies that places Heal Block on them for 2 turns, cooldown 5 (the
// norms allow an A2 cooldown of 3-5 since); his A3 the passive Hidden in the
// Undergrowth: +15% C.RATE for each dead ally, up to +30%, extra to the stat
// budget and in battle only, like every passive that raises a stat (Jakub,
// 2026-10-12). Stand-ins until Jakub sets them: the affinity (he will set the
// four affinities later), the stats (on the Elite budget), the name Poison Dart
// and the texts, the multipliers (A1 1.0, a plain attack; A2 three breaths of
// 0.2 at every enemy), the lore line and the stage whose first clear brings him.
export const bigEars: ChampionDef = {
  id: 'big_ears',
  name: 'Big Ears',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'court_of_root',
  color: '#c79aa8',
  muzzle: [44, 32],
  stats: { hp: 960, atk: 124, def: 56, spd: 118, crit: 0.05, critDmg: 1, acc: 0, res: 0 },
  lore: 'A small dweller of the undergrowth of the Court of Root, which hides in jungle and forest: a big head, two great ears that miss nothing, and a blowpipe of poisoned darts. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'poison_dart', name: 'Poison Dart', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Blows a poisoned dart at one enemy. A 35% chance to place Poison on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1.0, fx: 'dart_hit' }],
      projectile: 'dart',
      statuses: [{ status: 'poison', turns: 1, chance: 0.35, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'dart_volley', name: 'Dart Volley', tag: 'All enemies', slot: 2, cooldown: 5,
      desc: 'Blows darts at every enemy in three quick breaths, then places Heal Block on all enemies for 2 turns.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0.2, fx: 'dart_hit' }, { mult: 0.2, fx: 'dart_hit' }, { mult: 0.2, fx: 'dart_hit' }],
      projectile: 'dart',
      statuses: [{ status: 'heal_block', turns: 2, to: 'targets' }],
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'hidden_in_the_undergrowth',
    name: 'Hidden in the Undergrowth',
    desc: 'In battle Big Ears gains +15% C.RATE for each fallen ally, up to +30%, on top of his stats.',
    kind: 'fallen',
    stat: 'crit',
    value: 0.15,
    max: 0.3,
  },
};
