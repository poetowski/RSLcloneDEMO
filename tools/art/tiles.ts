// Zone "Frostfang Ruins": a 32x32 tileset, a painted backdrop, props and the
// tilemap that places them. Light comes from the top-left (the moon sits in
// the upper-left of the sky) to match the characters.
import path from 'node:path';
import { writeJson } from './io.ts';
import { Bitmap, hash2, hex, rgba, RGBA, rng, withAlpha } from './raster.ts';
import { dith, disc, ellipseFill, ellipseRing, line, outline, polyFill, rampDither } from './paint.ts';

export const TILE = 32;
export const MAP_COLS = 20;
export const MAP_ROWS = 12;

// stone 0 (mortar/outline) .. 6 (highlight); cool blue-grey to sit in the frost palette
const ST = ['#0e0f18', '#1b1d2b', '#2a2d41', '#3e435a', '#555c75', '#717a93', '#949db3'].map((h) => hex(h));
// snow 0..5
const SN = ['#26314b', '#4a5d84', '#7d95bd', '#afc6e4', '#d7e6f6', '#f6fbff'].map((h) => hex(h));
// ice (icicles, frost)
const IC = ['#1a3358', '#2f6496', '#5aa6d4', '#9edcf2', '#e4fbff'].map((h) => hex(h));
const IRON = ['#0f0f14', '#24252e', '#3c3e4a', '#5a5d6b', '#878a98'].map((h) => hex(h));
const BANNER = ['#1c0710', '#3e0d1c', '#6b1729', '#97243a', '#c03a46'].map((h) => hex(h));
const GOLD = ['#3a1e08', '#7a4a12', '#c08a28', '#f0c650', '#fff0a0'].map((h) => hex(h));
const RUNE = ['#0c2a3a', '#1a5a78', '#2fa0c8', '#7fe0f4', '#e0fcff'].map((h) => hex(h));

// ---------------------------------------------------------------------------
// Tile painters
// ---------------------------------------------------------------------------

type Painter = (b: Bitmap, seed: number) => void;

/** One flagstone: mortar on the right/bottom edges, bevel light on top/left. */
function stone(b: Bitmap, x0: number, y0: number, w: number, h: number, seed: number, base: number, opts: { crack?: boolean; frost?: number } = {}) {
  const r = rng(seed);
  const tone = base + (r() - 0.5) * 0.6;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const X = x0 + x, Y = y0 + y;
      if (x === w - 1 || y === h - 1) {
        b.set(X, Y, ST[1]);
        continue;
      }
      const corner = (x === 0 || x === w - 2) && (y === 0 || y === h - 2);
      if (corner) {
        b.set(X, Y, ST[2]);
        continue;
      }
      let v = tone;
      if (y === 0) v += 1.25;
      else if (x === 0) v += 0.75;
      if (y === h - 2) v -= 1.1;
      else if (x === w - 2) v -= 0.7;
      v += (hash2(X, Y, seed) - 0.5) * 0.55;
      // a broad soft gradient across the stone (lit top-left)
      v += 0.35 - ((x / w) * 0.35 + (y / h) * 0.45);
      b.set(X, Y, rampDither(ST, v, X, Y));
    }
  }
  if (opts.crack || r() < 0.22) {
    let cx = x0 + 2 + Math.floor(r() * (w - 4)), cy = y0 + 1 + Math.floor(r() * 3);
    const steps = 4 + Math.floor(r() * (h - 4));
    for (let i = 0; i < steps; i++) {
      if (cx > x0 && cx < x0 + w - 2 && cy > y0 && cy < y0 + h - 2) {
        b.set(cx, cy, ST[1]);
        if (b.get(cx + 1, cy) !== ST[1]) b.set(cx + 1, cy, ST[3]);
      }
      cy += 1;
      cx += r() < 0.33 ? -1 : r() < 0.5 ? 1 : 0;
    }
  }
  const frost = opts.frost ?? 0;
  if (frost > 0) {
    for (let i = 0; i < frost * w * h * 0.12; i++) {
      const fx = x0 + 1 + Math.floor(r() * (w - 3)), fy = y0 + 1 + Math.floor(r() * (h - 3) * 0.6);
      b.set(fx, fy, r() < 0.3 ? SN[4] : SN[3]);
    }
  }
}

function floorLayout(rects: [number, number, number, number][], opts: { crack?: boolean; frost?: number } = {}): Painter {
  return (b, seed) => {
    rects.forEach(([x, y, w, h], i) => stone(b, x, y, w, h, seed * 31 + i * 7, 3.65, { frost: opts.frost, crack: opts.crack && i === 0 }));
  };
}

/** Snow surface fill: soft lit gradient, a few sparkles. */
function snowPixel(b: Bitmap, X: number, Y: number, depth: number, seed: number) {
  // depth: distance (px) from the drift edge; deeper = brighter, top-left lit
  let v = 2.15 + Math.min(1.25, depth * 0.22) + (hash2(X, Y, seed) - 0.5) * 0.45 + Math.sin(X * 0.21 + Y * 0.13) * 0.18;
  if (hash2(X, Y, seed + 7) > 0.988) v = 5;
  b.set(X, Y, rampDither(SN, v, X, Y));
}

