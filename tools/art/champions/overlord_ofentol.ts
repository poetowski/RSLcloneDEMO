// Overlord Ofentol (Jakub's brief, docs/DESIGN_DECISIONS.md section 59,
// 2026-11-01): an Elite Tank of the Azure Crown, a fat man with a smith's hammer
// and a one-handed scythe, a dirty white t-shirt and a beard. So a village smith
// and no lord at all: a great belly pushing out a t-shirt gone grey with soot and
// sweat, too short to cover him, his bare stomach under its hem; a blue belt under
// the belly (the Crown's blue), dark work trousers, heavy boots; a balding head, a
// wide ginger beard, a nose gone red from years of the same mistake. The hammer in
// his near hand, a short scythe in his far hand. He sways a little, even at rest. His
// affinity (Bloom) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, leg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 31,
  thigh: 14.5,
  shin: 14,
  ankleH: 3,
  footLen: 6.6,
  spine: 21,
  neck: 5.4,
  upperArm: 12.5,
  foreArm: 11.2,
  shoulderDrop: 4.2,
  shoulderN: -3.6,
  shoulderF: 3.8,
  hipN: -2.8,
  hipF: 2.8,
};

const SK = MAT.skinLight, TS = MAT.linen, CH = MAT.faded, BL = MAT.blue, LE = MAT.leather, DL = MAT.darkleather, WD = MAT.wood, IR = MAT.iron, ST = MAT.steel, RU = MAT.rust, HR = MAT.hairGinger, GD = MAT.gold;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;

  // the scythe in his far hand, behind him
  if (P.drop) scythe(d, v(-14, 3.4), 2, 6, 0.16);
  else scythe(d, s.hF, P.scy ?? 62, 18);

  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(20, -1));
  sleeve(d, s.sF, s.eF, 20.6, -1, 'F');
  if (!P.drop) d.ellipse({ mat: SK, z: 21, group: 'gripF', shade: -1 }, s.hF, 2.4, 2.1, 0);

  body(d, s, 30);
  head(d, s, P);

  leg(d, s, 'N', legCfg(50, 0));
  // the belly hangs over the tops of his legs
  belly(d, s, 52);

  if (P.drop) hammer(d, v(16, 4), 4, 54, 0.4);
  else hammer(d, s.hN, P.ham ?? -30, 58);
  arm(d, s, 'N', armCfg(60, 0));
  sleeve(d, s.sN, s.eN, 60.6, 0, 'N');
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: CH, shin: CH, foot: LE, rThigh: [5.2, 4.2] as [number, number], rShin: [3.8, 3.1] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: LE, from: 0.5, r: [3.9, 3.4] as [number, number], cuff: DL },
});

const armCfg = (z: number, shade: number) => ({
  upper: SK, fore: SK, hand: SK, rUp: [3.9, 3.3] as [number, number], rLo: [3.2, 2.7] as [number, number], rHand: 2.5, z, shade,
});

/** The t-shirt's short sleeve round the upper arm, ending in a dirty hem. */
function sleeve(d: Draw, sh: V, el: V, z: number, shade: number, side: string) {
  const a = (Math.atan2(el.y - sh.y, el.x - sh.x) * 180) / Math.PI;
  const end = v(sh.x + (el.x - sh.x) * 0.56, sh.y + (el.y - sh.y) * 0.56);
  d.capsule({ mat: TS, z, group: 'sleeve' + side, shade }, sh, end, 4.5, 4.2);
  d.line({ mat: TS, z: z + 0.05, group: 'sleeve' + side, line: 'none' }, at(end, a + 90, 3.8), at(end, a - 90, 3.8), TS.ramp[1]);
}

/** Soot and sweat on the shirt, fixed to the cloth so they move with him: [along the spine, across it, how dark]. */
const STAINS: [number, number, number][] = [
  [18, -3, 1], [17, 3, 2], [15, 7.5, 1], [14, 0.5, 2], [13, -5, 2], [12, 5, 1], [10.5, 9, 2], [9.5, -1.5, 1], [8, 4.5, 2], [8.5, 11, 1], [7, -6, 2], [6, 9, 1], [11, 2, 2], [15.6, -6, 2],
];

