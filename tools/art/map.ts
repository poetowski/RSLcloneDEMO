// The campaign world map: the broken realm seen from above at a slant, lit
// from the top-left like everything else. The world (WORLD_MAP, 1280x360) is
// two screens wide and one tall and scrolls sideways under the campaign
// screen; the overview is the same world drawn at half the size.
//
// After Jakub's brief (2026-10-10): the map is the edge of a continent, a band
// of land running west to east with nothing beyond its north and south edges
// but the void. In the west a rift tears through the land and the sky; the
// first area (Zone 1, its settlement) lies near it, where the warriors of two
// worlds met, and going east the land grows into jungle, where the second
// area (the mystic arena of the Court of Root) is hidden in a clearing.
//
// The road and the landmarks are placed from the campaign data
// (src/game/data/campaign.ts, world pixels): each location's node gets its
// landmark drawn above it and the road runs from the rift through the nodes.
// Nodes, names and progress are drawn by the runtime on top. The geography is
// laid out on a 640x180 design sheet and mapped onto each render; surface
// detail is drawn in the render's own pixels.
import path from 'node:path';
import { LOCATIONS, WORLD_MAP } from '../../src/game/data/campaign.ts';
import { dith, ellipseFill, outline, polyFill, rampDither } from './paint.ts';
import { Bitmap, hash2, hex, RGBA, rng } from './raster.ts';

/** The design sheet the geography is laid out on. */
const DW = 640, DH = 180;

/** The render in progress: its size and the design-to-pixel scale. */
let W = DW, H = DH, S = 1;
/** world pixels (campaign data) -> render pixels */
const wp = (x: number, y: number): [number, number] => [(x * W) / WORLD_MAP.w, (y * H) / WORLD_MAP.h];
const ramp = (list: string[]) => list.map((h) => hex(h));

const VOID = ramp(['#020308', '#05070e', '#090c16', '#0e1220', '#141a2c', '#1c2438']);
const GRASS = ramp(['#141c16', '#1c261c', '#253122', '#2f3c28', '#3a472e', '#465435', '#55623d']);
const JUNGLE = ramp(['#050f09', '#0a1a0e', '#102615', '#17341c', '#1f4424', '#28582c', '#346e36', '#468844']);
const ROCK = ramp(['#0f1018', '#191a26', '#242634', '#303344', '#3e4254', '#4e5366', '#62677a']);
const EARTH = ramp(['#1e1813', '#2c231a', '#3c3022', '#4e3f2c', '#625238']);
const TREE = ramp(['#0c140f', '#132016', '#1b2c1d', '#243824', '#2e452b']);
const THATCH = ramp(['#1b150d', '#2e2416', '#43361f', '#5a4a2b', '#706039']);
const STONE = ramp(['#14151d', '#262833', '#3a3d4b', '#525667', '#6d7283', '#8c91a0']);
const WATER = ramp(['#081822', '#0e2a36', '#164050', '#22586a', '#3c7c8c', '#8ac0cc', '#d8f2f4']);
const RIFT = ramp(['#0c0a2a', '#22175e', '#3d2a9e', '#5c56d6', '#7fa6f2', '#bfe6ff', '#f4fbff']);
const LAMP = ramp(['#9a5020', '#e09040', '#ffcf80']);
const GOLD = ramp(['#5a3410', '#a8701e', '#e8b440', '#fff0a8']);
const AZURE = ramp(['#16306c', '#2856b8', '#4a7ae0']);
const SABLE = ramp(['#08070a', '#1a161e', '#2a2530']);
const BLOOD = ramp(['#5a0e18', '#b02a36', '#e0505a']);
const MOSSY = ramp(['#2a3226', '#3c4834', '#56604a', '#78806a']);
const INKC = hex('#07080e');

// ---------------------------------------------------------------------------
// fields (design coordinates)
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
  return vnoise(x, y, 40, seed) * 0.55 + vnoise(x, y, 16, seed + 1) * 0.3 + vnoise(x, y, 6, seed + 2) * 0.15;
}

