// The Sanctum: the main menu's own diorama (Jakub, 2026-10-24: "instead of
// changing dioramas, only champions would be changing at each refresh of main
// menu, diorama would be new and static, designed just for main menu and
// instead of navigational buttons user can click on objects or building from
// diorama instead ... very epic design, something exclusive and creative high
// fantasy with moving particles. maybe something celestial or planetar").
//
// The Archivist's sanctum, an island adrift at the heart of the broken
// celestial Loom (his premise, DESIGN_DECISIONS.md 1): overhead the Loom's
// colossal golden rim and its inner ring, warp threads of starlight strung
// between them, the rim cracked open on the right with its fragments
// drifting; a ringed giant planet beyond it; a nebula; the pole star in the
// upper left, the key light. On the island, each a place to click: the
// Starbridge Gate (the campaign), the Reliquary (the champions), the
// Weaver's Spire (Weaving), its spool drawing a golden thread up toward the
// rim's break, the Observatory (the Academy), and an astrolabe on a rock
// drifting below (the options). Everything here is a first take of mine:
// names, places and look.
//
// Writes public/assets/menu/ (sky.png, scene.png, menu.json) and the preview
// docs/images/menu_sanctum.png. The runtime is src/game/view/sanctum.ts.
import path from 'node:path';
import { writeJson } from './io.ts';
import { MAT, UIR } from './palette.ts';
import { dith, ellipseFill, outline, polyFill, rampDither } from './paint.ts';
import { A, Bitmap, hash2, hex, packShelves, RGBA, rng } from './raster.ts';

const H = (list: string[]) => list.map((h) => hex(h));
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const TAU = Math.PI * 2;
const W = 640, HT = 360;

// ---------------------------------------------------------------------------
// palette
// ---------------------------------------------------------------------------

/** deep space, near black overhead to indigo low down */
const SKY = H(['#030209', '#05040e', '#070614', '#09081a', '#0c0a21', '#0f0d28', '#120f2f', '#161236', '#1a153d', '#1e1945', '#231d4d', '#292256', '#30285f', '#382f69']);
/** the nebula: violet dust, teal gas, rose where they meet */
const NEBV = H(['#1c1238', '#2a1650', '#3c1d68', '#522684', '#6c329e', '#8a46b6', '#ac66cc', '#d29ae4']);
const NEBT = H(['#0a1e2c', '#0e2c3c', '#143e4e', '#1a5262', '#246a76', '#32868a', '#4ca6a2', '#78c8bc']);
const NEBR = H(['#3a1438', '#5c1c4c', '#842a60', '#b04478', '#d87298']);
const STAR = H(['#4a5280', '#7a86b4', '#b4bee4', '#e8eeff', '#ffffff']);
/** the pole star's light, paling to white */
const KEY = H(['#141634', '#1e2246', '#2a305a', '#3a4270', '#4e5888', '#6872a0', '#8890ba', '#aeb4d2', '#d4d8ea', '#f4f4fa', '#ffffff']);
/** the giant planet: warm bands and cool ones */
const PLW = H(['#0c0912', '#140e1c', '#1e1426', '#2a1a30', '#38223a', '#482a42', '#5a344a', '#6e4052', '#844e58', '#9c6260', '#b47a6a', '#cc9678']);
const PLC = H(['#0a0b18', '#0e1224', '#141a32', '#1a2440', '#222e50', '#2c3a62', '#384a74', '#485c88', '#5c729c', '#7a8eb2']);
const PRING = H(['#221c2a', '#3a3240', '#544a54', '#726666', '#948672', '#b6a888', '#d6cca8']);
const ATMO = H(['#4a7aa8', '#7ab4d8', '#b8e4f4']);
const MOON = H(['#2a2840', '#3e3a58', '#58547a', '#7a769a', '#a09cbc', '#ccc8de', '#f0eef8']);
/** the Loom's metal: gold that has seen ages, its runes in arcane light */
const GOLD = MAT.gold.ramp;
const RUNE = UIR.arcane;
/** the warp threads: starlight, and their faint halo */
const THREAD = H(['#2c2650', '#4a4078', '#8a7cb8', '#e6dcff', '#fff8e8']);
const GTHREAD = H(['#5a3a10', '#a87a28', '#f0c650', '#fff0a8', '#fffbe8']);

// ---------------------------------------------------------------------------
// layout (screen pixels)
// ---------------------------------------------------------------------------

/** the pole star, upper left: the key light */
const STAR_X = 54, STAR_Y = 36;
/** the giant planet beyond the Loom's break, cut by the screen's right edge */
const PLANET = { x: 604, y: 116, r: 66 };
/** a small moon */
const MOONP = { x: 168, y: 132, r: 9 };

/** An ellipse in the sky: centre, radii, tilt (radians). */
interface Ring {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  tilt: number;
  /** half the band's width in px */
  half: number;
  /** a thin companion band this far outward (px), joined to the band by struts; 0: none */
  rail: number;
}

/** The Loom's rim, framing the sky from the corners over the top (its crown above the screen). */
export const RIM: Ring = { cx: 320, cy: 338, rx: 430, ry: 352, tilt: 0, half: 5.5, rail: 11 };
/** the rim's break, as angles on it (radians, 0 = east, -PI/2 = up): the band is gone between them, over the planet */
const BREAK = [-1.06, -0.93];

/** A point on a ring at angle a. */
export function ringAt(r: Ring, a: number): [number, number] {
  const c = Math.cos(r.tilt), s = Math.sin(r.tilt);
  const x = r.rx * Math.cos(a), y = r.ry * Math.sin(a);
  return [r.cx + x * c - y * s, r.cy + x * s + y * c];
}

/** Where a pixel lies relative to a ring: its angle, and its distance from the band's centre line in px (outward positive). */
function ringCoords(r: Ring, px: number, py: number): [number, number] {
  const c = Math.cos(r.tilt), s = Math.sin(r.tilt);
  const dx = px - r.cx, dy = py - r.cy;
  const lx = (dx * c + dy * s) / r.rx, ly = (-dx * s + dy * c) / r.ry;
  const a = Math.atan2(ly, lx);
  const k = Math.hypot(lx, ly);
  const rad = Math.hypot(r.rx * Math.cos(a), r.ry * Math.sin(a));
  return [a, (k - 1) * rad];
}

// ---------------------------------------------------------------------------
// noise
// ---------------------------------------------------------------------------

function vnoise(x: number, y: number, cell: number, seed: number): number {
  const fx = x / cell, fy = y / cell;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Fractal value noise: `oct` octaves from `cell` px down, each half the size and weight. */
function fbm(x: number, y: number, cell: number, seed: number, oct = 4): number {
  let v = 0, w = 0.5, t = 0;
  for (let i = 0; i < oct; i++) {
    v += vnoise(x, y, cell, seed + i * 17) * w;
    t += w;
    cell /= 2;
    w /= 2;
  }
  return v / t;
}

function n1(x: number, s: number, seed: number): number {
  const f = x / s, i = Math.floor(f), t = f - i, u = t * t * (3 - 2 * t);
  return hash2(i, 0, seed) * (1 - u) + hash2(i + 1, 0, seed) * u;
}

// ---------------------------------------------------------------------------
// the sky
// ---------------------------------------------------------------------------

/** The golden thread's course, sampled, for the motes that climb it at runtime. */
let THREAD_PTS: [number, number][] = [];

/** The whole sky, 640x360: space, the nebula, stars, the pole star, the planet, a moon, the Loom and its threads, the golden thread. */
function skyImage(): Bitmap {
  const b = new Bitmap(W, HT);
  space(b);
  nebula(b);
  starfield(b);
  poleStar(b);
  planet(b);
  moon(b);
  loom(b);
  THREAD_PTS = goldenThread(b);
  return b;
}

/** Near black overhead, deepening to indigo toward the abyss below the island; the pole star's light washes the upper left. */
function space(b: Bitmap) {
  for (let y = 0; y < HT; y++) {
    for (let x = 0; x < W; x++) {
      let v = 1 + Math.pow(y / HT, 1.3) * 8.5;
      const d = Math.hypot(x - STAR_X, (y - STAR_Y) * 1.15);
      v += Math.pow(Math.max(0, 1 - d / 230), 2) * 4.2;
      // the planet's faint glow round it
      const dp = Math.hypot(x - PLANET.x, y - PLANET.y) - PLANET.r;
      if (dp > 0) v += Math.pow(Math.max(0, 1 - dp / 70), 2) * 1.6;
      b.set(x, y, rampDither(SKY, clamp(v, 0, SKY.length - 1), x, y));
    }
  }
}

/**
 * A band of nebula from the lower left up across to the upper right: violet
 * dust glowing faintly, teal gas toward its edges, a little rose where the
 * dust is thickest, dark lanes winding along it; ragged and wispy, thinning
 * out in dither. It stays low in value: the Loom and the stars are the light.
 */
function nebula(b: Bitmap) {
  for (let y = 0; y < HT; y++) {
    for (let x = 0; x < W; x++) {
      // along and across the band (it rises to the right), the coordinates warped by a slow noise so it billows
      const wx = x + (fbm(x, y, 90, 13, 3) - 0.5) * 70, wy = y + (fbm(x + 300, y, 90, 14, 3) - 0.5) * 50;
      const along = wx * 0.88 - wy * 0.47;
      const across = wx * 0.47 + wy * 0.88 - 262 + 30 * Math.sin(along / 130);
      const width = 70 + 34 * n1(along, 110, 11);
      const core = 1 - Math.abs(across) / width;
      if (core <= -0.35) continue;
      const cloud = fbm(wx, wy, 48, 21, 5);
      const wisp = fbm(wx * 1.5 + 40, wy * 0.8, 22, 31, 4);
      let k = core * 0.9 + (cloud - 0.5) * 1.5 + (wisp - 0.5) * 0.8;
      // dark lanes of dust wind along the band
      const laneD = Math.abs(across + 6 - 20 * Math.sin(along / 64 + 0.6) - 8 * Math.sin(along / 23));
      const lane = smooth(9 + 8 * vnoise(along, 0, 30, 41), 2, laneD);
      k -= lane * 0.75;
      // the pole star's corner stays clear
      k -= Math.max(0, 1 - Math.hypot(x - STAR_X, y - STAR_Y) / 120) * 0.9;
      if (k < 0.2) continue;
      // violet in the core, teal toward the edges, a breath of rose where the dust is thickest: dithered into each other
      const teal = smooth(0.2, 0.85, Math.abs(across) / width + (wisp - 0.5) * 0.9);
      const rose = smooth(0.64, 0.76, cloud) * smooth(0.4, 0.7, core) * (1 - lane);
      // most of it barely above the dark: two or three steps of its ramp, densest in the core
      if (!dith(x, y, Math.min(1, (k - 0.2) * 1.7))) continue;
      const pick = dith(x, y, rose * 0.7) ? 'r' : dith(x + 2, y + 1, teal) ? 't' : 'v';
      const ramp = pick === 'r' ? NEBR : pick === 't' ? NEBT : NEBV;
      const v = (k - 0.2) * (pick === 'r' ? 1.5 : 2.6);
      b.set(x, y, rampDither(ramp, clamp(v, 0, pick === 'r' ? 1.2 : pick === 't' ? 2.1 : 2.6), x, y));
    }
  }
}

/** Twinkling stars for the runtime: where they are and how bright they get. */
const TWINKLES: [number, number, number][] = [];

/** Stars: many faint, fewer bright, crowding along the nebula; a few bright ones get a cross. */
function starfield(b: Bitmap) {
  const r = rng(51);
  for (let i = 0; i < 1500; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * HT);
    const along = x * 0.88 - y * 0.47;
    const across = x * 0.47 + y * 0.88 - 250 + 26 * Math.sin(along / 120);
    const inBand = Math.abs(across) < 95;
    if (!inBand && r() < 0.45) continue;
    if (Math.hypot(x - STAR_X, y - STAR_Y) < 26) continue;
    const bright = r();
    const c = bright > 0.985 ? STAR[4] : bright > 0.93 ? STAR[3] : bright > 0.7 ? STAR[2] : bright > 0.35 ? STAR[1] : STAR[0];
    b.set(x, y, c);
    if (bright > 0.993) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, STAR[2]);
    }
    if (bright > 0.955 && TWINKLES.length < 64 && hash2(x, y, 52) > 0.35) TWINKLES.push([x, y, bright > 0.985 ? 2 : 1]);
  }
}

/** The pole star: a white-gold point, a soft halo in dither, four long spikes of light fading out. */
function poleStar(b: Bitmap) {
  for (let y = STAR_Y - 44; y <= STAR_Y + 44; y++) {
    for (let x = STAR_X - 54; x <= STAR_X + 54; x++) {
      const d = Math.hypot(x + 0.5 - STAR_X, (y + 0.5 - STAR_Y) * 1.1);
      const k = Math.pow(Math.max(0, 1 - d / 40), 1.6);
      if (k <= 0.02) continue;
      if (dith(x, y, Math.min(1, k * 1.8))) b.set(x, y, rampDither(KEY, clamp(k * 9.6, 0, KEY.length - 1), x, y));
    }
  }
  // the spikes: long and thin, the horizontal pair longer
  for (const [dx, dy, len] of [[1, 0, 52], [-1, 0, 50], [0, 1, 34], [0, -1, 30]] as const) {
    for (let i = 3; i < len; i++) {
      const k = 1 - i / len;
      if (!dith(STAR_X + dx * i, STAR_Y + dy * i, Math.min(1, k * 1.4))) continue;
      b.set(STAR_X + dx * i, STAR_Y + dy * i, rampDither(KEY, 4 + k * 6.5, STAR_X + dx * i, STAR_Y + dy * i));
    }
  }
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const d = Math.abs(dx) + Math.abs(dy);
    if (d <= 2) b.set(STAR_X + dx, STAR_Y + dy, d === 0 ? KEY[10] : d === 1 ? KEY[9] : KEY[8]);
  }
}

/**
 * The giant planet beyond the Loom: banded warm and cool, the bands bent by
 * turbulence and a great storm, lit from the pole star on its upper left so a
 * broad crescent shows and the rest lies in night; a thin rim of atmosphere on
 * the lit limb; its rings tilted across it, the far half hidden behind the
 * globe, the near half in front, casting a dark band on the globe.
 */
