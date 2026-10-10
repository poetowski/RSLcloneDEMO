// Test champions: small synthetic definitions, each built to exercise one
// battle rule. They are not game content (that lives in
// src/game/data/champions and changes with Jakub's design), so the rule tests
// keep proving the rules whatever the roster becomes.
import { Affinity, ChampionDef, PassiveDef, SkillDef, Stats } from '../src/game/data/types';

const BASE: Stats = { hp: 1200, atk: 100, def: 60, spd: 100, crit: 0.05 };

/** A skill with test defaults: one full hit on one enemy, the slot's usual cooldown. */
export function skill(id: string, slot: 1 | 2 | 3, o: Partial<SkillDef> = {}): SkillDef {
  return {
    id,
    name: id,
    tag: '',
    desc: '',
    slot,
    cooldown: slot === 1 ? 0 : slot === 2 ? 3 : 4,
    target: 'enemy',
    anim: 'attack1',
    approach: 'melee',
    hits: [{ mult: 1 }],
    ...o,
  };
}

/** A champion with test defaults; A1 is a plain single hit unless given. */
export function fixture(id: string, o: { affinity?: Affinity; stats?: Partial<Stats>; skills?: [SkillDef?, SkillDef?, SkillDef?]; passive?: PassiveDef } = {}): ChampionDef {
  const [a1, a2, a3] = o.skills ?? [];
  return {
    id,
    name: id,
    title: '',
    role: 'Damage',
    rarity: 'elite',
    affinity: o.affinity ?? 'ember',
    faction: 'azure_crown',
    color: '#ffffff',
    stats: { ...BASE, ...o.stats },
    skills: [a1 ?? skill(`${id}_a1`, 1), a2 ?? skill(`${id}_a2`, 2, { hits: [{ mult: 1.3 }] }), a3 ?? skill(`${id}_a3`, 3, { hits: [{ mult: 1.8 }] })],
    passive: o.passive,
    lore: '',
  };
}

/** Plain single-hit striker (A1 1.0). */
export const striker = fixture('striker');

/** Two-hit A1 and a two-hit AoE A2 (shields, kills, counters). */
export const twin = fixture('twin', {
  skills: [skill('twin_chop', 1, { hits: [{ mult: 0.6 }, { mult: 0.6 }] }), skill('twin_sweep', 2, { target: 'enemies', hits: [{ mult: 0.5 }, { mult: 0.5 }] })],
});

/** A2 on a three-turn cooldown; A3 makes itself the target (Taunt). */
export const guard = fixture('guard', {
  stats: { hp: 1500, def: 78 },
  skills: [undefined, skill('guard_bash', 2), skill('guard_taunt', 3, { target: 'self', hits: [{ mult: 0 }], statuses: [{ status: 'taunt', turns: 2, to: 'self' }] })],
});

/** A single-target A1 and an AoE A2 (taunt targeting). */
export const cleaver = fixture('cleaver', {
  skills: [skill('cleave', 1), skill('sweep', 2, { target: 'enemies', hits: [{ mult: 0.6 }] })],
});

/** A3 freezes for certain. */
export const freezer = fixture('freezer', {
  skills: [undefined, undefined, skill('freeze_bolt', 3, { statuses: [{ status: 'freeze', turns: 1, to: 'targets' }] })],
});

/** Heals and cleanses the team (A2); A3 places Heal Block and Burn on all enemies. */
export const mender = fixture('mender', {
  skills: [
    undefined,
    skill('mend', 2, { target: 'allies', hits: [{ mult: 0 }], healAllies: 0.2, cleanse: true }),
    skill('scorch', 3, { target: 'enemies', hits: [{ mult: 0.8 }], statuses: [{ status: 'heal_block', turns: 2, to: 'targets' }, { status: 'burn', turns: 2, chance: 0.6, to: 'targets' }] }),
  ],
});

/** A3 dispels before the hit and places Weaken; A2 grants Counterattack to the team. */
export const warden = fixture('warden', {
  skills: [
    undefined,
    skill('vigil', 2, { target: 'allies', hits: [{ mult: 0 }], statuses: [{ status: 'counter', turns: 2, to: 'allies' }] }),
    skill('dispel_strike', 3, { stripBuffs: true, statuses: [{ status: 'weaken', turns: 2, to: 'targets' }] }),
  ],
});

/** Two-hit A1 rolling Poison on every hit; A3 ends the turn with 25% turn meter. */
export const stalker = fixture('stalker', {
  stats: { spd: 118 },
  skills: [skill('fangs', 1, { hits: [{ mult: 0.5 }, { mult: 0.5 }], statuses: [{ status: 'poison', turns: 2, chance: 0.5, to: 'targets', perHit: true }] }), undefined, skill('mirage', 3, { selfTm: 25 })],
});

/** A2 fills every other ally's turn meter by 20% and grants SPD Up. */
export const drummer = fixture('drummer', {
  skills: [undefined, skill('march', 2, { target: 'allies', hits: [{ mult: 0 }], tmAllies: 20, statuses: [{ status: 'spd_up', turns: 2, to: 'allies' }] })],
});

/** Undying: rises once at 25% HP. */
export const undying = fixture('undying', { passive: { id: 'undying', name: 'Undying', desc: '', kind: 'undying', value: 0.25 } });

/** Overdrive: below half HP, once, ATK Up and DEF Up for 2 turns. */
export const overdrive = fixture('overdrive', {
  stats: { hp: 1650 },
  passive: { id: 'core', name: 'Core', desc: '', kind: 'overdrive', value: 0.5, statuses: [{ status: 'atk_up', turns: 2 }, { status: 'def_up', turns: 2 }] },
});

/** The same striker in each affinity (strong and weak hits). */
export const inAffinity = (affinity: Affinity) => fixture(`striker_${affinity}`, { affinity });
