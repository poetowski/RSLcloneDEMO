// Zone "Earth Scars": Zone 4, named and described by Jakub (2026-10-18,
// docs/DESIGN_DECISIONS.md 5.7): the easternmost place, east of the Moonlit
// Basin; a steppe in daytime; in the background yurts with small colourful
// flags "like vertical chain on very long pole", a few wild yaks roaming
// nearby; in the even further background, slightly on the left, the
// silhouette of a very big mountain with a snowy peak, and on its right a
// second twin peak, similar and a bit lower; a distant zeppelin flying in the
// sky; "make some parts moving". On the world map the area holds two deep
// ravines, horizontal, natural and unlike each other: one of them cuts
// through this scene.
//
// As painted: noon over the steppe, the sun high in the upper left (the key
// light) in a deep blue sky with high streaks of cirrus and heaps of cumulus.
// The two mountains stand far off across the horizon, hazy blue, their snow
// lit white on the sun's side and blue in shade, a banner of cloud streaming
// from the great one's summit; low foothills at their feet. The steppe runs
// out to them, golden grass with sage hollows, combed by the wind, cloud
// shadows lying on it. A ravine comes in from the left, deep, its far wall
// banded in buff, ochre, rust and grey clay and fluted by the rains, a thread
// of water at its floor, and closes in a dry wash by the camp. The camp: a
// great white yurt and a smaller old one, their doors toward us, smoke from
// their stovepipes; two very long poles with chains of small flags in five
// colours streaming in the wind; a hitching rail. Wild yaks graze on the
// near steppe, one ambling to and fro; a cairn of stones with blue scarves on
// the right; a far camp and a far herd, the second ravine far off. The arena is the
// steppe itself: sun-dried grass in tufts, sage and trodden earth, stones and
// a few flowers; feather grass in the near corners, a yak's skull in the
// grass. Animated: clouds drift, the zeppelin crawls across the sky against
// the wind, its propellers turning; flags, scarves and smoke stream in the
// wind; the yaks graze, swish their tails and walk; gusts run through the
// grass; the feather grass sways; eagles circle (ZoneDef birds) and
// feather-grass seeds sail by (ambient 'seeds'). Everything his description
// did not name is a first take (DESIGN_DECISIONS 5.7).
import { dith, ellipseFill, outline, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, hex, mix, RGBA, rng, withAlpha } from '../raster.ts';
import { MAP_COLS, MAP_ROWS, Painter, PropPlacement, SPAWNS, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));

// --- the sky: deep blue overhead, paling to the haze over the horizon; white-gold round the sun
const SKY = H(['#1d4c98', '#2256a4', '#2860ae', '#2f6ab8', '#3775c1', '#4180c8', '#4c8bcf', '#5996d5', '#67a1da', '#77acdf', '#88b6e2', '#99c0e5', '#abcae7', '#bdd3e8']);
const SUNG = H(['#cfdde8', '#dde6ea', '#eaede8', '#f5f3e4', '#fdf9ec', '#fffdf6']);
const SUN = H(['#fff2c0', '#fff8de', '#fffdf2', '#ffffff']);
const CLOUD = H(['#6884ae', '#7c96bc', '#92a9ca', '#aabdd8', '#c3d2e5', '#dbe5f0', '#eff3f8', '#ffffff']);
// --- the two mountains far off: hazy blue rock, snow white in the sun and blue in shade
const ROCKM = H(['#56648f', '#606e99', '#6b7aa3', '#7786ac', '#8492b6', '#919ebf', '#9faac8', '#adb6d0']);
const SNOW = H(['#8798c2', '#9eaed2', '#b6c5e0', '#cedaed', '#e3ebf6', '#f3f7fc', '#ffffff']);
/** the foothills at their feet, hazy */
const FOOT = H(['#68708a', '#747c90', '#828894', '#909496', '#9ea098', '#acac9c']);
// --- the steppe: sun-dried golden grass, sage in the hollows, trodden earth; paler with distance
const GRASS = H(['#2a2516', '#3a321c', '#4a4022', '#5b4e28', '#6c5d2f', '#7d6c37', '#8e7b40', '#9f8a4b', '#af9958', '#bea767', '#ccb579', '#d9c38d']);
const SAGE = H(['#2a2e1e', '#343a24', '#3f462a', '#4a5230', '#565e37', '#626a3f', '#6f7647', '#7c8250']);
/** the haze the distance takes: the steppe's colours mixed toward it, three steps */
const HAZEC = hex('#c4d2dc');
const hazed = (ramp: RGBA[], k: number) => ramp.map((c) => mix(c, HAZEC, k));
const GRASS_H = [hazed(GRASS, 0.22), hazed(GRASS, 0.42), hazed(GRASS, 0.6)];
const SAGE_H = [hazed(SAGE, 0.22), hazed(SAGE, 0.42), hazed(SAGE, 0.6)];
const EARTH = H(['#382818', '#473320', '#573f28', '#684c32', '#79593c', '#8a6848', '#9b7856']);
// --- the ravine: its far wall in strata, the depth, a thread of water
const BUFF = H(['#76583e', '#906f53', '#aa896a', '#c3a283', '#d9bb9c', '#e9d2b4']);
const OCHRE = H(['#6a4220', '#86582c', '#a27038', '#bc894a', '#d2a15e']);
const RUST = H(['#58281a', '#743622', '#90472c', '#aa5a38', '#c07048']);
const CLAY = H(['#46384a', '#5a4b5a', '#6e5f6c', '#84757e', '#9a8c92']);
const DEEP = H(['#100a0c', '#1a1012', '#261718', '#331f1e', '#432a26']);
const STREAM = H(['#3a5874', '#668aa8', '#a6c6dc']);
// --- the camp: felt, the painted doors and bands, wood; the flags' five colours
const FELT = H(['#7c766e', '#9c968c', '#bab4a8', '#d4cfc2', '#e8e3d6', '#f6f2e8', '#fffdf6']);
const OLDFELT = H(['#6e6252', '#8a7e6a', '#a49882', '#bcb098', '#d0c5ac', '#e0d6be']);
const BANDB = H(['#1e3266', '#2c4a92', '#3e64b4', '#5c84cc']);
const BANDR = H(['#5a1414', '#8a2420', '#b0382c', '#cc5a40']);
const DOOR = H(['#5a1e0c', '#8a3412', '#b84c18', '#dc6e24', '#f09a3c']);
const WOOD = H(['#2a1a0e', '#3e2814', '#56391e', '#6e4b28', '#886036', '#a27848', '#b88e5c']);
const GOLD = H(['#7a5418', '#b68a2a', '#e4bc48', '#fbe48a']);
const IRON = H(['#26262a', '#3a3a40', '#52525a', '#6c6c74']);
const FLAGS: RGBA[][] = [
  H(['#16337a', '#2450b0', '#3a6ed8']),
  H(['#a8a69c', '#dedad0', '#fbf9f2']),
  H(['#7a1410', '#b4261c', '#e04a32']),
  H(['#145a28', '#22843c', '#38aa56']),
  H(['#a07010', '#dca422', '#f8d050']),
];
const SMOKE = H(['#6e6c74', '#8a8890', '#a6a4aa', '#c4c2c4', '#dedcd8']);
// --- the yaks: long dark hair, the sunlit tips warmer, a grey muzzle, pale horns with dark tips
const YAK = H(['#110b09', '#1a120f', '#251a15', '#31221a', '#3e2b20', '#4e3628', '#614432', '#77553e', '#8d684c']);
const MUZZLE = H(['#5e554e', '#7a7068', '#968c82', '#b0a69a']);
const HORN = H(['#2a221c', '#6a6050', '#a89c80', '#d4c9ac', '#efe7d2']);
// --- stones, the feather grass's silk, flowers, bone
const STONE = H(['#3a3634', '#4e4844', '#645c54', '#7a7064', '#908476', '#a69a88', '#bcb09c']);
const SILK = H(['#a8a088', '#c4bea6', '#dcd8c4', '#f0ede0', '#fdfcf6']);
const BONE = H(['#5c5446', '#7e7462', '#a09480', '#c0b49e', '#dad0ba', '#eee6d2']);
const FLOWER = H(['#f4f0e6', '#b07ad0', '#e8c234', '#6a8ee0', '#e0705a']);
// --- the zeppelin: silver fabric in the haze, its gondola, lit windows
const ZEP = H(['#465270', '#566282', '#687493', '#7c88a4', '#929cb6', '#a8b2c6', '#bec6d4', '#d4dae4']);
const SHADE = hex('#1c1a10');

/** the sun, high in the upper left: the key light */
const SUN_X = 92, SUN_Y = 30;
/** where the far steppe meets the foothills and the sky */
const HZ = 118;

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

/** How a surface with this normal takes the sun (upper left, a little in front). */
const sunOn = (nx: number, ny: number, nz: number) => -0.55 * nx - 0.62 * ny + 0.56 * nz;

// ---------------------------------------------------------------------------
// The ground in perspective, shared by the backdrop's steppe and the arena
// ---------------------------------------------------------------------------

/**
 * A screen row y maps to a scale (px per world unit) that grows from the
 * vanishing line toward the camera; `world` gives a pixel's place on the
 * steppe (u across, from the screen's middle; v in depth), where a shape keeps
 * its size, so the far steppe and the arena run on into each other.
 */
const VY = 106, PK = 0.0054;
const pscale = (y: number) => Math.max(0.05, (y - VY) * PK);
function world(x: number, y: number): [number, number] {
  return [(x - 320) / pscale(y), Math.log(Math.max(0.5, y - VY)) / PK];
}
/** The screen row of a world depth v. */
const rowOf = (v: number) => VY + Math.exp(v * PK);

/** The foothills' skyline at x: low, rolling, hazy, along the horizon. */
const footTop = (x: number) => HZ - 5 - 4 * n1(x, 64, 21) - 2.5 * n1(x, 21, 22) + 2 * smooth(560, 640, x);

/** Sage hollows among the golden grass (above 0: sage), in world units. */
const sageField = (u: number, v: number) => vnoise(u, v * 3, 230, 401) * 0.62 + vnoise(u, v * 3, 70, 402) * 0.38 - 0.62;
/** Trodden earth round the camp, in screen pixels. */
function trodden(x: number, y: number): number {
  return Math.max(0, 1 - Math.hypot((x - 334) / 96, (y - 186) / 11)) * smooth(196, 186, y) + (vnoise(x, y, 6, 409) - 0.5) * 0.35;
}
/**
 * The cart track from the camp toward us down the arena's middle, between the
 * two lines: two ruts in the grass, ten world units apart (a few pixels by the
 * camp, wider as they come near), wandering a little.
 */
function rut(x: number, y: number): number {
  if (y < 188) return 0;
  const [u, v] = world(x, y);
  const v0 = world(320, 188)[1];
  const uc = (332 - 320) / pscale(188) + Math.sin((v - v0) * 0.018) * 10 - (v - v0) * 0.05;
  const d = Math.min(Math.abs(u - (uc - 5)), Math.abs(u - (uc + 5)));
  return Math.max(0, 1 - d / 1.2) * smooth(188, 198, y);
}

/**
 * The steppe's colour at a screen pixel: golden grass with its grain, sage in
 * the hollows, streaks combed by the wind, cloud shadows lying on the far
 * steppe, trodden earth by the camp, all paling into the haze toward the
 * horizon.
 */
