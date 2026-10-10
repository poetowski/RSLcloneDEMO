// Zone "A Dim Island": Zone 1 of Jakub's working notes (docs/DESIGN_DECISIONS.md
// 5.3, 5.5): open sky, a dim island, a small settlement, two worlds touching.
// The fight is on the green at the edge of the settlement: a low dry-stone
// wall with a gap where the path leaves for the island's edge, a cottage at
// each end, and the standards of the Azure Crown (blue, a crown) and the
// Sanguine Dominion (black, a red hexagon) framing the field. Beyond the wall
// the island ends against a dim dusk sky over a sea of cloud, with other
// islands drifting in it, one of them upside down. The settlement's kind
// (village, ruin, outpost or camp) is still open in the notes; this first take
// draws a few cottages. Light comes from the veiled sun in the upper left.
import { Bitmap, hash2, hex, RGBA, rng, withAlpha } from '../raster.ts';
import { dith, disc, ellipseFill, line, outline, polyFill, rampDither } from '../paint.ts';
import { flames, MAP_COLS, MAP_ROWS, Painter, PropPlacement, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));

// sky, dark to light: a dim dusk, slate overhead, grey mauve at the horizon
const SKY = H(['#0b0e1e', '#11162a', '#171e38', '#1f2844', '#283250', '#323c5c', '#3e4766', '#4c526f', '#5c5e78', '#6e6a80', '#827686', '#96828a']);
const SUN = H(['#a89890', '#cbbcae', '#e6dac8', '#f8f2e6']);
const CLOUD = H(['#1a2034', '#232a42', '#2e3550', '#3b4160', '#4c506e', '#62627e', '#7c768c', '#968a98']);
const FAR = H(['#1c2034', '#252a42', '#30364f', '#3d425d']);
const FAR_GREEN = H(['#2a3640', '#36443f', '#44524a']);
// the island
const GRASS = H(['#171f18', '#20291d', '#2a3523', '#344029', '#3f4c30', '#4b5837', '#59663f']);
const FIELD = H(['#161d1a', '#1d261f', '#253025', '#2e3a2b', '#384430']);
const EARTH = H(['#1d1813', '#2a221a', '#382d21', '#473929', '#574833', '#6a583f']);
const ST = H(['#0f1017', '#1a1b24', '#262833', '#343744', '#444857', '#565b6b', '#6b7081', '#868b9a']);
const MOSS = H(['#26301f', '#344127', '#43522f']);
const WOOD = H(['#140e0a', '#221811', '#322419', '#443222', '#56412d', '#6a523a']);
const THATCH = H(['#1b150d', '#2a2214', '#3a301c', '#4b3f25', '#5d4f2e', '#706039', '#857446']);
const LAMP = H(['#4a2210', '#9a5020', '#d88838', '#ffbc68', '#ffe6b0']);
const IRON = H(['#0d0d12', '#1b1b23', '#2b2c37', '#3f414e', '#5a5d6b']);
const FIRE = H(['#7a1a10', '#c8361a', '#f2731e', '#ffb84a', '#fff0b0']);
const SMOKE = H(['#2a2c38', '#3a3c4a', '#4c4e5c', '#62636f']);
// the two standards
const AZURE = H(['#0a1430', '#122458', '#1c3c8c', '#2856b8', '#4a7ae0', '#7aa4f4']);
const SABLE = H(['#050407', '#0c0a0f', '#151219', '#1f1b24', '#2a2530', '#37313e']);
const GOLD = H(['#3a1e08', '#7a4a12', '#c08a28', '#f0c650', '#fff0a0']);
const BLOOD = H(['#3a0a12', '#7a1622', '#b02a36', '#e0505a', '#ff9a96']);

const SUN_X = 96, SUN_Y = 46;
/** backdrop y where the island's far edge meets the cloud sea */
const EDGE_Y = 124;

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

/** Value noise that repeats every tile (32 px), so tiles painted with it join seamlessly. */
function tnoise(x: number, y: number, cell: number, seed: number): number {
  const n = TILE / cell;
  const fx = x / cell, fy = y / cell;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const h = (i: number, j: number) => hash2(((i % n) + n) % n, ((j % n) + n) % n, seed);
  const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Smooth 1D value noise in [0, 1] at a scale of `s` px. */
function n1(x: number, s: number, seed: number): number {
  const f = x / s, i = Math.floor(f), t = f - i, u = t * t * (3 - 2 * t);
  return hash2(i, 0, seed) * (1 - u) + hash2(i + 1, 0, seed) * u;
}

/** How far a pixel is inside its tile: 0 on the border band, 1 from 6 px in. */
const inner = (x: number, y: number) => Math.min(1, Math.max(0, (Math.min(x, y, TILE - 1 - x, TILE - 1 - y) - 1) / 5));

/**
 * Grass: one base field shared by every variant (so any two tiles join), with
 * each variant's own mid-scale patches faded in away from the border, then
 * blades, tufts, small stones and the odd pale flower inside the tile.
 */
function grass(o: { patch?: number; tufts?: number; stones?: number; flowers?: number; shade?: number } = {}): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        let v = 2.9 + (tnoise(x, y, 16, 3) - 0.5) * 0.7 + (tnoise(x, y, 8, 4) - 0.5) * 0.45;
        v += ((tnoise(x, y, 16, seed) - 0.5) * 0.9 + (o.patch ?? 0) * (tnoise(x, y, 8, seed + 1) - 0.5)) * inner(x, y);
        // blades: a lit tip over a dark root, on a grid that repeats with the tile
        if (hash2(x, y, 7) > 0.9) v += 0.9;
        else if (hash2(x, (y + 31) % TILE, 7) > 0.9) v -= 0.7;
        if (o.shade) v -= o.shade * Math.max(0, 1 - y / 10);
        b.set(x, y, rampDither(GRASS, v, x, y));
      }
    }
    const r = rng(seed);
    for (let i = 0; i < (o.tufts ?? 2); i++) tuft(b, 5 + Math.floor(r() * 22), 9 + Math.floor(r() * 18), r);
    for (let i = 0; i < (o.stones ?? 0); i++) pebble(b, 5 + Math.floor(r() * 21), 6 + Math.floor(r() * 20), r);
    for (let i = 0; i < (o.flowers ?? 0); i++) {
      const fx = 5 + Math.floor(r() * 22), fy = 5 + Math.floor(r() * 22);
      b.set(fx, fy, FAR_GREEN[2]);
      b.set(fx, fy - 1, hex('#8c8aa0'));
    }
  };
}

