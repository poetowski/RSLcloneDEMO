// Zone "Crystal Graveyard": Zone 8, named and described by Jakub (2026-11-01,
// docs/DESIGN_DECISIONS.md 5.11): dark grey and violet mineral rock covered with
// thousands of small crystal fragments, some areas smooth and reflective, others rough
// and dangerous; giant crystal pillars, broken spires, large translucent formations
// embedded in cliffs, clusters of smaller crystals between rocks, ancient crystal
// structures partially buried; flat fields of debris, deep cracks exposing glowing
// mineral veins, small rocky elevations, narrow passages between massive formations,
// collapsed crystalline arches; "a gigantic crystal formation at the centre of the region".
//
// As painted: violet dusk, a small cold moon upper left. The gigantic formation stands
// dead centre, seen through the narrow passage between two massive formations that close
// in from the left and the right. Cliffs behind them hold translucent crystal in their
// faces, a collapsed arch stands on the left. The arena is dark rock under a litter of
// fragments, with a sheet of polished rock in its middle that truly mirrors the formation,
// a glowing crack running from the camera toward its foot, a spire lying broken on the far
// edge, and an ancient cut structure half sunk in the near right.
//
// What moves (my reading, all of it slow): light breathes inside the formation and it lights
// the sky now and then (the zone's `flash`); the veins breathe; fans of split light lie on the
// rock and come and go; glints travel its facets and the fragments on the ground; a few shards
// hang in the air round it; crystal dust hangs and kindles (ambient `shards`). Everything his
// description did not name is a first take (DESIGN_DECISIONS 5.11).
import { dith, ellipseFill, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, hex, mix, RGBA, rng, withAlpha } from '../raster.ts';
import { MAP_COLS, MAP_ROWS, Painter, PropPlacement, SPAWNS, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));

const SKY = H(['#120d2c', '#181136', '#1f1640', '#281b4c', '#322158', '#3e2864', '#4c306e', '#5c3a76', '#6e447c', '#82507e', '#965c7e', '#aa6a7c', '#bc7a7a', '#cc8c7c']);
const MOON = H(['#cfc8ec', '#e2dcf6', '#f2eefc', '#ffffff']);
/** the crystal: nearly black at the root, violet through the body, white along its lit edges */
export const CRYS = H(['#120a24', '#1e1238', '#2c1a50', '#3e2670', '#54368e', '#6e4cae', '#8c6cc8', '#ac94dc', '#ccbcec', '#ece4fa', '#ffffff']);
/** a colder sort, for some of the formations */
export const ICE = H(['#0a1428', '#102640', '#183c5c', '#225678', '#2f7496', '#4894b2', '#6cb4cc', '#98d0e0', '#c4e8f0', '#e8f8fa', '#ffffff']);
/** a rosier sort, rarer */
export const ROSE = H(['#200c26', '#34143a', '#4e1e52', '#6c2c6c', '#8c3e88', '#ac58a2', '#c87cbc', '#dea2d2', '#f0c8e6', '#fae8f4', '#ffffff']);
/** the rock: dark grey going violet */
export const GROUND = H(['#0e0c14', '#16131e', '#1f1b2a', '#2a2536', '#353043', '#413b50', '#4e475e', '#5b546c', '#69617b', '#78708a', '#888099', '#9a92aa']);
export const VEIN = H(['#4a1a6a', '#8a2ca8', '#d04ce0', '#ff8cf0', '#ffd8fa', '#ffffff']);
export const STONEWORK = H(['#1a1630', '#2a2448', '#3e3664', '#564c84', '#7468a4', '#9a8ec4', '#c0b6de', '#e4def4']);
const MISTC = H(['#4e3468', '#5c3c70', '#6c4678']);
const RAMPS = [CRYS, CRYS, ICE, CRYS, ROSE];

const MOON_X = 92, MOON_Y = 36;
/** where the far range meets the sky */
const HZ = 118;
/** the foot and the centre of the gigantic formation */
const GIANT_X = 320, GIANT_Y = 164;

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

// ---------------------------------------------------------------------------
// The crystals
// ---------------------------------------------------------------------------

interface Prism {
  /** foot */
  x: number;
  y: number;
  /** length along its axis and half width at its foot */
  h: number;
  w: number;
  /** radians off the vertical, + to the right */
  lean: number;
  seed: number;
  ramp?: RGBA[];
  /** snapped off: a slanted fracture instead of a point */
  broken?: boolean;
  /** brightness added all over, minus for distance */
  bright?: number;
  /** how much of the sky behind shows through: 0 solid */
  clear?: number;
  /** a soft light inside */
  core?: number;
}

/**
 * A six-sided crystal seen from the side: three faces along its length, the one to the
 * sun light and the far one dark, each brightening toward the tip, a point cut in facets
 * of their own, hard bright edges between faces, flaws running along the inside.
 */
