// Leafshade (docs/DESIGN_DECISIONS.md section 94, Jakub's brief of 2026-11-07:
// an Elite Damage of the Court of Root, Tide, "humanoid not human"): a lanky
// chameleon walking upright on the Junior Ward's rig, a little stooped. Leaf-
// green scales speckled darker, a pale stripe down its flank, blotches of bark-
// brown that grow and shrink slowly as its colour drifts (calm, one slow cycle
// of the idle); a curled tail behind; a long head with a casque rising back
// over it and a turret eye that turns on its own; a twist of woven grass at the
// waist, a thorn dagger in its near hand. Tongue Lash shoots the tongue out to
// the enemy; Vanish stabs with the thorn. Its colour changes with what it does
// (Jakub, 2026-11-07: "leafshade can change colors during his moves"): it
// flushes yellow-orange as it strikes with the tongue and in victory, fades to
// bark-brown to vanish, darkens when hurt and fades to bark as it dies; mid-
// change, patches of the new colour spread over the old (pose channels
// `flush`, `camo`, `dark`, 0-1). Grown, not issued: no insignia (the
// Court's look). Its affinity (Tide) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { arm, leg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { RGBA } from '../raster.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16.4,
  shin: 16.4,
  ankleH: 3,
  footLen: 6,
  spine: 21,
  neck: 7.4,
  upperArm: 13,
  foreArm: 12.4,
  shoulderDrop: 3.8,
  shoulderN: -2.4,
  shoulderF: 2.8,
  hipN: -1.6,
  hipF: 1.6,
};

/** The scales' colour this frame: set at the start of `build` from the pose (green at rest). */
let SC: typeof MAT.green = MAT.green;
const BA = MAT.bark, ST = MAT.straw, BO = MAT.bone, TG = MAT.earPink;
const E = ACCENT;

/** Speckled scales, keyed to the shape so they never swim. */
const scales = (h: { u: number; v: number }) => (Math.sin(h.u * 23 + h.v * 7) > 0.82 ? -1 : Math.sin(h.u * 11 - h.v * 17) > 0.9 ? 1 : 0);

/**
 * The colour of its scales from the pose: the base is whichever change is past
 * halfway (camouflage first, then the flush, then the dark of a hurt), green
 * otherwise; a change still under halfway shows as patches of the new colour
 * growing over the old; at rest the patches are bark, drifting with `mottle`.
 */
function colour(P: Record<string, number>): { base: typeof MAT.green; blot: typeof MAT.green; blotK: number } {
  const camo = P.camo ?? 0, flush = P.flush ?? 0, dark = P.dark ?? 0;
  const base = camo >= 0.5 ? BA : flush >= 0.5 ? MAT.saffron : dark >= 0.5 ? MAT.pine : MAT.green;
  if (camo > 0 && camo < 0.5) return { base, blot: BA, blotK: 1 + camo * 3 };
  if (flush > 0 && flush < 0.5) return { base, blot: MAT.saffron, blotK: 1 + flush * 3 };
  if (base === BA) return { base, blot: MAT.pine, blotK: 0.8 };
  if (base === MAT.saffron) return { base, blot: MAT.green, blotK: 0.7 };
  return { base, blot: BA, blotK: 1 };
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const mot = P.mottle ?? 0.5;
  const tint = colour(P);
  SC = tint.base;

  tail(d, s, P.curl ?? 0, 8);
  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(20, -1));
  body(d, s, mot, tint.blot, tint.blotK, 30);
  head(d, s, P, 38);
  leg(d, s, 'N', legCfg(50, 0));
  if (!P.drop) thorn(d, s.hN, P.thAng ?? -60, 55);
  else thorn(d, v(14, 2.4), 0, 55);
  arm(d, s, 'N', armCfg(60, 0));
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: SC, shin: SC, foot: SC, rThigh: [3.6, 2.6] as [number, number], rShin: [2.4, 2.0] as [number, number], z, shade, footStyle: 'bare' as const,
});

const armCfg = (z: number, shade: number) => ({
  upper: SC, fore: SC, hand: SC, rUp: [2.4, 2.0] as [number, number], rLo: [2.0, 1.8] as [number, number], rHand: 1.9, z, shade,
});

