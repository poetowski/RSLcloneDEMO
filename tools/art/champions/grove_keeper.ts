// The Grove Keeper (docs/DESIGN_DECISIONS.md section 27, Jakub's proposal of
// 2026-10-17): an Elite of the Court of Root, Support: an old man with antlers
// in a druidic ornamental robe, with a druidic staff and long grey hair. So he
// is an old keeper of the groves, tall and a little stooped: two branching
// antlers growing from his brow (the silhouette feature, with the staff); long
// grey hair down his back and a long grey beard to his chest, bushy brows over
// deep-set eyes; a long robe of moss green worked with bands of old gold, a
// knotwork border at its hem, a band down its front and gold at the cuffs of
// its wide sleeves; a cord at his waist hung with a disc of carved bone and a
// feather; a staff of gnarled wood taller than he is, ivy twining up it, its
// head a knot of roots holding a seed of pale green light, a few leaves
// sprouting there. What the brief leaves open is a first take: his face, the
// antlers' tines, the robe's colours and ornament, the charms and the staff's
// head. His affinity sets nothing here (affinities are abstract, Jakub,
// 2026-10-11): his thorns are the grove's own wood, his rite and his balm its
// green light and leaves (fx/court_of_root.ts).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { Hit } from '../render.ts';
import { foldTex, robe, RobeCfg, torsoPts, upRobe } from '../parts.ts';
import { angleOf, at, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, sub, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 34,
  thigh: 16,
  shin: 15.6,
  ankleH: 3,
  footLen: 6.4,
  spine: 21,
  neck: 6.4,
  upperArm: 13,
  foreArm: 12,
  shoulderDrop: 4.6,
  shoulderN: -2.8,
  shoulderF: 3.4,
  hipN: -1.6,
  hipF: 1.6,
};

const SK = MAT.skinLight, RB = MAT.moss, OG = MAT.oldGold, HR = MAT.hairSilver, AN = MAT.bark, BN = MAT.bone, WD = MAT.wood, LE = MAT.leather, GN = MAT.green, GL = MAT.glowGreen;

/** The staff: its length to the knot of roots at its head, and where the near hand holds it from the foot when he lifts or swings it. */
const STAFF = 70, GRIP = 40;

interface Staff {
  foot: V;
  head: V;
  ang: number;
}

/**
 * Planted (`free` 0: its foot on the ground at `plant`, the near hand on the
 * shaft) or held (`free` 1: `headAng` from the hand toward its head, held
 * `grip` from its foot); between the two, blended.
 */
function staffAt(s: Skel, P: Record<string, number>): Staff {
  const free = Math.max(0, Math.min(1, P.free ?? 0));
  const held = () => {
    const a = P.headAng ?? 90, g = P.grip ?? GRIP;
    return { foot: at(s.hN, a, -g), head: at(s.hN, a, STAFF - g) };
  };
  const planted = () => {
    const foot = v(P.plant ?? 16, 0.6);
    return { foot, head: at(foot, angleOf(sub(s.hN, foot)), STAFF) };
  };
  const st = free >= 1 || P.plant === undefined ? held() : free <= 0 ? planted() : (() => {
    const a = planted(), b = held();
    return { foot: lerpV(a.foot, b.foot, free), head: lerpV(a.head, b.head, free) };
  })();
  return { ...st, ang: angleOf(sub(st.head, st.foot)) };
}

