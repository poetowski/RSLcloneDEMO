// Reusable body-part and gear builders. Every hero is assembled from these so
// limbs, feet, capes, weapons and smears share one construction language.
import { Material, MAT } from './palette.ts';
import { RGBA } from './raster.ts';
import { PrimOpts, Tex } from './render.ts';
import { add, at, dir, Draw, lerpV, mul, Skel, sub, V, v } from './rig.ts';

export type Side = 'N' | 'F';

export const limbOf = (s: Skel, side: Side) =>
  side === 'N'
    ? { sh: s.sN, el: s.eN, ha: s.hN, up: s.upN, lo: s.loN, hip: s.hipN, kn: s.kneeN, an: s.ankN, foot: s.pose.footN, th: s.thN, sk: s.shN }
    : { sh: s.sF, el: s.eF, ha: s.hF, up: s.upF, lo: s.loF, hip: s.hipF, kn: s.kneeF, an: s.ankF, foot: s.pose.footF, th: s.thF, sk: s.shF };

// ---------------------------------------------------------------------------
// Legs & feet
// ---------------------------------------------------------------------------

export type FootStyle = 'sabaton' | 'boot' | 'bare' | 'wrapped' | 'slipper';

export interface LegCfg {
  thigh: Material;
  shin: Material;
  foot: Material;
  knee?: Material;
  kneeR?: number;
  rThigh: [number, number];
  rShin: [number, number];
  z: number;
  group?: string;
  shade?: number;
  footStyle: FootStyle;
  /** Boot shaft over the lower shin: covers from `from` (0 knee..1 ankle) down. */
  boot?: { mat: Material; from: number; r: [number, number]; cuff?: Material };
  thighTex?: Tex;
  shinTex?: Tex;
}

export function leg(d: Draw, s: Skel, side: Side, c: LegCfg) {
  const L = limbOf(s, side);
  const g = c.group ?? 'leg' + side;
  const o = { z: c.z, group: g, shade: c.shade };
  d.capsule({ ...o, mat: c.thigh, tex: c.thighTex }, L.hip, L.kn, c.rThigh[0], c.rThigh[1]);
  d.capsule({ ...o, mat: c.shin, z: c.z + 0.1, tex: c.shinTex }, L.kn, L.an, c.rShin[0], c.rShin[1]);
  if (c.boot) {
    const top = lerpV(L.kn, L.an, c.boot.from);
    d.capsule({ ...o, mat: c.boot.mat, z: c.z + 0.15 }, top, L.an, c.boot.r[0], c.boot.r[1]);
    if (c.boot.cuff) d.capsule({ ...o, mat: c.boot.cuff, z: c.z + 0.16 }, top, lerpV(top, L.an, 0.18), c.boot.r[0] + 0.6, c.boot.r[0] + 0.4);
  }
  if (c.knee) d.circle({ ...o, mat: c.knee, z: c.z + 0.2 }, L.kn, c.kneeR ?? c.rShin[0] + 0.4);
  foot(d, L.an, L.foot, c.foot, { ...o, z: c.z + 0.3 }, c.footStyle);
}

export function foot(d: Draw, ank: V, ang: number, mat: Material, o: Omit<PrimOpts, 'mat'>, style: FootStyle) {
  const f = d.frame(ank, ang);
  let pts: V[];
  switch (style) {
    case 'sabaton':
      pts = [f(-2.4, 2.4), f(-3.3, 0), f(-3, -3), f(5.2, -3), f(7.4, -2.2), f(6.6, -0.6), f(3.4, 1.1), f(1.6, 2.6)];
      break;
    case 'boot':
      pts = [f(-2.7, 3.2), f(-3.4, 0), f(-3.1, -3), f(5.6, -3), f(6.9, -1.7), f(5.2, 0.2), f(2.6, 1.6), f(2.2, 3.2)];
      break;
    case 'slipper':
      pts = [f(-2.4, 2.2), f(-3, -0.5), f(-2.6, -3), f(5.8, -3), f(7.6, -1.4), f(4.2, -0.2), f(1.4, 1.6)];
      break;
    case 'wrapped':
    case 'bare':
    default:
      pts = [f(-2.2, 2.2), f(-2.9, -0.5), f(-2.5, -3), f(5.2, -3), f(6.4, -2.1), f(4, -0.4), f(1.6, 1.6)];
  }
  d.poly({ ...o, mat }, pts, { kind: 'bevel', w: 1.6 });
}

// ---------------------------------------------------------------------------
// Arms
// ---------------------------------------------------------------------------

export interface ArmCfg {
  upper: Material;
  fore: Material;
  hand: Material;
  rUp: [number, number];
  rLo: [number, number];
  rHand: number;
  z: number;
  group?: string;
  shade?: number;
  elbow?: Material;
  /** Gauntlet/bracer flare at the wrist. */
  cuff?: Material;
  upperTex?: Tex;
  foreTex?: Tex;
  /** Skip drawing the hand (e.g. hidden by a shield). */
  noHand?: boolean;
}

export function arm(d: Draw, s: Skel, side: Side, c: ArmCfg) {
  const L = limbOf(s, side);
  const g = c.group ?? 'arm' + side;
  const o = { z: c.z, group: g, shade: c.shade };
  d.capsule({ ...o, mat: c.upper, tex: c.upperTex }, L.sh, L.el, c.rUp[0], c.rUp[1]);
  d.capsule({ ...o, mat: c.fore, z: c.z + 0.1, tex: c.foreTex }, L.el, L.ha, c.rLo[0], c.rLo[1]);
  if (c.elbow) d.circle({ ...o, mat: c.elbow, z: c.z + 0.15 }, L.el, c.rLo[0] + 0.3);
  if (c.cuff) {
    const w0 = at(L.ha, L.lo, -4.4), w1 = at(L.ha, L.lo, -1.6);
    d.capsule({ ...o, mat: c.cuff, z: c.z + 0.2 }, w0, w1, c.rLo[1] + 0.5, c.rLo[1] + 1.1, 0.3);
  }
  if (!c.noHand) d.ellipse({ ...o, mat: c.hand, z: c.z + 0.3 }, L.ha, c.rHand + 0.3, c.rHand, L.lo);
}

