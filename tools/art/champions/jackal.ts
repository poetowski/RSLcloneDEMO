// Kha'zir, the Jackal Warden — Sunscar tank. Black lacquered jackal mask with
// tall ears and amber eyes, striped lapis headcloth, bronze scale cuirass,
// broad turquoise collar, linen kilt and a tall khopesh-glaive.
// Signature color: turquoise + bronze. Silhouette: the ears and the glaive.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { C, compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { ellipseRing, line } from '../paint.ts';
import { arm, leg, smear, torsoPts } from '../parts.ts';
import { withAlpha } from '../raster.ts';
import { Tex } from '../render.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, solve, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 34,
  thigh: 16,
  shin: 16,
  ankleH: 3,
  footLen: 6.5,
  spine: 21.5,
  neck: 8,
  upperArm: 13,
  foreArm: 12,
  shoulderDrop: 4.2,
  shoulderN: -3.2,
  shoulderF: 3.8,
  hipN: -1.8,
  hipF: 1.8,
};

const SK = MAT.skinDeep, BZ = MAT.bronze, GD = MAT.gold, LN = MAT.linen, TQ = MAT.turquoise, LP = MAT.lapis, JK = MAT.jackal, AM = MAT.glowAmber;

/** Overlapping bronze scales in torso-local coordinates. */
const scales: Tex = (h) => {
  const r = h.u * 9;
  const c = (h.v + 1) * 3.5 + (Math.floor(r) % 2) * 0.5;
  return r % 1 > 0.74 || Math.abs((c % 1) - 0.5) > 0.43 ? -1 : 0;
};

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const ang = P.glaiveAng ?? 92;

  // headcloth hanging down the back (lapis with gold stripes)
  headcloth(d, s, P.cloth ?? 0);

  if (info.def.smear && info.prev) {
    smear(d, s.hN, info.prev.pose.p.glaiveAng ?? ang, ang, 46, 13, { core: ACCENT.smearSun, edge: ACCENT.smearGold }, 3);
  }

  // far leg: skin, bronze greave, sandal
  leg(d, s, 'F', {
    thigh: SK, shin: SK, foot: SK, rThigh: [4.4, 3.6], rShin: [3.3, 2.7], z: 10, shade: -1, footStyle: 'bare',
    boot: { mat: BZ, from: 0.48, r: [3.6, 3.0] },
  });
  kiltFlap(d, s, 'F', 11, -1);

  // far arm
  arm(d, s, 'F', { upper: SK, fore: SK, hand: SK, rUp: [3.7, 3.2], rLo: [3.2, 2.9], rHand: 2.9, z: 20, shade: -1, cuff: BZ });
  armband(d, s, 'F', 20.5, -1);

  // torso: bronze scale cuirass
  const torso = torsoPts(s, [
    [0, 6.2, 6.4],
    [4, 6.4, 7.0],
    [9, 7.0, 8.2],
    [14, 7.8, 9.2],
    [18, 8.0, 8.0],
    [20.6, 6.2, 5.2],
    [22.2, 3.4, 2.8],
  ]);
  d.poly({ mat: BZ, z: 30, group: 'body', tex: scales }, torso, { kind: 'cyl', a: s.T(0, 1), b: s.T(22, 1), r: 8.4, bevel: 1.4 });

  // broad collar: concentric bands of gold, turquoise and lapis around the neck
  collar(d, s, 31);

  // belt + kilt apron
  d.poly({ mat: GD, z: 33, group: 'body' }, [s.T(3.6, -6.8), s.T(3.8, 7.2), s.T(0.4, 6.9), s.T(0.2, -6.6)], { kind: 'cyl', a: s.T(0, 0), b: s.T(4, 0), r: 7.2 });
  d.pixels({ mat: GD, z: 33.2, group: 'body' }, [-4, -1, 2, 5].map((w) => ({ p: s.T(2, w), c: TQ.ramp[4] })));
  apron(d, s, 35);

  helmet(d, s, P);

  // near leg
  leg(d, s, 'N', {
    thigh: SK, shin: SK, foot: SK, rThigh: [4.4, 3.6], rShin: [3.3, 2.7], z: 50, footStyle: 'bare',
    boot: { mat: BZ, from: 0.48, r: [3.6, 3.0] },
  });
  kiltFlap(d, s, 'N', 52, 0);

  glaive(d, s.hN, ang, 57);
  arm(d, s, 'N', { upper: SK, fore: SK, hand: SK, rUp: [3.8, 3.3], rLo: [3.3, 3.0], rHand: 3.0, z: 60, cuff: BZ });
  armband(d, s, 'N', 60.5, 0);
  // lappet of the headcloth falling over the near shoulder, in front of the arm root
  stripedRibbon(d, [s.H(-1.2, -4.2), s.T(19.5, -1.5), s.T(15.2, 0.6)], 2.0, 61, 'lappet');
}

