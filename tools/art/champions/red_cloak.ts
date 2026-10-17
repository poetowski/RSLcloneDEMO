// Red Cloak (docs/DESIGN_DECISIONS.md section 23, Jakub's proposal of
// 2026-10-17): an Elite of the Sanguine Dominion, a man in plate armour with
// a red cloak at his back, bald with only a goatee, wielding an ornamented
// silver zweihander. So he is a knight of the Dominion: full plate blackened
// as its standard's black, edged in silver; a long scarlet cloak from his
// shoulders to his calves; a bald head and a dark goatee, a stern brow; the
// zweihander nearly as long as he is tall (the silhouette feature, resting
// on his near shoulder): a silver blade with a fuller and engraving at its
// root, a ricasso wrapped in red leather between parrying lugs, a cross-guard
// with scrolled ends, a long grip and a heavy pommel. What the brief leaves
// open is a first take: the cut of the plate, its blackening, the hilt's
// ornament and his face. His affinity sets nothing here (affinities are
// abstract, Jakub, 2026-10-11): his Cleave leaves a plain white streak; his
// Crimson Blade glows crimson because that is what the skill does, and its
// cut burns (fx/sanguine_dominion.ts). Red and black are the Dominion's
// heraldry, not menace (DESIGN_DECISIONS.md 3.2).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar, speedLines } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { cape, leg, smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 34.5,
  thigh: 16.2,
  shin: 15.8,
  ankleH: 3,
  footLen: 7.2,
  spine: 22,
  neck: 6.0,
  upperArm: 13.2,
  foreArm: 12.4,
  shoulderDrop: 4.8,
  shoulderN: -4.0,
  shoulderF: 4.8,
  hipN: -2.4,
  hipF: 2.4,
};

const SK = MAT.skinTan, PL = MAT.darksteel, SV = MAT.silver, RD = MAT.red, DL = MAT.darkleather, GD = MAT.gold, HR = MAT.hairBrown, GR = MAT.glowRed;

/** Cleave's streak: plain white with the light of the silver, the colour of motion, not of an affinity. */
const SWING = { core: ACCENT.white, edge: SV.ramp[4] };
/** Crimson Blade's streak: the blade drawn so fast it glows, crimson-hot (the skill's own doing). */
const CRIMSON = { core: ACCENT.redHot, edge: ACCENT.red };