function planet(b: Bitmap) {
  const { x: px, y: py, r } = PLANET;
  // the pole star stands off to its upper left and behind it: a crescent, the rest in night
  const L = norm([-0.8, -0.52, -0.3]);
  const tilt = -0.36;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  // the rings, as an ellipse in the planet's frame: inner and outer radius, flattening
  const ringIn = 1.3, ringOut = 2.0, flat = 0.2;
  const ringAtPx = (x: number, y: number): number => {
    const dx = (x - px) / r, dy = (y - py) / r;
    const lx = dx * ct + dy * st, ly = (-dx * st + dy * ct) / flat;
    return Math.hypot(lx, ly);
  };
  const ringFront = (x: number, y: number) => {
    const dx = (x - px) / r, dy = (y - py) / r;
    return -dx * st + dy * ct > 0;
  };
  const ringShade = (d: number, x: number, y: number) => {
    // bands and gaps across the ring; the side toward the pole star brighter
    const gap = Math.abs(d - 1.62) < 0.035 || Math.abs(d - 1.86) < 0.02;
    if (gap) return -1;
    const band = 2.0 + Math.sin(d * 34) * 0.7 + Math.sin(d * 83 + 1) * 0.35 - smooth(1.78, 2.0, d) * 1.6 - smooth(1.45, 1.3, d) * 1.2;
    return clamp(band - (x - px) / r * 0.5 + (vnoise(x, y, 3, 61) - 0.5) * 0.5, 0, PRING.length - 1);
  };
  // the far half of the rings, behind the globe
  for (let y = Math.round(py - r * 1.4); y <= py + r * 1.4; y++) {
    for (let x = Math.round(px - r * 2.4); x <= W - 1; x++) {
      const d = ringAtPx(x, y);
      if (d < ringIn || d > ringOut || ringFront(x, y)) continue;
      const v = ringShade(d, x, y);
      if (v < 0) continue;
      if (dith(x, y, 0.75)) b.set(x, y, rampDither(PRING, Math.max(0, v - 0.8), x, y));
    }
  }
  // the globe
  for (let y = py - r - 1; y <= py + r + 1; y++) {
    for (let x = px - r - 1; x <= Math.min(W - 1, px + r + 1); x++) {
      const dx = (x + 0.5 - px) / r, dy = (y + 0.5 - py) / r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2);
      const lam = dx * L[0] + dy * L[1] + nz * L[2];
      // latitude in the planet's own frame (its axis tilted with the rings)
      const lat = -dx * st + dy * ct;
      const swirl = fbm(x * 0.7, y * 2.2, 18, 71, 4) - 0.5;
      const storm = Math.hypot(dx * ct + dy * st + 0.42, (lat - 0.3) * 2.4);
      // bands of uneven width, bent by the turbulence
      const latW = lat + swirl * 0.14 + (fbm(lat * 60, 0, 7, 72, 3) - 0.5) * 0.12;
      const bandV = Math.sin(latW * 11) + 0.45 * Math.sin(latW * 27 + 0.7);
      const cool = bandV > 0.25;
      // the ring's shadow on the globe, just south of the rings
      const shadow = Math.abs(lat - 0.22 + dx * 0.05) < 0.045;
      // a soft terminator: the crescent's light falls off over a band into the night side, faintly lit by the rings below
      let lit = smooth(-0.04, 0.62, lam);
      if (shadow) lit *= 0.3;
      const ramp = cool ? PLC : PLW;
      const glow = 0.9 * smooth(0.1, -0.6, lam) * (0.4 + 0.6 * smooth(0.3, 1, dy));
      let v = 0.4 + glow + lit * (ramp.length - 2.6) + (bandV - 0.25) * 0.3 * (0.25 + lit);
      if (storm < 0.11) v += (cool ? -0.7 : 0.9) * (0.2 + lit);
      // the limb darkens, except where the air on the lit side catches the light
      const limb = 1 - nz;
      v -= limb * 0.9 * (1 - lit);
      b.set(x, y, rampDither(ramp, clamp(v, 0, ramp.length - 1), x, y));
      if (limb > 0.84 && lam > 0.0) b.set(x, y, ATMO[lam > 0.5 ? 2 : lam > 0.25 ? 1 : 0]);
    }
  }
  // the near half of the rings, in front of the globe
  for (let y = Math.round(py - r * 1.4); y <= py + r * 1.4; y++) {
    for (let x = Math.round(px - r * 2.4); x <= W - 1; x++) {
      const d = ringAtPx(x, y);
      if (d < ringIn || d > ringOut || !ringFront(x, y)) continue;
      const v = ringShade(d, x, y);
      if (v < 0) continue;
      // where the near rings cross the globe's night side they catch less light
      const onGlobe = Math.hypot(x - px, y - py) < r;
      if (dith(x, y, onGlobe ? 0.9 : 0.8)) b.set(x, y, rampDither(PRING, clamp(v + (onGlobe ? 0.4 : 0), 0, PRING.length - 1), x, y));
    }
  }
}

function norm(v: number[]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** A small moon, a crescent lit from the upper left, its night side faintly lit by the planet. */
function moon(b: Bitmap) {
  const { x: mx, y: my, r } = MOONP;
  const L = norm([-0.7, -0.45, 0.55]);
  ellipseFill(b, mx, my, r, r, (x, y) => {
    const dx = (x + 0.5 - mx) / r, dy = (y + 0.5 - my) / r;
    const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
    const lam = dx * L[0] + dy * L[1] + nz * L[2];
    const crater = vnoise(x * 3, y * 3, 2, 81) > 0.66 ? -0.8 : 0;
    return rampDither(MOON, clamp(0.6 + Math.max(0, lam) * 5.6 + crater, 0, MOON.length - 1), x, y);
  });
}

// ---------------------------------------------------------------------------
// the Loom
// ---------------------------------------------------------------------------

/** The warp threads hanging from the rim: their courses, sampled, for light running down them at runtime. */
export const WARP: [number, number][][] = [];

/**
 * The Loom overhead: its rim, a broad band of old gold with a channel of runes
 * glowing in arcane light, gem studs along it, its upper edge lit by the pole
 * star, cracked open on the right; and its warp, threads of starlight hanging
 * from it, loosed when it broke: each ends in a bead of light, a few snapped
 * short and curling. The fragments of the break drift in the scene (bobbing).
 */
function loom(b: Bitmap) {
  // the threads first, so the rim lies over their roots
  const roots: number[] = [];
  // the rim's visible arcs: the upper left (-2.62 .. -2.0) and the upper right (-1.14 .. -0.52), its crown above the screen
  for (let a = -2.62; a <= -2.0; a += 0.046) roots.push(a);
  for (let a = -1.14; a <= -0.52; a += 0.046) if (a < BREAK[0] - 0.03 || a > BREAK[1] + 0.03) roots.push(a);
  for (const a of roots) {
    const h = hash2(Math.round(a * 1000), 0, 91);
    const [x0, y0] = ringAt(RIM, a);
    // longer toward the sky's middle, shorter near the corners; one in five snapped short
    const reach = 1 - Math.min(Math.abs(a + 2.0), Math.abs(a + 1.14)) / 0.62;
    const len = 34 + reach * 64 + h * 26;
    const snapped = h > 0.8;
    WARP.push(hangingThread(b, x0 + 0.5, y0 + RIM.half, snapped ? len * 0.4 : len, h, snapped));
  }
  ring(b, RIM, 102, true);
}

/**
 * A thread of starlight hanging from (x0, y0), `len` long, in a slow S as if
 * stirred; a faint halo, a core of dim light with brighter beads, a bead of
 * light at its end; a snapped one frays and curls instead. Returns its
 * course, sampled every few px.
 */
function hangingThread(b: Bitmap, x0: number, y0: number, len: number, h: number, snapped: boolean): [number, number][] {
  const pts: [number, number][] = [];
  const n = Math.ceil(len * 1.5);
  const sway = 3 + h * 5, ph = h * TAU;
  let last: [number, number] = [x0, y0];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + Math.sin(t * Math.PI * 1.3 + ph) * sway * t;
    const y = y0 + t * len;
    const ix = Math.floor(x), iy = Math.floor(y);
    if (dith(ix - 1, iy, 0.28)) blendSky(b, ix - 1, iy, THREAD[0]);
    if (dith(ix + 1, iy, 0.28)) blendSky(b, ix + 1, iy, THREAD[0]);
    const bead = hash2(Math.floor(t * 30), Math.floor(h * 97), 93) > 0.84;
    // it thins out toward its end
    if (dith(ix, iy, 1 - t * 0.35)) b.set(ix, iy, bead ? THREAD[3] : dith(ix, iy, 0.5) ? THREAD[2] : THREAD[1]);
    if (i % 6 === 0) pts.push([ix, iy]);
    last = [x, y];
  }
  const [lx, ly] = last;
  if (snapped) {
    // the frayed end curls away
    for (let i = 0; i < 12; i++) {
      const a = i * 0.45 + h * 6;
      const rr = 1 + i * 0.3;
      const x = Math.floor(lx + Math.cos(a) * rr), y = Math.floor(ly + Math.sin(a) * rr * 0.7 + i * 0.2);
      if (dith(x, y, 1 - i / 14)) b.set(x, y, i < 5 ? THREAD[2] : THREAD[1]);
    }
  } else {
    // a bead of light at its end
    const ex = Math.floor(lx), ey = Math.floor(ly) + 1;
    b.set(ex, ey, THREAD[4]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blendSky(b, ex + dx, ey + dy, THREAD[2]);
  }
  return pts;
}

/** Lays a colour over the sky only where the sky is darker than it (a halo never darkens a star). */
function blendSky(b: Bitmap, x: number, y: number, c: RGBA) {
  if (!b.inside(x, y)) return;
  const o = b.get(x, y);
  const lum = (k: RGBA) => ((k >>> 24) & 255) + ((k >>> 16) & 255) + ((k >>> 8) & 255);
  if (lum(o) < lum(c)) b.set(x, y, c);
}

/**
 * A ring of the Loom: a band of gold seen edge-on from below, its outer rim
 * catching the pole star, a channel of runes along its middle glowing in
 * arcane light, studs of the same light every so often; broken between
 * BREAK on the rim.
 */
function ring(b: Bitmap, r: Ring, seed: number, rim: boolean) {
  const reach = r.half + Math.abs(r.rail) + 4;
  const x0 = Math.max(0, Math.floor(r.cx - r.rx - reach)), x1 = Math.min(W - 1, Math.ceil(r.cx + r.rx + reach));
  const y0 = Math.max(0, Math.floor(r.cy - r.ry - reach)), y1 = Math.min(HT - 1, Math.ceil(r.cy + r.ry + reach));
  const perim = Math.PI * (r.rx + r.ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const [a, d] = ringCoords(r, x + 0.5, y + 0.5);
      if (Math.abs(d) > reach) continue;
      // the band swells a little toward us (lower on the screen)
      const swell = 1 + 0.22 * Math.sin(a);
      const half = r.half * swell, rail = r.rail * swell;
      // arc length along the ring, for the plates, struts and glyphs
      const s = ((a + Math.PI) / TAU) * perim;
      if (rim) {
        // the break: jagged ends, ragged across the band and the rail
        const jag = (hash2(Math.round(d), 0, seed + 3) - 0.5) * 0.05;
        if (a > BREAK[0] + jag && a < BREAK[1] - jag) continue;
      }
      const light = clamp(1 - Math.hypot(x - STAR_X, y - STAR_Y) / 460, 0, 1);
      const inBand = Math.abs(d) <= half;
      const railD = d - rail;
      const inRail = r.rail !== 0 && Math.abs(railD) <= 1.4 * swell;
      // struts from the band out to the rail, every so often
      const between = r.rail !== 0 && (r.rail > 0 ? d > half && d < rail : d < -half && d > rail);
      const inStrut = between && ((s % 34) + 34) % 34 < 2.2;
      if (!inBand && !inRail && !inStrut) continue;
      let c: RGBA;
      if (inRail) c = railD * Math.sign(r.rail) > 0.4 ? GOLD[light > 0.5 ? 4 : 3] : GOLD[2];
      else if (inStrut) c = ((s % 34) + 34) % 34 < 1.1 ? GOLD[3] : GOLD[1];
      else {
        const u = d / half; // -1 inner edge .. 1 outer edge
        const joint = ((s % 23) + 23) % 23 < 1;
        if (u > 0.78) c = GOLD[light > 0.45 ? 5 : 4];
        else if (u > 0.58) c = GOLD[3];
        else if (u < -0.76) c = GOLD[0];
        else if (Math.abs(u) < 0.3 && half > 3) {
          // the channel of runes, sunk into the band: dark, glyphs lit in arcane light
          const glyph = hash2(Math.floor(s / 2), Math.floor((u + 1) * 3), seed) > 0.58 && Math.floor(s) % 4 !== 0;
          c = glyph ? (hash2(Math.floor(s / 2), 1, seed + 1) > 0.7 ? RUNE[4] : RUNE[3]) : u > 0 ? GOLD[0] : RUNE[0];
        } else if (joint) c = GOLD[1];
        else {
          const v = 2.1 + u * 1.1 + light * 1.5 + (vnoise(s, u * 4, 7, seed) - 0.5) * 1.1;
          c = rampDither(GOLD, clamp(v, 1, 4.7), x, y);
        }
      }
      b.set(x, y, c);
    }
  }
  // studs of arcane light along the band's lit edge
  const step = rim ? 0.06 : 0.09;
  for (let a = -Math.PI; a < Math.PI; a += step) {
    if (rim && a > BREAK[0] - 0.015 && a < BREAK[1] + 0.015) continue;
    const [sx, sy] = ringAt({ ...r, rx: r.rx + r.half * 0.62, ry: r.ry + r.half * 0.62 }, a);
    const ix = Math.round(sx), iy = Math.round(sy);
    if (ix < 1 || ix > W - 2 || iy < 1 || iy > HT - 2) continue;
    b.set(ix, iy, RUNE[4]);
    b.set(ix - 1, iy, RUNE[3]);
    b.set(ix + 1, iy, RUNE[2]);
  }
}

// ---------------------------------------------------------------------------
// the island
// ---------------------------------------------------------------------------

