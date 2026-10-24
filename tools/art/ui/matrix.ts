// Weaver Matrix art (approved 2026-10-10): the matrix rose with its two
// triangles, the slot rings, and the spool icons: crystal capsules holding a
// spiral thread of light, the cap metal showing the grade and the thread's
// colour its pattern. Weaving (2026-10-24) adds the large spools of its cards
// and panel, the card frames of the three grades, the small roses that light
// the slots a spool fits, and its menu glyph. Same rules as the rest of the
// interface art: light from the top-left, 1px dark outlines, ramps from
// palette.ts. Used by the MATRIX tab (src/game/screens/champion.ts) and Weaving
// (src/game/screens/weaving.ts); layout in docs/UI_GUIDE.md.
import { PATTERN_IDS } from '../../../src/game/data/matrix.ts';
import { FXR, MAT, UIR } from '../palette.ts';
import { dith, ellipseFill, outline, rampDither } from '../paint.ts';
import { Bitmap, RGBA } from '../raster.ts';
import { v, V } from '../rig.ts';
import { arc, cardFrame, castMetal, Stroke } from './menu.ts';

/**
 * The thread colour of each core Weave Pattern (src/game/data/matrix.ts), one
 * hue each: Pulse orange-gold, Sunder red, Ward steel blue, Vigor green,
 * Needle gold, Apex magenta, Focus violet, Tranquility turquoise.
 */
const THREAD: Record<string, RGBA[]> = {
  pattern_pulse: FXR.chi,
  pattern_sunder: FXR.blood,
  pattern_ward: FXR.steel,
  pattern_vigor: FXR.green,
  pattern_needle: FXR.gold,
  pattern_apex: FXR.magenta,
  pattern_focus: FXR.violet,
  pattern_tranquility: FXR.turquoise,
};
/** cap metal by grade: ebony (Ashen), silver, gold (Gilded) */
const METAL: RGBA[][] = [MAT.ebony.ramp.slice(1), MAT.silver.ramp.slice(1), UIR.gold];
const G = UIR.gold;

/** An 18x18 spool: a pointed cap, a crystal holding the thread's spiral, a pointed foot. */
export function spool(p: string, grade: number): Bitmap {
  const b = new Bitmap(18, 18);
  const M = METAL[grade];
  const T = THREAD[p];
  const cap: [number, number][] = [[8, 9], [7, 10], [5, 12], [4, 13]];
  const lit = (x: number, y: number, y0: number, y1: number) => rampDither(M, 3.1 - ((x - 4) / 9) * 1.4 - ((y - y0) / Math.max(1, y1 - y0)) * 0.8, x, y);
  cap.forEach(([x0, x1], i) => {
    for (let x = x0; x <= x1; x++) b.set(x, 1 + i, lit(x, 1 + i, 1, 4));
    for (let x = x0; x <= x1; x++) b.set(x, 16 - i, lit(x, 16 - i, 13, 16) === M[4] ? M[3] : lit(x, 16 - i, 13, 16));
  });
  for (let y = 5; y <= 12; y++) for (let x = 5; x <= 12; x++) {
    const edge = x === 5 || x === 12;
    b.set(x, y, edge ? T[0] : dith(x, y, 0.5) ? T[1] : T[0]);
  }
  for (let y = 5; y <= 12; y++) {
    const ph = ((y - 5) / 8) * Math.PI * 2;
    const xn = Math.round(8.5 + Math.sin(ph) * 2.6);
    const xf = Math.round(8.5 - Math.sin(ph) * 2.6);
    b.set(Math.max(6, Math.min(11, xf)), y, T[2]);
    b.set(Math.max(6, Math.min(11, xn)), y, Math.cos(ph) > 0 ? T[4] : T[3]);
  }
  b.set(6, 6, UIR.navy[4]);
  b.set(6, 7, UIR.navy[3]);
  return outline(b, UIR.ink[0]);
}

const ARC = UIR.arcane;

