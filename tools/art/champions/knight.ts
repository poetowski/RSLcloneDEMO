// Sir Aldric, the Lionguard — player tank. Steel plate, royal-blue tabard and
// cape, kite shield and longsword. Signature color: blue + gold.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, cape, leg, px, smear, sword, torsoPts } from '../parts.ts';
import { hex } from '../raster.ts';
import { at, Dims, Draw, ease, lerpV, pose, Pose, Skel, tweak, v } from '../rig.ts';
import { glint } from './common.ts';
import { disc, polyFill, rampDither } from '../paint.ts';
import { C, compose, glyph, impactStar, speedLines } from '../icons.ts';

const D: Dims = {
  hipH: 33,
  thigh: 15.5,
  shin: 15.5,
  ankleH: 3,
  footLen: 6,
  spine: 21,
  neck: 7.8,
  upperArm: 12.5,
  foreArm: 11.5,
  shoulderDrop: 4,
  shoulderN: -3,
  shoulderF: 3.5,
  hipN: -1.5,
  hipF: 1.5,
};

const S = MAT.steel, BL = MAT.blue, GD = MAT.gold, LE = MAT.leather;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;

  // --- cape (behind everything)
  cape(d, s, { mat: BL, z: 2, len: 31, topU: 19, topBack: 6.8, topFront: 1, spread: 7, wind: P.cape ?? 0.1, wave: P.wave ?? 0 });

  // --- far leg
  leg(d, s, 'F', { thigh: S, shin: S, foot: S, knee: S, rThigh: [4.4, 3.6], rShin: [3.4, 2.8], kneeR: 3.4, z: 10, shade: -1, footStyle: 'sabaton' });
  tasset(d, s, 'F', 11, -1);

  // --- far arm (shield arm)
  arm(d, s, 'F', { upper: S, fore: S, hand: S, rUp: [3.2, 2.8], rLo: [2.8, 2.5], rHand: 2.6, z: 20, shade: -1, elbow: S, cuff: S });
  pauldron(d, s, 'F', 29, -1);

  // --- torso: breastplate
  const torso = torsoPts(s, [
    [0, 6.2, 6.2],
    [4, 6.4, 6.8],
    [9, 7.0, 8.0],
    [13.5, 7.6, 8.9],
    [17.5, 7.8, 7.8],
    [20, 6.0, 5.0],
    [21.6, 3.2, 2.6],
  ]);
  d.poly({ mat: S, z: 30, group: 'body' }, torso, { kind: 'cyl', a: s.T(0, 0.8), b: s.T(21, 0.8), r: 8, bevel: 1.4 });

  // tabard over the chest with gold trim and the sun emblem
  const tab = [s.T(18, -0.5), s.T(17.8, 6.2), s.T(13.5, 9.0), s.T(8, 8.1), s.T(2.5, 6.9), s.T(2.5, -2.4), s.T(9, -1.8)];
  d.poly({ mat: BL, z: 31, group: 'body' }, tab, { kind: 'cyl', a: s.T(0, 2.4), b: s.T(21, 2.4), r: 8, bevel: 1 });
  d.capsule({ mat: GD, z: 31.1, group: 'body', line: 'none' }, s.T(17.9, -0.6), s.T(9, -1.9), 0.6, 0.6);
  d.capsule({ mat: GD, z: 31.1, group: 'body', line: 'none' }, s.T(9, -1.9), s.T(2.6, -2.5), 0.6, 0.6);
  sunEmblem(d, s.T(11, 4.2), 32);

  // belt
  d.poly({ mat: LE, z: 33, group: 'body' }, [s.T(3.3, -6.6), s.T(3.5, 7.0), s.T(0.6, 6.7), s.T(0.3, -6.4)], { kind: 'cyl', a: s.T(0, 0), b: s.T(4, 0), r: 7 });
  d.circle({ mat: GD, z: 33.2, group: 'body', line: 'none' }, s.T(1.9, 6.2), 1.25);

  // tabard skirt hanging between the legs
  const flapAng = Math.max(-120, Math.min(-60, (s.thN + s.thF) / 2));
  const f0 = s.T(0.8, -2.6), f1 = s.T(0.8, 6.6);
  const f2 = at(f1, flapAng + 6, 14.5), f3 = at(f0, flapAng - 4, 13.5);
  d.poly({ mat: BL, z: 35, group: 'skirt' }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 4.8, bevel: 1 });
  d.capsule({ mat: GD, z: 35.1, group: 'skirt', line: 'none' }, lerpV(f2, f3, 0.04), lerpV(f2, f3, 0.96), 0.7, 0.7);

  helmet(d, s, P.plume ?? 0);
  shield(d, s, P.shieldAng ?? 90);

  // --- near leg
  leg(d, s, 'N', { thigh: S, shin: S, foot: S, knee: S, rThigh: [4.4, 3.6], rShin: [3.4, 2.8], kneeR: 3.4, z: 50, footStyle: 'sabaton' });
  tasset(d, s, 'N', 52, 0);

  // --- sword + near arm
  const swordAng = P.swordAng ?? 60;
  if (info.def.smear && info.prev) {
    smear(d, s.hN, info.prev.pose.p.swordAng ?? swordAng, swordAng, 41, 13, { core: ACCENT.white, edge: ACCENT.smearSteel }, 3);
  }
  sword(d, s.hN, swordAng, { blade: MAT.silver, guard: GD, grip: LE, pommel: GD, len: 37, width: 3.4, guardW: 4.4, gripLen: 5, z: 58 });
  arm(d, s, 'N', { upper: S, fore: S, hand: S, rUp: [3.3, 2.9], rLo: [2.9, 2.6], rHand: 2.7, z: 60, elbow: S, cuff: S });
  pauldron(d, s, 'N', 62, 0);
  if (P.glint) glint(d, at(s.hN, swordAng, 36), P.glint, 70);
}

