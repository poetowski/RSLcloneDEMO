// Brakka Ironhide, the Berserker — player damage dealer. Dual bearded axes,
// bare tanned arms, brown fur mantle, ginger mane and braided beard, red war
// paint and a red kilt. Signature color: red + fur brown.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { arm, cape, leg, smear, torsoPts } from '../parts.ts';
import { hex } from '../raster.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, v } from '../rig.ts';
import { face } from './common.ts';
import { line } from '../paint.ts';
import { axeHead, C, compose, glyph, skull } from '../icons.ts';

const D: Dims = {
  hipH: 33,
  thigh: 15.5,
  shin: 15,
  ankleH: 3,
  footLen: 6.5,
  spine: 21.5,
  neck: 7.2,
  upperArm: 13,
  foreArm: 12,
  shoulderDrop: 4.5,
  shoulderN: -3.5,
  shoulderF: 4.2,
  hipN: -2,
  hipF: 2,
};

const SK = MAT.skinTan, FUR = MAT.furBrown, LE = MAT.leather, DL = MAT.darkleather, RD = MAT.red, IR = MAT.iron, WD = MAT.wood, HR = MAT.hairGinger;

const tartan = (h: { u: number; v: number }) => (Math.abs(((h.u * 3.2) % 1) - 0.5) < 0.1 ? -1 : 0) + (Math.abs(h.v - 0.2) < 0.14 ? -1 : 0);

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const whirl = P.whirl ?? 0;

  // whirlwind swirl, back half (behind the body)
  if (whirl) swirl(d, s, whirl, false);

  // mane flowing down the back
  mane(d, s, P.hair ?? 0);

  // far leg
  leg(d, s, 'F', {
    thigh: DL, shin: DL, foot: FUR, rThigh: [4.7, 3.8], rShin: [3.6, 3.0], z: 10, shade: -1, footStyle: 'boot',
    boot: { mat: FUR, from: 0.32, r: [4.2, 3.5], cuff: FUR },
  });
  kiltFlap(d, s, 'F', 11, -1);

  // far axe + far arm
  if (info.def.smear && info.prev && P.smearF) {
    smear(d, s.hF, info.prev.pose.p.axeF ?? P.axeF, P.axeF, 20, 9, { core: ACCENT.white, edge: ACCENT.smearPeach }, 3);
  }
  axe(d, s.hF, P.axeF ?? 70, 19, -1);
  arm(d, s, 'F', { upper: SK, fore: SK, hand: SK, rUp: [4.1, 3.5], rLo: [3.5, 3.0], rHand: 3.0, z: 20, shade: -1, cuff: LE });

  // torso: bare, muscled chest
  const torso = torsoPts(s, [
    [0, 6.6, 6.6],
    [4, 6.8, 7.3],
    [9, 7.4, 8.7],
    [14, 8.2, 9.8],
    [18, 8.4, 8.8],
    [20.5, 6.6, 5.8],
    [22.2, 3.6, 3],
  ]);
  d.poly({ mat: SK, z: 30, group: 'body' }, torso, { kind: 'cyl', a: s.T(0, 1.2), b: s.T(22, 1.2), r: 8.8, bevel: 1.4 });
  const sh = SK.ramp[2];
  d.pixels({ mat: SK, z: 30.2, group: 'body' }, [
    { p: s.T(12.4, 3.4), c: sh }, { p: s.T(12.0, 4.4), c: sh }, { p: s.T(11.8, 5.4), c: sh }, { p: s.T(12.0, 6.4), c: sh }, { p: s.T(12.6, 7.4), c: sh },
    { p: s.T(8.6, 5.4), c: sh }, { p: s.T(8.6, 6.4), c: sh }, { p: s.T(5.6, 5.6), c: sh }, { p: s.T(5.6, 6.6), c: sh },
  ]);
  // harness strap + iron ring
  d.capsule({ mat: LE, z: 31, group: 'body' }, s.T(21.5, 5.5), s.T(3.5, -6.5), 1.35, 1.35);
  d.circle({ mat: IR, z: 31.2, group: 'body' }, s.T(12.6, -0.4), 1.7);
  // wide belt + big buckle
  d.poly({ mat: LE, z: 33, group: 'body' }, [s.T(4.4, -7.3), s.T(4.6, 7.8), s.T(0.2, 7.4), s.T(-0.2, -7.1)], { kind: 'cyl', a: s.T(0, 0), b: s.T(4.5, 0), r: 7.5 });
  d.circle({ mat: IR, z: 33.2, group: 'body' }, s.T(2.3, 6.6), 2.1);
  d.pixels({ mat: IR, z: 33.3, group: 'body' }, [{ p: s.T(2.3, 6.6), c: IR.ramp[1] }]);

  // kilt front flap
  const flapAng = Math.max(-122, Math.min(-58, (s.thN + s.thF) / 2));
  const f0 = s.T(0.6, -3.2), f1 = s.T(0.6, 7.2);
  const f2 = at(f1, flapAng + 7, 13), f3 = at(f0, flapAng - 4, 12);
  d.poly({ mat: RD, z: 35, group: 'skirt', tex: tartan }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 5.2, bevel: 1 });

  // fur mantle across the shoulders
  mantle(d, s);

  head(d, s, P);

  // near leg
  leg(d, s, 'N', {
    thigh: DL, shin: DL, foot: FUR, rThigh: [4.7, 3.8], rShin: [3.6, 3.0], z: 50, footStyle: 'boot',
    boot: { mat: FUR, from: 0.32, r: [4.2, 3.5], cuff: FUR },
  });
  kiltFlap(d, s, 'N', 52, 0);

  // near axe + near arm
  if (info.def.smear && info.prev && !P.smearF) {
    smear(d, s.hN, info.prev.pose.p.axeN ?? P.axeN, P.axeN, 21, 10, { core: ACCENT.white, edge: ACCENT.smearPeach }, 3);
  }
  axe(d, s.hN, P.axeN ?? 20, 58, 0);
  arm(d, s, 'N', { upper: SK, fore: SK, hand: SK, rUp: [4.2, 3.6], rLo: [3.6, 3.1], rHand: 3.1, z: 60, cuff: LE });
  furPauldron(d, s, 62);

  if (whirl) swirl(d, s, whirl, true);
}

