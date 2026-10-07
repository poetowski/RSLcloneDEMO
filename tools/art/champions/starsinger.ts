// Kwesi, the Starsinger — Nyota support, a griot who keeps the city's memory
// in song. Tall violet kufi with a band of light, short beard, a teal agbada
// with wide sleeves and a gold-embroidered chest, a halo of star-orbs that
// orbit his head, and a kora-staff: calabash resonator, strings of light, gold
// scroll. Signature color: teal + gold. Silhouette: the wide robe, the halo
// and the long kora neck.
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { C, compose, glyph } from '../icons.ts';
import { ACCENT, Material, MAT } from '../palette.ts';
import { ellipseRing } from '../paint.ts';
import { foldTex, robe, RobeCfg, torsoPts, upRobe } from '../parts.ts';
import { withAlpha } from '../raster.ts';
import { at, D2R, Dims, Draw, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16.5,
  shin: 16,
  ankleH: 3,
  footLen: 6,
  spine: 21,
  neck: 7.6,
  upperArm: 12.5,
  foreArm: 11.5,
  shoulderDrop: 3.8,
  shoulderN: -2.8,
  shoulderF: 3.2,
  hipN: -1.6,
  hipF: 1.6,
};

const SK = MAT.skinBrown, TL = MAT.teal, GD = MAT.gold, VI = MAT.violet, LN = MAT.linen, HR = MAT.hairDark, HL = MAT.glowCyan, GG = MAT.glowGold, WD = MAT.wood, CB = MAT.calabash;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const wave = P.wave ?? 0;
  void info;

  halo(d, s, P.orbit ?? 0, P.halo ?? 0);
  sleeve(d, s, 'F', 6, -1, wave);

  // trouser legs and slippers below the robe
  for (const [side, z, shade] of [['F', 10, -1], ['N', 12, 0]] as const) {
    const kn = side === 'N' ? s.kneeN : s.kneeF, an = side === 'N' ? s.ankN : s.ankF;
    d.capsule({ mat: LN, z, group: 'leg' + side, shade }, lerpV(kn, an, 0.2), an, 3.2, 2.8);
    const f = d.frame(an, side === 'N' ? s.pose.footN : s.pose.footF);
    d.poly({ mat: CB, z: z + 0.2, group: 'leg' + side, shade }, [f(-2.4, 2.2), f(-3, -0.5), f(-2.6, -3), f(5.8, -3), f(7.6, -1.4), f(4.2, -0.2), f(1.4, 1.6)], { kind: 'bevel', w: 1.6 });
  }

  agbada(d, s, wave);
  arm(d, s, 'F', 20, -1);

  // the agbada over the chest, with its embroidered panel
  const torso = torsoPts(s, [
    [0, 6.4, 6.8],
    [4, 6.0, 7.0],
    [9, 6.4, 8.0],
    [13.5, 7.2, 8.6],
    [17, 7.4, 7.6],
    [19.6, 5.4, 4.6],
    [21, 2.8, 2.4],
  ]);
  d.poly({ mat: TL, z: 30, group: 'body', tex: foldTex(7, 0.3, 0.72) }, torso, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(21, 0.6), r: 7.8, bevel: 1.3 });
  embroidery(d, s, 31, P.halo ?? 0);

  head(d, s);

  kora(d, s.hN, P.koraAng ?? 90, 55, P.halo ?? 0, P.strum ?? 0);
  sleeve(d, s, 'N', 58, 0, wave);
  arm(d, s, 'N', 60, 0);
}