/** The far arm: with `twoK` up its hand goes to the staff, `two` px from the near hand (negative: toward the foot), solved so it stays on the shaft. */
function farArm(s: Skel, st: Staff, P: Record<string, number>): { e: V; h: V; lo: number; on: boolean } {
  const k = Math.max(0, Math.min(1, P.twoK ?? 0));
  if (k < 0.01) return { e: s.eF, h: s.hF, lo: s.loF, on: false };
  const grip = at(s.hN, st.ang, P.two ?? -9);
  const r = ik2(s.sF, lerpV(s.hF, grip, k), D.upperArm, D.foreArm, P.bendF ?? -1);
  return { e: r.mid, h: r.end, lo: r.a2, on: k >= 0.5 };
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const st = staffAt(s, P);
  const far = farArm(s, st, P);
  const wave = P.wave ?? 0;

  // his long grey hair down his back, the far antler behind the head
  hairBack(d, s, P.hair ?? 0, 3);
  antler(d, s, 'F', P, 4);

  // bare feet under the hem, the far arm behind the robe
  feet(d, s, 11);
  sleeveArm(d, s.sF, far.e, far.h, far.lo, 14, -1, 'armF', !far.on);

  // the robe from the waist down with its knotwork border and its front band, the bodice, the cord and its charms
  skirt(d, s, wave, 15);
  bodice(d, s, 30);
  cord(d, s, info, 33);

  head(d, s, P);
  antler(d, s, 'N', P, 41);

  // the staff, the far hand round it, the near arm over it
  staff(d, st, P, 55);
  if (far.on) d.ellipse({ mat: SK, z: 57, group: 'handF', shade: -1 }, far.h, 2.3, 1.9, far.lo);
  sleeveArm(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN', true);
}

/** Knotwork of old gold: a band of linked loops, lit and shaded in turn along it (texture coordinates of the band). */
const knotwork = (len: number) => (h: Hit) => {
  const x = Math.floor(h.u * len);
  const across = h.v > 0.25 ? 1 : h.v < -0.25 ? -1 : 0;
  const k = x % 4;
  return across === 0 ? (k === 0 ? -1 : k === 2 ? 1 : 0) : (k === 1 || k === 3) === (across > 0) ? 1 : -1;
};

const ROBE: RobeCfg = { waist: [1.6, 5.6, 6.2], hemDrop: 1.6, hemFloor: 1.2, hemBack: [8.4, 6.6], hemFront: [5.6, 4.6], midBack: [4.4, 3.0], midFront: [3.6, 2.0], ripple: 0.8 };

/** The robe from the waist to the ground, moss green: a border of gold knotwork at its hem, a band of gold down its front. */
function skirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: RB, z, group: 'robe', tex: foldTex(9, wave * 0.5, 0.6) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  const border = upRobe(r, r.hem, 1.6);
  d.ribbon({ mat: OG, z: z + 0.2, group: 'robe', line: 'none', tex: knotwork(24) }, border, border.map(() => 1.3));
  const top = lerpV(r.waistB, r.waistF, 0.82);
  const bot = upRobe(r, [r.hem[1]], 2.4)[0];
  d.ribbon({ mat: OG, z: z + 0.15, group: 'robe', line: 'none', tex: knotwork(18) }, [top, lerpV(top, bot, 0.5), bot], [1.0, 1.1, 1.2]);
}

/** The bodice, moss green, the gold band running up its front to a collar of gold. */
function bodice(d: Draw, s: Skel, z: number) {
  const torso = torsoPts(s, [
    [0, 5.4, 5.8],
    [4, 5.4, 6.0],
    [9, 5.8, 6.8],
    [14, 6.2, 7.2],
    [17.4, 6.2, 6.4],
    [19.6, 4.8, 4.2],
    [21.2, 2.8, 2.4],
  ]);
  d.poly({ mat: RB, z, group: 'body', tex: foldTex(6, 0.4, 0.8) }, torso, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(21, 0.6), r: 7, bevel: 1.3 });
  d.ribbon({ mat: OG, z: z + 0.2, group: 'body', line: 'none', tex: knotwork(14) }, [s.T(1.6, 4.6), s.T(9, 5.6), s.T(16, 5.4)], [1.0, 1.0, 0.9]);
  d.ribbon({ mat: OG, z: z + 0.25, group: 'collar', line: 'none' }, [s.T(20.6, -3.4), s.T(21.6, 0), s.T(20.8, 3.4)], [0.8, 0.8, 0.8]);
}

/**
 * The cord at his waist, knotted at the front, and the charms hanging from it:
 * a disc of carved bone and a feather, swinging a little with his moves.
 */
