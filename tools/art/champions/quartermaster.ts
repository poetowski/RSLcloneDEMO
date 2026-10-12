// The Quartermaster (docs/DESIGN_DECISIONS.md section 14, Jakub's brief of
// 2026-10-12): a Common of the Azure Crown who keeps the others fed and on
// their feet. He wields a walking stick; brown leather clothes; a backpack;
// a blue insignia on the front. So he is a man of the road: a long leather
// coat, a big pack on his back (the silhouette feature, with the tall stick
// before him), the Crown's blue badge on his chest. What the brief leaves
// open is a first take: the pack's flap, the bedroll on it and the pot at its
// side; the coat's cut and the belt pouch; his age, grey hair round a bare
// crown and a grey beard; the bundle of supplies he hands out. His affinity
// sets nothing here (affinities are abstract, Jakub, 2026-10-11): his rap
// leaves a plain grey-white streak, his supplies arrive as warm light.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { arm, leg, smear, torsoPts } from '../parts.ts';
import { angleOf, at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, sub, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 32.5,
  thigh: 15.2,
  shin: 14.8,
  ankleH: 3,
  footLen: 6.6,
  spine: 20.5,
  neck: 6.6,
  upperArm: 12,
  foreArm: 11,
  shoulderDrop: 4.6,
  shoulderN: -3,
  shoulderF: 3.6,
  hipN: -1.9,
  hipF: 1.9,
};

const SK = MAT.skinBrown, LE = MAT.leather, DL = MAT.darkleather, CH = MAT.charcoal, WD = MAT.wood, IR = MAT.iron, AZ = MAT.lapis, GD = MAT.gold, HR = MAT.hairSilver, WL = MAT.faded, LN = MAT.linen;

/** The streak of the rap: plain grey-white, the colour of motion, not of an affinity. */
const SWING = { core: ACCENT.white, edge: MAT.iron.ramp[4] };

/** The walking stick: its whole length, and where the hand holds it from the foot when he swings or carries it. */
const STICK = 47, GRIP = 31;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const prev = info.prev?.pose.p;

  // the pack on his back, behind everything
  pack(d, s, 3);

  // far leg and the far tail of the coat
  leg(d, s, 'F', legCfg(10, -1));
  coatTail(d, s, 'F', 11, -1);

  // far arm, and the bundle of supplies when he hands it out
  arm(d, s, 'F', armCfg(20, -1));
  if (P.pouch) pouch(d, s.hF, 21);

  // torso: a long leather coat, belted, the Crown's blue insignia on the chest
  const torso = torsoPts(s, [
    [0, 5.8, 6.0],
    [4, 6.0, 6.5],
    [9, 6.6, 7.4],
    [14, 7.0, 7.9],
    [17.2, 7.0, 7.2],
    [19.2, 5.6, 4.8],
    [20.6, 3.2, 2.6],
  ]);
  d.poly({ mat: LE, z: 30, group: 'coat', tex: (h) => (Math.sin(h.v * 6 + 1.2) > 0.84 ? -1 : 0) }, torso, { kind: 'cyl', a: s.T(0, 1), b: s.T(20.6, 1), r: 7.6, bevel: 1.2 });
  d.line({ mat: LE, z: 30.2, group: 'coat', line: 'none' }, s.T(4.6, 6.2), s.T(16.6, 7.6), LE.ramp[1]);
  insignia(d, s, 30.5);
  // the near strap of the pack over the shoulder
  d.ribbon({ mat: DL, z: 30.6, group: 'strap' }, [s.T(20.6, -4.4), s.T(19.6, -1.2), s.T(16.8, 1.4)], [1.1, 1.2, 1.1]);
  // belt, buckle and a pouch at the front
  d.poly({ mat: DL, z: 32, group: 'belt' }, [s.T(3.3, -6.2), s.T(3.5, 6.6), s.T(1.6, 6.4), s.T(1.4, -6.0)], { kind: 'cyl', a: s.T(0, 0), b: s.T(3.3, 0), r: 6.6 });
  d.poly({ mat: IR, z: 32.1, group: 'buckle' }, [s.T(3.6, 4.4), s.T(3.6, 6.8), s.T(1.3, 6.8), s.T(1.3, 4.4)], { kind: 'bevel', w: 1 });
  d.poly({ mat: LE, z: 32.2, group: 'beltpouch', shade: -1 }, [s.T(2.2, 1.0), s.T(2.2, 4.0), s.T(-2.6, 3.8), s.T(-2.8, 1.2)], { kind: 'bevel', w: 1.2 });
  coatFront(d, s, 35);

  head(d, s, P);

  // near leg and its tail of the coat
  leg(d, s, 'N', legCfg(50, 0));
  coatTail(d, s, 'N', 52, 0);

  // the walking stick, its smear, then the near arm over it
  const st = stickAt(s, P);
  if (info.def.smear && prev && prev.stickAng !== undefined && P.stickAng !== undefined) smear(d, s.hN, prev.stickAng, P.stickAng, GRIP + 3, 8, SWING, 55);
  stick(d, st.foot, st.top, 56);
  arm(d, s, 'N', armCfg(60, 0));
}

