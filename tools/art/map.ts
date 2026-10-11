// The campaign world map: the broken realm seen from above at a slant, in
// autumn, lit from the top-left like everything else. The world (WORLD_MAP)
// is one screen tall and wider than the screen; it scrolls sideways under the
// campaign screen, and the overview is the same world at half the size.
//
// After Jakub's briefs (2026-10-10, redrawn 2026-10-11): the land fills every
// pixel, with no edge to the north or south. In the west the rift: a tear
// running diagonally through the land onto the cosmos, cracks fanning out from
// it, pieces of land floating in it, the broken land beyond it with the end of
// the old road. East of it the Fracture Reach (Zone 1): a farming village in
// its autumn fields, raided, a farm burnt and a haystack burning. Then the
// river and, close by, the forest, which also runs along the north and south
// edges; in it the Verdant Grove (Zone 2), only a glade for its node: the
// area's own art waits for him.
//
// Everything is drawn in world pixels, and every random choice is a hash of
// its position, so the map grows east area by area: widen WORLD_MAP by the new
// area's stretch and draw it east of the grove; every pixel west of the
// stretch stays as it is (the east frame and the compass move with the edge).
// Nodes, names and progress are drawn by the runtime on top.
import path from 'node:path';
import { LOCATIONS, WORLD_MAP } from '../../src/game/data/campaign.ts';
import { dith, ellipseFill, outline, polyFill, rampDither } from './paint.ts';
import { A, B, Bitmap, G, hash2, hex, mix, R, RGBA, rgba } from './raster.ts';

const W = WORLD_MAP.w, H = WORLD_MAP.h;
type P = [number, number];
const ramp = (list: string[]) => list.map((h) => hex(h));

// ---------------------------------------------------------------------------
// palette: an autumn morning, the rift's cold light in the west
// ---------------------------------------------------------------------------

const GRASS = ramp(['#1c2212', '#283016', '#353e1a', '#444c1e', '#565b22', '#6a6a28', '#827c30', '#9c8e3a', '#b8a24a']);
const LUSH = ramp(['#0e1e10', '#152c14', '#1d3c18', '#28501e', '#346624', '#427c2a', '#548f30', '#6aa438', '#86ba44']);
const FLOOR = ramp(['#060a06', '#0c120a', '#13190e', '#1b2312']);
const WHEAT = ramp(['#4a2e0e', '#6a4614', '#8c601a', '#b07e22', '#cc9c2e', '#e2b840', '#f2d25e', '#fce88e']);
const STRAW = ramp(['#5a4624', '#76602f', '#927a3c', '#ac924c', '#c4aa5e', '#d8c076', '#e8d492']);
const SOIL = ramp(['#1e130b', '#2c1c10', '#3c2715', '#4e331b', '#614022', '#754f2b', '#8a5f36']);
const PASTURE = ramp(['#18260f', '#213414', '#2c4419', '#38551e', '#466624', '#56772b']);
const CHAR = ramp(['#090707', '#14100e', '#1f1915', '#2c241e', '#3b3028']);
const EMBER = ramp(['#5a1606', '#a8300a', '#e8601a', '#ffa030', '#ffd870', '#fff6d0']);
const SMOKE = ramp(['#232128', '#34313a', '#47434d', '#5c5862', '#736f78', '#8e8a91', '#aaa6ab']);
const ROCK = ramp(['#141419', '#202128', '#2d2f38', '#3c3f4a', '#4e525e', '#646976', '#7e828e']);
const STONE = ramp(['#1c1a1c', '#2c2a2a', '#403c3a', '#56514c', '#6e6860', '#888176', '#a49c8e', '#c0b8a8']);
const PLASTER = ramp(['#4a4234', '#6a604a', '#8c8062', '#ac9f7c', '#c8bb96', '#e0d4b0']);
const TIMBER = ramp(['#170f09', '#261a10', '#382717', '#4c3620']);
const THATCH = ramp(['#2c1c0b', '#473012', '#65461a', '#856024', '#a47a30', '#c2963e', '#d9b154']);
const SLATE = ramp(['#121620', '#1c2230', '#283042', '#353f56', '#46526c', '#5a6884']);
const ROAD = ramp(['#281c11', '#3c2c1a', '#544026', '#6e5434', '#886a44', '#a28458']);
const WATER = ramp(['#06111b', '#0a1b29', '#0f293a', '#16384b', '#1f4a5d', '#2b5e70', '#417688', '#6696a4', '#a8cace']);
const REED = ramp(['#18220e', '#263414', '#384a1c', '#4c6024']);
const ORANGE = ramp(['#2a0f06', '#461a09', '#64300f', '#844414', '#a25a1c', '#bc7226', '#d28c36', '#e2a84c']);
const RED = ramp(['#240b0a', '#3c120f', '#581b15', '#76281c', '#923624', '#aa4a2e', '#c0623a', '#d27e4a']);
const GOLDLEAF = ramp(['#2a1e09', '#42300f', '#5e4614', '#7c5e1a', '#9a7822', '#b6922e', '#cca83c', '#dec058']);
const RUSSET = ramp(['#1c1209', '#2e1d0d', '#432c12', '#5a3c18', '#72501f', '#8a6428', '#a27a34']);
const LEAF = ramp(['#06110a', '#0a1b0e', '#0f2713', '#163519', '#1e4520', '#285727', '#336b2e', '#417f36', '#52933e', '#64a048']);
const PINE = ramp(['#04100e', '#081a16', '#0c241d', '#122f26', '#183b2e', '#204937', '#2a5940']);
const DEAD = ramp(['#141212', '#221e1c', '#332d29', '#463e38', '#5a514a', '#706658']);
const FADED = ramp(['#151519', '#1e1e21', '#29292a', '#353530', '#434137', '#524f3f', '#635f48', '#757052']);
const COSMOS = ramp(['#020208', '#06051a', '#0c0a2c', '#141244', '#1e1c5e', '#2c2c7c', '#3e46a0', '#5668c4', '#7a96e4', '#a8c8f6', '#d8ecff', '#ffffff']);
const NEBULA = ramp(['#12081e', '#200c36', '#33144f', '#4a1e6c', '#64308c', '#8048aa', '#a068c4']);
const LIGHT = ramp(['#30509c', '#4a76cc', '#72a2ec', '#a4ccfa', '#d6eeff', '#ffffff']);
const CRYSTAL = ramp(['#141f48', '#22386e', '#3a5ea2', '#6492d4', '#9cc6f4', '#d8f0ff', '#ffffff']);
const GOLD = ramp(['#5a3410', '#a8701e', '#e8b440', '#fff0a8']);
const AZURE = ramp(['#14285c', '#2248a0', '#3c6ad0', '#5c8ae6']);
const SABLE = ramp(['#070609', '#141117', '#221d26', '#302a34']);
const BLOOD = ramp(['#5a0e18', '#b02a36', '#e0505a']);
const FLOWERS = ['#e8e0c8', '#c8a8e0', '#f0d060', '#e07850', '#a8c8f0'].map((h) => hex(h));
const WOOL = ramp(['#8a8478', '#b8b2a4', '#dcd6c6', '#f0ecdc']);
const INK = hex('#07080e');
const SHADOW = hex('#06080a');
const GLOW_BLUE = hex('#8ab8ff');
const GLOW_FIRE = hex('#ff8a30');

// ---------------------------------------------------------------------------
// noise and geometry, all in world pixels
// ---------------------------------------------------------------------------

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function vnoise(x: number, y: number, scale: number, seed: number): number {
  const fx = x / scale, fy = y / scale;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, seed: number): number {
  return vnoise(x, y, 46, seed) * 0.5 + vnoise(x, y, 19, seed + 1) * 0.3 + vnoise(x, y, 7, seed + 2) * 0.2;
}

/** A polyline with its arc lengths, for distance queries. */
interface Line {
  pts: P[];
  at: number[];
  total: number;
}

function polyline(pts: P[]): Line {
  const at = [0];
  for (let i = 1; i < pts.length; i++) at.push(at[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, at, total: at[at.length - 1] };
}

/** The nearest point of a polyline: its distance, its arc length, and the side (+1 right of the line's direction, -1 left). */
function nearest(l: Line, x: number, y: number): { d: number; s: number; side: number } {
  let best = { d: Infinity, s: 0, side: 1 };
  for (let i = 0; i < l.pts.length - 1; i++) {
    const [ax, ay] = l.pts[i], [bx, by] = l.pts[i + 1];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / len2);
    const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
    if (d < best.d) best = { d, s: l.at[i] + Math.sqrt(len2) * t, side: dx * (y - ay) - dy * (x - ax) >= 0 ? 1 : -1 };
  }
  return best;
}

/** The point at arc length s along a polyline, and the line's unit direction there. */
function pointAt(l: Line, s: number): { p: P; dir: P } {
  let i = 0;
  while (i < l.pts.length - 2 && l.at[i + 1] < s) i++;
  const [ax, ay] = l.pts[i], [bx, by] = l.pts[i + 1];
  const len = l.at[i + 1] - l.at[i];
  const t = clamp((s - l.at[i]) / len);
  return { p: [ax + (bx - ax) * t, ay + (by - ay) * t], dir: [(bx - ax) / len, (by - ay) / len] };
}

