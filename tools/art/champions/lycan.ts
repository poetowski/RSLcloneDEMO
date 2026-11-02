// Lycan (docs/DESIGN_DECISIONS.md section 75, Jakub's brief of 2026-11-02: a Heroic Damage of
// the Ashveil Reign, "creative lycanthrope design"; the look is mine and stands in until he
// sets it). A hunched lycanthrope on two legs, a soldier of the Reign gone to the wolf: ash-grey
// fur gone cold and violet in its shadow, a pale ruff down his neck and over his chest, long
// arms that hang past the knee ending in black-nailed claws (the silhouette, with the pricked
// ears and the heavy tail), a long wolf's head with pale eyes, a notch out of one ear and fangs
// that show whenever the jaw opens. What is left of the man: the torn charcoal breeches, a sash
// of the Reign's plum tied across the chest with its two ragged ends hanging, and an iron
// shackle on the near wrist with a few links of broken chain. His affinity (Tide) sets nothing
// here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { leg } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 33,
  thigh: 16,
  shin: 15.4,
  ankleH: 3,
  footLen: 8,
  spine: 24,
  neck: 9,
  upperArm: 15.4,
  foreArm: 15.4,
  shoulderDrop: 4.6,
  shoulderN: -5,
  shoulderF: 5,
  hipN: -2.8,
  hipF: 2.8,
};

const FR = MAT.ashFur, MN = MAT.furGrey, CL = MAT.ashBone, CH = MAT.charcoal, PL = MAT.ashPlum, IR = MAT.iron;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;

  tail(d, s, P, 2);

  // far leg and its torn sleeve, the far arm
  leg(d, s, 'F', legCfg(10, -1));
  sleeve(d, s, 'F', 11, -1);
  armOf(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF');

  torso(d, s, 30);
  sash(d, s, P, 32);
  mane(d, s, P, 34);
  head(d, s, P, 36);

  // near leg and its sleeve, the rag at his hip, the near arm over them
  leg(d, s, 'N', legCfg(40, 0));
  sleeve(d, s, 'N', 41, 0);
  rag(d, s, P, 42);
  armOf(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN');
  shackle(d, s, P, 62);
  void info;
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: FR, shin: FR, foot: FR, rThigh: [5.4, 4.2] as [number, number], rShin: [4.2, 3.4] as [number, number], z, shade, footStyle: 'bare' as const,
});

/** A torn sleeve of charcoal cloth over the thigh, ending in ragged points. */
function sleeve(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  const a = at(hip, th, -1), b = at(hip, th, 10.4);
  d.capsule({ mat: CH, z, group: 'sleeve' + side, shade, line: 'soft' }, a, b, 5.9, 5.1);
  for (const [o, len] of [[-3.4, 2.6], [0, 3.6], [3.4, 2.2]] as const) {
    d.ribbon({ mat: CH, z: z + 0.02, group: 'sleeve' + side, shade, line: 'soft' }, [at(b, th + 90, o), at(at(b, th + 90, o), th, len)], [1.4, 0.3]);
  }
}

/** Arms that hang past the knee: thick fur to the elbow, then the forearm, a broad paw, three black claws. */
function armOf(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: FR, z, group, shade }, sh, el, 4.2, 3.4);
  d.capsule({ mat: FR, z: z + 0.1, group, shade }, el, ha, 3.4, 2.8);
  d.ellipse({ mat: FR, z: z + 0.3, group, shade }, ha, 3.4, 2.8, lo);
  for (const k of [-1, 0, 1]) {
    const base = at(at(ha, lo, 2.6), lo + 90, k * 1.5);
    d.ribbon({ mat: CL, z: z + 0.35, group: group + 'c' + k, shade, line: 'soft' }, [base, at(base, lo + k * 14, 3.2), at(base, lo + k * 20, 5.8)], [0.9, 0.9, 0.2]);
  }
}

