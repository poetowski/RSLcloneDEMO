// Mwamba, the Starforged — Nyota legendary tank, the guardian the first
// star-smiths raised to keep the Skyforge. Ebony plates inlaid with stepped
// gold, a sun core blazing in the chest, stacked disc pauldrons, a gold mask
// with slit eyes of light, a sunburst crest and a terracotta waist cloth.
// Signature color: gold core on ebony. Silhouette: the crest of rays, the disc
// shoulders and the huge fists.
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { C, compose, glyph, impactStar, speedLines } from '../icons.ts';
import { MAT } from '../palette.ts';
import { ellipseRing } from '../paint.ts';
import { leg, torsoPts } from '../parts.ts';
import { withAlpha } from '../raster.ts';
import { at, D2R, dir, Dims, Draw, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 38,
  thigh: 18,
  shin: 18,
  ankleH: 3,
  footLen: 8,
  spine: 25,
  neck: 6.4,
  upperArm: 15,
  foreArm: 14,
  shoulderDrop: 5.2,
  shoulderN: -5,
  shoulderF: 5.6,
  hipN: -2.8,
  hipF: 2.8,
};

const EB = MAT.ebony, GD = MAT.gold, GG = MAT.glowGold, HL = MAT.glowCyan, TC = MAT.terracotta;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const core = P.core ?? 0;
  void info;

  crest(d, s, P.crest ?? 0);

  // far leg and its tasset
  leg(d, s, 'F', { thigh: EB, shin: EB, foot: EB, knee: GD, kneeR: 3.8, rThigh: [6.4, 5.4], rShin: [5.2, 4.4], z: 10, shade: -1, footStyle: 'sabaton' });
  seam(d, s.kneeF, s.ankF, 0.55, 10.4, -1);
  tasset(d, s, 'F', 11, -1);

  // far arm and disc pauldron
  limb(d, s, 'F', 20, -1, P.fist ?? 0);
  discs(d, s, 'F', 28, -1);

  // torso: a barrel of ebony plate with stepped gold inlay and the sun core
  const torso = torsoPts(s, [
    [0, 8.4, 8.6],
    [5, 8.6, 9.6],
    [10.5, 9.8, 11.4],
    [16, 11.0, 12.4],
    [21, 11.2, 11.0],
    [24, 8.4, 7.0],
    [25, 4.4, 3.8],
  ]);
  d.poly({ mat: EB, z: 30, group: 'body' }, torso, { kind: 'cyl', a: s.T(0, 1.6), b: s.T(25, 1.6), r: 11.6, bevel: 1.6 });
  // stepped (zigzag) gold band across the belly and a seam of light at the waist
  const zig: V[] = [];
  for (let i = 0; i <= 8; i++) zig.push(s.T(i % 2 ? 21.0 : 19.0, -9 + i * 2.3));
  d.ribbon({ mat: GD, z: 30.2, group: 'body', line: 'none' }, zig, zig.map(() => 0.65));
  d.capsule({ mat: HL, z: 30.2, group: 'body', line: 'none', shade: Math.round(core) - 1 }, s.T(5.6, -8.4), s.T(6.0, 9.4), 0.5, 0.5);
  sunCore(d, s, 30.4, core);
  // terracotta waist cloth with a woven front panel
  d.poly({ mat: TC, z: 32, group: 'waist' }, [s.T(4.8, -9.0), s.T(5.0, 9.8), s.T(0.2, 9.4), s.T(0, -8.6)], { kind: 'cyl', a: s.T(0, 0), b: s.T(4.8, 0), r: 9.4 });
  d.capsule({ mat: GD, z: 32.1, group: 'waist', line: 'none' }, s.T(4.8, -8.8), s.T(5.0, 9.6), 0.6, 0.6);
  apron(d, s, 34, P.wave ?? 0);

  head(d, s, P);

  // near leg and tasset
  leg(d, s, 'N', { thigh: EB, shin: EB, foot: EB, knee: GD, kneeR: 3.8, rThigh: [6.4, 5.4], rShin: [5.2, 4.4], z: 50, footStyle: 'sabaton' });
  seam(d, s.kneeN, s.ankN, 0.55, 50.4, 0);
  tasset(d, s, 'N', 52, 0);

  // near arm over everything, the pauldron discs on top
  limb(d, s, 'N', 60, 0, P.fist ?? 0);
  discs(d, s, 'N', 64, 0);
}

