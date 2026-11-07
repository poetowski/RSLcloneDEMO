import { ChampionDef } from '../types';

// Leafshade (Jakub's brief, docs/DESIGN_DECISIONS.md section 94, 2026-11-07:
// an Elite Damage of the Court of Root, Tide, the batch's "humanoid not human",
// three abilities; the name, the look and the kit are my proposal, approved
// with his "go"). A lanky chameleon walking upright: a curled tail, a crest,
// two turret eyes turning on their own, mottled scales drifting slowly between
// leaf-green and bark-brown, a twist of woven grass at the waist, a thorn
// dagger. Vanish blinks behind its target and ignores part of its Defense.
// Unseen is a stat passive (+15% C.RATE, extra to the budget). Stand-ins: the
// names, texts, every number, the stats (on the Elite budget) and the lore
// line. It is summoned.
export const leafshade: ChampionDef = {
  id: 'leafshade',
  name: 'Leafshade',
  role: 'Damage',
  rarity: 'elite',
  affinity: 'tide',
  faction: 'court_of_root',
  color: '#7fae4a',
  stats: { hp: 1170, atk: 108, def: 58, spd: 108, crit: 0.075, critDmg: 1, acc: 0, res: 0 },
  lore: 'Nobody in the Court of Root knows how many of them there are. Everyone who has seen one says it was standing right beside them at the time. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'tongue_lash', name: 'Tongue Lash', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Shoots its long tongue out at one enemy and snaps it back.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'tongue_snap' }],
      ai: { priority: 1 },
    },
    {
      id: 'vanish', name: 'Vanish', tag: 'Single enemy', slot: 2, cooldown: 4,
      desc: 'Fades into the leaves and comes out behind one enemy, driving its thorn dagger in: its hit ignores 30% of the enemy\'s Defense.',
      target: 'enemy', anim: 'attack2', approach: 'blink',
      hits: [{ mult: 1.35, fx: 'thorn_stab' }],
      ignoreDef: 0.3,
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'unseen',
    name: 'Unseen',
    desc: 'In battle Leafshade always has +15% C.RATE on top of its stats.',
    kind: 'stat',
    stat: 'crit',
    value: 0.15,
  },
};
