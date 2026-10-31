import { ChampionDef } from '../types';

// Dead Knight Amstron (docs/DESIGN_DECISIONS.md section 39, Jakub's brief of
// 2026-10-31): a Heroic of the Ashveil Reign, its first, Tank, Ember. Full plate
// in red and crimson, big shoulders, no helmet, only a skull; a spear and a tower
// shield with white emblems. The kit is his: "A1 - attack 1 target, place SPEED
// DOWN for 1 turn. A2 - attack 1 target, place ATTACK DOWN and DEFENSE DOWN for 2
// turns. has 50% chance to STUN target for 1 turn. CD 3 turns. A3 - Grant all
// allies DEFENSE UP for 2 turns, heal every ally by 15% of their MAX HP and place
// shield on each ally for 2 turns valued at 20% of this champion max hp. CD 4
// turns. A4 passive - This champion is immune to DEFENSE DOWN debuff."
// His word the same day: "A2 lower amstron chance for stun to 40%".
// Stand-ins until Jakub sets them: the names Hobbling Thrust, Grave Pierce, Last
// Bastion and Unbreached Plate and their texts, the multipliers (1.0; 1.2), his
// stats (on the Heroic budget) and the lore line.
// Read by the game: SPEED DOWN, ATTACK DOWN and DEFENSE DOWN are Slow, ATK Down and
// DEF Down, certain but meeting RES like every debuff; A3 strikes no one; "all
// allies" and "every ally" include him; each ally's heal is a share of its own max
// HP, each Shield a share of his; the AI keeps A3 until an ally is hurt or afflicted.
export const deadKnightAmstron: ChampionDef = {
  id: 'dead_knight_amstron',
  name: 'Dead Knight Amstron',
  role: 'Tank',
  rarity: 'heroic',
  affinity: 'ember',
  faction: 'ashveil_reign',
  color: '#dc3024',
  stats: { hp: 1560, atk: 94, def: 78, spd: 94, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A knight of the Ashveil Reign who has not noticed his own death: a bare skull over full plate in red and crimson, great shoulders, a long spear, a tower shield with white emblems. He still holds the line he was given. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'hobbling_thrust', name: 'Hobbling Thrust', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A thrust of the spear at one enemy that places Slow on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'dead_thrust' }],
      statuses: [{ status: 'spd_down', turns: 1, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'grave_pierce', name: 'Grave Pierce', tag: 'Single enemy', slot: 2, cooldown: 3,
      desc: 'The spear driven down through one enemy: places ATK Down and DEF Down on it for 2 turns, with a 40% chance of Stun for 1 turn.',
      target: 'enemy', anim: 'attack2', approach: 'melee',
      hits: [{ mult: 1.2, fx: 'grave_pierce' }],
      statuses: [
        { status: 'atk_down', turns: 2, to: 'targets' },
        { status: 'def_down', turns: 2, to: 'targets' },
        { status: 'stun', turns: 1, chance: 0.4, to: 'targets' },
      ],
      shake: 2,
      ai: { priority: 2 },
    },
    {
      id: 'last_bastion', name: 'Last Bastion', tag: 'All allies', slot: 3, cooldown: 4,
      desc: 'He grounds the shield and raises the spear: places DEF Up on all allies for 2 turns, heals each by 15% of its max HP and places a Shield worth 20% of his max HP on each for 2 turns.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'bastion_ward' }],
      statuses: [
        { status: 'def_up', turns: 2, to: 'allies' },
        { status: 'shield', turns: 2, value: 0.2, to: 'allies' },
      ],
      healAllies: 0.15,
      actorFx: 'bastion_call',
      ai: { priority: 3, when: 'allyHurt' },
    },
  ],
  passive: {
    id: 'unbreached_plate',
    name: 'Unbreached Plate',
    desc: 'He is immune to DEF Down.',
    kind: 'immune',
    value: 0,
    immuneTo: 'def_down',
  },
};
