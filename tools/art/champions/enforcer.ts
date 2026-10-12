// The Enforcer (docs/DESIGN_DECISIONS.md section 15, Jakub's brief of
// 2026-10-12): a Common of the Sanguine Dominion who carries out its orders.
// Crimson medium armour, a dark helmet, a long bastard sword, a black hexagon
// on the torso. So he is a soldier in half armour: a brigandine of crimson
// cloth riveted over its plates, crimson spaulders and tassets lacquered on
// steel, mail and dark cloth beneath; a plain open-faced cap of dark iron, so
// that he looks weak (Jakub had the helmet made less prominent); the long
// sword held in both hands in a low guard, its point toward the enemy (the
// silhouette feature); the black hexagon on his chest, the Dominion's own
// shape. What the brief leaves open is a first take: the cut of the armour,
// the cap, the guard he stands in and the hilt. His affinity sets nothing here (affinities
// are abstract, Jakub, 2026-10-11): his cut leaves a plain white streak, and in
// fx/sanguine_dominion.ts a line of light and chips. Red and black are the
// Dominion's heraldry, not menace (DESIGN_DECISIONS.md 3.2).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { leg, smear, torsoPts } from '../parts.ts';
import { at, dir, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 34,
  thigh: 16,
  shin: 15.5,
  ankleH: 3,
  footLen: 7,
  spine: 22,
  neck: 6.4,
  upperArm: 13,
  foreArm: 12,
  shoulderDrop: 4.6,
  shoulderN: -3.6,
  shoulderF: 4.4,
  hipN: -2.2,
  hipF: 2.2,
};

const SK = MAT.skinLight, CR = MAT.crimson, CP = MAT.crimsonPlate, DS = MAT.darksteel, IR = MAT.iron, ST = MAT.steel, CH = MAT.charcoal, DL = MAT.darkleather, HR = MAT.hairDark;

/** The streak of the cut: plain white with the light of the steel, the colour of motion, not of an affinity. */
const SWING = { core: ACCENT.white, edge: MAT.steel.ramp[4] };

/** The bastard sword, measured from the near hand under the guard: the tip, and the far hand down the grip toward the pommel. */
const TIP = 36, LOWER = 4.6;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const ang = P.swordAng ?? -28;
  const two = (P.two ?? 1) >= 0.5;

  // the cut's streak behind the body
  if (info.def.smear && info.prev) {
    const from = info.prev.pose.p.swordAng ?? ang;
    smear(d, s.hN, from, ang, TIP + 2, 12, SWING, 3);
  }

  // far leg and its tasset
  leg(d, s, 'F', legCfg(10, -1));
  tasset(d, s, 'F', 11, -1);

  // the far arm behind the body; with both hands on the hilt only its hand comes round the grip
  const far = farArm(s, ang, two);
  spaulder(d, s, 'F', 19.4, -1);
  d.capsule({ mat: IR, z: 20, group: 'armF', shade: -1, tex: mail }, s.sF, far.e, 3.4, 3.0);
  d.capsule({ mat: DS, z: 20.1, group: 'armF', shade: -1 }, far.e, far.h, 2.9, 2.5);

  // torso: the brigandine, crimson cloth over its plates, rows of rivets, the black hexagon on the chest
  const torso = torsoPts(s, [
    [0, 6.4, 6.6],
    [4, 6.6, 7.2],
    [9, 7.2, 8.2],
    [14, 7.6, 8.8],
    [17.4, 7.8, 8.2],
    [19.8, 6.2, 5.4],
    [21.4, 3.5, 2.9],
  ]);
  d.poly({ mat: CR, z: 30, group: 'brig', tex: (h) => (Math.sin(h.v * 7.5 + 0.6) > 0.9 ? -1 : 0) }, torso, { kind: 'cyl', a: s.T(0, 1), b: s.T(21.4, 1), r: 8.6, bevel: 1.2 });
  rivets(d, s, 30.2);
  hexagon(d, s.T(14.0, 4.6), s.torso, 30.4);
  // black leather binds the brigandine's edges: the collar and the hem
  d.ribbon({ mat: DL, z: 30.3, group: 'brigtrim', shade: -1 }, [s.T(20.4, -5.6), s.T(21.2, -1.4), s.T(20.9, 2.4), s.T(19.6, 5.0)], [0.9, 1.0, 1.0, 0.9]);
  // belt with a blackened buckle
  d.poly({ mat: DL, z: 32, group: 'belt', shade: -1 }, [s.T(3.3, -6.8), s.T(3.5, 7.6), s.T(1.6, 7.4), s.T(1.4, -6.6)], { kind: 'cyl', a: s.T(0, 0), b: s.T(3.4, 0), r: 7.4 });
  d.poly({ mat: DS, z: 32.1, group: 'buckle' }, [s.T(3.7, 4.8), s.T(3.7, 7.8), s.T(1.2, 7.8), s.T(1.2, 4.8)], { kind: 'bevel', w: 1 });
  mailSkirt(d, s, 33);

  head(d, s, P);

  // near leg and its tasset
  leg(d, s, 'N', legCfg(50, 0));
  tasset(d, s, 'N', 52, 0);

  // the sword, the far hand round its grip, the near arm over it
  sword(d, s.hN, ang, 56);
  if (two) d.ellipse({ mat: DL, z: 57, group: 'handF', shade: -1 }, far.h, 2.4, 2.1, ang);
  nearArm(d, s, 60);
  if (!two) d.ellipse({ mat: DL, z: 20.2, group: 'handF', shade: -1 }, far.h, 2.3, 2.0, far.lo);
  spaulder(d, s, 'N', 62, 0);
}

