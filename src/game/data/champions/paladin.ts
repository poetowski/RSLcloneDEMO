import { ChampionDef } from '../types';

// The Paladin (docs/DESIGN_DECISIONS.md section 34, Jakub's brief of
// 2026-10-24): a Heroic of the Azure Crown, the roster's first Heroic, Tank
// ("class = DEFENSE"), Ember (Tide in the brief, Ember on his word the same
// day: "change his affinity to ember"); the reward of a quest line Jakub
// designs later. A tall young knight in silver plate with wide ornate
// pauldrons, bareheaded, long blonde hair; a long dark-blue cloak with three
// white crowns; a big Swiss-shaped shield with a double cross; a wide, very
// bright sword with flames. The kit is his: "A1 - attack one enemy. cause
// attack down for 1 turn. A2 - all allies get DEFENSE UP for 2 turns and all
// enemies get SPEED DOWN for 2 turns. no damage. also fill this champion turn
// meter by 35% towards next turn. CD 4 turns. A3 - buff this champion with
// taunt for 2 turns and regeneration buff for 3 turns. then attacks all
// enemies. CD 5 turns. A4 (passive) - This champion has permanent 50
// resistance bonus."
// Stand-ins until Jakub sets them: the names Searing Cut, Beacon, Trial by
// Fire and Unbowed and their texts, the multipliers (1.0; 0.7 on each enemy,
// the floor of the norms, as his kit lifts him over the band, MECHANICS_GUIDE 10),
// the stats (on the Heroic budget), the lore line and the stage whose first
// clear brings him until his quest line exists (5-10, the campaign's last).
// Read by the game: DEFENSE is the Tank role; ATTACK DOWN, DEFENSE UP and
// SPEED DOWN are ATK Down, DEF Up and Slow; the ATK Down and the Slow are
// certain, meeting RES like every debuff; "all allies" includes him; the 35%
// is turn meter he starts his next turn with (`selfTm`); Taunt and Regen are
// placed before the sweep and, placed on his own turn, last through his next
// two and three turns; the passive is a stat passive, +50 RES in battle only.
export const paladin: ChampionDef = {
  id: 'paladin',
  name: 'Paladin',
  role: 'Tank',
  rarity: 'heroic',
  affinity: 'ember',
  faction: 'azure_crown',
  color: '#ffd860',
  stats: { hp: 1480, atk: 92, def: 78, spd: 98, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: 'A paladin of the Azure Crown, a power from a world of its own: young and fierce, he goes bareheaded in silver plate under a dark-blue cloak with the Crown\'s three white crowns, behind a great shield with a double cross, and his sword burns so bright it is hard to look at. Like every champion, a fragment the Archivist recollects.',
  skills: [
    {
      id: 'searing_cut', name: 'Searing Cut', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'A cut of the burning sword at one enemy that places ATK Down on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'melee',
      hits: [{ mult: 1.0, fx: 'searing_cut' }],
      statuses: [{ status: 'atk_down', turns: 1, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'beacon', name: 'Beacon', tag: 'All allies, all enemies', slot: 2, cooldown: 4,
      desc: 'Raises the burning sword like a beacon: places DEF Up on all allies for 2 turns and Slow on all enemies for 2 turns, and fills his own Turn Meter by 35%. No attack.',
      target: 'enemies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'beacon_glare' }],
      statuses: [
        { status: 'def_up', turns: 2, to: 'allies' },
        { status: 'spd_down', turns: 2, to: 'targets' },
      ],
      selfTm: 35,
      actorFx: 'beacon_flare',
      allyFx: 'beacon_ward',
      ai: { priority: 2 },
    },
    {
      id: 'trial_by_fire', name: 'Trial by Fire', tag: 'All enemies', slot: 3, cooldown: 5,
      desc: 'Places Taunt on himself for 2 turns and Regen for 3, then sweeps the burning sword through all enemies.',
      target: 'enemies', anim: 'attack3', approach: 'center',
      hits: [{ mult: 0.7, fx: 'trial_flames' }],
      statuses: [
        { status: 'taunt', turns: 2, to: 'self', before: true },
        { status: 'regen', turns: 3, to: 'self', before: true },
      ],
      actorFx: 'trial_blaze',
      shake: 2,
      ai: { priority: 3 },
    },
  ],
  passive: {
    id: 'unbowed',
    name: 'Unbowed',
    desc: 'In battle the Paladin always has +50 RES on top of his stats.',
    kind: 'stat',
    stat: 'res',
    value: 50,
  },
};
