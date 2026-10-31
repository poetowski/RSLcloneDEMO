import { ChampionDef } from '../types';

// Chief Engineer CJ (docs/DESIGN_DECISIONS.md section 37, Jakub's brief of
// 2026-10-31): a Heroic of the Sanguine Dominion, its first, Tank, Bloom. A fat
// man in a technical engineering suit with a big two-handed hammer that throws
// electrical sparks, a gear belt and an orange safety hat ("weird for settings,
// but he do"); then "make him more fantasy and remove no yolo words", so he is a
// forge-master in a leather apron and his hat an orange helm. The kit is his: "A1
// - hits one target twice. 50% chance to stun target on each hit. remove 10% of
// target turn meter. A2 - buff all allies with DEFENSE UP for 2 turns and REGEN
// for 1 turn. remove all enemies turn meter by 7%. CD 4 turns. A3 - attack all
// enemies. has 35% chance to stun each target separately for 2 turns. place
// shield on the ally with lowest max hp for 2 turns. shield is valued at 15% of
// this champion max hp. CD 4 turns. A4 passive - remove 1 random debuff from
// every ally at the beginning of this champion turn."
// Stand-ins until Jakub sets them: the names Mending Blows, Master's
// Decree, Earthen Surge and Master's Eye and their texts, the multipliers
// (0.5 + 0.5; 0.7 on each enemy, the floor of the norms), the Stun's 1 turn on
// A1, his stats (on the Heroic budget) and the lore line.
// His word the same day: "lower chance of stun to 25% instead of 50% on a1".
// Read by the game: the Stun's 25% is rolled on each of A1's hits and the 10% of
// turn meter comes off once, after the last hit; A2 strikes no enemy, so nothing
// counterattacks it; "all allies" and "every ally" include him; the ally with the
// lowest max HP can be himself, a tie goes to the one lower on HP, then to the
// front; the passive comes before anything ticks, and on a turn he will skip too,
// so if it lifts a lone Stun or Freeze from him he keeps the turn. The debuffs meet
// RES like every other.
export const chiefEngineerCj: ChampionDef = {
  id: 'chief_engineer_cj',
  name: 'Chief Engineer CJ',
  role: 'Tank',
  rarity: 'heroic',
  affinity: 'bloom',
  faction: 'sanguine_dominion',
  color: '#ff8a20',
  stats: { hp: 1600, atk: 90, def: 74, spd: 92, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'Chief engineer of the Sanguine Dominion, a power from a world of its own: a fat, careful forge-master in a great leather apron, an orange helm no one here has seen the like of, a belt of gears and a rune-cut hammer that spits sparks. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'mending_blows', name: 'Mending Blows', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Two blows of the hammer on one enemy, each with a 25% chance of Stun for 1 turn. Takes 10% of its Turn Meter.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.5, fx: 'jolt_blow' }, { mult: 0.5, fx: 'jolt_slam' }],
      statuses: [{ status: 'stun', turns: 1, chance: 0.25, to: 'targets', perHit: true }],
      tmTargets: -10,
      shake: 2,
      ai: { priority: 1 },
    },
    {
      id: 'masters_decree', name: "Master's Decree", tag: 'All allies, all enemies', slot: 2, cooldown: 4,
      desc: 'At his word everyone stops: places DEF Up on all allies for 2 turns and Regen for 1, and takes 7% of the Turn Meter of all enemies. No attack.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'decree_lull' }],
      statuses: [
        { status: 'def_up', turns: 2, to: 'allies' },
        { status: 'regen', turns: 1, to: 'allies' },
      ],
      tmTargets: -7,
      actorFx: 'decree_sigil',
      allyFx: 'decree_ward',
      ai: { priority: 2 },
    },
    {
      id: 'earthen_surge', name: 'Earthen Surge', tag: 'All enemies', slot: 3, cooldown: 4,
      desc: 'Drives the hammer into the ground and the charge runs through all enemies: each has a 35% chance of Stun for 2 turns. Places a Shield worth 15% of his max HP on the ally with the lowest max HP for 2 turns.',
      target: 'enemies', anim: 'attack3', approach: 'none',
      hits: [{ mult: 0.7, fx: 'earth_surge' }],
      statuses: [
        { status: 'stun', turns: 2, chance: 0.35, to: 'targets' },
        { status: 'shield', turns: 2, value: 0.15, to: 'lowestMaxHp' },
      ],
      allyFx: 'surge_plate',
      shake: 3,
      ai: { priority: 3 },
    },
  ],
  passive: {
    id: 'masters_eye',
    name: "Master's Eye",
    desc: 'At the start of his turn, one random debuff is removed from every ally, himself included.',
    kind: 'purge',
    value: 0,
    fx: 'eye_cleared',
  },
};