/** The zweihander, measured from the near hand under the guard: the tip, the ricasso, and the far hand down the grip. */
const TIP = 46, RICASSO = 7, LOWER = 6;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const ang = P.swordAng ?? 140;
  const two = (P.two ?? 1) >= 0.5;

  // the cut's streak behind the body: an arc for a swing, two straight lines for a thrust
  if (info.def.smear && info.prev) {
    const from = info.prev.pose.p.swordAng ?? ang;
    if (P.thrust && info.prev) thrustStreak(d, at(info.prev.hN, from, TIP), at(s.hN, ang, TIP), ang, 3);
    else smear(d, s.hN, P.sweep ?? from, ang, TIP + 2, 13, P.glow ? CRIMSON : SWING, 3);
  }

  // the long scarlet cloak, behind everything
  cape(d, s, { mat: RD, z: 2, len: 40, topU: 20.6, topBack: 6.6, topFront: 2.4, spread: 9, wind: P.wind ?? 0.08, wave: P.wave ?? 0 });

  // far leg in plate
  leg(d, s, 'F', legCfg(10, -1));
  tasset(d, s, 'F', 11, -1);

  // far pauldron and arm behind the body; with both hands on the grip only its gauntlet comes round it
  const far = farArm(s, ang, two);
  pauldron(d, s, 'F', 19.4, -1);
  d.capsule({ mat: PL, z: 20, group: 'armF', shade: -1 }, s.sF, far.e, 3.4, 3.0);
  d.capsule({ mat: PL, z: 20.1, group: 'armF', shade: -1 }, far.e, far.h, 3.0, 2.7);
  d.circle({ mat: PL, z: 20.15, group: 'armF', shade: -1 }, far.e, 2.8);

  // torso: a breastplate blackened and edged in silver, a fauld of lames, a sword belt
  const torso = torsoPts(s, [
    [0, 6.6, 6.8],
    [4, 6.8, 7.4],
    [9, 7.4, 8.6],
    [14, 7.9, 9.4],
    [17.6, 8.0, 8.8],
    [20.2, 6.4, 5.8],
    [21.8, 3.6, 3.0],
  ]);
  d.poly({ mat: PL, z: 30, group: 'cuirass' }, torso, { kind: 'cyl', a: s.T(0, 1.2), b: s.T(21.8, 1.2), r: 9.2, bevel: 1.6 });
  // the keel catches the light; silver edges at the arm-hole and the waist
  d.line({ mat: PL, z: 30.1, group: 'cuirass', line: 'none' }, s.T(8.6, 6.8), s.T(17.0, 8.4), PL.ramp[5]);
  d.ribbon({ mat: SV, z: 30.2, group: 'cuirass', line: 'none' }, [s.T(19.8, 5.6), s.T(17.6, 2.0), s.T(14.8, 1.0)], [0.55, 0.55, 0.55]);
  for (const [u0, u1, k] of [[4.2, 6.4, 0], [2.4, 4.6, 1]] as const) {
    d.poly(
      { mat: PL, z: 31 + k * 0.01, group: 'fauld' + k, line: 'soft' },
      [s.T(u1, -7.0), s.T(u1, 7.6), s.T(u0, 7.8), s.T(u0, -6.9)],
      { kind: 'cyl', a: s.T(u0, 1), b: s.T(u1, 1), r: 7.8, bevel: 1 },
    );
    d.line({ mat: SV, z: 31.05 + k * 0.01, group: 'fauld' + k, line: 'none' }, s.T(u0 + 0.2, -6.4), s.T(u0 + 0.2, 7.4), SV.ramp[3]);
  }
  d.poly({ mat: DL, z: 32, group: 'belt' }, [s.T(7.4, -7.2), s.T(7.6, 8.0), s.T(6.0, 7.9), s.T(5.8, -7.0)], { kind: 'cyl', a: s.T(5.8, 0), b: s.T(7.6, 0), r: 7.8 });
  d.poly({ mat: SV, z: 32.1, group: 'buckle' }, [s.T(7.9, 5.4), s.T(7.9, 8.2), s.T(5.6, 8.2), s.T(5.6, 5.4)], { kind: 'bevel', w: 1 });

  head(d, s, P);

  // near leg in plate
  leg(d, s, 'N', legCfg(50, 0));
  tasset(d, s, 'N', 52, 0);

  // the zweihander, the far gauntlet round its grip, the near arm over it, the near pauldron
  zweihander(d, s.hN, ang, 56, (P.glow ?? 0) >= 0.5);
  if (two) d.ellipse({ mat: PL, z: 57, group: 'handF', shade: -1 }, far.h, 2.6, 2.3, ang);
  nearArm(d, s, 60);
  pauldron(d, s, 'N', 62, 0);
}

const legCfg = (z: number, shade: number) => ({
  thigh: PL, shin: PL, foot: PL, knee: PL, kneeR: 3.4, rThigh: [4.6, 3.8] as [number, number], rShin: [3.5, 2.8] as [number, number], z, shade, footStyle: 'sabaton' as const,
  // greaves: a lit ridge down the shin
  shinTex: (h: { v: number }) => (Math.abs(h.v + 0.25) < 0.12 ? 1 : 0),
});

/** The far arm: with both hands on the grip the gauntlet is where the grip runs (`LOWER` below the near hand), solved so it stays there through every blend. */
function farArm(s: Skel, ang: number, two: boolean): { e: V; h: V } {
  if (!two) return { e: s.eF, h: s.hF };
  const r = ik2(s.sF, at(s.hN, ang, -LOWER), D.upperArm, D.foreArm, (s.pose.p.bendF ?? -1) as number);
  return { e: r.mid, h: r.end };
}

