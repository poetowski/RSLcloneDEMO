import { ChampionDef } from '../types';

// The Wraith (docs/DESIGN_DECISIONS.md section 62, Jakub's request of
// 2026-11-01 for the Ashveil Reign's remaining Elites, "be creative but
// consistent", he names them himself one by one): my proposal, built on that
// word. A shade with no body left, a hooded shroud fraying into smoke, a bone
// mask, long iron talons. The roster's first dispel (the engine's
// `stripBuffs`) and first skill that drains every enemy's turn meter at once.
// Stand-ins until Jakub sets them: all of it (the name, the kit, Ember, the
// numbers, the lore line, the art). It is summoned, like the other Elites.
export const wraith: ChampionDef = {
  id: 'wraith',
  name: 'Wraith',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'ashveil_reign',
  color: '#b4c0b4',
  stats: { hp: 1120, atk: 112, def: 58, spd: 104, crit: 0.05, critDmg: 1, acc: 0, res: 0 },
  lore: 'Whatever it was, nothing is left of it but the shroud, the mask and the hunger. It does not walk; it arrives, and whatever blessing kept you safe is gone before its talons are. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'grave_talons', name: 'Grave Talons', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Rakes one enemy twice with its iron talons.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.5, fx: 'talon_rake' }, { mult: 0.5, fx: 'talon_rake_back' }],
      ai: { priority: 1 },
    },
    {
      id: 'strip_the_living', name: 'Strip the Living', tag: 'Single enemy', slot: 2, cooldown: 4,
      desc: 'Vanishes and comes out of the dark behind one enemy: strips every buff from it, then strikes it.',
      target: 'enemy', anim: 'attack2', approach: 'blink',
      hits: [{ mult: 1.2, fx: 'wraith_rend' }],
      stripBuffs: true,
      ai: { priority: 2 },
    },
    {
      id: 'hollow_wail', name: 'Hollow Wail', tag: 'All enemies', slot: 3, cooldown: 5,
      desc: 'Wails from the empty dark under its hood: strikes all enemies and takes 15% of each one\'s Turn Meter.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0.75, fx: 'wail_hit' }],
      tmTargets: -15,
      actorFx: 'wail_rings',
      shake: 1,
      ai: { priority: 3 },
    },
  ],
};
