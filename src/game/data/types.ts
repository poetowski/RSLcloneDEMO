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
  | 'weaken'
  | 'heal_block';

export type TargetKind = 'enemy' | 'enemies' | 'ally' | 'allies' | 'self';

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
  to: 'targets' | 'self' | 'allies';
  /** shield amount as a fraction of the caster's max HP */
  value?: number;
  /** roll on every damaging hit instead of once on the last hit (targets only) */
  perHit?: boolean;
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
  /** removes one debuff from each ally */
  cleanse?: boolean;
  /** removes every buff from the targets before the first hit */
  stripBuffs?: boolean;
  /** heals the actor by this fraction of damage dealt */
  lifesteal?: number;
  /** turn meter change for targets (negative = reduce), on the last hit */
  tmTargets?: number;
  /** turn meter change for the actor's allies (not the actor), on the last hit */
  tmAllies?: number;
  /** the actor ends the turn with this much turn meter instead of 0 */
  selfTm?: number;
  /** bonus damage when the target is below a HP fraction */
  execute?: { below: number; mult: number };
  /** presentation */
  projectile?: string;
  /** ground circle under the actor while the skill plays */
  castFx?: string;
  /** effect at the actor's head on the animation's `cast` event (a howl, a flare) */
  actorFx?: string;
  shake?: number;
  /** AI preference: higher = earlier; 'allyHurt' only when an ally needs help */
  ai?: { priority: number; when?: 'allyHurt' };
}

export interface PassiveDef {
  id: string;
  name: string;
  desc: string;
  /**
   * undying:   the first lethal hit leaves the champion at `value` x max HP instead
   * overdrive: the first time HP drops below `value` x max HP, `statuses` are granted
   */
  kind: 'undying' | 'overdrive';
  value: number;
  statuses?: { status: StatusId; turns: number }[];
}

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
}

export interface ChampionDef {
  id: string;
  name: string;
  title: string;
  role: Role;
  rarity: Rarity;
  affinity: Affinity;
  faction: FactionId;
  /** signature color for UI accents (also the hero's art signature hue) */
  color: string;
  /** where projectiles leave the sprite: [forward, up] px from the feet (ranged champions) */
  muzzle?: [number, number];
  stats: Stats;
  skills: [SkillDef, SkillDef, SkillDef];
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
  subtitle: string;
  ambient: 'snow' | 'sand' | 'motes';
  /** color of brazier light pools */
  glow: [number, number, number];
  /** unit shadows: offset away from the key light and horizontal stretch */
  shadow: { dx: number; stretch: number };
  /** full-screen mood tint drawn over the world (not the HUD) */
  tint?: { color: string; alpha: number; op: GlobalCompositeOperation };
  /** vultures or other birds circling in the sky */
  birds?: number;
  /** heat shimmer on the horizon rows of the backdrop */
  haze?: boolean;
  /** brazier embers: first color, then the colors they fade through (default: firelight) */
  embers?: string[];
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
}

// --- Weaver Matrix -----------------------------------------------------------
// The catalog side of the Reliquary (src/game/reliquary): the stats a spool
// can carry, the six stat nodes of a matrix and the Weave Patterns.

/** A combat stat a Thread Spool can carry. */
export type StatId = keyof Stats;

/** Catalog id of a Weave Pattern ('tension', 'fray_bite'). */
export type PatternId = string;

/** What a matrix slot accepts as a spool's main stat: one stat, or one from a list. */
export type StatNode =
  | { readonly kind: 'fixed'; readonly stat: StatId }
  | { readonly kind: 'variable'; readonly stats: readonly StatId[] };

/** The six stat nodes of every Weaver Matrix: slot 0 at the top, then clockwise. */
export type MatrixLayout = readonly [StatNode, StatNode, StatNode, StatNode, StatNode, StatNode];

/**
 * A Weave Pattern: woven by `pieces` spools of this pattern, in any slots.
 * What a woven pattern gives is not modelled yet: it waits for the approved
 * Weaver Matrix proposal (docs/DDD.md 4.7).
 */
export interface WeavePatternDef {
  id: PatternId;
  name: string;
  pieces: 2 | 4;
  desc: string;
}
