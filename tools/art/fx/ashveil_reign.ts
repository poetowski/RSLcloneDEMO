// The Ashveil Reign's effects. The Skeleton's Rusty Hack: a dull cut hacked
// down through the target, ragged where the blade's notches tear it, and
// flakes of rust shaken off the iron, falling. Drawn as matter, not light (it
// is not in the additive set of src/game/view/scene.ts): an old blade does not
// shine. Never his affinity (affinities are abstract, Jakub, 2026-10-11).
import { RGBA } from '../raster.ts';
import { burst, cut, FxDef, ramps, sparks, W } from './kit.ts';

const DU = ramps.dust;
/** A dull streak: grey to a pale core, no hue of its own. */
const DULL: RGBA[] = [DU[0], DU[2], DU[3], DU[4], W];
const RUST = ramps.rust;

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
};
