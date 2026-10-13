// The Court of Root's effects. The Follower's Snap: two jaws seen from the
// side closing on the target, a white flash where their fangs meet and chips
// flying; his Rend: three ragged tears ripping down and back across the
// enemy's guard, bits of it falling away. The Walking Bush's Root Lash: the
// crack of a root across the target and chips of his wood; his Thicket: roots
// of the same wood curling up round a champion's feet. Neutral light, dust and
// their own wood, never their affinities (affinities are abstract, Jakub,
// 2026-10-11). Light effects are additive in src/game/view/scene.ts.
import { dith, rampDither } from '../paint.ts';
import { Bitmap, RGBA, rng } from '../raster.ts';
import { burst, cut, FxDef, ramps, sparks, W } from './kit.ts';

const DU = ramps.dust;
/** A dull flash: grey to white, no hue of its own. */
const DULL: RGBA[] = [DU[0], DU[2], DU[3], DU[4], W];

/**
 * One jaw seen from the side: a line `len` px long from the hinge (hx, hy)
 * forward, turned `open` radians away from the line of the bite, above it
 * (side -1) or below it (side 1); its tip hooks back toward the bite and its
 * fangs point at the other jaw.
 */
function jawArc(b: Bitmap, hx: number, hy: number, len: number, side: -1 | 1, open: number, heat: number) {
  const a = open * side;
  const pt = (s: number): [number, number] => [hx + Math.cos(a) * len * s, hy + Math.sin(a) * len * s - side * 2.2 * s * s * s];
  const steps = Math.ceil(len * 2);
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const [x, y] = pt(s);
    const th = 0.6 + 1.2 * Math.sin(Math.PI * Math.min(1, s * 1.1));
    // the jaw's thickness grows away from the bite
    for (let o = 0; o <= th; o += 0.5) {
      const px = Math.round(x), py = Math.round(y + side * o);
      b.set(px, py, rampDither(DULL, Math.min(4, (1.0 + (1 - o / th) * 2.4 + s) * heat), px, py));
    }
  }
  for (const [s, n] of [[0.62, 2], [0.8, 2], [0.95, 3]] as const) {
    const [x, y] = pt(s);
    for (let k = 1; k <= n; k++) b.set(Math.round(x), Math.round(y - side * k), k < n || heat > 0.9 ? W : DULL[3]);
  }
}

/** A ragged tear from (x0, y0) to (x1, y1): a line wandering a little off its course, white-hot at its heart; `reach` (0-1) is how far it has run. */
function tear(b: Bitmap, x0: number, y0: number, x1: number, y1: number, thick: number, heat: number, reach: number, seed: number) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  const r = rng(seed);
  const jag: number[] = [];
  for (let i = 0; i <= len / 5 + 2; i++) jag.push((r() - 0.5) * 2.2);
  const steps = Math.ceil(len * 2);
  for (let i = 0; i <= steps * reach; i++) {
    const s = i / steps;
    const seg = (s * len) / 5, j = Math.floor(seg);
    const off = jag[j] + (jag[j + 1] - jag[j]) * (seg - j);
    const w = thick * Math.sin(Math.PI * Math.min(1, s * 1.1 + 0.04));
    const bx = x0 + (x1 - x0) * s + nx * off, by = y0 + (y1 - y0) * s + ny * off;
    for (let o = -w; o <= w; o += 0.5) {
      const x = Math.round(bx + nx * o), y = Math.round(by + ny * o);
      const k = 1 - Math.abs(o) / Math.max(0.5, w);
      b.set(x, y, rampDither(DULL, Math.min(4, (1.2 + k * 2.6) * heat), x, y));
    }
  }
}

