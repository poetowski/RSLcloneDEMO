// Zone "Moonlit Basin": Zone 3, named and described by Jakub (2026-10-17,
// docs/DESIGN_DECISIONS.md 5.6): beyond the trailing roots of the Verdant
// Grove the soil pales into silver sand, a low-lying basin floor carpeted in
// glowing twilight-moss; pale, glass-like reeds sway softly without a breeze,
// catching the moonlight in pale blue and violet, as the ground swells toward
// the sharp silhouette of the eastern hills; small airborne dust-motes of
// bioluminescent flora drift across the sunken land, casting soft,
// pearlescent halos over quiet, crystal-clear tide-pools. "A new dynamic
// zone": the scene is alive throughout, and calm.
//
// As painted: night. The full moon stands in the upper left (the key light)
// in a pale halo and a faint ring, the sky deep indigo above and violet along
// the hills, stars and the milky band beyond, thin clouds drifting past. On
// the right the eastern hills rise in sharp crags, their faces toward the moon
// edged in silver. On the left the Verdant Grove ends in a dark wall of trees,
// its great roots trailing out across the sand. Between them the basin: silver
// sand banks, carpets of twilight-moss glowing teal and violet, a long pool
// holding the moon's reflection, reed beds along its shores. The arena is the
// basin floor: moss over silver sand rippled by the tides, three tide-pools
// with pebbles on their clear beds, glass reeds round them and in the near
// corners, lumen-bells (the glowing flora that sheds the motes) at the pools,
// one root of the grove arching out of the left edge. Animated: the reeds
// sway and glints run up them, the pools shimmer and now and then ripple, the
// moss and the lumen-bells breathe, halos glow over the pools, stars
// twinkle, clouds drift, the motes drift in their halos (ZoneDef ambient
// 'spores') and a shooting star crosses the sky now and then. Everything his
// description did not name is a first take (DESIGN_DECISIONS 5.6).
import { dith, ellipseFill, line, outline, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, hex, RGBA, rng, withAlpha } from '../raster.ts';
import { MAP_COLS, MAP_ROWS, Painter, PropPlacement, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));

// --- the night sky: deep indigo overhead, violet low over the hills
const SKY = H(['#06070f', '#080a15', '#0b0d1b', '#0e1122', '#111529', '#151930', '#1a1d38', '#1f2240', '#252747', '#2b2c4f', '#323256', '#3a385d', '#433f64', '#4c466a']);
/** the moonlight round the moon, paling to white */
const HALO = H(['#20264a', '#283058', '#303a66', '#3a4674', '#465484', '#546496', '#6676a8', '#7c8cba', '#96a4cc', '#b2bedc', '#d0d8ec', '#eaf0fa']);
const MOON = H(['#6e7a98', '#8692b0', '#9eaac4', '#b6c0d6', '#ccd4e4', '#e0e6f0', '#f0f4fa', '#ffffff']);
/** the milky band and its dust */
const MILK = H(['#1a1c38', '#212444', '#2a2a50', '#34315c', '#403a68', '#4e4676']);
const STAR = H(['#6a74a0', '#9aa6cc', '#c8d2ee', '#eef2ff', '#ffffff']);
const CLOUD = H(['#1e2240', '#282c4e', '#33385c', '#40466c', '#50587e', '#646e92', '#7c86a8']);
// --- the eastern hills: far ones hazy violet, near ones dark, their moonward faces edged in silver
const FARHILL = H(['#222340', '#292a48', '#313150', '#3a3958', '#444262', '#4f4c6c', '#5c5878']);
const MIST = H(['#3a3a5e', '#46466a', '#545478']);
const HILL = H(['#0e0f1c', '#131425', '#18192e', '#1e1f37', '#252640', '#2d2e4a', '#373855', '#434462', '#525472', '#646686', '#7a7c9c', '#9496b4']);
// --- the grove's last trees and its roots, dark in the moonlight
const GROVE = H(['#05090c', '#081016', '#0c161e', '#101d27', '#152530', '#1b2e3a', '#223745', '#2b4251']);
const ROOT = H(['#0c0a10', '#141119', '#1d1923', '#27222e', '#322c3a', '#3e3747', '#4b4455', '#5a5264', '#6c6476']);
// --- the basin: silver sand, twilight-moss and its glow, the water
const SAND = H(['#1c2030', '#242939', '#2c3243', '#353c4e', '#3f4659', '#4a5164', '#555d70', '#61697c', '#6e7689', '#7c8496', '#8b93a4', '#9ca3b3', '#aeb4c2', '#c2c7d3']);
const MOSS = H(['#101626', '#141d30', '#18253a', '#1c2e43', '#20374b', '#244052', '#294a5a', '#2f5462', '#365e6a', '#3e6972', '#48747b']);
/** the grove's dark soil, paling into the sand */
const SOIL = H(['#16141a', '#1e1b22', '#27232c', '#312c36', '#3c3641', '#48414d', '#554d5a']);
const GLOW = H(['#1f5560', '#2a6e76', '#378a8c', '#48a6a2', '#62c0b8', '#86d8cc', '#b2ece0', '#dcfaf2']);
const VIOLET = H(['#3a2c66', '#4c3a80', '#604a9a', '#7860b4', '#9480cc', '#b4a4e2', '#d6ccf4']);
const WATER = H(['#060c18', '#09121f', '#0c1827', '#101f30', '#14263a', '#192e44', '#1f374e', '#264058', '#2e4a63']);
const SHINE = H(['#3c5878', '#56789a', '#7698ba', '#9ab8d6', '#c4daee', '#eaf4ff']);
/** a tide-pool's bed seen through its clear water, deep blue to pale shallows */
const BED = H(['#0b1626', '#0f1e32', '#14283e', '#1a334a', '#213f57', '#294c64', '#325a71', '#3d687e', '#49778b', '#578698']);
/** the night sky held in the water */
const REFL = H(['#24264a', '#30325a', '#3e406c']);
const PEBBLE = H(['#1e2232', '#2a2f42', '#373d52', '#454c62', '#555d72', '#666e84']);
const SHELL = H(['#7c7488', '#9c94a8', '#c0b8c8', '#e2dce8']);
/** the glass reeds: pale blue, and violet */
const REED = H(['#2c3a64', '#3e5084', '#5a6ea4', '#7c92c4', '#a4b8e0', '#cad8f4', '#eef4ff']);
const REEDV = H(['#3a2e64', '#504284', '#6a5aa4', '#8a7cc4', '#ac9ee0', '#cec4f4', '#f0ecff']);
/** the pearlescent halos: rose, ice, lilac, mint */
const PEARL = H(['#ffe2f0', '#e2eeff', '#eee2ff', '#dcfff4']);

/** the moon in the upper left: the key light */
const MOON_X = 112, MOON_Y = 42, MOON_R = 15;
/** where the basin's far floor meets the sky and the hills */
const HZ = 124;

// ---------------------------------------------------------------------------
// Noise
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

/** Smooth 2D value noise in [0, 1] at a scale of `cell` px. */
function vnoise(x: number, y: number, cell: number, seed: number): number {
  const fx = x / cell, fy = y / cell;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Smooth 1D value noise in [0, 1] at a scale of `s` px. */
function n1(x: number, s: number, seed: number): number {
  const f = x / s, i = Math.floor(f), t = f - i, u = t * t * (3 - 2 * t);
  return hash2(i, 0, seed) * (1 - u) + hash2(i + 1, 0, seed) * u;
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const TAU = Math.PI * 2;

/** Where the basin floor begins at x: at the horizon on the left, swelling up toward the foot of the hills on the right. */
const ground = (x: number) => HZ - smooth(330, 640, x) * 16 + (n1(x, 23, 61) - 0.5) * 2;

/**
 * The basin floor in perspective, shared by the far basin of the backdrop and
 * the arena's moss so they run on into each other: a screen row y maps to a
 * scale (px per world unit) that grows from the vanishing line toward the
 * camera; `world` gives a pixel's place on the floor (u across, from the
 * screen's middle; v in depth), where a shape keeps its size.
 */
const VY = 112, PK = 0.00524;
const pscale = (y: number) => Math.max(0.05, (y - VY) * PK);
function world(x: number, y: number): [number, number] {
  return [(x - 320) / pscale(y), Math.log(Math.max(0.5, y - VY)) / PK];
}
/** How much of the floor is moss at a world point (above 0: moss), before any clearing round the pools. */
const mossField = (u: number, v: number) => vnoise(u, v * 2.2, 70, 201) * 0.65 + vnoise(u, v * 2.2, 26, 202) * 0.35 - 0.37;

// ---------------------------------------------------------------------------
// Tiles: silver sand rippled by the tides, moss creeping over it
// ---------------------------------------------------------------------------

/**
 * Silver sand under the moon: one base field shared by every variant (so any
 * two tiles join), low ripples left by the tides running across it (their
 * crests lit on the moon's side), each variant's own moss, pebbles, shells
 * and glowing specks faded in away from the border.
 */
function sand(o: { ripples?: number; moss?: number; pebbles?: number; shells?: number; specks?: number; shade?: number } = {}): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const inner = clamp((Math.min(x, y, TILE - 1 - x, TILE - 1 - y) - 1) / 5, 0, 1);
        let v = 5.5 + (tnoise(x, y, 16, 3) - 0.5) * 0.9 + (tnoise(x, y, 8, 4) - 0.5) * 0.5;
        // tidal ripples: crests every 8 px, wavering, lit on their upper-left slope (period 32 px: seamless)
        const w = y + Math.sin(((x + tnoise(x, y, 16, 5) * 10) / TILE) * TAU) * 1.6;
        const ph = (((w % 8) + 8) % 8) / 8;
        v += (o.ripples ?? 1) * (ph < 0.3 ? 0.7 : ph < 0.45 ? -0.2 : ph < 0.6 ? -0.8 : 0);
        v += (tnoise(x, y, 16, seed) - 0.5) * 0.7 * inner;
        if (hash2(x, y, 7) > 0.93) v += 0.8;
        if (o.shade) v -= o.shade * Math.max(0, 1 - y / 14);
        const moss = (o.moss ?? 0) * inner * Math.max(0, tnoise(x, y, 16, seed + 7) - 0.35) * 2.6;
        if (moss > 0 && dith(x, y, Math.min(1, moss))) {
          const lit = hash2(x, y, seed + 9) > 0.965 && (o.specks ?? 1) > 0;
          b.set(x, y, lit ? GLOW[3 + (hash2(x, y, seed + 10) > 0.5 ? 1 : 0)] : rampDither(MOSS, 5.8 + (tnoise(x, y, 8, seed + 8) - 0.5) * 2, x, y));
          continue;
        }
        b.set(x, y, rampDither(SAND, v, x, y));
      }
    }
    const r = rng(seed);
    for (let i = 0; i < (o.pebbles ?? 0); i++) pebble(b, 5 + Math.floor(r() * 22), 6 + Math.floor(r() * 20), r);
    for (let i = 0; i < (o.shells ?? 0); i++) shell(b, 5 + Math.floor(r() * 21), 6 + Math.floor(r() * 20), r);
  };
}

