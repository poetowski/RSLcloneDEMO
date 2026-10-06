// Master Tenzo, the Iron Fist — enemy support/striker. Bald, long white
// moustache, saffron robe over one shoulder, maroon sash and pants, white
// hand wraps and big prayer beads. Signature color: saffron + maroon.
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { foot, smear, torsoPts } from '../parts.ts';
import { hex, RGBA } from '../raster.ts';
import { at, Dims, Draw, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face, glint } from './common.ts';
import { line } from '../paint.ts';
import { withAlpha } from '../raster.ts';
import { Material } from '../palette.ts';
import { C, compose, glyph, impactStar, speedLines as iconSpeedLines } from '../icons.ts';

const D: Dims = {
  hipH: 33,
  thigh: 15.5,
  shin: 15.5,
  ankleH: 3,
  footLen: 6,
  spine: 21.5,
  neck: 7.6,
  upperArm: 12.5,
  foreArm: 11.5,
  shoulderDrop: 4,
  shoulderN: -3,
  shoulderF: 3.4,
  hipN: -1.6,
  hipF: 1.6,
};

const SK = MAT.skinBrown, SF = MAT.saffron, MR = MAT.maroon, WR = MAT.wrap, WD = MAT.wood, HW = MAT.hairSilver;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;

  sashTails(d, s, P.wind ?? 0.1, P.wave ?? 0);

  monkLeg(d, s, 'F', 10, -1);
  monkArm(d, s, 'F', 20, -1, P.palmF ? 'palm' : 'fist');

  // torso: bare skin under the robe
  const torso = torsoPts(s, [
    [0, 6.0, 6.0],
    [4, 6.0, 6.4],
    [9, 6.6, 7.8],
    [13.5, 7.4, 8.6],
    [17.5, 7.6, 7.6],
    [19.8, 5.8, 4.8],
    [21.2, 3.2, 2.6],
  ]);
  d.poly({ mat: SK, z: 30, group: 'body' }, torso, { kind: 'cyl', a: s.T(0, 0.8), b: s.T(21, 0.8), r: 7.8, bevel: 1.4 });
  // robe draped over the far shoulder, across the chest
  const robe = [s.T(21.2, 2.4), s.T(19.8, 5.2), s.T(17.6, 7.8), s.T(13.6, 8.8), s.T(8, 7.9), s.T(1.2, 6.4), s.T(1.2, -6.2), s.T(8, -6.8), s.T(12.6, -5.4), s.T(16.4, -1.6)];
  d.poly({ mat: SF, z: 31, group: 'body', shade: 1, tex: (h) => (Math.sin(h.v * 7 + 1.2) > 0.7 ? -1 : 0) }, robe, { kind: 'cyl', a: s.T(0, 1.5), b: s.T(21, 1.5), r: 7.8, bevel: 1.2 });
  d.capsule({ mat: MR, z: 31.1, group: 'body', line: 'none' }, s.T(16.4, -1.7), s.T(21.1, 2.3), 0.7, 0.7);
  d.capsule({ mat: MR, z: 31.1, group: 'body', line: 'none' }, s.T(16.4, -1.7), s.T(12.4, -5.6), 0.7, 0.7);
  // sash with a knot
  d.poly({ mat: MR, z: 33, group: 'body' }, [s.T(4, -6.6), s.T(4.2, 7.0), s.T(0.4, 6.7), s.T(0.2, -6.4)], { kind: 'cyl', a: s.T(0, 0), b: s.T(4, 0), r: 7 });
  d.ellipse({ mat: MR, z: 33.2, group: 'knot' }, s.T(2.2, 6.4), 2.0, 2.4, s.torso);
  const kn = s.T(1.2, 6.6);
  const hang = Math.max(-115, Math.min(-65, s.thF - 4));
  d.ribbon({ mat: MR, z: 33.1, group: 'knot' }, [kn, at(kn, hang, 5), at(kn, hang + 6, 10)], [1.5, 1.4, 1.1]);

  // robe skirt front flap
  const flapAng = Math.max(-122, Math.min(-58, (s.thN + s.thF) / 2));
  const f0 = s.T(0.4, -2.6), f1 = s.T(0.4, 6.6);
  const f2 = at(f1, flapAng + 6, 11), f3 = at(f0, flapAng - 4, 10);
  d.poly({ mat: SF, z: 35, group: 'skirt' }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 5, bevel: 1 });

  head(d, s, P);
  beads(d, s);

  monkLeg(d, s, 'N', 50, 0);
  monkArm(d, s, 'N', 60, 0, P.palmN ? 'palm' : 'fist');

  if (P.punchN) speedLines(d, s.hN, s.loN, 70);
  if (P.punchF) speedLines(d, s.hF, s.loF, 70);
  if (P.kick) speedLines(d, s.ankN, s.thN, 70, 1.4);
  if (P.chi) {
    const c = lerpV(s.hN, s.hF, 0.5);
    glint(d, c, P.chi, 72, ACCENT.white, ACCENT.chiGold);
  }
}

