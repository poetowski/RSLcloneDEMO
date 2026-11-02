import { ChampionDef } from '../types';

// The War Tigress (docs/DESIGN_DECISIONS.md section 65, 2026-11-02, my design on
// Jakub's word: "3 more sanguine dominion elites", one per class, one an animal): an
// Elite Damage of the Sanguine Dominion, Ember; a war beast in a black harness with
// the Dominion's red hexagon. Her name, kit, numbers, affinity and look stand in
// until he sets them. She is summoned.
export const warTigress: ChampionDef = {
  id: 'war_tigress',
  name: 'War Tigress',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'sanguine_dominion',
  color: '#d8743a',
  stats: { hp: 1080, atk: 118, def: 58, spd: 110, crit: 0.05, critDmg: 1, acc: 0, res: 0 },
  lore: 'A war beast of the Sanguine Dominion, where blood means life: she takes it where she finds it and is the stronger for it. Her harness carries the red hexagon, and nobody has yet asked for it back. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'claw_rake', name: 'Claw Rake', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Rakes one enemy with both forepaws, one after the other.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 0.55, fx: 'tigress_rake' }, { mult: 0.55, fx: 'tigress_rake_back' }],
      ai: { priority: 1 },
    },
    {
      id: 'blood_pounce', name: 'Blood Pounce', tag: 'Single enemy', slot: 2, cooldown: 4,
      desc: 'Leaps on one enemy, striking half as hard again if it is below 40% HP, and heals herself for 30% of the damage dealt.',
      target: 'enemy', anim: 'skill', approach: 'leap',
      hits: [{ mult: 1.3, fx: 'tigress_pounce' }],
      execute: { below: 0.4, mult: 1.5 },
      lifesteal: 0.3,
      lifestealMote: { fx: 'blood_mote', trail: ['#f88a68', '#ad2234', '#420c1c'] },
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'scent_of_blood',
    name: 'Scent of Blood',
    desc: 'Always: +10% C.RATE.',
    kind: 'stat',
    stat: 'crit',
    value: 0.1,
  },
};
