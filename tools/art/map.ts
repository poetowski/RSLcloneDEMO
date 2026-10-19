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
// edges; in it the Verdant Grove (Zone 2), only a glade for its node. Beyond
// the grove (2026-10-17) the Moonlit Basin (Zone 3): the forest thins out, its
// roots trailing east, the soil pales into silver sand, and the sunken basin
// lies under its own night, carpeted in glowing twilight-moss round its
// tide-pools, reeds and motes of light about them; the eastern hills rise in
// sharp ridges east of it. Beyond their crest (2026-10-18) the night lifts and
// Earth Scars (Zone 4) begins: the steppe by day, cut by two deep ravines
// running west to east, yurt camps with their flag poles, wild yaks, kurgans,
// a salt lake, a zeppelin passing over. Beyond it (2026-10-19) the steppe ends
// at the brink of a great gulf and the Snowy Mesa (Zone 5) begins: a sea of
// cloud in the light before sunset, snow-capped tabletop mountains rising out
// of it, joined by cables hung with candles; a castle breathing purple dust,
// the arbiter on his mesa, the storm coming on from the east.
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
// --- the Moonlit Basin: silver sand, twilight-moss and its glow, clear pools, glass reeds, the eastern hills by night
const SANDDAY = ramp(['#4a4640', '#58544d', '#67625a', '#767168', '#858077', '#948f86']);
const SILVER = ramp(['#1e2232', '#272c3e', '#31374a', '#3c4357', '#485066', '#565e74', '#656e84', '#788096', '#8c94a8', '#a2a8ba']);
const TWMOSS = ramp(['#0b1220', '#0f1828', '#131f31', '#18273a', '#1d3043', '#22394c', '#284256', '#2f4c60', '#37566a']);
const GLOWN = ramp(['#378a8c', '#62c0b8', '#a8eadc']);
const GLOWV = ramp(['#7860b4', '#b4a4e2']);
const BEDN = ramp(['#050a14', '#08101e', '#0c1729', '#112035', '#172a42', '#1e3550', '#27425e', '#33526e']);
const REEDN = ramp(['#5a6ea4', '#a4b8e0', '#eef4ff']);
const REEDNV = ramp(['#6a5aa4', '#ac9ee0', '#f0ecff']);
const PEARLN = ['#ffd8ec', '#d8e8ff', '#e6d8ff', '#d4fff0'].map((h) => hex(h));
const MOONLIT = ramp(['#8c96b8', '#b8c2dc', '#dce4f4', '#ffffff']);
const HILLN = ramp(['#0b0c16', '#10111e', '#161828', '#1c1e32', '#23263c', '#2c2f48', '#363a56', '#424666', '#505578', '#62668c', '#7a7ea6']);
const ROOTN = ramp(['#0e0c12', '#17141c', '#221d28', '#2e2836', '#3c3546']);
const NIGHTLEAF = ramp(['#050a10', '#08101a', '#0c1724', '#111f2e', '#162838', '#1d3242', '#243c4c', '#2c4656', '#355060', '#3e5a6a']);
// --- Earth Scars: the steppe by day, the ravines' walls, the salt lake, the camps, the yaks, the zeppelin, the hills by day
const STEPPE = ramp(['#2a2416', '#39301c', '#483d22', '#584a28', '#69592f', '#7a6837', '#8b7740', '#9c874b', '#ad9657', '#bca565', '#cab376', '#d6c089']);
const STEPPESAGE = ramp(['#262c1c', '#303822', '#3b4428', '#46502e', '#525c35', '#5e683c', '#6a7444', '#77804c', '#848c55', '#92985f', '#a0a46a', '#aeb076']);
const SCARBUFF = ramp(['#4a3626', '#664c36', '#826448', '#9e7e5c', '#b89872', '#d0b28c']);
const SCAROCHRE = ramp(['#3e2614', '#5a381c', '#764c26', '#926232', '#ac7a40', '#c49452']);
const SCARRUST = ramp(['#341810', '#4e2216', '#6a301e', '#863e26', '#a04e30', '#b6623e']);
const SCARCLAY = ramp(['#2a2230', '#3a3040', '#4c4050', '#5e5262', '#726676', '#887c88']);
const SCARDEEP = ramp(['#0e0a0c', '#181012', '#22171a', '#2e1f20', '#3c2a28']);
const SALT = ramp(['#9a9a8c', '#c4c2b4', '#e2e0d4', '#f6f4ec']);
const FELTM = ramp(['#5a544c', '#8a8478', '#b4ae9e', '#d4cec0', '#ece8dc', '#fbf8f0']);
const FELTMO = ramp(['#544a3e', '#7c705e', '#a0947e', '#bcb098', '#d2c8b0', '#e2d8c2']);
const YAKM = ramp(['#120c0a', '#22170f', '#33241a', '#4a3626', '#634a34']);
const HORNM = hex('#d8ceb4');
const SKYBLUE = ramp(['#4a8ad0', '#86baf0']);
const ZEPM = ramp(['#3c4256', '#566078', '#727c94', '#8e98ae', '#aab2c4', '#c6ccd8', '#e2e6ee']);
const HILLD = ramp(['#2a221c', '#382e26', '#463a30', '#56483c', '#685848', '#7a6956', '#8e7c66', '#a29078', '#b4a28a', '#c6b59e', '#d8c9b4']);

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

/** The road: the old road ends at the far lip, takes up again on this side, and runs through every node to the east edge (through the hills' pass). */
const ROAD_FAR = curve([[-10, 318], [40, 322], [96, 334], [150, 332], [186, 324]]);
const ROAD_NEAR = curve([[222, 307], [246, 286], [276, 256], [300, 226], NODES[0], [372, 214], [430, 222], [488, 214], [520, 208], [548, 206], [590, 202], [640, 208], [684, 210], NODES[1], [770, 198], [830, 205], [890, 198], [950, 205], [1012, 208], NODES[2], [1132, 196], [1184, 190], [1236, 186], [1292, 186], [1336, 193], [1394, 197], NODES[3], [1508, 185], [1558, 189], [1612, 187], [1628, 188], [1672, 194], [1714, 197], NODES[4], [1834, 192], [1862, 189], [1890, 186], [W + 12, 184]]);
/** the road's bridges of rope over the gulf: from the brink to the arbiter's mesa, and on east toward the storm */
const MESA_BRIDGES: [P, P, number][] = [
  [[1626, 188], [1714, 197], 5],
  [[1834, 192], [1890, 186], 4],
];

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
  precomputeScars();
  precomputeMesas();
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
  // beyond the brink: the gulf and the mesas of the Snowy Mesa
  if (x >= 1596 && x > brinkX(y)) return mesaGround(x, y);
  const g = dayGround(x, y);
  if (x <= 850) return g;
  const e = eastGround(x, y, g);
  if (x < 1290) return e;
  const k = steppeK(x, y);
  return k > 0 && dith(x, y, k) ? steppeGround(x, y) : e;
}

