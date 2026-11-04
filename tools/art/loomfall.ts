// Loomfall: the main menu's own diorama (Jakub, 2026-11-04: "totally redesign
// main menu diorama. be creative and consistent and also make each
// navigational menu an object, building or something ... do not reuse
// environment or how it looks right now. i dont want to have floating islands
// in space like now"; the same day "prepare a navigational object and place for
// new content ... just call it Extra Combat", "locked until player win
// campaign 10-10").
//
// A town on a terrace over a valley at dusk, where the Archivist keeps the
// legends recollected. Beyond the valley the broken Loom stands as a colossal
// ruin: one upright whole with the stump of its beam, the other leaning and
// snapped off, its warp threads hanging, torn; the title hangs in the gap where
// the beam fell. The sun has just gone down behind the mountains in the west
// (the key light from the top-left, as everywhere): the low sky burns there,
// the windows are lit. Each way on from the menu is a place of the town:
//   the Clocktower (the options), on the west edge, its gears turning;
//   the Weavers' Mill (Weaving), its wheel turned by the aqueduct, dyed cloth
//     drying, a spool for its sign;
//   the Reliquary (the champions), the domed hall at the head of the square,
//     two legends in stone on its steps;
//   the Athenaeum (the Academy), the library tower, an owl on its balcony;
//   the Arena (Extra Combat), across the lake, sealed until 10-10 is won;
//   the Wayfarers' Gate (the campaign), on the east edge, the four factions'
//     banners on its towers, the road going down into the valley through it;
//   the Wishing Well (summoning), in the square, the Wishing Star hanging over it;
//   the Merchant's Wagon (the Merchant), in the square's west corner;
//   the Herald's Board (the Challenges), in its east corner.
// Everything here is a first take of mine: names, places and look.
//
// Writes public/assets/menu/ (sky.png, scene.png, menu.json) and the preview
// docs/images/menu_loomfall.png. The runtime is src/game/view/loomfall.ts.
import path from 'node:path';
import { writeJson } from './io.ts';
import { MAT, UIR } from './palette.ts';
import { dith, ellipseFill, outline, polyFill, rampDither } from './paint.ts';
import { A, Bitmap, hash2, hex, mix, packShelves, RGBA } from './raster.ts';
import { starCrystal, StarShape } from './star.ts';
import { EMBLEMS } from './ui/menu.ts';

const H = (list: string[]) => list.map((h) => hex(h));
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;
const W = 640, HT = 360;

function vnoise(x: number, y: number, cell: number, seed: number): number {
  const gx = x / cell, gy = y / cell;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// ---------------------------------------------------------------------------
// palette: dusk
// ---------------------------------------------------------------------------

/** the sky, from the night coming on overhead to the burning west at the horizon */
const SKY = H(['#0e1230', '#121838', '#171e42', '#1d264e', '#242f5a', '#2c3866', '#364270', '#424c78', '#50567e', '#605e84', '#726688', '#866c8a', '#9c7488', '#b27c84', '#c68680', '#d6947c', '#e4a47a', '#eeb87e', '#f6cc8a']);
/** the clouds, their tops in the blue, their undersides lit from the west */
const CLOUD = H(['#24264a', '#2e305a', '#3c3d6c', '#4e4c7c', '#645888', '#7e6290', '#9a6e90', '#b67c8c', '#ce8c86', '#e4a284', '#f2bc8e', '#fcd6a2']);
const STARC = H(['#4a527e', '#7a84b0', '#b4bce0', '#eef2ff', '#ffffff']);
const MOONC = H(['#6a5c72', '#ac9a9a', '#e2d0bc', '#fff4de']);
/** the Loom's stone in the haze of the distance, its edges catching the west light, its gold */
const LOOM = H(['#2c2844', '#34304e', '#3d3858', '#474162', '#524b6c', '#5e5576', '#6b6080', '#796c8a', '#887894', '#98869e', '#aa96aa']);
const LOOMRIM = H(['#c49aa2', '#e6baae']);
const LGOLD = H(['#463848', '#6a5246', '#94704a', '#bc9456', '#e2bc6e']);
/** the warp threads: their halo, their light */
const THREAD = H(['#4a4474', '#8a7caa', '#d8c8bc', '#fff0cc', '#ffffff']);
const FARM = H(['#30315a', '#383862', '#41406c', '#4b4874', '#57527c', '#645c84', '#72688c', '#827494', '#94829e']);
const SNOW = H(['#7a78a4', '#9a92ba', '#c0aac2', '#e2c4c6', '#f8e0d8']);
const NEAR = H(['#171a2c', '#1d2034', '#23283e', '#2a3048', '#323a52', '#3c445e']);
const LAKE = H(['#1c2244', '#262e52', '#343c62', '#464c72', '#5c5c80', '#78688a', '#987890', '#ba8a8e', '#d89c8a', '#eeb68e', '#fad2a0']);
/** the town's stone: the terrace, the square, the mill's foot, the Athenaeum */
const TOWN = H(['#1a1620', '#241e2a', '#2e2734', '#3a313f', '#463b4a', '#544755', '#635461', '#73636d', '#857379', '#988584', '#ac988f', '#c0ab9c', '#d4c0ac']);
/** the Clocktower's and the Gate's darker stone */
const DARK = H(['#131119', '#1b1823', '#24202d', '#2e2938', '#393343', '#453e4f', '#524a5c', '#61586a', '#716779', '#837888', '#978b98']);
/** the Reliquary's marble */
const MARBLE = H(['#211d31', '#2d273d', '#3a334a', '#4a4058', '#5b4f66', '#6e6074', '#827282', '#988590', '#ae9a9e', '#c4aeac', '#d8c2b8', '#ead6c6', '#f8e8d8']);
/** the square's cobbles: violet in their shadows, warm where the lamplight falls */
const COBBLE = H(['#1c1720', '#271f29', '#332832', '#40323b', '#4d3c42', '#5b474a', '#6a5352', '#7a6059', '#8b6e62', '#9d7e6c', '#b08f78', '#c2a186', '#d4b496']);
const SLATE = H(['#101120', '#16182a', '#1e2236', '#272d44', '#313a52', '#3d4862', '#4a5772', '#5a6884']);
const TILE = H(['#1c0d10', '#2a1214', '#3c1a18', '#50231c', '#663022', '#7c3c28', '#944c32', '#ac603e']);
const WOOD = H(['#120b0a', '#1c120e', '#291a12', '#382416', '#48301c', '#5a3e24', '#6e4e2e', '#84603a']);
const PLASTER = H(['#43363c', '#5a4a4e', '#73615f', '#8c7a72', '#a69284', '#bea996', '#d2bea8']);
/** lamplight through windows and doors, and flames */
const LAMP = H(['#4a1c10', '#8a3a14', '#c8601a', '#f0902a', '#ffbe4c', '#ffe08a', '#fff6d0']);
const GOLD = MAT.gold.ramp;
const BRONZE = MAT.bronze.ramp;
/** the Wishing Star's lilac light (as tools/art/ui/summon.ts SOUL: the Soulstar is a piece of it) */
const SOUL = H(['#1a1230', '#2c2050', '#433474', '#5f4e9c', '#8a78c4', '#b6a8e6', '#e0d8fa', '#ffffff']);
const WATER = H(['#16243e', '#203452', '#2e4a68', '#40627e', '#5a7e96', '#7ea0b2', '#aecad4', '#e2f2f4']);
const ENAMEL = H(['#6e6266', '#958880', '#bcae9c', '#ddd0b8', '#f4ead4']);
const CANVAS = H(['#0c1c1e', '#12292c', '#1a383a', '#22484a', '#2c5a5a', '#386e6c', '#48827c', '#5c968c']);
const PARCH = H(['#3e3230', '#5e4e44', '#86725e', '#ac977a', '#cdb994', '#e6d7b2', '#f6ecd2']);
const WAX = H(['#3a0a10', '#7a1418', '#b42a24', '#e0573e', '#f8946c']);
const LEAF = H(['#0c1416', '#111c1c', '#172622', '#1d3028', '#253c30']);
/** dyed cloth: the four factions' colours */
const DYES = [H(['#0e1a3c', '#16285e', '#20408c', '#2e5ab8', '#4a7ad8']), H(['#2a0810', '#4a0e18', '#741822', '#a0262e', '#c84a44']), H(['#0c1e10', '#143018', '#1e4622', '#2c6230', '#468040']), H(['#1e1e22', '#2e2e34', '#46464c', '#64646a', '#8a8a8e'])];

// ---------------------------------------------------------------------------
// layout (screen pixels)
// ---------------------------------------------------------------------------

/** where the far mountains meet the valley, the low sky burning */
const HORIZON = 186;
/** the terrace the town's halls stand on (their feet), and the square below its wall */
const TERRACE = 220;
const SQUARE = 238;
const CLOCK = { x0: 10, x1: 94, cx: 52, face: { cx: 52, cy: 82, r: 17 } };
const MILL = { x0: 148, x1: 226, apex: [187, 104] as [number, number], wheel: { cx: 128, cy: 178, r: 24 } };
const REL = { cx: 320 };
const ATH = { cx: 433 };
const ARENA = { cx: 520, top: 168, base: 190, rx: 33, ry: 7 };
const GATE = { x0: 556, x1: 636 };
const WELL = { cx: 320, rim: 288, rx: 30, ry: 7 };
const STAR = { cx: 320, cy: 252 };
const WISH_STAR: StarShape = { up: 16, down: 17, side: 11, diag: 7.5, waist: 5.5 };

const TWINKLES: [number, number, number][] = [];
const WARP: [number, number][][] = [];

// ---------------------------------------------------------------------------
// the sky: the dusk, the clouds, the moon, the broken Loom, the mountains, the lake
// ---------------------------------------------------------------------------

function skyImage(): Bitmap {
  const b = new Bitmap(W, HT);
  for (let y = 0; y < HT; y++) {
    for (let x = 0; x < W; x++) {
      const t = Math.min(1, y / HORIZON);
      // the sun went down behind the western mountains: the low sky warmest there
      const sun = Math.max(0, 1 - Math.hypot((x - 30) / 430, (y - HORIZON) / 170));
      const v = (SKY.length - 1) * Math.pow(t, 1.35) + sun * sun * 2.6 - 1.2 + (vnoise(x, y, 36, 11) - 0.5) * 0.6;
      b.set(x, y, rampDither(SKY, v, x, y));
    }
  }
  stars(b);
  moon(b);
  clouds(b);
  loom(b);
  mountains(b);
  valley(b);
  return b;
}

/** The first stars overhead, fading out toward the glow; the brighter ones twinkle at runtime. */
function stars(b: Bitmap) {
  for (let y = 2; y < 120; y++) {
    for (let x = 2; x < W - 2; x++) {
      const fade = 1 - y / 120;
      if (hash2(x, y, 21) < 1 - 0.0034 * fade * fade) continue;
      const k = hash2(x, y, 22) * fade;
      b.set(x, y, STARC[k > 0.7 ? 4 : k > 0.45 ? 3 : k > 0.2 ? 2 : 1]);
      if (k > 0.32) TWINKLES.push([x, y, k > 0.72 ? 2 : 1]);
    }
  }
}

/** A thin crescent high in the east, lit on its west side by the sun gone down. */
const MOONP = { x: 604, y: 30, r: 8 };
function moon(b: Bitmap) {
  const { x: cx, y: cy, r } = MOONP;
  for (let y = cy - r - 9; y <= cy + r + 9; y++) {
    for (let x = cx - r - 9; x <= cx + r + 9; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r && d < r + 9 && dith(x, y, (1 - (d - r) / 9) * 0.32)) b.set(x, y, mix(b.get(x, y), MOONC[2], 0.16));
      if (d > r) continue;
      const ds = Math.hypot(x + 0.5 - (cx + 3.4), y + 0.5 - (cy - 2.2));
      if (ds < r * 0.88) continue;
      const edge = Math.min(r - d, ds - r * 0.88);
      b.set(x, y, MOONC[edge < 0.7 ? 1 : edge < 1.7 ? 2 : 3]);
    }
  }
}

const CLOUDS = [
  { y: 106, x0: -40, x1: 268, h: 13, seed: 31 },
  { y: 126, x0: 350, x1: 690, h: 11, seed: 32 },
  { y: 148, x0: -40, x1: 216, h: 9, seed: 33 },
  { y: 160, x0: 282, x1: 700, h: 8, seed: 34 },
  { y: 76, x0: 432, x1: 652, h: 5, seed: 35 },
];