/** Snow drift covering one side of a tile. `edge(t)` is the drift boundary (0..32) along the side. */
function snowEdge(side: 'top' | 'left' | 'right' | 'full' | 'bottom', base: Painter): Painter {
  return (b, seed) => {
    base(b, seed);
    const wave = (t: number) => 15 + 4 * Math.sin((t / 32) * Math.PI * 2 + 0.6) + 2 * Math.sin((t / 32) * Math.PI * 4 + 1.3);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        let depth: number;
        if (side === 'full') depth = 6;
        else if (side === 'top') depth = wave(x) - y;
        else if (side === 'bottom') depth = y - (32 - wave(x));
        else if (side === 'left') depth = wave(y) - x;
        else depth = x - (32 - wave(y));
        if (depth < 0) {
          // soft shadow cast by the drift onto the stones
          if (depth > -2 && (side === 'top' || side === 'left')) {
            const c = b.get(x, y);
            if (c !== ST[1]) b.set(x, y, ST[2]);
          }
          continue;
        }
        if (depth < 1 && side !== 'full') b.set(x, y, SN[1]);
        else if (depth < 2 && side !== 'full') b.set(x, y, SN[2]);
        else snowPixel(b, x, y, depth, seed);
      }
    }
  };
}

const wallBrick = (b: Bitmap, seed: number, rowsFrom = 0, rowsTo = 4, dark = 0) => {
  // 8px courses of 16px blocks, staggered
  for (let row = rowsFrom; row < rowsTo; row++) {
    const off = row % 2 ? 8 : 0;
    for (let bx = -off; bx < TILE; bx += 16) {
      const x0 = Math.max(0, bx), x1 = Math.min(TILE, bx + 16);
      const y0 = row * 8;
      const r = rng(seed * 13 + row * 7 + bx);
      const tone = 3.5 + (r() - 0.5) * 0.7 - dark;
      for (let y = y0; y < y0 + 8; y++) {
        for (let x = x0; x < x1; x++) {
          const lx = x - bx, ly = y - y0;
          if (lx === 15 || ly === 7) {
            b.set(x, y, ST[1]);
            continue;
          }
          let v = tone;
          if (ly === 0) v += 1.1;
          else if (lx === 0) v += 0.5;
          if (ly === 6) v -= 0.9;
          v += (hash2(x, y, seed) - 0.5) * 0.6;
          b.set(x, y, rampDither(ST, v, x, y));
        }
      }
      if (r() < 0.18) {
        // chipped corner
        const cx = x0 + Math.floor(r() * 12), cy = y0 + 1;
        b.set(cx, cy, ST[2]);
        b.set(cx + 1, cy, ST[2]);
        b.set(cx, cy + 1, ST[2]);
      }
    }
  }
};

function icicles(b: Bitmap, y: number, seed: number, density = 0.3) {
  const r = rng(seed);
  for (let x = 1; x < TILE - 1; x++) {
    if (r() > density) continue;
    const len = 2 + Math.floor(r() * 6);
    for (let i = 0; i < len; i++) {
      const c = i === len - 1 ? IC[3] : i === 0 ? IC[1] : IC[2];
      b.set(x, y + i, c);
      if (i < len / 2 && x + 1 < TILE) b.set(x + 1, y + i, IC[1]);
    }
    x += 2;
  }
}

function snowCap(b: Bitmap, yTop: (x: number) => number, thick: number, seed: number) {
  for (let x = 0; x < TILE; x++) {
    const t = Math.round(yTop(x));
    const th = thick + (hash2(x, 3, seed) > 0.6 ? 1 : 0);
    for (let i = 0; i < th; i++) {
      const y = t + i;
      if (y < 0 || y >= TILE) continue;
      b.set(x, y, i === 0 ? SN[5] : i === th - 1 ? SN[2] : SN[4]);
    }
    if (t - 1 >= 0 && hash2(x, 9, seed) > 0.75) b.set(x, t - 1, SN[3]);
  }
}

