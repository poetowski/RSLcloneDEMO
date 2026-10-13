import { ChampionDef } from '../types';

// The Walking Bush (docs/DESIGN_DECISIONS.md section 19, Jakub's brief of
// 2026-10-13): a Common of the Court of Root, Tank, Bloom, a small weak ent
// grown from a bush rather than a tree, woody and fat with branches, with no
// need of a head, who attacks with his root hands. A1 a single-target attack;
// A2 DEF Up on himself and on one chosen ally for 1 turn, cooldown 3. Stand-ins
// until Jakub sets them: the stats (on the Common budget), the names Root Lash
// and Thicket and their texts, A1's multiplier (1.0, a plain attack), the lore
// line and the stage whose first clear brings him. Read by the game: the chosen
// ally is someone else while anyone else stands (battle.ts `validTargets`).
export const walkingBush: ChampionDef = {
  id: 'walking_bush',
  name: 'Walking Bush',
  role: 'Tank',
  rarity: 'common',
  affinity: 'bloom',
  faction: 'court_of_root',
  color: '#b49064',
  stats: { hp: 1400, atk: 74, def: 70, spd: 90, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A walking bush of the Court of Root, which shares a nature and no hierarchy: a small, weak ent grown from a bush rather than a tree, woody and fat with branches. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'root_lash', name: 'Root Lash', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Lashes one enemy with a root hand.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'root_lash' }],
      ai: { priority: 1 },
    },
    {
      id: 'thicket', name: 'Thicket', tag: 'Self and one ally', slot: 2, cooldown: 3,
      desc: 'Roots himself and draws a thicket up round one chosen ally: DEF Up on the Walking Bush and on that ally for 1 turn.',
      target: 'ally', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'thicket' }],
      statuses: [
        { status: 'def_up', turns: 1, to: 'targets' },
        { status: 'def_up', turns: 1, to: 'self' },
      ],
      ai: { priority: 2 },
    },
  ],
};
