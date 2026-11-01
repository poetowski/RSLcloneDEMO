import { ChampionDef } from '../types';

// The Hive Tender (docs/DESIGN_DECISIONS.md section 52, Jakub's "go" of 2026-11-01
// to fill the Court of Root's last Commons): my proposal, built on that word; a
// woman of the semi-wild tribes carrying a straw hive on a long pole, her bees
// round it. Stand-ins until Jakub sets them: all of it (the name, the kit, Bloom,
// the numbers, the lore line, the art). She is summoned.
export const hiveTender: ChampionDef = {
  id: 'hive_tender',
  name: 'Hive Tender',
  role: 'Support',
  rarity: 'common',
  affinity: 'bloom',
  faction: 'court_of_root',
  color: '#c9a040',
  stats: { hp: 1220, atk: 84, def: 62, spd: 106, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A woman of the semi-wild tribes who walks with a hive on a pole and has not been stung since she was small. The bees go where she goes, or she goes where they go; she has stopped asking. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'sting_swarm', name: 'Sting Swarm', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'She tips the hive at one enemy and her bees go, with a 30% chance of ATK Down for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 0.9, fx: 'bee_swarm' }],
      statuses: [{ status: 'atk_down', turns: 1, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'comb_honey', name: 'Comb Honey', tag: 'All allies', slot: 2, cooldown: 4,
      desc: 'She shares the comb: Regen for 2 turns on every ally, and 15% Turn Meter to the ally lowest on HP. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'honey_drip' }],
      statuses: [{ status: 'regen', turns: 2, to: 'allies' }],
      tmLowestAlly: 15,
      ai: { priority: 2, when: 'allyHurt' },
    },
  ],
};