/** A smooth curve through control points (Catmull-Rom), sampled about every `step` pixels. */
function curve(ctrl: P[], step = 0.5): P[] {
  const out: P[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

/** Piecewise-linear noise along a line: knots every `gap` pixels, so the edge it shapes is angular, not soft. */
function jag(s: number, gap: number, seed: number): number {
  const k = Math.floor(s / gap), t = s / gap - k;
  return hash2(k, 0, seed) * (1 - t) + hash2(k + 1, 0, seed) * t - 0.5;
}

// ---------------------------------------------------------------------------
// the layout: the rift, the road, the river, the areas (world pixels)
// ---------------------------------------------------------------------------

/** The rift, torn diagonally from the west edge to the south edge, jagged at every turn. */
const MAIN = polyline([[-14, 120], [10, 134], [24, 150], [44, 158], [62, 178], [84, 188], [100, 208], [122, 220], [138, 242], [160, 254], [174, 276], [192, 290], [204, 314], [222, 328], [232, 350], [248, 376]]);
/** Half the width of the open tear along it: a seam where it leaves the map, a chasm in the middle. */
function mainHalf(s: number, side: number): number {
  const t = s / MAIN.total;
  const body = 3 + 22 * Math.pow(Math.sin(Math.PI * clamp(t)), 0.85) * (0.82 + 0.36 * vnoise(s, 0, 30, 501));
  return Math.max(1.2, body + jag(s, 5, side > 0 ? 502 : 503) * 5 + jag(s, 2, side > 0 ? 504 : 505) * 1.6);
}

/** The cracks fanning out from the widest part of the tear, narrowing until they close. */
const CRACKS: { line: Line; w: [number, number] }[] = [
  { pts: [[124, 212], [138, 200], [150, 184], [170, 176], [186, 160], [204, 152]] as P[], w: [3, 0.6] as [number, number] },
  { pts: [[104, 230], [90, 250], [94, 270], [78, 288], [80, 306], [68, 318]] as P[], w: [2.8, 0.6] as [number, number] },
  { pts: [[62, 188], [46, 202], [36, 220], [18, 228], [4, 240]] as P[], w: [2.4, 0.6] as [number, number] },
  { pts: [[78, 182], [70, 166], [52, 156], [44, 140]] as P[], w: [2, 0.5] as [number, number] },
  { pts: [[206, 318], [224, 306], [242, 308]] as P[], w: [2, 0.5] as [number, number] },
].map((c) => ({ line: polyline(c.pts), w: c.w }));

const crackHalf = (c: { line: Line; w: [number, number] }, s: number, side: number) =>
  Math.max(0.35, (c.w[0] + (c.w[1] - c.w[0]) * (s / c.line.total)) * (0.75 + 0.5 * vnoise(s, side, 9, 511)) + jag(s, 4, side > 0 ? 512 : 513) * 0.8);

/** Node positions in world pixels. */
const NODES = LOCATIONS.map((l): P => [l.map.x, l.map.y]);

/** The road: the old road ends at the far lip, takes up again on this side, and runs through every node to the east edge. */
const ROAD_FAR = curve([[-10, 318], [40, 322], [96, 334], [150, 332], [186, 324]]);
const ROAD_NEAR = curve([[222, 307], [246, 286], [276, 256], [300, 226], NODES[0], [372, 214], [430, 222], [488, 214], [520, 208], [548, 206], [590, 202], [640, 208], [684, 210], NODES[1], [770, 198], [830, 205], [890, 198], [W + 12, 202]]);

/** The river, from the north edge to the south edge between the two areas. */
const RIVER = polyline(curve([[530, -12], [526, 30], [540, 66], [532, 104], [546, 142], [540, 180], [548, 206], [544, 236], [556, 272], [548, 310], [560, 374]], 2));
const riverHalf = (y: number) => 4.2 + 1.6 * vnoise(0, y, 26, 521) + y / 160;
/** where the bridge carries the road over the river */
const BRIDGE: P = [548, 206];

/** The village around the first node, its green, the clearing the runtime draws the node and its banner in. */
const GREEN: P = [318, 150];
const core = (x: number, y: number) => ((x - GREEN[0]) / 66) ** 2 + ((y - GREEN[1]) / 31) ** 2 < 1;
const clearing = (x: number, y: number, [nx, ny]: P, rx: number, ry: number) => ((x - nx) / rx) ** 2 + ((y - ny - 18) / ry) ** 2 + (vnoise(x, y, 14, 531) - 0.5) * 0.35 < 1;
const nodeClear = (x: number, y: number) => clearing(x, y, NODES[0], 74, 36);
/** the glade of the Verdant Grove around the second node, and how far out toward its rim a point is (0 middle, 1 rim) */
const glade = (x: number, y: number) => clearing(x, y, NODES[1], 84, 48);
const gladeRim = (x: number, y: number) => smooth(0.45, 1, ((x - NODES[1][0]) / 84) ** 2 + ((y - NODES[1][1] - 18) / 48) ** 2);
/** the yards around the village's buildings: trodden grass, no field or wood */
function yard(x: number, y: number): boolean {
  for (const h of [...VILLAGE, ...BURNT]) if (((x - h.x) / (h.w / 2 + 7)) ** 2 + ((y - h.y + 5) / 11) ** 2 < 1) return true;
  for (const [px, py] of [CHAPEL, WINDMILL]) if (((x - px) / 14) ** 2 + ((y - py + 5) / 12) ** 2 < 1) return true;
  return false;
}

/** The forest along the north and south edges: how deep it reaches in at x. */
const northBand = (x: number) => 22 + 36 * vnoise(x, 0, 64, 541) + 10 * vnoise(x, 0, 19, 542);
const southBand = (x: number) => 14 + 38 * vnoise(x, 0, 64, 543) + 9 * vnoise(x, 0, 19, 544);
/** How autumn the leaves are at x: the reach is all autumn, the grove east of the river green. */
const autumn = (x: number) => 1 - 0.85 * smooth(560, 700, x);

// ---------------------------------------------------------------------------
// fields precomputed per pixel
// ---------------------------------------------------------------------------

const idx = (x: number, y: number) => y * W + x;
/** the rift: signed distance to the nearest tear's edge (negative inside), the tear's half width there, and its kind */
const riftSd = new Float32Array(W * H).fill(999);
const riftHalfW = new Float32Array(W * H);
/** 1 the chasm, 2 a crack */
const riftKind = new Uint8Array(W * H);
/** the land beyond the tear (south-west of it) */
const far = new Uint8Array(W * H);
/** ground height, for the hills' light */
const height = new Float32Array(W * H);
/** distance to the road (capped) */
const roadDist = new Float32Array(W * H).fill(99);

function precompute() {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      height[i] = vnoise(x, y * 1.45, 74, 551) * 0.58 + vnoise(x, y * 1.45, 31, 552) * 0.3 + vnoise(x, y * 1.45, 12, 553) * 0.12;
      if (x > 330) continue;
      const m = nearest(MAIN, x, y);
      let sd = m.d - mainHalf(m.s, m.side), half = mainHalf(m.s, m.side), kind = 1;
      far[i] = m.side > 0 ? 1 : 0;
      for (const c of CRACKS) {
        const n = nearest(c.line, x, y);
        if (n.d > 30) continue;
        const h = crackHalf(c, n.s, n.side);
        if (n.d - h < sd) {
          sd = n.d - h;
          half = h;
          kind = 2;
        }
      }
      riftSd[i] = sd;
      riftHalfW[i] = half;
      riftKind[i] = kind;
    }
  }
  for (const road of [ROAD_FAR, ROAD_NEAR]) {
    for (const [px, py] of road) {
      for (let y = Math.floor(py - 12); y <= py + 12; y++) {
        for (let x = Math.floor(px - 12); x <= px + 12; x++) {
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const d = Math.hypot(x - px, y - py);
          if (d < roadDist[idx(x, y)]) roadDist[idx(x, y)] = d;
        }
      }
    }
  }
}

const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
const sdAt = (x: number, y: number) => (inBounds(x, y) ? riftSd[idx(x, y)] : 999);
/** the light of the hills: positive on slopes facing the top-left */
function relief(x: number, y: number): number {
  const a = height[idx(Math.max(0, x - 2), Math.max(0, y - 2))], b = height[idx(Math.min(W - 1, x + 2), Math.min(H - 1, y + 2))];
  return (a - b) * 16;
}
const riverDist = (x: number, y: number) => nearest(RIVER, x, y).d;
/** the river at x,y: its distance from the bank inward (> 0 in the water) */
const inRiver = (x: number, y: number) => (x < 500 || x > 600 ? -99 : riverHalf(y) - riverDist(x, y));
/** where the river runs at height y */
function riverX(y: number): number {
  const p = RIVER.pts;
  for (let i = 0; i < p.length - 1; i++) if (y >= p[i][1] && y <= p[i + 1][1]) return p[i][0] + ((p[i + 1][0] - p[i][0]) * (y - p[i][1])) / (p[i + 1][1] - p[i][1] || 1);
  return p[y < p[0][1] ? 0 : p.length - 1][0];
}

// ---------------------------------------------------------------------------
// the fields: a patchwork of parcels around the village
// ---------------------------------------------------------------------------

type Crop = 'wheat' | 'stubble' | 'plowed' | 'pasture' | 'fallow' | 'garden' | 'orchard';
interface Parcel {
  id: number;
  x: number;
  y: number;
  crop: Crop;
  /** the direction of its furrows */
  angle: number;
}
const CELL = { w: 34, h: 22 };
const parcelGrid = new Map<string, Parcel>();

/** Is x,y farmland: around the village, clear of the village, the rift, the river and the woods? */
function farmland(x: number, y: number): boolean {
  if (!inBounds(x, y)) return false;
  const e = ((x - 352) / 206) ** 2 + ((y - 200) / 150) ** 2 + (vnoise(x, y, 40, 561) - 0.5) * 0.5;
  if (e > 1 || core(x, y) || nodeClear(x, y) || yard(x, y)) return false;
  if (x <= 330 && (far[idx(x, y)] || riftSd[idx(x, y)] < 20)) return false;
  if (y < northBand(x) + 6 || y > H - southBand(x) - 6) return false;
  return x < 512 && roadDist[idx(x, y)] > 3.5;
}

function plantParcels() {
  let id = 0;
  for (let cy = 0; cy * CELL.h < H; cy++) {
    for (let cx = 0; cx * CELL.w < W; cx++) {
      const x = (cx + 0.5 + (hash2(cx, cy, 571) - 0.5) * 0.7) * CELL.w, y = (cy + 0.5 + (hash2(cx, cy, 572) - 0.5) * 0.7) * CELL.h;
      if (!farmland(Math.round(x), Math.round(y))) continue;
      const near = Math.hypot(x - GREEN[0], (y - GREEN[1]) * 1.4);
      const r = hash2(cx, cy, 573);
      let crop: Crop;
      if (near < 95 && r < 0.45) crop = r < 0.22 ? 'garden' : 'orchard';
      else {
        const k = hash2(cx, cy, 574);
        crop = k < 0.26 ? 'wheat' : k < 0.5 ? 'stubble' : k < 0.7 ? 'plowed' : k < 0.88 ? 'pasture' : 'fallow';
      }
      const angles = [0, Math.PI / 2, Math.PI / 6, -Math.PI / 6, Math.PI / 3];
      parcelGrid.set(`${cx},${cy}`, { id: id++, x, y, crop, angle: angles[Math.floor(hash2(cx, cy, 575) * angles.length)] });
    }
  }
}

/** The parcel at x,y and whether x,y lies on its border (a hedge, a wall or a strip of grass). */
function parcelAt(x: number, y: number): { p: Parcel; border: boolean; edge: number } | null {
  if (!farmland(x, y)) return null;
  const wx = x + (vnoise(x, y, 18, 577) - 0.5) * 9, wy = y + (vnoise(x, y, 18, 578) - 0.5) * 6;
  const cx = Math.floor(wx / CELL.w), cy = Math.floor(wy / CELL.h);
  let p1: Parcel | null = null, p2: Parcel | null = null, d1 = Infinity, d2 = Infinity;
  for (let j = cy - 1; j <= cy + 1; j++) {
    for (let i = cx - 1; i <= cx + 1; i++) {
      const p = parcelGrid.get(`${i},${j}`);
      if (!p) continue;
      const d = Math.hypot(wx - p.x, (wy - p.y) * 1.45);
      if (d < d1) {
        p2 = p1;
        d2 = d1;
        p1 = p;
        d1 = d;
      } else if (d < d2) {
        p2 = p;
        d2 = d;
      }
    }
  }
  if (!p1) return null;
  const edge = p2 ? hash2(Math.min(p1.id, p2.id), Math.max(p1.id, p2.id), 576) : 0;
  return { p: p1, border: p2 !== null && d2 - d1 < 1.5, edge };
}

