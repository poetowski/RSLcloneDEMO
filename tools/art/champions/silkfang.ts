// Silkfang (docs/DESIGN_DECISIONS.md section 68, 2026-11-02, my design on Jakub's
// word): an Elite Damage of the Court of Root, a great old jungle spider. A round body
// slung between eight tall arched legs (the silhouette, with the knees standing above
// her back); bark-brown, the great abdomen grown over with moss and a few fern fronds,
// as the forest grows on the Bristleback, pale chevrons showing through; eight amber
// eyes, two pale fangs. No insignia: the Court shares a nature, not a hierarchy. Her
// affinity (Tide) sets nothing here (Jakub, 2026-10-11).
//
// The rig is her own (solveSpider): the shared pose gives the body (x, y, torso tilt)
// and p carries the rest: p.walk the legs' phase, p.step how far they stride, p.front
// lifts the front pair (0-1), p.fang opens the fangs, p.abd tips the abdomen up (deg),
// p.curl folds every leg in under her (0-1, her death). Dims make the shared solver's
// head her head, for the portrait; the body stands behind the pivot so that effects and
// hits land under her front.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, dir, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 38,
  thigh: 10,
  shin: 10,
  ankleH: 3,
  footLen: 4,
  spine: 12,
  neck: 8,
  upperArm: 10,
  foreArm: 10,
  shoulderDrop: 0,
  shoulderN: 0,
  shoulderF: 0,
  hipN: 0,
  hipF: 0,
};

const BK = MAT.bark, DK = MAT.furBlack, MS = MAT.moss, GR = MAT.green, BN = MAT.bone, SI = MAT.whiteCloth;
const E = ACCENT;

const BACK = -7;

interface SLeg { root: V; knee: V; foot: V }

/** Where each foot stands at rest (x from the pivot), its phase in the walk: near four, then far four. */
const NEAR: [number, number][] = [[42, 0], [22, 2.2], [-8, 4.4], [-36, 1.1]];
const FAR: [number, number][] = [[50, 3.1], [31, 5.3], [2, 1.1], [-25, 4.2]];

function legsOf(s: Skel, B: (u: number, w: number) => V) {
  const P = s.pose.p;
  const walk = P.walk ?? 0, step = P.step ?? 0, front = P.front ?? 0, curl = P.curl ?? 0;
  const one = (base: number, ph: number, i: number, rootU: number, rootW: number, side: number): SLeg => {
    const root = B(rootU, rootW);
    const swing = Math.sin(walk + ph) * step;
    const lift = Math.max(0, Math.cos(walk + ph)) * step * 0.45;
    let foot = v(base + s.pose.x * 0.2 + swing, 1.5 + lift);
    // the front pair lifts toward the enemy
    if (i === 0 && front) foot = lerpV(foot, v(base + 2, 38 + side * 3), front);
    if (i === 1 && front) foot = lerpV(foot, v(base + 4, 1.5 + front * 8), front * 0.6);
    if (curl) foot = lerpV(foot, v(root.x + (i - 1.5) * 3.4, Math.max(2, root.y - 7)), curl);
    const L1 = i < 2 ? 33 : 31, L2 = i < 2 ? 37 : 34;
    // every knee arches up, whichever way the foot lies
    const r = ik2(root, foot, L1, L2, foot.x >= root.x ? 1 : -1);
    return { root, knee: r.mid, foot: r.end };
  };
  return {
    near: NEAR.map(([b, ph], i) => one(b, ph, i, 16 - i * 4, -2.6, 1)),
    far: FAR.map(([b, ph], i) => one(b, ph, i, 17 - i * 4, -1.4, -1)),
  };
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const c = v(s.pose.x, D.hipH + s.pose.y);
  const ax = dir(s.pose.torso), up = dir(s.pose.torso + 90);
  const B = (u: number, w: number) => v(c.x + ax.x * u + up.x * w, c.y + ax.y * u + up.y * w);
  const L = legsOf(s, B);

  L.far.forEach((l, i) => leg(d, l, 10 + i * 0.1, -1, 'F' + i));
  abdomen(d, B, P, 20);
  L.near.forEach((l, i) => leg(d, l, 24 + i * 0.1, 0, 'N' + i));
  cephalo(d, B, s, P, 30);
}

