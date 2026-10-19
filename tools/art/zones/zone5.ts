// Zone "Snowy Mesa": Zone 5, named and described by Jakub (2026-10-19,
// docs/DESIGN_DECISIONS.md 5.8): a fantasy area on the top of a snow-capped
// tabletop mountain; in the background many more tabletop mountains, all
// connected with many candles; the time before sunset; a snowstorm
// approaching from the right corner; a castle on the left background mesa
// with a huge chimney that breathes out purple dust and particles; the battle
// on the top of such a mountain, with a few trees and a big arbiter statue,
// like a Buddha holding a big sword.
//
// As painted: the sun low in the upper left (the key light) in a sky going
// from indigo overhead through violet and rose to gold over the horizon, thin
// clouds lit from beneath. Mesas rise all round out of a sea of cloud far
// below, their cliffs banded and glowing on the sun's side, snow on their
// tops, on their ledges and down their gullies; the nearer ones stand above
// our eyes, the further ones lower, their snowy tops seen from above; they
// throw long shadows over the clouds. Cables run from mesa to mesa, sagging
// over the gulfs, candles hung along them in little lanterns; two of them run
// out from the rim of our own mesa. On the left mesa a castle of dark stone,
// lit windows, snow on its roofs, and its huge chimney breathing a column of
// purple dust that leans away with the wind, purple motes drifting off it.
// From the upper right the storm comes on: a wall of dark cloud lit rose along
// its front by the low sun, veils of snow trailing beneath it over the far
// mesas. The arena is the mesa's flat top: snow combed by the wind, the old
// flagstones of a terrace swept bare in front of the arbiter, a seated
// colossus of weathered bronze, eyes closed, both hands on the pommel of a
// great sword planted before him, candles burning on his plinth. Two mountain
// pines bent by the wind. Animated: the candles flicker, each at its own pace;
// the plume rolls up and its motes drift; the storm's veils trail; snow
// streams off the rims; the pines and the lanterns sway; spindrift snakes over
// the snow; now and then lightning glows inside the storm (ZoneDef flash), and
// snow flurries blow in from the right ahead of it (ambient 'flurries').
// Everything his description did not name is a first take (DESIGN_DECISIONS
// 5.8).
import { dith, ellipseFill, outline, polyFill, rampDither } from '../paint.ts';
import type { Material } from '../palette.ts';
import { Capsule, Ellipse, Frame, Hit, Pixels, Poly, Ribbon, V } from '../render.ts';
import { Bitmap, hash2, hex, mix, RGBA, rng, withAlpha } from '../raster.ts';
import { MAP_COLS, MAP_ROWS, Painter, PropPlacement, SPAWNS, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));
/** A ramp for the statue drawn with the champion renderer: [outline, deep, shadow, base, light, highlight]. */
const mat = (name: string, kind: Material['kind'], colors: string[]): Material => ({ name, kind, ramp: H(colors) });

// --- the sky before sunset: indigo overhead, violet, rose, orange, gold over the horizon; white-gold round the sun
const SKY = H(['#181a42', '#1f2150', '#28295e', '#33306a', '#403676', '#4f3c80', '#614288', '#74488e', '#884e90', '#9c568e', '#b05e8a', '#c26884', '#d2747c', '#df8274', '#ea926a', '#f2a462', '#f8b860', '#fccc66', '#fede78', '#ffec94']);
const SUNG = H(['#fff4b8', '#fffad8', '#fffdf0']);
const SUN = H(['#ffe9a0', '#fff6cc', '#fffcec', '#ffffff']);
/** thin clouds lit from beneath by the low sun */
const GLOWC = H(['#4a3366', '#643f74', '#82507e', '#a46282', '#c87884', '#e69482', '#fab486', '#ffd49a', '#ffecc0']);
// --- the storm: dark slate, its front lit rose by the low sun; the veils of snow beneath it
const STORM = H(['#13142a', '#191b33', '#20223c', '#282a46', '#313250', '#3b3b5a', '#464565', '#535070', '#625d7c', '#746a86', '#8a768e', '#a48292', '#c09090', '#dca490']);
const VEIL = H(['#5a5a7c', '#6e6c8c', '#84829e', '#9c98b0', '#b4b0c4', '#cdc8d8']);
// --- the mesas: banded rock glowing on the sun's side, violet in shade; their snow peach in the sun, lilac in shade
const ROCK = H(['#221a2c', '#2e2034', '#3c283c', '#4c3044', '#5e3a4a', '#72444e', '#885052', '#a05e56', '#b86e5a', '#d0825e', '#e49a66', '#f4b674']);
const SNOW = H(['#5e5a8a', '#726c9c', '#8a80ac', '#a496bc', '#bfaac6', '#d8bcc8', '#ecccc6', '#f8dccc', '#fff0e0', '#fffaf2']);
/** the haze the distance takes: the mesas' ramps mixed toward it, three steps */
const HAZEC = hex('#c69aae');
const hazed = (ramp: RGBA[], k: number) => ramp.map((c) => mix(c, HAZEC, k));
const ROCK_H = [ROCK, hazed(ROCK, 0.3), hazed(ROCK, 0.52), hazed(ROCK, 0.72)];
const SNOW_H = [SNOW, hazed(SNOW, 0.22), hazed(SNOW, 0.4), hazed(SNOW, 0.58)];
// --- the sea of cloud far below: its billows lit gold and rose, lilac in their hollows, blue-grey under the storm
const SEA = H(['#34325a', '#403c68', '#4e4876', '#5e5482', '#70608c', '#846c96', '#9a7a9e', '#b088a2', '#c698a4', '#daaaa4', '#ecbea8', '#f8d2ae', '#ffe6bc']);
// --- the castle: dark stone, slate roofs under snow, lit windows; the chimney's purple dust
const CASTLE = H(['#120f1c', '#1a1624', '#231d2e', '#2e2638', '#3a3044', '#483c50', '#5a4a5c', '#705a68', '#8a6c74', '#a88078']);
const WINDOW = H(['#8a3a1a', '#d8782a', '#ffc050', '#fff0a8']);
export const PLUME = H(['#24123a', '#341850', '#462066', '#5a2a7c', '#703892', '#8848a8', '#a05cbc', '#b876cc', '#ce94da', '#e2b4e6', '#f2d4f0']);
const MOTE = ['#efccff', '#d6a4ff', '#b47ae8', '#9858d4', '#7038a8'];
// --- our mesa's top: snow in the late light (a mid value, so the champions read), old flagstones, rock, frozen grass
const SNOWF = H(['#3c3858', '#474264', '#534c70', '#60577c', '#6e6286', '#7c6d90', '#8b7a98', '#9a869e', '#aa94a4', '#baa2aa', '#c9b0ae', '#d8beb2', '#e6ccb8']);
const PAVE = H(['#211b27', '#2d2634', '#3b3243', '#4a4052', '#594e62', '#695d70', '#7a6c7e', '#8c7d8e']);
const STONE = H(['#1e1824', '#2a2130', '#382c3a', '#473844', '#58454e', '#6a5458', '#7e6462', '#94766c', '#ac8a76']);
const STRAW = H(['#4a3a2a', '#6a5236', '#8c6c42', '#ae8a52', '#cca866']);
// --- the pines, their bark, the snow on their boughs
const PINE = H(['#0b1216', '#10191c', '#152222', '#1b2b28', '#22352e', '#2b4034', '#364b3a', '#4a5a42', '#6a6a4c']);
const BARK = H(['#160f12', '#221718', '#30201e', '#402a24', '#54362c', '#6c4634', '#88583e']);
// --- the cables, the lanterns and the candles
const ROPE = H(['#120e12', '#20181a', '#302420', '#463428', '#5e4632']);
const ROPE_FAR = H(['#4a3446', '#6e5266', '#8e6c80']);
const IRON = H(['#141218', '#221e28', '#332e3a', '#4a4452', '#62596a']);
const WAX = H(['#7a6a64', '#a6948a', '#cfbcac', '#eadcc8', '#fff4e4']);
const FLAME = H(['#a83a14', '#e0701e', '#fca43a', '#ffd870', '#fff6c8', '#ffffff']);
const SHADE = hex('#1a1430');

/** the sun, low in the upper left: the key light */
const SUN_X = 94, SUN_Y = 82;
/** the eye level: where the far sea of cloud meets the sky */
const VY = 106;

// ---------------------------------------------------------------------------
// Noise and light
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

/** How a surface with this normal (screen space, +z toward us) takes the low sun: from the left, a little above and in front. */
const sunOn = (nx: number, ny: number, nz: number) => -0.78 * nx - 0.32 * ny + 0.54 * nz;

// ---------------------------------------------------------------------------
// The ground in perspective, shared by the backdrop's far snow and the arena
// ---------------------------------------------------------------------------

/**
 * A screen row y maps to a scale (px per world unit) that grows from the eye
 * level toward the camera; `world` gives a pixel's place on the mesa's top (u
 * across, from the screen's middle; v in depth), where a shape keeps its size,
 * so the far snow and the arena run on into each other.
 */
const PK = 0.0056;
const pscale = (y: number) => Math.max(0.05, (y - VY) * PK);
function world(x: number, y: number): [number, number] {
  return [(x - 320) / pscale(y), Math.log(Math.max(0.5, y - VY)) / PK];
}
/** The screen row of a world depth v. */
const rowOf = (v: number) => VY + Math.exp(v * PK);

/** The rim of our mesa: where its top ends and the gulf begins (screen y at x). */
const rimY = (x: number) => 160 + (n1(x, 47, 31) - 0.5) * 4 + (n1(x, 13, 32) - 0.5) * 1.6 - 2 * smooth(560, 640, x) + 2 * smooth(120, 0, x);

/** The storm's shade over the right of the scene: 0 in the sun, 1 under the storm. */
const stormK = (x: number, y: number) => smooth(330, 690, x + (VY + 60 - y) * 0.5 + (vnoise(x, y, 60, 41) - 0.5) * 60);

// ---------------------------------------------------------------------------
// Backdrop
// ---------------------------------------------------------------------------

function backdrop(): Bitmap {
  const b = new Bitmap(640, 200);
  sky(b);
  glowClouds(b);
  sun(b);
  storm(b);
  sea(b);
  for (const m of [...HORIZON_MESAS, ...MESAS].sort((p, q) => mesaZ(q) - mesaZ(p))) mesa(b, m);
  castle(b);
  cables(b);
  veils(b);
  plateau(b);
  return b;
}

/** The sky ramp running on into the white-gold round the sun. */
const SKYSUN = [...SKY, ...SUNG];

function sky(b: Bitmap) {
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 640; x++) {
      const t = clamp(y / (VY + 2), 0, 1);
      const d = Math.hypot((x - SUN_X) * 0.78, (y - SUN_Y) * 1.3);
      const glow = Math.max(0, 1 - d / 330);
      // the further from the sun, the less gold over the horizon: rose and lilac instead
      const away = clamp((x - SUN_X) / 560, 0, 1);
      const v = Math.pow(t, 1.25) * 15.5 * (1 - away * 0.22) + Math.pow(glow, 2.4) * 7.5 + Math.pow(Math.max(0, 1 - d / 60), 1.6) * 3.5;
      b.set(x, y, rampDither(SKYSUN, clamp(v, 0, SKYSUN.length - 1), x, y));
    }
  }
}

/**
 * Thin bands of cloud across the sky, lit from beneath by the low sun: gold and
 * rose on their undersides near the sun, violet away from it and on top.
 */
function glowClouds(b: Bitmap) {
  const bands: [number, number, number, number, number][] = [
    // centre x, y, half length, thickness, seed
    [150, 28, 120, 2.6, 711], [262, 50, 100, 2, 712], [92, 56, 64, 1.6, 713], [330, 18, 76, 1.4, 714], [196, 70, 52, 1.3, 715], [404, 40, 46, 1.2, 716],
  ];
  for (const [cx, cy, rx, th0, seed] of bands) {
    for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
      if (x < 0 || x > 639) continue;
      const k = (x - cx) / rx;
      const th = (1 - k * k) * th0 * (0.7 + 0.9 * n1(x, 11, seed));
      const mid = cy + (n1(x, 41, seed + 1) - 0.5) * 5 - k * 3;
      for (let y = Math.floor(mid - th); y <= mid + th + 1; y++) {
        if (y < 0) continue;
        const a = 1 - Math.abs(y + 0.5 - mid) / (th + 0.6);
        if (a <= 0 || !dith(x, y, a * 0.9)) continue;
        const near = Math.max(0, 1 - Math.hypot(x - SUN_X, (y - SUN_Y) * 1.6) / 320);
        // the underside catches the sun, the top lies in the violet
        const under = y > mid ? 1.6 : -0.6;
        b.set(x, y, rampDither(GLOWC, clamp(2.2 + near * 5.2 + under + a * 0.8, 0, GLOWC.length - 1), x, y));
      }
    }
  }
}

function sun(b: Bitmap) {
  ellipseFill(b, SUN_X, SUN_Y, 7.5, 7.5, (x, y, d) => (d > 0.86 ? SUN[1] : rampDither(SUN, 3.6 - d * 1.4, x, y)));
}

// ---------------------------------------------------------------------------
// The sea of cloud far below
// ---------------------------------------------------------------------------

/**
 * The sea of cloud lies far beneath the mesa tops: the eye stands 1 above its
 * mean level, a world point (X across, Z away, E up) shows at screen x = 320 +
 * X F / Z, y = VY + (1 - E) F / Z. Its billows are a height field rendered
 * column by column from near to far, so the nearer hide the further and each
 * shows a lit top over a shaded flank.
 */
const SEA_F = 600;
/** how high the cloud tops stand at a world point (the billows) */
function seaE(X: number, Z: number): number {
  const n = vnoise(X, Z * 1.25, 1.4, 51) * 0.55 + vnoise(X, Z * 1.25, 0.5, 52) * 0.3 + vnoise(X, Z * 1.25, 0.17, 53) * 0.15;
  // round billows: the noise's crests swell, its troughs flatten
  let e = 0.3 * Math.pow(n, 1.6);
  // the cloud heaps up against the mesas' walls
  for (const w of MESA_WORLD()) {
    const d = Math.hypot((X - w.X) / (w.R * 1.7 + 0.8), (Z - w.Z) / (w.R * 1.2 + 1.2));
    if (d < 1) e += 0.14 * (1 - d) * (1 - d) * (0.6 + 0.8 * vnoise(X, Z, 0.6, 54));
  }
  return e;
}
/** the depth of the sea seen at each backdrop pixel (Infinity where it does not show), for the mesas' feet */
const seaZ = new Float32Array(640 * 200).fill(Infinity);

