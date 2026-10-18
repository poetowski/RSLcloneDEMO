// The Skeleton (docs/DESIGN_DECISIONS.md section 28, Jakub's brief of
// 2026-10-18): the first champion of the Ashveil Reign, a Common, Damage,
// Tide. The skeleton of a shorter human holding a rusty sword, no armour,
// strips of fabric round its neck bone: a basic troop, but a little fancy
// with that fabric. So he is built bone by bone, short and a little hunched:
// a skull with a jaw of its own and a pale light in its sockets, the neck's
// vertebrae, a ribcage you see through, the spine, the pelvis, the long bones
// of arms and legs with their knobbed ends, the forearm's and shin's paired
// bones, bony hands and feet. Round the neck two strips are wound, a charcoal
// one and a faded plum silk, knotted at the back, their frayed ends trailing
// and stirring as he moves, and from the knot hangs a small token: a white
// bone on dark grey, the Reign's standard. The sword is short and notched,
// its iron eaten by rust. He dies the way a skeleton does: his bones give way
// and fall into a heap, the skull rolling off on its own. The details the
// brief leaves open are first takes; nothing in the look comes from his
// affinity (affinities are abstract, Jakub, 2026-10-11).
import { armBones, BN, BoneSet, fallApart, legBones, skullFrame, trunkFrame, vertebrae } from '../bones.ts';
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { smear } from '../parts.ts';
import { add, at, D2R, dir, Dims, Draw, ease, lerpPose, lerpV, mul, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 31.5,
  thigh: 14,
  shin: 13.6,
  ankleH: 3,
  footLen: 5.6,
  spine: 19,
  neck: 7.6,
  upperArm: 10.8,
  foreArm: 9.8,
  shoulderDrop: 4.2,
  shoulderN: -2.2,
  shoulderF: 2.8,
  hipN: -1.5,
  hipF: 1.5,
};

const RU = MAT.rust, IR = MAT.iron, DL = MAT.darkleather, CH = MAT.charcoal, PL = MAT.plum;
const E = ACCENT;

/** The streak of his hack: dull and pale, the old iron's grey at its edge (the colour of the blade, not of an affinity). */
const SWING = { core: BN.ramp[5], edge: BN.ramp[3] };

/** Blade length from the hand: a short soldier's sword. */
const BLADE = 17;

// ---------------------------------------------------------------------------
// The bones, as placed this frame: from the solved skeleton while he stands,
// falling apart toward the heap while he dies (pose channel `heap`, 0..1)
// ---------------------------------------------------------------------------

interface Bones extends BoneSet {
  sword: number;
}

/** Where each bone comes to rest when he falls apart: the trunk on its back, the skull rolled forward, the limbs scattered, the sword flat. */
const HEAP: Bones = {
  pelvis: v(-3, 3.4), torso: 173,
  head: v(12, 5.8), headDir: 102,
  sN: v(2, 4.4), eN: v(9, 2.2), hN: v(15.5, 2),
  sF: v(-7, 6.2), eF: v(-13, 3.4), hF: v(-19, 2.2),
  hipN: v(-1, 3.4), kneeN: v(6, 5.4), ankN: v(12, 1.6), footN: -8,
  hipF: v(-4, 3), kneeF: v(-10, 4.8), ankF: v(-16, 1.6), footF: 186,
  sword: -4,
};