function groundColor(x: number, y: number): RGBA {
  const [u, v] = world(x, y);
  const near = clamp((y - HZ) / (360 - HZ), 0, 1);
  const sg = sageField(u, v);
  const grain = (vnoise(u, v * 3, 6, 403) - 0.5) * 0.9 * Math.min(1, near * 2.5) + (hash2(x, y, 404) - 0.5) * 0.45;
  const streak = vnoise(u * 0.09, v * 3.4, 12, 405);
  let val = 5.7 + grain + (streak > 0.7 ? 0.6 : streak < 0.22 ? -0.4 : 0) + (vnoise(u, v * 3, 140, 406) - 0.5) * 1.1;
  if (y < 186) {
    // the far steppe rolls in long swells: their backs toward the sun lighter, the lee darker
    val += Math.sin(v * 0.075 + vnoise(u, 0, 400, 410) * 3) * 0.55;
    // cloud shadows lying on it (never on the arena)
    const cs = vnoise(u, v * 3.2, 1100, 407) * 0.7 + vnoise(u, v * 3.2, 380, 408) * 0.3;
    val -= 1.8 * smooth(0.6, 0.65, cs) * (1 - smooth(156, 186, y));
  }
  // the haze: three steps toward the horizon, each dithered into the next
  const hz = (1 - smooth(HZ - 2, HZ + 58, y)) * 3;
  const lvl = Math.floor(hz + (dith(x, y, hz - Math.floor(hz)) ? 1 : 0));
  const t = trodden(x, y);
  if (lvl === 0 && t > 0.5) return rampDither(EARTH, clamp(3.8 + grain * 0.8 + (val - 5.7) * 0.5, 0, EARTH.length - 1), x, y);
  const isSage = sg > 0.04 || (sg > -0.1 && dith(x, y, (sg + 0.1) / 0.14));
  const R = isSage ? (lvl ? SAGE_H[Math.min(2, lvl - 1)] : SAGE) : lvl ? GRASS_H[Math.min(2, lvl - 1)] : GRASS;
  if (lvl === 0 && t > 0.3 && dith(x, y, (t - 0.3) / 0.2)) return rampDither(GRASS, 4.2 + grain * 0.6, x, y);
  // the ruts: darker, the grass worn short
  const rt = rut(x, y);
  if (rt > 0.35 && dith(x, y, (rt - 0.35) / 0.3)) return rampDither(EARTH, 3.4 + grain * 0.5, x, y);
  return rampDither(R, clamp(isSage ? val - 0.5 : val, 0, R.length - 1), x, y);
}

/**
 * A tuft of steppe grass at screen x,y (its foot), about `s` px tall: blades
 * fanning out and leaning with the wind (to the right), dark at their feet,
 * lit toward their tips on the sun's side; now and then a silky head of
 * feather grass. `oy` is the bitmap's screen row 0.
 */
function tuft(b: Bitmap, x: number, y: number, s: number, seed: number, oy = 0, soft = 0) {
  const r = rng(seed);
  const nb = 3 + Math.floor(s * 0.8 + r() * 2);
  const [u0, v0] = world(x, y);
  const sage = sageField(u0, v0) > -0.02 || r() < 0.08;
  const R = sage ? SAGE : GRASS;
  const top = R.length - 1;
  for (let k = 0; k < nb; k++) {
    const bx = x + (r() - 0.5) * s * 0.9;
    const ang = 0.28 + (r() - 0.5) * 1.1;
    const len = s * (0.55 + r() * 0.65);
    const steps = Math.max(1, Math.ceil(len));
    for (let t = 0; t <= steps; t++) {
      const u = t / steps;
      const px = Math.round(bx + Math.sin(ang) * len * u + u * u * len * 0.12), py = Math.round(y - Math.cos(ang) * len * u) - oy;
      const lit = ang < 0.25;
      const v = (sage ? 2.2 : 3.8) + u * (lit ? 3.6 : 2.6) - soft * (u - 0.5) * 2;
      b.set(px, py, R[Math.round(clamp(v, 0, top))]);
    }
    if (s > 4 && r() < 0.025) {
      // a feather-grass head: a pale silky awn trailing in the wind
      const tx = bx + Math.sin(ang) * len, ty = y - Math.cos(ang) * len;
      for (let t = 1; t <= Math.round(s * 0.5); t++) b.set(Math.round(tx + t), Math.round(ty - 0.3 * t + t * t * 0.05) - oy, SILK[t === 1 ? 1 : 2]);
    }
  }
}

/** The tufts on the steppe, in world space: one where its grid point lands, drawn back to front, sized by their distance. */
function tufts(b: Bitmap, y0: number, y1: number, oy: number, skip: (x: number, y: number) => boolean) {
  const [, v0] = world(320, y0), [, v1] = world(320, y1);
  const list: [number, number, number, number][] = [];
  const GV = 7.5, GU = 9;
  for (let gv = Math.floor(v0 / GV); gv <= Math.ceil(v1 / GV); gv++) {
    const vv = gv * GV;
    const y = rowOf(vv);
    if (y < y0 - 1 || y > y1 + 1) continue;
    const s = pscale(y);
    const half = 340 / s;
    for (let gu = Math.floor(-half / GU) - 1; gu <= Math.ceil(half / GU) + 1; gu++) {
      const h = hash2(gu, gv, 411);
      if (h > 0.62) continue;
      const u = (gu + hash2(gu, gv, 412) * 0.9) * GU, v = vv + (hash2(gu, gv, 413) - 0.5) * GV * 0.9;
      const sy = rowOf(v), sx = 320 + u * pscale(sy);
      const size = pscale(sy) * (5 + hash2(gu, gv, 414) * 5);
      if (size < 1.6 || sx < -8 || sx > 648 || skip(sx, sy) || rut(sx, sy) > 0.2) continue;
      list.push([sx, sy, size, gu * 7919 + gv * 104729]);
    }
  }
  list.sort((a, c) => a[1] - c[1]);
  for (const [x, y, s, seed] of list) tuft(b, x, y, s, seed, oy, trodden(x, y) > 0.35 ? 0.6 : 0);
}

// ---------------------------------------------------------------------------
// Tiles: the steppe's grass under the arena (the floor prop paints over it in perspective)
// ---------------------------------------------------------------------------

function grassTile(o: { sage?: number; earth?: number } = {}): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const inner = clamp((Math.min(x, y, TILE - 1 - x, TILE - 1 - y) - 1) / 5, 0, 1);
        let v = 6.2 + (tnoise(x, y, 8, 3) - 0.5) * 1.2 + (tnoise(x, y, 4, 4) - 0.5) * 0.8 + (hash2(x, y, 5) - 0.5) * 0.6;
        const sg = (o.sage ?? 0) * inner * (tnoise(x, y, 16, seed) - 0.4) * 2.4;
        const er = (o.earth ?? 0) * inner * (tnoise(x, y, 16, seed + 1) - 0.45) * 2.4;
        if (er > 0 && dith(x, y, Math.min(1, er))) b.set(x, y, rampDither(EARTH, 4.4 + (tnoise(x, y, 4, 6) - 0.5), x, y));
        else if (sg > 0 && dith(x, y, Math.min(1, sg))) b.set(x, y, rampDither(SAGE, v - 1.6, x, y));
        else {
          if (hash2(x >> 1, y, 7) > 0.9) v += 1;
          b.set(x, y, rampDither(GRASS, v, x, y));
        }
      }
    }
  };
}

const P: Record<string, Painter> = {
  grass_a: grassTile(),
  grass_b: grassTile({ sage: 0.6 }),
  grass_c: grassTile({ earth: 0.5 }),
  grass_d: grassTile({ sage: 1 }),
  grass_e: grassTile({ sage: 0.3, earth: 0.3 }),
};

// ---------------------------------------------------------------------------
// Backdrop
// ---------------------------------------------------------------------------

function backdrop(): Bitmap {
  const b = new Bitmap(640, 200);
  sky(b);
  cirrus(b);
  cumulus(b, 580, 92, 120, 26, 501);
  cumulus(b, 18, 66, 70, 14, 502);
  mountains(b);
  bannerCloud(b);
  foothills(b);
  steppe(b);
  farHerd(b);
  farCamp(b);
  ravine(b);
  farRavine(b);
  tufts(b, 146, 200, 0, (x, y) => inRavine(x, y + 1) || y < nearLip(x) + 1.5 && x < RAV_END + 4);
  return b;
}

/** The sky ramp running on into the white-gold round the sun. */
const SKYSUN = [...SKY, ...SUNG];

function sky(b: Bitmap) {
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 640; x++) {
      const t = clamp(y / (HZ - 6), 0, 1);
      const d = Math.hypot((x - SUN_X) * 0.95, (y - SUN_Y) * 1.12);
      const glow = Math.max(0, 1 - d / 190);
      // deepest overhead and away to the right, paling to the haze over the horizon, white round the sun
      const v = Math.pow(t, 0.92) * (SKY.length - 1) * (1 - glow * 0.42) + Math.pow(glow, 1.75) * 18.5 - clamp((x - 330) / 300, 0, 1) * (1 - t) * 1.3;
      b.set(x, y, rampDither(SKYSUN, Math.min(SKYSUN.length - 1, v), x, y));
    }
  }
  ellipseFill(b, SUN_X, SUN_Y, 8, 8, (x, y, d) => (d > 0.8 ? SUN[1] : rampDither(SUN, 3.6 - d * 1.2, x, y)));
}

/** Thin streaks of high cloud, combed out by the wind aloft. */
function cirrus(b: Bitmap) {
  const streaks: [number, number, number, number][] = [[352, 12, 104, 711], [520, 24, 70, 712], [214, 8, 48, 713], [610, 6, 40, 714], [470, 40, 46, 715]];
  for (const [cx, cy, rx, seed] of streaks) {
    for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
      if (x < 0 || x > 639) continue;
      const k = (x - cx) / rx;
      const th = (1 - k * k) * (0.9 + 1.5 * n1(x, 9, seed));
      const mid = cy + (n1(x, 37, seed + 1) - 0.5) * 4 + k * 2.5;
      for (let y = Math.floor(mid - th); y <= mid + th; y++) {
        if (y < 0) continue;
        const a = 1 - Math.abs(y + 0.5 - mid) / (th + 0.5);
        if (dith(x, y, a * 0.6)) b.set(x, y, rampDither(CLOUD, 4.8 + a * 1.4, x, y));
      }
    }
  }
}

/** A heap of cumulus: puffs along a flat base and piled toward the middle, each lit as a ball from the upper left, the underside in blue shade. */
function cumulus(b: Bitmap, cx: number, base: number, w: number, h: number, seed: number) {
  const r = rng(seed);
  const puffs: [number, number, number][] = [];
  const n = Math.max(3, Math.round(w / 10));
  for (let i = 0; i < n; i++) {
    const rad = 5 + r() * 4;
    puffs.push([cx - w / 2 + ((i + 0.5) * w) / n + (r() - 0.5) * 4, base - rad * 0.55, rad]);
  }
  for (let i = 0; i < n * 1.8; i++) {
    const u = r() * 2 - 1;
    const hh = 1 - u * u;
    const rad = 4 + r() * 5 + hh * h * 0.24;
    puffs.push([cx + u * w * 0.4, base - rad * 0.4 - hh * h * (0.3 + 0.55 * r()), rad]);
  }
  const x0 = Math.floor(cx - w / 2 - 14), x1 = Math.ceil(cx + w / 2 + 14);
  for (let y = Math.max(0, Math.floor(base - h - 22)); y < Math.min(b.h, base); y++) {
    for (let x = Math.max(0, x0); x < Math.min(b.w, x1); x++) {
      let best = 0, bp: [number, number, number] | null = null;
      for (const p of puffs) {
        const q = 1 - Math.hypot(x + 0.5 - p[0], y + 0.5 - p[1]) / p[2];
        if (q > best) {
          best = q;
          bp = p;
        }
      }
      if (!bp) continue;
      const nx = (x + 0.5 - bp[0]) / bp[2], ny = (y + 0.5 - bp[1]) / bp[2];
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const under = clamp((y - (base - 7)) / 7, 0, 1);
      b.set(x, y, rampDither(CLOUD, 3.1 + sunOn(nx, ny, nz) * 4.4 - under * 1.8, x, y));
    }
  }
}

