// Skeleton, poses and the rig->screen drawing helper.
//
// Rig space: origin at the feet pivot on the ground, +x = the direction the
// character faces, +y = up. Angles are absolute directions in degrees
// (0 = forward, 90 = up, -90 = down, 180 = backward). Screen-facing is applied
// only when shapes are emitted, so lighting stays top-left for both facings.
import { Arc, Capsule, Ellipse, Frame, linePixels, NormalMode, Pixels, Poly, PrimOpts, Ribbon, V } from './render.ts';
import { RGBA } from './raster.ts';

export type { V };

export const D2R = Math.PI / 180;
export const v = (x: number, y: number): V => ({ x, y });
export const dir = (deg: number): V => ({ x: Math.cos(deg * D2R), y: Math.sin(deg * D2R) });
export const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k });
export const len = (a: V): number => Math.hypot(a.x, a.y);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpV = (a: V, b: V, t: number): V => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
export const angleOf = (a: V): number => Math.atan2(a.y, a.x) / D2R;
/** Point at distance `d` from `p` along direction `deg`. */
export const at = (p: V, deg: number, d: number): V => add(p, mul(dir(deg), d));

/** Shortest-path angle interpolation. */
export function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a) % 360 + 540) % 360 - 180;
  return a + d * t;
}

export type Limb = { up: number; lo: number } | { ik: V; bend?: number };

export interface Pose {
  /** Pelvis offset from its rest position. */
  x: number;
  y: number;
  /** Torso direction; 90 = upright, smaller = leaning forward. */
  torso: number;
  /** Head direction; 90 = upright. */
  head: number;
  armN: Limb;
  armF: Limb;
  /** IK targets for legs are ankle positions. */
  legN: Limb;
  legF: Limb;
  /** Foot directions, 0 = flat pointing forward. */
  footN: number;
  footF: number;
  /** Character specific channels (weapon angles, cape wind, ...). */
  p: Record<string, number>;
}

export interface Dims {
  /** Pelvis height at rest. */
  hipH: number;
  thigh: number;
  shin: number;
  ankleH: number;
  footLen: number;
  spine: number;
  neck: number;
  upperArm: number;
  foreArm: number;
  /** Shoulder joint distance below the neck base, along the torso. */
  shoulderDrop: number;
  /** 3/4 view: near limbs sit slightly behind, far limbs slightly ahead. */
  shoulderN: number;
  shoulderF: number;
  hipN: number;
  hipF: number;
}

export interface Skel {
  pose: Pose;
  dims: Dims;
  pelvis: V;
  neck: V;
  head: V;
  torso: number;
  headDir: number;
  sN: V;
  eN: V;
  hN: V;
  sF: V;
  eF: V;
  hF: V;
  hipN: V;
  kneeN: V;
  ankN: V;
  toeN: V;
  hipF: V;
  kneeF: V;
  ankF: V;
  toeF: V;
  /** Upper/lower limb directions (deg). */
  upN: number;
  loN: number;
  upF: number;
  loF: number;
  thN: number;
  shN: number;
  thF: number;
  shF: number;
  /** Torso-local point: u up the spine from the pelvis, w toward the front. */
  T(u: number, w: number): V;
  /** Head-local point: x toward the face, y up. */
  H(x: number, y: number): V;
}

/** Two-bone IK. bend=+1 rotates the joint counter-clockwise from the root->target line. */
export function ik2(root: V, target: V, l1: number, l2: number, bend: number): { mid: V; end: V; a1: number; a2: number } {
  const d0 = sub(target, root);
  const d = Math.min(Math.max(len(d0), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.001);
  const base = angleOf(d0);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA))) / D2R;
  const a1 = base + bend * a;
  const mid = at(root, a1, l1);
  const end = at(root, base, d);
  const a2 = angleOf(sub(end, mid));
  return { mid, end, a1, a2 };
}

