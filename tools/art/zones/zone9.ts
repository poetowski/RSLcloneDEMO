// Zone "Sleeping Archipelago": Zone 9, named and described by Jakub (2026-11-02,
// docs/DESIGN_DECISIONS.md 5.12): an ancient tropical archipelago on a vast, warm ocean,
// emerald islands rising from turquoise water, once home to a prosperous elven
// civilization, long abandoned; white-stone arches, slender towers, open-air temples and
// bridges between rock formations, graceful and organic, carved with leaves, waves and
// branches, some half under water, some clinging to cliffs; palms through cracked marble,
// flowering vines round columns, roots in forgotten courtyards, small waterfalls from
// overgrown terraces into natural pools.
//
// As painted: late morning, the sun upper left. A vast elven arch stands in the sea dead
// centre on two stacks of rock, a far island seen through it; a bridge runs to it from a
// cliff on the left under a slender tower; on the right a cliff holds an open-air temple
// on overgrown terraces, a waterfall coming down them to the sea. A dome and columns lie
// half drowned in the shallows. The arena is the marble court of a terrace above the
// water, its broken balustrade the far edge: slabs cracked and mossed, a faded inlay of
// waves in its middle, palms and roots coming through.
//
// What moves (my reading, all of it slow): the sea glints, the waterfalls fall, the palms
// sway a little, clouds drift, seabirds circle, butterflies, pollen in the sun. Everything
// his description did not name is a first take.
import { dith, ellipseFill, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, hex, RGBA, rng, withAlpha } from '../raster.ts';
import { MAP_COLS, MAP_ROWS, Painter, PropPlacement, SPAWNS, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));

const SKY = H(['#2a7fd0', '#3289d6', '#3c94dc', '#48a0e2', '#56abe6', '#66b6ea', '#78c0ec', '#8ccaee', '#a2d4ef', '#b8def0', '#cee7f0', '#e0eeee']);
const SUN = H(['#fff4c8', '#fff8dc', '#fffcee', '#ffffff']);
const CLOUD = H(['#9cc4e0', '#c0dcec', '#e0eef4', '#ffffff']);
/** the warm ocean: deep azure out at the horizon, turquoise over the shallows, near white in the foam */
export const SEA = H(['#0b4a78', '#0e5c88', '#116f96', '#1584a2', '#1b9aab', '#28b0b0', '#42c4b4', '#6cd6bc', '#9ce6cc', '#ccf4e2', '#f4fff8']);
/** the elves' white stone, warm where the sun has it */
export const MARBLE = H(['#3e4048', '#5e6068', '#84857f', '#a9a899', '#cbc8b6', '#e4e1cf', '#f4f1e2', '#ffffff']);
/** the islands' limestone */
export const ROCK = H(['#26241f', '#3e3a31', '#585244', '#736c59', '#8f876f', '#aaa187', '#c4bc9f']);
/** the jungle */
export const JUNGLE = H(['#06261c', '#0a3825', '#104c2d', '#176335', '#207a3c', '#2e9245', '#46aa4c', '#6cc25a', '#9cda72']);
export const FLOWER = H(['#7a1a4a', '#b42a68', '#e64a88', '#ff86b0', '#ffc8d8']);
export const TRUNK = H(['#2a1e16', '#44321f', '#5f482c', '#7c623c', '#9a7e50']);
const FAR_ISLE = H(['#5aa8c8', '#62b0c4', '#6cb8c0', '#7cc4c0']);
const MID_ISLE = H(['#1f7a78', '#27897c', '#329a80', '#44aa86']);
/** the court's old marble, dulled to a mid value so champions read on it */
const COURT = H(['#34382f', '#454a3d', '#585c4c', '#6b6e5c', '#7e806c', '#91927c', '#a4a48d', '#b8b8a1']);
const INLAY = H(['#2f6f6c', '#3c807a', '#4d9188']);
const MOSS = H(['#20301c', '#2d4322', '#3c5728', '#4f6c30']);

/** where the far sea meets the sky */
const HZ = 112;
const SUN_X = 92, SUN_Y = 34;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function n1(x: number, s: number, seed: number): number {
  const f = x / s, i = Math.floor(f), t = f - i, u = t * t * (3 - 2 * t);
  return hash2(i, 0, seed) * (1 - u) + hash2(i + 1, 0, seed) * u;
}
function vnoise(x: number, y: number, cell: number, seed: number): number {
  const fx = x / cell, fy = y / cell;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const shade = (R: RGBA[], v: number, x: number, y: number) => rampDither(R, clamp(v, 0, R.length - 1), x, y);

// ---------------------------------------------------------------------------
// The elves' stone (shared with the world map)
// ---------------------------------------------------------------------------

/** A curved limb of stone or wood: discs along a line, lit from the upper left. */
export function limb(b: Bitmap, pts: [number, number, number][], R: RGBA[], base: number, seed: number) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0, r0] = pts[i], [x1, y1, r1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, r = r0 + (r1 - r0) * t;
      ellipseFill(b, x, y, r, r, (px, py) => shade(R, base - ((px + 0.5 - x) + (py + 0.5 - y)) * (1.5 / Math.max(1, r)) + (hash2(px, py, seed) - 0.5) * 0.3, px, py));
    }
  }
}

/** A leaf of carved stone, its point along `a` (radians). */
export function stoneLeaf(b: Bitmap, x: number, y: number, a: number, len: number, w: number, R: RGBA[], base: number) {
  const ca = Math.cos(a), sa = Math.sin(a);
  const P = (u: number, v: number): [number, number] => [x + ca * u - sa * v, y + sa * u + ca * v];
  polyFill(b, [P(0, 0), P(len * 0.4, w), P(len, 0), P(len * 0.4, -w)], (px, py) => shade(R, base - (px - x) * 0.14 - (py - y) * 0.14, px, py));
}