const P: Record<string, Painter> = {
  // --- floor
  floor_a: floorLayout([[0, 0, 16, 16], [16, 0, 16, 16], [0, 16, 16, 16], [16, 16, 16, 16]]),
  floor_b: floorLayout([[0, 0, 32, 16], [0, 16, 16, 16], [16, 16, 16, 16]]),
  floor_c: floorLayout([[0, 0, 16, 32], [16, 0, 16, 16], [16, 16, 16, 16]]),
  floor_d: floorLayout([[0, 0, 20, 14], [20, 0, 12, 14], [0, 14, 12, 18], [12, 14, 20, 18]]),
  floor_e: floorLayout([[0, 0, 32, 32]], { crack: true }),
  floor_f: floorLayout([[0, 0, 11, 16], [11, 0, 21, 16], [0, 16, 21, 16], [21, 16, 11, 16]]),
  floor_frost: floorLayout([[0, 0, 16, 16], [16, 0, 16, 16], [0, 16, 32, 16]], { frost: 1 }),
  // --- snow
  snow_full: snowEdge('full', floorLayout([[0, 0, 32, 32]])),
  snow_top: snowEdge('top', floorLayout([[0, 0, 16, 16], [16, 0, 16, 16], [0, 16, 16, 16], [16, 16, 16, 16]])),
  snow_left: snowEdge('left', floorLayout([[0, 0, 16, 32], [16, 0, 16, 16], [16, 16, 16, 16]])),
  snow_right: snowEdge('right', floorLayout([[0, 0, 16, 16], [16, 0, 16, 32], [0, 16, 16, 16]])),
  snow_bottom: snowEdge('bottom', floorLayout([[0, 0, 32, 16], [0, 16, 16, 16], [16, 16, 16, 16]])),
  // --- wall
  wall: (b, s) => wallBrick(b, s),
  wall_dark: (b, s) => wallBrick(b, s, 0, 4, 0.6),
  wall_crown: (b, s) => {
    // broken top course with snow: upper part transparent, jagged
    const r = rng(s);
    const top = (x: number) => 12 + Math.round(3 * Math.sin(x * 0.4 + s) + (hash2(x, 1, s) > 0.8 ? -2 : 0));
    const tmp = new Bitmap(TILE, TILE);
    wallBrick(tmp, s);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (y >= top(x)) b.set(x, y, tmp.get(x, y));
    snowCap(b, top, 3, s);
    if (r() < 0.5) b.set(Math.floor(r() * 30), top(4) + 4, ST[1]);
  },
  wall_crown_gap: (b, s) => {
    // a deep notch in the crown
    const top = (x: number) => 26 + Math.round(2 * Math.sin(x * 0.5 + s) - Math.max(0, 6 - Math.abs(x - 16)) * 0.0) - (x < 4 || x > 27 ? 10 : 0);
    const tmp = new Bitmap(TILE, TILE);
    wallBrick(tmp, s);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (y >= top(x)) b.set(x, y, tmp.get(x, y));
    snowCap(b, top, 3, s);
  },
  wall_cornice: (b, s) => {
    wallBrick(b, s, 1, 4);
    // protruding cornice band on top with snow and icicles
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < TILE; x++) {
        let v = y < 2 ? 5.2 : y < 6 ? 4.1 : 2.4;
        v += (hash2(x, y, s) - 0.5) * 0.5;
        if (x % 16 === 15 && y > 1 && y < 7) v = 1;
        b.set(x, y, rampDither(ST, v, x, y));
      }
    }
    snowCap(b, (x) => -1 + (hash2(x, 2, s) > 0.7 ? 1 : 0), 3, s);
    icicles(b, 8, s, 0.35);
  },
  wall_base: (b, s) => {
    // plinth: large dark blocks, moulding line, snow drift at the foot
    for (let row = 0; row < 2; row++) {
      const off = row ? 10 : 0;
      for (let bx = -off; bx < TILE; bx += 20) {
        const r = rng(s * 3 + row * 11 + bx);
        const tone = 2.9 + (r() - 0.5) * 0.5 - row * 0.3;
        for (let y = row * 12; y < row * 12 + 12; y++) {
          for (let x = Math.max(0, bx); x < Math.min(TILE, bx + 20); x++) {
            const lx = x - bx, ly = y - row * 12;
            if (lx === 19 || ly === 11) {
              b.set(x, y, ST[1]);
              continue;
            }
            let v = tone + (ly === 0 ? 1 : 0) - (ly === 10 ? 0.8 : 0) + (hash2(x, y, s) - 0.5) * 0.5;
            b.set(x, y, rampDither(ST, v, x, y));
          }
        }
      }
    }
    // moulding
    for (let x = 0; x < TILE; x++) {
      b.set(x, 0, ST[5]);
      b.set(x, 1, ST[4]);
    }
    // drift
    const top = (x: number) => 22 + 2 * Math.sin((x / 32) * Math.PI * 2 + 0.5) + Math.sin((x / 32) * Math.PI * 6 + 2);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (y >= top(x)) snowPixel(b, x, y, y - top(x) + 1, s);
    for (let x = 0; x < TILE; x++) b.set(x, Math.ceil(top(x)), SN[5]);
  },
  pilaster: (b, s) => {
    // column shaft embedded in the wall (fluted)
    wallBrick(b, s, 0, 4, 0.5);
    for (let y = 0; y < TILE; y++) {
      for (let x = 6; x < 26; x++) {
        const lx = x - 6;
        let v = 4.6 - Math.abs(lx - 7) * 0.16 + (lx < 3 ? 0.6 : 0) - (lx > 16 ? 1.2 : 0);
        if (lx % 5 === 4) v -= 1.1;
        v += (hash2(x, y, s) - 0.5) * 0.35;
        b.set(x, y, rampDither(ST, v, x, y));
      }
      b.set(5, y, ST[1]);
      b.set(26, y, ST[1]);
    }
  },
  pilaster_top: (b, s) => {
    P.pilaster(b, s);
    // capital: wider block with scroll shading, snow on top
    for (let y = 0; y < 10; y++) {
      for (let x = 3; x < 29; x++) {
        let v = y < 2 ? 5.6 : y < 7 ? 4.4 - (x > 24 ? 1 : 0) : 2.6;
        v += (hash2(x, y, s) - 0.5) * 0.4;
        b.set(x, y, rampDither(ST, v, x, y));
      }
      b.set(2, y, ST[1]);
      b.set(29, y, ST[1]);
    }
    for (let x = 2; x < 30; x++) b.set(x, 10, ST[1]);
    snowCap(b, () => -1, 3, s);
    icicles(b, 11, s + 5, 0.4);
  },
};