function axe(d: Draw, hand: { x: number; y: number }, ang: number, z: number, shade: number) {
  const f = d.frame(hand, ang);
  const g = 'axe' + Math.round(z);
  d.capsule({ mat: WD, z, group: g, shade, tex: (h) => (h.u < 0.3 && Math.floor(h.u * 22) % 2 === 0 ? -1 : 0) }, f(-6, 0), f(14.5, 0), 1.3, 1.2);
  const head = [f(15.2, -0.8), f(17.6, -4.6), f(17, -9.2), f(13.4, -10.2), f(9.2, -9.6), f(6.4, -7.2), f(9.2, -3.6), f(10.4, -0.8)];
  d.poly({ mat: IR, z: z + 0.1, group: g, shade }, head, { kind: 'bevel', w: 2.2 });
  d.ribbon({ mat: MAT.silver, z: z + 0.15, group: g, shade, line: 'none' }, [f(17.3, -5), f(16.6, -8.8), f(13.3, -9.7), f(9.3, -9.1), f(7, -7.3)], [0.8, 0.8, 0.8, 0.8, 0.8]);
  d.poly({ mat: IR, z: z + 0.1, group: g, shade }, [f(14.2, 0.9), f(12.6, 4.4), f(11.2, 0.9)], { kind: 'bevel', w: 1 });
  d.capsule({ mat: IR, z: z + 0.12, group: g, shade }, f(10.4, 0), f(15, 0), 1.9, 1.9);
}

function kiltFlap(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  d.capsule({ mat: RD, z, group: 'kilt' + side, shade, tex: tartan }, at(hip, th, -1), at(hip, th, 8.5), 4.6, 4.3, 0.45);
}

function mantle(d: Draw, s: Skel) {
  const T = s.T;
  const pts = [
    T(23.4, -3), T(23, 3.8), T(20, 8.4), T(17.4, 7.0), T(16.4, 8.6), T(14.6, 5.6), T(15.6, 3.2), T(13.8, 1),
    T(15.0, -1.2), T(13.4, -3.6), T(14.8, -5.4), T(13.6, -8.2), T(16.2, -9.8), T(19.4, -10), T(22, -7.8),
  ];
  d.poly({ mat: FUR, z: 36, group: 'mantle', tex: (h, x, y) => ((x * 7 + y * 3) % 5 === 0 ? -1 : 0) }, pts, { kind: 'dome', c: T(20, -1), r: 11, bevel: 1.5 });
}

