// Vorhaal, the Dread Knight — enemy bruiser. Black spiked plate with violet
// rune-light, ivory horns, tattered violet cape and a two-handed rune
// greatsword. Signature color: black + violet glow.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { arm, cape, leg, smear, sword, torsoPts } from '../parts.ts';
import { hex } from '../raster.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, solve, tweak, V, v } from '../rig.ts';
import { ellipseRing } from '../paint.ts';
import { rng, withAlpha } from '../raster.ts';
import { C, compose, glyph, skull as skullGlyph } from '../icons.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16.5,
  shin: 16.5,
  ankleH: 3,
  footLen: 7,
  spine: 22.5,
  neck: 7.8,
  upperArm: 13.5,
  foreArm: 12.5,
  shoulderDrop: 4.5,
  shoulderN: -3.6,
  shoulderF: 4.2,
  hipN: -2,
  hipF: 2,
};

const DS = MAT.darksteel, VI = MAT.violet, GV = MAT.glowViolet, BO = MAT.bone, DL = MAT.darkleather;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const swordAng = P.swordAng ?? 60;

  // tattered cape
  cape(d, s, { mat: VI, z: 2, len: 34, topU: 20, topBack: 7.5, topFront: 1, spread: 9, wind: P.cape ?? 0.15, wave: P.wave ?? 0, tatters: 3.4 });

  if (info.def.smear && info.prev) {
    smear(d, s.hN, info.prev.pose.p.swordAng ?? swordAng, swordAng, 50, 15, { core: ACCENT.smearLilac, edge: ACCENT.smearViolet }, 3);
  }

  // far horn sits behind the helmet
  horn(d, s, 'F');

  // far leg
  leg(d, s, 'F', { thigh: DS, shin: DS, foot: DS, knee: DS, kneeR: 3.6, rThigh: [4.8, 3.9], rShin: [3.7, 3.0], z: 10, shade: -1, footStyle: 'sabaton' });
  kneeSpike(d, s, 'F', 10.5, -1);

  // far arm
  arm(d, s, 'F', { upper: DS, fore: DS, hand: DS, rUp: [3.6, 3.1], rLo: [3.2, 2.9], rHand: 2.9, z: 20, shade: -1, elbow: DS, cuff: DS });
  pauldron(d, s, 'F', 29, -1);

  // torso
  const torso = torsoPts(s, [
    [0, 6.8, 6.8],
    [4, 7.0, 7.4],
    [9, 7.6, 8.6],
    [14, 8.4, 9.6],
    [18.5, 8.6, 8.6],
    [21, 6.6, 5.6],
    [22.8, 3.6, 3],
  ]);
  d.poly({ mat: DS, z: 30, group: 'body' }, torso, { kind: 'cyl', a: s.T(0, 1), b: s.T(22.5, 1), r: 8.8, bevel: 1.5 });
  // plate seam + glowing rune sigil on the chest
  d.capsule({ mat: DS, z: 30.1, group: 'body', flat: 1, line: 'none' }, s.T(15.5, -3), s.T(14.5, 8.8), 0.55, 0.55);
  const g = GV.ramp;
  const c = s.T(11.2, 4.6);
  d.pixels({ mat: DS, z: 30.3, group: 'body' }, [
    { p: c, c: g[5] }, { p: v(c.x - 1, c.y + 1), c: g[4] }, { p: v(c.x + 1, c.y + 1), c: g[4] }, { p: v(c.x, c.y - 1), c: g[4] },
    { p: v(c.x, c.y - 2), c: g[3] }, { p: v(c.x - 2, c.y + 2), c: g[3] }, { p: v(c.x + 2, c.y + 2), c: g[3] },
  ]);
  // belt + skull buckle
  d.poly({ mat: DL, z: 33, group: 'body' }, [s.T(3.6, -7.2), s.T(3.8, 7.6), s.T(0.4, 7.3), s.T(0.1, -7)], { kind: 'cyl', a: s.T(0, 0), b: s.T(4, 0), r: 7.4 });
  skull(d, s.T(2.1, 6.7), 33.4);

  // faulds + tattered loincloth
  const flapAng = Math.max(-122, Math.min(-58, (s.thN + s.thF) / 2));
  const f0 = s.T(0.6, -3), f1 = s.T(0.6, 7);
  const f2 = at(f1, flapAng + 6, 15.5), f3 = at(f0, flapAng - 4, 14.5);
  const mid1 = lerpV(f2, f3, 0.33), mid2 = lerpV(f2, f3, 0.66);
  d.poly(
    { mat: VI, z: 35, group: 'loin' },
    [f0, f1, f2, at(mid1, flapAng, -3), mid1, at(mid2, flapAng, -2.4), mid2, f3],
    { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 5, bevel: 1 },
  );
  for (const side of ['N', 'F'] as const) {
    const hip = side === 'N' ? s.hipN : s.hipF;
    const th = side === 'N' ? s.thN : s.thF;
    d.capsule({ mat: DS, z: side === 'N' ? 52 : 11, group: 'fauld' + side, shade: side === 'F' ? -1 : 0 }, at(hip, th, -0.5), at(hip, th, 8.5), 5.0, 4.4, 0.35);
  }

  helmet(d, s, P);

  // near leg
  leg(d, s, 'N', { thigh: DS, shin: DS, foot: DS, knee: DS, kneeR: 3.6, rThigh: [4.8, 3.9], rShin: [3.7, 3.0], z: 50, footStyle: 'sabaton' });
  kneeSpike(d, s, 'N', 50.5, 0);

  // greatsword (both hands) + near arm
  sword(d, s.hN, swordAng, { blade: DS, guard: DS, grip: DL, pommel: DS, len: 46, width: 5.6, guardW: 6.5, gripLen: 9, z: 56, group: 'sword', rune: GV });
  const gf = d.frame(s.hN, swordAng);
  d.circle({ mat: GV, z: 56.4, group: 'sword' }, gf(2.8, 0), 1.3);
  d.poly({ mat: DS, z: 56.3, group: 'sword' }, [gf(1.6, -6.4), gf(5.4, -8.4), gf(4.2, -6.2)], { kind: 'bevel', w: 1 });
  d.poly({ mat: DS, z: 56.3, group: 'sword' }, [gf(1.6, 6.4), gf(5.4, 8.4), gf(4.2, 6.2)], { kind: 'bevel', w: 1 });
  arm(d, s, 'N', { upper: DS, fore: DS, hand: DS, rUp: [3.7, 3.2], rLo: [3.3, 3.0], rHand: 3.0, z: 60, elbow: DS, cuff: DS });
  elbowSpike(d, s, 60.5);
  pauldron(d, s, 'N', 62, 0);
  horn(d, s, 'N');
}

