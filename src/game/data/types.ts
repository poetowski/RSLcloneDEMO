// Content model: champions, skills, statuses, meta-categories, zones, the
// campaign and the Weaver Matrix catalog. Everything the game knows about its
// content is described by these types; see docs/GAME_STRUCTURE.md and
// docs/MECHANICS_GUIDE.md.

export type TeamId = 'player' | 'enemy';

export type StatusId =
  | 'atk_up'
  | 'def_up'
  | 'spd_up'
  | 'shield'
  | 'taunt'
  | 'regen'
  | 'counter'
  | 'stun'
  | 'freeze'
  | 'poison'
  | 'burn'
  | 'def_down'
  | 'spd_down'
  | 'atk_down'
  | 'heal_block';

/** `fallen`: one fallen ally, chosen at random (the Necromancer's Raise Dead); usable only while one has fallen. */
export type TargetKind = 'enemy' | 'enemies' | 'ally' | 'allies' | 'self' | 'fallen';

/**
 * How the actor travels before the attack animation:
 *  melee  - runs up to the target, attacks, runs back
 *  ranged - advances part of the way, attacks from range, returns
 *  center - runs to the middle of the enemy line (AoE melee)
 *  leap   - jumps to the target in an arc, lands with the hit, runs back
 *  blink  - vanishes in a puff and reappears at the target, then blinks back
 *  none   - performs in place (casts, buffs)
 */
export type Approach = 'melee' | 'ranged' | 'center' | 'leap' | 'blink' | 'none';

// The four category enums are Jakub's (docs/DESIGN_DECISIONS.md section 2):
// independent axes, fixed per champion when it is authored.
export type Rarity = 'common' | 'elite' | 'heroic' | 'mythic';
export type Affinity = 'ember' | 'bloom' | 'tide';
export type Role = 'Tank' | 'Damage' | 'Support';
export type FactionId = 'azure_crown' | 'sanguine_dominion' | 'court_of_root' | 'ashveil_reign';

export interface StatusApp {
  status: StatusId;
  turns: number;
  /** 0..1, default 1 */
  chance?: number;
  /** `lowestMaxHp`: the living ally with the lowest max HP, the actor included (Chief Engineer CJ's Earthen Surge: his Shield) */
  to: 'targets' | 'self' | 'allies' | 'lowestMaxHp';
  /** shield amount as a fraction of the caster's max HP */
  value?: number;
  /** roll on every damaging hit instead of once on the last hit (targets only) */
  perHit?: boolean;
  /** placed before the first hit instead of on the last, so the skill's own hits already carry it (the Automated Soul's Pinning Shot: ATK Up, then the shot) */
  before?: boolean;
}

export interface HitDef {
  /** damage multiplier of ATK; 0 for non-damaging hits */
  mult: number;
  /** effect played on every target at this hit */
  fx?: string;
}

