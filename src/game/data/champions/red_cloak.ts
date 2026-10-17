import { ChampionDef } from '../types';

// Red Cloak (docs/DESIGN_DECISIONS.md section 23, Jakub's proposal of
// 2026-10-17): an Elite of the Sanguine Dominion, Damage; a man in plate
// armour with a red cloak at his back, bald with only a goatee, wielding an
// ornamented silver zweihander. A1 a single-target attack; A2 Crimson Blade, an
// attack on one target with a 50% chance of Burn for 2 turns, cooldown 3 (Jakub,
// the same day: one Burn for 2 turns); A3 an attack on one enemy that places SPD
// Up on all allies for 2 turns, cooldown 5. Stand-ins until Jakub sets them: the
// affinity (he will set the four affinities later), the stats (on the Elite
// budget), the names Cleave and Onrush and the texts, the multipliers (A1 1.0,
// a plain attack; A2 1.3; A3 1.8), the lore line and the stage whose first clear
// brings him. Read by the game: "all allies" includes himself, as it does for
// every skill.
export const redCloak: ChampionDef = {
  id: 'red_cloak',
  name: 'Red Cloak',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'sanguine_dominion',
  color: '#d9443f',
  stats: { hp: 1120, atk: 126, def: 58, spd: 110, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A knight of the Sanguine Dominion, a power from a world of its own: plate armour, a red cloak at his back, bald but for his goatee, an ornamented silver zweihander in his hands. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'cleave', name: 'Cleave', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Brings the zweihander down from his shoulder through one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'cleave' }],
      ai: { priority: 1 },
    },
    {
      id: 'crimson_blade', name: 'Crimson Blade', tag: 'Single enemy', slot: 2, cooldown: 3,
      desc: 'Draws the blade through one enemy so fast that it glows crimson. A 50% chance to place Burn on it for 2 turns.',
      target: 'enemy', anim: 'attack2', approach: 'melee',
      hits: [{ mult: 1.3, fx: 'crimson_cut' }],
      statuses: [{ status: 'burn', turns: 2, chance: 0.5, to: 'targets' }],
      ai: { priority: 2 },
    },
    {
      id: 'onrush', name: 'Onrush', tag: 'Single enemy, all allies', slot: 3, cooldown: 5,
      desc: 'Charges one enemy point first and drives the line on behind him: places SPD Up on all allies for 2 turns.',
      target: 'enemy', anim: 'attack3', approach: 'melee',
      hits: [{ mult: 1.8, fx: 'onrush' }],
      statuses: [{ status: 'spd_up', turns: 2, to: 'allies' }],
      actorFx: 'war_cry',
      allyFx: 'onrush_gust',
      shake: 3,
      ai: { priority: 3 },
    },
  ],
};
