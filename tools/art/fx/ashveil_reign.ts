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
// heavy, a ring of that light jarring out from it. All matter. Irving
// Wellbington's shield: Shield Bash lands in a round dull flash and the ring
// of its rim pressed out, dust and a few pale sparks of its runes; Bulwark
// Slam brings the rim down in a dull streak and a heavy flash, dust thrown out
// low; when Old Grudge wakes, the runes on the shield blaze with the pale light
// (additive). Brimhorn's Gore drives two dull streaks in and throws sparks of
// brimstone; his Chains of the Pit whips a length of iron chain across each
// enemy. The Veil Adept's Veilfire is a knot of black fire rimmed in violet,
// bursting in black tongues; her Shadow Feast is her shadow rearing up out of a
// pool at the enemy's feet and biting, once from each side. All matter. The
// Strung Thrall's Jerked Blow lands dull (matter); the violet of its threads
// flares on its control, stitches across each ally it mends and winds round the
// legs of whoever strikes it (light, additive).
// Never their affinity (affinities are abstract, Jakub, 2026-10-11).
import { ACCENT, MAT } from '../palette.ts';
import { dith, ellipseFill, ellipseRing, line, polyFill, rampDither } from '../paint.ts';
import { Bitmap, hex, RGBA, rng } from '../raster.ts';
import { burst, cut, flame, FxDef, motes, ramps, ring, soundRings, sparks, W } from './kit.ts';

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
/** Lycan's claws and teeth: grey to a pale edge; his howl and haste are the pale light of the Reign's sockets */
const FANG: RGBA[] = [DU[0], DU[2], DU[4], ACCENT.ashEye, W];
const PALE: RGBA[] = [DU[1], DU[3], ACCENT.ashEyeDim, ACCENT.ashEye, W];
/** a rake of three claws, slanted `dir` (1: down to the right, -1: up to the right) */
function clawRake(b: Bitmap, i: number, dir: 1 | -1, seed: number) {
  const cx = 30, cy = 30;
  for (const k of [-1, 0, 1]) {
    const y0 = cy - dir * 20 + k * 2, y1 = cy + dir * 18 + k * 2;
    if (i < 4) cut(b, cx - 14 + k * 7, y0, cx + 10 + k * 7, y1, dir * 4, [2.4, 2.8, 2, 1.1][i], FANG, [1.3, 1.15, 0.85, 0.5][i], [0.6, 1, 1, 1][i]);
  }
  if (i >= 1) sparks(b, cx, cy, 10, 20, (i - 1) / 4, DULL, seed, 6);
}
/** a row of teeth along an arc: `n` triangles pointing `down` (1) or up (-1), `gap` px off the line */
function teeth(b: Bitmap, cx: number, cy: number, gap: number, down: 1 | -1, fade: number) {
  for (let k = -3; k <= 3; k++) {
    const x = cx + k * 6, h = 11 - Math.abs(k) * 1.4;
    const y = cy + down * (gap + Math.abs(k) * 1.2);
    polyFill(b, [[x - 2.6, y], [x + 2.6, y], [x, y + down * h]], (px, py) => (dith(px, py, fade) ? rampDither(FANG, 2.6 + (Math.abs(py - y) < 2 ? 1.2 : 0), px, py) : 0));
  }
}
/** the Wraith's talons tearing: dark grey to a pale edge */
const TALON: RGBA[] = [MAT.shroud.ramp[0], MAT.shroud.ramp[2], MAT.shroud.ramp[4], MAT.shroud.ramp[5], W];
/** shreds of the Wraith's shroud */
const SHREDS: RGBA[] = MAT.shroud.ramp.slice(1, 6);
/** its wail: the shroud's grey-green, pale at the front of the sound */
const WAIL: RGBA[] = [MAT.shroud.ramp[2], MAT.shroud.ramp[3], MAT.shroud.ramp[4], MAT.shroud.ramp[5], ACCENT.ashEye];
/** the Haruspex's ill omen: the dark */
const OMEN: RGBA[] = [MAT.blackCloth.ramp[0], MAT.blackCloth.ramp[2], MAT.blackCloth.ramp[4]];
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

/** The Cinder Sylph's coal and embers, and her ash. */
const FI = ramps.fire;
const SM = ramps.smoke;

/** Brimhorn's chain: the iron's grey, a dull flash at its links' edges; flecks off it. */
const CHAINFLECK: RGBA[] = [IRON[1], IRON[2], IRON[3], IRON[4], W];
/** The Veil Adept's black fire: violet at the edge, black at the heart (flame() and burst() put the last colour at the core). */
const BLACKFIRE: RGBA[] = [VIO[3], VIO[1], MOTE[2], MOTE[1], MOTE[0]];

/** Links of chain along an arc of the ellipse round (cx, cy), from angle a0 to a1 (radians, a1 the leading end), dithered by `fade`. */
function chainArc(b: Bitmap, cx: number, cy: number, r: number, a0: number, a1: number, fade: number) {
  const n = Math.max(1, Math.floor((Math.abs(a1 - a0) * r) / 2.6));
  for (let k = 0; k <= n; k++) {
    const a = a0 + ((a1 - a0) * k) / n;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.4;
    if (k % 2 === 0) ellipseRing(b, x, y, 1.8, 1.2, 0.9, (px, py) => (dith(px, py, fade) ? IRON[k === n ? 5 : 3] : 0));
    else if (dith(Math.round(x), Math.round(y), fade)) b.set(Math.round(x), Math.round(y), IRON[4]);
  }
}

/**
 * The Veil Adept's shadow rising under an enemy (box 72x104, the feet at 96):
 * a black pool spreads, a flat black figure rears up out of it behind the enemy
 * (`dir` 1: from the left, -1: from the right), its head comes down at the
 * chest with the jaws open, two violet eyes, and the jaws close on the 4th
 * frame in a violet flash; then it sinks back into the pool.
 */
