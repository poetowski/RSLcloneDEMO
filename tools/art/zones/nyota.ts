// Zone "Nyota Skyforge": the terrace of the star-smiths on the high plateau
// at cosmic dusk. A wall painted in the bold geometric style of the plateau
// (with circuit lines of hard light run through the paint) on the left, a
// Sahelian mud-brick gate tower in the middle whose arch holds a star portal,
// and light pylons on the right where the terrace opens onto the void:
// floating islands, a sky-tower beam and the mesas of the city. The bright
// star hangs in the upper-left: the same key light as every sprite.
import { MAT } from '../palette.ts';
import { dith, disc, ellipseFill, ellipseRing, line, outline, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, hex, RGBA, rng } from '../raster.ts';
import { Frame } from '../render.ts';
import { Draw, v } from '../rig.ts';
import { flames, MAP_COLS, MAP_ROWS, Painter, PropPlacement, TILE, ZoneArt } from './shared.ts';

const H = (list: string[]) => list.map((h) => hex(h));

// --- palette -------------------------------------------------------------------
// mud plaster (laterite) 0 outline .. 6 lit by the star
const AD = H(['#2a0e08', '#5a2414', '#84391e', '#a8522a', '#c46e38', '#dc8c4c', '#f0b070']);
// whitewash ground of the painted wall
const WA = H(['#3a2a34', '#7a6670', '#b4a29e', '#dccdc2', '#f4e8dc', '#fffaf2']);
const INK = hex('#140c14');
// flat paints of the wall: magenta, teal, gold, indigo (dark, base, light)
const PM = H(['#6a1050', '#b02a88', '#e058b0']);
const PT = H(['#0e5a56', '#1e9488', '#5ccab8']);
const PG = H(['#8c5214', '#d8a030', '#f6d070']);
const PI = H(['#1e2464', '#34449a', '#5a6ccc']);
// polished terrace stone 0..6: dusky lavender-grey, catching the sky
const ST = H(['#1a1220', '#2c2034', '#3e2e48', '#54405c', '#6c5672', '#88708c', '#a890a8']);
const GI = H(['#4a2408', '#8c5214', '#c88a22', '#efc04a', '#fff3a8']);
// hard light, the same cyan as MAT.glowCyan
const HL = H(['#0e5a5a', '#18908a', '#36d0c0', '#90f5e2', '#e8fff8']);
const EB = H(['#0c080e', '#1c1420', '#2e2230', '#463640', '#62504e', '#8a7468']);
const BARK = H(['#24140e', '#40261a', '#5e3c28', '#80563a', '#a6764e', '#c89a6a']);
const LEAF = H(['#0e1a0c', '#1a3214', '#2a4c1e', '#3e6a28', '#5a8a34']);

// ---------------------------------------------------------------------------
// Plaster and paint
// ---------------------------------------------------------------------------

/** Hand-smoothed mud plaster: soft undulations, rain streaks, a few pits. */
function plaster(b: Bitmap, seed: number, y0 = 0, y1 = TILE, dark = 0, x0 = 0, x1 = TILE) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let v = 3.5 - dark + (hash2(x >> 2, y >> 2, seed) - 0.5) * 0.45 + (hash2(x, y, seed + 1) - 0.5) * 0.4;
      if (hash2(x, 0, seed + 2) > 0.88) v -= 0.4 * (0.6 + 0.4 * Math.sin(y * 0.35 + x));
      if (hash2(x, y, seed + 3) > 0.988) v -= 1.3;
      b.set(x, y, rampDither(AD, v, x, y));
    }
  }
}

/** Toron: the palm-wood beam ends that stud Sahelian mud walls, each with its shadow down-right. */
function toron(b: Bitmap, x: number, y: number) {
  for (const [dx, dy] of [[3, 2], [3, 3], [2, 3], [3, 4], [4, 3], [4, 4]]) b.set(x + dx, y + dy, AD[1]);
  b.set(x, y, BARK[4]);
  b.set(x + 1, y, BARK[3]);
  b.set(x + 2, y, BARK[2]);
  b.set(x, y + 1, BARK[3]);
  b.set(x + 1, y + 1, BARK[3]);
  b.set(x + 2, y + 1, BARK[1]);
  b.set(x, y + 2, BARK[2]);
  b.set(x + 1, y + 2, BARK[1]);
  b.set(x + 2, y + 2, BARK[0]);
}

/** Whitewash ground of a painted wall: lit from the upper left. */
function wash(b: Bitmap, seed: number, x0: number, y0: number, w: number, h: number) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const v = 3.4 - ((x - x0) / w) * 0.5 - ((y - y0) / h) * 0.35 + (hash2(x, y, seed) - 0.5) * 0.35 - (hash2(x >> 3, y >> 3, seed + 4) > 0.8 ? 0.4 : 0);
      b.set(x, y, rampDither(WA, v, x, y));
    }
  }
}

/** A flat-painted shape with its black outline, the way the wall painters work. */
function paint(b: Bitmap, pts: [number, number][], col: RGBA) {
  const tmp = new Bitmap(b.w, b.h);
  polyFill(tmp, pts, col);
  const o = outline(tmp, INK);
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const c = o.get(x, y);
      if (!(c & 255)) continue;
      // paint wears thin where the wall weathers
      if (c !== INK && hash2(x, y, 61) > 0.97) continue;
      b.set(x, y, c);
    }
  }
}

const rect = (x: number, y: number, w: number, h: number): [number, number][] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

/** The circuit of hard light the star-smiths ran through the paint: a glowing line with nodes. */
function circuit(b: Bitmap, y: number, x0 = 0, x1 = b.w, phase = 0) {
  for (let x = x0; x < x1; x++) {
    b.set(x, y, HL[3]);
    b.set(x, y + 1, HL[1]);
    if ((x + phase) % 16 === 5) {
      b.set(x, y - 1, HL[4]);
      b.set(x + 1, y - 1, HL[3]);
      b.set(x + 1, y, HL[4]);
      b.set(x, y + 2, HL[1]);
      b.set(x + 1, y + 2, HL[0]);
    }
  }
}

