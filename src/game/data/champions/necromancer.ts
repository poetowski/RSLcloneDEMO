import { ChampionDef } from '../types';

// The Necromancer (docs/DESIGN_DECISIONS.md section 31, Jakub's brief of
// 2026-10-18): an Elite of the Ashveil Reign, Support, Bloom, the Reign's first
// Elite. A man in a dark black robe, its hood over a pale head so that only a
// little of his face shows, a necronomicon in his left hand and small black
// particles orbiting the other. The kit is his: "A1 - hit one enemy target,
// has 35% chance to cause SPEED DOWN on target for 1 turn. A2 - hit one enemy
// target, cause Poison for 2 turns, also buff all allies with SPEED UP for 2
// turns. 4 CD. A3 - Revive 1 random dead ally. CD 6 turns." Stand-ins until
// Jakub sets them: the names Grave Chill, Plague Verse and Raise Dead and their
// texts, A1's 1.0 and A2's 1.2, the share of HP the raised ally comes back with
// (30%), the stats (on the Elite budget, a little under it for the revive),
// the lore line and the stage whose first clear brings him. Read by the game:
// SPEED DOWN is Slow; the Poison is certain, meeting RES like every debuff;
// "all allies" includes him; the raised ally comes back with nothing on it and
// an empty turn meter, and Raise Dead waits while no ally has fallen.
export const necromancer: ChampionDef = {
  id: 'necromancer',
  name: 'Necromancer',
  role: 'Support',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'ashveil_reign',
  color: '#b8a0e0',
  muzzle: [28, 56],
  stats: { hp: 1240, atk: 100, def: 62, spd: 114, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A necromancer of the Ashveil Reign, robed in black, his pale face hidden in his hood: he reads from a book of the dead, black motes circle his hand, and at his word the fallen get up again. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'grave_chill', name: 'Grave Chill', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Flings the black motes circling his hand at one enemy. A 35% chance to place Slow on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1.0, fx: 'grave_chill' }],
      projectile: 'grave_bolt',
      statuses: [{ status: 'spd_down', turns: 1, chance: 0.35, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'plague_verse', name: 'Plague Verse', tag: 'Single enemy', slot: 2, cooldown: 4,
      desc: 'Reads a verse from his book over one enemy: strikes it and places Poison on it for 2 turns, and places SPD Up on all allies for 2 turns.',
      target: 'enemy', anim: 'skill', approach: 'none',
      hits: [{ mult: 1.2, fx: 'plague_verse' }],
      statuses: [
        { status: 'poison', turns: 2, to: 'targets' },
        { status: 'spd_up', turns: 2, to: 'allies' },
      ],
      allyFx: 'grave_haste',
      ai: { priority: 2 },
    },
    {
      id: 'raise_dead', name: 'Raise Dead', tag: 'A fallen ally', slot: 3, cooldown: 6,
      desc: 'Opens his book and calls back one fallen ally, chosen at random: it rises with 30% of its max HP. Ready only while an ally has fallen.',
      target: 'fallen', anim: 'ritual', approach: 'none',
      hits: [{ mult: 0, fx: 'raise_dead' }],
      revive: 0.3,
      actorFx: 'tome_flare',
      ai: { priority: 3 },
    },
  ],
};