/** A parcel's ground: furrows, stubble, grazing or garden rows. */
function cropColor(p: Parcel, x: number, y: number, light: number): RGBA {
  const u = x * Math.cos(p.angle) + y * 1.4 * Math.sin(p.angle);
  const row = ((Math.floor(u) % 6) + 6) % 6;
  const grain = (vnoise(x, y, 3, 581 + p.id) - 0.5) * 0.8;
  switch (p.crop) {
    case 'wheat':
      return rampDither(WHEAT, 4.6 + light * 1.4 + (row < 3 ? 0.35 : -0.35) + grain + (vnoise(x, y, 11, 582) - 0.5) * 0.8, x, y);
    case 'stubble':
      return rampDither(STRAW, 3.5 + light * 1.2 + (row % 2 ? 0.3 : -0.3) + grain * 0.6, x, y);
    case 'plowed':
      return rampDither(SOIL, (row % 3 === 0 ? 2 : row % 3 === 1 ? 3.4 : 4.5) + light * 1.2 + grain * 0.5, x, y);
    case 'pasture':
      return rampDither(PASTURE, 3.1 + light * 1.4 + (vnoise(x, y, 6, 583) - 0.5) * 1.6 + grain * 0.4, x, y);
    case 'garden':
      return row % 3 === 0 ? rampDither(SOIL, 3 + light, x, y) : rampDither(LEAF, 5.4 + light * 1.2 + grain + (hash2(x, y, 584) > 0.8 ? 1 : 0), x, y);
    case 'orchard':
    case 'fallow':
      return rampDither(GRASS, 5 + light * 1.6 + (vnoise(x, y, 7, 585) - 0.5) * 1.4 + grain * 0.4, x, y);
  }
}

// ---------------------------------------------------------------------------
// the ground, pixel by pixel
// ---------------------------------------------------------------------------

/**
 * Inside a tear. A crack is a seam of cold light. The chasm: its south-west lip
 * burns white straight into the dark; the north-east wall faces us, strata of
 * rock dropping away, lit blue from below; past it the cosmos on the far side,
 * light falling in from the lips, a nebula, stars.
 */
function riftInside(x: number, y: number, i: number): RGBA {
  const into = -riftSd[i], half = riftHalfW[i];
  if (riftKind[i] === 2) {
    const k = clamp(into / Math.max(0.6, half));
    return half > 1.2 && k > 0.55 ? rampDither(LIGHT, (k - 0.55) * 4 + Math.min(1.4, half / 2), x, y) : rampDither(COSMOS, 1 + k * 2, x, y);
  }
  const wall = far[i] ? 0 : Math.min(8, half * 0.42);
  if (into < 1) return rampDither(LIGHT, wall ? 3.8 : 4.6 + (hash2(x, y, 591) - 0.5), x, y);
  if (into < wall) {
    const k = (into - 1) / Math.max(1, wall - 1);
    const strata = Math.floor(into * 1.4 + jag(x + y, 3, 596) * 2.4) % 3 === 0 ? -0.8 : 0;
    if (k > 0.78 && dith(x, y, (k - 0.78) * 4)) return LIGHT[1];
    return rampDither(ROCK, 4.4 - k * 3.4 + strata + (hash2(x, y, 597) - 0.5) * 0.6, x, y);
  }
  const from = into - Math.max(1, wall);
  const fall = Math.max(0, 1 - (from - (wall ? 0 : 1.6)) / 8);
  if (!wall && from < 1.6) return rampDither(LIGHT, 3.6 - from * 0.9, x, y);
  const deep = clamp(into / Math.max(4, half));
  const neb = fbm(x * 1.2, y * 1.2, 592);
  if (fall < 0.3 && hash2(x, y, 594) > 0.986) return COSMOS[hash2(x, y, 595) > 0.5 ? 11 : 10];
  const cos = rampDither(COSMOS, 1.4 + fall * 6.2 + (neb - 0.45) * 4 * (1 - fall) - deep, x, y);
  const warp = vnoise(x, y, 17, 598) * 26;
  const nk = smooth(0.5, 0.82, fbm(x * 0.8 + warp, y * 1.6 - warp * 0.6, 593)) * (1 - fall) * 0.8;
  if (nk < 0.05) return cos;
  return mix(cos, rampDither(NEBULA, 1.2 + (neb - 0.3) * 5 + nk * 2 - deep * 0.6, x, y), Math.round(nk * 6) / 6);
}

/** The broken land beyond the tear: faded grass on slabs that tilt apart, dark seams between them. */
function farGround(x: number, y: number, light: number): RGBA {
  const sx = x / 30, sy = (y * 1.4) / 30;
  let d1 = 9, d2 = 9, tilt = 0;
  for (let j = Math.floor(sy) - 1; j <= Math.floor(sy) + 1; j++) {
    for (let i = Math.floor(sx) - 1; i <= Math.floor(sx) + 1; i++) {
      const px = i + hash2(i, j, 601), py = j + hash2(i, j, 602);
      const d = Math.hypot(sx - px, sy - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        tilt = (hash2(i, j, 603) - 0.5) * 1.8;
      } else if (d < d2) d2 = d;
    }
  }
  const seam = (d2 - d1) * 30;
  if (seam < 1.1) return rampDither(FADED, 0.4, x, y);
  if (seam < 2) return rampDither(FADED, 1.6, x, y);
  const v = 3.6 + tilt + light * 1.4 + (vnoise(x, y, 5, 604) - 0.5) * 1.2 + (vnoise(x, y, 17, 605) - 0.5) * 0.8;
  if (tilt > 0.1 && vnoise(x, y, 3, 606) > 0.56) return rampDither(STRAW, v - 2.2, x, y);
  return rampDither(FADED, v + (hash2(x, y, 607) > 0.96 ? 1 : 0), x, y);
}

function groundAt(x: number, y: number): RGBA {
  const i = idx(x, y);
  if (riftSd[i] < 0) return riftInside(x, y, i);
  // the torn edge of the ground along the chasm
  if (riftKind[i] === 1 && riftSd[i] < 1.2) return rampDither(ROCK, 1.6, x, y);
  const light = relief(x, y);
  if (x <= 330 && far[i]) return farGround(x, y, light);
  const w = inRiver(x, y);
  if (w > 0) {
    const flow = vnoise(x * 0.5, y * 2.2, 5, 611);
    if (w < 1.2) return rampDither(WATER, 2.4, x, y);
    return rampDither(WATER, 3.2 + w * 0.25 + (flow > 0.68 ? 1.6 : 0) + (hash2(x, y, 612) > 0.985 ? 3 : 0), x, y);
  }
  if (w > -2.2) return hash2(x, y, 618) > 0.6 ? REED[1 + Math.floor(hash2(x, y, 619) * 3)] : rampDither(SOIL, 3.6 + w * 0.6 + light, x, y);
  if (glade(x, y)) {
    const dapple = vnoise(x, y, 8, 613);
    return rampDither(LUSH, 5.2 + light * 1.4 + (dapple > 0.62 ? 1 : dapple < 0.3 ? -0.7 : 0) + (vnoise(x, y, 23, 614) - 0.5) - gladeRim(x, y) * 2.2 + (hash2(x >> 1, y, 627) > 0.93 ? 0.8 : 0), x, y);
  }
  const parcel = parcelAt(x, y);
  if (parcel && !parcel.border) return cropColor(parcel.p, x, y, light);
  if (parcel) return rampDither(GRASS, parcel.edge < 0.3 ? 2.6 : 3.6, x, y);
  // meadow: autumn grass over the hills, tufts and bare patches; trodden in the village
  const base = core(x, y) || nodeClear(x, y) || yard(x, y) ? 5.4 : 4.4;
  let v = base + light * 2 + (vnoise(x, y, 5, 615) - 0.5) * 1.1 + (vnoise(x, y, 21, 616) - 0.5) * 1.2;
  const tuft = hash2(x >> 1, y >> 1, 617);
  if (tuft > 0.94) v += 0.9;
  else if (tuft < 0.05) v -= 0.9;
  return rampDither(GRASS, v, x, y);
}

/** How thick the woods are at x,y: 0 open land, 1 forest. */
function forestAt(x: number, y: number): number {
  if (!inBounds(Math.round(x), Math.round(y))) return 0;
  const i = idx(Math.round(x), Math.round(y));
  if (riftSd[i] < 7 || inRiver(x, y) > -3) return 0;
  if (roadDist[i] < 6 || glade(x, y) || nodeClear(x, y) || core(x, y) || yard(x, y) || parcelAt(Math.round(x), Math.round(y))) return 0;
  const edges = Math.max(smooth(northBand(x) + 4, northBand(x) - 8, y), smooth(H - southBand(x) - 4, H - southBand(x) + 8, y));
  // east of the river the forest closes in: the Verdant Grove
  const east = x > 500 ? smooth(riverX(y) + 5 + vnoise(x, y, 12, 625) * 8, riverX(y) + 20, x) : 0;
  const belt = smooth(450, 525, x) * (vnoise(x, y, 24, 621) > 0.5 ? 0.85 : 0.12);
  const copse = vnoise(x, y, 26, 622) > 0.78 ? 0.9 : 0;
  // the north-west, between the tear and the edge: old woods dying toward the light
  const west = x < 200 && !far[i] && y < 200 ? smooth(0.42, 0.6, vnoise(x, y, 30, 623)) * 0.85 : 0;
  // the land beyond: thin dead woods
  const beyond = x <= 330 && far[i] ? (vnoise(x, y, 22, 624) > 0.62 ? 0.22 : 0.02) : 0;
  return Math.max(edges, east, belt, copse, west, beyond);
}

// ---------------------------------------------------------------------------
// things standing on the land, drawn back to front
// ---------------------------------------------------------------------------

/** Darkens the ground under a cast shadow, dithered at its rim. */
function shadow(b: Bitmap, cx: number, cy: number, rx: number, ry: number, k = 0.5) {
  ellipseFill(b, cx, cy, rx, ry, (x, y, d) => {
    if (d > 0.75 && !dith(x, y, (1 - d) * 4)) return 0;
    return mix(b.get(x, y), SHADOW, k);
  });
}

/** Draws into a sprite placed at ox,oy on the map, outlines it, and stamps it. */
function stamp(b: Bitmap, ox: number, oy: number, w: number, h: number, paint: (s: Bitmap, ox: number, oy: number) => void, ink: RGBA = INK) {
  const s = new Bitmap(w, h);
  paint(s, ox, oy);
  b.blit(ink ? outline(s, ink) : s, ox, oy);
}

/** A broadleaf crown from above: lumps of foliage lit from the top-left, the trunk below it, its shadow to the bottom-right. */
function broadleaf(b: Bitmap, x: number, y: number, r: number, R2: RGBA[], tone: number, seed: number, trunk: boolean, inked = true) {
  shadow(b, x + r * 0.7, y + r * 0.62, r * 1.05, r * 0.66, 0.55);
  if (trunk) for (let k = 0; k < Math.max(2, r * 0.6); k++) b.set(Math.round(x), Math.round(y + r * 0.62 + k), k ? TIMBER[2] : TIMBER[1]);
  const pad = 2, w = Math.ceil(r * 2.9) + pad * 2, h = Math.ceil(r * 2.6) + pad * 2;
  const ox = Math.floor(x - w / 2), oy = Math.floor(y - h / 2);
  const cx = x - ox, cy = y - oy;
  const lumps: [number, number, number][] = [[0, 0, 1]];
  const n = 3 + Math.floor(hash2(seed, 0, 631) * 3);
  for (let k = 0; k < n; k++) {
    const a = -Math.PI * 0.9 + hash2(seed, k, 632) * Math.PI * 1.5;
    lumps.push([Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.48, 0.42 + hash2(seed, k, 633) * 0.22]);
  }
  stamp(b, ox, oy, w, h, (s) => {
    for (const [lx0, ly0, k] of lumps) {
      ellipseFill(s, cx + lx0, cy + ly0, r * k, r * k * 0.86, (px, py, d) => {
        const gx = px + ox, gy = py + oy;
        const lx = (px + 0.5 - cx) / r, ly = (py + 0.5 - cy) / (r * 0.86);
        const leaf = (vnoise(gx, gy, 2.1, 634) - 0.5) * 1.5;
        return rampDither(R2, tone + 2.6 - lx * 1.5 - ly * 1.9 - d * (inked ? 0.6 : 1.3) + leaf, gx, gy);
      });
    }
  }, inked ? R2[0] : 0);
}

