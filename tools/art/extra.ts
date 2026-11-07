// Extra Combat's hall (Jakub, 2026-11-07: "new screen for extra combat ... some
// interior with candles and three doors horizontally on the screen. first door
// should be demonic satanistic door ... second door should be celestial and
// arcane ... third door should be full of magic runes and blinking in lot of
// colors", each with a big stripe across it with LOCKED on it; "you can even
// make first door LOCKED stripe to look almost fallen").
//
// A vaulted chamber under Loomfall's Arena, lit only by candles: dark ashlar
// walls, four pillars carrying the ribs of the vault, a polished floor that
// mirrors the doors. Three portals stand in a row:
//   the first, of black basalt veined with red fire, a pointed arch under the
//     skull of a great horned goat, iron leaves riveted and spiked, a reversed
//     pentagram in a circle across them, red light leaking under them; black
//     candles with red flames at its foot;
//   the second, of white marble trimmed in gold under a winged sun, round
//     arched, its leaves the night sky in gold stars and constellations with an
//     arcane circle across them; white candles with pale flames;
//   the third, a dolmen of mossy standing stones under a heavy lintel, its slab
//     carved all over with runes that light up one by one in every colour.
// The stripes and the LOCKED on them are drawn by the screen (the word in the
// game's font), so the first one can hang from one nail and fall.
// Everything here is a first take of mine: the look, the names, the layout.
//
// Writes public/assets/extra/ (hall.png, extra.png, extra.json) and the preview
// docs/images/extra_hall.png. The runtime is src/game/screens/extra.ts.
import path from 'node:path';
import { writeJson } from './io.ts';
import { MAT } from './palette.ts';
import { dith, ellipseFill, line, polyFill, rampDither } from './paint.ts';
import { A, Bitmap, hash2, hex, mix, packShelves, RGBA } from './raster.ts';

const H = (list: string[]) => list.map((h) => hex(h));
const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const W = 640, HT = 360;
type Rect4 = [number, number, number, number];

/** the floor line: the foot of the wall and the doors */
const FLOOR = 296;
/** the three doors' centres, and their openings' half-width */
const DX = [160, 320, 480];
const HALF = 40;
const PILLARS = [40, 240, 400, 600];

// ---------------------------------------------------------------------------
// palette
// ---------------------------------------------------------------------------

/** the hall's stone, from the dark of the vault to the candlelit foot of the wall */
const STONE = H(['#08070b', '#0d0b12', '#131019', '#1a1621', '#211c29', '#292332', '#322b3c', '#3c3447', '#473e52', '#53495e']);
/** the light of the candles on the stone */
const WARM = hex('#ffaa60');
/** the first door: black basalt, its red veins, the fire behind them */
const BASALT = H(['#060508', '#0c0a0e', '#131015', '#1a161c', '#221c24', '#2b232d', '#352b37']);
const EMBER = H(['#3a0808', '#6e1010', '#a81c12', '#e0461c', '#ff8a30', '#ffd27a']);
const IRON = MAT.iron.ramp;
const BONE = MAT.bone.ramp;
/** the second door: marble, gold, the night sky, the arcane light */
const MARBLE = H(['#2d273d', '#3a334a', '#4a4058', '#5b4f66', '#6e6074', '#827282', '#988590', '#ae9a9e', '#c4aeac', '#d8c2b8', '#ead6c6']);
const GOLD = MAT.gold.ramp;
const NIGHT = H(['#04061a', '#070b26', '#0b1234', '#101a44', '#162354', '#1d2d66']);
const ARCANE = H(['#2a1e6a', '#4a3aa8', '#7a6ae0', '#aaa0ff', '#dcd8ff', '#ffffff']);
const CYAN = H(['#14506a', '#2a8ab0', '#5ad0f0', '#b8f2ff']);
/** the third door: the dolmen's stone, its moss, the slab */
const MEGA = H(['#0c0c0e', '#131316', '#1a1a1e', '#222228', '#2b2b32', '#35353d', '#404049', '#4c4c56', '#5a5a65']);
const MOSS = H(['#141e0e', '#1e2c14', '#2a3c1c', '#385026']);
const SLATE = H(['#08090c', '#0d0f13', '#13161b', '#191d23', '#20242c', '#282d36', '#313741']);
/** the floor: polished dark stone */
const FLOORC = H(['#060508', '#0a090d', '#0f0d13', '#141119', '#1a1620', '#211c28']);
/** candle wax: black (the first door), white (the second), ivory (the rest) */
const WAX = {
  black: H(['#060508', '#0e0c11', '#18151c', '#24202a', '#322c38']),
  white: H(['#5e5a62', '#8e8890', '#bcb6b8', '#e2dcd6', '#fbf6ee']),
  ivory: H(['#4a3c2c', '#76603e', '#a68a5a', '#d2b880', '#efdcac']),
};

// ---------------------------------------------------------------------------
// layout shared with the runtime
// ---------------------------------------------------------------------------

export type CandleTone = 'red' | 'pale' | 'warm';
interface Candle {
  x: number;
  /** the wick: where the flame stands */
  y: number;
  /** the candle's height and width */
  h: number;
  w: number;
  tone: CandleTone;
}

