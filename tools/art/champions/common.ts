// Shared head/face construction and small decorations used by several heroes.
import { ACCENT, INK, MAT, Material } from '../palette.ts';
import { hex, RGBA } from '../raster.ts';
import { Draw, Skel, V, v } from '../rig.ts';

/** Four-point sparkle; stage 1..3 grows then shrinks. */
export function glint(d: Draw, p: V, stage: number, z: number, core: RGBA = ACCENT.white, tint: RGBA = ACCENT.sparkGold) {
  const r = [0, 2, 5, 3][stage] ?? 0;
  if (!r) return;
  const pts: { p: V; c: RGBA }[] = [{ p, c: core }];
  for (let i = 1; i <= r; i++) {
    const c = i <= Math.ceil(r / 2) ? core : tint;
    pts.push({ p: v(p.x + i, p.y), c }, { p: v(p.x - i, p.y), c }, { p: v(p.x, p.y + i), c }, { p: v(p.x, p.y - i), c });
  }
  if (r >= 3) for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) pts.push({ p: v(p.x + dx, p.y + dy), c: tint });
  d.pixels({ mat: MAT.glowGold, z, group: 'fx', outline: false, line: 'none' }, pts);
}

export interface FaceCfg {
  skin: Material;
  z: number;
  /** Brow / lash color. */
  brow?: RGBA;
  browStyle?: 'flat' | 'angry' | 'calm' | 'none';
  eye?: RGBA;
  /** Bright eyes (magic) instead of dark pupils. */
  glowEye?: RGBA;
  ear?: 'human' | 'elf' | 'none';
  mouth?: 'line' | 'none' | 'shout';
  /** War-paint band across the eyes. */
  paint?: RGBA;
  lip?: RGBA;
  /** Head radii. */
  rx?: number;
  ry?: number;
}

/**
 * Bare head in 3/4 profile facing +x: cranium, jaw, nose, ear, eye, brow,
 * mouth. Coordinates are head-local (x toward the face, y up); the hair or
 * hood is layered on top by each hero.
 */
export function face(d: Draw, s: Skel, c: FaceCfg) {
  const H = s.H;
  const ha = s.headDir - 90;
  const g = 'head';
  const z = c.z;
  const rx = c.rx ?? 6.4, ry = c.ry ?? 6.9;
  d.ellipse({ mat: c.skin, z, group: g }, H(-0.6, 0.7), rx, ry, ha);
  // jaw + chin + nose silhouette
  d.poly(
    { mat: c.skin, z: z + 0.05, group: g },
    [H(-1.5, -1.2), H(1.6, -5.3), H(4.4, -6.3), H(5.8, -5.2), H(6.1, -3.4), H(6.2, -2.3), H(7.4, -1.6), H(6.4, 0.6), H(5.8, 2.4), H(2, 3)],
    { kind: 'dome', c: H(1, 0.2), r: 7.5, bevel: 0.8 },
  );
  if (c.ear !== 'none') {
    if (c.ear === 'elf') {
      d.poly({ mat: c.skin, z: z + 0.1, group: g, line: 'soft' }, [H(-0.4, -2.4), H(-1.8, 0.8), H(-5.6, 4.2), H(-2.6, 0.2), H(-1.6, -2.8)], { kind: 'bevel', w: 1 });
    } else {
      d.ellipse({ mat: c.skin, z: z + 0.1, group: g, line: 'soft' }, H(-1.2, -0.8), 1.5, 2.2, ha);
    }
  }
  const pts: { p: V; c: RGBA }[] = [];
  if (c.paint) {
    for (let x = 0.5; x <= 6.4; x += 0.7) {
      pts.push({ p: H(x, 0.9), c: c.paint }, { p: H(x, -0.1), c: c.paint });
    }
  }
  const eye = c.glowEye ?? c.eye ?? INK.eye;
  pts.push({ p: H(3.6, 0.6), c: eye }, { p: H(3.6, -0.4), c: eye });
  if (!c.glowEye) pts.push({ p: H(2.7, 0.6), c: INK.eyeWhite });
  else pts.push({ p: H(4.5, 0.6), c: eye });
  const brow = c.brow ?? c.skin.ramp[1];
  if (c.browStyle !== 'none') {
    const bs = c.browStyle ?? 'flat';
    const yA = bs === 'angry' ? 2.4 : bs === 'calm' ? 1.7 : 2.0;
    const yB = bs === 'angry' ? 1.4 : bs === 'calm' ? 2.1 : 2.0;
    pts.push({ p: H(2.4, yA), c: brow }, { p: H(3.5, (yA + yB) / 2), c: brow }, { p: H(4.6, yB), c: brow });
  }
  if (c.mouth === 'line') pts.push({ p: H(4.9, -3.7), c: c.lip ?? c.skin.ramp[1] }, { p: H(5.6, -3.7), c: c.lip ?? c.skin.ramp[1] });
  if (c.mouth === 'shout') pts.push({ p: H(4.8, -3.4), c: INK.black }, { p: H(5.5, -3.4), c: INK.black }, { p: H(5.2, -4.3), c: INK.black });
  d.pixels({ mat: c.skin, z: z + 0.3, group: g }, pts);
}

/** Jagged-edge polygon around a center: alternating radii give fur / hair tufts. */
export function tufted(center: V, radii: number[], startDeg: number, endDeg: number, jag: number, seed = 0): V[] {
  const out: V[] = [];
  const n = radii.length;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = ((startDeg + (endDeg - startDeg) * t) * Math.PI) / 180;
    const r = radii[i] + (i % 2 ? -jag : 0) * (0.7 + 0.3 * Math.sin(i * 1.7 + seed));
    out.push(v(center.x + Math.cos(a) * r, center.y + Math.sin(a) * r));
  }
  return out;
}

export const ink = INK;