/** Mail at this scale: a fine checker of darker rings. */
const mail = (_h: unknown, x: number, y: number) => ((x + y) % 2 === 0 ? -1 : 0);

const legCfg = (z: number, shade: number) => ({
  thigh: CH, shin: DL, foot: DL, knee: DS, kneeR: 3.2, rThigh: [4.6, 3.8] as [number, number], rShin: [3.4, 2.8] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: DL, from: 0.3, r: [3.5, 3.2] as [number, number], cuff: DS },
});

/**
 * The far arm. With both hands on the hilt the hand is where the grip runs
 * (`LOWER` below the near hand), solved here so it stays on the grip through
 * every blend; with one hand free it follows the pose.
 */
function farArm(s: Skel, ang: number, two: boolean): { e: V; h: V; lo: number } {
  if (!two) return { e: s.eF, h: s.hF, lo: s.loF };
  const r = ik2(s.sF, at(s.hN, ang, -LOWER), D.upperArm, D.foreArm, (s.pose.p.bendF ?? -1) as number);
  return { e: r.mid, h: r.end, lo: r.a2 };
}

/** The near arm: a mail sleeve under the spaulder, a vambrace of blackened steel, a gloved hand round the grip under the guard. */
function nearArm(d: Draw, s: Skel, z: number) {
  d.capsule({ mat: IR, z, group: 'armN', tex: mail }, s.sN, s.eN, 3.5, 3.1);
  d.capsule({ mat: DS, z: z + 0.1, group: 'armN' }, s.eN, s.hN, 3.0, 2.6);
  d.capsule({ mat: DS, z: z + 0.15, group: 'armN' }, at(s.hN, s.loN, -4.6), at(s.hN, s.loN, -1.8), 3.0, 3.4, 0.3);
  d.ellipse({ mat: DL, z: z + 0.3, group: 'handN' }, s.hN, 2.6, 2.3, s.loN);
}

/** A spaulder of crimson lacquered plate: three lames over the shoulder, the lowest edged dark. */
function spaulder(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  const g = 'spaul' + side;
  const top = at(at(sh, up, 0.6), s.torso, 1.4);
  const lames: [number, number, number][] = [[0, 4.7, 3.5], [2.4, 4.2, 2.9], [4.4, 3.7, 2.4]];
  lames.forEach(([o, rx, ry], i) => {
    d.ellipse({ mat: CP, z: z - i * 0.01, group: g + i, shade, line: 'soft' }, at(top, up, o), rx, ry, up + 90, 0.15);
  });
  const rim = at(top, up, 5.9);
  d.capsule({ mat: DS, z: z - 0.025, group: g + '2', shade, line: 'none' }, at(rim, up + 90, 2.8), at(rim, up - 90, 2.8), 0.6, 0.6);
}

