// Zone "Blossom Caldera": Zone 10, named and described by Jakub (2026-11-03,
// docs/DESIGN_DECISIONS.md 5.13): ancient volcanic terrain fused with extraordinary
// flowering ecosystems round a colossal dormant volcano; dark ridges and black basalt
// cliffs, rolling hills and fertile valleys in colourful meadows, old lava flows as
// winding black stone paths, geothermal springs, turquoise pools and steaming fissures,
// waterfalls from high formations; enormous ancient flowering trees in pink, white and
// lavender, wildflowers in crimson, violet, gold and pale pink, giant flowers by the
// vents, moss between the rocks; petals on the wind, thin smoke from the summit, steam,
// glowing minerals in deep crevices, wildlife; late-afternoon sun, soft volumetric
// light, haze, layered clouds; a wilderness, not a garden. The same day: "make the area
// inspired by japan architecture and their blossom trees".
//
// As painted: late afternoon, the sun upper left over a cliff of basalt columns. The
// volcano fills the skyline, a cone with a cut-off top, snow in its gullies, thin smoke
// leaning east from the crater, a long bank of cloud lying across its middle and the
// sun's rays slanting through the sky. On the cliff a small shrine and a black pine,
// two waterfalls coming down the columns into a pool; on the hill beyond, a five-storey
// pagoda among blossom; a red arched bridge over the stream. An old lava flow winds out
// of the hills, under a vermilion torii, through the arena and past the champions:
// the arena is a meadow in flower either side of it, with stone lanterns along it. An
// enormous old cherry leans in over the right, a hot spring steams in the near left
// corner with giant flowers by its vent, a fissure glows in the near ground.
//
// What moves (my reading, all of it slow): the smoke, the waterfalls, the steam of the
// springs and the fissure, the cherry's crown, the glow in the fissure, clouds,
// cranes, butterflies, the `petals` ambience. Everything his words did not name is a
// first take: the shrine, the pagoda, the torii, the bridge and the lanterns stand for
// "japan architecture", the snow, the cloud bank and the cranes are mine.
import { dith, ellipseFill, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, hex, RGBA, rng, withAlpha } from '../raster.ts';
import { MAP_COLS, MAP_ROWS, Painter, PropPlacement, SPAWNS, TILE, ZoneArt } from './shared.ts';
import { limb } from './zone9.ts';

const H = (list: string[]) => list.map((h) => hex(h));

const SKY = H(['#3b4c94', '#4a5aa2', '#5c69ae', '#7079b8', '#8789c0', '#a098c4', '#b9a6c4', '#d0b2c0', '#e2bdb8', '#efc8ae', '#f7d4a8', '#fce2b4']);
const SUN = H(['#ffe9b0', '#fff2cc', '#fff9e6', '#ffffff']);
const CLOUD = H(['#6e5e8e', '#8c74a0', '#ad8aa8', '#cc9ea6', '#e6b4a4', '#f6cca8', '#ffe6c2']);
/** the volcano across the haze: indigo in its shade, warm rose where the low sun has it */
const VOLC = H(['#262040', '#332a4e', '#41355c', '#504068', '#604c72', '#715a7c', '#846a84', '#99798a', '#ae8b90', '#c49e98', '#dab4a2']);
const VSNOW = H(['#8e88b4', '#aca4c8', '#ccc2d8', '#e8dce4', '#fff2ec']);
const HAZE = H(['#a59ac0', '#b8a8c6', '#cab6ca', '#dcc4ce']);
const FARHILL = H(['#4e4c7e', '#5e5a8a', '#6c6694', '#7c749e', '#8e84a8', '#a094b2']);
const FARBLOOM = H(['#a0789e', '#bc8cac', '#d6a2b8', '#ecbcc8']);
/** the meadows, warm in the afternoon */
export const MEADOW = H(['#1d2618', '#27311b', '#323c1f', '#3e4724', '#4a5229', '#575d2f', '#656936', '#74743e', '#848048']);
const HILLG = H(['#33402e', '#3e4c32', '#4a5a36', '#57683a', '#66763e', '#768444', '#88924c']);
/** cherry blossom, white blossom, lavender blossom */
export const SAKURA = H(['#5a2a44', '#7e3a58', '#a4506e', '#c86e8a', '#e290a6', '#f2b2c2', '#fad0da', '#fff0f4']);
export const WHITEBLOOM = H(['#6e5a6a', '#94808e', '#b8a8b2', '#d8ccd2', '#eee6ea', '#fbf6f8', '#ffffff']);
export const LAVBLOOM = H(['#3e3264', '#4e3e78', '#6c5a9c', '#8e7cbc', '#b2a0d6', '#d8cceb']);
export const BASALT = H(['#0f0d13', '#18151d', '#211d27', '#2b2632', '#36303e', '#433c4a', '#524a58', '#635a68']);
export const BARK = H(['#140e10', '#22181a', '#33241f', '#463227', '#5c4433']);
export const VERM = H(['#5a1410', '#8a2216', '#b8341e', '#dc4c26', '#f07040', '#ffa070']);
export const ROOF = H(['#161a28', '#222838', '#323a4c', '#465062', '#5e6878', '#7c8492']);
const PLASTER = H(['#8a8478', '#b4ac9c', '#d8d0bc', '#f0eadc']);
export const LSTONE = H(['#2e2c2a', '#44413c', '#5c5850', '#767064', '#928a7c', '#aea594']);
const BRONZE = H(['#3a2c14', '#6a5226', '#a08438', '#d6bc5c']);
export const TURQ = H(['#0c4a52', '#126470', '#1a8088', '#2a9ea0', '#46b8b4', '#72d0c4', '#a8e6d8', '#dcf8f0']);
const WATER = H(['#4a7c90', '#6e9eb0', '#9cc4d0', '#cae4ea', '#f0fafa']);
export const STEAM = H(['#a8a4b8', '#c8c4d4', '#e4e0ea', '#fbf8fa']);
const SMOKEV = H(['#6c6080', '#8a7c96', '#a898ac', '#c8b6c0', '#e6d2d0']);
/** old lava, gone to stone: a cool dark grey, a mid value so it never swallows a champion */
export const LAVA = H(['#1a181e', '#232027', '#2d2931', '#38333c', '#433d47', '#4f4852', '#5c545e', '#6a616a']);
const MOSS = H(['#20301c', '#2d4322', '#3c5728', '#4f6c30']);
const PINE = H(['#0e1a16', '#16261e', '#203428', '#2c4432', '#3a563c']);
const MINERAL = H(['#5a2a08', '#a8520e', '#f09020', '#ffd060', '#fff4c0']);
/** wildflowers: crimson, violet, gold and pale pink, bright out in the fields */
export const FLOWERS_FAR: RGBA[][] = [H(['#9c2236', '#c8344a', '#e85a6a']), H(['#6a3a98', '#8a50b8', '#b080dc']), H(['#b88420', '#e0a830', '#f8d460']), H(['#d88aa0', '#f0a8bc', '#ffd6e0'])];
/** and muted in the arena, so the champions stand out */
const FLOWERS_NEAR: RGBA[][] = [H(['#7a2e3a', '#8e3a46', '#a84c58']), H(['#56407a', '#6a4c8a', '#86689e']), H(['#8e7030', '#a8863a', '#c4a24c']), H(['#a07884', '#b88894', '#d4a8b2'])];

/** where the far hills meet the sky */
const HZ = 136;
const SUN_X = 104, SUN_Y = 46;
const V = { x: 340, top: 26, crater: 19, base: 146, l: 270, r: 300 };

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
const shade = (R: RGBA[], v: number, x: number, y: number) => rampDither(R, clamp(v, 0, R.length - 1), x, y);

// ---------------------------------------------------------------------------
// Blossom and the old buildings (shared with the world map)
// ---------------------------------------------------------------------------

/** A clump of blossom: a lumpy cloud of florets lit from the upper left, its edge ragged. */
export function blossom(b: Bitmap, cx: number, cy: number, rx: number, ry: number, R: RGBA[], seed: number, bright = 0) {
  const top = R.length - 1;
  ellipseFill(b, cx, cy, rx * 1.2, ry * 1.2, (x, y) => {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    const d = Math.hypot(nx, ny) + (vnoise(x, y, Math.max(2, rx * 0.4), seed) - 0.5) * 0.6 + (hash2(x, y, seed + 1) - 0.5) * 0.14;
    if (d > 1) return 0;
    const f = vnoise(x, y, 2.2, seed + 2);
    const lobe = vnoise(x, y, Math.max(2, rx * 0.32), seed + 3);
    const v = top * 0.54 + bright - (nx * 0.8 + ny) * top * 0.26 + (lobe - 0.5) * 2 + (f - 0.5) * 2 - Math.max(0, d - 0.66) * 2.2;
    return shade(R, v, x, y);
  });
}

