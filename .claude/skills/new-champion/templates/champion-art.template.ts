// TEMPLATE: copy to tools/art/champions/<id>.ts, then rename `spearwarden`,
// the champion name, the skill ids in `icons` and the helper names.
// It is a complete, working champion (a spear fighter) built only from the
// shared parts library, so it renders as-is; reshape it into your design.
//
// <Name>, <title> — <faction> <role>. One paragraph: materials, costume,
// weapon. Signature color: <hue>. Silhouette: <the one feature you could
// recognise in solid black>.
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { C, compose, glyph, impactStar, speedLines } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, cape, leg, smear, torsoPts } from '../parts.ts';
import { Dims, Draw, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

// Proportions: stay inside docs/ART_GUIDE.md 2.2 (about 5 heads tall).
const D: Dims = {
  hipH: 33,
  thigh: 15.5,
  shin: 15.5,
  ankleH: 3,
  footLen: 6,
  spine: 21,
  neck: 7.6,
  upperArm: 12.5,
  foreArm: 11.5,
  shoulderDrop: 4,
  shoulderN: -3,
  shoulderF: 3.4,
  hipN: -1.5,
  hipF: 1.5,
};

// Materials only from palette.ts (no color literals: npm run audit checks).
const SIG = MAT.green, METAL = MAT.iron, SKIN = MAT.skinTan, TRIM = MAT.gold, LE = MAT.leather, WOOD = MAT.wood;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;

  // behind everything: cape
  cape(d, s, { mat: SIG, z: 2, len: 28, topU: 19, topBack: 6, topFront: 1, spread: 6, wind: P.cape ?? 0.1, wave: P.wave ?? 0 });

  // far side, one ramp step darker (shade -1)
  leg(d, s, 'F', { thigh: LE, shin: LE, foot: LE, rThigh: [4.2, 3.4], rShin: [3.2, 2.7], z: 10, shade: -1, footStyle: 'boot' });
  arm(d, s, 'F', { upper: SKIN, fore: SKIN, hand: SKIN, rUp: [3, 2.7], rLo: [2.7, 2.4], rHand: 2.5, z: 20, shade: -1, cuff: LE });

  // torso: a tunic over a mail shirt
  const torso = torsoPts(s, [
    [0, 6.0, 6.2],
    [4, 6.2, 6.6],
    [9, 6.8, 7.6],
    [13.5, 7.2, 8.2],
    [17.5, 7.2, 7.2],
    [20, 5.6, 4.6],
    [21.4, 3.0, 2.4],
  ]);
  d.poly({ mat: SIG, z: 30, group: 'body' }, torso, { kind: 'cyl', a: s.T(0, 0.8), b: s.T(21, 0.8), r: 7.6, bevel: 1.2 });
  d.poly({ mat: LE, z: 31, group: 'body' }, [s.T(3.2, -6.4), s.T(3.4, 6.8), s.T(0.6, 6.5), s.T(0.4, -6.2)], { kind: 'cyl', a: s.T(0, 0), b: s.T(4, 0), r: 7 });
  d.circle({ mat: TRIM, z: 31.2, group: 'body', line: 'none' }, s.T(1.9, 6.0), 1.2);

  // head: bare face plus a metal cap with a crest (the silhouette feature)
  face(d, s, { skin: SKIN, z: 38, browStyle: 'angry', mouth: 'line' });
  const H = s.H;
  d.poly({ mat: METAL, z: 38.6, group: 'helm' }, [H(-7, 1.5), H(-6.5, 6.5), H(-1, 8.6), H(4.6, 6.8), H(6.6, 2.4), H(2, 2.8), H(-3, 2.2)], { kind: 'dome', c: H(-1, 3), r: 8, bevel: 1.2 });
  d.ribbon({ mat: SIG, z: 38.7, group: 'crest' }, [H(-1, 8.4), H(-5, 10.4), H(-10, 9 + (P.cape ?? 0) * 2)], [1.6, 1.8, 1.0]);

  // near side
  leg(d, s, 'N', { thigh: LE, shin: LE, foot: LE, rThigh: [4.2, 3.4], rShin: [3.2, 2.7], z: 50, footStyle: 'boot' });
  const spearAng = P.spearAng ?? 80;
  if (info.def.smear && info.prev) {
    smear(d, s.hN, info.prev.pose.p.spearAng ?? spearAng, spearAng, 38, 10, { core: ACCENT.white, edge: ACCENT.smearSteel }, 3);
  }
  spear(d, s.hN, spearAng, 58);
  arm(d, s, 'N', { upper: SKIN, fore: SKIN, hand: SKIN, rUp: [3.1, 2.8], rLo: [2.8, 2.5], rHand: 2.6, z: 60, cuff: LE });
}

