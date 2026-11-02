// The Bog Troll (docs/DESIGN_DECISIONS.md section 69, 2026-11-02, my design on Jakub's
// word): an Elite Tank of the Court of Root. Huge and hunched: a great back and
// shoulders, long arms hanging past the knee, a small head thrust forward with an
// underbite and two yellow tusks, long drooping ears (the silhouette, with the log); a
// grey-green hide, thick moss for hair down his back with a few leaves in it, a rag of
// old pelt at his hips; a whole log for a club, its broken branches still on it. No
// insignia: the Court shares a nature, not a hierarchy. His affinity (Ember) sets
// nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, INK, MAT } from '../palette.ts';
import { leg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 31,
  thigh: 15,
  shin: 14.4,
  ankleH: 3,
  footLen: 8,
  spine: 27,
  neck: 12,
  upperArm: 18,
  foreArm: 17,
  shoulderDrop: 5,
  shoulderN: -6,
  shoulderF: 6,
  hipN: -3.4,
  hipF: 3.4,
};

const HD = MAT.trollHide, MS = MAT.moss, GR = MAT.green, PT = MAT.furBrown, BK = MAT.bark, BN = MAT.calabash;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;

  leg(d, s, 'F', legCfg(10, -1));
  bigArm(d, s.sF, s.eF, s.hF, 14, -1, 'armF');
  torso(d, s, 30);
  head(d, s, P, 36);
  mossBack(d, s, P, 37);
  leg(d, s, 'N', legCfg(40, 0));
  pelt(d, s, 42);
  if (P.drop) log(d, v(10, 4.6), 2, 50);
  else log(d, s.hN, P.lgAng ?? -60, 50);
  bigArm(d, s.sN, s.eN, s.hN, 60, 0, 'armN');
  shoulderMoss(d, s.sN, 61);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: HD, shin: HD, foot: HD, rThigh: [6.4, 5] as [number, number], rShin: [5, 4.4] as [number, number], z, shade, footStyle: 'bare' as const,
});

function bigArm(d: Draw, sh: V, el: V, ha: V, z: number, shade: number, group: string) {
  d.capsule({ mat: HD, z, group, shade }, sh, el, 6.2, 4.8);
  d.capsule({ mat: HD, z: z + 0.1, group, shade }, el, ha, 5, 4.4);
  d.ellipse({ mat: HD, z: z + 0.3, group, shade }, ha, 4.4, 3.8, 0);
}

function torso(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [-2, 8, 9],
    [4, 9, 11],
    [10, 11, 12.4],
    [16, 12.4, 12],
    [22, 11.4, 9.6],
    [26, 8, 6],
    [28, 4, 3],
  ]);
  d.poly({ mat: HD, z, group: 'body' }, body, { kind: 'cyl', a: s.T(0, 1), b: s.T(28, 1), r: 12, bevel: 1.4 });
  // the pale belly hanging in front
  d.ellipse({ mat: HD, z: z + 0.1, group: 'belly', line: 'none', shade: 1 }, s.T(8, 7), 7.6, 4.6, s.torso);
}

/**
 * The head's frame, scaled up: the pose's head is the line of his neck, thrust far
 * forward, so the face is turned back up to look ahead, nodding only half as far as
 * the neck does.
 */
function headFrame(s: Skel) {
  const d = ((78 + (s.headDir - 22) * 0.5) - s.headDir) * (Math.PI / 180);
  const c = Math.cos(d) * 1.35, n = Math.sin(d) * 1.35;
  return (u: number, w: number) => s.H(u * c - w * n, u * n + w * c);
}

/** The small head thrust forward: a heavy brow, a broad nose, a great underbite with two yellow tusks, a long drooping ear. */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = headFrame(s);
  const jaw = P.jaw ?? 0;
  d.capsule({ mat: HD, z: z - 0.5, group: 'neck' }, s.neck, H(-1, -2), 6, 5);
  if (jaw > 0.05) d.poly({ mat: HD, z: z - 0.1, group: 'mouth', color: E.mouthRed, line: 'none' }, [H(-1, -3), H(8.4, -2.6), H(8.4, -5 - jaw * 7), H(-1, -5 - jaw * 5)]);
  // the lower jaw, swinging open
  const jy = -jaw * 6;
  d.poly({ mat: HD, z: z + 0.05, group: 'jaw' }, [H(-3, -2), H(9, -3 + jy), H(10, -6 + jy), H(7, -9 + jy), H(0, -8.6 + jy * 0.7), H(-4, -5)], { kind: 'bevel', w: 1.4 });
  for (const u of [8, 3]) d.ribbon({ mat: BN, z: z + 0.1, group: 'tusk' + u, line: 'soft' }, [H(u, -5 + jy), H(u + 0.5, -1.6 + jy)], [1, 0.4]);
  d.poly({ mat: HD, z, group: 'skull' }, [H(-5.6, -2), H(-6, 3), H(-3, 6.6), H(2, 7), H(7, 4.6), H(8, 2), H(9.4, 0), H(8.4, -2.6), H(2, -3.4)], { kind: 'dome', c: H(1, 2), r: 7.6, bevel: 1.2 });
  d.line({ mat: HD, z: z + 0.1, group: 'skull', line: 'none', shade: -1 }, H(2, 2.6), H(7.4, 2), HD.ramp[0]);
  d.pixels({ mat: HD, z: z + 0.2, group: 'skull', line: 'none', outline: false }, P.dead
    ? [{ p: H(4.8, 0.8), c: HD.ramp[0] }, { p: H(5.8, 0.8), c: HD.ramp[0] }]
    : [{ p: H(4.8, 1), c: E.eyeAmber }, { p: H(5.8, 1), c: INK.eye }]);
  // the long drooping ear
  d.poly({ mat: HD, z: z + 0.15, group: 'ear' }, [H(-2.4, 2), H(-4.6, 2.6), H(-10, -2), H(-10.4, -6), H(-6, -3), H(-2.2, -1)], { kind: 'bevel', w: 1 });
}