/**
 * The two mountains, far off: the great one slightly left of the middle, its
 * twin on its right, a little lower, a saddle between them. Each is a broad
 * cone whose flanks steepen toward the summit; ribs of rock run down from the
 * top, snow fills the upper slopes and runs down the gullies between the ribs
 * in tongues. The faces toward the sun (the left of each ridge) are lit: the
 * snow white, the rock pale; beyond the ridge the snow is blue and the rock
 * darker. The haze takes the lower slopes.
 */
interface Mount {
  x: number;
  y: number;
  /** how far the flanks spread, left and right (px out at the foot) */
  l: number;
  r: number;
  /** the snow line below the summit */
  snow: number;
  ribs: number;
  seed: number;
}
const GREAT: Mount = { x: 220, y: 17, l: 272, r: 178, snow: 47, ribs: 13, seed: 1 };
const TWIN: Mount = { x: 418, y: 40, l: 146, r: 190, snow: 33, ribs: 10, seed: 2 };
/** A mountain's skyline at x: concave flanks, a little rugged, the summit a small dome. */
function mountTop(m: Mount, x: number): number {
  const dx = x - m.x;
  const span = dx < 0 ? m.l : m.r;
  const t = clamp(Math.abs(dx) / span, 0, 1.4);
  const rise = HZ + 4 - m.y;
  // a convex summit dome, then flanks that ease out toward the foot
  const prof = t < 0.05 ? (t / 0.05) * (t / 0.05) * 0.012 : 0.012 + (1 - Math.pow(1 - Math.min(1, (t - 0.05) / 0.95), 2.1)) * 0.988;
  const rug = (n1(x, 7, 30 + m.seed) - 0.5) * 2.2 * Math.min(1, t * 4) + (n1(x, 23, 32 + m.seed) - 0.5) * 3 * Math.min(1, t * 3);
  // the great one's broad western shoulder
  const shoulder = m === GREAT && dx < 0 ? 7 * Math.max(0, 1 - Math.abs(t - 0.4) / 0.16) : 0;
  return m.y + rise * prof + rug - shoulder + (t > 1 ? (t - 1) * 20 : 0);
}
/** The massif's skyline: the two mountains joined by a saddle, raised where their flanks meet (a smooth minimum). */
function massifTop(x: number): number {
  const a = mountTop(GREAT, x), c = mountTop(TWIN, x), k = 34;
  return (a + c - Math.sqrt((a - c) * (a - c) + k * k)) / 2;
}

/** Where on its smooth profile a height lies (0 the summit, 1 the foot): the profile of mountTop inverted. */
function profInv(p: number): number {
  if (p <= 0) return 0;
  if (p < 0.012) return 0.05 * Math.sqrt(p / 0.012);
  const q = Math.min(1, (p - 0.012) / 0.988);
  return 0.05 + 0.95 * (1 - Math.pow(1 - q, 1 / 2.1));
}
/**
 * How far a mountain bulges toward us at a pixel (its cone's depth there),
 * and the slope's normal: each mountain is a cone whose radius at a height is
 * its silhouette's half width there; where both cover a pixel, the one that
 * bulges nearer is seen, so the two meet along a crease below the saddle.
 */
function coneAt(m: Mount, x: number, y: number): { bz: number; nx: number; ny: number; nz: number } {
  const dx = x - m.x;
  const rise = HZ + 4 - m.y;
  const t = profInv((y - m.y) / rise);
  const R = Math.max(0.5, t * (dx < 0 ? m.l : m.r));
  if (Math.abs(dx) > R) return { bz: -1, nx: 0, ny: 0, nz: 0 };
  const bz = Math.sqrt(R * R - dx * dx);
  // the slope steepens toward the summit: the normal leans up less there
  const steep = clamp(1 - t, 0.15, 0.9);
  const nx = (dx / R) * (1 - steep * 0.5), nz = (bz / R) * (1 - steep * 0.5), ny = -(1 - steep) * 0.9 - 0.25;
  const l = Math.hypot(nx, ny, nz) || 1;
  return { bz, nx: nx / l, ny: ny / l, nz: nz / l };
}

function mountains(b: Bitmap) {
  for (let x = 0; x < 640; x++) {
    const top = massifTop(x);
    for (let y = Math.ceil(top); y < HZ + 4; y++) {
      const cg = coneAt(GREAT, x, y), ct = coneAt(TWIN, x, y);
      const m = cg.bz >= ct.bz || ct.bz < 0 ? GREAT : TWIN;
      const cn = m === GREAT ? cg : ct;
      const depth = y - top;
      const dx = x - m.x, dy = y - m.y;
      // ribs fan out from the top, lit on their sunward faces
      const ang = Math.atan2(dx, dy * 1.6 + 6);
      const ribPh = ang * m.ribs + vnoise(x, y, 11, 41 + m.seed) * 2.4;
      const rib = Math.sin(ribPh);
      const ribSlope = Math.cos(ribPh);
      const sun = cn.bz < 0 ? -0.2 : sunOn(cn.nx, cn.ny, cn.nz);
      const lit = sun > 0.22;
      // the snow: down to the snow line, further down the gullies (between the ribs), ragged
      const snowLine = m.y + m.snow + (rib < 0 ? -rib * 14 : -rib * 6) + (vnoise(x, y, 4, 42 + m.seed) - 0.5) * 6 + (lit ? 3 : 0);
      // round the snow line the snow thins out in streaks down the fall line, the rock showing between them
      const fringe = (y - (snowLine - 5)) / 9;
      const streaks = vnoise(x * 1.4, y * 0.22, 2, 45 + m.seed) * 0.7 + vnoise(x, y, 3, 46 + m.seed) * 0.3;
      const snowy = (y < snowLine - 5 || (fringe < 1 && streaks > 0.32 + fringe * 0.5)) && !(rib > 0.82 && dy > m.snow * 0.45);
      const haze = clamp((y - (m.y + m.snow * 1.4)) / (HZ - m.y - m.snow * 1.4), 0, 1);
      let c: RGBA;
      if (snowy) {
        let v = 1.2 + clamp(sun, -0.3, 0.75) * 7 + ribSlope * (lit ? 0.5 : 0.7);
        if (depth < 1.2) v = lit ? 6.4 : 3.6;
        c = rampDither(SNOW, clamp(v + (hash2(x, y, 43) - 0.5) * 0.5, 0, SNOW.length - 1), x, y);
      } else {
        // rock: pale on the sun's side, the ribs' sunward faces lighter, streaks of old snow in the gullies
        let v = 1.2 + clamp(sun, -0.3, 0.75) * 5 + ribSlope * (lit ? 0.9 : 0.5) + haze * (lit ? 1.6 : 3.2);
        // bands of old lava and scree across the slopes, faint in the haze
        v += (vnoise(x, y * 2.6, 9, 47 + m.seed) - 0.5) * 1.1 * (1 - haze * 0.6) - (Math.floor(y * 0.5 + n1(x, 30, 48) * 3) % 4 === 0 ? 0.4 * (1 - haze) : 0);
        if (rib < -0.75 && y < snowLine + 16 && dith(x, y, 0.5)) {
          c = SNOW[lit ? 3 : 1];
          b.set(x, y, c);
          continue;
        }
        if (depth < 1.2) v += lit ? 1 : 0.6;
        c = rampDither(ROCKM, clamp(v + (hash2(x, y, 44) - 0.5) * 0.6, 0, ROCKM.length - 1), x, y);
      }
      b.set(x, y, c);
    }
  }
}

/** A banner of cloud streaming from the great mountain's summit on its lee side, thinning out. */
function bannerCloud(b: Bitmap) {
  for (let x = GREAT.x + 2; x < GREAT.x + 84; x++) {
    const k = (x - GREAT.x - 2) / 82;
    const mid = GREAT.y + 3 + k * 9 + (n1(x, 11, 51) - 0.5) * 2;
    const th = (1 - k) * 3.2 + 0.6;
    for (let y = Math.floor(mid - th); y <= mid + th; y++) {
      const a = (1 - Math.abs(y + 0.5 - mid) / (th + 0.5)) * (1 - k * 0.8) * (0.6 + vnoise(x, y, 5, 52) * 0.6);
      if (a > 0 && dith(x, y, a)) b.set(x, y, rampDither(CLOUD, 5.2 + a * 1.6 - (y > mid ? 1 : 0), x, y));
    }
  }
}

/** The foothills at the mountains' feet: low, rolling, hazy, their slopes toward the sun lighter. */
function foothills(b: Bitmap) {
  for (let x = 0; x < 640; x++) {
    const top = footTop(x);
    const slope = footTop(x + 2) - footTop(x - 2);
    for (let y = Math.ceil(top); y < HZ + 6; y++) {
      const v = 3.2 + slope * 0.9 + (y - top < 1.2 ? 0.9 : 0) - (y - top) * 0.08 + (vnoise(x, y, 5, 61) - 0.5) * 0.7;
      b.set(x, y, rampDither(FOOT, clamp(v, 0, FOOT.length - 1), x, y));
    }
  }
}

/** The steppe from the horizon down: the ground painted in perspective. */
function steppe(b: Bitmap) {
  for (let x = 0; x < 640; x++) {
    for (let y = Math.ceil(Math.max(footTop(x) + 4, HZ - 2)); y < 200; y++) {
      b.set(x, y, groundColor(x, y));
    }
  }
}

/** A herd of yaks grazing far off on the steppe, short of the second ravine: small with the distance, but each with its hump, its skirt of hair, its head down and a pale horn. */
function farHerd(b: Bitmap) {
  const r = rng(71);
  const herd: [number, number][] = [[452, 139], [461, 141], [471, 138], [480, 142], [443, 142], [490, 140]];
  for (const [x0, y0] of herd) {
    const x = x0 + Math.round((r() - 0.5) * 3), y = y0;
    const left = r() < 0.4;
    const f = (dx: number) => (left ? x + 4 - dx : x + dx);
    // the body under its hair, the hump over the shoulders, legs under the skirt
    for (let dx = 0; dx < 5; dx++) b.set(f(dx), y - 1, hazed(YAK, 0.1)[dx < 1 ? 3 : 2]);
    for (let dx = 1; dx < 5; dx++) b.set(f(dx), y - 2, hazed(YAK, 0.1)[dx > 2 ? 5 : 4]);
    b.set(f(3), y - 3, hazed(YAK, 0.1)[5]);
    b.set(f(0), y, hazed(YAK, 0.1)[1]);
    b.set(f(4), y, hazed(YAK, 0.1)[1]);
    // the head down in the grass, a pale horn
    b.set(f(5), y, hazed(YAK, 0.1)[2]);
    b.set(f(5), y - 1, hazed(HORN, 0.1)[3]);
  }
}