/** A pebble, lit on its upper left, a dark tuck under it. */
function pebble(b: Bitmap, x: number, y: number, r: () => number) {
  const w = 2 + Math.floor(r() * 2);
  for (let k = 0; k < w; k++) {
    b.set(x + k, y, PEBBLE[k === 0 ? 5 : 4]);
    b.set(x + k, y + 1, PEBBLE[k === 0 ? 3 : 2]);
  }
  for (let k = 0; k <= w; k++) b.set(x + k, y + 2, SAND[2]);
}

/** A small pale shell left by the tide: a fan of ribs. */
function shell(b: Bitmap, x: number, y: number, r: () => number) {
  const flip = r() < 0.5;
  const px = (dx: number, dy: number, c: RGBA) => b.set(flip ? x + 2 - dx : x + dx, y + dy, c);
  px(1, 0, SHELL[3]);
  px(0, 1, SHELL[2]);
  px(1, 1, SHELL[3]);
  px(2, 1, SHELL[1]);
  px(1, 2, SHELL[0]);
  b.set(x, y + 3, SAND[2]);
  b.set(x + 1, y + 3, SAND[2]);
}

const P: Record<string, Painter> = {
  sand_a: sand(),
  sand_b: sand({ pebbles: 1 }),
  sand_c: sand({ ripples: 1.3 }),
  sand_d: sand({ ripples: 0.7, shells: 1 }),
  sand_e: sand({ moss: 0.5 }),
  sand_f: sand({ moss: 0.9, pebbles: 1 }),
  sand_g: sand({ ripples: 1.2, moss: 0.3, shells: 1 }),
  sand_h: sand({ moss: 1.2 }),
  // the floor's top row meets the far basin of the backdrop a little darker
  rim_a: sand({ shade: 0.8, moss: 0.6 }),
  rim_b: sand({ shade: 0.8, ripples: 0.8 }),
};

// ---------------------------------------------------------------------------
// Backdrop: the night sky and the moon, the eastern hills, the grove's edge,
// the far basin with its moss, sand banks, reed beds and the long pool
// ---------------------------------------------------------------------------

function backdrop(): Bitmap {
  const b = new Bitmap(640, 200);
  sky(b);
  milkyBand(b);
  stars(b);
  moon(b);
  farBasin(b);
  ranges(b);
  hillMist(b);
  farPools(b);
  longPool(b);
  grove(b);
  farRoots(b);
  farReeds(b);
  farGlow(b);
  return b;
}

/**
 * Deep indigo overhead, violet low over the hills. Round the moon its light:
 * a wide, faint brightening of the sky and a soft core of pale blue that
 * thins out in dither, and a faint ring of ice further out.
 */
function sky(b: Bitmap) {
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 640; x++) {
      const t = clamp(y / (HZ + 4), 0, 1);
      let v = 1.2 + Math.pow(t, 1.25) * 11.4 - clamp((x - 380) / 260, 0, 1) * 0.9 * (1 - t);
      const d = Math.hypot(x - MOON_X, (y - MOON_Y) * 1.08);
      const wide = Math.max(0, 1 - d / 130);
      v += wide * wide * 3.4;
      const core = Math.max(0, 1 - d / 52);
      const hk = Math.pow(core, 1.5);
      if (hk > 0 && dith(x, y, Math.min(1, hk * 2.4))) {
        b.set(x, y, rampDither(HALO, Math.min(HALO.length - 1, hk * 10.5), x, y));
        continue;
      }
      b.set(x, y, rampDither(SKY, Math.min(SKY.length - 1, v), x, y));
    }
  }
  // the ring of ice round the moon, faint, fading toward the land
  for (let y = 0; y < HZ; y++) {
    for (let x = 0; x < 260; x++) {
      const d = Math.hypot(x - MOON_X, y - MOON_Y);
      const k = (1 - Math.abs(d - 70) / 2.2) * clamp((HZ - 20 - y) / 50, 0, 1);
      if (k > 0 && dith(x, y, k * 0.4)) b.set(x, y, HALO[3]);
    }
  }
}

/** A faint band of star dust from the high right down behind the hills, a dark lane along it. */
function milkyBand(b: Bitmap) {
  for (let y = 0; y < HZ; y++) {
    for (let x = 200; x < 640; x++) {
      const along = (640 - x) * 0.95 + (y - 4) * 0.32;
      const across = (x - 640) * 0.32 + (y - 4) * 0.95 - 10 * Math.sin(along / 70);
      const width = 16 + n1(along, 40, 71) * 12;
      const k = 1 - Math.abs(across) / width;
      if (k <= 0) continue;
      const dust = vnoise(x, y, 8, 72) * 0.6 + vnoise(x, y, 3, 73) * 0.4;
      const lane = Math.abs(across + 3 - 4 * Math.sin(along / 23)) < 2.6 + vnoise(along, 0, 9, 74) * 2;
      const v = k * 2.6 + (dust - 0.5) * 2.4 - (lane ? 1.4 : 0) - y / 140 - (1 - clamp((x - 200) / 120, 0, 1)) * 1.5;
      if (v < 0.7) continue;
      if (dith(x, y, Math.min(1, (v - 0.7) * 0.8))) b.set(x, y, rampDither(MILK, v, x, y));
    }
  }
}

/** Stars: many faint ones, fewer bright ones, thinning in the moon's glow. */
function stars(b: Bitmap) {
  const r = rng(81);
  for (let i = 0; i < 560; i++) {
    const x = Math.floor(r() * 640), y = Math.floor(Math.pow(r(), 1.2) * 120);
    const dm = Math.hypot(x - MOON_X, y - MOON_Y);
    const bright = r();
    if (dm < 80 && r() < 0.9 - dm / 200) continue;
    b.set(x, y, bright > 0.97 ? STAR[4] : bright > 0.86 ? STAR[3] : bright > 0.55 ? STAR[2] : STAR[1]);
    if (bright > 0.988) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, STAR[1]);
  }
}

/** The full moon: a pale disc, its limb a little darker, soft grey seas over its western half (no face in them), a bright crater with rays below. */
function moon(b: Bitmap) {
  ellipseFill(b, MOON_X, MOON_Y, MOON_R + 2, MOON_R + 2, (x, y, d) => (d > 0.86 && dith(x, y, 0.6) ? HALO[10] : 0));
  ellipseFill(b, MOON_X, MOON_Y, MOON_R, MOON_R, (x, y, d) => {
    const lx = (x + 0.5 - MOON_X) / MOON_R, ly = (y + 0.5 - MOON_Y) / MOON_R;
    let v = 6.5 - d * d * 1.4;
    // the seas: one ragged stretch down the western half and a few small ones east of it, low in contrast
    const sea = vnoise(lx * 2.4 + 7, ly * 2.4 + 3, 1, 91) * 0.7 + vnoise(lx * 6 + 2, ly * 6 + 9, 1, 92) * 0.3 - lx * 0.32 + ly * 0.06;
    if (sea > 0.62) v -= 0.9 + Math.min(0.7, (sea - 0.62) * 4);
    const cr = Math.hypot(x + 0.5 - (MOON_X + 2), y + 0.5 - (MOON_Y + 10));
    if (cr < 1.2) v = 7;
    return rampDither(MOON, v, x, y);
  });
}

/**
 * The eastern hills: a far range low and hazy, and in front of it the near
 * crags, sharp, rising toward the right. Each crag is lit on the face that
 * turns to the moon, left of its ridge, and dark beyond it; a silver rim runs
 * along its lit edge against the sky; strata and gullies cut its faces.
 */