/** Moss for hair: over the crown, down his neck and all down the great back, in hanging tufts; a leaf or two in it. */
function mossBack(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const T = s.T, H = headFrame(s);
  const w = Math.sin(P.wave ?? 0) * 0.5;
  const tex = (_h: unknown, x: number, y: number) => ((x * 3 + y * 5) % 6 === 0 ? -1 : (x * 7 + y * 2) % 9 === 0 ? 1 : 0);
  d.poly({ mat: MS, z, group: 'moss', tex },
    [H(-1, 9), H(-5, 9), H(-9, 5), T(27, -7), T(25, -12), T(19, -14.4), T(12, -14.4 + w), T(10, -11), T(7, -13 + w), T(4, -10), T(9, -7), T(15, -7.6), T(17, -4), T(21, -5.6), T(23, -2), H(-7, 1.6), H(-4, 6)],
    { kind: 'dome', c: T(19, -8), r: 15, bevel: 1.2 });
  d.ribbon({ mat: GR, z: z + 0.1, group: 'mossLeaf', line: 'soft' }, [T(24, -11), T(28, -16), T(27, -21)], [0.9, 1.6, 0.3]);
  d.ribbon({ mat: GR, z: z + 0.1, group: 'mossLeaf2', line: 'soft' }, [T(15, -13.4), T(16, -18), T(12, -21)], [0.9, 1.5, 0.3]);
}

function shoulderMoss(d: Draw, sh: V, z: number) {
  d.ellipse({ mat: MS, z, group: 'shMoss' }, at(sh, 120, 1.6), 6, 4, 10);
}

/** A rag of old pelt at his hips, hanging in points. */
function pelt(d: Draw, s: Skel, z: number) {
  d.poly({ mat: PT, z, group: 'pelt' }, [s.T(2, -9), s.T(2, 11), s.T(-8, 11), s.T(-12, 7.6), s.T(-8, 4), s.T(-14, 0), s.T(-8.6, -3), s.T(-11, -8)], { kind: 'bevel', w: 1.6 });
}

