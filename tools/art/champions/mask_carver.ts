// The Mask Carver (docs/DESIGN_DECISIONS.md section 96, Jakub's brief of
// 2026-11-07: an Elite Support of the Court of Root, Ember, the batch's
// human): a wiry woman of middle age on the Junior Ward's rig. A straw skirt
// to the knee, its hem a fringe; a wrap of bark-cloth over the chest, bare
// arms and legs, white paint in bands down her arms, barefoot; long dark hair
// in a tail down her back; a carved owl mask pushed up on her head (wood, two
// great pale eye rings, a beak); small bark masks of beasts on cords at her
// belt; a curved carving knife in her near hand. Lend a Face holds out a mask
// from her belt. Grown, not issued: no insignia (the Court's look). Her
// affinity (Ember) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, foldTex, leg, robe, RobeCfg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { RGBA } from '../raster.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16.4,
  shin: 16.2,
  ankleH: 3,
  footLen: 5.8,
  spine: 21,
  neck: 6.4,
  upperArm: 12.4,
  foreArm: 11.8,
  shoulderDrop: 3.8,
  shoulderN: -2.6,
  shoulderF: 2.8,
  hipN: -1.4,
  hipF: 1.4,
};

const SK = MAT.skinTan, ST = MAT.straw, BA = MAT.bark, WD = MAT.wood, BO = MAT.bone, HR = MAT.hairBrown, IR = MAT.steel, LE = MAT.leather;
const E = ACCENT;

// the straw skirt to the knee, a fringe along its hem
const ROBE: RobeCfg = { waist: [1.2, 5.6, 6.0], hemDrop: -15, hemFloor: 16, hemBack: [5, 5], hemFront: [4.6, 4.4], midBack: [4.6, 3.6], midFront: [4.0, 3.0], ripple: 0.6, zigzag: 1.4 };

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  hairTail(d, s, 8);
  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(20, -1));
  paint(d, s, 'F', 20.5);
  if (P.holdMask) smallMask(d, v(s.hF.x + 1, s.hF.y + 3), 0, BA, 21);
  skirt(d, s, wave, 28);
  wrap(d, s, 30);
  beltMasks(d, s, 31);
  head(d, s, P, 38);
  leg(d, s, 'N', legCfg(26, 0));
  if (!P.drop) knife(d, s.hN, P.knAng ?? -50, 55);
  else knife(d, v(16, 2.4), 0, 55);
  arm(d, s, 'N', armCfg(60, 0));
  paint(d, s, 'N', 60.5);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: SK, shin: SK, foot: SK, rThigh: [3.6, 2.8] as [number, number], rShin: [2.6, 2.2] as [number, number], z, shade, footStyle: 'bare' as const,
});

const armCfg = (z: number, shade: number) => ({
  upper: SK, fore: SK, hand: SK, rUp: [2.5, 2.1] as [number, number], rLo: [2.1, 1.8] as [number, number], rHand: 1.9, z, shade,
});

/** White paint in bands across the arm, 1 px lines across the limb (ART_GUIDE: markings on bare skin). */
function paint(d: Draw, s: Skel, side: 'N' | 'F', z: number) {
  const sh = side === 'N' ? s.sN : s.sF, el = side === 'N' ? s.eN : s.eF, ha = side === 'N' ? s.hN : s.hF;
  const px: { p: V; c: RGBA }[] = [];
  const c = BO.ramp[side === 'N' ? 5 : 4];
  for (const [a, b] of [[sh, el], [el, ha]] as const) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 57.29578;
    for (const t of [0.35, 0.6]) {
      const m = at(a, ang, Math.hypot(b.x - a.x, b.y - a.y) * t);
      for (const k of [-1.4, -0.4, 0.6, 1.4]) px.push({ p: at(m, ang + 90, k), c });
    }
  }
  d.pixels({ mat: SK, z, group: 'arm' + side, line: 'none', outline: false }, px);
}

function skirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: ST, z, group: 'skirt', tex: foldTex(14, wave * 0.6, 0.8) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
}

