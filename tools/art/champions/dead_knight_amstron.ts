// Dead Knight Amstron (docs/DESIGN_DECISIONS.md section 39, Jakub's brief of
// 2026-10-31): a Heroic of the Ashveil Reign, Tank. "Full plate armor in red and
// crimson colors. big shoulders. no helmet, only skull. wields spear and tower
// shield with white emblems." So he is a tall dead knight, closed in plate from the
// gorget to the sabatons: deep crimson edged in bright scarlet, very wide pauldrons
// of three lames; above the gorget the neck's bones and a bare skull with a pale
// light in its socket. Before him on his far arm a tall tower shield, crimson in a
// scarlet rim, with two white emblems: a skull, and under it the Reign's white bone.
// In his near hand a long spear with a leaf blade and a scarlet tassel, its butt on
// the ground at rest. He dies as the Reign's skeletons do: what held him gives way,
// and the plate falls in a heap, the skull rolling clear. What the brief leaves open
// is a first take; nothing in the look comes from his affinity (affinities are
// abstract, Jakub, 2026-10-11).
//
// Pose channels: `spAng` the spear's direction from the near hand (90 upright, tip
// up), `shAng` the shield's top (90 upright), `jaw` opens the skull's jaw (degrees),
// `soul` the light in the socket (0..2), `tassel` how far the tassel streams,
// `heap` lets him fall apart (0..1).
import { BN, fallApart, skullFrame, trunkFrame, vertebrae } from '../bones.ts';
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, D2R, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 38,
  thigh: 18,
  shin: 17.6,
  ankleH: 3,
  footLen: 7.4,
  spine: 24,
  neck: 8,
  upperArm: 14.5,
  foreArm: 13.5,
  shoulderDrop: 4.6,
  shoulderN: -4,
  shoulderF: 4.4,
  hipN: -2.6,
  hipF: 2.6,
};

const PL = MAT.crimsonPlate, RD = MAT.scarletPlate, WH = MAT.whiteCloth, IR = MAT.iron, ST = MAT.steel, WD = MAT.ebony, DL = MAT.darkleather;
const E = ACCENT;
/** The skull is a little larger than life over all that plate. */
const SK = 1.18;

/** The spear, measured from the near hand: its butt, where the blade starts, its tip. */
const BUTT = 37, BLADE = 40, TIP = 53;

/** Where everything comes to rest as he falls apart: the cuirass on its back, the limbs in their plates about it, the shield flat before it, the spear along the ground, the skull rolled clear. */
interface Parts {
  pelvis: V; torso: number; head: V; headDir: number;
  sN: V; eN: V; hN: V; sF: V; eF: V; hF: V;
  hipN: V; kneeN: V; ankN: V; footN: number;
  hipF: V; kneeF: V; ankF: V; footF: number;
  shield: V; shA: number; grip: V; spA: number;
}
const HEAP: Parts = {
  pelvis: v(-8, 8), torso: 172, head: v(-46, 5.4), headDir: 150,
  sN: v(-30, 7), eN: v(-20, 4), hN: v(-8, 3.4), sF: v(-34, 5), eF: v(-44, 3.4), hF: v(-54, 3),
  hipN: v(-4, 5), kneeN: v(10, 5), ankN: v(24, 4), footN: 8,
  hipF: v(-8, 4), kneeF: v(4, 3.6), ankF: v(16, 3.4), footF: -6,
  shield: v(36, 5), shA: 2, grip: v(-14, 2.4), spA: 3,
};

function partsOf(s: Skel): Parts {
  const P = s.pose.p;
  const alive: Parts = {
    pelvis: s.pelvis, torso: s.torso, head: s.head, headDir: s.headDir,
    sN: s.sN, eN: s.eN, hN: s.hN, sF: s.sF, eF: s.eF, hF: s.hF,
    hipN: s.hipN, kneeN: s.kneeN, ankN: s.ankN, footN: s.pose.footN,
    hipF: s.hipF, kneeF: s.kneeF, ankF: s.ankF, footF: s.pose.footF,
    shield: at(at(lerpV(s.eF, s.hF, 0.55), s.torso - 90, 5), s.torso, -3), shA: P.shAng ?? 90, grip: s.hN, spA: P.spAng ?? 90,
  };
  return fallApart(alive, HEAP, P.heap ?? 0);
}