/** A tasset over each thigh: two lames of crimson plate hanging from the belt. */
function tasset(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  // plates hang between the thigh and straight down (or along the body once he falls)
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.3;
  for (const [u0, u1, w0, w1, k] of [[-1.4, 5.6, 4.8, 5.2, 0], [4.4, 10.2, 5.2, 5.6, 1]] as const) {
    const a = at(hip, hang, u0), b = at(hip, hang, u1);
    d.poly(
      { mat: CP, z: z + k * 0.02, group: 'tas' + side + k, shade, line: 'soft' },
      [at(a, hang + 90, w0), at(b, hang + 90, w1), at(b, hang - 90, w1 + 0.2), at(a, hang - 90, w0)],
      { kind: 'cyl', a, b, r: w1 + 0.4, bevel: 1 },
    );
  }
  const hem = at(hip, hang, 10.4);
  d.capsule({ mat: DS, z: z + 0.05, group: 'tas' + side + '1', shade, line: 'none' }, at(hem, hang + 90, 5.2), at(hem, hang - 90, 5.4), 0.6, 0.6);
}

/** The mail skirt under the brigandine, hanging between the legs. */
function mailSkirt(d: Draw, s: Skel, z: number) {
  const ang = Math.max(-116, Math.min(-64, (s.thN + s.thF) / 2));
  const f0 = s.T(1.8, -3.6), f1 = s.T(1.8, 6.8);
  const f2 = at(f1, ang + 5, 9.5), f3 = at(f0, ang - 3, 9);
  d.poly({ mat: IR, z, group: 'mailskirt', shade: -1, tex: mail }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 5.4, bevel: 1 });
}

/** Rivets of the plates inside the brigandine, in rows across the front. */
function rivets(d: Draw, s: Skel, z: number) {
  const px: { p: V; c: RGBA }[] = [];
  for (const [u, ws] of [[5.6, [0.6, 3.6, 6.4]], [9.2, [0.4, 3.6, 6.8]], [12.4, [-0.6, 6.6]]] as const) {
    for (const w of ws) px.push({ p: s.T(u, w), c: IR.ramp[4] });
  }
  d.pixels({ mat: CR, z, group: 'brig' }, px);
}

/** The Dominion's hexagon in black: flat at top and bottom, snapped to a quarter turn so its pixels stay crisp. */
function hexagon(d: Draw, center: V, torso: number, z: number) {
  const q = Math.round((torso - 90) / 90) * 90;
  const up = dir(q + 90), right = dir(q);
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const P = (x: number, y: number) => v(c.x + Math.round(right.x) * x + Math.round(up.x) * y, c.y + Math.round(right.y) * x + Math.round(up.y) * y);
  const px: { p: V; c: RGBA }[] = [];
  const rows: [number, number][] = [[3, 1], [2, 2], [1, 3], [0, 3], [-1, 2], [-2, 1]];
  for (const [y, half] of rows) for (let x = -half; x <= half; x++) px.push({ p: P(x, y), c: INK.black });
  // a faint lit edge along the top left, as enamel catches the light
  for (const [x, y] of [[-1, 3], [0, 3], [-2, 2], [-3, 1]]) px.push({ p: P(x, y), c: DS.ramp[2] });
  d.pixels({ mat: CR, z, group: 'brig' }, px);
}

/** The bastard sword: a long straight blade with a fuller, a long cross-guard, a grip for two hands and a wheel pommel, the hilt blackened. */
function sword(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  const g = 'sword';
  d.capsule({ mat: DL, z, group: g, tex: (h) => (Math.floor(h.u * 8) % 2 ? 1 : 0) }, f(-7.4, 0), f(2.4, 0), 1.25, 1.25);
  d.ellipse({ mat: DS, z: z + 0.05, group: g }, f(-8.9, 0), 2.1, 1.7, ang);
  const W = 1.95;
  d.poly(
    { mat: ST, z: z + 0.1, group: g },
    [f(3.2, -W), f(TIP - 7, -W * 0.82), f(TIP, 0), f(TIP - 7, W * 0.82), f(3.2, W)],
    { kind: 'cyl', a: f(3.2, 0), b: f(TIP, 0), r: W + 0.6 },
  );
  // the fuller: a darker groove down two thirds of the blade
  d.line({ mat: ST, z: z + 0.12, group: g, line: 'none' }, f(4.6, 0), f(TIP * 0.66, 0), ST.ramp[2]);
  // the cross-guard, its quillons dipping a little toward the blade
  d.ribbon({ mat: DS, z: z + 0.2, group: g }, [f(3.6, -6.2), f(2.8, -3), f(2.6, 0), f(2.8, 3), f(3.6, 6.2)], [0.9, 1.15, 1.3, 1.15, 0.9]);
}

