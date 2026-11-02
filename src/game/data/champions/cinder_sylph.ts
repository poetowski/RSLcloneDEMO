import { ChampionDef } from '../types';

// The Cinder Sylph (docs/DESIGN_DECISIONS.md section 72, Jakub's brief of 2026-11-02): a
// Heroic of the Ashveil Reign. First drawn as a small burned fairy, then redrawn on his
// word: "more demonic and scary", "a more robust flame scepter". Tall and gaunt, she
// hovers on great burned bat wings, a skull of a face with a wide grin under great horns,
// fire between her ribs, a heavy iron scepter with fire burning in its head. The brief
// is his: A1 on one target, A2 a global debuff, A3 her signature, reviving all dead
// allies, a passive that burns enemies. The name is his, from five I proposed. Stand-ins
// until he sets them: her role (Support), Tide (he left the affinity to me), the skill
// names, the ATK Down, the numbers, the lore line, and that she is summoned.
export const cinderSylph: ChampionDef = {
  id: 'cinder_sylph',
  name: 'Cinder Sylph',
  role: 'Support',
  rarity: 'heroic',
  affinity: 'tide',
  faction: 'ashveil_reign',
  color: '#f0683a',
  muzzle: [52, 63],
  stats: { hp: 1320, atk: 96, def: 64, spd: 112, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'Whatever she was before the old wood burned, the fire kept her and ate the rest. The Cinder Sylph hangs over the Ashveil Reign on the bones of her wings, grinning, and where her ash comes down, the dead remember how to stand. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'cinder_touch', name: 'Cinder Touch', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Sweeps her scepter forward and hurls a live coal from its fire at one enemy.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1.0, fx: 'cinder_touch' }],
      projectile: 'cinder_mote',
      ai: { priority: 1 },
    },
    {
      id: 'falling_ash', name: 'Falling Ash', tag: 'All enemies', slot: 2, cooldown: 4,
      desc: 'One beat of her burned wings: ash comes down on all enemies, placing ATK Down on them for 2 turns. No attack.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'falling_ash' }],
      statuses: [{ status: 'atk_down', turns: 2, to: 'targets' }],
      actorFx: 'ash_beat',
      ai: { priority: 2 },
    },
    {
      id: 'rise_from_ash', name: 'Rise From Ash', tag: 'All fallen allies', slot: 3, cooldown: 6,
      desc: 'Calls back every fallen ally at once: each rises with 25% of its max HP. Ready only while an ally has fallen.',
      target: 'fallen', anim: 'ritual', approach: 'none',
      hits: [{ mult: 0, fx: 'rise_from_ash' }],
      revive: 0.25,
      reviveAll: true,
      actorFx: 'ash_crown',
      ai: { priority: 3 },
    },
  ],
  passive: {
    id: 'smoulder',
    name: 'Smoulder',
    desc: 'When an enemy attack hits the Cinder Sylph and leaves her standing, a 50% chance after the hit to place Burn on that enemy for 2 turns.',
    kind: 'retaliate',
    value: 0,
    chance: 0.5,
    statuses: [{ status: 'burn', turns: 2 }],
    fx: 'smoulder',
  },
};
