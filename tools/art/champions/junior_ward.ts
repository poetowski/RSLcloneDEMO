// The Junior Ward (Jakub's brief, docs/DESIGN_DECISIONS.md section 44,
// 2026-10-31): an enemy of the Sanguine Dominion, Common, Tank; a tall young
// man holding a long spear, in a black tunic, his arms bare. Taller than the
// Town Guard, on the same rig: a black sleeveless tunic to mid-thigh belted
// with a red sash, a small red hexagon on the chest (the Dominion's mark),
// bare arms, dark-brown breeches and plain leather boots, short dark hair and
// a clean-shaven, young face; a spear longer than he is, an ash shaft, an iron
// butt, a leaf-shaped head with a red binding under it, held in his near hand,
// its butt on the ground at rest. Long Thrust lunges and drives it straight in;
// Hold Fast, his passive, raises a ring of dust at his feet. His affinity
// (Bloom) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { arm, leg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 36,
  thigh: 17,
  shin: 16.4,
  ankleH: 3,
  footLen: 6.6,
  spine: 22.4,
  neck: 6.8,
  upperArm: 13,
  foreArm: 12,
  shoulderDrop: 4.6,
  shoulderN: -3.0,
  shoulderF: 3.4,
  hipN: -2.0,
  hipF: 2.0,
};

const SK = MAT.skinLight, BK = MAT.blackCloth, RD = MAT.red, DL = MAT.darkleather, LE = MAT.leather, WD = MAT.wood, IR = MAT.iron, ST = MAT.steel, HR = MAT.hairBrown;
const E = ACCENT;

/** The spear from the near hand: back to the butt, up to the binding, to the point. */
const BUTT = 37, BLADE = 36, TIP = 45;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;

  // far leg in breeches and boot, the far arm bare
  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(20, -1));

  // the black tunic, its skirt, the red sash and the hexagon
  tunic(d, s, 30);

  head(d, s, P);

  // near leg
  leg(d, s, 'N', legCfg(50, 0));

  // the spear in his near hand, or fallen beside him; the near arm over it
  if (P.drop) spear(d, v(-6, 1.6), 2, 56);
  else spear(d, s.hN, P.spAng ?? 90, 56);
  arm(d, s, 'N', armCfg(60, 0));
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: DL, shin: DL, foot: LE, rThigh: [4.2, 3.4] as [number, number], rShin: [3.1, 2.6] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: LE, from: 0.42, r: [3.3, 3.0] as [number, number], cuff: DL },
});

// bare arms, young and lean
const armCfg = (z: number, shade: number) => ({
  upper: SK, fore: SK, hand: SK, rUp: [3.0, 2.6] as [number, number], rLo: [2.6, 2.2] as [number, number], rHand: 2.1, z, shade,
});

/** The black tunic: sleeveless, from the shoulders to mid-thigh, belted with a red sash, a small red hexagon on the chest. */
function tunic(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 6.2, 6.4],
    [4, 6.2, 6.8],
    [9, 6.8, 7.6],
    [14, 7.2, 8.0],
    [18.4, 7.0, 7.2],
    [20.8, 5.4, 4.8],
    [22.2, 3.0, 2.4],
  ]);
  d.poly({ mat: BK, z, group: 'tunic', tex: (h) => (Math.sin(h.v * 7 + 0.4) > 0.86 ? -1 : 0) }, body, { kind: 'cyl', a: s.T(0, 1), b: s.T(22.2, 1), r: 8, bevel: 1.2 });
  // the skirt of the tunic over the hips, hanging between the thighs
  const ang = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  const f0 = s.T(1.2, -7.0), f1 = s.T(1.2, 7.4);
  const f2 = at(f1, ang + 8, 12), f3 = at(f0, ang - 8, 11);
  d.poly({ mat: BK, z: z - 0.5, group: 'skirt', tex: (h) => (Math.sin(h.v * 9) > 0.8 ? -1 : 0) }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 7, bevel: 1 });
  // the red sash at the waist, its knotted end hanging at the side
  d.poly({ mat: RD, z: z + 1, group: 'sash' }, [s.T(3.4, -6.8), s.T(3.6, 7.4), s.T(1.0, 7.2), s.T(0.8, -6.6)], { kind: 'cyl', a: s.T(0.8, 0), b: s.T(3.6, 0), r: 7.2 });
  const knot = s.T(2.2, -6.4);
  d.ribbon({ mat: RD, z: z + 1.1, group: 'sash', shade: -1, line: 'soft' }, [knot, at(knot, ang - 6, 4.2), at(at(knot, ang - 6, 4.2), ang + 4, 3.4)], [0.9, 0.8, 0.6]);
  hexBadge(d, s.T(15, 3.4), z + 1.2);
}

