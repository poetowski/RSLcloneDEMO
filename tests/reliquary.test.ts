// Rules of the Reliquary context: Thread Spools are values with a main stat and
// strands; the Weaver Matrix keeps six slots in two triangles that take only
// what their stat nodes accept; attunement and the SPD strand cap shape what a
// matrix adds; Weave Patterns count spools wherever they sit; the Reliquary
// never loses or copies a spool, also through a save (docs/DDD.md 6.5,
// docs/MECHANICS_GUIDE.md 14). Patterns and fixture layouts here are test
// fixtures, not content.
import { describe, expect, it } from 'vitest';
import { MAIN_VALUE, MATRIX_LAYOUT, SPD_STRAND_CAP, STAT_IDS, STRAND_COUNT, STRAND_RANGE } from '../src/game/data/matrix';
import { MatrixLayout, StatId, StatNode, WeavePatternDef } from '../src/game/data/types';
import {
  attunedStats, Grade, matrixBonus, rollSpool, sameSpool, SlotIndex, threadSpool, ThreadSpool, WeavePatternEvaluator, WeaverMatrix, wovenStats,
} from '../src/game/reliquary/matrix';
import { Reliquary, ReliquaryJson } from '../src/game/reliquary/reliquary';

const ANY: StatNode = { kind: 'variable', stats: STAT_IDS };
const OPEN: MatrixLayout = [ANY, ANY, ANY, ANY, ANY, ANY];
/** A layout with rules: three fixed nodes, then three variable ones. */
const MIXED: MatrixLayout = [
  { kind: 'fixed', stat: 'atk' },
  { kind: 'fixed', stat: 'def' },
  { kind: 'fixed', stat: 'hp' },
  { kind: 'variable', stats: ['spd', 'atk', 'def'] },
  { kind: 'variable', stats: ['crit', 'hp'] },
  ANY,
];
const CATALOG: WeavePatternDef[] = [
  { id: 'pair_a', name: 'Pair A', pieces: 2, desc: 'fixture' },
  { id: 'quad', name: 'Quad', pieces: 4, desc: 'fixture' },
  { id: 'pair_b', name: 'Pair B', pieces: 2, desc: 'fixture' },
];
const evaluator = new WeavePatternEvaluator(CATALOG);
const woven = (m: WeaverMatrix) => evaluator.evaluate(m).map((w) => `${w.pattern.id}x${w.times}`).join(',');

/** A valid spool with the lowest strands, in a fixed order, unless strands are given. */
function sp(pattern: string, stat: StatId, grade: Grade = 1, strands?: [StatId, number][]): ThreadSpool {
  const order: StatId[] = ['hp', 'atk', 'def', 'crit', 'spd'].filter((s) => s !== stat) as StatId[];
  const fill = order.slice(0, STRAND_COUNT[grade]).map((s): [StatId, number] => [s, s === 'spd' ? 1 : STRAND_RANGE[grade][0]]);
  return threadSpool(pattern, grade, stat, strands ?? fill);
}

/** Every ordering of the items, duplicates included. */
function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
}

