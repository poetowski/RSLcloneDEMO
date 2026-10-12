// The Lineholder (docs/DESIGN_DECISIONS.md section 13, Jakub's brief of
// 2026-10-11): a Common of the Azure Crown who holds the line. A big shield,
// dark blue, with two small crowns on it; a mace of dark iron on a wooden
// handle; a blue helmet over his head, much like the Skirmisher's; dark
// clothes with some blue stripes. So he is the broadest of the Crown's
// soldiers: heavy in the shoulders and limbs, his stance wide and low, the
// shield before him (the silhouette feature) and the mace resting on his
// shoulder. What the brief leaves open is a first take: the heater shape of
// the shield, its iron rim and the crowns one above the other; the flanged
// head of the mace; the quilted gambeson and its blue stripes (down the skirt,
// at the hems, around the sleeves); the helmet's rivets and nape guard; his
// face and moustache. His affinity sets nothing here: affinities are
// abstract (Jakub, 2026-10-11). His swing leaves a plain grey-white streak and
// his effects (fx/azure_crown.ts) are dust, a dull flash and iron chips.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { arm, leg, smear, torsoPts } from '../parts.ts';
import { at, dir, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 33.5,
  thigh: 15.8,
  shin: 15.3,
  ankleH: 3,
  footLen: 7,
  spine: 22.4,
  neck: 6.2,
  upperArm: 13,
  foreArm: 12,
  shoulderDrop: 4.8,
  shoulderN: -3.8,
  shoulderF: 4.6,
  hipN: -2.4,
  hipF: 2.4,
};

const SK = MAT.skinTan, CH = MAT.charcoal, BL = MAT.blueLeather, SH = MAT.indigo, IR = MAT.iron, GD = MAT.gold, WD = MAT.wood, DL = MAT.darkleather, LE = MAT.leather, HR = MAT.hairDark;

/** The streak of the swing: plain grey-white, the light of the iron, not of an affinity. */
const SWING = { core: ACCENT.white, edge: MAT.iron.ramp[4] };

/** Reach of the mace from the hand to the top of its head. */
const REACH = 20;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const prev = info.prev?.pose.p;

  // far leg and the far panel of the gambeson's skirt
  leg(d, s, 'F', legCfg(10, -1));
  skirtPanel(d, s, 'F', 11, -1);

  // the far arm carries the shield; its hand is hidden behind it
  arm(d, s, 'F', armCfg(20, -1));
  sleeveBand(d, s, 'F', 20.5, -1);
  shoulderRoll(d, s, 'F', 21, -1);

  // torso: a quilted gambeson, dark, a blue stripe down the front, belted
  const torso = torsoPts(s, [
    [0, 6.8, 7.0],
    [4, 7.0, 7.6],
    [9, 7.6, 8.6],
    [14, 8.2, 9.4],
    [17.6, 8.4, 8.8],
    [20, 6.8, 6.0],
    [21.8, 3.9, 3.1],
  ]);
  d.poly({ mat: CH, z: 30, group: 'gambeson', tex: (h) => (Math.sin(h.u * 44) > 0.86 ? -1 : 0) }, torso, { kind: 'cyl', a: s.T(0, 1), b: s.T(21.5, 1), r: 9, bevel: 1.2 });
  d.ribbon({ mat: BL, z: 30.2, group: 'stripe' }, [s.T(3.6, 7.3), s.T(9, 8.3), s.T(14, 9.1), s.T(17.6, 8.5)], [0.9, 1.0, 1.0, 0.9]);
  // blue piping at the collar
  d.capsule({ mat: BL, z: 30.3, group: 'collar' }, s.T(20.6, -5.2), s.T(21.2, 4.6), 1.5, 1.4);
  // belt with an iron buckle
  d.poly({ mat: DL, z: 32, group: 'belt' }, [s.T(3.4, -7.0), s.T(3.6, 7.8), s.T(1.6, 7.6), s.T(1.4, -6.8)], { kind: 'cyl', a: s.T(0, 0), b: s.T(3.4, 0), r: 7.6 });
  d.poly({ mat: IR, z: 32.1, group: 'buckle' }, [s.T(3.8, 5.0), s.T(3.8, 8.0), s.T(1.2, 8.0), s.T(1.2, 5.0)], { kind: 'bevel', w: 1 });
  skirtFront(d, s, 35);

  head(d, s, P);

  // the shield before the body
  shield(d, s, P.shieldAng ?? 92, 45, P.glint ?? 0, !!P.back);

  // near leg and its panel
  leg(d, s, 'N', legCfg(50, 0));
  skirtPanel(d, s, 'N', 52, 0);

  // near arm, the mace over it, the hand over the grip
  arm(d, s, 'N', armCfg(55, 0));
  sleeveBand(d, s, 'N', 55.5, 0);
  shoulderRoll(d, s, 'N', 56, 0);
  const ang = P.maceAng ?? 150;
  if (info.def.smear && prev && prev.maceAng !== undefined) smear(d, s.hN, prev.maceAng, ang, REACH + 2, 9, SWING, 57);
  mace(d, s.hN, ang, 58);
  d.ellipse({ mat: DL, z: 60, group: 'handN' }, s.hN, 2.5, 2.2, s.loN);
}