/** A mesa in the world: where it stands, how wide it is, how high its top rises over the sea (the eye at 1). */
function mesaWorld(m: Mesa) {
  const Z = SEA_F / Math.max(0.5, m.base - VY);
  return { X: ((m.x0 + m.x1) / 2 - 320) * (Z / SEA_F), Z, R: ((m.x1 - m.x0) / 2) * (Z / SEA_F), E: 1 - (m.top - VY) * (Z / SEA_F) };
}
const mesaZ = (m: Mesa) => mesaWorld(m).Z;
/** the nearer mesas in the world, for the cloud heaped round their feet */
let mesaWorldCache: ReturnType<typeof mesaWorld>[] | null = null;
const MESA_WORLD = () => (mesaWorldCache ??= MESAS.filter((m) => m.haze < 3).map(mesaWorld));

/**
 * Whether the mesas' long shadows reach a point of the sea: the low sun on the
 * left throws each mesa's shadow far to the right over the clouds, a little
 * away from us.
 */
function seaShadow(X: number, Z: number): number {
  let s = 0;
  for (const m of MESAS) {
    const w = mesaWorld(m);
    const along = X - w.X;
    if (along < -w.R * 0.4) continue;
    const len = w.R * 2 + w.E * 7;
    if (along > len) continue;
    const zc = w.Z + along * 0.25;
    const half = w.R * (0.75 - 0.35 * (along / len));
    const d = Math.abs(Z - zc) / Math.max(0.01, half);
    if (d < 1) s = Math.max(s, (1 - d * d) * (1 - along / len) * 1.4);
  }
  return clamp(s, 0, 1);
}

function sea(b: Bitmap) {
  const L = [-0.62, 0.52, -0.58];
  for (let x = 0; x < 640; x++) {
    let yb = 200;
    for (let Z = 8; Z < 1100; Z *= 1.01) {
      const X = ((x - 320) * Z) / SEA_F;
      const e = seaE(X, Z);
      const yt = VY + ((1 - e) * SEA_F) / Z;
      const yi = Math.ceil(yt);
      if (yi >= yb) continue;
      // the billow's normal from the height field's slope: lit where it faces the sun (left, above, toward us)
      const h = 0.06;
      const ex = (seaE(X + h, Z) - seaE(X - h, Z)) / (2 * h), ez = (seaE(X, Z + h) - seaE(X, Z - h)) / (2 * h);
      const nl = Math.hypot(ex, 1, ez);
      const lit = (L[0] * -ex + L[1] + L[2] * -ez) / nl;
      const near = Math.max(0, 1 - Math.hypot((x - SUN_X) * 0.7, (yt - SUN_Y) * 2) / 420);
      const st = stormK(x, yt);
      const sh = seaShadow(X, Z);
      // far off the sea pales into the haze; near the sun it glows gold
      const haze = 1 - smooth(VY, VY + 22, yt);
      const v0 = 2.2 + lit * 6 + near * 3.2 - st * 2.4 - sh * 3.4 + haze * 3 + (e / 0.2 - 0.4) * 2.2;
      for (let y = yi; y < yb; y++) {
        if (y < 0) continue;
        // the top of a billow lit, its flank below in its own shade
        const v = v0 - (y - yi) * 0.55 * (1 - haze);
        b.set(x, y, rampDither(SEA, clamp(v, 0, SEA.length - 1), x, y));
        seaZ[y * 640 + x] = Z;
      }
      yb = yi;
    }
  }
}

// ---------------------------------------------------------------------------
// The mesas
// ---------------------------------------------------------------------------

interface Mesa {
  /** the top's extent and height (screen) */
  x0: number;
  x1: number;
  top: number;
  /** the screen row where the sea of cloud meets its foot: sets how far off it stands */
  base: number;
  /** 0 near .. 3 far: which hazed ramps it takes */
  haze: 0 | 1 | 2 | 3;
  seed: number;
}

/**
 * Many mesas round ours: the castle's on the left, nearer and higher than
 * ours; the others further off, lower and lower toward the horizon, their snowy
 * tops seen from above; those on the right in the storm.
 */
const CASTLE_MESA: Mesa = { x0: 114, x1: 270, top: 88, base: 166, haze: 0, seed: 1 };
const MESAS: Mesa[] = [
  CASTLE_MESA,
  { x0: -18, x1: 54, top: 99, base: 128, haze: 2, seed: 2 },
  { x0: 62, x1: 98, top: 103, base: 120, haze: 3, seed: 3 },
  { x0: 276, x1: 348, top: 111, base: 142, haze: 1, seed: 4 },
  { x0: 356, x1: 436, top: 95, base: 150, haze: 1, seed: 5 },
  { x0: 296, x1: 326, top: 104, base: 116, haze: 3, seed: 6 },
  { x0: 440, x1: 478, top: 103, base: 126, haze: 2, seed: 7 },
  { x0: 484, x1: 592, top: 89, base: 158, haze: 1, seed: 8 },
  { x0: 602, x1: 684, top: 97, base: 140, haze: 2, seed: 9 },
  { x0: 520, x1: 552, top: 105, base: 117, haze: 3, seed: 10 },
  { x0: 332, x1: 352, top: 106, base: 114, haze: 3, seed: 11 },
];
/** a scatter of small mesas far off along the horizon */
const HORIZON_MESAS: Mesa[] = (() => {
  const r = rng(201);
  const out: Mesa[] = [];
  for (let i = 0; i < 14; i++) {
    const x = r() * 640, w = 8 + r() * 22;
    out.push({ x0: x - w / 2, x1: x + w / 2, top: VY - 4 + r() * 6, base: VY + 2 + r() * 2.5, haze: 3, seed: 20 + i });
  }
  return out;
})();

/** Where a mesa's cliff stands at row y: its left and right edge (the foot flares a little, buttresses jut). */
function mesaEdges(m: Mesa, y: number): [number, number] {
  const d = Math.max(0, y - m.top);
  const flare = Math.pow(d / 70, 1.8) * (m.x1 - m.x0) * 0.06;
  const k = Math.min(1, d / 8);
  const jl = (n1(y, 5, 60 + m.seed) - 0.5) * 2 + (n1(y, 19, 61 + m.seed) - 0.5) * 3.4;
  const jr = (n1(y, 5, 62 + m.seed) - 0.5) * 2 + (n1(y, 19, 63 + m.seed) - 0.5) * 3.4;
  return [m.x0 - flare + jl * k, m.x1 + flare + jr * k];
}

/** A mesa's top edge at x: level, a little ragged, the corners rounded off by the snow. */
function mesaTop(m: Mesa, x: number): number {
  const e = Math.min(x - m.x0, m.x1 - x);
  return m.top + (n1(x, 9, 70 + m.seed) - 0.5) * 1.3 + (e < 3 ? (3 - e) * 0.6 : 0);
}

/**
 * One mesa: its cliff fluted into buttresses and banded in strata, glowing on
 * the faces toward the sun (its left flank brightest), violet on the right;
 * snow on its top in a cornice with a shadow beneath it and a few icicles,
 * snow along its ledges and down its gullies; its foot sinking into the sea
 * of cloud (a billow nearer than the mesa hides it); the haze of the distance
 * over all of it. A mesa below our eyes shows its snowy top too.
 */
function mesa(b: Bitmap, m: Mesa) {
  const w = m.x1 - m.x0;
  const R = ROCK_H[m.haze], S = SNOW_H[m.haze];
  const Zm = mesaZ(m);
  const below = m.top > VY;
  // a top seen from above: a strip of snow, deeper the further below our eyes it lies
  const strip = below ? 0.6 + (m.top - VY) * 0.3 : 0;
  // the ledges where snow lies along the face
  const ledges = [11, 29].map((d, i) => d + hash2(m.seed, i, 75) * 6);
  for (let y = Math.max(0, Math.floor(m.top - strip - 1)); y < 200; y++) {
    const [xl, xr] = mesaEdges(m, Math.max(m.top, y));
    let any = false;
    for (let x = Math.max(0, Math.floor(xl)); x <= Math.min(639, Math.ceil(xr)); x++) {
      if (x + 0.5 < xl || x + 0.5 > xr) continue;
      // a billow nearer than the mesa hides its foot
      if (seaZ[y * 640 + x] < Zm) continue;
      any = true;
      const top = mesaTop(m, x);
      if (y < top - strip - 0.3) continue;
      let c: RGBA;
      if (y < top) {
        // its top seen from above: snow in long drifts, lit toward the sun
        const v = 6.6 + (vnoise(x, y * 4, 9, 80 + m.seed) - 0.5) * 1.4 - ((x - m.x0) / w) * 1.4 + (y > top - 1.2 ? 1 : 0);
        c = rampDither(S, clamp(v, 0, S.length - 1), x, y);
        b.set(x, y, c);
        continue;
      }
      const depth = y - top;
      // across the face: the left flank faces the sun, the middle faces us, the right flank looks away
      const fromL = x + 0.5 - xl, fromR = xr - x - 0.5;
      const edge = Math.min(9, w * 0.2);
      let nx = fromL < edge ? -Math.pow(1 - fromL / edge, 0.8) : fromR < edge ? Math.pow(1 - fromR / edge, 0.8) : 0;
      // broad buttresses, and the fine fluting the rains cut into them
      const facet = Math.sin(x * 0.17 + n1(y, 30, 90 + m.seed) * 2.2 + m.seed * 1.7);
      const flute = Math.sin(x * 0.72 + n1(y, 9, 91 + m.seed) * 2.4 + m.seed);
      nx = clamp(nx + facet * 0.36 + flute * 0.16, -1, 1);
      const lit = sunOn(nx, 0.05, Math.sqrt(1 - nx * nx));
      // strata: soft bands of rock down the face
      const band = n1(depth + (n1(x, 31, 92 + m.seed) - 0.5) * 3, 5.5, 93 + m.seed);
      let v = 2.4 + lit * 6.4 + (band - 0.5) * 1.6 + (vnoise(x, y, 3, 94 + m.seed) - 0.5) * 0.8;
      // a crack down the face now and then
      if (hash2(x, 0, 95 + m.seed) > 0.95 && depth > 6 && depth < 18 + hash2(x, 1, 95 + m.seed) * 30) v -= 1.6;
      // the snow cap along the top, thick on the near mesas; the cornice's shadow beneath it, a few icicles
      const cap = (m.haze === 0 ? 3 : m.haze === 1 ? 2.2 : 1.4) + n1(x, 7, 96 + m.seed) * 1.6;
      const ice = hash2(x, 0, 97 + m.seed) > 0.96 && depth < cap + 1 + hash2(x, 1, 97 + m.seed) * 3.5 && m.haze < 2;
      // snow along the ledges (broken, more on the lit faces) and down the gullies of the fluting
      const onLedge = ledges.some((ld) => Math.abs(depth - ld - (n1(x, 13, 98 + m.seed) - 0.5) * 3) < 0.6) && vnoise(x, depth * 3, 6, 99 + m.seed) > 0.62 - lit * 0.25 && lit > 0.2;
      const gully = flute < -0.62 && depth < cap + 2 + n1(x, 3, 100 + m.seed) * 18 * (1 - m.haze * 0.2) && dith(x, y, 1.3 - depth / 30);
      if (depth < cap) {
        const sv = 4.4 + lit * 3.6 + (depth < 1 ? 1.4 : 0) - (depth > cap - 1 ? 1.2 : 0);
        c = rampDither(S, clamp(sv, 0, S.length - 1), x, y);
      } else if (ice) {
        c = S[Math.round(clamp(2 + lit * 3, 0, S.length - 1))];
      } else if (onLedge || gully) {
        c = rampDither(S, clamp(2 + lit * 4 - (gully ? 0.6 : 0.8), 0, S.length - 1), x, y);
      } else {
        if (depth < cap + 2) v -= 1.8;
        c = rampDither(R, clamp(v, 0, R.length - 1), x, y);
      }
      b.set(x, y, c);
    }
    if (!any && y > m.top + 4) break;
  }
}

// ---------------------------------------------------------------------------
// The castle on the left mesa and its huge chimney
// ---------------------------------------------------------------------------

/** the chimney: its middle, its foot, its mouth (where the purple plume comes out), its width at the foot */
export const CHIMNEY = { x: 238, foot: 86, mouth: 34, w: 16 };

/**
 * The castle on the left mesa, far enough off to be drawn in a few pixels a
 * stone: a curtain wall along the cliff's top with merlons, round towers at
 * its corners, a square keep with a steep roof, a long hall; slate roofs
 * under snow; windows lit with candles; dark stone lit warm on the sun's
 * side. Its huge chimney rises over all of it from the castle's east end: a
 * massive stack on buttresses, bound with iron bands, tapering, soot down its
 * lee, a flared crown with violet glowing in its mouth.
 */
