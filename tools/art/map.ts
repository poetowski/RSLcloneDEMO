// The campaign world map (640x360): the realm seen from above, lit from the
// top-left like everything else. Snowfields and peaks in the north-west
// around the Frostfang temple, green hills and a river through the middle,
// the sea in the south-west and the Sunscar desert in the south-east. The
// road and the location landmarks are placed from the campaign data
// (src/game/data/campaign.ts), so new stages extend the road automatically;
// stage nodes and labels are drawn by the runtime on top.
import path from 'node:path';
import { LOCATIONS } from '../../src/game/data/campaign.ts';
import { dith, ellipseFill, outline, polyFill, rampDither } from './paint.ts';
import { Bitmap, hash2, hex, RGBA, rng } from './raster.ts';

const W = 640, H = 360;
const ramp = (list: string[]) => list.map((h) => hex(h));

const SNOW = ramp(['#4a5878', '#7a8cb0', '#a8bad6', '#d0deee', '#eef5fc']);
const TUNDRA = ramp(['#46525a', '#64706a', '#84907a', '#a4ac8c']);
const GRASS = ramp(['#1a3418', '#284c22', '#3a682c', '#548436', '#76a244']);
const STEPPE = ramp(['#4a4a22', '#6a662c', '#8c8238', '#ae9e4a', '#c8b660']);
const DESERT = ramp(['#7a4622', '#a66432', '#cc8644', '#e6a85c', '#f6c87c']);
const SEA = ramp(['#0a1632', '#10264c', '#183a6a', '#24548a', '#3c74aa', '#78a8d8']);
const ROCK = ramp(['#1c1a26', '#34324a', '#54526e', '#7c7a96', '#a6a6be']);
const REDROCK = ramp(['#2a1418', '#4a2424', '#743a2c', '#9c5838', '#c07c4c']);
const PINE = ramp(['#0c1c14', '#163222', '#22482c', '#326238']);
const LEAF = ramp(['#10260e', '#1c3c16', '#2c5a20', '#447a2c', '#64983a']);
const ROAD = ramp(['#2a180c', '#6a4424', '#a07040', '#c89a60']);
const STONE = ramp(['#1e1c26', '#3a3848', '#5e5c70', '#8a889c', '#b8b6c8']);
const GOLD = ramp(['#5a3410', '#a8701e', '#e8b440', '#fff0a8']);
const SUNRED = hex('#c8361a');
const INKC = hex('#07080e');

// ---------------------------------------------------------------------------
// fields
// ---------------------------------------------------------------------------

function vnoise(x: number, y: number, scale: number, seed: number): number {
  const fx = x / scale, fy = y / scale;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, seed: number): number {
  return vnoise(x, y, 64, seed) * 0.55 + vnoise(x, y, 24, seed + 1) * 0.3 + vnoise(x, y, 9, seed + 2) * 0.15;
}

/** 0 = far north-west (frost) .. 1 = far south-east (desert). */
const climate = (x: number, y: number) => (x / W) * 0.55 + (y / H) * 0.45 + (fbm(x, y, 3) - 0.5) * 0.16;
const seaLevel = (x: number, y: number) => x / W + (1 - y / H) * 0.85 + (fbm(x, y, 11) - 0.5) * 0.18;
const isSea = (x: number, y: number) => seaLevel(x, y) < 0.36;
const height = (x: number, y: number) => fbm(x, y, 21);

/** The river: from the mountains in the north down to the sea in the south-west. */
const RIVER: [number, number][] = [[318, 0], [312, 30], [296, 58], [300, 92], [286, 128], [256, 156], [236, 190], [200, 214], [168, 238], [128, 262], [96, 290]];

function nearPolyline(x: number, y: number, pts: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
  }
  return best;
}

/** Stage nodes in campaign order: the road visits each of them. */
function roadPoints(): [number, number][] {
  return LOCATIONS.flatMap((l) => l.stages.map((s) => [s.map.x, s.map.y] as [number, number]));
}

// ---------------------------------------------------------------------------
// ground
// ---------------------------------------------------------------------------

