// Coffin's Legs (docs/DESIGN_DECISIONS.md section 61, 2026-11-01, my proposal on
// Jakub's word): an Elite Tank of the Ashveil Reign, a dead giant of a mourner
// who carries a coffin before him as a shield and a ram. Broad and heavy, a
// black cowl over a bald grey head; his jaw bound shut with a strip of linen tied
// over his crown, the old way the dead are laid out; the Reign's pale light in his
// sunken eyes; a long charcoal coat to the knees, an iron chain across his chest;
// boots. The coffin (the silhouette feature, six-sided and taller than his torso)
// is of old dark wood with iron bands and corners and the Reign's white bone laid
// across its lid, held upright on his far arm, his near hand on its edge. When he
// falls the coffin falls flat beside him; when Not Yet Buried holds him he gets up
// again and takes it back. His affinity (Ember) sets nothing here (Jakub,
// 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { foldTex, leg, robe, RobeCfg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 33,
  thigh: 16,
  shin: 15.6,
  ankleH: 3,
  footLen: 6.4,
  spine: 22,
  neck: 5,
  upperArm: 13,
  foreArm: 12,
  shoulderDrop: 4.4,
  shoulderN: -3.8,
  shoulderF: 4,
  hipN: -2.4,
  hipF: 2.4,
};

const SK = MAT.rotPale, CT = MAT.charcoal, CW = MAT.blackCloth, BT = MAT.darkleather, CF = MAT.coffin, IR = MAT.iron, BN = MAT.bone, LN = MAT.linen;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  cowlBack(d, s, wave, 3);
  leg(d, s, 'F', legCfg(10, -1));
  sleeveArm(d, s.sF, s.eF, s.hF, s.loF, 18, -1, 'armF');

  coatSkirt(d, s, wave, 26);
  coat(d, s, 30);
  chain(d, s, 33);
  head(d, s, P);
  leg(d, s, 'N', legCfg(24, 0));

  // the coffin on his far arm, before his body; his near hand on its edge
  const C = coffinAt(s, P);
  coffin(d, C.o, C.ang, 50, C.lie);
  const n = nearArm(s, C, P);
  sleeveArm(d, s.sN, n.e, n.h, n.lo, 60, 0, 'armN');
}

// ---------------------------------------------------------------------------
// the body
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: CT, shin: CT, foot: BT, rThigh: [5.2, 4.4] as [number, number], rShin: [4.0, 3.4] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: BT, from: 0.42, r: [4.2, 3.7] as [number, number], cuff: BT },
});

/** A coat sleeve to the wrist, a big grey hand. */
function sleeveArm(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: CT, z, group, shade }, sh, el, 4.4, 3.8);
  d.capsule({ mat: CT, z: z + 0.1, group, shade }, el, at(ha, lo, -1.6), 3.8, 3.5);
  d.ellipse({ mat: SK, z: z + 0.3, group, shade }, at(ha, lo, 0.6), 3.0, 2.6, lo);
}

const SKIRT: RobeCfg = { waist: [1.6, 7.6, 9.4], hemDrop: -13, hemFloor: 13, hemBack: [5.6, 4.6], hemFront: [4.6, 3.4], midBack: [4.4, 3.6], midFront: [3.6, 2.6], ripple: 0.6, zigzag: 1.0 };

/** The coat's skirt from the waist to the knees, split and ragged at the hem. */
function coatSkirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, SKIRT, wave);
  d.poly({ mat: CT, z, group: 'skirt', tex: foldTex(8, wave * 0.4, 0.62) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
}

/** The great body in its coat, the black mantle of the cowl over the shoulders. */
function coat(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 7.6, 9.2],
    [5, 8.0, 10.2],
    [10, 8.6, 10.8],
    [15, 9.0, 10.4],
    [18.6, 8.4, 8.6],
    [21, 6.4, 5.4],
    [22.4, 3.6, 3],
  ]);
  d.poly({ mat: CT, z, group: 'coat', tex: foldTex(6, 0.6, 0.72) }, body, { kind: 'cyl', a: s.T(0, 1), b: s.T(22, 1), r: 10, bevel: 1.5 });
  // the coat's front edge, its buttons dark
  d.line({ mat: CT, z: z + 0.1, group: 'coat', line: 'none' }, s.T(1, 8.6), s.T(17, 9.6), CT.ramp[1]);
  // the mantle of the cowl, ragged over the chest and the back
  const mantle = torsoPts(s, [
    [13.6, 9.4, 9.6],
    [15.4, 10.0, 10.8],
    [18.6, 9.2, 9.8],
    [21.6, 6.8, 6.0],
    [23.4, 3.8, 3.4],
  ]);
  d.poly({ mat: CW, z: z + 0.5, group: 'mantle', tex: foldTex(5, 1.4, 0.7) }, mantle, { kind: 'cyl', a: s.T(13.6, 0), b: s.T(23, 0), r: 10, bevel: 1.2 });
}

