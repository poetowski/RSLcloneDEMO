// Zone "Dead Forest": Zone 7, named and described by Jakub (2026-11-01,
// docs/DESIGN_DECISIONS.md 5.10): "The forest stretches across an uneven landscape of
// blackened earth, grey ash and charred tree trunks. Almost every tree has lost its
// leaves, branches and bark. What remains are dark, twisted silhouettes reaching
// towards the sky like enormous skeletal hands. Some trees remain standing, burned
// from their roots to their highest branches. Others have collapsed, lying across
// the ground in tangled piles of black timber. The ground is covered in thick layers
// of grey and black ash, burnt roots protruding from cracked soil, fallen branches
// reduced to charcoal, scattered stones darkened by intense heat, occasional patches
// of pale, dead grass, deep holes where enormous trees once stood. Atmosphere is
// weirdly peaceful."
//
// As painted: a still, pale morning long after the fire, like an ink painting: a white
// sun behind a high veil, ridge behind ridge of burnt forest fading into the mist. Every
// tree grows as a hand, a trunk for its wrist and fingers that knuckle in toward the
// sky; an enormous one on the right, a snapped one on the left, more on the slope behind.
// Their long soft shadows lie across an arena of ash, scoured down to cracked black soil
// in places, with a tangle of timber on its far edge and, in its middle, the great hole
// where the biggest tree of all once stood.
//
// The peace (my reading of "weirdly peaceful"): nothing burns any more, no ember, no
// smoke, no wind, no birds. Ash comes down through still air, slower than snow, each
// flake turning over as it falls; mist lies in the hollows and creeps; pale light
// breathes between the trunks; a stag the colour of ash grazes on the slope, unafraid;
// pale moths wander about; the dead grass stirs a little; a thread of ash runs off the
// lip of the hole; mist breathes in it. Everything his description did not name is a
// first take (DESIGN_DECISIONS 5.10).
import { dith, ellipseFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, hex, mix, RGBA, rng, withAlpha } from '../raster.ts';
import { MAP_COLS, MAP_ROWS, Painter, PropPlacement, SPAWNS, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));

const SKY = H(['#8d99a8', '#97a2ae', '#a2abb4', '#adb4ba', '#b8bdbf', '#c3c5c4', '#cdccc8', '#d6d3cc', '#ded9d0', '#e5ded3', '#eae2d6', '#eee6da']);
const HALO = H(['#f1ebdf', '#f5f0e6', '#f9f5ee', '#fdfbf6']);
/** the ground: black earth at one end, pale ash at the other, one run so that the ash lies over the soil without a seam */
const GROUND = H(['#131213', '#1c1a1b', '#262424', '#312f2f', '#3d3b3a', '#4a4846', '#575553', '#65635f', '#73716c', '#817f79', '#8f8d86', '#9d9b94', '#aba9a1']);
/** charred wood: lamp black, up to the ash-pale edge that faces the sun */
const CHAR = H(['#08080a', '#111114', '#1a1a1d', '#252527', '#323233', '#424242', '#555452', '#6c6a66', '#8a8680', '#b0aa9e']);
const ASHY = H(['#8e8c86', '#aba9a1', '#c8c5bb']);
const STONE = H(['#141416', '#1f1f22', '#2c2c30', '#3b3b40', '#4d4d52', '#636368']);
const STRAW = H(['#6e6a52', '#8e8868', '#aca684', '#c8c2a0', '#ded8ba']);
const PELT = H(['#46443f', '#5e5c56', '#78756e', '#94918a', '#b0ada4', '#cac7bc']);
const MISTS = H(['#c9c9c6', '#d6d5d0', '#e2e0d9']);
const MIST = hex('#e6e4dc');
/** the ridges, far to near */
const RIDGE_A = H(['#a6abb0', '#aeb2b6', '#b6b9bb', '#c0c2c2', '#cbcbc8', '#d6d5d0', '#e2e0d9']);
const RIDGE_B = H(['#888d93', '#92979c', '#9ca0a4', '#a9acae', '#b6b8b8', '#c3c4c2', '#d0d0cc', '#dcdbd5']);
const RIDGE_C = H(['#5c5f64', '#686b70', '#74777b', '#83868a', '#929498', '#a1a3a5', '#b0b2b2', '#bfc0bf', '#cdcdca', '#dad9d3']);
const WOOD_C = H(['#34363b', '#3f4146', '#4b4d52', '#585a5e', '#6a6b6e']);
const WOOD_D = CHAR.map((c) => mix(c, hex('#a8aaa8'), 0.1));

const SUN_X = 118, SUN_Y = 38;
/** where the far ridge meets the sky */
const HZ = 116;

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
// The trees: a trunk for a wrist, fingers that knuckle in toward the sky
// ---------------------------------------------------------------------------

/** A disc of wood: a tree is a list of them, so that its limbs melt into each other as round forms. */
type Stamp = [number, number, number];
interface Reach { x: number; y: number; a: number }

/** Grows a limb from a point along its angle, tapering, turning by `bend` in all and wandering a little. */
function limb(out: Stamp[], from: Reach, len: number, r0: number, r1: number, bend: number, seed: number, wander = 0.09): Reach {
  let { x, y, a } = from;
  const n = Math.max(2, Math.ceil(len));
  for (let i = 0; i <= n; i++) {
    out.push([x, y, r0 + (r1 - r0) * (i / n)]);
    a += bend / n + (n1(i * 3, 11, seed) - 0.5) * wander;
    x += Math.cos(a);
    y += Math.sin(a);
  }
  return { x, y, a };
}

const UP = -Math.PI / 2;

/** A short limb burnt off where it ends. */
function stub(out: Stamp[], at: Stamp, a: number, len: number, seed: number) {
  limb(out, { x: at[0], y: at[1], a }, len, Math.max(0.8, at[2] * 0.42), 0.7, 0, seed, 0.14);
}

/** Roots flaring out of a trunk's foot before they dive under the ash. */
function flare(out: Stamp[], x: number, y: number, r: number, seed: number) {
  [0.08, 0.5, 1.4, Math.PI - 0.5, Math.PI - 0.08].forEach((a, i) => {
    limb(out, { x: x + (i - 2) * r * 0.42, y: y - r * 0.7, a }, r * (1.7 + hash2(i, 1, seed) * 1.3), r * 0.62, r * 0.2, 0.2, seed + i);
  });
}

interface TreeSpec { x: number; y: number; h: number; r: number; lean?: number; seed: number; fingers?: number; spread?: number; thumb?: number }

