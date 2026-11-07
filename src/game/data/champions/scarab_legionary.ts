import { ChampionDef } from '../types';

// The Scarab Legionary (Jakub's brief, docs/DESIGN_DECISIONS.md section 92,
// 2026-11-07: an Elite Tank of the Sanguine Dominion, "humanoid but not
// human, be very creative and visually consistent"; the name, the look, the
// kit and Tide are my proposal, approved with his "go"). A man-sized beetle
// walking upright: a humped shell over its back lacquered crimson with the
// black hexagon, a horned head with mandibles, a short iron halberd and a
// round iron shield. Bred in the dark under the Dominion's forges. Lacquered
// Shell is a stat passive (+15 DEF, extra to the budget). Stand-ins: the names,
// texts, every number, the stats (on the Elite budget) and the lore line. It
// is summoned.
export const scarabLegionary: ChampionDef = {
  id: 'scarab_legionary',
  name: 'Scarab Legionary',
  role: 'Tank',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'sanguine_dominion',
  color: '#b8323a',
  stats: { hp: 1480, atk: 82, def: 72, spd: 94, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'The Sanguine Dominion breeds them in the dark under its forges and lacquers their shells in its colours. They obey exactly, and they have never once asked why. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'mandible_crush', name: 'Mandible Crush', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Hooks one enemy with the halberd and closes its mandibles on it. A 30% chance to place DEF Down on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'mandible_crush' }],
      statuses: [{ status: 'def_down', turns: 1, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'close_the_shell', name: 'Close the Shell', tag: 'All allies', slot: 2, cooldown: 4,
      desc: 'Hunches under its shell and plants the shield: Taunt on itself for 2 turns, and DEF Up on all allies for 2 turns. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'shell_ward' }],
      statuses: [
        { status: 'taunt', turns: 2, to: 'self' },
        { status: 'def_up', turns: 2, to: 'allies' },
      ],
      actorFx: 'shell_close',
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'lacquered_shell',
    name: 'Lacquered Shell',
    desc: 'In battle the Scarab Legionary always has +15 DEF on top of its stats.',
    kind: 'stat',
    stat: 'def',
    value: 15,
  },
};
