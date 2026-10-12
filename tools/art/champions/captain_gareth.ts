// Captain Gareth, the starter (docs/DESIGN_DECISIONS.md section 8). Jakub's
// look: a straight single-handed sword, functional, worn at the grip, no
// ornament and no glow; mid-weight field armour (breastplate, pauldrons,
// greaves) in dull steel and worn leather over a deep amber-brown coat; a
// short, faded cloak; a small, worn captain's insignia. Steel, leather,
// amber-brown and a little darkened gold: warm, weathered, functional. No
// Azure Crown blue: champions in the field are not walking banners. His cuts
// are plain (Jakub, 2026-10-12: affinities are abstract and set nothing in the
// art): a white streak, and in fx/azure_crown.ts light, dust and chips, never
// fire. Head, hair and beard are a first take: the record does not describe
// them.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { line } from '../paint.ts';
import { arm, cape, leg, smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 33,
  thigh: 15.5,
  shin: 15,
  ankleH: 3,
  footLen: 6.5,
  spine: 21,
  neck: 7,
  upperArm: 12.5,
  foreArm: 11.5,
  shoulderDrop: 4.5,
  shoulderN: -3.2,
  shoulderF: 4,
  hipN: -2,
  hipF: 2,
};

const SK = MAT.skinTan, AM = MAT.amber, FD = MAT.faded, IR = MAT.iron, ST = MAT.steel, LE = MAT.leather, DL = MAT.darkleather, OG = MAT.oldGold, HR = MAT.hairBrown;

/** The streak of the cut: plain white with the light of the steel, the colour of motion, not of an affinity. */
const SWING = { core: ACCENT.white, edge: MAT.steel.ramp[4] };

/** Blade length from the hand, for smears and the sweep. */
const BLADE = 25;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const sweep = P.sweep ?? 0;

  if (sweep) sweepArc(d, s, sweep, false);

  // the short, faded cloak hangs from the shoulders behind everything
  cape(d, s, { mat: FD, z: 2, len: 27, topU: 19.4, topBack: 5.6, topFront: 2.4, spread: 6, wind: P.wind ?? 0.1, wave: P.wave ?? 0, tatters: 1.1 });

  // far leg, the back panel of the tabard skirt
  leg(d, s, 'F', legCfg(10, -1));
  skirtPanel(d, s, 'F', 11, -1);

  // far pauldron and far arm (an empty hand: a guard, a second hand on the hilt for Iron Blow)
  pauldron(d, s, 'F', 19.6, -1);
  arm(d, s, 'F', armCfg(20, -1));

  // torso: the amber coat, the breastplate over it, the fauld and the belt
  const torso = torsoPts(s, [
    [0, 6.0, 6.0],
    [4, 6.2, 6.6],
    [9, 6.8, 7.7],
    [14, 7.3, 8.6],
    [17.5, 7.5, 7.9],
    [19.8, 6.0, 5.2],
    [21.4, 3.4, 2.8],
  ]);
  d.poly({ mat: AM, z: 30, group: 'coat' }, torso, { kind: 'cyl', a: s.T(0, 1), b: s.T(21, 1), r: 8.4, bevel: 1.2 });
  const plate = torsoPts(s, [
    [6.4, 6.4, 7.1],
    [9, 6.6, 7.6],
    [14, 7.0, 8.5],
    [17.4, 7.0, 7.8],
    [18.9, 5.6, 5.9],
  ]);
  d.poly({ mat: IR, z: 31, group: 'plate' }, plate, { kind: 'cyl', a: s.T(6, 1.4), b: s.T(19, 1.4), r: 8.3, bevel: 1.5 });
  // the keel of the breastplate catches the light along the chest
  d.line({ mat: IR, z: 31.1, group: 'plate', line: 'none' }, s.T(8.4, 5.2), s.T(16.6, 6.2), IR.ramp[4]);
  // fauld: two narrow lames below the plate
  for (const [u0, u1, k] of [[4.6, 6.5, 0], [3.0, 4.8, 1]] as const) {
    d.poly(
      { mat: IR, z: 31.4 + k * 0.01, group: 'fauld' + k, line: 'soft' },
      [s.T(u1, -6.4), s.T(u1, 7.1), s.T(u0, 7.2), s.T(u0, -6.3)],
      { kind: 'cyl', a: s.T(u0, 1), b: s.T(u1, 1), r: 7.2, bevel: 1 },
    );
  }
  // worn belt with a plain iron buckle
  d.poly({ mat: LE, z: 32, group: 'belt' }, [s.T(3.3, -6.5), s.T(3.5, 7.4), s.T(1.6, 7.2), s.T(1.4, -6.3)], { kind: 'cyl', a: s.T(0, 0), b: s.T(3.4, 0), r: 7 });
  d.poly({ mat: IR, z: 32.1, group: 'buckle' }, [s.T(3.6, 4.6), s.T(3.6, 7.6), s.T(1.2, 7.6), s.T(1.2, 4.6)], { kind: 'bevel', w: 1 });
  d.pixels({ mat: IR, z: 32.2, group: 'buckle' }, [{ p: s.T(2.4, 6.1), c: IR.ramp[1] }]);

  // tabard skirt: the front panel falls between the legs
  skirtFront(d, s, 35);

  // the cloak's clasp at the collar: darkened gold
  d.circle({ mat: OG, z: 36, group: 'clasp' }, s.T(19.6, 3.6), 1.4);

  head(d, s, P);

  // near leg and its skirt panel
  leg(d, s, 'N', legCfg(50, 0));
  skirtPanel(d, s, 'N', 52, 0);

  // the sword, its ember smear, then the near arm over the grip
  if (info.def.smear && info.prev && P.smearOff === undefined) {
    const from = info.prev.pose.p.swordAng ?? P.swordAng;
    smear(d, s.hN, from, P.swordAng, BLADE + 3, 11, SWING, 3);
  }
  sword(d, s.hN, P.swordAng ?? 20, 58, 0);
  arm(d, s, 'N', armCfg(60, 0));
  pauldron(d, s, 'N', 62, 0);

  if (sweep) sweepArc(d, s, sweep, true);
}