/** Arch pieces: 2x2 tiles; the opening is transparent so the backdrop shows through. */
function archTile(part: 'tl' | 'tr' | 'bl' | 'br'): Painter {
  return (b, s) => {
    const W = 64, H = 64;
    const big = new Bitmap(W, H);
    for (let ty = 0; ty < 2; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        const t = new Bitmap(TILE, TILE);
        wallBrick(t, s + tx * 3 + ty * 5);
        big.blit(t, tx * TILE, ty * TILE);
      }
    }
    // opening: semicircle top at y=22, sides down to the bottom
    const cx = 32, cy = 26, r = 19;
    const inOpen = (x: number, y: number) => (y >= cy && Math.abs(x + 0.5 - cx) <= r) || Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r;
    // voussoirs: ring of radial blocks around the opening
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        const side = y >= cy && (Math.abs(x + 0.5 - cx) > r && Math.abs(x + 0.5 - cx) <= r + 5);
        const ring = (y < cy && d > r && d <= r + 5) || side;
        if (!ring) continue;
        const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
        const seg = y < cy ? Math.floor(((ang + Math.PI) / Math.PI) * 9) : Math.floor(y / 8);
        const edge = y < cy ? Math.abs(((ang + Math.PI) / Math.PI) * 9 - seg - 0.5) > 0.42 : y % 8 === 7;
        const outer = y < cy ? d > r + 4 : Math.abs(x + 0.5 - cx) > r + 4;
        let v = 4.3 + (seg % 2 ? 0.3 : -0.2) - (x > cx ? 0.6 : 0) + (hash2(x, y, s) - 0.5) * 0.4;
        if (edge || outer) v = 1;
        big.set(x, y, rampDither(ST, v, x, y));
      }
    }
    // keystone
    polyFill(big, [[28, 1], [36, 1], [35, 8], [29, 8]], (x, y) => rampDither(ST, 5 - (x > 32 ? 0.8 : 0) + (hash2(x, y, s) - 0.5) * 0.3, x, y));
    line(big, 28, 1, 29, 8, ST[1]);
    line(big, 36, 1, 35, 8, ST[1]);
    // cut the opening (transparent) and draw its inner shadow lip
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (inOpen(x, y)) big.set(x, y, 0);
        else if (inOpen(x - 1, y) || inOpen(x + 1, y) || inOpen(x, y - 1)) {
          // reveal: the intrados is lit on the right side (light from the top-left)
          big.set(x, y, x > cx ? ST[4] : ST[1]);
        }
      }
    }
    // icicles hanging from the arch crown
    const ic = new Bitmap(W, H);
    const r2 = rng(s + 99);
    for (let x = cx - r + 3; x < cx + r - 3; x += 2 + Math.floor(r2() * 3)) {
      const yTop = Math.ceil(cy - Math.sqrt(Math.max(0, r * r - (x + 0.5 - cx) ** 2)));
      const len = 3 + Math.floor(r2() * 7);
      for (let i = 0; i < len; i++) ic.set(x, yTop + i, i === len - 1 ? IC[4] : i < 2 ? IC[1] : IC[2]);
    }
    big.blit(ic, 0, 0);
    const ox = part.endsWith('r') ? TILE : 0, oy = part.startsWith('b') ? TILE : 0;
    b.blit(big, 0, 0, { src: { x: ox, y: oy, w: TILE, h: TILE } });
  };
}
P.arch_tl = archTile('tl');
P.arch_tr = archTile('tr');
P.arch_bl = archTile('bl');
P.arch_br = archTile('br');

// ---------------------------------------------------------------------------
// Backdrop: twilight sky, aurora, moon, three mountain ranges, mist
// ---------------------------------------------------------------------------