/** Ribbon cut into alternating lapis and gold segments (nemes stripes). */
function stripedRibbon(d: Draw, pts: V[], r: number, z: number, group: string) {
  const seg: V[] = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 3; k++) seg.push(lerpV(pts[i], pts[i + 1], k / 3));
  seg.push(pts[pts.length - 1]);
  for (let i = 0; i < seg.length - 1; i++) {
    d.capsule({ mat: i % 2 ? GD : LP, z: z + i * 0.001, group, line: i ? 'none' : 'strong' }, seg[i], seg[i + 1], r, r, 0.35);
  }
}

function kiltFlap(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  d.capsule({ mat: LN, z, group: 'kilt' + side, shade, tex: (h) => (Math.sin(h.v * 9) > 0.6 ? -1 : 0) }, at(hip, th, -1.2), at(hip, th, 9), 5.4, 5.0, 0.4);
}

function apron(d: Draw, s: Skel, z: number) {
  const flapAng = Math.max(-122, Math.min(-58, (s.thN + s.thF) / 2));
  const a0 = s.T(0.6, 0.2), a1 = s.T(0.6, 6.8);
  const a2 = at(a1, flapAng + 4, 13), a3 = at(a0, flapAng - 2, 13.5);
  d.poly({ mat: LN, z, group: 'apron', tex: (h) => (Math.abs(h.v) < 0.25 ? -1 : 0) }, [a0, a1, a2, a3], { kind: 'cyl', a: lerpV(a0, a1, 0.5), b: lerpV(a2, a3, 0.5), r: 3.8, bevel: 1 });
  // lapis + gold bands across the apron
  for (const k of [0.4, 0.7]) d.capsule({ mat: k < 0.5 ? LP : GD, z: z + 0.1, group: 'apron', line: 'none' }, lerpV(a0, a3, k), lerpV(a1, a2, k), 0.8, 0.8);
  d.capsule({ mat: GD, z: z + 0.1, group: 'apron', line: 'none' }, lerpV(a3, a2, 0.05), lerpV(a3, a2, 0.95), 0.75, 0.75);
}

function armband(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  d.capsule({ mat: GD, z, group: 'arm' + side, shade, line: 'none' }, at(sh, up, 6.2), at(sh, up, 7.4), 3.8, 3.7, 0.3);
}

function collar(d: Draw, s: Skel, z: number) {
  const bands: [number, typeof GD, number][] = [
    [4.4, GD, 0.85],
    [5.9, TQ, 0.95],
    [7.3, LP, 0.9],
    [8.6, GD, 0.8],
  ];
  for (const [r, mat, w] of bands) {
    const pts: V[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      // arc around the neck base, over the shoulders and across the chest
      const a = (200 + t * 150) * (Math.PI / 180);
      pts.push(s.T(20.6 + Math.sin(a) * r * 0.9, Math.cos(a) * r * 1.05 + 1));
    }
    d.ribbon({ mat, z: z + r * 0.01, group: 'collar', line: 'none' }, pts, pts.map(() => w));
  }
}

