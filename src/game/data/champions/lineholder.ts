import { ChampionDef } from '../types';

// The Lineholder (docs/DESIGN_DECISIONS.md section 13, Jakub's brief of
// 2026-10-11): a Common of the Azure Crown, Tank, Tide. A1 Guard Cut; A2
// Brace, DEF Up on himself for 2 turns. A big man with a big dark-blue shield
// bearing two small crowns, a dark iron mace on a wooden haft, a blue helmet
// like the Skirmisher's, dark clothes with some blue stripes. Stand-ins until
// Jakub sets them: the stats (on the Common budget), Guard Cut's text and
// multiplier (one blow, damage only), Brace's cooldown and text, the lore line
// and the stage whose first clear brings him.
export const lineholder: ChampionDef = {
  id: 'lineholder',
  name: 'Lineholder',
  role: 'Tank',
  rarity: 'common',
  affinity: 'tide',
  faction: 'azure_crown',
  color: '#6f8fd8',
  stats: { hp: 1320, atk: 78, def: 72, spd: 92, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A shield-bearer of the Azure Crown, a power from a world of its own: a big man behind a big shield, the Crown\'s two crowns on its face, a mace of dark iron on a wooden haft. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'guard_cut', name: 'Guard Cut', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Keeps the shield up and strikes one enemy with the mace over its rim.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'mace_blow' }],
      ai: { priority: 1 },
    },
    {
      id: 'brace', name: 'Brace', tag: 'Self', slot: 2, cooldown: 3,
      desc: 'Sets his feet behind the shield: the Lineholder gains DEF Up for 2 turns.',
      target: 'self', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'brace_dust' }],
      statuses: [{ status: 'def_up', turns: 2, to: 'self' }],
      ai: { priority: 2 },
    },
  ],
};
