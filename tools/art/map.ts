// The campaign world map: the broken realm seen from above at a slant, lit
// from the top-left like everything else. The world (WORLD_MAP, 1280x360) is
// two screens wide and one tall and scrolls sideways under the campaign
// screen; the overview is the same world drawn at half the size.
//
// It shows Zone 1 of Jakub's working notes (docs/DESIGN_DECISIONS.md 5.2,
// 5.3): a dim island floating over a sea of cloud, its settlement in the
// middle, the standards of the Azure Crown and the Sanguine Dominion where
// their warriors first meet at the west end, the road east to the point
// where the player leaves, and smaller islands and loose rock drifting
// around it. Other areas join the line to the east as they are designed.
//
// The road and the location landmark are placed from the campaign data
// (src/game/data/campaign.ts, world pixels), so new stages extend the road
// automatically; stage nodes and labels are drawn by the runtime on top. The
// geography is laid out on a 640x180 design sheet and mapped onto each
// render; surface detail is drawn in the render's own pixels.
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

const SKY = ramp(['#0b0e1e', '#11162a', '#1a2038', '#242c48', '#2e3756']);
const CLOUD = ramp(['#0e1222', '#161b30', '#20263e', '#2b324c', '#383e5a', '#474c68', '#5a5c78', '#706e88']);
const GRASS = ramp(['#141c16', '#1c261c', '#253122', '#2f3c28', '#3a472e', '#465435', '#55623d']);
const ROCK = ramp(['#0f1018', '#191a26', '#242634', '#303344', '#3e4254', '#4e5366', '#62677a']);
const EARTH = ramp(['#1e1813', '#2c231a', '#3c3022', '#4e3f2c', '#625238']);
const TREE = ramp(['#0c140f', '#132016', '#1b2c1d', '#243824', '#2e452b']);
const THATCH = ramp(['#1b150d', '#2e2416', '#43361f', '#5a4a2b', '#706039']);
const STONE = ramp(['#14151d', '#262833', '#3a3d4b', '#525667', '#6d7283']);
const LAMP = ramp(['#9a5020', '#e09040', '#ffcf80']);
const GOLD = ramp(['#5a3410', '#a8701e', '#e8b440', '#fff0a8']);
const AZURE = ramp(['#16306c', '#2856b8', '#4a7ae0']);
const BLOOD = ramp(['#5a0e18', '#b02a36', '#e0505a']);
const SABLE = ramp(['#08070a', '#1a161e', '#2a2530']);
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
  return vnoise(x, y, 40, seed) * 0.55 + vnoise(x, y, 16, seed + 1) * 0.3 + vnoise(x, y, 6, seed + 2) * 0.15;
}

/** The island in design coordinates: west and east tips, and its top surface between yTop and yBot. */
const X0 = 22, X1 = 606;
/** 0..1 along the island, fattest a little west of the middle, a long point to the east */
const along = (x: number) => (x - X0) / (X1 - X0);
const girth = (x: number) => {
  const u = along(x);
  if (u <= 0 || u >= 1) return 0;
  return Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 0.55) * (1 - 0.25 * u);
};
const midY = (x: number) => 92 + Math.sin(x * 0.011) * 5 - along(x) * 6;
const yTop = (x: number) => midY(x) - girth(x) * (40 + (vnoise(x, 0, 26, 71) - 0.5) * 16);
const yBot = (x: number) => midY(x) + girth(x) * (34 + (vnoise(x, 0, 22, 72) - 0.5) * 14);
/** the cliff face below the south edge, and the rock hanging beneath it */
const cliffH = (x: number) => girth(x) * 9;
const hang = (x: number) => Math.pow(girth(x), 1.4) * (26 + (vnoise(x, 0, 9, 73) - 0.5) * 22 + (vnoise(x, 0, 3, 74) - 0.5) * 8);

/** Inside the island's top surface, in render pixels. */
const onTop = (x: number, y: number) => {
  const dx = x / S, dy = y / S;
  return dx > X0 && dx < X1 && dy > yTop(dx) && dy < yBot(dx);
};

// ---------------------------------------------------------------------------
// the sky and the sea of cloud below
// ---------------------------------------------------------------------------