/** The rift: its centre line, wandering left and right as it runs from the top of the sheet to the bottom. */
const RIFT_PTS: [number, number][] = [[61, -6], [57, 10], [63, 24], [56, 40], [62, 55], [55, 72], [60, 88], [54, 104], [61, 120], [56, 136], [63, 152], [58, 168], [62, 186]];
function riftX(y: number): number {
  for (let i = 0; i < RIFT_PTS.length - 1; i++) {
    const [x0, y0] = RIFT_PTS[i], [x1, y1] = RIFT_PTS[i + 1];
    if (y >= y0 && y <= y1) {
      const t = (y - y0) / (y1 - y0);
      return x0 + (x1 - x0) * t + (vnoise(0, y, 3, 81) - 0.5) * 1.6;
    }
  }
  return 60;
}
/** half the width of the open tear: wide through the land, a hairline far out in the void */
const riftHalf = (y: number) => 0.6 + 5.6 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (y - 6) / 168)))), 0.8) * (0.65 + 0.7 * vnoise(1, y, 6, 82));

/** The continent: its north edge, its south edge (cliff top), the cliff below it. */
const yN = (x: number) => 26 + (vnoise(x, 0, 22, 61) - 0.5) * 9 + Math.sin(x * 0.021) * 2.5;
const yS = (x: number) => 146 + (vnoise(x, 0, 24, 62) - 0.5) * 10 + Math.sin(x * 0.017 + 1) * 3;
const cliff = (x: number) => 9 + vnoise(x, 0, 6, 63) * 5;
/** the rock hanging below the cliff face, jagged */
const hangDepth = (x: number) => 4 + vnoise(x, 0, 4, 64) * 10 + (vnoise(x, 0, 2, 65) > 0.7 ? 5 : 0);
/** west of the rift the land is broken into drifting pieces */
const WEST = 50;
/** where the dim grassland turns to forest, and forest to jungle */
const FOREST = 330, JUNGLE_X = 410;
/** jungle share at x: 0 grassland .. 1 deep jungle */
const jungleness = (x: number) => Math.min(1, Math.max(0, (x - FOREST) / (JUNGLE_X - FOREST)));

/** The river through the jungle: from the north edge down to the south edge, where it falls off the continent. */
const RIVER_D: [number, number][] = [[478, 14], [470, 34], [482, 54], [474, 74], [464, 96], [470, 116], [460, 136], [458, 160]];

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

/** Is a design point on the land (the top surface)? */
const onLand = (dx: number, dy: number) => dx > riftX(dy) + riftHalf(dy) && dy > yN(dx) && dy < yS(dx);

// ---------------------------------------------------------------------------
// the void, the land, the cliffs
// ---------------------------------------------------------------------------

function voidAndLand(b: Bitmap) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x / S, dy = y / S;
      // west of the rift: void (the drifting fragments are drawn after)
      if (dx < riftX(dy) - riftHalf(dy)) {
        b.set(x, y, voidAt(x, y, dx, dy));
        continue;
      }
      const n = yN(dx), s = yS(dx);
      if (dy <= n || dy >= s + cliff(dx) + hangDepth(dx)) {
        b.set(x, y, voidAt(x, y, dx, dy));
        continue;
      }
      if (dy >= s) {
        // the south cliff: strata of rock lit where the edge turns west, then the jagged rock hanging beneath
        const c = cliff(dx);
        if (dy < s + c) {
          const k = (dy - s) / c;
          const stratum = Math.floor((dy - s) * 1.3 + vnoise(dx, 0, 7, 66) * 3) % 3 === 0 ? -0.6 : 0;
          const turn = (yS(dx + 1) - yS(dx - 1)) * 0.7;
          b.set(x, y, rampDither(ROCK, 4.4 - k * 2.2 + stratum + turn + (vnoise(x, y, 3 * S, 67) - 0.5) * 0.5, x, y));
        } else {
          const k = (dy - s - c) / hangDepth(dx);
          b.set(x, y, rampDither(ROCK, 2.2 - k * 1.6 + (vnoise(x, y, 2 * S, 68) - 0.5) * 0.7, x, y));
        }
        continue;
      }
      // the top surface: dim grass in the west, jungle floor toward the east, hills lit from the top-left
      const sh = (fbm(dx - 2, dy - 2, 21) - fbm(dx + 2, dy + 2, 21)) * 9;
      const j = jungleness(dx);
      const v = 2.9 + sh + (vnoise(x, y, 5 * S, 23) - 0.5) * 0.7 + (fbm(dx, dy, 25) - 0.5) * 1.2;
      let c = j > 0.5 ? rampDither(JUNGLE, 2 + sh * 0.8 + (vnoise(x, y, 4 * S, 24) - 0.5) * 0.8, x, y) : rampDither(GRASS, v, x, y);
      if (j > 0 && j <= 0.5 && dith(x, y, j * 2 * 0.6)) c = rampDither(JUNGLE, 2.6 + sh * 0.8, x, y);
      // the lit lip of the north edge, the darker lip over the cliff
      if (dy - n < 1.2) c = j > 0.5 ? JUNGLE[6] : GRASS[6];
      else if (s - dy < 1.2) c = ROCK[5];
      b.set(x, y, c);
    }
  }
}

