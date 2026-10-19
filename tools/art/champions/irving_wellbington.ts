// Irving Wellbington (docs/DESIGN_DECISIONS.md section 33, Jakub's brief of
// 2026-10-19): an Elite of the Ashveil Reign, Tank, Bloom. "This is a dwarf
// skeleton with big horned helmet and robust round shield with ancient runs on
// it." So he is built bone by bone like the Reign's other skeletons
// (tools/art/bones.ts), but a dwarf's: short-legged, broad, the bones thick, a
// barrel of a ribcage; his skull, its jaw on its own hinge and a pale light in
// its socket, sits under a big iron helmet with a brow band and two great
// horns curving up from it. A braided beard of grey hair still hangs from his
// jaw, an iron ring near its end (a dwarf's mark; the brief does not name it).
// On his far forearm, before him, a robust round shield of old planks with an
// iron rim and boss, a ring of ancient runes cut round the boss and a pale
// light in them, waxing and waning. No weapon is named, so he fights with the
// shield: Shield Bash drives its face into the enemy, Bulwark Slam brings its
// rim down and plants it before him. He dies the way the Reign's skeletons do:
// the bones give way and fall into a heap, the skull rolling off in its
// helmet, the shield falling flat. What the brief leaves open is a first
// take; nothing in the look comes from his affinity (affinities are abstract,
// Jakub, 2026-10-11).
//
// Pose channels: `shieldAng` the shield's up axis (deg; 90 upright), `runes`
// the light in the runes (0..1, over 1 they blaze), `jaw` the jaw's hinge
// (deg open), `grab` 1 while his near hand holds the shield's rim, `heap` lets
// the bones fall apart (0..1).
import { BN, BoneSet, fallApart, longBone, pairedBones, skullFrame, trunkFrame, vertebrae } from '../bones.ts';
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar, speedLines } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, D2R, Dims, Draw, ease, lerp, lerpPose, lerpV, pose, Pose, Skel, solve, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 22.4,
  thigh: 10.4,
  shin: 10,
  ankleH: 2.6,
  footLen: 6,
  spine: 18.5,
  neck: 4.6,
  upperArm: 10.8,
  foreArm: 9.8,
  shoulderDrop: 3.6,
  shoulderN: -3.8,
  shoulderF: 4.2,
  hipN: -2.2,
  hipF: 2.2,
};

const IR = MAT.iron, HO = MAT.bone, WD = MAT.wood, HR = MAT.furGrey;
const E = ACCENT;

/** The skull and its helmet, a dwarf's, broad: scale over the Skeleton's. */
const SK = 1.12;
/** The shield: its radius, and how far its face is turned from us (narrower across). */
const R = 16, FACE = 0.8;

const angle = (a: V, b: V) => Math.atan2(b.y - a.y, b.x - a.x) / D2R;

// ---------------------------------------------------------------------------
// The bones and the shield, as placed this frame: from the solved skeleton
// while he stands, falling apart toward the heap while he dies
// ---------------------------------------------------------------------------

interface Bones extends BoneSet {
  /** the shield's centre */
  shield: V;
  /** its up axis (deg) */
  shieldAng: number;
}

/** Where everything comes to rest: the trunk on its back, the skull rolled forward in its helmet, the limbs scattered, the shield flat before them. */
const HEAP: Bones = {
  pelvis: v(-7, 5.4), torso: 174,
  head: v(19, 7.6), headDir: 122,
  sN: v(-1, 5.0), eN: v(6, 3.0), hN: v(12, 2.8),
  sF: v(-12, 6.4), eF: v(-18, 3.6), hF: v(-24, 2.6),
  hipN: v(-5, 4.4), kneeN: v(1, 5.6), ankN: v(7, 2.6), footN: -8,
  hipF: v(-8, 3.8), kneeF: v(-14, 5.0), ankF: v(-20, 2.6), footF: 176,
  shield: v(3, 3.6), shieldAng: 2,
};

/** The shield's centre while he holds it: strapped to the far forearm, a little before it. */
function shieldCentre(s: Skel): V {
  return at(lerpV(s.eF, s.hF, 0.55), s.torso - 90, 1.8);
}

