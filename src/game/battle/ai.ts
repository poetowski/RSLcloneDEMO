// Enemy (and auto-battle) decision making. Deliberately simple and readable:
// strongest ready skill first, support skills only when allies need them,
// focus fire on weakened targets, respect taunt, avoid wasting control,
// and dispel skills go for the most buffed enemy.
import { STATUSES } from '../data/statuses';
import { SkillDef } from '../data/types';
import { Battle, Unit } from './battle';

export interface Decision {
  skill: SkillDef;
  target?: string;
}

export function decide(b: Battle, actor: Unit): Decision {
  const skills = [...actor.champion.skills].filter((s) => b.ready(actor, s)).sort((a, c) => (c.ai?.priority ?? 0) - (a.ai?.priority ?? 0));
  for (const s of skills) {
    if (s.ai?.when === 'allyHurt') {
      const allies = b.allies(actor);
      const hurt = allies.some((a) => a.hp / a.maxHp < 0.7) || allies.some((a) => a.statuses.some((x) => !STATUSES[x.id].buff));
      if (!hurt) continue;
    }
    return { skill: s, target: pickTarget(b, actor, s) };
  }
  const basic = actor.champion.skills[0];
  return { skill: basic, target: pickTarget(b, actor, basic) };
}

function pickTarget(b: Battle, actor: Unit, s: SkillDef): string | undefined {
  if (s.target !== 'enemy' && s.target !== 'ally') return undefined;
  const valid = b.validTargets(actor, s);
  if (!valid.length) return undefined;
  const controls = (s.statuses ?? []).some((x) => x.status === 'stun' || x.status === 'freeze');
  if (controls) {
    // never stun someone already disabled; prefer the hardest hitter
    const free = valid.filter((v) => !b.has(v, 'stun') && !b.has(v, 'freeze'));
    return [...(free.length ? free : valid)].sort((x, y) => b.attack(y) - b.attack(x))[0].uid;
  }
  if (s.stripBuffs) {
    const buffs = (u: Unit) => u.statuses.filter((x) => STATUSES[x.id].buff).length;
    const best = [...valid].sort((x, y) => buffs(y) - buffs(x))[0];
    if (buffs(best) > 0) return best.uid;
  }
  // focus the weakest most of the time, otherwise spread pressure
  if (b.rng.chance(0.7)) return [...valid].sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0].uid;
  return b.rng.pick(valid).uid;
}
