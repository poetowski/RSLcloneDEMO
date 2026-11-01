import { ChampionDef } from '../types';

// Sir Siroslav (docs/DESIGN_DECISIONS.md section 64, Jakub's brief of
// 2026-11-01: "Name: Sir Siroslav. Faction sanguine dominion. Role support.
// Affinity balance yourself per faction role. Rarity elite be very creative and
// consistent", and mid-build "His rarity must be heroic. Change if needed and
// redesign"): a Heroic Support of the Sanguine Dominion, the roster's first
// Heroic Support. A winged knight-commander: a crimson coat under a black
// breastplate with the red hexagon, a fur cap with a jewelled plume, the great
// feathered wings of his banner rising from his back, a commander's mace (a
// bulawa) in his hand. Sanguine is life (DESIGN_DECISIONS.md 3.2), so he
// commands and revives his line. Ember, which the Dominion's Supports (all Tide)
// did not have. The kit gives Counterattack to a whole side for the first time.
// Stand-ins until Jakub sets them: the kit, its names and numbers, the stats, the
// lore line and the art.
export const sirSiroslav: ChampionDef = {
  id: 'sir_siroslav',
  name: 'Sir Siroslav',
  role: 'Support',
  rarity: 'heroic',
  affinity: 'ember',
  faction: 'sanguine_dominion',
  color: '#d94848',
  stats: { hp: 1360, atk: 92, def: 68, spd: 110, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'Sir Siroslav has led the Dominion\'s winged horse in more charges than he has grey hairs in his moustache, and he has a great many. On foot, without his horse, he still leads: where his mace points, the line holds, and where his wings pass, the tired get up. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'mace_of_command', name: 'Mace of Command', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Strikes one enemy with his commander\'s mace, and gives 15% Turn Meter to the ally lowest on HP.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'bulawa_strike' }],
      tmLowestAlly: 15,
      ai: { priority: 1 },
    },
    {
      id: 'hold_the_line', name: 'Hold the Line', tag: 'All allies', slot: 2, cooldown: 4,
      desc: 'Raises his mace and calls the line to hold: places DEF Up on all allies for 2 turns and Counterattack for 1 turn. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'line_held' }],
      statuses: [
        { status: 'def_up', turns: 2, to: 'allies' },
        { status: 'counter', turns: 1, to: 'allies' },
      ],
      actorFx: 'command_call',
      ai: { priority: 2 },
    },
    {
      id: 'winged_charge', name: 'Winged Charge', tag: 'All allies', slot: 3, cooldown: 5,
      desc: 'Spreads his wings and sounds the charge: heals all allies by 15% of their max HP, places SPD Up on them for 2 turns, and fills every other ally\'s Turn Meter by 15%. No attack.',
      target: 'allies', anim: 'ritual', approach: 'none',
      hits: [{ mult: 0, fx: 'charge_feathers' }],
      healAllies: 0.15,
      statuses: [{ status: 'spd_up', turns: 2, to: 'allies' }],
      tmAllies: 15,
      actorFx: 'wing_rush',
      ai: { priority: 3, when: 'allyHurt' },
    },
  ],
  passive: {
    id: 'never_retreat',
    name: 'Never Retreat',
    desc: 'The first time he drops below 50% HP, he takes DEF Up and Counterattack for 2 turns. Once a battle.',
    kind: 'overdrive',
    value: 0.5,
    statuses: [
      { status: 'def_up', turns: 2 },
      { status: 'counter', turns: 2 },
    ],
    holderFx: 'command_call',
  },
};
