// Akhet, the Dune Stalker — Sunscar damage. Indigo veil and turban with only
// the eyes showing, a long scarf tail, loose indigo tunic with a red sash,
// wrapped calves and twin curved daggers held in reverse grip. Low crouch.
// Signature color: deep indigo. Silhouette: the crouch, the scarf, two blades.
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { C, compose, glyph, impactStar, speedLines } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { disc } from '../paint.ts';
import { foot, smear, torsoPts } from '../parts.ts';
import { withAlpha } from '../raster.ts';
import { at, Dims, Draw, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 34,
  thigh: 16,
  shin: 16,
  ankleH: 3,
  footLen: 6,
  spine: 20.5,
  neck: 7.2,
  upperArm: 12.5,
  foreArm: 11.5,
  shoulderDrop: 3.8,
  shoulderN: -2.8,
  shoulderF: 3.2,
  hipN: -1.6,
  hipF: 1.6,
};

const IN = MAT.indigo, CH = MAT.charcoal, SK = MAT.skinBrown, RD = MAT.red, BD = MAT.bandage, SV = MAT.silver, BZ = MAT.bronze, GD = MAT.gold;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const wind = P.wind ?? 0.2;

  scarfTail(d, s, wind, P.wave ?? 0);
  sashTails(d, s, wind, P.wave ?? 0, 3, -1);

  if (info.def.smear && info.prev) {
    const key = P.smearF ? 'daggerF' : 'daggerN';
    const hand = P.smearF ? s.hF : s.hN;
    const from = info.prev.pose.p[key] ?? P[key];
    smear(d, hand, from, P[key], 17, 7, { core: ACCENT.white, edge: ACCENT.smearIndigo }, 3);
  }

  stalkerLeg(d, s, 'F', 10, -1);
  dagger(d, s.hF, P.daggerF ?? 0, 19, -1);
  stalkerArm(d, s, 'F', 20, -1);

  // loose tunic, wider at the hem
  const torso = torsoPts(s, [
    [-2.5, 6.6, 7.2],
    [1, 6.2, 6.8],
    [5, 5.8, 6.6],
    [9.5, 6.0, 7.2],
    [13.5, 6.6, 7.8],
    [17, 6.8, 6.8],
    [19.2, 5.0, 4.0],
    [20.6, 2.8, 2.2],
  ]);
  d.poly({ mat: IN, z: 30, group: 'body', tex: (h) => (Math.sin(h.v * 8 + 0.6) > 0.7 ? -1 : 0) }, torso, { kind: 'cyl', a: s.T(-2, 0.6), b: s.T(20, 0.6), r: 7.4, bevel: 1.3 });
  // leather baldric across the chest
  d.capsule({ mat: MAT.darkleather, z: 31, group: 'body' }, s.T(19, 4.6), s.T(4, -5.2), 1.1, 1.1);
  // red sash with a knot
  d.poly({ mat: RD, z: 33, group: 'body' }, [s.T(4.0, -6.4), s.T(4.2, 7.0), s.T(0.8, 6.8), s.T(0.6, -6.2)], { kind: 'cyl', a: s.T(0, 0), b: s.T(4, 0), r: 6.8 });
  d.ellipse({ mat: RD, z: 33.2, group: 'knot' }, s.T(2.4, -6.4), 2, 2.4, s.torso);

  head(d, s, P);

  stalkerLeg(d, s, 'N', 50, 0);
  dagger(d, s.hN, P.daggerN ?? 180, 58, 0);
  stalkerArm(d, s, 'N', 60, 0);
}

