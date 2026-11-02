import { ChampionDef } from '../types';

// The Astronomer Royal (docs/DESIGN_DECISIONS.md section 73, Jakub's choice of 2026-11-02
// from four I proposed, "very royal, creative and supreme looking and magic"): a Heroic
// Support of the Azure Crown, Ember. She levitates in a train of star-mapped velvet under
// a towering crown, a gold armillary halo behind her head, planets orbiting her, a long
// brass telescope for a staff. The kit is the one he chose. Stand-ins until he sets them:
// the names, the numbers, Ember, the lore line, and that she is summoned.
// Read by the game: Hour of Destiny's ally takes its turn at once, ahead of everyone,
// nobody else's meter moving, and keeps the meter it had; its SPD Up counts from after
// that turn. It cannot be aimed at herself, or at an ally who is Stunned or Frozen.
export const astronomerRoyal: ChampionDef = {
  id: 'astronomer_royal',
  name: 'Astronomer Royal',
  role: 'Support',
  rarity: 'heroic',
  affinity: 'ember',
  faction: 'azure_crown',
  color: '#ffd860',
  stats: { hp: 1400, atk: 84, def: 70, spd: 104, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'The Azure Crown has one office older than its kings: the Astronomer Royal, who tells the throne what the stars have already decided. This one stopped asking the stars some time ago. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'falling_star', name: 'Falling Star', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Points her telescope at the sky, and a star comes down on one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 0.9, fx: 'falling_star' }],
      ai: { priority: 1 },
    },
    {
      id: 'eclipse', name: 'Eclipse', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'Darkens the sun over all enemies: strikes them, places Slow on them for 2 turns, and takes 15% of their Turn Meter.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0.5, fx: 'eclipse_shade' }],
      statuses: [{ status: 'spd_down', turns: 2, to: 'targets' }],
      tmTargets: -15,
      actorFx: 'orrery_flare',
      ai: { priority: 2 },
    },
    {
      id: 'hour_of_destiny', name: 'Hour of Destiny', tag: 'One other ally', slot: 3, cooldown: 6,
      desc: 'Aligns the planets for one other ally: it takes a turn immediately, ahead of everyone, and keeps the Turn Meter it had. It also gains SPD Up for 2 turns, counted after that turn. Not on an ally who is Stunned or Frozen.',
      target: 'ally', anim: 'ritual', approach: 'none',
      hits: [{ mult: 0, fx: 'destiny_stars' }],
      statuses: [{ status: 'spd_up', turns: 2, to: 'targets' }],
      grantTurn: true,
      actorFx: 'orrery_flare',
      ai: { priority: 3 },
    },
  ],
  passive: {
    id: 'fixed_stars',
    name: 'Fixed Stars',
    desc: 'At the start of her turn, the other ally lowest on Turn Meter gains 10% Turn Meter.',
    kind: 'alignment',
    value: 10,
    fx: 'fixed_star',
  },
};