/** Black candles at the first door, white at the second, ivory elsewhere; clusters on the floor and on the pillars' sconces. */
const CANDLES: Candle[] = (() => {
  const out: Candle[] = [];
  const cluster = (x0: number, base: number, list: [number, number, number][], tone: CandleTone) => {
    for (const [dx, h, w] of list) out.push({ x: x0 + dx, y: base - h, h, w, tone });
  };
  // the first door's foot
  cluster(DX[0] - 64, FLOOR + 10, [[0, 22, 5], [7, 12, 4], [-6, 9, 4], [12, 6, 3]], 'red');
  cluster(DX[0] + 60, FLOOR + 10, [[0, 16, 5], [-7, 26, 5], [7, 8, 4], [-13, 6, 3]], 'red');
  // the second door's
  cluster(DX[1] - 62, FLOOR + 10, [[0, 24, 5], [8, 14, 4], [-7, 8, 4]], 'pale');
  cluster(DX[1] + 62, FLOOR + 10, [[0, 18, 5], [-8, 28, 5], [7, 9, 4]], 'pale');
  // the third door's
  cluster(DX[2] - 62, FLOOR + 10, [[0, 20, 5], [8, 10, 4], [-6, 7, 3]], 'warm');
  cluster(DX[2] + 62, FLOOR + 10, [[0, 14, 5], [-8, 22, 5], [7, 7, 3]], 'warm');
  // in the foreground, at the edges of the floor
  cluster(18, 352, [[0, 30, 6], [10, 18, 5], [20, 10, 4]], 'warm');
  cluster(612, 352, [[0, 34, 6], [-10, 20, 5], [-20, 12, 4], [10, 9, 4]], 'warm');
  // the sconces on the pillars
  for (const px of PILLARS) for (const dx of [-8, 0, 8]) out.push({ x: px + dx, y: 182 - (dx ? 0 : 3) - 8, h: dx ? 8 : 11, w: 3, tone: 'warm' });
  return out;
})();

/** Where the stripes hang: the first from one nail (its right), the others straight across their door. */
const STRIPE_W = 118, STRIPE_H = 24;
const STRIPES = [
  { pivot: [DX[0] + 53, 168] as [number, number], angle: -28 },
  { pivot: [DX[1] + 53, 196] as [number, number], angle: 0 },
  { pivot: [DX[2] + 53, 194] as [number, number], angle: 0 },
];

// ---------------------------------------------------------------------------
// shapes
// ---------------------------------------------------------------------------

/** inside the first door's opening: a pointed arch springing at 150 */
function inPointed(x: number, y: number, cx: number, half: number, spring: number, r: number): boolean {
  if (x < cx - half || x >= cx + half || y >= FLOOR) return false;
  if (y >= spring) return true;
  const off = r - half;
  return Math.hypot(x + 0.5 - (cx + off), y + 0.5 - spring) <= r && Math.hypot(x + 0.5 - (cx - off), y + 0.5 - spring) <= r;
}
/** inside the second door's opening: a round arch springing at 140 */
function inRound(x: number, y: number, cx: number, half: number, spring: number): boolean {
  if (x < cx - half || x >= cx + half || y >= FLOOR) return false;
  return y >= spring || Math.hypot(x + 0.5 - cx, y + 0.5 - spring) <= half;
}
/** inside the third door's opening: a trapezoid under the lintel */
function inTrap(x: number, y: number, cx: number, top: number, halfTop: number, halfBottom: number): boolean {
  if (y < top || y >= FLOOR) return false;
  const k = (y - top) / (FLOOR - top);
  const hw = halfTop + (halfBottom - halfTop) * k;
  return x >= cx - hw && x < cx + hw;
}

const DOOR_IN = [
  (x: number, y: number) => inPointed(x, y, DX[0], HALF, 150, 64),
  (x: number, y: number) => inRound(x, y, DX[1], HALF, 140),
  (x: number, y: number) => inTrap(x, y, DX[2], 110, 34, 42),
];
const PORTAL_IN = [
  (x: number, y: number) => inPointed(x, y, DX[0], HALF + 16, 150, 80),
  (x: number, y: number) => inRound(x, y, DX[1], HALF + 16, 140),
  (x: number, y: number) => inTrap(x, y, DX[2], 92, 52, 58) || (y >= 78 && y < 106 && Math.abs(x + 0.5 - DX[2]) < 66),
];

// ---------------------------------------------------------------------------
// the hall
// ---------------------------------------------------------------------------

/** How much candlelight falls on a point of the wall (0..~1.5). */
function candleLight(x: number, y: number): number {
  let k = 0;
  for (const c of CANDLES) {
    const d = Math.hypot((x - c.x) / 70, (y - c.y) / 54);
    if (d < 1) k += (1 - d) * (1 - d) * (c.tone === 'pale' ? 0.5 : 0.75);
  }
  return k;
}

function lit(c: RGBA, k: number, warm = WARM): RGBA {
  return mix(c, warm, clamp(k * 0.16, 0, 0.3));
}

/** Ashlar: blocks of `bw` x `bh`, every other course offset, mortar darker, each block its own tone. */
function ashlar(x: number, y: number, bw: number, bh: number, seed: number): { mortar: boolean; tone: number; edge: number } {
  const row = Math.floor(y / bh);
  const off = row % 2 ? bw / 2 : 0;
  const col = Math.floor((x + off) / bw);
  const lx = (x + off) - col * bw, ly = y - row * bh;
  const mortar = lx < 1 || ly < 1;
  return { mortar, tone: hash2(col, row, seed) - 0.5, edge: ly === 1 ? 1 : lx === 1 ? 0.5 : ly === bh - 1 ? -1 : 0 };
}

function wall(b: Bitmap) {
  for (let y = 0; y < FLOOR; y++) {
    for (let x = 0; x < W; x++) {
      // dark overhead, warmer and lighter toward the floor
      const base = 1 + clamp((y - 40) / (FLOOR - 40)) * 4.2;
      const a = ashlar(x, y, 30, 14, 71);
      const light = candleLight(x, y);
      let v = base + a.tone * 1.2 + light * 2.6 + a.edge * 0.8 + (hash2(x, y, 7) - 0.5) * 0.6;
      if (a.mortar) v -= 1.6;
      b.set(x, y, lit(rampDither(STONE, v, x, y), light));
    }
  }
  vault(b);
}

/** The ribs of the vault: pointed arches from pillar to pillar, fading up into the dark. */
function vault(b: Bitmap) {
  for (let i = 0; i < PILLARS.length - 1; i++) {
    const x0 = PILLARS[i], x1 = PILLARS[i + 1], cx = (x0 + x1) / 2, half = (x1 - x0) / 2;
    const r = half * 1.25, spring = 104;
    for (let y = 0; y < spring; y++) {
      for (let x = x0; x < x1; x++) {
        const dl = Math.hypot(x + 0.5 - (cx + (r - half)), y + 0.5 - spring), dr = Math.hypot(x + 0.5 - (cx - (r - half)), y + 0.5 - spring);
        const onL = x < cx && Math.abs(dl - r) < 2.2, onR = x >= cx && Math.abs(dr - r) < 2.2;
        if (!onL && !onR) continue;
        const d = onL ? dl - r : dr - r;
        const v = 2.2 + clamp((y - 10) / 90) * 2.6 + (d < -0.8 ? 1 : d > 0.8 ? -0.6 : 0.4);
        b.set(x, y, lit(rampDither(STONE, v, x, y), candleLight(x, y)));
      }
    }
  }
}