function monkLeg(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const kn = side === 'N' ? s.kneeN : s.kneeF;
  const an = side === 'N' ? s.ankN : s.ankF;
  const fa = side === 'N' ? s.pose.footN : s.pose.footF;
  const g = 'leg' + side;
  // baggy pants balloon at the knee and gather at the ankle wraps
  d.capsule({ mat: SF, z, group: g, shade, tex: (h) => (Math.sin(h.u * 9) > 0.75 ? -1 : 0) }, hip, kn, 5.0, 4.6);
  d.capsule({ mat: SF, z: z + 0.1, group: g, shade }, kn, lerpV(kn, an, 0.78), 4.4, 3.0);
  d.capsule({ mat: WR, z: z + 0.2, group: g, shade, tex: (h) => (Math.floor(h.u * 6) % 2 === 0 ? -1 : 0) }, lerpV(kn, an, 0.72), an, 2.7, 2.3);
  foot(d, an, fa, SK, { z: z + 0.3, group: g, shade }, 'bare');
}

function monkArm(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number, hand: 'fist' | 'palm') {
  const sh = side === 'N' ? s.sN : s.sF;
  const el = side === 'N' ? s.eN : s.eF;
  const ha = side === 'N' ? s.hN : s.hF;
  const lo = side === 'N' ? s.loN : s.loF;
  const g = 'arm' + side;
  d.capsule({ mat: SK, z, group: g, shade }, sh, el, 3.5, 3.0);
  d.capsule({ mat: SK, z: z + 0.1, group: g, shade }, el, ha, 3.0, 2.6);
  d.capsule({ mat: WR, z: z + 0.2, group: g, shade, tex: (h) => (Math.floor(h.u * 5) % 2 === 0 ? -1 : 0) }, at(ha, lo, -6.5), at(ha, lo, -1.2), 2.8, 2.9);
  if (hand === 'palm') {
    // open palm, fingers up
    d.ellipse({ mat: WR, z: z + 0.3, group: g, shade }, at(ha, lo, 1.4), 1.8, 3.2, 90);
    d.ellipse({ mat: SK, z: z + 0.35, group: g, shade }, at(at(ha, lo, 1.4), 90, 2.4), 1.6, 1.8, 90);
  } else {
    d.ellipse({ mat: WR, z: z + 0.3, group: g, shade }, ha, 3.1, 2.8, lo);
  }
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'head' }, s.neck, H(0, -4), 3.2, 3.0);
  face(d, s, { skin: SK, z: 38, brow: HW.ramp[4], browStyle: P.calm ? 'calm' : 'angry', ear: 'human', mouth: 'none', rx: 6.3, ry: 6.9 });
  const h = HW.ramp;
  const pts: { p: V; c: RGBA }[] = [
    // red forehead mark
    { p: H(4.2, 3.6), c: ACCENT.bindi },
    // bushy brow extension
    { p: H(2.0, 2.6), c: h[4] },
  ];
  if (P.calm) {
    // closed eyes: a short line replaces the pupil
    pts.push({ p: H(2.8, 0.4), c: SK.ramp[1] }, { p: H(3.6, 0.2), c: SK.ramp[1] });
  }
  d.pixels({ mat: SK, z: 38.4, group: 'head' }, pts);
  // long drooping moustache + small goatee
  d.ribbon({ mat: HW, z: 38.6, group: 'head' }, [H(6.2, -2.6), H(5.6, -3.6), H(5.4, -6.4), H(5.8, -9.6 - (P.wave ? Math.sin(P.wave) * 0.4 : 0))], [1.0, 1.1, 0.9, 0.7]);
  d.ribbon({ mat: HW, z: 38.55, group: 'head' }, [H(4.6, -2.8), H(3.4, -4.0), H(2.6, -7.0), H(2.4, -9.4)], [1.0, 1.0, 0.85, 0.6]);
  d.ellipse({ mat: HW, z: 38.5, group: 'head' }, H(4.6, -6.4), 1.3, 1.8, s.headDir - 90);
}

