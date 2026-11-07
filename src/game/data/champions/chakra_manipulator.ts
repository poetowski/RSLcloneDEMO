import { ChampionDef } from '../types';

// The Chakra Manipulator (Jakub's brief, docs/DESIGN_DECISIONS.md section 88,
// 2026-11-07): an Elite Support of the Azure Crown, his idea of a chakra
// manipulator; the kit, the look and Tide are my proposal, approved with his
// "all is fine ... go and deliver". A lean barefoot court mystic in a sleeveless
// azure wrap with white trim, wrapped forearms, a shaved head with one long dark
// braid, eyes always closed, seven pale points down his centre, two fingers
// raised. Mended Flow is a ward with `below`: only an ally a blow leaves under
// 40% of its max HP. Stand-ins: the names, texts, every number, the stats (on
// the Elite budget) and the lore line. He is summoned.
export const chakraManipulator: ChampionDef = {
  id: 'chakra_manipulator',
  name: 'Chakra Manipulator',
  role: 'Support',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'azure_crown',
  color: '#8fd4ec',
  stats: { hp: 1160, atk: 92, def: 62, spd: 110, crit: 0.05, critDmg: 1, acc: 0, res: 0 },
  lore: 'A temple teacher the Azure Crown keeps at court to put its captains back on their feet. He fights with his eyes closed; he says he sees the body better that way. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'pressure_point', name: 'Pressure Point', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Strikes one enemy on a pressure point with two fingers. A 30% chance to place Slow on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'pressure_jab' }],
      statuses: [{ status: 'spd_down', turns: 1, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'open_the_gates', name: 'Open the Gates', tag: 'All allies', slot: 2, cooldown: 4,
      desc: 'Opens the seven gates of his side: heals all allies by 12% of their max HP and fills every other ally\'s Turn Meter by 15%. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'chakra_bloom' }],
      healAllies: 0.12,
      tmAllies: 15,
      actorFx: 'chakra_gates',
      ai: { priority: 2, when: 'allyHurt' },
    },
  ],
  passive: {
    id: 'mended_flow',
    name: 'Mended Flow',
    desc: 'When an enemy skill leaves an ally, himself included, standing under 40% of its max HP, that ally takes Regen for 2 turns. Then Mended Flow rests for 2 of his turns.',
    kind: 'ward',
    value: 0,
    below: 0.4,
    cooldown: 2,
    statuses: [{ status: 'regen', turns: 2 }],
    fx: 'chakra_mend',
  },
};
