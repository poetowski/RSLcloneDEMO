// The Scarab Legionary (docs/DESIGN_DECISIONS.md section 92, Jakub's brief of
// 2026-11-07: a Tank "humanoid but not human, be very creative and visually
// consistent"): an Elite Tank of the Sanguine Dominion. A man-sized beetle on
// the Junior Ward's rig, walking upright and stooped: thin black jointed legs
// and arms, a black ribbed underside, and over its back a great domed shell
// lacquered the Dominion's crimson, the black hexagon painted on it (the
// silhouette, with the horn). A small black head thrust forward, a curved horn
// rising from it, two hooked mandibles, a red-amber eye. A short iron halberd in
// its near claw, a round iron shield on the far arm. Mandible Crush hooks with
// the halberd and bites; Close the Shell hunches under the shell and plants the
// shield. Its affinity (Tide) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 34,
  thigh: 16,
  shin: 16,
  ankleH: 3,
  footLen: 6.4,
  spine: 21,
  neck: 6.4,
  upperArm: 12.4,
  foreArm: 12.6,
  shoulderDrop: 4.2,
  shoulderN: -2.6,
  shoulderF: 3.2,
  hipN: -2.2,
  hipF: 2.2,
};

const CH = MAT.bullBlack, SH = MAT.crimsonPlate, IR = MAT.iron, WD = MAT.wood, AM = MAT.amber;
const E = ACCENT;

/** The halberd from the near claw: back to the butt, up to the blade's socket, to the spike. */
const BUTT = 14, SOCKET = 22, SPIKE = 30;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;

  // far leg, far arm with the shield's arm behind the body
  limbLeg(d, s, 'F', 10, -1);
  limbArm(d, s, 'F', 20, -1);
  // the underside, the shell over the back, the head
  underside(d, s, 30);
  shell(d, s, P.hunch ?? 0, 46);
  head(d, s, P, 38);
  // the shield before the body
  shield(d, s.hF, P.shAng ?? 92, 44);
  // near leg, the halberd, the near arm
  limbLeg(d, s, 'N', 50, 0);
  if (P.drop) halberd(d, v(-14, 2.4), 2, 56);
  else halberd(d, s.hN, P.hbAng ?? 80, 56);
  limbArm(d, s, 'N', 60, 0);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

/** A chitin leg: a thick thigh plate, a thin shin with a spur at the knee, a two-toed claw foot. */
function limbLeg(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF, knee = side === 'N' ? s.kneeN : s.kneeF, an = side === 'N' ? s.ankN : s.ankF;
  const g = 'leg' + side;
  d.capsule({ mat: CH, z, group: g, shade }, hip, knee, 3.6, 2.6);
  d.capsule({ mat: CH, z: z + 0.1, group: g, shade }, knee, an, 2.0, 1.6);
  // the spur at the knee, pointing back
  const ka = Math.atan2(knee.y - hip.y, knee.x - hip.x) * 57.29578;
  d.poly({ mat: CH, z: z + 0.15, group: g, shade }, [at(knee, ka + 90, 1.4), at(at(knee, ka + 150, 4.2), ka, 1), at(knee, ka - 90, 1.2)], { kind: 'bevel', w: 0.7 });
  // the claw foot: two toes forward, one back
  const f = d.frame(an, side === 'N' ? s.pose.footN : s.pose.footF);
  d.poly({ mat: CH, z: z + 0.2, group: g, shade }, [f(-3.4, -2.6), f(-1.4, 0.6), f(1.6, 0.4), f(6.6, -2.8), f(3.6, -2.4), f(2.4, -1.4), f(0.4, -2.8)], { kind: 'bevel', w: 0.9 });
}

/** A chitin arm: a plated upper arm, a thin forearm with a spur, a hooked claw for a hand. */
function limbArm(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF, el = side === 'N' ? s.eN : s.eF, ha = side === 'N' ? s.hN : s.hF;
  const g = 'arm' + side;
  d.capsule({ mat: CH, z, group: g, shade }, sh, el, 3.0, 2.2);
  d.capsule({ mat: CH, z: z + 0.1, group: g, shade }, el, ha, 1.9, 1.7);
  const fa = Math.atan2(ha.y - el.y, ha.x - el.x) * 57.29578;
  d.poly({ mat: CH, z: z + 0.15, group: g, shade }, [at(el, fa + 90, 1.2), at(at(el, fa + 140, 3.6), fa, 1.2), at(el, fa - 90, 1)], { kind: 'bevel', w: 0.6 });
  d.ellipse({ mat: CH, z: z + 0.3, group: g, shade }, ha, 2.2, 1.8, fa);
}

