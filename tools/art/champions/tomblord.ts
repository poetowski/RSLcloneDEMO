// Anhotep, the Tomb Lord — Sunscar boss and control. A god-king wrapped in
// aged linen: striped nemes headdress, gold death mask with glowing green eyes
// and a braided false beard, crook and flail crossed over the chest, tattered
// bandage strips. Signature color: tomb-green glow. Silhouette: the nemes
// flare, the beard and the crook. Has an extra `rise` animation (Undying).
import { BuildInfo, ChampionArt, CharDef, cycle, FrameDef, keys } from '../char.ts';
import { C, compose, glyph, skull } from '../icons.ts';
import { MAT } from '../palette.ts';
import { disc, ellipseRing } from '../paint.ts';
import { foot, torsoPts } from '../parts.ts';
import { rng, withAlpha } from '../raster.ts';
import { Tex } from '../render.ts';
import { at, Dims, Draw, lerpPose, lerpV, pose, Pose, Skel, solve, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16.5,
  shin: 16.5,
  ankleH: 3,
  footLen: 6,
  spine: 22,
  neck: 7.6,
  upperArm: 13.5,
  foreArm: 12.5,
  shoulderDrop: 4.2,
  shoulderN: -3.0,
  shoulderF: 3.4,
  hipN: -1.8,
  hipF: 1.8,
};

const BD = MAT.bandage, GD = MAT.gold, LP = MAT.lapis, TQ = MAT.turquoise, GG = MAT.glowGreen;

/** Diagonal wraps of linen along a limb or torso. */
const wraps: Tex = (h) => (Math.floor(h.u * 11 + h.v * 1.6) % 2 === 0 ? -1 : 0);

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const wave = P.wave ?? 0;
  void info;

  nemesBack(d, s);
  strips(d, s.T(2, -6.4), -96, wave, 2, -1, 3);

  mummyLeg(d, s, 'F', 10, -1);
  flail(d, s.hF, P.flailAng ?? 70, wave, 19, -1);
  mummyArm(d, s, 'F', 20, -1, wave);

  // hunched, wrapped torso
  const torso = torsoPts(s, [
    [0, 5.8, 6.0],
    [4, 5.6, 6.2],
    [9, 6.2, 7.4],
    [14, 7.0, 8.2],
    [18, 7.4, 7.2],
    [20.6, 5.6, 4.6],
    [22.2, 3.0, 2.4],
  ]);
  d.poly({ mat: BD, z: 30, group: 'body', tex: wraps }, torso, { kind: 'cyl', a: s.T(0, 0.8), b: s.T(22, 0.8), r: 7.6, bevel: 1.4 });
  collar(d, s, 31);
  d.poly({ mat: GD, z: 33, group: 'body' }, [s.T(3.4, -6.2), s.T(3.6, 6.6), s.T(0.6, 6.4), s.T(0.4, -6.0)], { kind: 'cyl', a: s.T(0, 0), b: s.T(4, 0), r: 6.6 });
  apron(d, s, 35);

  head(d, s, P);

  mummyLeg(d, s, 'N', 50, 0);
  crook(d, s.hN, P.crookAng ?? 110, 57, P.glow ?? 0);
  mummyArm(d, s, 'N', 60, 0, wave);
  stripedRibbon(d, [s.H(-1.6, -4.6), s.T(19.6, -1.2), s.T(14.4, 1.2)], 2.1, 61, 'lappet');
}

function mummyLeg(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const kn = side === 'N' ? s.kneeN : s.kneeF;
  const an = side === 'N' ? s.ankN : s.ankF;
  const fa = side === 'N' ? s.pose.footN : s.pose.footF;
  const g = 'leg' + side;
  d.capsule({ mat: BD, z, group: g, shade, tex: wraps }, hip, kn, 3.9, 3.2);
  d.capsule({ mat: BD, z: z + 0.1, group: g, shade, tex: wraps }, kn, an, 3.0, 2.5);
  foot(d, an, fa, BD, { z: z + 0.3, group: g, shade, tex: wraps }, 'wrapped');
}

