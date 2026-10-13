// The Wild Speaker (docs/DESIGN_DECISIONS.md section 20, Jakub's brief of
// 2026-10-13): a Common of the Court of Root, a humanoid with tribal tattoos
// and a long stick with two green ribbons at its head, bare legs and arms, his
// torso covered in leather. So he is a lean man of one of the Court's
// semi-wild tribes: barefoot, a sleeveless tunic of dark leather laced at the
// chest, a short fringed skirt and flap of the same leather over the hips,
// bands and chevrons of dark ink on his arms and legs and two strokes on his
// cheek, loose dark hair; the stick taller than he is, planted at his side
// (the silhouette feature), the two ribbons tied under its knob and stirring
// as it moves. What the brief leaves open is a first take: the ink's colour
// and patterns, the tunic's cut, his hair and face, the stick's knob and the
// ribbons' length. His affinity sets nothing here (affinities are abstract,
// Jakub, 2026-10-11): his blows leave a plain grey-white streak, and in
// fx/court_of_root.ts a dull flash and dust.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { leg, smear, torsoPts } from '../parts.ts';
import { add, angleOf, at, Dims, Draw, ease, ik2, lerpPose, lerpV, mul, pose, Pose, Skel, sub, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 33,
  thigh: 15.6,
  shin: 15,
  ankleH: 3,
  footLen: 6.2,
  spine: 20,
  neck: 6.6,
  upperArm: 12,
  foreArm: 11,
  shoulderDrop: 4.6,
  shoulderN: -2.8,
  shoulderF: 3.3,
  hipN: -1.8,
  hipF: 1.8,
};

const SK = MAT.skinTan, DL = MAT.darkleather, LE = MAT.leather, WD = MAT.wood, GR = MAT.green, HR = MAT.hairDark, IR = MAT.iron;
const TAT: RGBA = INK.tattoo;

/** The streak of a blow: plain grey-white, the colour of motion, not of an affinity. */
const SWING = { core: ACCENT.white, edge: IR.ramp[4] };

/** The long stick: its whole length, and where the near hand holds it from the foot when it is swung or carried. */
const STICK = 72, GRIP = 30;

/** Where the stick runs: its foot, its head, and its direction from the foot to the head. */
interface Stick {
  foot: V;
  head: V;
  ang: number;
}

/**
 * Planted (`free` 0: its foot fixed on the ground at `plant`, the near hand
 * sliding on it) or swung (`free` 1: `headAng` from the hand toward its head,
 * held `grip` from its foot); between the two, blended.
 */
function stickAt(s: Skel, P: Record<string, number>): Stick {
  const free = Math.max(0, Math.min(1, P.free ?? 0));
  const swung = () => {
    const a = P.headAng ?? 90, g = P.grip ?? GRIP;
    return { foot: at(s.hN, a, -g), head: at(s.hN, a, STICK - g) };
  };
  const planted = () => {
    const foot = v(P.plant ?? 14, 0.6);
    return { foot, head: at(foot, angleOf(sub(s.hN, foot)), STICK) };
  };
  const st = free >= 1 || P.plant === undefined ? swung() : free <= 0 ? planted() : (() => {
    const a = planted(), b = swung();
    return { foot: lerpV(a.foot, b.foot, free), head: lerpV(a.head, b.head, free) };
  })();
  return { ...st, ang: angleOf(sub(st.head, st.foot)) };
}

/**
 * The far arm. With `twoK` up it reaches for the stick, `two` px from the near
 * hand toward the head (negative: toward the foot), solved here so the hand
 * stays on the shaft through every blend; at 0 it follows the pose.
 */
