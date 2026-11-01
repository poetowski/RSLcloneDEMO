// The Gravedigger (docs/DESIGN_DECISIONS.md section 48, 2026-11-01, my proposal
// on Jakub's word): a Common Damage of the Ashveil Reign, a hunched dried corpse
// and not bare bones like the Reign's skeletons. Grey-green shrunken skin, a
// sunken socket with the Reign's pale light, a stitched mouth; a wide-brimmed
// dark hat, a sackcloth smock, a leather apron, the white bone on his hat, a rope
// belt with a small lantern at his hip, charcoal breeches, bare shins, wrapped
// feet; a long spade with a T-handle and a rusty blade that he leans on (the
// silhouette features: the hat and the spade). Plain and light, as Commons are.
// His affinity (Bloom) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, leg, smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 33,
  thigh: 15.6,
  shin: 15.2,
  ankleH: 3,
  footLen: 6.2,
  spine: 20,
  neck: 5.4,
  upperArm: 12.6,
  foreArm: 12.2,
  shoulderDrop: 4.2,
  shoulderN: -2.8,
  shoulderF: 3.2,
  hipN: -1.8,
  hipF: 1.8,
};

const SK = MAT.rotPale, SM = MAT.graveSack, AP = MAT.darkleather, CH = MAT.charcoal, WD = MAT.wood, RU = MAT.rust, IR = MAT.iron, HT = MAT.darkleather, BN = MAT.ashBone;
const E = ACCENT;

/** The streak of the spade: dull, with the rust's colour at its edge. */
const SWING = { core: BN.ramp[4], edge: RU.ramp[3] };

/** Where the far hand holds the haft, back toward the T-handle from the near hand. */
const TWO = -9;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const prev = info.prev?.pose.p;
  const ang = P.spade ?? -86;
  const held = !P.drop;

  // far leg; the far arm, its hand on the haft while he holds the spade
  leg(d, s, 'F', legCfg(10, -1));
  const far = held ? farArm(s, ang) : { e: s.eF, h: s.hF };
  d.capsule({ mat: SM, z: 20, group: 'armF', shade: -1 }, s.sF, far.e, 2.5, 2.1);
  d.capsule({ mat: SK, z: 20.1, group: 'armF', shade: -1 }, far.e, far.h, 1.4, 1.2);
  d.circle({ mat: SK, z: 20.2, group: 'armF', shade: -1 }, far.h, 1.8);

  lantern(d, s, P.wave ?? 0, 24);
  smock(d, s, 30);
  head(d, s, P);

  // near leg
  leg(d, s, 'N', legCfg(50, 0));

  // the spade, its smear, then the near arm over the haft
  if (held) {
    if (info.def.smear && prev && prev.spade !== undefined) smear(d, s.hN, prev.spade, ang, 30, 9, SWING, 55);
    spade(d, s.hN, ang, 56);
  } else spade(d, v(-8, 3.4), 2, 56);
  arm(d, s, 'N', armCfg(60, 0));
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: CH, shin: SK, foot: SM, rThigh: [3.6, 2.6] as [number, number], rShin: [1.7, 1.3] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: SM, from: 0.72, r: [2.6, 2.6] as [number, number], cuff: SM },
});

// the smock's sleeve to the elbow, then shrunken skin
const armCfg = (z: number, shade: number) => ({
  upper: SM, fore: SK, hand: SK, rUp: [2.5, 2.1] as [number, number], rLo: [1.4, 1.2] as [number, number], rHand: 1.8, z, shade,
});

function farArm(s: Skel, ang: number): { e: V; h: V } {
  const r = ik2(s.sF, at(s.hN, ang, TWO), D.upperArm, D.foreArm, -1);
  return { e: r.mid, h: r.end };
}