function pillars(b: Bitmap) {
  for (const px of PILLARS) {
    const hw = 13;
    for (let y = 96; y < FLOOR; y++) {
      for (let x = px - hw; x < px + hw; x++) {
        const u = (x + 0.5 - px) / hw; // -1..1 across the shaft
        const round = Math.cos(u * 1.4);
        const flute = Math.abs(((x - px + 64) % 6) - 3) < 1 ? -0.7 : 0;
        const light = candleLight(x, y);
        const v = 1.6 + clamp((y - 60) / 240) * 3.4 + round * 1.6 - (u > 0.4 ? (u - 0.4) * 3 : 0) + flute + light * 2.2;
        b.set(x, y, lit(rampDither(STONE, v, x, y), light));
      }
    }
    // the capital and the base: wider blocks
    for (const [y0, y1, w] of [[90, 98, 18], [98, 102, 15], [FLOOR - 12, FLOOR, 18], [FLOOR - 16, FLOOR - 12, 15]] as const) {
      for (let y = y0; y < y1; y++) {
        for (let x = px - w; x < px + w; x++) {
          const light = candleLight(x, y);
          const v = 2.4 + clamp((y - 60) / 240) * 3 + (y === y0 ? 1.4 : y === y1 - 1 ? -1 : 0) + (x > px + w - 4 ? -1 : 0) + light * 2;
          b.set(x, y, lit(rampDither(STONE, v, x, y), light));
        }
      }
    }
    // the sconce: an iron bracket under three candles
    for (let x = px - 11; x <= px + 11; x++) {
      b.set(x, 183, IRON[3]);
      b.set(x, 184, IRON[1]);
    }
    line(b, px - 10, 184, px - 3, 192, IRON[2]);
    line(b, px + 10, 184, px + 3, 192, IRON[2]);
    for (const dx of [-8, 0, 8]) {
      b.set(px + dx - 2, 182, IRON[4]);
      b.set(px + dx + 2, 182, IRON[4]);
    }
  }
}

// ---------------------------------------------------------------------------
// the first door: demonic
// ---------------------------------------------------------------------------

function portalDemon(b: Bitmap) {
  const cx = DX[0];
  for (let y = 60; y < FLOOR; y++) {
    for (let x = cx - 60; x < cx + 60; x++) {
      if (!PORTAL_IN[0](x, y) || DOOR_IN[0](x, y)) continue;
      const a = ashlar(x, y - 2, 18, 12, 113);
      const light = candleLight(x, y);
      // the inner edge lit red from the door's seams, the outer edge lit by the candles
      const inner = DOOR_IN[0](x - 3, y) || DOOR_IN[0](x + 3, y) || DOOR_IN[0](x, y + 3);
      let v = 2.4 + a.tone * 1.6 + a.edge * 1.2 + light * 1.8 + (x > cx ? -0.4 : 0.4);
      if (a.mortar) v -= 1.8;
      let c = rampDither(BASALT, v, x, y);
      if (inner) c = mix(c, EMBER[1], 0.45);
      b.set(x, y, c);
    }
  }
  // its outer edge picked out, so the portal stands off the wall
  for (let y = 60; y < FLOOR; y++) {
    for (let x = cx - 60; x < cx + 60; x++) {
      if (!PORTAL_IN[0](x, y) || DOOR_IN[0](x, y)) continue;
      if (!PORTAL_IN[0](x - 1, y) || !PORTAL_IN[0](x, y - 1)) b.set(x, y, BASALT[6]);
      else if (!PORTAL_IN[0](x + 1, y)) b.set(x, y, BASALT[0]);
    }
  }
  // the red veins: cracks wandering through the basalt, fire showing in them
  const rnd = (k: number) => hash2(k, 7, 211);
  for (let k = 0; k < 14; k++) {
    let x = cx - 56 + rnd(k) * 112, y = 90 + rnd(k + 50) * 200;
    let ang = rnd(k + 100) * Math.PI * 2;
    for (let st = 0; st < 26 + rnd(k + 150) * 30; st++) {
      ang += (hash2(k, st, 213) - 0.5) * 1.1;
      x += Math.cos(ang);
      y += Math.sin(ang);
      const X = Math.round(x), Y = Math.round(y);
      if (!PORTAL_IN[0](X, Y) || DOOR_IN[0](X, Y)) continue;
      b.set(X, Y, EMBER[st % 7 === 0 ? 4 : 3]);
      for (const [dx, dy] of [[1, 0], [0, 1]]) if (PORTAL_IN[0](X + dx, Y + dy) && !DOOR_IN[0](X + dx, Y + dy) && hash2(X, Y, 215) > 0.5) b.set(X + dx, Y + dy, EMBER[1]);
    }
  }
  // iron thorns along the arch's back
  for (let k = -5; k <= 5; k++) {
    const ang = (-90 + k * 15) * (Math.PI / 180);
    const ox = cx + Math.cos(ang) * 0, oy = 150;
    // a point on the portal's outer curve: walk up from the spring line along the angle until outside
    let px = ox, py = oy;
    for (let s = 0; s < 120; s++) {
      const tx = cx + Math.cos(ang) * s, ty = oy + Math.sin(ang) * s;
      if (!PORTAL_IN[0](Math.round(tx), Math.round(ty))) break;
      px = tx;
      py = ty;
    }
    const len = 11 - Math.abs(k) * 0.6;
    const tipx = px + Math.cos(ang) * len, tipy = py + Math.sin(ang) * len;
    polyFill(b, [[px - Math.sin(ang) * 2.6, py + Math.cos(ang) * 2.6], [px + Math.sin(ang) * 2.6, py - Math.cos(ang) * 2.6], [tipx, tipy]], (x) => IRON[x < tipx ? 4 : 2]);
  }
  goatSkull(b, cx, 70);
}