function pauldron(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  const c = at(at(sh, up, 1.0), s.torso, 1.4);
  const g = 'paul' + side;
  // spikes first so the dome overlaps their roots
  const f = d.frame(c, s.torso);
  d.poly({ mat: DS, z: z + 0.3, group: g + 's', shade }, [f(3.4, -5.6), f(12.5, -8.2), f(5.2, -1.8)], { kind: 'bevel', w: 1.2 });
  d.poly({ mat: DS, z: z + 0.3, group: g + 's', shade }, [f(4.6, -0.6), f(12.2, 2.6), f(4.6, 3.6)], { kind: 'bevel', w: 1.2 });
  d.ellipse({ mat: DS, z, group: g, shade }, c, 7.2, 6.0, up + 90, 0.1);
  d.ellipse({ mat: DS, z: z - 0.1, group: g, shade }, at(sh, up, 6.2), 6.0, 3.2, up + 90, 0.3);
  const rim = at(sh, up, 5.0);
  d.capsule({ mat: GV, z: z + 0.2, group: g, shade, line: 'none' }, at(rim, up + 90, -6.2), at(rim, up + 90, 6.2), 0.55, 0.55);
}

function kneeSpike(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const kn = side === 'N' ? s.kneeN : s.kneeF;
  const th = side === 'N' ? s.thN : s.thF;
  const f = d.frame(kn, th - 90 + 180);
  d.poly({ mat: DS, z: z + 0.3, group: 'leg' + side, shade }, [f(-1.8, 2.6), f(0.2, 7.4), f(1.8, 2.4)], { kind: 'bevel', w: 1 });
}

