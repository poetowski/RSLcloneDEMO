// Effect toolkit: the shared vocabulary every combat effect is drawn with
// (crescent slashes, ray bursts, sparks, rings, shards, flames, motes, glyphs).
// Effects are grouped by origin in sibling modules and merged in ./index.ts.
import { ACCENT, FXR } from '../palette.ts';
import { disc, dith, ellipseRing, line, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, RGBA, rng, withAlpha } from '../raster.ts';


export interface FxJson {
  /** name -> frames [x, y, w, h, ox, oy] (offset of trimmed rect inside the logical box) */
  anims: Record<string, { w: number; h: number; ax: number; ay: number; ms: number; loop: boolean; frames: [number, number, number, number, number, number][] }>;
}

export type Drawer = (b: Bitmap, t: number, i: number) => void;
export interface FxDef {
  w: number;
  h: number;
  n: number;
  ms: number;
  /** anchor as a fraction of the box (0.5,0.5 center; 0.5,1 feet) */
  ax: number;
  ay: number;
  loop?: boolean;
  draw: Drawer;
}

export const W = ACCENT.white;
export const ramps = FXR;

// ---------------------------------------------------------------------------
// building blocks
// ---------------------------------------------------------------------------

/** Crescent slash: arc band, thick in the middle, tapering at both ends. */
export function crescent(b: Bitmap, cx: number, cy: number, r: number, thick: number, a0: number, a1: number, ramp: RGBA[], heat = 1) {
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      let a = Math.atan2(dy, dx);
      while (a < a0) a += Math.PI * 2;
      if (a > a1) continue;
      const t = (a - a0) / (a1 - a0);
      const th = thick * Math.sin(t * Math.PI);
      if (d > r || d < r - th) continue;
      const k = (d - (r - th)) / Math.max(0.01, th); // 0 inner .. 1 outer rim
      const v = (k * 2.6 + Math.sin(t * Math.PI) * 1.6) * heat;
      b.set(x, y, rampDither(ramp, Math.min(4, v), x, y));
    }
  }
}

/** Radial burst of rays (tapered triangles) around a hot core. */
export function burst(b: Bitmap, cx: number, cy: number, rays: number, rIn: number, rOut: number, width: number, ramp: RGBA[], rot = 0) {
  for (let i = 0; i < rays; i++) {
    const a = rot + (i / rays) * Math.PI * 2;
    const len = rOut * (i % 2 ? 0.62 : 1);
    const tip: [number, number] = [cx + Math.cos(a) * len, cy + Math.sin(a) * len];
    const l: [number, number] = [cx + Math.cos(a + Math.PI / 2) * width + Math.cos(a) * rIn, cy + Math.sin(a + Math.PI / 2) * width + Math.sin(a) * rIn];
    const r: [number, number] = [cx + Math.cos(a - Math.PI / 2) * width + Math.cos(a) * rIn, cy + Math.sin(a - Math.PI / 2) * width + Math.sin(a) * rIn];
    polyFill(b, [l, tip, r], (x, y) => {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / len;
      return rampDither(ramp, 4.2 - d * 3.4, x, y);
    });
  }
  disc(b, cx, cy, rIn + 1, (x, y, d) => rampDither(ramp, 4.4 - d * 1.2, x, y));
}

/** Sparks flying out from a center; t in [0,1]. */
export function sparks(b: Bitmap, cx: number, cy: number, n: number, dist: number, t: number, ramp: RGBA[], seed: number, gravity = 0) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const sp = 0.5 + r() * 0.5;
    const d = dist * sp * Math.sqrt(t);
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d + gravity * t * t;
    const life = 1 - t * (0.7 + r() * 0.4);
    if (life <= 0) continue;
    const c = ramp[Math.max(0, Math.min(4, Math.round(life * 4)))];
    b.set(Math.round(x), Math.round(y), c);
    if (life > 0.6) b.set(Math.round(x - Math.cos(a)), Math.round(y - Math.sin(a)), ramp[Math.max(0, Math.round(life * 4) - 1)]);
  }
}