/** The bark-cloth wrap over the chest, a cord belt at the waist. */
function wrap(d: Draw, s: Skel, z: number) {
  const pts = torsoPts(s, [
    [1, 4.8, 5.0],
    [5, 4.4, 4.8],
    [9, 4.8, 5.6],
    [14, 5.4, 6.2],
    [17.6, 5.2, 5.4],
    [19.8, 3.8, 3.2],
    [21, 2.4, 2.0],
  ]);
  // her bare shoulders and neck above the wrap, the wrap itself from the waist to under the arms
  d.poly({ mat: SK, z: z - 0.2, group: 'torso' }, pts, { kind: 'cyl', a: s.T(1, 0.4), b: s.T(21, 0.4), r: 6, bevel: 1.2 });
  d.poly(
    { mat: BA, z, group: 'wrap', tex: (h) => (Math.sin(h.v * 14) > 0.7 ? -1 : Math.sin(h.u * 9) > 0.92 ? 1 : 0) },
    [s.T(1, -4.8), s.T(5, -4.6), s.T(9, -5.0), s.T(15.4, -5.6), s.T(17.6, -3.0), s.T(17.6, 5.6), s.T(14, 6.2), s.T(9, 5.6), s.T(5, 4.8), s.T(1, 5.0)],
    { kind: 'cyl', a: s.T(1, 0.4), b: s.T(17.6, 0.4), r: 6, bevel: 1.2 },
  );
  d.poly({ mat: LE, z: z + 0.2, group: 'belt' }, [s.T(2.4, -5.0), s.T(2.6, 5.4), s.T(1.2, 5.4), s.T(1.0, -4.8)], { kind: 'cyl', a: s.T(1, 0), b: s.T(2.6, 0), r: 5.4 });
}

/** A small mask of bark or wood: an oval face, two eye holes, a mark of the beast it is (`kind`: 0 plain, 1 ears, 2 tusks). */
function smallMask(d: Draw, c: V, kind: number, mat: typeof BA, z: number) {
  d.ellipse({ mat, z, group: 'mask' + z }, c, 2.2, 2.8, 90);
  if (kind === 1) for (const dx of [-1.8, 1.8]) d.poly({ mat, z: z - 0.05, group: 'mask' + z }, [v(c.x + dx - 0.8, c.y + 1.6), v(c.x + dx * 1.2, c.y + 4.0), v(c.x + dx + 0.8, c.y + 1.6)], { kind: 'bevel', w: 0.4 });
  const px: { p: V; c: RGBA }[] = [{ p: v(c.x - 0.9, c.y + 0.6), c: mat.ramp[0] }, { p: v(c.x + 0.9, c.y + 0.6), c: mat.ramp[0] }];
  if (kind === 2) px.push({ p: v(c.x - 1.2, c.y - 2.2), c: BO.ramp[5] }, { p: v(c.x + 1.2, c.y - 2.2), c: BO.ramp[5] });
  d.pixels({ mat, z: z + 0.1, group: 'mask' + z, line: 'none' }, px);
}

/** The masks on cords at her belt: three hanging at the front and the side. */
function beltMasks(d: Draw, s: Skel, z: number) {
  const hangs: [number, number, typeof BA][] = [[-4.2, 0, WD], [1.2, 1, BA], [5.0, 2, WD]];
  hangs.forEach(([w, kind, mat], i) => {
    const top = s.T(1.6, w);
    const c = v(top.x + 0.4, top.y - 4.4 - (i % 2));
    d.line({ mat: LE, z: z - 0.1, group: 'cord', line: 'none' }, top, v(c.x, c.y + 2.6), LE.ramp[2]);
    smallMask(d, c, kind, mat, z + i * 0.1);
  });
}

/** Her long dark hair, drawn back into a tail down her back. */
function hairTail(d: Draw, s: Skel, z: number) {
  const H = s.H;
  const root = H(-5.2, 2.4);
  const down = s.torso - 180;
  const p1 = at(root, down + 22, 5), p2 = at(p1, down + 10, 6), p3 = at(p2, down + 4, 5);
  d.ribbon({ mat: HR, z, group: 'tail', tex: (h) => (Math.sin(h.v * 12) > 0.6 ? -1 : 0) }, [root, p1, p2, p3], [2.0, 2.0, 1.6, 0.8]);
}

