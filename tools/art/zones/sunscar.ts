// Zone "Sunscar Ruins": the necropolis of the sun kings at sunset. A temple
// wall carved with offering scenes on the left, a pylon gate in the middle
// that frames the great pyramid, and a ruined papyrus colonnade on the right
// through which the dunes and a toppled colossal head can be seen. The sun
// hangs low in the upper-left: the same key light as every sprite, so faces
// lit on the left and shadows thrown long to the right.
import { MAT } from '../palette.ts';
import { dith, disc, ellipseFill, ellipseRing, line, outline, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, hex, RGBA, rng, withAlpha } from '../raster.ts';
import { Frame } from '../render.ts';
import { Draw, v, V } from '../rig.ts';
import { flames, MAP_COLS, MAP_ROWS, Painter, PropPlacement, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));

// --- palette -------------------------------------------------------------------
// sandstone 0 (mortar/outline) .. 6 (sunlit highlight)
const SS = H(['#24100a', '#4e2414', '#7a3e1e', '#a65e30', '#c98244', '#e4a660', '#f6cc8c']);
// worn limestone paving, paler and cooler than the walls so the floor reads as a separate plane
const FS = H(['#2a1a10', '#5e3e26', '#8e6640', '#b68a58', '#d2a870', '#e8c68e', '#f8e2b2']);
// wind-blown sand 0..5
const SD = H(['#5a2c14', '#94562a', '#c47e3c', '#e0a252', '#f2c274', '#fde4aa']);
// faded pigments left on the carvings
const LAPIS = H(['#1c2856', '#2c4282', '#4462a8']);
const RED = H(['#4a1410', '#7e2a1c', '#a8442c']);
const TURQ = H(['#0e4a44', '#1c7466', '#36a08a']);
const GILT = H(['#6a3a10', '#b07a24', '#e4b448', '#fff0a0']);
const FL = H(['#7a1a10', '#c8361a', '#f2731e', '#ffb84a', '#fff0b0']);
const BONE = H(['#3a2a20', '#7a6650', '#b8a488', '#e8dcc0']);
const PALM = H(['#10200e', '#1e3a18', '#305a22', '#4a8030', '#76a83e', '#a8d060']);
const BARK = H(['#24140c', '#4a2c18', '#6e4426', '#946038', '#b8804a']);
const BIRD = H(['#1a0c18', '#3a1c2c', '#5a2c3a']);

// ---------------------------------------------------------------------------
// Stone and sand painters
// ---------------------------------------------------------------------------

/** Ashlar courses (8px) of 16px blocks: sandy mortar, lit top-left bevels, erosion pits. */
function ashlar(b: Bitmap, seed: number, y0 = 0, y1 = TILE, dark = 0, block = 16) {
  for (let row = Math.floor(y0 / 8); row * 8 < y1; row++) {
    const off = row % 2 ? block / 2 : 0;
    for (let bx = -off; bx < b.w; bx += block) {
      const r = rng(seed * 13 + row * 7 + bx * 3);
      const tone = 3.55 + (r() - 0.5) * 0.8 - dark;
      for (let y = Math.max(y0, row * 8); y < Math.min(y1, row * 8 + 8); y++) {
        for (let x = Math.max(0, bx); x < Math.min(b.w, bx + block); x++) {
          const lx = x - bx, ly = y - row * 8;
          if (lx === block - 1 || ly === 7) {
            b.set(x, y, hash2(x, y, seed) < 0.35 ? SD[1] : SS[1]);
            continue;
          }
          let v = tone;
          if (ly === 0) v += 1.1;
          else if (lx === 0) v += 0.6;
          if (ly === 6) v -= 0.9;
          else if (lx === block - 2) v -= 0.4;
          v += (hash2(x, y, seed) - 0.5) * 0.7;
          if (hash2(x, y, seed + 3) > 0.95) v -= 1.5;
          b.set(x, y, rampDither(SS, v, x, y));
        }
      }
    }
  }
}

/** Dressed (smooth) wall surface for carvings: faint joints, warm and even. */
function dressed(b: Bitmap, seed: number, y0 = 0, y1 = TILE, dark = 0) {
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < b.w; x++) {
      if (y % 16 === 15 && hash2(x, y, seed) < 0.85) {
        b.set(x, y, SS[2]);
        continue;
      }
      let v = 3.75 - dark + (hash2(x, y, seed) - 0.5) * 0.45 - (y % 16) * 0.02;
      if (y % 16 === 0) v += 0.6;
      if (hash2(x, y, seed + 5) > 0.97) v -= 1.2;
      b.set(x, y, rampDither(SS, v, x, y));
    }
  }
}

/**
 * Sunk relief: carves a mask into the surface. The lip on the upper-left of
 * every cut falls into shadow and the far wall on the lower-right catches the
 * light, so carvings read the way the key light says they should.
 */
function incise(b: Bitmap, inside: (x: number, y: number) => boolean, paint?: (x: number, y: number) => RGBA | 0) {
  const W = b.w, Hh = b.h;
  const m = new Uint8Array(W * Hh);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (inside(x, y)) m[y * W + x] = 1;
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < Hh ? m[y * W + x] : 1);
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      if (!m[y * W + x]) continue;
      const shadowLip = !at(x - 1, y) || !at(x, y - 1);
      const litLip = !at(x + 1, y) || !at(x, y + 1);
      let c: RGBA = shadowLip ? SS[1] : litLip ? SS[5] : SS[3];
      if (!shadowLip && !litLip && paint) c = paint(x, y) || c;
      b.set(x, y, c);
    }
  }
}

/** Faded pigment: shows only where the paint has not worn away. */
const worn = (ramp: RGBA[], x: number, y: number, keep = 0.62): RGBA | 0 => (hash2(x, y, 41) < keep ? rampDither(ramp, 1.2 + (hash2(x, y, 9) - 0.5) * 0.8, x, y) : 0);

/** Paving slab with sandy joints; every slab gets its own tone so the floor never reads as a grid. */
function flag(b: Bitmap, x0: number, y0: number, w: number, h: number, seed: number, crack = false) {
  const r = rng(seed);
  const tone = 2.95 + (r() - 0.5) * 1.0;
  const worn = r() < 0.18;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const X = x0 + x, Y = y0 + y;
      if (x === w - 1 || y === h - 1) {
        b.set(X, Y, hash2(X, Y, seed) < 0.6 ? SD[1] : FS[1]);
        continue;
      }
      if ((x === 0 || x === w - 2) && (y === 0 || y === h - 2)) {
        b.set(X, Y, FS[2]);
        continue;
      }
      let v = tone;
      if (y === 0) v += 1.0;
      else if (x === 0) v += 0.6;
      if (y === h - 2) v -= 0.8;
      else if (x === w - 2) v -= 0.5;
      v += (hash2(X, Y, seed) - 0.5) * 0.45 + 0.3 - ((x / w) * 0.3 + (y / h) * 0.4);
      // a dished, foot-worn hollow in some slabs
      if (worn) v -= Math.max(0, 1 - Math.hypot((x - w / 2) / (w * 0.35), (y - h / 2) / (h * 0.35))) * 0.8;
      b.set(X, Y, rampDither(FS, v, X, Y));
    }
  }
  if (crack || r() < 0.07) {
    let cx = x0 + 2 + Math.floor(r() * (w - 4)), cy = y0 + 1;
    for (let i = 0; i < h - 3; i++) {
      if (cx > x0 && cx < x0 + w - 2) {
        b.set(cx, cy, FS[1]);
        if (b.get(cx + 1, cy) !== FS[1]) b.set(cx + 1, cy, FS[4]);
      }
      cy++;
      cx += r() < 0.33 ? -1 : r() < 0.5 ? 1 : 0;
    }
  }
  // sand settles against one joint of some slabs
  if (r() < 0.4) {
    const along = r() < 0.5;
    for (let k = 0; k < (along ? w : h) - 2; k++) {
      if (hash2(k, seed, 3) < 0.4) continue;
      const X = along ? x0 + k : x0 + w - 2, Y = along ? y0 + h - 2 : y0 + k;
      b.set(X, Y, SD[hash2(X, Y, 5) < 0.5 ? 3 : 2]);
    }
  }
}

/** A soft heap of sand blown across the middle of the paving. */
function sandPatch(base: Painter, cx: number, cy: number, rx: number, ry: number): Painter {
  return (b, seed) => {
    base(b, seed);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const wob = 0.18 * Math.sin(x * 0.5 + seed) + 0.12 * Math.sin(y * 0.7 + seed * 2);
        const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry) + wob;
        if (d > 1) continue;
        if (d > 0.82 && !dith(x, y, (1 - d) * 5)) continue;
        if (d > 0.9) b.set(x, y, y < cy ? SD[4] : SD[1]);
        else sandPixel(b, x, y, (1 - d) * 10, seed);
      }
    }
  };
}

function floorLayout(rects: [number, number, number, number][], crack = false): Painter {
  return (b, seed) => rects.forEach(([x, y, w, h], i) => flag(b, x, y, w, h, seed * 31 + i * 7, crack && i === 0));
}