/** The void: almost black, a faint mist clinging below the cliffs and above the north edge. */
function voidAt(x: number, y: number, dx: number, dy: number): RGBA {
  let v = 1.1 + (vnoise(x, y, 18 * S, 71) - 0.5) * 0.6;
  const below = dy - (yS(dx) + cliff(dx) + hangDepth(dx));
  const above = yN(dx) - dy;
  if (dx > WEST) {
    if (below > 0) v += Math.max(0, 1.4 - below / 7) * (0.6 + 0.4 * vnoise(x, y, 6 * S, 72));
    if (above > 0) v += Math.max(0, 1.1 - above / 5) * (0.5 + 0.5 * vnoise(x, y, 6 * S, 73));
  }
  return rampDither(VOID, v, x, y);
}

/** West of the rift: pieces of the continent torn loose, smaller and darker the farther they drift. */
function fragments(b: Bitmap) {
  const r = rng(91);
  const pieces: [number, number, number][] = [[40, 40, 9], [30, 70, 7], [42, 98, 10], [26, 124, 6], [44, 140, 7], [14, 54, 4], [12, 104, 5], [20, 152, 3], [8, 30, 3], [34, 18, 4]];
  for (const [cx, cy, size] of pieces) {
    const pts: [number, number][] = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.5;
      const rr = size * (0.6 + r() * 0.5);
      pts.push([(cx + Math.cos(a) * rr) * S, (cy + Math.sin(a) * rr * 0.55) * S]);
    }
    const far = 1 - cx / WEST;
    // the torn-off rock beneath, then the top, lit by the rift on its east side
    const under: [number, number][] = pts.map(([x, y]) => [x, y + size * 0.9 * S]);
    polyFill(b, under, (x, y) => rampDither(ROCK, 1.6 - far * 0.8 + ((x / S - cx) / size) * 0.6, x, y));
    polyFill(b, pts, (x, y) => {
      const toRift = Math.max(0, 1 - (riftX(y / S) - x / S) / 30);
      return rampDither(GRASS, 2.2 - far * 1.4 + toRift * 1.8 + (hash2(x >> 1, y >> 1, 7) - 0.5) * 0.6, x, y);
    });
  }
}

