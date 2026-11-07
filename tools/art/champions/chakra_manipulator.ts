// The Chakra Manipulator (docs/DESIGN_DECISIONS.md section 88, Jakub's brief
// of 2026-11-07: "support can be Chakra Manipulator"): an Elite Support of the
// Azure Crown, a temple teacher kept at court. On the Junior Ward's rig, lean:
// a sleeveless azure wrap crossed over the chest, its white trim running from
// the near shoulder to the waist, a white sash, the wrap's skirt to the knee
// over loose white trousers, barefoot; bare upper arms, white wraps on the
// forearms; a shaved head with one long dark braid hanging down his back, his
// eyes always closed. Seven pale points glow down his centre, from the crown
// of his head to the belly, and a faint ring turns round his near palm, two
// fingers raised. Pressure Point steps in and jabs two fingers into a point;
// Open the Gates draws the palms together and opens them wide. His affinity
// (Tide) sets nothing here: the glow is what he works with, not his affinity
// (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, leg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { RGBA } from '../raster.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16.6,
  shin: 16,
  ankleH: 3,
  footLen: 6.2,
  spine: 21.6,
  neck: 6.8,
  upperArm: 12.6,
  foreArm: 12,
  shoulderDrop: 4.4,
  shoulderN: -2.8,
  shoulderF: 3.2,
  hipN: -1.8,
  hipF: 1.8,
};

const SK = MAT.skinBrown, BL = MAT.blue, WT = MAT.whiteCloth, WR = MAT.wrap, HR = MAT.hairDark, GL = MAT.glowIce;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;

  // the braid hangs behind everything
  braid(d, s, 39.5);

  // far leg in the loose white trousers, barefoot; the far arm bare
  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(20, -1));
  if (P.ringF) ring(d, s.hF, P.ringF, P.spin ?? 0, 21);

  // the azure wrap, its skirt, the white trim and sash, the seven points
  wrap(d, s, 30);

  head(d, s, P);

  // near leg
  leg(d, s, 'N', legCfg(50, 0));

  // the near arm, two fingers raised, the ring round its palm
  arm(d, s, 'N', armCfg(60, 0));
  fingers(d, s.hN, s.eN, 61, P.point ?? 0);
  ring(d, s.hN, P.ring ?? 0.6, P.spin ?? 0, 62);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: WT, shin: WT, foot: SK, rThigh: [4.4, 3.6] as [number, number], rShin: [3.4, 3.0] as [number, number], z, shade, footStyle: 'bare' as const,
});

// bare upper arms, lean; white wraps on the forearms
const armCfg = (z: number, shade: number) => ({
  upper: SK, fore: WR, hand: SK, rUp: [2.9, 2.5] as [number, number], rLo: [2.6, 2.3] as [number, number], rHand: 2.0, z, shade,
});

