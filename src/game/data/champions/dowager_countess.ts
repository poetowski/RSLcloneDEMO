import { ChampionDef } from '../types';

// The Dowager Countess (Jakub's brief, docs/DESIGN_DECISIONS.md section 93,
// 2026-11-07: an Elite Support of the Sanguine Dominion, Ember, "elegant
// lady", her lore interesting, her hair grey; then "make the new support bit
// weak for a change"; the name, the look, the lore and the weaker kit are my
// proposal, approved with his "go"). Tall and slim in a high-collared gown of
// crimson and black, silver-grey hair in an updo with a ruby hexagon pin, black
// lace gloves, a closed black fan. Weak on his word: a low A1, a short ATK Up on
// a long cooldown, a small passive, stats at the bottom of the Elite budget.
// Stand-ins: the names, texts, every number, the stats and the lore line.
// She is summoned.
export const dowagerCountess: ChampionDef = {
  id: 'dowager_countess',
  name: 'Dowager Countess',
  role: 'Support',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'sanguine_dominion',
  color: '#c9c4cc',
  stats: { hp: 1200, atk: 84, def: 62, spd: 114, crit: 0.05, critDmg: 1, acc: 0, res: 0 },
  lore: 'She married three generals of the Sanguine Dominion and buried all three, and every inheritance bought her a seat nearer the head of the Crimson Council. Her hair went grey at twenty, the night her first husband\'s regiment did not come back. She sends other women\'s sons to war with perfect manners, and has never forgotten one of their names. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'fan_rebuke', name: 'Fan Rebuke', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Raps one enemy smartly with her closed fan. A 20% chance to place Slow on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.9, fx: 'fan_rap' }],
      statuses: [{ status: 'spd_down', turns: 1, chance: 0.2, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'councils_favour', name: 'The Council\'s Favour', tag: 'All allies', slot: 2, cooldown: 5,
      desc: 'Opens her fan and inclines her head: places ATK Up on all allies for 1 turn. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'council_favour' }],
      statuses: [{ status: 'atk_up', turns: 1, to: 'allies' }],
      actorFx: 'fan_open',
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'noblesse_oblige',
    name: 'Noblesse Oblige',
    desc: 'When an enemy places a debuff on an ally, the Countess included, a 20% chance to place ATK Up on that ally for 1 turn.',
    kind: 'remedy',
    value: 0,
    chance: 0.2,
    statuses: [{ status: 'atk_up', turns: 1 }],
    fx: 'council_favour',
  },
};