/** A tuft of longer blades, lit on the left, rooted in a small shadow. */
function tuft(b: Bitmap, x: number, y: number, r: () => number) {
  for (let k = -3; k <= 3; k++) {
    const h = 3 + Math.floor(r() * 3) - Math.abs(k) / 2;
    const lean = k * 0.35;
    for (let i = 0; i < h; i++) b.set(Math.round(x + k + lean * (i / h)), y - i, i === h - 1 ? GRASS[k < 0 ? 6 : 5] : GRASS[k < 0 ? 4 : 3]);
  }
  for (let k = -3; k <= 3; k++) b.set(x + k, y + 1, GRASS[1]);
}

function pebble(b: Bitmap, x: number, y: number, r: () => number) {
  const w = 2 + Math.floor(r() * 2);
  for (let k = 0; k < w; k++) {
    b.set(x + k, y, ST[k === 0 ? 5 : 4]);
    b.set(x + k, y + 1, ST[3]);
  }
  b.set(x + w, y + 1, GRASS[1]);
  for (let k = 0; k <= w; k++) b.set(x + k, y + 2, GRASS[1]);
}

/**
 * Dry-stone courses: irregular flat stones laid without mortar, each lit on
 * its top and left edge, dark gaps between them. `top` is where the wall
 * starts (rows above it stay transparent).
 */
function drystone(b: Bitmap, seed: number, top = 0, bottom = TILE) {
  let y = top;
  let row = 0;
  while (y < bottom) {
    const r = rng(seed * 17 + row * 31);
    const h = Math.min(bottom - y, 5 + Math.floor(r() * 3));
    // stones of this course; the course repeats every tile so walls join
    let x = -Math.floor(r() * 9);
    while (x < TILE) {
      const w = 7 + Math.floor(r() * 9);
      const tone = 3.6 + (r() - 0.5) * 1.3;
      for (let yy = y; yy < y + h; yy++) {
        for (let xx = Math.max(0, x); xx < Math.min(TILE, x + w); xx++) {
          const lx = xx - x, ly = yy - y;
          if (lx === w - 1 || ly === h - 1) {
            b.set(xx, yy, ST[1]);
            continue;
          }
          // rounded ends: the stone's corners fall into the gap
          if ((lx === 0 || lx === w - 2) && (ly === 0 || ly === h - 2)) {
            b.set(xx, yy, ST[2]);
            continue;
          }
          let v = tone + (ly === 0 ? 1.2 : 0) + (lx === 0 ? 0.6 : 0) - (ly === h - 2 ? 0.9 : 0) - (lx === w - 2 ? 0.5 : 0);
          v += (hash2(xx, yy, seed) - 0.5) * 0.5 - (yy - top) * 0.02;
          b.set(xx, yy, rampDither(ST, v, xx, yy));
        }
      }
      // a little moss in the joint on top of some stones
      if (r() < 0.3) for (let k = 1; k < w - 2; k++) if (hash2(x + k, y, seed) > 0.45 && x + k >= 0 && x + k < TILE) b.set(x + k, y, MOSS[k < 3 ? 2 : 1]);
      x += w;
    }
    y += h;
    row++;
  }
}

/** The capstones along the top of the wall: rounded stones set on edge, from y0 down to the bed. */
function coping(b: Bitmap, y0: number, seed: number) {
  const r = rng(seed);
  for (let x = 0; x < TILE; ) {
    const w = 4 + Math.floor(r() * 3);
    const h = 4 + Math.floor(r() * 3);
    const top = y0 + 8 - h;
    for (let yy = top; yy < y0 + 8; yy++) {
      for (let xx = x; xx < Math.min(TILE, x + w); xx++) {
        const lx = xx - x, ly = yy - top;
        if (lx === w - 1) {
          b.set(xx, yy, ST[1]);
          continue;
        }
        // round the top corners off
        if (ly === 0 && (lx === 0 || lx === w - 2)) continue;
        const v = 4 + (ly === 0 ? 1.4 : ly === 1 ? 0.6 : 0) + (lx === 0 ? 0.6 : 0) - ly * 0.15 + (hash2(xx, yy, seed) - 0.5) * 0.5;
        b.set(xx, yy, rampDither(ST, v, xx, yy));
      }
    }
    x += w;
  }
  // the bed the coping sits on
  for (let x = 0; x < TILE; x++) {
    b.set(x, y0 + 8, ST[1]);
    b.set(x, y0 + 9, ST[2]);
  }
}

/** Grass grown up against the foot of the wall, `from` px from the tile top. */
function footGrass(b: Bitmap, from: number, seed: number) {
  for (let x = 0; x < TILE; x++) {
    const h = 2 + Math.floor(hash2(x, 1, seed) * 4) + (hash2(x >> 2, 2, seed) > 0.6 ? 2 : 0);
    for (let i = 0; i < h; i++) {
      const y = TILE - 1 - i;
      if (y < from) break;
      b.set(x, y, rampDither(GRASS, 2.2 + i * 0.6 + (x % 3 === 0 ? 0.6 : 0), x, y));
    }
  }
}

