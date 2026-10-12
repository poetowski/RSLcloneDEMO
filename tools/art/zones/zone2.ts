// Zone "Verdant Grove": Zone 2 of Jakub's working notes (docs/DESIGN_DECISIONS.md
// 5.4, 5.5), painted on his brief of 2026-10-12: an overgrown place full of
// statues and columns, old exotic temples on a jungle table mountain in the
// background, many trees in the foreground, a sunlit day with a few
// butterflies, birds and clouds in the sky; architecture like the Maya's but
// only similar; serpents carved on a wall on the right, in front of the stairs
// that rise to the table mountain; the scene lightly animated.
//
// As painted: the sun high in the upper left (the key light) breaks through
// the canopy in slow beams. Far off stands a table mountain, blue with
// distance, a waterfall spilling from its brow, a stepped temple at the head of
// the great stair and a smaller one along the rim, a tower of cloud behind it;
// to the left a temple pyramid half swallowed by the jungle under the sun. In
// the middle ground a colonnade on its terrace: columns standing, broken and
// fallen, two stelae, a reclining figure and a seated idol, a strangler fig on
// its end. On the right the terrace wall at the foot of the great stair:
// stepped merlons, a feathered serpent undulating along its panel round carved
// discs, its great head resting open-jawed at the wall's end in a collar of
// feathers, a stone jaguar lying before the wall's east end; the stair climbs
// from behind the wall to the plateau. On the left a colossal stone head sinks
// into the earth beside a broken column, under a giant tree. The arena is an
// old paved court, its flagstones lifted by roots and taken by moss and grass.
// Two great trees frame the edges; leaves hang into the top corners, lianas
// sway, macaws wheel, clouds drift; butterflies and pollen float in the light
// (ZoneDef: ambient 'pollen', butterflies). Everything the brief did not name is
// a first take (docs/DESIGN_DECISIONS.md 5.4b).
import { dith, ellipseFill, line, outline, polyFill, rampDither } from '../paint.ts';
import type { Material } from '../palette.ts';
import { Capsule, Ellipse, Frame, Hit, Pixels, Poly, Ribbon, V } from '../render.ts';
import { Bitmap, hash2, hex, RGBA, rng, withAlpha } from '../raster.ts';
import { MAP_COLS, MAP_ROWS, Painter, PropPlacement, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));
/** A stone or wood ramp for the statues drawn with the champion renderer: [outline, deep, shadow, base, light, highlight]. */
const mat = (name: string, colors: string[]): Material => ({ name, kind: 'matte', ramp: H(colors) });

// --- the day sky: deep blue overhead, paling toward the jungle haze, white-gold round the sun
const SKY = H(['#2356a4', '#2960b0', '#306bbb', '#3877c5', '#4283ce', '#4d90d6', '#5a9cdd', '#69a9e3', '#7bb5e8', '#8fc1ec', '#a4ccef', '#b9d7f1', '#cde2f3']);
const SUNG = H(['#d4e6f0', '#e2edef', '#eff1e8', '#f8f4e2', '#fff9ec', '#fffdf6']);
const SUN = H(['#fff1bc', '#fff7da', '#fffcf0', '#ffffff']);
const CLOUD = H(['#5f7ca4', '#7690b6', '#8fa6c7', '#a9bcd7', '#c3d3e5', '#dce6f1', '#eff4f9', '#ffffff']);
const FARM = H(['#5d86a8', '#6a92b2', '#789ebb', '#87aac3', '#98b6cb', '#aac3d3', '#bccfda']);
// --- the table mountain, blue with distance; the green along its brow and ledges
const TEP = H(['#3c4766', '#475271', '#535d7c', '#606987', '#6e7690', '#7d8399', '#8d91a2', '#9e9fab', '#b0aeb4']);
const TEPG = H(['#2f5250', '#385e56', '#426a5c', '#4d7762', '#59836a', '#679072', '#769d7a']);
/** the temples far off: limestone in the haze */
const TSTONE = H(['#4e5874', '#5f6984', '#707990', '#838a9b', '#979ca6', '#abaeb1', '#bfc0bc', '#d3d2c8']);
const WATER = H(['#7ea8c8', '#9ec4dc', '#c2ddec', '#e2f0f7', '#ffffff']);
const MIST = H(['#a2bfcc', '#b5ccd6', '#c7d9de', '#d9e6e8', '#eaf2f2']);
// --- the jungle, far to near
const JFAR = H(['#355e57', '#3d685c', '#467362', '#507e68', '#5b896e', '#679574', '#74a07a', '#82ab80']);
const JMID = H(['#142b1d', '#1a3522', '#203f26', '#27492a', '#2f552e', '#376132', '#416e36', '#4c7b3a', '#5a883e', '#6b9644', '#7fa54a', '#94b452']);
const BARK = H(['#1b1814', '#29241d', '#383126', '#483f31', '#594e3d', '#6c5f4a', '#817258', '#978767']);
// --- the ruins: limestone in the sun, moss, the last of the old paint
const LIME = H(['#272a2c', '#383b39', '#4b4e48', '#5f6257', '#747667', '#8a8a78', '#a1a08a', '#b8b69d', '#cdcab0', '#e0dcc4']);
const MOSS = H(['#20301b', '#2a3d20', '#354b25', '#41592a', '#4e6830', '#5c7736']);
const RED = H(['#5a3d33', '#68301f', '#844027', '#9e5434']);
const JADE = H(['#24504e', '#2e6662', '#3a7e76', '#4e968a', '#6aae9e']);
// --- the floor: grass in the shade of the canopy, the court's old paving
const GR = H(['#172210', '#1d2a13', '#243316', '#2b3c1a', '#33461e', '#3c5022', '#455a27', '#4f652c', '#5a7031', '#667c37']);
const PAVE = H(['#25261f', '#2f3027', '#3a3a30', '#46453a', '#525044', '#5f5c4e', '#6c6858', '#7a7562', '#88836e']);
// --- the near leaves, and the sun shining through them
const LEAF = H(['#0a170e', '#0e2112', '#132b17', '#18361b', '#1e4120', '#254d25', '#2d5a2a', '#36672f', '#417534', '#4e833a', '#5d9240', '#6fa147', '#86b150', '#a0c25c']);
const GLOW = H(['#4f8a2c', '#68a434', '#86bc3e', '#a8d24e', '#cbe46c', '#e6f29a']);
const FLOWER = H(['#7a1a24', '#a8262e', '#d23c34', '#f2643c', '#ff9a5a']);
const PINK = H(['#7a2456', '#a83a78', '#d05a9c', '#f08ac0']);
const GOLDF = H(['#8a6416', '#c08e22', '#e8bc3a', '#fbe07a']);
const PETAL = H(['#9a9a8c', '#c6c6b6', '#ececde', '#ffffff']);
// --- the macaws
const MACAW = { red: hex('#d8302a'), dark: hex('#9c1c1c'), blue: hex('#2a5ad0'), yellow: hex('#f2c234'), beak: hex('#ece4cc') };

// --- materials for the statues (the champion renderer's ramps)
const M_LIME = mat('lime', ['#2a2c2c', '#454842', '#62645a', '#848470', '#a6a48e', '#c8c4ac']);
const M_PLUME = mat('plume', ['#22302e', '#3a524c', '#536e66', '#6e8a80', '#8ea89a', '#b0c4b4']);
const M_DARK = mat('maw', ['#0c0b0c', '#141313', '#1c1b1a', '#252321', '#2e2b28', '#383430']);
const M_RED = mat('tongue', ['#2a100c', '#4c1e16', '#6c2c1e', '#8c3e2a', '#a8543a', '#c06e4e']);
const M_BARK = mat('bark', ['#161310', '#2a241c', '#40372b', '#5a4e3c', '#776850', '#968566']);
const M_EARTH = mat('earth', ['#141a0e', '#22301a', '#324422', '#43582a', '#556c32', '#6a823c']);

/** the sun, high in the upper left: the key light */
const SUN_X = 146, SUN_Y = 30;
/** where the far jungle meets the sky */
const HZ = 116;
/** the waterfall's lip on the table mountain's brow */
const WF_X = 318;

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

/** How a surface with this normal takes the sun (upper left, a little in front). */
const sunOn = (nx: number, ny: number, nz: number) => -0.55 * nx - 0.62 * ny + 0.56 * nz;

// ---------------------------------------------------------------------------
// The table mountain and the great stair: one geometry for the painting
// ---------------------------------------------------------------------------

/** The brow of the table mountain: a lower western shoulder, a higher eastern block where the great temple stands, a little ragged. */
const TEP_TOP = (x: number) =>
  57 + (n1(x, 21, 611) - 0.5) * 3 + (n1(x, 6, 612) - 0.5) * 1.2 + clamp((292 - x) / 8, 0, 1) * 4 - clamp((x - 478) / 10, 0, 1) * 5;
/** Its western end: a sheer face, a talus spreading at the foot. */
const TEP_LEFT = (y: number) => 236 - (y - 58) * 0.08 + (n1(y, 8, 613) - 0.5) * 3 - Math.max(0, y - 98) * 0.9;

/** The great stair, from the plateau's temple (far, at the top) down to the foot of the serpent wall (near). */
const ST_TOP = 62, ST_BOT = 133;
const stairV = (y: number) => clamp((y - ST_TOP) / (ST_BOT - ST_TOP), 0, 1);
const stairCx = (y: number) => 552 + 22 * Math.pow(stairV(y), 1.3);
const stairHW = (y: number) => 4 + 30 * Math.pow(stairV(y), 1.5);
const stairBW = (y: number) => 1 + 4 * stairV(y);

// ---------------------------------------------------------------------------
// Tiles: the court's grass, and the serpent wall on the right
// ---------------------------------------------------------------------------

/**
 * Grass in the shade of the canopy: one base field shared by every variant
 * (so any two tiles join), each variant's own patches, moss, blades, flowers,
 * fallen leaves and chips of limestone faded in away from the border.
 */
function grass(o: { patch?: number; tufts?: number; moss?: number; flowers?: number; leaves?: number; chips?: number; shade?: number } = {}): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        let v = 4.8 + (tnoise(x, y, 16, 3) - 0.5) * 0.9 + (tnoise(x, y, 8, 4) - 0.5) * 0.6;
        v += ((tnoise(x, y, 16, seed) - 0.5) * 0.9 + (o.patch ?? 0) * (tnoise(x, y, 8, seed + 1) - 0.5)) * inner(x, y);
        if (hash2(x, y, 7) > 0.9) v += 0.9;
        else if (hash2(x, (y + 31) % TILE, 7) > 0.9) v -= 0.8;
        if (o.shade) v -= o.shade * Math.max(0, 1 - y / 14);
        const moss = (o.moss ?? 0) * inner(x, y) * Math.max(0, tnoise(x, y, 16, seed + 7) - 0.4) * 2.6;
        b.set(x, y, moss > 0 && dith(x, y, Math.min(1, moss)) ? rampDither(MOSS, v - 1.6, x, y) : rampDither(GR, v, x, y));
      }
    }
    const r = rng(seed);
    for (let i = 0; i < (o.tufts ?? 2); i++) tuft(b, 5 + Math.floor(r() * 22), 9 + Math.floor(r() * 18), r);
    for (let i = 0; i < (o.chips ?? 0); i++) chip(b, 5 + Math.floor(r() * 21), 6 + Math.floor(r() * 20), r);
    for (let i = 0; i < (o.leaves ?? 0); i++) {
      const x = 4 + Math.floor(r() * 24), y = 4 + Math.floor(r() * 24);
      const yellow = r() < 0.4;
      b.set(x, y, yellow ? GOLDF[0] : GR[8]);
      b.set(x + 1, y, yellow ? GOLDF[1] : GR[9]);
      b.set(x, y + 1, GR[1]);
    }
    for (let i = 0; i < (o.flowers ?? 0); i++) {
      const x = 4 + Math.floor(r() * 24), y = 5 + Math.floor(r() * 22);
      const k = r();
      b.set(x, y, k < 0.45 ? PETAL[2] : k < 0.75 ? GOLDF[2] : PINK[2]);
      b.set(x, y + 1, GR[2]);
      if (r() < 0.5) b.set(x + 1, y + 1, GR[6]);
    }
  };
}

/** A tuft of blades, lit at the tips, rooted in a small shadow. */
function tuft(b: Bitmap, x: number, y: number, r: () => number) {
  for (let k = -3; k <= 3; k++) {
    const h = 3 + Math.floor(r() * 3) - Math.abs(k) / 2;
    const lean = k * 0.35 - 0.3;
    for (let i = 0; i < h; i++) b.set(Math.round(x + k + lean * (i / h)), y - i, i === h - 1 ? GR[k < 0 ? 9 : 8] : GR[k < 0 ? 7 : 6]);
  }
  for (let k = -3; k <= 3; k++) b.set(x + k, y + 1, GR[2]);
}

/** A chip of limestone fallen from the ruins. */
function chip(b: Bitmap, x: number, y: number, r: () => number) {
  const w = 2 + Math.floor(r() * 2);
  for (let k = 0; k < w; k++) {
    b.set(x + k, y, LIME[k === 0 ? 6 : 5]);
    b.set(x + k, y + 1, LIME[4]);
  }
  for (let k = 0; k <= w; k++) b.set(x + k, y + 2, GR[2]);
}

/** The serpent's relief panel is 30 px tall: rows 15-31 of the upper wall tile and 0-12 of the lower. */
const PANEL_H = 30;
/** The serpent's centre line along the wall, period 64 px (two tiles). */
const serpentY = (g: number) => 14.5 - 6.2 * Math.sin((g / 64) * Math.PI * 2);

/** Whether a point of the panel stands out in relief, and how it takes the light. */
function relief(gx: number, py: number): { raised: boolean; v: number; jade?: boolean } {
  if (py <= 1) return { raised: true, v: py === 0 ? 6.8 : 5.6 };
  if (py >= PANEL_H - 2) return { raised: true, v: py === PANEL_H - 2 ? 5.8 : 4.6 };
  const g = ((gx % 64) + 64) % 64;
  const yc = serpentY(g);
  const slope = serpentY(g + 0.5) - serpentY(g - 0.5);
  const d = py + 0.5 - yc;
  const half = 4.3;
  if (Math.abs(d) < half) {
    // the body: a tube following the curve, lit from the upper left
    const k = d / half;
    const len = Math.hypot(1, slope);
    const ax = -slope / len, ay = 1 / len;
    const nz = Math.sqrt(Math.max(0, 1 - k * k));
    let v = 3.3 + sunOn(ax * k, ay * k, nz) * 3.4;
    // scales in chevrons pointing toward the head; the belly in plates
    if (k > 0.5) {
      if (Math.floor(g) % 3 === 0) v -= 1.2;
    } else if ((g + Math.abs(k) * 2.8) % 5 < 0.9) v -= 1.4;
    return { raised: true, v };
  }
  // feathers along its back, swept toward the tail
  if (d < 0 && d > -half - 3.4) {
    const t = g % 8;
    if (t < 4.2 - (-d - half) * 1.1) return { raised: true, v: 5.8 - t * 0.4, jade: true };
  }
  // carved discs in its loops: on the side away from the body
  for (const mx of [16, 48]) {
    const my = serpentY(mx) < 14.5 ? 22 : 7;
    const r = Math.hypot(g + 0.5 - mx, py + 0.5 - my);
    if (r < 4.4 && (r > 2.9 || r < 1.3)) return { raised: true, v: 5.6 - (g - mx + py - my) * 0.25 };
  }
  return { raised: false, v: 2.7 };
}

