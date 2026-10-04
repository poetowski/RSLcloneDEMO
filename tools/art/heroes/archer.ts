// Sylwen, the Wildwood Ranger — player ranged damage / debuffer. Hooded green
// cloak, leather jerkin, blonde braid, longbow with gold nocks and a quiver.
// Signature color: forest green + leather.
import { BuildInfo, CharDef, cycle, keys, tween } from '../char.ts';
import { INK, MAT } from '../palette.ts';
import { arm, cape, leg, torsoPts } from '../parts.ts';
import { hex } from '../raster.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, solve, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 33,
  thigh: 15.5,
  shin: 15.5,
  ankleH: 3,
  footLen: 6,
  spine: 19.5,
  neck: 7.4,
  upperArm: 12,
  foreArm: 11,
  shoulderDrop: 3.8,
  shoulderN: -2.4,
  shoulderF: 2.8,
  hipN: -1.4,
  hipF: 1.4,
};

const GR = MAT.green, LE = MAT.leather, DL = MAT.darkleather, MO = MAT.moss, SK = MAT.skinLight, HB = MAT.hairBlonde, WD = MAT.wood, GD = MAT.gold;
const STRING = hex('#efe6d2');

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;

  // cloak hanging from the shoulders
  cape(d, s, { mat: GR, z: 2, len: 29, topU: 17.5, topBack: 6, topFront: 1.5, spread: 6, wind: P.cape ?? 0.15, wave: P.wave ?? 0 });

  // quiver on the back, fletchings above the shoulder
  quiver(d, s);

  // braid behind the back
  braid(d, s, P.braid ?? 0);

  // far leg: moss leggings + leather boots
  leg(d, s, 'F', {
    thigh: MO, shin: MO, foot: LE, rThigh: [3.9, 3.1], rShin: [3.0, 2.4], z: 10, shade: -1, footStyle: 'boot',
    boot: { mat: LE, from: 0.28, r: [3.4, 2.8], cuff: DL },
  });

  // far arm (bow arm)
  arm(d, s, 'F', { upper: GR, fore: LE, hand: DL, rUp: [2.9, 2.5], rLo: [2.5, 2.2], rHand: 2.2, z: 20, shade: -1, cuff: DL });

  // torso: leather jerkin over a green tunic
  const torso = torsoPts(s, [
    [0, 5.2, 5.4],
    [4, 5.0, 5.6],
    [8.5, 5.4, 6.6],
    [12.5, 6.0, 7.4],
    [16, 6.2, 6.2],
    [18.5, 4.8, 4.0],
    [20, 2.8, 2.2],
  ]);
  d.poly({ mat: LE, z: 30, group: 'body' }, torso, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(20, 0.6), r: 6.6, bevel: 1.3 });
  // lacing down the front
  const lace = LE.ramp[1];
  d.pixels({ mat: LE, z: 30.2, group: 'body' }, [4, 6.5, 9, 11.5].map((u) => ({ p: s.T(u, 5.2), c: lace })));
  // quiver strap across the chest
  d.capsule({ mat: DL, z: 31, group: 'body' }, s.T(18.5, 3.5), s.T(3.5, -5.5), 1.1, 1.1);
  // belt + pouch
  d.poly({ mat: DL, z: 33, group: 'body' }, [s.T(2.6, -5.4), s.T(2.8, 5.8), s.T(0.4, 5.6), s.T(0.2, -5.2)], { kind: 'cyl', a: s.T(0, 0), b: s.T(3, 0), r: 5.8 });
  d.circle({ mat: GD, z: 33.2, group: 'body', line: 'none' }, s.T(1.5, 5.0), 1.0);
  d.ellipse({ mat: LE, z: 33.3, group: 'pouch' }, s.T(-0.6, -4.2), 2.2, 2.6, s.torso);

  // tunic skirt (front flap)
  const flapAng = Math.max(-125, Math.min(-55, (s.thN + s.thF) / 2));
  const f0 = s.T(0.5, -3.5), f1 = s.T(0.5, 5.8);
  const f2 = at(f1, flapAng + 8, 10), f3 = at(f0, flapAng - 6, 9);
  d.poly({ mat: GR, z: 35, group: 'skirt' }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 4.6, bevel: 1 });

  head(d, s);

  // bow (held in the far hand, in front of the torso)
  bow(d, s, P);

  // near leg
  leg(d, s, 'N', {
    thigh: MO, shin: MO, foot: LE, rThigh: [3.9, 3.1], rShin: [3.0, 2.4], z: 50, footStyle: 'boot',
    boot: { mat: LE, from: 0.28, r: [3.4, 2.8], cuff: DL },
  });
  // tunic side flap over the near thigh
  d.capsule({ mat: GR, z: 52, group: 'flapN' }, at(s.hipN, s.thN, -1), at(s.hipN, s.thN, 6.5), 3.5, 3.1, 0.45);

  // near arm (draw arm)
  arm(d, s, 'N', { upper: GR, fore: LE, hand: DL, rUp: [3.0, 2.6], rLo: [2.6, 2.3], rHand: 2.3, z: 60, cuff: DL });
  // hood mantle over the shoulders
  d.poly(
    { mat: GR, z: 61, group: 'mantle' },
    [s.T(20.5, -4.5), s.T(20.5, 3.5), s.T(17.5, 6.6), s.T(14.6, 5.0), s.T(13.8, 0.5), s.T(14.4, -4.4), s.T(16.4, -7.0), s.T(19.2, -6.6)],
    { kind: 'dome', c: s.T(18, -0.5), r: 9, bevel: 1.2 },
  );
}