/** A small blossom tree: a short dark trunk, a crown of a few clumps. */
export function blossomTree(b: Bitmap, x: number, y: number, r: number, R: RGBA[], seed: number, bright = 0) {
  const tw = Math.max(1, r * 0.14);
  limb(b, [[x, y, tw * 1.3], [x - r * 0.1, y - r * 0.7, tw], [x + r * 0.05, y - r * 1.1, tw * 0.7]], BARK, 2.4, seed);
  const rr = rng(seed);
  const n = r < 4 ? 2 : 5;
  const clumps: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / Math.max(1, n - 1) - 0.5) * 2.4 + (rr() - 0.5) * 0.4;
    clumps.push([x + Math.cos(a) * r * 0.62, y - r * 1.25 + Math.sin(a) * r * 0.42 + r * 0.32, r * (0.5 + rr() * 0.2)]);
  }
  clumps.push([x, y - r * 1.5, r * 0.62]);
  clumps.sort((p, q) => p[1] - q[1]).forEach(([cx, cy, cr], i) => blossom(b, cx, cy, cr, cr * 0.78, R, seed + 10 + i, bright - (i < 2 ? 0.6 : 0)));
}

/** A black pine: a leaning crooked trunk, its needles in flat dark pads. */
export function blackPine(b: Bitmap, x: number, y: number, h: number, lean: number, seed: number) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push([x + lean * h * t + Math.sin(t * 5 + seed) * h * 0.06, y - h * t, Math.max(1, h * 0.05 * (1 - t * 0.6))]);
  }
  limb(b, pts, BARK, 2.2, seed);
  const r = rng(seed);
  for (let i = 0; i < 5; i++) {
    const t = 0.45 + i * 0.13;
    const [px, py] = pts[Math.round(t * 8)];
    const side = i % 2 ? 1 : -1;
    const cx = px + side * h * (0.12 + r() * 0.12), cy = py - 1;
    ellipseFill(b, cx, cy, h * (0.16 + r() * 0.06), h * 0.06, (xx, yy) => shade(PINE, 2.6 - (yy - cy) * (1.2 / Math.max(1, h * 0.06)) - (xx - cx) * 0.06 + (vnoise(xx, yy, 2, seed + i) - 0.5) * 1.4, xx, yy));
  }
}

/** A horizontal beam from x0 to x1 at y (its top), `th` thick, lit on top. */
function beam(b: Bitmap, x0: number, x1: number, y: number, th: number, R: RGBA[], base: number, lift = (_: number) => 0) {
  for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    const dy = lift(x);
    for (let k = 0; k < Math.max(1, th); k++) {
      const yy = Math.round(y - dy + k);
      b.set(x, yy, shade(R, base + (k === 0 ? 1.2 : k >= th - 1 ? -1 : 0) - (x - x0) / Math.max(1, x1 - x0) * 0.6, x, yy));
    }
  }
}

/** A torii: two vermilion pillars on black feet, the tie beam, and the black lintel curving up at its ends. */
export function torii(b: Bitmap, cx: number, by: number, h: number) {
  const half = h * 0.5, pw = Math.max(0.8, h * 0.06);
  for (const side of [-1, 1]) {
    for (let y = Math.round(by - h * 0.9); y <= by; y++) {
      const t = (by - y) / (h * 0.9);
      const xc = cx + side * (half - t * h * 0.035);
      const w = pw * (1 - t * 0.12);
      for (let x = Math.floor(xc - w - 0.5); x <= Math.ceil(xc + w); x++) {
        const u = (x + 0.5 - xc) / w;
        if (Math.abs(u) > 1.15) continue;
        b.set(x, y, y > by - h * 0.08 ? shade(ROOF, 2.2 - u, x, y) : shade(VERM, 3.3 - u * 1.5, x, y));
      }
    }
  }
  const th = Math.max(1, Math.round(h * 0.055));
  beam(b, cx - h * 0.64, cx + h * 0.64, by - h * 0.68, th, VERM, 3);
  // the plaque between the beams
  for (let y = Math.round(by - h * 0.86); y < by - h * 0.68; y++) for (let x = Math.floor(cx - pw); x <= cx + pw; x++) b.set(x, y, shade(ROOF, 1.6 - (x - cx) * 0.4, x, y));
  beam(b, cx - h * 0.7, cx + h * 0.7, by - h * 0.9, th, VERM, 3.2);
  const span = h * 0.8;
  beam(b, cx - span, cx + span, by - h * 0.99, Math.max(1, Math.round(h * 0.075)), ROOF, 2.4, (x) => Math.pow(Math.abs(x - cx) / span, 3) * h * 0.1);
}

/** A tiled roof: concave from its ridge down to its eaves, the eave tips flicking up. */
function roof(b: Bitmap, cx: number, eaveY: number, topY: number, rw: number, tw: number, bright = 0) {
  const hgt = Math.max(1, eaveY - topY);
  for (let y = Math.floor(topY); y <= Math.ceil(eaveY); y++) {
    const t = clamp((y - topY) / hgt, 0, 1);
    const half = tw + (rw - tw) * Math.pow(t, 1.7);
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / half;
      if (Math.abs(u) > 1) continue;
      const rib = rw > 6 && Math.round(x) % 2 === 0 ? -0.4 : 0;
      b.set(x, y, shade(ROOF, 3.2 - u * 1.5 + (t < 0.2 ? 0.8 : 0) + rib + bright + (y >= eaveY - 0.5 ? -1.6 : 0), x, y));
    }
  }
  const tip = Math.max(1, Math.round(rw * 0.16));
  for (const side of [-1, 1]) {
    for (let k = 0; k <= tip; k++) {
      const x = Math.round(cx + side * (rw + k * 0.7)), y = Math.round(eaveY - k * 0.9);
      b.set(x, y, ROOF[side < 0 ? 4 : 2]);
      b.set(x, y + 1, ROOF[1]);
    }
  }
}

/** A five-storey pagoda: walls of vermilion posts and white plaster, five roofs narrowing, a bronze spire. */
export function pagoda(b: Bitmap, cx: number, by: number, h: number, bright = 0) {
  const N = 5, spire = h * 0.22, unit = (h - spire) / (N + 0.3);
  const ph = Math.max(1, Math.round(unit * 0.3)), pw = h * 0.17;
  for (let y = by - ph; y <= by; y++) for (let x = Math.floor(cx - pw); x <= cx + pw; x++) b.set(x, y, shade(LSTONE, 3.6 - (x - cx) / pw * 1.4 + (y === by - ph ? 1 : 0) + bright, x, y));
  let y0 = by - ph;
  for (let i = 0; i < N; i++) {
    const s = 1 - i * 0.1, th = unit * (1 - i * 0.04);
    const bw = h * 0.095 * s, rw = h * 0.22 * s;
    const wallTop = y0 - th * 0.52;
    for (let y = Math.round(wallTop); y <= y0; y++) {
      for (let x = Math.floor(cx - bw); x <= Math.ceil(cx + bw); x++) {
        const u = (x + 0.5 - cx) / bw;
        const post = Math.abs(u) > 0.78 || Math.abs(u) < 0.14;
        const rail = y > y0 - Math.max(1, th * 0.14);
        b.set(x, y, post || rail ? shade(VERM, 3 - u * 1.4 + bright, x, y) : shade(PLASTER, 2.6 - u * 1.2 + bright - (y < wallTop + 1.5 ? 1.4 : 0), x, y));
      }
    }
    roof(b, cx, wallTop, y0 - th, rw, bw * 0.55, bright);
    y0 -= th;
  }
  // the spire: a bronze mast of rings, a jewel at its tip
  for (let y = Math.round(y0 - spire); y <= y0; y++) {
    const ring = Math.round((y0 - y) / Math.max(1.5, spire / 9)) % 2 === 0 && y < y0 - spire * 0.15 && y > y0 - spire * 0.8;
    const w = ring ? Math.max(1, h * 0.014) : Math.max(0.5, h * 0.006);
    for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) b.set(x, y, BRONZE[x < cx ? 3 : ring ? 2 : 1]);
  }
  b.set(Math.round(cx), Math.round(y0 - spire) - 1, BRONZE[3]);
}

/** A small shrine hall: stone footing, posts and white walls, a deep roof with a gable and crossed ridge-ends. */
export function shrine(b: Bitmap, cx: number, by: number, w: number, bright = 0) {
  const hw = w / 2;
  for (let y = by - 2; y <= by; y++) for (let x = Math.floor(cx - hw - 2); x <= cx + hw + 2; x++) b.set(x, y, shade(LSTONE, 3.4 - (x - cx) / hw + (y === by - 2 ? 1 : 0) + bright, x, y));
  const floor = by - 3, wallTop = by - w * 0.36;
  for (let x = Math.floor(cx - hw); x <= cx + hw; x++) b.set(x, floor, shade(BARK, 3.4 - (x - cx) / hw, x, floor));
  for (let y = Math.round(wallTop); y < floor; y++) {
    for (let x = Math.floor(cx - hw + 2); x <= cx + hw - 2; x++) {
      const u = (x + 0.5 - cx) / hw;
      const post = Math.round(x - cx + hw) % Math.max(3, Math.round(w / 5)) === 0;
      const door = Math.abs(x - cx) < w * 0.14 && y > wallTop + 2;
      b.set(x, y, post ? shade(VERM, 3 - u + bright, x, y) : door ? shade(BARK, 1.2, x, y) : shade(PLASTER, 2.6 - u * 1.2 + bright - (y < wallTop + 1.5 ? 1.4 : 0), x, y));
    }
  }
  roof(b, cx, wallTop, wallTop - w * 0.42, hw + w * 0.16, w * 0.12, bright);
  // the gable's triangle under the ridge, and the crossed boards over it
  const gy = wallTop - w * 0.3;
  polyFill(b, [[cx - w * 0.1, gy + w * 0.12], [cx, gy - w * 0.02], [cx + w * 0.1, gy + w * 0.12]], (x, y) => shade(BARK, 3 - (x - cx) * 0.3, x, y));
  const ry = Math.round(wallTop - w * 0.42);
  for (let k = 0; k < Math.max(2, w * 0.1); k++) {
    b.set(Math.round(cx - w * 0.12 - k * 0.6), ry - k, BARK[3]);
    b.set(Math.round(cx + w * 0.12 + k * 0.6), ry - k, BARK[2]);
  }
}

