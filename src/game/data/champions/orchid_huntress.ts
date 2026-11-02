import { ChampionDef } from '../types';

// The Orchid Huntress (docs/DESIGN_DECISIONS.md section 76, 2026-11-02): a Heroic Damage of the
// Court of Root. Jakub asked for a creative Damage kit for a Heroic of the Court and chose the
// first of three I proposed, "Go A"; then, not liking its first concept (the Strangler, a man of
// roots), he kept the kit and chose the second of three new concepts, "Second ... call her
// 'Orchid Huntress'": an elegant and deadly huntress of the jungle, a beautiful lure for prey.
// A1 two kisses of a thorned vine, each with a 40% chance of Poison for 2 turns; A2 a veil of
// pollen from her crown over all enemies, a 75% chance of Poison for 2 turns and Heal Block for 1;
// A3 roots rising under one enemy, after which every tick its Poison has left lands at once
// (`detonate`); a passive with a 35% chance of Poison for 2 turns on an enemy that hits her.
// Stand-ins until he sets them: Bloom, the names Thorn Kiss, Pollen Veil, Root Embrace and Bitter
// Nectar and their texts, the numbers (0.5 x 2; 0.6; 1.4), her stats, the lore line, that she is
// summoned, and every detail of her art and effects.
// Read by the game: Poison is one status, 5% of the target's max HP at the start of each of its
// turns; Root Embrace deals 5% for each turn it has left, at once, then the Poison is gone (a
// Shield does not soak it, as it soaks no tick); the debuffs meet RES like every debuff.
export const orchidHuntress: ChampionDef = {
  id: 'orchid_huntress',
  name: 'Orchid Huntress',
  role: 'Damage',
  rarity: 'heroic',
  affinity: 'bloom',
  faction: 'court_of_root',
  color: '#d8a0e0',
  stats: { hp: 1150, atk: 120, def: 58, spd: 110, crit: 0.06, critDmg: 1, acc: 0, res: 0 },
  lore: 'A huntress of the Court of Root as lovely as the flower she grew from, and as patient: the prey comes to the scent, and the poison does the rest. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'thorn_kiss', name: 'Thorn Kiss', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Two lashes of the thorned vine at one enemy. Each has a 40% chance to place Poison on it for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.5, fx: 'thorn_kiss' }, { mult: 0.5, fx: 'thorn_kiss_back' }],
      statuses: [{ status: 'poison', turns: 2, chance: 0.4, to: 'targets', perHit: true }],
      ai: { priority: 1 },
    },
    {
      id: 'pollen_veil', name: 'Pollen Veil', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'Her crown opens and a veil of pollen drifts over every enemy: a 75% chance of Poison for 2 turns on each, and Heal Block for 1 turn.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0.6, fx: 'pollen_hit' }],
      statuses: [
        { status: 'poison', turns: 2, chance: 0.75, to: 'targets' },
        { status: 'heal_block', turns: 1, to: 'targets' },
      ],
      actorFx: 'pollen_cloud',
      ai: { priority: 2 },
    },
    {
      id: 'root_embrace', name: 'Root Embrace', tag: 'Single enemy', slot: 3, cooldown: 5,
      desc: 'She kneels and roots her hand in the ground, and roots rise round one enemy. Then its Poison deals every tick it has left at once, and is gone.',
      target: 'enemy', anim: 'attack3', approach: 'none',
      hits: [{ mult: 1.4, fx: 'root_embrace' }],
      detonate: true,
      shake: 3,
      ai: { priority: 3 },
    },
  ],
  passive: {
    id: 'bitter_nectar',
    name: 'Bitter Nectar',
    desc: 'When an enemy attack hits the Orchid Huntress, a 35% chance after the hit to place Poison on that enemy for 2 turns.',
    kind: 'retaliate',
    value: 0,
    chance: 0.35,
    statuses: [{ status: 'poison', turns: 2 }],
    fx: 'nectar_sting',
  },
};