/** One pixel of the panel at global wall x `gx`: relief edges lit on the upper left, the sunk ground shadowed under it, old red paint on the ground. */
function panelColor(gx: number, py: number, x: number, y: number): RGBA {
  const c = relief(gx, py);
  if (c.raised) {
    let v = c.v;
    if (!relief(gx - 1, py - 1).raised && py > 1) v += 0.9;
    else if (!relief(gx + 1, py + 1).raised && py < PANEL_H - 2) v -= 0.9;
    if (c.jade && dith(x, y, 0.35 + vnoise(gx, py, 5, 841) * 0.4)) return rampDither(JADE, v - 3.2, x, y);
    return rampDither(LIME, v, x, y);
  }
  // the sunk ground: in shadow under the relief's upper-left edges, old red paint in patches
  const shadowed = relief(gx - 1, py - 1).raised || relief(gx - 2, py - 1).raised;
  const v = shadowed ? 1.6 : c.v + (hash2(gx, py, 842) - 0.5) * 0.5;
  if (!shadowed && vnoise(gx, py, 9, 843) > 0.7) return RED[0];
  return rampDither(LIME, v, x, y);
}

/** Stepped merlons along the wall's top, period 16 px; null in the gaps between them (the stair shows through). */
function merlon(gx: number, y: number): number | null {
  const m = ((gx % 16) + 16) % 16;
  const half = y < 2 ? 2 : y < 5 ? 4 : 6;
  const lx = m - (8 - half);
  if (lx < 0 || lx >= half * 2) return null;
  if (lx === 0) return 7.2;
  if (lx === half * 2 - 1) return 3.4;
  if (y === 0 || y === 2 || y === 5) return 6.6;
  return 5.4 - lx * 0.08;
}

/** The upper wall tile: merlons, the cornice, the top of the serpent's panel. `phase`: 0 or 32, the serpent's half-wave. */
function wallTop(phase: number, o: { vines?: boolean; broken?: boolean; end?: boolean } = {}): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const gx = phase + x;
        if (y < 8) {
          const v = merlon(gx, y);
          if (v === null) continue;
          // a merlon broken off
          if (o.broken && x > 16 && x < 30 && y < 6 - Math.abs(x - 23) * 0.4) continue;
          const mossy = (y === 0 || y === 2 || y === 5) && hash2(gx, y, seed) > 0.8;
          b.set(x, y, mossy ? MOSS[3 + (hash2(gx, 1, seed) > 0.5 ? 1 : 0)] : rampDither(LIME, v + (hash2(x, y, seed) - 0.5) * 0.4, x, y));
          continue;
        }
        if (y < 15) {
          // the cornice: a lit top, a band with dentils, its shadow
          const v = [7.2, 6, 5.4, (gx % 4) === 3 ? 3.8 : 5.4, 2.4, 3.6, 4.2][y - 8];
          const mossy = y === 8 && vnoise(gx, 0, 6, seed) > 0.58;
          b.set(x, y, mossy ? MOSS[3 + (hash2(gx, 2, seed) > 0.5 ? 1 : 0)] : rampDither(LIME, v + (hash2(x, y, seed) - 0.5) * 0.4, x, y));
          continue;
        }
        b.set(x, y, panelColor(gx, y - 15, x, y));
      }
    }
    if (o.broken) {
      // the crack running down from the broken merlon
      line(b, 22, 8, 19, 15, LIME[1]);
      line(b, 19, 15, 21, 31, LIME[1]);
    }
    if (o.vines) vines(b, seed, 10, TILE);
    if (o.end) wallEnd(b, 8);
  };
}

/** The lower wall tile: the bottom of the panel, a ledge, and the sloping base of big blocks with grass at its foot. */
function wallFace(phase: number, o: { vines?: boolean; hole?: boolean; end?: boolean } = {}): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const gx = phase + x;
        if (y < 13) {
          b.set(x, y, panelColor(gx, y + 17, x, y));
          continue;
        }
        if (y < 16) {
          b.set(x, y, rampDither(LIME, [7, 4.8, 2.6][y - 13] + (hash2(x, y, seed) - 0.5) * 0.4, x, y));
          continue;
        }
        // the base: two courses of big blocks, joints on the right and the bottom
        const course = y < 24 ? 0 : 1;
        const cy = y - (course ? 24 : 16);
        const bx = (gx + course * 9 + seed * 5) % 18;
        let v = 5.3 - cy * 0.16 + (hash2(Math.floor((gx + course * 9) / 18), course, seed) - 0.5) * 0.7 + (hash2(x, y, seed) - 0.5) * 0.4;
        if (cy === 0) v += 1.1;
        if (bx === 17 || cy === 7) v = 2.2;
        if (o.hole && course === 1 && x > 8 && x < 22) v = cy < 2 ? 1.2 : 0.8;
        const mossy = cy < 2 && vnoise(gx, y, 5, seed + 3) > 0.55;
        b.set(x, y, mossy ? MOSS[2 + (cy === 0 ? 2 : 1)] : rampDither(LIME, v, x, y));
      }
    }
    if (o.hole) {
      // the fallen block's pieces at the foot
      const r = rng(seed);
      for (let k = 0; k < 4; k++) {
        const cx = 8 + r() * 16, cy = 28 + r() * 2;
        ellipseFill(b, cx, cy, 2 + r() * 2, 1.4, (x, y) => rampDither(LIME, 6 - (x - cx) * 0.5 - (y - cy) * 0.8, x, y));
      }
    }
    footPlants(b, seed);
    if (o.vines) vines(b, seed, 0, 22);
    if (o.end) wallEnd(b, 0);
  };
}

/** The wall's west end, facing the sun: a lit return, its courses marked. */
function wallEnd(b: Bitmap, from: number) {
  for (let y = from; y < TILE; y++) {
    for (let x = 0; x < 3; x++) {
      if (b.get(x + 3, y) === 0 && y < 8) continue;
      b.set(x, y, rampDither(LIME, (y % 8 === 7 ? 4.2 : 5.8) - x * 0.5 + (hash2(x, y, 851) - 0.5) * 0.4, x, y));
    }
    b.set(3, y, LIME[3]);
  }
}

/** Ferns, grass and a flower or two at the foot of the wall. */
function footPlants(b: Bitmap, seed: number) {
  for (let x = 0; x < TILE; x++) {
    const h = 2 + Math.floor(hash2(x, 1, seed) * 3) + (hash2(x >> 2, 2, seed) > 0.6 ? 2 : 0);
    for (let i = 0; i < h; i++) b.set(x, TILE - 1 - i, rampDither(GR, 3 + i * 0.9 + (x % 3 === 0 ? 0.7 : 0), x, TILE - 1 - i));
  }
  const r = rng(seed + 9);
  for (let k = 0; k < 2; k++) {
    const x = 3 + Math.floor(r() * 26);
    if (r() < 0.5) {
      b.set(x, TILE - 6, r() < 0.5 ? PETAL[2] : GOLDF[2]);
      b.set(x, TILE - 5, GR[5]);
    }
  }
}

/** Green vines hanging over the wall from the cornice, leaves along them. */
function vines(b: Bitmap, seed: number, from: number, to: number) {
  const r = rng(seed + 21);
  for (let k = 0; k < 3; k++) {
    let x = 4 + r() * 24;
    const end = to - Math.floor(r() * 6);
    for (let y = from; y < end; y++) {
      x += (r() - 0.5) * 1.4;
      if (x < 0 || x >= TILE) break;
      b.set(Math.round(x), y, LEAF[4]);
      if (r() < 0.35) {
        const lx = Math.round(x + (r() < 0.5 ? -1 : 1));
        b.set(lx, y, LEAF[9 + Math.floor(r() * 3)]);
        b.set(lx, y + 1, LEAF[6]);
      }
    }
  }
}

const P: Record<string, Painter> = {
  // --- the court's grass: plain, mossy, flowering, with fallen leaves; darker at the wall's foot
  grass_a: grass({ tufts: 2 }),
  grass_b: grass({ tufts: 1, chips: 1 }),
  grass_c: grass({ patch: 0.8, tufts: 2, leaves: 2 }),
  grass_d: grass({ patch: 0.6, tufts: 3 }),
  grass_e: grass({ tufts: 1, leaves: 3 }),
  grass_f: grass({ patch: 1, tufts: 2, chips: 2 }),
  moss_a: grass({ moss: 0.9, tufts: 1 }),
  moss_b: grass({ moss: 0.6, patch: 0.5, tufts: 2, leaves: 1 }),
  bloom_a: grass({ tufts: 2, flowers: 4 }),
  bloom_b: grass({ tufts: 1, flowers: 3, leaves: 1 }),
  shade_a: grass({ tufts: 1, shade: 1, moss: 0.4 }),
  shade_b: grass({ patch: 0.6, tufts: 2, shade: 1, flowers: 1 }),
  // --- the serpent wall: the serpent's half-waves A and B alternate along it
  wall_top_a: wallTop(0),
  wall_top_b: wallTop(32),
  wall_top_bv: wallTop(32, { vines: true }),
  wall_top_ab: wallTop(0, { broken: true }),
  wall_top_end: wallTop(0, { end: true }),
  wall_face_a: wallFace(0),
  wall_face_b: wallFace(32),
  wall_face_bv: wallFace(32, { vines: true }),
  wall_face_ah: wallFace(0, { hole: true }),
  wall_face_end: wallFace(0, { end: true }),
};

// ---------------------------------------------------------------------------
// Backdrop: the sky and its clouds, the far mountains, the table mountain with
// its temples, waterfall and the great stair, the jungle, the pyramid in the
// jungle, the colonnade on its terrace and the jungle's edge
// ---------------------------------------------------------------------------

function backdrop(): Bitmap {
  const b = new Bitmap(640, 200);
  sky(b);
  cirrus(b);
  cumulus(b, 404, 66, 156, 48, 501);
  cumulus(b, 610, 32, 74, 16, 502);
  cumulus(b, 40, 100, 116, 20, 503);
  cumulus(b, 222, 84, 62, 14, 504);
  farMountains(b);
  tepui(b);
  waterfall(b);
  stepPyramid(b, 552, 61, { tiers: 5, tierH: 4, w0: 54, w1: 22, tw: 16, th: 8, comb: 7, cw: 10, sw: 8, haze: 0.18, green: 26, seed: 521 });
  stepPyramid(b, 432, 61, { tiers: 3, tierH: 4, w0: 30, w1: 16, tw: 10, th: 6, comb: 5, cw: 6, sw: 4, haze: 0.3, green: 18, seed: 522, broken: true });
  shrine(b, 264, 60);
  rimTrees(b);
  farJungle(b);
  mist(b);
  stepPyramid(b, 188, 128, { tiers: 7, tierH: 6, w0: 92, w1: 26, tw: 18, th: 10, comb: 9, cw: 12, sw: 12, haze: 0.08, green: 70, seed: 523, broken: true });
  emergent(b, 50, 150, 66, 22, 531);
  emergent(b, 626, 140, 84, 16, 532);
  midJungle(b);
  forestTrunks(b);
  greatStair(b);
  stairOvergrowth(b);
  colonnade(b);
  undergrowth(b);
  return b;
}

/** The sky ramp running on into the white-gold round the sun. */
const SKYSUN = [...SKY, ...SUNG];

function sky(b: Bitmap) {
  for (let y = 0; y < 170; y++) {
    for (let x = 0; x < 640; x++) {
      const t = clamp(y / 128, 0, 1);
      const d = Math.hypot((x - SUN_X) * 0.95, (y - SUN_Y) * 1.1);
      const glow = Math.max(0, 1 - d / 210);
      // deepest overhead and away to the right, paling toward the haze over the jungle, white round the sun
      const v = Math.pow(t, 0.9) * 10.6 * (1 - glow * 0.5) + Math.pow(glow, 1.6) * 16 - clamp((x - 300) / 340, 0, 1) * (1 - t) * 1.4;
      b.set(x, y, rampDither(SKYSUN, Math.min(SKYSUN.length - 1, v), x, y));
    }
  }
  // the sun: a white disc in a gold rim
  ellipseFill(b, SUN_X, SUN_Y, 9, 9, (x, y, d) => (d > 0.82 ? SUN[1] : rampDither(SUN, 3.6 - d * 1.2, x, y)));
}

/** Thin streaks of high cloud. */
function cirrus(b: Bitmap) {
  const streaks: [number, number, number, number][] = [[300, 13, 96, 711], [452, 21, 74, 712], [214, 7, 54, 713], [566, 10, 46, 714]];
  for (const [cx, cy, rx, seed] of streaks) {
    for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
      const k = (x - cx) / rx;
      const th = (1 - k * k) * (1.1 + 1.6 * n1(x, 9, seed));
      const mid = cy + (n1(x, 37, seed + 1) - 0.5) * 4 + k * 2;
      for (let y = Math.floor(mid - th); y <= mid + th; y++) {
        if (y < 0) continue;
        const a = 1 - Math.abs(y + 0.5 - mid) / (th + 0.5);
        if (dith(x, y, a * 0.6)) b.set(x, y, rampDither(CLOUD, 4.6 + a * 1.4, x, y));
      }
    }
  }
}

/**
 * A heap of cumulus: puffs along a flat base and piled toward the middle, each
 * shaded as a ball lit from the upper left, the underside in blue shadow.
 */
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

/** Far blue ridges on the left, paling into the haze over the jungle. */
function farMountains(b: Bitmap) {
  const ridge = (x: number) => 94 - n1(x, 54, 601) * 18 - n1(x, 15, 602) * 6 + clamp((x - 170) / 70, 0, 1) * 8;
  for (let x = 0; x < 330; x++) {
    const top = Math.round(ridge(x));
    const slope = ridge(x + 1) - ridge(x - 1);
    for (let y = top; y < 132; y++) {
      const v = 3 - slope * 1.5 + (y === top ? 0.8 : 0) + ((y - top) / 26) * 1.4;
      b.set(x, y, rampDither(FARM, v, x, y));
    }
  }
}

/**
 * The table mountain: a massif with a flat brow and sheer, fluted cliffs, its
 * western end catching the sun, strata and the stains of old rain on its face,
 * jungle along its brow and on its ledges, paling into the haze at its foot.
 */