/** A fir from above at a slant: three tiers, lit on the left. */
function conifer(b: Bitmap, x: number, y: number, h: number, tone: number) {
  shadow(b, x + h * 0.38, y + 1, h * 0.42, h * 0.17, 0.55);
  const w = Math.ceil(h * 0.9) + 4, hh = Math.ceil(h) + 4;
  const ox = Math.round(x - w / 2), oy = Math.round(y - h - 1);
  const cx = x - ox;
  stamp(b, ox, oy, w, hh, (s) => {
    s.set(Math.round(cx), Math.round(h), TIMBER[1]);
    for (let t = 0; t < 3; t++) {
      const top = 1 + t * h * 0.27, bot = top + h * 0.48, half = h * (0.17 + t * 0.09);
      polyFill(s, [[cx, top], [cx + half, bot], [cx + half * 0.3, bot - 1], [cx, bot + 0.5], [cx - half * 0.3, bot - 1], [cx - half, bot]], (px, py) => {
        const gx = px + ox, gy = py + oy;
        return rampDither(PINE, tone + (px < cx ? 2.4 : 0.6) + ((py - top) / (bot - top)) * 0.6 + (hash2(gx, gy, 641) - 0.5), gx, gy);
      });
    }
  }, PINE[0]);
}

/** A dead tree: a grey trunk and bare branches. */
function deadTree(b: Bitmap, x: number, y: number, h: number, seed: number) {
  for (let k = 1; k < h * 0.5; k++) if (dith(Math.round(x + k), Math.round(y + k * 0.4), 0.6)) b.set(Math.round(x + k), Math.round(y + k * 0.4), mix(b.get(Math.round(x + k), Math.round(y + k * 0.4)), SHADOW, 0.5));
  const set = (px: number, py: number, lit: boolean) => b.set(Math.round(px), Math.round(py), lit ? DEAD[3] : DEAD[1]);
  for (let k = 0; k < h; k++) {
    set(x, y - k, true);
    if (k < h * 0.4) set(x + 1, y - k, false);
  }
  const n = 3 + Math.floor(hash2(seed, 1, 651) * 3);
  for (let k = 0; k < n; k++) {
    const at = h * (0.35 + hash2(seed, k, 652) * 0.55), side = hash2(seed, k, 653) < 0.5 ? -1 : 1, len = 2 + hash2(seed, k, 654) * h * 0.45;
    for (let t = 1; t <= len; t++) set(x + side * t, y - at - t * (0.7 + hash2(seed, k, 655) * 0.6), side < 0);
  }
}

/** The leaves for a tree at x,y: an autumn hue in the reach, green in the grove. */
function leaves(x: number, y: number, seed: number): { r: RGBA[]; tone: number } {
  const h = hash2(seed, 7, 661);
  if (h < autumn(x)) {
    // whole groves turn together: the hue follows a slow field, a few trees stray from it
    const patch = vnoise(x, y, 34, 662) * 0.8 + hash2(seed, 8, 665) * 0.35;
    const r = patch < 0.3 ? LEAF : patch < 0.5 ? GOLDLEAF : patch < 0.68 ? ORANGE : patch < 0.84 ? RUSSET : RED;
    return { r, tone: (r === LEAF ? 2 : 1.4) + hash2(seed, 9, 663) * 1.3 + (fbm(x, y, 664) - 0.5) * 1.4 };
  }
  return { r: LEAF, tone: 2.2 + hash2(seed, 9, 663) * 1.8 + (fbm(x, y, 664) - 0.5) * 1.8 };
}

interface Thing {
  y: number;
  draw: () => void;
}

function woods(things: Thing[]) {
  for (let gy = -6; gy < H + 8; gy += 5) {
    for (let gx = -6; gx < W + 6; gx += 6) {
      const x = gx + (hash2(gx, gy, 671) - 0.5) * 5, y = gy + (hash2(gx, gy, 672) - 0.5) * 4;
      const p = forestAt(x, y);
      if (p <= 0 || hash2(gx, gy, 673) > p) continue;
      const seed = gx * 7919 + gy;
      const xi = Math.round(x), yi = Math.round(y);
      const beyond = xi <= 330 && inBounds(xi, yi) && far[idx(xi, yi)] === 1;
      const nearTear = sdAt(xi, yi) < 26;
      if (beyond || (nearTear && hash2(gx, gy, 674) < 0.6)) {
        if (beyond && hash2(gx, gy, 682) < 0.45) continue;
        things.push({ y, draw: () => deadTree(b0, xi, yi, 6 + hash2(gx, gy, 675) * 6, seed) });
        continue;
      }
      if (hash2(gx, gy, 676) < (x > 560 ? 0.14 : 0.1)) {
        things.push({ y, draw: () => conifer(b0, x, y, 10 + hash2(gx, gy, 677) * 6, hash2(gx, gy, 678) * 1.6) });
        continue;
      }
      const giant = x > 600 && hash2(gx, gy, 679) < 0.012;
      const r = giant ? 9 + hash2(gx, gy, 680) * 3 : 4.6 + hash2(gx, gy, 681) * (x > 560 ? 3.2 : 2.6);
      const lv = leaves(x, y, seed);
      // deep in the woods the crowns sit in each other's shade
      const deep = [[-12, 0], [12, 0], [0, -9], [0, 9]].every(([dx, dy]) => forestAt(x + dx, y + dy) > 0.8) ? 0.7 : 0;
      // only the crowns along the wood's edge take an outline against the open land
      const edge = forestAt(x - 9, y - 6) < 0.5 || forestAt(x + 9, y + 6) < 0.5;
      things.push({ y, draw: () => broadleaf(b0, x, y, r, lv.r, lv.tone - deep + (giant ? 0.6 : 0), seed, false, edge || giant) });
    }
  }
}

/** Single trees in the meadows, with their trunks. */
function meadowTrees(things: Thing[]) {
  for (let gy = 4; gy < H; gy += 13) {
    for (let gx = 4; gx < W; gx += 13) {
      const x = gx + (hash2(gx, gy, 691) - 0.5) * 10, y = gy + (hash2(gx, gy, 692) - 0.5) * 8;
      const xi = Math.round(x), yi = Math.round(y);
      if (!inBounds(xi, yi) || hash2(gx, gy, 693) > 0.16) continue;
      if (forestAt(x, y) > 0.2 || roadDist[idx(xi, yi)] < 7 || core(x, y) || nodeClear(x, y) || glade(x, y) || inRiver(x, y) > -4 || sdAt(xi, yi) < 10) continue;
      if (parcelAt(xi, yi) || (xi <= 330 && far[idx(xi, yi)])) continue;
      const seed = gx * 31 + gy * 7;
      const lv = leaves(x, y, seed);
      things.push({ y, draw: () => broadleaf(b0, x, y, 3.6 + hash2(gx, gy, 694) * 2, lv.r, lv.tone, seed, true) });
    }
  }
}

/** Hedges along some field borders, stone walls along others; fruit trees in the orchards; stooks, ricks and sheep. */
function farmThings(things: Thing[]) {
  const done = new Set<number>();
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < 520; x += 3) {
      const jx = x + Math.floor(hash2(x, y, 701) * 3), jy = y + Math.floor(hash2(x, y, 702) * 3);
      const f = parcelAt(jx, jy);
      if (!f) continue;
      if (f.border && f.edge < 0.45 && hash2(jx, jy, 703) < 0.7) {
        const seed = jx * 13 + jy;
        const k = hash2(seed, 1, 704);
        const r = k < 0.45 ? LEAF : k < 0.7 ? RUSSET : k < 0.88 ? GOLDLEAF : ORANGE;
        things.push({ y: jy, draw: () => broadleaf(b0, jx, jy, 1.3 + hash2(seed, 2, 705) * 0.8, r, 1 + hash2(seed, 3, 706) * 1.2, seed, false) });
      }
      if (f.border || done.has(f.p.id)) continue;
      done.add(f.p.id);
      const p = f.p;
      const cos = Math.cos(p.angle), sin = Math.sin(p.angle);
      // things laid out on the parcel's own grid around its centre
      const grid = (dx: number, dy: number, n: number, each: (x: number, y: number, k: number) => void) => {
        let k = 0;
        for (let a = -n; a <= n; a++) {
          for (let c = -n; c <= n; c++) {
            const px = Math.round(p.x + (a * dx * cos - c * dy * sin)), py = Math.round(p.y + (a * dx * sin + c * dy * cos) / 1.4);
            const q = parcelAt(px, py);
            if (q && !q.border && q.p.id === p.id && parcelAt(px + 2, py)?.p.id === p.id && parcelAt(px - 2, py)?.p.id === p.id) each(px, py, k++);
          }
        }
      };
      if (p.crop === 'orchard') grid(7, 6, 3, (px, py, k) => things.push({ y: py, draw: () => fruitTree(b0, px, py, p.id * 50 + k) }));
      else if (p.crop === 'stubble') grid(7, 6, 3, (px, py, k) => hash2(p.id, k, 707) < 0.7 && things.push({ y: py, draw: () => stook(b0, px, py) }));
      else if (p.crop === 'wheat' && hash2(p.id, 0, 708) < 0.5) things.push({ y: p.y, draw: () => rick(b0, Math.round(p.x), Math.round(p.y)) });
      else if (p.crop === 'pasture') {
        const n = 3 + Math.floor(hash2(p.id, 1, 709) * 5);
        for (let k = 0; k < n; k++) {
          const sx = Math.round(p.x + (hash2(p.id, k, 710) - 0.5) * 20), sy = Math.round(p.y + (hash2(p.id, k, 711) - 0.5) * 10);
          if (parcelAt(sx, sy)?.p.id === p.id) things.push({ y: sy, draw: () => sheep(b0, sx, sy, hash2(p.id, k, 712) < 0.5) });
        }
      }
    }
  }
}

function fruitTree(b: Bitmap, x: number, y: number, seed: number) {
  broadleaf(b, x, y, 2.3 + hash2(seed, 0, 721) * 0.6, hash2(seed, 1, 722) < 0.6 ? LEAF : RUSSET, 3 + hash2(seed, 2, 723), seed, true);
  for (let k = 0; k < 3; k++) {
    const fx = Math.round(x - 2 + hash2(seed, k, 724) * 4), fy = Math.round(y - 2 + hash2(seed, k, 725) * 3);
    b.set(fx, fy, hash2(seed, k, 726) < 0.6 ? RED[6] : GOLDLEAF[7]);
  }
}

