// Zone "A Dim Island": Zone 1 of Jakub's working notes (docs/DESIGN_DECISIONS.md
// 5.3, 5.5), redesigned on his brief of 2026-10-11: less symmetrical, more
// broken; autumn on the ground, the light of dawn. The morning after a raid on
// the island's farm. On the left a stubble field with its sheaves behind a
// broken fence, a haystack burning, its smoke leaning east in the wind, and the
// Azure Crown's standard torn and leaning. On the right what is left of a
// dry-stone wall, an autumn tree behind it, and a hay cart tipped over with a
// wheel off and its pumpkins spilled, the Sanguine Dominion's standard snapped
// across it. Above, the dawn sun rising in the upper left (the key light),
// bulky floating islands drifting, and on the right a great rift torn in the
// cosmos, lit blue and white, shedding sparks, with veils of cosmic fabric
// waving out of it. Leaves blow across the field (ZoneDef.ambient 'leaves').
import { flame } from '../fx/kit.ts';
import { dith, disc, ellipseFill, line, outline, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, hex, rng, toHex, withAlpha } from '../raster.ts';
import { MAP_COLS, MAP_ROWS, Painter, PropPlacement, SparkEmitter, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));

// --- the dawn sky: night still in the top right, warm light rising on the left
const SKY = H(['#100f2a', '#16143a', '#1d1a46', '#262050', '#30275a', '#3c2e62', '#4a3568', '#5a3c6c', '#6c446e', '#7e4c6e', '#92566c', '#a6626a', '#ba7068', '#cc8066', '#dc9466', '#e8a86a', '#f2be76', '#f8d28a']);
const SKYC = H(['#0c0e2c', '#10173c', '#14204a', '#192a58', '#1f3464', '#263e6e', '#2e4876', '#38527c', '#445c80', '#526684', '#627086', '#747a88']);
const SUN = H(['#f8c27c', '#ffdca0', '#ffecc8', '#fff8e8']);
const CLW = H(['#2a1e3e', '#3e2650', '#56305c', '#743c66', '#985068', '#bc6a6c', '#da8c72', '#eeb07e', '#f8d09a']);
const CLC = H(['#141c3e', '#1c2c58', '#284274', '#365c92', '#4c7cb0', '#6ea0cc', '#9cc4e4', '#d0e6f6']);
const MTN = H(['#241f3a', '#2e2648', '#3a2e56', '#483864', '#58446e', '#6c5276', '#82627c', '#9a7280']);
const MIST = H(['#4e4066', '#664e74', '#7e5e80', '#987088', '#b4848e', '#d09c96']);
// --- the land: autumn fields, hedges and copses
const FIELD = H(['#241a16', '#33251a', '#45311e', '#573e22', '#6a4c28', '#7e5c2e', '#926c34', '#a67e3c']);
const FOL = H(['#2a100c', '#4a1a10', '#6c2614', '#8e3818', '#b04e1e', '#cc6a26', '#e08c30', '#eeb040', '#f8d058']);
const HEDGE = H(['#16160e', '#201f12', '#2c2a16', '#3a361c']);
const STUB = H(['#2e2414', '#43351a', '#5a4820', '#725c28', '#8c7232', '#a68a40', '#c0a452']);
// --- the near ground (floor): mid value, low contrast
const AGR = H(['#211d13', '#2c2619', '#37301e', '#433923', '#4f4329', '#5b4d2f', '#685836']);
const LEAF = H(['#4a1c0e', '#6a2a12', '#8a3c16', '#a8521c', '#bc6a24', '#cc8630']);
const LEAFF = H(['#3e2414', '#56301a', '#6c3e1e', '#824c22', '#96602a']);
const FOLF = H(['#2e1a18', '#42241c', '#58301e', '#6e3e22', '#864e28', '#9c602e']);
const EARTH = H(['#1b1510', '#261e16', '#33281c', '#413323', '#4f3f2b', '#5f4c35', '#715a40']);
const ASH = H(['#100e10', '#1a1718', '#262222', '#34302e', '#46403c']);
const ST = H(['#0f1017', '#1a1b24', '#262833', '#343744', '#444857', '#565b6b', '#6b7081', '#868b9a']);
const MOSS = H(['#26301f', '#344127', '#43522f']);
const IVY = H(['#3a0e0a', '#621a10', '#8c2c16', '#b4441c', '#d06428']);
// --- props
const WOOD = H(['#140e0a', '#221811', '#322419', '#443222', '#56412d', '#6a523a', '#806648']);
const HAY = H(['#2e2410', '#463616', '#5e4a1e', '#786028', '#927836', '#ac9046', '#c8aa5a']);
const PUMPKIN = H(['#3e1606', '#6e2a0c', '#963e12', '#bc581a', '#d87424', '#ec9634']);
const FIRE = H(['#7a1a10', '#c8361a', '#f2731e', '#ffb84a', '#fff0b0']);
const SMOKE = H(['#1c1a22', '#29252e', '#36313a', '#454048', '#565058', '#6a6268', '#807676']);
const IRON = H(['#0d0d12', '#1b1b23', '#2b2c37', '#3f414e', '#5a5d6b']);
const ROCK = H(['#120e18', '#1c1622', '#28202e', '#342a3a', '#423446', '#524050', '#644e58', '#7a6062', '#94766c']);
const ROCKC = H(['#1a2a4c', '#26406a', '#3a5e8c', '#5c88b4']);
const TOPG = H(['#22220f', '#323014', '#45401a', '#5a5222', '#6e632a', '#867636']);
const FALL = H(['#3a5a8a', '#6a8ab8', '#a8c4e4', '#e0f0ff']);
const BONE = hex('#efe6d2');
// --- the rift and its veils
const VOID = H(['#03020a', '#08061a', '#0e0c2c', '#16143e']);
const NEB = H(['#1c2e78', '#2848a8', '#3a6cd0', '#5a9cec', '#8ccaf8']);
const RIM = H(['#a8e0ff', '#d8f2ff', '#ffffff']);
const VEIL = H(['#1a1658', '#26287a', '#33409c', '#4660bc', '#6488d6', '#8cb2ea', '#bcdaf8', '#eef8ff']);
// --- the two standards
const AZURE = H(['#0a1430', '#122458', '#1c3c8c', '#2856b8', '#4a7ae0', '#7aa4f4']);
const SABLE = H(['#050407', '#0c0a0f', '#151219', '#1f1b24', '#2a2530', '#37313e']);
const GOLD = H(['#3a1e08', '#7a4a12', '#c08a28', '#f0c650', '#fff0a0']);
const BLOOD = H(['#3a0a12', '#7a1622', '#b02a36', '#e0505a', '#ff9a96']);

/** the dawn sun, low in the upper left: the key light */
const SUN_X = 84, SUN_Y = 90;
/** where the far land meets the sky */
const HZ = 126;
/** the rift: a jagged tear from high on the right down to the left, above the wall */
const RIFT_TOP = { x: 614, y: 36 }, RIFT_BOT = { x: 458, y: 120 };
const RIFT_BOX = { x: 426, y: 20, w: 214, h: 118 };

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

/** How far a pixel is inside its tile: 0 on the border band, 1 from 6 px in. */
const inner = (x: number, y: number) => clamp((Math.min(x, y, TILE - 1 - x, TILE - 1 - y) - 1) / 5, 0, 1);

// ---------------------------------------------------------------------------
// The rift: one geometry for its painting, its sparks and the roots of its veils
// ---------------------------------------------------------------------------

const RL = Math.hypot(RIFT_BOT.x - RIFT_TOP.x, RIFT_BOT.y - RIFT_TOP.y);
const RU = { x: (RIFT_BOT.x - RIFT_TOP.x) / RL, y: (RIFT_BOT.y - RIFT_TOP.y) / RL };
const RP = { x: -RU.y, y: RU.x };
/** the tear's centre wanders off the straight line, a jagged zigzag */
const riftJag = (t: number) => Math.sin(t * 9.5) * 3 + Math.sin(t * 23 + 1) * 1.6 + (n1(t * 220, 6, 81) - 0.5) * 4;
/** half the tear's width: thin at both ends, widest a little above the middle */
const riftHalf = (t: number) => (t <= 0 || t >= 1 ? 0 : 19 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.8) * (0.82 + 0.36 * n1(t * 160, 9, 83)) + 0.6);
/** a screen point at (t along the tear, s across it) */
const riftAt = (t: number, s: number) => ({ x: RIFT_TOP.x + RU.x * t * RL + RP.x * s, y: RIFT_TOP.y + RU.y * t * RL + RP.y * s });
/** a screen point's place relative to the tear */
function riftCoords(x: number, y: number) {
  const dx = x - RIFT_TOP.x, dy = y - RIFT_TOP.y;
  const t = (dx * RU.x + dy * RU.y) / RL;
  const s = dx * RP.x + dy * RP.y - riftJag(t);
  return { t, s };
}

/** The two lips of the tear, for the spark emitters. */
function riftLips(): [number, number][][] {
  const lips: [number, number][][] = [[], []];
  for (let k = 0; k <= 24; k++) {
    const t = 0.04 + (k / 24) * 0.92;
    const hw = riftHalf(t);
    for (const [i, sgn] of [[0, -1], [1, 1]] as const) {
      const p = riftAt(t, riftJag(t) + sgn * hw);
      lips[i].push([Math.round(p.x), Math.round(p.y)]);
    }
  }
  return lips;
}

/** A point on the tear's centre line, where a veil takes root. */
const riftRoot = (t: number): [number, number] => {
  const p = riftAt(t, riftJag(t));
  return [Math.round(p.x), Math.round(p.y)];
};

/**
 * The veils of cosmic fabric: each flows from its root inside the tear (the
 * rift is drawn over the root) out across the sky. Paths in screen pixels.
 */
const VEILS = [
  { kind: 'veil_a', path: [riftRoot(0.45), [508, 64], [466, 58], [420, 50], [374, 44], [334, 40], [302, 34]] as [number, number][], width: 16, amp: 7, waves: 1.4, twists: 1.2, ms: 130, seed: 211 },
  { kind: 'veil_b', path: [riftRoot(0.78), [470, 108], [444, 114], [416, 118], [392, 122], [368, 122]] as [number, number][], width: 12, amp: 5, waves: 1.2, twists: 1, ms: 120, seed: 212 },
  { kind: 'veil_c', path: [riftRoot(0.16), [576, 38], [556, 26], [532, 18], [506, 14]] as [number, number][], width: 10, amp: 5, waves: 1, twists: 0.8, ms: 140, seed: 213 },
];