interface Crag {
  x: number;
  y: number;
  /** slopes of the left and right flanks (px down per px out) */
  l: number;
  r: number;
  seed: number;
}
const FAR_CRAGS: Crag[] = [
  { x: 330, y: 110, l: 0.6, r: 0.7, seed: 1 },
  { x: 384, y: 100, l: 0.7, r: 0.8, seed: 2 },
  { x: 436, y: 94, l: 0.8, r: 0.6, seed: 3 },
  { x: 488, y: 90, l: 0.7, r: 0.9, seed: 4 },
  { x: 540, y: 82, l: 0.8, r: 0.7, seed: 5 },
  { x: 596, y: 80, l: 0.7, r: 0.8, seed: 6 },
  { x: 646, y: 86, l: 0.8, r: 0.7, seed: 7 },
];
const NEAR_CRAGS: Crag[] = [
  { x: 398, y: 102, l: 1.1, r: 1.5, seed: 11 },
  { x: 446, y: 88, l: 1.2, r: 1.7, seed: 12 },
  { x: 500, y: 76, l: 1.3, r: 1.5, seed: 13 },
  { x: 618, y: 62, l: 1.4, r: 1.6, seed: 16 },
  { x: 538, y: 84, l: 1.2, r: 1.8, seed: 14 },
  { x: 578, y: 56, l: 1.5, r: 1.9, seed: 15 },
];
/** A crag's top edge at x: two flanks from its peak, jagged in short straight runs. */
function cragTop(c: Crag, x: number): number {
  const dx = x - c.x;
  const out = Math.abs(dx);
  const jag = (hash2(Math.floor(x / 4), c.seed, 121) - 0.5) * 2.4 * Math.min(1, out / 10) + (hash2(Math.floor(x / 9), c.seed, 122) - 0.5) * 3 * Math.min(1, out / 20);
  return c.y + out * (dx < 0 ? c.l : c.r) + jag;
}

function crag(b: Bitmap, c: Crag, far: boolean) {
  const ramp = far ? FARHILL : HILL;
  const x0 = Math.max(0, Math.floor(c.x - (HZ - c.y) / c.l - 4)), x1 = Math.min(639, Math.ceil(c.x + (HZ - c.y) / c.r + 4));
  for (let x = x0; x <= x1; x++) {
    const top = cragTop(c, x);
    const foot = ground(x) + 2;
    if (top >= foot) continue;
    for (let y = Math.ceil(top); y < foot; y++) {
      if (y > foot - 3 && !dith(x, y, (foot - y) / 3)) continue;
      const depth = y - top;
      // the main ridge falls from the peak a little to the right; spurs branch off it
      const ridge = c.x + (y - c.y) * 0.28 + (n1(y, 6, 123 + c.seed) - 0.5) * 3;
      let lit = x < ridge;
      for (let k = 0; k < 3; k++) {
        const sy = c.y + 8 + k * 11 + hash2(k, c.seed, 124) * 6;
        if (y < sy) continue;
        const sx = c.x - (sy - c.y) * c.l * (0.3 + hash2(k, c.seed, 125) * 0.4) + (y - sy) * 0.5;
        if (x > sx && x < sx + 3 + (y - sy) * 0.15) lit = false;
      }
      let v: number;
      if (far) v = (lit ? 4.4 : 2.6) - depth * 0.05;
      else v = (lit ? 6.4 - Math.min(2.6, depth * 0.07) : 2.2 - Math.min(1, depth * 0.02)) + (lit && x > ridge - 2 ? 0.9 : 0);
      // strata running across the faces
      if (Math.floor((y + x * (lit ? -0.25 : 0.3)) * 0.42 + n1(x, 9, 126 + c.seed) * 2) % 4 === 0) v -= far ? 0.4 : 0.9;
      // the rim against the sky: silver on the moon's side, a dull edge beyond the ridge
      if (depth < 1) v = lit ? (far ? 6 : 10.4) : far ? 3.6 : 5;
      else if (depth < 2 && lit) v = far ? 5.2 : 8.6;
      v += (vnoise(x, y, 3, 127) - 0.5) * 0.7;
      b.set(x, y, rampDither(ramp, clamp(v, 0, ramp.length - 1), x, y));
    }
  }
}

function ranges(b: Bitmap) {
  for (const c of FAR_CRAGS) crag(b, c, true);
  for (const c of NEAR_CRAGS) crag(b, c, false);
}

/** A thin mist lying along the hills' foot and the far basin, pale violet, thinning upward in dither. */
function hillMist(b: Bitmap) {
  for (let x = 0; x < 640; x++) {
    const g = ground(x);
    for (let y = Math.floor(g - 16); y < g + 6; y++) {
      const up = (g + 6 - y) / 22;
      const k = Math.pow(1 - up, 1.6) * 0.32 * (0.5 + vnoise(x, y, 18, 128) * 0.9) * clamp((x - 150) / 140, 0.25, 1);
      if (k > 0 && dith(x, y, k)) b.set(x, y, MIST[y > g ? 2 : 1]);
    }
  }
}

/**
 * The far basin, from the ground line down: carpets of twilight-moss with
 * specks of glow and banks of silver sand between them, in shapes that widen
 * and flatten toward the horizon; on the left, under the grove, the soil is
 * still dark and pales into the sand.
 */
/** The crest of the ground's swell toward the eastern hills: a long, gentle rise across the right of the basin. */
const swellCrest = (x: number) => 156 - smooth(300, 630, x) * 32 + (n1(x, 34, 137) - 0.5) * 5;
/** How the swell lights a point: its crest catches the moon, the ground just behind it falls away into shadow. */
function swellShade(x: number, y: number): number {
  if (x < 300) return 0;
  const k = smooth(300, 380, x), d = y - swellCrest(x);
  if (d >= 0 && d < 2.2) return (d < 1.1 ? 2.4 : 1.4) * k;
  if (d < 0 && d > -9) return -1.8 * k * (1 + d / 9);
  return 0;
}

function farBasin(b: Bitmap) {
  for (let x = 0; x < 640; x++) {
    const g = ground(x);
    for (let y = Math.floor(g - 1); y < 200; y++) {
      const [u, v] = world(x, y);
      const sw = swellShade(x, y);
      const near = clamp((y - g) / (200 - g), 0, 1);
      const soil = smooth(230, 30, x) * smooth(HZ + 34, HZ + 4, y);
      const m = mossField(u, v) - soil * 0.25;
      if (m > 0 || (m > -0.04 && dith(x, y, (m + 0.04) / 0.04))) {
        const c = cells(u, v * 2.2, 3, 1, 207);
        if (c.id > 0.993 - near * 0.018 && soil < 0.3 && hash2(x, y, 139) < 0.35 + near * 0.65) {
          b.set(x, y, c.id > 0.993 ? VIOLET[4] : GLOW[3 + (c.id > 0.985 ? 1 : 0)]);
          continue;
        }
        // moss: clumps lit on top, brighter toward the camera
        const val = 2.8 + near * 2.6 + (c.id - 0.5) * 1.4 - c.oy * 1.6 + Math.min(0.8, m * 4) + sw;
        b.set(x, y, soil > 0.4 && dith(x, y, soil) ? rampDither(SOIL, val - 1, x, y) : rampDither(MOSS, clamp(val, 0, MOSS.length - 1), x, y));
      } else {
        // silver sand, the banks' crests catching the moon
        const crest = vnoise(u, v * 2.2, 18, 136);
        const val = 4.4 + near * 1.6 + (crest > 0.62 ? 1.2 : crest < 0.35 ? -0.5 : 0) + Math.min(0, m * 3) + (vnoise(u, v, 6, 133) - 0.5) * 0.8 + sw * 1.4;
        b.set(x, y, soil > 0.3 && dith(x, y, soil) ? rampDither(SOIL, val - 2, x, y) : rampDither(SAND, val, x, y));
      }
    }
  }
}

/**
 * The long pool in the middle distance, under the moon: still water holding
 * the sky, violet along the far shore and darker toward the near one, the
 * moonlight on it round the moon's path (its shimmer is the far prop
 * `moonpath`), a pale rim of sand along its shores.
 */
const POOL = { x0: 46, x1: 292, y: 151, ry: 7.5 };
const inPool = (x: number, y: number) => {
  const cx = (POOL.x0 + POOL.x1) / 2, rx = (POOL.x1 - POOL.x0) / 2;
  const u = clamp((x - cx) / rx, -1, 1);
  const span = Math.sqrt(Math.max(0, 1 - u * u));
  const top = POOL.y - POOL.ry * Math.pow(span, 0.6) * 0.85 + (n1(x, 14, 141) - 0.5) * 2.4;
  const bot = POOL.y + POOL.ry * Math.pow(span, 0.6) + (n1(x, 9, 142) - 0.5) * 3;
  return { top, bot, inside: Math.abs(x - cx) < rx && y >= top && y <= bot };
};

