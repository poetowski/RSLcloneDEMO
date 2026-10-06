// Imara, the Sunspear — Nyota bruiser, captain of the Spear Guard. A tall
// sculpted headwrap in magenta and gold, stacked gold neck rings and a beaded
// collar, an ebony breastplate engraved with gold chevrons, a magenta wrap
// skirt with a woven hem, an oval hard-light shield and a spear with a blade
// of hard light. Signature color: magenta + gold. Silhouette: the towering
// headwrap, the oval shield and the long spear.
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { C, compose, glyph, impactStar, speedLines, sunDisc } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { arm, leg, smear, torsoPts } from '../parts.ts';
import { at, D2R, Dims, Draw, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16.5,
  shin: 16.5,
  ankleH: 3,
  footLen: 6,
  spine: 20,
  neck: 11,
  upperArm: 12.5,
  foreArm: 11.5,
  shoulderDrop: 3.8,
  shoulderN: -2.6,
  shoulderF: 3.0,
  hipN: -1.5,
  hipF: 1.5,
};

const SK = MAT.skinDeep, EB = MAT.ebony, GD = MAT.gold, MG = MAT.magenta, TQ = MAT.turquoise, WH = MAT.linen, HL = MAT.glowCyan, HR = MAT.hairDark;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  // far leg and its skirt panel
  leg(d, s, 'F', {
    thigh: SK, shin: SK, foot: EB, rThigh: [4.2, 3.4], rShin: [3.1, 2.6], z: 10, shade: -1, footStyle: 'boot',
    boot: { mat: EB, from: 0.4, r: [3.3, 2.9] },
  });
  greave(d, s, 'F', 10.5, -1);
  skirtPanel(d, s, 'F', 11, -1);

  // far arm, then the shield it carries (in front of the body, behind the near arm)
  arm(d, s, 'F', { upper: SK, fore: SK, hand: SK, rUp: [3.1, 2.7], rLo: [2.8, 2.4], rHand: 2.5, z: 20, shade: -1 });
  armband(d, s, 'F', 20.5, -1);

  // torso: ebony breastplate with gold chevrons and a seam of hard light
  const torso = torsoPts(s, [
    [0, 5.8, 6.0],
    [4, 5.4, 6.2],
    [8.5, 5.8, 7.6],
    [13, 6.6, 8.6],
    [16.4, 6.8, 7.6],
    [18.6, 5.2, 4.6],
    [20, 2.8, 2.4],
  ]);
  d.poly({ mat: EB, z: 30, group: 'body' }, torso, { kind: 'cyl', a: s.T(0, 0.8), b: s.T(20, 0.8), r: 7.6, bevel: 1.4 });
  chevron(d, s, 12.6, 0.95, GD, 30.2, 0.8);
  chevron(d, s, 10.2, 0.8, HL, 30.25, 0.6);
  chevron(d, s, 7.8, 0.65, GD, 30.2, 0.7);
  // magenta sash at the waist with a gold edge
  d.poly({ mat: MG, z: 31, group: 'body' }, [s.T(4.0, -6.4), s.T(4.2, 7.0), s.T(0.4, 6.8), s.T(0.2, -6.2)], { kind: 'cyl', a: s.T(0, 0), b: s.T(4, 0), r: 7 });
  d.capsule({ mat: GD, z: 31.1, group: 'body', line: 'none' }, s.T(4.2, -6.2), s.T(4.4, 6.9), 0.6, 0.6);
  apron(d, s, 33, wave);

  collar(d, s, 34);
  head(d, s);

  // near leg
  leg(d, s, 'N', {
    thigh: SK, shin: SK, foot: EB, rThigh: [4.2, 3.4], rShin: [3.1, 2.6], z: 50, footStyle: 'boot',
    boot: { mat: EB, from: 0.4, r: [3.3, 2.9] },
  });
  greave(d, s, 'N', 50.5, 0);
  skirtPanel(d, s, 'N', 52, 0);

  shield(d, s, P.shieldAng ?? 92, 54);

  const ang = P.spearAng ?? 88;
  if (info.def.smear && info.prev) {
    smear(d, s.hN, info.prev.pose.p.spearAng ?? ang, ang, 42, 11, { core: ACCENT.white, edge: ACCENT.smearCyan }, 3);
  }
  if ((P.spear ?? 1) > 0) spear(d, s.hN, ang, 57, wave, P.glow ?? 0);
  arm(d, s, 'N', { upper: SK, fore: SK, hand: SK, rUp: [3.2, 2.8], rLo: [2.9, 2.5], rHand: 2.6, z: 60 });
  armband(d, s, 'N', 60.5, 0);
}

