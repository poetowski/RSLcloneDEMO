import { ChampionDef } from '../types';

// The Sentry (Jakub's brief, docs/DESIGN_DECISIONS.md section 46, 2026-11-01:
// "Lighter patrol. A2 buff also someone else. Go"): a Common Tank of the
// Sanguine Dominion, Tide (abstract: it sets nothing in his look); a
// border-patrolling soldier in light armour with a long sword and dark-brown
// shoulders. An A1 on one enemy that takes 7% of its Turn Meter, and an A2,
// no attack, cooldown 4: Regen on himself and on the ally with the lowest max
// HP other than him for 2 turns, and he starts his next turn with 30% Turn
// Meter. No passive. Jakub approved the names, the lore line and the art as
// shown (2026-11-01); the texts, A1's 1.0 and the stats (the lighter option,
// on the Common budget) wait for his balance. He is summoned.
export const sentry: ChampionDef = {
  id: 'sentry',
  name: 'Sentry',
  role: 'Tank',
  rarity: 'common',
  affinity: 'tide',
  faction: 'sanguine_dominion',
  color: '#b0564c',
  stats: { hp: 1260, atk: 82, def: 66, spd: 100, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A sentry of the Sanguine Dominion who walks its borders by night, and has never let anyone cross without asking twice. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'checkpoint_cut', name: 'Checkpoint Cut', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A cut of the long sword at one enemy that takes 7% of its Turn Meter.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1, fx: 'sword_cut' }],
      tmTargets: -7,
      ai: { priority: 1 },
    },
    {
      id: 'watch_rotation', name: 'Watch Rotation', tag: 'Self, one ally', slot: 2, cooldown: 4,
      desc: 'He plants his sword and takes the watch: he and the ally other than him with the lowest max HP gain Regen for 2 turns, and he starts his next turn with 30% Turn Meter. No attack.',
      target: 'self', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'watch_light' }],
      statuses: [
        { status: 'regen', turns: 2, to: 'self' },
        { status: 'regen', turns: 2, to: 'lowestMaxHpOther' },
      ],
      selfTm: 30,
      ai: { priority: 2 },
    },
  ],
};
