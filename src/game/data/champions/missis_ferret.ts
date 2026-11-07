import { ChampionDef } from '../types';

// Missis Ferret (Jakub's brief and name, docs/DESIGN_DECISIONS.md section 90,
// 2026-11-07: "some big trained ferret", renamed by him "Missis Ferret"): an
// Elite Tank of the Azure Crown; the kit, the look and Ember are my proposal,
// approved with his "all is fine ... go and deliver". A ferret the size of a
// pony, long and low, sable and cream with the dark mask, a padded azure
// caparison with white trim and the Crown's emblem, a small steel plate on her
// snout, a harness with a brass bell; the Crown's tunnellers trained her to
// flush diggers out of the mines under siege walls. War Dance is the ferret's
// own. Stand-ins: the skills' and the passive's names, texts, every number,
// the stats (on the Elite budget) and the lore line. She is summoned.
export const missisFerret: ChampionDef = {
  id: 'missis_ferret',
  name: 'Missis Ferret',
  role: 'Tank',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'azure_crown',
  color: '#b98c5c',
  stats: { hp: 1500, atk: 80, def: 74, spd: 98, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'The Azure Crown\'s tunnellers raised her to go down the mines under a besieged wall and bring out whoever was digging there. She has never lost a tunnel, and she never lets anyone forget it. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'nip_and_worry', name: 'Nip and Worry', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Darts in, bites one enemy and worries it. A 25% chance to place ATK Down on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'ferret_bite' }],
      statuses: [{ status: 'atk_down', turns: 1, chance: 0.25, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'war_dance', name: 'War Dance', tag: 'Self', slot: 2, cooldown: 4,
      desc: 'Hops, twists and chatters until every enemy looks at her: Taunt on herself for 2 turns, and a Shield worth 20% of her max HP for 2 turns. No attack.',
      target: 'self', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'dance_ward' }],
      statuses: [
        { status: 'taunt', turns: 2, to: 'self' },
        { status: 'shield', turns: 2, value: 0.2, to: 'self' },
      ],
      actorFx: 'dance_chatter',
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'slippery',
    name: 'Slippery',
    desc: 'She is immune to Stun.',
    kind: 'immune',
    value: 0,
    immuneTo: 'stun',
  },
};