/** A burnt tree grown as a hand: the trunk, the thumb low on one side, the fingers fanning from a palm and curling in by the knuckle, stubs where its branches burnt off. */
function handTree(o: TreeSpec): Stamp[] {
  const out: Stamp[] = [];
  const r = rng(o.seed);
  if (o.r > 2.4) flare(out, o.x, o.y, o.r, o.seed);
  const wrist = limb(out, { x: o.x, y: o.y, a: UP + (o.lean ?? 0) }, o.h * 0.5, o.r, o.r * 0.58, (r() - 0.5) * 0.3, o.seed + 1);
  const trunk = out.slice(-Math.ceil(o.h * 0.5));
  const palm = o.r * 0.58;
  out.push([wrist.x, wrist.y, palm * 1.2]);
  for (let i = 0; i < Math.round(o.h / 26); i++) {
    const at = trunk[Math.floor(trunk.length * (0.16 + r() * 0.76))];
    if (at) stub(out, at, UP + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.7), o.r * (0.8 + r() * 1.4) + 2, o.seed + 20 + i);
  }
  const F = o.fingers ?? 4, spread = o.spread ?? 1.9;
  for (let i = 0; i < F; i++) {
    const k = F > 1 ? i / (F - 1) - 0.5 : 0;
    let at: Reach = { x: wrist.x + k * palm * 1.4, y: wrist.y, a: wrist.a + k * spread + (r() - 0.5) * 0.14 };
    const len = o.h * 0.44 * (1 - Math.abs(k) * 0.42) * (0.86 + r() * 0.26);
    let rr = palm * (0.74 - Math.abs(k) * 0.16);
    [0.46, 0.33, 0.21].forEach((part, j) => {
      const next = rr * 0.64;
      at = limb(out, at, len * part, rr, next, -k * 0.42 + (r() - 0.5) * 0.26, o.seed + 40 + i * 7 + j);
      // the knuckle, and the turn inward after it
      out.push([at.x, at.y, Math.max(0.8, next * 1.22)]);
      at = { ...at, a: at.a - k * 0.5 + (r() - 0.5) * 0.3 };
      if (rr > 1.2 && r() < 0.5) stub(out, [at.x, at.y, rr], at.a + (r() < 0.5 ? -1 : 1) * (0.8 + r() * 0.5), 3 + r() * o.h * 0.05, o.seed + 60 + i * 3 + j);
      rr = next;
    });
  }
  // the thumb, low and sideways
  const side = o.thumb ?? (r() < 0.5 ? -1 : 1);
  const low = trunk[Math.floor(trunk.length * 0.8)];
  if (low && o.h > 30) {
    let at: Reach = { x: low[0], y: low[1], a: UP + side * 1.05 };
    let rr = low[2] * 0.56;
    for (const part of [0.13, 0.11]) {
      const next = rr * 0.62;
      at = limb(out, at, o.h * part, rr, next, -side * 0.34, o.seed + 80, 0.1);
      out.push([at.x, at.y, Math.max(0.8, next * 1.2)]);
      at = { ...at, a: at.a - side * 0.45 };
      rr = next;
    }
  }
  return out;
}

/** A tree snapped by the fire: a tall trunk ending in shards, one arm still raised with its elbow out, a second burnt away to a stub. */
function snappedTree(o: TreeSpec): Stamp[] {
  const out: Stamp[] = [];
  const r = rng(o.seed);
  if (o.r > 2.4) flare(out, o.x, o.y, o.r, o.seed);
  const top = limb(out, { x: o.x, y: o.y, a: UP + (o.lean ?? 0) }, o.h * 0.8, o.r, o.r * 0.6, (r() - 0.5) * 0.24, o.seed + 1);
  const trunk = out.slice(-Math.ceil(o.h * 0.8));
  for (let i = 0; i < 3; i++) limb(out, { x: top.x + (i - 1) * o.r * 0.34, y: top.y + 1, a: UP + (i - 1) * 0.3 + (r() - 0.5) * 0.2 }, o.r * (1.1 + r() * 2.1), o.r * 0.26, 0.6, 0, o.seed + 10 + i, 0.05);
  const side = o.thumb ?? 1;
  const elbow = trunk[Math.floor(trunk.length * 0.62)];
  let at = limb(out, { x: elbow[0], y: elbow[1], a: UP + side * 1.25 }, o.h * 0.2, o.r * 0.42, o.r * 0.28, side * -0.2, o.seed + 20);
  out.push([at.x, at.y, o.r * 0.32]);
  at = limb(out, { ...at, a: UP + side * 0.18 }, o.h * 0.22, o.r * 0.28, 1.1, side * -0.3, o.seed + 21);
  const low = trunk[Math.floor(trunk.length * 0.38)];
  stub(out, low, UP - side * 1.35, o.r * 2.2, o.seed + 30);
  stub(out, trunk[Math.floor(trunk.length * 0.76)], UP - side * 0.8, o.r * 1.4, o.seed + 31);
  return out;
}

/** Paints a list of stamps: per pixel only the disc that stands nearest, so limbs read as round forms; `shader` takes the surface's facing. */
function shadeStamps(b: Bitmap, stamps: Stamp[], shader: (x: number, y: number, nx: number, ny: number, r: number) => RGBA) {
  const x0 = Math.floor(Math.min(...stamps.map((s) => s[0] - s[2]))) - 1, y0 = Math.floor(Math.min(...stamps.map((s) => s[1] - s[2]))) - 1;
  const w = Math.ceil(Math.max(...stamps.map((s) => s[0] + s[2]))) + 2 - x0, h = Math.ceil(Math.max(...stamps.map((s) => s[1] + s[2]))) + 2 - y0;
  const z = new Float32Array(w * h).fill(-1), nxs = new Float32Array(w * h), nys = new Float32Array(w * h), rs = new Float32Array(w * h);
  for (const [sx, sy, r0] of stamps) {
    const sr = Math.max(0.72, r0);
    for (let y = Math.floor(sy - sr); y <= sy + sr; y++) {
      for (let x = Math.floor(sx - sr); x <= sx + sr; x++) {
        const dx = x + 0.5 - sx, dy = y + 0.5 - sy;
        const d2 = (dx * dx + dy * dy) / (sr * sr);
        if (d2 > 1) continue;
        const i = (y - y0) * w + (x - x0);
        const zz = Math.sqrt(1 - d2) * sr;
        if (zz <= z[i]) continue;
        z[i] = zz;
        nxs[i] = dx / sr;
        nys[i] = dy / sr;
        rs[i] = sr;
      }
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (z[y * w + x] >= 0) b.set(x + x0, y + y0, shader(x + x0, y + y0, nxs[y * w + x], nys[y * w + x], rs[y * w + x]));
}

/** Charred wood: lit from the upper left, thick parts broken into the alligator blocks of charcoal, pale ash settled on whatever faces up. */
function charShader(seed: number, ramp = CHAR, dim = 0) {
  return (x: number, y: number, nx: number, ny: number, r: number): RGBA => {
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const lit = -nx * 0.74 - ny * 0.44 + nz * 0.2;
    let v = 2.4 + lit * 2.7 - dim;
    if (r > 2.6) {
      // long fissures wandering up the wood; a break across them only here and there
      const fx = x + (n1(y, 17, seed) - 0.5) * 5 + (n1(y, 5, seed + 4) - 0.5) * 1.6;
      const col = Math.floor(fx / 5);
      const across = fx - col * 5;
      const row = Math.floor((y + hash2(col, 0, seed) * 40) / (7 + hash2(col, 1, seed) * 9));
      v += (hash2(col, row, seed) - 0.5) * 0.9;
      if (across < 1) v -= 1.2;
      else if (across < 2 && lit > -0.1) v += 0.5;
      if (hash2(col, row, seed + 5) > 0.55 && (y + Math.floor(hash2(col, 0, seed) * 40)) % Math.floor(7 + hash2(col, 1, seed) * 9) === 0) v -= 1;
    }
    if (ny < -0.5 && hash2(x, y, seed + 1) < (-ny - 0.5) * 1.5) return ASHY[hash2(x, y, seed + 2) > 0.7 ? 2 : 1];
    return rampDither(ramp, clamp(v + (hash2(x, y, seed + 3) - 0.5) * 0.3, 0, ramp.length - 1), x, y);
  };
}

/** A far tree: hardly more than a silhouette, its sun side a shade lighter. */
const farShader = (ramp: RGBA[]) => (x: number, y: number, nx: number) => rampDither(ramp, clamp(1.4 - nx * 1.6, 0, ramp.length - 1), x, y);

/** A hollow burnt into a trunk: black, its lower right lip catching the light. */
function hollow(b: Bitmap, cx: number, cy: number, rx: number, ry: number) {
  ellipseFill(b, cx, cy, rx, ry, (x, y, d) => {
    const edge = d > 0.78;
    return edge && x > cx && y > cy ? CHAR[5] : edge ? CHAR[1] : CHAR[0];
  });
}

/** Ash heaped against something's foot: lit on the sun's side, thinning out into the ground. */
function ashFoot(b: Bitmap, cx: number, by: number, rx: number, ry: number, seed: number) {
  ellipseFill(b, cx, by, rx, ry, (x, y, d) => {
    if (!dith(x, y, (1 - d) * 3.2)) return b.get(x, y);
    return rampDither(GROUND, clamp(8.2 - ((x - cx) / rx) * 1.6 - ((y - by) / ry) * 0.6 + (hash2(x, y, seed) - 0.5) * 0.6, 0, GROUND.length - 1), x, y);
  });
}

/** A fallen trunk: a sagging length of charcoal, limbs burnt to stubs along its top. */
function logStamps(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, seed: number): Stamp[] {
  const out: Stamp[] = [];
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([x0 + (x1 - x0) * t + (n1(i, 19, seed) - 0.5) * 3, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 2 + (n1(i, 13, seed + 1) - 0.5) * 2, r0 + (r1 - r0) * t]);
  }
  const r = rng(seed);
  for (let i = 0; i < n / 30; i++) {
    const at = out[Math.floor(n * (0.12 + r() * 0.8))];
    stub(out, at, UP + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.8), at[2] * (0.6 + r() * 1) + 2, seed + 5 + i);
  }
  return out;
}