function bonesOf(s: Skel, heap: number): Bones {
  const P = s.pose.p;
  const alive: Bones = {
    pelvis: s.pelvis, torso: s.torso, head: s.head, headDir: s.headDir,
    sN: s.sN, eN: s.eN, hN: s.hN, sF: s.sF, eF: s.eF, hF: s.hF,
    hipN: s.hipN, kneeN: s.kneeN, ankN: s.ankN, footN: s.pose.footN,
    hipF: s.hipF, kneeF: s.kneeF, ankF: s.ankF, footF: s.pose.footF,
    shield: shieldCentre(s), shieldAng: P.shieldAng ?? 90,
  };
  return fallApart(alive, HEAP, heap);
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const heap = P.heap ?? 0;
  const B = bonesOf(s, heap);
  const T = trunkFrame(B);
  void info;

  // far leg and far arm (its hand is behind the shield), a shade darker
  stoutLeg(d, B.hipF, B.kneeF, B.ankF, B.footF, 10, -1, 'F');
  stoutArm(d, B.sF, B.eF, B.hF, 20, -1, 'F', heap > 0.5 ? 'claw' : 'none');

  // the trunk; the neck, the skull, the beard, the helmet and its horns
  trunk(d, B, T);
  vertebrae(d, T(D.spine, -0.6), skullFrame(B)(-1.4, -3.2), 36, 2);
  skull(d, B, P.jaw ?? 0, 38);
  beard(d, B, P.jaw ?? 0, heap, 39);
  helmet(d, B, 40);

  // the shield before him
  shield(d, B.shield, B.shieldAng, heap, P.runes ?? 0.45, 45);

  // near leg; the near arm over everything, its hand on the shield's rim or a fist
  stoutLeg(d, B.hipN, B.kneeN, B.ankN, B.footN, 50, 0, 'N');
  stoutArm(d, B.sN, B.eN, B.hN, 60, 0, 'N', (P.grab ?? 0) >= 0.5 && heap < 0.5 ? 'grip' : 'claw', B.shieldAng);
}

// ---------------------------------------------------------------------------
// A dwarf's bones: thick, short, knobbed
// ---------------------------------------------------------------------------

/** A dwarf's leg: a thick femur, the kneecap, the shin's two bones, a broad bony foot. */
function stoutLeg(d: Draw, hip: V, knee: V, ank: V, footAng: number, z: number, shade: number, side: string) {
  const g = 'leg' + side;
  longBone(d, hip, knee, [1.45, 1.25], [1.95, 1.75], z, g, shade);
  d.circle({ mat: BN, z: z + 0.05, group: g + 'cap', shade, line: 'soft' }, at(knee, angle(hip, knee) + 90, 1.3), 1.15);
  pairedBones(d, at(knee, angle(knee, ank), 0.9), ank, [1.15, 0.95], 1.5, z + 0.1, g + 's', shade, 0.7);
  d.circle({ mat: BN, z: z + 0.2, group: g + 'ft', shade }, ank, 1.5);
  const f = d.frame(ank, footAng);
  d.circle({ mat: BN, z: z + 0.18, group: g + 'ft', shade }, f(-1.6, -1.4), 1.3);
  for (const [w, l] of [[0, 5.8], [1.2, 5.2], [2.3, 4.4]] as const) {
    d.capsule({ mat: BN, z: z + 0.22 - w * 0.01, group: g + 'toe' + w, shade, line: 'none', outline: true }, f(0.6, -1.4 + w * 0.36), f(l, -2.1 + w * 0.5), 0.78, 0.62);
  }
}

/** A dwarf's arm: a thick humerus, the forearm's two bones, then a hand on a grip at `gripAng`, a bony fist, or none. */
function stoutArm(d: Draw, sh: V, el: V, ha: V, z: number, shade: number, side: string, hand: 'grip' | 'claw' | 'none', gripAng = 0) {
  const g = 'arm' + side;
  longBone(d, sh, el, [1.2, 1.05], [1.7, 1.5], z, g, shade);
  pairedBones(d, el, at(ha, angle(el, ha), -0.7), [0.82, 0.7], 1.5, z + 0.1, g + 'lo', shade, 0.65);
  if (hand === 'none') return;
  d.circle({ mat: BN, z: z + 0.2, group: g + 'h', shade }, ha, 1.4);
  if (hand === 'grip') {
    const f = d.frame(ha, gripAng);
    for (const u of [-1.6, 0, 1.6]) d.circle({ mat: BN, z: z + 0.25, group: g + 'f' + u, shade, line: 'soft' }, f(u, -1.3), 0.75);
    d.circle({ mat: BN, z: z + 0.24, group: g + 'th', shade, line: 'soft' }, f(1.2, 1.2), 0.65);
  } else {
    const lo = angle(el, ha);
    for (const [da, l] of [[-30, 2.3], [0, 2.7], [28, 2.2]] as const) d.circle({ mat: BN, z: z + 0.25 + da * 0.001, group: g + 'k' + da, shade, line: 'soft' }, at(ha, lo + da, l), 0.85);
  }
}

