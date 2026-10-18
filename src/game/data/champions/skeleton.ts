import { ChampionDef } from '../types';

// The Skeleton (docs/DESIGN_DECISIONS.md section 28, Jakub's brief of
// 2026-10-18): the Ashveil Reign's first champion, a Common, Damage, Tide.
// The skeleton of a shorter human with a rusty sword, no armour, strips of
// fabric round its neck bone: a basic troop, a little fancy with that fabric.
// Kit: "A1 single attack"; "A2 passive = This champion has permanently
// increased Resistance by 20", a stat passive (kind 'stat'): by Jakub's rule
// of 2026-10-12 it is extra to the stat budget and works in combat only, so
// his RES in the collection shows 0 and the passive's text says the rest.
// Stand-ins until Jakub sets them: the stats (on the Common budget), the
// names Rusty Hack and Bare Bones and their texts, A1's multiplier (1.0, a
// plain attack), the lore line and the stage whose first clear brings him.
export const skeleton: ChampionDef = {
  id: 'skeleton',
  name: 'Skeleton',
  role: 'Damage',
  rarity: 'common',
  affinity: 'tide',
  faction: 'ashveil_reign',
  color: '#d4cab2',
  stats: { hp: 950, atk: 108, def: 58, spd: 108, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A skeleton in the service of the Ashveil Reign, the occult power that rules rather than worships: the bones of a short soldier, a rusty sword, strips of old cloth wound round his neck. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'rusty_hack', name: 'Rusty Hack', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A hack of the rusty sword at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'rusty_hack' }],
      ai: { priority: 1 },
    },
  ],
  passive: {
    id: 'bare_bones',
    name: 'Bare Bones',
    desc: 'In battle the Skeleton always has +20 RES on top of his stats.',
    kind: 'stat',
    stat: 'res',
    value: 20,
  },
};