/** The ribbed black underside from the hips to the neck, a little pale in the joints between its plates. */
function underside(d: Draw, s: Skel, z: number) {
  const pts: V[] = [s.T(-1, -4), s.T(4, -5), s.T(10, -5.6), s.T(16, -5.4), s.T(20.6, -3.6), s.T(21.4, 1), s.T(20, 6.2), s.T(15, 7.6), s.T(9, 7.4), s.T(3, 6.8), s.T(-1.4, 5.6)];
  d.poly({ mat: CH, z, group: 'under', tex: (h) => (Math.abs(((h.v * 5) % 1) - 0.5) > 0.42 ? 1 : 0) }, pts, { kind: 'cyl', a: s.T(-1, 1), b: s.T(21, 1), r: 7.6, bevel: 1.2 });
}

/**
 * The great shell over the back from below the hips to above the shoulders,
 * domed, lacquered crimson, the seam between its two wing cases down its
 * middle, the black hexagon painted on it; `hunch` (0-1) draws it up and over.
 */
function shell(d: Draw, s: Skel, hunch: number, z: number) {
  const k = 1 + hunch * 0.15;
  const pts = [s.T(-8, -1), s.T(-6, -9.4 * k), s.T(2, -14.4 * k), s.T(11, -15.6 * k), s.T(19, -13.6 * k), s.T(24 + hunch * 2, -7.4 * k), s.T(25 + hunch * 2, -0.4), s.T(20, 0.6), s.T(12, -0.2), s.T(4, 0), s.T(-3, 0.4)];
  d.poly({ mat: SH, z, group: 'shell', tex: (h) => (Math.sin(h.u * 4 + 1) > 0.94 ? 1 : 0) }, pts, { kind: 'dome', c: s.T(11, -9), r: 17, bevel: 1.4 });
  // the seam between the wing cases, along the top of the dome
  d.ribbon({ mat: SH, z: z + 0.1, group: 'shell', shade: -2, line: 'none' }, [s.T(-5, -8.6 * k), s.T(3, -13 * k), s.T(12, -14.2 * k), s.T(21, -11.2 * k)], [0.6, 0.6, 0.6, 0.6]);
  // the black hexagon painted on the shell
  const c = s.T(10, -9.6 * k), x0 = Math.floor(c.x) + 0.5, y0 = Math.floor(c.y) + 0.5;
  const px: { p: V; c: RGBA }[] = [];
  for (const [x, y] of [[-1, 2], [0, 2], [1, 2], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-1, -2], [0, -2], [1, -2]]) px.push({ p: v(x0 + x, y0 + y), c: CH.ramp[1] });
  d.pixels({ mat: CH, z: z + 0.2, group: 'shellMark', line: 'none', outline: false }, px);
}

/** The head thrust forward: a small black skull, a curved horn rising from it, two hooked mandibles, a red-amber eye. */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  d.capsule({ mat: CH, z: z - 0.5, group: 'neck' }, s.neck, H(0, -2), 2.6, 2.6);
  d.ellipse({ mat: CH, z, group: 'head' }, H(1.4, 0), 5.2, 4.2, s.headDir - 90);
  // the horn: from the brow, curving up and back
  d.ribbon({ mat: CH, z: z + 0.2, group: 'horn' }, [H(3.4, 3.2), H(4.4, 7), H(3.2, 10.4), H(0.6, 12.0)], [2.0, 1.6, 1.0, 0.4]);
  // the mandibles, open by P.jaw
  const jaw = P.jaw ?? 0.2;
  for (const [w, sgn, sh] of [[-0.6, -1, -1], [-2.4, 1, 0]] as const) {
    const root = H(5.4, w);
    const a = s.headDir - 90 + sgn * (10 + jaw * 30);
    const f = d.frame(root, a);
    d.poly({ mat: CH, z: z + (sh ? -0.1 : 0.3), group: 'mand' + sgn, shade: sh }, [f(0, 1.1), f(4.6, 0.8), f(6.4, -1.6 * sgn), f(5, -0.6 * sgn), f(0, -1.1)], { kind: 'bevel', w: 0.7 });
  }
  // the eye
  if (P.dead) d.pixels({ mat: CH, z: z + 0.4, group: 'eye', line: 'none' }, [{ p: H(3.2, 1.2), c: CH.ramp[3] }]);
  else d.pixels({ mat: AM, z: z + 0.4, group: 'eye', line: 'none', outline: false }, [{ p: H(3.2, 1.2), c: AM.ramp[4] }, { p: H(3.8, 1.2), c: AM.ramp[3] }, { p: H(3.2, 1.8), c: E.white }]);
}

