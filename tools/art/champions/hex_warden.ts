// The Hex Warden (docs/DESIGN_DECISIONS.md section 66, 2026-11-02, my design on
// Jakub's word): an Elite Tank of the Sanguine Dominion. A big man in black plate, a
// closed helm with a tall red crest; a great shield that is the Dominion's standard
// itself, a black hexagon with a red hexagon inside (the silhouette feature), held
// on his far arm; a short broad sword low in his near hand, a red surcoat panel at the
// waist. Black and red are heraldry here, not menace (DESIGN_DECISIONS.md 3.2): the
// slit of the helm shows a plain eye. His affinity (Ember) sets nothing here (Jakub,
// 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, INK, MAT } from '../palette.ts';
import { arm, leg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 36,
  thigh: 16.4,
  shin: 16,
  ankleH: 3,
  footLen: 7,
  spine: 23.4,
  neck: 6.6,
  upperArm: 13.4,
  foreArm: 12.4,
  shoulderDrop: 4.6,
  shoulderN: -3.6,
  shoulderF: 3.8,
  hipN: -2.4,
  hipF: 2.4,
};

const PL = MAT.darksteel, RD = MAT.red, CR = MAT.crimson, ST = MAT.steel, IR = MAT.iron, LE = MAT.darkleather, EB = MAT.blackCloth;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;

  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(20, -1));
  torso(d, s, 30);
  head(d, s, 38);
  leg(d, s, 'N', legCfg(50, 0));
  panel(d, s, 52);

  if (P.drop) sword(d, v(-16, 2.4), 3, 53);
  else sword(d, s.hN, P.swAng ?? -70, 53);
  if (P.drop) hexShield(d, v(20, 4.2), 2, 54, 0.2);
  else hexShield(d, at(s.hF, s.loF, 1), P.shAng ?? 90, 54, 1);

  arm(d, s, 'N', armCfg(60, 0));
  pauldron(d, s.sN, s.eN, 61);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: PL, shin: PL, foot: PL, rThigh: [5, 4] as [number, number], rShin: [3.8, 3.1] as [number, number], z, shade, footStyle: 'sabaton' as const,
});

const armCfg = (z: number, shade: number) => ({
  upper: PL, fore: PL, hand: LE, cuff: PL, rUp: [3.8, 3.2] as [number, number], rLo: [3.2, 2.7] as [number, number], rHand: 2.4, z, shade,
});

function pauldron(d: Draw, sh: V, el: V, z: number) {
  const a = Math.atan2(el.y - sh.y, el.x - sh.x) * 57.29578;
  const c = at(sh, a, 1.6);
  d.ellipse({ mat: PL, z, group: 'pauldron' }, c, 6.2, 5.2, a);
  const rim = at(sh, a, 5.8);
  d.line({ mat: RD, z: z + 0.05, group: 'pauldron', line: 'none' }, at(rim, a + 90, 4.2), at(rim, a - 90, 4.2), RD.ramp[3]);
}

function torso(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 7, 7],
    [4, 7, 7.2],
    [10, 8, 8.6],
    [15, 8.4, 9],
    [19, 8, 8],
    [22, 5.6, 4.8],
    [23.4, 3, 2.4],
  ]);
  d.poly({ mat: PL, z, group: 'cuirass' }, body, { kind: 'cyl', a: s.T(0, 1), b: s.T(23.4, 1), r: 9, bevel: 1.3 });
  d.line({ mat: PL, z: z + 0.1, group: 'cuirass', line: 'none' }, s.T(20, 5), s.T(6, 6.4), PL.ramp[5]);
  d.poly({ mat: LE, z: z + 1, group: 'belt' }, [s.T(3.8, -7.4), s.T(4, 7.6), s.T(1.2, 7.4), s.T(1, -7.2)], { kind: 'cyl', a: s.T(1, 0), b: s.T(4, 0), r: 7.6 });
}

/** A red panel of the surcoat hanging from the belt over his hips and thighs. */
function panel(d: Draw, s: Skel, z: number) {
  d.poly({ mat: CR, z, group: 'panel' }, [s.T(2, -3), s.T(2, 7), s.T(-12, 7.4), s.T(-14, 2.4), s.T(-12, -3.4)], { kind: 'cyl', a: s.T(-14, 2), b: s.T(2, 2), r: 5.4, bevel: 1 });
}