/** Rippled sand surface; depth = px from the drift edge (deeper = brighter). */
function sandPixel(b: Bitmap, X: number, Y: number, depth: number, seed: number) {
  let v = 2.3 + Math.min(1.4, depth * 0.2) + Math.sin(X * 0.42 + Y * 1.25 + Math.sin(X * 0.09 + Y * 0.05) * 2.2) * 0.36 + (hash2(X, Y, seed) - 0.5) * 0.3;
  if (hash2(X, Y, seed + 7) > 0.993) v = 5;
  b.set(X, Y, rampDither(SD, v, X, Y));
}

/** Sand drift over one side of a floor tile, with a sunlit crest. */
function sandEdge(side: 'top' | 'left' | 'right' | 'bottom' | 'full', base: Painter): Painter {
  return (b, seed) => {
    base(b, seed);
    const wave = (t: number) => 14 + 5 * Math.sin((t / 32) * Math.PI * 2 + 0.4) + 2 * Math.sin((t / 32) * Math.PI * 4 + 1.9);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        let depth: number;
        if (side === 'full') depth = 6;
        else if (side === 'top') depth = wave(x) - y;
        else if (side === 'bottom') depth = y - (32 - wave(x));
        else if (side === 'left') depth = wave(y) - x;
        else depth = x - (32 - wave(y));
        if (depth < 0) {
          if (depth > -2 && (side === 'top' || side === 'left') && b.get(x, y) !== SS[1]) b.set(x, y, SS[2]);
          continue;
        }
        if (depth < 1 && side !== 'full') b.set(x, y, side === 'bottom' || side === 'right' ? SD[4] : SD[1]);
        else if (depth < 2 && side !== 'full') b.set(x, y, side === 'bottom' || side === 'right' ? SD[3] : SD[4]);
        else sandPixel(b, x, y, depth, seed);
      }
    }
  };
}

/** Sand heaped against the foot of a wall (bottom of a tile), top edge `top(x)`. */
function footDrift(b: Bitmap, top: (x: number) => number, seed: number) {
  for (let x = 0; x < TILE; x++) {
    const t = Math.round(top(x));
    for (let y = Math.max(0, t); y < TILE; y++) {
      if (y === t) b.set(x, y, SD[5]);
      else if (y === t + 1) b.set(x, y, SD[4]);
      else sandPixel(b, x, y, y - t, seed);
    }
  }
}

/** Sand lying on top of a broken edge. */
function sandCap(b: Bitmap, yTop: (x: number) => number, thick: number, seed: number) {
  for (let x = 0; x < TILE; x++) {
    const t = Math.round(yTop(x));
    const th = thick + (hash2(x, 3, seed) > 0.6 ? 1 : 0);
    for (let i = 0; i < th; i++) {
      const y = t + i;
      if (y < 0 || y >= TILE) continue;
      b.set(x, y, i === 0 ? SD[5] : i === th - 1 ? SD[1] : SD[3]);
    }
  }
}

// ---------------------------------------------------------------------------
// Carvings
// ---------------------------------------------------------------------------

// prettier-ignore
const GLYPHS: string[][] = [
  ['.###.', '#...#', '#...#', '.###.', '#####', '..#..', '..#..'], // ankh
  ['.....', '#####', '#.#.#', '#####', '..#..', '.##..', '#....'], // eye
  ['..##.', '.###.', '####.', '.###.', '..##.', '.#.#.', '#..#.'], // falcon
  ['..#..', '.##..', '.#.#.', '..#..', '..#..', '..#..', '..#..'], // reed
  ['#.#.#', '.#.#.', '.....', '#.#.#', '.#.#.', '.....', '.....'], // water
  ['.###.', '#...#', '#.#.#', '#...#', '.###.', '.....', '.....'], // sun
  ['..#..', '.##..', '.###.', '.###.', '.###.', '..##.', '..#..'], // feather
  ['.#.#.', '#####', '.###.', '#####', '.###.', '#.#.#', '.....'], // scarab
];

function glyphAt(x: number, y: number, gx: number, gy: number, g: string[]): boolean {
  const lx = x - gx, ly = y - gy;
  return ly >= 0 && ly < g.length && lx >= 0 && lx < g[ly].length && g[ly][lx] === '#';
}

/** Two columns of hieroglyphs between incised rules. */
function glyphColumns(b: Bitmap, seed: number) {
  const r = rng(seed);
  const picks = Array.from({ length: 8 }, () => GLYPHS[Math.floor(r() * GLYPHS.length)]);
  const paints = Array.from({ length: 8 }, () => [LAPIS, RED, TURQ, GILT][Math.floor(r() * 4)]);
  incise(
    b,
    (x, y) => x === 2 || x === 15 || x === 29 || picks.some((g, i) => glyphAt(x, y, (i % 2 ? 18 : 5) + 1, 2 + Math.floor(i / 2) * 8, g)),
    (x, y) => {
      const i = picks.findIndex((g, k) => glyphAt(x, y, (k % 2 ? 18 : 5) + 1, 2 + Math.floor(k / 2) * 8, g));
      return i >= 0 ? worn(paints[i], x, y) : 0;
    },
  );
}

/**
 * Offering scene (64x64): a king in the nemes striding forward with an ankh
 * held out, carved in sunk relief with traces of paint. `face` = 1 faces
 * right, -1 faces left (the two scenes face each other across the wall).
 */
function offeringScene(face: 1 | -1, seed: number): Bitmap {
  const S = 64;
  const b = new Bitmap(S, S);
  dressed(b, seed, 0, S);
  const fx = (x: number) => (face > 0 ? x : S - 1 - x);
  // shapes in a right-facing frame
  const parts: { pts: [number, number][]; paint: RGBA[] }[] = [
    // face (profile, facing +x) with the nose
    { pts: [[32, 9], [36, 9], [37, 12], [39.5, 14.5], [37.5, 15.5], [37.5, 18.5], [35, 21], [32, 19]], paint: RED },
    // nemes headcloth, flaring behind the face down to the shoulders
    { pts: [[24, 8], [30, 5], [34, 6], [33, 9], [32, 14], [32, 20], [30, 24], [25, 25], [23, 18]], paint: LAPIS },
    // broad collar and torso
    { pts: [[25, 23], [35, 22], [36, 27], [34, 38], [26, 38], [24, 28]], paint: RED },
    // kilt
    { pts: [[24, 37], [36, 37], [38, 46], [23, 46]], paint: GILT },
    // striding legs
    { pts: [[26, 46], [30, 46], [27, 58], [24, 59]], paint: RED },
    { pts: [[32, 46], [36, 46], [41, 58], [38, 59]], paint: RED },
    // feet
    { pts: [[20, 58], [27, 58], [27, 60], [20, 60]], paint: RED },
    { pts: [[37, 58], [45, 58], [45, 60], [37, 60]], paint: RED },
    // arm held forward with the ankh
    { pts: [[33, 24], [36, 24], [47, 29], [46, 32], [34, 28]], paint: RED },
    // the back arm hanging
    { pts: [[25, 25], [28, 25], [27, 37], [24, 37]], paint: RED },
  ];
  const ankh = (x: number, y: number) => {
    const ax = 50, ay = 22;
    return (Math.hypot(x + 0.5 - ax, (y + 0.5 - ay) * 1.2) <= 3.2 && Math.hypot(x + 0.5 - ax, (y + 0.5 - ay) * 1.2) >= 1.6) || (x >= ax - 4 && x <= ax + 3 && y >= ay + 4 && y <= ay + 5) || (x >= ax - 1 && x <= ax && y >= ay + 4 && y <= ay + 15);
  };
  const inPoly = (pts: [number, number][], x: number, y: number) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  // a cartouche and glyph column above the offering
  const cart = (x: number, y: number) => x >= 44 && x <= 56 && y >= 2 && y <= 15 && (x === 44 || x === 56 || y === 2 || y === 15);
  const cartGlyphs = (x: number, y: number) => glyphAt(x, y, 47, 4, GLYPHS[(seed + 2) % GLYPHS.length]) || glyphAt(x, y, 47, 9, ['#####', '.....', '.....', '.....', '.....']);
  const local = (x: number, y: number) => ({ X: fx(x) + 0.5, Y: y + 0.5 });
  incise(
    b,
    (x, y) => {
      const { X, Y } = local(x, y);
      return parts.some((p) => inPoly(p.pts, X, Y)) || ankh(Math.floor(X), Math.floor(Y)) || cart(Math.floor(X), Math.floor(Y)) || cartGlyphs(Math.floor(X), Math.floor(Y)) || (Y > 61 && Y < 63);
    },
    (x, y) => {
      const { X, Y } = local(x, y);
      if (ankh(Math.floor(X), Math.floor(Y))) return worn(GILT, x, y, 0.85);
      const p = parts.find((q) => inPoly(q.pts, X, Y));
      if (!p) return 0;
      // nemes stripes
      if (p.paint === LAPIS && Math.floor(Y) % 3 === 0) return worn(GILT, x, y, 0.75);
      return worn(p.paint, x, y);
    },
  );
  // the eye, painted black-lined
  const ex = fx(35), ey = 13;
  b.set(ex, ey, SS[0]);
  b.set(fx(36), ey, SS[0]);
  return b;
}