/** One 64x64 painted panel of the wall (three designs). */
function panel(kind: number, seed: number): Bitmap {
  const S = 64;
  const b = new Bitmap(S, S);
  wash(b, seed, 0, 0, S, S);
  // border: ink, a band of colored blocks, ink
  paint(b, rect(2, 6, 59, 51), INK);
  wash(b, seed + 1, 4, 8, 56, 48);
  const blocks = [PM[1], PG[1], PT[1], PI[1]];
  for (let i = 0; i < 14; i++) {
    const x = 4 + i * 4;
    paint(b, rect(x, 8, 3, 3), blocks[(i + kind) % 4]);
    paint(b, rect(x, 52, 3, 3), blocks[(i + kind + 2) % 4]);
  }
  if (kind === 0) {
    // the stepped gable (a house of the city) with its door, between rising chevrons
    paint(b, [[20, 48], [20, 30], [24, 30], [24, 24], [28, 24], [28, 18], [36, 18], [36, 24], [40, 24], [40, 30], [44, 30], [44, 48]], PM[1]);
    paint(b, [[24, 48], [24, 34], [40, 34], [40, 48]], WA[4]);
    paint(b, rect(29, 37, 6, 11), PT[1]);
    paint(b, rect(30, 22, 4, 4), PG[2]);
    for (const x of [7, 49]) {
      for (let k = 0; k < 3; k++) paint(b, [[x, 46 - k * 11], [x + 4, 38 - k * 11], [x + 8, 46 - k * 11], [x + 6, 46 - k * 11], [x + 4, 42 - k * 11], [x + 2, 46 - k * 11]], k % 2 ? PI[1] : PG[1]);
    }
  } else if (kind === 1) {
    // nested stepped diamonds between two ladders
    paint(b, [[32, 14], [46, 31], [32, 48], [18, 31]], PI[1]);
    paint(b, [[32, 19], [42, 31], [32, 43], [22, 31]], PG[1]);
    paint(b, [[32, 24], [37, 31], [32, 38], [27, 31]], PM[1]);
    paint(b, rect(31, 30, 2, 2), WA[5]);
    for (const x of [6, 52]) {
      paint(b, rect(x, 14, 6, 34), INK);
      for (let y = 16; y < 46; y += 5) paint(b, rect(x + 1, y, 4, 2), (y / 5) % 2 < 1 ? PT[1] : PM[1]);
    }
  } else {
    // the star of Nyota over a field of indigo, magenta corners
    paint(b, rect(14, 14, 36, 36), PI[1]);
    for (const [x, y, sx, sy] of [[14, 14, 1, 1], [50, 14, -1, 1], [14, 50, 1, -1], [50, 50, -1, -1]] as const) paint(b, [[x, y], [x + sx * 9, y], [x, y + sy * 9]], PM[1]);
    paint(b, [[32, 15], [35, 29], [49, 32], [35, 35], [32, 49], [29, 35], [15, 32], [29, 29]], PG[1]);
    paint(b, [[32, 23], [33.5, 30.5], [41, 32], [33.5, 33.5], [32, 41], [30.5, 33.5], [23, 32], [30.5, 30.5]], PG[2]);
    for (const x of [6, 54]) for (let y = 16; y < 48; y += 8) paint(b, [[x, y], [x + 2, y + 3], [x, y + 6], [x - 2, y + 3]], PT[1]);
  }
  // the paint takes the light too: lift the upper-left of every color, sink the lower-right
  for (let y = 1; y < S - 1; y++) {
    for (let x = 1; x < S - 1; x++) {
      const c = b.get(x, y);
      for (const ramp of [PM, PT, PG, PI]) {
        if (c !== ramp[1]) continue;
        if (b.get(x - 1, y) === INK || b.get(x, y - 1) === INK) b.set(x, y, ramp[2]);
        else if (b.get(x + 1, y) === INK || b.get(x, y + 1) === INK) b.set(x, y, ramp[0]);
      }
    }
  }
  circuit(b, 2, 0, S, kind * 5);
  circuit(b, 60, 0, S, kind * 5 + 8);
  return b;
}

// ---------------------------------------------------------------------------
// Floor
// ---------------------------------------------------------------------------

/** Polished slab: its own tone, a sheen streak from the sky, gold or dark joints, teal studs at some corners. */
function slab(b: Bitmap, x0: number, y0: number, w: number, h: number, seed: number, crack = false) {
  const r = rng(seed);
  const tone = 3.0 + (r() - 0.5) * 0.9;
  const gold = r() < 0.3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const X = x0 + x, Y = y0 + y;
      if (x === w - 1 || y === h - 1) {
        b.set(X, Y, gold ? (hash2(X, Y, seed) < 0.85 ? GI[2] : GI[1]) : ST[1]);
        continue;
      }
      let v = tone;
      if (y === 0) v += 0.9;
      else if (x === 0) v += 0.5;
      if (y === h - 2) v -= 0.7;
      else if (x === w - 2) v -= 0.4;
      // the sheen: a soft diagonal band of reflected sky
      const sheen = Math.max(0, 1 - Math.abs(((x - y * 0.8 + seed * 3) % 24) - 12) / 4);
      v += sheen * 0.7 + (hash2(X, Y, seed) - 0.5) * 0.25 - ((x / w) * 0.25 + (y / h) * 0.35);
      b.set(X, Y, rampDither(ST, v, X, Y));
    }
  }
  if (gold && w >= 16 && h >= 16 && r() < 0.5) {
    // a glowing stud where four slabs meet
    const X = x0 + w - 1, Y = y0 + h - 1;
    b.set(X, Y, HL[4]);
    b.set(X - 1, Y, HL[2]);
    b.set(X, Y - 1, HL[2]);
  }
  if (crack) {
    // a fine crack (one tile variant only: tiles repeat across the floor)
    let cx = x0 + 2 + Math.floor(r() * (w - 4)), cy = y0 + 1;
    for (let i = 0; i < h - 3; i++) {
      if (cx > x0 && cx < x0 + w - 2) b.set(cx, cy, ST[1]);
      cy++;
      cx += r() < 0.33 ? -1 : r() < 0.5 ? 1 : 0;
    }
  }
}

function floorLayout(rects: [number, number, number, number][], crack = false): Painter {
  return (b, seed) => rects.forEach(([x, y, w, h], i) => slab(b, x, y, w, h, seed * 31 + i * 7, crack && i === 0));
}

// ---------------------------------------------------------------------------
// Architecture pieces
// ---------------------------------------------------------------------------

/** Rounded Sahelian merlon (pinnacle) between x0..x1, rising from `base` to `top`; returns the mask test. */
function pinnacle(b: Bitmap, cx: number, base: number, top: number, half: number, seed: number) {
  for (let y = top; y < base; y++) {
    const k = (y - top) / (base - top);
    const hw = half * Math.min(1, 0.35 + Math.sqrt(k) * 0.75);
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
      if (Math.abs(x + 0.5 - cx) > hw || x < 0 || x >= b.w) continue;
      const lx = (x + 0.5 - cx) / hw;
      const v = 4.1 - lx * 1.4 - k * 0.5 + (hash2(x, y, seed) - 0.5) * 0.4;
      b.set(x, y, rampDither(AD, v, x, y));
    }
  }
}

/** Glowing orb finial (the star-smiths' answer to the ostrich egg). */
function finial(b: Bitmap, cx: number, cy: number) {
  disc(b, cx, cy, 2.6, (x, y, d) => rampDither(GI, 4.2 - d * 2 - (x - cx + y - cy) * 0.25, x, y));
  b.set(Math.round(cx) - 1, Math.round(cy) - 1, GI[4]);
  b.set(Math.round(cx), Math.round(cy) - 4, HL[3]);
  b.set(Math.round(cx), Math.round(cy) - 5, HL[2]);
}

/** Tower face: plaster with rows of toron. */
function towerFace(b: Bitmap, seed: number, y0 = 0, y1 = TILE, dark = 0, shift = 0) {
  plaster(b, seed, y0, y1, dark);
  for (let row = 0; row < 4; row++) {
    const y = 4 + row * 9;
    if (y < y0 || y > y1 - 5) continue;
    for (let x = 3 + ((row + shift) % 2) * 6; x < TILE - 4; x += 12) toron(b, x, y);
  }
}

/** Vertical rounded edge of a battered tower: highlight on the lit (left) edge, shadow on the right. */
function towerEdge(b: Bitmap, side: 'l' | 'r', y0 = 0, y1 = TILE) {
  for (let y = y0; y < y1; y++) {
    if (side === 'l') {
      b.set(0, y, AD[0]);
      b.set(1, y, AD[6]);
      b.set(2, y, AD[5]);
    } else {
      b.set(29, y, AD[2]);
      b.set(30, y, AD[1]);
      b.set(31, y, AD[0]);
    }
  }
}

/** Ebony pylon shaft with gold bands and a seam of hard light (cx centered in a 32px tile). */
function pylonShaft(b: Bitmap, y0: number, y1: number, half = 5, cx = 16) {
  for (let y = y0; y < y1; y++) {
    for (let x = cx - half; x <= cx + half; x++) {
      const lx = (x - cx) / half;
      let c = rampDither(EB, 3.4 - lx * 1.6, x, y);
      if (Math.abs(x - cx - 1) < 0.5) c = HL[(y >> 1) % 6 === 0 ? 4 : 3];
      if (x === cx - half || x === cx + half) c = EB[0];
      b.set(x, y, c);
    }
    if (y % 16 === 6) for (let x = cx - half - 1; x <= cx + half + 1; x++) b.set(x, y, x <= cx ? GI[3] : GI[2]);
    if (y % 16 === 7) for (let x = cx - half - 1; x <= cx + half + 1; x++) b.set(x, y, GI[1]);
  }
}