/** One thin limb, burnt off where it ends. */
function limbStamps(x: number, y: number, a: number, len: number, seed: number): Stamp[] {
  const out: Stamp[] = [];
  limb(out, { x, y, a }, len, 2, 0.8, (hash2(0, 1, seed) - 0.5) * 1.2, seed, 0.12);
  return out;
}

/** The broken end of a trunk: burnt rings. */
function logEnd(b: Bitmap, cx: number, cy: number, r: number) {
  ellipseFill(b, cx, cy, r * 0.62, r, (x, y, d) => (d > 0.84 ? CHAR[1] : rampDither(CHAR, 3.4 + Math.sin(d * 9) * 0.9 - (x - cx) * 0.1 - (y - cy) * 0.1, x, y)));
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------

const VY = 104, PK = 0.0058;
const pscale = (y: number) => Math.max(0.05, (y - VY) * PK);
const world = (x: number, y: number): [number, number] => [(x - 320) / pscale(y), Math.log(Math.max(0.5, y - VY)) / PK];
const FLOOR = { w: 640, h: 168 };
/** keep the floor quiet where the champions stand */
const busy = (x: number, y: number) => [...SPAWNS.player, ...SPAWNS.enemy].some(([fx, fy]) => Math.hypot((x - fx) / 38, (y - fy) / 18) < 1);
/** how quiet: 1 under a champion's feet, 0 well away from them */
const quiet = (x: number, y: number) => Math.max(...[...SPAWNS.player, ...SPAWNS.enemy].map(([fx, fy]) => 1 - smooth(0.8, 1.7, Math.hypot((x - fx) / 44, (y - fy) / 22))));

/** The feet of the near slope behind the arena: higher toward the edges, so the arena lies in a shallow bowl. */
const slopeTop = (x: number) => 172 - 22 * Math.pow(Math.abs(x - 320) / 320, 2) + (n1(x, 53, 141) - 0.5) * 12 + (n1(x, 17, 142) - 0.5) * 3;

/** The long soft shadows of the trees, thrown down and to the right across the ash: [root x, root y, half width]. */
const SHADOWS: [number, number, number][] = [[46, 222, 15], [108, 182, 7], [186, 184, 6], [282, 182, 5], [394, 186, 8], [470, 182, 6], [536, 188, 7]];
function treeShadow(x: number, y: number): number {
  let s = 0;
  SHADOWS.forEach(([x0, y0, w], i) => {
    if (y < y0) return;
    const t = y - y0;
    const d = Math.abs(x - (x0 + t * 1.32 + (n1(y, 27, 150 + i) - 0.5) * 7)) / (w + t * 0.05);
    if (d < 1) s = Math.max(s, (1 - d * d) * (1 - t / 230));
  });
  return s;
}

/** How far the ash has been scoured off the black soil here. */
function sootK(u: number, v: number, q: number): number {
  return smooth(0.5, 0.66, vnoise(u, v * 2.4, 120, 705) + (vnoise(u, v * 2.4, 40, 706) - 0.5) * 0.18) * (1 - q * 0.9);
}

/** The cracks in the black soil: how near a point is to a plate's edge. */
function plateEdge(u: number, v: number): number {
  const p = u / 22, q = (v * 2.4) / 22;
  const px = Math.floor(p), py = Math.floor(q);
  let f1 = 9, f2 = 9;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = px + i + hash2(px + i, py + j, 711), cy = py + j + hash2(px + i, py + j, 712);
      const d = Math.hypot(p - cx, q - cy);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  }
  return f2 - f1;
}

const swell = (u: number, v: number) => vnoise(u, v * 2.4, 210, 701) * 0.62 + vnoise(u, v * 2.4, 74, 702) * 0.28 + vnoise(u, v * 2.4, 26, 703) * 0.1;

/** Ash in soft mounds lit from the upper left, grey and black mottled in it, scoured down to cracked soil in patches, the trees' shadows lying across it. */
function groundColor(x: number, y: number): RGBA {
  const [u, v] = world(x, y);
  const [ua, va] = world(x - 2, y - 1), [ub, vb] = world(x + 2, y + 1);
  const q = quiet(x, y);
  const near = clamp((y - 170) / 190, 0, 1);
  let val = 6.9 + (swell(ua, va) - swell(ub, vb)) * 26 * (1 - q * 0.5) + (swell(u, v) - 0.5) * 3 * (1 - q * 0.6) + (1 - near) * 1.2;
  const soot = sootK(u, v, q);
  val -= soot * 3.5;
  if (soot > 0.35) {
    const e = plateEdge(u, v);
    if (e < 0.06) val -= 2.6 * soot;
    else if (e < 0.14) val += 0.8 * soot;
  }
  val += (vnoise(x, y * 2, 6, 707) - 0.5) * 1.1 * (1 - q * 0.5) + (hash2(x, y, 708) - 0.5) * 0.45;
  if (hash2(x, y, 709) > 0.988 && q < 0.5) val -= 2.2;
  val -= treeShadow(x, y) * 1.25;
  return rampDither(GROUND, clamp(val, 0, GROUND.length - 1), x, y);
}

function ashTile(seed0: number): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) b.set(x, y, rampDither(GROUND, 6.6 + (hash2(x, y, seed + seed0) - 0.5) * 1.1, x, y));
    }
  };
}
const P: Record<string, Painter> = { ash_a: ashTile(1), ash_b: ashTile(2), ash_c: ashTile(3) };

// ---------------------------------------------------------------------------
// Backdrop
// ---------------------------------------------------------------------------

const SKYSUN = [...SKY, ...HALO];

/** Solid mist in dithered layers lying along a band: three colours only, so the haze keeps the colour budget. */
function mistBand(b: Bitmap, y0: number, y1: number, seed: number, k: number) {
  for (let y = y0; y < y1; y++) {
    const env = Math.sin(((y - y0) / (y1 - y0)) * Math.PI);
    for (let x = 0; x < 640; x++) {
      const a = env * k * (0.42 + vnoise(x, y * 2.6, 52, seed) * 0.8 + (vnoise(x, y * 2.6, 17, seed + 1) - 0.5) * 0.3);
      if (a > 0.03 && dith(x, y, a)) b.set(x, y, MISTS[a > 0.62 ? 2 : a > 0.34 ? 1 : 0]);
    }
  }
}

/** A far ridge: solid land, a shade paler where it faces the sun, fading down into the mist in its valley through tones of its own. */
function ridge(b: Bitmap, top: (x: number) => number, ramp: RGBA[], to: number, fade: number) {
  for (let x = 0; x < 640; x++) {
    const t = top(x), lit = clamp(1 - (top(x + 7) - top(x - 7)) * 0.12, 0, 2);
    for (let y = Math.ceil(t); y < to; y++) {
      const v = lit + Math.pow(clamp((y - t) / fade, 0, 1), 1.3) * (ramp.length - 3) + (vnoise(x, y * 2.6, 34, 145) - 0.5) * 1.2;
      b.set(x, y, rampDither(ramp, clamp(v, 0, ramp.length - 1), x, y));
    }
  }
}