/** Winged sun disc over the gate (64x32): red disc, two uraei, feathered wings. */
function wingedSun(seed: number): Bitmap {
  const W = 64, Hh = 32;
  const b = new Bitmap(W, Hh);
  dressed(b, seed, 0, Hh);
  // lintel moulding at the bottom
  for (let x = 0; x < W; x++) {
    b.set(x, Hh - 4, SS[5]);
    b.set(x, Hh - 3, SS[4]);
    b.set(x, Hh - 2, SS[2]);
    b.set(x, Hh - 1, SS[1]);
  }
  const cx = 32, cy = 13;
  incise(
    b,
    (x, y) => {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= 6) return true;
      // wings: three feather rows tapering outward
      const dx = Math.abs(x + 0.5 - cx);
      if (dx < 6 || dx > 30) return false;
      const k = (dx - 6) / 24;
      const top = cy - 5 + k * 5, bottom = cy + 4 - k * 1;
      return y + 0.5 >= top && y + 0.5 <= bottom;
    },
    (x, y) => {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= 6) return d < 4.5 ? worn(RED, x, y, 0.9) : worn(GILT, x, y, 0.9);
      const row = Math.floor((y - (cy - 5)) / 3);
      if ((x + (row % 2) * 2) % 4 === 0) return SS[2];
      return worn([LAPIS, TURQ, GILT][row % 3], x, y, 0.8);
    },
  );
  // uraei rearing either side of the disc
  for (const s of [-1, 1]) {
    const ux = cx + s * 7;
    for (let y = cy - 6; y <= cy + 3; y++) b.set(ux, y, y < cy - 4 ? GILT[3] : GILT[2]);
    b.set(ux + s, cy - 6, GILT[2]);
  }
  return b;
}

// ---------------------------------------------------------------------------
// Tile painters
// ---------------------------------------------------------------------------

/** Cavetto cornice band (gorge + torus) from y0 down to y0+14; transparent above when `open`. */
function cornice(b: Bitmap, seed: number, y0: number) {
  for (let y = y0; y < y0 + 14; y++) {
    const ly = y - y0;
    for (let x = 0; x < TILE; x++) {
      let c: RGBA;
      if (ly < 2) c = ly === 0 ? SS[6] : SS[5];
      else if (ly < 11) {
        // concave gorge: shadowed under the lip, brighter toward the torus; painted leaf stripes
        let v = 2.3 + ((ly - 2) / 9) * 1.9 + (hash2(x, y, seed) - 0.5) * 0.4;
        if (x % 4 === 0) v -= 0.9;
        c = rampDither(SS, v, x, y);
        const paint = [LAPIS, RED, TURQ][Math.floor(x / 4) % 3];
        if (x % 4 !== 0 && ly > 3 && ly < 10 && hash2(x, y, seed + 2) < 0.45) c = paint[ly < 6 ? 1 : 2];
      } else if (ly === 11) c = SS[5];
      else if (ly === 12) c = (x + y) % 5 === 0 ? SS[2] : SS[4];
      else c = SS[1];
      b.set(x, y, c);
    }
  }
}

/** Vertical torus moulding (rope-bound) down one edge of a pylon. */
function torusEdge(b: Bitmap, x0: number, y0 = 0, y1 = TILE) {
  for (let y = y0; y < y1; y++) {
    const band = (y + x0) % 6 < 2;
    b.set(x0, y, band ? SS[3] : SS[5]);
    b.set(x0 + 1, y, band ? SS[2] : SS[4]);
    b.set(x0 + 2, y, band ? SS[1] : SS[3]);
  }
}

/** Papyrus-bundle column shaft between x 9..22, lit on the left. */
function shaft(b: Bitmap, seed: number, y0 = 0, y1 = TILE) {
  const cx = 16, half = 7;
  for (let y = y0; y < y1; y++) {
    for (let x = cx - half; x < cx + half; x++) {
      const u = (x + 0.5 - cx) / half; // -1..1
      const rib = Math.abs(((x - (cx - half)) % 5) - 2) / 2; // 0 at rib center
      let v = 3.9 - u * 1.6 - rib * 0.9 + (hash2(x, y, seed) - 0.5) * 0.35;
      if (Math.abs(u) > 0.86) v -= 0.9;
      b.set(x, y, rampDither(SS, v, x, y));
    }
    b.set(cx - half - 1, y, SS[0]);
    b.set(cx + half, y, SS[0]);
  }
}