function sky(b: Bitmap) {
  const horizon = 20 * S;
  // the sky over the horizon, and the deep beneath the clouds
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (y < horizon) b.set(x, y, rampDither(SKY, (y / horizon) * 4.2, x, y));
      else b.set(x, y, rampDither(CLOUD, 0.7 + ((y - horizon) / (H - horizon)) * 0.6, x, y));
    }
  }
  // the sea of cloud, far to near: rows of billows, small and packed at the horizon, bigger as they come nearer
  const r = rng(41);
  for (let row = 0; ; row++) {
    const dy = 19 + Math.pow(row / 22, 1.35) * 160;
    if (dy > DH + 12) break;
    const near = Math.min(1, (dy - 20) / (DH - 20));
    const size = 4 + near * 15;
    for (let dx = -12 + r() * size; dx < DW + 12; dx += size * (1 + r() * 0.9)) {
      const bank = vnoise(dx, dy * 2.2, 70, 43);
      if (bank < 0.3 && r() < 0.75) continue;
      puff(b, dx, dy + (r() - 0.5) * size * 0.3, size * (0.6 + r() * 0.5 + bank * 0.3), near, r, (bank - 0.5) * 1.6);
    }
  }
  // a few stars over the horizon
  const rs = rng(5);
  for (let i = 0; i < 40 * S; i++) {
    const x = Math.floor(rs() * W), y = Math.floor(rs() * 14 * S);
    b.set(x, y, hex(rs() < 0.3 ? '#c8c8e0' : '#8a8aa8'));
  }
}

/** One billow: a few round lobes, each lit on its upper left and darkening to a rim at its foot. */
function puff(b: Bitmap, cx: number, cy: number, s: number, near: number, r: () => number, tone: number) {
  const lobes: [number, number, number][] = [
    [-0.55, 0.12, 0.7 + r() * 0.2],
    [0.55, 0.14, 0.7 + r() * 0.2],
    [0, -0.1, 1],
    [(r() - 0.5) * 0.6, -0.42, 0.55 + r() * 0.2],
  ];
  for (const [ox, oy, k] of lobes) {
    const X = (cx + ox * s) * S, Y = (cy + oy * s * 0.55) * S, R = s * k * S * 0.62, RY = R * 0.5;
    ellipseFill(b, X, Y, R, RY, (x, y, d) => {
      const lx = (x + 0.5 - X) / R, ly = (y + 0.5 - Y) / RY;
      let v = 3 + tone + (1 - near) * 0.9 - lx * 0.8 - ly * 1.1;
      if (d > 0.84 && ly > 0) v -= 1.4;
      return rampDither(CLOUD, v, x, y);
    });
  }
}

/** The shadow the island throws on the clouds below, away from the light. */
function shadow(b: Bitmap) {
  const ox = 22, oy = 30;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x / S - ox, dy = y / S - oy;
      if (dx <= X0 || dx >= X1) continue;
      const bottom = yBot(dx) + cliffH(dx) + hang(dx) * 0.6;
      if (dy < yTop(dx) + 6 || dy > bottom) continue;
      const edge = Math.min(dy - yTop(dx) - 6, bottom - dy) / (6 * Math.max(0.3, girth(dx)));
      if (edge < 1 && !dith(x, y, edge)) continue;
      b.set(x, y, CLOUD[hash2(x, y, 3) > 0.5 ? 1 : 0]);
    }
  }
}

/** A small island or a loose rock adrift: a lit grassy top over a jagged hanging cone, its own shadow below. */
function islet(b: Bitmap, cx: number, cy: number, s: number, grassy: boolean, seed: number) {
  const w = 18 * s, top = 6 * s, depth = 22 * s;
  const X = cx * S, Y = cy * S, Wd = w * S;
  // shadow on the clouds
  ellipseFill(b, X + 16 * S * s, Y + 30 * S * s, Wd * 0.8, top * S * 0.8, (x, y) => (dith(x, y, 0.75) ? CLOUD[0] : 0));
  const icon = new Bitmap(Math.ceil(Wd * 2 + 6), Math.ceil((top + depth) * S + 8));
  const ox = Math.round(X - Wd - 3), oy = Math.round(Y - top * S - 3);
  const lx = (x: number) => x + ox, ly = (y: number) => y + oy;
  // the hanging rock: a cone with a ragged edge
  for (let x = 0; x < icon.w; x++) {
    const u = (lx(x) - X) / Wd;
    if (Math.abs(u) >= 1) continue;
    const bottom = Y + depth * S * (1 - Math.abs(u)) * (0.6 + 0.4 * vnoise(x, seed, 3, seed)) ;
    for (let y = 0; y < icon.h; y++) {
      const Yy = ly(y);
      if (Yy < Y || Yy > bottom) continue;
      icon.set(x, y, rampDither(ROCK, 3.4 - u * 1.6 - ((Yy - Y) / (depth * S)) * 1.6, lx(x), Yy));
    }
  }
  // the top: an ellipse of grass (or bare rock), lit from the top-left
  ellipseFill(icon, X - ox, Y - oy, Wd, top * S, (x, y, d) => {
    const u = (lx(x) - X) / Wd, v = (ly(y) - Y) / (top * S);
    return rampDither(grassy ? GRASS : ROCK, 4.2 - u * 1.2 - v * 1.2 - d * 0.8, lx(x), ly(y));
  });
  b.blit(outline(icon, INKC), ox, oy);
}