const legCfg = (z: number, shade: number) => ({
  thigh: CH, shin: CH, foot: DL, rThigh: [4.1, 3.3] as [number, number], rShin: [3.0, 2.5] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: DL, from: 0.42, r: [3.3, 3.0] as [number, number], cuff: LE },
});

const armCfg = (z: number, shade: number) => ({
  upper: LE, fore: LE, hand: SK, rUp: [3.0, 2.7] as [number, number], rLo: [2.6, 2.3] as [number, number], rHand: 2.0, z, shade, cuff: DL,
});

/** Where the stick runs: planted (its foot fixed on the ground at `plant`, the hand sliding on it) or, with `free`, swung (`stickAng` from the hand to its foot, held `grip` from the foot). */
function stickAt(s: Skel, P: Record<string, number>): { foot: V; top: V } {
  if ((P.free ?? 0) < 0.5 && P.plant !== undefined) {
    const foot = v(P.plant, 0.6);
    const up = angleOf(sub(s.hN, foot));
    return { foot, top: at(foot, up, STICK) };
  }
  const a = P.stickAng ?? -80, grip = P.grip ?? GRIP;
  return { foot: at(s.hN, a, grip), top: at(s.hN, a, grip - STICK) };
}

/** The walking stick: a long staff of wood, a worn knob on top, an iron ferrule at its foot. */
function stick(d: Draw, foot: V, top: V, z: number) {
  d.capsule({ mat: WD, z, group: 'stick', tex: (h) => (Math.sin(h.u * 37) > 0.86 ? -1 : 0) }, foot, top, 1.1, 1.2);
  d.capsule({ mat: IR, z: z + 0.05, group: 'stick', shade: -1 }, foot, lerpV(foot, top, 0.05), 1.35, 1.3);
  d.circle({ mat: WD, z: z + 0.06, group: 'stick' }, top, 1.9);
}

/** The pack: a box of dark leather with a lighter flap and a buckle, a bedroll on top, a small pot at its side. */
function pack(d: Draw, s: Skel, z: number) {
  const g = 'pack';
  d.poly({ mat: DL, z, group: g }, [s.T(4.6, -6.0), s.T(4.0, -14.4), s.T(5.8, -16.2), s.T(19.0, -16.0), s.T(21.2, -14.0), s.T(21.2, -6.4)], { kind: 'bevel', w: 1.8 });
  d.poly({ mat: LE, z: z + 0.1, group: g, shade: -1 }, [s.T(21.4, -6.2), s.T(21.4, -14.2), s.T(19.2, -16.2), s.T(12.2, -16.0), s.T(11.0, -13.6), s.T(11.2, -6.4)], { kind: 'bevel', w: 1.4 });
  d.poly({ mat: IR, z: z + 0.2, group: g }, [s.T(12.8, -10.2), s.T(12.8, -12.2), s.T(10.6, -12.2), s.T(10.6, -10.2)], { kind: 'bevel', w: 1 });
  // the bedroll strapped along the top: a roll of wool and two leather straps round it
  d.capsule({ mat: WL, z: z + 0.3, group: 'roll' }, s.T(23.2, -5.4), s.T(23.2, -16.6), 2.7, 2.7);
  for (const w of [-8.2, -13.8]) d.capsule({ mat: DL, z: z + 0.35, group: 'roll', line: 'none' }, s.T(25.4, w), s.T(21.0, w), 0.7, 0.7);
  // a small pot hanging at the side
  const pot = s.T(5.0, -17.4);
  d.ellipse({ mat: IR, z: z - 0.1, group: 'pot', shade: -1 }, pot, 2.4, 2.0, s.torso - 90);
}

