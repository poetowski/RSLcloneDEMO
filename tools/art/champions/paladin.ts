// The Paladin (docs/DESIGN_DECISIONS.md section 34, Jakub's brief of
// 2026-10-24): a Heroic of the Azure Crown, Tank. "Tall human knight with full
// silver and metal plate armor with wide ornated shoulders. long back cloak in
// dark blue with three white crowns. no helmet. longer blonde hair and young
// fierce sight. wields a swiss-shaped big shield with a double cross on it. in
// other hand he wields a wide sword which has animated flames. this sword is
// very bright." So he is the tallest of the Crown's knights: silver plate from
// the gorget to the sabatons, edged in gold; wide pauldrons of three lames,
// each edged in gold, a raised ridge and a gold rosette on the top one; a long
// dark-blue cloak from his shoulders to his calves, three white crowns down
// the part of it that shows behind him; bareheaded, his blonde hair to his
// shoulders, a young face with a hard, fierce brow. On his far arm, before
// him, the big shield in the Swiss shape (a straight top, straight sides, the
// lower half curving to a point), silver-rimmed, azure, a white double cross
// on it; in his near hand the wide sword, its blade burning white-gold with
// flames licking up its length, every frame its own (they rise whichever way
// the blade points and trail its swing), embers above them. What the brief
// leaves open is a first take: the cut of the plate and its gold, the rosette,
// the crowns' shape and places, the shield's colours, the hilt, the face and
// the hair. His affinity sets nothing here (affinities are abstract, Jakub,
// 2026-10-11): the fire is the sword's own, as the brief says.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { rampDither } from '../paint.ts';
import { hash2, RGBA } from '../raster.ts';
import { leg, smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 36.5,
  thigh: 17.2,
  shin: 16.6,
  ankleH: 3,
  footLen: 7.4,
  spine: 23.6,
  neck: 7.0,
  upperArm: 13.8,
  foreArm: 12.8,
  shoulderDrop: 5,
  shoulderN: -4.2,
  shoulderF: 5.0,
  hipN: -2.4,
  hipF: 2.4,
};

const SK = MAT.skinLight, PL = MAT.silver, GD = MAT.gold, CL = MAT.indigo, WC = MAT.whiteCloth, AZ = MAT.lapis, DL = MAT.darkleather, HR = MAT.hairBlonde;
/** The burning blade: the glow ramp's two brightest steps and a white-hot heart. */
const BG = MAT.glowGold;

/** The fire, darkest edge to white-hot root: the sword's own flames, from the palette's glow ramps. */
const FIRE: RGBA[] = [MAT.glowRed.ramp[2], MAT.glowRed.ramp[3], MAT.glowAmber.ramp[3], MAT.glowAmber.ramp[4], BG.ramp[5]];
/** The streak of a swing: the blade's fire drawn out, gold at its edge and white-gold at its heart. */
const FIRE_SWING = { core: ACCENT.goldHot, edge: MAT.glowAmber.ramp[3] };

/** The sword, measured from the near hand: where the blade leaves the guard, its tip, its half width. */
const BASE = 4.4, TIP = 31, HALF = 2.5;

interface Blade {
  base: V;
  tip: V;
}

const bladeOf = (s: Skel): Blade => {
  const ang = s.pose.p.swordAng ?? -78;
  return { base: at(s.hN, ang, BASE), tip: at(s.hN, ang, TIP) };
};