/** cool stone of the island, violet in its shadows */
const ROCK = H(['#07060c', '#0d0b16', '#141120', '#1b172a', '#231e35', '#2c2641', '#362f4e', '#42395c', '#4f456a', '#5e5279', '#706289', '#84769b']);
/** the planet's light catching the island's right-hand edges */
const RIMLIT = H(['#2c3e62', '#46628c', '#6e90b8', '#a8c8e4']);
const GRASS = H(['#081214', '#0c1a1b', '#112423', '#172f2c', '#1e3c36', '#274a40', '#325a4a', '#3e6c56', '#4c7e62', '#5e9270']);
const FLOWER = H(['#4ab4cc', '#9ae8f4', '#e8fcff', '#f0d4ff']);
/** the sanctum's pale stone: moonstone, cool in shadow */
const STONE = H(['#14121c', '#1d1a27', '#272333', '#322d40', '#3e384e', '#4b445d', '#59526c', '#68617c', '#79728d', '#8b859f', '#9f99b2', '#b6b0c6', '#cec9db', '#e6e2ee']);
const SLATE = H(['#0a0d1a', '#0f1426', '#151d34', '#1c2742', '#243352', '#2e4064', '#3a5078', '#48628c', '#5a76a0']);
/** candlelight in the windows */
const WARM = H(['#4a1e10', '#8a3a18', '#c8662a', '#f09a3a', '#ffcc66', '#fff0b4']);
const CRYS = H(['#0c2236', '#123a58', '#1a5a80', '#2a82aa', '#4eb0d2', '#90dcf0', '#e0faff']);
const WATER = H(['#1e3458', '#2e4e80', '#4a74aa', '#76a2d0', '#acd0ee', '#e8f6ff']);

/** The island's top in screen pixels: its middle, how far its top runs (x0..x1), where its back edge and front lip lie. */
const ISLE = { cx: 326, x0: 50, x1: 602, mid: 262, depth: 26 };
/** half the top's depth at x: full in the middle, closing to nothing at the ends */
const topHalf = (x: number) => ISLE.depth * Math.pow(Math.max(0, 1 - Math.pow((x - ISLE.cx) / ((ISLE.x1 - ISLE.x0) / 2), 2)), 0.42);
/** the back edge of the top (where the buildings stand) and its front lip, at x */
export const backY = (x: number) => ISLE.mid - topHalf(x) + (n1(x, 37, 201) - 0.5) * 2;
export const frontY = (x: number) => ISLE.mid + topHalf(x) * 1.05 + (n1(x, 29, 202) - 0.5) * 2.5;
/** the underside's lowest point at x: a great inverted crag with spurs */
function bottomY(x: number): number {
  const u = (x - ISLE.cx) / ((ISLE.x1 - ISLE.x0) / 2);
  if (Math.abs(u) >= 1) return frontY(x);
  // a thin rim at the ends, deepening into a great cone under the middle that runs off the screen
  let d = 12 + 104 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 1.45)), 2.3);
  for (const [sx, depth, w] of [[300, 30, 30], [204, 24, 20], [416, 30, 24], [516, 16, 16], [132, 12, 12], [254, 10, 12], [362, 12, 12]] as const) {
    d += depth * Math.max(0, 1 - Math.abs(x - sx) / w) ** 1.5;
  }
  d += (vnoise(x, 0, 9, 203) - 0.5) * 8 + (vnoise(x, 0, 3, 204) - 0.5) * 3;
  return frontY(x) + d * smooth(1, 0.86, Math.abs(u));
}