/** A heavy iron chain over his near shoulder and across his chest, links lying alternately. */
function chain(d: Draw, s: Skel, z: number) {
  const a = s.T(19.6, -4.6), b = s.T(2.4, 9.4);
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const p = lerpV(a, b, i / n);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 57.3;
    if (i % 2) d.ellipse({ mat: IR, z: z + 0.1, group: 'chain' + i }, p, 1.0, 0.7, ang + 90);
    else d.ellipse({ mat: IR, z, group: 'chain' + i }, p, 1.6, 1.0, ang);
  }
}

/** His cowl's fall behind his head and down between the shoulders. */
function cowlBack(d: Draw, s: Skel, wave: number, z: number) {
  const H = s.H, T = s.T;
  const w = Math.sin(wave) * 0.4;
  d.poly({ mat: CW, z, group: 'cowlback', shade: -1, tex: foldTex(5, 0.8, 0.7) }, [H(-2.6, 8.4), H(-8.6, 5.4), H(-10.4, -0.4), T(17.6 - w, -10.4), T(13, -9.8), T(15, -4), H(-3.4, -6)], { kind: 'dome', c: H(-5, 0), r: 11, bevel: 1 });
}

/**
 * The head: big, bald, grey, a heavy brow over sunken eyes with the Reign's
 * pale light in them; the jaw bound with a strip of linen up the cheek and over
 * the crown; the black cowl over the back of the head and round the face.
 */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.4, group: 'neck' }, s.neck, H(0.4, -4.4), 3.8, 3.6);
  face(d, s, { skin: SK, z: 38, glowEye: P.dim ? E.ashEyeDim : E.ashEye, browStyle: 'angry', brow: SK.ramp[1], mouth: 'none', rx: 6.8, ry: 7.2 });
  // the sunken socket round the eye, the shadow under the brow
  d.pixels({ mat: SK, z: 38.4, group: 'socket', outline: false, line: 'none' }, [
    { p: H(2.6, 1.4), c: SK.ramp[1] }, { p: H(3.6, 1.6), c: SK.ramp[1] }, { p: H(4.6, 1.4), c: SK.ramp[1] },
    { p: H(2.6, -1.2), c: SK.ramp[2] }, { p: H(3.8, -1.4), c: SK.ramp[2] },
    // the mouth shut hard under the binding
    { p: H(4.4, -3.8), c: SK.ramp[1] }, { p: H(5.4, -3.6), c: SK.ramp[1] },
  ]);
  // the binding: under the chin, up the cheek, over the crown to a knot
  d.ribbon({ mat: LN, z: 38.6, group: 'binding', line: 'soft' }, [H(5.6, -6.2), H(2.4, -6.6), H(0.2, -3.2), H(-0.6, 2), H(-0.4, 7.6)], [1.3, 1.4, 1.3, 1.2, 1.1]);
  // the cowl over the crown and the back of the head, its rim round the face
  d.poly(
    { mat: CW, z: 39, group: 'cowl', tex: foldTex(5, 1.2, 0.7) },
    [H(4.6, 8.8), H(2.4, 11.4), H(-3.6, 10.6), H(-8.4, 6.6), H(-9.6, 0.4), H(-8.6, -5.6), H(-5.4, -8.6), H(-2.4, -8.0), H(-0.8, -4.4), H(-0.4, 1.8), H(1.8, 6.4), H(5.6, 7.4)],
    { kind: 'dome', c: H(-2.6, 1.4), r: 10.4, bevel: 1.2 },
  );
  // the cowl's rim catching the light along the face
  d.ribbon({ mat: CW, z: 39.1, group: 'cowl', line: 'none' }, [H(5.8, 7.6), H(1.8, 6.6), H(-0.4, 2.0), H(-0.8, -4.2)], [0.6, 0.7, 0.7, 0.6]);
}

// ---------------------------------------------------------------------------
// the coffin
// ---------------------------------------------------------------------------