function furPauldron(d: Draw, s: Skel, z: number) {
  const c = at(at(s.sN, s.upN, 1.5), s.torso, 1.2);
  const ang = s.upN + 90;
  const f = d.frame(c, ang);
  const pts = [f(-6.6, 0), f(-5.4, 3.6), f(-2.8, 5.4), f(0, 6), f(2.8, 5.4), f(5.4, 3.6), f(6.6, 0), f(5.6, -2.6), f(4.6, -1.2), f(3.2, -3.6), f(1.8, -2), f(0, -4.2), f(-1.8, -2), f(-3.2, -3.6), f(-4.6, -1.2), f(-5.6, -2.6)];
  d.poly({ mat: FUR, z, group: 'paulN', tex: (h, x, y) => ((x * 7 + y * 3) % 5 === 0 ? -1 : 0) }, pts, { kind: 'dome', c: f(0, 2), r: 7, bevel: 1.4 });
}

function mane(d: Draw, s: Skel, sway: number) {
  const H = s.H, T = s.T;
  const pts = [
    H(-1, 7.6), H(-6.5, 5.6), H(-9.2, 1), T(19 - sway * 0.5, -9.2), T(15.5 - sway, -10.6), T(12.5 - sway, -9.8),
    T(13.4 - sway * 0.6, -8.2), T(11 - sway, -7.2), T(14.6, -6.2), H(-3.5, -4.5), H(-1, -1),
  ];
  d.poly({ mat: HR, z: 4, group: 'mane', tex: (h, x, y) => ((x + y * 2) % 4 === 0 ? -1 : 0) }, pts, { kind: 'dome', c: H(-5, 0), r: 10, bevel: 1.2 });
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'head' }, s.neck, H(0, -4), 3.9, 3.6);
  face(d, s, {
    skin: SK, z: 38, brow: HR.ramp[1], browStyle: 'angry', paint: INK.warpaint, mouth: P.shout ? 'shout' : 'none', rx: 6.4, ry: 6.9,
  });
  // beard: mustache + long beard + braid with an iron bead
  const beard = [H(-0.6, -1.6), H(2.4, -2.6), H(5.2, -2.2), H(7.0, -3.2), H(7.2, -5.6), H(6.4, -8.8), H(4.4, -11.6), H(2.2, -10.4), H(0.4, -7.8), H(-1.2, -4.4)];
  d.poly({ mat: HR, z: 38.6, group: 'head', line: 'soft' }, beard, { kind: 'dome', c: H(3, -4), r: 8, bevel: 1 });
  d.ribbon({ mat: HR, z: 38.7, group: 'head', line: 'soft' }, [H(4, -10.6), H(4.6 + (P.hair ?? 0) * 0.3, -14.8)], [1.4, 1.1]);
  d.circle({ mat: IR, z: 38.8, group: 'head' }, H(4.3, -12.4), 1.3);
  if (P.shout) d.pixels({ mat: SK, z: 38.9, group: 'head' }, [{ p: H(5.4, -4), c: INK.black }, { p: H(6.1, -4), c: INK.black }, { p: H(5.6, -5), c: ACCENT.mouthRed }]);
  // wild hair on the scalp, spiky toward the back
  const hair = [
    H(6.6, 4.4), H(4.6, 3.4), H(2, 4.2), H(-0.4, 2.4), H(-2.6, 0), H(-5.4, -2.6), H(-7.6, 1.2), H(-9.4, 3.6), H(-7.4, 5.2),
    H(-8.4, 7.6), H(-5.2, 7.6), H(-4.4, 10), H(-1.8, 8.6), H(0.4, 10.4), H(2, 8.4), H(4.6, 8.8), H(5, 7),
  ];
  d.poly({ mat: HR, z: 39, group: 'hair', tex: (h, x, y) => ((x + y * 2) % 4 === 0 ? -1 : 0) }, hair, { kind: 'dome', c: H(0, 3), r: 9, bevel: 1.2 });
}

