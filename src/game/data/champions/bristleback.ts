import { ChampionDef } from '../types';

// The Bristleback (docs/DESIGN_DECISIONS.md section 51, Jakub's "go" of 2026-11-01
// to fill the Court of Root's last Commons): my proposal, built on that word; a
// heavy old boar on four legs, moss and a sapling growing on his back. Stand-ins
// until Jakub sets them: all of it (the name, the kit, Tide, the numbers, the lore
// line, the art). Two skills at most, on his word mid-build, so no passive. He is
// summoned.
export const bristleback: ChampionDef = {
  id: 'bristleback',
  name: 'Bristleback',
  role: 'Tank',
  rarity: 'common',
  affinity: 'tide',
  faction: 'court_of_root',
  color: '#7a5c3c',
  stats: { hp: 1400, atk: 78, def: 70, spd: 92, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'An old boar of the Court of Root who has stood still so often that the forest has begun to grow on him. He does not mind. He minds being pushed. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'tusk_gore', name: 'Tusk Gore', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A hooking thrust of the tusks at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1, fx: 'tusk_gore' }],
      ai: { priority: 1 },
    },
    {
      id: 'dig_in', name: 'Dig In', tag: 'Self', slot: 2, cooldown: 4,
      desc: 'He plants his feet and snorts: Taunt for 1 turn and DEF Up for 2 turns on himself. No attack.',
      target: 'self', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'dig_in' }],
      statuses: [
        { status: 'taunt', turns: 1, to: 'self' },
        { status: 'def_up', turns: 2, to: 'self' },
      ],
      ai: { priority: 2 },
    },
  ],
};
