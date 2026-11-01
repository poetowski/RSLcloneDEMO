import { ChampionDef } from '../types';

// The Ash Widow (docs/DESIGN_DECISIONS.md section 49, Jakub's request of
// 2026-11-01 for the Ashveil Reign's second Common Support, "be very creative
// and propose both and design and deliver"): my proposal, built on that word; a
// veiled dead woman with an urn of ash. The passive kind `keen` is new: when an
// ally falls, she rallies those still standing. Stand-ins until Jakub sets them:
// all of it (the name, the kit, Bloom, the numbers, the lore line, the art). She
// is summoned.
export const ashWidow: ChampionDef = {
  id: 'ash_widow',
  name: 'Ash Widow',
  role: 'Support',
  rarity: 'common',
  affinity: 'bloom',
  faction: 'ashveil_reign',
  color: '#7a5a78',
  stats: { hp: 1240, atk: 82, def: 62, spd: 106, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'She carries everyone she has outlived in one urn, and she has outlived her own death as well. When she keens, the Reign\'s dead stand straighter. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'ash_flick', name: 'Ash Flick', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A pinch of ash flicked at one enemy, with a 30% chance of Heal Block for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 0.9, fx: 'ash_flick' }],
      statuses: [{ status: 'heal_block', turns: 1, chance: 0.3, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'sift_ash', name: 'Sift the Ash', tag: 'All allies', slot: 2, cooldown: 4,
      desc: 'She tips the urn over her side: every ally loses one debuff and heals by 10% of her max HP. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'sift_ash' }],
      healAllies: 0.1,
      healOf: 'caster',
      cleanse: true,
      ai: { priority: 2, when: 'allyHurt' },
    },
  ],
  passive: {
    id: 'keening',
    name: 'Keening',
    desc: 'When an ally falls, every ally still standing heals by 12% of her max HP and gains ATK Up for 2 turns.',
    kind: 'keen',
    value: 0.12,
    statuses: [{ status: 'atk_up', turns: 2 }],
    fx: 'sift_ash',
    holderFx: 'keening',
  },
};
