// Nefret, the Sun Priestess — Sunscar support. Gold crown of horns cradling a
// sun disc, black bob with gold bands, kohl-lined eyes, white linen sheath
// dress, turquoise collar and feathered wing-sleeves that open when she casts.
// Signature color: sun gold. Silhouette: the horned sun crown and the wings.
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { C, compose, glyph, sunDisc } from '../icons.ts';
import { ACCENT, Material, MAT } from '../palette.ts';
import { ellipseRing, line } from '../paint.ts';
import { foldTex, torsoPts } from '../parts.ts';
import { withAlpha } from '../raster.ts';
import { at, D2R, dir, Dims, Draw, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 34,
  thigh: 16,
  shin: 16,
  ankleH: 3,
  footLen: 5.5,
  spine: 20,
  neck: 7.4,
  upperArm: 12,
  foreArm: 11,
  shoulderDrop: 3.6,
  shoulderN: -2.4,
  shoulderF: 2.8,
  hipN: -1.4,
  hipF: 1.4,
};

const SK = MAT.skinTan, LN = MAT.linen, GD = MAT.gold, TQ = MAT.turquoise, LP = MAT.lapis, HR = MAT.hairDark, GG = MAT.glowGold, RD = MAT.red;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const wave = P.wave ?? 0;
  void info;

  hairBack(d, s);
  wing(d, s, 'F', 4, -1, P.spread ?? 0);

  // sandals peeking under the dress
  for (const [side, z, shade] of [['F', 11, -1], ['N', 12, 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF;
    const fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: SK, z, group: 'foot' + side, shade }, [f(-2.4, 1.8), f(-2.8, -1), f(-2.2, -3), f(5.6, -3), f(7.4, -1.4), f(3.6, 0), f(1, 1.8)], { kind: 'bevel', w: 1.4 });
    d.line({ mat: SK, z: z + 0.1, group: 'foot' + side, line: 'none' }, f(-1, -2.4), f(5.6, -2.4), GD.ramp[3]);
  }

  dress(d, s, wave);

  arm(d, s, 'F', 20, -1);

  // bodice
  const torso = torsoPts(s, [
    [0, 5.0, 5.2],
    [4, 4.6, 5.2],
    [8.5, 5.0, 6.4],
    [12.5, 5.6, 7.0],
    [16, 5.8, 5.8],
    [18.5, 4.4, 3.6],
    [20, 2.6, 2.1],
  ]);
  d.poly({ mat: LN, z: 30, group: 'body', tex: foldTex(7, 0.4, 0.7) }, torso, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(20, 0.6), r: 6.4, bevel: 1.3 });
  collar(d, s, 31);
  // gold belt with a long red sash falling in front
  d.poly({ mat: GD, z: 33, group: 'body' }, [s.T(2.8, -5.2), s.T(3.0, 5.7), s.T(0.8, 5.5), s.T(0.6, -5.0)], { kind: 'cyl', a: s.T(0, 0), b: s.T(3, 0), r: 5.6 });
  const k = s.T(1.6, 5.0);
  d.ribbon({ mat: RD, z: 33.1, group: 'sash' }, [k, at(k, -96 + Math.sin(wave) * 4, 10), at(k, -92 + Math.sin(wave + 1) * 6, 20)], [1.6, 1.5, 1.2], 0.35);

  head(d, s, P);

  staff(d, s.hN, P.staffAng ?? 92, 55, P.glow ?? 0);
  wing(d, s, 'N', 58, 0, P.spread ?? 0);
  arm(d, s, 'N', 60, 0);
}

function arm(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const el = side === 'N' ? s.eN : s.eF;
  const ha = side === 'N' ? s.hN : s.hF;
  const up = side === 'N' ? s.upN : s.upF;
  const lo = side === 'N' ? s.loN : s.loF;
  const g = 'arm' + side;
  d.capsule({ mat: SK, z, group: g, shade }, sh, el, 2.9, 2.5);
  d.capsule({ mat: SK, z: z + 0.1, group: g, shade }, el, ha, 2.5, 2.2);
  d.capsule({ mat: GD, z: z + 0.2, group: g, shade, line: 'none' }, at(sh, up, 5.4), at(sh, up, 6.8), 3.0, 2.9, 0.3);
  d.capsule({ mat: GD, z: z + 0.2, group: g, shade, line: 'none' }, at(ha, lo, -3.6), at(ha, lo, -2.2), 2.6, 2.6, 0.3);
  d.ellipse({ mat: SK, z: z + 0.3, group: g, shade }, at(ha, lo, 0.6), 2.3, 2.0, lo);
}