function bonesOf(s: Skel, heap: number): Bones {
  const P = s.pose.p;
  const alive: Bones = {
    pelvis: s.pelvis, torso: s.torso, head: s.head, headDir: s.headDir,
    sN: s.sN, eN: s.eN, hN: s.hN, sF: s.sF, eF: s.eF, hF: s.hF,
    hipN: s.hipN, kneeN: s.kneeN, ankN: s.ankN, footN: s.pose.footN,
    hipF: s.hipF, kneeF: s.kneeF, ankF: s.ankF, footF: s.pose.footF,
    sword: P.sword ?? -20,
  };
  return fallApart(alive, HEAP, heap);
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const B = bonesOf(s, P.heap ?? 0);
  const T = trunkFrame(B);
  const neck = T(D.spine, -0.4);
  const prevNeck = info.prev ? info.prev.neck : s.neck;

  // the cloth's tails trail behind everything
  scarfTails(d, B, neck, s.neck.x - prevNeck.x, P, 6);

  // far leg and far arm, a shade darker
  legBones(d, B.hipF, B.kneeF, B.ankF, B.footF, 10, -1, 'F');
  armBones(d, B.sF, B.eF, B.hF, 20, -1, 'F', 'claw');

  // the trunk: far ribs, spine, pelvis, near ribs, sternum, collar bones
  trunk(d, B, T);

  // the neck's vertebrae, the cloth wound round them, the skull
  vertebrae(d, neck, skullFrame(B)(-1.4, -3.1), 36);
  scarfWraps(d, B, neck, 41);
  token(d, B, neck, 41.5);
  skull(d, B, P.jaw ?? 0, 38);

  // near leg; the sword under the near hand, its smear; the near arm over the grip
  legBones(d, B.hipN, B.kneeN, B.ankN, B.footN, 50, 0, 'N');
  const prev = info.prev?.pose.p;
  if (info.def.smear && prev && prev.sword !== undefined) smear(d, B.hN, prev.sword, B.sword, BLADE + 3, 5, SWING, 57);
  rustySword(d, B.hN, B.sword, 58);
  armBones(d, B.sN, B.eN, B.hN, 60, 0, 'N', 'grip', B.sword);
}

/**
 * The trunk in its frame: the far ribs glimpsed through the near ones, the
 * spine with its vertebrae marked, the pelvis's bowl with its dark openings,
 * the near ribs curving from the spine to the breastbone (open at the bottom,
 * the lowest two floating), the breastbone and the collar bones.
 */
function trunk(d: Draw, B: Bones, T: (u: number, w: number) => V) {
  // far ribs, behind the spine's front and seen through the gaps
  for (let k = 0; k < 3; k++) {
    const u = 17.9 - k * 2.7 + 1.3;
    d.ribbon({ mat: BN, z: 27 + k * 0.01, group: 'farRib' + k, shade: -2, line: 'none' }, [T(u, -2.4), T(u - 0.3, 0.2), T(u - 1.2 - k * 0.2, 2.2)], [0.45, 0.5, 0.4]);
  }
  // the spine: lumbar and thoracic, each vertebra a knob
  d.capsule({ mat: BN, z: 29, group: 'spine', tex: (h) => (Math.floor(h.u * 9) % 2 ? -1 : 0) }, T(2.8, -1.4), T(19.4, -2.6), 1.25, 1.1);
  for (let k = 0; k < 4; k++) d.circle({ mat: BN, z: 29.1, group: 'lumbar' + k, line: 'soft' }, T(3.6 + k * 1.6, -1.6 - k * 0.12), 1.3);
  // the pelvis: a bowl of bone, lit at its crest, dark where it opens
  d.poly(
    { mat: BN, z: 31, group: 'pelvis' },
    [T(3.6, -3.1), T(4.3, -0.6), T(3.9, 2.6), T(2.4, 4.3), T(0.4, 3.9), T(-1.6, 2.8), T(-2.3, 0.6), T(-1.5, -1.6), T(0.9, -3.5)],
    { kind: 'dome', c: T(1.4, 0.3), r: 4.6, bevel: 0.8 },
  );
  d.ellipse({ mat: BN, z: 31.1, group: 'pelvisHole', flat: 0, line: 'none' }, T(-0.4, 1.8), 1.0, 0.75, B.torso);
  d.ellipse({ mat: BN, z: 31.1, group: 'pelvisHole2', flat: 1, line: 'none' }, T(1.5, -1.6), 0.7, 0.9, B.torso);
  // the near ribs: from the spine round to the front, the upper ones joining the breastbone
  for (let k = 0; k < 4; k++) {
    const u = 17.9 - k * 2.7;
    const floating = k === 3;
    const front = floating ? 2.6 : 4.3;
    d.ribbon(
      { mat: BN, z: 33 + k * 0.01, group: 'rib' + k, line: 'strong' },
      [T(u, -3.0), T(u + 0.2, -0.9), T(u - 0.6 - k * 0.15, 1.9), T(u - 1.9 - k * 0.35, front)],
      [0.5, 0.58, 0.55, 0.45],
    );
  }
  // the breastbone, wider at its head
  d.capsule({ mat: BN, z: 34, group: 'sternum' }, T(17.9, 4.3), T(12.6, 4.5), 1.15, 0.8);
  // collar bones out to the shoulders, the shoulders' knobs
  d.capsule({ mat: BN, z: 26.5, group: 'clavF', shade: -1, line: 'soft' }, T(18.3, 3.6), B.sF, 0.62, 0.6);
  d.capsule({ mat: BN, z: 34.2, group: 'clavN', line: 'soft' }, T(18.3, 4.0), B.sN, 0.66, 0.62);
}