/** A lean face, dark hair drawn back, the owl mask pushed up on her head (or pulled down over her face: `maskDown`). */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  d.capsule({ mat: SK, z: z - 0.5, group: 'neck' }, s.neck, H(0, -4), 2.2, 2.0);
  face(d, s, { skin: SK, z, brow: HR.ramp[1], browStyle: P.grit ? 'angry' : 'calm', mouth: P.grit ? 'shout' : 'line', lip: SK.ramp[2], rx: 5.4, ry: 6.4, profile: 'soft' });
  d.poly(
    { mat: HR, z: z + 0.6, group: 'hair' },
    [H(4.6, 3.4), H(4.2, 6.2), H(1.2, 7.8), H(-3.0, 8.0), H(-6.2, 5.6), H(-6.8, 1.2), H(-5.6, -2.4), H(-3.8, -1.2), H(-2.6, 2.0), H(0.4, 4.0)],
    { kind: 'dome', c: H(-1, 3.2), r: 8, bevel: 1 },
  );
  // the owl mask: up on the crown of her head, or down over her face
  const down = P.maskDown ?? 0;
  const mc = down ? H(3.4, 1.4) : H(0.6, 8.6);
  const ma = down ? s.headDir - 90 : s.headDir - 90 + 70;
  const f = d.frame(mc, ma);
  d.poly({ mat: WD, z: z + 0.8, group: 'owl', tex: (h) => (Math.sin(h.u * 18) > 0.8 ? -1 : 0) }, [f(-4.6, 3.6), f(-2, 5.4), f(2, 5.4), f(4.6, 3.6), f(4.4, -1.6), f(1.2, -4.8), f(-1.2, -4.8), f(-4.4, -1.6)], { kind: 'dome', c: f(0, 0.6), r: 6, bevel: 1 });
  // the eye rings, the beak
  for (const x of [-2.2, 2.2]) d.circle({ mat: BO, z: z + 0.9, group: 'owlEye' }, f(x, 1.4), 1.8);
  d.pixels({ mat: BO, z: z + 1.0, group: 'owlEye', line: 'none' }, [{ p: f(-2.2, 1.4), c: WD.ramp[0] }, { p: f(2.2, 1.4), c: WD.ramp[0] }]);
  d.poly({ mat: BO, z: z + 0.95, group: 'beak' }, [f(-0.9, 0.2), f(0.9, 0.2), f(0, -2.6)], { kind: 'bevel', w: 0.4 });
}

/** The curved carving knife: a short wooden grip, a small hooked blade. */
function knife(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: WD, z, group: 'kGrip' }, f(-2.4, 0), f(1.8, 0), 1.0, 1.0);
  d.poly({ mat: IR, z: z + 0.1, group: 'kBlade' }, [f(1.6, -0.9), f(5, -1.4), f(7.6, -0.2), f(8.4, 1.8), f(6.4, 0.8), f(1.6, 0.8)], { kind: 'bevel', w: 0.6 });
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// At rest: weight on one hip, the knife held low, the far hand on a mask at her belt.
const IDLE = pose({
  y: -1, torso: 90, head: 92,
  legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) },
  armN: { ik: v(10, 30), bend: -1 }, armF: { ik: v(4, 34), bend: -1 },
  p: { knAng: -40 },
});

function idle(t: number): Pose {
  const b = Math.round((1 - Math.cos(t * Math.PI * 2)) / 2);
  return tweak(IDLE, { y: -1 - b, p: { wave: t } });
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
    y: bob - 2, torso: 78, head: 84,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armN: { up: -70 + sw * 24, lo: -30 + sw * 24 }, armF: { up: -70 - sw * 24, lo: -30 - sw * 24 },
    p: { knAng: -10, wave: t },
  });
}

// Carving Knife: the knife drawn back high, then a quick hooked cut down across the enemy.
const CK_DRAW = pose({ x: -2, y: -1, torso: 94, head: 92, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, armN: { ik: v(-2, 54), bend: 1 }, armF: { ik: v(8, 34), bend: -1 }, p: { knAng: 120 } });
const CK_CUT = pose({ x: 6, y: -3, torso: 80, head: 84, legN: { ik: v(-11, 3) }, legF: { ik: v(12, 3) }, armN: { ik: v(22, 34), bend: -1 }, armF: { up: -120, lo: -100 }, p: { knAng: -60, grit: 1, wave: 0.5 } });
const CK_HOLD = tweak(CK_CUT, { x: 5, p: { grit: 0 } });

// Lend a Face: she unhooks a mask from her belt and holds it out toward her side, then lets it go.
const LF_TAKE = pose({ y: -1, torso: 88, head: 80, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) }, armN: { ik: v(10, 30), bend: -1 }, armF: { ik: v(4, 30), bend: -1 }, p: { knAng: -40, holdMask: 1 } });
const LF_OFFER = pose({ y: -1, torso: 92, head: 96, legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) }, armN: { ik: v(10, 30), bend: -1 }, armF: { ik: v(18, 52), bend: -1 }, p: { knAng: -40, holdMask: 1, wave: 0.4 } });
const LF_LET = tweak(LF_OFFER, { armF: { ik: v(16, 56), bend: -1 }, p: { holdMask: 0 } });