/** Banks of cloud over the west and the east: puffed tops gone blue, flat undersides lit by the sunken sun. */
function clouds(b: Bitmap) {
  for (const c of CLOUDS) {
    for (let x = Math.max(0, c.x0); x < Math.min(W, c.x1); x++) {
      const u = (x - c.x0) / (c.x1 - c.x0);
      const puff = vnoise(x, 0, 19, c.seed) * 0.6 + vnoise(x, 0, 7, c.seed + 1) * 0.4;
      const thick = c.h * Math.pow(Math.sin(Math.PI * u), 0.5) * (0.5 + 0.75 * puff);
      if (thick < 1.2) continue;
      const top = c.y - thick * 0.72, bot = c.y + thick * 0.28 + (vnoise(x, 0, 11, c.seed + 2) - 0.5) * 1.5;
      for (let y = Math.floor(top); y <= Math.ceil(bot); y++) {
        const k = (y - top) / Math.max(1, bot - top);
        if (k < 0.12 && !dith(x, y, k * 8)) continue;
        if (k > 0.94 && !dith(x, y, (1 - k) * 16)) continue;
        const v = 0.8 + Math.pow(k, 1.4) * 7.4 + (1 - x / W) * 2.6 - (c.y < 90 ? 1.4 : 0) + (vnoise(x, y, 5, c.seed + 3) - 0.5) * 1.1;
        b.set(x, y, rampDither(CLOUD, v, x, y));
      }
    }
  }
}

/** A sliver of noise along a line, for jagged breaks. */
const jag = (s: number, seed: number) => hash2(Math.floor(s), 0, seed);

/**
 * One of the Loom's uprights: a column of colossal size built of great drums
 * of stone, round, lit on its west side and hazed by the distance; its drums'
 * joints, chips out of its edges, cracks, carved bands of gold with runes;
 * whole, or snapped off in a jagged break.
 */
function upright(b: Bitmap, foot: [number, number], top: [number, number], hw0: number, hw1: number, bands: number[], snapped: boolean, seed: number) {
  const [fx, fy] = foot, [tx, ty] = top;
  // the drums: their joints, a little apart in width
  const joints: number[] = [];
  for (let y = fy; y > ty - 20; y -= 13 + Math.floor(hash2(y, 0, seed) * 5)) joints.push(y);
  const drumOf = (y: number) => joints.findIndex((j, i) => y <= j && (i === joints.length - 1 || y > joints[i + 1]));
  for (let y = Math.floor(ty) - 12; y <= fy; y++) {
    const t = clamp((y - ty) / (fy - ty));
    const d = drumOf(y);
    const cx = tx + (fx - tx) * t, hw = hw1 + (hw0 - hw1) * t + (hash2(d, 1, seed) - 0.5) * 1.6;
    const jointY = joints[d] ?? fy;
    for (let x = Math.floor(cx - hw - 1); x <= Math.ceil(cx + hw + 1); x++) {
      const u = (x + 0.5 - cx) / hw;
      if (Math.abs(u) > 1) continue;
      // chips out of the edges, more of them on the shadowed side
      if (Math.abs(u) > 0.9 && hash2(Math.floor(y / 3), x > cx ? 2 : 1, seed + 1) > (u > 0 ? 0.55 : 0.75)) continue;
      if (snapped) {
        // the break: a jagged fracture falling to the east, a tooth of stone left standing
        const edge = ty + (u + 1) * 8 + jag(x * 0.6, seed + 2) * 6 - (Math.abs(u + 0.55) < 0.12 ? 10 : 0);
        if (y < edge) continue;
        if (y < edge + 1.5) {
          b.set(x, y, LOOM[2]);
          continue;
        }
      } else if (y < ty) continue;
      let v = 4.6 - u * 2.8 + t * 1.6 + (vnoise(x, y, 6, seed + 3) - 0.5) * 0.9;
      // a drum's joint: a dark seam, the drum below it catching light on its top
      if (y === jointY - 13 || jointY - y === 0) v -= 2.2;
      else if (jointY - y === 12) v += 0.9;
      // streaks weathered down from the joints
      if (hash2(x, d, seed + 4) > 0.86 && (jointY - y) > 4) v -= 0.8;
      // cracks running down a drum or two
      if (Math.abs(x - (cx + Math.round((hash2(d, 5, seed) - 0.5) * hw) + Math.round(Math.sin(y * 0.7) * 1))) < 0.6 && hash2(d, 6, seed) > 0.55) v -= 2;
      let c = rampDither(LOOM, v, x, y);
      for (const by of bands) {
        if (y >= by && y < by + 4) {
          c = rampDither(LGOLD, 2.2 - u * 1.8 + (y === by ? 1.2 : 0) - (y === by + 3 ? 1.2 : 0), x, y);
          if (y === by + 1 && Math.abs(Math.sin(u * 8)) > 0.9) c = LGOLD[4];
        }
      }
      if (u < -0.86) c = LOOMRIM[u < -0.94 ? 1 : 0];
      b.set(x, y, c);
    }
  }
}

/** A warp thread hanging from (x, y0) to y1, wavering a little as it hangs; its light dithered, a faint halo; a snapped one ends frayed. */
function hangThread(b: Bitmap, x0: number, y0: number, y1: number, frayed: boolean, seed: number): [number, number][] {
  const path: [number, number][] = [];
  const bright = 2 + hash2(x0, 0, seed);
  for (let y = y0; y <= y1; y++) {
    const x = x0 + Math.round(Math.sin((y - y0) / 23 + seed) * 0.7 * Math.min(1, (y - y0) / 30));
    for (const dx of [-1, 1]) if (dith(x + dx, y, 0.24)) b.set(x + dx, y, mix(b.get(x + dx, y), THREAD[0], 0.55));
    const bead = hash2(Math.floor((y - y0) / 5), x0, seed + 1) > 0.9 && (y - y0) % 5 === 0;
    b.set(x, y, bead ? THREAD[4] : dith(x, y, bright - 2) ? THREAD[3] : THREAD[2]);
    if (y % 3 === 0) path.push([x, y]);
  }
  if (frayed) for (const [dx, dy] of [[-1, 1], [1, 1], [-1, 2], [1, 3], [-2, 3], [2, 4]]) b.set(x0 + dx, y1 + dy, THREAD[dy > 2 ? 1 : 2]);
  return path;
}

/**
 * The broken Loom beyond the valley: the west upright whole, rising out of
 * the sky, its capital carrying the stump of the great beam, snapped short of
 * the middle; a curtain of threads hanging from it, some down into the valley,
 * some snapped; a block of the beam dangling from a few of them; the east upright leaning, snapped off far below its top.
 */
const LEFT_UP = { foot: [134, 194] as [number, number], top: [130, 12] as [number, number] };
const RIGHT_UP = { foot: [506, 194] as [number, number], top: [521, 60] as [number, number] };
function loom(b: Bitmap) {
  upright(b, LEFT_UP.foot, LEFT_UP.top, 21, 17, [40, 92, 150], false, 601);
  upright(b, RIGHT_UP.foot, RIGHT_UP.top, 20, 16, [112, 160], true, 611);
  const [lx] = LEFT_UP.top;
  // the capital: a stepped block, gold along its lips
  for (let y = 0; y <= 14; y++) {
    const half = y < 6 ? 30 : 30 - (y - 6) * 1.1;
    for (let x = Math.floor(lx - half); x <= Math.ceil(lx + half); x++) {
      const u = (x + 0.5 - lx) / half;
      let v = (y < 6 ? 7 : 5.4) - u * 2.2 - (y === 5 || y === 14 ? 2 : 0) + (vnoise(x, y, 5, 621) - 0.5) * 0.6;
      let c = rampDither(LOOM, v, x, y);
      if (y === 6 || y === 7) c = LGOLD[y === 6 ? 4 : 2];
      if (u < -0.92) c = LOOMRIM[1];
      b.set(x, y, c);
    }
  }
  // the great beam out of it, its front face, its underside, snapped off in splinters
  for (let y = 1; y <= 26; y++) {
    const endX = 196 + jag(y / 2, 622) * 10 - (y > 18 ? (y - 18) * 1.6 : 0) + (y < 6 ? 6 : 0);
    for (let x = Math.ceil(lx + 30); x <= endX; x++) {
      const k = (y - 1) / 25;
      let v = k < 0.1 ? 8 : k > 0.82 ? 1.6 : 5.6 - k * 2.4 + (vnoise(x, y, 6, 623) - 0.5) * 0.8;
      if (x > endX - 2.5) v -= 2;
      if (Math.floor(x / 22) !== Math.floor((x - 1) / 22) && k > 0.1 && k < 0.82) v -= 1.6;
      let c = rampDither(LOOM, v, x, y);
      if (y === 9 || y === 10) c = LGOLD[y === 9 ? 4 : 2];
      b.set(x, y, c);
    }
  }
  // splinters standing off the break
  for (const [x, y, len] of [[207, 3, 5], [203, 22, 4], [209, 12, 3]] as const) for (let k = 0; k < len; k++) b.set(x + k, y - Math.round(k * 0.4), LOOM[k < 2 ? 5 : 3]);
  // the threads: a curtain along the beam, down into the valley or snapped; a few off the capital
  const curtain: [number, number][] = [[166, 198], [169, 120], [172, 198], [175, 64], [178, 160], [181, 198], [184, 96], [187, 138], [190, 198], [193, 72], [196, 110], [104, 198], [108, 126], [112, 84], [156, 198], [161, 140]];
  curtain.forEach(([x, end], i) => {
    const path = hangThread(b, x, x < lx ? 15 : 27, end, end < 198, 630 + i);
    // the light runs down only the ones whole into the valley, above the mountains
    if (end >= 198) WARP.push(path.filter(([px, py]) => py < farRidge(px) - 1));
  });
  // a block of the beam, torn off, dangling from three of them
  for (let y = 70; y <= 86; y++) {
    for (let x = 178; x <= 196; x++) {
      const edge = (x === 178 || x === 196 || y === 86) && hash2(x, y, 624) > 0.5;
      if (edge) continue;
      const k = (y - 70) / 16;
      b.set(x, y, rampDither(LOOM, (k < 0.12 ? 7 : 4.8 - k * 2) - (x - 178) / 12, x, y));
      if (y === 76 || y === 77) b.set(x, y, LGOLD[y === 76 ? 3 : 1]);
    }
  }
  // from the east upright's break: one thread still reaching down, the others snapped short
  const [rx, ry] = RIGHT_UP.top;
  const right = hangThread(b, rx + 4, ry + 14, 198, false, 650);
  WARP.push(right.filter(([px, py]) => py < farRidge(px) - 1));
  for (const [dx, len] of [[-6, 22], [-1, 34], [9, 16], [12, 28]] as const) hangThread(b, rx + dx, ry + 18, ry + 18 + len, true, 651 + dx);
}

const PEAKS: [number, number, number][] = [[58, 36, 46], [214, 20, 40], [370, 30, 52], [574, 34, 48]];
function farRidge(x: number): number {
  let r = 178;
  for (const [px, h, w] of PEAKS) r -= h * Math.pow(Math.max(0, 1 - Math.abs(x - px) / w), 1.25);
  return r - 6 * vnoise(x, 0, 40, 71) - 3 * vnoise(x, 0, 11, 72);
}
const nearRidge = (x: number) => 190 - 12 * vnoise(x, 0, 80, 81) - 5 * vnoise(x, 0, 23, 82);
const LAKE_TOP = 201;

/** The mountains across the valley, snow on their peaks lit by the west; the wooded hills before them. */
function mountains(b: Bitmap) {
  for (let x = 0; x < W; x++) {
    const r = farRidge(x);
    const lit = clamp((farRidge(x - 2) - farRidge(x + 2)) * 0.45, -1, 1);
    const peak = Math.max(...PEAKS.map(([px, , w]) => Math.max(0, 1 - Math.abs(x - px) / (w * 0.7))));
    for (let y = Math.floor(r); y < LAKE_TOP; y++) {
      const depth = y - r;
      const gully = vnoise(x * 1.2, y * 0.22, 5, 73) - 0.5;
      if (depth < 4 + peak * 14 + gully * 6) {
        b.set(x, y, rampDither(SNOW, 1.4 + lit * 1.8 + (depth < 1.5 ? 0.8 : 0) + gully, x, y));
        continue;
      }
      b.set(x, y, rampDither(FARM, 2.4 + lit * 1.8 + (depth / 34) * 2.2 + gully * 1.4, x, y));
    }
    const n = nearRidge(x);
    const nlit = clamp((nearRidge(x - 2) - nearRidge(x + 2)) * 0.8, -1, 1);
    for (let y = Math.floor(n); y < LAKE_TOP; y++) {
      const trees = vnoise(x * 1.4, y * 2.2, 4, 84) > 0.6 ? -1 : 0;
      b.set(x, y, rampDither(NEAR, 2.2 + nlit * 0.8 + (y - n) / 18 + trees + (y - n < 1 ? 0.8 : 0), x, y));
    }
  }
}