/** A stook of sheaves drying in the stubble. */
function stook(b: Bitmap, x: number, y: number) {
  b.set(x + 1, y + 1, mix(b.get(x + 1, y + 1), SHADOW, 0.5));
  b.set(x + 2, y + 1, mix(b.get(x + 2, y + 1), SHADOW, 0.4));
  b.set(x, y - 2, WHEAT[6]);
  b.set(x - 1, y - 1, WHEAT[6]);
  b.set(x, y - 1, WHEAT[5]);
  b.set(x + 1, y - 1, WHEAT[3]);
  b.set(x - 1, y, WHEAT[4]);
  b.set(x, y, WHEAT[3]);
  b.set(x + 1, y, WHEAT[2]);
}

/** A round hay rick. */
function rick(b: Bitmap, x: number, y: number) {
  shadow(b, x + 3, y + 1, 4.4, 2, 0.55);
  stamp(b, x - 5, y - 8, 11, 10, (s, ox, oy) => {
    ellipseFill(s, 5.5, 6, 4.4, 3.8, (px, py, d) => rampDither(THATCH, 5.6 - (px - 2) / 2.6 - (py - 2) / 3 - d * 0.4 + (hash2(px + ox, py + oy, 731) - 0.5) * 0.7, px + ox, py + oy));
    s.set(5, 2, THATCH[6]);
  });
}

/** A sheep grazing: a fleece of two by two, its dark head to one side, a shadow. */
function sheep(b: Bitmap, x: number, y: number, left: boolean) {
  for (const [dx, dy] of [[2, 1], [1, 2], [2, 2]]) b.set(x + dx, y + dy, mix(b.get(x + dx, y + dy), SHADOW, 0.5));
  b.set(x, y, WOOL[3]);
  b.set(x + 1, y, WOOL[2]);
  b.set(x, y + 1, WOOL[2]);
  b.set(x + 1, y + 1, WOOL[0]);
  b.set(left ? x - 1 : x + 2, y, TIMBER[1]);
}

// ---------------------------------------------------------------------------
// buildings
// ---------------------------------------------------------------------------

type Roof = 'thatch' | 'slate';
interface House {
  x: number;
  /** the foot of the front (south) wall */
  y: number;
  w: number;
  roof: Roof;
  /** 'side': the ridge runs east-west; 'front': it runs north-south and the gable faces south */
  gable: 'side' | 'front';
  stone?: boolean;
  chimney?: boolean;
  lit?: boolean;
  burnt?: boolean;
}

const roofRamp = (r: Roof) => (r === 'thatch' ? THATCH : SLATE);

/** A house from the south at a slant: its front wall, its roof, a chimney; a burnt one stands roofless and black. */
function house(b: Bitmap, hs: House, smokes: P[]) {
  const { w } = hs;
  const wallH = 4, slope = 6, back = 3, gh = Math.round(w * 0.42);
  /** how far the roof climbs above the wall, and room above it for a chimney */
  const rise = hs.gable === 'side' ? slope + back : gh + 5, head = 6;
  const sw = w + 6, sh = wallH + rise + head + 3;
  const Y = Math.round(hs.y), ox = Math.round(hs.x - w / 2) - 3, oy = Y - (sh - 2);
  // the cast shadow, to the bottom-right of the foot and the east side
  const X0 = ox + 3, X1 = X0 + w;
  polyFill(b, [[X0 + 2, Y], [X1, Y], [X1 + 5, Y + 3], [X0 + 7, Y + 3]], (x, y) => mix(b.get(x, y), SHADOW, 0.5));
  polyFill(b, [[X1, Y - wallH - rise + 3], [X1 + 5, Y - wallH - rise + 6], [X1 + 5, Y + 3], [X1, Y]], (x, y) => mix(b.get(x, y), SHADOW, 0.45));
  stamp(b, ox, oy, sw, sh, (s) => {
    const x0 = 3, x1 = x0 + w, base = sh - 2, wallTop = base - wallH;
    const wall = (px: number, py: number) => {
      const gx = px + ox, gy = py + oy;
      if (hs.burnt) return rampDither(CHAR, 2.4 - (px - x0) / w + (hash2(gx, gy, 741) - 0.5) * 1.2, gx, gy);
      if (hs.stone) return rampDither(STONE, 5.2 - ((px - x0) / w) * 1.8 - ((py + (Math.floor(px / 3) % 2)) % 2 === 0 ? 0.6 : 0), gx, gy);
      return rampDither(PLASTER, 4.6 - ((px - x0) / w) * 1.6, gx, gy);
    };
    // the front wall, half-timbered: posts at the corners and every few pixels, a beam across
    for (let py = wallTop; py < base; py++) {
      for (let px = x0; px < x1; px++) {
        let c = wall(px, py);
        if (!hs.stone && !hs.burnt && (px === x0 || px === x1 - 1 || (px - x0) % 4 === 0 || py === wallTop + 1)) c = TIMBER[2];
        s.set(px, py, c);
      }
    }
    // a door and windows: dark, a warm light in some
    const door = x0 + Math.floor(w * 0.35);
    if (!hs.burnt) {
      for (const [dx, dy] of [[0, 1], [0, 2], [1, 1], [1, 2]]) s.set(door + dx, base - dy, TIMBER[0]);
      for (const wx of [x0 + Math.floor(w * 0.72), x0 + 2]) if (Math.abs(wx - door) > 1) s.set(wx, base - 3, hs.lit && wx > door ? EMBER[4] : TIMBER[0]);
    }
    const R2 = roofRamp(hs.roof);
    if (hs.gable === 'front') {
      // the gable faces south: a triangle of wall, the two slopes going back from it
      const cx = (x0 + x1) / 2, peak = wallTop - gh;
      if (!hs.burnt) {
        polyFill(s, [[x0 - 1, wallTop + 1], [cx, peak], [cx, peak - 5], [x0 - 1, wallTop - 4]], (px, py) => rampDither(R2, 5 - (hash2(px + ox, py + oy, 742) - 0.5) * 0.8 - (py % 2) * 0.4, px + ox, py + oy));
        polyFill(s, [[cx, peak], [x1 + 1, wallTop + 1], [x1 + 1, wallTop - 4], [cx, peak - 5]], (px, py) => rampDither(R2, 2.6 - (hash2(px + ox, py + oy, 743) - 0.5) * 0.8 - (py % 2) * 0.4, px + ox, py + oy));
      }
      polyFill(s, [[x0, wallTop + 0.5], [cx, peak + 1.5], [x1, wallTop + 0.5]], (px, py) => wall(px, py));
      if (!hs.burnt) for (let py = peak + 2; py < wallTop; py++) s.set(Math.round(cx), py, TIMBER[2]);
    } else if (!hs.burnt) {
      // the ridge runs east-west: the south slope faces us, the north slope beyond the ridge catches the light
      for (let py = wallTop - rise; py <= wallTop; py++) {
        for (let px = x0 - 1; px <= x1; px++) {
          const gx = px + ox, gy = py + oy;
          const north = py < wallTop - slope;
          const course = hs.roof === 'slate' ? (py % 2 === 0 ? -0.5 : 0) + ((px + (py % 4 < 2 ? 0 : 1)) % 3 === 0 ? -0.4 : 0) : (hash2(px >> 1, py, 744) - 0.5) * 0.9;
          const v = (north ? 5.2 : 3.6 - ((py - (wallTop - slope)) / slope) * 0.8) - ((px - x0) / w) * 0.9 + course;
          s.set(px, py, py === wallTop ? R2[1] : rampDither(R2, v, gx, gy));
        }
      }
      for (let px = x0 - 1; px <= x1; px++) s.set(px, wallTop - slope, R2[R2.length - 1]);
    }
    if (hs.burnt) {
      // roofless: black rafters over the gutted rooms, embers among them
      for (let py = wallTop - 5; py < wallTop; py++) {
        for (let px = x0; px < x1; px++) {
          const gx = px + ox, gy = py + oy;
          if (py === wallTop - 5 && hash2(gx, gy, 745) < 0.4) continue;
          const rafter = (px + py) % 4 === 0 || (px - py + 40) % 5 === 0;
          s.set(px, py, rafter ? CHAR[3] : hash2(gx, gy, 746) > 0.86 ? EMBER[2 + Math.floor(hash2(gx, gy, 747) * 2)] : CHAR[0]);
        }
      }
      smokes.push([ox + (x0 + x1) / 2, oy + wallTop - 6]);
    }
    if (hs.chimney && !hs.burnt) {
      const cxp = x0 + Math.floor(w * 0.75), ct = wallTop - rise - 3;
      for (let py = ct; py < wallTop - slope + 1; py++) {
        s.set(cxp, py, STONE[5]);
        s.set(cxp + 1, py, STONE[3]);
      }
      smokes.push([ox + cxp + 1, oy + ct - 1]);
    }
  });
}

/** The chapel: a stone nave under slate, its bell tower with a spire at the west end. */
function chapel(b: Bitmap, x: number, y: number) {
  house(b, { x: x + 4, y, w: 11, roof: 'slate', gable: 'front', stone: true }, []);
  const tw = 6, th = 11, sp = 9;
  const ox = Math.round(x - 8), oy = Math.round(y - th - sp - 2);
  polyFill(b, [[ox + 6, y], [ox + 9, y], [ox + 13, y + 3], [ox + 9, y + 3]], (px, py) => mix(b.get(px, py), SHADOW, 0.5));
  stamp(b, ox, oy, tw + 4, th + sp + 4, (s) => {
    const x0 = 2, base = th + sp + 2;
    for (let py = base - th; py < base; py++) for (let px = x0; px < x0 + tw; px++) s.set(px, py, rampDither(STONE, 5.4 - (px - x0) * 0.45 - ((py + (Math.floor(px / 2) % 2)) % 3 === 0 ? 0.5 : 0), px + ox, py + oy));
    s.set(x0 + 2, base - th + 3, TIMBER[0]);
    s.set(x0 + 3, base - th + 3, TIMBER[0]);
    s.set(x0 + 2, base - th + 4, TIMBER[0]);
    s.set(x0 + 3, base - th + 4, GOLD[1]);
    polyFill(s, [[x0 - 0.5, base - th + 0.5], [x0 + tw / 2, base - th - sp], [x0 + tw + 0.5, base - th + 0.5]], (px, py) => rampDither(SLATE, px < x0 + tw / 2 ? 5 : 2.4, px + ox, py + oy));
    s.set(x0 + 3, base - th - sp - 1, GOLD[2]);
  });
}