function tasset(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  const a = at(hip, th, -0.5), b = at(hip, th, 8.5);
  d.capsule({ mat: S, z, group: 'tasset' + side, shade }, a, b, 4.6, 4.1, 0.35);
  d.capsule({ mat: S, z: z + 0.1, group: 'tasset' + side, shade, line: 'soft' }, at(hip, th, 4.5), b, 4.5, 4.2, 0.35);
}

function pauldron(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  const c = at(at(sh, up, 1.2), s.torso, 1.0);
  d.ellipse({ mat: S, z, group: 'paul' + side, shade }, c, 6.6, 5.4, up + 90, 0.1);
  d.ellipse({ mat: S, z: z - 0.1, group: 'paul' + side, shade }, at(sh, up, 5.6), 5.4, 3.0, up + 90, 0.3);
  // gold rim along the lower edge of the main plate
  const rim = at(sh, up, 4.6);
  d.capsule({ mat: GD, z: z + 0.2, group: 'paul' + side, shade, line: 'none' }, at(rim, up + 90, -5.6), at(rim, up + 90, 5.6), 0.6, 0.6);
}

function sunEmblem(d: Draw, c: { x: number; y: number }, z: number) {
  const g = MAT.gold.ramp;
  const P = (dx: number, dy: number, k: number) => px(v(c.x + dx, c.y + dy), g[k]);
  d.pixels({ mat: MAT.blue, z, group: 'body' }, [
    P(0, 0, 5), P(-1, 0, 4), P(1, 0, 3), P(0, 1, 4), P(0, -1, 3),
    P(0, 2.6, 3), P(0, -2.6, 2), P(-2.4, 0, 3), P(2.4, 0, 2),
    P(-1.8, 1.8, 3), P(1.8, -1.8, 2), P(1.8, 1.8, 3), P(-1.8, -1.8, 2),
  ]);
}