export interface SkillDef {
  id: string;
  name: string;
  /** Short line for the tooltip header ("Single enemy", "All enemies"). */
  tag: string;
  desc: string;
  slot: 1 | 2 | 3;
  cooldown: number;
  target: TargetKind;
  anim: string;
  approach: Approach;
  /** One entry per hit frame of the animation. */
  hits: HitDef[];
  statuses?: StatusApp[];
  /** heal all allies by this fraction of each ally's max HP (on the last hit) */
  healAllies?: number;
  /** whose max HP `healAllies` is a share of: each ally's own (the default) or the caster's */
  healOf?: 'ally' | 'caster';
  /** removes one debuff from each ally */
  cleanse?: boolean;
  /** removes every debuff from the targets, on the last hit (the Grove Keeper's Cleansing Rite on the ally he chooses) */
  cleanseAll?: boolean;
  /** heals the actor by this fraction of its own max HP, on the last hit (the Grove Keeper's Thornburst) */
  healSelf?: number;
  /**
   * raises the fallen ally the skill targets (`target: 'fallen'`, one at random) with this
   * fraction of its max HP, on the last hit: no statuses, an empty turn meter (the
   * Necromancer's Raise Dead)
   */
  revive?: number;
  /** removes every buff from the targets before the first hit */
  stripBuffs?: boolean;
  /** heals the actor by this fraction of damage dealt */
  lifesteal?: number;
  /** turn meter change for targets (negative = reduce), on the last hit */
  tmTargets?: number;
  /** turn meter change for the actor's allies (not the actor), on the last hit */
  tmAllies?: number;
  /** turn meter change for the ally (not the actor) with the lowest HP share once the skill's heals have landed, on the last hit */
  tmLowestAlly?: number;
  /** the actor ends the turn with this much turn meter instead of 0 */
  selfTm?: number;
  /** bonus damage when the target is below a HP fraction */
  execute?: { below: number; mult: number };
  /** presentation */
  projectile?: string;
  /**
   * presentation: on the `shoot` event `projectile` is loosed into the sky, and this one
   * falls on every target, a few apiece, before the hit shows (the Automated Soul's
   * Sundering Volley)
   */
  volley?: string;
  /** ground circle under the actor while the skill plays */
  castFx?: string;
  /** effect at the actor's head on the animation's `cast` event (a howl, a flare) */
  actorFx?: string;
  /** effect on each ally a buff of this skill reaches while the skill strikes enemies (Onrush's gust) */
  allyFx?: string;
  shake?: number;
  /** AI preference: higher = earlier; 'allyHurt' only when an ally needs help, 'allyDebuffed' only when an ally carries a debuff */
  ai?: { priority: number; when?: 'allyHurt' | 'allyDebuffed' };
}

export interface PassiveDef {
  id: string;
  name: string;
  desc: string;
  /**
   * undying:   the first lethal hit leaves the champion at `value` x max HP instead
   * overdrive: the first time HP drops below `value` x max HP, `statuses` are granted
   * rebuke:    while below `value` x max HP, an enemy whose critical hit lands on the
   *            champion receives `statuses`; then the passive rests for `cooldown` turns
   * stat:      always on in battle: adds `value` to the champion's `stat` (0.1 C.RATE =
   *            +10%). Extra, outside the stat budget, and never shown with the
   *            champion's stats outside battle (Jakub, 2026-10-12)
   * tend:      at the end of each of the champion's turns, while it is ready, the ally with
   *            the lowest max HP (the champion included) receives `statuses`, a Shield worth
   *            `value` x the champion's max HP; then the passive rests for `cooldown` of the
   *            champion's turns (the Jungle Herder's Herder's Ward, Jakub, 2026-10-17)
   * ward:      when an enemy skill damages an ally (the champion included) who is still
   *            standing, `chance` (always when absent) to give that ally `statuses` after the
   *            hit, a Shield worth `value` x the champion's max HP (Emissary Handlings' Unbroken
   *            Flag, 2026-10-17); with `self`, only the champion itself (the Black Rhino's Thick
   *            Hide, 2026-10-17)
   * fallen:    in battle, adds `value` to the champion's `stat` for each fallen ally, up to
   *            `max`; extra, outside the stat budget, like a stat passive (Big Ears' Hidden in
   *            the Undergrowth, 2026-10-17)
   * retaliate: when an enemy skill damages the champion and leaves it standing, `chance` to
   *            place `statuses` on the attacker after the hit (the Associate's Bitter Motes:
   *            Poison for 1 turn, 2026-10-17)
   * remedy:    when an enemy places a debuff on an ally (the champion included), `chance` to
   *            give that ally `statuses` (the Grove Keeper's Keeper's Balm: Regen for 1 turn,
   *            2026-10-17)
   * defy:      when an enemy skill lands a critical hit on the champion and leaves it
   *            standing, after the skill's last hit, once per skill: the champion takes
   *            `statuses` and heals by `value` x its max HP (Irving Wellbington's Old Grudge:
   *            Taunt for 1 turn and 20%, 2026-10-19)
   * purge:     at the start of each of the champion's turns, a skipped one too, every ally (the
   *            champion included) loses one debuff at random (Chief Engineer CJ's Master's Eye,
   *            2026-10-31)
   */
  kind: 'undying' | 'overdrive' | 'rebuke' | 'stat' | 'tend' | 'ward' | 'fallen' | 'retaliate' | 'remedy' | 'defy' | 'purge';
  value: number;
  statuses?: { status: StatusId; turns: number }[];
  /** rebuke and tend: the champion's own turns the passive rests after it acts */
  cooldown?: number;
  /** stat and fallen: the stat it raises */
  stat?: StatId;
  /** ward, retaliate and remedy: the chance of each answer, 0..1 */
  chance?: number;
  /** fallen: the most it adds */
  max?: number;
  /** ward: it guards only the champion itself, not its allies */
  self?: boolean;
  /** presentation: the effect played on the champion the passive reaches (the ally it shields, the enemy it answers) */
  fx?: string;
  /** presentation: the effect played on the champion itself as the passive acts (the Jungle Herder's bell) */
  holderFx?: string;
}

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  /** critical rate: the chance of each hit to be critical */
  crit: number;
  /** critical damage: what a critical hit adds (1 = +100%: double damage) */
  critDmg: number;
  /** accuracy and resistance (Jakub, 2026-10-11): a debuff placed on an enemy compares the placer's ACC against its RES (`landShare`) */
  acc: number;
  res: number;
}