/** The closed helm of black steel: a jaw and a brow you can tell apart, a red-edged slit with a plain eye in it, breaths at the jaw, a tall red crest from brow to nape. */
function head(d: Draw, s: Skel, z: number) {
  const H = s.H;
  d.capsule({ mat: PL, z: z - 0.5, group: 'neck' }, s.neck, H(0, -4), 3.4, 3.2);
  d.ribbon({ mat: RD, z: z - 0.2, group: 'crest' }, [H(5, 7), H(1, 11), H(-4, 12.4), H(-9, 10.6), H(-12, 5.6), H(-13.4, 0)], [1.6, 2.6, 3, 2.8, 2, 0.8]);
  d.line({ mat: RD, z: z - 0.15, group: 'crest', line: 'none' }, H(1, 12), H(-8, 11), RD.ramp[5]);
  // the skull of the helm, then the visor over the front of it, jutting to a blunt point
  d.poly({ mat: PL, z, group: 'helm' }, [H(5.6, 2), H(5.6, 6), H(2, 8.2), H(-3, 8.2), H(-7, 5), H(-7.6, 0), H(-6.4, -6), H(0, -7.4), H(3, -6)], { kind: 'dome', c: H(-1.4, 2.6), r: 8.6, bevel: 1.2 });
  d.poly({ mat: ST, z: z + 0.1, group: 'visor', shade: -2 }, [H(-0.6, 3), H(6.4, 3.2), H(8.6, -1.6), H(6.6, -6.4), H(0.6, -7), H(-1.6, -2)], { kind: 'dome', c: H(3.4, -1), r: 7, bevel: 1 });
  const px: { p: V; c: (typeof PL.ramp)[number] }[] = [];
  for (const u of [0.4, 1.6, 2.8, 4, 5.2, 6.4]) px.push({ p: H(u, 1), c: INK.black });
  for (const u of [0.4, 1.6, 2.8, 4, 5.2, 6.4]) px.push({ p: H(u, 2.2), c: RD.ramp[3] });
  px.push({ p: H(3.6, 1), c: INK.eyeWhite });
  for (const [u, w] of [[3.2, -2.6], [5, -2.6], [3.2, -4.4], [5, -4.4]] as const) px.push({ p: H(u, w), c: INK.black });
  px.push({ p: H(-3, 6.8), c: PL.ramp[5] }, { p: H(-1.6, 7), c: PL.ramp[5] }, { p: H(-4.4, 6), c: PL.ramp[4] });
  d.pixels({ mat: PL, z: z + 0.2, group: 'helm', line: 'none', outline: false }, px);
}

function sword(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: LE, z, group: 'grip' }, f(-3, 0), f(3, 0), 1.2, 1.2);
  d.circle({ mat: IR, z: z + 0.02, group: 'grip' }, f(-3.8, 0), 1.6);
  d.capsule({ mat: IR, z: z + 0.03, group: 'guard' }, f(3.4, -4), f(3.4, 4), 1.1, 1.1);
  d.poly({ mat: ST, z: z + 0.01, group: 'blade' }, [f(4, -2.6), f(19, -2.8), f(23, 0), f(19, 2.8), f(4, 2.6)], { kind: 'bevel', w: 1.1 });
  d.line({ mat: ST, z: z + 0.05, group: 'blade', line: 'none' }, f(5, 0), f(20, 0), ST.ramp[5]);
}

/** The Dominion's standard: a black hexagon rimmed in iron, a red hexagon inside; `lie` flattens it on the ground. */
function hexShield(d: Draw, c: V, ang: number, z: number, lie: number) {
  const f0 = d.frame(c, ang);
  const f = (u: number, w: number) => f0(u, w * lie);
  const hex = (r: number) => [f(r, 0), f(r * 0.5, r * 0.84), f(-r * 0.5, r * 0.84), f(-r, 0), f(-r * 0.5, -r * 0.84), f(r * 0.5, -r * 0.84)];
  d.poly({ mat: IR, z, group: 'shieldRim' }, hex(16), { kind: 'bevel', w: 1.2 });
  d.poly({ mat: EB, z: z + 0.05, group: 'shield' }, hex(14.4), { kind: 'bevel', w: 1.4 });
  d.poly({ mat: RD, z: z + 0.1, group: 'hex' }, hex(7.6), { kind: 'bevel', w: 1.2 });
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const man = (hN: V, hF: V, o: Partial<Pose> & { p?: Record<string, number> }, sw = -70, sh = 90) =>
  pose({ armN: { ik: hN, bend: -1 }, armF: { ik: hF, bend: -1 }, ...o, p: { swAng: sw, shAng: sh, ...(o.p ?? {}) } });

const IDLE = man(v(-12, 31), v(17, 38), { y: -1, torso: 88, head: 88, legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) } });