function cord(d: Draw, s: Skel, info: BuildInfo, z: number) {
  d.poly({ mat: LE, z, group: 'cord' }, [s.T(2.6, -5.8), s.T(2.8, 6.4), s.T(1.6, 6.3), s.T(1.4, -5.6)], { kind: 'cyl', a: s.T(0, 0), b: s.T(2.8, 0), r: 6.2 });
  const top = s.T(1.8, 5.4);
  const before = info.prev ? info.prev.T(1.8, 5.4) : top;
  const swing = Math.max(-40, Math.min(40, -(top.x - before.x) * 6));
  const down = s.torso < 55 ? s.torso - 160 : -90 + swing;
  d.circle({ mat: LE, z: z + 0.1, group: 'cord' }, top, 1.1);
  // the bone disc on its thong, a spiral cut in it
  const disc = at(top, down + 8, 5.2);
  d.line({ mat: LE, z: z + 0.05, group: 'thong', line: 'none' }, top, disc, LE.ramp[2]);
  d.circle({ mat: BN, z: z + 0.2, group: 'disc' }, disc, 1.8);
  d.pixels({ mat: BN, z: z + 0.25, group: 'disc' }, [{ p: disc, c: BN.ramp[2] }, { p: at(disc, 0, 1), c: BN.ramp[2] }]);
  // the feather, its quill tied to the cord
  const fq = at(top, down - 14, 1.2);
  const ft = at(fq, down - 6, 7.2);
  d.ribbon({ mat: BN, z: z + 0.15, group: 'feather', line: 'soft' }, [fq, lerpV(fq, ft, 0.5), ft], [0.6, 1.1, 0.4]);
  d.line({ mat: BN, z: z + 0.16, group: 'feather', line: 'none' }, fq, ft, BN.ramp[2]);
}

/** A wide sleeve of moss green to a cuff of gold, his hand. */
function sleeveArm(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string, hand: boolean) {
  d.capsule({ mat: RB, z, group, shade }, sh, el, 3.0, 2.7);
  d.capsule({ mat: RB, z: z + 0.1, group, shade }, el, at(ha, lo, -1.6), 2.7, 3.6, 0.2);
  d.capsule({ mat: OG, z: z + 0.15, group, shade, line: 'none' }, at(ha, lo, -2.6), at(ha, lo, -1.6), 3.6, 3.6, 0.3);
  if (hand) d.ellipse({ mat: SK, z: z + 0.3, group, shade }, at(ha, lo, 0.6), 2.3, 1.9, lo);
}

/** Bare feet, old and knotted, peeking under the hem. */
function feet(d: Draw, s: Skel, z: number) {
  for (const [side, shade] of [['F', -1], ['N', 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF;
    const fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: SK, z: z + (side === 'N' ? 1 : 0), group: 'foot' + side, shade }, [f(-2.2, 2.2), f(-2.9, -0.5), f(-2.5, -3), f(5.6, -3), f(6.8, -2.1), f(4.2, -0.4), f(1.6, 1.6)], { kind: 'bevel', w: 1.6 });
  }
}

/** His long grey hair falling down his back below the shoulders; `sway` swings it back. */
function hairBack(d: Draw, s: Skel, sway: number, z: number) {
  const H = s.H, T = s.T;
  d.poly(
    { mat: HR, z, group: 'hairback', shade: -2, tex: (h) => (Math.sin(h.v * 9 + 0.6) > 0.6 ? -1 : Math.sin(h.v * 9 + 2.4) > 0.85 ? 1 : 0) },
    [
      H(-0.8, 7.2), H(-6.2, 5.4), H(-8.4, 0.8),
      T(16.4 - sway * 0.3, -8.4 - sway * 0.8), T(10.6 - sway * 0.6, -8.8 - sway * 1.6), T(6.6 - sway, -8.0 - sway * 2.4), T(5.2 - sway, -7.0 - sway * 2.8),
      T(6.4 - sway * 0.8, -5.8 - sway * 2.2), T(5.6 - sway * 0.6, -5.0 - sway * 2), T(9, -5.4 - sway), T(14, -5.6), H(-4.2, -5.6), H(-1, -1),
    ],
    { kind: 'cyl', a: H(-3, 4), b: T(6, -7), r: 5, bevel: 1.2 },
  );
}

/**
 * An antler growing from his brow: a beam with three tines off it, the tips
 * pale. The near one sweeps up and back over his hair, the far one, behind his
 * head, rises and leans forward, so the two spread like a crown.
 */