const P: Record<string, Painter> = {
  // --- floor
  floor_a: floorLayout([[0, 0, 16, 16], [16, 0, 16, 16], [0, 16, 16, 16], [16, 16, 16, 16]]),
  floor_b: floorLayout([[0, 0, 32, 16], [0, 16, 16, 16], [16, 16, 16, 16]]),
  floor_c: floorLayout([[0, 0, 16, 32], [16, 0, 16, 16], [16, 16, 16, 16]]),
  floor_d: floorLayout([[0, 0, 20, 14], [20, 0, 12, 14], [0, 14, 12, 18], [12, 14, 20, 18]]),
  floor_e: floorLayout([[0, 0, 32, 32]]),
  floor_f: floorLayout([[0, 0, 11, 16], [11, 0, 21, 16], [0, 16, 21, 16], [21, 16, 11, 16]]),
  floor_g: floorLayout([[0, 0, 16, 16], [16, 0, 16, 32], [0, 16, 16, 16]]),
  floor_h: floorLayout([[0, 0, 32, 20], [0, 20, 32, 12]]),
  floor_i: floorLayout([[0, 0, 24, 16], [24, 0, 8, 16], [0, 16, 8, 16], [8, 16, 24, 16]]),
  floor_cracked: floorLayout([[0, 0, 32, 16], [0, 16, 16, 16], [16, 16, 16, 16]], true),
  floor_top: (b, s) => {
    // the first course along the wall: a gold border inlaid with a line of light
    floorLayout([[0, 6, 16, 26], [16, 6, 16, 26]])(b, s);
    for (let x = 0; x < TILE; x++) {
      for (let y = 0; y < 6; y++) b.set(x, y, y === 0 ? GI[1] : y === 5 ? GI[0] : y === 1 ? GI[4] : rampDither(GI, 3 - y * 0.35, x, y));
      if (x % 8 === 3) b.set(x, 3, HL[4]);
    }
  },

  // --- painted wall (left)
  wall_parapet: (b, s) => {
    // rounded merlons along the top, the plaster below; the circuit at the bottom joins the panels
    for (let k = 0; k < 2; k++) pinnacle(b, 8 + k * 16, 16, 3, 5, s + k);
    plaster(b, s, 14, TILE, 0.1);
    for (let x = 0; x < TILE; x++) b.set(x, 14, AD[5]);
    for (const x of [4, 20]) toron(b, x, 20);
  },
  wall_plain: (b, s) => {
    plaster(b, s);
    circuit(b, 2, 0, TILE, 3);
    toron(b, 12, 14);
  },
  wall_plain_low: (b, s) => {
    plaster(b, s, 0, TILE, 0.15);
    circuit(b, 28, 0, TILE, 11);
    // a wooden water spout (canal) pokes out of the wall
    for (let x = 8; x < 20; x++) {
      b.set(x, 10, BARK[4]);
      b.set(x, 11, BARK[3]);
      b.set(x, 12, BARK[1]);
    }
    for (let y = 13; y < 22; y++) b.set(19 + ((y - 13) >> 2), y, AD[2]);
  },
  wall_base: (b, s) => {
    plaster(b, s, 0, TILE, 0.55);
    for (let x = 0; x < TILE; x++) {
      b.set(x, 0, AD[5]);
      b.set(x, 1, AD[4]);
      // a painted band of the city's colors along the plinth
      for (let y = 8; y < 13; y++) b.set(x, y, y === 8 || y === 12 ? INK : [PM[1], PG[1], PT[1], PI[1]][Math.floor((x + 2) / 8) % 4]);
      for (let y = 26; y < TILE; y++) b.set(x, y, rampDither(AD, 1.6 - (y - 26) * 0.1, x, y));
    }
  },

  // --- gate towers
  tower_top_l: (b, s) => {
    pinnacle(b, 9, 20, 4, 6, s);
    pinnacle(b, 25, 20, 7, 5, s + 1);
    towerFace(b, s, 18, TILE, 0.05);
    for (let x = 0; x < TILE; x++) b.set(x, 18, AD[5]);
    towerEdge(b, 'l', 18);
    finial(b, 9, 3);
    finial(b, 25, 6);
  },
  tower_top_r: (b, s) => {
    pinnacle(b, 7, 20, 7, 5, s);
    pinnacle(b, 23, 20, 4, 6, s + 1);
    towerFace(b, s, 18, TILE, 0.3);
    for (let x = 0; x < TILE; x++) b.set(x, 18, AD[4]);
    towerEdge(b, 'r', 18);
    finial(b, 7, 6);
    finial(b, 23, 3);
  },
  tower_l: (b, s) => {
    towerFace(b, s, 0, TILE, 0.05, 0);
    towerEdge(b, 'l');
  },
  tower_m: (b, s) => towerFace(b, s, 0, TILE, 0.15, 1),
  tower_r: (b, s) => {
    towerFace(b, s, 0, TILE, 0.35, 0);
    towerEdge(b, 'r');
  },
  tower_base_l: (b, s) => {
    plaster(b, s, 0, TILE, 0.5);
    towerEdge(b, 'l');
    for (let x = 0; x < TILE; x++) for (let y = 24; y < TILE; y++) b.set(x, y, rampDither(AD, 1.8 - (y - 24) * 0.1, x, y));
  },
  tower_base_r: (b, s) => {
    plaster(b, s, 0, TILE, 0.7);
    towerEdge(b, 'r');
    for (let x = 0; x < TILE; x++) for (let y = 24; y < TILE; y++) b.set(x, y, rampDither(AD, 1.5 - (y - 24) * 0.1, x, y));
  },

  // --- the star gate between the towers
  gate_cap_l: (b, s) => gateCap(b, s, 0),
  gate_cap_r: (b, s) => gateCap(b, s, 1),
  arch_l: (b, s) => arch(b, s, 0, 0),
  arch_r: (b, s) => arch(b, s, 1, 0),
  jamb_l: (b, s) => arch(b, s, 0, 1),
  jamb_r: (b, s) => arch(b, s, 1, 1),
  jamb_low_l: (b, s) => arch(b, s, 0, 2),
  jamb_low_r: (b, s) => arch(b, s, 1, 2),
  step_l: (b, s) => gateStep(b, s, 0),
  step_r: (b, s) => gateStep(b, s, 1),

  // --- the open side: pylons and the balustrade
  pylon_tip: (b) => {
    // a cut crystal of hard light on a gold collar
    polyFill(b, [[16, 2], [20, 12], [16, 22], [12, 12]], (x, y) => rampDither(HL, 4.3 - Math.abs(x + 0.5 - 15) * 0.35 - (y - 2) * 0.06, x, y));
    line(b, 16, 3, 16, 21, HL[4]);
    b.blit(outline(b, HL[0]), 0, 0);
    for (let x = 9; x <= 23; x++) {
      b.set(x, 23, x < 16 ? GI[4] : GI[3]);
      b.set(x, 24, GI[2]);
      b.set(x, 25, GI[1]);
    }
    pylonShaft(b, 26, TILE, 5);
  },
  pylon: (b) => pylonShaft(b, 0, TILE, 5),
  balustrade: (b, s) => balustrade(b, s, false),
  balustrade_pylon: (b, s) => balustrade(b, s, true),
};

