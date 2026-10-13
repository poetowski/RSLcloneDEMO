// The Walking Bush (docs/DESIGN_DECISIONS.md section 19, Jakub's brief of
// 2026-10-13): a Common of the Court of Root, Tank, a small weak ent grown from
// a bush rather than a tree, woody and fat with branches, with no need of a
// head, who attacks with his root hands. So he is a squat, round bundle of
// woody stems on two stumpy root legs, the smallest body of the champions:
// grey-brown bark in grooves and knots, branches standing up from his top and
// twigs poking from his sides with a few clusters of small leaves, two dark
// hollows for eyes in the bark under the branches, and long arms of root that
// end in splayed root fingers (the silhouette: the round body, the branches
// standing up from it, the long arms). What the brief leaves open is a first
// take: his bark and leaves, the eyes, his size, the number of branches. His
// affinity sets nothing here (affinities are abstract, Jakub, 2026-10-11): the
// leaves are a bush's, his lash lands as a crack of wood and chips, his
// thicket is roots of his own wood (fx/court_of_root.ts).
//
// The rig is the shared humanoid one with short legs and a long spine; the
// head point sits above his eyes and no head is drawn (the portrait is cut
// round it). p.grip curls the root fingers (0 open, 1 closed), p.dig sinks
// them into the ground, p.rustle shakes the leaves by a pixel either way.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 17,
  thigh: 8.5,
  shin: 8,
  ankleH: 2.5,
  footLen: 5,
  spine: 20,
  neck: 3.5,
  upperArm: 11,
  foreArm: 12.5,
  shoulderDrop: 4,
  shoulderN: -1,
  shoulderF: 2.5,
  hipN: -3.5,
  hipF: 3.5,
};

const BK = MAT.bark, LF = MAT.moss;

/** The body's outline, torso-local [u up from the pelvis, half-width behind, half-width before]: fat and round. */
const ROWS: [number, number, number][] = [
  [-3, 8, 9],
  [0, 12, 13],
  [5, 14.6, 15.6],
  [11, 15.2, 16.2],
  [17, 14, 15],
  [21.5, 11.2, 12.2],
  [25, 7.2, 8],
  [27, 3, 3.6],
];

/** The body's half-width at height u, behind (side -1) or before (side 1). */
function halfWidth(u: number, side: -1 | 1): number {
  for (let i = 1; i < ROWS.length; i++) {
    const [u0, b0, f0] = ROWS[i - 1], [u1, b1, f1] = ROWS[i];
    if (u <= u1) {
      const t = Math.max(0, (u - u0) / (u1 - u0));
      return side < 0 ? b0 + (b1 - b0) * t : f0 + (f1 - f0) * t;
    }
  }
  return 0;
}

/** Bark: grooves running up the stems, wandering a little, with a few lighter ridges. */
const grain = (_h: unknown, x: number, y: number) => ((x + Math.round(Math.sin(y * 0.45) * 1.2)) % 5 === 0 ? -1 : (x * 7 + y * 13) % 31 === 0 ? 1 : 0);

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const rustle = Math.round(P.rustle ?? 0);

  // far side: the far leg and arm, the branches behind
  rootLeg(d, s, 'F', 10, -1);
  rootArm(d, s, 'F', P, 14, -1);
  branches(d, s, 'back', rustle, 18);
  // the near leg, its top hidden under the body
  rootLeg(d, s, 'N', 28, 0);
  // the body: a fat bundle of woody stems
  body(d, s, rustle, 30);
  branches(d, s, 'front', rustle, 44);
  eyes(d, s, P, 46);
  // the near arm, and the lash's smear when it swings
  if (info.def.smear && info.prev) smear(d, s.sN, info.prev.upN, s.upN, D.upperArm + D.foreArm + 6, 6, { core: BK.ramp[5], edge: ACCENT.white }, 49);
  rootArm(d, s, 'N', P, 50, 0);
}