/**
 * The skull: the cranium's dome with a crack in it, the face's bone, a dark
 * socket with a pale light in it (the far socket narrow beyond the nose), the
 * nose's hollow, the upper teeth, and the jaw on its own hinge (`jaw`, degrees
 * open).
 */
function skull(d: Draw, B: Bones, jaw: number, z: number) {
  const H = skullFrame(B);
  const ha = B.headDir - 90;
  d.ellipse({ mat: BN, z, group: 'skull' }, H(-0.8, 1.3), 5.5, 5.7, ha);
  d.poly(
    { mat: BN, z: z + 0.05, group: 'skull' },
    [H(-0.4, 3.2), H(3.6, 3.1), H(5.5, 1.6), H(6.0, -0.6), H(5.7, -2.2), H(4.6, -2.9), H(1.8, -2.9), H(-0.9, -1.6)],
    { kind: 'dome', c: H(1.4, 0.4), r: 6.6, bevel: 0.8 },
  );
  // a crack across the crown
  d.pixels({ mat: BN, z: z + 0.1, group: 'skull' }, [H(-2.6, 5.6), H(-1.9, 5.0), H(-1.6, 4.1), H(-0.8, 3.6)].map((p) => ({ p, c: BN.ramp[1] })));
  // the sockets: dark hollows; in the near one a pale light
  d.ellipse({ mat: BN, z: z + 0.15, group: 'socket', flat: 0, line: 'none' }, H(2.6, 0.7), 1.85, 2.0, ha);
  d.ellipse({ mat: BN, z: z + 0.15, group: 'socketF', flat: 0, line: 'none' }, H(5.2, 0.6), 0.65, 1.5, ha);
  d.pixels({ mat: BN, z: z + 0.2, group: 'socket' }, [{ p: H(3.0, 0.6), c: E.ashEye }, { p: H(2.9, -0.4), c: E.ashEyeDim }]);
  // the nose's hollow, the cheekbone under the socket
  d.pixels({ mat: BN, z: z + 0.2, group: 'skull' }, [{ p: H(5.0, -1.2), c: BN.ramp[0] }, { p: H(5.4, -1.2), c: BN.ramp[0] }, { p: H(5.1, -1.8), c: BN.ramp[1] }, { p: H(2.6, -1.6), c: BN.ramp[4] }, { p: H(3.6, -1.6), c: BN.ramp[4] }]);
  // the upper teeth
  d.pixels({ mat: BN, z: z + 0.2, group: 'skull' }, [1.9, 2.9, 3.9, 4.9].flatMap((x, i) => [{ p: H(x, -2.8), c: BN.ramp[i % 2 ? 4 : 5] }, { p: H(x + 0.5, -2.8), c: BN.ramp[1] }]));
  // the jaw, turning on its hinge under the ear
  const hx = -0.3, hy = -1.4;
  const c = Math.cos(-jaw * D2R), s = Math.sin(-jaw * D2R);
  const J = (x: number, y: number) => H(hx + (x - hx) * c - (y - hy) * s, hy + (x - hx) * s + (y - hy) * c);
  d.poly(
    { mat: BN, z: z - 0.05, group: 'jaw' },
    [J(-1.4, -0.6), J(-0.9, -2.8), J(1.2, -4.5), J(4.4, -4.6), J(5.5, -3.9), J(5.4, -3.1), J(2.0, -3.1), J(0.4, -2.2)],
    { kind: 'dome', c: J(2.2, -3.0), r: 4.4, bevel: 0.6 },
  );
  d.pixels({ mat: BN, z: z - 0.04, group: 'jaw' }, [2.3, 3.3, 4.3].flatMap((x, i) => [{ p: J(x, -3.2), c: BN.ramp[i % 2 ? 4 : 5] }, { p: J(x + 0.5, -3.2), c: BN.ramp[1] }]));
}

