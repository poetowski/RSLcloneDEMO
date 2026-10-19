// Battle rules. Every rule is proven on the synthetic champions of
// tests/fixtures.ts; the last block runs the real roster through full battles.
import { describe, expect, it } from 'vitest';
import { decide } from '../src/game/battle/ai';
import { Battle, combatants, landShare } from '../src/game/battle/battle';
import { flatten, simulate } from '../src/game/battle/sim';
import { CHAMPIONS } from '../src/game/data/champions';
import { affinityEdge } from '../src/game/data/meta';
import { ChampionDef } from '../src/game/data/types';
import { balm, bannerman, brute, cleaver, drummer, druid, fixture, freezer, grudger, guard, hide, inAffinity, keen, marksman, medic, mender, mourner, overdrive, provisioner, raiser, rebuker, sheltering, stalker, stinger, striker, tender, toller, twin, undying, warden } from './fixtures';

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

  it("adds the attacker's critical damage on a critical hit: 100% doubles it", () => {
    const always = withStats(striker, { crit: 1 }), never = withStats(striker, { crit: 0 });
    const hit = (actor: ChampionDef) => {
      const b = new Battle(combatants([actor]), combatants([twin]), { seed: 5 });
      const r = b.useSkill(b.get('p0'), striker.skills[0], 'e0');
      return r.events.find((e) => e.kind === 'damage');
    };
    const a = hit(always), n = hit(never);
    expect(a?.kind === 'damage' && a.crit).toBe(true);
    expect(a?.kind === 'damage' && n?.kind === 'damage' && a.amount / n.amount).toBeCloseTo(2, 1);
    for (const critDmg of [0.5, 1.2]) {
      const c = hit(withStats(striker, { crit: 1, critDmg }));
      expect(c?.kind === 'damage' && n?.kind === 'damage' && c.amount / n.amount).toBeCloseTo(1 + critDmg, 1);
    }
  });

  it('uses the stats a combatant brings, as a Weaver Matrix gives them', () => {
    const b = new Battle([{ def: striker, stats: { ...striker.stats, hp: 2000, atk: 150 } }], combatants([twin]), { seed: 1 });
    expect(b.get('p0').maxHp).toBe(2000);
    expect(b.attack(b.get('p0'))).toBe(150);
    expect(new Battle(combatants([striker]), combatants([twin])).get('p0').maxHp).toBe(striker.stats.hp);
  });

  it('adds a stat passive in battle only, on top of the stats a combatant brings', () => {
    const b = new Battle(combatants([keen]), combatants([twin]), { seed: 5 });
    expect(b.get('p0').stats.crit).toBe(1);
    // the champion's own stats, the ones the collection shows, stay as they are
    expect(keen.stats.crit).toBe(0.05);
    const r = b.useSkill(b.get('p0'), keen.skills[0], 'e0');
    expect(r.events.find((e) => e.kind === 'damage')).toMatchObject({ crit: true });
    const woven = new Battle([{ def: keen, stats: { ...keen.stats, crit: 0.15, atk: 150 } }], combatants([twin]));
    expect([woven.get('p0').stats.crit, woven.get('p0').stats.atk]).toEqual([1.1, 150]);
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

  it('regen heals 15% max HP at the start of the turn', () => {
    const b = new Battle(combatants([striker]), combatants([guard]), { seed: 1 });
    const g = b.get('e0');
    g.hp = 100;
    b.addStatus(g, 'regen', 2, 0, 'test');
    const { events } = b.startTurn(g);
    const heal = events.find((e) => e.kind === 'heal');
    expect(heal?.kind === 'heal' && heal.amount).toBe(Math.round(g.maxHp * 0.15));
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
    expect(b.has(k, 'def_down')).toBe(true);
  });

  it('heals with an A1 that strikes nobody, and gives no counterattack with it', () => {
    const b = new Battle(combatants([medic, striker]), combatants([twin]), { seed: 3 });
    const [m, s] = [b.get('p0'), b.get('p1')];
    s.hp = 500;
    const r = b.useSkill(m, medic.skills[0]);
    expect(r.events.filter((e) => e.kind === 'heal').map((e) => e.kind === 'heal' && [e.target, e.amount])).toEqual([['p1', 140]]);
    expect(r.events.some((e) => e.kind === 'damage')).toBe(false);
    // even holding Counterattack, a champion whose A1 is a heal does not answer a blow with it
    b.addStatus(m, 'counter', 2, 0, 'p0');
    const hit = b.useSkill(b.get('e0'), twin.skills[0], 'p0');
    expect(hit.counters).toEqual([]);
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

  it('aims a skill that also gives its user the status at another ally, and gives it to each of them once', () => {
    const shelter = skill(sheltering, 'shelter');
    const b = new Battle(combatants([sheltering, guard, twin]), ENEMY, { seed: 3 });
    const me = b.get('p0');
    expect(b.validTargets(me, shelter).map((u) => u.uid)).toEqual(['p1', 'p2']);
    const r = b.useSkill(me, shelter, 'p2');
    expect(r.events.filter((e) => e.kind === 'status').map((e) => e.target).sort()).toEqual(['p0', 'p2']);
    expect(b.has(me, 'def_up') && b.has(b.get('p2'), 'def_up') && !b.has(b.get('p1'), 'def_up')).toBe(true);
    // alone, it is its own chosen ally, and the status lands once
    const solo = new Battle(combatants([sheltering]), ENEMY, { seed: 3 });
    expect(solo.validTargets(solo.get('p0'), shelter).map((u) => u.uid)).toEqual(['p0']);
    expect(solo.useSkill(solo.get('p0'), shelter, 'p0').events.filter((e) => e.kind === 'status')).toHaveLength(1);
  });

  it("aims a skill that heals its user at another ally while one stands, and shields it by a share of the caster's max HP", () => {
    const toll = skill(toller, 'toll');
    const b = new Battle(combatants([toller, guard, twin]), ENEMY, { seed: 3 });
    const me = b.get('p0'), g = b.get('p1');
    me.hp = Math.round(me.maxHp * 0.5);
    expect(b.validTargets(me, toll).map((u) => u.uid)).toEqual(['p1', 'p2']);
    b.useSkill(me, toll, 'p1');
    expect(g.statuses.find((s) => s.id === 'shield')?.value).toBe(Math.round(me.maxHp * 0.1));
    expect(me.hp).toBe(Math.round(me.maxHp * 0.5) + Math.round(me.maxHp * 0.1));
    expect(b.has(me, 'shield')).toBe(false);
    // alone, it shields itself
    const solo = new Battle(combatants([toller]), ENEMY, { seed: 3 });
    expect(solo.validTargets(solo.get('p0'), toll).map((u) => u.uid)).toEqual(['p0']);
  });

  it('raises one fallen ally with a share of its max HP, nothing on it and an empty turn meter, and waits while none has fallen', () => {
    const raise = skill(raiser, 'raise');
    const b = new Battle(combatants([raiser, guard, twin]), ENEMY, { seed: 3 });
    const me = b.get('p0'), g = b.get('p1');
    expect(b.ready(me, raise)).toBe(false);
    b.addStatus(g, 'poison', 2, 0, 'test');
    g.tm = 60;
    b.applyDamage(g, g.hp + 50, false, 0, 0, []);
    expect(g.alive).toBe(false);
    expect(b.ready(me, raise)).toBe(true);
    expect(b.validTargets(me, raise).map((u) => u.uid)).toEqual(['p1']);
    const r = b.useSkill(me, raise);
    expect([g.alive, g.hp, g.statuses, g.tm]).toEqual([true, Math.round(g.maxHp * 0.3), [], 0]);
    expect(r.targets).toEqual(['p1']);
    expect(r.events).toContainEqual({ kind: 'raise', target: 'p1', hp: g.hp, hit: 0 });
    // the cooldown is spent, and with nobody fallen it would wait anyway
    expect(b.ready(me, raise)).toBe(false);
    expect(me.cooldowns.raise).toBe(7);
  });

  it('raises a fallen ally chosen at random, and the AI raises as soon as one has fallen', () => {
    const raise = skill(raiser, 'raise');
    const picked = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const b = new Battle(combatants([raiser, guard, twin]), ENEMY, { seed });
      for (const u of [b.get('p1'), b.get('p2')]) b.applyDamage(u, u.hp + 1, false, 0, 0, []);
      const r = b.useSkill(b.get('p0'), raise);
      picked.add(r.targets[0]);
      expect(b.alive('player')).toHaveLength(2);
    }
    expect([...picked].sort()).toEqual(['p1', 'p2']);
    const b = new Battle(combatants([raiser, guard, twin]), ENEMY, { seed: 4 });
    expect(decide(b, b.get('p0')).skill.id).not.toBe('raise');
    b.applyDamage(b.get('p2'), b.get('p2').hp + 1, false, 0, 0, []);
    expect(decide(b, b.get('p0')).skill.id).toBe('raise');
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

  it("heals every ally by a share of the healer's max HP with healOf 'caster'", () => {
    const b = new Battle(combatants([provisioner, guard, twin]), combatants([striker]), { seed: 4 });
    const [q, g, t] = ['p0', 'p1', 'p2'].map((id) => b.get(id));
    q.hp = 300;
    g.hp = g.maxHp - 100;
    t.hp = 300;
    const r = b.useSkill(q, skill(provisioner, 'rations'));
    const healed = (uid: string) => r.events.reduce((n, e) => n + (e.kind === 'heal' && e.target === uid ? e.amount : 0), 0);
    // 15% of the healer's 1500 max HP whatever the ally's own, never past full
    expect([healed(q.uid), healed(g.uid), healed(t.uid)]).toEqual([225, 100, 225]);
  });

  it('lends turn meter to the ally lowest on HP once the heal has landed, never to the healer', () => {
    const small = fixture('small', { stats: { hp: 800 } }), big = fixture('big', { stats: { hp: 2000 } });
    const b = new Battle(combatants([provisioner, small, big]), combatants([striker]), { seed: 4 });
    const [q, s, g] = ['p0', 'p1', 'p2'].map((id) => b.get(id));
    for (const u of b.units) u.tm = 10;
    q.hp = 150;
    s.hp = 320; // 40% before the heal, 68% after
    g.hp = 900; // 45% before the heal, 56% after: the lowest once healed
    const r = b.useSkill(q, skill(provisioner, 'rations'));
    expect([q.tm, s.tm, g.tm]).toEqual([10, 10, 25]);
    expect(r.events.filter((e) => e.kind === 'tm')).toEqual([{ kind: 'tm', target: g.uid, delta: 15, hit: 0 }]);
    // never past a full meter
    g.tm = 95;
    g.hp = 100;
    b.useSkill(q, skill(provisioner, 'rations'));
    expect(g.tm).toBe(100);
  });

  it('overloads on a tick of Poison too: any drop below the threshold', () => {
    const b = new Battle(combatants([twin]), combatants([overdrive]), { seed: 5 });
    const c = b.get('e0');
    c.hp = Math.round(c.maxHp * 0.52);
    b.addStatus(c, 'poison', 2, 0, 'test');
    const { events } = b.startTurn(c);
    expect(c.alive && c.overdriven).toBe(true);
    expect(events.some((e) => e.kind === 'passive')).toBe(true);
    expect(b.has(c, 'def_up')).toBe(true);
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

  it("starts counting a status placed during its holder's own turn at the next turn", () => {
    const b = new Battle(combatants([brute]), combatants([guard]), { seed: 3 });
    const k = b.get('p0');
    b.startTurn(k);
    const r = b.useSkill(k, skill(brute, 'brute_blow'), 'e0');
    // the buff comes after the hit: the blow itself is not boosted
    expect(r.events.findIndex((e) => e.kind === 'status')).toBeGreaterThan(r.events.findIndex((e) => e.kind === 'damage'));
    b.endTurn(k);
    // it powers the next two turns, then expires
    for (let turn = 0; turn < 2; turn++) {
      b.startTurn(k);
      expect(b.has(k, 'atk_up')).toBe(true);
      b.endTurn(k);
    }
    expect(b.has(k, 'atk_up')).toBe(false);
  });

  it('answers a critical hit on its holder with Defy: Taunt on itself and a heal of a share of its max HP, once per skill, while it stands', () => {
    const always = (c: ChampionDef): ChampionDef => ({ ...c, stats: { ...c.stats, crit: 1 } });
    const never = (c: ChampionDef): ChampionDef => ({ ...c, stats: { ...c.stats, crit: 0 } });
    // a critical hit it survives: Taunt for 1 turn and 20% of its max HP back, after the hit
    let b = new Battle(combatants([grudger]), combatants([always(striker)]), { seed: 3 });
    let g = b.get('p0');
    g.hp = Math.round(g.maxHp / 2);
    let r = b.useSkill(b.get('e0'), striker.skills[0], 'p0');
    const answers = r.events.filter((e) => e.kind === 'passive');
    expect(answers.length === 1 && answers[0].kind === 'passive' && answers[0].effect === 'defy').toBe(true);
    expect(b.has(g, 'taunt')).toBe(true);
    const heal = r.events.find((e) => e.kind === 'heal' && e.target === 'p0');
    expect(heal?.kind === 'heal' && heal.amount).toBe(Math.round(g.maxHp * 0.2));
    expect(r.events.findIndex((e) => e.kind === 'passive')).toBeGreaterThan(r.events.findIndex((e) => e.kind === 'damage'));
    // two critical hits in one skill: one answer
    b = new Battle(combatants([grudger]), combatants([always(twin)]), { seed: 3 });
    r = b.useSkill(b.get('e0'), skill(twin, 'twin_chop'), 'p0');
    expect(r.events.filter((e) => e.kind === 'passive').length).toBe(1);
    // a hit that is not critical leaves it be
    b = new Battle(combatants([grudger]), combatants([never(striker)]), { seed: 3 });
    r = b.useSkill(b.get('e0'), striker.skills[0], 'p0');
    expect(r.events.some((e) => e.kind === 'passive') || b.has(b.get('p0'), 'taunt')).toBe(false);
    // and a critical hit that fells it never wakes it
    b = new Battle(combatants([grudger]), combatants([always(striker)]), { seed: 3 });
    g = b.get('p0');
    g.hp = 1;
    r = b.useSkill(b.get('e0'), striker.skills[0], 'p0');
    expect(g.alive).toBe(false);
    expect(r.events.some((e) => e.kind === 'passive')).toBe(false);
  });

  it('places a status marked before ahead of the first hit, so the skill itself carries it', () => {
    const b = new Battle(combatants([marksman]), combatants([guard]), { seed: 4 });
    const k = b.get('p0');
    b.startTurn(k);
    const r = b.useSkill(k, skill(marksman, 'steady_shot'), 'e0');
    const up = r.events.findIndex((e) => e.kind === 'status' && e.status === 'atk_up');
    const hit = r.events.findIndex((e) => e.kind === 'damage');
    const stun = r.events.findIndex((e) => e.kind === 'status' && e.status === 'stun');
    // the buff first, before any hit (hit -1); the Stun after the hit, on the last one
    expect(up >= 0 && up < hit && r.events[up].hit === -1).toBe(true);
    expect(stun).toBeGreaterThan(hit);
    // the same shot with the buff placed after it: the same rolls, a quarter less damage
    const plain = new Battle(combatants([marksman]), combatants([guard]), { seed: 4 });
    const pk = plain.get('p0');
    plain.startTurn(pk);
    const after = { ...skill(marksman, 'steady_shot'), statuses: [{ status: 'atk_up' as const, turns: 2, to: 'self' as const }, { status: 'stun' as const, turns: 1, to: 'targets' as const }] };
    const pr = plain.useSkill(pk, after, 'e0');
    const dealt = (events: typeof r.events) => events.reduce((n, e) => n + (e.kind === 'damage' ? e.amount : 0), 0);
    expect(dealt(r.events) / dealt(pr.events)).toBeCloseTo(1.25, 1);
    // it counts like any status placed on its holder's own turn: through the next two turns
    b.endTurn(k);
    for (let turn = 0; turn < 2; turn++) {
      b.startTurn(k);
      expect(b.has(k, 'atk_up')).toBe(true);
      b.endTurn(k);
    }
    expect(b.has(k, 'atk_up')).toBe(false);
  });

  it('answers a critical hit below the threshold with Rebuke, freezing the attacker for its next turn', () => {
    const crit = { ...striker, stats: { ...striker.stats, crit: 1 } };
    const b = new Battle(combatants([rebuker]), combatants([crit]), { seed: 2 });
    const t = b.get('p0'), a = b.get('e0');
    // above the threshold after the hit: no answer
    t.hp = t.maxHp;
    b.startTurn(a);
    let r = b.useSkill(a, crit.skills[0], 'p0');
    expect(r.events.some((e) => e.kind === 'passive')).toBe(false);
    b.endTurn(a);
    // below it: the attacker is frozen, and the freeze takes its next turn
    t.hp = Math.round(t.maxHp * 0.6);
    b.startTurn(a);
    r = b.useSkill(a, crit.skills[0], 'p0');
    expect(t.alive).toBe(true);
    const p = r.events.find((e) => e.kind === 'passive');
    expect(p?.kind === 'passive' && p.effect === 'rebuke' && p.source === 'e0').toBe(true);
    expect(b.has(a, 'freeze')).toBe(true);
    b.endTurn(a);
    expect(b.has(a, 'freeze')).toBe(true);
    expect(b.startTurn(a).skip).toBe(true);
    b.endTurn(a);
    expect(b.has(a, 'freeze')).toBe(false);
    // then it rests for three of the holder's turns
    t.hp = Math.round(t.maxHp * 0.6);
    b.startTurn(a);
    r = b.useSkill(a, crit.skills[0], 'p0');
    expect(r.events.some((e) => e.kind === 'passive')).toBe(false);
    b.endTurn(a);
    for (let i = 0; i < 3; i++) {
      b.startTurn(t);
      b.endTurn(t);
    }
    t.hp = Math.round(t.maxHp * 0.6);
    b.startTurn(a);
    r = b.useSkill(a, crit.skills[0], 'p0');
    expect(r.events.some((e) => e.kind === 'passive')).toBe(true);
  });

  it('never answers a hit that is not critical, nor one that kills', () => {
    const plain = { ...striker, stats: { ...striker.stats, crit: 0 } };
    const b = new Battle(combatants([rebuker]), combatants([plain]), { seed: 2 });
    b.get('p0').hp = 300;
    const r = b.useSkill(b.get('e0'), plain.skills[0], 'p0');
    expect(r.events.some((e) => e.kind === 'passive')).toBe(false);
    const crit = { ...striker, stats: { ...striker.stats, crit: 1 } };
    const b2 = new Battle(combatants([rebuker]), combatants([crit]), { seed: 2 });
    b2.get('p0').hp = 1;
    const r2 = b2.useSkill(b2.get('e0'), crit.skills[0], 'p0');
    expect(b2.get('p0').alive).toBe(false);
    expect(r2.events.some((e) => e.kind === 'passive')).toBe(false);
  });

  it('plays a champion with two skills, and the AI uses them', () => {
    expect(rebuker.skills.length).toBe(2);
    const r = simulate(combatants([rebuker, twin]), combatants([striker, guard]), { seed: 7 });
    expect(r.winner).not.toBeNull();
  });

  it('does not overload on a lethal hit', () => {
    const b = new Battle(combatants([twin]), combatants([overdrive]), { seed: 6 });
    const c = b.get('e0');
    c.hp = 1;
    const r = b.useSkill(b.get('p0'), skill(twin, 'twin_chop'), 'e0');
    expect(c.alive).toBe(false);
    expect(r.events.some((e) => e.kind === 'passive')).toBe(false);
  });

  it('tends the ally with the lowest max HP at the end of its turn, every second turn from the first', () => {
    // the striker (1200 max HP) is the frailest of the three
    const b = new Battle(combatants([tender, striker, guard]), combatants([twin]), { seed: 4 });
    const t = b.get('p0'), s = b.get('p1');
    b.startTurn(t);
    let ev = b.endTurn(t);
    const p = ev.find((e) => e.kind === 'passive');
    expect(p?.kind === 'passive' && [p.effect, p.target, p.source]).toEqual(['tend', 'p1', 'p0']);
    expect(ev.some((e) => e.kind === 'status' && e.status === 'shield' && e.target === 'p1')).toBe(true);
    expect(s.statuses.find((x) => x.id === 'shield')?.value).toBe(150);
    // it rests on his next turn, and gives again on the one after
    b.startTurn(t);
    ev = b.endTurn(t);
    expect(ev.some((e) => e.kind === 'passive')).toBe(false);
    b.startTurn(t);
    expect(b.endTurn(t).some((e) => e.kind === 'passive')).toBe(true);
    // the ally keeps it for 1 turn: until the end of its own next turn
    b.startTurn(s);
    expect(b.has(s, 'shield')).toBe(true);
    b.endTurn(s);
    expect(b.has(s, 'shield')).toBe(false);
  });

  it('tends itself when it is the frailest, the Shield covering its next turn, also after a skipped turn', () => {
    const big = { ...guard, stats: { ...guard.stats, hp: 1700 } };
    const b = new Battle(combatants([tender, big]), combatants([twin]), { seed: 4 });
    const t = b.get('p0');
    b.addStatus(t, 'stun', 1, 0, 'test');
    expect(b.startTurn(t).skip).toBe(true);
    b.endTurn(t);
    expect(b.has(t, 'shield')).toBe(true);
    // hit in between, it absorbs; it lasts through his next turn and goes at its end
    const r = b.useSkill(b.get('e0'), skill(twin, 'twin_chop'), 'p0');
    expect(r.events.some((e) => e.kind === 'damage' && e.absorbed > 0)).toBe(true);
    b.startTurn(t);
    b.endTurn(t);
    expect(b.has(t, 'shield')).toBe(false);
  });

  it('wards each ally an enemy skill damaged, after the hit, once per skill, the holder included', () => {
    const flag = bannerman(1);
    const b = new Battle(combatants([flag, striker]), combatants([twin]), { seed: 9 });
    const r = b.useSkill(b.get('e0'), skill(twin, 'twin_sweep'));
    const wards = r.events.filter((e) => e.kind === 'passive');
    expect(wards.map((e) => e.target).sort()).toEqual(['p0', 'p1']);
    expect(wards.every((e) => e.kind === 'passive' && e.effect === 'ward' && e.source === 'p0' && e.hit === 1)).toBe(true);
    // the Shield comes after the hits: they were not absorbed
    expect(r.events.filter((e) => e.kind === 'damage').every((e) => e.kind === 'damage' && e.absorbed === 0)).toBe(true);
    const lastDamage = r.events.map((e) => e.kind).lastIndexOf('damage');
    expect(r.events.findIndex((e) => e.kind === 'passive')).toBeGreaterThan(lastDamage);
    expect(b.get('p1').statuses.find((x) => x.id === 'shield')?.value).toBe(210);
  });

  it('wards nobody an attack kills, nobody its own side strikes, and about half the time with a 50% chance', () => {
    const flag = bannerman(1);
    const b = new Battle(combatants([flag, striker]), combatants([twin]), { seed: 9 });
    b.get('p1').hp = 1;
    const r = b.useSkill(b.get('e0'), skill(twin, 'twin_sweep'));
    expect(b.get('p1').alive).toBe(false);
    expect(r.events.filter((e) => e.kind === 'passive').map((e) => e.target)).toEqual(['p0']);
    // its own team's skills are no blow to answer
    const own = new Battle(combatants([flag, striker]), combatants([twin]), { seed: 9 });
    expect(own.useSkill(own.get('p1'), striker.skills[0], 'e0').events.some((e) => e.kind === 'passive')).toBe(false);
    let shielded = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const h = new Battle(combatants([bannerman(0.5)]), combatants([striker]), { seed });
      if (h.useSkill(h.get('e0'), striker.skills[0], 'p0').events.some((e) => e.kind === 'passive')) shielded++;
    }
    expect(shielded).toBeGreaterThan(70);
    expect(shielded).toBeLessThan(130);
  });

  it('raises a fallen passive with each fallen ally, up to its cap, and shows it while it grows', () => {
    const b = new Battle(combatants([mourner, striker, guard]), combatants([twin]), { seed: 2 });
    const m = b.get('p0');
    expect(b.critRate(m)).toBe(0);
    b.get('p1').hp = 1;
    let r = b.useSkill(b.get('e0'), skill(twin, 'twin_chop'), 'p1');
    expect(b.get('p1').alive).toBe(false);
    expect(r.events.filter((e) => e.kind === 'passive').map((e) => e.kind === 'passive' && [e.target, e.effect])).toEqual([['p0', 'fallen']]);
    expect(b.critRate(m)).toBeCloseTo(0.2);
    // the second fall reaches the cap: +30%, not +40%
    b.get('p2').hp = 1;
    r = b.useSkill(b.get('e0'), skill(twin, 'twin_chop'), 'p2');
    expect(r.events.some((e) => e.kind === 'passive')).toBe(true);
    expect(b.critRate(m)).toBeCloseTo(0.3);
    // the champion's own stats are untouched; an enemy's fall does nothing for it
    expect(m.stats.crit).toBe(0);
    const b2 = new Battle(combatants([mourner]), combatants([striker, twin]), { seed: 2 });
    b2.get('e1').hp = 1;
    b2.useSkill(b2.get('p0'), mourner.skills[0], 'e1');
    expect(b2.critRate(b2.get('p0'))).toBe(0);
  });

  it('wards only its holder with a ward of its own, after every enemy blow on it, once per skill', () => {
    const b = new Battle(combatants([hide, striker]), combatants([twin]), { seed: 5 });
    const r = b.useSkill(b.get('e0'), skill(twin, 'twin_sweep'));
    // the sweep struck both, twice each: the hide answers once, for itself alone
    expect(r.events.filter((e) => e.kind === 'passive').map((e) => e.kind === 'passive' && [e.effect, e.target, e.source])).toEqual([['ward', 'p0', 'p0']]);
    expect(r.events.filter((e) => e.kind === 'damage').every((e) => e.kind === 'damage' && e.absorbed === 0)).toBe(true);
    expect(b.get('p0').statuses.find((x) => x.id === 'shield')?.value).toBe(150);
    expect(b.has(b.get('p1'), 'shield')).toBe(false);
    // every time, with no chance to roll
    for (let seed = 1; seed <= 30; seed++) {
      const h = new Battle(combatants([hide]), combatants([striker]), { seed });
      expect(h.useSkill(h.get('e0'), striker.skills[0], 'p0').events.some((e) => e.kind === 'passive'), `seed ${seed}`).toBe(true);
    }
  });

  it('answers an enemy blow on its holder on the attacker after the hit, once per skill, and never once the holder has fallen', () => {
    const b = new Battle(combatants([stinger(1), striker]), combatants([twin]), { seed: 3 });
    const r = b.useSkill(b.get('e0'), skill(twin, 'twin_sweep'));
    const answers = r.events.filter((e) => e.kind === 'passive');
    expect(answers.map((e) => e.kind === 'passive' && [e.effect, e.target, e.source])).toEqual([['retaliate', 'e0', 'p0']]);
    expect(r.events.findIndex((e) => e.kind === 'passive')).toBeGreaterThan(r.events.map((e) => e.kind).lastIndexOf('damage'));
    expect(b.has(b.get('e0'), 'poison')).toBe(true);
    // a blow that fells it, or a skill of its own side, is answered by nobody
    const k = new Battle(combatants([stinger(1), striker]), combatants([twin]), { seed: 3 });
    k.get('p0').hp = 1;
    expect(k.useSkill(k.get('e0'), skill(twin, 'twin_chop'), 'p0').events.some((e) => e.kind === 'passive')).toBe(false);
    expect(k.useSkill(k.get('p1'), striker.skills[0], 'e0').events.some((e) => e.kind === 'passive')).toBe(false);
    // the Poison meets the attacker's RES
    const tough = { ...twin, stats: { ...twin.stats, res: 1e9 } };
    const res = new Battle(combatants([stinger(1)]), [{ def: tough }], { seed: 3 });
    const rr = res.useSkill(res.get('e0'), tough.skills[0], 'p0');
    expect(rr.events.some((e) => e.kind === 'resist' && e.status === 'poison' && e.target === 'e0')).toBe(true);
  });

  it("retaliates with its chance, and a 1-turn Poison placed on the attacker's own turn ticks once", () => {
    let answered = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const b = new Battle(combatants([stinger(0.35)]), combatants([striker]), { seed });
      if (b.useSkill(b.get('e0'), striker.skills[0], 'p0').events.some((e) => e.kind === 'passive')) answered++;
    }
    expect(answered).toBeGreaterThan(45);
    expect(answered).toBeLessThan(95);
    const b = new Battle(combatants([stinger(1)]), combatants([striker]), { seed: 8 });
    const a = b.get('e0');
    b.startTurn(a);
    b.useSkill(a, striker.skills[0], 'p0');
    b.endTurn(a);
    expect(b.has(a, 'poison')).toBe(true);
    const tick = b.startTurn(a).events.filter((e) => e.kind === 'damage');
    expect(tick.map((e) => e.kind === 'damage' && e.dot)).toEqual(['poison']);
    b.endTurn(a);
    expect(b.has(a, 'poison')).toBe(false);
  });

  it('soothes an ally an enemy debuffs, the holder included, once for each debuff that lands', () => {
    const b = new Battle(combatants([balm(1), striker]), combatants([warden]), { seed: 2 });
    const r = b.useSkill(b.get('e0'), skill(warden, 'dispel_strike'), 'p1');
    const kinds = r.events.filter((e) => e.target === 'p1' && e.kind !== 'damage').map((e) => (e.kind === 'status' ? `${e.kind}:${e.status}` : e.kind === 'passive' ? `${e.kind}:${e.effect}` : e.kind));
    expect(kinds).toEqual(['status:def_down', 'passive:remedy', 'status:regen']);
    expect(r.events.find((e) => e.kind === 'passive')).toMatchObject({ target: 'p1', source: 'p0' });
    expect(b.has(b.get('p1'), 'regen')).toBe(true);
    // the holder itself
    const own = b.useSkill(b.get('e0'), skill(warden, 'dispel_strike'), 'p0');
    expect(own.events.some((e) => e.kind === 'passive' && e.target === 'p0')).toBe(true);
    // a resisted debuff was never placed
    const res = new Battle([{ def: balm(1) }, { def: striker, stats: { ...striker.stats, res: 1e9 } }], combatants([warden]), { seed: 2 });
    const rr = res.useSkill(res.get('e0'), skill(warden, 'dispel_strike'), 'p1');
    expect(rr.events.some((e) => e.kind === 'resist')).toBe(true);
    expect(rr.events.some((e) => e.kind === 'passive')).toBe(false);
    // with its chance
    let soothed = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const h = new Battle(combatants([balm(0.35), striker]), combatants([warden]), { seed });
      if (h.useSkill(h.get('e0'), skill(warden, 'dispel_strike'), 'p1').events.some((e) => e.kind === 'passive')) soothed++;
    }
    expect(soothed).toBeGreaterThan(45);
    expect(soothed).toBeLessThan(95);
  });

  it('heals its user by a share of its own max HP after the blow, unless Heal Block stops it', () => {
    const b = new Battle(combatants([druid]), combatants([striker]), { seed: 1 });
    const d = b.get('p0');
    d.hp = 600;
    const r = b.useSkill(d, skill(druid, 'briar'), 'e0');
    expect(r.events.filter((e) => e.kind === 'heal').map((e) => e.kind === 'heal' && [e.target, e.amount])).toEqual([['p0', 84]]);
    expect(r.events.findIndex((e) => e.kind === 'heal')).toBeGreaterThan(r.events.findIndex((e) => e.kind === 'damage'));
    expect(d.hp).toBe(684);
    b.addStatus(d, 'heal_block', 2, 0, 'test');
    const blocked = b.useSkill(d, skill(druid, 'briar'), 'e0');
    expect(blocked.events.some((e) => e.kind === 'blocked' && e.target === 'p0')).toBe(true);
    expect(d.hp).toBe(684);
  });

  it('lifts every debuff off the one ally with a full cleanse, and the AI keeps it for an afflicted ally', () => {
    const b = new Battle(combatants([druid, striker, guard]), combatants([twin]), { seed: 1 });
    const s = b.get('p1');
    for (const id of ['poison', 'atk_down', 'stun', 'def_up'] as const) b.addStatus(s, id, 2, 0, 'test');
    b.addStatus(b.get('p2'), 'burn', 2, 0, 'test');
    const r = b.useSkill(b.get('p0'), skill(druid, 'rite'), 'p1');
    expect(r.events.filter((e) => e.kind === 'cleanse').map((e) => e.kind === 'cleanse' && [e.target, e.status])).toEqual([['p1', 'poison'], ['p1', 'atk_down'], ['p1', 'stun']]);
    expect(s.statuses.map((x) => x.id)).toEqual(['def_up']);
    // only the chosen ally
    expect(b.has(b.get('p2'), 'burn')).toBe(true);
    // the AI: nothing to cleanse, no cleanse; then the most afflicted ally
    const c = new Battle(combatants([druid, striker, guard]), combatants([twin]), { seed: 1 });
    expect(decide(c, c.get('p0')).skill.id).not.toBe('rite');
    c.addStatus(c.get('p1'), 'poison', 2, 0, 'test');
    c.addStatus(c.get('p2'), 'poison', 2, 0, 'test');
    c.addStatus(c.get('p2'), 'def_down', 2, 0, 'test');
    expect(decide(c, c.get('p0'))).toMatchObject({ skill: { id: 'rite' }, target: 'p2' });
  });
});

describe('accuracy and resistance', () => {
  /** how often the freezer's certain Freeze lands on the striker, over 1000 seeds */
  const freezeRate = (acc: number, res: number) => {
    let landed = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const b = new Battle([{ def: freezer, stats: { ...freezer.stats, acc } }], [{ def: striker, stats: { ...striker.stats, res } }], { seed });
      const r = b.useSkill(b.get('p0'), skill(freezer, 'freeze_bolt'), 'e0');
      const freeze = r.events.filter((e) => (e.kind === 'status' || e.kind === 'resist') && e.status === 'freeze');
      expect(freeze).toHaveLength(1);
      if (freeze[0].kind === 'status') landed++;
    }
    return landed / 1000;
  };

  it("lands a debuff by the placer's ACC against the target's RES", () => {
    expect(freezeRate(0, 0)).toBe(1);
    expect(freezeRate(50, 50)).toBe(1);
    expect(freezeRate(80, 20)).toBe(1); // ACC above RES adds nothing
    expect(freezeRate(0, 100)).toBeCloseTo(0.5, 1);
    expect(freezeRate(20, 120)).toBeCloseTo(0.5, 1);
    expect(landShare(0, 100)).toBe(0.5);
    expect(landShare(0, 300)).toBe(0.25);
    expect(landShare(40, 20)).toBe(1);
  });

  it('cuts a chance debuff by the same share, and never touches buffs', () => {
    // Fangs: Poison at 50% per hit, two hits; RES 100 over ACC leaves 25% per hit
    let poisons = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const b = new Battle(combatants([stalker]), [{ def: twin, stats: { ...twin.stats, res: 100 } }], { seed });
      const r = b.useSkill(b.get('p0'), skill(stalker, 'fangs'), 'e0');
      poisons += r.events.filter((e) => e.kind === 'status' && e.status === 'poison').length;
    }
    expect(poisons / 2000).toBeCloseTo(0.25, 1);
    // the drummer's SPD Up lands on every ally, whatever their RES
    const b = new Battle(
      [drummer, guard, twin].map((def) => ({ def, stats: { ...def.stats, res: 1000 } })),
      combatants([striker]),
      { seed: 4 },
    );
    const r = b.useSkill(b.get('p0'), skill(drummer, 'march'));
    expect(r.events.filter((e) => e.kind === 'status' && e.status === 'spd_up')).toHaveLength(3);
  });

  it("counts a RES stat passive against the placer's ACC (the Skeleton's Bare Bones: +20 RES)", () => {
    const boned: ChampionDef = { ...striker, id: 'boned', passive: { id: 'bones', name: 'Bones', desc: '', kind: 'stat', stat: 'res', value: 20 } };
    let landed = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const b = new Battle(combatants([freezer]), combatants([boned]), { seed });
      expect(b.get('e0').stats.res).toBe(20);
      const r = b.useSkill(b.get('p0'), skill(freezer, 'freeze_bolt'), 'e0');
      if (r.events.some((e) => e.kind === 'status' && e.status === 'freeze')) landed++;
    }
    // a certain Freeze lands 100 / 120 of the time; an ACC of 20 would take the edge away
    expect(landed / 1000).toBeCloseTo(landShare(0, 20), 1);
    expect(landShare(20, 20)).toBe(1);
  });

  it("lets RES resist Cold Rebuke's Freeze too", () => {
    const crit = { ...striker, stats: { ...striker.stats, crit: 1, res: 1e9 } };
    const b = new Battle(combatants([rebuker]), [{ def: crit }], { seed: 2 });
    const t = b.get('p0'), a = b.get('e0');
    t.hp = Math.round(t.maxHp * 0.6);
    b.startTurn(a);
    const r = b.useSkill(a, crit.skills[0], 'p0');
    expect(r.events.some((e) => e.kind === 'passive' && e.effect === 'rebuke')).toBe(true);
    expect(r.events.some((e) => e.kind === 'resist' && e.status === 'freeze' && e.target === 'e0')).toBe(true);
    expect(b.has(a, 'freeze')).toBe(false);
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
    // a side left only with champions that never strike can neither win nor lose (the Bellringer alone
    // shields and heals himself every turn): such a battle runs to the cap, a stalemate the rules do not
    // settle yet (docs/DESIGN_DECISIONS.md 7); every other battle ends
    const strikes = (c: ChampionDef) => c.skills.some((s) => s.hits.some((h) => h.mult > 0));
    for (let i = 0; i < all.length; i++) {
      const b = new Battle(combatants([at(i), at(i + 1), at(i + 2)]), combatants([at(i + 1), at(i + 2), at(i + 3)]), { seed: i + 1 });
      for (let turns = 0; !b.winner() && turns < 400; turns++) {
        const a = b.advance();
        const st = b.startTurn(a);
        if (a.alive && !st.skip && !b.winner()) {
          const d = decide(b, a);
          b.useSkill(a, d.skill, d.target);
        }
        b.endTurn(a);
      }
      if (!b.winner()) expect((['player', 'enemy'] as const).some((t) => b.alive(t).every((u) => !strikes(u.champion)))).toBe(true);
    }
  });
});