function castle(b: Bitmap) {
  const base = CASTLE_MESA.top;
  const lit = (x: number, x0: number, x1: number) => 1 - (x - x0) / Math.max(1, x1 - x0);
  // a block of wall: lit on its left, darker to the right, courses of stone
  const block = (x0: number, x1: number, y0: number, y1: number, seed: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const v = 2.6 + lit(x, x0, x1) * 2.4 - (x === x1 ? 1 : 0) + (x === x0 ? 1.6 : 0) + ((y + (x >> 2)) % 3 === 0 ? -0.5 : 0) + (hash2(x, y, seed) - 0.5) * 0.7;
      b.set(x, y, rampDither(CASTLE, clamp(v, 0, CASTLE.length - 1), x, y));
    }
  };
  const merlons = (x0: number, x1: number, y: number) => {
    for (let x = x0; x <= x1; x++) if ((x - x0) % 3 !== 2) b.set(x, y - 1, (x - x0) % 3 === 0 ? CASTLE[6] : CASTLE[4]);
    for (let x = x0; x <= x1; x++) if (hash2(x, y, 165) > 0.25) b.set(x, y - ((x - x0) % 3 !== 2 ? 2 : 1), SNOW[x < (x0 + x1) / 2 ? 7 : 5]);
  };
  // a steep roof of slate under snow: a triangle over [x0, x1] rising h px, its sunward slope white
  const roof = (x0: number, x1: number, y: number, h: number, seed: number) => {
    const cx = (x0 + x1) / 2;
    for (let yy = y - h; yy < y; yy++) {
      const k = (yy - (y - h)) / h;
      const half = ((x1 - x0) / 2 + 1) * k;
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        const u = (x + 0.5 - cx) / Math.max(0.5, half);
        const snow = u < 0.1 || hash2(x, yy, seed) > 0.62 || yy === y - 1;
        b.set(x, yy, snow ? SNOW[u < -0.3 ? 8 : u < 0.2 ? 6 : 4] : CASTLE[u > 0.5 ? 1 : 2]);
      }
    }
    b.set(Math.round(cx), y - h - 1, CASTLE[5]);
  };
  // a round tower: a cylinder lit on its left, its cone of slate under snow
  const tower = (cx: number, r: number, y0: number, y1: number, rh: number) => {
    for (let y = y0; y <= y1; y++) for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) {
      const u = (x + 0.5 - cx) / r;
      if (Math.abs(u) > 1) continue;
      const v = 3.4 - u * 2.8 + (y % 4 === 0 ? -0.5 : 0) + (hash2(x, y, 171) - 0.5) * 0.6;
      b.set(x, y, rampDither(CASTLE, clamp(v, 0, CASTLE.length - 1), x, y));
    }
    // a ring of corbels under the roof
    for (let x = Math.round(cx - r - 1); x <= Math.round(cx + r + 1); x++) b.set(x, y0, CASTLE[x < cx ? 6 : 3]);
    roof(Math.round(cx - r - 1), Math.round(cx + r + 1), y0, rh, 172 + cx);
  };
  // the curtain wall along the cliff's top, a gatehouse in it
  block(126, 258, base - 9, base - 1, 161);
  merlons(126, 258, base - 9);
  block(150, 160, base - 15, base - 1, 166);
  merlons(150, 160, base - 15);
  for (let y = base - 7; y < base; y++) for (let x = 153; x <= 157; x++) if (y > base - 6 || (x > 153 && x < 157)) b.set(x, y, CASTLE[0]);
  // the great hall behind it: a long roof under snow, a row of lit windows
  block(164, 226, base - 19, base - 9, 167);
  for (let yy = base - 27; yy < base - 19; yy++) {
    const k = (yy - (base - 27)) / 8;
    for (let x = 164 - Math.round(k * 2); x <= 226 + Math.round(k * 2); x++) {
      const ridge = yy === base - 27;
      const snow = ridge || x < 170 || hash2(x, yy, 163) > 0.5 || yy > base - 21;
      b.set(x, yy, snow ? SNOW[ridge ? 8 : x < 196 ? 7 : 5] : CASTLE[2]);
    }
  }
  // the keep: tall and square over the hall's west end, a steep roof
  block(170, 192, base - 42, base - 19, 162);
  merlons(170, 192, base - 42);
  roof(172, 190, base - 44, 12, 164);
  // the towers at the wall's ends, one at the hall's corner
  tower(128, 6, base - 24, base - 1, 11);
  tower(258, 6, base - 20, base - 1, 10);
  tower(205, 4, base - 32, base - 19, 9);
  // the windows, lit with candles (a pulse prop over them makes them breathe)
  for (const [x, y] of WINDOWS) {
    b.set(x, y, WINDOW[2]);
    b.set(x, y + 1, WINDOW[1]);
  }
  // the chimney: a massive stack on two buttresses, bound in iron, tapering, soot down its lee, a flared crown
  const { x: cx, foot, mouth, w } = CHIMNEY;
  for (let y = foot - 14; y <= foot; y++) {
    const k = (y - (foot - 14)) / 14;
    for (const side of [-1, 1]) {
      const x0 = cx + side * (w / 2), x1 = x0 + side * (2 + k * 4);
      for (let x = Math.round(Math.min(x0, x1)); x <= Math.round(Math.max(x0, x1)); x++) b.set(x, y, side < 0 ? rampDither(CASTLE, 5.4 - k, x, y) : CASTLE[2]);
    }
  }
  for (let y = mouth; y <= foot; y++) {
    const k = (y - mouth) / (foot - mouth);
    const r = (w / 2) * (0.72 + 0.28 * k);
    for (let x = Math.round(cx - r - 0.5); x <= Math.round(cx + r + 0.5); x++) {
      const u = (x + 0.5 - cx) / r;
      if (Math.abs(u) > 1.05) continue;
      const hoop = (y - mouth) % 11 === 5;
      let v = 3.4 - u * 2.8 + (Math.abs(u) > 0.85 ? -0.6 : 0) + (hash2(x, y, 181) - 0.5) * 0.5 + ((y + (x >> 1)) % 4 === 0 ? -0.4 : 0);
      // soot streaks down its lee, from the crown
      if (u > 0.1 && vnoise(x * 3, y * 0.25, 1, 182) > 0.42 + k * 0.4) v -= 1.6;
      b.set(x, y, hoop ? (u < -0.3 ? IRON[4] : u < 0.3 ? IRON[3] : IRON[1]) : rampDither(CASTLE, clamp(v, 0, CASTLE.length - 1), x, y));
    }
  }
  // the crown: flared over two rows, its rim lit, the mouth glowing violet
  for (let dy = 0; dy < 3; dy++) {
    const half = w / 2 * 0.72 + 2 - dy * 0.5;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = (x - cx) / half;
      b.set(x, mouth - dy, dy === 2 ? (Math.abs(u) < 0.7 ? PLUME[9] : CASTLE[6]) : CASTLE[u < -0.3 ? 8 : u < 0.3 ? 5 : 2]);
    }
  }
  // snow on the walk behind the merlons and in the chimney's lee corner
  for (let x = 206; x < 256; x++) if (hash2(x, 0, 183) > 0.3) b.set(x, base - 10, SNOW[x < 232 ? 7 : 5]);
}

/** the castle's lit windows (screen): two rows in the keep, a row in the hall, slits in the towers */
export const WINDOWS: [number, number][] = [
  [174, 52], [181, 52], [188, 52], [174, 59], [181, 59], [188, 59], [181, 65],
  [126, 70], [128, 76], [258, 74], [205, 60], [204, 64],
  [198, 72], [206, 72], [214, 72], [222, 72], [168, 72],
];

// ---------------------------------------------------------------------------
// The cables between the mesas, hung with candles
// ---------------------------------------------------------------------------

/** A cable: from a mesa's edge to another's, its sag, every how many px a candle hangs from it, how far off it is (0 near .. 2 far). */
interface Cable {
  a: [number, number];
  b: [number, number];
  sag: number;
  every: number;
  far: 0 | 1 | 2;
}

/**
 * The cables that join the mesas, all of them: from the castle's mesa out to
 * its neighbours, from mesa to mesa across the gulfs, the far ones thin and
 * faint, hung with candles in lanterns at even steps. Two more run out from
 * our own rim (back props, near enough to sway).
 */
export const CABLES: Cable[] = [
  { a: [270, 92], b: [356, 98], sag: 16, every: 7, far: 0 },
  { a: [270, 100], b: [298, 113], sag: 4, every: 6, far: 1 },
  { a: [348, 114], b: [356, 104], sag: 2, every: 5, far: 1 },
  { a: [436, 99], b: [484, 93], sag: 7, every: 6, far: 1 },
  { a: [114, 94], b: [98, 104], sag: 3, every: 5, far: 1 },
  { a: [62, 106], b: [54, 101], sag: 1.5, every: 4, far: 2 },
  { a: [326, 106], b: [332, 107], sag: 1, every: 3, far: 2 },
  { a: [436, 104], b: [440, 105], sag: 1, every: 3, far: 2 },
  { a: [478, 106], b: [520, 107], sag: 3, every: 5, far: 2 },
  { a: [592, 94], b: [602, 99], sag: 2, every: 4, far: 1 },
  { a: [552, 107], b: [602, 101], sag: 3, every: 5, far: 2 },
  { a: [-4, 104], b: [-18, 101], sag: 1, every: 4, far: 2 },
];

/** The points along a sagging cable, a pixel apart. */
export function cablePts(c: { a: [number, number]; b: [number, number]; sag: number }): [number, number][] {
  const [ax, ay] = c.a, [bx, by] = c.b;
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay)));
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([ax + (bx - ax) * t, ay + (by - ay) * t + Math.sin(t * Math.PI) * c.sag]);
  }
  return out;
}

/** Where the candles hang along a cable (their flames, screen). */
export function candleSpots(c: Cable): [number, number][] {
  const pts = cablePts(c);
  const out: [number, number][] = [];
  for (let i = Math.round(c.every / 2); i < pts.length - 1; i += c.every) out.push([Math.round(pts[i][0]), Math.round(pts[i][1]) + (c.far === 0 ? 2 : 1)]);
  return out;
}

function cables(b: Bitmap) {
  for (const c of CABLES) {
    const col = c.far === 0 ? ROPE[1] : ROPE_FAR[c.far === 1 ? 0 : 1];
    for (const [x, y] of cablePts(c)) {
      const X = Math.round(x), Y = Math.round(y);
      if (X >= 0 && X < 640) b.set(X, Y, col);
    }
    // the lanterns: a dark speck under the cable and the candle's light (the far layer's frames make it flicker)
    for (const [x, y] of candleSpots(c)) {
      if (x < 0 || x > 639) continue;
      if (c.far === 0) b.set(x, y - 1, IRON[2]);
      b.set(x, y, WINDOW[c.far === 2 ? 1 : 2]);
    }
  }
}

// ---------------------------------------------------------------------------
// The storm from the upper right
// ---------------------------------------------------------------------------

/** Where the storm's front runs at row y (its leftmost billows). */
const stormFront = (y: number) => {
  const t = clamp((y + 12) / 114, 0, 1);
  return 440 + 84 * Math.pow(t, 1.5) - 34 * Math.pow(1 - t, 4);
};
/** A billow of the storm: centre, radius, how far forward it bulges, whether it is one of the front's. */
interface Puff {
  x: number;
  y: number;
  r: number;
  z: number;
  front: boolean;
}
/** The billows of the storm: the body behind, great lobes along the front, small ones heaped on them. */
const STORM_PUFFS: Puff[] = (() => {
  const r = rng(301);
  const out: Puff[] = [];
  for (let i = 0; i < 34; i++) {
    const y = -16 + r() * 112;
    out.push({ x: stormFront(y) + 34 + r() * 230, y, r: 24 + r() * 20, z: -40 - r() * 20, front: false });
  }
  for (let i = 0; i < 16; i++) {
    const y = -14 + (i / 15) * 108 + (r() - 0.5) * 6, rr = 12 + r() * 12;
    out.push({ x: stormFront(y) + rr * 0.85, y, r: rr, z: -r() * 10, front: true });
  }
  for (let i = 0; i < 12; i++) {
    const y = -10 + r() * 100, rr = 6 + r() * 5;
    out.push({ x: stormFront(y) + rr * 0.6 + (r() - 0.2) * 10, y, r: rr, z: 4 + r() * 8, front: true });
  }
  return out;
})();
/** The storm's surface at a pixel: the billow seen there (the one bulging nearest) and how near it bulges. */
function stormAt(x: number, y: number): { p: Puff; h: number; dx: number; dy: number } | null {
  let best: Puff | null = null, bh = -Infinity, bx = 0, by = 0;
  for (const p of STORM_PUFFS) {
    const dx = (x + 0.5 - p.x) / p.r, dy = ((y + 0.5 - p.y) * 1.12) / p.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= 1) continue;
    const h = p.z + p.r * Math.sqrt(1 - d2);
    if (h > bh) {
      bh = h;
      best = p;
      bx = dx;
      by = dy;
    }
  }
  return best ? { p: best, h: bh, dx: bx, dy: by } : null;
}
/** the storm's body where no billow bulges */
const BODY: Puff = { x: 0, y: 0, r: 1, z: -80, front: false };
/** the storm's base: where it ends above the veils */
const stormBase = (x: number) => 99 + (n1(x, 23, 311) - 0.5) * 5 - smooth(520, 640, x) * 3;

/**
 * The storm: a wall of cloud from the upper right, its billows heaped along
 * the front, each lobe bulging over the one behind with a fold of shade
 * between them, the faces toward the low sun lit rose and gold, the body
 * behind the front in its own slate dark, darkest at its belly; a lighter roll
 * of shelf cloud along its base.
 */
function storm(b: Bitmap) {
  for (let y = 0; y < 112; y++) {
    const fx = stormFront(y);
    for (let x = Math.max(0, Math.floor(fx - 30)); x < 640; x++) {
      const sb = stormBase(x);
      if (y > sb) continue;
      const found = stormAt(x, y);
      // behind the front the storm is solid even where no billow bulges
      if (!found && x < fx + 24) continue;
      const o = found ?? { p: BODY, h: -80, dx: 0, dy: 0 };
      const d2 = o.dx * o.dx + o.dy * o.dy;
      const nz = Math.sqrt(Math.max(0, 1 - d2));
      // the ragged rim where a front lobe meets the sky
      if (o.p.front && d2 > 0.86 && !stormAt(x - 2, y) && !dith(x, y, (1 - d2) / 0.14)) continue;
      const lit = sunOn(o.dx, o.dy, nz);
      const into = clamp((x - fx) / 110, 0, 1);
      const belly = smooth(54, 100, y);
      let v = (o.p.front ? 4 : 3) - into * 1.8 - belly * 1.5 + lit * (o.p.front ? 3 : 1.4) * (1 - into * 0.5) + (vnoise(x, y, 5, 312) - 0.5) * 0.9;
      // the sun's rose on the faces of the front toward it
      if (o.p.front && lit > 0.45) v += (lit - 0.45) * 11 * (1 - into);
      // a fold of shade where this billow passes behind a nearer one
      for (const [ax, ay] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const n = stormAt(x + ax, y + ay);
        if (n && n.p !== o.p && n.h > o.h + 1.5) {
          v -= 1.1;
          break;
        }
      }
      // the shelf cloud: a lighter roll along the base
      if (y > sb - 7) v += 1.3 * (1 - (sb - y) / 7) - (y > sb - 1.5 ? 1 : 0);
      b.set(x, y, rampDither(STORM, clamp(v, 0, STORM.length - 1), x, y));
    }
  }
}

/**
 * Veils of snow trailing beneath the storm, slanting down to the left with the
 * wind, over the far mesas and the sea of cloud: thicker toward the right
 * corner, in bands that let the mesas show through.
 */
function veils(b: Bitmap) {
  for (let y = 86; y < 164; y++) {
    for (let x = 430; x < 640; x++) {
      const sb = stormBase(x);
      if (y < sb - 1) continue;
      // the slant: the streaks lean left as they fall
      const s = x + (y - 100) * 0.62;
      const band = vnoise(s, 0, 30, 321) * 0.65 + vnoise(s, 0, 11, 322) * 0.35;
      const dens = smooth(468, 640, s) * (0.25 + band * 0.75) * (1 - smooth(124, 164, y) * 0.7) * smooth(sb - 1, sb + 4, y);
      const streak = Math.sin(s * 1.3 + vnoise(s, y, 7, 323) * 4) > 0.55 ? 0.18 : 0;
      if (!dith(x, y, clamp(dens + streak * dens * 2, 0, 1))) continue;
      b.set(x, y, rampDither(VEIL, clamp(1.6 + band * 2.4 - stormK(x, y) * 0.5 + (y - sb) * 0.02, 0, VEIL.length - 1), x, y));
    }
  }
}

// ---------------------------------------------------------------------------
// Our mesa's top
// ---------------------------------------------------------------------------

/**
 * The snow of our mesa's top at a screen pixel: drifts in long low swells
 * lit on their flanks toward the sun, a fine combing by the wind here and
 * there, cooler and darker toward the right under the storm, paler with
 * distance; a mid value, so the champions read on it.
 */