/** The weapon: built from the same primitives as everything else, so the icon can reuse it. */
function spear(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: WOOD, z, group: 'spear' }, f(-16, 0), f(30, 0), 1.2, 1.1);
  d.capsule({ mat: TRIM, z: z + 0.05, group: 'spear', line: 'none' }, f(27, 0), f(29.5, 0), 1.5, 1.5);
  d.poly({ mat: METAL, z: z + 0.1, group: 'spear' }, [f(29, -2.2), f(39, 0), f(29, 2.2), f(30.5, 0)], { kind: 'bevel', w: 1.2 });
}

// ---------------------------------------------------------------------------
// Poses & animations. Angles are rig degrees (+x forward, +y up).
// Rhythm for every attack: anticipation (longest) -> strike (hit + smear)
// -> follow-through (hold) -> recovery (two frames back to idle).
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 86,
  head: 88,
  legN: { ik: v(-8, 3) },
  legF: { ik: v(8, 3) },
  armN: { up: -70, lo: 10 },
  armF: { up: -100, lo: -60 },
  p: { spearAng: 84, cape: 0.1, wave: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2); // whole-pixel breathing
  return tweak(IDLE, { y: -b, torso: 86 - b, armN: { up: -70 + b * 2, lo: 10 }, p: { spearAng: 84 - b, cape: 0.1 + b * 0.05, wave: a } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const ft = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (sn > 0 ? 7 * sn : 0), ang: sn > 0 ? -30 * sn : 0 };
  };
  const n = ft(a), f = ft(a + Math.PI);
  return pose({
    y: bob,
    torso: 76,
    head: 82,
    legN: { ik: v(n.x, n.y) },
    legF: { ik: v(f.x, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -40 + Math.sin(a) * 20, lo: 10 },
    armF: { up: -120 - Math.sin(a) * 20, lo: -80 },
    p: { spearAng: 20, cape: 1, wave: a * 2 },
  });
}

// A1: pull back, thrust.
const A1_WIND = pose({ x: -3, torso: 96, head: 92, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, armN: { up: -150, lo: -170 }, armF: { up: -90, lo: -40 }, p: { spearAng: 175, cape: 0.2, wave: 1 } });
const A1_HIT = pose({ x: 8, torso: 70, head: 78, legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) }, armN: { up: -5, lo: 0 }, armF: { up: -60, lo: -20 }, p: { spearAng: 0, cape: 0.6, wave: 2 } });

// A2: in-place rally, spear raised (fires the `cast` event).
const CAST = pose({ torso: 92, head: 98, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, armN: { up: 80, lo: 95 }, armF: { up: -140, lo: -100 }, p: { spearAng: 95, cape: 0.4, wave: 1.5 } });

// A3: leaping two-hit drive.
const A3_WIND = pose({ x: -4, y: -4, torso: 100, head: 96, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, armN: { up: 160, lo: 175 }, armF: { up: 120, lo: 150 }, p: { spearAng: 190, cape: 0.3, wave: 1 } });
const A3_HIT1 = pose({ x: 7, torso: 72, head: 80, legN: { ik: v(-10, 3) }, legF: { ik: v(14, 3) }, armN: { up: 10, lo: 20 }, armF: { up: 0, lo: 20 }, p: { spearAng: 20, cape: 0.7, wave: 2 } });
const A3_HIT2 = pose({ x: 11, y: -2, torso: 64, head: 74, legN: { ik: v(-12, 3) }, legF: { ik: v(17, 3) }, armN: { up: -20, lo: -25 }, armF: { up: -30, lo: -20 }, p: { spearAng: -25, cape: 0.9, wave: 2.6 } });