/** The great pointed arch: two sweeping ribs, thinning as they rise, carved in bands, meeting under a leaf. */
export function elfArch(b: Bitmap, cx: number, by: number, W: number, Ht: number, w: number, bright: number, seed: number) {
  for (const side of [1, -1]) {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push([cx + side * W * Math.pow(1 - t, 0.72), by - Ht * Math.sin((t * Math.PI) / 2), w * (1 - 0.46 * t)]);
    }
    limb(b, pts, MARBLE, 4.6 + bright, seed);
    // the carving: bands across the rib, a leaf at every other
    if (w >= 3) {
      for (let i = 4; i < 38; i += 4) {
        const [x, y, r] = pts[i], [nx, ny] = pts[i + 1];
        const a = Math.atan2(ny - y, nx - x) + Math.PI / 2;
        for (let u = -r; u <= r; u++) b.set(Math.round(x + Math.cos(a) * u), Math.round(y + Math.sin(a) * u), MARBLE[clamp(Math.round(2 + bright), 0, 7)]);
        if (i % 8 === 0) stoneLeaf(b, x + 1, y, a + (side > 0 ? 0 : Math.PI), r * 1.2, r * 0.5, MARBLE, 6 + bright);
      }
    }
  }
  const top = by - Ht;
  stoneLeaf(b, cx, top + 2, -Math.PI / 2, w * 2.4, w * 0.7, MARBLE, 5.4 + bright);
  stoneLeaf(b, cx, top + 3, -Math.PI / 2 - 1, w * 1.6, w * 0.45, MARBLE, 5.8 + bright);
  stoneLeaf(b, cx, top + 3, -Math.PI / 2 + 1, w * 1.6, w * 0.45, MARBLE, 4 + bright);
}

/** A slender tower: tapering, ringed, windows like slits, a roof like a closed bud. */
export function elfTower(b: Bitmap, cx: number, by: number, h: number, w: number, bright: number, seed: number) {
  for (let y = by - h; y <= by; y++) {
    const t = (by - y) / h;
    const hw = w * (1 - t * 0.42) + (Math.abs(((by - y) % Math.ceil(h / 4)) - 1) < 1 ? 1 : 0);
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const u = (x + 0.5 - cx) / hw;
      b.set(x, y, shade(MARBLE, 5 - u * 2.4 + bright + (hash2(x, y, seed) - 0.5) * 0.3, x, y));
    }
  }
  for (const k of [0.32, 0.56, 0.78]) {
    const y = Math.round(by - h * k);
    for (let d = 0; d < Math.max(2, h * 0.07); d++) b.set(Math.round(cx), y + d, MARBLE[0]);
  }
  const top = by - h;
  const rw = w * 1.1, rh = Math.max(6, w * 3.4);
  polyFill(b, [[cx, top - rh], [cx + rw * 0.8, top - rh * 0.4], [cx + rw, top], [cx - rw, top], [cx - rw * 0.8, top - rh * 0.4]], (x, y) => shade(MARBLE, 5.6 - (x - cx) * (1.6 / rw) + bright - (top - y) * 0.02, x, y));
}

/** A slender column on a plinth, a capital of leaves; `broken` snaps it off on a slant. */
export function elfColumn(b: Bitmap, cx: number, by: number, h: number, w: number, bright: number, seed: number, broken = false) {
  for (let x = Math.floor(cx - w - 2); x <= cx + w + 2; x++) for (let y = by - 3; y <= by; y++) b.set(x, y, shade(MARBLE, 5 - (x - cx) * (1.8 / (w + 2)) + bright - (y - by + 3) * 0.3, x, y));
  for (let y = by - h; y < by - 3; y++) {
    for (let x = Math.floor(cx - w); x <= cx + w; x++) {
      const u = (x + 0.5 - cx) / w;
      if (broken && y < by - h + (u + 1) * h * 0.14 + (hash2(Math.round(x / 2), 1, seed) - 0.5) * 2) continue;
      // flutes, and a spiral of carved leaf wound round it
      const flute = Math.round((u + 1) * 2.5) % 2 ? -0.5 : 0.2;
      const wind = Math.sin((y + u * w * 2) * 0.42) > 0.86 ? -1 : 0;
      b.set(x, y, shade(MARBLE, 4.9 - u * 2.5 + flute + wind + bright + (hash2(x, y, seed) - 0.5) * 0.3, x, y));
    }
  }
  if (broken) return;
  const top = by - h;
  for (const [a, l] of [[-2.5, w * 1.8], [-0.64, w * 1.8], [-1.57, w * 1.5]] as const) stoneLeaf(b, cx, top + 1, a, l, w * 0.6, MARBLE, 5.4 + bright);
  for (let x = Math.floor(cx - w - 2); x <= cx + w + 2; x++) b.set(x, top - 1, shade(MARBLE, 5.6 - (x - cx) * (1.6 / (w + 2)) + bright, x, top - 1));
}

/** A run of arched spans from (x0,y0) to (x1,y1): a thin deck, carved parapet, openings left clear. */
export function elfBridge(b: Bitmap, x0: number, y0: number, x1: number, y1: number, spans: number, depth: number, bright: number, seed: number) {
  const dir = x1 > x0 ? 1 : -1;
  const len = Math.abs(x1 - x0);
  for (let i = 0; i <= len; i++) {
    const x = x0 + dir * i;
    const t = i / len;
    const y = y0 + (y1 - y0) * t;
    const sp = (t * spans) % 1;
    const under = 2 + depth * (1 - Math.pow(Math.sin(sp * Math.PI), 0.55));
    for (let k = -2; k < under; k++) b.set(x, Math.round(y + k), shade(MARBLE, (k < 0 ? 6 : 4.4 - k * 0.12) + bright + (hash2(x, k, seed) - 0.5) * 0.4, x, Math.round(y + k)));
    if (i % 5 === 0) b.set(x, Math.round(y - 3), MARBLE[clamp(Math.round(5 + bright), 0, 7)]);
    if (under > depth * 0.8) for (let k = Math.ceil(under); k < under + depth * 1.5; k++) b.set(x, Math.round(y + k), shade(MARBLE, 3.6 + bright - (x % 3 === 0 ? 0.6 : 0), x, Math.round(y + k)));
  }
}