/** The rift: a tear of cold light through the land and the sky, its glow spilling on both, cracks and shards around it. */
function rift(b: Bitmap) {
  // glow first, over whatever is there
  for (let y = 0; y < H; y++) {
    const dy = y / S;
    const rx = riftX(dy);
    for (let x = Math.max(0, Math.floor((rx - 22) * S)); x < Math.min(W, Math.ceil((rx + 22) * S)); x++) {
      const d = Math.abs(x / S - rx);
      const k = Math.max(0, 1 - d / 20) * (0.75 + 0.25 * Math.sin(dy * 0.3 + x * 0.05));
      if (k <= 0) continue;
      if (dith(x, y, k * 0.55)) b.set(x, y, RIFT[Math.min(4, 1 + Math.floor(k * 3.4))]);
    }
  }
  // cracks running east from the rift into the land, glowing in their depth
  const r = rng(17);
  for (let i = 0; i < 7; i++) {
    let cy = 30 + r() * 112, cx = riftX(cy) + 2;
    const len = 14 + r() * 34;
    for (let t = 0; t < len; t += 0.5 / S) {
      cx += 0.5 / S;
      cy += ((r() - 0.5) * 1.2) / S;
      const X = Math.round(cx * S), Y = Math.round(cy * S);
      if (!onLand(cx, cy)) continue;
      const k = 1 - t / len;
      b.set(X, Y, RIFT[k > 0.6 ? 4 : k > 0.3 ? 3 : 2]);
      if (S > 1 && k > 0.5) b.set(X, Y + 1, RIFT[1]);
    }
  }
  // the tear itself: an opening onto somewhere else, dark and starry inside, its lips burning white
  for (let y = 0; y < H; y++) {
    const dy = y / S;
    const rx = riftX(dy), half = riftHalf(dy);
    for (let x = Math.floor((rx - half - 1) * S); x <= Math.ceil((rx + half + 1) * S); x++) {
      const u = Math.abs(x / S - rx) / half;
      if (u > 1) continue;
      const flicker = (hash2(x >> 1, y >> 1, 83) - 0.5) * 0.6;
      let v: number;
      if (half < 1.6) v = 6.2 - u * 2.4 + flicker; // a hairline seam out in the void
      else if (u > 0.78) v = 5.4 + (u - 0.78) * 4 + flicker; // the burning lips
      else if (u > 0.5) v = 2.6 + (u - 0.5) * 8 + flicker; // light falling inward
      else v = 0.6 + flicker + (hash2(x, y, 84) > 0.97 ? 4.5 : 0); // the far side: dark, a few stars
      b.set(x, y, rampDither(RIFT, v, x, y));
    }
  }
  // shards of rock hanging in the light around the tear
  for (let i = 0; i < 26; i++) {
    const sy = 6 + r() * 168, side = r() < 0.5 ? -1 : 1;
    const sx = riftX(sy) + side * (3 + r() * 12);
    const sz = (0.8 + r() * 1.8) * S;
    const X = sx * S, Y = sy * S;
    polyFill(b, [[X, Y - sz], [X + sz * 0.8, Y], [X, Y + sz * 0.7], [X - sz * 0.7, Y]], (x) => (Math.sign(x - X) === -side ? RIFT[5] : ROCK[2]));
  }
}

// ---------------------------------------------------------------------------
// the jungle and its river
// ---------------------------------------------------------------------------

function river(b: Bitmap) {
  const pts = RIVER_D.map(([x, y]): [number, number] => [x * S, y * S]);
  for (let y = 0; y < H; y++) {
    for (let x = Math.floor(440 * S); x < Math.min(W, 500 * S); x++) {
      const dx = x / S, dy = y / S;
      if (!onLand(dx, dy)) continue;
      const d = nearPolyline(x + (vnoise(x, y, 8 * S, 86) - 0.5) * 4 * S, y, pts) / S;
      const w = 2.4 + dy / 90;
      if (d < w) b.set(x, y, rampDither(WATER, d < w * 0.45 ? 3.6 : 2.6, x, y));
      else if (d < w + 0.8) b.set(x, y, EARTH[1]);
    }
  }
  // over the edge: a waterfall dropping into the void, fraying into spray
  const [ex] = RIVER_D[RIVER_D.length - 1];
  const top = Math.round(yS(ex) * S);
  for (let y = top; y < H; y++) {
    const k = (y - top) / (H - top);
    const half = (1.6 + k * 2.4) * S;
    for (let x = Math.floor(ex * S - half); x <= Math.ceil(ex * S + half); x++) {
      const u = Math.abs(x - ex * S) / half;
      if (u > 1) continue;
      if (k > 0.35 && !dith(x, y, 1 - (k - 0.35) / 0.65)) continue;
      const streak = (x + Math.floor(y / 3)) % 4 === 0;
      b.set(x, y, WATER[u > 0.7 ? 3 : streak ? 6 : 5]);
    }
  }
}

