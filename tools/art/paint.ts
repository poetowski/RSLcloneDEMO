// Low-level painting helpers for environment, effects and UI art. All
// operations are hard-edged; gradients are expressed with ordered dithering.
import { A, B, Bitmap, G, R, RGBA, rgba } from './raster.ts';

export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** True when a pixel at (x,y) should take the "next" color for blend t in [0,1]. */
export function dith(x: number, y: number, t: number): boolean {
  return t * 16 > BAYER4[y & 3][x & 3] + 0.5;
}

/** Picks a color from a ramp for a continuous value v in [0, ramp.length-1], dithering between steps. */
export function rampDither(ramp: RGBA[], v: number, x: number, y: number): RGBA {
  const vv = Math.max(0, Math.min(ramp.length - 1, v));
  const i = Math.floor(vv);
  const f = vv - i;
  if (i >= ramp.length - 1) return ramp[ramp.length - 1];
  return dith(x, y, f) ? ramp[i + 1] : ramp[i];
}

export function line(b: Bitmap, x0: number, y0: number, x1: number, y1: number, c: RGBA) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    b.blend(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export function disc(b: Bitmap, cx: number, cy: number, r: number, c: RGBA | ((x: number, y: number, d: number) => RGBA | 0)) {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r) continue;
      const col = typeof c === 'function' ? c(x, y, d / r) : c;
      if (col) b.blend(x, y, col);
    }
  }
}

export function ellipseFill(b: Bitmap, cx: number, cy: number, rx: number, ry: number, c: RGBA | ((x: number, y: number, d: number) => RGBA | 0)) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      const d = Math.hypot(nx, ny);
      if (d > 1) continue;
      const col = typeof c === 'function' ? c(x, y, d) : c;
      if (col) b.blend(x, y, col);
    }
  }
}

/** Ring between radii (ellipse), for shockwaves and target markers. */
export function ellipseRing(b: Bitmap, cx: number, cy: number, rx: number, ry: number, thick: number, c: RGBA | ((x: number, y: number, ang: number) => RGBA | 0)) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d = Math.hypot(dx / rx, dy / ry);
      if (d > 1 || d === 0) continue;
      // first-order distance to the ellipse in pixels keeps the stroke even all around
      const gx = dx / (rx * rx * d), gy = dy / (ry * ry * d);
      const dist = (1 - d) / Math.max(1e-6, Math.hypot(gx, gy));
      if (dist >= Math.max(1, thick)) continue;
      const col = typeof c === 'function' ? c(x, y, Math.atan2(dy, dx)) : c;
      if (col) b.blend(x, y, col);
    }
  }
}

export function polyFill(b: Bitmap, pts: [number, number][], c: RGBA | ((x: number, y: number) => RGBA | 0)) {
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  for (const [x, y] of pts) {
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
  }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const px = x + 0.5, py = y + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (!inside) continue;
      const col = typeof c === 'function' ? c(x, y) : c;
      if (col) b.blend(x, y, col);
    }
  }
}

/** 1px outline around all opaque pixels (4-neighbourhood) in a color. */
export function outline(b: Bitmap, c: RGBA, alphaMin = 1): Bitmap {
  const out = b.clone();
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      if (A(b.get(x, y)) >= alphaMin) continue;
      if (A(b.get(x - 1, y)) >= alphaMin || A(b.get(x + 1, y)) >= alphaMin || A(b.get(x, y - 1)) >= alphaMin || A(b.get(x, y + 1)) >= alphaMin) out.set(x, y, c);
    }
  }
  return out;
}

/** Multiply-darken a color by k (0..1). Authoring only. */
export function shade(c: RGBA, k: number): RGBA {
  return rgba(Math.round(R(c) * k), Math.round(G(c) * k), Math.round(B(c) * k), A(c));
}
