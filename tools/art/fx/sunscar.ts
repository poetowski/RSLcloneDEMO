// Sunscar effects: the desert champions' sunfire, sand, tomb-light and the
// sarcophagus, plus the cues for mechanics they introduced (counterattack,
// dispel, heal block, revive). Same rules as every effect: hard pixels, FXR
// ramps, a white-hot core and colored falloff.
import { INK, MAT } from '../palette.ts';
import { disc, dith, ellipseFill, ellipseRing, line, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hash2, rng, withAlpha } from '../raster.ts';
import { burst, crossedBlades, cut, flame, FxDef, HIEROGLYPHS, motes, outlineOf, ramps, ring, shard, slash, sparks, stamp, W } from './kit.ts';

/** Anthropoid sarcophagus of Anhotep: gold, lapis nemes, crossed arms, glyph column. */
function sarcophagusShape(): Bitmap {
  const b = new Bitmap(48, 86);
  const G = MAT.gold.ramp, L = MAT.lapis.ramp, T = MAT.turquoise.ramp;
  const cx = 24;
  // body: shoulders at y 25, feet at 82; lit from the left like everything else
  polyFill(b, [[cx - 13, 30], [cx - 12, 46], [cx - 10, 66], [cx - 8, 82], [cx + 8, 82], [cx + 10, 66], [cx + 12, 46], [cx + 13, 30], [cx + 9, 25], [cx - 9, 25]], (x, y) => {
    const lx = (x + 0.5 - cx) / 13;
    let v = 3.2 - lx * 1.6 - (y - 25) / 90;
    if (Math.abs(x + 0.5 - cx) > 11.5 - (y - 30) * 0.08) v -= 1.2;
    return rampDither(G, v, x, y);
  });
  // feathered wing bands across the legs
  for (let y = 52; y < 78; y += 4) {
    for (let x = cx - 11; x <= cx + 11; x++) {
      if (Math.abs(x + 0.5 - cx) >= 11 - (y - 30) * 0.075) continue;
      b.set(x, y, (x + y) % 4 === 0 ? T[3] : L[3]);
      b.set(x, y + 1, L[2]);
    }
  }
  // central column of hieroglyphs
  for (let y = 54; y < 79; y++) for (let x = cx - 2; x <= cx + 2; x++) b.set(x, y, G[4]);
  HIEROGLYPHS.slice(0, 5).forEach((g, i) => stamp(b, cx - 1, 54 + i * 5, g, G[1]));
  // crossed arms
  for (const s of [-1, 1]) {
    for (let k = 0; k < 18; k++) {
      const x = Math.round(cx + s * (10 - k * 0.95)), y = Math.round(38 + k * 0.45);
      b.set(x, y, G[4]);
      b.set(x, y + 1, G[3]);
      b.set(x, y + 2, G[2]);
    }
  }
  // broad collar
  for (let k = 0; k < 14; k++) {
    b.set(cx - 6 + k, 34 - Math.round(k * 0.2), k % 2 ? L[3] : G[4]);
    b.set(cx + 6 - k, 34 - Math.round(k * 0.2), k % 2 ? L[2] : G[3]);
  }
  // striped nemes, then the gold face
  polyFill(b, [[cx - 12, 30], [cx - 13, 18], [cx - 9, 8], [cx, 5], [cx + 9, 8], [cx + 13, 18], [cx + 12, 30], [cx + 7, 27], [cx - 7, 27]], (x, y) => {
    const lx = (x + 0.5 - cx) / 13;
    return Math.floor((y - 5) / 3) % 2 === 0 ? rampDither(L, 3.3 - lx * 1.3, x, y) : rampDither(G, 3.6 - lx * 1.3, x, y);
  });
  ellipseFill(b, cx, 18, 6.2, 8, (x, y, d) => rampDither(G, 4.3 - (x + 0.5 - cx) / 5 - d * 1.2, x, y));
  for (const ex of [cx - 4, cx - 3, cx + 2, cx + 3]) b.set(ex, 16, INK.black);
  b.set(cx - 5, 17, L[1]);
  b.set(cx + 4, 17, L[1]);
  // braided beard and the uraeus
  for (let y = 24; y < 31; y++) {
    b.set(cx - 1, y, y % 2 ? L[3] : G[4]);
    b.set(cx, y, y % 2 ? L[2] : G[3]);
  }
  b.set(cx, 7, G[5]);
  b.set(cx, 8, T[4]);
  return outlineOf(b, G[0]);
}