/**
 * The trunk in its frame, a dwarf's: a barrel of a ribcage, the far ribs
 * glimpsed through the near ones, a thick spine, a broad pelvis, the
 * breastbone and the collar bones.
 */
function trunk(d: Draw, B: Bones, T: (u: number, w: number) => V) {
  const top = D.spine - 2.4;
  for (let k = 0; k < 3; k++) {
    const u = top - k * 2.5 + 1.2;
    d.ribbon({ mat: BN, z: 27 + k * 0.01, group: 'farRib' + k, shade: -2, line: 'none' }, [T(u, -2.8), T(u - 0.3, 0.4), T(u - 1.2 - k * 0.2, 2.8)], [0.55, 0.6, 0.5]);
  }
  d.capsule({ mat: BN, z: 29, group: 'spine', tex: (h) => (Math.floor(h.u * 8) % 2 ? -1 : 0) }, T(2.6, -2.0), T(D.spine + 0.2, -2.9), 1.5, 1.3);
  for (let k = 0; k < 4; k++) d.circle({ mat: BN, z: 29.1, group: 'lumbar' + k, line: 'soft' }, T(3.4 + k * 1.5, -2.1 - k * 0.1), 1.55);
  d.poly(
    { mat: BN, z: 31, group: 'pelvis' },
    [T(3.8, -3.8), T(4.5, -0.6), T(4.1, 3.2), T(2.5, 5.0), T(0.4, 4.6), T(-1.8, 3.2), T(-2.5, 0.6), T(-1.6, -2.0), T(1.0, -4.2)],
    { kind: 'dome', c: T(1.4, 0.3), r: 5.4, bevel: 0.8 },
  );
  d.ellipse({ mat: BN, z: 31.1, group: 'pelvisHole', flat: 0, line: 'none' }, T(-0.4, 2.0), 1.2, 0.9, B.torso);
  for (let k = 0; k < 4; k++) {
    const u = top - k * 2.5;
    const front = k === 3 ? 3.6 : 6.0;
    d.ribbon({ mat: BN, z: 33 + k * 0.01, group: 'rib' + k, line: 'strong' }, [T(u, -3.6), T(u + 0.3, -1.0), T(u - 0.6 - k * 0.15, 2.4), T(u - 2.0 - k * 0.35, front)], [0.6, 0.7, 0.65, 0.55]);
  }
  d.capsule({ mat: BN, z: 34, group: 'sternum' }, T(top, 5.4), T(top - 5.6, 5.6), 1.3, 0.9);
  d.capsule({ mat: BN, z: 26.5, group: 'clavF', shade: -1, line: 'soft' }, T(top + 0.6, 4.6), B.sF, 0.75, 0.7);
  d.capsule({ mat: BN, z: 34.2, group: 'clavN', line: 'soft' }, T(top + 0.6, 5.0), B.sN, 0.8, 0.75);
}

// ---------------------------------------------------------------------------
// The head: the skull and its jaw, the beard, the horned helmet
// ---------------------------------------------------------------------------

/** The skull's frame, scaled to a dwarf's head. */
const headFrame = (B: Bones) => {
  const H0 = skullFrame(B);
  return (x: number, y: number) => H0(x * SK, y * SK);
};

/** Where the jaw turns on its hinge: a point of the jaw in the skull's frame. */
function jawFrame(B: Bones, jaw: number) {
  const H = headFrame(B);
  const hx = -0.3, hy = -1.4;
  const c = Math.cos(-jaw * D2R), s = Math.sin(-jaw * D2R);
  return (x: number, y: number) => H(hx + (x - hx) * c - (y - hy) * s, hy + (x - hx) * s + (y - hy) * c);
}