export function prism(b: Bitmap, p: Prism) {
  const R = p.ramp ?? CRYS;
  const ax = Math.sin(p.lean), ay = -Math.cos(p.lean);
  const nx = Math.cos(p.lean), ny = Math.sin(p.lean);
  const r = rng(p.seed);
  // faces: where the edges fall across the width; the point: where it starts and how far off-centre its tip stands
  const e1 = -0.42 + r() * 0.2, e2 = 0.22 + r() * 0.24;
  const shoulder = p.broken ? 1 : 0.76 + r() * 0.1;
  const tipU = (r() - 0.5) * 0.5;
  const taper = 0.1 + r() * 0.14;
  const cut = (r() - 0.5) * 0.5 + (p.lean > 0 ? -0.1 : 0.1);
  const half = p.w * 1.2, reach = p.h + 4;
  const x0 = Math.floor(p.x - Math.abs(ax) * reach - half), x1 = Math.ceil(p.x + Math.abs(ax) * reach + half);
  const y0 = Math.floor(p.y - reach), y1 = Math.ceil(p.y + half);
  const flaw = (u: number, t: number) => vnoise(u * p.w * 0.9, t * p.h * 0.1, 3, p.seed + 1);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - p.x, dy = y + 0.5 - p.y;
      const along = dx * ax + dy * ay, across = dx * nx + dy * ny;
      const t = along / p.h;
      if (t < 0) continue;
      const wid = p.w * (1 - taper * Math.min(t, shoulder));
      let u = across / wid;
      if (Math.abs(u) > 1) {
        if (t <= shoulder) continue;
      }
      let top = false, topFace = 0;
      if (p.broken) {
        // the fracture: a slanted plane, jagged
        const lim = 1 + cut * u * 0.16 + (hash2(Math.round(across * 0.6), 3, p.seed) - 0.5) * 0.05;
        if (t > lim) continue;
        if (t > lim - 0.035) top = true;
      } else if (t > shoulder) {
        const k = (t - shoulder) / (1 - shoulder);
        if (k >= 1) continue;
        // narrowing on to the off-centre tip
        const l = -1 + (tipU + 1) * k, rr = 1 + (tipU - 1) * k;
        if (u < l || u > rr) continue;
        u = (u - l) / Math.max(0.001, rr - l) * 2 - 1;
        top = true;
        topFace = u < -0.15 + k * 0.1 ? 0 : u < 0.35 ? 1 : 2;
      }
      if (Math.abs(u) > 1) continue;
      const face = top ? topFace : u < e1 ? 0 : u < e2 ? 1 : 2;
      // the face's own tone: the one toward the sun is light, the far one dark
      let v = [6.1, 3.9, 2.1][face] + t * 1.4;
      if (top) v += p.broken ? 2.6 : 1.1;
      // inside: flaws streaking along the length, a darker root
      const f = flaw(u, t);
      if (f > 0.74) v += 0.8;
      else if (f < 0.22) v -= 0.6;
      v -= smooth(0.26, 0, t) * 2.2;
      if (p.core) v += p.core * Math.pow(Math.max(0, 1 - Math.abs(u)), 1.4) * Math.sin(Math.min(1, t * 1.15) * Math.PI);
      v += p.bright ?? 0;
      // hard edges between the faces, a bright one facing the sun, a dark rim on the shadow side
      if (!top && Math.abs(u - e1) < 1.2 / wid) v = Math.max(v, 8.4 + (p.bright ?? 0));
      if (!top && Math.abs(u - e2) < 0.8 / wid) v -= 1.2;
      if (u > 1 - 1.1 / wid) v = Math.min(v, 1.4);
      if (u < -1 + 1.1 / wid) v = Math.max(v, 7.2 + (p.bright ?? 0));
      const c = rampDither(R, clamp(v + (hash2(x, y, p.seed) - 0.5) * 0.35, 0, R.length - 1), x, y);
      b.set(x, y, p.clear ? mix(c, b.get(x, y), Math.round(p.clear * 4) / 4) : c);
    }
  }
}

/** A clump of crystals fanning from one root: `n` of them, longest in the middle, drawn outside in. */
export function cluster(b: Bitmap, cx: number, cy: number, n: number, h: number, w: number, spread: number, seed: number, ramp?: RGBA[], bright = 0) {
  const r = rng(seed);
  const list: Prism[] = [];
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) - 0.5 : 0;
    const f = 1 - Math.abs(k) * 1.1;
    list.push({ x: cx + k * w * n * 0.72, y: cy + Math.abs(k) * w * 0.8, h: h * (0.42 + f * 0.58) * (0.82 + r() * 0.36), w: w * (0.7 + f * 0.4), lean: k * spread + (r() - 0.5) * 0.12, seed: seed + i * 13, ramp, bright, broken: r() < 0.18 });
  }
  list.sort((a, c) => Math.abs(c.lean) - Math.abs(a.lean)).forEach((p) => prism(b, p));
}

/** A rock: broad faces, the upper left lit, under a dust of fragments. */
export function rock(b: Bitmap, cx: number, cy: number, rx: number, ry: number, seed: number, lift = 0) {
  for (let y = Math.floor(cy - ry); y <= cy + ry * 0.4; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      const a = Math.atan2(dy, dx);
      const fi = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 7);
      if (Math.hypot(dx, dy) > 0.72 + hash2(fi, 0, seed) * 0.34) continue;
      const v = 4.2 + lift - dx * 2 - dy * 2.2 + (hash2(fi, 1, seed) - 0.5) * 1.3 + (hash2(x, y, seed) - 0.5) * 0.4;
      b.set(x, y, rampDither(GROUND, clamp(v, 0, GROUND.length - 1), x, y));
    }
  }
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------

const VY = 104, PK = 0.0058;
const pscale = (y: number) => Math.max(0.05, (y - VY) * PK);
const world = (x: number, y: number): [number, number] => [(x - 320) / pscale(y), Math.log(Math.max(0.5, y - VY)) / PK];
const FLOOR = { w: 640, h: 168 };
const busy = (x: number, y: number) => [...SPAWNS.player, ...SPAWNS.enemy].some(([fx, fy]) => Math.hypot((x - fx) / 38, (y - fy) / 18) < 1);
/** how quiet: 1 under a champion's feet, 0 well away */
const quiet = (x: number, y: number) => Math.max(...[...SPAWNS.player, ...SPAWNS.enemy].map(([fx, fy]) => 1 - smooth(0.8, 1.7, Math.hypot((x - fx) / 44, (y - fy) / 22))));

/** The near ground's far edge: rising toward both sides, a low place in the middle where the passage opens. */
const slopeTop = (x: number) => 170 - 18 * Math.pow(Math.abs(x - 320) / 320, 1.6) + (n1(x, 41, 141) - 0.5) * 8 + (n1(x, 13, 142) - 0.5) * 3;

/** The rock's plates: how near a point is to a joint between them, and which plate it is on. */
function plates(u: number, v: number, cell: number, seed: number): [number, number] {
  const p = u / cell, q = (v * 2.4) / cell;
  const px = Math.floor(p), py = Math.floor(q);
  let f1 = 9, f2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const d = Math.hypot(p - (px + i + hash2(px + i, py + j, seed)), q - (py + j + hash2(px + i, py + j, seed + 1)));
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = hash2(px + i, py + j, seed + 2);
      } else if (d < f2) f2 = d;
    }
  }
  return [f2 - f1, id];
}

/**
 * The sheet of polished rock: 0 off it, 1 in it. An ellipse out in the arena's middle
 * under the formation; two lesser ones to the sides, clear of where the champions stand.
 */
function polishK(x: number, y: number): number {
  const w = (vnoise(x, y * 2, 26, 721) - 0.5) * 0.5;
  const k = (cx: number, cy: number, rx: number, ry: number) => 1 - smooth(0.74, 1, Math.hypot((x - cx) / rx, (y - cy) / ry) + w);
  return Math.max(k(320, 252, 72, 48), k(586, 240, 42, 16), k(38, 330, 46, 18));
}

