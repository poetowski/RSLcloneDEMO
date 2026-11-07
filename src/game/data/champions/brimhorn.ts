import { ChampionDef } from '../types';

// Brimhorn (Jakub's brief, docs/DESIGN_DECISIONS.md section 97, 2026-11-07: an
// Elite Tank of the Ashveil Reign, "some bulk demon with red colors and horns",
// two skills; the name, the look and the kit are my proposal, approved with his
// "go"). A huge hunched demon of deep red hide, great ram horns curling forward
// and a third broken one capped in iron, broken shackles on his wrists with
// their chains hanging, an iron collar with the Reign's white bone on it, cloven
// hooves, a heavy tail. No passive. Stand-ins: the names, texts, every number,
// the affinity, the stats (on the Elite budget) and the lore line. Summoned.
export const brimhorn: ChampionDef = {
  id: 'brimhorn',
  name: 'Brimhorn',
  role: 'Tank',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'ashveil_reign',
  color: '#b02a24',
  stats: { hp: 1600, atk: 84, def: 70, spd: 90, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'Something came through when the Loom broke, and the Ashveil Reign was the first to put a collar on it. He still wears the broken shackles, and he has never asked for them to be taken off. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'gore', name: 'Gore', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Lowers his head and drives his horns into one enemy. A 30% chance to place Burn on it for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'horn_gore' }],
      statuses: [{ status: 'burn', turns: 2, chance: 0.3, to: 'targets' }],
      shake: 2,
      ai: { priority: 1 },
    },
    {
      id: 'chains_of_the_pit', name: 'Chains of the Pit', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'Wades in and swings the broken chains of his shackles round him: strikes all enemies, then places Taunt and DEF Up on himself for 2 turns.',
      target: 'enemies', anim: 'skill', approach: 'center',
      hits: [{ mult: 0.5, fx: 'chain_lash' }],
      statuses: [
        { status: 'taunt', turns: 2, to: 'self' },
        { status: 'def_up', turns: 2, to: 'self' },
      ],
      shake: 2,
      ai: { priority: 2 },
    },
  ],
};