// ---------------------------------------------------------------------------
// The cloth at his neck: two strips wound round it, a knot at the back,
// their frayed ends trailing, the Reign's token hanging from the knot
// ---------------------------------------------------------------------------

/** The strips' hang this frame: down and back, blown back by the run (`wind`), dragged by the travel since the last frame, stirring (`wave`). */
function tailPath(knot: V, len: number, n: number, ang0: number, wave: number, amp: number, seed: number): V[] {
  const pts: V[] = [knot];
  let p = knot, a = ang0;
  for (let k = 1; k <= n; k++) {
    a += Math.sin(wave + k * 0.9 + seed) * amp * (k / n) - 4;
    p = at(p, a, len / n);
    // lying on the ground, the cloth stays on it
    if (p.y < 0.6) p = v(p.x - Math.abs(p.y - 0.6) * 0.6, 0.6);
    pts.push(p);
  }
  return pts;
}

function knotOf(B: Bones, neck: V): V {
  const T = trunkFrame(B);
  return add(lerpV(neck, T(D.spine - 0.6, 0), 0.5), mul(dir(B.torso + 90), 2.7));
}

function scarfTails(d: Draw, B: Bones, neck: V, travel: number, P: Record<string, number>, z: number) {
  const knot = knotOf(B, neck);
  const wind = P.wind ?? 0, wave = P.wave ?? 0;
  const lying = (P.heap ?? 0) > 0.6;
  const base = lying ? 186 : -112 - wind * 52 - Math.max(-28, Math.min(28, travel * 6));
  const amp = lying ? 2 : 7 + wind * 6;
  // the charcoal strip: longer, its end split into threads
  const a = tailPath(knot, 17, 6, base, wave, amp, 0.4);
  d.ribbon({ mat: CH, z, group: 'tailC', line: 'soft' }, a, [1.9, 1.8, 1.7, 1.5, 1.3, 1.1, 0.8]);
  const endA = a[a.length - 1], dirA = Math.atan2(endA.y - a[a.length - 2].y, endA.x - a[a.length - 2].x) / D2R;
  for (const da of [-18, 14]) d.line({ mat: CH, z: z + 0.01, group: 'tailC' }, endA, at(endA, dirA + da, 2.2), CH.ramp[2]);
  // the plum silk: shorter, a fringe at its end
  const b = tailPath(add(knot, v(0.6, -0.4)), 13.5, 5, base + 12, wave + 1.3, amp * 0.9, 1.7);
  d.ribbon({ mat: PL, z: z + 0.5, group: 'tailP', line: 'soft' }, b, [1.7, 1.6, 1.45, 1.25, 1.0, 0.8]);
  const endB = b[b.length - 1], dirB = Math.atan2(endB.y - b[b.length - 2].y, endB.x - b[b.length - 2].x) / D2R;
  for (const da of [-24, 0, 22]) d.line({ mat: PL, z: z + 0.51, group: 'tailP' }, endB, at(endB, dirB + da, 1.6), PL.ramp[4]);
}

