import { ChampionDef } from '../types';

// The Bellringer (docs/DESIGN_DECISIONS.md section 30, Jakub's brief of
// 2026-10-18): the Ashveil Reign's third champion, a Common, Support, Ember
// (Bloom in the brief; "change bellring affinity to ember.", the same day). A
// very tall, slim skeleton with no weapon and no lower jaw, in boots, whose
// role is to see the enemy coming and ring the big golden bell fixed to his
// arm. The kit is his: "A1 - add Shield on target ally for 1 turn, value of
// shield is 10% of this champion max hp. Also, heal this champion for 10% of
// his max hp. A2 passive - first time this champion hp drops below 50%, add
// defense up on this champion for 2 turns." Stand-ins until Jakub sets them:
// the names Warning Toll and Last Peal and their texts, the stats (on the
// Common budget and a little under it for his passive; ATK at the floor, as
// he never strikes), the lore line and the stage whose first clear brings him.
export const bellringer: ChampionDef = {
  id: 'bellringer',
  name: 'Bellringer',
  role: 'Support',
  rarity: 'common',
  affinity: 'ember',
  faction: 'ashveil_reign',
  color: '#ecc04e',
  stats: { hp: 1300, atk: 70, def: 60, spd: 110, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A watchman of the Ashveil Reign, a tall, thin skeleton with no jaw left to cry out with, so he rings: he sees the enemy coming long before the others do, and the golden bell fixed to his arm tolls the warning. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'warning_toll', name: 'Warning Toll', tag: 'One ally', slot: 1, cooldown: 0,
      desc: 'Points the enemy out and tolls his bell: one ally gains a Shield of 10% of his max HP for 1 turn, and the Bellringer heals by 10% of his max HP. No attack.',
      target: 'ally', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'warning_toll' }],
      statuses: [{ status: 'shield', turns: 1, value: 0.1, to: 'targets' }],
      healSelf: 0.1,
      actorFx: 'toll_rings',
      ai: { priority: 1 },
    },
  ],
  passive: {
    id: 'last_peal',
    name: 'Last Peal',
    desc: 'The first time the Bellringer drops below 50% HP, he gains DEF Up for 2 turns.',
    kind: 'overdrive',
    value: 0.5,
    statuses: [{ status: 'def_up', turns: 2 }],
    holderFx: 'last_peal',
  },
};