/** The farthest trees: a thin wood along a ridge, thicker here, gone there, hairs some of them forked at the top. */
function hairs(b: Bitmap, top: (x: number) => number, step: number, h0: number, h1: number, c: RGBA, seed: number) {
  for (let x = 2; x < 640; x += 1 + Math.floor(hash2(x, 0, seed) * step * 2)) {
    const thick = vnoise(x, 0, 44, seed + 1);
    if (hash2(x, 5, seed) > thick * 1.5) continue;
    const h = (h0 + hash2(x, 1, seed) * (h1 - h0)) * (0.5 + thick * 0.8), base = top(x) + 1;
    const lean = (hash2(x, 2, seed) - 0.5) * 0.22;
    for (let k = 0; k < h; k++) b.set(Math.round(x + lean * k), Math.round(base - k), c);
    const tipX = x + lean * h, tipY = base - h * (0.55 + hash2(x, 6, seed) * 0.25);
    const f = 2 + Math.round(h * 0.2 * hash2(x, 7, seed));
    if (hash2(x, 3, seed) < 0.7) for (let k = 1; k <= f; k++) b.set(Math.round(tipX + k * 0.8), Math.round(tipY - k), c);
    if (hash2(x, 4, seed) < 0.7) for (let k = 1; k <= f; k++) b.set(Math.round(tipX - k * 0.8), Math.round(tipY - k * 0.9), c);
  }
}

function backdrop(): Bitmap {
  const b = new Bitmap(640, 200);
  // a still, pale morning, the sun white behind its veil: you could look straight at it
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 640; x++) {
      const t = clamp(y / (HZ - 6), 0, 1);
      const glow = Math.max(0, 1 - Math.hypot(x - SUN_X, (y - SUN_Y) * 1.1) / 190);
      b.set(x, y, rampDither(SKYSUN, Math.min(SKYSUN.length - 1, Math.pow(t, 0.8) * (SKY.length - 1) * (1 - glow * 0.25) + Math.pow(glow, 1.5) * 12), x, y));
    }
  }
  ellipseFill(b, SUN_X, SUN_Y, 11, 11, (x, y, d) => rampDither(HALO, 3.4 - d * 0.9, x, y));
  // the veil: long, level, hardly there, one passing in front of the sun
  for (const [cx, cy, rx, seed] of [[150, 44, 170, 21], [430, 24, 180, 22], [300, 66, 150, 23], [590, 54, 120, 24], [40, 18, 90, 25]] as const) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(640, cx + rx); x++) {
      const k = (x - cx) / rx;
      const th = (1 - k * k) * (2 + 6 * n1(x, 43, seed));
      for (let y = Math.floor(cy - th); y <= cy + th; y++) {
        const a = (1 - Math.abs(y + 0.5 - cy) / (th + 0.5)) * (0.25 + n1(x, 67, seed + 1) * 0.6);
        const t = clamp(y / (HZ - 6), 0, 1);
        if (dith(x, y, a)) b.set(x, y, rampDither(SKY, Math.min(SKY.length - 1, Math.pow(t, 0.8) * (SKY.length - 1) + 1.5), x, y));
      }
    }
  }
  // the far ridges, each fainter than the last, mist in the valleys between
  const topA = (x: number) => 112 + (n1(x, 120, 101) - 0.5) * 22 + (n1(x, 37, 102) - 0.5) * 5;
  hairs(b, topA, 2, 5, 13, hex('#a2a7ac'), 111);
  ridge(b, topA, RIDGE_A, 150, 24);
  mistBand(b, 118, 140, 121, 0.4);
  const topB = (x: number) => 130 + (n1(x, 96, 103) - 0.5) * 24 + (n1(x, 29, 104) - 0.5) * 6;
  hairs(b, topB, 3, 11, 27, hex('#7c8187'), 112);
  ridge(b, topB, RIDGE_B, 170, 26);
  mistBand(b, 136, 158, 122, 0.36);
  const topC = (x: number) => 150 + (n1(x, 78, 105) - 0.5) * 22 + (n1(x, 23, 106) - 0.5) * 5;
  // the third ridge's trees are small hands already
  const r = rng(131);
  for (let x = 6; x < 640; x += 18 + r() * 26) {
    const h = 34 + r() * 30;
    shadeStamps(b, handTree({ x, y: topC(x) + 3, h, r: 1.4 + h * 0.016, lean: (r() - 0.5) * 0.2, seed: 2000 + Math.floor(x), spread: 1.7 + r() * 0.5 }), farShader(WOOD_C));
  }
  ridge(b, topC, RIDGE_C, 190, 26);
  mistBand(b, 160, 182, 123, 0.34);
  // the near slope, one with the arena's ground
  for (let x = 0; x < 640; x++) {
    const top = slopeTop(x);
    for (let y = Math.ceil(top); y < 200; y++) b.set(x, y, y - top < 1 ? GROUND[11] : groundColor(x, y));
  }
  // a shallow hole far up the slope, the same as the great one in the arena
  ellipseFill(b, 424, slopeTop(424) + 10, 16, 3, (x, y, d) => (d > 0.74 ? (y < slopeTop(424) + 10 ? GROUND[1] : GROUND[9]) : CHAR[0]));
  // the slope's trees, back to front; a fallen one lies among them, another leans into a fork
  const fallen: [number, number, number, number, number, number, number][] = [[140, 176, 216, 182, 3.4, 2.4, 301], [336, 180, 382, 176, 3, 2.2, 302], [440, 176, 526, 184, 3.6, 2.6, 303]];
  for (const [x0, y0, x1, y1, r0, r1, seed] of fallen) shadeStamps(b, logStamps(x0, y0, x1, y1, r0, r1, seed), charShader(seed, WOOD_D));
  const near: TreeSpec[] = [
    { x: 186, y: 172, h: 100, r: 3.8, lean: 0.05, seed: 401, spread: 1.7 },
    { x: 470, y: 170, h: 112, r: 4, lean: -0.05, seed: 403, spread: 2 },
    { x: 282, y: 174, h: 74, r: 3, lean: 0.08, seed: 404, spread: 2.1, fingers: 3 },
    { x: 108, y: 168, h: 118, r: 4.4, lean: -0.03, seed: 405, spread: 1.9 },
    { x: 536, y: 168, h: 90, r: 3.6, lean: 0.07, seed: 407, spread: 1.6, fingers: 3 },
  ];
  for (const t of near) {
    shadeStamps(b, handTree(t), charShader(t.seed, WOOD_D));
    ashFoot(b, t.x, t.y + 3, t.r * 3.6, 3, t.seed);
  }
  // snapped ones
  for (const t of [{ x: 248, y: 172, h: 46, r: 3.2, seed: 411, thumb: -1 }, { x: 352, y: 172, h: 38, r: 2.8, seed: 412, thumb: 1 }]) {
    shadeStamps(b, snappedTree(t), charShader(t.seed, WOOD_D));
    ashFoot(b, t.x, t.y + 3, t.r * 3.4, 3, t.seed);
  }
  // the one that fell against its neighbour and stayed there
  shadeStamps(b, logStamps(394, 182, 462, 108, 4, 2, 421), charShader(421, WOOD_D));
  shadeStamps(b, handTree({ x: 420, y: 178, h: 66, r: 2.6, lean: 0.1, seed: 422, spread: 2, fingers: 3, thumb: 1 }), charShader(422, WOOD_D));
  ashFoot(b, 394, 184, 13, 3.4, 421);
  return b;
}

// ---------------------------------------------------------------------------
// The great trees and the timber, standing behind the champions
// ---------------------------------------------------------------------------

/** Where a sprite's foot is, so a prop can sit on the ground it was drawn for. */
const GIANT = { w: 300, h: 232, x: 196, y: 222 };