/** A small red hexagon (the Sanguine Dominion's mark) with a dark rim, pixel by pixel so it stays crisp. */
function hexBadge(d: Draw, center: V, z: number) {
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const R = RD.ramp;
  const px: { p: V; c: (typeof R)[number] }[] = [];
  for (const [x, y] of [[-1, 2], [0, 2], [1, 2], [-2, 1], [2, 1], [-2, 0], [2, 0], [-2, -1], [2, -1], [-1, -2], [0, -2], [1, -2]]) px.push({ p: v(c.x + x, c.y + y), c: R[1] });
  for (const [x, y] of [[-1, 1], [0, 1], [1, 1], [-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1]]) px.push({ p: v(c.x + x, c.y + y), c: y > 0 || x < 0 ? R[4] : R[3] });
  d.pixels({ mat: RD, z, group: 'badge', line: 'none', outline: false }, px);
}

/** A young, clean-shaven face, short dark hair cropped close. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.6, 2.4);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[2], browStyle: P.grit ? 'angry' : 'flat', mouth: P.grit ? 'shout' : 'line', lip: SK.ramp[1], rx: 5.8, ry: 6.6 });
  d.poly(
    { mat: HR, z: 39, group: 'hair', line: 'soft', tex: (h) => (Math.sin(h.u * 18) > 0.75 ? -1 : 0) },
    [H(6.2, 3.6), H(5.0, 7.0), H(1.4, 8.8), H(-3.0, 8.6), H(-6.4, 6.0), H(-7.2, 1.6), H(-5.6, -1.6), H(-4.0, 1.6), H(-1.0, 4.4), H(3.2, 4.6)],
    { kind: 'dome', c: H(-0.6, 3.6), r: 8.2, bevel: 1 },
  );
  d.pixels({ mat: HR, z: 39.1, group: 'hair' }, [{ p: H(-2.4, 7.6), c: HR.ramp[4] }, { p: H(1.4, 7.8), c: HR.ramp[4] }]);
}

/** The long spear: an ash shaft, an iron butt, a red binding, a leaf-shaped head of steel. */
function spear(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: WD, z, group: 'shaft', tex: (h) => (Math.sin(h.u * 30) > 0.9 ? -1 : 0) }, f(-BUTT, 0), f(BLADE, 0), 1.1, 1.05);
  d.capsule({ mat: IR, z: z + 0.02, group: 'shaft', line: 'soft' }, f(-BUTT - 0.6, 0), f(-BUTT + 2.4, 0), 0.9, 1.3);
  d.capsule({ mat: RD, z: z + 0.02, group: 'binding', line: 'soft' }, f(BLADE - 3, 0), f(BLADE, 0), 1.5, 1.5);
  d.poly({ mat: ST, z: z + 0.05, group: 'head' }, [f(BLADE, -1.2), f(BLADE + 2.6, -2.8), f(TIP - 3, -1.4), f(TIP, 0), f(TIP - 3, 1.4), f(BLADE + 2.6, 2.8), f(BLADE, 1.2)], { kind: 'bevel', w: 1.1 });
  d.line({ mat: ST, z: z + 0.07, group: 'head', line: 'none' }, f(BLADE + 1, 0), f(TIP - 1.6, 0), ST.ramp[5]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the spear's angle is absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

/** The near hand at `hand`, the spear at `ang`. */
const sp = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, armF: { up: -82, lo: -66 }, ...extra, p: { spAng: ang, ...(extra.p ?? {}) } });

// At rest: the spear upright in his near hand, its butt on the ground, the far arm loose.
const IDLE = sp(v(-9, 38), 90, { y: -1, torso: 88, head: 88, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) } });

function idle(t: number): Pose {
  const b = Math.round((1 - Math.cos(t * Math.PI * 2)) / 2);
  return tweak(IDLE, { y: -1 - b, head: 88 - b, armF: { up: -82 + b, lo: -66 + b } });
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
  const sw = Math.cos(a);
  return sp(v(-2, 40 + bob), 18, {
    y: bob - 2, torso: 76, head: 84,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armF: { up: -70 - sw * 26, lo: -40 - sw * 26 },
  });
}