/** A chevron on the breastplate, pointing down the body. */
function chevron(d: Draw, s: Skel, u: number, k: number, mat: typeof GD, z: number, r: number) {
  d.ribbon({ mat, z, group: 'body', line: 'none' }, [s.T(u + 1.6 * k, -4.0 * k), s.T(u - 2.6 * k, 2.4), s.T(u + 1.6 * k, 7.4 * k)], [r, r + 0.1, r]);
}

function armband(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  for (const k of [4.6, 6.2]) {
    const c = at(sh, up, k);
    d.capsule({ mat: GD, z, group: 'arm' + side, shade, line: 'none' }, at(c, up + 90, -3.1), at(c, up + 90, 3.1), 0.65, 0.65);
  }
  // stacked bangles above the wrist
  const ha = side === 'N' ? s.hN : s.hF;
  const lo = side === 'N' ? s.loN : s.loF;
  for (const k of [-2.4, -3.9]) {
    const c = at(ha, lo, k);
    d.capsule({ mat: GD, z: z + 0.2, group: 'arm' + side, shade, line: 'none' }, at(c, lo + 90, -2.8), at(c, lo + 90, 2.8), 0.65, 0.65);
  }
}

/** Two gold rings around the top of the ebony greave. */
function greave(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const kn = side === 'N' ? s.kneeN : s.kneeF, an = side === 'N' ? s.ankN : s.ankF;
  const across = (side === 'N' ? s.shN : s.shF) + 90;
  for (const k of [0.42, 0.56]) {
    const c = lerpV(kn, an, k);
    d.capsule({ mat: GD, z, group: 'leg' + side, shade, line: 'none' }, at(c, across, -3.3), at(c, across, 3.3), 0.7, 0.7);
  }
}

/** Magenta wrap skirt panel over a thigh. */
function skirtPanel(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  d.capsule({ mat: MG, z, group: 'skirt' + side, shade, tex: (h) => (Math.sin(h.v * 8) > 0.55 ? -1 : 0) }, at(hip, th, -1.4), at(hip, th, 9.6), 5.4, 5.7, 0.4);
  // woven hem: turquoise and gold bands
  const across = th + 90;
  const hem = at(hip, th, 9.4), hem2 = at(hip, th, 7.6);
  d.capsule({ mat: GD, z: z + 0.1, group: 'skirt' + side, shade, line: 'none' }, at(hem, across, -5.3), at(hem, across, 5.3), 0.8, 0.8);
  d.capsule({ mat: TQ, z: z + 0.1, group: 'skirt' + side, shade, line: 'none' }, at(hem2, across, -5.1), at(hem2, across, 5.1), 0.6, 0.6);
}

/** Front apron between the legs with a kente-like woven band. */
function apron(d: Draw, s: Skel, z: number, wave: number) {
  const flapAng = Math.max(-120, Math.min(-60, (s.thN + s.thF) / 2)) + Math.sin(wave) * 2;
  const a0 = s.T(0.6, 0.4), a1 = s.T(0.6, 6.6);
  const a2 = at(a1, flapAng + 4, 14), a3 = at(a0, flapAng - 2, 14.5);
  d.poly({ mat: MG, z, group: 'apron', tex: (h) => (Math.abs(h.v) < 0.22 ? -1 : 0) }, [a0, a1, a2, a3], { kind: 'cyl', a: lerpV(a0, a1, 0.5), b: lerpV(a2, a3, 0.5), r: 3.6, bevel: 1 });
  const bands: [typeof GD, number][] = [
    [GD, 0.56],
    [EB, 0.66],
    [TQ, 0.76],
    [GD, 0.86],
  ];
  for (const [mat, k] of bands) d.capsule({ mat, z: z + 0.1, group: 'apron', line: 'none' }, lerpV(a0, a3, k), lerpV(a1, a2, k), 0.75, 0.75);
}