/** The enormous hand on the right: burned from its roots to its highest fingers, a hollow in its wrist, reaching up off the top of the sky. */
function giantTree(): Bitmap {
  const b = new Bitmap(GIANT.w, GIANT.h);
  shadeStamps(b, handTree({ x: GIANT.x, y: GIANT.y - 2, h: 226, r: 15, lean: -0.04, seed: 511, fingers: 5, spread: 2.3, thumb: -1 }), charShader(511));
  hollow(b, GIANT.x - 5, GIANT.y - 42, 4.6, 12);
  ashFoot(b, GIANT.x - 2, GIANT.y + 2, 44, 7, 512);
  return b;
}

const SNAG = { w: 170, h: 214, x: 70, y: 204 };

/** The snapped tree on the left, its shards and its raised arm against the sun. */
function snagTree(): Bitmap {
  const b = new Bitmap(SNAG.w, SNAG.h);
  shadeStamps(b, snappedTree({ x: SNAG.x, y: SNAG.y - 2, h: 190, r: 11, lean: 0.03, seed: 521, thumb: 1 }), charShader(521));
  hollow(b, SNAG.x + 2, SNAG.y - 30, 3.4, 9);
  ashFoot(b, SNAG.x - 2, SNAG.y + 2, 32, 6, 522);
  return b;
}

/** A tangled pile of black timber on the arena's far edge: trunks thrown across each other, their limbs burnt off, ash drifted against the foot of it. */
function timberPile(): Bitmap {
  const w = 190, hh = 66;
  const b = new Bitmap(w, hh);
  ellipseFill(b, w / 2 + 6, hh - 7, w / 2 - 4, 7, (x, y, d) => (dith(x, y, (1 - d) * 2) ? withAlpha(GROUND[1], 200) : 0));
  const logs: [number, number, number, number, number, number, number][] = [
    [18, 46, 132, 30, 5.4, 3.4, 531],
    [168, 50, 64, 24, 6.4, 3.2, 532],
    [30, 30, 100, 54, 4, 5, 533],
    [186, 34, 110, 48, 4, 5.2, 534],
    [8, 56, 104, 48, 6.6, 5, 535],
    [94, 58, 180, 52, 7.4, 5.6, 536],
    [40, 20, 96, 52, 2.6, 4.4, 537],
    [158, 18, 106, 52, 2.6, 4.2, 538],
  ];
  for (const [x0, y0, x1, y1, r0, r1, seed] of logs) {
    shadeStamps(b, logStamps(x0, y0, x1, y1, r0, r1, seed), charShader(seed));
    if (r0 > 5) logEnd(b, x0, y0, r0);
  }
  for (const [x, y, a, len, seed] of [[46, 40, -0.5, 30, 541], [84, 34, -2.4, 26, 542], [120, 36, -0.9, 34, 543], [150, 44, -2.2, 28, 544], [100, 50, -1.5, 22, 545]] as const) shadeStamps(b, limbStamps(x, y, a, len, seed), charShader(seed));
  for (let x = 0; x < w; x++) {
    const edge = Math.min(1, Math.min(x, w - 1 - x) / 28);
    const top = hh - edge * (5 + 5 * n1(x, 31, 539));
    for (let y = Math.max(0, Math.ceil(top)); y < hh; y++) b.set(x, y, rampDither(GROUND, clamp(7.8 - (y - top) * 0.1 + (y - top < 1 ? 2 : 0) + (hash2(x, y, 540) - 0.5) * 0.6, 0, GROUND.length - 1), x, y));
  }
  return b;
}

/** A burnt trunk lying out of the near left corner, its broken end toward us, dark against the ash. */
function cornerLog(): Bitmap {
  const w = 190, hh = 62;
  const b = new Bitmap(w, hh);
  shadeStamps(b, logStamps(-14, 52, 150, 40, 15, 11, 551), charShader(551, CHAR, 0.6));
  logEnd(b, 150, 40, 11);
  for (let x = 0; x < w; x++) {
    const top = 50 + (n1(x, 37, 552) - 0.5) * 10 + (x / w) * 4;
    for (let y = Math.round(top); y < hh; y++) b.set(x, y, rampDither(GROUND, 6.8 - (y - top) * 0.1 + (y - top < 1 ? 2.2 : 0) + (hash2(x, y, 553) - 0.5) * 0.6, x, y));
  }
  return b;
}

// ---------------------------------------------------------------------------
// The holes where enormous trees once stood
// ---------------------------------------------------------------------------

/**
 * A deep hole: a lip of thrown-up ash, torn roots running out from it over the
 * ground and hanging in from its wall, the far wall in strata of ash and black soil
 * sinking into nothing. Its second bitmap is the mist lying in it.
 */
function hole(rx: number, ry: number, seed: number): [Bitmap, Bitmap] {
  const pad = 46;
  const w = Math.ceil(rx * 2 + pad * 2), hh = Math.ceil(ry * 2 + 30);
  const cx = w / 2, cy = hh / 2;
  const b = new Bitmap(w, hh);
  const edge = (x: number, y: number) => Math.hypot((x - cx) / rx, (y - cy) / ry) + (vnoise(x, y, 11, seed) - 0.5) * 0.16;
  // the torn roots, out over the ground
  const r = rng(seed + 1);
  const out = Math.round(rx / 5);
  const roots: Stamp[][] = [];
  for (let i = 0; i < out; i++) {
    const a = (i / out) * Math.PI * 2 + (r() - 0.5) * 0.5;
    const sx = cx + Math.cos(a) * rx * 0.86, sy = cy + Math.sin(a) * ry * 0.86;
    const s: Stamp[] = [];
    const len = 12 + r() * (rx * 0.6);
    const n = Math.ceil(len);
    const r0 = 1.2 + rx * 0.05;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      s.push([sx + Math.cos(a + (n1(k, 13, seed + i) - 0.5) * 1.2) * k, sy + Math.sin(a + (n1(k, 13, seed + i) - 0.5) * 1.2) * k * 0.42, r0 * (1 - t * 0.72)]);
    }
    roots.push(s);
  }
  for (const s of roots) shadeStamps(b, s, charShader(seed + 2));
  // the lip: ash thrown up round it, only just paler than the ground
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const q = edge(x, y);
      if (q < 1 || q > 1.28) continue;
      if (!dith(x, y, (1.28 - q) * 5)) continue;
      const lit = -((x - cx) / rx) * 0.6 - ((y - cy) / ry) * 0.5;
      b.set(x, y, rampDither(GROUND, clamp(7.4 + lit * 1.4 + (hash2(x, y, seed + 3) - 0.5) * 0.5, 0, GROUND.length - 1), x, y));
    }
  }
  // inside: we look down on the far wall; it stands in its own shade, ash at its top, then bands of black soil
  // sinking into nothing, and the near lip hides the bottom
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const q = edge(x, y);
      if (q >= 1) continue;
      const xx = (x - cx) / rx, yy = (y - cy) / ry;
      const wall = (yy + Math.sqrt(Math.max(0, 1 - xx * xx))) * (ry / 20) + (n1(x, 13, seed + 5) - 0.5) * 0.08;
      let v = 0;
      if (wall < 0.1) v = 7.2 - xx * 1.4;
      else if (wall < 0.16) v = 3.2;
      else if (wall < 0.3) v = 2.6 + (n1(x, 5, seed + 8) > 0.6 ? 0.8 : 0) + Math.max(0, xx) * 1.2;
      else if (wall < 0.38) v = 1.4;
      else if (wall < 0.62) v = 1.3 + Math.max(0, xx) * 0.7;
      b.set(x, y, rampDither(GROUND, clamp(v + (hash2(x, y, seed + 4) - 0.5) * 0.3, 0, GROUND.length - 1), x, y));
    }
  }
  // a few roots hanging out of the far wall, no two alike, their torn ends pale
  const hang = Math.max(2, Math.round(rx / 13));
  for (let i = 0; i < hang; i++) {
    const xx = ((i + 0.2 + r() * 0.6) / hang) * 1.5 - 0.75;
    const s: Stamp[] = [];
    const sx = cx + xx * rx, sy = cy - Math.sqrt(1 - xx * xx) * ry + 1;
    const len = ry * (0.3 + r() * 0.7);
    const lean = (r() - 0.5) * 1.1;
    for (let k = 0; k < len; k++) s.push([sx + lean * k + (n1(k, 5, seed + i) - 0.5) * 2.4, sy + k * 0.8, Math.max(0.7, (0.9 + rx * 0.02) * (1 - k / len))]);
    shadeStamps(b, s, charShader(seed + 6));
    b.set(Math.round(sx + lean * len), Math.round(sy + len * 0.8), ASHY[0]);
  }
  // the near lip's edge, ash just about to go over
  for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const xx = (x - cx) / rx;
    const y = Math.round(cy + Math.sqrt(Math.max(0, 1 - xx * xx)) * ry + (vnoise(x, 0, 11, seed) - 0.5) * 2);
    b.set(x, y, GROUND[9]);
  }
  // mist lying far down in it
  const m = new Bitmap(w, hh);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const q = edge(x, y);
      if (q >= 0.9) continue;
      const a = (0.9 - q) * 0.7 * (0.2 + vnoise(x, y * 2.4, 23, seed + 7) * 1) * smooth(-0.2, 0.5, (y - cy) / ry);
      if (a > 0.05 && dith(x, y, a)) m.set(x, y, withAlpha(MIST, 90));
    }
  }
  return [b, m];
}