function gateCap(b: Bitmap, seed: number, side: 0 | 1) {
  // the lintel block over the gate, crowned by the gold star of Nyota at the join
  plaster(b, seed, 12, TILE, side ? 0.25 : 0.05);
  pinnacle(b, side ? 6 : 26, 14, 6, 4, seed);
  for (let x = 0; x < TILE; x++) b.set(x, 12, AD[5]);
  const cx = side ? 0 : 32;
  polyFill(b, [[cx, 13], [cx + 2.2, 19.6], [cx + 9, 22], [cx + 2.2, 24.4], [cx, 31], [cx - 2.2, 24.4], [cx - 9, 22], [cx - 2.2, 19.6]], (x, y) => rampDither(GI, 3.6 - (x - cx) * 0.15 - (y - 22) * 0.12, x, y));
  for (let y = 15; y < 30; y++) b.set(side ? 0 : 31, y, (y & 1) ? GI[4] : GI[3]);
}

/** The gate: part 0 = arch top, 1 = jamb, 2 = lower jamb; the opening is dark (the portal prop fills it). */
function arch(b: Bitmap, seed: number, side: 0 | 1, part: 0 | 1 | 2) {
  // opening: x 8..32 on the left tile and 0..24 on the right; arch circle center (32, 30), radius 24
  const cx = side ? 0 : 32, cyA = 30, R = 24;
  const tmp = new Bitmap(TILE, TILE);
  towerFace(tmp, seed, 0, TILE, side ? 0.3 : 0.1, side);
  for (let y = 0; y < TILE; y++) {
    const Y = y + part * TILE;
    for (let x = 0; x < TILE; x++) {
      const dx = x + 0.5 - cx;
      const inside = Y >= cyA ? Math.abs(dx) < R : Math.hypot(dx, Y + 0.5 - cyA) < R;
      const rim = Y >= cyA ? Math.abs(dx) < R + 3 : Math.hypot(dx, Y + 0.5 - cyA) < R + 3;
      if (inside) {
        // the void behind the portal: deep indigo, darkest at the center
        const d = Math.hypot(dx / R, (Y - 44) / 40);
        b.set(x, y, rampDither(H(['#08061a', '#120c2e', '#1c1444']), 1.6 - d * 1.2, x, y));
      } else if (rim) {
        // a gold frame round the opening, lit on its upper-left
        const lit = (dx > 0 && side === 1) || (Y < cyA && dx < 0 && side === 0) ? 0 : 1;
        b.set(x, y, Math.abs((Y >= cyA ? Math.abs(dx) : Math.hypot(dx, Y + 0.5 - cyA)) - R - 1.5) < 0.8 ? GI[4 - lit * 2] : GI[2 + lit]);
      } else b.set(x, y, tmp.get(x, y));
    }
  }
}

function gateStep(b: Bitmap, seed: number, side: 0 | 1) {
  plaster(b, seed, 0, TILE, side ? 0.6 : 0.4);
  const x0 = side ? 0 : 8, x1 = side ? 24 : 32;
  for (let k = 0; k < 3; k++) {
    const y = 8 + k * 8;
    const a = x0 - (side ? 0 : k * 2), c = x1 + (side ? k * 2 : 0);
    for (let x = Math.max(0, a); x < Math.min(TILE, c); x++) {
      for (let yy = y; yy < y + 8; yy++) b.set(x, yy, yy === y ? ST[6] : rampDither(ST, 3.6 - (yy - y) * 0.3 - k * 0.2, x, yy));
      b.set(x, y + 1, (x % 6 === 2 && k === 0) ? HL[4] : GI[3]);
    }
  }
}

function balustrade(b: Bitmap, seed: number, withPylon: boolean) {
  // a low mud wall with a gold rail; light balusters glow between the posts
  plaster(b, seed, 14, TILE, 0.35);
  for (let x = 0; x < TILE; x++) {
    b.set(x, 13, GI[1]);
    b.set(x, 12, GI[4]);
    b.set(x, 11, GI[3]);
    b.set(x, 10, GI[1]);
    for (let y = 26; y < TILE; y++) b.set(x, y, rampDither(AD, 1.8 - (y - 26) * 0.1, x, y));
  }
  for (const x of [4, 12, 20, 28]) for (let y = 15; y < 25; y++) b.set(x, y, y % 3 === 0 ? HL[4] : HL[2]);
  if (withPylon) pylonShaft(b, 0, 26, 5);
}

// ---------------------------------------------------------------------------
// Backdrop: cosmic dusk, the bright star, the galaxy band, a ringed world, the
// sky-tower beam, floating islands and the lit mesas of the city
// ---------------------------------------------------------------------------

const SKY = H(['#0a0620', '#140a32', '#1e0e46', '#2c1258', '#3e1666', '#561a70', '#741e74', '#962870', '#b8386a', '#d65062', '#ec7458', '#fa9c56']);
const STAR_X = 96, STAR_Y = 40;

function backdrop(W = 640, Hh = 200): Bitmap {
  const b = new Bitmap(W, Hh);
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const t = Math.min(1, y / 158);
      const glow = Math.max(0, 1 - Math.hypot((x - STAR_X) / 1.5, y - STAR_Y) / 150);
      b.set(x, y, rampDither(SKY, Math.pow(t, 1.25) * (SKY.length - 1) + glow * glow * 2.2, x, y));
    }
  }
  // the galaxy band: a river of dust and light across the upper sky
  const NEB = H(['#2a1458', '#3e1c72', '#4e2c8a', '#3e5ca0', '#7aa8d0']);
  const bandY = (x: number) => 6 + (x - 120) * 0.1 + Math.sin(x * 0.012) * 8;
  for (let x = 0; x < W; x++) {
    const c = bandY(x);
    for (let y = Math.max(0, Math.floor(c - 18)); y < Math.min(Hh, c + 18); y++) {
      const d = Math.abs(y - c) / 18;
      const n = hash2(x >> 2, y >> 2, 5) * 0.6 + hash2(x >> 1, y >> 1, 6) * 0.4;
      const k = (1 - d * d) * (0.45 + n * 0.6) - (Math.hypot(x - STAR_X, y - STAR_Y) < 60 ? 0.6 : 0);
      if (k < 0.3 || !dith(x, y, Math.min(1, (k - 0.3) * 1.6))) continue;
      b.set(x, y, NEB[Math.min(4, Math.floor(k * 2.6 + n * 1.2))]);
    }
  }
  // stars: dense in the band, scattered elsewhere, none in the star's glare
  const r = rng(31);
  const STARS = H(['#8a7ab8', '#c8c0f0', '#ffffff', '#a8f0f0', '#ffe0a8']);
  for (let i = 0; i < 420; i++) {
    const x = Math.floor(r() * W);
    const inBand = r() < 0.55;
    const y = inBand ? Math.floor(bandY(x) + (r() - 0.5) * 30) : Math.floor(Math.pow(r(), 1.6) * 120);
    if (y < 0 || y >= 130 || Math.hypot(x - STAR_X, y - STAR_Y) < 46) continue;
    const c = STARS[Math.floor(r() * 5)];
    b.set(x, y, c);
    if (r() < 0.06) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, STARS[0]);
  }
  // the bright star: banded halo, rays, white core
  for (let k = 3; k >= 1; k--) disc(b, STAR_X, STAR_Y, 9 + k * 7, (x, y, d) => (dith(x, y, (1 - d) * 0.5) ? H(['#ffe8b0', '#f8c8a0', '#e8a0b0'])[k - 1] : 0));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    for (let s = 6; s < (k % 2 ? 20 : 28); s++) b.set(Math.round(STAR_X + Math.cos(a) * s), Math.round(STAR_Y + Math.sin(a) * s), s < 14 ? hex('#fff4d0') : hex('#ffd8a0'));
  }
  disc(b, STAR_X, STAR_Y, 8, (x, y, d) => rampDither(H(['#ffc070', '#ffe0a0', '#fff6e0', '#ffffff']), 3.6 - d * 2.4, x, y));
  // the ringed world in the upper right, lit from the star
  ringedWorld(b, 548, 46);
  // the sky-tower: a needle on the far plateau, framed by the gap between the gate tower and the first pylon
  skyTower(b, 432, 150);
  // the mesas of the city, lights in the cliffs
  mesas(b);
  // floating islands drifting above the plain (distant ones; a near one is a prop)
  // (only where the architecture leaves the sky open: one hidden behind a tower or the near island just leaves a stray sliver)
  for (const [x, y, s] of [[612, 92, 0.75]] as const) farIsland(b, x, y, s);
  return b;
}