/** Flicker time: whole cycles over a looping animation, an even pace through the others. */
function fireTime(info: BuildInfo): number {
  const a = char.anims[info.anim];
  return a.loop ? info.index / a.frames.length : info.index * 0.17;
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const ang = P.swordAng ?? -78;
  const heat = P.fire ?? 1;

  // the fiery streak of a swing behind everything
  if (info.def.smear && info.prev) {
    const from = info.prev.pose.p.swordAng ?? ang;
    smear(d, s.hN, P.sweepFrom ?? from, ang, TIP + 2, 13, FIRE_SWING, 3);
  }
  if (P.sweep) sweepArc(d, s, P.sweep, false);

  // the cloak behind everything
  cloak(d, s, P, 2);

  // far leg in plate
  leg(d, s, 'F', legCfg(10, -1));
  tasset(d, s, 'F', 11, -1);

  // the far pauldron and arm, behind the body; the hand is behind the shield
  pauldron(d, s, 'F', 19.4, -1);
  d.capsule({ mat: PL, z: 20, group: 'armF', shade: -1 }, s.sF, s.eF, 3.6, 3.1);
  d.capsule({ mat: PL, z: 20.1, group: 'armF', shade: -1 }, s.eF, s.hF, 3.1, 2.8);
  d.circle({ mat: PL, z: 20.15, group: 'armF', shade: -1 }, s.eF, 2.9);

  // torso: a silver breastplate with a keel, edged in gold at the neck and the arm-holes; a fauld; a sword belt
  const torso = torsoPts(s, [
    [0, 6.8, 7.0],
    [4, 7.0, 7.6],
    [9, 7.6, 8.8],
    [14, 8.2, 9.8],
    [18, 8.4, 9.2],
    [20.8, 6.8, 6.0],
    [22.6, 3.8, 3.2],
  ]);
  d.poly({ mat: PL, z: 30, group: 'cuirass' }, torso, { kind: 'cyl', a: s.T(0, 1.2), b: s.T(22.6, 1.2), r: 9.6, bevel: 1.6 });
  d.line({ mat: PL, z: 30.1, group: 'cuirass', line: 'none' }, s.T(8.8, 7.2), s.T(17.6, 8.8), PL.ramp[5]);
  d.ribbon({ mat: GD, z: 30.2, group: 'cuirass', line: 'none' }, [s.T(21.0, -5.8), s.T(21.8, 0), s.T(21.0, 5.8)], [0.55, 0.6, 0.55]);
  d.ribbon({ mat: GD, z: 30.2, group: 'cuirass', line: 'none' }, [s.T(20.4, 5.8), s.T(18.0, 2.2), s.T(15.2, 1.2)], [0.5, 0.5, 0.5]);
  for (const [u0, u1, k] of [[4.4, 6.8, 0], [2.4, 4.8, 1]] as const) {
    d.poly(
      { mat: PL, z: 31 + k * 0.01, group: 'fauld' + k, line: 'soft' },
      [s.T(u1, -7.2), s.T(u1, 7.8), s.T(u0, 8.0), s.T(u0, -7.1)],
      { kind: 'cyl', a: s.T(u0, 1), b: s.T(u1, 1), r: 8, bevel: 1 },
    );
    d.line({ mat: GD, z: 31.05 + k * 0.01, group: 'fauld' + k, line: 'none' }, s.T(u0 + 0.2, -6.6), s.T(u0 + 0.2, 7.6), GD.ramp[3]);
  }
  d.poly({ mat: DL, z: 32, group: 'belt' }, [s.T(7.6, -7.4), s.T(7.8, 8.2), s.T(6.2, 8.1), s.T(6.0, -7.2)], { kind: 'cyl', a: s.T(6, 0), b: s.T(7.8, 0), r: 8 });
  d.poly({ mat: GD, z: 32.1, group: 'buckle' }, [s.T(8.1, 5.6), s.T(8.1, 8.4), s.T(5.8, 8.4), s.T(5.8, 5.6)], { kind: 'bevel', w: 1 });

  head(d, s, P);

  // the shield before the body, on the far forearm
  shield(d, s, P, 45);

  // near leg in plate
  leg(d, s, 'N', legCfg(50, 0));
  tasset(d, s, 'N', 52, 0);

  // the sword and its fire, the near arm over the grip, the near pauldron
  const blade = bladeOf(s);
  const prev = info.prev ? bladeOf(info.prev) : undefined;
  flames(d, blade, prev, heat, fireTime(info), 55.8);
  sword(d, s.hN, ang, 56, heat);
  nearArm(d, s, 60);
  pauldron(d, s, 'N', 62, 0);

  if (P.sweep) sweepArc(d, s, P.sweep, true);
}

const legCfg = (z: number, shade: number) => ({
  thigh: PL, shin: PL, foot: PL, knee: PL, kneeR: 3.5, rThigh: [4.7, 3.9] as [number, number], rShin: [3.6, 2.9] as [number, number], z, shade, footStyle: 'sabaton' as const,
  // greaves: a lit ridge down the shin
  shinTex: (h: { v: number }) => (Math.abs(h.v + 0.25) < 0.12 ? 1 : 0),
});

/** The near arm in plate: a rerebrace, a couter at the elbow, a vambrace edged in gold, a gauntlet round the grip. */
function nearArm(d: Draw, s: Skel, z: number) {
  d.capsule({ mat: PL, z, group: 'armN' }, s.sN, s.eN, 3.6, 3.2);
  d.capsule({ mat: PL, z: z + 0.1, group: 'armN' }, s.eN, s.hN, 3.2, 2.9);
  d.circle({ mat: PL, z: z + 0.15, group: 'armN', line: 'soft' }, s.eN, 3.0);
  d.capsule({ mat: PL, z: z + 0.2, group: 'armN' }, at(s.hN, s.loN, -4.8), at(s.hN, s.loN, -1.6), 3.2, 3.7, 0.3);
  d.line({ mat: GD, z: z + 0.25, group: 'armN', line: 'none' }, at(at(s.hN, s.loN, -4.6), s.loN + 90, 3.0), at(at(s.hN, s.loN, -4.6), s.loN - 90, 3.0), GD.ramp[4]);
  d.ellipse({ mat: PL, z: z + 0.3, group: 'handN' }, s.hN, 2.9, 2.6, s.loN);
}

/**
 * A wide pauldron: three lames over the shoulder, each laid on a gold one a
 * little larger, so a gold rim shows along its lower edge; the near one wears
 * a small gold rosette on its top lame.
 */
function pauldron(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  // the plates stay on the shoulder: a raised arm tilts them at most 55 degrees off hanging down
  const arm = side === 'N' ? s.upN : s.upF;
  const off = ((arm + 90 + 540) % 360) - 180;
  const up = -90 + Math.max(-55, Math.min(55, off));
  const g = 'paul' + side;
  const top = at(at(sh, up, -0.4), s.torso, 2.4);
  const lames: [number, number, number][] = [[0, 8.0, 4.8], [3.0, 7.0, 3.9], [5.5, 6.0, 3.1]];
  lames.forEach(([o, rx, ry], i) => {
    const c = at(top, up, o);
    const zz = z - i * 0.01;
    d.ellipse({ mat: GD, z: zz - 0.004, group: g + i, shade, line: 'soft' }, at(c, up, 0.7), rx + 0.5, ry + 0.4, up + 90, 0.15);
    d.ellipse({ mat: PL, z: zz, group: g + i, shade, line: 'none' }, c, rx, ry, up + 90, 0.15);
  });
  if (side === 'N') {
    const p = d.P(at(top, up, 0.6));
    const x = Math.floor(p.x), y = Math.floor(p.y);
    d.pixels({ mat: GD, z: z + 0.03, group: g + '0' }, [
      { p: screen(d, x, y), c: ACCENT.goldHot }, { p: screen(d, x - 1, y), c: GD.ramp[4] }, { p: screen(d, x + 1, y), c: GD.ramp[3] }, { p: screen(d, x, y - 1), c: GD.ramp[4] }, { p: screen(d, x, y + 1), c: GD.ramp[3] },
    ]);
  }
}