/** The lake on the valley's floor, the glow of the west in it; lights on its far shore; the Arena's hill rising out of it. */
function valley(b: Bitmap) {
  // the lake runs on under the square (the Summon screen shows the whole sky image)
  for (let y = LAKE_TOP; y < HT; y++) {
    for (let x = 0; x < W; x++) {
      const depth = Math.min(1.25, (y - LAKE_TOP) / (TERRACE - LAKE_TOP));
      const streak = vnoise(x * 0.18, y * 3, 6, 91) - 0.5;
      let v = 8.4 - depth * 5.6 + streak * 2.2 - (x / W) * 1.6;
      if (y < LAKE_TOP + 1) v = 1.6;
      b.set(x, y, rampDither(LAKE, v, x, y));
    }
  }
  for (let x = 4; x < W - 4; x += 3) {
    if (hash2(x, 0, 92) > 0.82) b.set(x + Math.floor(hash2(x, 1, 92) * 3), LAKE_TOP - 1, LAMP[hash2(x, 2, 92) > 0.5 ? 4 : 3]);
  }
  // the Arena's hill: rock out of the water, grass on its top
  const { cx, base, rx } = ARENA;
  for (let y = base - 4; y < TERRACE + 6; y++) {
    const k = (y - (base - 4)) / (TERRACE + 6 - (base - 4));
    const half = rx + 2 + k * 18 + vnoise(y, 0, 5, 93) * 3;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const u = (x - cx) / half;
      if (y < base) b.set(x, y, rampDither(LEAF, 3.6 - u * 1.8 + (hash2(x, y, 95) > 0.8 ? 0.8 : 0), x, y));
      else b.set(x, y, rampDither(TOWN, 6.2 - u * 2.6 - k * 2.4 + (vnoise(x, y, 3, 94) - 0.5) * 1.8 + (vnoise(x, y * 3, 2, 96) > 0.7 ? -1.2 : 0), x, y));
    }
  }
}

// ---------------------------------------------------------------------------
// painting helpers for the town
// ---------------------------------------------------------------------------

/** Courses of dressed stone between x0..x1, y0..y1 in `ramp`: blocks a little apart in tone, their tops catching light, lit from the west across the wall. */
function ashlar(b: Bitmap, x0: number, y0: number, x1: number, y1: number, ramp: RGBA[], base: number, opts: { bw?: number; bh?: number; seed?: number; side?: number } = {}) {
  const bw = opts.bw ?? 9, bh = opts.bh ?? 4, seed = opts.seed ?? 101, side = opts.side ?? 2.4;
  for (let y = y0; y <= y1; y++) {
    const row = Math.floor((y - y0) / bh), ry = (y - y0) % bh;
    const off = row % 2 ? Math.floor(bw / 2) : 0;
    for (let x = x0; x <= x1; x++) {
      const col = Math.floor((x - x0 + off) / bw), rx = (x - x0 + off) % bw;
      const across = (x - x0) / Math.max(1, x1 - x0);
      let v = base + side * (0.5 - across) + (hash2(col, row, seed) - 0.5) * 0.9;
      if (ry === bh - 1 || rx === bw - 1) v -= 1.6;
      else if (ry === 0) v += 0.7;
      b.set(x, y, rampDither(ramp, v, x, y));
    }
  }
}

/** Whether (x, y) lies in an arch: a rectangle w wide from `top` down to `bottom`, its top a half circle. */
function inArch(x: number, y: number, cx: number, top: number, bottom: number, w: number): boolean {
  const r = w / 2;
  if (y > bottom || Math.abs(x + 0.5 - cx) > r) return false;
  if (y >= top + r) return true;
  return Math.hypot(x + 0.5 - cx, y + 0.5 - (top + r)) <= r;
}

/**
 * An arched window lit from within: the warm light brightest low down, a
 * mullion and a transom; `books` fills its lower half with shelves of spines.
 * Its light goes into `glow` too, for the breathing at runtime.
 */
function litWindow(b: Bitmap, glow: Bitmap | null, cx: number, top: number, bottom: number, w: number, opts: { books?: boolean; frame?: RGBA[]; mullion?: boolean } = {}) {
  const frame = opts.frame ?? TOWN;
  for (let y = top - 1; y <= bottom + 1; y++) {
    for (let x = Math.floor(cx - w / 2) - 1; x <= Math.ceil(cx + w / 2) + 1; x++) {
      const inside = inArch(x, y, cx, top, bottom, w);
      const ring = !inside && (inArch(x - 1, y, cx, top, bottom, w) || inArch(x + 1, y, cx, top, bottom, w) || inArch(x, y - 1, cx, top, bottom, w) || inArch(x, y + 1, cx, top, bottom, w));
      if (ring) b.set(x, y, frame[x < cx ? 6 : 3]);
      if (!inside) continue;
      const k = (y - top) / Math.max(1, bottom - top);
      let c = rampDither(LAMP, 2.4 + k * 2.6, x, y);
      if (opts.mullion !== false && w >= 5 && Math.abs(x + 0.5 - cx) < 0.6) c = WOOD[2];
      if (opts.mullion !== false && y === Math.round(top + w / 2 + 1)) c = WOOD[2];
      if (opts.books && k > 0.5) {
        const shelf = (y - top) % 5;
        c = shelf === 0 ? WOOD[3] : [DYES[0][3], DYES[1][3], DYES[2][3], PARCH[4], DYES[1][2], GOLD[3]][Math.floor(hash2(x, Math.floor((y - top) / 5), 111) * 6)];
        if (shelf === 1) c = mix(c, LAMP[1], 0.4);
      }
      b.set(x, y, c);
      if (glow && dith(x, y, 0.7)) glow.set(x, y, LAMP[5]);
    }
  }
}

/** A flame `h` tall at (x, y) (its foot), flickering by `frame`. */
function flame(b: Bitmap, x: number, y: number, h: number, frame: number, seed: number) {
  for (let i = 0; i < h; i++) {
    const t = i / h;
    const sway = Math.round(Math.sin(frame * 1.9 + seed + i * 0.8) * t * 1.2);
    const half = Math.max(0, Math.round((1 - t) * (h > 5 ? 1.6 : 1) - (hash2(frame, i, seed) > 0.7 ? 1 : 0)));
    for (let dx = -half; dx <= half; dx++) b.set(x + dx + sway, y - i, LAMP[Math.min(6, Math.max(1, Math.round(6 - t * 4 - Math.abs(dx) * 1.2)))]);
  }
}

/** A soft dithered halo of `ramp` round (cx, cy), for a pulse sprite. */
function halo(b: Bitmap, cx: number, cy: number, rx: number, ry: number, ramp: RGBA[], top: number) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      if (d >= 1) continue;
      const k = Math.pow(1 - d, 1.5);
      if (dith(x, y, Math.min(1, k * 1.6))) b.set(x, y, rampDither(ramp, k * top, x, y));
    }
  }
}

// ---------------------------------------------------------------------------
// the terrace and the square
// ---------------------------------------------------------------------------

/** The terrace's flagstones, its wall with the stair down the middle, and the square: cobbles growing toward us, a ring of them round the well. */
function square(): Bitmap {
  const b = new Bitmap(W, HT);
  // the terrace's top: long flagstones, warm in the west
  for (let y = TERRACE - 10; y < TERRACE + 2; y++) {
    const row = Math.floor((y - (TERRACE - 10)) / 3);
    for (let x = 0; x < W; x++) {
      const col = Math.floor((x + row * 7) / 15);
      let v = 6.4 - (x / W) * 2 + (hash2(col, row, 121) - 0.5) * 1.1;
      if ((y - (TERRACE - 10)) % 3 === 2 || (x + row * 7) % 15 === 14) v -= 1.6;
      b.set(x, y, rampDither(TOWN, v, x, y));
    }
  }
  // its wall down to the square, a coping along its top
  ashlar(b, 0, TERRACE + 2, W - 1, SQUARE - 1, TOWN, 4.4, { bw: 12, bh: 4, seed: 122, side: 2 });
  for (let x = 0; x < W; x++) {
    b.set(x, TERRACE + 2, TOWN[9 - Math.round((x / W) * 2)]);
    b.set(x, TERRACE + 3, TOWN[6]);
    b.set(x, SQUARE - 1, TOWN[1]);
  }
  // the stair down from the Reliquary: steps widening toward us
  for (let s = 0; s < 4; s++) {
    const y0 = TERRACE + 2 + s * 4, half = 54 + s * 4;
    for (let y = y0; y < y0 + 4; y++) {
      for (let x = REL.cx - half; x <= REL.cx + half; x++) {
        const k = y - y0;
        let v = k === 0 ? 9.4 : k === 1 ? 7.6 : 4.2 - (k - 2) * 0.8;
        v += ((REL.cx - x) / half) * 0.9;
        if (Math.abs(x - REL.cx) > half - 1) v = 2;
        b.set(x, y, rampDither(TOWN, v, x, y));
      }
    }
  }
  // the square: rows of cobbles growing toward us
  const rows: number[] = [SQUARE];
  while (rows[rows.length - 1] < HT) rows.push(rows[rows.length - 1] + 3 + (rows[rows.length - 1] - SQUARE) * 0.05);
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = Math.round(rows[r]), y1 = Math.round(rows[r + 1]);
    const h = y1 - y0, sw = Math.max(4, Math.round(h * 1.9));
    const off = r % 2 ? Math.floor(sw / 2) : 0;
    for (let y = y0; y < y1 && y < HT; y++) {
      for (let x = 0; x < W; x++) {
        const ring = ((x - WELL.cx) / 84) ** 2 + ((y - WELL.rim - 8) / 24) ** 2;
        let stone: number, edge: boolean, top: boolean;
        if (ring < 1) {
          // round the well the cobbles run in rings
          const rr = Math.sqrt(ring), ang = Math.atan2((y - WELL.rim - 8) / 24, (x - WELL.cx) / 84);
          const band = Math.floor(rr * 6), seg = Math.floor(((ang + Math.PI) / TAU) * (14 + band * 6) + band * 0.5);
          stone = band * 100 + seg;
          const fr = rr * 6 - band, fs = ((ang + Math.PI) / TAU) * (14 + band * 6) + band * 0.5 - seg;
          edge = fr > 0.84 || fs > 0.9;
          top = fr < 0.2;
        } else {
          const col = Math.floor((x + off) / sw);
          stone = r * 1000 + col;
          edge = y === y1 - 1 || (x + off) % sw === sw - 1;
          top = y === y0;
        }
        // lamplight from the Reliquary's door and the well's star, the west's glow, the dark creeping in at the sides
        const lamp = Math.max(0, 1 - Math.hypot((x - REL.cx) / 150, (y - 236) / 60)) * 1.6 + Math.max(0, 1 - Math.hypot((x - WELL.cx) / 90, (y - WELL.rim) / 30)) * 1.2;
        let v = 4 + lamp * 1.25 + (1 - x / W) * 1.3 + (hash2(stone, 7, 123) - 0.5) * 1.3 - ((y - SQUARE) / (HT - SQUARE)) * 0.8;
        if (edge) v -= 1.8;
        else if (top) v += 0.8;
        b.set(x, y, rampDither(COBBLE, v, x, y));
      }
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// the Clocktower (the options)
// ---------------------------------------------------------------------------

function clocktower(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  const { cx } = CLOCK;
  // the spire: slate, its two faces, a gold vane on top
  for (let y = 6; y <= 36; y++) {
    const t = (y - 6) / 30, half = 2 + t * 32;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / half;
      let v = u < 0 ? 4.6 + u * 0.6 : 1.8 - u * 0.6;
      if ((y - 6) % 4 === 3) v -= 1;
      if (Math.abs(u) < 0.06) v += 1.6;
      b.set(x, y, rampDither(SLATE, v + (hash2(Math.floor(x / 3), y >> 2, 131) - 0.5) * 0.6, x, y));
    }
  }
  for (let y = 0; y < 6; y++) b.set(cx, y, GOLD[3]);
  for (let x = cx - 4; x <= cx + 4; x++) b.set(x, 2, GOLD[x < cx ? 4 : 2]);
  b.set(cx + 4, 1, GOLD[3]);
  b.set(cx + 4, 3, GOLD[3]);
  // the belfry: corner pillars, an open arch, the bell inside
  ashlar(b, 22, 37, 82, 58, DARK, 5, { bw: 7, bh: 3, seed: 132 });
  for (let y = 40; y <= 58; y++) {
    for (let x = 30; x <= 74; x++) {
      if (!inArch(x, y, cx, 40, 58, 40)) continue;
      b.set(x, y, rampDither(DARK, 0.6 + (y - 40) / 20, x, y));
    }
  }
  ellipseFill(b, cx, 50, 7, 6, (x, y) => (y < 44 ? 0 : rampDither(BRONZE, 3.6 - (x - cx + 4) / 4, x, y)));
  for (let x = cx - 8; x <= cx + 8; x++) b.set(x, 55, BRONZE[x < cx ? 4 : 2]);
  b.set(cx, 56, BRONZE[1]);
  // cornices, the clock stage, the face (its hands are drawn at runtime)
  for (const y of [59, 60, 104, 105]) for (let x = 16; x <= 88; x++) b.set(x, y, DARK[y === 59 || y === 104 ? 9 - Math.round(((x - 16) / 72) * 3) : 3]);
  ashlar(b, 18, 61, 86, 103, DARK, 5, { bw: 8, bh: 4, seed: 133 });
  const f = CLOCK.face;
  ellipseFill(b, f.cx, f.cy, f.r + 2.5, f.r + 2.5, (x, y, d) => (d > 0.86 ? rampDither(GOLD, 3.6 - (x - f.cx + y - f.cy) / 14, x, y) : rampDither(ENAMEL, 3.6 - (x - f.cx + y - f.cy) / 18, x, y)));
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * TAU - Math.PI / 2;
    const long = h % 3 === 0;
    for (let r = f.r - (long ? 4 : 2.5); r <= f.r - 1; r += 0.5) b.set(Math.round(f.cx + Math.cos(a) * r), Math.round(f.cy + Math.sin(a) * r), long ? WOOD[1] : ENAMEL[0]);
  }
  for (let x = Math.round(f.cx) - 1; x <= f.cx + 1; x++) for (let y = Math.round(f.cy) - 1; y <= f.cy + 1; y++) b.set(x, y, GOLD[3]);
  for (let y = f.cy - f.r; y <= f.cy + f.r; y++) for (let x = f.cx - f.r; x <= f.cx + f.r; x++) if (Math.hypot(x - f.cx, y - f.cy) < f.r - 1 && dith(x, y, 0.35)) glow.set(x, y, ENAMEL[4]);
  // the gallery of the works: three arches onto the gears
  ashlar(b, 18, 106, 86, 136, DARK, 4.6, { bw: 8, bh: 4, seed: 134 });
  for (const ax of [31, 52, 73]) for (let y = 110; y <= 135; y++) for (let x = ax - 8; x <= ax + 8; x++) if (inArch(x, y, ax, 110, 135, 15)) b.set(x, y, rampDither(DARK, 0.4 + (y - 110) / 30, x, y));
  // the shaft, quoins at its corners, two lit lancets
  ashlar(b, 20, 137, 84, 199, DARK, 4.4, { bw: 9, bh: 4, seed: 135 });
  for (let y = 137; y <= 199; y++) {
    const q = Math.floor((y - 137) / 5) % 2;
    for (let x = 20; x <= 24 + q * 2; x++) b.set(x, y, rampDither(DARK, 7.4, x, y));
    for (let x = 80 - q * 2; x <= 84; x++) b.set(x, y, rampDither(DARK, 3.2, x, y));
  }
  litWindow(b, glow, 37, 150, 170, 6, { frame: DARK });
  litWindow(b, glow, 67, 150, 170, 6, { frame: DARK });
  // the foot: a broad plinth, its door, a lamp beside it
  ashlar(b, 12, 200, 92, TERRACE, DARK, 4.2, { bw: 10, bh: 4, seed: 136 });
  for (let x = 12; x <= 92; x++) b.set(x, 200, DARK[8 - Math.round(((x - 12) / 80) * 3)]);
  for (let y = 203; y <= TERRACE; y++) {
    for (let x = 42; x <= 62; x++) {
      if (!inArch(x, y, cx, 203, TERRACE, 18)) continue;
      const plank = (x - 43) % 4 === 3;
      b.set(x, y, rampDither(WOOD, plank ? 1 : 3.6 - (x - 42) / 8 + (y === 212 ? -1 : 0), x, y));
    }
  }
  for (let y = 204; y <= 210; y++) b.set(70, y, LAMP[y < 206 ? 3 : 4]);
  for (const [x, y] of [[69, 204], [71, 204], [69, 210], [71, 210]] as const) b.set(x, y, WOOD[1]);
  for (let y = 203; y <= 211; y++) for (let x = 66; x <= 74; x++) if (dith(x, y, 0.5)) glow.set(x, y, LAMP[5]);
  return { body: b, glow };
}