/** Rock in plates, each tipped its own way, fine grit in it, darker in the joints. */
function rockValue(x: number, y: number): number {
  const [u, v] = world(x, y);
  const q = quiet(x, y);
  const near = clamp((y - 170) / 190, 0, 1);
  const [e, id] = plates(u, v, 58, 701);
  let val = 4.9 + (id - 0.5) * 1.5 * (1 - q * 0.6) + (vnoise(u, v * 2.4, 170, 705) - 0.5) * 2 * (1 - q * 0.5) + (1 - near) * 0.7;
  if (e < 0.05) val -= 2.2 * (1 - q * 0.6);
  else if (e < 0.11) val += 0.7 * (1 - q * 0.6);
  // the rough parts: broken, gritty
  const rough = smooth(0.52, 0.72, vnoise(u, v * 2.4, 120, 706)) * (1 - q);
  val += (vnoise(x, y * 1.6, 5, 707) - 0.5) * (0.9 + rough * 2.6) + (hash2(x, y, 708) - 0.5) * 0.45;
  return val;
}

function groundColor(x: number, y: number): RGBA {
  return rampDither(GROUND, clamp(rockValue(x, y), 0, GROUND.length - 1), x, y);
}

function rockTile(seed0: number): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) b.set(x, y, rampDither(GROUND, 4.8 + (hash2(x, y, seed + seed0) - 0.5) * 1.2, x, y));
  };
}
const P: Record<string, Painter> = { rock_a: rockTile(1), rock_b: rockTile(2), rock_c: rockTile(3) };

// ---------------------------------------------------------------------------
// Backdrop
// ---------------------------------------------------------------------------

const SKYMOON = [...SKY, ...MOON];

function mistBand(b: Bitmap, y0: number, y1: number, seed: number, k: number) {
  for (let y = y0; y < y1; y++) {
    const env = Math.sin(((y - y0) / (y1 - y0)) * Math.PI);
    for (let x = 0; x < 640; x++) {
      const a = env * k * (0.4 + vnoise(x, y * 2.6, 48, seed) * 0.8);
      if (a > 0.03 && dith(x, y, a)) b.set(x, y, MISTC[a > 0.6 ? 2 : a > 0.34 ? 1 : 0]);
    }
  }
}

/** A far range of spires: rock and crystal alike at this distance, one tone, sun side a shade lighter. */
function range(b: Bitmap, base: number, amp: number, step: number, ramp: RGBA[], seed: number, to: number) {
  const tops: number[] = [];
  let x = -6;
  const r = rng(seed);
  const spikes: [number, number, number][] = [];
  while (x < 650) {
    const w = step * (0.5 + r() * 1.1);
    spikes.push([x, base - amp * (0.15 + r() * r() * 0.85) - (n1(x, 90, seed) - 0.5) * amp * 0.8, w]);
    x += w * 0.8;
  }
  for (let i = 0; i < 640; i++) tops[i] = base + 6;
  for (const [sx, sy, w] of spikes) for (let i = Math.max(0, Math.floor(sx - w)); i < Math.min(640, sx + w); i++) tops[i] = Math.min(tops[i], sy + (Math.abs(i - sx) / w) * (base + 6 - sy));
  for (let i = 0; i < 640; i++) {
    for (let y = Math.ceil(tops[i]); y < to; y++) {
      const lit = i < 639 && tops[i + 1] > tops[i] ? 0 : i > 0 && tops[i - 1] > tops[i] ? 2 : 1;
      b.set(i, y, rampDither(ramp, clamp(lit + ((y - tops[i]) / 22) * (ramp.length - 2), 0, ramp.length - 1), i, y));
    }
  }
}

/** A cliff: a mass of dark rock in strata, tipped and cut, lit along its upper left faces. `top(x)` its skyline. */
function cliff(b: Bitmap, x0: number, x1: number, top: (x: number) => number, to: number, seed: number) {
  for (let x = x0; x < x1; x++) {
    const t = top(x);
    if (t >= to) continue;
    for (let y = Math.ceil(t); y < to; y++) {
      const slab = Math.floor(x / 15 + n1(y, 37, seed) * 2.2);
      const face = hash2(slab, 0, seed);
      const strata = Math.sin((y + x * 0.22) * 0.55 + n1(x, 23, seed + 1) * 5) > 0.72 ? -0.9 : 0;
      const v = 2.2 + face * 2.3 + strata - ((y - t) / 80) * 1.4 + (y - t < 2 ? 1.8 : 0) + (hash2(x, y, seed) - 0.5) * 0.4;
      b.set(x, y, rampDither(GROUND, clamp(v, 0, GROUND.length - 1), x, y));
    }
  }
}

/** A large translucent mass sunk in a cliff's face: the rock shows through the crystal, and bright edges mark its cut. */
function embedded(b: Bitmap, cx: number, cy: number, rw: number, rh: number, tilt: number, seed: number, ramp: RGBA[]) {
  const n = 4;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1) - 0.5;
    prism(b, { x: cx + k * rw * 1.6, y: cy + rh * 0.4 + Math.abs(k) * 6, h: rh * (1.5 - Math.abs(k) * 1.1), w: rw * 0.32, lean: tilt + k * 0.34, seed: seed + i * 7, ramp, clear: 0.5, core: 2, bright: -0.6 });
  }
}

/** The collapsed arch: two legs of cut crystal, the span fallen from one and hanging from the other, its pieces at its foot. */
function arch(b: Bitmap, cx: number, by: number) {
  const bright = -1.6;
  prism(b, { x: cx - 38, y: by, h: 66, w: 7.5, lean: 0.05, seed: 451, broken: true, bright });
  prism(b, { x: cx + 40, y: by + 2, h: 42, w: 7, lean: -0.08, seed: 452, broken: true, bright });
  // the span still leaning out from the taller leg
  const span: [number, number][] = [[cx - 38, by - 62], [cx - 22, by - 72], [cx - 6, by - 76]];
  for (let i = 0; i < span.length - 1; i++) {
    const [x0, y0] = span[i], [x1, y1] = span[i + 1];
    polyFill(b, [[x0, y0 - 6], [x1, y1 - 5], [x1 + 1, y1 + 5], [x0, y0 + 6]], (x, y) => rampDither(CRYS, clamp(y < (y0 + y1) / 2 - 1 ? 6.2 : y < (y0 + y1) / 2 + 2 ? 4 : 2.4, 0, CRYS.length - 1) + bright, x, y));
  }
  polyFill(b, [[cx - 6, by - 81], [cx + 1, by - 78], [cx - 3, by - 75], [cx + 2, by - 72], [cx - 5, by - 71]], (x, y) => rampDither(CRYS, 8.2, x, y));
  // what fell
  prism(b, { x: cx + 18, y: by + 1, h: 30, w: 5.5, lean: 1.3, seed: 453, broken: true, bright });
  prism(b, { x: cx - 6, y: by + 3, h: 22, w: 4.5, lean: -1.2, seed: 454, broken: true, bright });
}

