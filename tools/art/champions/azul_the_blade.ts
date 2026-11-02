// Azul the Blade (docs/DESIGN_DECISIONS.md section 74, Jakub's brief of
// 2026-11-02): a Heroic of the Azure Crown, a very skilled human swordsman with
// a long thin magic rapier, no helmet, ceremonial plate armour in golden and
// azure colours, "be creative with detail", sparks of magic round the sword.
// What the brief leaves open is a first take: a duellist's stance, the rapier
// in the near hand and the other hand held back and up; azure plate edged and
// etched in gold, a gold crown on the breast under a fan of etched rays, a gold
// gorget and gold knees, tasset lames hemmed in gold, a pauldron that flares to
// a gold point; a short ceremonial cloak in ivory; bareheaded, dark hair swept
// back and tied in a short tail, a thin moustache, a calm, sure look. The rapier
// (the silhouette feature): a long, thin silver blade a hand wider than a
// finger, runes of pale light along it, a gold cup-hilt with a knuckle bow and
// two quillons, a grip wound in gold wire, and sparks of light that rise off it
// in every frame. His affinity sets nothing here (affinities are abstract,
// Jakub, 2026-10-11): the lines of light his cuts leave are the blade's own.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar, speedLines } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { hash2, RGBA } from '../raster.ts';
import { cape, leg, smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face, glint } from './common.ts';

const D: Dims = {
  hipH: 34.5,
  thigh: 16.2,
  shin: 15.8,
  ankleH: 3,
  footLen: 7.2,
  spine: 22,
  neck: 6.0,
  upperArm: 13.0,
  foreArm: 12.2,
  shoulderDrop: 4.8,
  shoulderN: -4.0,
  shoulderF: 4.8,
  hipN: -2.4,
  hipF: 2.4,
};

const SK = MAT.skinTan, PL = MAT.azurePlate, GD = MAT.gold, SV = MAT.silver, CL = MAT.whiteCloth, HR = MAT.hairDark, DL = MAT.blueLeather;
const GI = MAT.glowIce;

/** A cut's streak: the light of the blade, azure-white with a gold heart, the colour of motion and not of an affinity. */
const SWING = { core: ACCENT.goldHot, edge: FXR.steel[2] };