function farArm(s: Skel, st: Stick, P: Record<string, number>): { e: V; h: V; lo: number; on: boolean } {
  const k = Math.max(0, Math.min(1, P.twoK ?? 0));
  if (k < 0.01) return { e: s.eF, h: s.hF, lo: s.loF, on: false };
  const grip = at(s.hN, st.ang, P.two ?? 8);
  const r = ik2(s.sF, lerpV(s.hF, grip, k), D.upperArm, D.foreArm, P.bendF ?? -1);
  return { e: r.mid, h: r.end, lo: r.a2, on: k >= 0.5 };
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const st = stickAt(s, P);
  const far = farArm(s, st, P);
  const prev = info.prev ? stickAt(info.prev, info.prev.pose.p) : undefined;

  // the streak of the blow behind the body: an arc for a swing, a straight streak for a thrust
  if (info.def.smear && prev && info.prev) {
    const a0 = angleOf(sub(prev.head, info.prev.hN)), a1 = angleOf(sub(st.head, s.hN));
    const turn = Math.abs(((a1 - a0 + 540) % 360) - 180);
    if (P.sweep !== undefined || turn >= 25) smear(d, s.hN, P.sweep ?? a1 - (((a1 - a0 + 540) % 360) - 180), a1, STICK - (P.grip ?? GRIP) + 2, 10, SWING, 3);
    else streak(d, prev.head, st.head, st.ang, 54);
  }

  // far leg, the far piece of the skirt
  leg(d, s, 'F', legCfg(10, -1));
  legInk(d, s, 'F', 10.5);
  skirt(d, s, 'F', 11, -1);

  // far arm behind the body; with both hands on the stick only its hand comes round the shaft
  bareArm(d, s.sF, far.e, far.h, 20, 'armF', -1, !far.on, far.lo);

  // torso: a sleeveless tunic of dark leather, laced at the chest, a cord belt
  const torso = torsoPts(s, [
    [0, 5.4, 5.6],
    [4, 5.5, 5.9],
    [9, 5.9, 6.5],
    [14, 6.3, 7.0],
    [17.2, 6.4, 6.6],
    [19, 5.1, 4.4],
    [20.4, 3.0, 2.5],
  ]);
  d.poly({ mat: DL, z: 30, group: 'tunic', tex: (h) => (Math.sin(h.v * 6 + 0.5) > 0.86 ? -1 : 0) }, torso, { kind: 'cyl', a: s.T(0, 1), b: s.T(20.4, 1), r: 7.2, bevel: 1.2 });
  laces(d, s, 30.3);
  // the tunic's shoulder over the far arm's root
  d.ellipse({ mat: DL, z: 30.2, group: 'tunic', shade: -1 }, s.T(17.4, 3.0), 3.0, 2.2, s.torso + 90);
  belt(d, s, 32);
  flap(d, s, 35);

  head(d, s, P);

  // near leg and its piece of the skirt
  leg(d, s, 'N', legCfg(50, 0));
  legInk(d, s, 'N', 50.5);
  skirt(d, s, 'N', 52, 0);

  // the ribbons, the stick, the far hand round it, the near arm over it
  ribbons(d, st, prev, P, 55.4);
  stick(d, st, 56);
  if (far.on) d.ellipse({ mat: SK, z: 57, group: 'handF', shade: -1 }, far.h, 2.2, 1.9, far.lo);
  bareArm(d, s.sN, s.eN, s.hN, 60, 'armN', 0, true, s.loN);
  // the tunic's edge over the near shoulder
  d.ellipse({ mat: DL, z: 62, group: 'tunicN', line: 'soft' }, at(s.T(17.6, -2.4), s.upN, 0.6), 3.2, 2.2, s.upN + 90, 0.2);
}

const legCfg = (z: number, shade: number) => ({
  thigh: SK, shin: SK, foot: SK, rThigh: [3.4, 2.8] as [number, number], rShin: [2.6, 2.0] as [number, number], z, shade, footStyle: 'bare' as const,
});