/** The Azure Crown's insignia on the chest: a blue badge with a small gold crown. */
function insignia(d: Draw, s: Skel, z: number) {
  const c = s.T(12.8, 3.4);
  d.circle({ mat: AZ, z, group: 'badge', line: 'soft' }, c, 2.3);
  const f = d.frame(c, s.torso - 90);
  d.pixels({ mat: GD, z: z + 0.1, group: 'badge' }, [
    { p: f(-1, 0.8), c: GD.ramp[5] }, { p: f(1, 0.8), c: GD.ramp[4] },
    { p: f(-1, -0.3), c: GD.ramp[4] }, { p: f(0, -0.3), c: GD.ramp[4] }, { p: f(1, -0.3), c: GD.ramp[3] },
  ]);
}

/** A tail of the coat along each thigh, to above the knee, its hem worn darker. */
function coatTail(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.35;
  const a = at(hip, hang, -1.5), b = at(hip, hang, 12);
  d.poly(
    { mat: LE, z, group: 'tail' + side, shade, tex: (h) => (Math.sin(h.v * 7 + (side === 'N' ? 0 : 1.5)) > 0.78 ? -1 : 0) },
    [at(a, hang + 90, 4.6), at(b, hang + 90, 5.4), at(b, hang - 90, 5.6), at(a, hang - 90, 4.6)],
    { kind: 'cyl', a, b, r: 5.6, bevel: 1 },
  );
  d.ribbon({ mat: LE, z: z + 0.05, group: 'tail' + side, shade: shade - 1, line: 'none' }, [at(at(b, hang + 90, 5.0), hang, -0.6), at(at(b, hang - 90, 5.2), hang, -0.6)], [0.7, 0.7]);
}

/** The front of the coat: hangs between the legs and swings with them. */
function coatFront(d: Draw, s: Skel, z: number) {
  const ang = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  const f0 = s.T(1.6, -2.2), f1 = s.T(1.6, 6.6);
  const f2 = at(f1, ang + 6, 12.5), f3 = at(f0, ang - 3, 11.5);
  d.poly({ mat: LE, z, group: 'coatfront', tex: (h) => (Math.sin(h.v * 9) > 0.75 ? -1 : 0) }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 5, bevel: 1 });
  d.ribbon({ mat: LE, z: z + 0.05, group: 'coatfront', shade: -1, line: 'none' }, [lerpV(f3, f2, 0.06), lerpV(f3, f2, 0.94)], [0.7, 0.7]);
}