/** The wrap: sleeveless azure crossed over the chest, a skirt to the knee, the white trim, the sash, the seven points. */
function wrap(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 6.0, 6.2],
    [4, 6.0, 6.6],
    [9, 6.4, 7.2],
    [14, 6.8, 7.6],
    [18, 6.6, 7.0],
    [20.2, 5.0, 4.6],
    [21.6, 2.8, 2.2],
  ]);
  d.poly({ mat: BL, z, group: 'wrap', tex: (h) => (Math.sin(h.v * 7 + 0.4) > 0.88 ? -1 : 0) }, body, { kind: 'cyl', a: s.T(0, 1), b: s.T(21.6, 1), r: 7.6, bevel: 1.2 });
  // the skirt of the wrap, to the knee, hanging between the thighs
  const ang = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  const f0 = s.T(1.2, -6.6), f1 = s.T(1.2, 7.0);
  const f2 = at(f1, ang + 8, 15), f3 = at(f0, ang - 8, 14);
  d.poly({ mat: BL, z: z - 0.5, group: 'skirt', tex: (h) => (Math.sin(h.v * 9) > 0.82 ? -1 : 0) }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 7, bevel: 1 });
  d.ribbon({ mat: WT, z: z - 0.45, group: 'skirt', line: 'none' }, [lerpV(f3, f2, 0.04), lerpV(f3, f2, 0.96)], [0.7, 0.7]);
  // the trim: from the near shoulder across the chest to the waist at the front, and down the skirt's front edge
  d.ribbon({ mat: WT, z: z + 0.5, group: 'trim', line: 'soft' }, [s.T(20.6, -1.2), s.T(15, 3.4), s.T(9, 6.4), s.T(4.4, 7.0)], [0.9, 1.0, 1.0, 0.9]);
  d.ribbon({ mat: WT, z: z - 0.4, group: 'skirt', line: 'none' }, [lerpV(f1, f1, 0), lerpV(f1, f2, 0.96)], [0.8, 0.7]);
  // the white sash at the waist, its end hanging at the side
  d.poly({ mat: WT, z: z + 1, group: 'sash' }, [s.T(3.6, -6.6), s.T(3.8, 7.2), s.T(1.2, 7.0), s.T(1.0, -6.4)], { kind: 'cyl', a: s.T(1, 0), b: s.T(3.8, 0), r: 7 });
  const knot = s.T(2.4, -6.2);
  d.ribbon({ mat: WT, z: z + 1.1, group: 'sash', shade: -1, line: 'soft' }, [knot, at(knot, ang - 6, 4.6), at(at(knot, ang - 6, 4.6), ang + 4, 3.6)], [0.9, 0.8, 0.6]);
  // five of the seven points down the front of the body: belly, navel, solar plexus, heart, throat
  const pts: { p: V; c: RGBA }[] = [];
  for (const u of [5.6, 8.6, 12, 15.4, 20.4]) pts.push({ p: s.T(u, 5.2), c: GL.ramp[5] });
  d.pixels({ mat: GL, z: z + 1.3, group: 'points', line: 'none', outline: false }, pts);
}

/** A lean face, eyes closed, the head shaved; the brow and the crown of the head carry the last two points. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.4, 2.2);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: 'calm', mouth: P.grit ? 'shout' : 'line', lip: SK.ramp[1], rx: 5.8, ry: 6.6 });
  // the shaved scalp: a slightly darker dome over the crown of the head
  d.poly(
    { mat: SK, z: 38.2, group: 'scalp', line: 'none' },
    [H(3.6, 5.4), H(1.4, 7.2), H(-2.6, 7.4), H(-6.0, 5.2), H(-6.8, 2.0), H(-5.0, 2.6), H(-1.4, 4.8), H(2.2, 5.0)],
    { kind: 'dome', c: H(-1, 4), r: 7.8, bevel: 1 },
  );
  // the eyes shut: skin over the eye, a dark lash line under it; the brow point and the crown point
  d.pixels({ mat: SK, z: 38.5, group: 'head', line: 'none' }, [
    { p: H(2.7, 0.6), c: SK.ramp[3] }, { p: H(3.6, 0.6), c: SK.ramp[3] }, { p: H(3.6, -0.4), c: SK.ramp[3] },
    { p: H(2.8, -0.2), c: HR.ramp[1] }, { p: H(3.6, -0.3), c: HR.ramp[1] }, { p: H(4.4, -0.1), c: HR.ramp[1] },
  ]);
  d.pixels({ mat: GL, z: 38.6, group: 'points', line: 'none', outline: false }, [{ p: H(4.8, 3.2), c: GL.ramp[5] }, { p: H(-0.6, 7.6), c: GL.ramp[5] }]);
}

/** One long dark braid from the back of the head down his back, in bound sections, its end tied white. */
function braid(d: Draw, s: Skel, z: number) {
  const H = s.H;
  const root = H(-5.6, 3.6);
  const down = s.torso - 180;
  const p1 = at(root, down - 40, 5), p2 = at(p1, down - 22, 6), p3 = at(p2, down - 10, 6), p4 = at(p3, down - 4, 4);
  d.ribbon({ mat: HR, z, group: 'braid' }, [root, p1, p2, p3, p4], [1.8, 1.7, 1.6, 1.4, 1.1]);
  const px: { p: V; c: RGBA }[] = [];
  for (const [a, b] of [[root, p1], [p1, p2], [p2, p3]] as const) px.push({ p: lerpV(a, b, 0.5), c: HR.ramp[3] });
  d.pixels({ mat: HR, z: z + 0.1, group: 'braid', line: 'none' }, px);
  d.capsule({ mat: WT, z: z + 0.2, group: 'braid', line: 'soft' }, lerpV(p3, p4, 0.4), lerpV(p3, p4, 0.7), 1.3, 1.3);
}

