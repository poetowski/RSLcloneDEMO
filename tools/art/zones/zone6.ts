// Zone "Golden Expanse": Zone 6, named and described by Jakub (2026-11-01,
// docs/DESIGN_DECISIONS.md 5.9): "The central desert consists of enormous golden
// dunes. Dunes can reach heights of 50-100 metres. Wind constantly reshapes the
// landscape. be creative. Some dunes contain buried ruins, skeletons and forgotten
// structures. Occasionally, strange lights move beneath the surface."
//
// As painted: late afternoon, the sun low in the upper left of a sky going from
// deep turquoise to pale gold. Ranges of dunes stand behind each other, hazed with
// distance, each cut by the knife edge of its crest: lit on the sun's side and
// rippled by the wind, in deep amber shade on the lee. A huge dune fills the right;
// a tiny wall and arch on its flank give the scale. Between the dunes the top of a
// sunken stepped temple. On the arena's far edge a colonnade and the ribs of
// something enormous stand half buried. The arena is sand, ribbed by the wind, with
// a buried warrior, a helmet and a fallen column.
//
// The wind (my reading of "be creative", all of it calm and slow): sand streams off
// the crests; runnels slide down the lee of the huge dune; low snakes of sand run
// over the arena; a dust devil wanders across the far flanks; and the drifts round
// the colonnade and the ribs rise and fall, slowly burying and uncovering them. The
// lights: now and then a pale glow travels beneath the sand, on the huge dune and
// under the arena, then nothing for a while. Everything his description did not
// name is a first take (DESIGN_DECISIONS 5.9).
import { dith, ellipseFill, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, hex, mix, RGBA, rng } from '../raster.ts';
import { MAP_COLS, MAP_ROWS, Painter, PropPlacement, SPAWNS, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));

const SKY = H(['#14566e', '#1a6078', '#226a80', '#2c7586', '#3a808a', '#4c8b8c', '#62968c', '#7ca08a', '#98aa88', '#b4b486', '#cebe88', '#e2c98e', '#efd59c', '#f6e2b2']);
const SUNG = H(['#f8e8be', '#fbefcc', '#fdf5dc', '#fffaea']);
const SUN = H(['#ffe9a8', '#fff3c8', '#fffbe6', '#ffffff']);
const CIRRUS = H(['#d8c49c', '#e8d6b0', '#f4e6c6', '#fcf2dc']);
/** the sand: deep amber shade to the lit gold of a crest */
const GOLD = H(['#2c1408', '#40200c', '#582e10', '#723e14', '#8e5018', '#aa661e', '#c47e26', '#d89630', '#e6aa40', '#f0bc56', '#f8d076', '#fde6a2']);
/** the arena's sand: a little darker and duller than the dunes, so the champions stand out */
const FLOORS = H(['#3a2410', '#4a2e14', '#5c3a18', '#6e461c', '#805222', '#926028', '#a26e30', '#b27c3a', '#c08a46']);
const HAZEC = hex('#eccf98');
const STONE = H(['#3c2a1c', '#583e28', '#745436', '#906c46', '#ac8658', '#c6a06c', '#dcb984', '#ecd2a2']);
const BONE = H(['#4a3e30', '#6c5e4a', '#8e8068', '#b0a286', '#cec2a4', '#e6dcc0', '#f6f0dc']);
const IRON = H(['#1e1a18', '#322c28', '#4a423c', '#665c52', '#867a6c']);
const VULT = [hex('#2a1c14'), hex('#4a3424')];
/** the lights beneath the sand: nothing else here is this colour */
const GLOW = H(['#7ad8c8', '#a4eadc', '#d0f6ec', '#f4fffa']);

const SUN_X = 86, SUN_Y = 34;
/** where the far dunes meet the sky */
const HZ = 112;

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
// The dunes
// ---------------------------------------------------------------------------

/** A dune: its peak, how far it spreads each way, its foot row, how far its knife edge wanders off down the lee, the haze of its distance. */
interface Dune { x: number; y: number; wl: number; wr: number; foot: number; skew: number; haze: number; seed: number }