function body(d: Draw, s: Skel, rustle: number, z: number) {
  const T = s.T;
  d.poly({ mat: BK, z, group: 'body', tex: grain }, torsoPts(s, ROWS), { kind: 'dome', c: T(12, 1), r: 18, bevel: 1.4 });
  // deeper grooves between the stems, broken here and there
  const px: { p: V; c: typeof INK.eye }[] = [];
  for (const [wf, skip] of [[-0.62, 3], [-0.2, 5], [0.24, 2], [0.66, 4]] as const) {
    for (let u = -2; u <= 24; u += 0.5) {
      if (Math.floor(u) % 9 === skip) continue;
      const w = wf * halfWidth(u, wf < 0 ? -1 : 1) + Math.sin(u * 0.35 + wf * 4) * 0.8;
      px.push({ p: T(u, w), c: BK.ramp[1] });
    }
  }
  // two knots in the wood
  for (const [u, w] of [[7, -6], [13, 9]] as const) {
    px.push({ p: T(u, w), c: BK.ramp[0] }, { p: T(u, w + 1), c: BK.ramp[1] }, { p: T(u + 1, w), c: BK.ramp[4] }, { p: T(u + 1, w + 1), c: BK.ramp[4] });
  }
  d.pixels({ mat: BK, z: z + 0.1, group: 'body' }, px);
  // twigs poking from his sides, a few leaves on each
  twig(d, [T(12, -14.8), T(14.5, -18.2), T(16, -20.6)], [1.4, 0.9, 0.5], z - 0.5, -1);
  leaves(d, T(16.4, -21.2), 3, z - 0.4, 3, rustle);
  twig(d, [T(5, 15.4), T(6.6, 18.4), T(8.4, 20.8)], [1.4, 0.9, 0.5], z + 0.2, 0);
  leaves(d, T(8.8, 21.4), 3, z + 0.3, 5, -rustle);
}

/** A woody twig or branch: a tapering ribbon along `pts`. */
function twig(d: Draw, pts: V[], radii: number[], z: number, shade: number) {
  d.ribbon({ mat: BK, z, group: 'twig' + Math.round(z * 10), shade, tex: grain }, pts, radii);
}

/** A cluster of small leaves round `c`, each turned its own way; `rustle` shifts every other leaf by a pixel. */
function leaves(d: Draw, c: V, n: number, z: number, seed: number, rustle: number, k = 1) {
  for (let i = 0; i < n; i++) {
    const a = seed * 1.7 + i * 2.4;
    const r = (0.6 + Math.sqrt(i) * 1.5) * k;
    const p = v(c.x + Math.cos(a) * r + (i % 2 ? rustle : 0), c.y + Math.sin(a) * r * 0.8);
    d.ellipse({ mat: LF, z: z + i * 0.001, group: 'leaves' + seed + Math.round(z) }, p, 1.9 * k, 1.25 * k, (a * 180) / Math.PI);
  }
}

/** The branches standing up from his top: behind the body (`back`, darker) or before it (`front`), each with leaves at its tips. */
function branches(d: Draw, s: Skel, side: 'back' | 'front', rustle: number, z: number) {
  const T = s.T;
  if (side === 'back') {
    twig(d, [T(24, -5), T(31, -9), T(38, -12)], [2.2, 1.5, 0.8], z, -1);
    twig(d, [T(31, -9), T(33.4, -12.6), T(35, -15.4)], [1.2, 0.8, 0.5], z + 0.01, -1);
    twig(d, [T(26, -1.5), T(34, -2.6), T(41.5, -4)], [2.2, 1.5, 0.8], z + 0.02, -1);
    twig(d, [T(37, -3.2), T(38.4, -5.8), T(39.2, -8.2)], [1.0, 0.7, 0.4], z + 0.03, -1);
    leaves(d, T(38.6, -12.4), 5, z + 0.1, 1, rustle);
    leaves(d, T(35.4, -15.8), 4, z + 0.11, 2, -rustle);
    leaves(d, T(42.1, -4.2), 5, z + 0.12, 4, rustle);
    leaves(d, T(39.6, -8.8), 3, z + 0.13, 6, -rustle);
    return;
  }
  twig(d, [T(26.5, 0), T(35.5, 0.8), T(44, 1.6)], [2.4, 1.6, 0.9], z, 0);
  twig(d, [T(26, 2.5), T(34, 5), T(41, 6.6)], [2.2, 1.5, 0.8], z + 0.01, 0);
  twig(d, [T(36, 5.6), T(38.4, 8.4), T(40, 10.8)], [1.1, 0.8, 0.5], z + 0.02, 0);
  twig(d, [T(23.5, 6), T(29, 10.5), T(33, 14.6)], [2.0, 1.4, 0.7], z + 0.03, 0);
  leaves(d, T(44.6, 1.6), 6, z + 0.1, 7, -rustle);
  leaves(d, T(41.6, 6.8), 4, z + 0.11, 8, rustle);
  leaves(d, T(40.4, 11.4), 4, z + 0.12, 9, -rustle);
  leaves(d, T(33.4, 15.2), 4, z + 0.13, 10, rustle);
}

