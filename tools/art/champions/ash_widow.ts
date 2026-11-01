// The Ash Widow (docs/DESIGN_DECISIONS.md section 49, 2026-11-01, my proposal on
// Jakub's word): a Common Support of the Ashveil Reign, a dead woman in mourning.
// A plum gown to the floor, its ragged hem greyed with ash, a charcoal sash; a
// black veil over her whole head and down her back, the shadow of a skull just
// showing through it; a tall comb of bone standing up behind the veil; a clay
// urn held before her with a cracked base that lets ash fall, an iron lid, the
// Reign's white bone on its belly (the silhouette features: the comb and the
// urn). No Heal or holy light: ash is matter. Her affinity (Bloom) sets nothing
// here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { foldTex, robe, RobeCfg, torsoPts, upRobe } from '../parts.ts';
import { at, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16,
  shin: 16.4,
  ankleH: 3,
  footLen: 5.2,
  spine: 20,
  neck: 6.2,
  upperArm: 12,
  foreArm: 11.2,
  shoulderDrop: 3.6,
  shoulderN: -2.2,
  shoulderF: 2.6,
  hipN: -1.2,
  hipF: 1.2,
};

const SK = MAT.ashBone, GW = MAT.ashPlum, VL = MAT.blackCloth, CH = MAT.charcoal, UR = MAT.ashClay, IR = MAT.iron, BN = MAT.ashBone;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;
  const U = urnAt(s, P);

  veilBack(d, s, wave, 3);
  feet(d, s, 11);
  sleeveArm(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF');

  skirt(d, s, wave, 15);
  bodice(d, s, 30);
  sash(d, s, wave, 32);
  head(d, s);

  // the urn in her far hand, that hand under it; her near hand on the lid, or free when it flicks the ash
  urn(d, U, P, wave, 55);
  if (!P.drop) d.ellipse({ mat: SK, z: 57, group: 'handF', shade: -1 }, at(s.hF, s.loF, 0.4), 1.7, 1.4, s.loF);
  const n = nearArm(s, U, P);
  sleeveArm(d, s.sN, n.e, n.h, n.lo, 60, 0, 'armN');
}

// ---------------------------------------------------------------------------
// the gown and the veil
// ---------------------------------------------------------------------------

const ROBE: RobeCfg = { waist: [1.4, 4.8, 5.2], hemDrop: 1.4, hemFloor: 0.6, hemBack: [9.6, 7.6], hemFront: [5.8, 4.6], midBack: [4.8, 3.4], midFront: [3.6, 2.0], ripple: 0.8, zigzag: 1.4 };

/** The gown from the waist to the floor, plum, the hem ragged and grey with ash. */
function skirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: GW, z, group: 'gown', tex: foldTex(10, wave * 0.5, 0.55) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  d.ribbon({ mat: BN, z: z + 0.2, group: 'gown', line: 'none', shade: -2 }, upRobe(r, r.hem, 0.8), r.hem.map(() => 0.9));
}

function bodice(d: Draw, s: Skel, z: number) {
  const torso = torsoPts(s, [
    [0, 4.6, 4.8],
    [4, 4.0, 4.4],
    [8.5, 4.4, 5.2],
    [12.5, 5.0, 5.8],
    [15.6, 5.2, 5.2],
    [18, 3.8, 3.2],
    [20, 2.4, 2.0],
  ]);
  d.poly({ mat: GW, z, group: 'body', tex: foldTex(6, 0.8, 0.75) }, torso, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(20, 0.6), r: 5.8, bevel: 1.3 });
}

/** A charcoal sash at the waist, tied at the front, its ends hanging. */
function sash(d: Draw, s: Skel, wave: number, z: number) {
  d.poly({ mat: CH, z, group: 'sash' }, [s.T(3.0, -4.6), s.T(3.2, 5.0), s.T(1.2, 5.0), s.T(1.0, -4.8)], { kind: 'cyl', a: s.T(1, 0), b: s.T(3.2, 0), r: 5 });
  const knot = s.T(2.0, 4.4);
  const hang = -94 + Math.sin(wave) * 4;
  d.ribbon({ mat: CH, z: z + 0.1, group: 'sashend', line: 'soft' }, [knot, at(knot, hang, 5), at(knot, hang - 3, 10)], [0.9, 0.8, 0.7]);
}