const legCfg = (z: number, shade: number) => ({
  thigh: CH, shin: CH, foot: LE, rThigh: [4.8, 3.9] as [number, number], rShin: [3.5, 2.9] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: LE, from: 0.4, r: [3.6, 3.3] as [number, number], cuff: DL },
});

// both hands are drawn elsewhere: the far one is behind the shield, the near one over the mace's grip
const armCfg = (z: number, shade: number) => ({
  upper: CH, fore: CH, hand: DL, rUp: [3.7, 3.2] as [number, number], rLo: [3.1, 2.7] as [number, number], rHand: 2.3, z, shade, cuff: BL, noHand: true,
});

/** A blue band around the sleeve, below the shoulder. */
function sleeveBand(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF, up = side === 'N' ? s.upN : s.upF;
  const p = at(sh, up, 5.6);
  d.capsule({ mat: BL, z, group: 'band' + side, shade, line: 'none' }, at(p, up + 90, 3.4), at(p, up - 90, 3.4), 0.9, 0.9);
}

/** A padded shoulder roll of the gambeson, edged in blue. */
function shoulderRoll(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  const c = at(at(sh, up, 1.2), s.torso, 0.8);
  d.ellipse({ mat: CH, z, group: 'roll' + side, shade, line: 'soft' }, c, 5.2, 3.9, up + 90, 0.1);
  const rim = at(c, up, 2.9);
  d.capsule({ mat: BL, z: z + 0.1, group: 'roll' + side, shade, line: 'none' }, at(rim, up + 90, 4.4), at(rim, up - 90, 4.4), 0.8, 0.8);
}

/** A panel of the gambeson's skirt along each thigh, a blue stripe down it and a blue hem. */
function skirtPanel(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  // cloth hangs halfway between the thigh and straight down (or along the body once he falls)
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.35;
  const a = at(hip, hang, -1.5), b = at(hip, hang, 11);
  d.poly(
    { mat: CH, z, group: 'skirt' + side, shade, tex: (h) => (Math.sin(h.u * 30) > 0.86 ? -1 : 0) },
    [at(a, hang + 90, 4.9), at(b, hang + 90, 5.6), at(b, hang - 90, 5.8), at(a, hang - 90, 4.9)],
    { kind: 'cyl', a, b, r: 5.8, bevel: 1 },
  );
  d.capsule({ mat: BL, z: z + 0.05, group: 'skirt' + side, shade, line: 'none' }, at(a, hang, 1.5), at(b, hang, -1.6), 0.9, 1.0);
  d.ribbon({ mat: BL, z: z + 0.06, group: 'skirt' + side, shade, line: 'none' }, [at(at(b, hang + 90, 5.2), hang, -0.7), at(at(b, hang - 90, 5.4), hang, -0.7)], [0.9, 0.9]);
}

/** The front panel of the skirt: hangs between the legs and swings with them. */
function skirtFront(d: Draw, s: Skel, z: number) {
  const ang = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  const f0 = s.T(1.6, -2.4), f1 = s.T(1.6, 7.2);
  const f2 = at(f1, ang + 6, 12.5), f3 = at(f0, ang - 3, 11.5);
  d.poly({ mat: CH, z, group: 'skirtfront', tex: (h) => (Math.sin(h.v * 9) > 0.75 ? -1 : 0) }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 5.2, bevel: 1 });
  d.ribbon({ mat: BL, z: z + 0.05, group: 'skirtfront', line: 'none' }, [lerpV(f3, f2, 0.06), lerpV(f3, f2, 0.94)], [0.9, 0.9]);
}

/**
 * The shield: a big heater of dark-blue painted wood with an iron rim and the
 * Crown's two small gold crowns, one above the other. Strapped to the far
 * forearm and held before the body, its face turned to the viewer.
 */