function antler(d: Draw, s: Skel, side: 'N' | 'F', P: Record<string, number>, z: number) {
  const H = s.H;
  const sway = (P.hair ?? 0) * 0.25;
  const B = (x: number, y: number) => H(x - (y > 11 ? sway : 0), y);
  const g = 'antler' + side;
  const shade = side === 'F' ? -1 : 0;
  const near = side === 'N';
  const beam = near
    ? [B(-0.6, 6.4), B(-2.6, 10.2), B(-5.6, 13.6), B(-9.2, 16.0), B(-12.0, 16.4)]
    : [B(0.8, 7.0), B(1.4, 10.8), B(2.0, 14.6), B(1.4, 18.2), B(-0.4, 20.6)];
  const tines: V[][] = near
    ? [
        [B(-1.6, 8.4), B(1.0, 10.6), B(2.6, 13.0)],
        [B(-4.4, 12.4), B(-3.4, 16.4), B(-2.6, 19.2)],
        [B(-8.0, 15.4), B(-8.4, 19.0), B(-9.6, 21.2)],
      ]
    : [
        [B(1.2, 9.6), B(4.0, 11.0), B(6.2, 12.8)],
        [B(1.8, 13.6), B(4.4, 15.8), B(5.4, 18.4)],
        [B(1.6, 17.4), B(3.2, 20.6), B(3.6, 22.6)],
      ];
  d.ribbon({ mat: AN, z, group: g, shade }, beam, [1.45, 1.3, 1.15, 0.95, 0.55]);
  tines.forEach((t, i) => d.ribbon({ mat: AN, z: z + 0.01 * (i + 1), group: g, shade }, t, [0.9, 0.75, 0.4]));
  // a burr where it grows from the brow, the pale tips
  d.circle({ mat: AN, z: z + 0.04, group: g, shade }, beam[0], 1.8);
  const tips = [tines[0][2], tines[1][2], tines[2][2], beam[4]].map((p) => ({ p, c: BN.ramp[near ? 4 : 3] }));
  d.pixels({ mat: AN, z: z + 0.05, group: g }, tips);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.6, 2.4);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[4], browStyle: P.call ? 'angry' : 'flat', mouth: 'none', rx: 6.0, ry: 6.6 });
  // the lines of age at his eye and brow
  d.pixels({ mat: SK, z: 38.35, group: 'head' }, [{ p: H(4.8, -0.6), c: SK.ramp[2] }, { p: H(2.2, -1.2), c: SK.ramp[2] }, { p: H(2.8, 3.0), c: SK.ramp[2] }]);
  // bushy grey brows over the deep-set eyes
  d.ribbon({ mat: HR, z: 38.6, group: 'brow', shade: -1, line: 'none' }, [H(2.0, 2.4), H(3.6, 2.6), H(5.2, 2.0)], [0.7, 0.8, 0.6]);
  // long grey hair from a high brow back over the head, the beard to his chest and a heavy moustache
  d.poly(
    { mat: HR, z: 38.8, group: 'hair', shade: -1, line: 'soft', tex: (h, x, y) => ((x * 3 + y) % 5 === 0 ? -1 : 0) },
    [H(4.6, 4.6), H(3.0, 7.0), H(-0.6, 8.0), H(-4.6, 7.0), H(-7.4, 4.0), H(-8.2, -0.6), H(-7.6, -5.4), H(-4.8, -7.0), H(-2.8, -4.4), H(-1.6, -0.6), H(0.4, 3.2), H(2.6, 4.8)],
    { kind: 'dome', c: H(-1.6, 2.4), r: 9.4, bevel: 1.2 },
  );
  d.poly(
    { mat: HR, z: 38.7, group: 'beard', shade: -1, line: 'soft', tex: (h) => (Math.sin(h.u * 14) > 0.55 ? -1 : 0) },
    [H(-2.8, 1.8), H(-2.6, -2.4), H(0.2, -4.6), H(2.2, -6.8), H(3.4, -11.4 - (P.beard ?? 0)), H(4.4, -14.6 - (P.beard ?? 0)), H(5.6, -11.0), H(6.6, -6.6), H(7.0, -4.0), H(6.0, -2.4), H(4.4, -3.2), H(2.6, -1.8), H(1.0, 0.2), H(-0.8, 1.8)],
    { kind: 'cyl', a: H(3.6, -1.6), b: H(4.4, -13), r: 3.4, bevel: 0.8 },
  );
  // the moustache over the mouth, and a dark mouth when he calls out
  d.ribbon({ mat: HR, z: 38.75, group: 'beard', shade: -1, line: 'none' }, [H(3.2, -2.4), H(5.2, -3.0), H(6.6, -4.4)], [0.8, 0.9, 0.6]);
  if (P.call) d.pixels({ mat: SK, z: 38.76, group: 'beard' }, [{ p: H(5.2, -4.0), c: ACCENT.mouthRed }, { p: H(5.6, -4.4), c: ACCENT.mouthRed }]);
}

