// The Ashveil Reign's effects. The Skeleton's Rusty Hack: a dull cut hacked
// down through the target, ragged where the blade's notches tear it, and
// flakes of rust shaken off the iron, falling. The Rot Hulk's Putrid Slam: a
// heavy dull flash where his fists land, gobbets of rot splashing out and
// falling, a puff of rot gas spreading. Drawn as matter, not light (neither is
// in the additive set of src/game/view/scene.ts): an old blade does not shine,
// and neither does rot. The Bellringer's Warning Toll: rings of sound opening
// from his bell in its gold, and on the ally he warns the toll arriving and a
// shell of the same gold closing round it; his Last Peal: the bell tolling by
// itself and the gold closing round him. The bell's gold is light (additive).
// The Necromancer's black motes: they fly at the enemy in a knot (Grave
// Chill's bolt) and strike in a dull burst, thrown out and sinking; his Plague
// Verse closes on the enemy as a dark smoke turning sickly; his allies'
// haste is his motes spiralling up round them; Raise Dead opens a black sigil
// where the ally fell and the motes and pale wisps rise from it; the flare of
// his book's pages is light (additive), the rest is matter. The Automated
// Soul's arrows: a wooden shaft, an iron head, azure fletching like his plate;
// Unerring Shot bites in a short dull flash and splinters; Sundering Volley
// drives arrows into the ground about the enemy's feet, each with a puff of
// dust; Pinning Shot's arrow trails the pale light of his gorget and lands
// heavy, a ring of that light jarring out from it. All matter.
// Never their affinity (affinities are abstract, Jakub, 2026-10-11).
import { ACCENT, MAT } from '../palette.ts';
import { dith, ellipseFill, ellipseRing, line, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hex, RGBA, rng } from '../raster.ts';
import { burst, cut, FxDef, motes, ramps, ring, soundRings, sparks, W } from './kit.ts';

const DU = ramps.dust;
/** A dull streak: grey to a pale core, no hue of its own. */
const DULL: RGBA[] = [DU[0], DU[2], DU[3], DU[4], W];
const RUST = ramps.rust;
const BILE = ramps.bile;
/** the rot's gas: bile green and bruise grey */
const GAS: RGBA[] = [BILE[0], BILE[1], DU[1], BILE[2]];
/** the gold of the Bellringer's bell, as light */
const GOLD = ramps.gold;
/** the Necromancer's motes: black, a dull violet glint on them */
const MOTE: RGBA[] = ['#07060a', '#1c1922', '#383341', '#5a4a78', '#a088c8'].map((h) => hex(h));
/** his plague: dark smoke turning a sickly green */
const CURSE = ramps.curse;
/** the light of his book's pages */
const VIO = ramps.violet;
/** the Automated Soul's arrows: the shaft's wood, the iron head, the azure fletching */
const WOOD = MAT.wood.ramp, IRON = MAT.iron.ramp, AZF = MAT.blue.ramp;
/** splinters of the shaft */
const SPLINTER = ramps.wood;
/** the pale light in his gorget, which his Pinning Shot carries */
const SOUL: RGBA[] = [MAT.ashBone.ramp[1], MAT.ashBone.ramp[2], MAT.ashBone.ramp[3], MAT.ashBone.ramp[4], ACCENT.ashEye];

/** One of his arrows pointing right, its point at (x1, y): the shaft from x0, fletching at its tail. */
function soulArrow(b: Bitmap, x0: number, x1: number, y: number) {
  line(b, x0 + 1, y, x1 - 5, y, WOOD[4]);
  b.set(x0, y, WOOD[2]);
  polyFill(b, [[x1 - 6, y - 3], [x1 + 0.5, y], [x1 - 6, y + 3], [x1 - 4.5, y]], (px, py) => IRON[py < y ? 4 : 3]);
  b.set(x0 + 1, y - 1, AZF[4]); b.set(x0 + 2, y - 1, AZF[3]); b.set(x0 + 3, y - 1, AZF[3]);
  b.set(x0 + 1, y + 1, AZF[3]); b.set(x0 + 2, y + 1, AZF[2]); b.set(x0 + 3, y + 1, AZF[2]);
}