function dayGround(x: number, y: number): RGBA {
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
  const wood = Math.max(edges, east, belt, copse, west, beyond);
  // east of the grove the woods give out, their last trees straggling into the sand
  return x > 850 ? wood * (1 - smooth(862, 990, x + (vnoise(x, y, 26, 1109) - 0.5) * 104 + (vnoise(x, y, 8, 1112) - 0.5) * 16)) : wood;
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
  if (x > 880 && hash2(seed, 6, 666) < nightK(x, y) * 1.4) return { r: NIGHTLEAF, tone: 2.6 + hash2(seed, 9, 663) * 2 + (fbm(x, y, 664) - 0.5) * 1.4 };
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
      if (parcelAt(xi, yi) || (xi <= 330 && far[idx(xi, yi)]) || (x > 850 && paleK(x, y) > 0.1)) continue;
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
        if (X >= 1596 && X > brinkX(Y)) {
          // over the gulf the bridges carry it; on a mesa's top a path trodden in the snow
          if (mesaKind[idx(X, Y)] !== 1) continue;
          if (d > 1.7) {
            if (dith(X, Y, 0.4)) b.set(X, Y, MSNOW[3]);
          } else b.set(X, Y, rampDither(MSNOW, 3.6 + (hash2(X, Y, 883) - 0.5) * 1.2 + (d > 0.9 ? -0.6 : 0.4), X, Y));
          continue;
        }
        if (X > 860 && (poolAt(X, Y).k > -0.15 || dith(X, Y, nightK(X, Y)))) {
          // in the basin a trail of pale sand, trodden through the moss
          if (poolAt(X, Y).k > -0.15) continue;
          if (d > 1.7) {
            if (dith(X, Y, 0.4)) b.set(X, Y, SILVER[5]);
          } else b.set(X, Y, rampDither(SILVER, 6.4 + (hash2(X, Y, 882) - 0.5) * 1.2 + (d > 0.9 ? -0.8 : 0.3), X, Y));
          continue;
        }
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
// the Moonlit Basin (Zone 3, named and described by Jakub, 2026-10-17): beyond
// the grove's trailing roots the soil pales into silver sand; a sunken basin
// floor under its own night, carpeted in glowing twilight-moss, glass reeds
// round its tide-pools, motes of light drifting over them; the ground swells
// toward the eastern hills, sharp ridges along the east edge
// ---------------------------------------------------------------------------

/** How far into the basin's night a point is: 0 by day, 1 under the moon; the edge wavers like a veil. */
const nightK = (x: number, y: number) => smooth(912, 1004, x + (vnoise(x, y, 38, 1101) - 0.5) * 64 + (vnoise(x, y, 9, 1100) - 0.5) * 10) * (1 - dayK(x, y));
/** How far the grove's soil has paled into silver sand. */
const paleK = (x: number, y: number) => smooth(868, 930, x + (vnoise(x, y, 24, 1102) - 0.5) * 50);
/** The basin's rims: how far down from the north edge and up from the south edge the high ground reaches at x. */
const rimN = (x: number) => 30 + 20 * vnoise(x, 0, 52, 1103) + 6 * vnoise(x, 0, 13, 1104);
const rimS = (x: number) => 28 + 22 * vnoise(x, 0, 52, 1105) + 6 * vnoise(x, 0, 13, 1106);
/** The eastern hills' foot at y: where the ground starts to rise into them. */
const hillFoot = (y: number) => 1170 + 26 * vnoise(0, y, 44, 1107) + 8 * vnoise(0, y, 11, 1108);
/** The sunken basin: its middle and half sizes; its rim wavers in lobes and bays. */
const BASIN = { x: 1072, y: 190, rx: 100, ry: 138 };
/**
 * How deep in the basin a point lies: 0 up on the uplands round it, 1 on its
 * floor; between them the slopes, terraced by the tides.
 */
function basinDepth(x: number, y: number): number {
  const dx = (x - BASIN.x) / BASIN.rx, dy = (y - BASIN.y) / BASIN.ry;
  const a = Math.atan2(dy, dx);
  const rim = 1 + (vnoise(Math.cos(a) * 3 + 9, Math.sin(a) * 3 + 9, 1, 1124) - 0.5) * 0.42 + (vnoise(Math.cos(a) * 9 + 30, Math.sin(a) * 9 + 30, 1, 1125) - 0.5) * 0.14;
  const r = Math.hypot(dx, dy) + (vnoise(x, y, 7, 1128) - 0.5) * 0.05;
  return Math.min(smooth(rim + 0.04, rim - 0.22, r), smooth(hillFoot(y) + 2, hillFoot(y) - 18, x));
}
/** The tide-pools of the basin: centre, half width, half height. */
const BASIN_POOLS: [number, number, number, number][] = [
  [1014, 144, 16, 6], [1046, 268, 20, 7], [1128, 124, 12, 5], [1148, 284, 15, 6], [1002, 212, 8, 3.5],
  [1104, 312, 10, 4], [1064, 90, 17, 6], [1130, 226, 9, 4], [1016, 316, 9, 3.5], [1102, 162, 7, 3],
];
/** The pool nearest x,y: how far inside it a point is (> 0 in the water), and which pool. */
function poolAt(x: number, y: number): { k: number; i: number } {
  let best = { k: -9, i: -1 };
  BASIN_POOLS.forEach(([px, py, rx, ry], i) => {
    const d = Math.hypot((x - px) / rx, (y - py) / ry) + (vnoise(x, y, 5, 1110 + i) - 0.5) * 0.28;
    if (1 - d > best.k) best = { k: 1 - d, i };
  });
  return best;
}
/** The clearing round the basin's node, where its medallion and its name stand. */
const basinClear = (x: number, y: number) => clearing(x, y, NODES[2], 64, 36);

/** The eastern hills' stony ground between their peaks: dark, rising, the moon on its faces toward the top-left. */
function hillGround(x: number, y: number): RGBA {
  const up = clamp((x - hillFoot(y)) / 60);
  // beyond the crest, by day: dry grass on the slopes between the rocks
  if (dith(x, y, dayK(x, y))) return rampDither(hash2(x >> 1, y, 1281) > 0.82 ? HILLD : STEPPE, 4.2 + relief(x, y) * 1.4 + (vnoise(x, y, 4, 1282) - 0.5) * 1.4, x, y);
  return rampDither(HILLN, 2.6 + up * 0.8 + relief(x, y) * 0.9 + (vnoise(x, y, 3, 1122) - 0.5) * 1.3 + (vnoise(x, y, 11, 1123) - 0.5) * 0.8, x, y);
}

/**
 * The basin by night: a floor of twilight-moss in clumps sparked with glow,
 * silver sand banks between them with ripple lines left by the tides; the
 * slopes up to the rims terraced in silver, the north one in shadow and the
 * south one catching the moon; clear pools with pale shallows and shores.
 */
function basinGround(x: number, y: number): RGBA {
  const pool = poolAt(x, y);
  if (pool.k > 0) {
    const [px, py] = BASIN_POOLS[pool.i];
    // the moon held in the biggest pool
    if (pool.i === 1 && Math.hypot(x - (px - 6), (y - (py - 2)) * 1.5) < 1.7) return MOONLIT[3];
    if (pool.k < 0.2) return rampDither(BEDN, 6.4 - pool.k * 6, x, y);
    // a band of the sky's light along the far side, deep water below it
    const far = y < py - 1 && pool.k < 0.55;
    return rampDither(BEDN, far ? 4.6 : 3.4 - pool.k * 2.6 + (hash2(x, y, 1111) > 0.975 ? 3.4 : 0), x, y);
  }
  // the pale shore round a pool, wet and darker on its near side
  if (pool.k > -0.24) {
    const [, py] = BASIN_POOLS[pool.i];
    return rampDither(SILVER, y > py ? 7 + pool.k * 3 : 8.4 + pool.k * 4, x, y);
  }
  const d = basinDepth(x, y);
  if (d <= 0.02) {
    // the uplands round the basin: moonlit sand in low dunes, dark scrub here and there
    const dune = Math.sin((x * 0.22 + y * 0.5) + vnoise(x, y, 16, 1129) * 6);
    const scrub = vnoise(x, y, 6, 1130) > 0.7 && hash2(x, y, 1131) > 0.35;
    if (scrub) return rampDither(NIGHTLEAF, 2.4 + (vnoise(x - 1, y - 1, 2, 1132) - vnoise(x, y, 2, 1132)) * 6, x, y);
    // the moss creeps up out of the basin in patches, glowing here and there
    const moss = vnoise(x, y * 1.3, 20, 1136);
    if (moss > 0.6) {
      const speck = hash2(x, y, 1137);
      if (speck > 0.985) return GLOWN[speck > 0.993 ? 1 : 0];
      return rampDither(TWMOSS, 3.4 + (vnoise(x - 1, y - 1, 1.6, 1118) - vnoise(x, y, 1.6, 1118)) * 5 + (moss - 0.6) * 4, x, y);
    }
    return rampDither(SILVER, 3.2 + (dune > 0.6 ? 1.6 : dune * 0.6) + relief(x, y) * 0.9 + (vnoise(x, y, 5, 1133) - 0.5) * 1.2, x, y);
  }
  if (d < 0.97) {
    // the slopes down into it: terraces of silver sand, a darker line along each step; the slopes facing the moon lighter
    const dx = (x - BASIN.x) / BASIN.rx, dy = (y - BASIN.y) / BASIN.ry;
    const facing = clamp(0.5 + (dx * 0.5 + dy * 0.8) / Math.max(0.3, Math.hypot(dx, dy)) * 0.5);
    const u = (1 - d) * 6 + (vnoise(x, y, 12, 1134) - 0.5) * 0.7;
    let v = 3.6 + facing * 3.2 + (1 - d) * 0.8 + (vnoise(x, y, 4, 1135) - 0.5) * 1;
    if (u % 1 < 0.18) v -= 1.5;
    else if (u % 1 > 0.82) v += 0.6;
    return rampDither(SILVER, clamp(v, 0, SILVER.length - 1), x, y);
  }
  // the floor: moss in carpets, silver sand in banks between them
  const m = vnoise(x, y * 1.4, 24, 1115) * 0.62 + vnoise(x, y * 1.4, 8, 1116) * 0.38;
  if (m > 0.43 || basinClear(x, y)) {
    const speck = hash2(x, y, 1117);
    if (speck > 0.976 && !basinClear(x, y)) return speck > 0.994 ? GLOWV[speck > 0.997 ? 1 : 0] : GLOWN[speck > 0.988 ? 2 : speck > 0.982 ? 1 : 0];
    // clumps lit on their top-left, dark between
    const c = vnoise(x, y, 1.6, 1118), cl = vnoise(x - 1, y - 1, 1.6, 1118);
    return rampDither(TWMOSS, 4 + (cl - c) * 5 + (m - 0.43) * 4 + (vnoise(x, y, 9, 1126) - 0.5) * 1.2, x, y);
  }
  // silver sand: ripple lines left by the tides
  const ripple = Math.sin(y * 1.3 + Math.sin(x * 0.11) * 2.2 + vnoise(x, y, 12, 1127) * 4) > 0.82;
  return rampDither(SILVER, 6 + (0.43 - m) * 4 - (ripple ? 1.2 : 0) + (vnoise(x, y, 5, 1119) - 0.5) * 0.9, x, y);
}

/** The ground east of the grove: the soil paling into sand by day, the basin by night, dithered into each other. */
function eastGround(x: number, y: number, day: RGBA): RGBA {
  // the eastern hills, under the basin's night up to their crest and in the day beyond it
  if (x > hillFoot(y) - 2 && dith(x, y, clamp((x - hillFoot(y) + 2) / 10))) return hillGround(x, y);
  const n = nightK(x, y), p = paleK(x, y);
  if (n > 0 && dith(x, y, n)) return basinGround(x, y);
  if (p <= 0) return day;
  // by day the grove's soil paling into sand, greyer as the night comes near
  const sand = rampDither(SANDDAY, 2.6 + p * 1.6 - n * 1.4 + (vnoise(x, y, 5, 1120) - 0.5) * 1.2 + relief(x, y) * 0.8, x, y);
  return dith(x, y, p) ? sand : rampDither(SOIL, 3.2 + relief(x, y) + (vnoise(x, y, 4, 1121) - 0.5), x, y);
}

/** The grove's great roots trailing out of the wood across the sand: dark, lit along their backs, by night in the basin's colours. */
function trailingRoots(b: Bitmap) {
  for (let k = 0; k < 18; k++) {
    let x = 862 + hash2(k, 0, 1131) * 40, y = 26 + hash2(k, 1, 1132) * 308;
    let a = (hash2(k, 2, 1133) - 0.5) * 0.8;
    const len = 60 + hash2(k, 3, 1134) * 90;
    for (let t = 0; t < len; t += 0.5) {
      a += (vnoise(t, k, 9, 1135) - 0.5) * 0.1;
      x += Math.cos(a) * 0.5;
      y += Math.sin(a) * 0.5;
      const X = Math.round(x), Y = Math.round(y);
      if (!inBounds(X, Y) || poolAt(X, Y).k > -0.1 || roadDist[idx(X, Y)] < 3 || basinClear(X, Y)) continue;
      // it dives under the sand now and then and arches out again
      if (Math.sin(t * 0.17 + k * 1.7) > 0.84) continue;
      const night = dith(X, Y, nightK(X, Y));
      const thick = t < len * 0.45 ? 2 : t < len * 0.8 ? 1 : 0;
      const R2 = night ? ROOTN : TIMBER;
      b.set(X, Y - 1, night ? ROOTN[4] : TIMBER[3]);
      b.set(X, Y, R2[2]);
      if (thick > 0) b.set(X, Y + 1, R2[1]);
      if (thick > 1) b.set(X, Y + 2, R2[0]);
    }
  }
}

/** Glass reeds round the pools: pale blue and violet strokes, bright at their tips, thickest on the far shores. */
function basinReeds(b: Bitmap) {
  BASIN_POOLS.forEach(([px, py, rx, ry], i) => {
    const n = Math.round(rx * 1.1);
    for (let k = 0; k < n; k++) {
      // in clumps on the far shore, a few on the near one
      const clump = Math.floor(hash2(i, k >> 2, 1141) * 5);
      const a = Math.PI * (1.15 + clump * 0.17) + (hash2(i, k, 1146) - 0.5) * 0.25 + (hash2(i, k >> 2, 1147) < 0.2 ? Math.PI * 0.9 : 0);
      const x = Math.round(px + Math.cos(a) * (rx + 1)), y = Math.round(py + Math.sin(a) * (ry + 1));
      const h = 2 + Math.floor(hash2(i, k, 1143) * 3);
      const R2 = hash2(i, k, 1144) < 0.4 ? REEDNV : REEDN;
      for (let t = 0; t < h; t++) b.set(x + (t > 2 && hash2(i, k, 1145) < 0.5 ? 1 : 0), y - t, t === h - 1 && hash2(i, k, 1148) < 0.5 ? R2[2] : R2[t > 0 ? 1 : 0]);
    }
  });
  // reed beds out in the moss
  for (let k = 0; k < 90; k++) {
    const bed = [[990, 250], [1088, 112], [1112, 290], [1036, 180], [1150, 166]][k % 5];
    const x = Math.round(bed[0] + (hash2(k, 0, 1148) - 0.5) * 22), y = Math.round(bed[1] + (hash2(k, 1, 1149) - 0.5) * 9);
    if (basinClear(x, y) || roadDist[idx(x, y)] < 3) continue;
    const h = 2 + Math.floor(hash2(k, 2, 1150) * 3);
    const R2 = hash2(k, 3, 1151) < 0.4 ? REEDNV : REEDN;
    for (let t = 0; t < h; t++) b.set(x, y - t, R2[t === h - 1 ? 2 : t > 0 ? 1 : 0]);
  }
}

/** Motes of light drifting over the basin in soft halos of pearl, more of them over the pools. */
function basinMotes(b: Bitmap) {
  const at: P[] = [];
  for (let k = 0; k < 60; k++) at.push([968 + hash2(k, 0, 1151) * 196, 40 + hash2(k, 1, 1152) * 280]);
  BASIN_POOLS.forEach(([px, py, rx], i) => {
    for (let k = 0; k < 3; k++) at.push([px + (hash2(i, k, 1153) - 0.5) * rx * 2.2, py - 3 - hash2(i, k, 1154) * 8]);
  });
  at.forEach(([x0, y0], k) => {
    const x = Math.round(x0), y = Math.round(y0);
    if (!inBounds(x, y) || basinClear(x, y) || nightK(x, y) < 0.8 || x > hillFoot(y) - 6) return;
    const c = PEARLN[k % PEARLN.length];
    ellipseFill(b, x, y, 3.6, 2.8, (px, py, d) => (dith(px, py, (1 - d) * 0.55) ? mix(b.get(px, py), c, 0.3) : 0));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, mix(b.get(x + dx, y + dy), c, 0.55));
    b.set(x, y, MOONLIT[3]);
  });
}

/**
 * One of the eastern hills from above at a slant: a sharp peak, a shoulder on
 * one flank, jagged edges; its face toward the moon (the left) lit in grey
 * silver, the face beyond its ridge dark, strata and gullies on both, its
 * shadow cast to the bottom right.
 */