function tepui(b: Bitmap) {
  // the face: columns of rock side by side, each rounded and lit on its western
  // side, dark gullies between them; some stand forward, some back; their tops
  // make a castellated brow
  const cols: { a: number; c: number; fwd: number; lift: number }[] = [];
  const r0 = rng(613);
  for (let x = 196; x < 660; ) {
    const w = 8 + Math.floor(r0() * 15);
    cols.push({ a: x, c: x + w, fwd: r0(), lift: Math.floor(r0() * 3) });
    x += w;
  }
  for (const col of cols) {
    for (let x = col.a; x < col.c && x < 640; x++) {
      const top = Math.round(TEP_TOP(x)) + (col.fwd < 0.5 ? col.lift : 0);
      const u = ((x + 0.5 - col.a) / (col.c - col.a)) * 2 - 1;
      const lit = sunOn(u * 0.85, 0, Math.sqrt(1 - u * u * 0.72));
      const stain = hash2(x, 0, 617) > 0.92 ? top + 12 + hash2(x, 1, 617) * 34 : 0;
      for (let y = top; y < 134; y++) {
        const left = TEP_LEFT(y);
        if (x < left) continue;
        const fromLeft = x - left;
        let v = 2.9 + lit * 2.6 + (col.fwd - 0.5) * 1.1 + (hash2(x, y >> 1, 618) - 0.5) * 0.45;
        // the gully on its eastern side, deepest in shadow
        if (x === col.c - 1) v -= 1.4;
        else if (x === col.c - 2) v -= 0.5;
        if (fromLeft < 14) v += 1.8 * (1 - fromLeft / 14);
        if (fromLeft < 1.5) v += 1;
        if ((y + Math.floor(col.fwd * 9)) % 13 === 0) v -= 0.5;
        // the sun on the brow, the haze thickening toward the foot
        if (y - top < 8) v += 1 * (1 - (y - top) / 8);
        v += clamp((y - 86) / 34, 0, 1) * 1.7;
        if (y > top + 3 && y < stain) v -= 0.8;
        b.set(x, y, rampDither(TEP, v, x, y));
      }
    }
  }
  // a pillar of rock standing apart from the western end, a tree on its top
  for (let y = 74; y < 134; y++) {
    const half = 5.2 + (y - 74) * 0.05 + (n1(y, 6, 619) - 0.5) * 1.4;
    const cx = 216 + (y - 74) * -0.05;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const u = (x + 0.5 - cx) / half;
      if (Math.abs(u) > 1) continue;
      const v = 3.8 + sunOn(u, 0, Math.sqrt(1 - u * u)) * 2.8 + clamp((y - 90) / 40, 0, 1) * 1.4 + (hash2(x, y >> 2, 620) - 0.5) * 0.5;
      b.set(x, y, rampDither(TEP, v, x, y));
    }
  }
  crown(b, 215, 72, 6, TEPG, 4, 621, 2);
  // green clinging to two ledges across the face, and streamers hanging from the brow
  const r = rng(618);
  for (const [base, seed] of [[80, 619], [97, 620]] as const) {
    for (let x = 200; x < 640; x += 1) {
      if (n1(x, 9, seed) < 0.45) continue;
      const y = base + (n1(x, 40, seed + 1) - 0.5) * 10;
      if (x < TEP_LEFT(y) + 2) continue;
      if (r() < 0.35) {
        const rad = 1 + r() * 1.8;
        ellipseFill(b, x, y, rad, rad * 0.8, (px, py) => rampDither(TEPG, 3.6 - (px - x) / rad - (py - y) / rad + (hash2(px, py, 621) - 0.5), px, py));
      }
    }
  }
  for (let x = 240; x < 640; x++) {
    if (hash2(x, 3, 622) < 0.86) continue;
    const top = Math.round(TEP_TOP(x)), len = 2 + Math.floor(hash2(x, 4, 622) * 8);
    for (let k = 0; k < len; k++) b.set(x, top + 2 + k, TEPG[k < 2 ? 3 : 2]);
  }
}

/** The jungle along the table mountain's brow: small crowns in a fringe, a few taller trees. */
function rimTrees(b: Bitmap) {
  const r = rng(631);
  for (let x = 236; x < 640; x += 2 + r() * 2.5) {
    // keep clear of the temples' fronts and of the waterfall's lip
    if (Math.abs(x - 552) < 26 || Math.abs(x - 432) < 13 || Math.abs(x - WF_X) < 5) continue;
    const top = TEP_TOP(x);
    const rad = 1.6 + r() * 2.2 + (r() < 0.12 ? 2 : 0);
    const cy = top - rad * 0.5 + 0.5;
    ellipseFill(b, x, cy, rad, rad * 0.85, (px, py, d) => (d > 0.85 && !dith(px, py, 0.5) ? 0 : rampDither(TEPG, 4 - ((px - x) / rad) * 1.4 - ((py - cy) / rad) * 1.4 + (hash2(px, py, 632) - 0.5) * 0.8, px, py)));
  }
}

/** The waterfall pouring from the brow, thinning into spray as it falls into the mist. */
function waterfall(b: Bitmap) {
  const top = Math.round(TEP_TOP(WF_X)) - 1;
  // the river's notch in the brow and its glint
  for (let x = WF_X - 4; x <= WF_X + 4; x++) b.set(x, top, WATER[x < WF_X ? 3 : 2]);
  for (let y = top; y < 118; y++) {
    const k = y - top;
    const xc = WF_X + Math.min(2, k * 0.5);
    const half = 1.6 + k / 28;
    for (let x = Math.floor(xc - half - 1); x <= Math.ceil(xc + half); x++) {
      const dx = Math.abs(x + 0.5 - xc);
      if (dx > half) continue;
      if (k > 44 && !dith(x, y, (60 - k) / 16)) continue;
      const streak = hash2(x, Math.floor(y / 3), 641);
      b.set(x, y, rampDither(WATER, 2.6 + (streak - 0.5) * 2 - (dx > half - 1 ? 0.8 : 0) + (k < 3 ? 1 : 0), x, y));
    }
  }
  // a second thread to its right
  for (let y = top + 3; y < 110; y++) if (dith(WF_X + 9, y, 0.7)) b.set(WF_X + 9, y, WATER[y % 3 === 0 ? 3 : 1]);
}

interface Pyramid {
  tiers: number;
  tierH: number;
  w0: number;
  w1: number;
  /** the temple on the summit, its roof comb and the stair */
  tw: number;
  th: number;
  comb: number;
  cw: number;
  sw: number;
  haze: number;
  green: number;
  seed: number;
  broken?: boolean;
}

/**
 * A stepped temple pyramid seen a little from the left: tiers with sunlit
 * ledges and recessed panels, the stair up the front, a temple on the summit
 * with dark doorways under a pierced roof comb, jungle growing on its tiers.
 */
function stepPyramid(b: Bitmap, cx: number, base: number, o: Pyramid) {
  const r = rng(o.seed);
  const val = (v: number) => v * (1 - o.haze) + 4 * o.haze;
  const put = (x: number, y: number, v: number) => b.set(x, y, rampDither(TSTONE, val(v), x, y));
  for (let i = 0; i < o.tiers; i++) {
    const w = o.w0 + ((o.w1 - o.w0) * i) / Math.max(1, o.tiers - 1);
    const xl = Math.round(cx - w / 2), xr = Math.round(cx + w / 2);
    const top = base - (i + 1) * o.tierH, bot = base - i * o.tierH;
    for (let y = top; y < bot; y++) {
      for (let x = xl - 2; x <= xr; x++) {
        const ly = y - top;
        let v: number;
        if (x < xl) v = 6 - (xl - x) * 0.4;
        else {
          v = 4.2 - ((x - xl) / w) * 1.2;
          if (ly === 0) v = 6.2;
          else if (ly === 1) v += 0.4;
          if (ly === o.tierH - 1) v -= 0.9;
          if (o.tierH >= 5 && ly === Math.floor(o.tierH / 2) + 1) v -= 0.6;
        }
        const dx = x + 0.5 - cx;
        if (Math.abs(dx) <= o.sw / 2) {
          v = (base - y) % 2 === 0 ? 6 : 3.8;
          if (Math.abs(dx) > o.sw / 2 - 1) v = x < cx ? 5.4 : 2.8;
        }
        put(x, y, v);
      }
    }
  }
  // the temple on the summit
  const st = base - o.tiers * o.tierH;
  const tl = Math.round(cx - o.tw / 2), tr = Math.round(cx + o.tw / 2);
  for (let y = st - o.th; y < st; y++) {
    for (let x = tl - 1; x <= tr; x++) {
      const ly = y - (st - o.th);
      let v = x < tl ? 5.8 : 4.6 - ((x - tl) / o.tw) * 1.1;
      if (ly === 0) v = 6.2;
      else if (ly === 1) v = 3;
      put(x, y, v);
    }
  }
  const doors = o.tw >= 14 ? [-5, 0, 5] : [0];
  for (const d of doors) {
    for (let y = st - o.th + 3; y < st; y++) {
      const x = Math.round(cx + d);
      b.set(x - 1, y, TSTONE[0]);
      b.set(x, y, TSTONE[0]);
    }
  }
  // the roof comb: a pierced crest letting the sky through
  for (let y = st - o.th - o.comb; y < st - o.th; y++) {
    const ly = y - (st - o.th - o.comb);
    const half = o.cw / 2 - (o.comb - ly) * 0.15;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      if (o.broken && x > cx - 1 && ly < o.comb * 0.7 - (x - cx) * 0.6) continue;
      const edge = x <= cx - half + 1 || x >= cx + half - 1 || ly === 0 || ly === o.comb - 1;
      if (!edge && (x + ly) % 3 === 0) continue;
      put(x, y, x < cx ? 5.6 : 4.2);
    }
  }
  // the jungle taking it back: clumps on the tiers and the odd small tree
  for (let k = 0; k < o.green; k++) {
    const i = Math.floor(r() * o.tiers);
    const w = o.w0 + ((o.w1 - o.w0) * i) / Math.max(1, o.tiers - 1);
    const x = cx + (r() - 0.5) * w;
    const y = base - i * o.tierH - r() * o.tierH;
    if (Math.abs(x - cx) < o.sw / 2 + 1 && r() < 0.75) continue;
    const rad = 1.2 + r() * 2.4 * (o.tierH / 5);
    const tree = r() < 0.18;
    if (tree) for (let t = 1; t < rad * 2.2; t++) b.set(Math.round(x), Math.round(y - t), BARK[2]);
    const cy = tree ? y - rad * 2.2 : y;
    ellipseFill(b, x, cy, rad, rad * 0.8, (px, py, d) => (d > 0.8 && !dith(px, py, 0.5) ? 0 : rampDither(TEPG, val(4.4 - ((px - x) / rad) * 1.2 - ((py - cy) / rad) * 1.2) - 0.6, px, py)));
  }
}

/** A small shrine near the table mountain's western end, roofless, a column beside it. */
function shrine(b: Bitmap, cx: number, base: number) {
  for (let y = base - 9; y < base; y++) {
    for (let x = cx - 6; x <= cx + 6; x++) {
      if (y < base - 6 && x > cx + 1 && y < base - 9 + (x - cx) * 0.6) continue;
      let v = x === cx - 6 ? 5.8 : 4.4 - (x - cx + 6) * 0.1;
      if (y === base - 9) v = 6;
      if (x >= cx - 1 && x <= cx && y > base - 6) v = 0;
      b.set(x, y, v <= 0 ? TSTONE[0] : rampDither(TSTONE, v, x, y));
    }
  }
  for (let y = base - 13; y < base; y++) {
    b.set(cx + 9, y, TSTONE[6]);
    b.set(cx + 10, y, TSTONE[3]);
  }
}

/** Far jungle at the table mountain's foot and along the horizon: small, hazy crowns. */
function farJungle(b: Bitmap) {
  // a base of shadowed canopy down to the court, so no sky shows between the crowns
  for (let y = 112; y < 200; y++) for (let x = 0; x < 640; x++) b.set(x, y, rampDither(JFAR, 1.4 - clamp((y - 150) / 40, 0, 1) + (hash2(x >> 1, y >> 1, 701) - 0.5) * 0.8, x, y));
  const r = rng(702);
  const crowns: [number, number, number][] = [];
  for (let i = 0; i < 360; i++) {
    const x = r() * 660 - 10;
    crowns.push([x, 106 + r() * 13, 3 + r() * 4.6]);
  }
  crowns.sort((a, c) => a[1] - c[1]);
  for (const [x, y, rad] of crowns) crown(b, x, y, rad, JFAR, 3.4 + (y - 106) * 0.06, 703);
}

type Puff = [number, number, number];

/**
 * Leafy masses as heaped puffs: each puff shaded as a ball in the sun (lit on
 * its upper left, its underside in shadow), dark seams where puffs meet, leaf
 * clumps breaking up the light. The canopy, bushes and tree crowns.
 */
function drawPuffs(b: Bitmap, puffs: Puff[], ramp: RGBA[], base: number, contrast: number, seed: number) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y, r] of puffs) {
    x0 = Math.min(x0, x - r);
    y0 = Math.min(y0, y - r);
    x1 = Math.max(x1, x + r);
    y1 = Math.max(y1, y + r);
  }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(b.h - 1, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(b.w - 1, Math.ceil(x1)); x++) {
      let q1 = 0, q2 = 0, bp: Puff | null = null;
      for (const p of puffs) {
        const q = 1 - Math.hypot(x + 0.5 - p[0], (y + 0.5 - p[1]) * 1.12) / p[2];
        if (q > q1) {
          q2 = q1;
          q1 = q;
          bp = p;
        } else if (q > q2) q2 = q;
      }
      if (!bp) continue;
      // a ragged rim of leaves
      if (q1 < 0.1 && !dith(x, y, q1 * 10 * (0.4 + vnoise(x, y, 2, seed) * 0.8))) continue;
      const nx = (x + 0.5 - bp[0]) / bp[2], ny = ((y + 0.5 - bp[1]) * 1.12) / bp[2];
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      let v = base + sunOn(nx, ny, nz) * contrast + (vnoise(x, y, 2.4, seed) - 0.5) * 1.3;
      if (q2 > 0 && q1 - q2 < 0.07) v -= 1.1;
      b.set(x, y, rampDither(ramp, v, x, y));
    }
  }
}

/** One crown of the canopy: a cauliflower of puffs, most of them heaped on its top. */
function crown(b: Bitmap, cx: number, cy: number, rad: number, ramp: RGBA[], base: number, seed: number, contrast = 2.6) {
  const r = rng(seed * 31 + Math.floor(cx * 13 + cy * 7));
  const puffs: Puff[] = [[cx, cy + rad * 0.15, rad * 0.72]];
  const n = 3 + Math.floor(rad / 3);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * Math.PI * 1.5;
    const d = rad * (0.3 + 0.38 * r());
    puffs.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, rad * (0.34 + 0.24 * r())]);
  }
  drawPuffs(b, puffs, ramp, base, contrast, seed);
}

/** Mist lying over the jungle at the mountain's foot in thin broken wisps, and a cloud of spray where the waterfall falls into it. */
function mist(b: Bitmap) {
  const layers: [number, number, number, number][] = [[180, 116, 80, 3], [470, 116, 100, 3], [600, 111, 60, 2], [60, 120, 70, 2], [384, 121, 50, 2]];
  for (const [cx, cy, rx, n] of layers) {
    const r = rng(cx * 7 + cy);
    for (let k = 0; k < n * 3; k++) {
      const y = Math.round(cy + (r() - 0.5) * 8);
      const x0 = cx + (r() - 0.5) * rx * 1.4, len = 14 + r() * rx * 0.6;
      for (let x = Math.floor(x0 - len / 2); x < x0 + len / 2; x++) {
        const t = Math.abs(x - x0) / (len / 2);
        if (n1(x, 4, k + cx) < 0.3 + t * 0.6) continue;
        b.set(x, y, MIST[t < 0.4 ? 3 : 2]);
        if (hash2(x, y, 713) < 0.25) b.set(x, y + 1, MIST[1]);
      }
    }
  }
  const cx = WF_X + 2, cy = 115;
  for (let y = cy - 12; y <= cy + 10; y++) {
    for (let x = cx - 40; x <= cx + 40; x++) {
      const d = Math.hypot((x - cx) / 36, (y - cy) / 10) + (vnoise(x, y * 2, 7, 712) - 0.5) * 0.45;
      if (d >= 1) continue;
      const k = 1 - d;
      if (dith(x, y, Math.min(1, k * 1.6))) b.set(x, y, rampDither(MIST, 1.4 + k * 3.4, x, y));
    }
  }
}