function torso(d: Draw, s: Skel, z: number) {
  const body = [
    [-2, 7, 8], [4, 8, 10], [10, 9.4, 11], [15, 10.4, 10.6], [20, 9, 8.4], [23.4, 6, 5], [25, 3, 2.4],
  ] as [number, number, number][];
  const front = body.map(([u, , f]) => s.T(u, f));
  const back = body.map(([u, b]) => s.T(u, -b)).reverse();
  d.poly({ mat: FR, z, group: 'body' }, [...front, ...back], { kind: 'cyl', a: s.T(0, 1), b: s.T(25, 1), r: 10.4, bevel: 1.4 });
  // the paler fur of the chest and belly
  d.ellipse({ mat: MN, z: z + 0.1, group: 'chest', line: 'none' }, s.T(13, 6.8), 6.4, 4.4, s.torso);
  // ribs showing through the lean flank
  for (const u of [8, 11, 14]) d.line({ mat: FR, z: z + 0.15, group: 'body', line: 'none' }, s.T(u, -2), s.T(u + 1.2, 5), FR.ramp[1]);
}

/** The sash of the Reign's plum across the chest, knotted at the hip, its two ragged ends hanging and swaying. */
function sash(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const T = s.T;
  d.ribbon({ mat: PL, z, group: 'sash', line: 'soft' }, [T(22, 4), T(17, 7.6), T(11, 8), T(5, 4)], [1.7, 2, 2, 1.8]);
  const knot = T(4.4, 5);
  d.circle({ mat: PL, z: z + 0.05, group: 'sashKnot' }, knot, 1.9);
  const w = Math.sin(P.wave ?? 0) * 1.4;
  d.ribbon({ mat: PL, z: z + 0.04, group: 'sashEnd1', line: 'soft' }, [knot, v(knot.x + 1 + w * 0.5, knot.y - 6), v(knot.x + 2 + w, knot.y - 11.4)], [1.7, 1.5, 0.3]);
  d.ribbon({ mat: PL, z: z + 0.04, group: 'sashEnd2', line: 'soft' }, [knot, v(knot.x - 1.6 + w * 0.4, knot.y - 5), v(knot.x - 3 + w * 0.8, knot.y - 8.6)], [1.5, 1.3, 0.3]);
  d.pixels({ mat: PL, z: z + 0.06, group: 'sash', line: 'none' }, [{ p: T(16, 7.8), c: PL.ramp[5] }, { p: T(12, 8.2), c: PL.ramp[4] }]);
}

/** A rag of charcoal cloth at the hip, hanging in points, what is left of a soldier's tabard. */
function rag(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const p = s.pelvis;
  const w = Math.sin(P.wave ?? 0) * 0.8;
  d.poly({ mat: CH, z, group: 'rag', line: 'soft' }, [v(p.x - 7, p.y + 3), v(p.x + 7, p.y + 3), v(p.x + 8, p.y - 5), v(p.x + 4, p.y - 10 + w), v(p.x + 1, p.y - 5), v(p.x - 2, p.y - 11 - w), v(p.x - 5, p.y - 5), v(p.x - 8, p.y - 8 + w)], { kind: 'bevel', w: 1 });
}

/** The tail: heavy and bushy, carried low and back, swaying. */
function tail(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const base = P.tail ?? 196;
  const sw = Math.sin(P.wave ?? 0) * 8;
  const p0 = at(s.T(-1, -4), base, 0);
  const p1 = at(p0, base + sw * 0.4, 8), p2 = at(p1, base + 14 + sw, 8), p3 = at(p2, base + 8 + sw * 1.4, 7);
  d.ribbon({ mat: FR, z, group: 'tail', shade: -1 }, [p0, p1, p2, p3], [2.6, 4.2, 4.6, 1.6]);
  d.ribbon({ mat: MN, z: z + 0.05, group: 'tailTip', line: 'none', shade: -1 }, [at(p2, base + 10 + sw, 2), p3], [2.6, 0.9]);
}