interface CoffinPlace {
  o: V;
  ang: number;
  lie: number;
}

/** Where the coffin is: on his far hand at the pose's angle, or lying flat beside him once he has fallen. */
function coffinAt(s: Skel, P: Record<string, number>): CoffinPlace {
  if (P.drop) return { o: v(20, 5.4), ang: 2, lie: 0.5 };
  return { o: s.hF, ang: P.cof ?? 88, lie: 1 };
}

/** His near hand: on the coffin's front edge, or (`free` 1) where the pose puts it. */
function nearArm(s: Skel, C: CoffinPlace, P: Record<string, number>): { e: V; h: V; lo: number } {
  const free = P.drop ? 1 : (P.free ?? 0);
  if (free >= 1) return { e: s.eN, h: s.hN, lo: s.loN };
  const f = coffinFrame(C);
  const target = lerpV(f(P.grip ?? 2, 1.5), s.hN, free);
  const r = ik2(s.sN, target, D.upperArm, D.foreArm, -1);
  return { e: r.mid, h: r.end, lo: r.a2 };
}

const coffinFrame = (C: CoffinPlace) => {
  const du = { x: Math.cos((C.ang * Math.PI) / 180), y: Math.sin((C.ang * Math.PI) / 180) };
  const dw = { x: -du.y, y: du.x };
  return (u: number, w: number): V => v(C.o.x + du.x * u + dw.x * w * C.lie, C.o.y + du.y * u + dw.y * w * C.lie);
};

/**
 * The coffin, its lid toward us: six-sided, widest at the shoulders, its head
 * up; its side showing past the front edge; two iron bands, iron caps on the
 * corners, the Reign's white bone laid across the lid; the grain of old wood.
 */
function coffin(d: Draw, o: V, ang: number, z: number, lie: number) {
  const f = coffinFrame({ o, ang, lie });
  const outline = (dw: number) => [f(-19, -5.4 + dw), f(16, -10 + dw), f(29, -6.2 + dw), f(29, 6.2 + dw), f(16, 10 + dw), f(-19, 5.4 + dw)];
  // the side, past the front edge
  d.poly({ mat: CF, z, group: 'coffinside', shade: -1 }, outline(-2.4), { kind: 'bevel', w: 1.2 });
  const grain = (h: { u: number; v: number }) => (Math.sin(h.v * 9 + Math.sin(h.u * 3) * 1.2) > 0.9 ? -1 : 0);
  d.poly({ mat: CF, z: z + 0.1, group: 'coffin', tex: grain }, outline(0), { kind: 'cyl', a: f(-19, 0), b: f(29, 0), r: 10, bevel: 1.4 });
  // the lid's raised panel, one step lighter, inset from the edge
  d.poly({ mat: CF, z: z + 0.15, group: 'lid', line: 'soft' }, [f(-16, -3.4), f(15.4, -7.6), f(26.4, -4.4), f(26.4, 4.4), f(15.4, 7.6), f(-16, 3.4)], { kind: 'bevel', w: 1.6 });
  // iron straps across the foot and the head
  for (const [u, half] of [[-13, 6.6], [24, 7.8]] as const) d.ribbon({ mat: IR, z: z + 0.2, group: 'band' + u, line: 'soft' }, [f(u, -half), f(u, 0), f(u, half)], [0.7, 0.7, 0.7]);
  // the Reign's bone across the lid, white, at the shoulders
  d.capsule({ mat: BN, z: z + 0.3, group: 'bone' }, f(12, -5.6), f(12, 5.6), 1.0, 1.0);
  for (const w of [-5.8, 5.8]) {
    d.circle({ mat: BN, z: z + 0.32, group: 'bone' }, f(12.8, w), 1.2);
    d.circle({ mat: BN, z: z + 0.32, group: 'bone' }, f(11.2, w), 1.2);
  }
}

// ---------------------------------------------------------------------------
// Poses & animations (arm angles are absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 88,
  head: 86,
  legN: { ik: v(-9, 3) },
  legF: { ik: v(9, 3) },
  armN: { up: -60, lo: -10 },
  armF: { up: -68, lo: -4 },
  p: { cof: 88, grip: 2 },
});

/** He breathes slowly, heavily, the coffin rocking a little on his arm. */
function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -1 - b, armF: { up: -68 + b, lo: -4 + b }, p: { wave: a, cof: 88 + b } });
}

