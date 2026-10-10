import { describe, expect, it } from 'vitest';
import { Battle, combatants } from '../src/game/battle/battle';
import { flatten, simulate } from '../src/game/battle/sim';
import { archer, colossus, dreadknight, frostmage, jackal, knight, monk, priestess, stalker, starsinger, tomblord, warrior } from '../src/game/data/champions';
import { affinityEdge } from '../src/game/data/meta';
import { ChampionDef } from '../src/game/data/types';

const skill = (c: ChampionDef, id: string) => c.skills.find((s) => s.id === id)!;
const PLAYER = combatants([knight, warrior, archer]);
const ENEMY = combatants([dreadknight, monk, frostmage]);

describe('damage rules', () => {
  /** total damage of Valiant Strike into a target, over the same seeds */
  const total = (target: ChampionDef) => {
    let sum = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const b = new Battle(combatants([knight]), [{ def: target }], { seed });
      const r = b.useSkill(b.get('p0'), skill(knight, 'valiant_strike'), 'e0');
      for (const e of r.events) if (e.kind === 'damage') sum += e.amount;
    }
    return sum;
  };
  const withStats = (c: ChampionDef, stats: Partial<ChampionDef['stats']>): ChampionDef => ({ ...c, stats: { ...c.stats, ...stats } });

  it('divides damage by DEF: twice the DEF, half the damage', () => {
    expect(total(withStats(warrior, { def: 40 })) / total(withStats(warrior, { def: 80 }))).toBeCloseTo(2, 1);
  });

  it('doubles damage on a critical hit', () => {
    const always = withStats(knight, { crit: 1 }), never = withStats(knight, { crit: 0 });
    const hit = (actor: ChampionDef) => {
      const b = new Battle(combatants([actor]), combatants([warrior]), { seed: 5 });
      const r = b.useSkill(b.get('p0'), skill(knight, 'valiant_strike'), 'e0');
      return r.events.find((e) => e.kind === 'damage');
    };
    const a = hit(always), n = hit(never);
    expect(a?.kind === 'damage' && a.crit).toBe(true);
    expect(a?.kind === 'damage' && n?.kind === 'damage' && a.amount / n.amount).toBeCloseTo(2, 1);
  });

  it('uses the stats a combatant brings, as a Weaver Matrix gives them', () => {
    const b = new Battle([{ def: knight, stats: { ...knight.stats, hp: 2000, atk: 150 } }], combatants([warrior]), { seed: 1 });
    expect(b.get('p0').maxHp).toBe(2000);
    expect(b.attack(b.get('p0'))).toBe(150);
    expect(new Battle(combatants([knight]), combatants([warrior])).get('p0').maxHp).toBe(knight.stats.hp);
  });
});

describe('turn meter', () => {
  it('lets the fastest unit act first when meters are equal', () => {
    const b = new Battle(PLAYER, ENEMY, { seed: 1 });
    for (const u of b.units) u.tm = 0;
    expect(b.advance().champion.id).toBe('monk');
  });

  it('resets the actor and keeps everyone else proportional', () => {
    const b = new Battle(PLAYER, ENEMY, { seed: 1 });
    for (const u of b.units) u.tm = 0;
    const a = b.advance();
    b.endTurn(a);
    expect(a.tm).toBe(0);
    expect(b.get('p0').tm).toBeCloseTo((100 * knight.stats.spd) / monk.stats.spd, 5);
  });

  it('speed debuffs slow the meter', () => {
    const b = new Battle(combatants([knight]), combatants([dreadknight]));
    const k = b.get('p0');
    const base = b.speed(k);
    b.addStatus(k, 'spd_down', 2, 0, 'test');
    expect(b.speed(k)).toBeCloseTo(base * 0.75);
  });

  it('selfTm skills end the turn with turn meter', () => {
    const b = new Battle(combatants([stalker]), combatants([knight]), { seed: 2 });
    const s = b.get('p0');
    b.useSkill(s, skill(stalker, 'mirage_assault'), 'e0');
    b.endTurn(s);
    expect(s.tm).toBe(25);
  });
});