/** the plaza before the Reliquary: an oval of flagstones, and the paths running off it */
const PLAZA = { cx: 286, cy: 266, rx: 112, ry: 23 };
const inPlaza = (x: number, y: number) => Math.hypot((x - PLAZA.cx) / PLAZA.rx, (y - PLAZA.cy) / PLAZA.ry) < 1;
/** the paths: from the plaza out to the Gate, the Spire and the Observatory */
const PATHS: [number, number, number, number, number][] = [
  // x0, y0, x1, y1, half width
  [180, 264, 92, 262, 7],
  [392, 262, 452, 252, 6],
  [452, 252, 556, 258, 6],
];
function onPath(x: number, y: number): boolean {
  for (const [x0, y0, x1, y1, w] of PATHS) {
    const t = clamp(((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / ((x1 - x0) ** 2 + (y1 - y0) ** 2), 0, 1);
    const qx = x0 + (x1 - x0) * t, qy = y0 + (y1 - y0) * t;
    if (Math.hypot(x - qx, (y - qy) * 2.2) < w + (vnoise(x, y, 5, 211) - 0.5) * 2) return true;
  }
  return false;
}

/**
 * The island: its top in grass with glowing flowers, the plaza of pale
 * flagstones before the Reliquary with a medallion of gold set in it (the
 * Loom's rose, six lobes round a jewel), paths out to the other places; its
 * front lip, a cliff of strata, and below it the great inverted crag of its
 * underside, lit from the upper left, rimmed with the planet's light on the
 * right, veined with glowing crystal, crystals jutting, roots hanging.
 */
function island(): Bitmap {
  const b = new Bitmap(W, HT);
  const r = rng(221);
  // the rock: the cliff face and the underside, one body
  const h = (xx: number, yy: number) => fbm(xx * 0.8, yy * 1.5, 26, 231, 4);
  for (let x = ISLE.x0; x <= ISLE.x1; x++) {
    const top = Math.floor(frontY(x)) - 1, bot = Math.ceil(bottomY(x));
    for (let y = top; y <= Math.min(HT - 1, bot); y++) {
      const depth = (y - top) / Math.max(1, bot - top);
      const below = y - top;
      // facets: the noise bends the surface, its slope decides the light (upper left lit), stepped into planes
      const sx = h(x + 1.5, y) - h(x - 1.5, y), sy = h(x, y + 1.5) - h(x, y - 1.5);
      const facet = Math.round((-sx * 14 - sy * 7) * 2) / 2;
      // the cliff under the lip: a band of strata, lit by the pole star
      const cliff = below < 20 ? 1 - below / 20 : 0;
      const strata = cliff > 0 ? Math.sin((y + vnoise(x, 0, 30, 232) * 7) * 1.25) * 0.7 * cliff : 0;
      const u = (x - ISLE.cx) / 276;
      let v = 5.2 + cliff * 2.6 - depth * 3.6 + facet * 1.5 - u * 1.1 + strata;
      // cracks: dark seams where the rock splits
      const crack = Math.abs(fbm(x * 1.4, y * 0.6, 18, 233, 3) - 0.5) < 0.011 && below > 6;
      if (crack) v -= 2.4;
      if (below < 2) v += 1.6;
      // the underside's bottom edge: a darker lip
      if (bot - y < 2) v -= 1.2;
      b.set(x, y, rampDither(ROCK, clamp(v, 0, ROCK.length - 1), x, y));
      // the planet's light along the edges of the underside that face down and to the right
      const slope = bottomY(x + 2) - bottomY(x - 2);
      if (u > 0.05 && slope < -0.8 && bot - y < 2 + Math.min(2, -slope * 0.4)) b.set(x, y, RIMLIT[bot - y < 1 ? 2 : 1]);
      // moss hanging under the lip
      if (below > 1 && below < 7 && vnoise(x, 0, 6, 234) > 0.55 && below < 2 + vnoise(x, 1, 3, 235) * 6) b.set(x, y, GRASS[below < 3 ? 4 : 2]);
    }
  }
  // a few veins of crystal winding down through the underside, glowing faintly, brightest where they surface
  for (let x = ISLE.x0 + 40; x <= ISLE.x1 - 40; x++) {
    const top = frontY(x) + 18, bot = bottomY(x) - 3;
    for (let y = Math.floor(top); y <= bot; y++) {
      const patch = vnoise(x, y, 34, 242);
      if (patch < 0.58) continue;
      const n = fbm(x * 0.8, y * 1.2, 30, 241, 3);
      if (Math.abs(n - 0.5) < 0.008) {
        const bright = patch > 0.72 && hash2(x, y, 243) > 0.4;
        b.set(x, y, bright ? CRYS[4] : CRYS[2]);
        if (bright && b.inside(x, y + 1) && A(b.get(x, y + 1))) b.set(x, y + 1, CRYS[1]);
      }
    }
  }
  // clusters of crystal jutting from the underside
  for (const [cx, n, len] of [[300, 5, 16], [204, 4, 11], [420, 4, 12], [352, 3, 8], [254, 3, 7], [478, 3, 8], [150, 2, 6]] as const) {
    const base = bottomY(cx);
    for (let i = 0; i < n; i++) {
      const ang = Math.PI / 2 + (i - (n - 1) / 2) * 0.32 + (r() - 0.5) * 0.2;
      const l = len * (0.55 + r() * 0.45) * (i === Math.floor(n / 2) ? 1.25 : 1);
      crystal(b, cx + (i - (n - 1) / 2) * 3, base - 4, ang, l, 2.2);
    }
  }
  // roots hanging from the cliff, some with a glowing tip
  for (let i = 0; i < 26; i++) {
    const x0 = ISLE.x0 + 40 + r() * (ISLE.x1 - ISLE.x0 - 80);
    let x = x0, y = frontY(x0) + 6 + r() * 10;
    const len = 12 + r() * 30, sway = (r() - 0.5) * 0.6;
    for (let k = 0; k < len; k++) {
      x += sway + Math.sin(k * 0.3 + i) * 0.35;
      y += 1;
      if (y > bottomY(Math.round(x)) + 12) break;
      b.set(Math.round(x), Math.round(y), k < len * 0.6 ? ROCK[2] : ROCK[3]);
    }
    if (r() < 0.45) {
      b.set(Math.round(x), Math.round(y) + 1, CRYS[5]);
      b.set(Math.round(x), Math.round(y), CRYS[4]);
    }
  }
  // the top: grass, the plaza, the paths
  for (let x = ISLE.x0; x <= ISLE.x1; x++) {
    const y0 = Math.floor(backY(x)), y1 = Math.ceil(frontY(x));
    for (let y = y0; y <= y1; y++) {
      const k = (y - y0) / Math.max(1, y1 - y0);
      if (inPlaza(x, y) || onPath(x, y)) {
        // flagstones: rows deepening toward us, joints between them
        const row = Math.floor((y - 236) / (2.6 + k * 2.2));
        const col = Math.floor((x + row * 7) / (9 + (row % 2) * 3));
        const joint = (y - 236) % (2.6 + k * 2.2) < 0.9 || (x + row * 7) % (9 + (row % 2) * 3) < 1;
        const v = 7.4 + k * 1.2 - Math.abs(x - PLAZA.cx) / 160 + (hash2(col, row, 251) - 0.5) * 1.6 - (x - 200) / 400;
        b.set(x, y, joint ? STONE[4] : rampDither(STONE, clamp(v, 4, 11), x, y));
      } else {
        const tuft = vnoise(x, y * 2, 4, 252);
        const v = 5.2 + (1 - k) * 1.2 + (tuft - 0.5) * 2.4 - Math.abs(x - ISLE.cx) / 220 - (x - 200) / 500;
        b.set(x, y, rampDither(GRASS, clamp(v, 1, GRASS.length - 1), x, y));
        // flowers that glow, a scatter
        if (hash2(x, y, 253) > 0.986) b.set(x, y, FLOWER[hash2(x, y, 254) > 0.7 ? 2 : hash2(x, y, 255) > 0.5 ? 1 : 3]);
      }
    }
    // the front lip: a rim of grass hanging over the cliff, tufts on it
    const fy = Math.ceil(frontY(x));
    if (!inPlaza(x, fy - 1) && !onPath(x, fy - 1)) {
      b.set(x, fy + 1, GRASS[3]);
      if (hash2(x, 0, 256) > 0.6) b.set(x, fy + 2, GRASS[2]);
      if (hash2(x, 1, 256) > 0.7) b.set(x, fy - 2, GRASS[8]);
    } else b.set(x, fy + 1, STONE[3]);
  }
  medallion(b, PLAZA.cx, PLAZA.cy + 2);
  return b;
}

/** A crystal from (x, y) pointing at angle `ang`, `len` long: a lit face and a dark one, a bright tip. */
function crystal(b: Bitmap, x: number, y: number, ang: number, len: number, w: number) {
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const px = -uy, py = ux;
  for (let t = 0; t <= len; t += 0.5) {
    const half = w * (1 - Math.pow(t / len, 1.6));
    for (let s = -half; s <= half; s += 0.5) {
      const xx = Math.round(x + ux * t + px * s), yy = Math.round(y + uy * t + py * s);
      const v = (s < 0 ? 4.2 : 2.4) + (t / len) * 1.4 + (Math.abs(s) > half - 0.6 ? -0.8 : 0);
      b.set(xx, yy, rampDither(CRYS, clamp(v, 0, CRYS.length - 1), xx, yy));
    }
  }
  b.set(Math.round(x + ux * len), Math.round(y + uy * len), CRYS[6]);
}

/** The Loom's rose set in the plaza in gold, seen at a low angle: a ring, six lobes round a jewel. */
function medallion(b: Bitmap, cx: number, cy: number) {
  const rx = 21, ry = 5.4;
  const gold = (x: number, y: number) => b.set(x, y, rampDither(GOLD, x < cx ? 4.2 : 3.2, x, y));
  for (let a = 0; a < TAU; a += 0.02) {
    gold(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU - Math.PI / 2;
    const lx = cx + Math.cos(a) * rx * 0.58, ly = cy + Math.sin(a) * ry * 0.58;
    for (let t = 0; t < TAU; t += 0.12) gold(Math.round(lx + Math.cos(t) * 4.2), Math.round(ly + Math.sin(t) * 1.2));
  }
  b.set(cx, cy, RUNE[4]);
  b.set(cx - 1, cy, RUNE[3]);
  b.set(cx + 1, cy, RUNE[3]);
}

/** The waterfalls off the island's two ends: where they leave the lip, how wide the sheet is, which way it arcs out. */
export const FALLS: [number, number, number][] = [[86, 4, -1], [564, 3.5, 1]];
/**
 * The waterfalls, one frame of a loop: water spilling over the lip in a short
 * arc, falling as a sheet streaked light and dark (the streaks run down a
 * whole number of times a loop), fraying and thinning into spray as it goes,
 * gone into the void long before the bottom of the screen.
 */
function falls(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  for (const [fx, fw, side] of FALLS) {
    const top = Math.round(frontY(fx)) - 1;
    for (let y = top; y < Math.min(HT, top + 120); y++) {
      const fall = y - top;
      // out over the lip in an arc, then straight down, swaying a little
      const out = side * Math.min(6, Math.sqrt(fall) * 1.6);
      const cx = fx + out + Math.sin(fall / 21 + fx) * 0.8;
      const spread = fw + fall * 0.045;
      for (let x = Math.round(cx - spread - 2); x <= Math.round(cx + spread + 2); x++) {
        const u = (x + 0.5 - cx) / spread;
        if (Math.abs(u) > 1) continue;
        const streak = Math.sin((fall - (frame / frames) * 30) * 0.42 + hash2(x - Math.round(out), 0, 261) * 9);
        const edge = smooth(1, 0.5, Math.abs(u));
        const fade = 1 - smooth(18, 96, fall);
        const v = 2.4 + streak * 1.2 + (u < 0 ? 0.9 : -0.3) - smooth(30, 90, fall) * 1.2;
        const keep = clamp(edge * fade * (0.5 + 0.5 * (streak + 1) / 2) * 1.25, 0, 1);
        if (!dith(x, y - frame * 4, keep)) continue;
        b.set(x, y, rampDither(WATER, clamp(v, 0, WATER.length - 1), x, y));
      }
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// architecture
// ---------------------------------------------------------------------------

/** A pointed arch: inside if below the springing line within the span, or under both arcs above it; `k` from round (0) to sharp (1). */
function inArch(x: number, y: number, cx: number, ys: number, w: number, k = 0.6): boolean {
  if (y >= ys) return Math.abs(x - cx) <= w;
  const r = w * (1 + k);
  return Math.hypot(x - (cx - w * k), y - ys) <= r && Math.hypot(x - (cx + w * k), y - ys) <= r;
}

/** Ashlar facing us: courses of stone, joints, a little wear; the light falls off from left to right across [x0, x1]. */
function ashlar(x: number, y: number, x0: number, x1: number, seed: number, base: number, falloff = 2): number {
  const across = (x - x0) / Math.max(1, x1 - x0);
  const course = Math.floor(y / 4);
  const off = (course % 2) * 3;
  const block = Math.floor((x + off) / 7);
  const joint = y % 4 === 3 || (x + off) % 7 === 6;
  return base - across * falloff + (hash2(block, course, seed) - 0.5) * 0.9 + (joint ? -1.4 : 0) + (hash2(x, y, seed + 1) > 0.93 ? -0.7 : 0);
}

/** Paints a pixel in a ramp at value v (clamped). */
function put(b: Bitmap, x: number, y: number, ramp: RGBA[], v: number) {
  b.set(x, y, rampDither(ramp, clamp(v, 0, ramp.length - 1), x, y));
}

/** A slate spire over [x0, x1] at `y`, rising to a point at `tip`: its sunward side lit, the far one in shade, gold ribs, a finial. */
function spireRoof(b: Bitmap, x0: number, x1: number, y: number, tip: number) {
  const cx = (x0 + x1) / 2;
  for (let yy = tip; yy < y; yy++) {
    const k = (yy - tip) / (y - tip);
    const half = ((x1 - x0) / 2 + 1) * k;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = (x + 0.5 - cx) / Math.max(0.5, half);
      const scale = (yy % 3 === 0 ? -0.6 : 0) + (hash2(x, yy, 301) - 0.5) * 0.5;
      put(b, x, yy, SLATE, (u < -0.15 ? 7 : u < 0.35 ? 4.6 : 2.6) + scale);
      if (Math.abs(x + 0.5 - cx) < 0.6 && yy > tip + 1) b.set(x, yy, GOLD[u < 0 ? 4 : 3]);
    }
  }
  // the finial: a gold orb on a spike
  for (let yy = tip - 6; yy < tip; yy++) b.set(Math.round(cx - 0.5), yy, GOLD[4]);
  b.set(Math.round(cx - 0.5), tip - 4, GOLD[5]);
  b.set(Math.round(cx - 1.5), tip - 3, GOLD[3]);
  b.set(Math.round(cx + 0.5), tip - 3, GOLD[2]);
}

/** A lancet window lit from inside by candles: pointed, its glass warm, a mullion down the middle of wider ones. */
function lancet(b: Bitmap, glow: Bitmap, cx: number, ys: number, bottom: number, w: number, warm = true) {
  for (let y = Math.floor(ys - w * 2); y <= bottom; y++) {
    for (let x = Math.floor(cx - w - 1); x <= Math.ceil(cx + w + 1); x++) {
      const inside = inArch(x + 0.5, y + 0.5, cx, ys, w, 0.7);
      const frame = !inside && inArch(x + 0.5, y + 0.5, cx, ys, w + 1, 0.7);
      if (frame) b.set(x, y, STONE[x + 0.5 < cx ? 9 : 5]);
      if (!inside) continue;
      const mull = w > 2 && Math.abs(x + 0.5 - cx) < 0.6;
      if (mull) {
        b.set(x, y, STONE[6]);
        continue;
      }
      const v = (warm ? 2.2 : 1) + (y - ys) / Math.max(1, bottom - ys) * -0.8 + (x + 0.5 < cx ? 0.4 : 0);
      put(b, x, y, warm ? WARM : SLATE, v);
      if (warm) put(glow, x, y, WARM, v + 1.6);
    }
  }
}

/**
 * The Reliquary's rose window, the Loom's rose as on the logo: a ring of gold
 * tracery, six lobes of stained glass round a jewel, spokes between them; the
 * glass in the arcane light's blues and violets, the jewel brightest. `glow`
 * takes the glass at its brightest, for the window's slow breath.
 */
function roseWindow(b: Bitmap, glow: Bitmap, cx: number, cy: number, r: number) {
  const lobes = [...Array(6)].map((_, i) => {
    const a = (i / 6) * TAU - Math.PI / 2;
    return [cx + Math.cos(a) * r * 0.54, cy + Math.sin(a) * r * 0.54] as const;
  });
  const glassRamp = [UIR.arcane, H(['#1a0e3a', '#2e1a66', '#4a2e96', '#6a4ec0', '#a48ae8']), H(['#0a2a34', '#104a56', '#1a6e78', '#2a96a0', '#6ad0d0'])];
  for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++) {
    for (let x = Math.floor(cx - r - 2); x <= Math.ceil(cx + r + 2); x++) {
      const px = x + 0.5, py = y + 0.5;
      const d = Math.hypot(px - cx, py - cy);
      if (d > r + 1.5) continue;
      // the stone surround, then the gold ring
      if (d > r) {
        b.set(x, y, STONE[px < cx ? 10 : 5]);
        continue;
      }
      if (d > r - 1.6) {
        b.set(x, y, GOLD[py < cy - 2 || px < cx - 3 ? 4 : 2]);
        continue;
      }
      // the jewel at the centre, the lobes round it, glass between, gold tracery between the shapes
      const inJewel = d < r * 0.26;
      const lobe = lobes.findIndex(([lx, ly]) => Math.hypot(px - lx, py - ly) < r * 0.3);
      const lobeEdge = lobes.some(([lx, ly]) => Math.abs(Math.hypot(px - lx, py - ly) - r * 0.3) < 0.7);
      const jewelEdge = Math.abs(d - r * 0.26) < 0.7;
      const spoke = !inJewel && lobe < 0 && Math.abs(Math.sin((Math.atan2(py - cy, px - cx) + Math.PI / 2) * 6 / 2 + Math.PI / 2)) < 0.12;
      if (lobeEdge || jewelEdge || spoke) {
        b.set(x, y, GOLD[px < cx ? 3 : 2]);
        continue;
      }
      const ramp = inJewel ? glassRamp[0] : lobe >= 0 ? glassRamp[lobe % 2 === 0 ? 1 : 2] : glassRamp[0];
      const v = inJewel ? 3.4 - d / (r * 0.26) : 1.6 + (1 - d / r) * 1.4 + (hash2(Math.floor(px / 2), Math.floor(py / 2), 311) - 0.5) * 0.8;
      put(b, x, y, ramp, v);
      put(glow, x, y, ramp, v + 1.4);
    }
  }
}

/** The Reliquary: where the soul files are kept (the champions). Its centre and the line it stands on. */
export const REL = { cx: 285, base: 241 };

/**
 * The Reliquary, a cathedral of moonstone facing the plaza: two towers with
 * belfries and slate spires, a gabled nave between them; the rose window
 * high in the facade; a gallery of six small figures in niches under it;
 * a deep portal of three archivolts round a door of dark wood ajar on
 * candlelight, a tympanum of gold; string courses, buttresses with
 * pinnacles; steps down to the plaza. Lit from the upper left.
 */
function reliquary(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  const { cx, base } = REL;
  const LT = [217, 245], RT = [325, 353];
  const wallTop = 150, towerTop = 156, belfry = 131, gableApex = 112;
  // the nave's facade and gable
  for (let y = gableApex; y <= base; y++) {
    for (let x = LT[1]; x < RT[0]; x++) {
      const gable = y < wallTop;
      if (gable && Math.abs(x + 0.5 - cx) > ((y - gableApex) / (wallTop - gableApex)) * (RT[0] - LT[1]) / 2) continue;
      put(b, x, y, STONE, ashlar(x, y, LT[1], RT[0], 321, 9.4, 1.6));
    }
  }
  // the gable's coping, gold-edged, crockets along it
  for (let y = gableApex; y <= wallTop; y++) {
    const half = ((y - gableApex) / (wallTop - gableApex)) * (RT[0] - LT[1]) / 2;
    for (const side of [-1, 1]) {
      const x = Math.round(cx - 0.5 + side * half);
      b.set(x, y, side < 0 ? GOLD[4] : GOLD[2]);
      b.set(x + side, y, STONE[side < 0 ? 11 : 4]);
      if (y % 4 === 0) b.set(x + side * 2, y - 1, STONE[side < 0 ? 12 : 5]);
    }
  }
  // the gable's finial: a gold star on a spike
  for (let y = gableApex - 7; y < gableApex; y++) b.set(cx, y, GOLD[4]);
  for (const [dx, dy] of [[-1, -5], [1, -5], [0, -6], [0, -4]]) b.set(cx + dx, gableApex + dy, GOLD[5]);
  // the towers
  for (const [x0, x1] of [LT, RT]) {
    const left = x0 < cx;
    for (let y = towerTop; y <= base; y++) {
      for (let x = x0; x < x1; x++) put(b, x, y, STONE, ashlar(x, y, x0, x1, 322 + x0, left ? 10.2 : 8.2, 2.4));
    }
    // the side faces: the left tower's west face catches the light, the right tower's east face is in shade
    for (let y = towerTop; y <= base; y++) {
      if (left) for (let x = x0 - 3; x < x0; x++) put(b, x, y, STONE, ashlar(x, y, x0 - 3, x0, 323, 12.2, 0.6));
      else for (let x = x1; x < x1 + 3; x++) put(b, x, y, STONE, ashlar(x, y, x1, x1 + 3, 324, 4.6, 0.8));
    }
    // the belfry: a little narrower, two lancets open on dark, a cornice under it
    const bx0 = x0 + 2, bx1 = x1 - 2;
    for (let y = belfry; y < towerTop; y++) for (let x = bx0; x < bx1; x++) put(b, x, y, STONE, ashlar(x, y, bx0, bx1, 325 + x0, left ? 9.8 : 7.8, 2.4));
    for (const lx of [x0 + 8, x1 - 8]) {
      for (let y = belfry + 6; y < towerTop - 3; y++) {
        for (let x = lx - 3; x <= lx + 2; x++) {
          if (!inArch(x + 0.5, y + 0.5, lx, belfry + 12, 2.5, 0.7)) continue;
          b.set(x, y, y > towerTop - 8 && dith(x, y, 0.4) ? WARM[0] : SLATE[0]);
        }
      }
    }
    for (let x = x0 - (left ? 3 : 0); x < x1 + (left ? 0 : 3); x++) {
      b.set(x, towerTop, GOLD[left ? 4 : 3]);
      b.set(x, towerTop + 1, STONE[left ? 6 : 3]);
      b.set(x, belfry, GOLD[left ? 3 : 2]);
    }
    // pinnacles at the belfry's corners
    for (const px of [bx0, bx1 - 1]) {
      for (let y = belfry - 7; y < belfry; y++) b.set(px, y, STONE[(px < (bx0 + bx1) / 2) === left ? 10 : 5]);
      b.set(px, belfry - 8, GOLD[4]);
    }
    spireRoof(b, bx0 + 3, bx1 - 3, belfry, 99);
    // a tall lancet in each tower, candlelit
    lancet(b, glow, (x0 + x1) / 2, 186, 214, 3.5);
    lancet(b, glow, (x0 + x1) / 2, 228, 234, 1.6);
  }
  // buttresses between towers and nave, with pinnacles over the wall's top
  for (const bx of [LT[1], RT[0] - 3]) {
    for (let y = wallTop - 10; y <= base; y++) for (let x = bx; x < bx + 3; x++) put(b, x, y, STONE, (x === bx ? 11 : x === bx + 1 ? 8 : 5) + (y % 6 === 0 ? -1 : 0));
    b.set(bx + 1, wallTop - 11, GOLD[4]);
  }
  // string courses across the facade, gold-trimmed
  for (const sy of [wallTop, 196, 200]) for (let x = LT[1] + 3; x < RT[0] - 3; x++) {
    b.set(x, sy, sy === 200 ? STONE[5] : GOLD[x < cx ? 4 : 3]);
    if (sy === wallTop) b.set(x, sy + 1, STONE[5]);
  }
  roseWindow(b, glow, cx, 173, 17.5);
  // the gallery: six figures in niches between the courses
  for (let i = 0; i < 6; i++) {
    const nx = cx - 25 + i * 10;
    for (let y = 186; y < 196; y++) for (let x = nx - 3; x <= nx + 3; x++) {
      if (!inArch(x + 0.5, y + 0.5, nx + 0.5, 189, 3, 0.4)) continue;
      b.set(x, y, SLATE[1]);
    }
    // a figure: head, shoulders, robe, lit on its left
    for (let y = 188; y < 196; y++) {
      const half = y < 190 ? 0.9 : y < 192 ? 1.6 : 1.4 + (y - 192) * 0.2;
      for (let x = Math.round(nx - half); x <= Math.round(nx + half); x++) b.set(x, y, STONE[x <= nx ? 9 : 6]);
    }
  }
  // the portal: three archivolts stepping in to the door, the tympanum of gold, the door ajar on candlelight
  const dw = 9, ds = 222;
  for (let y = 190; y <= base; y++) {
    for (let x = cx - 18; x <= cx + 18; x++) {
      const px = x + 0.5, py = y + 0.5;
      for (let k = 3; k >= 1; k--) {
        if (!inArch(px, py, cx + 0.5, ds, dw + k * 3, 0.6)) continue;
        if (inArch(px, py, cx + 0.5, ds, dw + (k - 1) * 3, 0.6)) continue;
        // each archivolt: lit on its upper left, a dark groove on its outer edge
        const groove = !inArch(px, py, cx + 0.5, ds, dw + k * 3 - 1, 0.6);
        put(b, x, y, STONE, groove ? 3 : 10.4 - k * 0.8 + (px < cx ? 1.2 : -1.4));
      }
      if (!inArch(px, py, cx + 0.5, ds, dw, 0.6)) continue;
      if (py < ds) {
        // the tympanum: gold relief of the rose on dark stone
        const d = Math.hypot(px - cx - 0.5, py - ds + 1);
        b.set(x, y, Math.abs(d - 5) < 0.8 || (d < 2) ? GOLD[px < cx ? 4 : 3] : STONE[3]);
      } else if (py < ds + 1.5) b.set(x, y, GOLD[3]);
      else {
        // the doors: dark wood, iron bands, ajar a crack in the middle with candlelight inside
        const crack = Math.abs(px - cx - 0.5) < 1.1;
        if (crack) {
          put(b, x, y, WARM, 3.4 - (y - ds) / 26);
          put(glow, x, y, WARM, 4.8 - (y - ds) / 26);
        } else b.set(x, y, (y - ds) % 6 === 2 ? MAT.iron.ramp[3] : rampDither(MAT.wood.ramp, px < cx ? 2.4 : 1.6, x, y));
      }
    }
  }
  // steps down to the plaza
  for (let s = 0; s < 3; s++) {
    const y0 = base + 1 + s * 2, half = 22 + s * 4;
    for (let y = y0; y < y0 + 2; y++) for (let x = cx - half; x <= cx + half; x++) put(b, x, y, STONE, y === y0 ? 11 - (x - cx + half) / (half * 2) * 2 : 6);
  }
  return { body: b, glow };
}

/** the portal's light: violet and starry, white-gold where the road of light runs into it */
const PORTAL = H(['#0a0620', '#140c38', '#20145a', '#30207e', '#4632a2', '#6250c2', '#8878dc', '#b8acf0', '#e8e4ff']);
const VERD = H(['#0a1a1a', '#10282a', '#18383a', '#22484a', '#2e5c5a', '#3c7068', '#4e8676', '#68a088', '#8abc9e']);
const LEAF = H(['#0c2830', '#12404c', '#1a5c66', '#287c84', '#3c9ea2', '#5cc2bc', '#90e2d4', '#d4fff2']);
const BARK = H(['#08070b', '#100d13', '#18141c', '#211b25', '#2c2430', '#382e3c', '#463a48']);

/** The Starbridge Gate (the campaign): its centre and the line it stands on; the opening where the portal shows. */
export const GATE = { cx: 96, base: 257, spring: 184, inner: 15, outer: 25 };

/**
 * The Starbridge Gate: a freestanding arch on the island's west end, two
 * fluted pillars on plinths, carved capitals ringed in gold, a ring of
 * voussoirs round a pointed opening, a keystone set with a jewel, and over it
 * a pinnacle bearing a gold four-pointed star. The portal inside it is its
 * own looping sprite (`portalFrame`).
 */
function gate(): Bitmap {
  const b = new Bitmap(W, HT);
  const { cx, base, spring, inner, outer } = GATE;
  // plinths, stepped
  for (const [x0, x1] of [[66, 86], [106, 126]]) {
    for (let y = base - 10; y <= base; y++) {
      const step = y > base - 4 ? 1 : 0;
      for (let x = x0 - step; x <= x1 + step; x++) put(b, x, y, STONE, ashlar(x, y, x0, x1, 401, 9.6, 3) + (y === base - 10 || y === base - 4 ? 1.5 : 0));
    }
  }
  // pillars: fluted, lit on their west faces
  for (const [x0, x1] of [[70, 82], [110, 122]]) {
    for (let y = spring - 2; y < base - 10; y++) {
      for (let x = x0; x <= x1; x++) {
        const u = (x - x0) / (x1 - x0);
        const flute = (x - x0) % 3 === 2;
        put(b, x, y, STONE, 11 - u * 5 + (flute ? -1.6 : 0) + (x === x0 ? 1 : 0));
      }
    }
    // capitals ringed in gold
    for (let y = spring - 6; y < spring - 1; y++) for (let x = x0 - 2; x <= x1 + 2; x++) {
      const u = (x - x0 + 2) / (x1 - x0 + 4);
      b.set(x, y, y === spring - 4 ? GOLD[u < 0.4 ? 4 : 2] : rampDither(STONE, 11 - u * 5, x, y));
    }
  }
  // the arch's ring of voussoirs between the opening and the outer curve, radial joints, gold on its inner edge
  for (let y = 120; y < spring; y++) {
    for (let x = cx - outer - 2; x <= cx + outer + 2; x++) {
      const px = x + 0.5, py = y + 0.5;
      const inOuter = inArch(px, py, cx, spring - 2, outer, 0.5);
      const inInner = inArch(px, py, cx, spring - 2, inner, 0.7);
      if (!inOuter || inInner) continue;
      const nearInner = inArch(px, py, cx, spring - 2, inner + 1.3, 0.7);
      const ang = Math.atan2(py - (spring - 2), px - cx);
      const joint = Math.abs(Math.sin(ang * 9)) < 0.1;
      const edge = !inArch(px, py, cx, spring - 2, outer - 1.2, 0.5);
      if (nearInner) b.set(x, y, GOLD[px < cx ? 4 : 2]);
      else put(b, x, y, STONE, (edge ? 6.5 : 10) + (px < cx ? 0.8 : -1.8) + (joint ? -2 : 0));
    }
  }
  // the keystone with its jewel
  const apex = Math.round(spring - 2 - Math.sqrt((inner * 1.7) ** 2 - (inner * 0.7) ** 2));
  for (let y = apex - 9; y <= apex + 1; y++) for (let x = cx - 3; x <= cx + 3; x++) {
    if (Math.abs(x + 0.5 - cx) > 1.5 + (y - apex + 9) * 0.2) continue;
    put(b, x, y, STONE, x + 0.5 < cx ? 12 : 8);
  }
  b.set(cx, apex - 4, RUNE[4]);
  b.set(cx - 1, apex - 4, RUNE[3]);
  b.set(cx, apex - 5, RUNE[3]);
  // the pinnacle over the arch and its four-pointed star of gold
  const top = Math.round(spring - 2 - Math.sqrt((outer * 1.5) ** 2 - (outer * 0.5) ** 2));
  for (let y = top - 12; y <= top + 1; y++) {
    const half = 1 + (y - top + 12) * 0.25;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) put(b, x, y, STONE, x + 0.5 < cx ? 11 : 6);
  }
  const sy = top - 18;
  for (let i = -6; i <= 6; i++) {
    const t = 1 - Math.abs(i) / 7;
    b.set(cx + i, sy, GOLD[t > 0.6 ? 5 : t > 0.3 ? 4 : 3]);
    b.set(cx, sy + i, GOLD[t > 0.6 ? 5 : t > 0.3 ? 4 : 3]);
    if (Math.abs(i) < 3) {
      b.set(cx + i, sy + i, GOLD[2]);
      b.set(cx + i, sy - i, GOLD[2]);
    }
  }
  b.set(cx, sy, hex('#ffffff'));
  return b;
}

/**
 * The portal inside the Gate, one frame of its loop: violet depths full of
 * stars streaming inward to a far bright point, and the Starbridge, a road of
 * light, running from the threshold into that point, its dashes flowing
 * away; the stars and dashes move a whole cycle per loop.
 */
function portalFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const { cx, base, spring, inner } = GATE;
  const vx = cx, vy = spring + 4;
  const ph = frame / frames;
  for (let y = 120; y < base - 10; y++) {
    for (let x = cx - inner; x <= cx + inner; x++) {
      const px = x + 0.5, py = y + 0.5;
      if (!inArch(px, py, cx, spring - 2, inner - 0.6, 0.7)) continue;
      const d = Math.hypot(px - vx, (py - vy) * 1.2);
      // the depths: brighter toward the far point, a slow swirl in them
      const ang = Math.atan2(py - vy, px - vx);
      const swirl = Math.sin(ang * 3 + d * 0.22 - ph * TAU) * 0.6;
      let v = 1.2 + Math.max(0, 1 - d / 26) * 4.2 + swirl * Math.max(0, 1 - d / 30);
      // the road: a band widening from the far point down to the threshold
      const below = py - vy;
      if (below > 0) {
        const half = below * 0.42 + 0.4;
        const u = Math.abs(px - vx) / half;
        if (u < 1) {
          const dash = Math.sin(Math.log(below + 1) * 9 + ph * TAU * 2) > 0.2;
          v = Math.max(v, (u < 0.35 ? 6.6 : 5.2) + (dash ? 1 : 0) - below * 0.02);
        }
      }
      put(b, x, y, PORTAL, v);
    }
  }
  // stars streaming in: each falls toward the point over the loop, a whole number of times
  const r = rng(411);
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU, laps = 1 + Math.floor(r() * 2), p0 = r();
    const t = (p0 + ph * laps) % 1;
    const dist = 30 * (1 - t);
    const x = Math.round(vx + Math.cos(a) * dist), y = Math.round(vy + Math.sin(a) * dist * 0.85);
    if (!inArch(x + 0.5, y + 0.5, cx, spring - 2, inner - 1, 0.7) || y >= base - 10) continue;
    b.set(x, y, PORTAL[t > 0.7 ? 8 : 7]);
  }
  return b;
}

/** The Weaver's Spire (Weaving): its centre, the line it stands on, and where its spool turns. */
export const SPIRE = { cx: 448, base: 247, spoolY: 122 };

/**
 * The Weaver's Spire: a slender octagonal tower, its west faces lit and its
 * east ones in shade, buttress fins at its foot, bands of gold, a candlelit
 * lancet and slits; at its top a gallery of gold columns on a ledge, a cradle
 * for the spool that turns above it (`spoolFrame`).
 */
function spire(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  const { cx, base } = SPIRE;
  const x0 = cx - 11, x1 = cx + 11, top = 152;
  for (let y = top; y <= base; y++) {
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / (x1 - x0);
      // three faces of the octagon: west lit, front, east in shade
      const face = u < 0.2 ? 11.4 : u < 0.8 ? 8.6 - (u - 0.2) * 2 : 4.6;
      const edge = Math.abs(u - 0.2) < 0.03 || Math.abs(u - 0.8) < 0.03;
      put(b, x, y, STONE, face + (y % 5 === 4 ? -1.2 : 0) + (edge ? 1.4 : 0) + (hash2(x, Math.floor(y / 5), 421) - 0.5) * 0.6);
    }
  }
  // buttress fins at the foot
  for (const side of [-1, 1]) {
    for (let y = base - 30; y <= base; y++) {
      const reach = ((y - (base - 30)) / 30) * 7;
      for (let k = 1; k <= reach; k++) {
        const x = side < 0 ? x0 - k : x1 + k;
        put(b, x, y, STONE, side < 0 ? 10.6 - k * 0.2 : 4.2);
      }
    }
  }
  // bands of gold, the ledge and the gallery at the top
  for (const by of [base - 26, 196, 166]) for (let x = x0; x <= x1; x++) b.set(x, by, GOLD[x < cx - 6 ? 5 : x < cx + 6 ? 3 : 2]);
  for (let x = x0 - 3; x <= x1 + 3; x++) {
    b.set(x, top, GOLD[x < cx ? 4 : 2]);
    b.set(x, top + 1, STONE[x < cx ? 7 : 3]);
    b.set(x, top - 13, GOLD[x < cx ? 4 : 2]);
  }
  for (const gx of [x0 - 1, cx - 5, cx, cx + 5, x1 + 1]) for (let y = top - 12; y < top; y++) b.set(gx, y, GOLD[gx < cx ? 4 : gx === cx ? 3 : 2]);
  // a faint arcane light in the gallery, where the spool's thread is spun
  for (let y = top - 12; y < top; y++) for (let x = x0 - 2; x <= x1 + 2; x++) {
    if (A(b.get(x, y))) continue;
    if (dith(x, y, 0.35 - Math.abs(x - cx) / 40)) b.set(x, y, RUNE[1]);
  }
  lancet(b, glow, cx, 214, 228, 3);
  lancet(b, glow, cx, 176, 184, 1.4);
  lancet(b, glow, cx, 238, 241, 1.2, false);
  return { body: b, glow };
}