/** Tassets over each thigh: two lames hanging from the fauld, the lower one edged in gold. */
function tasset(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.3;
  for (const [u0, u1, w0, w1, k] of [[-1.6, 5.4, 5.1, 5.5, 0], [4.2, 10.0, 5.5, 5.9, 1]] as const) {
    const a = at(hip, hang, u0), b = at(hip, hang, u1);
    d.poly(
      { mat: PL, z: z + k * 0.02, group: 'tas' + side + k, shade, line: 'soft' },
      [at(a, hang + 90, w0), at(b, hang + 90, w1), at(b, hang - 90, w1 + 0.2), at(a, hang - 90, w0)],
      { kind: 'cyl', a, b, r: w1 + 0.4, bevel: 1 },
    );
  }
  const hem = at(hip, hang, 10.2);
  d.capsule({ mat: GD, z: z + 0.05, group: 'tas' + side + '1', shade, line: 'none' }, at(hem, hang + 90, 5.7), at(hem, hang - 90, 5.9), 0.5, 0.5);
}

/**
 * The long dark-blue cloak, hung from the shoulders (the construction of
 * parts.ts `cape`, kept here so the crowns can sit on it), and its three
 * white crowns, one under another down the part that shows behind him.
 */
function cloak(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const len = 52, spread = 15, wind = P.wind ?? 0.08, wave = P.wave ?? 0;
  const topB = s.T(21.6, -7.4), topF = s.T(22.1, 2.4);
  // it hangs from his shoulders; once he lies on the ground it lies under him, along his body
  const hang = s.torso < 55 ? s.torso + 180 : -96 - wind * 64;
  // and never sinks into the floor: what reaches it spreads along it
  const floor = (p: V) => v(p.x, Math.max(0.6, p.y));
  const midB = floor(at(topB, hang - 14 + wind * 6 + Math.sin(wave) * 3, len * 0.5));
  const botB = floor(at(topB, hang - 6, len + spread * 0.4));
  const botF = floor(at(topF, hang + 9 - wind * 4, len * 0.9));
  const midF = floor(at(topF, hang + 6, len * 0.45));
  const hem: V[] = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    const off = Math.sin(wave * 1.3 + t * 6.5) * (0.8 + wind * 1.6);
    hem.push(floor(at(lerpV(botB, botF, t), hang, off)));
  }
  const fold = (h: { v: number }) => (Math.sin(h.v * 8 + wave * 0.7) > 0.6 ? -1 : 0);
  d.poly(
    { mat: CL, z, group: 'cloak', tex: fold },
    [topF, topB, midB, ...hem, midF],
    { kind: 'cyl', a: lerpV(topB, topF, 0.5), b: lerpV(botB, botF, 0.5), r: Math.max(4, 7.4 + 2.4 + spread * 0.5) * 0.6, bevel: 1.2 },
  );
  // the crowns, 4.6 px in from the back edge, down its length
  const backAt = (t: number) => (t < 0.5 ? lerpV(topB, midB, t / 0.5) : lerpV(midB, botB, (t - 0.5) / 0.5));
  const frontAt = (t: number) => (t < 0.5 ? lerpV(topF, midF, t / 0.5) : lerpV(midF, botF, (t - 0.5) / 0.5));
  for (const t of [0.42, 0.62, 0.82]) {
    const b = backAt(t), f = frontAt(t);
    const span = Math.hypot(f.x - b.x, f.y - b.y) || 1;
    crown(d, lerpV(b, f, Math.min(0.5, 4.6 / span)), z + 0.1);
  }
}

/** A small white crown on the cloak, three points over a band, upright whichever way he faces. */
function crown(d: Draw, c: V, z: number) {
  const rows = ['#.#.#', '#####', '#####'];
  const x0 = Math.floor(d.P(c).x) - 2, y0 = Math.floor(d.P(c).y) - 1;
  const px: { p: V; c: RGBA }[] = [];
  rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch !== '#') return;
    const k = ry === 0 ? 5 : ry === 1 ? (rx < 3 ? 5 : 4) : rx < 2 ? 4 : 3;
    px.push({ p: screen(d, x0 + rx, y0 + ry), c: WC.ramp[k] });
  }));
  d.pixels({ mat: WC, z, group: 'cloak' }, px);
}

/** The rig point whose pixel is the screen pixel (x, y). */
const screen = (d: Draw, x: number, y: number): V => v((x + 0.5 - d.pivot.x) * d.facing, d.pivot.y - (y + 0.5));

/**
 * The shield in the Swiss shape: a straight top, straight sides, the lower
 * half curving to a point; a silver rim, the field azure, a white double cross
 * on it. Strapped to the far forearm and held before the body. Turning as he
 * falls (`back`), its plain silver back and two straps show; once he lies dead
 * (`drop`) it lies on the ground before him, face up, seen almost edge-on.
 */
