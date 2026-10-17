// The Azure Crown's effects. They show what each skill does with a weapon or a
// tool, never the champion's affinity (affinities are abstract, Jakub,
// 2026-10-11; on 2026-10-12 he had Gareth's ember cuts and the Skirmisher's
// leaf-green ones made plain): a cut is a white line of light shedding chips,
// a heavy blow a dull grey-white flash with dust rolling out, a sweep a flat
// arc of light. The Lineholder's mace lands the same way and his Brace kicks
// up dust; the Quartermaster's stick raps, and his Field Rations reach each
// ally as warm light with small white crosses rising. Emissary Handlings'
// Banner Strike lands as a dull flash with a glint of the finial's gold; his
// Rallying Standard raises the shape of the standard in light behind each
// ally, gold and azure, the colours of the Crown's standard he carries; his
// Unbroken Flag sweeps a band of that azure round the ally it shields and
// flashes a kite shield of gold. The Associate's are the motes of her staff,
// white light with a pale blue edge: her Mote Bolt flies as a bright mote with
// others swirling behind it and bursts on the enemy, the motes scattering and
// sinking as they dim; in Quickening they flare round her raised staff, then
// wind up round each ally with streaks of speed; her Bitter Motes circle the
// enemy that struck her, close in and sting, turning the green of poison.
import { dith, ellipseRing, polyFill, rampDither } from '../paint.ts';
import { Bitmap, RGBA, rng } from '../raster.ts';
import { burst, cut, FxDef, motes, ramps, ring, sparks, W } from './kit.ts';

const DU = ramps.dust;
const GO = ramps.gold;
/** The Associate's motes: white light, a pale blue at their edges. */
const IC = ramps.ice;

/** One mote of light: a white point, or a small cross of light with an edge from `ramp` (screen space). */
function mote(b: Bitmap, x: number, y: number, big: boolean, ramp: RGBA[], fade = 1) {
  if (!dith(x, y, fade)) return;
  b.set(x, y, fade > 0.5 ? W : ramp[3]);
  if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (dith(x + dx, y + dy, fade)) b.set(x + dx, y + dy, ramp[fade > 0.6 ? 3 : 2]);
}
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