function headcloth(d: Draw, s: Skel, sway: number) {
  const H = s.H, T = s.T;
  const pts = [H(-1.5, 5.2), H(-6.6, 3.6), H(-7.8, -1.5), T(19.2 - sway * 0.4, -8.6), T(15.4 - sway, -9.4), T(15.8 - sway * 0.6, -6.8), H(-3.8, -4.6)];
  d.poly({ mat: LP, z: 3, group: 'cloth', tex: (h, x, y) => (Math.floor((h.u + 1.2) * 6) % 2 === 0 ? 0 : 2) }, pts, { kind: 'dome', c: H(-4, 0), r: 11, bevel: 1.2 });
}

function helmet(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  const ha = s.headDir - 90;
  const howl = P.howl ?? 0; // 0..1 opens the jaw
  d.capsule({ mat: SK, z: 37, group: 'head' }, s.neck, H(0, -4.5), 3.6, 3.3);
  // gold neck ring where the mask meets the collar
  d.capsule({ mat: GD, z: 37.2, group: 'head', line: 'soft' }, H(-3.2, -5.2), H(3.2, -6.0), 1.0, 1.0);
  // far ear (behind the cranium, slightly forward in 3/4 view)
  ear(d, s, 2.2, 38.4, -1);
  // cranium
  d.ellipse({ mat: JK, z: 39, group: 'head' }, H(-0.8, 0.8), 6.5, 6.8, ha);
  // muzzle; the lower jaw drops when howling
  d.poly(
    { mat: JK, z: 39.2, group: 'head', line: 'soft' },
    [H(1.6, 3.4), H(7, 2.2), H(12.6, -0.2), H(14.2, -1.9), H(13.5, -3.3), H(8, -3.9 - howl * 0.6), H(3.0, -5.6), H(-0.4, -3.2)],
    { kind: 'cyl', a: H(0, -0.4), b: H(14, -1.6), r: 3.5, bevel: 1 },
  );
  if (howl > 0) {
    d.poly({ mat: JK, z: 39.1, group: 'head' }, [H(3.6, -4.4), H(9.8, -4.2 - howl * 3.6), H(10.6, -5 - howl * 4.2), H(3.2, -6.0)], { kind: 'bevel', w: 1 });
    d.line({ mat: JK, z: 39.3, group: 'head', line: 'none' }, H(4.6, -4.6), H(9.6, -4.4 - howl * 3.4), ACCENT.mouthRed);
  }
  // near ear with gold lining and band
  ear(d, s, 0, 39.6, 0);
  // gold diadem across the brow
  d.capsule({ mat: GD, z: 39.5, group: 'head', line: 'none' }, H(-5.8, 3.2), H(2.8, 3.8), 0.75, 0.75);
  // amber eye with a gold liner sweeping back, glossy nose tip
  const glow = (P.eye ?? 0) > 0.5 ? AM.ramp[5] : AM.ramp[4];
  d.pixels({ mat: JK, z: 39.8, group: 'head' }, [
    { p: H(4.6, 1.2), c: glow },
    { p: H(5.5, 0.9), c: AM.ramp[3] },
    { p: H(3.6, 1.6), c: GD.ramp[4] },
    { p: H(2.7, 1.8), c: GD.ramp[3] },
    { p: H(13.6, -2.1), c: JK.ramp[5] },
  ]);
}

function ear(d: Draw, s: Skel, dx: number, z: number, shade: number) {
  const H = s.H;
  d.poly({ mat: JK, z, group: 'ear' + z, shade }, [H(-4.4 + dx, 3.6), H(-2.2 + dx, 17.6), H(2.0 + dx, 4.4)], { kind: 'bevel', w: 1.4 });
  d.poly({ mat: GD, z: z + 0.05, group: 'ear' + z, shade, line: 'none' }, [H(-3.0 + dx, 5.6), H(-2.1 + dx, 14.2), H(0.6 + dx, 6.0)], { kind: 'bevel', w: 1 });
  d.capsule({ mat: GD, z: z + 0.1, group: 'ear' + z, shade, line: 'none' }, H(-3.6 + dx, 6.0), H(1.2 + dx, 6.4), 0.7, 0.7);
}

