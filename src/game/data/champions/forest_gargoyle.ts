import { ChampionDef } from '../types';

// The Forest Gargoyle (docs/DESIGN_DECISIONS.md section 38, Jakub's brief of
// 2026-10-31): a Heroic, Tank. "gargoyle carved from wood instead of stone
// material. almost does not move. on idle it can even be static with one small
// tick of head. winged creature. features are sharp leaves." The kit is his: "A1
// - attacks 1 enemy. 35% chance to place stop regeneration for 2 turns on target.
// A2 - attacks all enemies, place ATTACK DOWN for 1 turn. CD 3 turns. A3 - attacks
// one enemy, places SPEED DOWN for 2 turns. Also fully deplets targets turn meter.
// CD 4 turns. motive for a3 - this can be something with being scary. passive -
// places DEFENSE UP for 1 turn on beginning of this champion turns."
// Stand-ins until Jakub sets them: the Court of Root and Bloom (his brief says
// "affinity = root", which is no affinity and names no faction), the names Splinter
// Talon, Razor Gale, Graven Dread and Heartwood and their texts, the multipliers
// (1.0; 0.6 on each enemy; 1.3), his stats (on the Heroic budget) and the lore line.
// Read by the game: "stop regeneration" is Heal Block, which stops Regen and every
// other heal; ATTACK DOWN and SPEED DOWN are ATK Down and Slow, certain but meeting
// RES; the turn meter goes to nothing after A3's hit; the passive's DEF Up is on
// himself, at the start of his turn, a skipped one too, and placed on his own turn
// it lasts until his next one, so it never lapses.
export const forestGargoyle: ChampionDef = {
  id: 'forest_gargoyle',
  name: 'Forest Gargoyle',
  role: 'Tank',
  rarity: 'heroic',
  affinity: 'bloom',
  faction: 'court_of_root',
  color: '#85bb5c',
  stats: { hp: 1650, atk: 90, def: 78, spd: 90, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A gargoyle of the Court of Root, carved from old wood where another would be stone, its wings and crest grown out in leaves as sharp as blades. It hardly moves, until it does. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'splinter_talon', name: 'Splinter Talon', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A sudden rake of wooden claws at one enemy, with a 35% chance of Heal Block for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'talon_rend' }],
      statuses: [{ status: 'heal_block', turns: 2, chance: 0.35, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'razor_gale', name: 'Razor Gale', tag: 'All enemies', slot: 2, cooldown: 3,
      desc: 'One beat of the wings sends sharp leaves through all enemies and places ATK Down on each for 1 turn.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0.6, fx: 'razor_leaves' }],
      statuses: [{ status: 'atk_down', turns: 1, to: 'targets' }],
      actorFx: 'leaf_gale',
      ai: { priority: 2 },
    },
    {
      id: 'graven_dread', name: 'Graven Dread', tag: 'Single enemy', slot: 3, cooldown: 4,
      desc: 'The statue wakes before one enemy, wings wide and eyes alight: a blow that places Slow for 2 turns and empties its Turn Meter.',
      target: 'enemy', anim: 'attack3', approach: 'melee',
      hits: [{ mult: 1.3, fx: 'dread_mask' }],
      statuses: [{ status: 'spd_down', turns: 2, to: 'targets' }],
      tmTargets: -100,
      actorFx: 'dread_howl',
      shake: 2,
      ai: { priority: 3 },
    },
  ],
  passive: {
    id: 'heartwood',
    name: 'Heartwood',
    desc: 'At the start of each of his turns he takes DEF Up for 1 turn.',
    kind: 'brace',
    value: 0,
    statuses: [{ status: 'def_up', turns: 1 }],
    fx: 'heartwood_set',
  },
};