/** Slivers of still water far off in the basin, holding the sky, a glint on each. */
const FAR_POOLS: [number, number, number][] = [[356, 137, 13], [424, 130, 15], [478, 144, 9], [552, 128, 12], [606, 136, 8], [396, 166, 12], [530, 163, 14], [456, 180, 9]];
function farPools(b: Bitmap) {
  for (const [cx, cy, rx] of FAR_POOLS) {
    const ry = 1.2 + (cy - HZ) / 28;
    ellipseFill(b, cx, cy, rx, ry, (x, y, d) => {
      // the sky's pale violet low over the hills, darker toward the near shore, a pale lip of sand
      if (d > 0.84) return hash2(x, y, 138) > 0.4 ? SAND[9] : 0;
      return rampDither(SKY, 12.6 - (y - cy + ry) / (ry * 2) * 3.4, x, y);
    });
    for (let x = Math.round(cx - rx * 0.6); x <= cx + rx * 0.3; x++) if (hash2(x, cy, 140) > 0.35) b.set(x, Math.round(cy - ry * 0.4), SHINE[3]);
    b.set(Math.round(cx - rx * 0.25), Math.round(cy - ry * 0.4), SHINE[5]);
  }
}

/** Whether the grove's crowns stand above x (their reflection lies on the long pool). */
const groveAbove = (x: number) => GROVE_TREES.some((t) => Math.abs(x - t.x) < t.cw * 0.9);

function longPool(b: Bitmap) {
  for (let x = POOL.x0 - 3; x <= POOL.x1 + 3; x++) {
    const { top, bot } = inPool(x, 0);
    const w = bot - top;
    if (w < 0.8) continue;
    for (let y = Math.floor(top) - 1; y <= Math.ceil(bot) + 1; y++) {
      if (y < top) {
        b.set(x, y, rampDither(SAND, 8.8, x, y));
        continue;
      }
      if (y > bot) {
        b.set(x, y, rampDither(SAND, y > bot + 0.5 ? 9.6 : 5, x, y));
        continue;
      }
      const k = (y - top) / Math.max(1, w);
      let v = 6.6 - k * 4.4 + (vnoise(x, y, 6, 143) - 0.5) * 0.6;
      const dm = Math.abs(x - MOON_X);
      if (dm < 34) v += Math.pow(1 - dm / 34, 1.5) * 2.4;
      // the grove's crowns mirrored along the far shore, broken by the water
      else if (k < 0.5 && groveAbove(x) && hash2(x, y, 144) > 0.15) v -= 3.2 * (1 - k / 0.5);
      b.set(x, y, rampDither(WATER, clamp(v, 0, WATER.length - 1), x, y));
    }
  }
}

/**
 * The Verdant Grove's last trees on the left, between us and the moon: great
 * jungle trees in silhouette, umbrella crowns of leaf clumps on tall trunks
 * with buttressed feet, smaller crowns receding toward the middle; the edge
 * of every crown, trunk and liana that turns to the moon catches a thin rim
 * of its light, and a few lianas hang glowing at their tips.
 */
interface GroveTree {
  x: number;
  /** where the trunk meets the ground */
  base: number;
  /** trunk height up to the crown */
  h: number;
  /** crown half-width and height */
  cw: number;
  ch: number;
  trunk: number;
  seed: number;
}
const GROVE_TREES: GroveTree[] = [
  // far and small first, near and great last
  { x: 236, base: 125, h: 6, cw: 9, ch: 6, trunk: 1, seed: 1 },
  { x: 214, base: 124, h: 8, cw: 12, ch: 7, trunk: 1, seed: 2 },
  { x: 190, base: 124, h: 10, cw: 15, ch: 8, trunk: 1.5, seed: 3 },
  { x: 166, base: 124, h: 14, cw: 18, ch: 10, trunk: 1.5, seed: 4 },
  { x: 136, base: 124, h: 18, cw: 22, ch: 11, trunk: 2, seed: 5 },
  { x: 100, base: 125, h: 30, cw: 30, ch: 14, trunk: 2.5, seed: 6 },
  { x: 62, base: 125, h: 26, cw: 30, ch: 15, trunk: 2.5, seed: 7 },
  { x: 18, base: 126, h: 40, cw: 36, ch: 18, trunk: 3.5, seed: 8 },
];

function grove(b: Bitmap) {
  const W = 280, HH = 200;
  // the silhouette first, as a mask, so the rim can be found along its edge
  const mask = new Uint8Array(W * HH);
  const put = (x: number, y: number) => {
    const X = Math.round(x), Y = Math.round(y);
    if (X >= 0 && X < W && Y >= 0 && Y < HH) mask[Y * W + X] = 1;
  };
  const lianas: [number, number, number][] = [];
  for (const t of GROVE_TREES) {
    const top = t.base - t.h;
    // the trunk, tapering up, leaning a little, flaring into buttresses at its foot
    for (let y = top; y <= t.base; y++) {
      const u = (y - top) / t.h;
      const lean = Math.sin(u * 2.2 + t.seed) * t.trunk * 0.7;
      const flare = Math.pow(clamp((y - (t.base - 7)) / 7, 0, 1), 2) * t.trunk * 2.6;
      const half = t.trunk * (0.65 + u * 0.45) + flare + (hash2(y, t.seed, 141) - 0.5) * 0.6;
      for (let x = Math.floor(t.x + lean - half); x <= Math.ceil(t.x + lean + half); x++) put(x, y);
    }
    // limbs spreading up into the crown
    for (const side of [-1, 1]) {
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        const x = t.x + side * u * t.cw * 0.55, y = top + 2 - u * t.ch * 0.5;
        for (let a = -1; a <= 1; a++) put(x, y + a * (1 - u));
      }
    }
    // the crown: an umbrella of leaf clumps, heaped toward the middle, ragged at its rim
    const r = rng(t.seed * 31 + 142);
    const clumps = 14 + Math.floor(t.cw / 2);
    for (let k = 0; k < clumps; k++) {
      // two tiers: a wide lower skirt and a heaped dome over it
      const upper = k % 3 === 0;
      const u = ((k / (clumps - 1)) * 2 - 1) * (upper ? 0.7 : 1) + (r() - 0.5) * 0.15;
      const cx = t.x + u * t.cw, cy = top - t.ch * (upper ? 0.55 : 0.25) - (1 - u * u) * t.ch * (upper ? 0.5 : 0.35) + (r() - 0.5) * t.ch * 0.2;
      const rx = t.ch * (0.5 + r() * 0.25) * (1 - Math.abs(u) * 0.3), ry = rx * 0.72;
      for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) {
        for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
          const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry) + (vnoise(x, y, 1.8, 143 + t.seed) - 0.5) * 0.5;
          if (d < 1) put(x, y);
        }
      }
      if (r() < 0.35 && Math.abs(u) > 0.25) lianas.push([cx + (r() - 0.5) * rx, cy + ry * 0.6, 6 + r() * (t.base - cy) * 0.6]);
    }
  }
  // lianas hanging from the crowns
  for (const [lx, ly, len] of lianas) for (let k = 0; k < len; k++) put(lx + Math.sin(k * 0.3 + lx) * 0.8, ly + k);
  // the undergrowth along the wood's foot: bushes heaped between the trunks
  for (let x = 0; x < 250; x++) {
    const h = 3 + vnoise(x, 0, 7, 144) * 9 * clamp((250 - x) / 140, 0.25, 1) + (vnoise(x, 0, 2.5, 146) - 0.5) * 2;
    for (let y = Math.round(HZ + 2 - h); y <= HZ + 2; y++) put(x, y);
  }
  const at = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < HH && mask[y * W + x] === 1;
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < W; x++) {
      if (!at(x, y)) continue;
      // the rim: an edge whose open side faces the moon
      const tx = MOON_X - x, ty = MOON_Y - y, tl = Math.hypot(tx, ty) || 1;
      const ox = tx / tl, oy = ty / tl;
      const rim1 = !at(Math.round(x + ox * 1.2), Math.round(y + oy * 1.2));
      const rim2 = !rim1 && !at(Math.round(x + ox * 2.4), Math.round(y + oy * 2.4));
      const close = Math.max(0, 1 - Math.hypot(x - MOON_X, y - MOON_Y) / 120);
      if (rim1) {
        b.set(x, y, close > 0.35 ? HALO[4 + (close > 0.6 ? 1 : 0)] : rampDither(GROVE, 5.6 + close * 2, x, y));
        continue;
      }
      if (rim2 && close > 0.25) {
        b.set(x, y, rampDither(GROVE, 4.6 + close * 2, x, y));
        continue;
      }
      // inside: near black, leaf texture faintly showing
      const leaf = vnoise(x, y, 2.2, 145);
      const v = 0.8 + (leaf > 0.62 ? 1.1 : 0) + clamp((y - 60) / 80, 0, 1) * 0.6;
      b.set(x, y, rampDither(GROVE, v, x, y));
    }
  }
  // glowing moss at some liana tips
  lianas.forEach(([lx, ly, len], i) => {
    if (i % 2) return;
    const x = Math.round(lx + Math.sin((len - 1) * 0.3 + lx) * 0.8), y = Math.round(ly + len);
    b.set(x, y, GLOW[5]);
    b.set(x, y - 1, GLOW[3]);
  });
}

/**
 * The grove's great roots trailing out from the wood's foot over the sand,
 * diving under it and arching out again, lit along their backs, moss on them.
 */