function ground(b: Bitmap) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (isSea(x, y)) {
        const depth = 0.36 - seaLevel(x, y);
        let v = 2.6 - depth * 9 + (vnoise(x, y, 14, 5) - 0.5) * 0.6;
        // wave glints in short horizontal strokes
        if (hash2(Math.floor(x / 4), y, 7) > 0.93 && y % 3 === 0) v += 1.6;
        if (depth < 0.012) v = 4.6; // surf line
        b.set(x, y, rampDither(SEA, v, x, y));
        continue;
      }
      // hill shading: slopes facing the top-left are lit
      const sh = (height(x - 2, y - 2) - height(x + 2, y + 2)) * 9;
      const c = climate(x, y);
      const shore = seaLevel(x, y) < 0.375;
      let col: RGBA;
      if (shore) col = rampDither(DESERT, 3.4 + sh * 0.5, x, y);
      else if (c < 0.36) col = rampDither(SNOW, 2.8 + sh + (vnoise(x, y, 6, 9) - 0.5) * 0.5, x, y);
      else if (c < 0.4) col = rampDither(TUNDRA, 1.8 + sh + (c - 0.36) * 20, x, y);
      else if (c < 0.57) col = rampDither(GRASS, 2.4 + sh + (vnoise(x, y, 7, 13) - 0.5) * 0.8, x, y);
      else if (c < 0.63) col = rampDither(STEPPE, 2.2 + sh + (c - 0.57) * 14, x, y);
      else col = rampDither(DESERT, 2.4 + sh + Math.sin(x * 0.12 + y * 0.31 + vnoise(x, y, 20, 4) * 6) * 0.35, x, y);
      b.set(x, y, col);
    }
  }
  // the river, lit on its upper bank
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (isSea(x, y)) continue;
      const d = nearPolyline(x + (vnoise(x, y, 10, 8) - 0.5) * 6, y, RIVER);
      const w = 1.4 + (y / H) * 1.8;
      if (d < w) b.set(x, y, rampDither(SEA, d < w * 0.4 ? 4.2 : 3.2, x, y));
      else if (d < w + 1) b.set(x, y, climate(x, y) < 0.38 ? SNOW[4] : SEA[1]);
    }
  }
}

// ---------------------------------------------------------------------------
// landmarks and scattered icons
// ---------------------------------------------------------------------------

function mountain(b: Bitmap, x: number, base: number, h: number, w: number, rock: RGBA[], snowy: boolean) {
  const peak = x + (hash2(x, base, 3) - 0.5) * w * 0.3;
  const icon = new Bitmap(Math.ceil(w * 2 + 6), Math.ceil(h + 6));
  const ox = Math.round(x - w - 3), oy = Math.round(base - h - 3);
  polyFill(icon, [[peak - ox, 3], [x + w - ox, h + 3], [x - w - ox, h + 3]], (px, py) => {
    const lx = px + ox, ly = py + oy;
    const left = lx < peak + (ly - (base - h)) * 0.12;
    const k = (ly - (base - h)) / h;
    if (snowy && k < 0.42 + (hash2(lx, 1, 9) - 0.5) * 0.18) return left ? SNOW[4] : SNOW[2];
    return rampDither(rock, left ? 3.2 - k : 1.6 - k * 0.6, px, py);
  });
  b.blit(outline(icon, rock[0]), ox, oy);
}

function pine(b: Bitmap, x: number, y: number, s: number, snowy: boolean) {
  const icon = new Bitmap(12, 18);
  for (let t = 0; t < 3; t++) {
    const top = 2 + t * 3 * s, half = (2.2 + t * 1.3) * s;
    polyFill(icon, [[6, top], [6 + half, top + 5 * s], [6 - half, top + 5 * s]], (px) => (px < 6 ? PINE[3] : PINE[2]));
    if (snowy) icon.set(5, Math.round(top + 1), SNOW[4]);
  }
  icon.set(6, Math.round(2 + 14 * s), ROAD[1]);
  b.blit(outline(icon, PINE[0]), Math.round(x - 6), Math.round(y - 15 * s));
}

function tree(b: Bitmap, x: number, y: number) {
  const icon = new Bitmap(12, 12);
  ellipseFill(icon, 6, 5, 4.6, 4, (px, py, d) => rampDither(LEAF, 3.6 - (px - 3) / 4 - (py - 2) / 4 - d * 0.6, px, py));
  icon.set(6, 10, ROAD[1]);
  icon.set(6, 9, ROAD[1]);
  b.blit(outline(icon, LEAF[0]), Math.round(x - 6), Math.round(y - 11));
}