/** The gigantic formation at the centre of the region: a sheaf of enormous crystals fanning from one root, the middle one nearly as tall as the sky. */
const GIANT_PRISMS: Prism[] = [
  { x: GIANT_X - 74, y: GIANT_Y + 4, h: 58, w: 9, lean: -0.62, seed: 501, bright: -0.3 },
  { x: GIANT_X + 76, y: GIANT_Y + 4, h: 52, w: 9, lean: 0.66, seed: 502, bright: -0.5, broken: true },
  { x: GIANT_X - 54, y: GIANT_Y + 3, h: 92, w: 12, lean: -0.42, seed: 503, ramp: ICE, bright: -0.2 },
  { x: GIANT_X + 58, y: GIANT_Y + 3, h: 84, w: 12, lean: 0.44, seed: 504, bright: -0.3 },
  { x: GIANT_X - 34, y: GIANT_Y + 2, h: 128, w: 15, lean: -0.24, seed: 505, core: 1.4 },
  { x: GIANT_X + 36, y: GIANT_Y + 2, h: 116, w: 15, lean: 0.27, seed: 506, ramp: ROSE, bright: -0.3, core: 1.2 },
  { x: GIANT_X - 14, y: GIANT_Y + 1, h: 160, w: 21, lean: -0.08, seed: 507, core: 2.4 },
  { x: GIANT_X + 16, y: GIANT_Y + 1, h: 142, w: 19, lean: 0.1, seed: 508, core: 2 },
  { x: GIANT_X - 22, y: GIANT_Y + 6, h: 44, w: 10, lean: -0.5, seed: 509, ramp: ICE },
  { x: GIANT_X + 26, y: GIANT_Y + 6, h: 38, w: 9, lean: 0.56, seed: 510 },
  { x: GIANT_X + 2, y: GIANT_Y + 7, h: 30, w: 9, lean: 0.06, seed: 511, ramp: ROSE },
];

function backdrop(): Bitmap {
  const b = new Bitmap(640, 200);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 640; x++) {
      const t = clamp(y / (HZ + 4), 0, 1);
      const glow = Math.max(0, 1 - Math.hypot(x - GIANT_X, (y - 90) * 0.9) / 230);
      b.set(x, y, rampDither(SKY, Math.min(SKY.length - 1, Math.pow(t, 1.15) * (SKY.length - 1) + glow * 1.6), x, y));
    }
  }
  // stars, only where the dusk has gone dark
  const r = rng(101);
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(r() * 640), y = Math.floor(r() * 66);
    b.set(x, y, r() < 0.2 ? MOON[1] : SKY[8]);
  }
  // the cold moon, its halo, streaks of high cloud
  for (let y = 0; y < 90; y++) {
    for (let x = 0; x < 240; x++) {
      const a = Math.max(0, 1 - Math.hypot(x - MOON_X, y - MOON_Y) / 46);
      if (a > 0 && dith(x, y, a * a * 0.8)) b.set(x, y, SKYMOON[Math.min(11, Math.floor(clamp(y / (HZ + 4), 0, 1) * 13) + 3)]);
    }
  }
  ellipseFill(b, MOON_X, MOON_Y, 8, 8, (x, y, d) => (Math.hypot(x - MOON_X - 3, y - MOON_Y + 2) < 2.2 || Math.hypot(x - MOON_X + 3, y - MOON_Y - 3) < 1.6 ? MOON[0] : rampDither(MOON, 3 - d * 1.4, x, y)));
  for (const [cx, cy, rx, seed] of [[200, 58, 150, 21], [470, 34, 170, 22], [80, 76, 110, 23], [600, 72, 90, 24]] as const) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(640, cx + rx); x++) {
      const k = (x - cx) / rx;
      const th = (1 - k * k) * (1.4 + 4 * n1(x, 37, seed));
      for (let y = Math.floor(cy - th); y <= cy + th; y++) {
        const a = (1 - Math.abs(y + 0.5 - cy) / (th + 0.5)) * (0.2 + n1(x, 61, seed + 1) * 0.5);
        const t = clamp(y / (HZ + 4), 0, 1);
        if (dith(x, y, a)) b.set(x, y, rampDither(SKY, Math.min(SKY.length - 1, Math.pow(t, 1.15) * (SKY.length - 1) + 2.4), x, y));
      }
    }
  }
  // far ranges of spires
  range(b, 122, 34, 15, H(['#4e3c70', '#5a4478', '#664c7e', '#72547f', '#7a5c80']), 111, 150);
  range(b, 136, 30, 21, H(['#322a58', '#3c3262', '#483a6c', '#544274', '#604a78']), 112, 168);
  mistBand(b, 132, 160, 121, 0.5);
  // the gigantic formation, behind everything near
  ellipseFill(b, GIANT_X, GIANT_Y - 8, 118, 16, (x, y, d) => (dith(x, y, (1 - d) * 1.8) ? GROUND[4] : b.get(x, y)));
  for (const p of GIANT_PRISMS) prism(b, p);
  for (const [x, y, w] of [[GIANT_X - 88, GIANT_Y + 8, 26], [GIANT_X + 92, GIANT_Y + 8, 24], [GIANT_X - 34, GIANT_Y + 12, 30], [GIANT_X + 40, GIANT_Y + 11, 34]] as const) rock(b, x, y, w, w * 0.42, x, 0.6);
  mistBand(b, 158, 182, 122, 0.56);
  // cliffs either side, closing in; the formations that make the passage stand in front of them
  const left = (x: number) => 86 + Math.pow(x / 190, 2.2) * 92 + (n1(x, 27, 131) - 0.5) * 14 + (n1(x, 7, 132) - 0.5) * 4;
  const right = (x: number) => 78 + Math.pow((639 - x) / 186, 2.2) * 96 + (n1(x, 31, 133) - 0.5) * 14 + (n1(x, 8, 134) - 0.5) * 4;
  cliff(b, 0, 190, left, 186, 135);
  cliff(b, 453, 640, right, 186, 136);
  embedded(b, 66, 148, 34, 44, -0.1, 141, ICE);
  embedded(b, 574, 142, 40, 52, 0.12, 142, CRYS);
  // the collapsed arch on the left
  arch(b, 196, 180);
  // pillars at the passage's mouth, broken spires, smaller growths on the near rise
  prism(b, { x: 460, y: 182, h: 96, w: 10, lean: -0.04, seed: 411, broken: true, bright: -1.8 });
  prism(b, { x: 438, y: 184, h: 66, w: 8, lean: 0.1, seed: 412, ramp: ICE, bright: -1.8 });
  prism(b, { x: 486, y: 182, h: 112, w: 12, lean: 0.03, seed: 413, bright: -1.6 });
  // the near ground
  for (let x = 0; x < 640; x++) {
    const top = slopeTop(x);
    for (let y = Math.ceil(top); y < 200; y++) b.set(x, y, y - top < 1 ? GROUND[8] : groundColor(x, y));
  }
  cluster(b, 118, 180, 5, 34, 4.5, 0.9, 421, ICE, -0.3);
  cluster(b, 396, 178, 4, 26, 4, 0.8, 422, CRYS, -0.3);
  cluster(b, 534, 176, 5, 30, 4.5, 0.9, 423, ROSE, -0.4);
  rock(b, 240, 182, 26, 10, 431);
  rock(b, 410, 184, 20, 8, 432);
  prism(b, { x: 262, y: 182, h: 34, w: 6, lean: 1.2, seed: 424, broken: true, bright: -0.3 });
  prism(b, { x: 556, y: 184, h: 28, w: 5, lean: -1.1, seed: 425, broken: true, ramp: ICE, bright: -0.3 });
  return b;
}

