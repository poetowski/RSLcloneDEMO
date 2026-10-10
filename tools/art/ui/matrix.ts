// Weaver Matrix art (approved 2026-10-10): the matrix rose with its two
// triangles, the slot rings, and the spool icons: crystal capsules holding a
// spiral thread of light, the cap metal showing the grade and the thread's
// colour its pattern. Same rules as the rest of the interface art: light from
// the top-left, 1px dark outlines, ramps from palette.ts. Used by the MATRIX tab
// (src/game/screens/champion.ts); layout in docs/UI_GUIDE.md.
import { FXR, MAT, UIR } from '../palette.ts';
import { dith, outline, rampDither } from '../paint.ts';
import { Bitmap, RGBA } from '../raster.ts';
import { v, V } from '../rig.ts';
import { arc, castMetal, Stroke } from './menu.ts';

/** The draft pattern ids (src/game/data/matrix.ts PATTERN_IDS; a content test keeps them equal). */
export const PATTERNS = ['lifethread', 'tension', 'selvage', 'glint', 'quickweft', 'fraybite', 'bloodweft', 'wardknot'] as const;
export type PatternKey = (typeof PATTERNS)[number];
const THREAD: Record<PatternKey, RGBA[]> = {
  lifethread: FXR.green,
  tension: FXR.fire,
  selvage: FXR.steel,
  glint: FXR.magenta,
  quickweft: FXR.gold,
  fraybite: FXR.violet,
  bloodweft: FXR.blood,
  wardknot: FXR.hardlight,
};
/** cap metal by grade: ebony (Ashen), silver, gold (Gilded) */
const METAL: RGBA[][] = [MAT.ebony.ramp.slice(1), MAT.silver.ramp.slice(1), UIR.gold];
const G = UIR.gold;

/** An 18x18 spool: a pointed cap, a crystal holding the thread's spiral, a pointed foot. */
export function spool(p: PatternKey, grade: number): Bitmap {
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

export function matrixParts(): Record<string, Bitmap> {
  const out: Record<string, Bitmap> = { matrix_rose: matrixRose(), lobe_sel: ring(20.2, 22.4, true), lobe_attune: ring(20.4, 21.6, false) };
  for (const p of PATTERNS) for (const g of [0, 1, 2]) out[`spool_${p}_${g}`] = spool(p, g);
  return out;
}