/**
 * The token at the front of the wraps, over the breastbone: a pennant of dark
 * grey cloth with a white bone across it, the Reign's standard, hanging from
 * the knotted cloth like a soldier's badge.
 */
function token(d: Draw, B: Bones, neck: V, z: number) {
  const T = trunkFrame(B);
  const top = T(D.spine - 1.6, 3.6);
  // it hangs straight down while he stands; lying, it lies on his ribs
  const f = d.frame(top, B.torso > 45 ? 0 : B.torso - 90);
  d.poly({ mat: CH, z, group: 'token', shade: -1 }, [f(-2, 0.4), f(2, 0.4), f(2, -3.4), f(0, -4.4), f(-2, -3.4)], { kind: 'flat', n: [0, 0, 1] });
  // the bone: a shaft of three pixels, a knob at each end
  d.pixels({ mat: CH, z: z + 0.1, group: 'token' }, [
    { p: f(-0.9, -1.6), c: BN.ramp[5] }, { p: f(0.1, -1.6), c: BN.ramp[4] }, { p: f(1.1, -1.6), c: BN.ramp[4] },
    { p: f(-1.7, -1.1), c: BN.ramp[5] }, { p: f(-1.7, -2.1), c: BN.ramp[4] }, { p: f(1.9, -1.1), c: BN.ramp[4] }, { p: f(1.9, -2.1), c: BN.ramp[3] },
  ]);
  void neck;
}

/** The strips wound round the neck: a charcoal band low, the plum one above it, each a little askew. */
function scarfWraps(d: Draw, B: Bones, neck: V, z: number) {
  const H = skullFrame(B);
  const top = H(-1.4, -3.1);
  const axis = Math.atan2(top.y - neck.y, top.x - neck.x) / D2R;
  const band = (t: number, tilt: number, mat: typeof CH, zz: number, w: number) => {
    const c = lerpV(neck, top, t);
    const a = axis + 90 + tilt;
    d.capsule({ mat, z: zz, group: 'wrap' + zz, tex: (h) => (Math.sin(h.u * 9) > 0.6 ? -1 : 0) }, at(c, a, -w), at(c, a, w * 0.9), 1.7, 1.55, 0.25);
  };
  band(-0.32, 8, CH, z, 3.6);
  band(0.0, -10, PL, z + 0.1, 3.1);
  // the knot at the back
  d.ellipse({ mat: PL, z: z + 0.2, group: 'knot', line: 'soft' }, knotOf(B, neck), 1.8, 1.4, B.torso);
}

// ---------------------------------------------------------------------------
// The rusty sword: short, notched, its iron eaten by rust
// ---------------------------------------------------------------------------

/** Rust on the blade, in blade coordinates (u along it from the hand, w across), so it stays put as the blade turns. */
const RUST_SPOTS: [number, number, number][] = [
  [4.2, 0.6, 3], [5.0, -0.6, 2], [7.4, 0.9, 4], [8.6, -0.2, 3], [9.3, 0.7, 2], [11.8, -0.8, 3], [12.6, 0.4, 4], [14.4, 0.1, 2], [6.2, 0.2, 1], [10.6, -0.9, 1],
];