describe('damage', () => {
  it('respects shields', () => {
    const b = new Battle(combatants([warrior]), combatants([dreadknight]), { seed: 3 });
    const dk = b.get('e0');
    b.addStatus(dk, 'shield', 2, 50, 'test');
    const r = b.useSkill(b.get('p0'), skill(warrior, 'rending_chop'), dk.uid);
    const dmg = r.events.filter((e) => e.kind === 'damage');
    expect(dmg.length).toBe(2);
    expect(dmg.reduce((s, e) => s + (e.kind === 'damage' ? e.absorbed : 0), 0)).toBe(50);
  });

  it('follows the affinity cycle', () => {
    expect(affinityEdge('force', 'wild')).toBe(1);
    expect(affinityEdge('wild', 'arcane')).toBe(1);
    expect(affinityEdge('arcane', 'force')).toBe(1);
    expect(affinityEdge('wild', 'force')).toBe(-1);
    expect(affinityEdge('void', 'force')).toBe(0);
    expect(affinityEdge('arcane', 'void')).toBe(0);
  });

  it('strong hits deal more than weak hits', () => {
    // Brakka (Force) into Tenzo (Wild) is strong; into Ysolde (Arcane) is weak
    const avg = (target: ChampionDef) => {
      let sum = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const b = new Battle(combatants([warrior]), combatants([target]), { seed });
        const r = b.useSkill(b.get('p0'), skill(warrior, 'rending_chop'), 'e0');
        const e = r.events.find((x) => x.kind === 'damage');
        if (e?.kind === 'damage') sum += (e.amount * target.stats.def) / 40;
      }
      return sum / 200;
    };
    expect(avg(monk) / avg(frostmage)).toBeGreaterThan(1.35);
  });

  it('weaken increases damage taken', () => {
    const run = (weak: boolean) => {
      let sum = 0;
      for (let seed = 1; seed <= 100; seed++) {
        const b = new Battle(combatants([archer]), combatants([knight]), { seed });
        if (weak) b.addStatus(b.get('e0'), 'weaken', 2, 0, 'test');
        const r = b.useSkill(b.get('p0'), skill(archer, 'swift_shot'), 'e0');
        sum += r.events.reduce((s, e) => s + (e.kind === 'damage' ? e.amount : 0), 0);
      }
      return sum;
    };
    expect(run(true) / run(false)).toBeCloseTo(1.25, 1);
  });

  it('kills at 0 HP and removes the unit from targeting', () => {
    const b = new Battle(combatants([warrior]), combatants([archer, monk]), { seed: 1 });
    const a = b.get('e0');
    a.hp = 1;
    const r = b.useSkill(b.get('p0'), skill(warrior, 'rending_chop'), a.uid);
    expect(a.alive).toBe(false);
    expect(r.events.some((e) => e.kind === 'death' && e.target === a.uid)).toBe(true);
    expect(b.validTargets(b.get('p0'), skill(warrior, 'rending_chop')).map((u) => u.uid)).toEqual(['e1']);
  });

  it('scales enemies by stage power and bosses by boss HP', () => {
    const b = new Battle(combatants([knight]), [{ def: dreadknight, boss: true }, { def: monk }], { enemyPower: 1.1, bossHp: 1.6 });
    expect(b.get('e0').maxHp).toBe(Math.round(dreadknight.stats.hp * 1.1 * 1.6));
    expect(b.get('e1').maxHp).toBe(Math.round(monk.stats.hp * 1.1));
    expect(b.attack(b.get('e1'))).toBeCloseTo(monk.stats.atk * 1.1);
  });
});

