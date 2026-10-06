// Nyota effects: the hard light of the Spear Guard, the griots' sound and
// starlight, and the gravity and starfire of the Skyforge guardian, plus the
// Overdrive cue. Same rules as every effect: hard pixels, FXR ramps, a
// white-hot core and colored falloff.
import { MAT } from '../palette.ts';
import { disc, dith, ellipseFill, ellipseRing, line, polyFill, rampDither } from '../paint.ts';
import { Bitmap, rng } from '../raster.ts';
import { burst, castCircle, crescent, FxDef, motes, ramps, ring, sparks, W } from './kit.ts';

const HL = ramps.hardlight, MG = ramps.magenta, CO = ramps.core, CS = ramps.cosmic, GO = ramps.gold;

/** Four-point star (Nyota means star) with a hot center; r is the long arm. */
function star4(b: Bitmap, cx: number, cy: number, r: number, ramp: typeof HL, heat = 1) {
  const w = Math.max(1, r * 0.3);
  polyFill(b, [[cx, cy - r], [cx + w, cy - w], [cx + r, cy], [cx + w, cy + w], [cx, cy + r], [cx - w, cy + w], [cx - r, cy], [cx - w, cy - w]], (x, y) => {
    const d = Math.max(Math.abs(x + 0.5 - cx), Math.abs(y + 0.5 - cy)) / r;
    return rampDither(ramp, (4.4 - d * 3.2) * heat, x, y);
  });
}

/** A beam of hard light from x0 to x1 at row y, thickest at the head. */
function lance(b: Bitmap, x0: number, x1: number, y: number, thick: number, ramp: typeof HL, heat = 1) {
  const len = x1 - x0;
  for (let x = Math.floor(x0); x <= x1; x++) {
    const k = (x - x0) / len;
    const th = thick * Math.min(1, k * 1.6) * (k > 0.86 ? (1 - k) / 0.14 : 1);
    for (let o = -th; o <= th; o += 1) {
      const yy = Math.round(y + o);
      const core = 1 - Math.abs(o) / Math.max(0.5, th);
      b.set(x, yy, rampDither(ramp, Math.min(4, (1 + k * 2 + core * 1.6) * heat), x, yy));
    }
  }
}

/** Concentric rings of sound expanding from a center; t in [0,1]. */
function soundRings(b: Bitmap, cx: number, cy: number, maxR: number, t: number, ramp: typeof HL, squash = 1, n = 3) {
  for (let k = 0; k < n; k++) {
    const r = (t * 1.3 - k * 0.2) * maxR;
    if (r < 2 || r > maxR) continue;
    const fade = 1 - r / maxR;
    ellipseRing(b, cx, cy, r, r * squash, 1 + fade, (x, y, a) => (dith(x, y, fade + 0.35) ? rampDither(ramp, 1.4 + fade * 2.8 + Math.sin(a * 6) * 0.4, x, y) : 0));
  }
}