function arm(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const el = side === 'N' ? s.eN : s.eF;
  const ha = side === 'N' ? s.hN : s.hF;
  const lo = side === 'N' ? s.loN : s.loF;
  const sh = side === 'N' ? s.sN : s.sF;
  const g = 'arm' + side;
  // the sleeve covers the arm to the wrist; only the forearm tip and hand show
  d.capsule({ mat: TL, z, group: g, shade }, sh, el, 3.4, 3.2);
  d.capsule({ mat: TL, z: z + 0.1, group: g, shade }, el, at(ha, lo, -2.6), 3.2, 3.6);
  d.capsule({ mat: GD, z: z + 0.15, group: g, shade, line: 'none' }, at(ha, lo, -3.4), at(ha, lo, -2.4), 3.6, 3.6, 0.3);
  d.capsule({ mat: SK, z: z + 0.05, group: g, shade }, at(ha, lo, -3), ha, 2.2, 2.1);
  d.ellipse({ mat: SK, z: z + 0.3, group: g, shade }, at(ha, lo, 0.6), 2.4, 2.1, lo);
}

/**
 * The wide agbada sleeve: a drape hanging from the arm toward the ground,
 * longest at the wrist, edged with gold.
 */
function sleeve(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number, wave: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const el = side === 'N' ? s.eN : s.eF;
  const ha = side === 'N' ? s.hN : s.hF;
  const lo = side === 'N' ? s.loN : s.loF;
  const edge = [at(sh, side === 'N' ? s.upN : s.upF, 1.5), el, at(ha, lo, -2.8)];
  const n = 6;
  const hem: V[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const base = t < 0.5 ? lerpV(edge[0], edge[1], t * 2) : lerpV(edge[1], edge[2], (t - 0.5) * 2);
    const len = 4 + t * 14 + Math.sin(wave + t * 4) * 0.8;
    // cloth falls straight down, trailing a little behind the arm
    const p = at(base, -98, len);
    hem.push(v(p.x, Math.min(base.y - 1, Math.max(9, p.y))));
  }
  d.poly(
    { mat: TL, z, group: 'sleeve' + side, shade, tex: foldTex(9, wave * 0.5, 0.6) },
    [...hem, ...[...edge].reverse()],
    { kind: 'cyl', a: lerpV(edge[0], edge[2], 0.5), b: lerpV(hem[0], hem[n], 0.5), r: 6, bevel: 1.4 },
  );
  d.ribbon({ mat: GD, z: z + 0.1, group: 'sleeve' + side, shade, line: 'none' }, hem.slice(2), hem.slice(2).map(() => 0.7));
}

const AGBADA: RobeCfg = { waist: [2, 6.8, 7.4], hemDrop: -5, hemFloor: 7, hemBack: [7.5, 5], hemFront: [5, 3.4], midBack: [5, 3], midFront: [4.2, 1.6], ripple: 0.7 };