/** A thread of ash running off the lip into the dark: grains that fall slowly and go out. */
function trickle(n: number): Bitmap[] {
  const w = 9, hh = 28;
  const r = rng(561);
  const grains = Array.from({ length: 16 }, () => ({ ph: r(), x: r() * 3 + 3, wob: r() * 6 }));
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    for (const g of grains) {
      const t = (i / n + g.ph) % 1;
      const y = t * t * (hh - 2);
      if (dith(i, Math.round(y), 1 - t * 0.85)) b.set(Math.round(g.x + Math.sin(t * Math.PI * 2 + g.wob) * 0.8), Math.round(y), ASHY[t < 0.4 ? 2 : t < 0.7 ? 1 : 0]);
    }
    out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------------------
// What lies on the ground
// ---------------------------------------------------------------------------

/** A stone darkened by the heat: broad, flat-topped, broken into a few faces, its sun side lighter, a shadow at its foot. */
function stone(b: Bitmap, cx: number, cy: number, s: number, seed: number) {
  ellipseFill(b, cx + s * 0.5, cy + s * 0.5, s * 1.5, s * 0.46, (x, y, d) => (dith(x, y, (1 - d) * 1.8) ? GROUND[1] : b.get(x, y)));
  const k = 5 + Math.floor(hash2(0, 1, seed) * 3);
  const face = (a: number) => Math.floor(((a + Math.PI) / (Math.PI * 2)) * k);
  const reach = (i: number) => 0.76 + hash2(i % k, 0, seed) * 0.36;
  for (let y = Math.floor(cy - s); y <= cy + s * 0.6; y++) {
    for (let x = Math.floor(cx - s * 1.4); x <= cx + s * 1.4; x++) {
      const dx = (x + 0.5 - cx) / (s * 1.32), dy = (y + 0.5 - cy) / (s * 0.74);
      const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const f = face(a), t = ((a + Math.PI) / (Math.PI * 2)) * k - f;
      if (d > reach(f) * (1 - t) + reach(f + 1) * t) continue;
      // the top face takes the light; the others by how they turn to the sun
      const top = d < 0.46 && dy < 0.12;
      const v = top ? 4.4 : 2.1 - Math.cos(a - 3.8) * -1.6 + (hash2(f, 2, seed) - 0.5) * 0.9;
      b.set(x, y, rampDither(STONE, clamp(v + (hash2(x, y, seed) - 0.5) * 0.4, 0, STONE.length - 1), x, y));
    }
  }
}

/** A branch reduced to charcoal, lying flat: a forked stick, pale with ash along its top. */
function charBranch(b: Bitmap, x: number, y: number, len: number, a: number, s: number, seed: number) {
  const st: Stamp[] = [];
  const main = limb(st, { x, y, a }, len, 1.5 * s, 0.7, (hash2(1, 2, seed) - 0.5) * 0.8, seed);
  const flat = (list: Stamp[]) => list.map(([px, py, pr]): Stamp => [px, y + (py - y) * 0.42, pr]);
  limb(st, { x: x + Math.cos(a) * len * 0.46, y: y + Math.sin(a) * len * 0.46, a: a + 0.8 }, len * 0.34, 0.9 * s, 0.7, 0.2, seed + 1);
  limb(st, { x: x + Math.cos(a) * len * 0.72, y: y + Math.sin(a) * len * 0.72, a: a - 0.7 }, len * 0.26, 0.8 * s, 0.7, -0.2, seed + 2);
  void main;
  const f = flat(st);
  for (const [px, py] of f) if (hash2(Math.round(px), Math.round(py), seed + 3) < 0.5) b.set(Math.round(px + 1), Math.round(py + 1 + s), GROUND[2]);
  shadeStamps(b, f, charShader(seed));
}

/** A burnt root humping up out of the cracked soil and back under it, thick and knotted, sunk at both ends. */
function rootArch(b: Bitmap, x0: number, y0: number, x1: number, y1: number, rise: number, r: number, seed: number) {
  const s: Stamp[] = [];
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  const humps = hash2(0, 3, seed) < 0.5 ? 1 : 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const sx = x0 + (x1 - x0) * t + (n1(i, 9, seed) - 0.5) * 4, gy = y0 + (y1 - y0) * t + (n1(i, 14, seed + 1) - 0.5) * 3;
    const up = Math.pow(Math.abs(Math.sin(t * Math.PI * humps)), 0.8);
    const rr = r * (0.7 + up * 0.5 + (n1(i, 5, seed + 2) - 0.5) * 0.45) * (1 - t * 0.25);
    s.push([sx, gy - up * rise * 0.5, rr]);
    ellipseFill(b, sx + 1.5, gy + rr * 0.5, rr * 1.3, rr * 0.45, (x, y, d) => (dith(x, y, (1 - d) * 1.6) ? GROUND[2] : b.get(x, y)));
  }
  shadeStamps(b, s, charShader(seed));
  // the soil split round where it goes under
  for (const [ex, ey] of [[x0, y0], [x1, y1]]) ellipseFill(b, ex, ey + r * 0.3, r * 1.5, r * 0.6, (x, y, d) => (d > 0.7 ? rampDither(GROUND, 7.4 + (hash2(x, y, seed) - 0.5), x, y) : GROUND[1]));
}

/** Pale dead grass: thin blades in a clump, a loop of `n` frames in which they hardly stir (one blade may run two sways to the others' one, so the clump never keeps time). */
function deadGrass(blades: number, tall: number, spread: number, n: number, seed: number): Bitmap[] {
  const w = Math.ceil(spread * 2 + tall + 6), hh = Math.ceil(tall + 3);
  const r = rng(seed);
  const list = Array.from({ length: blades }, () => ({ x: w / 2 + (r() - 0.5) * spread * 2, len: tall * (0.5 + r() * 0.5), lean: (r() - 0.5) * 0.9, cyc: r() < 0.3 ? 2 : 1, ph: r() * 6.3, tone: r() }));
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    for (const l of list) {
      const sway = Math.sin((i / n) * Math.PI * 2 * l.cyc + l.ph) * 1.3;
      for (let k = 0; k < l.len; k++) {
        const t = k / l.len;
        const x = l.x + (l.lean * l.len * 0.5 + sway) * t * t;
        b.set(Math.round(x), hh - 1 - Math.round(k * (1 - 0.12 * t * t)), STRAW[clamp(Math.round(l.tone * 1.8 + t * 2.4), 0, STRAW.length - 1)]);
      }
    }
    out.push(b);
  }
  return out;
}