/** A stone lantern: base, shaft, the light box with its window, a wide cap with lifted corners, a jewel on top; moss on it. */
export function lantern(b: Bitmap, cx: number, by: number, h: number, seed: number, mossy = 0.5) {
  const parts: [number, number, number][] = [
    // [height, half width, value] from the ground up
    [0.12, 0.2, 3],
    [0.28, 0.075, 3.2],
    [0.08, 0.18, 3.6],
    [0.2, 0.13, 3.4],
    [0.13, 0.3, 3.6],
    [0.12, 0.06, 3.8],
  ];
  let y0 = by;
  parts.forEach(([fh, fw, val], i) => {
    const ph = Math.max(1, Math.round(fh * h)), hw = Math.max(0.8, fw * h);
    for (let y = y0 - ph + 1; y <= y0; y++) {
      const t = (y0 - y) / ph;
      // the cap slopes up to its middle; the jewel is round
      const w = i === 4 ? hw * (1 - t * 0.7) : i === 5 ? hw * Math.sin((t * 0.9 + 0.1) * Math.PI) * 1.2 : hw;
      for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
        const u = (x + 0.5 - cx) / Math.max(0.5, w);
        if (Math.abs(u) > 1.05) continue;
        const win = i === 3 && Math.abs(u) < 0.45 && t > 0.25 && t < 0.8;
        let c = win ? LSTONE[0] : shade(LSTONE, val - u * 1.4 + (y === y0 - ph + 1 ? 0.8 : 0) + (hash2(x, y, seed) - 0.5) * 0.6, x, y);
        // moss on the cap and the base, lichen here and there
        if (!win && (i === 4 || i === 0) && t > 0.4 && hash2(x, y, seed + 1) < mossy) c = MOSS[1 + Math.floor(hash2(x, y, seed + 2) * 3)];
        b.set(x, y, c);
      }
    }
    if (i === 4) for (const side of [-1, 1]) b.set(Math.round(cx + side * (hw + 0.6)), y0 - 1, LSTONE[side < 0 ? 4 : 2]);
    y0 -= ph;
  });
}

// ---------------------------------------------------------------------------
// The ground plane, from the far meadows under the torii to the arena's front
// ---------------------------------------------------------------------------

const VY = 96, PK = 0.0058;
const pscale = (y: number) => Math.max(0.05, (y - VY) * PK);
const vOf = (y: number) => Math.log(Math.max(0.5, y - VY)) / PK;
const world = (x: number, y: number): [number, number] => [(x - 320) / pscale(y), vOf(y)];
const SPOTS = [...SPAWNS.player, ...SPAWNS.enemy];
/** how quiet: 1 under a champion's feet, 0 well away */
const quiet = (x: number, y: number) => Math.max(...SPOTS.map(([fx, fy]) => 1 - smooth(0.8, 1.8, Math.hypot((x - fx) / 46, (y - fy) / 23))));

/** The old lava flow's middle, in world units across, along the depth v: out of the hills, under the torii, between the two sides. */
const FLOW: [number, number][] = [[600, 40], [694, 30], [740, 6], [772, 0], [812, 10], [868, 24], [920, 4], [962, -16], [1010, -24]];
function flowU(v: number): number {
  if (v <= FLOW[0][0]) return FLOW[0][1];
  for (let i = 0; i < FLOW.length - 1; i++) {
    const [v0, u0] = FLOW[i], [v1, u1] = FLOW[i + 1];
    if (v <= v1) return u0 + (u1 - u0) * smooth(0, 1, (v - v0) / (v1 - v0));
  }
  return FLOW[FLOW.length - 1][1];
}
const flowHalf = (v: number) => 36 + (n1(v, 23, 61) - 0.5) * 10;
const pathX = (y: number) => 320 + flowU(vOf(y)) * pscale(y);

/** The stream from the pool under the cliff, east across the far meadow. */
const streamY = (x: number) => 170 + 5 * Math.sin((x - 150) / 58) - (x - 150) * 0.03;
const STREAM_X = [148, 600];

/** The near hot spring and the far one: the meadow gives way to them. */
const SPRING_FAR = { x: 476, y: 176, rx: 25, ry: 4.6 };

function plane(x: number, Y: number): RGBA {
  const [u, v] = world(x, Y);
  const q = quiet(x, Y);
  const far = Y < 196;
  // the old lava flow
  const half = flowHalf(v);
  const du = (u - flowU(v)) / half;
  const edge = Math.abs(du) + (vnoise(u, v, 7, 62) - 0.5) * 0.36 + (vnoise(u, v, 2.5, 63) - 0.5) * 0.12;
  if (edge < 1) {
    // ropes of the old flow, bowed toward us; cracked into plates; moss and grass in the cracks
    const ph = v * 0.34 - du * du * 7 + vnoise(u, v, 22, 64) * 5;
    const rope = Math.sin(ph);
    const crack = Math.abs(vnoise(u, v, 24, 65) - 0.5) < 0.026 || Math.abs(vnoise(u + 40, v, 15, 66) - 0.5) < 0.02;
    let val = 4 + rope * 0.5 + Math.cos(ph) * 0.35 - du * 0.35 + (vnoise(u, v, 60, 67) - 0.5) * 1 + (hash2(x, Y, 68) - 0.5) * 0.5;
    if (edge > 0.82) val -= 0.6;
    if (crack) {
      // moss in the wider cracks, in small cushions; elsewhere just a darker seam
      if (vnoise(u, v, 9, 69) > 0.68 && !far) return shade(MOSS, 1.8 + hash2(x, Y, 70) * 1.4, x, Y);
      val -= 1.1;
    }
    // a few flowers come up through it at its edges
    if (edge > 0.86 && hash2(x, Y, 71) > 0.93 && q < 0.4) return FLOWERS_NEAR[Math.floor(hash2(x, Y, 72) * 4)][1];
    return shade(LAVA, val, x, Y);
  }
  // the stream, under the far meadow
  if (Y < 192 && x >= STREAM_X[0] && x <= STREAM_X[1]) {
    const sy = streamY(x), hw = 9 * pscale(Y) * 0.5 + 0.8;
    const d = Math.abs(Y + 0.5 - sy);
    if (d < hw) return shade(WATER, 1.6 + (Y < sy ? 1 : 0) + (hash2(x, Y, 73) > 0.9 ? 1.6 : 0) + (sy - Y) * 0.1, x, Y);
    if (d < hw + 1) return MOSS[0];
  }
  const sp = Math.hypot((x - SPRING_FAR.x) / SPRING_FAR.rx, (Y - SPRING_FAR.y) / SPRING_FAR.ry);
  if (sp < 1) return shade(TURQ, 2.4 + (1 - sp) * 3.6 + (Y < SPRING_FAR.y ? 0.6 : 0) + (hash2(x, Y, 74) > 0.94 ? 1.4 : 0), x, Y);
  // the meadow: grass lit by the low sun from the left, calmer where the champions stand
  const sun = (320 - x) / 640;
  let val = 3.9 + sun * 0.7 + (vnoise(u, v, 90, 75) - 0.5) * 1.3 * (1 - q * 0.5) + (vnoise(u, v, 26, 76) - 0.5) * 0.7 * (1 - q * 0.6) + (hash2(x, Y, 77) - 0.5) * 0.45;
  // sunlit swathes and darker clover, the grass in clumps of blades: a lit stroke over a shaded one
  val += smooth(0.55, 0.8, vnoise(u, v, 34, 90)) * 0.7 * (1 - q * 0.5) - smooth(0.6, 0.85, vnoise(u + 50, v, 18, 91)) * 0.6 * (1 - q * 0.4);
  const clump = vnoise(u, v, 5, 92);
  const blade = hash2(x, Y >> 1, 78);
  if (clump > 0.55 && blade > 0.72) val += 0.9 * (1 - q * 0.5);
  else if (clump < 0.4 && blade < 0.22) val -= 0.9 * (1 - q * 0.5);
  else if (hash2(x >> 1, Y, 93) > 0.94) val -= 0.6;
  // petals fallen in the grass, thicker under the great cherry
  const fallen = 0.006 + smooth(470, 640, x) * smooth(200, 300, Y) * 0.05;
  if (!far && hash2(x, Y, 94) < fallen * (1 - q * 0.7)) return SAKURA[hash2(x, Y, 95) > 0.5 ? 5 : 6];
  // nearer the flow the grass is shorter, the rock showing through
  if (edge < 1.18 && hash2(x, Y, 79) < (1.18 - edge) * 2.4) return shade(LAVA, 3.6 + (hash2(x, Y, 80) - 0.5), x, Y);
  // wildflowers in drifts, thick away from the champions and out in the far fields
  const field = (far ? vnoise(x, Y * 3.2, 30, 81) * 0.6 + vnoise(x, Y * 4, 9, 82) * 0.4 - 0.04 : vnoise(u, v, 130, 81) * 0.7 + vnoise(u, v, 44, 82) * 0.3) + Math.max(0, Math.abs(x - 320) / 320 - 0.45) * 0.9;
  const hue = Math.floor(clamp((far ? vnoise(x + 300, Y * 3, 60, 83) : vnoise(u + 300, v, 170, 83)) * 1.4 - 0.2, 0, 0.999) * 4);
  const dens = smooth(0.52, 0.8, field) * (1 - q);
  if (dens > 0) {
    if (far) {
      if (dith(x, Y, dens * (0.45 + vnoise(x, Y * 2, 3, 84) * 0.7))) return FLOWERS_FAR[hue][Math.floor(hash2(x, Y, 85) * 2.99)];
    } else if (hash2(x, Y, 86) < dens * 0.34) {
      const F = FLOWERS_NEAR[hue];
      return hash2(x, Y, 87) < 0.3 ? F[2] : F[1];
    }
  }
  // a few loose stones of basalt
  if (!far && q < 0.3 && hash2(x >> 1, Y >> 1, 88) > 0.992) return BASALT[hash2(x, Y, 89) > 0.5 ? 3 : 5];
  return shade(MEADOW, val, x, Y);
}