/** The rapier, measured from the near hand: the tip, where the blade leaves the guard. */
const TIP = 50, BASE = 3.6;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const ang = P.swordAng ?? 20;

  // the cut's streak behind the body: an arc for a sweep, two straight lines for a thrust
  if (info.def.smear && info.prev) {
    const from = info.prev.pose.p.swordAng ?? ang;
    if (P.thrust) thrustStreak(d, at(info.prev.hN, from, TIP), at(s.hN, ang, TIP), ang, 3);
    else smear(d, s.hN, P.sweep ?? from, ang, TIP + 2, 8, SWING, 3);
  }

  // the short ceremonial cloak, behind everything
  cape(d, s, { mat: CL, z: 2, len: 30, topU: 20.6, topBack: 6.2, topFront: 2.2, spread: 7, wind: P.wind ?? 0.08, wave: P.wave ?? 0 });

  // far leg in plate
  leg(d, s, 'F', legCfg(10, -1));
  tasset(d, s, 'F', 11, -1);

  // the far arm, held back and up behind him: plate, a gold cuff at the wrist
  pauldron(d, s, 'F', 19.4, -1);
  d.capsule({ mat: PL, z: 20, group: 'armF', shade: -1 }, s.sF, s.eF, 3.2, 2.8);
  d.capsule({ mat: PL, z: 20.1, group: 'armF', shade: -1 }, s.eF, s.hF, 2.8, 2.5);
  d.circle({ mat: GD, z: 20.15, group: 'armF', shade: -1 }, s.eF, 2.5);
  d.capsule({ mat: GD, z: 20.2, group: 'armF', shade: -1, line: 'none' }, at(s.hF, s.loF, -4.2), at(s.hF, s.loF, -2.6), 2.7, 2.7);
  d.ellipse({ mat: PL, z: 20.3, group: 'handF', shade: -1 }, s.hF, 2.4, 2.1, s.loF);

  // torso: an azure cuirass with a keel, gold at the neck, the arm-holes and the waist, a crown on the breast under etched rays
  const torso = torsoPts(s, [
    [0, 6.2, 6.4],
    [4, 6.4, 7.0],
    [9, 7.0, 8.2],
    [14, 7.4, 9.0],
    [17.6, 7.4, 8.4],
    [20.2, 6.0, 5.6],
    [21.8, 3.6, 3.0],
  ]);
  d.poly({ mat: PL, z: 30, group: 'cuirass' }, torso, { kind: 'cyl', a: s.T(0, 1.2), b: s.T(21.8, 1.2), r: 9.0, bevel: 1.6 });
  d.line({ mat: PL, z: 30.1, group: 'cuirass', line: 'none' }, s.T(8.6, 6.6), s.T(17.0, 8.2), PL.ramp[5]);
  d.ribbon({ mat: GD, z: 30.2, group: 'cuirass', line: 'none' }, [s.T(19.8, 5.4), s.T(17.6, 2.0), s.T(14.8, 1.0)], [0.55, 0.55, 0.55]);
  d.ribbon({ mat: GD, z: 30.2, group: 'cuirass', line: 'none' }, [s.T(20.4, -5.4), s.T(21.4, 0), s.T(20.2, 5.2)], [0.5, 0.55, 0.5]);
  // the etched rays, fanned from the crown
  for (const [u, vv] of [[7.2, 7.4], [8.4, 5.2], [14.6, 5.2], [16.0, 7.2], [11.0, 8.4]] as const) {
    d.line({ mat: GD, z: 30.25, group: 'cuirass', line: 'none' }, s.T(11.8, 6.6), s.T(u, vv), GD.ramp[2]);
  }
  // the crown: a band and three points, in bright gold
  const cr = (u: number, vv: number) => s.T(u, vv);
  d.pixels({ mat: GD, z: 30.4, group: 'cuirass', line: 'none' }, [
    { p: cr(10.6, 6.6), c: GD.ramp[4] }, { p: cr(11.4, 6.6), c: GD.ramp[5] }, { p: cr(12.2, 6.6), c: GD.ramp[4] }, { p: cr(13.0, 6.6), c: GD.ramp[4] },
    { p: cr(10.6, 7.6), c: GD.ramp[3] }, { p: cr(11.8, 7.6), c: GD.ramp[5] }, { p: cr(13.0, 7.6), c: GD.ramp[3] },
  ]);
  for (const [u0, u1, k] of [[4.2, 6.4, 0], [2.4, 4.6, 1]] as const) {
    d.poly(
      { mat: PL, z: 31 + k * 0.01, group: 'fauld' + k, line: 'soft' },
      [s.T(u1, -6.6), s.T(u1, 7.2), s.T(u0, 7.4), s.T(u0, -6.5)],
      { kind: 'cyl', a: s.T(u0, 1), b: s.T(u1, 1), r: 7.4, bevel: 1 },
    );
    d.line({ mat: GD, z: 31.05 + k * 0.01, group: 'fauld' + k, line: 'none' }, s.T(u0 + 0.2, -6.0), s.T(u0 + 0.2, 7.0), GD.ramp[4]);
  }
  // a belt of azure leather with a gold buckle, a rapier's frog at the near hip
  d.poly({ mat: DL, z: 32, group: 'belt' }, [s.T(7.4, -6.8), s.T(7.6, 7.6), s.T(6.0, 7.5), s.T(5.8, -6.6)], { kind: 'cyl', a: s.T(5.8, 0), b: s.T(7.6, 0), r: 7.4 });
  d.poly({ mat: GD, z: 32.1, group: 'buckle' }, [s.T(7.9, 5.0), s.T(7.9, 7.8), s.T(5.6, 7.8), s.T(5.6, 5.0)], { kind: 'bevel', w: 1 });

  head(d, s, P);

  // near leg in plate
  leg(d, s, 'N', legCfg(50, 0));
  tasset(d, s, 'N', 52, 0);

  // the rapier, the near arm over it, the near pauldron; its sparks over everything
  rapier(d, s.hN, ang, 56, P);
  nearArm(d, s, 60);
  pauldron(d, s, 'N', 62, 0);
  if (!P.dim) sparkle(d, s.hN, ang, info, P);
}