/** The agbada: a wide robe to mid-shin, so the trousers and slippers show below it. */
function agbada(d: Draw, s: Skel, wave: number) {
  const r = robe(s, AGBADA, wave);
  d.poly({ mat: TL, z: 15, group: 'robe', tex: foldTex(10, wave * 0.6, 0.66) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  // embroidered hem: gold band with a row of glowing stitches above it
  d.ribbon({ mat: GD, z: 15.2, group: 'robe', line: 'none' }, upRobe(r, r.hem, 0.8), r.hem.map(() => 0.9));
  d.pixels({ mat: TL, z: 15.3, group: 'robe' }, upRobe(r, r.hem.filter((_, i) => i % 2 === 1), 2.6).map((p) => ({ p, c: HL.ramp[4] })));
}

/** Gold embroidery on the agbada front: a shield-shaped panel of scrolls with light stitched in. */
function embroidery(d: Draw, s: Skel, z: number, glow: number) {
  const T = s.T;
  const outline = [T(19.0, 2.4), T(18.0, 7.0), T(13.0, 8.2), T(8.6, 6.0), T(6.6, 2.6), T(9.6, 1.0), T(14.4, 1.2)];
  d.ribbon({ mat: GD, z, group: 'embroidery', line: 'none' }, [...outline, outline[0]], [...outline, outline[0]].map(() => 0.7));
  d.ribbon({ mat: GD, z, group: 'embroidery', line: 'none' }, [T(17.0, 3.6), T(13.6, 5.6), T(10.2, 4.0)], [0.6, 0.6, 0.6]);
  d.pixels({ mat: TL, z: z + 0.1, group: 'embroidery' }, [T(15.2, 4.6), T(12.0, 5.4), T(9.4, 3.2)].map((p) => ({ p, c: HL.ramp[glow > 0 ? 5 : 4] })));
  // neckline trim
  d.ribbon({ mat: GD, z, group: 'embroidery', line: 'none' }, [T(20.2, -2.6), T(18.8, 1.2), T(19.8, 3.8)], [0.7, 0.75, 0.7]);
}

/** Orbs of starlight circling behind the head on a thin gold ring. */
function halo(d: Draw, s: Skel, orbit: number, glow: number) {
  const H = s.H;
  const c = H(-2.6, 3.4);
  const ring: V[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (64 + i * 16) * D2R;
    ring.push(H(-2.6 + Math.cos(a) * 11, 3.4 + Math.sin(a) * 11));
  }
  d.ribbon({ mat: GD, z: 2, group: 'haloring', line: 'none' }, ring, ring.map(() => 0.5));
  for (let k = 0; k < 5; k++) {
    const a = (78 + k * 38 + orbit * 38) * D2R;
    const mat = k % 2 ? GG : HL;
    d.circle({ mat, z: 2.1 + k * 0.01, group: 'orb' + k, shade: Math.round(glow) }, H(-2.6 + Math.cos(a) * 11, 3.4 + Math.sin(a) * 11), k % 2 ? 1.5 : 1.9);
  }
  void c;
}

function head(d: Draw, s: Skel) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'head' }, s.neck, H(0, -4), 2.5, 2.3);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: 'flat', ear: 'human', mouth: 'line', lip: ACCENT.lipRose, rx: 6.0, ry: 6.6 });
  // short beard along the jaw
  d.poly(
    { mat: HR, z: 38.2, group: 'beard', tex: (h, x, y) => ((x * 3 + y) % 4 === 0 ? 1 : 0) },
    [H(-1.0, 1.2), H(-0.4, -1.8), H(1.2, -4.8), H(3.4, -6.8), H(5.6, -7.2), H(6.8, -5.8), H(6.4, -4.6), H(5.2, -4.4), H(3.4, -5.0), H(1.6, -3.2), H(0.6, -0.4), H(0.4, 1.2)],
    { kind: 'dome', c: H(2.6, -4), r: 6, bevel: 1 },
  );
  d.pixels({ mat: HR, z: 38.25, group: 'beard' }, [H(4.6, -3.0), H(5.6, -3.0), H(6.4, -3.2)].map((p) => ({ p, c: HR.ramp[3] })));
  // tall kufi: violet, a band of light at the brow, gold rim and studs
  d.poly(
    { mat: VI, z: 39, group: 'kufi' },
    [H(5.6, 2.8), H(5.4, 6.4), H(4.8, 11.2), H(-0.6, 12.4), H(-6.2, 11.0), H(-7.4, 6.0), H(-7.2, 1.6), H(-3.0, 2.6)],
    { kind: 'cyl', a: H(5.4, 7), b: H(-7.4, 7), r: 6.6, bevel: 1.2 },
  );
  d.ribbon({ mat: HL, z: 39.1, group: 'kufi', line: 'none' }, [H(5.6, 3.6), H(1.0, 3.4), H(-3.6, 3.0), H(-7.2, 2.6)], [0.9, 1.0, 1.0, 0.9]);
  d.ribbon({ mat: GD, z: 39.1, group: 'kufi', line: 'none' }, [H(4.9, 11.0), H(-0.6, 12.2), H(-6.0, 10.8)], [0.65, 0.7, 0.65]);
  d.pixels({ mat: VI, z: 39.2, group: 'kufi' }, [H(3.6, 7.6), H(0.4, 8.0), H(-2.8, 7.8), H(1.8, 5.8), H(-1.2, 5.8)].map((p) => ({ p, c: GD.ramp[4] })));
}