/** A tall tree standing out of the canopy: a pale trunk and a wide, flat crown. */
function emergent(b: Bitmap, x: number, base: number, top: number, crownR: number, seed: number) {
  for (let y = top; y < base; y++) {
    for (let k = -1; k <= 1; k++) b.set(x + k, y, BARK[k < 0 ? 5 : k === 0 ? 4 : 2]);
  }
  line(b, x, top + 10, x - 9, top + 2, BARK[3]);
  line(b, x, top + 8, x + 10, top + 1, BARK[3]);
  const r = rng(seed);
  for (let i = 0; i < 9; i++) {
    const cx = x + (r() - 0.5) * crownR * 1.8, cy = top - 1 + (r() - 0.5) * 6;
    crown(b, cx, cy, 4 + r() * 4, JMID, 6.4, seed + i);
  }
}

/** The jungle around the court: big crowns, deeper and greener than the far canopy. */
function midJungle(b: Bitmap) {
  const r = rng(721);
  const crowns: [number, number, number][] = [];
  for (let i = 0; i < 200; i++) {
    const x = r() * 680 - 20;
    const y = 121 + Math.pow(r(), 0.8) * 52;
    crowns.push([x, y, 6 + r() * 8 + (y - 121) * 0.1]);
  }
  crowns.sort((a, c) => a[1] - c[1]);
  for (const [x, y, rad] of crowns) crown(b, x, y, rad, JMID, 5.2 + (y - 121) * 0.02, Math.floor(x * 7 + y), 3.4);
}

/** Trunks of the jungle round the court on the left, pale and straight, vanishing into the canopy. */
function forestTrunks(b: Bitmap) {
  const trunks: [number, number, number][] = [[14, 122, 5], [66, 128, 3], [104, 118, 4], [146, 126, 3], [184, 130, 4], [212, 124, 3]];
  for (const [x, top, w] of trunks) {
    for (let y = top; y < 192; y++) {
      const lean = Math.sin(y * 0.03 + x) * 1.2;
      for (let k = 0; k < w; k++) {
        const u = (k + 0.5) / w;
        const v = 6.2 - u * 3.8 + (hash2(x + k, y >> 1, 771) - 0.5) * 0.6 - clamp((y - 150) / 40, 0, 1) * 1.2;
        b.set(Math.round(x + k + lean), y, rampDither(BARK, v, x + k, y));
      }
    }
    crown(b, x + w / 2, top - 2, 9 + w, JMID, 5.6, 772, 3.2);
  }
}

/**
 * The great stair: wide where it rises from behind the serpent wall, narrowing
 * as it climbs through the jungle and up the cliff to the temple on the
 * plateau. Sunlit treads and shaded risers, the left balustrade's shadow across
 * the steps, the balustrades carved with scales, hazier toward the top.
 */
function greatStair(b: Bitmap) {
  let phase = 0;
  for (let y = ST_TOP; y < ST_BOT; y++) {
    const v = stairV(y);
    const pitch = 1 + 3.8 * Math.pow(v, 1.3);
    const cx = stairCx(y), hw = stairHW(y), bw = stairBW(y);
    const f = phase - Math.floor(phase);
    const step = Math.floor(phase);
    const haze = 1 - v;
    for (let x = Math.floor(cx - hw - bw); x <= Math.ceil(cx + hw + bw); x++) {
      const dx = x + 0.5 - cx;
      let val: number;
      let green = false;
      if (Math.abs(dx) <= hw) {
        val = f < 0.4 ? 6.4 : 4.6 - (f - 0.4) * 1.6;
        if (dx < -hw + 1 + v * 4) val -= 1.3;
        // worn, broken and overgrown steps, grass in the corners
        if (Math.abs(dx) > hw - 2 - hash2(step, 3, 731) * 6 && hash2(step, dx < 0 ? 1 : 2, 732) > 0.5 && f < 0.6) green = true;
        if (hash2(step, 5, 733) > 0.92 && dx > -hw * 0.2 && dx < hw * 0.5) val -= 2;
      } else {
        const k = (Math.abs(dx) - hw) / bw;
        val = dx < 0 ? 6.8 - k * 1 : 4.4 - k * 1.4;
        if (bw > 2.5 && (y + Math.floor(Math.abs(dx) * 1.5)) % 4 === 0) val -= 0.8;
      }
      if (green) b.set(x, y, rampDither(JMID, 6.4 + (hash2(x, y, 734) - 0.5) * 2, x, y));
      else if (haze > 0.4 && dith(x, y, (haze - 0.4) * 1.5)) b.set(x, y, rampDither(TSTONE, val * 0.85 + 0.6, x, y));
      else b.set(x, y, rampDither(LIME, val, x, y));
    }
    phase += 1 / pitch;
  }
}

/** Crowns leaning over the stair's edges where it climbs through the jungle, and bushes on its steps. */
function stairOvergrowth(b: Bitmap) {
  const r = rng(741);
  for (let y = 98; y < 130; y += 3 + r() * 4) {
    const cx = stairCx(y), hw = stairHW(y) + stairBW(y);
    for (const side of [-1, 1]) {
      if (r() < 0.3) continue;
      const rad = 3 + r() * 5 + stairV(y) * 3;
      crown(b, cx + side * (hw + rad * 0.45), y, rad, JMID, 5.4, 742);
    }
  }
  for (let k = 0; k < 7; k++) {
    const y = 80 + r() * 46, cx = stairCx(y), hw = stairHW(y);
    const x = cx + (r() < 0.5 ? -1 : 1) * hw * (0.6 + r() * 0.35);
    crown(b, x, y, 1.4 + stairV(y) * 3, JMID, 6, 743);
  }
}

/**
 * The colonnade on its terrace in the middle ground: two tiers of coursed
 * blocks (a frieze of steps on the lower one), a stair up the middle, square
 * columns carved with figures (standing, broken, one fallen in drums), a lintel
 * still resting on two of them, two stelae and a reclining figure, and a
 * strangler fig rooted on the terrace's west end.
 */
function colonnade(b: Bitmap) {
  terrace(b, 226, 364, 166, 186, 751, true);
  terrace(b, 238, 352, 154, 166, 752, false);
  // the stair up the middle
  for (let y = 154; y < 186; y++) {
    for (let x = 287; x <= 301; x++) {
      let v = (186 - y) % 3 === 0 ? 7.4 : 5.2;
      if (x === 287) v = 7.6;
      if (x === 301) v = 3.6;
      b.set(x, y, rampDither(LIME, v + (hash2(x, y, 753) - 0.5) * 0.4, x, y));
    }
  }
  // the strangler fig's tree, behind the columns: its crown over the terrace's west end
  for (let y = 110; y < 168; y++) {
    const x = 232 + Math.sin(y * 0.15) * 1.5;
    for (let k = -2; k <= 2; k++) b.set(Math.round(x + k), y, BARK[k < -1 ? 6 : k < 1 ? 4 : 2]);
  }
  for (const [x0, y0, x1, y1] of [[232, 128, 218, 112], [232, 122, 248, 106], [231, 140, 214, 130]] as const) {
    line(b, x0, y0, x1, y1, BARK[3]);
    line(b, x0 + 1, y0, x1 + 1, y1, BARK[5]);
  }
  const r = rng(754);
  for (let i = 0; i < 14; i++) crown(b, 230 + (r() - 0.5) * 40, 104 + (r() - 0.5) * 18, 5 + r() * 5, JMID, 6.2, 755 + i);
  // the columns: x, the height they stand to, whether the capital is still on
  const cols: [number, number, boolean][] = [[246, 124, true], [258, 139, false], [270, 124, true], [282, 124, true], [306, 147, false], [318, 124, true], [330, 132, false], [342, 124, true]];
  for (const [x, top, whole] of cols) column(b, x, 154, top, whole, x);
  // a lintel still lying across two of them
  for (let y = 120; y < 124; y++) for (let x = 267; x <= 286; x++) b.set(x, y, rampDither(LIME, (y === 120 ? 7.8 : 5.6) - (x - 267) * 0.04 - (y === 123 ? 1.2 : 0), x, y));
  // vines up two columns
  for (const cx of [246, 318]) {
    for (let y = 126; y < 154; y++) {
      const x = cx + Math.round(Math.sin(y * 0.55 + cx) * 2.2);
      b.set(x, y, LEAF[6]);
      if (y % 3 === 0) b.set(x + 1, y, LEAF[10]);
    }
  }
  // the fallen column's drums on the upper tier
  for (const [x, y] of [[310, 151], [318, 152], [326, 151]] as const) {
    ellipseFill(b, x, y, 3.6, 2.6, (px, py) => rampDither(LIME, 6.6 - (px - x) * 0.4 - (py - y) * 0.7, px, py));
    ellipseFill(b, x - 2.4, y, 1.2, 2.4, (px, py) => rampDither(LIME, 7.6 - (py - y) * 0.5, px, py));
  }
  // two stelae on the lower tier, flanking the stair, carved with a standing figure; one leans
  stela(b, 268, 166, 0);
  stela(b, 322, 166, 0.12);
  seatedIdol(b, 243, 166);
  // the reclining figure at the head of the stair, a bowl on its belly
  polyFill(b, [[287, 153], [290, 148], [293, 151], [297, 147], [301, 153]], (x, y) => rampDither(LIME, 7 - (x - 287) * 0.12 - (y - 147) * 0.2, x, y));
  ellipseFill(b, 295, 150, 2, 1.2, () => LIME[8]);
  ellipseFill(b, 288, 148, 1.6, 1.8, (x, y) => rampDither(LIME, 7.2 - (x - 288) * 0.4, x, y));
  // the fig's roots over the terrace's west end
  for (let k = 0; k < 6; k++) {
    let x = 226 + k * 3, y = 150;
    for (let i = 0; i < 34; i++) {
      x += Math.sin(i * 0.4 + k) * 0.7 - 0.15;
      y += 1;
      b.set(Math.round(x), y, BARK[k % 2 ? 3 : 4]);
    }
  }
}

/** One tier of the terrace: its sunlit top, its west end in the sun, a face of coursed blocks; `frieze` carves a band of steps. */
function terrace(b: Bitmap, x0: number, x1: number, top: number, bottom: number, seed: number, frieze: boolean) {
  for (let y = top - 2; y < bottom; y++) {
    for (let x = x0 - 3; x < x1; x++) {
      let v: number;
      if (y < top) {
        if (x < x0) continue;
        v = 7.4 - (top - y) * 0.7 + (hash2(x, y, seed) - 0.5) * 0.6;
        if (vnoise(x, y, 6, seed) > 0.62) {
          b.set(x, y, rampDither(MOSS, 4.2 + (hash2(x, y, seed + 1) - 0.5), x, y));
          continue;
        }
      } else if (x < x0) {
        v = 8 - (x0 - x) * 0.5 - ((y - top) % 5 === 4 ? 1.4 : 0);
      } else {
        const ly = y - top;
        const course = Math.floor(ly / 5);
        const joint = ly % 5 === 4 || (x + course * 4) % 11 === 10;
        v = 5.6 - (joint ? 1.8 : 0) + (ly % 5 === 0 ? 0.9 : 0) + (hash2(Math.floor((x + course * 4) / 11), course, seed) - 0.5) * 0.8 - (x - x0) / (x1 - x0) * 0.6;
        if (frieze && ly >= 6 && ly <= 10) {
          // the frieze: a band of stepped frets
          const m = (x - x0) % 12, my = ly - 6;
          const raised = my === 0 || my === 4 || (m < 6 ? m === my || m === my + 1 : 11 - m === my);
          v = raised ? 7 : 3.4;
        }
      }
      b.set(x, y, rampDither(LIME, v, x, y));
    }
  }
}

/** A square column carved with a figure, lit from the left; `whole` keeps its capital, else its top is broken. */
function column(b: Bitmap, x: number, base: number, top: number, whole: boolean, seed: number) {
  for (let y = base - 2; y < base; y++) for (let k = -3; k <= 3; k++) b.set(x + k, y, rampDither(LIME, (y === base - 2 ? 7.6 : 5.4) - k * 0.2, x + k, y));
  for (let y = top + (whole ? 3 : 0); y < base - 2; y++) {
    if (!whole && y < top + 3 && hash2(x, y, seed) > 0.5 - (y - top) * 0.2) continue;
    for (let k = -2; k <= 2; k++) {
      let v = k === -2 ? 7.8 : k === 2 ? 3.6 : 6 - k * 0.5;
      if (k === 0 && (y - top) % 5 === 2) v -= 1.4;
      if (k === -1 && (y - top) % 7 === 4) v -= 1;
      b.set(x + k, y, rampDither(LIME, v + (hash2(x + k, y, seed) - 0.5) * 0.4, x + k, y));
    }
  }
  if (whole) {
    for (let y = top; y < top + 3; y++) for (let k = -3; k <= 3; k++) b.set(x + k, y, rampDither(LIME, (y === top ? 8 : y === top + 2 ? 4.2 : 6) - k * 0.25, x + k, y));
  }
  // its shadow on the terrace's top, to the lower right
  for (let k = 3; k < 6; k++) b.set(x + k, base - 1, LIME[3]);
}

/** A small seated idol: a squat body under a big head, its hands on its knees. */
function seatedIdol(b: Bitmap, x: number, base: number) {
  const rows = ['.HHHH.', 'HHHHHH', 'HFHHFH', '.HHHH.', 'BBBBBB', 'BKBBKB', 'BBBBBB', 'PPPPPP'];
  rows.forEach((row, ly) => [...row].forEach((ch, lx) => {
    if (ch === '.') return;
    const px = x - 3 + lx, py = base - rows.length + ly;
    let v = (ch === 'P' ? 5 : 6.2) - lx * 0.4;
    if (ch === 'F' || ch === 'K') v -= 1.6;
    if (lx === 0 || row[lx - 1] === '.') v += 1;
    b.set(px, py, rampDither(LIME, v, px, py));
  }));
}

/** A stela: a standing slab with a rounded top, carved with a figure in a headdress. */
function stela(b: Bitmap, x: number, base: number, lean: number) {
  for (let y = base - 15; y < base; y++) {
    const ly = y - (base - 15);
    const sx = Math.round(x + (base - y) * lean);
    for (let k = -3; k <= 3; k++) {
      if (ly === 0 && Math.abs(k) > 1) continue;
      if (ly === 1 && Math.abs(k) > 2) continue;
      let v = k === -3 ? 7.8 : k === 3 ? 3.6 : 6.2 - k * 0.3;
      // the figure: a headdress, a face, a body holding a staff
      const fy = ly - 3, fx = k;
      if ((fy === 0 && Math.abs(fx) <= 2) || (fy === 2 && fx === 0) || (fy > 3 && fy < 10 && Math.abs(fx) === 1) || (fy > 3 && fx === 2)) v -= 1.6;
      b.set(sx + k, y, rampDither(LIME, v, sx + k, y));
    }
  }
}