/** The skull of a great horned goat over the keystone, its horns swept back and up, red light in its sockets. */
function goatSkull(b: Bitmap, cx: number, cy: number) {
  // the horns: thick ridged bands sweeping out and up, drawn first
  for (const s of [-1, 1]) {
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      const x = cx + s * (6 + t * 30 + Math.sin(t * 2.6) * 6), y = cy - 2 - t * 8 + Math.sin(t * 3.4) * -10 + t * t * -10;
      const r = 4.2 * (1 - t * 0.8) + 0.6;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const ridge = (k % 4 === 0) ? -1.2 : 0;
          const v = 2.6 + (dy < 0 ? 1 : -0.6) + ridge + (1 - t) * 0.4;
          b.set(Math.round(x + dx), Math.round(y + dy), rampDither(BONE, v, Math.round(x + dx), Math.round(y + dy)));
        }
      }
    }
  }
  // the skull: a long face narrowing to the muzzle
  polyFill(b, [[cx - 10, cy - 6], [cx + 10, cy - 6], [cx + 9, cy + 4], [cx + 5, cy + 16], [cx + 3, cy + 22], [cx - 3, cy + 22], [cx - 5, cy + 16], [cx - 9, cy + 4]], (x, y) => rampDither(BONE, 3.2 - (y - cy) * 0.06 + (x > cx ? -0.6 : 0.3), x, y));
  // the sockets with red light in them, the nose, the brow
  for (const s of [-1, 1]) {
    ellipseFill(b, cx + s * 5, cy + 2, 3.2, 2.6, BONE[0]);
    b.set(cx + s * 5, cy + 2, EMBER[4]);
    b.set(cx + s * 5 + (s > 0 ? -1 : 1), cy + 2, EMBER[3]);
  }
  for (let y = cy + 12; y < cy + 18; y++) {
    b.set(cx - 1, y, BONE[0]);
    b.set(cx + 1, y, BONE[0]);
  }
  for (let x = cx - 9; x <= cx + 9; x++) b.set(x, cy - 6, BONE[4]);
}

/** The first door's leaves, closed: iron plates riveted, spikes, a reversed pentagram in a circle across both, red seams. */
function leavesDemon(): Bitmap {
  const cx = DX[0];
  const b = new Bitmap(W, HT);
  for (let y = 80; y < FLOOR; y++) {
    for (let x = cx - HALF; x < cx + HALF; x++) {
      if (!DOOR_IN[0](x, y)) continue;
      const lx = x - (cx - HALF);
      const side = x < cx ? -1 : 1;
      // plates of riveted iron, 4 bands tall, each lit from above and dark at its foot
      const band = Math.floor((y - 90) / 50);
      const ly = (y - 90) - band * 50;
      const seam = ly === 0 || Math.abs(x + 0.5 - cx) < 1;
      const light = candleLight(x, y);
      let v = 2.2 - ly * 0.02 + (side < 0 ? 0.3 : -0.2) + (hash2(x >> 2, y >> 3, 31) - 0.5) * 0.35 + light * 0.9 - (lx < 2 || lx > 2 * HALF - 3 ? 0.8 : 0);
      if (ly === 1) v += 1.4;
      if (ly === 49) v -= 1;
      if (seam) v = 0.2;
      let c = rampDither(IRON.slice(0, 5), v, x, y);
      // rivets along each band
      if ((ly === 4 || ly === 45) && (lx % 8 === 4)) c = IRON[4];
      if ((ly === 5 || ly === 46) && (lx % 8 === 4)) c = IRON[0];
      // red heat in the seam between the leaves and along the bottom
      if (Math.abs(x + 0.5 - cx) < 1 && y > 120) c = EMBER[y % 9 === 0 ? 3 : 2];
      b.set(x, y, mix(c, hex('#3a0a0a'), 0.18));
    }
  }
  // the reversed pentagram in its circle, its lines glowing red
  const pc = [cx, 150], pr = 25;
  for (let a = 0; a < 360; a += 0.6) {
    const r = (a * Math.PI) / 180;
    for (const rr of [pr, pr - 3]) b.set(Math.round(pc[0] + Math.cos(r) * rr), Math.round(pc[1] + Math.sin(r) * rr), EMBER[rr === pr ? 2 : 3]);
  }
  const pts: [number, number][] = [];
  for (let k = 0; k < 5; k++) {
    // a point down: the reversed star
    const r = ((90 + k * 72) * Math.PI) / 180;
    pts.push([pc[0] + Math.cos(r) * (pr - 3), pc[1] + Math.sin(r) * (pr - 3)]);
  }
  for (let k = 0; k < 5; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[(k + 2) % 5];
    line(b, x0, y0, x1, y1, EMBER[3]);
  }
  // the ring knockers, iron rings hanging from two bosses
  for (const s of [-1, 1]) {
    const kx = cx + s * 14, ky = 222;
    ellipseFill(b, kx, ky - 6, 2.4, 2.4, IRON[4]);
    for (let a = 0; a < 360; a += 4) {
      const r = (a * Math.PI) / 180;
      b.set(Math.round(kx + Math.cos(r) * 5), Math.round(ky + Math.sin(r) * 6), a > 200 && a < 340 ? IRON[2] : IRON[4]);
    }
  }
  // a row of spikes across the lowest band
  for (let x = cx - HALF + 5; x < cx + HALF - 3; x += 9) {
    polyFill(b, [[x - 2, 268], [x + 2, 268], [x, 262]], (px) => IRON[px <= x ? 4 : 2]);
  }
  return b;
}