const legCfg = (z: number, shade: number) => ({
  thigh: PL, shin: PL, foot: PL, knee: GD, kneeR: 3.2, rThigh: [4.2, 3.6] as [number, number], rShin: [3.3, 2.7] as [number, number], z, shade, footStyle: 'sabaton' as const,
  // greaves: a lit ridge down the shin
  shinTex: (h: { v: number }) => (Math.abs(h.v + 0.25) < 0.12 ? 1 : 0),
});

/** The near arm in plate: a rerebrace, a couter at the elbow, a vambrace, a gauntlet with a gold cuff round the grip. */
function nearArm(d: Draw, s: Skel, z: number) {
  d.capsule({ mat: PL, z, group: 'armN' }, s.sN, s.eN, 3.3, 2.9);
  d.capsule({ mat: PL, z: z + 0.1, group: 'armN' }, s.eN, s.hN, 2.9, 2.6);
  d.circle({ mat: GD, z: z + 0.15, group: 'armN', line: 'soft' }, s.eN, 2.7);
  d.capsule({ mat: GD, z: z + 0.2, group: 'armN', line: 'none' }, at(s.hN, s.loN, -4.4), at(s.hN, s.loN, -2.8), 2.9, 2.9);
  d.ellipse({ mat: PL, z: z + 0.3, group: 'handN' }, s.hN, 2.6, 2.3, s.loN);
}

/** A pauldron: three azure lames edged in gold, the top one flaring to a gold point, a gold rivet on it. */
function pauldron(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  const g = 'paul' + side;
  const top = at(at(sh, up, 0.5), s.torso, 1.8);
  const lames: [number, number, number][] = [[0, 5.8, 4.4], [2.6, 5.3, 3.7], [4.9, 4.7, 3.0]];
  lames.forEach(([o, rx, ry], i) => d.ellipse({ mat: PL, z: z - i * 0.01, group: g + i, shade, line: 'soft' }, at(top, up, o), rx, ry, up + 90, 0.15));
  // the gold rim of each lame, and the flare at the top
  for (const o of [1.6, 4.0, 6.2]) {
    const rim = at(top, up, o + 0.8);
    d.capsule({ mat: GD, z: z - 0.025, group: g + '2', shade, line: 'none' }, at(rim, up + 90, 3.6), at(rim, up - 90, 3.6), 0.5, 0.5);
  }
  d.poly({ mat: GD, z: z + 0.02, group: g + '0', shade, line: 'soft' }, [at(top, up + 90, 3.6), at(top, up, -3.4), at(top, up - 90, 3.6)], { kind: 'bevel', w: 0.8 });
  d.pixels({ mat: GD, z: z + 0.04, group: g + '0', line: 'none' }, [{ p: at(top, up, 0.4), c: GD.ramp[5] }]);
}

/** Tassets over each thigh: two azure lames hung from the fauld, the hem gold. */
function tasset(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.3;
  for (const [u0, u1, w0, w1, k] of [[-1.6, 5.2, 4.8, 5.2, 0], [4.0, 9.6, 5.2, 5.6, 1]] as const) {
    const a = at(hip, hang, u0), b = at(hip, hang, u1);
    d.poly(
      { mat: PL, z: z + k * 0.02, group: 'tas' + side + k, shade, line: 'soft' },
      [at(a, hang + 90, w0), at(b, hang + 90, w1), at(b, hang - 90, w1 + 0.2), at(a, hang - 90, w0)],
      { kind: 'cyl', a, b, r: w1 + 0.4, bevel: 1 },
    );
  }
  const hem = at(hip, hang, 9.8);
  d.capsule({ mat: GD, z: z + 0.05, group: 'tas' + side + '1', shade, line: 'none' }, at(hem, hang + 90, 5.4), at(hem, hang - 90, 5.6), 0.55, 0.55);
}

/**
 * The rapier: a long thin silver blade with a ridge down its length and pale
 * runes along it, a gold cup-hilt with a knuckle bow and two quillons, a grip
 * wound in gold wire and a round gold pommel.
 */