function eastPeak(b: Bitmap, x: number, y: number, h: number, w: number, seed: number) {
  shadow(b, x + w * 0.7, y + 1, w * 1.1, Math.min(6, h * 0.14 + 2), 0.55);
  const ox = Math.floor(x - w - 4), oy = Math.floor(y - h - 4), sw = Math.ceil(w * 2) + 9, sh = Math.ceil(h) + 7;
  const X = x - ox, Y = y - oy, skew = (hash2(seed, 0, 1161) - 0.5) * w * 0.9;
  const shoulder = hash2(seed, 1, 1166) < 0.5 ? -1 : 1, sh0 = 0.35 + hash2(seed, 2, 1167) * 0.25;
  // the outline: a flank up to the peak and down again, a shoulder on one side, jagged in short runs
  const pts: P[] = [];
  const N = 8;
  for (let k = 0; k <= N * 2; k++) {
    const u = k / (N * 2);
    const side = u < 0.5 ? -1 : 1;
    const t = side < 0 ? u * 2 : (1 - u) * 2;
    let top = h * Math.pow(t, 1.15);
    if (side === shoulder && t > sh0 - 0.12 && t < sh0 + 0.18) top += h * 0.12;
    const px = X + skew * t + side * w * (1 - t) + (hash2(seed, k, 1162) - 0.5) * 2.2 * (1 - t * 0.5);
    pts.push([px, Y - top + (k > 0 && k < N * 2 ? (hash2(seed, k, 1163) - 0.5) * 2 : 0)]);
  }
  stamp(b, ox, oy, sw, sh, (s) => {
    polyFill(s, pts, (px, py) => {
      const gx = px + ox, gy = py + oy;
      const down = clamp((py - (Y - h)) / h);
      const ridge = X + skew + (py - (Y - h)) * 0.2 + (hash2(seed, Math.floor(py / 3), 1168) - 0.5) * 1.6;
      const lit = px < ridge;
      // gullies down the lit face, spurs down the dark one
      const gully = Math.abs(((px - ridge) * 0.55 + py * 0.3 + hash2(seed, 3, 1169) * 7) % 7) < 0.9;
      const strata = Math.floor((py + (lit ? px * 0.3 : -px * 0.35)) * 0.45 + hash2(seed, 9, 1164) * 3) % 3 === 0 ? -0.8 : 0;
      const tone = hash2(seed, 4, 1170) * 1.2;
      const v = lit ? 6.4 + tone - down * 3 + strata - (gully ? 1.4 : 0) - (px > ridge - 2 ? -0.6 : 0) : 2.2 + tone * 0.5 - down * 0.9 + strata * 0.5 + (gully ? 0.7 : 0);
      return rampDither(hillRamp(gx, gy), clamp(v + (hash2(gx, gy, 1165) - 0.5) * 0.7, 0, HILLN.length - 1), gx, gy);
    });
    // the moon catches the crest and the left flank (the sun, beyond the crest)
    for (let k = 0; k < N; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      for (let t = 0; t <= n; t++) {
        const px = Math.round(ax + ((bx - ax) * t) / n), py = Math.round(ay + ((by - ay) * t) / n) + 1;
        if (A(s.get(px, py))) s.set(px, py, hillRamp(px + ox, py + oy)[k > N - 3 ? 10 : 9]);
      }
    }
  }, dayK(x, y) > 0.5 ? HILLD[0] : HILLN[0]);
}

/** The rock of the hills: by night under the basin's moon, by day beyond their crest. */
const hillRamp = (x: number, y: number) => (dith(x, y, dayK(x, y)) ? HILLD : HILLN);

/** The eastern hills: a range east of the basin, the great peaks along its crest, foothills on both sides, a low pass where the road goes through. */
function eastHills(things: Thing[]) {
  for (let gy = -16; gy < H + 34; gy += 12) {
    for (let gx = 1150; gx < Math.min(W + 40, 1390); gx += 15) {
      const x = gx + (hash2(gx, gy, 1171) - 0.5) * 16 + (Math.floor(gy / 12) % 2) * 7, y = gy + (hash2(gx, gy, 1172) - 0.5) * 10;
      const into = (x - hillFoot(y)) / 100;
      // east of the crest the range falls away to its foot, where the steppe begins
      const out = (hillEast(y) - x) / 100;
      if (into < -0.02 || out < 0.02 || hash2(gx, gy, 1173) < 0.3 + Math.max(0, 0.25 - into) * 0.8 + Math.max(0, 0.22 - out) * 1.2) continue;
      const pass = Math.abs(y - 187) < 15 && x < W - 26;
      const east = clamp(out / 0.7);
      const k = Math.min(clamp(into), Math.pow(east, 1.4));
      // the great peaks stand in massifs; between them lower crags
      const massif = vnoise(x, y, 46, 1176);
      const h = pass ? 6 + k * 6 + hash2(gx, gy, 1174) * 4 : 4 + 4 * east + k * 22 + massif * k * 26 + hash2(gx, gy, 1174) * (6 + k * 12);
      const w = h * (0.48 + hash2(gx, gy, 1175) * 0.4) + 3;
      const seed = gx * 13 + gy;
      things.push({ y, draw: () => eastPeak(b0, x, y, h, w, seed) });
    }
  }
}

/** Stones on the basin's slopes and at the hills' foot, in the moon's colours. */
function basinStones(things: Thing[]) {
  for (let k = 0; k < 70; k++) {
    const x = 952 + hash2(k, 0, 1181) * 240;
    const side = hash2(k, 1, 1182);
    const y = side < 0.4 ? rimN(x) + 2 + hash2(k, 2, 1183) * 14 : side < 0.8 ? H - rimS(x) - 2 - hash2(k, 2, 1183) * 14 : 40 + hash2(k, 2, 1183) * 280;
    const xi = Math.round(x), yi = Math.round(y);
    if (!inBounds(xi, yi) || nightK(x, y) < 0.6 || basinClear(x, y) || poolAt(x, y).k > -0.3 || roadDist[idx(xi, yi)] < 4) continue;
    if (side >= 0.8 && x < hillFoot(y) - 30) continue;
    things.push({ y, draw: () => boulder(b0, x, y, 1.3 + hash2(k, 3, 1184) * 2.2, HILLN.slice(3, 10)) });
  }
}

// ---------------------------------------------------------------------------
// Earth Scars (Zone 4, named and described by Jakub, 2026-10-18): the
// easternmost land, beyond the basin and its eastern hills, where the night
// lifts along the hills' crest. The steppe by day: golden grass combed by the
// wind from the west, sage in the hollows; two deep ravines running across it
// from west to east, natural and unlike each other: the northern one a long,
// even trench with a stream and a few trees on its floor, the southern one
// younger, winding, widening east and branching, a fork of it running off the
// south edge. Yurt camps with their flag poles, wild yaks roaming in small
// herds, kurgans and a cairn of stones by the road, a salt lake, and a
// zeppelin passing over, its shadow on the grass.
// ---------------------------------------------------------------------------

/** How far into the day beyond the eastern hills' crest a point is: the basin's night lifts along the crest. */
const dayK = (x: number, y: number) => smooth(1262, 1300, x + (vnoise(x, y, 34, 1201) - 0.5) * 34 + (vnoise(x, y, 9, 1202) - 0.5) * 8);
/** The eastern hills' east foot at y: where the steppe begins. */
const hillEast = (y: number) => 1322 + 16 * vnoise(0, y, 40, 1203) + 6 * vnoise(0, y, 11, 1204);
/** How far onto the steppe a point is: 0 in the hills, 1 out on the grass. */
const steppeK = (x: number, y: number) => smooth(hillEast(y) - 24, hillEast(y) + 4, x + (vnoise(x, y, 7, 1205) - 0.5) * 10);

/** The two ravines: their centre lines from the hills' foot to the east edge. */
// (they end at x 1614, where the map ended before the Snowy Mesa: the brink of its gulf takes them there)
const SCAR_N = curve([[1314, 98], [1340, 101], [1366, 93], [1392, 99], [1420, 89], [1450, 85], [1478, 93], [1506, 87], [1534, 75], [1562, 79], [1590, 71], [1614, 73]], 1);
const SCAR_S = curve([[1352, 259], [1376, 265], [1398, 258], [1422, 267], [1446, 281], [1470, 276], [1494, 285], [1520, 279], [1546, 285], [1572, 288], [1614, 286]], 1);
/** Where a ravine's centre line runs at x, how far along it that is (0 its head, 1 the edge), or null east or west of it. */
function scarAt(pts: P[], x: number): { y: number; t: number } | null {
  if (x < pts[0][0] || x > pts[pts.length - 1][0]) return null;
  let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid][0] <= x) lo = mid;
    else hi = mid;
  }
  const [ax, ay] = pts[lo], [bx, by] = pts[hi];
  const k = bx > ax ? (x - ax) / (bx - ax) : 0;
  return { y: ay + (by - ay) * k, t: (x - pts[0][0]) / (pts[pts.length - 1][0] - pts[0][0]) };
}
/** Half the width of each ravine at x: the northern one opens fast and stays even; the southern one widens all the way east. */
const halfN = (x: number, t: number) => Math.max(0.6, 0.8 + 8.4 * smooth(0, 0.2, t) - 1.2 * smooth(0.8, 1, t) + (vnoise(x, 0, 21, 1211) - 0.5) * 2.2 + jag(x, 4, 1212) * 1.2);
const halfS = (x: number, t: number) => Math.max(0.5, 0.6 + 9.2 * Math.pow(t, 0.8) + (vnoise(x, 0, 15, 1213) - 0.5) * 2.4 + jag(x, 3, 1214) * 1.4);
/** Side gullies cut into the steppe from the ravines, and the southern ravine's fork: polyline, half width at its mouth and at its head. */
const GULLIES: { line: Line; w: [number, number] }[] = [
  { pts: [[1421, 88], [1417, 76], [1409, 64], [1412, 52]] as P[], w: [2.2, 0.5] as [number, number] },
  { pts: [[1534, 76], [1541, 61], [1549, 49], [1546, 33], [1553, 20]] as P[], w: [2.8, 0.5] as [number, number] },
  { pts: [[1366, 96], [1361, 82], [1366, 70]] as P[], w: [1.7, 0.4] as [number, number] },
  { pts: [[1479, 95], [1485, 106], [1495, 116]] as P[], w: [1.9, 0.5] as [number, number] },
  { pts: [[1495, 287], [1501, 302], [1495, 318], [1503, 336], [1498, 352], [1505, 372]] as P[], w: [4.2, 1.8] as [number, number] },
  { pts: [[1446, 283], [1439, 296], [1444, 309]] as P[], w: [2.2, 0.5] as [number, number] },
  { pts: [[1572, 291], [1583, 303], [1597, 309]] as P[], w: [2.4, 0.6] as [number, number] },
  { pts: [[1423, 265], [1427, 253], [1420, 245]] as P[], w: [1.6, 0.4] as [number, number] },
].map((g) => ({ line: polyline(curve(g.pts, 1)), w: g.w }));
const gullyHalf = (g: { line: Line; w: [number, number] }, s: number) => Math.max(0.35, (g.w[0] + (g.w[1] - g.w[0]) * (s / g.line.total)) * (0.8 + 0.4 * vnoise(s, 0, 7, 1215)) + jag(s, 3, 1216) * 0.6);

/** A ravine's floor, wall and lips, precomputed per pixel east of the hills: 1 the northern ravine, 2 the southern, 3 a gully. */
const scarKind = new Uint8Array(W * H);
/** across a ravine from its north lip (0) to its south lip (1); for a gully, how far in from its edge (1 the middle) */
const scarAcross = new Float32Array(W * H);
/** a gully's side: > 0 the wall that faces the sun (its east or south side) */
const scarSide = new Float32Array(W * H);
/** the half width there, for the layers of the wall */
const scarHalf = new Float32Array(W * H);