function mummyArm(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number, wave: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const el = side === 'N' ? s.eN : s.eF;
  const ha = side === 'N' ? s.hN : s.hF;
  const lo = side === 'N' ? s.loN : s.loF;
  const g = 'arm' + side;
  d.capsule({ mat: BD, z, group: g, shade, tex: wraps }, sh, el, 3.2, 2.8);
  d.capsule({ mat: BD, z: z + 0.1, group: g, shade, tex: wraps }, el, ha, 2.7, 2.4);
  d.capsule({ mat: GD, z: z + 0.2, group: g, shade, line: 'none' }, at(ha, lo, -4), at(ha, lo, -2.4), 2.7, 2.7, 0.3);
  d.ellipse({ mat: BD, z: z + 0.3, group: g, shade }, ha, 2.6, 2.3, lo);
  // a loose strip trailing from the forearm
  strips(d, lerpV(el, ha, 0.4), -100, wave + (side === 'N' ? 0 : 1.5), z - 0.05, shade, 1);
}

/** Tattered strips hanging from a point, swaying with `wave`. */
function strips(d: Draw, from: V, ang: number, wave: number, z: number, shade: number, n: number) {
  for (let i = 0; i < n; i++) {
    const a = ang + i * 9 + Math.sin(wave + i * 1.7) * 9;
    const len = 9 + i * 2.5;
    const p1 = at(from, a, len * 0.5);
    const p2 = at(p1, a + Math.sin(wave + 1 + i) * 14, len * 0.5);
    d.ribbon({ mat: BD, z: z + i * 0.01, group: 'strip' + z + i, shade: shade - (i % 2), tex: (h) => (h.u > 0.7 ? -1 : 0) }, [from, p1, p2], [1.3, 1.1, 0.7], 0.5);
  }
}

function stripedRibbon(d: Draw, pts: V[], r: number, z: number, group: string) {
  const seg: V[] = [];
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < 3; k++) seg.push(lerpV(pts[i], pts[i + 1], k / 3));
  seg.push(pts[pts.length - 1]);
  for (let i = 0; i < seg.length - 1; i++) {
    d.capsule({ mat: i % 2 ? GD : LP, z: z + i * 0.001, group, line: i ? 'none' : 'strong' }, seg[i], seg[i + 1], r, r, 0.35);
  }
}

function collar(d: Draw, s: Skel, z: number) {
  const bands: [typeof GD, number][] = [
    [GD, 4.2],
    [LP, 5.6],
    [TQ, 6.9],
    [GD, 8.1],
  ];
  for (const [mat, r] of bands) {
    const pts: V[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = (200 + (i / 8) * 150) * (Math.PI / 180);
      pts.push(s.T(20.4 + Math.sin(a) * r * 0.9, Math.cos(a) * r + 1));
    }
    d.ribbon({ mat, z: z + r * 0.01, group: 'collar', line: 'none' }, pts, pts.map(() => 0.9));
  }
}

function apron(d: Draw, s: Skel, z: number) {
  const flapAng = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  const a0 = s.T(0.6, 0.6), a1 = s.T(0.6, 6.4);
  const a2 = at(a1, flapAng + 3, 14), a3 = at(a0, flapAng - 2, 14.5);
  for (let i = 0; i < 6; i++) {
    const k0 = i / 6, k1 = (i + 1) / 6;
    d.poly({ mat: i % 2 ? GD : LP, z: z + i * 0.001, group: 'apron', line: i ? 'none' : 'strong' }, [lerpV(a0, a3, k0), lerpV(a1, a2, k0), lerpV(a1, a2, k1), lerpV(a0, a3, k1)], { kind: 'bevel', w: 1 });
  }
}