function ringedWorld(b: Bitmap, cx: number, cy: number) {
  const R = 22;
  const PL = H(['#1a0e2e', '#2e1a48', '#4a2a62', '#6e3e78', '#9a5a86', '#c88a98', '#ecc0a8']);
  const RING = H(['#5a3a6a', '#9a7a9a', '#d8c0c0']);
  const tilt = -0.2;
  const ringPx = (front: boolean) => {
    for (let a = 0; a < Math.PI * 2; a += 0.004) {
      const isFront = Math.sin(a) > 0;
      if (isFront !== front) continue;
      for (const [rr, c] of [[R * 1.7, 1], [R * 1.85, 2], [R * 2.0, 1], [R * 2.1, 0]] as const) {
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.26;
        const X = Math.round(cx + x * Math.cos(tilt) - y * Math.sin(tilt)), Y = Math.round(cy + x * Math.sin(tilt) + y * Math.cos(tilt));
        // the ring is in the planet's shadow behind it on the far side
        b.set(X, Y, RING[x > R * 0.3 && !front ? 0 : c]);
      }
    }
  };
  ringPx(false);
  disc(b, cx, cy, R, (x, y, d) => {
    const lx = (x + 0.5 - cx) / R, ly = (y + 0.5 - cy) / R;
    const band = Math.sin((ly - lx * 0.2) * 9) * 0.3;
    return rampDither(PL, 4.6 - (lx + 0.25) * 2.6 - ly * 1.2 + band - d * 0.4, x, y);
  });
  ringPx(true);
}

function skyTower(b: Bitmap, cx: number, base: number) {
  // a beacon of hard light rising from the tip and dissolving into the sky
  const tip = base - 73, reach = 52;
  for (let y = tip - reach; y < tip; y++) {
    const k = (tip - y) / reach; // 0 at the tip .. 1 where it fades out
    for (let x = cx - 1; x <= cx + 1; x++) {
      const side = x !== cx;
      if (!dith(x, y, (1 - k) * (side ? 0.45 : 1.15))) continue;
      b.set(x, y, side ? HL[1] : HL[k < 0.3 ? 4 : k < 0.65 ? 3 : 2]);
    }
  }
  // the needle: slender, flaring at the base, rings of light along it
  for (let y = base - 72; y < base; y++) {
    const k = (y - (base - 72)) / 72;
    const half = 1 + k * k * 4;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      if (Math.abs(x + 0.5 - cx) > half) continue;
      b.set(x, y, x + 0.5 < cx ? hex('#5a3a6a') : hex('#2e1e44'));
    }
    if ((y - (base - 72)) % 12 === 0) for (let x = Math.floor(cx - half - 1); x <= Math.ceil(cx + half + 1); x++) b.set(x, y, HL[3]);
  }
  disc(b, cx + 0.5, base - 73, 2.2, (x, y, d) => rampDither(HL, 4.2 - d * 1.5, x, y));
}

function mesas(b: Bitmap) {
  const FAR = H(['#2a1440', '#3e1c52', '#562a62']);
  const NEAR = H(['#3a1838', '#5a2840', '#7e3a48', '#a4524c']);
  const top = (x: number, far: boolean) => {
    const plateaus: [number, number, number][] = far
      ? [[330, 430, 142], [450, 540, 136], [560, 650, 140]]
      : [[380, 470, 150], [520, 600, 147], [610, 660, 152]];
    for (const [a, c, h] of plateaus) {
      if (x >= a && x <= c) return h + (hash2(x, far ? 1 : 2, 5) > 0.85 ? 1 : 0);
      if (x > a - 8 && x < a) return h + (a - x) * 2;
      if (x > c && x < c + 8) return h + (x - c) * 2;
    }
    return far ? 154 : 160;
  };
  for (const far of [true, false]) {
    for (let x = 0; x < b.w; x++) {
      const t = Math.round(top(x, far));
      for (let y = t; y < b.h; y++) {
        const lit = top(x - 2, far) > t + 3;
        const R = far ? FAR : NEAR;
        b.set(x, y, lit || y < t + 2 ? R[R.length - 1] : rampDither(R, (far ? 1.4 : 2.2) - (y - t) * 0.03, x, y));
      }
    }
  }
  // the city in the cliffs: windows of gold and hard light
  const r = rng(47);
  for (let i = 0; i < 90; i++) {
    const x = 330 + Math.floor(r() * 310), y = 146 + Math.floor(r() * 30);
    if (y < top(x, false) + 2 && y < top(x, true) + 2) continue;
    b.set(x, y, r() < 0.7 ? hex('#ffd070') : HL[3]);
  }
  // the plain far below the plateau, catching the last light
  const PLAIN = H(['#6a2a48', '#8a3a4a', '#b0524c', '#d0704e']);
  for (let x = 0; x < b.w; x++) {
    const t = 164 + Math.round(Math.sin(x * 0.03) * 2);
    for (let y = t; y < b.h; y++) if (top(x, false) > y) b.set(x, y, rampDither(PLAIN, 2.6 - (y - t) * 0.05, x, y));
  }
}