/** The jungle's edge round the court: palms and broad leaves on the left, grass running back under the terrace. */
function undergrowth(b: Bitmap) {
  for (let y = 182; y < 200; y++) {
    for (let x = 0; x < 640; x++) {
      if (x >= 226 && x < 364 && y < 186) continue;
      b.set(x, y, rampDither(GR, 3.6 + (y - 182) * 0.05 + (hash2(x, y, 761) - 0.5) * 1.2, x, y));
    }
  }
  const r = rng(762);
  // broad leaves and palm fronds, from the back of the jungle's edge to its front
  for (let i = 0; i < 46; i++) {
    const x = r() * 236 - 8 + (r() < 0.25 ? 140 + r() * 100 : 0);
    if (x > 226 && x < 364) continue;
    const y = 160 + r() * 30;
    if (r() < 0.45) frond(b, x, y + 8, -Math.PI / 2 + (r() - 0.5) * 2.2, 10 + r() * 14, 5 + (y - 160) * 0.05);
    else broadLeaf(b, x, y, (r() - 0.5) * 1.8 - Math.PI / 2, 8 + r() * 9, 4 + r() * 3, 4.6 + (y - 160) * 0.05);
  }
  // grass and ferns at the foot of the terrace
  for (let x = 226; x < 364; x += 3 + r() * 5) frond(b, x, 190, -Math.PI / 2 + (r() - 0.5) * 1.6, 5 + r() * 6, 5.2);
}

/** A palm frond or fern: a curving stalk with leaflets on both sides, shortening toward the tip. */
function frond(b: Bitmap, x0: number, y0: number, ang: number, len: number, tone: number, ramp: RGBA[] = JMID) {
  const droop = 0.04;
  let x = x0, y = y0, a = ang;
  for (let i = 0; i < len; i++) {
    a += droop * (Math.cos(a) > 0 ? 1 : -1);
    x += Math.cos(a);
    y += Math.sin(a);
    b.set(Math.round(x), Math.round(y), ramp[Math.max(0, Math.round(tone - 2))]);
    if (i % 2 === 0) {
      const l = Math.sin((Math.PI * (i + 2)) / (len + 2)) * len * 0.32;
      for (const s of [-1, 1]) {
        const la = a + s * 1.15;
        for (let k = 1; k < l; k++) {
          const px = Math.round(x + Math.cos(la) * k), py = Math.round(y + Math.sin(la) * k + k * 0.25);
          b.set(px, py, rampDither(ramp, tone + (s < 0 ? 1.2 : -0.2) - k * 0.1, px, py));
        }
      }
    }
  }
}

/** A broad leaf on its stalk: pointed, a midrib, lit on the side toward the sun. */
function broadLeaf(b: Bitmap, x0: number, y0: number, ang: number, len: number, wid: number, tone: number, ramp: RGBA[] = JMID) {
  leafShape(b, x0, y0, ang, len, wid, (t, s, x, y) => rampDither(ramp, tone + (s < 0 ? 1.4 : -0.4) - t * 0.6 - (Math.abs(s) < 0.14 ? 1.2 : 0), x, y));
}

/**
 * A pointed leaf from its stem at (sx, sy) along `ang`: `shade(t, s)` colors
 * each pixel by its place along the leaf (t, 0 at the stem) and across it (s, -1..1).
 */
function leafShape(b: Bitmap, sx: number, sy: number, ang: number, len: number, wid: number, shade: (t: number, s: number, x: number, y: number) => RGBA | 0) {
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const R0 = Math.ceil(len + wid);
  for (let y = Math.floor(sy - R0); y <= sy + R0; y++) {
    for (let x = Math.floor(sx - R0); x <= sx + R0; x++) {
      const dx = x + 0.5 - sx, dy = y + 0.5 - sy;
      const t = (dx * ux + dy * uy) / len;
      if (t < 0 || t > 1) continue;
      const half = (wid / 2) * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.9);
      const s = (dx * -uy + dy * ux) / Math.max(0.01, half);
      if (Math.abs(s) > 1) continue;
      const c = shade(t, s, x, y);
      if (c) b.set(x, y, c);
    }
  }
}

// ---------------------------------------------------------------------------
// The far layer: drifting clouds, the waterfall's water and mist, the great tree behind the wall
// ---------------------------------------------------------------------------

/** A small cloud that drifts across the sky (PropKind.drift). */
function cloudPuff(w: number, h: number, seed: number): Bitmap {
  const b = new Bitmap(w + 8, h + 10);
  cumulus(b, (w + 8) / 2, h + 8, w, h, seed);
  return b;
}

/** The waterfall's water: streaks running down, a whole period every loop. */
function fallingWater(n = 12): Bitmap[] {
  const top = Math.round(TEP_TOP(WF_X)) - 1;
  const W = 14, HH = 118 - top;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    for (let k = 0; k < HH; k++) {
      const xc = 6 + Math.min(2, k * 0.5);
      const half = 1.6 + k / 28;
      for (let x = 0; x < W; x++) {
        const dx = Math.abs(x + 0.5 - xc);
        if (dx > half) continue;
        if (k > 44 && !dith(x, k, (60 - k) / 16)) continue;
        // the streaks move 2 px a frame: 24 px a loop, the pattern's period
        const row = Math.floor((((k - i * 2) % 24) + 24) % 24 / 3);
        const streak = hash2(x, row, 651);
        b.set(x, k, rampDither(WATER, 2.6 + (streak - 0.5) * 2.2 - (dx > half - 1 ? 0.8 : 0) + (k < 3 ? 1 : 0), x, k));
      }
    }
    out.push(b);
  }
  return out;
}

/** The mist at the waterfall's foot: thin, then thicker (a slow breath). */
function fallMist(thick: boolean): Bitmap {
  const W = 90, HH = 30;
  const b = new Bitmap(W, HH);
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - 45) / 44, (y - 18) / 13) + (vnoise(x, y, 6, thick ? 661 : 662) - 0.5) * 0.4;
      if (d > 1) continue;
      if (!dith(x, y, (1 - d) * (thick ? 0.85 : 0.45))) continue;
      b.set(x, y, withAlpha(MIST[2 + (d < 0.5 ? 2 : 1)], 200));
    }
  }
  return b;
}

/**
 * The great tree behind the wall, left of the stair: a pale trunk with
 * buttresses rising out of the jungle, limbs and a wide crown of leaf clumps,
 * lianas hanging from it. Frames stir the crown's clumps, each on its own phase.
 */
function greatTree(n = 6): Bitmap[] {
  const W = 132, HH = 100, tx = 64;
  const r0 = rng(671);
  // the crown: a wide umbrella of leaf clumps, heaped higher toward its middle
  const clumps = Array.from({ length: 22 }, (_, k) => {
    const u = (k / 21) * 2 - 1 + (r0() - 0.5) * 0.12;
    const x = tx + u * 42, y = 32 - (1 - u * u) * 13 + (r0() - 0.5) * 7;
    return [x, y, 8 + r0() * 5 + (1 - Math.abs(u)) * 3] as const;
  });
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    const ph = (i / n) * Math.PI * 2;
    const limb = (x0: number, y0: number, x1: number, y1: number, rad: number) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      for (let k = 0; k <= len; k++) {
        const t = k / len, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, rr = rad * (1 - t * 0.45);
        for (let a = -rr; a <= rr; a++) {
          const px = Math.round(x + a), py = Math.round(y);
          b.set(px, py, rampDither(BARK, 6.6 - ((a + rr) / (rr * 2 + 0.1)) * 3.8, px, py));
        }
      }
    };
    limb(tx, HH - 1, tx - 1, 46, 5.5);
    limb(tx - 1, 52, tx - 28, 36, 2.8);
    limb(tx - 1, 50, tx + 30, 34, 2.8);
    limb(tx - 1, 48, tx + 4, 24, 2.2);
    // the crown's clumps, the outer ones stirring a pixel in the wind, each on its own phase
    const puffs: Puff[] = clumps.map(([x, y, rad]) => [x + Math.round(Math.sin(ph + x * 0.11) * Math.min(1, Math.abs(x - tx) / 40)), y, rad]);
    drawPuffs(b, puffs, JMID, 6.5, 3.4, 672);
    // lianas hanging from the limbs
    for (const [lx, ly, len] of [[tx - 22, 42, 26], [tx + 20, 40, 32], [tx + 8, 44, 20]] as const) {
      for (let k = 0; k < len; k++) b.set(Math.round(lx + Math.sin(ph + k * 0.12) * (k / len) * 1.4), ly + k, k % 5 === 0 ? LEAF[8] : BARK[2]);
    }
    out.push(outline(b, JMID[0]));
  }
  return out;
}

// ---------------------------------------------------------------------------
// The statues: drawn with the champion renderer so they share its light
// ---------------------------------------------------------------------------

const v2 = (x: number, y: number): V => ({ x, y });

/** Scales on a carved serpent: a diamond lattice cut into the stone. */
const scales = (_h: Hit, x: number, y: number) => ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0 ? -1 : 0);

/** Moss on the upward faces of a carving, and a few tufts on its top edge. */
function mossOver(b: Bitmap, seed: number, amount = 0.5) {
  const out = b.clone();
  for (let y = 1; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      if (b.get(x, y) === 0 || b.get(x, y - 1) !== 0) continue;
      if (vnoise(x, y, 5, seed) < 1 - amount) continue;
      out.set(x, y, MOSS[4 + (hash2(x, y, seed) > 0.5 ? 1 : 0)]);
      if (b.get(x, y + 1) !== 0 && hash2(x, y, seed + 1) > 0.4) out.set(x, y + 1, MOSS[2]);
      if (hash2(x, y, seed + 2) > 0.85 && y > 1) out.set(x, y - 1, GR[7]);
    }
  }
  return out;
}

/**
 * The serpent's great head at the wall's west end, resting on the ground with
 * its jaws open toward the court: fangs, a forked tongue lolling out, a heavy
 * brow over its eye, a curled nostril, a crest of plumes swept back over its
 * neck, and the neck rising behind into the carved body along the wall.
 * Limestone with moss on its upper faces, the last of the red on its tongue
 * and of the green on its plumes.
 */
function serpentHead(): Bitmap {
  const W = 96, HH = 82, o = 8;
  const f = new Frame(W, HH);
  const p = (x: number, y: number) => v2(x + o, y);
  const C = p(62, 36);
  // the body running back from the collar into the wall's panel
  f.add(new Ribbon({ mat: M_LIME, z: 0.5, group: 'neck', tex: scales }, [p(66, 38), p(76, 39), p(88, 40)], [9, 8.5, 8]));
  // the collar of feathers the head comes out of: petals round a ring, each with its rib
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + 0.1;
    f.add(new Ellipse({ mat: M_PLUME, z: 1 + (Math.sin(a) > 0 ? 0.02 : 0), group: `petal${k}`, tex: (h) => (Math.abs(h.u - 0.5) < 0.13 ? -1 : 0), line: 'soft' }, v2(C.x + Math.cos(a) * 20, C.y + Math.sin(a) * 18), 7, 3.8, a));
  }
  f.add(new Ellipse({ mat: M_LIME, z: 1.2, group: 'ring', shade: -1 }, C, 15, 14, 0, 0.5));
  // the mouth's dark inside, then the jaws round it
  f.add(new Poly({ mat: M_DARK, z: 2, group: 'maw', line: 'none' }, [p(6, 40), p(40, 40), p(56, 46), p(54, 53), p(30, 57), p(8, 59)], { kind: 'flat', n: [0, 0, 1] }));
  // the upper jaw: a long blocky snout
  f.add(new Poly({ mat: M_LIME, z: 3, group: 'head', tex: (h, x, y) => (h.ny < -0.3 ? scales(h, x, y) : 0) }, [p(66, 22), p(46, 18), p(30, 21), p(18, 26), p(9, 28), p(4, 26), p(2, 31), p(4, 37), p(8, 41), p(22, 42), p(38, 41), p(52, 44), p(66, 45), p(70, 33)], { kind: 'bevel', w: 4, k: 1.3 }));
  // the lip band along the upper jaw
  f.add(new Capsule({ mat: M_LIME, z: 3.2, group: 'lip', line: 'soft' }, p(7, 39.5), p(54, 43), 1.7, 1.9, 0.4));
  // the lower jaw, open, resting on the ground
  f.add(new Poly({ mat: M_LIME, z: 2.5, group: 'jaw' }, [p(58, 50), p(42, 54), p(24, 57), p(10, 59), p(3, 63), p(4, 70), p(12, 74), p(36, 74), p(54, 70), p(62, 60)], { kind: 'bevel', w: 3, k: 1.2 }));
  f.add(new Capsule({ mat: M_LIME, z: 2.7, group: 'lowlip', line: 'soft' }, p(9, 59.5), p(54, 52.5), 1.5, 1.7, 0.4));
  // rows of teeth, and two great fangs at the front of each jaw
  const tooth: { x: number; y: number; c: RGBA }[] = [];
  for (let x = 12; x < 44; x += 3) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) tooth.push({ x: x + dx + o, y: 42 + dy, c: M_LIME.ramp[4] });
  for (let x = 14; x < 44; x += 3) for (const [dx, dy] of [[0, 0], [1, 0], [1, -1]]) tooth.push({ x: x + dx + o, y: 57 + dy, c: M_LIME.ramp[3] });
  f.add(new Pixels({ mat: M_LIME, z: 3.3, group: 'teeth' }, tooth));
  for (const pts of [[p(6, 40), p(11, 40), p(9, 50)], [p(17, 41), p(21, 41), p(19, 48)], [p(10, 59), p(14, 59), p(12, 52)]]) {
    f.add(new Poly({ mat: M_LIME, z: 3.4, group: 'fang', line: 'soft' }, pts, { kind: 'flat', n: [-0.35, -0.35, 0.87] }));
  }
  // the forked tongue lolling out onto the ground
  f.add(new Ribbon({ mat: M_RED, z: 2.8, group: 'tongue' }, [p(36, 56), p(24, 60), p(12, 65), p(2, 71), p(-4, 73)], [2.6, 2.4, 2.1, 1.7, 1.3]));
  f.add(new Capsule({ mat: M_RED, z: 2.8, group: 'tongue' }, p(-4, 73), p(-8, 70), 1.2, 0.8));
  f.add(new Capsule({ mat: M_RED, z: 2.8, group: 'tongue' }, p(-4, 73), p(-8, 76), 1.2, 0.8));
  // the scroll curling up from the snout, the square brow over a round eye
  f.add(new Ribbon({ mat: M_LIME, z: 4, group: 'scroll' }, [p(10, 28), p(9, 22), p(13, 18), p(18, 19), p(18, 23), p(15, 24)], [2.4, 2.4, 2.2, 2, 1.6, 1.3]));
  f.add(new Ellipse({ mat: M_LIME, z: 3.8, group: 'eyering', shade: -1 }, p(38, 31), 6.6, 5.8));
  f.add(new Ellipse({ mat: M_LIME, z: 4, group: 'eye' }, p(38, 31), 4.6, 4));
  f.add(new Poly({ mat: M_LIME, z: 4.5, group: 'brow' }, [p(29, 21), p(48, 20), p(49, 25), p(30, 26)], { kind: 'bevel', w: 2, k: 1.4 }));
  f.add(new Pixels({ mat: M_DARK, z: 4.6, group: 'pupil' }, [[38, 30], [39, 30], [38, 31], [39, 31], [38, 32]].map(([x, y]) => ({ x: x + o, y, c: M_DARK.ramp[1] }))));
  f.add(new Pixels({ mat: M_DARK, z: 4.6, group: 'nostril' }, [[7, 32], [8, 32], [8, 33]].map(([x, y]) => ({ x: x + o, y, c: M_LIME.ramp[1] }))));
  let b = f.render();
  b = mossOver(b, 861, 0.45);
  // its weight on the ground: a dark band under the lower jaw
  for (let x = 6; x < 70; x++) for (let y = 75; y < 78; y++) if (b.get(x, y) === 0 && dith(x, y, 0.7 - (y - 75) * 0.2)) b.set(x, y, withAlpha(GR[0], 170));
  return b;
}

