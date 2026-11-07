// The Pikeman (docs/DESIGN_DECISIONS.md section 89, Jakub's brief of
// 2026-11-07: "attacker can be Pikeman"): an Elite Damage of the Azure Crown,
// a veteran of its pike square. On the Junior Ward's rig: an open steel helmet
// with a brim and a small azure plume, a steel breastplate over a doublet
// quartered azure and white, its puffed sleeves slashed to show the other
// colour (the near arm azure, the far white), breeches the same way round,
// leather boots, a short sword at his hip, a weathered face with stubble. The
// pike is nearly twice his height: an ash shaft, an iron butt, a long narrow
// steel head with langets and a small azure pennant with the Crown's gold
// crown under it. Thrust drives it in from a step away; Level Pikes swings it
// down level and sweeps it through the enemy line. His affinity (Bloom) sets
// nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { arm, leg, smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { RGBA } from '../raster.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16.6,
  shin: 16,
  ankleH: 3,
  footLen: 6.6,
  spine: 22,
  neck: 6.6,
  upperArm: 12.6,
  foreArm: 12,
  shoulderDrop: 4.6,
  shoulderN: -3.0,
  shoulderF: 3.4,
  hipN: -2.0,
  hipF: 2.0,
};

const SK = MAT.skinTan, BL = MAT.blue, WT = MAT.whiteCloth, LE = MAT.leather, DL = MAT.darkleather, WD = MAT.wood, IR = MAT.iron, ST = MAT.steel, GD = MAT.gold, HR = MAT.hairBrown;
const E = ACCENT;

/** The pike from the near hand: back to the butt, up to the head's socket, to the point. */
const BUTT = 36, SOCKET = 40, TIP = 50;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const prev = info.prev?.pose.p;

  // far leg in white, the far arm in its white puffed sleeve
  leg(d, s, 'F', legCfg(WT, 10, -1));
  arm(d, s, 'F', armCfg(WT, BL, 20, -1));

  // the doublet, the breastplate, the belt and the short sword
  body(d, s, 30);

  head(d, s, P);

  // near leg in azure
  leg(d, s, 'N', legCfg(BL, 50, 0));

  // the pike in his near hand, or fallen beside him; the near arm over it
  const ang = P.spAng ?? 90;
  if (P.drop) pike(d, v(-8, 2.6), 1, 56);
  else {
    if (info.def.smear && prev && prev.spAng !== undefined) smear(d, s.hN, prev.spAng, ang, TIP + 2, 10, SWING, 55);
    pike(d, s.hN, ang, 56);
  }
  arm(d, s, 'N', armCfg(BL, WT, 60, 0));
}

const SWING = { core: E.white, edge: ST.ramp[4] };

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (mat: typeof BL, z: number, shade: number) => ({
  thigh: mat, shin: mat, foot: LE, rThigh: [4.4, 3.5] as [number, number], rShin: [3.1, 2.6] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: LE, from: 0.4, r: [3.3, 3.0] as [number, number], cuff: DL },
});

// a puffed sleeve slashed to show the other colour, a bare hand
const armCfg = (mat: typeof BL, slash: typeof BL, z: number, shade: number) => ({
  upper: mat, fore: mat, hand: SK, rUp: [3.8, 2.8] as [number, number], rLo: [2.8, 2.3] as [number, number], rHand: 2.1, z, shade, cuff: slash,
});