/** The slim body: green scales, a pale stripe along the flank, bark blotches sized by `mot` (0-1), the grass twist at the waist. */
function body(d: Draw, s: Skel, mot: number, blot: typeof MAT.green, blotK: number, z: number) {
  const pts = torsoPts(s, [
    [0, 4.8, 5.0],
    [4, 4.6, 5.0],
    [9, 5.0, 5.8],
    [14, 5.4, 6.2],
    [18, 5.0, 5.4],
    [20.4, 3.8, 3.4],
    [21.4, 2.4, 2.0],
  ]);
  d.poly({ mat: SC, z, group: 'body', tex: scales }, pts, { kind: 'cyl', a: s.T(0, 0.4), b: s.T(21.4, 0.4), r: 6, bevel: 1.2 });
  // the pale stripe from the shoulder down the flank
  d.ribbon({ mat: SC, z: z + 0.1, group: 'stripe', shade: 2, line: 'none' }, [s.T(19, 2.0), s.T(13, 3.2), s.T(6, 3.0), s.T(1, 2.2)], [0.8, 1.0, 1.0, 0.7]);
  // the ridge of small spines down the back
  for (let u = 4; u <= 19; u += 3) d.poly({ mat: SC, z: z + 0.05, group: 'spines', shade: -1 }, [s.T(u - 1, -4.6), s.T(u, -6.6), s.T(u + 1, -4.8)], { kind: 'bevel', w: 0.5 });
  // the bark blotches: they grow and shrink as its colour drifts
  const r = (1.2 + mot * 1.4) * blotK;
  for (const [u, w] of [[15, -1.6], [8.6, 0.6], [3.4, -2.4], [11.6, 3.6], [18.4, 1.4], [5.6, 2.8]] as const) d.ellipse({ mat: blot, z: z + 0.2, group: 'blot', line: 'none' }, s.T(u, w), r * 1.3, r, s.torso);
  // the twist of woven grass at the waist, its loose ends hanging
  d.poly({ mat: ST, z: z + 0.5, group: 'grass', tex: (h) => (Math.sin(h.u * 30) > 0.3 ? -1 : 0) }, [s.T(2.4, -5.2), s.T(2.6, 5.6), s.T(0.8, 5.6), s.T(0.6, -5.0)], { kind: 'cyl', a: s.T(0.6, 0), b: s.T(2.6, 0), r: 5.6 });
  const knot = s.T(1.6, 4.8);
  d.ribbon({ mat: ST, z: z + 0.6, group: 'grass', line: 'soft' }, [knot, at(knot, -100, 4), at(knot, -96, 7.4)], [0.6, 0.5, 0.3]);
}

/** The tail: from the base of the spine, out behind and curled into a spiral; `curl` (0-1) winds it tighter. */
function tail(d: Draw, s: Skel, curl: number, z: number) {
  const base = s.T(1.4, -4.0);
  const pts: V[] = [base];
  let p = base, a = s.torso + 82, len = 6.4;
  for (let i = 0; i < 10; i++) {
    p = at(p, a, len);
    pts.push(p);
    a += i < 1 ? 8 : 26 + curl * 12 + i * 3;
    len *= i < 2 ? 0.95 : 0.8;
  }
  d.ribbon({ mat: SC, z, group: 'tail', tex: scales }, pts, pts.map((_, i) => Math.max(0.6, 2.8 - i * 0.24)));
}