/**
 * The helmet: a plain skullcap of dark iron, open-faced, a band round its rim
 * and two rivets (Jakub, 2026-10-12: "less prominent ... he should look
 * weaker", after a closed barbute looked too heavy).
 */
function helmet(d: Draw, s: Skel) {
  const H = s.H;
  d.poly(
    { mat: DS, z: 39, group: 'cap', line: 'soft' },
    [H(6.8, 2.7), H(6.2, 5.6), H(4.2, 8.0), H(0.8, 9.1), H(-2.8, 8.9), H(-5.8, 7.0), H(-7.5, 4.0), H(-7.8, 0.7), H(-4.0, 1.3), H(0.0, 2.1), H(3.6, 2.6)],
    { kind: 'dome', c: H(-0.6, 4.6), r: 9, bevel: 1.1 },
  );
  d.ribbon({ mat: DS, z: 39.1, group: 'capband', shade: -1 }, [H(6.9, 2.9), H(3.6, 2.8), H(0.0, 2.3), H(-4.0, 1.5), H(-7.8, 0.9)], [0.9, 0.9, 0.9, 0.9, 0.8]);
  d.pixels({ mat: DS, z: 39.2, group: 'capband' }, [{ p: H(4.4, 2.8), c: DS.ramp[4] }, { p: H(-2.6, 1.9), c: DS.ramp[4] }]);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.4, 3.2);
  // a standing collar of mail around the neck
  d.capsule({ mat: IR, z: 37.7, group: 'collar', shade: -1, tex: mail }, s.T(20.4, -4.4), s.T(21.4, 3.2), 2.6, 2.4);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.shout ? 'angry' : 'flat', mouth: P.shout ? 'shout' : 'line', lip: SK.ramp[1], rx: 6.4, ry: 6.9 });
  // short dark hair below the cap at the nape and a sideburn, a dark stubble along the jaw
  d.poly({ mat: HR, z: 38.3, group: 'hair', shade: -1, line: 'soft' }, [H(-7.6, 1.2), H(-7.4, -2.0), H(-5.8, -3.6), H(-4.0, -2.6), H(-2.0, -1.4), H(-0.6, 1.6)], { kind: 'dome', c: H(-4.4, 0), r: 5, bevel: 0.6 });
  d.pixels({ mat: SK, z: 38.4, group: 'stubble' }, [
    { p: H(2.4, -4.4), c: SK.ramp[2] }, { p: H(3.4, -5.4), c: SK.ramp[2] }, { p: H(4.6, -6.0), c: SK.ramp[2] }, { p: H(5.6, -5.6), c: SK.ramp[2] },
  ]);
  helmet(d, s);
}

// ---------------------------------------------------------------------------
// Poses & animations (the sword's angle runs from the near hand to the tip: 0 forward, 90 up)
// ---------------------------------------------------------------------------

/** Both hands on the hilt: the near hand under the guard at `hand`; the far hand is solved onto the grip in build(). */
const th = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, armF: { up: -90, lo: -60 }, ...extra, p: { swordAng: ang, two: 1, ...(extra.p ?? {}) } });

// The low guard: the long blade before him, its point toward the enemy.
const IDLE: Pose = th(v(11, 34), -28, {
  y: -1,
  torso: 84,
  head: 86,
  legN: { ik: v(-11, 3) },
  legF: { ik: v(10, 3) },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 84 - b,
    armN: { ik: v(11, 34 - b), bend: -1 },
    p: { swordAng: -28 - b },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11.5 * Math.cos(ph), y: 3 + (sn > 0 ? 6.5 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  // the sword carried on the near shoulder in both hands
  return th(v(6 + sw, 44 + bob), 140 + sw * 3, {
    y: bob - 2,
    torso: 74,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
  });
}

// Heavy Cut: the sword goes up over the near shoulder, comes over the top and down through the target.
const HC_WIND = th(v(-2, 64), 150, { x: -3, y: -2, torso: 96, head: 92, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) } });
const HC_OVER = th(v(8, 62), 70, { x: 3, y: -2, torso: 84, head: 84, legN: { ik: v(-11, 3) }, legF: { ik: v(12, 3) }, p: { shout: 1 } });
const HC_CUT = th(v(18, 30), -38, { x: 8, y: -4, torso: 66, head: 76, legN: { ik: v(-10, 3) }, legF: { ik: v(15, 3) }, p: { shout: 1 } });
const HC_FOLLOW = th(v(18, 29), -48, { x: 9, y: -4, torso: 63, head: 74, legN: { ik: v(-10, 3) }, legF: { ik: v(15, 3) } });