/** The quartered doublet, the steel breastplate over it, the belt and the short sword at the hip. */
function body(d: Draw, s: Skel, z: number) {
  const rows: [number, number, number][] = [
    [0, 6.4, 6.6],
    [4, 6.4, 7.0],
    [9, 7.0, 7.8],
    [14, 7.4, 8.4],
    [18, 7.2, 7.6],
    [20.4, 5.6, 5.0],
    [21.8, 3.2, 2.6],
  ];
  // the doublet: the back half white, the front half azure
  d.poly({ mat: WT, z, group: 'doublet' }, torsoPts(s, rows), { kind: 'cyl', a: s.T(0, 1), b: s.T(21.8, 1), r: 8, bevel: 1.2 });
  d.poly({ mat: BL, z: z + 0.1, group: 'doubletF', line: 'none' }, [s.T(21, 1.2), s.T(18, 7.6), s.T(14, 8.4), s.T(9, 7.8), s.T(4, 7.0), s.T(0, 6.6), s.T(0, 1.4)], { kind: 'cyl', a: s.T(0, 1), b: s.T(21.8, 1), r: 8 });
  // the skirt of the doublet over the hips, quartered the other way
  const ang = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  const f0 = s.T(1.2, -6.8), f1 = s.T(1.2, 7.2);
  const f2 = at(f1, ang + 8, 7), f3 = at(f0, ang - 8, 6.6);
  const fm = lerpV(f0, f1, 0.5), fmb = lerpV(f2, f3, 0.5);
  d.poly({ mat: BL, z: z - 0.5, group: 'skirtB' }, [f0, fm, fmb, f3], { kind: 'cyl', a: fm, b: fmb, r: 7, bevel: 1 });
  d.poly({ mat: WT, z: z - 0.4, group: 'skirtF' }, [fm, f1, f2, fmb], { kind: 'cyl', a: fm, b: fmb, r: 7, bevel: 1 });
  // the breastplate: steel from below the collar to the waist, a ridge down its middle
  d.poly(
    { mat: ST, z: z + 1, group: 'plate' },
    [s.T(19.6, -2.0), s.T(19.8, 7.0), s.T(14, 8.8), s.T(8, 8.4), s.T(3.4, 7.6), s.T(3.0, -2.6), s.T(9, -3.4)],
    { kind: 'cyl', a: s.T(3, 3), b: s.T(19.8, 3), r: 8.4, bevel: 1.2 },
  );
  d.line({ mat: ST, z: z + 1.1, group: 'plate', line: 'none' }, s.T(18.8, 5.2), s.T(4.4, 6.4), ST.ramp[5]);
  // the Crown's small gold crown riveted on the plate
  crown(d, s.T(14.4, 3.6), z + 1.2);
  // the belt, and the short sword's hilt at the near hip, its scabbard behind
  d.poly({ mat: DL, z: z + 1.3, group: 'belt' }, [s.T(4.0, -6.8), s.T(4.2, 7.8), s.T(2.0, 7.6), s.T(1.8, -6.6)], { kind: 'cyl', a: s.T(2, 0), b: s.T(4.2, 0), r: 7.4 });
  const hilt = s.T(2.8, -5.6);
  d.capsule({ mat: DL, z: z - 1, group: 'scabbard' }, hilt, at(hilt, s.torso - 150, 14), 1.4, 1.0);
  d.capsule({ mat: IR, z: z + 1.4, group: 'hilt', line: 'soft' }, at(hilt, s.torso - 60, 2.6), at(hilt, s.torso + 120, 2.6), 0.8, 0.8);
  d.capsule({ mat: LE, z: z + 1.35, group: 'hilt', line: 'soft' }, hilt, at(hilt, s.torso + 30, 3.4), 0.9, 0.9);
}

/** A small gold crown, pixel by pixel so it stays crisp. */
function crown(d: Draw, center: V, z: number) {
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const R = GD.ramp;
  const px: { p: V; c: RGBA }[] = [];
  for (const x of [-1, 1]) px.push({ p: v(c.x + x, c.y - 1), c: R[4] });
  for (let x = -1; x <= 1; x++) px.push({ p: v(c.x + x, c.y), c: x < 1 ? R[4] : R[3] });
  d.pixels({ mat: GD, z, group: 'crest', line: 'none', outline: false }, px);
}