/** The windmill on its rise: a tapering tower, a cap, four sails turned to the wind. */
function windmill(b: Bitmap, x: number, y: number) {
  polyFill(b, [[x - 1, y], [x + 4, y], [x + 11, y + 4], [x + 5, y + 4]], (px, py) => mix(b.get(px, py), SHADOW, 0.5));
  stamp(b, x - 6, y - 17, 13, 19, (s, ox, oy) => {
    const cx = 6, base = 18;
    for (let py = 6; py < base; py++) {
      const half = 2.2 + ((py - 6) / 12) * 1.8;
      for (let px = Math.round(cx - half); px <= Math.round(cx + half); px++) s.set(px, py, rampDither(PLASTER, 4.8 - ((px - cx + half) / (half * 2)) * 2.6, px + ox, py + oy));
    }
    s.set(cx, base - 1, TIMBER[0]);
    s.set(cx, base - 2, TIMBER[0]);
    s.set(cx - 1, 10, TIMBER[0]);
    ellipseFill(s, cx, 5.5, 3.4, 2.6, (px, py) => rampDither(THATCH, 4.5 - (px - cx + 3) * 0.55, px + ox, py + oy));
  });
  // the sails, in front of the cap
  const hx = x, hy = y - 12;
  for (let k = 0; k < 4; k++) {
    const a = 0.35 + (k * Math.PI) / 2;
    const dx = Math.cos(a), dy = Math.sin(a) * 0.9;
    for (let t = 1; t <= 10; t++) {
      b.set(Math.round(hx + dx * t), Math.round(hy + dy * t), TIMBER[2]);
      if (t > 3) {
        const sx = Math.round(hx + dx * t - dy * 1.6), sy = Math.round(hy + dy * t + dx * 1.6);
        b.set(sx, sy, t % 2 ? PLASTER[5] : PLASTER[3]);
        const sx2 = Math.round(hx + dx * t - dy * 0.8), sy2 = Math.round(hy + dy * t + dx * 0.8);
        if (b.get(sx2, sy2) !== TIMBER[2]) b.set(sx2, sy2, PLASTER[4]);
      }
    }
  }
  b.set(hx, hy, TIMBER[0]);
}

/** The village well on the green. */
function well(b: Bitmap, x: number, y: number) {
  stamp(b, x - 3, y - 4, 7, 7, (s, ox, oy) => {
    ellipseFill(s, 3.5, 3.5, 3, 2.2, (px, py, d) => (d < 0.55 ? WATER[1] : rampDither(STONE, 5.6 - (px - 1) * 0.6, px + ox, py + oy)));
    s.set(1, 0, TIMBER[2]);
    s.set(1, 1, TIMBER[2]);
    s.set(5, 0, TIMBER[2]);
    s.set(5, 1, TIMBER[2]);
    for (let px = 0; px <= 6; px++) s.set(px, 0, px < 3 ? THATCH[4] : THATCH[2]);
  });
}

/** The hay cart tipped over by the road, a wheel off, its hay spilled. */
function cart(b: Bitmap, x: number, y: number) {
  for (let k = 0; k < 14; k++) b.set(Math.round(x - 3 + hash2(k, 0, 751) * 12), Math.round(y - 1 + hash2(k, 1, 752) * 5), WHEAT[4 + Math.floor(hash2(k, 2, 753) * 3)]);
  polyFill(b, [[x, y + 1], [x + 9, y + 1], [x + 12, y + 3], [x + 3, y + 3]], (px, py) => mix(b.get(px, py), SHADOW, 0.5));
  stamp(b, x - 1, y - 5, 11, 8, (s, ox, oy) => {
    polyFill(s, [[1, 5], [8, 2], [9, 4.5], [2, 7]], (px, py) => rampDither(TIMBER.concat([ROAD[4]]), 3.4 - (py - 2) * 0.4 + (hash2(px + ox, py + oy, 754) - 0.5), px + ox, py + oy));
    for (let k = 0; k < 4; k++) s.set(2 + k * 2, 5 - k * 0.8, ROAD[4]);
  });
  // the wheel off, lying in the grass
  for (let a = 0; a < Math.PI * 2; a += 0.3) b.set(Math.round(x + 13 + Math.cos(a) * 2.2), Math.round(y + 1 + Math.sin(a) * 1.4), TIMBER[2]);
  b.set(x + 13, y + 1, TIMBER[1]);
}

/** A standard planted in the ground, or snapped and leaning: a pole and a banner with its device. */
function standard(b: Bitmap, x: number, y: number, cloth: RGBA[], device: (s: Bitmap, ox: number, oy: number) => void, lean: number) {
  for (let k = 1; k < 7; k++) b.set(Math.round(x + k + lean * 3), y + 1, mix(b.get(Math.round(x + k + lean * 3), y + 1), SHADOW, 0.5));
  stamp(b, x - 2, y - 17, 13, 19, (s, ox, oy) => {
    const px0 = 2;
    for (let k = 0; k < 17; k++) s.set(Math.round(px0 + lean * (k / 17) * 4), 18 - k, k > 15 ? GOLD[2] : TIMBER[3]);
    const tx = Math.round(px0 + lean * 4) + 1, ty = 2;
    for (let py = ty; py < ty + 8; py++) {
      for (let px = tx; px < tx + 7; px++) {
        const torn = py > ty + 5 && ((px - tx) % 3 === 1 || hash2(px, py, 761) < 0.3);
        if (torn) continue;
        s.set(px, py, rampDither(cloth, 2.4 - ((px - tx) / 7) * 1.4 + (py === ty ? 0.6 : 0), px + ox, py + oy));
      }
    }
    device(s, tx, ty);
  });
}

/** The old watchtower beyond the tear: a broken round tower, its rubble, ivy on the shaded side. */
function tower(b: Bitmap, x: number, y: number) {
  shadow(b, x + 9, y + 1, 10, 3.2, 0.5);
  stamp(b, x - 8, y - 22, 17, 25, (s, ox, oy) => {
    const cx = 8, base = 22, r = 6;
    for (let py = 4; py <= base; py++) {
      for (let px = cx - r; px <= cx + r; px++) {
        const u = (px - cx) / r;
        const brokenTop = 4 + Math.abs(jag(px * 3, 2, 771)) * 9 + (px > cx ? 3 : 0);
        if (py < brokenTop) continue;
        const ivy = u > 0.2 && hash2(px, py, 772) > 0.72 && py > 10;
        const block = ((py + (Math.floor(px / 2) % 2)) % 3 === 0 ? -0.6 : 0);
        s.set(px, py, ivy ? LEAF[3] : rampDither(STONE, 5.6 - (u + 1) * 1.9 + block + (hash2(px + ox, py + oy, 773) - 0.5) * 0.6, px + ox, py + oy));
      }
    }
    for (const sy of [10, 16]) s.set(cx - 2, sy, TIMBER[0]);
    ellipseFill(s, cx, 6, r - 1.5, 1.4, (px, py) => (s.get(px, py) ? TIMBER[0] : 0));
  });
  for (let k = 0; k < 10; k++) {
    const rx = Math.round(x + 4 + hash2(k, 3, 774) * 12), ry = Math.round(y - 1 + hash2(k, 4, 775) * 4);
    b.set(rx, ry, STONE[4]);
    b.set(rx + 1, ry, STONE[2]);
  }
}

/** Low broken walls of the old outpost. */
function ruinWall(b: Bitmap, x: number, y: number, len: number) {
  for (let k = 0; k < len; k++) {
    const h = 2 + Math.round(Math.abs(jag(k + x, 3, 781)) * 6);
    for (let t = 0; t < h; t++) b.set(x + k, y - t, rampDither(STONE, 5 - (t === h - 1 ? -0.6 : 0) - k * 0.03 - (t % 2) * 0.5, x + k, y - t));
    b.set(x + k + 1, y + 1, mix(b.get(x + k + 1, y + 1), SHADOW, 0.5));
  }
}

/** A cluster of the rift's crystals grown from the ground. */
function crystals(b: Bitmap, x: number, y: number, seed: number) {
  const n = 2 + Math.floor(hash2(seed, 0, 791) * 3);
  for (let k = 0; k < n; k++) {
    const sx = x + (hash2(seed, k, 792) - 0.5) * 6, h = 4 + hash2(seed, k, 793) * 6, w = 1.4 + hash2(seed, k, 794);
    const lean = (hash2(seed, k, 795) - 0.5) * 3;
    polyFill(b, [[sx - w, y], [sx + lean, y - h], [sx + w, y]], (px) => (px <= sx + lean * 0.5 ? CRYSTAL[5] : CRYSTAL[2]));
    b.set(Math.round(sx + lean), Math.round(y - h), CRYSTAL[6]);
  }
}

/** A boulder in the grass. */
function boulder(b: Bitmap, x: number, y: number, r: number, R2: RGBA[]) {
  shadow(b, x + r * 0.7, y + r * 0.3, r * 1.1, r * 0.5, 0.5);
  stamp(b, Math.round(x - r - 1), Math.round(y - r - 1), Math.ceil(r * 2) + 3, Math.ceil(r * 1.6) + 3, (s, ox, oy) => {
    ellipseFill(s, r + 1, r * 0.8 + 1, r, r * 0.8, (px, py, d) => rampDither(R2, 5 - (px - 1) / r - (py - 1) / (r * 0.8) - d * 0.6, px + ox, py + oy));
  });
}

// ---------------------------------------------------------------------------
// the rift: floating land, the broken bridge, the light it throws
// ---------------------------------------------------------------------------

/** A piece of land torn loose and floating in the tear: its top, the rock hanging under it, lit blue from the lips. */
function fragment(b: Bitmap, cx: number, cy: number, rx: number, ry: number, depth: number, seed: number, cargo?: 'dead' | 'column') {
  const ox = Math.floor(cx - rx - 3), oy = Math.floor(cy - ry - 3), w = Math.ceil(rx * 2) + 7, h = Math.ceil(ry + depth) + 7;
  const X = cx - ox, Y = cy - oy;
  const top: P[] = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2, rr = 0.78 + hash2(seed, k, 801) * 0.36;
    top.push([X + Math.cos(a) * rx * rr, Y + Math.sin(a) * ry * rr]);
  }
  // the rock under it, tapering to a jagged point
  const under = top.filter(([, py]) => py >= Y - 0.5).sort((p, q) => p[0] - q[0]);
  const tip: P = [X + (hash2(seed, 0, 802) - 0.5) * rx * 0.6, Y + depth];
  stamp(b, ox, oy, w, h, (s) => {
    polyFill(s, [...under, [under[under.length - 1][0] - rx * 0.3, Y + depth * 0.55], tip, [under[0][0] + rx * 0.3, Y + depth * 0.5]], (px, py) => {
      const gx = px + ox, gy = py + oy, u = (px - X) / rx;
      const strata = Math.floor(py - Y + jag(gx, 3, 803) * 2) % 3 === 0 ? -0.7 : 0;
      if ((u < -0.5 || py > Y + depth * 0.72) && dith(gx, gy, 0.5)) return LIGHT[1];
      return rampDither(ROCK, 4.4 - (u + 1) * 1.5 + strata - ((py - Y) / depth) * 1.4, gx, gy);
    });
    polyFill(s, top, (px, py) => {
      const gx = px + ox, gy = py + oy, u = (px - X) / rx, v = (py - Y) / ry;
      if (v < -0.55 && dith(gx, gy, 0.6)) return LIGHT[2];
      return rampDither(GRASS, 5 - u * 1.4 - v * 1.6 + (v > 0.55 ? -1.4 : 0) + (hash2(gx, gy, 804) - 0.5) * 1, gx, gy);
    });
  });
  if (cargo === 'dead') {
    broadleaf(b, cx - rx * 0.25, cy - 3, 5, GOLDLEAF, 1.6, seed, true);
    deadTree(b, Math.round(cx + rx * 0.45), Math.round(cy + 1), 7, seed + 1);
  }
  if (cargo === 'column') {
    for (let k = 0; k < 7; k++) {
      b.set(Math.round(cx + 1), Math.round(cy - k), STONE[6]);
      b.set(Math.round(cx + 2), Math.round(cy - k), STONE[4]);
      b.set(Math.round(cx + 3), Math.round(cy - k), STONE[2]);
    }
    for (const [dx, c] of [[0, STONE[5]], [1, STONE[6]], [2, STONE[5]], [3, STONE[3]], [4, STONE[2]]] as [number, RGBA][]) b.set(Math.round(cx + dx), Math.round(cy - 7), c);
  }
}