/** Wide beaded disc collar: rows of linen, magenta, turquoise and gold beads. */
function collar(d: Draw, s: Skel, z: number) {
  const rows: [typeof GD, number][] = [
    [WH, 4.0],
    [MG, 5.3],
    [TQ, 6.6],
    [GD, 7.8],
  ];
  for (const [mat, r] of rows) {
    const pts: V[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = (200 + (i / 8) * 150) * D2R;
      pts.push(s.T(18.8 + Math.sin(a) * r * 0.85, Math.cos(a) * r + 0.6));
    }
    const beads = r * 1.3;
    d.ribbon({ mat, z: z + r * 0.01, group: 'collar', line: 'none', tex: (h) => (Math.floor(h.u * beads) % 2 ? -1 : 0) }, pts, pts.map(() => 0.85));
  }
}

function head(d: Draw, s: Skel) {
  const H = s.H;
  // long neck stacked with gold rings
  d.capsule({ mat: SK, z: 36.5, group: 'neck' }, s.neck, H(0, -4.2), 2.4, 2.2);
  const nd = s.headDir;
  for (let k = 0; k < 3; k++) {
    const c = lerpV(s.neck, H(0, -6.0), 0.16 + k * 0.3);
    const f = d.frame(c, nd);
    d.capsule({ mat: GD, z: 36.6 + k * 0.01, group: 'ring' + k, line: 'soft' }, f(0, -3.0), f(0, 3.0), 0.8, 0.8);
  }
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: 'calm', ear: 'human', mouth: 'line', lip: ACCENT.lipRose, rx: 5.8, ry: 6.4 });
  // gold hoop earring
  d.circle({ mat: GD, z: 38.6, group: 'earring' }, H(-1.4, -3.8), 1.1);
  gele(d, s, 39);
}

/** Folds of the gele from the front of the brow, over the top, to the back (head space). */
const GELE: [number, number][] = [
  [5.6, 3.8],
  [2.6, 11.5],
  [1.2, 14.5],
  [-1.4, 13.6],
  [-4.6, 16.6],
  [-6.6, 13.9],
  [-10.8, 14.4],
  [-11.2, 10.6],
  [-13.6, 8.4],
  [-11.0, 4.7],
  [-8.0, 0.8],
];

/** The gele: starched cloth folded like a fan, rising up and back from a cap around the head. */
function gele(d: Draw, s: Skel, z: number) {
  const H = s.H;
  const base = H(-1.4, 4.0);
  for (let i = 0; i < GELE.length - 1; i++) {
    const lit = i % 2 === 0;
    d.poly(
      { mat: MG, z, group: 'gele', minIdx: 2 },
      [base, H(...GELE[i]), H(...GELE[i + 1])],
      { kind: 'flat', n: lit ? [-0.35, 0.6, 0.72] : [0.45, -0.15, 0.88] },
    );
  }
  d.poly(
    { mat: MG, z: z + 0.1, group: 'gelecap' },
    [H(5.4, 3.2), H(4.8, 6.0), H(1.6, 8.0), H(-3.4, 8.2), H(-7.4, 5.8), H(-8.2, 1.2), H(-7.0, -2.2), H(-4.4, -1.2), H(-1.2, 1.8)],
    { kind: 'dome', c: H(-1.4, 3.4), r: 8.4, bevel: 1.2 },
  );
  // gold band at the brow and a star-gem at the front
  d.ribbon({ mat: GD, z: z + 0.2, group: 'geleband', line: 'none' }, [H(5.5, 3.4), H(1.4, 2.4), H(-3.6, 1.4), H(-7.8, 0.4)], [0.8, 0.85, 0.85, 0.75]);
  d.ellipse({ mat: HL, z: z + 0.25, group: 'gem' }, H(4.3, 4.6), 1.1, 1.5, s.headDir - 90);
}

/** Oval hard-light shield on the far arm: gold rim and spine, a star boss and chevrons in the light. */
function shield(d: Draw, s: Skel, ang: number, z: number) {
  const c = at(s.hF, s.loF, 1.2);
  const rot = ang - 90;
  d.ellipse({ mat: GD, z, group: 'shield' }, c, 7.4, 14.2, rot);
  d.ellipse({ mat: HL, z: z + 0.1, group: 'shield', line: 'none' }, c, 6.0, 12.8, rot);
  const f = d.frame(c, ang);
  for (const u of [-6.5, 9.5]) {
    d.ribbon({ mat: HL, z: z + 0.2, group: 'shield', line: 'none', shade: -2 }, [f(u - 2.6, -4.0), f(u, 0), f(u - 2.6, 4.0)], [0.55, 0.6, 0.55]);
  }
  d.capsule({ mat: GD, z: z + 0.3, group: 'shield', line: 'none' }, f(-12, 0), f(12, 0), 0.6, 0.6);
  d.poly({ mat: GD, z: z + 0.4, group: 'boss' }, [f(4.6, 0), f(1.1, 1.1), f(0, 3.8), f(-1.1, 1.1), f(-4.6, 0), f(-1.1, -1.1), f(0, -3.8), f(1.1, -1.1)], { kind: 'bevel', w: 1.2 });
}