const P: Record<string, Painter> = {
  // --- floor: grass variants, a darker one in the wall's shadow
  grass_a: grass({ tufts: 2 }),
  grass_b: grass({ tufts: 1, stones: 1 }),
  grass_c: grass({ patch: 0.8, tufts: 2, flowers: 1 }),
  grass_d: grass({ patch: 0.6, tufts: 3 }),
  grass_e: grass({ tufts: 1, flowers: 2 }),
  grass_f: grass({ patch: 1, tufts: 2, stones: 2 }),
  grass_shade: grass({ tufts: 1, shade: 1.1 }),
  grass_shade_b: grass({ patch: 0.6, tufts: 2, shade: 1.1 }),
  // --- the low wall: coping on the upper tile, courses and foot grass below
  wall_top: (b, s) => {
    coping(b, 16, s);
    drystone(b, s, 26);
  },
  wall_face: (b, s) => {
    drystone(b, s + 3, 0);
    footGrass(b, 20, s);
  },
  // the ends of the wall at the gap: the left segment ends facing the gap (in shadow), the right one starts lit
  wall_top_end_r: (b, s) => {
    P.wall_top(b, s);
    for (let y = 14; y < TILE; y++) for (let x = 24; x < TILE; x++) b.set(x, y, 0);
    for (let y = 20; y < TILE; y++) for (let x = 20; x < 24; x++) b.set(x, y, rampDither(ST, 2.4 - (x - 20) * 0.2, x, y));
  },
  wall_face_end_r: (b, s) => {
    P.wall_face(b, s);
    for (let y = 0; y < TILE; y++) for (let x = 24; x < TILE; x++) b.set(x, y, 0);
    for (let y = 0; y < TILE - 4; y++) for (let x = 20; x < 24; x++) b.set(x, y, rampDither(ST, 2.2 - (x - 20) * 0.2 + (hash2(x, y, s) - 0.5) * 0.4, x, y));
    footGrass(b, 26, s + 1);
  },
  wall_top_end_l: (b, s) => {
    P.wall_top(b, s);
    for (let y = 14; y < TILE; y++) for (let x = 0; x < 8; x++) b.set(x, y, 0);
    for (let y = 20; y < TILE; y++) for (let x = 8; x < 11; x++) b.set(x, y, rampDither(ST, 5 - (x - 8) * 0.4, x, y));
  },
  wall_face_end_l: (b, s) => {
    P.wall_face(b, s);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < 8; x++) b.set(x, y, 0);
    for (let y = 0; y < TILE - 4; y++) for (let x = 8; x < 11; x++) b.set(x, y, rampDither(ST, 4.8 - (x - 8) * 0.4 + (hash2(x, y, s) - 0.5) * 0.4, x, y));
    footGrass(b, 26, s + 2);
  },
};

// ---------------------------------------------------------------------------
// Backdrop: dusk sky, the veiled sun, cloud strata, drifting islands, the
// cloud sea, and the island's own far ground with the path and the roofs
// ---------------------------------------------------------------------------

function backdrop(W = 640, HH = 200): Bitmap {
  const b = new Bitmap(W, HH);
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < W; x++) {
      const t = Math.pow(Math.min(1, y / 122), 1.2);
      const glow = Math.max(0, 1 - Math.hypot((x - SUN_X) / 1.4, y - SUN_Y) / 150);
      b.set(x, y, rampDither(SKY, t * (SKY.length - 1) + glow * glow * 3.2, x, y));
    }
  }
  // a few stars still showing high up, away from the sun
  const r = rng(17);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * W), y = Math.floor(Math.pow(r(), 1.8) * 50);
    if (Math.hypot(x - SUN_X, y - SUN_Y) < 110) continue;
    b.set(x, y, withAlpha(hex('#c8c8e0'), 70 + Math.floor(r() * 90)));
  }
  // the veiled sun: a pale disc low in the upper left, a stratum drawn across it
  disc(b, SUN_X, SUN_Y, 9, (x, y, d) => rampDither(SUN, 3.4 - d * 1.4 - (x - SUN_X + (y - SUN_Y)) / 18, x, y));
  // cloud strata: long lenses with tapered ends and ragged edges, lit along their tops, brightest near the sun
  const strata: [number, number, number, number][] = [
    [116, 50, 74, 4],
    [474, 20, 124, 4],
    [262, 34, 58, 3],
    [604, 50, 84, 4],
    [338, 68, 150, 5],
    [64, 82, 108, 6],
    [530, 92, 128, 6],
    [236, 100, 92, 4],
  ];
  strata.forEach(([cx, cy, rx, th], i) => {
    for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
      if (x < 0 || x >= W) continue;
      const k = (x - cx) / rx;
      const thick = th * Math.sqrt(Math.max(0, 1 - k * k)) * (0.55 + 0.9 * n1(x, 9, i * 7 + 1));
      if (thick < 0.9) continue;
      const mid = cy + (n1(x, 31, i * 7 + 2) - 0.5) * 4;
      const top = mid - thick * 0.65, bottom = mid + thick * 0.35;
      const sun = Math.max(0, 1 - Math.hypot(x - SUN_X, cy - SUN_Y) / 220);
      for (let y = Math.floor(top); y < bottom; y++) {
        if (y < 0 || y >= HH) continue;
        const kk = (y - top) / (bottom - top);
        const v = 0.9 + (cy / 122) * 3 + (1 - kk) * 1.7 + sun * 2.2;
        b.set(x, y, rampDither(CLOUD, v, x, y));
      }
    }
  });
  // islands drifting in the open sky, cooler and hazier the farther they are; one hangs upside down
  farIsland(b, 446, 80, 0.82, false);
  farIsland(b, 226, 58, 0.5, false);
  farIsland(b, 330, 22, 0.5, true);
  farIsland(b, 572, 36, 0.3, false);
  farIsland(b, 150, 100, 0.24, false);
  // the cloud sea at the horizon, far below the island's edge: puffy crests lit from the left
  for (let x = 0; x < W; x++) {
    const crest = 106 + (n1(x, 14, 61) - 0.5) * 5 + (n1(x, 5, 62) - 0.5) * 2;
    for (let y = Math.floor(crest); y < EDGE_Y + 2; y++) {
      const k = (y - crest) / (EDGE_Y + 2 - crest);
      const slope = n1(x + 2, 14, 61) - n1(x - 2, 14, 61);
      b.set(x, y, rampDither(CLOUD, 4.8 - k * 3 - slope * 6 + (x < 300 ? 0.5 : 0), x, y));
    }
  }
  island(b, W, HH);
  return b;
}