/** A veil's bitmap box: its path's bounds with room for its width and its wave. */
function veilBox(v: (typeof VEILS)[number]) {
  const m = Math.ceil(v.width + v.amp + 3);
  const xs = v.path.map((p) => p[0]), ys = v.path.map((p) => p[1]);
  const x = Math.min(...xs) - m, y = Math.max(0, Math.min(...ys) - m);
  return { x, y, w: Math.max(...xs) + m - x, h: Math.max(...ys) + m - y };
}

// ---------------------------------------------------------------------------
// Tiles: autumn grass with fallen leaves, the broken dry-stone wall
// ---------------------------------------------------------------------------

/** One fallen leaf: two pixels lit on the left, a dark pixel under it; `muted` for the floor. */
function leafSpeck(b: Bitmap, x: number, y: number, tone: number, muted = false) {
  const ramp = muted ? LEAFF : LEAF;
  b.set(x, y, ramp[clamp(tone + 1, 0, ramp.length - 1)]);
  b.set(x + 1, y, ramp[clamp(tone, 0, ramp.length - 1)]);
  if (b.get(x, y + 1) !== 0) b.set(x, y + 1, AGR[1]);
}

/**
 * Autumn grass: one base field shared by every variant (so any two tiles
 * join), each variant's own patches faded in away from the border, dry blades,
 * tufts and the leaves fallen on it.
 */
function grass(o: { patch?: number; tufts?: number; stones?: number; leaves?: number; shade?: number; gold?: number } = {}): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        let v = 3.1 + (tnoise(x, y, 16, 3) - 0.5) * 0.8 + (tnoise(x, y, 8, 4) - 0.5) * 0.5;
        v += ((tnoise(x, y, 16, seed) - 0.5) * 0.9 + (o.patch ?? 0) * (tnoise(x, y, 8, seed + 1) - 0.5)) * inner(x, y);
        if (hash2(x, y, 7) > 0.9) v += 0.9;
        else if (hash2(x, (y + 31) % TILE, 7) > 0.9) v -= 0.7;
        if (o.shade) v -= o.shade * Math.max(0, 1 - y / 12);
        // a patch of grass dried golden, faded in away from the border
        const gold = (o.gold ?? 0) * inner(x, y) * Math.max(0, tnoise(x, y, 16, seed + 7) - 0.35) * 2.4;
        b.set(x, y, gold > 0 && dith(x, y, Math.min(1, gold)) ? rampDither(STUB, v - 0.6, x, y) : rampDither(AGR, v, x, y));
      }
    }
    const r = rng(seed);
    for (let i = 0; i < (o.tufts ?? 2); i++) tuft(b, 5 + Math.floor(r() * 22), 9 + Math.floor(r() * 18), r);
    for (let i = 0; i < (o.stones ?? 0); i++) pebble(b, 5 + Math.floor(r() * 21), 6 + Math.floor(r() * 20), r);
    // the leaves lie in a small drift or two, not spread evenly
    const nl = o.leaves ?? 2;
    const groups = Math.max(1, Math.round(nl / 4));
    for (let g = 0; g < groups; g++) {
      const gx = 5 + r() * 20, gy = 5 + r() * 20;
      for (let i = 0; i < Math.ceil(nl / groups); i++) leafSpeck(b, Math.round(clamp(gx + (r() - 0.5) * 9, 3, 27)), Math.round(clamp(gy + (r() - 0.5) * 6, 3, 27)), Math.floor(r() * 4), true);
    }
  };
}

/** A tuft of dry blades, lit on the left, rooted in a small shadow. */
function tuft(b: Bitmap, x: number, y: number, r: () => number) {
  for (let k = -3; k <= 3; k++) {
    const h = 3 + Math.floor(r() * 3) - Math.abs(k) / 2;
    const lean = k * 0.35 + 0.6;
    for (let i = 0; i < h; i++) b.set(Math.round(x + k + lean * (i / h)), y - i, i === h - 1 ? STUB[k < 0 ? 4 : 3] : AGR[k < 0 ? 5 : 4]);
  }
  for (let k = -3; k <= 3; k++) b.set(x + k, y + 1, AGR[1]);
}

function pebble(b: Bitmap, x: number, y: number, r: () => number) {
  const w = 2 + Math.floor(r() * 2);
  for (let k = 0; k < w; k++) {
    b.set(x + k, y, ST[k === 0 ? 5 : 4]);
    b.set(x + k, y + 1, ST[3]);
  }
  b.set(x + w, y + 1, AGR[1]);
  for (let k = 0; k <= w; k++) b.set(x + k, y + 2, AGR[1]);
}

/** Dry-stone courses: irregular flat stones laid without mortar, lit on top and left, dark gaps. */
function drystone(b: Bitmap, seed: number, top = 0, bottom = TILE) {
  let y = top;
  let row = 0;
  while (y < bottom) {
    const r = rng(seed * 17 + row * 31);
    const h = Math.min(bottom - y, 5 + Math.floor(r() * 3));
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
          if ((lx === 0 || lx === w - 2) && (ly === 0 || ly === h - 2)) {
            b.set(xx, yy, ST[2]);
            continue;
          }
          let v = tone + (ly === 0 ? 1.2 : 0) + (lx === 0 ? 0.6 : 0) - (ly === h - 2 ? 0.9 : 0) - (lx === w - 2 ? 0.5 : 0);
          v += (hash2(xx, yy, seed) - 0.5) * 0.5 - (yy - top) * 0.02;
          b.set(xx, yy, rampDither(ST, v, xx, yy));
        }
      }
      if (r() < 0.3) for (let k = 1; k < w - 2; k++) if (hash2(x + k, y, seed) > 0.45 && x + k >= 0 && x + k < TILE) b.set(x + k, y, MOSS[k < 3 ? 2 : 1]);
      x += w;
    }
    y += h;
    row++;
  }
}

/** The capstones along the top of the wall, set on edge, from y0 down to the bed. */
function coping(b: Bitmap, y0: number, seed: number, from = 0, to = TILE) {
  const r = rng(seed);
  for (let x = from; x < to; ) {
    const w = 4 + Math.floor(r() * 3);
    const h = 4 + Math.floor(r() * 3);
    const top = y0 + 8 - h;
    for (let yy = top; yy < y0 + 8; yy++) {
      for (let xx = x; xx < Math.min(to, x + w); xx++) {
        const lx = xx - x, ly = yy - top;
        if (lx === w - 1) {
          b.set(xx, yy, ST[1]);
          continue;
        }
        if (ly === 0 && (lx === 0 || lx === w - 2)) continue;
        const v = 4 + (ly === 0 ? 1.4 : ly === 1 ? 0.6 : 0) + (lx === 0 ? 0.6 : 0) - ly * 0.15 + (hash2(xx, yy, seed) - 0.5) * 0.5;
        b.set(xx, yy, rampDither(ST, v, xx, yy));
      }
    }
    x += w;
  }
  for (let x = from; x < to; x++) {
    b.set(x, y0 + 8, ST[1]);
    b.set(x, y0 + 9, ST[2]);
  }
}

/** Dry grass and leaves heaped against the foot of the wall, `from` px from the tile top. */
function footGrass(b: Bitmap, from: number, seed: number) {
  for (let x = 0; x < TILE; x++) {
    const h = 2 + Math.floor(hash2(x, 1, seed) * 4) + (hash2(x >> 2, 2, seed) > 0.6 ? 2 : 0);
    for (let i = 0; i < h; i++) {
      const y = TILE - 1 - i;
      if (y < from) break;
      const leaf = hash2(x, y, seed + 5) > 0.82;
      b.set(x, y, leaf ? LEAF[2 + (x % 3)] : rampDither(AGR, 2.4 + i * 0.6 + (x % 3 === 0 ? 0.6 : 0), x, y));
    }
  }
}

/** Fallen stones of a broken wall: a heap lit from the upper left, from `top` down. */
function rubble(b: Bitmap, seed: number, top: number, x0 = 0, x1 = TILE) {
  const r = rng(seed);
  for (let k = 0; k < 14; k++) {
    const cx = x0 + 3 + r() * (x1 - x0 - 6), cy = top + 4 + Math.pow(r(), 0.7) * (TILE - top - 7);
    const rx = 2.5 + r() * 3.5, ry = 1.8 + r() * 2.2;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (x < x0 || x >= x1 || y < top || y >= TILE) continue;
        const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
        if (d > 1) continue;
        const v = d > 0.85 ? 1.2 : 4.2 - (x - cx) / rx - ((y - cy) / ry) * 1.2 + (hash2(x, y, seed) - 0.5) * 0.4;
        b.set(x, y, rampDither(ST, v, x, y));
      }
    }
  }
}

/** Autumn ivy over the wall: dark vines and clusters of red and orange leaves. */
function ivy(b: Bitmap, seed: number) {
  const r = rng(seed);
  for (let k = 0; k < 4; k++) {
    let x = 4 + r() * 24, y = 0;
    while (y < TILE - 4) {
      x += (r() - 0.5) * 2;
      y += 1;
      if (x < 0 || x >= TILE) break;
      b.set(Math.round(x), y, IVY[0]);
      if (r() < 0.32) {
        const lx = Math.round(x + (r() - 0.5) * 4), ly = y;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) if (lx + dx >= 0 && lx + dx < TILE) b.set(lx + dx, ly + dy, IVY[dx === 0 && dy === 0 ? 4 : 2 + Math.floor(r() * 2)]);
      }
    }
  }
}