const FAR_ROOTS: [number, number][][] = [
  [[104, 126], [132, 131], [166, 134], [202, 136], [242, 138], [282, 137]],
  [[22, 127], [30, 141], [38, 157], [54, 171], [80, 183], [112, 193], [146, 202]],
  [[66, 127], [82, 133], [104, 137], [130, 140]],
  [[12, 128], [8, 146], [16, 168], [8, 188], [14, 202]],
];
function farRoots(b: Bitmap) {
  FAR_ROOTS.forEach((pts, ri) => {
    const path: [number, number][] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 3);
      for (let k = 0; k < n; k++) path.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
    }
    path.forEach(([x, y], k) => {
      const s = k / path.length;
      // it dives under the sand now and then and arches out again
      if (s > 0.2 && Math.sin(s * 11 + ri * 2.3) > 0.86) return;
      if (inPool(Math.round(x), Math.round(y)).inside) return;
      const nearK = clamp((y - HZ) / 76, 0, 1);
      // gnarled: knots swell it here and there
      const knot = Math.max(0, Math.sin(s * 23 + ri) - 0.75) * 3;
      const th = (1.2 + nearK * 2.8) * (1 - s * 0.6) + knot * (0.6 + nearK);
      for (let a = -th; a <= th; a += 0.4) {
        const px = Math.round(x), py = Math.round(y + a);
        const u = (a + th) / (2 * th + 0.01);
        const v = 7 - u * 5.8 - (Math.sin(s * 60 + a) > 0.8 ? 1 : 0) + (vnoise(px, py, 2.5, 151 + ri) - 0.5) * 0.8;
        b.set(px, py, rampDither(ROOT, clamp(v, 0, ROOT.length - 1), px, py));
      }
      // moss along its back, now and then a glowing tuft
      const px = Math.round(x), top = Math.round(y - th - 0.5);
      if (hash2(px, ri, 152) > 0.7) b.set(px, top, hash2(px, ri, 153) > 0.8 ? GLOW[3 + (nearK > 0.5 ? 1 : 0)] : MOSS[8]);
    });
  });
}

/** Reed beds along the long pool's shores and among the far moss: fine pale strokes, a glint at their tips. */
function farReeds(b: Bitmap) {
  const r = rng(161);
  for (let i = 0; i < 150; i++) {
    let x: number, y: number;
    if (i < 95) {
      x = POOL.x0 + 6 + r() * (POOL.x1 - POOL.x0 - 12);
      const p = inPool(Math.round(x), 0);
      if (Math.abs(x - MOON_X) < 14) continue;
      y = r() < 0.55 ? p.top - 1 + r() * 2 : p.bot + r() * 2;
    } else {
      // a few beds out in the moss
      const bed = [[352, 150], [430, 168], [512, 146], [590, 176], [470, 186]][i % 5];
      x = bed[0] + (r() - 0.5) * 34;
      y = bed[1] + (r() - 0.5) * 6;
    }
    const near = clamp((y - HZ) / 70, 0, 1);
    const h = Math.round(2 + r() * 3 + near * 7);
    const lean = (r() - 0.5) * 0.5;
    const ramp = r() < 0.4 ? REEDV : REED;
    for (let k = 0; k < h; k++) {
      const px = Math.round(x + lean * k), py = Math.round(y - k);
      b.set(px, py, ramp[k === h - 1 ? 5 : k > h * 0.6 ? 3 : 2]);
    }
  }
}

/** Soft halos of the motes' light over the far moss and the pool: pearl light dithered thin over what is there. */
function farGlow(b: Bitmap) {
  const spots: [number, number, number, number, RGBA][] = [
    [206, 150, 30, 6, PEARL[2]],
    [380, 150, 34, 7, PEARL[3]],
    [500, 170, 30, 7, PEARL[0]],
    [600, 140, 26, 6, PEARL[1]],
  ];
  for (const [cx, cy, rx, ry, c] of spots) ellipseFill(b, cx, cy, rx, ry, (x, y, d) => (dith(x, y, (1 - d) * 0.3) ? withAlpha(c, 56) : 0));
}

// ---------------------------------------------------------------------------
// The far layer: the moon's path on the long pool, thin clouds, twinkling stars
// ---------------------------------------------------------------------------

/** The top of the land at x: the grove's crowns, the crags, else the ground line. */
function skyline(x: number): number {
  let y = ground(x);
  for (const c of [...FAR_CRAGS, ...NEAR_CRAGS]) y = Math.min(y, cragTop(c, x));
  for (const t of GROVE_TREES) if (Math.abs(x - t.x) < t.cw + 4) y = Math.min(y, t.base - t.h - t.ch * 1.2);
  return y;
}

/**
 * The moon's reflection on the long pool: broken bright lines under the moon,
 * swaying and flickering; each line drifts on its own phase, one whole cycle
 * per loop.
 */
function moonPath(n = 12): Bitmap[] {
  const W = 40, top = Math.floor(inPool(MOON_X, 0).top), HH = Math.ceil(inPool(MOON_X, 0).bot) - top + 1;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    const ph = (i / n) * TAU;
    for (let row = 0; row < HH; row++) {
      const y = top + row;
      const k = row / HH;
      // each row is one broken line, shortest at the far shore
      const len = 3 + k * 9 + Math.sin(ph + row * 1.7) * 2;
      const cx = W / 2 + Math.sin(ph * 2 + row * 0.9) * (1 + k * 2);
      if (row % 2 === 1 && Math.sin(ph + row * 2.3) < 0.3) continue;
      for (let x = Math.round(cx - len / 2); x <= Math.round(cx + len / 2); x++) {
        const wx = x + MOON_X - W / 2;
        if (!inPool(wx, y).inside) continue;
        const gap = Math.sin(x * 1.3 + ph * 3 + row) > 0.65;
        if (gap) continue;
        const c = Math.abs(x - cx) < len * 0.25 ? SHINE[5] : SHINE[3 + (row % 2)];
        b.set(x, row, c);
      }
    }
    out.push(b);
  }
  return out;
}

/** A thin cloud, long and flat, lit silver along its top by the moon. */
function thinCloud(w: number, h: number, seed: number): Bitmap {
  const b = new Bitmap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x - w / 2) / (w / 2), v = (y - h * 0.55) / (h * 0.5);
      const shape = 1 - (u * u + v * v * 1.4) - (vnoise(x, y, 6, seed) - 0.5) * 0.9 - (vnoise(x, y, 2.5, seed + 1) - 0.5) * 0.3;
      if (shape <= 0 || !dith(x, y, Math.min(1, shape * 1.6))) continue;
      const lit = clamp(1 - y / h, 0, 1);
      b.set(x, y, withAlpha(rampDither(CLOUD, 1.6 + lit * 4 + shape * 1.2, x, y), 210));
    }
  }
  return b;
}

/** Star glints that twinkle (pulse): frame 0 empty, frame 1 the glints, crosses of light on the bright ones. */
function twinkles(seed: number, count: number): Bitmap[] {
  const W = 640, HH = 112;
  const b = new Bitmap(W, HH);
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = 6 + Math.floor(r() * (W - 12)), y = 4 + Math.floor(Math.pow(r(), 1.2) * (HH - 10));
    if (Math.hypot(x - MOON_X, y - MOON_Y) < 64) continue;
    if (y > skyline(x) - 3) continue;
    const big = r() < 0.4;
    b.set(x, y, STAR[4]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, STAR[big ? 3 : 1]);
    if (big) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) b.set(x + dx, y + dy, STAR[1]);
  }
  return [new Bitmap(1, 1), b];
}

// ---------------------------------------------------------------------------
// The glass reeds: stems that sway and glint
// ---------------------------------------------------------------------------

interface Stem {
  x: number;
  h: number;
  lean: number;
  bend: number;
  amp: number;
  ph: number;
  violet: boolean;
  /** a glass bead at its tip */
  bead: boolean;
  /** thickness: 1 or 2 px */
  thick: number;
  /** which way the glint runs and its phase */
  gph: number;
}

function stems(seed: number, count: number, w: number, hMin: number, hMax: number, o: { violet?: number; spread?: number } = {}): Stem[] {
  const r = rng(seed);
  return Array.from({ length: count }, () => {
    const x = w / 2 + (r() - 0.5) * w * (o.spread ?? 0.7);
    const h = hMin + r() * (hMax - hMin);
    return {
      x, h,
      lean: (x - w / 2) / w * 0.7 + (r() - 0.5) * 0.25,
      bend: (r() - 0.4) * 0.5,
      amp: 0.035 + r() * 0.035,
      ph: r() * TAU,
      violet: r() < (o.violet ?? 0.4),
      bead: r() < 0.35,
      thick: h > hMin + (hMax - hMin) * 0.55 && r() < 0.6 ? 2 : 1,
      gph: r(),
    };
  });
}

/**
 * A clump of glass reeds: each stem a thin pale shaft lit on its moonward
 * side, translucent, jointed like glass rods, a bead at some tips; frames sway
 * every stem about its root on its own phase, and a glint runs up each stem
 * once a loop, so the loop closes without a jump.
 */