const angle = (a: V, b: V) => Math.atan2(b.y - a.y, b.x - a.x) / D2R;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const heap = P.heap ?? 0;
  const B = partsOf(s);
  const T = trunkFrame(B);

  // the line of a thrust behind everything
  if (info.def.smear && info.prev) thrustLine(d, at(info.prev.hN, info.prev.pose.p.spAng ?? 0, TIP), at(B.grip, B.spA, TIP), B.spA, 2);

  // far leg, far arm and pauldron behind the body, a shade darker
  plateLeg(d, B.hipF, B.kneeF, B.ankF, B.footF, 10, -1, 'F');
  plateArm(d, B.sF, B.eF, B.hF, 20, -1, 'F');
  pauldron(d, B.sF, angle(B.sF, B.eF), 22, -1, 'F');

  trunk(d, T, 30);
  gorgetAndSkull(d, T, B, P, heap, 36);

  plateLeg(d, B.hipN, B.kneeN, B.ankN, B.footN, 50, 0, 'N');
  tassets(d, T, 53);

  // the tower shield before him
  shield(d, B.shield, B.shA, 54, heap);

  // the spear, the near arm over it, the great near pauldron
  spear(d, B.grip, B.spA, 56, P.tassel ?? 0, info);
  plateArm(d, B.sN, B.eN, B.hN, 60, 0, 'N');
  pauldron(d, B.sN, angle(B.sN, B.eN), 62, 0, 'N');
}

/** A streak of pale red running back along the thrust. */
function thrustLine(d: Draw, from: V, to: V, ang: number, z: number) {
  const o = { mat: RD, z, outline: false, line: 'none' as const, noClean: true, group: 'streak' };
  const back = Math.max(16, Math.hypot(to.x - from.x, to.y - from.y));
  for (const [w, k] of [[2.6, 1], [-2.6, 0.75]] as const) {
    const a = at(at(to, ang + 90, w), ang, -3), b = at(a, ang, -back * k);
    d.ribbon({ ...o, color: RD.ramp[4] }, [b, a], [0.3, 1]);
    d.line({ ...o, z: z + 0.01 }, lerpV(a, b, 0.5), a, E.white);
  }
}

/** The trunk: a breastplate from the neck to the waist with a lit keel and a scarlet edge, two lames of fauld, a dark belt. */
function trunk(d: Draw, T: (u: number, w: number) => V, z: number) {
  const prof: [number, number, number][] = [[0, 7, 7.4], [5, 7.4, 8.2], [10, 8.4, 9.6], [15, 9.2, 10.4], [19, 9, 9.6], [22, 7, 6.4], [24, 4, 3.6]];
  const pts = [...prof.map(([u, , f]) => T(u, f)), ...[...prof].reverse().map(([u, b]) => T(u, -b))];
  d.poly({ mat: PL, z, group: 'cuirass' }, pts, { kind: 'cyl', a: T(0, 1), b: T(24, 1), r: 10.4, bevel: 1.7 });
  d.line({ mat: PL, z: z + 0.1, group: 'cuirass', line: 'none' }, T(7, 8.2), T(17.6, 9), PL.ramp[5]);
  d.ribbon({ mat: RD, z: z + 0.2, group: 'cuirass', line: 'none' }, [T(19, 7.4), T(16.4, 2.4), T(13, 1)], [0.6, 0.6, 0.6]);
  d.ribbon({ mat: RD, z: z + 0.2, group: 'cuirass', line: 'none' }, [T(8.4, -7.4), T(8.2, 1), T(8.6, 8.8)], [0.55, 0.55, 0.55]);
}