function rapier(d: Draw, hand: V, ang: number, z: number, P: Record<string, number>) {
  const f = d.frame(hand, ang);
  const g = 'sword';
  // the grip, wound in gold wire, and the pommel
  d.capsule({ mat: GD, z, group: g, tex: (h) => (Math.floor(h.u * 8) % 2 ? 0 : -1) }, f(-5.2, 0), f(2.0, 0), 1.2, 1.2);
  d.circle({ mat: GD, z: z + 0.05, group: g }, f(-6.4, 0), 1.7);
  d.pixels({ mat: GD, z: z + 0.06, group: g }, [{ p: f(-6.6, 0.4), c: GD.ramp[5] }]);
  // the knuckle bow, a gold loop from the quillons back toward the pommel
  d.ribbon({ mat: GD, z: z + 0.1, group: g }, [f(2.6, 3.4), f(0.4, 4.6), f(-3.2, 3.8), f(-5.6, 1.6)], [0.6, 0.6, 0.55, 0.5]);
  // the thin blade, tapering to a point
  const W = 1.15, b0 = BASE;
  d.poly(
    { mat: SV, z: z + 0.1, group: g + 'b' },
    [f(b0, -W), f(TIP - 12, -W * 0.75), f(TIP, 0), f(TIP - 12, W * 0.75), f(b0, W)],
    { kind: 'cyl', a: f(b0, 0), b: f(TIP, 0), r: W + 0.7 },
  );
  d.line({ mat: SV, z: z + 0.12, group: g + 'b', line: 'none' }, f(b0 + 1, -0.2), f(TIP - 4, 0), SV.ramp[5]);
  // runes of light along the blade
  const runes: { p: V; c: RGBA }[] = [];
  for (let k = 0; k < 5; k++) runes.push({ p: f(10 + k * 7, 0.4), c: GI.ramp[k % 2 ? 4 : 5] });
  d.pixels({ mat: GI, z: z + 0.14, group: g + 'b', outline: false, line: 'none' }, runes);
  // the cup of the hilt, a gold ellipse across the blade, and the quillons
  d.ellipse({ mat: GD, z: z + 0.2, group: g, line: 'soft' }, f(2.6, 0), 1.5, 3.4, ang);
  d.ribbon({ mat: GD, z: z + 0.22, group: g }, [f(2.2, -6.0), f(2.8, -3.2), f(3.0, 0), f(2.8, 3.2), f(2.2, 6.0)], [0.7, 0.8, 0.9, 0.8, 0.7]);
  for (const side of [-1, 1]) d.circle({ mat: GD, z: z + 0.23, group: g }, f(2.0, side * 6.4), 0.9);
  d.pixels({ mat: GD, z: z + 0.24, group: g }, [{ p: f(3.2, -0.6), c: GD.ramp[5] }]);
  void P;
}

/**
 * The sparks that rise off the rapier in every frame: points of light along the
 * blade that drift outward as they fade, a bright star flickering at the tip.
 * More of them when the blade is charged (Crown Salute).
 */
function sparkle(d: Draw, hand: V, ang: number, info: BuildInfo, P: Record<string, number>) {
  const f = d.frame(hand, ang);
  const n = 6 + Math.round((P.charge ?? 0) * 8);
  const idx = info.index;
  const pts: { p: V; c: RGBA }[] = [];
  for (let k = 0; k < n; k++) {
    const life = (idx + k * 3) % 6;
    const u = 6 + hash2(k, 11, 3) * (TIP - 6);
    const side = hash2(k, 5, 9) < 0.5 ? -1 : 1;
    const off = side * (2 + hash2(k, 7, 5) * 3 + life * 0.7);
    const c = life < 2 ? ACCENT.white : life < 4 ? ACCENT.pale : life < 5 ? ACCENT.sparkGold : GI.ramp[3];
    pts.push({ p: f(u + life * 0.5, off), c });
  }
  d.pixels({ mat: GI, z: 70, group: 'fx', outline: false, line: 'none' }, pts);
  // the star at the point, flickering on whole cycles of a loop
  glint(d, f(TIP + 0.5, 0), [1, 2, 3, 2, 1, 3, 2, 3][idx % 8], 70, ACCENT.white, ACCENT.pale);
  if ((P.charge ?? 0) > 0) glint(d, f(TIP * 0.55, 3.2), [2, 3, 1, 3, 2, 1, 3, 2][(idx + 3) % 8], 70, ACCENT.white, ACCENT.sparkGold);
}