function rngFor(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('thread spools', () => {
  it('are values: equal fields make the same spool, and nothing changes them', () => {
    const a = sp('pair_a', 'atk');
    expect(sameSpool(a, sp('pair_a', 'atk'))).toBe(true);
    expect(sameSpool(a, sp('pair_b', 'atk'))).toBe(false);
    expect(sameSpool(a, sp('pair_a', 'atk', 1, [['hp', 2], ['def', 1]]))).toBe(false);
    expect(sameSpool(a, sp('pair_a', 'atk', 2))).toBe(false);
    expect(Object.isFrozen(a) && Object.isFrozen(a.main) && Object.isFrozen(a.strands) && Object.isFrozen(a.strands[0])).toBe(true);
  });

  it('take their main value from the grade', () => {
    for (const s of STAT_IDS) for (const g of [0, 1, 2] as Grade[]) expect(sp('pair_a', s, g).main.value).toBe(MAIN_VALUE[s][g]);
  });

  it('carry one strand per grade step, never repeating a stat', () => {
    expect(sp('pair_a', 'atk', 0).strands).toHaveLength(1);
    expect(sp('pair_a', 'atk', 1).strands).toHaveLength(2);
    expect(sp('pair_a', 'atk', 2).strands).toHaveLength(3);
    expect(() => threadSpool('pair_a', 1, 'atk', [['hp', 1]])).toThrow(); // too few
    expect(() => threadSpool('pair_a', 0, 'atk', [['hp', 1], ['def', 1]])).toThrow(); // too many
    expect(() => threadSpool('pair_a', 1, 'atk', [['atk', 1], ['hp', 1]])).toThrow(); // repeats the main stat
    expect(() => threadSpool('pair_a', 1, 'atk', [['hp', 1], ['hp', 2]])).toThrow(); // repeats a strand
  });

  it('keep strands inside the grade range, and a SPD strand is always +1', () => {
    expect(() => threadSpool('pair_a', 0, 'atk', [['hp', 2]])).toThrow(); // Ashen rolls +1 only
    expect(() => threadSpool('pair_a', 1, 'atk', [['hp', 3], ['def', 1]])).toThrow(); // Silver +1 to 2
    expect(() => threadSpool('pair_a', 2, 'atk', [['hp', 3], ['def', 0], ['crit', 1]])).toThrow();
    expect(() => threadSpool('pair_a', 2, 'atk', [['hp', 1.5], ['def', 1], ['crit', 1]])).toThrow();
    expect(() => threadSpool('pair_a', 2, 'atk', [['spd', 2], ['def', 1], ['crit', 1]])).toThrow();
    expect(threadSpool('pair_a', 2, 'atk', [['spd', 1], ['def', 3], ['crit', 1]]).strands).toHaveLength(3);
  });

  it('refuse an empty pattern, an unknown grade or an unknown stat', () => {
    expect(() => sp('', 'atk')).toThrow();
    expect(() => threadSpool('pair_a', 3 as Grade, 'atk', [])).toThrow();
    expect(() => threadSpool('pair_a', 0, 'luck' as never, [['hp', 1]])).toThrow();
    expect(() => threadSpool('pair_a', 0, 'atk', [['luck' as never, 1]])).toThrow();
  });

  it('always roll within the rules', () => {
    const r = rngFor(3);
    for (let i = 0; i < 3000; i++) {
      const g = (i % 3) as Grade;
      const stat = STAT_IDS[i % STAT_IDS.length];
      const s = rollSpool('pair_a', g, stat, r);
      expect(s.strands).toHaveLength(STRAND_COUNT[g]);
      expect(new Set([stat, ...s.strands.map((t) => t.stat)]).size).toBe(STRAND_COUNT[g] + 1);
    }
  });
});

describe('weaver matrix', () => {
  it('has two triangles: ATK, DEF and HP fixed, SPD only in slot 2 and CRIT only in slot 4', () => {
    expect(MATRIX_LAYOUT.map((n) => (n.kind === 'fixed' ? n.stat : 'choice'))).toEqual(['atk', 'choice', 'def', 'choice', 'hp', 'choice']);
    const takes = (s: StatId) => MATRIX_LAYOUT.flatMap((n, i) => ((n.kind === 'fixed' ? n.stat === s : n.stats.includes(s)) ? [i] : []));
    expect(takes('spd')).toEqual([1]);
    expect(takes('crit')).toEqual([3]);
  });

  it('has six slots that take only what their stat nodes accept', () => {
    const m = WeaverMatrix.empty(MIXED);
    expect(m.slots.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(m.spools()).toEqual([]);
    expect(() => m.equip(0, sp('pair_a', 'hp'))).toThrow(); // fixed: atk only
    expect(() => m.equip(4, sp('pair_a', 'atk'))).toThrow(); // variable: crit or hp
    expect(m.equip(4, sp('pair_a', 'crit')).matrix.spools()).toHaveLength(1);
    expect(m.equip(5, sp('pair_a', 'spd')).matrix.spools()).toHaveLength(1);
  });

  it('returns a new matrix on every change, with the spool it displaced', () => {
    const empty = WeaverMatrix.empty(MIXED);
    const a = sp('pair_a', 'atk');
    const b = sp('pair_b', 'atk');
    const one = empty.equip(0, a);
    expect(empty.slots[0].spool).toBeNull();
    expect(one.removed).toBeNull();
    expect(one.matrix.slots[0].spool).toBe(a);
    const two = one.matrix.equip(0, b);
    expect(two.removed).toBe(a);
    expect(two.matrix.slots[0].spool).toBe(b);
    const out = two.matrix.unequip(0);
    expect(out.removed).toBe(b);
    expect(out.matrix.spools()).toEqual([]);
    expect(Object.isFrozen(empty.slots) && Object.isFrozen(empty.slots[0])).toBe(true);
  });

  it('attunes each choice slot to the fixed stats beside it', () => {
    const m = WeaverMatrix.empty(MATRIX_LAYOUT);
    expect([0, 1, 2, 3, 4, 5].map((i) => attunedStats(m, i as SlotIndex))).toEqual([[], ['atk', 'def'], [], ['def', 'hp'], [], ['hp', 'atk']]);
  });

  it('adds main stats, strands and attunement', () => {
    let m = WeaverMatrix.empty(MATRIX_LAYOUT);
    m = m.equip(0, sp('pair_a', 'atk', 2, [['hp', 3], ['def', 2], ['crit', 1]])).matrix; // fixed: no attunement
    m = m.equip(1, sp('pair_a', 'hp', 1, [['atk', 2], ['crit', 1]])).matrix; // ATK strand attuned in slot 2
    const b = matrixBonus(m);
    expect(b).toEqual({ atk: 10 + 2 + 1, hp: 3 + 7, def: 2, crit: 1 + 1, spd: 0 });
  });

  it('caps what SPD strands add at the matrix cap', () => {
    let m = WeaverMatrix.empty(OPEN);
    for (let i = 0; i < 6; i++) m = m.equip(i as SlotIndex, sp('pair_a', 'atk', 1, [['spd', 1], ['hp', 1]])).matrix;
    expect(matrixBonus(m).spd).toBe(SPD_STRAND_CAP);
  });

  it('turns a matrix into stats: percent of base for ATK, HP and DEF, points for CRIT, flat SPD', () => {
    let m = WeaverMatrix.empty(MATRIX_LAYOUT);
    m = m.equip(0, sp('pair_a', 'atk', 2, [['hp', 3], ['def', 2], ['crit', 1]])).matrix;
    m = m.equip(1, sp('pair_a', 'spd', 0, [['def', 1]])).matrix; // DEF strand attuned: +2
    const w = wovenStats({ hp: 1000, atk: 100, def: 60, spd: 100, crit: 0.05 }, m);
    expect(w).toEqual({ hp: 1030, atk: 110, def: 62, spd: 102, crit: 0.06 });
  });
});

describe('weave patterns', () => {
  const cases: [string[], string][] = [
    [['pair_a', 'pair_a'], 'pair_ax1'],
    [['pair_a', 'pair_a', 'pair_a'], 'pair_ax1'],
    [['pair_a', 'pair_a', 'pair_a', 'pair_a', 'pair_a', 'pair_a'], 'pair_ax3'],
    [['quad', 'quad', 'quad'], ''],
    [['quad', 'quad', 'quad', 'quad'], 'quadx1'],
    [['quad', 'quad', 'quad', 'quad', 'quad', 'quad'], 'quadx1'],
    [['quad', 'quad', 'quad', 'quad', 'pair_b', 'pair_b'], 'quadx1,pair_bx1'],
    [['pair_a', 'pair_a', 'pair_b', 'pair_b', 'quad', 'quad'], 'pair_ax1,pair_bx1'],
    [['pair_b', 'pair_a'], ''],
  ];

  it.each(cases)('%j weave "%s" in every arrangement over the six slots', (ids, want) => {
    const seen = new Set<string>();
    for (const order of permutations([...ids, ...Array<string>(6 - ids.length).fill('')])) {
      let m = WeaverMatrix.empty(OPEN);
      order.forEach((id, i) => {
        if (id) m = m.equip(i as SlotIndex, sp(id, 'spd')).matrix;
      });
      seen.add(woven(m));
    }
    expect([...seen]).toEqual([want]);
  });

  it('fail fast on a pattern the catalog does not have', () => {
    const m = WeaverMatrix.empty(OPEN).equip(0, sp('nope', 'spd')).matrix;
    expect(() => evaluator.evaluate(m)).toThrow(/nope/);
  });
});

describe('reliquary', () => {
  const spools = [
    sp('pair_a', 'atk'),
    sp('pair_a', 'atk'),
    sp('pair_b', 'spd'),
    sp('quad', 'crit'),
    sp('quad', 'hp'),
    sp('pair_b', 'def'),
  ];
  const stocked = () => {
    const r = new Reliquary(MIXED);
    r.recruit('alpha');
    r.recruit('beta');
    for (const s of spools) r.addSpool(s);
    return r;
  };
  const count = (r: Reliquary) => r.spools().length + r.files().reduce((n, f) => n + f.matrix.spools().length, 0);

  it('recruits a champion once, with an empty matrix and the NEW badge until seen', () => {
    const r = new Reliquary(MIXED);
    const f = r.recruit('alpha');
    expect(f.fresh).toBe(true);
    expect(f.matrix.spools()).toEqual([]);
    expect(r.recruit('alpha')).toBe(f);
    expect(r.markSeen('alpha')).toBe(true);
    expect(r.markSeen('alpha')).toBe(false);
    expect(r.file('alpha').fresh).toBe(false);
    expect(r.recruit('beta', false).fresh).toBe(false);
    expect(() => r.file('nobody')).toThrow();
  });

  it('moves spools between the stock and the slots without losing or copying one', () => {
    const r = stocked();
    expect(() => r.equip('alpha', 0, sp('pair_a', 'atk', 2))).toThrow(); // not in the stock
    let seed = 7;
    const rnd = (n: number) => (seed = (seed * 48271) % 2147483647) % n;
    let moves = 0;
    for (let step = 0; step < 2000; step++) {
      const who = rnd(2) ? 'alpha' : 'beta';
      const slot = rnd(6) as SlotIndex;
      if (rnd(3) === 0) r.unequip(who, slot);
      else if (r.spools().length) {
        try {
          r.equip(who, slot, r.spools()[rnd(r.spools().length)]);
          moves++;
        } catch {
          // the slot does not take that spool: nothing may change
        }
      }
      expect(count(r)).toBe(spools.length);
    }
    expect(moves).toBeGreaterThan(100);
  });

  it('restores a save, and a spool its slot no longer takes goes back to the stock', () => {
    const r = stocked();
    r.equip('alpha', 0, spools[0]);
    r.equip('alpha', 3, spools[2]);
    r.equip('beta', 4, spools[3]);
    const json = JSON.parse(JSON.stringify(r.toJSON())) as ReliquaryJson;
    expect(Reliquary.fromJSON(json, MIXED).toJSON()).toEqual(r.toJSON());
    // a stricter layout: slot 3 takes only def now, slot 4 only hp
    const strict: MatrixLayout = [MIXED[0], MIXED[1], MIXED[2], { kind: 'fixed', stat: 'def' }, { kind: 'fixed', stat: 'hp' }, ANY];
    const moved = Reliquary.fromJSON(json, strict);
    expect(moved.file('alpha').matrix.slots[0].spool).toEqual(spools[0]);
    expect(moved.file('alpha').matrix.slots[3].spool).toBeNull();
    expect(moved.file('beta').matrix.slots[4].spool).toBeNull();
    expect(count(moved)).toBe(spools.length);
  });

  it('drops malformed entries without losing a valid spool, and never trusts a stored main value', () => {
    const good = { pattern: 'pair_a', grade: 1, main: { stat: 'atk', value: 99 }, strands: [{ stat: 'hp', value: 1 }, { stat: 'def', value: 2 }] };
    const saved = {
      files: [
        { champion: 'alpha', fresh: false, slots: [good, { ...good, strands: [{ stat: 'atk', value: 1 }, { stat: 'hp', value: 1 }] }, null] },
        { champion: 'alpha', fresh: true, slots: [good] },
        { champion: 7 },
      ],
      stock: [good, 'junk', { ...good, grade: 5 }, { ...good, strands: [{ stat: 'hp', value: 1 }] }],
    } as unknown as ReliquaryJson;
    const r = Reliquary.fromJSON(saved, MIXED);
    expect(r.files().map((f) => f.champion)).toEqual(['alpha']);
    expect(r.file('alpha').fresh).toBe(false);
    expect(r.file('alpha').matrix.spools()).toHaveLength(1);
    expect(r.file('alpha').matrix.slots[0].spool!.main.value).toBe(MAIN_VALUE.atk[1]);
    // the stocked spool, and the one from the duplicated file
    expect(r.spools()).toHaveLength(2);
  });

  it('drops the soul files of champions the catalog no longer has, keeping their spools', () => {
    const r = stocked();
    r.equip('beta', 0, spools[0]);
    r.keepOnly((id) => id === 'alpha');
    expect(r.has('beta')).toBe(false);
    expect(count(r)).toBe(spools.length);
  });
});