function stalkerLeg(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const kn = side === 'N' ? s.kneeN : s.kneeF;
  const an = side === 'N' ? s.ankN : s.ankF;
  const fa = side === 'N' ? s.pose.footN : s.pose.footF;
  const g = 'leg' + side;
  // baggy trousers gathered into calf wraps
  d.capsule({ mat: CH, z, group: g, shade, tex: (h) => (Math.sin(h.u * 9) > 0.75 ? -1 : 0) }, hip, kn, 4.6, 4.2);
  d.capsule({ mat: CH, z: z + 0.1, group: g, shade }, kn, lerpV(kn, an, 0.45), 4.0, 3.2);
  d.capsule({ mat: BD, z: z + 0.2, group: g, shade, tex: (h) => (Math.floor(h.u * 7) % 2 === 0 ? -1 : 0) }, lerpV(kn, an, 0.4), an, 3.0, 2.4);
  foot(d, an, fa, SK, { z: z + 0.3, group: g, shade }, 'bare');
  const f = d.frame(an, fa);
  d.line({ mat: SK, z: z + 0.4, group: g, line: 'none' }, f(-1, -2.4), f(5.4, -2.4), MAT.darkleather.ramp[3]);
}

function stalkerArm(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const el = side === 'N' ? s.eN : s.eF;
  const ha = side === 'N' ? s.hN : s.hF;
  const lo = side === 'N' ? s.loN : s.loF;
  const g = 'arm' + side;
  d.capsule({ mat: IN, z, group: g, shade }, sh, el, 3.6, 3.2, 0.2);
  d.capsule({ mat: CH, z: z + 0.1, group: g, shade, tex: (h) => (Math.floor(h.u * 6) % 2 === 0 ? -1 : 0) }, el, at(ha, lo, -1.2), 2.8, 2.5);
  d.ellipse({ mat: SK, z: z + 0.3, group: g, shade }, ha, 2.7, 2.4, lo);
}

/** Curved jambiya: bronze hilt and a steel blade that sweeps up to the tip. */
function dagger(d: Draw, hand: V, ang: number, z: number, shade: number) {
  const f = d.frame(hand, ang);
  const g = 'dagger' + Math.round(z);
  d.capsule({ mat: BZ, z, group: g, shade }, f(-3.2, 0), f(1.8, 0), 1.2, 1.1);
  d.circle({ mat: GD, z: z + 0.05, group: g, shade }, f(-3.6, 0), 1.4);
  d.capsule({ mat: BZ, z: z + 0.06, group: g, shade }, f(2.2, -2.4), f(2.2, 2.4), 0.9, 0.9);
  d.poly({ mat: SV, z: z + 0.1, group: g, shade }, [f(2.6, -1.3), f(6.5, -1.6), f(10.5, -0.6), f(13.6, 2.4), f(11.2, 1.4), f(7, 1.3), f(2.6, 1.1)], { kind: 'cyl', a: f(2.6, 0), b: f(13, 1), r: 1.6 });
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  const ha = s.headDir - 90;
  d.capsule({ mat: IN, z: 37.5, group: 'head' }, s.neck, H(0, -4.6), 3.2, 3.0);
  // wrapped head
  d.ellipse({ mat: IN, z: 38, group: 'head', tex: (h, x, y) => ((x * 2 + y) % 5 === 0 ? -1 : 0) }, H(-0.6, 0.8), 6.3, 6.8, ha);
  // eye slit: a band of skin with two eyes, shaded by the turban edge
  d.poly({ mat: SK, z: 38.4, group: 'head' }, [H(1.4, 2.0), H(6.4, 1.6), H(6.8, -0.4), H(1.6, -0.2)], { kind: 'flat', n: [0.2, 0, 1] });
  d.pixels({ mat: SK, z: 38.5, group: 'head' }, [
    { p: H(3.4, 0.9), c: MAT.glowAmber.ramp[5] },
    { p: H(4.2, 0.9), c: MAT.glowAmber.ramp[3] },
    { p: H(6.0, 0.8), c: MAT.glowAmber.ramp[4] },
    { p: H(2.2, 1.9), c: IN.ramp[1] },
    { p: H(3.4, 1.9), c: IN.ramp[1] },
    { p: H(4.6, 1.8), c: IN.ramp[1] },
  ]);
  // veil over the lower face, a fold line across it
  d.poly({ mat: IN, z: 38.6, group: 'veil', line: 'soft' }, [H(1.2, -0.5), H(7.0, -0.7), H(7.4, -3.4), H(5.6, -6.6), H(1.8, -7.2), H(-1.2, -3)], { kind: 'bevel', w: 1.4 });
  d.line({ mat: IN, z: 38.7, group: 'veil', line: 'none' }, H(2, -3.4), H(6.6, -3.0), IN.ramp[2]);
  // turban crown wrap with a gold pin
  d.capsule({ mat: IN, z: 38.8, group: 'turban', line: 'soft', tex: (h) => (Math.floor(h.u * 6) % 2 === 0 ? -1 : 0) }, H(-6.4, 4), H(5.2, 4.6), 2.2, 2.0);
  d.circle({ mat: GD, z: 38.9, group: 'turban' }, H(-1.5, 4.6), 1.1);
  void P;
}