/** Ebony spear with gold bands, a leaf blade of hard light and a magenta tassel. */
function spear(d: Draw, hand: V, ang: number, z: number, wave: number, glow: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: EB, z, group: 'spear' }, f(-19, 0), f(30.5, 0), 1.15, 1.1);
  for (const u of [-17.5, -7, 9, 27.5]) d.capsule({ mat: GD, z: z + 0.05, group: 'spear', line: 'none' }, f(u, 0), f(u + 1.8, 0), 1.45, 1.45);
  d.poly({ mat: HL, z: z + 0.1, group: 'blade', shade: Math.round(glow) }, [f(30.4, -1.5), f(35.6, -2.9), f(44.5, 0), f(35.6, 2.9), f(30.4, 1.5)], { kind: 'bevel', w: 1.2 });
  d.capsule({ mat: GD, z: z + 0.15, group: 'spear', line: 'none' }, f(29.6, 0), f(31.2, 0), 1.9, 1.9);
  const base = f(29.8, 0);
  const t1 = at(base, -96 + Math.sin(wave) * 10, 4.2), t2 = at(t1, -92 + Math.sin(wave + 1) * 14, 4);
  d.ribbon({ mat: MG, z: z - 0.1, group: 'tassel' }, [base, t1, t2], [1.0, 1.3, 0.7]);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 88,
  head: 90,
  legN: { ik: v(-7, 3) },
  legF: { ik: v(8, 3) },
  armN: { up: -78, lo: 18 },
  armF: { up: -48, lo: 18 },
  p: { spearAng: 88, shieldAng: 94, wave: 0, spear: 1, glow: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -b, torso: 88 - b, armN: { up: -78 + b * 2, lo: 18 + b }, armF: { up: -48 + b, lo: 18 }, p: { spearAng: 88 - b, shieldAng: 94 + b, wave: a, spear: 1, glow: t > 0.6 ? 1 : 0 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const ft = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -12 * Math.cos(ph), y: 3 + (sn > 0 ? 8 * sn : 0), ang: sn > 0 ? -30 * sn : 0 };
  };
  const n = ft(a), f = ft(a + Math.PI);
  return pose({
    y: bob,
    torso: 72,
    head: 80,
    legN: { ik: v(n.x, n.y) },
    legF: { ik: v(f.x, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -52, lo: -4 },
    armF: { up: -24, lo: 38 },
    p: { spearAng: 6, shieldAng: 100, wave: a * 2, spear: 1, glow: 0 },
  });
}

// Sunspear Flurry: pull back, thrust, half-retract, thrust again.
const FL_READY = pose({ x: -2, torso: 98, head: 94, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, armN: { up: -150, lo: -176 }, armF: { up: -30, lo: 30 }, p: { spearAng: 4, shieldAng: 98, wave: 1, spear: 1 } });
const FL_T1 = pose({ x: 8, torso: 74, head: 82, legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) }, armN: { up: -8, lo: -2 }, armF: { up: -60, lo: 0 }, p: { spearAng: 0, shieldAng: 110, wave: 2, spear: 1, glow: 1 } });
const FL_BACK = pose({ x: 5, torso: 82, head: 86, legN: { ik: v(-11, 3) }, legF: { ik: v(13, 3) }, armN: { up: -110, lo: -160 }, armF: { up: -50, lo: 10 }, p: { spearAng: 2, shieldAng: 104, wave: 2.5, spear: 1 } });
const FL_T2 = pose({ x: 11, torso: 70, head: 80, legN: { ik: v(-13, 3) }, legF: { ik: v(16, 3) }, armN: { up: 2, lo: 2 }, armF: { up: -64, lo: -6 }, p: { spearAng: -4, shieldAng: 112, wave: 3, spear: 1, glow: 1 } });

