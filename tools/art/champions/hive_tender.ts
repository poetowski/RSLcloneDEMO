// The Hive Tender (docs/DESIGN_DECISIONS.md section 52, 2026-11-01, my proposal on
// Jakub's word): a Common Support of the Court of Root, a woman of the semi-wild
// tribes. Brown skin, bare arms and shins, a woven grass hat, a green shawl over a
// tunic of dark leather, a skirt of grass strands; a long pole in her near hand
// with a straw hive hanging from its end, her bees round it (the silhouette: the
// pole and the hive). No insignia: the Court shares a nature, not a hierarchy. Her
// affinity (Bloom) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, leg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 32,
  thigh: 15,
  shin: 15,
  ankleH: 3,
  footLen: 5.6,
  spine: 19,
  neck: 6,
  upperArm: 11.6,
  foreArm: 11,
  shoulderDrop: 3.8,
  shoulderN: -2.6,
  shoulderF: 3,
  hipN: -1.6,
  hipF: 1.6,
};

const SK = MAT.skinBrown, TN = MAT.darkleather, SH = MAT.moss, GS = MAT.straw, WD = MAT.wood, HV = MAT.straw, HR = MAT.hairDark;
const E = ACCENT;
const BEE = MAT.yellowCloth;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;
  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(14, -1));
  tunic(d, s, wave, 30);
  head(d, s, P);
  leg(d, s, 'N', legCfg(26, 0));
  grassSkirt(d, s, wave, 32);
  shawl(d, s, wave, 34);
  const ang = P.pole ?? 66;
  if (P.drop) pole(d, v(-20, 3.4), 2, wave, 0, 50, false);
  else pole(d, s.hN, ang, wave, P.swing ?? 0, 50, true);
  arm(d, s, 'N', armCfg(60, 0));
}

const legCfg = (z: number, shade: number) => ({
  thigh: SK, shin: SK, foot: TN, rThigh: [3.2, 2.5] as [number, number], rShin: [2.3, 1.7] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: TN, from: 0.84, r: [2.2, 2.4] as [number, number], cuff: TN },
});
const armCfg = (z: number, shade: number) => ({
  upper: SK, fore: SK, hand: SK, rUp: [2.1, 1.8] as [number, number], rLo: [1.8, 1.5] as [number, number], rHand: 1.8, z, shade,
});

function tunic(d: Draw, s: Skel, wave: number, z: number) {
  void wave;
  const body = torsoPts(s, [
    [0, 5.0, 5.2],
    [4, 4.4, 4.8],
    [9, 4.8, 5.6],
    [13, 5.2, 6.0],
    [16, 5.0, 5.0],
    [19, 3.2, 2.8],
  ]);
  d.poly({ mat: TN, z, group: 'tunic' }, body, { kind: 'cyl', a: s.T(0, 0.4), b: s.T(19, 0.4), r: 5.8, bevel: 1.2 });
}

/** A skirt of grass strands from the waist to the knee, each stirring a little. */
function grassSkirt(d: Draw, s: Skel, wave: number, z: number) {
  const rootOf = (w: number) => s.T(1.4, w);
  for (let k = 0; k < 8; k++) {
    const w = -5.4 + k * 1.6;
    const r = rootOf(w);
    const a = s.pose.torso - 180 + (k - 3.5) * 3.4 + Math.sin(wave + k) * 3;
    const l = 14 - (k % 3) * 1.6;
    d.ribbon({ mat: GS, z: z + k * 0.01, group: 'grass' + k, shade: k % 2 ? -1 : 0, line: 'soft' }, [r, at(r, a, l * 0.5), at(r, a + 2, l)], [1.1, 1.0, 0.5]);
  }
}

/** The green shawl over her shoulders, one end hanging down the back. */
function shawl(d: Draw, s: Skel, wave: number, z: number) {
  const w = Math.sin(wave);
  d.poly({ mat: SH, z, group: 'shawl' }, [s.T(19.6, 2.6), s.T(20, -2), s.T(18, -6.2), s.T(14, -7), s.T(9 - w * 0.4, -7.4), s.T(10.4, -3.4), s.T(11.6, 1), s.T(11.2, 5.0), s.T(15.6, 6.0)], { kind: 'cyl', a: s.T(10, 0), b: s.T(20, 0), r: 6.6, bevel: 1.1 });
}