const P: Record<string, Painter> = {
  // --- the floor: autumn grass, leafier variants, and a darker one in the wall's shadow
  grass_a: grass({ tufts: 2, leaves: 2 }),
  grass_b: grass({ tufts: 1, stones: 1, leaves: 0 }),
  grass_c: grass({ patch: 0.8, tufts: 2, leaves: 3 }),
  grass_d: grass({ patch: 0.6, tufts: 3, leaves: 0 }),
  grass_e: grass({ tufts: 1, leaves: 4 }),
  grass_f: grass({ patch: 1, tufts: 2, stones: 2, leaves: 1 }),
  golden_a: grass({ patch: 0.5, tufts: 2, leaves: 1, gold: 0.9 }),
  golden_b: grass({ tufts: 3, leaves: 2, gold: 0.6 }),
  leafy_a: grass({ tufts: 1, leaves: 10 }),
  leafy_b: grass({ patch: 0.7, tufts: 2, leaves: 7 }),
  shade_a: grass({ tufts: 1, leaves: 3, shade: 1.1 }),
  shade_b: grass({ patch: 0.6, tufts: 2, leaves: 5, shade: 1.1 }),
  // --- the wall that is left on the right: coping on the upper tile, courses and dry grass below
  wall_top: (b, s) => {
    coping(b, 16, s);
    drystone(b, s, 26);
  },
  wall_top_b: (b, s) => {
    // a capstone gone, the course below cracked
    coping(b, 16, s);
    for (let y = 14; y < 26; y++) for (let x = 12; x < 19; x++) b.set(x, y, 0);
    drystone(b, s, 26);
    line(b, 14, 26, 18, 31, ST[0]);
  },
  wall_face: (b, s) => {
    drystone(b, s + 3, 0);
    footGrass(b, 20, s);
  },
  wall_face_ivy: (b, s) => {
    drystone(b, s + 5, 0);
    ivy(b, s);
    footGrass(b, 22, s);
  },
  // the broken left end: the courses step down into a heap of fallen stones
  wall_top_end: (b, s) => {
    drystone(b, s, 26);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (y < 26 + Math.max(0, (16 - x) * 0.5)) b.set(x, y, 0);
    coping(b, 22, s + 1, 18, TILE);
  },
  wall_face_end: (b, s) => {
    drystone(b, s + 3, 0);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < 14; x++) if (y < 14 - x * 0.2 + (14 - x) * 0.6) b.set(x, y, 0);
    rubble(b, s + 7, 12, 0, 18);
    footGrass(b, 24, s);
  },
  // the breach: the upper courses gone, a heap of stones where they fell
  breach_top: (b, s) => {
    rubble(b, s, 25, 0, TILE);
  },
  breach_face: (b, s) => {
    drystone(b, s + 9, 12);
    for (let y = 12; y < 20; y++) for (let x = 0; x < TILE; x++) if (y < 12 + Math.abs(x - 16) * 0.5) b.set(x, y, 0);
    rubble(b, s + 3, 0, 2, TILE - 2);
    footGrass(b, 24, s + 4);
  },
};

// ---------------------------------------------------------------------------
// Backdrop: the dawn sky, its clouds, the far mountains in their sea of mist,
// then the island's own land: autumn fields, hedges and copses, the burnt
// farm, the road out, and the stubble field and sheaves on the left
// ---------------------------------------------------------------------------

function backdrop(W = 640, HH = 200): Bitmap {
  const b = new Bitmap(W, HH);
  sky(b, W);
  clouds(b, W);
  mountains(b, W);
  land(b, W, HH);
  return b;
}

/** How strongly the rift lights the sky around a point (0..1). */
function riftLight(x: number, y: number): number {
  const { t, s } = riftCoords(x, y);
  const tc = clamp(t, 0, 1);
  const d = Math.hypot((t - tc) * RL, Math.max(0, Math.abs(s) - riftHalf(tc) * 0.5));
  return Math.max(0, 1 - d / 120);
}

function sky(b: Bitmap, W: number) {
  for (let y = 0; y < HZ + 12; y++) {
    for (let x = 0; x < W; x++) {
      const t = Math.pow(clamp(y / (HZ + 4), 0, 1), 1.1);
      const sun = Math.max(0, 1 - Math.hypot((x - SUN_X) / 1.7, (y - SUN_Y) * 1.25) / 270);
      const rl = riftLight(x, y);
      // the cool, rift-lit side takes over toward the right and near the tear
      const cool = clamp((x - 250) / 260, 0, 1) * (1 - sun * 1.4) * 0.9 + rl * 0.5;
      const warm = rampDither(SKY, t * (SKY.length - 1) * 0.92 + sun * sun * 4.6, x, y);
      const cold = rampDither(SKYC, t * (SKYC.length - 1) + rl * rl * 4.5, x, y);
      b.set(x, y, dith(x, y, clamp(cool, 0, 1)) ? cold : warm);
    }
  }
  // the last stars, fading toward the light
  const r = rng(17);
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(r() * W), y = Math.floor(Math.pow(r(), 1.6) * 80);
    const fade = clamp((x - 180) / 300, 0, 1) * (1 - y / 90);
    if (fade < 0.15 || r() > fade + 0.2) continue;
    b.set(x, y, withAlpha(r() < 0.3 ? CLC[7] : hex('#e8e4ff'), 80 + Math.floor(fade * 150)));
  }
  // the sun: a soft halo and a white-gold disc rising between the far peaks
  disc(b, SUN_X, SUN_Y, 34, (x, y, d) => (dith(x, y, (1 - d) * 0.7) ? SKY[14 + (d < 0.45 ? 2 : d < 0.7 ? 1 : 0)] : 0));
  disc(b, SUN_X, SUN_Y, 12, (x, y, d) => (d > 0.86 ? SUN[1] : rampDither(SUN, 3.6 - d * 1.2 - (x - SUN_X + (y - SUN_Y)) / 26, x, y)));
}

/** Long dawn strata, lit from below by the rising sun; near the rift the cold light takes them. */
function clouds(b: Bitmap, W: number) {
  const strata: [number, number, number, number][] = [
    [150, 58, 96, 4],
    [40, 88, 70, 3],
    [262, 30, 70, 3],
    [330, 76, 118, 5],
    [196, 100, 104, 4],
    [520, 54, 80, 4],
    [600, 92, 70, 4],
    [420, 104, 90, 3],
    [96, 72, 56, 2],
  ];
  strata.forEach(([cx, cy, rx, th], i) => {
    for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
      if (x < 0 || x >= W) continue;
      const k = (x - cx) / rx;
      const thick = th * Math.sqrt(Math.max(0, 1 - k * k)) * (0.5 + 1 * n1(x, 9, i * 7 + 1));
      if (thick < 0.9) continue;
      const mid = cy + (n1(x, 31, i * 7 + 2) - 0.5) * 5;
      const top = mid - thick * 0.4, bottom = mid + thick * 0.6;
      const sun = Math.max(0, 1 - Math.hypot(x - SUN_X, cy - SUN_Y) / 330);
      const rl = riftLight(x, mid);
      for (let y = Math.floor(top); y < bottom; y++) {
        if (y < 0 || y >= HZ) continue;
        const kk = (y - top) / Math.max(1, bottom - top);
        // the underside catches the low sun (or the rift), the top stays in shade
        const lit = kk * 2.4 + sun * 3.6 + (cy / HZ) * 1.6;
        const cold = rl > 0.35 || x > 470;
        b.set(x, y, cold ? rampDither(CLC, 0.6 + kk * 2 + rl * 4.2, x, y) : rampDither(CLW, lit, x, y));
      }
    }
  });
}

/** The far mountains, lilac in the haze, their left faces pink with dawn, standing in a sea of mist. */
function mountains(b: Bitmap, W: number) {
  const ridge = (x: number) => 114 - n1(x, 46, 91) * 18 - n1(x, 13, 92) * 6 + (x > 360 ? 4 : 0) + Math.max(0, 1 - Math.abs(x - SUN_X) / 80) * 14;
  for (let x = 0; x < W; x++) {
    const top = Math.round(ridge(x));
    const slope = ridge(x + 1) - ridge(x - 1);
    const sun = Math.max(0, 1 - Math.abs(x - SUN_X) / 280);
    for (let y = top; y < HZ + 10; y++) {
      const depth = (y - top) / 20;
      const v = 3.4 + slope * 1.6 + sun * 2.2 - depth * 1.2 + (y === top ? 1 : 0);
      b.set(x, y, rampDither(MTN, v, x, y));
    }
  }
  // the sea of mist the peaks stand in, brightest under the sun
  for (let x = 0; x < W; x++) {
    const crest = 118 + (n1(x, 17, 93) - 0.5) * 7 + (n1(x, 6, 94) - 0.5) * 2;
    const sun = Math.max(0, 1 - Math.abs(x - SUN_X) / 300);
    for (let y = Math.floor(crest); y < HZ + 12; y++) {
      const k = (y - crest) / (HZ + 12 - crest);
      const slope = n1(x + 2, 17, 93) - n1(x - 2, 17, 93);
      if (!dith(x, y, 0.55 + k * 0.45)) continue;
      b.set(x, y, rampDither(MIST, 3.4 - k * 2.4 - slope * 5 + sun * 1.6 - (x > 420 ? 0.9 : 0), x, y));
    }
  }
}

/**
 * The island's own land from the mist to the floor: far autumn fields in
 * bands, hedgerows and copses, the burnt farm with its smoke, the road
 * winding out from the arena toward it, and on the left the stubble field
 * with its sheaves.
 */