function idle(t: number): Pose {
  const b = Math.round((1 - Math.cos(t * Math.PI * 2)) / 2);
  return man(v(-12, 31 - b), v(17, 38 - b), { y: -1 - b, torso: 88, head: 88, legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) } });
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
  return man(v(-12, 36 + bob), v(20, 42 + bob), { y: bob - 2, torso: 78, head: 84, legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang }, -60);
}

// Standard Ram: the shield drawn in to his chest, then all his weight behind it.
const RM_DRAW = man(v(-16, 34), v(8, 44), { x: -4, y: -2, torso: 98, head: 92, legN: { ik: v(-11, 3) }, legF: { ik: v(11, 3) } }, -60);
const RM_HIT = man(v(-8, 38), v(36, 46), { x: 12, y: -6, torso: 66, head: 76, legN: { ik: v(-15, 3) }, legF: { ik: v(20, 3) } }, -40);
const RM_HOLD = tweak(RM_HIT, { x: 10 });

// Blood Oath: shield and sword raised, then the standard driven into the ground before him.
const PL_RAISE = man(v(-10, 62), v(19, 56), { x: -2, y: 1, torso: 94, head: 96, legN: { ik: v(-9, 3) }, legF: { ik: v(11, 3) } }, 96);
const PL_DOWN = man(v(-13, 30), v(20, 20), { y: -9, torso: 72, head: 82, legN: { ik: v(-14, 3) }, legF: { ik: v(14, 3) } }, -70);
const PL_HOLD = tweak(PL_DOWN, { y: -8, torso: 76, head: 88 });

const HURT = man(v(-15, 31), v(13, 38), { x: -4, y: -1, torso: 100, head: 106, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10 });
const DEATH_KNEEL = man(v(-10, 22), v(16, 20), { y: -10, torso: 76, head: 60, legN: { ik: v(-14, 3) }, legF: { ik: v(9, 3) }, footN: -14 });
const DEATH_FALL = pose({
  x: 2, y: -6, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { drop: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -19, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { drop: 1 },
});
const RAISE = man(v(-12, 68), v(17, 42), { y: -1, torso: 90, head: 96, legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) } }, 88);

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'hex_warden',
  name: 'Hex Warden',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 190, idle) },
    run: { loop: true, frames: cycle(8, 84, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RM_DRAW, 2, 90, ease.out),
        ...keys([
          [RM_DRAW, 190],
          [RM_HIT, 80, { hit: true }],
          [RM_HOLD, 220],
        ]),
        ...tween(D, RM_HOLD, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, PL_RAISE, 2, 110, ease.out),
        ...keys([
          [PL_RAISE, 300],
          [PL_DOWN, 90, { hit: true }],
          [PL_HOLD, 420],
        ]),
        ...tween(D, PL_HOLD, IDLE, 3, 130, ease.inOut),
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
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -19.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, RAISE, 0.5), 100],
        [RAISE, 700],
        [mid(RAISE, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons (glyph space: y up)
// ---------------------------------------------------------------------------

export const hexWarden: ChampionArt = {
  char,
  iconBg: EB,
  icons: {
    standard_ram: () =>
      compose(EB, glyph((d) => hexShield(d, v(17, 20), 90, 4, 1)), (b) => {
        impactStar(b, 33, 20, 1, 6, 7, FXR.dust[3], E.white);
      }),
    blood_oath: () =>
      compose(CR, glyph((d) => {
        hexShield(d, v(20, 22), 90, 4, 1);
      }), (b) => {
        for (const [x, y, k] of [[8, 35, 3], [12, 36, 4], [17, 37, 2], [24, 37, 2], [28, 36, 4], [32, 35, 3]] as const) b.set(x, y, FXR.dust[k]);
      }),
    second_pulse: () =>
      compose(RD, glyph((d) => {
        d.poly({ mat: MAT.crimson, z: 3, group: 'heart' }, [v(20, 6), v(7, 21), v(9, 30), v(15, 32), v(20, 27), v(25, 32), v(31, 30), v(33, 21)], { kind: 'bevel', w: 2 });
      }), (b) => {
        for (const [x, y] of [[9, 20], [13, 20], [15, 16], [17, 25], [19, 19], [22, 19], [27, 19], [31, 19]] as const) b.set(x, y, E.white);
      }),
  },
};
