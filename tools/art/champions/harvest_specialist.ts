// The Harvest Specialist (Jakub's brief, docs/DESIGN_DECISIONS.md section 45,
// 2026-10-31): a Common Support of the Sanguine Dominion, a farmer holding big
// crops; on his word, a huge sheaf of golden wheat. A weathered farmer on the
// Lineholder's rig: a wide straw hat with a red hexagon pinned to its band
// (the Dominion's mark), a rough linen shirt with its sleeves rolled, a
// dark-red waistcoat, brown trousers tied at the knee, work boots, a
// sun-browned face and a short brown beard; the sheaf, taller than his arm,
// bound with red twine, carried over his shoulder and swung like a flail.
// Threshing Blow brings it down over his shoulder; it lands in chaff and
// grain. His affinity (Tide) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { arm, leg, smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 33.5,
  thigh: 15.6,
  shin: 15.2,
  ankleH: 3,
  footLen: 6.8,
  spine: 21.6,
  neck: 6.2,
  upperArm: 12.6,
  foreArm: 11.6,
  shoulderDrop: 4.8,
  shoulderN: -3.6,
  shoulderF: 4.2,
  hipN: -2.4,
  hipF: 2.4,
};

const SK = MAT.skinTan, LN = MAT.linen, WC = MAT.maroon, TR = MAT.leather, DL = MAT.darkleather, SW = MAT.straw, RD = MAT.red, HR = MAT.hairBrown;
const E = ACCENT;

/** The streak of the swing: chaff-gold, the light of the wheat, not of an affinity. */
const SWING = { core: E.white, edge: SW.ramp[4] };

/** The sheaf from the hand: the binding, then the stalks out to the ears' tips. */
const BIND = 4, EARS = 22, TIPS = 36;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const prev = info.prev?.pose.p;

  // far leg and far arm, a shade darker
  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(20, -1));

  // the shirt, the waistcoat over it, the belt
  torso(d, s, 30);

  head(d, s, P);

  // near leg
  leg(d, s, 'N', legCfg(50, 0));

  // the sheaf in his near hand, or fallen beside him; its swing; the near arm over its grip
  const ang = P.sheafAng ?? 150;
  if (P.drop) sheaf(d, v(14, 8.4), 2, 56);
  else {
    if (info.def.smear && prev && prev.sheafAng !== undefined) smear(d, s.hN, prev.sheafAng, ang, TIPS + 2, 10, SWING, 55);
    sheaf(d, s.hN, ang, 56);
  }
  arm(d, s, 'N', armCfg(60, 0));
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

// brown trousers tied at the knee with twine, work boots
const legCfg = (z: number, shade: number) => ({
  thigh: TR, shin: TR, foot: DL, rThigh: [4.6, 3.8] as [number, number], rShin: [3.4, 2.8] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: DL, from: 0.55, r: [3.4, 3.1] as [number, number], cuff: DL },
});

// the linen sleeve rolled to the elbow, a sun-browned forearm
const armCfg = (z: number, shade: number) => ({
  upper: LN, fore: SK, hand: SK, rUp: [3.4, 3.0] as [number, number], rLo: [2.8, 2.4] as [number, number], rHand: 2.2, z, shade, cuff: LN,
});

/** The linen shirt, the dark-red waistcoat over it, open at the throat, its buttons, a belt. */
function torso(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 7.0, 7.4],
    [4, 7.2, 8.0],
    [9, 7.8, 8.8],
    [14, 8.0, 9.0],
    [17.6, 7.8, 8.0],
    [20.0, 6.2, 5.6],
    [21.4, 3.6, 3.0],
  ]);
  d.poly({ mat: LN, z, group: 'shirt', tex: (h) => (Math.sin(h.v * 9 + 0.3) > 0.85 ? -1 : 0) }, body, { kind: 'cyl', a: s.T(0, 1), b: s.T(21.4, 1), r: 9, bevel: 1.2 });
  // the waistcoat: everything but a strip of shirt down the front and the throat
  d.poly(
    { mat: WC, z: z + 0.5, group: 'waistcoat' },
    [s.T(-0.4, -7.6), s.T(-0.4, 6.2), s.T(9, 6.6), s.T(15.6, 5.2), s.T(19.8, 2.4), s.T(20.6, -2.6), s.T(19.2, -6.8), s.T(14, -8.8), s.T(6, -8.2)],
    { kind: 'cyl', a: s.T(0, 0), b: s.T(20.6, 0), r: 9, bevel: 1.1 },
  );
  for (const u of [6, 10, 14]) d.pixels({ mat: SW, z: z + 0.6, group: 'waistcoat' }, [{ p: s.T(u, 5.6), c: SW.ramp[4] }]);
  // a plain belt
  d.poly({ mat: DL, z: z + 1, group: 'belt' }, [s.T(2.8, -7.6), s.T(3.0, 8.0), s.T(0.8, 7.8), s.T(0.6, -7.4)], { kind: 'cyl', a: s.T(0.6, 0), b: s.T(3.0, 0), r: 8 });
}

