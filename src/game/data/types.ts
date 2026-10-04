// Data schema for heroes, skills and status effects. See docs/MECHANICS_GUIDE.md.

export type TeamId = 'player' | 'enemy';

export type StatusId =
  | 'atk_up'
  | 'def_up'
  | 'spd_up'
  | 'shield'
  | 'taunt'
  | 'regen'
  | 'stun'
  | 'freeze'
  | 'poison'
  | 'def_down'
  | 'spd_down'
  | 'atk_down';

export type TargetKind = 'enemy' | 'enemies' | 'ally' | 'allies' | 'self';

/**
 * How the actor travels before the attack animation:
 *  melee  - runs up to the target, attacks, runs back
 *  ranged - advances part of the way, attacks from range, returns
 *  center - runs to the middle of the enemy line (AoE melee)
 *  leap   - jumps to the target in an arc, lands with the hit, hops back
 *  none   - performs in place (casts, buffs)
 */
export type Approach = 'melee' | 'ranged' | 'center' | 'leap' | 'none';

export interface StatusApp {
  status: StatusId;
  turns: number;
  /** 0..1, default 1 */
  chance?: number;
  to: 'targets' | 'self' | 'allies';
  /** shield amount as a fraction of the caster's max HP */
  value?: number;
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
  /** Short line for the tooltip header ("Single target", "All enemies"). */
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
  /** heals the actor by this fraction of damage dealt */
  lifesteal?: number;
  /** turn meter change for targets (negative = reduce), on the last hit */
  tmTargets?: number;
  /** bonus damage when the target is below a HP fraction */
  execute?: { below: number; mult: number };
  /** presentation */
  projectile?: string;
  castFx?: string;
  shake?: number;
  /** AI preference: higher = earlier; 'allyHurt' only when an ally needs help */
  ai?: { priority: number; when?: 'allyHurt' };
}

export interface HeroDef {
  id: string;
  name: string;
  title: string;
  role: 'Tank' | 'Bruiser' | 'Damage' | 'Support' | 'Control';
  faction: string;
  /** signature color for UI accents */
  color: string;
  stats: { hp: number; atk: number; def: number; spd: number; crit: number };
  skills: [SkillDef, SkillDef, SkillDef];
}

export interface StatusDef {
  id: StatusId;
  name: string;
  buff: boolean;
  desc: string;
  /** floating text color */
  color: string;
}