function elbowSpike(d: Draw, s: Skel, z: number) {
  const f = d.frame(s.eN, s.upN);
  d.poly({ mat: DS, z, group: 'armN' }, [f(-1.6, -2.4), f(1.2, -7.2), f(1.8, -2.4)], { kind: 'bevel', w: 1 });
}

function skull(d: Draw, c: V, z: number) {
  const b = BO.ramp, k = INK.eye;
  d.pixels({ mat: DL, z, group: 'body' }, [
    { p: v(c.x - 1, c.y + 1), c: b[4] }, { p: v(c.x, c.y + 1), c: b[4] }, { p: v(c.x + 1, c.y + 1), c: b[3] },
    { p: v(c.x - 1, c.y), c: k }, { p: v(c.x, c.y), c: b[3] }, { p: v(c.x + 1, c.y), c: k },
    { p: v(c.x - 1, c.y - 1), c: b[3] }, { p: v(c.x, c.y - 1), c: b[2] }, { p: v(c.x + 1, c.y - 1), c: b[2] },
  ]);
}

function horn(d: Draw, s: Skel, side: 'N' | 'F') {
  const H = s.H;
  const off = side === 'N' ? 0 : 2.6;
  const z = side === 'N' ? 41.5 : 36.5;
  const pts = [H(-2 + off, 4.4), H(-6.4 + off, 7.8), H(-6.8 + off, 12.8), H(-3.2 + off, 16.4), H(1.6 + off, 17.6)];
  d.ribbon({ mat: BO, z, group: 'horn' + side, shade: side === 'F' ? -1 : 0, tex: (h) => (Math.floor(h.u * 10) % 3 === 0 ? -1 : 0) }, pts, [2.5, 2.3, 1.8, 1.2, 0.6]);
}

function helmet(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  const ha = s.headDir - 90;
  d.capsule({ mat: DS, z: 38, group: 'head' }, s.neck, H(0.5, -4.5), 4.2, 3.8);
  // great helm: dome + flat face plate
  d.ellipse({ mat: DS, z: 40, group: 'head' }, H(-0.6, 1), 7.0, 7.6, ha);
  d.poly(
    { mat: DS, z: 40.2, group: 'head', line: 'soft' },
    [H(0.4, 5.6), H(6.4, 4.8), H(7.8, 1), H(7.6, -4.4), H(5.2, -7.6), H(0.4, -7.8), H(-1, -3)],
    { kind: 'cyl', a: H(3.5, 6), b: H(3.5, -8), r: 5.5, bevel: 1 },
  );
  // ridge
  d.capsule({ mat: DS, z: 40.3, group: 'head', line: 'soft' }, H(-6.6, 3.4), H(4, 7.8), 0.9, 0.9);
  // glowing T visor
  const e = GV.ramp;
  const bright = (P.eye ?? 0) > 0.5 ? e[5] : e[4];
  const pts: { p: V; c: number }[] = [];
  for (let x = 1.8; x <= 7.6; x += 0.9) pts.push({ p: H(x, 0.9), c: x > 4.5 ? bright : e[3] });
  for (let y = -0.2; y >= -4.4; y -= 0.9) pts.push({ p: H(6.6, y), c: e[2] });
  d.pixels({ mat: DS, z: 40.5, group: 'head' }, pts);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

/** Puts the far hand on the grip below the near hand. */
function grip(p: Pose, offset = -5.8): Pose {
  const s = solve(p, D);
  const ang = p.p.swordAng ?? 60;
  return tweak(p, { armF: { ik: at(s.hN, ang, offset), bend: -1 } });
}

const IDLE: Pose = grip(
  pose({
    torso: 84,
    head: 84,
    legN: { ik: v(-10, 3) },
    legF: { ik: v(10, 3) },
    armN: { up: -72, lo: -2 },
    p: { swordAng: 66, cape: 0.15, wave: 0, eye: 0 },
  }),
);

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return grip(
    tweak(IDLE, {
      y: -b,
      armN: { up: -72 + b * 2, lo: -2 + b * 2 },
      p: { swordAng: 66 + b, wave: a, eye: t < 0.5 ? 0 : 1, cape: 0.15 + Math.sin(a) * 0.04 },
    }),
  );
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const s = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (s > 0 ? 7 * s : 0), ang: s > 0 ? -24 * s : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 1,
    torso: 72,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -128 + sw * 8, lo: -110 + sw * 6 },
    armF: { up: -60 - sw * 30, lo: -10 - sw * 30 },
    p: { swordAng: -166 + sw * 4, cape: 0.9, wave: a * 2, eye: 1 },
  });
}