const DUNES: Dune[] = [
  // the far ranges
  { x: 70, y: 96, wl: 150, wr: 70, foot: 126, skew: 1.5, haze: 0.66, seed: 1 },
  { x: 244, y: 86, wl: 190, wr: 80, foot: 126, skew: 1.3, haze: 0.66, seed: 2 },
  { x: 410, y: 94, wl: 130, wr: 80, foot: 126, skew: 1.5, haze: 0.66, seed: 3 },
  { x: 610, y: 88, wl: 170, wr: 70, foot: 126, skew: 1.3, haze: 0.66, seed: 4 },
  { x: 330, y: 108, wl: 190, wr: 70, foot: 152, skew: 1.2, haze: 0.44, seed: 5 },
];
/** nearer: the sunken temple stands between these and the far ranges */
const NEAR: Dune[] = [
  { x: 120, y: 92, wl: 260, wr: 104, foot: 184, skew: 1.05, haze: 0.2, seed: 6 },
  { x: 366, y: 138, wl: 110, wr: 60, foot: 184, skew: 1.1, haze: 0.14, seed: 7 },
  // the huge dune on the right, a long back rising from the left, its lee falling away on the right
  { x: 548, y: 34, wl: 300, wr: 150, foot: 190, skew: 0.5, haze: 0.04, seed: 8 },
  // a shoulder lying against its foot
  { x: 432, y: 132, wl: 130, wr: 120, foot: 192, skew: 0.9, haze: 0.04, seed: 9 },
];
const HUGE = NEAR[2];

/** A dune's skyline: a long back that rounds over at the crest on the sun's side, a steep lee falling away on the other, wandering a little. */
const duneTop = (d: Dune, x: number) => {
  const dx = x - d.x;
  const t = clamp(Math.abs(dx) / (dx < 0 ? d.wl : d.wr), 0, 1.2);
  const fall = dx < 0 ? Math.pow(t, 1.45) * 0.86 + t * 0.14 : Math.pow(t, 0.72);
  return d.y + (d.foot - d.y) * fall + (n1(x, 47, 60 + d.seed) - 0.5) * 7 * Math.min(1, t * 3);
};
/** The knife edge: the crest's line winding in long curves down the dune from its peak; the sun's side lies west of it. */
const duneEdge = (d: Dune, y: number) => {
  const k = (y - d.y) / (d.foot - d.y);
  return d.x + d.skew * (y - d.y) * 0.5 - Math.sin(k * 4.6 + d.seed * 1.3) * (d.foot - d.y) * 0.3 * k + (n1(y, 19, 80 + d.seed) - 0.5) * 4 * k;
};

function paintDune(b: Bitmap, d: Dune) {
  const R = GOLD.map((c) => mix(c, HAZEC, d.haze));
  const x0 = Math.max(0, Math.floor(d.x - d.wl * 1.2)), x1 = Math.min(639, Math.ceil(d.x + d.wr * 1.2));
  for (let x = x0; x <= x1; x++) {
    const top = duneTop(d, x);
    for (let y = Math.ceil(top); y < Math.min(200, d.foot + 6); y++) {
      const e = duneEdge(d, y);
      const k = (y - d.y) / (d.foot - d.y);
      let v: number;
      if (x < e) {
        // the sun's side: brightest toward the crest, ribbed by the wind
        const toEdge = clamp((e - x) / 70, 0, 1);
        const rib = Math.sin(x * 0.34 + y * 1.02 + vnoise(x, y, 26, 90 + d.seed) * 7);
        v = 9.8 - toEdge * 2.4 - k * 1.5 + (rib > 0.55 ? 0.7 : rib < -0.65 ? -0.8 : 0) + (vnoise(x, y, 32, 94 + d.seed) - 0.5) * 1.1;
        if (e - x < 1.5) v = 11;
      } else {
        // the lee: deep shade under the edge, some light thrown back further out
        const off = clamp((x - e) / 90, 0, 1);
        v = 2.2 + off * 2.4 + k * 0.7 + (vnoise(x * 0.6, y, 14, 98 + d.seed) - 0.5) * 0.7;
        if (x - e < 1) v = 1;
      }
      // the silhouette's own rim
      if (y - top < 1) v = x < d.x ? 11 : Math.max(v, 4);
      b.set(x, y, rampDither(R, clamp(v + (hash2(x, y, 99) - 0.5) * 0.4, 0, R.length - 1), x, y));
    }
  }
}

// ---------------------------------------------------------------------------
// The arena's ground
// ---------------------------------------------------------------------------

const VY = 104, PK = 0.0058;
const pscale = (y: number) => Math.max(0.05, (y - VY) * PK);
const world = (x: number, y: number): [number, number] => [(x - 320) / pscale(y), Math.log(Math.max(0.5, y - VY)) / PK];
const FLOOR = { w: 640, h: 168 };
/** keep the floor quiet where the champions stand */
const busy = (x: number, y: number) => [...SPAWNS.player, ...SPAWNS.enemy].some(([fx, fy]) => Math.hypot((x - fx) / 38, (y - fy) / 18) < 1);