function precomputeScars() {
  for (let x = 1296; x < W; x++) {
    for (const [pts, half, kind] of [[SCAR_N, halfN, 1], [SCAR_S, halfS, 2]] as [P[], (x: number, t: number) => number, number][]) {
      const c = scarAt(pts, x);
      if (!c) continue;
      const h = half(x, c.t);
      // the lips waver on their own
      const top = c.y - h + jag(x, 3, 1217 + kind) * 0.9, bot = c.y + h + jag(x, 4, 1219 + kind) * 0.9;
      for (let y = Math.floor(top); y <= Math.ceil(bot); y++) {
        if (y < 0 || y >= H || y < top || y > bot) continue;
        const i = idx(x, y);
        scarKind[i] = kind;
        scarAcross[i] = (y - top) / Math.max(1, bot - top);
        scarHalf[i] = h;
      }
    }
  }
  for (const g of GULLIES) {
    const xs = g.line.pts.map((p) => p[0]), ys = g.line.pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys) - 6); y <= Math.max(...ys) + 6; y++) {
      for (let x = Math.floor(Math.min(...xs) - 6); x <= Math.max(...xs) + 6; x++) {
        if (!inBounds(x, y) || scarKind[idx(x, y)] === 1 || scarKind[idx(x, y)] === 2) continue;
        const n = nearest(g.line, x, y);
        const h = gullyHalf(g, n.s);
        if (n.d > h) continue;
        const { dir } = pointAt(g.line, n.s);
        const i = idx(x, y);
        if (scarKind[i] === 3 && scarAcross[i] > 1 - n.d / h) continue;
        scarKind[i] = 3;
        scarAcross[i] = 1 - n.d / h;
        // the wall on this side faces back toward the line: lit when it faces the sun (west and north of it)
        const ox = -dir[1] * n.side, oy = dir[0] * n.side;
        scarSide[i] = 0.6 * ox + 0.8 * oy;
        scarHalf[i] = h;
      }
    }
  }
}

/** The salt lake on the steppe south of the southern ravine: still blue water, a crust of white salt round it. */
const LAKE = { x: 1408, y: 322, rx: 17, ry: 6 };
const lakeK = (x: number, y: number) =>
  Math.max(1 - Math.hypot((x - LAKE.x) / LAKE.rx, (y - LAKE.y) / LAKE.ry), 0.9 - Math.hypot((x - LAKE.x - 15) / 9, (y - LAKE.y + 4) / 4.4)) + (vnoise(x, y, 6, 1221) - 0.5) * 0.4;
/** The clearing round the steppe's node, where its medallion and its name stand. */
const steppeClear = (x: number, y: number) => clearing(x, y, NODES[3], 64, 36);
/** The camps: where their yurts trod the grass bare. */
const CAMPS: { x: number; y: number; yurts: [number, number, number, boolean][]; poles: [number, number, number][] }[] = [
  { x: 1506, y: 152, yurts: [[1499, 155, 11, false], [1516, 149, 9, true], [1526, 160, 8, false]], poles: [[1488, 153, 18], [1534, 152, 14]] },
  { x: 1376, y: 150, yurts: [[1371, 153, 10, false], [1386, 147, 8, true]], poles: [[1360, 151, 15]] },
];
const campK = (x: number, y: number) => Math.max(...CAMPS.map((c) => 1 - Math.hypot((x - c.x) / 30, (y - c.y) / 13))) + (vnoise(x, y, 5, 1222) - 0.5) * 0.4;

/**
 * Inside a ravine. The northern wall faces us across the gap and is in its own
 * shade (the sun stands in the north-west): strata of buff, ochre, rust and
 * grey clay dropping away, fluted by the rains, its lip lit; the floor beyond
 * it dark, a stream winding along the northern one; the southern wall hidden
 * under our lip, only its edge showing. A gully: a dark cleft, its sunward
 * wall lit.
 */
function scarInside(x: number, y: number, i: number): RGBA {
  const kind = scarKind[i], a = scarAcross[i], h = scarHalf[i];
  if (kind === 3) {
    const lit = scarSide[i] > 0.1;
    // the rim: bare earth breaking from the turf
    if (a < 0.25) return rampDither(SCARBUFF, (lit ? 4.6 : 3.2) + (hash2(x, y, 1231) - 0.5) * 0.6, x, y);
    // the core, deep and narrow
    if (a > 0.7 && h > 1.2) return rampDither(SCARDEEP, 2.6 + (hash2(x, y, 1232) - 0.5), x, y);
    return rampDither(lit ? SCAROCHRE : SCARRUST, (lit ? 4.2 : 2.6) - a * 1.8 + (hash2(x, y, 1233) - 0.5) * 0.6, x, y);
  }
  const wall = 0.58 + Math.min(0.08, h * 0.008);
  if (a < 0.07) return rampDither(SCARBUFF, 4.6 + (hash2(x, y, 1233) - 0.5) * 0.6, x, y);
  if (a < wall) {
    const d = (a - 0.07) / (wall - 0.07);
    // the layers by depth, level; flutes and clefts down the face every few pixels
    const band = Math.floor((d * h * 2.2 + jag(x, 6, 1234) * 1.4) / 2.2);
    const R = [SCARBUFF, SCAROCHRE, SCARRUST, SCAROCHRE, SCARCLAY, SCARRUST, SCARCLAY][Math.max(0, band) % 7];
    const flute = Math.cos(x * 1.25 + n1v(y, 1235) * 3) > 0.55 ? 0.7 : 0;
    const cleft = hash2(Math.floor(x / 3), 0, 1236 + kind) > 0.84 ? -1.2 : 0;
    return rampDither(R, clamp(3 - d * 2.4 + flute + cleft + (hash2(x, y, 1237) - 0.5) * 0.6, 0, R.length - 1), x, y);
  }
  // the floor: in shade, a stream along the northern ravine, gravel and scrub along the southern
  const f = (a - wall) / (1 - wall);
  if (f > 0.84) return rampDither(STEPPE, 7.2 + (hash2(x, y, 1238) - 0.5), x, y);
  if (f > 0.7) return SCARDEEP[0];
  if (kind === 1 && Math.abs(f - 0.38 - 0.14 * Math.sin(x * 0.11)) < 0.12 && hash2(x, 0, 1239) > 0.2) return WATER[hash2(x, y, 1240) > 0.85 ? 7 : 5];
  if (hash2(x, y, 1241) > 0.9) return kind === 1 ? LEAF[4] : SCARBUFF[2];
  return rampDither(SCARDEEP, 2.2 - f * 1.4 + (vnoise(x, y, 3, 1242) - 0.5) * 1.2, x, y);
}
/** A 1D noise in y for the flutes. */
const n1v = (y: number, seed: number) => vnoise(0, y, 4, seed);

/**
 * The steppe: golden grass in long waves combed by the west wind, lighter on
 * the slopes toward the sun, sage in the hollows, tufts and bare patches;
 * trodden earth round the camps; the salt lake and its crust; the ravines cut
 * into it.
 */
function steppeGround(x: number, y: number): RGBA {
  const i = idx(x, y);
  if (scarKind[i]) return scarInside(x, y, i);
  const lk = lakeK(x, y);
  if (lk > 0.22) return rampDither(WATER, 6.2 + (lk - 0.22) * 1.2 + (vnoise(x * 0.4, y * 2, 4, 1243) > 0.7 ? 1.2 : 0) - (y > LAKE.y + 2 ? 0.6 : 0), x, y);
  if (lk > 0) return SALT[lk > 0.12 ? 3 : hash2(x, y, 1244) > 0.4 ? 2 : 1];
  const light = relief(x, y);
  const camp = campK(x, y);
  if (camp > 0.55) return rampDither(ROAD, 3.6 + light + (vnoise(x, y, 3, 1245) - 0.5), x, y);
  // sage in the hollows, where the ground lies low and keeps its damp
  const sage = height[i] + (vnoise(x, y * 1.4, 9, 1247) - 0.5) * 0.12 < 0.43;
  // the wind's combing: long light streaks running east
  const comb = vnoise(x * 0.12, y * 1.6, 6, 1248);
  let v = 5.4 + light * 1.9 + (vnoise(x, y, 5, 1249) - 0.5) * 1.1 + (vnoise(x, y, 21, 1250) - 0.5) * 0.9 + (comb > 0.68 ? 1.1 : comb < 0.25 ? -0.6 : 0);
  // patches in flower: a tint of thyme purple, here and there yellow
  const bloom = vnoise(x, y, 13, 1258);
  const bloomy = bloom > 0.8 && dith(x, y, (bloom - 0.8) * 2.4) && hash2(x, y, 1259) > 0.55;
  const tuft = hash2(x >> 1, y >> 1, 1251);
  if (tuft > 0.95) v += 0.9;
  else if (tuft < 0.04) v -= 0.9;
  if (camp > 0.3 && dith(x, y, (camp - 0.3) / 0.25)) v -= 0.8;
  const c = rampDither(sage ? STEPPESAGE : STEPPE, clamp(sage ? v - 0.6 : v, 0, STEPPE.length - 1), x, y);
  return bloomy ? mix(c, hash2(x >> 3, y >> 3, 1260) > 0.25 ? NEBULA[6] : GOLD[3], 0.5) : c;
}

/** A yurt from above at a slant: a dome of white felt lit from the top-left, its crown a dark ring, the door a dot of orange, its shadow to the bottom-right. */
function yurtMap(b: Bitmap, x: number, y: number, w: number, old: boolean) {
  shadow(b, x + w * 0.4, y + 0.6, w * 0.62, w * 0.24, 0.5);
  const hh = Math.ceil(w * 0.62) + 3;
  stamp(b, Math.round(x - w / 2) - 1, Math.round(y - hh) + 1, w + 3, hh + 1, (s, ox, oy) => {
    const cx = w / 2 + 1, base = hh - 1;
    const F = old ? FELTMO : FELTM;
    // the wall: a short band of felt at the front
    for (let px = 1; px <= w; px++) {
      for (let py = base - 2; py <= base; py++) s.set(px, py, rampDither(F, 3.4 - (px - 1) / w * 2 - (py === base ? 0.6 : 0), px + ox, py + oy));
      if (px % 3 === 0) s.set(px, base - 1, F[1]);
    }
    // the roof: a low dome over it
    ellipseFill(s, cx, base - 2.6, w / 2, w * 0.36, (px, py, d) => rampDither(F, 4.8 - (px - cx) / w * 2.6 - (py - (base - 2.6)) / (w * 0.36) * 0.8 - d * 0.5, px + ox, py + oy));
    s.set(Math.round(cx), Math.round(base - 2.6 - w * 0.12), TIMBER[1]);
    s.set(Math.round(cx), base, ORANGE[5]);
  }, old ? FELTMO[0] : FELTM[0]);
}

/** A very long pole by a camp, its chain of small flags streaming east in five colours, a gilt tip. */
function flagPoleMap(b: Bitmap, x: number, y: number, h: number) {
  for (let k = 1; k < 5; k++) b.set(x + k, y + 1, mix(b.get(x + k, y + 1), SHADOW, 0.45));
  for (let k = 0; k < h; k++) b.set(x, y - k, k > h - 2 ? GOLD[3] : TIMBER[3]);
  const cols = [AZURE[3], WOOL[3], RED[6], LEAF[6], GOLD[2]];
  for (let k = 0; k < h - 4; k++) {
    const fy = y - h + 3 + k;
    if (k % 2 === 0) b.set(x + 1, fy, cols[(k >> 1) % 5]);
    if (k % 4 === 0) b.set(x + 2, fy, cols[(k >> 1) % 5]);
  }
}

/** A wild yak grazing: a shaggy dark body, its head down at one end, a pale horn; a tuft of shadow. */
function yakMap(b: Bitmap, x: number, y: number, left: boolean, seed: number) {
  for (const [dx, dy] of [[1, 1], [2, 1], [3, 1]]) b.set(x + dx, y + dy, mix(b.get(x + dx, y + dy), SHADOW, 0.5));
  b.set(x, y - 1, YAKM[3]);
  b.set(x + 1, y - 1, YAKM[4]);
  b.set(x + 2, y - 1, YAKM[3]);
  b.set(x, y, YAKM[1]);
  b.set(x + 1, y, YAKM[2]);
  b.set(x + 2, y, YAKM[1]);
  const hx = left ? x - 1 : x + 3;
  b.set(hx, y, YAKM[0]);
  b.set(hx, y - 1, hash2(seed, 0, 1252) > 0.5 ? HORNM : YAKM[0]);
}