const P: Record<string, Painter> = {
  // --- floor
  floor_a: floorLayout([[0, 0, 16, 16], [16, 0, 16, 16], [0, 16, 16, 16], [16, 16, 16, 16]]),
  floor_b: floorLayout([[0, 0, 32, 16], [0, 16, 16, 16], [16, 16, 16, 16]]),
  floor_c: floorLayout([[0, 0, 16, 32], [16, 0, 16, 16], [16, 16, 16, 16]]),
  floor_d: floorLayout([[0, 0, 20, 14], [20, 0, 12, 14], [0, 14, 12, 18], [12, 14, 20, 18]]),
  floor_e: floorLayout([[0, 0, 32, 32]], true),
  floor_f: floorLayout([[0, 0, 11, 16], [11, 0, 21, 16], [0, 16, 21, 16], [21, 16, 11, 16]]),
  sand_patch_a: sandPatch(floorLayout([[0, 0, 16, 16], [16, 0, 16, 16], [0, 16, 16, 16], [16, 16, 16, 16]]), 15, 18, 13, 9),
  sand_patch_b: sandPatch(floorLayout([[0, 0, 32, 16], [0, 16, 16, 16], [16, 16, 16, 16]]), 20, 12, 11, 7),
  // --- sand
  sand_full: sandEdge('full', floorLayout([[0, 0, 32, 32]])),
  sand_top: sandEdge('top', floorLayout([[0, 0, 16, 16], [16, 0, 16, 16], [0, 16, 16, 16], [16, 16, 16, 16]])),
  sand_left: sandEdge('left', floorLayout([[0, 0, 16, 32], [16, 0, 16, 16], [16, 16, 16, 16]])),
  sand_right: sandEdge('right', floorLayout([[0, 0, 16, 16], [16, 0, 16, 32], [0, 16, 16, 16]])),
  sand_bottom: sandEdge('bottom', floorLayout([[0, 0, 32, 16], [0, 16, 16, 16], [16, 16, 16, 16]])),

  // --- temple wall
  wall: (b, s) => ashlar(b, s),
  wall_dark: (b, s) => ashlar(b, s, 0, TILE, 0.5),
  wall_cornice: (b, s) => {
    ashlar(b, s, 14, TILE);
    cornice(b, s, 0);
  },
  wall_broken: (b, s) => {
    // the top course has fallen: a jagged break with sand drifted on it
    const top = (x: number) => 9 + Math.round(3 * Math.sin(x * 0.45 + s) + (hash2(x, 1, s) > 0.8 ? -2 : 0) + (x > 20 ? (x - 20) * 0.4 : 0));
    const tmp = new Bitmap(TILE, TILE);
    ashlar(tmp, s);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (y >= top(x)) b.set(x, y, tmp.get(x, y));
    sandCap(b, top, 3, s);
  },
  wall_glyphs: (b, s) => {
    dressed(b, s);
    glyphColumns(b, s);
  },
  wall_glyphs2: (b, s) => {
    dressed(b, s);
    glyphColumns(b, s + 11);
  },
  wall_base: (b, s) => {
    // plinth of large dark blocks with a moulding, sand heaped at the foot
    ashlar(b, s, 0, 24, 0.45, 24);
    for (let x = 0; x < TILE; x++) {
      b.set(x, 0, SS[6]);
      b.set(x, 1, SS[4]);
    }
    footDrift(b, (x) => 21 + 2 * Math.sin((x / 32) * Math.PI * 2 + 0.5) + Math.sin((x / 32) * Math.PI * 6 + 2), s);
  },

  // --- pylon gate
  pylon_cap: (b, s) => {
    ashlar(b, s, 18, TILE, 0.15);
    cornice(b, s, 4);
  },
  pylon_face: (b, s) => ashlar(b, s, 0, TILE, 0.15),
  pylon_edge_l: (b, s) => {
    ashlar(b, s, 0, TILE, 0.15);
    torusEdge(b, 0);
  },
  pylon_edge_r: (b, s) => {
    ashlar(b, s, 0, TILE, 0.35);
    torusEdge(b, 29);
  },
  pylon_cap_l: (b, s) => {
    P.pylon_cap(b, s);
    torusEdge(b, 0, 18);
  },
  pylon_cap_r: (b, s) => {
    ashlar(b, s, 18, TILE, 0.35);
    cornice(b, s, 4);
    torusEdge(b, 29, 18);
  },
  pylon_base: (b, s) => {
    ashlar(b, s, 0, 24, 0.5, 24);
    for (let x = 0; x < TILE; x++) b.set(x, 0, SS[5]);
    footDrift(b, (x) => 19 + 3 * Math.sin((x / 32) * Math.PI * 2 + 1.7), s);
  },
  gate_cap_l: (b, s) => {
    ashlar(b, s, 26, TILE);
    cornice(b, s, 12);
  },
  gate_cap_r: (b, s) => {
    ashlar(b, s + 1, 26, TILE);
    cornice(b, s + 1, 12);
  },
  gate_lintel_l: (b, s) => b.blit(wingedSun(s), 0, 0, { src: { x: 0, y: 0, w: TILE, h: TILE } }),
  gate_lintel_r: (b, s) => b.blit(wingedSun(s - 1), 0, 0, { src: { x: TILE, y: 0, w: TILE, h: TILE } }),
  gate_jamb_l: (b, s) => {
    // left jamb x 0..9, the opening to its right is open sky and sand
    const tmp = new Bitmap(TILE, TILE);
    ashlar(tmp, s, 0, TILE, 0.1);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < 10; x++) b.set(x, y, tmp.get(x, y));
      b.set(8, y, SS[2]);
      b.set(9, y, SS[1]); // reveal facing right: in shadow
    }
  },
  gate_jamb_r: (b, s) => {
    const tmp = new Bitmap(TILE, TILE);
    ashlar(tmp, s, 0, TILE, 0.1);
    for (let y = 0; y < TILE; y++) {
      for (let x = 22; x < TILE; x++) b.set(x, y, tmp.get(x, y));
      b.set(22, y, SS[5]); // reveal facing left: catches the low sun
      b.set(23, y, SS[4]);
    }
  },
  gate_base_l: (b, s) => {
    P.gate_jamb_l(b, s);
    // threshold step and sand blown through the doorway
    for (let x = 10; x < TILE; x++) for (let y = 26; y < TILE; y++) b.set(x, y, y === 26 ? SS[5] : rampDither(SS, 3 - (y - 26) * 0.4, x, y));
    footDrift(b, (x) => 20 + 3 * Math.sin(x * 0.2 + 1) + (x < 10 ? 2 : 0), s);
  },
  gate_base_r: (b, s) => {
    P.gate_jamb_r(b, s);
    for (let x = 0; x < 22; x++) for (let y = 26; y < TILE; y++) b.set(x, y, y === 26 ? SS[5] : rampDither(SS, 3 - (y - 26) * 0.4, x, y));
    footDrift(b, (x) => 22 + 2 * Math.sin(x * 0.25 + 2.4), s);
  },

  // --- colonnade
  col_cap: (b, s) => {
    // abacus slab
    for (let y = 0; y < 5; y++) for (let x = 6; x < 26; x++) b.set(x, y, y === 0 ? SS[6] : y === 4 ? SS[1] : rampDither(SS, 4.2 - (x - 6) / 14, x, y));
    // closed papyrus-bud capital, ribbed
    for (let y = 5; y < 22; y++) {
      const k = (y - 5) / 17;
      const half = 7 + 3.4 * Math.sin(Math.PI * (0.25 + k * 0.6)) - k * 1.5;
      for (let x = Math.floor(16 - half); x < Math.ceil(16 + half); x++) {
        const u = (x + 0.5 - 16) / half;
        let v = 4 - u * 1.7 - (Math.abs(((x + 1) % 4) - 2) / 2) * 0.7 + (hash2(x, y, s) - 0.5) * 0.3;
        if (Math.abs(u) > 0.88) v -= 1;
        b.set(x, y, rampDither(SS, v, x, y));
      }
    }
    // painted binding bands at the neck
    const bands = [LAPIS, GILT, RED, GILT, LAPIS];
    bands.forEach((ramp, i) => {
      for (let x = 9; x < 23; x++) b.set(x, 22 + i, x < 13 ? ramp[2] : x > 19 ? ramp[0] : ramp[1]);
    });
    shaft(b, s, 27, TILE);
    const o = outline(b, SS[0]);
    b.blit(o, 0, 0);
  },
  col_shaft: (b, s) => shaft(b, s),
  col_base: (b, s) => {
    shaft(b, s, 0, 22);
    // round base disc, then the drift swallowing it
    for (let y = 22; y < 28; y++) for (let x = 5; x < 27; x++) b.set(x, y, y === 22 ? SS[6] : rampDither(SS, 4 - (x - 5) / 12 - (y - 22) * 0.2, x, y));
    footDrift(b, (x) => 24 + 2 * Math.sin(x * 0.22 + s) - Math.max(0, 6 - Math.abs(x - 16)) * 0.5, s);
  },
  col_broken: (b, s) => {
    const top = (x: number) => 12 + Math.round(4 * Math.sin(x * 0.7 + s) + (x - 9) * 0.35);
    const tmp = new Bitmap(TILE, TILE);
    shaft(tmp, s);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) if (y >= top(x) && tmp.get(x, y) & 255) b.set(x, y, tmp.get(x, y));
    for (let x = 9; x < 23; x++) {
      const t = top(x);
      b.set(x, t, SD[5]);
      b.set(x, t + 1, SD[3]);
    }
  },
  architrave_l: (b, s) => {
    dressed(b, s, 16, TILE);
    for (let x = 0; x < TILE; x++) {
      b.set(x, 16, SS[6]);
      b.set(x, 31, SS[0]);
    }
    for (let y = 16; y < TILE; y++) b.set(0, y, SS[0]);
  },
  architrave_m: (b, s) => {
    dressed(b, s, 16, TILE);
    for (let x = 0; x < TILE; x++) {
      b.set(x, 16, SS[6]);
      b.set(x, 31, SS[0]);
    }
    // cartouche with the king's name
    const tmp = new Bitmap(TILE, TILE);
    tmp.blit(b, 0, 0);
    incise(tmp, (x, y) => (y >= 19 && y <= 28 && (x === 4 || x === 27) && y > 19 && y < 28) || ((y === 19 || y === 28) && x > 4 && x < 27) || glyphAt(x, y, 7, 21, GLYPHS[5]) || glyphAt(x, y, 13, 21, GLYPHS[2]) || glyphAt(x, y, 19, 21, GLYPHS[0]), (x, y) => worn(GILT, x, y, 0.5));
    b.blit(tmp, 0, 0);
  },
  architrave_r: (b, s) => {
    dressed(b, s, 16, TILE);
    for (let x = 0; x < TILE; x++) {
      b.set(x, 16, SS[6]);
      b.set(x, 31, SS[0]);
    }
  },
  architrave_end: (b, s) => {
    // the beam snapped off here
    const end = (y: number) => 14 + Math.round(4 * Math.sin(y * 0.8 + s) + (y - 16) * 0.3);
    const tmp = new Bitmap(TILE, TILE);
    P.architrave_r(tmp, s);
    for (let y = 16; y < TILE; y++) for (let x = 0; x < TILE; x++) if (x < end(y)) b.set(x, y, tmp.get(x, y));
    for (let y = 16; y < TILE; y++) b.set(end(y), y, SS[0]);
    for (let x = 0; x < end(16); x++) b.set(x, 15, SD[4]);
  },
  drift_back: (b, s) => {
    // a dune heaped in a gap of the colonnade, blending the floor into the desert
    footDrift(b, (x) => 12 + 5 * Math.sin((x / 32) * Math.PI + s) + 2 * Math.sin(x * 0.3 + s * 2), s);
  },
};

// ---------------------------------------------------------------------------
// Backdrop: sunset sky, the low sun, cloud streaks, mesas, pyramids, the
// toppled colossus and three ranges of dunes
// ---------------------------------------------------------------------------

const SKY = H(['#160c2a', '#24123a', '#3a1a4a', '#58224e', '#7a2c52', '#a03a50', '#c44e48', '#de6a40', '#ee8a40', '#f6aa4c', '#fcc866', '#ffe08c']);
const SUN_X = 112, SUN_Y = 58;

/** Distance haze: pulls far colors toward the horizon glow. */
const hazeRamp = (cols: string[]) => H(cols);

function pyramid(b: Bitmap, cx: number, base: number, half: number, h: number, lit: RGBA[], shade: RGBA[]) {
  for (let y = Math.floor(base - h); y <= base; y++) {
    const k = (y - (base - h)) / h;
    const hw = half * k;
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
      if (Math.abs(x + 0.5 - cx) > hw) continue;
      const left = x + 0.5 < cx + hw * 0.18; // the ridge sits a little right: we see more of the sunlit face
      const course = (y - Math.floor(base - h)) % 3 === 0;
      const ramp = left ? lit : shade;
      b.set(x, y, rampDither(ramp, (left ? 1.6 - k * 0.6 : 1.2 - k * 0.5) - (course ? 0.5 : 0), x, y));
    }
  }
  // gilded capstone
  b.set(Math.round(cx), Math.floor(base - h), GILT[3]);
  b.set(Math.round(cx) - 1, Math.floor(base - h) + 1, GILT[2]);
  b.set(Math.round(cx), Math.floor(base - h) + 1, GILT[2]);
}