/** A weathered face with stubble under an open steel helmet: a brimmed dome, a comb, a small azure plume. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.6, 2.4);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.grit ? 'angry' : 'flat', mouth: P.grit ? 'shout' : 'line', lip: SK.ramp[1], rx: 5.8, ry: 6.6 });
  // the stubble along the jaw and the chin
  const stub: { p: V; c: RGBA }[] = [];
  for (const [x, y] of [[1.6, -4.6], [2.6, -5.4], [3.8, -5.8], [4.8, -5.4], [5.4, -4.6], [0.6, -3.6], [2.0, -3.6]] as const) stub.push({ p: H(x, y), c: SK.ramp[2] });
  d.pixels({ mat: SK, z: 38.4, group: 'head', line: 'none' }, stub);
  // the helmet: a dome over the crown of the head, a brim flaring out front and back, a comb on top
  d.poly(
    { mat: ST, z: 39, group: 'helm' },
    [H(6.0, 3.4), H(4.6, 6.8), H(1.0, 8.8), H(-3.4, 8.6), H(-6.6, 6.0), H(-7.2, 2.6), H(-5.0, 3.0), H(0, 3.4)],
    { kind: 'dome', c: H(-0.8, 4.2), r: 8.2, bevel: 1 },
  );
  d.poly({ mat: ST, z: 39.1, group: 'brim' }, [H(9.4, 3.6), H(6.0, 4.4), H(-6.4, 3.8), H(-9.6, 1.4), H(-8.4, 0.8), H(-5.6, 2.4), H(6.2, 2.8)], { kind: 'bevel', w: 0.9 });
  d.ribbon({ mat: ST, z: 39.2, group: 'comb', shade: 1 }, [H(3.6, 7.4), H(0.6, 9.4), H(-3.8, 9.2), H(-6.0, 7.0)], [0.9, 1.1, 1.1, 0.8]);
  // the plume, a short azure tuft at the back of the comb, bending back
  const pr = H(-3.4, 9.0);
  d.ribbon({ mat: BL, z: 39.3, group: 'plume', line: 'soft' }, [pr, H(-6.0, 11.6), H(-9.4, 12.0), H(-11.4, 10.6)], [1.4, 1.9, 1.6, 0.7]);
}

/** The long pike: an ash shaft, an iron butt, steel langets down from a long narrow head, the azure pennant under it. */
function pike(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: WD, z, group: 'shaft', tex: (h) => (Math.sin(h.u * 30) > 0.9 ? -1 : 0) }, f(-BUTT, 0), f(SOCKET, 0), 1.0, 0.95);
  d.capsule({ mat: IR, z: z + 0.02, group: 'shaft', line: 'soft' }, f(-BUTT - 0.6, 0), f(-BUTT + 2.2, 0), 0.9, 1.2);
  // langets: two steel strips down the shaft from the socket
  d.capsule({ mat: ST, z: z + 0.03, group: 'langet', line: 'soft' }, f(SOCKET - 6, 0), f(SOCKET, 0), 1.2, 1.3);
  d.poly({ mat: ST, z: z + 0.05, group: 'head' }, [f(SOCKET, -1.2), f(SOCKET + 2, -1.8), f(TIP - 2.4, -0.9), f(TIP, 0), f(TIP - 2.4, 0.9), f(SOCKET + 2, 1.8), f(SOCKET, 1.2)], { kind: 'bevel', w: 0.9 });
  d.line({ mat: ST, z: z + 0.07, group: 'head', line: 'none' }, f(SOCKET + 1, 0), f(TIP - 1.4, 0), ST.ramp[5]);
  // the pennant: a small swallowtail of azure hanging from below the langets, trailing back from the shaft
  const p0 = f(SOCKET - 7, 0), p1 = f(SOCKET - 12, 0);
  // lying on the ground (the pike fallen level), the cloth lies back along the shaft
  const down = (pt: V, k: number) => at(pt, ang - 180 + (ang > 45 ? -70 : ang < 10 ? -12 : 70), k);
  const fly = down(lerpV(p0, p1, 0.5), 7.5);
  d.poly({ mat: BL, z: z - 0.1, group: 'pennant', line: 'soft' }, [p0, down(p0, 8.6), lerpV(fly, down(lerpV(p0, p1, 0.5), 4), 0.4), down(p1, 8.6), p1], { kind: 'bevel', w: 0.8 });
  crown(d, lerpV(lerpV(p0, p1, 0.5), fly, 0.45), z - 0.05);
}

// ---------------------------------------------------------------------------
// Poses & animations (the pike's angle is absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

/** The near hand at `hand`, the pike at `ang`. */
const pk = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, armF: { up: -82, lo: -66 }, ...extra, p: { spAng: ang, ...(extra.p ?? {}) } });

// At rest: the pike upright in his near hand, its butt on the ground, the far hand on the sword's hilt.
const IDLE = pk(v(-8, 37), 90, { y: -1, torso: 88, head: 88, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, armF: { up: -100, lo: -30 } });

function idle(t: number): Pose {
  const b = Math.round((1 - Math.cos(t * Math.PI * 2)) / 2);
  return tweak(IDLE, { y: -1 - b, head: 88 - b });
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
  // the pike carried sloped forward at the shoulder
  return pk(v(-2, 42 + bob), 30, {
    y: bob - 2, torso: 78, head: 84,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armF: { up: -70 - sw * 26, lo: -40 - sw * 26 },
  });
}

// Thrust: the pike drawn back level at his hip, then a long step that drives it straight in.
const TH_DRAW = pk(v(-16, 44), 2, { x: -4, y: -2, torso: 96, head: 90, legN: { ik: v(-12, 3) }, legF: { ik: v(10, 3) }, armF: { up: -60, lo: 6 } });
const TH_DRIVE = pk(v(22, 45), 0, { x: 10, y: -6, torso: 70, head: 78, legN: { ik: v(-14, 3) }, legF: { ik: v(18, 3) }, armF: { up: -110, lo: -100 }, p: { grit: 1 } });
const TH_HOLD = tweak(TH_DRIVE, { x: 9, armN: { ik: v(19, 44), bend: -1 }, p: { grit: 0 } });