/** Spots carved over a jaguar's stone coat. */
const spots = (_h: Hit, x: number, y: number) => (hash2(x >> 1, y >> 1, 962) > 0.74 ? -1 : 0);

/**
 * A stone jaguar lying on its plinth before the serpent wall's eastern end,
 * its head raised over the court, forepaws stretched out, its tail curling up
 * at the end; its coat carved with spots, moss on its back.
 */
function jaguarStatue(): Bitmap {
  const W = 58, HH = 44;
  const f = new Frame(W, HH);
  // the plinth
  f.add(new Poly({ mat: M_LIME, z: 0, group: 'plinth' }, [v2(3, 31), v2(55, 31), v2(55, 43), v2(3, 43)], { kind: 'bevel', w: 2, k: 1.4 }));
  // the tail along the plinth's top, its tip curling up
  f.add(new Ribbon({ mat: M_LIME, z: 0.5, group: 'tail' }, [v2(44, 28), v2(50, 29), v2(54, 26), v2(54, 21), v2(51, 19)], [2.2, 2, 1.8, 1.6, 1.3]));
  // the far foreleg, the body, the haunch, the near foreleg and its paw
  f.add(new Capsule({ mat: M_LIME, z: 0.8, group: 'farleg', shade: -1 }, v2(17, 27), v2(9, 29), 2.4, 2.2));
  f.add(new Ellipse({ mat: M_LIME, z: 1, group: 'body', tex: spots }, v2(29, 24), 16, 7));
  f.add(new Ellipse({ mat: M_LIME, z: 1.4, group: 'body', tex: spots }, v2(40, 23), 8, 7.5));
  f.add(new Capsule({ mat: M_LIME, z: 2, group: 'leg' }, v2(18, 28), v2(6, 30), 2.8, 2.4));
  f.add(new Ellipse({ mat: M_LIME, z: 2.1, group: 'paw' }, v2(5, 30), 3.2, 1.8));
  // the chest and the head held up, looking out over the court
  f.add(new Ellipse({ mat: M_LIME, z: 2.5, group: 'chest', tex: spots }, v2(17, 22), 6, 7));
  f.add(new Poly({ mat: M_LIME, z: 3, group: 'earB' }, [v2(15, 9), v2(19, 6), v2(19, 11)], { kind: 'bevel', w: 1 }));
  f.add(new Poly({ mat: M_LIME, z: 3.6, group: 'earF' }, [v2(10, 9), v2(12, 5), v2(14, 9)], { kind: 'bevel', w: 1 }));
  f.add(new Ellipse({ mat: M_LIME, z: 3.4, group: 'head', tex: spots }, v2(13, 13), 6, 5));
  f.add(new Ellipse({ mat: M_LIME, z: 3.8, group: 'muzzle' }, v2(8, 15), 3.6, 2.8));
  f.add(new Pixels({ mat: M_DARK, z: 4, group: 'face' }, [[10, 11], [11, 11], [5, 14], [6, 14], [6, 17], [7, 17], [8, 17]].map(([x, y]) => ({ x, y, c: M_LIME.ramp[1] }))));
  return mossOver(f.render(), 961, 0.5);
}

/**
 * A colossal stone head sinking into the earth: a rounded helmet with a carved
 * band, closed eyes under a heavy brow, a broad nose and thick lips, discs in
 * its ears; tilted, its chin under the ground, a root of the great tree
 * clutching over its crown, moss on top.
 */
function colossalHead(): Bitmap {
  const S = 1.3;
  const W = Math.round(68 * S), HH = Math.round(62 * S);
  const f = new Frame(W, HH);
  const tilt = 0.12, ox = 33, oy = 40;
  const q = (x: number, y: number) => v2(x * S, y * S);
  const p = (x: number, y: number) => {
    const dx = x - ox, dy = y - oy;
    return q(ox + dx * Math.cos(tilt) - dy * Math.sin(tilt), oy + dx * Math.sin(tilt) + dy * Math.cos(tilt));
  };
  const px = (x: number, y: number, c: RGBA) => ({ ...p(x, y), c });
  // ear discs, the helmet, the face
  f.add(new Ellipse({ mat: M_LIME, z: 0.5, group: 'earL' }, p(10, 38), 4 * S, 5.4 * S, tilt));
  f.add(new Ellipse({ mat: M_LIME, z: 0.5, group: 'earR' }, p(56, 38), 4 * S, 5.4 * S, tilt));
  f.add(new Ellipse({ mat: M_LIME, z: 1, group: 'helmet', tex: (h) => (h.u > 0.36 && h.u < 0.46 ? 1 : h.u > 0.46 && h.u < 0.5 ? -1 : 0) }, p(33, 26), 24 * S, 21 * S, tilt));
  f.add(new Poly({ mat: M_LIME, z: 2, group: 'face' }, [p(14, 26), p(52, 26), p(53, 40), p(47, 55), p(19, 55), p(13, 40)], { kind: 'bevel', w: 5 * S, k: 1.1 }));
  f.add(new Capsule({ mat: M_LIME, z: 3, group: 'brow' }, p(18, 31), p(48, 31), 2.2 * S, 2.2 * S, 0.3));
  for (const ex of [25, 41]) {
    f.add(new Ellipse({ mat: M_LIME, z: 3, group: `lid${ex}` }, p(ex, 36), 5 * S, 2.4 * S, tilt));
    f.add(new Pixels({ mat: M_DARK, z: 3.5, group: 'lash' }, [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((k) => px(ex + k * 0.8, 37.6, M_LIME.ramp[1]))));
  }
  f.add(new Poly({ mat: M_LIME, z: 3.2, group: 'nose' }, [p(31, 33), p(35, 33), p(39, 44), p(27, 44)], { kind: 'bevel', w: 3 * S, k: 1.3 }));
  f.add(new Ellipse({ mat: M_LIME, z: 3, group: 'lips' }, p(33, 50), 8.5 * S, 3.4 * S, tilt));
  f.add(new Pixels({ mat: M_DARK, z: 3.5, group: 'mouth' }, [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map((k) => px(33 + k * 0.8, 50, M_LIME.ramp[1]))));
  for (const ex of [10, 56]) f.add(new Pixels({ mat: M_DARK, z: 0.6, group: 'earhole' }, [37.6, 38.6, 39.6].map((y) => px(ex, y, M_LIME.ramp[1]))));
  // a root clutching over the crown and down its side, a thinner one across the brow band
  f.add(new Ribbon({ mat: M_BARK, z: 5, group: 'root' }, [q(-2, 14), q(12, 5), q(30, 2), q(48, 6), q(58, 16), q(61, 30), q(64, 44)], [3.6, 3.4, 3, 2.8, 2.6, 2.2, 2].map((r) => r * S)));
  f.add(new Ribbon({ mat: M_BARK, z: 5, group: 'root2' }, [q(14, 6), q(20, 14), q(30, 19), q(40, 18)], [1.6, 1.4, 1.2, 1].map((r) => r * S)));
  // the earth heaped where it has sunk
  f.add(new Poly({ mat: M_EARTH, z: 6, group: 'earth' }, [q(-2, 62), q(-2, 54), q(8, 50), q(20, 55), q(34, 54), q(48, 56), q(58, 50), q(70, 54), q(70, 62)], { kind: 'bevel', w: 2 }));
  let b = f.render();
  b = mossOver(b, 871, 0.6);
  return b;
}

/**
 * A broken column of drums near the colossal head: round and fluted, lit from
 * the left, snapped off high up, a strangler's roots wrapped round it, a liana
 * and moss.
 */
function brokenColumn(): Bitmap {
  const W = 30, HH = 112, cx = 15, base = HH - 1;
  const b = new Bitmap(W, HH);
  const top = 14;
  for (let y = top; y <= base; y++) {
    const plinth = y > base - 8;
    const capital = false;
    const rad = plinth ? 12 : 8.5;
    for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
      const u = (x + 0.5 - cx) / rad;
      if (Math.abs(u) > 1) continue;
      // the broken top: jagged
      if (y < top + 6 && y < top + 6 - (n1(x, 3, 881) * 9 - 2)) continue;
      const nz = Math.sqrt(1 - u * u);
      let v = 3.4 + sunOn(u, 0, nz) * 4.6;
      if (!plinth && !capital && Math.round((u + 1) * 4.5) % 2 === 1) v -= 0.8; // flutes
      if (!plinth && (y - top) % 18 === 17) v = 1.6; // the joints between drums
      if (plinth && y === base - 7) v += 1.6;
      b.set(x, y, rampDither(LIME, v + (hash2(x, y, 882) - 0.5) * 0.5, x, y));
    }
  }
  // the strangler's roots winding round it, and a liana
  for (let k = 0; k < 4; k++) {
    for (let y = top + 10 + k * 6; y < base - 4; y++) {
      const x = cx + Math.sin((y + k * 9) * 0.16) * 9;
      const front = Math.cos((y + k * 9) * 0.16) > 0;
      if (!front) continue;
      b.set(Math.round(x), y, BARK[k % 2 ? 3 : 4]);
      b.set(Math.round(x) + 1, y, BARK[2]);
    }
  }
  return mossOver(outline(b, LIME[0]), 883, 0.55);
}

/** The stump of a column on the right with its capital fallen at its foot. */
function columnStump(): Bitmap {
  const W = 44, HH = 46, cx = 14, base = HH - 2;
  const b = new Bitmap(W, HH);
  for (let y = 8; y <= base; y++) {
    const rad = y > base - 5 ? 11 : 8;
    for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
      const u = (x + 0.5 - cx) / rad;
      if (Math.abs(u) > 1) continue;
      if (y < 14 && y < 14 - (n1(x, 3, 891) * 8 - 1)) continue;
      const nz = Math.sqrt(1 - u * u);
      let v = 3.4 + sunOn(u, 0, nz) * 4.6;
      if (y <= base - 5 && Math.round((u + 1) * 4.5) % 2 === 1) v -= 0.8;
      b.set(x, y, rampDither(LIME, v + (hash2(x, y, 892) - 0.5) * 0.5, x, y));
    }
  }
  // the capital lying in the grass at its foot
  for (let y = base - 9; y <= base; y++) {
    for (let x = 24; x <= 42; x++) {
      const ly = y - (base - 9), lx = x - 24;
      if (ly < 3 && (lx < 2 || lx > 16)) continue;
      let v = ly < 3 ? 7.4 - lx * 0.1 : 5.2 - lx * 0.12;
      if (ly === 3) v = 3;
      b.set(x, y, rampDither(LIME, v + (hash2(x, y, 893) - 0.5) * 0.5, x, y));
    }
  }
  return mossOver(outline(b, LIME[0]), 894, 0.6);
}

// ---------------------------------------------------------------------------
// The near trees and plants (fg, at the screen's edges) and the light through them
// ---------------------------------------------------------------------------

/**
 * The giant tree at the left edge: a smooth grey-brown trunk rising out of the
 * frame on plank buttresses that spread over the court's edge, lichen and moss
 * on its bark, a red bromeliad and ferns growing on it.
 */
function giantTrunk(): Bitmap {
  const W = 120, HH = 362, cx = 26;
  const b = new Bitmap(W, HH);
  const radius = (y: number) => 24 + Math.max(0, y - 250) * 0.12 + n1(y, 30, 901) * 2.4;
  for (let y = 0; y < HH; y++) {
    const rad = radius(y);
    const wob = (n1(y, 24, 906) - 0.5) * 3;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - cx - wob) / rad;
      if (u > 1) continue;
      const uu = Math.max(-1, u);
      const nz = Math.sqrt(Math.max(0, 1 - uu * uu));
      let v = 3.2 + sunOn(uu, 0, nz) * 4.4 + (uu > 0.82 ? 0.8 : 0);
      // ridges and fissures running up the bark, lichen in pale patches, moss on the shaded side
      const ridge = n1(x * 1.6 + n1(y, 22, 902) * 5, 2.6, 903);
      if (ridge > 0.74) v -= 1.3;
      else if (ridge < 0.22) v += 0.6;
      const lichen = vnoise(x, y, 6, 904);
      if (lichen > 0.8 && dith(x, y, (lichen - 0.8) * 5)) {
        b.set(x, y, rampDither(LIME, 4.4 - uu, x, y));
        continue;
      }
      const moss = vnoise(x, y, 9, 905);
      if (moss > 0.7 && uu > 0.1 && dith(x, y, (moss - 0.7) * 3.5)) {
        b.set(x, y, rampDither(MOSS, 3.2 - uu, x, y));
        continue;
      }
      b.set(x, y, rampDither(BARK, v, x, y));
    }
  }
  // the buttresses: plank roots flaring over the ground toward the court
  for (const [y0, x1, y1, th] of [[250, 104, 358, 9], [292, 76, 361, 7]] as const) {
    for (let k = 0; k <= 1; k += 0.004) {
      const x = cx + 18 + (x1 - cx - 18) * k, y = y0 + (y1 - y0) * Math.pow(k, 0.7);
      const h = th * (1 - k * 0.7);
      for (let a = 0; a < h; a++) {
        const px = Math.round(x - a * 0.4), py = Math.round(y + a);
        if (py >= HH) continue;
        b.set(px, py, rampDither(BARK, (a < 1.5 ? 6 : 3.6) - k * 0.6, px, py));
      }
    }
  }
  // a bromeliad: a rosette of leaves, a red spike
  const bx = 36, by = 172;
  for (const ang of [-2.6, -2.2, -1.8, -1.3, -0.9, -0.5]) leafShape(b, bx, by, ang, 12, 4, (t, s, x, y) => rampDither(LEAF, 7 + (s < 0 ? 1.5 : -0.5) - t * 1.5, x, y));
  for (let y = by - 14; y < by - 2; y++) for (let x = bx - 1; x <= bx + 1; x++) b.set(x, y, FLOWER[x === bx - 1 ? 3 : y < by - 11 ? 4 : 2]);
  // ferns sprouting from a fork higher up
  for (const ang of [-2.4, -1.8, -1.1, -0.5]) frond(b, 38, 96, ang, 16, 7, LEAF);
  return outline(b, BARK[0]);
}