function nemesBack(d: Draw, s: Skel) {
  const H = s.H;
  // the flared back of the headcloth, down to the shoulders
  d.poly({ mat: LP, z: 3, group: 'nemes' }, [H(-1, 9.4), H(-8.2, 6.4), H(-10.6, -3), H(-10.2, -12.4), H(-3, -11.6), H(-1.6, -2)], { kind: 'dome', c: H(-5, -1), r: 12, bevel: 1.2 });
  for (const y of [6, 2, -2, -6, -10]) d.capsule({ mat: GD, z: 3.1, group: 'nemes', line: 'none' }, H(-2.6, y + 0.6), H(-9.8, y - 0.6), 0.75, 0.75);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  const ha = s.headDir - 90;
  d.capsule({ mat: BD, z: 37, group: 'head', tex: wraps }, s.neck, H(0, -4.5), 3.2, 3.0);
  // nemes crown over the head, flaring at the temples
  d.poly(
    { mat: LP, z: 38, group: 'nemes' },
    [H(5.6, 6.8), H(-1.6, 9.8), H(-7.4, 7.2), H(-8.6, -1), H(-7.4, -9.2), H(-2.2, -9.6), H(-1.0, -2.2), H(1.6, 2.6), H(5.0, 5.0)],
    { kind: 'dome', c: H(-1, 1), r: 11, bevel: 1.4 },
  );
  for (const y of [7.4, 3.8, 0.2, -3.4, -7]) d.capsule({ mat: GD, z: 38.1, group: 'nemes', line: 'none' }, H(-7.6, y - 0.4), H(Math.min(4.4, -0.8 + y * 0.8), y + 0.8), 0.75, 0.75);
  // gold death mask
  d.ellipse({ mat: GD, z: 38.4, group: 'mask', line: 'soft' }, H(2.6, -0.6), 4.0, 5.4, ha);
  d.poly({ mat: GD, z: 38.45, group: 'mask' }, [H(5.6, 1.2), H(7.6, -1.4), H(6.0, -2.0)], { kind: 'bevel', w: 1 });
  const glow = (P.glow ?? 0) >= 1 ? GG.ramp[5] : GG.ramp[4];
  d.pixels({ mat: GD, z: 38.5, group: 'mask' }, [
    { p: H(3.8, 0.8), c: glow },
    { p: H(4.6, 0.8), c: GG.ramp[3] },
    { p: H(3.0, 1.6), c: LP.ramp[2] },
    { p: H(3.8, 1.8), c: LP.ramp[2] },
    { p: H(4.8, 1.7), c: LP.ramp[2] },
    { p: H(4.6, -3.6), c: GD.ramp[1] },
    { p: H(5.4, -3.5), c: GD.ramp[1] },
  ]);
  // braided false beard
  stripedRibbon(d, [H(4.2, -5.6), H(4.6, -9.2), H(5.0, -12.4)], 1.25, 38.6, 'beard');
  // uraeus cobra on the brow
  d.poly({ mat: GD, z: 38.7, group: 'uraeus' }, [H(4.6, 5.4), H(5.8, 8.8), H(7.2, 8.0), H(6.4, 5.6)], { kind: 'bevel', w: 1 });
  d.pixels({ mat: GD, z: 38.8, group: 'uraeus' }, [{ p: H(6.6, 8.2), c: GG.ramp[4] }]);
}

/** The crook (heka): striped shaft with a curled hook and a green gem. */
function crook(d: Draw, hand: V, ang: number, z: number, glow: number) {
  const f = d.frame(hand, ang);
  const seg = 6;
  for (let i = 0; i < seg; i++) {
    const u0 = -14 + (i / seg) * 30, u1 = -14 + ((i + 1) / seg) * 30;
    d.capsule({ mat: i % 2 ? GD : LP, z: z + i * 0.001, group: 'crook', line: i ? 'none' : 'strong' }, f(u0, 0), f(u1, 0), 1.25, 1.25);
  }
  d.ribbon({ mat: GD, z: z + 0.1, group: 'crook' }, [f(16, 0), f(19.6, -0.8), f(21.8, -4), f(20.6, -7.4), f(17.4, -8), f(16, -6)], [1.3, 1.3, 1.3, 1.2, 1.1, 0.9]);
  d.circle({ mat: GG, z: z + 0.2, group: 'crook', shade: Math.round(glow) }, f(15.6, 0), 1.9);
}

/** The flail (nekhakha): striped handle, three strands of gold and lapis beads hanging by gravity. */
function flail(d: Draw, hand: V, ang: number, wave: number, z: number, shade: number) {
  const f = d.frame(hand, ang);
  for (let i = 0; i < 4; i++) {
    const u0 = -3 + i * 3;
    d.capsule({ mat: i % 2 ? LP : GD, z: z + i * 0.001, group: 'flail', shade, line: i ? 'none' : 'strong' }, f(u0, 0), f(u0 + 3, 0), 1.15, 1.15);
  }
  const top = f(9.8, 0);
  d.circle({ mat: GD, z: z + 0.01, group: 'flail', shade, line: 'none' }, top, 1.6);
  const beads = [GD, LP, GD, TQ, GD];
  for (let i = 0; i < 3; i++) {
    const a = -90 + (i - 1) * 17 + Math.sin(wave + i) * 9;
    beads.forEach((mat, k) => {
      const p = at(top, a + Math.sin(wave * 1.3 + i + k * 0.6) * k * 1.6, 2.4 + k * 2.15);
      d.circle({ mat, z: z + 0.02 + i * 0.001 + k * 0.0001, group: 'flail', shade: Math.max(0, shade), line: 'none' }, p, k === beads.length - 1 ? 1.4 : 1.1);
    });
  }
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

/** Crossed-arms pharaoh pose: hands meet over the chest. */
function crossed(base: Pose): Pose {
  const s = solve(base, D);
  return tweak(base, { armN: { ik: s.T(16.5, 3.4), bend: -1 }, armF: { ik: s.T(14.5, 7.4), bend: -1 } });
}

const IDLE: Pose = crossed(
  pose({
    torso: 79,
    head: 82,
    legN: { ik: v(-7, 3) },
    legF: { ik: v(7, 3) },
    p: { crookAng: 118, flailAng: 62, glow: 0, wave: 0 },
  }),
);

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return crossed(tweak(IDLE, { y: -b, torso: 79 - b, p: { crookAng: 118 - b * 2, flailAng: 62 + b * 2, glow: t < 0.5 ? 0 : 1, wave: a } }));
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const ft = (ph: number) => {
    const s = Math.sin(ph);
    return { x: -9 * Math.cos(ph), y: 3 + (s > 0 ? 4 * s : 0), ang: s > 0 ? -14 * s : 0 };
  };
  const n = ft(a), f = ft(a + Math.PI);
  // the mummy lurch: arms reaching forward
  return pose({
    y: bob - 1,
    torso: 72,
    head: 78,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -4 + Math.cos(a) * 6, lo: -2 },
    armF: { up: 4 - Math.cos(a) * 6, lo: 4 },
    p: { crookAng: -60, flailAng: -30, glow: 1, wave: a * 2 },
  });
}

