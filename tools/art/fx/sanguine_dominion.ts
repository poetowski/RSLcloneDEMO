// The Sanguine Dominion's effects. The Rime Scholar's: pale cold, rime and
// ice; solid ice is drawn normally, only the cold flare is light. The
// Enforcer's Heavy Cut: a plain line of light and chips, the light of the
// steel; the Bloodhound's Bite: two rows of white teeth snapping shut, and his
// Bay: rings of sound from his mouth; the Dominion Medic's Tonic: the rose light
// of his potions rising round each ally. Red Cloak's Cleave: a great white
// cut and chips; his Crimson Blade: a crimson-hot rising cut shedding
// embers, because the blade burns and so does the cut; his Onrush: a line of
// light driven through the enemy, a war cry in rings from his mouth, and a
// gust of wind running past each ally it sends on. The Black Rhino's Gore: two
// thrusts of light driven in where his tusks go, a dull flash and chips tossed
// up; his War Bellow: heavy rings of sound from his mouth, and at each ally's
// feet the dust of his stamp with a wall of dull iron light rising in front;
// his Thick Hide: a shell of dull light closing over him, his coat bristling.
// Chief Engineer CJ's blows: a dull flash, blue-white arcs jumping off where the
// hammer lands, because the hammer throws them; his Master's Decree: a sigil of
// bronze light over him, a band of lit runes round each ally, a meter draining on
// each enemy; his Earthen Surge: arcs running along the ground and up each enemy;
// a plate of the Dominion's hexagon for his Shield; a green star for an affliction lifted.
// Never their affinity (affinities are abstract, Jakub, 2026-10-11). Light
// effects are additive in src/game/view/scene.ts.
import { ACCENT, MAT } from '../palette.ts';
import { disc, dith, ellipseFill, ellipseRing, line, polyFill, rampDither } from '../paint.ts';
import { Bitmap, RGBA, rng, withAlpha } from '../raster.ts';
import { burst, cut, FxDef, motes, ramps, ring, shard, sparks, W } from './kit.ts';

const I = ramps.ice;
const DU = ramps.dust;
/** A dull flash: grey to white, no hue of its own. */
const DULL: RGBA[] = [DU[0], DU[2], DU[3], DU[4], W];

/** A jagged arc of the hammer's charge from (x0, y0) to (x1, y1): a white core and a blue edge; `seed` keeps its shape, `k` thins it away. */
function bolt(b: Bitmap, x0: number, y0: number, x1: number, y1: number, jag: number, seed: number, k = 1) {
  const r = rng(seed);
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4));
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const t = i / n, off = i === n ? 0 : (r() - 0.5) * 2 * jag;
    const qx = x0 + (x1 - x0) * t - ((y1 - y0) / Math.hypot(x1 - x0, y1 - y0 || 1)) * off;
    const qy = y0 + (y1 - y0) * t + ((x1 - x0) / Math.hypot(x1 - x0 || 1, y1 - y0)) * off;
    const steps = Math.ceil(Math.hypot(qx - px, qy - py));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(px + ((qx - px) * s) / Math.max(1, steps)), y = Math.round(py + ((qy - py) * s) / Math.max(1, steps));
      if (dith(x, y, Math.min(1, k * 1.3))) b.set(x, y, k > 0.5 ? W : I[4]);
      if (dith(x + 1, y, k * 0.7)) b.set(x + 1, y, I[2]);
    }
    px = qx;
    py = qy;
  }
}

/** A small six-armed snowflake: a white core and pale arms. */
function flake(b: Bitmap, x: number, y: number, r: number, core: RGBA = W, arm: RGBA = I[3]) {
  b.set(x, y, core);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    for (let s = 1; s <= r; s++) b.set(Math.round(x + Math.cos(a) * s), Math.round(y + Math.sin(a) * s), s === 1 ? core : arm);
  }
}


/** The Archer's arrows: a shaft of plain wood, an iron head, red fletching (screen space, flying right). */
const AWOOD = MAT.wood.ramp, AIRON = MAT.iron.ramp, AFLETCH = MAT.red.ramp;
function huntArrow(b: Bitmap, x0: number, x1: number, y: number) {
  line(b, x0 + 1, y, x1 - 5, y, AWOOD[4]);
  b.set(x0, y, AWOOD[2]);
  polyFill(b, [[x1 - 6, y - 2.5], [x1 + 0.5, y], [x1 - 6, y + 2.5], [x1 - 4.5, y]], (_px, py) => AIRON[py < y ? 5 : 3]);
  b.set(x0 + 1, y - 1, AFLETCH[4]); b.set(x0 + 2, y - 1, AFLETCH[4]); b.set(x0 + 3, y - 1, AFLETCH[3]);
  b.set(x0 + 1, y + 1, AFLETCH[3]); b.set(x0 + 2, y + 1, AFLETCH[2]); b.set(x0 + 3, y + 1, AFLETCH[2]);
}