/** Beyond the first door: dark steps going down into a red glow. */
function beyondDemon(): Bitmap {
  const cx = DX[0];
  const b = new Bitmap(W, HT);
  for (let y = 80; y < FLOOR; y++) {
    for (let x = cx - HALF; x < cx + HALF; x++) {
      if (!DOOR_IN[0](x, y)) continue;
      const deep = clamp((y - 150) / 146);
      const glow = clamp(1 - Math.hypot((x - cx) / 40, (y - 300) / 90));
      let c = mix(hex('#050306'), EMBER[1], glow * 0.9);
      // steps: dark lines growing closer together toward the glow
      const step = (y - 150) > 0 && ((Math.floor(Math.sqrt(Math.max(0, y - 150)) * 3) % 2) === 0);
      if (step && deep > 0.05) c = mix(c, hex('#000000'), 0.45);
      if (glow > 0.6 && hash2(x, y, 41) > 0.985) c = EMBER[4];
      b.set(x, y, c);
    }
  }
  return b;
}

/** The first door at `open` (0 shut .. 1 open): beyond it, then each leaf narrowed toward its hinge, darker as it turns away. */
function doorDemon(leaves: Bitmap, beyond: Bitmap, open: number): Bitmap {
  const cx = DX[0];
  const out = beyond.clone();
  const shrink = 1 - open * 0.84;
  for (const s of [-1, 1]) {
    const hinge = cx + s * HALF;
    const lw = HALF * shrink;
    for (let i = 0; i < Math.ceil(lw); i++) {
      // column i of the narrowed leaf, from its hinge inward
      const x = s < 0 ? hinge + i : hinge - 1 - i;
      const u = i / lw;
      const sx = s < 0 ? Math.floor(hinge + u * HALF) : Math.ceil(hinge - 1 - u * HALF);
      for (let y = 80; y < FLOOR; y++) {
        const c = leaves.get(sx, y);
        if (!A(c) || !DOOR_IN[0](x, y)) continue;
        out.set(x, y, mix(c, hex('#000000'), open * 0.5 + (i > lw - 2 ? 0.2 : 0)));
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// the second door: celestial and arcane
// ---------------------------------------------------------------------------

function portalCelestial(b: Bitmap) {
  const cx = DX[1];
  for (let y = 60; y < FLOOR; y++) {
    for (let x = cx - 60; x < cx + 60; x++) {
      if (!PORTAL_IN[1](x, y) || DOOR_IN[1](x, y)) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - 140);
      const inArch = y < 140;
      // gold trim on the inner edge of the arch and the jambs, marble voussoirs
      const edge = inArch ? d - HALF : Math.abs(x + 0.5 - cx) - HALF;
      const light = candleLight(x, y);
      if (edge < 2.5) {
        b.set(x, y, rampDither(GOLD, 3 + (y < 140 ? 0.6 : 0) - (x > cx ? 0.8 : 0) + light, x, y));
        continue;
      }
      if (edge > 14) {
        b.set(x, y, rampDither(GOLD, 2.6 - (x > cx ? 0.6 : 0), x, y));
        continue;
      }
      const vous = inArch && Math.abs(((Math.atan2(y + 0.5 - 140, x + 0.5 - cx) * 180) / Math.PI + 720) % 15) < 0.9;
      const course = !inArch && (y % 16 === 0);
      let v = 6 + (x > cx ? -1.2 : 0.4) + light * 1.4 - (vous || course ? 2 : 0) + (hash2(x >> 1, y >> 1, 3) - 0.5) * 0.8;
      v -= clamp((140 - y) / 80) * 1.2;
      b.set(x, y, rampDither(MARBLE, v, x, y));
    }
  }
  wingedSun(b, cx, 82);
}

/** A golden sun with wings spread over the keystone. */
function wingedSun(b: Bitmap, cx: number, cy: number) {
  for (const s of [-1, 1]) {
    for (let f = 0; f < 6; f++) {
      // feathers: tapering bands fanning out
      const len = 30 - f * 3.2, y0 = cy - 2 + f * 2.6;
      for (let t = 0; t <= len; t++) {
        const x = cx + s * (8 + t), y = y0 - Math.sin((t / len) * 1.2) * (8 - f) ;
        const w = 2.2 * (1 - t / len) + 0.6;
        for (let dy = -w; dy <= w; dy++) b.set(Math.round(x), Math.round(y + dy), GOLD[clamp(Math.round(3 + (dy < 0 ? 1 : -1) - f * 0.25), 0, 5)]);
      }
    }
  }
  ellipseFill(b, cx, cy, 8, 8, (x, y) => rampDither(GOLD, 4.4 - Math.hypot(x - cx + 2, y - cy + 2) * 0.35, x, y));
  for (let k = 0; k < 12; k++) {
    const r = (k * 30 * Math.PI) / 180;
    b.set(Math.round(cx + Math.cos(r) * 10), Math.round(cy + Math.sin(r) * 10), GOLD[5]);
  }
}

/** The second door's leaves: the night sky in gold stars and constellations, an arcane circle across both, a crescent moon. Returns its stars for twinkling. */
function leavesCelestial(b: Bitmap): [number, number][] {
  const cx = DX[1];
  const stars: [number, number][] = [];
  for (let y = 90; y < FLOOR; y++) {
    for (let x = cx - HALF; x < cx + HALF; x++) {
      if (!DOOR_IN[1](x, y)) continue;
      const light = candleLight(x, y);
      let v = 1.4 + clamp((y - 100) / 200) * 2.4 + light * 0.8 + (x < cx ? 0.3 : -0.2);
      const c = rampDither(NIGHT, v, x, y);
      b.set(x, y, Math.abs(x + 0.5 - cx) < 1 ? GOLD[2] : c);
      if (hash2(x, y, 77) > 0.988) b.set(x, y, hash2(x, y, 78) > 0.5 ? GOLD[4] : hex('#cfd8ff'));
      v = 0;
    }
  }
  // constellations: gold stars joined by faint lines
  const groups: [number, number][][] = [
    [[DX[1] - 30, 120], [DX[1] - 20, 112], [DX[1] - 10, 118], [DX[1] - 4, 108]],
    [[DX[1] + 8, 228], [DX[1] + 20, 236], [DX[1] + 30, 226], [DX[1] + 26, 250], [DX[1] + 14, 256]],
    [[DX[1] - 32, 238], [DX[1] - 24, 252], [DX[1] - 12, 246]],
  ];
  for (const g of groups) {
    for (let i = 0; i + 1 < g.length; i++) {
      const [x0, y0] = g[i], [x1, y1] = g[i + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 1; k < n; k++) if (k % 2) b.set(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), NIGHT[5]);
    }
    for (const [x, y] of g) {
      b.set(x, y, GOLD[5]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, GOLD[3]);
      stars.push([x, y]);
    }
  }
  // the arcane circle: two rings, ticks, a six-pointed star, glyph dots between the rings
  const ac = [cx, 178], R = 30;
  for (let a = 0; a < 360; a += 0.5) {
    const r = (a * Math.PI) / 180;
    for (const [rr, col] of [[R, ARCANE[3]], [R - 5, ARCANE[2]], [R - 15, CYAN[2]]] as const) b.set(Math.round(ac[0] + Math.cos(r) * rr), Math.round(ac[1] + Math.sin(r) * rr), col);
  }
  for (let k = 0; k < 24; k++) {
    const r = (k * 15 * Math.PI) / 180;
    const x0 = ac[0] + Math.cos(r) * (R - 4), y0 = ac[1] + Math.sin(r) * (R - 4);
    b.set(Math.round(x0), Math.round(y0), k % 3 ? ARCANE[4] : ARCANE[5]);
    if (k % 2 === 0) b.set(Math.round(ac[0] + Math.cos(r + 0.13) * (R - 2.5)), Math.round(ac[1] + Math.sin(r + 0.13) * (R - 2.5)), ARCANE[3]);
  }
  for (const rot of [-90, -30]) {
    const tri: [number, number][] = [0, 1, 2].map((k) => {
      const r = ((rot + k * 120) * Math.PI) / 180;
      return [ac[0] + Math.cos(r) * (R - 6), ac[1] + Math.sin(r) * (R - 6)];
    });
    for (let k = 0; k < 3; k++) line(b, tri[k][0], tri[k][1], tri[(k + 1) % 3][0], tri[(k + 1) % 3][1], ARCANE[4]);
  }
  ellipseFill(b, ac[0], ac[1], 3, 3, CYAN[3]);
  // the crescent moon over it, in silver-gold
  const mc = [cx, 120];
  for (let y = mc[1] - 9; y <= mc[1] + 9; y++) {
    for (let x = mc[0] - 9; x <= mc[0] + 9; x++) {
      const a = Math.hypot(x + 0.5 - mc[0], y + 0.5 - mc[1]), c2 = Math.hypot(x + 0.5 - mc[0] - 4, y + 0.5 - mc[1] + 2);
      if (a <= 8 && c2 > 7) b.set(x, y, a > 7 ? GOLD[3] : GOLD[5]);
    }
  }
  return stars;
}

// ---------------------------------------------------------------------------
// the third door: runes
// ---------------------------------------------------------------------------

/** Runes as strokes on a 6 x 10 grid. */
const RUNE_SHAPES: number[][][] = [
  [[0, 0, 0, 10], [0, 3, 5, 0], [0, 6, 5, 3]],
  [[0, 0, 0, 10], [0, 3, 4, 5], [4, 5, 0, 7]],
  [[0, 0, 0, 10], [0, 0, 4, 2], [0, 4, 4, 6]],
  [[0, 0, 0, 10], [0, 0, 4, 2], [4, 2, 0, 5], [0, 5, 5, 10]],
  [[5, 0, 0, 5], [0, 5, 5, 10]],
  [[0, 0, 6, 10], [6, 0, 0, 10]],
  [[0, 0, 0, 10], [6, 0, 6, 10], [0, 3, 6, 7]],
  [[3, 0, 3, 10], [0, 3, 6, 7]],
  [[3, 0, 3, 10], [3, 4, 0, 0], [3, 4, 6, 0]],
  [[5, 0, 0, 4], [0, 4, 5, 6], [5, 6, 0, 10]],
  [[3, 0, 3, 10], [3, 0, 0, 3], [3, 0, 6, 3]],
  [[3, 0, 0, 3], [0, 3, 5, 8], [3, 0, 6, 3], [6, 3, 1, 8], [1, 8, 0, 10], [5, 8, 6, 10]],
  [[0, 0, 0, 10], [6, 0, 6, 10], [0, 0, 6, 10], [6, 0, 0, 10]],
  [[3, 0, 6, 5], [6, 5, 3, 10], [3, 10, 0, 5], [0, 5, 3, 0]],
  [[0, 0, 0, 10], [0, 0, 5, 3], [5, 3, 0, 6]],
  [[0, 10, 3, 0], [3, 0, 6, 10], [1, 6, 5, 6]],
];

/** A rune carved at (x, y), scaled by `s`: its groove dark, a lit lip under it; returns its pixels for the runtime to light. */
function carveRune(b: Bitmap, x: number, y: number, s: number, shape: number[][], groove: RGBA, lip: RGBA): [number, number][] {
  const px = new Map<string, [number, number]>();
  for (const [x0, y0, x1, y1] of shape) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * s) + 1;
    for (let k = 0; k <= n; k++) {
      const X = Math.round(x + (x0 + ((x1 - x0) * k) / n) * s), Y = Math.round(y + (y0 + ((y1 - y0) * k) / n) * s);
      px.set(`${X},${Y}`, [X, Y]);
    }
  }
  for (const [X, Y] of px.values()) if (!px.has(`${X + 1},${Y + 1}`)) b.set(X + 1, Y + 1, lip);
  for (const [X, Y] of px.values()) b.set(X, Y, groove);
  return [...px.values()];
}