/** The bundle of supplies: linen tied with a leather string. */
function pouch(d: Draw, hand: V, z: number) {
  d.ellipse({ mat: LN, z, group: 'pouch' }, v(hand.x, hand.y + 2.2), 3.0, 2.6, 0);
  d.capsule({ mat: DL, z: z + 0.05, group: 'pouch' }, v(hand.x - 1.4, hand.y + 4.4), v(hand.x + 1.4, hand.y + 4.4), 0.7, 0.7);
  d.ellipse({ mat: SK, z: z + 0.1, group: 'pouch', shade: -1 }, hand, 2.1, 1.9, 0);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.0, 2.8);
  d.capsule({ mat: LE, z: 37.6, group: 'collar' }, s.T(19.8, -3.6), s.T(20.3, 2.8), 2.0, 1.8);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[3], browStyle: P.shout ? 'angry' : 'calm', mouth: P.shout ? 'shout' : 'none', rx: 6.2, ry: 6.7 });
  // short grey hair, the hairline receding from the brow
  d.poly(
    { mat: HR, z: 38.8, group: 'hair', shade: -1, maxIdx: 4, line: 'soft', tex: (h, x, y) => ((x * 2 + y) % 5 === 0 ? -1 : 0) },
    [H(2.4, 6.2), H(0.4, 7.7), H(-2.8, 7.8), H(-5.6, 6.2), H(-7.0, 3.0), H(-7.0, -0.6), H(-6.4, -2.4), H(-4.8, -2.9), H(-3.0, -1.5), H(-1.4, 0.8), H(-0.4, 3.2), H(0.8, 5.0)],
    { kind: 'dome', c: H(-2, 3), r: 8.4, bevel: 1 },
  );
  // a short grey beard along the jaw, fuller at the chin, and a moustache
  d.poly(
    { mat: HR, z: 38.5, group: 'beard', shade: -1, line: 'soft' },
    [H(-0.2, 1.0), H(0.6, -2.2), H(2.0, -5.0), H(3.8, -7.4), H(5.6, -7.6), H(7.0, -6.0), H(7.0, -4.4), H(5.6, -4.4), H(4.2, -3.9), H(2.6, -2.6), H(1.4, -0.4), H(1.0, 1.0)],
    { kind: 'dome', c: H(3, -3.8), r: 7, bevel: 0.6 },
  );
  d.pixels({ mat: HR, z: 38.6, group: 'beard' }, [{ p: H(4.6, -3.0), c: HR.ramp[3] }, { p: H(5.4, -3.0), c: HR.ramp[3] }, { p: H(6.2, -3.1), c: HR.ramp[2] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the stick's angle runs from the hand to its foot: 0 forward, -90 down)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 82,
  head: 84,
  legN: { ik: v(-8, 3) },
  legF: { ik: v(9, 3) },
  armN: { up: -70, lo: 32 },
  armF: { up: -96, lo: -78 },
  p: { plant: 16 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 82 - b,
    armN: { up: -70 + b * 2, lo: 32 + b },
    armF: { up: -96 + b * 2, lo: -78 + b * 2 },
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
    torso: 74,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -62 + sw * 12, lo: -14 + sw * 12 },
    armF: { up: -84 - sw * 26, lo: -50 - sw * 26 },
    p: { free: 1, grip: 41, stickAng: -72 + sw * 8 },
  });
}

// Stick Rap: the stick comes up over his shoulder and down at the enemy.
const SR_WIND = pose({
  x: -2, y: -1, torso: 92, head: 88,
  legN: { ik: v(-10, 3) }, legF: { ik: v(8, 3) },
  armN: { up: 104, lo: 136 }, armF: { up: -78, lo: -44 },
  p: { free: 1, stickAng: 150 },
});
const SR_HIT = pose({
  x: 7, y: -3, torso: 70, head: 78,
  legN: { ik: v(-9, 3) }, legF: { ik: v(14, 3) },
  armN: { up: -2, lo: -24 }, armF: { up: -120, lo: -100 },
  p: { free: 1, stickAng: -42 },
});
const SR_FOLLOW = tweak(SR_HIT, { x: 8, torso: 68, armN: { up: -16, lo: -44 }, p: { stickAng: -64 } });

// Field Rations: he reaches into the pack, pulls out a bundle of supplies and holds it up for the others.
const FR_REACH = pose({
  x: -1, torso: 88, head: 100,
  legN: { ik: v(-8, 3) }, legF: { ik: v(9, 3) },
  armN: { up: -70, lo: 32 }, armF: { ik: v(-6, 56), bend: 1 },
  p: { plant: 16 },
});
const FR_PULL = tweak(FR_REACH, { head: 92, armF: { ik: v(3, 57), bend: 1 }, p: { plant: 16, pouch: 1 } });
const FR_GIVE = pose({
  x: 1, y: 0, torso: 84, head: 90,
  legN: { ik: v(-8, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -70, lo: 32 }, armF: { up: 36, lo: 62 },
  p: { plant: 17, pouch: 1, shout: 1 },
});

const HURT = pose({
  x: -4, y: -1, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -110, lo: -40 }, armF: { up: -60, lo: 12 },
  p: { free: 1, stickAng: -120 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -13, torso: 76, head: 60,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -90, lo: -86 }, armF: { up: -80, lo: -66 },
  p: { free: 1, stickAng: -100 },
});
const DEATH_FALL = pose({
  x: 2, y: -20, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { free: 1, stickAng: -20 },
});
const DEATH_DOWN = pose({
  x: 6, y: -26, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { free: 1, stickAng: 6 },
});