function backdrop(W = 640, H = 200): Bitmap {
  const b = new Bitmap(W, H);
  const SKY = ['#090d22', '#0f1632', '#162246', '#1f305a', '#2b416f', '#3c5585', '#566a98', '#7a7fa6', '#a48aa2', '#c99a98'].map((h) => hex(h));
  for (let y = 0; y < H; y++) {
    const t = Math.pow(Math.min(1, y / 170), 1.25);
    for (let x = 0; x < W; x++) b.set(x, y, rampDither(SKY, t * (SKY.length - 1), x, y));
  }
  // stars
  const r = rng(7);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * W), y = Math.floor(Math.pow(r(), 1.6) * 120);
    const big = r() < 0.08;
    const c = r() < 0.3 ? hex('#bfd8ff') : hex('#ffffff');
    b.set(x, y, withAlpha(c, big ? 255 : 120 + Math.floor(r() * 135)));
    if (big) {
      b.blend(x + 1, y, withAlpha(c, 110));
      b.blend(x - 1, y, withAlpha(c, 110));
      b.blend(x, y + 1, withAlpha(c, 110));
      b.blend(x, y - 1, withAlpha(c, 110));
    }
  }
  // aurora curtains (quantized to three tones, dithered)
  const AUR = ['#1d6b6a', '#2fa58a', '#6fe0a8'].map((h) => hex(h));
  for (let x = 0; x < W; x++) {
    const yc = 46 + 14 * Math.sin(x * 0.011 + 0.8) + 6 * Math.sin(x * 0.033 + 2.1);
    const streak = (0.72 + 0.28 * Math.sin(x * 0.07 + Math.sin(x * 0.019) * 2.4)) * (0.88 + 0.12 * Math.sin(x * 0.53));
    const fade = Math.max(0, Math.sin((x / W) * Math.PI * 1.15 + 0.1));
    for (let y = Math.floor(yc - 34); y < yc + 10; y++) {
      if (y < 0 || y >= H) continue;
      const dy = (y - yc) / (y < yc ? 34 : 10);
      let k = (1 - dy * dy) * streak * fade;
      if (k <= 0.12) continue;
      k = Math.min(1, k);
      const idx = k * 3.2;
      const i = Math.min(2, Math.floor(idx));
      if (!dith(x, y, Math.min(1, idx - i + 0.35))) continue;
      b.blend(x, y, withAlpha(AUR[i], 38 + i * 34));
    }
  }
  // moon (upper left: the key light of the whole scene)
  const mx = 96, my = 40, mr = 15;
  disc(b, mx, my, mr + 7, (x, y, d) => (dith(x, y, (1 - d) * 0.5) ? withAlpha(hex('#c8d6f0'), 50) : 0));
  disc(b, mx, my, mr, (x, y, d) => {
    const lx = (x + 0.5 - mx) / mr, ly = (y + 0.5 - my) / mr;
    const lit = 0.75 - lx * 0.25 - ly * 0.25;
    let c = rampDither(['#8c9ab8', '#b9c6dd', '#dfe7f5', '#f6f9ff'].map((h) => hex(h)), lit * 3.2, x, y);
    // craters
    for (const [cx, cy, cr] of [[-0.3, -0.2, 0.22], [0.25, 0.3, 0.16], [0.35, -0.35, 0.12], [-0.1, 0.45, 0.1]]) {
      if (Math.hypot(lx - cx, ly - cy) < cr) c = hex('#a3b0c8');
    }
    return c;
  });
  // mountain ranges
  const ranges = [
    { base: 128, amp: 54, col: ['#3b4a72', '#4a5b86', '#5d6f9a'], snow: ['#9aaed0', '#c3d3ea'], seed: 3, step: 40 },
    { base: 150, amp: 46, col: ['#2a3558', '#34416a', '#43527c'], snow: ['#7f95bc', '#aabfdc'], seed: 11, step: 30 },
    { base: 176, amp: 34, col: ['#1d2541', '#252f50', '#2f3b5f'], snow: ['#62789f', '#8aa0c4'], seed: 23, step: 24 },
  ];
  for (const m of ranges) {
    const rr = rng(m.seed);
    const peaks: [number, number][] = [];
    for (let x = -60; x < W + 60; x += m.step + Math.floor(rr() * m.step)) peaks.push([x, m.base - m.amp * (0.35 + rr() * 0.65)]);
    const hAt = (x: number) => {
      for (let i = 0; i < peaks.length - 1; i++) {
        const [x0, y0] = peaks[i], [x1, y1] = peaks[i + 1];
        if (x >= x0 && x <= x1) {
          // valley between peaks
          const t = (x - x0) / (x1 - x0);
          const valley = Math.max(y0, y1) + (m.amp * 0.35);
          const yl = t < 0.5 ? y0 + (valley - y0) * (t * 2) : valley + (y1 - valley) * ((t - 0.5) * 2);
          return yl + (hash2(x, 0, m.seed) - 0.5) * 2.5;
        }
      }
      return m.base;
    };
    for (let x = 0; x < W; x++) {
      const top = Math.round(hAt(x));
      const slope = hAt(x + 1) - hAt(x - 1); // >0 means descending to the right -> faces the light
      for (let y = top; y < H; y++) {
        const depth = y - top;
        let c: RGBA;
        const lit = slope > 0.4 ? 2 : slope < -0.4 ? 0 : 1;
        if (depth < 7 + (hash2(x, 1, m.seed) * 5) && top < m.base - m.amp * 0.45) c = depth === 0 ? hex(m.snow[1]) : lit === 2 ? hex(m.snow[1]) : hex(m.snow[0]);
        else c = hex(m.col[lit]);
        b.set(x, y, c);
      }
    }
    // mist at the foot of the range
    for (let y = m.base - 6; y < m.base + 14 && y < H; y++) {
      const k = 1 - Math.abs(y - m.base - 4) / 10;
      for (let x = 0; x < W; x++) if (k > 0 && dith(x, y, k * 0.45)) b.blend(x, y, withAlpha(hex('#7f93bd'), 70));
    }
  }
  return b;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

function brazier(): Bitmap {
  const b = new Bitmap(28, 30);
  // tripod legs
  line(b, 6, 14, 3, 29, IRON[1]);
  line(b, 7, 14, 4, 29, IRON[3]);
  line(b, 21, 14, 24, 29, IRON[1]);
  line(b, 20, 14, 23, 29, IRON[2]);
  line(b, 14, 16, 14, 28, IRON[2]);
  // bowl
  ellipseFill(b, 14, 12, 11, 6, (x, y, d) => {
    const v = 3.2 - (x - 3) / 22 * 2 - (y - 6) / 12 + (d > 0.85 ? -1 : 0);
    return rampDither(IRON, v, x, y);
  });
  // rim
  ellipseRing(b, 14, 8, 11, 3, 1.5, (x, y, a) => (a < 0 && a > -2.2 ? IRON[4] : IRON[2]));
  // embers inside
  ellipseFill(b, 14, 8, 9, 2, (x, y) => (hash2(x, y, 4) > 0.5 ? hex('#ff8a2a') : hex('#c2361c')));
  return outline(b, IRON[0]);
}