/** Dune range: profile y(x), lit where the slope faces the sun (rising to the right). */
function dunes(b: Bitmap, top: (x: number) => number, ramp: RGBA[], seed: number, y1 = 200) {
  for (let x = 0; x < b.w; x++) {
    const t = top(x);
    const slope = top(x + 2) - top(x - 2);
    const facing = slope < -0.3 ? 1 : slope > 0.3 ? -1 : 0;
    for (let y = Math.max(0, Math.floor(t)); y < Math.min(b.h, y1); y++) {
      const d = y - t;
      let v = 2.1 + facing * 0.9 + Math.min(1.2, d * 0.04) + Math.sin(x * 0.3 + y * 0.9 + Math.sin(x * 0.05) * 3) * 0.18 + (hash2(x, y, seed) - 0.5) * 0.25;
      if (d < 1) v = facing >= 0 ? 4.2 : 2.6; // crest line catches the light
      b.set(x, y, rampDither(ramp, v, x, y));
    }
  }
}

/** The toppled colossus: a king's head in the nemes, buried to the jaw, gazing at the sun. */
function colossus(b: Bitmap, cx: number, cy: number) {
  const STONE = hazeRamp(['#4a2430', '#6e3434', '#985040', '#c07050', '#e09464', '#f4b878']);
  const STRIPE = hazeRamp(['#2a2240', '#3a3058', '#524470']);
  // nemes dome behind the face, tilted
  ellipseFill(b, cx + 6, cy - 2, 30, 24, (x, y, d) => {
    const lx = (x - cx - 6) / 30, ly = (y - cy + 2) / 24;
    const stripe = Math.floor((y - cy + x * 0.25) / 4) % 2 === 0;
    const v = 3.1 - lx * 1.3 - ly * 1.1 - d * 0.6;
    return stripe ? rampDither(STRIPE, v * 0.6, x, y) : rampDither(STONE, v, x, y);
  });
  // face in profile looking left toward the sun
  polyFill(b, [[cx - 22, cy - 14], [cx - 8, cy - 18], [cx + 2, cy - 12], [cx + 4, cy + 10], [cx - 6, cy + 18], [cx - 16, cy + 16], [cx - 20, cy + 6], [cx - 26, cy + 2], [cx - 22, cy - 4]], (x, y) => {
    const lx = (x - cx + 10) / 16;
    return rampDither(STONE, 4.1 - lx * 1.5 - ((y - cy) / 20) * 0.6 + (hash2(x, y, 7) - 0.5) * 0.4, x, y);
  });
  // brow, eye, nose ridge, lips
  line(b, cx - 20, cy - 6, cx - 10, cy - 8, STONE[1]);
  polyFill(b, [[cx - 16, cy - 4], [cx - 9, cy - 5], [cx - 11, cy - 2], [cx - 16, cy - 2]], STONE[0]);
  b.set(cx - 13, cy - 4, STONE[5]);
  line(b, cx - 22, cy - 3, cx - 26, cy + 2, STONE[1]);
  line(b, cx - 23, cy + 7, cx - 17, cy + 7, STONE[1]);
  line(b, cx - 22, cy + 10, cx - 17, cy + 10, STONE[2]);
  // a great crack through the cheek
  let x = cx - 4, y = cy - 16;
  for (let i = 0; i < 30; i++) {
    b.set(Math.round(x), Math.round(y), STONE[0]);
    b.set(Math.round(x) + 1, Math.round(y), STONE[4]);
    x += Math.sin(i * 1.3) * 0.8;
    y += 1;
  }
  // uraeus on the brow, snapped
  polyFill(b, [[cx - 20, cy - 16], [cx - 17, cy - 22], [cx - 14, cy - 17]], STONE[3]);
}

function backdrop(W = 640, Hh = 200): Bitmap {
  const b = new Bitmap(W, Hh);
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const t = Math.min(1, y / 156);
      const glow = Math.max(0, 1 - Math.hypot((x - SUN_X) / 1.7, y - SUN_Y) / 160);
      b.set(x, y, rampDither(SKY, Math.pow(t, 1.12) * (SKY.length - 1) + glow * glow * 2.4, x, y));
    }
  }
  // the first stars in the violet at the top
  const r = rng(13);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * W), y = Math.floor(Math.pow(r(), 2) * 34);
    if (Math.hypot(x - SUN_X, y - SUN_Y) < 120) continue;
    b.set(x, y, withAlpha(hex('#e8d0ff'), 90 + Math.floor(r() * 120)));
  }
  // the sun: banded halo, then the disc
  for (let k = 3; k >= 1; k--) {
    disc(b, SUN_X, SUN_Y, 17 + k * 8, (x, y, d) => (dith(x, y, (1 - d) * 0.55) ? withAlpha(hex(['#ffd070', '#ffb860', '#ff9c58'][k - 1]), 70) : 0));
  }
  disc(b, SUN_X, SUN_Y, 17, (x, y, d) => rampDither(H(['#ffb04a', '#ffd070', '#ffeaa8', '#fff8dc']), 3.4 - d * 2.2, x, y));
  // cloud streaks: dark violet bodies, rims lit from below by the low sun
  const clouds: [number, number, number, number][] = [
    [70, 70, 150, 3],
    [210, 48, 190, 2.5],
    [40, 92, 110, 2],
    [360, 34, 170, 2],
    [450, 80, 210, 3],
    [270, 106, 150, 2],
    [560, 54, 130, 2],
    [140, 120, 120, 1.6],
  ];
  for (const [cx, cy, L, th] of clouds) {
    for (let x = Math.floor(cx - L / 2); x < cx + L / 2; x++) {
      if (x < 0 || x >= W) continue;
      const k = 1 - Math.abs(x - cx) / (L / 2);
      const t = th * (0.3 + 0.7 * Math.sqrt(k)) * (0.8 + 0.2 * Math.sin(x * 0.21 + cy));
      const near = Math.max(0, 1 - Math.hypot(x - SUN_X, cy - SUN_Y) / 260);
      for (let y = Math.floor(cy - t); y <= cy + t * 0.7; y++) {
        if (!dith(x, y, Math.min(1, k * 2.2))) continue;
        const rim = y >= cy + t * 0.7 - 1;
        const col = rim ? (near > 0.4 ? hex('#ffd070') : hex('#f08a50')) : near > 0.5 ? hex('#a04a58') : hex('#5a2448');
        b.set(x, y, col);
      }
    }
  }
  // far mesas on the right horizon
  const MESA = H(['#5a2a48', '#7a3a50', '#a04e54']);
  const mesaTop = (x: number) => {
    if (x < 380) return 999;
    const plateau = [[400, 470, 134], [500, 560, 128], [590, 660, 136]] as const;
    for (const [a, c, h] of plateau) {
      if (x >= a && x <= c) return h + (hash2(x, 0, 5) > 0.85 ? 1 : 0);
      if (x > a - 10 && x < a) return h + (a - x) * 1.6;
      if (x > c && x < c + 10) return h + (x - c) * 1.6;
    }
    return 150;
  };
  for (let x = 0; x < W; x++) {
    const t = Math.round(mesaTop(x));
    for (let y = t; y < 156 && y < Hh; y++) {
      const cliff = mesaTop(x - 2) > t + 3;
      b.set(x, y, cliff ? MESA[2] : y < t + 2 ? MESA[2] : MESA[y < t + 8 ? 1 : 0]);
    }
  }
  // the pyramids: the great one is framed by the gate, a pair beyond the colonnade
  const LIT = H(['#b8603a', '#d8844a', '#f0a860', '#fcc87a']);
  const SHD = H(['#5a2a3a', '#7a3a40', '#984a44']);
  pyramid(b, 322, 156, 54, 56, LIT, SHD);
  pyramid(b, 470, 158, 30, 32, LIT, SHD);
  pyramid(b, 512, 160, 17, 19, LIT, SHD);
  // three ranges of dunes, warmer and brighter toward the viewer
  dunes(b, (x) => 152 + 4 * Math.sin(x * 0.021 + 1) + 3 * Math.sin(x * 0.057 + 0.4), H(['#7a3a3a', '#9a4a3c', '#b85e40', '#d47c4a', '#ec9c58']), 3);
  dunes(b, (x) => 172 + 6 * Math.sin(x * 0.018 + 2.2) + 3 * Math.sin(x * 0.061 + 1.1), H(['#8a4630', '#ac5e38', '#cc7a44', '#e89c52', '#f8bc66']), 5);
  colossus(b, 590, 164);
  // sand heaped against the fallen head
  dunes(b, (x) => (x > 548 && x < 640 ? 180 + 5 * Math.cos((x - 594) * 0.05) + 2 * Math.sin(x * 0.3) : 999), H(['#8a4630', '#ac5e38', '#cc7a44', '#e89c52', '#f8bc66']), 6);
  dunes(b, (x) => 186 + 5 * Math.sin(x * 0.024 + 0.7) + 2 * Math.sin(x * 0.083 + 2), SD.slice(1), 7);
  return b;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Renders shaded primitives into a sprite (statues, urns, drums share the hero renderer). */