// Spiral of Spears: two blazing sweeps with a spin between them.
const SP_WIND = pose({ x: -3, y: -4, torso: 84, head: 88, legN: { ik: v(-12, 3) }, legF: { ik: v(10, 3) }, armN: { up: 168, lo: 150 }, armF: { up: -40, lo: 20 }, p: { spearAng: 160, shieldAng: 96, wave: 1, spear: 1 } });
const SP_HIT1 = pose({ x: 6, y: -5, torso: 70, head: 80, legN: { ik: v(-13, 3) }, legF: { ik: v(14, 3) }, armN: { up: -22, lo: -34 }, armF: { up: -70, lo: -30 }, p: { spearAng: -24, shieldAng: 120, wave: 2, spear: 1, glow: 1 } });
const SP_SPIN = pose({ x: 4, y: -2, torso: 86, head: 88, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, armN: { up: 150, lo: 160 }, armF: { up: -60, lo: -10 }, p: { spearAng: 170, shieldAng: 100, wave: 2.6, spear: 1, turn: 1 } });
const SP_HIT2 = pose({ x: 9, y: -4, torso: 72, head: 82, legN: { ik: v(-12, 3) }, legF: { ik: v(15, 3) }, armN: { up: 8, lo: -6 }, armF: { up: -66, lo: -24 }, p: { spearAng: 6, shieldAng: 118, wave: 3.2, spear: 1, glow: 1 } });

// Sunfall Javelin: crouch, leap, hurl, land, the spear re-forms from light.
const JV_CROUCH = pose({ x: -2, y: -8, torso: 82, head: 86, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, armN: { up: 158, lo: 64 }, armF: { up: -20, lo: 40 }, p: { spearAng: 16, shieldAng: 100, wave: 1, spear: 1 } });
const JV_JUMP = pose({ x: 2, y: 12, torso: 92, head: 92, legN: { ik: v(-7, 10) }, legF: { ik: v(6, 13) }, footN: -30, footF: -20, armN: { up: 164, lo: 72 }, armF: { up: 0, lo: 50 }, p: { spearAng: 22, shieldAng: 96, wave: 1.6, spear: 1, glow: 1 } });
const JV_THROW = pose({ x: 6, y: 10, torso: 70, head: 80, legN: { ik: v(-9, 9) }, legF: { ik: v(8, 7) }, footN: -20, armN: { up: 16, lo: 8 }, armF: { up: -100, lo: -60 }, p: { spearAng: 8, shieldAng: 110, wave: 2.2, spear: 1, glow: 2 } });
const JV_AFTER = pose({ x: 7, y: 5, torso: 72, head: 82, legN: { ik: v(-10, 5) }, legF: { ik: v(10, 4) }, armN: { up: -10, lo: -20 }, armF: { up: -90, lo: -50 }, p: { spearAng: 0, shieldAng: 108, wave: 2.8, spear: 0 } });
const JV_LAND = pose({ x: 6, y: -6, torso: 78, head: 84, legN: { ik: v(-12, 3) }, legF: { ik: v(11, 3) }, armN: { up: -60, lo: -30 }, armF: { up: -60, lo: 10 }, p: { spearAng: 40, shieldAng: 102, wave: 3.2, spear: 0 } });