// ---------------------------------------------------------------------------
// The massive formations that make the passage, and what lies on the arena's edges
// ---------------------------------------------------------------------------

const MASS_L = { w: 180, h: 240, x: 74, y: 228 };
const MASS_R = { w: 190, h: 262, x: 110, y: 250 };

function massLeft(): Bitmap {
  const b = new Bitmap(MASS_L.w, MASS_L.h);
  const { x, y } = MASS_L;
  const dim = -2;
  prism(b, { x: x - 42, y, h: 100, w: 15, lean: -0.1, seed: 521, broken: true, bright: dim });
  prism(b, { x: x + 48, y: y - 2, h: 76, w: 12, lean: 0.2, seed: 522, ramp: ICE, bright: dim });
  prism(b, { x: x - 18, y: y + 2, h: 172, w: 22, lean: 0.04, seed: 523, bright: dim + 0.4 });
  prism(b, { x: x + 20, y: y + 3, h: 124, w: 17, lean: 0.1, seed: 524, broken: true, bright: dim });
  prism(b, { x: x - 56, y: y + 4, h: 46, w: 10, lean: -0.34, seed: 525, ramp: ROSE, bright: dim });
  rock(b, x - 34, y + 4, 34, 12, 526);
  rock(b, x + 34, y + 5, 30, 10, 527);
  cluster(b, x + 2, y + 8, 4, 20, 4, 0.8, 528, ICE, -1);
  return b;
}

function massRight(): Bitmap {
  const b = new Bitmap(MASS_R.w, MASS_R.h);
  const { x, y } = MASS_R;
  const dim = -2;
  prism(b, { x: x + 44, y: y - 2, h: 142, w: 19, lean: 0.06, seed: 531, bright: dim });
  prism(b, { x: x - 46, y, h: 96, w: 13, lean: -0.2, seed: 532, broken: true, bright: dim });
  prism(b, { x, y: y + 2, h: 190, w: 24, lean: -0.04, seed: 533, bright: dim + 0.4 });
  prism(b, { x: x - 22, y: y + 3, h: 118, w: 15, lean: -0.12, seed: 534, ramp: ROSE, bright: dim });
  prism(b, { x: x + 28, y: y + 4, h: 60, w: 12, lean: 0.3, seed: 535, ramp: ICE, bright: dim });
  rock(b, x - 30, y + 4, 36, 11, 536);
  rock(b, x + 36, y + 5, 34, 12, 537);
  cluster(b, x - 8, y + 8, 4, 18, 4, 0.9, 538, CRYS, -1);
  return b;
}

/** A spire lying broken on the arena's far edge: two lengths of crystal, a gap between them, rubble under the break. */
function fallenSpire(): Bitmap {
  const w = 176, hh = 54;
  const b = new Bitmap(w, hh);
  ellipseFill(b, w / 2 + 2, hh - 8, w / 2 - 4, 6.5, (x, y, d) => (dith(x, y, (1 - d) * 1.7) ? withAlpha(GROUND[0], 210) : 0));
  prism(b, { x: 6, y: hh - 10, h: 84, w: 11, lean: 1.46, seed: 541, broken: true });
  prism(b, { x: w - 4, y: hh - 8, h: 62, w: 9, lean: -1.42, seed: 542 });
  for (let i = 0; i < 9; i++) prism(b, { x: 84 + hash2(i, 0, 543) * 28, y: hh - 5 - hash2(i, 1, 543) * 4, h: 4 + hash2(i, 2, 543) * 7, w: 1.6 + hash2(i, 3, 543) * 1.6, lean: (hash2(i, 4, 543) - 0.5) * 2.4, seed: 544 + i, broken: true });
  return b;
}

/** A clump of smaller crystals growing between rocks. */
function growth(n: number, h: number, seed: number, ramp: RGBA[]): Bitmap {
  const w = Math.ceil(h * 2.6 + 24), hh = Math.ceil(h * 1.3 + 12);
  const b = new Bitmap(w, hh);
  const g = hh - 6;
  rock(b, w * 0.26, g, h * 0.5, h * 0.24, seed + 1);
  cluster(b, w / 2, g, n, h, Math.max(2.2, h * 0.11), 1, seed, ramp);
  rock(b, w * 0.72, g + 1, h * 0.46, h * 0.22, seed + 2);
  return b;
}

/**
 * An ancient structure half buried: cut columns of crystal, ringed with carving, a
 * lintel fallen across them; the shapes are too even to have grown. Rock and fragments
 * have drifted over its foot.
 */