// Victory: the stick planted, a wave of the free hand.
const WAVE = pose({
  y: -1, torso: 86, head: 90,
  legN: { ik: v(-8, 3) }, legF: { ik: v(9, 3) },
  armN: { up: -70, lo: 32 }, armF: { up: 70, lo: 104 },
  p: { plant: 16 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'quartermaster',
  name: 'Quartermaster',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 170, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SR_WIND, 1, 90),
        ...keys([
          [SR_WIND, 180],
          [mid(SR_WIND, SR_HIT, 0.5), 50],
          [SR_HIT, 60, { smear: true, hit: true }],
          [SR_FOLLOW, 200],
        ]),
        ...tween(D, SR_FOLLOW, IDLE, 2, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, FR_REACH, 1, 100),
        ...keys([
          [FR_REACH, 160],
          [FR_PULL, 120],
          [mid(FR_PULL, FR_GIVE, 0.5), 70],
          [FR_GIVE, 140, { hit: true }],
          [tweak(FR_GIVE, { y: -1, p: { shout: 0 } }), 320],
        ]),
        ...tween(D, FR_GIVE, IDLE, 2, 120, ease.inOut),
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
        ...tween(D, IDLE, WAVE, 2, 100, ease.out),
        ...keys([
          [tweak(WAVE, { armF: { up: 64, lo: 120 } }), 160],
          [WAVE, 160],
          [tweak(WAVE, { armF: { up: 64, lo: 120 } }), 160],
          [WAVE, 420],
          [mid(WAVE, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** The walking stick in an icon, thicker for 40x40. */
function iconStick(d: Draw, foot: V, top: V, z: number) {
  d.capsule({ mat: WD, z, group: 'istick', tex: (h) => (Math.sin(h.u * 26) > 0.86 ? -1 : 0) }, foot, top, 1.8, 2.0);
  d.capsule({ mat: IR, z: z + 0.05, group: 'istick', shade: -1 }, foot, lerpV(foot, top, 0.07), 2.2, 2.1);
  d.circle({ mat: WD, z: z + 0.06, group: 'istick' }, top, 3.0);
}

const E = ACCENT;

export const quartermaster: ChampionArt = {
  char,
  iconBg: LE,
  icons: {
    stick_rap: () =>
      compose(LE, glyph((d) => {
        smear(d, v(8, 10), 150, 40, 30, 6, SWING, 1);
        iconStick(d, v(31, 31), v(7, 7), 10);
      }), (b) => {
        impactStar(b, 31, 9, 2, 9, 10, FXR.dust[3], E.white);
      }),
    field_rations: () =>
      compose(LE, glyph((d) => {
        // the bundle of supplies, held up
        d.ellipse({ mat: LN, z: 10, group: 'ib' }, v(20, 15), 9, 7.5, 0);
        d.poly({ mat: LN, z: 10.1, group: 'ib' }, [v(15, 21), v(20, 27), v(25, 21)], { kind: 'bevel', w: 1.5 });
        d.capsule({ mat: DL, z: 10.2, group: 'ib' }, v(15.5, 21.5), v(24.5, 21.5), 1.2, 1.2);
      }), (b) => {
        // warm light rising from it, and the turn it lends: a gold chevron
        for (const [x, y] of [[9, 9], [31, 12], [12, 4]] as const) {
          for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, dx || dy ? FXR.gold[3] : E.white);
        }
        for (const [dx, dy] of [[0, 0], [1, -1], [2, -2], [3, -1], [4, 0], [1, 0], [3, 0]]) b.set(29 + dx, 5 + dy, E.goldHot);
        for (const [dx, dy] of [[0, 4], [1, 3], [2, 2], [3, 3], [4, 4]]) b.set(29 + dx, 5 + dy, E.chiGold);
      }),
  },
};