function sprite(w: number, h: number, facing: 1 | -1, fn: (d: Draw) => void): Bitmap {
  const f = new Frame(w, h);
  fn(new Draw(f, facing, v(w / 2, h - 1)));
  return f.render({ selout: true });
}

/** Seated jackal of black basalt with a gold collar, on a plinth (faces +x). */
function jackalStatue(facing: 1 | -1): Bitmap {
  return sprite(40, 64, facing, (d) => {
    const st = MAT.jackal, gd = MAT.gold, pl = MAT.sandstone;
    // plinth with a carved band
    d.poly({ mat: pl, z: 1, group: 'plinth' }, [v(-15, 0), v(15, 0), v(15, 14), v(-15, 14)], { kind: 'bevel', w: 2 });
    d.capsule({ mat: pl, z: 1.1, group: 'plinth', line: 'none' }, v(-15, 14), v(15, 14), 1.3, 1.3);
    d.line({ mat: pl, z: 1.2, group: 'plinth', line: 'none' }, v(-12, 7), v(12, 7), SS[1]);
    // haunch, body and chest
    d.ellipse({ mat: st, z: 2, group: 'body' }, v(-5, 22), 9, 7.5, 0);
    d.poly({ mat: st, z: 2.1, group: 'body' }, [v(-8, 16), v(6, 15), v(9, 30), v(6, 38), v(-2, 36), v(-6, 26)], { kind: 'dome', c: v(1, 26), r: 12 });
    // front legs, straight down
    d.capsule({ mat: st, z: 2.2, group: 'legs' }, v(5, 30), v(6, 15.5), 2.3, 2);
    d.capsule({ mat: st, z: 1.9, group: 'legsF', shade: -1 }, v(1, 29), v(2, 15.5), 2.1, 1.9);
    d.ellipse({ mat: st, z: 2.3, group: 'legs' }, v(7.5, 15.5), 3.4, 1.6, 0);
    // tail curled on the plinth
    d.ribbon({ mat: st, z: 1.8, group: 'tail', shade: -1 }, [v(-12, 17), v(-15, 16), v(-15, 15.2)], [1.6, 1.4, 1]);
    // neck and head with the long muzzle
    d.capsule({ mat: st, z: 2.4, group: 'head' }, v(3, 36), v(5, 44), 3.6, 3.2);
    d.ellipse({ mat: st, z: 2.5, group: 'head' }, v(6, 46), 4.6, 4, 0);
    d.poly({ mat: st, z: 2.55, group: 'head' }, [v(8, 48), v(17, 44.5), v(17, 43), v(8, 42.5)], { kind: 'bevel', w: 1.2 });
    // tall ears
    d.poly({ mat: st, z: 2.6, group: 'ear' }, [v(2.4, 48.5), v(3.6, 59), v(6.8, 49.5)], { kind: 'bevel', w: 1.2 });
    d.poly({ mat: st, z: 2.3, group: 'earF', shade: -1 }, [v(0, 48), v(0.6, 57), v(3.4, 49)], { kind: 'bevel', w: 1 });
    // gold collar and eye
    d.capsule({ mat: gd, z: 2.7, group: 'collar' }, v(1.5, 38.5), v(8.5, 37.5), 1.5, 1.5);
    d.pixels({ mat: gd, z: 2.8, group: 'head', outline: false, line: 'none' }, [{ p: v(9, 47), c: GILT[3] }, { p: v(10, 47), c: GILT[2] }]);
  });
}

function urns(): Bitmap {
  return sprite(40, 30, 1, (d) => {
    const jar = (cx: number, h: number, r: number, z: number, band: RGBA[]) => {
      d.ellipse({ mat: MAT.sandstone, z, group: 'jar' + z }, v(cx, h * 0.45), r, h * 0.45, 0);
      d.capsule({ mat: MAT.sandstone, z: z + 0.1, group: 'jar' + z }, v(cx, h * 0.8), v(cx, h), r * 0.42, r * 0.5);
      d.capsule({ mat: MAT.sandstone, z: z + 0.2, group: 'jar' + z, line: 'none', color: band[1] }, v(cx - r * 0.86, h * 0.55), v(cx + r * 0.86, h * 0.55), 0.6, 0.6);
    };
    jar(-9, 20, 6.5, 1, LAPIS);
    jar(8, 16, 5.4, 2, RED);
    jar(-1, 12, 4.4, 3, TURQ);
    // one jar has toppled
    d.ellipse({ mat: MAT.sandstone, z: 0.5, group: 'fallen', shade: -1 }, v(15, 3), 5, 3.4, 10);
  });
}

function drum(): Bitmap {
  return sprite(36, 24, 1, (d) => {
    d.capsule({ mat: MAT.sandstone, z: 1, group: 'drum', tex: (h) => (Math.floor((h.v + 1) * 3) % 2 ? 0 : -1) }, v(-8, 7), v(9, 7), 7, 7, 0.2);
    d.ellipse({ mat: MAT.sandstone, z: 1.2, group: 'face' }, v(-9, 7), 3, 7, 0);
    d.ellipse({ mat: MAT.sandstone, z: 1.3, group: 'face', shade: -1, line: 'none' }, v(-9, 7), 1.4, 3.2, 0);
  });
}

function bones(): Bitmap {
  const b = new Bitmap(34, 16);
  // half-buried: skull, a scatter of ribs and a thighbone
  ellipseFill(b, 8, 8, 5, 4.2, (x, y, d) => rampDither(BONE, 3 - (x - 4) / 6 - (y - 5) / 6 - d * 0.3, x, y));
  b.set(7, 8, BONE[0]);
  b.set(10, 8, BONE[0]);
  b.set(9, 10, BONE[1]);
  for (let k = 0; k < 4; k++) for (let i = 0; i < 6; i++) b.set(15 + k * 3 + Math.round(Math.sin(i * 0.5) * 1.5), 6 + i, i === 0 ? BONE[3] : BONE[2]);
  line(b, 14, 13, 30, 10, BONE[2]);
  line(b, 14, 14, 30, 11, BONE[1]);
  ellipseFill(b, 31, 10, 1.6, 1.6, BONE[3]);
  const o = outline(b, BONE[0]);
  // sand covering the lower part
  for (let x = 0; x < 34; x++) for (let y = 12 + Math.round(Math.sin(x * 0.4) * 1.5); y < 16; y++) if (o.get(x, y) & 255) o.set(x, y, rampDither(SD, 3 + (y - 12) * 0.2, x, y));
  return o;
}

function brazier(): Bitmap {
  const BR = H(['#1a0e06', '#4a2a10', '#7a4a1a', '#ae742c', '#e0aa4a']);
  const b = new Bitmap(28, 30);
  line(b, 6, 14, 3, 29, BR[1]);
  line(b, 7, 14, 4, 29, BR[3]);
  line(b, 21, 14, 24, 29, BR[1]);
  line(b, 20, 14, 23, 29, BR[2]);
  line(b, 14, 16, 14, 28, BR[2]);
  // lion-paw feet
  for (const fx of [3, 24]) b.set(fx, 29, BR[4]);
  ellipseFill(b, 14, 12, 11, 6, (x, y, d) => rampDither(BR, 3.2 - ((x - 3) / 22) * 2 - (y - 6) / 12 + (d > 0.85 ? -1 : 0), x, y));
  ellipseRing(b, 14, 8, 11, 3, 1.5, (x, y, a) => (a < 0 && a > -2.2 ? BR[4] : BR[2]));
  ellipseFill(b, 14, 8, 9, 2, (x, y) => (hash2(x, y, 4) > 0.5 ? FL[2] : FL[1]));
  return outline(b, BR[0]);
}