export interface ChampionDef {
  id: string;
  name: string;
  role: Role;
  rarity: Rarity;
  affinity: Affinity;
  faction: FactionId;
  /** signature color for UI accents (also the hero's art signature hue) */
  color: string;
  /** where projectiles leave the sprite: [forward, up] px from the feet (ranged champions) */
  muzzle?: [number, number];
  stats: Stats;
  /** A1, A2 and, for most champions, A3 (the Rime Scholar has no A3) */
  skills: [SkillDef] | [SkillDef, SkillDef] | [SkillDef, SkillDef, SkillDef];
  passive?: PassiveDef;
  lore: string;
}

export interface StatusDef {
  id: StatusId;
  name: string;
  buff: boolean;
  desc: string;
  /** floating text color */
  color: string;
}

export interface RarityDef {
  id: Rarity;
  name: string;
  color: string;
  /** dark tone for card frames */
  deep: string;
  /** rank used for sorting, 1 = common */
  rank: number;
}

export interface AffinityDef {
  id: Affinity;
  name: string;
  color: string;
  /** the affinity this one deals strong hits against */
  beats: Affinity;
  desc: string;
}

export interface FactionDef {
  id: FactionId;
  name: string;
  color: string;
  desc: string;
  /** the faction's standard as designed, or undefined while it is not */
  standard?: string;
}

export interface RoleDef {
  id: Role;
  desc: string;
}

/** A combat background: art lives in public/assets/zones/<id>/, behaviour here. */
export interface ZoneDef {
  id: string;
  name: string;
  /**
   * snow, blowing sand, star-dust with shooting stars, autumn leaves tumbling in
   * the wind, pollen drifting in the sunlight, spores: glowing dust-motes of
   * bioluminescent flora drifting in soft, pearlescent halos (the Moonlit Basin),
   * seeds: feather-grass seeds sailing on the steppe wind (Earth Scars), or
   * flurries: snow blown in from the right ahead of a storm, thinning out as it
   * goes (the Snowy Mesa)
   */
  ambient: 'snow' | 'sand' | 'motes' | 'leaves' | 'pollen' | 'spores' | 'seeds' | 'flurries';
  /** color of brazier light pools */
  glow: [number, number, number];
  /** unit shadows: offset away from the key light and horizontal stretch */
  shadow: { dx: number; stretch: number };
  /** full-screen mood tint drawn over the world (not the HUD) */
  tint?: { color: string; alpha: number; op: GlobalCompositeOperation };
  /** vultures or other birds circling in the sky */
  birds?: number;
  /** where the birds circle, in screen pixels, the birds shared out among the spots in turn (high on the right when not given) */
  birdsAt?: [number, number][];
  /** heat shimmer on the horizon rows of the backdrop */
  haze?: boolean;
  /** butterflies fluttering about these spots, in screen pixels, one butterfly each */
  butterflies?: [number, number][];
  /** brazier embers: first color, then the colors they fade through (default: firelight) */
  embers?: string[];
  /**
   * now and then the sky lights up for a moment in a strange colour, spreading
   * from `at` (screen pixels): every `every[0]`-`every[1]` ms, for `ms` ms, its
   * colour turning from one of `colors` to another (Jakub, 2026-10-12: "very
   * unfrequently ... light up the sky in weird colors for a moment")
   */
  flash?: { at: [number, number]; every: [number, number]; ms: number; colors: string[] };
  /** now and then a shooting star streaks across the sky, every `[min, max]` ms (the star-dust ambience has its own, more often) */
  shootingStars?: [number, number];
}