/** Sand ribbed by the wind in long wavering lines across the arena, swells of light and shade lying over it. */
function groundColor(x: number, y: number): RGBA {
  const [u, v] = world(x, y);
  const near = clamp((y - 170) / 190, 0, 1);
  const rib = Math.sin(v * 0.92 + u * 0.05 + vnoise(u, v, 90, 701) * 7);
  const swell = vnoise(u, v * 2.4, 240, 702) * 0.7 + vnoise(u, v * 2.4, 90, 703) * 0.3;
  let val = 4.6 + (swell - 0.5) * 3 + (rib > 0.5 ? 0.65 : rib < -0.6 ? -0.7 : 0) * (0.5 + near * 0.5) + (hash2(x, y, 704) - 0.5) * 0.5;
  // away from the camera the sand takes the sun
  val += (1 - near) * 1.2;
  return rampDither(FLOORS, clamp(val, 0, FLOORS.length - 1), x, y);
}

function sandTile(seed0: number): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const v = 4.4 + Math.sin(((y + (seed0 % 5)) * Math.PI * 2) / 8) * 0.4 + (hash2(x, y, seed) - 0.5) * 0.7;
        b.set(x, y, rampDither(FLOORS, v, x, y));
      }
    }
  };
}
const P: Record<string, Painter> = { sand_a: sandTile(1), sand_b: sandTile(2), sand_c: sandTile(3) };

// ---------------------------------------------------------------------------
// Backdrop
// ---------------------------------------------------------------------------

const SKYSUN = [...SKY, ...SUNG];

function backdrop(): Bitmap {
  const b = new Bitmap(640, 200);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 640; x++) {
      const t = clamp(y / (HZ - 4), 0, 1);
      const d = Math.hypot(x - SUN_X, (y - SUN_Y) * 1.15);
      const glow = Math.max(0, 1 - d / 210);
      const v = Math.pow(t, 0.9) * (SKY.length - 1) * (1 - glow * 0.3) + Math.pow(glow, 1.7) * 13;
      b.set(x, y, rampDither(SKYSUN, Math.min(SKYSUN.length - 1, v), x, y));
    }
  }
  ellipseFill(b, SUN_X, SUN_Y, 9, 9, (x, y, d) => (d > 0.82 ? SUN[1] : rampDither(SUN, 3.6 - d * 1.4, x, y)));
  // high streaks combed out by the wind
  for (const [cx, cy, rx, seed] of [[300, 16, 110, 11], [470, 30, 90, 12], [190, 54, 70, 13], [610, 12, 60, 14], [360, 58, 66, 15]] as const) {
    for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
      const k = (x - cx) / rx;
      const th = (1 - k * k) * (0.7 + 1.5 * n1(x, 11, seed));
      const mid = cy + (n1(x, 41, seed + 1) - 0.5) * 4 + k * 3;
      for (let y = Math.floor(mid - th); y <= mid + th; y++) {
        const a = 1 - Math.abs(y + 0.5 - mid) / (th + 0.5);
        if (y >= 0 && x >= 0 && x < 640 && dith(x, y, a * 0.5)) b.set(x, y, rampDither(CIRRUS, 1 + a * 2, x, y));
      }
    }
  }
  // the far desert running under the ranges
  for (let y = 116; y < 200; y++) for (let x = 0; x < 640; x++) b.set(x, y, rampDither(GOLD.map((c) => mix(c, HAZEC, 0.6)), 7.4 + (hash2(x, y, 205) - 0.5) * 0.6, x, y));
  for (const d of DUNES) paintDune(b, d);
  temple(b, 246, 150);
  for (const d of NEAR) paintDune(b, d);
  flankRuin(b);
  // the ground between the dunes' feet and the arena
  for (let x = 0; x < 640; x++) {
    const top = 176 + (n1(x, 83, 201) - 0.5) * 8 + 4 * smooth(380, 560, x);
    for (let y = Math.ceil(top); y < 200; y++) b.set(x, y, y - top < 1 ? FLOORS[8] : groundColor(x, y));
  }
  return b;
}