/** One canopy crown seen from above: a lit dome, darker under its right side, a shadow on the ground. */
function crown(b: Bitmap, x: number, y: number, r: number, tone: number) {
  ellipseFill(b, x + r * 0.45, y + r * 0.35, r, r * 0.8, (px, py) => (dith(px, py, 0.7) ? JUNGLE[0] : 0));
  ellipseFill(b, x, y, r, r * 0.85, (px, py, d) => {
    const lx = (px + 0.5 - x) / r, ly = (py + 0.5 - y) / (r * 0.85);
    const leaf = (hash2(px >> 1, py >> 1, 87) - 0.5) * 0.9;
    return rampDither(JUNGLE, tone + 2.2 - lx * 1.4 - ly * 1.6 - d * 0.6 + leaf, px, py);
  });
}

/** Jungle canopy east of the forest line: crowns packed close, a few emergent giants, clearings left for the road and the arena. */
function jungle(b: Bitmap, clear: (x: number, y: number) => boolean) {
  const r = rng(53);
  const items: { y: number; draw: () => void }[] = [];
  const step = 6.5 * S;
  for (let gy = 0; gy < H; gy += step) {
    for (let gx = FOREST * S; gx < W; gx += step) {
      const x = gx + (r() - 0.5) * step, y = gy + (r() - 0.5) * step;
      const dx = x / S, dy = y / S;
      if (!onLand(dx, dy) || !onLand(dx, dy + 3) || !clear(x, y)) continue;
      if (nearPolyline(dx, dy, RIVER_D) < 4.5) continue;
      if (r() > 0.25 + jungleness(dx) * 0.75) continue;
      const giant = r() < 0.06;
      const rad = (giant ? 6 + r() * 2 : 3 + r() * 2.2) * S;
      const tone = (giant ? 1.4 : 0.6) + r() * 0.8 + (fbm(dx, dy, 55) - 0.5) * 1.4;
      items.push({ y, draw: () => crown(b, Math.round(x), Math.round(y), rad, tone) });
    }
  }
  items.sort((a, c) => a.y - c.y).forEach((i) => i.draw());
}

// ---------------------------------------------------------------------------
// the dim grassland of the first area
// ---------------------------------------------------------------------------

function tree(b: Bitmap, x: number, y: number) {
  const s = S;
  ellipseFill(b, x + 2 * s, y + 1, 3.4 * s, 1.4 * s, (px, py) => (dith(px, py, 0.6) ? GRASS[0] : 0));
  const icon = new Bitmap(Math.ceil(10 * s), Math.ceil(11 * s));
  const cx = icon.w / 2, cy = 4.2 * s;
  icon.set(Math.round(cx), Math.round(cy + 3.6 * s), EARTH[1]);
  ellipseFill(icon, cx, cy, 3.6 * s, 3.4 * s, (px, py, d) => rampDither(TREE, 3.6 - (px - cx + 3) / (2.4 * s) - (py - cy + 3) / (2.6 * s) - d * 0.5, px, py));
  b.blit(outline(icon, TREE[0]), Math.round(x - cx), Math.round(y - 8 * s));
}

function boulder(b: Bitmap, x: number, y: number) {
  const s = S;
  const icon = new Bitmap(Math.ceil(7 * s), Math.ceil(5 * s));
  ellipseFill(icon, 3.5 * s, 2.6 * s, 2.8 * s, 1.9 * s, (px, py) => rampDither(STONE, 3.4 - (px - 1) / (2 * s) - (py - 1) / (1.6 * s), px, py));
  b.blit(outline(icon, STONE[0]), Math.round(x - 3.5 * s), Math.round(y - 4 * s));
}

/** Trees and boulders over the grassland, thickening into forest toward the jungle. */
function grassland(b: Bitmap, clear: (x: number, y: number) => boolean) {
  const r = rng(99);
  const icons: { y: number; draw: () => void }[] = [];
  const step = 9 * S;
  for (let gy = 0; gy < H; gy += step) {
    for (let gx = (WEST + 16) * S; gx < (JUNGLE_X + 10) * S; gx += step) {
      const x = Math.round(gx + (r() - 0.5) * step), y = Math.round(gy + (r() - 0.5) * step);
      const dx = x / S, dy = y / S;
      if (!onLand(dx, dy) || !onLand(dx, dy - 6) || !onLand(dx, dy + 2) || !clear(x, y)) continue;
      if (dx - riftX(dy) < 16) continue;
      const n = fbm(dx, dy, 31);
      const forest = jungleness(dx + 40);
      if (n > 0.6 - forest * 0.3) icons.push({ y, draw: () => tree(b, x, y) });
      else if (n < 0.3 && r() < 0.3) icons.push({ y, draw: () => boulder(b, x, y) });
    }
  }
  icons.sort((a, c) => a.y - c.y).forEach((i) => i.draw());
}