/** The skull under the helmet: the face's bone, a dark socket with a pale light in it, the nose's hollow, the upper teeth, the jaw on its hinge (`jaw`). */
function skull(d: Draw, B: Bones, jaw: number, z: number) {
  const H = headFrame(B);
  const ha = B.headDir - 90;
  d.ellipse({ mat: BN, z, group: 'skull' }, H(-0.8, 1.3), 5.5 * SK, 5.7 * SK, ha);
  d.poly(
    { mat: BN, z: z + 0.05, group: 'skull' },
    [H(-0.4, 3.2), H(3.6, 3.1), H(5.5, 1.6), H(6.0, -0.6), H(5.7, -2.2), H(4.6, -2.9), H(1.8, -2.9), H(-0.9, -1.6)],
    { kind: 'dome', c: H(1.4, 0.4), r: 6.6 * SK, bevel: 0.8 },
  );
  d.ellipse({ mat: BN, z: z + 0.15, group: 'socket', flat: 0, line: 'none' }, H(2.6, 0.7), 1.85 * SK, 2.0 * SK, ha);
  d.ellipse({ mat: BN, z: z + 0.15, group: 'socketF', flat: 0, line: 'none' }, H(5.2, 0.6), 0.65 * SK, 1.5 * SK, ha);
  d.pixels({ mat: BN, z: z + 0.2, group: 'socket' }, [{ p: H(3.0, 0.6), c: E.ashEye }, { p: H(2.9, -0.4), c: E.ashEyeDim }]);
  d.pixels({ mat: BN, z: z + 0.2, group: 'skull' }, [{ p: H(5.0, -1.2), c: BN.ramp[0] }, { p: H(5.4, -1.2), c: BN.ramp[0] }, { p: H(5.1, -1.8), c: BN.ramp[1] }, { p: H(2.6, -1.6), c: BN.ramp[4] }, { p: H(3.6, -1.6), c: BN.ramp[4] }]);
  d.pixels({ mat: BN, z: z + 0.2, group: 'skull' }, [1.9, 2.9, 3.9, 4.9].flatMap((x, i) => [{ p: H(x, -2.8), c: BN.ramp[i % 2 ? 4 : 5] }, { p: H(x + 0.5, -2.8), c: BN.ramp[1] }]));
  const J = jawFrame(B, jaw);
  d.poly(
    { mat: BN, z: z - 0.05, group: 'jaw' },
    [J(-1.4, -0.6), J(-0.9, -2.8), J(1.2, -4.5), J(4.4, -4.6), J(5.5, -3.9), J(5.4, -3.1), J(2.0, -3.1), J(0.4, -2.2)],
    { kind: 'dome', c: J(2.2, -3.0), r: 4.4 * SK, bevel: 0.6 },
  );
  d.pixels({ mat: BN, z: z - 0.04, group: 'jaw' }, [2.3, 3.3, 4.3].flatMap((x, i) => [{ p: J(x, -3.2), c: BN.ramp[i % 2 ? 4 : 5] }, { p: J(x + 0.5, -3.2), c: BN.ramp[1] }]));
}

/**
 * The beard: grey hair still hanging from the jaw, gathered into a thick
 * braid that hangs down his chest, an iron ring near its end; it hangs with
 * the weight of it, a little with the head, and lies along the ground when he
 * falls (`heap`).
 */
function beard(d: Draw, B: Bones, jaw: number, heap: number, z: number) {
  const J = jawFrame(B, jaw);
  const chin = J(3.6, -4.4), back = J(0.2, -3.4);
  const hang = lerp(-90 + (B.headDir - 90) * 0.25, -12, Math.min(1, heap * 1.4));
  // the hair along the jaw, then the braid
  d.poly({ mat: HR, z, group: 'beard' }, [at(back, hang + 180, 0.6), at(chin, hang + 150, 0.8), at(chin, hang + 20, 3.4), at(lerpV(back, chin, 0.5), hang, 4.2), at(back, hang - 10, 3.4)], { kind: 'dome', c: lerpV(back, chin, 0.5), r: 4.2, bevel: 0.6 });
  const p0 = at(lerpV(back, chin, 0.62), hang, 1.6);
  const p1 = at(p0, hang + 4, 3.0), p2 = at(p1, hang - 2, 3.0), p3 = at(p2, hang - 6, 2.6), p4 = at(p3, hang - 2, 1.8);
  d.ribbon({ mat: HR, z: z + 0.1, group: 'braid', tex: (h) => (Math.floor(h.u * 9) % 2 ? -1 : 0) }, [p0, p1, p2, p3, p4], [2.2, 1.8, 1.5, 1.1, 0.6]);
  d.capsule({ mat: IR, z: z + 0.2, group: 'beardRing', line: 'soft' }, at(p3, hang + 90, 1.2), at(p3, hang - 90, 1.2), 0.55, 0.55);
}

/** A horn: a tapered curve of ivory, ridged near its root, dark at its tip. */
function horn(d: Draw, pts: V[], z: number, shade: number, side: string) {
  d.ribbon({ mat: HO, z, group: 'horn' + side, shade, maxIdx: 4, tex: (h) => (h.u < 0.32 && Math.floor(h.u * 22) % 2 ? -1 : h.u > 0.86 ? -2 : 0) }, pts, [1.75, 1.5, 1.2, 0.85, 0.4]);
}