// Cursed Cleave: overhead two-handed slash.
const CC_WIND = grip(pose({
  x: -3, y: -1, torso: 98, head: 92,
  legN: { ik: v(-11, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 138, lo: 160 },
  p: { swordAng: 172, cape: 0.2, wave: 1, eye: 1 },
}));
const CC_PEAK = grip(tweak(CC_WIND, { x: -4, torso: 100, armN: { up: 146, lo: 172 }, p: { swordAng: 186, wave: 1.4 } }));
const CC_HIT = grip(pose({
  x: 8, y: -5, torso: 62, head: 76,
  legN: { ik: v(-9, 3) }, legF: { ik: v(18, 3) }, footN: -10,
  armN: { up: 4, lo: -14 },
  p: { swordAng: -32, cape: 0.6, wave: 2.4, eye: 1 },
}));
const CC_FOLLOW = grip(tweak(CC_HIT, { x: 9, y: -6, torso: 60, armN: { up: -34, lo: -50 }, p: { swordAng: -64, wave: 3 } }));

// Soul Rend: lunging thrust.
const SR_WIND = grip(pose({
  x: -5, y: -2, torso: 96, head: 88,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) },
  armN: { up: -150, lo: -176 },
  p: { swordAng: 4, cape: 0.2, wave: 1, eye: 1 },
}));
const SR_HIT = grip(pose({
  x: 10, y: -4, torso: 68, head: 80,
  legN: { ik: v(-8, 3) }, legF: { ik: v(20, 3) }, footN: -18,
  armN: { up: -8, lo: 2 },
  p: { swordAng: 2, cape: 0.7, wave: 2.2, eye: 1 },
}), -6.5);

// Dread Sweep: rising sweep from low behind to high front.
const DS_WIND = grip(pose({
  x: -4, y: -5, torso: 100, head: 90,
  legN: { ik: v(-13, 3) }, legF: { ik: v(9, 3) },
  armN: { up: -150, lo: -168 },
  p: { swordAng: -172, cape: 0.25, wave: 1, eye: 1 },
}));
const DS_HIT = grip(pose({
  x: 7, y: -2, torso: 76, head: 84,
  legN: { ik: v(-9, 3) }, legF: { ik: v(15, 3) },
  armN: { up: 40, lo: 50 },
  p: { swordAng: 46, cape: 0.7, wave: 2.4, eye: 1 },
}));
const DS_FOLLOW = grip(tweak(DS_HIT, { x: 7, torso: 82, armN: { up: 70, lo: 80 }, p: { swordAng: 78, wave: 3 } }));

