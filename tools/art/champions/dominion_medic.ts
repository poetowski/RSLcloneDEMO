// The Dominion Medic (docs/DESIGN_DECISIONS.md section 17, Jakub's brief of
// 2026-10-12): a Common of the Sanguine Dominion, Support, a field medic with
// no weapon, a tunic in red and black stripes, healing potions round his
// waist. So he is a plain man of the field hospital, slight like the other
// Commons: the tunic black with crimson stripes running down it and down its
// skirt (the silhouette feature, with the empty hands), a belt hung with small
// red potions, sleeves to the elbow, forearms wrapped in bandage, brown
// trousers and boots. His one skill pulls a potion from the belt, uncorks it
// and raises it: the heal lands on every ally. What the brief leaves open is a
// first take: his face and hair, the tunic's cut, the bandages, the potions'
// red and their glass, the gesture. His affinity sets nothing here
// (affinities are abstract, Jakub, 2026-10-11): his heal rises as the potions'
// rose light (fx/sanguine_dominion.ts).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { arm, leg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face, glint } from './common.ts';

const D: Dims = {
  hipH: 32,
  thigh: 15,
  shin: 14.6,
  ankleH: 3,
  footLen: 6.4,
  spine: 20.4,
  neck: 6.4,
  upperArm: 12,
  foreArm: 11,
  shoulderDrop: 4.4,
  shoulderN: -3,
  shoulderF: 3.6,
  hipN: -1.9,
  hipF: 1.9,
};

const SK = MAT.skinDeep, RD = MAT.crimson, BK = MAT.blackCloth, LE = MAT.leather, DL = MAT.darkleather, BN = MAT.bandage, HR = MAT.hairDark, TR = MAT.faded, WD = MAT.wood;
/** a potion: the red within, the glass of its neck */
const LQ = MAT.red, GL = MAT.silver;

/** Where the red stripes run down the tunic's front half, torso-local w: bands as wide as the black between them. */
const STRIPES = [-3.8, 0.4, 4.6];

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;

  // far leg and the far tail of the tunic
  leg(d, s, 'F', legCfg(10, -1));
  skirtPanel(d, s, 'F', 11, -1);

  // far arm: a black sleeve, a bare forearm wrapped at the wrist
  arm(d, s, 'F', armCfg(20, -1));
  sleeve(d, s, 'F', 20.5, -1);

  // the tunic: black, crimson stripes running down it
  const torso = torsoPts(s, [
    [0, 5.8, 6.2],
    [4, 6.0, 6.7],
    [9, 6.5, 7.5],
    [14, 7.0, 8.0],
    [17.2, 7.0, 7.3],
    [19.2, 5.6, 4.9],
    [20.6, 3.2, 2.6],
  ]);
  d.poly({ mat: BK, z: 30, group: 'tunic' }, torso, { kind: 'cyl', a: s.T(0, 1), b: s.T(20.6, 1), r: 7.8, bevel: 1.2 });
  for (const w of STRIPES) {
    const top = w > 4 ? 17.6 : w < -3 ? 18.6 : 19.6;
    d.ribbon({ mat: RD, z: 30.2, group: 'tunic', line: 'none' }, [s.T(3.4, w), s.T(10, w + (w > 0 ? 0.6 : 0.2)), s.T(top, w * 0.92)], [1.15, 1.25, 1.1]);
  }
  // the last stripe where the chest is broad enough to carry it
  d.ribbon({ mat: RD, z: 30.2, group: 'tunic', line: 'none' }, [s.T(5, 7.0), s.T(11, 7.9), s.T(15.4, 7.6)], [0.8, 0.9, 0.8]);
  // the collar, crimson
  d.capsule({ mat: RD, z: 30.3, group: 'collar', shade: -1 }, s.T(19.8, -4), s.T(20.3, 2.8), 1.6, 1.4);
  // the belt and the potions hanging from it
  d.poly({ mat: LE, z: 32, group: 'belt', shade: -1 }, [s.T(3.3, -6.2), s.T(3.5, 6.8), s.T(1.6, 6.6), s.T(1.4, -6.0)], { kind: 'cyl', a: s.T(0, 0), b: s.T(3.3, 0), r: 6.8 });
  d.poly({ mat: MAT.iron, z: 32.1, group: 'buckle' }, [s.T(3.6, 3.0), s.T(3.6, 5.0), s.T(1.3, 5.0), s.T(1.3, 3.0)], { kind: 'bevel', w: 1 });
  skirtFront(d, s, 35);

  head(d, s, P);

  // near leg and its tail of the tunic
  leg(d, s, 'N', legCfg(50, 0));
  skirtPanel(d, s, 'N', 52, 0);

  // the potions hang from the belt, over the tunic and the legs, each at its own slant
  for (const [w, sl, k] of [[0.2, 6, 0], [3.8, -4, 1], [7.2, 8, 2]] as const) vial(d, s.T(1.6, w), s.torso - 180 + sl, 53.5 + k * 0.01, 1.15);

  // near arm, a potion in its hand when he works
  arm(d, s, 'N', armCfg(60, 0));
  sleeve(d, s, 'N', 60.5, 0);
  if (P.vial) {
    vial(d, at(s.hN, s.loN, 1.2), P.vialAng ?? 90, 61, 1.5);
    if (P.glint) glint(d, at(at(s.hN, s.loN, 1.2), P.vialAng ?? 90, 4.6), Math.round(P.glint), 62);
  }
}