/** Tassets over the hips: two lames of crimson, the lower edged in scarlet; a dark belt over their top. */
function tassets(d: Draw, T: (u: number, w: number) => V, z: number) {
  for (const [u0, u1, k] of [[1.6, 5, 0], [-2.6, 2, 1]] as const) {
    d.poly({ mat: PL, z: z + k * 0.01, group: 'fauld' + k, line: 'soft' }, [T(u1, -8), T(u1, 8.4), T(u0, 8.8), T(u0, -8.2)], { kind: 'cyl', a: T(u0, 1), b: T(u1, 1), r: 8.6, bevel: 1 });
    d.line({ mat: RD, z: z + 0.05 + k * 0.01, group: 'fauld' + k, line: 'none' }, T(u0 + 0.3, -7.6), T(u0 + 0.3, 8.2), RD.ramp[k ? 4 : 3]);
  }
  d.poly({ mat: DL, z: z + 0.2, group: 'belt' }, [T(6.6, -7.8), T(6.8, 8.6), T(5, 8.6), T(4.8, -7.8)], { kind: 'cyl', a: T(4.8, 0), b: T(6.8, 0), r: 8.4 });
}

/** A leg in plate: cuisse, a couter at the knee edged in scarlet, a greave with a lit ridge, a pointed sabaton. */
function plateLeg(d: Draw, hip: V, kn: V, an: V, ft: number, z: number, shade: number, side: string) {
  const g = 'leg' + side;
  d.capsule({ mat: PL, z, group: g, shade }, hip, kn, 5, 3.8);
  d.capsule({ mat: PL, z: z + 0.1, group: g, shade, tex: (h) => (Math.abs(h.v + 0.25) < 0.12 ? 1 : 0) }, kn, an, 3.5, 2.8);
  d.circle({ mat: PL, z: z + 0.15, group: g + 'k', shade, line: 'soft' }, kn, 3.7);
  d.pixels({ mat: RD, z: z + 0.16, group: g + 'k', line: 'none' }, [{ p: kn, c: RD.ramp[4] }, { p: v(kn.x + 1, kn.y), c: RD.ramp[3] }]);
  const f = d.frame(an, ft);
  d.poly({ mat: PL, z: z + 0.2, group: g + 'f', shade }, [f(-2.8, 2.4), f(-3.4, -0.6), f(-3, -3), f(5.8, -3), f(7.8, -2.4), f(6.4, -0.8), f(3.2, 1), f(1.4, 2.6)], { kind: 'bevel', w: 1.4 });
  d.line({ mat: RD, z: z + 0.25, group: g + 'f', line: 'none' }, f(-2.6, 2), f(1.2, 2.2), RD.ramp[4]);
}

/** An arm in plate, a scarlet couter at the elbow, a gauntlet. */
function plateArm(d: Draw, sh: V, el: V, ha: V, z: number, shade: number, side: string) {
  const g = 'arm' + side;
  const lo = angle(el, ha);
  d.capsule({ mat: PL, z, group: g, shade }, sh, el, 3.8, 3.3);
  d.capsule({ mat: PL, z: z + 0.1, group: g, shade }, el, ha, 3.3, 2.9);
  d.circle({ mat: PL, z: z + 0.15, group: g + 'k', shade, line: 'soft' }, el, 3.1);
  d.pixels({ mat: RD, z: z + 0.16, group: g + 'k', line: 'none' }, [{ p: el, c: RD.ramp[4] }]);
  d.capsule({ mat: PL, z: z + 0.2, group: g + 'h', shade }, at(ha, lo, -4.4), at(ha, lo, -1.4), 3.2, 3.7, 0.3);
  d.ellipse({ mat: PL, z: z + 0.3, group: g + 'h', shade }, ha, 3, 2.7, lo);
}