/** A small red hexagon (the Sanguine Dominion's mark), pixel by pixel so it stays crisp. */
function hexBadge(d: Draw, center: V, z: number) {
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const R = RD.ramp;
  const px: { p: V; c: (typeof R)[number] }[] = [];
  for (const [x, y] of [[-1, 1], [0, 1], [-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1]]) px.push({ p: v(c.x + x, c.y + y), c: y > 0 || x < 0 ? R[4] : R[3] });
  for (const [x, y] of [[1, 1], [-2, 0], [1, -1]]) px.push({ p: v(c.x + x, c.y + y), c: R[1] });
  d.pixels({ mat: RD, z, group: 'badge', line: 'none', outline: false }, px);
}

/** A sun-browned face, a short brown beard; a wide straw hat with a red band and the hexagon pinned to it. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.2, 3.0);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[2], browStyle: P.grit ? 'angry' : 'flat', mouth: P.grit ? 'shout' : 'line', lip: SK.ramp[1], rx: 6.2, ry: 6.8 });
  // the short beard along the jaw and the chin
  d.poly({ mat: HR, z: 38.6, group: 'beard', line: 'soft' }, [H(5.8, -2.2), H(5.6, -5.6), H(3.6, -7.6), H(0.2, -7.2), H(-2.6, -4.0), H(-1.6, -1.6), H(1.2, -3.6), H(3.4, -4.0)], { kind: 'dome', c: H(2, -4.6), r: 6, bevel: 0.8 });
  // the hat: a low crown and a wide, slightly drooping brim
  d.poly({ mat: SW, z: 39, group: 'hatCrown', line: 'soft', tex: (h) => (Math.sin(h.u * 26) > 0.7 ? -1 : 0) }, [H(4.6, 5.2), H(3.8, 9.4), H(0.4, 11.0), H(-4.4, 10.6), H(-7.0, 8.4), H(-7.2, 4.6)], { kind: 'dome', c: H(-1.4, 6.8), r: 7.4, bevel: 1 });
  d.ribbon({ mat: RD, z: 39.1, group: 'hatBand', line: 'none' }, [H(4.6, 6.0), H(0, 6.6), H(-4.6, 6.2), H(-7.0, 5.4)], [0.9, 1.0, 1.0, 0.9]);
  hexBadge(d, H(2.2, 6.6), 39.2);
  d.poly({ mat: SW, z: 39.3, group: 'hatBrim', tex: (h) => (Math.sin(h.u * 40) > 0.75 ? -1 : 0) }, [H(12.4, 3.0), H(9.6, 5.0), H(2.0, 5.8), H(-6.0, 5.4), H(-12.4, 3.2), H(-12.6, 1.8), H(-6.0, 3.8), H(2.0, 4.0), H(9.6, 3.2), H(12.4, 1.6)], { kind: 'bevel', w: 1 });
}

/**
 * The sheaf of golden wheat: a thick bundle of stalks bound with red twine
 * near the grip, fanning out to a crown of heavy ears that nod as it swings.
 */