/** Two dark hollows in the bark for eyes, a ridge of bark over each; shut when he is down. */
function eyes(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const T = s.T;
  const px: { p: V; c: typeof INK.eye }[] = [];
  for (const [u, w, big] of [[19.4, 4.2, 1], [19.8, 9.2, 1]] as const) {
    if (P.dead) {
      px.push({ p: T(u, w - 0.6), c: BK.ramp[1] }, { p: T(u, w + 0.6), c: BK.ramp[1] });
      continue;
    }
    px.push({ p: T(u, w), c: INK.eye }, { p: T(u - 1, w), c: INK.eye }, { p: T(u + 2, w - 0.8), c: BK.ramp[4] }, { p: T(u + 2, w + 0.6), c: BK.ramp[4] });
    if (big) px.push({ p: T(u, w + 1), c: INK.eye }, { p: T(u - 1, w + 1), c: INK.eye }, { p: T(u + 0.2, w + 0.1), c: BK.ramp[5] });
  }
  d.pixels({ mat: BK, z, group: 'eyes' }, px);
}

/** A stumpy root leg: a thick short trunk, roots spreading from its foot on the ground before and behind. */
function rootLeg(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF, knee = side === 'N' ? s.kneeN : s.kneeF, ank = side === 'N' ? s.ankN : s.ankF;
  const g = 'leg' + side;
  d.capsule({ mat: BK, z, group: g, shade, tex: grain }, hip, knee, 4.6, 4.0);
  d.capsule({ mat: BK, z: z + 0.1, group: g, shade, tex: grain }, knee, ank, 4.0, 3.6);
  const lift = Math.max(0, ank.y - 3);
  const gy = ank.y - 2.8 + Math.min(lift, 2.4);
  d.ribbon({ mat: BK, z: z + 0.2, group: g, shade }, [ank, v(ank.x + 3.2, gy + 0.6), v(ank.x + 7, gy)], [2.8, 1.7, 0.6]);
  d.ribbon({ mat: BK, z: z + 0.15, group: g, shade }, [ank, v(ank.x + 1.6, gy + 0.2), v(ank.x + 3.6, gy - 0.2)], [2.4, 1.6, 0.6]);
  d.ribbon({ mat: BK, z: z + 0.25, group: g, shade }, [ank, v(ank.x - 2.6, gy + 0.6), v(ank.x - 5, gy)], [2.6, 1.5, 0.6]);
}

/** An arm of root: knotted at the elbow, its hand a splay of four root fingers that curl with p.grip and sink with p.dig. */
function rootArm(d: Draw, s: Skel, side: 'N' | 'F', P: Record<string, number>, z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF, el = side === 'N' ? s.eN : s.eF, hd = side === 'N' ? s.hN : s.hF, lo = side === 'N' ? s.loN : s.loF;
  const g = 'arm' + side;
  d.capsule({ mat: BK, z, group: g, shade, tex: grain }, sh, el, 3.2, 2.6);
  d.circle({ mat: BK, z: z + 0.05, group: g, shade }, el, 2.9);
  d.capsule({ mat: BK, z: z + 0.1, group: g, shade, tex: grain }, el, hd, 2.6, 2.1);
  rootFingers(d, hd, lo, P.grip ?? 0.3, P.dig ?? 0, z + 0.2, g, shade, 1);
}