function shield(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  if (P.drop) shieldAt(d, v(15, 2.4), 0, z, false, 1, 0.8);
  else shieldAt(d, at(lerpV(s.eF, s.hF, 0.5), s.torso - 90, 1.2), P.shieldAng ?? 90, z, !!P.back);
}

/** The shield at `c`, its top toward `ang`; `flat` 0..1 squeezes it across, as it turns edge-on. */
function shieldAt(d: Draw, c: V, ang: number, z: number, back = false, scale = 1, flat = 0) {
  const f0 = d.frame(c, ang);
  const f = (u: number, w: number) => f0(u, w * (1 - flat));
  const K = 0.88; // the face is turned a little away: narrower across
  const T = 13.6 * scale, B = -21 * scale, HW = 10.4 * K * scale, SIDE = -1.4 * scale;
  const rim: V[] = [f(T, -HW), f(T + 0.5, -HW * 0.5), f(T + 0.6, 0), f(T + 0.5, HW * 0.5), f(T, HW), f(SIDE, HW)];
  // the curve from the foot of each side to the point
  const n = 7;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    rim.push(f(SIDE + (B - SIDE) * (1 - Math.cos((t * Math.PI) / 2)), HW * Math.pow(Math.cos((t * Math.PI) / 2), 0.85)));
  }
  rim.push(f(B, 0));
  for (let i = n - 1; i >= 1; i--) {
    const t = i / n;
    rim.push(f(SIDE + (B - SIDE) * (1 - Math.cos((t * Math.PI) / 2)), -HW * Math.pow(Math.cos((t * Math.PI) / 2), 0.85)));
  }
  rim.push(f(SIDE, -HW));
  const mid = f(-2 * scale, 0);
  const dome = { kind: 'dome' as const, c: f(3 * scale, HW * 0.2), r: 24 * scale, bevel: 1.2 };
  d.poly({ mat: PL, z, group: 'shield' }, rim, dome);
  const field = rim.map((p) => lerpV(p, mid, (1.7 * scale) / Math.hypot(p.x - mid.x, p.y - mid.y)));
  if (back) {
    d.poly({ mat: PL, z: z + 0.1, group: 'shield', line: 'none', shade: -1 }, field, dome);
    for (const u of [4, -7]) d.capsule({ mat: DL, z: z + 0.2, group: 'shield' }, f(u * scale, -HW * 0.7), f(u * scale, HW * 0.7), 0.9 * scale, 0.9 * scale);
    return;
  }
  d.poly({ mat: AZ, z: z + 0.1, group: 'shield', line: 'none' }, field, dome);
  // the double cross: an upright and two arms, the upper one shorter
  const bar = (u0: number, u1: number, w0: number, w1: number) =>
    d.poly({ mat: WC, z: z + 0.2, group: 'shield', line: 'none' }, [f(u1 * scale, w0 * scale), f(u1 * scale, w1 * scale), f(u0 * scale, w1 * scale), f(u0 * scale, w0 * scale)], dome);
  bar(-15.5, 10.4, -1.25, 1.25);
  bar(4.6, 6.9, -4.2, 4.2);
  bar(-2.4, 0.0, -6.4, 6.4);
  // gold studs at the corners of the rim
  for (const [u, w] of [[T - 0.8, -HW + 1], [T - 0.8, HW - 1], [B + 2.4 * scale, 0]] as const) d.pixels({ mat: GD, z: z + 0.15, group: 'shield' }, [{ p: f(u, w), c: GD.ramp[4] }]);
}

/**
 * The sword: a long grip of dark leather, a silver pommel and cross-guard
 * with gold at their ends, a wide blade burning white-gold (`heat` 0: the
 * fire gone out, plain silver).
 */
function sword(d: Draw, hand: V, ang: number, z: number, heat: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: DL, z, group: 'hilt', tex: (h) => (Math.floor(h.u * 8) % 2 ? 1 : 0) }, f(-6.4, 0), f(2.2, 0), 1.3, 1.3);
  d.ellipse({ mat: PL, z: z + 0.05, group: 'hilt' }, f(-8.0, 0), 2.1, 1.8, ang);
  d.pixels({ mat: GD, z: z + 0.06, group: 'hilt' }, [{ p: f(-8.0, 0), c: GD.ramp[4] }]);
  const lit = heat > 0.15;
  const pts = [f(BASE, -HALF), f(TIP - 7, -HALF * 0.92), f(TIP, 0), f(TIP - 7, HALF * 0.92), f(BASE, HALF)];
  d.poly({ mat: lit ? BG : PL, z: z + 0.1, group: 'blade', minIdx: lit ? 4 : undefined }, pts, { kind: 'cyl', a: f(BASE, 0), b: f(TIP, 0), r: HALF + 0.6 });
  // the white-hot heart down the blade (a fuller when it is cold)
  d.line({ mat: lit ? BG : PL, z: z + 0.12, group: 'blade', line: 'none' }, f(BASE + 1, 0), f(TIP - 4, 0), lit ? ACCENT.white : PL.ramp[2]);
  // the cross-guard, its ends turned toward the blade and capped with gold
  d.ribbon({ mat: PL, z: z + 0.2, group: 'guard' }, [f(2.0, -6.2), f(2.9, -4.4), f(3.0, -2.0), f(2.9, 0), f(3.0, 2.0), f(2.9, 4.4), f(2.0, 6.2)], [0.95, 1.1, 1.25, 1.35, 1.25, 1.1, 0.95]);
  for (const side of [-1, 1]) d.circle({ mat: GD, z: z + 0.21, group: 'guard' }, f(2.6, side * 6.6), 1.05);
}