/** Flame frames: teardrop with flickering tongues. */
function flames(n = 6): Bitmap[] {
  const out: Bitmap[] = [];
  const FL = ['#7a1a10', '#c8361a', '#f2731e', '#ffb84a', '#fff0b0'].map((h) => hex(h));
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(20, 26);
    const ph = (i / n) * Math.PI * 2;
    for (let y = 0; y < 26; y++) {
      for (let x = 0; x < 20; x++) {
        const t = y / 25; // 0 top .. 1 bottom
        const sway = Math.sin(ph + t * 4) * (1 - t) * 2.2;
        const half = (Math.sin(t * Math.PI * 0.95) * 6.5 + 1) * (0.75 + 0.25 * Math.sin(ph * 2 + y * 0.5));
        const dx = Math.abs(x + 0.5 - 10 - sway);
        if (dx > half) continue;
        const core = 1 - dx / half;
        let v = t * 2.2 + core * 2.2 - 0.6 + (hash2(x, y + i * 31, 9) - 0.5) * 0.8;
        if (t < 0.25 && core < 0.5) v -= 1;
        if (v < 0.3) continue;
        b.set(x, y, rampDither(FL, v, x, y));
      }
    }
    // a spark or two
    const r = rng(i * 17);
    for (let k = 0; k < 2; k++) b.set(4 + Math.floor(r() * 12), Math.floor(r() * 8), FL[3]);
    out.push(b);
  }
  return out;
}

function banner(n = 4): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(22, 52);
    const ph = (i / n) * Math.PI * 2;
    // pole
    for (let x = 1; x < 21; x++) {
      b.set(x, 1, IRON[3]);
      b.set(x, 2, IRON[1]);
    }
    b.set(0, 1, GOLD[3]);
    b.set(21, 1, GOLD[3]);
    for (let y = 3; y < 50; y++) {
      const t = (y - 3) / 47;
      const off = Math.sin(ph + t * 3) * t * 1.6;
      const x0 = Math.round(3 + off), x1 = Math.round(18 + off);
      for (let x = x0; x <= x1; x++) {
        // tattered hem: notches near the bottom
        const lx = x - x0;
        const hem = 46 - (lx % 5 === 0 ? 5 : lx % 3 === 0 ? 2 : 0) - Math.round(Math.sin(lx * 1.7) * 1.5);
        if (y > hem) continue;
        let v = 3 - (lx / 15) * 1.6 + Math.sin(lx * 0.9 + ph + y * 0.05) * 0.5;
        if (lx === 0) v += 0.8;
        b.set(x, y, rampDither(BANNER, v, x, y));
      }
    }
    // gold sigil: a stylized crowned rune
    const sx = 10 + Math.round(Math.sin(ph + 1.2) * 0.8);
    const sigil = ['  #  ', ' # # ', '#####', ' ### ', '  #  ', ' # # ', '#   #'];
    sigil.forEach((row, yy) => [...row].forEach((ch, xx) => ch === '#' && b.set(sx - 2 + xx, 14 + yy, GOLD[3 - (xx > 2 ? 1 : 0)])));
    // trim lines
    for (let y = 6; y < 44; y += 37) for (let x = 4; x < 18; x++) b.set(x + Math.round(Math.sin(ph + ((y - 3) / 47) * 3) * ((y - 3) / 47) * 1.6), y, GOLD[2]);
    out.push(outline(b, BANNER[0]));
  }
  return out;
}

function brokenPillar(): Bitmap {
  const W = 52, H = 104;
  const b = new Bitmap(W, H);
  const top = (x: number) => 14 + Math.round(6 * Math.sin(x * 0.35) + (x > 30 ? (x - 30) * 0.6 : 0));
  for (let y = 0; y < H; y++) {
    for (let x = 6; x < 46; x++) {
      if (y < top(x)) continue;
      const lx = x - 6;
      let v = 4.4 - Math.abs(lx - 12) * 0.08 + (lx < 4 ? 0.7 : 0) - (lx > 30 ? 1.4 : 0);
      if (lx % 7 === 6) v -= 1.0;
      v -= (y / H) * 0.6;
      v += (hash2(x, y, 51) - 0.5) * 0.4;
      b.set(x, y, rampDither(ST, v, x, y));
    }
  }
  // drum joints
  for (const jy of [44, 78]) for (let x = 6; x < 46; x++) {
    b.set(x, jy, ST[1]);
    b.set(x, jy + 1, ST[4]);
  }
  // snow on the broken top + icicles
  for (let x = 6; x < 46; x++) {
    const t = top(x);
    for (let i = 0; i < 4; i++) b.set(x, t + i, i === 0 ? SN[5] : i === 3 ? SN[2] : SN[4]);
    if (hash2(x, 5, 3) > 0.7) for (let i = 4; i < 8; i++) b.set(x, t + i, i === 7 ? IC[3] : IC[2]);
  }
  // base drift
  for (let y = H - 12; y < H; y++) for (let x = 0; x < W; x++) {
    const d = y - (H - 12) - Math.abs(Math.sin(x * 0.2)) * 4;
    if (d > 0) snowPixel(b, x, y, d, 8);
  }
  return outline(b, ST[0]);
}