const legCfg = (z: number, shade: number) => ({
  thigh: TR, shin: TR, foot: DL, rThigh: [4.0, 3.2] as [number, number], rShin: [2.9, 2.4] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: DL, from: 0.45, r: [3.2, 2.9] as [number, number], cuff: DL },
});

const armCfg = (z: number, shade: number) => ({
  upper: BK, fore: SK, hand: SK, rUp: [3.0, 2.7] as [number, number], rLo: [2.5, 2.2] as [number, number], rHand: 2.0, z, shade, cuff: BN,
});

/** The sleeve's crimson hem above the elbow, and a band of bandage round the forearm. */
function sleeve(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF, up = side === 'N' ? s.upN : s.upF, el = side === 'N' ? s.eN : s.eF, lo = side === 'N' ? s.loN : s.loF;
  const hem = at(sh, up, 8.6);
  d.capsule({ mat: RD, z, group: 'sleeve' + side, shade, line: 'none' }, at(hem, up + 90, 2.9), at(hem, up - 90, 2.9), 0.9, 0.9);
  const band = at(el, lo, 4.6);
  d.capsule({ mat: BN, z: z + 0.1, group: 'wrap' + side, shade, line: 'none' }, at(band, lo + 90, 2.5), at(band, lo - 90, 2.5), 0.8, 0.8);
}

/** A tail of the tunic along each thigh, to above the knee, striped and hemmed in crimson. */
function skirtPanel(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.35;
  const a = at(hip, hang, -1.5), b = at(hip, hang, 10.5);
  d.poly(
    { mat: BK, z, group: 'skirt' + side, shade },
    [at(a, hang + 90, 4.5), at(b, hang + 90, 5.2), at(b, hang - 90, 5.4), at(a, hang - 90, 4.5)],
    { kind: 'cyl', a, b, r: 5.4, bevel: 1 },
  );
  for (const k of [-2.4, 1.9]) d.ribbon({ mat: RD, z: z + 0.05, group: 'skirt' + side, shade, line: 'none' }, [at(a, hang - 90, k), at(b, hang - 90, k * 1.12)], [1.1, 1.15]);
  d.ribbon({ mat: RD, z: z + 0.06, group: 'skirt' + side, shade: shade - 1, line: 'none' }, [at(at(b, hang + 90, 4.9), hang, -0.6), at(at(b, hang - 90, 5.1), hang, -0.6)], [0.7, 0.7]);
}

/** The front of the tunic's skirt: hangs between the legs and swings with them, striped. */
function skirtFront(d: Draw, s: Skel, z: number) {
  const ang = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  const f0 = s.T(1.6, -2.2), f1 = s.T(1.6, 6.4);
  const f2 = at(f1, ang + 6, 11), f3 = at(f0, ang - 3, 10);
  d.poly({ mat: BK, z, group: 'skirtfront' }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 5, bevel: 1 });
  for (const t of [0.2, 0.62]) d.ribbon({ mat: RD, z: z + 0.05, group: 'skirtfront', line: 'none' }, [lerpV(f0, f1, t), lerpV(f3, f2, t)], [1.1, 1.15]);
}

/**
 * A potion: a small glass bottle of red, a cork in its neck, the glass catching
 * the light. `ang` points from the bottom to the neck; `k` scales it (1.5 in
 * the hand, 0.9 hanging from the belt).
 */