// ---------------------------------------------------------------------------
// Backdrop
// ---------------------------------------------------------------------------

function volcTop(x: number): number {
  const dx = x - V.x;
  const d = Math.abs(dx) - V.crater;
  if (d <= 0) return V.top + 1 + (n1(x, 5, 11) - 0.5) * 2.6 + (Math.abs(dx) < 6 ? 1 : 0);
  const k = Math.min(1, d / ((dx < 0 ? V.l : V.r) - V.crater));
  return V.base - (V.base - V.top) * Math.pow(1 - k, 1.85) + (n1(x, 9, 12) - 0.5) * 1.8 * (1 - k);
}

function volcano(b: Bitmap) {
  for (let x = 0; x < 640; x++) {
    const top = volcTop(x);
    for (let y = Math.ceil(top); y < V.base; y++) {
      const dx = x - V.x;
      const e = clamp((V.base - y) / (V.base - V.top), 0, 1);
      const kk = 1 - Math.pow(e, 1 / 1.85);
      const Ry = V.crater + kk * ((dx < 0 ? V.l : V.r) - V.crater);
      const u = clamp(dx / Ry, -1, 1);
      // gullies run down the fall lines, fanning from the crater; their faces toward the sun lighter
      const ph = u * 30 + vnoise(x, y, 13, 13) * 2.6 + n1(u * 200, 14, 14) * 2;
      const rib = Math.sin(ph), ribFace = Math.cos(ph);
      const sun = 0.56 - u * 0.62 + (1 - kk) * 0.12;
      let v = 1 + sun * 7.4 + ribFace * 0.7 * (1 - kk * 0.6) + (hash2(x, y, 15) - 0.5) * 0.4;
      if (y - top < 1.2) v += 1.4;
      v += (vnoise(x, y * 3, 10, 18) - 0.5) * 1.2 * (1 - kk * 0.5);
      // old flows down some gullies, darker
      if (Math.sin(u * 13 + 0.7) > 0.94 && kk > 0.18) v -= 1.4;
      let c = shade(VOLC, v, x, y);
      // snow lying in the gullies near the top
      const snowLine = V.top + 12 + (rib < 0 ? -rib * 13 : 0) + (vnoise(x, y, 4, 16) - 0.5) * 7;
      if (y < snowLine && (rib < 0.2 || y < V.top + 9)) c = shade(VSNOW, sun * 4.4 + (y - top < 1.2 ? 1 : 0), x, y);
      // the fertile lower slopes: belts of distant blossom and forest
      if (kk > 0.6) {
        const belt = vnoise(x, y * 2.6, 9, 17);
        if (belt > 0.6) c = shade(FARBLOOM, sun * 3.4 + (belt - 0.6) * 4, x, y);
        else if (belt < 0.3) c = shade(FARHILL, sun * 4 + 0.6, x, y);
      }
      // the haze at its foot
      const haze = smooth(0.66, 1, kk);
      if (haze > 0 && dith(x, y, haze * 0.75)) c = shade(HAZE, 1 + sun * 2, x, y);
      b.set(x, y, c);
    }
  }
}

function cloudBank(b: Bitmap, cx: number, by: number, w: number, h: number, seed: number) {
  const r = rng(seed);
  const n = Math.max(3, Math.round(w / 10));
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const px = cx - w / 2 + t * w + (r() - 0.5) * 6;
    const pr = 3 + Math.sin(t * Math.PI) * h * (0.6 + r() * 0.5);
    ellipseFill(b, px, by - pr * 0.5, pr * 1.3, pr, (x, y) => {
      if (y > by) return 0;
      // the sun is low and to the left: the rims toward it glow
      const toSun = Math.hypot(x - SUN_X, y - SUN_Y);
      const v = 4.6 - (y - (by - pr * 1.5)) / (pr * 1.5) * 3 - (x - px) / pr * 0.8 + Math.max(0, 1 - toSun / 260) * 1.4 + (hash2(x, y, seed) - 0.5) * 0.4;
      return shade(CLOUD, v, x, y);
    });
  }
}

/** A long bank of cloud lying across the volcano's middle, thin and torn, lit on its upper edge. */
function cloudBand(b: Bitmap) {
  for (let x = 176; x < 600; x++) {
    const k = (x - 176) / 424;
    const mid = 98 - k * 10 + (n1(x, 40, 21) - 0.5) * 6;
    const th = 1.4 + Math.sin(k * Math.PI) * 4.5 * (0.5 + n1(x, 23, 22));
    for (let y = Math.floor(mid - th); y <= mid + th; y++) {
      const a = (1 - Math.abs(y + 0.5 - mid) / (th + 0.5)) * (0.55 + vnoise(x, y, 6, 23) * 0.7);
      if (a <= 0 || !dith(x, y, a)) continue;
      b.set(x, y, shade(CLOUD, 3.4 + (y < mid ? 2.2 : 0) - k * 1.2 + (y < mid - th * 0.5 ? 0.8 : 0), x, y));
    }
  }
}

const hillA = (x: number) => 128 + (n1(x, 62, 41) - 0.5) * 12 + (n1(x, 19, 42) - 0.5) * 4;
const hillB = (x: number) => 148 + (n1(x, 46, 51) - 0.5) * 10 + (n1(x, 13, 52) - 0.5) * 3 - 13 * Math.exp(-(((x - 214) / 32) ** 2)) - 7 * Math.exp(-(((x - 548) / 44) ** 2));
const hillBFoot = (x: number) => 161 + (n1(x, 30, 53) - 0.5) * 4;

function hills(b: Bitmap) {
  for (let x = 0; x < 640; x++) {
    const t = hillA(x), slope = hillA(x + 2) - hillA(x - 2);
    for (let y = Math.ceil(t); y < 158; y++) {
      let c = shade(FARHILL, 3 - slope * 0.5 + (y - t < 1.5 ? 1.2 : 0) - (y - t) / 18, x, y);
      if (vnoise(x, y * 2, 5, 43) > 0.64) c = shade(FARBLOOM, 1.4 - slope * 0.4 + (y - t < 2 ? 1 : 0), x, y);
      b.set(x, y, c);
    }
  }
}

/** The near hills: meadow over them, drifts of flowers, the old flow coming over the crest. */
function hillsNear(b: Bitmap) {
  for (let x = 0; x < 640; x++) {
    const t = hillB(x), f = hillBFoot(x), slope = hillB(x + 2) - hillB(x - 2);
    for (let y = Math.ceil(t); y < f; y++) {
      const d = y - t;
      let c = shade(HILLG, 3.2 - slope * 0.45 + (d < 1.5 ? 1.4 : 0) + (vnoise(x, y, 7, 54) - 0.5) * 1.2 - d * 0.04, x, y);
      const field = vnoise(x, y * 2.2, 16, 55);
      if (field > 0.6 && dith(x, y, (field - 0.6) * 3)) c = FLOWERS_FAR[Math.floor(vnoise(x + 90, y, 40, 56) * 3.99)][Math.floor(hash2(x, y, 57) * 2.99)];
      // the flow comes over the crest and down to the meadow
      const fx = 306 + (y - t) * 0.9 + Math.sin(y * 0.3) * 1.5;
      if (Math.abs(x - fx) < 2.2 + d * 0.12) c = shade(LAVA, 3.4 + (x < fx ? 0.6 : -0.4), x, y);
      b.set(x, y, c);
    }
  }
}