function scarfTail(d: Draw, s: Skel, wind: number, wave: number) {
  const H = s.H;
  const base = H(-5.2, 1.6);
  // hangs down the back at rest, streams out behind when running
  const ang = -118 - wind * 58;
  const p1 = at(base, ang + 18 + Math.sin(wave) * 6, 7);
  const p2 = at(p1, ang + Math.sin(wave + 1) * 10, 7 + wind * 4);
  const p3 = at(p2, ang - 8 + Math.sin(wave + 2) * 14, 6 + wind * 5);
  d.ribbon({ mat: IN, z: 2, group: 'scarf', shade: -1, tex: (h) => (h.u > 0.85 ? -1 : 0) }, [base, p1, p2, p3], [2.0, 2.3, 2.5, 1.7], 0.5);
}

function sashTails(d: Draw, s: Skel, wind: number, wave: number, z: number, shade: number) {
  const k = s.T(2.0, -6.8);
  for (const [i, len] of [[0, 12], [1, 9]] as const) {
    const a = -100 - wind * 60 + i * 10;
    const p1 = at(k, a + Math.sin(wave + i) * 6, len * 0.5);
    const p2 = at(p1, a + Math.sin(wave + 1 + i) * 10, len * 0.5);
    d.ribbon({ mat: RD, z: z + i * 0.1, group: 'sash' + i, shade: shade - i }, [k, p1, p2], [1.5, 1.4, 1.0], 0.4);
  }
}

// ---------------------------------------------------------------------------
// Poses & animations (angles of daggers are absolute; reverse grip = pointing back)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -3,
  torso: 80,
  head: 84,
  legN: { ik: v(-11, 3) },
  legF: { ik: v(11, 3) },
  footN: -6,
  armN: { up: -120, lo: -60 },
  armF: { up: -20, lo: 40 },
  p: { daggerN: 200, daggerF: 30, wind: 0.2, wave: 0, smearF: 0 },
});