/** One leg: bark brown, thick at the root, thin at the foot, a pale band at the knee and the shin. */
function leg(d: Draw, l: SLeg, z: number, shade: number, g: string) {
  const group = 'leg' + g;
  d.capsule({ mat: BK, z, group, shade }, l.root, l.knee, 2.2, 1.7);
  d.capsule({ mat: BK, z: z + 0.02, group, shade }, l.knee, l.foot, 1.7, 0.7);
  d.circle({ mat: BK, z: z + 0.03, group, shade: shade + 1 }, l.knee, 2.1);
  const m = lerpV(l.knee, l.foot, 0.42);
  const a = Math.atan2(l.foot.y - l.knee.y, l.foot.x - l.knee.x) * 57.29578 + 90;
  d.line({ mat: BN, z: z + 0.04, group, line: 'none' }, at(m, a, 1.4), at(m, a, -1.4), BN.ramp[shade < 0 ? 2 : 3]);
  const n = lerpV(l.root, l.knee, 0.6);
  const b = Math.atan2(l.knee.y - l.root.y, l.knee.x - l.root.x) * 57.29578 + 90;
  d.line({ mat: MS, z: z + 0.04, group, line: 'none' }, at(n, b, 1.8), at(n, b, -1.8), MS.ramp[shade < 0 ? 2 : 4]);
}

/** The abdomen: a great round bulk behind her, bark beneath, moss over the top with pale chevrons showing through, fern fronds growing from it, her spinnerets at the end. */
function abdomen(d: Draw, B: (u: number, w: number) => V, P: Record<string, number>, z: number) {
  const tip = P.abd ?? 0;
  const c = B(-14, 3 + tip * 0.08);
  const a = 180 - tip;
  const F = d.frame(c, a); // u back along the abdomen, w toward... its side
  const up = (u: number, w: number) => F(u, -w);
  d.poly({ mat: BK, z, group: 'abdomen' }, [up(-13, 0), up(-10, 9), up(-2, 13), up(7, 12), up(14, 7), up(17, 0), up(14, -7), up(6, -11), up(-3, -11.4), up(-10, -8)], { kind: 'dome', c: up(0, 2), r: 15, bevel: 1.4 });
  d.poly({ mat: MS, z: z + 0.1, group: 'abdomenMoss', line: 'none', tex: (_h, x, y) => ((x * 5 + y * 3) % 7 === 0 ? -1 : (x * 2 + y * 7) % 11 === 0 ? 1 : 0) }, [up(-12, 2), up(-10, 9), up(-2, 13), up(7, 12), up(14, 7), up(16, 1), up(11, 0.6), up(7, -2), up(2, 0.4), up(-3, -1.6), up(-8, 0.4)], { kind: 'dome', c: up(1, 7), r: 13, bevel: 1 });
  // pale chevrons down her back
  for (const [u, k] of [[-5, 4], [1, 4], [7, 3]] as const) {
    d.ribbon({ mat: BN, z: z + 0.2, group: 'chevrons', line: 'none' }, [up(u - 2.6, 9.4), up(u, 6), up(u + 2.6, 9.4)], [0.8, 1, 0.8]);
    void k;
  }
  // fern fronds and leaves growing from the moss
  for (const [u, w, ang, len] of [[-5, 12, 118, 8], [2, 13, 92, 10], [8, 11.6, 66, 7]] as const) {
    const root = up(u, w);
    const dirA = ang - tip;
    d.ribbon({ mat: GR, z: z - 0.1, group: 'fern' + u, line: 'soft' }, [root, at(root, dirA, len * 0.55), at(root, dirA - 16, len)], [1.1, 1.5, 0.3]);
  }
  // the spinnerets
  d.ellipse({ mat: DK, z: z + 0.05, group: 'spin' }, up(17, -1), 2.2, 1.6, a);
}