/**
 * The flames on the blade: tongues rising from its length, each flickering
 * at its own pace (whole cycles through a looping animation), leaning away
 * from the blade's travel since the last frame and longer for it, and a few
 * embers above them. Rasterized in screen pixels into one layer of light
 * behind the blade, so the blade itself stays the brightest thing.
 */
function flames(d: Draw, now: Blade, prev: Blade | undefined, heat: number, t: number, z: number) {
  if (heat <= 0.05) return;
  const B = d.P(now.base), T = d.P(now.tip);
  const pB = prev ? d.P(prev.base) : B, pT = prev ? d.P(prev.tip) : T;
  const field = new Map<number, number>();
  // across the blade on screen, to root the tongues on its two edges
  const bl = Math.hypot(T.x - B.x, T.y - B.y) || 1;
  const nx = -(T.y - B.y) / bl, ny = (T.x - B.x) / bl;
  const N = 9;
  for (let k = 0; k < N; k++) {
    const u = (k + 0.5) / N;
    const side = k % 2 ? 1 : -1;
    const on = lerpV(B, T, u), was = lerpV(pB, pT, u);
    const root = v(on.x + nx * side * (HALF - 0.2), on.y + ny * side * (HALF - 0.2));
    let vx = on.x - was.x, vy = on.y - was.y;
    const sp = Math.hypot(vx, vy);
    if (sp > 14) {
      vx *= 14 / sp;
      vy *= 14 / sp;
    }
    // up the screen, flaring off its edge, trailing the travel
    let dx = nx * side * 0.4 - vx * 0.1, dy = -1 + ny * side * 0.4 - vy * 0.1;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl;
    dy /= dl;
    const ph = k * 2.39, cyc = 1 + (k % 3);
    const flick = 0.74 + 0.2 * Math.sin(2 * Math.PI * cyc * t + ph) + 0.1 * Math.sin(2 * Math.PI * (cyc + 2) * t + ph * 1.7);
    const len = heat * (5.2 + (k % 3) * 1.4 + u * 2.8) * flick * (1 + Math.min(1, sp / 10) * 0.7);
    tongue(field, root, dx, dy, len, 1.7 + heat * 0.5 + (k % 2) * 0.3, ph + 2 * Math.PI * cyc * t);
  }
  const px: { p: V; c: RGBA }[] = [];
  for (const [key, val] of field) {
    if (val < 0.35) continue;
    const x = key % 4096, y = Math.floor(key / 4096);
    px.push({ p: screen(d, x, y), c: rampDither(FIRE, Math.min(4, val), x, y) });
  }
  // embers drifting up off the fire, each on its own whole cycle
  for (let m = 0; m < 3; m++) {
    const age = (t * (m + 1) + hash2(m, 7, 3)) % 1;
    const root = lerpV(B, T, 0.25 + 0.6 * hash2(m, 11, 5));
    const lift = Math.min(heat, 1.2);
    const x = Math.round(root.x + Math.sin(age * 6.3 + m * 2) * 1.6), y = Math.round(root.y - 7 * lift - age * 11 * lift);
    px.push({ p: screen(d, x, y), c: age < 0.45 ? ACCENT.goldHot : age < 0.8 ? MAT.glowAmber.ramp[3] : MAT.glowRed.ramp[3] });
  }
  d.pixels({ mat: MAT.glowAmber, z, group: 'fire', outline: false, line: 'none' }, px);
}

/** One flame tongue from `root` along (dx, dy) in screen pixels: widest low down, licking to a swaying point. */
function tongue(field: Map<number, number>, root: V, dx: number, dy: number, len: number, w: number, phase: number) {
  if (len < 1) return;
  const nx = -dy, ny = dx;
  const ex = root.x + dx * len, ey = root.y + dy * len;
  for (let y = Math.floor(Math.min(root.y, ey) - w - 2); y <= Math.ceil(Math.max(root.y, ey) + w + 2); y++) {
    for (let x = Math.floor(Math.min(root.x, ex) - w - 2); x <= Math.ceil(Math.max(root.x, ex) + w + 2); x++) {
      const px = x + 0.5 - root.x, py = y + 0.5 - root.y;
      const along = px * dx + py * dy, across = px * nx + py * ny;
      if (along < -w || along > len) continue;
      const t = Math.max(0, along) / len;
      const sway = Math.sin(phase + t * 3.4) * t * w * 0.7;
      const half = along < 0 ? Math.sqrt(Math.max(0, w * w - along * along)) * 0.9 : w * (t < 0.22 ? 0.82 + t * 0.8 : (1 - t) / 0.78);
      const o = Math.abs(across - sway);
      if (o > half) continue;
      const core = 1 - o / Math.max(0.5, half);
      const val = core * 2.3 + (1 - t) * 1.9 - 0.25 + (hash2(x, y, Math.round(phase * 5)) - 0.5) * 0.6;
      const key = y * 4096 + x;
      if (val > (field.get(key) ?? -9)) field.set(key, val);
    }
  }
}