function shield(d: Draw, s: Skel, ang: number, z: number, glint: number, back = false) {
  shieldAt(d, at(lerpV(s.eF, s.hF, 0.5), s.torso - 90, 1.6), ang, z, glint, back);
}

function shieldAt(d: Draw, c: V, ang: number, z: number, glint: number, back = false) {
  const f = d.frame(c, ang);
  const K = 0.86; // the face is turned a little away: narrower across
  const T = 12.5, B = -19, HW = 9.6 * K;
  const rim = [
    f(T, -HW), f(T + 0.9, -HW * 0.5), f(T + 1.2, 0), f(T + 0.9, HW * 0.5), f(T, HW),
    f(T - 8, HW * 0.99), f(T - 14, HW * 0.9), f(B + 9, HW * 0.66), f(B + 4, HW * 0.34), f(B, 0),
    f(B + 4, -HW * 0.34), f(B + 9, -HW * 0.66), f(T - 14, -HW * 0.9), f(T - 8, -HW * 0.99),
  ];
  const mid = f(-1.5, 0);
  const dome = { kind: 'dome' as const, c: f(3, HW * 0.2), r: 21, bevel: 1.2 };
  d.poly({ mat: IR, z, group: 'shield' }, rim, dome);
  const field = rim.map((p) => lerpV(p, mid, 1.7 / Math.hypot(p.x - mid.x, p.y - mid.y)));
  if (back) {
    // fallen face down: the back of the shield, bare planks and two leather straps
    d.poly({ mat: WD, z: z + 0.1, group: 'shield', line: 'none', tex: (h) => (Math.sin(h.v * 9) > 0.8 ? -1 : 0) }, field, { kind: 'dome', c: f(3, HW * 0.2), r: 21 });
    for (const u of [4, -6]) d.capsule({ mat: DL, z: z + 0.2, group: 'shield' }, f(u, -HW * 0.7), f(u, HW * 0.7), 0.9, 0.9);
    return;
  }
  // weathered paint: a few scuffs
  const wear = (_h: unknown, x: number, y: number) => ((x * 7 + y * 13) % 29 === 0 ? 1 : (x * 5 + y * 3) % 37 === 0 ? -1 : 0);
  d.poly({ mat: SH, z: z + 0.1, group: 'shield', line: 'none', tex: wear }, field, dome);
  crown(d, f(5.6, 0), ang, z + 0.2);
  crown(d, f(-3.2, 0), ang, z + 0.2);
  // rivets around the rim
  for (const [u, w] of [[T - 0.4, -HW * 0.62], [T - 0.4, HW * 0.62], [T - 11, -HW * 0.94], [T - 11, HW * 0.94], [B + 2.2, 0]] as const) {
    d.pixels({ mat: IR, z: z + 0.15, group: 'shield' }, [{ p: f(u, w), c: IR.ramp[5] }]);
  }
  if (glint) {
    // light runs along the rim when he braces
    const g = f(T + 0.6 - (glint - 1) * 9, -HW * 0.9);
    d.pixels({ mat: IR, z: z + 0.3, group: 'shield', outline: false, line: 'none' }, [
      { p: g, c: ACCENT.white }, { p: v(g.x, g.y + 1), c: IR.ramp[5] }, { p: v(g.x, g.y - 1), c: IR.ramp[5] }, { p: v(g.x + 1, g.y), c: IR.ramp[5] }, { p: v(g.x - 1, g.y), c: IR.ramp[5] },
    ]);
  }
}

/** A small gold crown (the Azure Crown's): three points over a band, its up snapped to a quarter turn so the pixels stay crisp. */
function crown(d: Draw, center: V, ang: number, z: number) {
  const q = Math.round((ang - 90) / 90) * 90;
  const up = dir(q + 90), right = dir(q);
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const P = (x: number, y: number) => v(c.x + Math.round(right.x) * x + Math.round(up.x) * y, c.y + Math.round(right.y) * x + Math.round(up.y) * y);
  const g = GD.ramp;
  const px: { p: V; c: (typeof g)[number] }[] = [];
  // points
  for (const x of [-2, 0, 2]) px.push({ p: P(x, 1), c: x === 0 ? g[5] : g[4] });
  // band, lit from the top left
  for (let x = -2; x <= 2; x++) px.push({ p: P(x, 0), c: x < 0 ? g[4] : g[3] }, { p: P(x, -1), c: x < 1 ? g[3] : g[2] });
  d.pixels({ mat: GD, z, group: 'shield' }, px);
}