/**
 * The staff: a long shaft of gnarled wood, a few knots along it and ivy
 * twining up it; at its head three roots twist round a seed of pale green
 * light (`glow` brightens it), leaves sprouting from them (`stir` moves them).
 */
function staff(d: Draw, st: Staff, P: Record<string, number>, z: number) {
  const f = d.frame(st.foot, st.ang);
  const L = Math.hypot(st.head.x - st.foot.x, st.head.y - st.foot.y);
  // the shaft, crooked a little along its length
  const shaft = [f(0, 0), f(L * 0.25, 0.5), f(L * 0.5, -0.3), f(L * 0.75, 0.4), f(L, 0)];
  d.ribbon({ mat: WD, z, group: 'staff', tex: (h) => (Math.sin(h.u * 37) > 0.84 ? -1 : 0) }, shaft, [1.2, 1.2, 1.25, 1.3, 1.4]);
  for (const k of [0.36, 0.62]) d.ellipse({ mat: WD, z: z + 0.02, group: 'staff' }, f(L * k, 0.2), 1.9, 1.5, st.ang);
  // ivy twining up the upper shaft
  const ivy: { p: V; c: RGBA }[] = [];
  for (let u = L * 0.5; u < L * 0.92; u += 1.6) {
    const w = Math.sin(u * 0.55) * 1.5;
    ivy.push({ p: f(u, w), c: GN.ramp[2] });
    if (Math.round(u * 10) % 3 === 0) ivy.push({ p: f(u + 0.6, w + Math.sign(w || 1) * 1.2), c: GN.ramp[4] });
  }
  d.pixels({ mat: GN, z: z + 0.04, group: 'staff' }, ivy);
  // the seed of light held in the roots
  const glow = Math.max(0, Math.min(1, P.glow ?? 0));
  const c = f(L + 4.2, 0);
  d.circle({ mat: GL, z: z + 0.1, group: 'seed', outline: false, flat: 3 + Math.round(glow) }, c, 2.1 + glow * 0.5);
  d.pixels({ mat: GL, z: z + 0.11, group: 'seed', outline: false, line: 'none' }, [{ p: v(c.x - 0.6, c.y + 0.6), c: GL.ramp[5] }]);
  // three roots twisting up from the shaft's head round the seed
  for (const [side, bend] of [[-1, 1], [1, -1], [0, 1]] as const) {
    const pts = [f(L - 1, side * 0.6), f(L + 1.6, side * 2.6 + bend * 0.4), f(L + 4.4, side * 3.2), f(L + 7.0, side * 1.6 + bend * 0.8), f(L + 8.4, -side * 0.6)];
    d.ribbon({ mat: WD, z: z + 0.12 + (side === 0 ? -0.05 : 0), group: 'roots' + side, shade: side === 0 ? -1 : 0 }, side === 0 ? [f(L - 1, 0), f(L + 2.4, bend * 1.4), f(L + 6.2, bend * 2.2), f(L + 8.8, 0.8)] : pts, side === 0 ? [0.9, 0.8, 0.6, 0.4] : [1.0, 0.9, 0.75, 0.6, 0.4]);
  }
  // leaves sprouting from the roots, stirring
  const stir = P.stir ?? 0;
  for (const [u, w, a, k] of [[L + 6.0, 3.6, 40, 0], [L + 1.4, -3.4, -50, 1.6], [L + 8.6, -2.0, 10, 3.1]] as const) {
    const base = f(u, w);
    const ang = st.ang + a + Math.sin(stir + k) * 10;
    const tip = at(base, ang, 3.6);
    d.poly({ mat: GN, z: z + 0.15, group: 'leaf' + k, line: 'soft' }, [base, at(lerpV(base, tip, 0.5), ang + 90, 1.3), tip, at(lerpV(base, tip, 0.5), ang - 90, 1.3)], { kind: 'bevel', w: 1 });
  }
}

