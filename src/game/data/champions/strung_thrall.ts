import { ChampionDef } from '../types';

// The Strung Thrall (Jakub's brief, docs/DESIGN_DECISIONS.md section 99,
// 2026-11-07: an Elite Support of the Ashveil Reign, "some kind of controlled
// zombie", two skills and a passive; the name, the look and the kit are my
// proposal, approved with his "go"). A lanky stitched corpse worked like a
// marionette: a control bar floats over it, the Reign's white bone laid
// across, and violet threads run from it to the wrists, the head and the
// knees; a torn grey shroud, an iron nail through a sigil tag on its brow.
// Stitch and Pull heals like the Quartermaster's Field Rations (each ally's own
// max HP here) and pulls the ally lowest on HP forward; Snagging Threads is a
// retaliate. Stand-ins: the names, texts, every number, the affinity, the stats
// (on the Elite budget; HP 1300, not the proposed 1260, to stay inside it) and
// the lore line. Summoned.
export const strungThrall: ChampionDef = {
  id: 'strung_thrall',
  name: 'Strung Thrall',
  role: 'Support',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'ashveil_reign',
  color: '#7a8890',
  stats: { hp: 1300, atk: 86, def: 64, spd: 102, crit: 0.05, critDmg: 1, acc: 0, res: 0 },
  lore: 'Nobody remembers who it was. The Ashveil Reign keeps it on threads and walks it where the wounded lie, and it stitches them up with the same patience it was stitched with. Whoever holds the other end of the threads has never been seen. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'jerked_blow', name: 'Jerked Blow', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Its threads yank its arm into a swing at one enemy. A 25% chance to place ATK Down on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'jerked_blow' }],
      statuses: [{ status: 'atk_down', turns: 1, chance: 0.25, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'stitch_and_pull', name: 'Stitch and Pull', tag: 'All allies', slot: 2, cooldown: 4,
      desc: 'Runs its threads out to every ally: each heals by 15% of its max HP. Then the ally with the lowest HP, other than itself, gains 15% Turn Meter.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'stitch_mend' }],
      healAllies: 0.15,
      tmLowestAlly: 15,
      actorFx: 'thread_flare',
      ai: { priority: 2, when: 'allyHurt' },
    },
  ],
  passive: {
    id: 'snagging_threads',
    name: 'Snagging Threads',
    desc: 'When an enemy attack hits the Strung Thrall and leaves it standing, a 40% chance after the hit to place Slow on that enemy for 1 turn.',
    kind: 'retaliate',
    value: 0,
    chance: 0.4,
    statuses: [{ status: 'spd_down', turns: 1 }],
    fx: 'thread_snag',
  },
};