/** The mace: a flanged head of dark iron on a wooden haft, a leather grip, an iron collar and pommel. */
function mace(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  const g = 'mace' + Math.round(z);
  const H0 = 12.6, H1 = REACH - 0.6;
  d.capsule({ mat: WD, z, group: g, tex: (h) => (Math.sin(h.u * 23) > 0.88 ? -1 : 0) }, f(-4.2, 0), f(H0 + 1, 0), 1.15, 1.05);
  d.capsule({ mat: DL, z: z + 0.05, group: g, tex: (h) => (Math.floor(h.u * 6) % 2 ? 1 : 0) }, f(-3.4, 0), f(2.6, 0), 1.35, 1.35);
  d.circle({ mat: IR, z: z + 0.06, group: g, shade: -1 }, f(-5, 0), 1.6);
  // the head: a blunt barrel of flanges, two seen edge-on at its sides, the grooves between them dark
  d.poly(
    { mat: IR, z: z + 0.1, group: g, shade: -1 },
    [f(H0, -2.2), f(H0 + 0.9, -4.5), f(H1 - 0.9, -4.5), f(H1 + 0.2, -2.6), f(H1 + 0.5, 0), f(H1 + 0.2, 2.6), f(H1 - 0.9, 4.5), f(H0 + 0.9, 4.5), f(H0, 2.2)],
    { kind: 'cyl', a: f(H0, 0), b: f(H1, 0), r: 4.5, bevel: 1 },
  );
  d.line({ mat: IR, z: z + 0.12, group: g, line: 'none' }, f(H0 + 0.8, -2.0), f(H1 - 0.4, -2.0), IR.ramp[0]);
  d.line({ mat: IR, z: z + 0.12, group: g, line: 'none' }, f(H0 + 0.8, 2.0), f(H1 - 0.4, 2.0), IR.ramp[0]);
  d.capsule({ mat: IR, z: z + 0.08, group: g, shade: -1 }, f(H0 - 1.3, 0), f(H0 + 0.3, 0), 1.7, 1.7);
}

/** The helmet: a cap of blue leather like the Skirmisher's, deeper, a riveted brow band, a cheek guard and a nape guard. */
function helmet(d: Draw, s: Skel) {
  const H = s.H;
  // nape guard behind the neck
  d.poly({ mat: BL, z: 38.9, group: 'nape', line: 'soft' }, [H(-5.4, 0.4), H(-8.6, -0.2), H(-9.0, -4.4), H(-6.6, -5.6), H(-4.2, -2.4)], { kind: 'dome', c: H(-6.4, -2), r: 5, bevel: 0.8 });
  d.poly(
    { mat: BL, z: 39, group: 'cap', line: 'soft' },
    [H(6.8, 2.6), H(5.6, 6.2), H(2.8, 8.6), H(-0.8, 9.3), H(-4.6, 8.4), H(-7.6, 5.4), H(-8.6, 1.4), H(-8.0, -1.6), H(-5.8, -1.2), H(-2.6, 1.3), H(1.6, 2.4)],
    { kind: 'dome', c: H(-0.8, 4.2), r: 9.2, bevel: 1.2 },
  );
  // seam stitches over the crown, like the Skirmisher's
  for (const [x, y] of [[4.2, 6.6], [2.2, 8.2], [-0.2, 8.9], [-2.6, 8.8], [-4.8, 7.8], [-6.6, 6.0]] as const) d.pixels({ mat: BL, z: 39.1, group: 'cap' }, [{ p: H(x, y), c: BL.ramp[4] }]);
  // the brow band, darker, riveted
  d.ribbon({ mat: BL, z: 39.2, group: 'band', shade: -1 }, [H(7.0, 2.8), H(2.8, 2.2), H(-2.6, 1.1), H(-6.2, -0.8), H(-8.2, -1.5)], [1.3, 1.4, 1.4, 1.3, 1.1]);
  d.pixels({ mat: IR, z: 39.3, group: 'band' }, [{ p: H(5.0, 2.6), c: IR.ramp[5] }, { p: H(1.4, 1.9), c: IR.ramp[4] }, { p: H(-3.0, 0.9), c: IR.ramp[4] }]);
  d.poly(
    { mat: BL, z: 39.25, group: 'cheek', line: 'soft' },
    [H(1.2, 2.0), H(1.9, -1.0), H(1.9, -3.8), H(0.6, -4.9), H(-1.6, -3.8), H(-2.5, -0.6), H(-2.3, 1.6)],
    { kind: 'dome', c: H(-0.2, -1), r: 4.4, bevel: 0.8 },
  );
  d.pixels({ mat: IR, z: 39.3, group: 'cheek' }, [{ p: H(0.2, -3.2), c: IR.ramp[4] }]);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.6, 3.4);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.shout ? 'angry' : 'flat', mouth: P.shout ? 'shout' : 'none', rx: 6.6, ry: 7.0 });
  // a heavy dark moustache over the mouth
  d.pixels({ mat: HR, z: 38.6, group: 'moustache' }, [
    { p: H(4.6, -2.8), c: HR.ramp[4] }, { p: H(5.4, -2.8), c: HR.ramp[3] }, { p: H(6.2, -2.9), c: HR.ramp[3] }, { p: H(4.2, -3.7), c: HR.ramp[2] },
  ]);
  helmet(d, s);
}

