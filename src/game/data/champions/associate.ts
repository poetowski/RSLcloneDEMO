import { ChampionDef } from '../types';

// The Associate (docs/DESIGN_DECISIONS.md section 25, Jakub's proposal of
// 2026-10-17): an Elite of the Azure Crown, Support; a woman mage in a full
// azure robe with white stripes and dark-blue woven shoulders, a magic staff
// with small white particles round its broader top, medium-length dark curly
// hair. A1 an attack on one enemy with a 50% chance of ATK Down for 1 turn; A2
// SPD Up on all allies for 2 turns and ATK Up for 1 turn, cooldown 5; her A3 a
// passive: when an enemy attack hits her, a 35% chance to answer with Poison on
// that enemy for 1 turn. Stand-ins until Jakub sets them: the affinity (his
// proposal leaves it to do), the stats (on the Elite budget, a little under it
// for the passive), the names Mote Bolt, Quickening and Bitter Motes and their
// texts, A1's multiplier (1.0, a plain attack), the lore line and the stage
// whose first clear brings her. Read by the game: a hit is an enemy skill that
// damages her and leaves her standing (a counterattack too), answered once per
// skill, however many hits it took; the Poison meets the attacker's RES like
// every debuff, and placed on its turn it counts from its next, so it ticks
// once; "all allies" includes her, and her own buffs, placed on her turn, cover
// her next turns.
export const associate: ChampionDef = {
  id: 'associate',
  name: 'Associate',
  role: 'Support',
  rarity: 'elite',
  affinity: 'ember',
  faction: 'azure_crown',
  color: '#8fc0ff',
  muzzle: [54, 58],
  stats: { hp: 1220, atk: 96, def: 64, spd: 112, crit: 0.025, critDmg: 1, acc: 0, res: 0 },
  lore: "An associate of the Azure Crown's mages, a power from a world of its own: in a full azure robe striped white, her staff wreathed in motes of light that quicken her allies and turn bitter on whoever strikes her. Like every champion, a fragment the Archivist recollects.",
  skills: [
    {
      id: 'mote_bolt', name: 'Mote Bolt', tag: 'Single enemy', slot: 1, cooldown: 0,
      desc: 'Sends the motes of her staff at one enemy in a bolt of white light. A 50% chance to place ATK Down on it for 1 turn.',
      target: 'enemy', anim: 'attack1', approach: 'none',
      hits: [{ mult: 1.0, fx: 'mote_burst' }],
      projectile: 'mote_bolt',
      statuses: [{ status: 'atk_down', turns: 1, chance: 0.5, to: 'targets' }],
      ai: { priority: 1 },
    },
    {
      id: 'quickening', name: 'Quickening', tag: 'All allies', slot: 2, cooldown: 5,
      desc: 'Raises her staff and sends its motes to every ally: places SPD Up on all allies for 2 turns and ATK Up for 1 turn. No attack.',
      target: 'allies', anim: 'skill', approach: 'none',
      hits: [{ mult: 0, fx: 'quicken' }],
      statuses: [
        { status: 'spd_up', turns: 2, to: 'allies' },
        { status: 'atk_up', turns: 1, to: 'allies' },
      ],
      actorFx: 'mote_flare',
      ai: { priority: 2 },
    },
  ],
  passive: {
    id: 'bitter_motes',
    name: 'Bitter Motes',
    desc: 'When an enemy attack hits the Associate, a 35% chance after the hit to place Poison on that enemy for 1 turn.',
    kind: 'retaliate',
    value: 0,
    chance: 0.35,
    statuses: [{ status: 'poison', turns: 1 }],
    fx: 'bitter_motes',
  },
};