function quiver(d: Draw, s: Skel) {
  const top = s.T(18.5, -6.8), bot = s.T(5, -9.2);
  d.capsule({ mat: DL, z: 3, group: 'quiver' }, top, bot, 2.6, 2.4, 0.3);
  d.capsule({ mat: GD, z: 3.1, group: 'quiver', line: 'none' }, lerpV(top, bot, 0.12), lerpV(top, bot, 0.18), 2.7, 2.7);
  const dir = { x: top.x - bot.x, y: top.y - bot.y };
  const l = Math.hypot(dir.x, dir.y);
  const ux = dir.x / l, uy = dir.y / l;
  const tips: V[] = [-1.6, 0.4, 2.2].map((o, i) => ({ x: top.x + ux * (6 + i) - uy * o, y: top.y + uy * (6 + i) + ux * o }));
  const fl = [MAT.bone, MAT.red, MAT.bone];
  for (const [i, t] of tips.entries()) {
    d.capsule({ mat: fl[i], z: 2.5 + i * 0.01, group: 'fletch' + i }, lerpV(top, t, 0.45), t, 1.1, 1.5);
  }
}

function braid(d: Draw, s: Skel, sway: number) {
  const H = s.H, T = s.T;
  const pts = [H(-4.5, -3), T(16, -7.6 - sway * 0.3), T(12, -8.2 - sway * 0.6), T(8, -8.0 - sway)];
  d.ribbon({ mat: HB, z: 4, group: 'braid', tex: (h) => (Math.floor(h.u * 9) % 2 === 0 ? -1 : 0) }, pts, [1.8, 1.9, 1.7, 1.4]);
  d.circle({ mat: GD, z: 4.1, group: 'braid' }, T(9, -8.1 - sway * 0.9), 1.2);
  d.ribbon({ mat: HB, z: 4, group: 'braid' }, [T(8, -8.0 - sway), T(5.4, -7.4 - sway * 1.3)], [1.6, 0.8]);
}

function head(d: Draw, s: Skel) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'head' }, s.neck, H(0, -4), 2.6, 2.4);
  face(d, s, { skin: SK, z: 38, brow: HB.ramp[1], browStyle: 'calm', eye: hex('#1f4a2a'), ear: 'none', mouth: 'line', lip: hex('#b0524a'), rx: 6.0, ry: 6.6 });
  // blonde fringe under the hood
  d.poly({ mat: HB, z: 38.8, group: 'head' }, [H(1.0, 5.2), H(5.8, 4.4), H(6.4, 2.6), H(4.6, 3.2), H(3.2, 2.2), H(1.6, 3.4)], { kind: 'dome', c: H(3, 4), r: 5 });
  // hood (pointed elven hood)
  const hood = [
    H(5.6, 5.6), H(1.6, 8.4), H(-4.2, 7.4), H(-8.6, 4.4), H(-11.6, 1.2), H(-7.4, -0.6), H(-6.4, -5.4), H(-3.0, -7.4), H(-1.2, -6.2),
    H(-2.2, -2.4), H(-0.6, 2.4), H(2.6, 5.0),
  ];
  d.poly({ mat: GR, z: 39, group: 'hood', tex: (h) => (h.v < -0.55 ? -1 : 0) }, hood, { kind: 'dome', c: H(-2, 2), r: 9, bevel: 1.4 });
}