const HURT = pose({ x: -4, torso: 104, head: 110, legN: { ik: v(-11, 3) }, legF: { ik: v(7, 4) }, armN: { up: -110, lo: -60 }, armF: { up: -30, lo: 40 }, p: { spearAng: 104, shieldAng: 80, wave: 2, spear: 1 } });
const DEATH_KNEEL = pose({ x: -2, y: -13, torso: 76, head: 62, legN: { ik: v(-15, 3) }, legF: { ik: v(8, 3) }, footN: -60, armN: { up: -92, lo: -88 }, armF: { up: -70, lo: -50 }, p: { spearAng: 70, shieldAng: 60, wave: 1, spear: 1 } });
const DEATH_FALL = pose({ x: 2, y: -21, torso: 30, head: 16, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { spearAng: -10, shieldAng: 30, wave: 1.6, spear: 1 } });
const DEATH_DOWN = pose({ x: 6, y: -27, torso: 4, head: -2, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { spearAng: 2, shieldAng: 4, wave: 2, spear: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'sunspear',
  name: 'Imara',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 140, idle) },
    run: { loop: true, frames: cycle(8, 75, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, FL_READY, 0.5), 70],
        [FL_READY, 170],
        [FL_T1, 60, { hit: true }],
        [tweak(FL_T1, { x: 9, p: { glow: 0 } }), 80],
        [FL_BACK, 70],
        [FL_T2, 60, { hit: true }],
        [tweak(FL_T2, { x: 12, torso: 68, p: { glow: 0, wave: 3.4 } }), 220],
        [mid(FL_T2, IDLE, 0.5), 100],
        [IDLE, 90],
      ]),
    },
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, SP_WIND, 0.5), 70],
        [SP_WIND, 170],
        [SP_HIT1, 60, { smear: true, hit: true }],
        [tweak(SP_HIT1, { x: 7, p: { spearAng: -30, wave: 2.3 } }), 80],
        [SP_SPIN, 70],
        [SP_HIT2, 60, { smear: true, hit: true }],
        [tweak(SP_HIT2, { x: 10, p: { spearAng: 0, wave: 3.6 } }), 220],
        [mid(SP_HIT2, IDLE, 0.5), 100],
        [IDLE, 90],
      ]),
    },
    attack3: {
      loop: false,
      frames: keys([
        [mid(IDLE, JV_CROUCH, 0.5), 80],
        [JV_CROUCH, 180],
        [JV_JUMP, 120],
        [JV_THROW, 70, { hit: true, event: 'shoot' }],
        [JV_AFTER, 120],
        [JV_LAND, 160],
        [tweak(mid(JV_LAND, IDLE, 0.5), { p: { spear: 1, glow: 2 } }), 110],
        [tweak(IDLE, { p: { glow: 1 } }), 100],
      ]),
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 100, head: 106 }), 110],
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

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** Compact spear for the 40px icons: shaft from `a` to `b`, the blade beyond `b`. */
function iconSpear(d: Draw, a: V, b: V, z: number, glow = 1) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x) / D2R;
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const f = d.frame(a, ang);
  const g = 'spear' + z;
  d.capsule({ mat: EB, z, group: g }, f(0, 0), f(L, 0), 1.1, 1.1);
  for (const u of [L * 0.22, L * 0.6]) d.capsule({ mat: GD, z: z + 0.05, group: g, line: 'none' }, f(u, 0), f(u + 1.6, 0), 1.45, 1.45);
  d.poly({ mat: HL, z: z + 0.1, group: g + 'b', shade: glow }, [f(L - 0.4, -1.6), f(L + 3.6, -3.0), f(L + 10.5, 0), f(L + 3.6, 3.0), f(L - 0.4, 1.6)], { kind: 'bevel', w: 1.2 });
  d.capsule({ mat: GD, z: z + 0.15, group: g, line: 'none' }, f(L - 1.2, 0), f(L + 0.4, 0), 1.9, 1.9);
}

export const sunspear: ChampionArt = {
  char,
  iconBg: MAT.magenta,
  icons: {
    sunspear_flurry: () =>
      compose(MAT.magenta, glyph((d) => {
        iconSpear(d, v(2, 15), v(20, 27), 10, 1);
        iconSpear(d, v(7, 4), v(24, 16), 11, 0);
      }), (b) => {
        speedLines(b, [[2, 18, 9, 13], [3, 27, 10, 22], [6, 35, 13, 30], [12, 37, 18, 33]], C.smearMagenta);
        impactStar(b, 31, 9, 1, 6, 8, C.smearCyan, C.white);
        impactStar(b, 34, 20, 1, 4, 8, C.smearCyan, C.white);
      }),
    spear_spiral: () =>
      compose(MAT.magenta, glyph((d) => {
        smear(d, v(20, 20), 170, -10, 17, 6, { core: C.white, edge: C.smearCyan }, 1);
        smear(d, v(20, 20), -10, -190, 17, 6, { core: C.white, edge: C.smearCyan }, 1.1);
        iconSpear(d, v(6, 7), v(22, 23), 10, 1);
      })),
    sunfall_javelin: () =>
      compose(MAT.magenta, glyph((d) => {
        iconSpear(d, v(7, 33), v(22, 16), 10, 2);
      }), (b) => {
        sunDisc(b, 10, 9, 5, 12, FXR.gold);
        speedLines(b, [[13, 4, 19, 10], [4, 14, 10, 19], [16, 8, 22, 13]], C.goldHot);
        impactStar(b, 32, 33, 2, 7, 10, C.smearCyan, C.white);
      }),
  },
};
