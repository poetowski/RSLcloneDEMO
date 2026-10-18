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
// Never their affinity (affinities are abstract, Jakub, 2026-10-11).
import { dith, ellipseRing, rampDither } from '../paint.ts';
import { RGBA } from '../raster.ts';
import { burst, cut, FxDef, motes, ramps, soundRings, sparks, W } from './kit.ts';

const DU = ramps.dust;
/** A dull streak: grey to a pale core, no hue of its own. */
const DULL: RGBA[] = [DU[0], DU[2], DU[3], DU[4], W];
const RUST = ramps.rust;
const BILE = ramps.bile;
/** the rot's gas: bile green and bruise grey */
const GAS: RGBA[] = [BILE[0], BILE[1], DU[1], BILE[2]];
/** the gold of the Bellringer's bell, as light */
const GOLD = ramps.gold;

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
};
