import { ChampionDef } from '../types';

// The Jungle Herder (docs/DESIGN_DECISIONS.md section 21, Jakub's proposal of
// 2026-10-17): an Elite of the Court of Root, Tank; a bipedal humanoid with a
// hunchback and a herding staff, a medium-sized bell at his belt. A1 a
// single-target attack; A2 Taunt on himself for 1 turn and Counterattack for 2
// turns, no attack, cooldown 4; his A3 a passive: at the end of his turn a
// Shield of 10% of his max HP for 1 turn on the ally with the lowest max HP,
// cooldown 1, so every second turn. Jakub, the same day: the lowest max HP in
// the team, himself included, and from his first turn, as it is not on
// cooldown yet. Stand-ins until Jakub sets them: the affinity (he will set the
// four affinities later), the stats (on the Elite budget, a little under it for
// the passive), the names Crook Strike, Bellwether and Herder's Ward and their
// texts, A1's multiplier (1.0, a plain attack), the lore line and the stage
// whose first clear brings him.
export const jungleHerder: ChampionDef = {
  id: 'jungle_herder',
  name: 'Jungle Herder',
  role: 'Tank',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'court_of_root',
  color: '#cc7444',
  stats: { hp: 1500, atk: 80, def: 72, spd: 94, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A herder of the Court of Root, which shares a nature and no hierarchy: bent under a great hump, he drives the beasts of the jungle with a long crook, a bronze bell at his belt. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'crook_strike', name: 'Crook Strike', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Brings the hooked head of his crook down on one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'crook_strike' }],
      ai: { priority: 1 },
    },
    {
      id: 'bellwether', name: 'Bellwether', tag: 'Self', slot: 2, cooldown: 4,
      desc: 'Rings the bell at his belt and calls the enemy to himself: the Jungle Herder gains Taunt for 1 turn and Counterattack for 2 turns. No attack.',
      target: 'self', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'bellwether' }],
      statuses: [{ status: 'taunt', turns: 1, to: 'self' }, { status: 'counter', turns: 2, to: 'self' }],
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'herders_ward',
    name: "Herder's Ward",
    desc: "At the end of the Jungle Herder's turn, the ally with the lowest max HP, himself included, gains a Shield of 10% of his max HP for 1 turn. Then Herder's Ward rests for 1 of his turns.",
    kind: 'tend',
    value: 0.1,
    statuses: [{ status: 'shield', turns: 1 }],
    cooldown: 1,
  },
};