/** A thin line of light running down a plate. */
function seam(d: Draw, a: V, b: V, r: number, z: number, shade: number) {
  d.capsule({ mat: HL, z, group: 'seam' + z, shade: shade - 1, line: 'none' }, lerpV(a, b, 0.3), lerpV(a, b, 0.75), r, r);
}

/** The sun core in the chest: a gold ring, rays inlaid into the plate, and the blazing heart. */
function sunCore(d: Draw, s: Skel, z: number, core: number) {
  const c = s.T(13.4, 6.0);
  const T = (a: number, r: number) => s.T(13.4 + Math.sin(a * D2R) * r, 6.0 + Math.cos(a * D2R) * r);
  for (let k = 0; k < 8; k++) {
    const a = k * 45 + 22.5;
    const long = k % 2 === 0;
    d.capsule({ mat: GD, z, group: 'core', line: 'none' }, T(a, 4.8), T(a, long ? 7.4 : 6.2), 0.55, 0.45);
  }
  d.circle({ mat: GD, z: z + 0.1, group: 'core' }, c, 4.2);
  d.circle({ mat: GG, z: z + 0.2, group: 'core', shade: Math.round(core), line: 'none' }, c, 3.0);
  if (core >= 2) d.pixels({ mat: GG, z: z + 0.3, group: 'core' }, [{ p: c, c: MAT.glowGold.ramp[5] }, { p: v(c.x + 1, c.y), c: MAT.glowGold.ramp[5] }, { p: v(c.x, c.y + 1), c: MAT.glowGold.ramp[5] }]);
}

/** Thick ebony arm: gold band on the upper arm, a gauntlet flaring at the wrist and a massive fist. */
function limb(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number, fist: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const el = side === 'N' ? s.eN : s.eF;
  const ha = side === 'N' ? s.hN : s.hF;
  const up = side === 'N' ? s.upN : s.upF;
  const lo = side === 'N' ? s.loN : s.loF;
  const g = 'arm' + side;
  d.capsule({ mat: EB, z, group: g, shade }, sh, el, 5.0, 4.4);
  const band = at(sh, up, 7.4);
  d.capsule({ mat: GD, z: z + 0.05, group: g, shade, line: 'none' }, at(band, up + 90, -4.4), at(band, up + 90, 4.4), 0.8, 0.8);
  d.circle({ mat: GD, z: z + 0.08, group: g, shade }, el, 3.2);
  // gold gauntlet flaring toward the wrist, a seam of light along it
  d.capsule({ mat: GD, z: z + 0.1, group: g + 'g', shade }, at(el, lo, 1), at(ha, lo, -1.6), 4.4, 5.4);
  d.capsule({ mat: HL, z: z + 0.12, group: g + 'g', shade: shade - 1, line: 'none' }, at(el, lo, 3.4), at(ha, lo, -3.4), 0.5, 0.5);
  const cuff = at(ha, lo, -2.2);
  d.capsule({ mat: EB, z: z + 0.15, group: g + 'g', shade, line: 'none' }, at(cuff, lo + 90, -5.0), at(cuff, lo + 90, 5.0), 0.8, 0.8);
  // fist: ebony with gold knuckles (glowing when it strikes)
  const fc = at(ha, lo, 1.6);
  d.ellipse({ mat: EB, z: z + 0.3, group: g + 'fist', shade }, fc, 5.0, 4.4, lo);
  const kn = at(fc, lo, 2.4);
  d.capsule({ mat: fist > 0 ? GG : GD, z: z + 0.35, group: g + 'fist', shade, line: 'none' }, at(kn, lo + 90, -3.0), at(kn, lo + 90, 3.0), 1.1, 1.1);
}