/** Khopesh-glaive: ebony shaft with gold bands, forked butt, crescent blade and spike. */
function glaive(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  const g = 'glaive';
  d.capsule({ mat: JK, z, group: g }, f(-33, 0), f(26, 0), 1.35, 1.25);
  for (const u of [-30, -8, 6, 24]) d.capsule({ mat: GD, z: z + 0.05, group: g, line: 'none' }, f(u, 0), f(u + 1.6, 0), 1.7, 1.7);
  // forked butt (was-scepter)
  d.capsule({ mat: GD, z: z + 0.04, group: g }, f(-33, 0), f(-36.5, -2.4), 1.0, 0.8);
  d.capsule({ mat: GD, z: z + 0.04, group: g }, f(-33, 0), f(-36.5, 2.4), 1.0, 0.8);
  // crescent blade sweeping forward (-w) and the top spike
  const blade = [f(23.5, -0.8), f(25.5, -6.4), f(30.5, -11.2), f(38, -13.2), f(35.8, -9.2), f(31.8, -5.4), f(28.6, -1.2)];
  d.poly({ mat: BZ, z: z + 0.1, group: g }, blade, { kind: 'bevel', w: 2.2 });
  d.ribbon({ mat: MAT.silver, z: z + 0.15, group: g, line: 'none' }, [f(25.8, -6.8), f(30.6, -11.6), f(37.4, -13.2)], [0.9, 0.9, 0.9]);
  d.poly({ mat: BZ, z: z + 0.1, group: g }, [f(25.5, 2.0), f(35, 1.8), f(43, 0), f(35, -1.8), f(25.5, -2.0)], { kind: 'cyl', a: f(25, 0), b: f(43, 0), r: 2.2 });
  d.circle({ mat: TQ, z: z + 0.2, group: g }, f(25.2, 0), 1.6);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

/** Puts the far hand on the shaft below the near hand. */
function grip(p: Pose, offset = -11): Pose {
  const s = solve(p, D);
  return tweak(p, { armF: { ik: at(s.hN, p.p.glaiveAng ?? 92, offset), bend: -1 } });
}

const IDLE: Pose = pose({
  torso: 87,
  head: 87,
  legN: { ik: v(-9, 3) },
  legF: { ik: v(9, 3) },
  armN: { up: -78, lo: 20 },
  armF: { up: -96, lo: -70 },
  p: { glaiveAng: 93, cloth: 0, eye: 0, howl: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b,
    armN: { up: -78 + b * 2, lo: 20 + b * 2 },
    armF: { up: -96 + b * 2, lo: -70 + b * 3 },
    p: { glaiveAng: 93 + b * 0.6, cloth: Math.sin(a) * 0.8, eye: t < 0.5 ? 0 : 1 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const ft = (ph: number) => {
    const s = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (s > 0 ? 7 * s : 0), ang: s > 0 ? -26 * s : 0 };
  };
  const n = ft(a), f = ft(a + Math.PI);
  return grip(
    pose({
      y: bob - 1,
      torso: 72,
      head: 80,
      legN: { ik: v(n.x - 1, n.y) },
      legF: { ik: v(f.x + 1, f.y) },
      footN: n.ang,
      footF: f.ang,
      armN: { up: -62 + Math.cos(a) * 6, lo: 6 },
      p: { glaiveAng: 18 + Math.cos(a) * 4, cloth: 2.2 + Math.sin(a * 2) * 0.5, eye: 1 },
    }),
    -12,
  );
}

// Jackal's Bite: a hooked downward slash.
const JB_WIND = grip(pose({
  x: -3, y: -1, torso: 97, head: 92,
  legN: { ik: v(-11, 3) }, legF: { ik: v(8, 3) },
  armN: { up: 128, lo: 150 },
  p: { glaiveAng: 156, cloth: -0.4, eye: 1 },
}), -12);
const JB_HIT = grip(pose({
  x: 8, y: -5, torso: 64, head: 76,
  legN: { ik: v(-8, 3) }, legF: { ik: v(17, 3) }, footN: -10,
  armN: { up: 2, lo: -12 },
  p: { glaiveAng: -32, cloth: 1.6, eye: 1 },
}), -12);
const JB_FOLLOW = grip(tweak(JB_HIT, { x: 9, y: -6, torso: 62, armN: { up: -28, lo: -46 }, p: { glaiveAng: -58, cloth: 1.2 } }), -12);

// Warden's Vigil: the glaive is planted and the jackal howls.
const WV_PLANT = pose({
  y: -2, torso: 84, head: 82,
  legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -50, lo: 40 },
  armF: { up: -60, lo: -10 },
  p: { glaiveAng: 88, cloth: 0.3, eye: 1, howl: 0 },
});
const WV_HOWL = pose({
  y: 1, torso: 96, head: 124,
  legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -46, lo: 44 },
  armF: { up: 40, lo: 70 },
  p: { glaiveAng: 88, cloth: -1.2, eye: 1, howl: 1 },
});

// Weighing of Hearts: overhead two-handed chop.
const WH_RAISE = grip(pose({
  x: -3, y: 0, torso: 100, head: 96,
  legN: { ik: v(-11, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 112, lo: 118 },
  p: { glaiveAng: 126, cloth: -0.8, eye: 1 },
}), -12);
const WH_PEAK = grip(tweak(WH_RAISE, { x: -4, torso: 103, armN: { up: 126, lo: 146 }, p: { glaiveAng: 168, cloth: -1.2 } }), -12);
const WH_SLAM = grip(pose({
  x: 9, y: -7, torso: 60, head: 72,
  legN: { ik: v(-9, 3) }, legF: { ik: v(17, 3) }, footN: -12,
  armN: { up: -18, lo: -40 },
  p: { glaiveAng: -64, cloth: 2, eye: 1 },
}), -12);

const HURT = grip(pose({
  x: -4, torso: 101, head: 106,
  legN: { ik: v(-11, 3) }, legF: { ik: v(7, 4) }, footF: 10,
  armN: { up: -60, lo: 30 },
  p: { glaiveAng: 110, cloth: -1.4, eye: 0 },
}), -12);
const DEATH_KNEEL = pose({
  x: -2, y: -13, torso: 74, head: 60,
  legN: { ik: v(-15, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -92, lo: -88 }, armF: { up: -76, lo: -60 },
  p: { glaiveAng: -96, cloth: 0.8, eye: 0 },
});
const DEATH_FALL = pose({
  x: 2, y: -21, torso: 30, head: 14,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { glaiveAng: -20, cloth: 1.6, eye: 0 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { glaiveAng: 4, cloth: 2.4, eye: -1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const gripAll = (frames: { pose: Pose; ms: number }[]) => frames.map((f) => ({ ...f, pose: grip(f.pose, -12) }));

const char: CharDef = {
  id: 'jackal',
  name: "Kha'zir",
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 150, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...keys([
          [grip(mid(IDLE, JB_WIND, 0.5), -12), 90],
          [JB_WIND, 190],
          [JB_HIT, 65, { smear: true, hit: true }],
          [JB_FOLLOW, 210],
        ]),
        ...gripAll(tween(D, JB_FOLLOW, IDLE, 2, 110, ease.inOut)),
      ],
    },
    skill: {
      loop: false,
      frames: keys([
        [mid(IDLE, WV_PLANT, 0.5), 90],
        [WV_PLANT, 160],
        [mid(WV_PLANT, WV_HOWL, 0.5), 80],
        [WV_HOWL, 120, { event: 'cast' }],
        [tweak(WV_HOWL, { head: 127, p: { cloth: -1.4 } }), 110, { hit: true }],
        [tweak(WV_HOWL, { head: 122, p: { cloth: -1.0 } }), 110],
        [tweak(WV_HOWL, { head: 125, p: { cloth: -1.2, howl: 0.8 } }), 160],
        [mid(WV_HOWL, IDLE, 0.5), 110],
        [IDLE, 100],
      ]),
    },
    attack3: {
      loop: false,
      frames: [
        ...keys([
          [grip(mid(IDLE, WH_RAISE, 0.5), -12), 90],
          [WH_RAISE, 110],
          [WH_PEAK, 220],
          [WH_SLAM, 70, { smear: true, hit: true }],
          [grip(tweak(WH_SLAM, { y: -8, torso: 58 }), -12), 260],
        ]),
        ...gripAll(tween(D, WH_SLAM, IDLE, 2, 120, ease.inOut)),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [grip(tweak(HURT, { x: -3, torso: 97, head: 100 }), -12), 110],
        [grip(mid(HURT, IDLE, 0.6), -12), 110],
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

/** Jackal head in profile for icons (tall ears, long muzzle). */
function jackalHead(d: Draw, c: V, s: number, z: number, howl = 0) {
  const P = (x: number, y: number) => v(c.x + x * s, c.y + y * s);
  d.poly({ mat: JK, z, group: 'jh' }, [P(-3.4, 2.6), P(-2, 13), P(1.4, 3.2)], { kind: 'bevel', w: 1.4 });
  d.poly({ mat: GD, z: z + 0.05, group: 'jh', line: 'none' }, [P(-2.4, 4.2), P(-1.9, 10.6), P(0.2, 4.6)], { kind: 'bevel', w: 1 });
  d.ellipse({ mat: JK, z: z + 0.1, group: 'jh' }, P(-0.6, 0.4), 5.4 * s, 5.6 * s, 0);
  d.poly({ mat: JK, z: z + 0.2, group: 'jh' }, [P(1.4, 2.4), P(6, 1.2), P(10.4, -0.6), P(11.4, -2), P(10.6, -2.8), P(6.4, -3.2 - howl), P(2.4, -4.6), P(-0.4, -2.6)], { kind: 'cyl', a: P(0, -0.6), b: P(11, -1.4), r: 2.8 * s, bevel: 1 });
  d.pixels({ mat: JK, z: z + 0.3, group: 'jh' }, [{ p: P(4.2, 1.0), c: MAT.glowAmber.ramp[4] }, { p: P(3.2, 1.3), c: GD.ramp[4] }]);
}

export const jackal: ChampionArt = {
  char,
  iconBg: MAT.turquoise,
  icons: {
    jackal_bite: () =>
      compose(MAT.turquoise, glyph((d) => {
        smear(d, v(10, 8), 150, -30, 30, 9, { core: C.smearSun, edge: C.smearGold }, 1);
        glaive(d, v(11, 11), 52, 10);
      })),
    wardens_vigil: () =>
      compose(MAT.turquoise, glyph((d) => {
        jackalHead(d, v(17, 18), 1.35, 10, 2.5);
      }), (b) => {
        ellipseRing(b, 20, 21, 17, 17, 1.2, (x, y, a) => (Math.sin(a * 5) > 0 ? withAlpha(C.goldHot, 220) : withAlpha(MAT.turquoise.ramp[4], 200)));
        ellipseRing(b, 20, 21, 12, 12, 1, () => withAlpha(MAT.turquoise.ramp[5], 140));
      }),
    weighing_hearts: () =>
      compose(MAT.turquoise, glyph((d) => {
        // balance scales: beam, two pans and the glaive as the pillar
        d.capsule({ mat: GD, z: 10, group: 'scale' }, v(20, 6), v(20, 30), 1.4, 1.4);
        d.capsule({ mat: GD, z: 10.1, group: 'scale' }, v(7, 28), v(33, 28), 1.2, 1.2);
        for (const x of [9, 31]) {
          d.ellipse({ mat: GD, z: 10.2, group: 'pan' + x }, v(x, 17), 5.2, 1.8, 0);
        }
        d.ellipse({ mat: MAT.glowRed, z: 10.3, group: 'heart' }, v(9, 20), 2.6, 2.2, 0);
        d.poly({ mat: MAT.linen, z: 10.3, group: 'feather' }, [v(31, 19), v(32.4, 27), v(31, 30), v(29.8, 27)], { kind: 'bevel', w: 1 });
      }), (b) => {
        line(b, 9, 13, 9, 23, MAT.gold.ramp[3]);
        line(b, 31, 13, 31, 23, MAT.gold.ramp[3]);
        impactStar(b, 20, 10, 2, 6, 8, C.goldHot, C.white);
      }),
  },
};
