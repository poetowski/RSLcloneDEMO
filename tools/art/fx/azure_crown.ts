// The Azure Crown's effects. They show what each skill does with a weapon or a
// tool, never the champion's affinity (affinities are abstract, Jakub,
// 2026-10-11; on 2026-10-12 he had Gareth's ember cuts and the Skirmisher's
// leaf-green ones made plain): a cut is a white line of light shedding chips,
// a heavy blow a dull grey-white flash with dust rolling out, a sweep a flat
// arc of light. The Lineholder's mace lands the same way and his Brace kicks
// up dust; the Quartermaster's stick raps, and his Field Rations reach each
// ally as warm light with small white crosses rising.
import { dith, ellipseRing, rampDither } from '../paint.ts';
import { Bitmap, RGBA, rng } from '../raster.ts';
import { burst, cut, FxDef, motes, ramps, ring, sparks, W } from './kit.ts';

const DU = ramps.dust;
const GO = ramps.gold;
/** A dull flash: grey to white, no hue of its own. */
const DULL: RGBA[] = [DU[0], DU[2], DU[3], DU[4], W];

/** Dust thrown out from a point: soft dithered puffs that drift, grow and thin; t in [0,1]. */
function dust(b: Bitmap, cx: number, cy: number, n: number, spread: number, t: number, seed: number, lift = 6) {
  const r = rng(seed);
  for (let k = 0; k < n; k++) {
    const a = Math.PI + (r() - 0.5) * Math.PI * 1.1 + (k % 2 ? Math.PI : 0);
    const sp = (0.45 + r() * 0.55) * spread;
    const ease = 1 - (1 - t) * (1 - t);
    const x = cx + Math.cos(a) * sp * ease, y = cy - Math.abs(Math.sin(a)) * sp * ease * 0.35 - lift * t;
    const rad = 2 + r() * 2.5 + t * 3.5;
    const alpha = (1 - t) * 0.85;
    for (let yy = Math.floor(y - rad); yy <= Math.ceil(y + rad); yy++) {
      for (let xx = Math.floor(x - rad); xx <= Math.ceil(x + rad); xx++) {
        const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y) / rad;
        if (d > 1 || !dith(xx, yy, alpha * (1 - d * 0.6))) continue;
        b.set(xx, yy, rampDither(DU, 3.2 - d * 1.4 - t, xx, yy));
      }
    }
  }
}

/**
 * A flat elliptical arc band (a horizontal sweep seen from the side), from
 * angle a0 to a1 (screen radians, y down), thickest at the leading end a1.
 */
function flatArc(b: Bitmap, cx: number, cy: number, rx: number, ry: number, thick: number, a0: number, a1: number, ramp: RGBA[], heat: number) {
  const k = rx / ry;
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const dx = x + 0.5 - cx, dy = (y + 0.5 - cy) * k;
      const d = Math.hypot(dx, dy);
      let a = Math.atan2(dy, dx);
      // walk the arc in the direction from a0 to a1
      const span = a1 - a0;
      let rel = a - a0;
      if (span >= 0) {
        while (rel < 0) rel += Math.PI * 2;
        while (rel >= Math.PI * 2) rel -= Math.PI * 2;
      } else {
        while (rel > 0) rel -= Math.PI * 2;
        while (rel <= -Math.PI * 2) rel += Math.PI * 2;
      }
      const u = span === 0 ? 0 : rel / span;
      if (u < 0 || u > 1) continue;
      const th = thick * (0.15 + 0.85 * Math.pow(u, 0.7));
      if (d > rx || d < rx - th * k * 0.5) continue;
      const across = (d - (rx - th * k * 0.5)) / Math.max(0.01, th * k * 0.5);
      const v = (across * 2.2 + u * 1.8) * heat;
      b.set(x, y, rampDither(ramp, Math.min(4, v), x, y));
    }
  }
}

