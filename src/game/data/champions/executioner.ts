import { ChampionDef } from '../types';

// The Executioner (docs/DESIGN_DECISIONS.md section 77, 2026-11-02): a Heroic Damage of the
// Sanguine Dominion, the slot left open in its grid. Jakub asked for suggestions; of the three I
// proposed he chose the second, the Dominion's headsman: "Go with option two, but rename hero to
// 'Executioner'. Make his design wearing white instead of black". A huge masked executioner with
// a broad-bladed axe and chains: a hood with eye holes, a bare scarred torso under a crimson
// tabard with the hexagon, manacles at his belt; the hood and the leathers white on his word.
// The kit is the one proposed: A1 one enemy; A2 one enemy with Slow and ATK Down for 2 turns,
// cooldown 4; A3 one enemy, twice as hard below 30% HP, its cooldown gone when it kills (new
// `resetOnKill`), cooldown 5; a passive of +15% C.DMG.
// Stand-ins until he sets them: Tide, the names Sentence, Shackle, Final Verdict and Grim Duty and
// their texts, the numbers (1.2; 1.2; 2.0 and x2 below 30%), his stats, the lore line, that he is
// summoned, and every detail of his art and effects.
// Read by the game: the debuffs are certain but meet RES like every debuff; a kill is the target
// felled by the skill, and the reset readies Final Verdict for his next turn; +15% C.DMG is a stat
// passive, extra to his stats and in battle only.
export const executioner: ChampionDef = {
  id: 'executioner',
  name: 'Executioner',
  role: 'Damage',
  rarity: 'heroic',
  affinity: 'tide',
  faction: 'sanguine_dominion',
  color: '#e8e2d8',
  stats: { hp: 1250, atk: 124, def: 60, spd: 102, crit: 0.08, critDmg: 1, acc: 0, res: 0 },
  lore: 'The headsman of the Sanguine Dominion, who wears white so that every sentence he carries out shows on him. He has never been asked to strike twice. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'sentence', name: 'Sentence', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A heavy chop of the axe at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.2, fx: 'axe_chop' }],
      shake: 1,
      ai: { priority: 1 },
    },
    {
      id: 'shackle', name: 'Shackle', tag: 'Single enemy', slot: 2, cooldown: 4,
      desc: 'Swings the manacles round on their chain and strikes one enemy with them: places Slow and ATK Down on it for 2 turns.',
      target: 'enemy', anim: 'skill', approach: 'melee',
      hits: [{ mult: 1.2, fx: 'shackle_bind' }],
      statuses: [
        { status: 'spd_down', turns: 2, to: 'targets' },
        { status: 'atk_down', turns: 2, to: 'targets' },
      ],
      ai: { priority: 2 },
    },
    {
      id: 'final_verdict', name: 'Final Verdict', tag: 'Single enemy', slot: 3, cooldown: 5,
      desc: 'Raises the axe high and brings it down on one enemy, twice as hard if it is below 30% HP. If the blow fells it, Final Verdict is ready again on his next turn.',
      target: 'enemy', anim: 'attack3', approach: 'melee',
      hits: [{ mult: 2.0, fx: 'verdict_fall' }],
      execute: { below: 0.3, mult: 2 },
      resetOnKill: true,
      shake: 3,
      ai: { priority: 3 },
    },
  ],
  passive: {
    id: 'grim_duty',
    name: 'Grim Duty',
    desc: 'Always: +15% C.DMG.',
    kind: 'stat',
    stat: 'critDmg',
    value: 0.15,
  },
};