/** The front of her: the small hard body and head, eight amber eyes, the pale curved fangs, two short palps. */
function cephalo(d: Draw, B: (u: number, w: number) => V, s: Skel, P: Record<string, number>, z: number) {
  const open = P.fang ?? 0;
  d.poly({ mat: BK, z, group: 'body' }, [B(-3, 0), B(0, 6), B(8, 8.4), B(16, 7.4), B(22, 4), B(23.6, -1), B(20, -6), B(10, -7.6), B(1, -6)], { kind: 'dome', c: B(11, 2), r: 12, bevel: 1.2 });
  d.line({ mat: BK, z: z + 0.05, group: 'body', line: 'none' }, B(4, 6), B(16, 6.4), BK.ramp[5]);
  // the palps, feeling the air
  d.capsule({ mat: BK, z: z + 0.1, group: 'palp', shade: -1 }, B(21, -2), B(27 + open * 2, 1 - open), 1.2, 0.7);
  // the fangs
  const g = (w: number) => [B(21, -3 + w), B(25 + open * 2, -7 + w - open * 2), B(23 + open * 3, -12 + w - open * 3)];
  d.ribbon({ mat: DK, z: z + 0.12, group: 'chelF' }, [B(20, -3), B(24, -5)], [2.2, 1.8]);
  d.ribbon({ mat: BN, z: z + 0.15, group: 'fang' }, g(0), [1.3, 1, 0.3]);
  // the eyes: two great ones and six small, shut when she is dead
  const px: { p: V; c: RGBA }[] = [];
  const dead = !!P.dead;
  const on = dead ? BK.ramp[0] : E.eyeAmber, on2 = dead ? BK.ramp[0] : E.goldHot;
  for (const [u, w, big] of [[20, 2, 1], [17.6, 3.2, 1], [22, 0, 0], [21, 4, 0], [18.4, 5.4, 0], [15.6, 4.6, 0], [15, 2, 0], [18, 0.4, 0]] as const) {
    px.push({ p: B(u, w), c: big ? on2 : on });
    if (big) px.push({ p: B(u + 1, w), c: on });
  }
  d.pixels({ mat: BK, z: z + 0.2, group: 'eyes', line: 'none', outline: false }, px);
  void s;
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const sp = (o: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: v(10, 2) }, armF: { ik: v(14, 2) }, legN: { ik: v(-10, 2) }, legF: { ik: v(-6, 2) }, ...o, x: BACK + (o.x ?? 0), head: 0, p: { walk: 0, step: 0, front: 0, fang: 0, abd: 8, curl: 0, ...(o.p ?? {}) } });