function dune(b: Bitmap, x: number, y: number, w: number) {
  for (let k = -w; k <= w; k++) {
    const yy = Math.round(y - Math.sqrt(Math.max(0, 1 - (k / w) ** 2)) * 3);
    b.set(x + k, yy, k < w * 0.3 ? DESERT[4] : DESERT[1]);
    if (k > -w * 0.6 && k < w * 0.3) b.set(x + k, yy + 1, DESERT[3]);
  }
}

function pyramid(b: Bitmap, x: number, base: number, h: number) {
  const icon = new Bitmap(h * 2 + 4, h + 4);
  polyFill(icon, [[h + 2, 2], [2 * h + 2, h + 2], [2, h + 2]], (px) => (px < h + 3 ? DESERT[4] : DESERT[1]));
  icon.set(h + 2, 2, GOLD[3]);
  b.blit(outline(icon, DESERT[0]), x - h - 2, base - h - 2);
}

/** Frostfang landmark: a snowbound temple of columns. */
function frostTemple(b: Bitmap, x: number, y: number) {
  const icon = new Bitmap(30, 24);
  polyFill(icon, [[2, 9], [15, 2], [28, 9]], (px) => (px < 15 ? SNOW[4] : SNOW[2]));
  for (let px = 3; px < 28; px++) {
    icon.set(px, 10, STONE[4]);
    icon.set(px, 11, STONE[2]);
  }
  for (const cx of [5, 10, 15, 20, 25]) {
    for (let py = 12; py < 20; py++) {
      icon.set(cx, py, STONE[4]);
      icon.set(cx + 1, py, STONE[2]);
    }
  }
  for (let px = 2; px < 29; px++) {
    icon.set(px, 20, STONE[3]);
    icon.set(px, 21, STONE[1]);
  }
  b.blit(outline(icon, STONE[0]), x - 15, y - 22);
}

/** Sunscar landmark: a pylon gate with a red sun over the door. */
function sunTemple(b: Bitmap, x: number, y: number) {
  const icon = new Bitmap(32, 24);
  for (const [x0, x1] of [[2, 12], [20, 30]]) {
    polyFill(icon, [[x0 + 1, 3], [x1 - 1, 3], [x1, 21], [x0, 21]], (px) => (px < (x0 + x1) / 2 ? DESERT[4] : DESERT[2]));
    for (let px = x0; px <= x1; px++) icon.set(px, 3, DESERT[4]);
  }
  for (let px = 12; px < 20; px++) {
    icon.set(px, 8, DESERT[3]);
    icon.set(px, 9, DESERT[2]);
  }
  ellipseFill(icon, 16, 6, 2.2, 2, SUNRED);
  b.blit(outline(icon, DESERT[0]), x - 16, y - 22);
}

function scatter(b: Bitmap, clear: (x: number, y: number) => boolean) {
  const r = rng(99);
  const icons: { y: number; draw: () => void }[] = [];
  for (let gy = 6; gy < H - 4; gy += 13) {
    for (let gx = 4; gx < W - 4; gx += 13) {
      const x = Math.round(gx + (r() - 0.5) * 9), y = Math.round(gy + (r() - 0.5) * 9);
      if (isSea(x, y) || isSea(x, y + 6) || !clear(x, y)) continue;
      if (nearPolyline(x, y, RIVER) < 7) continue;
      const c = climate(x, y);
      const n = fbm(x, y, 31);
      if (y < 34 || (c < 0.33 && n > 0.56)) {
        const hgt = 12 + r() * 12;
        icons.push({ y, draw: () => mountain(b, x, y, hgt, hgt * 0.95, ROCK, c < 0.5) });
      } else if (x > 470 && y < 150 && n > 0.5) {
        const hgt = 9 + r() * 9;
        icons.push({ y, draw: () => mountain(b, x, y, hgt, hgt * 1.2, REDROCK, false) });
      } else if (c < 0.42 && n > 0.42) {
        const s = 0.8 + r() * 0.3;
        icons.push({ y, draw: () => pine(b, x, y, s, c < 0.38) });
      } else if (c >= 0.42 && c < 0.56 && n > 0.47) {
        const kind = r() < 0.35;
        icons.push({ y, draw: () => (kind ? pine(b, x, y, 0.8, false) : tree(b, x, y)) });
      } else if (c > 0.66 && n > 0.45) {
        const w = 4 + Math.floor(r() * 4);
        icons.push({ y, draw: () => dune(b, x, y, w) });
      }
    }
  }
  icons.sort((a, c) => a.y - c.y).forEach((i) => i.draw());
}