/** The iron shackle on the near wrist and a few links of broken chain hanging from it, swinging. */
function shackle(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const ha = s.hN, lo = s.loN;
  d.capsule({ mat: IR, z, group: 'shackle', line: 'soft' }, at(ha, lo, -4.8), at(ha, lo, -2.6), 3.5, 3.5);
  d.pixels({ mat: IR, z: z + 0.05, group: 'shackle', line: 'none' }, [{ p: at(ha, lo + 90, -3.4 + 0), c: IR.ramp[5] }]);
  let p = at(ha, lo, -3.6);
  const sw = Math.sin((P.wave ?? 0) * 1.3) * 16;
  for (let k = 0; k < 3; k++) {
    p = at(p, -90 + sw * (k + 1) * 0.35, 2.3);
    d.circle({ mat: IR, z: z + 0.1 + k * 0.01, group: 'chain' + k, line: 'soft' }, p, 1.15);
  }
}

/** The head frame: the neck is thrust forward and up, the face turned back to look ahead; `faceUp` sets the face's own angle (the howl). */
function headFrame(s: Skel) {
  const P = s.pose.p;
  const want = P.faceUp !== undefined ? P.faceUp : 88 + (s.headDir - 56) * 0.6;
  const dd = (want - s.headDir) * (Math.PI / 180);
  const c = Math.cos(dd) * 1.12, n = Math.sin(dd) * 1.12;
  return (u: number, w: number) => s.H(u * c - w * n, u * n + w * c);
}

/** The ruff: long pale fur down the back of his neck and over his shoulders, in hanging points. */
function mane(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = headFrame(s), T = s.T;
  const w = Math.sin(P.wave ?? 0) * 0.6;
  d.poly({ mat: MN, z, group: 'mane', line: 'soft' },
    [H(2, 6), H(-4, 9), H(-9, 4), T(25, -9), T(22, -14 + w), T(16, -14), T(18, -8), T(11, -12.6 + w), T(10, -6), T(15, 1), T(21, 4), T(24, 2), H(-3, -5), H(2, -2)],
    { kind: 'dome', c: T(21, -5), r: 11, bevel: 1.2 });
  // the pale fur at his throat and cheeks
  d.poly({ mat: MN, z: z + 0.2, group: 'ruff', line: 'soft' }, [H(1, -3.4), H(5, -4.6), H(7, -6), H(3, -8.4), H(-1, -7), H(-4, -4)], { kind: 'bevel', w: 1 });
}