/** The stone bridge stub on a lip, broken off over the tear. */
function bridgeStub(b: Bitmap, x: number, y: number, dir: P, len: number) {
  const [dx, dy] = dir, nx = -dy, ny = dx;
  for (let t = -6; t < len; t += 0.4) {
    const broken = t > len - 3 && hash2(Math.round(t * 4), 0, 811) < 0.5;
    if (broken) continue;
    for (let w = -2.2; w <= 2.2; w += 0.5) {
      const px = Math.round(x + dx * t + nx * w), py = Math.round(y + dy * t + ny * w);
      const edge = Math.abs(w) > 1.6;
      b.set(px, py, edge ? (w < 0 ? STONE[6] : STONE[2]) : rampDither(ROAD, 3.2 + (hash2(px, py, 812) - 0.5), px, py));
    }
  }
}

/** The road over the river: a stone deck and parapets, two arches on the water. */
function riverBridge(b: Bitmap) {
  const [bx, by] = BRIDGE;
  for (let x = bx - 15; x <= bx + 15; x++) {
    for (let y = by - 3; y <= by + 4; y++) {
      const c = y === by - 3 ? STONE[7] : y === by - 2 ? STONE[5] : y <= by + 1 ? rampDither(ROAD, 3.4 + (hash2(x, y, 821) - 0.5), x, y) : y === by + 2 ? STONE[4] : STONE[2];
      b.set(x, y, c);
    }
    // the arches on the water, south face
    const u = ((x - bx + 15) % 10) - 5;
    if (Math.abs(u) < 3.4 && inRiver(x, by + 6) > -2) {
      b.set(x, by + 5, TIMBER[0]);
      if (Math.abs(u) < 2.2) b.set(x, by + 6, WATER[1]);
    } else b.set(x, by + 5, STONE[3]);
  }
}

/** The light the rift throws: a cold glow over everything near it; the fires' warm glow in the reach. */
function glow(b: Bitmap, fires: P[]) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < Math.min(W, 340); x++) {
      const i = idx(x, y);
      const sd = riftSd[i];
      if (sd <= 0 || sd > 26) continue;
      const strength = riftKind[i] === 1 ? 1 : 0.12;
      let k = Math.pow(1 - sd / 26, 2) * strength;
      k = Math.round((k + ((hash2(x, y, 831) - 0.5) * 0.08)) * 10) / 10;
      if (k <= 0) continue;
      b.set(x, y, lift(mix(b.get(x, y), GLOW_BLUE, k * 0.4), k * 0.08));
    }
  }
  for (const [fx, fy] of fires) {
    for (let y = fy - 26; y <= fy + 26; y++) {
      for (let x = fx - 34; x <= fx + 34; x++) {
        if (!inBounds(x, y)) continue;
        const d = Math.hypot((x - fx) / 34, (y - fy) / 22);
        if (d >= 1) continue;
        const k = Math.round(Math.pow(1 - d, 2) * 10) / 10;
        if (k > 0) b.set(x, y, mix(b.get(x, y), GLOW_FIRE, k * 0.42));
      }
    }
  }
}

/** Lightens a colour toward white by k. */
const lift = (c: RGBA, k: number) => rgba(R(c) + (255 - R(c)) * k, G(c) + (255 - G(c)) * k, B(c) + (255 - B(c)) * k, A(c));

/** Hairline cracks running from the lips into the land, glowing in their depth. */
function hairlines(b: Bitmap) {
  for (let k = 0; k < 22; k++) {
    const s = 20 + hash2(k, 0, 841) * (MAIN.total - 40);
    const side = hash2(k, 1, 842) < 0.5 ? -1 : 1;
    const { p, dir } = pointAt(MAIN, s);
    const nx = -dir[1] * side, ny = dir[0] * side;
    let x = p[0] + nx * (mainHalf(s, side) + 0.5), y = p[1] + ny * (mainHalf(s, side) + 0.5);
    let a = Math.atan2(ny, nx) + (hash2(k, 2, 843) - 0.5) * 1.2;
    const len = 6 + hash2(k, 3, 844) * 20;
    for (let t = 0; t < len; t += 0.7) {
      a += (hash2(k, Math.round(t * 3), 845) - 0.5) * 0.5;
      x += Math.cos(a) * 0.7;
      y += Math.sin(a) * 0.7;
      const X = Math.round(x), Y = Math.round(y);
      if (!inBounds(X, Y) || sdAt(X, Y) < 0) continue;
      const fade = 1 - t / len;
      b.set(X, Y, fade > 0.75 && hash2(X, Y, 846) < 0.5 ? LIGHT[1] : mix(b.get(X, Y), SHADOW, 0.35 + fade * 0.4));
    }
  }
}

/** Sparks and motes over the tear; embers over the fires. */
function sparks(b: Bitmap, fires: P[]) {
  for (let k = 0; k < 120; k++) {
    const s = hash2(k, 0, 851) * MAIN.total;
    const { p, dir } = pointAt(MAIN, s);
    const off = (hash2(k, 1, 852) - 0.5) * 2 * (mainHalf(s, 1) + 26);
    const x = Math.round(p[0] - dir[1] * off + (hash2(k, 2, 853) - 0.3) * 18), y = Math.round(p[1] + dir[0] * off - hash2(k, 3, 854) * 14);
    if (!inBounds(x, y)) continue;
    const big = hash2(k, 4, 855) > 0.86;
    b.set(x, y, LIGHT[big ? 5 : 3 + Math.floor(hash2(k, 5, 856) * 2)]);
    if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, LIGHT[3]);
  }
  for (const [fx, fy] of fires) {
    for (let k = 0; k < 18; k++) {
      const x = Math.round(fx + (hash2(k, fx, 857) - 0.3) * 18), y = Math.round(fy - 6 - hash2(k, fy, 858) * 24);
      b.set(x, y, EMBER[hash2(k, 1, 859) > 0.5 ? 4 : 3]);
    }
  }
}

/** A plume of smoke rising and leaning east with the wind: puffs lit from the top-left, thinning as they climb. */
function plume(b: Bitmap, x0: number, y0: number, n: number, seed: number) {
  for (let k = n - 1; k >= 0; k--) {
    const t = k / n;
    const x = x0 + k * 1.5 + Math.sin(k * 0.6 + seed) * 1.2, y = y0 - k * 2;
    const r = 2.2 + k * 0.45;
    const thin = 1 - t * 0.62;
    ellipseFill(b, x, y, r, r * 0.86, (px, py, d) => {
      if (!dith(px, py, thin * (1.45 - d * 0.6))) return 0;
      return rampDither(SMOKE, 4.8 - ((px - x) / r) * 1.3 - ((py - y) / r) * 1.3 - t * 1.4 + (hash2(px, py, 861 + seed) - 0.5) * 0.6, px, py);
    });
  }
}

/** The burning haystack: a heap gone black, flames climbing from it. */
function bonfire(b: Bitmap, x: number, y: number) {
  ellipseFill(b, x + 1, y, 9, 4, (px, py, d) => mix(b.get(px, py), CHAR[1], (1 - d) * 0.8));
  ellipseFill(b, x, y - 2, 5.2, 3.6, (px, py, d) => rampDither(CHAR, 3.6 - (px - x + 3) * 0.4 - d + (hash2(px, py, 871) > 0.8 ? 0 : 0), px, py));
  for (let k = 0; k < 11; k++) {
    const fx = x - 5 + k, h = 5 + Math.round(Math.sin(k * 0.9 + 0.6) * 3 + hash2(k, 0, 872) * 4);
    for (let t = 0; t < h; t++) {
      if (t > h * 0.6 && hash2(k, t, 873) < 0.4) continue;
      const u = t / h;
      b.set(fx + (t > h * 0.5 ? (hash2(k, t, 874) < 0.5 ? -1 : 0) : 0), y - 3 - t, EMBER[u < 0.25 ? 5 : u < 0.5 ? 4 : u < 0.75 ? 3 : 2]);
    }
  }
}

// ---------------------------------------------------------------------------
// roads, paths, frame
// ---------------------------------------------------------------------------

function road(b: Bitmap, pts: P[]) {
  for (const [x, y] of pts) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const d = Math.hypot(dx, dy * 1.2);
        if (d > 2.4) continue;
        const X = Math.round(x + dx), Y = Math.round(y + dy);
        if (!inBounds(X, Y) || sdAt(X, Y) < 0 || inRiver(X, Y) > 0) continue;
        if (d > 1.7) {
          if (dith(X, Y, 0.5)) b.set(X, Y, mix(b.get(X, Y), ROAD[1], 0.6));
        } else b.set(X, Y, rampDither(ROAD, 3.4 + (hash2(X, Y, 881) - 0.5) * 1.1 + (d > 0.9 ? -0.7 : 0.2), X, Y));
      }
    }
  }
}

function footpath(b: Bitmap, ctrl: P[]) {
  for (const [x, y] of curve(ctrl, 0.4)) {
    const X = Math.round(x), Y = Math.round(y);
    if (inBounds(X, Y)) b.set(X, Y, rampDither(ROAD, 3.4 + (hash2(X, Y, 891) - 0.5), X, Y));
  }
}

/** A fence of posts and a rail around a yard. */
function fence(b: Bitmap, x0: number, y0: number, x1: number, y1: number) {
  for (let x = x0; x <= x1; x++) {
    for (const y of [y0, y1]) b.set(x, y, x % 2 ? TIMBER[3] : TIMBER[2]);
  }
  for (let y = y0; y <= y1; y++) {
    for (const x of [x0, x1]) b.set(x, y, y % 2 ? TIMBER[3] : TIMBER[2]);
  }
}

function compass(b: Bitmap, cx: number, cy: number) {
  const at = (r: number, a: number): P => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  ellipseFill(b, cx, cy, 16, 16, (x, y, d) => (d > 0.86 ? (d > 0.94 ? INK : GOLD[1]) : mix(b.get(x, y), SHADOW, 0.35)));
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const long = i % 2 === 0 ? 13 : 7;
    for (const side of [-1, 1]) polyFill(b, [[cx, cy], at(long, a), at(3, a + side * (Math.PI / 4))], side < 0 ? GOLD[3] : GOLD[1]);
  }
  ellipseFill(b, cx, cy, 2.2, 2.2, GOLD[2]);
  ['#..#', '##.#', '#.##', '#..#'].forEach((row, yy) => [...row].forEach((ch, xx) => ch === '#' && b.set(Math.round(cx - 2 + xx), Math.round(cy - 22 + yy), GOLD[3])));
}