/** A kite shield of gold light: a dithered body and a bright rim, top edge straight, sides running to the point. */
function kite(b: Bitmap, cx: number, cy: number, hw: number, hh: number, fade: number) {
  const pts: [number, number][] = [[cx - hw, cy - hh * 0.45], [cx + hw, cy - hh * 0.45], [cx + hw * 0.9, cy + hh * 0.2], [cx, cy + hh], [cx - hw * 0.9, cy + hh * 0.2]];
  polyFill(b, pts, (x, y) => (dith(x, y, fade * 0.45) ? GO[2] : 0));
  for (let k = 0; k < pts.length; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[(k + 1) % pts.length];
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5);
    for (let s = 0; s <= n; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / n), y = Math.round(y0 + ((y1 - y0) * s) / n);
      if (dith(x, y, fade)) b.set(x, y, k === 0 ? W : GO[4]);
    }
  }
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

  /** Banner Strike: the pole's gilded head lands: a dull flash with a glint of its gold, a ring of the blow, chips flying. */
  banner_strike: {
    w: 64, h: 64, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 6, 6, 4],
    draw: (b, t, i) => {
      const cx = 32, cy = 32;
      if (i < 2) cut(b, 12, 8, cx, cy, -2, [2.2, 3.0][i], DULL, [1.3, 1.1][i], [0.7, 1][i]);
      if (i >= 1 && i <= 3) burst(b, cx, cy, 10, 2, [14, 10, 7][i - 1], 1.5, DULL, 0.25);
      if (i === 1 || i === 2) burst(b, cx + 1, cy - 1, 4, 1, [6, 4][i - 1], 1, GO, 0.8);
      if (i >= 2) ring(b, cx, cy, 6 + (i - 2) * 4, 6 + (i - 2) * 4, Math.max(0.7, 2 - (i - 2) * 0.35), DULL, Math.max(0.3, 1.2 - (i - 2) * 0.2));
      if (i >= 1) sparks(b, cx, cy, 12, 24, (i - 1) / 5, GO, 241, 14);
    },
  },
  /**
   * Rallying Standard reaches an ally: the shape of the standard rises behind
   * it in light, a pole of gold 12 px behind the ally and an azure pennant
   * unfurling back from it, and a gold ring settles at its feet. Anchored at
   * the feet; the pole stands behind the body so the light never hides it.
   */
  rally: {
    w: 64, h: 100, n: 11, ms: 65, ax: 0.6875, ay: 1, pad: [2, 4, 8, 4],
    draw: (b, t, i) => {
      const AZ = ramps.steel;
      const cx = 32, gy = 98;
      const up = [0.15, 0.4, 0.7, 0.9, 1, 1, 1, 1, 1, 1, 1][i];
      const fade = i < 7 ? 1 : [0.75, 0.5, 0.3, 0.15][i - 7];
      const top = gy - 84 * up;
      for (let y = Math.floor(top); y <= gy; y++) {
        if (!dith(cx, y, fade * (0.55 + 0.45 * (y - top) / Math.max(1, gy - top)))) continue;
        b.set(cx, y, GO[3]);
        if (dith(cx + 1, y, 0.5)) b.set(cx + 1, y, GO[2]);
      }
      if (i >= 3) {
        const unf = Math.min(1, (i - 2) / 3), wd = 20 * unf, hgt = 26;
        for (let yy = 0; yy < hgt; yy++) {
          const tail = yy > hgt - 7 && Math.abs(yy - (hgt - 3)) < 3 ? wd * 0.35 : 0;
          const wv = wd * (1 - (yy / hgt) * 0.25);
          for (let xx = 2; xx <= wv; xx++) {
            if (tail && Math.abs(xx - wv * 0.55) < tail * 0.5) continue;
            const x = cx - xx, y = Math.round(top + 3 + yy + Math.sin(xx * 0.4 + t * 6) * 1.2);
            if (!dith(x, y, fade * 0.85)) continue;
            b.set(x, y, rampDither(AZ, 1.6 + Math.sin(xx * 0.5 - t * 5) * 0.8 + (xx < 4 ? 0.8 : 0), x, y));
          }
        }
      }
      ellipseRing(b, cx + 12, gy - 2, 6 + up * 14, 2 + up * 3, 1.2, (x, y, a) => (dith(x, y, fade) ? rampDither(GO, 2.6 + Math.sin(a) * 0.6, x, y) : 0));
      motes(b, cx + 12, gy - 6, 30, 70, 8, t, GO, 251);
    },
  },
  /**
   * Unbroken Flag: an ally struck takes the ward of the standard: a band of
   * azure light, as of the banner's cloth, sweeps round it, and a kite
   * shield of gold light flashes and fades. Played at its chest.
   */
  flag_ward: {
    w: 64, h: 64, n: 8, ms: 55, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const AZ = ramps.steel;
      const cx = 32, cy = 32;
      const sweep = [0.3, 0.65, 1, 1, 1, 1, 1, 1][i];
      const fade = i < 4 ? 1 : [0.8, 0.55, 0.35, 0.15][i - 4];
      const a0 = -Math.PI * 0.9, span = Math.PI * 1.6 * sweep;
      ellipseRing(b, cx, cy, 22, 25, 3.2 * fade + 0.8, (x, y, a) => {
        let rel = a - a0;
        while (rel < 0) rel += Math.PI * 2;
        if (rel > span) return 0;
        const k = rel / Math.max(0.01, span);
        if (!dith(x, y, fade * (0.6 + 0.4 * Math.sin(k * Math.PI)))) return 0;
        return rampDither(AZ, 1.4 + Math.sin(k * Math.PI) * 2 + Math.sin(rel * 6 - t * 8) * 0.4, x, y);
      });
      if (i >= 2 && i <= 6) kite(b, cx, cy - 2, 9, 12, fade);
      if (i >= 1 && i <= 5) sparks(b, cx, cy, 10, 26, (i - 1) / 5, GO, 257, 0);
    },
  },

  /** Mote Bolt in flight: a bright mote at its head and others swirling behind it (drawn pointing right; the battle turns it). */
  mote_bolt: {
    w: 22, h: 11, n: 3, ms: 60, ax: 0.8, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      const hx = 17, hy = 5;
      // the head: a white core in a halo of pale light
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d <= 2) b.set(hx + dx, hy + dy, d === 0 ? W : d === 1 ? IC[4] : IC[2 + ((i + dx) & 1)]);
      }
      b.set(hx + 3, hy, IC[3]);
      for (let k = 1; k <= 5; k++) {
        const x = Math.round(hx - k * 2.8), y = Math.round(hy + Math.sin(i * 2.1 + k * 1.4) * 2.2);
        mote(b, x, y, k === 2, IC, 1 - k * 0.12);
      }
    },
  },
  /** Mote Bolt lands: a white flash, a ring of pale light, the motes thrown out and sinking as they dim. */
  mote_burst: {
    w: 48, h: 48, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [2, 2, 8, 2],
    draw: (b, t, i) => {
      const cx = 24, cy = 24;
      if (i < 3) burst(b, cx, cy, 8, 1, [7, 11, 8][i], 1.2, IC, 0.4);
      if (i >= 1) ring(b, cx, cy, 4 + (i - 1) * 3.4, 4 + (i - 1) * 3.4, Math.max(0.6, 1.6 - (i - 1) * 0.25), IC, Math.max(0.3, 1.2 - (i - 1) * 0.18));
      if (i >= 1) {
        const r = rng(311);
        const k1 = (i - 1) / 5;
        for (let k = 0; k < 10; k++) {
          const a = r() * Math.PI * 2, sp = 0.6 + r() * 0.5;
          const d = 18 * sp * Math.sqrt(k1);
          mote(b, Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d + k1 * k1 * 9), k % 3 === 0, IC, 1 - k1 * 0.8);
        }
      }
    },
  },
  /**
   * Quickening's flare: the motes blaze up round the head of her raised staff
   * and burst outward (additive), on the skill's `cast` event. The scene plays it
   * 8 px ahead of the top of her standing sprite and 8 below it; the head of her
   * staff stands 7.5 px behind that point and 42 above it, where the flare sits.
   */
  mote_flare: {
    w: 56, h: 92, n: 8, ms: 55, ax: 0.634, ay: 0.737, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 28, cy = 26;
      if (i < 4) burst(b, cx, cy, 10, [2, 3, 2, 1][i], [10, 16, 12, 7][i], [1.6, 2.0, 1.4, 1][i], IC, 0.3 + i * 0.2);
      ring(b, cx, cy, 4 + t * 18, 3 + t * 9, Math.max(0.6, 1.8 - t * 1.2), IC, 1.1 - t * 0.6);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + t * 2;
        const d = 6 + t * 22;
        mote(b, Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.55), k % 3 === 0, IC, 1 - t * 0.7);
      }
    },
  },
  /**
   * Quickening reaches an ally: the motes wind up round it in a spiral, streaks
   * of speed run up past it, and a ring of pale light settles at its feet.
   * Anchored at the feet.
   */
  quicken: {
    w: 56, h: 84, n: 10, ms: 60, ax: 0.5, ay: 1, pad: [2, 4, 6, 4],
    draw: (b, t, i) => {
      const cx = 28, gy = 82;
      ellipseRing(b, cx, gy - 2, 8 + t * 12, 2.4 + t * 2, 1.2, (x, y, a) => (dith(x, y, 1 - t * 0.8) ? rampDither(IC, 2.4 + Math.sin(a) * 0.6, x, y) : 0));
      for (let k = 0; k < 12; k++) {
        const tt = t * 1.35 - (k / 12) * 0.45;
        if (tt < 0 || tt > 1) continue;
        const a = tt * Math.PI * 4 + k * 0.55;
        const front = Math.sin(a) > 0;
        mote(b, Math.round(cx + Math.cos(a) * 14), Math.round(gy - 6 - tt * 66), k % 2 === 0, IC, (front ? 1 : 0.55) * (1 - tt * 0.5));
      }
      const r = rng(317);
      for (let k = 0; k < 5; k++) {
        const x = Math.round(cx - 14 + r() * 28), sp = 0.8 + r() * 0.5, len = 6 + r() * 6, ph = r() * 0.3;
        const head = gy - 4 - (t * sp + ph) * 80;
        for (let q = 0; q < len; q++) {
          const y = Math.round(head + q);
          if (y < 0 || y >= 84 || !dith(x, y, (1 - q / len) * (1 - t * 0.5))) continue;
          b.set(x, y, rampDither(IC, 1.4 + (1 - q / len) * 2.6, x, y));
        }
      }
    },
  },
  /**
   * Bitter Motes: her motes circle the enemy that struck her, close in and
   * sting, turning the green of the poison they leave. Played at its chest.
   */
  bitter_motes: {
    w: 52, h: 52, n: 9, ms: 55, ax: 0.5, ay: 0.5, pad: [2, 2, 6, 2],
    draw: (b, t, i) => {
      const GR = ramps.green;
      const cx = 26, cy = 26;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + t * 5;
        const r = 21 * (1 - t * 0.78);
        const sour = t > 0.3 + k * 0.04;
        mote(b, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.8), k % 2 === 0, sour ? GR : IC, i < 8 ? 1 : 0.5);
      }
      if (i >= 5 && i <= 7) burst(b, cx, cy, 6, 1, [6, 9, 6][i - 5], 1, GR, 0.3);
      if (i >= 6) sparks(b, cx, cy, 10, 16, (i - 6) / 3, GR, 337, 12);
    },
  },
};
