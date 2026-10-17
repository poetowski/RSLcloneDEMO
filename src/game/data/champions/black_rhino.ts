import { ChampionDef } from '../types';

// The Black Rhino (docs/DESIGN_DECISIONS.md section 26, Jakub's proposal of
// 2026-10-17): an Elite of the Sanguine Dominion, Tank; a bulky, furry black
// bull with long prosthetic tusks made to raise its damage, a red X painted on
// its back by its master. A1 an attack on one enemy with a 20% chance of Stun
// for 1 turn; A2 DEF Up on all allies for 2 turns and Counterattack on himself
// for 2 turns, cooldown 5; his A3 a passive: when an enemy hits him, a Shield of
// 10% of his max HP on himself for 1 turn, after the hit. Stand-ins until Jakub
// sets them: the affinity (his proposal does not name one), the stats (on the
// Elite budget, a little under it for the passive), the names Gore, War Bellow
// and Thick Hide and their texts, A1's multiplier (1.0, a plain attack), the
// Stun's 1 turn (the norm for control), the lore line and the stage whose
// first clear brings him. Read by the game: a hit is an enemy skill that
// damages him and leaves him standing (a counterattack too), answered every
// time, once per skill however many hits it took; a Shield placed again
// refreshes to the larger value; "all allies" includes himself.
export const blackRhino: ChampionDef = {
  id: 'black_rhino',
  name: 'Black Rhino',
  role: 'Tank',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'sanguine_dominion',
  color: '#e0505a',
  stats: { hp: 1520, atk: 80, def: 74, spd: 90, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A war beast of the Sanguine Dominion, whose name means life and not menace: a great black bull in a shaggy coat, called the Black Rhino for the iron-shod tusks his master strapped to his head, and marked with the red X his master painted on his back. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'gore', name: 'Gore', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Charges one enemy and drives his tusks into it. A 20% chance to place Stun on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'gore' }],
      statuses: [{ status: 'stun', turns: 1, chance: 0.2, to: 'targets' }],
      shake: 2,
      ai: { priority: 1 },
    },
    {
      id: 'war_bellow', name: 'War Bellow', tag: 'All allies', slot: 2, cooldown: 5,
      desc: 'Stamps and bellows over the line: places DEF Up on all allies for 2 turns and Counterattack on the Black Rhino for 2 turns. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'bellow_stand' }],
      statuses: [
        { status: 'def_up', turns: 2, to: 'allies' },
        { status: 'counter', turns: 2, to: 'self' },
      ],
      actorFx: 'war_bellow',
      shake: 2,
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'thick_hide',
    name: 'Thick Hide',
    desc: 'Whenever an enemy attack hits the Black Rhino, he gains a Shield of 10% of his max HP for 1 turn, after the hit.',
    kind: 'ward',
    self: true,
    value: 0.1,
    statuses: [{ status: 'shield', turns: 1 }],
    fx: 'thick_hide',
  },
};