function bow(d: Draw, s: Skel, P: Record<string, number>) {
  const grip = s.hF;
  const draw = P.draw ?? 0;
  const ang = P.bowAng ?? 100;
  const f = d.frame(grip, ang); // u along the bow toward the upper tip, w toward the archer (backward when vertical)
  const back = 3.6 + draw * 3.2;
  const tipU = f(16.5, back), tipL = f(-16.5, back);
  const limb = [tipL, f(-12, back * 0.55), f(-6, 0.6), f(0, 0), f(6, 0.6), f(12, back * 0.55), tipU];
  d.ribbon({ mat: WD, z: 44, group: 'bow', tex: (h) => (Math.abs(h.u - 0.5) < 0.07 ? -1 : 0) }, limb, [0.9, 1.25, 1.45, 1.7, 1.45, 1.25, 0.9]);
  d.circle({ mat: GD, z: 44.1, group: 'bow' }, tipU, 1.1);
  d.circle({ mat: GD, z: 44.1, group: 'bow' }, tipL, 1.1);
  const so = { mat: MAT.bone, z: 43.5, group: 'string', outline: false, line: 'none' as const };
  if (P.nock) {
    d.line(so, tipU, s.hN, STRING);
    d.line(so, s.hN, tipL, STRING);
  } else {
    d.line(so, tipU, tipL, STRING);
  }
  if (P.arrow) {
    const aim = P.aimAng ?? 0;
    const nockP = s.hN;
    const tip = at(nockP, aim, 23);
    d.line({ mat: WD, z: 59, group: 'arrow', line: 'none', outlineColor: WD.ramp[0] }, at(nockP, aim, 1), at(nockP, aim, 20), WD.ramp[4]);
    const head = P.arrow === 2 ? MAT.glowGreen : MAT.silver;
    const hf = d.frame(tip, aim);
    d.poly({ mat: head, z: 59.2, group: 'arrow' }, [hf(1.6, 0), hf(-2.6, 1.6), hf(-1.6, 0), hf(-2.6, -1.6)], { kind: 'bevel', w: 1 });
    d.pixels({ mat: MAT.bone, z: 59.1, group: 'arrow', outline: false, line: 'none' }, [
      { p: at(at(nockP, aim, 2), aim + 90, 1), c: hex('#ffffff') },
      { p: at(at(nockP, aim, 3), aim + 90, 1), c: hex('#c83c3c') },
      { p: at(at(nockP, aim, 2), aim - 90, 1), c: hex('#ffffff') },
      { p: at(at(nockP, aim, 3), aim - 90, 1), c: hex('#c83c3c') },
    ]);
  }
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 88,
  head: 88,
  legN: { ik: v(-7, 3) },
  legF: { ik: v(7.5, 3) },
  armN: { up: -98, lo: -58 },
  armF: { up: -72, lo: -40 },
  p: { bowAng: 104, draw: 0, arrow: 0, nock: 0, aimAng: 0, cape: 0.15, wave: 0, braid: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b,
    armN: { up: -98 + b * 2, lo: -58 + b * 3 },
    armF: { up: -72 + b * 2, lo: -40 + b * 2 },
    p: { bowAng: 104 - b, wave: a, braid: Math.sin(a) * 0.8, cape: 0.15 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const s = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (s > 0 ? 7 * s : 0), ang: s > 0 ? -28 * s : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 1,
    torso: 76,
    head: 84,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -70 + sw * 38, lo: -20 + sw * 40 },
    armF: { up: -60 - sw * 20, lo: -30 - sw * 20 },
    p: { bowAng: 60 - sw * 12, cape: 0.85, wave: a * 2, braid: 2 + Math.sin(a * 2) * 0.6 },
  });
}

const STANCE = pose({
  torso: 86,
  head: 90,
  legN: { ik: v(-10, 3) },
  legF: { ik: v(9, 3) },
  p: { cape: 0.2, wave: 0.6, braid: 0.2 },
});

/** Bow arm pointed along aimAng, string hand drawn back by `draw` (0..1). */
function aim(base: Pose, aimAng: number, draw: number, arrow: number, extra: Partial<Pose> = {}): Pose {
  const p = tweak(base, { ...extra, armF: { up: aimAng - 4, lo: aimAng + 1 } });
  const s = solve(p, D);
  const nock = at(s.hF, aimAng, -(4 + draw * 13));
  return tweak(p, { armN: { ik: nock, bend: 1 }, p: { ...(extra.p ?? {}), aimAng, bowAng: aimAng + 90, draw, arrow, nock: 1 } });
}