/** A far camp on the right: two small yurts, a pole with its flags, a wisp of smoke. */
function farCamp(b: Bitmap) {
  for (const [cx, base, w] of [[560, 139, 9], [575, 140, 7]] as [number, number, number][]) {
    for (let x = Math.round(cx - w / 2); x <= cx + w / 2; x++) {
      const u = (x - cx) / (w / 2);
      const roof = Math.round(base - 3 - (1 - u * u) * 2.2);
      for (let y = roof; y <= base; y++) b.set(x, y, y < base - 2 ? FELT[u < 0.2 ? 5 : 3] : FELT[u < 0.2 ? 4 : 2]);
    }
    b.set(cx, base, WOOD[2]);
    b.set(cx, base - 1, DOOR[2]);
    for (let k = 1; k < 4; k++) b.set(Math.round(cx + 1 + k * 0.6), Math.round(base - 6 - k * 1.6), SMOKE[k < 2 ? 3 : 2]);
  }
  for (let y = 118; y < 140; y++) b.set(588, y, WOOD[y > 130 ? 2 : 3]);
  for (let k = 0; k < 6; k++) b.set(589, 120 + k * 2, FLAGS[k % 5][2]);
}

// ---------------------------------------------------------------------------
// The ravine: in from the left edge, deep, closing by the camp
// ---------------------------------------------------------------------------

/** Where the ravine closes into a dry wash. */
const RAV_END = 318;
/** How open the ravine is at x: 1 at the left edge, 0 where it closes. */
const ravK = (x: number) => clamp(1 - x / RAV_END, 0, 1);
/** Side gullies cutting back into the far rim: where, how deep, how wide. */
const NOTCHES: [number, number, number][] = [[54, 4.5, 11], [148, 3.2, 8], [222, 2.2, 6], [104, 1.6, 5]];
const notch = (x: number) => NOTCHES.reduce((s, [nx, d, w]) => s + d * Math.max(0, 1 - Math.abs(x - nx) / w), 0);
/** The far lip without its gullies (the strata run level along it). */
const farBase = (x: number) => 146.6 + ravK(x) * 4 + (n1(x, 26, 501) - 0.5) * 2.2 + (n1(x, 7, 502) - 0.5) * 1;
const farLip = (x: number) => farBase(x) - notch(x);
/** Our lip, the near one: it swings out and back, widest toward the left edge. */
const nearLip = (x: number) => 146.6 + Math.pow(ravK(x), 1.15) * 36 + (n1(x, 31, 503) - 0.5) * 3.2 + (n1(x, 9, 504) - 0.5) * 1.2 + Math.sin(x * 0.045) * 2 * ravK(x);
const inRavine = (x: number, y: number) => x < RAV_END && y >= farLip(x) && y <= nearLip(x);

/** The strata from the top of the wall down: thickness and ramp, the young layers on top. */
const STRATA: [number, RGBA[]][] = [[3, BUFF], [4, OCHRE], [2, BUFF], [5, RUST], [3, OCHRE], [2, CLAY], [6, RUST], [3, BUFF], [4, CLAY], [5, OCHRE], [6, RUST], [8, CLAY]];
function stratum(s: number): RGBA[] {
  let acc = -7;
  // above the level lip (in the side gullies) the upper layers continue
  if (s < 0) return s > -3 ? BUFF : OCHRE;
  for (const [t, r] of STRATA) {
    acc += t;
    if (s < acc + 7) return r;
  }
  return CLAY;
}

/**
 * The far wall seen across the gap: banded strata running level, fluted by
 * the rains into ribs lit on their sunward side, darker with depth; at the
 * bottom, where the ravine is wide, its floor in shadow, scree fans and a
 * thread of water; the far lip lit, grass hanging over it; our own lip a lit
 * edge with tufts against the depth. Beyond its end a dry wash runs on.
 */
function ravine(b: Bitmap) {
  for (let x = 0; x < RAV_END + 2; x++) {
    const top = farLip(x), bot = nearLip(x), base = farBase(x);
    const h = bot - top;
    if (h < 0.6) continue;
    const k = ravK(x);
    for (let y = Math.floor(top); y <= Math.ceil(bot); y++) {
      if (y < top - 0.2 || y > bot + 0.2) continue;
      const d = y - top;
      // the floor shows where the gap is wide: the lowest part of the view, in shadow
      const floorAt = bot - Math.max(0, (h - 9) * 0.32);
      if (y > floorAt && h > 9) {
        const f = (y - floorAt) / Math.max(1, bot - floorAt);
        // scree fans at the wall's foot, a thread of water winding along the floor
        const scree = vnoise(x, 0, 9, 511) > 0.55 && f < 0.5;
        const water = Math.abs(y - (floorAt + (bot - floorAt) * (0.55 + 0.3 * Math.sin(x * 0.09)))) < 0.6 && hash2(x, 0, 512) > 0.25;
        if (water) b.set(x, y, STREAM[hash2(x, y, 513) > 0.85 ? 1 : 0]);
        else b.set(x, y, scree ? rampDither(DEEP, 3.6 - f * 1.4 + (hash2(x, y, 514) - 0.5), x, y) : rampDither(DEEP, 1.8 - f * 1.4 + (hash2(x, y, 515) - 0.5) * 0.8, x, y));
        continue;
      }
      // the flutes: ribs and runnels down the face, lit on their sunward side; the face itself in shade (the sun is beyond it)
      const fl = Math.cos((x + n1(y, 7, 516) * 5) * 0.62 + n1(x, 17, 517) * 4);
      // the strata undulate a little along the wall
      const s = y - base + (n1(x, 41, 518) - 0.5) * 1.6 + Math.sin(x * 0.03 + 1.3) * 1.4;
      const R = stratum(s);
      const deep = d / Math.max(10, h);
      // gullies the rain has cut down the face every so often: dark V-shaped clefts, lit on their sunward lip
      const gx = x / 21 + n1(y, 13, 523) * 0.4, gk = gx - Math.floor(gx) - 0.5;
      const gw = 0.05 + deep * 0.12 + hash2(Math.floor(gx), 0, 524) * 0.06;
      const cleft = Math.abs(gk) < gw ? (gk < -gw * 0.4 ? 0.8 : -1.5) : 0;
      let v = 2.3 + (fl > 0.35 ? 0.9 : fl < -0.55 ? -0.8 : 0) + cleft - deep * deep * 2.4 - (y < base - 0.5 ? 0.7 : 0);
      // the lip catches the sun from beyond: a bright rim
      if (d < 1) v = R.length - 1.4;
      else if (d < 2) v = 3.2;
      // grass hangs over the far lip
      if (d < 2.2 && hash2(x, 0, 519) > 0.55 && d < 1 + hash2(x, 1, 519) * 1.6) {
        b.set(x, y, GRASS[d < 1 ? 3 : 2]);
        continue;
      }
      // deeper still: the shadow at the foot of the wall
      if (deep > 0.7) {
        b.set(x, y, rampDither(DEEP, clamp(4 - (deep - 0.7) * 9 + (fl > 0.35 ? 0.6 : 0), 0, DEEP.length - 1), x, y));
        continue;
      }
      b.set(x, y, rampDither(R, clamp(v + (hash2(x, y, 520) - 0.5) * 0.6, 0, R.length - 1), x, y));
    }
    // our lip: a lit edge of turf, a dark line of shade under it
    const ly = Math.round(bot);
    b.set(x, ly, GRASS[hash2(x, 2, 521) > 0.4 ? 9 : 8]);
    b.set(x, ly + 1, GRASS[6]);
    if (k > 0.05 && hash2(x, 3, 521) > 0.6) b.set(x, ly - 1, GRASS[hash2(x, 4, 521) > 0.5 ? 7 : 5]);
  }
  // the dry wash beyond the end: a seam of stones and darker grass fading into the steppe
  for (let x = RAV_END - 4; x < RAV_END + 48; x++) {
    const fade = 1 - (x - RAV_END + 4) / 52;
    const y = Math.round(farBase(x) + 0.5 + Math.sin(x * 0.2) * 0.6);
    if (!dith(x, y, fade)) continue;
    b.set(x, y, hash2(x, 0, 522) > 0.7 ? STONE[4] : GRASS[3]);
    if (hash2(x, 1, 522) > 0.75) b.set(x, y - 1, STONE[5]);
  }
}

/**
 * The second ravine, far off on the right beyond the far camp: a dark seam in
 * the steppe opening toward the right edge, its far lip catching the light,
 * hazed by the distance.
 */
const FAR_RAV = { x0: 392, y: 129.5 };
const farRavTop = (x: number) => FAR_RAV.y + (n1(x, 19, 531) - 0.5) * 1.6 - (x - FAR_RAV.x0) * 0.012;
const farRavBot = (x: number) => farRavTop(x) + Math.pow(clamp((x - FAR_RAV.x0) / 248, 0, 1), 1.2) * 7 + (n1(x, 7, 532) - 0.5) * 0.8;
function farRavine(b: Bitmap) {
  const wall = hazed(CLAY, 0.42), lip = hazed(BUFF, 0.42);
  for (let x = FAR_RAV.x0; x < 640; x++) {
    const top = farRavTop(x), bot = farRavBot(x);
    if (bot - top < 0.6) continue;
    for (let y = Math.floor(top); y <= Math.ceil(bot); y++) {
      if (y < top - 0.3 || y > bot + 0.3) continue;
      const d = (y - top) / Math.max(1, bot - top);
      if (y - top < 1) b.set(x, y, lip[4]);
      else b.set(x, y, d > 0.55 ? DEEP[hash2(x, y, 533) > 0.6 ? 3 : 2] : rampDither(wall, 2.4 - d * 2.6 + (Math.cos(x * 0.7) > 0.4 ? 0.8 : 0), x, y));
    }
    b.set(x, Math.round(bot) + 1, GRASS_H[1][7]);
  }
}

// ---------------------------------------------------------------------------
// The far layer: drifting clouds, the zeppelin, gusts over the far steppe
// ---------------------------------------------------------------------------

/** A small cloud that drifts across the sky (PropKind.drift). */
function cloudPuff(w: number, h: number, seed: number): Bitmap {
  const b = new Bitmap(w + 8, h + 10);
  cumulus(b, (w + 8) / 2, h + 8, w, h, seed);
  return b;
}

/**
 * The zeppelin, far off and flying west against the wind: a long envelope of
 * silver fabric in the haze, lit along its top, its ring frames and seams
 * faint; cross fins at the tail; a gondola slung under it with lit windows;
 * two engine pods whose propellers turn (frames).
 */