/** The top of a sunken stepped temple between the dunes, hazed: terraces lit on their western ends, a doorway in the top one. */
function temple(b: Bitmap, cx: number, base: number) {
  const S = STONE.map((c) => mix(c, HAZEC, 0.3));
  const steps: [number, number, number][] = [[60, 10, 0], [46, 10, 10], [32, 10, 20], [18, 12, 30]];
  for (const [half, h, up] of steps) {
    for (let y = base - up - h; y < base - up; y++) {
      for (let x = cx - half; x <= cx + half; x++) {
        const u = (x - cx + half) / (half * 2);
        let v = 6 - u * 4.4 + (y === base - up - h ? 1 : 0);
        if ((x + (y >> 2) * 5) % 9 === 0) v -= 0.8;
        if ((y - base) % 4 === 0) v -= 0.5;
        b.set(x, y, rampDither(S, clamp(v, 0, S.length - 1), x, y));
      }
    }
  }
  for (let y = base - 39; y < base - 30; y++) for (let x = cx - 3; x <= cx + 3; x++) b.set(x, y, S[0]);
  // sand drifted over its east end
  for (let x = cx + 6; x <= cx + 66; x++) {
    const t = (x - cx - 6) / 60;
    for (let y = Math.round(base - t * 34); y <= base + 2; y++) b.set(x, y, rampDither(GOLD.map((c) => mix(c, HAZEC, 0.3)), 6.2 + (hash2(x, y, 211) - 0.5), x, y));
  }
}

/** A wall and an arch high on the huge dune's sunlit flank, tiny: this is how big the dune is. */
function flankRuin(b: Bitmap) {
  const y0 = 116, x0 = 404;
  for (let k = 0; k < 9; k++) {
    const x = x0 + k * 3, h = 3 + Math.round(hash2(k, 0, 221) * 4);
    for (let y = y0 - h; y <= y0; y++) {
      b.set(x, y, STONE[y === y0 - h ? 7 : 5]);
      b.set(x + 1, y, STONE[3]);
    }
  }
  for (let y = y0 - 9; y <= y0; y++) {
    b.set(x0 + 32, y, STONE[6]);
    b.set(x0 + 39, y, STONE[3]);
  }
  for (let x = x0 + 32; x <= x0 + 39; x++) b.set(x, y0 - 10, STONE[x < x0 + 36 ? 7 : 4]);
  for (let x = x0 - 3; x < x0 + 44; x++) b.set(x, y0 + 1 + (x % 3 === 0 ? 1 : 0), GOLD[10]);
}

// ---------------------------------------------------------------------------
// Half-buried things: the drift round them rises and falls with the wind
// ---------------------------------------------------------------------------

/** A column at cx with its foot at `base`, lit from the left, fluted; `broken` leaves a jagged top instead of its capital. */
function column(b: Bitmap, cx: number, base: number, h: number, r: number, broken: boolean, seed: number) {
  for (let x = cx - r; x <= cx + r; x++) {
    const jag = broken ? Math.round(hash2(x, seed, 231) * 5) : 0;
    for (let y = base - h + jag; y <= base; y++) {
      const u = (x - cx) / r;
      let v = 4.8 - u * 2.8;
      if ((x - cx + r) % 2 === 1) v -= 0.7;
      if ((base - y) % 13 === 0) v -= 1.2;
      b.set(x, y, rampDither(STONE, clamp(v, 0, STONE.length - 1), x, y));
    }
  }
  if (!broken) {
    for (let x = cx - r - 2; x <= cx + r + 2; x++) {
      for (let y = base - h - 3; y < base - h; y++) b.set(x, y, STONE[x < cx ? 7 : 4]);
    }
  }
}

function colonnade(b: Bitmap) {
  const base = b.h - 1;
  const cols: [number, number, boolean][] = [[10, 54, false], [34, 56, false], [58, 40, true], [82, 54, false], [106, 26, true]];
  cols.forEach(([x, h, broken], i) => column(b, x, base, h, 4, broken, i));
  // the lintel left across the first two, and on the fourth a stub of it
  for (let x = 4; x <= 42; x++) {
    for (let y = base - 63; y < base - 58; y++) b.set(x, y, STONE[y === base - 63 ? 7 : (x + y) % 11 === 0 ? 3 : 5]);
  }
  for (let x = 76; x <= 94; x++) {
    for (let y = base - 61; y < base - 57; y++) b.set(x, y, STONE[y === base - 61 ? 7 : 5]);
  }
}

/** A thick curved stroke of bone, lit from the upper left. */
function boneStroke(b: Bitmap, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, r0: number, r1: number) {
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = i / n, m = 1 - t;
    const x = m * m * x0 + 2 * m * t * cx + t * t * x1, y = m * m * y0 + 2 * m * t * cy + t * t * y1;
    const r = r0 + (r1 - r0) * t;
    for (let dy = -Math.ceil(r); dy <= r; dy++) {
      for (let dx = -Math.ceil(r); dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const v = 3.6 - ((dx + dy) / Math.max(1, r)) * 1.5;
        b.set(Math.round(x + dx), Math.round(y + dy), rampDither(BONE, clamp(v, 0, BONE.length - 1), Math.round(x + dx), Math.round(y + dy)));
      }
    }
  }
}