/** A distant island: a flat grassy top over a ragged cone of rock, hazed toward the sky. */
function farIsland(b: Bitmap, cx: number, cy: number, s: number, flipped: boolean) {
  const w = 46 * s, h = 40 * s;
  const sgn = flipped ? -1 : 1;
  const pts: [number, number][] = [[cx - w, cy], [cx + w, cy], [cx + w * 0.7, cy + sgn * h * 0.3], [cx + w * 0.35, cy + sgn * h * 0.62], [cx + w * 0.05, cy + sgn * h], [cx - w * 0.3, cy + sgn * h * 0.55], [cx - w * 0.75, cy + sgn * h * 0.25]];
  const haze = 1 - s;
  polyFill(b, pts, (x, y) => {
    const v = 2.1 - ((x - cx) / w) * 0.9 - (Math.abs(y - cy) / h) * 0.8 + (hash2(x >> 1, y >> 1, 3) - 0.5) * 0.5 - haze * 0.6;
    return rampDither(FAR, v, x, y);
  });
  // the grass lip, lit on top (or, upside down, a dark fringe hanging below)
  for (let x = Math.ceil(cx - w); x < cx + w; x++) {
    const y = Math.round(cy) - (flipped ? 0 : 1);
    b.set(x, y, FAR_GREEN[flipped ? 0 : x < cx ? 2 : 1]);
    if (!flipped && hash2(x, 3, 7) > 0.75) b.set(x, y - 1, FAR_GREEN[1]);
  }
  // a tree or two standing on it (hanging under the upturned one)
  const trees = s > 0.6 ? [-0.45, 0.2, 0.55] : flipped ? [-0.5, 0, 0.45] : [-0.2, 0.3];
  for (const t of trees) {
    const tx = Math.round(cx + w * t), th = Math.max(3, Math.round((flipped ? 16 : 12) * s));
    for (let i = 1; i <= th; i++) b.set(tx, Math.round(cy) - sgn * i, FAR[1]);
    ellipseFill(b, tx, cy - sgn * th, Math.max(2, 4.5 * s), Math.max(1.5, 3.2 * s), (x, y) => rampDither(FAR_GREEN, 1.6 - (x - tx) / 4 - (sgn * (y - (cy - sgn * th))) / 4, x, y));
  }
}

/**
 * The near island, beyond the wall: its grass running back to the edge with
 * the path from the gap, the low roofs of the settlement on both sides, and
 * the edge itself, a crisp lip over the cloud sea.
 */
function island(b: Bitmap, W: number, HH: number) {
  const edge = (x: number) => EDGE_Y + Math.round(Math.sin(x * 0.03) * 1.5 + (hash2(x >> 2, 1, 5) - 0.5) * 1.5);
  // the path narrows to a thread where it reaches the edge, and winds a little
  const pathHalf = (y: number) => 1.5 + Math.pow((y - EDGE_Y) / (HH - EDGE_Y), 1.6) * 44;
  const pathX = (y: number) => 320 + Math.sin((y - EDGE_Y) * 0.09) * 6 * (1 - (y - EDGE_Y) / (HH - EDGE_Y));
  for (let x = 0; x < W; x++) {
    const e = edge(x);
    for (let y = e; y < HH; y++) {
      const depth = (y - e) / (HH - e);
      const d = Math.abs(x + 0.5 - pathX(y)) - pathHalf(y);
      let c: RGBA;
      if (d < 0 || (d < 1.5 && dith(x, y, 0.5))) {
        // two wheel ruts darken the path
        const rut = Math.abs(Math.abs(x + 0.5 - pathX(y)) - pathHalf(y) * 0.45) < 0.8 + depth;
        c = rampDither(EARTH, 1.4 + depth * 1.8 + (hash2(x, y, 9) - 0.5) * 0.6 - (rut ? 0.7 : 0), x, y);
      } else {
        const v = 1.2 + depth * 2.6 + (hash2(x >> 1, y, 4) - 0.5) * 0.7 + (d < 3 ? -0.3 : 0);
        c = rampDither(depth < 0.5 ? FIELD : GRASS, depth < 0.5 ? v : v * 0.95, x, y);
      }
      b.set(x, y, c);
    }
    // the lip of the edge, lit
    b.set(x, e, x < 320 ? FIELD[4] : FIELD[3]);
  }
  // the rocky underside showing where the edge bends away at the far left and right
  for (const [x0, x1, dir] of [[0, 70, -1], [574, 640, 1]] as const) {
    for (let x = x0; x < x1; x++) {
      const k = dir < 0 ? (x1 - x) / (x1 - x0) : (x - x0) / (x1 - x0);
      const drop = Math.round(k * k * 10);
      for (let y = edge(x) - 1; y < edge(x) + drop; y++) b.set(x, y, rampDither(FAR, 2.4 - k - (y - edge(x)) * 0.1, x, y));
    }
  }
  // the settlement: low roofs peeking over the wall on both sides of the gap
  for (const [x, w, h, lit] of [[150, 30, 18, true], [186, 22, 14, false], [222, 18, 10, false], [404, 20, 12, false], [436, 30, 20, true], [478, 24, 15, false]] as const) roof(b, x, EDGE_Y + 8, w, h, lit);
}