/**
 * Feathered wing-sleeve hanging from the arm on its lower side: lapis coverts,
 * turquoise middle row, long linen primaries tipped with gold. `spread` (0..1)
 * lengthens the feathers when the arms open.
 */
function wing(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number, spread: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const el = side === 'N' ? s.eN : s.eF;
  const ha = side === 'N' ? s.hN : s.hF;
  const up = side === 'N' ? s.upN : s.upF;
  // the side of the arm that faces the ground (ties go backward)
  const cand = [up - 90, up + 90];
  const score = (a: number) => Math.sin(a * D2R) + Math.cos(a * D2R) * 0.25;
  const wd = score(cand[0]) <= score(cand[1]) ? cand[0] : cand[1];
  const edge = [at(sh, up, 2), el, at(ha, s.loN, -1)];
  const rows: [Material, number, number][] = [
    [LP, 4.5, 0.2],
    [TQ, 8 + spread * 3, 0.1],
    [LN, 13 + spread * 9, 0],
  ];
  rows.forEach(([mat, len, z0], ri) => {
    const pts: V[] = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const base = t < 0.5 ? lerpV(edge[0], edge[1], t * 2) : lerpV(edge[1], edge[2], (t - 0.5) * 2);
      // feathers lengthen toward the wrist; alternate tips give the scalloped edge
      const l = len * (0.55 + t * 0.6) * (i % 2 ? 0.86 : 1);
      pts.push(at(base, wd - (t - 0.5) * 18, l));
    }
    const top = [...edge].reverse();
    d.poly({ mat, z: z + z0 + ri * 0.01, group: 'wing' + side, shade, tex: ri === 2 ? (h, x, y) => ((x + y) % 3 === 0 ? -1 : 0) : undefined }, [...pts, ...top], { kind: 'bevel', w: 1.6 });
    if (ri === 2) {
      // gold tips on the primaries
      const tips = pts.filter((_, i) => i % 2 === 0);
      d.pixels({ mat, z: z + 0.3, group: 'wing' + side, shade }, tips.map((p) => ({ p, c: GD.ramp[4] })));
    }
  });
}

function dress(d: Draw, s: Skel, wave: number) {
  const back = s.ankN.x < s.ankF.x ? s.ankN : s.ankF;
  const front = back === s.ankN ? s.ankF : s.ankN;
  const kneeF = Math.max(s.kneeN.x, s.kneeF.x);
  const kneeB = Math.min(s.kneeN.x, s.kneeF.x);
  const waistB = s.T(1.6, -5.0), waistF = s.T(1.6, 5.4);
  const hemB = v(Math.min(back.x - 5, waistB.x - 3), Math.max(1.4, back.y - 1.4));
  const hemF = v(Math.max(front.x + 3.2, waistF.x + 2), Math.max(1.4, front.y - 1.4));
  const midF = v(Math.max(kneeF + 2.8, waistF.x + 0.8), lerpV(waistF, hemF, 0.5).y);
  const midB = v(Math.min(kneeB - 3.4, waistB.x - 1.8), lerpV(waistB, hemB, 0.5).y);
  const hem: V[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = lerpV(hemF, hemB, t);
    hem.push(v(p.x, p.y + Math.sin(wave + t * 9) * 0.7));
  }
  const axisA = lerpV(waistB, waistF, 0.5), axisB = lerpV(hemB, hemF, 0.5);
  d.poly({ mat: LN, z: 15, group: 'dress', tex: foldTex(10, wave * 0.6, 0.66) }, [waistB, waistF, midF, ...hem, midB], { kind: 'cyl', a: axisA, b: axisB, r: Math.max(6, (hemF.x - hemB.x) / 2), bevel: 1.2 });
  d.ribbon({ mat: GD, z: 15.2, group: 'dress', line: 'none' }, hem.map((p) => v(p.x, p.y + 0.8)), hem.map(() => 0.9));
  d.ribbon({ mat: LP, z: 15.15, group: 'dress', line: 'none' }, hem.map((p) => v(p.x, p.y + 2.2)), hem.map(() => 0.7));
}