function beads(d: Draw, s: Skel) {
  const pts: V[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const u = 20.4 - Math.sin(t * Math.PI) * 9.5;
    const w = -2.6 + t * 9.6;
    pts.push(s.T(u, w));
  }
  pts.forEach((p, i) => {
    if (i === 0 || i === 8) return;
    const big = i === 4;
    d.circle({ mat: big ? MR : WD, z: 36 + i * 0.01, group: 'bead' + i, line: 'soft' }, p, big ? 1.8 : 1.3);
  });
}

function sashTails(d: Draw, s: Skel, wind: number, wave: number) {
  const k = s.T(1.6, -6.2);
  const ang = -100 - wind * 70;
  for (const [i, len] of [[0, 16], [1, 12]] as const) {
    const a = ang + i * 10;
    const p1 = at(k, a + Math.sin(wave + i) * 6, len * 0.5);
    const p2 = at(p1, a + Math.sin(wave + 1 + i) * 10, len * 0.5);
    d.ribbon({ mat: MR, z: 2 + i * 0.1, group: 'tail' + i, shade: i ? -1 : 0 }, [k, p1, p2], [1.8, 1.7, 1.2], 0.4);
  }
}

function speedLines(d: Draw, at0: V, ang: number, z: number, scale = 1) {
  const pts: { p: V; c: RGBA }[] = [];
  const w = ACCENT.white, t = ACCENT.speedGold;
  for (const off of [-2.5, 0, 2.5]) {
    for (let i = 3; i < 3 + 7 * scale; i++) {
      const p = at(at(at0, ang, -i), ang + 90, off);
      pts.push({ p, c: i < 6 ? w : t });
    }
  }
  d.pixels({ mat: MAT.wrap, z, group: 'fx', outline: false, line: 'none' }, pts);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -3,
  torso: 88,
  head: 88,
  legN: { ik: v(-12, 3) },
  legF: { ik: v(12, 3) },
  armN: { up: -128, lo: 8 },
  armF: { up: -16, lo: 22 },
  p: { palmF: 1, wind: 0.15, wave: 0, calm: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -3 - b,
    armN: { up: -128 + b * 2, lo: 8 + b * 2 },
    armF: { up: -16 + b * 3, lo: 22 + b * 3 },
    p: { wave: a, wind: 0.15 + Math.sin(a) * 0.05 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const ft = (ph: number) => {
    const s = Math.sin(ph);
    return { x: -12 * Math.cos(ph), y: 3 + (s > 0 ? 8 * s : 0), ang: s > 0 ? -30 * s : 0 };
  };
  const n = ft(a), f = ft(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 1,
    torso: 70,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -60 + sw * 45, lo: 10 + sw * 40 },
    armF: { up: -60 - sw * 45, lo: 10 - sw * 40 },
    p: { wind: 0.9, wave: a * 2 },
  });
}

// Flurry of Fists: jab, cross, palm.
const FL_READY = pose({
  x: -2, y: -5, torso: 92, head: 88,
  legN: { ik: v(-12, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -132, lo: 12 }, armF: { up: -110, lo: 40 },
  p: { wind: 0.2, wave: 1 },
});
const FL_JAB = pose({
  x: 4, y: -5, torso: 80, head: 84,
  legN: { ik: v(-11, 3) }, legF: { ik: v(13, 3) },
  armN: { up: -132, lo: 10 }, armF: { up: 2, lo: 2 },
  p: { wind: 0.5, wave: 1.6, punchF: 1 },
});
const FL_CROSS = pose({
  x: 7, y: -6, torso: 72, head: 80,
  legN: { ik: v(-9, 3) }, legF: { ik: v(14, 3) },
  armN: { up: 0, lo: -2 }, armF: { up: -120, lo: 40 },
  p: { wind: 0.6, wave: 2.2, punchN: 1 },
});
const FL_PALM = pose({
  x: 10, y: -7, torso: 70, head: 80,
  legN: { ik: v(-7, 3) }, legF: { ik: v(17, 3) },
  armN: { up: -140, lo: 0 }, armF: { up: 4, lo: 8 },
  p: { wind: 0.7, wave: 2.8, palmF: 1, punchF: 1 },
});

// Serenity: palms together, then open to heal allies.
const SE_PRAY = pose({
  y: -2, torso: 90, head: 80,
  legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) },
  armN: { ik: v(9, 47), bend: -1 }, armF: { ik: v(9.5, 47), bend: -1 },
  p: { palmN: 1, palmF: 1, wind: 0.2, wave: 0.6, calm: 1 },
});
const SE_OPEN = pose({
  y: -1, torso: 94, head: 96,
  legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 150, lo: 165 }, armF: { up: 40, lo: 55 },
  p: { palmN: 1, palmF: 1, wind: 0.4, wave: 1.4, calm: 1 },
});