/** A very wide pauldron: three lames over the shoulder, each laid on a scarlet one a little larger, so a bright rim shows under each; it stays on the shoulder as the arm rises. */
function pauldron(d: Draw, sh: V, up: number, z: number, shade: number, side: string) {
  const off = ((up + 90 + 540) % 360) - 180;
  const a = -90 + Math.max(-55, Math.min(55, off));
  const top = at(sh, a, 1.4);
  const g = 'paul' + side;
  ([[0, 10, 5], [3.2, 8.8, 4.2], [5.8, 7.4, 3.4]] as const).forEach(([o, rx, ry], i) => {
    const c = at(top, a, o);
    const zz = z - i * 0.01;
    d.ellipse({ mat: RD, z: zz - 0.004, group: g + i, shade, line: 'soft' }, at(c, a, 0.8), rx + 0.5, ry + 0.4, a + 90, 0.15);
    d.ellipse({ mat: PL, z: zz, group: g + i, shade, line: 'none' }, c, rx, ry, a + 90, 0.15);
  });
  d.pixels({ mat: RD, z: z + 0.02, group: g + '0', line: 'none' }, [{ p: top, c: RD.ramp[5] }, { p: at(top, a + 90, 4), c: RD.ramp[4] }, { p: at(top, a - 90, 4), c: RD.ramp[4] }]);
}

/** The gorget, the neck's bones standing out of it, and the bare skull on them. */
function gorgetAndSkull(d: Draw, T: (u: number, w: number) => V, B: Parts, P: Record<string, number>, heap: number, z: number) {
  d.poly({ mat: PL, z, group: 'gorget' }, [T(21, -5.6), T(24.6, -4.4), T(25.2, 4), T(21.4, 5.4)], { kind: 'cyl', a: T(21, 0), b: T(25, 0), r: 5.6, bevel: 1 });
  d.ribbon({ mat: RD, z: z + 0.05, group: 'gorget', line: 'none' }, [T(24.8, -4.2), T(25.4, 0), T(25, 3.8)], [0.6, 0.65, 0.6]);
  if (heap < 0.5) vertebrae(d, T(24.6, -0.4), B.head, z + 0.2, 3);
  const f = skullFrame(B);
  const H = (x: number, y: number) => f(x * SK, y * SK);
  const ha = B.headDir - 90;
  const zz = z + 2;
  d.ellipse({ mat: BN, z: zz, group: 'skull' }, H(-0.8, 1.3), 5.5 * SK, 5.7 * SK, ha);
  d.poly({ mat: BN, z: zz + 0.05, group: 'skull' }, [H(-0.4, 3.2), H(3.6, 3.1), H(5.5, 1.6), H(6, -0.6), H(5.7, -2.2), H(4.6, -2.9), H(1.8, -2.9), H(-0.9, -1.6)], { kind: 'dome', c: H(1.4, 0.4), r: 6.6 * SK, bevel: 0.8 });
  // the sockets, dark, a pale light in the near one; a crack across the crown
  d.ellipse({ mat: BN, z: zz + 0.15, group: 'socket', flat: 0, line: 'none' }, H(2.6, 0.7), 1.85 * SK, 2 * SK, ha);
  d.ellipse({ mat: BN, z: zz + 0.15, group: 'socketF', flat: 0, line: 'none' }, H(5.2, 0.6), 0.65 * SK, 1.5 * SK, ha);
  const soul = P.soul ?? 1;
  const px: { p: V; c: RGBA }[] = [];
  if (soul > 0.1) {
    px.push({ p: H(3, 0.6), c: E.ashEye }, { p: H(2.9, -0.4), c: E.ashEyeDim });
    if (soul > 1.2) px.push({ p: H(2.2, 0.8), c: E.ashEye }, { p: H(3, 1.5), c: E.ashEye }, { p: H(5.2, 0.5), c: E.ashEyeDim });
  }
  for (const [x, y] of [[-3.4, 6.2], [-2.6, 5.2], [-3, 4.2], [-2.2, 3.4]] as const) px.push({ p: H(x, y), c: BN.ramp[1] });
  // the nose, the teeth
  px.push({ p: H(5, -1.2), c: BN.ramp[0] }, { p: H(5.4, -1.2), c: BN.ramp[0] }, { p: H(5.1, -1.8), c: BN.ramp[1] });
  for (const [i, x] of [1.9, 2.9, 3.9, 4.9].entries()) px.push({ p: H(x, -2.8), c: BN.ramp[i % 2 ? 4 : 5] }, { p: H(x + 0.5, -2.8), c: BN.ramp[1] });
  d.pixels({ mat: BN, z: zz + 0.2, group: 'skull', line: 'none' }, px);
  // the jaw, hinged under the cheek
  const jaw = P.jaw ?? 0;
  const hx = -1, hy = -1.6, c = Math.cos(-jaw * D2R), sn = Math.sin(-jaw * D2R);
  const J = (x: number, y: number) => H(hx + (x - hx) * c - (y - hy) * sn, hy + (x - hx) * sn + (y - hy) * c);
  d.poly({ mat: BN, z: zz - 0.05, group: 'jaw' }, [J(-1.4, -0.6), J(-0.9, -2.8), J(1.2, -4.5), J(4.4, -4.6), J(5.5, -3.9), J(5.4, -3.1), J(2, -3.1), J(0.4, -2.2)], { kind: 'dome', c: J(2.2, -3), r: 4.4 * SK, bevel: 0.6 });
}