function sheaf(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  // the butt of the stalks below the hand
  d.poly({ mat: SW, z, group: 'stalks', shade: -1, tex: (h) => (Math.sin(h.v * 18) > 0.6 ? -1 : 0) }, [f(-5.6, -2.0), f(EARS, -4.6), f(EARS, 4.6), f(-5.6, 2.0)], { kind: 'cyl', a: f(-5.6, 0), b: f(EARS, 0), r: 4.6, bevel: 1 });
  // the twine round the stalks
  for (const u of [BIND - 1.2, BIND + 0.8]) d.capsule({ mat: RD, z: z + 0.1, group: 'twine', line: 'soft' }, f(u, -2.8), f(u, 2.8), 0.7, 0.7);
  // the ears: a fan of plump grain heads, each lit on its upper side
  const ears: [number, number, number][] = [[-6.6, 0.9, 7.0], [-3.4, 1.0, 8.4], [0, 1.1, 9.4], [3.4, 1.0, 8.4], [6.6, 0.9, 7.0], [-5.0, 0.85, 5.6], [5.0, 0.85, 5.6], [-1.7, 0.9, 6.4], [1.7, 0.9, 6.4]];
  ears.forEach(([w, scale, len], k) => {
    const base = f(EARS - 2 + Math.abs(w) * 0.1, w * 0.6);
    const tip = f(EARS + len * scale + 2, w * 1.25);
    d.capsule({ mat: SW, z: z + 0.2 + k * 0.01, group: 'ear' + k, line: 'soft' }, base, tip, 1.6, 1.0);
    d.line({ mat: SW, z: z + 0.25 + k * 0.01, group: 'ear' + k, line: 'none' }, base, tip, SW.ramp[5]);
  });
  // a few awns past the tips
  for (const w of [-6, -2, 2, 6]) d.line({ mat: SW, z: z + 0.3, group: 'awn', line: 'none' }, f(TIPS - 2, w * 1.3), f(TIPS + 2, w * 1.5), SW.ramp[4]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the sheaf's angle is absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

// At rest: the sheaf over his near shoulder, the far hand loose at his side.
const IDLE: Pose = pose({
  y: -1,
  torso: 86,
  head: 88,
  legN: { ik: v(-10, 3) },
  legF: { ik: v(10, 3) },
  armN: { up: -60, lo: 100 },
  armF: { up: -80, lo: -66 },
  p: { sheafAng: 150 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 86 - b,
    armN: { up: -60 + b * 2, lo: 100 + b },
    armF: { up: -80 + b, lo: -66 + b },
    p: { sheafAng: 150 - b * 2 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (sn > 0 ? 6 * sn : 0), ang: sn > 0 ? -22 * sn : 0 };
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
    armN: { up: -66 + sw * 6, lo: 96 + sw * 6 },
    armF: { up: -96 - sw * 26, lo: -66 - sw * 26 },
    p: { sheafAng: 146 + sw * 4 },
  });
}

// Threshing Blow: the sheaf comes off the shoulder, high, and down like a flail.
const TB_WIND = pose({
  x: -2, y: -2, torso: 94, head: 88,
  legN: { ik: v(-12, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 112, lo: 150 }, armF: { up: -70, lo: -30 },
  p: { sheafAng: 172 },
});
const TB_STRIKE = pose({
  x: 8, y: -4, torso: 70, head: 78,
  legN: { ik: v(-10, 3) }, legF: { ik: v(15, 3) },
  armN: { up: 2, lo: -22 }, armF: { up: -100, lo: -80 },
  p: { sheafAng: -36, grit: 1 },
});
const TB_FOLLOW = tweak(TB_STRIKE, { x: 9, torso: 68, armN: { up: -18, lo: -46 }, p: { sheafAng: -48, grit: 0 } });

const HURT = pose({
  x: -4, y: -1, torso: 98, head: 104,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -100, lo: 60 }, armF: { up: -110, lo: -80 },
  p: { sheafAng: 170, grit: 1 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -10, torso: 76, head: 62,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -30,
  armN: { up: -90, lo: -60 }, armF: { up: -76, lo: -40 },
  p: { sheafAng: 30 },
});
const DEATH_FALL = pose({
  x: 2, y: -5, torso: 30, head: 16,
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

// Victory: the sheaf raised high like a harvest's first.
const RAISED = pose({
  y: -1, torso: 88, head: 94,
  legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) },
  armN: { up: 98, lo: 92 }, armF: { up: -80, lo: -60 },
  p: { sheafAng: 90, grit: 1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'harvest_specialist',
  name: 'Harvest Specialist',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 170, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TB_WIND, 1, 90),
        ...keys([
          [TB_WIND, 190],
          [mid(TB_WIND, TB_STRIKE, 0.5), 50],
          [TB_STRIKE, 70, { smear: true, hit: true }],
          [TB_FOLLOW, 180],
        ]),
        ...tween(D, TB_FOLLOW, IDLE, 2, 110, ease.inOut),
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
        ...tween(D, IDLE, RAISED, 2, 100, ease.out),
        ...keys([
          [RAISED, 700],
          [mid(RAISED, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icon (glyph space: y up)
// ---------------------------------------------------------------------------

export const harvestSpecialist: ChampionArt = {
  char,
  iconBg: WC,
  icons: {
    threshing_blow: () =>
      compose(WC, glyph((d) => {
        // the sheaf swung down
        sheafIcon(d, v(8, 32), -40);
      }), (b) => {
        // it lands in chaff and grain (screen space, y down)
        impactStar(b, 30, 28, 1, 8, 8, FXR.gold[3], E.white);
        for (const [x, y] of [[34, 20], [37, 24], [25, 33], [36, 32], [22, 24]]) b.set(x, y, FXR.gold[4]);
      }),
  },
};

/** The sheaf in an icon, scaled up for 40x40. */
function sheafIcon(d: Draw, hand: V, ang: number) {
  const f = d.frame(hand, ang);
  d.poly({ mat: SW, z: 2, group: 'istalks', shade: -1 }, [f(-4, -2.4), f(16, -4.6), f(16, 4.6), f(-4, 2.4)], { kind: 'cyl', a: f(-4, 0), b: f(16, 0), r: 4.6, bevel: 1.2 });
  for (const u of [3, 5.4]) d.capsule({ mat: RD, z: 2.1, group: 'itwine', line: 'soft' }, f(u, -3.4), f(u, 3.4), 0.9, 0.9);
  for (const [k, w] of [-6, -3, 0, 3, 6].entries()) {
    const base = f(15, w * 0.7), tip = f(27 - Math.abs(w) * 0.6, w * 1.3);
    d.capsule({ mat: SW, z: 2.2 + k * 0.01, group: 'iear' + k, line: 'soft' }, base, tip, 1.9, 1.2);
    d.line({ mat: SW, z: 2.25 + k * 0.01, group: 'iear' + k, line: 'none' }, base, at(tip, ang, -0.5), SW.ramp[5]);
  }
}