/**
 * The spool atop the Spire, one frame of its loop: a crystal spool on end in
 * gold caps, its thread of light spiralling round it (the spiral turns one
 * full turn per loop), and an armillary of two gold rings turning round it,
 * the far halves behind the spool, the near halves in front.
 */
function spoolFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const cx = SPIRE.cx, cy = SPIRE.spoolY;
  const ph = (frame / frames) * TAU;
  // the rings: a meridian turning about the upright axis, and a tilted one turning in its own plane (a bead marks it)
  const ringPts = (near: boolean) => {
    const pts: [number, number, RGBA][] = [];
    for (let a = 0; a < TAU; a += 0.02) {
      // the meridian
      const mx = Math.cos(a) * Math.cos(ph) * 17, mz = Math.cos(a) * Math.sin(ph) * 17, my = Math.sin(a) * 17;
      if ((mz > 0) === near) pts.push([cx + mx, cy + my, mz > 0 ? (Math.cos(a) * Math.cos(ph) < 0 ? GOLD[5] : GOLD[3]) : GOLD[1]]);
      // the tilted ring
      const tx = Math.cos(a) * 19, tz = Math.sin(a) * 19;
      const tilt = 0.42;
      const ty = tz * Math.sin(tilt) * 0.38 + tx * 0.18;
      if ((tz > 0) === near) pts.push([cx + tx, cy + ty + 2, tz > 0 ? (tx < 0 ? GOLD[4] : GOLD[3]) : GOLD[1]]);
    }
    return pts;
  };
  for (const [x, y, c] of ringPts(false)) b.set(Math.round(x), Math.round(y), c);
  // the spool: caps of gold, a crystal body, the thread spiralling round it
  for (let y = cy - 13; y <= cy + 13; y++) {
    const capT = y < cy - 9, capB = y > cy + 9;
    const half = capT ? 6 - Math.max(0, cy - 11 - y) * 1.5 : capB ? 6 - Math.max(0, y - cy - 11) * 1.5 : 4.5;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = (x + 0.5 - cx) / Math.max(1, half);
      if (capT || capB) b.set(x, y, GOLD[u < -0.3 ? 5 : u < 0.3 ? 3 : 2]);
      else put(b, x, y, CRYS, 1.6 + (1 - Math.abs(u)) * 1.6 + (u < 0 ? 0.6 : 0));
    }
  }
  for (let k = 0; k <= 80; k++) {
    const t = k / 80;
    const a = t * TAU * 3 + ph;
    const x = cx + Math.sin(a) * 4, y = cy - 8 + t * 16;
    const front = Math.cos(a) > 0;
    b.set(Math.round(x - 0.5), Math.round(y), front ? GTHREAD[4] : GTHREAD[2]);
  }
  for (const [x, y, c] of ringPts(true)) b.set(Math.round(x), Math.round(y), c);
  // the bead on the tilted ring
  const ba = ph * 2;
  const bx = cx + Math.cos(ba) * 19, bz = Math.sin(ba) * 19;
  const by = cy + 2 + bz * Math.sin(0.42) * 0.38 + Math.cos(ba) * 19 * 0.18;
  if (bz > 0) {
    b.set(Math.round(bx), Math.round(by), RUNE[4]);
    b.set(Math.round(bx) + 1, Math.round(by), RUNE[3]);
  }
  return b;
}