/** The basalt cliff on the left: columns standing side by side, stepped at the top, cut across by fractures. */
const COL_W = 7;
const cliffBase = (x: number) => 74 + Math.pow(Math.max(0, x) / 184, 2.3) * 86 + (n1(x, 23, 71) - 0.5) * 6;
const colTop = (c: number) => cliffBase(c * COL_W + 3.5) + (hash2(c, 0, 72) - 0.5) * 6;
const CLIFF_FOOT = 168;
const FALLS = [{ x: 76, w: 7 }, { x: 140, w: 6 }];

function cliff(b: Bitmap) {
  for (let x = 0; x < 186; x++) {
    const c = Math.floor(x / COL_W);
    const top = Math.round(colTop(c));
    if (top >= CLIFF_FOOT) continue;
    const u = (x - c * COL_W) / COL_W;
    for (let y = top; y < CLIFF_FOOT; y++) {
      const d = y - top;
      // the prism's faces: the sunward one lit, the front in half light, a dark joint between columns
      let v = u < 0.3 ? 5.6 : u < 0.82 ? 3.9 : 2.3;
      if (u > 0.9) v = 1;
      v += (hash2(c, 9, 73) - 0.5) * 1.2 + (vnoise(x, y, 6, 73) - 0.5) * 1.1 + (hash2(x, y, 73) - 0.5) * 0.5 - d * 0.01;
      const fr = (y + hash2(c, 1, 74) * 30) % (10 + Math.floor(hash2(c, 2, 74) * 7));
      if (fr < 1) v = 1;
      else if (fr < 2) v += 0.8;
      // the cap of each column catches the sun
      if (d < 2) v = u < 0.82 ? 6 : 3.4;
      let col = shade(BASALT, v, x, y);
      // moss and grass on the tops, ivy trailing down
      if (d < 3 + hash2(c, 3, 75) * 3 && hash2(c, 4, 75) > 0.25) col = shade(MEADOW, 4.4 - d * 0.5 + (u < 0.4 ? 1 : 0), x, y);
      else if (d < 30 && hash2(x, 6, 76) * 34 > d + 4 && hash2(c, 5, 76) > 0.4) col = shade(MEADOW, 3 + (u < 0.4 ? 1.4 : 0) + (hash2(x, y, 80) - 0.5) * 1.4, x, y);
      else if (vnoise(x, y, 8, 81) > 0.74 && hash2(x, y, 82) > 0.4) col = MOSS[1 + (u < 0.4 ? 2 : 0)];
      // wet and dark under the falls
      for (const f of FALLS) if (Math.abs(x - f.x) < f.w * 0.5 + 2 && y > colTop(Math.floor(f.x / COL_W))) col = hash2(x, y, 77) > 0.9 ? BASALT[5] : BASALT[1];
      // the spray hangs at the cliff's foot
      if (y > CLIFF_FOOT - 18 && dith(x, y, (y - CLIFF_FOOT + 18) / 26)) col = HAZE[1 + Math.floor(hash2(x, y, 78) * 2)];
      b.set(x, y, col);
    }
  }
  // a crevice where the minerals glow
  for (const [mx, my] of [[22, 128], [96, 144], [112, 126]] as const) {
    for (let k = 0; k < 7; k++) {
      const x = mx + Math.round(Math.sin(k * 1.3) * 1.2), y = my + k;
      b.set(x, y, BASALT[0]);
      if (hash2(k, mx, 79) > 0.45) b.set(x + 1, y, MINERAL[k % 3 === 0 ? 3 : 2]);
    }
  }
}

/** The pool under the falls: dark where it is deep, turquoise round its rim, foam where the water lands. */
function pool(b: Bitmap) {
  ellipseFill(b, 98, 167, 72, 6, (x, y, d) => (d > 0.86 ? shade(BASALT, 3 - (y - 167) * 0.2, x, y) : shade(TURQ, 1.6 + d * 3 + (y < 167 ? -0.4 : 0.4) + (hash2(x, y, 81) > 0.95 ? 2 : 0), x, y)));
  for (const f of FALLS) for (let k = 0; k < 24; k++) {
    const x = f.x - f.w + Math.round(hash2(k, 0, 82 + f.x) * f.w * 2), y = 164 + Math.round(hash2(k, 1, 82 + f.x) * 4);
    b.set(x, y, TURQ[7]);
  }
}

/** The red arched bridge over the stream, its reflection broken in the water. */
function bridge(b: Bitmap, cx: number, cy: number, half: number) {
  const rise = half * 0.36;
  for (let x = Math.floor(cx - half); x <= cx + half; x++) {
    const t = (x - cx) / half;
    const y = Math.round(cy - rise * (1 - t * t));
    b.set(x, y, shade(BARK, 3.6 - t, x, y));
    b.set(x, y + 1, shade(VERM, 1.6, x, y + 1));
    // the rail and its posts
    b.set(x, y - 3, shade(VERM, 3.6 - t * 0.8, x, y - 3));
    if (Math.round(x - cx + half) % 4 === 0) for (let k = 1; k < 4; k++) b.set(x, y - k, VERM[k === 3 ? 4 : 2]);
    // under the arch, in shade; its reflection
    for (let k = 2; k < 2 + (1 - t * t) * 2; k++) b.set(x, y + k, BARK[1]);
    if (dith(x, cy + 2, 0.4)) b.set(x, Math.round(cy + 2 + rise * (1 - t * t) * 0.5), VERM[1]);
  }
}

/** Little blossom trees over the hills and the far meadow, and dark pines among them. */
const GROVE: [number, number, number, number][] = [
  // [x, ground y, size, tone: 0 pink, 1 white, 2 lavender, 3 pine]
  [188, 150, 6, 0], [198, 147, 5, 1], [234, 144, 6, 0], [248, 149, 4, 2], [262, 151, 5, 3], [278, 152, 4, 0],
  [364, 151, 4, 1], [384, 150, 5, 0], [404, 152, 4, 3], [424, 150, 6, 2], [446, 151, 5, 0], [470, 152, 4, 1],
  [512, 146, 6, 0], [532, 142, 5, 3], [556, 141, 6, 1], [580, 145, 5, 0], [606, 148, 6, 2], [628, 150, 5, 0],
  [214, 162, 7, 0], [252, 166, 6, 1], [392, 172, 7, 0], [430, 168, 6, 2], [526, 170, 7, 0], [560, 176, 6, 1], [600, 172, 7, 0],
];
const TONES = [SAKURA, WHITEBLOOM, LAVBLOOM];

function backdropBase(): Bitmap {
  const b = new Bitmap(640, 200);
  for (let y = 0; y < HZ + 20; y++) {
    for (let x = 0; x < 640; x++) {
      const glow = Math.max(0, 1 - Math.hypot(x - SUN_X, (y - SUN_Y) * 1.15) / 200);
      // the sun's rays, slanting down through the haze
      const dist = Math.hypot(x - SUN_X, y - SUN_Y);
      const ang = Math.atan2(y - SUN_Y, x - SUN_X);
      const ray = dist > 16 ? smooth(0.5, 0.9, n1(ang * 40, 7, 31)) * Math.max(0, 1 - dist / 380) * smooth(16, 70, dist) : 0;
      b.set(x, y, shade(SKY, Math.pow(Math.min(y, HZ) / HZ, 1.15) * 11 + glow * 2.4 + ray * 0.75, x, y));
    }
  }
  ellipseFill(b, SUN_X, SUN_Y, 30, 30, (x, y, d) => (dith(x, y, (1 - d) * 0.8) ? shade(SKY, 11, x, y) : 0));
  ellipseFill(b, SUN_X, SUN_Y, 9, 9, (x, y, d) => rampDither(SUN, 3 - d * 1.6, x, y));
  // layered clouds: a bank low behind the volcano, wisps up near the sun
  cloudBank(b, 520, 122, 150, 10, 101);
  cloudBank(b, 210, 116, 90, 7, 102);
  cloudBank(b, 40, 70, 80, 8, 103);
  cloudBank(b, 168, 30, 70, 6, 104);
  volcano(b);
  cloudBand(b);
  hills(b);
  // the plane from the far meadows down
  for (let y = 146; y < 200; y++) for (let x = 0; x < 640; x++) b.set(x, y, plane(x, y));
  hillsNear(b);
  // what stands out there, back to front
  const things: { y: number; draw: () => void }[] = [];
  for (const [x, y, s, tone] of GROVE) {
    if (tone === 3) things.push({ y, draw: () => blackPine(b, x, y, s * 2.6, 0.12, x) });
    else things.push({ y, draw: () => blossomTree(b, x, y, s, TONES[tone], x * 7 + y, -0.4) });
  }
  things.push({ y: 137, draw: () => pagoda(b, 214, 137, 74, -0.2) });
  things.push({ y: SPRING_FAR.y, draw: () => {
    // the far spring's rim of black rock
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * Math.PI * 2;
      const x = SPRING_FAR.x + Math.cos(a) * (SPRING_FAR.rx + 1), y = SPRING_FAR.y + Math.sin(a) * (SPRING_FAR.ry + 0.6);
      ellipseFill(b, x, y, 2.2, 1.4, (px, py) => shade(BASALT, 4 - (px - x) - (py - y), px, py));
    }
  } });
  const bx = 214;
  things.push({ y: streamY(bx) + 1, draw: () => bridge(b, bx, streamY(bx), 15) });
  for (const [dx, y, h] of [[-15, 170, 10], [15, 171, 10], [-17, 180, 13], [18, 181, 13]] as const) things.push({ y, draw: () => lantern(b, pathX(y) + dx * pscale(y) * 2.2, y, h, y * 3 + dx, 0.4) });
  const ty = 186;
  things.push({ y: ty, draw: () => torii(b, pathX(ty), ty, 50) });
  things.sort((p, q) => p.y - q.y).forEach((t) => t.draw());
  // the cliff in front of it all on the left, and what grows on it
  cliff(b);
  pool(b);
  shrine(b, 44, Math.round(colTop(6)) + 1, 30, 0.2);
  blackPine(b, 120, Math.round(colTop(17)) + 2, 30, 0.42, 91);
  blossomTree(b, 16, Math.round(colTop(2)) + 2, 9, SAKURA, 92);
  blossomTree(b, 100, Math.round(colTop(14)) + 2, 6, WHITEBLOOM, 93);
  blossomTree(b, 160, Math.round(colTop(22)) + 2, 8, SAKURA, 94);
  return b;
}