const HURT = grip(pose({
  x: -4, torso: 101, head: 105,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -100, lo: -40 },
  p: { swordAng: 100, cape: 0.3, wave: 2, eye: 0 },
}));
const DEATH_KNEEL = pose({
  x: -2, y: -13, torso: 74, head: 60,
  legN: { ik: v(-16, 3) }, legF: { ik: v(9, 3) }, footN: -60,
  armN: { up: -90, lo: -88 }, armF: { up: -76, lo: -60 },
  p: { swordAng: -92, cape: 0.1, wave: 1, eye: 0 },
});
const DEATH_FALL = pose({
  x: 2, y: -22, torso: 30, head: 14,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { swordAng: -30, cape: 0.2, wave: 1.6, eye: 0 },
});
const DEATH_DOWN = pose({
  x: 6, y: -28, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { swordAng: 4, cape: 0.05, wave: 2, eye: -1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'dreadknight',
  name: 'Vorhaal',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 160, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    attack1: {
      loop: false,
      frames: [
        ...keys([
          [grip(mid(IDLE, CC_WIND, 0.5)), 90],
          [CC_WIND, 110],
          [CC_PEAK, 180],
          [CC_HIT, 70, { smear: true, hit: true }],
          [CC_FOLLOW, 220],
        ]),
        ...tween(D, CC_FOLLOW, IDLE, 2, 110, ease.inOut).map((f) => ({ ...f, pose: grip(f.pose) })),
      ],
    },
    attack2: {
      loop: false,
      frames: [
        ...keys([
          [grip(mid(IDLE, SR_WIND, 0.5)), 90],
          [SR_WIND, 220],
          [SR_HIT, 70, { hit: true }],
          [grip(tweak(SR_HIT, { x: 11, torso: 66, p: { wave: 2.8 } }), -6.5), 260, { event: 'drain' }],
        ]),
        ...tween(D, SR_HIT, IDLE, 2, 110, ease.inOut).map((f) => ({ ...f, pose: grip(f.pose) })),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...keys([
          [grip(mid(IDLE, DS_WIND, 0.5)), 90],
          [DS_WIND, 240],
          [grip(mid(DS_WIND, DS_HIT, 0.5)), 50, { smear: true }],
          [DS_HIT, 70, { smear: true, hit: true }],
          [DS_FOLLOW, 260],
        ]),
        ...tween(D, DS_FOLLOW, IDLE, 2, 110, ease.inOut).map((f) => ({ ...f, pose: grip(f.pose) })),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [grip(tweak(HURT, { x: -3, torso: 97, head: 100 })), 110],
        [grip(mid(HURT, IDLE, 0.6)), 110],
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

export const dreadknight: ChampionArt = {
  char,
  iconBg: MAT.violet,
  icons: {
    cursed_cleave: () =>
      compose(MAT.violet, glyph((d) => {
        smear(d, v(8, 8), 160, -20, 34, 9, { core: C.violetHot, edge: C.violet }, 1);
        sword(d, v(10, 10), 45, { blade: MAT.darksteel, guard: MAT.darksteel, grip: MAT.darkleather, pommel: MAT.darksteel, len: 28, width: 6, guardW: 7, gripLen: 5, z: 10, rune: MAT.glowViolet });
      })),
    soul_rend: () =>
      compose(MAT.violet, glyph((d) => {
        skullGlyph(d, v(20, 21), 1.35, 10, MAT.glowViolet, C.deepViolet);
      }), (b) => {
        const r = rng(9);
        for (let k = 0; k < 4; k++) {
          let x = 20 + (r() - 0.5) * 8, y = 31;
          for (let i = 0; i < 9; i++) {
            b.set(Math.round(x), Math.round(y), i < 3 ? C.violetHot : MAT.glowViolet.ramp[3 - Math.floor(i / 4)]);
            x += (k - 1.5) * 0.9;
            y += 0.8;
          }
        }
      }),
    dread_sweep: () =>
      compose(MAT.violet, glyph((d) => {
        smear(d, v(20, 6), 172, 8, 31, 12, { core: C.violetHot, edge: C.violet }, 2);
        sword(d, v(7, 17), 8, { blade: MAT.darksteel, guard: MAT.darksteel, grip: MAT.darkleather, pommel: MAT.darksteel, len: 27, width: 6, guardW: 7, gripLen: 4, z: 10, rune: MAT.glowViolet });
      }), (b) => {
        ellipseRing(b, 20, 33, 16, 4, 1.4, (x, y, a) => (a > 0 ? withAlpha(C.violet, 230) : withAlpha(C.violetHot, 200)));
        ellipseRing(b, 20, 33, 9, 2.2, 1, () => withAlpha(C.violet, 170));
      }),
  },
};