function helmet(d: Draw, s: Skel, plume: number) {
  const H = s.H;
  const ha = s.headDir - 90;
  d.capsule({ mat: S, z: 38, group: 'head' }, s.neck, H(0.5, -4.5), 3.8, 3.4);
  const sw = plume;
  const pl = [H(-0.5, 7.6), H(-4.5, 9.8), H(-9, 9.6 + sw * 0.5), H(-13, 7.4 + sw), H(-16, 4 + sw * 1.6), H(-17.5, 0.4 + sw * 2.2)];
  d.ribbon({ mat: BL, z: 39, group: 'plume', tex: (h) => (Math.sin(h.u * 22) > 0.72 ? -1 : 0) }, pl, [1.6, 2.6, 2.8, 2.5, 1.9, 1.1]);
  d.ellipse({ mat: S, z: 40, group: 'head' }, H(-0.4, 0.6), 6.8, 7.4, ha);
  d.poly(
    { mat: S, z: 40.2, group: 'head', line: 'soft' },
    [H(1.2, 3.4), H(6.4, 2.6), H(8.6, 0.2), H(8.0, -2.6), H(5.6, -5.4), H(1.4, -6.4), H(-0.6, -2)],
    { kind: 'dome', c: H(2.5, 0.5), r: 8, bevel: 1 },
  );
  d.capsule({ mat: GD, z: 40.3, group: 'head', line: 'none' }, H(-6.3, 3.4), H(1.5, 7.7), 0.55, 0.55);
  d.circle({ mat: GD, z: 40.4, group: 'head' }, H(-0.8, 7.7), 1.4);
  const k = S.ramp[0];
  const slit = [];
  for (let x = 2.2; x <= 7.6; x += 0.9) slit.push(px(H(x, 0.9), k));
  slit.push(px(H(7.0, -2.6), k), px(H(5.4, -3.6), k));
  d.pixels({ mat: S, z: 40.5, group: 'head' }, slit);
}

function shield(d: Draw, s: Skel, ang: number) {
  // strapped to the forearm, held in front of the chest
  const c = at(lerpV(s.eF, s.hF, 0.6), s.torso - 90, 1.0);
  const f = d.frame(c, ang);
  const W = 0.9; // 3/4 foreshortening
  const outline = [f(12.5, -6.6 * W), f(14, 0), f(12.5, 6.6 * W), f(4.5, 7.5 * W), f(-5.5, 5.8 * W), f(-17, 0), f(-5.5, -5.8 * W), f(4.5, -7.5 * W)];
  const inner = outline.map((p) => lerpV(p, c, 0.15));
  d.poly({ mat: S, z: 45, group: 'shield' }, outline, { kind: 'dome', c: f(2, -1), r: 15, bevel: 1.2 });
  d.poly({ mat: BL, z: 45.1, group: 'shield', line: 'none' }, inner, { kind: 'dome', c: f(2, -1), r: 15 });
  d.capsule({ mat: GD, z: 45.2, group: 'shield', line: 'none' }, f(10.4, 0), f(-12.5, 0), 1.05, 0.8);
  d.capsule({ mat: GD, z: 45.2, group: 'shield', line: 'none' }, f(4.3, -5.1 * W), f(4.3, 5.1 * W), 1.05, 1.05);
  d.circle({ mat: GD, z: 45.3, group: 'shield' }, f(4.3, 0), 2.1);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 84,
  head: 88,
  legN: { ik: v(-9.5, 3) },
  legF: { ik: v(9.5, 3) },
  armN: { up: -100, lo: -12 },
  armF: { up: -52, lo: 28 },
  p: { swordAng: 50, shieldAng: 94, cape: 0.12, wave: 0, plume: 0, glint: 0 },
});