/** Horizontal axe swirl for Whirlwind; split in a back half and a front half. */
function swirl(d: Draw, s: Skel, phase: number, front: boolean) {
  const c = s.T(14, 0);
  const o = { mat: MAT.steel, group: 'swirl', outline: false, line: 'none' as const, noClean: true };
  const from = phase * 90 + (front ? 180 : 0);
  d.arc({ ...o, z: front ? 70 : 3, color: ACCENT.swirlPeach }, c, 22, 31, from, from + 150, 0.9, 0.32);
  d.arc({ ...o, z: front ? 70.1 : 3.1, color: ACCENT.white }, c, 28, 31, from, from + 150, 0.7, 0.32);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -2,
  torso: 80,
  head: 84,
  legN: { ik: v(-11, 3) },
  legF: { ik: v(10, 3) },
  armN: { up: -112, lo: -42 },
  armF: { up: -36, lo: 34 },
  p: { axeN: 18, axeF: 82, hair: 0, whirl: 0, shout: 0, smearF: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -2 - b,
    torso: 80 - b,
    armN: { up: -112 + b * 3, lo: -42 + b * 4 },
    armF: { up: -36 + b * 2, lo: 34 + b * 2 },
    p: { axeN: 18 + b * 3, axeF: 82 - b * 2, hair: Math.sin(a) * 0.8 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const s = Math.sin(ph);
    return { x: -12 * Math.cos(ph), y: 3 + (s > 0 ? 7 * s : 0), ang: s > 0 ? -26 * s : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 2,
    torso: 70,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -70 + sw * 40, lo: -20 + sw * 40 },
    armF: { up: -70 - sw * 40, lo: -20 - sw * 40 },
    p: { axeN: -30 + sw * 40, axeF: -30 - sw * 40, hair: 2 + Math.sin(a * 2) },
  });
}

// Rending Chop: two alternating chops.
const A1_WIND = pose({
  x: -3, y: -2, torso: 96, head: 90,
  legN: { ik: v(-11, 3) }, legF: { ik: v(8, 3) },
  armN: { up: 148, lo: 168 }, armF: { up: -20, lo: 40 },
  p: { axeN: 176, axeF: 60, hair: -0.6, shout: 1 },
});
const A1_CHOP1 = pose({
  x: 6, y: -4, torso: 66, head: 78,
  legN: { ik: v(-9, 3) }, legF: { ik: v(15, 3) },
  armN: { up: 2, lo: -24 }, armF: { up: 126, lo: 150 },
  p: { axeN: -48, axeF: 168, hair: 1.4, shout: 1 },
});
const A1_CHOP2 = pose({
  x: 9, y: -5, torso: 62, head: 76,
  legN: { ik: v(-7, 3) }, legF: { ik: v(17, 3) },
  armN: { up: -150, lo: -125 }, armF: { up: -8, lo: -30 },
  p: { axeN: -150, axeF: -52, hair: 2, shout: 1, smearF: 1 },
});

// Whirlwind: spin with both axes out.
const WW_WIND = pose({
  x: -2, y: -5, torso: 74, head: 82,
  legN: { ik: v(-12, 3) }, legF: { ik: v(11, 3) },
  armN: { up: -165, lo: -175 }, armF: { up: -150, lo: -160 },
  p: { axeN: -178, axeF: -170, hair: 0.5, shout: 1 },
});
const WW_SPIN = pose({
  y: -3, torso: 86, head: 86,
  legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 2, lo: 0 }, armF: { up: 178, lo: 180 },
  p: { axeN: 10, axeF: 170, hair: 2.4, shout: 1 },
});

// Skullsplitter: leap and double overhead slam.
const SS_CROUCH = pose({
  x: -2, y: -9, torso: 68, head: 80,
  legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -150, lo: -140 }, armF: { up: -158, lo: -148 },
  p: { axeN: -150, axeF: -158, hair: 0.4, shout: 1 },
});
const SS_AIR = pose({
  y: 2, torso: 86, head: 88,
  legN: { ik: v(-7, 13) }, legF: { ik: v(7, 10) }, footN: -30, footF: -20,
  armN: { up: 122, lo: 142 }, armF: { up: 116, lo: 136 },
  p: { axeN: 178, axeF: 172, hair: -2, shout: 1 },
});
const SS_APEX = tweak(SS_AIR, { torso: 94, armN: { up: 132, lo: 158 }, armF: { up: 126, lo: 152 }, p: { axeN: 196, axeF: 190, hair: -2.5 } });
const SS_SLAM = pose({
  x: 6, y: -9, torso: 58, head: 72,
  legN: { ik: v(-10, 3) }, legF: { ik: v(13, 3) },
  armN: { up: -26, lo: -50 }, armF: { up: -20, lo: -44 },
  p: { axeN: -72, axeF: -66, hair: 2.6, shout: 1 },
});