function farIsland(b: Bitmap, cx: number, cy: number, s: number) {
  const ROCK = H(['#2a1838', '#46284a', '#6a3e58']);
  const GRASS = H(['#2a4a3a', '#3e6a44']);
  const w = 34 * s, h = 26 * s;
  polyFill(b, [[cx - w, cy], [cx + w, cy], [cx + w * 0.4, cy + h * 0.6], [cx, cy + h], [cx - w * 0.5, cy + h * 0.5]], (x, y) => rampDither(ROCK, 2 - (x - cx) / w - (y - cy) / h, x, y));
  for (let x = Math.floor(cx - w); x <= cx + w; x++) {
    b.set(x, cy, GRASS[1]);
    b.set(x, cy - 1, GRASS[hash2(x, 1, 3) > 0.5 ? 1 : 0]);
  }
  // a thread of falling water, solid where it leaves the rock, thinning into spray
  const wx = Math.round(cx + w * 0.55), len = h + 14 * s;
  for (let k = 1; k < len; k++) {
    const y = Math.round(cy + k);
    if (k / len > 0.55 && !dith(wx, y, 1 - (k / len - 0.55) / 0.45)) continue;
    b.set(wx, y, hex(k < 4 ? '#e8f8ff' : '#a8d8f0'));
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

function sprite(w: number, h: number, facing: 1 | -1, fn: (d: Draw) => void): Bitmap {
  const f = new Frame(w, h);
  fn(new Draw(f, facing, v(w / 2, h - 1)));
  return f.render({ selout: true });
}

/** Plasma brazier: gold tripod with curled feet, an ebony bowl brimming with hard light. */
function brazier(): Bitmap {
  return sprite(28, 32, 1, (d) => {
    const g = MAT.gold, e = MAT.ebony;
    for (const [x0, x1, z] of [[-9, -5, 1.2], [9, 5, 1.1], [0, 0, 1]] as const) {
      d.capsule({ mat: g, z, group: 'leg' + x0, shade: x0 > 0 ? -1 : 0 }, v(x0, 1.5), v(x1, 16), 1, 1);
      d.circle({ mat: g, z: z + 0.05, group: 'leg' + x0 }, v(x0 + (x0 < 0 ? -1 : x0 > 0 ? 1 : 0), 1.5), 1.4);
    }
    d.ellipse({ mat: e, z: 2, group: 'bowl' }, v(0, 19), 11, 5.6, 0);
    d.capsule({ mat: g, z: 2.1, group: 'bowl', line: 'none' }, v(-11, 22), v(11, 22), 1.1, 1.1);
    d.ellipse({ mat: MAT.glowCyan, z: 2.2, group: 'plasma' }, v(0, 23), 9.4, 2, 0);
  });
}

/** Kente banner: woven strips of gold, magenta, teal and black, hanging from a gold rod (waving frames). */
function kenteBanner(n = 4): Bitmap[] {
  const out: Bitmap[] = [];
  const BLK = H(['#141018', '#2a2230']);
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(24, 80);
    const ph = (i / n) * Math.PI * 2;
    for (let x = 0; x < 24; x++) {
      b.set(x, 1, GI[3]);
      b.set(x, 2, GI[1]);
    }
    b.set(0, 1, GI[4]);
    for (let y = 3; y < 78; y++) {
      const t = (y - 3) / 75;
      const off = Math.sin(ph + t * 3.2) * t * 1.8;
      const x0 = Math.round(3 + off), x1 = Math.round(20 + off);
      for (let x = x0; x <= x1; x++) {
        const lx = x - x0;
        // fringe at the bottom
        if (y > 72 && lx % 2 === 1) continue;
        if (y > 75) continue;
        const block = Math.floor((y - 3) / 12);
        const strip = Math.floor(lx / 6);
        // kente: warp stripes in one block, weft bars in the next, a checkerboard of the two
        const warp = (block + strip) % 2 === 0;
        let c: RGBA;
        if (warp) c = lx % 6 === 2 || lx % 6 === 3 ? (block % 3 === 0 ? PM[1] : block % 3 === 1 ? PT[1] : PI[1]) : GI[3];
        else c = (y - 3) % 4 < 2 ? BLK[0] : (block % 2 ? PM[1] : PT[1]);
        if ((y - 3) % 12 === 0) c = BLK[1];
        // folds: shade the fabric with the wave
        const fold = Math.sin(lx * 0.8 + ph + y * 0.05);
        if (fold < -0.6 && c === GI[3]) c = GI[2];
        if (lx === 0) c = c === GI[3] ? GI[4] : c;
        b.set(x, y, c);
      }
    }
    out.push(outline(b, BLK[0]));
  }
  return out;
}

/** The star portal: rings of hard light around a four-point star, stars beyond (frame 1 = bright). */
function portal(bright: boolean): Bitmap {
  const W = 48, Hh = 78;
  const b = new Bitmap(W, Hh);
  const cx = 24, cy = 42;
  const inside = (x: number, y: number) => (y >= 30 ? Math.abs(x + 0.5 - cx) < 23 : Math.hypot(x + 0.5 - cx, y + 0.5 - 30) < 23);
  const k = bright ? 1 : 0;
  for (let y = 7; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const d = Math.hypot((x + 0.5 - cx) / 22, (y + 0.5 - cy) / 34);
      // swirling bands of light
      const ang = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
      const swirl = Math.sin(d * 14 - ang * 2 + (bright ? 1.2 : 0));
      const v = 1.2 + (1 - d) * 1.6 + swirl * 0.5 + k * 0.5;
      if (!dith(x, y, Math.min(1, 0.45 + (1 - d) * 0.8))) continue;
      b.set(x, y, rampDither(HL, v, x, y));
    }
  }
  // the star at the heart of the gate
  const R = bright ? 15 : 12;
  polyFill(b, [[cx, cy - R], [cx + 3, cy - 3], [cx + R * 0.7, cy], [cx + 3, cy + 3], [cx, cy + R], [cx - 3, cy + 3], [cx - R * 0.7, cy], [cx - 3, cy - 3]], (x, y) => rampDither(HL, 4.5 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R * 2.6 + k * 0.4, x, y));
  ellipseRing(b, cx, cy, 15 + k * 2, 22 + k * 3, 1, (x, y) => (inside(x, y) ? GI[3 + k] : 0));
  return b;
}

/** A floating island bobbing over the void: rock, grass, an acacia and a waterfall breaking into mist. */
function island(n = 4): Bitmap[] {
  const out: Bitmap[] = [];
  const ROCK = H(['#1e1024', '#3a2236', '#583448', '#7a4a58', '#a06a6a']);
  const GR = H(['#1e3a1e', '#2e5a28', '#4a7e30', '#6aa040']);
  const WATER = H(['#3a6a9a', '#6aa8d8', '#a8e0f8', '#f0ffff']);
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(72, 104);
    const bob = Math.round(Math.sin((i / n) * Math.PI * 2) * 1.5);
    const top = 30 + bob;
    // rock: an inverted, ragged cone, lit from the upper left
    polyFill(b, [[6, top], [62, top], [58, top + 10], [50, top + 22], [40, top + 38], [34, top + 44], [28, top + 32], [18, top + 20], [10, top + 12]], (x, y) => {
      const lx = (x - 34) / 28;
      return rampDither(ROCK, 3.2 - lx * 1.5 - (y - top) / 26 + (hash2(x >> 1, y >> 1, 3) - 0.5) * 0.6, x, y);
    });
    // grass cap
    for (let x = 6; x <= 62; x++) {
      const t = top - (hash2(x, 2, 9) > 0.6 ? 1 : 0);
      b.set(x, t, GR[x < 30 ? 3 : 2]);
      b.set(x, t + 1, GR[1]);
      b.set(x, t + 2, GR[0]);
    }
    // a flat-topped acacia
    for (let y = top - 18; y < top; y++) b.set(24 + Math.round((y - top) * -0.15), y, BARK[2]);
    ellipseFill(b, 22, top - 20, 13, 3.2, (x, y, d) => rampDither(GR, 3 - (x - 10) / 16 - (y - (top - 22)) / 4 - d * 0.4, x, y));
    const solid = outline(b, ROCK[0]);
    waterfall(solid, top, i, WATER);
    out.push(solid);
  }
  return out;
}

/**
 * Water pouring off the island's right lip: a ribbon that arcs away from the
 * rock with streaks running down it frame by frame, thinning out as it falls
 * and breaking up into a cloud of spray. Drawn without an outline, like light.
 */
function waterfall(b: Bitmap, top: number, frame: number, WATER: RGBA[]) {
  const x0 = 57, fall = 46;
  for (let y = top + 1; y <= top + fall; y++) {
    const k = (y - top) / fall; // 0 at the lip .. 1 where it breaks up
    const cx = x0 + Math.sqrt(k) * 2.5;
    const half = 1.1 + k * 1.3;
    for (let x = Math.floor(cx - half - 1); x <= Math.ceil(cx + half + 1); x++) {
      const u = Math.abs(x + 0.5 - cx) / half;
      if (u > 1) continue;
      if (k > 0.6 && !dith(x, y, 1 - (k - 0.6) / 0.4)) continue;
      const streak = (((y - frame * 3 + (x & 1) * 2) % 5) + 5) % 5 === 0;
      b.set(x, y, u > 0.72 ? WATER[1] : streak ? WATER[2] : WATER[3]);
    }
  }
  const sy = top + fall + 3;
  ellipseFill(b, x0 + 3, sy, 8, 3.5, (x, y, d) => (dith(x, y, (1 - d) * 1.4) ? WATER[d < 0.5 ? 3 : 2] : 0));
  const r = rng(frame * 7 + 3);
  for (let k = 0; k < 6; k++) b.set(Math.round(x0 + 3 + (r() - 0.5) * 16), Math.round(sy - 2 + (r() - 0.5) * 8), WATER[3]);
}

