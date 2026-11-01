import { ChampionDef } from '../types';

// The Verdant Luminary (Jakub's brief, docs/DESIGN_DECISIONS.md section 60,
// 2026-11-01): an Elite Support of the Azure Crown, Bloom; a forest nymph with a
// sword and a bag on her back (first a shortbow; Jakub's correction the same day) and a
// big bow in her hand, born in the kingdom and raised on
// government money to represent it toward the green races. A1 hits one enemy and
// heals her for 20% of the damage dealt; A2 hits every enemy, 70% on each to place
// Heal Block for 2 turns, and Regen on every ally, herself included, for 2 turns,
// cooldown 4; her passive, when an ally, herself included, is critically hit, has a
// 70% chance to place ATK Down on the attacker for 1 turn. Stand-ins: the skills'
// and the passive's names, the multipliers, the stats (on the Elite budget). She is
// summoned.
export const verdantLuminary: ChampionDef = {
  id: 'verdant_luminary',
  name: 'Verdant Luminary',
  role: 'Support',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'azure_crown',
  color: '#a8cf7c',
  muzzle: [30, 54],
  stats: { hp: 1240, atk: 92, def: 62, spd: 104, crit: 0.05, critDmg: 1, acc: 0, res: 0 },
  lore: 'A forest nymph born in the kingdom and raised on government money, so that the Azure Crown would have someone to send to the green races. She wears the Crown\'s blue and its gold crown to every grove, carries its great bow, and keeps her own sword and a bag of dispatches on her back. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'envoys_arrow', name: 'Envoy\'s Arrow', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Looses one long arrow from the great bow at one enemy, and heals herself for 20% of the damage it deals.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 0.95, fx: 'luminary_strike' }],
      projectile: 'luminary_arrow',
      lifesteal: 0.2,
      lifestealMote: { fx: 'sap_mote', trail: ['#eaffc8', '#a2f56a', '#22922c'] },
      ai: { priority: 1 },
    },
    {
      id: 'crowns_mandate', name: 'Crown\'s Mandate', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'Looses a volley into the sky that falls on all enemies, with a 70% chance on each to place Heal Block for 2 turns. Places Regen on every ally, herself included, for 2 turns.',
      target: 'enemies', anim: 'attack2', approach: 'none',
      hits: [{ mult: 0.5, fx: 'arrow_volley' }],
      projectile: 'luminary_arrow',
      volley: 'luminary_arrow',
      allyFx: 'luminary_leaves',
      statuses: [
        { status: 'heal_block', turns: 2, chance: 0.7, to: 'targets' },
        { status: 'regen', turns: 2, to: 'allies' },
      ],
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'formal_protest',
    name: 'Formal Protest',
    desc: 'When an enemy critically hits an ally, herself included, a 70% chance to place ATK Down on the attacker for 1 turn.',
    kind: 'reproach',
    value: 0,
    chance: 0.7,
    statuses: [{ status: 'atk_down', turns: 1 }],
    fx: 'luminary_seal',
  },
};