/** The ribs of something enormous, its spine along the top, curving down into the sand. */
function ribcage(b: Bitmap) {
  const base = b.h - 1;
  const spineY = (x: number) => base - 52 + Math.pow((x - 66) / 66, 2) * 16;
  for (let i = 6; i >= 0; i--) {
    const x = 16 + i * 17;
    const sy = spineY(x);
    // the far rib of the pair, darker, then the near one
    boneStroke(b, x, sy, x + 24, sy + 18, x + 10, base + 2, 1.8, 1.0);
    boneStroke(b, x, sy, x - 14, sy + 24, x + 2, base + 2, 2.4, 1.4);
  }
  // the spine: knuckled vertebrae
  for (let x = 6; x < 128; x += 5) {
    const sy = spineY(x);
    ellipseFill(b, x, sy - 1, 3.4, 3.2, (px, py, d) => rampDither(BONE, 4.8 - d * 2 - (px - x) * 0.3, px, py));
    for (let k = 1; k < 4; k++) b.set(x, Math.round(sy - 3 - k), BONE[4]);
  }
}

/**
 * Something half buried: `draw` paints it on a bitmap, and over it the drift, lit
 * on its windward side, its top line rising and falling over `n` frames; grains
 * stream off the drift's crest as it moves.
 */
function buried(w: number, hh: number, n: number, amp: number, seed: number, draw: (b: Bitmap) => void): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    draw(b);
    const lvl = (0.5 - 0.5 * Math.cos((i / n) * Math.PI * 2)) * amp;
    for (let x = 0; x < w; x++) {
      const edge = Math.min(1, Math.min(x, w - 1 - x) / 22);
      const top = hh - edge * (10 + lvl + 7 * n1(x + i * 0.9, 34, seed) + 3 * Math.sin(x * 0.09 + seed));
      for (let y = Math.max(0, Math.ceil(top)); y < hh; y++) {
        const slope = n1(x + 2 + i * 0.9, 34, seed) - n1(x - 2 + i * 0.9, 34, seed);
        const c = rampDither(FLOORS, clamp(5.4 + slope * 14 - (y - top) * 0.1 + (y - top < 1 ? 2.4 : 0) + (hash2(x, y, seed) - 0.5) * 0.5, 0, FLOORS.length - 1), x, y);
        b.set(x, y, c);
      }
      // grains blown off the drift's top
      if (hash2(x, i, seed + 1) > 0.9) b.set(x, Math.round(top - 1 - hash2(x, i, seed + 2) * 3), FLOORS[8]);
    }
    out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The wind
// ---------------------------------------------------------------------------

/** Sand streaming off a crest: grains leave a line of crest points, carried right and sinking, the frames looping exactly. */
function spindrift(w: number, hh: number, n: number, seed: number, crest: (x: number) => number, x0: number, x1: number, at: [number, number], mask?: (x: number, y: number) => boolean): Bitmap[] {
  const r = rng(seed);
  const grains = Array.from({ length: 90 }, () => ({ x: x0 + r() * (x1 - x0), ph: r(), len: 18 + r() * 34, lift: 2 + r() * 6, c: r() }));
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    for (const g of grains) {
      const t = (i / n + g.ph) % 1;
      const sx = g.x + t * g.len;
      const sy = crest(g.x) - Math.sin(t * Math.PI) * g.lift + t * 4;
      const px = Math.round(sx - at[0]), py = Math.round(sy - at[1]);
      if (t > 0.9 || (mask && !mask(Math.round(sx), Math.round(sy)))) continue;
      b.set(px, py, g.c > 0.5 ? GOLD[11] : GOLD[10]);
    }
    out.push(b);
  }
  return out;
}

/** Runnels of sand sliding down the huge dune's lee: pale threads creeping down the shade, slowly. */
function slides(n: number): Bitmap[] {
  const w = 170, hh = 130;
  const at: [number, number] = [HUGE.x - 20, HUGE.y + 20];
  const r = rng(301);
  const list = Array.from({ length: 16 }, () => ({ y0: at[1] + r() * 70, off: 4 + r() * 90, ph: r(), len: 10 + r() * 26 }));
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    for (const s of list) {
      const t = (i / n + s.ph) % 1;
      const yh = s.y0 + t * 44;
      for (let k = 0; k < s.len; k++) {
        const y = yh + k;
        const x = duneEdge(HUGE, y) + s.off * 0.5 + k * 0.5;
        if (y >= 186 || !dith(Math.round(x), Math.round(y), Math.sin(t * Math.PI) * 0.8)) continue;
        b.set(Math.round(x - at[0]), Math.round(y - at[1]), GOLD[k < 3 ? 5 : 4]);
      }
    }
    out.push(b);
  }
  return out;
}