/**
 * The head in the H frame (x along the snout, y up): long, a casque rising
 * back over the skull, the mouth's long line, the turret eye turned by
 * `eye` (-1..1), the tongue shot out to `tongue` px with a pink club at its tip.
 */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  d.capsule({ mat: SC, z: z - 0.5, group: 'neck', tex: scales }, s.neck, H(-1, -2), 2.4, 2.4);
  const jaw = P.jaw ?? 0;
  // the lower jaw, turned down from its hinge when the mouth opens
  const J = (x: number, y: number) => {
    const th = -jaw * 0.5, hx = -1.5, hy = -1.6;
    const dx = x - hx, dy = y - hy;
    return H(hx + dx * Math.cos(th) - dy * Math.sin(th), hy + dx * Math.sin(th) + dy * Math.cos(th));
  };
  if (jaw > 0.05) d.poly({ mat: TG, z: z - 0.2, group: 'mouth', line: 'none' }, [H(-1, -1.4), H(9.8, -1.2), J(9.4, -1.8), J(-1, -2)]);
  d.poly({ mat: SC, z: z - 0.1, group: 'jaw', tex: scales }, [J(-2, -1.6), J(9.6, -1.4), J(8.4, -2.8), J(2, -3.8), J(-2.4, -3.4)], { kind: 'bevel', w: 0.9 });
  // the skull and the snout
  d.poly(
    { mat: SC, z, group: 'head', tex: scales },
    [H(10.4, -1.2), H(10.0, 0.4), H(6, 2.2), H(2, 3.2), H(-2.4, 3.4), H(-3.6, 0.4), H(-2.6, -1.6)],
    { kind: 'dome', c: H(3, 0.6), r: 8, bevel: 1 },
  );
  // the casque: a crest rising up and back over the skull, ridged
  d.poly({ mat: SC, z: z + 0.1, group: 'casque', tex: scales }, [H(2.6, 2.8), H(-0.6, 5.6), H(-4.0, 7.2), H(-5.6, 5.8), H(-4.4, 2.6), H(-2.6, 2.4)], { kind: 'bevel', w: 1 });
  d.ribbon({ mat: SC, z: z + 0.15, group: 'casque', shade: 2, line: 'none' }, [H(1.8, 3.4), H(-1, 5.6), H(-3.8, 6.6)], [0.6, 0.6, 0.5]);
  // the mouth's long line
  const px: { p: V; c: RGBA }[] = [];
  if (jaw <= 0.05) for (let x = -1; x <= 9; x += 1) px.push({ p: H(x, -1.6), c: SC.ramp[1] });
  d.pixels({ mat: SC, z: z + 0.2, group: 'head', line: 'none' }, px);
  // the turret eye: a scaly cone, a ring round it, the pupil at its tip looking where it turns
  const ec = H(2.4, 0.8);
  d.circle({ mat: SC, z: z + 0.3, group: 'eye', shade: 1 }, ec, 2.6);
  d.circle({ mat: SC, z: z + 0.35, group: 'eye', shade: 2, line: 'none' }, ec, 1.4);
  const look = P.eye ?? 0;
  if (P.dead) d.pixels({ mat: SC, z: z + 0.4, group: 'eye', line: 'none' }, [{ p: ec, c: SC.ramp[1] }]);
  else d.pixels({ mat: SC, z: z + 0.4, group: 'eye', line: 'none', outline: false }, [{ p: H(2.4 + 0.9 * Math.cos(look * 1.2), 0.8 + 0.9 * Math.sin(look * 1.2)), c: INK.black }, { p: H(2.4 + 0.9 * Math.cos(look * 1.2) - 0.8, 0.8 + 0.9 * Math.sin(look * 1.2)), c: INK.black }]);
  // the tongue, shot straight out along the snout
  const tongue = P.tongue ?? 0;
  if (tongue > 0) {
    const from = H(9.4, -1.3), dirA = s.headDir - 90, to = at(from, dirA, tongue);
    d.capsule({ mat: TG, z: z + 0.5, group: 'tongue' }, from, to, 0.8, 0.8);
    d.circle({ mat: TG, z: z + 0.55, group: 'tongue' }, to, 1.8);
  }
}

/** The thorn dagger: a long pale thorn, its base wrapped in grass. */
function thorn(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: ST, z, group: 'thornGrip', line: 'soft' }, f(-2.4, 0), f(1.6, 0), 1.0, 1.0);
  d.poly({ mat: BO, z: z + 0.1, group: 'thorn' }, [f(1.4, -1.2), f(11, 0), f(1.4, 1.2)], { kind: 'bevel', w: 0.6 });
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// At rest: stooped a little, knees bent, the thorn held low, the eye wandering, the colour drifting.
const IDLE = pose({
  y: -2, torso: 82, head: 72,
  legN: { ik: v(-6, 3) }, legF: { ik: v(8, 3) },
  armN: { ik: v(8, 30), bend: -1 }, armF: { up: -110, lo: -60 },
  p: { thAng: -30, curl: 0.5 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -2 - b, p: { eye: Math.sin(a) * 1.4, mottle: (1 - Math.cos(a)) / 2, curl: 0.5 + Math.sin(a) * 0.2 } });
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
    y: bob - 3, torso: 70, head: 64,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armN: { up: -70 + sw * 24, lo: -30 + sw * 24 }, armF: { up: -70 - sw * 24, lo: -30 - sw * 24 },
    p: { thAng: -20, curl: 0.3, eye: 0 },
  });
}

// Tongue Lash: it fixes the enemy with the eye, opens the mouth, and the tongue shoots out and back.
const TL_AIM = pose({ x: -1, y: -2, torso: 80, head: 76, legN: { ik: v(-8, 3) }, legF: { ik: v(9, 3) }, armN: { ik: v(6, 30), bend: -1 }, armF: { up: -110, lo: -60 }, p: { eye: 0, jaw: 0.3, curl: 0.8, flush: 0.35 } });
const TL_SHOT = tweak(TL_AIM, { x: 2, torso: 76, head: 80, p: { jaw: 1, tongue: 26, eye: 0, flush: 1 } });
const TL_BACK = tweak(TL_AIM, { p: { jaw: 0.5, tongue: 8, flush: 1 } });

// Vanish: it comes out low behind the enemy and drives the thorn up and in.
const VA_LOW = pose({ x: -3, y: -8, torso: 70, head: 60, legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) }, armN: { ik: v(-4, 26), bend: -1 }, armF: { up: -130, lo: -70 }, p: { thAng: -10, eye: 0, curl: 1, camo: 1 } });
const VA_STAB = pose({ x: 8, y: -4, torso: 72, head: 70, legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) }, armN: { ik: v(22, 40), bend: -1 }, armF: { up: -120, lo: -110 }, p: { thAng: 20, eye: 0, jaw: 0.6, curl: 1, camo: 1 } });
const VA_HOLD = tweak(VA_STAB, { x: 7, p: { jaw: 0.2 } });