/** Four root fingers splaying from the wrist round the forearm's direction `lo`. */
function rootFingers(d: Draw, hd: V, lo: number, grip: number, dig: number, z: number, g: string, shade: number, k: number) {
  const fingers: [number, number][] = [[-34, 6.4], [-11, 7.4], [12, 7], [34, 5.6]];
  fingers.forEach(([spread, len], i) => {
    const a0 = lo + spread * (1 - grip * 0.55);
    const L = len * k * (1 - dig * 0.45);
    // digging, the fingers turn straight down into the ground
    const a = dig > 0 ? a0 + ((-90 - a0 + 540) % 360 - 180) * dig : a0;
    const curl = 10 + grip * 18;
    const p1 = at(hd, a, L * 0.4), p2 = at(p1, a + curl, L * 0.33), p3 = at(p2, a + curl * 2, L * 0.27);
    d.ribbon({ mat: BK, z: z + i * 0.01, group: g, shade }, [hd, p1, p2, p3], [1.5 * k, 1.05 * k, 0.75 * k, 0.4 * k]);
  });
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 90,
  head: 90,
  legN: { ik: v(-4.5, 3) },
  legF: { ik: v(5, 3) },
  armN: { up: -64, lo: -40 },
  armF: { up: -140, lo: -120 },
  p: { grip: 0.3, rustle: 0, dig: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b,
    armN: { up: -64 - b * 2, lo: -40 - b * 3 },
    armF: { up: -140 + b * 2, lo: -120 + b * 2 },
    p: { grip: 0.3, rustle: Math.round(Math.sin(a)), dig: 0 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  // a waddle: short stomping steps, the body rocking over them
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -6 * Math.cos(ph), y: 3 + (sn > 0 ? 4 * sn : 0) };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: Math.round(Math.abs(Math.sin(a)) * 2) - 1,
    torso: 84 + Math.round(Math.sin(a) * 4),
    head: 90,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    armN: { up: -100 + sw * 22, lo: -70 + sw * 22 },
    armF: { up: -80 - sw * 22, lo: -60 - sw * 22 },
    p: { grip: 0.4, rustle: Math.round(Math.sin(a * 2)), dig: 0 },
  });
}

// Root Lash: he swings a root arm up behind him and lashes it down across the enemy.
// The target stands 38 px ahead: he lunges and the fingers strike at its middle.
const RL_WIND = pose({ x: -2, y: -1, torso: 100, head: 90, legN: { ik: v(-7, 3) }, legF: { ik: v(6, 3) }, armN: { up: 112, lo: 142 }, armF: { up: -110, lo: -90 }, p: { grip: 0.1, rustle: 1, dig: 0 } });
const RL_LASH = pose({ x: 7, y: -2, torso: 76, head: 90, legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) }, armN: { up: 8, lo: -8 }, armF: { up: -120, lo: -100 }, p: { grip: 0.15, rustle: -1, dig: 0 } });
const RL_FOLLOW = pose({ x: 7, y: -3, torso: 74, head: 90, legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) }, armN: { up: -46, lo: -84 }, armF: { up: -120, lo: -100 }, p: { grip: 0.9, rustle: 0, dig: 0 } });

// Thicket: he raises both arms and drives his root fingers into the ground; the thicket rises.
const TH_RAISE = pose({ y: 1, torso: 94, head: 90, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) }, armN: { up: 28, lo: 64 }, armF: { up: 128, lo: 112 }, p: { grip: 0.1, rustle: 1, dig: 0 } });
const TH_DRIVE = pose({ y: -4, torso: 70, head: 90, legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) }, armN: { ik: v(16, 2), bend: -1 }, armF: { ik: v(19, 2.5), bend: -1 }, p: { grip: 0, rustle: -1, dig: 1 } });
const TH_HOLD = tweak(TH_DRIVE, { y: -5, p: { rustle: 1 } });

const HURT = pose({ x: -3, y: -1, torso: 102, head: 90, legN: { ik: v(-7, 3) }, legF: { ik: v(5, 4) }, armN: { up: -130, lo: -110 }, armF: { up: -62, lo: -40 }, p: { grip: 0.6, rustle: 1, dig: 0 } });

// Death: he sags and topples forward onto his front, his branches across the ground.
const DEATH_SAG = pose({ x: 1, y: -4, torso: 70, head: 90, legN: { ik: v(-6, 3) }, legF: { ik: v(7, 3) }, armN: { up: -80, lo: -70 }, armF: { up: -70, lo: -60 }, p: { grip: 0.8, rustle: 1, dig: 0 } });
const DEATH_FALL = pose({ x: -2, y: -6, torso: 36, head: 90, legN: { up: -120, lo: -130 }, legF: { up: -100, lo: -120 }, armN: { up: -20, lo: -10 }, armF: { up: -10, lo: 0 }, p: { grip: 0.8, rustle: -1, dig: 0 } });
const DEATH_DOWN = pose({ x: -9, y: -3, torso: 2, head: 90, legN: { up: 178, lo: 180 }, legF: { up: 172, lo: 176 }, armN: { up: 10, lo: 4 }, armF: { up: 0, lo: -6 }, p: { grip: 1, rustle: 0, dig: 0, dead: 1 } });