/** Trousers on his hips, then the great round body in its short, dirty t-shirt, a crew neck at the throat. */
function body(d: Draw, s: Skel, z: number) {
  d.poly({ mat: CH, z: z - 1, group: 'hips' }, [s.T(1, -8), s.T(1, 8.6), s.T(-5.4, 7.8), s.T(-5.4, -8)], { kind: 'cyl', a: s.T(1, 0), b: s.T(-5.4, 0), r: 8.6, bevel: 1 });
  const shirt = torsoPts(s, [
    [4.2, 8, 12.8],
    [7, 8.6, 14.2],
    [11, 8.8, 13.6],
    [14.6, 8.6, 11],
    [17.6, 8, 8.6],
    [19.8, 6, 5.6],
    [21, 3.6, 3],
  ]);
  d.poly({ mat: TS, z, group: 'shirt' }, shirt, { kind: 'cyl', a: s.T(4, 2.2), b: s.T(21, 2.2), r: 11.8, bevel: 1.6 });
  // the folds pulled across his belly
  d.line({ mat: TS, z: z + 0.2, group: 'shirt', line: 'none' }, s.T(9, 4), s.T(6.6, 11), TS.ramp[2]);
  d.line({ mat: TS, z: z + 0.2, group: 'shirt', line: 'none' }, s.T(13, 3), s.T(10.4, 11), TS.ramp[2]);
  d.pixels({ mat: TS, z: z + 0.3, group: 'shirt', line: 'none', outline: false }, STAINS.map(([u, w, k]) => ({ p: s.T(u, w), c: MAT.graveSack.ramp[k] })));
  // the crew neck
  d.ribbon({ mat: TS, z: z + 0.4, group: 'neckband' }, [s.T(20.6, -3.4), s.T(19.6, 0), s.T(20.6, 3.2)], [0.8, 0.9, 0.8]);
}

/** Bare stomach under the shirt's hem, a navel, the blue belt lost beneath it, the shirt's front over the top. */
function belly(d: Draw, s: Skel, z: number) {
  d.poly({ mat: BL, z: z - 0.2, group: 'belt' }, [s.T(-2.2, -8.4), s.T(-2.2, 9), s.T(-5, 8.8), s.T(-5, -8.2)], { kind: 'cyl', a: s.T(-2.2, 0), b: s.T(-5, 0), r: 8.8, bevel: 1 });
  d.poly({ mat: IR, z: z - 0.1, group: 'buckle' }, [s.T(-2.2, 5), s.T(-2.2, 8.6), s.T(-5, 8.6), s.T(-5, 5)], { kind: 'bevel', w: 1 });
  d.pixels({ mat: GD, z: z - 0.05, group: 'buckle', line: 'none', outline: false }, [{ p: s.T(-3.6, 6.8), c: GD.ramp[4] }]);
  const gut = torsoPts(s, [
    [-3.6, 2, 10.4],
    [-1, 5, 12.6],
    [1.6, 6.6, 13.6],
    [5, 7, 13.8],
  ]);
  d.poly({ mat: SK, z, group: 'gut' }, gut, { kind: 'cyl', a: s.T(-3.6, 4), b: s.T(5, 4), r: 9.4, bevel: 1.4 });
  d.pixels({ mat: SK, z: z + 0.1, group: 'gut', line: 'none', outline: false }, [{ p: s.T(0.8, 9), c: SK.ramp[1] }, { p: s.T(0.2, 9), c: SK.ramp[2] }]);
  // the shirt's hem riding up over it, grey with dirt
  d.ribbon({ mat: TS, z: z + 0.3, group: 'hem' }, [s.T(4.2, -7.6), s.T(3.4, 1), s.T(3.6, 8), s.T(5.2, 13.6)], [1.5, 1.6, 1.6, 1.2]);
  d.line({ mat: TS, z: z + 0.35, group: 'hem', line: 'none' }, s.T(2.6, 1), s.T(2.8, 8), MAT.graveSack.ramp[2]);
}