let cached: Bitmap | undefined;
const backdrop = () => (cached ??= backdropBase());

// ---------------------------------------------------------------------------
// The floor and what stands on it
// ---------------------------------------------------------------------------

const FLOOR = { w: 640, h: 168 };

function floorGround(): Bitmap {
  const b = new Bitmap(FLOOR.w, FLOOR.h);
  for (let y = 0; y < FLOOR.h; y++) for (let x = 0; x < FLOOR.w; x++) b.set(x, y, plane(x, y + 192));
  return b;
}

/** The great cherry, ancient: a twisted trunk leaning in from the right, a crown of blossom over the corner. Frames sway it a little. */
const TREE = { w: 240, h: 264, bx: 174 };
function greatCherry(n = 6): Bitmap[] {
  const { w, h, bx } = TREE;
  const by = h - 4;
  const trunk: [number, number, number][] = [[bx, by, 10], [bx - 2, by - 22, 8], [bx + 6, by - 48, 7.5], [bx - 6, by - 76, 7], [bx - 18, by - 104, 6.4], [bx - 34, by - 132, 6], [bx - 44, by - 160, 5.4]];
  const branches: [number, number, number][][] = [
    [[bx - 34, by - 132, 4.8], [bx - 70, by - 160, 3.6], [bx - 112, by - 182, 2.8], [bx - 150, by - 194, 2], [bx - 186, by - 196, 1.3]],
    [[bx - 44, by - 160, 4.4], [bx - 40, by - 196, 3.4], [bx - 54, by - 224, 2.4], [bx - 70, by - 244, 1.5]],
    [[bx - 18, by - 104, 4.4], [bx + 14, by - 140, 3.4], [bx + 34, by - 176, 2.6], [bx + 52, by - 204, 1.6]],
    [[bx - 6, by - 76, 3.4], [bx + 30, by - 96, 2.6], [bx + 56, by - 112, 1.8]],
  ];
  // the clumps of blossom along the outer limbs, kept above the champions' bars on the left
  const r = rng(1101);
  const clumps: { x: number; y: number; rx: number; ry: number; sway: number; ph: number; back: boolean }[] = [];
  for (const br of branches) {
    for (let i = 1; i < br.length; i++) {
      const [x0, y0] = br[i - 1], [x1, y1] = br[i];
      for (const t of [0.3, 0.8]) {
        const x = x0 + (x1 - x0) * t + (r() - 0.5) * 16, y = y0 + (y1 - y0) * t + (r() - 0.5) * 12 - 6;
        const rx = 16 + r() * 12;
        clumps.push({ x, y, rx, ry: rx * 0.66, sway: clamp((bx - x) / 160, 0.2, 1), ph: r() * Math.PI * 2, back: r() < 0.4 });
      }
    }
  }
  for (const c of clumps) if (c.x < 120) c.y = Math.min(c.y, 96 - c.ry);
  clumps.push({ x: bx - 60, y: 50, rx: 30, ry: 20, sway: 0.5, ph: 1, back: true }, { x: bx - 120, y: 70, rx: 26, ry: 16, sway: 0.8, ph: 2, back: true });
  clumps.sort((p, q) => Number(q.back) - Number(p.back) || p.y - q.y);
  const out: Bitmap[] = [];
  for (let f = 0; f < n; f++) {
    const b = new Bitmap(w, h);
    // its shadow on the grass, cast away from the sun
    ellipseFill(b, bx + 22, by + 1, 40, 4, (x, y, d) => (dith(x, y, (1 - d) * 1.3) ? withAlpha(MEADOW[0], 190) : 0));
    // roots flaring into the ground
    for (const [dx, l] of [[-1, 16], [1, 20], [0.4, 10]] as const) limb(b, [[bx, by - 4, 6], [bx + dx * l, by + 1, 2]], BARK, 2.4, 1102 + l);
    limb(b, trunk, BARK, 2.6, 1103);
    for (const br of branches) limb(b, br, BARK, 2.4, 1104);
    // the bark's bands, lighter, across the trunk
    for (const [x, y, rr] of trunk) for (let k = -rr; k <= rr; k += 3) b.set(Math.round(x + k * 0.2), Math.round(y + k), BARK[4]);
    for (const c of clumps) {
      const dx = Math.round(Math.sin((f / n) * Math.PI * 2 + c.ph) * 1.4 * c.sway);
      blossom(b, c.x + dx, c.y, c.rx, c.ry, SAKURA, 1110 + Math.round(c.x + c.y), c.back ? -1 : 0.3);
    }
    out.push(b);
  }
  return out;
}

const ONSEN = { w: 104, h: 56 };
/** The hot spring at the arena's left edge: a ring of black boulders, turquoise water, a bamboo spout trickling in. */
function onsen(): Bitmap {
  const { w, h } = ONSEN;
  const b = new Bitmap(w, h);
  const cx = 48, cy = 36;
  ellipseFill(b, cx, cy, 44, 13, (x, y, d) => {
    const ripple = Math.sin(Math.hypot((x - cx) / 3, (y - cy) * 1.2) * 1.3) > 0.85 ? 0.8 : 0;
    return shade(TURQ, 1.4 + d * 3.8 + (y < cy - 6 ? 1 : 0) + ripple + (hash2(x, y, 1131) > 0.96 ? 1.6 : 0), x, y);
  });
  const r = rng(1132);
  for (let k = 0; k < 30; k++) {
    const a = (k / 30) * Math.PI * 2 + (r() - 0.5) * 0.2;
    const x = cx + Math.cos(a) * 46, y = cy + Math.sin(a) * 15;
    const rr = 4 + r() * 4;
    ellipseFill(b, x, y, rr, rr * 0.7, (px, py, d) => {
      const v = 4.4 - ((px - x) / rr + (py - y) / (rr * 0.7)) * 1.6 - d * 0.8 + (hash2(px, py, 1133) - 0.5) * 0.6;
      if (py < y - rr * 0.3 && hash2(px, py, 1134) < 0.5) return MOSS[1 + Math.floor(hash2(px, py, 1135) * 3)];
      return shade(BASALT, v, px, py);
    });
  }
  // the spout: a length of bamboo on a forked stick
  for (let k = 0; k < 18; k++) {
    const x = 80 + k * 0.9, y = 16 - k * 0.5;
    b.set(Math.round(x), Math.round(y), MOSS[k % 6 === 0 ? 1 : 3]);
    b.set(Math.round(x), Math.round(y) + 1, MOSS[1]);
  }
  for (let y = 14; y < 24; y++) b.set(92, y, BARK[3]);
  for (let y = 17; y < 27; y++) if (dith(80, y, 0.7)) b.set(80, y, TURQ[7]);
  return b;
}