/** The round iron shield on the far arm, its boss, a rim of rivets. */
function shield(d: Draw, hand: V, ang: number, z: number) {
  const c = v(hand.x + 1.5, hand.y + 1);
  const R = 9.6, K = 0.78;
  d.ellipse({ mat: IR, z, group: 'shield', line: 'soft' }, c, R * K, R, ang - 90);
  const f = d.frame(c, ang);
  d.ellipse({ mat: IR, z: z + 0.1, group: 'shield', shade: -1, line: 'none' }, c, (R - 1.6) * K, R - 1.6, ang - 90);
  d.circle({ mat: IR, z: z + 0.2, group: 'shield' }, f(0.3, 0), 2.4);
  d.pixels({ mat: IR, z: z + 0.25, group: 'shield' }, [{ p: f(1.0, -0.6), c: IR.ramp[5] }]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    d.pixels({ mat: IR, z: z + 0.15, group: 'shield' }, [{ p: f(Math.cos(a) * (R - 0.8), Math.sin(a) * (R - 0.8) * K), c: IR.ramp[5] }]);
  }
}

/** The short halberd: a dark shaft, an axe blade with a hooked back spike, a spike at the top. */
function halberd(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: WD, z, group: 'hshaft' }, f(-BUTT, 0), f(SPIKE - 3, 0), 1.0, 0.95);
  d.poly({ mat: IR, z: z + 0.05, group: 'hblade' }, [f(SOCKET - 4, 0.8), f(SOCKET - 5, 5.6), f(SOCKET + 1, 6.4), f(SOCKET + 3, 0.8)], { kind: 'bevel', w: 0.9 });
  d.poly({ mat: IR, z: z + 0.05, group: 'hhook' }, [f(SOCKET - 2, -0.8), f(SOCKET - 4, -4.6), f(SOCKET, -1.4)], { kind: 'bevel', w: 0.6 });
  d.poly({ mat: IR, z: z + 0.06, group: 'hspike' }, [f(SOCKET + 2, -0.9), f(SPIKE, 0), f(SOCKET + 2, 0.9)], { kind: 'bevel', w: 0.6 });
  d.line({ mat: IR, z: z + 0.07, group: 'hblade', line: 'none' }, f(SOCKET - 4.6, 5.4), f(SOCKET + 0.6, 6.0), IR.ramp[5]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the halberd's angle is absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

const hb = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, armF: { ik: v(9, 34), bend: -1 }, ...extra, p: { hbAng: ang, ...(extra.p ?? {}) } });

// At rest: stooped forward under the shell, the halberd upright, the shield held before the body.
const IDLE = hb(v(2, 32), 84, { y: -2, torso: 78, head: 70, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, p: { jaw: 0.2 } });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -2 - b, p: { jaw: 0.2 + Math.max(0, Math.sin(a)) * 0.3 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -10 * Math.cos(ph), y: 3 + (sn > 0 ? 6 * sn : 0), ang: sn > 0 ? -20 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return hb(v(0, 32 + bob), 40, {
    y: bob - 3, torso: 70, head: 64,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    p: { jaw: 0.1 },
  });
}

// Mandible Crush: the halberd swung over and hooked down onto the enemy, then the head thrust in, mandibles shut.
const MC_RAISE = hb(v(-6, 46), 120, { x: -2, y: -1, torso: 86, head: 80, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, p: { jaw: 0.6 } });
const MC_HOOK = hb(v(16, 30), 10, { x: 7, y: -4, torso: 66, head: 56, legN: { ik: v(-13, 3) }, legF: { ik: v(15, 3) }, p: { jaw: 1 } });
const MC_BITE = hb(v(14, 28), 0, { x: 9, y: -5, torso: 62, head: 50, legN: { ik: v(-13, 3) }, legF: { ik: v(16, 3) }, p: { jaw: 0 } });
const MC_HOLD = tweak(MC_BITE, { x: 8, p: { jaw: 0.3 } });