function zeppelin(n = 4): Bitmap[] {
  const W = 60, HH = 22;
  const cx = 29, cy = 9, rx = 24, ry = 6.2;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    // the fins first, the envelope over their roots
    polyFill(b, [[47, 6], [53, 0.5], [56, 1], [55, 7]], (x) => ZEP[x < 52 ? 4 : 3]);
    polyFill(b, [[47, 12], [53, 17.5], [56, 17], [55, 11]], () => ZEP[1]);
    for (let y = 0; y < HH; y++) {
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5 - cx) / rx;
        // the tail tapers, the nose is full
        const ryx = ry * (u > 0 ? 1 - 0.42 * u * u : 1 - 0.1 * u * u);
        const v = (y + 0.5 - cy) / ryx;
        if (u * u + v * v > 1) continue;
        const nz = Math.sqrt(Math.max(0, 1 - u * u - v * v));
        let val = 3.6 + sunOn(u * 0.6, v, nz) * 3.6;
        // ring frames and a seam along it, faint
        if ((x + 1) % 6 === 0 && Math.abs(v) < 0.92) val -= 0.7;
        if (Math.abs(v + 0.35) < 0.08) val -= 0.5;
        b.set(x, y, rampDither(ZEP, clamp(val, 0, ZEP.length - 1), x, y));
      }
    }
    // the side fin, toward us
    polyFill(b, [[46, 9], [55, 8], [57, 10.5], [48, 11]], (x) => ZEP[x < 51 ? 5 : 3]);
    // the gondola under the front half, its windows lit
    for (let x = 18; x <= 31; x++) {
      for (let y = 15; y <= 17; y++) b.set(x, y, y === 15 ? ZEP[2] : ZEP[y === 16 ? 1 : 0]);
    }
    for (const wx of [20, 23, 26, 29]) b.set(wx, 16, hex('#f2dea0'));
    b.set(17, 16, ZEP[1]);
    b.set(32, 16, ZEP[0]);
    for (const sx of [21, 28]) b.set(sx, 14, ZEP[1]);
    // the engine pods on their struts, their propellers turning
    for (const [px, py] of [[14, 13], [38, 14]] as [number, number][]) {
      b.set(px, py, ZEP[2]);
      b.set(px + 1, py, ZEP[2]);
      b.set(px + 2, py, ZEP[1]);
      b.set(px + 2, py - 1, ZEP[1]);
      const blur = [hex('#b0b8c8'), hex('#9aa2b4')];
      // the propeller at the pod's front (west): a blade up, across, down, across
      const f = i % 4;
      if (f === 0) [[-1, -1], [-1, 0], [-1, 1]].forEach(([dx, dy]) => b.set(px + dx, py + dy, blur[0]));
      else if (f === 1) [[-1, -1], [-1, 1]].forEach(([dx, dy]) => b.set(px + dx, py + dy, blur[1]));
      else if (f === 2) b.set(px - 1, py, blur[0]);
      else [[-1, 0], [-1, -1]].forEach(([dx, dy]) => b.set(px + dx, py + dy, blur[1]));
    }
    out.push(b);
  }
  return out;
}

/**
 * A gust running through the grass (loop): a patch of silvered blades where
 * the wind bends them, swelling in from the left, crossing its box and
 * fading, then a lull. `mask` keeps it on the grass of the backdrop; `soft`
 * keeps it faint on the arena.
 */
function gust(w: number, hh: number, seed: number, o: { at: [number, number]; n?: number; soft?: boolean; mask?: (x: number, y: number) => boolean }): Bitmap[] {
  const n = o.n ?? 28;
  const r = rng(seed);
  const run = 0.62;
  const out: Bitmap[] = [];
  const blades = Array.from({ length: Math.round((w * hh) / (o.soft ? 22 : 14)) }, () => [r() * w, r() * hh, r()] as [number, number, number]);
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    const t = i / n;
    out.push(b);
    if (t > run) continue;
    const k = t / run;
    const env = Math.sin(k * Math.PI);
    const cx = -w * 0.15 + k * w * 1.3, cy = hh * (0.5 + 0.12 * Math.sin(seed + k * 3));
    for (const [bx, by, h] of blades) {
      const d = Math.hypot((bx - cx) / (w * 0.22), (by - cy) / (hh * 0.55));
      const a = (1 - d) * env;
      if (a <= h * 0.9) continue;
      const sx = o.at[0] + Math.round(bx), sy = o.at[1] + Math.round(by);
      if (o.mask && !o.mask(sx, sy)) continue;
      // a bent blade catching the light: a short stroke along the wind
      const len = o.soft ? 1 : 2;
      const c = o.soft ? GRASS[a > 0.6 ? 9 : 8] : a > 0.55 ? GRASS[11] : GRASS[10];
      for (let q = 0; q < len; q++) b.set(Math.round(bx) + q, Math.round(by), c);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The camp: yurts, the flag poles, smoke, the hitching rail
// ---------------------------------------------------------------------------

/**
 * A yurt, its door toward us: a round wall of felt (a cylinder seen a little
 * from above, lit on the sun's side), girth ropes round it, a painted band
 * under the eaves; a low cone of roof over it, a band of appliqué along its
 * edge, the crown ring at the top and a stovepipe out of it; a painted wooden
 * door under a rolled felt; its shadow on the grass to the right.
 */
function yurt(w: number, o: { felt: RGBA[]; band: RGBA[]; seed: number }): Bitmap {
  const wallH = Math.round(w * 0.3), rise = Math.round(w * 0.2), pipe = 7;
  const W = w + 18, HH = wallH + rise + pipe + 8;
  const b = new Bitmap(W, HH);
  const cx = 4 + w / 2, base = HH - 3, ry = w * 0.1;
  const eave = base - wallH;
  const F = o.felt;
  // the shadow on the grass, to the right
  ellipseFill(b, cx + w * 0.22, base + 0.5, w * 0.62, ry + 1.6, (x, y, d) => (dith(x, y, (1 - d) * 1.6) ? withAlpha(SHADE, 120) : 0));
  const half = w / 2;
  // the wall
  for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
    const u = (x + 0.5 - cx) / half;
    if (Math.abs(u) > 1) continue;
    const arc = ry * Math.sqrt(Math.max(0, 1 - u * u));
    const y0 = Math.round(eave + arc), y1 = Math.round(base + arc);
    for (let y = y0; y <= y1; y++) {
      const hgt = (y1 - y) / Math.max(1, y1 - y0);
      let v = 4.6 - u * 1.9 - (u > 0.55 ? (u - 0.55) * 2 : 0) + (tnoise(x, y, 4, o.seed) - 0.5) * 0.5;
      // girth ropes round the wall
      const rope = Math.abs(hgt - 0.3) < 0.07 || Math.abs(hgt - 0.68) < 0.07;
      // the band under the eaves
      if (y - y0 < 2) {
        b.set(x, y, y === y0 ? o.band[1] : (x + y) % 3 === 0 ? FELT[5] : o.band[u < 0.3 ? 2 : 1]);
        continue;
      }
      if (y >= y1 - 0.5) v -= 1.4;
      b.set(x, y, rope ? WOOD[u < 0.2 ? 3 : 2] : rampDither(F, clamp(v, 0, F.length - 1), x, y));
    }
  }
  // the roof: a low cone from the eave to the crown, lit on the sun's side, the band along its edge
  const crown = { x: cx, y: eave - rise };
  for (let y = Math.floor(crown.y); y <= Math.ceil(eave + ry); y++) {
    for (let x = Math.floor(cx - half - 1); x <= Math.ceil(cx + half + 1); x++) {
      const u = (x + 0.5 - cx) / (half + 1);
      if (Math.abs(u) > 1) continue;
      const edge = eave + ry * Math.sqrt(Math.max(0, 1 - u * u)) - 0.5;
      const slope = crown.y + Math.abs(x + 0.5 - cx) * (rise / (half + 1)) * 1.05;
      if (y < slope || y > edge) continue;
      const k = (y - slope) / Math.max(1, edge - slope);
      let v = 5.6 - u * 1.6 - (u > 0.4 ? 0.6 : 0) - k * 0.3 + (tnoise(x, y, 4, o.seed + 1) - 0.5) * 0.5;
      // ropes from the crown down the roof
      const ang = Math.atan2(x + 0.5 - cx, (y + 0.5 - crown.y) * 2.2);
      if (Math.abs(Math.sin(ang * 4)) < 0.08 && k > 0.15) v -= 1.2;
      if (edge - y < 1.6) {
        b.set(x, y, edge - y < 0.8 ? o.band[0] : (x % 4 === 0 ? F[5] : o.band[u < 0.2 ? 3 : 2]));
        continue;
      }
      b.set(x, y, rampDither(F, clamp(v, 0, F.length - 1), x, y));
    }
  }
  // the crown ring, the stovepipe out of it, a cap on the pipe
  for (let x = Math.round(cx - 2); x <= Math.round(cx + 2); x++) b.set(x, Math.round(crown.y), x < cx ? WOOD[4] : WOOD[2]);
  const px = Math.round(cx - 1);
  for (let y = Math.round(crown.y) - pipe; y < Math.round(crown.y); y++) {
    b.set(px, y, IRON[2]);
    b.set(px + 1, y, IRON[1]);
  }
  b.set(px - 1, Math.round(crown.y) - pipe, IRON[1]);
  b.set(px + 2, Math.round(crown.y) - pipe, IRON[0]);
  // the door: a painted frame and leaf, a knot of gold, the rolled felt over it
  const dw = Math.max(5, Math.round(w * 0.16)), dh = Math.round(wallH * 0.74);
  const dx0 = Math.round(cx - dw / 2), dy1 = Math.round(base + ry) - 1, dy0 = dy1 - dh;
  for (let y = dy0; y <= dy1; y++) {
    for (let x = dx0; x < dx0 + dw; x++) {
      const frame = x === dx0 || x === dx0 + dw - 1 || y === dy0;
      const v = frame ? 1.4 : 3.2 - (x - dx0) / dw * 0.8 + (y === dy0 + 1 ? 0.6 : 0);
      b.set(x, y, rampDither(DOOR, v, x, y));
    }
  }
  b.set(Math.round(cx), dy0 + Math.round(dh * 0.45), GOLD[3]);
  b.set(Math.round(cx) - 1, dy0 + Math.round(dh * 0.45), GOLD[2]);
  b.set(Math.round(cx) + 1, dy0 + Math.round(dh * 0.45), GOLD[1]);
  for (let x = dx0 - 1; x <= dx0 + dw; x++) b.set(x, dy0 - 1, F[x < cx ? 6 : 4]);
  // grass round its foot
  const r = rng(o.seed);
  for (let i = 0; i < w * 0.8; i++) {
    const x = Math.round(cx - half + r() * w), y = Math.round(base + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / half) ** 2)) + 1);
    if (Math.abs(x - cx) < dw) continue;
    b.set(x, y - Math.round(r() * 1.5), GRASS[r() < 0.5 ? 6 : 8]);
  }
  return outline(b, F[0], 200);
}

/**
 * One of the very long poles with its chain of small flags: a slim pole of
 * wood, a gilt spear-tip at the top, a cord down it, flags of five colours
 * tied along the cord one above the other, streaming in the wind to the
 * right; two guy ropes to the ground. Frames: each flag flutters on its own
 * phase, a ripple running down the chain, one whole cycle a loop.
 */