/** The balding head: a fringe at the sides, a shine on the crown, a wide ginger beard, a red nose. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.6, 3.4);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[2], browStyle: P.grit ? 'angry' : 'flat', mouth: P.shout ? 'shout' : 'line', lip: SK.ramp[1], rx: 6.2, ry: 6.8 });
  d.pixels({ mat: SK, z: 38.5, group: 'shine', line: 'none', outline: false }, [{ p: H(-1.8, 6.2), c: SK.ramp[5] }, { p: H(-0.8, 6.4), c: SK.ramp[5] }]);
  // the fringe round the back of his bald head
  d.poly({ mat: HR, z: 38.6, group: 'fringe', line: 'soft' }, [H(-6.8, 3.4), H(-7.4, -0.6), H(-5.8, -3.4), H(-3.4, -2), H(-4.2, 3)], { kind: 'bevel', w: 1 });
  // the beard, wide and full from ear to chest, the mouth showing in it when he shouts
  const beard = P.shout
    ? [H(-3.6, -1.6), H(0.6, -2.4), H(3.6, -4.2), H(7.4, -2.6), H(8, -6), H(6, -11), H(1.6, -13.6), H(-2.4, -11), H(-4.6, -6)]
    : [H(-3.6, -1.6), H(0.6, -2.2), H(3.8, -1.8), H(7.2, -1.4), H(8, -5.4), H(6, -10.4), H(1.6, -13), H(-2.4, -10.6), H(-4.6, -6)];
  d.poly({ mat: HR, z: 38.7, group: 'beard', line: 'soft', tex: (h) => (Math.sin(h.u * 2.6 + h.v * 5) > 0.5 ? 1 : 0) }, beard, { kind: 'bevel', w: 1.2 });
  if (P.shout) d.ellipse({ mat: MAT.maroon, z: 38.8, group: 'mouth', line: 'soft' }, H(4.6, -5), 2, 1.6, 0);
  // the nose, red and round, sitting on top of the beard
  d.ellipse({ mat: MAT.red, z: 39, group: 'nose', line: 'soft' }, H(6.8, 0.4), 1.9, 1.6, 0);
  d.pixels({ mat: MAT.red, z: 39.1, group: 'nose', line: 'none', outline: false }, [{ p: H(6.6, 1), c: MAT.red.ramp[6] }]);
}

/** The smith's hammer: a worn handle, a square iron head, its face to one side and its peen to the other. */
function hammer(d: Draw, hand: V, ang: number, z: number, lie = 1) {
  const f0 = d.frame(hand, ang);
  const f = (u: number, w: number) => f0(u, w * lie);
  d.capsule({ mat: WD, z, group: 'hamHandle' }, f(-3.4, 0), f(15.6, 0), 1.3, 1.5);
  d.poly({ mat: IR, z: z + 0.2, group: 'hamHead' }, [f(13.2, -4.6), f(18.8, -4.6), f(18.8, 3.6), f(17.2, 6), f(14.8, 6), f(13.2, 3.6)], { kind: 'bevel', w: 1.3 });
  d.line({ mat: IR, z: z + 0.25, group: 'hamHead', line: 'none' }, f(13.4, -3.4), f(18.6, -3.4), IR.ramp[1]);
}

/** The short scythe: a stubby snath, a long curved blade off its end, rust along its back and a bright edge. */
function scythe(d: Draw, hand: V, ang: number, z: number, lie = 1) {
  const f0 = d.frame(hand, ang);
  const f = (u: number, w: number) => f0(u, w * lie);
  d.capsule({ mat: WD, z, group: 'snath' }, f(-5, 0), f(19, 0), 1.3, 1.2);
  d.ellipse({ mat: IR, z: z + 0.1, group: 'tang' }, f(18.4, 0), 2, 1.8, ang);
  const blade = [f(18.6, -0.6), f(20, -6), f(19.4, -12), f(16.6, -18), f(12, -22.6)];
  d.ribbon({ mat: ST, z: z + 0.2, group: 'blade' }, blade, [2.5, 2.3, 1.9, 1.3, 0.6]);
  d.line({ mat: RU, z: z + 0.25, group: 'blade', line: 'none' }, f(20.6, -2), f(20.4, -10), RU.ramp[3]);
  d.line({ mat: ST, z: z + 0.3, group: 'blade', line: 'none' }, f(17.4, -5), f(14.6, -15), E.white);
}

// ---------------------------------------------------------------------------
// Poses & animations (arm angles are absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 92,
  head: 88,
  legN: { ik: v(-10, 3) },
  legF: { ik: v(10, 3) },
  armN: { up: -118, lo: -52 },
  armF: { up: -60, lo: -6 },
  p: { ham: -24, scy: 74 },
});

/** At rest he breathes from the belly and sways, slowly, as a man who has had a few. */
function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  const sway = Math.round(Math.sin(a));
  return tweak(IDLE, { x: sway, y: -1 - b, torso: 92 - sway, head: 88 + sway, armN: { up: -118 + b, lo: -52 + b }, armF: { up: -60 + b, lo: -6 + b } });
}