const legCfg = (z: number, shade: number) => ({
  thigh: DL, shin: IR, foot: LE, knee: IR, kneeR: 3.0, rThigh: [4.6, 3.7] as [number, number], rShin: [3.3, 2.7] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: LE, from: 0.78, r: [3.4, 3.2] as [number, number], cuff: LE },
  // greaves: a lit ridge down the shin plate
  shinTex: (h: { v: number }) => (Math.abs(h.v + 0.25) < 0.12 ? 1 : 0),
});

const armCfg = (z: number, shade: number) => ({
  upper: AM, fore: IR, hand: DL, rUp: [3.5, 3.0] as [number, number], rLo: [2.8, 2.4] as [number, number], rHand: 2.2, z, shade, elbow: IR, cuff: DL,
});

/** Tabard panel along each thigh, from the belt to above the knee. */
function skirtPanel(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  // cloth hangs: halfway between the thigh and straight down (or along the body once he falls)
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.35;
  const a = at(hip, hang, -1.5), b = at(hip, hang, 11.5);
  d.poly(
    { mat: AM, z, group: 'skirt' + side, shade, tex: (h) => (Math.sin(h.v * 7 + (side === 'N' ? 0 : 1.5)) > 0.75 ? -1 : 0) },
    [at(a, hang + 90, 4.6), at(b, hang + 90, 5.4), at(b, hang - 90, 5.6), at(a, hang - 90, 4.6)],
    { kind: 'cyl', a, b, r: 5.4, bevel: 1 },
  );
  // the hem is worn darker
  d.ribbon({ mat: AM, z: z + 0.05, group: 'skirt' + side, shade: shade - 1, line: 'none' }, [at(at(b, hang + 90, 5.0), hang, -0.6), at(at(b, hang - 90, 5.2), hang, -0.6)], [0.7, 0.7]);
}