/** The Clocktower's works through its three arches: brass wheels meshing, one tooth a loop. */
function gearsFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const gear = (gx: number, gy: number, r: number, teeth: number, dir: number) => {
    const rot = (dir * (frame / frames) * TAU) / teeth;
    for (let y = Math.floor(gy - r - 2); y <= gy + r + 2; y++) {
      for (let x = Math.floor(gx - r - 2); x <= gx + r + 2; x++) {
        const dx = x + 0.5 - gx, dy = y + 0.5 - gy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx) - rot;
        const tooth = Math.cos(a * teeth) > 0.2;
        const outer = r + (tooth ? 1.6 : 0);
        if (d > outer) continue;
        if (d > r * 0.45 && d < r - 1.2) {
          // spokes between rim and hub
          const spoke = Math.abs(Math.sin((a * 4) / 2)) < 0.22;
          if (!spoke) continue;
        }
        const lit = -(dx + dy) / (r * 1.4);
        b.set(x, y, rampDither(BRONZE, 3 + lit * 1.6 + (d > r - 1.2 ? 0.4 : 0), x, y));
      }
    }
  };
  gear(31, 124, 6.5, 10, 1);
  gear(52, 121, 8.5, 13, -1);
  gear(73, 124, 6.5, 10, 1);
  return b;
}

// ---------------------------------------------------------------------------
// the Weavers' Mill (Weaving)
// ---------------------------------------------------------------------------

function mill(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  const { x0, x1 } = MILL;
  const [ax, ay] = MILL.apex;
  // the aqueduct bringing the water from behind the Clocktower: a stone channel on a pier
  ashlar(b, 96, 151, 110, TERRACE, TOWN, 4, { bw: 7, bh: 4, seed: 141, side: 2 });
  for (let x = 92; x <= 128; x++) {
    for (let y = 144; y <= 150; y++) b.set(x, y, rampDither(TOWN, y === 144 ? 9 : y === 150 ? 2.6 : 6.2 - (x - 92) / 18, x, y));
    b.set(x, 143, WATER[5]);
  }
  // the ground floor of stone, its great door
  ashlar(b, x0, 176, x1, TERRACE, TOWN, 5, { bw: 9, bh: 4, seed: 142 });
  for (let y = 192; y <= TERRACE; y++) for (let x = 174; x <= 200; x++) if (inArch(x, y, 187, 192, TERRACE, 24)) b.set(x, y, rampDither(WOOD, (x - 175) % 5 === 4 ? 1 : 3.4 - (x - 174) / 10, x, y));
  // the upper floor: plaster in a frame of timbers
  for (let y = 140; y < 176; y++) {
    for (let x = x0; x <= x1; x++) {
      const post = [x0, 166, 187, 208, x1].some((px) => Math.abs(x - px) < 1.5);
      const rail = y === 158 || y === 159 || y === 175 || y === 140 || y === 141;
      const brace = (x >= x0 && x < 166 && Math.abs(x - x0 - (y - 158)) < 1.2) || (x > 208 && x <= x1 && Math.abs(x1 - x - (y - 158)) < 1.2);
      if (post || rail || brace) b.set(x, y, rampDither(WOOD, 3.2 - (x - x0) / 40, x, y));
      else b.set(x, y, rampDither(PLASTER, 4.6 - (x - x0) / 30 + (hash2(x >> 2, y >> 2, 143) - 0.5) * 0.6, x, y));
    }
  }
  litWindow(b, glow, 158, 145, 155, 7, { frame: WOOD });
  litWindow(b, glow, 218, 145, 155, 7, { frame: WOOD });
  // the gable: plaster and timber, a loft door, the hoist beam
  for (let y = ay; y < 140; y++) {
    const half = ((y - ay) / (140 - ay)) * (ax - x0 + 4);
    for (let x = Math.floor(ax - half); x <= ax + half; x++) {
      const kingpost = Math.abs(x - ax) < 1.2;
      const tie = y === 139 || y === 122;
      if (kingpost || tie) b.set(x, y, rampDither(WOOD, 3, x, y));
      else b.set(x, y, rampDither(PLASTER, 4.4 - (x - x0) / 34, x, y));
    }
  }
  for (let y = 124; y <= 138; y++) for (let x = ax - 6; x <= ax + 6; x++) if (Math.abs(x - ax) > 1) b.set(x, y, rampDither(WOOD, x < ax ? 1.6 : 0.8, x, y));
  for (let x = ax; x <= ax + 12; x++) for (const y of [112, 113]) b.set(x, y, WOOD[y === 112 ? 5 : 2]);
  // the roof's edges along the gable: tiles overhanging, their ends showing
  for (let i = 0; i <= 70; i++) {
    for (const side of [-1, 1]) {
      const t = i / 70;
      const x = Math.round(ax + side * t * (ax - x0 + 10)), y = Math.round(ay + t * (140 - ay + 3));
      for (let d = -3; d <= 2; d++) {
        const yy = y + d;
        const lit = side < 0;
        b.set(x, yy, rampDither(TILE, (d <= -2 ? 6.4 : d === 2 ? 1.2 : 4) + (lit ? 0.8 : -1.2) + ((x + yy) % 4 === 0 ? -1 : 0), x, yy));
      }
    }
  }
  // the chimney on the east slope
  for (let y = 106; y <= 126; y++) for (let x = 210; x <= 218; x++) b.set(x, y, rampDither(TOWN, y < 109 ? 3 : 6 - (x - 210) / 3, x, y));
  // the sign: a great spool hung from the hoist beam, gold ends, red thread
  for (let y = 114; y <= 128; y++) {
    for (let x = 194; x <= 202; x++) {
      const end = y < 117 || y > 125;
      const c = end ? rampDither(GOLD, 3.8 - (x - 194) / 4, x, y) : x > 195 && x < 201 ? rampDither(DYES[1], 3.6 - (x - 196) / 3 + ((y + x) % 2 ? -0.5 : 0), x, y) : 0;
      if (c) b.set(x, y, c);
    }
  }
  b.set(198, 113, WOOD[2]);
  // the wheel's axle box on the wall
  for (let y = 172; y <= 184; y++) for (let x = 146; x <= 150; x++) b.set(x, y, rampDither(WOOD, 2, x, y));
  return { body: b, glow };
}

/** The wheel turning: rims, eight spokes, eight paddles; one paddle's turn a loop. */
function wheelFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const { cx, cy, r } = MILL.wheel;
  const rot = -(frame / frames) * (TAU / 8);
  for (let y = Math.floor(cy - r - 4); y <= cy + r + 4; y++) {
    for (let x = Math.floor(cx - r - 4); x <= cx + r + 4; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx) - rot;
      const lit = -(dx + dy) / (r * 1.6);
      const rim = (d > r - 2.2 && d <= r) || (d > r - 7 && d <= r - 5.4);
      const spoke = d < r - 5 && d > 2.5 && Math.abs(Math.sin(a * 4)) < 0.12 * (r / Math.max(4, d)) + 0.04;
      const paddle = d > r && d < r + 3.6 && Math.abs(Math.sin(a * 4)) < 0.16;
      const hub = d <= 3;
      if (!(rim || spoke || paddle || hub)) continue;
      b.set(x, y, rampDither(WOOD, (hub ? 2.6 : paddle ? 4.2 : 3.6) + lit * 2.2 + (paddle && d > r + 2.4 ? -1 : 0), x, y));
    }
  }
  return b;
}

/** The water: pouring from the channel's end onto the wheel, streaming off it, foaming into the race; a loop. */
function waterFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const { cx, cy, r } = MILL.wheel;
  for (let y = 144; y <= cy + r + 6; y++) {
    // a sheet down from the channel onto the wheel's top, then down its west side
    const onWheel = y > cy - r + 2;
    const x0 = onWheel ? Math.round(cx - Math.sqrt(Math.max(0, (r + 2) ** 2 - (y - cy) ** 2))) - 2 : 122;
    for (let w = 0; w < (onWheel ? 3 : 5); w++) {
      const x = x0 + w;
      const streak = (y + frame * 3 + w * 5) % 7;
      b.set(x, y, WATER[streak < 2 ? 7 : streak < 4 ? 5 : 4]);
    }
  }
  // foam at the foot
  for (let k = 0; k < 10; k++) {
    const x = cx - r - 6 + Math.round(hash2(k, frame, 151) * 12), y = cy + r + 2 + Math.round(hash2(k, frame + 9, 151) * 4);
    b.set(x, y, WATER[hash2(k, frame, 152) > 0.5 ? 7 : 6]);
  }
  return b;
}

/** The dyed cloth drying on a pole across the mill: four lengths in the factions' colours, stirring; a loop. */
function clothFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const pole = 177;
  for (let x = MILL.x0 - 2; x <= MILL.x1 + 2; x++) b.set(x, pole, WOOD[x < 187 ? 5 : 3]);
  [[156, 0, 20], [170, 1, 17], [204, 2, 19], [216, 3, 15]].forEach(([cx, dye, len], i) => {
    const ramp = DYES[dye];
    for (let y = pole + 1; y <= pole + len; y++) {
      const t = (y - pole) / len;
      const sway = Math.round(Math.sin((frame / frames) * TAU + i * 1.7 + t * 2.4) * t * 1.6);
      for (let dx = -3; dx <= 3; dx++) {
        if (y === pole + len && Math.abs(dx) > 2) continue;
        const fold = Math.sin(dx * 1.4 + (frame / frames) * TAU + i) * 0.6;
        b.set(cx + dx + sway, y, rampDither(ramp, 2.4 - dx * 0.35 + fold + (dx === -3 ? 0.8 : 0), cx + dx, y));
      }
    }
  });
  return b;
}