// ---------------------------------------------------------------------------
// the island
// ---------------------------------------------------------------------------

function island(b: Bitmap) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x / S, dy = y / S;
      if (dx <= X0 || dx >= X1) continue;
      const t = yTop(dx), bo = yBot(dx);
      if (dy < t) continue;
      if (dy < bo) {
        // the top surface: grass, hills shaded by a light from the top-left, a lit rim along the north edge
        const sh = (fbm(dx - 2, dy - 2, 21) - fbm(dx + 2, dy + 2, 21)) * 9;
        let v = 2.9 + sh + (vnoise(x, y, 5 * S, 23) - 0.5) * 0.7 + (fbm(dx, dy, 25) - 0.5) * 1.2;
        if (dy - t < 1.6) v = 5.6;
        else if (dy - t < 3) v += 1.2;
        if (bo - dy < 1.5) v -= 1;
        b.set(x, y, rampDither(GRASS, v, x, y));
        continue;
      }
      const c = cliffH(dx);
      if (dy < bo + c) {
        // the cliff face: strata of rock, lit toward the west where it turns to the light
        const k = (dy - bo) / Math.max(1, c);
        const stratum = Math.floor((dy - bo) * 1.4 + vnoise(dx, 0, 7, 75) * 3) % 3 === 0 ? -0.6 : 0;
        const turn = (yBot(dx + 1) - yBot(dx - 1)) * 0.8;
        b.set(x, y, rampDither(ROCK, 4.6 - k * 2.2 + stratum + turn, x, y));
        continue;
      }
      const hg = hang(dx);
      if (dy < bo + c + hg) {
        // the rock hanging beneath: darker the deeper it goes, its west faces catching some light
        const k = (dy - bo - c) / Math.max(1, hg);
        const facet = (hang(dx + 1.5) - hang(dx - 1.5)) * 0.25;
        const root = hash2(Math.floor(x / Math.max(1, S)), 77, 9) > 0.93 && k < 0.5 ? -1 : 0;
        b.set(x, y, rampDither(ROCK, 2.8 - k * 2.2 + facet + root + (vnoise(x, y, 4 * S, 76) - 0.5) * 0.6, x, y));
      }
    }
  }
  // dark underside outline where the hanging rock meets the clouds
  for (let x = 0; x < W; x++) {
    const dx = x / S;
    if (dx <= X0 || dx >= X1) continue;
    const y = Math.round((yBot(dx) + cliffH(dx) + hang(dx)) * S);
    b.set(x, y, INKC);
    b.set(x, Math.round(yTop(dx) * S) - 1, INKC);
  }
}

/** Trees, boulders and field walls scattered over the top, clear of the road, the stages and the settlement. */
function scatter(b: Bitmap, clear: (x: number, y: number) => boolean) {
  const r = rng(99);
  const icons: { y: number; draw: () => void }[] = [];
  const step = 9 * S;
  for (let gy = 0; gy < H; gy += step) {
    for (let gx = 0; gx < W; gx += step) {
      const x = Math.round(gx + (r() - 0.5) * step), y = Math.round(gy + (r() - 0.5) * step);
      if (!onTop(x, y) || !onTop(x, y - 6 * S) || !onTop(x, y + 2 * S) || !clear(x, y)) continue;
      const n = fbm(x / S, y / S, 31);
      if (n > 0.55) icons.push({ y, draw: () => tree(b, x, y) });
      else if (n < 0.3 && r() < 0.35) icons.push({ y, draw: () => boulder(b, x, y) });
    }
  }
  icons.sort((a, c) => a.y - c.y).forEach((i) => i.draw());
}

