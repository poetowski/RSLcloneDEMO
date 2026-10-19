import { ChampionDef } from '../types';

// Irving Wellbington (docs/DESIGN_DECISIONS.md section 33, Jakub's brief of
// 2026-10-19): an Elite of the Ashveil Reign, Tank, Bloom. A dwarf skeleton
// with a big horned helmet and a robust round shield with ancient runes on
// it. The kit is his: "A1 - attack single target, has 35% chance to debuff
// target enemy with SLOW DOWN for 1 turn. A2 - attack single target, buff this
// champion with defense up for 2 turns and counter for 1 turn. CD 4 turns. A3
// passive - When enemy lands critical hit on this champion, buff this champion
// with TAUNT for 1 turn. Also, heal this champion by 20% of his MAX HP."
// Stand-ins until Jakub sets them: the names Shield Bash, Bulwark Slam and Old
// Grudge and their texts, A1's 1.0 and A2's 1.2, the stats (on the Elite
// budget, a little under it for the passive), the lore line and the stage
// whose first clear brings him. Read by the game: SLOW DOWN is Slow and
// "counter" Counterattack; the A2's buffs come after its hit and, placed on
// his own turn, last through his next turns; no weapon is named, so he
// strikes with the shield; the passive answers once per enemy skill, after its
// last hit, while he still stands, a lethal crit never wakes it, and Heal
// Block stops its heal.
export const irvingWellbington: ChampionDef = {
  id: 'irving_wellbington',
  name: 'Irving Wellbington',
  role: 'Tank',
  rarity: 'elite',
  affinity: 'bloom',
  faction: 'ashveil_reign',
  color: '#c8b9a4',
  stats: { hp: 1460, atk: 82, def: 76, spd: 90, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A dwarf of the Ashveil Reign, dead and still holding his ground: bones under a great horned helmet, behind a round shield cut with runes older than the Reign. He keeps every grudge he ever had, and every blow that lands hard adds one. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'shield_bash', name: 'Shield Bash', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Bashes one enemy with the face of his shield. A 35% chance to place Slow on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'shield_bash' }],
      statuses: [{ status: 'spd_down', turns: 1, chance: 0.35, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'bulwark_slam', name: 'Bulwark Slam', tag: 'Single enemy', slot: 2, cooldown: 4,
      desc: 'Brings the rim of his shield down on one enemy, then plants it before him: DEF Up on himself for 2 turns and Counterattack for 1 turn.',
      target: 'enemy', anim: 'attack2', approach: 'melee',
      hits: [{ mult: 1.2, fx: 'bulwark_slam' }],
      statuses: [
        { status: 'def_up', turns: 2, to: 'self' },
        { status: 'counter', turns: 1, to: 'self' },
      ],
      shake: 2,
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'old_grudge',
    name: 'Old Grudge',
    desc: 'When an enemy lands a critical hit on him and he still stands, he places Taunt on himself for 1 turn and heals by 20% of his max HP.',
    kind: 'defy',
    value: 0.2,
    statuses: [{ status: 'taunt', turns: 1 }],
    holderFx: 'grudge_runes',
  },
};