function cottageIcon(b: Bitmap, x: number, y: number, s: number, lit: boolean) {
  const icon = new Bitmap(Math.ceil(12 * s) + 2, Math.ceil(10 * s) + 2);
  const w = 10 * s, wallH = 3.4 * s, roofH = 5 * s;
  const x0 = 1, base = icon.h - 1;
  for (let py = Math.round(base - wallH); py < base; py++) for (let px = Math.round(x0 + s); px < x0 + w - s; px++) icon.set(px, py, rampDither(STONE, 3.2 - ((px - x0) / w) * 1.4, px, py));
  if (lit) for (let k = 0; k < Math.max(1, Math.round(s)); k++) icon.set(Math.round(x0 + w * 0.35) + k, Math.round(base - wallH * 0.55), LAMP[s > 1.5 ? 2 : 1]);
  polyFill(icon, [[x0, base - wallH], [x0 + w * 0.25, base - wallH - roofH], [x0 + w * 0.75, base - wallH - roofH], [x0 + w, base - wallH]], (px, py) => rampDither(THATCH, 3.8 - ((px - x0) / w) * 2 - ((py - (base - wallH - roofH)) / roofH) * 0.6, px, py));
  b.blit(outline(icon, INKC), Math.round(x - icon.w / 2), Math.round(y - icon.h + 1));
}

/** The first area's landmark: the settlement, cottages with lit windows in a ring of field walls, fields beside. */
function settlement(b: Bitmap, x: number, y: number) {
  const s = S;
  for (const [fx, fy, fw, fh, crop] of [[-56, -8, 24, 9, false], [-58, 3, 20, 7, true], [32, -11, 22, 8, true], [34, 0, 26, 9, false]] as const) {
    for (let py = Math.round(y + fy * s); py < y + (fy + fh) * s; py++) {
      for (let px = Math.round(x + fx * s); px < x + (fx + fw) * s; px++) {
        if (!onLand(px / S, py / S)) continue;
        const furrow = Math.floor((py - y) / Math.max(1, s)) % 2 === 0;
        b.set(px, py, crop ? rampDither(GRASS, furrow ? 4.6 : 3.4, px, py) : rampDither(EARTH, furrow ? 3.2 : 2.2, px, py));
      }
    }
  }
  for (let a = 0; a < Math.PI * 2; a += 0.01) {
    if (Math.sin(a * 3 + 1) > 0.82) continue;
    const px = Math.round(x + Math.cos(a) * 26 * s), py = Math.round(y - 4 * s + Math.sin(a) * 11 * s);
    b.set(px, py, STONE[Math.cos(a + 0.8) > 0 ? 3 : 1]);
  }
  const houses: [number, number, number, boolean][] = [[-14, -8, 1, true], [2, -12, 0.9, false], [14, -6, 1.1, true], [-4, -2, 1, false], [-18, 2, 0.8, false], [10, 3, 0.9, true]];
  for (const [hx, hy, k, lit] of houses.sort((p, q) => p[1] - q[1])) cottageIcon(b, x + hx * s, y + hy * s, k * s, lit);
  for (let i = 0; i < 14 * s; i++) {
    const px = Math.round(x + 4 * s + Math.sin(i / (3 * s)) * s + i * 0.35), py = Math.round(y - 16 * s - i);
    if (dith(px, py, 0.8 - i / (18 * s))) b.set(px, py, STONE[2]);
  }
}