function reeds(w: number, hh: number, list: Stem[], n = 16, o: { base?: boolean } = {}): Bitmap[] {
  const out: Bitmap[] = [];
  const sorted = [...list].sort((a, c) => c.h - a.h);
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    const t = i / n;
    if (o.base) {
      // a dark tuft where the stems meet the ground
      ellipseFill(b, w / 2, hh - 2, w * 0.36, 3, (x, y, d) => (dith(x, y, (1 - d) * 1.4) ? MOSS[3 + (hash2(x, y, 171) > 0.5 ? 1 : 0)] : 0));
    }
    for (const s of sorted) {
      const ramp = s.violet ? REEDV : REED;
      const sway = Math.sin(t * TAU + s.ph) * s.amp;
      const glintAt = (t + s.gph) % 1;
      let px = -1, py = -1;
      const steps = Math.ceil(s.h * 1.2);
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        // the stem bends more toward its tip; sway grows with height
        const ang = s.lean + s.bend * u + sway * (0.4 + u * 1.2);
        const x = s.x + Math.sin(ang) * s.h * u, y = hh - 1 - Math.cos(ang) * s.h * u;
        const X = Math.round(x), Y = Math.round(y);
        if (X === px && Y === py) continue;
        px = X;
        py = Y;
        // the glass: a bright moonward edge, a translucent body, joints every few px
        const joint = Math.floor(u * s.h) % 7 === 0 && u > 0.05;
        const glint = Math.abs(u - glintAt) < 0.06 || Math.abs(u - glintAt + 1) < 0.06;
        const tipFade = u > 0.85 ? 1 : 0;
        const body = glint ? ramp[6] : joint ? ramp[5] : ramp[3 - tipFade + (u < 0.15 ? -1 : 0)];
        b.set(X, Y, body);
        if (s.thick > 1 && u < 0.8) b.set(X + 1, Y, glint ? ramp[5] : withAlpha(ramp[1], 200));
        else if (u < 0.6) b.set(X + 1, Y, withAlpha(ramp[0], 130));
        if (u >= 1 - 1 / steps && s.bead) {
          b.set(X, Y - 1, ramp[5]);
          b.set(X - 1, Y - 1, ramp[6]);
          b.set(X, Y - 2, ramp[4]);
          b.set(X - 1, Y, ramp[4]);
        }
      }
    }
    out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The floor: the moss carpet, the tide-pools, the lumen-bells, pebbles
// ---------------------------------------------------------------------------

/**
 * Twilight-moss over the sand: one wide carpet in drifts and islands, fraying
 * into the silver sand at its edges and round the pools; its pile catches the
 * moon on the upper-left of every tuft, deeper hollows between; specks of
 * glow scattered through it (the bright breath is the `glow_*` props).
 */
const CARPET = { w: 640, h: 168 };
/** where the pools sit on the floor, in screen pixels: centre, radii */
const POOLS: [number, number, number, number][] = [
  [116, 332, 40, 13],
  [580, 318, 44, 14],
  [318, 212, 40, 10],
];
const nearPool = (x: number, y: number) => Math.min(...POOLS.map(([cx, cy, rx, ry]) => Math.hypot((x - cx) / (rx + 10), (y - cy) / (ry + 6))));

/** Cellular noise: the nearest jittered point of a grid of `s` px (y squashed by `sq`), the gap to the second, the offset to the nearest and its id. */
function cells(x: number, y: number, s: number, sq: number, seed: number) {
  const fx = x / s, fy = (y * sq) / s;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  let d1 = 9, d2 = 9, ox = 0, oy = 0, id = 0;
  for (let j = iy - 1; j <= iy + 1; j++) {
    for (let i = ix - 1; i <= ix + 1; i++) {
      const px = i + 0.15 + hash2(i, j, seed) * 0.7, py = j + 0.15 + hash2(i, j, seed + 1) * 0.7;
      const d = Math.hypot(fx - px, fy - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        ox = fx - px;
        oy = fy - py;
        id = hash2(i, j, seed + 2);
      } else if (d < d2) d2 = d;
    }
  }
  return { d1, d2, ox, oy, id };
}

function carpet(): Bitmap {
  const { w, h } = CARPET;
  const b = new Bitmap(w, h);
  for (let y = 0; y < h; y++) {
    const sy = y + 192;
    for (let x = 0; x < w; x++) {
      const [u, v] = world(x, sy);
      const pool = nearPool(x, sy);
      // the moss thins round the pools (a ring of bare sand) and a little along the arena's middle
      let k = mossField(u, v) - (pool < 1.3 ? (1.3 - pool) * 0.8 : 0) + (vnoise(x, sy, 5, 203) - 0.5) * 0.1;
      k -= Math.max(0, 1 - Math.hypot((x - 320) / 240, (sy - 254) / 46)) * 0.06;
      if (k < 0 || (k < 0.05 && !dith(x, sy, k / 0.05))) continue;
      // the pile: little clumps, each a dome lit from the upper left, dark seams between
      const c = cells(u, v * 2.2, 3.2, 1, 207);
      let val = 5.4 + (c.id - 0.5) * 1.5 - (c.ox * 0.75 + c.oy * 0.9) * 2.4 - c.d1 * 0.9;
      if (c.d2 - c.d1 < 0.12) val -= 1.6;
      if (k < 0.07) val -= 0.9;
      // a glowing tip now and then
      if (c.id > 0.982 && c.d1 < 0.32 && k > 0.07) {
        b.set(x, y, c.id > 0.994 ? VIOLET[3] : GLOW[3]);
        continue;
      }
      b.set(x, y, rampDither(MOSS, clamp(val, 0, MOSS.length - 1), x, sy));
    }
  }
  return b;
}

/**
 * The moss's glow breathing (pulse): specks and soft patches lighting up in
 * the moss, frame 0 empty. Two sets, so the carpet never breathes all at once.
 */
function mossGlow(seed: number, count: number): Bitmap[] {
  const { w, h } = CARPET;
  const ref = carpet();
  const b = new Bitmap(w, h);
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * w), y = Math.floor(r() * h);
    if (ref.get(x, y) === 0) continue;
    // keep the floor quiet where the champions stand
    const busy = [[216, 250], [152, 216], [136, 284], [424, 250], [488, 216], [504, 284]].some(([fx, fy]) => Math.hypot((x - fx) / 30, (y + 192 - fy) / 14) < 1);
    if (busy) continue;
    const violet = r() < 0.3;
    const ramp = violet ? VIOLET : GLOW;
    const big = r() < 0.3;
    b.set(x, y, ramp[big ? 5 : 4]);
    if (big) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (ref.get(x + dx, y + dy) !== 0) b.set(x + dx, y + dy, withAlpha(ramp[2], 190));
    }
  }
  return [new Bitmap(1, 1), b];
}

/**
 * A tide-pool: still, crystal-clear water over a bed of pale sand and pebbles
 * you can see through it, darker toward its middle; a lip of wet sand, a rim
 * of light along the far shore where it holds the sky; frames shimmer the
 * light on its surface, and once a loop a ring spreads from where a mote
 * touched it and fades.
 */
function tidePool(rx: number, ry: number, seed: number, n = 24): Bitmap[] {
  const W = Math.ceil(rx * 2) + 8, HH = Math.ceil(ry * 2) + 8, cx = W / 2, cy = HH / 2;
  const edge = (x: number, y: number) => Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry) + (vnoise(x, y, 7, seed) - 0.5) * 0.2;
  const r = rng(seed + 1);
  // pebbles on the bed, rounded, lit from the upper left through the water
  const stones: [number, number, number][] = [];
  for (let k = 0; k < Math.round(rx / 2.6); k++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 0.8;
    stones.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 1.2 + r() * 1.8]);
  }
  // a sprig of glowing moss on the bed, and a shell
  const sprig: [number, number] = [cx + (r() - 0.5) * rx * 0.9, cy + (r() - 0.2) * ry * 0.5];
  const ringAt: [number, number] = [cx + (r() - 0.5) * rx * 0.7, cy + (r() - 0.5) * ry * 0.5];
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    const t = i / n;
    for (let y = 0; y < HH; y++) {
      for (let x = 0; x < W; x++) {
        const e = edge(x, y);
        if (e > 1.14) continue;
        if (e > 1) {
          // the lip of wet sand round it
          b.set(x, y, rampDither(SAND, y > cy ? 4.6 : 3.4, x, y));
          continue;
        }
        const depth = Math.pow(1 - e, 0.8);
        // the bed through clear water: pale sand rippled by the tide near the shore, deepening to blue
        const ripple = Math.sin((y - cy) * 1.25 + Math.sin(x * 0.22 + seed) * 1.6) > 0.55 ? 0.7 : 0;
        let v = 7.4 - depth * 6 + ripple * (1 - depth) + (vnoise(x, y, 3, seed + 2) - 0.5) * 0.8;
        for (const [sx, sy, sr] of stones) {
          const d = Math.hypot((x + 0.5 - sx) / (sr * 1.35), (y + 0.5 - sy) / sr);
          if (d < 1) v = 6.4 - depth * 3.6 - ((x + 0.5 - sx) / sr) * 1.2 - ((y + 0.5 - sy) / sr) * 1.4;
          else if (d < 1.5 && x > sx && y > sy) v -= 0.8;
        }
        let c = rampDither(BED, clamp(v, 0, BED.length - 1), x, y);
        if (Math.hypot(x + 0.5 - sprig[0], (y + 0.5 - sprig[1]) * 1.6) < 1.6) c = GLOW[hash2(x, y, seed + 4) > 0.5 ? 4 : 3];
        // the surface: the sky in a band along the far shore, the moon's glints shimmering on it
        if (y < cy - ry * 0.4 && e > 0.55 && dith(x, y, (e - 0.55) * 1.4)) c = REFL[e > 0.85 ? 2 : 1];
        const shimmer = Math.sin(x * 0.62 + y * 1.9 + t * TAU * 2 + Math.sin(y * 0.7 + seed) * 2) + Math.sin(x * 0.27 - t * TAU + y * 0.4) * 0.7;
        if (shimmer > 1.42 && depth > 0.12 && hash2(x, y, seed + 3) > 0.45) c = SHINE[y < cy ? 5 : 4];
        // the ring: spreads over the first third of the loop, then the water is still again
        const rt = t / 0.34;
        if (rt < 1) {
          const rr = 2 + rt * rx * 0.6;
          const d = Math.hypot((x + 0.5 - ringAt[0]) / 2, y + 0.5 - ringAt[1]);
          if (Math.abs(d - rr / 2) < 0.55 && dith(x, y, (1 - rt) * 0.6)) c = SHINE[y < ringAt[1] ? 3 : 2];
        }
        b.set(x, y, c);
      }
    }
    // the waterline: bright along the far shore where it holds the moon, dark under the near bank
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < HH; y++) {
        if (edge(x, y) > 1 || edge(x, y - 1) <= 1) continue;
        b.set(x, y, y < cy ? SHINE[3] : BED[1]);
      }
      for (let y = HH - 1; y > 0; y--) {
        if (edge(x, y) > 1 || edge(x, y + 1) <= 1) continue;
        b.set(x, y, SAND[8]);
        break;
      }
    }
    out.push(b);
  }
  return out;
}