/** Giant flowers by the vent: tall stems curving up, a crimson lily, a violet bell hanging, a gold cup; their hearts glow faintly. */
function ventFlowers(): Bitmap {
  const b = new Bitmap(70, 92);
  const stems: [number, number, number, number][] = [[20, 88, 14, 18], [34, 88, 40, 6], [50, 88, 58, 28]];
  for (const [x0, y0, x1, y1] of stems) {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push([x0 + (x1 - x0) * t * t, y0 + (y1 - y0) * t, 1.6 - t * 0.6]);
    }
    limb(b, pts, MOSS, 2.4, x0);
  }
  // broad leaves at the foot
  for (const [x, a, l] of [[16, -2.4, 22], [30, -2.0, 18], [44, -1.1, 20], [56, -0.6, 18]] as const) {
    polyFill(b, [[x, 88], [x + Math.cos(a - 0.3) * l * 0.5, 88 + Math.sin(a - 0.3) * l * 0.5], [x + Math.cos(a) * l, 88 + Math.sin(a) * l], [x + Math.cos(a + 0.3) * l * 0.5, 88 + Math.sin(a + 0.3) * l * 0.5]], (px, py) => shade(MEADOW, 3.6 - (px - x) * 0.05 + (88 - py) * 0.08, px, py));
  }
  // the crimson lily: six pointed petals round a glowing heart
  const lily = (cx: number, cy: number, r: number, F: RGBA[]) => {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      polyFill(b, [[cx, cy], [cx + Math.cos(a - 0.34) * r * 0.6, cy + Math.sin(a - 0.34) * r * 0.45], [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.72], [cx + Math.cos(a + 0.34) * r * 0.6, cy + Math.sin(a + 0.34) * r * 0.45]], (px, py) => shade(F, 1.4 - (px - cx) * 0.06 - (py - cy) * 0.08 + (Math.hypot(px - cx, py - cy) / r) * 0.6, px, py));
    }
    ellipseFill(b, cx, cy, r * 0.22, r * 0.18, (px, py, d) => rampDither(MINERAL, 4 - d * 2, px, py));
  };
  lily(14, 16, 13, FLOWERS_FAR[0]);
  lily(58, 26, 11, FLOWERS_FAR[2]);
  // the violet bell, hanging from its stem's tip: a flared mouth, ribbed, its heart glowing
  const bx = 41, bt = 6;
  for (let y = bt; y < bt + 15; y++) {
    const t = (y - bt) / 15;
    // narrow at the stem, round shoulders, the mouth flaring
    const hw = 1.6 + Math.sqrt(t) * 5 + Math.max(0, t - 0.75) * 12;
    for (let x = Math.floor(bx - hw); x <= Math.ceil(bx + hw); x++) {
      const uu = (x + 0.5 - bx) / hw;
      if (Math.abs(uu) > 1) continue;
      b.set(x, y, shade(FLOWERS_FAR[1], 2.2 - uu * 1.2 - t * 0.4 + (Math.round(uu * 3) % 2 ? -0.3 : 0), x, y));
    }
  }
  for (let x = bx - 8; x <= bx + 8; x++) if ((x - bx + 8) % 4 < 2) b.set(x, bt + 15, FLOWERS_FAR[1][0]);
  ellipseFill(b, bx, bt + 14, 2.4, 1.2, (x, y, d) => rampDither(MINERAL, 4 - d * 2, x, y));
  return b;
}

const FISSURE = { w: 86, h: 24 };
/** A fissure in the near meadow: black lips of rock, deep dark within, minerals glowing amber in it (frame 1: brighter). */
function fissure(): Bitmap[] {
  const { w, h } = FISSURE;
  return [0, 1].map((f) => {
    const b = new Bitmap(w, h);
    for (let x = 4; x < w - 4; x++) {
      const k = Math.abs(x - w / 2) / (w / 2 - 4);
      const mid = 13 + (n1(x, 9, 1141) - 0.5) * 6;
      const half = (1 - k * k) * 4.6 + 0.6;
      for (let y = Math.floor(mid - half - 2); y <= mid + half + 2; y++) {
        const d = Math.abs(y + 0.5 - mid) - half;
        if (d < 0) {
          const glow = hash2(x, y, 1142) > 0.8 && Math.abs(y + 0.5 - mid) < half * 0.6;
          b.set(x, y, glow ? MINERAL[f ? 3 + (hash2(x, y, 1143) > 0.6 ? 1 : 0) : 1 + (hash2(x, y, 1143) > 0.6 ? 1 : 0)] : BASALT[y < mid ? 0 : 1]);
        } else if (d < 2) b.set(x, y, shade(BASALT, (y < mid ? 5 : 3) - d, x, y));
      }
      if (f && hash2(x, 0, 1144) > 0.7) b.set(x, Math.round(mid), MINERAL[2]);
    }
    return b;
  });
}

/** A basalt boulder, moss over its top. */
function boulder(w: number, hh: number, seed: number): Bitmap {
  const b = new Bitmap(w + 6, hh + 4);
  const cx = w / 2 + 2, cy = hh * 0.55 + 1;
  ellipseFill(b, cx + 2, hh + 1, w * 0.55, 2, (x, y, d) => (dith(x, y, (1 - d) * 1.2) ? withAlpha(MEADOW[0], 180) : 0));
  ellipseFill(b, cx, cy, w / 2, hh * 0.55, (x, y, d) => {
    const nx = (x + 0.5 - cx) / (w / 2), ny = (y + 0.5 - cy) / (hh * 0.55);
    if (ny < -0.2 + (vnoise(x, y, 3, seed) - 0.5) * 0.6) return shade(MOSS, 2.6 - nx - ny, x, y);
    return shade(BASALT, 4.4 - (nx + ny) * 1.8 - d * 0.6 + (hash2(x, y, seed) - 0.5) * 0.6, x, y);
  });
  return b;
}

/** Wildflowers crowding into the near right corner. */
function cornerFlowers(): Bitmap {
  const W = 124, HH = 52;
  const b = new Bitmap(W, HH);
  const r = rng(1151);
  // blades of grass, leaning a little with the wind, longer toward the corner
  for (let i = 0; i < 260; i++) {
    const x0 = Math.pow(r(), 0.6) * W;
    const k = x0 / W;
    const len = 6 + k * k * 34 * (0.5 + r() * 0.6);
    const lean = 0.2 + r() * 0.3;
    const lit = r() < 0.4;
    for (let t = 0; t < len; t++) {
      const x = Math.round(x0 + lean * t * (t / len)), y = HH - 1 - t;
      b.set(x, y, shade(MEADOW, (lit ? 4.4 : 2.4) + (t / len) * 1.2 - (1 - t / len), x, y));
    }
  }
  // flower heads on their stalks: crimson, violet, gold, pale pink
  for (let i = 0; i < 22; i++) {
    const x = 20 + Math.pow(r(), 0.7) * (W - 24), k = x / W;
    const y = HH - 8 - k * k * 30 * (0.4 + r() * 0.7);
    const F = FLOWERS_FAR[Math.floor(r() * 3.99)];
    for (let yy = Math.round(y); yy < HH; yy++) b.set(Math.round(x), yy, MOSS[2]);
    const rr = 1.6 + r() * 1.4;
    ellipseFill(b, x, y, rr, rr * 0.8, (px, py, d) => shade(F, 2.2 - d * 1.4 - (px - x) * 0.3 - (py - y) * 0.3, px, py));
    b.set(Math.round(x), Math.round(y), MINERAL[3]);
  }
  return b;
}

// ---------------------------------------------------------------------------
// What moves
// ---------------------------------------------------------------------------

/** A waterfall: pale threads running down, spray at its foot (a loop). */
function fall(w: number, hh: number, n: number, seed: number): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    for (let x = 0; x < w; x++) {
      const k = Math.abs(x + 0.5 - w / 2) / (w / 2);
      if (k > 0.9) continue;
      const fast = hash2(x, 1, seed) > 0.5 ? 2 : 1;
      for (let y = 0; y < hh - 2; y++) {
        const p = (((y - (i / n) * hh * fast) / 10 + hash2(x, 0, seed) * 4) % 1 + 1) % 1;
        b.set(x, y, p < 0.3 ? WATER[4] : p < 0.62 ? WATER[3] : WATER[1 + (x % 2)]);
      }
    }
    for (let k = 0; k < w * 2; k++) b.set(Math.round(hash2(k, i, seed) * (w - 1)), hh - 1 - Math.floor(hash2(k, i + 9, seed) * 4), WATER[4]);
    out.push(b);
  }
  return out;
}

/**
 * Wisps rising and curling (a loop): `lean` px a step to the right with the
 * wind, swelling and thinning as they climb; `R` its ramp, lit on the side
 * toward the sun.
 */
function wisps(w: number, hh: number, seed: number, R: RGBA[], lean: number, n = 24, puffs = 5, r0 = 1.6): Bitmap[] {
  const out: Bitmap[] = [];
  const ox = 4 + (lean < 0 ? w - 12 : 0);
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, hh);
    const list = Array.from({ length: puffs }, (_, k) => ({ k, t: (i / n + k / puffs) % 1 })).sort((p, q) => q.t - p.t);
    for (const { k, t } of list) {
      const x = ox + t * t * lean * (hh - 6) + Math.sin(t * 6 + k * 1.9 + seed) * 2, y = hh - 3 - t * (hh - 7);
      const rad = r0 + t * (r0 * 2.4);
      const a = Math.pow(1 - t, 0.6) * 1.5;
      ellipseFill(b, x, y, rad * 1.1, rad * 0.8, (px, py, d) => (dith(px, py, a * (1.5 - d * 1.1)) ? R[Math.round(clamp(R.length - 1.6 - t * 1.4 - ((px - x) / rad) * 0.7 - ((py - y) / rad) * 0.5, 0, R.length - 1))] : 0));
    }
    out.push(b);
  }
  return out;
}

const SMOKE_BOX = { w: 132, h: 36 };
/** The thin smoke off the crater (a loop): it rises a little, then lies away east on the wind, widening and thinning; lit on its sunward side. */
function volcSmoke(n = 32): Bitmap[] {
  const { w, h } = SMOKE_BOX;
  const P_N = 26;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(w, h);
    const puffs = Array.from({ length: P_N }, (_, k) => ({ k, a: (i / n + k / P_N) % 1 })).sort((p, q) => q.a - p.a);
    for (const { k, a } of puffs) {
      const cx = 5 + Math.pow(a, 1.25) * (w - 18) + Math.sin(a * 7 + k) * 1.2;
      const cy = h - 4 - (1 - Math.pow(1 - Math.min(1, a * 1.8), 2)) * 20 + a * 4 + Math.sin(a * 5 + k * 0.7) * 1.4;
      const r = 1.6 + a * 6;
      const dens = Math.pow(1 - a, 0.7) * 1.25;
      ellipseFill(b, cx, cy, r * 1.3, r * 0.7, (x, y, d) => {
        if (!dith(x, y, dens * (1.1 - d * d))) return 0;
        return SMOKEV[Math.round(clamp(3.2 - ((x - cx) / r) * 0.8 - ((y - cy) / r) * 1.1 - a * 1.4 + (hash2(x, y, k) - 0.5) * 0.6, 0, 4))];
      });
    }
    out.push(b);
  }
  return out;
}

