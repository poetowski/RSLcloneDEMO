import { ChampionDef } from '../types';

// The Rime Scholar, who joins after the first battle (docs/DESIGN_DECISIONS.md
// section 8, Jakub's Starter Heroes record). Her identity, look and kit are
// Jakub's: Pale Strike (plain), Rimebind (Slow on every enemy, small damage),
// no A3, and the passive Cold Rebuke (below 35% HP, a critical hit on her
// freezes its attacker for 1 turn; it has a cooldown). Her job is to teach
// that statuses exist. Stand-ins until Jakub sets them: the stats, the
// multipliers, Slow's 2 turns and Cold Rebuke's 3-turn rest. Champions carry
// no subtitle (Jakub, 2026-10-11).
export const rimeScholar: ChampionDef = {
  id: 'rime_scholar',
  name: 'Rime Scholar',
  role: 'Support',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'sanguine_dominion',
  color: '#a6d8f0',
  muzzle: [27, 48],
  stats: { hp: 1250, atk: 96, def: 66, spd: 106, crit: 0.025 },
  lore: 'An ice mage of the Sanguine Dominion. The name of her world means that blood is life; she is not evil, and neither is her faction: its black and red are heraldry, not menace. She is a fragment, like Gareth. Their worlds would never naturally meet; only the broken loom lets them stand together.',
  skills: [
    {
      id: 'pale_strike', name: 'Pale Strike', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A plain attack at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1.0, fx: 'pale_burst' }],
      projectile: 'pale_shard',
      ai: { priority: 1 },
    },
    {
      id: 'rimebind', name: 'Rimebind', tag: 'All enemies', slot: 2, cooldown: 3,
      desc: 'Rime binds every enemy: places Slow on all enemies for 2 turns, with a little damage.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0.5, fx: 'rimebind' }],
      statuses: [{ status: 'spd_down', turns: 2, to: 'targets' }],
      castFx: 'cast_frost',
      actorFx: 'cold_flare',
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'cold_rebuke',
    name: 'Cold Rebuke',
    desc: 'While the Rime Scholar is below 35% HP, an enemy that lands a critical hit on her is Frozen for 1 turn. Then Cold Rebuke rests for 3 of her turns.',
    kind: 'rebuke',
    value: 0.35,
    statuses: [{ status: 'freeze', turns: 1 }],
    cooldown: 3,
  },
};
