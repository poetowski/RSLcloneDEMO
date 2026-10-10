// Battle rules. Every rule is proven on the synthetic champions of
// tests/fixtures.ts; the last block runs the real roster through full battles.
import { describe, expect, it } from 'vitest';
import { Battle, combatants } from '../src/game/battle/battle';
import { flatten, simulate } from '../src/game/battle/sim';
import { CHAMPIONS } from '../src/game/data/champions';
import { affinityEdge } from '../src/game/data/meta';
import { ChampionDef } from '../src/game/data/types';
import { cleaver, drummer, freezer, guard, inAffinity, mender, overdrive, stalker, striker, twin, undying, warden } from './fixtures';

const skill = (c: ChampionDef, id: string) => c.skills.find((s) => s.id === id)!;
const PLAYER = combatants([guard, twin, striker]);
const ENEMY = combatants([cleaver, stalker, mender]);

describe('damage rules', () => {
  /** total damage of the striker's A1 into a target, over the same seeds */
  const total = (target: ChampionDef) => {
    let sum = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const b = new Battle(combatants([striker]), [{ def: target }], { seed });
      const r = b.useSkill(b.get('p0'), striker.skills[0], 'e0');
      for (const e of r.events) if (e.kind === 'damage') sum += e.amount;
    }
    return sum;
  };
  const withStats = (c: ChampionDef, stats: Partial<ChampionDef['stats']>): ChampionDef => ({ ...c, stats: { ...c.stats, ...stats } });

  it('divides damage by DEF: twice the DEF, half the damage', () => {
    expect(total(withStats(twin, { def: 40 })) / total(withStats(twin, { def: 80 }))).toBeCloseTo(2, 1);
  });

  it('doubles damage on a critical hit', () => {
    const always = withStats(striker, { crit: 1 }), never = withStats(striker, { crit: 0 });
    const hit = (actor: ChampionDef) => {
      const b = new Battle(combatants([actor]), combatants([twin]), { seed: 5 });
      const r = b.useSkill(b.get('p0'), striker.skills[0], 'e0');
      return r.events.find((e) => e.kind === 'damage');
    };
    const a = hit(always), n = hit(never);
    expect(a?.kind === 'damage' && a.crit).toBe(true);
    expect(a?.kind === 'damage' && n?.kind === 'damage' && a.amount / n.amount).toBeCloseTo(2, 1);
  });

  it('uses the stats a combatant brings, as a Weaver Matrix gives them', () => {
    const b = new Battle([{ def: striker, stats: { ...striker.stats, hp: 2000, atk: 150 } }], combatants([twin]), { seed: 1 });
    expect(b.get('p0').maxHp).toBe(2000);
    expect(b.attack(b.get('p0'))).toBe(150);
    expect(new Battle(combatants([striker]), combatants([twin])).get('p0').maxHp).toBe(striker.stats.hp);
  });
});

describe('turn meter', () => {
  it('lets the fastest unit act first when meters are equal', () => {
    const b = new Battle(PLAYER, ENEMY, { seed: 1 });
    for (const u of b.units) u.tm = 0;
    expect(b.advance().champion.id).toBe('stalker');
  });

  it('resets the actor and keeps everyone else proportional', () => {
    const b = new Battle(PLAYER, ENEMY, { seed: 1 });
    for (const u of b.units) u.tm = 0;
    const a = b.advance();
    b.endTurn(a);
    expect(a.tm).toBe(0);
    expect(b.get('p0').tm).toBeCloseTo((100 * guard.stats.spd) / stalker.stats.spd, 5);
  });

  it('speed debuffs slow the meter', () => {
    const b = new Battle(combatants([guard]), combatants([twin]));
    const k = b.get('p0');
    const base = b.speed(k);
    b.addStatus(k, 'spd_down', 2, 0, 'test');
    expect(b.speed(k)).toBeCloseTo(base * 0.75);
  });

  it('selfTm skills end the turn with turn meter', () => {
    const b = new Battle(combatants([stalker]), combatants([guard]), { seed: 2 });
    const s = b.get('p0');
    b.useSkill(s, skill(stalker, 'mirage'), 'e0');
    b.endTurn(s);
    expect(s.tm).toBe(25);
  });
});