/** The Observatory (the Academy): its centre and the line it stands on. */
export const OBS = { cx: 554, base: 251, r: 19, domeY: 184 };

/**
 * The Observatory: a round tower lit on its west, courses of stone, two
 * candlelit lancets, a gallery round it with a gold rail; a dome of green
 * copper ribbed in gold, its slit open to the sky and a great brass telescope
 * reaching out of it toward the upper left; a small gold orrery for a
 * finial; a library wing at its west foot, its round window lit.
 */
function observatory(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  const { cx, base, r, domeY } = OBS;
  // the library wing
  const lx0 = cx - r - 24, lx1 = cx - r + 1, ly = base - 26;
  for (let y = ly; y <= base; y++) for (let x = lx0; x <= lx1; x++) put(b, x, y, STONE, ashlar(x, y, lx0, lx1, 431, 10, 2.6));
  for (let y = ly - 12; y < ly; y++) {
    const k = (y - (ly - 12)) / 12;
    const half = ((lx1 - lx0) / 2 + 2) * k;
    const mid = (lx0 + lx1) / 2;
    for (let x = Math.round(mid - half); x <= Math.round(mid + half); x++) put(b, x, y, SLATE, x < mid ? 6.6 : 3.4);
  }
  for (let y = ly + 6; y <= ly + 14; y++) for (let x = lx0 + 7; x <= lx0 + 15; x++) {
    const d = Math.hypot(x + 0.5 - (lx0 + 11), y + 0.5 - (ly + 10));
    if (d < 4.2) {
      if (d > 3.3) b.set(x, y, GOLD[3]);
      else {
        put(b, x, y, WARM, 3.2 - d * 0.3);
        put(glow, x, y, WARM, 4.6 - d * 0.3);
      }
    }
  }
  // the tower: a cylinder of stone
  for (let y = domeY; y <= base; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const u = (x + 0.5 - cx) / r;
      if (Math.abs(u) > 1) continue;
      const lam = clamp(-u * 0.75 + Math.sqrt(1 - u * u) * 0.55, 0, 1);
      const course = y % 5 === 4 ? -1.1 : 0;
      put(b, x, y, STONE, 3 + lam * 8.6 + course + (hash2(Math.floor((x + (Math.floor(y / 5) % 2) * 3) / 6), Math.floor(y / 5), 432) - 0.5) * 0.7);
    }
  }
  lancet(b, glow, cx - 4, 210, 226, 2.6);
  lancet(b, glow, cx + 7, 232, 244, 1.8);
  // the gallery: a ledge and a gold rail round the tower's top
  for (let x = cx - r - 3; x <= cx + r + 3; x++) {
    const u = (x - cx) / (r + 3);
    b.set(x, domeY + 1, STONE[u < -0.2 ? 11 : u < 0.4 ? 8 : 4]);
    b.set(x, domeY, STONE[u < -0.2 ? 12 : 7]);
    b.set(x, domeY - 4, GOLD[u < -0.2 ? 5 : u < 0.4 ? 3 : 2]);
    if ((x - cx) % 4 === 0) for (let y = domeY - 3; y < domeY; y++) b.set(x, y, GOLD[u < 0 ? 3 : 2]);
  }
  // the dome: green copper, ribs of gold, its slit open toward the upper left
  const dr = r + 1, dry = 20;
  for (let y = domeY - dry; y < domeY - 4; y++) {
    for (let x = cx - dr; x <= cx + dr; x++) {
      const dx = (x + 0.5 - cx) / dr, dy = (y + 0.5 - (domeY - 4)) / dry;
      if (dx * dx + dy * dy > 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
      const lam = clamp(-dx * 0.62 - dy * 0.5 + nz * 0.55, 0, 1);
      // ribs follow the meridians
      const lon = Math.asin(clamp(dx / Math.sqrt(Math.max(0.0001, 1 - dy * dy)), -1, 1));
      const rib = Math.abs(Math.sin(lon * 4)) < 0.1;
      // the slit: a dark band from the crown toward the upper left
      const slit = Math.abs(dx + 0.32 + dy * 0.45) < 0.09 && dy < -0.15;
      if (slit) b.set(x, y, SLATE[0]);
      else if (rib) b.set(x, y, GOLD[lam > 0.6 ? 4 : lam > 0.3 ? 3 : 2]);
      else put(b, x, y, VERD, 1 + lam * 7.2);
    }
  }
  // the telescope: a brass tube out of the slit, its far end ringed and its lens glinting
  const tx0 = cx - 6, ty0 = domeY - 12, tx1 = cx - 34, ty1 = domeY - 36;
  const len = Math.hypot(tx1 - tx0, ty1 - ty0), ux = (tx1 - tx0) / len, uy = (ty1 - ty0) / len;
  for (let t = 0; t <= len; t += 0.4) {
    const half = 2.6 - (t / len) * 0.8 + (t > len - 3 ? 0.8 : 0);
    for (let s = -half; s <= half; s += 0.4) {
      const x = Math.round(tx0 + ux * t - uy * s), y = Math.round(ty0 + uy * t + ux * s);
      const ring = t > len - 3 || Math.abs(t - len * 0.45) < 0.8;
      b.set(x, y, ring ? GOLD[s < 0 ? 5 : 3] : rampDither(MAT.gold.ramp, 3.4 - s * 0.55, x, y));
    }
  }
  b.set(Math.round(tx1 + ux), Math.round(ty1 + uy), hex('#ffffff'));
  // the finial: a gold orrery, a tiny ringed sphere on a spike
  for (let y = domeY - dry - 8; y < domeY - dry + 1; y++) b.set(cx, y, GOLD[4]);
  for (let dx = -3; dx <= 3; dx++) b.set(cx + dx, domeY - dry - 6 + Math.round(dx * 0.3), GOLD[dx < 0 ? 4 : 2]);
  b.set(cx, domeY - dry - 7, RUNE[4]);
  b.set(cx, domeY - dry - 6, RUNE[3]);
  return { body: b, glow };
}

/** The astrolabe (the options): a rock drifting off the island's east end, a pedestal, an armillary turning on it. */
export const ASTRO = { cx: 606, rockY: 318, sphereY: 286 };

/** The astrolabe's rock and pedestal: a chunk of the island's stone, grass on top, a crystal under it. */
function astroRock(): Bitmap {
  const b = new Bitmap(W, HT);
  const { cx, rockY } = ASTRO;
  for (let x = cx - 22; x <= cx + 22; x++) {
    const u = (x - cx) / 22;
    const top = rockY + Math.round((n1(x, 7, 441) - 0.5) * 2), bot = rockY + Math.round(22 * Math.pow(1 - u * u, 1.3) + (vnoise(x, 0, 4, 442) - 0.5) * 4);
    for (let y = top; y <= bot; y++) {
      const depth = (y - top) / Math.max(1, bot - top);
      if (y - top < 2) b.set(x, y, GRASS[y === top ? 7 : 4]);
      else put(b, x, y, ROCK, 7.4 - depth * 4.6 - u * 1.6 + (hash2(x, Math.floor(y / 3), 443) - 0.5) * 0.8);
    }
  }
  crystal(b, cx + 2, rockY + 18, Math.PI / 2 + 0.15, 9, 2);
  crystal(b, cx - 6, rockY + 14, Math.PI / 2 - 0.3, 5, 1.5);
  // the pedestal: a short column with a gold band, a dish at its top
  for (let y = ASTRO.sphereY + 12; y < rockY; y++) for (let x = cx - 3; x <= cx + 3; x++) put(b, x, y, STONE, x < cx ? 11 : x === cx ? 8 : 5);
  for (let x = cx - 5; x <= cx + 5; x++) {
    b.set(x, ASTRO.sphereY + 12, GOLD[x < cx ? 4 : 2]);
    b.set(x, rockY - 1, STONE[x < cx ? 10 : 5]);
  }
  return b;
}

/** The armillary on the pedestal, one frame: three rings of gold round a glowing core, two turning a whole turn per loop. */
function astroFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const cx = ASTRO.cx, cy = ASTRO.sphereY;
  const ph = (frame / frames) * TAU;
  const pts: [number, number, number, RGBA][] = [];
  for (let a = 0; a < TAU; a += 0.03) {
    // the horizon ring, fixed, seen from a little above
    pts.push([cx + Math.cos(a) * 10, cy + Math.sin(a) * 3.2, Math.sin(a), GOLD[Math.sin(a) > 0 ? 4 : 2]]);
    // a meridian turning about the upright axis
    const mx = Math.cos(a) * Math.cos(ph) * 10, mz = Math.cos(a) * Math.sin(ph) * 10;
    pts.push([cx + mx, cy + Math.sin(a) * 10, mz / 10, GOLD[mz > 0 ? (mx < 0 ? 5 : 3) : 1]]);
    // the ecliptic, tilted, turning the other way
    const e = a - ph;
    const ex = Math.cos(e) * 9, ez = Math.sin(e) * 9;
    pts.push([cx + ex, cy + ez * 0.32 + ex * 0.4, ez / 9, GOLD[ez > 0 ? 4 : 1]]);
  }
  for (const [x, y, z, c] of pts) if (z <= 0) b.set(Math.round(x), Math.round(y), c);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) b.set(cx + dx, cy + dy, Math.abs(dx) + Math.abs(dy) === 0 ? RUNE[4] : Math.abs(dx) + Math.abs(dy) === 1 ? RUNE[3] : RUNE[1]);
  for (const [x, y, z, c] of pts) if (z > 0) b.set(Math.round(x), Math.round(y), c);
  return b;
}

/**
 * The Herald's Board (the challenges): a rock drifting off the island's west
 * end, as the astrolabe's drifts off its east, carrying a notice board under a
 * little slate roof with a star for its finial; notes pinned to its planks, a
 * scroll tied with a red ribbon, a note stamped with a gold star that glows;
 * a lantern hung at its side and a pennant of the Loom's cloth on a pole.
 */
export const HERALD = { cx: 30, rockY: 308 };

const WOOD = H(['#1c1018', '#2c1a1c', '#40261f', '#563425', '#6e452c', '#885a36', '#a47244', '#c08c58']);
const PARCH = H(['#3e3230', '#5e4e44', '#86725e', '#ac977a', '#cdb994', '#e6d7b2', '#f6ecd2']);
const WAX = H(['#3a0a10', '#7a1418', '#b42a24', '#e0573e', '#f8946c']);

/** The board's rock: a chunk of the island's stone, grass and a few glowing flowers on top, crystals under it. */
function heraldRock(): Bitmap {
  const b = new Bitmap(W, HT);
  const { cx, rockY } = HERALD;
  const R = 25;
  for (let x = cx - R; x <= cx + R; x++) {
    const u = (x - cx) / R;
    const top = rockY + Math.round((n1(x, 7, 491) - 0.5) * 2), bot = rockY + Math.round(25 * Math.pow(1 - u * u, 1.2) + (vnoise(x, 0, 4, 492) - 0.5) * 5);
    for (let y = top; y <= bot; y++) {
      const depth = (y - top) / Math.max(1, bot - top);
      if (y - top < 2) b.set(x, y, GRASS[y === top ? 7 : 4]);
      else put(b, x, y, ROCK, 7.4 - depth * 4.6 - u * 1.6 + (hash2(x, Math.floor(y / 3), 493) - 0.5) * 0.8);
    }
    if (Math.abs(u) < 0.9 && hash2(x, 0, 494) > 0.82) b.set(x, top - 1, GRASS[8]);
    if (Math.abs(u) < 0.8 && hash2(x, 1, 495) > 0.9) b.set(x, top, FLOWER[hash2(x, 2, 496) > 0.5 ? 1 : 3]);
  }
  crystal(b, cx - 4, rockY + 20, Math.PI / 2 + 0.1, 10, 2.2);
  crystal(b, cx + 9, rockY + 15, Math.PI / 2 - 0.25, 6, 1.6);
  crystal(b, cx - 15, rockY + 11, Math.PI / 2 + 0.35, 5, 1.4);
  return b;
}

/** A note pinned to the planks: parchment, darker at its right and lower edges, lines of writing. */
function note(b: Bitmap, nx: number, ny: number, w: number, h: number, seed: number) {
  for (let y = ny; y < ny + h; y++) {
    for (let x = nx; x < nx + w; x++) {
      const edge = x === nx + w - 1 || y === ny + h - 1;
      put(b, x, y, PARCH, (edge ? 3.3 : 5.3) - ((x - nx) / w) * 0.9 + (hash2(x, y, seed) - 0.5) * 0.6);
    }
  }
  for (let y = ny + 2; y < ny + h - 2; y += 2) {
    const end = nx + w - 2 - (y + 4 >= ny + h ? Math.floor(w / 3) : 0);
    for (let x = nx + 1; x < end; x++) if (hash2(x, y, seed + 1) > 0.25) b.set(x, y, PARCH[2]);
  }
}