/** A thin gilt frame: the map is a page of the Archivist's atlas. */
function frame(b: Bitmap) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (e === 0 || e === 2) b.set(x, y, INK);
      else if (e === 1) b.set(x, y, GOLD[1]);
      else if (e < 6 && dith(x, y, ((6 - e) / 5) * 0.4)) b.set(x, y, mix(b.get(x, y), SHADOW, 0.5));
    }
  }
}

// ---------------------------------------------------------------------------
// the whole world
// ---------------------------------------------------------------------------

/** the map being drawn (the painters above take it explicitly; the scatterers queue work against it) */
let b0 = new Bitmap(1, 1);

const VILLAGE: House[] = [
  { x: 276, y: 136, w: 13, roof: 'thatch', gable: 'side', chimney: true },
  { x: 297, y: 127, w: 11, roof: 'thatch', gable: 'front', lit: true },
  { x: 320, y: 131, w: 16, roof: 'slate', gable: 'side', stone: true, chimney: true, lit: true },
  { x: 343, y: 140, w: 11, roof: 'thatch', gable: 'front' },
  { x: 366, y: 152, w: 13, roof: 'thatch', gable: 'side', chimney: true },
  { x: 285, y: 160, w: 12, roof: 'thatch', gable: 'front', lit: true },
  { x: 343, y: 170, w: 12, roof: 'slate', gable: 'front', chimney: true },
  { x: 262, y: 176, w: 11, roof: 'thatch', gable: 'side' },
  { x: 381, y: 178, w: 12, roof: 'thatch', gable: 'front', lit: true },
  { x: 304, y: 108, w: 12, roof: 'thatch', gable: 'side' },
  { x: 258, y: 120, w: 12, roof: 'thatch', gable: 'front' },
  { x: 392, y: 160, w: 11, roof: 'slate', gable: 'front', chimney: true },
  { x: 408, y: 204, w: 13, roof: 'thatch', gable: 'side', chimney: true, lit: true },
];
/** the farm burnt in the night, toward the rift, and its barn */
const BURNT: House[] = [
  { x: 230, y: 148, w: 13, roof: 'thatch', gable: 'side', burnt: true },
  { x: 247, y: 160, w: 10, roof: 'thatch', gable: 'front', burnt: true },
];
const CHAPEL: P = [350, 114];
const WINDMILL: P = [432, 120];
const HAYFIRE: P = [236, 222];
const CART: P = [392, 226];

function renderWorld(): Bitmap {
  precompute();
  plantParcels();
  const b = (b0 = new Bitmap(W, H));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b.set(x, y, groundAt(x, y));

  // stone walls along some field borders
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < 520; x++) {
      const f = parcelAt(x, y);
      if (f?.border && f.edge >= 0.45 && f.edge < 0.66) {
        b.set(x, y, STONE[5]);
        if (!parcelAt(x, y + 1)?.border) b.set(x, y + 1, STONE[2]);
      }
    }
  }
  // scattered flowers in the meadows and the glade
  for (let gy = 0; gy < H; gy += 4) {
    for (let gx = 0; gx < W; gx += 4) {
      if (hash2(gx, gy, 900) > 0.12) continue;
      const x = gx + Math.floor(hash2(gx, gy, 901) * 4), y = gy + Math.floor(hash2(gx, gy, 902) * 4);
      if (!inBounds(x, y) || sdAt(x, y) < 8 || inRiver(x, y) > -2 || roadDist[idx(x, y)] < 3 || parcelAt(x, y) || (x <= 330 && far[idx(x, y)])) continue;
      b.set(x, y, FLOWERS[Math.floor(hash2(gx, gy, 903) * FLOWERS.length)]);
    }
  }
  hairlines(b);
  road(b, ROAD_FAR);
  road(b, ROAD_NEAR);
  riverBridge(b);
  // footpaths in the village and out to the mill, the chapel and the burnt farm
  footpath(b, [NODES[0], [316, 176], GREEN, [304, 130], [300, 112]]);
  footpath(b, [GREEN, [344, 140], [358, 122], CHAPEL]);
  footpath(b, [GREEN, [380, 140], [410, 130], WINDMILL]);
  footpath(b, [GREEN, [270, 150], [240, 154]]);
  footpath(b, [[300, 226], [272, 210], [250, 214], HAYFIRE]);
  fence(b, 252, 182, 268, 190);
  fence(b, 372, 182, 390, 190);
  fence(b, 286, 164, 296, 170);

  // the rift's floating land and its broken bridge, before anything stands on the land
  fragment(b, 112, 212, 13, 7, 16, 1, 'dead');
  fragment(b, 74, 182, 7, 4, 9, 2);
  fragment(b, 154, 252, 8, 4.5, 11, 3, 'column');
  fragment(b, 38, 154, 4.5, 2.8, 6, 4);
  fragment(b, 188, 288, 4, 2.4, 6, 5);
  for (let k = 0; k < 40; k++) {
    const s = hash2(k, 0, 911) * MAIN.total, { p, dir } = pointAt(MAIN, s);
    const off = (hash2(k, 1, 912) - 0.5) * mainHalf(s, 1) * 1.4;
    const x = Math.round(p[0] - dir[1] * off), y = Math.round(p[1] + dir[0] * off);
    if (sdAt(x, y) < -2) {
      b.set(x, y, ROCK[3]);
      b.set(x + 1, y, ROCK[1]);
      b.set(x, y + 1, LIGHT[1]);
    }
  }
  bridgeStub(b, 186, 324, norm([36, -17]), 5);
  bridgeStub(b, 222, 307, norm([-36, 17]), 5);
  for (const [x, y] of [[198, 318], [206, 314], [210, 319]] as P[]) {
    b.set(x, y, STONE[5]);
    b.set(x + 1, y, STONE[3]);
    b.set(x, y + 1, LIGHT[1]);
  }

  // everything that stands, back to front
  const things: Thing[] = [];
  const smokes: P[] = [];
  woods(things);
  meadowTrees(things);
  farmThings(things);
  for (const h of [...VILLAGE, ...BURNT]) things.push({ y: h.y, draw: () => house(b, h, smokes) });
  things.push({ y: CHAPEL[1], draw: () => chapel(b, CHAPEL[0], CHAPEL[1]) });
  things.push({ y: WINDMILL[1], draw: () => windmill(b, WINDMILL[0], WINDMILL[1]) });
  things.push({ y: GREEN[1] + 2, draw: () => well(b, GREEN[0] + 2, GREEN[1] + 2) });
  things.push({ y: CART[1], draw: () => cart(b, CART[0], CART[1]) });
  things.push({ y: 296, draw: () => tower(b, 40, 296) });
  things.push({ y: 312, draw: () => ruinWall(b, 58, 312, 14) });
  things.push({ y: 280, draw: () => ruinWall(b, 22, 280, 9) });
  // the standards of the two worlds, where their warriors first met
  things.push({ y: 272, draw: () => standard(b, 238, 272, AZURE, (s, tx, ty) => crown(s, tx + 2, ty + 2), -0.3) });
  things.push({ y: 296, draw: () => standard(b, 266, 296, SABLE, (s, tx, ty) => hexagon(s, tx + 2, ty + 2), 1) });
  for (let k = 0; k < 16; k++) {
    const s = 30 + hash2(k, 0, 921) * (MAIN.total - 60), side = hash2(k, 1, 922) < 0.5 ? -1 : 1;
    const { p, dir } = pointAt(MAIN, s);
    const off = mainHalf(s, side) + 3 + hash2(k, 2, 923) * 8;
    const x = Math.round(p[0] - dir[1] * off * side), y = Math.round(p[1] + dir[0] * off * side);
    if (sdAt(x, y) > 1 && roadDist[idx(Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y)))] > 4) things.push({ y, draw: () => crystals(b, x, y, k) });
  }
  for (let k = 0; k < Math.ceil(W / 24) * Math.ceil(H / 24); k++) {
    const gx = (k % Math.ceil(W / 24)) * 24, gy = Math.floor(k / Math.ceil(W / 24)) * 24;
    if (hash2(gx, gy, 930) > 0.1) continue;
    const x = gx + Math.round(hash2(gx, gy, 931) * 24), y = gy + Math.round(hash2(gx, gy, 932) * 24);
    if (!inBounds(x, y) || sdAt(x, y) < 6 || forestAt(x, y) > 0.3 || parcelAt(x, y) || roadDist[idx(x, y)] < 5 || inRiver(x, y) > -3 || core(x, y) || nodeClear(x, y) || glade(x, y)) continue;
    const beyond = x <= 330 && far[idx(x, y)] === 1;
    things.push({ y, draw: () => boulder(b, x, y, 1.6 + hash2(gx, gy, 933) * 2, beyond ? ROCK : STONE) });
  }
  things.sort((p, q) => p.y - q.y).forEach((t) => t.draw());

  // the haystack burning by the field, the smoke of the burnt farm, the chimneys
  bonfire(b, HAYFIRE[0], HAYFIRE[1]);
  plume(b, HAYFIRE[0] + 1, HAYFIRE[1] - 8, 16, 1);
  for (const [i, [x, y]] of smokes.entries()) plume(b, x, y, BURNT.some((h) => Math.abs(h.x - x) < 12 && Math.abs(h.y - y) < 20) ? 14 : 6, i + 2);
  glow(b, [HAYFIRE, [236, 150]]);
  sparks(b, [HAYFIRE]);
  compass(b, W - 40, H - 44);
  frame(b);
  return b;
}

const norm = ([x, y]: P): P => {
  const l = Math.hypot(x, y);
  return [x / l, y / l];
};

/** the Azure Crown's device: a small gold crown */
function crown(s: Bitmap, x: number, y: number) {
  for (const [dx, dy] of [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]]) s.set(x + dx, y + dy, dy === 2 ? GOLD[1] : GOLD[3]);
}

/** the Sanguine Dominion's device: a red hexagon */
function hexagon(s: Bitmap, x: number, y: number) {
  for (const [dx, dy] of [[1, 0], [0, 1], [2, 1], [0, 2], [2, 2], [1, 3]]) s.set(x + dx, y + dy, BLOOD[2]);
  s.set(x + 1, y + 1, BLOOD[0]);
  s.set(x + 1, y + 2, BLOOD[0]);
}

/** Halves a bitmap by averaging each 2x2 block, for the overview. */
function half(src: Bitmap): Bitmap {
  const out = new Bitmap(src.w / 2, src.h / 2);
  for (let y = 0; y < out.h; y++) {
    for (let x = 0; x < out.w; x++) {
      let r = 0, g = 0, bl = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const c = src.get(x * 2 + dx, y * 2 + dy);
        r += R(c);
        g += G(c);
        bl += B(c);
      }
      out.set(x, y, rgba(Math.round(r / 4), Math.round(g / 4), Math.round(bl / 4)));
    }
  }
  return out;
}

/** The scrolling world, and the overview: the same world at half the size, so it fits one screen. */
export function buildMap(out: string) {
  const world = renderWorld();
  world.save(path.join(out, 'map', 'world.png'));
  world.save(path.join('docs', 'images', 'world_map.png'));
  const overview = WORLD_MAP.overview === 2 ? half(world) : world;
  overview.save(path.join(out, 'map', 'overview.png'));
  console.log(`  map: world ${world.w}x${world.h}, overview ${overview.w}x${overview.h}, ${LOCATIONS.length} campaign nodes`);
}