function ruin(): Bitmap {
  const w = 150, hh = 96;
  const b = new Bitmap(w, hh);
  const column = (cx: number, by: number, h: number, half: number, seed: number) => {
    for (let y = by - h; y <= by; y++) {
      for (let x = cx - half; x <= cx + half; x++) {
        const u = (x - cx) / half;
        let v = 3.3 - u * 2.2 + (Math.abs(u) < 0.34 ? 0.4 : 0);
        if ((by - y) % 13 < 2) v += 1.1;
        if ((by - y) % 13 === 2) v -= 1.2;
        if (Math.abs(u + 0.34) < 0.1) v = Math.max(v, 4.6);
        v += (hash2(x, y, seed) - 0.5) * 0.4;
        b.set(x, y, rampDither(STONEWORK, clamp(v, 0, STONEWORK.length - 1), x, y));
      }
    }
    // its capital, a six-sided plate seen a little from above
    ellipseFill(b, cx, by - h, half + 2, 2.6, (x, y) => rampDither(STONEWORK, clamp(4.6 - (x - cx) * 0.2 - (y - by + h) * 0.5, 0, STONEWORK.length - 1), x, y));
  };
  column(26, 84, 66, 8, 551);
  column(70, 86, 42, 8, 552);
  column(112, 86, 22, 8, 553);
  // the lintel, slipped from the first column on to the second
  polyFill(b, [[14, 13], [84, 40], [82, 48], [12, 22]], (x, y) => rampDither(STONEWORK, clamp(4.2 - (y - 13 - (x - 14) * 0.39) * 0.36, 0, STONEWORK.length - 1), x, y));
  for (const k of [0.2, 0.4, 0.6, 0.8]) {
    const lx = 14 + 70 * k, ly = 13 + 27 * k;
    for (let d = 0; d < 9; d++) b.set(Math.round(lx - d * 0.2), Math.round(ly + d), STONEWORK[1]);
  }
  // the ground drifted over its foot
  for (let x = 0; x < w; x++) {
    const edge = Math.min(1, Math.min(x, w - 1 - x) / 20);
    const top = hh - edge * (14 + 8 * n1(x, 29, 554));
    for (let y = Math.max(0, Math.ceil(top)); y < hh; y++) {
      const v = 5 - (y - top) * 0.05 + (y - top < 1 ? 2 : 0) + (hash2(x, y, 555) - 0.5) * 1.6;
      b.set(x, y, hash2(x, y, 556) > 0.965 ? CRYS[7] : rampDither(GROUND, clamp(v, 0, GROUND.length - 1), x, y));
    }
  }
  return b;
}

/** A small rocky elevation, sharp crystals poking through its top. */
function elevation(w: number, hh: number, seed: number, ramp: RGBA[]): Bitmap {
  const b = new Bitmap(w, hh + 26);
  const g = hh + 26 - 2;
  for (let x = 0; x < w; x++) {
    const k = Math.abs(x + 0.5 - w / 2) / (w / 2);
    const top = g - hh * Math.pow(1 - k * k, 0.8) * (0.72 + 0.28 * n1(x, 11, seed)) + (hash2(Math.floor(x / 4), 0, seed) - 0.5) * 3;
    for (let y = Math.ceil(top); y <= g; y++) {
      const fi = Math.floor(x / 9 + n1(y, 13, seed) * 1.6);
      const v = 4.6 + (hash2(fi, 2, seed) - 0.5) * 2.2 - (k * (x > w / 2 ? 1.6 : -0.9)) + (y - top < 1.5 ? 2 : 0) - ((y - top) / hh) * 1.3 + (hash2(x, y, seed) - 0.5) * 0.5;
      b.set(x, y, rampDither(GROUND, clamp(v, 0, GROUND.length - 1), x, y));
    }
  }
  cluster(b, w / 2 - w * 0.12, g - hh * 0.7, 3, hh * 0.9, 3.2, 0.8, seed + 3, ramp);
  cluster(b, w / 2 + w * 0.2, g - hh * 0.44, 3, hh * 0.56, 2.6, 1, seed + 4, ramp);
  return b;
}

// ---------------------------------------------------------------------------
// The floor
// ---------------------------------------------------------------------------

/** The crack from the camera to the formation's foot, as a wandering line, and its branches. */
const crackPts = (seed: number, x0: number, y0: number, x1: number, y1: number, w: number): [number, number, number][] => {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  const out: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([x0 + (x1 - x0) * t + (n1(i, 19, seed) - 0.5) * 22 * Math.sin(t * Math.PI) + (n1(i, 6, seed + 1) - 0.5) * 7, y0 + (y1 - y0) * t, w * (1 - t * 0.72) * (0.65 + n1(i, 9, seed + 2) * 0.6)]);
  }
  return out;
};
const CRACKS: [number, number, number][][] = [
  crackPts(611, 338, 362, 322, 206, 5),
  crackPts(612, 330, 322, 264, 356, 2.4),
  crackPts(613, 322, 288, 392, 318, 2.2),
  crackPts(614, 326, 240, 268, 216, 1.6),
  crackPts(615, 40, 240, 92, 302, 2.2),
  crackPts(616, 620, 270, 566, 330, 2.4),
  crackPts(617, 586, 330, 610, 362, 1.6),
];

/** How deep inside a crack a point is: 1 at its heart, 0 at its lip or off it. */
function crackMap(): Float32Array {
  const m = new Float32Array(FLOOR.w * FLOOR.h);
  for (const c of CRACKS) {
    for (const [cx, cy, w] of c) {
      const yy = Math.round(cy - 192);
      for (let dx = -Math.ceil(w); dx <= w; dx++) {
        const x = Math.round(cx + dx);
        if (x < 0 || x >= FLOOR.w || yy < 0 || yy >= FLOOR.h) continue;
        const k = 1 - Math.abs(dx) / (w + 0.01);
        if (k > m[yy * FLOOR.w + x]) m[yy * FLOOR.w + x] = k;
      }
    }
  }
  return m;
}
const CRACK = crackMap();
const crackAt = (x: number, y: number) => (x >= 0 && x < FLOOR.w && y >= 0 && y < FLOOR.h ? CRACK[y * FLOOR.w + x] : 0);