/** A bare arm: the upper arm and forearm in skin, rings and chevrons of ink, the hand. */
function bareArm(d: Draw, sh: V, el: V, ha: V, z: number, group: string, shade: number, hand: boolean, lo: number) {
  d.capsule({ mat: SK, z, group, shade }, sh, el, 2.9, 2.5);
  d.capsule({ mat: SK, z: z + 0.1, group, shade }, el, ha, 2.4, 2.0);
  // an armband of ink round the upper arm: two rings, a zigzag between them
  ring(d, sh, el, 0.5, 1.9, z + 0.2, group);
  ring(d, sh, el, 0.86, 1.7, z + 0.2, group);
  zigzag(d, sh, el, 0.6, 0.76, 1.8, z + 0.2, group);
  // two chevrons down the forearm toward the hand, a ring at the wrist
  chevron(d, el, ha, 0.24, 1.6, 1.6, z + 0.2, group);
  chevron(d, el, ha, 0.5, 1.6, 1.5, z + 0.2, group);
  ring(d, el, ha, 0.8, 1.4, z + 0.2, group);
  if (hand) d.ellipse({ mat: SK, z: z + 0.3, group, shade }, ha, 2.2, 1.9, lo);
}

/** Ink on a leg: a band of rings and dots on the thigh under the skirt, chevrons down the shin, a ring at the ankle. */
function legInk(d: Draw, s: Skel, side: 'N' | 'F', z: number) {
  const g = 'leg' + side;
  const hip = side === 'N' ? s.hipN : s.hipF, kn = side === 'N' ? s.kneeN : s.kneeF, an = side === 'N' ? s.ankN : s.ankF;
  ring(d, hip, kn, 0.66, 2.4, z, g);
  dots(d, hip, kn, 0.79, 2.0, z, g);
  chevron(d, kn, an, 0.22, 1.8, 1.8, z + 0.1, g);
  chevron(d, kn, an, 0.46, 1.8, 1.7, z + 0.1, g);
  ring(d, kn, an, 0.84, 1.6, z + 0.1, g);
}

const inkOpts = (z: number, group: string) => ({ mat: SK, z, group, line: 'none' as const, outline: false, noClean: true });

/** A ring of ink across a limb from `a` to `b`, `t` of the way along, `r` px each side of its axis. */
function ring(d: Draw, a: V, b: V, t: number, r: number, z: number, group: string) {
  const ang = angleOf(sub(b, a)), c = lerpV(a, b, t);
  d.line(inkOpts(z, group), at(c, ang + 90, r), at(c, ang - 90, r), TAT);
}

/** A zigzag of ink across a limb between `t0` and `t1` of the way along. */
function zigzag(d: Draw, a: V, b: V, t0: number, t1: number, r: number, z: number, group: string) {
  const ang = angleOf(sub(b, a));
  const pts: { p: V; c: RGBA }[] = [];
  for (let k = 0; k <= 4; k++) {
    const w = -r + (2 * r * k) / 4;
    pts.push({ p: at(lerpV(a, b, k % 2 ? t1 : t0), ang + 90, w), c: TAT });
  }
  for (let k = 0; k < 4; k++) d.line(inkOpts(z, group), pts[k].p, pts[k + 1].p, TAT);
}

/** A chevron of ink pointing along the limb toward `b`. */
function chevron(d: Draw, a: V, b: V, t: number, depth: number, r: number, z: number, group: string) {
  const ang = angleOf(sub(b, a)), c = lerpV(a, b, t), tip = at(c, ang, depth);
  d.line(inkOpts(z, group), at(c, ang + 90, r), tip, TAT);
  d.line(inkOpts(z, group), tip, at(c, ang - 90, r), TAT);
}

/** A row of three dots of ink across a limb. */
function dots(d: Draw, a: V, b: V, t: number, r: number, z: number, group: string) {
  const ang = angleOf(sub(b, a)), c = lerpV(a, b, t);
  d.pixels(inkOpts(z, group), [-r, 0, r].map((w) => ({ p: at(c, ang + 90, w), c: TAT })));
}

/** Cross-laces of light leather cord down the front of the tunic. */
function laces(d: Draw, s: Skel, z: number) {
  d.line({ mat: DL, z, group: 'tunic', line: 'none' }, s.T(9.6, 4.6), s.T(18.2, 5.0), DL.ramp[1]);
  const pts: { p: V; c: RGBA }[] = [];
  for (const u of [11, 13.6, 16.2]) pts.push({ p: s.T(u, 4.0), c: LE.ramp[4] }, { p: s.T(u + 1.1, 5.4), c: LE.ramp[3] });
  d.pixels({ mat: DL, z: z + 0.1, group: 'tunic' }, pts);
}