function snowColor(x: number, y: number): RGBA {
  const [u, v] = world(x, y);
  const near = clamp((y - VY) / (360 - VY), 0, 1);
  // drifts: a height field in world space; their flanks toward the sun lit
  const hf = (uu: number, vv: number) => vnoise(uu, vv * 2.4, 90, 401) * 0.65 + vnoise(uu, vv * 2.4, 34, 402) * 0.35;
  const slope = (hf(u - 3, v) - hf(u + 3, v)) * 7 + (hf(u, v - 3) - hf(u, v + 3)) * 2.5;
  // the wind's combing: faint ridges running away from us, only in patches
  const patch = vnoise(u, v * 2, 120, 405);
  const rip = patch > 0.7 ? Math.sin(u * 0.42 + vnoise(u, v * 3, 40, 403) * 5) : 0;
  let val = 6.4 + slope * 1.6 + (rip > 0.9 ? 0.4 : 0) * Math.min(1, near * 2) + (vnoise(u, v * 2, 14, 406) - 0.5) * 0.6 + (hash2(x, y, 404) - 0.5) * 0.4;
  // under the storm: cooler, darker; the long shadows
  val -= stormK(x, y) * 1.7 + shadowK(x, y) * 2.2;
  // paler toward the rim, in the haze
  val += (1 - smooth(VY + 50, VY + 120, y)) * 1.1;
  return rampDither(SNOWF, clamp(val, 0, SNOWF.length - 1), x, y);
}

/**
 * Our mesa's top from its rim to the arena: the far snow in perspective; the
 * rim itself a cornice of snow lit along its lip, rocks breaking through it.
 */
function plateau(b: Bitmap) {
  for (let x = 0; x < 640; x++) {
    const r = rimY(x);
    for (let y = Math.floor(r); y < 200; y++) {
      if (y + 0.5 < r) continue;
      let c = snowColor(x, y);
      // the lip of the cornice: lit, a soft fold of shadow behind it
      if (y - r < 1) c = SNOWF[11 - Math.round(stormK(x, y) * 3)];
      else if (y - r < 2.5) c = SNOWF[6 - Math.round(stormK(x, y) * 2)];
      b.set(x, y, c);
    }
  }
  // rocks breaking through the rim
  for (const [rx, rw] of [[30, 7], [176, 5], [404, 6], [520, 9], [472, 4], [616, 6]] as [number, number][]) {
    const ry = Math.round(rimY(rx));
    for (let x = rx - rw; x <= rx + rw; x++) {
      const k = 1 - Math.abs(x - rx) / (rw + 0.5);
      const h = Math.round(k * (rw * 0.5) + n1(x, 3, 410) * 1.2);
      for (let y = ry - h; y <= ry + 1; y++) {
        const top = y === ry - h;
        const v = 4.4 + ((rx - x) / rw) * 2.4 + (top ? 1.6 : 0) - stormK(x, y) * 1.6;
        b.set(x, y, top && x < rx ? SNOW[6] : rampDither(STONE, clamp(v, 0, STONE.length - 1), x, y));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Tiles: the snow under the arena (the floor prop paints over it in perspective)
// ---------------------------------------------------------------------------

function snowTile(o: { stone?: number } = {}): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const inner = clamp((Math.min(x, y, TILE - 1 - x, TILE - 1 - y) - 1) / 5, 0, 1);
        const v = 6.2 + (tnoise(x, y, 8, 3) - 0.5) * 1.2 + (tnoise(x, y, 4, 4) - 0.5) * 0.6 + (hash2(x, y, 5) - 0.5) * 0.5;
        const st = (o.stone ?? 0) * inner * (tnoise(x, y, 16, seed) - 0.45) * 2.4;
        if (st > 0 && dith(x, y, Math.min(1, st))) b.set(x, y, rampDither(PAVE, 4 + (tnoise(x, y, 4, 6) - 0.5), x, y));
        else b.set(x, y, rampDither(SNOWF, v, x, y));
      }
    }
  };
}

const P: Record<string, Painter> = {
  snow_a: snowTile(),
  snow_b: snowTile({ stone: 0.4 }),
  snow_c: snowTile(),
  snow_d: snowTile({ stone: 0.8 }),
};

// ---------------------------------------------------------------------------
// The arena's size
// ---------------------------------------------------------------------------

const FLOOR = { w: 640, h: 168 };

// ---------------------------------------------------------------------------
// The arbiter: a seated colossus drawn with the champion renderer
// ---------------------------------------------------------------------------

const v2 = (x: number, y: number): V => ({ x, y });
// --- weathered bronze gone green, the bronze worn bright where hands have touched it, the blade, the plinth's granite, snow
const M_VERD = mat('verdigris', 'matte', ['#0e1616', '#1a2a27', '#273e38', '#37574c', '#58785f', '#a49c72']);
const M_BRONZE = mat('bronze', 'metal', ['#1c0e08', '#3a2010', '#663e1a', '#94642a', '#cc9844', '#ffe0a0']);
const M_STEEL = mat('blade', 'metal', ['#101218', '#22262f', '#383e4c', '#565e6e', '#8a92a2', '#ffe6cc']);
const M_GRAN = mat('granite', 'matte', ['#130f17', '#211b27', '#2f2735', '#3f3543', '#554854', '#6e5d68']);
const M_SNOWS = mat('snow', 'matte', ['#4a4670', '#6a6496', '#8e86b0', '#b8a8c4', '#e8d0cc', '#fff4e8']);

/** The statue's frame: its size, its middle; the plinth's steps (front face top, bottom; half width). */
const ST = { w: 160, h: 156, cx: 82 };
const STEPS: [number, number, number][] = [
  [124, 134, 48],
  [138, 155, 62],
];

/** A robe's folds: curved grooves cut across the bronze. */
const folds = (k: number, a: number) => (_h: Hit, x: number, y: number) => (Math.abs((((x * a + y + Math.sin(x * 0.21) * 3) % k) + k) % k) < 0.9 ? -1 : 0);
/** A robe's folds hanging in arcs from above (centred ox from the middle, at y0), a groove every k px. */
const drape = (ox: number, y0: number, k: number, sy = 1.5) => (_h: Hit, x: number, y: number) => (Math.hypot(x + 0.5 - (ST.cx + ox), (y + 0.5 - y0) * sy) % k < 0.9 ? -1 : 0);
/** Courses of dressed stone: a joint along the middle of a step's face, upright joints staggered. */
const courses = (top: number, bot: number) => (_h: Hit, x: number, y: number) => {
  const mid = Math.round((top + bot) / 2);
  if (y === mid) return -1;
  const off = y < mid ? 0 : 9;
  return (x + off) % 18 === 0 ? -1 : 0;
};
/** Snail-shell curls over the head: a grid of small bumps. */
const curls = (_h: Hit, x: number, y: number) => ((x + (y % 2)) % 2 === 0 && y % 2 === 0 ? 1 : (x + y) % 2 === 0 ? 0 : -1);

/**
 * The arbiter: a colossus of weathered bronze seated cross-legged on a lotus
 * throne, on a plinth of two granite steps. His face is calm, the eyes
 * closed, the earlobes long, the head covered in curls with a knot on its
 * crown, a round nimbus behind it; a robe falls over his shoulders in folds.
 * His right hand rests on his knee holding a great sword upright, its blade
 * rising past his head; his left is raised before his chest, palm out, the
 * arbiter's sign to halt. The hands, the hilt and his soles are worn to bright
 * bronze; the blade is dark steel. Snow lies on his head, shoulders, forearms
 * and lap, on the guard, the petals and the steps.
 */
function arbiter(): Bitmap {
  const { w, h, cx } = ST;
  const f = new Frame(w, h);
  const P = (x: number, y: number) => v2(cx + x, y);
  const SX = -40;
  // the nimbus behind the head: a disc with rings and a flame-shaped point
  const rings = (hh: Hit) => {
    const r = Math.hypot(hh.nx, hh.ny);
    return Math.abs(r - 0.6) < 0.05 || Math.abs(r - 0.86) < 0.04 ? 1 : 0;
  };
  f.add(new Ellipse({ mat: M_VERD, z: 0, group: 'nimbus', shade: -1, tex: rings }, P(0, 36), 24, 24, 0, 0.82));
  f.add(new Poly({ mat: M_VERD, z: 0.1, group: 'nimbus', shade: -1 }, [P(-5, 14), P(0, 5), P(5, 14)], { kind: 'bevel', w: 2 }));
  // the plinth: two steps of granite, each a lit top and a front face
  STEPS.forEach(([t, bt, hw], i) => {
    f.add(new Poly({ mat: M_GRAN, z: 1 + i * 0.1, group: `step${i}`, tex: courses(t, bt) }, [P(-hw, t), P(hw, t), P(hw, bt), P(-hw, bt)], { kind: 'bevel', w: 2, n: [0, 0.05, 1], k: 1 }));
    f.add(new Poly({ mat: M_GRAN, z: 1 + i * 0.1, group: `step${i}` }, [P(-hw + 2, t - 3), P(hw - 2, t - 3), P(hw, t), P(-hw, t)], { kind: 'flat', n: [0, -0.9, 0.45] }));
  });
  // the lotus throne: a drum, petals turned down round its foot and up round its top
  f.add(new Poly({ mat: M_VERD, z: 2, group: 'drum' }, [P(-44, 110), P(44, 110), P(42, 121), P(-42, 121)], { kind: 'cyl', a: P(0, 110), b: P(0, 121), r: 44, bevel: 1 }));
  for (let k = -4; k <= 4; k++) {
    const x = k * 9.6, sc = 1 - Math.abs(k) * 0.06;
    f.add(new Poly({ mat: M_VERD, z: 2.2 + (4 - Math.abs(k)) * 0.01, group: `lpd${k}`, line: 'soft' }, [P(x - 5 * sc, 115), P(x + 5 * sc, 115), P(x + 3 * sc, 120), P(x, 122.5), P(x - 3 * sc, 120)], { kind: 'bevel', w: 2 }));
  }
  for (let k = -5; k <= 5; k++) {
    const x = k * 8.8, sc = 1 - Math.abs(k) * 0.05, tip = 98 + Math.abs(k) * 1.2;
    f.add(new Poly({ mat: M_VERD, z: 3 + (5 - Math.abs(k)) * 0.01, group: `lpu${k}`, line: 'soft', tex: (hh) => (Math.abs(hh.v) < 0.12 ? -1 : 0) }, [P(x - 5.4 * sc, 114), P(x - 4.6 * sc, 107), P(x - 2 * sc, tip + 3), P(x, tip), P(x + 2 * sc, tip + 3), P(x + 4.6 * sc, 107), P(x + 5.4 * sc, 114)], { kind: 'bevel', w: 2.4, k: 1.3 }));
  }
  // the crossed legs: a broad lap, the knees at its ends, the soles turned up on the thighs
  f.add(new Ellipse({ mat: M_VERD, z: 4, group: 'lap', tex: drape(0, 64, 6, 1.1) }, P(0, 99), 46, 11));
  f.add(new Ellipse({ mat: M_VERD, z: 4.1, group: 'kneeL' }, P(-40, 101), 10, 8.5));
  f.add(new Ellipse({ mat: M_VERD, z: 4.1, group: 'kneeR' }, P(40, 101), 10, 8.5));
  f.add(new Ellipse({ mat: M_BRONZE, z: 4.3, group: 'soleL' }, P(-15, 95), 6, 3, -0.15));
  f.add(new Ellipse({ mat: M_BRONZE, z: 4.3, group: 'soleR' }, P(16, 95), 6, 3, 0.15));
  // the body under the robe: sloping shoulders, the chest, the belly; the robe's hem over the lap
  f.add(new Poly({ mat: M_VERD, z: 5, group: 'torso', tex: folds(7, 0.72) }, [P(-21, 93), P(21, 93), P(24, 74), P(26, 60), P(21, 52), P(9, 48), P(-9, 48), P(-21, 52), P(-26, 60), P(-24, 74)], { kind: 'dome', c: P(0, 70), r: 30, ry: 28, bevel: 2 }));
  f.add(new Ellipse({ mat: M_VERD, z: 5.2, group: 'shoulderL' }, P(-21, 57), 8, 7));
  f.add(new Ellipse({ mat: M_VERD, z: 5.2, group: 'shoulderR' }, P(21, 57), 8, 7));
  f.add(new Poly({ mat: M_VERD, z: 5.3, group: 'neckline', shade: 1, line: 'soft' }, [P(-11, 50), P(-2, 63), P(0, 61), P(2, 63), P(11, 50), P(6, 50), P(0, 57), P(-6, 50)], { kind: 'bevel', w: 1 }));
  // the neck and its folds, the long ears, the head, its curls and the knot on its crown
  f.add(new Capsule({ mat: M_VERD, z: 6, group: 'neck', tex: (hh) => ((hh.u > 0.3 && hh.u < 0.36) || (hh.u > 0.62 && hh.u < 0.68) ? -1 : 0) }, P(0, 45), P(0, 52), 6, 6.6));
  f.add(new Capsule({ mat: M_VERD, z: 6.2, group: 'earL' }, P(-11, 33), P(-11.5, 46), 2.6, 2));
  f.add(new Capsule({ mat: M_VERD, z: 6.2, group: 'earR' }, P(11, 33), P(11.5, 46), 2.6, 2));
  f.add(new Ellipse({ mat: M_VERD, z: 6.5, group: 'face' }, P(0, 37), 10, 11.5));
  f.add(new Ellipse({ mat: M_VERD, z: 6.7, group: 'hair', tex: curls, line: 'soft' }, P(0, 26.5), 10.8, 6.4));
  f.add(new Ellipse({ mat: M_VERD, z: 6.8, group: 'knot', tex: curls }, P(0, 21), 5.4, 4.4));
  // the face: closed eyes under arched brows, the mark between them, the nose, the small mouth
  const face: { x: number; y: number; c: RGBA }[] = [];
  const dark = M_VERD.ramp[1], lip = M_VERD.ramp[2];
  for (const ex of [-4.5, 4.5]) {
    // the lids closed: a gentle arch, the lit lid under it
    for (const [dx, dy] of [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]]) face.push({ x: Math.round(cx + ex + dx), y: 37 + dy, c: dark });
    for (const dx of [-1, 0, 1]) face.push({ x: Math.round(cx + ex + dx), y: 38, c: M_VERD.ramp[ex < 0 ? 4 : 3] });
  }
  face.push({ x: cx, y: 34, c: M_BRONZE.ramp[4] });
  for (const y of [38, 39, 40, 41]) face.push({ x: cx + 1, y, c: M_VERD.ramp[2] });
  face.push({ x: cx, y: 42, c: M_VERD.ramp[2] }, { x: cx - 1, y: 42, c: M_VERD.ramp[4] });
  for (const dx of [-2, -1, 0, 1, 2]) face.push({ x: cx + dx, y: 45, c: dx === 0 ? dark : lip });
  f.add(new Pixels({ mat: M_VERD, z: 7, group: 'features' }, face));
  // the right arm: down to the knee, the hand gripping the sword's hilt there
  f.add(new Capsule({ mat: M_VERD, z: 6.9, group: 'armL', tex: folds(5, 0.2) }, P(-24, 58), P(-33, 80), 6.4, 5.8));
  f.add(new Capsule({ mat: M_VERD, z: 7.4, group: 'foreL' }, P(-33, 80), P(SX + 2, 92), 5.4, 4.6));
  // the sword, in front of the arm that holds it: upright, the pommel on his knee, the grip through his fist, the guard on top of it, the blade rising past his head
  f.add(new Ellipse({ mat: M_BRONZE, z: 8.15, group: 'pommel' }, P(SX, 100), 3.6, 3));
  f.add(new Capsule({ mat: M_BRONZE, z: 8.1, group: 'grip', tex: (_hh, _x, y) => (y % 2 === 0 ? -1 : 0) }, P(SX, 86), P(SX, 98), 2.2, 2.2));
  f.add(new Poly({ mat: M_STEEL, z: 8.2, group: 'blade', tex: (_hh, x) => (Math.abs(x + 0.5 - (cx + SX)) < 0.9 ? -1 : 0) }, [P(SX - 4.2, 84), P(SX - 4, 30), P(SX - 2.6, 14), P(SX, 7), P(SX + 2.6, 14), P(SX + 4, 30), P(SX + 4.2, 84)], { kind: 'bevel', w: 2.6, k: 1.4 }));
  f.add(new Poly({ mat: M_BRONZE, z: 8.4, group: 'guard' }, [P(SX - 16, 79), P(SX - 13, 81), P(SX + 13, 81), P(SX + 16, 79), P(SX + 17, 84), P(SX + 13, 86), P(SX - 13, 86), P(SX - 17, 84)], { kind: 'bevel', w: 1.8 }));
  // the fist round the grip: knuckles to the front, the thumb over them
  f.add(new Ellipse({ mat: M_BRONZE, z: 8.5, group: 'handL', tex: (hh, x) => (hh.nz > 0.5 && (x + 1) % 2 === 0 && hh.ny > -0.2 ? -1 : 0) }, P(SX + 1, 91.5), 5.6, 4.6));
  f.add(new Capsule({ mat: M_BRONZE, z: 8.6, group: 'thumbL', line: 'soft' }, P(SX - 3, 88.5), P(SX + 3, 88), 1.5, 1.3));
  // the left arm: the elbow at his side, the forearm up, the palm raised before his chest, fingers up
  f.add(new Capsule({ mat: M_VERD, z: 6.9, group: 'armR', tex: folds(5, -0.2) }, P(24, 58), P(30, 80), 6.4, 5.8));
  f.add(new Capsule({ mat: M_VERD, z: 7.4, group: 'foreR' }, P(30, 80), P(19, 69), 5.4, 4.4));
  f.add(new Ellipse({ mat: M_BRONZE, z: 7.6, group: 'palm' }, P(17, 65), 4.6, 5.4, -0.15));
  for (let k = 0; k < 4; k++) f.add(new Capsule({ mat: M_BRONZE, z: 7.7, group: `finger${k}`, line: 'soft' }, P(14 + k * 2.1, 61), P(14.2 + k * 2.2, 55.5 + Math.abs(k - 1.5) * 0.9), 1.05, 0.95));
  f.add(new Capsule({ mat: M_BRONZE, z: 7.65, group: 'thumb', line: 'soft' }, P(13, 66), P(10.5, 62.5), 1.4, 1.1));
  // the snow: on the crown, the curls, the shoulders, the forearms, the guard, the lap and the knees, the petals, the steps
  const snow = (x: number, y: number, rx: number, ry: number, z: number, g: string) => f.add(new Ellipse({ mat: M_SNOWS, z, group: g, line: 'none' }, P(x, y), rx, ry));
  snow(-1, 17.5, 4.2, 1.9, 6.9, 'snowKnot');
  snow(-3, 23.5, 7.6, 2.1, 6.85, 'snowHair');
  snow(-21, 50.5, 7.4, 2.4, 5.4, 'snowShL');
  snow(21, 51, 6.4, 2, 5.4, 'snowShR');
  snow(SX - 1, 80.6, 7, 1.2, 8.45, 'snowGuard');
  f.add(new Ribbon({ mat: M_SNOWS, z: 7.45, group: 'snowFore', line: 'none' }, [P(-30, 76), P(-35, 80.5), P(-39, 85.5)], [1.6, 1.4, 1.1]));
  f.add(new Poly({ mat: M_SNOWS, z: 4.4, group: 'snowLap', line: 'none' }, [P(-47, 99), P(-41, 92), P(-29, 89), P(-12, 88.5), P(12, 88.5), P(29, 89), P(41, 92), P(47, 99), P(39, 95), P(23, 92.5), P(-23, 92.5), P(-39, 95)], { kind: 'dome', c: P(0, 91), r: 47, ry: 6 }));
  for (let k = -5; k <= 5; k++) if (k !== 0) snow(k * 8.8 - 0.6, 98.5 + Math.abs(k) * 1.2, 1.6, 1, 3.1, `snowPetal${k}`);
  STEPS.forEach(([t, , hw], i) => {
    const pts: V[] = [P(-hw + 2, t - 2.6)];
    for (let x = -hw + 4; x < hw - 2; x += 5) pts.push(P(x, t - 3.4 - hash2(x, i, 191) * 1.6));
    pts.push(P(hw - 2, t - 2.6), P(hw, t - 0.4), P(-hw, t - 0.4));
    f.add(new Poly({ mat: M_SNOWS, z: 1.05 + i * 0.1, group: `snowStep${i}`, line: 'none' }, pts, { kind: 'flat', n: [-0.1, -0.85, 0.5] }));
  });
  return f.render();
}

