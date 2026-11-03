// Gold (Jakub, 2026-11-03: "lets call currency as gold for now"): a coin of
// old gold, its rim raised, the Loom's eight-pointed star struck in its face,
// lit from the upper left; a second coin behind it in the large size. Small for
// lines of text, large for the Merchant's purse. Usage: docs/UI_GUIDE.md.
import { MAT } from '../palette.ts';
import { outline, rampDither } from '../paint.ts';
import { Bitmap } from '../raster.ts';

const GOLD = MAT.gold.ramp;

/** One coin face: a raised rim with a groove inside it, a lower field, the Loom's star raised on it, a glint at the upper left. */
function coin(b: Bitmap, cx: number, cy: number, r: number) {
  const big = r > 6;
  for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) {
    for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy) / r;
      // a dark edge all round, so a coin in front stands clear of the one behind
      if (d > 1) {
        if (d < 1 + 1.2 / r) b.set(x, y, GOLD[0]);
        continue;
      }
      const lit = -(dx + dy) / (r * 1.4);
      const rimIn = big ? 0.74 : 0.62;
      let v: number;
      if (d > rimIn) v = 3.4 + lit * 2.2;
      else if (big && d > rimIn - 0.12) v = 1.2;
      else v = 2.5 + lit * 1;
      b.set(x, y, rampDither(GOLD, Math.max(0, Math.min(GOLD.length - 1, v)), x, y));
    }
  }
  // the star, raised: bright rays, a shadow under each toward the lower right
  const arm = Math.max(1, Math.round(r * (big ? 0.5 : 0.4)));
  const X = Math.round(cx - 0.5), Y = Math.round(cy - 0.5);
  const ray = (ux: number, uy: number, n: number) => {
    for (let k = 1; k <= n; k++) {
      b.set(X + ux * k + 1, Y + uy * k + 1, GOLD[1]);
      b.set(X + ux * k, Y + uy * k, GOLD[k === n ? 4 : 5]);
    }
  };
  for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) ray(ux, uy, arm);
  if (big) for (const [ux, uy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]] as const) ray(ux, uy, arm - 2);
  b.set(X, Y, GOLD[5]);
  // the glint on the rim
  const gx = Math.round(cx - r * 0.6), gy = Math.round(cy - r * 0.55);
  b.set(gx, gy, GOLD[5]);
  if (big) b.set(gx + 1, gy - 1, GOLD[5]);
}

/** Gold (11x11 or 24x24): one coin, or two in the large size, the back one peeking out to the upper right. */
export function goldCoin(size: 11 | 24): Bitmap {
  const b = new Bitmap(size, size);
  if (size === 24) {
    coin(b, 16, 8, 6.6);
    coin(b, 10, 14, 8.6);
  } else coin(b, 5.5, 5.5, 4.6);
  return outline(b, GOLD[0]);
}