/** Two fingers raised from the near hand along the forearm's line (`point` 1: straight out ahead of it). */
function fingers(d: Draw, hand: V, elbow: V, z: number, point: number) {
  const fa = (Math.atan2(hand.y - elbow.y, hand.x - elbow.x) * 180) / Math.PI;
  const ang = fa + (1 - point) * 60;
  d.capsule({ mat: SK, z, group: 'fingers', line: 'soft' }, at(hand, ang, 1.2), at(hand, ang, 4.2), 0.7, 0.6);
}

/** A faint ring turning round a palm: a tilted circle of pale points, `k` its strength (0-1), `spin` its phase. */
function ring(d: Draw, c: V, k: number, spin: number, z: number) {
  if (k <= 0) return;
  const px: { p: V; c: RGBA }[] = [];
  const n = 10, r = 4.2 + k * 1.4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + spin * Math.PI * 2;
    // the near half of the ring shows brighter; at a low strength only every other point shows
    if (k < 0.7 && i % 2 === 1) continue;
    const front = Math.sin(a) > 0;
    px.push({ p: v(Math.round(c.x + Math.cos(a) * r), Math.round(c.y + 0.5 + Math.sin(a) * r * 0.35)), c: front ? GL.ramp[5] : GL.ramp[3] });
  }
  d.pixels({ mat: GL, z, group: 'ring', line: 'none', outline: false }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// At rest: upright and still, the near hand before his chest with two fingers raised, the far hand open at his side.
const IDLE = pose({
  y: -1, torso: 90, head: 90,
  legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) },
  armN: { ik: v(11, 45), bend: -1 }, armF: { up: -96, lo: -60 },
  p: { ring: 0.6, point: 0 },
});

function idle(t: number): Pose {
  const b = Math.round((1 - Math.cos(t * Math.PI * 2)) / 2);
  return tweak(IDLE, { y: -1 - b, armN: { ik: v(11, 45 - b), bend: -1 }, p: { spin: t } });
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
  return pose({
    y: bob - 2, torso: 78, head: 84,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armN: { up: -70 + sw * 26, lo: -30 + sw * 26 }, armF: { up: -70 - sw * 26, lo: -30 - sw * 26 },
    p: { ring: 0, point: 0 },
  });
}

// Pressure Point: he draws the near hand back at the hip, steps in and jabs two fingers straight into the point.
const PP_DRAW = pose({ x: -2, y: -2, torso: 94, head: 90, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, armN: { ik: v(-8, 40), bend: -1 }, armF: { up: -40, lo: 20 }, p: { ring: 0.9, point: 1 } });
const PP_JAB = pose({ x: 9, y: -5, torso: 74, head: 80, legN: { ik: v(-13, 3) }, legF: { ik: v(16, 3) }, armN: { ik: v(24, 46), bend: -1 }, armF: { up: -120, lo: -110 }, p: { ring: 1, point: 1, grit: 1 } });
const PP_HOLD = tweak(PP_JAB, { x: 8, armN: { ik: v(22, 46), bend: -1 }, p: { grit: 0, ring: 0.8 } });

// Open the Gates: the palms drawn together before his chest, then thrown open and up, a ring round each.
const OG_GATHER = pose({ y: -2, torso: 90, head: 86, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, armN: { ik: v(5, 44), bend: -1 }, armF: { ik: v(6, 45), bend: -1 }, p: { ring: 1, ringF: 1, point: 0 } });
const OG_OPEN = pose({ y: -1, torso: 92, head: 98, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, armN: { ik: v(20, 54), bend: -1 }, armF: { ik: v(-14, 52), bend: 1 }, p: { ring: 1, ringF: 1, point: 0.4 } });
const OG_HOLD = tweak(OG_OPEN, { head: 100, p: { spin: 0.5 } });

const HURT = pose({ x: -4, y: -1, torso: 100, head: 106, legN: { ik: v(-11, 3) }, legF: { ik: v(8, 4) }, footF: 10, armN: { up: -130, lo: -90 }, armF: { up: -110, lo: -80 }, p: { ring: 0, grit: 1 } });