function idle(t: number, i: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  // a quick dagger twirl in the near hand on frames 3-4
  const twirl = i === 3 ? 90 : i === 4 ? 200 : 0;
  return tweak(IDLE, {
    y: -3 - b,
    armN: { up: -120 + b * 3, lo: -60 + b * 4 },
    armF: { up: -20 + b * 2, lo: 40 + b * 2 },
    p: { daggerN: 200 + twirl, daggerF: 30 + b * 4, wave: a, wind: 0.25 + Math.sin(a) * 0.08 },
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
  return pose({
    y: bob - 4,
    torso: 66,
    head: 78,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -150, lo: -140 },
    armF: { up: -160, lo: -150 },
    p: { daggerN: 160, daggerF: 170, wind: 1, wave: a * 2 },
  });
}

// Twin Fangs: near slash, then far slash.
const TF_READY = pose({
  x: -2, y: -7, torso: 84, head: 86,
  legN: { ik: v(-12, 3) }, legF: { ik: v(10, 3) },
  armN: { up: 120, lo: 150 }, armF: { up: -60, lo: 10 },
  p: { daggerN: 150, daggerF: 40, wind: 0.3, wave: 1 },
});
const TF_CUT1 = pose({
  x: 6, y: -8, torso: 68, head: 78,
  legN: { ik: v(-9, 3) }, legF: { ik: v(14, 3) },
  armN: { up: -10, lo: -40 }, armF: { up: 110, lo: 140 },
  p: { daggerN: -40, daggerF: 150, wind: 0.6, wave: 1.8 },
});
const TF_CUT2 = pose({
  x: 8, y: -8, torso: 64, head: 76,
  legN: { ik: v(-8, 3) }, legF: { ik: v(15, 3) },
  armN: { up: -150, lo: -120 }, armF: { up: -10, lo: -40 },
  p: { daggerN: 200, daggerF: -40, wind: 0.7, wave: 2.4, smearF: 1 },
});

// Scorpion Sting: both daggers driven forward.
const SS_COIL = pose({
  x: -3, y: -10, torso: 72, head: 82,
  legN: { ik: v(-12, 3) }, legF: { ik: v(9, 3) },
  armN: { up: -160, lo: -150 }, armF: { up: -150, lo: -140 },
  p: { daggerN: 175, daggerF: 170, wind: 0.4, wave: 1 },
});
const SS_STAB = pose({
  x: 10, y: -6, torso: 62, head: 74,
  legN: { ik: v(-6, 3) }, legF: { ik: v(18, 3) }, footN: -20,
  armN: { up: 0, lo: 2 }, armF: { up: -6, lo: -4 },
  p: { daggerN: 2, daggerF: -4, wind: 0.8, wave: 2 },
});

// Mirage Assault: four cuts from every side.
const MA_1 = pose({
  x: 4, y: -6, torso: 70, head: 80,
  legN: { ik: v(-10, 3) }, legF: { ik: v(12, 3) },
  armN: { up: 30, lo: 10 }, armF: { up: -120, lo: -90 },
  p: { daggerN: -30, daggerF: 190, wind: 0.6, wave: 1.2 },
});
const MA_2 = pose({
  x: 6, y: -10, torso: 66, head: 80,
  legN: { ik: v(-12, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -140, lo: -120 }, armF: { up: -30, lo: -60 },
  p: { daggerN: 200, daggerF: -80, wind: 0.6, wave: 1.8, smearF: 1 },
});
const MA_3 = pose({
  x: 2, y: -5, torso: 86, head: 86,
  legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) },
  armN: { up: 10, lo: 0 }, armF: { up: 170, lo: 175 },
  p: { daggerN: 20, daggerF: 190, wind: 0.8, wave: 2.4, turn: 1 },
});
const MA_4 = pose({
  x: 10, y: -7, torso: 60, head: 72,
  legN: { ik: v(-6, 3) }, legF: { ik: v(18, 3) },
  armN: { up: -4, lo: -2 }, armF: { up: -150, lo: -130 },
  p: { daggerN: -6, daggerF: 200, wind: 0.9, wave: 3 },
});