/**
 * Kora-staff held at the shaft below the resonator: a calabash gourd with a
 * glowing sound hole, a long neck carrying strings of light, and a gold scroll.
 */
function kora(d: Draw, hand: V, ang: number, z: number, glow: number, strum: number) {
  const f = d.frame(hand, ang);
  const g = 'kora';
  d.capsule({ mat: WD, z, group: g }, f(-33, 0), f(36, 0), 1.1, 1.0);
  d.capsule({ mat: GD, z: z + 0.05, group: g, line: 'none' }, f(-33, 0), f(-30.5, 0), 1.5, 1.5);
  // scroll at the top
  d.ribbon({ mat: GD, z: z + 0.1, group: g }, [f(35, 0), f(38.4, 0.6), f(39.4, -2.2), f(37.2, -3.4), f(36.4, -1.6)], [1.3, 1.2, 1.0, 0.9, 0.8]);
  // the gourd and its face
  const gc = f(9.5, -0.6);
  d.ellipse({ mat: CB, z: z + 0.2, group: 'gourd', tex: (h) => (Math.floor((h.u + 0.06) * 9) % 3 === 0 ? -1 : 0) }, gc, 5.6, 6.4, ang - 90);
  d.ellipse({ mat: HL, z: z + 0.3, group: 'gourd', shade: Math.round(glow), line: 'none' }, f(9.5, -2.6), 1.5, 1.9, ang - 90);
  d.capsule({ mat: GD, z: z + 0.3, group: 'gourd', line: 'none' }, f(13.4, -4.2), f(13.4, 2.8), 0.6, 0.6);
  // strings of light from the bridge up the neck; they shiver when strummed
  const lit = HL.ramp[glow > 0 ? 5 : 4];
  for (const w of [-1.6, -2.8]) {
    const mid = f(24, w + Math.sin(w * 3) * strum * 1.2);
    d.line({ mat: HL, z: z + 0.35, group: 'strings', line: 'none' }, f(13.6, w), mid, lit);
    d.line({ mat: HL, z: z + 0.35, group: 'strings', line: 'none' }, mid, f(34, w * 0.4), lit);
  }
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 89,
  head: 88,
  legN: { ik: v(-5, 3) },
  legF: { ik: v(6, 3) },
  armN: { up: -58, lo: 6 },
  armF: { up: -48, lo: 52 },
  p: { koraAng: 92, wave: 0, orbit: 0, halo: 0, strum: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  // a slow sway to his own rhythm; the orbs travel round the halo
  return tweak(IDLE, {
    y: -b,
    torso: 89 - b,
    armN: { up: -58 + b * 2, lo: 6 + b * 2 },
    armF: { up: -48 + b * 4, lo: 52 + b * 6 },
    p: { koraAng: 92 - b, wave: a, orbit: t, halo: b, strum: b },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const ft = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -9 * Math.cos(ph), y: 3 + (sn > 0 ? 5 * sn : 0), ang: sn > 0 ? -20 * sn : 0 };
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
    armN: { up: -50, lo: 20 },
    armF: { up: -110 + Math.cos(a) * 10, lo: -80 },
    p: { koraAng: 64, wave: a * 2 + 2, orbit: t * 2, halo: 0, strum: 0 },
  });
}

// Resonance: the kora swings forward and one strum throws a ring of sound.
const RS_LIFT = pose({
  x: -2, torso: 95, head: 94,
  legN: { ik: v(-8, 3) }, legF: { ik: v(6, 3) },
  armN: { up: -40, lo: 40 }, armF: { up: -20, lo: 60 },
  p: { koraAng: 108, wave: 1, orbit: 0.2, halo: 1, strum: 0 },
});
const RS_STRUM = pose({
  x: 5, y: -1, torso: 78, head: 84,
  legN: { ik: v(-8, 3) }, legF: { ik: v(12, 3) },
  armN: { up: -10, lo: 30 }, armF: { up: -30, lo: -50 },
  p: { koraAng: 58, wave: 2, orbit: 0.4, halo: 2, strum: 1 },
});