/** Front panel of the tabard: hangs between the legs and swings with them. */
function skirtFront(d: Draw, s: Skel, z: number) {
  const ang = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  const f0 = s.T(1.6, -2.6), f1 = s.T(1.6, 6.8);
  const f2 = at(f1, ang + 6, 13.5), f3 = at(f0, ang - 3, 12.5);
  d.poly({ mat: AM, z, group: 'skirtfront', tex: (h) => (Math.sin(h.v * 9) > 0.7 ? -1 : 0) }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 5, bevel: 1 });
  d.ribbon({ mat: AM, z: z + 0.05, group: 'skirtfront', shade: -1, line: 'none' }, [lerpV(f3, f2, 0.06), lerpV(f3, f2, 0.94)], [0.7, 0.7]);
}

/** Layered steel pauldron; the near one carries the small worn insignia of a captain. */
function pauldron(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  const g = 'paul' + side;
  const top = at(at(sh, up, 0.6), s.torso, 1.6);
  const lames: [number, number, number][] = [[0, 5.6, 4.2], [2.6, 5.1, 3.4], [4.8, 4.5, 2.8]];
  lames.forEach(([o, rx, ry], i) => {
    d.ellipse({ mat: IR, z: z - i * 0.01, group: g + i, shade, line: 'soft' }, at(top, up, o), rx, ry, up + 90, 0.15);
  });
  if (side === 'N') {
    // insignia: a small darkened-gold chevron, worn smooth
    const f = d.frame(at(top, up, 0.4), up + 90);
    d.pixels({ mat: OG, z: z + 0.2, group: g + '0' }, [
      { p: f(-1.4, 0.6), c: OG.ramp[3] }, { p: f(0, -0.6), c: OG.ramp[4] }, { p: f(1.4, 0.6), c: OG.ramp[3] },
      { p: f(0, 0.6), c: OG.ramp[2] },
    ]);
  }
}

/** The straight single-handed sword: leather grip worn pale, plain iron guard and pommel, no ornament. */
function sword(d: Draw, hand: V, ang: number, z: number, shade: number) {
  const f = d.frame(hand, ang);
  const g = 'sword' + Math.round(z);
  d.capsule({ mat: DL, z, group: g, shade, tex: (h) => (Math.floor(h.u * 7) % 2 ? 1 : 0) }, f(-3.6, 0), f(2.8, 0), 1.2, 1.2);
  d.circle({ mat: IR, z: z + 0.05, group: g, shade }, f(-4.8, 0), 1.6);
  const W = 1.75;
  d.poly(
    { mat: ST, z: z + 0.1, group: g, shade },
    [f(3.4, -W), f(BLADE - 4, -W * 0.92), f(BLADE, 0), f(BLADE - 4, W * 0.92), f(3.4, W)],
    { kind: 'cyl', a: f(3.4, 0), b: f(BLADE, 0), r: W + 0.6 },
  );
  // the fuller: a darker groove down the first half of the blade
  d.line({ mat: ST, z: z + 0.12, group: g, line: 'none' }, f(4.6, 0), f(BLADE * 0.55, 0), ST.ramp[2]);
  d.capsule({ mat: IR, z: z + 0.2, group: g, shade }, f(3.2, -3.9), f(3.2, 3.9), 1.05, 1.05);
}