/** The line of a thrust: two streaks running back from the point, above and below the blade. */
function thrustStreak(d: Draw, from: V, to: V, ang: number, z: number) {
  const o = { mat: SV, z, outline: false, line: 'none' as const, noClean: true };
  const back = Math.max(14, Math.hypot(to.x - from.x, to.y - from.y) * 1.3);
  for (const [w, k] of [[3.0, 1], [-2.8, 0.8]] as const) {
    const a = at(at(to, ang + 90, w), ang, -2), b = at(a, ang, -back * k);
    d.ribbon({ ...o, group: 'streak', color: SWING.edge }, [b, a], [0.3, 1.1]);
    d.line({ ...o, z: z + 0.01, group: 'streak' }, lerpV(a, b, 0.5), a, SWING.core);
  }
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  const blow = (P.hair ?? 0) * 1.4;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.4, 3.2);
  // the gorget: gold, with a bright upper rim
  d.capsule({ mat: GD, z: 37.7, group: 'gorget' }, s.T(20.6, -5.0), s.T(21.6, 3.6), 3.0, 2.8);
  d.capsule({ mat: GD, z: 37.75, group: 'gorget', line: 'none' }, s.T(22.4, -4.2), s.T(23.0, 2.8), 0.5, 0.5);
  // bareheaded, a calm and sure look
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: 'calm', mouth: P.shout ? 'shout' : 'line', lip: SK.ramp[1], rx: 5.9, ry: 6.5, profile: 'soft' });
  // the hair swept back off the brow, tied in a short tail at the nape
  d.poly(
    { mat: HR, z: 39, group: 'hair', line: 'soft', tex: (h) => (Math.sin(h.v * 10) > 0.72 ? -1 : 0) },
    [H(4.6, 5.0), H(2.8, 7.0), H(-0.8, 7.9), H(-4.6, 7.2), H(-7.0, 4.6), H(-7.6, 0.6), H(-8.4 - blow, -3.0), H(-8.0 - blow, -6.6), H(-6.0 - blow * 0.6, -6.8), H(-4.2, -4.4), H(-3.0, -1.6), H(-1.4, 1.2), H(-0.2, 3.0), H(1.6, 4.4)],
    { kind: 'dome', c: H(-2.2, 2.4), r: 9.6, bevel: 1.1 },
  );
  d.line({ mat: HR, z: 39.15, group: 'hair', line: 'none' }, H(2.0, 6.8), H(-4.6, 6.2), HR.ramp[4]);
  // the tail: a short tie, then the hair falling
  d.capsule({ mat: HR, z: 38.9, group: 'hairTail', line: 'soft' }, H(-7.4, -1.4), H(-10.4 - blow * 1.5, -7.0), 1.8, 1.1);
  d.pixels({ mat: GD, z: 39.2, group: 'hair', line: 'none' }, [{ p: H(-7.8, -1.0), c: GD.ramp[4] }]);
  // a thin moustache above a firm mouth
  d.pixels({ mat: HR, z: 38.6, group: 'beard' }, [{ p: H(4.6, -2.6), c: HR.ramp[2] }, { p: H(5.4, -2.5), c: HR.ramp[3] }, { p: H(6.1, -2.8), c: HR.ramp[2] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the rapier's angle runs from the near hand to the tip: 0 forward, 90 up)
// ---------------------------------------------------------------------------

/** The near hand at `hand`, the rapier at `ang`; the other hand is held back and up by default. */
const rp = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, armF: { up: -140, lo: 100 }, ...extra, p: { swordAng: ang, ...(extra.p ?? {}) } });

// At rest: a duellist's stance, the rapier levelled before him, point a little high, the other hand held back.
const IDLE: Pose = rp(v(14, 40), 20, {
  y: -1,
  torso: 86,
  head: 88,
  legN: { ik: v(-11, 3) },
  legF: { ik: v(10, 3) },
  p: { wind: 0.08 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 86 - b,
    armN: { ik: v(14, 40 - b), bend: -1 },
    armF: { up: -140 + b * 2, lo: 100 - b },
    p: { swordAng: 20 + b * 2, wind: 0.06 + b * 0.05, wave: a, hair: b * 0.3 },
  });
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
  return rp(v(11 + sw, 38 + bob), 38 + sw * 4, {
    y: bob - 2,
    torso: 74,
    head: 80,
    armF: { up: -130 - sw * 10, lo: 70 + sw * 12 },
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    p: { wind: 0.85, wave: a * 2, hair: 1 },
  });
}

// Piercing Lunge: the point drawn back at the hip, a lunge driving it forward through the gap, the other arm thrown back.
const LU_CHAMBER = rp(v(2, 40), 8, { x: -5, y: -4, torso: 82, head: 84, legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, armF: { up: -120, lo: 70 }, p: { wind: 0.4, wave: 1 } });
const LU_THRUST = rp(v(28, 42), 2, { x: 10, y: -7, torso: 64, head: 74, legN: { ik: v(-17, 3) }, legF: { ik: v(18, 3) }, armF: { up: 160, lo: 128 }, p: { shout: 1, wind: 1.0, wave: 2, thrust: 1, hair: 1 } });
const LU_HOLD = rp(v(27, 42), 3, { x: 10, y: -7, torso: 64, head: 74, legN: { ik: v(-17, 3) }, legF: { ik: v(18, 3) }, armF: { up: 160, lo: 128 }, p: { wind: 0.8, wave: 2.6, hair: 0.6 } });

// Threefold Flourish: a cut from high to low, the blade turned back in a rising cut, a last cut across the heart.
const FL_WIND = rp(v(5, 62), 124, { x: -3, y: -2, torso: 92, head: 90, legN: { ik: v(-12, 3) }, legF: { ik: v(9, 3) }, armF: { up: -150, lo: 90 }, p: { wind: 0.3, wave: 1 } });
const FL_CUT1 = rp(v(20, 44), -28, { x: 5, y: -4, torso: 74, head: 80, legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) }, armF: { up: 170, lo: 120 }, p: { shout: 1, wind: 0.8, wave: 1.8, sweep: 124 } });
const FL_FLICK = rp(v(15, 34), -38, { x: 4, y: -4, torso: 76, head: 80, legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) }, armF: { up: 165, lo: 115 }, p: { wind: 0.7, wave: 2.2 } });
const FL_CUT2 = rp(v(19, 58), 62, { x: 6, y: -3, torso: 82, head: 86, legN: { ik: v(-12, 3) }, legF: { ik: v(15, 3) }, armF: { up: 165, lo: 118 }, p: { shout: 1, wind: 0.9, wave: 2.8, sweep: -70 } });
const FL_BACK = rp(v(8, 50), 152, { x: 3, y: -3, torso: 84, head: 86, legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) }, armF: { up: 160, lo: 112 }, p: { wind: 0.8, wave: 3.2 } });
const FL_CUT3 = rp(v(25, 45), 4, { x: 9, y: -5, torso: 68, head: 76, legN: { ik: v(-14, 3) }, legF: { ik: v(17, 3) }, armF: { up: 165, lo: 122 }, p: { shout: 1, wind: 1.0, wave: 3.6, sweep: 152 } });
const FL_END = rp(v(24, 44), 10, { x: 9, y: -5, torso: 68, head: 76, legN: { ik: v(-14, 3) }, legF: { ik: v(17, 3) }, armF: { up: 165, lo: 122 }, p: { wind: 0.7, wave: 4 } });