function portalRunic(b: Bitmap, runes: [number, number][][]) {
  const cx = DX[2];
  for (let y = 70; y < FLOOR; y++) {
    for (let x = cx - 66; x < cx + 66; x++) {
      if (!PORTAL_IN[2](x, y) || DOOR_IN[2](x, y)) continue;
      const lintel = y < 110;
      const light = candleLight(x, y);
      const n = (hash2(x >> 2, y >> 2, 13) - 0.5) * 1.6 + (hash2(x, y, 14) - 0.5) * 0.8;
      let v = 3 + n + light * 1.8 + (x > cx ? -0.6 : 0.4) + (lintel ? (y < 96 ? 0.8 : -0.4) : 0);
      // the lintel's underside and the stones' inner faces in shadow
      if (lintel && y > 102) v -= 1.8;
      if (!lintel && Math.abs(x + 0.5 - cx) > 52 - (y - 106) * 0.0) v -= 0.6;
      const moss = (y < 84 && hash2(x >> 1, y >> 1, 15) > 0.5) || (y > FLOOR - 14 && hash2(x >> 1, y >> 1, 16) > 0.7) || (hash2(x >> 3, y >> 3, 18) > 0.93 && hash2(x >> 1, y >> 1, 16) > 0.4);
      b.set(x, y, moss ? MOSS[Math.floor(hash2(x, y, 17) * 4)] : rampDither(MEGA, v, x, y));
    }
  }
  // runes on the lintel and down the standing stones
  RUNE_SHAPES.slice(0, 7).forEach((shape, i) => runes.push(carveRune(b, cx - 44 + i * 13, 88, 1, shape, MEGA[0], MEGA[6])));
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) runes.push(carveRune(b, cx + s * 50 - 3, 128 + k * 40, 1, RUNE_SHAPES[(k * 5 + (s > 0 ? 3 : 0)) % RUNE_SHAPES.length], MEGA[0], MEGA[6]));
  }
}