function shadowBite(b: Bitmap, i: number, dir: 1 | -1) {
  const gy = 96, X = (x: number) => (dir === 1 ? x : 72 - x);
  const h = [16, 36, 52, 56, 55, 50, 38, 22, 10, 0][i];
  const open = [0.4, 0.9, 1, 0.1, 0, 0, 0, 0, 0, 0][i];
  const fade = i < 7 ? 1 : [0.7, 0.45, 0.2][i - 7];
  const ink = (px: number, py: number) => (dith(px, py, fade) ? MOTE[(px + py) % 7 === 0 ? 1 : 0] : 0);
  ellipseFill(b, 36, gy, 16 - (i > 6 ? (i - 6) * 3 : 0), 3, (px, py) => (dith(px, py, fade) ? MOTE[0] : 0));
  if (h > 2) {
    // the body: a hunched column, the hump high behind, the neck bowed toward the enemy
    const hx = X(40), hy = gy - h * 0.66;
    polyFill(b, [[X(12), gy], [X(28), gy], [X(30), gy - h * 0.45], [hx, hy + 2], [X(36), hy - 6], [X(24), gy - h], [X(14), gy - h * 0.8], [X(12), gy - h * 0.4]], ink);
    // the head and the jaws, open toward the enemy
    polyFill(b, [[X(32), hy - 4], [X(38), hy - 7], [X(44), hy - 5 - open * 3], [X(50), hy - 2 - open * 4], [X(42), hy - 1]], ink);
    polyFill(b, [[X(32), hy + 1], [X(42), hy + 1], [X(50), hy + 2 + open * 4], [X(44), hy + 4 + open * 2], [X(36), hy + 5]], ink);
    if (open > 0.3) {
      for (const k of [0, 1, 2]) {
        b.set(X(41 + k * 3), Math.round(hy - 1 - open * (1.6 + k)), W);
        b.set(X(41 + k * 3), Math.round(hy + 2 + open * (1.6 + k)), W);
      }
    }
    if (fade > 0.4) {
      b.set(X(37), Math.round(hy - 4), VIO[4]);
      b.set(X(38), Math.round(hy - 4), VIO[3]);
    }
  }
  if (i === 3 || i === 4) burst(b, X(48), Math.round(gy - h * 0.66), 8, 1, i === 3 ? 10 : 7, 1.2, VIO, 0.4);
  if (i >= 3) sparks(b, X(48), Math.round(gy - 36), 8, 18, (i - 3) / 6, [MOTE[1], MOTE[2], MOTE[3], MOTE[4], VIO[3]], 1351 + dir, 6);
}