// Close the Shell: it hunches deep under the shell and plants the shield, the halberd grounded behind it.
const CS_HUNCH = hb(v(-6, 28), 96, { y: -6, torso: 64, head: 44, legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) }, armF: { ik: v(13, 24), bend: -1 }, p: { hunch: 1, jaw: 0, shAng: 96 } });
const CS_SET = tweak(CS_HUNCH, { y: -7, p: { hunch: 1, jaw: 0.6 } });

const HURT = hb(v(-8, 30), 96, { x: -4, y: -1, torso: 92, head: 92, legN: { ik: v(-11, 3) }, legF: { ik: v(8, 4) }, footF: 10, p: { jaw: 0.9 } });

// Death: it sinks to its knees, then topples onto its side, the shell rolled up.
const DEATH_KNEEL = hb(v(-4, 24), 96, { x: 0, y: -10, torso: 70, head: 50, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, footN: -30, p: { jaw: 0.4 } });
const DEATH_FALL = pose({ x: 2, y: -6, torso: 30, head: 30, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { drop: 1, jaw: 0.4 } });
const DEATH_DOWN = pose({ x: 6, y: -14, torso: 4, head: 26, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { drop: 1, dead: 1, jaw: 0.6 } });

// Victory: the halberd raised, mandibles clacking.
const VIC = hb(v(-6, 56), 92, { armN: { ik: v(-6, 56), bend: 1 }, y: -1, torso: 84, head: 90, legN: { ik: v(-8, 3) }, legF: { ik: v(9, 3) }, p: { jaw: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'scarab_legionary',
  name: 'Scarab Legionary',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 180, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, MC_RAISE, 2, 90, ease.out),
        ...keys([
          [MC_RAISE, 180],
          [MC_HOOK, 70],
          [MC_BITE, 90, { hit: true }],
          [MC_HOLD, 220],
        ]),
        ...tween(D, MC_HOLD, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CS_HUNCH, 3, 90, ease.out),
        ...keys([
          [CS_HUNCH, 160, { event: 'cast' }],
          [CS_SET, 140, { hit: true }],
          [CS_HUNCH, 420],
        ]),
        ...tween(D, CS_HUNCH, IDLE, 3, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 88, head: 86 }), 110],
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
        [tweak(DEATH_DOWN, { y: -14.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, VIC, 0.5), 100],
        [VIC, 250],
        [tweak(VIC, { p: { jaw: 0 } }), 150],
        [VIC, 400],
        [mid(VIC, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons
// ---------------------------------------------------------------------------

export const scarabLegionary: ChampionArt = {
  char,
  iconBg: CH,
  icons: {
    mandible_crush: () =>
      compose(CH, glyph((d) => {
        // two hooked mandibles closing
        for (const [y, sgn] of [[24, -1], [14, 1]] as const) {
          const f = d.frame(v(6, y), sgn * -14);
          d.poly({ mat: SH, z: 10 + sgn, group: 'im' + sgn }, [f(0, 2.4), f(18, 1.6), f(26, -4 * sgn), f(20, -1.2 * sgn), f(0, -2.4)], { kind: 'bevel', w: 1.2 });
        }
      }), (b) => {
        for (const [x, y] of [[33, 19], [35, 17], [34, 22], [36, 20]] as const) b.set(x, y, E.white);
      }),
    close_the_shell: () =>
      compose(CH, glyph((d) => {
        d.poly({ mat: SH, z: 10, group: 'ishell' }, [v(4, 8), v(8, 22), v(20, 30), v(32, 22), v(36, 8), v(20, 12)], { kind: 'dome', c: v(20, 18), r: 20, bevel: 1.6 });
        d.ribbon({ mat: SH, z: 10.2, group: 'ishell', shade: -2, line: 'none' }, [v(20, 12), v(20, 29)], [0.8, 0.8]);
      })),
    lacquered_shell: () =>
      compose(CH, glyph((d) => {
        d.ellipse({ mat: SH, z: 10, group: 'ishell2' }, v(20, 20), 14, 11, 0);
      }), (b) => {
        for (const [x, y] of [[19, 18], [20, 18], [21, 18], [18, 19], [19, 19], [20, 19], [21, 19], [22, 19], [18, 20], [19, 20], [20, 20], [21, 20], [22, 20], [19, 21], [20, 21], [21, 21]] as const) b.set(x, y, CH.ramp[1]);
      }),
  },
};