// ---------------------------------------------------------------------------
// the Reliquary (the champions)
// ---------------------------------------------------------------------------

/** A column of marble: round, lit from the west, its base and capital. */
function column(b: Bitmap, cx: number, top: number, bottom: number, w: number) {
  for (let y = top; y <= bottom; y++) {
    const cap = y < top + 3, base = y > bottom - 3;
    const half = cap || base ? w / 2 + 1.5 : w / 2;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / half;
      if (Math.abs(u) > 1) continue;
      let v = 7.8 - u * 3.4 - (cap ? 0 : 0) + (Math.sin((u + 1) * 5.5) > 0.7 ? -0.8 : 0);
      if (cap && y === top) v += 1.4;
      if (base && y === bottom) v -= 2;
      b.set(x, y, rampDither(MARBLE, v, x, y));
    }
  }
}

function reliquary(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  const cx = REL.cx;
  // the hall's walls behind the portico, its corner pilasters
  for (let y = 140; y <= 208; y++) for (let x = 250; x <= 390; x++) b.set(x, y, rampDither(MARBLE, 3.6 - (x - 250) / 70 + (hash2(x >> 3, y >> 2, 161) - 0.5) * 0.5, x, y));
  // the dome: gold, its ribs, a little lantern
  const domeY = 116;
  for (let y = 94; y <= domeY; y++) {
    for (let x = cx - 33; x <= cx + 33; x++) {
      const dx = (x + 0.5 - cx) / 32, dy = (y + 0.5 - domeY) / 22;
      if (dx * dx + dy * dy > 1) continue;
      const nx = dx, ny = dy, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const l = -0.62 * nx - 0.5 * ny + 0.6 * nz;
      let v = 1.6 + l * 3.4;
      if (Math.abs(Math.sin(Math.asin(clamp(nx / Math.max(0.2, Math.sqrt(1 - ny * ny)), -1, 1)) * 3.5)) < 0.12) v -= 1.4;
      b.set(x, y, rampDither(GOLD, v, x, y));
    }
  }
  for (let y = 90; y <= 96; y++) for (let x = cx - 4; x <= cx + 4; x++) b.set(x, y, Math.abs(x - cx) < 2 && y > 91 ? LAMP[5] : rampDither(GOLD, 4 - (x - cx + 4) / 3, x, y));
  for (let y = 91; y <= 95; y++) if (dith(cx, y, 0.6)) glow.set(cx, y, LAMP[5]);
  // the drum under it, its little lit windows
  ashlar(b, cx - 34, 116, cx + 34, 132, MARBLE, 7, { bw: 8, bh: 4, seed: 162, side: 3 });
  for (let x = cx - 36; x <= cx + 36; x++) b.set(x, 116, MARBLE[11 - Math.round(((x - cx + 36) / 72) * 4)]);
  for (const wx of [cx - 24, cx - 8, cx + 8, cx + 24]) litWindow(b, glow, wx, 119, 128, 4, { frame: MARBLE, mullion: false });
  // the pediment and its tympanum, a gold medallion of the broken Loom
  for (let y = 126; y <= 148; y++) {
    const half = ((y - 126) / 22) * 70;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const edge = Math.abs(x - cx) > half - 3 || y > 145;
      b.set(x, y, rampDither(MARBLE, edge ? 10 - (x - cx + half) / (half + 1) * 2.4 - (y > 145 ? 2 : 0) : 4.4 - (x - cx) / 40, x, y));
    }
  }
  ellipseFill(b, cx, 139, 6, 5.5, (x, y, d) => (d > 0.78 ? rampDither(GOLD, 4.2 - (x - cx + y - 139) / 5, x, y) : rampDither(MARBLE, 2, x, y)));
  for (const [x0, y0, x1, y1] of [[cx - 3, 136, cx - 3, 143], [cx + 3, 136, cx + 3, 143], [cx - 3, 136, cx - 1, 136], [cx + 1, 137, cx + 3, 136]] as const) {
    for (let k = 0; k <= Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); k++) {
      const t = k / Math.max(1, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
      b.set(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), GOLD[4]);
    }
  }
  for (const [x, y] of [[cx, 123], [cx - 71, 146], [cx + 71, 146]] as const) for (let k = 0; k < 4; k++) b.set(x, y - k, GOLD[4 - (k > 1 ? 1 : 0)]);
  // the entablature, plain for its name
  for (let y = 148; y <= 166; y++) {
    for (let x = 252; x <= 388; x++) {
      const v = y < 151 ? 10.4 - (x - 252) / 50 : y === 151 ? 3 : y > 163 ? 6 - (x - 252) / 50 : 8.2 - (x - 252) / 45;
      b.set(x, y, rampDither(MARBLE, v, x, y));
    }
  }
  // the colonnade, the dark between its columns, the bronze doors ajar
  for (let y = 167; y <= 205; y++) for (let x = 256; x <= 384; x++) b.set(x, y, rampDither(MARBLE, 1.2 + (y - 167) / 40, x, y));
  for (let y = 176; y <= 205; y++) {
    for (let x = 311; x <= 329; x++) {
      const gap = Math.abs(x + 0.5 - cx) < 1.6;
      const c = gap ? LAMP[y < 180 ? 4 : 6] : rampDither(BRONZE, 2.6 - Math.abs(x - cx) / 5 + ((x - 311) % 5 === 0 ? -1 : 0), x, y);
      b.set(x, y, c);
      if (gap && dith(x, y, 0.8)) glow.set(x, y, LAMP[6]);
    }
  }
  for (let y = 196; y <= 207; y++) for (let x = cx - 10 + Math.round((y - 196) * -0.4); x <= cx + 10 + Math.round((y - 196) * 0.4); x++) if (dith(x, y, 0.5 - (y - 196) / 30)) glow.set(x, y, LAMP[4]);
  for (const c of [268, 289, 302, 338, 351, 372]) column(b, c, 167, 205, 7);
  // the stylobate
  for (let y = 206; y <= 210; y++) for (let x = 252; x <= 388; x++) b.set(x, y, rampDither(MARBLE, y === 206 ? 10.6 - (x - 252) / 45 : 6.4 - (x - 252) / 50 - (y === 210 ? 2 : 0), x, y));
  // two bronze braziers on tripods at the ends of the stylobate (their fire is a loop of its own)
  for (const bx of BRAZIERS) {
    for (let y = 197; y <= 206; y++) for (const dx of [-3, 0, 3]) b.set(bx + dx - (dx ? Math.round(((206 - y) / 9) * Math.sign(dx)) * -1 : 0), y, BRONZE[dx < 0 ? 4 : dx > 0 ? 1 : 3]);
    ellipseFill(b, bx, 196, 5.5, 2.2, (x, y) => rampDither(BRONZE, 3.8 - (x - bx) / 3 + (y > 196 ? -1.2 : 0.6), x, y));
  }
  return { body: b, glow };
}

const BRAZIERS = [254, 386];

/** The braziers' fire, burning in the bowls at the Reliquary's stair; a loop. */
function braziersFrame(frame: number): Bitmap {
  const b = new Bitmap(W, HT);
  BRAZIERS.forEach((bx, i) => {
    for (const dx of [-3, -1, 1, 3]) flame(b, bx + dx, 195, 7 - Math.abs(dx), frame + i * 3 + dx, 5 + i);
  });
  return b;
}

// ---------------------------------------------------------------------------
// the Athenaeum (the Academy)
// ---------------------------------------------------------------------------

function athenaeum(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  const cx = ATH.cx;
  // the roof: a steep cone of slate, a gilt finial
  for (let y = 86; y <= 104; y++) {
    const t = (y - 86) / 18, half = 1 + t * 22;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / half;
      let v = 4.6 - u * 2.6 + ((y - 86) % 3 === 2 ? -0.9 : 0);
      if (y === 104) v -= 1.4;
      b.set(x, y, rampDither(SLATE, v, x, y));
    }
  }
  for (let y = 80; y <= 86; y++) b.set(cx, y, GOLD[y < 82 ? 4 : 3]);
  // the reading room at the top: its round window of cool light
  ashlar(b, 416, 105, 450, 119, TOWN, 6, { bw: 7, bh: 4, seed: 171, side: 3 });
  ellipseFill(b, cx, 111, 5, 5, (x, y, d) => (d > 0.72 ? TOWN[9] : rampDither(WATER, 6.6 - d * 2.4, x, y)));
  for (let y = 107; y <= 115; y++) for (let x = cx - 4; x <= cx + 4; x++) if (Math.hypot(x - cx, y - 111) < 4 && dith(x, y, 0.6)) glow.set(x, y, WATER[7]);
  // the balcony: a stone floor on corbels, a railing, a lectern with an open book
  for (let x = 406; x <= 460; x++) {
    for (const [y, v] of [[120, 10], [121, 6.6], [122, 3]] as const) b.set(x, y, rampDither(TOWN, v - (x - 406) / 30, x, y));
    if ((x - 406) % 4 === 0) for (let y = 114; y <= 119; y++) b.set(x, y, TOWN[y === 114 ? 10 : 7 - Math.round((x - 406) / 20)]);
  }
  for (let x = 406; x <= 460; x++) b.set(x, 114, TOWN[10 - Math.round((x - 406) / 20)]);
  for (let y = 112; y <= 119; y++) b.set(418, y, WOOD[4]);
  for (let x = 414; x <= 423; x++) {
    b.set(x, 111, x === 418 ? WOOD[3] : PARCH[6 - Math.round(Math.abs(x - 418.5) / 2)]);
    b.set(x, 112, WOOD[4]);
  }
  // the tower: tall windows full of books, warm with candles
  ashlar(b, 412, 123, 454, 184, TOWN, 5.4, { bw: 8, bh: 4, seed: 172 });
  for (const wx of [420, 433, 446]) litWindow(b, glow, wx, 130, 166, 7, { books: true });
  for (let y = 123; y <= 184; y++) {
    b.set(412, y, TOWN[10]);
    b.set(454, y, TOWN[3]);
  }
  // the hall at its foot, the portal
  ashlar(b, 402, 185, 464, TERRACE, TOWN, 5, { bw: 9, bh: 4, seed: 173 });
  for (let x = 400; x <= 466; x++) b.set(x, 185, TOWN[11 - Math.round(((x - 400) / 66) * 4)]);
  for (let y = 196; y <= TERRACE; y++) for (let x = 424; x <= 442; x++) if (inArch(x, y, cx, 196, TERRACE, 16)) b.set(x, y, rampDither(LAMP, 1.6 + (y - 196) / 12, x, y));
  for (let y = 196; y <= TERRACE; y++) for (let x = 424; x <= 442; x++) if (inArch(x, y, cx, 196, TERRACE, 16) && dith(x, y, 0.6)) glow.set(x, y, LAMP[4]);
  return { body: b, glow };
}

/** The owl on the balcony's rail: still, now and then a slow blink; once in the loop it turns its head. */
function owlFrame(frame: number): Bitmap {
  const b = new Bitmap(W, HT);
  const x = 455, y = 113;
  const FEATHER = H(['#1e1820', '#2e2630', '#463a40', '#5e4e50', '#7a6662', '#98826e']);
  for (let dy = -9; dy <= 0; dy++) {
    const half = dy < -6 ? 2.6 : 3.2 - (dy + 6) * 0.08;
    for (let dx = -3; dx <= 3; dx++) {
      if (Math.abs(dx) > half) continue;
      b.set(x + dx, y + dy, rampDither(FEATHER, 3.6 - dx * 0.5 + (dy > -5 && (dx + dy) % 2 === 0 ? -0.6 : 0), x + dx, y + dy));
    }
  }
  b.set(x - 3, y - 10, FEATHER[2]);
  b.set(x + 3, y - 10, FEATHER[2]);
  const turned = frame >= 14 && frame < 18;
  const blink = frame === 0 || frame === 1 || frame === 22;
  if (!blink) {
    for (const ex of turned ? [-1, 1] : [-2, 1]) {
      b.set(x + ex + (turned ? 1 : 0), y - 7, LAMP[5]);
    }
  } else for (const ex of [-2, -1, 1, 2]) b.set(x + ex, y - 7, FEATHER[1]);
  b.set(x + (turned ? 1 : 0), y - 6, GOLD[2]);
  return b;
}

// ---------------------------------------------------------------------------
// the Arena (Extra Combat): across the lake, sealed until 10-10 is won
// ---------------------------------------------------------------------------

const arenaArc = (x: number, cy: number, sign: number) => cy + sign * ARENA.ry * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - ARENA.cx) / ARENA.rx) ** 2));
/** the arches round its wall as seen: x of the k-th arch of n round the near half */
const archX = (k: number, n: number) => ARENA.cx - ARENA.rx * Math.cos(((k + 0.5) / n) * Math.PI);