export const ASHVEIL_REIGN_FX: Record<string, FxDef> = {
  /** Cinder Touch in flight: a live cinder, a thread of sparks behind it (drawn pointing right). */
  cinder_mote: {
    w: 20, h: 9, n: 2, ms: 70, ax: 0.75, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      for (const [x, y] of [[2, 4], [5, 3 + i], [8, 5 - i], [10, 4]] as const) b.set(x + i, y, FI[1]);
      for (const [x, y, k] of [[14, 3, 2], [15, 3, 3], [13, 4, 2], [14, 4, 3], [15, 4, 4], [16, 4, 3], [14, 5, 2], [15, 5, 2]] as const) b.set(x, y, FI[k]);
    },
  },
  /** Cinder Touch lands: a small hot flash, sparks flung off and falling. Light. */
  cinder_touch: {
    w: 56, h: 56, n: 7, ms: 55, ax: 0.5, ay: 0.5, pad: [2, 2, 8, 2],
    draw: (b, t, i) => {
      const c = 28;
      if (i < 3) burst(b, c, c, 7, 1, [7, 13, 9][i], 1, FI, 0.4);
      sparks(b, c, c, 12, 22, t, FI, 1201, 16);
    },
  },
  /** Falling Ash from her wings: a low gust of ash thrown out and thinning. */
  ash_beat: {
    w: 96, h: 56, n: 8, ms: 70, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t) => {
      ring(b, 48, 28, 8 + t * 38, 3 + t * 18, 1.4, SM, 1 - t * 0.8);
      motes(b, 48, 30, 70, -14, 14, t, DU, 1213);
    },
  },
  /** Falling Ash on an enemy: grey flakes coming down over it, turning, a few still lit. */
  falling_ash: {
    w: 60, h: 92, n: 12, ms: 70, ax: 0.5, ay: 0.95, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const fade = i < 8 ? 1 : 1 - (i - 8) / 4;
      for (let k = 0; k < 22; k++) {
        const x = Math.round(30 + Math.sin(k * 3.7) * 22 + Math.sin(t * 7 + k) * 2.4);
        const y = Math.round(((k * 19) % 34) + t * 52);
        if (!dith(x, y, fade)) continue;
        const hot = k % 7 === 0;
        b.set(x, y, hot ? FI[2] : DU[3 + (k % 2)]);
        if (k % 2) b.set(x + (i % 2 ? 1 : -1), y, hot ? FI[0] : DU[2]);
      }
    },
  },
  /** Rise From Ash, over her: a crown of embers opening round the coal. Light. */
  ash_crown: {
    w: 84, h: 84, n: 12, ms: 70, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const c = 42;
      const k = [0.3, 0.6, 1, 1, 1, 0.9, 0.8, 0.7, 0.55, 0.4, 0.25, 0.1][i];
      burst(b, c, c, 10, 4, 6 + k * 18, 1, FI, t * 0.4);
      ring(b, c, c, 6 + t * 30, 6 + t * 30, 1.2, FI, 1 - t);
    },
  },
  /** Rise From Ash, on each of the fallen: ash whirling up from the ground in a column, embers in it, a ring of fire closing at the feet. */
  rise_from_ash: {
    w: 80, h: 108, n: 14, ms: 70, ax: 0.5, ay: 1, pad: [2, 2, 10, 2],
    draw: (b, t, i) => {
      const cx = 40, gy = 106;
      const open = Math.min(1, i / 3);
      const fade = i < 10 ? 1 : 1 - (i - 10) / 4;
      ellipseRing(b, cx, gy - 3, 8 + open * 20, 2.4 + open * 5.4, 1.8, (x, y, a) => (dith(x, y, fade) ? FI[Math.sin(a * 3 + t * 6) > 0 ? 3 : 1] : 0));
      for (let k = 0; k < 34; k++) {
        const a = (k / 34) * Math.PI * 2 * 3 + t * 8;
        const h = (t * 1.3 + k / 34) % 1;
        if (h > open * 1.2) continue;
        const rr = 20 * (1 - h * 0.55);
        const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(gy - 4 - h * 90 + Math.sin(a) * 3);
        if (!dith(x, y, fade * (1 - h * 0.5))) continue;
        b.set(x, y, k % 3 === 0 ? FI[2 + (k % 2)] : DU[2 + (k % 3)]);
      }
    },
  },
  /** Smoulder on the attacker: small flames licking up round it and going out, sparks above. Light. */
  smoulder: {
    w: 56, h: 72, n: 10, ms: 65, ax: 0.5, ay: 0.95, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const gy = 66;
      const h = [8, 16, 24, 28, 28, 24, 18, 12, 7, 3][i];
      flame(b, 18, gy, h * 0.8, 5, i * 0.9, FI);
      flame(b, 29, gy, h, 6, i * 0.9 + 2, FI);
      flame(b, 39, gy, h * 0.7, 4, i * 0.9 + 4, FI);
      motes(b, 28, gy - 18, 28, 34, 7, t, FI, 1231);
    },
  },
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
  /** Shield Bash lands: a round dull flash the size of the shield's face, the ring of its rim pressed out, dust and a few pale sparks of its runes thrown off. */
  shield_bash: {
    w: 56, h: 56, n: 7, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 2, 8, 2],
    draw: (b, t, i) => {
      const cx = 28, cy = 28;
      if (i < 3) burst(b, cx, cy, 8, 1.5, [8, 12, 9][i], 1.3, DULL, 0.25);
      if (i >= 1) {
        const r = 6 + (i - 1) * 3.2;
        ellipseRing(b, cx, cy, r * 0.8, r, Math.max(0.6, 1.8 - (i - 1) * 0.25), (x, y) => (dith(x, y, Math.max(0.2, 1 - (i - 1) / 6)) ? DULL[2] : 0));
        sparks(b, cx, cy, 8, 16, (i - 1) / 5, DU, 711, 8);
      }
      if (i >= 2 && i <= 5) sparks(b, cx, cy, 5, 12, (i - 2) / 3, SOUL, 719, -2);
    },
  },
  /** Bulwark Slam lands: the rim comes down in a dull streak through the enemy, a heavy flash where it bites, dust thrown out low. */
  bulwark_slam: {
    w: 64, h: 64, n: 8, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 2, 10, 2],
    draw: (b, t, i) => {
      const cx = 32, cy = 28;
      if (i < 3) cut(b, cx - 9, cy - 20, cx + 5, cy + 12, 6, 3 - i * 0.7, DULL, 1 - i * 0.2);
      if (i >= 1 && i < 5) burst(b, cx, cy + 2, 9, 2, [13, 17, 12, 8][i - 1], 1.5, DULL, 0.4);
      if (i >= 2) {
        const r = 6 + (i - 2) * 4;
        ring(b, cx, cy + 4, r, r * 0.5, Math.max(0.6, 1.6 - (i - 2) * 0.2), DU, Math.max(0.3, 1.1 - (i - 2) * 0.15));
        sparks(b, cx, cy + 6, 12, 24, (i - 2) / 6, DU, 727, 12);
      }
    },
  },
  /**
   * Old Grudge wakes: the runes on Irving Wellbington's shield blaze with the
   * pale light, a ring of it running round them and opening out, motes of it
   * rising (additive). The scene plays it at his chest; his shield stands
   * 15.3 px ahead of that point and 13 px lower, where the flare sits.
   */
  grudge_runes: {
    w: 64, h: 64, n: 9, ms: 60, ax: 0.261, ay: 0.297, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 32, cy = 32;
      const fade = i < 5 ? 1 : 1 - (i - 4) / 5;
      // the eight runes, blazing where they sit on the shield's face
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.35;
        const x = Math.round(cx + Math.sin(a) * 7.7), y = Math.round(cy - Math.cos(a) * 9.6);
        for (const [dx, dy] of [[0, -1], [0, 0], [0, 1], [1, -1]] as const) if (dith(x + dx, y + dy, fade)) b.set(x + dx, y + dy, SOUL[dy === 0 ? 4 : 3]);
      }
      const r = 10 + t * 10;
      ring(b, cx, cy, r * 0.8, r, Math.max(0.6, 1.6 - t), SOUL, fade);
      if (i < 3) burst(b, cx, cy, 8, 1, [6, 10, 7][i], 1.0, SOUL, 0.2);
      motes(b, cx, cy - 4, 26, 30, 8, t, SOUL, 733);
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

  /** Hobbling Thrust: a straight line of light driven through the target, a dull flash where it enters, red flecks thrown on. */
  dead_thrust: {
    w: 88, h: 52, n: 7, ms: 45, ax: 0.45, ay: 0.5, pad: [4, 6, 4, 4],
    draw: (b, t, i) => {
      const cx = 40, cy = 26;
      const reach = [0.55, 1, 1, 1, 1, 1, 1][i], heat = [1.4, 1.5, 1.2, 0.95, 0.7, 0.5, 0.3][i];
      if (i < 5) cut(b, 4, cy, 84, cy, 0, [1.8, 2.5, 2, 1.4, 0.9][i], DULL, heat, reach);
      if (i >= 1 && i <= 3) burst(b, cx, cy, 10, 2, [15, 11, 7][i - 1], 1.5, DULL, 0.2);
      if (i >= 1) sparks(b, cx + 6, cy, 12, 26, (i - 1) / 5, ramps.blood, 811, 8);
    },
  },
  /** Grave Pierce: the spear comes down through the target, a long heavy line from high to low, a flash and a ring where it stops. */
  grave_pierce: {
    w: 96, h: 104, n: 8, ms: 50, ax: 0.5, ay: 0.5, pad: [4, 4, 8, 4],
    draw: (b, t, i) => {
      const cx = 48, cy = 56;
      const reach = [0.5, 1, 1, 1, 1, 1, 1, 1][i], heat = [1.5, 1.5, 1.25, 1, 0.75, 0.5, 0.35, 0.2][i];
      if (i < 6) cut(b, 20, 8, 62, 86, 0, [2.6, 3.8, 3, 2.2, 1.5, 1][i], DULL, heat, reach);
      if (i >= 1 && i <= 3) burst(b, cx + 4, cy, 12, 3, [20, 15, 9][i - 1], 1.8, DULL, 0.25);
      if (i >= 1) ring(b, cx + 4, cy, 5 + i * 4, 4 + i * 3, Math.max(0.7, 2 - i * 0.25), ramps.blood, Math.max(0.2, 1.1 - i * 0.16));
      if (i >= 1) sparks(b, cx + 4, cy, 16, 32, (i - 1) / 6, ramps.blood, 821, 20);
    },
  },
  /** Last Bastion's call: a pale burst at the raised skull, rings going out from it. Additive, at his head on the `cast` event. */
  bastion_call: {
    w: 84, h: 72, n: 9, ms: 60, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      if (i < 4) burst(b, 42, 36, 12, 2, [10, 18, 14, 8][i], 1.6, DULL, 0.25);
      for (let k = 0; k < 2; k++) {
        const age = i - k * 3;
        if (age < 0 || age > 5) continue;
        ring(b, 42, 36, 6 + age * 6, 5 + age * 5, Math.max(0.6, 1.8 - age * 0.25), DULL, 1.1 - age * 0.18);
      }
    },
  },
  /** Last Bastion reaches an ally: a tower shield of pale light rises before it, a white bone across it, a ring closing at its feet; it holds and fades. Anchored at the feet. */
  bastion_ward: {
    w: 76, h: 84, n: 12, ms: 60, ax: 0.5, ay: 1, pad: [2, 4, 3, 4],
    draw: (b, t, i) => {
      const cx = 38, gy = 82;
      const up = [0.3, 0.65, 0.95, 1, 1, 1, 1, 1, 1, 1, 1, 1][i];
      const fade = i < 7 ? 1 : [0.8, 0.6, 0.42, 0.26, 0.12][i - 7];
      ellipseRing(b, cx, gy - 3, 24, 6, 1.3, (x, y, a) => (dith(x, y, fade * (Math.sin(a) > -0.1 ? 1 : 0.45)) ? rampDither(DULL, 3 + Math.sin(a) * 0.6, x, y) : 0));
      const top = gy - 8 - 62 * up, x0 = cx - 13, x1 = cx + 13;
      for (let y = Math.floor(top); y <= gy - 8; y++) {
        for (let x = x0; x <= x1; x++) {
          const edge = x <= x0 + 1 || x >= x1 - 1 || y <= top + 1 || y >= gy - 10;
          if (edge ? dith(x, y, fade) : dith(x, y, fade * 0.16)) b.set(x, y, edge ? W : DULL[2]);
        }
      }
      if (up >= 1) {
        const by = Math.round(top + 26);
        for (let x = cx - 8; x <= cx + 8; x++) for (const dy of [-1, 0, 1]) if (dith(x, by + dy, fade)) b.set(x, by + dy, W);
        for (const sx of [-9, 8]) for (const sy of [-3, 2]) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (dith(cx + sx + dx, by + sy + dy, fade)) b.set(cx + sx + dx, by + sy + dy, W);
      }
      motes(b, cx, gy - 10, 20, 50, 8, t, ramps.green, 831);
    },
  },
  /** Watch Rotation: he takes the watch, a ring of rose light at his feet and motes of it rising round him, a soft column. */
  watch_light: {
    w: 60, h: 84, n: 10, ms: 70, ax: 0.5, ay: 0.95, pad: [2, 4, 2, 4],
    draw: (b, t, i) => {
      const R = ramps.rose;
      const cx = 30, gy = 78;
      const rr = [6, 12, 17, 20, 22, 22, 21, 20, 18, 16][i];
      ellipseRing(b, cx, gy, rr, rr * 0.3, 1.2, (x, y, a) => (dith(x, y, 1 - t * 0.7) ? rampDither(R, 3.2 - t * 1.2 + Math.sin(a) * 0.5, x, y) : 0));
      motes(b, cx, gy - 4, 34, 66, 16, t, R, 811);
      if (i >= 2 && i < 8) motes(b, cx, gy - 10, 20, 50, 8, (t * 1.4) % 1, R, 823);
    },
  },
  /** Spade Cut: a dull chop, the rust at its edge, clods of grave dirt thrown off and falling. Matter. */
  spade_cut: {
    w: 56, h: 56, n: 6, ms: 55, ax: 0.5, ay: 0.5, pad: [2, 2, 8, 2],
    draw: (b, t, i) => {
      const cx = 28, cy = 28;
      if (i < 3) cut(b, cx + 10, cy - 18, cx - 10, cy + 16, 5, 3.2 - i * 0.8, [RUST[1], RUST[3], DU[3], DU[4], W], 1 - i * 0.2);
      if (i >= 1) sparks(b, cx, cy + 2, 12, 20, (i - 1) / 5, ramps.sand, 911, 14);
    },
  },
  /** Shallow Grave: the spade comes down: a heavy dull streak, a ring pressed into the ground, a spray of dirt thrown high and falling. Matter. */
  shallow_grave: {
    w: 76, h: 72, n: 8, ms: 60, ax: 0.5, ay: 0.72, pad: [2, 2, 10, 2],
    draw: (b, t, i) => {
      const cx = 38, cy = 52;
      if (i < 2) cut(b, cx + 2, cy - 34, cx - 2, cy + 2, 2, 2 - i * 0.6, [DU[0], DU[1], DU[2], DU[3]], 0.7);
      if (i >= 1 && i < 5) burst(b, cx, cy, 9, 2, [12, 18, 14, 9][i - 1], 1.6, ramps.sand, 0.3);
      if (i >= 1) {
        const r = 6 + (i - 1) * 4;
        ring(b, cx, cy + 2, r, r * 0.34, Math.max(0.6, 1.6 - (i - 1) * 0.2), DU, Math.max(0.3, 1.1 - (i - 1) * 0.14));
        sparks(b, cx, cy - 2, 20, 32, (i - 1) / 7, ramps.sand, 919, 26);
      }
    },
  },
  /** Ash Flick: a small puff of ash bursting on the enemy and drifting off. Matter. */
  ash_flick: {
    w: 48, h: 48, n: 7, ms: 60, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 24, cy = 24;
      if (i < 3) burst(b, cx, cy, 7, 1, [6, 11, 8][i], 1.1, DU, 0.5);
      sparks(b, cx, cy, 14, 18, t, DU, 929, 6);
      motes(b, cx, cy - 2, 20, 18, 8, t, DU, 937);
    },
  },
  /** Sift the Ash: ash sifting down over the ally from above its head, pale and calm, and settling in a ring at its feet. Matter. */
  sift_ash: {
    w: 60, h: 84, n: 10, ms: 70, ax: 0.5, ay: 0.95, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 30, gy = 78;
      for (let k = 0; k < 26; k++) {
        const x = Math.round(cx + Math.sin(k * 12.9) * (6 + (k % 5) * 3.4));
        const y = Math.round(((k * 19) % 60) + t * 42);
        if (y > gy || !dith(x, y, 1 - t * 0.5)) continue;
        b.set(x, y, SOUL[1 + (k % 4)]);
      }
      const rr = 6 + t * 16;
      if (i >= 3) ring(b, cx, gy, rr, rr * 0.3, 1, SOUL, 1 - t * 0.6);
    },
  },
  /** Keening: her keen, rings of grey going out from her head, ash shaken loose. Matter. */
  keening: {
    w: 72, h: 72, n: 10, ms: 70, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      soundRings(b, 36, 36, i, 10, 3, 4, 6, SOUL);
      motes(b, 36, 36, 26, 20, 8, t, DU, 941);
    },
  },

  // --- Coffin's Legs (section 61) -----------------------------------------
  /** Lid Crush lands: the coffin's flat face meets the enemy in a broad dull flash, dust pressed out in a ring, splinters of old wood thrown off. Matter. */
  lid_crush: {
    w: 64, h: 64, n: 8, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 2, 10, 2],
    draw: (b, t, i) => {
      const cx = 32, cy = 30;
      if (i < 3) {
        // the coffin's face: a tall flat flash
        for (let y = cy - 14 + i * 2; y <= cy + 14 - i * 2; y++) for (let x = cx - 3; x <= cx + 3; x++) if (dith(x, y, 1 - i * 0.3)) b.set(x, y, DULL[Math.abs(x - cx) < 2 ? 4 : 3]);
      }
      if (i >= 1 && i < 5) burst(b, cx, cy, 10, 2, [14, 18, 13, 8][i - 1], 1.6, DULL, 0.3);
      if (i >= 2) {
        const r = 7 + (i - 2) * 4;
        ring(b, cx, cy, r * 0.6, r, Math.max(0.6, 1.6 - (i - 2) * 0.22), DU, Math.max(0.3, 1.1 - (i - 2) * 0.15));
        sparks(b, cx, cy, 12, 26, (i - 2) / 6, ramps.wood, 951, 14);
      }
    },
  },
  /** Bear the Dead's knock: the coffin planted, dull rings carrying out from it. Played at his head on the `cast` event. Matter. */
  pall_knock: {
    w: 84, h: 72, n: 10, ms: 60, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      soundRings(b, 42, 36, i, 3, 3, 5, 6, DULL);
    },
  },
  /** Bear the Dead reaches an ally: the shape of a coffin's lid in pale light rises before it, the white bone across it, and holds, then fades. Anchored at the feet (additive). */
  pall_ward: {
    w: 60, h: 84, n: 12, ms: 60, ax: 0.5, ay: 1, pad: [2, 4, 3, 4],
    draw: (b, t, i) => {
      const cx = 30, gy = 82;
      const up = [0.3, 0.65, 0.95, 1, 1, 1, 1, 1, 1, 1, 1, 1][i];
      const fade = i < 7 ? 1 : [0.8, 0.6, 0.42, 0.26, 0.12][i - 7];
      ellipseRing(b, cx, gy - 3, 20, 5, 1.2, (x, y, a) => (dith(x, y, fade * (Math.sin(a) > -0.1 ? 1 : 0.45)) ? rampDither(SOUL, 3 + Math.sin(a) * 0.6, x, y) : 0));
      // the lid: six-sided, its head up, the widest at the shoulders
      const h = 58 * up, base = gy - 8, top = base - h;
      const sh = base - h * 0.72;
      const half = (y: number) => (y > sh ? 6 + ((base - y) / (base - sh)) * 6 : 12 - ((sh - y) / (sh - top)) * 5);
      for (let y = Math.floor(top); y <= base; y++) {
        const hw = half(y);
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
          const edge = x <= cx - hw + 1 || x >= cx + hw - 1 || y <= top + 1 || y >= base - 1;
          if (edge ? dith(x, y, fade) : dith(x, y, fade * 0.18)) b.set(x, y, edge ? SOUL[4] : SOUL[2]);
        }
      }
      if (up >= 1) {
        const by = Math.round(sh + 3);
        for (let x = cx - 7; x <= cx + 7; x++) for (const dy of [0, 1]) if (dith(x, by + dy, fade)) b.set(x, by + dy, W);
        for (const sx of [-8, 7]) for (const [dx, dy] of [[0, -1], [1, -1], [0, 2], [1, 2]]) if (dith(cx + sx + dx, by + dy, fade)) b.set(cx + sx + dx, by + dy, W);
      }
      motes(b, cx, gy - 10, 18, 48, 6, t, SOUL, 957);
    },
  },

  // --- the Wraith (section 62) -----------------------------------------------
  /** Grave Talons, the first rake: three ragged pale tears down through the enemy, shreds of grey thrown off. Matter. */
  talon_rake: {
    w: 56, h: 56, n: 6, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 2, 6, 2],
    draw: (b, t, i) => {
      const cx = 28, cy = 28;
      for (const k of [-1, 0, 1]) if (i < 4) cut(b, cx - 8 + k * 6, cy - 18, cx + 6 + k * 6, cy + 16, 4, [2.2, 2.6, 1.8, 1.1][i], TALON, [1.2, 1.1, 0.8, 0.5][i], [0.6, 1, 1, 1][i]);
      if (i >= 1) sparks(b, cx, cy, 10, 18, (i - 1) / 4, SHREDS, 961, 6);
    },
  },
  /** Grave Talons, the second rake: the far talons back up through the enemy, three tears the other way. Matter. */
  talon_rake_back: {
    w: 56, h: 56, n: 6, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 2, 6, 2],
    draw: (b, t, i) => {
      const cx = 28, cy = 28;
      for (const k of [-1, 0, 1]) if (i < 4) cut(b, cx - 8 + k * 6, cy + 16, cx + 8 + k * 6, cy - 18, -4, [2.2, 2.6, 1.8, 1.1][i], TALON, [1.2, 1.1, 0.8, 0.5][i], [0.6, 1, 1, 1][i]);
      if (i >= 1) sparks(b, cx, cy, 10, 18, (i - 1) / 4, SHREDS, 967, 6);
    },
  },
  /** Strip the Living lands: the talons tear through in a dark cross, and what kept the enemy safe flies off it as broken flecks of gold, dimming and falling. Matter. */
  wraith_rend: {
    w: 72, h: 72, n: 9, ms: 55, ax: 0.5, ay: 0.5, pad: [2, 2, 10, 2],
    draw: (b, t, i) => {
      const cx = 36, cy = 34;
      if (i < 5) {
        cut(b, cx - 16, cy - 20, cx + 14, cy + 18, 6, [3, 3.4, 2.6, 1.8, 1][i], TALON, 1.2 - i * 0.2, [0.5, 1, 1, 1, 1][i]);
        cut(b, cx + 14, cy - 20, cx - 14, cy + 18, -6, [3, 3.4, 2.6, 1.8, 1][i], TALON, 1.2 - i * 0.2, [0.5, 1, 1, 1, 1][i]);
      }
      if (i >= 1 && i < 4) burst(b, cx, cy, 10, 2, [12, 16, 10][i - 1], 1.4, SHREDS, 0.2);
      if (i >= 1) sparks(b, cx, cy, 14, 30, (i - 1) / 7, GOLD, 971, 22);
      if (i >= 2) sparks(b, cx, cy, 10, 22, (i - 2) / 6, SHREDS, 977, 4);
    },
  },
  /** Hollow Wail at the Wraith's head: rings of grey-green going out from the hood, wisps torn off them. Matter. */
  wail_rings: {
    w: 96, h: 80, n: 12, ms: 55, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      soundRings(b, 48, 40, i, 4, 2, 5.4, 7, WAIL);
      motes(b, 48, 40, 40, 10, 10, t, SHREDS, 983);
    },
  },
  /** Hollow Wail reaches an enemy: the wail breaks over it, grey wisps whirling round it and dragging down, a dull flash. Matter. */
  wail_hit: {
    w: 60, h: 72, n: 8, ms: 70, ax: 0.5, ay: 0.55, pad: [2, 2, 4, 2],
    draw: (b, t, i) => {
      const cx = 30, cy = 38;
      if (i < 3) burst(b, cx, cy, 8, 1, [8, 12, 9][i], 1.2, WAIL, 0.6);
      for (let k = 0; k < 3; k++) {
        const ph = t * Math.PI * 3 + k * 2.1;
        const y = cy - 22 + t * 34 + k * 4;
        for (let s2 = 0; s2 < 8; s2++) {
          const a = ph - s2 * 0.28;
          const x = Math.round(cx + Math.cos(a) * 14), yy = Math.round(y + Math.sin(a) * 4 - s2 * 0.6);
          if (dith(x, yy, Math.max(0.4, Math.min(1, 1.8 * (1 - t))) * (1 - s2 / 10))) { b.set(x, yy, WAIL[s2 < 2 ? 4 : s2 < 5 ? 3 : 2]); if (s2 < 4) b.set(x, yy + 1, WAIL[s2 < 2 ? 3 : 2]); }
        }
      }
    },
  },

  // --- the Haruspex (section 63) -------------------------------------------
  /** Her cast: a handful of knucklebones tumbling through the air, flying right. */
  knucklebones: {
    w: 22, h: 14, n: 3, ms: 60, ax: 0.8, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      const R = MAT.bone.ramp;
      for (const [x, y, ph] of [[18, 7, 0], [13, 4, 1], [12, 10, 2], [7, 7, 1]] as const) {
        const f = (i + ph) % 3;
        const pts = f === 0 ? [[0, 0], [1, 0], [-1, 0]] : f === 1 ? [[0, 0], [0, 1], [0, -1]] : [[0, 0], [1, 1], [-1, -1]];
        for (const [dx, dy] of pts) b.set(x + dx, y + dy, R[dx === 0 && dy === 0 ? 5 : 4]);
        b.set(x - 2, y, R[2]);
      }
    },
  },
  /** Cast the Bones lands: a small dull flash and the bones scattering off the enemy, tumbling down. Matter. */
  bones_strike: {
    w: 52, h: 52, n: 7, ms: 55, ax: 0.5, ay: 0.5, pad: [2, 2, 12, 2],
    draw: (b, t, i) => {
      const cx = 26, cy = 26;
      if (i < 3) burst(b, cx, cy, 7, 1, [7, 11, 8][i], 1.2, DULL, 0.3);
      sparks(b, cx, cy, 8, 20, t, MAT.bone.ramp.slice(1, 6), 991, 18);
      if (i >= 1) ring(b, cx, cy, 4 + i * 2.6, 3 + i * 2, Math.max(0.6, 1.4 - i * 0.2), DU, Math.max(0.2, 1 - i * 0.15));
    },
  },
  /** Read the Omens and Ill Omen at her raised skull: a pale flare, and the shape of the ram's horns curling out of it, fading. Additive. */
  omen_skull: {
    w: 72, h: 64, n: 10, ms: 60, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 36, cy = 32;
      if (i < 4) burst(b, cx, cy, 10, 2, [8, 14, 11, 7][i], 1.4, SOUL, 0.2);
      const fade = i < 4 ? 1 : 1 - (i - 3) / 7;
      for (const sx of [-1, 1]) {
        for (let k = 0; k < 26; k++) {
          const a = k * 0.26 + 0.2, r = 4 + k * 0.62 + t * 6;
          const x = Math.round(cx + sx * Math.cos(a) * r), y = Math.round(cy - Math.sin(a) * r * 0.8);
          if (dith(x, y, fade * (1 - k / 32))) b.set(x, y, SOUL[k < 8 ? 4 : 3]);
        }
      }
      motes(b, cx, cy, 30, 24, 8, t, SOUL, 997);
    },
  },
  /** Read the Omens reaches an ally: knucklebones circling round it and rising, pale motes of favour going up with them. Anchored at the feet (additive). */
  omen_favour: {
    w: 60, h: 84, n: 12, ms: 60, ax: 0.5, ay: 0.95, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 30, gy = 78;
      const R = MAT.bone.ramp;
      for (let k = 0; k < 5; k++) {
        const a = t * Math.PI * 4 + (k / 5) * Math.PI * 2;
        const x = Math.round(cx + Math.cos(a) * 16), y = Math.round(gy - 6 - t * 54 + Math.sin(a) * 4);
        if (Math.sin(a) < -0.2 && i > 2) continue;
        b.set(x, y, R[5]); b.set(x + 1, y, R[4]); b.set(x - 1, y, R[3]);
      }
      ellipseRing(b, cx, gy, 16 + t * 4, 4 + t, 1, (x, y) => (dith(x, y, 1 - t) ? SOUL[3] : 0));
      motes(b, cx, gy - 6, 26, 62, 10, t, GOLD, 1009);
    },
  },
  /** Ill Omen reaches an enemy: a shadow settling over it from above, black motes sinking through it, a dark ring closing at its feet. Matter. */
  ill_omen: {
    w: 60, h: 84, n: 12, ms: 60, ax: 0.5, ay: 0.95, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 30, gy = 78;
      const fall = Math.min(1, t * 2);
      const fade = i < 8 ? 1 : 1 - (i - 7) / 5;
      for (let y = 4; y < 4 + 56 * fall; y++) {
        const hw = 10 + Math.sin(y * 0.3 + t * 6) * 2;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) if (dith(x, y, fade * 0.22 * (1 - Math.abs(x - cx) / (hw + 1)))) b.set(x, y, OMEN[1]);
      }
      for (let k = 0; k < 10; k++) {
        const x = Math.round(cx + Math.sin(k * 7.3) * 12), y = Math.round(8 + ((k * 13) % 30) + t * 40);
        if (y < gy && dith(x, y, fade)) { b.set(x, y, OMEN[0]); b.set(x, y - 1, OMEN[2]); b.set(x, y - 2, ACCENT.ashEyeDim); }
      }
      const rr = 24 - t * 10;
      if (i >= 3) ellipseRing(b, cx, gy, rr, rr * 0.28, 1.3, (x, y, a) => (dith(x, y, fade) ? (Math.sin(a) > 0.3 ? ACCENT.ashEyeDim : OMEN[2]) : 0));
    },
  },

  // --- Lycan (section 75) ----------------------------------------------------
  /** Ravening Claws, the first rake: three claws tear down through the enemy, tufts of grey shaken off. Matter. */
  lycan_rake: {
    w: 60, h: 60, n: 6, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 2, 6, 2],
    draw: (b, t, i) => clawRake(b, i, 1, 1001),
  },
  /** Ravening Claws, the second rake: the other paw tears back up through it. Matter. */
  lycan_rake_back: {
    w: 60, h: 60, n: 6, ms: 50, ax: 0.5, ay: 0.5, pad: [2, 2, 6, 2],
    draw: (b, t, i) => clawRake(b, i, -1, 1009),
  },
  /** Moonlit Maul: a great jaw closes on the enemy, the teeth meeting in a dull flash, a ring of the bite pressed out, grey chips and a few pale sparks flying. Matter. */
  maul_bite: {
    w: 64, h: 72, n: 9, ms: 50, ax: 0.5, ay: 0.5, pad: [4, 4, 8, 4],
    draw: (b, t, i) => {
      const cx = 32, cy = 36;
      const gap = [18, 13, 8, 3, 2, 2, 2, 2, 2][i];
      const fade = i < 6 ? 1 : [0.7, 0.45, 0.25][i - 6];
      teeth(b, cx, cy, gap, 1, fade);
      teeth(b, cx, cy, gap, -1, fade);
      if (i >= 3 && i <= 6) burst(b, cx, cy, 8, 2, [10, 15, 12, 8][i - 3], 1.3, DULL, 0.3);
      if (i >= 4) ring(b, cx, cy, 6 + (i - 4) * 4, 4 + (i - 4) * 2.4, 1.3, DULL, 1.1 - (i - 4) * 0.14);
      if (i >= 3) sparks(b, cx, cy, 12, 26, (i - 3) / 5, PALE, 1021, 14);
    },
  },
  /** Hunter's Howl at his muzzle (the snout of the raised head, 10 px behind the head point and 12 above it): rings of pale sound going up and out from the raised snout, motes of the light torn off them. Light. */
  howl_rings: {
    w: 110, h: 100, n: 12, ms: 55, ax: 0.5945, ay: 0.621, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      soundRings(b, 55, 50, i, 4, 2, 6.4, 7, PALE);
      motes(b, 55, 50, 44, 14, 10, t, PALE, 1031);
    },
  },
  /** Hunter's Howl reaches an enemy: the howl breaks over it in a pale flash, motes of the light sinking slowly round it as it slows. Light. */
  howl_hit: {
    w: 60, h: 72, n: 9, ms: 65, ax: 0.5, ay: 0.55, pad: [2, 2, 4, 2],
    draw: (b, t, i) => {
      const cx = 30, cy = 36;
      if (i < 3) burst(b, cx, cy, 8, 1, [8, 13, 9][i], 1.2, PALE, 0.4);
      if (i >= 1 && i < 6) ring(b, cx, cy + 4, 8 + i * 3, 4 + i * 1.4, 1.2, PALE, 1.2 - i * 0.16);
      const m = rng(1041);
      for (let k = 0; k < 9; k++) {
        const x0 = cx + (m() - 0.5) * 30, start = 0.1 + m() * 0.3;
        const tt = (t - start) / (1 - start);
        if (tt <= 0) continue;
        const x = Math.round(x0 + Math.sin(tt * 4 + k) * 2), y = Math.round(cy - 12 + tt * 30);
        if (!dith(x, y, 1 - tt * 0.7)) continue;
        b.set(x, y, tt < 0.5 ? PALE[3] : PALE[1]);
        if (k % 3 === 0 && tt < 0.6) b.set(x, y - 1, PALE[2]);
      }
    },
  },
  /** Hunter's Howl reaches each ally: pale streaks of speed run through it to the right, a ring settles at its feet, motes of the howl rise. Light. */
  pack_spur: {
    w: 64, h: 76, n: 10, ms: 60, ax: 0.5, ay: 0.5, pad: [2, 2, 8, 2],
    draw: (b, t, i) => {
      const cx = 32, cy = 34;
      if (i >= 1) ring(b, cx, cy + 32, 8 + t * 14, 3 + t * 3.6, 1.2, PALE, 1.1 - t * 0.6);
      for (const [dy, len, lag] of [[-12, 22, 0], [-2, 28, 1], [8, 20, 2], [16, 16, 1]] as const) {
        const tt = (i - lag) / 6;
        if (tt <= 0 || tt > 1) continue;
        const x1 = Math.round(cx - 22 + tt * 52), x0 = x1 - Math.round(len * (1 - tt * 0.3));
        for (let x = x0; x <= x1; x++) {
          const f = (x - x0) / Math.max(1, x1 - x0);
          if (dith(x, cy + dy, (1 - tt * 0.6) * (0.3 + f))) b.set(x, cy + dy, PALE[f > 0.8 ? 4 : f > 0.4 ? 3 : 1]);
        }
      }
      motes(b, cx, cy + 24, 22, 46, 12, t, PALE, 1051);
    },
  },
  /** Moon-Mad: a pale crescent of the moon rises behind him as he goes wild, a ring at his feet, motes streaming up. Light. */
  moon_mad: {
    w: 80, h: 100, n: 12, ms: 60, ax: 0.5, ay: 0.95, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 40, gy = 94;
      const fade = i < 3 ? [0.4, 0.75, 1][i] : i < 8 ? 1 : [0.7, 0.45, 0.25, 0.1][i - 8];
      for (let y = 8; y <= 46; y++) {
        for (let x = 14; x <= 62; x++) {
          const a = Math.hypot(x - 40, y - 28), c2 = Math.hypot(x - 47, y - 25);
          if (a > 17 || c2 <= 15) continue;
          if (dith(x, y, fade)) b.set(x, y, a > 15 ? PALE[4] : PALE[3]);
        }
      }
      ellipseRing(b, cx, gy, 6 + t * 18, (6 + t * 18) * 0.3, 1.3, (x, y, a) => (dith(x, y, 1 - t * 0.7) ? rampDither(PALE, 3.2 - t + Math.sin(a) * 0.5, x, y) : 0));
      motes(b, cx, gy - 4, 28, 80, 12, t, PALE, 1061);
    },
  },
  /** Gore: the two horns driven in, two dull streaks thrust through the enemy, a heavy flash where they meet, sparks of brimstone thrown off and falling. Matter. */
  horn_gore: {
    w: 64, h: 64, n: 8, ms: 50, ax: 0.5, ay: 0.5, pad: [4, 6, 10, 6],
    draw: (b, t, i) => {
      const reach = [0.5, 0.9, 1, 1, 1, 1, 1, 1][i];
      const heat = [1.2, 1.3, 1.1, 0.85, 0.6, 0.4, 0.25, 0.1][i];
      const th = [2.6, 3.4, 3.0, 2.4, 1.8, 1.2, 0.8, 0.5][i];
      if (i < 7) {
        cut(b, 6, 22, 44, 30, -5, th, DULL, heat, reach);
        cut(b, 8, 42, 46, 34, 5, th * 0.85, DULL, heat, reach);
      }
      if (i >= 2 && i < 6) burst(b, 44, 32, 9, 2, [12, 16, 12, 8][i - 2], 1.3, DULL, 0.2);
      if (i >= 2) ring(b, 42, 32, 6 + (i - 2) * 3.4, 4 + (i - 2) * 2.4, 1.3, DULL, 1.1 - (i - 2) * 0.16);
      if (i >= 2) sparks(b, 42, 32, 12, 24, (i - 2) / 5, FI, 1301, 16);
    },
  },
  /** Chains of the Pit on each enemy: a length of chain whips across it, a dull flash where it lands, flecks of iron and dust. Matter. */
  chain_lash: {
    w: 80, h: 60, n: 9, ms: 45, ax: 0.5, ay: 0.5, pad: [2, 4, 8, 4],
    draw: (b, t, i) => {
      const cx = 40, cy = 30;
      if (i < 6) {
        const head = Math.PI * (1.05 - Math.min(1, i / 3) * 0.95);
        const fade = i < 4 ? 1 : [0.6, 0.3][i - 4];
        chainArc(b, cx, cy, 30, head + 1.5, head, fade);
        if (i < 4) cut(b, cx - 30, cy + 6, cx + 26, cy + 2, 6, [1.4, 2.2, 2.0, 1.2][i], DULL, 0.9, Math.min(1, 0.4 + i * 0.25));
      }
      if (i >= 2 && i < 5) burst(b, cx + 6, cy, 8, 2, [9, 13, 9][i - 2], 1.2, DULL, 0.5);
      if (i >= 2) sparks(b, cx + 6, cy, 10, 22, (i - 2) / 6, CHAINFLECK, 1321, 14);
      if (i >= 3) motes(b, cx + 4, cy + 8, 30, 10, 8, (i - 3) / 5, DU, 1327);
    },
  },
  /** Veilfire in flight: a knot of black fire rimmed in violet, its tongues streaming back (drawn pointing right). */
  veilfire_bolt: {
    w: 22, h: 11, n: 2, ms: 70, ax: 0.75, ay: 0.5, loop: true,
    draw: (b, t, i) => {
      const cx = 15, cy = 5;
      for (let y = -3; y <= 3; y++) {
        for (let x = -4; x <= 3; x++) {
          const d = Math.hypot(x * 0.9, y * 1.2);
          if (d > 3.6) continue;
          b.set(cx + x, cy + y, d > 2.6 ? VIO[3] : MOTE[d > 1.6 ? 2 : 0]);
        }
      }
      for (const [x, y, k] of [[9, 3 + i, 2], [7, 5, 3], [5, 6 - i, 2], [3, 5, 1], [10, 7 - i, 2]] as const) b.set(x, y, VIO[k]);
      b.set(cx + 2, cy - 1, VIO[4]);
    },
  },
  /** Veilfire lands: a burst of black fire rimmed in violet, black tongues licking up the enemy and dying, violet sparks. Matter. */
  veilfire_burst: {
    w: 60, h: 64, n: 8, ms: 55, ax: 0.5, ay: 0.55, pad: [4, 4, 6, 4],
    draw: (b, t, i) => {
      const cx = 30, cy = 34;
      if (i < 4) burst(b, cx, cy, 8, 1, [8, 13, 15, 11][i], 1.4, BLACKFIRE, 0.3);
      if (i >= 1 && i < 7) {
        const h = [10, 16, 18, 14, 9, 5][i - 1];
        flame(b, 22, cy + 8, h * 0.7, 4, i * 0.9, BLACKFIRE);
        flame(b, 30, cy + 8, h, 5, i * 0.9 + 2, BLACKFIRE);
        flame(b, 38, cy + 8, h * 0.6, 3, i * 0.9 + 4, BLACKFIRE);
      }
      sparks(b, cx, cy, 10, 22, t, VIO, 1311, 8);
    },
  },
  /** Shadow Feast, the first bite: her shadow rises from a pool at the enemy's feet behind it and bites into it; a flash of violet as the jaws close, then it sinks. Matter. */
  shadow_bite: {
    w: 72, h: 104, n: 10, ms: 45, ax: 0.5, ay: 0.96, pad: [2, 2, 2, 2],
    draw: (b, t, i) => shadowBite(b, i, 1),
  },
  /** Shadow Feast, the second bite: it comes up again from the other side. Matter. */
  shadow_bite_back: {
    w: 72, h: 104, n: 10, ms: 45, ax: 0.5, ay: 0.96, pad: [2, 2, 2, 2],
    draw: (b, t, i) => shadowBite(b, i, -1),
  },
  /** Jerked Blow: the slung arm comes down in a dull streak, a short flash, dust, and a fleck or two of the thread's violet. Matter. */
  jerked_blow: {
    w: 64, h: 64, n: 7, ms: 50, ax: 0.5, ay: 0.5, pad: [4, 4, 10, 4],
    draw: (b, t, i) => {
      const reach = [0.6, 1, 1, 1, 1, 1, 1][i];
      if (i < 6) cut(b, 18, 12, 44, 50, 5, [2.6, 3.2, 2.6, 1.8, 1.2, 0.7][i], DULL, [1.2, 1.1, 0.9, 0.6, 0.4, 0.25][i], reach);
      if (i >= 1 && i < 4) burst(b, 34, 34, 7, 2, [9, 12, 8][i - 1], 1.2, DULL, 0.3);
      if (i >= 1) sparks(b, 34, 34, 9, 20, (i - 1) / 5, DULL, 1331, 14);
      if (i >= 1 && i < 5) for (const [x, y] of [[24, 24], [42, 28], [30, 44]] as const) b.set(x + i, y - i, VIO[3]);
    },
  },
  /** Stitch and Pull, at its control: the violet of its threads flares along the bone and runs down them. Light. */
  thread_flare: {
    w: 64, h: 44, n: 9, ms: 60, ax: 0.5, ay: 0.3, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 32, cy = 13;
      const k = [0.4, 0.8, 1, 1, 0.9, 0.7, 0.55, 0.45, 0.35][i];
      for (let x = -14; x <= 14; x++) if (dith(cx + x, cy, k * (1 - Math.abs(x) / 18))) b.set(cx + x, cy, VIO[x % 3 === 0 ? 4 : 3]);
      if (i < 5) burst(b, cx, cy, 6, 1, [4, 7, 9, 7, 4][i], 1, VIO, 0.6);
      for (const x of [-10, -3, 4, 11]) {
        const y = Math.round(cy + 2 + t * 26);
        if (dith(cx + x, y, k)) {
          b.set(cx + x, y, VIO[4]);
          b.set(cx + x, y - 1, VIO[2]);
        }
      }
    },
  },
  /** Stitch and Pull on each ally: a violet thread stitches across its chest, crossing and crossing back, and pale motes of mending rise off it. Light. */
  stitch_mend: {
    w: 56, h: 72, n: 12, ms: 55, ax: 0.5, ay: 0.5, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 28, cy = 36;
      const done = Math.min(1, (i + 1) / 7);
      const fade = i < 9 ? 1 : [0.6, 0.35, 0.15][i - 9];
      const pts: [number, number][] = [];
      for (let k = 0; k <= 8; k++) pts.push([cx - 14 + k * 3.5, cy + (k % 2 ? -5 : 5) + (k - 4) * 0.6]);
      const n = done * (pts.length - 1);
      for (let k = 0; k < pts.length - 1 && k < n; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
        const f = Math.min(1, n - k);
        const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
        for (let s = 0; s <= steps * f; s++) {
          const x = Math.round(x0 + ((x1 - x0) * s) / steps), y = Math.round(y0 + ((y1 - y0) * s) / steps);
          if (dith(x, y, fade)) b.set(x, y, VIO[f < 1 && s >= steps * f - 1 ? 4 : 3]);
        }
      }
      if (i >= 4) motes(b, cx, cy + 10, 30, 40, 12, (i - 4) / 8, PALE, 1341);
    },
  },
  /** Snagging Threads on the attacker: violet threads wind round its legs and draw tight, then fade. Light. */
  thread_snag: {
    w: 56, h: 64, n: 10, ms: 60, ax: 0.5, ay: 0.95, pad: [2, 2, 2, 2],
    draw: (b, t, i) => {
      const cx = 28, gy = 60;
      const tight = Math.min(1, i / 4);
      const fade = i < 7 ? 1 : [0.6, 0.35, 0.15][i - 7];
      for (const [h, r0] of [[8, 16], [16, 14], [24, 12]] as const) {
        const rx = r0 - tight * (r0 - 7), ry = rx * 0.3;
        ellipseRing(b, cx, gy - h, rx, ry, 1, (x, y, a) => (dith(x, y, fade) ? VIO[Math.sin(a * 2 + h) > 0 ? 4 : 2] : 0));
      }
      if (i < 4) for (let y = gy - 30; y < gy - 4; y += 2) if (dith(cx - 12 + i * 3, y, fade)) b.set(cx - 12 + i * 3, y, VIO[3]);
    },
  },
};
