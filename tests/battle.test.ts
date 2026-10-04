import { describe, expect, it } from 'vitest';
import { decide } from '../src/game/battle/ai';
import { Battle } from '../src/game/battle/battle';
import { ARCHER, DREADKNIGHT, ENEMY_TEAM, FROSTMAGE, KNIGHT, MONK, PLAYER_TEAM, WARRIOR } from '../src/game/data/heroes';

const skill = (h: { skills: { id: string }[] }, id: string) => h.skills.find((s) => s.id === id) as never;

describe('turn meter', () => {
  it('lets the fastest unit act first when meters are equal', () => {
    const b = new Battle(PLAYER_TEAM, ENEMY_TEAM, 1);
    for (const u of b.units) u.tm = 0;
    expect(b.advance().hero.id).toBe(MONK.id); // SPD 116
  });

  it('resets the actor and keeps everyone else proportional', () => {
    const b = new Battle(PLAYER_TEAM, ENEMY_TEAM, 1);
    for (const u of b.units) u.tm = 0;
    const a = b.advance();
    b.endTurn(a);
    expect(a.tm).toBe(0);
    const knight = b.units.find((u) => u.hero.id === KNIGHT.id)!;
    expect(knight.tm).toBeCloseTo((100 * KNIGHT.stats.spd) / MONK.stats.spd, 5);
  });

  it('speed debuffs slow the meter', () => {
    const b = new Battle([KNIGHT], [DREADKNIGHT], 1);
    const k = b.get('p0');
    const base = b.speed(k);
    b.addStatus(k, 'spd_down', 2, 0, 'test');
    expect(b.speed(k)).toBeCloseTo(base * 0.75);
  });
});

describe('skills', () => {
  it('deals damage and respects shields', () => {
    const b = new Battle([WARRIOR], [DREADKNIGHT], 3);
    const w = b.get('p0'), dk = b.get('e0');
    b.addStatus(dk, 'shield', 2, 50, 'test');
    const r = b.useSkill(w, skill(WARRIOR, 'rending_chop'), dk.uid);
    const dmg = r.events.filter((e) => e.kind === 'damage');
    expect(dmg.length).toBe(2);
    const absorbed = dmg.reduce((s, e) => s + (e.kind === 'damage' ? e.absorbed : 0), 0);
    expect(absorbed).toBe(50);
    expect(dk.hp).toBeLessThan(dk.maxHp);
  });

  it('puts skills on cooldown and brings them back', () => {
    const b = new Battle([KNIGHT], [DREADKNIGHT], 1);
    const k = b.get('p0');
    const bash = skill(KNIGHT, 'shield_bash');
    b.useSkill(k, bash, 'e0');
    expect(b.ready(k, bash)).toBe(false);
    for (let i = 0; i < 3; i++) {
      b.endTurn(k);
      expect(b.ready(k, bash)).toBe(i === 3);
    }
    b.endTurn(k);
    expect(b.ready(k, bash)).toBe(true);
  });

  it('forces single-target skills onto a taunting hero', () => {
    const b = new Battle(PLAYER_TEAM, ENEMY_TEAM, 1);
    const dk = b.get('e0');
    b.useSkill(b.get('p0'), skill(KNIGHT, 'aegis_oath'));
    const targets = b.validTargets(dk, skill(DREADKNIGHT, 'cursed_cleave'));
    expect(targets.map((t) => t.uid)).toEqual(['p0']);
    // AoE is not restricted
    expect(b.validTargets(dk, skill(DREADKNIGHT, 'dread_sweep')).length).toBe(3);
  });

  it('shields every ally with Aegis Oath', () => {
    const b = new Battle(PLAYER_TEAM, ENEMY_TEAM, 1);
    b.useSkill(b.get('p0'), skill(KNIGHT, 'aegis_oath'));
    for (const u of b.alive('player')) {
      expect(b.has(u, 'shield')).toBe(true);
      expect(b.has(u, 'def_up')).toBe(true);
    }
    expect(b.has(b.get('p0'), 'taunt')).toBe(true);
  });

  it('freezes with Glacial Prison and skips the frozen turn', () => {
    const b = new Battle([ARCHER], [FROSTMAGE], 5);
    b.useSkill(b.get('e0'), skill(FROSTMAGE, 'glacial_prison'), 'p0');
    const a = b.get('p0');
    expect(b.has(a, 'freeze')).toBe(true);
    expect(b.startTurn(a).skip).toBe(true);
    b.endTurn(a);
    expect(b.has(a, 'freeze')).toBe(false);
  });

  it('ticks poison at the start of the turn', () => {
    const b = new Battle([KNIGHT], [ARCHER], 1);
    const k = b.get('p0');
    b.addStatus(k, 'poison', 3, 0, 'test');
    const { events } = b.startTurn(k);
    expect(events[0]).toMatchObject({ kind: 'damage', amount: Math.round(k.maxHp * 0.05) });
  });

  it('heals and cleanses with Serenity', () => {
    const b = new Battle([MONK, DREADKNIGHT], [WARRIOR], 1);
    const dk = b.get('p1');
    dk.hp = 500;
    b.addStatus(dk, 'def_down', 2, 0, 'test');
    const r = b.useSkill(b.get('p0'), skill(MONK, 'serenity'));
    expect(dk.hp).toBeGreaterThan(500);
    expect(b.has(dk, 'def_down')).toBe(false);
    expect(r.events.some((e) => e.kind === 'cleanse')).toBe(true);
    expect(b.has(dk, 'regen')).toBe(true);
  });

  it('kills at 0 HP and removes the unit from targeting', () => {
    const b = new Battle([WARRIOR], [ARCHER, MONK], 1);
    const a = b.get('e0');
    a.hp = 1;
    const r = b.useSkill(b.get('p0'), skill(WARRIOR, 'rending_chop'), a.uid);
    expect(a.alive).toBe(false);
    expect(r.events.some((e) => e.kind === 'death' && e.target === a.uid)).toBe(true);
    expect(b.validTargets(b.get('p0'), skill(WARRIOR, 'rending_chop')).map((u) => u.uid)).toEqual(['e1']);
  });
});

describe('full auto battles', () => {
  it('always ends with a winner in a reasonable number of turns', () => {
    const results: string[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const b = new Battle(PLAYER_TEAM, ENEMY_TEAM, seed);
      let guard = 0;
      while (!b.winner() && guard++ < 300) {
        const a = b.advance();
        const st = b.startTurn(a);
        if (a.alive && !st.skip && !b.winner()) {
          const d = decide(b, a);
          b.useSkill(a, d.skill, d.target);
        }
        b.endTurn(a);
      }
      expect(b.winner()).not.toBeNull();
      expect(guard).toBeLessThan(300);
      results.push(b.winner()!);
    }
    // both sides can win: the matchup is not one-sided
    expect(new Set(results).size).toBe(2);
  });
});