/** Linen banner with the red sun of the dynasty (waving frames). */
function sunBanner(n = 4): Bitmap[] {
  const LIN = H(['#3a2a1c', '#8a7454', '#c4ae86', '#e8d8b4', '#fbf2dc']);
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(22, 74);
    const ph = (i / n) * Math.PI * 2;
    for (let x = 1; x < 21; x++) {
      b.set(x, 1, GILT[2]);
      b.set(x, 2, GILT[0]);
    }
    for (let y = 3; y < 72; y++) {
      const t = (y - 3) / 69;
      const off = Math.sin(ph + t * 3) * t * 1.6;
      const x0 = Math.round(3 + off), x1 = Math.round(18 + off);
      for (let x = x0; x <= x1; x++) {
        const lx = x - x0;
        const hem = 69 - (lx % 4 === 0 ? 3 : 0);
        if (y > hem) continue;
        let v = 3 - (lx / 15) * 1.5 + Math.sin(lx * 0.9 + ph + y * 0.05) * 0.4;
        if (lx === 0) v += 0.6;
        b.set(x, y, rampDither(LIN, v, x, y));
        // borders in lapis and gold
        if (lx === 1 || lx === 14) b.set(x, y, y % 4 < 2 ? LAPIS[2] : GILT[2]);
      }
      // the red sun disc and its rays
      const scx = 10.5 + Math.sin(ph + ((22 - 3) / 69) * 3) * ((22 - 3) / 69) * 1.6;
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - scx, y + 0.5 - 22);
        if (d < 4.6) b.set(x, y, d < 3.2 ? RED[2] : RED[1]);
        else if (d < 6.2 && Math.floor(Math.atan2(y - 22, x - scx) * 4) % 2 === 0) b.set(x, y, GILT[2]);
      }
      if (y >= 34 && y <= 60 && (y - 34) % 9 < 5) {
        const gx = Math.round(9 + off);
        for (let k = 0; k < 3; k++) b.set(gx + k, y, LAPIS[1]);
      }
    }
    out.push(outline(b, LIN[0]));
  }
  return out;
}

/** Sun mosaic set into the floor: lapis, gilt and turquoise bands round a sun with twelve rays. */
function mosaic(bright: boolean): Bitmap {
  const W = 200, Hh = 64;
  const b = new Bitmap(W, Hh);
  const cx = W / 2, cy = Hh / 2;
  const k = bright ? 1 : 0;
  ellipseFill(b, cx, cy, 96, 29, (x, y, d) => {
    const ang = Math.atan2((y + 0.5 - cy) * 3.3, x + 0.5 - cx);
    // 2px tesserae in two tones
    const t = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 0.55 : 0;
    if (d > 0.965) return FS[1];
    if (d > 0.86) return rampDither(LAPIS, 1 + t + k * 0.9, x, y);
    if (d > 0.8) return rampDither(GILT, 1.2 + t + k, x, y);
    if (d > 0.7) return rampDither(TURQ, 1 + t + k * 0.9, x, y);
    if (d > 0.3) {
      const f = ((ang / (Math.PI * 2)) * 12 + 12.5) % 1;
      const ray = Math.abs(f - 0.5) < 0.24 * (1 - (d - 0.3) / 0.45);
      return ray ? rampDither(GILT, 1.6 + t + k, x, y) : rampDither(RED, 0.6 + t + k * 0.9, x, y);
    }
    return rampDither(GILT, 2 + (1 - d / 0.3) * 0.9 + k * 0.6, x, y);
  });
  return b;
}

function obelisk(): Bitmap {
  const W = 34, Hh = 150;
  const b = new Bitmap(W, Hh);
  const top = (x: number) => 16 + Math.round(6 * Math.sin(x * 0.5) + (x > 18 ? (x - 18) * 0.7 : 0));
  for (let y = 0; y < Hh; y++) {
    const t = y / Hh;
    const half = 8 + t * 4;
    for (let x = Math.floor(17 - half); x < Math.ceil(17 + half); x++) {
      if (y < top(x)) continue;
      const lx = (x + 0.5 - 17) / half;
      let v = 4.2 - lx * 1.6 - t * 0.5 + (hash2(x, y, 9) - 0.5) * 0.35;
      if (lx > 0.15) v -= 1.2; // the shadowed face
      b.set(x, y, rampDither(SS, v, x, y));
    }
  }
  // a column of glyphs down the lit face
  const tmp = new Bitmap(W, Hh);
  tmp.blit(b, 0, 0);
  const picks = [0, 2, 5, 1, 7, 3, 6, 4, 0, 2, 5, 1, 7].map((i) => GLYPHS[i]);
  incise(tmp, (x, y) => (b.get(x, y) & 255) !== 0 && y > 26 && picks.some((g, i) => glyphAt(x, y, 10, 28 + i * 9, g)), (x, y) => worn(GILT, x, y, 0.4));
  // drift at the foot
  for (let x = 0; x < W; x++) {
    const t = Hh - 10 - Math.round(Math.sin(x * 0.2) * 3 + Math.max(0, 8 - Math.abs(x - 17)) * 0.3);
    for (let y = t; y < Hh; y++) tmp.set(x, y, y === t ? SD[5] : rampDither(SD, 3.4 - (y - t) * 0.06, x, y));
  }
  return outline(tmp, SS[0]);
}

/** Date palm leaning in from the left edge; fronds sway over the frames. */
function palm(n = 3): Bitmap[] {
  const W = 120, Hh = 240;
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, Hh);
    const sway = Math.sin((i / n) * Math.PI * 2) * 2;
    // trunk: curved, diamond bark of old leaf bases
    const trunk = (t: number) => ({ x: 22 + Math.sin(t * 1.6) * 10 + t * 22, y: Hh - 1 - t * 170 });
    for (let s = 0; s <= 170; s++) {
      const t = s / 170;
      const p = trunk(t);
      const half = 6.5 - t * 2.2;
      for (let x = Math.floor(p.x - half); x <= p.x + half; x++) {
        const u = (x + 0.5 - p.x) / half;
        const scale = Math.floor(s / 5) % 2 === 0 ? (Math.abs(u - 0.2) < 0.5 ? 1 : 0) : 0;
        b.set(x, Math.round(p.y), rampDither(BARK, 3.2 - u * 1.6 + scale * 0.8 - (s % 5 === 0 ? 1 : 0), x, Math.round(p.y)));
      }
    }
    const crown = trunk(1);
    // dates hanging under the crown
    for (let k = 0; k < 9; k++) disc(b, crown.x + 6 + (k % 3) * 2.4, crown.y + 8 + Math.floor(k / 3) * 2.2, 1.4, (x, y, d) => (d < 0.5 ? hex('#c06a20') : hex('#7a3a14')));
    // fronds: arching spines with leaflets, lit on the upper-left
    const fronds: [number, number, number][] = [[150, 60, 0.9], [120, 58, 1], [95, 52, 0.8], [70, 56, 1], [40, 60, 1.1], [10, 54, 1], [-20, 48, 0.9], [200, 50, 0.8], [175, 56, 1]];
    fronds.forEach(([ang0, len, droop], fi) => {
      let x = crown.x, y = crown.y;
      let a = (ang0 * Math.PI) / 180;
      for (let s = 0; s < len; s++) {
        const k = s / len;
        a += droop * 0.035 * Math.cos(a) * (1 + k) * (Math.cos(a) > 0 ? 1 : -1) * 0.6 + 0.012 * droop;
        x += Math.cos(a);
        y -= Math.sin(a) - k * 0.55;
        const tipSway = k * k * sway * (fi % 2 ? 1 : -1);
        const px = Math.round(x + tipSway), py = Math.round(y);
        b.set(px, py, PALM[1]);
        // leaflets on both sides of the spine
        const leaf = Math.max(1, Math.round((1 - Math.abs(k - 0.45) * 1.6) * 9));
        for (const side of [-1, 1]) {
          const la = a + side * 1.9 - 0.5;
          for (let q = 1; q <= leaf; q++) {
            const lx = Math.round(px + Math.cos(la) * q * 0.9), ly = Math.round(py - Math.sin(la) * q * 0.9 + q * 0.35);
            const lit = side < 0 ? 4 : 2;
            if (s % 2 === 0 || q < 3) b.set(lx, ly, PALM[Math.max(1, lit - Math.floor(q / 4))]);
          }
        }
      }
    });
    out.push(outline(b, PALM[0]));
  }
  return out;
}

/** Sand pouring from a break in the wall top: a ribbon of sand, loose grains, a heap at the foot. */
function sandfall(n = 4): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(20, 96);
    for (let y = 0; y < 86; y++) {
      const spread = 1 + y / 60;
      const cx = 9 + Math.sin(y * 0.12 + i * 1.6) * 0.7 + (y / 86) * 1.5;
      for (let x = Math.floor(cx - spread); x <= Math.ceil(cx + spread); x++) {
        const u = (x + 0.5 - cx) / spread;
        if (Math.abs(u) > 1) continue;
        const pulse = (y + i * 6) % 14 < 2 && Math.abs(u) > 0.3;
        if (pulse) continue;
        b.set(x, y, SD[Math.abs(u) < 0.35 ? 5 : u < 0 ? 4 : 2]);
      }
    }
    const r = rng(i * 13 + 5);
    for (let k = 0; k < 14; k++) {
      const y = Math.floor(r() * 84), x = Math.round(9 + (r() - 0.5) * (3 + y / 18));
      b.set(x, y, SD[r() < 0.5 ? 4 : 3]);
    }
    // the heap where it lands, with a puff
    ellipseFill(b, 10, 92, 9, 4, (x, y, d) => rampDither(SD, 4 - d * 1.6 - (y - 88) * 0.15, x, y));
    for (let k = 0; k < 8; k++) {
      const a = Math.PI + r() * Math.PI, d = 3 + r() * 6;
      b.set(Math.round(10 + Math.cos(a) * d), Math.round(88 + Math.sin(a) * d * 0.5), SD[4]);
    }
    out.push(b);
  }
  return out;
}