/** Run: a heavy waddle, side to side, weapons out for balance. */
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -9.5 * Math.cos(ph), y: 3 + (sn > 0 ? 5 * sn : 0), ang: sn > 0 ? -20 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 1.5, torso: 84 + sw * 3, head: 84,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armN: { up: -120 + sw * 16, lo: -60 + sw * 16 }, armF: { up: -56 - sw * 12, lo: 0 - sw * 12 },
    p: { ham: -20 + sw * 14, scy: 70 - sw * 10 },
  });
}

// Hammer and Scythe: the hammer up behind his head and down; on the chance, the scythe from high on the far side across.
const H_WIND = pose({ x: -3, y: -1, torso: 100, head: 94, legN: { ik: v(-11, 3) }, legF: { ik: v(8, 3) }, armN: { up: 104, lo: 134 }, armF: { up: -66, lo: -18 }, p: { ham: 158, scy: 70, grit: 1 } });
const H_STRIKE = pose({ x: 9, y: -4, torso: 68, head: 72, legN: { ik: v(-10, 3) }, legF: { ik: v(14, 3) }, armN: { up: -8, lo: -28 }, armF: { up: -74, lo: -20 }, p: { ham: -62, scy: 66, grit: 1, shout: 1 } });
const H_FOLLOW = tweak(H_STRIKE, { x: 10, torso: 66, armN: { up: -16, lo: -36 }, p: { ham: -72, shout: 0 } });
const S_WIND = pose({ x: 3, y: -2, torso: 94, head: 88, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, armN: { up: -84, lo: -46 }, armF: { up: 118, lo: 152 }, p: { ham: -30, scy: 138, grit: 1 } });
const S_STRIKE = pose({ x: 11, y: -4, torso: 72, head: 76, legN: { ik: v(-11, 3) }, legF: { ik: v(14, 3) }, armN: { up: -112, lo: -62 }, armF: { up: -2, lo: -26 }, p: { ham: -34, scy: -32, grit: 1, shout: 1 } });
const S_FOLLOW = tweak(S_STRIKE, { x: 12, torso: 68, armF: { up: -24, lo: -50 }, p: { scy: -58, shout: 0 } });

// I Am Ofentol!: he fills his chest, throws back his head, both arms up, and roars it.
const R_BREATH = pose({ y: -2, torso: 84, head: 78, legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) }, armN: { up: -124, lo: -40 }, armF: { up: -46, lo: 20 }, p: { ham: -10, scy: 90 } });
const R_ROAR = pose({ y: -1, torso: 100, head: 116, legN: { ik: v(-11, 3) }, legF: { ik: v(11, 3) }, armN: { up: 66, lo: 104 }, armF: { up: 46, lo: 88 }, p: { ham: 96, scy: 104, shout: 1, grit: 1 } });

const HURT = pose({ x: -4, y: -1, torso: 104, head: 108, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10, armN: { up: -136, lo: -80 }, armF: { up: -30, lo: 20 }, p: { ham: -50, scy: 104, grit: 1 } });
const DEATH_SWAY = pose({ x: 2, y: -3, torso: 82, head: 66, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, armN: { up: -100, lo: -96 }, armF: { up: -82, lo: -74 }, p: { drop: 1 } });
const DEATH_FALL = pose({ x: -4, y: -9, torso: 138, head: 148, legN: { ik: v(-4, 3) }, legF: { ik: v(10, 5) }, armN: { up: 170, lo: 176 }, armF: { up: 160, lo: 170 }, p: { drop: 1 } });
const DEATH_DOWN = pose({ x: -6, y: -18, torso: 176, head: 178, legN: { up: 4, lo: -2 }, legF: { up: 10, lo: 2 }, footN: 80, footF: 80, armN: { up: 176, lo: 178 }, armF: { up: 184, lo: 180 }, p: { drop: 1 } });