function idle(t: number): Pose {
  const b = Math.round((1 - Math.cos(t * Math.PI * 2)) / 2); // whole-pixel breathing
  return tweak(IDLE, {
    y: -b,
    armN: { up: -100 + b * 2, lo: -12 + b * 3 },
    armF: { up: -52 + b * 2, lo: 28 },
    p: { swordAng: 50 + b * 2, wave: t * Math.PI * 2, plume: Math.sin(t * Math.PI * 2) * 0.8, cape: 0.12 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const s = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (s > 0 ? 8 * s : 0), ang: s > 0 ? -28 * s : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const swing = Math.cos(a);
  return pose({
    y: bob - 1,
    torso: 74,
    head: 84,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -62 + swing * 30, lo: -10 + swing * 30 },
    armF: { up: -30 - swing * 8, lo: 30 },
    p: { swordAng: 24 + swing * 14, shieldAng: 98, cape: 0.85, wave: a * 2, plume: 2.2 + Math.sin(a * 2) * 0.6 },
  });
}

// Valiant Strike: overhead diagonal slash.
const A1_WIND = pose({
  x: -3, y: -1, torso: 97, head: 92,
  legN: { ik: v(-10, 3) }, legF: { ik: v(8, 3) },
  armN: { up: 150, lo: 150 },
  armF: { up: -25, lo: 40 },
  p: { swordAng: 170, shieldAng: 96, cape: 0.2, wave: 1, plume: -0.5 },
});
const A1_PEAK = tweak(A1_WIND, { x: -4, torso: 99, armN: { up: 158, lo: 168 }, p: { swordAng: 186, wave: 1.4, plume: -0.8 } });
const A1_HIT = pose({
  x: 7, y: -4, torso: 66, head: 80,
  legN: { ik: v(-8, 3) }, legF: { ik: v(17, 3) }, footN: -10,
  armN: { up: 8, lo: -8 },
  armF: { up: -70, lo: -10 },
  p: { swordAng: -28, shieldAng: 100, cape: 0.5, wave: 2.4, plume: 1.6 },
});
const A1_FOLLOW = tweak(A1_HIT, { x: 8, y: -5, torso: 63, armN: { up: -30, lo: -48 }, p: { swordAng: -62, wave: 3, plume: 1.2 } });
const A1_SETTLE = tweak(A1_FOLLOW, { x: 6, y: -4, torso: 68, armN: { up: -45, lo: -40 }, p: { swordAng: -50, wave: 3.6, plume: 0.6 } });

// Shield Bash: shoulder into the shield, stun.
const A2_WIND = pose({
  x: -4, y: -3, torso: 98, head: 90,
  legN: { ik: v(-11, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -140, lo: -95 },
  armF: { up: -95, lo: 50 },
  p: { swordAng: 125, shieldAng: 100, cape: 0.2, wave: 1, plume: -0.4 },
});
const A2_HIT = pose({
  x: 9, y: -3, torso: 66, head: 82,
  legN: { ik: v(-6, 3) }, legF: { ik: v(19, 3) }, footN: -22,
  armN: { up: -150, lo: -110 },
  armF: { up: 2, lo: 10 },
  p: { swordAng: 150, shieldAng: 78, cape: 0.7, wave: 2.2, plume: 2 },
});
const A2_PUSH = tweak(A2_HIT, { x: 10, torso: 64, armF: { up: 6, lo: 12 }, p: { shieldAng: 76, wave: 2.8, plume: 1.6 } });

// Aegis Oath: sword raised to the sky, holy light.
const A3_RAISE = pose({
  x: -1, torso: 90, head: 96,
  legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 60, lo: 85 },
  armF: { up: -60, lo: 10 },
  p: { swordAng: 84, shieldAng: 92, cape: 0.25, wave: 0.5, plume: -0.3 },
});
const A3_HIGH = pose({
  x: -1, y: 1, torso: 93, head: 100,
  legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 97, lo: 93 },
  armF: { up: -72, lo: -36 },
  p: { swordAng: 91, shieldAng: 90, cape: 0.45, wave: 1.2, plume: -1.2 },
});

const HURT = pose({
  x: -4, torso: 101, head: 104,
  legN: { ik: v(-11, 3) }, legF: { ik: v(7, 4) }, footF: 10,
  armN: { up: -150, lo: -120 },
  armF: { up: -20, lo: 40 },
  p: { swordAng: 140, shieldAng: 104, cape: 0.3, wave: 2, plume: -1.4 },
});

const DEATH_KNEEL = pose({
  x: -2, y: -13, torso: 76, head: 66,
  legN: { ik: v(-15, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -95, lo: -95 },
  armF: { up: -70, lo: -40 },
  p: { swordAng: -100, shieldAng: 80, cape: 0.1, wave: 1, plume: 0.8 },
});
const DEATH_FALL = pose({
  x: 2, y: -21, torso: 32, head: 18,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 },
  armF: { up: -40, lo: -10 },
  p: { swordAng: -40, shieldAng: 30, cape: 0.2, wave: 1.6, plume: 1.4 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 },
  armF: { up: -8, lo: -4 },
  p: { swordAng: 2, shieldAng: -4, cape: 0.05, wave: 2, plume: 2.5 },
});

const char: CharDef = {
  id: 'knight',
  name: 'Sir Aldric',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 150, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...keys([
          [A1_WIND, 90],
          [A1_PEAK, 160],
          [A1_HIT, 60, { smear: true, hit: true }],
          [A1_FOLLOW, 90],
          [A1_SETTLE, 160],
        ]),
        ...tween(D, A1_SETTLE, IDLE, 2, 90, ease.inOut),
      ],
    },
    attack2: {
      loop: false,
      frames: [
        ...tween(D, IDLE, A2_WIND, 1, 90),
        ...keys([
          [A2_WIND, 170],
          [A2_HIT, 70, { hit: true }],
          [A2_PUSH, 170],
        ]),
        ...tween(D, A2_PUSH, IDLE, 2, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...keys([
          [A3_RAISE, 100],
          [A3_HIGH, 120, { event: 'cast' }],
          [tweak(A3_HIGH, { p: { glint: 1, wave: 1.6 } }), 100, { hit: true }],
          [tweak(A3_HIGH, { p: { glint: 2, wave: 2.0 } }), 100],
          [tweak(A3_HIGH, { p: { glint: 3, wave: 2.4 } }), 120],
          [tweak(A3_HIGH, { p: { glint: 0, wave: 2.8 } }), 160],
        ]),
        ...tween(D, A3_HIGH, IDLE, 2, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 97, head: 99 }), 110],
        [lerpPoseD(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [lerpPoseD(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 220],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -28 }), 600],
      ]),
    },
  },
};