const HURT = pose({
  x: -4, y: -1, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -150, lo: -130 }, armF: { up: -60, lo: 10 },
  p: { axeN: -140, axeF: 40, hair: -1.6, shout: 1 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -13, torso: 74, head: 62,
  legN: { ik: v(-15, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -92, lo: -92 }, armF: { up: -76, lo: -60 },
  p: { axeN: -95, axeF: -100, hair: 0.8 },
});
const DEATH_FALL = pose({
  x: 2, y: -21, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { axeN: -30, axeF: -20, hair: 1.6 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { axeN: 10, axeF: -10, hair: 2.4 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'warrior',
  name: 'Brakka Ironhide',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 140, idle) },
    run: { loop: true, frames: cycle(8, 75, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, A1_WIND, 1, 80),
        ...keys([
          [A1_WIND, 130],
          [A1_CHOP1, 60, { smear: true, hit: true }],
          [tweak(A1_CHOP1, { x: 7, torso: 64, p: { axeN: -58 } }), 110],
          [A1_CHOP2, 60, { smear: true, hit: true }],
          [tweak(A1_CHOP2, { x: 10, torso: 60, p: { axeF: -62, smearF: 1 } }), 170],
        ]),
        ...tween(D, A1_CHOP2, IDLE, 2, 100, ease.inOut),
      ],
    },
    attack2: {
      loop: false,
      frames: [
        ...keys([
          [mid(IDLE, WW_WIND, 0.5), 70],
          [WW_WIND, 150],
          [tweak(WW_SPIN, { p: { whirl: 1 } }), 60, { hit: true }],
          [tweak(WW_SPIN, { p: { whirl: 2, turn: 1 } }), 60],
          [tweak(WW_SPIN, { p: { whirl: 3 } }), 60],
          [tweak(WW_SPIN, { p: { whirl: 4, turn: 1 } }), 60],
          [tweak(WW_SPIN, { p: { whirl: 5 } }), 60, { hit: true }],
          [tweak(WW_SPIN, { p: { whirl: 6, turn: 1 } }), 60],
          [tweak(WW_SPIN, { p: { whirl: 7 } }), 60],
          [tweak(WW_SPIN, { torso: 82, p: { whirl: 0, shout: 1 } }), 200],
        ]),
        ...tween(D, WW_SPIN, IDLE, 2, 100, ease.inOut),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...keys([
          [mid(IDLE, SS_CROUCH, 0.5), 70],
          [SS_CROUCH, 170],
          [SS_AIR, 90, { event: 'jump' }],
          [SS_APEX, 180],
          [SS_SLAM, 70, { smear: true, hit: true }],
          [tweak(SS_SLAM, { y: -10, torso: 56 }), 260],
        ]),
        ...tween(D, SS_SLAM, IDLE, 2, 110, ease.inOut),
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
        [DEATH_KNEEL, 220],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -28 }), 600],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

export const warrior: ChampionArt = {
  char,
  iconBg: MAT.red,
  icons: {
    rending_chop: () =>
      compose(MAT.red, glyph((d) => {
        axeHead(d, v(9, 7), 52, 10, 21, 1.5);
      }), (b) => {
        for (let k = 0; k < 3; k++) {
          for (let i = 0; i < 18; i++) {
            const x = 8 + i + k * 4, y = 7 + i * 1.3 - k * 1;
            const c = i < 3 || i > 15 ? MAT.red.ramp[3] : i % 5 === 0 ? C.redHot : C.red;
            b.set(Math.round(x), Math.round(y), c);
            if (i > 2 && i < 16) b.set(Math.round(x) + 1, Math.round(y), MAT.red.ramp[2]);
          }
        }
      }),
    whirlwind: () =>
      compose(MAT.red, glyph((d) => {
        smear(d, v(20, 20), 90, -180, 17, 5, { core: C.white, edge: C.redHot }, 1);
        axeHead(d, v(8, 8), 45, 10, 18, 1.15);
        axeHead(d, v(32, 8), 135, 11, 18, 1.15);
      })),
    skullsplitter: () =>
      compose(MAT.red, glyph((d) => {
        skull(d, v(17, 12), 1.25, 10);
        axeHead(d, v(34, 34), 205, 12, 15, 1.35);
      }), (b) => {
        line(b, 19, 21, 17, 25, INK.eye);
        line(b, 17, 25, 19, 28, INK.eye);
        for (const [x, y] of [[8, 14], [30, 16], [10, 30], [29, 30]]) b.set(x, y, C.redHot);
      }),
  },
};