/** A palm: a leaning, ringed trunk and a crown of drooping fronds. `sway` moves the crown a little. */
export function palm(b: Bitmap, x: number, y: number, h: number, lean: number, seed: number, sway = 0, bright = 0) {
  const r = rng(seed);
  const tw = Math.max(1.2, h * 0.032);
  const top: [number, number] = [x + lean * h + sway * 0.6, y - h];
  const n = Math.ceil(h);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x + lean * h * t * t + sway * 0.6 * t * t, py = y - h * t, hw = tw * (1.5 - t * 0.7);
    for (let d = Math.floor(-hw); d <= hw; d++) {
      const ring = Math.round(py) % 3 === 0 ? -0.8 : 0;
      b.set(Math.round(px + d), Math.round(py), shade(TRUNK, 2.6 - (d / hw) * 1.4 + ring + bright, Math.round(px + d), Math.round(py)));
    }
  }
  const L = h * 0.52;
  const fronds = [-3.04, -2.62, -2.14, -1.72, -1.34, -0.96, -0.5, -0.1, 0.22, 2.9].map((a) => ({ a: a + (r() - 0.5) * 0.14, l: L * (0.8 + r() * 0.3) }));
  // the far fronds first, darker
  fronds.sort((p, q) => Math.sin(p.a) - Math.sin(q.a)).forEach((f, idx) => {
    const steps = Math.ceil(f.l * 1.5);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = top[0] + Math.cos(f.a) * f.l * t + sway * t;
      const py = top[1] + Math.sin(f.a) * f.l * t * 0.7 + f.l * 0.75 * t * t;
      const lit = (Math.cos(f.a) < 0 ? 5.6 : 3.8) - (idx < 4 ? 1.4 : 0) + bright;
      const leaf = Math.max(1, (1 - t * 0.7) * (L * 0.2));
      if (i % 2 === 0) {
        for (let k = 0; k <= leaf; k++) {
          b.set(Math.round(px + k * 0.25), Math.round(py + k), shade(JUNGLE, lit - k * 0.5, Math.round(px), Math.round(py + k)));
          b.set(Math.round(px - k * 0.25), Math.round(py - k * 0.4), shade(JUNGLE, lit + 0.8, Math.round(px), Math.round(py - k)));
        }
      }
      b.set(Math.round(px), Math.round(py), shade(JUNGLE, lit + 1.8, Math.round(px), Math.round(py)));
    }
  });
}