// Rhythm of the March: the staff is lifted and beaten on the ground.
const RM_LIFT = pose({
  y: 2, torso: 94, head: 98,
  legN: { ik: v(-6, 3) }, legF: { ik: v(8, 7) }, footF: -14,
  armN: { up: 20, lo: 70 }, armF: { up: 40, lo: 80 },
  p: { koraAng: 90, wave: 1, orbit: 0.3, halo: 1, strum: 0 },
});
const RM_BEAT = pose({
  y: -2, torso: 86, head: 84,
  legN: { ik: v(-6, 3) }, legF: { ik: v(9, 3) },
  armN: { up: -46, lo: 30 }, armF: { up: -30, lo: 60 },
  p: { koraAng: 90, wave: 2, orbit: 0.6, halo: 2, strum: 1 },
});

// Starsong Crescendo: the kora rises overhead and the halo blazes.
const SS_RAISE = pose({
  y: 2, torso: 96, head: 106,
  legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) },
  armN: { up: 96, lo: 92 }, armF: { up: 70, lo: 120 },
  p: { koraAng: 96, wave: 1, orbit: 0.5, halo: 2, strum: 0 },
});
const SS_PEAK = tweak(SS_RAISE, { y: 3, head: 110, p: { orbit: 1, wave: 1.6, strum: 1 } });
const SS_SWEEP = pose({
  x: 4, y: -2, torso: 76, head: 82,
  legN: { ik: v(-9, 3) }, legF: { ik: v(11, 3) },
  armN: { up: -4, lo: 14 }, armF: { up: -20, lo: -40 },
  p: { koraAng: 36, wave: 2.4, orbit: 1.4, halo: 2, strum: 1 },
});

