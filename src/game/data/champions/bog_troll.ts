import { ChampionDef } from '../types';

// The Bog Troll (docs/DESIGN_DECISIONS.md section 69, 2026-11-02, my design on Jakub's
// word: "3 new elite for court of root"): an Elite Tank of the Court of Root, Ember; a
// huge hunched swamp creature, moss for hair, a whole log for a club. His name, kit,
// numbers, affinity and look stand in until Jakub sets them. He is summoned.
export const bogTroll: ChampionDef = {
  id: 'bog_troll',
  name: 'Bog Troll',
  role: 'Tank',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'court_of_root',
  color: '#868b52',
  stats: { hp: 1520, atk: 78, def: 72, spd: 90, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'Something that lives at the bottom of the bog, and comes up when it is disturbed. Cut the moss off him and it grows back by morning; cut him, and it grows back sooner. He has never once been asked to join anything. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'log_swing', name: 'Log Swing', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Brings his log down on one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'log_smash' }],
      shake: 2,
      ai: { priority: 1 },
    },
    {
      id: 'swamp_belch', name: 'Swamp Belch', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'Lets out a belch from the bottom of the bog: Taunt on himself for 2 turns, and a 60% chance on each enemy of Poison for 2 turns. No attack.',
      target: 'enemies', anim: 'skill', approach: 'none', actorFx: 'belch_breath',
      hits: [{ mult: 0, fx: 'swamp_gas' }],
      statuses: [
        { status: 'taunt', turns: 2, to: 'self' },
        { status: 'poison', turns: 2, chance: 0.6, to: 'targets' },
      ],
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'moss_grows_back',
    name: 'Moss Grows Back',
    desc: 'When an enemy skill damages him and leaves him standing, a 35% chance that he takes Regen for 1 turn.',
    kind: 'ward',
    value: 0,
    self: true,
    chance: 0.35,
    statuses: [{ status: 'regen', turns: 1 }],
    fx: 'moss_sprout',
  },
};