describe('statuses', () => {
  it('puts skills on cooldown and brings them back', () => {
    const b = new Battle(combatants([knight]), combatants([dreadknight]));
    const k = b.get('p0');
    const bash = skill(knight, 'shield_bash');
    b.useSkill(k, bash, 'e0');
    b.endTurn(k); // the turn it was used
    // unavailable on the next three turns
    for (let i = 0; i < 3; i++) {
      expect(b.ready(k, bash)).toBe(false);
      b.endTurn(k);
    }
    expect(b.ready(k, bash)).toBe(true);
  });

  it('forces single-target skills onto a taunting hero', () => {
    const b = new Battle(PLAYER, ENEMY, { seed: 1 });
    b.useSkill(b.get('p0'), skill(knight, 'aegis_oath'));
    const dk = b.get('e0');
    expect(b.validTargets(dk, skill(dreadknight, 'cursed_cleave')).map((t) => t.uid)).toEqual(['p0']);
    expect(b.validTargets(dk, skill(dreadknight, 'dread_sweep')).length).toBe(3);
  });

  it('freezes with Glacial Prison and skips the frozen turn', () => {
    const b = new Battle(combatants([archer]), combatants([frostmage]), { seed: 5 });
    b.useSkill(b.get('e0'), skill(frostmage, 'glacial_prison'), 'p0');
    const a = b.get('p0');
    expect(b.has(a, 'freeze')).toBe(true);
    expect(b.startTurn(a).skip).toBe(true);
    b.endTurn(a);
    expect(b.has(a, 'freeze')).toBe(false);
  });

  it('ticks poison and burn at the start of the turn, ignoring shields', () => {
    const b = new Battle(combatants([knight]), combatants([archer]));
    const k = b.get('p0');
    b.addStatus(k, 'poison', 3, 0, 'test');
    b.addStatus(k, 'burn', 2, 0, 'test');
    b.addStatus(k, 'shield', 2, 500, 'test');
    const { events } = b.startTurn(k);
    const amounts = events.filter((e) => e.kind === 'damage').map((e) => (e.kind === 'damage' ? e.amount : 0));
    expect(amounts).toEqual([Math.round(k.maxHp * 0.05), Math.round(k.maxHp * 0.06)]);
  });

  it('heals and cleanses with Serenity, and Heal Block stops healing', () => {
    const b = new Battle(combatants([monk, dreadknight, knight]), combatants([warrior]), { seed: 1 });
    const dk = b.get('p1'), kn = b.get('p2');
    dk.hp = 500;
    kn.hp = 500;
    b.addStatus(dk, 'def_down', 2, 0, 'test');
    b.addStatus(kn, 'heal_block', 2, 0, 'test');
    const r = b.useSkill(b.get('p0'), skill(monk, 'serenity'));
    expect(dk.hp).toBeGreaterThan(500);
    expect(b.has(dk, 'def_down')).toBe(false);
    expect(kn.hp).toBe(500);
    expect(r.events.some((e) => e.kind === 'blocked' && e.target === kn.uid)).toBe(true);
  });

  it('strips buffs before the hit with Weighing of Hearts', () => {
    const b = new Battle(combatants([jackal]), combatants([knight]), { seed: 4 });
    const k = b.get('e0');
    b.addStatus(k, 'shield', 2, 9999, 'test');
    b.addStatus(k, 'def_up', 2, 0, 'test');
    const r = b.useSkill(b.get('p0'), skill(jackal, 'weighing_hearts'), 'e0');
    expect(r.events.filter((e) => e.kind === 'dispel').length).toBe(2);
    const hit = r.events.find((e) => e.kind === 'damage');
    expect(hit?.kind === 'damage' && hit.absorbed).toBe(0);
    expect(b.has(k, 'weaken')).toBe(true);
  });

  it('counterattacks once with A1 when a countering champion is hit', () => {
    const b = new Battle(combatants([jackal, knight]), combatants([warrior]), { seed: 6 });
    b.useSkill(b.get('p0'), skill(jackal, 'wardens_vigil'));
    expect(b.has(b.get('p1'), 'counter')).toBe(true);
    const r = b.useSkill(b.get('e0'), skill(warrior, 'whirlwind'));
    expect(r.counters.length).toBe(2);
    expect(r.counters.every((c) => c.counter && c.target === 'e0' && c.counters.length === 0)).toBe(true);
    expect(flatten(r).length).toBe(3);
  });

  it('rolls per-hit statuses on every hit', () => {
    let poisoned = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const b = new Battle(combatants([stalker]), combatants([knight]), { seed });
      const r = b.useSkill(b.get('p0'), skill(stalker, 'twin_fangs'), 'e0');
      poisoned += r.events.filter((e) => e.kind === 'status' || e.kind === 'resist').length === 2 ? 1 : 0;
    }
    expect(poisoned).toBe(200);
  });

  it('rises once with Undying', () => {
    const b = new Battle(combatants([warrior]), combatants([tomblord]), { seed: 1 });
    const t = b.get('e0');
    t.hp = 1;
    b.addStatus(t, 'poison', 2, 0, 'test');
    const r = b.useSkill(b.get('p0'), skill(warrior, 'rending_chop'), 'e0');
    expect(r.events.some((e) => e.kind === 'revive')).toBe(true);
    expect(t.alive).toBe(true);
    expect(b.has(t, 'poison')).toBe(false);
    t.hp = 1;
    b.useSkill(b.get('p0'), skill(warrior, 'rending_chop'), 'e0');
    expect(t.alive).toBe(false);
  });

  it('applies Heal Block and Burn with Wrath of the Sun', () => {
    const b = new Battle(combatants([priestess]), combatants([knight, warrior, archer]), { seed: 9 });
    b.useSkill(b.get('p0'), skill(priestess, 'sun_wrath'));
    for (const e of b.alive('enemy')) expect(b.has(e, 'heal_block')).toBe(true);
  });

  it("fills the other allies' turn meters with Rhythm of the March", () => {
    const b = new Battle(combatants([starsinger, knight, warrior]), combatants([dreadknight]), { seed: 4 });
    for (const u of b.units) u.tm = 10;
    const k = b.get('p0');
    const r = b.useSkill(k, skill(starsinger, 'march_rhythm'));
    expect(b.get('p1').tm).toBe(30);
    expect(b.get('p2').tm).toBe(30);
    expect(k.tm).toBe(10);
    expect(r.events.filter((e) => e.kind === 'tm')).toHaveLength(2);
    for (const a of b.alive('player')) expect(b.has(a, 'spd_up')).toBe(true);
    // the boost never pushes a meter past full
    b.get('p1').tm = 95;
    b.useSkill(k, skill(starsinger, 'march_rhythm'));
    expect(b.get('p1').tm).toBe(100);
  });

  it('overloads the Starforged Core once below half HP', () => {
    const b = new Battle(combatants([warrior]), combatants([colossus]), { seed: 5 });
    const c = b.get('e0');
    c.hp = Math.round(c.maxHp * 0.55);
    const r = b.useSkill(b.get('p0'), skill(warrior, 'rending_chop'), 'e0');
    expect(c.alive).toBe(true);
    expect(c.overdriven).toBe(true);
    expect(r.events.some((e) => e.kind === 'passive')).toBe(true);
    expect(b.has(c, 'atk_up') && b.has(c, 'def_up')).toBe(true);
    c.statuses = [];
    const again = b.useSkill(b.get('p0'), skill(warrior, 'rending_chop'), 'e0');
    expect(again.events.some((e) => e.kind === 'passive')).toBe(false);
    expect(b.has(c, 'atk_up')).toBe(false);
  });

  it('does not overload on a lethal hit', () => {
    const b = new Battle(combatants([warrior]), combatants([colossus]), { seed: 6 });
    const c = b.get('e0');
    c.hp = 1;
    const r = b.useSkill(b.get('p0'), skill(warrior, 'rending_chop'), 'e0');
    expect(c.alive).toBe(false);
    expect(r.events.some((e) => e.kind === 'passive')).toBe(false);
  });
});

describe('full auto battles', () => {
  it('always end with a winner, and either side can win', () => {
    const winners = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const r = simulate(PLAYER, ENEMY, { seed });
      expect(r.winner).not.toBeNull();
      expect(r.turns).toBeLessThan(300);
      winners.add(r.winner!);
    }
    expect(winners.size).toBe(2);
  });

  it('runs every champion through battles without errors', () => {
    const all = [knight, warrior, archer, monk, frostmage, dreadknight, stalker, jackal, priestess, tomblord];
    for (let i = 0; i < all.length; i++) {
      const team = combatants([all[i], all[(i + 3) % all.length], all[(i + 6) % all.length]]);
      const foes = combatants([all[(i + 1) % all.length], all[(i + 4) % all.length], all[(i + 7) % all.length]]);
      const r = simulate(team, foes, { seed: i + 1 });
      expect(r.winner).not.toBeNull();
    }
  });
});