// Level Pikes: the pike raised high and back, then swung down level through the line, then held there.
const LP_RAISE = pk(v(-6, 54), 128, { x: -3, y: 0, torso: 98, head: 94, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, armF: { up: -40, lo: 10 } });
const LP_SWING = pk(v(10, 48), 46, { x: 4, y: -3, torso: 80, head: 84, legN: { ik: v(-13, 3) }, legF: { ik: v(15, 3) }, armF: { up: -100, lo: -80 }, p: { grit: 1 } });
const LP_LEVEL = pk(v(18, 42), -6, { x: 8, y: -6, torso: 70, head: 78, legN: { ik: v(-15, 3) }, legF: { ik: v(18, 3) }, armF: { up: -112, lo: -100 }, p: { grit: 1 } });
const LP_HOLD = tweak(LP_LEVEL, { x: 7, p: { grit: 0, spAng: -4 } });

const HURT = pk(v(-11, 37), 98, { x: -4, y: -1, torso: 100, head: 106, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10, armF: { up: -110, lo: -80 }, p: { grit: 1 } });

// Death: he sinks to a knee on the pike, it falls away, he goes down.
const DEATH_KNEEL = pk(v(-4, 36), 94, { x: 0, y: -10, torso: 78, head: 62, legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -30, armF: { up: -90, lo: -80 } });
const DEATH_FALL = pose({
  x: 2, y: -5, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { drop: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -18, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { drop: 1 },
});

// Victory: the pike grounded, the pennant shaken out, his far fist up.
const RAISE = pk(v(-8, 42), 90, { y: -1, torso: 90, head: 96, legN: { ik: v(-8, 3) }, legF: { ik: v(9, 3) }, armF: { up: 150, lo: 120 }, p: { grit: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'pikeman',
  name: 'Pikeman',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 170, idle) },
    run: { loop: true, frames: cycle(8, 78, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TH_DRAW, 2, 80, ease.out),
        ...keys([
          [TH_DRAW, 170],
          [TH_DRIVE, 70, { hit: true }],
          [TH_HOLD, 220],
        ]),
        ...tween(D, TH_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    attack2: {
      loop: false,
      frames: [
        ...tween(D, IDLE, LP_RAISE, 2, 90, ease.out),
        ...keys([
          [LP_RAISE, 200],
          [LP_SWING, 60, { smear: true }],
          [LP_LEVEL, 80, { hit: true, smear: true }],
          [LP_HOLD, 260],
        ]),
        ...tween(D, LP_HOLD, IDLE, 3, 110, ease.inOut),
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
        [tweak(DEATH_DOWN, { y: -18.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, RAISE, 0.5), 100],
        [RAISE, 700],
        [mid(RAISE, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** The pike's head and a length of its shaft, scaled up for 40x40. */
function iconPike(d: Draw, from: V, to: V, z: number) {
  const ang = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const f = d.frame(to, ang);
  d.capsule({ mat: WD, z, group: 'ishaft' }, from, f(-11, 0), 1.5, 1.5);
  d.capsule({ mat: ST, z: z + 0.05, group: 'ilanget', line: 'soft' }, f(-16, 0), f(-10, 0), 2.0, 2.0);
  d.poly({ mat: ST, z: z + 0.1, group: 'ihead' }, [f(-11, -1.8), f(-8, -2.6), f(0, 0), f(-8, 2.6), f(-11, 1.8)], { kind: 'bevel', w: 1.3 });
}

export const pikeman: ChampionArt = {
  char,
  iconBg: BL,
  icons: {
    pike_thrust: () =>
      compose(BL, glyph((d) => {
        iconPike(d, v(1, 13), v(33, 24), 10);
      }), (b) => {
        impactStar(b, 34, 16, 1, 7, 8, FXR.dust[3], E.white);
      }),
    level_pikes: () =>
      compose(BL, glyph((d) => {
        // the pike level across the icon, three enemies' worth of sweep behind it
        iconPike(d, v(1, 14), v(36, 16), 10);
      }), (b) => {
        for (let x = 6; x <= 32; x += 2) b.set(x, 18 + (x % 4 === 0 ? 1 : 0), E.white);
        for (let x = 10; x <= 30; x += 3) b.set(x, 21, MAT.steel.ramp[4]);
      }),
    set_against_the_charge: () =>
      compose(BL, glyph((d) => {
        // the pike set at an angle, its butt braced on the ground
        iconPike(d, v(4, 2), v(32, 34), 10);
      }), (b) => {
        for (const [x, y, k] of [[3, 37, 3], [6, 38, 4], [9, 37, 2]] as const) b.set(x, y, FXR.dust[k]);
      }),
  },
};