/** The log: thick at the head, thin at the grip, broken stubs of branch, moss on it, a pale broken end. */
function log(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.ribbon({ mat: BK, z, group: 'log', tex: (h) => (Math.sin(h.u * 32) > 0.7 ? -1 : 0) }, [f(-6, 0), f(6, 0), f(20, 0.6), f(34, 0)], [2.8, 3.4, 5, 6.2]);
  d.capsule({ mat: BK, z: z + 0.02, group: 'stub1' }, f(17, 3), f(21, 9), 1.8, 1.2);
  d.capsule({ mat: BK, z: z + 0.02, group: 'stub2' }, f(26, -4), f(31, -10), 2, 1.2);
  d.ellipse({ mat: MAT.wood, z: z + 0.03, group: 'logEnd', line: 'soft' }, f(35, 0), 2.6, 5.4, ang);
  d.ribbon({ mat: MS, z: z + 0.05, group: 'logMoss', line: 'none' }, [f(14, 3), f(23, 4.2), f(32, 4.8)], [1.2, 1.6, 1.2]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the log's angle is absolute: 0 forward, 90 up)
// ---------------------------------------------------------------------------

const troll = (hN: V, hF: V, o: Partial<Pose> & { p?: Record<string, number> }, lg = -56) =>
  pose({ armN: { ik: hN, bend: -1 }, armF: { ik: hF, bend: 1 }, ...o, p: { lgAng: lg, jaw: 0, ...(o.p ?? {}) } });

const STAND = { torso: 64, head: 22, legN: { ik: v(-12, 3) }, legF: { ik: v(11, 3) } };
const IDLE = troll(v(2, 47), v(27, 22), { x: -2, y: -1, ...STAND }, 148);

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return troll(v(2, 47 - b), v(27, 22 - b), { x: -2, y: -1 - b, ...STAND, head: 12 - b, p: { wave: a } }, 148 + b);
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const bob = Math.round(Math.cos(2 * a));
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (sn > 0 ? 5 * sn : 0), ang: sn > 0 ? -18 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return troll(v(5, 49 + bob), v(28 - Math.cos(a) * 5, 26 + bob), { x: 0, y: bob - 2, torso: 56, head: 12, legN: { ik: v(n.x - 2, n.y) }, legF: { ik: v(f.x + 2, f.y) }, footN: n.ang, footF: f.ang, p: { wave: a * 2 } }, 150);
}

// Log Swing: the log hauled up behind his head, then all of him comes down after it.
const LS_UP = troll(v(-18, 66), v(10, 52), { x: -6, y: 2, torso: 84, head: 26, legN: { ik: v(-14, 3) }, legF: { ik: v(10, 3) }, p: { jaw: 0.5 } }, 122);
const LS_DOWN = troll(v(30, 34), v(22, 22), { x: 10, y: -8, torso: 40, head: -4, legN: { ik: v(-16, 3) }, legF: { ik: v(20, 3) }, p: { jaw: 0.9 } }, -8);
const LS_HOLD = tweak(LS_DOWN, { y: -7, p: { jaw: 0.3 } });

// Swamp Belch: he fills up, the head back; then leans over and lets it go.
const SB_FILL = troll(v(-2, 50), v(24, 30), { x: -4, y: 1, torso: 78, head: 36, legN: { ik: v(-12, 3) }, legF: { ik: v(11, 3) }, p: { jaw: 0.2 } }, 152);
const SB_GO = troll(v(8, 42), v(30, 20), { x: 4, y: -4, torso: 50, head: 2, legN: { ik: v(-13, 3) }, legF: { ik: v(15, 3) }, p: { jaw: 1 } }, 138);
const SB_LET = tweak(SB_GO, { x: 3, head: 6, p: { jaw: 0.7 } });

const HURT = troll(v(-3, 45), v(20, 28), { x: -4, y: -1, torso: 72, head: 30, legN: { ik: v(-14, 3) }, legF: { ik: v(8, 4) }, p: { jaw: 0.5 } }, 158);
const DEATH_KNEEL = troll(v(0, 8), v(24, 8), { y: -10, torso: 50, head: -14, legN: { ik: v(-15, 3) }, legF: { ik: v(9, 3) }, footN: -12, p: { dead: 1 } }, -8);
const DEATH_FALL = pose({
  x: 2, y: -6, torso: 24, head: 6,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -40, lo: -10 }, armF: { up: -20, lo: 10 },
  p: { drop: 1, dead: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -17, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { drop: 1, dead: 1 },
});

// Victory: the log up in one hand, the mouth wide.
const RAISE = troll(v(-6, 70), v(24, 30), { y: 0, torso: 76, head: 30, legN: { ik: v(-12, 3) }, legF: { ik: v(11, 3) }, p: { jaw: 1 } }, 92);

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'bog_troll',
  name: 'Bog Troll',
  dims: D,
  build,
  footprint: 1.5,
  anims: {
    idle: { loop: true, frames: cycle(8, 210, idle) },
    run: { loop: true, frames: cycle(8, 90, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, LS_UP, 2, 110, ease.out),
        ...keys([
          [LS_UP, 260],
          [mid(LS_UP, LS_DOWN, 0.5), 60],
          [LS_DOWN, 90, { hit: true }],
          [LS_HOLD, 280],
        ]),
        ...tween(D, LS_HOLD, IDLE, 3, 120, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SB_FILL, 2, 120, ease.out),
        ...keys([
          [SB_FILL, 340],
          [SB_GO, 110, { event: 'cast', hit: true }],
          [SB_LET, 360],
        ]),
        ...tween(D, SB_LET, IDLE, 3, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 100],
        [tweak(HURT, { x: -3, torso: 70 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 130],
        [mid(HURT, DEATH_KNEEL, 0.5), 120],
        [DEATH_KNEEL, 280],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 150],
        [tweak(DEATH_DOWN, { y: -17.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, RAISE, 0.5), 110],
        [RAISE, 700],
        [mid(RAISE, IDLE, 0.5), 120],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons (glyph space: y up)
// ---------------------------------------------------------------------------

export const bogTroll: ChampionArt = {
  char,
  iconBg: MS,
  icons: {
    log_swing: () =>
      compose(BK, glyph((d) => log(d, v(9, 7), 52, 4)), (b) => impactStar(b, 31, 10, 1, 6, 7, FXR.dust[3], E.white)),
    swamp_belch: () =>
      compose(MS, glyph((d) => {
        for (const [x, y, r, k] of [[13, 15, 7, 3], [24, 19, 8, 4], [18, 27, 6, 3], [30, 29, 4, 2]] as const) d.circle({ mat: MAT.rotGreen, z: 2 + k * 0.1, group: 'gas' + x }, v(x, y), r);
      })),
    moss_grows_back: () =>
      compose(GR, glyph((d) => {
        d.ribbon({ mat: MS, z: 3, group: 'stem', line: 'soft' }, [v(20, 5), v(20, 16), v(20, 24)], [2, 1.6, 1]);
        d.ribbon({ mat: GR, z: 4, group: 'leafA' }, [v(20, 16), v(11, 23), v(6, 31)], [1, 3.4, 0.4]);
        d.ribbon({ mat: GR, z: 4, group: 'leafB' }, [v(20, 22), v(28, 28), v(33, 36)], [1, 3.2, 0.4]);
      })),
  },
};
