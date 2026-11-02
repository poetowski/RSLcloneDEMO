import { ChampionDef } from '../types';

// Lycan (docs/DESIGN_DECISIONS.md section 75, Jakub's brief of 2026-11-02): a Heroic
// Damage of the Ashveil Reign, Tide. His words: "Name 'Lycan'. Define creative
// lycanthrope design and kit which heals from damage output and speed buff debuff."
// So the design and the kit are mine and stand in until he sets them: a hunched
// lycanthrope of ash-grey fur, a soldier of the Reign gone to the wolf, pale eyes and a
// broken shackle on his wrist; A1 two claw rakes that heal him by a share of the damage
// they deal; A2 a howl that strikes every enemy, slows them and speeds his own side,
// healing him from the damage as well; A3 a leaping maul on one enemy, harder on the
// wounded, healing him by half of what it deals; a passive that gives him SPD Up the
// first time he drops below 40% HP. Names, texts, numbers, stats, the lore line and
// that he is summoned are all stand-ins.
// Read by the game: the healing is a share of the damage a skill actually deals (a
// target's Shield soaks first, and what it soaks heals nothing), for each target the
// skill strikes; "all allies" includes him; the Slow is certain but meets RES like every
// debuff; the maul's bonus is the execute of the War Tigress's Blood Pounce.
export const lycan: ChampionDef = {
  id: 'lycan',
  name: 'Lycan',
  role: 'Damage',
  rarity: 'heroic',
  affinity: 'tide',
  faction: 'ashveil_reign',
  color: '#9a90c8',
  stats: { hp: 1200, atk: 118, def: 58, spd: 114, crit: 0.06, critDmg: 1, acc: 0, res: 0 },
  lore: 'A soldier of the Ashveil Reign who was bitten and never buried: he hunts in the dark with the Reign\'s ragged colours still round his waist and a broken shackle on his wrist, and what he tears from his prey keeps him on his feet. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'ravening_claws', name: 'Ravening Claws', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Rakes one enemy with both claws, one after the other. He heals by 25% of the damage dealt.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.55, fx: 'lycan_rake' }, { mult: 0.55, fx: 'lycan_rake_back' }],
      lifesteal: 0.25,
      ai: { priority: 1 },
    },
    {
      id: 'hunters_howl', name: "Hunter's Howl", tag: 'All enemies, all allies', slot: 2, cooldown: 4,
      desc: 'Howls at the moon: the sound strikes every enemy and places Slow on it for 2 turns, and SPD Up for 2 turns goes to all allies. He heals by 30% of the damage dealt.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0.5, fx: 'howl_hit' }],
      statuses: [
        { status: 'spd_down', turns: 2, to: 'targets' },
        { status: 'spd_up', turns: 2, to: 'allies' },
      ],
      lifesteal: 0.3,
      actorFx: 'howl_rings',
      allyFx: 'pack_spur',
      ai: { priority: 2 },
    },
    {
      id: 'moonlit_maul', name: 'Moonlit Maul', tag: 'Single enemy', slot: 3, cooldown: 5,
      desc: 'Leaps on one enemy and mauls it, half as hard again if it is below 40% HP. He heals by 50% of the damage dealt.',
      target: 'enemy', anim: 'attack3', approach: 'leap',
      hits: [{ mult: 1.5, fx: 'maul_bite' }],
      execute: { below: 0.4, mult: 1.3 },
      lifesteal: 0.5,
      shake: 3,
      ai: { priority: 3 },
    },
  ],
  passive: {
    id: 'moon_mad',
    name: 'Moon-Mad',
    desc: 'The first time Lycan drops below 40% HP, he gains SPD Up for 2 turns.',
    kind: 'overdrive',
    value: 0.4,
    statuses: [{ status: 'spd_up', turns: 2 }],
    holderFx: 'moon_mad',
  },
};