export function ring(b: Bitmap, cx: number, cy: number, rx: number, ry: number, thick: number, ramp: RGBA[], k = 1) {
  ellipseRing(b, cx, cy, rx, ry, thick, (x, y, a) => rampDither(ramp, (2.4 + Math.sin(a) * 0.8) * k + 0.6, x, y));
}

/** Pointed crystal shard from base to tip, lit on one side. */
export function shard(b: Bitmap, bx: number, by: number, tx: number, ty: number, w: number, ramp: RGBA[]) {
  const ang = Math.atan2(ty - by, tx - bx);
  const nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w;
  const mx = bx + (tx - bx) * 0.3, my = by + (ty - by) * 0.3;
  polyFill(b, [[bx, by], [mx + nx, my + ny], [tx, ty], [mx - nx, my - ny]], (x, y) => {
    const side = (x + 0.5 - bx) * ny - (y + 0.5 - by) * nx;
    return side > 0 ? ramp[3] : ramp[1];
  });
  line(b, bx, by, tx, ty, ramp[4]);
}

export function castCircle(ramp: RGBA[]): FxDef {
  return {
    w: 72, h: 26, n: 6, ms: 70, ax: 0.5, ay: 0.5, loop: true,
    draw: (b, t) => {
      ellipseRing(b, 36, 13, 33, 11, 1.3, (x, y, a) => withAlpha(ramp[(Math.floor((a + t * 6.28) * 3) & 1) ? 3 : 2], 220));
      ellipseRing(b, 36, 13, 24, 8, 1.1, (x, y, a) => withAlpha(ramp[(Math.floor((a - t * 6.28) * 4) & 1) ? 2 : 1], 200));
      for (let k = 0; k < 6; k++) {
        const a = (t * Math.PI * 2) / 3 + (k / 6) * Math.PI * 2;
        b.set(Math.round(36 + Math.cos(a) * 28.5), Math.round(13 + Math.sin(a) * 9.5), ramp[4]);
      }
    },
  };
}

export function slash(ramp: RGBA[], dir = 1): FxDef {
  return {
    w: 72, h: 72, n: 6, ms: 45, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      const grow = [0.45, 0.85, 1, 1, 1, 1][i];
      const heat = [1.3, 1.2, 1, 0.75, 0.5, 0.3][i];
      const a0 = dir > 0 ? -2.5 : 0.6, a1 = a0 + 2.2 * grow;
      if (i < 5) crescent(b, 36, 36, 30, 11 * (1 - t * 0.5), a0, a1, ramp, heat);
      if (i >= 1) sparks(b, 36, 36, 12, 30, t, ramp, 7, 6);
    },
  };
}


/** Flame tongue rising from (x, base): widest a fifth of the way up, licking to a point. */
export function flame(b: Bitmap, x: number, base: number, h: number, w: number, phase: number, ramp: RGBA[], heat = 1) {
  if (h < 1) return;
  for (let y = Math.floor(base - h); y <= base; y++) {
    const t = (base - y) / h; // 0 bottom .. 1 tip
    const sway = Math.sin(phase + t * 3.4) * t * w * 0.7;
    const half = w * (t < 0.2 ? 0.65 + t * 1.75 : (1 - t) / 0.8);
    for (let xx = Math.floor(x - w - 4); xx <= Math.ceil(x + w + 4); xx++) {
      const dx = Math.abs(xx + 0.5 - x - sway);
      if (dx > half) continue;
      const core = 1 - dx / Math.max(0.5, half);
      const v = (core * 2.4 + (1 - t) * 1.7 - 0.3) * heat + (hash2(xx, y, Math.round(phase * 7)) - 0.5) * 0.7;
      if (v < 0.25) continue;
      b.set(xx, y, rampDither(ramp, v, xx, y));
    }
  }
}

