// The Court of Root's effects. The Follower's Snap: two jaws seen from the
// side closing on the target, a white flash where their fangs meet and chips
// flying; his Rend: three ragged tears ripping down and back across the
// enemy's guard, bits of it falling away. The Walking Bush's Root Lash: the
// crack of a root across the target and chips of his wood; his Thicket: roots
// of the same wood curling up round a champion's feet. The Wild Speaker's
// Staff Blow: the line of a thrust and a dull flash where the head of his
// stick lands, dust pushed on; his Quell: the stroke of the stick coming down,
// a heavier flash and dust thrown out low along the ground. The Jungle
// Herder's Crook Strike: the curl of his hook coming down in a dull flash; his
// Bellwether: rings of sound from his bell, in its bronze; his Herder's Ward:
// a chime at his belt and the hook of a crook drawn in warm light over the
// ally it shields. Big Ears' darts: a slim dart with a poisoned green point,
// landing in a small flash and drops of the poison; his Hidden in the
// Undergrowth: the grass stirring round his feet and his eye catching the
// light. The Grove Keeper's Thornburst: thorns of the grove's wood stabbing up
// from the ground round the enemy and sinking back, the sap they draw drifting
// home to him as green motes; his Cleansing Rite: leaves and green light
// whirling up round an ally, carrying the afflictions off as violet motes that
// fade; his Keeper's Balm: a sprig of green light sprouting at an ally's feet.
// The Forest Gargoyle's Splinter Talon: three rakes of a claw, chips of wood; his
// Razor Gale: sharp leaves flying through the target; his Graven Dread: his face
// looming huge over the enemy, its eyes alight, as its meter drains away; his
// Heartwood: a ring of grain closing round him.
// Neutral light, dust, their own wood, the bell's bronze, the darts' poison
// and the grove's green, never their affinities (affinities are abstract,
// Jakub, 2026-10-11). Light effects are additive in src/game/view/scene.ts.
import { disc, dith, ellipseRing, rampDither } from '../paint.ts';
import { Bitmap, RGBA, rng, withAlpha } from '../raster.ts';
import { burst, crescent, cut, FxDef, motes, ramps, ring, shard, soundRings, sparks, W } from './kit.ts';

const DU = ramps.dust;
/** A dull flash: grey to white, no hue of its own. */
const DULL: RGBA[] = [DU[0], DU[2], DU[3], DU[4], W];

/** The bronze of the Jungle Herder's bell, as light. */
const AM = ramps.amber;
/** The green of the poison on Big Ears' darts, and of the undergrowth he hides in. */
const GN = ramps.green;

/**
 * One jaw seen from the side: a line `len` px long from the hinge (hx, hy)
 * forward, turned `open` radians away from the line of the bite, above it
 * (side -1) or below it (side 1); its tip hooks back toward the bite and its
 * fangs point at the other jaw.
 */
function jawArc(b: Bitmap, hx: number, hy: number, len: number, side: -1 | 1, open: number, heat: number) {
  const a = open * side;
  const pt = (s: number): [number, number] => [hx + Math.cos(a) * len * s, hy + Math.sin(a) * len * s - side * 2.2 * s * s * s];
  const steps = Math.ceil(len * 2);
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const [x, y] = pt(s);
    const th = 0.6 + 1.2 * Math.sin(Math.PI * Math.min(1, s * 1.1));
    // the jaw's thickness grows away from the bite
    for (let o = 0; o <= th; o += 0.5) {
      const px = Math.round(x), py = Math.round(y + side * o);
      b.set(px, py, rampDither(DULL, Math.min(4, (1.0 + (1 - o / th) * 2.4 + s) * heat), px, py));
    }
  }
  for (const [s, n] of [[0.62, 2], [0.8, 2], [0.95, 3]] as const) {
    const [x, y] = pt(s);
    for (let k = 1; k <= n; k++) b.set(Math.round(x), Math.round(y - side * k), k < n || heat > 0.9 ? W : DULL[3]);
  }
}