/** The near arm in plate: a rerebrace, a couter at the elbow, a vambrace, a gauntlet round the grip. */
function nearArm(d: Draw, s: Skel, z: number) {
  d.capsule({ mat: PL, z, group: 'armN' }, s.sN, s.eN, 3.5, 3.1);
  d.capsule({ mat: PL, z: z + 0.1, group: 'armN' }, s.eN, s.hN, 3.1, 2.8);
  d.circle({ mat: PL, z: z + 0.15, group: 'armN', line: 'soft' }, s.eN, 2.9);
  d.capsule({ mat: PL, z: z + 0.2, group: 'armN' }, at(s.hN, s.loN, -4.8), at(s.hN, s.loN, -1.6), 3.1, 3.6, 0.3);
  d.ellipse({ mat: PL, z: z + 0.3, group: 'handN' }, s.hN, 2.8, 2.5, s.loN);
}

/** A big pauldron: three lames over the shoulder, the lowest edged in silver. */
function pauldron(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  const g = 'paul' + side;
  const top = at(at(sh, up, 0.5), s.torso, 1.8);
  const lames: [number, number, number][] = [[0, 6.0, 4.6], [2.6, 5.5, 3.8], [4.9, 4.9, 3.1]];
  lames.forEach(([o, rx, ry], i) => d.ellipse({ mat: PL, z: z - i * 0.01, group: g + i, shade, line: 'soft' }, at(top, up, o), rx, ry, up + 90, 0.15));
  const rim = at(top, up, 7.4);
  d.capsule({ mat: SV, z: z - 0.025, group: g + '2', shade, line: 'none' }, at(rim, up + 90, 3.8), at(rim, up - 90, 3.8), 0.55, 0.55);
}

/** Tassets over each thigh: two lames hanging from the fauld. */
function tasset(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.3;
  for (const [u0, u1, w0, w1, k] of [[-1.6, 5.2, 5.0, 5.4, 0], [4.0, 9.6, 5.4, 5.8, 1]] as const) {
    const a = at(hip, hang, u0), b = at(hip, hang, u1);
    d.poly(
      { mat: PL, z: z + k * 0.02, group: 'tas' + side + k, shade, line: 'soft' },
      [at(a, hang + 90, w0), at(b, hang + 90, w1), at(b, hang - 90, w1 + 0.2), at(a, hang - 90, w0)],
      { kind: 'cyl', a, b, r: w1 + 0.4, bevel: 1 },
    );
  }
  const hem = at(hip, hang, 9.8);
  d.capsule({ mat: SV, z: z + 0.05, group: 'tas' + side + '1', shade, line: 'none' }, at(hem, hang + 90, 5.6), at(hem, hang - 90, 5.8), 0.5, 0.5);
}

/**
 * The zweihander: a long silver blade with a fuller and a little engraving
 * at its root, the ricasso wrapped in red leather between two parrying lugs,
 * a cross-guard with scrolled ends, a long grip of dark leather and a heavy
 * pommel. In Crimson Blade (`glow`) the blade burns crimson.
 */