// ---------------------------------------------------------------------------
// The candles on the plinth
// ---------------------------------------------------------------------------

/** Where the statue's frame stands on the screen: its top left corner (it is placed by its foot, at the screen's middle). */
const STATUE_AT = { x: 320, y: 190 };
const SF = { x: STATUE_AT.x - ST.w / 2, y: STATUE_AT.y - ST.h };

/** A candle: its foot (screen), its height and thickness, and its flicker (whole cycles a loop, and a phase). */
interface Candle {
  x: number;
  y: number;
  h: number;
  w: 1 | 2;
  rate: number;
  ph: number;
}

/** Candles in a row along a ledge: between x0 and x1 at row y, about `gap` px apart, of melted heights. */
function candleRow(x0: number, x1: number, y: number, gap: number, seed: number, skip: (x: number) => boolean = () => false): Candle[] {
  const r = rng(seed);
  const out: Candle[] = [];
  for (let x = x0 + r() * gap * 0.6; x < x1; x += gap * (0.6 + r() * 0.8)) {
    const cx = Math.round(x);
    if (skip(cx)) continue;
    out.push({ x: cx, y: y + (r() < 0.3 ? 1 : 0), h: 2 + Math.floor(r() * 5), w: r() < 0.4 ? 2 : 1, rate: 1 + Math.floor(r() * 3), ph: r() });
  }
  return out;
}

/** The candles on the plinth's two steps and in the snow at its foot (screen). */
const PLINTH_CANDLES: Candle[] = [
  ...candleRow(SF.x + ST.cx - 44, SF.x + ST.cx + 44, SF.y + STEPS[0][0] - 1, 7, 501),
  ...candleRow(SF.x + ST.cx - 58, SF.x + ST.cx + 58, SF.y + STEPS[1][0] - 1, 6, 502),
  ...candleRow(SF.x + ST.cx - 70, SF.x + ST.cx + 70, STATUE_AT.y - 1, 9, 503, (x) => Math.abs(x - (SF.x + ST.cx)) < 6),
];

/**
 * One candle in a frame: a stub of wax lit on its left, a pool of melt on top,
 * the wick, the flame (taller or shorter, now and then leaning, its colour
 * breathing), a halo of light round it and its glow on what it stands on.
 */
function drawCandle(b: Bitmap, c: Candle, ox: number, oy: number, t: number) {
  const x = c.x - ox, y = c.y - oy;
  const f = Math.sin((t * c.rate + c.ph) * TAU);
  const g = Math.sin((t * c.rate * 2 + c.ph * 3) * TAU);
  // the glow on the stone or the snow under and behind it
  for (const [dx, dy] of [[-1, 1], [0, 1], [1, 1], [c.w, 1], [-1, 0], [c.w, 0]]) b.blend(x + dx, y + dy, withAlpha(FLAME[2], 70));
  for (let k = 0; k < c.h; k++) {
    b.set(x, y - k, k === c.h - 1 ? WAX[4] : WAX[3]);
    if (c.w === 2) b.set(x + 1, y - k, k === c.h - 1 ? WAX[3] : WAX[1]);
  }
  if (c.h > 3 && c.ph > 0.5) b.set(x - 1, y - Math.floor(c.h / 2), WAX[2]);
  const top = y - c.h;
  b.set(x, top, IRON[1]);
  // the flame: two or three pixels, its tip leaning when it gutters
  const tall = f > 0.2 ? 3 : 2;
  const lean = g < -0.75 ? 1 : 0;
  b.set(x, top - 1, FLAME[f > -0.4 ? 2 : 1]);
  b.set(x + (tall === 3 ? 0 : lean), top - 2, FLAME[g > 0 ? 4 : 3]);
  if (tall === 3) b.set(x + lean, top - 3, FLAME[3]);
  // the halo
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, -2], [1, -2], [0, -3 - (tall === 3 ? 1 : 0)]]) b.blend(x + dx, top + dy, withAlpha(FLAME[3], f > 0 ? 80 : 55));
}

/** The candles on the plinth, flickering (frames in the statue's own box, so they sit on it exactly). */
function plinthCandles(n = 12): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(ST.w, ST.h);
    for (const c of PLINTH_CANDLES) drawCandle(b, c, SF.x, SF.y, i / n);
    out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The pines, bent by the wind
// ---------------------------------------------------------------------------

const M_PINE = mat('pine', 'matte', ['#091013', '#111c1e', '#192927', '#233730', '#33493a', '#5a6442']);
const M_BARK = mat('bark', 'matte', ['#130b0d', '#221418', '#38221e', '#523228', '#744832', '#98623e']);

/** A pine: its trunk's points from the foot up (frame), the pads of needles (centre, half width, half height), the frame size. */
interface PineDef {
  w: number;
  h: number;
  trunk: [number, number][];
  radii: number[];
  pads: [number, number, number, number][];
  seed: number;
}

/**
 * A mountain pine bent by the wind: a twisted trunk of red-brown bark
 * leaning away from the storm, branches out to flat pads of dark needles
 * lit on top, snow lying on each pad. Frames sway it calmly in the wind, the
 * tips moving most.
 */
function pine(d: PineDef, n = 10, amp = 1.2): Bitmap[] {
  const out: Bitmap[] = [];
  const bark = (_h: Hit, x: number, y: number) => ((x + (y >> 2)) % 3 === 0 ? -1 : 0);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = new Frame(d.w, d.h);
    // the sway grows with the height above the foot
    const sway = (y: number, ph: number) => Math.sin((t + ph) * TAU) * amp * Math.pow(Math.max(0, (d.h - y) / d.h), 1.4);
    const at = (x: number, y: number, ph = 0): V => v2(x + sway(y, ph), y);
    f.add(new Ribbon({ mat: M_BARK, z: 1, group: 'trunk', tex: bark }, d.trunk.map(([x, y]) => at(x, y)), d.radii));
    d.pads.forEach(([px, py, rx, ry], k) => {
      const ph = hash2(k, 0, d.seed + 2) * 0.3;
      const c = at(px, py, ph);
      // the branch from the trunk out to the pad
      const ti = d.trunk.reduce((best, p, j) => (Math.abs(p[1] - py) < Math.abs(d.trunk[best][1] - py) ? j : best), 0);
      const [tx, ty] = d.trunk[ti];
      f.add(new Ribbon({ mat: M_BARK, z: 1.5, group: `branch${k}`, line: 'soft' }, [at(tx, ty), at((tx + px) / 2, (ty + py) / 2 + 1.5, ph), v2(c.x, c.y + ry * 0.4)], [1.6, 1.1, 0.7]));
      needlePad(f, c.x, c.y, rx, ry, d.seed * 31 + k, 2 + k * 0.02, `pad${k}`);
    });
    out.push(f.render());
  }
  return out;
}

/**
 * A pad of needles: a clump of small lumps heaped in an ellipse, each a dome
 * lit from the upper left with needles picked out in it, the lower lumps in
 * front of the upper ones; snow capping the upper lumps.
 */
function needlePad(f: Frame, cx: number, cy: number, rx: number, ry: number, seed: number, z: number, g: string) {
  const r = rng(seed);
  const needles = (_h: Hit, x: number, y: number) => (hash2(x, y >> 1, seed) > 0.8 ? 1 : hash2(x, y, seed + 1) < 0.14 ? -1 : 0);
  const n = Math.round((rx * ry) / 4.5) + 4;
  const lumps: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r());
    lumps.push([cx + Math.cos(a) * d * rx * 0.8, cy + Math.sin(a) * d * ry * 0.65, 2.2 + r() * 2.2]);
  }
  lumps.sort((p, q) => p[1] - q[1]);
  lumps.forEach(([lx, ly, lr], i) => {
    f.add(new Ellipse({ mat: M_PINE, z: z + i * 0.001, group: `${g}l${i}`, line: 'soft', tex: needles }, v2(lx, ly), lr, lr * 0.74));
    if (ly < cy + ry * 0.15) f.add(new Ellipse({ mat: M_SNOWS, z: z + i * 0.001 + 0.0005, group: `${g}s${i}`, line: 'none' }, v2(lx - 0.4, ly - lr * 0.52), lr * 0.8, lr * 0.34));
  });
}

/** the pine on the left, its foot on the snow (frame 92 x 104), leaning and reaching away from the storm */
const PINE_L: PineDef = {
  w: 92, h: 104, seed: 601,
  trunk: [[56, 103], [57, 88], [54, 72], [50, 56], [47, 42], [44, 28], [42, 16]],
  radii: [4.2, 3.6, 3.2, 2.8, 2.2, 1.7, 1.2],
  pads: [[42, 12, 12, 4.4], [26, 24, 15, 5], [58, 30, 12, 4.4], [16, 40, 14, 5], [40, 44, 14, 4.8], [64, 52, 11, 4.2], [20, 60, 15, 5.2], [46, 68, 13, 4.6], [28, 80, 13, 4.4], [66, 82, 9, 3.6]],
};
/** the pine on the right, nearer the storm, its pads streaming left */
const PINE_R: PineDef = {
  w: 88, h: 110, seed: 611,
  trunk: [[60, 109], [62, 92], [60, 76], [56, 60], [52, 44], [48, 30], [44, 18], [40, 9]],
  radii: [4.4, 3.8, 3.4, 3, 2.5, 2, 1.5, 1.1],
  pads: [[38, 9, 11, 4], [24, 20, 13, 4.6], [52, 26, 11, 4], [18, 36, 14, 5], [42, 42, 14, 4.8], [62, 50, 10, 4], [22, 54, 14, 5], [46, 62, 13, 4.6], [28, 74, 13, 4.4], [58, 76, 10, 3.8], [36, 88, 11, 4]],
};