/** A heavy trudge, the coffin carried before him. */
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -9 * Math.cos(ph), y: 3 + (sn > 0 ? 4.5 * sn : 0), ang: sn > 0 ? -18 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return pose({
    y: bob - 1.5, torso: 82, head: 82,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armN: { up: -56, lo: -8 }, armF: { up: -60 + bob * 2, lo: 0 },
    p: { wave: a * 2, cof: 84 + bob, grip: 2 },
  });
}

// Lid Crush: the coffin drawn back to his shoulder, then driven forward into the enemy, both hands behind it.
const LC_WIND = pose({ x: -4, y: -2, torso: 100, head: 94, legN: { ik: v(-11, 3) }, legF: { ik: v(7, 3) }, armN: { up: -80, lo: -30 }, armF: { up: -96, lo: -50 }, p: { cof: 100, grip: 4 } });
const LC_STRIKE = pose({ x: 9, y: -4, torso: 70, head: 76, legN: { ik: v(-14, 3) }, legF: { ik: v(12, 3) }, armN: { up: -30, lo: 0 }, armF: { up: -22, lo: 6 }, p: { cof: 78, grip: 2 } });
const LC_FOLLOW = tweak(LC_STRIKE, { x: 10, torso: 68, armF: { up: -26, lo: 2 }, p: { cof: 74 } });

// Bear the Dead: the coffin lifted high, then brought down and planted upright before him on the ground, a knock that carries.
const BD_LIFT = pose({ x: -1, y: 0, torso: 94, head: 96, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, armN: { up: -30, lo: 20 }, armF: { up: 10, lo: 40 }, p: { cof: 90, grip: 2 } });
const BD_PLANT = pose({ x: 3, y: -6, torso: 78, head: 80, legN: { ik: v(-12, 3) }, legF: { ik: v(11, 4) }, armN: { up: -48, lo: -6 }, armF: { up: -64, lo: -46 }, p: { cof: 90, grip: 6 } });
const BD_HOLD = tweak(BD_PLANT, { y: -5, torso: 84, head: 86, armF: { up: -66, lo: -40 } });

const HURT = pose({ x: -4, y: -1, torso: 100, head: 104, legN: { ik: v(-11, 3) }, legF: { ik: v(7, 4) }, footF: 10, armN: { up: -76, lo: -24 }, armF: { up: -84, lo: -26 }, p: { cof: 98, grip: 2 } });
const DEATH_SWAY = pose({ x: 2, y: -3, torso: 84, head: 70, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, armN: { up: -96, lo: -96 }, armF: { up: -84, lo: -80 }, p: { drop: 1, dim: 1 } });
const DEATH_FALL = pose({ x: -4, y: -10, torso: 136, head: 146, legN: { ik: v(-4, 3) }, legF: { ik: v(10, 5) }, armN: { up: 168, lo: 174 }, armF: { up: 158, lo: 168 }, p: { drop: 1, dim: 1 } });
const DEATH_DOWN = pose({ x: -8, y: -21, torso: 178, head: 178, legN: { up: 4, lo: -2 }, legF: { up: 10, lo: 2 }, footN: 80, footF: 80, armN: { up: 176, lo: 178 }, armF: { up: 184, lo: 180 }, p: { drop: 1, dim: 1 } });

// Not Yet Buried: from his back he heaves himself up on one arm, to a knee, then stands and takes the coffin back.
const RISE_SIT = pose({ x: -8, y: -17, torso: 128, head: 104, legN: { up: 6, lo: -30 }, legF: { up: 14, lo: -20 }, footN: 40, footF: 30, armN: { up: -150, lo: -120 }, armF: { up: -120, lo: -100 }, p: { drop: 1 } });
const RISE_KNEEL = pose({ x: -1, y: -13, torso: 80, head: 82, legN: { ik: v(-13, 3) }, legF: { ik: v(9, 3) }, footN: -30, armN: { up: -70, lo: -50 }, armF: { up: -54, lo: -30 }, p: { drop: 1 } });