/** A thread of arcane light from p to q: a bright core and a dithered halo. */
function lightLine(b: Bitmap, p: V, q: V) {
  const n = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) * 2);
  const nx = -(q.y - p.y), ny = q.x - p.x, nl = Math.hypot(nx, ny) || 1;
  for (let i = 0; i <= n; i++) {
    const x = p.x + ((q.x - p.x) * i) / n, y = p.y + ((q.y - p.y) * i) / n;
    for (const off of [-1.6, 1.6]) {
      const hx = Math.floor(x + (nx / nl) * off), hy = Math.floor(y + (ny / nl) * off);
      if (dith(hx, hy, 0.5) && !(b.get(hx, hy) & 255)) b.set(hx, hy, ARC[1]);
    }
  }
  for (let i = 0; i <= n; i++) {
    const x = Math.floor(p.x + ((q.x - p.x) * i) / n), y = Math.floor(p.y + ((q.y - p.y) * i) / n);
    b.set(x, y, i % 6 < 4 ? ARC[3] : ARC[4]);
  }
}

/**
 * The matrix rose: an outer ring, the two triangles (the fixed slots 1, 3, 5
 * joined by gold rods; the choice slots 2, 4, 6 by a thread of arcane light),
 * six slot wells (gold rims fixed, arcane rims choice) and a centre well.
 */
export const ROSE = { size: 144, ring: 68, lobeAt: 42, lobe: 18 };
export function matrixRose(): Bitmap {
  const { size, ring, lobeAt, lobe } = ROSE;
  const c = size / 2;
  const at = (i: number) => {
    const a = ((i * 60 - 90) * Math.PI) / 180;
    return v(c + Math.cos(a) * lobeAt, c + Math.sin(a) * lobeAt);
  };
  const b = new Bitmap(size, size);
  // the choice triangle: light
  for (const [i, j] of [[1, 3], [3, 5], [5, 1]]) lightLine(b, at(i), at(j));
  // the fixed triangle: gold rods
  b.blit(castMetal(size, size, [[0, 2], [2, 4], [4, 0]].map(([i, j]) => ({ pts: [at(i), at(j)], r: 1.1 })), c - ring, c + ring, UIR.gold, MAT.gold.ramp), 0, 0);
  // wells over the lines
  const well = (x0: number, y0: number, r: number) => {
    for (let y = Math.floor(y0 - r); y <= Math.ceil(y0 + r); y++) for (let x = Math.floor(x0 - r); x <= Math.ceil(x0 + r); x++) {
      const d = Math.hypot(x + 0.5 - x0, y + 0.5 - y0);
      if (d <= r) b.set(x, y, rampDither(UIR.fill, 1.4 + (d / r) * 1.2 - ((x - x0 + y - y0) / r) * 0.3, x, y));
    }
  };
  for (let i = 0; i < 6; i++) well(at(i).x, at(i).y, lobe - 1);
  well(c, c, 8);
  // rims: the ring and the fixed slots in gold, the choice slots in arcane metal
  const gold: Stroke[] = [{ pts: arc(c, c, ring, ring, 0, 360, 72), r: 2.2 }, { pts: arc(c, c, 9, 9, 0, 360, 20), r: 1.3 }];
  for (const i of [0, 2, 4]) gold.push({ pts: arc(at(i).x, at(i).y, lobe, lobe, 0, 360, 32), r: 1.6 });
  const arcane: Stroke[] = [1, 3, 5].map((i) => ({ pts: arc(at(i).x, at(i).y, lobe, lobe, 0, 360, 32), r: 1.6 }));
  b.blit(castMetal(size, size, arcane, c - ring, c + ring, ARC, MAT.ice.ramp), 0, 0);
  b.blit(castMetal(size, size, gold, c - ring, c + ring, UIR.gold, MAT.gold.ramp), 0, 0);
  return b;
}

/** A ring around a slot: the chosen slot (bright gold) or an attuned neighbour (dotted gold). */
function ring(r0: number, r1: number, solid: boolean): Bitmap {
  const S = Math.ceil(r1 * 2 + 2), c = S / 2;
  const b = new Bitmap(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
    if (d > r0 && d <= r1) {
      if (solid) b.set(x, y, d < (r0 + r1) / 2 ? G[4] : dith(x, y, 0.5) ? G[3] : 0);
      else if ((Math.floor((Math.atan2(y - c, x - c) + Math.PI) / (Math.PI / 12)) % 2) === 0) b.set(x, y, G[3]);
    }
  }
  return b;
}

/**
 * A large spool (22x35): a finial, a domed cap over a studded rim, a crystal
 * holding two turns of its pattern's thread (the far turn dim behind the
 * glass, the near one bright), a rim and a foot. The cap metal shows the
 * grade, and so does the work on it: Ashen plain ebony, Silver an engraved
 * band and studs, Gilded studs, filigree and a jewel of the thread's colour
 * on the finial.
 */