/** Her face under the wide woven hat, the dark hair falling behind. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.1, 1.9);
  d.poly({ mat: HR, z: 37.6, group: 'hair' }, [H(-3, 3), H(-7, 2), H(-8.4, -3), H(-7.6, -9), H(-4, -9), H(-2.6, -4)], { kind: 'bevel', w: 1.2 });
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.grit ? 'angry' : 'flat', mouth: P.grit ? 'shout' : 'line', lip: SK.ramp[2], rx: 5.4, ry: 6.0, profile: 'soft' });
  // the hat: a keeper's round woven crown, a wide flat brim, a band of the shawl's green
  d.poly({ mat: GS, z: 39, group: 'hat', line: 'soft', tex: (h) => (Math.sin(h.u * 30) > 0.6 ? -1 : 0) }, [H(5.0, 3.2), H(4.8, 7), H(2, 9.2), H(-2.6, 9.4), H(-5.8, 7.2), H(-6.4, 3)], { kind: 'dome', c: H(-0.8, 5), r: 7.4, bevel: 1.2 });
  d.ribbon({ mat: GS, z: 39.2, group: 'brim' }, [H(11.4, 2.2), H(6, 3), H(0, 3.2), H(-6.2, 2.8), H(-11.4, 1.8)], [0.7, 1.0, 1.1, 1.0, 0.7]);
  d.ribbon({ mat: SH, z: 39.1, group: 'hatband', line: 'none' }, [H(5, 4.4), H(0, 4.8), H(-6.2, 4.2)], [0.9, 0.9, 0.9]);
}

/** The pole through her hand, the cord from its end, the straw hive with its rings and door, her bees circling. */
function pole(d: Draw, hand: V, ang: number, wave: number, swing: number, z: number, bees: boolean) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: WD, z, group: 'pole' }, f(-8, 0), f(30, 0), 0.9, 0.8);
  const end = f(30, 0);
  const hang = -90 + swing + Math.sin(wave) * 4;
  const c = bees ? at(end, hang, 8) : v(end.x + 6, 6.8);
  d.capsule({ mat: MAT.charcoal, z: z + 0.1, group: 'cord', line: 'none' }, end, at(end, hang, 3), 0.5, 0.5);
  const k = d.frame(c, hang + 180);
  d.poly({ mat: HV, z: z + 0.2, group: 'hive', tex: (h) => (Math.sin(h.u * 22) > 0.5 ? -1 : 0) }, [k(-6, -3.6), k(-4, -6.2), k(0, -6.8), k(3.4, -5.4), k(5, -2.4), k(5, 2.4), k(3.4, 5.4), k(0, 6.8), k(-4, 6.2), k(-6, 3.6)], { kind: 'dome', c: k(-1, 0), r: 7.2, bevel: 1.2 });
  d.pixels({ mat: HV, z: z + 0.3, group: 'door', outline: false, line: 'none' }, [k(-2.8, 3.2), k(-2.8, 4.2), k(-3.8, 3.2), k(-3.8, 4.2)].map((p) => ({ p, c: MAT.bark.ramp[0] })));
  if (!bees) return;
  const px: { p: V; c: typeof E.white }[] = [];
  for (let n = 0; n < 5; n++) {
    const a = wave + n * 1.26;
    const r = 9 + (n % 2) * 3.4;
    px.push({ p: v(c.x + Math.cos(a) * r, c.y + Math.sin(a * 2) * 3 + Math.sin(a) * r * 0.55), c: BEE.ramp[4] });
  }
  d.pixels({ mat: BEE, z: z + 8, group: 'bees', line: 'none', outline: false }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations (the pole's angle is absolute: 0 forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 88,
  head: 88,
  legN: { ik: v(-5, 3) },
  legF: { ik: v(6, 3) },
  armN: { up: -32, lo: 6 },
  armF: { up: -78, lo: -60 },
  p: { pole: 66, swing: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -1 - b, p: { pole: 66 + b, wave: a } });
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
  return tweak(IDLE, { y: bob - 2, torso: 80, head: 84, legN: { ik: v(n.x, n.y) }, legF: { ik: v(f.x, f.y) }, footN: n.ang, footF: f.ang, p: { pole: 58, swing: -18, wave: a * 2 } });
}

// Sting Swarm: the pole drawn back, then tipped hard at the enemy, the hive swinging out.
const SS_DRAW = tweak(IDLE, { x: -2, torso: 96, head: 92, armN: { up: -40, lo: 40 }, p: { pole: 104, swing: -14 } });
const SS_TIP = tweak(IDLE, { x: 3, torso: 76, head: 80, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, armN: { up: -12, lo: 4 }, p: { pole: 26, swing: 36, grit: 1 } });
const SS_HOLD = tweak(SS_TIP, { torso: 80, p: { pole: 36, swing: 14, grit: 0 } });

