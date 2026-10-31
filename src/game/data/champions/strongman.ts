import { ChampionDef } from '../types';

// The Strongman (worksheet approved by Jakub, 2026-10-31, the recommended
// options): a Common Damage of the Azure Crown, Tide (abstract: it sets
// nothing in his look), a naked strong man who lifts a heavy stone. One A1
// that brings the stone down on one enemy, and an A2 that raises his own
// Attack for 2 turns. No passive. Stand-ins until Jakub sets them: the names
// and texts of both skills, the multipliers (1.0; the A2 is pure buff), the
// stats (the heavy option, on the Common budget), the lore line, and the stage
// that brings him (not yet chosen).
export const strongman: ChampionDef = {
  id: 'strongman',
  name: 'Strongman',
  role: 'Damage',
  rarity: 'common',
  affinity: 'tide',
  faction: 'azure_crown',
  color: '#7fa6d8',
  stats: { hp: 1080, atk: 118, def: 56, spd: 100, crit: 0.035, critDmg: 1, acc: 0, res: 0 },
  lore: 'A quarry-born strongman of the Azure Crown, who lifts whatever the road puts in his way and carries the heaviest stone he has found as proof of his strength. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'stone_slam', name: 'Stone Slam', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Brings the heavy stone down on one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1, fx: 'heavy_blow' }],
      ai: { priority: 1 },
    },
    {
      id: 'gather_strength', name: 'Gather Strength', tag: 'Self', slot: 2, cooldown: 3,
      desc: 'He braces and swells his muscles, raising his Attack for 2 turns.',
      target: 'self', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'brace_dust' }],
      statuses: [{ status: 'atk_up', turns: 2, to: 'self' }],
      ai: { priority: 2 },
    },
  ],
};