/** A ragged tear from (x0, y0) to (x1, y1): a line wandering a little off its course, white-hot at its heart; `reach` (0-1) is how far it has run. */
function tear(b: Bitmap, x0: number, y0: number, x1: number, y1: number, thick: number, heat: number, reach: number, seed: number) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
  const r = rng(seed);
  const jag: number[] = [];
  for (let i = 0; i <= len / 5 + 2; i++) jag.push((r() - 0.5) * 2.2);
  const steps = Math.ceil(len * 2);
  for (let i = 0; i <= steps * reach; i++) {
    const s = i / steps;
    const seg = (s * len) / 5, j = Math.floor(seg);
    const off = jag[j] + (jag[j + 1] - jag[j]) * (seg - j);
    const w = thick * Math.sin(Math.PI * Math.min(1, s * 1.1 + 0.04));
    const bx = x0 + (x1 - x0) * s + nx * off, by = y0 + (y1 - y0) * s + ny * off;
    for (let o = -w; o <= w; o += 0.5) {
      const x = Math.round(bx + nx * o), y = Math.round(by + ny * o);
      const k = 1 - Math.abs(o) / Math.max(0.5, w);
      b.set(x, y, rampDither(DULL, Math.min(4, (1.2 + k * 2.6) * heat), x, y));
    }
  }
}

/** A sharp leaf from (x, y) along `a` (radians): a long point, its rib dark, `k` thins it away. */
function sharpLeaf(b: Bitmap, x: number, y: number, a: number, len: number, w: number, k = 1) {
  const G = ramps.green;
  const ca = Math.cos(a), sa = Math.sin(a);
  for (let u = 0; u <= len; u += 0.5) {
    const hw = u < len * 0.32 ? (u / (len * 0.32)) * w : ((len - u) / (len * 0.68)) * w;
    for (let v = -hw; v <= hw; v += 0.5) {
      const px = Math.round(x + ca * u - sa * v), py = Math.round(y + sa * u + ca * v);
      if (!dith(px, py, k)) continue;
      b.set(px, py, Math.abs(v) < 0.4 ? G[0] : v < 0 ? G[3] : G[2]);
    }
  }
}

