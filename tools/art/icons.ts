// Skill icon toolkit. Every skill icon is 40x40: a dithered radial background
// in the champion's signature ramp, a glyph rendered with the same shaded
// renderer as the champions (so an icon's sword is the champion's sword), a
// vignette and a 2px gold bevel frame. See docs/ART_GUIDE.md "UI".
import { ACCENT, Material, MAT } from './palette.ts';
import { dith, line, rampDither } from './paint.ts';
import { Bitmap, hex, RGBA, withAlpha } from './raster.ts';
import { Frame } from './render.ts';
import { Draw, V, v } from './rig.ts';

export const ICON = 40;

/** Accent colors for glyph details (all from the palette). */
export const C = ACCENT;

/** Render shaded shapes in a 40x40 rig space (origin bottom-left, y up). */
export function glyph(fn: (d: Draw) => void): Bitmap {
  const f = new Frame(ICON, ICON);
  const d = new Draw(f, 1, v(0, ICON));
  fn(d);
  return f.render();
}

export const FRAME_GOLD = ['#120c08', '#5a3410', '#a8701e', '#e8b440', '#fff0a8'].map((h) => hex(h));

function iconBase(bg: Material): Bitmap {
  const b = new Bitmap(ICON, ICON);
  const r = [bg.ramp[1], bg.ramp[2], bg.ramp[3], bg.ramp[4]];
  for (let y = 2; y < ICON - 2; y++) {
    for (let x = 2; x < ICON - 2; x++) {
      const d = Math.hypot((x - 19) / 19, (y - 16) / 21);
      const streak = Math.max(0, 1 - Math.abs(x - y + 6) / 6) * 0.35;
      b.set(x, y, rampDither(r, 2.5 - d * 2.1 + streak, x, y));
    }
  }
  return b;
}

function iconFrame(b: Bitmap) {
  const g = FRAME_GOLD;
  for (let i = 0; i < ICON; i++) {
    b.set(i, 0, g[0]);
    b.set(i, ICON - 1, g[0]);
    b.set(0, i, g[0]);
    b.set(ICON - 1, i, g[0]);
  }
  for (let i = 1; i < ICON - 1; i++) {
    b.set(i, 1, g[3]);
    b.set(1, i, g[3]);
    b.set(i, ICON - 2, g[1]);
    b.set(ICON - 2, i, g[1]);
  }
  for (const [x, y] of [[1, 1], [ICON - 2, 1], [1, ICON - 2], [ICON - 2, ICON - 2]]) b.set(x, y, g[4]);
  for (const [x, y] of [[0, 0], [ICON - 1, 0], [0, ICON - 1], [ICON - 1, ICON - 1]]) b.set(x, y, 0);
  for (let i = 2; i < ICON - 2; i++) {
    b.blend(i, 2, withAlpha(g[0], 120));
    b.blend(2, i, withAlpha(g[0], 120));
  }
}

/** Background + optional flat painting (behind the glyph) + glyph + vignette + frame. */
export function compose(bg: Material, art: Bitmap, extra?: (b: Bitmap) => void): Bitmap {
  const b = iconBase(bg);
  extra?.(b);
  b.blit(art, 0, 0);
  for (let y = 2; y < ICON - 2; y++) {
    for (let x = 2; x < ICON - 2; x++) {
      const d = Math.max(Math.abs(x - 19.5), Math.abs(y - 19.5));
      if (d > 15.5 && dith(x, y, (d - 15.5) / 3)) b.blend(x, y, withAlpha(hex('#05040a'), 90));
    }
  }
  iconFrame(b);
  return b;
}

// ---------------------------------------------------------------------------
// reusable glyph parts
// ---------------------------------------------------------------------------

export function axeHead(d: Draw, hand: V, ang: number, z: number, len = 15, scale = 1.3) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: MAT.wood, z, group: 'axe' + z }, f(-6, 0), f(len, 0), 1.5, 1.4);
  const k = scale;
  const head = [f(len + 0.6, -0.8 * k), f(len + 3.2, -4.8 * k), f(len + 2.4, -10 * k), f(len - 1.6, -11 * k), f(len - 6.4, -10.2 * k), f(len - 9.4, -7.6 * k), f(len - 6.2, -3.6 * k), f(len - 4.6, -0.8 * k)];
  d.poly({ mat: MAT.iron, z: z + 0.1, group: 'axe' + z }, head, { kind: 'bevel', w: 2.4 });
  d.ribbon({ mat: MAT.silver, z: z + 0.15, group: 'axe' + z, line: 'none' }, [f(len + 2.9, -5.2 * k), f(len + 2.1, -9.6 * k), f(len - 1.7, -10.4 * k), f(len - 6.2, -9.7 * k)], [0.9, 0.9, 0.9, 0.9]);
  d.capsule({ mat: MAT.iron, z: z + 0.12, group: 'axe' + z }, f(len - 5, 0), f(len + 0.8, 0), 2.2, 2.2);
}