/** The flat arc of light of Wide Sweep around the body: a back half and a front half. */
function sweepArc(d: Draw, s: Skel, phase: number, front: boolean) {
  const c = s.T(11, 2);
  const o = { mat: MAT.steel, group: 'sweep', outline: false, line: 'none' as const, noClean: true };
  // phase 1: the blade comes round from behind; 2: it crosses the front; 3: the trail fades
  const spans: Record<number, [number, number]> = { 1: [200, 300], 2: [230, 400], 3: [300, 420] };
  const [a0, a1] = spans[Math.round(phase)] ?? [0, 0];
  const lo = front ? Math.max(a0, 270) : a0, hi = front ? a1 : Math.min(a1, 270);
  if (hi - lo < 4) return;
  const fade = phase >= 3 ? 1 : 0;
  d.arc({ ...o, z: front ? 70 : 3, color: MAT.steel.ramp[4] }, c, 26 - fade * 3, 34, lo, hi, 0.9, 0.3);
  d.arc({ ...o, z: front ? 70.1 : 3.1, color: fade ? MAT.steel.ramp[3] : ACCENT.white }, c, 31, 34, lo, hi, 0.7, 0.3);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'head' }, s.neck, H(0, -4), 3.4, 3.2);
  // the coat's high collar around the neck
  d.capsule({ mat: AM, z: 37.6, group: 'collar' }, s.T(20.6, -4), s.T(20.9, 3.4), 2.2, 2.0);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.grit ? 'angry' : 'flat', mouth: P.shout ? 'shout' : 'line', lip: SK.ramp[1], rx: 6.2, ry: 6.7 });
  // short beard: from the sideburn along the jaw to a squared chin, a moustache over the mouth
  d.poly(
    { mat: HR, z: 38.5, group: 'beard', shade: -1, line: 'soft' },
    [H(-0.2, 1.0), H(0.6, -2.0), H(2.0, -4.6), H(3.8, -6.9), H(5.6, -7.0), H(6.9, -5.6), H(6.9, -4.4), H(5.6, -4.5), H(4.2, -4.0), H(2.6, -2.6), H(1.4, -0.4), H(1.0, 1.0)],
    { kind: 'dome', c: H(3, -3.5), r: 7, bevel: 0.6 },
  );
  d.pixels({ mat: HR, z: 38.6, group: 'beard' }, [
    { p: H(4.6, -3.1), c: HR.ramp[2] }, { p: H(5.4, -3.0), c: HR.ramp[2] }, { p: H(6.2, -3.0), c: HR.ramp[1] }, { p: H(6.9, -3.4), c: HR.ramp[1] },
  ]);
  // short-cropped hair with a clear forehead
  d.poly(
    { mat: HR, z: 39, group: 'hair', shade: -1, maxIdx: 4, tex: (h, x, y) => ((x * 2 + y) % 4 === 0 ? -1 : (x + y * 3) % 7 === 0 ? 1 : 0) },
    [H(4.8, 5.4), H(3.0, 7.1), H(0, 7.9), H(-3.6, 7.4), H(-6.4, 4.8), H(-7.2, 1.0), H(-6.6, -2.2), H(-4.8, -2.8), H(-3.0, -1.4), H(-1.4, 0.6), H(-0.4, 2.4), H(1.0, 4.2), H(2.8, 5.0)],
    { kind: 'dome', c: H(-1, 3), r: 8.5, bevel: 1.1 },
  );

}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 84,
  head: 86,
  legN: { ik: v(-10, 3) },
  legF: { ik: v(9, 3) },
  armN: { up: -66, lo: -6 },
  armF: { up: -98, lo: -84 },
  p: { swordAng: 26, wind: 0.08, wave: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 84 - b,
    armN: { up: -66 + b * 2, lo: -6 + b * 3 },
    armF: { up: -98 + b * 2, lo: -84 + b * 2 },
    p: { swordAng: 26 - b * 3, wind: 0.08 + b * 0.04, wave: a },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11.5 * Math.cos(ph), y: 3 + (sn > 0 ? 7 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 2,
    torso: 72,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -100 + sw * 22, lo: -60 + sw * 22 },
    armF: { up: -82 - sw * 30, lo: -40 - sw * 30 },
    p: { swordAng: -150 + sw * 14, wind: 0.85, wave: a * 2 },
  });
}

// Line Cut: one diagonal cut, high to low.
const LC_WIND = pose({
  x: -3, y: -2, torso: 96, head: 90,
  legN: { ik: v(-11, 3) }, legF: { ik: v(8, 3) },
  armN: { up: 128, lo: 160 }, armF: { up: -40, lo: 10 },
  p: { swordAng: 168, wind: 0.3, wave: 1 },
});
const LC_CUT = pose({
  x: 7, y: -4, torso: 68, head: 78,
  legN: { ik: v(-10, 3) }, legF: { ik: v(14, 3) },
  armN: { up: -6, lo: -28 }, armF: { up: -120, lo: -100 },
  p: { swordAng: -36, wind: 0.6, wave: 2, grit: 1 },
});
const LC_FOLLOW = tweak(LC_CUT, { x: 8, torso: 64, armN: { up: -30, lo: -58 }, p: { swordAng: -74, smearOff: 1 } });

