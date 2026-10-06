// TEMPLATE: copy to tools/art/zones/<id>.ts, rename `courtyard`, register it
// in tools/art/zones/index.ts and add a ZoneDef with the same id to
// src/game/data/zones.ts. It is a complete, working zone (a moonlit stone
// courtyard) so it builds as-is; repaint every part for your location.
//
// Zone "<Name>": one paragraph — what the place is, the time of day, where
// the key light comes from (always the upper-left), what can be seen through
// the openings in the back wall.
import { dith, disc, ellipseFill, ellipseRing, line, outline, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, hex, rng, withAlpha } from '../raster.ts';
import { flames, MAP_COLS, MAP_ROWS, Painter, PropPlacement, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));

// --- palette: every color of the zone lives here (dark -> light ramps) -----
const ST = H(['#141220', '#262438', '#3a3850', '#524f6a', '#6c6886', '#8c88a4', '#b0acc4']); // stone 0 (joints) .. 6 (lit edge)
const SKY = H(['#0a0c1e', '#121630', '#1a2244', '#24305a', '#323f70', '#46548a', '#5e6aa0']);
const HILL = H(['#14182c', '#1c223a', '#262e4a']);
const MOON = H(['#a8b0c8', '#d0d6e6', '#f0f4fc']);
const BANNER = H(['#1a0a14', '#3a1426', '#5e1e3a', '#86284e', '#b0365e']);
const GOLD = H(['#5a3410', '#a8701e', '#e8b440', '#fff0a8']);
const IRON = H(['#0f0f14', '#24252e', '#3c3e4a', '#5a5d6b', '#878a98']);
const FIRE = H(['#7a1a10', '#c8361a', '#f2731e', '#ffb84a', '#fff0b0']);
const RUNE = H(['#0c2a3a', '#1a5a78', '#2fa0c8', '#7fe0f4']);

// ---------------------------------------------------------------------------
// Tiles: seamless by construction — joints on the right/bottom edge, bevel
// light on the top/left, so any two tiles meet correctly.
// ---------------------------------------------------------------------------

function slab(b: Bitmap, x0: number, y0: number, w: number, h: number, seed: number) {
  const r = rng(seed);
  const tone = 3.1 + (r() - 0.5) * 0.8;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const X = x0 + x, Y = y0 + y;
      if (x === w - 1 || y === h - 1) {
        b.set(X, Y, ST[1]);
        continue;
      }
      let v = tone + (y === 0 ? 1.1 : x === 0 ? 0.6 : 0) - (y === h - 2 ? 0.9 : x === w - 2 ? 0.5 : 0);
      v += (hash2(X, Y, seed) - 0.5) * 0.5 + 0.3 - ((x / w) * 0.3 + (y / h) * 0.4);
      b.set(X, Y, rampDither(ST, v, X, Y));
    }
  }
}

const floor = (rects: [number, number, number, number][]): Painter => (b, seed) => rects.forEach(([x, y, w, h], i) => slab(b, x, y, w, h, seed * 31 + i * 7));

function bricks(b: Bitmap, seed: number, y0 = 0, y1 = TILE, dark = 0) {
  for (let row = Math.floor(y0 / 8); row * 8 < y1; row++) {
    const off = row % 2 ? 8 : 0;
    for (let bx = -off; bx < TILE; bx += 16) {
      const tone = 3.4 + (rng(seed * 13 + row * 7 + bx)() - 0.5) * 0.7 - dark;
      for (let y = Math.max(y0, row * 8); y < Math.min(y1, row * 8 + 8); y++) {
        for (let x = Math.max(0, bx); x < Math.min(TILE, bx + 16); x++) {
          const lx = x - bx, ly = y - row * 8;
          if (lx === 15 || ly === 7) b.set(x, y, ST[1]);
          else b.set(x, y, rampDither(ST, tone + (ly === 0 ? 1 : 0) - (ly === 6 ? 0.8 : 0) + (hash2(x, y, seed) - 0.5) * 0.5, x, y));
        }
      }
    }
  }
}