function release(base: Pose, aimAng: number, extra: Partial<Pose> = {}): Pose {
  const p = tweak(base, { ...extra, armF: { up: aimAng + 2, lo: aimAng + 7 } });
  const s = solve(p, D);
  const hand = at(at(s.hF, aimAng, -22), aimAng + 90, 3);
  return tweak(p, { armN: { ik: hand, bend: 1 }, p: { ...(extra.p ?? {}), aimAng, bowAng: aimAng + 94, draw: 0, arrow: 0, nock: 0 } });
}

const KNEEL = pose({
  y: -11,
  torso: 84,
  head: 90,
  legN: { ik: v(-13, 3) },
  legF: { ik: v(9, 3) },
  footN: -70,
  p: { cape: 0.1, wave: 0.4, braid: 0 },
});

const HURT = pose({
  x: -4, torso: 102, head: 106,
  legN: { ik: v(-10, 3) }, legF: { ik: v(6, 4) }, footF: 10,
  armN: { up: -150, lo: -120 }, armF: { up: -30, lo: 10 },
  p: { bowAng: 130, cape: 0.3, wave: 2, braid: -1.4 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -13, torso: 76, head: 62,
  legN: { ik: v(-15, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -95, lo: -95 }, armF: { up: -70, lo: -60 },
  p: { bowAng: 150, cape: 0.1, wave: 1, braid: 0.8 },
});
const DEATH_FALL = pose({
  x: 2, y: -21, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { bowAng: 60, cape: 0.2, wave: 1.6, braid: 1.4 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { bowAng: 10, cape: 0.05, wave: 2, braid: 2.4 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const A1 = 3, A2 = 8, A3 = 62;

export const archer: CharDef = {
  id: 'archer',
  name: 'Sylwen',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 150, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, aim(STANCE, A1, 0, 1), 0.5), 70],
        [aim(STANCE, A1, 0, 1), 90],
        [aim(STANCE, A1, 0.55, 1), 80],
        [aim(STANCE, A1 + 1, 1, 1, { p: { wave: 1 } }), 220],
        [release(STANCE, A1, { x: -1, p: { wave: 1.4 } }), 70, { event: 'shoot', hit: true }],
        [release(STANCE, A1 + 3, { x: -1, torso: 88, p: { wave: 1.8 } }), 160],
        [mid(release(STANCE, A1 + 3), IDLE, 0.5), 100],
        [IDLE, 100],
      ]),
    },
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, KNEEL, 0.5), 80],
        [aim(KNEEL, A2, 0, 2), 110],
        [aim(KNEEL, A2, 0.5, 2), 100],
        [aim(KNEEL, A2 + 1, 1, 2, { p: { wave: 1 } }), 180],
        [aim(KNEEL, A2 + 1, 1, 2, { y: -12, p: { wave: 1.3 } }), 180],
        [release(KNEEL, A2, { p: { wave: 1.6 } }), 70, { event: 'shoot', hit: true }],
        [release(KNEEL, A2 + 3, { torso: 87, p: { wave: 2 } }), 170],
        [mid(KNEEL, IDLE, 0.5), 100],
        [IDLE, 100],
      ]),
    },
    attack3: {
      loop: false,
      frames: keys([
        [mid(IDLE, aim(STANCE, A3, 0, 1, { torso: 98, head: 112 }), 0.5), 80],
        [aim(STANCE, A3, 0.6, 1, { torso: 98, head: 112 }), 90],
        [aim(STANCE, A3, 1, 1, { torso: 99, head: 114 }), 130],
        [release(STANCE, A3, { torso: 99, head: 114 }), 60, { event: 'shoot' }],
        [aim(STANCE, A3, 1, 1, { torso: 99, head: 114, p: { wave: 1 } }), 100],
        [release(STANCE, A3, { torso: 99, head: 114, p: { wave: 1.3 } }), 60, { event: 'shoot' }],
        [aim(STANCE, A3, 1, 1, { torso: 99, head: 114, p: { wave: 1.6 } }), 100],
        [release(STANCE, A3 + 3, { torso: 100, head: 116, p: { wave: 1.9 } }), 60, { event: 'shoot', hit: true }],
        [release(STANCE, A3 + 5, { torso: 99, head: 112, p: { wave: 2.2 } }), 200],
        [mid(STANCE, IDLE, 0.5), 100],
        [IDLE, 100],
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