describe('damage', () => {
  it('respects shields', () => {
    const b = new Battle(combatants([twin]), combatants([guard]), { seed: 3 });
    const g = b.get('e0');
    b.addStatus(g, 'shield', 2, 50, 'test');
    const r = b.useSkill(b.get('p0'), skill(twin, 'twin_chop'), g.uid);
    const dmg = r.events.filter((e) => e.kind === 'damage');
    expect(dmg.length).toBe(2);
    expect(dmg.reduce((s, e) => s + (e.kind === 'damage' ? e.absorbed : 0), 0)).toBe(50);
  });

  it('follows the affinity cycle: Ember beats Bloom, Bloom beats Tide, Tide beats Ember', () => {
    expect(affinityEdge('ember', 'bloom')).toBe(1);
    expect(affinityEdge('bloom', 'tide')).toBe(1);
    expect(affinityEdge('tide', 'ember')).toBe(1);
    expect(affinityEdge('bloom', 'ember')).toBe(-1);
    expect(affinityEdge('ember', 'tide')).toBe(-1);
    expect(affinityEdge('tide', 'tide')).toBe(0);
  });

  it('strong hits deal more than weak hits', () => {
    // an Ember striker hits a Bloom target strong and a Tide target weak
    const avg = (target: ChampionDef) => {
      let sum = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const b = new Battle(combatants([inAffinity('ember')]), combatants([target]), { seed });
        const r = b.useSkill(b.get('p0'), b.get('p0').champion.skills[0], 'e0');
        const e = r.events.find((x) => x.kind === 'damage');
        if (e?.kind === 'damage') sum += (e.amount * target.stats.def) / 40;
      }
      return sum / 200;
    };
    expect(avg(inAffinity('bloom')) / avg(inAffinity('tide'))).toBeGreaterThan(1.35);
  });

  it('weaken increases damage taken', () => {
    const run = (weak: boolean) => {
      let sum = 0;
      for (let seed = 1; seed <= 100; seed++) {
        const b = new Battle(combatants([striker]), combatants([guard]), { seed });
        if (weak) b.addStatus(b.get('e0'), 'weaken', 2, 0, 'test');
        const r = b.useSkill(b.get('p0'), striker.skills[0], 'e0');
        sum += r.events.reduce((s, e) => s + (e.kind === 'damage' ? e.amount : 0), 0);
      }
      return sum;
    };
    expect(run(true) / run(false)).toBeCloseTo(1.25, 1);
  });

  it('kills at 0 HP and removes the unit from targeting', () => {
    const b = new Battle(combatants([twin]), combatants([striker, guard]), { seed: 1 });
    const a = b.get('e0');
    a.hp = 1;
    const r = b.useSkill(b.get('p0'), skill(twin, 'twin_chop'), a.uid);
    expect(a.alive).toBe(false);
    expect(r.events.some((e) => e.kind === 'death' && e.target === a.uid)).toBe(true);
    expect(b.validTargets(b.get('p0'), skill(twin, 'twin_chop')).map((u) => u.uid)).toEqual(['e1']);
  });

  it('scales enemies by stage power and bosses by boss HP', () => {
    const b = new Battle(combatants([striker]), [{ def: overdrive, boss: true }, { def: mender }], { enemyPower: 1.1, bossHp: 1.6 });
    expect(b.get('e0').maxHp).toBe(Math.round(overdrive.stats.hp * 1.1 * 1.6));
    expect(b.get('e1').maxHp).toBe(Math.round(mender.stats.hp * 1.1));
    expect(b.attack(b.get('e1'))).toBeCloseTo(mender.stats.atk * 1.1);
  });
});