// ---------------------------------------------------------------------------
// The cables from our rim, their posts and lanterns
// ---------------------------------------------------------------------------

/** A cable from a post on our rim out to another mesa: the post's foot, its height, the cable's far end, the lanterns' count. */
interface RimCable {
  foot: [number, number];
  post: number;
  end: [number, number];
  sag: number;
  lanterns: number;
}
const RIM_L: RimCable = { foot: [80, 168], post: 13, end: [118, 92], sag: 3, lanterns: 7 };
const RIM_R: RimCable = { foot: [548, 170], post: 13, end: [488, 93], sag: 3, lanterns: 7 };

/** A rim cable's box on the screen (its sprite's top left and size). */
function rimBox(c: RimCable) {
  const x0 = Math.min(c.foot[0], c.end[0]) - 8, x1 = Math.max(c.foot[0], c.end[0]) + 8;
  const y0 = c.end[1] - 4, y1 = c.foot[1] + 2;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * A post on our rim and the cable it holds out across the gulf: a squared
 * timber on a block of stone, snow on its head, an iron ring the cable runs
 * through; the cable sagging away to the far mesa, small lanterns hung along
 * it, each with its candle, smaller with the distance. Frames swing the
 * lanterns gently, each on its own phase, and make their flames breathe.
 */
function rimCable(c: RimCable, n = 12): Bitmap[] {
  const box = rimBox(c);
  const out: Bitmap[] = [];
  const top: [number, number] = [c.foot[0], c.foot[1] - c.post];
  const pts = cablePts({ a: top, b: c.end, sag: c.sag });
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const b = new Bitmap(box.w, box.h);
    const L = (x: number, y: number, col: RGBA) => b.set(Math.round(x) - box.x, Math.round(y) - box.y, col);
    // the cable
    for (const [x, y] of pts) L(x, y, ROPE[2]);
    // the post: a block of stone, the timber, its snow cap, the ring
    for (let y = c.foot[1] - 3; y <= c.foot[1]; y++) for (let x = c.foot[0] - 3; x <= c.foot[0] + 3; x++) L(x, y, STONE[x < c.foot[0] ? 5 : 3]);
    for (let y = top[1]; y < c.foot[1] - 3; y++) {
      L(c.foot[0] - 1, y, BARK[5]);
      L(c.foot[0], y, BARK[4]);
      L(c.foot[0] + 1, y, BARK[2]);
    }
    for (let x = c.foot[0] - 2; x <= c.foot[0] + 2; x++) L(x, top[1] - 1, SNOW[x <= c.foot[0] ? 7 : 5]);
    L(c.foot[0], top[1] + 1, IRON[3]);
    L(c.foot[0] + (c.end[0] > c.foot[0] ? 1 : -1), top[1], IRON[2]);
    // the lanterns along it, swinging; near ones a little cage round the flame, far ones a spark
    for (let k = 0; k < c.lanterns; k++) {
      const u = (k + 0.7) / (c.lanterns + 0.4);
      const [px, py] = pts[Math.round(u * (pts.length - 1))];
      const near = 1 - u;
      const ph = hash2(k, 0, c.foot[0]) ;
      const swing = Math.sin((t * (1 + (k % 2)) + ph) * TAU);
      const sx = px + (Math.abs(swing) > 0.6 ? Math.sign(swing) : 0) * (near > 0.4 ? 1 : 0);
      const flick = Math.sin((t * (2 + (k % 3)) + ph * 2) * TAU);
      if (near > 0.45) {
        L(px, py + 1, IRON[2]);
        L(sx - 1, py + 2, IRON[3]);
        L(sx, py + 2, IRON[2]);
        L(sx + 1, py + 2, IRON[1]);
        L(sx - 1, py + 3, IRON[2]);
        L(sx, py + 3, FLAME[flick > 0 ? 4 : 3]);
        L(sx + 1, py + 3, IRON[1]);
        L(sx - 1, py + 4, IRON[3]);
        L(sx, py + 4, FLAME[2]);
        L(sx + 1, py + 4, IRON[1]);
        L(sx, py + 5, IRON[2]);
        for (const [dx, dy] of [[-2, 3], [2, 3], [0, 6], [-2, 4], [2, 4]]) b.blend(Math.round(sx + dx) - box.x, Math.round(py + dy) - box.y, withAlpha(FLAME[2], flick > 0 ? 70 : 45));
      } else if (near > 0.15) {
        L(px, py + 1, IRON[2]);
        L(sx, py + 2, FLAME[flick > 0 ? 3 : 2]);
        L(sx, py + 3, IRON[1]);
      } else L(px, py + 1, FLAME[flick > 0 ? 3 : 2]);
    }
    out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The far layer: the candles along the cables, the castle's windows, the plume, the veils
// ---------------------------------------------------------------------------

/** every candle on the far cables (screen), and the box round them */
const FAR_CANDLES = CABLES.flatMap((c) => candleSpots(c).map(([x, y]) => ({ x, y, far: c.far }))).filter((p) => p.x >= 0 && p.x < 640);
const FAR_BOX = (() => {
  const xs = FAR_CANDLES.map((p) => p.x), ys = FAR_CANDLES.map((p) => p.y);
  return { x: Math.min(...xs) - 1, y: Math.min(...ys) - 2, w: Math.max(...xs) - Math.min(...xs) + 3, h: Math.max(...ys) - Math.min(...ys) + 4 };
})();

/** The candles along the far cables, flickering each at its own pace: a pixel of flame, now and then a brighter one above it. */
function farCandles(n = 12): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(FAR_BOX.w, FAR_BOX.h);
    FAR_CANDLES.forEach((p, k) => {
      const f = Math.sin(((i / n) * (1 + (k % 3)) + hash2(k, 0, 521)) * TAU);
      const x = p.x - FAR_BOX.x, y = p.y - FAR_BOX.y;
      b.set(x, y, FLAME[p.far === 2 ? (f > 0.3 ? 2 : 1) : f > 0.2 ? 3 : 2]);
      if (p.far < 2 && f > 0.6) b.set(x, y - 1, withAlpha(FLAME[4], 150));
    });
    out.push(b);
  }
  return out;
}

/** the box round the castle's windows */
const WIN_BOX = (() => {
  const xs = WINDOWS.map((p) => p[0]), ys = WINDOWS.map((p) => p[1]);
  return { x: Math.min(...xs) - 2, y: Math.min(...ys) - 2, w: Math.max(...xs) - Math.min(...xs) + 5, h: Math.max(...ys) - Math.min(...ys) + 6 };
})();

/** The castle's windows: dim (frame 0) and bright with a glow round them (frame 1), breathing (pulse). */
function castleWindows(): Bitmap[] {
  const dim = new Bitmap(WIN_BOX.w, WIN_BOX.h), bright = new Bitmap(WIN_BOX.w, WIN_BOX.h);
  for (const [wx, wy] of WINDOWS) {
    const x = wx - WIN_BOX.x, y = wy - WIN_BOX.y;
    dim.set(x, y, WINDOW[1]);
    dim.set(x, y + 1, WINDOW[0]);
    bright.set(x, y, WINDOW[3]);
    bright.set(x, y + 1, WINDOW[2]);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1], [0, 2]]) bright.blend(x + dx, y + dy, withAlpha(WINDOW[2], 90));
  }
  return [dim, bright];
}

/** The plume's box: from far left of the chimney to a little right of it, from above the screen to the mouth. */
const PLUME_BOX = { w: 204, h: 56, mx: 190, my: 52 };

/**
 * The purple dust the huge chimney breathes out (loop): puffs well up from its
 * mouth one after another, swelling as they climb and leaning away with the
 * wind toward the left, thinning out; lit rose and lilac on their sides toward
 * the sun, deep violet in their cores; the mouth itself glowing.
 */
function plume(n = 24): Bitmap[] {
  const out: Bitmap[] = [];
  const P_N = 36;
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(PLUME_BOX.w, PLUME_BOX.h);
    // the oldest puffs first, so the young ones lie over them
    const puffs = Array.from({ length: P_N }, (_, k) => ({ k, a: (i / n + k / P_N) % 1 })).sort((p, q) => q.a - p.a);
    for (const { k, a } of puffs) {
      // up out of the mouth, then streaming away to the left on the wind, sinking a little, each puff on its own wander
      const rise = 22 * (1 - Math.pow(1 - Math.min(1, a * 2.4), 2));
      const cx = PLUME_BOX.mx - Math.pow(a, 1.2) * 172 + Math.sin(a * 9 + k * 1.7) * 1.4;
      const cy = PLUME_BOX.my - 3 - rise + a * 6 + Math.sin(a * 5 + k * 0.9) * 2;
      const r = 4.5 + a * 13;
      // drawn out along the wind as it goes
      const rx = r * (1 + Math.min(1, a * 2) * 0.4), ry = r * (0.85 - Math.min(1, a * 2) * 0.2);
      const dens = Math.pow(1 - a, 0.6) * 1.6;
      ellipseFill(b, cx, cy, rx, ry, (x, y, d) => {
        if (!dith(x, y, dens * (1.1 - d * d))) return 0;
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        const lit = sunOn(nx, ny, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
        const v = 3.6 + lit * 4.4 + (1 - a) * 1.4 - d * 1.2 + (hash2(x, y, 531) - 0.5) * 0.6;
        return PLUME[Math.round(clamp(v, 0, PLUME.length - 1))];
      });
    }
    // the glow in the mouth
    for (let dx = -4; dx <= 4; dx++) b.set(PLUME_BOX.mx + dx, PLUME_BOX.my - 1, PLUME[Math.abs(dx) < 3 ? 10 : 8]);
    out.push(b);
  }
  return out;
}

/** The box of the falling snow in the veils. */
const VEIL_BOX = { x: 440, y: 92, w: 200, h: 74 };

/**
 * The snow falling in the veils beneath the storm (loop): pale streaks
 * slanting down to the left with the wind, thicker toward the right corner.
 */
function veilSnow(n = 16): Bitmap[] {
  const r = rng(541);
  const streaks = Array.from({ length: 120 }, () => ({ x: r() * 260, y: r() * VEIL_BOX.h, len: 2 + Math.floor(r() * 3), sp: 1 + Math.floor(r() * 2), c: r() }));
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(VEIL_BOX.w, VEIL_BOX.h);
    for (const s of streaks) {
      const y = (s.y + (i / n) * VEIL_BOX.h * s.sp) % VEIL_BOX.h;
      const x = s.x - y * 0.62 - (i / n) * VEIL_BOX.h * s.sp * 0.62 + 40;
      const X = ((x % 260) + 260) % 260 - 20;
      const sx = VEIL_BOX.x + X, sy = VEIL_BOX.y + y;
      if (sy < stormBase(sx) + 2) continue;
      if (!dith(Math.round(X), Math.round(y), smooth(470, 620, sx + y * 0.6) * 1.1)) continue;
      for (let q = 0; q < s.len; q++) b.set(Math.round(X - q * 0.62), Math.round(y - q), VEIL[s.c > 0.6 ? 5 : 4]);
    }
    out.push(b);
  }
  return out;
}

/**
 * Snow streaming off the castle mesa's rim in the wind (loop): wisps lifted
 * off the cornice and blown away to the left, thinning out.
 */
function rimDrift(w: number, h: number, seed: number, n = 16): Bitmap[] {
  const r = rng(seed);
  const wisps = Array.from({ length: 9 }, () => ({ x: r() * w, ph: r(), len: 6 + r() * 10 }));
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, h);
    for (const s of wisps) {
      const a = (i / n + s.ph) % 1;
      const x0 = s.x - a * 30, y0 = h - 2 - a * 5 + a * a * 6;
      for (let q = 0; q < s.len; q++) {
        const x = Math.round(x0 - q), y = Math.round(y0 + Math.sin(q * 0.5 + a * 6) * 0.8);
        const fade = (1 - a) * (1 - q / s.len);
        if (x >= 0 && x < w && dith(x, y, fade * 1.2)) b.set(x, y, SNOW[q < 2 ? 8 : 6]);
      }
    }
    out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The arena: flagstones, footprints, rocks, frozen grass, glints, spindrift
// ---------------------------------------------------------------------------

/** keep the floor quiet where the champions stand */
const busy = (x: number, y: number) => [...SPAWNS.player, ...SPAWNS.enemy].some(([fx, fy]) => Math.hypot((x - fx) / 34, (y - fy) / 16) < 1);

/**
 * The long shadows the low sun throws to the right over the snow: the
 * arbiter's and his upright blade's, the pines'.
 */
function shadowK(x: number, y: number): number {
  // the statue: a long band from its plinth to the right
  const sx = x - 382, sy = y - 189;
  let k = 0;
  if (sx > -20 && sx < 170) {
    const half = 8 * (1 - sx / 200) + 1.5;
    if (Math.abs(sy - sx * 0.05) < half) k = Math.max(k, 1 - sx / 240);
  }
  // the blade: a thin line far over the snow
  const bx = x - 286, by = y - 190;
  if (bx > 0 && bx < 190 && Math.abs(by - bx * 0.045) < 0.8) k = Math.max(k, 0.7 - bx / 400);
  // the pines
  for (const [px, py, len] of [[60, 184, 90], [628, 186, 30]] as [number, number, number][]) {
    const dx = x - px, dy = y - py;
    if (dx > -6 && dx < len && Math.abs(dy - dx * 0.04) < 4 * (1 - dx / (len * 1.3)) + 0.5) k = Math.max(k, 0.75 - dx / (len * 1.6));
  }
  return k;
}

/**
 * The old terrace before the arbiter, in world units: flagstones in rows
 * within a curb of long blocks, swept bare by the wind except where the snow
 * has drifted onto them in tongues, from the right and from the front.
 */
function flagstone(u: number, v: number): { bare: number; joint: boolean; lit: boolean; tone: number; curb: boolean } | null {
  const v0 = world(320, 190)[1], v1 = world(320, 240)[1];
  if (v < v0 || v > v1) return null;
  const uc = 6, half = 100, du = Math.abs(u - uc);
  if (du > half) return null;
  const side = du > half - 5, front = v > v1 - 4;
  let joint: boolean, lit: boolean, tone: number;
  if (side || front) {
    // the curb: long blocks, a joint between it and the paving and between its blocks
    joint = (side && Math.abs(du - (half - 5)) < 1) || (front && !side && Math.abs(v - (v1 - 4)) < 1) || (side ? v % 9 < 1.2 : (u + 600) % 14 < 1.6);
    lit = false;
    tone = hash2(side ? Math.floor(v / 9) : Math.floor((u + 600) / 14), side ? 7 : 9, 424);
  } else {
    const row = Math.floor((v - v0) / 16);
    const su = u - uc + (row % 2) * 15 + 600;
    const col = Math.floor(su / 30);
    const fu = su - col * 30, fv = v - v0 - row * 16;
    joint = fu < 1.6 || fv < 1.5;
    lit = !joint && fv < 3.2;
    tone = hash2(col, row, 423);
  }
  // the drifts: tongues of snow over the stones, more of them toward the right and toward us
  const drift = vnoise(u, v * 2.4, 34, 421) * 0.65 + vnoise(u, v * 2.4, 11, 422) * 0.35 + ((u - uc) / half) * 0.22 + ((v - v0) / (v1 - v0)) * 0.18;
  return { bare: 1 - smooth(0.58, 0.62, drift), joint, lit, tone, curb: side || front };
}