function collar(d: Draw, s: Skel, z: number) {
  const bands: [Material, number][] = [
    [GD, 3.8],
    [TQ, 5.0],
    [LP, 6.1],
    [GD, 7.1],
  ];
  for (const [mat, r] of bands) {
    const pts: V[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = (200 + (i / 8) * 150) * D2R;
      pts.push(s.T(19.2 + Math.sin(a) * r * 0.85, Math.cos(a) * r + 0.8));
    }
    d.ribbon({ mat, z: z + r * 0.01, group: 'collar', line: 'none' }, pts, pts.map(() => 0.85));
  }
}

function hairBack(d: Draw, s: Skel) {
  const H = s.H;
  // the back half of the bob, falling straight to the jaw line
  d.poly({ mat: HR, z: 3, group: 'hairback' }, [H(-0.5, 7.2), H(-6.8, 4.6), H(-7.6, -1), H(-7, -6.2), H(-2, -6.6), H(-1, -2)], { kind: 'dome', c: H(-4, 0), r: 9, bevel: 1.2 });
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  const ha = s.headDir - 90;
  d.capsule({ mat: SK, z: 37.5, group: 'head' }, s.neck, H(0, -4), 2.4, 2.2);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: 'calm', eye: ACCENT.kohl, ear: 'none', mouth: 'line', lip: ACCENT.lipRose, rx: 5.9, ry: 6.5 });
  // kohl liner sweeping back from the eye + lapis eye shadow
  d.pixels({ mat: SK, z: 38.5, group: 'head' }, [
    { p: H(2.6, 0.2), c: ACCENT.kohl },
    { p: H(1.8, -0.2), c: ACCENT.kohl },
    { p: H(3.6, 1.6), c: LP.ramp[3] },
  ]);
  // bob: crown + blunt fringe + side lock to the jaw with gold bands
  d.poly(
    { mat: HR, z: 38.8, group: 'head', tex: (h, x, y) => ((x + y * 3) % 5 === 0 ? 1 : 0) },
    [H(6.2, 3.4), H(5.8, 5.2), H(2.4, 7.6), H(-3, 7.6), H(-7, 4.4), H(-7.4, -1), H(-5.6, -6.6), H(-2.6, -6.8), H(-1.4, -2.6), H(0.8, 1.6), H(1.6, 3.4)],
    { kind: 'dome', c: H(-1, 3), r: 9, bevel: 1.2 },
  );
  d.capsule({ mat: GD, z: 39, group: 'head', line: 'none' }, H(-4.8, -4.6), H(-2.2, -4.8), 0.9, 0.9);
  // crown: circlet, lyre horns and the sun disc between them
  d.capsule({ mat: GD, z: 39.2, group: 'crown' }, H(-6.6, 4.6), H(5.6, 5.2), 1.0, 1.0);
  const glow = P.glow ?? 0;
  d.circle({ mat: GG, z: 39.3, group: 'disc', shade: Math.round(glow) }, H(-0.6, 13.6), 4.6);
  d.circle({ mat: MAT.glowRed, z: 39.35, group: 'disc', shade: Math.round(glow), line: 'none' }, H(-0.6, 13.6), 1.8);
  for (const [sx, z] of [[-1, 39.4], [1, 39.25]] as const) {
    d.ribbon(
      { mat: GD, z, group: 'horn' + sx, shade: sx > 0 ? -1 : 0 },
      [H(-0.6 + sx * 2.2, 6.2), H(-0.6 + sx * 5.2, 9.2), H(-0.6 + sx * 6.0, 13.6), H(-0.6 + sx * 4.2, 18.4)],
      [1.4, 1.3, 1.0, 0.7],
    );
  }
  // uraeus cobra on the brow
  d.poly({ mat: GD, z: 39.5, group: 'crown' }, [H(4.4, 5.0), H(5.6, 8.2), H(6.8, 7.4), H(6.2, 5.2)], { kind: 'bevel', w: 1 });
  void ha;
}

