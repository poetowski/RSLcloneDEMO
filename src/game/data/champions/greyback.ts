import { ChampionDef } from '../types';

// Greyback (Jakub's brief, docs/DESIGN_DECISIONS.md section 95, 2026-11-07: an
// Elite Tank of the Court of Root, Tide, the batch's "animal beast", three
// abilities; the name, the look and the kit are my proposal, approved with his
// "go"). An old silverback gorilla, huge and stooped on long arms, dark fur
// with a grey saddle, moss and ferns grown into the fur of his shoulders, old
// scars on his face; no weapon and no gear. Roused is an overdrive: the first
// time he drops below half his HP. Stand-ins: the names, texts, every number,
// the stats (on the Elite budget) and the lore line. He is summoned.
export const greyback: ChampionDef = {
  id: 'greyback',
  name: 'Greyback',
  role: 'Tank',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'court_of_root',
  color: '#8a8f96',
  stats: { hp: 1540, atk: 82, def: 72, spd: 92, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'He has led his troop for longer than anyone in the Court remembers. He has never once started a fight, and he has never once lost one. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'knuckle_slam', name: 'Knuckle Slam', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Brings both fists down on one enemy. A 30% chance to place ATK Down on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'knuckle_slam' }],
      statuses: [{ status: 'atk_down', turns: 1, chance: 0.3, to: 'targets' }],
      shake: 2,
      ai: { priority: 1 },
    },
    {
      id: 'chest_beat', name: 'Chest Beat', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'Rears up and beats his chest: Taunt on himself for 2 turns, and a 50% chance on each enemy of Slow for 1 turn. No attack.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'chest_beat_hit' }],
      statuses: [
        { status: 'taunt', turns: 2, to: 'self' },
        { status: 'spd_down', turns: 1, chance: 0.5, to: 'targets' },
      ],
      actorFx: 'chest_beat',
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'roused',
    name: 'Roused',
    desc: 'The first time Greyback drops below 50% HP, he takes Counterattack and ATK Up for 2 turns. Once a battle.',
    kind: 'overdrive',
    value: 0.5,
    statuses: [
      { status: 'counter', turns: 2 },
      { status: 'atk_up', turns: 2 },
    ],
    holderFx: 'chest_beat',
  },
};