/** Drums of the griots: two djembes and a talking drum on its side. */
function drums(): Bitmap {
  return sprite(44, 28, 1, (d) => {
    const dj = (x: number, h: number, r: number, z: number) => {
      d.poly({ mat: MAT.calabash, z, group: 'dj' + x }, [v(x - r, h), v(x + r, h), v(x + r * 0.4, h * 0.5), v(x + r * 0.55, 0), v(x - r * 0.55, 0), v(x - r * 0.4, h * 0.5)], { kind: 'cyl', a: v(x - r, h / 2), b: v(x + r, h / 2), r, bevel: 1 });
      d.ellipse({ mat: MAT.linen, z: z + 0.1, group: 'dj' + x }, v(x, h), r, r * 0.3, 0);
      d.capsule({ mat: MAT.gold, z: z + 0.15, group: 'dj' + x, line: 'none' }, v(x - r, h - 1.6), v(x + r, h - 1.6), 0.7, 0.7);
    };
    dj(-11, 20, 7, 1);
    dj(4, 15, 5.5, 2);
    d.capsule({ mat: MAT.terracotta, z: 3, group: 'talk', tex: (h) => (Math.floor((h.u * 10)) % 2 ? 0 : -1) }, v(10, 4), v(20, 4), 4, 4, 0.2);
    d.ellipse({ mat: MAT.linen, z: 3.1, group: 'talk' }, v(20.5, 4), 1.6, 4.2, 0);
  });
}

/** The star-map inlaid in the floor: gold rings, constellations and points of hard light (frame 1 = bright). */
function starmap(bright: boolean): Bitmap {
  const W = 208, Hh = 66;
  const b = new Bitmap(W, Hh);
  const cx = W / 2, cy = Hh / 2;
  const k = bright ? 1 : 0;
  const DEEP = H(['#100a24', '#1a1238', '#261a4c']);
  ellipseFill(b, cx, cy, 100, 30, (x, y, d) => {
    if (d > 0.965) return ST[1];
    if (d > 0.9) return rampDither(GI, 1.8 + k * 0.8 + (x < cx ? 0.6 : 0), x, y);
    if (d > 0.86) return DEEP[0];
    if (d > 0.62 && d < 0.66) return rampDither(GI, 1.4 + k * 0.8, x, y);
    // a night sky set in stone, with a faint band of the galaxy
    const band = Math.abs((y - cy) * 3.3 - (x - cx) * 0.4) < 14 ? 1 : 0;
    return DEEP[Math.min(2, band + (hash2(x, y, 3) > 0.9 ? 1 : 0))];
  });
  // constellations: a few figures of stars joined by fine gold lines
  const figs: [number, number][][] = [
    [[-62, -6], [-48, -14], [-36, -8], [-30, 4], [-44, 10]],
    [[18, -16], [30, -10], [44, -14], [54, -4]],
    [[30, 8], [46, 12], [60, 6]],
    [[-14, 14], [-2, 18], [10, 12]],
  ];
  for (const f of figs) {
    for (let i = 0; i < f.length - 1; i++) line(b, cx + f[i][0], cy + f[i][1] * 0.95, cx + f[i + 1][0], cy + f[i + 1][1] * 0.95, GI[1 + k]);
    for (const [x, y] of f) {
      const X = Math.round(cx + x), Y = Math.round(cy + y * 0.95);
      b.set(X, Y, HL[3 + k]);
      if (bright) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(X + dx, Y + dy, HL[2]);
    }
  }
  // the star of Nyota at the center
  const R = 9;
  polyFill(b, [[cx, cy - R * 0.62], [cx + 2.4, cy - 2], [cx + R * 1.9, cy], [cx + 2.4, cy + 2], [cx, cy + R * 0.62], [cx - 2.4, cy + 2], [cx - R * 1.9, cy], [cx - 2.4, cy - 2]], (x, y) => rampDither(GI, 3.4 + k * 0.8 - Math.abs(x + 0.5 - cx) / 14, x, y));
  b.set(Math.round(cx), Math.round(cy), HL[4]);
  return b;
}

/** The baobab at the left edge: a vast bottle trunk of smooth bark and a crown of stubby, root-like branches (sway frames). */
function baobab(n = 3): Bitmap[] {
  const W = 120, Hh = 260;
  const BB = H(['#1a1216', '#33262a', '#4e3c3e', '#6a5452', '#887068', '#a88e80']);
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(W, Hh);
    const sway = Math.sin((i / n) * Math.PI * 2) * 1.2;
    // trunk: a swollen bottle mostly beyond the left edge of the screen
    for (let y = 92; y < Hh; y++) {
      const t = (y - 92) / (Hh - 92);
      const half = 16 + Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.6) * 24 + t * 6;
      const cx = 8;
      for (let x = 0; x <= cx + half; x++) {
        const u = (x + 0.5 - cx) / half;
        // smooth bark with long shallow folds, lit from the left
        const fold = Math.sin(x * 0.35 + Math.sin(y * 0.03) * 3) * 0.25;
        b.set(x, y, rampDither(BB, 3.4 - u * 1.9 + fold + (hash2(x >> 1, y >> 2, 5) - 0.5) * 0.25, x, y));
      }
    }
    // the crown: short thick branches splaying like roots against the sky
    const branches: [number, number, number, number, number][] = [
      [10, 98, -100, 34, 7],
      [20, 96, -70, 40, 6.5],
      [30, 100, -40, 44, 6],
      [36, 108, -12, 40, 5],
      [4, 100, -128, 26, 6],
    ];
    const tips: [number, number][] = [];
    for (const [x0, y0, a0, len, th] of branches) {
      let x = x0, y = y0, a = (a0 * Math.PI) / 180;
      for (let s2 = 0; s2 < len; s2++) {
        const k = s2 / len;
        a += Math.sin(s2 * 0.2 + x0) * 0.03;
        x += Math.cos(a);
        y += Math.sin(a);
        const t = th * (1 - k * 0.65);
        disc(b, x, y, t, (xx, yy, dd) => rampDither(BB, 3.5 - ((xx - x) / t) * 0.9 - dd * 0.5, xx, yy));
        // forks near the end
        if (s2 === Math.floor(len * 0.7)) tips.push([x + Math.cos(a - 0.9) * 8, y + Math.sin(a - 0.9) * 8]);
      }
      tips.push([x, y]);
    }
    // sparse leaf tufts at the twig ends
    tips.forEach(([x, y], k) => {
      const cx = x + sway * (k % 2 ? 1 : -1);
      ellipseFill(b, cx, y - 2, 8, 4.5, (xx, yy, d) => (hash2(xx, yy, 7 + k) > 0.4 ? rampDither(LEAF, 3.6 - (xx - cx + 8) / 9 - (yy - y + 6) / 7 - d * 0.6, xx, yy) : 0));
    });
    out.push(outline(b, BB[0]));
  }
  return out;
}