/** A kurgan: an old burial mound, grassed over, lit on its top-left, a ring of stones at its foot and a stone figure standing by it. */
function kurgan(b: Bitmap, x: number, y: number, r: number, seed: number) {
  shadow(b, x + r * 0.5, y + r * 0.3, r * 1.15, r * 0.55, 0.45);
  ellipseFill(b, x, y, r, r * 0.6, (px, py, d) => rampDither(STEPPE, 6.4 - (px - x) / r * 1.6 - (py - y) / (r * 0.6) * 1.4 - d * 0.6 + (hash2(px, py, 1253) - 0.5) * 0.6, px, py));
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    if (hash2(seed, k, 1254) < 0.3) continue;
    b.set(Math.round(x + Math.cos(a) * (r + 1.5)), Math.round(y + Math.sin(a) * (r * 0.6 + 1)), STONE[k % 2 ? 5 : 4]);
  }
  // the stone figure (a balbal) on its west side
  const sx = Math.round(x - r - 3), sy = Math.round(y + 1);
  b.set(sx + 1, sy + 1, mix(b.get(sx + 1, sy + 1), SHADOW, 0.5));
  b.set(sx, sy, STONE[3]);
  b.set(sx, sy - 1, STONE[5]);
  b.set(sx, sy - 2, STONE[6]);
}

/** The cairn where the road comes down out of the hills: a heap of stones, a pole, blue scarves on it. */
function cairnMap(b: Bitmap, x: number, y: number) {
  shadow(b, x + 2, y + 1, 4, 1.6, 0.5);
  stamp(b, x - 3, y - 7, 8, 9, (s, ox, oy) => {
    polyFill(s, [[0.5, 8], [3.5, 3.5], [6.5, 8]], (px, py) => rampDither(STONE, 5.6 - px * 0.5 + (hash2(px + ox, py + oy, 1255) - 0.5), px + ox, py + oy));
    for (let k = 0; k < 4; k++) s.set(3, 3 - k, TIMBER[3]);
  });
  b.set(x + 1, y - 6, SKYBLUE[1]);
  b.set(x + 2, y - 5, SKYBLUE[0]);
  b.set(x + 1, y - 4, SKYBLUE[1]);
  b.set(x - 1, y - 5, RED[6]);
}

/** The trails worn into the grass: polylines for footpath(). */
const TRAILS: P[][] = [
  [[1520, 160], [1528, 140], [1524, 122], [1530, 104], [1528, 96]],
  [[1376, 146], [1372, 130], [1380, 116], [1376, 104]],
  [[1528, 104], [1550, 108], [1572, 100], [1594, 94]],
  [[1470, 196], [1488, 214], [1500, 236], [1516, 252], [1522, 268]],
  [[1556, 236], [1574, 226], [1582, 214]],
];

/** One of the old stone figures of the steppe, standing in a row. */
function balbal(b: Bitmap, x: number, y: number) {
  b.set(x + 1, y + 1, mix(b.get(x + 1, y + 1), SHADOW, 0.5));
  b.set(x, y, STONE[3]);
  b.set(x, y - 1, STONE[5]);
}

/** A crouching shrub of the steppe: a dark green cushion lit on its top-left. */
function shrub(b: Bitmap, x: number, y: number, seed: number) {
  b.set(x + 1, y + 1, mix(b.get(x + 1, y + 1), SHADOW, 0.45));
  b.set(x, y, LEAF[hash2(seed, 0, 1293) > 0.5 ? 4 : 3]);
  b.set(x + 1, y, LEAF[2]);
  b.set(x, y - 1, LEAF[6]);
  if (hash2(seed, 1, 1293) > 0.5) b.set(x - 1, y, LEAF[3]);
}

/** A corral of posts and a rail by the camp, the grass inside it trodden. */
function corral(b: Bitmap, x: number, y: number) {
  ellipseFill(b, x, y, 7, 3.6, (px, py, d) => (d > 0.8 ? 0 : mix(b.get(px, py), ROAD[3], 0.5)));
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    const px = Math.round(x + Math.cos(a) * 7), py = Math.round(y + Math.sin(a) * 3.6);
    b.set(px, py, k % 2 ? TIMBER[3] : TIMBER[2]);
  }
  b.set(x - 1, y, YAKM[1]);
  b.set(x, y, YAKM[2]);
  b.set(x, y - 1, YAKM[4]);
}

/** A two-wheeled cart standing by the camp. */
function cartMap(b: Bitmap, x: number, y: number) {
  for (const [dx, dy] of [[1, 1], [2, 1], [3, 1], [4, 1]]) b.set(x + dx, y + dy, mix(b.get(x + dx, y + dy), SHADOW, 0.45));
  for (let k = 0; k < 4; k++) b.set(x + k, y - 1, TIMBER[3]);
  b.set(x + 1, y, TIMBER[1]);
  b.set(x + 2, y, TIMBER[1]);
  b.set(x - 1, y - 1, TIMBER[2]);
  b.set(x - 2, y, TIMBER[2]);
}

/** A stone in the grass, lit on its top-left, its shadow a pixel to the bottom-right. */
function pebbleMap(b: Bitmap, x: number, y: number, big: boolean) {
  b.set(x + 1, y + 1, mix(b.get(x + 1, y + 1), SHADOW, 0.45));
  b.set(x, y, STONE[6]);
  b.set(x + 1, y, STONE[4]);
  if (big) {
    b.set(x, y - 1, STONE[7]);
    b.set(x + 1, y - 1, STONE[5]);
    b.set(x + 2, y, STONE[3]);
    b.set(x + 2, y + 1, mix(b.get(x + 2, y + 1), SHADOW, 0.45));
  }
}

/** A small tree on a ravine's floor, out of the wind. */
function scarTree(b: Bitmap, x: number, y: number, seed: number) {
  broadleaf(b, x, y, 1.8 + hash2(seed, 0, 1256) * 1.2, LEAF, 2.4 + hash2(seed, 1, 1257) * 1.2, seed, false);
}

/** The zeppelin passing over the steppe, high up: its shadow on the grass far below, to the bottom-right. */
function zeppelinShadow(b: Bitmap, x: number, y: number) {
  ellipseFill(b, x + 17, y + 22, 11, 3, (px, py, d) => (dith(px, py, (1 - d) * 2.2) ? mix(b.get(px, py), SHADOW, 0.55) : 0));
}
function zeppelinMap(b: Bitmap, x: number, y: number) {
  stamp(b, x - 12, y - 5, 26, 11, (s, ox, oy) => {
    // tail fins at its east end (it heads west), the envelope over them
    polyFill(s, [[18, 4], [23, 0.5], [25, 1], [23, 4.5]], (px) => ZEPM[px < 21 ? 4 : 3]);
    polyFill(s, [[18, 5.5], [23, 9.5], [25, 9], [23, 5.5]], () => ZEPM[1]);
    // the envelope, full at its nose (west), tapering east
    for (let py = 0; py < 11; py++) {
      for (let px = 0; px < 26; px++) {
        const u = (px + 0.5 - 11) / 10.5, ry = 3.4 * (u > 0 ? 1 - 0.45 * u * u : 1 - 0.08 * u * u);
        const v = (py + 0.5 - 4.6) / ry;
        if (u * u + v * v > 1) continue;
        s.set(px, py, rampDither(ZEPM, 5.6 - u * 1.2 - v * 2.2 - (px % 4 === 0 ? 0.5 : 0), px + ox, py + oy));
      }
    }
    // the gondola slung under it
    for (let px = 8; px <= 12; px++) s.set(px, 8, ZEPM[px === 8 ? 2 : 0]);
  }, ZEPM[0]);
}

// ---------------------------------------------------------------------------
// The Snowy Mesa (Zone 5, named and described by Jakub, 2026-10-19): east of
// Earth Scars the steppe ends at the brink of a great gulf, its two ravines
// falling over it in waterfalls. The gulf is full of a sea of cloud in the
// light before sunset, and out of it rise tabletop mountains, their tops under
// snow, their cliffs banded and glowing on the sun's side, each throwing its
// long shadow east over the clouds; cables hung with candles join them all,
// and the road crosses to the arbiter's mesa on bridges of rope. On the mesa
// to the north-west a castle, its huge chimney breathing purple dust west on
// the wind; on the arbiter's mesa the statue among a few pines, candles round
// it; from the east the snowstorm comes on, dark cloud over the last mesas,
// veils of snow trailing before it.
// ---------------------------------------------------------------------------

const MSEA = ramp(['#2e2c50', '#3a365e', '#48426c', '#58507a', '#6a5e86', '#7e6c90', '#947a98', '#aa889e', '#c098a2', '#d4aaa4', '#e6bea8', '#f4d2b0']);
const MSNOW = ramp(['#5a5684', '#6e6898', '#8680aa', '#a096ba', '#bcacc6', '#d6c0cc', '#eacfcc', '#f6dfd2', '#fff0e2']);
const MROCK = ramp(['#20182a', '#2c2034', '#3a283c', '#4a3044', '#5c3a4a', '#70444e', '#865052', '#9e5e56', '#b66e5a', '#cc805e']);
const MCASTLE = ramp(['#120f1c', '#1e1828', '#2c2436', '#3c3246', '#504258', '#665468']);
const MPLUME = ramp(['#3a1c56', '#55287a', '#7038a0', '#9050c0', '#b07ad8', '#d0a8ec', '#ecd2fa']);
const MSTORM = ramp(['#16172c', '#1e2036', '#272a42', '#31344e', '#3c3e5a', '#4a4a66', '#5a5874', '#6c6882', '#82788e', '#a08a96', '#c09c98']);
const MVEIL = ramp(['#8a88a8', '#a8a6c0', '#c8c6da', '#e4e2f0']);
const MPINE = ramp(['#0e1a1a', '#16262a', '#20342e', '#2c4436']);
const MVERD = ramp(['#16241f', '#2a443a', '#456452', '#6e8a68', '#a29c72']);
const MCANDLE = ramp(['#b85a1c', '#ff9c3a', '#ffd870', '#fff4c0']);
const MWAX = hex('#efe2cc');

/** Where the steppe ends at y: its brink, the gulf beyond it, notched back where the ravines fall over it. */
const brinkX = (y: number) => 1620 + 7 * vnoise(0, y, 26, 1301) + 2.5 * vnoise(0, y, 7, 1302) - 16 * Math.max(0, 1 - Math.abs(y - 73) / 17) - 15 * Math.max(0, 1 - Math.abs(y - 287) / 17);

/** A mesa on the map: the middle of its top, its half sizes, how high its cliff shows below its south edge. */
interface MapMesa {
  x: number;
  y: number;
  rx: number;
  ry: number;
  h: number;
  seed: number;
}
/** the arbiter's mesa (the node's), the castle's, and the others rising out of the gulf */
const ARBITER_MESA: MapMesa = { x: 1772, y: 194, rx: 64, ry: 40, h: 16, seed: 1 };
const CASTLE_MAP_MESA: MapMesa = { x: 1696, y: 88, rx: 36, ry: 21, h: 14, seed: 2 };
const MAP_MESAS: MapMesa[] = [
  ARBITER_MESA,
  CASTLE_MAP_MESA,
  { x: 1664, y: 302, rx: 22, ry: 13, h: 10, seed: 3 },
  { x: 1848, y: 94, rx: 26, ry: 16, h: 12, seed: 4 },
  { x: 1876, y: 272, rx: 24, ry: 14, h: 11, seed: 5 },
  { x: 1726, y: 326, rx: 15, ry: 9, h: 8, seed: 6 },
  { x: 1654, y: 156, rx: 10, ry: 7, h: 9, seed: 7 },
  { x: 1798, y: 30, rx: 15, ry: 9, h: 9, seed: 8 },
  { x: 1904, y: 184, rx: 18, ry: 12, h: 10, seed: 9 },
  { x: 1748, y: 22, rx: 9, ry: 6, h: 7, seed: 10 },
  { x: 1830, y: 336, rx: 12, ry: 7, h: 7, seed: 11 },
  { x: 1890, y: 22, rx: 16, ry: 9, h: 9, seed: 12 },
].sort((a, b) => b.y - a.y);