// Grave Touch: a clawing reach with the far hand.
const GT_WIND = pose({
  x: -2, torso: 92, head: 88,
  legN: { ik: v(-8, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -100, lo: -40 }, armF: { up: -150, lo: -130 },
  p: { crookAng: 96, flailAng: -120, glow: 1, wave: 1 },
});
const GT_REACH = pose({
  x: 5, y: -2, torso: 70, head: 80,
  legN: { ik: v(-8, 3) }, legF: { ik: v(12, 3) },
  armN: { up: -100, lo: -50 }, armF: { up: 4, lo: 6 },
  p: { crookAng: 100, flailAng: 20, glow: 2, wave: 2 },
});

// Curse of Ages: crook and flail raised, then thrust down.
const CA_RAISE = pose({
  y: 2, torso: 96, head: 104,
  legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) },
  armN: { up: 112, lo: 100 }, armF: { up: 72, lo: 84 },
  p: { crookAng: 96, flailAng: 100, glow: 2, wave: 1.2 },
});
const CA_SLAM = pose({
  x: 3, y: -4, torso: 72, head: 76,
  legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -30, lo: -10 }, armF: { up: -20, lo: 0 },
  p: { crookAng: -20, flailAng: -10, glow: 2, wave: 2.4 },
});

// Eternal Tomb: the crook points at the victim.
const ET_POINT = pose({
  x: 4, y: -1, torso: 78, head: 84,
  legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 12, lo: 16 }, armF: { up: -110, lo: -60 },
  p: { crookAng: 34, flailAng: -100, glow: 2, wave: 1 },
});

