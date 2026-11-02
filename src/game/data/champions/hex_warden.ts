import { ChampionDef } from '../types';

// The Hex Warden (docs/DESIGN_DECISIONS.md section 66, 2026-11-02, my design on
// Jakub's word: "3 more sanguine dominion elites", one per class): an Elite Tank of
// the Sanguine Dominion, Ember; a big man in black plate behind a shield that is the
// Dominion's own standard, black with a red hexagon inside. His name, kit, numbers,
// affinity and look stand in until Jakub sets them. He is summoned.
export const hexWarden: ChampionDef = {
  id: 'hex_warden',
  name: 'Hex Warden',
  role: 'Tank',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'sanguine_dominion',
  color: '#c62c48',
  stats: { hp: 1480, atk: 80, def: 74, spd: 92, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'Keeper of the Sanguine Dominion\'s standard, which he carries as a shield: black, with a red hexagon inside. His oath is simple. The standard stands in front of whoever bleeds most easily, and he stands behind it. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'standard_ram', name: 'Standard Ram', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Drives the great shield into one enemy, with a 30% chance to place Slow for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'hex_ram' }],
      statuses: [{ status: 'spd_down', turns: 1, chance: 0.3, to: 'targets' }],
      shake: 2,
      ai: { priority: 1 },
    },
    {
      id: 'blood_oath', name: 'Blood Oath', tag: 'Self and frailest ally', slot: 2, cooldown: 4,
      desc: 'Plants the standard. Places Taunt on himself for 2 turns, and a Shield of 20% of his max HP on the ally with the lowest max HP but him for 2 turns. No attack.',
      target: 'self', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'hex_plant' }],
      statuses: [
        { status: 'taunt', turns: 2, to: 'self' },
        { status: 'shield', turns: 2, value: 0.2, to: 'lowestMaxHpOther' },
      ],
      shake: 2,
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'second_pulse',
    name: 'Second Pulse',
    desc: 'The first time the Hex Warden drops below 40% HP, he gains DEF Up and Regen for 2 turns.',
    kind: 'overdrive',
    value: 0.4,
    statuses: [{ status: 'def_up', turns: 2 }, { status: 'regen', turns: 2 }],
    holderFx: 'hex_pulse',
  },
};