/** Embers or motes drifting upward from a band; t in [0,1]. */
export function motes(b: Bitmap, cx: number, cy: number, spread: number, rise: number, n: number, t: number, ramp: RGBA[], seed: number) {
  const r = rng(seed);
  for (let k = 0; k < n; k++) {
    const x0 = cx + (r() - 0.5) * spread, ph = r(), sp = 0.6 + r() * 0.6;
    const tt = (t * sp + ph * 0.4) % 1;
    const life = 1 - tt;
    const x = Math.round(x0 + Math.sin(tt * 7 + k) * 2), y = Math.round(cy - tt * rise);
    b.set(x, y, ramp[Math.max(0, Math.min(4, Math.round(life * 4.4)))]);
    if (life > 0.7 && k % 3 === 0) b.set(x, y + 1, ramp[2]);
  }
}

/** 1-bit mask stamped in one color (glyphs, hieroglyphs). */
export function stamp(b: Bitmap, x: number, y: number, rows: string[], c: RGBA) {
  rows.forEach((row, yy) => [...row].forEach((ch, xx) => ch === '#' && b.set(x + xx, y + yy, c)));
}

/** Tiny 3x4 hieroglyphs for Sunscar curses and carvings. */
export const HIEROGLYPHS = [
  ['.#.', '###', '.#.', '.#.'],
  ['##.', '#..', '###', '..#'],
  ['.#.', '#.#', '.#.', '###'],
  ['#.#', '###', '#.#', '#.#'],
  ['###', '..#', '.##', '.#.'],
  ['.##', '#..', '#..', '.##'],
];

/** 1px outline around opaque pixels. */
export function outlineOf(b: Bitmap, c: RGBA): Bitmap {
  const out = b.clone();
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      if (b.get(x, y) & 255) continue;
      if ((b.get(x - 1, y) | b.get(x + 1, y) | b.get(x, y - 1) | b.get(x, y + 1)) & 255) out.set(x, y, c);
    }
  }
  return out;
}

/**
 * Two swords crossed point-up (the counterattack cue): blades meet above the
 * center, guards and pommels sit at the lower corners. `s` is the half-size.
 */
export function crossedBlades(b: Bitmap, cx: number, cy: number, s: number, ramp: RGBA[], hilt: RGBA[] = ramp) {
  for (const dir of [1, -1]) {
    // blade from the tip (upper corner) down to the guard
    const tx = cx - dir * s, ty = cy - s;
    const len = 2 * s - 3;
    for (let k = 0; k <= len; k++) {
      const x = tx + dir * k, y = ty + k;
      b.set(x, y, k === 0 ? ramp[3] : ramp[4]);
      b.set(x + dir, y, ramp[2]);
    }
    const gx = tx + dir * (len + 1), gy = ty + len + 1;
    for (let k = -2; k <= 2; k++) b.set(gx + dir * k, gy - k, k === 0 ? hilt[4] : hilt[3]);
    b.set(gx + dir, gy + 1, hilt[1]);
    b.set(gx + dir * 2, gy + 2, hilt[1]);
    b.set(gx + dir * 3, gy + 3, hilt[3]);
    b.set(gx + dir * 3 + dir, gy + 3, hilt[2]);
  }
}

/**
 * Straight-ish lens cut from (x0,y0) to (x1,y1), bowed by `bend` px, thickest
 * in the middle with a white-hot core: dagger and claw strikes.
 */
export function cut(b: Bitmap, x0: number, y0: number, x1: number, y1: number, bend: number, thick: number, ramp: RGBA[], heat = 1, reach = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  const steps = Math.ceil(len * 2);
  for (let i = 0; i <= steps * reach; i++) {
    const s = i / steps;
    const th = thick * Math.sin(Math.PI * s);
    const bx = x0 + (x1 - x0) * s + nx * bend * Math.sin(Math.PI * s);
    const by = y0 + (y1 - y0) * s + ny * bend * Math.sin(Math.PI * s);
    for (let o = -th; o <= th; o += 0.5) {
      const x = Math.round(bx + nx * o), y = Math.round(by + ny * o);
      const k = 1 - Math.abs(o) / Math.max(0.5, th);
      b.set(x, y, rampDither(ramp, Math.min(4, (1.2 + k * 2.6 + Math.sin(Math.PI * s)) * heat), x, y));
    }
  }
}