const IDLE = sp({ torso: 3 });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return sp({ y: -b, torso: 3, p: { abd: 8 + b * 2, walk: a, step: 0.8 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  return sp({ y: Math.round(Math.sin(a * 2)) - 1, torso: 1, p: { walk: a, step: 9, abd: 4 } });
}

// Fang Bite: she rears, the front legs up, drops on the target with the fangs open and sinks them in.
const FB_REAR = sp({ x: -3, y: 6, torso: 24, p: { front: 1, fang: 0.7, abd: -6 } });
const FB_DROP = sp({ x: 9, y: -9, torso: -14, p: { front: 0.3, fang: 1, abd: 16 } });
const FB_BITE = sp({ x: 10, y: -11, torso: -18, p: { front: 0.2, fang: 0.1, abd: 22 } });

// Web Shot: she tips forward and swings the great abdomen up over her back to fling the silk.
const WS_TIP = sp({ x: -1, y: -6, torso: -10, p: { abd: 58, front: 0.3 } });
const WS_FLING = sp({ x: 2, y: -3, torso: -6, p: { abd: 92, front: 0.5, fang: 0.4 } });
const WS_AFTER = sp({ y: -3, torso: -3, p: { abd: 70, front: 0.2 } });

const HURT = sp({ x: -4, y: 2, torso: 12, p: { abd: -4, front: 0.4, fang: 0.5 } });
const DEATH_RISE = sp({ x: -2, y: 4, torso: 16, p: { abd: -8, front: 1, fang: 1, dead: 1 } });
const DEATH_SAG = sp({ x: -2, y: -12, torso: 2, p: { abd: 0, curl: 0.5, dead: 1 } });
const DEATH_DOWN = sp({ x: -2, y: -20, torso: 0, p: { abd: -4, curl: 1, dead: 1 } });

// Victory: the front legs up and spread, the fangs working.
const VIC = sp({ y: 6, torso: 18, p: { front: 1, fang: 0.8, abd: 2 } });
const VIC2 = tweak(VIC, { y: 7, p: { fang: 0.2, front: 0.85 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'silkfang',
  name: 'Silkfang',
  dims: D,
  build,
  footprint: 2.4,
  anims: {
    idle: { loop: true, frames: cycle(8, 200, idle) },
    run: { loop: true, frames: cycle(8, 72, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, FB_REAR, 2, 90, ease.out),
        ...keys([
          [FB_REAR, 220],
          [FB_DROP, 70],
          [FB_BITE, 100, { hit: true }],
          [FB_BITE, 200],
        ]),
        ...tween(D, FB_BITE, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, WS_TIP, 2, 110, ease.out),
        ...keys([
          [WS_TIP, 260],
          [WS_FLING, 90, { event: 'shoot', hit: true }],
          [WS_AFTER, 260],
        ]),
        ...tween(D, WS_AFTER, IDLE, 3, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { y: 1, torso: 10 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [DEATH_RISE, 220],
        [mid(DEATH_RISE, DEATH_SAG, 0.5), 110],
        [DEATH_SAG, 130],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -20.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VIC, 2, 110, ease.out),
        ...keys([
          [VIC, 260],
          [VIC2, 260],
          [VIC, 260],
          [VIC2, 260],
        ]),
        ...tween(D, VIC2, IDLE, 2, 120, ease.inOut),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

export const silkfang: ChampionArt = {
  char,
  iconBg: MS,
  icons: {
    fang_bite: () =>
      compose(BK, glyph((d) => {
        d.ribbon({ mat: BN, z: 4, group: 'fangA' }, [v(13, 34), v(9, 20), v(15, 6)], [3.2, 2.4, 0.4]);
        d.ribbon({ mat: BN, z: 4, group: 'fangB' }, [v(27, 34), v(31, 20), v(25, 6)], [3.2, 2.4, 0.4]);
      }), (b) => {
        for (const [x, y, k] of [[20, 8, 5], [20, 12, 4], [20, 16, 3]] as const) { b.set(x, y, MAT.glowGreen.ramp[k]); b.set(x + 1, y, MAT.glowGreen.ramp[k - 1]); }
      }),
    web_shot: () =>
      compose(BK, glyph(() => undefined), (b) => {
        const c = 20, W = SI.ramp;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          for (let r = 2; r < 17; r++) b.set(Math.round(c + Math.cos(a) * r), Math.round(c + Math.sin(a) * r), W[r < 9 ? 5 : 4]);
        }
        for (const R of [6, 11, 16]) for (let t = 0; t < 6.28; t += 0.05) if (Math.round(t * 20) % 3) b.set(Math.round(c + Math.cos(t) * R), Math.round(c + Math.sin(t) * R), W[4]);
      }),
    tripline: () =>
      compose(MS, glyph((d) => {
        d.ribbon({ mat: BK, z: 3, group: 'leg' }, [v(4, 32), v(16, 36), v(26, 16)], [1.8, 1.4, 0.8]);
      }), (b) => {
        for (let x = 3; x < 38; x++) b.set(x, 25 + (x % 9 === 0 ? 1 : 0), SI.ramp[5]);
      }),
  },
};