/** The moon's light on the arena: a faint cool sheen over the floor, strongest under the moon's side, thinning toward the edges. */
function moonWash(): Bitmap {
  const W = 520, HH = 150;
  const b = new Bitmap(W, HH);
  const cool = hex('#c4d4ff');
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < W; x++) {
      const k = Math.max(0, 1 - Math.hypot((x - W * 0.4) / (W * 0.55), (y - HH * 0.42) / (HH * 0.6))) * 0.42;
      if (k > 0.03 && dith(x, y, k)) b.set(x, y, withAlpha(cool, 22));
    }
  }
  return b;
}

/** A pearlescent halo over a pool (pulse): frame 0 empty, frame 1 a soft glow in two tints. */
function poolHalo(rx: number, ry: number, c0: RGBA, c1: RGBA): Bitmap[] {
  const W = Math.ceil(rx * 2) + 4, HH = Math.ceil(ry * 2) + 4;
  const b = new Bitmap(W, HH);
  ellipseFill(b, W / 2, HH / 2, rx, ry, (x, y, d) => {
    const k = Math.pow(1 - d, 1.4) * 0.75;
    if (!dith(x, y, k)) return 0;
    return withAlpha(y < HH / 2 + (x - W / 2) * 0.2 ? c0 : c1, d < 0.4 ? 90 : 60);
  });
  return [new Bitmap(1, 1), b];
}

/**
 * Lumen-bells: the glowing flora that sheds the motes, a cluster of thin
 * curved stems each bowing under a bell of light. Frame 0 shows them dim,
 * frame 1 lit with a glow round each bell (pulse).
 */
function lumenBells(seed: number, count: number, w: number, hh: number): Bitmap[] {
  const r = rng(seed);
  const bells = Array.from({ length: count }, () => ({ x: 3 + r() * (w - 6), h: hh * (0.45 + r() * 0.5), bow: (r() - 0.5) * 1.1, violet: r() < 0.35, size: r() < 0.4 ? 2 : 1 }));
  return [0, 1].map((lit) => {
    const b = new Bitmap(w, hh);
    for (const s of bells) {
      const ramp = s.violet ? VIOLET : GLOW;
      let tipX = s.x, tipY = hh - 1;
      const steps = Math.ceil(s.h);
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const x = s.x + s.bow * u * u * s.h * 0.4, y = hh - 1 - u * s.h + u * u * s.h * 0.12;
        b.set(Math.round(x), Math.round(y), u > 0.75 ? MOSS[8] : MOSS[6]);
        tipX = x;
        tipY = y;
      }
      const bx = Math.round(tipX + (s.bow > 0 ? 1 : -1)), by = Math.round(tipY + 1);
      if (lit) {
        ellipseFill(b, bx, by + 1, 3 + s.size, 2.4 + s.size, (x, y, d) => (dith(x, y, (1 - d) * 0.8) ? withAlpha(ramp[4], 120) : 0));
      }
      for (let dy = 0; dy <= s.size; dy++) {
        for (let dx = -s.size; dx <= s.size - (dy === s.size ? 1 : 0); dx++) b.set(bx + dx, by + dy, lit ? ramp[dy === 0 && dx <= 0 ? 7 : 5] : ramp[dy === 0 && dx <= 0 ? 4 : 2]);
      }
    }
    return b;
  });
}

/** A few stones half sunk in the sand at the pools, lit on the upper left. */
function stones(seed: number, list: [number, number, number][], w: number, hh: number): Bitmap {
  const b = new Bitmap(w, hh);
  void seed;
  for (const [x, y, rad] of list) {
    ellipseFill(b, x + rad * 0.6, y + rad * 0.3, rad * 1.2, rad * 0.45, (px, py, d) => (dith(px, py, (1 - d) * 1.5) ? withAlpha(SAND[0], 170) : 0));
    ellipseFill(b, x, y, rad * 1.15, rad * 0.75, (px, py, d) => rampDither(PEBBLE, 4.4 - (px - x) / rad * 1.6 - (py - y) / rad * 2.2 - d * 0.8 + (vnoise(px, py, 2, 211) - 0.5), px, py));
  }
  return outline(b, PEBBLE[0]);
}

// ---------------------------------------------------------------------------
// The foreground: the grove's root out of the left edge (the reeds in the corner are above)
// ---------------------------------------------------------------------------

/**
 * One of the grove's great roots arching out of the left edge into the sand:
 * dark bark lit along its back by the moon, furrowed, moss on it with a few
 * glowing tufts, small rootlets clawing into the ground.
 */
function greatRoot(): Bitmap {
  const W = 100, HH = 84;
  const b = new Bitmap(W, HH);
  // the root's spine: out of the left edge, arching up, diving into the sand
  const spine = (u: number): [number, number] => [-8 + u * 98, 44 - Math.sin(u * Math.PI * 0.95) * 30 + u * u * 36];
  const th = (u: number) => 11 * (1 - u * 0.62) + Math.sin(u * 11) * 0.9;
  for (let k = 0; k <= 500; k++) {
    const u = k / 500;
    const [x, y] = spine(u);
    const [x2, y2] = spine(Math.min(1, u + 0.004));
    const nx = -(y2 - y), ny = x2 - x, nl = Math.hypot(nx, ny) || 1;
    const t = th(u);
    for (let a = -t; a <= t; a += 0.4) {
      const px = Math.round(x + (nx / nl) * a), py = Math.round(y + (ny / nl) * a);
      // across the root: its back toward the moon lit, its belly dark; furrows along it, a knot
      const s = a / t;
      const furrow = Math.sin(s * 5.4 + u * 4) > 0.72 ? -1.3 : 0;
      const knot = Math.hypot(px - 40, py - 18) < 4 ? 0.8 : 0;
      const v = 4.6 - s * 3.6 + furrow + knot + (vnoise(px, py, 2.6, 221) - 0.5) * 0.9;
      b.set(px, py, rampDither(ROOT, clamp(v, 0, ROOT.length - 1), px, py));
    }
    // the moonlit edge of its back, moss along it, now and then a glowing tuft
    const ex = Math.round(x - (nx / nl) * t), ey = Math.round(y - (ny / nl) * t);
    if (k % 2 === 0) b.set(ex, ey, ROOT[8]);
    if (k % 5 === 0 && vnoise(u * 70, 0, 4, 222) > 0.42) {
      const glow = hash2(k, 1, 223) > 0.84;
      b.set(ex, ey - 1, glow ? GLOW[5] : MOSS[9]);
      b.set(ex + 1, ey - 1, glow ? GLOW[3] : MOSS[7]);
      if (glow) b.set(ex, ey - 2, GLOW[3]);
    }
  }
  // rootlets clawing into the sand along its belly, near where it dives
  const r = rng(224);
  for (let i = 0; i < 6; i++) {
    const u = 0.35 + r() * 0.6;
    const [x, y] = spine(u);
    let px = x + 2, py = y + th(u) * 0.7;
    const len = 4 + r() * 8;
    for (let k = 0; k < len; k++) {
      px += (r() - 0.35) * 1.3;
      py += 0.8;
      b.set(Math.round(px), Math.round(py), ROOT[k < len * 0.5 ? 3 : 2]);
    }
  }
  return outline(b, ROOT[0]);
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const set = (layer: number[], c: number, r: number, n: string) => (layer[r * MAP_COLS + c] = id(n));
  const r = rng(301);
  const plain = ['sand_a', 'sand_b', 'sand_c', 'sand_d', 'sand_a', 'sand_c', 'sand_e', 'sand_f', 'sand_g', 'sand_h', 'sand_a', 'sand_d'];
  for (let row = 6; row < MAP_ROWS; row++) {
    for (let c = 0; c < MAP_COLS; c++) set(ground, c, row, row === 6 ? (r() < 0.5 ? 'rim_a' : 'rim_b') : plain[Math.floor(r() * plain.length)]);
  }
  const [pl, pr, pc] = POOLS;
  const props: PropPlacement[] = [
    // far: twinkling stars, thin clouds drifting, the moon's path on the long pool
    { kind: 'twinkle_a', x: 0, y: 0, layer: 'far' },
    { kind: 'twinkle_b', x: 0, y: 0, layer: 'far' },
    { kind: 'twinkle_c', x: 0, y: 0, layer: 'far' },
    { kind: 'cloud_a', x: 210, y: 34, layer: 'far' },
    { kind: 'cloud_b', x: 520, y: 16, layer: 'far' },
    { kind: 'cloud_c', x: 40, y: 44, layer: 'far' },
    { kind: 'moonpath', x: MOON_X, y: Math.floor(inPool(MOON_X, 0).top), layer: 'far' },
    // back: reed beds in the middle distance
    { kind: 'reeds_far_a', x: 352, y: 178, layer: 'back' },
    { kind: 'reeds_far_b', x: 470, y: 186, layer: 'back' },
    { kind: 'reeds_far_c', x: 268, y: 168, layer: 'back' },
    // floor: the moss carpet and its breath, the pools and their halos, lumen-bells, reeds round the pools, stones
    { kind: 'carpet', x: 0, y: 192, layer: 'floor' },
    { kind: 'moonwash', x: 40, y: 196, layer: 'floor' },
    { kind: 'glow_a', x: 0, y: 192, layer: 'floor' },
    { kind: 'glow_b', x: 0, y: 192, layer: 'floor' },
    { kind: 'pool_l', x: pl[0], y: pl[1], layer: 'floor' },
    { kind: 'pool_r', x: pr[0], y: pr[1], layer: 'floor' },
    { kind: 'pool_c', x: pc[0], y: pc[1], layer: 'floor' },
    { kind: 'halo_l', x: pl[0], y: pl[1] + 1, layer: 'floor' },
    { kind: 'halo_r', x: pr[0], y: pr[1] + 1, layer: 'floor' },
    { kind: 'halo_c', x: pc[0], y: pc[1] + 1, layer: 'floor' },
    { kind: 'stones_c', x: pc[0], y: pc[1] + 1, layer: 'floor' },
    { kind: 'bells_c', x: pc[0] + 36, y: pc[1] + 3, layer: 'floor' },
    { kind: 'reeds_c', x: pc[0] - 36, y: pc[1] + 2, layer: 'floor' },
    { kind: 'bells_l', x: pl[0] - 46, y: pl[1] - 2, layer: 'floor' },
    { kind: 'reeds_l', x: pl[0] + 34, y: pl[1] - 8, layer: 'floor' },
    { kind: 'bells_r', x: pr[0] - 50, y: pr[1] - 2, layer: 'floor' },
    { kind: 'reeds_r', x: pr[0] - 22, y: pr[1] - 11, layer: 'floor' },
    // fg: the grove's root out of the left edge, a branch with hanging moss over the top-left corner, tall reeds in the bottom-right
    { kind: 'root', x: 0, y: 362, layer: 'fg' },
    { kind: 'reeds_fg', x: 640, y: 362, layer: 'fg' },
  ];
  // the runtime draws a layer's props in this order, the preview sorts them by y: keep the two the same
  const order = { far: 0, back: 1, floor: 2, fg: 3 } as const;
  props.sort((a, c) => order[a.layer] - order[c.layer] || a.y - c.y);
  return { ground, wall, props };
}