/** A trail of footprints toward the arbiter, pilgrims' or the last fighters', half filled by the drift (world: u, v of each print). */
const PRINTS: [number, number][] = (() => {
  const out: [number, number][] = [];
  const v0 = world(300, 196)[1], v1 = world(270, 360)[1];
  for (let k = 0; k < 26; k++) {
    const v = v1 - (k * (v1 - v0)) / 25;
    const u = -30 + Math.sin(k * 0.4) * 6 + (k % 2 ? 4 : -4);
    out.push([u, v]);
  }
  return out;
})();

/**
 * The arena's ground: the mesa's snow in the same perspective as the far
 * top, the long shadows of the arbiter and the pines on it, the old
 * flagstones swept bare in front of the plinth, a trail of footprints toward
 * it, rocks breaking through with snow on their heads, frozen grass beside
 * them; nothing where the champions stand.
 */
function floorGround(): Bitmap {
  const { w, h } = FLOOR;
  const b = new Bitmap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sy = y + 192;
      const [u, v] = world(x, sy);
      const fs = flagstone(u, v);
      if (fs && fs.bare > 0 && dith(x, sy, fs.bare)) {
        // a slab: its top lit along its far edge, the joints dark and packed with snow
        const pv = (fs.curb ? 3.4 : 4.8) + fs.tone * 1.2 + (fs.lit ? 1.2 : 0) - stormK(x, sy) * 1.2 - shadowK(x, sy) * 1.6 + (hash2(x, sy, 424) - 0.5) * 0.6;
        b.set(x, y, fs.joint ? (hash2(x, sy, 425) > 0.55 ? SNOWF[7] : PAVE[2]) : rampDither(PAVE, clamp(pv, 0, PAVE.length - 1), x, sy));
        continue;
      }
      b.set(x, y, snowColor(x, sy));
    }
  }
  // the footprints: a dent in the snow, its shaded far side, its lit near lip
  for (const [u, v] of PRINTS) {
    const y = rowOf(v), x = 320 + u * pscale(y);
    const s = pscale(y);
    if (busy(x, y)) continue;
    ellipseFill(b, x, y - 192, 1.8 * s + 0.6, 0.9 * s + 0.4, (px, py, d) => {
      if (d > 1) return 0;
      const far = py + 192 < y;
      return SNOWF[Math.max(0, (far ? 4 : 6) - Math.round(stormK(px, py + 192) * 2))];
    });
  }
  // rocks breaking through the snow, their heads under snow; frozen grass by them
  const r = rng(611);
  const rocks: [number, number, number][] = [[586, 296, 10], [612, 330, 8], [560, 248, 5], [400, 344, 6], [118, 350, 5], [66, 226, 5], [596, 220, 6]];
  for (const [rx, ry, rr] of rocks) {
    if (busy(rx, ry)) continue;
    const s = rr;
    const oy = ry - 192;
    // its shadow to the right
    ellipseFill(b, rx + s * 1.2, oy + s * 0.18, s * 1.6, s * 0.38, (px, py, d) => (dith(px, py, (1 - d) * 1.3) ? SNOWF[Math.max(0, 4 - Math.round(stormK(px, py + 192) * 2))] : 0));
    const pts: [number, number][] = [];
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + (k / 6) * Math.PI;
      pts.push([rx + Math.cos(a) * s * (0.8 + r() * 0.4), oy + Math.sin(a) * s * (0.55 + r() * 0.35)]);
    }
    pts.push([rx + s, oy + 1], [rx - s, oy + 1]);
    polyFill(b, pts, (px, py) => {
      const lx = (rx - px) / s, ly = (oy - py) / s;
      const top = py < oy - s * 0.35 + (hash2(px, 0, 612) - 0.5) * 2;
      if (top && lx > -0.6) return SNOW[Math.round(clamp(5 + lx * 2 - stormK(px, py + 192) * 2, 2, 8))];
      return rampDither(STONE, clamp(3.6 + lx * 2.4 + ly * 1.2 - stormK(px, py + 192) * 1.4 + (hash2(px, py, 613) - 0.5) * 0.8, 0, STONE.length - 1), px, py);
    });
    // frozen grass beside it
    for (let k = 0; k < 6; k++) {
      const gx = rx + (r() - 0.5) * s * 3.2, gy = oy + 1 + r() * 2;
      const len = 2 + r() * (s * 0.5);
      for (let q = 0; q < len; q++) b.set(Math.round(gx - q * 0.35), Math.round(gy - q), STRAW[q > len * 0.6 ? 4 : 2]);
    }
  }
  return b;
}

/** Glints where the low sun catches the snow's crystals: frame 1 lights a scatter of pixels (pulse). */
function glints(): Bitmap[] {
  const { w, h } = FLOOR;
  const off = new Bitmap(w, h), on = new Bitmap(w, h);
  off.set(0, 0, withAlpha(SNOW[9], 0));
  const r = rng(621);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * w), y = Math.floor(r() * h);
    if (busy(x, y + 192) || stormK(x, y + 192) > 0.6 || shadowK(x, y + 192) > 0.2) continue;
    on.set(x, y, SNOW[r() < 0.3 ? 9 : 8]);
  }
  return [off, on];
}

/**
 * Spindrift snaking over the snow (loop): low wisps of snow blown across from
 * the right, rising and falling with the ground, fading out.
 */
function spindrift(w: number, h: number, seed: number, n = 20): Bitmap[] {
  const r = rng(seed);
  const wisps = Array.from({ length: 7 }, () => ({ y: 3 + r() * (h - 6), ph: r(), len: 14 + r() * 22, amp: 1 + r() * 1.5 }));
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, h);
    for (const s of wisps) {
      const a = (i / n + s.ph) % 1;
      const x0 = w + 10 - a * (w + 40);
      for (let q = 0; q < s.len; q++) {
        const x = Math.round(x0 + q), y = Math.round(s.y + Math.sin((x + i * 3) * 0.08) * s.amp);
        const fade = Math.sin(a * Math.PI) * (1 - q / s.len);
        if (x >= 0 && x < w && dith(x, y, fade * 0.9)) b.set(x, y, SNOWF[q < 3 ? 12 : 11]);
      }
    }
    out.push(b);
  }
  return out;
}

/** A snowy bough reaching into the bottom right corner from a pine beyond the frame (loop: it sways). */
function cornerBough(n = 10): Bitmap[] {
  const out: Bitmap[] = [];
  const W = 96, HH = 64;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = new Frame(W, HH);
    const sw = (k: number) => Math.sin((t + k * 0.13) * TAU) * 1.2 * k;
    const pts: V[] = [v2(W + 4, 30), v2(80, 26 + sw(0.3)), v2(56 + sw(0.6), 24 + sw(0.5)), v2(30 + sw(1), 28 + sw(0.8))];
    f.add(new Ribbon({ mat: M_BARK, z: 1, group: 'bough' }, pts, [3, 2.4, 1.6, 1]));
    const pads: [number, number, number, number][] = [[84, 30, 14, 6], [62, 28, 15, 6], [40, 31, 13, 5.4], [72, 44, 16, 6.4], [50, 46, 12, 5], [90, 52, 12, 6]];
    pads.forEach(([px, py, rx, ry], k) => needlePad(f, px + sw(1 - px / W + 0.2), py, rx, ry, 631 + k, 2 + k * 0.02, `cp${k}`));
    out.push(f.render());
  }
  return out;
}

/** Choughs riding the wind over the castle's mesa (ZoneDef birds): black, wings fingered, a slow beat now and then. */
function choughs(): Bitmap[] {
  const frames = [
    ['#.....#', '.##.##.', '...#...'],
    ['#.....#', '.##.##.', '...#...'],
    ['.......', '###.###', '...#...'],
    ['.......', '.#####.', '#..#..#'],
    ['#.....#', '.##.##.', '...#...'],
  ];
  const dark = hex('#16121e'), mid = hex('#2a2232');
  return frames.map((rows) => {
    const b = new Bitmap(7, 3);
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && b.set(x, y, x === 3 ? mid : dark)));
    return b;
  });
}

// ---------------------------------------------------------------------------
// The relics on the arena: the challengers' swords, a stone lantern, a dragon's skull
// ---------------------------------------------------------------------------

/** A sword left standing in the snow: where its point went in (screen), its lean, its length, its ribbon's colours. */
interface Planted {
  x: number;
  y: number;
  lean: number;
  len: number;
  guard: number;
  ribbon: RGBA[];
}
/** the challengers' swords, left in the snow at the arena's edges */
const BLADES: Planted[] = [
  { x: 30, y: 224, lean: -0.18, len: 16, guard: 4, ribbon: H(['#8a8478', '#d0cabc', '#f4f0e6']) },
  { x: 604, y: 262, lean: 0.2, len: 18, guard: 4, ribbon: H(['#1e3266', '#2c4a92', '#4a6ec0']) },
  { x: 570, y: 326, lean: -0.1, len: 21, guard: 5, ribbon: H(['#6a1a1a', '#a82c24', '#d44a36']) },
];

/**
 * The swords the arbiter's challengers left standing in the snow, each
 * leaning its own way, scaled by its distance: the blade's dark steel lit
 * along its left edge, the guard, the grip, the pommel; snow heaped where it
 * went in; a ribbon knotted under the guard streaming left in the wind
 * (frames: the ribbons flutter); its shadow thrown to the right.
 */
function blades(n = 10): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const b = new Bitmap(FLOOR.w, FLOOR.h);
    BLADES.forEach((p, k) => {
      const s = pscale(p.y) / 0.8;
      const oy = p.y - 192;
      const L = p.len * s, dx = Math.sin(p.lean), dy = -Math.cos(p.lean);
      // its shadow, long and thin to the right
      for (let q = 0; q < L * 1.6; q++) b.blend(Math.round(p.x + 2 + q), Math.round(oy + 1 + q * 0.06), withAlpha(SHADE, 70));
      // the blade from the snow up to the guard, lit on its left edge
      for (let q = 0; q <= L; q++) {
        const x = p.x + dx * q, y = oy + dy * q;
        b.set(Math.round(x) - 1, Math.round(y), IRON[q > L * 0.85 ? 3 : 4]);
        b.set(Math.round(x), Math.round(y), IRON[2]);
        if (s > 1.05) b.set(Math.round(x) + 1, Math.round(y), IRON[1]);
      }
      // the guard across, the grip, the pommel
      const gx = p.x + dx * L, gy = oy + dy * L;
      const g = Math.round(p.guard * s);
      for (let q = -g; q <= g; q++) b.set(Math.round(gx + Math.cos(p.lean) * q), Math.round(gy + Math.sin(p.lean) * q), q < 0 ? WAX[1] : IRON[3]);
      for (let q = 1; q <= Math.round(4 * s); q++) b.set(Math.round(gx + dx * q), Math.round(gy + dy * q), BARK[q % 2 ? 4 : 2]);
      b.set(Math.round(gx + dx * (4 * s + 1)), Math.round(gy + dy * (4 * s + 1)), IRON[4]);
      // the ribbon under the guard, streaming left and fluttering
      const rl = Math.round(7 * s);
      for (let q = 0; q < rl; q++) {
        const u = q / rl;
        const fl = Math.sin((t * (1 + (k % 2)) + k * 0.31) * TAU - q * 0.9) * u * 1.4;
        const rx = Math.round(gx - 1 - q), ry = Math.round(gy + 2 + u * 2 + fl);
        b.set(rx, ry, p.ribbon[fl > 0.3 ? 0 : u < 0.3 ? 2 : 1]);
        if (q < rl - 2) b.set(rx, ry + 1, p.ribbon[0]);
      }
      // the snow heaped where it went in
      for (let q = -3; q <= 3; q++) b.set(Math.round(p.x + q), oy + (Math.abs(q) > 2 ? 0 : -1), SNOWF[Math.abs(q) > 1 ? 9 : 11]);
      b.set(Math.round(p.x), oy - 2, SNOWF[11]);
    });
    out.push(b);
  }
  return out;
}

/** A stone lantern's box. */
const TORO = { w: 22, h: 36 };

/**
 * A stone lantern at the arena's edge, like those on the way to a shrine: a
 * foot, a post, a light box with a candle burning in its window, a broad cap
 * under snow, a knob on top; granite lit on its left. Frames: the candle
 * flickers and its light breathes in the window.
 */
function toro(n = 12): Bitmap[] {
  const out: Bitmap[] = [];
  const { w, h } = TORO;
  const cx = 10;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = new Frame(w, h);
    f.add(new Poly({ mat: M_GRAN, z: 1, group: 'foot' }, [v2(cx - 6, h - 1), v2(cx + 6, h - 1), v2(cx + 5, h - 5), v2(cx - 5, h - 5)], { kind: 'bevel', w: 1.5 }));
    f.add(new Capsule({ mat: M_GRAN, z: 1.1, group: 'post' }, v2(cx, h - 5), v2(cx, h - 15), 2.6, 2.4, 0.3));
    f.add(new Poly({ mat: M_GRAN, z: 1.2, group: 'ledge' }, [v2(cx - 6, h - 15), v2(cx + 6, h - 15), v2(cx + 5, h - 17), v2(cx - 5, h - 17)], { kind: 'bevel', w: 1.2 }));
    f.add(new Poly({ mat: M_GRAN, z: 1.3, group: 'box' }, [v2(cx - 4.5, h - 17), v2(cx + 4.5, h - 17), v2(cx + 4.5, h - 25), v2(cx - 4.5, h - 25)], { kind: 'bevel', w: 1.5 }));
    f.add(new Poly({ mat: M_GRAN, z: 1.4, group: 'cap' }, [v2(cx - 8.5, h - 25), v2(cx + 8.5, h - 25), v2(cx + 3, h - 30), v2(cx - 3, h - 30)], { kind: 'bevel', w: 1.6 }));
    f.add(new Ellipse({ mat: M_GRAN, z: 1.5, group: 'knob' }, v2(cx, h - 31.5), 2, 2));
    f.add(new Poly({ mat: M_SNOWS, z: 1.45, group: 'snowcap', line: 'none' }, [v2(cx - 8, h - 26), v2(cx - 3, h - 30.5), v2(cx + 3, h - 30.5), v2(cx + 7, h - 26.5), v2(cx + 2, h - 28.5), v2(cx - 3, h - 28)], { kind: 'flat', n: [-0.2, -0.85, 0.5] }));
    f.add(new Ellipse({ mat: M_SNOWS, z: 1.55, group: 'snowknob', line: 'none' }, v2(cx - 0.3, h - 33), 1.6, 0.9));
    const b = f.render();
    // the window and the candle in it
    const fl = Math.sin(t * TAU * 2) * 0.5 + Math.sin(t * TAU * 3 + 1) * 0.5;
    for (let y = h - 24; y <= h - 19; y++) for (let x = cx - 2; x <= cx + 2; x++) b.set(x, y, y === h - 24 || x === cx + 2 ? FLAME[0] : FLAME[fl > 0.2 ? 2 : 1]);
    b.set(cx, h - 20, WAX[3]);
    b.set(cx, h - 21, FLAME[fl > -0.3 ? 4 : 3]);
    b.set(cx, h - 22, FLAME[fl > 0.4 ? 5 : 3]);
    for (const [dx, dy] of [[-4, -21], [5, -21], [0, -16], [-3, -15], [3, -15]]) b.blend(cx + dx, h + dy, withAlpha(FLAME[2], fl > 0 ? 80 : 50));
    out.push(b);
  }
  return out;
}