/** Low snakes of sand running over the arena with the wind, each wavering, thin and pale; a lull between them. */
function snakes(w: number, hh: number, n: number, seed: number): Bitmap[] {
  const r = rng(seed);
  const list = Array.from({ length: 9 }, () => ({ y: r() * hh, ph: r(), len: 34 + r() * 60, seed: Math.floor(r() * 1000) }));
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    for (const s of list) {
      const t = (i / n + s.ph) % 1;
      if (t > 0.72) continue;
      const k = t / 0.72;
      const head = -s.len + k * (w + s.len);
      for (let q = 0; q < s.len; q++) {
        const x = Math.round(head + q);
        if (x < 0 || x >= w) continue;
        const a = (q / s.len) * Math.sin(k * Math.PI);
        if (!dith(x, Math.round(s.y), a * 0.8)) continue;
        b.set(x, Math.round(s.y + Math.sin(x * 0.11 + s.seed) * 2), FLOORS[8]);
      }
    }
    out.push(b);
  }
  return out;
}

/** A dust devil: a thin leaning column of grains turning round itself, wider at its top. */
function dustDevil(n: number): Bitmap[] {
  const w = 26, hh = 58;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    for (let k = 0; k < 150; k++) {
      const u = hash2(k, 0, 311);
      const y = hh - 1 - u * (hh - 2);
      const rad = 1 + u * u * 10;
      const a = hash2(k, 1, 312) * Math.PI * 2 + (i / n) * Math.PI * 2 + u * 6;
      const x = w / 2 + (u - 0.5) * 3 + Math.cos(a) * rad;
      const front = Math.sin(a) > 0;
      if (!dith(Math.round(x), Math.round(y), 0.82 - u * 0.4)) continue;
      b.set(Math.round(x), Math.round(y), front ? GOLD[9] : GOLD[6]);
    }
    out.push(b);
  }
  return out;
}

/**
 * A strange light travelling beneath the sand: a soft pale glow breaking through
 * the grains along a wavering line, swelling and dying away; most of the loop's
 * frames are empty, so it only comes now and then. `at`, the box's place on screen.
 */
function underLight(w: number, hh: number, n: number, lit: number, seed: number, mask?: (x: number, y: number) => boolean, at: [number, number] = [0, 0]): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    out.push(b);
    if (i >= lit) continue;
    const t = i / (lit - 1);
    const env = Math.sin(t * Math.PI);
    const cx = w * (0.12 + t * 0.76), cy = hh * (0.5 + 0.28 * Math.sin(t * 5 + seed));
    const rx = 15 + env * 12, ry = 5 + env * 5;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (x < 0 || y < 0 || x >= w || y >= hh) continue;
        if (mask && !mask(x + at[0], y + at[1])) continue;
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
        if (d > 1) continue;
        // through the sand: only the grains that let it pass, thinner toward the edge
        const a = (1 - d) * env * (0.45 + vnoise(x + i * 2, y, 3, seed) * 0.8);
        if (!dith(x, y, a)) continue;
        b.set(x, y, GLOW[a > 0.72 ? 3 : a > 0.5 ? 2 : a > 0.3 ? 1 : 0]);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The arena's ground and what lies in it
// ---------------------------------------------------------------------------

function floorGround(): Bitmap {
  const { w, h } = FLOOR;
  const b = new Bitmap(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) b.set(x, y, groundColor(x, y + 192));
  // bones and shards lying half out of the sand
  const r = rng(601);
  for (let i = 0; i < 13; i++) {
    const x = 10 + r() * 620, y = 206 + Math.pow(r(), 0.8) * 146;
    if (busy(x, y)) continue;
    const s = pscale(y);
    const a = r() * 0.7 - 0.35;
    const l = (3 + r() * 5) * s * 1.6;
    const bone = r() < 0.6;
    for (let k = -l; k <= l; k++) {
      const px = Math.round(x + Math.cos(a) * k), py = Math.round(y - 192 + Math.sin(a) * k);
      b.set(px, py, (bone ? BONE : STONE)[Math.abs(k) > l - 1 ? 3 : 2]);
      b.set(px, py + 1, FLOORS[1]);
    }
  }
  return b;
}