describe('statuses', () => {
  it('puts skills on cooldown and brings them back', () => {
    const b = new Battle(combatants([guard]), combatants([twin]));
    const k = b.get('p0');
    const bash = skill(guard, 'guard_bash');
    b.useSkill(k, bash, 'e0');
    b.endTurn(k); // the turn it was used
    // unavailable on the next three turns
    for (let i = 0; i < 3; i++) {
      expect(b.ready(k, bash)).toBe(false);
      b.endTurn(k);
    }
    expect(b.ready(k, bash)).toBe(true);
  });

  it('forces single-target skills onto a taunting champion', () => {
    const b = new Battle(PLAYER, ENEMY, { seed: 1 });
    b.useSkill(b.get('p0'), skill(guard, 'guard_taunt'));
    const c = b.get('e0');
    expect(b.validTargets(c, skill(cleaver, 'cleave')).map((t) => t.uid)).toEqual(['p0']);
    expect(b.validTargets(c, skill(cleaver, 'sweep')).length).toBe(3);
  });

  it('freezes and skips the frozen turn', () => {
    const b = new Battle(combatants([striker]), combatants([freezer]), { seed: 5 });
    b.useSkill(b.get('e0'), skill(freezer, 'freeze_bolt'), 'p0');
    const a = b.get('p0');
    expect(b.has(a, 'freeze')).toBe(true);
    expect(b.startTurn(a).skip).toBe(true);
    b.endTurn(a);
    expect(b.has(a, 'freeze')).toBe(false);
  });

  it('ticks poison and burn at the start of the turn, ignoring shields', () => {
    const b = new Battle(combatants([guard]), combatants([striker]));
    const k = b.get('p0');
    b.addStatus(k, 'poison', 3, 0, 'test');
    b.addStatus(k, 'burn', 2, 0, 'test');
    b.addStatus(k, 'shield', 2, 500, 'test');
    const { events } = b.startTurn(k);
    const amounts = events.filter((e) => e.kind === 'damage').map((e) => (e.kind === 'damage' ? e.amount : 0));
    expect(amounts).toEqual([Math.round(k.maxHp * 0.05), Math.round(k.maxHp * 0.06)]);
  });

  it('heals and cleanses, and Heal Block stops healing', () => {
    const b = new Battle(combatants([mender, twin, guard]), combatants([striker]), { seed: 1 });
    const t = b.get('p1'), g = b.get('p2');
    t.hp = 500;
    g.hp = 500;
    b.addStatus(t, 'def_down', 2, 0, 'test');
    b.addStatus(g, 'heal_block', 2, 0, 'test');
    const r = b.useSkill(b.get('p0'), skill(mender, 'mend'));
    expect(t.hp).toBeGreaterThan(500);
    expect(b.has(t, 'def_down')).toBe(false);
    expect(g.hp).toBe(500);
    expect(r.events.some((e) => e.kind === 'blocked' && e.target === g.uid)).toBe(true);
  });

  it('strips buffs before the hit with a dispel', () => {
    const b = new Battle(combatants([warden]), combatants([guard]), { seed: 4 });
    const k = b.get('e0');
    b.addStatus(k, 'shield', 2, 9999, 'test');
    b.addStatus(k, 'def_up', 2, 0, 'test');
    const r = b.useSkill(b.get('p0'), skill(warden, 'dispel_strike'), 'e0');
    expect(r.events.filter((e) => e.kind === 'dispel').length).toBe(2);
    const hit = r.events.find((e) => e.kind === 'damage');
    expect(hit?.kind === 'damage' && hit.absorbed).toBe(0);
    expect(b.has(k, 'weaken')).toBe(true);
  });

  it('counterattacks once with A1 when a countering champion is hit', () => {
    const b = new Battle(combatants([warden, guard]), combatants([twin]), { seed: 6 });
    b.useSkill(b.get('p0'), skill(warden, 'vigil'));
    expect(b.has(b.get('p1'), 'counter')).toBe(true);
    const r = b.useSkill(b.get('e0'), skill(twin, 'twin_sweep'));
    expect(r.counters.length).toBe(2);
    expect(r.counters.every((c) => c.counter && c.target === 'e0' && c.counters.length === 0)).toBe(true);
    expect(flatten(r).length).toBe(3);
  });

  it('rolls per-hit statuses on every hit', () => {
    let rolled = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const b = new Battle(combatants([stalker]), combatants([guard]), { seed });
      const r = b.useSkill(b.get('p0'), skill(stalker, 'fangs'), 'e0');
      rolled += r.events.filter((e) => e.kind === 'status' || e.kind === 'resist').length === 2 ? 1 : 0;
    }
    expect(rolled).toBe(200);
  });

  it('rises once with Undying', () => {
    const b = new Battle(combatants([twin]), combatants([undying]), { seed: 1 });
    const t = b.get('e0');
    t.hp = 1;
    b.addStatus(t, 'poison', 2, 0, 'test');
    const r = b.useSkill(b.get('p0'), skill(twin, 'twin_chop'), 'e0');
    expect(r.events.some((e) => e.kind === 'revive')).toBe(true);
    expect(t.alive).toBe(true);
    expect(b.has(t, 'poison')).toBe(false);
    t.hp = 1;
    b.useSkill(b.get('p0'), skill(twin, 'twin_chop'), 'e0');
    expect(t.alive).toBe(false);
  });

  it('places a status on every enemy with an AoE skill', () => {
    const b = new Battle(combatants([mender]), combatants([guard, twin, striker]), { seed: 9 });
    b.useSkill(b.get('p0'), skill(mender, 'scorch'));
    for (const e of b.alive('enemy')) expect(b.has(e, 'heal_block')).toBe(true);
  });

  it("fills the other allies' turn meters with tmAllies", () => {
    const b = new Battle(combatants([drummer, guard, twin]), combatants([striker]), { seed: 4 });
    for (const u of b.units) u.tm = 10;
    const k = b.get('p0');
    const r = b.useSkill(k, skill(drummer, 'march'));
    expect(b.get('p1').tm).toBe(30);
    expect(b.get('p2').tm).toBe(30);
    expect(k.tm).toBe(10);
    expect(r.events.filter((e) => e.kind === 'tm')).toHaveLength(2);
    for (const a of b.alive('player')) expect(b.has(a, 'spd_up')).toBe(true);
    // the boost never pushes a meter past full
    b.get('p1').tm = 95;
    b.useSkill(k, skill(drummer, 'march'));
    expect(b.get('p1').tm).toBe(100);
  });

  it('overloads once below the Overdrive threshold', () => {
    const b = new Battle(combatants([twin]), combatants([overdrive]), { seed: 5 });
    const c = b.get('e0');
    c.hp = Math.round(c.maxHp * 0.55);
    const r = b.useSkill(b.get('p0'), skill(twin, 'twin_chop'), 'e0');
    expect(c.alive).toBe(true);
    expect(c.overdriven).toBe(true);
    expect(r.events.some((e) => e.kind === 'passive')).toBe(true);
    expect(b.has(c, 'atk_up') && b.has(c, 'def_up')).toBe(true);
    c.statuses = [];
    const again = b.useSkill(b.get('p0'), skill(twin, 'twin_chop'), 'e0');
    expect(again.events.some((e) => e.kind === 'passive')).toBe(false);
    expect(b.has(c, 'atk_up')).toBe(false);
  });

  it('does not overload on a lethal hit', () => {
    const b = new Battle(combatants([twin]), combatants([overdrive]), { seed: 6 });
    const c = b.get('e0');
    c.hp = 1;
    const r = b.useSkill(b.get('p0'), skill(twin, 'twin_chop'), 'e0');
    expect(c.alive).toBe(false);
    expect(r.events.some((e) => e.kind === 'passive')).toBe(false);
  });
});

describe('full auto battles', () => {
  it('always end with a winner, and either side can win', () => {
    const team = [guard, twin, mender];
    const winners = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const r = simulate(combatants(team), combatants(team), { seed });
      expect(r.winner).not.toBeNull();
      expect(r.turns).toBeLessThan(300);
      winners.add(r.winner!);
    }
    expect(winners.size).toBe(2);
  });

  it('runs every champion of the roster through battles without errors', () => {
    const all = CHAMPIONS;
    const at = (i: number) => all[i % all.length];
    for (let i = 0; i < all.length; i++) {
      const r = simulate(combatants([at(i), at(i + 1), at(i + 2)]), combatants([at(i + 1), at(i + 2), at(i + 3)]), { seed: i + 1 });
      expect(r.winner).not.toBeNull();
    }
  });
});