/** A cord belt of light leather, knotted at the front, its two ends hanging. */
function belt(d: Draw, s: Skel, z: number) {
  d.poly({ mat: LE, z, group: 'belt' }, [s.T(2.8, -5.6), s.T(3.0, 6.0), s.T(1.6, 5.9), s.T(1.4, -5.4)], { kind: 'cyl', a: s.T(0, 0), b: s.T(2.8, 0), r: 6 });
  const knot = s.T(2.2, 4.4);
  d.circle({ mat: LE, z: z + 0.1, group: 'belt' }, knot, 1.3);
  const hang = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  d.ribbon({ mat: LE, z: z + 0.2, group: 'belt', line: 'soft' }, [knot, at(knot, hang + 8, 3.4), at(at(knot, hang + 8, 3.4), hang, 2.8)], [0.8, 0.7, 0.6]);
  d.ribbon({ mat: LE, z: z + 0.15, group: 'belt', shade: -1, line: 'soft' }, [knot, at(knot, hang - 6, 2.8), at(at(knot, hang - 6, 2.8), hang - 2, 3.0)], [0.8, 0.7, 0.6]);
}

/** A short skirt of the tunic's leather over each thigh, its hem cut into a fringe. */
function skirt(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.35;
  const a = at(hip, hang, -1.4), b = at(hip, hang, 6.4);
  const hem: V[] = [];
  for (let k = 0; k <= 6; k++) {
    const w = 4.7 - (9.4 * k) / 6;
    hem.push(at(at(b, hang + 90, w), hang, k % 2 ? 1.8 : 0));
  }
  d.poly(
    { mat: DL, z, group: 'skirt' + side, shade, tex: (h) => (Math.sin(h.v * 8 + (side === 'N' ? 0 : 1.4)) > 0.8 ? -1 : 0) },
    [at(a, hang + 90, 4.3), ...hem, at(a, hang - 90, 4.3)],
    { kind: 'cyl', a, b, r: 4.8, bevel: 1 },
  );
}

/** The flap at the front: hangs between the legs and swings with them. */
function flap(d: Draw, s: Skel, z: number) {
  const ang = Math.max(-116, Math.min(-64, (s.thN + s.thF) / 2));
  const f0 = s.T(1.6, -1.6), f1 = s.T(1.6, 5.4);
  const f2 = at(f1, ang + 5, 10.5), f3 = at(f0, ang - 3, 9.8);
  d.poly({ mat: DL, z, group: 'flap', tex: (h) => (Math.sin(h.v * 9) > 0.78 ? -1 : 0) }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 4.2, bevel: 1 });
  d.ribbon({ mat: LE, z: z + 0.05, group: 'flap', shade: -1, line: 'none' }, [lerpV(f3, f2, 0.1), lerpV(f3, f2, 0.9)], [0.6, 0.6]);
}

/** The long stick: a staff of plain wood, a gnarled knob at its head, the ribbons' wrap under it. */
function stick(d: Draw, st: Stick, z: number) {
  d.capsule({ mat: WD, z, group: 'stick', tex: (h) => (Math.sin(h.u * 41) > 0.84 ? -1 : 0) }, st.foot, st.head, 1.1, 1.2);
  d.ellipse({ mat: WD, z: z + 0.05, group: 'stick' }, at(st.head, st.ang, -0.4), 2.3, 1.9, st.ang);
  d.pixels({ mat: WD, z: z + 0.06, group: 'stick' }, [{ p: at(at(st.head, st.ang, 0.4), st.ang + 90, -0.8), c: WD.ramp[1] }]);
  // the wrap the ribbons are tied with
  const tie = at(st.head, st.ang, -4.4);
  d.capsule({ mat: GR, z: z + 0.1, group: 'stickwrap', line: 'soft' }, at(tie, st.ang, -0.8), at(tie, st.ang, 0.8), 1.7, 1.7);
}