/** The veil's fall down her back to below the hips, stirring a little. */
function veilBack(d: Draw, s: Skel, wave: number, z: number) {
  const H = s.H, T = s.T;
  const w = Math.sin(wave);
  d.poly({ mat: VL, z, group: 'veilback', tex: foldTex(6, wave * 0.4, 0.6) }, [H(-3, 9), H(-8.8, 5), H(-10, -1), T(14, -8.2 - w * 0.3), T(4, -9.4 - w * 0.6), T(-7, -10.4 - w), T(-8, -6), T(2, -3), T(14, -1)], { kind: 'dome', c: T(8, -6), r: 14, bevel: 1 });
}

/** Her head: the bone comb standing up behind the veil, the veil over all of it, the shadow of a skull showing through. */
function head(d: Draw, s: Skel) {
  const H = s.H;
  // the comb
  for (const [x, y, l] of [[-5.6, 7, 7], [-3.2, 8, 9.4], [-0.8, 8.6, 10.6], [1.6, 8, 9.4], [3.8, 7, 7]] as const) {
    d.capsule({ mat: BN, z: 38.4, group: 'comb' + x }, H(x, y), H(x * 1.5, y + l), 1.0, 0.6);
  }
  // the veil over the whole head
  d.poly(
    { mat: VL, z: 39, group: 'veil', tex: foldTex(5, 1.2, 0.7) },
    [H(6.0, 5.4), H(7.0, 1.4), H(7.2, -2.6), H(6.0, -6.4), H(2.4, -9.0), H(-3.4, -9.0), H(-7.6, -5), H(-9.2, 1), H(-8.4, 6), H(-5, 9.2), H(-0.4, 10), H(3.8, 8.6)],
    { kind: 'dome', c: H(-0.8, 1.4), r: 9.6, bevel: 1.2 },
  );
  // the skull through the veil: a pale cheek and brow, the socket left dark, a pale point in it, the teeth
  const P1 = SK.ramp[3], P2 = SK.ramp[2];
  d.pixels({ mat: VL, z: 39.2, group: 'through', outline: false, line: 'none' }, [
    { p: H(1.6, 2.8), c: P2 }, { p: H(3.0, 3.0), c: P1 }, { p: H(4.4, 2.8), c: P1 }, { p: H(5.4, 2.0), c: P2 },
    { p: H(1.4, 1.2), c: P2 }, { p: H(5.4, 0.4), c: P1 },
    { p: H(1.8, -0.8), c: P2 }, { p: H(3.0, -1.0), c: P1 }, { p: H(4.4, -1.2), c: P1 }, { p: H(5.6, -1.4), c: P1 },
    { p: H(3.4, 1.0), c: E.ashEyeDim },
    { p: H(3.2, -3.2), c: P1 }, { p: H(4.4, -3.2), c: P2 }, { p: H(5.4, -3.2), c: P1 },
  ]);
}

/** A narrow sleeve to the wrist, her bony hand. */
function sleeveArm(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: GW, z, group, shade }, sh, el, 2.3, 2.0);
  d.capsule({ mat: GW, z: z + 0.1, group, shade }, el, at(ha, lo, -1.4), 2.0, 2.2);
  d.ellipse({ mat: SK, z: z + 0.3, group, shade }, at(ha, lo, 0.2), 1.5, 1.2, lo);
  d.capsule({ mat: SK, z: z + 0.32, group, shade, line: 'soft' }, at(ha, lo, 1), at(ha, lo + 10, 3), 0.5, 0.4);
}

function feet(d: Draw, s: Skel, z: number) {
  for (const [side, shade] of [['F', -1], ['N', 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF;
    const fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: CH, z: z + (side === 'N' ? 1 : 0), group: 'foot' + side, shade: shade - 1 }, [f(-2.2, 1.6), f(-2.6, -1), f(-2, -3), f(5, -3), f(6.2, -1.6), f(3, 0), f(1, 1.6)], { kind: 'bevel', w: 1.3 });
  }
}

// ---------------------------------------------------------------------------
// the urn
// ---------------------------------------------------------------------------

/** Where the urn sits: on her far hand, or on the ground once she has fallen. */
function urnAt(s: Skel, P: Record<string, number>): V {
  return P.drop ? v(13, 5.6) : at(s.hF, 90, 5.4);
}

/** Her near hand: on the lid, or (`free` 1) where the pose puts it. */
function nearArm(s: Skel, U: V, P: Record<string, number>): { e: V; h: V; lo: number } {
  const free = P.drop ? 1 : (P.free ?? 0);
  if (free >= 1) return { e: s.eN, h: s.hN, lo: s.loN };
  const target = lerpV(at(U, 145, 5.2), s.hN, free);
  const r = ik2(s.sN, target, D.upperArm, D.foreArm, -1);
  return { e: r.mid, h: r.end, lo: r.a2 };
}