/** A vine climbing from (x,y0) to y1, wandering round something `w` wide, leaves and flowers on it. */
export function vine(b: Bitmap, x: number, y0: number, y1: number, w: number, seed: number, flowers = 0.12) {
  const dy = y1 > y0 ? 1 : -1;
  for (let y = y0; y !== y1; y += dy) {
    const px = Math.round(x + Math.sin(y * 0.28 + seed) * w);
    b.set(px, y, JUNGLE[Math.sin(y * 0.28 + seed) > 0 ? 3 : 2]);
    const roll = hash2(px, y, seed);
    if (roll < 0.34) b.set(px + (hash2(y, 1, seed) < 0.5 ? -1 : 1), y, JUNGLE[4 + Math.floor(hash2(y, 2, seed) * 3)]);
    if (roll > 1 - flowers) {
      const c = FLOWER[2 + Math.floor(hash2(y, 3, seed) * 2)];
      for (const [fx, fy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(px + fx, y + fy, c);
      b.set(px, y, FLOWER[4]);
    }
  }
}

// ---------------------------------------------------------------------------
// The islands
// ---------------------------------------------------------------------------

/** A mass of rock with jungle over it: `top(x)` its skyline, `to` its foot in the sea. */
function isle(b: Bitmap, x0: number, x1: number, top: (x: number) => number, to: number, seed: number, jungleDepth = 22) {
  for (let x = Math.max(0, x0); x < Math.min(640, x1); x++) {
    const t = top(x);
    if (t >= to) continue;
    const green = jungleDepth * (0.5 + n1(x, 17, seed) * 0.9);
    for (let y = Math.ceil(t); y < to; y++) {
      const d = y - t;
      if (d < green) {
        // bumps of canopy, lit from the upper left
        const bump = vnoise(x, y, 7, seed + 1);
        const dx = vnoise(x + 2, y, 7, seed + 1) - bump, dy = vnoise(x, y + 2, 7, seed + 1) - bump;
        b.set(x, y, shade(JUNGLE, 3.4 + (dx + dy) * 16 + (d < 2 ? 2 : 0) - (d / green) * 0.8, x, y));
      } else {
        const slab = Math.floor(x / 12 + n1(y, 29, seed) * 2);
        const v = 3 + hash2(slab, 0, seed) * 2.2 + (Math.sin((y + x * 0.3) * 0.6) > 0.76 ? -0.9 : 0) - ((y - t) / (to - t)) * 1 + (hash2(x, y, seed) - 0.5) * 0.3;
        b.set(x, y, shade(ROCK, v, x, y));
        // ivy hanging from the green over the rock
        if (d < green + 7 && hash2(Math.floor(x / 2), 5, seed) * 9 > d - green + 2) b.set(x, y, JUNGLE[2 + (x % 2)]);
      }
    }
    if (to < 200) for (let k = 0; k < 2; k++) if (dith(x, to + k, 0.7 - k * 0.3)) b.set(x, to + k, SEA[9]);
  }
}

/** A stack of rock standing in the sea, foam at its foot, a shag of green on it. */
function stack(b: Bitmap, cx: number, by: number, rw: number, rh: number, seed: number) {
  isle(b, cx - rw, cx + rw, (x) => {
    const k = Math.abs(x + 0.5 - cx) / rw;
    return by - rh * Math.pow(1 - k * k, 0.42) * (0.82 + n1(x, 9, seed) * 0.28);
  }, by, seed, 7);
}

function hazeHill(b: Bitmap, cx: number, by: number, rw: number, rh: number, R: RGBA[], seed: number) {
  for (let x = Math.max(0, Math.floor(cx - rw)); x < Math.min(640, cx + rw); x++) {
    const k = Math.abs(x + 0.5 - cx) / rw;
    const t = by - rh * Math.pow(1 - k * k, 0.7) * (0.76 + n1(x, 13, seed) * 0.38);
    for (let y = Math.ceil(t); y <= by; y++) {
      b.set(x, y, rampDither(R, clamp(1.6 + (x < cx ? 0.8 : -0.5) + (y - t < 1 ? 1 : 0) - ((y - t) / 20) * 0.8, 0, R.length - 1), x, y));
    }
  }
}

// ---------------------------------------------------------------------------
// Backdrop
// ---------------------------------------------------------------------------

const ARCH = { x: 320, by: 168, W: 96, Ht: 124, w: 11 };

function sea(b: Bitmap) {
  for (let y = HZ; y < 200; y++) {
    const t = (y - HZ) / (196 - HZ);
    for (let x = 0; x < 640; x++) {
      // long lazy swells, wider toward us; the sun's road under the sun
      const swell = Math.sin(y * (1.6 - t) * 1.3 + vnoise(x, y * 5, 34, 901) * 6) * (0.3 + t * 0.5);
      const road = Math.max(0, 1 - Math.abs(x - SUN_X - t * 30) / (24 + t * 70)) * (0.4 + (1 - t) * 0.4);
      const v = 0.7 + t * 5.4 + swell + road * 2.6;
      b.set(x, y, shade(SEA, v, x, y));
    }
  }
}

/** The dome of a drowned temple and its columns, half under the sea, the water lapping at them. */
function drowned(b: Bitmap, cx: number, wl: number) {
  // the dome, tipped
  ellipseFill(b, cx, wl, 24, 22, (x, y) => (y > wl ? b.get(x, y) : shade(MARBLE, 4.6 - (x - cx) * 0.09 - (y - wl) * -0.02 + (Math.round((x - cx) / 6) % 2 ? -0.5 : 0) + (hash2(x, y, 911) - 0.5) * 0.3, x, y)));
  vine(b, cx - 12, wl - 16, wl, 2, 912, 0.08);
  elfColumn(b, cx + 40, wl + 2, 34, 3.4, -0.3, 913, true);
  elfColumn(b, cx + 56, wl + 2, 18, 3.4, -0.4, 914, true);
  elfColumn(b, cx - 42, wl + 2, 26, 3.2, -0.4, 915, true);
  for (let x = cx - 48; x < cx + 64; x++) {
    if (dith(x, wl + 1, 0.8)) b.set(x, wl + 1, SEA[9]);
    if (dith(x, wl + 2, 0.4)) b.set(x, wl + 2, SEA[8]);
  }
}

/** The open-air temple on the right cliff: stepped terraces in green, slender columns, a roof like a leaf turned over. */
function temple(b: Bitmap, cx: number, by: number) {
  // terraces coming down the cliff in steps
  for (const [x, y, w] of [[cx - 18, by + 8, 76], [cx - 34, by + 24, 60], [cx - 46, by + 42, 42]] as const) {
    for (let px = x - w / 2; px < x + w / 2; px++) {
      for (let k = 0; k < 7; k++) b.set(Math.round(px), y + k, shade(MARBLE, (k < 2 ? 5.6 : 3.2 - k * 0.1) - (px - x) * 0.012 + (hash2(Math.round(px), k, 921) - 0.5) * 0.4, Math.round(px), y + k));
      // overgrown
      if (n1(px, 9, 922 + y) > 0.48) {
        const d = Math.floor(n1(px, 5, 923 + y) * 8);
        for (let k = -3; k < d; k++) b.set(Math.round(px), y + k, JUNGLE[3 + (k < 0 ? 2 : 0) + (Math.round(px) % 2)]);
      }
    }
  }
  for (let i = 0; i < 6; i++) elfColumn(b, cx - 28 + i * 11, by + 8, 26, 2.2, 0.2, 930 + i, i === 5);
  // the roof
  polyFill(b, [[cx - 40, by - 16], [cx - 8, by - 26], [cx - 2, by - 38], [cx + 4, by - 26], [cx + 36, by - 16], [cx + 28, by - 13], [cx - 32, by - 13]], (x, y) => shade(MARBLE, 6 - (x - cx) * 0.04 + (y - by + 16) * -0.08, x, y));
  for (let x = cx - 32; x < cx + 28; x += 6) b.set(x, by - 14, MARBLE[2]);
  vine(b, cx - 28, by - 14, by + 8, 1.6, 941, 0.12);
  vine(b, cx + 16, by - 14, by + 8, 1.6, 942, 0.12);
}

const FALL_FAR = { x: 482, y0: 128, y1: 170 };

function backdropBase(): Bitmap {
  const b = new Bitmap(640, 200);
  for (let y = 0; y < HZ; y++) {
    for (let x = 0; x < 640; x++) {
      const glow = Math.max(0, 1 - Math.hypot(x - SUN_X, (y - SUN_Y) * 1.1) / 170);
      b.set(x, y, shade(SKY, Math.pow(y / HZ, 1.2) * (SKY.length - 1) + glow * 3, x, y));
    }
  }
  // the sun and its halo
  ellipseFill(b, SUN_X, SUN_Y, 34, 34, (x, y, d) => (dith(x, y, (1 - d) * 0.8) ? shade(SKY, 11, x, y) : b.get(x, y)));
  ellipseFill(b, SUN_X, SUN_Y, 10, 10, (x, y, d) => rampDither(SUN, 3 - d * 1.6, x, y));
  // the horizon's haze
  sea(b);
  // the far islands, blue with distance; one seen through the arch, with a thread of a spire
  for (const [cx, rw, rh, seed] of [[34, 46, 12, 951], [170, 36, 8, 952], [330, 30, 16, 953], [404, 26, 7, 954], [612, 52, 13, 955]] as const) hazeHill(b, cx, HZ + 1, rw, rh, FAR_ISLE, seed);
  for (let y = HZ - 28; y < HZ - 10; y++) {
    b.set(330, y, FAR_ISLE[3]);
    b.set(331, y, FAR_ISLE[0]);
  }
  // nearer ones, emerald going blue
  hazeHill(b, 262, 128, 32, 18, MID_ISLE, 956);
  hazeHill(b, 392, 132, 28, 22, MID_ISLE, 957);
  // the left cliff, the tower on it, a second out on its stack
  isle(b, -4, 150, (x) => 72 + Math.pow(x / 150, 3) * 92 + (n1(x, 23, 961) - 0.5) * 12 + (n1(x, 7, 962) - 0.5) * 4, 172, 963, 30);
  elfTower(b, 58, 84, 42, 5.5, 0, 964);
  palm(b, 26, 80, 30, -0.2, 965);
  palm(b, 100, 96, 26, 0.24, 966);
  vine(b, 56, 84, 60, 3, 967, 0.1);
  // the drowned temple in the shallows on the left
  drowned(b, 186, 178);
  // the right cliff with the temple clinging to it
  isle(b, 468, 644, (x) => 62 + Math.pow((644 - x) / 176, 3) * 112 + (n1(x, 27, 971) - 0.5) * 12 + (n1(x, 8, 972) - 0.5) * 4, 174, 973, 26);
  temple(b, 572, 92);
  palm(b, 626, 72, 28, 0.2, 974);
  palm(b, 512, 118, 24, -0.22, 975);
  // the great arch on its stacks; the bridges run in to it
  stack(b, ARCH.x - ARCH.W, ARCH.by, 30, 34, 981);
  stack(b, ARCH.x + ARCH.W, ARCH.by, 28, 30, 982);
  elfBridge(b, 118, 118, ARCH.x - ARCH.W - 6, 126, 3, 12, -0.4, 983);
  elfBridge(b, 484, 116, ARCH.x + ARCH.W + 6, 124, 2, 11, -0.6, 984);
  // the inner rib first, a little in shadow, and the stone tracery that ties the two together
  const rib = (W: number, Ht: number, t: number, side: number): [number, number] => [ARCH.x + side * W * Math.pow(1 - t, 0.72), ARCH.by - 16 - Ht * Math.sin((t * Math.PI) / 2)];
  elfArch(b, ARCH.x, ARCH.by - 16, ARCH.W - 24, ARCH.Ht - 40, 3.6, -1.2, 998);
  for (const side of [-1, 1]) {
    for (const t of [0.2, 0.36, 0.52, 0.68, 0.84]) {
      const [x0, y0] = rib(ARCH.W, ARCH.Ht - 16, t, side), [x1, y1] = rib(ARCH.W - 24, ARCH.Ht - 40, t, side);
      limb(b, [[x0, y0, 1.6], [x1, y1, 1.4]], MARBLE, 3.4, 999);
    }
  }
  elfArch(b, ARCH.x, ARCH.by - 16, ARCH.W, ARCH.Ht - 16, ARCH.w, 0, 985);
  elfTower(b, ARCH.x - ARCH.W - 18, 140, 26, 3.2, -0.3, 986);
  vine(b, ARCH.x - ARCH.W + 6, 152, 104, 3, 987, 0.1);
  vine(b, ARCH.x + ARCH.W - 8, 152, 112, 3, 988, 0.12);
  vine(b, ARCH.x - 46, 58, 84, 1.2, 989, 0.14);
  vine(b, ARCH.x + 52, 62, 92, 1.2, 990, 0.14);
  // the arch's reflection, in long breaks on the water
  for (let y = ARCH.by + 1; y < 190; y++) {
    for (const leg of [-1, 1]) {
      for (let dx = -9; dx <= 9; dx++) {
        const x = ARCH.x + leg * ARCH.W + dx + Math.round(Math.sin(y * 0.8) * 2);
        if (dith(x, y, 0.45 * (1 - (y - ARCH.by) / 24))) b.set(x, y, leg < 0 ? MARBLE[4] : MARBLE[3]);
      }
    }
  }
  // a column drowned on the right
  elfColumn(b, 430, 182, 30, 3, -0.4, 991, true);
  for (let x = 420; x < 442; x++) if (dith(x, 183, 0.8)) b.set(x, 183, SEA[9]);
  // the terrace's far edge: a low wall, and what is left of its balustrade
  for (let x = 0; x < 640; x++) {
    const top = 186 + (n1(x, 44, 992) - 0.5) * 3;
    for (let y = Math.ceil(top); y < 200; y++) b.set(x, y, shade(COURT, y - top < 1.5 ? 7 : 3.2 - (y - top) * 0.1 + (hash2(x, y, 993) - 0.5) * 0.4, x, y));
  }
  for (let x = 6; x < 636; x += 11) {
    // it is gone in the middle, where the view is, and broken away here and there
    if (Math.abs(x - 320) < 74 || vnoise(x, 0, 40, 994) > 0.66) continue;
    const by = 186, h = 11;
    for (let y = by - h; y < by; y++) {
      const hw = 1.2 + Math.abs(Math.sin(((y - by + h) / h) * Math.PI)) * 1.6;
      for (let d = Math.floor(-hw); d <= hw; d++) b.set(x + d, y, shade(COURT, 6 - (d / hw) * 2.2, x + d, y));
    }
  }
  for (let x = 0; x < 640; x++) {
    if (Math.abs(x - 320) < 80 || vnoise(x, 0, 40, 994) > 0.62) continue;
    for (let y = 172; y < 175; y++) b.set(x, y, shade(COURT, y === 172 ? 7 : 4.4, x, y));
  }
  // jungle coming over the wall at both ends
  for (const [x0, x1, seed] of [[0, 120, 995], [520, 640, 996]] as const) {
    for (let x = x0; x < x1; x++) {
      const k = x0 === 0 ? 1 - x / x1 : (x - x0) / (x1 - x0);
      const t = 190 - k * 26 * (0.5 + n1(x, 13, seed) * 0.9);
      for (let y = Math.ceil(t); y < 196; y++) {
        const bump = vnoise(x, y, 5, seed);
        b.set(x, y, shade(JUNGLE, 3 + (vnoise(x + 2, y + 2, 5, seed) - bump) * -14 + (y - t < 1.5 ? 1.6 : 0), x, y));
      }
    }
  }
  return b;
}

let cached: Bitmap | undefined;
const backdrop = () => (cached ??= backdropBase());

// ---------------------------------------------------------------------------
// The floor
// ---------------------------------------------------------------------------

const VY = 96, PK = 0.0058;
const pscale = (y: number) => Math.max(0.05, (y - VY) * PK);
const world = (x: number, y: number): [number, number] => [(x - 320) / pscale(y), Math.log(Math.max(0.5, y - VY)) / PK];
const FLOOR = { w: 640, h: 168 };
const SPOTS = [...SPAWNS.player, ...SPAWNS.enemy];
/** how quiet: 1 under a champion's feet, 0 well away */
const quiet = (x: number, y: number) => Math.max(...SPOTS.map(([fx, fy]) => 1 - smooth(0.8, 1.7, Math.hypot((x - fx) / 44, (y - fy) / 22))));

function floorGround(): Bitmap {
  const { w, h } = FLOOR;
  const b = new Bitmap(w, h);
  for (let y = 0; y < h; y++) {
    const Y = y + 192;
    for (let x = 0; x < w; x++) {
      const [u, v] = world(x, Y);
      const q = quiet(x, Y);
      const cu = 46, cv = 34;
      const row = Math.floor(v / cv);
      const uu = u + (row % 2) * (cu / 2);
      const col = Math.floor(uu / cu);
      const fu = uu / cu - col, fv = v / cv - row;
      const joint = Math.min(fu, 1 - fu) * cu < 1.1 || Math.min(fv, 1 - fv) * cv < 1.2;
      const lip = fu * cu < 2.2 || fv * cv < 2.2;
      const slab = hash2(col, row, 1001);
      // old marble, stained in long soft clouds; the slabs differ little where champions stand
      let val = 3.5 + (slab - 0.5) * 1.3 * (1 - q * 0.6) + (vnoise(u, v, 110, 1002) - 0.5) * 1.5 * (1 - q * 0.5) + (hash2(x, Y, 1003) - 0.5) * 0.4;
      if (joint) val -= 1.5 * (1 - q * 0.55);
      else if (lip) val += 0.3;
      // cracks
      const c = Math.abs(vnoise(u, v, 60, 1004) - 0.5);
      if (c < 0.012 && slab > 0.3) val -= 1.6 * (1 - q * 0.7);
      let colr = shade(COURT, val, x, Y);
      // the inlay: rings of waves in the court's middle, faded
      const ri = Math.hypot((x - 320) / 118, (Y - 268) / 44);
      const wave = Math.sin(Math.atan2((Y - 268) / 44, (x - 320) / 118) * 24) * 0.035;
      if (Math.abs(ri - 0.86 + wave) < 0.035 || Math.abs(ri - 0.6 - wave) < 0.028 || (ri < 0.2 && Math.sin(Math.atan2(Y - 268, x - 320) * 8) > 0.2 && ri > 0.05)) {
        if (dith(x, Y, 0.6 * (1 - q * 0.5) * (0.5 + vnoise(u, v, 40, 1005)))) colr = shade(INLAY, 1 + (hash2(x, Y, 1006) - 0.5) * 1.6, x, Y);
      }
      // moss in the joints and spreading from the edges, grass where the slabs are gone
      const wild = vnoise(u, v, 90, 1007) + Math.max(Math.abs(x - 320) / 320 - 0.5, 0) * 0.9 + (Y - 330) / 300;
      const mossy = smooth(0.62, 0.86, wild) * (1 - q);
      if (joint && wild > 0.42 && q < 0.5) colr = shade(MOSS, 1.6 + hash2(x, Y, 1008) * 1.6, x, Y);
      else if (mossy > 0 && dith(x, Y, mossy * (0.5 + vnoise(x, Y * 1.6, 7, 1009) * 0.8))) colr = shade(MOSS, 1 + vnoise(x, Y, 6, 1010) * 2.6, x, Y);
      b.set(x, y, colr);
    }
  }
  // tufts and small flowers, none where the champions stand
  const r = rng(1011);
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(r() * w), y = Math.floor(Math.pow(r(), 0.8) * (h - 4)) + 2;
    const roll = r();
    if (quiet(x, y + 192) > 0.12 || vnoise(x, y, 40, 1012) < 0.46) continue;
    if (roll < 0.86) {
      b.set(x, y, JUNGLE[3 + Math.floor(r() * 3)]);
      b.set(x, y - 1, JUNGLE[4 + Math.floor(r() * 3)]);
    } else {
      b.set(x, y, FLOWER[2 + Math.floor(r() * 3)]);
    }
  }
  return b;
}

/** Roots running out over the marble from one side, forking, thinning away. */
function roots(w: number, hh: number, n: number, seed: number): Bitmap {
  const b = new Bitmap(w, hh);
  const r = rng(seed);
  const oy = hh * 0.4;
  for (let i = 0; i < n; i++) {
    const a = ((i / (n - 1)) - 0.5) * 1.5 + (r() - 0.5) * 0.3;
    const len = (w - 8) * (0.35 + r() * 0.65);
    const ph = r() * 6;
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      pts.push([3 + Math.cos(a) * len * t, oy + Math.sin(a) * len * t + Math.sin(t * 9 + ph) * 5 * t, 2.1 * (1 - t * 0.82)]);
    }
    limb(b, pts.map(([x, y, rr]) => [clamp(x, 2, w - 3), clamp(y, 2, hh - 3), rr]), TRUNK, 2.6, seed + i);
  }
  return b;
}