/** The tower shield at `c`, its top toward `ang`: tall and straight, a scarlet rim, a crimson field with a raised ridge, a white skull over the Reign's white bone. `flat` squeezes it edge-on as it lies on the ground. */
function shield(d: Draw, c: V, ang: number, z: number, heap: number) {
  shieldAt(d, c, ang, z, heap > 0.75 ? 0.82 : heap > 0.4 ? 0.45 : 0.12, 1);
}

function shieldAt(d: Draw, c: V, ang: number, z: number, flat: number, k: number) {
  const f0 = d.frame(c, ang);
  const f = (u: number, w: number) => f0(u * k, w * k * (1 - flat));
  const T = 20, B = -31, HW = 10.6;
  const rim = [f(T, -HW + 1.4), f(T + 1, 0), f(T, HW - 1.4), f(T - 1.4, HW), f(B + 3, HW), f(B, HW - 2.6), f(B - 1, 0), f(B, -HW + 2.6), f(B + 3, -HW), f(T - 1.4, -HW)];
  const nm = { kind: 'dome' as const, c: f(6, HW * 0.2), r: 46 * k, bevel: 1 };
  d.poly({ mat: RD, z, group: 'shield' }, rim, nm);
  const I = 1.9;
  d.poly({ mat: PL, z: z + 0.1, group: 'shield', line: 'none' }, [f(T - I, -HW + I + 0.6), f(T - I + 0.6, 0), f(T - I, HW - I - 0.6), f(B + 3, HW - I), f(B + I, HW - I - 1.6), f(B + I - 0.6, 0), f(B + I, -HW + I + 1.6), f(B + 3, -HW + I)], nm);
  if (flat > 0.6) return;
  // the white emblems: a skull above, the Reign's bone below
  const W = WH;
  const skullC = 8;
  d.ellipse({ mat: W, z: z + 0.2, group: 'emblem', line: 'none' }, f(skullC + 1.2, 0), 5.6 * k, 5 * k * (1 - flat), ang);
  d.poly({ mat: W, z: z + 0.2, group: 'emblem', line: 'none' }, [f(skullC - 1.4, -3.2), f(skullC - 1.4, 3.2), f(skullC - 5.6, 2.2), f(skullC - 5.6, -2.2)], { kind: 'flat', n: [-0.2, 0.2, 0.95] });
  const dark = PL.ramp[1];
  const px: { p: V; c: RGBA }[] = [];
  for (const w of [-2.4, 2.4]) for (const [du, dw] of [[0, 0], [1, 0], [0, 1], [1, 1], [0, -1], [1, -1], [-1, 0]] as const) px.push({ p: f(skullC + 0.6 + du, w + dw * 0.8), c: dark });
  px.push({ p: f(skullC - 2.2, 0), c: dark }, { p: f(skullC - 4.4, -1), c: dark }, { p: f(skullC - 4.4, 1), c: dark });
  d.pixels({ mat: W, z: z + 0.25, group: 'emblem', line: 'none' }, px);
  const bone = -13;
  d.capsule({ mat: W, z: z + 0.2, group: 'emblem2', line: 'none' }, f(bone, -5.4), f(bone, 5.4), 1.3 * k, 1.3 * k);
  for (const w of [-6.2, 6.2]) for (const u of [-1.5, 1.5]) d.circle({ mat: W, z: z + 0.2, group: 'emblem2', line: 'none' }, f(bone + u, w), 1.6 * k);
}