function tree(b: Bitmap, x: number, y: number) {
  const s = S;
  // its shadow falls down and to the right
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

/**
 * The settlement, the location's landmark: a cluster of thatched cottages
 * with lit windows inside a ring of field walls, a thread of smoke.
 */
function settlement(b: Bitmap, x: number, y: number) {
  const s = S;
  // strips of field to the west and east of the houses, furrows lit along their upper edge
  for (const [fx, fy, fw, fh, crop] of [[-58, -6, 26, 9, false], [-60, 5, 22, 7, true], [34, -9, 24, 8, true], [36, 2, 28, 9, false]] as const) {
    for (let py = Math.round(y + fy * s); py < y + (fy + fh) * s; py++) {
      for (let px = Math.round(x + fx * s); px < x + (fx + fw) * s; px++) {
        if (!onTop(px, py)) continue;
        const furrow = Math.floor((py - y) / Math.max(1, s)) % 2 === 0;
        b.set(px, py, crop ? rampDither(GRASS, furrow ? 4.6 : 3.4, px, py) : rampDither(EARTH, furrow ? 3.2 : 2.2, px, py));
      }
    }
  }
  // field walls: a broken ring of stone around the houses
  for (let a = 0; a < Math.PI * 2; a += 0.01) {
    if (Math.sin(a * 3 + 1) > 0.82) continue;
    const px = Math.round(x + Math.cos(a) * 26 * s), py = Math.round(y - 4 * s + Math.sin(a) * 11 * s);
    b.set(px, py, STONE[Math.cos(a + 0.8) > 0 ? 3 : 1]);
  }
  const houses: [number, number, number, boolean][] = [
    [-14, -8, 1, true],
    [2, -12, 0.9, false],
    [14, -6, 1.1, true],
    [-4, -2, 1, false],
    [-18, 2, 0.8, false],
    [10, 3, 0.9, true],
  ];
  for (const [hx, hy, k, lit] of houses.sort((p, q) => p[1] - q[1])) cottageIcon(b, x + hx * s, y + hy * s, k * s, lit);
  // smoke from one chimney
  for (let i = 0; i < 14 * s; i++) {
    const px = Math.round(x + 4 * s + Math.sin(i / (3 * s)) * s + i * 0.35), py = Math.round(y - 16 * s - i);
    if (dith(px, py, 0.8 - i / (18 * s))) b.set(px, py, STONE[2]);
  }
}

function cottageIcon(b: Bitmap, x: number, y: number, s: number, lit: boolean) {
  const icon = new Bitmap(Math.ceil(12 * s) + 2, Math.ceil(10 * s) + 2);
  const w = 10 * s, wallH = 3.4 * s, roofH = 5 * s;
  const x0 = 1, base = icon.h - 1;
  // wall
  for (let py = Math.round(base - wallH); py < base; py++) for (let px = Math.round(x0 + s); px < x0 + w - s; px++) icon.set(px, py, rampDither(STONE, 3.2 - (px - x0) / w * 1.4, px, py));
  if (lit) for (let k = 0; k < Math.max(1, Math.round(s)); k++) icon.set(Math.round(x0 + w * 0.35) + k, Math.round(base - wallH * 0.55), LAMP[s > 1.5 ? 2 : 1]);
  // thatched roof
  polyFill(icon, [[x0, base - wallH], [x0 + w * 0.25, base - wallH - roofH], [x0 + w * 0.75, base - wallH - roofH], [x0 + w, base - wallH]], (px, py) => rampDither(THATCH, 3.8 - (px - x0) / w * 2 - (py - (base - wallH - roofH)) / roofH * 0.6, px, py));
  b.blit(outline(icon, INKC), Math.round(x - icon.w / 2), Math.round(y - icon.h + 1));
}

/** A standard planted in the ground: a pole and a little banner. */
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
      icon.set(px, py, rampDither(cloth, 2.2 - (px - pole) / (5 * s) * 1.4, px, py));
    }
  }
  icon.set(Math.round(pole + 1 + 2.5 * s), Math.round(2 + 2.6 * s), device);
  if (s > 1.5) icon.set(Math.round(pole + 2.5 * s), Math.round(2 + 2.6 * s), device);
  b.blit(outline(icon, INKC), Math.round(x - pole), Math.round(y - icon.h + 1));
}