/** A column with flowering vines wound round it, standing on the terrace. */
function vineColumn(h: number, w: number, seed: number, broken: boolean): Bitmap {
  const bw = Math.ceil(w * 2 + 26), hh = h + 14;
  const b = new Bitmap(bw, hh);
  const by = hh - 3;
  ellipseFill(b, bw / 2 + 3, by, w * 2.4, 3, (x, y, d) => (dith(x, y, (1 - d) * 1.4) ? withAlpha(COURT[0], 200) : 0));
  elfColumn(b, bw / 2, by, h, w, -0.2, seed, broken);
  vine(b, bw / 2 - 1, by, by - h + 4, w + 1, seed + 1, 0.16);
  vine(b, bw / 2 + 1, by, Math.round(by - h * 0.7), w + 0.5, seed + 2, 0.14);
  return b;
}

/** Slabs and drums of fallen columns, half in the grass. */
function rubble(seed: number): Bitmap {
  const b = new Bitmap(96, 36);
  const drum = (cx: number, cy: number, l: number, r: number) => {
    limb(b, [[cx - l, cy, r], [cx + l, cy - 1, r]], MARBLE, 3.8, seed);
    ellipseFill(b, cx + l, cy - 1, r * 0.55, r, (x, y) => shade(MARBLE, 5.4 - (y - cy) * 0.3, x, y));
  };
  drum(30, 24, 18, 6.5);
  drum(68, 28, 12, 5);
  vine(b, 14, 30, 16, 3, seed + 1, 0.2);
  vine(b, 62, 33, 22, 3, seed + 2, 0.18);
  for (let x = 2; x < 94; x++) {
    const t = 33 - n1(x, 7, seed + 3) * 5;
    for (let y = Math.ceil(t); y < 36; y++) b.set(x, y, JUNGLE[2 + Math.floor(hash2(x, y, seed) * 3)]);
  }
  return b;
}