/** A warrior of an old war half out of the sand: skull and ribs, the rusted sword driven in beside him. */
function buriedWarrior(): Bitmap {
  const b = new Bitmap(60, 44);
  // the sword
  for (let y = 4; y < 34; y++) {
    b.set(44, y, IRON[y < 12 ? 4 : 3]);
    b.set(45, y, IRON[1]);
  }
  for (let x = 40; x <= 49; x++) b.set(x, 11, IRON[x < 45 ? 3 : 2]);
  for (let y = 5; y < 11; y++) b.set(44, y, hex('#4a3020'));
  // the ribs arching out of the sand
  for (let k = 0; k < 4; k++) boneStroke(b, 14 + k * 5, 30, 12 + k * 5, 19 + k, 20 + k * 5, 34, 0.9, 0.7);
  // the skull, tipped back
  ellipseFill(b, 32, 26, 6.4, 5.8, (x, y, d) => rampDither(BONE, 5.2 - d * 2.2 - (x - 32) * 0.18 - (y - 26) * 0.18, x, y));
  ellipseFill(b, 34, 25.6, 1.8, 2, () => BONE[0]);
  ellipseFill(b, 29.4, 25.4, 1.4, 1.8, () => BONE[0]);
  for (const x of [29, 31, 33, 35]) b.set(x, 31, BONE[5]);
  // the sand over the rest of him
  for (let x = 0; x < 60; x++) {
    const top = 33 + Math.sin(x * 0.16) * 2 + (n1(x, 13, 611) - 0.5) * 3;
    for (let y = Math.round(top); y < 44; y++) b.set(x, y, rampDither(FLOORS, 5.8 - (y - top) * 0.2 + (hash2(x, y, 612) - 0.5) * 0.5, x, y));
  }
  return b;
}

/** A dented helmet half sunk. */
function helmet(): Bitmap {
  const b = new Bitmap(24, 16);
  ellipseFill(b, 12, 8, 8, 7, (x, y, d) => rampDither(IRON, 3.6 - d * 1.6 - (x - 12) * 0.2 - (y - 8) * 0.25, x, y));
  for (let y = 7; y < 11; y++) b.set(16, y, IRON[0]);
  for (let x = 10; x < 18; x++) b.set(x, 7, IRON[0]);
  for (let x = 0; x < 24; x++) for (let y = 11 + Math.round(Math.sin(x * 0.4)); y < 16; y++) b.set(x, y, rampDither(FLOORS, 5.8 + (hash2(x, y, 621) - 0.5) * 0.5, x, y));
  return b;
}

/** A fallen column drum in the near corner, drifted against, dark against the bright sand. */
function fallenDrum(flip: boolean, seed: number): Bitmap {
  const w = 110, hh = 66;
  const b = new Bitmap(w, hh);
  for (let x = 0; x < w; x++) {
    for (let y = 12; y < 50; y++) {
      const u = (y - 31) / 19;
      if (Math.abs(u) > 1 || Math.abs(x - w / 2) > 46) continue;
      let v = 3.2 - u * 2.6;
      if (y % 4 === 0) v -= 0.8;
      b.set(x, y, rampDither(STONE, clamp(v - 1, 0, STONE.length - 1), x, y));
    }
  }
  ellipseFill(b, flip ? w / 2 + 46 : w / 2 - 46, 31, 6, 19, (x, y, d) => rampDither(STONE, (flip ? 2 : 4.6) - d * 1.4, x, y));
  for (let x = 0; x < w; x++) {
    const top = 42 + (n1(x, 37, seed) - 0.5) * 14 + Math.abs(x - w / 2) * 0.14;
    for (let y = Math.round(top); y < hh; y++) b.set(x, y, rampDither(FLOORS, 4 - (y - top) * 0.1 + (y - top < 1 ? 2.4 : 0) + (hash2(x, y, seed + 1) - 0.5) * 0.5, x, y));
  }
  return b;
}

function vultures(): Bitmap[] {
  const frames = [
    ['.#.......#.', '.##.....##.', '..#######..', '....###....'],
    ['.#.......#.', '.##.....##.', '..#######..', '....###....'],
    ['...........', '.##.....##.', '#.#######.#', '....###....'],
    ['.#.......#.', '.##.....##.', '..#######..', '....###....'],
  ];
  return frames.map((rows) => {
    const b = new Bitmap(11, 4);
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && b.set(x, y, y >= 2 && x > 3 && x < 7 ? VULT[1] : VULT[0])));
    return b;
  });
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