function floorGround(sky: Bitmap): Bitmap {
  const { w, h } = FLOOR;
  const b = new Bitmap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const Y = y + 192;
      let c = groundColor(x, Y);
      const k = polishK(x, Y);
      if (k > 0) {
        // polished rock: it mirrors what stands above it, dark and a little wavering
        const my = Math.round(186 - (Y - 192) * 1.55 + (vnoise(x, Y, 13, 731) - 0.5) * 2);
        const mx = Math.round(x + (vnoise(x, Y, 9, 732) - 0.5) * 1.4);
        const m = my >= 0 ? sky.get(Math.max(0, Math.min(639, mx)), my) : SKY[0];
        const dark = rampDither(GROUND, 2.6 + (vnoise(x, Y, 40, 733) - 0.5) * 0.8, x, Y);
        c = dith(x, Y, k) ? mix(dark, m, 0.5 * (1 - quiet(x, Y) * 0.5)) : c;
      }
      // the crack's lips, its dark throat; the dim vein deep in it (the bright one breathes over it)
      const q = crackAt(x, y);
      if (q > 0) c = q > 0.55 ? VEIN[0] : q > 0.2 ? GROUND[0] : GROUND[1];
      else if (crackAt(x, y - 1) > 0 || crackAt(x - 1, y) > 0) c = GROUND[8];
      b.set(x, y, c);
    }
  }
  // the litter of fragments: thousands of them, thin where the champions stand, thick in the debris fields, none on the polish
  const things: { y: number; draw: () => void }[] = [];
  const r = rng(601);
  const R3 = [CRYS, CRYS, ICE, ROSE];
  for (let i = 0; i < 5200; i++) {
    const x = r() * 640, Y = 193 + Math.pow(r(), 0.72) * 166;
    const roll = r(), pick = r(), tall = r(), lean = r(), tone = r();
    const [u, v] = world(x, Y);
    const field = vnoise(u, v * 2.4, 90, 741);
    if (polishK(x, Y) > 0.2 || crackAt(Math.round(x), Math.round(Y - 192)) > 0) continue;
    const q = quiet(x, Y);
    if (roll > (0.1 + smooth(0.42, 0.68, field) * 0.9) * (1 - q * 0.86)) continue;
    const s = pscale(Y);
    const ramp = R3[Math.floor(pick * 4)];
    const X = Math.round(x), Yi = Math.round(Y - 192);
    const size = tall > 0.985 && q < 0.2 ? 2 : tall > 0.82 ? 1 : 0;
    things.push({
      y: Y,
      draw: () => {
        if (size === 0) {
          b.set(X, Yi, ramp[3 + Math.floor(tone * 5)]);
          if (s > 0.8) b.set(X + 1, Yi, GROUND[1]);
        } else if (size === 1) {
          // a chip: two or three pixels wide, its top catching the light
          const l = Math.round(s * 1.2);
          for (let k = 0; k <= l; k++) {
            b.set(X, Yi - k, ramp[k === l ? 7 : 3 + Math.floor(tone * 2)]);
            b.set(X + 1, Yi - k, ramp[k === l ? 5 : 2]);
          }
          b.set(X + 2, Yi + 1, GROUND[1]);
        } else {
          prism(b, { x: X, y: Yi, h: (5 + tone * 8) * s, w: Math.max(1.8, 3 * s), lean: (lean - 0.5) * 1.4, seed: i, ramp, broken: tone > 0.5, bright: -1 });
        }
      },
    });
  }
  things.sort((p, q) => p.y - q.y).forEach((t) => t.draw());
  return b;
}

// ---------------------------------------------------------------------------
// What moves
// ---------------------------------------------------------------------------

/** The veins in the cracks, bright: this breathes over the dim ones (pulse). */
function veins(): Bitmap[] {
  const b = new Bitmap(FLOOR.w, FLOOR.h);
  for (let y = 0; y < FLOOR.h; y++) {
    for (let x = 0; x < FLOOR.w; x++) {
      const q = crackAt(x, y);
      if (q > 0.5) b.set(x, y, VEIN[q > 0.84 ? 4 : q > 0.68 ? 3 : 2]);
      else if (q === 0) {
        // the glow on the rock round them
        let near = 0;
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -1], [0, 1], [-4, 0], [4, 0]]) near = Math.max(near, crackAt(x + dx, y + dy));
        if (near > 0.3 && dith(x, y, 0.45)) b.set(x, y, withAlpha(VEIN[2], 110));
      }
    }
  }
  return [new Bitmap(1, 1), b];
}

/** The formation's light breathing inside it: a pale column in the heart of its tallest crystals (pulse). */
function giantGlow(): Bitmap[] {
  const w = 170, hh = 170;
  const b = new Bitmap(w, hh);
  const pale = hex('#f4e8ff');
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const a = Math.pow(Math.max(0, 1 - Math.hypot((x - 80) / 46, (y - 92) / 84)), 1.1) * 0.9;
      if (a > 0.05 && dith(x, y, a)) b.set(x, y, withAlpha(pale, 90));
    }
  }
  return [new Bitmap(1, 1), mask(b, 245, 0)];
}

/** Keeps a light only where the formation stands. */
function mask(b: Bitmap, ax: number, ay: number): Bitmap {
  const shape = new Bitmap(640, 200);
  for (const p of GIANT_PRISMS) prism(shape, p);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (!(shape.get(x + ax, y + ay) & 255)) b.set(x, y, 0);
  return b;
}

/** Glints travelling the facets: small crosses of light that open and close on the crystal's edges, each in its own time. */
function glints(w: number, hh: number, n: number, count: number, seed: number, at: (r: () => number) => [number, number]): Bitmap[] {
  const r = rng(seed);
  const list = Array.from({ length: count }, () => {
    const [x, y] = at(r);
    return { x, y, ph: r(), big: r() < 0.3 };
  });
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    for (const g of list) {
      const t = (i / n + g.ph) % 1;
      if (t > 0.14) continue;
      const k = Math.sin((t / 0.14) * Math.PI);
      b.set(g.x, g.y, MOON[3]);
      if (k > 0.5) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(g.x + dx, g.y + dy, MOON[1]);
      if (g.big && k > 0.8) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) b.set(g.x + dx, g.y + dy, withAlpha(MOON[0], 170));
    }
    out.push(b);
  }
  return out;
}

/** A fan of split light thrown down on the rock from the formation: long thin wedges of colour, faint, coming and going (pulse). */
function prismFan(dir: number, len: number): Bitmap[] {
  const w = Math.ceil(len * 1.1), hh = 150;
  const b = new Bitmap(w, hh);
  const bands = ['#ff6a8c', '#ffb45c', '#fff08c', '#7cf0a0', '#6cc8ff', '#b48cff'].map((h) => hex(h));
  for (let y = 0; y < hh; y++) {
    const t = y / hh;
    for (let x = 0; x < w; x++) {
      const dx = dir > 0 ? x : w - 1 - x;
      // the angle within the fan decides the colour
      const a = dx / (y + 8);
      const i = Math.floor((a - 0.5) * 7);
      if (i < 0 || i >= bands.length) continue;
      const fade = Math.sin(Math.min(1, t * 1.5 + 0.08) * Math.PI) * 0.5;
      if (dith(x, y, fade)) b.set(x, y, withAlpha(bands[i], 60));
    }
  }
  return [new Bitmap(1, 1), b];
}