/** The sackcloth smock, hanging loose to the thigh, the leather apron over its front, the white bone on it, the rope belt. */
function smock(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 5.4, 5.8],
    [4, 5.0, 5.4],
    [9, 5.6, 6.2],
    [14, 6.2, 6.6],
    [17, 6.0, 5.6],
    [19, 4.6, 3.8],
    [20.4, 2.8, 2.4],
  ]);
  d.poly({ mat: SM, z, group: 'smock', tex: (h) => (Math.sin(h.u * 34) > 0.8 ? -1 : 0) }, body, { kind: 'cyl', a: s.T(0, 0.4), b: s.T(20.4, 0.4), r: 6.6, bevel: 1.2 });
  // the skirt of it, between the thighs, ragged at its edge
  const ang = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  const f0 = s.T(1, -5.8), f1 = s.T(1, 6.0);
  const f2 = at(f1, ang + 8, 9), f3 = at(f0, ang - 8, 8);
  d.poly({ mat: SM, z: z - 0.5, group: 'skirt' }, [f0, f1, f2, lerpV(f2, f3, 0.3), at(lerpV(f2, f3, 0.5), ang + 180, 2), lerpV(f2, f3, 0.7), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 6, bevel: 1 });
  // the apron: from the chest to below the belt, on the front of him
  d.poly({ mat: AP, z: z + 0.6, group: 'apron', line: 'soft' }, [s.T(15.4, 1.0), s.T(15.4, 6.6), s.T(4, 6.0), s.T(-5, 6.6), at(s.T(-5, 1.0), -90, 1), s.T(4, 0.6)], { kind: 'cyl', a: s.T(15, 3), b: s.T(-5, 3), r: 4.6, bevel: 1 });
  // the rope belt, its knot
  d.poly({ mat: CH, z: z + 1, group: 'belt' }, [s.T(3.0, -5.4), s.T(3.2, 6.2), s.T(1.8, 6.0), s.T(1.6, -5.2)], { kind: 'cyl', a: s.T(1.6, 0), b: s.T(3.2, 0), r: 5.8 });
}

/** The Reign's mark: one white horizontal bone, pixel by pixel so it stays crisp. */
function boneMark(d: Draw, center: V, z: number) {
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const px: { p: V; c: typeof E.white }[] = [];
  for (const x of [-1, 0, 1]) px.push({ p: v(c.x + x, c.y), c: E.white });
  for (const x of [-2, 2]) for (const y of [-1, 1]) px.push({ p: v(c.x + x, c.y + y), c: E.white });
  d.pixels({ mat: AP, z, group: 'mark', line: 'none', outline: false }, px);
}

/** A small iron lantern hanging from the belt at his back, swinging a little, the pale light in it. */
function lantern(d: Draw, s: Skel, wave: number, z: number) {
  const top = s.T(1.8, -5.2);
  const c = at(top, -100 + Math.sin(wave) * 5, 5.4);
  d.capsule({ mat: IR, z, group: 'lantern', line: 'soft' }, top, c, 0.4, 0.4);
  d.poly({ mat: IR, z: z + 0.1, group: 'lantern' }, [v(c.x - 2, c.y + 1.6), v(c.x + 2, c.y + 1.6), v(c.x + 2, c.y - 2.4), v(c.x - 2, c.y - 2.4)], { kind: 'bevel', w: 0.7 });
  d.pixels({ mat: IR, z: z + 0.2, group: 'lantern', line: 'none', outline: false }, [{ p: v(c.x, c.y), c: E.ashEye }, { p: v(c.x, c.y - 1), c: E.ashEyeDim }]);
}