function land(b: Bitmap, W: number, HH: number) {
  const edge = (x: number) => HZ + Math.round((n1(x, 40, 101) - 0.5) * 6 + (n1(x, 11, 102) - 0.5) * 2);
  const roadX = (y: number) => 352 - Math.pow((HH - y) / (HH - HZ), 0.9) * 62 + Math.sin((HH - y) * 0.11) * 5 * ((HH - y) / (HH - HZ));
  const roadHalf = (y: number) => 1 + Math.pow(clamp((y - HZ) / (HH - HZ), 0, 1), 1.7) * 22;
  for (let x = 0; x < W; x++) {
    const e = edge(x);
    for (let y = e; y < HH; y++) {
      const depth = (y - e) / (HH - e);
      const sun = Math.max(0, 1 - Math.abs(x - SUN_X) / 360) * (1 - depth);
      // field bands: each band a field of its own tone, hedges between them
      const period = 3 + depth * 9;
      const yy = y - e + n1(x, 30, 103) * 6;
      const band = Math.floor(yy / period);
      const tone = hash2(band, Math.floor((x + band * 37) / (60 + depth * 80)), 104);
      let v = 1.6 + depth * 3.4 + (tone - 0.5) * 1.6 + sun * 1.8 + (hash2(x >> 1, y, 105) - 0.5) * 0.5;
      let ramp = FIELD;
      if (depth > 0.58 && dith(x, y, clamp((depth - 0.58) / 0.14, 0, 1))) {
        // near the arena the fields give way to the island's grass, the floor's colors
        ramp = AGR;
        v = 2.2 + (depth - 0.62) * 4 + (vnoise(x, y, 7, 106) - 0.5) * 0.9;
      }
      const hedge = yy % period < 0.9 && depth < 0.6 && hash2(Math.floor(x / 23), band, 107) > 0.35;
      let c = hedge ? HEDGE[Math.min(3, 1 + Math.floor(depth * 3))] : rampDither(ramp, v, x, y);
      // the road out of the arena, narrowing to a thread toward the burnt farm
      const dr = Math.abs(x + 0.5 - roadX(y)) - roadHalf(y);
      if (dr < 0 || (dr < 1.5 && dith(x, y, 0.5))) {
        const rut = Math.abs(Math.abs(x + 0.5 - roadX(y)) - roadHalf(y) * 0.45) < 0.6 + depth;
        c = rampDither(EARTH, 1.6 + depth * 2.6 + (hash2(x, y, 9) - 0.5) * 0.6 - (rut ? 0.8 : 0) + sun, x, y);
      }
      b.set(x, y, c);
    }
    b.set(x, e, x < 300 ? MIST[3] : MIST[2]);
  }
  // copses of autumn trees in the fields: clumps of round crowns, hazier with distance
  const r = rng(111);
  for (let c = 0; c < 11; c++) {
    const gx = 20 + r() * 600, gy = HZ + 6 + Math.pow(r(), 1.4) * 30;
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const x = Math.round(gx + (r() - 0.5) * 22), y = Math.round(gy + (r() - 0.5) * 4);
      if (Math.abs(x - roadX(y)) < roadHalf(y) + 6 || (x < 200 && y > HZ + 26)) continue;
      const s = 1.6 + ((y - HZ) / 40) * 3 * (0.7 + r() * 0.5);
      copseTree(b, x, y, s, r(), (y - HZ) / 40);
    }
  }
  // dawn fog lying low between the far fields, thinning toward the arena
  for (let y = e0(HZ); y < HZ + 40; y++) {
    for (let x = 0; x < W; x++) {
      const band = Math.sin((y - HZ) * 0.42 + n1(x, 40, 109) * 3);
      const k = Math.max(0, band - 0.55) * (1 - (y - HZ) / 40) * 1.6;
      if (k > 0 && dith(x, y, k * (0.6 + 0.4 * n1(x, 23, 110)))) b.set(x, y, MIST[x < 300 ? 3 : 2]);
    }
  }
  // the burnt farm in the middle distance, smoke still rising
  farm(b, 284, HZ + 22);
  stubbleField(b, HH);
}

/** The far land's top edge at a column, never above the horizon line. */
const e0 = (y: number) => y + 2;

function copseTree(b: Bitmap, x: number, y: number, s: number, hue: number, near: number) {
  const ramp = near > 0.5 ? FOL : FOLF;
  const lo = (hue < 0.35 ? 1.6 : hue < 0.75 ? 2.4 : 3.2) + (near > 0.5 ? 0.6 : 0);
  for (let i = 1; i <= Math.ceil(s * 0.8); i++) b.set(x, y - i + 1, WOOD[1]);
  ellipseFill(b, x + 0.5, y - s * 1.1, s, s * 0.85, (px, py) => rampDither(ramp, lo + 1.4 - (px - x) / (s + 1) - (py - (y - s * 1.1)) / (s + 1), px, py));
}

/** A farmstead burnt in the night: a roofless stone house, a fallen gable, smoke threading up. */
function farm(b: Bitmap, cx: number, base: number) {
  for (let y = base - 10; y < base; y++) {
    for (let x = cx - 12; x < cx + 12; x++) {
      const broken = y < base - 10 + Math.abs(Math.sin(x * 0.9)) * 4 && x > cx;
      if (broken) continue;
      b.set(x, y, rampDither(ST, 3.6 - (x - cx + 12) / 16 - (y - base + 10) / 14, x, y));
    }
  }
  // the gable still standing on the left, its window a dark slot
  polyFill(b, [[cx - 12, base - 10], [cx - 5, base - 18], [cx + 1, base - 10]], (x, y) => rampDither(ST, 3.8 - (x - cx + 12) / 12, x, y));
  b.set(cx - 6, base - 13, ST[0]);
  b.set(cx - 6, base - 12, ST[0]);
  for (const [x0, y0, x1, y1] of [[cx - 2, base - 11, cx + 6, base - 16], [cx + 3, base - 10, cx + 9, base - 14]] as const) line(b, x0, y0, x1, y1, WOOD[0]);
  for (let x = cx - 6; x < cx + 6; x += 3) b.set(x, base - 5, ST[0]);
  // smoke: a thread rising and leaning east, widening as it climbs
  for (let i = 0; i < 70; i++) {
    const t = i / 70;
    const y = base - 16 - i * 1.1, x = cx + 4 + t * t * 34 + Math.sin(i * 0.22) * 2;
    const rad = 1 + t * 4;
    for (let k = -Math.ceil(rad); k <= Math.ceil(rad); k++) {
      const px = Math.round(x + k), py = Math.round(y);
      if (py < 0) continue;
      if (dith(px, py, (1 - Math.abs(k) / (rad + 1)) * (1 - t) * 0.85)) b.set(px, py, SMOKE[t < 0.4 ? 4 : 3]);
    }
  }
}

/** The stubble field on the left: rows running back toward the light, the harvest standing in sheaves. */
function stubbleField(b: Bitmap, HH: number) {
  const top = HZ + 30, vx = 230, vy = HZ + 2;
  for (let y = top; y < HH; y++) {
    const depth = (y - top) / (HH - top);
    const right = 150 + depth * 40 + n1(y, 9, 121) * 10 + n1(y, 3, 123) * 4;
    for (let x = 0; x < right; x++) {
      if (right - x < 5 && !dith(x, y, (right - x) / 5)) continue;
      // the rows converge on a point near the horizon
      const ang = Math.atan2(y - vy, x - vx);
      const row = Math.floor(ang * 34) % 2 === 0;
      const sun = Math.max(0, 1 - Math.hypot(x - SUN_X, y - SUN_Y) / 200);
      const v = 2.2 + depth * 2.2 + (row ? 0.9 : -0.4) + sun * 1.2 + (hash2(x, y, 122) - 0.5) * 0.9 - (right - x < 4 ? 0.8 : 0);
      b.set(x, y, rampDither(STUB, v, x, y));
    }
  }
  // sheaves standing in rows, bigger toward the camera
  const r = rng(131);
  for (let i = 0; i < 26; i++) {
    const y = top + 4 + Math.pow(r(), 0.8) * (HH - top - 10);
    const depth = (y - top) / (HH - top);
    const x = 6 + r() * (130 + depth * 40);
    sheaf(b, x, y, 2 + depth * 4.5);
  }
}

/** A sheaf of harvested grain standing on end, bound in the middle, lit from the left. */
function sheaf(b: Bitmap, cx: number, base: number, h: number) {
  const w = Math.max(1.2, h * 0.55);
  polyFill(b, [[cx - w, base], [cx - w * 0.35, base - h * 0.55], [cx - w * 0.7, base - h], [cx + w * 0.7, base - h], [cx + w * 0.35, base - h * 0.55], [cx + w, base]], (x, y) => rampDither(HAY, 4.6 - (x - cx + w) / (w * 1.4) - (y - base + h) / (h * 2.2), x, y));
  if (h > 3) for (let x = Math.round(cx - w * 0.35); x <= cx + w * 0.35; x++) b.set(x, Math.round(base - h * 0.55), HAY[1]);
  for (let x = Math.round(cx - w); x <= cx + w + 1; x++) b.set(x, Math.round(base), STUB[0]);
}

// ---------------------------------------------------------------------------
// The far layer: the rift, its veils, the floating islands, the autumn tree
// ---------------------------------------------------------------------------

/**
 * The rift torn in the cosmos: deep space inside, a blue nebula and stars,
 * lips burning white-blue, cracks running out into the sky and a cold halo.
 * `bright`: frame 1 of the pulse, the lips flaring.
 */
function rift(bright: boolean): Bitmap {
  const B = RIFT_BOX;
  const b = new Bitmap(B.w, B.h);
  for (let y = 0; y < B.h; y++) {
    for (let x = 0; x < B.w; x++) {
      const sx = x + B.x, sy = y + B.y;
      const { t, s } = riftCoords(sx + 0.5, sy + 0.5);
      if (t < -0.05 || t > 1.05) continue;
      const half = riftHalf(clamp(t, 0, 1));
      const hw = half + (n1(t * RL, 2.5, 141) - 0.5) * 2.2 * Math.min(1, half / 4);
      const a = Math.abs(s);
      if (a < hw - 2.2 && hw > 2.5) {
        // inside: the dark of space, a nebula curling through it, stars
        const k = a / hw;
        const neb = vnoise(sx * 0.8 + t * 30, sy * 0.8, 9, 142) * 0.7 + vnoise(sx, sy, 4, 143) * 0.3;
        let c = rampDither(VOID, 3.2 - k * 1.5 - (1 - neb) * 1.2, x, y);
        if (neb > 0.52) c = rampDither(NEB, (neb - 0.52) * 9 + (1 - k) * 0.8 + (bright ? 0.4 : 0), x, y);
        if (k > 0.72 && dith(x, y, (k - 0.72) * 3)) c = NEB[3];
        const star = hash2(sx, sy, 144);
        if (star > 0.985) c = star > 0.995 ? RIM[2] : RIM[0];
        b.set(x, y, c);
      } else if (a < hw) {
        // the lips: white-hot at the edge
        b.set(x, y, RIM[bright ? 2 : a > hw - 1 ? 1 : 2]);
      } else if (a < hw + (bright ? 9 : 7)) {
        // the cold halo
        const k = 1 - (a - hw) / (bright ? 9 : 7);
        if (dith(x, y, k * (bright ? 0.95 : 0.75))) b.set(x, y, withAlpha(k > 0.6 ? RIM[0] : NEB[4], Math.round(110 + k * 110)));
      }
    }
  }
  // cracks running out from the lips into the sky, branching
  const r = rng(151);
  for (let k = 0; k < 9; k++) {
    const t = 0.1 + r() * 0.8, side = r() < 0.5 ? -1 : 1;
    const p = riftAt(t, riftJag(t) + side * riftHalf(t));
    let x = p.x - B.x, y = p.y - B.y;
    let ang = Math.atan2(RP.y * side, RP.x * side) + (r() - 0.5) * 1.4;
    const len = 8 + r() * (bright ? 26 : 20);
    for (let i = 0; i < len; i++) {
      ang += (r() - 0.5) * 0.5;
      x += Math.cos(ang);
      y += Math.sin(ang);
      const px = Math.round(x), py = Math.round(y);
      if (px < 0 || py < 0 || px >= B.w || py >= B.h) break;
      const fade = 1 - i / len;
      b.set(px, py, fade > 0.5 ? RIM[bright ? 2 : 1] : withAlpha(RIM[0], Math.round(120 + fade * 200)));
      if (i > 4 && r() < 0.12) {
        // a short twig
        let bx = x, by = y;
        const ba = ang + (r() < 0.5 ? -0.9 : 0.9);
        for (let j = 0; j < 5 + r() * 6; j++) {
          bx += Math.cos(ba);
          by += Math.sin(ba);
          const qx = Math.round(bx), qy = Math.round(by);
          if (qx < 0 || qy < 0 || qx >= B.w || qy >= B.h) break;
          b.set(qx, qy, withAlpha(RIM[0], 150));
        }
      }
    }
  }
  return b;
}