// ---------------------------------------------------------------------------
// Poses & animations (the staff's `headAng` runs from the near hand toward its head: 0 forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 85,
  head: 86,
  legN: { ik: v(-4, 3) },
  legF: { ik: v(6, 3) },
  armN: { up: -40, lo: 40 },
  armF: { up: -96, lo: -78 },
  p: { plant: 17, free: 0, headAng: 90, grip: GRIP, wave: 0, hair: 0, beard: 0, glow: 0, stir: 0, twoK: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b * 0.6,
    torso: 85 - b * 0.5,
    armN: { up: -40 + b, lo: 40 + b },
    armF: { up: -96 + b, lo: -78 + b },
    // the seed pulses once, the leaves and the beard stir each at their own pace
    p: { wave: a * 0.5, hair: Math.sin(a) * 0.4, beard: Math.round((1 - Math.cos(a + 1)) / 2) * 0.6, glow: (1 - Math.cos(a)) * 0.3, stir: a * 2 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.6 ? 1 : 0;
  const ft = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -8.5 * Math.cos(ph), y: 3 + (sn > 0 ? 4 * sn : 0), ang: sn > 0 ? -16 * sn : 0 };
  };
  const n = ft(a), f = ft(a + Math.PI);
  return pose({
    y: bob - 1,
    torso: 78,
    head: 84,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -40, lo: 24 },
    armF: { up: -106 + Math.cos(a) * 8, lo: -90 },
    p: { free: 1, grip: 36, headAng: 70, wave: a * 2 + 2, hair: 2.0 + Math.sin(a * 2) * 0.4, beard: 1, glow: 0, stir: a * 2, twoK: 0 },
  });
}

// Thornburst: he lifts the staff in both hands and drives its foot into the ground; the thorns burst under the enemy.
const TB_LIFT = pose({
  y: 1, torso: 92, head: 92,
  legN: { ik: v(-5, 3) }, legF: { ik: v(6, 3) },
  armN: { ik: v(6, 56) }, armF: { up: -40, lo: 20 },
  p: { free: 1, grip: 34, headAng: 96, wave: 0.6, hair: 0.4, beard: 0, glow: 0.6, stir: 1, twoK: 1, two: -10 },
});
const TB_STRIKE = pose({
  x: 2, y: -2, torso: 80, head: 82,
  legN: { ik: v(-7, 3) }, legF: { ik: v(8, 3) },
  armN: { ik: v(14, 38) }, armF: { up: -50, lo: 0 },
  p: { free: 1, grip: 38, headAng: 98, wave: 1.4, hair: 1, beard: 1.2, glow: 1, stir: 2.4, twoK: 1, two: -10, call: 1 },
});
const TB_HOLD = tweak(TB_STRIKE, { y: -2, torso: 81, p: { wave: 1.8, glow: 0.7, stir: 3, call: 0 } });

// Cleansing Rite: he raises the staff and the seed blazes, then he sweeps his open hand out toward the ally.
const CR_RAISE = pose({
  y: 1, torso: 94, head: 98,
  legN: { ik: v(-4, 3) }, legF: { ik: v(6, 3) },
  armN: { ik: v(4, 60) }, armF: { up: -60, lo: 0 },
  p: { free: 1, grip: 30, headAng: 92, wave: 1, hair: 0.4, beard: 0, glow: 1, stir: 2, twoK: 0 },
});
const CR_BLESS = pose({
  x: 1, torso: 88, head: 90,
  legN: { ik: v(-5, 3) }, legF: { ik: v(7, 3) },
  armN: { ik: v(6, 58) }, armF: { up: 6, lo: 10 },
  p: { free: 1, grip: 30, headAng: 88, wave: 1.8, hair: 0.8, beard: 0.6, glow: 1, stir: 3.4, twoK: 0 },
});