const HURT = th(v(6, 38), 6, {
  x: -4, y: -1, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
});
const DEATH_KNEEL = th(v(11, 35.5), -86, {
  x: 0, y: -13, torso: 76, head: 60,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
});
const DEATH_FALL = pose({
  x: 2, y: -21, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { swordAng: -20, two: 0 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { swordAng: 4, two: 0 },
});

// Victory: the sword planted point down before him, both hands at rest on the hilt.
const PLANT = th(v(13, 37), -90, { y: -1, torso: 88, head: 90, legN: { ik: v(-9, 3) }, legF: { ik: v(8, 3) } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'enforcer',
  name: 'Enforcer',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 160, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, HC_WIND, 2, 80),
        ...keys([
          [HC_WIND, 200],
          [HC_OVER, 45],
          [HC_CUT, 70, { smear: true, hit: true }],
          [HC_FOLLOW, 220],
        ]),
        ...tween(D, HC_FOLLOW, IDLE, 2, 110, ease.inOut),
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
        [DEATH_KNEEL, 260],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -28 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, PLANT, 2, 100, ease.out),
        ...keys([
          [PLANT, 760],
          [mid(PLANT, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** The bastard sword in an icon, scaled up for 40x40. */
function iconSword(d: Draw, hand: V, ang: number, z: number, tip = 30) {
  const f = d.frame(hand, ang);
  const g = 'isword' + z;
  d.capsule({ mat: DL, z, group: g, tex: (h) => (Math.floor(h.u * 6) % 2 ? 1 : 0) }, f(-8, 0), f(3, 0), 1.8, 1.8);
  d.ellipse({ mat: DS, z: z + 0.05, group: g }, f(-9.8, 0), 2.8, 2.3, ang);
  d.poly({ mat: ST, z: z + 0.1, group: g }, [f(4.2, -2.6), f(tip - 6, -2.2), f(tip, 0), f(tip - 6, 2.2), f(4.2, 2.6)], { kind: 'cyl', a: f(4.2, 0), b: f(tip, 0), r: 3.2 });
  d.line({ mat: ST, z: z + 0.12, group: g, line: 'none' }, f(5.6, 0), f(tip * 0.62, 0), ST.ramp[2]);
  d.ribbon({ mat: DS, z: z + 0.2, group: g }, [f(4.6, -7.4), f(3.6, -3.4), f(3.4, 0), f(3.6, 3.4), f(4.6, 7.4)], [1.2, 1.5, 1.7, 1.5, 1.2]);
}

const E = ACCENT;

export const enforcer: ChampionArt = {
  char,
  iconBg: CR,
  icons: {
    heavy_cut: () =>
      compose(CR, glyph((d) => {
        // the long sword at the end of its cut, the streak of it behind
        smear(d, v(9, 31), 150, -36, 27, 8, SWING, 1);
        iconSword(d, v(9, 31), -42, 10, 31);
      }), (b) => {
        // where it bites: a white flash and chips of light (screen space, y down)
        impactStar(b, 31, 30, 2, 9, 10, ST.ramp[4], E.white);
      }),
    keen_edge: () => {
      // the edge of the blade, close, the light running along it and the glint where it finds its mark (painted over the blade)
      const art = glyph((d) => iconSword(d, v(4, 4), 45, 10, 44));
      for (let i = 0; i < 16; i++) art.set(15 + i, 23 - i, i > 3 && i < 12 ? E.white : ST.ramp[5]);
      const star = (x: number, y: number, r: number) => {
        art.set(x, y, E.white);
        for (let k = 1; k <= r; k++) {
          const c = k <= Math.ceil(r / 2) ? E.white : ST.ramp[5];
          art.set(x + k, y, c);
          art.set(x - k, y, c);
          art.set(x, y + k, c);
          art.set(x, y - k, c);
        }
        if (r >= 3) for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) art.set(x + dx, y + dy, ST.ramp[5]);
      };
      star(26, 12, 5);
      star(12, 27, 2);
      star(33, 21, 2);
      return compose(CR, art);
    },
  },
};