export const COURT_OF_ROOT_FX: Record<string, FxDef> = {
  /** Snap: two jaws close on the target from the side, a flash where the fangs meet, chips flying on. */
  snap: {
    w: 56, h: 44, n: 6, ms: 40, ax: 0.5, ay: 0.5, pad: [4, 6, 4, 4],
    draw: (b, t, i) => {
      const cx = 28, cy = 22;
      const open = [0.5, 0.24, 0.03, 0.02, 0.02, 0.02][i];
      const heat = [1.0, 1.15, 1.35, 1.0, 0.7, 0.4][i];
      if (i < 5) for (const side of [-1, 1] as const) jawArc(b, cx - 14, cy, 26, side, open, heat);
      if (i === 2 || i === 3) burst(b, cx + 10, cy, 8, 2, [12, 8][i - 2], 1.4, DULL, 0.2);
      if (i >= 2) sparks(b, cx + 8, cy, 12, 22, (i - 2) / 3.5, DULL, 149, 10);
    },
  },
  /** Rend: three ragged tears rip down and back across the enemy, one after another, and bits fall away. */
  rend: {
    w: 72, h: 72, n: 8, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 4, 8, 6],
    draw: (b, t, i) => {
      const cx = 36, cy = 35;
      for (let k = 0; k < 3; k++) {
        const age = i - k * 0.6;
        if (age < 0) continue;
        const heat = [1.45, 1.3, 1.1, 0.85, 0.62, 0.42, 0.28, 0.18][Math.min(7, Math.floor(age))];
        if (heat < 0.25) continue;
        const dx = (k - 1) * 7;
        tear(b, cx + 14 + dx, cy - 22 + Math.abs(k - 1) * 3, cx - 12 + dx, cy + 20 - Math.abs(k - 1) * 2, [2.0, 1.7, 1.8][k], heat, Math.min(1, (age + 1) / 2.2), 131 + k);
      }
      if (i === 1 || i === 2) burst(b, cx + 6, cy - 6, 8, 2, [12, 8][i - 1], 1.3, DULL, 0.4);
      if (i >= 2) sparks(b, cx - 2, cy + 4, 16, 26, (i - 2) / 5, DULL, 139, 16);
    },
  },
  /** Root Lash: a root whips across the target, a pale crack where it lands, chips of wood and dust flying on. */
  root_lash: {
    w: 64, h: 56, n: 6, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 4, 6, 4],
    draw: (b, t, i) => {
      const WO = ramps.wood;
      const reach = [0.55, 1, 1, 1, 1, 1][i], heat = [1.3, 1.4, 1.1, 0.8, 0.55, 0.35][i], th = [2.6, 3.2, 2.6, 1.8, 1.2, 0.8][i];
      if (i < 5) cut(b, 8, 18, 56, 34, -5, th, WO, heat, reach);
      if (i === 1 || i === 2) burst(b, 38, 30, 7, 2, [11, 7][i - 1], 1.3, WO, 0.5);
      if (i >= 1) sparks(b, 38, 30, 14, 24, (i - 1) / 4.5, WO, 157, 16);
    },
  },
  /**
   * Thicket: roots of the Walking Bush's wood curl up out of the ground round a
   * champion's feet into a little thicket, hold, and sink back; dust where
   * they break the ground. Played at the feet of the chosen ally and at his.
   */
  thicket: {
    w: 60, h: 48, n: 10, ms: 70, ax: 0.5, ay: 1, pad: [2, 4, 8, 4],
    draw: (b, t, i) => {
      const WO = ramps.wood;
      const gx = 30, gy = 46;
      const grow = [0.25, 0.55, 0.85, 1, 1, 1, 1, 0.8, 0.5, 0.2][i];
      const fade = i < 7 ? 1 : [0.75, 0.5, 0.25][i - 7];
      // seven roots, twisting as they climb, the outer ones leaning in so that they cross
      for (let k = 0; k < 7; k++) {
        const x0 = gx + [-18, -12, -6, 0, 6, 12, 18][k], h = [15, 22, 27, 31, 26, 21, 14][k] * grow, lean = [0.32, 0.5, 0.18, -0.04, -0.2, -0.48, -0.3][k];
        for (let s = 0; s <= h; s += 0.5) {
          const f = s / Math.max(1, h);
          const x = x0 + lean * s + Math.sin(f * 5 + k * 1.9) * 2.6 * f, y = gy - s;
          const w = 2.1 * (1 - f) + 0.45;
          for (let o = -w; o <= w; o += 0.5) {
            const px = Math.round(x + o), py = Math.round(y);
            if (!dith(px, py, fade)) continue;
            // dark wood, lit along one side; only the tips catch the light
            b.set(px, py, rampDither(WO, Math.min(3.4, 0.5 + (1 - Math.abs(o + w * 0.4) / (w * 1.4)) * 1.6 + f * 1.1), px, py));
          }
        }
      }
      if (i < 4) sparks(b, gx, gy - 1, 12, 20, i / 4, ramps.dust, 163, 6);
    },
  },
};