/** Trial by Fire's sweep: a flat arc of fire round the body, its back half behind him and its front half before him. */
function sweepArc(d: Draw, s: Skel, phase: number, front: boolean) {
  const c = s.T(11, 2);
  const o = { mat: MAT.glowAmber, group: 'sweep', outline: false, line: 'none' as const, noClean: true };
  const spans: Record<number, [number, number]> = { 1: [200, 300], 2: [220, 410], 3: [300, 430] };
  const [a0, a1] = spans[Math.round(phase)] ?? [0, 0];
  const lo = front ? Math.max(a0, 270) : a0, hi = front ? a1 : Math.min(a1, 270);
  if (hi - lo < 4) return;
  const fade = phase >= 3 ? 1 : 0;
  d.arc({ ...o, z: front ? 70 : 3, color: MAT.glowRed.ramp[3] }, c, 25 - fade * 3, 36, lo, hi, 0.9, 0.3);
  d.arc({ ...o, z: front ? 70.05 : 3.05, color: MAT.glowAmber.ramp[3] }, c, 28, 36, lo, hi, 0.8, 0.3);
  d.arc({ ...o, z: front ? 70.1 : 3.1, color: fade ? MAT.glowAmber.ramp[4] : ACCENT.goldHot }, c, 32, 36, lo, hi, 0.7, 0.3);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  const blow = (P.hair ?? 0) * 1.6;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.3, 3.1);
  // the gorget, silver edged in gold
  d.capsule({ mat: PL, z: 37.7, group: 'gorget' }, s.T(21.4, -4.6), s.T(22.2, 3.4), 2.7, 2.5);
  d.capsule({ mat: GD, z: 37.75, group: 'gorget', line: 'none' }, s.T(23.0, -3.8), s.T(23.5, 2.6), 0.5, 0.5);
  // young and clean-shaven, a hard, fierce brow
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: 'angry', mouth: P.shout ? 'shout' : 'line', lip: SK.ramp[1], rx: 6.3, ry: 6.9 });
  // the hair: swept back off the brow and falling to his shoulders, over the ear and the nape
  d.poly(
    { mat: HR, z: 39, group: 'hair', line: 'soft', tex: (h) => (Math.sin(h.v * 10) > 0.72 ? -1 : 0) },
    [H(4.8, 5.4), H(2.8, 7.3), H(-0.8, 8.2), H(-4.6, 7.5), H(-7.4, 4.8), H(-8.4, 0.8), H(-8.8 - blow, -4.0), H(-8.6 - blow, -9.0), H(-6.4 - blow * 0.6, -10.2), H(-4.4, -8.4), H(-3.0, -4.6), H(-1.6, -1.0), H(-0.4, 2.6), H(1.6, 4.6)],
    { kind: 'dome', c: H(-2.2, 2.4), r: 10, bevel: 1.1 },
  );
  // a lock over the temple and the ear, to the jaw
  d.poly({ mat: HR, z: 39.1, group: 'hair', line: 'soft' }, [H(1.6, 5.4), H(3.8, 5.2), H(2.4, 2.6), H(0.6, -1.4), H(-0.6, -4.2), H(-1.8, -2.6), H(-1.2, 1.4)], { kind: 'dome', c: H(1, 2.6), r: 5, bevel: 0.6 });
  d.line({ mat: HR, z: 39.15, group: 'hair', line: 'none' }, H(2.0, 7.2), H(-5.0, 6.4), HR.ramp[4]);
  d.line({ mat: HR, z: 39.15, group: 'hair', line: 'none' }, H(-6.4, 3.6), H(-7.6 - blow, -6.0), HR.ramp[2]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the sword's angle runs from the near hand to the tip: 0 forward, 90 up; the shield's is absolute, 90 upright)
// ---------------------------------------------------------------------------

/** The near hand at `hand`, the sword at `ang`. */
const sw = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, ...extra, p: { swordAng: ang, ...(extra.p ?? {}) } });

// At rest: the shield before him, the burning sword held low at his side, point down before his feet.
const IDLE: Pose = sw(v(1, 37), -62, {
  y: -1,
  torso: 87,
  head: 89,
  legN: { ik: v(-9, 3) },
  legF: { ik: v(10, 3) },
  armF: { up: -76, lo: 48 },
  p: { shieldAng: 90, wind: 0.08 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 87 - b,
    armN: { ik: v(1, 37 - b), bend: -1 },
    armF: { up: -76 + b, lo: 48 + b },
    p: { wind: 0.07 + b * 0.04, wave: a, hair: b * 0.2 },
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
  const s = Math.cos(a);
  // the shield carried before him, the sword trailing low behind, its fire streaming back
  return sw(v(-8 + s * 2, 38 + bob), -150 + s * 6, {
    y: bob - 2,
    torso: 76,
    head: 84,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armF: { up: -56, lo: 34 },
    p: { shieldAng: 96, wind: 0.85, wave: a * 2, hair: 1 },
  });
}

// Searing Cut: the sword drawn up and back over his shoulder, the shield kept up, then one cut down through the enemy.
const SC_WIND = sw(v(-4, 64), 152, { x: -3, y: -2, torso: 97, head: 92, legN: { ik: v(-12, 3) }, legF: { ik: v(9, 3) }, armF: { up: -62, lo: 44 }, p: { shieldAng: 92, wind: 0.3, wave: 1, hair: 0.4 } });
const SC_OVER = sw(v(6, 68), 84, { x: 2, y: -2, torso: 88, head: 86, legN: { ik: v(-11, 3) }, legF: { ik: v(12, 3) }, armF: { up: -66, lo: 36 }, p: { shieldAng: 94, shout: 1, wind: 0.5, wave: 1.6, hair: 0.6 } });
const SC_CUT = sw(v(19, 34), -42, { x: 8, y: -5, torso: 66, head: 76, legN: { ik: v(-10, 3) }, legF: { ik: v(16, 3) }, armF: { up: -82, lo: 10 }, p: { shieldAng: 100, shout: 1, wind: 0.8, wave: 2.4, hair: 0.9 } });
const SC_FOLLOW = sw(v(17, 29), -64, { x: 9, y: -5, torso: 64, head: 74, legN: { ik: v(-10, 3) }, legF: { ik: v(16, 3) }, armF: { up: -84, lo: 6 }, p: { shieldAng: 100, wind: 0.6, wave: 3, hair: 0.6 } });

// Beacon: the burning sword raised high over his head at the full reach of his arm (straight, so it never hides his face), the fire roaring up, then held there as its light goes out over the field.
const BC_LIFT = sw(v(-4.5, 82), 92, { y: 0, torso: 92, head: 98, legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) }, armF: { up: -64, lo: 38 }, p: { shieldAng: 90, wind: 0.2, wave: 1, hair: 0.3, fire: 1.4 } });
const BC_BLAZE = tweak(BC_LIFT, { y: 1, armN: { ik: v(-4.5, 84), bend: -1 }, p: { fire: 2.0, shout: 1, wave: 1.6, hair: 0.5 } });
const BC_HOLD = (k: number) => tweak(BC_LIFT, { p: { fire: 1.9 - k * 0.2, wave: 2 + k * 0.6, hair: 0.4 } });