/**
 * A second great tree at the right edge, its sunlit western side toward the
 * court: smooth bark with ridges and lichen, a buttress reaching left over the
 * grass, a fern growing from a crook.
 */
function rightTrunk(): Bitmap {
  const W = 64, HH = 362, cx = 56;
  const b = new Bitmap(W, HH);
  for (let y = 0; y < HH; y++) {
    const rad = 17 + Math.max(0, y - 280) * 0.1 + n1(y, 26, 912) * 2;
    const wob = (n1(y, 30, 913) - 0.5) * 2.4;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - cx - wob) / rad;
      if (u < -1 || u > 1) continue;
      const nz = Math.sqrt(1 - u * u);
      let v = 3.2 + sunOn(u, 0, nz) * 4.4 + (u < -0.82 ? 0.6 : 0);
      const ridge = n1(x * 1.6 + n1(y, 22, 914) * 5, 2.6, 915);
      if (ridge > 0.74) v -= 1.3;
      else if (ridge < 0.22) v += 0.6;
      const lichen = vnoise(x, y, 6, 916);
      if (lichen > 0.8 && dith(x, y, (lichen - 0.8) * 5)) {
        b.set(x, y, rampDither(LIME, 5 - u, x, y));
        continue;
      }
      b.set(x, y, rampDither(BARK, v, x, y));
    }
  }
  // a buttress reaching toward the court along the ground
  for (let k = 0; k <= 1; k += 0.004) {
    const x = cx - 14 - k * 34, y = 300 + 58 * Math.pow(k, 0.7);
    const h = 8 * (1 - k * 0.7);
    for (let a = 0; a < h; a++) {
      const px = Math.round(x + a * 0.4), py = Math.round(y + a);
      if (py < HH) b.set(px, py, rampDither(BARK, (a < 1.5 ? 6.4 : 4) - k * 0.6, px, py));
    }
  }
  for (const ang of [-2.6, -2.1, -1.5]) frond(b, 44, 150, ang, 15, 7, LEAF);
  return outline(b, BARK[0]);
}

interface Leaf {
  x: number;
  y: number;
  ang: number;
  len: number;
  wid: number;
  depth: number;
  ph: number;
}

/**
 * Leaves hanging into a top corner from branches above the frame: big pointed
 * leaves, darker behind, the ones near the sun glowing yellow-green where it
 * shines through them. Each frame swings every leaf a little about its stem,
 * one whole cycle per loop.
 */
function canopy(W: number, HH: number, ox: number, leaves: Leaf[], branch: [number, number][], mass: Puff[], n = 8): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    // the foliage massed in the corner, in the shade of the leaves in front of it
    drawPuffs(b, mass, LEAF, 4.2, 3, 1011);
    for (let k = 0; k < branch.length - 1; k++) {
      const [x0, y0] = branch[k], [x1, y1] = branch[k + 1];
      for (let t = 0; t <= 1; t += 0.01) {
        const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
        const th = 3 + (1 - (k + t) / (branch.length - 1)) * 2;
        for (let a = -th; a <= 1; a++) b.set(x, y + a, BARK[a < -th + 1.5 ? 5 : a < 0 ? 3 : 1]);
      }
    }
    for (const l of [...leaves].sort((a, c) => a.depth - c.depth)) {
      const ang = l.ang + 0.07 * Math.sin((i / n) * Math.PI * 2 + l.ph);
      const sun = Math.max(0, 1 - Math.hypot(l.x + ox - SUN_X, l.y - SUN_Y) / 120);
      leafShape(b, l.x, l.y, ang, l.len, l.wid, (t, s, x, y) => {
        const rib = Math.abs(s) < 0.12 && t < 0.9;
        if (sun > 0.25 && l.depth > 0.4) return rampDither(GLOW, sun * 5 + (s < 0 ? 0.6 : -0.4) - t * 0.8 - (rib ? 1.4 : 0), x, y);
        return rampDither(LEAF, 2.4 + l.depth * 5 + sun * 3 + (s < 0 ? 1.1 : -0.5) - t * 0.8 - (rib ? 1.6 : 0), x, y);
      });
      // its stalk back up to the branch
      line(b, l.x, l.y, l.x - Math.cos(ang) * 3, l.y - Math.sin(ang) * 4, LEAF[3]);
    }
    out.push(outline(b, LEAF[0]));
  }
  return out;
}

/** Leaves for a corner of the canopy, keeping clear of the sun's disc. */
function canopyLeaves(seed: number, W: number, HH: number, ox: number, count: number, dense: (x: number, y: number) => number): Leaf[] {
  const r = rng(seed);
  const out: Leaf[] = [];
  for (let k = 0; out.length < count && k < count * 30; k++) {
    const x = r() * W, y = r() * HH * 0.5;
    if (r() > dense(x, y)) continue;
    if (Math.hypot(x + ox - SUN_X, y - SUN_Y) < 20) continue;
    const len = 15 + r() * 20;
    out.push({ x, y, ang: Math.PI / 2 + (r() - 0.5) * 1.5, len, wid: len * (0.34 + r() * 0.14), depth: r(), ph: r() * Math.PI * 2 });
  }
  return out;
}

/** Lianas hanging from the canopy: thick woody ropes and thin green vines with leaves; each sways on its own phase, one cycle a loop. */
function lianas(W: number, HH: number, strands: [number, number, number, number][], n = 8): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    strands.forEach(([x0, len, thick, ph]) => {
      let prev: [number, number] | null = null;
      for (let y = 0; y < len; y++) {
        const t = y / len;
        const x = x0 + Math.sin((i / n) * Math.PI * 2 + ph) * t * t * 3 + Math.sin(y * 0.09 + ph) * 1.5;
        const px = Math.round(x);
        if (prev && Math.abs(prev[0] - px) > 1) line(b, prev[0], prev[1], px, y, BARK[3]);
        if (thick > 1) {
          b.set(px - 1, y, BARK[5]);
          b.set(px, y, BARK[3]);
          if (thick > 2) b.set(px + 1, y, BARK[1]);
        } else {
          b.set(px, y, LEAF[6]);
          if (y % 6 === 3) leafShape(b, px, y, Math.PI / 2 + (y % 12 === 3 ? -0.9 : 0.9), 5, 3, (tt, s, x2, y2) => rampDither(LEAF, 8 + (s < 0 ? 1 : 0) - tt, x2, y2));
        }
        prev = [px, y];
      }
    });
    out.push(outline(b, LEAF[0]));
  }
  return out;
}

/** Ferns and broad leaves in the bottom-left corner, stirring. */
function cornerFerns(n = 6): Bitmap[] {
  const W = 130, HH = 74;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    const ph = (i / n) * Math.PI * 2;
    const r = rng(921);
    for (let k = 0; k < 9; k++) {
      const x = 6 + r() * 110, ang = -Math.PI / 2 + (r() - 0.45) * 1.9 + Math.sin(ph + k) * 0.05;
      frond(b, x, HH - 1, ang, 28 + r() * 30, 6.5 + r() * 2, LEAF);
    }
    for (let k = 0; k < 4; k++) broadLeaf(b, 10 + r() * 60, HH - 2, -Math.PI / 2 - 0.3 + (r() - 0.5) * 1.2 + Math.sin(ph + k * 2) * 0.04, 26 + r() * 14, 12 + r() * 6, 7, LEAF);
    out.push(outline(b, LEAF[0]));
  }
  return out;
}

/** Big leaves and a heliconia's red and gold bracts in the bottom-right corner, stirring. */
function cornerLeaves(n = 6): Bitmap[] {
  const W = 116, HH = 92;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, HH);
    const ph = (i / n) * Math.PI * 2;
    const r = rng(931);
    for (let k = 0; k < 6; k++) broadLeaf(b, 30 + r() * 84, HH - 1, -Math.PI / 2 - 0.5 + (r() - 0.3) * 1.3 + Math.sin(ph + k * 1.7) * 0.045, 34 + r() * 24, 14 + r() * 10, 6.4 + r() * 1.6, LEAF);
    // the heliconia: a stalk, bracts zigzagging up it
    const sx = 52 + Math.sin(ph) * 0.8;
    for (let y = HH - 1; y > HH - 58; y--) b.set(Math.round(sx), y, LEAF[5]);
    for (let k = 0; k < 6; k++) {
      const y = HH - 18 - k * 7, side = k % 2 ? 1 : -1;
      polyFill(b, [[sx, y], [sx + side * 9, y - 3], [sx + side * 2, y + 3]], (x, yy) => rampDither(FLOWER, 3.4 - (x - sx) * side * 0.12 + (yy < y ? 0.6 : 0), x, yy));
      b.set(Math.round(sx + side * 8), y - 3, GOLDF[3]);
      b.set(Math.round(sx + side * 7), y - 3, GOLDF[2]);
    }
    out.push(outline(b, LEAF[0]));
  }
  return out;
}

/**
 * A beam of sunlight slanting down from the gap in the canopy round the sun:
 * a pale, dithered shaft fading out toward its foot and its edges. Frame 0 is
 * empty, so the beam breathes in and out (pulse).
 */
function sunbeam(w: number, len: number, dx: number): Bitmap[] {
  const W = Math.ceil(w + Math.abs(dx)) + 2, HH = len;
  const b = new Bitmap(W, HH);
  const warm = hex('#fff2c4');
  for (let y = 0; y < HH; y++) {
    const t = y / HH;
    const x0 = (dx > 0 ? 0 : -dx) + dx * t;
    for (let x = Math.floor(x0); x < x0 + w; x++) {
      const across = Math.abs((x + 0.5 - x0) / w - 0.5) * 2;
      const k = (1 - across * across) * Math.pow(1 - t, 0.8) * 0.8;
      if (k > 0.05 && dith(x, y, k)) b.set(x, y, withAlpha(warm, 72));
    }
  }
  return [new Bitmap(1, 1), b];
}

// ---------------------------------------------------------------------------
// The floor: the old paved court, its fallen drums, the light on it, roots and flowers
// ---------------------------------------------------------------------------

/**
 * The court: big irregular flagstones, bigger toward the camera, each one lit
 * along its upper-left edge and shadowed along its lower right, the joints
 * between them taken by moss and grass; some stones gone (the grass shows),
 * some mossy, some cracked; the paving frays out into the grass at its edges.
 */
function plaza(): Bitmap {
  const W = 560, HH = 168, cx = W / 2;
  const b = new Bitmap(W, HH);
  // the court's frayed outline: it runs across the arena and frays toward the corners
  const edge = (x: number, y: number) => Math.max(Math.hypot((x + 0.5 - cx) / (262 + y * 0.5), (y + 0.5 - 60) / 150), (6 - y) / 6) + (vnoise(x, y, 10, 801) - 0.5) * 0.3 + (vnoise(x, y, 4, 802) - 0.5) * 0.1;
  // perspective: a stone is s(y) px tall, and wider than tall
  const A = 11, K = 0.115;
  const s = (y: number) => A + K * y;
  const V = (y: number) => Math.log(s(y) / A) / K;
  const seed = (i: number, j: number): [number, number] => [i + 0.12 + hash2(i, j, 821) * 0.76, j + 0.12 + hash2(i, j, 822) * 0.76];
  for (let y = 0; y < HH; y++) {
    const sy = s(y), v = V(y);
    for (let x = 0; x < W; x++) {
      const q = edge(x, y);
      if (q > 1 || (q > 0.82 && !dith(x, y, (1 - q) / 0.18))) continue;
      const u = (x + 0.5 - cx) / (sy * 1.6);
      const i0 = Math.floor(u), j0 = Math.floor(v);
      let d1 = 1e9, d2 = 1e9;
      let c1: [number, number] = [0, 0], p1: [number, number] = [0, 0], p2: [number, number] = [0, 0];
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const p = seed(i0 + di, j0 + dj);
          const d = Math.hypot(u - p[0], v - p[1]);
          if (d < d1) {
            d2 = d1;
            p2 = p1;
            d1 = d;
            p1 = p;
            c1 = [i0 + di, j0 + dj];
          } else if (d < d2) {
            d2 = d;
            p2 = p;
          }
        }
      }
      // distance to the joint with the nearest neighbour, in px
      const gap = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
      const toJoint = ((d2 * d2 - d1 * d1) / (2 * gap)) * sy;
      const stone = hash2(c1[0], c1[1], 823);
      const gone = stone < 0.07 || (q > 0.7 && stone < 0.3);
      if (gone) continue;
      if (toJoint < 0.9) {
        b.set(x, y, hash2(x, y, 824) > 0.5 ? MOSS[3] : GR[5]);
        continue;
      }
      // the bevel: the edge facing the upper left catches the sun, the far one is in shadow
      const nxv = (p2[0] - p1[0]) / gap, nyv = (p2[1] - p1[1]) / gap;
      const toLight = -nxv * 0.6 - nyv * 0.8;
      let val = 4.1 + (stone - 0.5) * 1.1 + (hash2(x, y, 825) - 0.5) * 0.5;
      if (toJoint < 2.2) val += toLight > 0.2 ? 1.1 : toLight < -0.2 ? -0.9 : 0;
      if (stone > 0.84 && Math.abs((u - p1[0]) * 1.4 - (v - p1[1]) * 0.9) < 0.6 / sy) val = 1.6;
      const mz = vnoise(x, y, 6, 826) + (stone > 0.7 ? 0.15 : 0);
      if (mz > 0.66 && dith(x, y, (mz - 0.66) * 3)) {
        b.set(x, y, rampDither(MOSS, 2.6 + (toJoint < 2.2 && toLight > 0.2 ? 1 : 0), x, y));
        continue;
      }
      b.set(x, y, rampDither(PAVE, val, x, y));
    }
  }
  // grass coming up between the stones
  const r = rng(827);
  for (let k = 0; k < 90; k++) {
    const x = Math.floor(r() * W), y = Math.floor(8 + r() * (HH - 10));
    const c = b.get(x, y);
    if (c !== MOSS[3] && c !== GR[5]) continue;
    const h = 2 + Math.floor(r() * 2 + (y / HH) * 3);
    for (let i = 0; i < h; i++) b.set(x + (i > 1 ? 1 : 0), y - i, GR[i === h - 1 ? 9 : 7]);
  }
  return b;
}

/** Sunlight on the court: a warm wash over its middle, thinning toward its edges. */
function sunWash(): Bitmap {
  const W = 420, HH = 150;
  const b = new Bitmap(W, HH);
  const warm = hex('#ffe9a8');
  for (let y = 0; y < HH; y++) {
    for (let x = 0; x < W; x++) {
      const k = Math.max(0, 1 - Math.hypot((x - W * 0.42) / (W * 0.55), (y - HH * 0.45) / (HH * 0.62))) * 0.5;
      if (k > 0.03 && dith(x, y, k)) b.set(x, y, withAlpha(warm, 30));
    }
  }
  return b;
}