export const COURT_OF_ROOT_FX: Record<string, FxDef> = {
  /** Snap: two jaws close on the target from the side, a flash where the fangs meet, chips flying on. */
  snap: {
    w: 56, h: 44, n: 6, ms: 40, ax: 0.5, ay: 0.5, pad: [4, 6, 4, 4],
    draw: (b, t, i) => {
      const cx = 28, cy = 22;
      const open = [0.5, 0.24, 0.03, 0.02, 0.02, 0.02][i];
      const heat = [1.0, 1.15, 1.35, 1.0, 0.7, 0.4][i];
      if (i < 5) for (const side of [-1, 1] as const) jawArc(b, cx - 14, cy, 26, side, open, heat);
      if (i === 2 || i === 3) burst(b, cx + 10, cy, 8, 2, [12, 8][i - 2], 1.4, DULL, 0.2);
      if (i >= 2) sparks(b, cx + 8, cy, 12, 22, (i - 2) / 3.5, DULL, 149, 10);
    },
  },
  /** Rend: three ragged tears rip down and back across the enemy, one after another, and bits fall away. */
  rend: {
    w: 72, h: 72, n: 8, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 4, 8, 6],
    draw: (b, t, i) => {
      const cx = 36, cy = 35;
      for (let k = 0; k < 3; k++) {
        const age = i - k * 0.6;
        if (age < 0) continue;
        const heat = [1.45, 1.3, 1.1, 0.85, 0.62, 0.42, 0.28, 0.18][Math.min(7, Math.floor(age))];
        if (heat < 0.25) continue;
        const dx = (k - 1) * 7;
        tear(b, cx + 14 + dx, cy - 22 + Math.abs(k - 1) * 3, cx - 12 + dx, cy + 20 - Math.abs(k - 1) * 2, [2.0, 1.7, 1.8][k], heat, Math.min(1, (age + 1) / 2.2), 131 + k);
      }
      if (i === 1 || i === 2) burst(b, cx + 6, cy - 6, 8, 2, [12, 8][i - 1], 1.3, DULL, 0.4);
      if (i >= 2) sparks(b, cx - 2, cy + 4, 16, 26, (i - 2) / 5, DULL, 139, 16);
    },
  },
  /** Root Lash: a root whips across the target, a pale crack where it lands, chips of wood and dust flying on. */
  root_lash: {
    w: 64, h: 56, n: 6, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 4, 6, 4],
    draw: (b, t, i) => {
      const WO = ramps.wood;
      const reach = [0.55, 1, 1, 1, 1, 1][i], heat = [1.3, 1.4, 1.1, 0.8, 0.55, 0.35][i], th = [2.6, 3.2, 2.6, 1.8, 1.2, 0.8][i];
      if (i < 5) cut(b, 8, 18, 56, 34, -5, th, WO, heat, reach);
      if (i === 1 || i === 2) burst(b, 38, 30, 7, 2, [11, 7][i - 1], 1.3, WO, 0.5);
      if (i >= 1) sparks(b, 38, 30, 14, 24, (i - 1) / 4.5, WO, 157, 16);
    },
  },
  /**
   * Thicket: roots of the Walking Bush's wood curl up out of the ground round a
   * champion's feet into a little thicket, hold, and sink back; dust where
   * they break the ground. Played at the feet of the chosen ally and at his.
   */
  thicket: {
    w: 60, h: 48, n: 10, ms: 70, ax: 0.5, ay: 1, pad: [2, 4, 8, 4],
    draw: (b, t, i) => {
      const WO = ramps.wood;
      const gx = 30, gy = 46;
      const grow = [0.25, 0.55, 0.85, 1, 1, 1, 1, 0.8, 0.5, 0.2][i];
      const fade = i < 7 ? 1 : [0.75, 0.5, 0.25][i - 7];
      // seven roots, twisting as they climb, the outer ones leaning in so that they cross
      for (let k = 0; k < 7; k++) {
        const x0 = gx + [-18, -12, -6, 0, 6, 12, 18][k], h = [15, 22, 27, 31, 26, 21, 14][k] * grow, lean = [0.32, 0.5, 0.18, -0.04, -0.2, -0.48, -0.3][k];
        for (let s = 0; s <= h; s += 0.5) {
          const f = s / Math.max(1, h);
          const x = x0 + lean * s + Math.sin(f * 5 + k * 1.9) * 2.6 * f, y = gy - s;
          const w = 2.1 * (1 - f) + 0.45;
          for (let o = -w; o <= w; o += 0.5) {
            const px = Math.round(x + o), py = Math.round(y);
            if (!dith(px, py, fade)) continue;
            // dark wood, lit along one side; only the tips catch the light
            b.set(px, py, rampDither(WO, Math.min(3.4, 0.5 + (1 - Math.abs(o + w * 0.4) / (w * 1.4)) * 1.6 + f * 1.1), px, py));
          }
        }
      }
      if (i < 4) sparks(b, gx, gy - 1, 12, 20, i / 4, ramps.dust, 163, 6);
    },
  },
  /** Staff Blow: the line of the thrust runs into the target, a dull flash where the head lands, a ring of the push and dust driven on. */
  staff_blow: {
    w: 60, h: 44, n: 6, ms: 40, ax: 0.5, ay: 0.5, pad: [4, 6, 4, 4],
    draw: (b, t, i) => {
      const cx = 34, cy = 22;
      const reach = [0.6, 1, 1, 1, 1, 1][i], heat = [1.2, 1.4, 1.1, 0.8, 0.55, 0.35][i];
      if (i < 4) cut(b, 4, cy, cx, cy, 0, [1.6, 2.2, 1.6, 1.0][i], DULL, heat, reach);
      if (i === 1 || i === 2) burst(b, cx, cy, 8, 2, [10, 7][i - 1], 1.3, DULL, 0.3);
      if (i >= 1 && i <= 4) ring(b, cx + 2 + i * 2, cy, 2 + i * 0.8, 5 + i * 2.2, 1.1, DULL, [1.2, 1.0, 0.7, 0.45][i - 1]);
      if (i >= 1) sparks(b, cx + 2, cy, 12, 20, (i - 1) / 4.5, DULL, 171, 6);
    },
  },
  /** Quell: the stroke of the stick comes down onto the target, a heavier dull flash, and dust thrown out low to both sides. */
  quell: {
    w: 72, h: 72, n: 8, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 6, 8, 6],
    draw: (b, t, i) => {
      const cx = 38, cy = 38;
      const heat = [1.3, 1.45, 1.2, 0.95, 0.7, 0.5, 0.32, 0.2][i];
      if (i < 4) cut(b, 18, 4, cx, cy, 7, [2.4, 3.0, 2.2, 1.4][i], DULL, heat, [0.55, 1, 1, 1][i]);
      if (i >= 1 && i <= 3) burst(b, cx, cy, 10, 2, [14, 11, 7][i - 1], 1.5, DULL, 0.2);
      if (i >= 2) ring(b, cx, cy + 8, 6 + (i - 2) * 4, 2 + (i - 2) * 0.9, 1.2, DULL, Math.max(0.3, 1.1 - (i - 2) * 0.18));
      if (i >= 1) {
        sparks(b, cx - 3, cy + 4, 10, 26, (i - 1) / 6.5, ramps.dust, 181, 22);
        sparks(b, cx + 3, cy + 4, 10, 26, (i - 1) / 6.5, ramps.dust, 191, 22);
      }
    },
  },

  /** Crook Strike: the hook of the crook curls over and comes down on the target, a dull flash where it lands, chips flying on. */
  crook_strike: {
    w: 64, h: 64, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 6, 8, 6],
    draw: (b, t, i) => {
      const cx = 32, cy = 34;
      const heat = [1.3, 1.45, 1.15, 0.9, 0.65, 0.45, 0.3][i];
      // the curl of the hook: an arc of dull light from behind, over the top and down onto the point of impact
      if (i < 5) crescent(b, cx - 4, cy - 8, 12, [3.2, 4.2, 3.4, 2.4, 1.6][i], Math.PI * 0.95, Math.PI * (0.95 + [0.8, 1.45, 1.45, 1.45, 1.45][i]), DULL, heat);
      if (i >= 1 && i <= 3) burst(b, cx + 4, cy + 4, 8, 2, [13, 9, 6][i - 1], 1.4, DULL, 0.3);
      if (i >= 1) sparks(b, cx + 4, cy + 4, 14, 24, (i - 1) / 5, DULL, 223, 18);
    },
  },
  /**
   * Bellwether: rings of sound open out from the bronze bell the Jungle
   * Herder rings, in the bell's own warm light. A hit on himself plays at his
   * chest, so the anchor sits where the rings start at the bell he holds out
   * before him (28 px ahead of his chest and 3 above).
   */
  bellwether: {
    w: 104, h: 84, n: 10, ms: 60, ax: 0.365, ay: 0.51, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 66, cy = 40;
      soundRings(b, cx, cy, i, 3, 1.6, 5, 6.5, AM);
      if (i < 3) burst(b, cx, cy, 8, 1, [6, 10, 7][i], 1.1, AM, 0.4);
      motes(b, cx, cy + 4, 34, 28, 7, t, AM, 211);
    },
  },
  /** Herder's Ward: one chime of the bell at his belt; anchored at his feet, the bell hanging 5 px ahead of them and 22 up. */
  herd_bell: {
    w: 40, h: 44, n: 6, ms: 60, ax: 0.37, ay: 1, pad: [4, 4, 0, 4],
    draw: (b, t, i) => {
      const cx = 20, cy = 22;
      soundRings(b, cx, cy, i, 2, 1.5, 4.2, 4, AM);
      if (i < 2) burst(b, cx, cy, 6, 1, [4, 6][i], 1, AM, 0.6);
    },
  },
  /**
   * Herder's Ward settles on an ally: the hook of a crook drawn in warm light
   * curls over its head and down before it, a shell of the same light closes
   * round it for a moment and a ring settles at its feet, motes rising.
   * Anchored at its feet.
   */
  herd_ward: {
    w: 64, h: 92, n: 10, ms: 60, ax: 0.5, ay: 1, pad: [2, 4, 8, 4],
    draw: (b, t, i) => {
      const cx = 32, gy = 90;
      const drawn = [0.35, 0.7, 1, 1, 1, 1, 1, 1, 1, 1][i];
      const fade = i < 6 ? 1 : [0.75, 0.5, 0.3, 0.15][i - 6];
      if (fade > 0.2) crescent(b, cx + 4, 22, 13, 3.4 * fade, Math.PI * 0.9, Math.PI * (0.9 + 1.5 * drawn), AM, 1.1 * fade + 0.2);
      if (i >= 2) ellipseRing(b, cx, gy - 36, 20, 35, 1.4, (x, y, a) => (dith(x, y, fade * 0.7 * (0.4 + 0.6 * Math.abs(Math.sin(a + t * 2)))) ? rampDither(AM, 2 + fade * 1.6, x, y) : 0));
      if (i >= 1) ellipseRing(b, cx, gy - 2, 10 + drawn * 12, 3 + drawn * 2, 1.2, (x, y, a) => (dith(x, y, fade) ? rampDither(AM, 2.6 + Math.sin(a) * 0.6, x, y) : 0));
      motes(b, cx, gy - 6, 36, 60, 9, t, AM, 227);
    },
  },
  /** Big Ears' dart in flight: a slim shaft, the poison green on its point, a fluffy white-and-red fletch at its tail (drawn pointing right; the battle turns it). */
  dart: {
    w: 18, h: 7, n: 2, ms: 70, ax: 0.8, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      const WO = ramps.wood, BL = ramps.blood;
      for (let x = 4; x <= 13; x++) b.set(x, 3, x < 6 ? WO[2] : WO[3]);
      // the point, wet with poison
      b.set(14, 3, GN[3]);
      b.set(15, 3, GN[4]);
      b.set(16, 3, W);
      b.set(14, 2, GN[2]);
      b.set(14, 4, GN[1]);
      // the fletch, fluttering
      const f = i ? 1 : 0;
      for (const [x, y, c] of [[1, 2 - f, W], [2, 2, W], [3, 2, DU[4]], [1, 4 + f, W], [2, 4, DU[4]], [3, 4, W], [1, 3, BL[2]], [2, 3, BL[2]], [3, 3, BL[3]]] as const) b.set(x, y, c);
      if (i) b.set(0, 3, withAlpha(GN[2], 130));
    },
  },
  /** A dart strikes: a small dull flash where it sinks in, drops of its poison flying off green, a breath of green mist. */
  dart_hit: {
    w: 40, h: 40, n: 6, ms: 45, ax: 0.5, ay: 0.5, pad: [2, 4, 10, 4],
    draw: (b, t, i) => {
      const cx = 20, cy = 20;
      if (i < 2) burst(b, cx, cy, 6, 1, [6, 9][i], 1, DULL, 0.5);
      if (i >= 1) sparks(b, cx - 2, cy, 12, 16, (i - 1) / 4, GN, 233, 14);
      if (i >= 2) disc(b, cx - 3, cy + 1, 3 + i, (x, y, d) => (dith(x, y, (1 - d) * (1 - t) * 0.6) ? GN[1 + ((x + y) % 2)] : 0));
    },
  },
  /**
   * Hidden in the Undergrowth: as an ally falls, the undergrowth stirs round
   * Big Ears' feet, blades of grass springing up and a few leaves lifting and
   * settling again. Anchored at his feet.
   */
  undergrowth: {
    w: 72, h: 40, n: 10, ms: 70, ax: 0.5, ay: 1, pad: [4, 4, 4, 4],
    draw: (b, t, i) => {
      const cx = 36, gy = 39;
      const rise = [0.3, 0.7, 1, 1, 1, 1, 0.9, 0.7, 0.45, 0.2][i];
      for (let k = 0; k < 14; k++) {
        const x0 = cx - 26 + k * 4 + ((k * 7) % 3), h = (8 + ((k * 5) % 7)) * rise;
        const lean = Math.sin(k * 1.3 + t * 5) * 0.35;
        for (let s = 0; s <= h; s += 0.5) {
          const x = Math.round(x0 + lean * s), y = Math.round(gy - s);
          b.set(x, y, rampDither(GN, 0.6 + (s / Math.max(1, h)) * 2.2, x, y));
        }
      }
      // leaves lifted, drifting back down
      const r = rng(239);
      for (let k = 0; k < 6; k++) {
        const x0 = cx + (r() - 0.5) * 44, ph = r(), lift = 14 + r() * 10;
        const up = Math.sin(Math.min(1, t * 1.4 + ph * 0.2) * Math.PI) * lift;
        const x = Math.round(x0 + Math.sin(t * 6 + k) * 3), y = Math.round(gy - 4 - up);
        b.set(x, y, GN[2]);
        b.set(x + 1, y, GN[3]);
        b.set(x, y - 1, GN[1]);
      }
    },
  },
  /** His eye catches the light: a quick amber glint (additive), played at his chest, where his big eye is (6 px ahead, 1 above). */
  keen_eyes: {
    w: 20, h: 16, n: 6, ms: 60, ax: 0.185, ay: 0.5625, pad: [1, 1, 1, 1],
    draw: (b, t, i) => {
      const r = [1, 3, 5, 3, 2, 1][i];
      const cx = 10, cy = 8;
      b.set(cx, cy, W);
      for (let k = 1; k <= r; k++) {
        const c = k <= Math.ceil(r / 2) ? W : AM[3];
        b.set(cx + k, cy, c);
        b.set(cx - k, cy, c);
        b.set(cx, cy + Math.min(k, 3), c);
        b.set(cx, cy - Math.min(k, 3), c);
      }
    },
  },

  /**
   * Thornburst: thorns of the grove's wood stab up out of the ground round the
   * enemy's feet, barbed, leaning out, hold and sink back; dust where they
   * break the ground. Anchored at the feet.
   */
  thornburst: {
    w: 72, h: 60, n: 10, ms: 55, ax: 0.5, ay: 1, pad: [4, 4, 6, 4],
    draw: (b, t, i) => {
      const WO = ramps.wood;
      const gx = 36, gy = 58;
      const grow = [0.35, 0.8, 1, 1, 1, 1, 0.85, 0.6, 0.35, 0.12][i];
      const fade = i < 7 ? 1 : [0.7, 0.45, 0.2][i - 7];
      for (let k = 0; k < 7; k++) {
        const x0 = gx + [-20, -13, -6, 0, 7, 13, 20][k], h = [20, 30, 40, 46, 38, 28, 19][k] * grow, lean = [-0.55, -0.35, -0.14, 0.02, 0.18, 0.38, 0.58][k];
        for (let q = 0; q <= h; q += 0.5) {
          const f = q / Math.max(1, h);
          const x = x0 + lean * q + Math.sin(f * 3 + k) * 1.2 * f, y = gy - q;
          const w = 2.6 * (1 - f) + 0.35;
          for (let o = -w; o <= w; o += 0.5) {
            const px = Math.round(x + o), py = Math.round(y);
            if (!dith(px, py, fade)) continue;
            b.set(px, py, rampDither(WO, Math.min(4, 0.6 + (1 - Math.abs(o + w * 0.4) / (w * 1.4)) * 1.7 + f * 1.4), px, py));
          }
          // a barb off the thorn, every so often
          if (Math.abs(q - h * 0.45) < 0.25 || Math.abs(q - h * 0.72) < 0.25) {
            const side = (k + Math.round(q)) % 2 ? 1 : -1;
            for (let s2 = 1; s2 <= 3; s2++) {
              const px = Math.round(x + side * (w + s2)), py = Math.round(y - s2 * 0.8);
              if (dith(px, py, fade)) b.set(px, py, WO[s2 < 3 ? 2 : 3]);
            }
          }
        }
      }
      if (i < 4) sparks(b, gx, gy - 1, 14, 26, i / 4, ramps.dust, 359, 8);
    },
  },
  /** The sap a thorn draws, drifting home to the Grove Keeper: a mote of green light (drawn as it flies; the battle does not turn it). */
  sap_mote: {
    w: 9, h: 9, n: 2, ms: 80, ax: 0.5, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      const cx = 4, cy = 4;
      b.set(cx, cy, W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(cx + dx, cy + dy, GN[i ? 3 : 4]);
      if (i) for (const [dx, dy] of [[1, 1], [-1, -1]]) b.set(cx + dx, cy + dy, GN[2]);
    },
  },
  /**
   * Cleansing Rite reaches an ally: leaves and green light whirl up round it,
   * and its afflictions are carried off as violet motes that fade as they rise.
   * Anchored at the feet.
   */
  cleansing_rite: {
    w: 60, h: 92, n: 11, ms: 60, ax: 0.5, ay: 1, pad: [2, 4, 6, 4],
    draw: (b, t, i) => {
      const VI = ramps.violet;
      const cx = 30, gy = 90;
      ellipseRing(b, cx, gy - 2, 10 + t * 10, 3 + t * 2, 1.4, (x, y, a) => (dith(x, y, 1 - t * 0.8) ? rampDither(GN, 2.6 + Math.sin(a) * 0.7, x, y) : 0));
      // a column of soft green light rising through the ally, thinning as it goes
      const col = Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.5;
      for (let y = 6; y < gy - 2; y++) {
        const k = (gy - 2 - y) / (gy - 8);
        for (let dx = -9; dx <= 9; dx++) {
          const e = 1 - Math.abs(dx) / 10;
          const x = cx + dx;
          if (dith(x, y, col * e * e * (1 - k * 0.7))) b.set(x, y, rampDither(GN, 1.4 + e * 1.6, x, y));
        }
      }
      // the whirl: leaves and points of green light winding up round the ally
      for (let k = 0; k < 16; k++) {
        const tt = t * 1.3 - (k / 16) * 0.42;
        if (tt < 0 || tt > 1) continue;
        const a = tt * Math.PI * 3.4 + k * 0.4;
        const rr = 12 + Math.sin(tt * Math.PI) * 5;
        const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(gy - 6 - tt * 76);
        const front = Math.sin(a) > 0;
        if (!dith(x, y, (front ? 1 : 0.65) * (1 - tt * 0.35))) continue;
        if (k % 4 === 0) {
          b.set(x, y, W);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, GN[4]);
        } else {
          // a leaf turning in the whirl
          const s2 = Math.cos(a + k) > 0 ? 1 : -1;
          b.set(x, y, GN[front ? 4 : 3]);
          b.set(x + s2, y, GN[front ? 3 : 2]);
          b.set(x, y + 1, GN[front ? 3 : 2]);
        }
      }
      // the afflictions lifted out of it, violet motes fading as they rise
      const r = rng(367);
      for (let k = 0; k < 7; k++) {
        const x0 = cx + (r() - 0.5) * 18, start = 0.12 + r() * 0.3, sp = 1 + r() * 0.4;
        const tt = (t - start) * sp;
        if (tt <= 0 || tt >= 1) continue;
        const x = Math.round(x0 + Math.sin(tt * 6 + k) * 2), y = Math.round(gy - 28 - tt * 54);
        if (!dith(x, y, 1 - tt * 0.8)) continue;
        b.set(x, y, VI[Math.max(2, Math.round(4 - tt * 2))]);
        if (tt < 0.6) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, VI[2]);
      }
    },
  },
  /**
   * Keeper's Balm reaches an ally: a sprig of green light sprouts at its feet,
   * its two leaves opening, and soft green motes rise round it. Anchored at the
   * feet.
   */
  keepers_balm: {
    w: 48, h: 60, n: 9, ms: 65, ax: 0.5, ay: 1, pad: [2, 4, 4, 4],
    draw: (b, t, i) => {
      const cx = 24, gy = 58;
      const grow = [0.25, 0.55, 0.85, 1, 1, 1, 1, 0.8, 0.5][i];
      const fade = i < 6 ? 1 : [0.7, 0.45, 0.2][i - 6];
      const h = 16 * grow;
      for (let q = 0; q <= h; q += 0.5) {
        const x = Math.round(cx + Math.sin(q * 0.3) * 1.2), y = Math.round(gy - q);
        if (dith(x, y, fade)) b.set(x, y, rampDither(GN, 1.6 + (q / 16) * 2.4, x, y));
      }
      if (grow > 0.6) {
        const top = gy - h;
        for (const side of [-1, 1]) {
          for (let q = 0; q <= 6 * grow; q += 0.5) {
            const x = Math.round(cx + side * q), y = Math.round(top + 4 - Math.sin((q / 6) * Math.PI) * 2.6 - q * 0.3);
            if (dith(x, y, fade)) b.set(x, y, rampDither(GN, 2.6 + (1 - q / 6), x, y));
            if (q > 1 && q < 5 && dith(x, y + 1, fade * 0.7)) b.set(x, y + 1, GN[2]);
          }
        }
      }
      ellipseRing(b, cx, gy - 2, 6 + t * 10, 2 + t * 1.6, 1.1, (x, y, a) => (dith(x, y, fade * (1 - t * 0.6)) ? rampDither(GN, 2.4 + Math.sin(a) * 0.6, x, y) : 0));
      motes(b, cx, gy - 4, 26, 40, 7, t, GN, 373);
    },
  },

  /** Splinter Talon: three rakes of a claw from high to low, a dull flash, chips of wood flying. */
  talon_rend: {
    w: 88, h: 88, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 4, 8, 4],
    draw: (b, t, i) => {
      const reach = [0.5, 0.9, 1, 1, 1, 1, 1][i], heat = [1.45, 1.4, 1.15, 0.9, 0.65, 0.45, 0.3][i], th = [2.6, 3.4, 2.8, 2.1, 1.5, 1, 0.8][i];
      if (i < 6) for (const k of [-13, 0, 13]) cut(b, 22 + k, 12, 62 + k, 74, -4, th, DULL, heat, reach);
      if (i === 1 || i === 2) burst(b, 44, 44, 10, 2, [15, 10][i - 1], 1.5, DULL, 0.35);
      if (i >= 1) sparks(b, 44, 44, 16, 32, (i - 1) / 5, ramps.wood, 701, 24);
    },
  },
  /** Razor Gale's beat: sharp leaves thrown forward from him in a fan. Additive, at his head on the `cast` event. */
  leaf_gale: {
    w: 136, h: 108, n: 8, ms: 55, ax: 0.16, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const r = rng(711);
      for (let k = 0; k < 9; k++) {
        const a = -0.5 + r() * 1, sp = 0.7 + r() * 0.3, len = 10 + r() * 6;
        const d = 10 + (t + 0.12) * 96 * sp;
        sharpLeaf(b, 22 + Math.cos(a) * d, 54 + Math.sin(a) * d * 0.9, a, len, 2.6, 1 - t * 0.6);
      }
    },
  },
  /** Razor Gale reaches an enemy: sharp leaves cut through it from the side, thin white cuts left behind them. */
  razor_leaves: {
    w: 112, h: 84, n: 9, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 4, 4, 2],
    draw: (b, t, i) => {
      const r = rng(721);
      for (let k = 0; k < 8; k++) {
        const y = 14 + r() * 54, sp = 0.6 + r() * 0.25, x0 = 4 + r() * 12, tilt = (r() - 0.5) * 0.4, len = 12 + r() * 6;
        const x = x0 + t * 96 * sp;
        sharpLeaf(b, x, y + tilt * x * 0.2, tilt, len, 3, 1 - t * 0.3);
        for (let q = 1; q < 14; q++) {
          const xx = Math.round(x - q), yy = Math.round(y + tilt * (x - q) * 0.2);
          if (xx >= 0 && dith(xx, yy, 1 - q / 14)) b.set(xx, yy, q < 5 ? W : DULL[2]);
        }
      }
      if (i >= 2) sparks(b, 56, 42, 10, 26, (i - 2) / 6, ramps.green, 727, 12);
    },
  },
  /** Graven Dread's cry: heavy dull rings opening from him, out and forward, as he holds the pose. Additive, at his head on the `cast` event. */
  dread_howl: {
    w: 116, h: 92, n: 12, ms: 65, ax: 0.2, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 23, cy = 46;
      for (let k = 0; k < 3; k++) {
        const age = i - k * 3;
        if (age < 0 || age > 8) continue;
        const r = 6 + age * 9, fade = 1 - age / 8.5;
        for (let deg = -62; deg <= 62; deg += 1.2) {
          const a = (deg * Math.PI) / 180, edge = 1 - Math.abs(deg) / 66;
          const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
          if (dith(x, y, Math.min(1, fade * 1.3) * (0.35 + edge * 0.7))) b.set(x, y, rampDither(DULL, Math.min(4, 1 + edge * 2 + fade), x, y));
        }
      }
    },
  },
  /**
   * Graven Dread lands: his face looms huge over the enemy, carved wood and burning
   * eyes, swelling and fading while motes of its meter sink away. At its chest,
   * drawn as solid wood, not light.
   */
  dread_mask: {
    w: 132, h: 132, n: 13, ms: 60, ax: 0.5, ay: 0.55, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const WD = ramps.wood;
      const cx = 66, cy = 58;
      const s = [0.7, 1, 1.25, 1.32, 1.35, 1.38, 1.4, 1.42, 1.44, 1.46, 1.48, 1.5, 1.52][i];
      const fade = i < 6 ? [0.6, 0.9, 1, 1, 1, 1][i] : [0.8, 0.6, 0.45, 0.3, 0.2, 0.12, 0.06][i - 6];
      for (const side of [-1, 1]) shard(b, cx + side * 16 * s, cy - 18 * s, cx + side * 36 * s, cy - 36 * s, 4 * s, WD);
      for (let y = -24; y <= 30; y++) {
        const q = (y + 24) / 54;
        const hw = (q < 0.35 ? 18 + q * 22 : 26 - (q - 0.35) * 30) * s;
        const yy = Math.round(cy + y * s);
        for (let x = -hw; x <= hw; x++) {
          const xx = Math.round(cx + x);
          if (!dith(xx, yy, fade)) continue;
          // the brow's cut and the sockets, the mouth's black gap with its fangs, the rest wood with its grain
          const nx = Math.abs(x) / s;
          const sock = y > -12 && y < -2 && nx > 4 && nx < 19 && y > -12 + (19 - nx) * 0.28;
          const mouth = y > 8 && y < 24 && nx < 16 - (y - 8) * 0.25;
          const fang = mouth && y < 15 && Math.floor(nx / 4) % 2 === 0;
          const grain = Math.sin(x * 0.9 + Math.sin(y * 0.3) * 2) > 0.8;
          b.set(xx, yy, fang ? W : mouth || sock ? DU[0] : grain ? WD[1] : rampDither(WD, 2.6 - x / (hw * 2) - y * 0.012, xx, yy));
        }
      }
      // the eyes burn hottest as the rest of it fades
      const hot = Math.min(1, fade + 0.35);
      for (const side of [-1, 1]) disc(b, cx + side * 11 * s, cy - 6 * s, 3.4 * s, (x, y, d) => (dith(x, y, hot) ? rampDither(ramps.amber, 4.4 - d * 2.4, x, y) : 0));
    },
  },
  /** Heartwood: a ring of grain closes round him and sets, a few sharp leaves falling from it. At his chest. */
  heartwood_set: {
    w: 104, h: 84, n: 9, ms: 60, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const WD = ramps.wood;
      const close = [1.3, 1.15, 1.03, 1, 1, 1, 1, 1, 1][i], fade = i < 4 ? 1 : [0.75, 0.55, 0.35, 0.2, 0.1][i - 4];
      ellipseRing(b, 52, 42, 34 * close, 25 * close, 2, (x, y, a) => (dith(x, y, fade * (0.5 + 0.5 * Math.max(0, -Math.sin(a)))) ? rampDither(WD, 2 + fade * 1.6 - Math.sin(a) * 0.6, x, y) : 0));
      motes(b, 52, 46, 30, -22, 6, t, ramps.green, 747);
    },
  },
};