const TERRACE = { w: 132, h: 134 };

/** An overgrown terrace at the arena's right edge, a little waterfall coming off it into a natural pool. */
function terrace(): Bitmap {
  const { w, h } = TERRACE;
  const b = new Bitmap(w, h);
  isle(b, 0, w, (x) => 34 + Math.pow(1 - x / w, 2) * 62 + (n1(x, 13, 1021) - 0.5) * 7, 106, 1022, 12);
  // carved edges of old stone, in steps
  for (const [x0, x1, y] of [[34, 132, 52], [18, 86, 74], [8, 66, 92]] as const) {
    for (let x = x0; x < x1; x++) {
      for (let k = 0; k < 5; k++) b.set(x, y + k, shade(MARBLE, (k < 2 ? 5 : 2.6) + (Math.round(x / 7) % 2 ? -0.3 : 0.2) + (hash2(x, k, 1023) - 0.5) * 0.4, x, y + k));
      if (n1(x, 8, 1024 + y) > 0.55) for (let k = -2; k < 3; k++) b.set(x, y + k, JUNGLE[3 + (k < 0 ? 2 : 0) + (x % 2)]);
    }
  }
  vine(b, 60, 52, 92, 2, 1026, 0.14);
  vine(b, 104, 40, 80, 2, 1027, 0.16);
  palm(b, 104, 40, 34, 0.16, 1028);
  // the pool: dark at its middle, turquoise at its rim, a lip of wet stone
  ellipseFill(b, 62, 116, 58, 15, (x, y, d) => (d > 0.9 ? shade(ROCK, 3.2 - (y - 116) * 0.12, x, y) : shade(SEA, 3.6 + d * 2.6 + (y - 116) * 0.1, x, y)));
  return b;
}