// ---------------------------------------------------------------------------
// road, compass, frame
// ---------------------------------------------------------------------------

/** Curved road segment points between two stops. */
function roadSegment(a: [number, number], c: [number, number], i: number): [number, number][] {
  const [ax, ay] = a, [bx, by] = c;
  const len = Math.hypot(bx - ax, by - ay);
  const nx = -(by - ay) / len, ny = (bx - ax) / len, bend = (i % 2 ? 1 : -1) * Math.min(14, len * 0.12);
  const out: [number, number][] = [];
  for (let s = 0; s <= len; s += 0.5) {
    const t = s / len;
    out.push([ax + (bx - ax) * t + nx * bend * Math.sin(Math.PI * t), ay + (by - ay) * t + ny * bend * Math.sin(Math.PI * t)]);
  }
  return out;
}

function road(b: Bitmap) {
  const pts = roadPoints();
  const all = pts.slice(0, -1).flatMap((p, i) => roadSegment(p, pts[i + 1], i));
  // packed earth: dark verge, worn center, the odd pebble
  for (const [x, y] of all) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1]]) b.set(Math.round(x) + dx, Math.round(y) + dy, ROAD[0]);
  }
  for (const [x, y] of all) {
    const X = Math.round(x), Y = Math.round(y);
    b.set(X, Y, hash2(X, Y, 3) > 0.85 ? ROAD[1] : ROAD[2]);
    b.set(X + 1, Y, ROAD[3]);
    b.set(X, Y + 1, ROAD[1]);
  }
  // a plank bridge where the road crosses the river
  for (const [x, y] of all) {
    if (nearPolyline(x, y, RIVER) > 2.2) continue;
    for (let k = -4; k <= 4; k++) {
      const X = Math.round(x) + k, Y = Math.round(y);
      b.set(X, Y - 2, ROAD[0]);
      b.set(X, Y - 1, k % 2 ? ROAD[3] : ROAD[2]);
      b.set(X, Y, k % 2 ? ROAD[2] : ROAD[3]);
      b.set(X, Y + 1, ROAD[1]);
      b.set(X, Y + 2, ROAD[0]);
    }
  }
}

function compass(b: Bitmap, cx: number, cy: number) {
  const at = (r: number, a: number): [number, number] => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const long = i % 2 === 0 ? 15 : 8;
    for (const side of [-1, 1]) polyFill(b, [[cx, cy], at(long, a), at(3, a + side * (Math.PI / 4))], side < 0 ? GOLD[3] : GOLD[1]);
  }
  ellipseFill(b, cx, cy, 2.4, 2.4, GOLD[2]);
  ['#..#', '##.#', '#.##', '#..#'].forEach((row, yy) => [...row].forEach((ch, xx) => ch === '#' && b.set(cx - 2 + xx, cy - 22 + yy, GOLD[3])));
}

function frame(b: Bitmap) {
  // a dithered vignette, then a dark rim with a thin gold rule
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (e < 2) b.set(x, y, INKC);
      else if (e === 3) b.set(x, y, GOLD[1]);
      else if (e < 18 && dith(x, y, ((18 - e) / 16) * 0.45)) b.set(x, y, SEA[0]);
    }
  }
}

export function buildMap(out: string) {
  const b = new Bitmap(W, H);
  ground(b);
  const nodes = roadPoints();
  const marks = LOCATIONS.map((l) => [l.map.x, l.map.y] as [number, number]);
  const roadPts = nodes.slice(0, -1).flatMap((p, i) => roadSegment(p, nodes[i + 1], i));
  const clear = (x: number, y: number) =>
    nodes.every(([nx, ny]) => Math.hypot(x - nx, y - ny) > 18) && marks.every(([mx, my]) => Math.hypot(x - mx, y - my + 8) > 26) && roadPts.every(([rx, ry]) => Math.hypot(x - rx, y - ry) > 8);
  scatter(b, clear);
  road(b);
  for (const l of LOCATIONS) (l.zone === 'sunscar' ? sunTemple : frostTemple)(b, l.map.x, l.map.y);
  pyramid(b, 600, 262, 9);
  pyramid(b, 616, 270, 6);
  pyramid(b, 520, 304, 7);
  compass(b, 50, 300);
  frame(b);
  b.save(path.join(out, 'map', 'world.png'));
  b.save(path.join('docs', 'images', 'world_map.png'));
  console.log(`  map: world ${W}x${H}, ${nodes.length} road stops`);
}