// Death: he settles to his knees as if to sit, then falls on his side.
const DEATH_KNEEL = pose({ x: 0, y: -12, torso: 84, head: 70, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, footN: -30, armN: { up: -80, lo: -60 }, armF: { up: -90, lo: -70 }, p: { ring: 0 } });
const DEATH_FALL = pose({
  x: 2, y: -5, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { ring: 0 },
});
const DEATH_DOWN = pose({
  x: 6, y: -15, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { ring: 0 },
});

// Victory: palms pressed together before his face, a small bow.
const BOW = pose({ y: -1, torso: 84, head: 74, legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) }, armN: { ik: v(7, 52), bend: -1 }, armF: { ik: v(8, 53), bend: -1 }, p: { ring: 0.6, ringF: 0.6, point: 0 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'chakra_manipulator',
  name: 'Chakra Manipulator',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 78, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, PP_DRAW, 2, 80, ease.out),
        ...keys([
          [PP_DRAW, 170],
          [PP_JAB, 70, { hit: true }],
          [PP_HOLD, 220],
        ]),
        ...tween(D, PP_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, OG_GATHER, 2, 100, ease.out),
        ...keys([
          [OG_GATHER, 260],
          [tweak(OG_GATHER, { p: { spin: 0.25 } }), 160],
          [mid(OG_GATHER, OG_OPEN, 0.5), 70, { event: 'cast' }],
          [OG_OPEN, 120, { hit: true }],
          [OG_HOLD, 420],
        ]),
        ...tween(D, OG_HOLD, IDLE, 3, 120, ease.inOut),
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
        [tweak(DEATH_DOWN, { y: -15.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, BOW, 0.5), 110],
        [BOW, 700],
        [mid(BOW, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons (screen space, y down: the glow points are drawn straight into the buffer)
// ---------------------------------------------------------------------------

const GLOW = [GL.ramp[3], GL.ramp[4], GL.ramp[5]];

/** A soft glowing point: a bright core, a cross of mid light, a dim halo. */
function iconPoint(b: { set(x: number, y: number, c: RGBA): void }, x: number, y: number, big = false) {
  if (big) for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]) b.set(x + dx, y + dy, GLOW[0]);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) b.set(x + dx, y + dy, GLOW[1]);
  b.set(x, y, GLOW[2]);
}

/** A hand with two fingers raised, for the icons. */
function iconHand(d: Draw, wrist: V, ang: number, z: number) {
  const f = d.frame(wrist, ang);
  d.capsule({ mat: WR, z, group: 'iarm' }, f(-14, 0), f(-1, 0), 3.4, 3.2);
  d.ellipse({ mat: SK, z: z + 0.1, group: 'ihand' }, f(2.6, 0), 3.4, 2.8, ang);
  d.capsule({ mat: SK, z: z + 0.2, group: 'ifinger' }, f(4, 1.2), f(11, 1.4), 1.1, 1.0);
  d.capsule({ mat: SK, z: z + 0.25, group: 'ifinger2' }, f(4, -1.0), f(10.4, -1.0), 1.1, 1.0);
}

export const chakraManipulator: ChampionArt = {
  char,
  iconBg: BL,
  icons: {
    pressure_point: () => {
      const art = glyph((d) => iconHand(d, v(14, 18), 14, 10));
      iconPoint(art, 33, 14, true);
      return compose(BL, art);
    },
    open_the_gates: () => {
      const art = glyph(() => {});
      // seven points down a line, the gates opening, light spreading from each
      for (let i = 0; i < 7; i++) iconPoint(art, 20, 5 + i * 5, i === 3);
      for (const [x, y] of [[13, 20], [27, 20], [10, 14], [30, 14], [10, 26], [30, 26]] as const) art.set(x, y, E.white);
      return compose(BL, art);
    },
    mended_flow: () => {
      const art = glyph(() => {});
      // a ring of points round a brighter one
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        art.set(Math.round(20 + Math.cos(a) * 11), Math.round(20 + Math.sin(a) * 6), i % 2 ? GLOW[1] : GLOW[2]);
      }
      iconPoint(art, 20, 20, true);
      return compose(BL, art);
    },
  },
};