function rustySword(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  const g = 'sword';
  // a rotten leather grip, an iron pommel, a short guard bent at one end
  d.capsule({ mat: DL, z, group: g, tex: (h) => (Math.floor(h.u * 4) % 2 ? -1 : 0) }, f(-3.4, 0), f(1.8, 0), 1.0, 1.0);
  d.circle({ mat: IR, z: z + 0.05, group: g }, f(-4.3, 0), 1.35);
  // the blade: the cutting edge (w > 0) notched twice, the tip worn blunt
  d.poly(
    { mat: IR, z: z + 0.1, group: g },
    [f(2.6, -1.35), f(14, -1.2), f(16.6, -0.5), f(BLADE, 0.4), f(15.2, 1.35), f(11.6, 1.45), f(10.8, 0.6), f(10.0, 1.45), f(6.8, 1.5), f(6.2, 0.75), f(5.5, 1.5), f(2.6, 1.45)],
    { kind: 'cyl', a: f(2.6, 0), b: f(BLADE, 0), r: 1.9 },
  );
  // the rust: flakes over the iron, a stain where it was held, the fuller dark
  d.line({ mat: IR, z: z + 0.12, group: g }, f(3.4, 0), f(12.5, -0.1), IR.ramp[1]);
  d.pixels({ mat: IR, z: z + 0.15, group: g }, RUST_SPOTS.map(([u, w, k]) => ({ p: f(u, w), c: RU.ramp[k] })));
  d.capsule({ mat: IR, z: z + 0.2, group: g }, f(2.5, -2.4), f(2.3, 2.3), 0.85, 0.75);
  d.pixels({ mat: IR, z: z + 0.21, group: g }, [{ p: f(2.4, 2.6), c: RU.ramp[3] }, { p: f(2.5, -2.2), c: RU.ramp[2] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the sword angle is absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 82,
  head: 86,
  legN: { ik: v(-8, 3) },
  legF: { ik: v(7, 3) },
  armN: { ik: v(9, 23.5), bend: -1 },
  armF: { up: -72, lo: -58 },
  p: { sword: -22, jaw: 0, wave: 0, wind: 0 },
});

/** Idle: a slow rattle of a breath he does not take, the skull nodding, the jaw clicking once, the strips stirring. */
function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 82 - b,
    head: 86 + b * 3,
    armN: { ik: v(9, 23.5 - b), bend: -1 },
    armF: { up: -72 + b * 3, lo: -58 + b * 2 },
    p: { sword: -22 - b * 3, jaw: b * 4, wave: a, wind: 0 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -10.5 * Math.cos(ph), y: 3 + (sn > 0 ? 6.5 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 2.5,
    torso: 70,
    head: 80 + bob * 2,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { ik: v(10 + sw * 2, 26 + bob), bend: -1 },
    armF: { up: -76 - sw * 30, lo: -46 - sw * 30 },
    p: { sword: -8 + sw * 6, jaw: 6, wave: a * 2, wind: 0.85 },
  });
}

// Rusty Hack: the sword goes up over his shoulder, then hacks down through the target.
const RH_WIND = pose({
  x: -3, y: -1, torso: 96, head: 96,
  legN: { ik: v(-10, 3) }, legF: { ik: v(7, 3) },
  armN: { up: 128, lo: 154 }, armF: { up: -66, lo: -30 },
  p: { sword: 150, jaw: 14, wave: 1, wind: 0.2 },
});
/** The sword over his head on its way down: an authored frame, since a blend of the two poses turns the forearm back the short way round. */
const RH_OVER = pose({
  x: 1, y: -2, torso: 86, head: 86,
  legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 86, lo: 60 }, armF: { up: -100, lo: -78 },
  p: { sword: 56, jaw: 16, wave: 1.7, wind: 0.4 },
});
const RH_HACK = pose({
  x: 7, y: -4, torso: 64, head: 72,
  legN: { ik: v(-9, 3) }, legF: { ik: v(12, 3) },
  armN: { up: -14, lo: -42 }, armF: { up: -140, lo: -120 },
  p: { sword: -46, jaw: 18, wave: 2.4, wind: 0.6 },
});
const RH_FOLLOW = tweak(RH_HACK, { x: 8, torso: 62, head: 70, armN: { up: -30, lo: -62 }, p: { sword: -70, jaw: 8, wave: 3.2, wind: 0.4 } });