/** Catmull-Rom point on a path of control points, t in [0, 1]. */
function catmull(pts: [number, number][], t: number): [number, number] {
  const n = pts.length - 1;
  const f = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const c = (a: number, b2: number, c2: number, d: number) => 0.5 * (2 * b2 + (-a + c2) * u + (2 * a - 5 * b2 + 4 * c2 - d) * u * u + (-a + 3 * b2 - 3 * c2 + d) * u * u * u);
  return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
}

/**
 * A veil of cosmic fabric flowing out of the rift: a translucent ribbon of
 * night-blue cloth threaded with stars, waving along its length and twisting
 * to show its darker back. Frames loop over one wave.
 */
function veil(v: (typeof VEILS)[number], n = 10): Bitmap[] {
  const box = veilBox(v);
  const path = v.path.map(([x, y]) => [x - box.x, y - box.y] as [number, number]);
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const ph = (i / n) * Math.PI * 2;
    const b = new Bitmap(box.w, box.h);
    const r = rng(v.seed);
    const stars = Array.from({ length: 22 }, () => [r(), r() * 2 - 1, r()] as const);
    const steps = 900;
    for (let k = 0; k <= steps; k++) {
      const s = k / steps;
      const [px, py] = catmull(path, s);
      const [qx, qy] = catmull(path, Math.min(1, s + 0.002));
      const tl = Math.hypot(qx - px, qy - py) || 1;
      const nx = -(qy - py) / tl, ny = (qx - px) / tl;
      // the wave travels from the root to the free end; the free end swings widest
      const off = v.amp * Math.pow(s, 1.1) * Math.sin(Math.PI * 2 * v.waves * s - ph);
      const tw = Math.cos(Math.PI * 2 * v.twists * s - ph * 0.5);
      const wid = v.width * (0.45 + 0.55 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15)), 0.6)) * (1 - 0.85 * Math.pow(s, 3)) * (0.3 + 0.7 * Math.abs(tw));
      const front = tw >= 0;
      const cx = px + nx * off, cy = py + ny * off;
      for (let a = -wid / 2; a <= wid / 2; a += 0.5) {
        const x = Math.round(cx + nx * a), y = Math.round(cy + ny * a);
        if (x < 0 || y < 0 || x >= box.w || y >= box.h) continue;
        const across = Math.abs(a) / Math.max(0.5, wid / 2);
        const edge = across > 0.78;
        // the fabric lets the sky show through, except along its hems
        if (!edge && !dith(x, y, 0.82 - s * 0.3)) continue;
        const val = (front ? 4 : 2.2) + (edge ? 2 : 0) - across * 0.8 + (1 - s) * 0.8;
        b.set(x, y, rampDither(VEIL, val, x, y));
      }
      // stars woven into the cloth ride with it
      for (const [ss, aa, br] of stars) {
        if (Math.abs(ss - s) > 0.5 / steps) continue;
        const x = Math.round(cx + nx * aa * wid * 0.35), y = Math.round(cy + ny * aa * wid * 0.35);
        if (x >= 0 && y >= 0 && x < box.w && y < box.h && wid > 3) b.set(x, y, br > 0.6 ? VEIL[7] : VEIL[6]);
      }
    }
    out.push(b);
  }
  return out;
}

/**
 * A floating island: a skin of autumn grass over a deep, bulky body of rock,
 * shaded as one rounded mass lit from the upper left, its strata sagging with
 * it, crags and roots hanging from the underside, autumn trees on top.
 * `cool` adds the rift's cold light along its right flank; `fall`: a thread
 * of water spilling down its right side.
 */
function island(w: number, depth: number, o: { seed: number; cool?: boolean; fall?: boolean; trees?: number; haze?: number }): Bitmap {
  const pad = 6;
  const W = w + pad * 2, HH = Math.round(depth + 34 + pad);
  const b = new Bitmap(W, HH);
  const top = 22;
  const cx = W / 2;
  const haze = o.haze ?? 0;
  // the underside: one big rounded crag, a little off centre, a few lesser crags hanging from it
  const crags = [[-0.55, 0.22, 0.55], [0.4, 0.2, 0.62], [-0.15, 0.12, 0.8]].map(([c, wd, dp]) => [c + (n1(o.seed, 1, 1) - 0.5) * 0.1, wd, dp]);
  const under = (x: number) => {
    const u = (x - cx) / (w / 2);
    if (Math.abs(u) > 1) return -1;
    let d = depth * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u + 0.1), 1.8)), 0.75);
    for (const [c, wd, dp] of crags) d = Math.max(d, depth * dp * Math.max(0, 1 - Math.abs(u - c) / wd) ** 1.4 + depth * 0.25);
    return d * (0.86 + 0.22 * n1(x, 6, o.seed)) + 2;
  };
  const surf = (x: number) => top + (n1(x, 11, o.seed + 2) - 0.5) * 2.6 - Math.max(0, 1 - Math.abs((x - cx) / (w / 2))) * 2.2;
  for (let x = pad; x < W - pad; x++) {
    const d = under(x);
    if (d < 0) continue;
    const s0 = Math.round(surf(x));
    const u = (x - cx) / (w / 2);
    for (let y = s0; y < top + d; y++) {
      if (y - s0 < 3) {
        // the grass skin and its overhanging lip
        b.set(x, y, rampDither(TOPG, 4.4 - (y - s0) * 1.1 - u * 1.2 - haze, x, y));
        continue;
      }
      const k = (y - top) / Math.max(1, d);
      // the body as one rounded mass: lit on the upper left, falling into shadow toward the crag's tip
      const strata = (y - top + n1(x, 18, o.seed + 3) * 5 + u * u * 4) % 7;
      const crack = vnoise(x, y * 2.2, 5, o.seed + 4) > 0.78 ? -1.4 : 0;
      let v = 6.2 - u * 2.2 - k * 3.4 - (strata < 1 ? 1.1 : 0) + crack + (vnoise(x, y, 3, o.seed) - 0.5) * 0.8 - haze;
      if (y - s0 < 6) v += 0.6;
      if (o.cool && u > 0.3) v += (u - 0.3) * 1.2;
      b.set(x, y, rampDither(ROCK, v, x, y));
    }
  }
  if (o.cool) {
    // the rift's cold light along the right flank
    for (let y = 0; y < HH; y++) {
      for (let x = W - 2; x > cx; x--) {
        if (b.get(x, y) === 0) continue;
        b.set(x, y, ROCKC[y % 4 === 0 ? 3 : 2]);
        if (b.get(x - 1, y) !== 0) b.set(x - 1, y, ROCKC[1]);
        break;
      }
    }
  }
  // roots hanging from the underside
  const r = rng(o.seed + 9);
  for (let i = 0; i < Math.round(w / 7); i++) {
    const x = Math.round(cx + (r() - 0.5) * w * 0.85);
    const d = under(x);
    if (d < 4) continue;
    const len = 3 + r() * 8;
    for (let k = 0; k < len; k++) {
      const yy = Math.round(top + d - 1 + k), xx = Math.round(x + Math.sin(k * 0.6 + i) * 0.8);
      if (yy >= HH) break;
      b.set(xx, yy, WOOD[k < len * 0.6 ? 1 : 2]);
    }
  }
  // autumn trees on top: a trunk, a crown of two or three clumps
  const trees = o.trees ?? 3;
  for (let i = 0; i < trees; i++) {
    const tx = Math.round(cx + (i - (trees - 1) / 2) * (w / (trees + 0.4)) + (r() - 0.5) * 5);
    const sc = 0.6 + (w / 120) * 0.7;
    const th = Math.round((6 + r() * 4) * sc);
    const sy = Math.round(surf(tx));
    for (let k = 1; k <= th; k++) {
      b.set(tx, sy - k, WOOD[2]);
      if (k < th * 0.6) b.set(tx + 1, sy - k, WOOD[1]);
    }
    const hue = r();
    const lo = (hue < 0.4 ? 3.2 : hue < 0.75 ? 4.2 : 5.2) - haze;
    for (const [dx, dy, rr] of [[-3.2, 2.5, 3.4], [3, 3, 3.2], [-1.6, -1, 3.4], [2, -2, 3], [0, -5, 2.8], [0.5, 1, 3.6]] as const) {
      const ccx = tx + dx * sc, ccy = sy - th + 1 + dy * sc, rad = rr * sc;
      ellipseFill(b, ccx + 0.5, ccy, rad, rad * 0.9, (px, py, d) => (d > 0.85 && !dith(px, py, 0.5) ? 0 : rampDither(FOL, lo + 1.3 - ((px - ccx) / rad) * 1.1 - ((py - ccy) / rad) * 1.1 - (dy > 0 ? 0.5 : 0), px, py)));
    }
  }
  const out = outline(b, ROCK[0]);
  if (o.fall) {
    // water spilling over the right edge and down the rock, thinning to spray below
    const fx = Math.round(cx + w * 0.34);
    const end = Math.round(top + under(fx) + 14);
    for (let y = Math.round(surf(fx)); y < Math.min(HH, end); y++) {
      const t = clamp((y - (end - 22)) / 22, 0, 1);
      for (let k = 0; k < 2; k++) if (dith(fx + k, y, 1 - t)) out.set(fx + k, y, FALL[k === 0 ? 2 + (y - top < 4 ? 1 : 0) : 1]);
      if (t > 0.3 && dith(fx - 1 + (y % 3), y, t * 0.3)) out.set(fx - 1 + (y % 3), y, FALL[1]);
    }
  }
  return out;
}

