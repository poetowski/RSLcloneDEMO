import { ChampionDef } from '../types';

// Overlord Ofentol (Jakub's brief, docs/DESIGN_DECISIONS.md section 59,
// 2026-11-01): an Elite Tank of the Azure Crown, Bloom (his word: Bloom unless the
// faction already has a Bloom Elite Tank, and it has none); a fat man with a smith's
// hammer and a one-handed scythe, a dirty white t-shirt and a beard, who once, very
// drunk, wanted to shout that he was an overlord and called himself Ofentol. A1 hits
// one enemy, 50% chance to hit again; A2 Taunt on himself and Regen on every ally,
// himself included, for 2 turns, cooldown 4; his passive shields an ally an enemy
// debuffs for 15% of his max HP for 1 turn, and every enemy A1 hit on his side adds
// 7% to his turn meter. Stand-ins: the skills' and the passive's names, A1's 0.7 a
// hit, the stats (on the Elite budget). He is summoned.
export const overlordOfentol: ChampionDef = {
  id: 'overlord_ofentol',
  name: 'Overlord Ofentol',
  role: 'Tank',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'azure_crown',
  color: '#cfc29c',
  stats: { hp: 1380, atk: 84, def: 70, spd: 90, crit: 0.05, critDmg: 1, acc: 0, res: 0 },
  lore: 'A smith of the Azure Crown who once got so heavily drunk that he climbed a table to shout that he was an overlord. "I am Ofentol!" he roared. Nobody has called him anything else since, and he answers to it proudly. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'hammer_and_scythe', name: 'Hammer and Scythe', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Brings his smith\'s hammer down on one enemy. A 50% chance to hit it again with the scythe.',
      target: 'enemy', anim: 'attack1', animAlone: 'attack1_alone', approach: 'melee',
      hits: [{ mult: 0.7, fx: 'ofentol_hammer' }, { mult: 0.7, fx: 'ofentol_scythe', chance: 0.5 }],
      ai: { priority: 1 },
    },
    {
      id: 'i_am_ofentol', name: 'I Am Ofentol!', tag: 'All allies', slot: 2, cooldown: 4,
      desc: 'Roars his name at the sky. Places Taunt on himself and Regen on every ally, himself included, for 2 turns. No attack.',
      target: 'allies', anim: 'skill', approach: 'none', actorFx: 'ofentol_shout',
      hits: [{ mult: 0, fx: 'ofentol_cheer' }],
      statuses: [
        { status: 'taunt', turns: 2, to: 'self' },
        { status: 'regen', turns: 2, to: 'allies' },
      ],
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'overlords_round',
    name: 'Overlord\'s Round',
    desc: 'When an enemy places a debuff on an ally, himself included, that ally takes a Shield of 15% of his max HP for 1 turn. Every time an enemy\'s A1 hits an ally, himself included, his turn meter rises by 7%.',
    kind: 'remedy',
    value: 0.15,
    statuses: [{ status: 'shield', turns: 1 }],
    struckMeter: 7,
    fx: 'ofentol_plate',
  },
};