function cloud(w: number, hh: number, seed: number): Bitmap[] {
  const b = new Bitmap(w, hh);
  const r = rng(seed);
  const n = Math.round(w / 9);
  const base = hh - 2;
  for (let i = 0; i < n; i++) {
    const px = 8 + (i / n) * (w - 16), rr = 3 + Math.sin((i / n) * Math.PI) * hh * 0.42 * (0.7 + r() * 0.5);
    ellipseFill(b, px, base - rr * 0.55, rr * 1.2, rr, (x, y) => {
      if (y > base) return b.get(x, y);
      return rampDither(CLOUD, clamp(5.6 - ((y - (base - rr * 1.5)) / (rr * 1.5)) * 3.4 - (x - px) * 0.02, 0, 6), x, y);
    });
  }
  return [b];
}

/** A crane gliding: white, black flight feathers, neck stretched out, legs trailing, a red crown (the runtime circles them). */
function cranes(): Bitmap[] {
  return [3, 1, -1, 1].map((lift) => {
    const b = new Bitmap(25, 11);
    for (let i = 0; i <= 9; i++) {
      const y = Math.round(5 - lift * (i / 9) + (i > 7 ? 1 : 0));
      const tip = i > 6;
      b.set(12 - i, y, tip ? BASALT[1] : WHITEBLOOM[6]);
      b.set(12 + i, y, tip ? BASALT[1] : WHITEBLOOM[4]);
    }
    for (let k = 1; k <= 5; k++) b.set(12 + k, 6, WHITEBLOOM[k < 4 ? 5 : 1]);
    b.set(18, 6, VERM[3]);
    for (let k = 1; k <= 5; k++) b.set(12 - k, 6, BASALT[k > 3 ? 2 : 1]);
    b.set(12, 6, WHITEBLOOM[5]);
    return b;
  });
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

function meadowTile(seed0: number): Painter {
  return (b, seed) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) b.set(x, y, rampDither(MEADOW, 4 + (hash2(x, y, seed + seed0) - 0.5) * 1.2, x, y));
  };
}
const P: Record<string, Painter> = { meadow_a: meadowTile(1), meadow_b: meadowTile(2), meadow_c: meadowTile(3) };

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const r = rng(1161);
  const plain = ['meadow_a', 'meadow_b', 'meadow_c'];
  for (let row = 6; row < MAP_ROWS; row++) for (let c = 0; c < MAP_COLS; c++) ground[row * MAP_COLS + c] = id(plain[Math.floor(r() * plain.length)]);
  const props: PropPlacement[] = [
    // far: clouds high up, the smoke off the crater, the waterfalls, the far spring's steam
    { kind: 'cloud_a', x: 250, y: 22, layer: 'far' },
    { kind: 'cloud_b', x: 520, y: 30, layer: 'far' },
    { kind: 'cloud_c', x: 40, y: 18, layer: 'far' },
    { kind: 'smoke', x: V.x - 4, y: V.top + 3, layer: 'far' },
    ...FALLS.map((f, i) => ({ kind: i ? 'fall_b' : 'fall_a', x: f.x, y: Math.round(colTop(Math.floor(f.x / COL_W))) + 1, layer: 'far' as const })),
    { kind: 'steam_far', x: SPRING_FAR.x, y: SPRING_FAR.y, layer: 'far' },
    // floor: the meadow, then what stands on it, far to near
    { kind: 'ground', x: 0, y: 192, layer: 'floor' },
    { kind: 'rock_a', x: 106, y: 202, layer: 'floor' },
    { kind: 'lantern_a', x: Math.round(pathX(214)) - 50, y: 214, layer: 'floor' },
    { kind: 'lantern_b', x: Math.round(pathX(214)) + 46, y: 214, layer: 'floor' },
    { kind: 'cherry', x: 604, y: 262, layer: 'floor' },
    { kind: 'bloom_vent', x: 34, y: 240, layer: 'floor' },
    { kind: 'rock_b', x: 628, y: 312, layer: 'floor' },
    { kind: 'onsen', x: 0, y: 292, layer: 'floor' },
    { kind: 'steam_onsen', x: 40, y: 280, layer: 'floor' },
    { kind: 'fissure', x: 428, y: 354, layer: 'floor' },
    { kind: 'steam_fissure', x: 426, y: 348, layer: 'floor' },
    { kind: 'lantern_c', x: 222, y: 356, layer: 'floor' },
    // fg: wildflowers in the near right corner
    { kind: 'flowers', x: 640, y: 362, layer: 'fg' },
  ];
  const order = { far: 0, back: 1, floor: 2, fg: 3 } as const;
  props.sort((a, c) => order[a.layer] - order[c.layer] || (a.layer === 'floor' && a.kind === 'ground' ? -1 : c.kind === 'ground' ? 1 : a.y - c.y));
  return { ground, wall, props };
}

const lanternBitmap = (h: number, seed: number) => {
  const b = new Bitmap(Math.ceil(h * 0.7) + 6, h + 4);
  ellipseFill(b, b.w / 2 + 2, h + 1, h * 0.3, 1.6, (x, y, d) => (dith(x, y, (1 - d) * 1.3) ? withAlpha(MEADOW[0], 190) : 0));
  lantern(b, b.w / 2, h + 1, h, seed, 0.5);
  return b;
};

export const zone10: ZoneArt = {
  id: 'zone10',
  name: 'Blossom Caldera',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    cloud_a: cloud(96, 22, 1171),
    cloud_b: cloud(70, 17, 1172),
    cloud_c: cloud(54, 13, 1173),
    smoke: volcSmoke(),
    fall_a: fall(FALLS[0].w, CLIFF_FOOT - Math.round(colTop(Math.floor(FALLS[0].x / COL_W))) - 1, 8, 1175),
    fall_b: fall(FALLS[1].w, CLIFF_FOOT - Math.round(colTop(Math.floor(FALLS[1].x / COL_W))) - 1, 8, 1176),
    steam_far: wisps(30, 30, 1177, STEAM, 0.4, 24, 5, 1.6),
    ground: [floorGround()],
    rock_a: [boulder(26, 16, 1181)],
    rock_b: [boulder(20, 13, 1182)],
    lantern_a: [lanternBitmap(30, 1183)],
    lantern_b: [lanternBitmap(30, 1184)],
    lantern_c: [lanternBitmap(44, 1185)],
    cherry: greatCherry(),
    bloom_vent: [ventFlowers()],
    onsen: [onsen()],
    steam_onsen: wisps(90, 70, 1186, STEAM, 0.5, 28, 6, 3),
    fissure: fissure(),
    steam_fissure: wisps(44, 46, 1187, STEAM, 0.6, 24, 5, 2),
    flowers: [cornerFlowers()],
    bird: cranes(),
  }),
  kinds: {
    cloud_a: { anchor: [0.5, 1], mode: 'static', drift: { speed: 1.2 } },
    cloud_b: { anchor: [0.5, 1], mode: 'static', drift: { speed: 0.9 } },
    cloud_c: { anchor: [0.5, 1], mode: 'static', drift: { speed: 1.5 } },
    smoke: { anchor: [5 / SMOKE_BOX.w, 1], mode: 'loop', ms: 320 },
    fall_a: { anchor: [0.5, 0], mode: 'loop', ms: 110 },
    fall_b: { anchor: [0.5, 0], mode: 'loop', ms: 125 },
    steam_far: { anchor: [4 / 30, 1], mode: 'loop', ms: 240 },
    ground: { anchor: [0, 0], mode: 'static' },
    rock_a: { anchor: [0.5, 1], mode: 'static' },
    rock_b: { anchor: [0.5, 1], mode: 'static' },
    lantern_a: { anchor: [0.5, 1], mode: 'static' },
    lantern_b: { anchor: [0.5, 1], mode: 'static' },
    lantern_c: { anchor: [0.5, 1], mode: 'static' },
    cherry: { anchor: [TREE.bx / TREE.w, 1], mode: 'loop', ms: 900 },
    bloom_vent: { anchor: [0.5, 1], mode: 'static' },
    onsen: { anchor: [0, 1], mode: 'static' },
    steam_onsen: { anchor: [4 / 90, 1], mode: 'loop', ms: 220 },
    fissure: { anchor: [0.5, 1], mode: 'pulse', ms: 5200 },
    steam_fissure: { anchor: [4 / 44, 1], mode: 'loop', ms: 230 },
    flowers: { anchor: [1, 1], mode: 'static' },
    bird: { anchor: [0.5, 0.5], mode: 'loop', ms: 520 },
  },
  layout,
  horizon: HZ,
};
