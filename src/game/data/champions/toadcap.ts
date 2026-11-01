import { ChampionDef } from '../types';

// The Toadcap (docs/DESIGN_DECISIONS.md section 50, Jakub's "go" of 2026-11-01 to
// fill the Court of Root's last Commons): my proposal, built on that word; a
// walking mushroom, stubby on root feet under a huge spotted cap. Stand-ins until
// Jakub sets them: all of it (the name, the kit, Ember, the numbers, the lore
// line, the art). Only an A1, on his word mid-build ("max 2 skills, some even just
// a1"). He is summoned.
export const toadcap: ChampionDef = {
  id: 'toadcap',
  name: 'Toadcap',
  role: 'Damage',
  rarity: 'common',
  affinity: 'ember',
  faction: 'court_of_root',
  color: '#b5683c',
  stats: { hp: 1000, atk: 106, def: 58, spd: 104, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A mushroom of the Court of Root that got up one wet morning and has not sat down since. It does not hate anyone; it only wants somewhere new to grow. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'spore_slap', name: 'Spore Slap', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'It butts one enemy with its cap, with a 35% chance of Poison for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1, fx: 'spore_slap' }],
      statuses: [{ status: 'poison', turns: 1, chance: 0.35, to: 'targets' }],
      ai: { priority: 1 },
    },
  ],
};