// Long Thrust: the spear drawn back level at his hip, then a lunge that drives it straight in.
const LT_DRAW = sp(v(-15, 44), 4, { x: -3, y: -2, torso: 96, head: 90, legN: { ik: v(-12, 3) }, legF: { ik: v(10, 3) }, armF: { up: -60, lo: 6 } });
const LT_THRUST = sp(v(24, 45), 2, { x: 10, y: -6, torso: 68, head: 78, legN: { ik: v(-14, 3) }, legF: { ik: v(18, 3) }, armF: { up: -110, lo: -100 }, p: { grit: 1 } });
const LT_HOLD = tweak(LT_THRUST, { x: 9, armN: { ik: v(21, 44), bend: -1 }, p: { grit: 0 } });

const HURT = sp(v(-12, 38), 98, { x: -4, y: -1, torso: 100, head: 106, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10, armF: { up: -110, lo: -80 }, p: { grit: 1 } });

// Death: he kneels on the spear, it falls away, he goes down.
const DEATH_KNEEL = sp(v(-4, 37), 94, { x: 0, y: -10, torso: 78, head: 62, legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -30, armF: { up: -90, lo: -80 } });
const DEATH_FALL = pose({
  x: 2, y: -8, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { drop: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -20, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { drop: 1 },
});

// Victory: the spear raised high in his near hand.
const RAISE = sp(v(-12, 74), 90, { armN: { ik: v(-12, 74), bend: 1 }, y: -1, torso: 90, head: 96, legN: { ik: v(-8, 3) }, legF: { ik: v(9, 3) }, p: { grit: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'junior_ward',
  name: 'Junior Ward',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 170, idle) },
    run: { loop: true, frames: cycle(8, 78, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, LT_DRAW, 2, 80, ease.out),
        ...keys([
          [LT_DRAW, 170],
          [LT_THRUST, 70, { hit: true }],
          [LT_HOLD, 220],
        ]),
        ...tween(D, LT_HOLD, IDLE, 3, 100, ease.inOut),
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
        [tweak(DEATH_DOWN, { y: -20.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, RAISE, 0.5), 100],
        [RAISE, 700],
        [mid(RAISE, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** The spear's head and a length of its shaft, scaled up for 40x40. */
function iconSpear(d: Draw, from: V, to: V, z: number) {
  const ang = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const f = d.frame(to, ang);
  d.capsule({ mat: WD, z, group: 'ishaft' }, from, f(-9, 0), 1.6, 1.6);
  d.capsule({ mat: RD, z: z + 0.05, group: 'ibind', line: 'soft' }, f(-11, 0), f(-8, 0), 2.2, 2.2);
  d.poly({ mat: ST, z: z + 0.1, group: 'ihead' }, [f(-8, -1.8), f(-4, -4.2), f(0, 0), f(-4, 4.2), f(-8, 1.8)], { kind: 'bevel', w: 1.4 });
}

export const juniorWard: ChampionArt = {
  char,
  iconBg: BK,
  icons: {
    long_thrust: () =>
      compose(BK, glyph((d) => {
        // the spear driven straight in
        iconSpear(d, v(2, 14), v(32, 24), 10);
      }), (b) => {
        impactStar(b, 33, 16, 1, 7, 8, FXR.dust[3], E.white);
        for (const [x, y] of [[4, 30], [8, 31], [12, 32]]) b.set(x, y, E.white);
      }),
    hold_fast: () =>
      compose(BK, glyph((d) => {
        // the spear planted upright, dust round its foot
        iconSpear(d, v(20, 2), v(20, 36), 10);
      }), (b) => {
        for (const [x, y, k] of [[10, 35, 3], [13, 36, 4], [16, 37, 2], [24, 37, 2], [27, 36, 4], [30, 35, 3], [8, 33, 2], [32, 33, 2]] as const) b.set(x, y, FXR.dust[k]);
        // and the DEF Up it brings: a gold chevron
        for (const [dx, dy] of [[0, 0], [1, -1], [2, -2], [3, -1], [4, 0], [1, 0], [3, 0]]) b.set(30 + dx, 8 + dy, E.goldHot);
      }),
  },
};
