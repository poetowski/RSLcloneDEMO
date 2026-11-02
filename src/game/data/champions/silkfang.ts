import { ChampionDef } from '../types';

// Silkfang (docs/DESIGN_DECISIONS.md section 68, 2026-11-02, my design on Jakub's
// word: "3 new elite for court of root ... one can be spider"): an Elite Damage of the
// Court of Root, Tide; an old jungle spider on tall arched legs, moss and fern growing
// on her back. Her name, kit, numbers, affinity and look stand in until he sets them.
// She is summoned.
export const silkfang: ChampionDef = {
  id: 'silkfang',
  name: 'Silkfang',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'court_of_root',
  color: '#8a9a5a',
  muzzle: [20, 44],
  stats: { hp: 1040, atk: 116, def: 58, spd: 108, crit: 0.05, critDmg: 1, acc: 0, res: 0 },
  lore: 'An old spider of the Court of Root, which shares a nature and no hierarchy. She has sat so long in one tree that the moss has taken her for part of it. Nobody weaves as she does, and since the Loom broke, some have begun to wonder what she is weaving. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'fang_bite', name: 'Fang Bite', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Rears and sinks her fangs into one enemy, with a 35% chance of Poison for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.1, fx: 'silk_bite' }],
      statuses: [{ status: 'poison', turns: 1, chance: 0.35, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'web_shot', name: 'Web Shot', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'Flings webbing over all enemies, with a 60% chance on each of Slow for 2 turns.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0.6, fx: 'web_snare' }],
      projectile: 'web_glob',
      statuses: [{ status: 'spd_down', turns: 2, chance: 0.6, to: 'targets' }],
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'tripline',
    name: 'Tripline',
    desc: 'When an enemy skill damages Silkfang and leaves her standing, a 35% chance to place Slow on the attacker for 1 turn.',
    kind: 'retaliate',
    value: 0,
    chance: 0.35,
    statuses: [{ status: 'spd_down', turns: 1 }],
    fx: 'web_strand',
  },
};
