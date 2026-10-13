import { ChampionDef } from '../types';

// The Follower (docs/DESIGN_DECISIONS.md section 18, Jakub's brief of
// 2026-10-13): a Common of the Court of Root, Damage, Tide, a wolf on four
// legs in grey, a little wild, with no collar. A1 a single-target attack; A2 a
// single-target attack with a 50% chance to place DEF Down for 2 turns,
// cooldown 4. Stand-ins until Jakub sets them: the stats (on the Common
// budget), the names Snap and Rend and their texts, both multipliers (A1 1.0,
// a plain attack; A2 1.4), the lore line and the stage whose first clear
// brings him.
export const follower: ChampionDef = {
  id: 'follower',
  name: 'Follower',
  role: 'Damage',
  rarity: 'common',
  affinity: 'tide',
  faction: 'court_of_root',
  color: '#a9adb3',
  stats: { hp: 980, atk: 104, def: 56, spd: 114, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A wolf of the Court of Root, which shares a nature and no hierarchy: grey, a little wild, with no collar. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'snap', name: 'Snap', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Darts in and snaps at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'snap' }],
      ai: { priority: 1 },
    },
    {
      id: 'rend', name: 'Rend', tag: 'Single enemy', slot: 2, cooldown: 4,
      desc: 'Leaps on one enemy and tears at its guard, with a 50% chance to place DEF Down for 2 turns. The debuff comes after the hit, so it never weakens the Rend that places it.',
      target: 'enemy', anim: 'skill', approach: 'leap',
      hits: [{ mult: 1.4, fx: 'rend' }],
      statuses: [{ status: 'def_down', turns: 2, chance: 0.5, to: 'targets' }],
      ai: { priority: 2 },
    },
  ],
};