// ---------------------------------------------------------------------------
// What moves
// ---------------------------------------------------------------------------

/** A waterfall: bright threads running down, spray at its foot (a loop). */
function fall(w: number, hh: number, n: number, seed: number): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    for (let x = 0; x < w; x++) {
      const k = Math.abs(x + 0.5 - w / 2) / (w / 2);
      if (k > 0.86) continue;
      const speed = hash2(x, 1, seed);
      for (let y = 0; y < hh - 3; y++) {
        const ph = ((y - (i / n) * hh * (speed > 0.5 ? 2 : 1)) / 9 + hash2(x, 0, seed) * 4) % 1;
        const p = ph < 0 ? ph + 1 : ph;
        b.set(x, y, p < 0.3 ? SEA[10] : p < 0.6 ? SEA[9] : SEA[7 + (x % 2)]);
      }
    }
    for (let k = 0; k < w * 2; k++) {
      const x = Math.round(hash2(k, i, seed) * (w - 1)), y = hh - 1 - Math.floor(hash2(k, i + 7, seed) * 5);
      b.set(x, y, SEA[10]);
    }
    out.push(b);
  }
  return out;
}

/** The sea's glints: small sparks opening and closing on the open water, each in its own time. */
function seaGlints(): Bitmap[] {
  const base = backdrop();
  const water = new Set(SEA.map((c) => c));
  const r = rng(1031);
  const list: { x: number; y: number; ph: number; big: boolean }[] = [];
  for (let tries = 0; tries < 4000 && list.length < 60; tries++) {
    const x = Math.floor(r() * 640), y = HZ + 1 + Math.floor(r() * 70);
    if (!water.has(base.get(x, y))) continue;
    if (!water.has(base.get(x + 2, y)) || !water.has(base.get(x - 2, y))) continue;
    list.push({ x, y, ph: r(), big: r() < 0.25 });
  }
  const out: Bitmap[] = [];
  const n = 36;
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(640, 200);
    for (const g of list) {
      const t = (i / n + g.ph) % 1;
      if (t > 0.16) continue;
      const k = Math.sin((t / 0.16) * Math.PI);
      b.set(g.x, g.y, SEA[10]);
      if (k > 0.5) {
        b.set(g.x - 1, g.y, SEA[9]);
        b.set(g.x + 1, g.y, SEA[9]);
        if (g.big) {
          b.set(g.x - 2, g.y, SEA[8]);
          b.set(g.x + 2, g.y, SEA[8]);
        }
      }
    }
    out.push(b);
  }
  return out;
}

function cloud(w: number, hh: number, seed: number): Bitmap[] {
  const b = new Bitmap(w, hh);
  const r = rng(seed);
  const puffs = Array.from({ length: Math.round(w / 9) }, (_, i) => ({ x: 8 + (i / Math.round(w / 9)) * (w - 16), rr: 3 + Math.sin((i / Math.round(w / 9)) * Math.PI) * hh * 0.42 * (0.7 + r() * 0.5) }));
  const base = hh - 2;
  for (const p of puffs) {
    ellipseFill(b, p.x, base - p.rr * 0.55, p.rr * 1.2, p.rr, (x, y) => {
      if (y > base) return b.get(x, y);
      const v = 3 - ((y - (base - p.rr * 1.5)) / (p.rr * 1.5)) * 2 - (x - p.x) * 0.015;
      return rampDither(CLOUD, clamp(v, 0, 3), x, y);
    });
  }
  return [b];
}

/** A white seabird gliding: wings up, level, down (the runtime circles them, ZoneDef.birds). */
function seabirds(): Bitmap[] {
  return [3, 1, -1, 1].map((lift) => {
    const b = new Bitmap(17, 9);
    for (let i = 0; i <= 7; i++) {
      const y = Math.round(4 - (lift * (i / 7)) + (i > 5 ? 1 : 0));
      b.set(8 - i, y, i > 5 ? MARBLE[2] : MARBLE[7]);
      b.set(8 + i, y, i > 5 ? MARBLE[1] : MARBLE[6]);
    }
    b.set(8, 5, MARBLE[6]);
    b.set(9, 4, MARBLE[4]);
    return b;
  });
}

/** A palm for the arena, swaying a little (a loop of `n` frames, there and back). */
function swayingPalm(h: number, lean: number, seed: number, w: number): Bitmap[] {
  const hh = h + Math.ceil(h * 0.52) + 4;
  const n = 6;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    const sway = Math.round(Math.sin((i / n) * Math.PI * 2) * 2);
    palm(b, w / 2 - lean * h * 0.5, hh - 2, h, lean, seed, sway);
    out.push(b);
  }
  return out;
}

/** Fronds hanging into the frame from a corner, clear of the sun. */
function cornerFronds(): Bitmap[] {
  const b = new Bitmap(70, 50);
  const frond = (x: number, y: number, a: number, l: number, seed: number) => {
    const steps = Math.ceil(l * 1.5);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x + Math.cos(a) * l * t, py = y + Math.sin(a) * l * t + l * 0.5 * t * t;
      const leaf = (1 - t * 0.6) * 11;
      if (i % 2 === 0) for (let k = 0; k <= leaf; k++) b.set(Math.round(px - k * 0.2), Math.round(py + k), shade(JUNGLE, 2.2 - k * 0.1 + (hash2(i, k, seed) - 0.5) * 0.5, Math.round(px), Math.round(py + k)));
      b.set(Math.round(px), Math.round(py), JUNGLE[3]);
    }
  };
  frond(-4, 0, 0.16, 50, 1042);
  frond(-6, 12, 0.5, 32, 1043);
  return [b];
}