/** The board: two posts, planks in a frame, a rail under them, the roof and its star, the notes, the lantern's iron, the pennant's pole; the lantern's glass and the star stamp also lit in `glow`. */
function heraldBoard(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  const { cx, rockY: g } = HERALD;
  // the posts: squared timbers, lit on their west faces
  for (const px of [cx - 15, cx + 13]) {
    for (let y = g - 46; y < g; y++) {
      for (let x = px; x < px + 3; x++) put(b, x, y, WOOD, (x === px ? 5.4 : x === px + 1 ? 3.8 : 2.2) + (hash2(x, Math.floor(y / 4), 501) - 0.5) * 0.6 - (y > g - 4 ? 0.8 : 0));
    }
  }
  // the pole for the pennant, rising out of the west post, a gold knob on it
  for (let y = g - 60; y < g - 46; y++) b.set(cx - 14, y, WOOD[y < g - 56 ? 6 : 5]);
  b.set(cx - 14, g - 61, GOLD[5]);
  b.set(cx - 15, g - 60, GOLD[3]);
  b.set(cx - 13, g - 60, GOLD[2]);
  // the planks in their frame
  const x0 = cx - 12, x1 = cx + 12, y0 = g - 38, y1 = g - 15;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const frame = x === x0 || x === x1 || y === y0 || y === y1;
      const seam = (y - y0) % 5 === 0;
      const across = (x - x0) / (x1 - x0);
      put(b, x, y, WOOD, frame ? 2.6 - across * 0.8 : seam ? 2.4 : 4.9 - across * 1.5 + (vnoise(x * 0.5, y * 3, 3, 502) - 0.5) * 1.2);
    }
  }
  for (let x = x0 + 1; x < x1; x++) b.set(x, y0 + 1, WOOD[2]);
  // a rail under the board
  for (let x = cx - 13; x <= cx + 13; x++) {
    b.set(x, g - 11, WOOD[x < cx ? 5 : 4]);
    b.set(x, g - 10, WOOD[2]);
  }
  // the roof: a gable of slate, lit on its west slope, edged in gold
  const ey = g - 43, ay = g - 53, half0 = 19;
  for (let y = ay; y <= ey; y++) {
    const half = 1 + (half0 - 1) * ((y - ay) / (ey - ay));
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const off = x + 0.5 - cx;
      const edge = Math.abs(off) > half - 1.2 || y === ey;
      if (edge) b.set(x, y, y === ey ? GOLD[off < 0 ? 3 : 2] : GOLD[off < 0 ? 5 : 3]);
      else put(b, x, y, SLATE, (off < 0 ? 6.6 : 3.4) + ((y - ay) % 3 === 2 ? -0.9 : 0) + (hash2(Math.floor(x / 2), y, 503) - 0.5) * 0.5);
    }
  }
  for (let x = cx - half0 + 1; x <= cx + half0 - 1; x++) b.set(x, ey + 1, SLATE[1]);
  // the finial: a gold diamond with a white heart on a short spike, a star of its own
  const sy = ay - 4;
  for (let y = sy + 2; y < ay; y++) b.set(cx, y, GOLD[3]);
  for (const [dx, dy, c] of [[0, -2, 5], [-1, -1, 5], [0, -1, 4], [1, -1, 3], [-2, 0, 4], [-1, 0, 5], [1, 0, 3], [2, 0, 2], [-1, 1, 4], [0, 1, 3], [1, 1, 2], [0, 2, 3]] as const) b.set(cx + dx, sy + dy, GOLD[c]);
  b.set(cx, sy, STAR[4]);
  for (const [dx, dy] of [[0, 0], [0, -1], [-1, 0]] as const) put(glow, cx + dx, sy + dy, GTHREAD, dx || dy ? 3 : 4);
  // the notes: a sealed letter, a pinned one, a scroll tied with a ribbon, one stamped with a gold star
  note(b, cx - 11, g - 36, 9, 11, 511);
  for (const [dx, dy, c] of [[0, 0, 2], [1, 0, 3], [0, 1, 1], [1, 1, 2], [0, 2, 1]] as const) b.set(cx - 8 + dx, g - 27 + dy, WAX[c]);
  note(b, cx, g - 37, 9, 8, 512);
  b.set(cx + 4, g - 37, GOLD[5]);
  b.set(cx + 4, g - 36, GOLD[2]);
  for (let y = g - 27; y <= g - 18; y++) {
    for (let x = cx + 4; x <= cx + 9; x++) {
      const roll = y === g - 27 || y === g - 18;
      if (roll) b.set(x, y, PARCH[x === cx + 4 ? 5 : x === cx + 9 ? 2 : 4]);
      else put(b, x, y, PARCH, 5 - ((x - cx - 4) / 6) * 1.2 + (hash2(x, y, 513) - 0.5) * 0.5);
    }
  }
  for (let x = cx + 3; x <= cx + 10; x++) b.set(x, g - 23, WAX[x === cx + 3 ? 3 : 2]);
  b.set(cx + 10, g - 22, WAX[1]);
  b.set(cx + 10, g - 21, WAX[1]);
  note(b, cx - 6, g - 23, 8, 6, 514);
  const tx = cx - 3, ty = g - 21;
  for (const [dx, dy, v] of [[0, 0, 5], [-1, 0, 3], [1, 0, 3], [0, -1, 3], [0, 1, 3]] as const) {
    b.set(tx + dx, ty + dy, GOLD[v]);
    put(glow, tx + dx, ty + dy, GTHREAD, v === 5 ? 4 : 3);
  }
  // the lantern: an iron arm out of the east post, the lantern hung on it, its glass warm
  const lx = cx + 20;
  for (let x = cx + 16; x <= lx; x++) b.set(x, g - 38, MAT.iron.ramp[x < lx ? 3 : 2]);
  b.set(lx, g - 37, MAT.iron.ramp[2]);
  for (let y = g - 36; y <= g - 30; y++) {
    for (let x = lx - 2; x <= lx + 2; x++) {
      const edge = x === lx - 2 || x === lx + 2 || y === g - 36 || y === g - 30;
      if (edge) b.set(x, y, MAT.iron.ramp[x < lx ? 3 : 1]);
      else {
        put(b, x, y, WARM, 3.4 - (x - lx) * 0.4);
        put(glow, x, y, WARM, 5);
      }
    }
  }
  b.set(lx, g - 29, MAT.iron.ramp[2]);
  return { body: b, glow };
}

/** The pennant of the Loom's cloth, one frame of its slow flutter: a wave runs to its swallowtail, a whole cycle per loop. */
function pennantFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const { cx, rockY: g } = HERALD;
  const ph = (frame / frames) * TAU;
  const hx = cx - 15, hy = g - 59;
  const len = 13;
  for (let i = 0; i < len; i++) {
    const t = i / (len - 1);
    const x = hx - i;
    const wave = Math.sin(t * 2.6 - ph) * 1.3 * t;
    const slope = Math.cos(t * 2.6 - ph) * t;
    const h = 5 - t * 1.6;
    const top = hy + wave + (5 - h) / 2;
    for (let y = Math.round(top); y < Math.round(top + h); y++) {
      const mid = top + h / 2;
      if (t > 0.7 && Math.abs(y + 0.5 - mid) < (t - 0.7) * 5) continue;
      put(b, x, y, VEIL, 3.4 + slope * 1.4 + (y === Math.round(top) ? 1.6 : 0) - (y === Math.round(top + h) - 1 ? 1 : 0));
    }
  }
  return b;
}

/**
 * A star-willow between the Gate and the Reliquary: a dark twisted trunk, and
 * from its crown long strands falling in arcs like a fountain, hung with
 * pale leaves that catch the starlight, glowing at their tips.
 */
function starWillow(cx: number, base: number, height: number, seed: number): Bitmap {
  const b = new Bitmap(W, HT);
  const r = rng(seed);
  const crownY = base - height;
  // the trunk, a little twisted, lit on its left
  for (let y = crownY + 2; y <= base; y++) {
    const k = (y - crownY) / height;
    const off = Math.sin(k * 5 + seed) * 1.6;
    const half = 1.2 + k * 1.6;
    for (let x = Math.round(cx + off - half); x <= Math.round(cx + off + half); x++) put(b, x, y, BARK, x < cx + off ? 5 : 2.4);
  }
  for (const side of [-1, 1]) for (let k = 0; k < 4; k++) b.set(Math.round(cx + side * (2 + k)), base - k + 1, BARK[3]);
  // the strands: arcs from the crown out and down, leaves along them
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const reach = 10 + r() * 18, drop = height * (0.55 + r() * 0.4), lift = 4 + r() * 6;
    for (let t = 0; t <= 1; t += 0.02) {
      const x = cx + side * reach * Math.sin(t * Math.PI * 0.6) + (r() - 0.5) * 0.3;
      const y = crownY - lift * Math.sin(t * Math.PI * 0.8) + drop * Math.pow(t, 1.8);
      const leaf = hash2(Math.round(x), Math.round(y), seed + 1);
      const v = 2 + (1 - t) * 1.5 + (side < 0 ? 1.2 : 0) + (leaf - 0.5) * 2;
      b.set(Math.round(x), Math.round(y), rampDither(LEAF, clamp(v, 0, LEAF.length - 1), Math.round(x), Math.round(y)));
      if (leaf > 0.8) b.set(Math.round(x) + side, Math.round(y), LEAF[Math.min(LEAF.length - 1, Math.round(v) + 1)]);
    }
    const tx = cx + side * reach * Math.sin(Math.PI * 0.6), ty = crownY - lift * Math.sin(Math.PI * 0.8) + drop;
    if (r() < 0.6) b.set(Math.round(tx), Math.round(ty) + 1, LEAF[7]);
  }
  return b;
}

/** Lanterns on posts at the plaza's edges: an iron post, a lantern with warm glass. */
export const LANTERNS: [number, number][] = [[198, 258], [376, 256]];
function lanterns(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  for (const [x, y] of LANTERNS) {
    for (let yy = y - 18; yy <= y; yy++) b.set(x, yy, MAT.iron.ramp[yy < y - 14 ? 3 : 2]);
    b.set(x - 1, y, MAT.iron.ramp[2]);
    b.set(x + 1, y, MAT.iron.ramp[1]);
    for (let yy = y - 24; yy < y - 18; yy++) for (let xx = x - 2; xx <= x + 2; xx++) {
      const edge = xx === x - 2 || xx === x + 2 || yy === y - 24;
      if (edge) b.set(xx, yy, MAT.iron.ramp[xx < x ? 3 : 1]);
      else {
        put(b, xx, yy, WARM, 3.4 - (xx - x) * 0.4);
        put(glow, xx, yy, WARM, 5);
      }
    }
    b.set(x, y - 25, MAT.iron.ramp[3]);
  }
  return { body: b, glow };
}

/** Fragments of the rim's break drifting near it: short pieces of the gold band, runes and all. */
export const FRAGMENTS: [number, number, number, number][] = [
  // x, y, length, angle
  [536, 52, 11, 0.5],
  [566, 70, 8, 1.1],
  [592, 44, 6, -0.4],
];
function fragment(len: number, ang: number): Bitmap {
  const s = 24;
  const b = new Bitmap(s, s);
  const c = s / 2, ux = Math.cos(ang), uy = Math.sin(ang);
  for (let t = -len / 2; t <= len / 2; t += 0.4) {
    for (let w = -2.2; w <= 2.2; w += 0.4) {
      const x = Math.round(c + ux * t - uy * w), y = Math.round(c + uy * t + ux * w);
      const jag = Math.abs(t) > len / 2 - 1 && hash2(Math.round(w * 3), Math.round(t), 451) > 0.5;
      if (jag) continue;
      b.set(x, y, w < -1.4 ? GOLD[5] : w > 1.4 ? GOLD[1] : Math.abs(w) < 0.6 && Math.round(t * 2) % 3 === 0 ? RUNE[3] : GOLD[3]);
    }
  }
  return outline(b, GOLD[0]);
}

/** the cloth of the Loom, as the veils waving from Zone 1's rift (tools/art/zones/zone1.ts VEIL): one world */
const VEIL = H(['#1a1658', '#26287a', '#33409c', '#4660bc', '#6488d6', '#8cb2ea', '#bcdaf8', '#eef8ff']);

/**
 * Veils of the Loom's cloth streaming from the rim's two broken ends,
 * unravelling: one rising toward the corner, one falling across the planet.
 * Gigantic, so they wave slowly. Paths in screen pixels.
 */
const VEILS = [
  { path: [ringAt(RIM, BREAK[0] - 0.01), [548, 22], [570, 14], [596, 10], [622, 9]] as [number, number][], width: 11, amp: 5, waves: 1.2, twists: 1, seed: 481 },
  { path: [ringAt(RIM, BREAK[1] + 0.01), [592, 72], [606, 92], [616, 116], [622, 142]] as [number, number][], width: 13, amp: 6, waves: 1.3, twists: 1.1, seed: 482 },
];

/** A point on a Catmull-Rom curve through `p` at s (0..1). */
function catmull(p: [number, number][], s: number): [number, number] {
  const n = p.length - 1, f = Math.min(n - 1e-6, s * n), i = Math.floor(f), t = f - i;
  const P = (k: number) => p[Math.max(0, Math.min(n, k))];
  const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
  const c = (a: number, b: number, cc: number, d: number) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t * t + (-a + 3 * b - 3 * cc + d) * t * t * t);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
}

/**
 * A veil, one frame of its loop: the wave travels from the root to the free
 * end and the cloth twists, each a whole cycle per loop; the sky shows
 * through it except along its hems; stars woven into it ride with it.
 */
function veilFrame(v: (typeof VEILS)[number], frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const ph = (frame / frames) * TAU;
  const r = rng(v.seed);
  const stars = Array.from({ length: 14 }, () => [r(), r() * 2 - 1, r()] as const);
  const steps = 700;
  for (let k = 0; k <= steps; k++) {
    const s = k / steps;
    const [px, py] = catmull(v.path, s);
    const [qx, qy] = catmull(v.path, Math.min(1, s + 0.002));
    const tl = Math.hypot(qx - px, qy - py) || 1;
    const nx = -(qy - py) / tl, ny = (qx - px) / tl;
    const off = v.amp * Math.pow(s, 1.1) * Math.sin(TAU * v.waves * s - ph);
    const tw = Math.cos(TAU * v.twists * s - ph);
    const wid = v.width * (0.45 + 0.55 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15)), 0.6)) * (1 - 0.85 * Math.pow(s, 3)) * (0.3 + 0.7 * Math.abs(tw));
    const front = tw >= 0;
    const cx = px + nx * off, cy = py + ny * off;
    for (let a = -wid / 2; a <= wid / 2; a += 0.5) {
      const x = Math.round(cx + nx * a), y = Math.round(cy + ny * a);
      const across = Math.abs(a) / Math.max(0.5, wid / 2);
      const edge = across > 0.78;
      if (!edge && !dith(x, y, 0.72 - s * 0.3)) continue;
      put(b, x, y, VEIL, (front ? 4 : 2.2) + (edge ? 2 : 0) - across * 0.8 + (1 - s) * 0.8);
    }
    for (const [ss, aa, br] of stars) {
      if (Math.abs(ss - s) > 0.5 / steps || wid < 3) continue;
      b.set(Math.round(cx + nx * aa * wid * 0.35), Math.round(cy + ny * aa * wid * 0.35), br > 0.6 ? VEIL[7] : VEIL[6]);
    }
  }
  return b;
}