// Dragon Kick: leap and flying kick.
const DK_CROUCH = pose({
  x: -2, y: -11, torso: 74, head: 82,
  legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -160, lo: -140 }, armF: { up: -150, lo: -130 },
  p: { wind: 0.2, wave: 1 },
});
const DK_AIR = pose({
  x: 0, y: 4, torso: 108, head: 96,
  legN: { up: -40, lo: -110 }, legF: { up: -110, lo: -170 },
  armN: { up: -150, lo: -120 }, armF: { up: 10, lo: 60 },
  footN: -40, footF: -60,
  p: { wind: 0.7, wave: 2 },
});
const DK_KICK = pose({
  x: 6, y: 4, torso: 118, head: 98,
  legN: { up: 6, lo: 4 }, legF: { up: -120, lo: -175 },
  armN: { up: -170, lo: -150 }, armF: { up: 30, lo: 70 },
  footN: 10, footF: -70,
  p: { wind: 0.9, wave: 2.6, kick: 1 },
});
const DK_LAND = pose({
  x: 8, y: -9, torso: 76, head: 84,
  legN: { ik: v(-6, 3) }, legF: { ik: v(16, 3) },
  armN: { up: -140, lo: 0 }, armF: { up: -20, lo: 30 },
  p: { wind: 0.4, wave: 3.2, palmF: 1 },
});

const HURT = pose({
  x: -4, y: -2, torso: 102, head: 108,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -150, lo: -120 }, armF: { up: -60, lo: 10 },
  p: { wind: 0.3, wave: 2 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -13, torso: 74, head: 60,
  legN: { ik: v(-15, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -92, lo: -92 }, armF: { up: -76, lo: -60 },
  p: { wind: 0.1, wave: 1, calm: 1 },
});
const DEATH_FALL = pose({
  x: 2, y: -21, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { wind: 0.2, wave: 1.6, calm: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { wind: 0.05, wave: 2, calm: 1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'monk',
  name: 'Master Tenzo',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 140, idle) },
    run: { loop: true, frames: cycle(8, 70, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, FL_READY, 0.5), 60],
        [FL_READY, 110],
        [FL_JAB, 70, { hit: true }],
        [tweak(FL_JAB, { p: { punchF: 0 } }), 60],
        [FL_CROSS, 70, { hit: true }],
        [tweak(FL_CROSS, { p: { punchN: 0 } }), 60],
        [FL_PALM, 80, { hit: true }],
        [tweak(FL_PALM, { x: 10, torso: 68, p: { punchF: 0, wave: 3.2 } }), 200],
        [mid(FL_PALM, IDLE, 0.5), 100],
        [IDLE, 90],
      ]),
    },
    skill: {
      loop: false,
      frames: keys([
        [mid(IDLE, SE_PRAY, 0.5), 90],
        [SE_PRAY, 160],
        [tweak(SE_PRAY, { p: { chi: 1, wave: 0.9 } }), 110, { event: 'cast' }],
        [tweak(SE_PRAY, { p: { chi: 2, wave: 1.2 } }), 110],
        [tweak(SE_PRAY, { p: { chi: 3, wave: 1.5 } }), 110],
        [SE_OPEN, 90, { hit: true }],
        [tweak(SE_OPEN, { p: { wave: 1.8 } }), 260],
        [mid(SE_OPEN, IDLE, 0.5), 110],
        [IDLE, 90],
      ]),
    },
    attack3: {
      loop: false,
      frames: keys([
        [mid(IDLE, DK_CROUCH, 0.5), 70],
        [DK_CROUCH, 170],
        [DK_AIR, 90, { event: 'jump' }],
        [mid(DK_AIR, DK_KICK, 0.5), 60],
        [DK_KICK, 90, { hit: true }],
        [tweak(DK_KICK, { p: { kick: 0, wave: 3 } }), 120],
        [DK_LAND, 200],
        [mid(DK_LAND, IDLE, 0.5), 100],
        [IDLE, 90],
      ]),
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 98, head: 100 }), 110],
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