/** One of his black motes: a dark core, a glint over it; a big one is two pixels wide. */
function blackMote(b: Bitmap, x: number, y: number, big: boolean, k: number) {
  b.set(x, y, MOTE[0]);
  b.set(x, y - 1, MOTE[3 + (k & 1)]);
  if (big) {
    b.set(x + 1, y, MOTE[1]);
    b.set(x + 1, y - 1, MOTE[3]);
  }
}

export const ASHVEIL_REIGN_FX: Record<string, FxDef> = {
  /** Rusty Hack: a dull cut hacked down through the target, torn where the notches bite, rust flaking off and falling. */
  rusty_hack: {
    w: 80, h: 80, n: 7, ms: 45, ax: 0.5, ay: 0.5, pad: [4, 6, 14, 6],
    draw: (b, t, i) => {
      const x0 = 18, y0 = 12, x1 = 62, y1 = 66, bend = 4;
      const reach = [0.55, 0.95, 1, 1, 1, 1, 1][i];
      const heat = [1.3, 1.25, 1.0, 0.8, 0.6, 0.42, 0.28][i];
      const th = [3.2, 4.2, 3.4, 2.6, 1.9, 1.3, 0.9][i];
      if (i < 6) {
        cut(b, x0, y0, x1, y1, bend, th, DULL, heat, reach);
        // the notches tear bites out of the cut's lower edge
        const len = Math.hypot(x1 - x0, y1 - y0);
        const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
        for (const s of [0.36, 0.58, 0.74]) {
          if (s > reach) continue;
          const w = th * Math.sin(Math.PI * s);
          const cx = x0 + (x1 - x0) * s + nx * (bend * Math.sin(Math.PI * s) - w * 0.7);
          const cy = y0 + (y1 - y0) * s + ny * (bend * Math.sin(Math.PI * s) - w * 0.7);
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) if (Math.hypot(dx, dy) < 1.6 + w * 0.25) b.set(Math.round(cx + dx), Math.round(cy + dy), 0);
          }
        }
      }
      if (i === 1 || i === 2) burst(b, 40, 39, 7, 2, [12, 8][i - 1], 1.4, DULL, 0.4);
      // flakes of rust shaken off: they fly out, then fall
      if (i >= 1) sparks(b, 40, 39, 16, 24, (i - 1) / 5, RUST, 311, 46);
    },
  },
  /** Putrid Slam: a heavy dull flash where both fists land, gobbets of rot splashed out and falling, a puff of rot gas spreading and thinning. */
  putrid_slam: {
    w: 88, h: 84, n: 8, ms: 55, ax: 0.5, ay: 0.5, pad: [6, 8, 16, 8],
    draw: (b, t, i) => {
      const cx = 44, cy = 40;
      // the blow: a dull flash flattened by the weight of it
      if (i < 3) burst(b, cx, cy, 10, 3, [11, 17, 13][i], 2.2, DULL, 0.3);
      if (i === 0) for (let x = -9; x <= 9; x++) b.set(cx + x, cy + 1, W);
      // the gas: a ragged cloud spreading and thinning, drawn under the gobbets
      if (i >= 2) {
        const k = (i - 2) / 5;
        const rx = 12 + k * 18, ry = 6 + k * 8;
        for (let y = -Math.ceil(ry); y <= ry; y++) {
          for (let x = -Math.ceil(rx); x <= rx; x++) {
            const d = Math.hypot(x / rx, y / ry) + Math.sin(x * 0.7 + y * 1.3 + i) * 0.12;
            if (d > 1) continue;
            const thin = (1 - d) * (1 - k) * 0.8;
            if (!dith(cx + x, cy + y, thin)) continue;
            b.set(cx + x, cy + y - Math.round(k * 4), GAS[Math.min(GAS.length - 1, Math.floor((1 - d) * GAS.length))]);
          }
        }
      }
      // gobbets of rot: they fly out, then fall
      if (i >= 1) sparks(b, cx, cy, 26, 30, (i - 1) / 6, BILE, 419, 80);
    },
  },
  /**
   * Warning Toll at the bell: rings of sound opening from the bell's mouth as
   * the clapper strikes. Played on the skill's `cast` event at the actor's
   * head point (8 px ahead of his feet and 8 below the top of his idle
   * sprite, 80 px up); in the toll frame the bell's mouth is 39 px further on
   * and 27 px lower, where the rings start.
   */
  toll_rings: {
    w: 84, h: 72, n: 9, ms: 60, ax: 0.107, ay: 0.125, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 48, cy = 36;
      soundRings(b, cx, cy, i, 3, 1.6, 4.2, 6, GOLD);
      if (i < 3) burst(b, cx, cy, 8, 1, [7, 11, 8][i], 1.1, GOLD, 0.4);
    },
  },
  /**
   * Warning Toll reaches an ally: the rings of the toll closing in on it, then
   * a shell of the bell's gold closing round it for a moment (its Shield) and
   * a ring settling at its feet, motes of gold rising. Anchored at its feet.
   */
  warning_toll: {
    w: 72, h: 96, n: 10, ms: 60, ax: 0.5, ay: 1, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 36, gy = 94, cy = gy - 40;
      // the toll arriving: rings shrinking onto the ally's chest
      if (i < 4) {
        const r = [30, 22, 14, 8][i];
        ellipseRing(b, cx, cy, r, r * 0.92, 1.6, (x, y, a) => (dith(x, y, 0.5 + i * 0.12) ? rampDither(GOLD, 2.2 + i * 0.5 + Math.abs(Math.cos(a)) * 0.6, x, y) : 0));
      }
      // the shell closing round it, then fading
      const fade = i < 3 ? [0, 0.6, 1][i] : i < 6 ? 1 : [0.75, 0.5, 0.3, 0.15][i - 6];
      if (fade > 0) ellipseRing(b, cx, cy, 20, 38, 1.4, (x, y, a) => (dith(x, y, fade * 0.75 * (0.45 + 0.55 * Math.abs(Math.sin(a + t * 2)))) ? rampDither(GOLD, 2 + fade * 1.8, x, y) : 0));
      if (i >= 2) ellipseRing(b, cx, gy - 2, 10 + fade * 10, 3 + fade * 2, 1.2, (x, y, a) => (dith(x, y, fade) ? rampDither(GOLD, 2.4 + Math.sin(a) * 0.6, x, y) : 0));
      if (i >= 2) motes(b, cx, gy - 6, 34, 64, 8, (i - 2) / 8, GOLD, 431);
    },
  },
  /**
   * Last Peal: the bell tolls by itself the first time he falls below half
   * his HP, and the gold closes round him (his DEF Up). Anchored at his feet;
   * as he takes the blow his arm is thrown back and the bell hangs 25 px
   * behind his feet and 28 up, where the rings start.
   */
  last_peal: {
    w: 124, h: 112, n: 10, ms: 60, ax: 0.5, ay: 1, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const fx = 62, gy = 110;
      soundRings(b, fx - 25, gy - 28, i, 3, 1.8, 4.0, 6, GOLD);
      const fade = i < 2 ? [0.5, 1][i] : i < 6 ? 1 : [0.75, 0.5, 0.3, 0.15][i - 6];
      ellipseRing(b, fx, gy - 46, 17, 46, 1.4, (x, y, a) => (dith(x, y, fade * 0.7 * (0.45 + 0.55 * Math.abs(Math.sin(a * 2 + t * 3)))) ? rampDither(GOLD, 2 + fade * 1.8, x, y) : 0));
      motes(b, fx, gy - 4, 30, 90, 9, t, GOLD, 433);
    },
  },

  /** Grave Chill in flight: a knot of black motes at its head, others streaming behind it on a wavering line (drawn pointing right; the battle turns it). */
  grave_bolt: {
    w: 26, h: 12, n: 3, ms: 60, ax: 0.8, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      const hx = 21, hy = 6;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [2, 1]]) b.set(hx + dx, hy + dy, MOTE[(dx + dy + i) & 1 ? 1 : 0]);
      b.set(hx, hy - 2, MOTE[4]);
      b.set(hx + 2, hy - 1, MOTE[3]);
      b.set(hx - 1, hy - 1, MOTE[3]);
      for (let k = 1; k <= 6; k++) blackMote(b, Math.round(hx - 1 - k * 3), Math.round(hy + Math.sin(i * 2.1 + k * 1.3) * 2.2), k < 3, k);
    },
  },
  /** Grave Chill lands: a dull flash, a ring of cold grey spreading and thinning, the motes thrown out, slowing and sinking. */
  grave_chill: {
    w: 52, h: 52, n: 7, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 2, 10, 2],
    draw: (b, t, i) => {
      const cx = 26, cy = 26;
      if (i < 3) burst(b, cx, cy, 8, 1, [6, 10, 8][i], 1.2, DULL, 0.4);
      if (i >= 1) ring(b, cx, cy, 4 + (i - 1) * 3.4, (4 + (i - 1) * 3.4) * 0.8, Math.max(0.6, 1.6 - (i - 1) * 0.25), DULL, Math.max(0.3, 1.1 - (i - 1) * 0.18));
      if (i >= 1) {
        const r = rng(331);
        const k1 = (i - 1) / 5;
        for (let k = 0; k < 11; k++) {
          const a = r() * Math.PI * 2, sp = 0.5 + r() * 0.6;
          const d = 18 * sp * Math.sqrt(k1);
          blackMote(b, Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d + k1 * k1 * 10), k % 3 === 0, k);
        }
      }
    },
  },
  /**
   * Plague Verse reaches the enemy: a dark smoke gathering round it from every
   * side, turning sickly green as it closes, black motes spiralling in with it,
   * then rising off it and thinning. Anchored at its feet.
   */
  plague_verse: {
    w: 64, h: 88, n: 10, ms: 60, ax: 0.5, ay: 1, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 32, gy = 86, cy = gy - 34;
      const close = i < 4 ? i / 4 : 1;
      const fade = i < 5 ? 1 : 1 - (i - 5) / 5;
      const lift = i >= 5 ? (i - 5) * 4 : 0;
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2 + t * 3;
        const r = (28 - close * 15) * (0.8 + 0.3 * Math.sin(k * 1.7));
        const x = cx + Math.cos(a) * r * 0.7, y = cy + Math.sin(a) * r * 1.15 - lift;
        ellipseFill(b, x, y, 3.4 + close * 1.8, 2.8 + close * 1.2, (px, py, d) => (dith(px, py, fade * (1.5 - d)) ? rampDither(CURSE, 0.5 + close * 2.3 - d * 0.8 + (k % 3 === 0 ? 0.6 : 0), px, py) : 0));
      }
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 - t * 5;
        const r = (24 - close * 16) * (0.7 + 0.3 * ((k * 7) % 3));
        blackMote(b, Math.round(cx + Math.cos(a) * r * 0.8), Math.round(cy + Math.sin(a) * r - lift), k % 3 === 0, k);
      }
      if (i >= 3 && i <= 7) sparks(b, cx, cy - lift, 9, 18, (i - 3) / 4, CURSE.slice(2), 341, -12);
    },
  },
  /** The haste Plague Verse gives his allies: his motes spiralling up round each, streaks of pale light rising beside them, a ring at the feet. Anchored at the feet. */
  grave_haste: {
    w: 44, h: 78, n: 8, ms: 55, ax: 0.5, ay: 1, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 22, gy = 76;
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + t * 6;
        const h = (t * 1.3 + k / 9) % 1;
        blackMote(b, Math.round(cx + Math.cos(a) * (12 - h * 4)), Math.round(gy - 4 - h * 58), k % 3 === 0, k);
      }
      for (const sx of [-14, -6, 8, 15]) {
        const len = 6 + (i % 3) * 3, top = gy - 20 - ((i * 7 + sx * 3 + 60) % 30);
        for (let y = top; y < top + len; y++) if (dith(cx + sx, y, 0.6)) b.set(cx + sx, y, VIO[y - top < 2 ? 3 : 2]);
      }
      if (i < 6) ellipseRing(b, cx, gy - 2, 10 + i * 1.5, 3 + i * 0.4, 1.2, (x, y, a) => (dith(x, y, 1 - i / 6) ? MOTE[Math.sin(a) > 0 ? 3 : 2] : 0));
    },
  },
  /**
   * Raise Dead, where the ally fell: a black sigil opening on the ground, two
   * rings with a violet glint running round them; the motes rising from it in
   * a column, and pale wisps going up with them as the fallen gets up. Anchored
   * at its feet.
   */
  raise_dead: {
    w: 76, h: 100, n: 12, ms: 70, ax: 0.5, ay: 1, pad: [2, 2, 12, 2],
    draw: (b, t, i) => {
      const cx = 38, gy = 98;
      const open = Math.min(1, i / 3);
      const fade = i < 8 ? 1 : 1 - (i - 8) / 4;
      // the sigil: a dark disc of shadow under two rings, a violet glint running round each
      ellipseFill(b, cx, gy - 3, 6 + open * 16, 2 + open * 4.4, (x, y, d) => (dith(x, y, fade * 0.55 * (1 - d * 0.6)) ? MOTE[d < 0.5 ? 0 : 1] : 0));
      ellipseRing(b, cx, gy - 3, 8 + open * 18, 2.4 + open * 5, 1.8, (x, y, a) => (dith(x, y, fade) ? (Math.sin(a * 3 + t * 6) > 0.1 ? VIO[2] : MOTE[1]) : 0));
      ellipseRing(b, cx, gy - 3, 4 + open * 10, 1.4 + open * 3, 1.2, (x, y, a) => (dith(x, y, fade * 0.9) ? (Math.cos(a * 2 - t * 5) > 0 ? VIO[1] : MOTE[0]) : 0));
      // the motes rising from it in a column
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2 + t * 5;
        const h = (t * 1.4 + k / 24) % 1;
        if (h > open * 1.2 || fade <= 0.1) continue;
        const r = (14 + open * 6) * (1 - h * 0.5);
        blackMote(b, Math.round(cx + Math.cos(a) * r), Math.round(gy - 4 - h * 82), k % 3 === 0, k);
      }
      // pale wisps of what comes back, curling up with them, two pixels wide
      for (let k = 0; k < 6; k++) {
        const base = (t * 1.2 + k / 6) % 1;
        for (let s2 = 0; s2 < 16; s2++) {
          const hh = base + s2 * 0.02;
          if (hh > 1) break;
          const x = Math.round(cx + Math.sin(hh * 9 + k * 1.1) * (12 - hh * 7)), y = Math.round(gy - 8 - hh * 80);
          const k2 = fade * (1 - s2 / 16);
          if (!dith(x, y, k2 * 1.1)) continue;
          b.set(x, y, VIO[s2 < 4 ? 4 : 3]);
          if (s2 < 8) b.set(x + 1, y, VIO[s2 < 4 ? 3 : 2]);
        }
      }
    },
  },
  /**
   * The flare of his book on Raise Dead's `cast` event: the pages blaze with a
   * pale violet light, a ring opens round them and motes of it rise (additive).
   * The scene plays it 8 px ahead of the top of his standing sprite and 8 below
   * it; the open book stands 17.8 px further ahead and 14.6 lower, where the
   * flare sits.
   */
  tome_flare: {
    w: 56, h: 56, n: 8, ms: 55, ax: 0.182, ay: 0.239, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 28, cy = 28;
      if (i < 4) burst(b, cx, cy, 10, [2, 3, 2, 1][i], [9, 14, 11, 7][i], [1.6, 2, 1.4, 1][i], VIO, 0.3 + i * 0.2);
      ring(b, cx, cy, 3 + t * 16, 2 + t * 8, Math.max(0.6, 1.8 - t * 1.2), VIO, 1.1 - t * 0.6);
      motes(b, cx, cy - 2, 24, 26, 8, t, VIO, 351);
    },
  },

  /** The Automated Soul's arrow in flight (drawn pointing right; the battle turns it along its path). */
  soul_arrow: {
    w: 26, h: 7, n: 1, ms: 100, ax: 0.8, ay: 0.5, loop: true,
    draw: (b) => soulArrow(b, 1, 25, 3),
  },
  /** Pinning Shot in flight: his arrow at full draw, the pale light of his gorget streaming off it and a gleam on its head. */
  pinning_arrow: {
    w: 32, h: 9, n: 2, ms: 60, ax: 0.82, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      for (let x = 0; x < 12; x++) if ((x + i) % 3 !== 0) b.set(x, 4 + ((x + i) % 2 ? 0 : x > 6 ? -1 : 1), SOUL[x > 7 ? 3 : 2]);
      soulArrow(b, 7, 31, 4);
      b.set(28, 3, SOUL[4]);
      if (i === 1) b.set(29, 2, W);
    },
  },
  /** Unerring Shot lands: a short dull flash where the head bites, splinters of the shaft thrown off and falling, a little ring of dust. */
  arrow_strike: {
    w: 40, h: 40, n: 6, ms: 45, ax: 0.5, ay: 0.5, pad: [2, 2, 8, 2],
    draw: (b, t, i) => {
      const cx = 20, cy = 20;
      if (i < 3) burst(b, cx, cy, 6, 1, [6, 9, 6][i], 1.0, DULL, 0.3);
      if (i >= 1) sparks(b, cx, cy, 7, 13, (i - 1) / 4, SPLINTER, 517, 7);
      if (i >= 2) ring(b, cx, cy, 3 + (i - 2) * 2.6, (3 + (i - 2) * 2.6) * 0.8, Math.max(0.6, 1.3 - (i - 2) * 0.2), DULL, Math.max(0.3, 1 - (i - 2) * 0.2));
    },
  },
  /**
   * Sundering Volley comes down round the enemy: arrows driving into the ground
   * about its feet one after another, each with a puff of dust, standing
   * slanted the way they fell, then fading. Anchored at its feet; the battle
   * mirrors it for an archer on the other side.
   */
  arrow_volley: {
    w: 64, h: 40, n: 10, ms: 55, ax: 0.5, ay: 1, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const gy = 37;
      const fade = i < 7 ? 1 : 1 - (i - 6) / 4;
      // where each arrow stands, how far back on the ground, when it lands, its slant
      const spots: [number, number, number, number][] = [[16, 0, 0, -112], [45, 1, 1, -118], [27, 2, 2, -110], [37, 0, 3, -116], [9, 1, 4, -114], [54, 2, 5, -112]];
      for (const [x, dy, k, deg] of spots) {
        if (i < k) continue;
        const age = i - k;
        const y0 = gy - dy;
        const a = (deg * Math.PI) / 180, len = 10;
        const dx = Math.cos(a), dyy = Math.sin(a);
        for (let s2 = 0; s2 <= len; s2++) {
          const px = Math.round(x + dx * s2), py = Math.round(y0 + dyy * s2);
          if (!dith(px, py, fade)) continue;
          b.set(px, py, s2 > len - 3 ? AZF[s2 === len ? 4 : 3] : WOOD[s2 < 2 ? 2 : 4]);
          if (s2 > len - 3) b.set(px + 1, py, AZF[2]);
        }
        // the dust it kicks up as it drives in
        if (age < 3) ellipseFill(b, x, y0, 2.5 + age * 1.6, 1 + age * 0.5, (px, py, d) => (dith(px, py, (1 - age / 3) * (1 - d)) ? DU[2 + (d < 0.4 ? 1 : 0)] : 0));
      }
    },
  },
  /** Pinning Shot lands: a heavy dull flash, a ring of the pale light jarring out from it, splinters and pale sparks thrown off. */
  pinning_strike: {
    w: 56, h: 56, n: 7, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 2, 10, 2],
    draw: (b, t, i) => {
      const cx = 28, cy = 28;
      if (i < 3) burst(b, cx, cy, 8, 1.5, [9, 14, 10][i], 1.4, DULL, 0.2);
      if (i >= 1) ring(b, cx, cy, 5 + (i - 1) * 3.6, (5 + (i - 1) * 3.6) * 0.75, Math.max(0.6, 1.8 - (i - 1) * 0.25), SOUL, Math.max(0.3, 1.2 - (i - 1) * 0.18));
      if (i >= 1) sparks(b, cx, cy, 10, 20, (i - 1) / 5, SPLINTER, 613, 8);
      if (i >= 2) sparks(b, cx, cy, 8, 16, (i - 2) / 4, SOUL, 619, -4);
    },
  },
};