function arena(): Bitmap {
  const b = new Bitmap(W, HT);
  const { cx, top, base, rx } = ARENA;
  // the far half of its seats, rising round the sand
  for (let y = top - ARENA.ry - 1; y <= top + ARENA.ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const far = arenaArc(x, top, -1), near = arenaArc(x, top, 1);
      if (y < far || y > near) continue;
      const inner = ((x + 0.5 - cx) / (rx * 0.55)) ** 2 + ((y + 0.5 - top - 1) / (ARENA.ry * 0.5)) ** 2 < 1;
      const tier = Math.floor((y - far) / 2) % 2;
      b.set(x, y, inner ? rampDither(TOWN, 9 + (x < cx ? 0.8 : -0.8), x, y) : rampDither(TOWN, (x > cx ? 5.6 : 3.6) + tier * 1, x, y));
    }
  }
  // the near wall: two tiers of arches, lit in the west
  for (let x = cx - rx; x <= cx + rx; x++) {
    const yt = arenaArc(x, top, 1), yb = arenaArc(x, base, 1);
    const u = (x + 0.5 - cx) / rx;
    for (let y = Math.floor(yt); y <= yb; y++) {
      let v = 8.2 - u * 3.6 + (y === Math.floor(yt) ? 1.8 : 0);
      const h = (y - yt) / (yb - yt);
      // which arch: by its angle round the wall
      const ang = Math.acos(clamp(-u, -1, 1)) / Math.PI;
      const slot = ang * 11 - Math.floor(ang * 11);
      const archW = 0.42 * Math.sqrt(1 - u * u);
      const opening = Math.abs(slot - 0.5) < archW && ((h > 0.14 && h < 0.42) || (h > 0.56 && h < 0.92));
      if (opening) v = 1 + (h > 0.56 ? 0 : 0.6);
      if (h > 0.46 && h < 0.52) v += 1.4;
      b.set(x, y, rampDither(TOWN, v, x, y));
    }
  }
  // the great gate, shut
  for (let y = base - 9; y <= base + ARENA.ry - 1; y++) for (let x = cx - 3; x <= cx + 3; x++) if (inArch(x, y, cx + 0.5, base - 9, base + ARENA.ry - 1, 7)) b.set(x, y, (x + y) % 2 ? DARK[0] : DARK[2]);
  return b;
}

/** Open: the gate lit, torches burning on either side, flags flying on the rim; a loop. */
function arenaLitFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const { cx, top, base, rx } = ARENA;
  for (let y = base - 9; y <= base + ARENA.ry - 1; y++) for (let x = cx - 3; x <= cx + 3; x++) if (inArch(x, y, cx + 0.5, base - 9, base + ARENA.ry - 1, 7)) b.set(x, y, LAMP[3 + ((x + y + frame) % 3 === 0 ? 1 : 0)]);
  flame(b, cx - 6, base + 4, 4, frame, 1);
  flame(b, cx + 7, base + 4, 4, frame, 2);
  for (let k = 0; k < 5; k++) {
    const x = Math.round(archX(k, 5)), y = Math.round(arenaArc(x, top, 1)) - 1;
    for (let p = 0; p < 6; p++) b.set(x, y - p, WOOD[4]);
    const ramp = DYES[k % 4];
    for (let fy = 0; fy < 3; fy++) for (let fx = 1; fx <= 4; fx++) b.set(x + fx, y - 5 + fy + Math.round(Math.sin((frame / frames) * TAU + k + fx * 0.9) * 0.6), ramp[fx === 1 ? 4 : 3]);
  }
  // lit arches round the lower tier
  for (let x = cx - rx + 2; x <= cx + rx - 2; x++) {
    const yt = arenaArc(x, top, 1), yb = arenaArc(x, base, 1);
    const u = (x + 0.5 - cx) / rx;
    const ang = Math.acos(clamp(-u, -1, 1)) / Math.PI;
    const slot = ang * 11 - Math.floor(ang * 11);
    if (Math.abs(slot - 0.5) >= 0.42 * Math.sqrt(1 - u * u) * 0.7) continue;
    for (let y = Math.floor(yt); y <= yb; y++) {
      const h = (y - yt) / (yb - yt);
      if (h > 0.6 && h < 0.9 && (Math.floor(ang * 11) + frame) % 4 !== 0) b.set(x, y, LAMP[3]);
    }
  }
  return b;
}

/** Shut: a seal of the Loom's light over its gate, breathing. */
function arenaSeal(): Bitmap {
  const b = new Bitmap(W, HT);
  const { cx, base } = ARENA;
  const sx = cx + 0.5, sy = base - 3;
  for (let a = 0; a < TAU; a += 0.05) {
    const x = Math.round(sx + Math.cos(a) * 7), y = Math.round(sy + Math.sin(a) * 6);
    b.set(x, y, SOUL[Math.floor(a * 3) % 2 ? 6 : 5]);
  }
  for (const [dx, dy] of [[-4, -3], [4, 3], [-4, 3], [4, -3]] as const) for (let k = -3; k <= 3; k++) b.set(Math.round(sx + (dx * k) / 4), Math.round(sy + (dy * k) / 4), SOUL[5]);
  return b;
}

// ---------------------------------------------------------------------------
// the Wayfarers' Gate (the campaign)
// ---------------------------------------------------------------------------

function gate(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  // the view through the arch: the road going down into the valley under the glow
  for (let y = 176; y <= TERRACE; y++) {
    for (let x = 586; x <= 608; x++) {
      if (!inArch(x, y, 597, 176, TERRACE, 20)) continue;
      const road = Math.abs(x - 597 - (y - TERRACE) * 0.3) < (y - 194) * 0.45;
      const c = y < 192 ? rampDither(SKY, 15.6 + (y - 176) / 8, x, y) : y < 200 ? rampDither(FARM, 4 + (y - 192) / 4, x, y) : road ? rampDither(TOWN, 7 + (y - 200) / 8, x, y) : rampDither(NEAR, 2.6 + (y - 200) / 10, x, y);
      b.set(x, y, c);
    }
  }
  // the curtain wall over the arch, a walk along its top
  ashlar(b, 582, 160, 612, TERRACE, DARK, 4.8, { bw: 7, bh: 4, seed: 181 });
  for (let y = 176; y <= TERRACE; y++) for (let x = 586; x <= 608; x++) if (inArch(x, y, 597, 176, TERRACE, 20)) b.set(x, y, b.get(x, y));
  for (let y = 176; y <= TERRACE; y++) {
    for (let x = 584; x <= 610; x++) {
      const inside = inArch(x, y, 597, 176, TERRACE, 20);
      const ring = !inside && inArch(x, y, 597, 174, TERRACE, 24);
      if (ring) b.set(x, y, rampDither(DARK, x < 597 ? 8 : 3.4, x, y));
    }
  }
  // the portcullis, raised: its spikes under the arch
  for (let x = 588; x <= 606; x += 3) for (let y = 178; y <= 181; y++) if (inArch(x, y, 597, 176, TERRACE, 20)) b.set(x, y, y === 181 ? DARK[1] : DARK[0]);
  for (let x = 584; x <= 610; x++) for (let y = 154; y <= 159; y++) if (y > 155 || (x - 584) % 5 < 3) b.set(x, y, rampDither(DARK, y < 157 ? 8.4 - (x - 584) / 8 : 5, x, y));
  // the two towers, crenellated, slits in them
  for (const [t0, t1] of [[556, 584], [610, 638]] as const) {
    ashlar(b, t0, 152, t1, TERRACE, DARK, 5.2, { bw: 8, bh: 4, seed: 182 + t0 });
    for (let x = t0 - 1; x <= t1 + 1; x++) for (let y = 144; y <= 151; y++) if (y > 147 || (x - t0 + 1) % 6 < 4) b.set(x, y, rampDither(DARK, y < 146 ? 9 - (x - t0) / 10 : y === 151 ? 2 : 6.4 - (x - t0) / 12, x, y));
    const sx = Math.round((t0 + t1) / 2);
    for (let y = 192; y <= 200; y++) b.set(sx, y, DARK[0]);
  }
  // torches either side of the arch: their brackets
  for (const tx of [583, 611]) for (let y = 188; y <= 192; y++) b.set(tx, y, WOOD[2]);
  for (const tx of [583, 611]) for (let y = 176; y <= 190; y++) for (let x = tx - 6; x <= tx + 6; x++) if (Math.hypot(x - tx, y - 184) < 6 && dith(x, y, 0.35)) glow.set(x, y, LAMP[4]);
  return { body: b, glow };
}

/** The four factions' banners on the gate's towers, stirring in the wind off the valley; a loop. */
function bannersFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const order: (keyof typeof UIR.faction)[] = ['azure_crown', 'sanguine_dominion', 'court_of_root', 'ashveil_reign'];
  [560, 571, 614, 625].forEach((x0, i) => {
    const f = order[i];
    const [field, glyph, lit = glyph, shade = glyph] = UIR.faction[f];
    for (let x = x0 - 1; x <= x0 + 9; x++) b.set(x, 158, WOOD[x === x0 - 1 || x === x0 + 9 ? 5 : 3]);
    const rows = EMBLEMS[f];
    const gx = x0 + (rows.length === 9 ? 0 : 1), gy = 164;
    for (let y = 159; y <= 184; y++) {
      const t = (y - 159) / 25;
      const sway = Math.round(Math.sin((frame / frames) * TAU + i * 1.3 + t * 2) * t * 1.3);
      for (let x = x0; x <= x0 + 8; x++) {
        // a swallowtail
        if (y > 180 && Math.abs(x - x0 - 4) < y - 180) continue;
        const fold = Math.sin((x - x0) * 1.1 + (frame / frames) * TAU + i) * 0.18;
        let c = mix(field, x < x0 + 2 ? hex('#ffffff') : hex('#000000'), x < x0 + 2 ? 0.12 : 0.18 + fold);
        const gy0 = y - gy, gx0 = x - gx;
        const ch = rows[gy0]?.[gx0];
        if (ch === '#') c = glyph;
        else if (ch === 'l') c = lit;
        else if (ch === 's') c = shade;
        b.set(x + sway, y, c);
      }
    }
  });
  return b;
}

/** The torches either side of the arch, flickering; a loop. */
function torchesFrame(frame: number): Bitmap {
  const b = new Bitmap(W, HT);
  flame(b, 583, 187, 6, frame, 3);
  flame(b, 611, 187, 6, frame, 4);
  return b;
}

// ---------------------------------------------------------------------------
// the Wishing Well (summoning) and the Wishing Star over it
// ---------------------------------------------------------------------------

function well(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  const { cx, rim, rx, ry } = WELL;
  // two timber posts up from the parapet
  for (const px of [cx - 26, cx + 26]) for (let y = 224; y <= rim + 1; y++) for (let dx = -1; dx <= 1; dx++) b.set(px + dx, y, rampDither(WOOD, 5.6 - (dx + 1) * 1.7 - (y > rim - 2 ? 1 : 0), px + dx, y));
  // the roof: shingles on its two slopes, the gable open beneath it, in shadow
  const apex = 204, eave = 227;
  for (let y = apex; y <= eave + 2; y++) {
    const half = ((y - apex) / (eave - apex)) * 38;
    for (let x = Math.floor(cx - half - 3); x <= Math.ceil(cx + half + 3); x++) {
      const d = Math.abs(x + 0.5 - cx) - half;
      if (d > 2.5) continue;
      if (d > -3.5) {
        const v = (x < cx ? 5.8 : 2.6) + (d > 1 ? 1.2 : d < -2 ? -1.2 : 0) + ((x + 2 * y) % 4 === 0 ? -0.9 : 0);
        b.set(x, y, rampDither(TILE, v, x, y));
      } else if (y < eave) b.set(x, y, rampDither(WOOD, 0.6 + (y - apex) / 16, x, y));
    }
  }
  for (let x = cx - 40; x <= cx + 40; x++) b.set(x, eave + 1, WOOD[2]);
  for (let y = apex - 3; y < apex; y++) b.set(cx, y, GOLD[y === apex - 3 ? 5 : 3]);
  // the thread down from the ridge to the star
  for (let y = apex + 4; y < STAR.cy - WISH_STAR.up + 2; y++) b.set(cx, y, y % 3 ? GOLD[3] : GOLD[5]);
  // the water inside, the star's light in it
  ellipseFill(b, cx, rim, rx - 4, ry - 1.6, (x, y, d) => rampDither(SOUL, 4.4 - d * 3.6 + (hash2(x, y, 191) > 0.9 ? 1.4 : 0), x, y));
  // the parapet: a ring of stone, runes lit along its face
  for (let y = rim - ry; y <= rim + ry + 14; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const u = (x + 0.5 - cx) / rx;
      if (Math.abs(u) > 1) continue;
      const topNear = rim + ry * Math.sqrt(1 - u * u), topFar = rim - ry * Math.sqrt(1 - u * u);
      const lipIn = ((x + 0.5 - cx) / (rx - 4)) ** 2 + ((y + 0.5 - rim) / (ry - 1.6)) ** 2 < 1;
      if (y < topFar || lipIn) continue;
      const face = y > topNear;
      if (face && y > topNear + 13) continue;
      const course = Math.floor((y - topNear) / 4), blk = Math.floor((u + 1) * (8 + course));
      let v = face ? 7 - u * 3.4 + (hash2(blk, course, 192) - 0.5) * 1 - ((y - topNear) % 4 === 3 ? 1.6 : 0) : 10.4 - u * 2;
      if (face && y > topNear + 11) v -= 1.4;
      b.set(x, y, rampDither(TOWN, v, x, y));
      const rune = face && (y - topNear) > 4 && (y - topNear) < 8 && Math.abs(Math.sin(u * 9.4)) > 0.92;
      if (rune) {
        b.set(x, y, SOUL[6]);
        glow.set(x, y, SOUL[6]);
      }
    }
  }
  // its light rising off the water
  halo(glow, cx, rim, rx - 2, ry + 3, SOUL, 5.4);
  for (let y = apex + 6; y < eave; y++) for (let x = cx - 30; x <= cx + 30; x++) if (A(b.get(x, y)) && Math.abs(x - cx) < ((y - apex) / (eave - apex)) * 34 && dith(x, y, 0.3)) glow.set(x, y, SOUL[3]);
  return { body: b, glow };
}