export const NYOTA_FX: Record<string, FxDef> = {
  // Imara's Sunspear Flurry: a lance of hard light punches through, magenta sparks fly
  spear_thrust: {
    w: 64, h: 36, n: 6, ms: 45, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      if (i < 4) lance(b, [14, 4, 8, 16][i], [40, 56, 58, 54][i], 18, [1.5, 2.6, 2, 1.2][i], HL, [1.3, 1.2, 1, 0.7][i]);
      if (i >= 1 && i < 4) burst(b, 40, 18, 8, [3, 3, 2][i - 1], [12, 15, 9][i - 1], 1.6, HL, 0.39);
      if (i >= 1) sparks(b, 40, 18, 12, 22, t, MG, 201, 6);
      if (i >= 2) ring(b, 40, 18, 3 + t * 12, 5 + t * 14, 1.2, HL, 1.1 - t * 0.6);
    },
  },

  // Spiral of Spears: two blazing crescents wheel around the target
  spear_spiral: {
    w: 72, h: 72, n: 7, ms: 45, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      const spin = t * 3.2;
      const heat = [1.3, 1.2, 1.1, 0.9, 0.7, 0.5, 0.3][i];
      if (i < 6) {
        crescent(b, 36, 36, 30 - t * 4, 9 * (1 - t * 0.4), -2.8 + spin, -0.6 + spin, HL, heat);
        crescent(b, 36, 36, 26 - t * 4, 7 * (1 - t * 0.4), 0.34 + spin, 2.54 + spin, MG, heat * 0.95);
      }
      if (i >= 1) sparks(b, 36, 36, 14, 30, t, HL, 211, 5);
      if (i >= 2 && i < 5) star4(b, 36, 36, [6, 8, 5][i - 2], HL, 1);
    },
  },

  // Sunfall Javelin in flight: ebony shaft, gold bands, a blade of hard light, the magenta tassel streaming
  sun_javelin: {
    w: 44, h: 12, n: 2, ms: 60, ax: 0.8, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      const E = MAT.ebony.ramp, G = MAT.gold.ramp, M = MAT.magenta.ramp;
      for (let x = 0; x < 8; x++) if ((x + i) % 2 === 0) b.set(x, 6 + (x % 3) - 1, HL[1 + (x > 4 ? 1 : 0)]);
      for (let x = 6; x <= 31; x++) {
        b.set(x, 6, E[x % 7 === 0 ? 4 : 3]);
        b.set(x, 5, E[1]);
      }
      for (const gx of [10, 22, 30]) {
        b.set(gx, 5, G[4]);
        b.set(gx, 6, G[3]);
        b.set(gx, 7, G[2]);
      }
      polyFill(b, [[31, 4], [35, 3], [43, 6], [35, 9], [31, 8]], (x, y) => rampDither(HL, y < 6 ? 4.2 : 3, x, y));
      line(b, 33, 6, 42, 6, W);
      // tassel streaming back from the blade socket
      b.set(29, 8, M[4]);
      b.set(28, 9, M[3]);
      b.set(27 - i, 9, M[3]);
      b.set(26 - i, 10, M[2]);
    },
  },
  javelin_burst: {
    w: 80, h: 80, n: 8, ms: 50, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      if (i < 3) burst(b, 40, 40, 12, [5, 7, 5][i], [16, 28, 22][i], 3, HL, i * 0.13);
      if (i >= 1 && i < 5) star4(b, 40, 40, [20, 26, 18, 10][i - 1], HL, [1.2, 1.1, 0.9, 0.7][i - 1]);
      if (i >= 1) ring(b, 40, 40, 8 + t * 30, 8 + t * 30, 3 - t * 2.2, MG, 1.2 - t * 0.6);
      if (i >= 2) ring(b, 40, 40, 4 + t * 20, 4 + t * 20, 1.4, GO, 1 - t * 0.5);
      sparks(b, 40, 40, 20, 34, t, GO, 221, 10);
      if (i >= 4) motes(b, 40, 42, 30, 26, 12, t, HL, 223);
    },
  },

  // Kwesi's Resonance: a ring of sound in flight, and the burst where it lands
  sound_ring: {
    w: 24, h: 24, n: 3, ms: 60, ax: 0.6, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      for (let k = 0; k < 3; k++) {
        const r = 4 + k * 3.4 + i * 0.6;
        for (let a = -1.0; a <= 1.0; a += 0.04) {
          const x = Math.round(8 + Math.cos(a) * r), y = Math.round(12 + Math.sin(a) * r * 1.1);
          b.set(x, y, HL[k === 0 ? 4 : k === 1 ? 3 : 2]);
          if (k === 0 && Math.abs(a) < 0.5) b.set(x - 1, y, GO[3]);
        }
      }
      disc(b, 6, 12, 2, (x, y, d) => rampDither(HL, 4.4 - d * 1.6, x, y));
    },
  },
  sound_burst: {
    w: 64, h: 64, n: 7, ms: 50, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      if (i < 2) disc(b, 32, 32, 5 + i * 4, (x, y, d) => rampDither(HL, 4.3 - d * 2.2, x, y));
      soundRings(b, 32, 32, 30, t, HL, 1.1, 3);
      if (i >= 1 && i < 4) star4(b, 32, 32, [8, 10, 6][i - 1], HL, 1);
      if (i >= 2) sparks(b, 32, 32, 10, 24, t, GO, 231, 4);
    },
  },

  // Rhythm of the March: the griot's drumbeat rolls out around him (actor effect)...
  rhythm_pulse: {
    w: 88, h: 64, n: 8, ms: 60, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      // two beats: each sends a pair of rings out
      for (const [t0, ramp] of [[0, HL], [0.45, GO]] as const) {
        const tt = (t - t0) / 0.55;
        if (tt < 0 || tt > 1) continue;
        soundRings(b, 44, 32, 40, tt, ramp, 0.62, 2);
      }
      if (i === 0 || i === 4) burst(b, 44, 32, 8, 2, 9, 1.2, i ? GO : HL, 0.2);
    },
  },
  // ...and at each ally's feet a beat ring and chevrons racing upward (Turn Meter + SPD Up)
  rhythm: {
    w: 48, h: 72, n: 9, ms: 60, ax: 0.5, ay: 0.95,
    draw: (b, t, i) => {
      const base = 68;
      const beat = i < 4 ? i / 3 : (i - 4) / 4;
      ellipseRing(b, 24, base, 6 + beat * 16, 2 + beat * 4, 1.4, (x, y, a) => rampDither(i < 4 ? HL : GO, 3.6 - beat * 1.6 + Math.sin(a) * 0.5, x, y));
      for (let k = 0; k < 3; k++) {
        const y0 = base - 8 - ((t * 60 + k * 18) % 54);
        const fade = 1 - (base - y0) / 64;
        for (let s = -8; s <= 8; s++) {
          const x = 24 + s, y = Math.round(y0 + Math.abs(s) * 0.75);
          if (!dith(x, y, fade + 0.45)) continue;
          b.set(x, y, HL[Math.max(2, Math.min(4, Math.round(fade * 4.8)))]);
          b.set(x, y + 1, HL[Math.max(1, Math.min(3, Math.round(fade * 3.6)))]);
          b.set(x, y + 2, HL[1]);
        }
      }
      motes(b, 24, base - 10, 26, 40, 8, t, GO, 241);
    },
  },

  // Starsong Crescendo: a star kindles above the target and pours down as light and sound
  crescendo: {
    w: 64, h: 104, n: 10, ms: 60, ax: 0.5, ay: 0.95,
    draw: (b, t, i) => {
      const base = 99;
      const k = [0.4, 0.8, 1, 1, 1, 0.9, 0.7, 0.5, 0.3, 0.15][i];
      if (i < 7) star4(b, 32, 16, 6 + k * 6, HL, k + 0.2);
      if (i >= 2 && i < 8) {
        const half = [2, 5, 6, 5, 3.5, 1.5][i - 2];
        for (let y = 22; y <= base; y++) {
          for (let x = Math.floor(32 - half - 1); x <= Math.ceil(32 + half + 1); x++) {
            const dx = Math.abs(x + 0.5 - 32) / half;
            if (dx > 1 || !dith(x, y, 0.85 - dx * 0.4)) continue;
            b.set(x, y, rampDither(HL, 4.2 - dx * 2.4, x, y));
          }
        }
      }
      if (i >= 3) soundRings(b, 32, base, 30, (i - 3) / 6, HL, 0.3, 2);
      if (i >= 3) ellipseRing(b, 32, base, 10 + t * 14, 3 + t * 3, 1.4, (x, y, a) => rampDither(GO, 3.4 - t * 1.4 + Math.sin(a) * 0.5, x, y));
      if (i >= 2) motes(b, 32, base - 14, 30, 60, 12, t, HL, 251);
    },
  },

  // Mwamba's Gravity Fist: space folds into a dark well, then snaps back in a ring of starlight
  gravity_fist: {
    w: 72, h: 72, n: 8, ms: 50, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      if (i < 3) {
        // rings collapsing inward
        for (let k = 0; k < 3; k++) {
          const r = 30 - i * 9 - k * 5;
          if (r > 2) ellipseRing(b, 36, 36, r, r * 0.9, 1.2, (x, y, a) => rampDither(CS, 1.6 + k * 0.6 + Math.sin(a * 3) * 0.4, x, y));
        }
        disc(b, 36, 36, 4 + i * 2, (x, y, d) => rampDither(CS, 0.6 + d * 0.8, x, y));
      } else {
        const tt = (i - 3) / 4;
        if (i < 6) burst(b, 36, 36, 10, [6, 5, 3][i - 3], [24, 20, 12][i - 3], 2.4, CO, 0.31);
        ring(b, 36, 36, 6 + tt * 28, 6 + tt * 25, 3 - tt * 2, CS, 1.3 - tt * 0.6);
        sparks(b, 36, 36, 16, 30, tt, CO, 261, 8);
      }
    },
  },

  // Magnetic Pull: field lines wrap the target and drag it back toward Mwamba (drawn for an actor on the left)
  magnet_pulse: {
    w: 72, h: 64, n: 8, ms: 55, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      const k = Math.min(1, t * 2.2);
      for (const ry of [8, 15, 22]) {
        ellipseRing(b, 40, 32, 26 * k + 2, ry * k + 1, 1, (x, y, a) => (Math.sin(a * 4 + i * 1.3) > -0.2 ? rampDither(HL, 2.2 + Math.cos(a) * 1.2, x, y) : 0));
      }
      // chevrons travelling left, toward the caster
      for (let c = 0; c < 3; c++) {
        const cx = 60 - ((t * 70 + c * 22) % 60);
        const fade = cx / 60;
        for (let s = -5; s <= 5; s++) {
          const x = Math.round(cx + Math.abs(s) * 0.9), y = 32 + s;
          if (!dith(x, y, fade + 0.4)) continue;
          b.set(x, y, GO[Math.max(1, Math.min(4, Math.round(fade * 4.6)))]);
          b.set(x + 1, y, GO[1]);
        }
      }
      if (i < 3) disc(b, 40, 32, 3 + i, (x, y, d) => rampDither(HL, 4.3 - d * 2, x, y));
    },
  },

  // Starfall Protocol: forged stars streak down onto the target and burst at its feet
  starfall: {
    w: 80, h: 120, n: 11, ms: 55, ax: 0.5, ay: 0.95,
    draw: (b, t, i) => {
      const base = 114;
      const stars: [number, number, number][] = [
        // landing x, delay (frames), size
        [40, 0, 9],
        [22, 2, 6.5],
        [58, 3, 6.5],
      ];
      for (const [lx, delay, size] of stars) {
        const f = i - delay;
        if (f < 0) continue;
        if (f < 4) {
          // falling from the upper right along a steep diagonal
          const p = (f + 1) / 4;
          const x = lx + (1 - p) * 16, y = base - 6 - (1 - p) * 100;
          for (let s = 1; s < 20; s++) {
            const tx = Math.round(x + s * 1.2), ty = Math.round(y - s * 4);
            if (!dith(tx, ty, 1.1 - s / 20)) continue;
            b.set(tx, ty, CO[Math.max(1, 4 - Math.floor(s / 5))]);
            b.set(tx + 1, ty, CO[Math.max(1, 3 - Math.floor(s / 6))]);
          }
          star4(b, x, y, size, CO, 1.1);
        } else if (f < 8) {
          const tt = (f - 4) / 4;
          if (f < 6) burst(b, lx, base - 4, 10, [4, 3][f - 4], [size * 3, size * 2.2][f - 4], 2, CO, 0.3);
          ellipseRing(b, lx, base - 1, size + tt * size * 3, 2 + tt * 4, 1.6, (x, y, a) => rampDither(GO, 3.6 - tt * 2 + Math.sin(a) * 0.5, x, y));
          sparks(b, lx, base - 4, 10, size * 3, tt, CO, 271 + lx, 10);
        }
      }
      if (i >= 6) ellipseFill(b, 40, base - 1, 30, 4, (x, y, d) => (dith(x, y, (1 - d) * (1 - t) * 0.8) ? CS[1] : 0));
    },
  },

  // Overdrive (passive): the guardian's core overloads, gold-white rays break from its chest
  overdrive: {
    w: 80, h: 104, n: 10, ms: 60, ax: 0.5, ay: 0.95,
    draw: (b, t, i) => {
      const base = 99, cy = 52;
      if (i < 4) burst(b, 40, cy, 12, [3, 6, 7, 5][i], [12, 26, 34, 24][i], 2.6, CO, i * 0.08);
      if (i >= 1) ring(b, 40, cy, 6 + t * 34, 6 + t * 40, 3 - t * 2, CO, 1.3 - t * 0.5);
      ellipseRing(b, 40, base, 12 + t * 22, 3 + t * 5, 1.8, (x, y, a) => rampDither(GO, 3.8 - t * 2 + Math.sin(a) * 0.5, x, y));
      if (i >= 2) motes(b, 40, base - 10, 44, 80, 16, t, CO, 281);
      if (i >= 1 && i < 6) star4(b, 40, cy, [10, 14, 12, 8, 5][i - 1], CO, 1);
    },
  },

  cast_teal: castCircle(HL),
};

void rng;