/**
 * The helmet, big and iron: a cap from the brow over the crown to the nape,
 * a ridge along its crown, a brow band with rivets, and two great horns: the
 * near one sweeping forward and up, its tip turning back, the far one back
 * and up behind the cap, its tip turning forward.
 */
function helmet(d: Draw, B: Bones, z: number) {
  const H = headFrame(B);
  horn(d, [H(-2.2, 7.0), H(-5.6, 9.2), H(-7.6, 12.8), H(-7.2, 16.0), H(-5.4, 18.0)], z - 0.6, -1, 'F');
  const cap = [H(6.0, 3.6), H(5.6, 5.9), H(3.6, 8.2), H(0, 9.0), H(-3.6, 8.4), H(-6.3, 6.2), H(-7.1, 3.0), H(-6.5, 1.9), H(-2.0, 2.7), H(2.6, 3.1)];
  d.poly({ mat: IR, z, group: 'helm' }, cap, { kind: 'dome', c: H(0.4, 6.0), r: 8.4 * SK, bevel: 1 });
  d.line({ mat: IR, z: z + 0.15, group: 'helm', line: 'none' }, H(4.6, 7.0), H(-2.0, 8.8), IR.ramp[5]);
  d.ribbon({ mat: IR, z: z + 0.1, group: 'helmBand', shade: 1 }, [H(6.2, 3.6), H(2.6, 3.3), H(-2.0, 2.9), H(-6.7, 2.3)], [0.95, 0.95, 0.95, 0.95]);
  d.pixels({ mat: IR, z: z + 0.2, group: 'helmBand' }, [H(4.8, 3.5), H(0.6, 3.2), H(-3.8, 2.7)].map((p) => ({ p, c: IR.ramp[5] })));
  horn(d, [H(1.0, 7.6), H(4.2, 10.2), H(6.4, 13.6), H(6.2, 16.8), H(4.4, 18.8)], z + 0.6, 0, 'N');
}

// ---------------------------------------------------------------------------
// The shield: round, robust, old planks in an iron rim, a boss, a ring of runes
// ---------------------------------------------------------------------------

/** The runes, each a few cuts: [along the shield's up axis, across], unit steps. */
const RUNES: [number, number][][] = [
  [[1, 0], [0, 0], [-1, 0], [1, 1], [0, 1]], // a staff with two arms
  [[1, 0], [0, 0], [-1, 0], [1, -1], [-1, -1]], // a staff, two cuts on one side
  [[1, -1], [0, 0], [-1, 1], [1, 1], [-1, -1]], // a cross
  [[1, 0], [0, 0], [-1, 0], [0, 1], [-1, 1]], // a staff and a hook
  [[1, 0], [0, -1], [-1, 0], [0, 1]], // a diamond
  [[1, 0], [0, 0], [-1, 0], [1, 1], [1, -1]], // an arrow up
  [[1, -1], [0, -1], [-1, -1], [0, 0], [1, 1], [0, 1], [-1, 1]], // two staves joined
  [[1, 0], [0, 0], [-1, 0], [-1, 1], [-1, -1]], // an arrow down
];

/**
 * The shield before him: an iron rim, a field of old planks, an iron boss and
 * rivets, and between the boss and the rim a ring of ancient runes, cut dark
 * into the wood, a pale light in the cuts (`runes`: none, waxing, blazing).
 * `ang` is its up axis; `flat` (0..1) lays it down, seen nearly edge on.
 */