const HURT = pose({
  x: -4, torso: 100, head: 106,
  legN: { ik: v(-9, 3) }, legF: { ik: v(6, 4) }, footF: 10,
  armN: { up: -140, lo: -100 }, armF: { up: -50, lo: 10 },
  p: { crookAng: 140, flailAng: 40, glow: 0, wave: 2 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -14, torso: 70, head: 58,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -96, lo: -90 }, armF: { up: -80, lo: -70 },
  p: { crookAng: -100, flailAng: -90, glow: 0, wave: 1 },
});
const DEATH_FALL = pose({
  x: 2, y: -23, torso: 28, head: 12,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { crookAng: -30, flailAng: -60, glow: 0, wave: 1.6 },
});
const DEATH_DOWN = pose({
  x: 6, y: -29, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { crookAng: 4, flailAng: -80, glow: -1, wave: 2 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const deathFrames: FrameDef[] = keys([
  [HURT, 120],
  [mid(HURT, DEATH_KNEEL, 0.5), 110],
  [DEATH_KNEEL, 220],
  [DEATH_FALL, 110],
  [DEATH_DOWN, 140],
  [tweak(DEATH_DOWN, { y: -30 }), 600],
]);

const char: CharDef = {
  id: 'tomblord',
  name: 'Anhotep',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 140, idle) },
    run: { loop: true, frames: cycle(8, 95, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, GT_WIND, 0.5), 90],
        [GT_WIND, 180],
        [mid(GT_WIND, GT_REACH, 0.6), 50],
        [GT_REACH, 80, { event: 'shoot', hit: true }],
        [tweak(GT_REACH, { x: 6, torso: 68, p: { glow: 1, wave: 2.6 } }), 220],
        [crossed(mid(GT_REACH, IDLE, 0.5)), 110],
        [IDLE, 100],
      ]),
    },
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, CA_RAISE, 0.5), 100],
        [CA_RAISE, 130, { event: 'cast' }],
        [tweak(CA_RAISE, { y: 3, p: { wave: 1.6 } }), 130],
        [tweak(CA_RAISE, { y: 3, p: { wave: 2.0 } }), 120],
        [CA_SLAM, 80, { hit: true }],
        [tweak(CA_SLAM, { y: -5, p: { wave: 3 } }), 240],
        [crossed(mid(CA_SLAM, IDLE, 0.5)), 110],
        [IDLE, 100],
      ]),
    },
    attack3: {
      loop: false,
      frames: keys([
        [mid(IDLE, ET_POINT, 0.5), 90],
        [ET_POINT, 120, { event: 'cast' }],
        [tweak(ET_POINT, { x: 5, p: { wave: 1.6 } }), 120],
        [tweak(ET_POINT, { x: 5, armN: { up: 14, lo: 18 }, p: { wave: 2.2 } }), 120, { hit: true }],
        [tweak(ET_POINT, { x: 4, p: { glow: 1, wave: 2.8 } }), 240],
        [crossed(mid(ET_POINT, IDLE, 0.5)), 110],
        [IDLE, 100],
      ]),
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 96, head: 100 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: { loop: false, frames: deathFrames },
    // Undying: the fall played backwards, slower, ending in the idle pose
    rise: {
      loop: false,
      frames: [
        ...deathFrames.slice(2).reverse().map((f, i) => ({ ...f, ms: [500, 160, 140, 160][i] ?? 140 })),
        { pose: mid(DEATH_KNEEL, IDLE, 0.5), ms: 140 },
        { pose: IDLE, ms: 160 },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

export const tomblord: ChampionArt = {
  char,
  iconBg: MAT.moss,
  icons: {
    grave_touch: () =>
      compose(MAT.moss, glyph((d) => {
        // a wrapped hand reaching out of the dark, fingers spread
        d.capsule({ mat: BD, z: 10, group: 'hand', tex: wraps }, v(4, 6), v(16, 16), 4, 3.4);
        d.ellipse({ mat: BD, z: 10.1, group: 'hand' }, v(19, 19), 4.6, 3.8, 40);
        for (const [a, l] of [[70, 9], [50, 10], [30, 9], [10, 7]]) {
          const tip = at(v(20, 20), a, l);
          d.capsule({ mat: BD, z: 10.2, group: 'f' + a }, at(v(20, 20), a, 2), tip, 1.3, 0.9);
        }
      }), (b) => {
        disc(b, 30, 30, 5, (x, y, dd) => (dd < 0.55 ? GG.ramp[5] : GG.ramp[3]));
        ellipseRing(b, 30, 30, 8, 8, 1, () => withAlpha(GG.ramp[4], 160));
      }),
    curse_ages: () =>
      compose(MAT.moss, glyph((d) => {
        skull(d, v(20, 18), 1.15, 10, MAT.glowGreen, C.deepViolet);
      }), (b) => {
        const r = rng(4);
        for (let k = 0; k < 14; k++) {
          const x = 4 + r() * 32, y = 2 + r() * 12;
          b.set(Math.round(x), Math.round(y), k % 2 ? GG.ramp[4] : GG.ramp[2]);
          b.set(Math.round(x), Math.round(y) + 1, GG.ramp[2]);
        }
      }),
    eternal_tomb: () =>
      compose(MAT.moss, glyph((d) => {
        // golden sarcophagus lid with lapis stripes and a green-eyed mask
        const pts = [v(12, 3), v(9, 18), v(11, 30), v(16, 36), v(24, 36), v(29, 30), v(31, 18), v(28, 3)];
        d.poly({ mat: GD, z: 10, group: 'sarc' }, pts, { kind: 'cyl', a: v(20, 3), b: v(20, 36), r: 11, bevel: 1.6 });
        for (const y of [9, 14, 19]) d.capsule({ mat: LP, z: 10.1, group: 'sarc', line: 'none' }, v(11.5, y), v(28.5, y), 1.1, 1.1);
        d.ellipse({ mat: GD, z: 10.2, group: 'face', line: 'soft' }, v(20, 28), 4.6, 5, 0);
        d.pixels({ mat: GD, z: 10.3, group: 'face' }, [{ p: v(18, 29), c: GG.ramp[5] }, { p: v(22, 29), c: GG.ramp[5] }]);
      })),
  },
};