/** A few broken rocks drifting near the islands. */
function debris(): Bitmap {
  const b = new Bitmap(30, 22);
  for (const [x, y, rx, ry] of [[6, 6, 4, 3], [20, 12, 3, 2.4], [12, 17, 2, 1.6]] as const) {
    ellipseFill(b, x, y, rx, ry, (px, py) => rampDither(ROCK, 5 - (px - x) / rx - ((py - y) / ry) * 1.3, px, py));
  }
  return outline(b, ROCK[0]);
}

/**
 * The autumn tree behind the wall on the right: a dark trunk and limbs, a
 * crown of red, orange and gold clumps with gaps where the leaves have gone,
 * lit from the left. Frames stir the crown in the wind.
 */
function autumnTree(n = 4): Bitmap[] {
  const W = 110, HH = 124;
  const out: Bitmap[] = [];
  const r0 = rng(161);
  const clumps = Array.from({ length: 26 }, () => {
    const a = r0() * Math.PI * 2, rr = Math.sqrt(r0());
    return [56 + Math.cos(a) * rr * 40, 44 + Math.sin(a) * rr * 26, 5 + r0() * 4, r0()] as const;
  });
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    const ph = (i / n) * Math.PI * 2;
    const limb = (x0: number, y0: number, x1: number, y1: number, rad: number) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      for (let k = 0; k <= len; k++) {
        const t = k / len, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, rr = rad * (1 - t * 0.5);
        for (let a = -rr; a <= rr; a++) {
          const px = Math.round(x + a), py = Math.round(y);
          b.set(px, py, rampDither(WOOD, 3.4 - ((a + rr) / (rr * 2 + 0.1)) * 2.6, px, py));
        }
      }
    };
    limb(56, HH - 1, 55, 70, 4);
    limb(55, 76, 30, 46, 2.4);
    limb(55, 72, 82, 44, 2.4);
    limb(55, 70, 58, 28, 2);
    limb(34, 52, 20, 40, 1.2);
    limb(78, 48, 94, 36, 1.2);
    // the crown: clumps of leaves, each lit on its upper left; the outermost stir in the wind
    for (const [mx, my, mr, hue] of clumps) {
      const edge = Math.hypot((mx - 56) / 40, (my - 44) / 26);
      const sway = Math.sin(ph + mx * 0.15) * edge * 1.4;
      ellipseFill(b, mx + sway, my, mr, mr * 0.82, (px, py, d) => {
        if (d > 0.8 && !dith(px, py, 0.6)) return 0;
        const lit = 3.4 + (1 - edge) * 0.6 - ((px - mx) / mr) * 1.3 - ((py - my) / mr) * 1.3 + (hue - 0.5) * 2 - (my - 30) / 40;
        return rampDither(FOL, lit, px, py);
      });
    }
    out.push(outline(b, FOL[0]));
  }
  return out;
}

// ---------------------------------------------------------------------------
// The back, floor and front props
// ---------------------------------------------------------------------------

/** The haystack burning on the left: a round stack, its top charred and glowing, flames licking up. */
function haystack(n = 8): Bitmap[] {
  const W = 76, HH = 112, cx = 38, base = HH - 1;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const ph = (i / n) * Math.PI * 2;
    const b = new Bitmap(W, HH);
    // the stack: a dome of straw, lit on the left, streaked, black where it burns
    for (let y = base - 36; y <= base; y++) {
      for (let x = cx - 30; x <= cx + 30; x++) {
        const u = (x - cx) / 30, hgt = 34 * Math.sqrt(Math.max(0, 1 - u * u)) + n1(x, 4, 171) * 3;
        if (base - y > hgt) continue;
        const k = (base - y) / Math.max(1, hgt);
        const streak = Math.sin((x + y * 0.6) * 1.3) > 0.6 ? -0.8 : 0;
        const v = 4.2 - u * 1.6 - (1 - k) * 0.6 + streak + (hash2(x, y, 172) - 0.5) * 0.7;
        if (base - y > hgt * 0.62) {
          // burnt crown: black with embers in the cracks
          const glow = hash2(x, y, 173 + (i % 2));
          b.set(x, y, glow > 0.86 ? FIRE[2 + (glow > 0.95 ? 1 : 0)] : ASH[1 + Math.floor(hash2(x >> 1, y, 174) * 2)]);
          continue;
        }
        b.set(x, y, rampDither(HAY, v, x, y));
      }
    }
    const solid = outline(b, HAY[0]);
    // the fire: tongues of flame along the burnt crown
    const tongues: [number, number, number][] = [[-20, 26, 6], [-9, 44, 8], [2, 58, 9], [13, 46, 8], [22, 30, 6], [-2, 34, 6]];
    tongues.forEach(([dx, h, w], k) => {
      const hh = h * (0.82 + 0.18 * Math.sin(ph * 2 + k * 1.7));
      const x = cx + dx + Math.sin(ph + k) * 1.5;
      const top = base - 34 * Math.sqrt(Math.max(0, 1 - (dx / 30) ** 2)) + 6;
      flame(solid, x, top, hh, w, ph + k * 1.3, FIRE, 1.05);
    });
    out.push(solid);
  }
  return out;
}

/** A plume of smoke from the fire, leaning east in the wind, puffing up and thinning as it climbs. */
function smokePlume(n = 8): Bitmap[] {
  const W = 150, HH = 190;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    for (let k = 13; k >= 0; k--) {
      const t = (k + i / n) / 14;
      const y = HH - 8 - t * (HH - 26), x = 14 + t * t * 100 + Math.sin(t * 6 + 0.5) * 5;
      const rad = 6 + t * 19;
      const dens = Math.min(1, 1.5 - t * 1.1);
      ellipseFill(b, x, y, rad, rad * 0.78, (px, py, d) => {
        const lumpy = d + (vnoise(px, py + t * 40, 4, 251) - 0.5) * 0.35;
        if (lumpy > 1) return 0;
        if (!dith(px, py, Math.min(1, dens * (lumpy < 0.7 ? 1 : (1 - lumpy) * 3.3)))) return 0;
        // the dawn lights the plume's left flank; its underside is darker
        const lit = 3.3 - ((px - x) / rad) * 1.4 - ((py - y) / rad) * 1 + (t < 0.15 ? -0.8 : 0);
        return rampDither(SMOKE, lit, px, py);
      });
    }
    out.push(b);
  }
  return out;
}

/** The broken fence along the field: leaning posts, rails split and hanging, a gap. */
function fence(): Bitmap {
  const W = 196, HH = 34;
  const b = new Bitmap(W, HH);
  const post = (x: number, lean: number, h: number) => {
    for (let y = 0; y < h; y++) {
      const px = Math.round(x + lean * (y / h));
      for (let k = 0; k < 3; k++) b.set(px + k, HH - 1 - y, rampDither(WOOD, 4.4 - k * 1.2 + (y === h - 1 ? 0.8 : 0), px + k, HH - 1 - y));
    }
  };
  const rail = (x0: number, y0: number, x1: number, y1: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let k = 0; k <= len; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / len), y = Math.round(y0 + ((y1 - y0) * k) / len);
      b.set(x, y, WOOD[4]);
      b.set(x, y + 1, WOOD[2]);
    }
  };
  post(4, 0, 26);
  post(42, 2, 25);
  post(82, -3, 24);
  post(122, 5, 18);
  post(166, 0, 26);
  rail(6, 13, 44, 12);
  rail(6, 21, 44, 21);
  rail(45, 12, 84, 13);
  // a rail split in two, one half hanging to the grass
  rail(45, 21, 64, 22);
  rail(64, 23, 80, 32);
  rail(126, 20, 168, 16);
  // a fallen rail lying in the grass
  rail(90, 31, 118, 32);
  return outline(b, WOOD[0]);
}

/**
 * The hay cart tipped over on the right: its back end down in the grass, its
 * nose up, the shafts pointing at the sky; one wheel still on the axle with a
 * spoke gone, the other off and leaning against the nose; hay spilled; the
 * Sanguine Dominion's standard snapped across the planks.
 */