const HURT = pose({
  x: -4, y: -1, torso: 102, head: 114,
  legN: { ik: v(-11, 3) }, legF: { ik: v(7, 4) }, footF: 10,
  armN: { ik: v(4, 30), bend: -1 }, armF: { up: -50, lo: 10 },
  p: { sword: 30, jaw: 22, wave: 2, wind: 0.5 },
});
/** His bones give way: the knees fold, the trunk sags, then everything falls into a heap. */
const BUCKLE = pose({
  x: 1, y: -9, torso: 70, head: 50,
  legN: { ik: v(-11, 3) }, legF: { ik: v(8, 3) }, footN: -40,
  armN: { up: -70, lo: -80 }, armF: { up: -90, lo: -100 },
  p: { sword: -60, jaw: 26, wave: 3, wind: 0.2, heap: 0 },
});
const HEAPED = (k: number, y = 0) => tweak(BUCKLE, { y: -9 + y, p: { heap: k, jaw: 26 - k * 20, wave: 3 + k, wind: 0 } });

// Victory: the sword raised, the skull thrown back, the jaw clacking in a rattling laugh.
const RAISE = pose({
  y: -1, torso: 88, head: 102,
  legN: { ik: v(-9, 3) }, legF: { ik: v(8, 3) },
  armN: { up: 64, lo: 82 }, armF: { up: -96, lo: -76 },
  p: { sword: 84, jaw: 0, wave: 1.5, wind: 0 },
});
const laugh = (open: boolean) => tweak(RAISE, { head: open ? 106 : 100, p: { jaw: open ? 20 : 2 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'skeleton',
  name: 'Skeleton',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 150, idle) },
    run: { loop: true, frames: cycle(8, 70, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RH_WIND, 1, 70),
        ...keys([
          [RH_WIND, 150],
          [RH_OVER, 40],
          [RH_HACK, 70, { smear: true, hit: true }],
          [RH_FOLLOW, 190],
        ]),
        ...tween(D, RH_FOLLOW, IDLE, 2, 90, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 98, head: 108, p: { jaw: 12 } }), 110],
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
        ...tween(D, IDLE, RAISE, 2, 90, ease.out),
        ...keys([
          [laugh(true), 110],
          [laugh(false), 110],
          [laugh(true), 110],
          [laugh(false), 110],
          [laugh(true), 110],
          [RAISE, 500],
          [mid(RAISE, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/** The rusty sword in an icon: the sprite's sword, scaled up for 40x40. */
function iconSword(d: Draw, hilt: V, ang: number, z: number, len = 26) {
  const f = d.frame(hilt, ang);
  const g = 'isword' + z;
  d.capsule({ mat: DL, z, group: g, tex: (h) => (Math.floor(h.u * 5) % 2 ? -1 : 0) }, f(-5, 0), f(2.4, 0), 1.6, 1.6);
  d.circle({ mat: IR, z: z + 0.05, group: g }, f(-6.4, 0), 2.1);
  const k = len / BLADE;
  d.poly(
    { mat: IR, z: z + 0.1, group: g },
    [f(3.6, -2.3), f(len - 4, -2.1), f(len - 0.6, -0.8), f(len, 0.7), f(len - 2.6, 2.3), f(11.6 * k, 2.4), f(10.8 * k, 1.0), f(10 * k, 2.4), f(6.8 * k, 2.5), f(6.2 * k, 1.2), f(5.5 * k, 2.5), f(3.6, 2.4)],
    { kind: 'cyl', a: f(3.6, 0), b: f(len, 0), r: 3 },
  );
  d.pixels({ mat: IR, z: z + 0.15, group: g }, RUST_SPOTS.flatMap(([u, w, c]) => [{ p: f(u * k, w * 1.6), c: RU.ramp[c] }, { p: f(u * k + 1, w * 1.6), c: RU.ramp[Math.max(1, c - 1)] }]));
  d.capsule({ mat: IR, z: z + 0.2, group: g }, f(3.4, -3.8), f(3.1, 3.6), 1.3, 1.2);
}

/** A skull in an icon: the sprite's skull, larger. */
function iconSkull(d: Draw, c: V, scale: number, z: number) {
  const H = (x: number, y: number) => v(c.x + x * scale, c.y + y * scale);
  d.ellipse({ mat: BN, z, group: 'iskull' }, H(-0.8, 1.3), 5.5 * scale, 5.7 * scale, 0);
  d.poly({ mat: BN, z: z + 0.05, group: 'iskull' }, [H(-0.4, 3.2), H(3.6, 3.1), H(5.5, 1.6), H(6.0, -0.6), H(5.7, -2.2), H(4.6, -2.9), H(1.8, -2.9), H(-0.9, -1.6)], { kind: 'dome', c: H(1.4, 0.4), r: 6.6 * scale, bevel: 1 });
  d.ellipse({ mat: BN, z: z + 0.15, group: 'isocket', flat: 0, line: 'none' }, H(2.5, 0.5), 1.55 * scale, 1.75 * scale, 0);
  d.ellipse({ mat: BN, z: z + 0.15, group: 'isocketF', flat: 0, line: 'none' }, H(5.1, 0.5), 0.6 * scale, 1.4 * scale, 0);
  d.poly({ mat: BN, z: z - 0.05, group: 'ijaw' }, [H(-1.4, -0.6), H(-0.9, -2.8), H(1.2, -4.5), H(4.4, -4.6), H(5.5, -3.9), H(5.4, -3.1), H(2.0, -3.1), H(0.4, -2.2)], { kind: 'dome', c: H(2.2, -3.0), r: 4.4 * scale, bevel: 0.8 });
  const px: { p: V; c: RGBA }[] = [];
  for (let i = 0; i < 4; i++) px.push({ p: H(1.9 + i, -2.8), c: BN.ramp[i % 2 ? 4 : 5] }, { p: H(2.4 + i, -2.8), c: BN.ramp[1] });
  px.push({ p: H(2.8, 0.5), c: E.ashEye }, { p: H(3.1, 0.5), c: E.ashEye }, { p: H(2.8, 0.1), c: E.ashEyeDim }, { p: H(5.0, -1.3), c: BN.ramp[0] }, { p: H(5.3, -1.3), c: BN.ramp[0] });
  d.pixels({ mat: BN, z: z + 0.2, group: 'iskull' }, px);
}

export const skeleton: ChampionArt = {
  char,
  iconBg: PL,
  icons: {
    rusty_hack: () =>
      compose(PL, glyph((d) => {
        // the hack: the sword come down, its streak behind it, flakes of rust where it bites
        smear(d, v(9, 30), 150, -38, 26, 8, SWING, 1);
        iconSword(d, v(9, 30), -40, 10, 28);
      }), (b) => {
        for (const [x, y, c] of [[30, 29, 4], [33, 27, 3], [35, 31, 4], [31, 33, 2], [28, 26, 3], [36, 24, 2]] as const) b.set(x, y, RU.ramp[c]);
      }),
    bare_bones: () =>
      compose(PL, glyph((d) => {
        // the skull, a curse sliding off it: a pale ring broken where it was turned aside
        iconSkull(d, v(18, 19), 2.1, 10);
      }), (b) => {
        for (let k = 0; k < 64; k++) {
          const a = (k / 64) * Math.PI * 2;
          if (Math.cos(a - 0.6) > 0.55) continue;
          const x = Math.round(20 + Math.cos(a) * 15), y = Math.round(20 + Math.sin(a) * 15);
          b.set(x, y, k % 3 ? E.ashEyeDim : E.ashEye);
        }
      }),
  },
};
