import { ChampionDef } from '../types';

// The Grove Keeper (docs/DESIGN_DECISIONS.md section 27, Jakub's proposal of
// 2026-10-17): an Elite of the Court of Root, Support; an old man with antlers
// and long grey hair, in a druidic ornamental robe, with a druidic staff. A1 an
// attack on one enemy that heals him by 7% of his max HP; A2 removes every
// debuff from one ally, cooldown 3; his A3 a passive: when an enemy places a
// debuff on an ally, a 35% chance to give that ally Regen for 1 turn.
// Stand-ins until Jakub sets them: the affinity (his proposal leaves it to do),
// the stats (on the Elite budget, a little under it for the passive), the names
// Thornburst, Cleansing Rite and Keeper's Balm and their texts, A1's multiplier
// (1.0, a plain attack), the lore line and the stage whose first clear brings
// him. Read by the game: the heal comes after the hit and Heal Block stops it;
// the one ally may be himself, and every debuff goes, Stun and Freeze too; an
// ally is anyone on his side, himself included, and each debuff that lands rolls
// once, a debuff an enemy passive places too.
export const groveKeeper: ChampionDef = {
  id: 'grove_keeper',
  name: 'Grove Keeper',
  role: 'Support',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'court_of_root',
  color: '#93a557',
  stats: { hp: 1320, atk: 92, def: 66, spd: 105, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A keeper of the groves of the Court of Root, which shares a nature and no hierarchy: an old man crowned with antlers, his long grey hair over a robe worked with the signs of the grove, his staff calling up thorns against his foes and balm for his own. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'thornburst', name: 'Thornburst', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Strikes the ground with his staff and brambles burst up round one enemy; their sap returns to him and heals him by 7% of his max HP.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1.0, fx: 'thornburst' }],
      healSelf: 0.07,
      ai: { priority: 1 },
    },
    {
      id: 'cleansing_rite', name: 'Cleansing Rite', tag: 'One ally', slot: 2, cooldown: 3,
      desc: 'Calls the breath of the grove round one ally and removes every debuff from it. No attack.',
      target: 'ally', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'cleansing_rite' }],
      cleanseAll: true,
      ai: { priority: 2, when: 'allyDebuffed' },
    },
  ],
  passive: {
    id: 'keepers_balm',
    name: "Keeper's Balm",
    desc: 'When an enemy places a debuff on an ally, the Grove Keeper included, a 35% chance to place Regen on that ally for 1 turn.',
    kind: 'remedy',
    value: 0,
    chance: 0.35,
    statuses: [{ status: 'regen', turns: 1 }],
    fx: 'keepers_balm',
  },
};
