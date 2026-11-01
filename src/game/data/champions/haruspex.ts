import { ChampionDef } from '../types';

// The Haruspex (docs/DESIGN_DECISIONS.md section 63, named by Jakub; his request of
// 2026-11-01 for the Ashveil Reign's remaining Elites, "be creative but
// consistent", he names them himself one by one): my proposal, built on that
// word. A dead seer, her eyes bound, who reads the fight in knucklebones and a
// ram's skull on her staff. The roster's first skill that fills every other
// ally's turn meter (the engine's `tmAllies`). Stand-ins until Jakub sets them:
// the kit, Tide, the numbers, the lore line, the art). She
// is summoned, like the other Elites.
export const haruspex: ChampionDef = {
  id: 'haruspex',
  name: 'Haruspex',
  role: 'Support',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'ashveil_reign',
  color: '#cfc2a0',
  muzzle: [26, 56],
  stats: { hp: 1240, atk: 92, def: 64, spd: 112, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'She bound her own eyes the day she died, so that she would only ever see what the bones show her. They have not lied to her yet; they simply never say whose turn it is to lose. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'cast_the_bones', name: 'Cast the Bones', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Casts a handful of knucklebones at one enemy. A 30% chance to place DEF Down on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1.0, fx: 'bones_strike' }],
      projectile: 'knucklebones',
      statuses: [{ status: 'def_down', turns: 1, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'read_the_omens', name: 'Read the Omens', tag: 'All allies', slot: 2, cooldown: 4,
      desc: 'Reads the omens for her side: places ATK Up on all allies for 2 turns, and fills every other ally\'s Turn Meter by 20%. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'omen_favour' }],
      statuses: [{ status: 'atk_up', turns: 2, to: 'allies' }],
      tmAllies: 20,
      actorFx: 'omen_skull',
      ai: { priority: 2 },
    },
    {
      id: 'ill_omen', name: 'Ill Omen', tag: 'All enemies', slot: 3, cooldown: 5,
      desc: 'Points the ram\'s skull at the enemy: places ATK Down on all enemies for 2 turns, and takes 15% of each one\'s Turn Meter. No attack.',
      target: 'enemies', anim: 'ritual', approach: 'none',
      hits: [{ mult: 0, fx: 'ill_omen' }],
      statuses: [{ status: 'atk_down', turns: 2, to: 'targets' }],
      tmTargets: -15,
      actorFx: 'omen_skull',
      ai: { priority: 3 },
    },
  ],
};