export const SANGUINE_DOMINION_FX: Record<string, FxDef> = {
  /** Pale Strike's shard: a slim pale needle with a few motes of cold trailing it. */
  pale_shard: {
    w: 24, h: 9, n: 2, ms: 70, ax: 0.8, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      for (let x = 0; x < 9; x++) if ((x + i) % 3 !== 0) b.set(x, 4 + ((x * 2 + i) % 3) - 1, withAlpha(I[3], 130 + x * 12));
      shard(b, 6, 4, 23, 4, 2.4, I);
      b.set(19, 3, W);
      b.set(i ? 14 : 16, 3, ACCENT.flake);
    },
  },
  /** Pale Strike lands: a white flash, a six-armed frost star that breaks into chips. */
  pale_burst: {
    w: 56, h: 56, n: 7, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 28, cy = 28;
      if (i < 2) disc(b, cx, cy, [5, 8][i], (x, y, d) => rampDither(I, 4.5 - d * 2.2, x, y));
      if (i >= 1 && i < 5) {
        const len = [11, 17, 19, 16][i - 1];
        const w = [2.4, 2.2, 1.7, 1.1][i - 1];
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + 0.26;
          shard(b, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, cx + Math.cos(a) * len, cy + Math.sin(a) * len, w, I);
          // barbs halfway out
          const mx = cx + Math.cos(a) * len * 0.55, my = cy + Math.sin(a) * len * 0.55;
          for (const sgn of [-1, 1]) shard(b, mx, my, mx + Math.cos(a + sgn * 0.9) * len * 0.3, my + Math.sin(a + sgn * 0.9) * len * 0.3, 0.9, I);
        }
      }
      sparks(b, cx, cy, 14, 24, t, I, 43, 10);
      if (i >= 4) {
        const r = rng(47);
        for (let k = 0; k < 7; k++) flake(b, Math.round(cx + (r() - 0.5) * 34), Math.round(cy + (r() - 0.5) * 30 + t * 6), 1, i % 2 ? W : I[4], I[2]);
      }
    },
  },
  /** Rimebind: frost spreads under the target, rime crystals grow up round its legs and two bands bind them. */
  rimebind: {
    w: 68, h: 62, n: 10, ms: 60, ax: 0.5, ay: 0.92, pad: [0, 4, 4, 4],
    draw: (b, t, i) => {
      const cx = 34, gy = 57;
      const spread = Math.min(1, (i + 1) / 3) * (i >= 8 ? 1 - (i - 7) * 0.2 : 1);
      ellipseFill(b, cx, gy, 29 * spread, 6.5 * spread, (x, y, d) => (dith(x, y, (1 - d) * (i < 8 ? 0.85 : 0.45)) ? rampDither(I, 2.3 - d * 1.4, x, y) : 0));
      ellipseRing(b, cx, gy, 29 * spread, 6.5 * spread, 1.2, (x, y, a) => rampDither(I, 3 + Math.sin(a) * 0.7, x, y));
      const grow = [0.15, 0.45, 0.8, 1, 1.05, 1, 1, 0.85, 0.5, 0.2][i];
      const spikes: [number, number, number, number][] = [[cx - 21, 10, 2, -0.45], [cx - 14, 19, 2.6, -0.25], [cx - 7, 27, 3.2, -0.1], [cx - 1, 15, 2.4, 0], [cx + 7, 25, 3, 0.12], [cx + 15, 17, 2.4, 0.3], [cx + 21, 9, 1.8, 0.45]];
      for (const [x, h, w, lean] of spikes) {
        const hh = h * grow;
        if (hh < 2) continue;
        shard(b, x, gy, x + lean * hh, gy - hh, w, I);
      }
      // the binding: two bands of rime round the legs, the near half in front
      if (i >= 3 && i <= 8) {
        for (const [y, r] of [[gy - 9, 12], [gy - 19, 9.5]] as const) {
          ellipseRing(b, cx, y, r, 2.6, 1.3, (x, yy, a) => (Math.sin(a) > -0.15 ? rampDither(I, 3.1 + Math.sin(a) * 0.9, x, yy) : 0));
        }
      }
      if (i === 4 || i === 6) {
        flake(b, cx - 6, gy - 24, 2);
        flake(b, cx + 10, gy - 14, 1);
      }
      if (i >= 7) sparks(b, cx, gy - 12, 18, 30, (i - 6) / 3, I, 53, 14);
    },
  },
  /** The frost circle under the Rime Scholar while she casts: two counter-turning rings and six riding flakes. */
  cast_frost: {
    w: 76, h: 28, n: 8, ms: 70, ax: 0.5, ay: 0.5, loop: true,
    draw: (b, t) => {
      ellipseRing(b, 38, 14, 34, 11.5, 1.3, (x, y, a) => withAlpha(I[(Math.floor((a + t * 6.28) * 3) & 1) ? 3 : 2], 220));
      ellipseRing(b, 38, 14, 25, 8.4, 1.0, (x, y, a) => withAlpha(I[(Math.floor((a - t * 6.28) * 4) & 1) ? 2 : 1], 190));
      for (let k = 0; k < 6; k++) {
        const a = (t * Math.PI * 2) / 3 + (k / 6) * Math.PI * 2;
        const x = Math.round(38 + Math.cos(a) * 29.5), y = Math.round(14 + Math.sin(a) * 9.8);
        const front = Math.sin(a) > 0;
        b.set(x, y, front ? W : I[3]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, front ? I[3] : I[1]);
      }
    },
  },
  /** Cold Rebuke: a ring of ice spikes bursts from the ground round her, then shatters. */
  cold_rebuke: {
    w: 88, h: 64, n: 9, ms: 55, ax: 0.5, ay: 0.92, pad: [2, 6, 4, 6],
    draw: (b, t, i) => {
      const cx = 44, gy = 59;
      const r0 = 12 + t * 30;
      ellipseRing(b, cx, gy, r0, r0 * 0.17, Math.max(0.8, 2.4 - t * 1.6), (x, y, a) => rampDither(I, 3.4 - t * 1.4 + Math.sin(a) * 0.6, x, y));
      const grow = [0.3, 0.85, 1.1, 1, 0.9, 0.7, 0.45, 0, 0][i];
      const N = 13;
      const order: number[] = [];
      for (let k = 0; k < N; k++) order.push(k);
      // the far spikes first, the near ones over them
      order.sort((p, q) => Math.sin((p / N) * Math.PI * 2 + 0.3) - Math.sin((q / N) * Math.PI * 2 + 0.3));
      for (const k of order) {
        const a = (k / N) * Math.PI * 2 + 0.3;
        const x = cx + Math.cos(a) * 26, y = gy + Math.sin(a) * 6.5;
        const hh = (13 + (k % 3) * 7) * grow * (Math.sin(a) < 0 ? 0.65 : 1);
        if (hh < 2) continue;
        shard(b, x, y, x + Math.cos(a) * hh * 0.5, y - hh, 2.8, I);
      }
      if (i <= 4) ellipseFill(b, cx, gy, 30, 7, (x, y, d) => (dith(x, y, (1 - d) * 0.5 * (1 - t)) ? I[1] : 0));
      if (i >= 6) sparks(b, cx, gy - 18, 22, 34, (i - 5) / 3, I, 59, 6);
      if (i >= 2 && i <= 5) flake(b, cx + 18, gy - 30 + i * 2, 2);
    },
  },
  /** Heavy Cut: one long two-handed cut from high behind to low in front, a white line that thins away, a flash where it bites, chips of light flying. */
  long_cut: {
    w: 84, h: 84, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 6, 10, 6],
    draw: (b, t, i) => {
      const reach = [0.5, 0.9, 1, 1, 1, 1, 1][i];
      const heat = [1.45, 1.35, 1.1, 0.85, 0.62, 0.45, 0.3][i];
      const th = [3.6, 4.8, 3.9, 3.0, 2.2, 1.5, 1.1][i];
      if (i < 6) cut(b, 10, 8, 74, 72, -3, th, DULL, heat, reach);
      if (i === 1 || i === 2) burst(b, 44, 42, 8, 2, [15, 10][i - 1], 1.5, DULL, 0.35);
      if (i >= 1) sparks(b, 44, 42, 16, 34, (i - 1) / 5, DULL, 101, 22);
    },
  },
  /** Bite: two rows of white teeth close on the target, snap with a flash, and chips fly. */
  bite: {
    w: 64, h: 64, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 4, 6, 4],
    draw: (b, t, i) => {
      const cx = 32, cy = 31;
      const gap = [11, 6, 1.5, 1, 1, 1, 1][i];
      const heat = [1.2, 1.25, 1.35, 1.0, 0.75, 0.5, 0.3][i];
      if (i < 6) {
        for (const side of [-1, 1]) {
          for (let x = -13; x <= 13; x++) {
            const y = Math.round(cy + side * (gap + 0.045 * x * x));
            const k = 1 - Math.abs(x) / 15;
            b.set(cx + x, y, rampDither(DULL, Math.min(4, (1.4 + k * 2.2) * heat), cx + x, y));
            if (Math.abs(x) < 12) b.set(cx + x, y + side, rampDither(DULL, Math.min(4, (0.9 + k * 1.6) * heat), cx + x, y + side));
          }
          // the teeth, pointing at each other: the fangs at the ends longest
          for (const x of [-10, -6, -2, 2, 6, 10]) {
            const len = Math.abs(x) >= 10 ? 4 : 2;
            const y0 = Math.round(cy + side * (gap + 0.045 * x * x));
            for (let s = 1; s <= len; s++) b.set(cx + x, y0 - side * s, s < len || heat > 0.9 ? W : DULL[3]);
          }
        }
      }
      if (i === 2 || i === 3) burst(b, cx, cy, 8, 2, [13, 9][i - 2], 1.4, DULL, 0.3);
      if (i >= 2) sparks(b, cx, cy, 12, 26, (i - 2) / 4, DULL, 107, 18);
    },
  },
  /**
   * Bay: rings of sound open from the Bloodhound's mouth, up and forward. A
   * hit on himself plays at his chest, so the anchor sits that far below and
   * behind the rings (his mouth stands 25 px ahead of the chest and 31 above).
   */
  bay: {
    w: 100, h: 84, n: 9, ms: 60, ax: 0.35, ay: 0.726, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 60, cy = 30;
      for (let k = 0; k < 3; k++) {
        const age = i - k * 1.5;
        if (age < 0 || age > 6) continue;
        const r = 5 + age * 4.2;
        const fade = 1 - age / 6.5;
        for (let deg = -88; deg <= 16; deg += 1.5) {
          const a = (deg * Math.PI) / 180;
          const edge = 1 - Math.abs(deg + 36) / 56;
          for (const dr of [0, 0.8]) {
            const x = Math.round(cx + Math.cos(a) * (r + dr)), y = Math.round(cy + Math.sin(a) * (r + dr));
            if (!dith(x, y, Math.min(1, fade * 1.2) * (0.35 + edge * 0.75))) continue;
            b.set(x, y, rampDither(DULL, Math.min(4, 1.2 + edge * 2.2 + fade), x, y));
          }
        }
      }
    },
  },
  /** Tonic: the rose light of the Medic's potions gathers at an ally's feet, bubbles rising through it and bursting in white. */
  tonic: {
    w: 48, h: 72, n: 10, ms: 70, ax: 0.5, ay: 1, pad: [2, 4, 3, 4],
    draw: (b, t, i) => {
      const RO = ramps.rose;
      const cx = 24, gy = 70;
      const rr = [6, 11, 15, 17, 18, 18, 17, 15, 12, 8][i];
      ellipseRing(b, cx, gy - 2, rr, rr * 0.28, 1.4, (x, y, a) => (dith(x, y, 1 - t * 0.7) ? rampDither(RO, 3 - t * 1.4 + Math.sin(a) * 0.6, x, y) : 0));
      const r = rng(97);
      for (let k = 0; k < 6; k++) {
        const x0 = cx + (r() - 0.5) * 24, start = r() * 0.35, sp = 1.1 + r() * 0.5;
        const tt = (t - start) * sp;
        if (tt <= 0 || tt >= 1) continue;
        const x = Math.round(x0 + Math.sin(tt * 7 + k) * 1.4), y = Math.round(gy - 6 - tt * 48);
        // a bubble: a rose ring, white at its heart; near the top it bursts into a white point
        if (tt < 0.8) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, RO[2 + (tt > 0.5 ? 1 : 0)]);
          b.set(x, y, W);
        } else b.set(x, y, W);
      }
      motes(b, cx, gy - 6, 22, 38, 9, t, RO, 101);
    },
  },
  /** The cold flaring in her, the moment Cold Rebuke answers (additive light). */
  cold_flare: {
    w: 56, h: 56, n: 6, ms: 45, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      if (i < 4) burst(b, 28, 28, 12, [3, 4, 3, 2][i], [14, 24, 18, 10][i], [2.2, 2.6, 1.8, 1.2][i], I, 0.2 + i * 0.1);
      ring(b, 28, 28, 5 + t * 20, 5 + t * 20, Math.max(0.6, 2 - t * 1.4), I, 1.1 - t * 0.6);
    },
  },

  /** Cleave: one great cut of the zweihander from high to low through the target, a white line that thins away, a flash where it bites, chips flying. */
  cleave: {
    w: 96, h: 96, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 6, 10, 6],
    draw: (b, t, i) => {
      const reach = [0.5, 0.9, 1, 1, 1, 1, 1][i];
      const heat = [1.5, 1.4, 1.15, 0.9, 0.65, 0.45, 0.3][i];
      const th = [4.2, 5.6, 4.6, 3.4, 2.4, 1.6, 1.1][i];
      if (i < 6) cut(b, 14, 6, 82, 84, -6, th, DULL, heat, reach);
      if (i === 1 || i === 2) burst(b, 50, 48, 10, 2, [18, 12][i - 1], 1.7, DULL, 0.35);
      if (i >= 1) sparks(b, 50, 48, 18, 38, (i - 1) / 5, DULL, 263, 24);
    },
  },
  /** Crimson Blade: the burning blade cuts up through the target, a crimson-hot line, a flash, and embers falling from the cut: it burns. */
  crimson_cut: {
    w: 92, h: 92, n: 8, ms: 45, ax: 0.5, ay: 0.5, pad: [6, 6, 12, 6],
    draw: (b, t, i) => {
      const BL = ramps.blood;
      const reach = [0.5, 0.9, 1, 1, 1, 1, 1, 1][i];
      const heat = [1.5, 1.45, 1.2, 0.95, 0.7, 0.5, 0.35, 0.22][i];
      const th = [4.0, 5.2, 4.4, 3.2, 2.2, 1.5, 1.1, 0.8][i];
      if (i < 7) cut(b, 12, 82, 82, 12, 6, th, BL, heat, reach);
      if (i === 1 || i === 2) burst(b, 46, 46, 10, 2, [16, 11][i - 1], 1.6, BL, 0.2);
      if (i >= 1) sparks(b, 46, 46, 14, 30, (i - 1) / 6, BL, 269, 10);
      if (i >= 2) sparks(b, 46, 40, 12, 22, (i - 2) / 5, ramps.fire, 271, 40);
    },
  },
  /** Onrush: the point drives through the target: a straight line of light piercing it, a burst where it enters, a ring of the impact. */
  onrush: {
    w: 88, h: 56, n: 7, ms: 45, ax: 0.45, ay: 0.5, pad: [4, 6, 4, 4],
    draw: (b, t, i) => {
      const cx = 40, cy = 28;
      const reach = [0.55, 1, 1, 1, 1, 1, 1][i], heat = [1.4, 1.5, 1.2, 0.95, 0.7, 0.5, 0.3][i];
      if (i < 5) cut(b, 4, cy, 84, cy, 0, [2.0, 2.8, 2.2, 1.5, 1.0][i], DULL, heat, reach);
      if (i >= 1 && i <= 3) burst(b, cx, cy, 10, 2, [16, 12, 8][i - 1], 1.6, DULL, 0.2);
      if (i >= 2) ring(b, cx + 4, cy, 4 + (i - 2) * 3, 8 + (i - 2) * 5, 1.2, DULL, Math.max(0.3, 1.1 - (i - 2) * 0.2));
      if (i >= 1) sparks(b, cx + 6, cy, 14, 30, (i - 1) / 5, DULL, 277, 8);
    },
  },
  /** Onrush's war cry: rings of the shout opening from his mouth, up and forward (additive), at his head on the `cast` event. */
  war_cry: {
    w: 64, h: 56, n: 8, ms: 55, ax: 0.3, ay: 0.65, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 19, cy = 36;
      for (let k = 0; k < 3; k++) {
        const age = i - k * 1.4;
        if (age < 0 || age > 5.5) continue;
        const r = 4 + age * 5;
        const fade = 1 - age / 6;
        for (let deg = -80; deg <= 30; deg += 1.5) {
          const a = (deg * Math.PI) / 180;
          const edge = 1 - Math.abs(deg + 25) / 60;
          for (const dr of [0, 0.8]) {
            const xx = Math.round(cx + Math.cos(a) * (r + dr)), yy = Math.round(cy + Math.sin(a) * (r + dr));
            if (!dith(xx, yy, Math.min(1, fade * 1.4) * (0.5 + edge * 0.7))) continue;
            b.set(xx, yy, rampDither(DULL, Math.min(4, 1.5 + edge * 2.2 + fade), xx, yy));
          }
        }
      }
    },
  },
  /** Onrush's gust: the line driven on behind him, streaks of wind running forward past an ally and a few motes of gold (additive), at its chest. */
  onrush_gust: {
    w: 72, h: 72, n: 8, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 4, 2, 4],
    draw: (b, t, i) => {
      const r = rng(281);
      for (let k = 0; k < 7; k++) {
        const y = Math.round(8 + r() * 56), len = 10 + r() * 14, sp = 0.8 + r() * 0.5, ph = r() * 0.4;
        const head = -10 + (t * sp + ph) * 90;
        for (let s = 0; s < len; s++) {
          const x = Math.round(head - s);
          if (x < 0 || x >= 72) continue;
          const k2 = 1 - s / len;
          if (!dith(x, y, k2 * (1 - t * 0.6))) continue;
          b.set(x, y, rampDither(DULL, 1 + k2 * 3, x, y));
        }
      }
      sparks(b, 36, 36, 8, 24, t, ramps.gold, 283, -10);
    },
  },

  /** Mending Blows' hook: a short flat cut of the hammer, a dull flash, arcs jumping off where it lands. */
  jolt_blow: {
    w: 84, h: 72, n: 7, ms: 50, ax: 0.5, ay: 0.5, pad: [4, 4, 4, 4],
    draw: (b, t, i) => {
      const cx = 42, cy = 36;
      if (i < 3) burst(b, cx, cy, 10, 2, [13, 18, 12][i], 1.8, DULL, 0.3);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.5 + (i >> 1) * 0.7;
        const len = 14 + (k % 2) * 8 + i * 2;
        if (i <= 5) bolt(b, cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.8, 2.6, 601 + k * 3 + (i >> 1) * 7, 1 - i * 0.14);
      }
      if (i >= 1) sparks(b, cx, cy, 12, 30, (i - 1) / 5, ramps.ice, 607, 22);
    },
  },
  /** Mending Blows' slam: a heavy flash where the head comes down, a ring of the blow, more arcs, and sparks thrown up. */
  jolt_slam: {
    w: 104, h: 112, n: 8, ms: 50, ax: 0.5, ay: 0.5, pad: [4, 4, 6, 4],
    draw: (b, t, i) => {
      const cx = 52, cy = 56;
      if (i < 4) disc(b, cx, cy, [8, 14, 11, 6][i], (x, y, d) => rampDither(DULL, 4.4 - d * 2.4, x, y));
      if (i < 3) burst(b, cx, cy, 12, 4, [20, 28, 22][i], 2.2, DULL, 0.25);
      if (i >= 1) ring(b, cx, cy, 6 + i * 5, 5 + i * 4, Math.max(0.7, 2.2 - i * 0.3), DULL, Math.max(0.2, 1.1 - i * 0.16));
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.2 + (i >> 1) * 0.5;
        const len = 18 + (k % 3) * 8 + i * 2;
        if (i <= 6) bolt(b, cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len * 0.85, 3, 611 + k * 5 + (i >> 1) * 11, 1 - i * 0.12);
      }
      if (i >= 1) sparks(b, cx, cy, 18, 40, (i - 1) / 6, ramps.ice, 613, 30);
    },
  },
  /** Master's Decree's sigil: a hexagon of bronze light opens over him, a rune lit in its middle, holds a moment and fades. Additive, at his head on the `cast` event. */
  decree_sigil: {
    w: 60, h: 64, n: 14, ms: 70, ax: 0.5, ay: 0.72, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 30, cy = 24 - Math.round(i * 0.4);
      const pop = [0.3, 0.7, 1.1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1][i];
      const fade = i < 9 ? 1 : [0.8, 0.6, 0.42, 0.26, 0.12][i - 9];
      const A = ramps.amber;
      const R = 17 * pop;
      for (let s = 0; s < 6; s++) {
        const a0 = (s / 6) * Math.PI * 2 + Math.PI / 6, a1 = ((s + 1) / 6) * Math.PI * 2 + Math.PI / 6;
        const n = Math.ceil(R) + 1;
        for (let q = 0; q <= n; q++) {
          const x = Math.round(cx + Math.cos(a0) * R + ((Math.cos(a1) - Math.cos(a0)) * R * q) / n), y = Math.round(cy + Math.sin(a0) * R + ((Math.sin(a1) - Math.sin(a0)) * R * q) / n);
          if (!dith(x, y, fade)) continue;
          b.set(x, y, W);
          b.set(x + 1, y, A[3]);
          b.set(x, y + 1, A[2]);
        }
      }
      if (pop < 0.7) return;
      // the rune: an upright with two pairs of arms
      for (let y = -10; y <= 10; y++) if (dith(cx, cy + y, fade)) { b.set(cx, cy + y, W); b.set(cx + 1, cy + y, A[3]); }
      for (let k = 1; k <= 5; k++) for (const [x, y] of [[k, -9 + k], [-k, -9 + k], [k, k], [-k, k]]) if (dith(cx + x, cy + y, fade)) b.set(cx + x, cy + y, A[4]);
    },
  },
  /** Master's Decree reaches an enemy: it stops and listens. A meter of pale light drains round its chest, and motes of it sink away. */
  decree_lull: {
    w: 60, h: 60, n: 10, ms: 60, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 30, cy = 28;
      const left = 1 - t;
      for (let k = 0; k < 64; k++) {
        const u = k / 64;
        if (u > left) continue;
        const a = -Math.PI / 2 + u * Math.PI * 2;
        for (const r of [13, 14]) {
          const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r * 0.8);
          if (dith(x, y, 0.5 + left * 0.5)) b.set(x, y, rampDither(ramps.ice, 2.6 + left, x, y));
        }
      }
      const r = rng(631);
      for (let k = 0; k < 8; k++) {
        const a = r() * Math.PI * 2, dist = 10 + r() * 6, ph = r() * 0.5;
        const q = t - ph;
        if (q < 0 || q > 0.5) continue;
        const x = Math.round(cx + Math.cos(a) * dist), y = Math.round(cy + Math.sin(a) * dist * 0.8 + q * 30);
        b.set(x, y, q < 0.25 ? I[4] : I[2]);
      }
    },
  },
  /** Master's Decree reaches an ally: a band of lit runes rises round it (DEF Up), and motes of green light go up through it (Regen). Anchored at the feet. */
  decree_ward: {
    w: 72, h: 80, n: 12, ms: 60, ax: 0.5, ay: 1, pad: [2, 4, 3, 4],
    draw: (b, t, i) => {
      const cx = 36, gy = 78;
      const rise = [4, 12, 22, 32, 40, 46, 50, 53, 55, 56, 57, 58][i];
      const fade = i < 7 ? 1 : [0.8, 0.6, 0.42, 0.26, 0.12][i - 7];
      const A = ramps.amber;
      for (const dy of [0, 3]) {
        ellipseRing(b, cx, gy - rise + dy, 20, 5.4, 1, (x, y, a) => (dith(x, y, fade * (Math.sin(a) > -0.1 ? 1 : 0.45)) ? rampDither(A, Math.sin(a) > -0.1 ? 3.4 : 2.4, x, y) : 0));
      }
      // the runes between its two edges: short strokes, turning slowly round it
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + t * 1.2;
        if (Math.sin(a) < -0.1) continue;
        const x = Math.round(cx + Math.cos(a) * 20), y = Math.round(gy - rise + 1 + Math.sin(a) * 5.4);
        if (dith(x, y, fade)) { b.set(x, y, W); b.set(x, y + 1, k % 2 ? W : A[3]); }
      }
      motes(b, cx, gy - 10, 18, 56, 10, t, ramps.green, 641);
    },
  },
  /** Earthen Surge reaches an enemy: arcs run in along the ground, a scorch opens at its feet, and they climb it. Anchored at the feet. */
  earth_surge: {
    w: 112, h: 96, n: 10, ms: 55, ax: 0.5, ay: 0.96, pad: [2, 4, 4, 4],
    draw: (b, t, i) => {
      const cx = 56, gy = 90;
      if (i <= 7) ellipseFill(b, cx, gy, 24, 5.5, (x, y, d) => (dith(x, y, (1 - d) * (1 - i * 0.1)) ? DU[0] : 0));
      const run = Math.min(1, (i + 1) / 3);
      for (let k = 0; k < 3; k++) {
        if (i > 8) continue;
        const seed = 651 + k * 9 + (i >> 1) * 13;
        bolt(b, 4, gy - 1 - k * 2, 4 + (cx - 4) * run, gy - 2 - k, 2.4, seed, 1 - i * 0.08);
      }
      if (i >= 2 && i <= 8) {
        // up the body: three arcs from the feet to the chest and the head, each its own shape every other frame
        const k0 = 1 - (i - 2) * 0.12;
        bolt(b, cx - 10, gy - 2, cx - 6, gy - 52, 4.5, 661 + (i >> 1) * 3, k0);
        bolt(b, cx + 9, gy - 2, cx + 7, gy - 62, 4.5, 667 + (i >> 1) * 5, k0);
        bolt(b, cx, gy - 2, cx + 2, gy - 38, 3.6, 673 + (i >> 1) * 7, k0);
      }
      if (i === 2 || i === 3) burst(b, cx, gy - 30, 10, 3, [22, 14][i - 2], 1.6, I, 0.3);
      if (i >= 2) sparks(b, cx, gy - 26, 16, 38, (i - 2) / 7, I, 677, 26);
    },
  },
  /** Earthen Surge's Shield: a plate of the Dominion's hexagon closes before the ally in copper light, sparks running round its edge. At its chest. */
  surge_plate: {
    w: 72, h: 72, n: 11, ms: 60, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 36, cy = 36;
      const close = [1.5, 1.25, 1.08, 1, 1, 1, 1, 1, 1, 1, 1][i];
      const fade = i < 6 ? 1 : [0.8, 0.6, 0.42, 0.25, 0.12][i - 6];
      const C = ramps.chi;
      const R = 22 * close;
      const hex = (a: number): [number, number] => [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
      for (let s = 0; s < 6; s++) {
        const [x0, y0] = hex((s / 6) * Math.PI * 2 + Math.PI / 6), [x1, y1] = hex(((s + 1) / 6) * Math.PI * 2 + Math.PI / 6);
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
        for (let q = 0; q <= n; q++) {
          const x = Math.round(x0 + ((x1 - x0) * q) / n), y = Math.round(y0 + ((y1 - y0) * q) / n);
          if (!dith(x, y, fade)) continue;
          b.set(x, y, W);
          b.set(x + 1, y, C[3]);
          b.set(x, y + 1, C[2]);
        }
      }
      // the face of the plate, thin
      disc(b, cx, cy, R * 0.86, (x, y, d) => (dith(x, y, fade * 0.22 * (1 - d * 0.4)) ? C[1] : 0));
      if (i <= 5) {
        const a = (i / 6) * Math.PI * 2;
        const [x0, y0] = hex(a + Math.PI / 6);
        bolt(b, x0, y0, x0 + Math.cos(a) * 10, y0 + Math.sin(a) * 10, 2, 691 + i, 1 - i * 0.1);
      }
    },
  },
  /** Master's Eye lifts a debuff: a four-pointed star of green light rises from the ally's chest and fades. */
  eye_cleared: {
    w: 44, h: 52, n: 10, ms: 60, ax: 0.5, ay: 0.6, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const G = ramps.green;
      const r = [3, 7, 10, 8, 7, 6, 5, 4, 3, 2][i];
      const fade = i < 5 ? 1 : [0.8, 0.6, 0.4, 0.25, 0.1][i - 5];
      const cx = 22, cy = 30 - Math.round(t * 14);
      for (let k = 0; k <= r; k++) for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) if (dith(cx + dx, cy + dy, fade)) b.set(cx + dx, cy + dy, k < r / 2 ? W : G[3]);
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) if (dith(cx + dx, cy + dy, fade)) b.set(cx + dx, cy + dy, G[3]);
    },
  },

  /** Gore: two thrusts of light driven in where his tusks go, a dull flash, chips tossed up and falling. */
  gore: {
    w: 80, h: 64, n: 7, ms: 45, ax: 0.45, ay: 0.55, pad: [8, 6, 8, 4],
    draw: (b, t, i) => {
      const cx = 36, cy = 35;
      const reach = [0.55, 1, 1, 1, 1, 1, 1][i], heat = [1.4, 1.5, 1.2, 0.95, 0.7, 0.5, 0.3][i];
      if (i < 5) for (const [dy, k] of [[-5, 1], [5, 0.85]] as const) cut(b, 2, cy + dy + 6, cx + 18, cy + dy - 5, -2, [1.8, 2.4, 1.9, 1.3, 0.9][i] * k, DULL, heat, reach);
      if (i >= 1 && i <= 3) burst(b, cx + 9, cy - 3, 10, 2, [15, 11, 7][i - 1], 1.5, DULL, 0.3);
      if (i >= 1) sparks(b, cx + 9, cy - 3, 16, 30, (i - 1) / 5, DULL, 331, 26);
    },
  },
  /**
   * War Bellow: heavy rings of sound open from the Black Rhino's mouth, up and
   * forward (additive), on the skill's `cast` event. The scene plays it 8 px
   * ahead of the top of his standing sprite and 8 below it; his mouth, head
   * thrown up, is 31 px ahead of that point and 11 below it.
   */
  war_bellow: {
    w: 110, h: 96, n: 10, ms: 60, ax: 0.136, ay: 0.49, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 46, cy = 58;
      for (let k = 0; k < 4; k++) {
        const age = i - k * 1.6;
        if (age < 0 || age > 7) continue;
        const r = 5 + age * 6;
        const fade = 1 - age / 7.5;
        for (let deg = -95; deg <= 25; deg += 1.2) {
          const a = (deg * Math.PI) / 180;
          const edge = 1 - Math.abs(deg + 35) / 62;
          for (const dr of [0, 0.8, 1.6]) {
            if (dr > 0.8 && age > 3) continue;
            const x = Math.round(cx + Math.cos(a) * (r + dr)), y = Math.round(cy + Math.sin(a) * (r + dr));
            if (!dith(x, y, Math.min(1, fade * 1.3) * (0.35 + edge * 0.75))) continue;
            b.set(x, y, rampDither(DULL, Math.min(4, 1.2 + edge * 2.2 + fade), x, y));
          }
        }
      }
    },
  },
  /**
   * War Bellow reaches an ally: the dust of the stamp rolls out round its feet
   * and a curved wall of dull iron light rises before it for a moment (DEF Up),
   * then settles. Anchored at the feet.
   */
  bellow_stand: {
    w: 72, h: 76, n: 10, ms: 60, ax: 0.5, ay: 1, pad: [2, 4, 4, 4],
    draw: (b, t, i) => {
      const ST = ramps.steel;
      const cx = 36, gy = 74;
      // the dust rolling out from under its feet, both ways
      ellipseRing(b, cx, gy - 2, 8 + t * 22, 2.4 + t * 3, 2.2 - t, (x, y, a) => (dith(x, y, (1 - t) * 0.9 * (0.6 + 0.4 * Math.abs(Math.cos(a)))) ? rampDither(DU, 3.2 - t * 1.6 + Math.sin(a) * 0.5, x, y) : 0));
      const r = rng(347);
      for (let k = 0; k < 10; k++) {
        const side = k % 2 ? 1 : -1, sp = 0.5 + r() * 0.5;
        const x = cx + side * (10 + t * 24 * sp), y = gy - 3 - r() * 3 - t * 5;
        const rad = 2.2 + r() * 1.8 + t * 2.6;
        disc(b, x, y, rad, (xx, yy, d) => (dith(xx, yy, (1 - t) * 0.85 * (1 - d * 0.5)) ? rampDither(DU, 3.4 - d * 1.2 - t, xx, yy) : 0));
      }
      // the wall of iron light: a tall arc before it, bright at its edge, rising and fading
      const up = [0.25, 0.6, 0.9, 1, 1, 1, 1, 0.92, 0.8, 0.6][i];
      const fade = i < 6 ? 1 : [0.75, 0.5, 0.3, 0.15][i - 6];
      const top = gy - 6 - 52 * up;
      for (let y = Math.floor(top); y <= gy - 6; y++) {
        const k = (y - top) / Math.max(1, gy - 6 - top);
        const bow = Math.sin(k * Math.PI) * 7;
        for (let dx = 0; dx < 5; dx++) {
          const x = Math.round(cx + 13 + bow - dx);
          if (!dith(x, y, fade * (dx === 0 ? 1 : 0.75 - dx * 0.13) * (0.45 + 0.55 * (1 - Math.abs(k - 0.45)))) ) continue;
          b.set(x, y, rampDither(ST, (dx === 0 ? 3.6 : 2.8 - dx * 0.35) + (1 - k) * 0.4, x, y));
        }
      }
      if (i >= 2 && i <= 5) sparks(b, cx + 18, top + 4, 8, 12, (i - 2) / 4, ST, 349, 8);
    },
  },
  /**
   * Thick Hide: a shell of dull light closes over the Black Rhino after a blow,
   * short streaks bristling out from it like his coat standing on end, then it
   * settles into him (additive). Played at his chest.
   */
  thick_hide: {
    w: 84, h: 64, n: 8, ms: 55, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 42, cy = 32;
      const close = [1.25, 1.1, 1, 1, 1, 0.95, 0.9, 0.85][i];
      const fade = i < 4 ? 1 : [0.75, 0.5, 0.3, 0.15][i - 4];
      ellipseRing(b, cx, cy, 34 * close, 25 * close, 2.2 * fade + 0.6, (x, y, a) => (dith(x, y, fade * (0.45 + 0.55 * Math.max(0, -Math.sin(a)))) ? rampDither(DULL, 1.6 + fade * 2 - Math.sin(a) * 0.6, x, y) : 0));
      if (i >= 1 && i <= 5) {
        const r = rng(353);
        for (let k = 0; k < 14; k++) {
          const a = -Math.PI * (0.1 + r() * 0.8);
          const r0 = 1 + r() * 0.06, len = 3 + r() * 4;
          for (let q = 0; q < len; q++) {
            const x = Math.round(cx + Math.cos(a) * (34 * close * r0 + q)), y = Math.round(cy + Math.sin(a) * (25 * close * r0 + q));
            if (dith(x, y, fade * (1 - q / len))) b.set(x, y, rampDither(DULL, 3.2 - q * 0.4, x, y));
          }
        }
      }
    },
  },
  /** The Archer's arrow in flight. */
  hunt_arrow: {
    w: 24, h: 7, n: 1, ms: 100, ax: 0.8, ay: 0.5, loop: true,
    draw: (b) => huntArrow(b, 1, 23, 3),
  },
  /** Piercing Shot: the arrow punches in, a short line of light driven through, a dull flash and chips flung out behind. */
  pierce_shot: {
    w: 64, h: 48, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 6, 6, 6],
    draw: (b, t, i) => {
      const cx = 30, cy = 24;
      if (i < 4) cut(b, cx - 14 + i * 2, cy, cx + 14 + i * 4, cy, 0, [2.4, 3, 2.2, 1.2][i], DULL, [1.3, 1.2, 0.9, 0.6][i], 1);
      if (i >= 1 && i < 5) burst(b, cx, cy, 8, [2, 3, 3, 2][i - 1], [10, 15, 12, 8][i - 1], [2.2, 2.6, 2, 1.4][i - 1], DULL, 0.3);
      if (i >= 1) sparks(b, cx + 4, cy, 9, 24, (i - 1) / 6, DULL, 607, 10);
    },
  },
};
