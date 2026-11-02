import { ChampionDef } from '../types';

// Rootfather (docs/DESIGN_DECISIONS.md section 71, Jakub's brief of 2026-11-02): a
// Heroic Support of the Court of Root, Ember. An ancient, lean wanderer with skin like
// old bark and green light in its veins, moss on his shoulders and forearms, flowers in
// his beard, a crown of branches and antlers, a cloak of leaves, roots and hide, roots
// coiling round his boots, and a crooked staff with an emerald seed floating in its
// crown. The name, look and kit are his. Stand-ins until he sets them: the names Root
// Wake, Long Winter, Blight Seed and Sap Rises and their texts, A3's multiplier and
// cooldown, the stats, the lore line, and that he is summoned.
// Read by the game: speed down is Slow; "all allies" includes him (`selfTm` for his own
// 20%); the Slow and the Poison are certain, meeting RES like every debuff; the heal
// comes before anything ticks, on a turn he will skip too, and Heal Block stops it.
export const rootfather: ChampionDef = {
  id: 'rootfather',
  name: 'Rootfather',
  role: 'Support',
  rarity: 'heroic',
  affinity: 'ember',
  faction: 'court_of_root',
  color: '#4cd43a',
  muzzle: [54, 72],
  stats: { hp: 900, atk: 118, def: 80, spd: 90, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'Nobody remembers Rootfather young. He walks the old ways of the Court of Root with bark for skin and flowers in his beard, and the ground takes hold of his boots wherever he stands, as if it would rather he stayed. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'root_wake', name: 'Root Wake', tag: 'All enemies', slot: 1, cooldown: 0,
      desc: 'Drives his staff into the ground, and roots burst up under all enemies.',
      target: 'enemies', anim: 'attack1', approach: 'none',
      hits: [{ mult: 0.6, fx: 'root_wake' }],
      shake: 1,
      ai: { priority: 1 },
    },
    {
      id: 'long_winter', name: 'Long Winter', tag: 'All enemies, all allies', slot: 2, cooldown: 4,
      desc: 'Lifts the seed over the field: places Slow on all enemies for 2 turns, and every ally, himself included, gains 20% Turn Meter. No attack.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'long_winter' }],
      statuses: [{ status: 'spd_down', turns: 2, to: 'targets' }],
      tmAllies: 20,
      selfTm: 20,
      actorFx: 'seed_flare',
      allyFx: 'seed_quicken',
      ai: { priority: 2 },
    },
    {
      id: 'blight_seed', name: 'Blight Seed', tag: 'Single enemy', slot: 3, cooldown: 5,
      desc: 'Sends a splinter of the seed into one enemy: every buff comes off it before the hit, and it takes Poison for 2 turns.',
      target: 'enemy', anim: 'attack3', approach: 'none',
      hits: [{ mult: 1.3, fx: 'blight_seed' }],
      projectile: 'seed_bolt',
      stripBuffs: true,
      statuses: [{ status: 'poison', turns: 2, to: 'targets' }],
      ai: { priority: 3 },
    },
  ],
  passive: {
    id: 'sap_rises',
    name: 'Sap Rises',
    desc: "At the start of his turn, every ally, himself included, heals for 10% of Rootfather's max HP.",
    kind: 'renewal',
    value: 0.1,
    fx: 'sap_rises',
  },
};