/**
 * The two green ribbons tied under the knob: they hang, stir with the idle
 * (`wave`), lean back in the wind of a run (`wind`) and trail behind the
 * head of the stick when it moves (its travel since the last frame).
 */
function ribbons(d: Draw, st: Stick, prev: Stick | undefined, P: Record<string, number>, z: number) {
  const tie = at(st.head, st.ang, -4.4);
  const travel = prev ? sub(st.head, prev.head) : v(0, 0);
  const wave = P.wave ?? 0, wind = P.wind ?? -0.4;
  const pull = add(add(v(0, -1), v(-wind, 0)), mul(travel, -0.12));
  const base = angleOf(pull);
  const ribbonsDef: [len: number, phase: number, spread: number][] = [[16, 0, 16], [12, 2.2, -18]];
  ribbonsDef.forEach(([len, ph, spread], i) => {
    const n = 5;
    const pts: V[] = [at(tie, st.ang + 90, i ? -0.8 : 0.8)];
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      const a = base + spread * f + Math.sin(wave + ph + f * 2.4) * 12 * f;
      pts.push(at(pts[k - 1], a, len / n));
    }
    d.ribbon({ mat: GR, z: z - i * 0.05, group: 'ribbon' + i, shade: -i, line: 'strong', tex: (h) => (Math.sin(h.u * 9 + ph) > 0.7 ? -1 : 0) }, pts, [1.0, 1.0, 0.95, 0.9, 0.8, 0.7], 0.4);
  });
}

/** The line of a thrust: two streaks running back from the head of the stick, above and below the shaft. */
function streak(d: Draw, from: V, to: V, ang: number, z: number) {
  const o = { mat: IR, z, outline: false, line: 'none' as const, noClean: true };
  const back = Math.max(10, Math.hypot(to.x - from.x, to.y - from.y) * 1.2);
  for (const [w, k] of [[3.6, 1], [-3.4, 0.75]] as const) {
    const a = at(at(to, ang + 90, w), ang, -2), b = at(a, ang, -back * k);
    d.ribbon({ ...o, group: 'streak', color: SWING.edge }, [b, a], [0.3, 1.1]);
    d.line({ ...o, z: z + 0.01, group: 'streak' }, lerpV(a, b, 0.5), a, SWING.core);
  }
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.8, 2.6);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.call ? 'angry' : 'calm', mouth: P.call ? 'shout' : 'line', lip: SK.ramp[1], rx: 5.9, ry: 6.5 });
  // two strokes of ink down the cheek
  const o = inkOpts(38.4, 'head');
  d.line(o, H(2.2, -1.6), H(1.9, -2.8), TAT);
  d.line(o, H(3.5, -2.0), H(3.2, -3.2), TAT);
  // loose dark hair, a fringe over the brow, falling to the nape in uneven locks
  d.poly(
    { mat: HR, z: 38.8, group: 'hair', line: 'soft', tex: (h, x, y) => ((x * 3 + y) % 5 === 0 ? -1 : 0) },
    [H(5.4, 4.4), H(4.4, 6.6), H(2.6, 8.9), H(1.0, 8.0), H(-1.2, 9.6), H(-3.0, 8.2), H(-5.4, 9.0), H(-6.6, 6.0), H(-8.4, 4.6), H(-8.2, 1.0), H(-9.4, -2.6), H(-8.2, -5.0), H(-8.8, -9.0), H(-6.6, -8.0), H(-5.6, -10.6), H(-4.4, -7.0), H(-3.4, -9.6), H(-2.6, -5.6), H(-1.6, -1.8), H(-0.2, 2.2), H(1.8, 3.4), H(3.4, 2.6), H(4.2, 3.8)],
    { kind: 'dome', c: H(-1.6, 2.6), r: 9.6, bevel: 1.2 },
  );
  // a lock falling past the ear
  d.ribbon({ mat: HR, z: 38.9, group: 'hair', line: 'soft' }, [H(-0.4, 2.4), H(-1.0, -1.8), H(-1.8 + (P.hair ?? 0), -5.4)], [0.9, 0.8, 0.6]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the stick's `headAng` runs from the near hand to its head: 0 forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 84,
  head: 86,
  legN: { ik: v(-7, 3) },
  legF: { ik: v(8, 3) },
  armN: { up: -48, lo: 30 },
  armF: { up: -98, lo: -84 },
  p: { plant: 15, free: 0, headAng: 88, grip: 44, two: 8, twoK: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 84 - b,
    armN: { up: -48 + b * 2, lo: 30 + b },
    armF: { up: -98 + b * 2, lo: -84 + b * 2 },
    p: { wave: a },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11.5 * Math.cos(ph), y: 3 + (sn > 0 ? 7 * sn : 0), ang: sn > 0 ? -26 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 2,
    torso: 72,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -66 + sw * 10, lo: -4 + sw * 10 },
    armF: { up: -84 - sw * 28, lo: -50 - sw * 28 },
    p: { free: 1, grip: 30, headAng: 52 + sw * 4, wind: 1.6, wave: a },
  });
}