/** Flecks of sun on the court through the leaves; frame 1 shows them shifted, breathing over frame 0. */
function dapples(): Bitmap[] {
  const W = 470, HH = 160;
  const warm = hex('#fff0b4');
  return [941, 942].map((seed) => {
    const b = new Bitmap(W, HH);
    const r = rng(seed);
    for (let k = 0; k < 16; k++) {
      const cx = 20 + r() * (W - 40), cy = 6 + r() * (HH - 16);
      const rx = 5 + r() * 9 + (cy / HH) * 6, ry = rx * 0.38;
      ellipseFill(b, cx, cy, rx, ry, (x, y, d) => (dith(x, y, (1 - d) * 0.8) ? withAlpha(warm, 46) : 0));
    }
    return b;
  });
}

/** Two drums of a fallen column and its capital at the court's far edge. */
function fallenDrums(): Bitmap {
  const W = 74, HH = 26;
  const b = new Bitmap(W, HH);
  // lying drums: a cylinder seen side-on, its round end toward the light
  for (const [x0, len, y0, rad] of [[8, 18, 14, 7], [31, 13, 19, 6]] as const) {
    for (let y = Math.floor(y0 - rad); y <= y0 + rad; y++) {
      const u = (y + 0.5 - y0) / rad;
      if (Math.abs(u) > 1) continue;
      const nz = Math.sqrt(1 - u * u);
      for (let x = x0; x < x0 + len; x++) {
        let v = 2.4 + sunOn(0, u, nz) * 3;
        if (Math.round((u + 1) * 4) % 2 === 1) v -= 0.6;
        b.set(x, y, rampDither(LIME, v, x, y));
      }
    }
    ellipseFill(b, x0, y0, rad * 0.45, rad, (x, y, d) => rampDither(LIME, 5.2 - d * 1.2 - (y - y0) * 0.1, x, y));
  }
  // the capital, upside down in the grass
  for (let y = 12; y < 25; y++) {
    for (let x = 50; x < 70; x++) {
      const ly = y - 12, lx = x - 50;
      if (ly > 8 && (lx < 3 || lx > 16)) continue;
      let v = ly < 1 ? 5.4 : 4 - lx * 0.1;
      if (ly === 8) v = 2.6;
      b.set(x, y, rampDither(LIME, v + (hash2(x, y, 951) - 0.5) * 0.5, x, y));
    }
  }
  return mossOver(outline(b, LIME[0]), 952, 0.75);
}

/** Roots of the giant tree crawling out over the court's corner, half sunk among the slabs. */
function floorRoots(): Bitmap {
  const W = 230, HH = 70;
  const b = new Bitmap(W, HH);
  const r = rng(961);
  for (let k = 0; k < 4; k++) {
    let x = 0, y = 34 + k * 9, a = -0.12 + (r() - 0.5) * 0.3;
    const len = 90 + r() * 120;
    for (let i = 0; i < len; i++) {
      a += (r() - 0.5) * 0.12;
      x += Math.cos(a);
      y += Math.sin(a) * 0.6;
      const th = 4 * (1 - i / len) + 1;
      for (let t = 0; t < th; t++) {
        const px = Math.round(x), py = Math.round(y - th / 2 + t);
        if (i > len * 0.8 && !dith(px, py, (len - i) / (len * 0.2))) continue;
        b.set(px, py, rampDither(BARK, t < 1 ? 6 : t > th - 1.5 ? 2 : 4, px, py));
      }
    }
  }
  return b;
}

/** Ferns and flowers along the foot of the serpent wall. */
function wallFlowers(): Bitmap {
  const W = 236, HH = 18;
  const b = new Bitmap(W, HH);
  const r = rng(971);
  for (let k = 0; k < 16; k++) frond(b, 4 + r() * 228, HH - 1, -Math.PI / 2 + (r() - 0.5) * 1.8, 6 + r() * 7, 5.6, GR);
  for (let k = 0; k < 9; k++) {
    const x = Math.floor(6 + r() * 224), y = HH - 5 - Math.floor(r() * 7);
    const pal = [PETAL, GOLDF, PINK, FLOWER][Math.floor(r() * 4)];
    for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [-1, 0]]) b.set(x + dx, y + dy, pal[dx === 0 && dy === -1 ? 3 : 2]);
    b.set(x, y + 1, GR[4]);
  }
  return b;
}

/** Flowers and ferns at the jungle's edge behind the court, on the left. */
function edgeFlowers(): Bitmap {
  const W = 120, HH = 16;
  const b = new Bitmap(W, HH);
  const r = rng(981);
  for (let k = 0; k < 9; k++) frond(b, 4 + r() * 112, HH - 1, -Math.PI / 2 + (r() - 0.5) * 1.6, 5 + r() * 6, 5.4, GR);
  for (let k = 0; k < 6; k++) {
    const x = Math.floor(6 + r() * 108), y = HH - 4 - Math.floor(r() * 6);
    const pal = [PETAL, GOLDF, PINK][Math.floor(r() * 3)];
    b.set(x, y, pal[3]);
    b.set(x + 1, y, pal[2]);
    b.set(x, y + 1, GR[4]);
  }
  return b;
}

// ---------------------------------------------------------------------------
// The macaws (ZoneDef.birds circles them)
// ---------------------------------------------------------------------------

/** A scarlet macaw flying to the right: wings up, level, down. R red, D dark red, B blue, Y yellow, k beak. */
function macaws(): Bitmap[] {
  const frames = [
    ['......B.....', '.....BB.....', '.....BY.....', 'DRRR.RRRRRk.', '......Y.....'],
    ['............', '............', '....BBYY....', 'DRRR.RRRRRk.', '............'],
    ['............', '............', '............', 'DRRR.RRRRRk.', '.....YB.....', '.....BB.....', '......B.....'],
  ];
  const col: Record<string, RGBA> = { R: MACAW.red, D: MACAW.dark, B: MACAW.blue, Y: MACAW.yellow, k: MACAW.beak };
  return frames.map((rows) => {
    const b = new Bitmap(12, 7);
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && b.set(x, y, col[ch])));
    return b;
  });
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

/** the serpent wall stands on the right: cols 12-19 */
const WALL_FROM = 12;

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const set = (layer: number[], c: number, r: number, n: string) => (layer[r * MAP_COLS + c] = id(n));
  const r = rng(91);
  const plain = ['grass_a', 'grass_b', 'grass_c', 'grass_d', 'grass_e', 'grass_f', 'grass_a', 'grass_d', 'moss_a', 'moss_b', 'grass_c', 'bloom_a'];
  for (let row = 6; row < MAP_ROWS; row++) {
    for (let c = 0; c < MAP_COLS; c++) {
      let n = plain[Math.floor(r() * plain.length)];
      if (row === 6 && c >= WALL_FROM) n = r() < 0.5 ? 'shade_a' : 'shade_b';
      else if ((c < 3 || c > 17) && r() < 0.4) n = r() < 0.5 ? 'bloom_b' : 'moss_a';
      set(ground, c, row, n);
    }
  }
  for (let c = WALL_FROM; c < MAP_COLS; c++) {
    const a = (c - WALL_FROM) % 2 === 0;
    let top = a ? 'wall_top_a' : 'wall_top_b', face = a ? 'wall_face_a' : 'wall_face_b';
    if (c === WALL_FROM) [top, face] = ['wall_top_end', 'wall_face_end'];
    else if (c === 15) [top, face] = ['wall_top_bv', 'wall_face_bv'];
    else if (c === 16) [top, face] = ['wall_top_ab', 'wall_face_ah'];
    else if (c === 19) [top, face] = ['wall_top_bv', 'wall_face_bv'];
    set(wall, c, 4, top);
    set(wall, c, 5, face);
  }
  const props: PropPlacement[] = [
    // far: clouds drifting high, the waterfall's water and mist, the great tree behind the wall
    { kind: 'cloud_a', x: 120, y: 26, layer: 'far' },
    { kind: 'cloud_b', x: 470, y: 30, layer: 'far' },
    { kind: 'cloud_c', x: 300, y: 18, layer: 'far' },
    { kind: 'falls', x: WF_X - 6, y: Math.round(TEP_TOP(WF_X)) - 1, layer: 'far' },
    { kind: 'falls_mist', x: WF_X + 2, y: 128, layer: 'far' },
    { kind: 'great_tree', x: 452, y: 134, layer: 'far' },
    // back: the sunbeams, the broken column and the colossal head on the left, the serpent's head at the wall's end, the stump on the right
    { kind: 'beam_a', x: 150, y: 58, layer: 'back' },
    { kind: 'beam_b', x: 110, y: 66, layer: 'back' },
    { kind: 'beam_c', x: 196, y: 54, layer: 'back' },
    { kind: 'column', x: 52, y: 200, layer: 'back' },
    { kind: 'serpent', x: 404, y: 199, layer: 'back' },
    { kind: 'jaguar', x: 562, y: 202, layer: 'back' },
    { kind: 'stump', x: 612, y: 203, layer: 'back' },
    { kind: 'colossus', x: 92, y: 206, layer: 'back' },
    // floor: the court and the light on it, the drums, the flowers, the roots
    { kind: 'plaza', x: 330, y: 194, layer: 'floor' },
    { kind: 'sunwash', x: 140, y: 196, layer: 'floor' },
    { kind: 'dapples', x: 352, y: 196, layer: 'floor' },
    { kind: 'edge_flowers', x: 172, y: 200, layer: 'floor' },
    { kind: 'wall_flowers', x: 524, y: 201, layer: 'floor' },
    { kind: 'drums', x: 326, y: 216, layer: 'floor' },
    { kind: 'roots', x: 40, y: 362, layer: 'floor' },
    // fg: the two great trees at the edges, lianas, leaves hanging into the top corners, plants in the bottom ones
    { kind: 'trunk', x: -12, y: 0, layer: 'fg' },
    { kind: 'trunk_r', x: 646, y: 0, layer: 'fg' },
    { kind: 'lianas_l', x: 22, y: 0, layer: 'fg' },
    { kind: 'lianas_r', x: 588, y: 0, layer: 'fg' },
    { kind: 'canopy_l', x: 0, y: 0, layer: 'fg' },
    { kind: 'canopy_r', x: 640, y: 0, layer: 'fg' },
    { kind: 'ferns', x: 0, y: 362, layer: 'fg' },
    { kind: 'leaves_br', x: 642, y: 362, layer: 'fg' },
  ];
  return { ground, wall, props };
}

const CANOPY_L = { W: 150, HH: 64 };
const CANOPY_R = { W: 150, HH: 56 };

export const zone2: ZoneArt = {
  id: 'zone2',
  name: 'Verdant Grove',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    cloud_a: [cloudPuff(48, 12, 991)],
    cloud_b: [cloudPuff(34, 9, 992)],
    cloud_c: [cloudPuff(60, 13, 993)],
    falls: fallingWater(),
    falls_mist: [fallMist(false), fallMist(true)],
    great_tree: greatTree(),
    beam_a: sunbeam(22, 226, 128),
    beam_b: sunbeam(13, 190, 96),
    beam_c: sunbeam(16, 204, 146),
    column: [brokenColumn()],
    serpent: [serpentHead()],
    stump: [columnStump()],
    jaguar: [jaguarStatue()],
    colossus: [colossalHead()],
    plaza: [plaza()],
    sunwash: [sunWash()],
    dapples: dapples(),
    edge_flowers: [edgeFlowers()],
    wall_flowers: [wallFlowers()],
    drums: [fallenDrums()],
    roots: [floorRoots()],
    trunk: [giantTrunk()],
    trunk_r: [rightTrunk()],
    lianas_l: lianas(60, 230, [[10, 206, 3, 0.4], [24, 150, 1, 1.9], [38, 186, 2, 3.1], [50, 118, 1, 4.4]]),
    lianas_r: lianas(56, 200, [[12, 150, 1, 0.8], [26, 182, 3, 2.2], [42, 128, 1, 3.6]]),
    canopy_l: canopy(CANOPY_L.W, CANOPY_L.HH, 0, canopyLeaves(1001, CANOPY_L.W, CANOPY_L.HH, 0, 46, (x, y) => (1 - x / 175) * (1 - y / 60)), [[-4, 10], [30, 7], [64, 11], [100, 7], [126, 2]], [[4, -4, 22], [26, -6, 18], [50, -8, 16], [10, 14, 12], [74, -10, 14], [104, -12, 12]]),
    canopy_r: canopy(CANOPY_R.W, CANOPY_R.HH, 490, canopyLeaves(1002, CANOPY_R.W, CANOPY_R.HH, 490, 40, (x, y) => (0.15 + x / 160) * (1 - y / 56)), [[0, 5], [60, 9], [110, 4], [154, 8]], [[146, -4, 20], [124, -8, 16], [100, -10, 14], [140, 16, 11], [76, -12, 12]]),
    ferns: cornerFerns(),
    leaves_br: cornerLeaves(),
    bird: macaws(),
  }),
  kinds: {
    // high clouds drift slowly east and come round again
    cloud_a: { anchor: [0.5, 1], mode: 'static', drift: { speed: 1.6 } },
    cloud_b: { anchor: [0.5, 1], mode: 'static', drift: { speed: 2.3 } },
    cloud_c: { anchor: [0.5, 1], mode: 'static', drift: { speed: 1.1 } },
    falls: { anchor: [0, 0], mode: 'loop', ms: 110 },
    // the mist at the waterfall's foot breathes slowly
    falls_mist: { anchor: [0.5, 1], mode: 'pulse', ms: 7000 },
    great_tree: { anchor: [0.5, 1], mode: 'loop', ms: 620 },
    // the beams fade in and out, each on its own slow breath
    beam_a: { anchor: [0, 0], mode: 'pulse', ms: 9000 },
    beam_b: { anchor: [0, 0], mode: 'pulse', ms: 12500 },
    beam_c: { anchor: [0, 0], mode: 'pulse', ms: 15500 },
    column: { anchor: [0.5, 1], mode: 'static' },
    serpent: { anchor: [1, 1], mode: 'static' },
    stump: { anchor: [0.5, 1], mode: 'static' },
    jaguar: { anchor: [0.5, 1], mode: 'static' },
    colossus: { anchor: [0.5, 1], mode: 'static' },
    plaza: { anchor: [0.5, 0], mode: 'static' },
    sunwash: { anchor: [0, 0], mode: 'static' },
    dapples: { anchor: [0.5, 0], mode: 'pulse', ms: 11000 },
    edge_flowers: { anchor: [0.5, 1], mode: 'static' },
    wall_flowers: { anchor: [0.5, 1], mode: 'static' },
    drums: { anchor: [0.5, 1], mode: 'static' },
    roots: { anchor: [0, 1], mode: 'static' },
    trunk: { anchor: [0, 0], mode: 'static' },
    trunk_r: { anchor: [1, 0], mode: 'static' },
    lianas_l: { anchor: [0, 0], mode: 'loop', ms: 520 },
    lianas_r: { anchor: [0, 0], mode: 'loop', ms: 560 },
    canopy_l: { anchor: [0, 0], mode: 'loop', ms: 480 },
    canopy_r: { anchor: [1, 0], mode: 'loop', ms: 500 },
    ferns: { anchor: [0, 1], mode: 'loop', ms: 540 },
    leaves_br: { anchor: [1, 1], mode: 'loop', ms: 580 },
    bird: { anchor: [0.5, 0.5], mode: 'loop', ms: 200 },
  },
  layout,
  horizon: HZ,
};