function vial(d: Draw, bottom: V, ang: number, z: number, k: number) {
  const f = d.frame(bottom, ang);
  const g = 'vial' + Math.round(z * 100);
  // the red within, bright where the light comes through; a neck of pale glass; a light cork
  d.ellipse({ mat: LQ, z, group: g }, f(1.3 * k, 0), 1.5 * k, 1.35 * k, ang);
  d.capsule({ mat: GL, z: z + 0.01, group: g, line: 'soft' }, f(2.2 * k, 0), f(3.3 * k, 0), 0.7 * k, 0.6 * k);
  d.capsule({ mat: WD, z: z + 0.02, group: g, line: 'none', minIdx: 4 }, f(3.6 * k, 0), f(4.3 * k, 0), 0.7 * k, 0.7 * k);
  d.pixels({ mat: LQ, z: z + 0.03, group: g }, [{ p: f(1.7 * k, 0.8 * k), c: ACCENT.white }]);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.0, 2.8);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.shout ? 'angry' : 'calm', mouth: P.shout ? 'shout' : 'line', lip: SK.ramp[1], rx: 6.2, ry: 6.7 });
  // close-cropped dark hair
  d.poly(
    { mat: HR, z: 38.8, group: 'hair', shade: -1, line: 'soft', tex: (_h, x, y) => ((x * 2 + y) % 4 === 0 ? -1 : 0) },
    [H(4.6, 4.8), H(3.0, 6.9), H(-0.2, 7.7), H(-3.8, 7.2), H(-6.4, 4.8), H(-7.0, 1.2), H(-6.4, -1.8), H(-4.6, -2.4), H(-3.0, -1.0), H(-1.6, 1.4), H(0.2, 3.6), H(2.4, 4.6)],
    { kind: 'dome', c: H(-1.2, 3.2), r: 8.2, bevel: 1 },
  );
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 86,
  head: 88,
  legN: { ik: v(-8, 3) },
  legF: { ik: v(8, 3) },
  armN: { up: -96, lo: -90 },
  armF: { up: -98, lo: -86 },
  p: {},
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 86 - b,
    armN: { up: -96 + b * 2, lo: -90 + b * 2 },
    armF: { up: -98 + b * 2, lo: -86 + b * 2 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (sn > 0 ? 6.5 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 2,
    torso: 76,
    head: 82,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -96 + sw * 26, lo: -50 + sw * 26 },
    armF: { up: -84 - sw * 26, lo: -40 - sw * 26 },
  });
}

// Tonic: a potion from the belt, uncorked before the chest, raised high: the heal lands.
const TN_TAKE = pose({
  x: -1, y: -1, torso: 80, head: 76,
  legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) },
  armN: { up: -60, lo: -120 }, armF: { up: -96, lo: -80 },
});
const TN_UNCORK = pose({
  y: -1, torso: 88, head: 84,
  legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) },
  armN: { up: -40, lo: 70 }, armF: { up: -50, lo: 76 },
  p: { vial: 1, vialAng: 90 },
});
const TN_RAISE = pose({
  x: 1, y: 0, torso: 92, head: 100,
  legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 70, lo: 84 }, armF: { up: -100, lo: -90 },
  p: { vial: 1, vialAng: 96, glint: 2 },
});

const HURT = pose({
  x: -4, y: -1, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -120, lo: -80 }, armF: { up: -70, lo: -20 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -13, torso: 74, head: 58,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -96, lo: -90 }, armF: { up: -80, lo: -70 },
});
const DEATH_FALL = pose({
  x: 2, y: -20, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
});
const DEATH_DOWN = pose({
  x: 6, y: -26, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
});

// Victory: a potion raised in a toast.
const TOAST = tweak(TN_RAISE, { head: 96, armN: { up: 60, lo: 98 }, p: { vial: 1, vialAng: 104, glint: 0, shout: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'dominion_medic',
  name: 'Dominion Medic',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 170, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TN_TAKE, 1, 100),
        ...keys([
          [TN_TAKE, 160],
          [TN_UNCORK, 180],
          [tweak(TN_UNCORK, { armF: { up: -40, lo: 100 } }), 120],
          [mid(TN_UNCORK, TN_RAISE, 0.5), 70],
          [TN_RAISE, 140, { hit: true }],
          [tweak(TN_RAISE, { p: { glint: 3 } }), 160],
          [tweak(TN_RAISE, { p: { glint: 1 } }), 220],
        ]),
        // the potion goes back to the belt as the arm comes down
        ...tween(D, tweak(TN_RAISE, { p: { glint: 0 } }), tweak(IDLE, { p: { vial: 0, glint: 0 } }), 2, 120, ease.inOut),
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
        [tweak(DEATH_DOWN, { y: -27 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TOAST, 2, 100, ease.out),
        ...keys([
          [TOAST, 220],
          [tweak(TOAST, { p: { glint: 2 } }), 160],
          [tweak(TOAST, { p: { glint: 3, shout: 0 } }), 420],
          [mid(TOAST, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

const E = ACCENT;

export const dominionMedic: ChampionArt = {
  char,
  iconBg: BK,
  icons: {
    tonic: () => {
      // a healing potion held up, uncorked, its red catching the light; rose light rising from it
      const art = glyph((d) => vial(d, v(20, 5), 90, 10, 6.2));
      for (const [x, y] of [[9, 9], [31, 12], [13, 3], [28, 4]] as const) {
        for (const [dx, dy, c] of [[0, 0, E.white], [1, 0, RD.ramp[5]], [-1, 0, RD.ramp[5]], [0, 1, RD.ramp[5]], [0, -1, RD.ramp[5]]] as [number, number, RGBA][]) art.set(x + dx, y + dy, c);
      }
      return compose(BK, art);
    },
  },
};