function floorGround(): Bitmap {
  const { w, h } = FLOOR;
  const b = new Bitmap(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) b.set(x, y, groundColor(x, y + 192));
  const things: { y: number; draw: () => void }[] = [];
  const r = rng(601);
  // scattered stones, darkened by the heat
  for (let i = 0; i < 30; i++) {
    const x = 6 + r() * 628, y = 200 + Math.pow(r(), 0.8) * 152;
    const s = (1.8 + r() * r() * 5) * pscale(y) * 1.3, seed = 610 + i;
    if (!busy(x, y)) things.push({ y, draw: () => stone(b, x, y - 192, s, seed) });
  }
  // fallen branches reduced to charcoal
  for (let i = 0; i < 24; i++) {
    const x = 6 + r() * 628, y = 200 + Math.pow(r(), 0.8) * 152;
    const a = r() * Math.PI * 2, s = pscale(y), len = (10 + r() * 22) * s, seed = 650 + i * 3;
    if (!busy(x, y)) things.push({ y, draw: () => charBranch(b, x, y - 192, len, a, s, seed) });
  }
  // burnt roots rising from the cracked soil
  const roots: [number, number, number, number, number, number][] = [[60, 246, 104, 238, 6, 2.6], [244, 296, 282, 282, 5, 2.6], [356, 226, 396, 220, 4, 1.8], [366, 340, 424, 326, 7, 3.4], [556, 268, 610, 258, 6, 2.8], [226, 342, 262, 354, 7, 3], [590, 350, 636, 338, 8, 3.6], [550, 214, 582, 222, 3.6, 1.8], [16, 300, 58, 308, 6, 2.8]];
  roots.forEach(([x0, y0, x1, y1, rise, rr], i) => things.push({ y: (y0 + y1) / 2, draw: () => rootArch(b, x0, y0 - 192, x1, y1 - 192, rise, rr, 700 + i) }));
  // the shortest tufts of dead grass lie still; the taller stir (they are props)
  for (let i = 0; i < 26; i++) {
    const x = 8 + r() * 624, y = 204 + Math.pow(r(), 0.8) * 150;
    const s = pscale(y), seed = 740 + i;
    if (busy(x, y)) continue;
    const tuft = deadGrass(4 + Math.floor(r() * 5), 5 * s + 2, 4 * s + 1, 1, seed)[0];
    things.push({ y, draw: () => b.blit(tuft, Math.round(x - tuft.w / 2), Math.round(y - 192 - tuft.h)) });
  }
  things.sort((p, q) => p.y - q.y).forEach((t) => t.draw());
  return b;
}

// ---------------------------------------------------------------------------
// The stillness: mist, light, a stag
// ---------------------------------------------------------------------------

/** A bank of mist creeping along, thick in its middle, gone at its ends and its top and foot. */
function mistBank(w: number, hh: number, k: number, seed: number): Bitmap[] {
  const b = new Bitmap(w, hh);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const edge = Math.min(1, Math.min(x, w - 1 - x) / 46);
      const a = Math.pow(Math.sin(((y + 0.5) / hh) * Math.PI), 1.3) * edge * k * (vnoise(x, y * 2.6, 44, seed) * 1.2 - 0.12);
      if (a > 0.04 && dith(x, y, a)) b.set(x, y, withAlpha(MIST, a > 0.5 ? 130 : 96));
    }
  }
  return [b];
}

/** Pale light slanting down between the trunks from the veiled sun: frame 0 is empty, so it breathes in and out (pulse). */
function lightShaft(w: number, len: number, dx: number): Bitmap[] {
  const W = Math.ceil(w + dx) + 2;
  const b = new Bitmap(W, len);
  const pale = hex('#fff8e8');
  for (let y = 0; y < len; y++) {
    const t = y / len;
    const x0 = dx * t;
    for (let x = Math.floor(x0); x < x0 + w; x++) {
      const across = Math.abs((x + 0.5 - x0) / w - 0.5) * 2;
      const k = (1 - across * across) * Math.pow(Math.sin(Math.min(1, t * 1.4 + 0.12) * Math.PI), 0.7) * 0.62;
      if (k > 0.05 && dith(x, y, k)) b.set(x, y, withAlpha(pale, 62));
    }
  }
  return [new Bitmap(1, 1), b];
}

interface StagPose { legs: [number, number][]; bob: number; down: boolean; nod: number; ear: number; tail: number }

/** A stag the colour of ash, facing right: his antlers are the same hands as the trees. */
function stag(p: StagPose): Bitmap {
  const W = 34, HH = 38;
  const b = new Bitmap(W, HH);
  const g = HH - 2;
  ellipseFill(b, 15, g + 0.5, 12, 1.4, (x, y, d) => (dith(x, y, (1 - d) * 1.6) ? withAlpha(GROUND[1], 150) : 0));
  const leg = (lx: number, [fwd, lift]: [number, number], far: boolean) => {
    const x = Math.round(lx + fwd), y1 = Math.round(g - lift);
    for (let y = g - 12; y <= y1; y++) {
      b.set(x, y, PELT[far ? 0 : y > g - 5 ? 1 : 2]);
      // the thigh and forearm are thicker than the shank
      if (y < g - 7) b.set(x + 1, y, PELT[far ? 0 : 1]);
    }
    b.set(x, y1, CHAR[1]);
  };
  leg(7, p.legs[0], true);
  leg(19, p.legs[2], true);
  const by = p.bob;
  const masses: [number, number, number, number][] = [[7.5, g - 16 + by, 4.6, 4.6], [13, g - 16 + by, 6.6, 3.5], [19, g - 16 + by, 4.5, 5.2]];
  const inBody = (x: number, y: number) => masses.some(([cx, cy, rx, ry]) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 < 1);
  // neck and head, the head's place depending on whether he looks up or eats
  const head: [number, number] = p.down ? [26, g - 3 + p.nod] : [25, g - 24 + p.nod];
  const neckFrom: [number, number] = p.down ? [20, g - 14 + by] : [20, g - 17 + by];
  const neck: Stamp[] = [];
  for (let k = 0; k <= 14; k++) {
    const t = k / 14;
    neck.push([neckFrom[0] + (head[0] - 1 - neckFrom[0]) * t, neckFrom[1] + (head[1] + 1 - neckFrom[1]) * t, 2.5 - t * 1.1]);
  }
  const pelt = (x: number, y: number, nx: number, ny: number) => rampDither(PELT, clamp(2.6 - nx * 1.4 - ny * 1.4, 0, PELT.length - 1), x, y);
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < W; x++) {
      if (!inBody(x, y)) continue;
      const top = clamp((g - 13 + by - y) / 7, 0, 1);
      b.set(x, y, rampDither(PELT, clamp(1 + top * 3.4 + (x < 14 ? 0.2 : 0), 0, PELT.length - 1), x, y));
    }
  }
  shadeStamps(b, neck, pelt);
  leg(10, p.legs[1], false);
  leg(21, p.legs[3], false);
  // the tail, flicking now and then
  b.set(3, g - 17 + by + p.tail, PELT[5]);
  b.set(2, g - 16 + by + p.tail, PELT[5]);
  b.set(3, g - 16 + by + p.tail, PELT[4]);
  // the head and muzzle
  const [hx, hy] = head;
  ellipseFill(b, hx, hy, 2.6, 2, (x, y) => rampDither(PELT, clamp(3 - (x - hx) * 0.3 - (y - hy) * 0.8, 0, PELT.length - 1), x, y));
  for (const dx of [2, 3]) b.set(hx + dx, hy + (p.down ? 1 : 1), PELT[dx === 3 ? 1 : 3]);
  b.set(hx + 4, hy + (p.down ? 2 : 1), CHAR[1]);
  b.set(hx + 1, hy - 1, CHAR[1]);
  // the ear
  b.set(hx - 2, hy - 2 + p.ear, PELT[4]);
  b.set(hx - 3, hy - 3 + p.ear, PELT[3]);
  // the antlers: a beam each, knuckled tines
  const horn: Stamp[] = [];
  const dirUp = p.down ? -0.9 : UP - 0.4;
  const dirFar = p.down ? -0.3 : UP + 0.1;
  for (const [start, a0] of [[-1, dirUp], [1, dirFar]] as const) {
    let at: Reach = { x: hx + start, y: hy - 2, a: a0 };
    at = limb(horn, at, 5, 0.75, 0.7, 0.2, 801, 0);
    limb(horn, { ...at, a: at.a + 0.9 }, 2.4, 0.7, 0.7, 0, 802, 0);
    at = limb(horn, at, 3.5, 0.75, 0.7, -0.3, 803, 0);
    // the tips, when he looks up; lowered to the grass the antlers show as two plain forks
    if (!p.down) {
      limb(horn, { ...at, a: at.a - 0.9 }, 2.4, 0.7, 0.7, 0, 804, 0);
      limb(horn, { ...at, a: at.a + 0.5 }, 3, 0.7, 0.7, 0, 805, 0);
    }
  }
  shadeStamps(b, horn, (x, y, nx) => (nx < 0 ? CHAR[4] : CHAR[2]));
  return b;
}