const HURT = pose({
  x: -4, y: -4, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -150, lo: -120 }, armF: { up: -60, lo: 10 },
  p: { daggerN: 200, daggerF: 60, wind: 0.4, wave: 2 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -13, torso: 74, head: 60,
  legN: { ik: v(-15, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -92, lo: -92 }, armF: { up: -76, lo: -60 },
  p: { daggerN: -95, daggerF: -100, wind: 0.1, wave: 1 },
});
const DEATH_FALL = pose({
  x: 2, y: -21, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { daggerN: -30, daggerF: -20, wind: 0.2, wave: 1.6 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { daggerN: 10, daggerF: -10, wind: 0.05, wave: 2 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'stalker',
  name: 'Akhet',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 140, idle) },
    run: { loop: true, frames: cycle(8, 65, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, TF_READY, 0.5), 60],
        [TF_READY, 120],
        [TF_CUT1, 60, { smear: true, hit: true }],
        [tweak(TF_CUT1, { x: 7, p: { daggerN: -55, wave: 2 } }), 90],
        [TF_CUT2, 60, { smear: true, hit: true }],
        [tweak(TF_CUT2, { x: 9, p: { daggerF: -60, smearF: 1, wave: 2.8 } }), 170],
        [mid(TF_CUT2, IDLE, 0.5), 90],
        [IDLE, 90],
      ]),
    },
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, SS_COIL, 0.5), 60],
        [SS_COIL, 200],
        [SS_STAB, 70, { hit: true }],
        [tweak(SS_STAB, { x: 11, torso: 60, p: { wave: 2.6 } }), 240],
        [mid(SS_STAB, IDLE, 0.5), 100],
        [IDLE, 90],
      ]),
    },
    attack3: {
      loop: false,
      frames: keys([
        [mid(IDLE, MA_1, 0.5), 60],
        [MA_1, 60, { smear: true, hit: true }],
        [tweak(MA_1, { p: { daggerN: -50, wave: 1.5 } }), 70],
        [MA_2, 60, { smear: true, hit: true }],
        [tweak(MA_2, { p: { daggerF: -95, smearF: 1, wave: 2.1 } }), 70],
        [MA_3, 70, { hit: true }],
        [tweak(MA_3, { p: { turn: 0, wave: 2.7 } }), 60],
        [MA_4, 60, { smear: true, hit: true }],
        [tweak(MA_4, { x: 11, torso: 58, p: { wave: 3.3 } }), 220],
        [mid(MA_4, IDLE, 0.5), 100],
        [IDLE, 90],
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

export const stalker: ChampionArt = {
  char,
  iconBg: MAT.indigo,
  icons: {
    twin_fangs: () =>
      compose(MAT.indigo, glyph((d) => {
        smear(d, v(20, 20), 135, -45, 18, 5, { core: C.white, edge: C.smearIndigo }, 1);
        dagger(d, v(9, 9), 45, 10, 0);
        dagger(d, v(31, 9), 135, 11, 0);
      })),
    scorpion_sting: () =>
      compose(MAT.indigo, glyph((d) => {
        // scorpion tail curling over a dagger
        const pts: V[] = [v(30, 6), v(33, 13), v(32, 21), v(27, 28), v(20, 31), v(14, 29)];
        d.ribbon({ mat: MAT.darkleather, z: 10, group: 'tail' }, pts, [3, 2.8, 2.6, 2.2, 1.8, 1.4]);
        d.poly({ mat: MAT.glowGreen, z: 10.1, group: 'sting' }, [v(14, 29), v(9, 26), v(11, 30.5)], { kind: 'bevel', w: 1 });
        dagger(d, v(8, 7), 40, 11, 0);
      }), (b) => {
        for (const [x, y] of [[9, 12], [7, 15], [11, 17]]) disc(b, x, y, 1.2, () => C.green);
      }),
    mirage_assault: () =>
      compose(MAT.indigo, glyph((d) => {
        for (const [x, ang, z] of [[8, 60, 10], [20, 90, 10.5], [32, 120, 11]] as const) dagger(d, v(x, 8), ang, z, 0);
      }), (b) => {
        // afterimage silhouettes behind the blades
        for (const [x, a] of [[10, 70], [20, 120], [30, 70]]) disc(b, x, 25, 5.5, () => withAlpha(C.smearIndigo, a));
        speedLines(b, [[3, 34, 12, 34], [14, 36, 26, 36], [28, 34, 37, 34]], C.white);
        impactStar(b, 20, 33, 1, 5, 8, C.smearIndigo, C.white);
      }),
  },
};