export interface EnemySlot {
  champion: string;
  /** bosses get extra HP and a crown */
  boss?: boolean;
}

/** One battle of the campaign. Stages have no names (Jakub, 2026-10-10): the id is how they are called. */
export interface StageDef {
  /** "1-3" style id, unique across the campaign */
  id: string;
  blurb: string;
  /** formation order: front, back-top, back-bottom */
  enemies: EnemySlot[];
  /** enemy stat multiplier (HP and ATK) */
  power: number;
  /** champion recruited on the first clear */
  recruit?: string;
}

/** A campaign node: an area on the world map whose stages open in its stage list. */
export interface LocationDef {
  id: string;
  /** chapter numeral shown in the UI */
  chapter: string;
  name: string;
  /** combat background of its stages; none while its stages are not designed */
  zone?: string;
  blurb: string;
  /** stage that must be cleared before this location opens */
  requires?: string;
  /** the campaign node on the world map (`WORLD_MAP` pixels); the landmark is drawn above it */
  map: { x: number; y: number };
  /** empty while the area's stages are not designed */
  stages: StageDef[];
  /**
   * the two Weave Patterns whose spools every stage of the area drops (Jakub,
   * 2026-10-24: exactly two per area); which two each area holds is a stand-in
   */
  patterns?: readonly [PatternId, PatternId];
}

// --- Weaver Matrix -----------------------------------------------------------
// The catalog side of the Reliquary (src/game/reliquary): the stats a spool
// can carry, the six stat nodes of a matrix and the Weave Patterns.

/** A champion's combat stat. */
export type StatId = keyof Stats;

/**
 * A stat a Thread Spool can carry: ATK, HP and DEF flat (`atk`, `hp`, `def`)
 * or in % of the champion's base (`atkPct`, `hpPct`, `defPct`, the "base
 * stats"), SPD flat, critical rate and critical damage in points, ACC and RES flat.
 */
export type SpoolStat = 'atk' | 'hp' | 'def' | 'atkPct' | 'hpPct' | 'defPct' | 'spd' | 'crit' | 'critDmg' | 'acc' | 'res';

/** Catalog id of a Weave Pattern ('pattern_pulse'). */
export type PatternId = string;

/** What a matrix slot accepts as a spool's main stat: one stat, or one from a list. */
export type StatNode =
  | { readonly kind: 'fixed'; readonly stat: SpoolStat }
  | { readonly kind: 'variable'; readonly stats: readonly SpoolStat[] };

/** The six stat nodes of every Weaver Matrix: slot 0 at the top, then clockwise. */
export type MatrixLayout = readonly [StatNode, StatNode, StatNode, StatNode, StatNode, StatNode];

/**
 * A Weave Pattern: woven by `pieces` spools of this pattern, in any slots,
 * once for every `pieces` of them. Each time it is woven it adds `bonus`:
 * SPD, ATK, DEF and HP by a fraction of the champion's base (0.12 = +12%),
 * critical rate and critical damage by points (0.12 = +12%), ACC and RES flat.
 */
export interface WeavePatternDef {
  id: PatternId;
  name: string;
  pieces: 2 | 4;
  bonus: { stat: StatId; value: number };
}