/** Stacked disc pauldron: three plates, largest at the bottom, gold between them. */
function discs(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  const g = 'disc' + side;
  // the stack rises from the shoulder along the torso direction
  const base = at(sh, up, 2.2);
  const plates: [number, number, number, typeof EB][] = [
    // offset up the torso, half width, half thickness, material
    [0, 8.2, 2.8, GD],
    [3.0, 6.8, 2.0, EB],
    [5.2, 5.4, 1.9, GD],
    [7.2, 3.6, 1.5, EB],
  ];
  plates.forEach(([off, rx, ry, mat], i) => {
    const c = at(base, s.torso, off);
    d.ellipse({ mat, z: z + i * 0.05, group: g + i, shade, line: 'soft' }, c, rx, ry, s.torso - 90);
  });
}

/** Plate tasset over the thigh: two overlapping lames edged in gold. */
function tasset(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  const across = th + 90;
  for (const [a, b, w, k] of [[-0.5, 5.2, 6.0, 0], [4.2, 9.6, 5.6, 1]] as const) {
    d.capsule({ mat: EB, z: z + k * 0.1, group: 'tasset' + side + k, shade, line: 'soft' }, at(hip, th, a), at(hip, th, b), w, w - 0.4, 0.45);
    const rim = at(hip, th, b + w - 1.4);
    d.capsule({ mat: GD, z: z + k * 0.1 + 0.05, group: 'tasset' + side + k, shade, line: 'none' }, at(rim, across, -(w - 1.2)), at(rim, across, w - 1.2), 0.7, 0.7);
  }
}

/** Terracotta cloth falling between the legs, woven with gold and ebony bands. */
function apron(d: Draw, s: Skel, z: number, wave: number) {
  const flapAng = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2)) + Math.sin(wave) * 1.5;
  const a0 = s.T(0.8, 1.6), a1 = s.T(0.8, 9.2);
  const a2 = at(a1, flapAng + 4, 17), a3 = at(a0, flapAng - 2, 17.5);
  d.poly({ mat: TC, z, group: 'apron', tex: (h) => (Math.abs(h.v) < 0.2 ? -1 : 0) }, [a0, a1, a2, a3], { kind: 'cyl', a: lerpV(a0, a1, 0.5), b: lerpV(a2, a3, 0.5), r: 4.2, bevel: 1 });
  const bands: [typeof GD, number][] = [
    [GD, 0.6],
    [EB, 0.72],
    [GD, 0.84],
  ];
  for (const [mat, k] of bands) d.capsule({ mat, z: z + 0.1, group: 'apron', line: 'none' }, lerpV(a0, a3, k), lerpV(a1, a2, k), 0.8, 0.8);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  const ha = s.headDir - 90;
  // neck: a short column of stacked collars
  d.capsule({ mat: EB, z: 37, group: 'neck' }, s.neck, H(0, -3.6), 4.6, 4.0);
  for (let k = 0; k < 2; k++) {
    const c = lerpV(s.neck, H(0, -4.2), 0.25 + k * 0.45);
    d.capsule({ mat: GD, z: 37.1 + k * 0.01, group: 'collar' + k, line: 'soft' }, at(c, s.headDir + 90, -4.6), at(c, s.headDir + 90, 4.6), 0.8, 0.8);
  }
  // helmet dome
  d.ellipse({ mat: EB, z: 39, group: 'head' }, H(-1, 0.8), 6.6, 7.2, ha);
  // the gold mask: a long oval face with a brow ridge
  d.poly(
    { mat: GD, z: 39.3, group: 'mask', line: 'soft' },
    [H(0.6, 5.6), H(5.4, 4.8), H(7.0, 1.6), H(7.4, -2.4), H(6.4, -6.0), H(3.6, -7.8), H(0.8, -7.0), H(-0.2, -1.0)],
    { kind: 'cyl', a: H(4, 6), b: H(4, -8), r: 4.6, bevel: 1 },
  );
  d.capsule({ mat: GD, z: 39.4, group: 'mask', line: 'none' }, H(1.4, 2.4), H(6.8, 2.2), 0.8, 0.8);
  d.capsule({ mat: GD, z: 39.4, group: 'mask', line: 'none' }, H(6.9, 1.4), H(7.8, -2.6), 0.9, 0.7);
  // slit eyes of light and a narrow mouth
  const e = HL.ramp[(P.eye ?? 0) > 0 ? 5 : 4];
  d.pixels({ mat: GD, z: 39.5, group: 'mask' }, [
    { p: H(3.2, 0.6), c: HL.ramp[3] },
    { p: H(4.1, 0.6), c: e },
    { p: H(5.0, 0.5), c: e },
    { p: H(4.6, -4.6), c: EB.ramp[1] },
    { p: H(5.5, -4.6), c: EB.ramp[1] },
  ]);
}

