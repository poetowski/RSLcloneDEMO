// Enemy (and auto-battle) decision making. Deliberately simple and readable:
// strongest ready skill first, support skills only when allies need them,
// focus fire on weakened targets, respect taunt, avoid wasting control.
import { SkillDef } from '../data/types';
import { STATUSES } from '../data/statuses';
import { Battle, Unit } from './battle';

export interface Decision {
  skill: SkillDef;
  target?: string;
}

export function decide(b: Battle, actor: Unit): Decision {
  const skills = [...actor.hero.skills].filter((s) => b.ready(actor, s)).sort((a, c) => (c.ai?.priority ?? 0) - (a.ai?.priority ?? 0));
  for (const s of skills) {
    if (s.ai?.when === 'allyHurt') {
      const allies = b.allies(actor);
      const hurt = allies.some((a) => a.hp / a.maxHp < 0.7) || allies.some((a) => a.statuses.some((x) => !STATUSES[x.id].buff));
      if (!hurt) continue;
    }
    return { skill: s, target: pickTarget(b, actor, s) };
  }
  const basic = actor.hero.skills[0];
  return { skill: basic, target: pickTarget(b, actor, basic) };
}

function pickTarget(b: Battle, actor: Unit, s: SkillDef): string | undefined {
  if (s.target !== 'enemy' && s.target !== 'ally') return undefined;
  const valid = b.validTargets(actor, s);
  if (!valid.length) return undefined;
  const controls = (s.statuses ?? []).some((x) => x.status === 'stun' || x.status === 'freeze');
  let pool = valid;
  if (controls) {
    // do not stun someone who is already disabled; prefer the hardest hitter
    const free = valid.filter((v) => !b.has(v, 'stun') && !b.has(v, 'freeze'));
    if (free.length) pool = free;
    return [...pool].sort((x, y) => b.attack(y) - b.attack(x))[0].uid;
  }
  // focus the weakest most of the time, otherwise spread pressure
  if (b.rng.chance(0.7)) return [...pool].sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0].uid;
  return b.rng.pick(pool).uid;
}