const HURT = pose({
  x: -4, torso: 98, head: 104,
  legN: { ik: v(-6, 3) }, legF: { ik: v(6, 4) },
  armN: { up: -90, lo: -20 }, armF: { up: -130, lo: -100 },
  p: { free: 1, grip: 38, headAng: 104, wave: 2, hair: -1, beard: -0.6, glow: 0.2, stir: 1, twoK: 0 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -14, torso: 74, head: 60,
  legN: { ik: v(-12, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -84, lo: -70 }, armF: { up: -80, lo: -70 },
  p: { free: 1, grip: 34, headAng: 116, wave: 1, hair: 0.4, beard: 0, glow: 0, stir: 1, twoK: 0 },
});
const DEATH_FALL = pose({
  x: 1, y: -22, torso: 30, head: 14,
  legN: { up: -150, lo: -175 }, legF: { up: -120, lo: -170 },
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { free: 1, grip: 34, headAng: 64, wave: 1.6, hair: 1, beard: 0, glow: 0, stir: 1.4, twoK: 0 },
});
const DEATH_DOWN = pose({
  x: 5, y: -28, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 },
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { free: 1, grip: 34, headAng: 6, wave: 2, hair: 1.2, beard: 0, glow: 0, stir: 1.6, twoK: 0 },
});

// Victory: the staff lifted, the seed alight, his other hand open.
const VICTORY = pose({
  y: 1, torso: 90, head: 96,
  legN: { ik: v(-4, 3) }, legF: { ik: v(6, 3) },
  armN: { ik: v(6, 62) }, armF: { up: -30, lo: 30 },
  p: { free: 1, grip: 30, headAng: 90, wave: 0.8, hair: 0.2, beard: 0, glow: 1, stir: 1, twoK: 0 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const stirred = (p: Pose, k: number) => tweak(p, { p: { stir: k } });

const char: CharDef = {
  id: 'grove_keeper',
  name: 'Grove Keeper',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 190, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TB_LIFT, 2, 100, ease.out),
        ...keys([
          [TB_LIFT, 200],
          [mid(TB_LIFT, TB_STRIKE, 0.5), 60],
          [TB_STRIKE, 80, { hit: true }],
          [TB_HOLD, 260],
        ]),
        ...tween(D, TB_HOLD, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CR_RAISE, 2, 110, ease.out),
        ...keys([
          [CR_RAISE, 180],
          [stirred(CR_RAISE, 2.8), 140],
          [mid(CR_RAISE, CR_BLESS, 0.5), 70],
          [CR_BLESS, 120, { hit: true }],
          [stirred(CR_BLESS, 4.2), 260],
        ]),
        ...tween(D, CR_BLESS, IDLE, 3, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 95, head: 100 }), 110],
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
        [tweak(DEATH_DOWN, { y: -29 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VICTORY, 2, 110, ease.out),
        ...keys([
          [stirred(VICTORY, 1.8), 180],
          [stirred(VICTORY, 2.6), 180],
          [stirred(VICTORY, 3.4), 180],
          [stirred(VICTORY, 4.2), 180],
          [mid(VICTORY, IDLE, 0.5), 120],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** The staff's head in an icon, scaled up: the gnarled shaft, the roots round the seed of light, two leaves. */
function iconStaff(d: Draw, foot: V, head: V, z: number, glow: number) {
  const ang = angleOf(sub(head, foot));
  const f = d.frame(head, ang);
  d.capsule({ mat: WD, z, group: 'istaff', tex: (h) => (Math.sin(h.u * 26) > 0.86 ? -1 : 0) }, foot, head, 1.7, 1.9);
  const c = f(6.4, 0);
  d.circle({ mat: GL, z: z + 0.1, group: 'iseed', outline: false, flat: 3 + glow }, c, 3.4);
  d.pixels({ mat: GL, z: z + 0.11, group: 'iseed', outline: false, line: 'none' }, [{ p: v(c.x - 1, c.y + 1), c: GL.ramp[5] }, { p: v(c.x - 1.6, c.y + 0.4), c: GL.ramp[5] }]);
  for (const side of [-1, 1]) d.ribbon({ mat: WD, z: z + 0.12, group: 'iroot' + side }, [f(-1, side * 0.8), f(2.6, side * 4.2), f(7, side * 5.0), f(11, side * 2.4), f(12.6, -side * 0.8)], [1.6, 1.4, 1.2, 0.9, 0.5]);
  for (const [u, w, a] of [[9, 5, 50], [3, -5, -60]] as const) {
    const base = f(u, w), tip = at(base, ang + a, 6);
    d.poly({ mat: GN, z: z + 0.15, group: 'ileaf' + u }, [base, at(lerpV(base, tip, 0.5), ang + a + 90, 2.2), tip, at(lerpV(base, tip, 0.5), ang + a - 90, 2.2)], { kind: 'bevel', w: 1.4 });
  }
}

/** A thorn in an icon: a curved spike of the grove's wood rising from the ground. */
function iconThorn(d: Draw, base: V, h: number, lean: number, z: number) {
  const pts = [base, at(base, 90 - lean * 0.5, h * 0.4), at(at(base, 90 - lean * 0.5, h * 0.4), 90 - lean, h * 0.35), at(at(at(base, 90 - lean * 0.5, h * 0.4), 90 - lean, h * 0.35), 90 - lean * 1.6, h * 0.3)];
  d.ribbon({ mat: WD, z, group: 'ithorn' + z }, pts, [2.4, 1.8, 1.1, 0.3]);
}

const E = ACCENT;

export const groveKeeper: ChampionArt = {
  char,
  iconBg: MAT.moss,
  icons: {
    thornburst: () =>
      compose(MAT.moss, glyph((d) => {
        // thorns of the grove's wood bursting up from the ground
        iconThorn(d, v(9, 4), 20, -18, 10);
        iconThorn(d, v(20, 4), 30, 6, 11);
        iconThorn(d, v(30, 4), 22, 22, 10.5);
        iconThorn(d, v(14, 4), 14, -34, 9);
        iconThorn(d, v(26, 4), 15, 30, 9.5);
      }), (b) => {
        // the sap drawn back out of the blow: green motes rising (screen space)
        const G = FXR.green;
        for (const [x, y, c] of [[6, 8, G[4]], [33, 11, G[3]], [12, 14, G[3]], [29, 6, G[4]], [20, 4, E.white], [36, 17, G[2]]] as const) b.set(x, y, c);
        for (let x = 3; x < 37; x++) b.set(x, 35, FXR.dust[(x % 3) + 1]);
      }),
    cleansing_rite: () =>
      compose(MAT.moss, glyph((d) => {
        iconStaff(d, v(6, 3), v(16, 22), 10, 2);
      }), (b) => {
        // a whirl of leaves and light lifting away, dark motes of the cleansed afflictions carried off (screen space)
        const G = FXR.green;
        for (let k = 0; k < 14; k++) {
          const a = k * 0.62, r = 4 + k * 0.85;
          const x = Math.round(27 + Math.cos(a) * r * 0.7), y = Math.round(24 - k * 1.3 + Math.sin(a) * 2);
          b.set(x, y, k % 3 === 0 ? E.white : G[3 + (k % 2)]);
        }
        for (const [x, y] of [[34, 6], [31, 3], [36, 10]] as const) b.set(x, y, FXR.curse[1]);
      }),
    keepers_balm: () =>
      compose(MAT.moss, glyph((d) => {
        // a sprig of green taking root, two leaves opening
        d.ribbon({ mat: WD, z: 10, group: 'stem' }, [v(20, 5), v(19, 13), v(21, 21), v(20, 27)], [1.4, 1.3, 1.1, 0.8]);
        for (const [x, y, a] of [[20, 22, 140], [20, 17, 30], [20, 26, 70]] as const) {
          const base = v(x, y), tip = at(base, a, 8);
          d.poly({ mat: GN, z: 11, group: 'leaf' + a }, [base, at(lerpV(base, tip, 0.5), a + 90, 2.8), tip, at(lerpV(base, tip, 0.5), a - 90, 2.8)], { kind: 'bevel', w: 1.6 });
        }
      }), (b) => {
        // the balm's light round it, and the Regen it gives: a small green cross (screen space)
        const G = FXR.green;
        for (let a = 0; a < Math.PI * 2; a += 0.12) b.set(Math.round(20 + Math.cos(a) * 14), Math.round(19 + Math.sin(a) * 14), Math.sin(a) < 0 ? G[3] : G[1]);
        for (let k = -2; k <= 2; k++) {
          b.set(33 + k, 32, G[4]);
          b.set(33, 32 + k, G[4]);
        }
        b.set(33, 32, E.white);
      }),
  },
};
