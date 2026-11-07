import { ChampionDef } from '../types';

// The Frostwright (Jakub's brief, docs/DESIGN_DECISIONS.md section 91,
// 2026-11-07: an Elite Damage of the Sanguine Dominion, Bloom, "mage with
// hoodie", an A1 and an A2 with Freeze; the name, the look and the kit's
// numbers are my proposal, approved with his "go"). A lanky young mage in a
// white cold-weather coat with red and black insignia (his word of the same
// day; crimson first), the fur-rimmed hood always up, only a pale jaw and
// frosted breath showing; black gloves crusted with frost at the fingertips, a
// shard of ice turning over his palm. No passive:
// his brief names two skills. Freeze is a chance on both (a certain Freeze
// belongs to an A3, MECHANICS_GUIDE 9). Stand-ins: the names, texts, every
// number, the stats (on the Elite budget) and the lore line. He is summoned.
export const frostwright: ChampionDef = {
  id: 'frostwright',
  name: 'Frostwright',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'sanguine_dominion',
  color: '#a8dcf0',
  stats: { hp: 1100, atk: 112, def: 58, spd: 104, crit: 0.1, critDmg: 1, acc: 0, res: 0 },
  lore: 'A Dominion field-alchemist\'s apprentice who froze his master solid by accident. The Dominion did not punish him; it drafted him. He keeps his hood up so nobody sees how young he is. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'rime_shard', name: 'Rime Shard', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Flings the shard of ice turning over his palm at one enemy. A 25% chance to Freeze it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1.0, fx: 'rime_burst' }],
      statuses: [{ status: 'freeze', turns: 1, chance: 0.25, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'deep_winter', name: 'Deep Winter', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'Throws both hands open and lets the cold out over the enemy line: hits every enemy, with a 30% chance on each to Freeze it for 1 turn.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0.6, fx: 'deep_winter' }],
      statuses: [{ status: 'freeze', turns: 1, chance: 0.3, to: 'targets' }],
      actorFx: 'winter_breath',
      ai: { priority: 2 },
    },
  ],
};