const P: Record<string, Painter> = {
  floor_a: floor([[0, 0, 16, 16], [16, 0, 16, 16], [0, 16, 16, 16], [16, 16, 16, 16]]),
  floor_b: floor([[0, 0, 32, 16], [0, 16, 16, 16], [16, 16, 16, 16]]),
  floor_c: floor([[0, 0, 16, 32], [16, 0, 16, 16], [16, 16, 16, 16]]),
  wall: (b, s) => bricks(b, s),
  wall_dark: (b, s) => bricks(b, s, 0, TILE, 0.5),
  wall_top: (b, s) => {
    // crenellated crown: transparent merlons gap so the sky shows
    bricks(b, s, 8, TILE);
    for (let x = 0; x < TILE; x++) {
      const merlon = Math.floor(x / 8) % 2 === 0;
      for (let y = merlon ? 0 : 8; y < 10; y++) b.set(x, y, y === (merlon ? 0 : 8) ? ST[6] : rampDither(ST, 4 - (x % 8) / 8, x, y));
    }
  },
  wall_base: (b, s) => {
    bricks(b, s, 0, TILE, 0.4);
    for (let x = 0; x < TILE; x++) {
      b.set(x, 0, ST[6]);
      b.set(x, 1, ST[4]);
    }
  },
  gate_l: (b, s) => {
    // the opening (x > 12) is transparent: the backdrop shows through
    const tmp = new Bitmap(TILE, TILE);
    bricks(tmp, s);
    for (let y = 0; y < TILE; y++) for (let x = 0; x <= 12; x++) b.set(x, y, x === 12 ? ST[1] : tmp.get(x, y));
  },
  gate_r: (b, s) => {
    const tmp = new Bitmap(TILE, TILE);
    bricks(tmp, s);
    for (let y = 0; y < TILE; y++) for (let x = 19; x < TILE; x++) b.set(x, y, x === 19 ? ST[5] : tmp.get(x, y));
  },
};

// ---------------------------------------------------------------------------
// Backdrop (640x200): sky, the key light in the upper-left, distant land
// ---------------------------------------------------------------------------

const HORIZON = 150;