/** Flowering undergrowth in the near corner. */
function cornerBush(): Bitmap[] {
  const b = new Bitmap(120, 54);
  for (let x = 0; x < 120; x++) {
    const k = x / 120;
    const t = 54 - k * k * 46 - n1(x, 11, 1051) * 9;
    for (let y = Math.max(0, Math.ceil(t)); y < 54; y++) {
      const bump = vnoise(x, y, 6, 1052);
      b.set(x, y, shade(JUNGLE, 1.8 + (vnoise(x + 2, y + 2, 6, 1052) - bump) * -12 + (y - t < 1.5 ? 1.4 : 0), x, y));
      if (hash2(x, y, 1053) > 0.982 && y - t > 2) {
        for (const [fx, fy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + fx, y + fy, FLOWER[2 + Math.floor(hash2(x, y, 1054) * 2)]);
        b.set(x, y, FLOWER[4]);
      }
    }
  }
  return [b];
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

function marbleTile(seed0: number): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) b.set(x, y, rampDither(COURT, 3.4 + (hash2(x, y, seed + seed0) - 0.5) * 1.2, x, y));
  };
}
const P: Record<string, Painter> = { court_a: marbleTile(1), court_b: marbleTile(2), court_c: marbleTile(3) };

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const r = rng(1061);
  const plain = ['court_a', 'court_b', 'court_c'];
  for (let row = 6; row < MAP_ROWS; row++) for (let c = 0; c < MAP_COLS; c++) ground[row * MAP_COLS + c] = id(plain[Math.floor(r() * plain.length)]);
  const props: PropPlacement[] = [
    // far: clouds high over everything, the sea's glints, the great waterfall
    { kind: 'cloud_a', x: 200, y: 26, layer: 'far' },
    { kind: 'cloud_b', x: 470, y: 18, layer: 'far' },
    { kind: 'cloud_c', x: 40, y: 36, layer: 'far' },
    { kind: 'glints', x: 0, y: 0, layer: 'far' },
    { kind: 'fall_far', x: FALL_FAR.x, y: FALL_FAR.y0, layer: 'far' },
    // floor: the court, then what stands on it, far to near
    { kind: 'ground', x: 0, y: 192, layer: 'floor' },
    { kind: 'column_b', x: 268, y: 206, layer: 'floor' },
    { kind: 'column_b2', x: 372, y: 204, layer: 'floor' },
    { kind: 'column_a', x: 80, y: 212, layer: 'floor' },
    { kind: 'column_a2', x: 566, y: 208, layer: 'floor' },
    { kind: 'palm_a', x: 34, y: 246, layer: 'floor' },
    { kind: 'roots_a', x: 26, y: 256, layer: 'floor' },
    { kind: 'palm_b', x: 344, y: 218, layer: 'floor' },
    { kind: 'rubble', x: 322, y: 224, layer: 'floor' },
    { kind: 'terrace', x: TERRACE.w * 0.46 + 508, y: 346, layer: 'floor' },
    { kind: 'fall_near', x: 566, y: 347, layer: 'floor' },
    { kind: 'roots_b', x: 280, y: 342, layer: 'floor' },
    
    { kind: 'rubble2', x: 246, y: 348, layer: 'floor' },
    // fg: fronds hanging in from the top left, flowering undergrowth in the near right corner
    { kind: 'fronds', x: 0, y: 0, layer: 'fg' },
    { kind: 'bush', x: 640, y: 362, layer: 'fg' },
  ];
  const order = { far: 0, back: 1, floor: 2, fg: 3 } as const;
  props.sort((a, c) => order[a.layer] - order[c.layer] || (a.layer === 'floor' && (a.kind === 'ground') ? -1 : c.kind === 'ground' ? 1 : a.y - c.y));
  return { ground, wall, props };
}

export const zone9: ZoneArt = {
  id: 'zone9',
  name: 'Sleeping Archipelago',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    cloud_a: cloud(92, 22, 1071),
    cloud_b: cloud(66, 16, 1072),
    cloud_c: cloud(54, 13, 1073),
    glints: seaGlints(),
    fall_far: fall(9, FALL_FAR.y1 - FALL_FAR.y0, 8, 1074),
    fall_near: fall(8, 66, 8, 1075).map((f) => {
      const t = new Bitmap(8, 85);
      t.blit(f, 0, 0);
      return t;
    }),
    ground: [floorGround()],
    column_a: [vineColumn(118, 5.4, 1081, false)],
    column_a2: [vineColumn(132, 5.6, 1082, false)],
    column_b: [vineColumn(38, 5, 1083, true)],
    column_b2: [vineColumn(26, 5, 1084, true)],
    palm_a: swayingPalm(112, 0.14, 1091, 130),
    palm_b: swayingPalm(50, -0.12, 1092, 70),
    roots_a: [roots(120, 34, 7, 1093)],
    roots_b: [roots(150, 28, 7, 1094)],
    rubble: [rubble(1095)],
    rubble2: [rubble(1096)],
    terrace: [terrace()],
    fronds: cornerFronds(),
    bush: cornerBush(),
    bird: seabirds(),
  }),
  kinds: {
    cloud_a: { anchor: [0.5, 1], mode: 'static', drift: { speed: 1.4 } },
    cloud_b: { anchor: [0.5, 1], mode: 'static', drift: { speed: 1 } },
    cloud_c: { anchor: [0.5, 1], mode: 'static', drift: { speed: 1.7 } },
    glints: { anchor: [0, 0], mode: 'loop', ms: 280 },
    fall_far: { anchor: [0.5, 0], mode: 'loop', ms: 110 },
    fall_near: { anchor: [0.5, 1], mode: 'loop', ms: 120 },
    ground: { anchor: [0, 0], mode: 'static' },
    column_a: { anchor: [0.5, 1], mode: 'static' },
    column_a2: { anchor: [0.5, 1], mode: 'static' },
    column_b: { anchor: [0.5, 1], mode: 'static' },
    column_b2: { anchor: [0.5, 1], mode: 'static' },
    palm_a: { anchor: [0.5, 1], mode: 'loop', ms: 700 },
    palm_b: { anchor: [0.5, 1], mode: 'loop', ms: 800 },
    roots_a: { anchor: [0, 0.4], mode: 'static' },
    roots_b: { anchor: [0, 0.4], mode: 'static' },
    rubble: { anchor: [0.5, 1], mode: 'static' },
    rubble2: { anchor: [0.5, 1], mode: 'static' },
    terrace: { anchor: [0.5, 1], mode: 'static' },
    fronds: { anchor: [0, 0], mode: 'static' },
    bush: { anchor: [1, 1], mode: 'static' },
    bird: { anchor: [0.5, 0.5], mode: 'loop', ms: 420 },
  },
  layout,
  horizon: HZ,
};
