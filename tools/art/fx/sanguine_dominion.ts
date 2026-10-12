// The Sanguine Dominion's effects. The Rime Scholar's: pale cold, rime and
// ice; solid ice is drawn normally, only the cold flare is light. The
// Enforcer's Heavy Cut: a plain line of light and chips, the light of the
// steel; the Bloodhound's Bite: two rows of white teeth snapping shut, and his
// Bay: rings of sound from his mouth. Never their affinity (affinities are
// abstract, Jakub, 2026-10-11). Light effects are additive in
// src/game/view/scene.ts.
import { ACCENT } from '../palette.ts';
import { disc, dith, ellipseFill, ellipseRing, rampDither } from '../paint.ts';
import { Bitmap, RGBA, rng, withAlpha } from '../raster.ts';
import { burst, cut, FxDef, ramps, ring, shard, sparks, W } from './kit.ts';

const I = ramps.ice;
const DU = ramps.dust;
/** A dull flash: grey to white, no hue of its own. */
const DULL: RGBA[] = [DU[0], DU[2], DU[3], DU[4], W];

/** A small six-armed snowflake: a white core and pale arms. */
function flake(b: Bitmap, x: number, y: number, r: number, core: RGBA = W, arm: RGBA = I[3]) {
  b.set(x, y, core);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    for (let s = 1; s <= r; s++) b.set(Math.round(x + Math.cos(a) * s), Math.round(y + Math.sin(a) * s), s === 1 ? core : arm);
  }
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
  /** The cold flaring in her, the moment Cold Rebuke answers (additive light). */
  cold_flare: {
    w: 56, h: 56, n: 6, ms: 45, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      if (i < 4) burst(b, 28, 28, 12, [3, 4, 3, 2][i], [14, 24, 18, 10][i], [2.2, 2.6, 1.8, 1.2][i], I, 0.2 + i * 0.1);
      ring(b, 28, 28, 5 + t * 20, 5 + t * 20, Math.max(0.6, 2 - t * 1.4), I, 1.1 - t * 0.6);
    },
  },
};