const HURT = pose({
  x: -4, torso: 102, head: 108,
  legN: { ik: v(-7, 3) }, legF: { ik: v(5, 4) },
  armN: { up: -110, lo: -60 }, armF: { up: -40, lo: 20 },
  p: { koraAng: 116, wave: 2, orbit: 0, halo: 0, strum: 1 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -14, torso: 74, head: 60,
  legN: { ik: v(-12, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -90, lo: -80 }, armF: { up: -80, lo: -70 },
  p: { koraAng: 70, wave: 1, orbit: 0, halo: 0, strum: 0 },
});
const DEATH_FALL = pose({
  x: 1, y: -22, torso: 30, head: 14,
  legN: { up: -150, lo: -175 }, legF: { up: -120, lo: -170 },
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { koraAng: 24, wave: 1.6, orbit: 0, halo: -1, strum: 0 },
});
const DEATH_DOWN = pose({
  x: 5, y: -28, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 },
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { koraAng: 4, wave: 2, orbit: 0, halo: -2, strum: 0 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'starsinger',
  name: 'Kwesi',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 140, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, RS_LIFT, 0.5), 80],
        [RS_LIFT, 170],
        [mid(RS_LIFT, RS_STRUM, 0.6), 50],
        [RS_STRUM, 80, { hit: true }],
        [tweak(RS_STRUM, { x: 6, p: { strum: 0.5, wave: 2.6 } }), 200],
        [mid(RS_STRUM, IDLE, 0.5), 100],
        [IDLE, 100],
      ]),
    },
    skill: {
      loop: false,
      frames: keys([
        [mid(IDLE, RM_LIFT, 0.5), 90],
        [RM_LIFT, 150],
        [RM_BEAT, 70, { event: 'cast' }],
        [tweak(RM_BEAT, { y: -1, p: { strum: 0.5 } }), 110],
        [RM_LIFT, 110],
        [RM_BEAT, 80, { hit: true }],
        [tweak(RM_BEAT, { y: -1, p: { orbit: 0.9, strum: 0.4 } }), 200],
        [mid(RM_BEAT, IDLE, 0.5), 110],
        [IDLE, 100],
      ]),
    },
    attack3: {
      loop: false,
      frames: keys([
        [mid(IDLE, SS_RAISE, 0.5), 90],
        [SS_RAISE, 130, { event: 'cast' }],
        [SS_PEAK, 160],
        [mid(SS_PEAK, SS_SWEEP, 0.5), 50],
        [SS_SWEEP, 90, { hit: true }],
        [tweak(SS_SWEEP, { x: 5, torso: 74, p: { wave: 3, strum: 0.5 } }), 240],
        [mid(SS_SWEEP, IDLE, 0.5), 110],
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

/** Concentric arcs of sound opening toward +x (bitmap coordinates). */
function soundArcs(b: Parameters<typeof ellipseRing>[0], cx: number, cy: number, radii: number[], mat: Material) {
  radii.forEach((r, i) => ellipseRing(b, cx, cy, r, r * 1.1, 1.1, (x) => (x > cx + r * 0.25 ? withAlpha(i % 2 ? C.white : mat.ramp[4], 230 - i * 30) : 0)));
}

export const starsinger: ChampionArt = {
  char,
  iconBg: MAT.teal,
  icons: {
    resonance: () =>
      compose(MAT.teal, glyph((d) => {
        kora(d, v(7, 4), 64, 10, 1, 1);
      }), (b) => soundArcs(b, 16, 18, [8, 13, 18], HL)),
    march_rhythm: () =>
      compose(MAT.teal, glyph((d) => {
        // a djembe between marching chevrons: skin head, rope zigzag, flared foot
        d.poly({ mat: CB, z: 10, group: 'drum' }, [v(10, 29), v(30, 29), v(27, 21), v(22.5, 16), v(24, 6), v(16, 6), v(17.5, 16), v(13, 21)], { kind: 'cyl', a: v(10, 18), b: v(30, 18), r: 10, bevel: 1.2 });
        d.ellipse({ mat: LN, z: 10.2, group: 'head' }, v(20, 30), 10.4, 3.2, 0);
        d.capsule({ mat: GD, z: 10.1, group: 'drum', line: 'none' }, v(10.6, 27.6), v(29.4, 27.6), 0.9, 0.9);
        d.capsule({ mat: GD, z: 10.1, group: 'drum', line: 'none' }, v(16.6, 8), v(23.4, 8), 0.9, 0.9);
        for (let i = 0; i < 6; i++) {
          const x0 = 11.8 + i * 3.3, x1 = x0 + 1.65;
          d.line({ mat: CB, z: 10.15, group: 'drum', line: 'none' }, v(x0, 27), v(x1, 20.5), GD.ramp[4]);
          d.line({ mat: CB, z: 10.15, group: 'drum', line: 'none' }, v(x1, 20.5), v(x0 + 3.3, 27), GD.ramp[4]);
        }
        for (const x of [2.5, 31.5]) d.ribbon({ mat: HL, z: 10, group: 'chev' + x }, [v(x, 25), v(x + 4, 19), v(x, 13)], [1.1, 1.3, 1.1]);
      })),
    starsong: () =>
      compose(MAT.teal, glyph((d) => {
        for (let k = 0; k < 5; k++) {
          const a = (90 + k * 72) * D2R;
          d.circle({ mat: k % 2 ? GG : HL, z: 10 + k * 0.01, group: 'o' + k }, v(20 + Math.cos(a) * 11, 20 + Math.sin(a) * 11), k % 2 ? 2.4 : 3);
        }
        d.poly({ mat: GG, z: 11, group: 'star' }, [v(20, 29), v(22.4, 22.4), v(29, 20), v(22.4, 17.6), v(20, 11), v(17.6, 17.6), v(11, 20), v(17.6, 22.4)], { kind: 'bevel', w: 2 });
      }), (b) => {
        ellipseRing(b, 20, 20, 11, 11, 1, () => withAlpha(GD.ramp[4], 200));
        ellipseRing(b, 20, 20, 16, 16, 1, (x, y, a) => (Math.sin(a * 6) > 0.2 ? withAlpha(HL.ramp[4], 170) : 0));
      }),
  },
};