function rubble(seed: number): Bitmap {
  const b = new Bitmap(44, 24);
  const r = rng(seed);
  for (let k = 0; k < 4; k++) {
    const cx = 8 + r() * 28, cy = 13 + r() * 5, rx = 5 + r() * 6, ry = 3.5 + r() * 3;
    ellipseFill(b, cx, cy, rx, ry, (x, y, d) => {
      const lx = (x + 0.5 - cx) / rx, ly = (y + 0.5 - cy) / ry;
      const v = 4 - lx * 1.2 - ly * 1.4 - d * 0.6 + (hash2(x, y, seed) - 0.5) * 0.5;
      if (ly < -0.35) return rampDither(SN, 3.4 - ly, x, y);
      return rampDither(ST, v, x, y);
    });
  }
  return outline(b, ST[0]);
}

function runeCircle(bright: boolean): Bitmap {
  const W = 220, H = 70;
  const b = new Bitmap(W, H);
  const cx = W / 2, cy = H / 2;
  const k = bright ? 1 : 0;
  ellipseRing(b, cx, cy, 104, 31, 1.4, () => withAlpha(RUNE[2 + k], 150 + k * 60));
  ellipseRing(b, cx, cy, 92, 27, 1.2, () => withAlpha(RUNE[1 + k], 140 + k * 60));
  // rune glyphs between the rings
  const glyphs = ['#.#|.#.|#.#', '##.|.#.|.##', '.#.|###|.#.', '#..|###|..#', '###|#.#|.#.', '.##|#..|##.'];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const gx = Math.round(cx + Math.cos(a) * 98) - 1, gy = Math.round(cy + Math.sin(a) * 29) - 1;
    glyphs[i % glyphs.length].split('|').forEach((row, yy) => [...row].forEach((ch, xx) => ch === '#' && b.set(gx + xx, gy + yy, withAlpha(RUNE[3 + k], 190 + k * 60))));
  }
  // inner ring and six spokes
  ellipseRing(b, cx, cy, 52, 15.5, 1.1, () => withAlpha(RUNE[1 + k], 120 + k * 60));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    line(b, cx + Math.cos(a) * 54, cy + Math.sin(a) * 16, cx + Math.cos(a) * 90, cy + Math.sin(a) * 26.5, withAlpha(RUNE[2 + k], 80 + k * 50));
  }
  ellipseFill(b, cx, cy, 6, 2.2, () => withAlpha(RUNE[3 + k], 150 + k * 60));
  return b;
}

// ---------------------------------------------------------------------------
// Map + build
// ---------------------------------------------------------------------------

export interface ZoneJson {
  name: string;
  tile: number;
  cols: number;
  rows: number;
  /** names indexed by tile id (atlas order) */
  tiles: string[];
  /** tileset columns in tiles.png */
  atlasCols: number;
  /** -1 = empty */
  layers: { ground: number[]; wall: number[] };
  props: { kind: string; x: number; y: number; layer: 'back' | 'fg' | 'floor' }[];
  /** feet positions, front-row first */
  spawns: { player: [number, number][]; enemy: [number, number][] };
}

function buildMap(names: string[]): ZoneJson {
  const id = (n: string) => {
    const i = names.indexOf(n);
    if (i < 0) throw new Error('no tile ' + n);
    return i;
  };
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const set = (layer: number[], c: number, r: number, n: string) => (layer[r * MAP_COLS + c] = id(n));
  const r = rng(2024);
  const floors = ['floor_a', 'floor_b', 'floor_c', 'floor_d', 'floor_f', 'floor_a', 'floor_b', 'floor_e'];
  for (let row = 6; row < MAP_ROWS; row++) {
    for (let c = 0; c < MAP_COLS; c++) {
      let n = floors[Math.floor(r() * floors.length)];
      const edgeL = row >= 9 ? 1 : 0, edgeR = row >= 9 ? 18 : 19;
      if (c < edgeL) n = 'snow_full';
      else if (c === edgeL) n = 'snow_left';
      else if (c > edgeR) n = 'snow_full';
      else if (c === edgeR) n = 'snow_right';
      else if (row === 6 && r() < 0.35) n = 'snow_top';
      else if (row === MAP_ROWS - 1 && r() < 0.45) n = 'snow_bottom';
      set(ground, c, row, n);
    }
  }
  // wall: crown (row 2), face (rows 3-4) with arches + pilasters, base (row 5)
  const arches = [3, 9, 15];
  const pilasters = [2, 5, 8, 11, 14, 17];
  for (let c = 0; c < MAP_COLS; c++) {
    set(wall, c, 5, 'wall_base');
    const archAt = arches.find((a) => c === a || c === a + 1);
    if (archAt !== undefined) {
      const left = c === archAt;
      set(wall, c, 3, left ? 'arch_tl' : 'arch_tr');
      set(wall, c, 4, left ? 'arch_bl' : 'arch_br');
      set(wall, c, 2, 'wall_crown');
    } else if (pilasters.includes(c)) {
      set(wall, c, 3, 'pilaster_top');
      set(wall, c, 4, 'pilaster');
      set(wall, c, 2, c === 8 ? 'wall_crown_gap' : 'wall_crown');
    } else {
      set(wall, c, 3, 'wall_cornice');
      set(wall, c, 4, r() < 0.3 ? 'wall_dark' : 'wall');
      set(wall, c, 2, c === 13 || c === 0 ? 'wall_crown_gap' : 'wall_crown');
    }
  }
  return {
    name: 'Frostfang Ruins',
    tile: TILE,
    cols: MAP_COLS,
    rows: MAP_ROWS,
    tiles: names,
    atlasCols: 8,
    layers: { ground, wall },
    props: [
      { kind: 'banner', x: 6 * TILE + 5, y: 3 * TILE + 6, layer: 'back' },
      { kind: 'banner', x: 12 * TILE + 5, y: 3 * TILE + 6, layer: 'back' },
      { kind: 'banner', x: 18 * TILE + 5, y: 3 * TILE + 6, layer: 'back' },
      { kind: 'banner', x: 0 * TILE + 5, y: 3 * TILE + 6, layer: 'back' },
      { kind: 'brazier', x: 54, y: 214, layer: 'floor' },
      { kind: 'brazier', x: 586, y: 214, layer: 'floor' },
      { kind: 'rubble', x: 470, y: 196, layer: 'floor' },
      { kind: 'rubble2', x: 150, y: 194, layer: 'floor' },
      { kind: 'rune', x: 320, y: 262, layer: 'floor' },
      { kind: 'pillar', x: 22, y: 360, layer: 'fg' },
      { kind: 'pillar', x: 622, y: 360, layer: 'fg' },
    ],
    spawns: {
      player: [
        [216, 250],
        [152, 216],
        [136, 284],
      ],
      enemy: [
        [424, 250],
        [488, 216],
        [504, 284],
      ],
    },
  };
}