/** A halo's anchor: its centre stands `lift` px above where it is placed (so it is drawn after its pool). */
const haloAnchor = (ry: number, lift: number): [number, number] => {
  const hh = Math.ceil(ry * 2) + 4;
  return [0.5, (hh / 2 + lift) / hh];
};

const REEDS_FG = { w: 84, h: 120 };
const REEDS_POOL = { w: 44, h: 46 };
const REEDS_FAR = { w: 40, h: 24 };

export const zone3: ZoneArt = {
  id: 'zone3',
  name: 'Moonlit Basin',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    twinkle_a: twinkles(401, 18),
    twinkle_b: twinkles(402, 16),
    twinkle_c: twinkles(403, 14),
    cloud_a: [thinCloud(120, 9, 411)],
    cloud_b: [thinCloud(86, 7, 412)],
    cloud_c: [thinCloud(150, 11, 413)],
    moonpath: moonPath(),
    reeds_far_a: reeds(REEDS_FAR.w, REEDS_FAR.h, stems(421, 9, REEDS_FAR.w, 10, 20)),
    reeds_far_b: reeds(REEDS_FAR.w, REEDS_FAR.h, stems(422, 8, REEDS_FAR.w, 9, 18, { violet: 0.6 })),
    reeds_far_c: reeds(REEDS_FAR.w, REEDS_FAR.h, stems(423, 7, REEDS_FAR.w, 8, 16)),
    carpet: [carpet()],
    moonwash: [moonWash()],
    glow_a: mossGlow(431, 260),
    glow_b: mossGlow(432, 260),
    pool_l: tidePool(POOLS[0][2], POOLS[0][3], 441),
    pool_r: tidePool(POOLS[1][2], POOLS[1][3], 442),
    pool_c: tidePool(POOLS[2][2], POOLS[2][3], 443),
    halo_l: poolHalo(POOLS[0][2] + 10, POOLS[0][3] + 8, PEARL[0], PEARL[1]),
    halo_r: poolHalo(POOLS[1][2] + 10, POOLS[1][3] + 8, PEARL[2], PEARL[3]),
    halo_c: poolHalo(POOLS[2][2] + 8, POOLS[2][3] + 6, PEARL[1], PEARL[2]),
    stones_c: [stones(451, [[10, 14, 4], [20, 16, 2.5], [58, 10, 3]], 72, 24)],
    bells_c: lumenBells(461, 5, 22, 16),
    bells_l: lumenBells(462, 7, 30, 20),
    bells_r: lumenBells(463, 6, 28, 18),
    reeds_c: reeds(REEDS_POOL.w, REEDS_POOL.h - 10, stems(471, 9, REEDS_POOL.w, 14, 30), 16, { base: true }),
    reeds_l: reeds(REEDS_POOL.w, REEDS_POOL.h, stems(472, 12, REEDS_POOL.w, 18, 42), 16, { base: true }),
    reeds_r: reeds(REEDS_POOL.w, REEDS_POOL.h, stems(473, 11, REEDS_POOL.w, 18, 40, { violet: 0.6 }), 16, { base: true }),
    root: [greatRoot()],
    reeds_fg: reeds(REEDS_FG.w, REEDS_FG.h, stems(481, 15, REEDS_FG.w, 40, 108, { spread: 0.8 }), 16, { base: true }),
  }),
  kinds: {
    // the stars twinkle, each set on its own slow breath
    twinkle_a: { anchor: [0, 0], mode: 'pulse', ms: 5300 },
    twinkle_b: { anchor: [0, 0], mode: 'pulse', ms: 7700 },
    twinkle_c: { anchor: [0, 0], mode: 'pulse', ms: 10100 },
    // thin clouds drift slowly east and come round again, one now and then across the moon
    cloud_a: { anchor: [0.5, 0.5], mode: 'static', drift: { speed: 1.4 } },
    cloud_b: { anchor: [0.5, 0.5], mode: 'static', drift: { speed: 2.1 } },
    cloud_c: { anchor: [0.5, 0.5], mode: 'static', drift: { speed: 0.9 } },
    moonpath: { anchor: [0.5, 0], mode: 'loop', ms: 260 },
    // the reeds sway, each clump at its own pace; glints run up the stems
    reeds_far_a: { anchor: [0.5, 1], mode: 'loop', ms: 300 },
    reeds_far_b: { anchor: [0.5, 1], mode: 'loop', ms: 340 },
    reeds_far_c: { anchor: [0.5, 1], mode: 'loop', ms: 320 },
    carpet: { anchor: [0, 0], mode: 'static' },
    moonwash: { anchor: [0, 0], mode: 'static' },
    // the moss breathes its glow, two sets out of step
    glow_a: { anchor: [0, 0], mode: 'pulse', ms: 6400 },
    glow_b: { anchor: [0, 0], mode: 'pulse', ms: 9300 },
    // the pools shimmer; a ring spreads once a loop (24 frames)
    pool_l: { anchor: [0.5, 0.5], mode: 'loop', ms: 240 },
    pool_r: { anchor: [0.5, 0.5], mode: 'loop', ms: 270 },
    pool_c: { anchor: [0.5, 0.5], mode: 'loop', ms: 255 },
    // the halos over the pools breathe
    halo_l: { anchor: haloAnchor(POOLS[0][3] + 8, 5), mode: 'pulse', ms: 8200 },
    halo_r: { anchor: haloAnchor(POOLS[1][3] + 8, 5), mode: 'pulse', ms: 11300 },
    halo_c: { anchor: haloAnchor(POOLS[2][3] + 6, 4), mode: 'pulse', ms: 9700 },
    stones_c: { anchor: [0.5, 0.5], mode: 'static' },
    bells_c: { anchor: [0.5, 1], mode: 'pulse', ms: 5600 },
    bells_l: { anchor: [0.5, 1], mode: 'pulse', ms: 6900 },
    bells_r: { anchor: [0.5, 1], mode: 'pulse', ms: 7900 },
    reeds_c: { anchor: [0.5, 1], mode: 'loop', ms: 290 },
    reeds_l: { anchor: [0.5, 1], mode: 'loop', ms: 270 },
    reeds_r: { anchor: [0.5, 1], mode: 'loop', ms: 310 },
    root: { anchor: [0, 1], mode: 'static' },
    reeds_fg: { anchor: [1, 1], mode: 'loop', ms: 330 },
  },
  layout,
  horizon: HZ,
};