// Staff Blow: both hands on the stick, drawn back, then a thrust of its head into the enemy.
const SB_WIND = pose({
  x: -3, y: -1, torso: 94, head: 90,
  legN: { ik: v(-10, 3) }, legF: { ik: v(8, 3) },
  armN: { ik: v(-5, 40) }, armF: { up: -70, lo: -10 },
  p: { free: 1, grip: 38, headAng: 4, two: 9, twoK: 1 },
});
const SB_HIT = pose({
  x: 7, y: -3, torso: 72, head: 80,
  legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) },
  armN: { ik: v(14, 41) }, armF: { up: -40, lo: 0 },
  p: { free: 1, grip: 38, headAng: -3, two: 9, twoK: 1, call: 1 },
});
const SB_FOLLOW = tweak(SB_HIT, { x: 8, torso: 70, armN: { ik: v(16, 40) }, p: { headAng: -5, call: 0 } });

// Quell: the stick swung up over his head in both hands and brought down on the enemy.
const QL_RAISE = pose({
  x: -2, y: 0, torso: 96, head: 98,
  legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) },
  armN: { ik: v(-12, 67), bend: 1 }, armF: { up: 80, lo: 100 },
  p: { free: 1, grip: 36, headAng: 160, two: -8, twoK: 1 },
});
const QL_TOP = pose({
  x: 1, y: -1, torso: 86, head: 90,
  legN: { ik: v(-10, 3) }, legF: { ik: v(11, 3) },
  armN: { ik: v(6, 64) }, armF: { up: 60, lo: 80 },
  p: { free: 1, grip: 36, headAng: 72, two: -8, twoK: 1 },
});
const QL_HIT = pose({
  x: 6, y: -4, torso: 70, head: 76,
  legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) },
  armN: { ik: v(12, 52) }, armF: { up: 10, lo: 20 },
  p: { free: 1, grip: 36, headAng: -36, two: -8, twoK: 1, call: 1, sweep: 125 },
});
const QL_FOLLOW = tweak(QL_HIT, { x: 7, torso: 68, armN: { ik: v(14, 46) }, p: { headAng: -56, call: 0 } });

const HURT = pose({
  x: -4, y: -1, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -100, lo: -10 }, armF: { up: -60, lo: 12 },
  p: { free: 1, grip: 34, headAng: 104, twoK: 0 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -13, torso: 76, head: 60,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -84, lo: -70 }, armF: { up: -80, lo: -66 },
  p: { free: 1, grip: 30, headAng: 120 },
});
const DEATH_FALL = pose({
  x: 2, y: -20, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { free: 1, grip: 30, headAng: 60 },
});
const DEATH_DOWN = pose({
  x: 6, y: -26, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { free: 1, grip: 30, headAng: 4 },
});