/** The second area's landmark: a clearing in the canopy holding an arena, a ring of standing stones around a worn floor. */
function arena(b: Bitmap, x: number, y: number) {
  const s = S;
  const rx = 15 * s, ry = 8.5 * s;
  // the clearing: trampled earth and moss, darker at the rim where the canopy overhangs
  ellipseFill(b, x, y, rx + 4 * s, ry + 3 * s, (px, py, d) => rampDither(JUNGLE, 1.2 + (1 - d) * 1.4, px, py));
  ellipseFill(b, x, y, rx, ry, (px, py, d) => {
    const lx = (px + 0.5 - x) / rx, ly = (py + 0.5 - y) / ry;
    const ring = Math.abs(d - 0.62) < 0.07;
    return ring ? MOSSY[1] : rampDither(MOSSY, 2.6 - lx * 0.6 - ly * 0.7 - d * 0.8 + (hash2(px >> 1, py >> 1, 88) - 0.5) * 0.5, px, py);
  });
  // a centre stone
  ellipseFill(b, x, y, 2.2 * s, 1.4 * s, (px, py) => rampDither(STONE, 4 - (px - x) / (2 * s) - (py - y) / (1.4 * s), px, py));
  // the standing stones, the far ones first
  const stones: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    stones.push([x + Math.cos(a) * rx * 0.92, y + Math.sin(a) * ry * 0.92]);
  }
  for (const [sx, sy] of stones.sort((p, q) => p[1] - q[1])) {
    const icon = new Bitmap(Math.ceil(4 * s) + 2, Math.ceil(7 * s) + 2);
    for (let py = 1; py < icon.h - 1; py++) for (let px = 1; px < icon.w - 1; px++) icon.set(px, py, rampDither(STONE, 4.4 - (px - 1) / (1.6 * s) - (py - 1) / (6 * s), px, py));
    b.blit(outline(icon, INKC), Math.round(sx - icon.w / 2), Math.round(sy - icon.h + 2));
  }
}

/** A standard planted in the ground: a pole and a small banner with its device. */
function flag(b: Bitmap, x: number, y: number, cloth: RGBA[], device: RGBA) {
  const s = S;
  const icon = new Bitmap(Math.ceil(7 * s) + 2, Math.ceil(12 * s) + 2);
  const pole = 1;
  for (let py = 1; py < icon.h - 1; py++) icon.set(pole, py, EARTH[3]);
  icon.set(pole, 0, GOLD[2]);
  for (let py = 2; py < 2 + 6 * s; py++) {
    for (let px = pole + 1; px < pole + 1 + 5 * s; px++) {
      const hem = py > 2 + 5 * s && Math.abs(px - pole - 0.5 - 2.5 * s) < s;
      if (hem) continue;
      icon.set(px, py, rampDither(cloth, 2.2 - ((px - pole) / (5 * s)) * 1.4, px, py));
    }
  }
  icon.set(Math.round(pole + 1 + 2.5 * s), Math.round(2 + 2.6 * s), device);
  if (s > 1.5) icon.set(Math.round(pole + 2.5 * s), Math.round(2 + 2.6 * s), device);
  b.blit(outline(icon, INKC), Math.round(x - pole), Math.round(y - icon.h + 1));
}

// ---------------------------------------------------------------------------
// road, compass, frame
// ---------------------------------------------------------------------------

/** The road: from the rift's edge through every location's node, in campaign order. */
function roadPoints(): [number, number][] {
  const start: [number, number] = [(riftX(96) + 16) * S, 96 * S];
  return [start, ...LOCATIONS.map((l) => wp(l.map.x, l.map.y))];
}

/** Curved road segment points between two stops. */
function roadSegment(a: [number, number], c: [number, number], i: number): [number, number][] {
  const [ax, ay] = a, [bx, by] = c;
  const len = Math.hypot(bx - ax, by - ay);
  const nx = -(by - ay) / len, ny = (bx - ax) / len;
  const bend = (i % 2 ? 1 : -1) * Math.min(18 * S, len * 0.1);
  const out: [number, number][] = [];
  for (let s = 0; s <= len; s += 0.5) {
    const t = s / len;
    // two gentle waves so a long road does not run dead straight
    const wave = Math.sin(Math.PI * t) + Math.sin(Math.PI * 3 * t) * 0.3;
    out.push([ax + (bx - ax) * t + nx * bend * wave, ay + (by - ay) * t + ny * bend * wave]);
  }
  return out;
}