export { INK };

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

export const monk: ChampionArt = {
  char,
  iconBg: MAT.saffron,
  icons: {
    flurry: () =>
      compose(MAT.saffron, glyph((d) => {
        // wrapped forearm + clenched fist seen from the side, punching right
        d.capsule({ mat: MAT.wrap, z: 10, group: 'fist', tex: (h) => (Math.floor(h.u * 6) % 2 === 0 ? -1 : 0) }, v(3, 15), v(17, 19), 4.4, 4.6);
        d.poly({ mat: MAT.skinBrown, z: 10.2, group: 'fist' }, [v(15, 12.5), v(16, 26.5), v(26, 27.5), v(30.5, 25), v(31, 15), v(28, 12)], { kind: 'bevel', w: 2.4 });
        const k = MAT.skinBrown.ramp[1];
        const o = { mat: MAT.skinBrown, z: 10.3, group: 'fist', line: 'none' as const };
        d.line(o, v(26, 24.5), v(30, 24.5), k);
        d.line(o, v(26, 21), v(30.5, 21), k);
        d.line(o, v(26, 17.5), v(30.5, 17.5), k);
        d.line(o, v(25.5, 27), v(25.5, 13), k);
        d.ellipse({ mat: MAT.skinBrown, z: 10.4, group: 'thumb', line: 'soft' }, v(21.5, 14.5), 4.6, 2.4, 8);
      }), (b) => {
        iconSpeedLines(b, [[2, 12, 9, 12], [3, 20, 7, 20], [2, 28, 9, 28], [4, 24, 8, 24]], C.white);
        impactStar(b, 34, 19, 2, 7, 10, C.orange, C.goldHot);
      }),
    serenity: () =>
      compose(MAT.saffron, glyph((d) => {
        const petal = (ang: number, len: number, z: number, mat: Material) => {
          const f = d.frame(v(20, 10), ang);
          d.poly({ mat, z, group: 'p' + z }, [f(0, 0), f(len * 0.45, 3.4), f(len, 0), f(len * 0.45, -3.4)], { kind: 'bevel', w: 2 });
        };
        petal(150, 13, 10, MAT.wrap);
        petal(30, 13, 10.1, MAT.wrap);
        petal(120, 15, 10.2, MAT.saffron);
        petal(60, 15, 10.3, MAT.saffron);
        petal(90, 17, 10.4, MAT.glowGold);
      }), (b) => {
        for (let i = 0; i < 9; i++) {
          const a = Math.PI + (i / 8) * Math.PI;
          line(b, 20 + Math.cos(a) * 12, 22 + Math.sin(a) * 12, 20 + Math.cos(a) * 17, 22 + Math.sin(a) * 17, i % 2 ? withAlpha(C.green, 200) : C.goldHot);
        }
      }),
    dragon_kick: () =>
      compose(MAT.saffron, glyph((d) => {
        smear(d, v(8, 6), 200, 40, 30, 10, { core: C.smearSun, edge: C.orange }, 2);
        d.capsule({ mat: MAT.saffron, z: 10, group: 'leg' }, v(4, 8), v(15, 19), 5.2, 4.4);
        d.capsule({ mat: MAT.wrap, z: 10.1, group: 'leg', tex: (h) => (Math.floor(h.u * 5) % 2 === 0 ? -1 : 0) }, v(14, 18), v(20, 24), 3.4, 3.1);
        const f = d.frame(v(21, 25), 40);
        d.poly({ mat: MAT.skinBrown, z: 10.2, group: 'leg' }, [f(-2.5, 3.6), f(-3.4, -3.2), f(9.5, -3.6), f(12.4, -0.6), f(10, 2.4), f(2, 4)], { kind: 'bevel', w: 1.8 });
      }), (b) => impactStar(b, 31, 9, 2, 7, 8, C.orange, C.goldHot)),
  },
};