/** the huge dune's sunlit face above the arena, for the light beneath it */
const onHugeFace = (x: number, y: number) => y > duneTop(HUGE, x) + 4 && x < duneEdge(HUGE, y) - 2 && y < 174;

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const r = rng(701);
  const plain = ['sand_a', 'sand_b', 'sand_c'];
  for (let row = 6; row < MAP_ROWS; row++) for (let c = 0; c < MAP_COLS; c++) ground[row * MAP_COLS + c] = id(plain[Math.floor(r() * plain.length)]);
  const props: PropPlacement[] = [
    // far: the dust devil wandering over the flanks, sand off the crests, the lee's runnels, the light beneath the huge dune
    { kind: 'devil', x: 250, y: 168, layer: 'far' },
    { kind: 'drift_huge', x: 548, y: 36, layer: 'far' },
    { kind: 'drift_left', x: 120, y: 94, layer: 'far' },
    { kind: 'slides', x: HUGE.x - 20, y: HUGE.y + 20, layer: 'far' },
    { kind: 'light_dune', x: 330, y: 120, layer: 'far' },
    // back: half buried on the arena's far edge, their drifts rising and falling
    { kind: 'ribs', x: 134, y: 196, layer: 'back' },
    { kind: 'colonnade', x: 508, y: 198, layer: 'back' },
    // floor: the ground, the snakes of sand, the light beneath it, what lies in it
    { kind: 'ground', x: 0, y: 192, layer: 'floor' },
    { kind: 'light_floor', x: 210, y: 208, layer: 'floor' },
    { kind: 'snake_a', x: 0, y: 214, layer: 'floor' },
    { kind: 'snake_b', x: 0, y: 296, layer: 'floor' },
    { kind: 'helmet', x: 612, y: 244, layer: 'floor' },
    { kind: 'warrior', x: 42, y: 322, layer: 'floor' },
    // fg: a fallen drum in the near right corner
    { kind: 'drum', x: 640, y: 362, layer: 'fg' },
  ];
  const order = { far: 0, back: 1, floor: 2, fg: 3 } as const;
  props.sort((a, c) => order[a.layer] - order[c.layer] || a.y - c.y);
  return { ground, wall, props };
}

export const zone6: ZoneArt = {
  id: 'zone6',
  name: 'Golden Expanse',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    devil: dustDevil(8),
    drift_huge: spindrift(220, 70, 16, 321, (x) => duneTop(HUGE, x), 548 - 90, 548 + 40, [548 - 100, 36 - 20]),
    drift_left: spindrift(200, 60, 16, 322, (x) => duneTop(NEAR[0], x), 120 - 90, 120 + 40, [120 - 100, 94 - 20]),
    slides: slides(24),
    light_dune: underLight(120, 50, 44, 16, 331, onHugeFace, [330 - 60, 120 - 25]),
    ribs: buried(150, 74, 14, 12, 341, ribcage),
    colonnade: buried(122, 70, 14, 12, 342, colonnade),
    ground: [floorGround()],
    light_floor: underLight(220, 46, 52, 18, 351),
    snake_a: snakes(640, 40, 30, 361),
    snake_b: snakes(640, 52, 34, 362),
    helmet: [helmet()],
    warrior: [buriedWarrior()],
    drum: [fallenDrum(true, 371)],
    bird: vultures(),
  }),
  kinds: {
    devil: { anchor: [0.5, 1], mode: 'loop', ms: 130, drift: { speed: 2.4 } },
    drift_huge: { anchor: [100 / 220, 20 / 70], mode: 'loop', ms: 150 },
    drift_left: { anchor: [100 / 200, 20 / 60], mode: 'loop', ms: 170 },
    slides: { anchor: [0, 0], mode: 'loop', ms: 240 },
    // about four seconds of light, then about ten of nothing; the two never keep time
    light_dune: { anchor: [0.5, 0.5], mode: 'loop', ms: 310 },
    // the drifts take about half a minute to rise and fall
    ribs: { anchor: [0.5, 1], mode: 'loop', ms: 2200 },
    colonnade: { anchor: [0.5, 1], mode: 'loop', ms: 2600 },
    ground: { anchor: [0, 0], mode: 'static' },
    light_floor: { anchor: [0, 0], mode: 'loop', ms: 340 },
    snake_a: { anchor: [0, 0], mode: 'loop', ms: 150 },
    snake_b: { anchor: [0, 0], mode: 'loop', ms: 170 },
    helmet: { anchor: [0.5, 1], mode: 'static' },
    warrior: { anchor: [0.5, 1], mode: 'static' },
    drum: { anchor: [1, 1], mode: 'static' },
    bird: { anchor: [0.5, 0.5], mode: 'loop', ms: 460 },
  },
  layout,
  horizon: HZ,
};