function lerpPoseD(a: Pose, b: Pose, t: number) {
  return tween(D, a, b, 1, 0, () => t)[0].pose;
}

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

export const knight: ChampionArt = {
  char,
  iconBg: MAT.blue,
  icons: {
    valiant_strike: () =>
      compose(MAT.blue, glyph((d) => {
        smear(d, v(9, 9), 150, -20, 33, 9, { core: C.white, edge: C.pale }, 1);
        sword(d, v(11, 11), 45, { blade: MAT.silver, guard: MAT.gold, grip: MAT.leather, pommel: MAT.gold, len: 27, width: 5, guardW: 6.5, gripLen: 5, z: 10 });
      })),
    shield_bash: () =>
      compose(MAT.blue, glyph((d) => {
        const f = d.frame(v(17, 20), 100);
        const pts = [f(13, -8), f(14.5, 0), f(13, 8), f(4, 9), f(-6, 7), f(-17, 0), f(-6, -7), f(4, -9)];
        const c = f(1, 0);
        d.poly({ mat: MAT.steel, z: 10, group: 'sh' }, pts, { kind: 'dome', c: f(3, -2), r: 18, bevel: 1.5 });
        d.poly({ mat: MAT.blue, z: 10.1, group: 'sh', line: 'none' }, pts.map((p) => ({ x: p.x + (c.x - p.x) * 0.16, y: p.y + (c.y - p.y) * 0.16 })), { kind: 'dome', c: f(3, -2), r: 18 });
        d.capsule({ mat: MAT.gold, z: 10.2, group: 'sh', line: 'none' }, f(11, 0), f(-13, 0), 1.4, 1.1);
        d.capsule({ mat: MAT.gold, z: 10.2, group: 'sh', line: 'none' }, f(4, -6), f(4, 6), 1.4, 1.4);
        d.circle({ mat: MAT.gold, z: 10.3, group: 'sh' }, f(4, 0), 2.4);
      }), (b) => {
        impactStar(b, 31, 19, 0, 7, 7, C.goldHot, C.white);
        speedLines(b, [[3, 12, 8, 12], [3, 26, 7, 26], [4, 30, 8, 30]], C.pale);
      }),
    aegis_oath: () =>
      compose(MAT.blue, glyph((d) => {
        sword(d, v(20, 10), 90, { blade: MAT.silver, guard: MAT.gold, grip: MAT.leather, pommel: MAT.gold, len: 26, width: 5, guardW: 7, gripLen: 5, z: 10 });
      }), (b) => {
        const glow = MAT.glowGold.ramp.slice(2);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const len = i % 2 ? 11 : 17;
          polyFill(b, [[20 + Math.cos(a + 0.18) * 4, 24 + Math.sin(a + 0.18) * 4], [20 + Math.cos(a) * len, 24 + Math.sin(a) * len], [20 + Math.cos(a - 0.18) * 4, 24 + Math.sin(a - 0.18) * 4]], (x, y) => rampDither(glow, 2.6 - Math.hypot(x - 20, y - 24) / 8, x, y));
        }
        disc(b, 20, 24, 5, (x, y, dd) => rampDither(glow, 3.6 - dd * 1.5, x, y));
      }),
  },
};