// Victory: the stick lifted high in the near hand, its ribbons stirring, a call to the wild.
const CALL = pose({
  y: -1, torso: 88, head: 100,
  legN: { ik: v(-7, 3) }, legF: { ik: v(8, 3) },
  armN: { ik: v(-8, 70) }, armF: { up: -96, lo: -78 },
  p: { free: 1, grip: 30, headAng: 86, twoK: 0, call: 1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const waved = (p: Pose, w: number) => tweak(p, { p: { wave: w } });

const char: CharDef = {
  id: 'wild_speaker',
  name: 'Wild Speaker',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 180, idle) },
    run: { loop: true, frames: cycle(8, 75, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SB_WIND, 2, 80),
        ...keys([
          [SB_WIND, 170],
          [mid(SB_WIND, SB_HIT, 0.5), 50],
          [SB_HIT, 70, { smear: true, hit: true }],
          [SB_FOLLOW, 200],
        ]),
        ...tween(D, SB_FOLLOW, IDLE, 3, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, QL_RAISE, 2, 100, ease.out),
        ...keys([
          [QL_RAISE, 220],
          [waved(QL_RAISE, 1.2), 120],
          [QL_TOP, 50],
          [QL_HIT, 70, { smear: true, hit: true }],
          [QL_FOLLOW, 240],
        ]),
        ...tween(D, QL_FOLLOW, IDLE, 3, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 96, head: 100 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 240],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -27 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CALL, 2, 110, ease.out),
        ...keys([
          [waved(CALL, 0.8), 220],
          [waved(CALL, 1.6), 220],
          [waved(CALL, 2.4), 220],
          [waved(tweak(CALL, { p: { call: 0 } }), 3.2), 260],
          [mid(CALL, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** The long stick in an icon: thicker for 40x40, its knob, the wrap and the two ribbons streaming from it. */
function iconStick(d: Draw, foot: V, head: V, z: number, flow: number) {
  const ang = angleOf(sub(head, foot));
  d.capsule({ mat: WD, z, group: 'istick', tex: (h) => (Math.sin(h.u * 28) > 0.86 ? -1 : 0) }, foot, head, 1.7, 1.9);
  d.ellipse({ mat: WD, z: z + 0.05, group: 'istick' }, head, 3.2, 2.7, ang);
  const tie = at(head, ang, -5.5);
  d.capsule({ mat: GR, z: z + 0.1, group: 'iwrap' }, at(tie, ang, -1.2), at(tie, ang, 1.2), 2.4, 2.4);
  [[13, 0, 1], [10, 1.6, -1]].forEach(([len, ph, side], i) => {
    const pts: V[] = [at(tie, ang + 90, side * 1.2)];
    for (let k = 1; k <= 4; k++) pts.push(at(pts[k - 1], flow + side * 10 * (k / 4) + Math.sin(ph + k) * 10, len / 4));
    d.ribbon({ mat: GR, z: z - 0.1 - i * 0.01, group: 'iribbon' + i }, pts, [1.6, 1.5, 1.4, 1.2, 1.0], 0.4);
  });
}

const E = ACCENT;

export const wildSpeaker: ChampionArt = {
  char,
  iconBg: MAT.teal,
  icons: {
    staff_blow: () =>
      compose(MAT.teal, glyph((d) => {
        // the stick thrust from the lower left, its head driven home at the upper right, the ribbons streaming back
        iconStick(d, v(5, 9), v(29, 29), 10, 262);
      }), (b) => {
        // the line of the thrust, and the blow where the head lands (screen space, y down)
        for (const [x, y] of [[9, 25], [11, 23], [13, 21], [6, 30], [8, 28]] as const) b.set(x, y, E.white);
        impactStar(b, 33, 8, 2, 8, 9, FXR.dust[3], E.white);
      }),
    quell: () =>
      compose(MAT.teal, glyph((d) => {
        // the stick brought down from over the head: the arc of the swing, the head at the bottom right
        smear(d, v(8, 12), 150, -30, 28, 6, SWING, 1);
        iconStick(d, v(6, 15), v(32, 7), 10, 120);
      }), (b) => {
        impactStar(b, 33, 33, 2, 8, 9, FXR.dust[3], E.white);
      }),
  },
};

