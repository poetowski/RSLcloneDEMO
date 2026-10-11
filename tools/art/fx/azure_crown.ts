// Captain Gareth's effects (Azure Crown). His Ember affinity shows in what he
// does with the sword, never in the sword: the cut glows white-hot and sheds
// embers, the heavy blow bursts, the sweep leaves a flat arc of heat.
import { rampDither } from '../paint.ts';
import { Bitmap, RGBA, rng } from '../raster.ts';
import { burst, cut, FxDef, ramps, ring, sparks } from './kit.ts';

const F = ramps.fire;

/** Embers shed by a cut: they fly out mostly upward, slow, sink and dim; t in [0,1]. */
function embers(b: Bitmap, cx: number, cy: number, n: number, spread: number, t: number, seed: number, gravity = 30) {
  const r = rng(seed);
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.7;
    const sp = (0.35 + r() * 0.65) * spread;
    const ease = 1 - (1 - t) * (1 - t);
    const x = cx + Math.cos(a) * sp * ease, y = cy + Math.sin(a) * sp * ease * 0.8 + gravity * t * t;
    const life = 1 - t * (0.55 + r() * 0.55);
    if (life <= 0) continue;
    const c = F[Math.max(1, Math.min(4, Math.round(life * 4.4)))];
    b.set(Math.round(x), Math.round(y), c);
    if (life > 0.65 && k % 2 === 0) b.set(Math.round(x), Math.round(y) + 1, F[1]);
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

export const AZURE_CROWN_FX: Record<string, FxDef> = {
  /** Line Cut: one straight cut from high behind to low in front, white-hot, cooling to embers. */
  ember_cut: {
    w: 72, h: 72, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 6, 10, 6],
    draw: (b, t, i) => {
      const reach = [0.55, 1, 1, 1, 1, 1, 1][i];
      const heat = [1.4, 1.3, 1.05, 0.8, 0.6, 0.45, 0.3][i];
      const thick = [3.2, 4.4, 3.6, 2.8, 2.0, 1.4, 1][i];
      if (i < 6) cut(b, 12, 10, 62, 60, -2, thick, F, heat, reach);
      if (i === 1 || i === 2) burst(b, 38, 36, 6, 2, [13, 8][i - 1], 1.4, F, 0.4);
      if (i >= 1) embers(b, 40, 38, 18, 34, (i - 1) / 5, 17, 26);
    },
  },
  /** Iron Blow: the blow comes straight down; a hot core bursts, a ring rolls out, embers fly. */
  iron_impact: {
    w: 92, h: 92, n: 8, ms: 50, ax: 0.5, ay: 0.5, pad: [4, 8, 12, 8],
    draw: (b, t, i) => {
      const cx = 46, cy = 54;
      if (i < 3) cut(b, 42, 2, 47, cy, 2, [3, 4.6, 3][i], F, [1.4, 1.25, 0.8][i], [0.7, 1, 1][i]);
      if (i >= 1 && i < 5) burst(b, cx, cy, 10, [3, 4, 3, 2][i - 1], [22, 32, 25, 15][i - 1], [2.6, 3.3, 2.4, 1.6][i - 1], F, i * 0.13);
      if (i >= 2) {
        const r = 8 + (i - 2) * 7;
        ring(b, cx, cy, r, r * 0.55, Math.max(0.8, 3.2 - (i - 2) * 0.5), F, 1.25 - (i - 2) * 0.16);
      }
      if (i >= 1) embers(b, cx, cy, 24, 48, (i - 1) / 6, 29, 42);
      if (i >= 2) sparks(b, cx, cy, 12, 38, (i - 2) / 5, F, 31, 14);
    },
  },
  /** Wide Sweep: a wide, flat arc of heat crosses the target, leading edge thick, then embers. */
  ember_sweep: {
    w: 96, h: 56, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 4, 8, 4],
    draw: (b, t, i) => {
      const grow = [0.45, 0.85, 1, 1, 1, 1, 1][i];
      const heat = [1.35, 1.25, 1.05, 0.8, 0.6, 0.42, 0.28][i];
      // in screen space the front of the sweep is the lower half of the ellipse: left to right through the bottom
      const a0 = Math.PI * 0.98, a1 = a0 - Math.PI * 0.96 * grow;
      if (i < 6) flatArc(b, 48, 20, 44, 17, 16 * (1 - t * 0.45), a0, a1, F, heat);
      if (i >= 1) embers(b, 58, 34, 16, 30, (i - 1) / 5, 37, 24);
    },
  },
};