/**
 * Is x,y on a mesa's top? Its outline is a ragged ring, angular in short runs
 * where the cliffs break off, with bays cut in by gullies and spurs jutting
 * out, so no two mesas share a shape.
 */
function onTop(m: MapMesa, x: number, y: number): boolean {
  const dx = (x - m.x) / m.rx, dy = (y - m.y) / m.ry;
  const d = Math.hypot(dx, dy);
  if (d > 1.5) return false;
  const a = Math.atan2(dy, dx);
  // round the rim: broad lobes and bays, then angular breaks every few pixels of rim
  const ca = Math.cos(a), sa = Math.sin(a);
  const lobes = (vnoise(ca * 1.6 + 7, sa * 1.6 + 7, 1, 1312 + m.seed) - 0.5) * 0.5;
  const rim = (Math.max(m.rx, m.ry) * (a + Math.PI));
  const breaks = jag(rim, 3, 1313 + m.seed) * 0.14 + jag(rim, 9, 1314 + m.seed) * 0.12;
  return d < 1 + lobes + breaks;
}

/** what the gulf shows at each pixel east of the brink: 0 cloud, 1 a mesa's top, 2 its cliff; which mesa; how far down its cliff */
const mesaKind = new Uint8Array(W * H);
const mesaOf = new Int8Array(W * H).fill(-1);
const mesaDepth = new Float32Array(W * H);
/** how deep in the mesas' shadows the clouds lie */
const mesaShade = new Float32Array(W * H);

function precomputeMesas() {
  for (let x = 1590; x < W; x++) {
    // each mesa's south edge in this column, nearest mesa first
    const south = MAP_MESAS.map((m) => {
      if (Math.abs(x - m.x) > m.rx * 1.3) return -1;
      let s = -1;
      for (let y = Math.floor(m.y - m.ry * 1.4); y <= Math.ceil(m.y + m.ry * 1.4); y++) if (onTop(m, x, y)) s = y;
      return s;
    });
    for (let y = 0; y < H; y++) {
      if (x <= brinkX(y)) continue;
      const i = idx(x, y);
      for (let k = 0; k < MAP_MESAS.length; k++) {
        const m = MAP_MESAS[k];
        if (south[k] < 0) continue;
        if (onTop(m, x, y)) {
          mesaKind[i] = 1;
          mesaOf[i] = k;
          break;
        }
        // its cliff below the south edge, ragged at its foot where the clouds take it
        const d = y - south[k];
        if (d > 0 && d <= m.h + (vnoise(x, 0, 4, 1320 + m.seed) - 0.5) * 4) {
          mesaKind[i] = 2;
          mesaOf[i] = k;
          mesaDepth[i] = d / m.h;
          break;
        }
      }
    }
  }
  // the long shadows the low sun throws east over the clouds, a little to the south
  for (let x = 1590; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const i = idx(x, y);
      if (x <= brinkX(y) || mesaKind[i]) continue;
      for (let s = 1; s < 60; s++) {
        const sx = Math.round(x - s), sy = Math.round(y - s * 0.22);
        if (!inBounds(sx, sy)) break;
        const j = idx(sx, sy);
        if (sx <= brinkX(sy)) {
          // the brink's own shadow, short
          if (s < 7) mesaShade[i] = Math.max(mesaShade[i], 1 - s / 7);
          break;
        }
        if (mesaKind[j]) {
          const m = MAP_MESAS[mesaOf[j]];
          const len = m.h * 2.8 + 8;
          if (s < len) mesaShade[i] = Math.max(mesaShade[i], 1 - (s / len) * 0.7);
          break;
        }
      }
    }
  }
}

/** How far the storm has come over the land at x,y: 0 none, 1 under its dark; heaviest toward the north-east corner. */
const stormMapK = (x: number, y: number) => smooth(1846, 1898, x + y * 0.14 - 20 + (vnoise(x, y, 24, 1330) - 0.5) * 30 + (vnoise(x, y, 8, 1331) - 0.5) * 8);

/**
 * The gulf: the sea of cloud in billows lit gold and rose on their western
 * flanks, lilac in the hollows, dimming toward the storm, the mesas' long
 * shadows lying on it; the brink's face in its own shade; the mesas' tops
 * under snow, lit along their western edges, a bright cornice on the south;
 * their cliffs banded and fluted, glowing on the sun's side, wisps of cloud
 * at their feet.
 */
function mesaGround(x: number, y: number): RGBA {
  const i = idx(x, y);
  const kind = mesaKind[i];
  const st = stormMapK(x, y);
  if (kind === 1) {
    const m = MAP_MESAS[mesaOf[i]];
    // lit along its western and southern lips by the low sun, shaded along its northern and eastern; drifts combed across it by the wind
    const westLip = !onTop(m, x - 2, y) || !onTop(m, x - 1, y - 1);
    const southLip = !onTop(m, x, y + 1);
    const eastLip = !onTop(m, x + 2, y) || !onTop(m, x, y - 2);
    const comb = Math.sin(x * 0.55 - y * 1.3 + vnoise(x, y, 7, 1340 + m.seed) * 5);
    const drift = vnoise(x * 0.6, y * 1.8, 5, 1342 + m.seed);
    let v = 4.8 - ((x - m.x) / m.rx) * 1.1 - ((y - m.y) / m.ry) * 0.3 + (comb > 0.75 ? 0.9 : comb < -0.8 ? -0.6 : 0) + (drift - 0.5) * 0.8;
    if (westLip) v += 2;
    else if (southLip) v += 1.4;
    else if (eastLip) v -= 1.4;
    v -= st * 2.4;
    if (hash2(x, y, 1341) > 0.988) v += 1.4;
    return rampDither(MSNOW, clamp(v, 0, MSNOW.length - 1), x, y);
  }
  if (kind === 2) {
    const m = MAP_MESAS[mesaOf[i]];
    const d = mesaDepth[i];
    // the cliff: banded strata, fluted, lit toward the west, snow along a ledge, the foot lost in cloud
    const flute = Math.cos(x * 1.1 + vnoise(x, y, 5, 1350 + m.seed) * 3) > 0.5 ? 0.8 : 0;
    const band = Math.floor(d * m.h * 0.5 + (vnoise(x, 0, 6, 1351 + m.seed) - 0.5) * 1.6) % 3 === 0 ? -0.7 : 0;
    const side = clamp(1 - (x - (m.x - m.rx)) / (m.rx * 2), 0, 1);
    let v = 3 + side * 4.4 + flute + band - d * 2.4 - st * 2.6;
    if (d < 0.12) return rampDither(MSNOW, clamp(3.4 + side * 3 - st * 2, 0, MSNOW.length - 1), x, y);
    if (Math.abs(d - 0.45) < 0.06 && hash2(x >> 1, 0, 1352 + m.seed) > 0.45) return MSNOW[Math.round(clamp(2 + side * 3 - st * 2, 0, 8))];
    const wisp = d > 0.7 && vnoise(x, y, 3, 1353) > 0.5 + (1 - d) * 1.2;
    if (wisp) v = 6 + side * 2;
    return wisp ? rampDither(MSEA, clamp(v, 0, MSEA.length - 1), x, y) : rampDither(MROCK, clamp(v, 0, MROCK.length - 1), x, y);
  }
  // the brink's face: the steppe's edge falling away in its own shade
  const face = x - brinkX(y);
  if (face < 3 + vnoise(0, y, 5, 1360) * 2.4) return rampDither(MROCK, 2.2 - face * 0.3 + (Math.floor(y * 0.6 + vnoise(x, 0, 3, 1361) * 2) % 3 === 0 ? -0.6 : 0.3), x, y);
  // the sea of cloud: heaped billows melting into each other, lit gold on their flanks toward the sun, lilac in their hollows
  const lit = cloudLit(x, y, 11, 7, 1362) + cloudLit(x, y, 5, 3.4, 1363) * 0.45;
  const hgt = puffH(x, y, 11, 7, 1362);
  const deep = Math.max(0, 1 - face / 26);
  const warm = clamp((1780 - x) / 180, 0, 1);
  const v = 4.2 + lit * 5.2 + hgt * 1.6 - mesaShade[i] * 3.6 - st * 3.4 - deep * 2.4 + warm * 1.2;
  return rampDither(MSEA, clamp(v, 0, MSEA.length - 1), x, y);
}

/**
 * The height of a field of cloud billows at x,y: a dome over each of a
 * jittered grid of centres (cells `cw` x `ch` px, the domes of different
 * sizes), the domes melted into each other by a smooth maximum, so the
 * billows heap without seams.
 */
function puffH(x: number, y: number, cw: number, ch: number, seed: number): number {
  const gx = Math.floor(x / cw), gy = Math.floor(y / ch);
  let sum = 0;
  for (let j = gy - 1; j <= gy + 1; j++) {
    for (let i = gx - 1; i <= gx + 1; i++) {
      const cx = (i + 0.2 + hash2(i, j, seed) * 0.6) * cw, cy = (j + 0.2 + hash2(i, j, seed + 1) * 0.6) * ch;
      const r = 0.7 + hash2(i, j, seed + 2) * 0.75;
      const d2 = ((x - cx) / cw) ** 2 + ((y - cy) / ch) ** 2;
      const h = r * Math.sqrt(Math.max(0, 1 - d2 / (r * r)));
      sum += Math.exp(h * 7);
    }
  }
  return Math.log(sum) / 7;
}

/** How the cloud's surface at x,y takes the low sun from the west and a little north (its slope), -1..1. */
function cloudLit(x: number, y: number, cw: number, ch: number, seed: number): number {
  const gxs = puffH(x - 1, y, cw, ch, seed) - puffH(x + 1, y, cw, ch, seed);
  const gys = puffH(x, y - 1, cw, ch, seed) - puffH(x, y + 1, cw, ch, seed);
  return clamp(gxs * cw * 0.55 + gys * ch * 0.5, -1, 1);
}

/**
 * A billow of cloud seen from above at a slant: the nearest of a jittered
 * grid of centres (cells `cw` x `ch` px), a dome round it; how it takes the
 * low sun from the west (its normal), how high it heaps, and whether x,y lies
 * in the seam between two billows.
 */
function billow(x: number, y: number, cw: number, ch: number, seed: number): { lit: number; h: number; seam: boolean } {
  const gx = Math.floor(x / cw), gy = Math.floor(y / ch);
  let d1 = 9, d2 = 9, bx = 0, by = 0, br = 1;
  for (let j = gy - 1; j <= gy + 1; j++) {
    for (let i = gx - 1; i <= gx + 1; i++) {
      const cx = (i + 0.15 + hash2(i, j, seed) * 0.7) * cw, cy = (j + 0.15 + hash2(i, j, seed + 1) * 0.7) * ch;
      const r = 0.75 + hash2(i, j, seed + 2) * 0.6;
      const d = Math.hypot((x - cx) / cw, (y - cy) / ch) / r;
      if (d < d1) {
        d2 = d1;
        d1 = d;
        bx = (x - cx) / cw / r;
        by = (y - cy) / ch / r;
        br = r;
      } else if (d < d2) d2 = d;
    }
  }
  const h = Math.max(0, 1 - d1 * d1);
  // the light from the west and a little from the north (the upper left)
  const lit = clamp(-bx * 1.1 - by * 0.6, -1, 1) * (0.4 + 0.6 * Math.sqrt(1 - Math.min(1, d1)));
  return { lit, h: h * br, seam: d2 - d1 < 0.09 };
}

/** The clearing round the arbiter's mesa's node, where its medallion and its name stand. */
const mesaClear = (x: number, y: number) => clearing(x, y, NODES[4], 64, 36);