/** A far cottage seen over the wall: dark thatch, a sliver of wall, sometimes a lit window. */
function roof(b: Bitmap, cx: number, base: number, w: number, h: number, lit: boolean) {
  const top = base - h;
  polyFill(b, [[cx - w / 2 - 2, base - 3], [cx - w / 2 + h * 0.4, top], [cx + w / 2 - h * 0.4, top], [cx + w / 2 + 2, base - 3]], (x, y) => rampDither(THATCH, 2.2 - ((x - cx) / w) * 1.2 - ((y - top) / h) * 0.8, x, y));
  for (let x = Math.round(cx - w / 2); x < cx + w / 2; x++) {
    for (let y = base - 3; y < base + 4; y++) b.set(x, y, rampDither(ST, 2.4 - (y - base) * 0.2, x, y));
  }
  if (lit) {
    for (const wx of [Math.round(cx - w / 4), Math.round(cx + w / 6)]) {
      b.set(wx, base, LAMP[3]);
      b.set(wx + 1, base, LAMP[2]);
      b.set(wx, base + 1, LAMP[2]);
      b.set(wx + 1, base + 1, LAMP[1]);
    }
    // a thin thread of smoke from the chimney
    const sx = Math.round(cx + w / 3);
    for (let i = 0; i < 4; i++) b.set(sx, top - 1 - i, ST[2]);
    for (let i = 0; i < 26; i++) {
      const y = top - 5 - i, x = Math.round(sx + Math.sin(i * 0.25) * 2 + i * 0.3);
      if (dith(x, y, 0.9 - i / 30)) b.set(x, y, SMOKE[i < 8 ? 2 : 1]);
    }
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * A cottage of the settlement: rough stone walls, a deep thatched roof with a
 * stone chimney, a plank door and a window with warm light behind open
 * shutters. `gable`: the gable end faces the field instead of the long side.
 * `bright`: the lamp turned up (frame 1 of the pulse).
 */
function cottage(gable: boolean, bright: boolean): Bitmap {
  const W = gable ? 128 : 156, HH = 140;
  const b = new Bitmap(W, HH);
  const ground = HH - 1;
  const wallTop = gable ? 76 : 70;
  const x0 = gable ? 14 : 12, x1 = W - 14;
  // walls of rough stone
  for (let y = wallTop; y <= ground; y++) {
    for (let x = x0; x < x1; x++) {
      const course = Math.floor((y - wallTop) / 6);
      const off = (course * 7) % 13;
      const lx = (x + off) % 13, ly = (y - wallTop) % 6;
      let v = 3.5 + (hash2(Math.floor((x + off) / 13), course, 5) - 0.5) * 1.1 - (y - wallTop) / 160;
      if (lx === 12 || ly === 5) v = 1.4;
      else if (ly === 0) v += 0.9;
      else if (lx === 0) v += 0.5;
      v += (hash2(x, y, 6) - 0.5) * 0.4 + (x - x0 < 3 ? 0.6 : 0) - (x1 - x < 4 ? 1 : 0);
      b.set(x, y, rampDither(ST, v, x, y));
    }
  }
  // the foundation course, darker, and grass at the foot
  for (let y = ground - 6; y <= ground; y++) for (let x = x0; x < x1; x++) b.set(x, y, rampDither(ST, 2.2 + (hash2(x >> 2, y >> 2, 8) - 0.5) * 0.8 - (ground - y < 2 ? 0.6 : 0), x, y));
  for (let x = x0 - 2; x < x1 + 2; x++) {
    const h = 1 + Math.floor(hash2(x, 4, 9) * 4);
    for (let i = 0; i < h; i++) b.set(x, ground - i, rampDither(GRASS, 2.4 + i * 0.7, x, ground - i));
  }
  // door
  const dx0 = gable ? 50 : 92, dw = 22, dTop = ground - 40;
  for (let y = dTop; y <= ground - 1; y++) {
    for (let x = dx0; x < dx0 + dw; x++) {
      const plank = (x - dx0) % 6 === 5;
      b.set(x, y, plank ? WOOD[0] : rampDither(WOOD, 2.6 - ((x - dx0) / dw) * 1.2 - (y - dTop) / 60 + (hash2(x, y >> 2, 2) - 0.5) * 0.4, x, y));
    }
  }
  for (const hy of [dTop + 8, ground - 10]) for (let x = dx0 + 1; x < dx0 + 12; x++) b.set(x, hy, IRON[3]);
  for (let x = dx0 - 2; x < dx0 + dw + 2; x++) {
    b.set(x, dTop - 3, ST[6]);
    b.set(x, dTop - 2, ST[5]);
    b.set(x, dTop - 1, ST[2]);
  }
  // window with warm light behind open shutters
  const wx0 = gable ? 56 : 52, wy0 = gable ? 40 : 96, ww = gable ? 14 : 18, wh = gable ? 14 : 16;
  const L = bright ? 0.6 : 0;
  for (let y = wy0; y < wy0 + wh; y++) {
    for (let x = wx0; x < wx0 + ww; x++) {
      const cross = x === wx0 + Math.floor(ww / 2) || y === wy0 + Math.floor(wh / 2);
      b.set(x, y, cross ? WOOD[1] : rampDither(LAMP, 2.6 + L - ((y - wy0) / wh) * 0.9 - ((x - wx0) / ww) * 0.6, x, y));
    }
  }
  for (const [sx, sw] of [[wx0 - 6, 5], [wx0 + ww + 1, 5]] as const) {
    for (let y = wy0 - 1; y < wy0 + wh + 1; y++) for (let x = sx; x < sx + sw; x++) b.set(x, y, (x - sx) % 3 === 2 ? WOOD[1] : rampDither(WOOD, 3.2 - (x - sx) / sw - (sx > wx0 ? 0.8 : 0), x, y));
  }
  for (let x = wx0 - 2; x < wx0 + ww + 2; x++) {
    b.set(x, wy0 + wh, ST[6]);
    b.set(x, wy0 + wh + 1, ST[3]);
  }
  if (gable) {
    // the gable end: two steep slopes of thatch over a triangle of dark timber boards
    const apex = 6, ridgeX = W / 2;
    polyFill(b, [[x0, wallTop], [ridgeX, apex + 12], [x1, wallTop]], (x, y) => rampDither(WOOD, 3.4 - (y - apex) / 70 - ((x - x0) / (x1 - x0)) * 0.8 + (hash2(x, y, 3) - 0.5) * 0.4, x, y));
    for (let y = apex + 14; y < wallTop; y += 9) for (let x = 0; x < W; x++) if (b.get(x, y) !== 0) b.set(x, y, WOOD[1]);
    line(b, ridgeX, apex + 14, ridgeX, wallTop, WOOD[1]);
    for (const side of [-1, 1]) {
      // each slope: a thick band of thatch from the apex down past the wall
      for (let t = 0; t <= 1; t += 0.004) {
        const cx = ridgeX + side * (t * (W / 2 + 4)), cy = apex + t * (wallTop + 8 - apex);
        for (let k = -7; k <= 7; k++) {
          const x = Math.round(cx - side * k * 0.4), y = Math.round(cy - 6 + k);
          if (x < 0 || x >= W || y < 0) continue;
          const lit = side < 0 ? 1 : -0.5;
          b.set(x, y, rampDither(THATCH, 3.2 + lit - ((k + 7) / 14) * 1.4 + (hash2(x, y >> 1, 4) - 0.5) * 0.9, x, y));
        }
      }
    }
    // chimney through the right slope
    for (let y = 8; y < 34; y++) for (let x = 88; x < 98; x++) b.set(x, y, x === 97 ? ST[1] : rampDither(ST, 4 - (x - 88) / 6 + (y % 5 === 0 ? -1 : 0), x, y));
  } else {
    // the long side: a deep hipped roof of thatch, the eave a thick rounded lip casting a shadow on the wall
    const eave = wallTop + 4, ridge = 18;
    for (let y = wallTop; y < wallTop + 6; y++) for (let x = x0; x < x1; x++) b.set(x, y, rampDither(ST, 1.4 + (y - wallTop) * 0.2, x, y));
    polyFill(b, [[2, eave], [30, ridge], [W - 32, ridge], [W - 2, eave]], (x, y) => {
      const course = (y - ridge + Math.sin(x * 0.08) * 1.5) % 9;
      let v = 3.6 - ((y - ridge) / (eave - ridge)) * 1.3 - (x / W) * 1 + (hash2(x, y >> 1, 4) - 0.5) * 1;
      if (course < 1) v -= 0.9;
      // the hipped end on the left faces the light
      if (x < 2 + (eave - y) * (28 / (eave - ridge)) + 3) v += 0.7;
      return rampDither(THATCH, v, x, y);
    });
    // the rounded eave lip
    for (let x = 2; x < W - 2; x++) {
      b.set(x, eave - 1, THATCH[2]);
      b.set(x, eave, THATCH[1]);
    }
    // ridge binding
    for (let x = 30; x < W - 32; x++) {
      b.set(x, ridge, THATCH[5]);
      b.set(x, ridge + 1, THATCH[3]);
      b.set(x, ridge + 2, THATCH[2]);
      if (x % 7 === 0) b.set(x, ridge + 3, THATCH[1]);
    }
    // moss on the thatch
    for (const [mx, my, mr] of [[46, 40, 6], [108, 56, 5], [70, 30, 3]] as const) ellipseFill(b, mx, my, mr * 1.6, mr * 0.7, (x, y) => (dith(x, y, 0.6) ? MOSS[x < mx ? 2 : 1] : 0));
    // stone chimney at the right of the ridge
    for (let y = 2; y < ridge + 12; y++) for (let x = W - 52; x < W - 40; x++) b.set(x, y, x === W - 41 ? ST[1] : rampDither(ST, 4.2 - (x - (W - 52)) / 7 + ((y + 1) % 5 === 0 ? -1 : 0), x, y));
    for (let x = W - 54; x < W - 38; x++) {
      b.set(x, 1, ST[6]);
      b.set(x, 2, ST[4]);
    }
  }
  return outline(b, ST[0]);
}

/** Smoke curling up from a chimney, a few frames of slow drift. */
function smoke(n = 6): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(28, 54);
    for (let k = 0; k < 7; k++) {
      const t = (k + i / n) / 7;
      const y = 52 - t * 50, x = 10 + Math.sin(t * 5 + 0.5) * 3 + t * 9;
      const r = 2 + t * 5;
      ellipseFill(b, x, y, r, r * 0.8, (px, py, d) => (dith(px, py, Math.min(1, (1 - d) * (1 - t) * 1.6)) ? SMOKE[d < 0.4 ? 3 : 2] : 0));
    }
    out.push(b);
  }
  return out;
}