/** A straight cut of light from (x0,y0) to (x1,y1) that thins away, a small flash where it crosses, chips flying. */
function lightCut(b: Bitmap, i: number, x0: number, y0: number, x1: number, y1: number, bend: number, flash: [number, number, number], seed: number, thick = 1) {
  const reach = [0.55, 1, 1, 1, 1, 1, 1][i];
  const heat = [1.4, 1.3, 1.05, 0.8, 0.6, 0.45, 0.3][i];
  const th = [3.2, 4.2, 3.4, 2.6, 1.9, 1.3, 1][i] * thick;
  if (i < 6) cut(b, x0, y0, x1, y1, bend, th, DULL, heat, reach);
  if (i === 1 || i === 2) burst(b, flash[0], flash[1], 6, 2, [12, 8][i - 1], 1.3, DULL, flash[2]);
  if (i >= 1) sparks(b, flash[0], flash[1], 14, 30, (i - 1) / 5, DULL, seed, 20);
}

export const AZURE_CROWN_FX: Record<string, FxDef> = {
  /** Line Cut: one straight cut from high behind to low in front, a white line shedding chips of light. */
  sword_cut: {
    w: 72, h: 72, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 6, 10, 6],
    draw: (b, t, i) => lightCut(b, i, 12, 10, 62, 60, -2, [38, 36, 0.4], 17, 1.05),
  },
  /** Twin Cut, first hit: the near sword cuts high to low. */
  blade_cut: {
    w: 72, h: 72, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 6, 10, 6],
    draw: (b, t, i) => lightCut(b, i, 14, 14, 60, 56, -2, [38, 36, 0.3], 23, 0.88),
  },
  /** Twin Cut, second hit: the far sword cuts back low to high. */
  blade_cut_rise: {
    w: 72, h: 72, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 6, 10, 6],
    draw: (b, t, i) => lightCut(b, i, 14, 58, 60, 16, 2, [36, 37, 0.9], 29, 0.88),
  },
  /** Iron Blow: the blow comes straight down: a dull grey-white burst, a ring of dust rolling out, chips flying. */
  heavy_blow: {
    w: 92, h: 92, n: 8, ms: 50, ax: 0.5, ay: 0.5, pad: [4, 8, 12, 8],
    draw: (b, t, i) => {
      const cx = 46, cy = 54;
      if (i < 3) cut(b, 42, 2, 47, cy, 2, [3, 4.6, 3][i], DULL, [1.4, 1.25, 0.8][i], [0.7, 1, 1][i]);
      if (i >= 1 && i < 5) burst(b, cx, cy, 10, [3, 4, 3, 2][i - 1], [22, 32, 25, 15][i - 1], [2.6, 3.3, 2.4, 1.6][i - 1], DULL, i * 0.13);
      if (i >= 2) {
        const r = 8 + (i - 2) * 7;
        ring(b, cx, cy + 4, r, r * 0.5, Math.max(0.8, 3.0 - (i - 2) * 0.45), DU, 1.25 - (i - 2) * 0.15);
      }
      if (i >= 1) dust(b, cx, cy + 6, 10, 32, (i - 1) / 6, 29);
      if (i >= 1) sparks(b, cx, cy, 18, 42, (i - 1) / 6, DULL, 31, 30);
    },
  },
  /** Guard Cut: the mace comes down over the shield's rim and lands: a dull white flash, iron chips, a ring of dust rolling out. */
  mace_blow: {
    w: 84, h: 84, n: 8, ms: 45, ax: 0.5, ay: 0.5, pad: [6, 8, 10, 8],
    draw: (b, t, i) => {
      const cx = 42, cy = 44;
      // the path of the blow, from above
      if (i < 2) cut(b, 47, 8, 42, cy, -1, [2.4, 3.2][i], DULL, [1.3, 1.1][i], [0.7, 1][i]);
      if (i >= 1 && i < 4) burst(b, cx, cy, 8, [3, 4, 2][i - 1], [15, 21, 13][i - 1], [2.4, 3, 1.8][i - 1], DULL, 0.2 + i * 0.1);
      if (i >= 2) {
        const r = 8 + (i - 2) * 6.5;
        ring(b, cx, cy + 6, r, r * 0.4, Math.max(0.8, 2.6 - (i - 2) * 0.4), DU, 1.25 - (i - 2) * 0.15);
      }
      if (i >= 1) dust(b, cx, cy + 6, 8, 26, (i - 1) / 6, 61);
      if (i >= 1) sparks(b, cx, cy, 14, 32, (i - 1) / 6, DULL, 67, 26);
    },
  },
  /** Brace: he sets his feet and the shield, and dust kicks up round them. */
  brace_dust: {
    w: 80, h: 40, n: 9, ms: 60, ax: 0.5, ay: 0.9, pad: [2, 6, 2, 6],
    draw: (b, t, i) => {
      const cx = 40, gy = 36;
      const rr = [8, 16, 22, 26, 28, 29, 29, 28, 26][i];
      ellipseRing(b, cx, gy - 2, rr, rr * 0.22, i < 6 ? 1.5 : 1, (x, y, a) => (dith(x, y, 1 - t * 0.8) ? rampDither(DU, 3.1 - t * 1.3 + Math.sin(a) * 0.6, x, y) : 0));
      dust(b, cx + 4, gy - 3, 10, 30, t, 73, 8);
      if (i >= 1 && i < 6) sparks(b, cx + 12, gy - 4, 7, 16, (i - 1) / 5, DU, 79, 30);
    },
  },
  /** Stick Rap: a small dull flash where the stick lands, a few chips, a puff of dust. */
  stick_rap: {
    w: 56, h: 56, n: 6, ms: 45, ax: 0.5, ay: 0.5, pad: [2, 4, 6, 4],
    draw: (b, t, i) => {
      const cx = 28, cy = 30;
      if (i < 2) cut(b, 33, 6, 28, cy, -1, [1.8, 2.4][i], DULL, [1.3, 1.1][i], [0.7, 1][i]);
      if (i >= 1 && i < 4) burst(b, cx, cy, 8, [2, 3, 2][i - 1], [9, 13, 8][i - 1], [1.6, 2.0, 1.2][i - 1], DULL, 0.3 + i * 0.1);
      if (i >= 1) dust(b, cx, cy + 4, 4, 14, (i - 1) / 4, 47, 4);
      if (i >= 1) sparks(b, cx, cy, 8, 18, (i - 1) / 4, DULL, 53, 18);
    },
  },
  /** Field Rations: warm light gathers at each ally's feet and small white crosses rise from it (additive). */
  rations: {
    w: 48, h: 72, n: 10, ms: 70, ax: 0.5, ay: 1, pad: [2, 4, 3, 4],
    draw: (b, t, i) => {
      const cx = 24, gy = 70;
      const rr = [6, 12, 16, 18, 19, 19, 18, 16, 13, 9][i];
      ellipseRing(b, cx, gy - 2, rr, rr * 0.28, 1.4, (x, y, a) => (dith(x, y, 1 - t * 0.7) ? rampDither(GO, 3 - t * 1.4 + Math.sin(a) * 0.6, x, y) : 0));
      const r = rng(83);
      for (let k = 0; k < 5; k++) {
        const x0 = cx + (r() - 0.5) * 26, start = r() * 0.3, sp = 1.2 + r() * 0.5;
        const tt = (t - start) * sp;
        if (tt <= 0 || tt >= 1) continue;
        const x = Math.round(x0 + Math.sin(tt * 6 + k) * 1.5), y = Math.round(gy - 8 - tt * 50);
        const core = tt < 0.6 ? W : GO[4], arm = tt < 0.6 ? GO[3] : GO[2];
        b.set(x, y, core);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, arm);
      }
      motes(b, cx, gy - 6, 24, 40, 10, t, GO, 89);
    },
  },
  /** Wide Sweep: a wide, flat arc of light crosses the target, leading edge thick, then chips. */
  sword_sweep: {
    w: 96, h: 56, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 4, 14, 4],
    draw: (b, t, i) => {
      const grow = [0.45, 0.85, 1, 1, 1, 1, 1][i];
      const heat = [1.35, 1.25, 1.05, 0.8, 0.6, 0.42, 0.28][i];
      // in screen space the front of the sweep is the lower half of the ellipse: left to right through the bottom
      const a0 = Math.PI * 0.98, a1 = a0 - Math.PI * 0.96 * grow;
      if (i < 6) flatArc(b, 48, 20, 44, 17, 16 * (1 - t * 0.45), a0, a1, DULL, heat);
      if (i >= 1) sparks(b, 58, 30, 12, 24, (i - 1) / 5, DULL, 37, 12);
    },
  },
};