function shield(d: Draw, c: V, ang: number, flat: number, runes: number, z: number) {
  const K = FACE * (1 - flat * 0.75);
  const f = d.frame(c, ang);
  const ring = (r: number, n = 30) => Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return f(r * Math.cos(t), r * K * Math.sin(t));
  });
  const dome = { kind: 'dome' as const, c: f(3, R * K * 0.25), r: R * 2.2, bevel: 1.2 };
  d.poly({ mat: IR, z, group: 'shield' }, ring(R), dome);
  d.poly({ mat: WD, z: z + 0.1, group: 'shield', line: 'none' }, ring(R - 1.6), dome);
  // the seams between the planks, along its up axis
  const rf = R - 1.8;
  for (const w of [-rf * 0.5, 0, rf * 0.5]) {
    const u = Math.sqrt(Math.max(0, rf * rf - w * w));
    d.line({ mat: WD, z: z + 0.12, group: 'shield', line: 'none' }, f(u - 0.4, w * K), f(-u + 0.4, w * K), WD.ramp[1]);
  }
  // rivets round the rim
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2 + 0.2;
    d.pixels({ mat: IR, z: z + 0.15, group: 'shield' }, [{ p: f((R - 0.8) * Math.cos(t), (R - 0.8) * K * Math.sin(t)), c: IR.ramp[5] }]);
  }
  // the runes round the boss
  if (flat < 0.6) {
    const px: { p: V; c: RGBA }[] = [];
    const lit = runes > 0.75 ? E.ashEye : runes > 0.3 ? E.ashEyeDim : WD.ramp[0];
    const rr = R * 0.6;
    RUNES.forEach((cuts, k) => {
      const t = (k / RUNES.length) * Math.PI * 2 + 0.35;
      const cu = rr * Math.cos(t), cw = rr * Math.sin(t);
      cuts.forEach(([du, dw], j) => px.push({ p: f(cu + du, (cw + dw) * K), c: j === 0 && runes > 0.3 ? lit : WD.ramp[0] }));
      if (runes > 0.3) px.push({ p: f(cu, cw * K), c: lit });
    });
    if (runes > 1.2) {
      // blazing: the light spilling from the ring between the runes
      for (let k = 0; k < 16; k++) {
        const t = (k / 16) * Math.PI * 2;
        px.push({ p: f(rr * Math.cos(t), rr * Math.sin(t) * K), c: k % 2 ? E.ashEye : E.ashEyeDim });
      }
    }
    d.pixels({ mat: WD, z: z + 0.2, group: 'runes', outline: false, line: 'none' }, px);
  }
  // the boss
  d.ellipse({ mat: IR, z: z + 0.25, group: 'boss' }, c, 2.9, 2.9 * Math.max(K / FACE, 0.3), ang - 90);
  d.pixels({ mat: IR, z: z + 0.3, group: 'boss', outline: false, line: 'none' }, [{ p: f(0.8, 0.8 * K), c: IR.ramp[5] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const REST = { shieldAng: 90, runes: 0.45, jaw: 0, grab: 0, heap: 0 };

const IDLE: Pose = pose({
  torso: 86,
  head: 94,
  legN: { ik: v(-6, 2.6) },
  legF: { ik: v(6.5, 2.6) },
  armN: { up: -100, lo: -82 },
  armF: { up: -72, lo: -24 },
  p: REST,
});

/** Idle: he stands his ground behind the shield, heavy; the runes' light waxes and wanes, the jaw slack. */
function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b,
    armF: { up: -72 + b, lo: -24 + b },
    armN: { up: -100 + b, lo: -82 + b },
    p: { runes: 0.35 + 0.5 * Math.max(0, Math.sin(a)), jaw: b * 3 },
  });
}

/** Run: short, heavy steps, the shield held before him, the near arm swinging. */
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -8.5 * Math.cos(ph), y: 2.6 + (sn > 0 ? 4.5 * sn : 0), ang: sn > 0 ? -18 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 1,
    torso: 80,
    head: 90,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -92 + sw * 30, lo: -62 + sw * 30 },
    armF: { up: -66, lo: -16 },
    p: { ...REST, shieldAng: 88, jaw: 4 },
  });
}

/** His near hand on the shield's rim (the top of it, or `at` round it in degrees off its up axis). */
function grab(base: Pose, at0 = 0, extra: Partial<Pose> & { p?: Record<string, number> } = {}): Pose {
  const p = tweak(base, extra);
  const s = solve(p, D);
  const c = shieldCentre(s);
  const ang = (p.p.shieldAng ?? 90) + at0;
  const rim = at(c, ang, R - 0.6);
  return tweak(p, { armN: { ik: rim, bend: 1 }, p: { grab: 1 } });
}

// Shield Bash: the shield drawn back, then driven forward into the enemy, face first.
const SB_WIND = pose({
  x: -1, torso: 96, head: 98,
  legN: { ik: v(-8, 2.6) }, legF: { ik: v(7, 2.6) },
  armN: { up: -122, lo: -100 }, armF: { up: -108, lo: -64 },
  p: { ...REST, shieldAng: 98, jaw: 8, runes: 0.6 },
});
const SB_BASH = pose({
  x: 5, torso: 70, head: 82,
  legN: { ik: v(-12, 2.6) }, legF: { ik: v(8, 2.6) },
  armN: { up: -60, lo: -36 }, armF: { up: -14, lo: -4 },
  p: { ...REST, shieldAng: 84, jaw: 16, runes: 0.9 },
});
const SB_FOLLOW = tweak(SB_BASH, { x: 4, torso: 74, head: 84, armF: { up: -24, lo: -12 }, p: { jaw: 10, runes: 0.7 } });