function cart(): Bitmap {
  const W = 150, HH = 104;
  const b = new Bitmap(W, HH);
  const base = HH - 2;
  // the bed: plank sides, the back end on the ground at the left, the nose raised at the right
  const bl = [16, base - 4], br = [112, base - 38];
  const up = 20;
  const quad: [number, number][] = [[bl[0], bl[1]], [br[0], br[1]], [br[0] - 3, br[1] - up], [bl[0] - 4, bl[1] - up]];
  polyFill(b, quad, (x, y) => {
    const t = ((x - bl[0]) * (br[0] - bl[0]) + (y - bl[1]) * (br[1] - bl[1])) / ((br[0] - bl[0]) ** 2 + (br[1] - bl[1]) ** 2);
    const plank = Math.floor((y - (bl[1] + (br[1] - bl[1]) * t)) / -5) % 2;
    const v = 4 - t * 1.4 + (plank ? -0.6 : 0.2) + (hash2(x, y >> 1, 181) - 0.5) * 0.5;
    return rampDither(WOOD, v, x, y);
  });
  // the bed's open top: hay still heaped inside
  polyFill(b, [[bl[0] - 4, bl[1] - up], [br[0] - 3, br[1] - up], [br[0] + 4, br[1] - up - 6], [bl[0] + 4, bl[1] - up - 6]], (x, y) => rampDither(HAY, 2.6 + (hash2(x, y, 182) - 0.5) * 1.6, x, y));
  // the shafts: two poles from the nose to the sky
  for (const [ox, oy] of [[0, 0], [7, 3]] as const) {
    for (let k = 0; k < 46; k++) {
      const x = Math.round(br[0] - 2 + ox + k * 0.62), y = Math.round(br[1] - 14 + oy - k * 0.8);
      if (x >= W - 1 || y < 0) break;
      b.set(x, y, WOOD[4]);
      b.set(x + 1, y, WOOD[2]);
    }
  }
  const wheel = (cx: number, cy: number, rx: number, ry: number, gone: number[]) => {
    // the iron-shod rim, spokes from the hub, some of them broken
    ellipseFill(b, cx, cy, rx, ry, (x, y, d) => (d > 0.78 ? (d > 0.92 ? IRON[2] : rampDither(WOOD, 4.4 - ((x - cx) / rx) * 1.4 - (y - cy) / ry, x, y)) : 0));
    for (let k = 0; k < 10; k++) {
      if (gone.includes(k)) continue;
      const a = (k / 10) * Math.PI * 2;
      line(b, cx, cy, cx + Math.cos(a) * rx * 0.8, cy + Math.sin(a) * ry * 0.8, k % 2 ? WOOD[3] : WOOD[4]);
    }
    disc(b, cx, cy, 2.6, (x, y, d) => rampDither(IRON, 3.6 - d * 2, x, y));
  };
  // the wheel still on its axle, a spoke gone
  wheel(62, base - 24, 19, 20, [3]);
  // the wheel that came off, leaning against the raised nose, two spokes snapped
  wheel(122, base - 19, 13, 18, [1, 6]);
  // the Sanguine Dominion's standard, its pole snapped, the cloth draped over the side
  for (let k = 0; k < 64; k++) {
    const x = Math.round(26 + k * 1.1), y = Math.round(base - 34 - k * 0.33);
    b.set(x, y, WOOD[1]);
    b.set(x, y + 1, WOOD[3]);
  }
  polyFill(b, [[50, base - 44], [76, base - 52], [74, base - 22], [66, base - 16], [58, base - 24], [50, base - 20]], (x, y) => rampDither(SABLE, 4 - (x - 50) / 20 - (y - base + 52) / 40 + Math.sin((x + y) * 0.7) * 0.4, x, y));
  const hx = 63, hy = base - 34;
  const hexPts: [number, number][] = [];
  for (let k = 0; k < 6; k++) hexPts.push([hx + Math.cos((k * Math.PI) / 3) * 5, hy + Math.sin((k * Math.PI) / 3) * 5]);
  polyFill(b, hexPts, (x, y) => rampDither(BLOOD, 3.4 - (x - hx) / 6 - (y - hy) / 6, x, y));
  const solid = outline(b, WOOD[0]);
  // hay spilled from the back end, lying loose in the grass
  const r = rng(183);
  for (let k = 0; k < 140; k++) {
    const x = Math.round(2 + r() * 40 + r() * 20), y = Math.round(base - r() * 8);
    if (x >= W) continue;
    solid.set(x, y, HAY[2 + Math.floor(r() * 4)]);
  }
  return solid;
}

/** Pumpkins rolled out of the cart, and a burst sack of grain. */
function pumpkins(): Bitmap {
  const b = new Bitmap(84, 30);
  const pumpkin = (cx: number, cy: number, rx: number, ry: number) => {
    ellipseFill(b, cx, cy, rx, ry, (x, y) => {
      const rib = Math.abs(Math.sin(((x - cx) / rx) * 2.2)) < 0.2 ? -0.8 : 0;
      return rampDither(PUMPKIN, 4.2 - ((x - cx) / rx) * 1.4 - ((y - cy) / ry) * 1.2 + rib, x, y);
    });
    b.set(Math.round(cx), Math.round(cy - ry - 1), MOSS[2]);
    b.set(Math.round(cx) + 1, Math.round(cy - ry - 2), MOSS[1]);
  };
  pumpkin(14, 20, 8, 6);
  pumpkin(34, 23, 6, 4.6);
  pumpkin(60, 18, 9, 6.5);
  pumpkin(76, 25, 4.5, 3.4);
  // the sack, split, grain running out
  ellipseFill(b, 46, 12, 7, 5, (x, y) => rampDither(STUB, 4.4 - (x - 46) / 7 - (y - 12) / 5, x, y));
  for (let k = 0; k < 10; k++) b.set(51 + k, 15 + (k % 3), STUB[5 - (k % 2)]);
  return outline(b, PUMPKIN[0]);
}

/** The earth burnt black in front of the haystack, ash and a few embers still alive. */
function scorch(): Bitmap {
  const W = 96, HH = 22;
  const b = new Bitmap(W, HH);
  ellipseFill(b, W / 2, 4, W / 2 - 2, 17, (x, y, d) => {
    if (y < 3) return 0;
    const n = vnoise(x, y, 4, 191);
    const dd = d + (n - 0.5) * 0.5;
    if (dd > 0.95) return 0;
    if (dd > 0.6 && !dith(x, y, (0.95 - dd) / 0.35)) return 0;
    const ember = hash2(x, y, 192) > 0.982;
    return ember ? FIRE[2] : rampDither(ASH, 3.4 - dd * 2.6 + (n - 0.5), x, y);
  });
  return b;
}

/**
 * The trampled ground of the fight: the road coming in from the back, worn
 * into a patch in the middle, and the cart's ruts curving off toward the
 * wreck on the right.
 */
function worn(): Bitmap {
  const W = 470, HH = 170;
  const b = new Bitmap(W, HH);
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < W; x++) {
      // two ruts curving from the road toward the cart
      const rut = x > 150 && x < 440 && [0, 9].some((o) => Math.abs(y - (8 + o + Math.pow((x - 150) / 300, 1.6) * 40)) < 0.9);
      if (rut && dith(x, y, 0.85)) {
        b.set(x, y, EARTH[1]);
        continue;
      }
      const roadC = 207 - y * 0.42 + Math.sin(y * 0.05) * 3;
      const road = Math.abs(x + 0.5 - roadC) / (14 + y * 0.32);
      const patch = Math.hypot((x + 0.5 - 170) / 150, (y + 0.5 - 70) / 46);
      const d = Math.min(road, patch) + (hash2(x >> 3, y >> 3, 201) - 0.5) * 0.35;
      if (d > 1) continue;
      const fray = (1 - d) * 2.6 + (hash2(x >> 1, y >> 1, 203) - 0.5) * 0.9;
      if (fray < 0.5 || !dith(x, y, Math.min(1, fray - 0.3))) continue;
      const v = 3 + (hash2(x >> 2, y >> 2, 204) - 0.5) * 0.8 - (y / HH) * 0.2 + (hash2(x, y, 205) > 0.97 ? 1 : 0);
      b.set(x, y, rampDither(EARTH, v, x, y));
    }
  }
  // stones, a tuft, leaves trodden into the dirt
  const r = rng(206);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(20 + r() * 420), y = Math.floor(10 + r() * 150);
    if (b.get(x, y) === 0) continue;
    const k = r();
    if (k < 0.35) pebble(b, x, y, r);
    else if (k < 0.55) tuft(b, x, y, r);
    else leafSpeck(b, x, y, 1 + Math.floor(r() * 3));
  }
  return b;
}

/**
 * The low dawn light lying across the ground from the left: a warm wash,
 * densest near the field and the fire, thinning out across the arena.
 */
function dawnLight(): Bitmap {
  const W = 420, HH = 168;
  const b = new Bitmap(W, HH);
  const warm = hex('#c8864a');
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < W; x++) {
      const k = Math.max(0, 1 - Math.hypot(x / W, (y - 30) / (HH * 1.3))) * 0.42;
      if (k > 0.02 && dith(x, y, k)) b.set(x, y, withAlpha(warm, 40));
    }
  }
  return b;
}

/** Leaves heaped along the foot of the wall: lumpy drifts, lit on top. */
function leafDrift(seed: number, W = 120): Bitmap {
  const b = new Bitmap(W, 16);
  const r = rng(seed);
  for (let x = 0; x < W; x++) {
    const h = Math.round((n1(x, 7, seed) * 5 + n1(x, 3, seed + 1) * 2) * Math.pow(Math.sin((Math.PI * x) / W), 0.5));
    for (let i = 0; i < h; i++) {
      const lit = i >= h - 2 ? 1 : 0;
      b.set(x, 15 - i, LEAFF[clamp(1 + Math.floor(r() * 3) + lit, 0, LEAFF.length - 1)]);
    }
  }
  return b;
}

/** Arrows from the night's fight, stuck in the ground at odd angles. */
function arrows(): Bitmap {
  const b = new Bitmap(30, 22);
  for (const [x, lean, h] of [[6, 3, 16], [15, -2, 13], [24, 4, 17]] as const) {
    for (let k = 0; k < h; k++) b.set(Math.round(x + (lean * k) / h), 21 - k, WOOD[k === h - 1 ? 2 : 4]);
    const tx = Math.round(x + lean), ty = 21 - h;
    b.set(tx, ty, BONE);
    b.set(tx - 1, ty + 1, BONE);
    b.set(tx + 1, ty + 1, BLOOD[2]);
  }
  return outline(b, WOOD[0]);
}

/**
 * The Azure Crown's standard, torn: the pole leaning, the crossbar snapped
 * halfway so the cloth hangs from its broken end, the hem ragged and a hole
 * burnt through it. Frames: the cloth stirring in the wind.
 */
