// Core effects: weapon hits, the Frostfang heroes' magic and the status cues
// every champion shares (buff/debuff arrows, stun stars, poison, death).
import { ACCENT, INK, MAT } from '../palette.ts';
import { disc, dith, ellipseFill, ellipseRing, line, polyFill, rampDither } from '../paint.ts';
import { hex, rng, withAlpha } from '../raster.ts';
import { burst, castCircle, crescent, FxDef, ramps, ring, shard, slash, sparks, W } from './kit.ts';

// ---------------------------------------------------------------------------
// effect definitions
// ---------------------------------------------------------------------------

export const COMMON_FX: Record<string, FxDef> = {
  slash: slash(ramps.steel),
  slash_fire: slash(ramps.fire),
  slash_violet: slash(ramps.violet, -1),
  hit: {
    w: 40, h: 40, n: 5, ms: 45, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      if (i < 3) burst(b, 20, 20, 8, [2, 3, 2][i], [9, 16, 12][i], [2.2, 2.6, 1.6][i], ramps.gold, i * 0.2);
      if (i >= 1) sparks(b, 20, 20, 10, 18, t, ramps.gold, 3);
      if (i >= 2) ring(b, 20, 20, 8 + i * 3, 8 + i * 3, 1.4, ramps.gold, 1 - t * 0.5);
    },
  },
  bash: {
    w: 64, h: 64, n: 6, ms: 50, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      ring(b, 32, 32, 8 + t * 24, 8 + t * 24, 4 - t * 3, ramps.gold, 1.2 - t * 0.6);
      if (i < 3) burst(b, 32, 32, 6, 3, [12, 20, 14][i], 3, ramps.gold, 0.3);
      sparks(b, 32, 32, 16, 30, t, ramps.gold, 11, 8);
    },
  },
  holy: {
    w: 72, h: 140, n: 9, ms: 70, ax: 0.5, ay: 1,
    draw: (b, t, i) => {
      const width = [3, 8, 13, 14, 13, 11, 8, 5, 2][i];
      for (let y = 0; y < 132; y++) {
        for (let x = 0; x < 72; x++) {
          const dx = Math.abs(x + 0.5 - 36);
          const w = width * (0.75 + 0.25 * (y / 132));
          if (dx > w) continue;
          const k = 1 - dx / w;
          if (!dith(x, y, Math.min(1, k * 1.6))) continue;
          b.set(x, y, rampDither(ramps.gold, 1.4 + k * 3, x, y));
        }
      }
      ellipseFill(b, 36, 132, 18 + width, 5, (x, y, d) => (dith(x, y, 1 - d) ? rampDither(ramps.gold, 3.5 - d * 2, x, y) : 0));
      const r = rng(5 + i);
      for (let k = 0; k < 10; k++) {
        const sx = Math.round(36 + (r() - 0.5) * 40), sy = Math.round(132 - ((r() + t) % 1) * 120);
        b.set(sx, sy, ramps.gold[4]);
        if (r() < 0.4) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(sx + dx, sy + dy, ramps.gold[2]);
      }
    },
  },
  shield_up: {
    w: 56, h: 76, n: 7, ms: 60, ax: 0.5, ay: 1,
    draw: (b, t, i) => {
      const k = [0.3, 0.7, 1, 1, 1, 0.8, 0.5][i];
      ellipseRing(b, 28, 40, 24 * k + 2, 34 * k + 2, 2, (x, y, a) => (dith(x, y, 0.8) ? rampDither(ramps.gold, 2.5 - Math.sin(a), x, y) : 0));
      ellipseFill(b, 28, 40, 24 * k, 34 * k, (x, y, d) => {
        const cell = (Math.floor(x / 4) + Math.floor(y / 4)) % 3 === 0 && (x % 4 === 0 || y % 4 === 0);
        if (cell && d > 0.3) return withAlpha(ramps.gold[3], 150);
        return d > 0.85 && dith(x, y, 0.6) ? withAlpha(ramps.gold[2], 170) : 0;
      });
      if (i === 2 || i === 3) burst(b, 16, 18, 4, 1, 6, 1, ramps.gold);
    },
  },
  arrow: {
    w: 24, h: 7, n: 1, ms: 100, ax: 0.8, ay: 0.5, loop: true,
    draw: (b) => {
      line(b, 2, 3, 19, 3, MAT.wood.ramp[4]);
      polyFill(b, [[18, 0.5], [23.5, 3.5], [18, 6.5], [19.5, 3.5]], MAT.silver.ramp[4]);
      b.set(1, 2, W); b.set(2, 2, ACCENT.fletchRed); b.set(1, 4, W); b.set(2, 4, ACCENT.fletchRed);
      b.set(0, 3, MAT.wood.ramp[2]);
    },
  },
  arrow_venom: {
    w: 30, h: 9, n: 2, ms: 80, ax: 0.85, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      for (let x = 0; x < 10; x++) if ((x + i) % 3 !== 0) b.set(x, 4 + ((x + i) % 2), withAlpha(ramps.green[2 + (x > 5 ? 1 : 0)], 200));
      line(b, 6, 4, 24, 4, MAT.wood.ramp[4]);
      polyFill(b, [[23, 1], [29.5, 4.5], [23, 8], [24.5, 4.5]], ramps.green[3]);
      b.set(26, 3, ramps.green[4]);
      b.set(6, 3, W); b.set(7, 3, ramps.green[3]); b.set(6, 5, W); b.set(7, 5, ramps.green[3]);
    },
  },
  arrow_fall: {
    w: 10, h: 22, n: 1, ms: 100, ax: 0.5, ay: 0.95, loop: true,
    draw: (b) => {
      line(b, 3, 1, 6, 16, MAT.wood.ramp[4]);
      polyFill(b, [[3.5, 15], [9, 15.5], [7, 21.5]], MAT.silver.ramp[4]);
      b.set(2, 1, W); b.set(4, 0, W); b.set(2, 2, ACCENT.fletchRed);
    },
  },
  poison: {
    w: 36, h: 44, n: 7, ms: 80, ax: 0.5, ay: 1,
    draw: (b, t) => {
      const r = rng(19);
      for (let k = 0; k < 9; k++) {
        const x0 = 8 + r() * 20, sp = 0.6 + r() * 0.6, ph = r();
        const tt = (t * sp + ph) % 1;
        const y = 40 - tt * 36;
        const rad = 1 + r() * 2.2 * (1 - tt * 0.5);
        if (tt > 0.92) continue;
        disc(b, x0 + Math.sin(tt * 6 + k) * 2, y, rad, (x, yy, d) => (d > 0.6 ? ramps.green[1] : d < 0.35 && (x + yy) % 2 === 0 ? ramps.green[4] : ramps.green[2]));
      }
      ellipseFill(b, 18, 41, 14 * Math.min(1, t * 3), 3, (x, y, d) => (dith(x, y, 1 - d) ? withAlpha(ramps.green[1], 180) : 0));
    },
  },
  ice_shard: {
    w: 26, h: 14, n: 2, ms: 70, ax: 0.75, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      for (let x = 0; x < 8; x++) if ((x + i) % 2 === 0) b.set(x, 7 + ((x * 3 + i) % 3) - 1, withAlpha(ramps.ice[3], 160));
      shard(b, 6, 7, 25, 7, 4.2, ramps.ice);
      if (i === 1) { b.set(18, 5, W); b.set(19, 4, W); }
    },
  },
  ice_burst: {
    w: 64, h: 64, n: 6, ms: 50, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      if (i < 2) disc(b, 32, 32, 6 + i * 6, (x, y, d) => rampDither(ramps.ice, 4.3 - d * 2.5, x, y));
      const r = rng(23);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + r() * 0.3;
        const d0 = 4 + t * 16, d1 = d0 + 9 - t * 6;
        if (i >= 1) shard(b, 32 + Math.cos(a) * d0, 32 + Math.sin(a) * d0, 32 + Math.cos(a) * d1, 32 + Math.sin(a) * d1, 2, ramps.ice);
      }
      sparks(b, 32, 32, 14, 28, t, ramps.ice, 4, 4);
    },
  },
  ice_spikes: {
    w: 72, h: 60, n: 8, ms: 55, ax: 0.5, ay: 0.9,
    draw: (b, t, i) => {
      const grow = [0.2, 0.6, 1, 1.05, 1, 1, 0.7, 0.35][i];
      const spikes: [number, number, number][] = [[36, 50, 4.5], [26, 38, 3.6], [46, 40, 3.8], [18, 26, 3], [54, 28, 3], [31, 30, 2.8], [42, 22, 2.6]];
      ellipseFill(b, 36, 54, 30, 5, (x, y, d) => (dith(x, y, (1 - d) * 0.9) ? rampDither(ramps.ice, 2 - d, x, y) : 0));
      for (const [x, h, w] of spikes) {
        const hh = h * grow;
        if (hh < 2) continue;
        shard(b, x, 54, x + (x - 36) * 0.15, 54 - hh, w, ramps.ice);
      }
      if (i >= 6) sparks(b, 36, 40, 16, 26, (i - 5) / 3, ramps.ice, 8, 10);
    },
  },
  ice_prison: {
    w: 60, h: 88, n: 8, ms: 70, ax: 0.5, ay: 0.95,
    draw: (b, t, i) => {
      // frames 0-4 form, 5 = hold (loop while frozen), 6-7 shatter
      if (i >= 6) {
        const r = rng(31);
        for (let k = 0; k < 12; k++) {
          const a = r() * Math.PI * 2, d = (i - 5) * 12 * (0.5 + r());
          shard(b, 30 + Math.cos(a) * d, 50 + Math.sin(a) * d, 30 + Math.cos(a) * (d + 6), 50 + Math.sin(a) * (d + 6), 2, ramps.ice);
        }
        return;
      }
      const hgt = [14, 34, 58, 74, 80, 80][i];
      const top = 84 - hgt;
      polyFill(b, [[6, 84], [4, top + 10], [14, top], [46, top + 2], [56, top + 12], [54, 84]], (x, y) => {
        const edge = x < 9 || x > 50;
        const facet = (x * 2 + y) % 23 < 2;
        let v = 2.2 - (x - 6) / 50 + (edge ? -0.6 : 0) + (facet ? 1.3 : 0);
        if (x < 18 && (y + x) % 9 === 0) v = 4;
        return withAlpha(rampDither(ramps.ice, v, x, y), 205);
      });
      if (i >= 3) {
        shard(b, 14, top + 4, 10, top - 8, 3, ramps.ice);
        shard(b, 30, top + 2, 32, top - 12, 3.5, ramps.ice);
        shard(b, 45, top + 4, 50, top - 6, 3, ramps.ice);
      }
      b.set(12, top + 8, W);
      b.set(13, top + 9, W);
    },
  },
  wisp: {
    w: 14, h: 14, n: 4, ms: 70, ax: 0.5, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      disc(b, 7, 7, 3.5 + (i % 2) * 0.6, (x, y, d) => rampDither(ramps.violet, 4.2 - d * 2.6, x, y));
      for (let k = 1; k < 4; k++) b.set(7 - k - 1, 7 + Math.round(Math.sin(i + k) * 1.5), ramps.violet[3 - k]);
    },
  },
  shockwave: {
    w: 140, h: 44, n: 7, ms: 55, ax: 0.5, ay: 0.5,
    draw: (b, t) => {
      const rx = 12 + t * 56, ry = rx * 0.28;
      ellipseRing(b, 70, 22, rx, ry, 4 - t * 2.5, (x, y, a) => rampDither(ramps.violet, 3.3 - t * 1.6 + Math.sin(a) * 0.6, x, y));
      ellipseRing(b, 70, 22, rx * 0.7, ry * 0.7, 1.5, (x, y) => (dith(x, y, 0.5) ? ramps.violet[2] : 0));
      sparks(b, 70, 22, 18, 50, t, ramps.violet, 13, -6);
    },
  },
  crack: {
    w: 96, h: 32, n: 7, ms: 60, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      const r = rng(41);
      const reach = Math.min(1, t * 2.2);
      for (let k = 0; k < 7; k++) {
        let x = 48, y = 16;
        const a = (k / 7) * Math.PI * 2;
        const len = (18 + r() * 24) * reach;
        for (let s = 0; s < len; s++) {
          x += Math.cos(a) + (r() - 0.5) * 0.8;
          y += Math.sin(a) * 0.32 + (r() - 0.5) * 0.4;
          b.set(Math.round(x), Math.round(y), i > 4 ? withAlpha(INK.black, 150) : INK.black);
          if (s % 3 === 0) b.set(Math.round(x) + 1, Math.round(y), ramps.smoke[0]);
        }
      }
      if (i < 5) {
        const r2 = rng(43);
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI * (0.1 + r2() * 0.8), sp = 10 + r2() * 18;
          const x = 48 + Math.cos(a) * sp * t * 1.6, y = 16 + Math.sin(a) * sp * t + 30 * t * t;
          b.set(Math.round(x), Math.round(y), ramps.dust[3]);
          b.set(Math.round(x) + 1, Math.round(y), ramps.dust[1]);
        }
      }
    },
  },
  dust: {
    w: 40, h: 20, n: 5, ms: 60, ax: 0.5, ay: 0.85,
    draw: (b, t) => {
      for (const s of [-1, 1]) {
        const cx = 20 + s * (4 + t * 12), cy = 14 - t * 4;
        disc(b, cx, cy, 3.5 + t * 2.5, (x, y, d) => (dith(x, y, 1 - t * 0.8) ? rampDither(ramps.dust, 3.5 - d * 2 - t, x, y) : 0));
      }
    },
  },
  chi: {
    w: 56, h: 56, n: 6, ms: 45, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      if (i < 3) burst(b, 28, 28, 10, [3, 4, 3][i], [12, 22, 16][i], 2.4, ramps.chi, i * 0.15);
      ring(b, 28, 28, 6 + t * 20, 6 + t * 20, 2.2 - t, ramps.chi, 1.1 - t * 0.5);
      sparks(b, 28, 28, 14, 26, t, ramps.chi, 21, 4);
    },
  },
  heal: {
    w: 52, h: 76, n: 9, ms: 70, ax: 0.5, ay: 0.95,
    draw: (b, t) => {
      ellipseRing(b, 26, 70, 12 + t * 12, 4 + t * 3, 1.6, (x, y, a) => rampDither(ramps.green, 3.4 - t * 2 + Math.sin(a) * 0.6, x, y));
      const r = rng(51);
      for (let k = 0; k < 12; k++) {
        const x = Math.round(8 + r() * 36), ph = r();
        const tt = (t + ph) % 1;
        const y = Math.round(70 - tt * 62);
        const c = ramps.green[Math.max(0, Math.min(4, Math.round((1 - tt) * 4 + 0.4)))];
        b.set(x, y, k % 3 === 0 ? ramps.green[4] : c);
        if (k % 3 === 0) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, c);
      }
    },
  },
  buff: {
    w: 36, h: 56, n: 8, ms: 70, ax: 0.5, ay: 0.95,
    draw: (b, t) => {
      for (let k = 0; k < 3; k++) {
        const x = 9 + k * 9, y = 50 - ((t + k * 0.33) % 1) * 44;
        const a = 1 - ((t + k * 0.33) % 1);
        polyFill(b, [[x, y - 5], [x + 4, y], [x + 1.5, y], [x + 1.5, y + 4], [x - 1.5, y + 4], [x - 1.5, y], [x - 4, y]], (xx, yy) => (dith(xx, yy, a + 0.2) ? rampDither(ramps.gold, 2 + a * 2, xx, yy) : 0));
      }
    },
  },
  debuff: {
    w: 36, h: 56, n: 8, ms: 70, ax: 0.5, ay: 0.95,
    draw: (b, t) => {
      for (let k = 0; k < 3; k++) {
        const x = 9 + k * 9, y = 8 + ((t + k * 0.33) % 1) * 40;
        const a = 1 - ((t + k * 0.33) % 1);
        polyFill(b, [[x, y + 5], [x + 4, y], [x + 1.5, y], [x + 1.5, y - 4], [x - 1.5, y - 4], [x - 1.5, y], [x - 4, y]], (xx, yy) => (dith(xx, yy, a + 0.2) ? rampDither(ramps.violet, 1.8 + a * 2, xx, yy) : 0));
      }
    },
  },
  stun: {
    w: 30, h: 14, n: 6, ms: 90, ax: 0.5, ay: 0.5, loop: true,
    draw: (b, t) => {
      for (let k = 0; k < 3; k++) {
        const a = t * Math.PI * 2 + (k / 3) * Math.PI * 2;
        const x = Math.round(15 + Math.cos(a) * 11), y = Math.round(7 + Math.sin(a) * 4);
        const front = Math.sin(a) > 0;
        b.set(x, y, front ? ramps.gold[4] : ramps.gold[2]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, ramps.gold[front ? 3 : 1]);
      }
    },
  },
  death: {
    w: 56, h: 80, n: 9, ms: 80, ax: 0.5, ay: 0.95,
    draw: (b, t, i) => {
      const r = rng(61);
      for (let k = 0; k < 7; k++) {
        const x = 16 + r() * 24, rad = 4 + r() * 5;
        const y = 70 - t * (24 + r() * 20);
        disc(b, x, y, rad * (0.6 + t * 0.6), (xx, yy, d) => (dith(xx, yy, (1 - t) * 0.9 * (1 - d * 0.5)) ? rampDither(ramps.smoke, 3 - d - t, xx, yy) : 0));
      }
      const sy = 64 - t * 60;
      if (i < 8) disc(b, 28, sy, 3.5, (x, y, d) => rampDither(ramps.ice, 4.4 - d * 2, x, y));
      for (let k = 1; k < 7; k++) b.set(28 + Math.round(Math.sin(k + t * 8) * 1.5), Math.round(sy + 3 + k), ramps.ice[Math.max(0, 4 - Math.ceil(k / 2))]);
    },
  },
  cast_ice: castCircle(ramps.ice),
  cast_gold: castCircle(ramps.gold),
  cast_violet: castCircle(ramps.violet),
  cast_green: castCircle(ramps.green),
  taunt: {
    w: 48, h: 48, n: 6, ms: 60, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      ring(b, 24, 24, 6 + t * 18, 6 + t * 18, 3 - t * 2, ramps.fire, 1.1 - t * 0.5);
      if (i < 4) {
        polyFill(b, [[21, 8], [27, 8], [26, 26], [22, 26]], (x, y) => rampDither(ramps.fire, 3.6 - (y - 8) / 20, x, y));
        disc(b, 24, 32, 3, ramps.fire[3]);
      }
    },
  },
};