/** Vulture silhouette, three wingbeat frames (runtime circles them in the sky). */
function vulture(): Bitmap[] {
  const shapes = [
    ['#.....#....#.....#', '##...###..###...##', '.##..#########..##', '..#############...', '.....#######......', '......#.#.#.......'],
    ['..................', '#####........#####', '.##############.##', '...###########....', '.....#######......', '......#.#.#.......'],
    ['..................', '..................', '..##############..', '.################.', '##...#######...###', '#.....#.#.#.....##'],
  ];
  return shapes.map((rows) => {
    const b = new Bitmap(18, 7);
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && b.set(x, y + 1, y < 2 ? BIRD[2] : BIRD[1])));
    return b;
  });
}

// ---------------------------------------------------------------------------
// Layout + export
// ---------------------------------------------------------------------------

function layout(id: (n: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] } {
  const ground: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const wall: number[] = new Array(MAP_COLS * MAP_ROWS).fill(-1);
  const set = (layer: number[], c: number, r: number, n: string) => (layer[r * MAP_COLS + c] = id(n));
  const r = rng(77);
  const floors = ['floor_a', 'floor_b', 'floor_c', 'floor_d', 'floor_f', 'floor_a', 'floor_b', 'floor_e', 'floor_d', 'sand_patch_a', 'sand_patch_b'];
  for (let row = 6; row < MAP_ROWS; row++) {
    for (let c = 0; c < MAP_COLS; c++) {
      let n = floors[Math.floor(r() * floors.length)];
      // a great drift sweeps in from the lower-left, another along the right edge
      const leftEdge = row >= 9 ? 2 : row >= 8 ? 1 : 0;
      const rightEdge = row >= 7 ? 18 : 19;
      if (c < leftEdge) n = 'sand_full';
      else if (c === leftEdge) n = 'sand_left';
      else if (c > rightEdge) n = 'sand_full';
      else if (c === rightEdge) n = 'sand_right';
      else if (row === 6 && (c >= 13 || r() < 0.3)) n = 'sand_top';
      else if (row === MAP_ROWS - 1 && r() < 0.55) n = 'sand_bottom';
      set(ground, c, row, n);
    }
  }
  // temple wall (cols 0-6): offering scenes facing each other across a glyph column
  for (let c = 0; c <= 6; c++) {
    set(wall, c, 2, c === 0 || c === 4 ? 'wall_broken' : 'wall_cornice');
    set(wall, c, 5, 'wall_base');
  }
  set(wall, 0, 3, 'wall_glyphs');
  set(wall, 0, 4, 'wall_dark');
  set(wall, 1, 3, 'relief_a_tl');
  set(wall, 2, 3, 'relief_a_tr');
  set(wall, 1, 4, 'relief_a_bl');
  set(wall, 2, 4, 'relief_a_br');
  set(wall, 3, 3, 'wall_glyphs');
  set(wall, 3, 4, 'wall_glyphs2');
  set(wall, 4, 3, 'relief_b_tl');
  set(wall, 5, 3, 'relief_b_tr');
  set(wall, 4, 4, 'relief_b_bl');
  set(wall, 5, 4, 'relief_b_br');
  set(wall, 6, 3, 'wall');
  set(wall, 6, 4, 'wall_dark');
  // the pylon gate (cols 7-12): towers rise into row 1, the doorway frames the pyramid
  set(wall, 7, 1, 'pylon_cap_l');
  set(wall, 8, 1, 'pylon_cap');
  set(wall, 11, 1, 'pylon_cap');
  set(wall, 12, 1, 'pylon_cap_r');
  for (const rr of [2, 3, 4]) {
    set(wall, 7, rr, 'pylon_edge_l');
    set(wall, 8, rr, 'pylon_face');
    set(wall, 11, rr, 'pylon_face');
    set(wall, 12, rr, 'pylon_edge_r');
  }
  for (const c of [7, 8, 11, 12]) set(wall, c, 5, 'pylon_base');
  set(wall, 9, 1, 'gate_cap_l');
  set(wall, 10, 1, 'gate_cap_r');
  set(wall, 9, 2, 'gate_lintel_l');
  set(wall, 10, 2, 'gate_lintel_r');
  for (const rr of [3, 4]) {
    set(wall, 9, rr, 'gate_jamb_l');
    set(wall, 10, rr, 'gate_jamb_r');
  }
  set(wall, 9, 5, 'gate_base_l');
  set(wall, 10, 5, 'gate_base_r');
  // the ruined colonnade (cols 13-19)
  set(wall, 13, 1, 'architrave_l');
  set(wall, 14, 1, 'architrave_m');
  set(wall, 15, 1, 'architrave_r');
  set(wall, 16, 1, 'architrave_r');
  set(wall, 17, 1, 'architrave_end');
  for (const c of [13, 16]) {
    set(wall, c, 2, 'col_cap');
    set(wall, c, 3, 'col_shaft');
    set(wall, c, 4, 'col_shaft');
    set(wall, c, 5, 'col_base');
  }
  set(wall, 19, 3, 'col_broken');
  set(wall, 19, 4, 'col_shaft');
  set(wall, 19, 5, 'col_base');
  for (const c of [14, 15, 17, 18]) set(wall, c, 5, 'drift_back');
  const props: PropPlacement[] = [
    { kind: 'sandfall', x: 4 * TILE + 14, y: 2 * TILE + 8, layer: 'back' },
    { kind: 'sunbanner', x: 7 * TILE + 21, y: TILE + 22, layer: 'back' },
    { kind: 'sunbanner', x: 11 * TILE + 21, y: TILE + 22, layer: 'back' },
    { kind: 'jackal_r', x: 8 * TILE + 16, y: 197, layer: 'back' },
    { kind: 'jackal_l', x: 11 * TILE + 16, y: 197, layer: 'back' },
    { kind: 'brazier', x: 98, y: 214, layer: 'floor' },
    { kind: 'brazier', x: 586, y: 214, layer: 'floor' },
    { kind: 'urns', x: 190, y: 202, layer: 'floor' },
    { kind: 'drum', x: 470, y: 206, layer: 'floor' },
    { kind: 'bones', x: 566, y: 334, layer: 'floor' },
    { kind: 'mosaic', x: 320, y: 262, layer: 'floor' },
    { kind: 'palm', x: 34, y: 362, layer: 'fg' },
    { kind: 'obelisk', x: 624, y: 360, layer: 'fg' },
  ];
  return { ground, wall, props };
}

/** 2x2 tile pieces cut from a 64x64 painting. */
function quarter(paint: (seed: number) => Bitmap, part: 'tl' | 'tr' | 'bl' | 'br'): Painter {
  return (b, s) => b.blit(paint(s - (part === 'tr' ? 1 : part === 'bl' ? 2 : part === 'br' ? 3 : 0)), 0, 0, { src: { x: part.endsWith('r') ? TILE : 0, y: part.startsWith('b') ? TILE : 0, w: TILE, h: TILE } });
}
for (const q of ['tl', 'tr', 'bl', 'br'] as const) {
  P['relief_a_' + q] = quarter(() => offeringScene(1, 5), q);
  P['relief_b_' + q] = quarter(() => offeringScene(-1, 9), q);
}

export const sunscar: ZoneArt = {
  id: 'sunscar',
  name: 'Sunscar Ruins',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    brazier: [brazier()],
    flame: flames(FL),
    sunbanner: sunBanner(),
    jackal_r: [jackalStatue(1)],
    jackal_l: [jackalStatue(-1)],
    urns: [urns()],
    drum: [drum()],
    bones: [bones()],
    mosaic: [mosaic(false), mosaic(true)],
    obelisk: [obelisk()],
    palm: palm(),
    sandfall: sandfall(),
    bird: vulture(),
  }),
  kinds: {
    brazier: { anchor: [0.5, 1], mode: 'static', fire: { dy: -30 } },
    flame: { anchor: [0.5, 1], mode: 'loop', ms: 90 },
    sunbanner: { anchor: [0.5, 0], mode: 'loop', ms: 170 },
    jackal_r: { anchor: [0.5, 1], mode: 'static' },
    jackal_l: { anchor: [0.5, 1], mode: 'static' },
    urns: { anchor: [0.5, 1], mode: 'static' },
    drum: { anchor: [0.5, 1], mode: 'static' },
    bones: { anchor: [0.5, 1], mode: 'static' },
    mosaic: { anchor: [0.5, 0.5], mode: 'pulse' },
    obelisk: { anchor: [0.5, 1], mode: 'static' },
    palm: { anchor: [0.5, 1], mode: 'loop', ms: 420 },
    sandfall: { anchor: [0.5, 0], mode: 'loop', ms: 80 },
    bird: { anchor: [0.5, 0.5], mode: 'loop', ms: 140 },
  },
  layout,
  horizon: 152,
};