export function bigSpool(p: string, grade: number): Bitmap {
  const b = new Bitmap(22, 35);
  const M = METAL[grade];
  const T = THREAD[p];
  const fine = grade > 0;
  // metal lit from the top-left; the foot sits a step darker, in the crystal's shadow
  const lit = (x: number, y: number, y0: number, y1: number, bias = 0) => rampDither(M, 3.3 + bias - ((x - 3) / 15) * 1.7 - ((y - y0) / Math.max(1, y1 - y0)) * 0.7, x, y);
  const row = (y: number, x0: number, x1: number, c: (x: number) => RGBA) => {
    for (let x = x0; x <= x1; x++) b.set(x, y, c(x));
  };
  // the cap: a dome from the finial out to the rim
  const cap: [number, number][] = [[7, 14], [5, 16], [4, 17], [3, 18], [3, 18]];
  cap.forEach(([x0, x1], i) => row(3 + i, x0, x1, (x) => lit(x, 3 + i, 3, 7)));
  // the foot, mirrored and darker
  const foot: [number, number][] = [[3, 18], [4, 17], [5, 16], [7, 14], [9, 12]];
  foot.forEach(([x0, x1], i) => row(28 + i, x0, x1, (x) => lit(x, 28 + i, 28, 32, -0.6)));
  row(33, 10, 11, (x) => lit(x, 33, 28, 33, -0.6));
  // rims over and under the crystal, studded on the finer grades
  for (const y of [8, 27]) {
    row(y, 2, 19, (x) => (x < 7 ? M[3] : x < 15 ? M[2] : M[1]));
    if (fine) for (const x of [4, 8, 13, 17]) b.set(x, y, M[4]);
  }
  // the crystal: dark glass, a glow of the thread's light in its heart, its rims in shadow under the metal
  for (let y = 9; y <= 26; y++) {
    for (let x = 5; x <= 16; x++) {
      const mid = 1 - Math.abs(x + 0.5 - 11) / 6;
      const shade = y === 9 || y === 26 ? -0.7 : 0;
      b.set(x, y, x === 5 || x === 16 ? T[0] : rampDither([T[0], T[1], T[2]], 0.15 + mid * 1.05 - ((x - 5) / 11) * 0.35 + shade, x, y));
    }
  }
  // the thread: two turns of a helix, the far half dim behind the glass, the near half bright over it
  const helix = (near: boolean) => {
    for (let k = 0; k <= 600; k++) {
      const t = k / 600, ph = t * Math.PI * 4 + 0.6;
      const depth = Math.cos(ph);
      if (near !== depth >= 0) continue;
      const x = Math.floor(11 + Math.sin(ph) * 4.3), y = Math.round(10.5 + t * 15);
      b.set(x, y, near ? (depth > 0.7 ? T[4] : T[3]) : dith(x, y, 0.5) ? T[3] : T[2]);
    }
  };
  helix(false);
  helix(true);
  // a sheen on the glass, after the small spools
  for (const [y, c] of [[11, UIR.navy[4]], [12, UIR.navy[4]], [13, UIR.navy[3]], [14, UIR.navy[3]]] as const) b.set(6, y, c);
  // the finial: a jewel of the thread's colour on Gilded, a metal knob otherwise
  if (grade === 2) {
    row(1, 10, 11, (x) => (x === 10 ? T[4] : T[3]));
    row(2, 9, 12, (x) => (x === 9 ? T[3] : x === 12 ? T[1] : T[2]));
    for (const [x, y] of [[6, 5], [10, 4], [15, 5]]) b.set(x, y, M[4]);
  } else {
    row(1, 10, 11, (x) => lit(x, 1, 1, 2, 0.4));
    row(2, 9, 12, (x) => lit(x, 2, 1, 2, 0.4));
  }
  // Silver: an engraved band round the cap and the foot
  if (grade === 1) {
    row(5, 5, 16, (x) => (x === 5 ? M[2] : M[1]));
    row(30, 6, 15, () => M[1]);
  }
  return outline(b, UIR.ink[0]);
}

/** Lobe centres of the small rose (13x13), slot 0 at the top and clockwise, as on the matrix rose. */
const MINI_LOBES: [number, number][] = [[6, 2], [9, 4], [9, 8], [6, 10], [3, 8], [3, 4]];