/** Rocks drifting round the island: a chunk of its stone with grass on top. */
export const ROCKS: [number, number, number][] = [
  // x, y, radius
  [24, 204, 7],
  [138, 318, 5],
  [478, 334, 6],
  [628, 214, 5],
];
function floatingRock(rad: number, seed: number): Bitmap {
  const s = rad * 2 + 6;
  const b = new Bitmap(s, s + 6);
  const c = s / 2;
  for (let x = 0; x < s; x++) {
    const u = (x + 0.5 - c) / rad;
    if (Math.abs(u) > 1) continue;
    const top = Math.round(c - 1 + (hash2(x, 0, seed) - 0.5) * 1.5), bot = Math.round(c + rad * 1.3 * Math.pow(1 - u * u, 0.9));
    for (let y = top; y <= bot; y++) {
      if (y - top < 1) b.set(x, y, GRASS[6]);
      else put(b, x, y, ROCK, 7 - ((y - top) / (bot - top + 1)) * 4.4 - u * 1.4);
    }
  }
  return b;
}

/** The golden thread: from the spool's top up to the rim's break, where the Weaver's Spire mends it; a quadratic curve that dips under the title. */
export const THREAD_CURVE: [number, number][] = [[SPIRE.cx, SPIRE.spoolY - 15], [530, 112], [553, 43]];
function goldenThread(b: Bitmap): [number, number][] {
  const [[x0, y0], [qx, qy], [x1, y1]] = THREAD_CURVE;
  const pts: [number, number][] = [];
  const n = 400;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * qx + t * t * x1;
    const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * qy + t * t * y1;
    const ix = Math.round(x), iy = Math.round(y);
    if (dith(ix - 1, iy, 0.55)) blendSky(b, ix - 1, iy, GTHREAD[1]);
    if (dith(ix + 1, iy, 0.55)) blendSky(b, ix + 1, iy, GTHREAD[0]);
    b.set(ix, iy, i % 11 < 2 ? GTHREAD[4] : GTHREAD[3]);
    if (i % 20 === 0) pts.push([ix, iy]);
  }
  // where it meets the break, a knot of light
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const d = Math.abs(dx) + Math.abs(dy);
    if (d > 3) continue;
    if (d === 0 || dith(x1 + dx, y1 + dy, 1 - d / 4)) b.set(x1 + dx, y1 + dy, d === 0 ? GTHREAD[4] : d === 1 ? GTHREAD[3] : GTHREAD[2]);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

type Rect4 = [number, number, number, number];
type Layer = 'far' | 'island' | 'building' | 'front';

/** A sprite of the scene as the runtime draws it (src/game/view/sanctum.ts). */
export interface MenuSprite {
  /** its frames in scene.png */
  frames: Rect4[];
  /** top-left on the screen */
  x: number;
  y: number;
  /** far: drifting in the sky | island | building | front: before the champions */
  layer: Layer;
  /** static | loop: the frames in turn, `ms` each | pulse: frame 0 breathes over what lies under it, one breath every `ms` */
  mode: 'static' | 'loop' | 'pulse';
  ms?: number;
  /** drifts up and down `amp` px, once every `ms`, from `phase` (0..1) */
  bob?: { amp: number; ms: number; phase: number };
}

/** A place to click: the sprites that make it (their pixels are what the pointer hits), its hover outline, where its label hangs. */
export interface MenuHotspot {
  id: 'campaign' | 'champions' | 'weaving' | 'academy' | 'options' | 'challenges';
  /** the place's name in the sanctum (a first take) */
  name: string;
  sprites: string[];
  /** the outline in scene.png and its top-left on the screen; it bobs with `sprites[0]` */
  outline: Rect4;
  ox: number;
  oy: number;
  /** the label's centre and top */
  label: [number, number];
}

export interface SanctumJson {
  sprites: Record<string, MenuSprite>;
  /** the draw order, back to front, within each layer */
  order: string[];
  hotspots: MenuHotspot[];
  /** where champions stand (their feet) and which way they face */
  spots: { x: number; y: number; facing: 'L' | 'R' }[];
  /** stars that twinkle: x, y, size */
  twinkles: [number, number, number][];
  /** the Loom's rings, for glints sliding along them */
  rings: Ring[];
  /** the rim's break (angles), where no glint shows */
  rimBreak: number[];
  /** the warp threads as polylines, for light running along them */
  warp: [number, number][][];
  /** the golden thread from the spool to the break, sampled */
  thread: [number, number][];
  /** where the waterfalls leave the lip, for their spray */
  falls: [number, number][];
  /** the portal's far point, where its motes stream */
  portal: [number, number];
  /** pools of light that breathe: centre, radii, colour, strength, breaths a second (radians) */
  lights: { x: number; y: number; rx: number; ry: number; rgb: [number, number, number]; k: number; rate: number }[];
}

/** Puts a small bitmap onto a screen-sized one at (x, y). */
function at(bmp: Bitmap, x: number, y: number): Bitmap {
  const b = new Bitmap(W, HT);
  b.blit(bmp, Math.round(x), Math.round(y));
  return b;
}

/** Two rings of light round a mask's silhouette: bright gold just outside it, a dimmer one beyond. */
function outlineOf(mask: Bitmap): Bitmap {
  const o = new Bitmap(W, HT);
  const solid = (x: number, y: number) => mask.inside(x, y) && A(mask.get(x, y)) > 0;
  for (let y = 0; y < HT; y++) {
    for (let x = 0; x < W; x++) {
      if (solid(x, y)) continue;
      let near = false, far = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (solid(x + dx, y + dy)) near = true;
      if (!near) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (solid(x + dx, y + dy)) far = true;
      if (near) o.set(x, y, hex('#ffe070'));
      else if (far) o.set(x, y, hex('#a8701e'));
    }
  }
  return o;
}

export function buildSanctum(out: string) {
  TWINKLES.length = 0;
  WARP.length = 0;
  const sky = skyImage();
  const dir = path.join(out, 'menu');
  // every element painted in screen space, frames of one sprite cropped to one rect
  const defs: { key: string; frames: Bitmap[]; layer: Layer; mode: MenuSprite['mode']; ms?: number; bob?: MenuSprite['bob'] }[] = [];
  const add = (key: string, frames: Bitmap[], layer: Layer, mode: MenuSprite['mode'] = 'static', ms?: number, bob?: MenuSprite['bob']) => defs.push({ key, frames, layer, mode, ms, bob });
  const loopFrames = (n: number, make: (i: number, n: number) => Bitmap) => [...Array(n)].map((_, i) => make(i, n));
  // the Loom's cloth unravelling from the break: gigantic, so a wave takes almost five seconds
  VEILS.forEach((v, i) => add(`veil${i}`, loopFrames(16, (f, n) => veilFrame(v, f, n)), 'far', 'loop', 300));
  FRAGMENTS.forEach(([x, y, len, ang], i) => add(`fragment${i}`, [at(fragment(len, ang), x - 12, y - 12)], 'far', 'static', undefined, { amp: 1.5, ms: 9000 + i * 2300, phase: i * 0.31 }));
  ROCKS.forEach(([x, y, rad], i) => add(`rock${i}`, [at(floatingRock(rad, 461 + i), x - rad - 3, y - rad - 3)], 'far', 'static', undefined, { amp: 2, ms: 7000 + i * 1700, phase: i * 0.27 }));
  add('island', [island()], 'island');
  add('falls', loopFrames(8, falls), 'island', 'loop', 110);
  add('willow', [starWillow(176, 246, 46, 471)], 'island');
  const lamps = lanterns();
  add('lanterns', [lamps.body], 'island');
  add('lanterns_glow', [lamps.glow], 'island', 'pulse', 3400);
  add('gate', [gate()], 'building');
  add('portal', loopFrames(12, portalFrame), 'building', 'loop', 180);
  const rel = reliquary();
  add('reliquary', [rel.body], 'building');
  add('reliquary_glow', [rel.glow], 'building', 'pulse', 5200);
  const sp = spire();
  add('spire', [sp.body], 'building');
  add('spire_glow', [sp.glow], 'building', 'pulse', 4100);
  add('spool', loopFrames(16, spoolFrame), 'building', 'loop', 190);
  const ob = observatory();
  add('observatory', [ob.body], 'building');
  add('observatory_glow', [ob.glow], 'building', 'pulse', 4700);
  const astroBob = { amp: 2, ms: 6400, phase: 0.6 };
  add('astro_rock', [astroRock()], 'front', 'static', undefined, astroBob);
  add('astro', loopFrames(12, astroFrame), 'front', 'loop', 230, astroBob);
  // the Herald's Board drifts on its own pace
  const heraldBob = { amp: 2, ms: 7400, phase: 0.15 };
  add('herald_rock', [heraldRock()], 'front', 'static', undefined, heraldBob);
  const board = heraldBoard();
  add('herald', [board.body], 'front', 'static', undefined, heraldBob);
  add('herald_glow', [board.glow], 'front', 'pulse', 3000, heraldBob);
  add('herald_flag', loopFrames(10, pennantFrame), 'front', 'loop', 220, heraldBob);

  const items: { key: string; bmp: Bitmap }[] = [];
  const sprites: Record<string, MenuSprite> = {};
  const placed: Record<string, { x: number; y: number; frames: Bitmap[] }> = {};
  for (const d of defs) {
    let bx0 = W, by0 = HT, bx1 = 0, by1 = 0;
    for (const f of d.frames) {
      const r = f.bounds();
      if (!r) continue;
      bx0 = Math.min(bx0, r.x);
      by0 = Math.min(by0, r.y);
      bx1 = Math.max(bx1, r.x + r.w);
      by1 = Math.max(by1, r.y + r.h);
    }
    if (bx1 <= bx0) throw new Error(`menu: sprite ${d.key} is empty`);
    const rect = { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 };
    const crops = d.frames.map((f) => f.crop(rect));
    crops.forEach((c, i) => items.push({ key: `${d.key}/${i}`, bmp: c }));
    placed[d.key] = { x: rect.x, y: rect.y, frames: d.frames };
    sprites[d.key] = { frames: [], x: rect.x, y: rect.y, layer: d.layer, mode: d.mode, ...(d.ms ? { ms: d.ms } : {}), ...(d.bob ? { bob: d.bob } : {}) };
  }
  // the places to click: their silhouettes (frame 0 of their sprites) make the outline
  // the labels hang on the island's face just under its lip, below their places (and below the champions on the plaza)
  const lip = (x: number): [number, number] => [x, Math.round(frontY(x)) + 3];
  const spotsDef: { id: MenuHotspot['id']; name: string; sprites: string[]; label: [number, number] }[] = [
    { id: 'campaign', name: 'The Starbridge Gate', sprites: ['gate', 'portal'], label: lip(GATE.cx + 16) },
    { id: 'champions', name: 'The Reliquary', sprites: ['reliquary'], label: lip(REL.cx) },
    { id: 'weaving', name: "The Weaver's Spire", sprites: ['spire', 'spool'], label: lip(SPIRE.cx - 10) },
    { id: 'academy', name: 'The Observatory', sprites: ['observatory'], label: lip(OBS.cx + 8) },
    { id: 'options', name: 'The Astrolabe', sprites: ['astro_rock', 'astro'], label: [ASTRO.cx, 342] },
    { id: 'challenges', name: "The Herald's Board", sprites: ['herald_rock', 'herald', 'herald_flag'], label: [HERALD.cx, 342] },
  ];
  const hotspots: MenuHotspot[] = [];
  for (const h of spotsDef) {
    const mask = new Bitmap(W, HT);
    for (const k of h.sprites) mask.blit(placed[k].frames[0], 0, 0);
    const o = outlineOf(mask);
    const r = o.bounds()!;
    items.push({ key: `outline_${h.id}/0`, bmp: o.crop(r) });
    hotspots.push({ id: h.id, name: h.name, sprites: h.sprites, outline: [0, 0, 0, 0], ox: r.x, oy: r.y, label: h.label });
  }
  const { atlas, frames } = packShelves(items, 1024);
  const rectOf = new Map(frames.map((f) => [f.key, [f.x, f.y, f.w, f.h] as Rect4]));
  for (const d of defs) sprites[d.key].frames = d.frames.map((_, i) => rectOf.get(`${d.key}/${i}`)!);
  for (const h of hotspots) h.outline = rectOf.get(`outline_${h.id}/0`)!;
  const json: SanctumJson = {
    sprites,
    order: defs.map((d) => d.key),
    hotspots,
    spots: [
      { x: 232, y: 284, facing: 'R' },
      { x: 340, y: 284, facing: 'L' },
      { x: 180, y: 278, facing: 'R' },
      { x: 394, y: 277, facing: 'L' },
    ],
    twinkles: TWINKLES,
    rings: [RIM],
    rimBreak: BREAK,
    warp: WARP,
    thread: THREAD_PTS,
    falls: FALLS.map(([x]) => [x, Math.round(frontY(x))]),
    portal: [GATE.cx, GATE.spring + 4],
    lights: [
      { x: GATE.cx, y: GATE.spring + 12, rx: 34, ry: 46, rgb: [150, 110, 255], k: 0.5, rate: 0.7 },
      { x: REL.cx, y: 173, rx: 30, ry: 30, rgb: [110, 160, 255], k: 0.38, rate: 0.45 },
      { x: SPIRE.cx, y: SPIRE.spoolY, rx: 30, ry: 30, rgb: [255, 214, 120], k: 0.42, rate: 0.8 },
      ...LANTERNS.map(([x, y], i) => ({ x, y: y - 21, rx: 18, ry: 14, rgb: [255, 170, 90] as [number, number, number], k: 0.45, rate: 1.1 - i * 0.2 })),
    ],
  };
  sky.save(path.join(dir, 'sky.png'));
  atlas.save(path.join(dir, 'scene.png'));
  writeJson(path.join(dir, 'menu.json'), json);
  // the preview: everything at its first frame, the glows half lit, an outline round the Reliquary to show the hover
  const preview = sky.clone();
  for (const d of defs) {
    if (d.mode === 'pulse') continue;
    preview.blit(d.frames[0], 0, 0);
  }
  preview.save(path.join('docs', 'images', 'menu_sanctum.png'));
  console.log(`  menu: sanctum ${defs.length} sprites, ${hotspots.length} places, scene ${atlas.w}x${atlas.h}, ${TWINKLES.length} twinkles, ${json.warp.length} warp threads`);
  void polyFill;
}