function stagFrames(): Bitmap[] {
  const out: Bitmap[] = [];
  const walk: [number, number][][] = [
    [[1.5, 0], [-1.5, 0], [-1.5, 1], [1.5, 0]],
    [[0.5, 1], [-0.5, 0], [-0.5, 0], [0.5, 1]],
    [[-1.5, 0], [1.5, 1], [1.5, 0], [-1.5, 0]],
    [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 0]],
  ];
  walk.forEach((legs, i) => out.push(stag({ legs, bob: i % 2 ? -0.5 : 0, down: false, nod: i % 2 ? 1 : 0, ear: 0, tail: 0 })));
  const still: [number, number][] = [[0, 0], [0, 0], [0, 0], [0, 0]];
  // grazing: head down, a slow nod; he looks up now and then, an ear turns, his tail flicks
  for (const [down, nod, ear, tail] of [[1, 0, 0, 0], [1, 1, 0, 0], [1, 0, 0, 0], [1, 1, 0, 1], [1, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0], [1, 0, 0, 0]] as const) out.push(stag({ legs: still, bob: 0, down: !!down, nod, ear, tail }));
  return out;
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const r = rng(701);
  const plain = ['ash_a', 'ash_b', 'ash_c'];
  for (let row = 6; row < MAP_ROWS; row++) for (let c = 0; c < MAP_COLS; c++) ground[row * MAP_COLS + c] = id(plain[Math.floor(r() * plain.length)]);
  const props: PropPlacement[] = [
    // far: the mist in the valleys, the pale light between the trunks, the stag on the slope
    { kind: 'mist_far', x: 40, y: 122, layer: 'far' },
    { kind: 'mist_mid', x: 280, y: 146, layer: 'far' },
    { kind: 'shaft_a', x: 150, y: 44, layer: 'far' },
    { kind: 'shaft_b', x: 214, y: 34, layer: 'far' },
    { kind: 'shaft_c', x: 104, y: 58, layer: 'far' },
    { kind: 'stag', x: 268, y: 184, layer: 'far' },
    // floor: the ground, mist lying on its far edge, the great trees, the timber, the holes, the grass
    { kind: 'ground', x: 0, y: 192, layer: 'floor' },
    { kind: 'mist_low', x: 180, y: 196, layer: 'floor' },
    { kind: 'giant', x: 590, y: 222, layer: 'floor' },
    { kind: 'snag', x: 46, y: 226, layer: 'floor' },
    { kind: 'timber', x: 322, y: 232, layer: 'floor' },
    { kind: 'hole_big', x: 318, y: 322, layer: 'floor' },
    { kind: 'trickle', x: 334, y: 301, layer: 'floor' },
    { kind: 'hole_small', x: 604, y: 300, layer: 'floor' },
    { kind: 'hole_big_mist', x: 318, y: 322.5, layer: 'floor' },
    { kind: 'hole_small_mist', x: 604, y: 300.5, layer: 'floor' },
    { kind: 'grass_a', x: 30, y: 276, layer: 'floor' },
    { kind: 'grass_b', x: 276, y: 240, layer: 'floor' },
    { kind: 'grass_c', x: 568, y: 262, layer: 'floor' },
    { kind: 'grass_a', x: 216, y: 330, layer: 'floor' },
    { kind: 'grass_b', x: 432, y: 348, layer: 'floor' },
    // fg: a burnt trunk in the near left corner
    { kind: 'log', x: 0, y: 362, layer: 'fg' },
  ];
  const order = { far: 0, back: 1, floor: 2, fg: 3 } as const;
  props.sort((a, c) => order[a.layer] - order[c.layer] || a.y - c.y);
  return { ground, wall, props };
}

const HOLE_BIG = hole(66, 20, 821), HOLE_SMALL = hole(25, 8.5, 822);

export const zone7: ZoneArt = {
  id: 'zone7',
  name: 'Dead Forest',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    mist_far: mistBank(300, 26, 0.7, 811),
    mist_mid: mistBank(360, 30, 0.75, 812),
    mist_low: mistBank(280, 24, 0.5, 813),
    shaft_a: lightShaft(26, 170, 116),
    shaft_b: lightShaft(16, 158, 100),
    shaft_c: lightShaft(18, 150, 92),
    stag: stagFrames(),
    ground: [floorGround()],
    giant: [giantTree()],
    snag: [snagTree()],
    timber: [timberPile()],
    hole_big: [HOLE_BIG[0]],
    hole_small: [HOLE_SMALL[0]],
    hole_big_mist: [new Bitmap(1, 1), HOLE_BIG[1]],
    hole_small_mist: [new Bitmap(1, 1), HOLE_SMALL[1]],
    trickle: trickle(18),
    grass_a: deadGrass(14, 17, 8, 22, 831),
    grass_b: deadGrass(10, 12, 6, 26, 832),
    grass_c: deadGrass(16, 15, 9, 30, 833),
    log: [cornerLog()],
  }),
  kinds: {
    // the mist creeps, slower than anything else in the game
    mist_far: { anchor: [0, 0], mode: 'static', drift: { speed: 0.8 } },
    mist_mid: { anchor: [0, 0], mode: 'static', drift: { speed: -1.1 } },
    mist_low: { anchor: [0, 0], mode: 'static', drift: { speed: 1.4 } },
    // the light breathes, each shaft on its own slow breath
    shaft_a: { anchor: [0, 0], mode: 'pulse', ms: 11000 },
    shaft_b: { anchor: [0, 0], mode: 'pulse', ms: 16000 },
    shaft_c: { anchor: [0, 0], mode: 'pulse', ms: 20000 },
    // he walks a little way, grazes for a long time, walks back
    stag: { anchor: [0.46, 1], mode: 'loop', ms: 620, roam: { span: 66, speed: 2.4, pause: 22000, walk: 4 } },
    ground: { anchor: [0, 0], mode: 'static' },
    giant: { anchor: [GIANT.x / GIANT.w, GIANT.y / GIANT.h], mode: 'static' },
    snag: { anchor: [SNAG.x / SNAG.w, SNAG.y / SNAG.h], mode: 'static' },
    timber: { anchor: [0.5, 1], mode: 'static' },
    // the mist in the holes breathes
    hole_big: { anchor: [0.5, 0.5], mode: 'static' },
    hole_small: { anchor: [0.5, 0.5], mode: 'static' },
    hole_big_mist: { anchor: [0.5, 0.5], mode: 'pulse', ms: 13000 },
    hole_small_mist: { anchor: [0.5, 0.5], mode: 'pulse', ms: 17000 },
    trickle: { anchor: [0.5, 0], mode: 'loop', ms: 150 },
    grass_a: { anchor: [0.5, 1], mode: 'loop', ms: 340 },
    grass_b: { anchor: [0.5, 1], mode: 'loop', ms: 380 },
    grass_c: { anchor: [0.5, 1], mode: 'loop', ms: 310 },
    log: { anchor: [0, 1], mode: 'static' },
  },
  layout,
  horizon: HZ,
};