/** A shard hanging in the air near the formation. */
function floater(h: number, w: number, lean: number, seed: number, ramp: RGBA[]): Bitmap[] {
  const s = Math.ceil(h + w * 2 + 4);
  const b = new Bitmap(s, s);
  prism(b, { x: s / 2 - Math.sin(lean) * h * 0.5, y: s / 2 + Math.cos(lean) * h * 0.5, h, w, lean, seed, ramp });
  return [b];
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const r = rng(701);
  const plain = ['rock_a', 'rock_b', 'rock_c'];
  for (let row = 6; row < MAP_ROWS; row++) for (let c = 0; c < MAP_COLS; c++) ground[row * MAP_COLS + c] = id(plain[Math.floor(r() * plain.length)]);
  const props: PropPlacement[] = [
    // far: the formation's light, glints on its facets, shards hanging round it
    { kind: 'giant_glow', x: 245, y: 0, layer: 'far' },
    { kind: 'giant_glints', x: 200, y: 0, layer: 'far' },
    { kind: 'float_a', x: 216, y: 70, layer: 'far' },
    { kind: 'float_b', x: 430, y: 58, layer: 'far' },
    { kind: 'float_c', x: 392, y: 26, layer: 'far' },
    // floor: the ground, the veins, the split light, then what stands on it
    { kind: 'ground', x: 0, y: 192, layer: 'floor' },
    { kind: 'veins', x: 0, y: 192, layer: 'floor' },
    { kind: 'fan_l', x: 306, y: 194, layer: 'floor' },
    { kind: 'fan_r', x: 334, y: 194, layer: 'floor' },
    { kind: 'floor_glints', x: 0, y: 192, layer: 'floor' },
    { kind: 'spire', x: 322, y: 226, layer: 'floor' },
    { kind: 'mass_l', x: 40, y: 228, layer: 'floor' },
    { kind: 'mass_r', x: 600, y: 240, layer: 'floor' },
    { kind: 'growth_a', x: 262, y: 244, layer: 'floor' },
    { kind: 'growth_b', x: 566, y: 276, layer: 'floor' },
    { kind: 'growth_c', x: 28, y: 276, layer: 'floor' },
    { kind: 'growth_a', x: 406, y: 344, layer: 'floor' },
    { kind: 'growth_b', x: 232, y: 346, layer: 'floor' },
    { kind: 'rise', x: 70, y: 352, layer: 'floor' },
    { kind: 'ruin', x: 566, y: 360, layer: 'floor' },
    // fg: a spike of crystal in the near right corner
    { kind: 'corner', x: 640, y: 362, layer: 'fg' },
  ];
  const order = { far: 0, back: 1, floor: 2, fg: 3 } as const;
  props.sort((a, c) => order[a.layer] - order[c.layer] || a.y - c.y);
  return { ground, wall, props };
}

const cornerSpike = (): Bitmap[] => {
  const b = new Bitmap(70, 64);
  prism(b, { x: 54, y: 66, h: 56, w: 11, lean: -0.22, seed: 571, bright: -2.2 });
  prism(b, { x: 34, y: 70, h: 28, w: 8, lean: -0.5, seed: 572, broken: true, bright: -2.4 });
  return [b];
};

export const zone8: ZoneArt = {
  id: 'zone8',
  name: 'Crystal Graveyard',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    giant_glow: giantGlow(),
    giant_glints: glints(240, 170, 40, 16, 811, (r) => {
      for (;;) {
        const x = Math.floor(r() * 240), y = Math.floor(r() * 164);
        const shape = GIANT_SHAPE;
        if (shape.get(x + 200, y) & 255) return [x, y];
      }
    }),
    float_a: floater(15, 3.4, 0.5, 821, ICE),
    float_b: floater(19, 4, -0.4, 822, CRYS),
    float_c: floater(10, 2.6, 0.9, 823, ROSE),
    ground: [floorGround(backdrop())],
    veins: veins(),
    fan_l: prismFan(-1, 210),
    fan_r: prismFan(1, 210),
    floor_glints: glints(640, 168, 30, 44, 812, (r) => {
      for (;;) {
        const x = Math.floor(r() * 640), y = Math.floor(Math.pow(r(), 0.72) * 166);
        if (!busy(x, y + 192)) return [x, y];
      }
    }),
    spire: [fallenSpire()],
    mass_l: [massLeft()],
    mass_r: [massRight()],
    growth_a: [growth(5, 26, 831, CRYS)],
    growth_b: [growth(4, 22, 832, ICE)],
    growth_c: [growth(5, 30, 833, ROSE)],
    rise: [elevation(120, 30, 841, CRYS)],
    ruin: [ruin()],
    corner: cornerSpike(),
  }),
  kinds: {
    // the formation's light breathes slowly; the fans come and go on their own long breaths
    giant_glow: { anchor: [0, 0], mode: 'pulse', ms: 12000 },
    giant_glints: { anchor: [0, 0], mode: 'loop', ms: 260 },
    float_a: { anchor: [0.5, 0.5], mode: 'static', bob: { amp: 2, ms: 9000 } },
    float_b: { anchor: [0.5, 0.5], mode: 'static', bob: { amp: 3, ms: 13000 } },
    float_c: { anchor: [0.5, 0.5], mode: 'static', bob: { amp: 2, ms: 11000 } },
    ground: { anchor: [0, 0], mode: 'static' },
    veins: { anchor: [0, 0], mode: 'pulse', ms: 8000 },
    fan_l: { anchor: [1, 0], mode: 'pulse', ms: 17000 },
    fan_r: { anchor: [0, 0], mode: 'pulse', ms: 23000 },
    floor_glints: { anchor: [0, 0], mode: 'loop', ms: 300 },
    spire: { anchor: [0.5, 1], mode: 'static' },
    mass_l: { anchor: [MASS_L.x / MASS_L.w, MASS_L.y / MASS_L.h], mode: 'static' },
    mass_r: { anchor: [MASS_R.x / MASS_R.w, MASS_R.y / MASS_R.h], mode: 'static' },
    growth_a: { anchor: [0.5, 1], mode: 'static' },
    growth_b: { anchor: [0.5, 1], mode: 'static' },
    growth_c: { anchor: [0.5, 1], mode: 'static' },
    rise: { anchor: [0.5, 1], mode: 'static' },
    ruin: { anchor: [0.5, 1], mode: 'static' },
    corner: { anchor: [1, 1], mode: 'static' },
  },
  layout,
  horizon: HZ,
};

const GIANT_SHAPE = (() => {
  const s = new Bitmap(640, 200);
  for (const p of GIANT_PRISMS) prism(s, p);
  return s;
})();
