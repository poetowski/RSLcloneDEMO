import { ChampionDef } from '../types';

// Captain Gareth, the starter (docs/DESIGN_DECISIONS.md section 8, Jakub's
// Starter Heroes record). His identity, look and kit are Jakub's: Line Cut,
// Iron Blow (ATK Up on himself after the hit, never gated by a crit) and Wide
// Sweep (damage only); no passive. His job is to teach how damage works.
// Stand-ins until Jakub sets them: the stats (his crit chance sits at the
// floor of the norms, as crit is not introduced on him), every multiplier and
// the cooldowns. Champions carry no subtitle (Jakub, 2026-10-11).
export const captainGareth: ChampionDef = {
  id: 'captain_gareth',
  name: 'Captain Gareth',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'azure_crown',
  color: '#e0a050',
  stats: { hp: 1150, atk: 122, def: 62, spd: 104, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A captain of the Azure Crown, a power from a world of its own; he would never naturally meet anyone of the Sanguine Dominion. He is a fragment now. The Archivist reassembles him, but he remembers being Captain Gareth.',
  skills: [
    {
      id: 'line_cut', name: 'Line Cut', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A single cut at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'sword_cut' }],
      ai: { priority: 1 },
    },
    {
      id: 'iron_blow', name: 'Iron Blow', tag: 'Single enemy', slot: 2, cooldown: 3,
      desc: 'A heavy strike at one enemy. On hit, Gareth gains ATK Up for 2 turns. The buff comes after the hit, so it never boosts the Iron Blow that grants it.',
      target: 'enemy', anim: 'attack2', approach: 'melee',
      hits: [{ mult: 1.5, fx: 'heavy_blow' }],
      statuses: [{ status: 'atk_up', turns: 2, to: 'self' }],
      shake: 5,
      ai: { priority: 2 },
    },
    {
      id: 'wide_sweep', name: 'Wide Sweep', tag: 'All enemies', slot: 3, cooldown: 4,
      desc: 'One wide sweep through the enemy line that hits every enemy. Damage only.',
      target: 'enemies', anim: 'attack3', approach: 'center',
      hits: [{ mult: 0.95, fx: 'sword_sweep' }],
      shake: 3,
      ai: { priority: 3 },
    },
  ],
};