/** Gold staff crowned by an ankh loop holding a small sun. */
function staff(d: Draw, hand: V, ang: number, z: number, glow: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: GD, z, group: 'staff', tex: (h) => (Math.floor(h.u * 18) % 6 === 0 ? -1 : 0) }, f(-30, 0), f(21, 0), 1.2, 1.25);
  d.capsule({ mat: GD, z: z + 0.1, group: 'staff' }, f(21, -4.2), f(21, 4.2), 1.1, 1.1);
  d.ellipse({ mat: GD, z: z + 0.1, group: 'staff' }, f(26.4, 0), 4.6, 3.4, ang);
  d.ellipse({ mat: GG, z: z + 0.15, group: 'staff', shade: Math.round(glow), line: 'none' }, f(26.4, 0), 2.6, 1.6, ang);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 89,
  head: 88,
  legN: { ik: v(-5, 3) },
  legF: { ik: v(6, 3) },
  armN: { up: -76, lo: 20 },
  armF: { up: -98, lo: -80 },
  p: { staffAng: 92, glow: 0, wave: 0, spread: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b,
    armN: { up: -76 + b * 2, lo: 20 + b * 2 },
    armF: { up: -98 + b * 2, lo: -80 + b * 3 },
    p: { staffAng: 92, glow: t < 0.5 ? 0 : 1, wave: a, spread: 0.05 + b * 0.05 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const ft = (ph: number) => {
    const s = Math.sin(ph);
    return { x: -9 * Math.cos(ph), y: 3 + (s > 0 ? 5 * s : 0), ang: s > 0 ? -20 * s : 0 };
  };
  const n = ft(a), f = ft(a + Math.PI);
  return pose({
    y: bob - 1,
    torso: 80,
    head: 86,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -56, lo: 12 },
    armF: { up: -130 + Math.cos(a) * 8, lo: -112 },
    p: { staffAng: 62, glow: 1, wave: a * 2 + 2, spread: 0.3 },
  });
}

// Solar Lance: the staff thrusts the sun at the target.
const SL_WIND = pose({
  x: -2, torso: 95, head: 92,
  legN: { ik: v(-8, 3) }, legF: { ik: v(6, 3) },
  armN: { up: -118, lo: -40 }, armF: { up: -70, lo: 0 },
  p: { staffAng: 126, glow: 1, wave: 1, spread: 0.2 },
});
const SL_THRUST = pose({
  x: 5, y: -2, torso: 72, head: 82,
  legN: { ik: v(-8, 3) }, legF: { ik: v(12, 3) },
  armN: { up: 6, lo: 8 }, armF: { up: -150, lo: -120 },
  p: { staffAng: 14, glow: 2, wave: 2, spread: 0.5 },
});

// Blessing of Dawn: arms rise, the wings open wide.
const BD_OPEN = pose({
  y: 2, torso: 94, head: 102,
  legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) },
  armN: { up: 142, lo: 160 }, armF: { up: 48, lo: 64 },
  p: { staffAng: 150, glow: 2, wave: 1.2, spread: 1 },
});

// Wrath of the Sun: staff high, then down at the enemy line.
const WS_RAISE = pose({
  y: 2, torso: 96, head: 104,
  legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) },
  armN: { up: 100, lo: 96 }, armF: { up: 76, lo: 84 },
  p: { staffAng: 94, glow: 2, wave: 1, spread: 0.8 },
});
const WS_POINT = pose({
  x: 4, y: -3, torso: 74, head: 80,
  legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -6, lo: -14 }, armF: { up: -40, lo: -10 },
  p: { staffAng: -18, glow: 2, wave: 2.4, spread: 0.6 },
});