/// --- old bone in the late light, the dark of its hollows, the snow of the arena's floor heaped against it
const M_BONE = mat('bone', 'matte', ['#2a2032', '#4a3a4a', '#725c62', '#9c8274', '#c6aa8c', '#ead4b2']);
const M_HOLLOW = mat('hollow', 'matte', ['#0c0a12', '#140f1a', '#1c1622', '#241c2a', '#2e2434', '#382c3e']);
const M_DRIFT = mat('drift', 'matte', ['#3c3858', '#534c70', '#6e6286', '#8b7a98', '#aa94a4', '#c9b0ae']);

/** The dragon's skull: its scale, its box, where it lies (its left edge a little off the screen). */
const DRAGON = { s: 0.84, w: 130, h: 70, x: -8, y: 316 };

/** Weathered bone: pits and hairline cracks picked out. */
const weathered = (_h: Hit, x: number, y: number) => (hash2(x, y, 711) > 0.9 ? -1 : hash2(x >> 1, y >> 1, 712) > 0.93 ? -1 : 0);

/**
 * A dragon's bones in the snow at the front left of the arena: its great
 * skull lying half buried, facing into the arena; two horns sweeping up and
 * back from its crown, a ridge of spikes behind them, the brow over a deep
 * socket, a long snout with a slit of a nostril, a row of teeth and two fangs
 * along the upper jaw, the lower jaw under the drift. Old bone lit from the
 * upper left, pitted and cracked; snow on its crown, its brow, its snout and
 * its horns, and heaped against it; its shadow on the snow to the right.
 */
function dragonSkull(): Bitmap {
  const S = DRAGON.s;
  const f = new Frame(DRAGON.w, DRAGON.h);
  const q = (x: number, y: number) => v2(4 + x * S, y * S);
  const R = (list: number[]) => list.map((r) => r * S);
  // the horns, sweeping up and back from the crown
  f.add(new Ribbon({ mat: M_BONE, z: 0.5, group: 'hornB', shade: -1, tex: (hh) => (Math.floor(hh.u * 9) % 2 === 0 ? 0 : -1) }, [q(60, 26), q(54, 12), q(44, 3), q(32, 0), q(22, 3)], R([4.6, 3.8, 3, 2, 0.9])));
  f.add(new Ribbon({ mat: M_BONE, z: 1.5, group: 'hornF', tex: (hh) => (Math.floor(hh.u * 10) % 2 === 0 ? 0 : -1) }, [q(52, 30), q(42, 18), q(30, 12), q(16, 12), q(6, 17)], R([5.2, 4.4, 3.4, 2.2, 1])));
  // the ridge of spikes along the back of the crown
  for (let k = 0; k < 4; k++) {
    const x = 20 + k * 7, y = 40 - k * 3;
    f.add(new Poly({ mat: M_BONE, z: 0.8, group: `spike${k}`, line: 'soft' }, [q(x - 3, y + 3), q(x - 7, y - 6 - k), q(x + 3, y + 1)], { kind: 'bevel', w: 1.4 }));
  }
  // the crown and the cheek
  f.add(new Ellipse({ mat: M_BONE, z: 1, group: 'crown', tex: weathered }, q(46, 44), 24 * S, 18 * S));
  f.add(new Poly({ mat: M_BONE, z: 1.2, group: 'cheek', tex: weathered }, [q(36, 54), q(60, 48), q(84, 52), q(90, 62), q(68, 66), q(40, 66)], { kind: 'bevel', w: 3 }));
  // a spike at the jaw's hinge, pointing back
  f.add(new Poly({ mat: M_BONE, z: 1.3, group: 'hinge', line: 'soft' }, [q(42, 58), q(22, 64), q(42, 64)], { kind: 'bevel', w: 1.4 }));
  // the snout: long, tapering to the nose
  f.add(new Poly({ mat: M_BONE, z: 2, group: 'snout', tex: weathered }, [q(68, 34), q(94, 37), q(118, 44), q(140, 52), q(145, 58), q(140, 62), q(112, 62), q(86, 62), q(70, 58)], { kind: 'bevel', w: 3.4, k: 1.3 }));
  // the socket, deep, the brow over it
  f.add(new Ellipse({ mat: M_HOLLOW, z: 2.5, group: 'socket' }, q(70, 44), 8.6 * S, 7.2 * S, -0.15));
  f.add(new Capsule({ mat: M_BONE, z: 3, group: 'brow' }, q(54, 35), q(84, 37), 4.4 * S, 3.4 * S));
  // the nostril
  f.add(new Ellipse({ mat: M_HOLLOW, z: 2.6, group: 'nostril' }, q(134, 52), 3.4 * S, 1.8 * S, 0.3));
  // the teeth along the upper jaw, two great fangs among them
  for (let k = 0; k < 9; k++) {
    const x = 84 + k * 6.4, fang = k === 1 || k === 7;
    const len = fang ? 8 : 4 + (k % 2);
    f.add(new Poly({ mat: M_BONE, z: 3.2, group: `tooth${k}`, line: 'soft', shade: 1 }, [q(x - 2, 61), q(x + 2, 61), q(x + 0.4, 61 + len)], { kind: 'bevel', w: 1 }));
  }
  // the lower jaw, mostly under the drift
  f.add(new Poly({ mat: M_BONE, z: 1.8, group: 'jaw', shade: -1 }, [q(54, 64), q(136, 64), q(132, 72), q(62, 74)], { kind: 'bevel', w: 2 }));
  // the drift heaped against it, the arena's snow
  f.add(new Poly({ mat: M_DRIFT, z: 4, group: 'drift', line: 'none' }, [q(-4, 84), q(-4, 70), q(16, 68), q(34, 70.5), q(54, 68), q(76, 70), q(96, 67.5), q(118, 70), q(138, 68.5), q(150, 71), q(150, 84)], { kind: 'dome', c: q(72, 84), r: 90 * S, ry: 16 * S }));
  // snow on the crown, the brow, the snout and the horns
  const snow = (pts: V[], r: number[], g: string) => f.add(new Ribbon({ mat: M_SNOWS, z: 3.5, group: g, line: 'none' }, pts, R(r)));
  snow([q(30, 29), q(44, 26), q(56, 28)], [2.4, 2.8, 2], 'snowCrown');
  snow([q(58, 32), q(70, 32.5), q(82, 34)], [1.8, 2, 1.4], 'snowBrow');
  snow([q(96, 35.5), q(114, 40), q(128, 46), q(138, 50)], [1.6, 1.8, 1.5, 1], 'snowSnout');
  snow([q(48, 9), q(38, 2.5), q(28, 1.5)], [1.4, 1.2, 0.8], 'snowHorn');
  const b = f.render();
  // its shadow on the snow, thrown to the right by the low sun
  for (let y = Math.round(64 * S); y < DRAGON.h; y++) {
    for (let x = Math.round(100 * S); x < DRAGON.w; x++) {
      if (b.get(x, y) !== 0) continue;
      const k = 1 - (x - 100 * S) / (DRAGON.w - 100 * S) - Math.abs(y - 66 * S) / 6;
      if (k > 0 && dith(x, y, k * 0.9)) b.set(x, y, withAlpha(SHADE, 80));
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

/** where the pines stand (their feet), where the rim cables' posts stand */
const PINE_L_AT = { x: 52, y: 182 };
const PINE_R_AT = { x: 614, y: 186 };

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const r = rng(701);
  const plain = ['snow_a', 'snow_b', 'snow_c', 'snow_a', 'snow_d'];
  for (let row = 6; row < MAP_ROWS; row++) for (let c = 0; c < MAP_COLS; c++) ground[row * MAP_COLS + c] = id(plain[Math.floor(r() * plain.length)]);
  const bl = rimBox(RIM_L), br = rimBox(RIM_R);
  const props: PropPlacement[] = [
    // far: the purple plume, snow streaming off the castle's rim, the candles along the cables, the castle's windows, the snow in the veils
    { kind: 'plume', x: CHIMNEY.x, y: CHIMNEY.mouth - 2, layer: 'far' },
    { kind: 'rim_drift', x: CASTLE_MESA.x0 - 34, y: CASTLE_MESA.top + 2, layer: 'far' },
    { kind: 'windows', x: WIN_BOX.x, y: WIN_BOX.y, layer: 'far' },
    { kind: 'far_candles', x: FAR_BOX.x, y: FAR_BOX.y, layer: 'far' },
    { kind: 'veil_snow', x: VEIL_BOX.x, y: VEIL_BOX.y, layer: 'far' },
    // back: the cables from our rim, the pines, the arbiter and the candles on his plinth
    { kind: 'cable_l', x: bl.x, y: bl.y, layer: 'back' },
    { kind: 'cable_r', x: br.x, y: br.y, layer: 'back' },
    { kind: 'pine_l', x: PINE_L_AT.x, y: PINE_L_AT.y, layer: 'back' },
    { kind: 'pine_r', x: PINE_R_AT.x, y: PINE_R_AT.y, layer: 'back' },
    { kind: 'statue', x: STATUE_AT.x, y: STATUE_AT.y, layer: 'back' },
    { kind: 'candles', x: STATUE_AT.x, y: STATUE_AT.y, layer: 'back' },
    // floor: the arena's ground, the glints on it, spindrift snaking over it
    { kind: 'ground', x: 0, y: 192, layer: 'floor' },
    { kind: 'glints', x: 0, y: 192, layer: 'floor' },
    { kind: 'drift_a', x: 20, y: 224, layer: 'floor' },
    { kind: 'drift_b', x: 330, y: 300, layer: 'floor' },
    // the challengers' swords, a stone lantern on the right, a dragon's skull in the snow at the front left
    { kind: 'blades', x: 0, y: 192, layer: 'floor' },
    { kind: 'toro', x: 626, y: 240, layer: 'floor' },
    { kind: 'dragon', x: DRAGON.x, y: DRAGON.y, layer: 'floor' },
    // fg: a snowy bough reaching into the bottom right corner
    { kind: 'bough', x: 640, y: 362, layer: 'fg' },
  ];
  // the runtime draws a layer's props in this order, the preview sorts them by y: keep the two the same
  const order = { far: 0, back: 1, floor: 2, fg: 3 } as const;
  props.sort((a, c) => order[a.layer] - order[c.layer] || a.y - c.y);
  return { ground, wall, props };
}

export const zone5: ZoneArt = {
  id: 'zone5',
  name: 'Snowy Mesa',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    plume: plume(),
    rim_drift: rimDrift(190, 14, 551),
    windows: castleWindows(),
    far_candles: farCandles(),
    veil_snow: veilSnow(),
    cable_l: rimCable(RIM_L),
    cable_r: rimCable(RIM_R),
    pine_l: pine(PINE_L, 10, 1),
    pine_r: pine(PINE_R, 10, 1.4),
    statue: [arbiter()],
    candles: plinthCandles(),
    ground: [floorGround()],
    glints: glints(),
    drift_a: spindrift(280, 26, 561),
    drift_b: spindrift(300, 30, 562, 24),
    bough: cornerBough(),
    blades: blades(),
    toro: toro(),
    dragon: [dragonSkull()],
    bird: choughs(),
  }),
  kinds: {
    // the dust rolls up out of the chimney and leans away with the wind
    plume: { anchor: [PLUME_BOX.mx / PLUME_BOX.w, PLUME_BOX.my / PLUME_BOX.h], mode: 'loop', ms: 160 },
    rim_drift: { anchor: [0, 1], mode: 'loop', ms: 140 },
    // the windows breathe with the candles behind them
    windows: { anchor: [0, 0], mode: 'pulse', ms: 5200 },
    far_candles: { anchor: [0, 0], mode: 'loop', ms: 150 },
    veil_snow: { anchor: [0, 0], mode: 'loop', ms: 120 },
    cable_l: { anchor: [0, 0], mode: 'loop', ms: 170 },
    cable_r: { anchor: [0, 0], mode: 'loop', ms: 160 },
    // the pines sway, the one nearer the storm a little more
    pine_l: { anchor: [PINE_L.trunk[0][0] / PINE_L.w, 1], mode: 'loop', ms: 260 },
    pine_r: { anchor: [PINE_R.trunk[0][0] / PINE_R.w, 1], mode: 'loop', ms: 220 },
    statue: { anchor: [0.5, 1], mode: 'static' },
    candles: { anchor: [0.5, 1], mode: 'loop', ms: 120 },
    ground: { anchor: [0, 0], mode: 'static' },
    glints: { anchor: [0, 0], mode: 'pulse', ms: 3600 },
    drift_a: { anchor: [0, 0], mode: 'loop', ms: 130 },
    drift_b: { anchor: [0, 0], mode: 'loop', ms: 140 },
    bough: { anchor: [1, 1], mode: 'loop', ms: 240 },
    // the ribbons on the swords flutter; the lantern's candle flickers
    blades: { anchor: [0, 0], mode: 'loop', ms: 150 },
    toro: { anchor: [10 / TORO.w, 1], mode: 'loop', ms: 130 },
    dragon: { anchor: [0, 1], mode: 'static' },
    bird: { anchor: [0.5, 0.5], mode: 'loop', ms: 380 },
  },
  layout,
  horizon: VY,
  // purple motes drifting off the chimney's mouth and the plume
  sparks: [{ path: [[CHIMNEY.x, CHIMNEY.mouth - 3], [CHIMNEY.x - 8, CHIMNEY.mouth - 16], [CHIMNEY.x - 40, CHIMNEY.mouth - 24], [CHIMNEY.x - 110, CHIMNEY.mouth - 22]], colors: MOTE, every: 150, speed: 5, life: [2600, 5200] }],
};

export type { Hit, V };