/** A light pylon at the right edge (frame 1 = the crystal at full glow). */
function pylonFg(bright: boolean): Bitmap {
  const W = 30, Hh = 210;
  const b = new Bitmap(W, Hh);
  const cx = 15;
  for (let y = 24; y < Hh; y++) {
    const half = 6 + (y > Hh - 30 ? (y - (Hh - 30)) * 0.25 : 0);
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const lx = (x + 0.5 - cx) / half;
      if (Math.abs(lx) > 1) continue;
      let c = rampDither(EB, 3.6 - lx * 1.8, x, y);
      if (Math.abs(x - cx - 1) < 0.6) c = HL[bright ? 4 : 3];
      b.set(x, y, c);
    }
    if (y % 22 === 4) for (let x = Math.floor(cx - half - 1); x <= cx + half + 1; x++) b.set(x, y, x < cx ? GI[4] : GI[2]);
    if (y % 22 === 5) for (let x = Math.floor(cx - half - 1); x <= cx + half + 1; x++) b.set(x, y, GI[1]);
  }
  polyFill(b, [[cx, 0], [cx + 6, 12], [cx, 24], [cx - 6, 12]], (x, y) => rampDither(HL, 4.4 - Math.abs(x + 0.5 - cx) * 0.3 - y * 0.03 + (bright ? 0.4 : -0.3), x, y));
  for (let x = cx - 8; x <= cx + 8; x++) {
    b.set(x, 24, x < cx ? GI[4] : GI[3]);
    b.set(x, 25, GI[1]);
  }
  return outline(b, EB[0]);
}

/** Sky-skiffs gliding over the city (the runtime circles them like birds). */
function skiff(): Bitmap[] {
  const shapes = [
    ['......###.........', '.....#####........', '..##############..', '.################.', '..##############..'],
    ['......###.........', '.....#####........', '..##############..', '.################.', '..##############..'],
    ['.....####.........', '.....#####........', '..##############..', '.################.', '..##############..'],
  ];
  const HULL = H(['#1a0e1e', '#3a2032', '#5a3044']);
  return shapes.map((rows, i) => {
    const b = new Bitmap(19, 7);
    rows.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && b.set(x, y + 1, y < 2 ? GI[2] : HULL[y === 3 ? 2 : 1])));
    // engine glow at the stern
    b.set(0, 4, HL[i === 1 ? 4 : 3]);
    b.set(0, 5, HL[2]);
    if (i !== 2) b.set(1, 3, HL[2]);
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
  const r = rng(91);
  const floors = ['floor_a', 'floor_b', 'floor_c', 'floor_d', 'floor_e', 'floor_f', 'floor_g', 'floor_h', 'floor_i', 'floor_a', 'floor_b', 'floor_g', 'floor_i', 'floor_cracked'];
  for (let row = 6; row < MAP_ROWS; row++) {
    for (let c = 0; c < MAP_COLS; c++) set(ground, c, row, row === 6 ? 'floor_top' : floors[Math.floor(r() * floors.length)]);
  }
  // painted wall (cols 0-6): three panels, a plain bay by the tower
  for (let c = 0; c <= 6; c++) {
    set(wall, c, 2, 'wall_parapet');
    set(wall, c, 5, 'wall_base');
  }
  for (const [c0, kind] of [[0, 'a'], [2, 'b'], [4, 'c']] as const) {
    set(wall, c0, 3, `panel_${kind}_tl`);
    set(wall, c0 + 1, 3, `panel_${kind}_tr`);
    set(wall, c0, 4, `panel_${kind}_bl`);
    set(wall, c0 + 1, 4, `panel_${kind}_br`);
  }
  set(wall, 6, 3, 'wall_plain');
  set(wall, 6, 4, 'wall_plain_low');
  // the gate towers (cols 7-8 and 11-12) rise into row 1
  for (const [cl, cr] of [[7, 8], [11, 12]]) {
    set(wall, cl, 1, 'tower_top_l');
    set(wall, cr, 1, 'tower_top_r');
    for (const rr of [2, 3, 4]) {
      set(wall, cl, rr, 'tower_l');
      set(wall, cr, rr, cr === 12 ? 'tower_r' : 'tower_m');
    }
    set(wall, cl, 5, 'tower_base_l');
    set(wall, cr, 5, 'tower_base_r');
  }
  // the star gate (cols 9-10)
  set(wall, 9, 1, 'gate_cap_l');
  set(wall, 10, 1, 'gate_cap_r');
  set(wall, 9, 2, 'arch_l');
  set(wall, 10, 2, 'arch_r');
  set(wall, 9, 3, 'jamb_l');
  set(wall, 10, 3, 'jamb_r');
  set(wall, 9, 4, 'jamb_low_l');
  set(wall, 10, 4, 'jamb_low_r');
  set(wall, 9, 5, 'step_l');
  set(wall, 10, 5, 'step_r');
  // the open side (cols 13-19): pylons over a balustrade, the void beyond
  for (let c = 13; c < MAP_COLS; c++) set(wall, c, 5, c === 14 || c === 18 ? 'balustrade_pylon' : 'balustrade');
  for (const c of [14, 18]) {
    set(wall, c, 2, 'pylon_tip');
    set(wall, c, 3, 'pylon');
    set(wall, c, 4, 'pylon');
  }
  const props: PropPlacement[] = [
    { kind: 'island', x: 16 * TILE, y: 2 * TILE + 6, layer: 'back' },
    { kind: 'portal', x: 10 * TILE, y: 2 * TILE + 2, layer: 'back' },
    { kind: 'banner', x: 8 * TILE + 4, y: 2 * TILE + 8, layer: 'back' },
    { kind: 'banner', x: 11 * TILE + 28, y: 2 * TILE + 8, layer: 'back' },
    { kind: 'brazier', x: 100, y: 214, layer: 'floor' },
    { kind: 'brazier', x: 584, y: 214, layer: 'floor' },
    { kind: 'drums', x: 470, y: 208, layer: 'floor' },
    { kind: 'starmap', x: 320, y: 262, layer: 'floor' },
    { kind: 'baobab', x: 52, y: 362, layer: 'fg' },
    { kind: 'pylon_fg', x: 626, y: 362, layer: 'fg' },
  ];
  return { ground, wall, props };
}

/** 2x2 tile pieces cut from a 64x64 painting. */
function quarter(paintFn: () => Bitmap, part: 'tl' | 'tr' | 'bl' | 'br'): Painter {
  return (b) => b.blit(paintFn(), 0, 0, { src: { x: part.endsWith('r') ? TILE : 0, y: part.startsWith('b') ? TILE : 0, w: TILE, h: TILE } });
}
for (const [kind, n] of [['a', 0], ['b', 1], ['c', 2]] as const) {
  for (const q of ['tl', 'tr', 'bl', 'br'] as const) P[`panel_${kind}_${q}`] = quarter(() => panel(n, 7 + n * 5), q);
}

export const nyota: ZoneArt = {
  id: 'nyota',
  name: 'Nyota Skyforge',
  tiles: P,
  backdrop: () => backdrop(),
  props: () => ({
    brazier: [brazier()],
    flame: flames(HL),
    banner: kenteBanner(),
    portal: [portal(false), portal(true)],
    island: island(),
    drums: [drums()],
    starmap: [starmap(false), starmap(true)],
    baobab: baobab(),
    pylon_fg: [pylonFg(false), pylonFg(true)],
    bird: skiff(),
  }),
  kinds: {
    brazier: { anchor: [0.5, 1], mode: 'static', fire: { dy: -26 } },
    flame: { anchor: [0.5, 1], mode: 'loop', ms: 80 },
    banner: { anchor: [0.5, 0], mode: 'loop', ms: 180 },
    portal: { anchor: [0.5, 0], mode: 'pulse' },
    island: { anchor: [0.5, 0], mode: 'loop', ms: 260 },
    drums: { anchor: [0.5, 1], mode: 'static' },
    starmap: { anchor: [0.5, 0.5], mode: 'pulse' },
    baobab: { anchor: [0.5, 1], mode: 'loop', ms: 480 },
    pylon_fg: { anchor: [0.5, 1], mode: 'pulse' },
    bird: { anchor: [0.5, 0.5], mode: 'loop', ms: 120 },
  },
  layout,
  horizon: 156,
};