const HURT = pose({
  x: -4, torso: 102, head: 108,
  legN: { ik: v(-7, 3) }, legF: { ik: v(5, 4) },
  armN: { up: -130, lo: -80 }, armF: { up: -40, lo: 20 },
  p: { staffAng: 118, glow: 0, wave: 2, spread: 0.4 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -14, torso: 74, head: 60,
  legN: { ik: v(-12, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -90, lo: -80 }, armF: { up: -80, lo: -70 },
  p: { staffAng: 70, glow: 0, wave: 1, spread: 0 },
});
const DEATH_FALL = pose({
  x: 1, y: -22, torso: 30, head: 14,
  legN: { up: -150, lo: -175 }, legF: { up: -120, lo: -170 },
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { staffAng: 30, glow: 0, wave: 1.6, spread: 0.2 },
});
const DEATH_DOWN = pose({
  x: 5, y: -28, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 },
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { staffAng: 6, glow: -1, wave: 2, spread: 0 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'priestess',
  name: 'Nefret',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 130, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, SL_WIND, 0.5), 80],
        [SL_WIND, 180],
        [mid(SL_WIND, SL_THRUST, 0.6), 50],
        [SL_THRUST, 80, { event: 'shoot', hit: true }],
        [tweak(SL_THRUST, { x: 6, torso: 70, p: { glow: 1, wave: 2.6 } }), 200],
        [mid(SL_THRUST, IDLE, 0.5), 100],
        [IDLE, 100],
      ]),
    },
    skill: {
      loop: false,
      frames: keys([
        [mid(IDLE, BD_OPEN, 0.35), 90],
        [mid(IDLE, BD_OPEN, 0.7), 90],
        [BD_OPEN, 140, { event: 'cast' }],
        [tweak(BD_OPEN, { y: 3, p: { wave: 1.6 } }), 120, { hit: true }],
        [tweak(BD_OPEN, { y: 3, p: { wave: 2.0, glow: 1 } }), 140],
        [tweak(BD_OPEN, { y: 2, p: { wave: 2.4 } }), 180],
        [mid(BD_OPEN, IDLE, 0.5), 110],
        [IDLE, 100],
      ]),
    },
    attack3: {
      loop: false,
      frames: keys([
        [mid(IDLE, WS_RAISE, 0.5), 90],
        [WS_RAISE, 130, { event: 'cast' }],
        [tweak(WS_RAISE, { y: 3, p: { wave: 1.4, spread: 1 } }), 130],
        [mid(WS_RAISE, WS_POINT, 0.5), 50],
        [WS_POINT, 90, { hit: true }],
        [tweak(WS_POINT, { x: 5, torso: 72, p: { wave: 3 } }), 240],
        [mid(WS_POINT, IDLE, 0.5), 110],
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
        [tweak(DEATH_DOWN, { y: -29 }), 600],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

export const priestess: ChampionArt = {
  char,
  iconBg: MAT.sand,
  icons: {
    solar_lance: () =>
      compose(MAT.sand, glyph((d) => {
        staff(d, v(8, 8), 45, 10, 1);
      }), (b) => {
        sunDisc(b, 30, 12, 5, 12, GG.ramp);
        for (let i = 0; i < 3; i++) line(b, 21 + i * 3, 21 - i * 3, 27 + i * 3, 15 - i * 3, i === 1 ? C.white : C.goldHot);
      }),
    dawn_blessing: () =>
      compose(MAT.sand, glyph((d) => {
        // two spread wings of turquoise, lapis and linen around a rising sun
        for (const sx of [-1, 1]) {
          for (const [mat, len, z] of [[LN, 15, 10], [TQ, 11, 10.1], [LP, 7, 10.2]] as const) {
            const pts: V[] = [];
            for (let i = 0; i <= 5; i++) {
              const t = i / 5;
              const base = v(20 + sx * (3 + t * 13), 22 + t * 6);
              pts.push(v(base.x + sx * 1.5, base.y - len * (0.55 + t * 0.45) * (i % 2 ? 0.85 : 1)));
            }
            d.poly({ mat, z, group: 'w' + sx }, [v(20 + sx * 2, 22), ...pts, v(20 + sx * 17, 29)], { kind: 'bevel', w: 1.6 });
          }
        }
      }), (b) => sunDisc(b, 20, 27, 5, 10, GG.ramp)),
    sun_wrath: () =>
      compose(MAT.sand, glyph((d) => {
        for (const [x, h] of [[9, 24], [20, 32], [31, 22]] as const) {
          d.poly({ mat: MAT.glowRed, z: 10, group: 'p' + x }, [v(x - 4.5, 2), v(x - 3, h * 0.6), v(x, h), v(x + 3, h * 0.6), v(x + 4.5, 2)], { kind: 'bevel', w: 2.4 });
          d.poly({ mat: GG, z: 10.1, group: 'p' + x, line: 'none' }, [v(x - 2.2, 3), v(x - 1.4, h * 0.5), v(x, h * 0.78), v(x + 1.4, h * 0.5), v(x + 2.2, 3)], { kind: 'bevel', w: 1.4 });
        }
      }), (b) => {
        ellipseRing(b, 20, 36, 18, 3, 1.4, () => withAlpha(C.goldHot, 200));
      }),
  },
};

void dir;