/** The slab: dark stone in panels, a rune carved in each. */
function slabRunic(b: Bitmap, runes: [number, number][][]) {
  const cx = DX[2];
  for (let y = 110; y < FLOOR; y++) {
    for (let x = cx - 44; x < cx + 44; x++) {
      if (!DOOR_IN[2](x, y)) continue;
      const light = candleLight(x, y);
      const panelY = (y - 116) % 30, panelX = Math.abs(x + 0.5 - cx);
      const frame = panelY === 0 || panelY === 29 || Math.abs(panelX - 12) < 0.6;
      const v = 2.4 + (hash2(x >> 2, y >> 2, 19) - 0.5) * 1.2 + light * 1.2 - (frame ? 1.4 : 0) + (x < cx ? 0.3 : -0.3);
      b.set(x, y, rampDither(SLATE, v, x, y));
    }
  }
  let k = 0;
  for (let row = 0; row < 6; row++) {
    for (const col of [-1, 0, 1]) {
      const x = cx + col * 24 - 4, y = 122 + row * 30;
      runes.push(carveRune(b, x, y, 1.5, RUNE_SHAPES[(k * 7 + 3) % RUNE_SHAPES.length], SLATE[0], SLATE[5]));
      k++;
    }
  }
}

// ---------------------------------------------------------------------------
// the floor, the candles
// ---------------------------------------------------------------------------

/** The polished floor: flags in perspective, mirroring the hall above it, darker toward the front. */
function floor(b: Bitmap) {
  const vx = 320, vy = 150;
  const rows = [FLOOR, 301, 308, 317, 329, 344, 360];
  for (let y = FLOOR; y < HT; y++) {
    for (let x = 0; x < W; x++) {
      const near = (y - FLOOR) / (HT - FLOOR);
      // the joints: lines toward the vanishing point, and courses across
      const t = (y - vy) / (FLOOR - vy);
      const gx = vx + (x - vx) / t;
      const joint = Math.abs(((gx + 4000) % 48) - 24) > 23.2 - near * 0.4 || rows.includes(y);
      const light = candleLight(x, y - 10) * 0.8;
      let c = rampDither(FLOORC, 2.6 - near * 1.4 + light * 1.4 + (hash2(Math.floor(gx / 48), rows.findIndex((r) => r > y), 23) - 0.5) * 0.9, x, y);
      if (joint) c = mix(c, hex('#000000'), 0.45);
      // the reflection of the wall above, faint and fading
      const ry = 2 * FLOOR - y - 1;
      const m = b.get(x, ry);
      const k = 0.32 * (1 - near) ** 1.4;
      b.set(x, y, mix(c, m, k));
    }
  }
}

/** A candle's body: wax with a lit side, drips down from its rim, a pool at its foot; the flame is the runtime's. */
function candle(b: Bitmap, c: Candle) {
  const ramp = c.tone === 'red' ? WAX.black : c.tone === 'pale' ? WAX.white : WAX.ivory;
  const x0 = Math.round(c.x - c.w / 2), top = c.y + 1, foot = c.y + c.h;
  for (let y = top; y <= foot; y++) {
    for (let x = x0; x < x0 + c.w; x++) {
      const u = (x - x0) / Math.max(1, c.w - 1);
      const v = 3.4 - u * 2.2 + (y === top ? 0.8 : 0);
      b.set(x, y, rampDither(ramp, v, x, y));
    }
  }
  // drips down the side
  for (let k = 0; k < 2; k++) {
    const dx = x0 + Math.floor(hash2(c.x, k, 5) * c.w);
    const len = 2 + Math.floor(hash2(c.x, k, 6) * Math.min(6, c.h / 2));
    for (let y = top; y < top + len; y++) b.set(dx, y, ramp[4]);
  }
  // the pool of wax at the foot, wider than the candle
  for (let x = x0 - 1; x < x0 + c.w + 1; x++) b.set(x, foot, ramp[2]);
  b.set(x0 - 2, foot, ramp[1]);
  b.set(x0 + c.w + 1, foot, ramp[1]);
  // the wick
  b.set(Math.round(c.x), c.y, hex('#120c0a'));
}

// ---------------------------------------------------------------------------
// sprites
// ---------------------------------------------------------------------------