// ---------------------------------------------------------------------------
// road, compass, frame
// ---------------------------------------------------------------------------

/** Stage nodes in campaign order: the road visits each of them. */
function roadPoints(): [number, number][] {
  return LOCATIONS.flatMap((l) => l.stages.map((s) => wp(s.map.x, s.map.y)));
}

/** Curved road segment points between two stops. */
function roadSegment(a: [number, number], c: [number, number], i: number): [number, number][] {
  const [ax, ay] = a, [bx, by] = c;
  const len = Math.hypot(bx - ax, by - ay);
  const nx = -(by - ay) / len, ny = (bx - ax) / len, bend = (i % 2 ? 1 : -1) * Math.min(10 * S, len * 0.12);
  const out: [number, number][] = [];
  for (let s = 0; s <= len; s += 0.5) {
    const t = s / len;
    out.push([ax + (bx - ax) * t + nx * bend * Math.sin(Math.PI * t), ay + (by - ay) * t + ny * bend * Math.sin(Math.PI * t)]);
  }
  return out;
}

function road(b: Bitmap, all: [number, number][]) {
  // packed earth: a dark verge, a worn centre lit on its upper-left side
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
  const at = (r: number, a: number): [number, number] => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  const k = Math.max(0.6, S / 2);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const long = (i % 2 === 0 ? 15 : 8) * k;
    for (const side of [-1, 1]) polyFill(b, [[cx, cy], at(long, a), at(3 * k, a + side * (Math.PI / 4))], side < 0 ? GOLD[3] : GOLD[1]);
  }
  ellipseFill(b, cx, cy, 2.4 * k, 2.4 * k, GOLD[2]);
  ['#..#', '##.#', '#.##', '#..#'].forEach((row, yy) => [...row].forEach((ch, xx) => ch === '#' && b.set(Math.round(cx - 2 + xx), Math.round(cy - 22 * k + yy), GOLD[3])));
}

function frame(b: Bitmap) {
  // a dithered vignette, then a dark rim with a thin gold rule
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (e < 2) b.set(x, y, INKC);
      else if (e === 3) b.set(x, y, GOLD[1]);
      else if (e < 18 && dith(x, y, ((18 - e) / 16) * 0.45)) b.set(x, y, CLOUD[0]);
    }
  }
}

/** Draws the whole world into a w x h bitmap. */
function renderMap(w: number, h: number): Bitmap {
  W = w;
  H = h;
  S = w / DW;
  const b = new Bitmap(W, H);
  sky(b);
  // other islands and loose rock adrift, far ones small near the horizon
  for (const [x, y, s, g, seed] of [[592, 30, 0.7, true, 1], [64, 24, 0.5, true, 2], [430, 22, 0.4, true, 3], [250, 26, 0.3, false, 4], [618, 132, 0.9, true, 5], [12, 150, 0.6, true, 6], [560, 160, 0.35, false, 7], [140, 168, 0.4, false, 8]] as const) islet(b, x, y, s, g, seed);
  shadow(b);
  island(b);
  const nodes = roadPoints();
  const roadPts = nodes.slice(0, -1).flatMap((p, i) => roadSegment(p, nodes[i + 1], i));
  const marks = LOCATIONS.map((l) => wp(l.map.x, l.map.y));
  const clear = (x: number, y: number) =>
    nodes.every(([nx, ny]) => Math.hypot(x - nx, y - ny) > 12 * S) && marks.every(([mx, my]) => Math.hypot((x - mx) / 2.4, y - my + 4 * S) > 16 * S) && roadPts.every(([rx, ry]) => Math.hypot(x - rx, y - ry) > 5 * S);
  scatter(b, clear);
  road(b, roadPts);
  for (const [x, y] of marks) settlement(b, Math.round(x), Math.round(y));
  // where the two worlds first touch: their standards face each other at the first stage
  const [fx, fy] = nodes[0];
  flag(b, fx - 14 * S, fy - 3 * S, AZURE, GOLD[3]);
  flag(b, fx + 12 * S, fy - 9 * S, SABLE, BLOOD[2]);
  void BLOOD;
  compass(b, Math.round(30 * S), Math.round(156 * S));
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
  console.log(`  map: world ${world.w}x${world.h}, overview ${overview.w}x${overview.h}, ${roadPoints().length} road stops`);
}