/** Sunburst crest: gold rods fanning out behind the head, tipped with light. */
function crest(d: Draw, s: Skel, glow: number) {
  const H = s.H;
  const rods: [number, number][] = [
    [52, 8],
    [72, 12],
    [92, 15],
    [112, 16],
    [132, 15],
    [152, 12.5],
    [172, 10],
    [192, 7],
  ];
  rods.forEach(([a, len], i) => {
    const r = a * D2R;
    const b = H(-1.8, 3.0);
    const tip = H(-1.8 + Math.cos(r) * len, 3.0 + Math.sin(r) * len);
    d.capsule({ mat: GD, z: 4 + i * 0.01, group: 'rod' + i, line: 'soft' }, b, tip, 1.0, 0.6);
    d.circle({ mat: i % 2 ? HL : GG, z: 4.5 + i * 0.01, group: 'tip' + i, shade: Math.round(glow) }, tip, i % 2 ? 1.3 : 1.7);
  });
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 86,
  head: 86,
  legN: { ik: v(-12, 3) },
  legF: { ik: v(12, 3) },
  armN: { up: -100, lo: -84 },
  armF: { up: -76, lo: -62 },
  p: { core: 0, crest: 0, wave: 0, eye: 0, fist: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  // slow, heavy breathing; the core brightens on each breath
  return tweak(IDLE, {
    y: -b,
    torso: 86 + b,
    armN: { up: -100 + b * 2, lo: -84 + b * 3 },
    armF: { up: -76 + b * 2, lo: -62 + b * 3 },
    p: { core: b, crest: b, wave: a, eye: t > 0.5 ? 1 : 0, fist: 0 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -2 : 0;
  const ft = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (sn > 0 ? 6 * sn : 0), ang: sn > 0 ? -18 * sn : 0 };
  };
  const n = ft(a), f = ft(a + Math.PI);
  return pose({
    y: bob - 1,
    torso: 76,
    head: 82,
    legN: { ik: v(n.x, n.y) },
    legF: { ik: v(f.x, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -60 - Math.cos(a) * 26, lo: -10 - Math.cos(a) * 20 },
    armF: { up: -60 + Math.cos(a) * 26, lo: -10 + Math.cos(a) * 20 },
    p: { core: 1, crest: 0, wave: a * 2, eye: 1, fist: 0 },
  });
}

// Gravity Fist: the fist draws back, gravity gathers, and it lands.
const GF_WIND = pose({
  x: -4, torso: 98, head: 90,
  legN: { ik: v(-13, 3) }, legF: { ik: v(9, 3) },
  armN: { up: -150, lo: -120 }, armF: { up: -30, lo: 20 },
  p: { core: 1, crest: 1, wave: 1, eye: 1, fist: 1 },
});
const GF_PUNCH = pose({
  x: 10, y: -3, torso: 70, head: 78,
  legN: { ik: v(-12, 3) }, legF: { ik: v(17, 3) },
  armN: { up: 0, lo: 2 }, armF: { up: -110, lo: -80 },
  p: { core: 2, crest: 1, wave: 2, eye: 1, fist: 1 },
});

// Magnetic Pull: palms thrust out, then drag the enemy line in.
const MP_REACH = pose({
  x: 3, y: -2, torso: 76, head: 82,
  legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) },
  armN: { up: 6, lo: 10 }, armF: { up: 14, lo: 22 },
  p: { core: 1, crest: 1, wave: 1, eye: 1, fist: 0 },
});
const MP_PULL = pose({
  x: -3, y: -3, torso: 100, head: 92,
  legN: { ik: v(-14, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -40, lo: 50 }, armF: { up: -30, lo: 66 },
  p: { core: 2, crest: 2, wave: 2, eye: 1, fist: 1 },
});

// Starfall Protocol: arms to the sky, the core flares, the stars are called down.
const SF_RAISE = pose({
  y: 2, torso: 96, head: 112,
  legN: { ik: v(-12, 3) }, legF: { ik: v(12, 3) },
  armN: { up: 104, lo: 96 }, armF: { up: 78, lo: 84 },
  p: { core: 2, crest: 2, wave: 1, eye: 1, fist: 0 },
});
const SF_SLAM = pose({
  x: 6, y: -6, torso: 66, head: 74,
  legN: { ik: v(-13, 3) }, legF: { ik: v(14, 3) },
  armN: { up: -50, lo: -70 }, armF: { up: -40, lo: -60 },
  p: { core: 2, crest: 2, wave: 2, eye: 1, fist: 1 },
});

const HURT = pose({
  x: -4, torso: 100, head: 104,
  legN: { ik: v(-13, 3) }, legF: { ik: v(8, 4) },
  armN: { up: -110, lo: -80 }, armF: { up: -40, lo: -10 },
  p: { core: 0, crest: 0, wave: 2, eye: 0, fist: 0 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -14, torso: 74, head: 58,
  legN: { ik: v(-16, 3) }, legF: { ik: v(9, 3) }, footN: -60,
  armN: { up: -92, lo: -90 }, armF: { up: -76, lo: -70 },
  p: { core: 0, crest: -1, wave: 1, eye: 0, fist: 0 },
});
const DEATH_FALL = pose({
  x: 2, y: -22, torso: 30, head: 14,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { core: -1, crest: -1, wave: 1.6, eye: -1, fist: 0 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { core: -2, crest: -2, wave: 2, eye: -1, fist: 0 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'colossus',
  name: 'Mwamba',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 160, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, GF_WIND, 0.5), 90],
        [GF_WIND, 220],
        [mid(GF_WIND, GF_PUNCH, 0.55), 50],
        [GF_PUNCH, 80, { hit: true }],
        [tweak(GF_PUNCH, { x: 11, torso: 68, p: { core: 1 } }), 240],
        [mid(GF_PUNCH, IDLE, 0.5), 120],
        [IDLE, 100],
      ]),
    },
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, MP_REACH, 0.5), 90],
        [MP_REACH, 200],
        [tweak(MP_REACH, { x: 4, p: { core: 2, wave: 1.4 } }), 140],
        [mid(MP_REACH, MP_PULL, 0.5), 60],
        [MP_PULL, 90, { hit: true }],
        [tweak(MP_PULL, { x: -4, torso: 102, p: { wave: 2.6 } }), 260],
        [mid(MP_PULL, IDLE, 0.5), 120],
        [IDLE, 100],
      ]),
    },
    attack3: {
      loop: false,
      frames: keys([
        [mid(IDLE, SF_RAISE, 0.5), 100],
        [SF_RAISE, 160, { event: 'cast' }],
        [tweak(SF_RAISE, { y: 3, head: 116, p: { wave: 1.5 } }), 220],
        [mid(SF_RAISE, SF_SLAM, 0.5), 60],
        [SF_SLAM, 90, { hit: true }],
        [tweak(SF_SLAM, { y: -7, torso: 64, p: { wave: 2.6, core: 1 } }), 300],
        [mid(SF_SLAM, IDLE, 0.5), 130],
        [IDLE, 100],
      ]),
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 100],
        [tweak(HURT, { x: -3, torso: 96, head: 98 }), 120],
        [mid(HURT, IDLE, 0.6), 120],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 140],
        [mid(HURT, DEATH_KNEEL, 0.5), 130],
        [DEATH_KNEEL, 280],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 160],
        [tweak(DEATH_DOWN, { y: -28 }), 700],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** Huge armored fist for the icons: gold gauntlet, ebony fist, glowing knuckles. */
