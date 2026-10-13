import { ChampionDef } from '../types';

// The Wild Speaker (docs/DESIGN_DECISIONS.md section 20, Jakub's brief of
// 2026-10-13): a Common of the Court of Root, Support, Ember; a humanoid with
// tribal tattoos and a long stick with two green ribbons at its head, bare
// legs and arms, his torso covered in leather. A1 a single-target attack; A2 a
// single-target attack that has, after the attack, a 50% chance to place ATK
// Down on the target for 2 turns, cooldown 4. Stand-ins until Jakub sets them:
// the stats (on the Common budget), the names Staff Blow and Quell and their
// texts, both multipliers (A1 1.0, a plain attack; A2 1.3), the lore line and
// the stage whose first clear brings him.
export const wildSpeaker: ChampionDef = {
  id: 'wild_speaker',
  name: 'Wild Speaker',
  role: 'Support',
  rarity: 'common',
  affinity: 'ember',
  faction: 'court_of_root',
  color: '#5fb8aa',
  stats: { hp: 1100, atk: 94, def: 60, spd: 106, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A speaker of the semi-wild tribes of the Court of Root, which shares a nature and no hierarchy: tribal tattoos on his bare arms and legs, his torso in leather, a long stick with two green ribbons at its head. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'staff_blow', name: 'Staff Blow', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Drives the head of his long stick into one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'staff_blow' }],
      ai: { priority: 1 },
    },
    {
      id: 'quell', name: 'Quell', tag: 'Single enemy', slot: 2, cooldown: 4,
      desc: 'Swings his long stick up over his head and brings it down on one enemy. After the hit, a 50% chance to place ATK Down on it for 2 turns.',
      target: 'enemy', anim: 'skill', approach: 'melee',
      hits: [{ mult: 1.3, fx: 'quell' }],
      statuses: [{ status: 'atk_down', turns: 2, chance: 0.5, to: 'targets' }],
      ai: { priority: 2 },
    },
  ],
};
