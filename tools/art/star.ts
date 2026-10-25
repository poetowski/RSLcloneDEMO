// The star crystal of summoning: the Wishing Star in the Sanctum's sky
// (tools/art/sanctum.ts) and the Soulstar merged from Stardust
// (tools/art/ui/summon.ts) are the same eight-pointed crystal, so a Soulstar
// reads as a piece of the Wishing Star. Faceted and lit from the top-left like
// everything else: each point split along its axis into a facet toward the
// light and one away from it.
import { polyFill } from './paint.ts';
import { Bitmap, RGBA } from './raster.ts';

/** The crystal's reach from its heart: the long points up, down and to the sides, the short ones between, the waist where they meet. */
export interface StarShape {
  up: number;
  down: number;
  side: number;
  diag: number;
  waist: number;
}

/**
 * Paints the crystal round (cx, cy) in `ramp` (dark to light, at least six
 * steps): sixteen facets, each a flat step of the ramp by how it faces the
 * light, the long points a step brighter than the short ones, a white heart.
 */
export function starCrystal(b: Bitmap, cx: number, cy: number, s: StarShape, ramp: RGBA[]) {
  const top = ramp.length - 1;
  const pts: [number, number][] = [];
  for (let k = 0; k < 16; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 8;
    const j = k / 2;
    const r = k % 2 ? s.waist : j === 0 ? s.up : j === 4 ? s.down : j === 2 || j === 6 ? s.side : s.diag;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  // the light comes from the top-left
  const lx = -0.62, ly = -0.78;
  for (let k = 0; k < 16; k++) {
    const p = pts[k], q = pts[(k + 1) % 16];
    const mx = (p[0] + q[0]) / 2 - cx, my = (p[1] + q[1]) / 2 - cy;
    const facing = (mx * lx + my * ly) / (Math.hypot(mx, my) || 1);
    const long = k % 2 ? Math.floor((k + 1) / 2) % 2 === 0 : (k / 2) % 2 === 0;
    const v = Math.max(2, Math.min(top - 1, Math.round(top * 0.6 + facing * top * 0.3 + (long ? 0.4 : -0.5))));
    polyFill(b, [[cx, cy], p, q], ramp[v]);
  }
  // the heart, white, and a glint on the upper point's lit edge
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (Math.abs(dx) + Math.abs(dy) <= 1) b.set(Math.round(cx + dx - 0.5), Math.round(cy + dy - 0.5), ramp[top]);
  if (s.up >= 8) b.set(Math.round(cx - 1.5), Math.round(cy - s.up * 0.55), ramp[top]);
}