function flagPole(h: number, count: number, seed: number, n = 12): Bitmap[] {
  const W = 46, HH = h + 6, px = 16;
  const base = HH - 1, top = 5;
  const r = rng(seed);
  const flags = Array.from({ length: count }, (_, k) => ({
    y: top + 6 + k * ((h * 0.66) / count),
    w: 4 + Math.round(r()),
    c: FLAGS[(k + seed) % 5],
    ph: r() * TAU + k * 0.8,
    amp: 0.8 + r() * 0.6,
  }));
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    const t = i / n;
    // the guy ropes, faint
    for (const [gx, gy] of [[2, base], [32, base - 1]] as [number, number][]) {
      const y0 = top + h * 0.34;
      const steps = Math.ceil(Math.hypot(gx - px, gy - y0));
      for (let s = 0; s <= steps; s++) {
        const x = Math.round(px + ((gx - px) * s) / steps), y = Math.round(y0 + ((gy - y0) * s) / steps + Math.sin((s / steps) * Math.PI) * 2);
        if (s % 2 === 0) b.set(x, y, withAlpha(WOOD[1], 150));
      }
    }
    // the pole: thicker toward its foot, lit on the left
    for (let y = top; y <= base; y++) {
      b.set(px, y, WOOD[y < top + 4 ? 5 : 4]);
      if (y > base - h * 0.4) b.set(px + 1, y, WOOD[2]);
    }
    // the spear-tip
    b.set(px, top - 1, GOLD[2]);
    b.set(px, top - 2, GOLD[3]);
    b.set(px, top - 3, GOLD[3]);
    b.set(px - 1, top, GOLD[1]);
    b.set(px + 1, top, GOLD[1]);
    // the cord and the flags along it
    const fy0 = flags[0].y - 1, fy1 = flags[flags.length - 1].y + 3;
    for (let y = Math.round(fy0); y <= fy1; y++) b.set(px + 1, y, WOOD[1]);
    for (const f of flags) {
      for (let j = 0; j < f.w; j++) {
        const lag = j / f.w;
        const dy = Math.sin(t * TAU + f.ph - j * 0.9) * f.amp * lag;
        const dyN = Math.sin(t * TAU + f.ph - (j + 1) * 0.9) * f.amp * ((j + 1) / f.w);
        const x = px + 2 + j, y0 = Math.round(f.y + dy);
        const fold = dyN - dy;
        for (let q = 0; q < 3; q++) {
          if (j === f.w - 1 && q === 2 && Math.sin(t * TAU + f.ph) > 0.3) continue;
          b.set(x, y0 + q, f.c[q === 0 ? (fold < -0.15 ? 2 : 1) : fold > 0.2 ? 0 : 1]);
        }
      }
    }
    out.push(b);
  }
  return out;
}

/** Smoke from a stovepipe (loop): puffs rising and leaning away with the wind, swelling and thinning out. */
function smoke(w: number, hh: number, seed: number, n = 18): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    for (let k = 0; k < 4; k++) {
      const t = (i / n + k / 4) % 1;
      const x = 3 + t * (w - 10) * (0.6 + t * 0.4) + Math.sin(t * 5 + seed) * 1.2, y = hh - 2 - t * (hh - 6);
      const rad = 1.4 + t * 3.6;
      const a = (1 - t * 0.85) * 1.1;
      ellipseFill(b, x, y, rad, rad * 0.8, (px, py, d) => (dith(px, py, a * (1.3 - d)) ? SMOKE[Math.round(clamp(2.8 - t * 1.6 - (py - y) / rad * 0.9 - (px - x) / rad * 0.7, 0, 4))] : 0));
    }
    out.push(b);
  }
  return out;
}

/** A hitching rail beside the yurts, a saddle cloth and a coiled rope thrown over it, a stack of dung bricks for the fires. */
function hitchingRail(): Bitmap {
  const W = 34, HH = 20;
  const b = new Bitmap(W, HH);
  ellipseFill(b, 20, 18, 15, 2.2, (x, y, d) => (dith(x, y, (1 - d) * 1.4) ? withAlpha(SHADE, 110) : 0));
  for (const x of [5, 25]) for (let y = 7; y <= 17; y++) {
    b.set(x, y, WOOD[4]);
    b.set(x + 1, y, WOOD[2]);
  }
  for (let x = 4; x <= 27; x++) b.set(x, 8, WOOD[x < 10 ? 5 : 4]);
  for (let x = 4; x <= 27; x++) b.set(x, 9, WOOD[2]);
  // the saddle cloth: blue with a red border, hanging over the rail
  for (let x = 9; x <= 17; x++) for (let y = 9; y <= 14; y++) b.set(x, y, x === 9 || x === 17 || y === 14 ? BANDR[2] : BANDB[x < 12 ? 3 : 2]);
  // a coil of rope
  ellipseFill(b, 21, 11, 2, 2.4, (x, y, d) => (d > 0.45 ? WOOD[d > 0.8 ? 3 : 5] : 0));
  // dung bricks stacked at its foot
  for (let k = 0; k < 7; k++) {
    const x = 27 + (k % 3) * 2 - (k > 2 ? 1 : 0), y = 17 - Math.floor(k / 3) * 2;
    b.set(x, y, EARTH[3]);
    b.set(x + 1, y, EARTH[2]);
    b.set(x, y - 1, EARTH[5]);
  }
  return outline(b, WOOD[0], 200);
}

/**
 * A cairn of stones on a rise, a bundle of poles out of its top, blue silk
 * scarves and rags of colour tied to them, streaming in the wind (loop).
 */
function cairn(n = 12): Bitmap[] {
  const W = 54, HH = 46;
  const r = rng(91);
  const stones: [number, number, number][] = [];
  for (let k = 0; k < 26; k++) {
    const t = Math.pow(r(), 0.8);
    const y = 44 - t * 14;
    const half = (1 - t) * 13 + 2;
    stones.push([16 + (r() - 0.5) * half * 2, y, 1.6 + r() * 1.6]);
  }
  stones.sort((a, c) => a[1] - c[1]);
  const poles: [number, number, number][] = [[16, 30, -0.2], [17, 30, 0.12], [15, 31, 0.32], [18, 31, -0.05]];
  const scarves = [
    { pole: 0, at: 0.75, len: 12, c: H(['#3a7ab8', '#68a6dc', '#a6d0f2']), ph: 0 },
    { pole: 1, at: 0.6, len: 15, c: H(['#3a7ab8', '#68a6dc', '#a6d0f2']), ph: 1.7 },
    { pole: 2, at: 0.8, len: 9, c: FLAGS[2], ph: 3.1 },
    { pole: 3, at: 0.5, len: 8, c: FLAGS[4], ph: 4.4 },
    { pole: 1, at: 0.85, len: 7, c: FLAGS[3], ph: 5.2 },
  ];
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    const t = i / n;
    ellipseFill(b, 22, 44, 17, 2.4, (x, y, d) => (dith(x, y, (1 - d) * 1.4) ? withAlpha(SHADE, 110) : 0));
    const tips: [number, number][] = [];
    poles.forEach(([x0, y0, lean]) => {
      const len = 22 + Math.abs(lean) * 6;
      let x = x0, y = y0;
      for (let k = 0; k < len; k++) {
        x = x0 + Math.sin(lean) * k;
        y = y0 - Math.cos(lean) * k;
        b.set(Math.round(x), Math.round(y), WOOD[k > len * 0.7 ? 4 : 3]);
      }
      tips.push([x, y]);
    });
    for (const [x, y, rad] of stones) {
      ellipseFill(b, x, y, rad * 1.2, rad, (px, py, d) => rampDither(STONE, 4.6 - (px - x) / rad * 1.4 - (py - y) / rad * 1.6 - d * 0.6 + (hash2(px, py, 92) - 0.5) * 0.6, px, py));
    }
    for (const s of scarves) {
      const [x0, y0, lean] = poles[s.pole];
      const len = 22 + Math.abs(lean) * 6;
      const ax = x0 + Math.sin(lean) * len * s.at, ay = y0 - Math.cos(lean) * len * s.at;
      for (let j = 0; j < s.len; j++) {
        const lag = j / s.len;
        const dy = Math.sin(t * TAU + s.ph - j * 0.55) * 1.6 * lag + lag * 2.4;
        const x = Math.round(ax + j), y = Math.round(ay + dy);
        b.set(x, y, s.c[j < 2 ? 1 : (Math.sin(t * TAU + s.ph - j * 0.55) > 0.2 ? 2 : 1)]);
        if (j < s.len - 2) b.set(x, y + 1, s.c[0]);
      }
    }
    out.push(outline(b, STONE[0], 200));
  }
  return out;
}

// ---------------------------------------------------------------------------
// The yaks
// ---------------------------------------------------------------------------

interface YakPose {
  /** 0 the head carried level, 1 its muzzle in the grass */
  head: number;
  /** the head's small jerk while it tears grass */
  tug: number;
  /** -1..1 the tail's swing */
  tail: number;
  /** each hoof's forward offset (px) and lift (px): hind far, hind near, fore far, fore near */
  legs: [number, number][];
  /** the body's rise and fall with the gait */
  bob: number;
}

/**
 * A wild yak from the side, facing right, `s` its scale: a great barrel of a
 * body under long dark hair that hangs in a skirt almost to the ground, a
 * high hump over the shoulders, the head carried low, a grey muzzle, pale
 * horns sweeping out and up with dark tips; short legs under the skirt; a long
 * tail ending in a brush. Lit from the upper left: the hair's tips warm brown
 * along the back and hump, the skirt nearly black.
 */
