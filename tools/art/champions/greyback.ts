// Greyback (docs/DESIGN_DECISIONS.md section 95, Jakub's brief of 2026-11-07:
// an Elite Tank of the Court of Root, Tide, the batch's "animal beast"): an old
// silverback gorilla on the Junior Ward's rig made huge: short thick legs, a
// great stooped body, long arms hanging to his knuckles, a high crest on the
// skull. Black fur, the grey saddle over his back, a bare dark chest and face,
// moss and a few fern fronds grown into the fur of his shoulders, two old
// scars across the brow. No weapon and no gear (a beast of the Court wears
// nothing). Knuckle Slam rears up and brings both fists down; Chest Beat rears
// up and drums. His affinity (Tide) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { RGBA } from '../raster.ts';

const D: Dims = {
  hipH: 31,
  thigh: 14.6,
  shin: 14.4,
  ankleH: 3,
  footLen: 7,
  spine: 26,
  neck: 5,
  upperArm: 20,
  foreArm: 20,
  shoulderDrop: 5,
  shoulderN: -3.6,
  shoulderF: 4.0,
  hipN: -2.8,
  hipF: 2.8,
};

const FU = MAT.furBlack, GR = MAT.furGrey, SK = MAT.charcoal, MO = MAT.moss, FE = MAT.pine;
const E = ACCENT;