function road(b: Bitmap, all: [number, number][]) {
  for (const [x, y] of all) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1]]) b.set(Math.round(x) + dx, Math.round(y) + dy, EARTH[0]);
  }
  for (const [x, y] of all) {
    const X = Math.round(x), Y = Math.round(y);
    b.set(X, Y, hash2(X, Y, 3) > 0.85 ? EARTH[2] : EARTH[3]);
    b.set(X + 1, Y, EARTH[4]);
    b.set(X, Y + 1, EARTH[2]);
  }
}

function compass(b: Bitmap, cx: number, cy: number) {
  const k = Math.max(0.5, S / 2);
  const at = (r: number, a: number): [number, number] => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const long = (i % 2 === 0 ? 13 : 7) * k;
    for (const side of [-1, 1]) polyFill(b, [[cx, cy], at(long, a), at(3 * k, a + side * (Math.PI / 4))], side < 0 ? GOLD[3] : GOLD[1]);
  }
  ellipseFill(b, cx, cy, 2.2 * k, 2.2 * k, GOLD[2]);
  if (k >= 1) ['#..#', '##.#', '#.##', '#..#'].forEach((row, yy) => [...row].forEach((ch, xx) => ch === '#' && b.set(Math.round(cx - 2 + xx), Math.round(cy - 20 * k + yy), GOLD[3])));
}

function frame(b: Bitmap) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (e < 2) b.set(x, y, INKC);
      else if (e === 3) b.set(x, y, GOLD[1]);
      else if (e < 18 && dith(x, y, ((18 - e) / 16) * 0.45)) b.set(x, y, VOID[0]);
    }
  }
}

/** Draws the whole world into a w x h bitmap. */
function renderMap(w: number, h: number): Bitmap {
  W = w;
  H = h;
  S = w / DW;
  const b = new Bitmap(W, H);
  voidAndLand(b);
  fragments(b);
  river(b);
  const nodes = roadPoints();
  const roadPts = nodes.slice(0, -1).flatMap((p, i) => roadSegment(p, nodes[i + 1], i));
  const marks = LOCATIONS.map((l) => wp(l.map.x, l.map.y));
  // keep clear of the road and of the nodes with their banners (the runtime draws them in a clearing under each landmark)
  const clear = (x: number, y: number) =>
    marks.every(([mx, my]) => Math.hypot((x - mx) / (40 * S), (y - my - 8 * S) / (24 * S)) > 1 + (hash2(Math.round(x / S), Math.round(y / S), 89) - 0.5) * 0.25) && roadPts.every(([rx, ry]) => Math.hypot(x - rx, y - ry) > 5 * S);
  grassland(b, clear);
  jungle(b, clear);
  road(b, roadPts);
  LOCATIONS.forEach((l, i) => {
    const [x, y] = wp(l.map.x, l.map.y);
    if (i === 0) settlement(b, Math.round(x), Math.round(y - 22 * S));
    else arena(b, Math.round(x), Math.round(y - 30 * S));
  });
  // where the warriors of the two worlds first met: their standards, between the rift and the settlement
  const sy = 92;
  flag(b, (riftX(sy) + 26) * S, (sy - 6) * S, AZURE, GOLD[3]);
  flag(b, (riftX(sy) + 40) * S, (sy + 12) * S, SABLE, BLOOD[2]);
  rift(b);
  compass(b, Math.round(618 * S), Math.round(166 * S));
  frame(b);
  return b;
}

/** The scrolling world, and the overview: the same world at a fraction of the size, so it fits one screen. */
export function buildMap(out: string) {
  const world = renderMap(WORLD_MAP.w, WORLD_MAP.h);
  world.save(path.join(out, 'map', 'world.png'));
  world.save(path.join('docs', 'images', 'world_map.png'));
  const overview = renderMap(WORLD_MAP.w / WORLD_MAP.overview, WORLD_MAP.h / WORLD_MAP.overview);
  overview.save(path.join(out, 'map', 'overview.png'));
  console.log(`  map: world ${world.w}x${world.h}, overview ${overview.w}x${overview.h}, ${LOCATIONS.length} campaign nodes`);
}