/** A stone gatepost at the end of the wall, an iron fire basket on top. */
function gatepost(): Bitmap {
  const W = 20, HH = 72;
  const b = new Bitmap(W, HH);
  // the shaft: stacked blocks, lit on the left
  for (let y = 18; y < HH; y++) {
    for (let x = 3; x < 17; x++) {
      const block = Math.floor((y - 18) / 9);
      const ly = (y - 18) % 9;
      let v = 4.2 - ((x - 3) / 14) * 2 + (ly === 0 ? 0.9 : 0) - (ly === 8 ? 1.4 : 0) + (hash2(x, y, block) - 0.5) * 0.4;
      if (x === 16) v = 1.2;
      b.set(x, y, rampDither(ST, v, x, y));
    }
  }
  // cap stone
  for (let y = 14; y < 19; y++) for (let x = 1; x < 19; x++) b.set(x, y, rampDither(ST, y === 14 ? 6 : 4.4 - ((x - 1) / 18) * 1.6, x, y));
  // fire basket: an iron bowl of bars
  for (let y = 2; y < 14; y++) {
    const half = 4 + (y - 2) * 0.35;
    for (let x = Math.round(10 - half); x <= Math.round(10 + half); x++) {
      const bar = (x + y) % 3 === 0 || y === 2 || y === 13;
      if (!bar) {
        b.set(x, y, FIRE[y < 6 ? 2 : 1]);
        continue;
      }
      b.set(x, y, rampDither(IRON, 3 - ((x - 4) / 12) * 2, x, y));
    }
  }
  return outline(b, ST[0]);
}