function tornStandard(n = 4): Bitmap[] {
  const out: Bitmap[] = [];
  const W = 66, HH = 200;
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    const ph = (i / n) * Math.PI * 2;
    const poleAt = (y: number) => 8 + ((HH - y) / HH) * 12;
    for (let y = 12; y < HH; y++) for (let k = -2; k <= 2; k++) b.set(Math.round(poleAt(y) + k), y, rampDither(WOOD, 4 - (k + 2) * 0.8, Math.round(poleAt(y) + k), y));
    disc(b, poleAt(8) + 0.5, 8, 4, (x, y, d) => rampDither(GOLD, 3.6 - d * 1.5 - (x - poleAt(8)) / 4, x, y));
    // the crossbar: whole on the pole's side, snapped halfway, the broken end hanging
    const bx0 = Math.round(poleAt(18)), by = 18;
    for (let x = bx0; x < bx0 + 20; x++) {
      b.set(x, by, WOOD[4]);
      b.set(x, by + 1, WOOD[2]);
    }
    line(b, bx0 + 20, by + 1, bx0 + 30, by + 12, WOOD[3]);
    // the cloth: hangs from the bar and slants down from the broken end, ripples, ragged hem
    const holeX = bx0 + 18, holeY = 112;
    for (let y = by + 2; y < 150; y++) {
      const t = (y - by) / 132;
      const sway = Math.sin(ph + t * 3.4) * t * 3.4;
      const left = bx0 + 3 + t * 2;
      const right = Math.min(bx0 + 20 + t * 22, bx0 + 38);
      for (let x = Math.floor(left); x <= right; x++) {
        const u = (x - left) / Math.max(1, right - left);
        const hem = 136 + Math.sin(u * 13 + 1) * 5 + (u > 0.55 ? -u * 26 : 0) + Math.sin(u * 37) * 2;
        if (y > hem) continue;
        if (Math.hypot(x - holeX, y - holeY) < 5 + Math.sin(x) * 1.5) continue;
        const X = Math.round(x + sway);
        const ripple = Math.sin(u * 7 + ph + t * 2) * 0.6;
        b.set(X, y, rampDither(AZURE, AZURE.length * 0.62 - u * 1.4 + ripple + (u < 0.06 ? 0.8 : 0) - t * 0.5, X, y));
      }
    }
    // the hole's scorched rim
    const holeSway = Math.round(Math.sin(ph + ((holeY - by) / 132) * 3.4) * ((holeY - by) / 132) * 3.4);
    for (let a = 0; a < Math.PI * 2; a += 0.25) {
      const x = Math.round(holeX + holeSway + Math.cos(a) * 6), y = Math.round(holeY + Math.sin(a) * 6);
      if (b.get(x, y) !== 0) b.set(x, y, ASH[1]);
    }
    const mx = Math.round(bx0 + 15 + Math.sin(ph + 0.42 * 3.4) * 0.42 * 3.4), my = 74;
    crownDevice(b, mx, my);
    out.push(outline(b, AZURE[0]));
  }
  return out;
}

/** A gold crown: a band with three points and jewels, lit from the top-left. */
function crownDevice(b: Bitmap, cx: number, cy: number) {
  const pts: [number, number][] = [[cx - 10, cy + 7], [cx - 10, cy - 5], [cx - 5, cy + 1], [cx, cy - 9], [cx + 5, cy + 1], [cx + 10, cy - 5], [cx + 10, cy + 7]];
  polyFill(b, pts, (x, y) => rampDither(GOLD, 3.4 - (x - cx) / 12 - (y - cy) / 12, x, y));
  for (let x = cx - 10; x <= cx + 10; x++) {
    b.set(x, cy + 7, GOLD[1]);
    b.set(x, cy + 3, GOLD[2]);
  }
  for (const [x, y] of [[cx - 10, cy - 6], [cx, cy - 10], [cx + 10, cy - 6]]) b.set(x, y, GOLD[4]);
  for (const [x, c] of [[cx - 5, BLOOD[3]], [cx, AZURE[5]], [cx + 5, BLOOD[3]]] as const) b.set(x, cy + 5, c);
}

/** Long dry grass at the bottom corners, nearest the camera, with a few leaves caught in it. */
function longGrass(seed: number): Bitmap {
  const b = new Bitmap(76, 42);
  const r = rng(seed);
  for (let k = 0; k < 44; k++) {
    const x = 4 + r() * 68, h = 12 + r() * 28, lean = (r() - 0.3) * 9;
    for (let i = 0; i < h; i++) {
      const t = i / h;
      const px = Math.round(x + lean * t * t);
      b.set(px, 41 - i, rampDither(STUB, 1 + t * 4 + (x < 38 ? 0.5 : 0), px, 41 - i));
    }
  }
  for (let k = 0; k < 7; k++) leafSpeck(b, Math.floor(6 + r() * 62), Math.floor(20 + r() * 18), 2 + Math.floor(r() * 3));
  return outline(b, STUB[0]);
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

/** the wall stands on the right only: cols 12-19, its breach at col 15 */
const WALL_FROM = 12, BREACH = 15;

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const set = (layer: number[], c: number, r: number, n: string) => (layer[r * MAP_COLS + c] = id(n));
  const r = rng(77);
  const plain = ['grass_a', 'grass_b', 'grass_c', 'grass_d', 'grass_e', 'grass_f', 'grass_a', 'grass_d', 'golden_a', 'golden_b'];
  for (let row = 6; row < MAP_ROWS; row++) {
    for (let c = 0; c < MAP_COLS; c++) {
      let n = plain[Math.floor(r() * plain.length)];
      if (row === 6 && c >= WALL_FROM && c !== BREACH) n = r() < 0.5 ? 'shade_a' : 'shade_b';
      else if (row === 7 && c >= 16) n = r() < 0.6 ? 'leafy_a' : 'leafy_b';
      else if (row === 7 && c >= WALL_FROM && r() < 0.4) n = 'leafy_b';
      set(ground, c, row, n);
    }
  }
  for (let c = WALL_FROM; c < MAP_COLS; c++) {
    if (c === BREACH) {
      set(wall, c, 4, 'breach_top');
      set(wall, c, 5, 'breach_face');
      continue;
    }
    const end = c === WALL_FROM;
    set(wall, c, 4, end ? 'wall_top_end' : c === 18 ? 'wall_top_b' : 'wall_top');
    set(wall, c, 5, end ? 'wall_face_end' : c === 16 || c === 19 ? 'wall_face_ivy' : 'wall_face');
  }
  const props: PropPlacement[] = [
    // far: the veils first (their roots lie under the rift's lips), the rift, the islands, the tree
    ...VEILS.map((v) => ({ kind: v.kind, x: veilBox(v).x, y: veilBox(v).y, layer: 'far' as const })),
    { kind: 'rift', x: RIFT_BOX.x, y: RIFT_BOX.y, layer: 'far' },
    { kind: 'isle_far', x: 30, y: 82, layer: 'far' },
    { kind: 'isle_big', x: 236, y: 124, layer: 'far' },
    { kind: 'debris', x: 322, y: 104, layer: 'far' },
    { kind: 'isle_mid', x: 392, y: 106, layer: 'far' },
    { kind: 'tree', x: 604, y: 196, layer: 'far' },
    // back: the smoke, the field's fence and the burning haystack on the left; the cart on the right
    { kind: 'smoke', x: 52, y: 178, layer: 'back' },
    { kind: 'fence', x: 0, y: 202, layer: 'back' },
    { kind: 'haystack', x: 64, y: 208, layer: 'back' },
    { kind: 'cart', x: 640, y: 218, layer: 'back' },
    // floor: the trampled road, the burnt ground, the spilled load, leaves, arrows
    { kind: 'dawn', x: 0, y: 192, layer: 'floor' },
    { kind: 'worn', x: 380, y: 192, layer: 'floor' },
    { kind: 'scorch', x: 64, y: 205, layer: 'floor' },
    { kind: 'pumpkins', x: 522, y: 236, layer: 'floor' },
    { kind: 'leaves', x: 432, y: 206, layer: 'floor' },
    { kind: 'arrows', x: 326, y: 222, layer: 'floor' },
    { kind: 'arrows', x: 284, y: 336, layer: 'floor' },
    // fg: the torn standard at the left edge, dry grass in both corners
    { kind: 'azure', x: -8, y: 364, layer: 'fg' },
    { kind: 'grass_fg', x: 46, y: 362, layer: 'fg' },
    { kind: 'grass_fg2', x: 604, y: 362, layer: 'fg' },
  ];
  return { ground, wall, props };
}

/** The rift's sparks: born along both lips, drifting off and twinkling out. */
function sparks(): SparkEmitter[] {
  const colors = [RIM[2], RIM[1], RIM[0], NEB[4], NEB[3], NEB[2]].map(toHex);
  return riftLips().map((path) => ({ path, colors, every: 70, speed: 9 }));
}

export const zone1: ZoneArt = {
  id: 'zone1',
  name: 'A Dim Island',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    ...Object.fromEntries(VEILS.map((v) => [v.kind, veil(v)])),
    rift: [rift(false), rift(true)],
    isle_big: [island(118, 64, { seed: 221, fall: true, trees: 3 })],
    isle_mid: [island(64, 36, { seed: 222, cool: true, trees: 2 })],
    isle_far: [island(38, 20, { seed: 223, trees: 1, haze: 1.2 })],
    debris: [debris()],
    tree: autumnTree(),
    smoke: smokePlume(),
    fence: [fence()],
    haystack: haystack(),
    cart: [cart()],
    dawn: [dawnLight()],
    worn: [worn()],
    scorch: [scorch()],
    pumpkins: [pumpkins()],
    leaves: [leafDrift(231)],
    arrows: [arrows()],
    azure: tornStandard(),
    grass_fg: [longGrass(3)],
    grass_fg2: [longGrass(8)],
  }),
  kinds: {
    ...Object.fromEntries(VEILS.map((v) => [v.kind, { anchor: [0, 0] as [number, number], mode: 'loop' as const, ms: v.ms }])),
    rift: { anchor: [0, 0], mode: 'pulse' },
    isle_big: { anchor: [0.5, 1], mode: 'static', bob: { amp: 1, ms: 5200 } },
    isle_mid: { anchor: [0.5, 1], mode: 'static', bob: { amp: 1, ms: 4300 } },
    isle_far: { anchor: [0.5, 1], mode: 'static', bob: { amp: 1, ms: 6100 } },
    debris: { anchor: [0.5, 1], mode: 'static', bob: { amp: 1, ms: 3700 } },
    tree: { anchor: [0.5, 1], mode: 'loop', ms: 420 },
    smoke: { anchor: [0, 1], mode: 'loop', ms: 200 },
    fence: { anchor: [0, 1], mode: 'static' },
    haystack: { anchor: [0.5, 1], mode: 'loop', ms: 85, fire: { dy: -58, flame: false } },
    cart: { anchor: [1, 1], mode: 'static' },
    dawn: { anchor: [0, 0], mode: 'static' },
    worn: { anchor: [0.5, 0], mode: 'static' },
    scorch: { anchor: [0.5, 0], mode: 'static' },
    pumpkins: { anchor: [0.5, 1], mode: 'static' },
    leaves: { anchor: [0.5, 1], mode: 'static' },
    arrows: { anchor: [0.5, 1], mode: 'static' },
    azure: { anchor: [0, 1], mode: 'loop', ms: 210 },
    grass_fg: { anchor: [0.5, 1], mode: 'static' },
    grass_fg2: { anchor: [0.5, 1], mode: 'static' },
  },
  layout,
  horizon: HZ,
  sparks: sparks(),
};