const HURT = pose({ x: -4, y: -1, torso: 98, head: 104, legN: { ik: v(-10, 3) }, legF: { ik: v(7, 4) }, footF: 10, armN: { up: -130, lo: -90 }, armF: { up: -110, lo: -80 }, p: { grit: 1 } });

// Death: she sinks to her knees and falls on her side.
const DEATH_KNEEL = pose({ x: 0, y: -12, torso: 80, head: 66, legN: { ik: v(-11, 3) }, legF: { ik: v(7, 3) }, footN: -30, armN: { up: -80, lo: -60 }, armF: { up: -90, lo: -70 }, p: {} });
const DEATH_FALL = pose({ x: 2, y: -6, torso: 30, head: 16, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { drop: 1 } });
const DEATH_DOWN = pose({ x: 6, y: -15, torso: 4, head: -2, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { drop: 1 } });

// Victory: she pulls the owl mask down over her face.
const VIC_REACH = pose({ y: -1, torso: 90, head: 94, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) }, armN: { ik: v(10, 30), bend: -1 }, armF: { ik: v(4, 66), bend: 1 }, p: { knAng: -40 } });
const VIC_MASK = tweak(VIC_REACH, { armF: { ik: v(8, 58), bend: 1 }, p: { maskDown: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'mask_carver',
  name: 'Mask Carver',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 190, idle) },
    run: { loop: true, frames: cycle(8, 78, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CK_DRAW, 2, 80, ease.out),
        ...keys([
          [CK_DRAW, 180],
          [CK_CUT, 70, { hit: true, smear: true }],
          [CK_HOLD, 220],
        ]),
        ...tween(D, CK_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, LF_TAKE, 2, 100, ease.out),
        ...keys([
          [LF_TAKE, 200],
          [mid(LF_TAKE, LF_OFFER, 0.5), 90],
          [LF_OFFER, 160, { event: 'cast' }],
          [LF_LET, 120, { hit: true }],
          [LF_LET, 300],
        ]),
        ...tween(D, LF_LET, IDLE, 3, 120, ease.inOut),
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
        [DEATH_KNEEL, 240],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -15.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, VIC_REACH, 0.5), 110],
        [VIC_REACH, 200],
        [VIC_MASK, 800],
        [mid(VIC_MASK, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons
// ---------------------------------------------------------------------------

/** A big carved mask for the icons. */
function iconMask(d: Draw, c: V, k: number, mat: typeof WD, z: number, owl = false) {
  d.ellipse({ mat, z, group: 'im' + z }, c, 7 * k, 9 * k, 90);
  for (const x of [-3, 3]) {
    if (owl) d.circle({ mat: BO, z: z + 0.1, group: 'ie' + z }, v(c.x + x * k, c.y + 2 * k), 2.6 * k);
    d.circle({ mat: MAT.charcoal, z: z + 0.2, group: 'ip' + z }, v(c.x + x * k, c.y + 2 * k), 1.1 * k);
  }
  if (owl) d.poly({ mat: BO, z: z + 0.15, group: 'ib' + z }, [v(c.x - 1.4 * k, c.y), v(c.x + 1.4 * k, c.y), v(c.x, c.y - 4 * k)], { kind: 'bevel', w: 0.6 });
}

export const maskCarver: ChampionArt = {
  char,
  iconBg: BA,
  icons: {
    carving_knife: () =>
      compose(BA, glyph((d) => {
        const f = d.frame(v(6, 8), 45);
        d.capsule({ mat: WD, z: 10, group: 'ikg' }, f(0, 0), f(9, 0), 2.4, 2.4);
        d.poly({ mat: IR, z: 10.1, group: 'ikb' }, [f(9, -2), f(20, -3), f(28, 0), f(30, 5), f(24, 2), f(9, 2)], { kind: 'bevel', w: 1.2 });
      }), (b) => {
        for (const [x, y] of [[30, 30], [33, 27], [27, 33]] as const) b.set(x, y, E.white);
      }),
    lend_a_face: () =>
      compose(BA, glyph((d) => {
        iconMask(d, v(20, 20), 1.6, WD, 10, true);
      })),
    many_faces: () =>
      compose(BA, glyph((d) => {
        iconMask(d, v(11, 24), 1.0, WD, 10);
        iconMask(d, v(29, 24), 1.0, BA, 11);
        iconMask(d, v(20, 14), 1.1, WD, 12, true);
      })),
  },
};
