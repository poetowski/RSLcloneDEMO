// Test champions: small synthetic definitions, each built to exercise one
// battle rule. They are not game content (that lives in
// src/game/data/champions and changes with Jakub's design), so the rule tests
// keep proving the rules whatever the roster becomes.
import { Affinity, ChampionDef, PassiveDef, SkillDef, Stats } from '../src/game/data/types';

const BASE: Stats = { hp: 1200, atk: 100, def: 60, spd: 100, crit: 0.05, critDmg: 1, acc: 0, res: 0 };

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

/** A2 heals the team by a share of its own max HP, then lends turn meter to the ally lowest on HP. */
export const provisioner = fixture('provisioner', {
  stats: { hp: 1500 },
  skills: [undefined, skill('rations', 2, { target: 'allies', hits: [{ mult: 0 }], healAllies: 0.15, healOf: 'caster', tmLowestAlly: 15 })],
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

/** A3 dispels before the hit and places DEF Down; A2 grants Counterattack to the team. */
export const warden = fixture('warden', {
  skills: [
    undefined,
    skill('vigil', 2, { target: 'allies', hits: [{ mult: 0 }], statuses: [{ status: 'counter', turns: 2, to: 'allies' }] }),
    skill('dispel_strike', 3, { stripBuffs: true, statuses: [{ status: 'def_down', turns: 2, to: 'targets' }] }),
  ],
});

/** A2 aimed at one ally: DEF Up on the chosen ally and on itself for 1 turn. */
export const sheltering = fixture('sheltering', {
  skills: [undefined, skill('shelter', 2, { target: 'ally', approach: 'none', hits: [{ mult: 0 }], statuses: [{ status: 'def_up', turns: 1, to: 'targets' }, { status: 'def_up', turns: 1, to: 'self' }] })],
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

/** A2 hits, then grants itself ATK Up for 2 turns (a self-buff placed on its own turn). */
export const brute = fixture('brute', {
  skills: [undefined, skill('brute_blow', 2, { hits: [{ mult: 1.5 }], statuses: [{ status: 'atk_up', turns: 2, to: 'self' }] })],
});

/** Two skills only; Rebuke: below 35% HP a critical hit on it freezes the attacker for 1 turn, then it rests 3 turns. */
export const rebuker = (() => {
  const c = fixture('rebuker', { passive: { id: 'rebuke', name: 'Rebuke', desc: '', kind: 'rebuke', value: 0.35, statuses: [{ status: 'freeze', turns: 1 }], cooldown: 3 } });
  return { ...c, skills: [c.skills[0], c.skills[1]] as ChampionDef['skills'] };
})();

/** One skill only: an A1 that heals the team by a share of its own max HP and strikes nobody. */
export const medic = (() => {
  const c = fixture('medic', { stats: { hp: 1400 }, skills: [skill('tonic', 1, { target: 'allies', anim: 'skill', approach: 'none', hits: [{ mult: 0 }], healAllies: 0.1, healOf: 'caster' })] });
  return { ...c, skills: [c.skills[0]] as ChampionDef['skills'] };
})();

/** Tend: at the end of its turn a Shield of 10% of its max HP for 1 turn on the ally with the lowest max HP, then a turn of rest. */
export const tender = fixture('tender', {
  stats: { hp: 1500 },
  passive: { id: 'tend', name: 'Tend', desc: '', kind: 'tend', value: 0.1, statuses: [{ status: 'shield', turns: 1 }], cooldown: 1 },
});

/** Ward: an ally an enemy skill damaged gets a Shield of 15% of its max HP for 1 turn after the hit, with `chance`. */
export const bannerman = (chance: number) =>
  fixture(`bannerman_${chance}`, { stats: { hp: 1400 }, passive: { id: 'ward', name: 'Ward', desc: '', kind: 'ward', value: 0.15, chance, statuses: [{ status: 'shield', turns: 1 }] } });

/** A ward of its holder alone: a Shield of 10% of its max HP for 1 turn after every enemy blow on it. */
export const hide = fixture('hide', { stats: { hp: 1500 }, passive: { id: 'hide', name: 'Hide', desc: '', kind: 'ward', self: true, value: 0.1, statuses: [{ status: 'shield', turns: 1 }] } });

/** Retaliate: an enemy skill that damaged it gets Poison for 1 turn on its attacker after the hit, with `chance`. */
export const stinger = (chance: number) =>
  fixture(`stinger_${chance}`, { passive: { id: 'sting', name: 'Sting', desc: '', kind: 'retaliate', value: 0, chance, statuses: [{ status: 'poison', turns: 1 }] } });

/** Remedy: an ally an enemy places a debuff on gets Regen for 1 turn, with `chance`. */
export const balm = (chance: number) =>
  fixture(`balm_${chance}`, { passive: { id: 'balm', name: 'Balm', desc: '', kind: 'remedy', value: 0, chance, statuses: [{ status: 'regen', turns: 1 }] } });

/** A1 heals itself by 7% of its max HP after the hit; A2 removes every debuff from one ally, and the AI keeps it for when there is one. */
export const druid = fixture('druid', {
  skills: [skill('briar', 1, { healSelf: 0.07 }), skill('rite', 2, { target: 'ally', approach: 'none', hits: [{ mult: 0 }], cleanseAll: true, ai: { priority: 2, when: 'allyDebuffed' } })],
});

/** Fallen: +20% C.RATE for each fallen ally, up to +30%; no C.RATE of its own. */
export const mourner = fixture('mourner', { stats: { crit: 0 }, passive: { id: 'fallen', name: 'Fallen', desc: '', kind: 'fallen', stat: 'crit', value: 0.2, max: 0.3 } });

/** A stat passive: +95% C.RATE in battle, so with its own 5% every hit is critical. */
export const keen = fixture('keen', { passive: { id: 'keen', name: 'Keen', desc: '', kind: 'stat', stat: 'crit', value: 0.95 } });

/** The same striker in each affinity (strong and weak hits). */
export const inAffinity = (affinity: Affinity) => fixture(`striker_${affinity}`, { affinity });