/** Victory: the coffin hoisted high over his head on both arms. */
const VICTORY = pose({ y: 0, torso: 92, head: 98, legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) }, armN: { up: 54, lo: 80 }, armF: { up: 66, lo: 88 }, p: { cof: 6, grip: -6 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'coffins_legs',
  name: "Coffin's Legs",
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 210, idle) },
    run: { loop: true, frames: cycle(8, 95, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, LC_WIND, 0.5), 100],
        [LC_WIND, 200],
        [mid(LC_WIND, LC_STRIKE, 0.55), 55],
        [LC_STRIKE, 100, { hit: true }],
        [LC_FOLLOW, 180],
        [mid(LC_FOLLOW, IDLE, 0.5), 120],
        [IDLE, 90],
      ]),
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, BD_LIFT, 3, 110, ease.out),
        ...keys([
          [BD_LIFT, 220],
          [mid(BD_LIFT, BD_PLANT, 0.55), 60],
          [BD_PLANT, 140, { hit: true, event: 'cast' }],
          [BD_HOLD, 380],
          [mid(BD_HOLD, IDLE, 0.5), 130],
          [IDLE, 90],
        ]),
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
        [tweak(HURT, { p: { ...HURT.p, drop: 1 } }), 120],
        [DEATH_SWAY, 240],
        [mid(DEATH_SWAY, DEATH_FALL, 0.5), 110],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -21.4 }), 600],
      ]),
    },
    rise: {
      loop: false,
      frames: keys([
        [DEATH_DOWN, 160],
        [mid(DEATH_DOWN, RISE_SIT, 0.5), 120],
        [RISE_SIT, 200],
        [mid(RISE_SIT, RISE_KNEEL, 0.5), 120],
        [RISE_KNEEL, 220],
        [mid(RISE_KNEEL, tweak(IDLE, { p: { ...IDLE.p, drop: 1 } }), 0.5), 120],
        [IDLE, 200],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VICTORY, 3, 110, ease.out),
        ...keys([
          [VICTORY, 700],
          [mid(VICTORY, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

function iconCoffin(d: Draw, o: V, ang: number, z: number, k = 1) {
  const f = d.frame(o, ang);
  const g = (u: number, w: number) => f(u * k, w * k);
  d.poly({ mat: CF, z, group: 'icside', shade: -1 }, [g(-15, -7.6), g(14, -11), g(25, -8), g(25, 2), g(14, 5), g(-15, 1.6)], { kind: 'bevel', w: 1.4 });
  d.poly({ mat: CF, z: z + 0.1, group: 'ic' }, [g(-15, -4.6), g(14, -8), g(25, -5), g(25, 5), g(14, 8), g(-15, 4.6)], { kind: 'cyl', a: g(-15, 0), b: g(25, 0), r: 8 * k, bevel: 1.6 });
  for (const u of [-8, 19]) d.capsule({ mat: IR, z: z + 0.2, group: 'icb' + u }, g(u, -6.4), g(u, 6.4), 1.0, 1.0);
  d.capsule({ mat: BN, z: z + 0.3, group: 'icbone' }, g(7, -5), g(7, 5), 1.2, 1.2);
}

export const coffinsLegs: ChampionArt = {
  char,
  iconBg: CT,
  icons: {
    lid_crush: () =>
      compose(CT, glyph((d) => {
        // the coffin driven in, head first
        iconCoffin(d, v(9, 9), 40, 2, 0.82);
      }), (b) => impactStar(b, 30, 30, 2, 8, 8, BN.ramp[4], E.white)),
    bear_the_dead: () =>
      compose(CT, glyph((d) => {
        // the coffin planted upright, a ring at its foot
        iconCoffin(d, v(20, 10), 90, 2, 0.78);
      }), (b) => {
        const R = BN.ramp;
        for (let a = 0; a < Math.PI * 2; a += 0.12) {
          const x = Math.round(20 + Math.cos(a) * 14), y = Math.round(33 - Math.sin(a) * 3);
          if (Math.sin(a) < 0.2) b.set(x, y, R[3]);
        }
      }),
    not_yet_buried: () =>
      compose(CF, glyph((d) => {
        // the coffin lying, its lid pushed aside, a grey hand on its edge
        iconCoffin(d, v(4, 12), 0, 2, 0.86);
        d.ellipse({ mat: SK, z: 5, group: 'ihand' }, v(20, 22), 3.4, 2.6, 30);
        d.capsule({ mat: CT, z: 4.9, group: 'isleeve' }, v(14, 16), v(19, 21), 3, 2.8);
      }), (b) => {
        // the pale light leaking out
        const R = BN.ramp;
        for (const [x, y, k] of [[26, 26, 5], [28, 29, 4], [24, 30, 4], [30, 33, 3], [22, 33, 3], [27, 35, 2]] as const) b.set(x, y, R[k]);
      }),
  },
};