export function solve(pose: Pose, D: Dims): Skel {
  const pelvis = v(pose.x, D.hipH + pose.y);
  const neck = at(pelvis, pose.torso, D.spine);
  const fwd = pose.torso - 90; // torso-local "front" direction
  const T = (u: number, w: number) => add(at(pelvis, pose.torso, u), mul(dir(fwd), w));
  const head = at(neck, pose.head, D.neck);
  const hf = pose.head - 90;
  const H = (x: number, y: number) => add(at(head, pose.head, y), mul(dir(hf), x));

  const sN = T(D.spine - D.shoulderDrop, D.shoulderN);
  const sF = T(D.spine - D.shoulderDrop, D.shoulderF);
  const hipN = add(pelvis, mul(dir(fwd), D.hipN));
  const hipF = add(pelvis, mul(dir(fwd), D.hipF));

  const arm = (s: V, l: Limb) => {
    if ('ik' in l) {
      const r = ik2(s, l.ik, D.upperArm, D.foreArm, l.bend ?? -1);
      return { e: r.mid, h: r.end, up: r.a1, lo: r.a2 };
    }
    const e = at(s, l.up, D.upperArm);
    return { e, h: at(e, l.lo, D.foreArm), up: l.up, lo: l.lo };
  };
  const leg = (hip: V, l: Limb) => {
    if ('ik' in l) {
      const r = ik2(hip, l.ik, D.thigh, D.shin, l.bend ?? 1);
      return { k: r.mid, a: r.end, th: r.a1, sh: r.a2 };
    }
    const k = at(hip, l.up, D.thigh);
    return { k, a: at(k, l.lo, D.shin), th: l.up, sh: l.lo };
  };
  const aN = arm(sN, pose.armN), aF = arm(sF, pose.armF);
  const lN = leg(hipN, pose.legN), lF = leg(hipF, pose.legF);
  return {
    pose,
    dims: D,
    pelvis,
    neck,
    head,
    torso: pose.torso,
    headDir: pose.head,
    sN,
    eN: aN.e,
    hN: aN.h,
    sF,
    eF: aF.e,
    hF: aF.h,
    upN: aN.up,
    loN: aN.lo,
    upF: aF.up,
    loF: aF.lo,
    hipN,
    kneeN: lN.k,
    ankN: lN.a,
    toeN: at(lN.a, pose.footN, D.footLen),
    hipF,
    kneeF: lF.k,
    ankF: lF.a,
    toeF: at(lF.a, pose.footF, D.footLen),
    thN: lN.th,
    shN: lN.sh,
    thF: lF.th,
    shF: lF.sh,
    T,
    H,
  };
}

// ---------------------------------------------------------------------------
// Pose helpers
// ---------------------------------------------------------------------------

export function pose(p: Partial<Pose> & { p?: Record<string, number> }): Pose {
  return {
    x: 0,
    y: 0,
    torso: 90,
    head: 90,
    armN: { up: -90, lo: -90 },
    armF: { up: -90, lo: -90 },
    legN: { ik: v(-5, 3) },
    legF: { ik: v(5, 3) },
    footN: 0,
    footF: 0,
    ...p,
    p: { ...(p.p ?? {}) },
  };
}

function limbToFK(l: Limb, root: V, l1: number, l2: number, defBend: number): { up: number; lo: number } {
  if (!('ik' in l)) return l;
  const r = ik2(root, l.ik, l1, l2, l.bend ?? defBend);
  return { up: r.a1, lo: r.a2 };
}

function lerpLimb(a: Limb, b: Limb, t: number, root: V, l1: number, l2: number, defBend: number): Limb {
  if ('ik' in a && 'ik' in b) return { ik: lerpV(a.ik, b.ik, t), bend: a.bend ?? b.bend };
  const fa = limbToFK(a, root, l1, l2, defBend), fb = limbToFK(b, root, l1, l2, defBend);
  return { up: lerpAngle(fa.up, fb.up, t), lo: lerpAngle(fa.lo, fb.lo, t) };
}

/** Blend two poses. Limbs in IK on both sides blend targets, otherwise angles. */
export function lerpPose(a: Pose, b: Pose, t: number, D: Dims): Pose {
  const sa = solve(a, D);
  const p: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a.p), ...Object.keys(b.p)])) {
    const x = a.p[k] ?? b.p[k], y = b.p[k] ?? a.p[k];
    p[k] = k.endsWith('Ang') ? lerpAngle(x, y, t) : lerp(x, y, t);
  }
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    torso: lerpAngle(a.torso, b.torso, t),
    head: lerpAngle(a.head, b.head, t),
    armN: lerpLimb(a.armN, b.armN, t, sa.sN, D.upperArm, D.foreArm, -1),
    armF: lerpLimb(a.armF, b.armF, t, sa.sF, D.upperArm, D.foreArm, -1),
    legN: lerpLimb(a.legN, b.legN, t, sa.hipN, D.thigh, D.shin, 1),
    legF: lerpLimb(a.legF, b.legF, t, sa.hipF, D.thigh, D.shin, 1),
    footN: lerpAngle(a.footN, b.footN, t),
    footF: lerpAngle(a.footF, b.footF, t),
    p,
  };
}