function iconFist(d: Draw, c: V, ang: number, z: number) {
  const f = d.frame(c, ang);
  d.capsule({ mat: GD, z, group: 'fa' }, f(-17, 0), f(-4, 0), 5.0, 6.4);
  d.capsule({ mat: MAT.glowCyan, z: z + 0.04, group: 'fa', line: 'none', shade: -1 }, f(-15, -1.6), f(-6.5, -2.2), 0.6, 0.6);
  d.capsule({ mat: EB, z: z + 0.05, group: 'fa', line: 'none' }, f(-4.6, -6.4), f(-4.6, 6.4), 1.1, 1.1);
  d.ellipse({ mat: EB, z: z + 0.1, group: 'ff' }, f(1.4, 0), 7.2, 6.4, ang);
  d.capsule({ mat: GG, z: z + 0.2, group: 'ff', line: 'none' }, f(5.6, -4.8), f(5.6, 4.8), 1.6, 1.6);
}

/** A forged star: four long points, glowing. */
function iconStar(d: Draw, x: number, y: number, r: number, z: number) {
  d.poly({ mat: GG, z, group: 'st' + x }, [v(x, y + r * 1.7), v(x + r * 0.42, y + r * 0.42), v(x + r * 1.7, y), v(x + r * 0.42, y - r * 0.42), v(x, y - r * 1.7), v(x - r * 0.42, y - r * 0.42), v(x - r * 1.7, y), v(x - r * 0.42, y + r * 0.42)], { kind: 'bevel', w: 1.6 });
}

