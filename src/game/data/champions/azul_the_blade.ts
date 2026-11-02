import { ChampionDef } from '../types';

// Azul the Blade (docs/DESIGN_DECISIONS.md section 74, Jakub's brief of
// 2026-11-02): a Heroic of the Azure Crown, Damage, Ember. A very skilled human
// swordsman with a long thin magic rapier, no helmet, ceremonial plate armour in
// golden and azure colours, "be creative with detail", magic sparks round the
// sword. The kit is his: "A1 - attack single target. Debuff target with defense
// down for 1 turn. High multiplier. A2 - attack single enemy three times. Each
// hit has 50% chance to remove target turn meter by 10%. CD 3. A3 - attacks all
// enemies. Buff all allies with attack up for 2 turns. CD 4. A4 passive - this
// champion is immune to debuff attack down."
// Stand-ins until Jakub sets them: the names Piercing Lunge, Threefold Flourish,
// Crown Salute and Duelist's Poise and their texts, the multipliers (1.25, the
// top of the single-target norm for "high"; 0.5 x 3; 0.8 on each enemy), his
// stats (on the Heroic budget), the lore line and every detail of his art and
// effects (section 74).
// Read by the game: DEFENSE DOWN, ATTACK UP and "debuff attack down" are DEF Down,
// ATK Up and ATK Down; the DEF Down is certain but meets RES like every debuff; the
// 50% is rolled on each of A2's three hits, each taking 10% of a full Turn Meter
// off the target (a target already at 0 loses nothing); "all allies" includes him,
// and the ATK Up, placed on his own turn, lasts through his next two; the passive
// never lets ATK Down land on him, and shows IMMUNE.
export const azulTheBlade: ChampionDef = {
  id: 'azul_the_blade',
  name: 'Azul the Blade',
  role: 'Damage',
  rarity: 'heroic',
  affinity: 'ember',
  faction: 'azure_crown',
  color: '#5ab4ff',
  stats: { hp: 1100, atk: 122, def: 60, spd: 112, crit: 0.08, critDmg: 1, acc: 0, res: 0 },
  lore: 'A duellist of the Azure Crown, a power from a world of its own: he goes bareheaded in ceremonial plate of gold and azure, trusting his skill to what a helmet would be for, and his long thin rapier never stops spitting sparks. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'piercing_lunge', name: 'Piercing Lunge', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A lunge of the rapier through the gap in one enemy\'s guard: places DEF Down on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.25, fx: 'lunge_prick' }],
      statuses: [{ status: 'def_down', turns: 1, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'threefold_flourish', name: 'Threefold Flourish', tag: 'Single enemy', slot: 2, cooldown: 3,
      desc: 'Three cuts in a breath at one enemy. Each has a 50% chance to take 10% of its Turn Meter.',
      target: 'enemy', anim: 'attack2', approach: 'melee',
      hits: [{ mult: 0.5, fx: 'flourish_cut' }, { mult: 0.5, fx: 'flourish_rise' }, { mult: 0.5, fx: 'flourish_across' }],
      tmPerHit: { chance: 0.5, amount: 10 },
      ai: { priority: 2 },
    },
    {
      id: 'crown_salute', name: 'Crown Salute', tag: 'All enemies, all allies', slot: 3, cooldown: 4,
      desc: 'A sweep of the rapier that cuts every enemy and sets the line alight: places ATK Up on all allies for 2 turns.',
      target: 'enemies', anim: 'attack3', approach: 'center',
      hits: [{ mult: 0.8, fx: 'salute_arc' }],
      statuses: [{ status: 'atk_up', turns: 2, to: 'allies' }],
      actorFx: 'salute_flare',
      allyFx: 'salute_spark',
      shake: 2,
      ai: { priority: 3 },
    },
  ],
  passive: {
    id: 'duelists_poise',
    name: "Duelist's Poise",
    desc: 'He is immune to ATK Down.',
    kind: 'immune',
    value: 0,
    immuneTo: 'atk_down',
  },
};