/**
 * The clay urn: its belly, a charcoal cord, the white bone, the iron lid (raised
 * by `lid`, tipped by `tilt`). Ash falls from the crack in its base, a few grains
 * at a time, more while it pours (`pour`).
 */
function urn(d: Draw, U: V, P: Record<string, number>, wave: number, z: number) {
  const tilt = P.drop ? 96 : (P.tilt ?? 0);
  const f = d.frame(U, 90 - tilt);
  d.poly({ mat: UR, z, group: 'urn', tex: (h) => (Math.sin(h.u * 16) > 0.9 ? -1 : 0) }, [f(-5.2, -2.2), f(-3.6, -4.2), f(0, -5.2), f(3.2, -4), f(4.8, -2.4), f(4.8, 2.4), f(3.2, 4), f(0, 5.2), f(-3.6, 4.2), f(-5.2, 2.2)], { kind: 'cyl', a: f(-5.2, 0), b: f(4.8, 0), r: 5.4, bevel: 1.2 });
  d.ribbon({ mat: CH, z: z + 0.1, group: 'cord', line: 'none' }, [f(3.2, -3.9), f(3.2, 0), f(3.2, 3.9)], [0.6, 0.6, 0.6]);
  const px = [f(-0.8, -1.8), f(-0.8, -0.6), f(-0.8, 0.6), f(-0.8, 1.8), f(-1.8, -2.6), f(0.2, -2.6), f(-1.8, 2.6), f(0.2, 2.6)];
  d.pixels({ mat: UR, z: z + 0.2, group: 'urnmark', outline: false, line: 'none' }, px.map((p) => ({ p, c: E.white })));
  const lid = P.lid ?? 0;
  d.poly({ mat: IR, z: z + 0.3, group: 'lid' }, [f(4.8 + lid, -3.2), f(6.8 + lid, -2.2), f(7.6 + lid, 0), f(6.8 + lid, 2.2), f(4.8 + lid, 3.2)], { kind: 'bevel', w: 1 });
  d.circle({ mat: BN, z: z + 0.4, group: 'lid' }, f(8.4 + lid, 0), 1.0);
  // the ash falling, in a loop
  if (P.drop) return;
  const pour = P.pour ?? 0;
  const n = pour > 0 ? 9 : 3;
  const from = pour > 0 ? f(5.5, 3) : f(-5.2, 0.6);
  const grains: { p: V; c: (typeof BN.ramp)[number] }[] = [];
  for (let k = 0; k < n; k++) {
    const ph = ((wave / (Math.PI * 2)) * (pour > 0 ? 3 : 1) + k / n) % 1;
    const y = from.y - (pour > 0 ? 34 : 22) * ph;
    if (y < 1) continue;
    grains.push({ p: v(from.x + Math.sin(k * 2.4) * (1 + ph * (pour > 0 ? 5 : 2)), y), c: BN.ramp[ph < 0.5 ? 3 : 2] });
  }
  d.pixels({ mat: BN, z: z + 0.5, group: 'ash', outline: false, line: 'none' }, grains);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: 0,
  torso: 88,
  head: 82,
  legN: { ik: v(-4, 3) },
  legF: { ik: v(5, 3) },
  armN: { up: -60, lo: 10 },
  armF: { up: -62, lo: 6 },
  p: { free: 0, tilt: 0, lid: 0, pour: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -b, p: { wave: a } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -7 * Math.cos(ph), y: 3 + (sn > 0 ? 3 * sn : 0) };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return tweak(IDLE, { y: bob - 1, torso: 82, head: 78, legN: { ik: v(n.x, n.y) }, legF: { ik: v(f.x, f.y) }, p: { wave: a * 2 } });
}

// Ash Flick: the lid eased aside, a pinch taken, then flicked out with the near hand.
const AF_PINCH = tweak(IDLE, { torso: 92, head: 84, p: { free: 0, lid: 2 } });
const AF_FLICK = tweak(IDLE, { x: 2, torso: 84, head: 84, armN: { up: 6, lo: 16 }, p: { free: 1, lid: 0 } });
const AF_HOLD = tweak(AF_FLICK, { x: 1, torso: 86, armN: { up: -6, lo: 30 } });

// Sift the Ash: the urn lifted before her face, then tipped over at her side, ash pouring.
const SA_LIFT = tweak(IDLE, { y: 1, torso: 92, head: 92, armF: { up: 10, lo: 62 }, p: { lid: 2 } });
const SA_POUR = tweak(SA_LIFT, { torso: 88, head: 76, p: { tilt: 62, lid: 3, pour: 1, wave: 2 } });
const SA_POUR2 = tweak(SA_POUR, { p: { wave: 3.4 } });
const SA_POUR3 = tweak(SA_POUR, { p: { wave: 4.8 } });