export const colossus: ChampionArt = {
  char,
  iconBg: MAT.terracotta,
  icons: {
    gravity_fist: () =>
      compose(MAT.terracotta, glyph((d) => {
        iconFist(d, v(19, 19), 20, 10);
      }), (b) => {
        for (const [r, a] of [[17, 120], [13, 170], [9, 220]] as const) ellipseRing(b, 31, 15, r * 0.55, r, 1, () => withAlpha(MAT.glowCyan.ramp[4], a));
        speedLines(b, [[2, 30, 8, 27], [2, 24, 7, 22], [4, 36, 10, 32]], C.goldHot);
      }),
    magnetic_pull: () =>
      compose(MAT.terracotta, glyph((d) => {
        d.circle({ mat: GD, z: 10, group: 'ring' }, v(20, 20), 7);
        d.circle({ mat: GG, z: 10.1, group: 'ring', line: 'none', shade: 1 }, v(20, 20), 5);
        for (let k = 0; k < 4; k++) {
          const a = 45 + k * 90;
          const o = v(20 + dir(a).x * 16, 20 + dir(a).y * 16);
          const f = d.frame(o, a + 180);
          d.ribbon({ mat: MAT.glowCyan, z: 10.2, group: 'chev' + k }, [f(0, -3.4), f(3.4, 0), f(0, 3.4)], [1.0, 1.2, 1.0]);
        }
      }), (b) => {
        ellipseRing(b, 20, 20, 13, 13, 1, (x, y, a) => (Math.sin(a * 8) > 0 ? withAlpha(MAT.glowCyan.ramp[4], 190) : 0));
      }),
    starfall_protocol: () =>
      compose(MAT.terracotta, glyph((d) => {
        iconStar(d, 24, 26, 4.6, 10);
        iconStar(d, 11, 17, 3.2, 10.1);
        iconStar(d, 29, 11, 2.6, 10.2);
      }), (b) => {
        speedLines(b, [[37, 3, 29, 11], [35, 2, 28, 9], [24, 13, 14, 21], [22, 12, 13, 19], [38, 18, 32, 26]], C.goldHot);
        for (const [r, a] of [[14, 160], [9, 210]] as const) ellipseRing(b, 12, 37, r, r * 0.35, 1, () => withAlpha(C.goldHot, a));
        impactStar(b, 12, 35, 1, 6, 10, C.goldHot, C.white);
      }),
  },
};