// Iron Blow: both hands on the hilt above the head, then down through the target.
const ib = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, armF: { ik: at(hand, ang, -2.6), bend: -1 }, ...extra, p: { swordAng: ang, ...(extra.p ?? {}) } });
const IB_RAISE = ib(v(-1, 66), 128, { x: -4, y: 0, torso: 100, head: 96, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, p: { wind: 0.3, wave: 1, grit: 1 } });
const IB_HIGH = ib(v(-4, 68), 150, { x: -5, y: 1, torso: 104, head: 98, legN: { ik: v(-12, 3) }, legF: { ik: v(9, 4) }, footF: 8, p: { wind: 0.35, wave: 1.4, grit: 1 } });
const IB_SLAM = ib(v(17, 27), -64, { x: 9, y: -8, torso: 56, head: 70, legN: { ik: v(-11, 3) }, legF: { ik: v(16, 3) }, p: { wind: 0.9, wave: 2.4, shout: 1 } });
const IB_HOLD = ib(v(18, 25), -70, { x: 9, y: -9, torso: 54, head: 70, legN: { ik: v(-11, 3) }, legF: { ik: v(16, 3) }, p: { wind: 0.7, wave: 3, smearOff: 1, grit: 1 } });

// Wide Sweep: the blade comes round from behind in one wide, flat arc.
const WS_COIL = pose({
  x: -4, y: -5, torso: 78, head: 82,
  legN: { ik: v(-13, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -150, lo: -168 }, armF: { up: -100, lo: -50 },
  p: { swordAng: -172, wind: 0.4, wave: 1, grit: 1 },
});
const WS_SWING = pose({
  x: 4, y: -6, torso: 76, head: 80,
  legN: { ik: v(-12, 3) }, legF: { ik: v(13, 3) },
  armN: { up: -4, lo: 4 }, armF: { up: -60, lo: -20 },
  p: { swordAng: 8, wind: 0.8, wave: 2, shout: 1 },
});
const WS_THROUGH = pose({
  x: 7, y: -5, torso: 74, head: 80,
  legN: { ik: v(-11, 3) }, legF: { ik: v(14, 3) },
  armN: { up: 6, lo: 150 }, armF: { up: -80, lo: -40 },
  p: { swordAng: 176, wind: 0.7, wave: 2.6, grit: 1 },
});

const HURT = pose({
  x: -4, y: -1, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -130, lo: -100 }, armF: { up: -128, lo: -104 },
  p: { swordAng: -120, wind: 0.5, wave: 1, grit: 1 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -13, torso: 76, head: 60,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { ik: v(10, 24), bend: -1 }, armF: { up: -86, lo: -80 },
  p: { swordAng: -90, wind: 0.2, wave: 1 },
});
const DEATH_FALL = pose({
  x: 2, y: -21, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { swordAng: -20, wind: 0.6, wave: 2 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { swordAng: 6, wind: 0.2, wave: 3 },
});

// Victory: the captain's salute, blade upright before the face.
const SALUTE = pose({
  y: -1, torso: 88, head: 90,
  legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -40, lo: 96 }, armF: { up: -92, lo: -88 },
  p: { swordAng: 90, wind: 0.15, wave: 1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'captain_gareth',
  name: 'Captain Gareth',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 150, idle) },
    run: { loop: true, frames: cycle(8, 75, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, LC_WIND, 1, 80),
        ...keys([
          [LC_WIND, 170],
          [mid(LC_WIND, LC_CUT, 0.45), 40],
          [LC_CUT, 60, { smear: true, hit: true }],
          [LC_FOLLOW, 200],
        ]),
        ...tween(D, LC_FOLLOW, IDLE, 2, 100, ease.inOut),
      ],
    },
    attack2: {
      loop: false,
      frames: [
        ...tween(D, IDLE, IB_RAISE, 1, 90),
        ...keys([
          [IB_RAISE, 120],
          [IB_HIGH, 200],
          [mid(IB_HIGH, IB_SLAM, 0.5), 40],
          [IB_SLAM, 70, { smear: true, hit: true }],
          [IB_HOLD, 300],
        ]),
        ...tween(D, IB_HOLD, IDLE, 2, 110, ease.inOut),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...tween(D, IDLE, WS_COIL, 1, 80),
        ...keys([
          [WS_COIL, 200],
          [tweak(mid(WS_COIL, WS_SWING, 0.5), { p: { sweep: 1 } }), 50],
          [tweak(WS_SWING, { p: { sweep: 2 } }), 70, { smear: true, hit: true }],
          [tweak(WS_THROUGH, { p: { sweep: 3, smearOff: 1 } }), 90],
          [WS_THROUGH, 200],
          [tweak(mid(WS_THROUGH, IDLE, 0.5), { p: { swordAng: -110 } }), 110],
        ]),
        ...tween(D, tweak(mid(WS_THROUGH, IDLE, 0.5), { p: { swordAng: -110 } }), IDLE, 1, 110, ease.inOut),
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
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -28 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SALUTE, 2, 90, ease.out),
        ...keys([
          [SALUTE, 700],
          [mid(SALUTE, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** The sword in an icon: the sprite's sword, scaled up for 40x40. */
function iconSword(d: Draw, hilt: V, ang: number, z: number, len = 30) {
  const f = d.frame(hilt, ang);
  const g = 'isword' + z;
  d.capsule({ mat: DL, z, group: g, tex: (h) => (Math.floor(h.u * 6) % 2 ? 1 : 0) }, f(-5, 0), f(3, 0), 1.7, 1.7);
  d.circle({ mat: IR, z: z + 0.05, group: g }, f(-6.6, 0), 2.3);
  d.poly({ mat: ST, z: z + 0.1, group: g }, [f(4.2, -2.4), f(len - 5, -2.2), f(len, 0), f(len - 5, 2.2), f(4.2, 2.4)], { kind: 'cyl', a: f(4.2, 0), b: f(len, 0), r: 3 });
  d.line({ mat: ST, z: z + 0.12, group: g, line: 'none' }, f(5.6, 0), f(len * 0.55, 0), ST.ramp[2]);
  d.capsule({ mat: IR, z: z + 0.2, group: g }, f(3.8, -5.6), f(3.8, 5.6), 1.4, 1.4);
}

const E = ACCENT;

export const captainGareth: ChampionArt = {
  char,
  iconBg: AM,
  icons: {
    line_cut: () =>
      compose(AM, glyph((d) => {
        iconSword(d, v(9, 9), 45, 10, 29);
      }), (b) => {
        // the cut: one clean line of light across the field, white at its heart
        for (let i = 0; i < 32; i++) {
          const x = 4 + i, y = 6 + Math.round(i * 0.84);
          const k = Math.sin((i / 31) * Math.PI);
          b.set(x, y, k > 0.55 ? E.white : k > 0.25 ? ST.ramp[5] : ST.ramp[4]);
          if (k > 0.2) b.set(x + 1, y, k > 0.6 ? ST.ramp[5] : ST.ramp[4]);
          if (k > 0.5) {
            b.set(x - 1, y, ST.ramp[4]);
            b.set(x + 2, y, ST.ramp[4]);
          }
        }
        for (const [x, y] of [[9, 20], [30, 18], [25, 33], [14, 6], [33, 28]]) b.set(x, y, ST.ramp[5]);
      }),
    iron_blow: () =>
      compose(AM, glyph((d) => {
        iconSword(d, v(20, 36), -90, 10, 27);
      }), (b) => {
        impactStar(b, 20, 31, 3, 10, 12, ST.ramp[4], E.white);
        // the buff it leaves: a gold chevron rising beside the blow
        for (const [dx, dy] of [[0, 0], [1, -1], [2, -2], [3, -1], [4, 0], [1, 0], [3, 0]]) b.set(29 + dx, 9 + dy, E.goldHot);
        for (const [dx, dy] of [[0, 4], [1, 3], [2, 2], [3, 3], [4, 4]]) b.set(29 + dx, 9 + dy, E.chiGold);
      }),
    wide_sweep: () =>
      compose(AM, glyph((d) => {
        smear(d, v(20, 17), 200, -20, 16, 6, SWING, 1);
        iconSword(d, v(10, 16), 4, 10, 27);
      })),
  },
};

void line;
