import { ChampionDef } from '../types';

// The Strangler (docs/DESIGN_DECISIONS.md section 76, 2026-11-02): a Heroic Damage of the
// Court of Root. Jakub asked for a creative Damage kit for a Heroic of the Court; of the three
// I proposed he chose the first, "Go A": a creeping hunter of strangler-fig roots who poisons
// first and collects later. A1 two lashes of a thorned vine, each with a 40% chance of Poison for
// 2 turns; A2 a burst of spores on all enemies, a 75% chance of Poison for 2 turns and Heal Block
// for 1; A3 roots erupting under one enemy, after which every tick its Poison has left lands at
// once (new `detonate`); a passive with a 35% chance of Poison for 2 turns on an enemy that hits
// him. Stand-ins until he sets them: the name, Bloom, the names Thorn Lash, Spore Burst, Reaping
// Root and Bitter Sap and their texts, the numbers (0.5 x 2; 0.6; 1.4), his stats, the lore line,
// that he is summoned, and every detail of his art and effects.
// Read by the game: Poison is one status, 5% of the target's max HP at the start of each of its
// turns; Reaping Root deals 5% for each turn it has left, at once, then the Poison is gone (a
// Shield does not soak it, as it soaks no tick); the debuffs meet RES like every debuff.
export const strangler: ChampionDef = {
  id: 'strangler',
  name: 'Strangler',
  role: 'Damage',
  rarity: 'heroic',
  affinity: 'bloom',
  faction: 'court_of_root',
  color: '#a8c060',
  stats: { hp: 1150, atk: 120, def: 58, spd: 110, crit: 0.06, critDmg: 1, acc: 0, res: 0 },
  lore: 'A hunter of the Court of Root grown the way the strangler fig grows: roots wound round a heart of amber sap, patient as a vine on a dying tree. What he poisons he comes back for. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'thorn_lash', name: 'Thorn Lash', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Two lashes of a thorned vine at one enemy. Each has a 40% chance to place Poison on it for 2 turns.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.5, fx: 'thorn_lash' }, { mult: 0.5, fx: 'thorn_lash_back' }],
      statuses: [{ status: 'poison', turns: 2, chance: 0.4, to: 'targets', perHit: true }],
      ai: { priority: 1 },
    },
    {
      id: 'spore_burst', name: 'Spore Burst', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'Crushes a ripe fig overhead and the spores settle on every enemy: a 75% chance of Poison for 2 turns on each, and Heal Block for 1 turn.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0.6, fx: 'spore_hit' }],
      statuses: [
        { status: 'poison', turns: 2, chance: 0.75, to: 'targets' },
        { status: 'heal_block', turns: 1, to: 'targets' },
      ],
      actorFx: 'spore_cloud',
      ai: { priority: 2 },
    },
    {
      id: 'reaping_root', name: 'Reaping Root', tag: 'Single enemy', slot: 3, cooldown: 5,
      desc: 'Drives his roots into the ground and they burst up under one enemy. Then its Poison deals every tick it has left at once, and is gone.',
      target: 'enemy', anim: 'attack3', approach: 'none',
      hits: [{ mult: 1.4, fx: 'reaping_root' }],
      detonate: true,
      shake: 3,
      ai: { priority: 3 },
    },
  ],
  passive: {
    id: 'bitter_sap',
    name: 'Bitter Sap',
    desc: 'When an enemy attack hits the Strangler, a 35% chance after the hit to place Poison on that enemy for 2 turns.',
    kind: 'retaliate',
    value: 0,
    chance: 0.35,
    statuses: [{ status: 'poison', turns: 2 }],
    fx: 'sap_sting',
  },
};
