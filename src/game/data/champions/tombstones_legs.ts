import { ChampionDef } from '../types';

// Tombstone's Legs (docs/DESIGN_DECISIONS.md section 61, Jakub's request of
// 2026-11-01 for the Ashveil Reign's remaining Elites, "be creative but
// consistent", he names them himself one by one): my proposal, built on that
// word. A dead giant of a mourner who carries a coffin before him as a shield
// and a ram. The roster's first Undying: the engine's passive no champion had
// used. His name is Jakub's (2026-11-01). Stand-ins until Jakub sets them: the kit, Ember,
// the numbers, the lore line, the art). He is summoned, like the other Elites.
export const tombstonesLegs: ChampionDef = {
  id: 'tombstones_legs',
  name: "Tombstone's Legs",
  role: 'Tank',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'ashveil_reign',
  color: '#a89c8c',
  stats: { hp: 1440, atk: 78, def: 74, spd: 90, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'He has carried the same coffin for as long as the Reign has had dead, and he has never once set it in the ground. Whoever is inside, he is not finished carrying them, and he is not finished either. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'lid_crush', name: 'Lid Crush', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Drives the coffin into one enemy. A 30% chance to place ATK Down on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'lid_crush' }],
      statuses: [{ status: 'atk_down', turns: 1, chance: 0.3, to: 'targets' }],
      shake: 1,
      ai: { priority: 1 },
    },
    {
      id: 'bear_the_dead', name: 'Bear the Dead', tag: 'Self, all allies', slot: 2, cooldown: 4,
      desc: 'Plants the coffin before his side: places Taunt on himself for 2 turns, and a Shield worth 10% of his max HP on all allies for 2 turns. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'pall_ward' }],
      statuses: [
        { status: 'taunt', turns: 2, to: 'self' },
        { status: 'shield', turns: 2, to: 'allies', value: 0.1 },
      ],
      actorFx: 'pall_knock',
      shake: 1,
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'not_yet_buried',
    name: 'Not Yet Buried',
    desc: 'The first blow that would fell him leaves him at 20% of his max HP instead, with every debuff lifted. Once a battle.',
    kind: 'undying',
    value: 0.2,
  },
};