// Bulwark Slam: both hands lift the shield over the horns, bring its rim down on the enemy, then plant it before him.
const BS_LIFT = grab(pose({
  x: -1, torso: 96, head: 100,
  legN: { ik: v(-7, 2.6) }, legF: { ik: v(7, 2.6) },
  armN: { up: 60, lo: 70 }, armF: { up: 56, lo: 76 },
  p: { ...REST, shieldAng: 96, jaw: 12, runes: 0.8 },
}), 0);
const BS_SLAM = grab(pose({
  x: 5, y: -3, torso: 64, head: 76,
  legN: { ik: v(-12, 2.6) }, legF: { ik: v(8, 2.6) },
  armN: { up: -20, lo: -40 }, armF: { up: -8, lo: -36 },
  p: { ...REST, shieldAng: 26, jaw: 18, runes: 1 },
}), 0);
const BS_PLANT = grab(pose({
  x: 3, y: -4.4, torso: 80, head: 92,
  legN: { ik: v(-11, 2.6) }, legF: { ik: v(9, 2.6) },
  armN: { up: -40, lo: -40 }, armF: { up: -70, lo: -84 },
  p: { ...REST, shieldAng: 92, jaw: 4, runes: 0.9 },
}), 0);

const HURT = pose({
  x: -4, torso: 100, head: 110,
  legN: { ik: v(-8, 3) }, legF: { ik: v(5, 3.4) }, footF: 10,
  armN: { up: -130, lo: -110 }, armF: { up: -86, lo: -40 },
  p: { ...REST, shieldAng: 102, jaw: 18, runes: 0.3 },
});

/** His bones give way: the knees fold, the trunk sags, then everything falls into a heap, the helmet rolling off with the skull in it, the shield falling flat. */
const BUCKLE = pose({
  x: 1, y: -7, torso: 70, head: 56,
  legN: { ik: v(-7, 3) }, legF: { ik: v(6, 3) }, footN: -10,
  armN: { up: -84, lo: -98 }, armF: { up: -50, lo: -20 },
  p: { ...REST, shieldAng: 70, jaw: 24, runes: 0.2, heap: 0 },
});
const HEAPED = (k: number, y = 0) => tweak(BUCKLE, { y: -7 + y, p: { heap: k, jaw: 24 - k * 16, runes: 0.2 * (1 - k) } });

// Victory: the shield hoisted high, the near fist raised, the jaw clacking in a laugh.
const RAISE = pose({
  torso: 90, head: 100,
  legN: { ik: v(-6, 2.6) }, legF: { ik: v(6.5, 2.6) },
  armN: { up: 52, lo: 80 }, armF: { up: -20, lo: 8 },
  p: { ...REST, shieldAng: 92, jaw: 0, runes: 1.3 },
});
const laugh = (open: number) => tweak(RAISE, { y: open ? 1 : 0, p: { jaw: open } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'irving_wellbington',
  name: 'Irving Wellbington',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 200, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, SB_WIND, 0.5), 80],
        [SB_WIND, 150],
        [mid(SB_WIND, SB_BASH, 0.55), 50],
        [SB_BASH, 160, { hit: true }],
        [SB_FOLLOW, 140],
        [mid(SB_FOLLOW, IDLE, 0.5), 110],
        [IDLE, 100],
      ]),
    },
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, BS_LIFT, 0.5), 90],
        [BS_LIFT, 200],
        [mid(BS_LIFT, BS_SLAM, 0.5), 50],
        [BS_SLAM, 170, { hit: true }],
        [mid(BS_SLAM, BS_PLANT, 0.5), 90],
        [BS_PLANT, 320],
        [mid(BS_PLANT, IDLE, 0.5), 120],
        [IDLE, 110],
      ]),
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 96, head: 104, p: { jaw: 10 } }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [BUCKLE, 110],
        [HEAPED(0.4), 80],
        [HEAPED(0.78), 80],
        [HEAPED(1, 1.2), 110],
        [HEAPED(1), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RAISE, 2, 100, ease.out),
        ...keys([
          [laugh(20), 140],
          [laugh(0), 140],
          [laugh(20), 140],
          [laugh(0), 140],
          [RAISE, 480],
          [mid(RAISE, IDLE, 0.5), 120],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/** The shield in an icon: the sprite's shield, scaled up, its face toward us. */
function iconShield(d: Draw, c: V, ang: number, r: number, z: number, lit: boolean) {
  const f = d.frame(c, ang);
  const K = 0.9;
  const ring = (rr: number, n = 36) => Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return f(rr * Math.cos(t), rr * K * Math.sin(t));
  });
  const dome = { kind: 'dome' as const, c: f(r * 0.3, r * 0.25), r: r * 2.2, bevel: 1.4 };
  d.poly({ mat: IR, z, group: 'ishield' }, ring(r), dome);
  d.poly({ mat: WD, z: z + 0.1, group: 'ishield', line: 'none' }, ring(r - 2.4), dome);
  for (const w of [-(r - 2.6) * 0.5, 0, (r - 2.6) * 0.5]) {
    const u = Math.sqrt(Math.max(0, (r - 2.6) ** 2 - w * w));
    d.line({ mat: WD, z: z + 0.12, group: 'ishield', line: 'none' }, f(u - 0.5, w * K), f(-u + 0.5, w * K), WD.ramp[1]);
  }
  const px: { p: V; c: RGBA }[] = [];
  const rr = r * 0.6;
  RUNES.forEach((cuts, k) => {
    const t = (k / RUNES.length) * Math.PI * 2 + 0.35;
    const cu = rr * Math.cos(t), cw = rr * Math.sin(t);
    cuts.forEach(([du, dw]) => px.push({ p: f(cu + du, (cw + dw) * K), c: lit ? E.ashEye : WD.ramp[0] }));
  });
  d.pixels({ mat: WD, z: z + 0.2, group: 'iruns', outline: false, line: 'none' }, px);
  d.circle({ mat: IR, z: z + 0.25, group: 'iboss' }, c, r * 0.24);
}