export function arrowGlyph(d: Draw, from: V, to: V, z: number, head: Material = MAT.silver, fletch: Material = MAT.red) {
  const ang = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  d.capsule({ mat: MAT.wood, z, group: 'arrow' + z }, from, to, 0.9, 0.9);
  const hf = d.frame(to, ang);
  d.poly({ mat: head, z: z + 0.1, group: 'arrow' + z }, [hf(4.5, 0), hf(-1.6, 2.8), hf(-0.6, 0), hf(-1.6, -2.8)], { kind: 'bevel', w: 1.2 });
  const ff = d.frame(from, ang);
  d.poly({ mat: fletch, z: z + 0.05, group: 'arrow' + z }, [ff(5, 0.5), ff(0.5, 3.4), ff(-0.6, 3.2), ff(1.2, 0.5)], { kind: 'bevel', w: 1 });
  d.poly({ mat: fletch, z: z + 0.05, group: 'arrow' + z }, [ff(5, -0.5), ff(0.5, -3.4), ff(-0.6, -3.2), ff(1.2, -0.5)], { kind: 'bevel', w: 1 });
}

export function speedLines(b: Bitmap, pts: [number, number, number, number][], c: RGBA) {
  for (const [x0, y0, x1, y1] of pts) line(b, x0, y0, x1, y1, c);
}

/** Radial impact star painted flat (behind or after a glyph). */
export function impactStar(b: Bitmap, cx: number, cy: number, rIn: number, rOut: number, rays: number, cA: RGBA, cB: RGBA) {
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const r1 = i % 2 ? rOut * 0.6 : rOut;
    line(b, cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, i % 2 ? cA : cB);
  }
}

export function crystal(d: Draw, base: V, tip: V, w: number, z: number, mat: Material = MAT.glowIce) {
  const ang = (Math.atan2(tip.y - base.y, tip.x - base.x) * 180) / Math.PI;
  const l = Math.hypot(tip.x - base.x, tip.y - base.y);
  const f = d.frame(base, ang);
  d.poly({ mat, z, group: 'cr' + z }, [f(0, 0), f(l * 0.25, w), f(l * 0.75, w * 0.8), f(l, 0), f(l * 0.75, -w * 0.8), f(l * 0.25, -w)], { kind: 'bevel', w: 2 });
}

export function skull(d: Draw, c: V, s: number, z: number, mat: Material = MAT.bone, eye: RGBA = hex('#140c18')) {
  d.ellipse({ mat, z, group: 'skull' }, v(c.x, c.y + 1.5 * s), 6 * s, 5.6 * s, 0);
  d.poly({ mat, z: z + 0.05, group: 'skull' }, [v(c.x - 3.6 * s, c.y - 1 * s), v(c.x + 3.6 * s, c.y - 1 * s), v(c.x + 3 * s, c.y - 5 * s), v(c.x - 3 * s, c.y - 5 * s)], { kind: 'bevel', w: 1.4 });
  d.ellipse({ mat, z: z + 0.1, group: 'skull', color: eye, line: 'none' }, v(c.x - 2.3 * s, c.y + 0.6 * s), 1.7 * s, 1.9 * s, 0);
  d.ellipse({ mat, z: z + 0.1, group: 'skull', color: eye, line: 'none' }, v(c.x + 2.3 * s, c.y + 0.6 * s), 1.7 * s, 1.9 * s, 0);
  d.poly({ mat, z: z + 0.1, group: 'skull', color: eye, line: 'none' }, [v(c.x, c.y - 1.1 * s), v(c.x - 0.9 * s, c.y - 2.6 * s), v(c.x + 0.9 * s, c.y - 2.6 * s)]);
}

/** Sun disc with rays (Sunscar motifs). */
export function sunDisc(b: Bitmap, cx: number, cy: number, r: number, rays: number, ramp: RGBA[]) {
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const len = r + (i % 2 ? 4 : 8);
    line(b, cx + Math.cos(a) * (r + 1), cy + Math.sin(a) * (r + 1), cx + Math.cos(a) * len, cy + Math.sin(a) * len, ramp[i % 2 ? 2 : 3]);
  }
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
      if (d > 1) continue;
      b.set(x, y, rampDither(ramp, 4.2 - d * 2.2 - (x - cx + y - cy) / (r * 3), x, y));
    }
  }
}