// Trial by Fire: the challenge, the burning sword levelled at the enemy; then it is drawn back low and swept round through the line.
const TF_CALL = sw(v(13, 50), 58, { x: 1, y: -1, torso: 90, head: 94, legN: { ik: v(-10, 3) }, legF: { ik: v(11, 3) }, armF: { up: -66, lo: 40 }, p: { shieldAng: 92, shout: 1, wind: 0.3, wave: 1, hair: 0.4, fire: 1.8 } });
const TF_COIL = sw(v(-12, 40), -172, { x: -4, y: -5, torso: 78, head: 82, legN: { ik: v(-13, 3) }, legF: { ik: v(10, 3) }, armF: { up: -60, lo: 40 }, p: { shieldAng: 96, wind: 0.4, wave: 1.6, hair: 0.5, fire: 1.4 } });
const TF_SWING = sw(v(20, 41), 6, { x: 4, y: -6, torso: 76, head: 80, legN: { ik: v(-12, 3) }, legF: { ik: v(13, 3) }, armF: { up: -76, lo: 6 }, p: { shieldAng: 100, shout: 1, wind: 0.8, wave: 2.2, hair: 0.9, fire: 1.6 } });
const TF_THROUGH = sw(v(4, 44), 168, { x: 7, y: -5, torso: 74, head: 80, legN: { ik: v(-11, 3) }, legF: { ik: v(14, 3) }, armF: { up: -78, lo: 4 }, p: { shieldAng: 100, wind: 0.7, wave: 2.8, hair: 0.7, fire: 1.3 } });

const HURT = sw(v(-4, 40), -118, {
  x: -4, y: -1, torso: 99, head: 105,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armF: { up: -60, lo: 52 },
  p: { shieldAng: 86, wind: 0.5, wave: 1, hair: 0.6 },
});
const DEATH_KNEEL = sw(v(12, 26), -92, {
  x: 0, y: -14, torso: 76, head: 60,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armF: { up: -84, lo: -40 },
  p: { shieldAng: 70, wind: 0.2, wave: 1, fire: 0.55 },
});
const DEATH_FALL = pose({
  x: 2, y: -22, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { swordAng: -20, shieldAng: 30, back: 1, wind: 0.6, wave: 2, hair: 0.8, fire: 0.25 },
});
const DEATH_DOWN = pose({
  x: 6, y: -28, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { swordAng: 4, drop: 1, wind: 0.2, wave: 3, hair: 0.3, fire: 0 },
});