/** Victory: hammer and scythe in the air, a roar, and he nearly falls over backward. */
const RAISE = pose({ torso: 98, head: 108, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, armN: { up: 62, lo: 98 }, armF: { up: 44, lo: 84 }, p: { ham: 92, scy: 102, shout: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

/** The hammer's blow, the part both versions of the A1 share. */
const hammerBlow: [Pose, number, { hit: boolean }?][] = [
  [mid(IDLE, H_WIND, 0.5), 90],
  [H_WIND, 170],
  [mid(H_WIND, H_STRIKE, 0.55), 50],
  [H_STRIKE, 90, { hit: true }],
  [H_FOLLOW, 150],
];

const char: CharDef = {
  id: 'overlord_ofentol',
  name: 'Overlord Ofentol',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 200, idle) },
    run: { loop: true, frames: cycle(8, 90, run) },
    attack1: {
      loop: false,
      frames: keys([
        ...hammerBlow,
        [mid(H_FOLLOW, S_WIND, 0.5), 70],
        [S_WIND, 130],
        [mid(S_WIND, S_STRIKE, 0.55), 50],
        [S_STRIKE, 90, { hit: true }],
        [S_FOLLOW, 170],
        [mid(S_FOLLOW, IDLE, 0.5), 110],
        [IDLE, 90],
      ]),
    },
    // the same blow when the scythe does not follow
    attack1_alone: {
      loop: false,
      frames: keys([
        ...hammerBlow,
        [mid(H_FOLLOW, IDLE, 0.5), 110],
        [IDLE, 90],
      ]),
    },
    skill: {
      loop: false,
      frames: keys([
        [mid(IDLE, R_BREATH, 0.5), 110],
        [R_BREATH, 260],
        [mid(R_BREATH, R_ROAR, 0.6), 70, { event: 'cast' }],
        [R_ROAR, 300, { hit: true }],
        [tweak(R_ROAR, { x: 1, torso: 102 }), 360],
        [mid(R_ROAR, IDLE, 0.5), 130],
        [IDLE, 90],
      ]),
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 100, head: 104 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [tweak(HURT, { p: { ...HURT.p, drop: 1 } }), 120],
        [DEATH_SWAY, 240],
        [mid(DEATH_SWAY, DEATH_FALL, 0.5), 110],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -18.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, RAISE, 0.5), 100],
        [RAISE, 500],
        [tweak(RAISE, { x: -2, torso: 104, head: 114 }), 300],
        [mid(RAISE, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

export const overlordOfentol: ChampionArt = {
  char,
  iconBg: IR,
  icons: {
    hammer_and_scythe: () =>
      compose(IR, glyph((d) => {
        // hammer and scythe crossed
        d.capsule({ mat: WD, z: 2, group: 'sn' }, v(31, 5), v(13, 29), 1.4, 1.2);
        d.ribbon({ mat: ST, z: 3, group: 'bl' }, [v(13, 29), v(18, 34), v(25, 35), v(32, 32)], [2.2, 2, 1.5, 0.6]);
        d.capsule({ mat: WD, z: 4, group: 'hd' }, v(9, 5), v(25, 26), 1.5, 1.5);
        d.poly({ mat: MAT.silver, z: 5, group: 'hh' }, [v(16, 30), v(22, 21), v(31, 27), v(25, 36)], { kind: 'bevel', w: 1.4 });
      })),
    i_am_ofentol: () =>
      compose(BL, glyph((d) => {
        // the bearded head thrown back, roaring
        d.ellipse({ mat: SK, z: 2, group: 'h' }, v(18, 26), 8, 8, 0);
        d.poly({ mat: HR, z: 3, group: 'b' }, [v(10, 22), v(26, 24), v(27, 15), v(20, 7), v(12, 11)], { kind: 'bevel', w: 1.4 });
        d.ellipse({ mat: MAT.maroon, z: 4, group: 'm' }, v(21, 20), 3.4, 2.6, 0);
        d.ellipse({ mat: MAT.red, z: 5, group: 'n' }, v(25, 26), 2.1, 2, 0);
      }), (b) => {
        // the roar going out
        for (const [x0, y0, x1, y1] of [[29, 13, 36, 10], [31, 19, 38, 19], [29, 25, 36, 28]]) {
          for (let k = 0; k <= 6; k++) b.set(Math.round(x0 + ((x1 - x0) * k) / 6), Math.round(y0 + ((y1 - y0) * k) / 6), E.white);
        }
      }),
    overlords_round: () =>
      compose(MAT.yellowCloth, glyph((d) => {
        // a beaten iron plate before a mug of ale
        d.poly({ mat: WD, z: 2, group: 'mug' }, [v(11, 9), v(26, 9), v(26, 28), v(11, 28)], { kind: 'bevel', w: 1.4 });
        d.ribbon({ mat: WD, z: 1.5, group: 'hdl' }, [v(26, 24), v(33, 23), v(33, 14), v(26, 13)], [1.4, 1.4, 1.4, 1.4]);
        d.ellipse({ mat: MAT.linen, z: 3, group: 'foam' }, v(18.5, 30), 9, 3.4, 0);
      }), (b) => impactStar(b, 10, 12, 1, 5, 6, IR.ramp[4], E.white)),
  },
};