// Crown Salute: the blade drawn across behind him, a wide sweep through the line, then raised in salute, ablaze with sparks.
const SA_DRAW = rp(v(-2, 50), 168, { x: -5, y: -3, torso: 92, head: 92, legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, armF: { up: -100, lo: 60 }, p: { wind: 0.4, wave: 1, charge: 0.3 } });
const SA_SWEEP = rp(v(22, 44), -6, { x: 7, y: -4, torso: 70, head: 78, legN: { ik: v(-13, 3) }, legF: { ik: v(16, 3) }, armF: { up: 165, lo: 124 }, p: { shout: 1, wind: 0.9, wave: 2, sweep: 168, charge: 0.6 } });
const SA_RAISE = rp(v(8, 60), 94, { x: 3, y: -1, torso: 92, head: 96, legN: { ik: v(-11, 3) }, legF: { ik: v(11, 3) }, armF: { up: -68, lo: 32 }, p: { shout: 1, wind: 0.6, wave: 3, charge: 1 } });

const HURT = rp(v(11, 38), 50, {
  x: -4, y: -1, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armF: { up: -130, lo: 20 },
  p: { wind: 0.5, wave: 1, hair: 1, dim: 1 },
});
const DEATH_KNEEL = rp(v(12, 36), -80, {
  x: 0, y: -13, torso: 76, head: 60,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armF: { up: -110, lo: 10 },
  p: { wind: 0.2, wave: 1, dim: 1 },
});
const DEATH_FALL = pose({
  x: 2, y: -21, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { swordAng: -20, wind: 0.6, wave: 2, dim: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { swordAng: 4, wind: 0.2, wave: 3, dim: 1 },
});

// Victory: the rapier raised before his face in salute, sparks streaming off it, the cloak stirring.
const SALUTE = rp(v(10, 54), 92, { y: -1, torso: 88, head: 92, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, armF: { up: -70, lo: 30 }, p: { wind: 0.15, wave: 1, charge: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const waved = (p: Pose, w: number, wind?: number) => tweak(p, { p: { wave: w, ...(wind !== undefined ? { wind } : {}) } });

const char: CharDef = {
  id: 'azul_the_blade',
  name: 'Azul the Blade',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 160, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, LU_CHAMBER, 2, 70),
        ...keys([
          [LU_CHAMBER, 190],
          [mid(LU_CHAMBER, LU_THRUST, 0.5), 40],
          [LU_THRUST, 70, { smear: true, hit: true }],
          [LU_HOLD, 240],
        ]),
        ...tween(D, LU_HOLD, IDLE, 3, 110, ease.inOut),
      ],
    },
    attack2: {
      loop: false,
      frames: [
        ...tween(D, IDLE, FL_WIND, 2, 60),
        ...keys([
          [FL_WIND, 150],
          [mid(FL_WIND, FL_CUT1, 0.5), 30],
          [FL_CUT1, 60, { smear: true, hit: true }],
          [FL_FLICK, 70],
          [mid(FL_FLICK, FL_CUT2, 0.5), 30],
          [FL_CUT2, 60, { smear: true, hit: true }],
          [FL_BACK, 80],
          [mid(FL_BACK, FL_CUT3, 0.5), 30],
          [FL_CUT3, 70, { smear: true, hit: true }],
          [FL_END, 220],
        ]),
        ...tween(D, FL_END, IDLE, 3, 110, ease.inOut),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SA_DRAW, 2, 80),
        ...keys([
          [SA_DRAW, 200],
          [mid(SA_DRAW, SA_SWEEP, 0.5), 45],
          [SA_SWEEP, 70, { smear: true, hit: true }],
          [tweak(SA_SWEEP, { p: { charge: 0.8 } }), 200],
          [mid(SA_SWEEP, SA_RAISE, 0.5), 90],
          [SA_RAISE, 140, { event: 'cast' }],
          [waved(SA_RAISE, 4.2, 0.55), 200],
          [waved(SA_RAISE, 5.0, 0.4), 200],
        ]),
        ...tween(D, SA_RAISE, IDLE, 3, 120, ease.inOut),
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
        ...tween(D, IDLE, SALUTE, 2, 100, ease.out),
        ...keys([
          [waved(SALUTE, 1.6, 0.25), 240],
          [waved(SALUTE, 2.4, 0.3), 240],
          [waved(SALUTE, 3.2, 0.25), 300],
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

/** The rapier in an icon, scaled up for 40x40: the long blade, the gold cup and quillons, the wound grip and the pommel. */
function iconRapier(d: Draw, hand: V, ang: number, z: number, tip: number) {
  const f = d.frame(hand, ang);
  const g = 'irapier' + z;
  d.capsule({ mat: GD, z, group: g, tex: (h) => (Math.floor(h.u * 6) % 2 ? 0 : -1) }, f(-8, 0), f(2, 0), 1.7, 1.7);
  d.circle({ mat: GD, z: z + 0.05, group: g }, f(-9.6, 0), 2.4);
  d.poly({ mat: SV, z: z + 0.1, group: g + 'b' }, [f(4, -1.8), f(tip - 14, -1.4), f(tip, 0), f(tip - 14, 1.4), f(4, 1.8)], { kind: 'cyl', a: f(4, 0), b: f(tip, 0), r: 2.6 });
  d.line({ mat: SV, z: z + 0.12, group: g + 'b', line: 'none' }, f(5, -0.3), f(tip - 4, 0), SV.ramp[5]);
  d.ellipse({ mat: GD, z: z + 0.2, group: g, line: 'soft' }, f(3.2, 0), 2, 4.6, ang);
  d.ribbon({ mat: GD, z: z + 0.22, group: g }, [f(2.6, -8.4), f(3.4, -4.4), f(3.6, 0), f(3.4, 4.4), f(2.6, 8.4)], [1.1, 1.3, 1.5, 1.3, 1.1]);
}

const E = ACCENT;

export const azulTheBlade: ChampionArt = {
  char,
  iconBg: MAT.blue,
  icons: {
    piercing_lunge: () =>
      compose(MAT.blue, glyph((d) => {
        // the point driven forward through the gap
        iconRapier(d, v(2, 18), 4, 10, 44);
      }), (b) => {
        speedLines(b, [[2, 12, 12, 12], [3, 28, 14, 28]], E.white);
        impactStar(b, 34, 21, 2, 8, 9, FXR.gold[3], E.goldHot);
      }),
    threefold_flourish: () =>
      compose(MAT.blue, glyph((d) => {
        // the three cuts crossing: two diagonals and a level one, the rapier at the end of the last
        smear(d, v(8, 30), 150, 20, 29, 6, SWING, 1);
        iconRapier(d, v(7, 14), -30, 10, 42);
      }), (b) => {
        for (const [x0, y0, x1, y1, c] of [[10, 5, 33, 34, FXR.steel[3]], [10, 36, 34, 6, FXR.steel[2]]] as const) {
          const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
          for (let k = 0; k <= n; k++) b.set(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), c);
        }
        for (const [x, y] of [[30, 9], [34, 14], [27, 5], [35, 8]] as const) b.set(x, y, FXR.gold[3]);
      }),
    crown_salute: () =>
      compose(MAT.blue, glyph((d) => {
        // the rapier raised in salute, point up
        iconRapier(d, v(20, 4), 90, 10, 42);
      }), (b) => {
        // sparks round the blade, and a crown of three gold points over the hilt
        for (const [x, y] of [[14, 12], [27, 16], [13, 24], [28, 8], [24, 27]] as const) {
          b.set(x, y, E.white);
          b.set(x + 1, y, FXR.gold[3]);
          b.set(x, y + 1, FXR.steel[3]);
        }
        for (const [x, y, c] of [[15, 34, FXR.gold[3]], [20, 33, E.goldHot], [25, 34, FXR.gold[3]], [15, 36, FXR.gold[2]], [16, 36, FXR.gold[3]], [17, 36, FXR.gold[3]], [18, 36, FXR.gold[3]], [19, 36, FXR.gold[3]], [20, 36, FXR.gold[3]], [21, 36, FXR.gold[3]], [22, 36, FXR.gold[3]], [23, 36, FXR.gold[3]], [24, 36, FXR.gold[3]], [25, 36, FXR.gold[2]]] as const) b.set(x, y, c);
      }),
    duelists_poise: () =>
      compose(MAT.blue, glyph((d) => {
        // a breastplate, whole, with a gold crown on it
        d.poly({ mat: PL, z: 10, group: 'iplate' }, [v(10, 34), v(30, 34), v(33, 22), v(28, 7), v(12, 7), v(7, 22)], { kind: 'cyl', a: v(20, 7), b: v(20, 34), r: 15, bevel: 1.8 });
        d.line({ mat: GD, z: 10.1, group: 'iplate', line: 'none' }, v(20, 32), v(20, 8), GD.ramp[4]);
        d.ribbon({ mat: GD, z: 10.1, group: 'iplate', line: 'none' }, [v(10, 33), v(20, 30), v(30, 33)], [0.9, 0.9, 0.9]);
        d.pixels({ mat: GD, z: 10.2, group: 'iplate', line: 'none' }, [
          { p: v(17, 20), c: GD.ramp[4] }, { p: v(18, 20), c: GD.ramp[5] }, { p: v(19, 20), c: GD.ramp[4] }, { p: v(20, 20), c: GD.ramp[5] }, { p: v(21, 20), c: GD.ramp[4] },
          { p: v(17, 21), c: GD.ramp[3] }, { p: v(19, 21), c: GD.ramp[5] }, { p: v(21, 21), c: GD.ramp[3] },
        ]);
      })),
  },
};