/** The Wishing Star: its crystal, two motes round it, its long rays breathing in turn; a loop. */
function wishFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  const ph = (frame / frames) * TAU;
  const { cx, cy } = STAR;
  const mote = (a: number, near: boolean) => {
    const x = Math.round(cx + Math.cos(a) * 20), y = Math.round(cy + 1 + Math.sin(a) * 5.5);
    if ((Math.sin(a) > 0) !== near) return;
    b.set(x, y, SOUL[near ? 7 : 5]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, SOUL[near ? 4 : 2]);
  };
  mote(ph, false);
  mote(ph + Math.PI, false);
  for (const [dx, dy, from, len, k] of [[0, -1, WISH_STAR.up, 6, 0], [0, 1, WISH_STAR.down, 10, 2], [-1, 0, WISH_STAR.side, 9, 1], [1, 0, WISH_STAR.side, 9, 3]] as const) {
    const breath = 0.6 + 0.4 * Math.sin(ph * 2 + k * 1.6);
    for (let i = from - 2; i < from + len * breath; i++) {
      const t = 1 - (i - from + 2) / (len + 2);
      const x = cx + dx * i, y = cy + dy * i;
      if (dith(x, y, Math.min(1, t * 1.5))) b.set(x, y, rampDither(SOUL, 3 + t * 4, x, y));
    }
  }
  starCrystal(b, cx, cy, WISH_STAR, SOUL);
  mote(ph, true);
  mote(ph + Math.PI, true);
  return b;
}

// ---------------------------------------------------------------------------
// the Merchant's Wagon (the Merchant) and the Herald's Board (the Challenges)
// ---------------------------------------------------------------------------

function wagon(): Bitmap {
  const b = new Bitmap(W, HT);
  // the canopy: canvas over hoops, its front open on the dark inside
  for (let y = 248; y <= 280; y++) {
    for (let x = 18; x <= 110; x++) {
      const u = (x - 18) / 92;
      const roof = 248 + Math.pow(Math.abs(u - 0.5) * 2, 2.6) * 18;
      if (y < roof) continue;
      const hoop = [22, 44, 66, 88, 106].some((hx) => Math.abs(x - hx) < 1);
      let v = 5.4 - u * 2.6 - ((y - roof) / 30) * 1.8 + (hoop ? -1.6 : 0) + (y - roof < 1.2 ? 1.2 : 0);
      if (x > 104) v = 0.6 + (y - roof) / 30;
      b.set(x, y, rampDither(CANVAS, v, x, y));
      if (y === 279 || y === 280) b.set(x, y, GOLD[y === 279 ? 3 : 2]);
    }
  }
  // the body of planks, painted trim
  for (let y = 281; y <= 304; y++) {
    for (let x = 14; x <= 112; x++) {
      const plank = (y - 281) % 5 === 4;
      let v = 4.6 - (x - 14) / 40 + (plank ? -1.4 : 0) + (hash2(x >> 3, (y - 281) / 5, 201) - 0.5) * 0.6;
      if (y === 304) v = 0.8;
      b.set(x, y, rampDither(WOOD, v, x, y));
    }
  }
  for (let x = 14; x <= 112; x++) b.set(x, 292, CANVAS[6 - Math.round((x - 14) / 30)]);
  // the counter let down from its side, the wares on it: flasks, a spool, coins, a scroll
  for (let x = 40; x <= 88; x++) for (const [y, v] of [[287, 6], [288, 4], [289, 1.6]] as const) b.set(x, y, rampDither(WOOD, v - (x - 40) / 30, x, y));
  const ware = (x: number, y: number, ramp: RGBA[], h: number) => {
    for (let k = 0; k < h; k++) for (let dx = 0; dx < 3; dx++) b.set(x + dx, y - k, rampDither(ramp, (dx === 0 ? 4.4 : 2.8) - (k === h - 1 ? 0.6 : 0), x + dx, y - k));
    b.set(x + 1, y - h, WOOD[5]);
  };
  ware(44, 286, DYES[0], 5);
  ware(50, 286, SOUL, 4);
  ware(56, 286, DYES[2], 6);
  for (let k = 0; k < 6; k++) for (let dx = 0; dx < 5; dx++) b.set(63 + dx, 286 - k, k === 0 || k === 5 ? GOLD[dx < 2 ? 4 : 2] : rampDither(DYES[1], 3.4 - dx * 0.4, 63 + dx, 286 - k));
  for (const [x, y] of [[72, 286], [75, 286], [73, 285], [78, 286]] as const) {
    b.set(x, y, GOLD[4]);
    b.set(x + 1, y, GOLD[2]);
  }
  for (let x = 81; x <= 86; x++) for (const y of [284, 285, 286]) b.set(x, y, PARCH[y === 284 ? 5 : x === 86 ? 2 : 4]);
  // the wheels: iron tyres, spokes
  for (const [wx, wy, r] of [[34, 308, 14], [96, 310, 13]] as const) {
    for (let y = wy - r - 1; y <= wy + r + 1; y++) {
      for (let x = wx - r - 1; x <= wx + r + 1; x++) {
        const dx = x + 0.5 - wx, dy = y + 0.5 - wy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const tyre = d > r - 1.6 && d <= r;
        const felloe = d > r - 3.4 && d <= r - 1.6;
        const spoke = d < r - 3 && d > 1.6 && Math.abs(Math.sin(a * 5)) < 0.16;
        const hub = d <= 2.2;
        if (!(tyre || felloe || spoke || hub)) continue;
        b.set(x, y, tyre ? rampDither(DARK, 4 - (dx + dy) / r * 2, x, y) : rampDither(WOOD, 4 - (dx + dy) / r * 1.6 - (hub ? 1 : 0), x, y));
      }
    }
  }
  // the shafts out front, a barrel and crates beside it
  for (let x = 110; x <= 128; x++) for (const [y, v] of [[300, 5], [301, 2.4]] as const) b.set(x, y + Math.round((x - 110) * 0.15), rampDither(WOOD, v, x, y));
  for (let y = 302; y <= 324; y++) {
    for (let x = 4; x <= 16; x++) {
      const u = (x - 10) / 6.5;
      const hoop = y === 306 || y === 320;
      b.set(x, y, hoop ? DARK[3 + (u < 0 ? 2 : 0)] : rampDither(WOOD, 4.4 - u * 2.2 - Math.abs(y - 313) / 12, x, y));
    }
  }
  // the sign on its bracket: a gold coin on a board
  for (let x = 110; x <= 124; x++) b.set(x, 258, WOOD[4]);
  for (let y = 260; y <= 270; y++) for (let x = 112; x <= 124; x++) b.set(x, y, rampDither(WOOD, 4.2 - (x - 112) / 6 - (y === 270 ? 1.4 : 0), x, y));
  ellipseFill(b, 118, 265, 3.4, 3.4, (x, y, d) => rampDither(GOLD, 4.6 - (x - 118 + y - 265) / 3 - d, x, y));
  b.set(118, 265, GOLD[1]);
  b.set(114, 259, WOOD[2]);
  b.set(122, 259, WOOD[2]);
  return b;
}

/** The wagon's lantern on its pole, swaying a little; a loop. */
function lanternFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  for (let y = 244; y <= 250; y++) b.set(108, y, WOOD[3]);
  for (let x = 108; x <= 113; x++) b.set(x, 244, WOOD[4]);
  const sway = Math.round(Math.sin((frame / frames) * TAU) * 1);
  for (let y = 245; y <= 247; y++) b.set(113 + (y === 247 ? sway : 0), y, DARK[5]);
  for (let y = 248; y <= 254; y++) {
    for (let x = 111; x <= 115; x++) {
      const cage = x === 111 || x === 115 || y === 248 || y === 254;
      b.set(x + sway, y, cage ? DARK[3] : LAMP[y < 250 ? 6 : 5]);
    }
  }
  return b;
}

function board(): { body: Bitmap; glow: Bitmap } {
  const b = new Bitmap(W, HT), glow = new Bitmap(W, HT);
  // two thick posts
  for (const px of [538, 622]) for (let y = 250; y <= 326; y++) for (let dx = -2; dx <= 2; dx++) b.set(px + dx, y, rampDither(WOOD, 5.4 - (dx + 2) * 1, px + dx, y));
  // a little roof of shingles
  for (let y = 242; y <= 252; y++) {
    const half = 46 + (y - 242) * 0.9;
    for (let x = Math.floor(580 - half); x <= 580 + half; x++) {
      const u = (x - 580) / half;
      let v = (u < 0 ? 4.8 : 2.6) - Math.abs(u) * 0.8 + ((y - 242) % 3 === 2 ? -1.2 : 0) + ((x + (y >> 1) * 3) % 6 === 0 ? -0.6 : 0);
      if (y === 252) v = 0.8;
      b.set(x, y, rampDither(TILE, v, x, y));
    }
  }
  // the board: planks, notes pinned on it, red seals
  for (let y = 256; y <= 304; y++) {
    for (let x = 542; x <= 618; x++) {
      const plank = (x - 542) % 11 === 10;
      const v = 3 - (x - 542) / 50 + (plank ? -1.2 : 0) + (y === 256 ? 1.4 : y === 304 ? -1.6 : 0) + (hash2((x - 542) / 11, y >> 3, 211) - 0.5) * 0.5;
      b.set(x, y, rampDither(WOOD, v, x, y));
    }
  }
  const note = (x: number, y: number, w: number, h: number, seed: number) => {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        let v = 5.2 - (xx - x) / (w * 2) - (yy - y) / (h * 3) + (hash2(xx, yy, seed) - 0.5) * 0.5;
        if (yy === y + h - 1 || xx === x + w - 1) v -= 1.4;
        b.set(xx, yy, rampDither(PARCH, v, xx, yy));
      }
    }
    for (let line = y + 3; line < y + h - 2; line += 2) for (let xx = x + 2; xx < x + w - 2 - (hash2(line, seed, 212) > 0.5 ? 3 : 0); xx++) if (hash2(xx, line, seed) > 0.25) b.set(xx, line, PARCH[1]);
    const sx = x + Math.floor(w / 2), sy = y + 1;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]] as const) b.set(sx + dx, sy + dy, WAX[dx === 0 && dy === 0 ? 4 : 2]);
  };
  note(546, 260, 16, 19, 1);
  note(566, 262, 13, 15, 2);
  note(583, 259, 15, 21, 3);
  note(602, 263, 12, 14, 4);
  note(551, 283, 13, 16, 5);
  note(569, 281, 17, 18, 6);
  note(590, 284, 12, 15, 7);
  note(605, 280, 11, 19, 8);
  // its lantern on the west post
  for (let y = 262; y <= 270; y++) for (let x = 530; x <= 535; x++) b.set(x, y, x === 530 || x === 535 || y === 262 || y === 270 ? DARK[3] : LAMP[y < 265 ? 6 : 5]);
  for (let x = 532; x <= 536; x++) b.set(x, 260, DARK[4]);
  halo(glow, 532, 266, 10, 9, LAMP, 5);
  return { body: b, glow };
}