/** The spear: a long dark shaft, an iron butt, a leaf blade of steel, a scarlet tassel under it; `tassel` streams it. */
function spear(d: Draw, hand: V, ang: number, z: number, tassel: number, info: BuildInfo) {
  void info;
  const f = d.frame(hand, ang);
  d.capsule({ mat: WD, z, group: 'shaft' }, f(-BUTT, 0), f(BLADE, 0), 1.25, 1.2);
  d.capsule({ mat: IR, z: z + 0.02, group: 'shaft', line: 'soft' }, f(-BUTT - 1, 0), f(-BUTT + 3, 0), 0.9, 1.5);
  d.capsule({ mat: RD, z: z + 0.02, group: 'collar', line: 'soft' }, f(BLADE - 3, 0), f(BLADE, 0), 1.7, 1.7);
  bladeShape(d, f, z + 0.05);
  // the tassel, hanging from under the blade, down the screen and trailing
  const root = f(BLADE - 3, 0);
  for (const [k, off] of [[0, -2], [1, 1], [2, 4]] as const) {
    const end = v(root.x - 1.5 - tassel * 8 + k, root.y - 7 + tassel * 2 - k * 0.6);
    d.ribbon({ mat: RD, z: z + 0.04 + k * 0.001, group: 'tassel', line: 'soft' }, [root, lerpV(root, end, 0.6), v(end.x + off * 0.3, end.y)], [0.8, 0.75, 0.3]);
  }
}

function bladeShape(d: Draw, f: (u: number, w: number) => V, z: number) {
  d.poly({ mat: ST, z, group: 'blade' }, [f(BLADE, -1.5), f(BLADE + 3, -3.4), f(TIP - 4, -1.6), f(TIP, 0), f(TIP - 4, 1.6), f(BLADE + 3, 3.4), f(BLADE, 1.5)], { kind: 'bevel', w: 1.2 });
  d.line({ mat: ST, z: z + 0.02, group: 'blade', line: 'none' }, f(BLADE + 1, 0), f(TIP - 2, 0), ST.ramp[5]);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

/** The near hand at `hand`, the spear at `ang`. */
const sp = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, armF: { up: -74, lo: 22 }, ...extra, p: { spAng: ang, ...(extra.p ?? {}) } });

// At rest: the shield before him, the spear upright in his near hand, its butt on the ground.
const IDLE = sp(v(-11, 40), 90, { y: -1, torso: 90, head: 90, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) } });