/**
 * A standard on its pole, planted near the camera at the edge of the field:
 * the cloth hangs from a crossbar and stirs in the wind, frame by frame.
 * `azure`: the Azure Crown, blue with a gold crown; otherwise the Sanguine
 * Dominion, black with a red hexagon.
 */
function standard(azure: boolean, n = 4): Bitmap[] {
  const out: Bitmap[] = [];
  const cloth = azure ? AZURE : SABLE;
  const W = 54, HH = 196;
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    const ph = (i / n) * Math.PI * 2;
    const pole = azure ? 8 : W - 9;
    // pole and crossbar of dark wood, gold finial
    for (let y = 10; y < HH; y++) for (let x = pole - 2; x <= pole + 2; x++) b.set(x, y, rampDither(WOOD, 4 - (x - pole + 2) * 0.8, x, y));
    const bar0 = azure ? pole : 4, bar1 = azure ? W - 4 : pole;
    for (let x = bar0; x <= bar1; x++) {
      b.set(x, 16, WOOD[4]);
      b.set(x, 17, WOOD[3]);
      b.set(x, 18, WOOD[1]);
    }
    disc(b, pole + 0.5, 7, 4, (x, y, d) => rampDither(GOLD, 3.6 - d * 1.5 - (x - pole) / 4, x, y));
    // the cloth: hangs from the bar, ripples, a swallow-tailed hem
    const cx0 = (azure ? pole : 4) + 3, cx1 = (azure ? W - 4 : pole) - 3;
    for (let y = 19; y < 140; y++) {
      const t = (y - 19) / 121;
      const sway = Math.sin(ph + t * 3.2) * t * 3.2;
      for (let x = cx0; x <= cx1; x++) {
        const u = (x - cx0) / (cx1 - cx0);
        const hem = 132 + Math.abs(u - 0.5) * 24 - (Math.abs(u - 0.5) < 0.12 ? 14 : 0);
        if (y > hem) continue;
        const ripple = Math.sin(u * 7 + ph + t * 2) * 0.6;
        const X = Math.round(x + sway);
        const v = cloth.length * 0.62 - u * 1.4 + ripple + (u < 0.06 ? 0.8 : 0) - t * 0.4;
        b.set(X, y, rampDither(cloth, v, X, y));
      }
    }
    // the edges trimmed in gold (azure) or in red (sable)
    const trim = azure ? GOLD : BLOOD;
    for (let y = 19; y < 132; y++) {
      const t = (y - 19) / 121;
      const sway = Math.round(Math.sin(ph + t * 3.2) * t * 3.2);
      b.set(cx0 + sway, y, trim[2]);
      b.set(cx1 + sway, y, trim[1]);
    }
    // the device, centred on the cloth where the ripple is calm
    const mx = Math.round((cx0 + cx1) / 2 + Math.sin(ph + 0.55 * 3.2) * 0.55 * 3.2), my = 70;
    if (azure) crownDevice(b, mx, my);
    else hexDevice(b, mx, my);
    out.push(outline(b, azure ? AZURE[0] : SABLE[0]));
  }
  return out;
}

/** A gold crown: a band with three points and jewels, lit from the top-left. */
function crownDevice(b: Bitmap, cx: number, cy: number) {
  const pts: [number, number][] = [[cx - 12, cy + 8], [cx - 12, cy - 6], [cx - 6, cy + 1], [cx, cy - 11], [cx + 6, cy + 1], [cx + 12, cy - 6], [cx + 12, cy + 8]];
  polyFill(b, pts, (x, y) => rampDither(GOLD, 3.4 - (x - cx) / 14 - (y - cy) / 14, x, y));
  for (let x = cx - 12; x <= cx + 12; x++) {
    b.set(x, cy + 8, GOLD[1]);
    b.set(x, cy + 4, GOLD[2]);
  }
  for (const [x, y] of [[cx - 12, cy - 7], [cx, cy - 12], [cx + 12, cy - 7]]) b.set(x, y, GOLD[4]);
  for (const [x, c] of [[cx - 6, BLOOD[3]], [cx, AZURE[5]], [cx + 6, BLOOD[3]]] as const) {
    b.set(x, cy + 6, c);
    b.set(x + 1, cy + 6, c);
  }
}

/** A red hexagon, flat on top and bottom, lit from the top-left. */
function hexDevice(b: Bitmap, cx: number, cy: number) {
  const r = 12;
  const pts: [number, number][] = [];
  for (let k = 0; k < 6; k++) pts.push([cx + Math.cos((k * Math.PI) / 3) * r, cy + Math.sin((k * Math.PI) / 3) * r]);
  polyFill(b, pts, (x, y) => rampDither(BLOOD, 3.4 - (x - cx) / 16 - (y - cy) / 16, x, y));
  const inner: [number, number][] = pts.map(([x, y]) => [cx + (x - cx) * 0.62, cy + (y - cy) * 0.62]);
  polyFill(b, inner, (x, y) => rampDither(BLOOD, 2.2 - (x - cx) / 20 - (y - cy) / 20, x, y));
}

/** Barrels and a crate stacked by a cottage wall. */
function stores(): Bitmap {
  const b = new Bitmap(46, 34);
  // crate
  for (let y = 12; y < 33; y++) {
    for (let x = 2; x < 22; x++) {
      const edge = x === 2 || x === 21 || y === 12 || y === 32 || x - 2 === y - 12;
      b.set(x, y, edge ? WOOD[4] : rampDither(WOOD, 2.8 - (x - 2) / 20 - (y - 12) / 30 + ((y - 12) % 5 === 4 ? -0.8 : 0), x, y));
    }
  }
  // barrel
  ellipseFill(b, 33, 20, 10, 13, (x, y, d) => {
    if (y < 8 || y > 32) return 0;
    const hoop = y === 12 || y === 28;
    return hoop ? IRON[x < 31 ? 4 : 2] : rampDither(WOOD, 3.6 - ((x - 23) / 12) * 2 - d * 0.6, x, y);
  });
  ellipseFill(b, 33, 8, 9, 2.5, (x, y) => rampDither(WOOD, 3.8 - (x - 24) / 10, x, y));
  return outline(b, WOOD[0]);
}