const HURT = pose({ x: -4, y: -1, torso: 96, head: 96, legN: { ik: v(-10, 3) }, legF: { ik: v(8, 4) }, footF: 10, armN: { up: -130, lo: -90 }, armF: { up: -110, lo: -80 }, p: { jaw: 0.8, eye: -1, curl: 0.1, dark: 1 } });

// Death: it sinks down and falls forward, the tail uncurling.
const DEATH_KNEEL = pose({ x: 0, y: -12, torso: 72, head: 52, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, footN: -30, armN: { up: -80, lo: -60 }, armF: { up: -90, lo: -70 }, p: { curl: 0, jaw: 0.4, dark: 1, camo: 0.3 } });
const DEATH_FALL = pose({ x: 2, y: -6, torso: 30, head: 16, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { drop: 1, curl: 0, camo: 1 } });
const DEATH_DOWN = pose({ x: 6, y: -16, torso: 4, head: -2, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { drop: 1, dead: 1, curl: 0, camo: 1 } });

// Victory: it rises tall, the casque up, the tongue flicked out once.
const VIC = pose({ y: -1, torso: 88, head: 86, legN: { ik: v(-6, 3) }, legF: { ik: v(8, 3) }, armN: { ik: v(8, 36), bend: -1 }, armF: { up: -110, lo: -60 }, p: { thAng: 40, curl: 1, mottle: 0, flush: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'leafshade',
  name: 'Leafshade',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 200, idle) },
    run: { loop: true, frames: cycle(8, 76, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TL_AIM, 2, 90, ease.out),
        ...keys([
          [TL_AIM, 220],
          [TL_SHOT, 90, { hit: true }],
          [TL_BACK, 80],
          [TL_AIM, 160],
        ]),
        ...tween(D, TL_AIM, IDLE, 2, 110, ease.inOut),
      ],
    },
    attack2: {
      loop: false,
      frames: [
        ...tween(D, IDLE, tweak(IDLE, { p: { camo: 0.4 } }), 1, 90),
        ...keys([[tweak(IDLE, { y: -3, p: { camo: 1 } }), 140]]),
        ...tween(D, tweak(IDLE, { y: -3, p: { camo: 1 } }), VA_LOW, 1, 80, ease.out),
        ...keys([
          [VA_LOW, 180],
          [VA_STAB, 70, { hit: true }],
          [VA_HOLD, 240],
        ]),
        ...tween(D, VA_HOLD, IDLE, 3, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 92, head: 90 }), 110],
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
        [tweak(DEATH_DOWN, { y: -16.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, VIC, 0.5), 110],
        [VIC, 300],
        [tweak(VIC, { p: { jaw: 0.8, tongue: 10 } }), 160],
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

export const leafshade: ChampionArt = {
  char,
  iconBg: MAT.pine,
  icons: {
    tongue_lash: () =>
      compose(MAT.pine, glyph((d) => {
        d.capsule({ mat: TG, z: 10, group: 'it' }, v(3, 20), v(30, 20), 1.6, 1.6);
        d.circle({ mat: TG, z: 10.1, group: 'it' }, v(32, 20), 3.6);
      }), (b) => {
        for (const [x, y] of [[36, 14], [37, 25], [34, 12]] as const) b.set(x, y, E.white);
      }),
    vanish: () =>
      compose(MAT.pine, glyph((d) => {
        const f = d.frame(v(8, 6), 50);
        d.capsule({ mat: ST, z: 10, group: 'ig' }, f(0, 0), f(7, 0), 2.2, 2.2);
        d.poly({ mat: BO, z: 10.1, group: 'ith' }, [f(6, -2.6), f(32, 0), f(6, 2.6)], { kind: 'bevel', w: 1.2 });
      }), (b) => {
        for (const [x, y] of [[6, 30], [10, 32], [4, 26], [30, 8], [33, 12]] as const) b.set(x, y, MAT.green.ramp[4]);
      }),
    unseen: () =>
      compose(MAT.pine, glyph((d) => {
        d.circle({ mat: MAT.green, z: 10, group: 'ie' }, v(20, 20), 11);
        d.circle({ mat: MAT.green, z: 10.1, group: 'ie', shade: 1, line: 'none' }, v(20, 20), 6);
        d.circle({ mat: MAT.charcoal, z: 10.2, group: 'ip' }, v(23, 21), 2.4);
      })),
  },
};
