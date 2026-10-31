// The Academy: an in-game codex that teaches combat. Every number quoted here
// comes from src/game/battle/battle.ts and src/game/data/statuses.ts; when a
// rule changes, its chapter changes with it (tests/content.test.ts checks
// that every status has a codex entry and that demo skills exist).
import { StatusId } from './types';

export type FigureId = 'turnmeter' | 'skills' | 'damage' | 'affinity' | 'stars' | 'rarity' | 'roles' | 'controls' | 'duration';

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'statuses'; ids: StatusId[] }
  | { kind: 'figure'; id: FigureId }
  | { kind: 'tip'; text: string }
  | { kind: 'list'; items: string[] };

export interface Chapter {
  id: string;
  title: string;
  /** UI part shown in the chapter list */
  icon: string;
  blocks: Block[];
  /** "See it" button: replays a champion's skill in the arena */
  demo?: { skill: string; label: string };
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'basics',
    title: 'The Basics',
    icon: 'mi_fight',
    blocks: [
      { kind: 'p', text: 'Battles are fought between two teams of up to three champions. Your team stands on the left, the enemy on the right. The fight ends when one side has no champion left standing.' },
      { kind: 'p', text: 'Nobody acts at once: champions take turns in the order set by the Turn Meter. On your champion\'s turn you choose one of its skills and a target; enemies (and your team on Auto) are played by the AI.' },
      { kind: 'h', text: 'A turn, step by step' },
      { kind: 'list', items: ['Turn Meters fill until someone reaches 100%.', 'Start of turn: Poison, Burn and Regen tick. A Stunned or Frozen champion loses the turn.', 'The champion uses one skill.', 'End of turn: its buffs and debuffs count down one turn (an effect placed during this turn starts counting at its next), its cooldowns tick and its Turn Meter resets.'] },
      { kind: 'tip', text: 'Hover any champion, skill or status icon during your turn to read exactly what it does.' },
    ],
  },
  {
    id: 'turnmeter',
    title: 'Turn Meter & Speed',
    icon: 'g_speed',
    blocks: [
      { kind: 'p', text: "Every champion has a Turn Meter that fills in proportion to its Speed (SPD). When a meter reaches 100% that champion takes a turn, then its meter starts again from zero, or from where a skill of its own fills it: the Paladin's Beacon leaves his at 35%. The track at the top of the screen shows every meter: allies above it, enemies below." },
      { kind: 'figure', id: 'turnmeter' },
      { kind: 'p', text: 'A champion with 120 SPD acts six times while one with 100 SPD acts five times. Speed is the most valuable stat in the game: SPD Up and Slow shift who acts first, and skills that drain or grant Turn Meter can steal a whole turn.' },
      { kind: 'tip', text: 'Meters start with a small random head start, so the first turn is never quite the same twice.' },
    ],
  },
  {
    id: 'skills',
    title: 'Skills & Cooldowns',
    icon: 'mi_academy',
    blocks: [
      { kind: 'p', text: 'Each champion has one to three skills. A1, the basic skill, is always ready. A2 and A3 are stronger but go on cooldown when used. Skills have shapes, not just sizes: one enemy, every enemy, or your own team.' },
      { kind: 'figure', id: 'skills' },
      { kind: 'p', text: 'A cooldown counts your champion\'s own turns: a skill with Cooldown 3 used now is ready again on the fourth turn after it. The number shown on a greyed-out skill is how many turns are left.' },
      { kind: 'h', text: 'Targets' },
      { kind: 'list', items: ['Single enemy: pick any enemy (Taunt can force your choice).', 'All enemies: hits every enemy, usually for less damage each.', 'All allies: buffs, heals or shields your whole team.', 'One ally: pick the ally to help. A skill that also helps its user, like the Walking Bush\'s Thicket or the Bellringer\'s Warning Toll, picks among the others.', 'A fallen ally: the Necromancer\'s Raise Dead calls one fallen ally back, chosen at random. It is ready only while an ally has fallen.'] },
      { kind: 'tip', text: 'Keys 1, 2 and 3 pick a skill. Pick a group skill twice, or press Enter, to use it.' },
    ],
    demo: { skill: 'wide_sweep', label: 'See Wide Sweep' },
  },
  {
    id: 'damage',
    title: 'Damage & Critical Hits',
    icon: 'g_auto',
    blocks: [
      { kind: 'p', text: 'Every damaging hit is built from the attacker\'s Attack (ATK) times the skill\'s multiplier, reduced by the target\'s Defense (DEF).' },
      { kind: 'figure', id: 'damage' },
      { kind: 'p', text: 'Defense divides damage: twice the DEF, half the damage. A champion with 80 DEF takes half of what one with 40 DEF takes, and no amount makes anyone immune. DEF Up and DEF Down change it by 16% and 12%.' },
      { kind: 'p', text: 'Critical hits roll on every hit with the attacker\'s critical rate (C.RATE) and add its critical damage (C.DMG). Every champion starts at 100% C.DMG, double damage on a crit, and the Weaver Matrix raises it. Multi-hit skills roll each hit separately, so they crit more often and spread damage over more chances to apply effects.' },
      { kind: 'p', text: 'Shields absorb damage before HP. Poison and Burn ignore shields.' },
    ],
  },
  {
    id: 'affinity',
    title: 'Affinities',
    icon: 'gem_ember',
    blocks: [
      { kind: 'p', text: 'Every champion belongs to one of three affinities, shown by the gem on its portrait. They form a cycle.' },
      { kind: 'figure', id: 'affinity' },
      { kind: 'list', items: ['Ember beats Bloom, Bloom beats Tide, Tide beats Ember.', 'Strong hit: +20% damage, shown as STRONG HIT.', 'Weak hit: -20% damage, shown as WEAK HIT.'] },
      { kind: 'tip', text: 'Team select shows how many enemies each champion hits strong (green) or weak (red). Bring the right affinities and a hard stage becomes a fair one.' },
    ],
  },
  {
    id: 'buffs',
    title: 'Buffs',
    icon: 'status_def_up',
    blocks: [
      { kind: 'p', text: 'Buffs are positive effects, shown with a blue rim. They last a number of the holder\'s turns, counting down at the end of each of its turns. A buff a champion gives itself starts counting at its next turn: the ATK Up from Iron Blow comes after the blow and powers Gareth\'s next two turns. Applying a buff the champion already has refreshes it to the longer duration; buffs never stack.' },
      { kind: 'statuses', ids: ['atk_up', 'def_up', 'spd_up', 'shield', 'taunt', 'regen', 'counter'] },
      { kind: 'tip', text: 'A dispel removes every buff from its target before the hit lands.' },
      { kind: 'tip', text: "A buff can also come before the blow: the Automated Soul's Pinning Shot raises his ATK first, so the shot itself already hits harder." },
    ],
    demo: { skill: 'iron_blow', label: 'See Iron Blow' },
  },
  {
    id: 'debuffs',
    title: 'Debuffs',
    icon: 'status_def_down',
    blocks: [
      { kind: 'p', text: 'Debuffs are harmful effects, shown with a red rim. Many skills only have a chance to place them, and the placer\'s Accuracy (ACC) is compared against the target\'s Resistance (RES): while RES is higher, even a certain debuff can be resisted, the more often the wider the gap. When the roll fails the target shows RESIST. Like buffs, they count down at the end of the holder\'s turns and refresh instead of stacking.' },
      { kind: 'statuses', ids: ['atk_down', 'def_down', 'spd_down', 'poison', 'burn', 'heal_block'] },
    ],
    demo: { skill: 'rimebind', label: 'See Rimebind' },
  },
  {
    id: 'control',
    title: 'Crowd Control',
    icon: 'status_stun',
    blocks: [
      { kind: 'p', text: 'Control effects take turns away. They are the strongest debuffs in the game, so they always last a single turn, and only an A3 (the Automated Soul\'s Pinning Shot), or a passive answering a blow, may place one with certainty.' },
      { kind: 'statuses', ids: ['stun', 'freeze'] },
      { kind: 'figure', id: 'duration' },
      { kind: 'p', text: 'A controlled champion still counts down its effects when its turn is skipped, and cannot counterattack. Control on the enemy\'s fastest champion is usually worth more than raw damage.' },
    ],
  },
  {
    id: 'mechanics',
    title: 'Special Mechanics',
    icon: 'status_counter',
    blocks: [
      { kind: 'h', text: 'Counterattack' },
      { kind: 'p', text: 'A champion with Counterattack strikes back with its A1 at whoever hit it with a skill, once per enemy action. Counters ignore Taunt and cannot themselves be countered.' },
      { kind: 'h', text: 'Dispel and Cleanse' },
      { kind: 'p', text: "Dispel strips every buff from an enemy. A cleanse lifts debuffs from allies: the Grove Keeper's Cleansing Rite takes every debuff off the one ally he chooses, Stun and Freeze too." },
      { kind: 'h', text: 'Lifesteal, Execute, Turn Meter' },
      { kind: 'list', items: ['Lifesteal heals the attacker for a share of the damage dealt. Heal Block stops it.', 'Execute deals bonus damage to targets below a HP threshold.', 'Turn Meter effects push enemies back, let a champion act again sooner, speed up the whole team or the ally with the lowest HP.'] },
      { kind: 'h', text: 'Heals' },
      { kind: 'p', text: "A heal restores HP up to the maximum. It is a share of a max HP: the healed champion's own, or the healer's when the skill says so. A blow can heal its user too: the Grove Keeper's Thornburst returns 7% of his max HP to him; and so can a skill that helps an ally: the Bellringer's Warning Toll shields one ally and heals him by 10% of his max HP. Heal Block stops every heal." },
      { kind: 'h', text: 'Undying' },
      { kind: 'p', text: 'A passive: the first time its holder falls, it rises again with part of its HP and every debuff removed. Plan for two kills, and save Heal Block and burst for the second.' },
      { kind: 'h', text: 'Revive' },
      { kind: 'p', text: "A skill can bring a fallen ally back into the fight. The Necromancer's Raise Dead raises one fallen ally, chosen at random, with 30% of its max HP, nothing on it and an empty turn meter; it waits while nobody has fallen. Strike the one who raises the dead first." },
      { kind: 'h', text: 'Overdrive' },
      { kind: 'p', text: 'A passive: the first time its holder\'s HP drops below a threshold, it gains buffs for a few turns. The Bellringer\'s Last Peal gives him DEF Up for 2 turns the first time he drops below 50% HP. Take its holder from above the threshold to low in one burst, or Dispel the buffs the moment they appear.' },
      { kind: 'h', text: 'Rebuke' },
      { kind: 'p', text: 'A passive that answers a blow. The Rime Scholar\'s Cold Rebuke: while she is below 35% HP, an enemy whose critical hit lands on her is Frozen for 1 turn, and the passive then rests for a few turns. The Associate\'s Bitter Motes answer any enemy attack that hits her, with a 35% chance of Poison on the attacker for 1 turn. Statuses can happen in response to being hurt.' },
      { kind: 'h', text: 'Stat passives' },
      { kind: 'p', text: "A passive can raise a stat in every battle, on top of the champion's own stats and its Weaver Matrix. The champion's page shows the stats without it. The Enforcer's Keen Edge adds 10% C.RATE; the Skeleton's Bare Bones adds 20 RES, so debuffs from enemies with lower ACC land on him less often. Some grow during the fight: Big Ears' Hidden in the Undergrowth adds 15% C.RATE for each ally that has fallen, up to 30%." },
      { kind: 'h', text: 'Passives that shield' },
      { kind: 'p', text: "A passive can give allies Shields. The Jungle Herder's Herder's Ward shields the ally with the lowest max HP, himself included, at the end of every second turn of his. Emissary Handlings' Unbroken Flag has a chance to shield an ally an enemy has just struck, after the hit. The Black Rhino's Thick Hide shields only himself, after every enemy attack that hits him. Protect the frail, and strike the shielded last." },
      { kind: 'h', text: 'Passives that soothe' },
      { kind: 'p', text: "A passive can answer an affliction. The Grove Keeper's Keeper's Balm: whenever an enemy places a debuff on an ally, himself included, a 35% chance to give that ally Regen for 1 turn. Heal Block still stops what the Regen heals. Chief Engineer CJ's Master's Eye acts before anything else on his turn: one random debuff comes off every ally, himself included, and if that is a lone Stun on him he keeps his turn. The Forest Gargoyle's Heartwood gives him DEF Up for 1 turn at the start of each of his turns, so it never lapses. Dead Knight Amstron's Unbreached Plate makes him immune to DEF Down: it never lands on him." },
    ],
  },
  {
    id: 'champions',
    title: 'Champions',
    icon: 'mi_champions',
    blocks: [
      { kind: 'p', text: 'Champions differ in rarity, role, affinity and faction, four separate things: none of them decides another. Rarity sets the size of a champion\'s stat budget; role says how that budget is spent.' },
      { kind: 'figure', id: 'rarity' },
      { kind: 'figure', id: 'roles' },
      { kind: 'p', text: 'There are four factions: the Azure Crown, the Sanguine Dominion, the Court of Root and the Ashveil Reign.' },
    ],
  },
  {
    id: 'summoning',
    title: 'Summoning',
    icon: 'mi_summon',
    blocks: [
      { kind: 'p', text: "Champions answer the Wishing Star, in the Sanctum's sky. Every victory in the campaign finds Stardust; 100 Stardust merge into a Soulstar, and each Soulstar summons one champion you do not have yet." },
      { kind: 'list', items: ['Common: 70%.', 'Elite: 25%.', 'Heroic: 5%.'] },
      { kind: 'p', text: 'Once every champion of a rarity is yours, its share goes to the others. Captain Gareth is with you from the start and the first clear of stage 1-1 brings the Rime Scholar; every other champion is summoned.' },
      { kind: 'h', text: 'A wish' },
      { kind: 'p', text: 'Before you summon you may wish for a faction, a role or both. Within its rarity, every champion your wish names is twice as likely, four times when it names both; the odds of each rarity stay as they are. A wish is no promise.' },
      { kind: 'tip', text: 'The Wishing Star shows the chance of your wish, and of every champion still scattered.' },
    ],
  },
  {
    id: 'campaign',
    title: 'Campaign & Stars',
    icon: 'mi_campaign',
    blocks: [
      { kind: 'p', text: 'The campaign is a line of areas you cross from left to right, each with its stages. Each stage you clear opens the next; clearing an area\'s last stage opens the next area.' },
      { kind: 'figure', id: 'stars' },
      { kind: 'list', items: ['3 stars: nobody fell.', '2 stars: one champion fell.', '1 star: you won with losses.'] },
      { kind: 'p', text: 'The first clear of stage 1-1 brings a new champion. Bosses wear a crown and have 60% more HP.' },
      { kind: 'p', text: "Every victory also finds a Thread Spool, and a flawless one a second. Each area holds two Weave Patterns and its stages find only those; an area's later stages find finer grades more often. The spools wait in Weaving, where you weave them into your champions." },
      { kind: 'p', text: 'And every victory finds Stardust for the Wishing Star: 20 in the Fracture Reach and 5 more in each area beyond it, 10 more when nobody falls.' },
    ],
  },
  {
    id: 'controls',
    title: 'Controls',
    icon: 'mi_options',
    blocks: [
      { kind: 'figure', id: 'controls' },
      { kind: 'p', text: 'Everything works with the mouse alone. In menus the arrow keys move between buttons, Enter confirms and Escape goes back.' },
    ],
  },
];

export function chapter(id: string): Chapter {
  const c = CHAPTERS.find((x) => x.id === id);
  if (!c) throw new Error(`unknown academy chapter "${id}"`);
  return c;
}