/** The herald's pennant on the roof's peak: red and gold, swallow-tailed, stirring; a loop. */
function pennantFrame(frame: number, frames: number): Bitmap {
  const b = new Bitmap(W, HT);
  for (let y = 226; y <= 242; y++) b.set(580, y, y === 226 ? GOLD[4] : WOOD[4]);
  for (let x = 581; x <= 596; x++) {
    const t = (x - 581) / 15;
    const wave = Math.sin((frame / frames) * TAU - t * 4) * t * 1.8;
    const half = 3.4 * (1 - t * 0.35);
    for (let y = -Math.ceil(half); y <= Math.ceil(half); y++) {
      if (Math.abs(y) > half) continue;
      if (t > 0.78 && Math.abs(y) < (t - 0.78) * 14) continue;
      const yy = Math.round(231 + y + wave);
      b.set(x, yy, y < -1 ? GOLD[3] : rampDither(WAX, 3 - t * 0.8 + (Math.cos((frame / frames) * TAU - t * 4) > 0 ? 0.6 : -0.4), x, yy));
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

type Rect4 = [number, number, number, number];
type Layer = 'far' | 'ground' | 'building' | 'front';
export type MenuPlaceId = 'campaign' | 'champions' | 'weaving' | 'academy' | 'options' | 'challenges' | 'summon' | 'merchant' | 'extra';

/** A sprite of the scene as the runtime draws it (src/game/view/loomfall.ts). */
export interface MenuSprite {
  /** its frames in scene.png */
  frames: Rect4[];
  /** top-left on the screen */
  x: number;
  y: number;
  /** far: beyond the town | ground: the terrace and the square | building: behind the champions | front: before them */
  layer: Layer;
  /** static | loop: the frames in turn, `ms` each | pulse: frame 0 breathes over what lies under it, one breath every `ms` */
  mode: 'static' | 'loop' | 'pulse';
  ms?: number;
}

/** A place to click: the sprites that make it (their pixels are what the pointer hits), its hover outline, where its label hangs. */
export interface MenuHotspot {
  id: MenuPlaceId;
  /** the place's name in Loomfall (a first take) */
  name: string;
  sprites: string[];
  /** the outline in scene.png and its top-left on the screen */
  outline: Rect4;
  ox: number;
  oy: number;
  /** the label's centre and top */
  label: [number, number];
}

export interface LoomfallJson {
  sprites: Record<string, MenuSprite>;
  /** the draw order, back to front, within each layer */
  order: string[];
  hotspots: MenuHotspot[];
  /** sprites shown only while Extra Combat is shut, or only once it is open */
  shut: string[];
  open: string[];
  /** where champions stand (their feet) and which way they face */
  spots: { x: number; y: number; facing: 'L' | 'R' }[];
  /** stars that twinkle: x, y, size */
  twinkles: [number, number, number][];
  /** the Loom's threads whole down into the valley, for light running down them */
  warp: [number, number][][];
  /** the Wishing Star's heart, where the souls it calls drift in, and how far its upper point reaches above it */
  wish: [number, number];
  wishUp: number;
  /** the Clocktower's face, for its hands */
  clock: { cx: number; cy: number; r: number };
  /** chimneys and the gate's watch fire: where smoke rises */
  smokes: [number, number][];
  /** pools of light that breathe: centre, radii, colour, strength, breaths a second (radians); `when` ties one to a sprite shown */
  lights: { x: number; y: number; rx: number; ry: number; rgb: [number, number, number]; k: number; rate: number; when?: string }[];
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

export function buildLoomfall(out: string) {
  TWINKLES.length = 0;
  WARP.length = 0;
  const sky = skyImage();
  const dir = path.join(out, 'menu');
  const defs: { key: string; frames: Bitmap[]; layer: Layer; mode: MenuSprite['mode']; ms?: number }[] = [];
  const add = (key: string, frames: Bitmap[], layer: Layer, mode: MenuSprite['mode'] = 'static', ms?: number) => defs.push({ key, frames, layer, mode, ms });
  const loop = (n: number, make: (i: number, n: number) => Bitmap) => [...Array(n)].map((_, i) => make(i, n));
  // beyond the town: the Arena on its hill, shut or open
  add('arena', [arena()], 'far');
  add('arena_seal', [arenaSeal()], 'far', 'pulse', 3600);
  add('arena_lit', loop(8, arenaLitFrame), 'far', 'loop', 180);
  add('square', [square()], 'ground');
  const ct = clocktower();
  add('clock', [ct.body], 'building');
  add('clock_glow', [ct.glow], 'building', 'pulse', 4600);
  // the works turn slowly: a tooth every two and a half seconds
  add('gears', loop(8, gearsFrame), 'building', 'loop', 320);
  const ml = mill();
  add('mill', [ml.body], 'building');
  add('mill_glow', [ml.glow], 'building', 'pulse', 3900);
  // a paddle's turn in two seconds: the wheel round in sixteen
  add('wheel', loop(8, wheelFrame), 'building', 'loop', 250);
  add('water', loop(6, waterFrame), 'building', 'loop', 120);
  add('cloth', loop(12, clothFrame), 'building', 'loop', 260);
  const rel = reliquary();
  add('reliquary', [rel.body], 'building');
  add('reliquary_glow', [rel.glow], 'building', 'pulse', 5200);
  add('braziers', loop(6, braziersFrame), 'building', 'loop', 120);
  const ath = athenaeum();
  add('athenaeum', [ath.body], 'building');
  add('athenaeum_glow', [ath.glow], 'building', 'pulse', 4300);
  add('owl', loop(24, owlFrame), 'building', 'loop', 260);
  const gt = gate();
  add('gate', [gt.body], 'building');
  add('gate_glow', [gt.glow], 'building', 'pulse', 1800);
  add('banners', loop(12, bannersFrame), 'building', 'loop', 280);
  add('torches', loop(6, torchesFrame), 'building', 'loop', 110);
  const wl = well();
  add('well', [wl.body], 'building');
  add('well_glow', [wl.glow], 'building', 'pulse', 5600);
  const wg = new Bitmap(W, HT);
  halo(wg, STAR.cx, STAR.cy, 30, 30, SOUL, 5.2);
  add('wish_glow', [wg], 'building', 'pulse', 5600);
  // the star: its motes take five seconds round it
  add('wish', loop(20, wishFrame), 'building', 'loop', 250);
  add('wagon', [wagon()], 'front');
  add('lantern', loop(8, lanternFrame), 'front', 'loop', 420);
  const bd = board();
  add('board', [bd.body], 'front');
  add('board_glow', [bd.glow], 'front', 'pulse', 3300);
  add('pennant', loop(10, pennantFrame), 'front', 'loop', 230);

  const items: { key: string; bmp: Bitmap }[] = [];
  const sprites: Record<string, MenuSprite> = {};
  const placed: Record<string, Bitmap[]> = {};
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
    d.frames.map((f) => f.crop(rect)).forEach((c, i) => items.push({ key: `${d.key}/${i}`, bmp: c }));
    placed[d.key] = d.frames;
    sprites[d.key] = { frames: [], x: rect.x, y: rect.y, layer: d.layer, mode: d.mode, ...(d.ms ? { ms: d.ms } : {}) };
  }
  // the places to click; each label hangs where no champion and no other label can cover it
  const spotsDef: { id: MenuPlaceId; name: string; sprites: string[]; label: [number, number] }[] = [
    { id: 'options', name: 'The Clocktower', sprites: ['clock', 'gears'], label: [CLOCK.cx, 222] },
    { id: 'weaving', name: "The Weavers' Mill", sprites: ['mill', 'wheel', 'cloth'], label: [MILL.apex[0] - 33, 88] },
    { id: 'champions', name: 'The Reliquary', sprites: ['reliquary'], label: [REL.cx, 149] },
    { id: 'academy', name: 'The Athenaeum', sprites: ['athenaeum', 'owl'], label: [ATH.cx, 176] },
    { id: 'extra', name: 'Extra Combat', sprites: ['arena'], label: [ARENA.cx, 124] },
    { id: 'campaign', name: "The Wayfarers' Gate", sprites: ['gate', 'banners'], label: [597, 222] },
    { id: 'summon', name: 'The Wishing Well', sprites: ['well', 'wish'], label: [WELL.cx, 328] },
    { id: 'merchant', name: "The Merchant's Wagon", sprites: ['wagon', 'lantern'], label: [66, 328] },
    { id: 'challenges', name: "The Herald's Board", sprites: ['board', 'pennant'], label: [580, 328] },
  ];
  const hotspots: MenuHotspot[] = [];
  for (const h of spotsDef) {
    const mask = new Bitmap(W, HT);
    for (const k of h.sprites) mask.blit(placed[k][0], 0, 0);
    const o = outlineOf(mask);
    const r = o.bounds()!;
    items.push({ key: `outline_${h.id}/0`, bmp: o.crop(r) });
    hotspots.push({ id: h.id, name: h.name, sprites: h.sprites, outline: [0, 0, 0, 0], ox: r.x, oy: r.y, label: h.label });
  }
  const { atlas, frames } = packShelves(items, 1024);
  const rectOf = new Map(frames.map((f) => [f.key, [f.x, f.y, f.w, f.h] as Rect4]));
  for (const d of defs) sprites[d.key].frames = d.frames.map((_, i) => rectOf.get(`${d.key}/${i}`)!);
  for (const h of hotspots) h.outline = rectOf.get(`outline_${h.id}/0`)!;
  const json: LoomfallJson = {
    sprites,
    order: defs.map((d) => d.key),
    hotspots,
    shut: ['arena_seal'],
    open: ['arena_lit'],
    // Jakub, 2026-11-01: "lets stay at 3 vs 3 in a row"; filled in this order, so a small roster still stands on both sides of the well
    spots: [
      { x: 248, y: 304, facing: 'R' },
      { x: 392, y: 304, facing: 'L' },
      { x: 206, y: 299, facing: 'R' },
      { x: 434, y: 299, facing: 'L' },
      { x: 164, y: 294, facing: 'R' },
      { x: 476, y: 294, facing: 'L' },
    ],
    twinkles: TWINKLES,
    warp: WARP,
    wish: [STAR.cx, STAR.cy],
    wishUp: WISH_STAR.up,
    clock: CLOCK.face,
    smokes: [[214, 104], [624, 142]],
    lights: [
      { x: STAR.cx, y: STAR.cy, rx: 34, ry: 34, rgb: [176, 156, 255], k: 0.42, rate: 0.5 },
      { x: WELL.cx, y: WELL.rim, rx: 34, ry: 12, rgb: [176, 156, 255], k: 0.4, rate: 0.6 },
      { x: REL.cx, y: 196, rx: 30, ry: 22, rgb: [255, 190, 110], k: 0.42, rate: 0.45 },
      { x: REL.cx, y: 124, rx: 36, ry: 10, rgb: [255, 190, 110], k: 0.25, rate: 0.55 },
      { x: 158, y: 150, rx: 12, ry: 10, rgb: [255, 170, 90], k: 0.35, rate: 0.8 },
      { x: 218, y: 150, rx: 12, ry: 10, rgb: [255, 170, 90], k: 0.35, rate: 0.7 },
      { x: ATH.cx, y: 148, rx: 26, ry: 24, rgb: [255, 180, 100], k: 0.32, rate: 0.6 },
      { x: ATH.cx, y: 111, rx: 10, ry: 10, rgb: [170, 210, 255], k: 0.35, rate: 0.9 },
      { x: CLOCK.cx, y: CLOCK.face.cy, rx: 22, ry: 22, rgb: [255, 230, 180], k: 0.22, rate: 0.4 },
      { x: 583, y: 184, rx: 14, ry: 14, rgb: [255, 170, 90], k: 0.45, rate: 2.6 },
      { x: 611, y: 184, rx: 14, ry: 14, rgb: [255, 170, 90], k: 0.45, rate: 2.2 },
      { x: ARENA.cx, y: ARENA.top + 6, rx: 40, ry: 16, rgb: [255, 170, 90], k: 0.4, rate: 1.4, when: 'arena_lit' },
      { x: 113, y: 251, rx: 14, ry: 12, rgb: [255, 170, 90], k: 0.45, rate: 1.1 },
      { x: 532, y: 266, rx: 14, ry: 12, rgb: [255, 170, 90], k: 0.42, rate: 0.9 },
      { x: 70, y: 207, rx: 10, ry: 8, rgb: [255, 170, 90], k: 0.35, rate: 1 },
      ...BRAZIERS.map((x, i) => ({ x, y: 190, rx: 18, ry: 16, rgb: [255, 170, 90] as [number, number, number], k: 0.5, rate: 2.4 - i * 0.5 })),
    ],
  };
  sky.save(path.join(dir, 'sky.png'));
  atlas.save(path.join(dir, 'scene.png'));
  writeJson(path.join(dir, 'menu.json'), json);
  // the preview: everything at its first frame as shut, the glows left out
  const preview = sky.clone();
  for (const d of defs) {
    if (d.mode === 'pulse' && d.key !== 'arena_seal') continue;
    if (json.open.includes(d.key)) continue;
    preview.blit(d.frames[0], 0, 0);
  }
  preview.save(path.join('docs', 'images', 'menu_loomfall.png'));
  console.log(`  menu: Loomfall ${defs.length} sprites, ${hotspots.length} places, scene ${atlas.w}x${atlas.h}, ${TWINKLES.length} twinkles, ${json.warp.length} warp threads`);
  void polyFill;
}