// Victory: the burning sword raised high, the fire roaring, the shield before him.
const RAISE = sw(v(-4.5, 81), 94, { y: -1, torso: 90, head: 98, legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) }, armF: { up: -66, lo: 38 }, p: { shieldAng: 90, shout: 1, wind: 0.2, wave: 1, hair: 0.3, fire: 1.6 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const waved = (p: Pose, w: number, fire?: number) => tweak(p, { p: { wave: w, ...(fire !== undefined ? { fire } : {}) } });

const char: CharDef = {
  id: 'paladin',
  name: 'Paladin',
  dims: D,
  build,
  // the blade shines while it burns: the game lights the air round it and throws embers off it
  glow: (s) => {
    const heat = s.pose.p.fire ?? 1;
    if (heat <= 0.15) return undefined;
    const b = bladeOf(s);
    return { from: b.base, to: b.tip, heat };
  },
  anims: {
    idle: { loop: true, frames: cycle(12, 110, idle) },
    run: { loop: true, frames: cycle(8, 75, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SC_WIND, 2, 80),
        ...keys([
          [SC_WIND, 190],
          [SC_OVER, 45],
          [SC_CUT, 70, { smear: true, hit: true }],
          [SC_FOLLOW, 220],
        ]),
        ...tween(D, SC_FOLLOW, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, BC_LIFT, 3, 90, ease.out),
        ...keys([
          [BC_LIFT, 120],
          [BC_BLAZE, 140, { event: 'cast' }],
          [waved(BC_BLAZE, 2.2), 120],
          [BC_HOLD(0), 110, { hit: true }],
          [BC_HOLD(1), 130],
          [BC_HOLD(2), 130],
          [BC_HOLD(3), 160],
        ]),
        ...tween(D, BC_HOLD(3), IDLE, 3, 110, ease.inOut),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TF_CALL, 2, 90, ease.out),
        ...keys([
          [TF_CALL, 160, { event: 'cast' }],
          [waved(TF_CALL, 1.6, 2), 160],
          [mid(TF_CALL, TF_COIL, 0.5), 70],
          [TF_COIL, 180],
          [tweak(mid(TF_COIL, TF_SWING, 0.5), { p: { sweep: 1 } }), 50],
          [tweak(TF_SWING, { p: { sweep: 2, sweepFrom: -172 } }), 70, { smear: true, hit: true }],
          [tweak(TF_THROUGH, { p: { sweep: 3 } }), 90],
          [TF_THROUGH, 200],
          [tweak(mid(TF_THROUGH, IDLE, 0.5), { p: { swordAng: -110 } }), 110],
        ]),
        ...tween(D, tweak(mid(TF_THROUGH, IDLE, 0.5), { p: { swordAng: -110 } }), IDLE, 2, 110, ease.inOut),
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
        [tweak(mid(HURT, DEATH_KNEEL, 0.5), { p: { fire: 0.8 } }), 110],
        [DEATH_KNEEL, 260],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -29 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RAISE, 2, 100, ease.out),
        ...keys([
          [waved(RAISE, 1.6, 1.8), 220],
          [waved(RAISE, 2.4, 1.7), 220],
          [waved(RAISE, 3.2, 1.6), 300],
          [mid(RAISE, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** The sword in an icon, scaled up for 40x40: the burning blade, the guard and its gold, the grip and the pommel, the fire on it. */
function iconSword(d: Draw, hand: V, ang: number, z: number, tip: number, heat = 1, t = 0.3) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: DL, z, group: 'ihilt', tex: (h) => (Math.floor(h.u * 6) % 2 ? 1 : 0) }, f(-7, 0), f(3, 0), 1.8, 1.8);
  d.ellipse({ mat: PL, z: z + 0.05, group: 'ihilt' }, f(-9, 0), 2.8, 2.4, ang);
  flames(d, { base: f(5.5, 0), tip: f(tip, 0) }, undefined, heat * 1.3, t, z - 0.1);
  d.poly({ mat: BG, z: z + 0.1, group: 'iblade', minIdx: 4 }, [f(5.5, -3.4), f(tip - 8, -3.1), f(tip, 0), f(tip - 8, 3.1), f(5.5, 3.4)], { kind: 'cyl', a: f(5.5, 0), b: f(tip, 0), r: 4 });
  d.line({ mat: BG, z: z + 0.12, group: 'iblade', line: 'none' }, f(7, 0), f(tip - 5, 0), ACCENT.white);
  d.ribbon({ mat: PL, z: z + 0.2, group: 'iguard' }, [f(3, -8.4), f(4, -5.6), f(4.2, -2.6), f(4, 0), f(4.2, 2.6), f(4, 5.6), f(3, 8.4)], [1.3, 1.5, 1.7, 1.8, 1.7, 1.5, 1.3]);
  for (const side of [-1, 1]) d.circle({ mat: GD, z: z + 0.21, group: 'iguard' }, f(3.6, side * 8.8), 1.4);
}

const E = ACCENT;

export const paladin: ChampionArt = {
  char,
  iconBg: CL,
  icons: {
    searing_cut: () =>
      compose(CL, glyph((d) => {
        // the burning sword at the end of its cut, the streak of its fire behind it
        smear(d, v(8, 32), 160, -40, 29, 8, FIRE_SWING, 1);
        iconSword(d, v(7, 32), -44, 10, 40, 1, 0.2);
      }), (b) => {
        // the ATK Down it leaves: two red chevrons pointing down, in the corner the blade leaves free
        for (const cy of [26, 31]) {
          for (let k = -3; k <= 3; k++) {
            b.set(7 + k, cy - Math.abs(k), Math.abs(k) < 2 ? E.redHot : E.red);
            b.set(7 + k, cy - Math.abs(k) - 1, E.red);
          }
        }
      }),
    beacon: () =>
      compose(CL, glyph((d) => {
        // the sword raised upright, the fire roaring off it
        iconSword(d, v(20, 3), 90, 10, 34, 1.5, 0.6);
      }), (b) => {
        // its light going out over the field: long rays from behind the blade to the edge
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2 + 0.13;
          for (let r = 9; r <= (k % 2 ? 15 : 19); r++) {
            const x = Math.round(20 + Math.cos(a) * r), y = Math.round(17 + Math.sin(a) * r);
            if (x > 2 && x < 37 && y > 2 && y < 37) b.set(x, y, r < 13 ? E.goldHot : E.chiGold);
          }
        }
      }),
    trial_by_fire: () =>
      compose(CL, glyph((d) => {
        // the shield with its double cross, a sweep of fire behind it
        smear(d, v(20, 18), 210, -30, 18, 6, FIRE_SWING, 1);
        shieldAt(d, v(20, 21), 90, 10, false, 0.78);
      })),
    unbowed: () =>
      compose(CL, glyph((d) => {
        shieldAt(d, v(20, 22), 90, 10, false, 0.82);
      }), (b) => {
        // the ring of what he shrugs off, a pale arc round the shield
        for (let k = 0; k <= 24; k++) {
          const a = Math.PI * (0.95 + (k / 24) * 1.1);
          b.set(Math.round(20 + Math.cos(a) * 16), Math.round(20 + Math.sin(a) * 16), k % 3 ? WC.ramp[3] : E.white);
        }
      }),
  },
};