function idle(t: number): Pose {
  const b = Math.round((1 - Math.cos(t * Math.PI * 2)) / 2);
  return tweak(IDLE, { y: -1 - b, head: 90 - b, armF: { up: -74, lo: 22 - b }, p: { tassel: b * 0.1 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -12 * Math.cos(ph), y: 3 + (sn > 0 ? 7 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return sp(v(-3, 38 + bob), 22, {
    y: bob - 2, torso: 78, head: 84,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armF: { up: -52, lo: 30 },
    p: { shAng: 96, tassel: 0.9 },
  });
}

// Hobbling Thrust: the spear drawn back level at his hip, then driven straight in.
const HT_DRAW = sp(v(-15, 46), 4, { x: -3, y: -2, torso: 96, head: 90, legN: { ik: v(-12, 3) }, legF: { ik: v(10, 3) }, p: { tassel: 0.2 } });
const HT_THRUST = sp(v(23, 47), 2, { x: 9, y: -5, torso: 70, head: 78, legN: { ik: v(-11, 3) }, legF: { ik: v(17, 3) }, armF: { up: -62, lo: 12 }, p: { shAng: 98, tassel: 1, jaw: 10 } });
const HT_HOLD = tweak(HT_THRUST, { x: 8, armN: { ik: v(20, 46), bend: -1 }, p: { tassel: 0.6, jaw: 4 } });

// Grave Pierce: the spear reversed high over his shoulder, then driven down through the enemy with his whole weight.
const GP_LIFT = sp(v(-15, 72), -30, { armN: { ik: v(-15, 72), bend: 1 }, x: -3, y: 0, torso: 96, head: 96, legN: { ik: v(-12, 3) }, legF: { ik: v(10, 3) }, p: { tassel: 0.3, soul: 2 } });
const GP_OVER = sp(v(10, 66), -36, { x: 3, y: -2, torso: 82, head: 80, legN: { ik: v(-11, 3) }, legF: { ik: v(14, 3) }, p: { tassel: 0.5, jaw: 14, soul: 2 } });
const GP_DRIVE = sp(v(21, 46), -38, { x: 10, y: -6, torso: 60, head: 66, legN: { ik: v(-11, 3) }, legF: { ik: v(17, 3) }, armF: { up: -50, lo: 34 }, p: { shAng: 100, tassel: 1, jaw: 20, soul: 2 } });
const GP_HOLD = tweak(GP_DRIVE, { y: -7, torso: 58, p: { tassel: 0.4, jaw: 8, soul: 1 } });

// Last Bastion: the shield grounded before him with a stamp, the spear thrust up at the sky, the pale light flaring in the skull.
const LB_GROUND = sp(v(-13, 58), 90, { y: -3, torso: 84, head: 84, legN: { ik: v(-11, 3) }, legF: { ik: v(11, 3) }, armF: { up: -82, lo: -10 }, p: { tassel: 0.2 } });
const LB_RAISE = sp(v(-15, 73), 90, { armN: { ik: v(-15, 73), bend: 1 }, y: -1, torso: 92, head: 100, legN: { ik: v(-10, 3) }, legF: { ik: v(11, 3) }, armF: { up: -78, lo: -2 }, p: { jaw: 16, soul: 2, tassel: 0.4 } });
const LB_HOLD = (k: number) => tweak(LB_RAISE, { p: { jaw: 12 - k * 4, tassel: 0.4 + k * 0.1, soul: 2 } });

const HURT = sp(v(-14, 38), 96, { x: -4, y: -1, torso: 100, head: 106, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10, armF: { up: -62, lo: 30 }, p: { shAng: 86, jaw: 12 } });

// Death: he reels, the light goes out, and what held him lets go: the plate comes down in a heap.
const D_REEL = sp(v(-14, 40), 104, { x: -5, y: -3, torso: 104, head: 118, legN: { ik: v(-13, 3) }, legF: { ik: v(6, 4) }, armF: { up: -50, lo: 10 }, p: { shAng: 80, jaw: 22, soul: 0.5 } });
const D_FALL = (heap: number) => tweak(D_REEL, { p: { heap, soul: 0, jaw: 22 } });

// Victory: the spear raised high, the shield before him, the jaw dropped in something like a laugh.
const RAISE = sp(v(-15, 72), 90, { armN: { ik: v(-15, 72), bend: 1 }, y: -1, torso: 92, head: 98, legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) }, p: { jaw: 18, soul: 2, tassel: 0.5 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'dead_knight_amstron',
  name: 'Dead Knight Amstron',
  dims: D,
  build,
  footprint: 1.3,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, HT_DRAW, 2, 80, ease.out),
        ...keys([
          [HT_DRAW, 180],
          [HT_THRUST, 70, { smear: true, hit: true }],
          [HT_HOLD, 230],
        ]),
        ...tween(D, HT_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, RAISE, 0.5), 90],
        [RAISE, 80],
        [GP_LIFT, 240],
        [GP_OVER, 50],
        [GP_DRIVE, 80, { smear: true, hit: true }],
        [GP_HOLD, 300],
        [mid(GP_HOLD, IDLE, 0.4), 110],
        [mid(GP_HOLD, IDLE, 0.75), 100],
        [IDLE, 90],
      ]),
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, LB_GROUND, 2, 90, ease.out),
        ...keys([
          [LB_GROUND, 140],
          [LB_RAISE, 130, { event: 'cast' }],
          [LB_HOLD(0), 150],
          [LB_HOLD(1), 150, { hit: true }],
          [LB_HOLD(2), 240],
          [LB_HOLD(3), 240],
        ]),
        ...tween(D, LB_HOLD(3), IDLE, 3, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 100],
        [tweak(HURT, { x: -3, torso: 97, head: 100, p: { jaw: 6 } }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 110],
        [D_REEL, 240],
        [D_FALL(0.3), 100],
        [D_FALL(0.6), 100],
        [D_FALL(0.85), 110],
        [D_FALL(1), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RAISE, 2, 100, ease.out),
        ...keys([
          [RAISE, 240],
          [tweak(RAISE, { y: 0, p: { jaw: 24, tassel: 0.8 } }), 240],
          [RAISE, 280],
          [mid(RAISE, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Skill icons
// ---------------------------------------------------------------------------

const BG = MAT.charcoal;

export const deadKnightAmstron: ChampionArt = {
  char,
  iconBg: BG,
  icons: {
    hobbling_thrust: () =>
      compose(BG, glyph((d) => {
        // the spear driven forward
        const f = d.frame(v(-14, 18), 8);
        d.capsule({ mat: WD, z: 10, group: 'ishaft' }, f(0, 0), f(BLADE, 0), 1.7, 1.7);
        d.capsule({ mat: RD, z: 10.1, group: 'ishaft', line: 'soft' }, f(BLADE - 4, 0), f(BLADE, 0), 2.3, 2.3);
        bladeShape(d, f, 11);
      }), (b) => {
        // the Slow it leaves: two chevrons, low in the corner
        for (const cy of [29, 34]) for (let k = -3; k <= 3; k++) b.set(9 + k, cy - Math.abs(k), Math.abs(k) < 2 ? E.iceGlint : E.ice);
      }),
    grave_pierce: () =>
      compose(BG, glyph((d) => {
        // the spear driven straight down into the ground, cracks running from it
        const f = d.frame(v(21, 54), -90);
        d.capsule({ mat: WD, z: 10, group: 'ishaft' }, f(0, 0), f(BLADE, 0), 1.7, 1.7);
        d.capsule({ mat: RD, z: 10.1, group: 'ishaft', line: 'soft' }, f(BLADE - 4, 0), f(BLADE, 0), 2.3, 2.3);
        bladeShape(d, f, 11);
      }), (b) => {
        for (const [x0, y0, x1, y1] of [[21, 36, 6, 30], [21, 36, 35, 30], [21, 36, 12, 37], [21, 36, 31, 37]]) {
          const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
          for (let k = 0; k <= n; k++) b.set(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), E.red);
        }
      }),
    last_bastion: () =>
      compose(BG, glyph((d) => {
        shieldAt(d, v(20, 23), 90, 10, 0, 0.68);
      })),
    unbreached_plate: () =>
      compose(BG, glyph((d) => {
        // a breastplate, whole, a bright ring round it
        d.poly({ mat: PL, z: 10, group: 'iplate' }, [v(10, 34), v(30, 34), v(33, 22), v(28, 7), v(12, 7), v(7, 22)], { kind: 'cyl', a: v(20, 7), b: v(20, 34), r: 15, bevel: 1.8 });
        d.line({ mat: RD, z: 10.1, group: 'iplate', line: 'none' }, v(20, 32), v(20, 8), RD.ramp[5]);
        d.ribbon({ mat: RD, z: 10.1, group: 'iplate', line: 'none' }, [v(10, 33), v(20, 30), v(30, 33)], [0.9, 0.9, 0.9]);
      })),
  },
};