/** His shrunken face under the wide brim: the sunken socket with the pale light in it, the stitched mouth. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 1.7, 1.6);
  face(d, s, { skin: SK, z: 38, browStyle: 'none', mouth: 'line', lip: SK.ramp[1], rx: 5.2, ry: 6.0, profile: 'strong' });
  // the socket over whatever eye was there, the light in it
  d.ellipse({ mat: SK, z: 38.4, group: 'socket', flat: 0, line: 'none' }, H(3.0, 0.8), 2.0, 1.9, s.headDir - 90);
  d.pixels({ mat: SK, z: 38.5, group: 'socket', outline: false, line: 'none' }, [{ p: H(3.2, 0.8), c: E.ashEye }]);
  // the stitches across the mouth, or the mouth torn open when he strains
  d.pixels({ mat: SK, z: 38.5, group: 'stitch', outline: false, line: 'none' }, P.grit
    ? [{ p: H(3.4, -3.6), c: SK.ramp[0] }, { p: H(4.4, -3.6), c: SK.ramp[0] }, { p: H(5.2, -3.6), c: SK.ramp[0] }, { p: H(4.4, -4.4), c: SK.ramp[0] }]
    : [{ p: H(3.0, -3.0), c: SK.ramp[0] }, { p: H(3.0, -4.0), c: SK.ramp[0] }, { p: H(4.4, -3.0), c: SK.ramp[0] }, { p: H(4.4, -4.0), c: SK.ramp[0] }]);
  // the hat: a low sunken crown, a wide drooping brim, a cord
  d.poly({ mat: HT, z: 39, group: 'hat', line: 'soft' }, [H(5.0, 3.2), H(4.4, 7.4), H(1.6, 8.8), H(-2.8, 8.0), H(-6.2, 6.6), H(-6.6, 3.0)], { kind: 'dome', c: H(-0.8, 4.4), r: 7.4, bevel: 1.2 });
  d.ribbon({ mat: HT, z: 39.2, group: 'brim' }, [H(11.0, 0.8), H(6.4, 2.6), H(0, 3.2), H(-6.2, 2.6), H(-11.0, 0.2)], [0.8, 1.2, 1.3, 1.2, 0.8]);
  d.ribbon({ mat: CH, z: 39.1, group: 'hatband', line: 'none' }, [H(5.0, 4.2), H(0, 4.6), H(-6.4, 4.0)], [0.8, 0.8, 0.8]);
  boneMark(d, H(0, 6.6), 39.3);
}

/** The spade: a long haft through the hand, a T-handle at its top, a rusty blade with a worn edge, grave dirt on it. */
function spade(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: WD, z, group: 'spade' }, f(-15, 0), f(22, 0), 1.0, 1.0);
  d.capsule({ mat: WD, z: z + 0.1, group: 'spade' }, f(-15, -3), f(-15, 3), 0.9, 0.9);
  d.poly({ mat: RU, z: z + 0.2, group: 'blade' }, [f(21, -4.2), f(29, -4.0), f(33, -1.6), f(33.6, 0), f(33, 1.6), f(29, 4.0), f(21, 4.2)], { kind: 'bevel', w: 1.2 });
  d.pixels({ mat: RU, z: z + 0.3, group: 'blade', outline: false, line: 'none' }, [{ p: f(32, -0.6), c: RU.ramp[5] }, { p: f(32.6, 0.4), c: RU.ramp[5] }, { p: f(25, 1.8), c: MAT.sand.ramp[1] }, { p: f(26, -1.4), c: MAT.sand.ramp[1] }, { p: f(24, -2.4), c: MAT.sand.ramp[2] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the spade's angle is absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

// At rest: hunched, leaning on the spade planted before him.
const IDLE: Pose = pose({
  y: -2,
  torso: 76,
  head: 84,
  legN: { ik: v(-7, 3) },
  legF: { ik: v(8, 3) },
  armN: { up: -30, lo: -24 },
  armF: { up: -30, lo: 0 },
  p: { spade: -84 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -2 - b, torso: 76 - b, p: { spade: -84, wave: a } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -10 * Math.cos(ph), y: 3 + (sn > 0 ? 5.5 * sn : 0), ang: sn > 0 ? -22 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return pose({
    y: bob - 2,
    torso: 68,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -40, lo: 4 },
    armF: { up: -60, lo: 0 },
    p: { spade: 160, wave: a * 2 },
  });
}

// Spade Cut: swung up over his near shoulder, a chop down on the diagonal.
const SC_WIND = pose({
  x: -2, y: -2, torso: 90, head: 88,
  legN: { ik: v(-11, 3) }, legF: { ik: v(8, 3) },
  armN: { up: 96, lo: 128 }, armF: { up: -60, lo: 10 },
  p: { spade: 150 },
});
const SC_STRIKE = pose({
  x: 8, y: -4, torso: 66, head: 76,
  legN: { ik: v(-10, 3) }, legF: { ik: v(14, 3) },
  armN: { up: -6, lo: -28 }, armF: { up: -60, lo: 0 },
  p: { spade: -40, grit: 1 },
});
const SC_FOLLOW = tweak(SC_STRIKE, { x: 9, torso: 64, armN: { up: -22, lo: -50 }, p: { spade: -68, grit: 0 } });

// Shallow Grave: the spade lifted straight up over his head, a long held breath, then stamped down with his weight behind it.
const SG_LIFT = pose({
  x: -3, y: 1, torso: 96, head: 92,
  legN: { ik: v(-9, 3) }, legF: { ik: v(8, 3) },
  armN: { up: 84, lo: 92 }, armF: { up: 70, lo: 80 },
  p: { spade: -88 },
});
const SG_DRIVE = pose({
  x: 10, y: -7, torso: 58, head: 70,
  legN: { ik: v(-11, 3) }, legF: { ik: v(13, 3) },
  armN: { up: -4, lo: -20 }, armF: { up: -40, lo: -6 },
  p: { spade: -58, grit: 1 },
});

const HURT = pose({
  x: -4, y: -1, torso: 92, head: 102,
  legN: { ik: v(-11, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -30, lo: 0 }, armF: { up: -50, lo: 0 },
  p: { spade: -70, grit: 1 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -10, torso: 66, head: 56,
  legN: { ik: v(-13, 3) }, legF: { ik: v(8, 3) }, footN: -30,
  armN: { up: -60, lo: 10 }, armF: { up: -70, lo: 10 },
  p: { spade: 40 },
});
const DEATH_FALL = pose({
  x: 2, y: -6, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { drop: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -15.5, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { drop: 1 },
});

// Victory: he plants the spade and leans on it, tipping his chin up: the job is done.
const DONE = pose({
  y: -1, torso: 84, head: 98,
  legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) },
  armN: { up: -14, lo: 10 }, armF: { up: -16, lo: 20 },
  p: { spade: -80 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'gravedigger',
  name: 'Gravedigger',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 190, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SC_WIND, 2, 80, ease.out),
        ...keys([
          [SC_WIND, 170],
          [mid(SC_WIND, SC_STRIKE, 0.5), 45],
          [SC_STRIKE, 65, { smear: true, hit: true }],
          [SC_FOLLOW, 180],
        ]),
        ...tween(D, SC_FOLLOW, IDLE, 2, 100, ease.inOut),
      ],
    },
    attack2: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SG_LIFT, 3, 100, ease.out),
        ...keys([
          [SG_LIFT, 320],
          [mid(SG_LIFT, SG_DRIVE, 0.5), 50],
          [SG_DRIVE, 90, { hit: true }],
          [tweak(SG_DRIVE, { y: -8 }), 260],
        ]),
        ...tween(D, SG_DRIVE, IDLE, 3, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 88, head: 98 }), 110],
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
        [tweak(DEATH_DOWN, { y: -16 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, DONE, 2, 110, ease.out),
        ...keys([
          [DONE, 700],
          [mid(DONE, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** The spade in an icon, scaled up for 40x40. */
function iconSpade(d: Draw, from: V, ang: number, z: number) {
  const f = d.frame(from, ang);
  d.capsule({ mat: WD, z, group: 'ispade' }, f(0, 0), f(20, 0), 1.5, 1.5);
  d.capsule({ mat: WD, z: z + 0.1, group: 'ispade' }, f(0, -4), f(0, 4), 1.4, 1.4);
  d.poly({ mat: RU, z: z + 0.2, group: 'iblade' }, [f(19, -6), f(29, -5.6), f(34, -2), f(35, 0), f(34, 2), f(29, 5.6), f(19, 6)], { kind: 'bevel', w: 1.6 });
}

export const gravedigger: ChampionArt = {
  char,
  iconBg: RU,
  icons: {
    spade_cut: () =>
      compose(RU, glyph((d) => {
        iconSpade(d, v(4, 8), 42, 10);
      }), (b) => {
        for (const [x, y] of [[8, 8], [11, 6], [6, 11], [14, 4]]) b.set(x, y, E.white);
      }),
    shallow_grave: () =>
      compose(RU, glyph((d) => {
        // driven straight down into a mound
        iconSpade(d, v(20, 38), -90, 10);
      }), (b) => {
        const S = MAT.sand.ramp;
        for (let x = 6; x <= 34; x++) {
          const h = Math.round(5 * Math.sin(((x - 6) / 28) * Math.PI));
          for (let k = 0; k <= h; k++) b.set(x, 36 - k, S[k === h ? 3 : 1]);
        }
      }),
  },
};