function zweihander(d: Draw, hand: V, ang: number, z: number, glow: boolean) {
  const f = d.frame(hand, ang);
  const g = 'sword';
  // grip and pommel
  d.capsule({ mat: DL, z, group: g, tex: (h) => (Math.floor(h.u * 9) % 2 ? 1 : 0) }, f(-10.6, 0), f(2.4, 0), 1.35, 1.35);
  d.ellipse({ mat: SV, z: z + 0.05, group: g }, f(-12.4, 0), 2.3, 1.9, ang);
  d.pixels({ mat: SV, z: z + 0.06, group: g }, [{ p: f(-12.4, 0), c: GR.ramp[3] }]);
  // the ricasso: an unsharpened base wrapped in red leather, the parrying lugs at its end
  const W = 1.85;
  d.poly({ mat: SV, z: z + 0.1, group: g }, [f(3.0, -W * 0.9), f(3.0 + RICASSO, -W * 0.9), f(3.0 + RICASSO, W * 0.9), f(3.0, W * 0.9)], { kind: 'cyl', a: f(3, 0), b: f(3 + RICASSO, 0), r: W + 0.4 });
  d.capsule({ mat: RD, z: z + 0.12, group: g, tex: (h) => (Math.floor(h.u * 6) % 2 ? -1 : 0) }, f(3.4, 0), f(2.6 + RICASSO, 0), 1.25, 1.25);
  for (const side of [-1, 1]) d.poly({ mat: SV, z: z + 0.14, group: g }, [f(3 + RICASSO, side * W * 0.9), f(4.4 + RICASSO, side * (W + 2.6)), f(5.2 + RICASSO, side * (W + 2.2)), f(4.8 + RICASSO, side * W * 0.9)], { kind: 'bevel', w: 0.8 });
  // the blade proper, burning crimson in Crimson Blade
  const b0 = 4.6 + RICASSO;
  const bladeMat = glow ? GR : SV;
  d.poly(
    { mat: bladeMat, z: z + 0.1, group: glow ? 'swordglow' : g },
    [f(b0, -W), f(TIP - 7, -W * 0.86), f(TIP, 0), f(TIP - 7, W * 0.86), f(b0, W)],
    { kind: 'cyl', a: f(b0, 0), b: f(TIP, 0), r: W + 0.6 },
  );
  if (!glow) {
    // the fuller down two thirds of the blade, and the engraving at its root
    d.line({ mat: SV, z: z + 0.12, group: g, line: 'none' }, f(b0 + 1, 0), f(TIP * 0.7, 0), SV.ramp[2]);
    const eng: { p: V; c: RGBA }[] = [];
    for (let k = 0; k < 5; k++) eng.push({ p: f(b0 + 1.5 + k * 1.4, k % 2 ? 0.9 : -0.9), c: GD.ramp[4] });
    d.pixels({ mat: SV, z: z + 0.13, group: g }, eng);
  } else {
    d.line({ mat: GR, z: z + 0.12, group: 'swordglow', line: 'none' }, f(b0 + 1, 0), f(TIP - 3, 0), GR.ramp[5]);
  }
  // the cross-guard, its ends scrolled toward the blade
  d.ribbon({ mat: SV, z: z + 0.2, group: g }, [f(1.8, -6.6), f(2.6, -5.2), f(2.4, -2.6), f(2.2, 0), f(2.4, 2.6), f(2.6, 5.2), f(1.8, 6.6)], [1.0, 1.15, 1.3, 1.4, 1.3, 1.15, 1.0]);
  for (const side of [-1, 1]) d.circle({ mat: SV, z: z + 0.21, group: g }, f(3.4, side * 7.0), 1.15);
  d.pixels({ mat: SV, z: z + 0.22, group: g }, [{ p: f(2.2, 0), c: GR.ramp[3] }]);
}

