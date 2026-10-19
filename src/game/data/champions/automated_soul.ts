import { ChampionDef } from '../types';

// The Automated Soul (docs/DESIGN_DECISIONS.md section 32, Jakub's brief of
// 2026-10-18): an Elite of the Ashveil Reign, Damage, Tide. An archer
// skeleton with no head, in shiny azure and gold plate, a wooden longbow; he
// fires arrows on attack. The kit is his: "A1 - attack 1 enemy. A2 - attacks
// all enemies, debuff every enemy with DEFENSE DOWN for 2 turns. CD 4 turns.
// A3 - attacks 1 enemy, before attacks grant ATTACK UP on this champion for 2
// turns. Also stun target for 1 turn. CD 4 turns." Stand-ins until Jakub sets
// them: the names Unerring Shot, Sundering Volley and Pinning Shot and their
// texts, the multipliers (1.0, 0.6 on each enemy, 1.3), the stats (on the
// Elite budget), the lore line and the stage whose first clear brings him.
// Read by the game: DEFENSE DOWN is DEF Down and ATTACK UP is ATK Up; the DEF
// Down and the Stun are certain, meeting RES like every debuff; the ATK Up is
// placed before the shot, so the shot itself is boosted, and like any status
// placed on his own turn it lasts through his next two turns.
export const automatedSoul: ChampionDef = {
  id: 'automated_soul',
  name: 'Automated Soul',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'ashveil_reign',
  color: '#5a98ee',
  muzzle: [30, 61],
  stats: { hp: 1100, atk: 120, def: 64, spd: 104, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'An archer of the Ashveil Reign with no head: bones bound in shiny azure plate trimmed with gold, a soul set to its work and never let go of it, drawing and loosing without eyes and without rest. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'unerring_shot', name: 'Unerring Shot', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Looses an arrow at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1.0, fx: 'arrow_strike' }],
      projectile: 'soul_arrow',
      ai: { priority: 1 },
    },
    {
      id: 'sundering_volley', name: 'Sundering Volley', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'Looses a volley into the sky that falls on all enemies and places DEF Down on them for 2 turns.',
      target: 'enemies', anim: 'attack2', approach: 'none',
      hits: [{ mult: 0.6, fx: 'arrow_volley' }],
      projectile: 'soul_arrow',
      volley: 'soul_arrow',
      statuses: [{ status: 'def_down', turns: 2, to: 'targets' }],
      ai: { priority: 2 },
    },
    {
      id: 'pinning_shot', name: 'Pinning Shot', tag: 'Single enemy', slot: 3, cooldown: 4,
      desc: 'Places ATK Up on himself for 2 turns, then looses an arrow at full draw at one enemy that places Stun on it for 1 turn.',
      target: 'enemy', anim: 'attack3', approach: 'none',
      hits: [{ mult: 1.3, fx: 'pinning_strike' }],
      projectile: 'pinning_arrow',
      statuses: [
        { status: 'atk_up', turns: 2, to: 'self', before: true },
        { status: 'stun', turns: 1, to: 'targets' },
      ],
      ai: { priority: 3 },
    },
  ],
};