function yak(p: YakPose, s: number): Bitmap {
  const W = Math.ceil(50 * s), HH = Math.ceil(32 * s);
  const b = new Bitmap(W, HH);
  const g = HH - 2;
  const S = (v: number) => v * s;
  const by = p.bob;
  // the shadow under it
  ellipseFill(b, S(22), g + 0.5, S(19), S(2.2), (x, y, d) => (dith(x, y, (1 - d) * 1.6) ? withAlpha(SHADE, 120) : 0));
  // the far legs, darker, then the body, then the near legs
  const leg = (lx: number, [fwd, lift]: [number, number], far: boolean) => {
    const x = Math.round(S(lx) + fwd), y1 = Math.round(g - lift);
    for (let y = Math.round(g - S(9)); y <= y1; y++) {
      b.set(x, y, YAK[far ? 1 : 2]);
      b.set(x + 1, y, YAK[far ? 0 : 1]);
    }
    b.set(x, y1, HORN[0]);
    b.set(x + 1, y1, HORN[0]);
  };
  leg(9, p.legs[0], true);
  leg(30, p.legs[2], true);
  // the body: a barrel, the rump, the hump; each lit as a mass from the upper left
  const masses: [number, number, number, number][] = [
    [S(19), S(17) + by, S(14), S(8.2)],
    [S(9), S(16.5) + by, S(7.5), S(7.5)],
    [S(29), S(12) + by, S(8), S(7.5)],
  ];
  const inBody = (x: number, y: number) => masses.some(([cx, cy, rx, ry]) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 < 1);
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < W; x++) {
      if (!inBody(x, y)) continue;
      const top = clamp((S(24) + by - y) / S(16), 0, 1);
      const left = clamp((S(34) - x) / S(34), 0, 1);
      // long hair: streaks running down, the tips lighter where the sun finds them
      const strand = (hash2(x, Math.floor(y / Math.max(2, S(3))), 801) - 0.5) * 1.4;
      const v = 1.6 + top * 4.4 + left * 0.6 + strand;
      b.set(x, y, rampDither(YAK, clamp(v, 0, YAK.length - 1), x, y));
    }
  }
  // the skirt: hair hanging from the belly and flanks nearly to the ground, ragged at its hem
  for (let x = Math.round(S(3)); x <= Math.round(S(36)); x++) {
    let bottom = -1;
    for (let y = HH - 1; y >= 0; y--) if (inBody(x, y)) {
      bottom = y;
      break;
    }
    if (bottom < 0) continue;
    const hem = g - S(2.5) - hash2(x, 0, 802) * S(3.5) - (x < S(6) || x > S(33) ? S(3) : 0);
    for (let y = bottom; y <= hem; y++) b.set(x, y, YAK[(hash2(x, y >> 1, 803) > 0.7 ? 3 : 1) + (x % 3 === 0 ? 0 : 0)]);
  }
  leg(13, p.legs[1], false);
  leg(33, p.legs[3], false);
  // the tail, from the rump, ending in a brush
  for (let k = 0; k < S(11); k++) {
    const u = k / S(11);
    const x = Math.round(S(3) - u * S(2.5) + p.tail * u * u * S(3)), y = Math.round(S(13) + by + u * S(11));
    b.set(x, y, YAK[2]);
    if (u > 0.6) {
      b.set(x - 1, y, YAK[1]);
      b.set(x + 1, y, YAK[3]);
    }
  }
  // the head: low on a short neck; down to the grass when grazing
  const hx = S(37) + p.head * S(2.5), hy = S(15) + by + p.head * S(9) + p.tug * S(1);
  const ha = 0.35 + p.head * 0.9;
  const fx = Math.cos(ha), fy = Math.sin(ha);
  // the neck's hair joining the hump to the head
  polyFill(b, [[S(31), S(9) + by], [hx + fx * S(1), hy - S(2.5)], [hx, hy + S(3)], [S(32), S(20) + by]], (x, y) => rampDither(YAK, 2.4 + clamp((hy - y) / S(8), 0, 1) * 2, x, y));
  ellipseFill(b, hx + fx * S(2), hy + fy * S(2), S(4.6), S(3.4), (x, y, d) => {
    const along = ((x + 0.5 - hx) * fx + (y + 0.5 - hy) * fy) / S(6);
    if (along > 0.62) return rampDither(MUZZLE, 2.2 - d * 1.2 + (y < hy + fy * S(4) ? 0.6 : 0), x, y);
    return rampDither(YAK, 2.8 - d * 1.2 + (y < hy ? 1 : 0), x, y);
  });
  // the muzzle's tip and nostril, the eye
  const mx = Math.round(hx + fx * S(6.4)), my = Math.round(hy + fy * S(6.4));
  b.set(mx, my, MUZZLE[1]);
  b.set(mx, my + 1, MUZZLE[0]);
  b.set(Math.round(hx + fx * S(2.2) - fy * S(1.2)), Math.round(hy + fy * S(2.2) - S(1.2)), YAK[0]);
  // the horns: out of the poll, sweeping forward and up, the tips dark
  const pollX = hx - fx * S(0.6) + fy * S(1.2), pollY = hy - S(2.4);
  for (let k = 0; k <= Math.ceil(S(8)); k++) {
    const u = k / Math.ceil(S(8));
    const x = Math.round(pollX + u * S(4.5) * (0.4 + fx * 0.6) + Math.sin(u * 2.4) * S(1)), y = Math.round(pollY - Math.sin(u * 2.2) * S(4.6) + u * u * S(1.5) * p.head);
    b.set(x, y, u > 0.82 ? HORN[0] : HORN[u < 0.3 ? 2 : 3]);
    if (u < 0.45) b.set(x, y + 1, HORN[1]);
  }
  // the ear under the horn
  b.set(Math.round(pollX - S(1.6)), Math.round(pollY + S(1.4)), YAK[3]);
  return outline(b, YAK[0], 200);
}

const hoof = (fwd: number, lift = 0): [number, number] => [fwd, lift];

/** Grazing (loop): the muzzle in the grass, tugging; the head raised to chew; a swish of the tail; legs still. */
function grazeFrames(s: number, n = 16, seed = 0): Bitmap[] {
  const out: Bitmap[] = [];
  const legs: [number, number][] = [hoof(0), hoof(1), hoof(-1), hoof(1)];
  for (let i = 0; i < n; i++) {
    const t = (i + seed) % n / n;
    // down tearing grass most of the loop, the head lifted to chew for a while
    const lift = t > 0.62 && t < 0.86 ? Math.sin(((t - 0.62) / 0.24) * Math.PI) : 0;
    const head = 1 - lift * 0.55;
    const tug = t < 0.6 ? (Math.sin(t * TAU * 4) > 0.4 ? 1 : 0) : 0;
    const tail = Math.sin(t * TAU) * 0.7 + (t > 0.3 && t < 0.45 ? Math.sin(((t - 0.3) / 0.15) * TAU) * 0.6 : 0);
    out.push(yak({ head, tug, tail, legs, bob: 0 }, s));
  }
  return out;
}

/** Walking (loop): an unhurried walk, one hoof lifted at a time, the head nodding with the stride; `stride` px a cycle. */
function walkFrames(s: number, stride: number, n = 8): Bitmap[] {
  const out: Bitmap[] = [];
  // a walk: hind far, fore far, hind near, fore near, a quarter apart
  const phase = [0, 0.5, 0.25, 0.75];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const legs = phase.map((ph): [number, number] => {
      const q = (t + ph) % 1;
      // on the ground three quarters of the cycle, sliding back under the body; a quick swing forward, lifted
      if (q < 0.75) return [stride / 2 - (q / 0.75) * stride, 0];
      const u = (q - 0.75) / 0.25;
      return [-stride / 2 + u * stride, Math.sin(u * Math.PI) * 1.6];
    });
    out.push(yak({ head: 0.3 + Math.sin(t * TAU * 2) * 0.06, tug: 0, tail: Math.sin(t * TAU) * 0.3, legs, bob: Math.sin(t * TAU * 2) > 0.5 ? -0.5 : 0 }, s));
  }
  return out;
}

// ---------------------------------------------------------------------------
// The arena: the steppe in perspective, gusts, feather grass, stones, the skull
// ---------------------------------------------------------------------------

const FLOOR = { w: 640, h: 168 };
/** keep the floor quiet where the champions stand */
const busy = (x: number, y: number) => [...SPAWNS.player, ...SPAWNS.enemy].some(([fx, fy]) => Math.hypot((x - fx) / 34, (y - fy) / 16) < 1);

/**
 * The arena's ground: the steppe of the backdrop run on toward the camera in
 * the same perspective (its tufts larger as they come near), trodden earth by
 * the camp and along the path, a few stones half sunk in the grass and a
 * scatter of small flowers, none of them where the champions stand.
 */
function floorGround(): Bitmap {
  const { w, h } = FLOOR;
  const b = new Bitmap(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) b.set(x, y, groundColor(x, y + 192));
  tufts(b, 186, 362, 192, () => false);
  // stones half sunk in the grass
  const r = rng(601);
  for (let i = 0; i < 26; i++) {
    const x = 10 + r() * 620, y = 200 + Math.pow(r(), 0.8) * 156;
    if (busy(x, y)) continue;
    const s = pscale(y) * (2.4 + r() * 3.2);
    ellipseFill(b, x + s * 0.5, y - 192 + s * 0.25, s * 1.3, s * 0.45, (px, py, d) => (dith(px, py, (1 - d) * 1.5) ? GRASS[2] : 0));
    ellipseFill(b, x, y - 192, s * 1.1, s * 0.7, (px, py, d) => rampDither(STONE, 4.4 - (px - x) / s * 1.5 - (py - (y - 192)) / s * 2 - d * 0.7 + (hash2(px, py, 602) - 0.5) * 0.6, px, py + 192));
  }
  // small flowers of the steppe: white, purple, yellow, blue, now and then a red
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * w), y = Math.floor(r() * h);
    if (busy(x, y + 192) || trodden(x, y + 192) > 0.3) continue;
    const k = r();
    const c = FLOWER[k < 0.2 ? 0 : k < 0.5 ? 1 : k < 0.7 ? 2 : k < 0.9 ? 3 : 4];
    b.set(x, y, c);
    if (y > 80 && r() < 0.4) b.set(x + 1, y, c);
  }
  return b;
}

/**
 * Feather grass (Stipa), the steppe's own: a clump of thin stems, each
 * crowned with a long silky awn that trails in the wind and catches the sun.
 * Frames sway every stem about its root on its own phase.
 */
function featherGrass(w: number, hh: number, count: number, seed: number, o: { hMin: number; hMax: number; n?: number; base?: boolean }): Bitmap[] {
  const r = rng(seed);
  const stems = Array.from({ length: count }, () => ({
    x: w / 2 + (r() - 0.5) * w * 0.75,
    h: o.hMin + r() * (o.hMax - o.hMin),
    lean: 0.18 + (r() - 0.4) * 0.5,
    amp: 0.05 + r() * 0.05,
    ph: r() * TAU,
    awn: 0.35 + r() * 0.3,
    dark: r() < 0.3,
  })).sort((a, c) => c.h - a.h);
  const n = o.n ?? 16;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    const t = i / n;
    if (o.base) ellipseFill(b, w / 2, hh - 2, w * 0.36, 3, (x, y, d) => (dith(x, y, (1 - d) * 1.4) ? GRASS[3 + (hash2(x, y, 611) > 0.5 ? 1 : 0)] : 0));
    for (const s of stems) {
      const sway = Math.sin(t * TAU + s.ph) * s.amp;
      let lx = s.x, ly = hh - 1;
      const steps = Math.ceil(s.h * 1.2);
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const ang = s.lean + sway * (0.4 + u * 1.3) + u * u * 0.25;
        lx = s.x + Math.sin(ang) * s.h * u;
        ly = hh - 1 - Math.cos(ang) * s.h * u;
        b.set(Math.round(lx), Math.round(ly), s.dark ? SAGE[u > 0.6 ? 6 : 4] : GRASS[u > 0.7 ? 8 : u > 0.3 ? 6 : 4]);
      }
      // the awn: a long silky plume trailing downwind, curling down at its end
      const len = s.h * s.awn;
      for (let k = 1; k <= Math.ceil(len); k++) {
        const u = k / len;
        const x = lx + k * (0.9 + sway * 2), y = ly - Math.sin(u * 1.4) * len * 0.18 + u * u * len * 0.32 + Math.sin(t * TAU * 2 + s.ph + u * 3) * 0.6 * u;
        b.set(Math.round(x), Math.round(y), SILK[u < 0.25 ? 3 : u > 0.8 ? 1 : 2]);
        if (u < 0.6) b.set(Math.round(x), Math.round(y) - 1, withAlpha(SILK[4], 150));
      }
    }
    out.push(b);
  }
  return out;
}

/** A yak's skull bleached in the grass at the arena's edge: the long horns, the dark sockets, a crack, grass grown through. */
function skull(): Bitmap {
  const W = 52, HH = 26;
  const b = new Bitmap(W, HH);
  ellipseFill(b, 28, 22, 18, 3, (x, y, d) => (dith(x, y, (1 - d) * 1.4) ? withAlpha(SHADE, 130) : 0));
  // the cranium and the long face, lying on its side, the nose to the right
  polyFill(b, [[16, 12], [22, 8], [30, 9], [40, 13], [44, 17], [42, 20], [30, 21], [18, 20], [14, 17]], (x, y) => rampDither(BONE, 4.6 - (x - 14) / 30 * 1.4 - (y - 8) / 13 * 2 + (hash2(x, y, 621) - 0.5) * 0.7, x, y));
  // the sockets and the nasal cavity
  ellipseFill(b, 26, 14, 2.2, 1.8, () => BONE[0]);
  ellipseFill(b, 39, 17, 1.6, 1.2, () => BONE[1]);
  for (let k = 0; k < 6; k++) b.set(30 + k, 12 + (k % 2), BONE[2]);
  // the horns sweeping out of the poll, pale, their tips dark
  const horn = (dir: number, lift: number) => {
    for (let k = 0; k <= 16; k++) {
      const u = k / 16;
      const x = Math.round(17 - dir * u * 12 + u * u * 4 * dir), y = Math.round(11 - Math.sin(u * 2.2) * lift - u * 1.5);
      b.set(x, y, u > 0.82 ? HORN[0] : HORN[u < 0.4 ? 3 : 2]);
      if (u < 0.5) b.set(x, y + 1, HORN[1]);
    }
  };
  horn(1, 6);
  horn(-0.25, 9);
  // grass grown through the eye and round it
  const r = rng(622);
  for (let i = 0; i < 26; i++) {
    const x = 8 + r() * 40, len = 2 + r() * 4;
    for (let k = 0; k < len; k++) b.set(Math.round(x + k * 0.3), Math.round(23 - k), GRASS[k > len * 0.6 ? 8 : 5]);
  }
  return outline(b, BONE[0], 200);
}