// ---------------------------------------------------------------------------
// Poses & animations (mace and shield angles are absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 84,
  head: 86,
  legN: { ik: v(-11, 3) },
  legF: { ik: v(10, 3) },
  armN: { up: -70, lo: 100 },
  armF: { up: -70, lo: 44 },
  p: { maceAng: 174, shieldAng: 93 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 84 - b,
    armN: { up: -70 + b * 2, lo: 100 + b },
    armF: { up: -70 + b * 2, lo: 44 + b },
    p: { maceAng: 174 - b * 2, shieldAng: 93 },
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
    torso: 74,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -76 + sw * 6, lo: 80 + sw * 6 },
    armF: { up: -60 - sw * 6, lo: 30 },
    p: { maceAng: 158 + sw * 4, shieldAng: 96 },
  });
}

// Guard Cut: the shield stays up; the mace comes off the shoulder, high, and down over the rim.
const GC_WIND = pose({
  x: -2, y: -2, torso: 92, head: 88,
  legN: { ik: v(-12, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 112, lo: 150 }, armF: { up: -66, lo: 34 },
  p: { maceAng: 176, shieldAng: 94 },
});
const GC_STRIKE = pose({
  x: 8, y: -4, torso: 70, head: 78,
  legN: { ik: v(-10, 3) }, legF: { ik: v(15, 3) },
  armN: { up: 2, lo: -22 }, armF: { up: -78, lo: 22 },
  p: { maceAng: -34, shieldAng: 98, shout: 1 },
});
const GC_FOLLOW = tweak(GC_STRIKE, { x: 9, torso: 68, armN: { up: -18, lo: -46 }, p: { maceAng: -66, shout: 0 } });

// Brace: he rises onto his toes, then drops into a low, wide stance and drives the shield forward.
const BR_RISE = pose({
  x: -1, y: 0, torso: 90, head: 90,
  legN: { ik: v(-10, 3) }, legF: { ik: v(9, 4) }, footF: 6,
  armN: { up: -72, lo: 102 }, armF: { up: -78, lo: 56 },
  p: { maceAng: 176, shieldAng: 95 },
});
const BR_SET = pose({
  x: 3, y: -7, torso: 68, head: 78,
  legN: { ik: v(-16, 3) }, legF: { ik: v(13, 3) }, footN: -8,
  armN: { up: -78, lo: 92 }, armF: { up: -36, lo: 24 },
  p: { maceAng: 170, shieldAng: 86, shout: 1 },
});

const HURT = pose({
  x: -4, y: -1, torso: 98, head: 104,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -100, lo: 60 }, armF: { up: -82, lo: 50 },
  p: { maceAng: 170, shieldAng: 100 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -13, torso: 76, head: 62,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -90, lo: -80 }, armF: { up: -76, lo: -40 },
  p: { maceAng: -100, shieldAng: 80 },
});
const DEATH_FALL = pose({
  x: 2, y: -20, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { maceAng: -30, shieldAng: 30, back: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -26, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { maceAng: 8, shieldAng: -2, back: 1 },
});

// Victory: the mace raised high, the shield held before him.
const RAISED = pose({
  y: -1, torso: 88, head: 94,
  legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) },
  armN: { up: 98, lo: 92 }, armF: { up: -66, lo: 40 },
  p: { maceAng: 86, shieldAng: 92, shout: 1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'lineholder',
  name: 'Lineholder',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 160, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, GC_WIND, 1, 90),
        ...keys([
          [GC_WIND, 190],
          [mid(GC_WIND, GC_STRIKE, 0.5), 50],
          [GC_STRIKE, 70, { smear: true, hit: true }],
          [GC_FOLLOW, 180],
        ]),
        ...tween(D, GC_FOLLOW, IDLE, 2, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, BR_RISE, 1, 90),
        ...keys([
          [BR_RISE, 110],
          [tweak(BR_SET, { y: -8 }), 60],
          [BR_SET, 130, { hit: true }],
          [tweak(BR_SET, { p: { glint: 1, shout: 0 } }), 90],
          [tweak(BR_SET, { p: { glint: 2, shout: 0 } }), 90],
          [tweak(BR_SET, { p: { glint: 3, shout: 0 } }), 240],
        ]),
        ...tween(D, BR_SET, IDLE, 2, 120, ease.inOut),
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
        [tweak(DEATH_DOWN, { y: -27 }), 600],
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
// skill icons
// ---------------------------------------------------------------------------

/** The mace in an icon: the sprite's mace, scaled up for 40x40, its iron lit so it reads on the dark field. */
function iconMace(d: Draw, hilt: V, ang: number, z: number) {
  const f = d.frame(hilt, ang);
  const g = 'imace' + z;
  d.capsule({ mat: WD, z, group: g, tex: (h) => (Math.sin(h.u * 30) > 0.9 ? -1 : 0) }, f(-6, 0), f(16, 0), 1.8, 1.7);
  d.capsule({ mat: DL, z: z + 0.05, group: g, tex: (h) => (Math.floor(h.u * 5) % 2 ? 1 : 0) }, f(-5, 0), f(2, 0), 2.1, 2.1);
  d.circle({ mat: IR, z: z + 0.06, group: g }, f(-7, 0), 2.3);
  const H0 = 15, H1 = 26;
  d.poly(
    { mat: IR, z: z + 0.1, group: g },
    [f(H0, -3), f(H0 + 1.4, -6.4), f(H1 - 1.4, -6.4), f(H1 + 0.3, -3.6), f(H1 + 0.7, 0), f(H1 + 0.3, 3.6), f(H1 - 1.4, 6.4), f(H0 + 1.4, 6.4), f(H0, 3)],
    { kind: 'cyl', a: f(H0, 0), b: f(H1, 0), r: 6.4, bevel: 1.2 },
  );
  d.line({ mat: IR, z: z + 0.12, group: g, line: 'none' }, f(H0 + 1.2, -3), f(H1 - 0.6, -3), IR.ramp[1]);
  d.line({ mat: IR, z: z + 0.12, group: g, line: 'none' }, f(H0 + 1.2, 3), f(H1 - 0.6, 3), IR.ramp[1]);
  d.capsule({ mat: IR, z: z + 0.08, group: g }, f(H0 - 1.8, 0), f(H0 + 0.4, 0), 2.4, 2.4);
}

const E = ACCENT;

export const lineholder: ChampionArt = {
  char,
  iconBg: CH,
  icons: {
    guard_cut: () =>
      compose(CH, glyph((d) => {
        // the blow comes down from over the shield
        iconMace(d, v(6, 34), -50, 10);
      }), (b) => {
        // and lands: a dull white flash, iron chips (screen space, y down)
        impactStar(b, 28, 27, 2, 11, 10, FXR.dust[3], E.white);
        for (const [x, y, k] of [[35, 17, 4], [37, 21, 3], [19, 33, 3], [34, 34, 2], [23, 17, 3], [38, 29, 2]] as const) b.set(x, y, FXR.dust[k]);
      }),
    brace: () =>
      compose(CH, glyph((d) => {
        shieldAt(d, v(18, 22), 92, 10, 0);
      }), (b) => {
        // dust kicked up where he sets the shield, and the DEF Up it leaves: a gold chevron
        for (const [x, y, k] of [[8, 35, 3], [10, 34, 4], [12, 36, 2], [25, 35, 3], [27, 34, 4], [29, 36, 2], [6, 33, 2], [31, 33, 2], [9, 32, 3], [28, 32, 3]] as const) b.set(x, y, FXR.dust[k]);
        for (const [dx, dy] of [[0, 0], [1, -1], [2, -2], [3, -1], [4, 0], [1, 0], [3, 0]]) b.set(31 + dx, 7 + dy, E.goldHot);
        for (const [dx, dy] of [[0, 4], [1, 3], [2, 2], [3, 3], [4, 4]]) b.set(31 + dx, 7 + dy, E.chiGold);
      }),
  },
};