/** The horned helmet in an icon, over the skull's face. */
function iconHelm(d: Draw, c: V, s: number, z: number) {
  const H = (x: number, y: number) => v(c.x + x * s, c.y + y * s);
  d.ellipse({ mat: BN, z, group: 'iskull' }, H(0.6, -1.2), 5.4 * s, 5.2 * s, 0);
  d.ellipse({ mat: BN, z: z + 0.1, group: 'isock', flat: 0, line: 'none' }, H(2.0, -1.2), 1.7 * s, 1.8 * s, 0);
  d.ellipse({ mat: BN, z: z + 0.1, group: 'isockF', flat: 0, line: 'none' }, H(-2.2, -1.2), 1.5 * s, 1.7 * s, 0);
  d.pixels({ mat: BN, z: z + 0.2, group: 'isock' }, [{ p: H(2.0, -1.2), c: E.ashEye }, { p: H(-2.2, -1.2), c: E.ashEyeDim }]);
  d.poly({ mat: IR, z: z + 0.3, group: 'ihelm' }, [H(-6.4, 0.6), H(-5.8, 4.2), H(-2.8, 6.8), H(0.6, 7.4), H(4.0, 6.8), H(6.8, 4.2), H(7.4, 0.6)], { kind: 'dome', c: H(0.6, 3.4), r: 8 * s, bevel: 1.2 });
  d.ribbon({ mat: IR, z: z + 0.35, group: 'ihelmBand', shade: 1 }, [H(-6.6, 0.8), H(0.6, 0.6), H(7.6, 0.8)], [1, 1, 1].map((x) => x * s * 0.9));
  d.ribbon({ mat: HO, z: z + 0.4, group: 'ihornL', maxIdx: 4 }, [H(-5.6, 3.4), H(-9.4, 5.4), H(-11.4, 9.6), H(-10.2, 13.4)], [1.6, 1.3, 0.9, 0.4].map((x) => x * s));
  d.ribbon({ mat: HO, z: z + 0.4, group: 'ihornR', maxIdx: 4 }, [H(6.8, 3.4), H(10.6, 5.4), H(12.6, 9.6), H(11.4, 13.4)], [1.6, 1.3, 0.9, 0.4].map((x) => x * s));
}

export const irvingWellbington: ChampionArt = {
  char,
  iconBg: MAT.charcoal,
  icons: {
    shield_bash: () =>
      compose(MAT.charcoal, glyph((d) => {
        // the shield driven forward, face first
        iconShield(d, v(24, 20), 90, 13, 10, false);
      }), (b) => speedLines(b, [[2, 12, 8, 12], [1, 20, 7, 20], [3, 28, 9, 28]], E.white)),
    bulwark_slam: () =>
      compose(MAT.charcoal, glyph((d) => {
        // the shield's rim brought down
        iconShield(d, v(20, 23), 128, 12.5, 10, false);
      }), (b) => impactStar(b, 28, 33, 2, 8, 8, E.ashEyeDim, E.white)),
    old_grudge: () =>
      compose(MAT.charcoal, glyph((d) => {
        // the horned helmet over the skull, the light in its sockets
        iconHelm(d, v(20, 17), 1.25, 10);
      })),
  },
};