const fur = (_h: unknown, x: number, y: number) => ((x * 3 + y * 7) % 11 === 0 ? 1 : (x * 5 + y * 3) % 17 === 0 ? -1 : 0);

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  limb(d, s.hipF, s.kneeF, s.ankF, s.pose.footF, 10, -1, 'legF', true);
  limb(d, s.sF, s.eF, s.hF, s.loF, 20, -1, 'armF', false);
  body(d, s, 30);
  head(d, s, P, 38);
  limb(d, s.hipN, s.kneeN, s.ankN, s.pose.footN, 50, 0, 'legN', true);
  limb(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN', false);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

/** A thick furred limb, the long hair hanging at the back of the forearm, a dark bare hand or foot. */
function limb(d: Draw, root: V, mid: V, end: V, endAng: number, z: number, shade: number, g: string, isLeg: boolean) {
  d.capsule({ mat: FU, z, group: g, shade, tex: fur }, root, mid, isLeg ? 6.0 : 5.4, isLeg ? 4.6 : 4.4);
  d.capsule({ mat: FU, z: z + 0.1, group: g, shade, tex: fur }, mid, end, isLeg ? 4.2 : 4.2, isLeg ? 3.4 : 3.2);
  if (!isLeg) {
    // shaggy hair hanging from the back of the forearm
    const fa = Math.atan2(end.y - mid.y, end.x - mid.x) * 57.29578;
    const T = d.frame(mid, fa);
    d.poly({ mat: FU, z: z + 0.05, group: g, shade: shade - 1, tex: fur }, [T(2, -3.6), T(6, -6.4), T(9, -4.4), T(12, -6), T(14, -3.2)], { kind: 'bevel', w: 1 });
    // the knuckles: a big dark fist
    d.ellipse({ mat: SK, z: z + 0.3, group: g, shade }, at(end, endAng, 1.6), 3.4, 2.8, endAng);
    d.pixels({ mat: SK, z: z + 0.35, group: g, line: 'none' }, [{ p: at(at(end, endAng, 3.0), endAng - 90, 1.4), c: SK.ramp[1] }, { p: at(at(end, endAng, 3.0), endAng + 90, 0.2), c: SK.ramp[1] }]);
    return;
  }
  // a broad dark foot, the big toe set apart
  const f = d.frame(end, endAng);
  d.poly({ mat: SK, z: z + 0.3, group: g, shade }, [f(-3, 1.4), f(-3.4, -2.2), f(6.6, -2.6), f(7.4, -0.8), f(4, 0.2), f(5.4, 1.4), f(1, 1.8)], { kind: 'bevel', w: 1.2 });
}

/** The great stooped body: black fur, the grey saddle over the back, a bare dark chest, moss and ferns on the shoulders. */
function body(d: Draw, s: Skel, z: number) {
  const pts = torsoPts(s, [
    [-1, 8.4, 8.8],
    [5, 9.6, 10.2],
    [11, 11.6, 11.4],
    [17, 13.0, 11.6],
    [22, 12.4, 10.0],
    [25.4, 9.4, 6.4],
    [27.4, 5.0, 2.6],
  ]);
  d.poly({ mat: FU, z, group: 'body', tex: fur }, pts, { kind: 'cyl', a: s.T(-1, 0), b: s.T(27.4, 0), r: 12, bevel: 1.4 });
  // the grey saddle across the lower back
  d.poly({ mat: GR, z: z + 0.1, group: 'saddle', line: 'none', tex: fur }, [s.T(-1, -8.6), s.T(5, -9.8), s.T(11, -11.6), s.T(15, -12.4), s.T(13, -7.4), s.T(8, -6.2), s.T(2, -6.8), s.T(-1.4, -4.4)], { kind: 'cyl', a: s.T(-1, 0), b: s.T(27, 0), r: 12 });
  // the bare chest
  d.poly({ mat: SK, z: z + 0.2, group: 'chest' }, [s.T(22, 5.4), s.T(21, 9.4), s.T(16, 10.6), s.T(11, 9.6), s.T(12, 5.4), s.T(17, 4.2)], { kind: 'dome', c: s.T(17, 7), r: 9, bevel: 1 });
  d.line({ mat: SK, z: z + 0.25, group: 'chest', line: 'none' }, s.T(20, 7.4), s.T(13, 7.8), SK.ramp[1]);
  // moss grown into the fur over the shoulders, a few fern fronds sticking up
  for (const [u, w, rx, ry] of [[23.6, -6.4, 3.4, 2.2], [25.6, -2.4, 2.6, 1.8], [20.4, -10, 2.2, 1.6]] as const) d.ellipse({ mat: MO, z: z + 0.3, group: 'moss', tex: fur }, s.T(u, w), rx, ry, s.torso);
  for (const [u, w, a] of [[24.6, -7.4, 40], [22.4, -9.6, 70], [26.4, -4.0, 20]] as const) {
    const r0 = s.T(u, w), ang = s.torso + a;
    d.ribbon({ mat: FE, z: z + 0.35, group: 'fern', line: 'soft' }, [r0, at(r0, ang, 3), at(at(r0, ang, 3), ang + 25, 3)], [0.8, 0.6, 0.3]);
  }
}

/** The head: a high crest over the skull, a heavy brow, a bare dark face, small deep eyes, two old scars. */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  d.capsule({ mat: FU, z: z - 0.5, group: 'neck', tex: fur }, s.neck, H(-1, -1), 4.2, 4.0);
  d.ellipse({ mat: FU, z, group: 'skull', tex: fur }, H(-1.4, 1.6), 6.4, 6.2, s.headDir - 90);
  // the crest rising back over the skull
  d.poly({ mat: FU, z: z + 0.05, group: 'crest', tex: fur }, [H(2.6, 5.6), H(-0.6, 9.8), H(-4.6, 10.4), H(-7.0, 6.4), H(-5.0, 2.4), H(0.4, 3.6)], { kind: 'dome', c: H(-2, 5), r: 8, bevel: 1 });
  // the bare face: a heavy brow over a broad muzzle
  const jaw = P.jaw ?? 0;
  d.poly(
    { mat: SK, z: z + 0.1, group: 'face' },
    [H(3.4, 3.4), H(6.2, 2.6), H(6.4, 0.6), H(7.4, -1.4), H(7.0, -4.0 - jaw * 1.6), H(4.6, -5.6 - jaw * 2), H(1.4, -5.0 - jaw * 1.4), H(0.8, -1.2), H(1.6, 2.2)],
    { kind: 'dome', c: H(4, -0.6), r: 7, bevel: 1 },
  );
  d.ribbon({ mat: SK, z: z + 0.15, group: 'brow', shade: -1, line: 'none' }, [H(1.8, 2.6), H(4.4, 3.0), H(6.4, 2.2)], [1.0, 1.1, 0.8]);
  const px: { p: V; c: RGBA }[] = [];
  // nostrils, the mouth's line, the two scars across the brow
  px.push({ p: H(6.6, -1.6), c: SK.ramp[0] }, { p: H(5.8, -1.8), c: SK.ramp[0] });
  if (jaw > 0.3) for (const x of [3, 4, 5]) px.push({ p: H(x, -4.6), c: INK.black }), px.push({ p: H(x, -5.4), c: E.white });
  else for (const x of [2.6, 3.6, 4.6, 5.6]) px.push({ p: H(x, -3.8), c: SK.ramp[0] });
  for (const [x, y] of [[2.4, 4.2], [3.2, 3.6], [4.0, 3.0]] as const) px.push({ p: H(x, y), c: GR.ramp[4] });
  // the eye, small and deep under the brow; shut when he is down
  if (P.dead) px.push({ p: H(4.4, 1.4), c: SK.ramp[0] }, { p: H(5.2, 1.4), c: SK.ramp[0] });
  else px.push({ p: H(4.6, 1.4), c: E.eyeAmber }, { p: H(5.2, 1.4), c: INK.eye });
  d.pixels({ mat: SK, z: z + 0.2, group: 'face', line: 'none' }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// At rest: stooped over his long arms, knuckles low before him, head thrust forward.
const IDLE = pose({
  y: -1, torso: 68, head: 46,
  legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) },
  armN: { ik: v(20, 12), bend: -1 }, armF: { ik: v(24, 13), bend: -1 },
  p: { jaw: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -1 - b, torso: 68 - b, armN: { ik: v(20, 12 - b), bend: -1 }, armF: { ik: v(24, 13 - b), bend: -1 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -9 * Math.cos(ph), y: 3 + (sn > 0 ? 5 * sn : 0), ang: sn > 0 ? -20 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.sin(a);
  // a lurching knuckle-run: the fists swing forward and plant in turn
  return pose({
    y: bob - 2, torso: 60, head: 40,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armN: { ik: v(22 + sw * 8, 9 + Math.max(0, sw) * 5), bend: -1 }, armF: { ik: v(24 - sw * 8, 9 + Math.max(0, -sw) * 5), bend: -1 },
    p: { jaw: 0.2 },
  });
}

// Knuckle Slam: he rears up, both fists high, and brings them down together on the enemy.
const KS_REAR = pose({ x: -2, y: 2, torso: 96, head: 96, legN: { ik: v(-9, 3) }, legF: { ik: v(8, 3) }, armN: { ik: v(2, 82), bend: 1 }, armF: { ik: v(4, 84), bend: 1 }, p: { jaw: 1 } });
const KS_SLAM = pose({ x: 8, y: -4, torso: 58, head: 40, legN: { ik: v(-10, 3) }, legF: { ik: v(12, 3) }, armN: { ik: v(30, 6), bend: -1 }, armF: { ik: v(32, 7), bend: -1 }, p: { jaw: 0.6 } });
const KS_HOLD = tweak(KS_SLAM, { x: 7, p: { jaw: 0.2 } });

// Chest Beat: he rears up and drums both fists on his chest, mouth wide.
const CB_UP = pose({ y: 2, torso: 94, head: 100, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, armN: { ik: v(16, 54), bend: -1 }, armF: { ik: v(16, 58), bend: -1 }, p: { jaw: 1 } });
const CB_N = tweak(CB_UP, { armN: { ik: v(10, 52), bend: -1 }, armF: { ik: v(20, 60), bend: -1 } });
const CB_F = tweak(CB_UP, { armN: { ik: v(20, 52), bend: -1 }, armF: { ik: v(10, 56), bend: -1 } });

const HURT = pose({ x: -4, y: -1, torso: 80, head: 70, legN: { ik: v(-10, 3) }, legF: { ik: v(7, 4) }, footF: 10, armN: { ik: v(12, 18), bend: -1 }, armF: { ik: v(16, 20), bend: -1 }, p: { jaw: 0.8 } });

// Death: he sags onto his knuckles, then rolls over onto his side.
const DEATH_SAG = pose({ x: 0, y: -8, torso: 54, head: 30, legN: { ik: v(-10, 3) }, legF: { ik: v(8, 3) }, footN: -20, armN: { ik: v(22, 3), bend: -1 }, armF: { ik: v(26, 3), bend: -1 }, p: { jaw: 0.3 } });
const DEATH_FALL = pose({ x: 2, y: -6, torso: 30, head: 10, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { jaw: 0.3 } });
const DEATH_DOWN = pose({ x: 6, y: -14, torso: 4, head: -4, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { dead: 1, jaw: 0.2 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'greyback',
  name: 'Greyback',
  dims: D,
  build,
  footprint: 1.4,
  anims: {
    idle: { loop: true, frames: cycle(6, 200, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, KS_REAR, 2, 100, ease.out),
        ...keys([
          [KS_REAR, 220],
          [mid(KS_REAR, KS_SLAM, 0.5), 60],
          [KS_SLAM, 90, { hit: true }],
          [KS_HOLD, 240],
        ]),
        ...tween(D, KS_HOLD, IDLE, 3, 120, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CB_UP, 2, 110, ease.out),
        ...keys([
          [CB_N, 110, { event: 'cast' }],
          [CB_F, 110],
          [CB_N, 110],
          [CB_F, 110, { hit: true }],
          [CB_N, 110],
          [CB_UP, 260],
        ]),
        ...tween(D, CB_UP, IDLE, 3, 130, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 76, head: 64 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_SAG, 0.5), 110],
        [DEATH_SAG, 260],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -14.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CB_UP, 2, 110, ease.out),
        ...keys([
          [CB_N, 120],
          [CB_F, 120],
          [CB_N, 120],
          [CB_F, 120],
          [CB_UP, 400],
          [mid(CB_UP, IDLE, 0.5), 120],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// icons
// ---------------------------------------------------------------------------

/** A big dark fist, knuckles forward, for the icons. */
function iconFist(d: Draw, c: V, ang: number, z: number) {
  const f = d.frame(c, ang);
  d.capsule({ mat: FU, z, group: 'ia' + z }, f(-16, 0), f(-3, 0), 5.6, 5.0);
  d.ellipse({ mat: SK, z: z + 0.1, group: 'if' + z }, f(1, 0), 6, 5, ang);
  for (const k of [-2.6, 0, 2.6]) d.pixels({ mat: SK, z: z + 0.2, group: 'if' + z, line: 'none' }, [{ p: f(5.4, k), c: SK.ramp[1] }]);
}

export const greyback: ChampionArt = {
  char,
  iconBg: GR,
  icons: {
    knuckle_slam: () =>
      compose(GR, glyph((d) => {
        iconFist(d, v(20, 14), -90, 10);
      }), (b) => {
        for (const [x, y] of [[10, 34], [14, 36], [26, 36], [30, 34], [8, 30], [32, 30]] as const) b.set(x, y, E.white);
      }),
    chest_beat: () =>
      compose(GR, glyph((d) => {
        iconFist(d, v(14, 20), 20, 10);
        iconFist(d, v(26, 22), 160, 11);
      }), (b) => {
        for (const [x, y] of [[20, 4], [16, 6], [24, 6], [12, 9], [28, 9]] as const) b.set(x, y, E.white);
      }),
    roused: () =>
      compose(GR, glyph((d) => {
        d.ellipse({ mat: FU, z: 10, group: 'ih' }, v(20, 20), 12, 11, 0);
        d.ellipse({ mat: SK, z: 10.1, group: 'ihf' }, v(22, 17), 8, 8, 0);
      }), (b) => {
        for (const [x, y] of [[19, 22], [20, 22], [24, 22], [25, 22]] as const) b.set(x, y, E.eyeAmber);
        for (const x of [18, 19, 20, 21, 22, 23, 24, 25, 26]) b.set(x, 28, E.white);
      }),
  },
};