const HURT = pose({ x: -4, torso: 104, head: 112, legN: { ik: v(-11, 3) }, legF: { ik: v(7, 4) }, armN: { up: -120, lo: -80 }, armF: { up: -60, lo: 10 }, p: { spearAng: 110, cape: 0.4, wave: 2 } });
const DEATH_KNEEL = pose({ x: -2, y: -12, torso: 76, head: 60, legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60, armN: { up: -90, lo: -90 }, armF: { up: -75, lo: -60 }, p: { spearAng: -80, cape: 0.1, wave: 1 } });
const DEATH_FALL = pose({ x: 2, y: -20, torso: 30, head: 16, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { spearAng: -20, cape: 0.2, wave: 1.6 } });
const DEATH_DOWN = pose({ x: 6, y: -26, torso: 4, head: -2, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { spearAng: 6, cape: 0.05, wave: 2 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'spearwarden',
  name: 'Template',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 150, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    // one `hit` per entry in the skill's hits[]; `smear` on strikes with a weapon arc
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, A1_WIND, 0.5), 80],
        [A1_WIND, 190],
        [A1_HIT, 60, { smear: true, hit: true }],
        [tweak(A1_HIT, { x: 9, p: { spearAng: -6, wave: 2.4 } }), 220],
        [mid(A1_HIT, IDLE, 0.5), 100],
        [IDLE, 90],
      ]),
    },
    skill: {
      loop: false,
      frames: keys([
        [mid(IDLE, CAST, 0.5), 90],
        [CAST, 160, { event: 'cast' }],
        [tweak(CAST, { y: -1, p: { wave: 2 } }), 140, { hit: true }],
        [tweak(CAST, { p: { wave: 2.6 } }), 260],
        [mid(CAST, IDLE, 0.5), 110],
        [IDLE, 90],
      ]),
    },
    attack3: {
      loop: false,
      frames: keys([
        [mid(IDLE, A3_WIND, 0.5), 80],
        [A3_WIND, 220],
        [A3_HIT1, 60, { smear: true, hit: true }],
        [tweak(A3_HIT1, { x: 8, p: { spearAng: 14 } }), 90],
        [A3_HIT2, 60, { smear: true, hit: true }],
        [tweak(A3_HIT2, { x: 12, p: { spearAng: -30, wave: 3 } }), 240],
        [mid(A3_HIT2, IDLE, 0.5), 110],
        [IDLE, 90],
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
        [tweak(DEATH_DOWN, { y: -27 }), 600],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// Skill icons (40x40): glyph() renders shaded primitives in a 40x40 rig space
// (origin bottom-left), compose() adds the signature background, vignette and
// gold frame. Keys must equal the skill ids in the data module.
// ---------------------------------------------------------------------------

export const spearwarden: ChampionArt = {
  char,
  iconBg: SIG,
  icons: {
    template_a1: () =>
      compose(SIG, glyph((d) => {
        smear(d, v(8, 8), 150, 10, 30, 8, { core: C.white, edge: C.smearSteel }, 1);
        spear(d, v(8, 8), 45, 10);
      })),
    template_a2: () =>
      compose(SIG, glyph((d) => {
        spear(d, v(20, 4), 90, 10);
      }), (b) => impactStar(b, 20, 30, 2, 9, 10, C.goldHot, C.white)),
    template_a3: () =>
      compose(SIG, glyph((d) => {
        spear(d, v(6, 14), 20, 10);
      }), (b) => {
        speedLines(b, [[3, 10, 12, 12], [3, 30, 10, 28], [5, 20, 13, 20]], C.white);
        impactStar(b, 34, 25, 1, 6, 8, C.smearSteel, C.white);
      }),
  },
};