/**
 * The wolf's head, facing +x: a long snout with a dark nose and a drooping lip, two pricked ears
 * (one with a notch torn out of it), pale eyes under a heavy slanting brow, fangs on both jaws.
 * `jaw` 0..1 swings the lower jaw open.
 */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = headFrame(s);
  const jaw = P.jaw ?? 0;
  d.capsule({ mat: FR, z: z - 0.5, group: 'neck' }, s.neck, H(-1, -1), 5, 4.4);
  // the lower jaw, swinging about its hinge
  const hx = 0.4, hy = -2.6, ja = -jaw * 0.66;
  const J = (x: number, y: number) => {
    const dx = x - hx, dy = y - hy;
    return H(hx + dx * Math.cos(ja) - dy * Math.sin(ja), hy + dx * Math.sin(ja) + dy * Math.cos(ja));
  };
  if (jaw > 0.05) d.poly({ mat: FR, z: z - 0.1, group: 'mouth', color: E.mouthRed, line: 'none' }, [H(0, -2.4), H(11.4, -1.6), J(11.4, -2.2), J(0, -2.6)]);
  d.poly({ mat: FR, z: z + 0.05, group: 'jaw' }, [J(-1.4, -2), J(11.4, -2), J(12.6, -3.4), J(10.6, -5.2), J(3, -6.2), J(-2.4, -5)], { kind: 'bevel', w: 1 });
  if (jaw > 0.12) {
    // lower fangs, a row of teeth
    d.ribbon({ mat: CL, z: z + 0.12, group: 'fangL', line: 'none' }, [J(10.2, -2.4), J(10.6, -0.2)], [0.9, 0.2]);
    d.pixels({ mat: CL, z: z + 0.12, group: 'teethL', line: 'none' }, [3, 5, 7].map((u) => ({ p: J(u, -2.2), c: CL.ramp[5] })));
  }
  // the skull and the long snout
  d.poly({ mat: FR, z, group: 'skull' }, [H(-5.6, -1.6), H(-5.2, 4.4), H(-2, 7.6), H(2.4, 7.4), H(5, 5.4), H(9, 3.6), H(13.4, 2), H(15.2, 0.4), H(14.6, -1.6), H(10, -2.2), H(4, -2.8), H(-2, -3.2)], { kind: 'dome', c: H(1, 2.4), r: 8.6, bevel: 1.2 });
  // the pale muzzle and the dark nose
  d.poly({ mat: MN, z: z + 0.08, group: 'muzzle', line: 'none' }, [H(7, 0.4), H(13, 1.2), H(14.4, -0.2), H(14, -1.6), H(9, -2)], { kind: 'bevel', w: 0.8 });
  d.ellipse({ mat: FR, z: z + 0.1, group: 'nose', line: 'soft', shade: -1 }, H(14.6, 0.6), 1.6, 1.3, 0);
  d.pixels({ mat: MN, z: z + 0.2, group: 'nose', line: 'none', outline: false }, [{ p: H(14.2, 1.2), c: MN.ramp[5] }]);
  // an upper fang over the lip
  d.ribbon({ mat: CL, z: z + 0.14, group: 'fangU', line: 'none' }, [H(11.4, -1.6), H(11.8, -3.8 - jaw * 0.6)], [0.9, 0.2]);
  // a heavy slanting brow and the pale eye under it
  d.line({ mat: FR, z: z + 0.2, group: 'skull', line: 'none', shade: -1 }, H(3.6, 3.8), H(8.4, 2.4), FR.ramp[0]);
  d.pixels({ mat: FR, z: z + 0.3, group: 'eye', line: 'none', outline: false }, P.dead
    ? [{ p: H(6.0, 1.6), c: FR.ramp[0] }, { p: H(7.0, 1.4), c: FR.ramp[0] }]
    : [{ p: H(5.6, 1.8), c: E.ashEye }, { p: H(6.6, 1.8), c: E.white }, { p: H(6.6, 0.8), c: E.ashEyeDim }]);
  // the ears: far one behind, near one in front with a notch torn out of its edge
  const ear = P.ear ?? 0;
  d.poly({ mat: FR, z: z - 0.2, group: 'earF', shade: -1, line: 'soft' }, [H(-3.4, 5.4 + ear), H(-5.6, 13 + ear), H(-0.4, 9.4)], { kind: 'bevel', w: 0.8 });
  d.poly({ mat: FR, z: z + 0.15, group: 'earN', line: 'soft' }, [H(0.8, 7), H(-0.6, 14.6 + ear), H(1.8, 11), H(2.6, 12.2 + ear), H(5, 7.6)], { kind: 'bevel', w: 0.8 });
  d.pixels({ mat: MN, z: z + 0.2, group: 'earN', line: 'none' }, [{ p: H(0.6, 9), c: MN.ramp[3] }, { p: H(0.4, 10.4), c: MN.ramp[3] }]);
  // a scar across the muzzle
  d.pixels({ mat: MN, z: z + 0.25, group: 'scar', line: 'none', outline: false }, [{ p: H(9.2, 2.2), c: MN.ramp[4] }, { p: H(9.8, 1.4), c: MN.ramp[4] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations (hand coordinates are rig space: [forward, up] from the feet)
// ---------------------------------------------------------------------------

const ly = (hN: V, hF: V, o: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hN, bend: -1 }, armF: { ik: hF, bend: -1 }, ...o, p: { jaw: 0, ...(o.p ?? {}) } });

const STAND = { torso: 60, head: 52, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) } };
const IDLE = ly(v(15, 28), v(23, 30), { x: -2, y: -1, ...STAND });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return ly(v(15, 28 - b), v(23, 30 - b), { x: -2, y: -1 - b, ...STAND, torso: 60 - b, head: 51 - b, p: { wave: a, jaw: b * 0.12, ear: b } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const bob = Math.round(Math.cos(2 * a));
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -12 * Math.cos(ph), y: 3 + (sn > 0 ? 7 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return ly(v(14 + sw * 11, 32 + bob - Math.abs(sw) * 2), v(18 - sw * 11, 33 + bob - Math.abs(sw) * 2), { x: 1, y: bob - 2, torso: 52, head: 48, legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang, p: { wave: a * 2, jaw: 0.2, tail: 180 } });
}

// Ravening Claws: the near arm hauled back, a rake down and across; then the far arm the other way.
const RK_WIND = ly(v(-10, 46), v(20, 24), { x: -4, y: -1, torso: 72, head: 60, legN: { ik: v(-13, 3) }, legF: { ik: v(9, 3) }, p: { jaw: 0.4 } });
const RK_ONE = ly(v(34, 36), v(16, 34), { x: 7, y: -4, torso: 52, head: 46, legN: { ik: v(-13, 3) }, legF: { ik: v(16, 3) }, p: { jaw: 0.8, wave: 1.6 } });
const RK_WIND2 = ly(v(26, 26), v(-6, 46), { x: 3, y: -2, torso: 64, head: 56, legN: { ik: v(-12, 3) }, legF: { ik: v(13, 3) }, p: { jaw: 0.5, wave: 2 } });
const RK_TWO = ly(v(16, 30), v(34, 38), { x: 9, y: -5, torso: 48, head: 44, legN: { ik: v(-14, 3) }, legF: { ik: v(18, 3) }, p: { jaw: 1, wave: 2.6 } });

// Hunter's Howl: he rises up on his hind legs, the arms flung out, the head thrown back, the snout at the moon.
const HW_LOW = ly(v(12, 22), v(16, 22), { x: -3, y: -4, torso: 56, head: 50, legN: { ik: v(-12, 3) }, legF: { ik: v(10, 3) }, p: { jaw: 0.1, ear: 1 } });
const HW_UP = ly(v(16, 30), v(-10, 34), { x: -3, y: 0, torso: 96, head: 130, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, p: { jaw: 1, faceUp: 160, ear: 2, tail: 214, wave: 1 } });
const HW_HOLD = tweak(HW_UP, { y: 1, p: { jaw: 0.85, faceUp: 164, wave: 2.2 } });

// Moonlit Maul: he sinks to a crouch, springs (the scene carries him along the arc), comes down on the target with the claws out and the jaws open, and tears.
const ML_CROUCH = ly(v(8, 14), v(18, 16), { x: -5, y: -9, torso: 44, head: 40, legN: { ik: v(-13, 3) }, legF: { ik: v(8, 3) }, p: { jaw: 0.3, ear: 1 } });
const ML_LAUNCH = ly(v(-6, 40), v(-2, 34), { x: 2, y: 3, torso: 30, head: 36, legN: { ik: v(-17, 6) }, legF: { ik: v(8, 3) }, p: { jaw: 0.6, tail: 214 } });
const ML_FLY = ly(v(36, 52), v(32, 46), { x: 4, y: 6, torso: 24, head: 38, legN: { ik: v(-14, 14) }, legF: { ik: v(6, 10) }, p: { jaw: 1, tail: 220, wave: 2 } });
const ML_BITE = ly(v(30, 36), v(26, 30), { x: 6, y: -2, torso: 32, head: 30, legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) }, p: { jaw: 0, faceUp: 60, wave: 2.6 } });
const ML_TEAR = ly(v(28, 30), v(22, 28), { x: 4, y: -4, torso: 38, head: 24, legN: { ik: v(-12, 3) }, legF: { ik: v(13, 3) }, p: { jaw: 0.1, faceUp: 40, wave: 3 } });
const ML_BACK = ly(v(16, 30), v(20, 32), { x: 0, y: -2, torso: 54, head: 46, legN: { ik: v(-12, 3) }, legF: { ik: v(11, 3) }, p: { jaw: 0.5, wave: 1 } });