const HURT = tweak(IDLE, { x: -4, y: -1, torso: 98, head: 100, p: { tilt: -12 } });
const DEATH_KNEEL = pose({
  x: 0, y: -13, torso: 72, head: 58,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, footN: -30,
  armN: { up: -60, lo: 10 }, armF: { up: -50, lo: 20 },
  p: { free: 0, tilt: 30 },
});
const DEATH_FALL = pose({
  x: 2, y: -10, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { drop: 1, wave: 2 },
});
const DEATH_DOWN = pose({
  x: 5, y: -21, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 },
  armN: { up: 4, lo: 2 }, armF: { up: -2, lo: 4 },
  p: { drop: 1, wave: 2 },
});

// Victory: the urn held high in both hands, her head bowed to it.
const VICTORY = tweak(IDLE, { y: 1, torso: 90, head: 96, armF: { up: 40, lo: 74 }, p: { lid: 0 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'ash_widow',
  name: 'Ash Widow',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 190, idle) },
    run: { loop: true, frames: cycle(8, 90, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, AF_PINCH, 2, 100, ease.out),
        ...keys([
          [AF_PINCH, 220],
          [mid(AF_PINCH, AF_FLICK, 0.5), 60],
          [AF_FLICK, 90, { hit: true }],
          [AF_HOLD, 240],
        ]),
        ...tween(D, AF_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SA_LIFT, 3, 110, ease.out),
        ...keys([
          [SA_LIFT, 200],
          [mid(SA_LIFT, SA_POUR, 0.5), 100],
          [SA_POUR, 130, { hit: true }],
          [SA_POUR2, 130],
          [SA_POUR3, 130],
          [SA_POUR, 130],
        ]),
        ...tween(D, SA_POUR, IDLE, 3, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 95, head: 96 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 260],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -21.4 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VICTORY, 3, 110, ease.out),
        ...keys([
          [VICTORY, 700],
          [mid(VICTORY, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

function iconUrn(d: Draw, c: V, ang: number, z: number) {
  const f = d.frame(c, ang);
  d.poly({ mat: UR, z, group: 'iurn' }, [f(-10, -4), f(-7, -8), f(0, -10), f(6, -8), f(9, -5), f(9, 5), f(6, 8), f(0, 10), f(-7, 8), f(-10, 4)], { kind: 'cyl', a: f(-10, 0), b: f(9, 0), r: 10, bevel: 1.6 });
  d.poly({ mat: IR, z: z + 0.2, group: 'ilid' }, [f(9, -6), f(13, -4), f(14, 0), f(13, 4), f(9, 6)], { kind: 'bevel', w: 1.4 });
}

export const ashWidow: ChampionArt = {
  char,
  iconBg: GW,
  icons: {
    ash_flick: () =>
      compose(GW, glyph((d) => {
        // a bony pinch, the ash flying from it
        d.capsule({ mat: SK, z: 10, group: 'ifinger' }, v(4, 8), v(16, 18), 2.4, 1.6);
        d.capsule({ mat: SK, z: 10.1, group: 'ifinger' }, v(10, 4), v(17, 16), 2.2, 1.5);
      }), (b) => {
        const R = BN.ramp;
        for (const [x, y, k] of [[20, 20, 4], [23, 17, 4], [26, 15, 3], [24, 21, 3], [29, 12, 3], [28, 18, 2], [33, 10, 2], [32, 15, 2], [36, 7, 1]] as const) b.set(x, y, R[k]);
      }),
    sift_ash: () =>
      compose(GW, glyph((d) => {
        iconUrn(d, v(20, 27), 40, 10);
      }), (b) => {
        const R = BN.ramp;
        for (const [x, y, k] of [[25, 18, 4], [24, 22, 4], [26, 25, 3], [23, 27, 3], [27, 30, 3], [22, 32, 2], [25, 34, 2], [29, 35, 2], [19, 36, 2]] as const) b.set(x, y, R[k]);
      }),
    keening: () =>
      compose(GW, glyph((d) => {
        iconUrn(d, v(20, 18), 90, 10);
      }), (b) => {
        // the keen going up from it
        const R = BN.ramp;
        for (const [r, k] of [[8, 4], [12, 3], [16, 2]] as const) {
          for (let a = -0.9; a <= 0.9; a += 0.14) b.set(Math.round(20 + Math.sin(a) * r), Math.round(8 + r * 0.25 - Math.cos(a) * r * 0.5), R[k]);
        }
      }),
  },
};