// Victory: both root arms up, a little bounce that shakes his leaves.
const VIC_A = pose({ y: 1, torso: 90, head: 90, legN: { ik: v(-5, 3) }, legF: { ik: v(5, 3) }, armN: { up: 64, lo: 96 }, armF: { up: 76, lo: 104 }, p: { grip: 0.1, rustle: 1, dig: 0 } });
const VIC_B = tweak(VIC_A, { y: 3, p: { rustle: -1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'walking_bush',
  name: 'Walking Bush',
  dims: D,
  build,
  footprint: 1.3,
  anims: {
    idle: { loop: true, frames: cycle(6, 190, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RL_WIND, 2, 90, ease.out),
        ...keys([
          [RL_WIND, 200],
          [mid(RL_WIND, RL_LASH, 0.5), 50, { smear: true }],
          [RL_LASH, 90, { hit: true, smear: true }],
          [RL_FOLLOW, 160],
        ]),
        ...tween(D, RL_FOLLOW, IDLE, 2, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TH_RAISE, 2, 100, ease.out),
        ...keys([
          [TH_RAISE, 200],
          [mid(TH_RAISE, TH_DRIVE, 0.6), 60],
          [TH_DRIVE, 120, { hit: true }],
          [TH_HOLD, 260],
          [tweak(TH_HOLD, { p: { rustle: 0 } }), 200],
        ]),
        ...tween(D, TH_HOLD, IDLE, 2, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -2, torso: 98, p: { rustle: -1 } }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_SAG, 0.5), 110],
        [DEATH_SAG, 220],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -4 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VIC_A, 2, 100, ease.out),
        ...keys([
          [VIC_B, 140],
          [VIC_A, 140],
          [VIC_B, 140],
          [VIC_A, 320],
          [mid(VIC_A, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

const E = ACCENT;
/** behind his icons and portrait: a darker brown than his bark, so that the wood stands out */
const DK = MAT.darkleather;

export const walkingBush: ChampionArt = {
  char,
  iconBg: DK,
  icons: {
    root_lash: () =>
      compose(DK, glyph((d) => {
        // a root arm swung down from the upper left, its fingers spread wide as it strikes
        const sh = v(3, 37), el = v(13, 27), hd = v(23, 17);
        d.capsule({ mat: BK, z: 10, group: 'arm', tex: grain }, sh, el, 4.6, 3.8);
        d.circle({ mat: BK, z: 10.05, group: 'arm' }, el, 4.2);
        d.capsule({ mat: BK, z: 10.1, group: 'arm', tex: grain }, el, hd, 3.8, 3.0);
        rootFingers(d, hd, -45, 0.2, 0, 10.2, 'arm', 0, 1.7);
      }), (b) => {
        // the crack where it lands (screen space, y down)
        for (const [x, y] of [[33, 26], [34, 24], [35, 22], [36, 20], [32, 28], [34, 29], [36, 27], [37, 25]] as const) b.set(x, y, E.white);
        for (const [x, y] of [[31, 30], [37, 23], [35, 30], [38, 21]] as const) b.set(x, y, BK.ramp[5]);
      }),
    thicket: () =>
      compose(DK, glyph((d) => {
        // roots curling up out of the ground into a little thicket, leaves on their tips
        const roots: [number, number, number][] = [[6, 22, 0.35], [12, 30, 0.18], [20, 33, 0], [28, 30, -0.18], [34, 22, -0.35]];
        roots.forEach(([x0, h, lean], i) => {
          const pts = [0, 0.35, 0.7, 1].map((f) => v(x0 + lean * h * f * 1.4 + Math.sin(f * 3 + i) * 1.4 * f, 3 + h * f));
          d.ribbon({ mat: BK, z: 10 + i * 0.01, group: 'root' + i, tex: grain }, pts, [3.2, 2.4, 1.5, 0.6]);
        });
        leaves(d, v(9, 26), 3, 11, 2, 0, 1.4);
        leaves(d, v(20, 36), 4, 11.1, 4, 0, 1.4);
        leaves(d, v(31, 26), 3, 11.2, 6, 0, 1.4);
      })),
  },
};