/**
 * A small rose (13x13) that lights the slots a spool fits: six lobes in a dark
 * disc ringed in gold, as on the matrix rose; a lit lobe glows (gold for a fixed
 * slot, arcane for a choice slot), the others stay dim. Weaving's slot filters
 * and the corner of its spool cards.
 */
export function miniRose(lit: readonly number[]): Bitmap {
  const b = new Bitmap(13, 13);
  ellipseFill(b, 6.5, 6.5, 6.4, 6.4, (x, y, d) => (d > 0.86 ? rampDither(G, 3.1 - (x + y - 12) / 8, x, y) : UIR.fill[1]));
  MINI_LOBES.forEach(([cx, cy], i) => {
    const on = lit.includes(i);
    const R = i % 2 === 0 ? G : ARC;
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) b.set(cx + dx, cy + dy, on ? R[3] : UIR.navy[1]);
    b.set(cx, cy, on ? R[4] : UIR.navy[2]);
  });
  return outline(b, UIR.ink[0]);
}

/** Weaving's menu glyph (16x16): a spool standing on its foot, a thread of light unwinding from it to a spark. */
export function weavingGlyph(): Bitmap {
  const b = new Bitmap(16, 16);
  const M = MAT.gold.ramp;
  const L = ARC;
  const row = (y: number, x0: number, x1: number, c: (x: number) => RGBA) => {
    for (let x = x0; x <= x1; x++) b.set(x, y, c(x));
  };
  // gold lit from the top-left
  const metal = (x: number, y: number) => rampDither([M[2], M[3], M[4], M[5]], 3.2 - (x - 1) / 3.2 - (y % 4) * 0.25, x, y);
  row(1, 3, 7, (x) => metal(x, 1));
  row(2, 2, 8, (x) => metal(x, 2));
  row(3, 1, 9, (x) => (x < 4 ? M[4] : x < 7 ? M[3] : M[2]));
  // the glass, its spiral of light
  for (let y = 4; y <= 11; y++) row(y, 2, 8, (x) => (x === 2 || x === 8 ? L[0] : dith(x, y, 0.45) ? L[2] : L[1]));
  for (const [x, y, k] of [[3, 4, 3], [4, 5, 4], [5, 5, 4], [6, 6, 3], [7, 7, 2], [6, 8, 2], [5, 8, 3], [4, 9, 4], [5, 10, 4], [6, 10, 3], [7, 11, 2]] as const) b.set(x, y, L[k]);
  b.set(3, 6, UIR.navy[4]);
  b.set(3, 7, UIR.navy[3]);
  row(12, 1, 9, (x) => (x < 4 ? M[3] : x < 7 ? M[2] : M[1]));
  row(13, 2, 8, (x) => (x < 5 ? M[3] : M[1]));
  row(14, 3, 7, () => M[1]);
  // the thread: out of the glass, up to a spark at the top right
  for (const [x, y, k] of [[9, 7, 3], [10, 7, 4], [11, 6, 3], [12, 5, 4], [12, 4, 3]] as const) b.set(x, y, L[k]);
  for (const [x, y, k] of [[13, 1, 3], [12, 2, 3], [13, 2, 4], [14, 2, 3], [13, 3, 3]] as const) b.set(x, y, L[k]);
  return outline(b, UIR.ink[0]);
}

export function matrixParts(): Record<string, Bitmap> {
  const out: Record<string, Bitmap> = { matrix_rose: matrixRose(), lobe_sel: ring(20.2, 22.4, true), lobe_attune: ring(20.4, 21.6, false), mi_weaving: weavingGlyph() };
  for (const p of PATTERN_IDS) {
    if (!THREAD[p]) throw new Error(`no thread colour for weave pattern ${p}`);
    for (const g of [0, 1, 2]) {
      out[`spool_${p}_${g}`] = spool(p, g);
      out[`bigspool_${p}_${g}`] = bigSpool(p, g);
    }
  }
  // the card frames of the three grades
  for (const [g, ramp] of Object.entries(UIR.grade)) out['card_' + g] = cardFrame(ramp);
  // a rose for each slot alone, and one for the three choice slots (a base stat in % fits any of them)
  for (let i = 0; i < 6; i++) out['rose_' + i] = miniRose([i]);
  out.rose_135 = miniRose([1, 3, 5]);
  return out;
}