/** A steppe eagle soaring (ZoneDef birds): broad wings with fingered tips, held flat; now and then a slow beat. */
function eagles(): Bitmap[] {
  const frames = [
    ['.#.......#.', '.##.....##.', '..#######..', '....###....'],
    ['.#.......#.', '.##.....##.', '..#######..', '....###....'],
    ['...........', '.##.....##.', '#.#######.#', '....###....'],
    ['#.........#', '.##.....##.', '...#####...', '....###....'],
    ['...........', '..#.....#..', '.#.#####.#.', '#...###...#'],
    ['.#.......#.', '.##.....##.', '..#######..', '....###....'],
  ];
  const dark = hex('#2a1e16'), mid = hex('#4a3624');
  return frames.map((rows) => {
    const b = new Bitmap(11, 4);
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && b.set(x, y, y >= 2 && x > 3 && x < 7 ? mid : dark)));
    return b;
  });
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

/** The camp, in screen pixels: each yurt's foot, the poles' feet. */
const YURT_A = { x: 306, y: 188, w: 56 };
const YURT_B = { x: 368, y: 185, w: 42 };
const POLE_A = { x: 270, y: 189, h: 130 };
const POLE_B = { x: 398, y: 186, h: 94 };

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const r = rng(701);
  const plain = ['grass_a', 'grass_b', 'grass_c', 'grass_a', 'grass_d', 'grass_e'];
  for (let row = 6; row < MAP_ROWS; row++) for (let c = 0; c < MAP_COLS; c++) ground[row * MAP_COLS + c] = id(plain[Math.floor(r() * plain.length)]);
  const yA = yurtSize(YURT_A.w), yB = yurtSize(YURT_B.w);
  const props: PropPlacement[] = [
    // far: clouds drifting east, the zeppelin crawling west under them, gusts over the far steppe
    // the zeppelin keeps high, above the summits, clear of the battle's turn bar
    { kind: 'zeppelin', x: 330, y: 12, layer: 'far' },
    { kind: 'cloud_a', x: 190, y: 54, layer: 'far' },
    { kind: 'cloud_b', x: 470, y: 40, layer: 'far' },
    { kind: 'cloud_c', x: 620, y: 66, layer: 'far' },
    { kind: 'gust_far_a', x: 330, y: 122, layer: 'far' },
    { kind: 'gust_far_b', x: 40, y: 128, layer: 'far' },
    { kind: 'gust_near', x: 420, y: 160, layer: 'far' },
    // back: the camp, its smoke and flags; the yaks; the cairn
    // the smoke's first puff (3 px in, 2 up from its foot) sits on the pipe's mouth
    { kind: 'smoke_a', x: YURT_A.x + yA.pipeDx - 3, y: YURT_A.y - yA.pipeTop + 1, layer: 'back' },
    { kind: 'smoke_b', x: YURT_B.x + yB.pipeDx - 3, y: YURT_B.y - yB.pipeTop + 1, layer: 'back' },
    { kind: 'yurt_a', x: YURT_A.x, y: YURT_A.y, layer: 'back' },
    { kind: 'yurt_b', x: YURT_B.x, y: YURT_B.y, layer: 'back' },
    { kind: 'pole_a', x: POLE_A.x, y: POLE_A.y, layer: 'back' },
    { kind: 'pole_b', x: POLE_B.x, y: POLE_B.y, layer: 'back' },
    { kind: 'rail', x: 240, y: 190, layer: 'back' },
    { kind: 'yak_far', x: 100, y: 185, layer: 'back' },
    { kind: 'yak_near', x: 36, y: 191, layer: 'back' },
    { kind: 'yak_roam', x: 524, y: 190, layer: 'back' },
    { kind: 'cairn', x: 616, y: 186, layer: 'back' },
    // floor: the arena's ground, a gust running over it
    { kind: 'ground', x: 0, y: 192, layer: 'floor' },
    { kind: 'gust_floor_a', x: 40, y: 286, layer: 'floor' },
    { kind: 'gust_floor_b', x: 300, y: 228, layer: 'floor' },
    { kind: 'stipa_l', x: 60, y: 206, layer: 'floor' },
    { kind: 'stipa_r', x: 596, y: 214, layer: 'floor' },
    // fg: feather grass in the near corners, the skull in the grass
    { kind: 'skull', x: 46, y: 356, layer: 'fg' },
    { kind: 'stipa_fg_l', x: 0, y: 362, layer: 'fg' },
    { kind: 'stipa_fg_r', x: 640, y: 362, layer: 'fg' },
  ];
  // the runtime draws a layer's props in this order, the preview sorts them by y: keep the two the same
  const order = { far: 0, back: 1, floor: 2, fg: 3 } as const;
  props.sort((a, c) => order[a.layer] - order[c.layer] || a.y - c.y);
  return { ground, wall, props };
}

/**
 * Where a yurt's stovepipe opens, from its placement (the sprite's foot at its
 * middle): the pipe's left column stands at cx - 1 in a sprite w + 18 wide,
 * its top 3 + wall + rise + pipe px above the sprite's foot.
 */
function yurtSize(w: number) {
  const wallH = Math.round(w * 0.3), rise = Math.round(w * 0.2), pipe = 7;
  const cx = 4 + w / 2;
  return { pipeDx: Math.round(cx - 1) - (w + 18) / 2, pipeTop: 3 + wallH + rise + pipe };
}

const GRAZE_MS = 230;

export const zone4: ZoneArt = {
  id: 'zone4',
  name: 'Earth Scars',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    zeppelin: zeppelin(),
    cloud_a: [cloudPuff(66, 15, 991)],
    cloud_b: [cloudPuff(44, 10, 992)],
    cloud_c: [cloudPuff(82, 17, 993)],
    gust_far_a: gust(180, 22, 1, { at: [330 - 90, 122 - 11], mask: (x, y) => y > footTop(x) + 5 && !inRavine(x, y) && !(x >= FAR_RAV.x0 && y >= farRavTop(x) - 1 && y <= farRavBot(x) + 1) }),
    gust_far_b: gust(150, 16, 2, { at: [40 - 75, 128 - 8], n: 34, mask: (x, y) => y > footTop(x) + 5 && y < farLip(x) - 1 }),
    gust_near: gust(200, 26, 3, { at: [420 - 100, 160 - 13], n: 30, mask: (x, y) => !inRavine(x, y) && y < 191 && !(x >= FAR_RAV.x0 && y <= farRavBot(x) + 1) }),
    smoke_a: smoke(26, 30, 1),
    smoke_b: smoke(22, 26, 2, 20),
    yurt_a: [yurt(YURT_A.w, { felt: FELT, band: BANDB, seed: 11 })],
    yurt_b: [yurt(YURT_B.w, { felt: OLDFELT, band: BANDR, seed: 12 })],
    pole_a: flagPole(POLE_A.h, 17, 3),
    pole_b: flagPole(POLE_B.h, 12, 1, 12),
    rail: [hitchingRail()],
    yak_far: grazeFrames(0.64, 16, 5),
    yak_near: grazeFrames(0.78, 16, 0),
    yak_roam: [...walkFrames(0.7, 5), ...grazeFrames(0.7, 16, 9)],
    cairn: cairn(),
    ground: [floorGround()],
    gust_floor_a: gust(240, 50, 4, { at: [40, 286], n: 36, soft: true }),
    gust_floor_b: gust(220, 40, 5, { at: [300, 228], n: 40, soft: true }),
    stipa_l: featherGrass(40, 30, 9, 21, { hMin: 10, hMax: 22, base: true }),
    stipa_r: featherGrass(44, 34, 10, 22, { hMin: 12, hMax: 26, base: true }),
    skull: [skull()],
    stipa_fg_l: featherGrass(84, 118, 15, 31, { hMin: 46, hMax: 104 }),
    stipa_fg_r: featherGrass(78, 110, 13, 32, { hMin: 40, hMax: 96 }),
    bird: eagles(),
  }),
  kinds: {
    // the zeppelin crawls west against the wind, its propellers turning; the clouds drift east
    zeppelin: { anchor: [0.5, 0.5], mode: 'loop', ms: 120, drift: { speed: -1.1 } },
    cloud_a: { anchor: [0.5, 1], mode: 'static', drift: { speed: 1.5 } },
    cloud_b: { anchor: [0.5, 1], mode: 'static', drift: { speed: 2.1 } },
    cloud_c: { anchor: [0.5, 1], mode: 'static', drift: { speed: 1.0 } },
    // gusts run through the grass now and then, each on its own rhythm
    gust_far_a: { anchor: [0.5, 0.5], mode: 'loop', ms: 150 },
    gust_far_b: { anchor: [0.5, 0.5], mode: 'loop', ms: 170 },
    gust_near: { anchor: [0.5, 0.5], mode: 'loop', ms: 160 },
    smoke_a: { anchor: [0, 1], mode: 'loop', ms: 170 },
    smoke_b: { anchor: [0, 1], mode: 'loop', ms: 190 },
    yurt_a: { anchor: [0.5, 1], mode: 'static' },
    yurt_b: { anchor: [0.5, 1], mode: 'static' },
    // the flags stream in the wind, each pole at its own pace
    pole_a: { anchor: [16 / 46, 1], mode: 'loop', ms: 120 },
    pole_b: { anchor: [16 / 46, 1], mode: 'loop', ms: 135 },
    rail: { anchor: [0.5, 1], mode: 'static' },
    yak_far: { anchor: [0.5, 1], mode: 'loop', ms: GRAZE_MS + 30 },
    yak_near: { anchor: [0.5, 1], mode: 'loop', ms: GRAZE_MS },
    // one yak ambles to and fro along the near steppe, grazing at each end
    yak_roam: { anchor: [0.5, 1], mode: 'loop', ms: 200, roam: { span: 58, speed: 3.75, pause: 14000, walk: 8 } },
    cairn: { anchor: [16 / 54, 1], mode: 'loop', ms: 140 },
    ground: { anchor: [0, 0], mode: 'static' },
    gust_floor_a: { anchor: [0, 0], mode: 'loop', ms: 160 },
    gust_floor_b: { anchor: [0, 0], mode: 'loop', ms: 175 },
    stipa_l: { anchor: [0.5, 1], mode: 'loop', ms: 300 },
    stipa_r: { anchor: [0.5, 1], mode: 'loop', ms: 330 },
    skull: { anchor: [0.5, 1], mode: 'static' },
    stipa_fg_l: { anchor: [0, 1], mode: 'loop', ms: 320 },
    stipa_fg_r: { anchor: [1, 1], mode: 'loop', ms: 350 },
    bird: { anchor: [0.5, 0.5], mode: 'loop', ms: 420 },
  },
  layout,
  horizon: HZ,
};