const SARCOPHAGUS = sarcophagusShape();

export const SUNSCAR_FX: Record<string, FxDef> = {
  // Kha'zir's glaive
  slash_gold: slash(ramps.gold),

  // Akhet's daggers: two quick crossing cuts with amber sparks
  slash_dagger: {
    w: 56, h: 56, n: 6, ms: 40, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      const heat = [1.3, 1.2, 1.05, 0.85, 0.6, 0.35][i];
      // two cuts crossing in an X, the second a beat after the first
      if (i < 5) cut(b, 12, 10, 44, 44, -4, 3.2 * (i < 3 ? 1 : 0.7), ramps.steel, heat, [0.55, 1, 1, 1, 1][i]);
      if (i >= 1 && i < 5) cut(b, 12, 44, 44, 12, 4, 2.6 * (i < 3 ? 1 : 0.7), ramps.steel, heat * 0.95, [0.5, 1, 1, 1][i - 1]);
      if (i >= 1) sparks(b, 28, 28, 10, 22, t, ramps.amber, 17, 4);
    },
  },

  // Scorpion Sting: a piercing thrust, venom sprays out of the far side
  sting: {
    w: 72, h: 44, n: 7, ms: 45, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      if (i < 3) {
        const len = [26, 34, 20][i];
        for (let x = 36 - len; x <= 36 + (i ? 22 : 4); x++) {
          const k = (x - (36 - len)) / (len + 22);
          b.set(x, 22, rampDither(ramps.amber, 1.5 + k * 3, x, 22));
          if (k > 0.5) b.set(x, 21, ramps.amber[2]);
        }
      }
      if (i >= 1 && i < 4) burst(b, 36, 22, 6, [3, 4, 2][i - 1], [14, 18, 11][i - 1], 2, ramps.amber, 0.26);
      if (i >= 2) ring(b, 36, 22, 4 + t * 16, 3 + t * 10, 1.4, ramps.amber, 1.1 - t * 0.7);
      if (i >= 2) {
        const r = rng(71);
        const tt = (i - 2) / 4;
        for (let k = 0; k < 9; k++) {
          const a = -0.9 + r() * 1.8, sp = 10 + r() * 18;
          const x = 40 + Math.cos(a) * sp * tt * 1.4, y = 22 + Math.sin(a) * sp * tt + 26 * tt * tt;
          disc(b, x, y, k % 3 === 0 ? 1.4 : 0.9, (xx, yy, d) => (d < 0.5 ? ramps.green[3] : ramps.green[1]));
        }
      }
    },
  },

  // Nefret's Solar Lance projectile and its impact
  sun_orb: {
    w: 20, h: 20, n: 4, ms: 60, ax: 0.5, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + i * 0.2;
        const len = k % 2 ? 6.5 : 9.5;
        line(b, 10 + Math.cos(a) * 4, 10 + Math.sin(a) * 4, 10 + Math.cos(a) * len, 10 + Math.sin(a) * len, ramps.gold[k % 2 ? 2 : 3]);
      }
      disc(b, 10, 10, 4.6, (x, y, d) => rampDither(ramps.gold, 4.4 - d * 2.2, x, y));
      b.set(9, 8, W);
    },
  },
  fire_burst: {
    w: 64, h: 64, n: 7, ms: 50, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      if (i < 3) burst(b, 32, 32, 10, [4, 6, 4][i], [13, 22, 17][i], 2.8, ramps.fire, i * 0.2);
      if (i >= 1) ring(b, 32, 32, 7 + t * 22, 7 + t * 22, 3 - t * 2.2, ramps.fire, 1.2 - t * 0.6);
      sparks(b, 32, 32, 18, 30, t, ramps.gold, 29, 10);
      if (i >= 3) motes(b, 32, 34, 22, 24, 10, t, ramps.fire, 33);
    },
  },

  // Wrath of the Sun: a sun sigil scorches the ground, then a column of sunfire erupts
  fire_pillar: {
    w: 60, h: 128, n: 10, ms: 60, ax: 0.5, ay: 0.95, pad: [0, 0, 9, 0],
    draw: (b, t, i) => {
      const base = 121;
      const sig = [0.6, 1, 1, 1, 1, 0.9, 0.7, 0.5, 0.3, 0.15][i];
      ellipseRing(b, 30, base, 20 * sig + 4, 6 * sig + 1.5, 1.4, (x, y, a) => rampDither(ramps.gold, 3.2 + Math.sin(a * 6) * 0.8, x, y));
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        b.set(Math.round(30 + Math.cos(a) * (26 * sig + 3)), Math.round(base + Math.sin(a) * (8 * sig + 1)), ramps.gold[3]);
      }
      if (i < 2) return;
      // a beam of sunlight falls from the sky, then the ground erupts in flame
      const half = [1.2, 5, 8, 8, 7, 5, 2.5, 1][i - 2];
      const top = i >= 7 ? (i - 6) * 34 : 0;
      for (let y = top; y <= base; y++) {
        const wob = half * (0.85 + 0.15 * Math.sin(y * 0.3 + i * 1.7));
        const fade = top === 0 ? Math.min(1, y / 32) : Math.min(1, (y - top) / 14);
        for (let x = Math.floor(30 - wob - 1); x <= Math.ceil(30 + wob + 1); x++) {
          const dx = Math.abs(x + 0.5 - 30) / Math.max(0.6, wob);
          if (dx > 1 || !dith(x, y, fade)) continue;
          const v = 4.6 - dx * 2.4 - (y < 24 ? (24 - y) / 12 : 0) + (hash2(x, y, i) - 0.5) * 0.5;
          if (v < 0.5) continue;
          b.set(x, y, rampDither(i < 4 ? ramps.gold : ramps.fire, v, x, y));
        }
      }
      const fl = [0, 0.5, 1, 1, 0.9, 0.7, 0.45, 0.2][i - 2];
      for (const [dx, hk, ph] of [[-10, 0.42, 0], [10, 0.48, 1.7], [-5, 0.62, 3.1], [5, 0.58, 4.4], [0, 0.5, 2.2]] as const) flame(b, 30 + dx, base, 64 * hk * fl, 4.6, i * 1.3 + ph, ramps.fire, 1.05);
      if (i >= 3) motes(b, 30, base - 26, 30, 44, 14, t, ramps.gold, 41 + i);
    },
  },

  // Burn status: tongues of flame licking at the feet (applied and on every tick)
  burn: {
    w: 40, h: 46, n: 7, ms: 70, ax: 0.5, ay: 0.95,
    draw: (b, t, i) => {
      const base = 43;
      const r = rng(81);
      for (let k = 0; k < 5; k++) {
        const x = 7 + k * 6.5 + (r() - 0.5) * 2;
        const h = (9 + r() * 12) * (0.75 + 0.25 * Math.sin(i * 1.7 + k * 2.1)) * (i < 2 ? 0.5 + i * 0.25 : i > 5 ? 0.6 : 1);
        flame(b, x, base, h, 3.4, i * 1.1 + k * 1.9, ramps.fire, 1);
      }
      motes(b, 20, base - 14, 26, 26, 8, t, ramps.fire, 85);
    },
  },

  // Blink approach: Akhet vanishes into a puff of sand and reappears in another
  sand_puff: {
    w: 60, h: 44, n: 7, ms: 55, ax: 0.5, ay: 0.9, pad: [12, 0, 8, 0],
    draw: (b, t, i) => {
      const r = rng(91);
      for (let k = 0; k < 7; k++) {
        const a = Math.PI + r() * Math.PI, sp = 8 + r() * 14;
        const cx = 30 + Math.cos(a) * sp * (0.3 + t), cy = 34 + Math.sin(a) * sp * 0.55 * (0.3 + t) - t * 6;
        const rad = (3 + r() * 4) * (0.7 + t * 0.8);
        disc(b, cx, cy, rad, (x, y, d) => (dith(x, y, (1 - t * 0.85) * (1 - d * 0.4)) ? rampDither(ramps.sand, 3.6 - d * 1.6 - t * 1.4 - ((y - cy) / rad) * 0.5, x, y) : 0));
      }
      if (i < 5) sparks(b, 30, 34, 14, 26, t, ramps.sand, 93, 18);
    },
  },

  // Anhotep's Grave Touch: a ghostly skull lunges through the target
  grave: {
    w: 60, h: 64, n: 8, ms: 60, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      const k = [0.55, 0.9, 1, 1, 0.95, 0.75, 0.45, 0.2][i];
      const sx = 20 + i * 2.4, sy = 29;
      if (i < 6) {
        const a = i > 3 ? 0.55 : 1;
        // cranium, cheekbones, jaw with a row of teeth; a ghost trail behind it
        for (let g = 3; g >= 1; g--) ellipseFill(b, sx - g * 5, sy - 1, 9 * k, 8 * k, (x, y, d) => (dith(x, y, (1 - d) * 0.22 * (4 - g) * a) ? ramps.tomb[1] : 0));
        ellipseFill(b, sx, sy - 3, 10 * k + 1, 9 * k + 1, (x, y, d) => (dith(x, y, (1 - d * 0.6) * a) ? rampDither(ramps.tomb, 4 - d * 1.6 - (x - sx) / 14, x, y) : 0));
        polyFill(b, [[sx - 6 * k, sy + 4], [sx + 7 * k, sy + 4], [sx + 5 * k, sy + 11 * k], [sx - 4 * k, sy + 11 * k]], (x, y) => (dith(x, y, a) ? rampDither(ramps.tomb, 2.8 - (x - sx) / 10, x, y) : 0));
        if (k > 0.8) {
          for (const ex of [-4, 4]) ellipseFill(b, sx + ex * k + 1, sy - 2, 2.6, 3, ramps.tomb[0]);
          b.set(Math.round(sx + 1), Math.round(sy + 2), ramps.tomb[0]);
          b.set(Math.round(sx + 2), Math.round(sy + 2), ramps.tomb[0]);
          for (let tx = -4; tx <= 5; tx += 2) b.set(Math.round(sx + tx), Math.round(sy + 6), ramps.tomb[0]);
          b.set(Math.round(sx + 5), Math.round(sy - 2), W);
        }
      }
      for (let w = 0; w < 4; w++) {
        const a0 = w * 1.6 + t * 5;
        for (let s = 0; s < 10; s++) {
          if (s > 8 * (1 - t) + 2) continue;
          const a = a0 + s * 0.28, rr = 6 + t * 18 + s * 0.8;
          b.set(Math.round(30 + Math.cos(a) * rr), Math.round(30 + Math.sin(a) * rr * 0.8), ramps.tomb[Math.max(1, 4 - Math.floor(s / 3))]);
        }
      }
      if (i >= 3) motes(b, 30, 36, 28, 26, 10, t, ramps.tomb, 101);
    },
  },
  grave_orb: {
    w: 26, h: 16, n: 3, ms: 70, ax: 0.75, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      for (let x = 0; x < 15; x++) {
        if ((x + i) % 3 === 0) continue;
        const y = 8 + Math.round(Math.sin(x * 0.7 + i * 2.1) * (x / 15) * -2.5);
        b.set(x, y, withAlpha(ramps.tomb[x < 6 ? 1 : 2], 210));
        if (x > 8) b.set(x, y + 1, ramps.tomb[1]);
      }
      ellipseFill(b, 19, 8, 5.5, 5, (x, y, d) => rampDither(ramps.tomb, 4.3 - d * 2.4, x, y));
      b.set(20, 7, ramps.tomb[0]);
      b.set(22, 7, ramps.tomb[0]);
      b.set(21, 10, ramps.tomb[1]);
    },
  },

  // Curse of Ages: hieroglyphs ignite around the feet, tendrils coil upward
  curse: {
    w: 72, h: 76, n: 9, ms: 70, ax: 0.5, ay: 0.95, pad: [0, 0, 10, 0],
    draw: (b, t, i) => {
      const base = 70;
      const k = Math.min(1, t * 3);
      ellipseRing(b, 36, base, 28 * k + 2, 7 * k + 1, 1.2, (x, y, a) => rampDither(ramps.curse, 3 + Math.sin(a * 5 + i) * 0.8, x, y));
      if (k > 0.6) {
        for (let g = 0; g < 8; g++) {
          const a = (g / 8) * Math.PI * 2 + i * 0.08;
          stamp(b, Math.round(36 + Math.cos(a) * 22) - 1, Math.round(base + Math.sin(a) * 5.5) - 2, HIEROGLYPHS[g % HIEROGLYPHS.length], ramps.curse[i % 2 ? 4 : 3]);
        }
      }
      // a low pall of grave-smoke, then tendrils coil up around the body
      ellipseFill(b, 36, base - 3, 26 * k, 7 * k, (x, y, d) => (dith(x, y, (1 - d) * 0.55 * (1 - Math.max(0, t - 0.6) * 2)) ? ramps.curse[1] : 0));
      for (let w = 0; w < 5; w++) {
        const x0 = 18 + w * 9;
        const hgt = (24 + ((w * 13) % 24)) * Math.min(1, t * 1.6) * (1 - Math.max(0, t - 0.75) * 2.4);
        for (let s = 0; s < hgt; s++) {
          const x = Math.round(x0 + Math.sin(s * 0.2 + w + i * 0.6) * 3.5), y = Math.round(base - 2 - s);
          const tip = s > hgt - 4;
          b.set(x, y, tip ? ramps.curse[4] : s % 5 === 0 ? ramps.curse[3] : ramps.curse[2]);
          b.set(x + 1, y, tip ? ramps.curse[3] : ramps.curse[1]);
          if (s < hgt * 0.4) b.set(x - 1, y, ramps.curse[1]);
        }
      }
    },
  },

  // Eternal Tomb: a sarcophagus rises out of the sand around the target, seals, crumbles
  sarcophagus: {
    w: 56, h: 92, n: 12, ms: 75, ax: 0.5, ay: 0.95,
    draw: (b, t, i) => {
      const base = 87, ox = 4;
      const S = SARCOPHAGUS;
      if (i <= 9) {
        const rise = [0.25, 0.65, 1][Math.min(i, 2)];
        const dy = Math.round((1 - rise) * 70);
        const top = base - S.h + 4 + dy;
        for (let y = 0; y < S.h; y++) {
          if (top + y > base) continue;
          for (let x = 0; x < S.w; x++) {
            const c = S.get(x, y);
            if (c & 255) b.set(ox + x, top + y, c);
          }
        }
        if (i >= 4 && i <= 6) {
          // a glint sweeps across the lid
          const gx = ox + 8 + (i - 4) * 14;
          for (let y = base - 76; y < base - 8; y++) {
            const x = gx + Math.round((y - (base - 76)) * -0.35);
            if (b.get(x, y) & 255) b.set(x, y, MAT.gold.ramp[5]);
          }
        }
        // the eyes burn green while the tomb is sealed
        if (i >= 3) for (const ex of [ox + 20, ox + 27]) b.set(ex, top + 16, ramps.tomb[4]);
        if (i === 9) {
          const r = rng(111);
          for (let c = 0; c < 4; c++) {
            let x = ox + 14 + r() * 20, y = base - 70 + r() * 50;
            for (let s = 0; s < 9; s++) {
              b.set(Math.round(x), Math.round(y), MAT.gold.ramp[0]);
              x += (r() - 0.5) * 2;
              y += 1;
            }
          }
        }
      } else {
        const tt = (i - 9) / 2;
        const r = rng(121);
        for (let k = 0; k < 16; k++) {
          const x0 = ox + 10 + r() * 28, y0 = base - 10 - r() * 66;
          const x = Math.round(x0 + (x0 - 28) * 0.4 * tt), y = Math.round(y0 + 40 * tt * tt + 6 * tt);
          if (y > base) continue;
          b.set(x, y, k % 3 === 0 ? MAT.lapis.ramp[3] : MAT.gold.ramp[i === 10 ? 4 : 3]);
          b.set(x + 1, y, MAT.gold.ramp[2]);
          if (k % 2 === 0) b.set(x, y + 1, MAT.gold.ramp[1]);
        }
        ellipseFill(b, 28, base - 1, 18, 3.5, (x, y, d) => (dith(x, y, (1 - d) * (1.2 - tt * 0.5)) ? rampDither(ramps.sand, 3 - d, x, y) : 0));
      }
      if (i < 3) sparks(b, 28, base - 2, 18, 22, (i + 1) / 3, ramps.sand, 131, 14);
    },
  },

  // Undying: twin spirals of tomb-light climb the body, an ankh flares overhead
  revive: {
    w: 64, h: 104, n: 12, ms: 70, ax: 0.5, ay: 0.95, pad: [0, 0, 10, 0],
    draw: (b, t, i) => {
      const base = 99;
      ellipseRing(b, 32, base, 10 + t * 18, 3 + t * 5, 1.6, (x, y, a) => rampDither(ramps.tomb, 3.4 - t * 1.5 + Math.sin(a) * 0.6, x, y));
      for (let s = 0; s < 2; s++) {
        const rr = s ? ramps.gold : ramps.tomb;
        for (let k = 0; k < 160; k++) {
          const h = k * 0.55;
          if (h > t * 120) break;
          const a = k * 0.095 + s * Math.PI + t * 6;
          const x = Math.round(32 + Math.cos(a) * (14 - k * 0.04)), y = Math.round(base - 4 - h);
          const front = Math.sin(a) > 0;
          b.set(x, y, rr[front ? 4 : 2]);
          if (front) b.set(x + 1, y, rr[3]);
        }
      }
      if (i >= 5 && i <= 9) {
        const g = ramps.gold, k = i === 7 ? 4 : 3;
        const ax = 32, ay = 14;
        ellipseRing(b, ax, ay, 4, 5, 1.6, () => g[k]);
        for (let y = ay + 4; y < ay + 17; y++) {
          b.set(ax, y, g[k]);
          b.set(ax - 1, y, g[k - 1]);
        }
        for (let x = ax - 6; x <= ax + 5; x++) {
          b.set(x, ay + 7, g[k]);
          b.set(x, ay + 8, g[k - 1]);
        }
        if (i === 7) burst(b, ax, ay + 6, 8, 2, 13, 1.4, g, 0.2);
      }
      motes(b, 32, base - 20, 30, 70, 12, t, ramps.gold, 141);
    },
  },

  // Blessing of Dawn: shafts of morning light slant in from the key light (top-left)
  heal_sun: {
    w: 60, h: 100, n: 10, ms: 65, ax: 0.5, ay: 0.95, pad: [0, 0, 9, 0],
    draw: (b, t, i) => {
      const base = 95;
      const k = [0.3, 0.7, 1, 1, 1, 1, 0.8, 0.6, 0.35, 0.15][i];
      for (const [x0, w] of [[10, 3.5], [20, 5], [33, 2.5]] as const) {
        for (let y = 0; y < base; y++) {
          const cx = x0 + y * 0.18;
          const fadeTop = Math.min(1, y / 30);
          for (let x = Math.floor(cx - w); x <= cx + w; x++) {
            const d = Math.abs(x + 0.5 - cx) / w;
            if (!dith(x, y, (1 - d) * k * 0.55 * fadeTop)) continue;
            b.set(x, y, rampDither(ramps.gold, 1.6 + (1 - d) * 2, x, y));
          }
        }
      }
      ellipseRing(b, 30, base, 12 + t * 12, 4 + t * 3, 1.6, (x, y, a) => rampDither(ramps.gold, 3.6 - t * 2 + Math.sin(a) * 0.6, x, y));
      const r = rng(151);
      for (let s = 0; s < 12; s++) {
        const x = Math.round(8 + r() * 44), ph = r();
        const tt = (t + ph) % 1;
        const y = Math.round(base - tt * 70);
        b.set(x, y, s % 3 === 0 ? ramps.gold[4] : ramps.green[Math.max(1, Math.min(4, Math.round((1 - tt) * 4 + 0.4)))]);
        if (s % 3 === 0) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, ramps.gold[3]);
      }
    },
  },

  // Warden's Vigil: a ward ring at each ally's feet, light pillars, the counter sigil
  vigil: {
    w: 56, h: 84, n: 9, ms: 65, ax: 0.5, ay: 0.95, pad: [0, 0, 10, 0],
    draw: (b, t, i) => {
      const base = 79;
      ellipseRing(b, 28, base, 8 + t * 18, 3 + t * 5, 2, (x, y, a) => rampDither(ramps.turquoise, 3.6 - t * 1.6 + Math.sin(a) * 0.6, x, y));
      ellipseRing(b, 28, base, 5 + t * 12, 2 + t * 3.5, 1, (x, y) => (dith(x, y, 0.6) ? ramps.gold[3] : 0));
      const hgt = Math.min(1, t * 2.4) * 58 * (1 - Math.max(0, t - 0.7) * 3);
      for (const x of [14, 42]) {
        for (let y = Math.round(base - hgt); y < base; y++) {
          b.set(x, y, rampDither(ramps.turquoise, 2 + (y - (base - hgt)) / 20, x, y));
          if ((y + i) % 5 === 0) b.set(x - 1, y, ramps.gold[4]);
        }
      }
      if (i >= 2 && i <= 7) crossedBlades(b, 28, 14, 7, ramps.steel, ramps.gold);
    },
  },

  // The jackal's howl rolling out from the muzzle (actor effect on Warden's Vigil)
  howl: {
    w: 72, h: 56, n: 7, ms: 55, ax: 0.15, ay: 0.5,
    draw: (b, t) => {
      for (let k = 0; k < 3; k++) {
        const r = 6 + (t * 1.4 - k * 0.22) * 46;
        if (r < 4 || r > 64) continue;
        const fade = 1 - r / 64;
        for (let a = -0.85; a <= 0.85; a += 0.03) {
          const x = Math.round(10 + Math.cos(a) * r), y = Math.round(28 + Math.sin(a) * r * 0.9);
          if (!dith(x, y, fade + 0.25)) continue;
          b.set(x, y, rampDither(ramps.turquoise, 2 + fade * 2.5, x, y));
          if (Math.abs(a) < 0.5) b.set(x - 1, y, ramps.gold[fade > 0.5 ? 3 : 2]);
        }
      }
    },
  },

  // Mechanic cues shared by everyone
  counter: {
    w: 32, h: 28, n: 6, ms: 60, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      if (i < 3) burst(b, 16, 13, 8, 1, [7, 12, 9][i], 1.3, ramps.gold, 0.39);
      if (i < 5) crossedBlades(b, 16, 13, i === 0 ? 5 : 7, ramps.steel, ramps.gold);
      if (i >= 3) sparks(b, 16, 13, 10, 14, t, ramps.gold, 171, 6);
    },
  },
  dispel: {
    w: 60, h: 60, n: 7, ms: 50, ax: 0.5, ay: 0.5, pad: [4, 4, 10, 4],
    draw: (b, t, i) => {
      if (i < 2) ellipseRing(b, 30, 30, 15 - i * 3, 18 - i * 3, 1.8, (x, y, a) => rampDither(ramps.steel, 3.5 + Math.sin(a * 3) * 0.6, x, y));
      if (i >= 1) {
        const r = rng(161);
        for (let k = 0; k < 14; k++) {
          const a = r() * Math.PI * 2, d0 = 10 + t * 22 * (0.6 + r() * 0.6);
          const x = 30 + Math.cos(a) * d0, y = 30 + Math.sin(a) * d0 + 12 * t * t;
          shard(b, x, y, x + Math.cos(a + 1.3) * 4, y + Math.sin(a + 1.3) * 4, 1.6, ramps.steel);
        }
      }
      if (i === 1) burst(b, 30, 30, 8, 2, 12, 1.6, ramps.steel, 0.4);
    },
  },
  blocked: {
    w: 30, h: 30, n: 6, ms: 75, ax: 0.5, ay: 0.5,
    draw: (b, t, i) => {
      const s = Math.round(4 * [0.6, 1.1, 1, 1, 0.9, 0.8][i]);
      const c = i > 3 ? withAlpha(ramps.green[2], 150) : ramps.green[2];
      // a healing cross, struck through
      for (let y = 15 - s * 2; y <= 15 + s * 2; y++) for (let x = 15 - s + 1; x <= 15 + s - 1; x++) b.set(x, y, c);
      for (let x = 15 - s * 2; x <= 15 + s * 2; x++) for (let y = 15 - s + 1; y <= 15 + s - 1; y++) b.set(x, y, c);
      for (let k = -s * 2 - 2; k <= s * 2 + 2; k++) {
        b.set(15 + k, 15 + k, ramps.blood[3]);
        b.set(16 + k, 15 + k, ramps.blood[2]);
        b.set(15 + k, 16 + k, ramps.blood[1]);
      }
    },
  },
};