export function buildTiles(out: string) {
  const names = Object.keys(P);
  const cols = 8;
  const rows = Math.ceil(names.length / cols);
  const atlas = new Bitmap(cols * TILE, rows * TILE);
  names.forEach((n, i) => {
    const t = new Bitmap(TILE, TILE);
    P[n](t, i * 97 + 13);
    atlas.blit(t, (i % cols) * TILE, Math.floor(i / cols) * TILE);
  });
  atlas.save(path.join(out, 'zone', 'tiles.png'));

  const bd = backdrop();
  bd.save(path.join(out, 'zone', 'backdrop.png'));

  // props atlas (small, hand-placed sprites)
  const flame = flames();
  const ban = banner();
  const props: Record<string, Bitmap[]> = {
    brazier: [brazier()],
    flame,
    banner: ban,
    pillar: [brokenPillar()],
    rubble: [rubble(5)],
    rubble2: [rubble(9)],
    rune: [runeCircle(false), runeCircle(true)],
  };
  const items: { key: string; bmp: Bitmap }[] = [];
  for (const [k, list] of Object.entries(props)) list.forEach((bmp, i) => items.push({ key: `${k}/${i}`, bmp }));
  // simple vertical stack per kind to keep it readable
  let y = 0;
  const pw = Math.max(...items.map((i) => i.bmp.w)) + 2;
  const placed: Record<string, [number, number, number, number]> = {};
  let x = 0, rowH = 0;
  const sheetW = 256;
  for (const it of items) {
    if (x + it.bmp.w > sheetW) {
      x = 0;
      y += rowH + 1;
      rowH = 0;
    }
    placed[it.key] = [x, y, it.bmp.w, it.bmp.h];
    x += it.bmp.w + 1;
    rowH = Math.max(rowH, it.bmp.h);
  }
  const sheet = new Bitmap(sheetW, y + rowH + 1);
  for (const it of items) sheet.blit(it.bmp, placed[it.key][0], placed[it.key][1]);
  sheet.save(path.join(out, 'zone', 'props.png'));
  void pw;

  const map = buildMap(names);
  writeJson(path.join(out, 'zone', 'zone.json'), { ...map, propFrames: placed });

  // composed preview (docs + quick visual check)
  const prev = composeZone(map, atlas, bd, sheet, placed);
  prev.save(path.join('docs', 'images', 'zone_preview.png'));
  console.log(`  zone: ${names.length} tiles, backdrop ${bd.w}x${bd.h}, ${items.length} prop frames`);
}

export function composeZone(map: ZoneJson, atlas: Bitmap, bd: Bitmap, props: Bitmap, frames: Record<string, [number, number, number, number]>): Bitmap {
  const W = 640, H = 360;
  const out = new Bitmap(W, H);
  out.blit(bd, 0, 0);
  const drawLayer = (layer: number[]) => {
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const t = layer[r * map.cols + c];
        if (t < 0) continue;
        out.blit(atlas, c * TILE, r * TILE, { src: { x: (t % map.atlasCols) * TILE, y: Math.floor(t / map.atlasCols) * TILE, w: TILE, h: TILE } });
      }
    }
  };
  drawLayer(map.layers.ground);
  drawLayer(map.layers.wall);
  const anchor: Record<string, [number, number]> = { brazier: [0.5, 1], banner: [0, 0], pillar: [0.5, 1], rubble: [0.5, 1], rubble2: [0.5, 1], rune: [0.5, 0.5] };
  for (const p of map.props) {
    const key = p.kind === 'rune' ? 'rune/1' : `${p.kind}/0`;
    const f = frames[key];
    const [ax, ay] = anchor[p.kind] ?? [0.5, 1];
    out.blit(props, Math.round(p.x - f[2] * ax), Math.round(p.y - f[3] * ay), { src: { x: f[0], y: f[1], w: f[2], h: f[3] } });
    if (p.kind === 'brazier') {
      const fl = frames['flame/0'];
      out.blit(props, p.x - 10, p.y - 30 - 18, { src: { x: fl[0], y: fl[1], w: fl[2], h: fl[3] } });
    }
  }
  return out;
}

void rgba;