// ---------------------------------------------------------------------------
// Torso & cloth
// ---------------------------------------------------------------------------

/** Profile rows [u, back, front] bottom->top, in torso-local units. */
export function torsoPts(s: Skel, rows: [number, number, number][]): V[] {
  const front = rows.map(([u, , f]) => s.T(u, f));
  const back = rows.map(([u, b]) => s.T(u, -b)).reverse();
  return [...front, ...back];
}

export const foldTex =
  (freq: number, phase: number, thr = 0.55): Tex =>
  (h) =>
    Math.sin(h.v * freq + phase) > thr ? -1 : 0;

export interface CapeCfg {
  mat: Material;
  z: number;
  group?: string;
  len: number;
  /** Attachment along the upper back (torso-local). */
  topU: number;
  topBack: number;
  topFront: number;
  /** Extra width at the hem. */
  spread: number;
  /** 0 = hanging still, 1 = streaming behind at full run. */
  wind: number;
  /** Phase for hem ripples. */
  wave: number;
  /** Jagged hem depth (tattered capes). */
  tatters?: number;
  lining?: Material;
}

export function cape(d: Draw, s: Skel, c: CapeCfg) {
  const topB = s.T(c.topU, -c.topBack);
  const topF = s.T(c.topU + 0.5, c.topFront);
  const hang = -96 - c.wind * 64;
  const midB = at(topB, hang - 14 + c.wind * 6 + Math.sin(c.wave) * 3, c.len * 0.5);
  const botB = at(topB, hang - 6, c.len + c.spread * 0.4);
  const botF = at(topF, hang + 9 - c.wind * 4, c.len * 0.9);
  const midF = at(topF, hang + 6, c.len * 0.45);
  const hem: V[] = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = lerpV(botB, botF, t);
    let off = Math.sin(c.wave * 1.3 + t * 6.5) * (0.8 + c.wind * 1.6);
    if (c.tatters) off += i % 2 === 1 ? -c.tatters * (0.6 + 0.4 * Math.sin(i * 2.1)) : 0;
    hem.push(add(p, mul(dir(hang), off)));
  }
  const pts = [topF, topB, midB, ...hem, midF];
  const axisA = lerpV(topB, topF, 0.5), axisB = lerpV(botB, botF, 0.5);
  const fold = foldTex(8, c.wave * 0.7, 0.6);
  d.poly(
    { mat: c.mat, z: c.z, group: c.group ?? 'cape', tex: fold, shade: 0 },
    pts,
    { kind: 'cyl', a: axisA, b: axisB, r: Math.max(4, c.topBack + c.topFront + c.spread * 0.5) * 0.6, bevel: 1.2 },
  );
}

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------

export interface SwordCfg {
  blade: Material;
  guard: Material;
  grip: Material;
  pommel: Material;
  len: number;
  width: number;
  guardW: number;
  gripLen: number;
  z: number;
  group?: string;
  /** Glowing groove down the blade. */
  rune?: Material;
}

export function sword(d: Draw, hand: V, ang: number, c: SwordCfg) {
  const f = d.frame(hand, ang);
  const g = c.group ?? 'weapon';
  const W = c.width / 2;
  d.capsule({ mat: c.grip, z: c.z, group: g }, f(-c.gripLen, 0), f(2.2, 0), 1.25, 1.25);
  d.circle({ mat: c.pommel, z: c.z + 0.05, group: g }, f(-c.gripLen - 1, 0), 1.8);
  d.poly(
    { mat: c.blade, z: c.z + 0.1, group: g },
    [f(3, -W), f(c.len - 5, -W * 0.85), f(c.len, 0), f(c.len - 5, W * 0.85), f(3, W)],
    { kind: 'cyl', a: f(3, 0), b: f(c.len, 0), r: W + 0.4 },
  );
  if (c.rune) {
    d.capsule({ mat: c.rune, z: c.z + 0.12, group: g, line: 'none' }, f(6, 0), f(c.len - 9, 0), 0.6, 0.45);
  }
  d.capsule({ mat: c.guard, z: c.z + 0.2, group: g }, f(2.8, -c.guardW), f(2.8, c.guardW), 1.3, 1.3);
}

/**
 * Weapon smear: a crescent that is thick at the leading edge (where the blade
 * is now) and tapers to a hairline at the trailing end. White rim on the
 * outside, tinted body inside. Angles are rig-space degrees.
 */
export function smear(
  d: Draw,
  center: V,
  from: number,
  to: number,
  rOuter: number,
  thickness: number,
  colors: { core: RGBA; edge: RGBA },
  z: number,
) {
  if (Math.abs(to - from) < 25) return;
  // a smear never shows more than ~200 degrees of travel
  if (Math.abs(to - from) > 200) from = to - Math.sign(to - from) * 200;
  const o = { mat: MAT.steel, z, group: 'smear', outline: false, line: 'none' as const, noClean: true };
  d.arc({ ...o, color: colors.edge }, center, rOuter - thickness, rOuter, from, to, 0.92);
  d.arc({ ...o, z: z + 0.01, color: colors.core }, center, rOuter - Math.max(2, thickness * 0.38), rOuter, from, to, 0.8);
}

/** Convenience for decals placed in rig space. */
export const px = (p: V, c: RGBA) => ({ p, c });

export { add, at, dir, lerpV, mul, sub, v };