/** Long grass at the bottom corners, nearest the camera. */
function longGrass(seed: number): Bitmap {
  const b = new Bitmap(70, 40);
  const r = rng(seed);
  for (let k = 0; k < 40; k++) {
    const x = 4 + r() * 62, h = 12 + r() * 26, lean = (r() - 0.4) * 8;
    for (let i = 0; i < h; i++) {
      const t = i / h;
      b.set(Math.round(x + lean * t * t), 39 - i, rampDither(GRASS, 1.4 + t * 3.4 + (x < 35 ? 0.5 : 0), Math.round(x), 39 - i));
    }
  }
  return outline(b, GRASS[0]);
}

/**
 * The trampled ground of the field: the path coming in through the gap and
 * opening into a worn patch where the two lines meet, edges dithered into the
 * grass and grass still standing in places.
 */
function worn(): Bitmap {
  const W = 400, HH = 160;
  const b = new Bitmap(W, HH);
  const cx = W / 2;
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < W; x++) {
      const path = Math.abs(x + 0.5 - cx - Math.sin(y * 0.05) * 2) / (40 + y * 0.45);
      const patch = Math.hypot((x + 0.5 - cx) / 176, (y + 0.5 - 88) / 58);
      const d = Math.min(path, patch) + (hash2(x >> 3, y >> 3, 21) - 0.5) * 0.35;
      if (d > 1) continue;
      const fray = (1 - d) * 2.6 + (hash2(x >> 1, y >> 1, 3) - 0.5) * 0.9;
      if (fray < 0.5 || !dith(x, y, Math.min(1, fray - 0.3))) continue;
      const v = 2.5 + (hash2(x >> 2, y >> 2, 6) - 0.5) * 0.8 - (y / HH) * 0.2 + (hash2(x, y, 7) > 0.97 ? 1 : 0);
      b.set(x, y, rampDither(EARTH, v, x, y));
    }
  }
  // stones and the odd tuft left standing in the dirt
  const r = rng(12);
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(40 + r() * 320), y = Math.floor(30 + r() * 110);
    if (b.get(x, y) === 0) continue;
    if (r() < 0.5) pebble(b, x, y, r);
    else tuft(b, x, y, r);
  }
  return b;
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

/** wall columns: the gap where the path goes out is cols 8-11 */
const GAP = [8, 11];

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const set = (layer: number[], c: number, r: number, n: string) => (layer[r * MAP_COLS + c] = id(n));
  const r = rng(77);
  const plain = ['grass_a', 'grass_b', 'grass_c', 'grass_d', 'grass_e', 'grass_f', 'grass_a', 'grass_d'];
  for (let row = 6; row < MAP_ROWS; row++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const inGap = c >= GAP[0] && c <= GAP[1];
      const n = row === 6 && !inGap ? (r() < 0.5 ? 'grass_shade' : 'grass_shade_b') : plain[Math.floor(r() * plain.length)];
      set(ground, c, row, n);
    }
  }
  for (let c = 0; c < MAP_COLS; c++) {
    if (c >= GAP[0] && c <= GAP[1]) continue;
    const end = c === GAP[0] - 1 ? '_end_r' : c === GAP[1] + 1 ? '_end_l' : '';
    set(wall, c, 4, 'wall_top' + end);
    set(wall, c, 5, 'wall_face' + end);
  }
  const props: PropPlacement[] = [
    { kind: 'cottage_l', x: -6, y: 196, layer: 'back' },
    { kind: 'cottage_r', x: 644, y: 196, layer: 'back' },
    { kind: 'smoke', x: 108, y: 64, layer: 'back' },
    { kind: 'post', x: 250, y: 196, layer: 'back' },
    { kind: 'post', x: 390, y: 196, layer: 'back' },
    { kind: 'worn', x: 320, y: 188, layer: 'floor' },
    { kind: 'stores', x: 92, y: 214, layer: 'floor' },
    { kind: 'stores2', x: 552, y: 214, layer: 'floor' },
    { kind: 'azure', x: -6, y: 364, layer: 'fg' },
    { kind: 'sanguine', x: 646, y: 364, layer: 'fg' },
    { kind: 'grass_fg', x: 44, y: 362, layer: 'fg' },
    { kind: 'grass_fg2', x: 598, y: 362, layer: 'fg' },
  ];
  return { ground, wall, props };
}

export const zone1: ZoneArt = {
  id: 'zone1',
  name: 'A Dim Island',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    cottage_l: [cottage(false, false), cottage(false, true)],
    cottage_r: [cottage(true, false), cottage(true, true)],
    smoke: smoke(),
    post: [gatepost()],
    flame: flames(FIRE),
    worn: [worn()],
    stores: [stores()],
    stores2: [stores()],
    azure: standard(true),
    sanguine: standard(false),
    grass_fg: [longGrass(3)],
    grass_fg2: [longGrass(8)],
  }),
  kinds: {
    cottage_l: { anchor: [0, 1], mode: 'pulse' },
    cottage_r: { anchor: [1, 1], mode: 'pulse' },
    smoke: { anchor: [0.5, 1], mode: 'loop', ms: 220 },
    post: { anchor: [0.5, 1], mode: 'static', fire: { dy: -56 } },
    flame: { anchor: [0.5, 1], mode: 'loop', ms: 90 },
    worn: { anchor: [0.5, 0], mode: 'static' },
    stores: { anchor: [0.5, 1], mode: 'static' },
    stores2: { anchor: [0.5, 1], mode: 'static' },
    azure: { anchor: [0, 1], mode: 'loop', ms: 200 },
    sanguine: { anchor: [1, 1], mode: 'loop', ms: 200 },
    grass_fg: { anchor: [0.5, 1], mode: 'static' },
    grass_fg2: { anchor: [0.5, 1], mode: 'static' },
  },
  layout,
  horizon: EDGE_Y,
};