/** The LOCKED stripe: a broad band of dark crimson between iron edges, an iron plate and a big nail at each end. The word is the runtime's. */
function stripe(): Bitmap {
  const b = new Bitmap(STRIPE_W, STRIPE_H);
  const BAND = H(['#1c0508', '#2e080c', '#430c12', '#5a1218', '#721a1e']);
  for (let y = 0; y < STRIPE_H; y++) {
    for (let x = 0; x < STRIPE_W; x++) {
      const edge = y < 3 || y >= STRIPE_H - 3;
      if (edge) {
        b.set(x, y, IRON[y === 0 ? 4 : y === STRIPE_H - 1 ? 0 : y < 3 ? 3 : 1]);
        continue;
      }
      const v = 2.6 - (y - 3) * 0.1 + (hash2(x >> 1, y, 51) - 0.5) * 0.9 + (hash2(x, y, 52) > 0.97 ? 1.2 : 0);
      b.set(x, y, rampDither(BAND, v, x, y));
    }
  }
  for (const x0 of [0, STRIPE_W - 12]) {
    for (let y = 1; y < STRIPE_H - 1; y++) for (let x = x0; x < x0 + 12; x++) b.set(x, y, IRON[x === x0 || x === x0 + 11 ? 1 : y < 4 ? 4 : 2 + (hash2(x, y, 53) > 0.8 ? 1 : 0)]);
    ellipseFill(b, x0 + 6, STRIPE_H / 2, 3.2, 3.2, (x, y) => IRON[x + y < x0 + 6 + STRIPE_H / 2 ? 5 : 3]);
    b.set(x0 + 6, STRIPE_H / 2, IRON[1]);
  }
  return b;
}

/** A mote of dust thrown up where the stripe lands. */
function dust(): Bitmap {
  const b = new Bitmap(3, 3);
  b.set(1, 1, hex('#8a7c70'));
  b.set(0, 1, hex('#5a5048'));
  b.set(2, 1, hex('#5a5048'));
  return b;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

export interface ExtraJson {
  /** each door: its id, its click box, its centre and the foot of its opening, where its stripe hangs */
  doors: { id: string; box: Rect4; cx: number; stripe: { pivot: [number, number]; angle: number } }[];
  stripe: { rect: Rect4; w: number; h: number; nail: [number, number] };
  /** the first door's frames as it opens, each over the box `at` */
  opening: { frames: Rect4[]; at: [number, number] };
  dust: Rect4;
  candles: { x: number; y: number; tone: CandleTone; small: boolean }[];
  runes: [number, number][][];
  stars: [number, number][];
  lights: { x: number; y: number; rx: number; ry: number; rgb: [number, number, number]; k: number; rate: number; door?: number }[];
  floor: number;
}

export function buildExtra(out: string) {
  const dir = path.join(out, 'extra');
  const hall = new Bitmap(W, HT);
  wall(hall);
  pillars(hall);
  portalDemon(hall);
  const leaves = leavesDemon();
  hall.blit(leaves, 0, 0);
  portalCelestial(hall);
  const stars = leavesCelestial(hall);
  const runes: [number, number][][] = [];
  portalRunic(hall, runes);
  slabRunic(hall, runes);
  floor(hall);
  for (const c of CANDLES) candle(hall, c);

  // the first door opening: three frames over its opening's box
  const beyond = beyondDemon();
  const box = { x: DX[0] - HALF, y: 80, w: HALF * 2, h: FLOOR - 80 };
  const items = [{ key: 'stripe', bmp: stripe() }, { key: 'dust', bmp: dust() }];
  for (const k of [1, 2, 3]) {
    const full = doorDemon(leaves, beyond, k / 3);
    items.push({ key: `open${k}`, bmp: full.crop(box) });
  }
  const { atlas, frames } = packShelves(items, 512);
  const r = (k: string): Rect4 => {
    const f = frames.find((p) => p.key === k)!;
    return [f.x, f.y, f.w, f.h];
  };
  const json: ExtraJson = {
    doors: [
      { id: 'demonic', box: [DX[0] - 56, 60, 112, FLOOR - 60], cx: DX[0], stripe: { pivot: STRIPES[0].pivot, angle: STRIPES[0].angle } },
      { id: 'celestial', box: [DX[1] - 56, 70, 112, FLOOR - 70], cx: DX[1], stripe: { pivot: STRIPES[1].pivot, angle: STRIPES[1].angle } },
      { id: 'runic', box: [DX[2] - 58, 80, 116, FLOOR - 80], cx: DX[2], stripe: { pivot: STRIPES[2].pivot, angle: STRIPES[2].angle } },
    ],
    stripe: { rect: r('stripe'), w: STRIPE_W, h: STRIPE_H, nail: [STRIPE_W - 6, STRIPE_H / 2] },
    opening: { frames: [r('open1'), r('open2'), r('open3')], at: [box.x, box.y] },
    dust: r('dust'),
    candles: CANDLES.map((c) => ({ x: c.x, y: c.y, tone: c.tone, small: c.h < 12 })),
    runes,
    stars,
    lights: [
      // red light leaking under the first door, its pentagram's glow
      { x: DX[0], y: FLOOR + 1, rx: 46, ry: 8, rgb: [255, 60, 30], k: 0.5, rate: 0.7, door: 0 },
      { x: DX[0], y: 150, rx: 30, ry: 30, rgb: [255, 50, 30], k: 0.22, rate: 0.5, door: 0 },
      { x: DX[0], y: 72, rx: 10, ry: 6, rgb: [255, 70, 30], k: 0.4, rate: 1.1 },
      // the arcane circle and the moon
      { x: DX[1], y: 178, rx: 34, ry: 34, rgb: [150, 140, 255], k: 0.3, rate: 0.4 },
      { x: DX[1], y: 82, rx: 22, ry: 14, rgb: [255, 220, 140], k: 0.3, rate: 0.3 },
      { x: DX[1], y: FLOOR + 1, rx: 42, ry: 6, rgb: [170, 180, 255], k: 0.3, rate: 0.5 },
    ],
    floor: FLOOR,
  };
  hall.save(path.join(dir, 'hall.png'));
  atlas.save(path.join(dir, 'extra.png'));
  writeJson(path.join(dir, 'extra.json'), json);
  // the preview: the hall as it stands shut, the stripes on it
  const preview = hall.clone();
  const st = stripe();
  for (const s of STRIPES.slice(1)) preview.blit(st, s.pivot[0] - (STRIPE_W - 6), s.pivot[1] - STRIPE_H / 2);
  preview.save(path.join('docs', 'images', 'extra_hall.png'));
  console.log(`  extra: hall ${W}x${HT}, ${CANDLES.length} candles, ${runes.length} runes, ${stars.length} stars, atlas ${atlas.w}x${atlas.h}`);
  void dith;
}
