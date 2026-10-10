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
      { kind: 'p', text: 'Nobody acts at once: champions take turns in the order set by the Turn Meter. On your champion\'s turn you choose one of its three skills and a target; enemies (and your team on Auto) are played by the AI.' },
      { kind: 'h', text: 'A turn, step by step' },
      { kind: 'list', items: ['Turn Meters fill until someone reaches 100%.', 'Start of turn: Poison, Burn and Regen tick. A Stunned or Frozen champion loses the turn.', 'The champion uses one skill.', 'End of turn: its buffs and debuffs count down one turn, its cooldowns tick and its Turn Meter resets.'] },
      { kind: 'tip', text: 'Hover any champion, skill or status icon during your turn to read exactly what it does.' },
    ],
  },
  {
    id: 'turnmeter',
    title: 'Turn Meter & Speed',
    icon: 'g_speed',
    blocks: [
      { kind: 'p', text: 'Every champion has a Turn Meter that fills in proportion to its Speed (SPD). When a meter reaches 100% that champion takes a turn, then its meter starts again from zero. The track at the top of the screen shows every meter: allies above it, enemies below.' },
      { kind: 'figure', id: 'turnmeter' },
      { kind: 'p', text: 'A champion with 120 SPD acts six times while one with 100 SPD acts five times. Speed is the most valuable stat in the game: SPD Up and SPD Down shift who acts first, and skills that drain or grant Turn Meter can steal a whole turn.' },
      { kind: 'tip', text: 'Meters start with a small random head start, so the first turn is never quite the same twice.' },
    ],
  },
  {
    id: 'skills',
    title: 'Skills & Cooldowns',
    icon: 'mi_academy',
    blocks: [
      { kind: 'p', text: 'Each champion has three skills. A1, the basic skill, is always ready. A2 and A3 are stronger but go on cooldown when used.' },
      { kind: 'figure', id: 'skills' },
      { kind: 'p', text: 'A cooldown counts your champion\'s own turns: a skill with Cooldown 3 used now is ready again on the fourth turn after it. The number shown on a greyed-out skill is how many turns are left.' },
      { kind: 'h', text: 'Targets' },
      { kind: 'list', items: ['Single enemy: pick any enemy (Taunt can force your choice).', 'All enemies: hits every enemy, usually for less damage each.', 'All allies: buffs, heals or shields your whole team.'] },
      { kind: 'tip', text: 'Keys 1, 2 and 3 pick a skill. Pick a group skill twice, or press Enter, to use it.' },
    ],
  },
  {
    id: 'damage',
    title: 'Damage & Critical Hits',
    icon: 'g_auto',
    blocks: [
      { kind: 'p', text: 'Every damaging hit is built from the attacker\'s Attack (ATK) times the skill\'s multiplier, reduced by the target\'s Defense (DEF).' },
      { kind: 'figure', id: 'damage' },
      { kind: 'p', text: 'Defense divides damage: twice the DEF, half the damage. A champion with 80 DEF takes half of what one with 40 DEF takes, and no amount makes anyone immune. DEF Up and DEF Down change it by 16% and 12%.' },
      { kind: 'p', text: 'Critical hits roll on every hit with the attacker\'s Crit Rate and deal double damage. Multi-hit skills roll each hit separately, so they crit more often and spread damage over more chances to apply effects.' },
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
      { kind: 'p', text: 'Buffs are positive effects, shown with a blue rim. They last a number of the holder\'s turns, counting down at the end of each of its turns. Applying a buff the champion already has refreshes it to the longer duration; buffs never stack.' },
      { kind: 'statuses', ids: ['atk_up', 'def_up', 'spd_up', 'shield', 'taunt', 'regen', 'counter'] },
      { kind: 'tip', text: 'A dispel removes every buff from its target before the hit lands.' },
    ],
    demo: { skill: 'mending', label: 'See Mending' },
  },
  {
    id: 'debuffs',
    title: 'Debuffs',
    icon: 'status_weaken',
    blocks: [
      { kind: 'p', text: 'Debuffs are harmful effects, shown with a red rim. Many skills only have a chance to place them; when the roll fails the target shows RESIST. Like buffs, they count down at the end of the holder\'s turns and refresh instead of stacking.' },
      { kind: 'statuses', ids: ['atk_down', 'def_down', 'spd_down', 'weaken', 'poison', 'burn', 'heal_block'] },
      { kind: 'tip', text: 'Weaken and DEF Down stack with each other: put both on a boss before your strongest skill.' },
    ],
    demo: { skill: 'smite', label: 'See Smite' },
  },
  {
    id: 'control',
    title: 'Crowd Control',
    icon: 'status_stun',
    blocks: [
      { kind: 'p', text: 'Control effects take turns away. They are the strongest debuffs in the game, so they always last a single turn, and only an A3 may place one with certainty.' },
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
      { kind: 'p', text: 'Dispel strips every buff from an enemy. Cleanse removes one debuff from each ally.' },
      { kind: 'h', text: 'Lifesteal, Execute, Turn Meter' },
      { kind: 'list', items: ['Lifesteal heals the attacker for a share of the damage dealt. Heal Block stops it.', 'Execute deals bonus damage to targets below a HP threshold (Leaping Blow: +50% below half HP).', 'Turn Meter effects push enemies back, let a champion act again sooner or speed up the whole team.'] },
      { kind: 'h', text: 'Undying' },
      { kind: 'p', text: 'A passive: the first time its holder falls, it rises again with part of its HP and every debuff removed. Plan for two kills, and save Heal Block and burst for the second.' },
      { kind: 'h', text: 'Overdrive' },
      { kind: 'p', text: 'A passive: the first time its holder\'s HP drops below a threshold, it overloads and gains buffs for a few turns. Take it from above the threshold to low in one burst, or Dispel the buffs the moment they appear.' },
    ],
    demo: { skill: 'leaping_blow', label: 'See Leaping Blow' },
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
    id: 'campaign',
    title: 'Campaign & Stars',
    icon: 'mi_campaign',
    blocks: [
      { kind: 'p', text: 'The campaign is a line of areas you cross from left to right, each with its stages. Each stage you clear opens the next; clearing an area\'s last stage opens the next area.' },
      { kind: 'figure', id: 'stars' },
      { kind: 'list', items: ['3 stars: nobody fell.', '2 stars: one champion fell.', '1 star: you won with losses.'] },
      { kind: 'p', text: 'Some stages bring a new champion on their first clear. Bosses wear a crown and have 60% more HP.' },
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
