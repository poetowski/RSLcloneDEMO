import { ChampionDef } from '../types';

// The Mask Carver (Jakub's brief, docs/DESIGN_DECISIONS.md section 96,
// 2026-11-07: an Elite Support of the Court of Root, Ember, the batch's
// human, three abilities; the name, the look, the lore and the kit are my
// proposal, approved with his "go"). A wiry middle-aged woman in a straw skirt
// and a wrap of bark-cloth, painted arms, a carved owl mask pushed up on her
// head, a dozen small bark masks of beasts on cords at her belt, a curved
// carving knife. Lend a Face is aimed at one chosen ally; Many Faces is a tend
// that never reaches her. Stand-ins: the names, texts, every number, the stats
// (on the Elite budget) and the lore line. She is summoned.
export const maskCarver: ChampionDef = {
  id: 'mask_carver',
  name: 'Mask Carver',
  role: 'Support',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'court_of_root',
  color: '#c8a060',
  stats: { hp: 1180, atk: 92, def: 62, spd: 114, crit: 0.05, critDmg: 1, acc: 0, res: 0 },
  lore: 'She carves a mask for every creature of the Court of Root, and while she wears one she can speak as it. Nobody in the Court agrees on anything, which makes her the nearest thing it has to a diplomat. She has never carved the same face twice. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'carving_knife', name: 'Carving Knife', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Cuts one enemy with her curved carving knife. A 30% chance to place Heal Block on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'carve_cut' }],
      statuses: [{ status: 'heal_block', turns: 1, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'lend_a_face', name: 'Lend a Face', tag: 'One ally', slot: 2, cooldown: 4,
      desc: 'Ties one of her masks on one chosen ally: ATK Up and SPD Up on it for 2 turns.',
      target: 'ally', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'mask_lent' }],
      statuses: [
        { status: 'atk_up', turns: 2, to: 'targets' },
        { status: 'spd_up', turns: 2, to: 'targets' },
      ],
      actorFx: 'mask_raise',
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'many_faces',
    name: 'Many Faces',
    desc: 'At the end of her turn, the ally with the lowest max HP other than her gains DEF Up for 1 turn. It works every other turn of hers: on her 1st, 3rd, 5th turn and so on.',
    kind: 'tend',
    value: 0,
    statuses: [{ status: 'def_up', turns: 1 }],
    cooldown: 1,
    others: true,
    fx: 'mask_lent',
  },
};