/** The line of a thrust: two streaks running back from the point, above and below the blade. */
function thrustStreak(d: Draw, from: V, to: V, ang: number, z: number) {
  const o = { mat: SV, z, outline: false, line: 'none' as const, noClean: true };
  const back = Math.max(14, Math.hypot(to.x - from.x, to.y - from.y) * 1.3);
  for (const [w, k] of [[3.8, 1], [-3.6, 0.8]] as const) {
    const a = at(at(to, ang + 90, w), ang, -2), b = at(a, ang, -back * k);
    d.ribbon({ ...o, group: 'streak', color: SWING.edge }, [b, a], [0.3, 1.2]);
    d.line({ ...o, z: z + 0.01, group: 'streak' }, lerpV(a, b, 0.5), a, SWING.core);
  }
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.6, 3.4);
  // the gorget, blackened and edged in silver
  d.capsule({ mat: PL, z: 37.7, group: 'gorget' }, s.T(20.6, -5.0), s.T(21.6, 3.6), 3.0, 2.8);
  d.capsule({ mat: SV, z: 37.75, group: 'gorget', line: 'none' }, s.T(22.4, -4.2), s.T(23.0, 2.8), 0.5, 0.5);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: 'angry', mouth: P.shout ? 'shout' : 'line', lip: SK.ramp[1], rx: 5.9, ry: 6.4 });
  // the bald crown catches the light; the ear's fold; a thin moustache and a pointed goatee under the chin
  d.pixels({ mat: SK, z: 38.35, group: 'head' }, [
    { p: H(-2.2, 5.6), c: SK.ramp[5] }, { p: H(-1.2, 6.0), c: SK.ramp[5] }, { p: H(-3.2, 5.0), c: SK.ramp[4] }, { p: H(-0.2, 6.0), c: SK.ramp[4] },
    { p: H(-1.4, -0.2), c: SK.ramp[1] }, { p: H(-1.2, -1.4), c: SK.ramp[2] }, { p: H(-2.4, -0.8), c: SK.ramp[2] },
  ]);
  d.pixels({ mat: HR, z: 38.6, group: 'beard' }, [{ p: H(4.6, -2.8), c: HR.ramp[2] }, { p: H(5.4, -2.7), c: HR.ramp[3] }, { p: H(6.2, -2.9), c: HR.ramp[2] }]);
  d.poly(
    { mat: HR, z: 38.5, group: 'beard', line: 'soft' },
    [H(4.2, -5.0), H(5.6, -4.8), H(6.6, -5.4), H(6.6, -6.8), H(5.8, -8.8), H(5.0, -9.4), H(4.4, -8.0), H(3.8, -6.2)],
    { kind: 'dome', c: H(5.2, -6.4), r: 4, bevel: 0.5 },
  );
  // a pale old scar through the brow
  d.pixels({ mat: SK, z: 38.4, group: 'head' }, [{ p: H(3.0, 2.8), c: SK.ramp[4] }, { p: H(3.4, 1.8), c: SK.ramp[4] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the sword's angle runs from the near hand to the tip: 0 forward, 90 up)
// ---------------------------------------------------------------------------

/** Both hands on the grip: the near hand under the guard at `hand`; the far hand is solved onto the grip in build(). */
const th = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, armF: { up: -90, lo: -60 }, ...extra, p: { swordAng: ang, two: 1, ...(extra.p ?? {}) } });

// At rest: the zweihander on his near shoulder, both hands on the grip before his chest.
const IDLE: Pose = th(v(13, 41), 146, {
  y: -1,
  torso: 86,
  head: 88,
  legN: { ik: v(-10, 3) },
  legF: { ik: v(10, 3) },
  p: { wind: 0.08 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 86 - b,
    armN: { ik: v(13, 41 - b), bend: -1 },
    p: { swordAng: 146 + b, wind: 0.06 + b * 0.05, wave: a },
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
  return th(v(12 + sw, 40 + bob), 150 + sw * 3, {
    y: bob - 2,
    torso: 74,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    p: { wind: 0.85, wave: a * 2 },
  });
}

// Cleave: from the shoulder the sword goes up and back, comes over the top and down through the target.
const CL_WIND = th(v(-1, 66), 158, { x: -3, y: -2, torso: 98, head: 92, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, p: { wind: 0.3, wave: 1 } });
const CL_OVER = th(v(9, 64), 74, { x: 3, y: -2, torso: 84, head: 84, legN: { ik: v(-11, 3) }, legF: { ik: v(12, 3) }, p: { shout: 1, wind: 0.5, wave: 1.6 } });
const CL_CUT = th(v(19, 30), -40, { x: 8, y: -5, torso: 64, head: 74, legN: { ik: v(-10, 3) }, legF: { ik: v(16, 3) }, p: { shout: 1, wind: 0.8, wave: 2.4 } });
const CL_FOLLOW = th(v(19, 28), -52, { x: 9, y: -5, torso: 62, head: 72, legN: { ik: v(-10, 3) }, legF: { ik: v(16, 3) }, p: { wind: 0.6, wave: 3 } });

// Crimson Blade: the sword drawn back low behind him, the blade burning crimson, then a rising cut through the enemy.
const CB_DRAW = th(v(-6, 34), -168, { x: -4, y: -4, torso: 80, head: 84, legN: { ik: v(-13, 3) }, legF: { ik: v(9, 3) }, p: { wind: 0.3, wave: 1, glow: 1 } });
const CB_LOW = th(v(2, 30), -120, { x: 0, y: -5, torso: 74, head: 80, legN: { ik: v(-12, 3) }, legF: { ik: v(12, 3) }, p: { wind: 0.5, wave: 1.6, glow: 1 } });
const CB_CUT = th(v(17, 56), 38, { x: 8, y: -3, torso: 80, head: 84, legN: { ik: v(-10, 3) }, legF: { ik: v(16, 3) }, p: { shout: 1, wind: 0.9, wave: 2.4, glow: 1, sweep: -140 } });
const CB_FOLLOW = th(v(14, 64), 74, { x: 8, y: -2, torso: 86, head: 88, legN: { ik: v(-10, 3) }, legF: { ik: v(16, 3) }, p: { wind: 0.6, wave: 3, glow: 1 } });

// Onrush: the point drawn back at his hip, a lunge driving it through the enemy, then the sword raised high to send the line on.
const OR_CHAMBER = th(v(-2, 38), 6, { x: -5, y: -4, torso: 80, head: 84, legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, p: { wind: 0.4, wave: 1 } });
const OR_THRUST = th(v(24, 41), -2, { x: 9, y: -6, torso: 66, head: 76, legN: { ik: v(-15, 3) }, legF: { ik: v(17, 3) }, p: { shout: 1, wind: 1.0, wave: 2, thrust: 1 } });
const OR_HOLD = th(v(23, 41), -4, { x: 9, y: -6, torso: 66, head: 76, legN: { ik: v(-15, 3) }, legF: { ik: v(17, 3) }, p: { wind: 0.8, wave: 2.6 } });
const OR_RAISE = th(v(6, 72), 92, { x: 4, y: -1, torso: 92, head: 100, legN: { ik: v(-11, 3) }, legF: { ik: v(13, 3) }, p: { shout: 1, wind: 0.7, wave: 3.4 } });

const HURT = th(v(10, 38), 124, {
  x: -4, y: -1, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  p: { wind: 0.5, wave: 1 },
});
const DEATH_KNEEL = th(v(12, 36), -86, {
  x: 0, y: -13, torso: 76, head: 60,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  p: { wind: 0.2, wave: 1 },
});
const DEATH_FALL = pose({
  x: 2, y: -21, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { swordAng: -20, two: 0, wind: 0.6, wave: 2 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { swordAng: 4, two: 0, wind: 0.2, wave: 3 },
});

// Victory: the zweihander planted point down before him, both hands on the pommel, the cloak stirring.
const PLANT = th(v(13, 41), -90, { y: -1, torso: 88, head: 92, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, p: { wind: 0.15, wave: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const waved = (p: Pose, w: number, wind?: number) => tweak(p, { p: { wave: w, ...(wind !== undefined ? { wind } : {}) } });

const char: CharDef = {
  id: 'red_cloak',
  name: 'Red Cloak',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 160, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CL_WIND, 2, 80),
        ...keys([
          [CL_WIND, 200],
          [CL_OVER, 45],
          [CL_CUT, 70, { smear: true, hit: true }],
          [CL_FOLLOW, 220],
        ]),
        ...tween(D, CL_FOLLOW, IDLE, 3, 110, ease.inOut),
      ],
    },
    attack2: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CB_DRAW, 2, 90),
        ...keys([
          [CB_DRAW, 230],
          [waved(CB_DRAW, 1.4), 120],
          [CB_LOW, 45],
          [CB_CUT, 70, { smear: true, hit: true }],
          [CB_FOLLOW, 220],
          [tweak(CB_FOLLOW, { p: { glow: 0 } }), 120],
        ]),
        ...tween(D, tweak(CB_FOLLOW, { p: { glow: 0 } }), IDLE, 3, 110, ease.inOut),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...tween(D, IDLE, OR_CHAMBER, 2, 80),
        ...keys([
          [OR_CHAMBER, 200],
          [mid(OR_CHAMBER, OR_THRUST, 0.5), 45],
          [OR_THRUST, 70, { smear: true, hit: true }],
          [OR_HOLD, 200],
          [mid(OR_HOLD, OR_RAISE, 0.5), 90],
          [OR_RAISE, 140, { event: 'cast' }],
          [waved(OR_RAISE, 4.2, 0.55), 200],
          [waved(OR_RAISE, 5.0, 0.4), 200],
        ]),
        ...tween(D, OR_RAISE, IDLE, 3, 120, ease.inOut),
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
          [waved(PLANT, 1.6, 0.25), 240],
          [waved(PLANT, 2.4, 0.3), 240],
          [waved(PLANT, 3.2, 0.25), 300],
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

/** The zweihander in an icon, scaled up for 40x40: the long blade, the red ricasso and its lugs, the scrolled guard, the grip and the pommel. */
function iconSword(d: Draw, hand: V, ang: number, z: number, tip: number, glow = false) {
  const f = d.frame(hand, ang);
  const g = 'isword' + z;
  d.capsule({ mat: DL, z, group: g, tex: (h) => (Math.floor(h.u * 7) % 2 ? 1 : 0) }, f(-9, 0), f(3, 0), 1.9, 1.9);
  d.ellipse({ mat: SV, z: z + 0.05, group: g }, f(-10.8, 0), 3.0, 2.5, ang);
  d.poly({ mat: SV, z: z + 0.1, group: g }, [f(4, -2.4), f(10, -2.4), f(10, 2.4), f(4, 2.4)], { kind: 'cyl', a: f(4, 0), b: f(10, 0), r: 3 });
  d.capsule({ mat: RD, z: z + 0.12, group: g }, f(4.4, 0), f(9.6, 0), 1.7, 1.7);
  for (const side of [-1, 1]) d.poly({ mat: SV, z: z + 0.14, group: g }, [f(10, side * 2.2), f(11.6, side * 5.2), f(12.6, side * 4.6), f(12, side * 2.2)], { kind: 'bevel', w: 1 });
  d.poly({ mat: glow ? GR : SV, z: z + 0.1, group: g + 'b' }, [f(12, -2.8), f(tip - 6, -2.4), f(tip, 0), f(tip - 6, 2.4), f(12, 2.8)], { kind: 'cyl', a: f(12, 0), b: f(tip, 0), r: 3.4 });
  if (!glow) d.line({ mat: SV, z: z + 0.12, group: g + 'b', line: 'none' }, f(13, 0), f(tip * 0.72, 0), SV.ramp[2]);
  d.ribbon({ mat: SV, z: z + 0.2, group: g }, [f(2.6, -8.4), f(3.6, -6.6), f(3.4, -3.2), f(3.2, 0), f(3.4, 3.2), f(3.6, 6.6), f(2.6, 8.4)], [1.4, 1.6, 1.8, 1.9, 1.8, 1.6, 1.4]);
}

const E = ACCENT;

export const redCloak: ChampionArt = {
  char,
  iconBg: RD,
  icons: {
    cleave: () =>
      compose(RD, glyph((d) => {
        // the zweihander at the end of its cut, the streak of it behind
        smear(d, v(8, 32), 160, -40, 29, 8, SWING, 1);
        iconSword(d, v(7, 32), -44, 10, 42);
      }), (b) => {
        impactStar(b, 31, 31, 2, 9, 10, SV.ramp[4], E.white);
      }),
    crimson_blade: () =>
      compose(RD, glyph((d) => {
        // the blade burning crimson through its rising cut
        smear(d, v(9, 6), -150, 50, 30, 8, CRIMSON, 1);
        iconSword(d, v(7, 6), 48, 10, 42, true);
      }), (b) => {
        // embers falling off the cut (screen space, y down)
        for (const [x, y, c] of [[30, 8, E.redHot], [33, 13, E.red], [26, 5, E.red], [35, 6, E.redHot], [29, 15, FXR.fire[2]], [22, 9, FXR.fire[1]]] as const) b.set(x, y, c);
      }),
    onrush: () =>
      compose(RD, glyph((d) => {
        // the point driven forward
        iconSword(d, v(4, 15), 8, 10, 42);
      }), (b) => {
        // the rush of the charge behind it, and the speed it lends the line: two gold chevrons
        speedLines(b, [[3, 15, 14, 15], [2, 19, 11, 19], [4, 31, 15, 31]], E.white);
        for (const [cx, cy] of [[14, 8], [22, 8]] as const) {
          for (let k = -3; k <= 3; k++) {
            b.set(cx + 3 - Math.abs(k), cy + k, Math.abs(k) < 2 ? E.goldHot : E.chiGold);
            b.set(cx + 2 - Math.abs(k), cy + k, FXR.gold[1]);
          }
        }
      }),
  },
};