function backdrop(): Bitmap {
  const b = new Bitmap(640, 200);
  for (let y = 0; y < 200; y++) for (let x = 0; x < 640; x++) b.set(x, y, rampDither(SKY, (y / HORIZON) * (SKY.length - 1), x, y));
  const r = rng(3);
  for (let i = 0; i < 120; i++) b.set(Math.floor(r() * 640), Math.floor(Math.pow(r(), 1.6) * 110), withAlpha(MOON[2], 110 + Math.floor(r() * 140)));
  // the key light: a moon in the upper-left
  disc(b, 100, 44, 22, (x, y, d) => (dith(x, y, (1 - d) * 0.5) ? withAlpha(MOON[1], 60) : 0));
  disc(b, 100, 44, 13, (x, y) => rampDither(MOON, 2.4 - ((x - 90) + (y - 34)) / 14, x, y));
  // two ranges of hills, the near one darker
  for (const [base, amp, col, seed] of [[HORIZON - 14, 18, HILL[2], 5], [HORIZON + 6, 12, HILL[0], 9]] as const) {
    for (let x = 0; x < 640; x++) {
      const top = Math.round(base - amp * (0.5 + 0.5 * Math.sin(x * 0.012 + seed)) - (hash2(x, 0, seed) - 0.5) * 2);
      for (let y = top; y < 200; y++) b.set(x, y, col);
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// Props: each sprite list is one kind; frames animate per its PropKind
// ---------------------------------------------------------------------------

function brazier(): Bitmap {
  const b = new Bitmap(28, 30);
  line(b, 6, 14, 3, 29, IRON[1]);
  line(b, 21, 14, 24, 29, IRON[2]);
  line(b, 14, 16, 14, 28, IRON[2]);
  ellipseFill(b, 14, 12, 11, 6, (x, y) => rampDither(IRON, 3.2 - ((x - 3) / 22) * 2 - (y - 6) / 12, x, y));
  ellipseRing(b, 14, 8, 11, 3, 1.5, (x, y, a) => (a < 0 && a > -2.2 ? IRON[4] : IRON[2]));
  ellipseFill(b, 14, 8, 9, 2, (x, y) => (hash2(x, y, 4) > 0.5 ? FIRE[2] : FIRE[1]));
  return outline(b, IRON[0]);
}

function banner(n = 4): Bitmap[] {
  return Array.from({ length: n }, (_, i) => {
    const b = new Bitmap(22, 50);
    const ph = (i / n) * Math.PI * 2;
    for (let x = 1; x < 21; x++) b.set(x, 1, GOLD[2]);
    for (let y = 2; y < 48; y++) {
      const t = y / 48, off = Math.sin(ph + t * 3) * t * 1.6;
      for (let x = Math.round(3 + off); x <= Math.round(18 + off); x++) if (y < 46 - ((x * 7) % 3)) b.set(x, y, rampDither(BANNER, 3 - ((x - 3 - off) / 15) * 1.5, x, y));
    }
    return outline(b, BANNER[0]);
  });
}

function sigil(bright: boolean): Bitmap {
  const b = new Bitmap(160, 50);
  const k = bright ? 1 : 0;
  ellipseRing(b, 80, 25, 74, 22, 1.4, () => withAlpha(RUNE[2 + k], 160 + k * 60));
  ellipseRing(b, 80, 25, 50, 15, 1.1, () => withAlpha(RUNE[1 + k], 140 + k * 60));
  return b;
}

function pillar(): Bitmap {
  const b = new Bitmap(40, 110);
  const top = (x: number) => 12 + Math.round(5 * Math.sin(x * 0.4));
  polyFill(b, [[6, 110], [6, 10], [34, 10], [34, 110]], (x, y) => (y < top(x) ? 0 : rampDither(ST, 4.2 - (x - 6) / 12 - y / 220 + (hash2(x, y, 5) - 0.5) * 0.4, x, y)));
  return outline(b, ST[0]);
}

// ---------------------------------------------------------------------------
// Layout: rows 0-1 sky, 2-5 the back wall, 6-11 the floor
// ---------------------------------------------------------------------------

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const set = (layer: number[], c: number, r: number, n: string) => (layer[r * MAP_COLS + c] = id(n));
  const r = rng(11);
  const floors = ['floor_a', 'floor_b', 'floor_c'];
  for (let row = 6; row < MAP_ROWS; row++) for (let c = 0; c < MAP_COLS; c++) set(ground, c, row, floors[Math.floor(r() * floors.length)]);
  for (let c = 0; c < MAP_COLS; c++) {
    const gate = c === 9 || c === 10;
    set(wall, c, 2, 'wall_top');
    set(wall, c, 3, gate ? (c === 9 ? 'gate_l' : 'gate_r') : 'wall');
    set(wall, c, 4, gate ? (c === 9 ? 'gate_l' : 'gate_r') : r() < 0.3 ? 'wall_dark' : 'wall');
    set(wall, c, 5, gate ? (c === 9 ? 'gate_l' : 'gate_r') : 'wall_base');
  }
  const props: PropPlacement[] = [
    { kind: 'banner', x: 4 * TILE + 5, y: 3 * TILE + 4, layer: 'back' },
    { kind: 'banner', x: 15 * TILE + 5, y: 3 * TILE + 4, layer: 'back' },
    { kind: 'brazier', x: 54, y: 214, layer: 'floor' },
    { kind: 'brazier', x: 586, y: 214, layer: 'floor' },
    { kind: 'sigil', x: 320, y: 262, layer: 'floor' },
    { kind: 'pillar', x: 20, y: 360, layer: 'fg' },
    { kind: 'pillar', x: 620, y: 360, layer: 'fg' },
  ];
  return { ground, wall, props };
}

export const courtyard: ZoneArt = {
  id: 'courtyard',
  name: 'Moonlit Courtyard',
  tiles: P,
  backdrop,
  props: () => ({
    brazier: [brazier()],
    flame: flames(FIRE),
    banner: banner(),
    sigil: [sigil(false), sigil(true)],
    pillar: [pillar()],
  }),
  kinds: {
    brazier: { anchor: [0.5, 1], mode: 'static', fire: { dy: -30 } },
    flame: { anchor: [0.5, 1], mode: 'loop', ms: 90 },
    banner: { anchor: [0, 0], mode: 'loop', ms: 160 },
    sigil: { anchor: [0.5, 0.5], mode: 'pulse' },
    pillar: { anchor: [0.5, 1], mode: 'static' },
  },
  layout,
  horizon: HORIZON,
};