/** A mountain pine on a mesa's top: a dark cone of needles, snow on its west side, a shadow east. */
function mesaPine(b: Bitmap, x: number, y: number, h: number) {
  for (let k = 1; k <= 3; k++) b.set(x + k, y + 1, mix(b.get(x + k, y + 1), SHADOW, 0.4));
  for (let t = 0; t < h; t++) {
    const half = Math.round((h - t) * 0.4);
    for (let dx = -half; dx <= half; dx++) b.set(x + dx, y - t, dx < 0 && (t + dx) % 2 === 0 ? MSNOW[7] : MPINE[dx > 0 ? 0 : t % 2 ? 2 : 1]);
  }
  b.set(x, y - h, MSNOW[8]);
  b.set(x, y + 1, TIMBER[1]);
}

/**
 * The arbiter on its mesa: a seated figure of green bronze on a grey plinth,
 * a darker nimbus behind its head, its sword upright beside it catching the
 * sun; candles burning in a ring round the plinth; its long shadow east.
 */
function arbiterMap(b: Bitmap, x: number, y: number) {
  for (let k = 1; k < 14; k++) b.set(x + 3 + k, y + 1 + Math.round(k * 0.2), mix(b.get(x + 3 + k, y + 1 + Math.round(k * 0.2)), SHADOW, 0.45 - k * 0.025));
  stamp(b, x - 6, y - 12, 13, 14, (s) => {
    // the plinth
    for (let px = 1; px <= 11; px++) for (let py = 11; py <= 13; py++) s.set(px, py, px < 4 ? STONE[5] : STONE[3 + (py === 11 ? 1 : 0)]);
    // the nimbus, the lap, the body, the head
    for (const [px, py] of [[5, 2], [6, 1], [7, 1], [8, 2], [5, 3], [8, 3]]) s.set(px, py, MVERD[0]);
    for (let px = 3; px <= 9; px++) s.set(px, 10, MVERD[px < 6 ? 3 : 1]);
    for (let px = 2; px <= 10; px++) s.set(px, 9, MVERD[px < 5 ? 3 : 2]);
    for (let py = 5; py <= 8; py++) for (let px = 4; px <= 8; px++) s.set(px, py, MVERD[px < 6 ? 3 : 1]);
    s.set(6, 3, MVERD[3]);
    s.set(7, 3, MVERD[2]);
    s.set(6, 4, MVERD[3]);
    s.set(7, 4, MVERD[1]);
    // the raised palm, the sword upright on the left
    s.set(9, 6, MCANDLE[1]);
    for (let py = 0; py <= 8; py++) s.set(2, py, py === 7 ? MCANDLE[1] : MVEIL[py < 3 ? 3 : 2]);
    s.set(1, 7, MCANDLE[0]);
    s.set(3, 7, MCANDLE[0]);
    // snow on the head and the shoulders
    s.set(6, 2, MSNOW[8]);
    s.set(4, 5, MSNOW[7]);
  }, MVERD[0]);
  // the candles round the plinth
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const cx = Math.round(x + Math.cos(a) * 9), cy = Math.round(y + 1 + Math.sin(a) * 4);
    b.set(cx, cy, MCANDLE[k % 3 === 0 ? 3 : 2]);
  }
}

/**
 * The castle on its mesa, seen from above at a slant: a ring of wall with
 * merlons, round towers at its corners under snowy cones, the keep and the
 * great hall under snow, lit windows; its huge chimney rising over all of it,
 * dark, bound with iron, its mouth glowing violet.
 */
function castleMap(b: Bitmap, x: number, y: number) {
  shadowAt(b, x + 10, y + 2, 26, 6);
  stamp(b, x - 26, y - 34, 54, 40, (s) => {
    const cx = 26, cy = 34;
    // the curtain wall: a ring, its front face toward us, merlons along its top
    for (let px = cx - 22; px <= cx + 22; px++) {
      const u = (px - cx) / 22;
      const fy = Math.round(cy - 2 + Math.sqrt(Math.max(0, 1 - u * u)) * 4);
      const by = Math.round(cy - 12 - Math.sqrt(Math.max(0, 1 - u * u)) * 2);
      for (let py = fy - 3; py <= fy; py++) s.set(px, py, MCASTLE[u < -0.2 ? 4 : u < 0.4 ? 3 : 2]);
      s.set(px, fy - 4, px % 2 ? MSNOW[6] : MCASTLE[3]);
      s.set(px, by, MCASTLE[2]);
      s.set(px, by - 1, px % 2 ? MSNOW[5] : MCASTLE[2]);
      // the court inside, under snow
      for (let py = by + 1; py < fy - 4; py++) s.set(px, py, MSNOW[u < 0 ? 5 : 4]);
    }
    // the great hall: a long roof under snow
    for (let px = cx - 14; px <= cx + 6; px++) for (let py = cy - 13; py <= cy - 8; py++) s.set(px, py, py < cy - 11 ? MSNOW[px < cx - 4 ? 8 : 6] : MCASTLE[px < cx - 4 ? 4 : 3]);
    // the keep: a tall block over the hall's west end, its roof
    for (let px = cx - 12; px <= cx - 5; px++) for (let py = cy - 22; py <= cy - 9; py++) s.set(px, py, MCASTLE[px < cx - 9 ? 4 : 2]);
    for (let py = cy - 27; py < cy - 22; py++) for (let px = cx - 12 + (py - (cy - 27)) * 0; px <= cx - 5; px++) if (Math.abs(px - (cx - 8.5)) <= (py - (cy - 27)) * 0.9 + 0.5) s.set(px, py, px < cx - 8 ? MSNOW[8] : MSNOW[5]);
    // the round towers at its corners under snowy cones
    for (const [tx, ty, th] of [[cx - 22, cy - 4, 9], [cx + 22, cy - 4, 8], [cx - 18, cy - 13, 7], [cx + 16, cy - 13, 7]] as [number, number, number][]) {
      for (let py = ty - th; py <= ty; py++) for (let px = tx - 2; px <= tx + 2; px++) s.set(px, py, MCASTLE[px < tx ? 4 : px === tx ? 3 : 1]);
      for (let k = 0; k < 4; k++) for (let px = tx - (3 - k); px <= tx + (3 - k); px++) s.set(px, ty - th - 1 - k, px <= tx ? MSNOW[8] : MSNOW[5]);
    }
    // lit windows
    for (const [wx, wy] of [[cx - 10, cy - 18], [cx - 7, cy - 18], [cx - 10, cy - 14], [cx - 2, cy - 10], [cx + 2, cy - 10], [cx - 22, cy - 8], [cx + 22, cy - 7]] as [number, number][]) s.set(wx, wy, MCANDLE[2]);
    // the huge chimney: a tall dark stack at the east end, iron bands, the violet in its mouth
    for (let py = cy - 32; py <= cy - 6; py++) for (let px = cx + 6; px <= cx + 10; px++) s.set(px, py, (py - (cy - 32)) % 7 === 3 ? MCASTLE[5] : MCASTLE[px === cx + 6 ? 4 : px < cx + 9 ? 2 : 1]);
    for (let px = cx + 5; px <= cx + 11; px++) s.set(px, cy - 33, MCASTLE[3]);
    for (let px = cx + 7; px <= cx + 9; px++) s.set(px, cy - 34, MPLUME[6]);
  }, MCASTLE[0]);
}

/** A soft shadow on the map, cast to the east. */
function shadowAt(b: Bitmap, cx: number, cy: number, rx: number, ry: number) {
  ellipseFill(b, cx, cy, rx, ry, (px, py, d) => (dith(px, py, (1 - d) * 1.4) ? mix(b.get(px, py), SHADOW, 0.4) : 0));
}

/** The purple dust from the castle's chimney, drifting west on the wind from the storm, thinning out; motes of it sparkling round it. */
function plumeMap(b: Bitmap, x: number, y: number) {
  for (let k = 0; k < 26; k++) {
    const t = k / 25;
    const px = x - t * 78 - Math.sin(t * 5) * 2, py = y - 2 - t * 8 + Math.sin(t * 7) * 2;
    const r = 2 + t * 6;
    ellipseFill(b, px, py, r * 1.3, r * 0.8, (qx, qy, d) => {
      if (!dith(qx, qy, (1 - t * 0.85) * (1.1 - d * d))) return 0;
      const lit = (px - qx) / r * 0.6 + (py - qy) / r * 0.4;
      return MPLUME[Math.round(clamp(3 + lit * 2.4 + (1 - t) * 0.8, 0, MPLUME.length - 1))];
    });
  }
  for (let k = 0; k < 40; k++) {
    const t = hash2(k, 0, 1371);
    const mx = Math.round(x - t * 96 + (hash2(k, 1, 1371) - 0.5) * 18), my = Math.round(y - 4 - t * 10 + (hash2(k, 2, 1371) - 0.5) * 22);
    if (inBounds(mx, my)) b.set(mx, my, MPLUME[hash2(k, 3, 1371) > 0.6 ? 6 : 5]);
  }
}

/** The cables between the mesas (and to the brink), hung with candles: [from, to, sag]. */
const MAP_CABLES: [P, P, number][] = [
  [[1724, 94], [1738, 172], 4],
  [[1676, 98], [1622, 128], 3],
  [[1718, 80], [1786, 32], 3],
  [[1806, 186], [1836, 104], 4],
  [[1830, 214], [1862, 268], 3],
  [[1712, 222], [1676, 296], 4],
  [[1760, 232], [1728, 320], 3],
  [[1662, 156], [1700, 102], 2],
  [[1660, 160], [1712, 184], 3],
  [[1818, 228], [1828, 332], 3],
  [[1870, 90], [1888, 26], 2],
  [[1756, 26], [1786, 30], 1.5],
  [[1622, 238], [1648, 296], 3],
];

/** A cable over the gulf: a thin dark line sagging between its ends, candles hung along it at even steps. */
function cableMap(b: Bitmap, [ax, ay]: P, [bx, by]: P, sag: number) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = Math.round(ax + (bx - ax) * t), y = Math.round(ay + (by - ay) * t + Math.sin(t * Math.PI) * sag);
    if (!inBounds(x, y)) continue;
    b.set(x, y, MCASTLE[1]);
    if (k > 1 && k < n - 1 && k % 4 === 2) b.set(x, y + 1, MCANDLE[(k >> 2) % 3 === 0 ? 3 : 2]);
  }
}

/**
 * A bridge of rope the road crosses the gulf on: two rails sagging between
 * the brinks, planks between them, lanterns on the rails, its shadow on the
 * clouds below.
 */
function bridgeMap(b: Bitmap, [ax, ay]: P, [bx, by]: P, sag: number) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = Math.round(ax + (bx - ax) * t), y = Math.round(ay + (by - ay) * t + Math.sin(t * Math.PI) * sag);
    // its shadow on the clouds far below
    for (const [dx, dy] of [[5, 7], [6, 8]]) if (inBounds(x + dx, y + dy) && !mesaKind[idx(x + dx, y + dy)]) b.set(x + dx, y + dy, mix(b.get(x + dx, y + dy), SHADOW, 0.35));
    b.set(x, y - 1, TIMBER[1]);
    b.set(x, y, k % 2 ? TIMBER[3] : TIMBER[2]);
    b.set(x, y + 1, TIMBER[1]);
    if (k % 6 === 3) {
      b.set(x, y - 2, TIMBER[0]);
      b.set(x, y - 3, MCANDLE[2]);
    }
  }
}

/** A waterfall where a ravine falls over the brink: white water down the face, a cloud of spray at its foot. */
function waterfallMap(b: Bitmap, x: number, y: number, w: number) {
  for (let k = 0; k < 9; k++) for (let dx = 0; dx < w; dx++) b.set(x + dx + Math.round(k * 0.15), y + k, k % 3 === 0 && dx === w - 1 ? WATER[6] : MVEIL[k > 6 ? 2 : 3]);
  ellipseFill(b, x + w / 2 + 2, y + 10, w + 3, 3, (px, py, d) => (dith(px, py, (1 - d) * 1.3) ? MVEIL[d < 0.5 ? 3 : 2] : 0));
}

/**
 * The storm coming on from the east, heaviest in the north-east corner: dark
 * billows over the last mesas, lit rose along their western edges by the low
 * sun; before them veils of snow trailing west over the clouds and the mesas,
 * whitening them.
 */