const HURT = ly(v(8, 34), v(16, 32), { x: -5, y: -1, torso: 76, head: 62, legN: { ik: v(-14, 3) }, legF: { ik: v(8, 4) }, footF: 10, p: { jaw: 0.7, ear: -3 } });
const DEATH_KNEEL = ly(v(14, 8), v(20, 8), { x: 0, y: -12, torso: 50, head: 30, legN: { ik: v(-15, 3) }, legF: { ik: v(9, 3) }, footN: -60, p: { dead: 1, jaw: 0.4, ear: -4 } });
const DEATH_FALL = pose({
  x: 2, y: -8, torso: 26, head: 12,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -40, lo: -10 }, armF: { up: -20, lo: 10 },
  p: { dead: 1, jaw: 0.3, ear: -4, tail: 200, faceUp: 120 },
});
const DEATH_DOWN = pose({
  x: 6, y: -19, torso: 4, head: -2,
  legN: { up: 186, lo: 150 }, legF: { up: 176, lo: 140 }, footN: -60, footF: -70,
  armN: { up: 10, lo: -20 }, armF: { up: -6, lo: 14 },
  p: { dead: 1, jaw: 0.2, ear: -4, tail: 196, faceUp: 150 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const waved = (p: Pose, w: number) => tweak(p, { p: { wave: w } });

const char: CharDef = {
  id: 'lycan',
  name: 'Lycan',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 180, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RK_WIND, 2, 80),
        ...keys([
          [RK_WIND, 170],
          [mid(RK_WIND, RK_ONE, 0.5), 35],
          [RK_ONE, 70, { hit: true }],
          [RK_WIND2, 90],
          [mid(RK_WIND2, RK_TWO, 0.5), 35],
          [RK_TWO, 70, { hit: true }],
          [waved(RK_TWO, 3.2), 200],
        ]),
        ...tween(D, RK_TWO, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, HW_LOW, 2, 90),
        ...keys([
          [HW_LOW, 220],
          [mid(HW_LOW, HW_UP, 0.5), 80],
          [HW_UP, 120, { event: 'cast', hit: true }],
          [HW_HOLD, 260],
          [waved(HW_HOLD, 3), 260],
          [mid(HW_HOLD, IDLE, 0.5), 100],
        ]),
        ...tween(D, mid(HW_HOLD, IDLE, 0.5), IDLE, 2, 100, ease.inOut),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...tween(D, IDLE, ML_CROUCH, 2, 80),
        ...keys([
          [ML_CROUCH, 240],
          [ML_LAUNCH, 90, { event: 'jump' }],
          [ML_FLY, 120],
          [mid(ML_FLY, ML_BITE, 0.5), 70],
          [ML_BITE, 100, { hit: true }],
          [ML_TEAR, 130],
          [tweak(ML_BITE, { p: { jaw: 0.1, faceUp: 50 } }), 110],
          [ML_TEAR, 120],
          [ML_BACK, 160],
        ]),
        ...tween(D, ML_BACK, IDLE, 2, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -4, torso: 74 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 280],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 150],
        [tweak(DEATH_DOWN, { y: -19.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, HW_UP, 2, 110, ease.out),
        ...keys([
          [HW_HOLD, 320],
          [waved(HW_HOLD, 3), 320],
          [waved(HW_HOLD, 4.4), 300],
          [mid(HW_HOLD, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** A wolf's head in profile for an icon, facing right: ears, a long snout, a pale eye, `jaw` 0..1 the lower jaw. */
function iconHead(d: Draw, c: V, jaw: number, z: number) {
  const P = (x: number, y: number) => v(c.x + x, c.y + y);
  const jy = -jaw * 5;
  d.poly({ mat: FR, z, group: 'ihead' }, [P(-9, -4), P(-9, 4), P(-5, 9), P(0, 9), P(5, 6), P(12, 3), P(16, 0), P(15, -2), P(5, -3), P(-4, -5)], { kind: 'dome', c: P(-1, 2), r: 11, bevel: 1.4 });
  d.poly({ mat: FR, z: z + 0.05, group: 'ijaw' }, [P(-4, -4), P(14, -3 + jy), P(15, -5 + jy), P(9, -8 + jy), P(-2, -8)], { kind: 'bevel', w: 1.2 });
  d.poly({ mat: FR, z: z + 0.1, group: 'iear' }, [P(-4, 8), P(-7, 17), P(2, 10)], { kind: 'bevel', w: 1 });
  d.poly({ mat: FR, z: z + 0.1, group: 'iear2' }, [P(1, 8), P(0, 18), P(6, 8)], { kind: 'bevel', w: 1 });
  d.ribbon({ mat: CL, z: z + 0.15, group: 'ifang', line: 'none' }, [P(12, -3 + jy * 0.2), P(12.6, -6.6 + jy * 0.6)], [1.4, 0.3]);
  d.ribbon({ mat: CL, z: z + 0.15, group: 'ifang2', line: 'none' }, [P(10, -2.4 + jy), P(10.6, 1.6 + jy * 0.4)], [1.4, 0.3]);
  d.pixels({ mat: FR, z: z + 0.2, group: 'ieye', line: 'none', outline: false }, [{ p: P(5, 3.4), c: E.ashEye }, { p: P(6, 3.4), c: E.white }, { p: P(5, 2.4), c: E.ashEye }, { p: P(6, 2.4), c: E.ashEyeDim }]);
}

/** Three claw marks and the three claws that made them (glyph space). */
function iconClaws(d: Draw, z: number) {
  for (const k of [-1, 0, 1]) {
    d.ribbon({ mat: CL, z, group: 'iclaw' + k, line: 'soft' }, [v(10 + k * 7, 34), v(15 + k * 7, 22), v(20 + k * 7, 8)], [0.6, 2.8, 0.4]);
  }
}

export const lycan: ChampionArt = {
  char,
  iconBg: FR,
  icons: {
    ravening_claws: () =>
      compose(FR, glyph((d) => iconClaws(d, 10)), (b) => {
        impactStar(b, 28, 28, 2, 8, 9, FXR.dust[3], E.white);
        // what he takes back: pale wisps drifting in from the wound
        for (const [x, y] of [[8, 8], [11, 5], [6, 12]] as const) b.set(x, y, E.ashEye);
      }),
    hunters_howl: () =>
      compose(FR, glyph((d) => iconHead(d, v(15, 14), 1, 10)), (b) => {
        // the pale moon he howls at, and rings of sound going out from his open mouth
        for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) if (xx * xx + yy * yy <= 24 && (xx + 1) * (xx + 1) + (yy - 1) * (yy - 1) > 14) b.set(30 + xx, 8 + yy, E.ashEye);
        for (const [r, c] of [[6, E.white], [10, E.ashEye], [14, E.ashEyeDim]] as const) {
          for (let deg = -70; deg <= 10; deg += 4) {
            const t2 = (deg * Math.PI) / 180;
            b.set(Math.round(30 + Math.cos(t2) * r), Math.round(24 + Math.sin(t2) * r), c);
          }
        }
      }),
    moonlit_maul: () =>
      compose(FR, glyph((d) => iconHead(d, v(15, 17), 0.9, 10)), (b) => {
        impactStar(b, 31, 9, 1, 7, 7, FXR.dust[3], E.white);
        for (const [x, y] of [[6, 30], [10, 33], [4, 35]] as const) b.set(x, y, E.ashEye);
      }),
    moon_mad: () =>
      compose(FR, glyph((d) => {
        // the moon, and the speed it gives: a pale disc over three bounding lines
        d.circle({ mat: CL, z: 10, group: 'imoon' }, v(20, 20), 11);
        d.circle({ mat: FR, z: 10.1, group: 'imoon2', line: 'none' }, v(25, 23), 9.4);
      }), (b) => {
        for (const [x0, y0, x1, y1] of [[4, 30, 14, 30], [3, 25, 11, 25], [5, 20, 13, 20]]) for (let x = x0; x <= x1; x++) b.set(x, y0, E.ashEye);
      }),
  },
};