// Comb Honey: the pole raised straight, her free hand lifted to the hive to take the comb, then held out.
const CH_RAISE = tweak(IDLE, { y: 0, torso: 92, head: 98, armN: { up: -24, lo: 34 }, armF: { up: 40, lo: 76 }, p: { pole: 84 } });
const CH_OFFER = tweak(IDLE, { x: 1, torso: 86, head: 86, armN: { up: -32, lo: 10 }, armF: { up: -6, lo: 14 }, p: { pole: 72, wave: 2 } });

const HURT = tweak(IDLE, { x: -4, torso: 98, head: 104, armF: { up: -60, lo: -20 }, p: { pole: 94, swing: -20, grit: 1 } });
const DEATH_KNEEL = pose({
  x: 0, y: -11, torso: 70, head: 58,
  legN: { ik: v(-13, 3) }, legF: { ik: v(8, 3) }, footN: -30,
  armN: { up: -50, lo: 0 }, armF: { up: -70, lo: 10 },
  p: { pole: 120, swing: -30 },
});
const DEATH_FALL = pose({
  x: 2, y: -7, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { drop: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -15, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { drop: 1 },
});

// Victory: the pole lifted high, the bees round it, her free hand up.
const VICTORY = tweak(IDLE, { y: 0, torso: 90, head: 96, armN: { up: 40, lo: 74 }, armF: { up: 30, lo: 60 }, p: { pole: 88, wave: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'hive_tender',
  name: 'Hive Tender',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 180, idle) },
    run: { loop: true, frames: cycle(8, 82, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SS_DRAW, 2, 100, ease.out),
        ...keys([
          [SS_DRAW, 200],
          [mid(SS_DRAW, SS_TIP, 0.5), 60],
          [SS_TIP, 90, { hit: true }],
          [SS_HOLD, 240],
        ]),
        ...tween(D, SS_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CH_RAISE, 3, 110, ease.out),
        ...keys([
          [CH_RAISE, 260],
          [mid(CH_RAISE, CH_OFFER, 0.5), 90],
          [CH_OFFER, 300, { hit: true }],
          [tweak(CH_OFFER, { p: { wave: 3 } }), 220],
        ]),
        ...tween(D, CH_OFFER, IDLE, 3, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 95, head: 100 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 260],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -15.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VICTORY, 2, 110, ease.out),
        ...keys([
          [VICTORY, 300],
          [tweak(VICTORY, { p: { wave: 2.4 } }), 300],
          [tweak(VICTORY, { p: { wave: 4 } }), 300],
          [mid(VICTORY, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

function iconHive(d: Draw, c: V, k: number, z: number) {
  const H = (x: number, y: number) => v(c.x + x * k, c.y + y * k);
  d.poly({ mat: HV, z, group: 'ihive', tex: (h) => (Math.sin(h.u * 26) > 0.5 ? -1 : 0) }, [H(-9, -8), H(9, -8), H(11, -2), H(9, 5), H(5, 10), H(0, 12), H(-5, 10), H(-9, 5), H(-11, -2)], { kind: 'dome', c: H(0, 0), r: 12 * k, bevel: 1.4 });
}

export const hiveTender: ChampionArt = {
  char,
  iconBg: SH,
  icons: {
    sting_swarm: () =>
      compose(SH, glyph((d) => {
        iconHive(d, v(12, 20), 0.8, 10);
      }), (b) => {
        const Y = BEE.ramp;
        for (const [x, y] of [[24, 16], [27, 20], [30, 15], [33, 19], [29, 24], [35, 13], [36, 23]] as const) {
          b.set(x, y, Y[5]);
          b.set(x + 1, y, Y[2]);
        }
      }),
    comb_honey: () =>
      compose(SH, glyph((d) => {
        // a piece of comb
        d.poly({ mat: BEE, z: 10, group: 'icomb' }, [v(9, 24), v(16, 34), v(28, 34), v(33, 24), v(28, 14), v(14, 14)], { kind: 'bevel', w: 1.6 });
      }), (b) => {
        const Y = BEE.ramp;
        for (const [x, y] of [[14, 12], [20, 12], [26, 12], [11, 18], [17, 18], [23, 18], [29, 18], [14, 24], [20, 24], [26, 24]] as const) {
          b.set(x, y, Y[1]);
          b.set(x + 1, y, Y[1]);
        }
        for (const [x, y, c] of [[21, 28, 4], [21, 31, 3], [21, 34, 2]] as const) b.set(x, y, Y[c]);
      }),
  },
};