/** Shallow-merge helper for authoring variations of a pose. */
export function tweak(base: Pose, d: Partial<Pose> & { p?: Record<string, number> }): Pose {
  return { ...base, ...d, p: { ...base.p, ...(d.p ?? {}) } };
}

export const ease = {
  inOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t: number) => 1 - (1 - t) * (1 - t),
  in: (t: number) => t * t,
};

// ---------------------------------------------------------------------------
// Rig -> screen drawing helper
// ---------------------------------------------------------------------------

export class Draw {
  constructor(
    public f: Frame,
    public facing: 1 | -1,
    public pivot: V,
  ) {}

  P(p: V): V {
    return { x: this.pivot.x + this.facing * p.x, y: this.pivot.y - p.y };
  }

  /** Rig-space angle (deg) to screen-space angle (radians). */
  A(deg: number): number {
    const d = dir(deg);
    return Math.atan2(-d.y, this.facing * d.x);
  }

  private nm(nm?: NormalMode): NormalMode | undefined {
    if (!nm) return nm;
    if (nm.kind === 'cyl') return { ...nm, a: this.P(nm.a), b: this.P(nm.b) };
    if (nm.kind === 'dome') return { ...nm, c: this.P(nm.c) };
    if (nm.kind === 'flat') return { ...nm, n: [nm.n[0] * this.facing, -nm.n[1], nm.n[2]] };
    if (nm.kind === 'bevel' && nm.n) return { ...nm, n: [nm.n[0] * this.facing, -nm.n[1], nm.n[2]] };
    return nm;
  }

  capsule(o: PrimOpts, a: V, b: V, ra: number, rb = ra, flat = 0) {
    return this.f.add(new Capsule(o, this.P(a), this.P(b), ra, rb, flat));
  }

  ellipse(o: PrimOpts, c: V, rx: number, ry: number, deg = 0, flat = 0) {
    return this.f.add(new Ellipse(o, this.P(c), rx, ry, this.A(deg), flat));
  }

  circle(o: PrimOpts, c: V, r: number, flat = 0) {
    return this.ellipse(o, c, r, r, 0, flat);
  }

  /** Normal mode coordinates are rig space too. */
  poly(o: PrimOpts, pts: V[], nm?: NormalMode) {
    return this.f.add(new Poly(o, pts.map((p) => this.P(p)), this.nm(nm)));
  }

  ribbon(o: PrimOpts, pts: V[], radii: number[], flat = 0) {
    return this.f.add(new Ribbon(o, pts.map((p) => this.P(p)), radii, flat));
  }

  arc(o: PrimOpts, c: V, r0: number, r1: number, deg0: number, deg1: number, taper = 0.7, sy = 1) {
    // keep the sweep direction consistent after mirroring
    const a0 = this.A(deg0);
    let a1 = this.A(deg1);
    const sweepRig = deg1 - deg0;
    const sweepScreen = -sweepRig * this.facing * D2R; // y flip negates, mirror negates again
    a1 = a0 + sweepScreen;
    return this.f.add(new Arc(o, this.P(c), r0, r1, a0, a1, taper, sy));
  }

  /** Single pixels in rig space. */
  pixels(o: PrimOpts, pts: { p: V; c: RGBA }[]) {
    return this.f.add(new Pixels(o, pts.map(({ p, c }) => ({ ...this.P(p), c }))));
  }

  /** 1px line with an exact color. */
  line(o: PrimOpts, a: V, b: V, c: RGBA) {
    return this.f.add(new Pixels(o, linePixels(this.P(a), this.P(b)).map((p) => ({ ...p, c }))));
  }

  /** Local frame helper: point = origin + dir(deg)*u + dir(deg+90)*w (rig space). */
  frame(origin: V, deg: number): (u: number, w: number) => V {
    const du = dir(deg), dw = dir(deg + 90);
    return (u, w) => ({ x: origin.x + du.x * u + dw.x * w, y: origin.y + du.y * u + dw.y * w });
  }
}