function stormMap(b: Bitmap) {
  for (let y = 0; y < H; y++) {
    for (let x = 1800; x < W; x++) {
      const k = stormMapK(x, y);
      if (k <= 0.02) continue;
      if (k < 0.55) {
        // the veils before it: thin streaks of falling snow slanting west, sparser the further out
        const s = x + y * 0.5;
        const streak = Math.sin(s * 0.75 + vnoise(s, 0, 9, 1381) * 5) > 0.72 && vnoise(x, y * 0.3, 3, 1385) > 0.35;
        if (streak && dith(x, y, (k / 0.55) * 0.55)) b.set(x, y, MVEIL[hash2(x, y, 1382) > 0.7 ? 2 : 1]);
        continue;
      }
      // the storm's billows, seen from above: great heaped domes, lit rose on their western flanks at its front, slate behind
      const lit = cloudLit(x, y, 18, 12, 1383) + cloudLit(x, y, 7, 4.6, 1384) * 0.4;
      const front = 1 - smooth(0.55, 0.8, k);
      const v = 2.6 + lit * (2.6 + front * 3.4) + puffH(x, y, 18, 12, 1383) * 1.4 + front * 2.4 - (k - 0.55) * 2.4;
      b.set(x, y, rampDither(MSTORM, clamp(v, 0, MSTORM.length - 1), x, y));
    }
  }
}

/** The mesas' things that stand: the castle, the arbiter, the pines. */
function mesaThings(things: Thing[]) {
  things.push({ y: CASTLE_MAP_MESA.y + 2, draw: () => castleMap(b0, CASTLE_MAP_MESA.x, CASTLE_MAP_MESA.y + 2) });
  things.push({ y: ARBITER.y, draw: () => arbiterMap(b0, ARBITER.x, ARBITER.y) });
  for (const [x, y, h] of [[1748, 168, 6], [1792, 166, 7], [1806, 176, 5], [1734, 180, 5], [1820, 192, 6], [1716, 76, 4], [1854, 90, 4], [1880, 268, 4], [1668, 300, 4], [1720, 202, 4]] as [number, number, number][]) {
    if (!inBounds(x, y) || mesaClear(x, y) || roadDist[idx(x, y)] < 3 || mesaKind[idx(x, y)] !== 1) continue;
    things.push({ y, draw: () => mesaPine(b0, x, y, h) });
  }
}

/** where the arbiter sits on its mesa: north of the node, clear of its medallion */
const ARBITER = { x: 1770, y: 172 };

/** Everything over the gulf after the things: the waterfalls, the plume, the cables and bridges, the storm. */
function mesaOverlays(b: Bitmap) {
  waterfallMap(b, Math.round(brinkX(73)) + 1, 72, 3);
  waterfallMap(b, Math.round(brinkX(287)) + 1, 286, 2);
  plumeMap(b, CASTLE_MAP_MESA.x + 9, CASTLE_MAP_MESA.y + 2 - 33);
  for (const [a, c, sag] of MAP_CABLES) cableMap(b, a, c, sag);
  for (const [a, c, sag] of MESA_BRIDGES) bridgeMap(b, a, c, sag);
  stormMap(b);
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
/** where the zeppelin passes over the steppe */
const ZEPPELIN: P = [1386, 50];

/** The steppe's camps and herds, kurgans, the cairn by the road, trees on the northern ravine's floor, stones. */
function steppeThings(things: Thing[]) {
  for (const c of CAMPS) {
    for (const [x, y, w, old] of c.yurts) things.push({ y, draw: () => yurtMap(b0, x, y, w, old) });
    for (const [x, y, h] of c.poles) things.push({ y, draw: () => flagPoleMap(b0, x, y, h) });
  }
  // wild yaks in small herds, some heads one way, some the other
  const herds: [number, number, number][] = [[1452, 44, 6], [1556, 112, 5], [1466, 336, 6], [1560, 240, 4], [1348, 226, 4], [1586, 30, 3], [1396, 296, 5], [1520, 16, 4], [1344, 334, 3]];
  herds.forEach(([hx, hy, n], h) => {
    for (let k = 0; k < n; k++) {
      const x = Math.round(hx + (hash2(h, k, 1271) - 0.5) * 22), y = Math.round(hy + (hash2(h, k, 1272) - 0.5) * 9);
      if (!inBounds(x, y) || scarKind[idx(x, y)] || steppeClear(x, y) || roadDist[idx(x, y)] < 3) continue;
      things.push({ y, draw: () => yakMap(b0, x, y, hash2(h, k, 1273) < 0.5, h * 10 + k) });
    }
  });
  things.push({ y: 212, draw: () => kurgan(b0, 1574, 212, 7, 1) });
  things.push({ y: 124, draw: () => kurgan(b0, 1440, 124, 5.5, 2) });
  // an alley of stone figures leading east from the eastern kurgan
  for (let k = 0; k < 5; k++) things.push({ y: 213 + k, draw: () => balbal(b0, 1584 + k * 3, 213 + k) });
  // a lone old tree by the eastern kurgan
  things.push({ y: 204, draw: () => broadleaf(b0, 1588, 204, 4.2, LEAF, 2.6, 1291, true) });
  // the main camp's corral, a ring of posts, and a cart by the western camp
  things.push({ y: 166, draw: () => corral(b0, 1536, 166) });
  things.push({ y: 158, draw: () => cartMap(b0, 1394, 158) });
  // shrubs crouching along the ravines' rims, where the wind cannot reach the hollows
  for (let k = 0; k < 70; k++) {
    const north = k % 2 === 0;
    const pts = north ? SCAR_N : SCAR_S;
    const x = Math.round(1340 + hash2(k, 0, 1292) * 255);
    const c = scarAt(pts, x);
    if (!c) continue;
    const h = (north ? halfN : halfS)(x, c.t);
    const y = Math.round(c.y + (hash2(k, 1, 1292) < 0.5 ? -h - 1.5 - hash2(k, 2, 1292) * 3 : h + 1.5 + hash2(k, 2, 1292) * 3));
    if (!inBounds(x, y) || scarKind[idx(x, y)] || steppeClear(x, y) || roadDist[idx(x, y)] < 3) continue;
    things.push({ y, draw: () => shrub(b0, x, y, k) });
  }
  things.push({ y: 182, draw: () => cairnMap(b0, 1328, 182) });
  // trees along the northern ravine's floor, out of the wind
  for (let k = 0; k < 14; k++) {
    const x = 1396 + k * 14 + Math.round((hash2(k, 0, 1274) - 0.5) * 8);
    const c = scarAt(SCAR_N, x);
    if (!c || hash2(k, 1, 1274) < 0.35) continue;
    const y = Math.round(c.y + halfN(x, c.t) * 0.42);
    if (scarKind[idx(x, y)] === 1) things.push({ y, draw: () => scarTree(b0, x, y, k) });
  }
  // stones out on the grass
  for (let k = 0; k < 44; k++) {
    const x = 1330 + hash2(k, 0, 1275) * 266, y = 6 + hash2(k, 1, 1275) * 348;
    const xi = Math.round(x), yi = Math.round(y);
    if (steppeK(x, y) < 1 || scarKind[idx(xi, yi)] || lakeK(x, y) > -0.3 || steppeClear(x, y) || campK(x, y) > 0.1 || roadDist[idx(xi, yi)] < 4) continue;
    things.push({ y, draw: () => pebbleMap(b0, xi, yi, hash2(k, 2, 1275) > 0.7) });
  }
}
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
      if (x > 850 && paleK(x, y) > 0.1) continue;
      b.set(x, y, FLOWERS[Math.floor(hash2(gx, gy, 903) * FLOWERS.length)]);
    }
  }
  // the steppe's own flowers, sparse: purple, yellow, white
  for (let gy = 0; gy < H; gy += 5) {
    for (let gx = 1300; gx < W; gx += 5) {
      if (hash2(gx, gy, 1261) > 0.1) continue;
      const x = gx + Math.floor(hash2(gx, gy, 1262) * 5), y = gy + Math.floor(hash2(gx, gy, 1263) * 5);
      if (!inBounds(x, y) || steppeK(x, y) < 1 || scarKind[idx(x, y)] || lakeK(x, y) > -0.2 || roadDist[idx(x, y)] < 3 || campK(x, y) > 0.2 || steppeClear(x, y) || x > brinkX(y) - 2) continue;
      b.set(x, y, [NEBULA[6], GOLD[2], FLOWERS[1], NEBULA[5], GOLD[2], WOOL[2]][Math.floor(hash2(gx, gy, 1264) * 6)]);
    }
  }
  hairlines(b);
  trailingRoots(b);
  basinReeds(b);
  road(b, ROAD_FAR);
  road(b, ROAD_NEAR);
  riverBridge(b);
  // footpaths in the village and out to the mill, the chapel and the burnt farm
  footpath(b, [NODES[0], [316, 176], GREEN, [304, 130], [300, 112]]);
  footpath(b, [GREEN, [344, 140], [358, 122], CHAPEL]);
  footpath(b, [GREEN, [380, 140], [410, 130], WINDMILL]);
  footpath(b, [GREEN, [270, 150], [240, 154]]);
  footpath(b, [[300, 226], [272, 210], [250, 214], HAYFIRE]);
  // paths from the steppe's camps to the road
  footpath(b, [[1500, 162], [1488, 174], [1476, 186]]);
  footpath(b, [[1378, 158], [1384, 174], [1392, 190], [1396, 197]]);
  // the herders' and the yaks' trails: down to the water in the northern ravine, along its rim, out across the grass
  for (const t of TRAILS) footpath(b, t);
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
  eastHills(things);
  basinStones(things);
  steppeThings(things);
  mesaThings(things);
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
    if (!inBounds(x, y) || sdAt(x, y) < 6 || forestAt(x, y) > 0.3 || parcelAt(x, y) || roadDist[idx(x, y)] < 5 || inRiver(x, y) > -3 || core(x, y) || nodeClear(x, y) || glade(x, y) || x > brinkX(y) - 4) continue;
    if (x > 850 && paleK(x, y) > 0.1) continue;
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
  basinMotes(b);
  // smoke from the yurts' stovepipes, and the zeppelin passing over, its shadow on the grass far below
  CAMPS.forEach((c, i) => c.yurts.forEach(([x, y, w], k) => k === 0 && plume(b, x - 1, Math.round(y - w * 0.62) - 1, 4, 20 + i)));
  zeppelinShadow(b, ZEPPELIN[0], ZEPPELIN[1]);
  zeppelinMap(b, ZEPPELIN[0], ZEPPELIN[1]);
  // the Snowy Mesa's waterfalls, plume, cables and bridges, and the storm over it all
  mesaOverlays(b);
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

/** Shrinks a bitmap k times (k may be fractional) by averaging the source pixels under each overview pixel, weighted by how much of each it covers. */
function shrink(src: Bitmap, k: number): Bitmap {
  const out = new Bitmap(Math.round(src.w / k), Math.round(src.h / k));
  for (let y = 0; y < out.h; y++) {
    const y0 = y * k, y1 = y0 + k;
    for (let x = 0; x < out.w; x++) {
      const x0 = x * k, x1 = x0 + k;
      let r = 0, g = 0, bl = 0, wsum = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        const wy = Math.min(y1, sy + 1) - Math.max(y0, sy);
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const wx = Math.min(x1, sx + 1) - Math.max(x0, sx);
          const c = src.get(sx, sy), w = wx * wy;
          r += R(c) * w;
          g += G(c) * w;
          bl += B(c) * w;
          wsum += w;
        }
      }
      out.set(x, y, rgba(Math.round(r / wsum), Math.round(g / wsum), Math.round(bl / wsum)));
    }
  }
  return out;
}

/** The scrolling world, and the overview: the same world at half the size, so it fits one screen. */
export function buildMap(out: string) {
  const world = renderWorld();
  world.save(path.join(out, 'map', 'world.png'));
  world.save(path.join('docs', 'images', 'world_map.png'));
  const overview = shrink(world, WORLD_MAP.overview);
  overview.save(path.join(out, 'map', 'overview.png'));
  console.log(`  map: world ${world.w}x${world.h}, overview ${overview.w}x${overview.h}, ${LOCATIONS.length} campaign nodes`);
}
