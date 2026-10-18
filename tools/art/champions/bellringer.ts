// The Bellringer (docs/DESIGN_DECISIONS.md section 30, Jakub's brief of
// 2026-10-18): the Ashveil Reign's third champion, a Common, Support, Bloom.
// A very tall skeleton with no weapon, whose role is to see the enemy coming
// and ring his big golden bell, fixed straight onto one of his arms; slim,
// tall, with no lower jaw; boots, so he is not barefoot. So he is built bone
// by bone like the Skeleton (tools/art/bones.ts), but long and thin, the
// tallest of the roster: a narrow ribcage on a long spine, a long neck, long
// arms and legs; a gaunt skull with no jaw, its upper teeth hanging over
// nothing, a pale light in its socket. He keeps watch: he stands tall, his
// head craned forward, peering ahead, the bell held out before him like a
// lantern. In place of his near hand an iron collar is clamped round the
// bones, and the bell hangs from it on its crown, an iron clapper inside. Old
// boots of dark leather, too wide for the bones in them, their tops turned
// down. Warning Toll: he points the enemy out with his free hand and tolls the
// bell twice, swinging it out before him. He dies
// the way a skeleton does: his bones give way and fall into a heap, the bell
// dropping on its side beside it. Everything the brief leaves open is a first
// take; nothing in the look comes from his affinity (affinities are abstract,
// Jakub, 2026-10-11).
//
// Pose channels: `bell` turns the bell on its collar off the line of the
// forearm (degrees), `clap` swings the clapper inside it (degrees), `heap`
// lets the bones fall apart (0..1).
import { armBones, BN, BoneSet, fallApart, legBones, skullFrame, trunkFrame, vertebrae } from '../bones.ts';
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, D2R, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 45,
  thigh: 21,
  shin: 20.5,
  ankleH: 3.5,
  footLen: 7,
  spine: 26,
  neck: 10,
  upperArm: 16,
  foreArm: 15,
  shoulderDrop: 5,
  shoulderN: -2.5,
  shoulderF: 3,
  hipN: -1.8,
  hipF: 1.8,
};

const GO = MAT.gold, IR = MAT.iron, DL = MAT.darkleather, LE = MAT.leather, CH = MAT.charcoal;
const E = ACCENT;

/** The ribs: the topmost's height up the spine and the step down to the next. */
const RIB_TOP = 23.6, RIB_GAP = 2.75;

/** The bell's profile from its crown (the end of the forearm) to its lip: [along the axis, half-width]. */
const BELL: [number, number][] = [[0, 2.2], [1.2, 3.6], [2.6, 4.3], [5.5, 4.5], [8.5, 4.9], [11, 5.8], [13, 6.9], [14.4, 7.5], [15, 7.3]];
const BELL_LEN = 15;

// ---------------------------------------------------------------------------
// The bones, as placed this frame: from the solved skeleton while he stands,
// falling apart toward the heap while he dies (pose channel `heap`)
// ---------------------------------------------------------------------------

interface Bones extends BoneSet {
  /** the bell's axis from crown to mouth (absolute: -90 hangs it mouth down) */
  bell: number;
}

/** Where each bone comes to rest when he falls apart: the trunk on its back, the skull rolled forward, the long limbs scattered, the bell on its side. */
const HEAP: Bones = {
  pelvis: v(-4, 3.4), torso: 174,
  head: v(13, 5.8), headDir: 100,
  sN: v(3, 4.4), eN: v(15, 2.6), hN: v(24, 4.4),
  sF: v(-10, 6), eF: v(-19, 3), hF: v(-29, 2.2),
  hipN: v(-2, 3.4), kneeN: v(9, 5.4), ankN: v(19, 3.6), footN: -6,
  hipF: v(-5, 3), kneeF: v(-15, 4.6), ankF: v(-25, 3.6), footF: 186,
  bell: 13,
};

function bonesOf(s: Skel, heap: number): Bones {
  const P = s.pose.p;
  const alive: Bones = {
    pelvis: s.pelvis, torso: s.torso, head: s.head, headDir: s.headDir,
    sN: s.sN, eN: s.eN, hN: s.hN, sF: s.sF, eF: s.eF, hF: s.hF,
    hipN: s.hipN, kneeN: s.kneeN, ankN: s.ankN, footN: s.pose.footN,
    hipF: s.hipF, kneeF: s.kneeF, ankF: s.ankF, footF: s.pose.footF,
    bell: s.loN + (P.bell ?? 0),
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
  void info;

  // far leg in its boot, far arm, a shade darker
  legBones(d, B.hipF, B.kneeF, B.ankF, B.footF, 10, -1, 'F', false);
  boot(d, B.kneeF, B.ankF, B.footF, 12, -1, 'F');
  armBones(d, B.sF, B.eF, B.hF, 20, -1, 'F', 'claw');

  // the trunk, the long neck, the skull
  trunk(d, B, T);
  vertebrae(d, neck, skullFrame(B)(-1.2, -3.4), 36, 5);
  skull(d, B, 38);

  // near leg in its boot; the near arm, and the bell in place of its hand
  legBones(d, B.hipN, B.kneeN, B.ankN, B.footN, 50, 0, 'N', false);
  boot(d, B.kneeN, B.ankN, B.footN, 52, 0, 'N');
  armBones(d, B.sN, B.eN, B.hN, 60, 0, 'N', 'none');
  bell(d, B.eN, B.hN, B.bell, P.clap ?? 0, 62);
}

/**
 * The trunk in its frame, long and narrow: the far ribs glimpsed through the
 * near ones, the spine with its vertebrae marked, a narrow pelvis, five near
 * ribs (the lowest floating), the breastbone and the collar bones.
 */
function trunk(d: Draw, B: Bones, T: (u: number, w: number) => V) {
  for (let k = 0; k < 4; k++) {
    const u = RIB_TOP - k * RIB_GAP + 1.3;
    d.ribbon({ mat: BN, z: 27 + k * 0.01, group: 'farRib' + k, shade: -2, line: 'none' }, [T(u, -2.2), T(u - 0.3, 0.2), T(u - 1.2 - k * 0.2, 2.0)], [0.45, 0.5, 0.4]);
  }
  d.capsule({ mat: BN, z: 29, group: 'spine', tex: (h) => (Math.floor(h.u * 12) % 2 ? -1 : 0) }, T(2.8, -1.3), T(D.spine + 0.4, -2.4), 1.2, 1.05);
  for (let k = 0; k < 5; k++) d.circle({ mat: BN, z: 29.1, group: 'lumbar' + k, line: 'soft' }, T(3.6 + k * 1.7, -1.5 - k * 0.1), 1.25);
  d.poly(
    { mat: BN, z: 31, group: 'pelvis' },
    [T(3.8, -2.8), T(4.4, -0.6), T(4.0, 2.3), T(2.5, 3.8), T(0.4, 3.5), T(-1.6, 2.5), T(-2.3, 0.6), T(-1.5, -1.5), T(0.9, -3.2)],
    { kind: 'dome', c: T(1.4, 0.3), r: 4.4, bevel: 0.8 },
  );
  d.ellipse({ mat: BN, z: 31.1, group: 'pelvisHole', flat: 0, line: 'none' }, T(-0.4, 1.7), 0.95, 0.7, B.torso);
  d.ellipse({ mat: BN, z: 31.1, group: 'pelvisHole2', flat: 1, line: 'none' }, T(1.5, -1.5), 0.65, 0.85, B.torso);
  for (let k = 0; k < 5; k++) {
    const u = RIB_TOP - k * RIB_GAP;
    const front = k === 4 ? 2.2 : 3.9;
    d.ribbon(
      { mat: BN, z: 33 + k * 0.01, group: 'rib' + k, line: 'strong' },
      [T(u, -2.8), T(u + 0.2, -0.8), T(u - 0.6 - k * 0.12, 1.7), T(u - 1.8 - k * 0.3, front)],
      [0.5, 0.58, 0.55, 0.45],
    );
  }
  d.capsule({ mat: BN, z: 34, group: 'sternum' }, T(RIB_TOP, 3.9), T(RIB_TOP - 7, 4.1), 1.1, 0.75);
  d.capsule({ mat: BN, z: 26.5, group: 'clavF', shade: -1, line: 'soft' }, T(RIB_TOP + 0.4, 3.3), B.sF, 0.62, 0.6);
  d.capsule({ mat: BN, z: 34.2, group: 'clavN', line: 'soft' }, T(RIB_TOP + 0.4, 3.7), B.sN, 0.66, 0.62);
}

/**
 * The skull, gaunt and high, with no lower jaw: the cranium, the face's bone
 * ending in the upper teeth over nothing, the empty hinge where the jaw hung,
 * a dark socket with a pale light in it (the far one narrow beyond the nose),
 * the nose's hollow.
 */
function skull(d: Draw, B: Bones, z: number) {
  const H = skullFrame(B);
  const ha = B.headDir - 90;
  d.ellipse({ mat: BN, z, group: 'skull' }, H(-1.0, 2.3), 5.1, 5.5, ha);
  d.poly(
    { mat: BN, z: z + 0.05, group: 'skull' },
    [H(-0.6, 3.5), H(3.4, 3.4), H(5.4, 2.0), H(6.0, -0.4), H(5.8, -2.0), H(5.0, -2.8), H(2.2, -2.9), H(0.6, -2.2), H(-1.6, -1.6), H(-3.4, -1.2)],
    { kind: 'dome', c: H(1.4, 0.6), r: 6.6, bevel: 0.8 },
  );
  d.ellipse({ mat: BN, z: z + 0.15, group: 'socket', flat: 0, line: 'none' }, H(2.6, 0.9), 1.85, 2.0, ha);
  d.ellipse({ mat: BN, z: z + 0.15, group: 'socketF', flat: 0, line: 'none' }, H(5.2, 0.8), 0.65, 1.5, ha);
  d.pixels({ mat: BN, z: z + 0.2, group: 'socket' }, [{ p: H(3.0, 0.8), c: E.ashEye }, { p: H(2.9, -0.2), c: E.ashEyeDim }]);
  const px: { p: V; c: RGBA }[] = [];
  // the nose's hollow, the cheekbone under the socket, the empty hinge behind it
  px.push({ p: H(5.0, -1.0), c: BN.ramp[0] }, { p: H(5.4, -1.0), c: BN.ramp[0] }, { p: H(5.1, -1.6), c: BN.ramp[1] });
  px.push({ p: H(2.4, -1.4), c: BN.ramp[4] }, { p: H(3.4, -1.4), c: BN.ramp[4] }, { p: H(-0.3, -1.6), c: BN.ramp[0] }, { p: H(0.2, -2.1), c: BN.ramp[1] });
  // the upper teeth, long, one gone: there is no jaw for them to meet
  for (const [x, l] of [[1.4, 2], [2.6, 3], [3.8, 2], [5.2, 2]] as const) {
    for (let k = 0; k < l; k++) px.push({ p: H(x, -3.1 - k * 0.9), c: BN.ramp[k ? 4 : 5] });
    px.push({ p: H(x + 0.6, -3.2), c: BN.ramp[0] });
  }
  d.pixels({ mat: BN, z: z + 0.2, group: 'skull' }, px);
}

// ---------------------------------------------------------------------------
// The boots: old, of dark leather, too wide for the bones in them
// ---------------------------------------------------------------------------

function boot(d: Draw, knee: V, ank: V, footAng: number, z: number, shade: number, side: string) {
  const g = 'boot' + side;
  const shinAng = Math.atan2(ank.y - knee.y, ank.x - knee.x) / D2R;
  const top = at(ank, shinAng, -8.5);
  // the shaft, loose round the shin's bones, creased
  d.capsule({ mat: DL, z, group: g, shade, tex: (h) => (Math.sin(h.u * 8 + h.v * 2) > 0.72 ? -1 : 0) }, top, ank, 2.1, 2.0);
  // the foot: heel, instep, a round worn toe
  const f = d.frame(ank, footAng);
  d.poly({ mat: DL, z: z + 0.05, group: g, shade }, [f(-2.2, 1.6), f(-2.9, -1.6), f(-2.6, -3.5), f(5.6, -3.5), f(7.0, -2.9), f(6.8, -1.7), f(4.8, -0.5), f(2.0, 1.6)], { kind: 'bevel', w: 1.4 });
  d.line({ mat: DL, z: z + 0.08, group: g }, f(-2.4, -3.4), f(6.4, -3.4), DL.ramp[0]);
  // a strap over the instep, its iron buckle
  d.line({ mat: DL, z: z + 0.1, group: g }, f(1.2, 1.4), f(3.2, -1.2), DL.ramp[1]);
  d.pixels({ mat: DL, z: z + 0.12, group: g }, [{ p: f(2.2, 0.2), c: IR.ramp[4] }]);
  // the top turned down in a cuff, paler where the leather is turned
  d.capsule({ mat: LE, z: z + 0.15, group: g + 'cuff', shade, line: 'soft' }, at(top, shinAng + 90, 2.4), at(top, shinAng - 90, 2.4), 1.1, 1.0);
}

// ---------------------------------------------------------------------------
// The bell: gold, in place of his near hand
// ---------------------------------------------------------------------------

/**
 * The golden bell fixed to the end of his forearm: an iron collar clamped
 * round the bones where the hand was, the bell's crown hung on it so it can
 * swing; the shoulder, the waist, the flare to the lip with its sound bow,
 * the dark of the mouth and the iron clapper inside it (`clap`, degrees off
 * the axis). `ang` is the bell's axis from crown to mouth.
 */
function bell(d: Draw, elbow: V, wrist: V, ang: number, clap: number, z: number) {
  const lo = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) / D2R;
  const w = d.frame(wrist, lo);
  // the collar round the end of the forearm, two rivets on it
  d.capsule({ mat: IR, z: z + 0.2, group: 'collar' }, w(-2.4, 0), w(0.4, 0), 1.5, 1.6);
  d.pixels({ mat: IR, z: z + 0.22, group: 'collar' }, [{ p: w(-1.6, 0.8), c: IR.ramp[5] }, { p: w(-0.2, 0.8), c: IR.ramp[4] }]);
  const crown = at(wrist, ang, 1.4);
  const f = d.frame(crown, ang);
  const outline = [...BELL.map(([x, w]) => f(x, w)), ...[...BELL].reverse().map(([x, w]) => f(x, -w))];
  d.poly({ mat: GO, z, group: 'bell' }, outline, { kind: 'cyl', a: f(0, 0), b: f(BELL_LEN, 0), r: 7.4 });
  // the bands: two at the shoulder, the sound bow by the lip
  d.line({ mat: GO, z: z + 0.05, group: 'bell' }, f(3.2, 4.1), f(3.2, -4.1), GO.ramp[2]);
  d.line({ mat: GO, z: z + 0.05, group: 'bell' }, f(12.6, 6.6), f(12.6, -6.6), GO.ramp[2]);
  d.line({ mat: GO, z: z + 0.06, group: 'bell' }, f(13.4, 6.9), f(13.4, -6.9), GO.ramp[4]);
  // the mouth, and the clapper's iron ball inside it
  d.ellipse({ mat: GO, z: z + 0.1, group: 'bellMouth', flat: 0, line: 'none' }, f(BELL_LEN - 0.5, 0), 1.0, 6.4, ang);
  const ball = at(f(1.5, 0), ang + clap, BELL_LEN - 3.4);
  d.circle({ mat: IR, z: z + 0.12, group: 'clapper', line: 'none' }, ball, 1.4);
  // the crown's iron loop over the collar's pin
  d.capsule({ mat: IR, z: z + 0.15, group: 'crown' }, f(-0.4, 1.4), f(-0.4, -1.4), 0.9, 0.9);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 82,
  head: 74,
  legN: { ik: v(-5, 3.5) },
  legF: { ik: v(6, 3.5) },
  armN: { up: -72, lo: -4 },
  armF: { up: -86, lo: -80 },
  p: { bell: -86, clap: 0 },
});

/** Idle: he keeps watch, his head craned forward, peering ahead and lifting a little as he looks; the bell sways slowly on its collar, the clapper a beat behind it. */
function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 82 - b,
    head: 74 + Math.round(Math.sin(a) * 2),
    armN: { up: -72 + b, lo: -4 + b },
    armF: { up: -86 + b * 2, lo: -80 + b * 2 },
    p: { bell: -86 - b + Math.sin(a) * 4, clap: Math.sin(a - 1) * 10 },
  });
}

/** Run: long strides, the bell carried out before him and swinging on its collar, the free arm swinging. */
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -12.5 * Math.cos(ph), y: 3.5 + (sn > 0 ? 7 * sn : 0), ang: sn > 0 ? -20 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 2.5,
    torso: 76,
    head: 82 + bob,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -70 + sw * 4, lo: -6 + sw * 4 },
    armF: { up: -80 - sw * 28, lo: -56 - sw * 26 },
    p: { bell: -84 - sw * 18, clap: sw * 26 },
  });
}

// Warning Toll: he points the enemy out with his free hand and tolls the bell twice, swinging it out before him.
const WT_LIFT = pose({
  x: 1, y: -1, torso: 80, head: 80,
  legN: { ik: v(-6, 3.5) }, legF: { ik: v(7, 3.5) },
  armN: { up: -24, lo: -72 }, armF: { up: 38, lo: 50 },
  p: { bell: 0, clap: -12 },
});
/** The bell swung forward: the clapper strikes its far side. */
const WT_TOLL = tweak(WT_LIFT, { x: 2, torso: 78, head: 80, armN: { up: -8, lo: -20 }, p: { bell: 6, clap: -32 } });
/** Swung back under: the clapper falls the other way. */
const WT_BACK = tweak(WT_LIFT, { torso: 81, armN: { up: -32, lo: -112 }, p: { bell: -6, clap: 30 } });

const HURT = pose({
  x: -4, y: -1, torso: 94, head: 104,
  legN: { ik: v(-8, 3.5) }, legF: { ik: v(5, 4) }, footF: 10,
  armN: { up: -122, lo: -110 }, armF: { up: -50, lo: -14 },
  p: { bell: 10, clap: 30 },
});

/** His bones give way: the knees fold, the long trunk sags, then everything falls into a heap, the bell dropping beside it. */
const BUCKLE = pose({
  x: 1, y: -12, torso: 72, head: 52,
  legN: { ik: v(-9, 3.5) }, legF: { ik: v(8, 3.5) }, footN: -30,
  armN: { up: -80, lo: -96 }, armF: { up: -96, lo: -104 },
  p: { bell: 4, clap: 20, heap: 0 },
});
const HEAPED = (k: number, y = 0) => tweak(BUCKLE, { y: -12 + y, p: { heap: k } });

// Victory: the bell held up before him at the height of his head, swinging on its collar as it peals, the free arm up.
const RAISE = pose({
  y: -1, torso: 84, head: 92,
  legN: { ik: v(-6, 3.5) }, legF: { ik: v(6, 3.5) },
  armN: { up: 30, lo: 48 }, armF: { up: 70, lo: 96 },
  p: { bell: -138, clap: 0 },
});
const peal = (k: 1 | -1) => tweak(RAISE, { p: { bell: -138 + k * 32, clap: -k * 34 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'bellringer',
  name: 'Bellringer',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 180, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    skill: {
      loop: false,
      frames: [
        ...keys([
          [mid(IDLE, WT_LIFT, 0.5), 90],
          [WT_LIFT, 120],
          [WT_TOLL, 170, { event: 'cast' }],
          [WT_BACK, 120],
          [WT_TOLL, 220, { event: 'cast', hit: true }],
          [mid(WT_TOLL, WT_LIFT, 0.5), 160],
        ]),
        ...tween(D, WT_LIFT, IDLE, 2, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 90, head: 98, p: { bell: -6, clap: -20 } }), 110],
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
          [peal(1), 160],
          [peal(-1), 160],
          [peal(1), 160],
          [peal(-1), 160],
          [RAISE, 500],
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

/** The bell in an icon: the sprite's bell, scaled up, its axis at `ang`. */
function iconBell(d: Draw, crown: V, ang: number, s: number, z: number, clap = 0) {
  const f = d.frame(crown, ang);
  const outline = [...BELL.map(([x, w]) => f(x * s, w * s)), ...[...BELL].reverse().map(([x, w]) => f(x * s, -w * s))];
  d.poly({ mat: GO, z, group: 'ibell' }, outline, { kind: 'cyl', a: f(0, 0), b: f(BELL_LEN * s, 0), r: 7.4 * s });
  d.line({ mat: GO, z: z + 0.05, group: 'ibell' }, f(3.2 * s, 4.1 * s), f(3.2 * s, -4.1 * s), GO.ramp[2]);
  d.line({ mat: GO, z: z + 0.05, group: 'ibell' }, f(12.6 * s, 6.6 * s), f(12.6 * s, -6.6 * s), GO.ramp[2]);
  d.line({ mat: GO, z: z + 0.06, group: 'ibell' }, f(13.5 * s, 6.9 * s), f(13.5 * s, -6.9 * s), GO.ramp[4]);
  d.ellipse({ mat: GO, z: z + 0.1, group: 'ibellMouth', flat: 0, line: 'none' }, f((BELL_LEN - 0.5) * s, 0), 1.0 * s, 6.4 * s, ang);
  d.circle({ mat: IR, z: z + 0.12, group: 'iclapper', line: 'none' }, at(f(1.5 * s, 0), ang + clap, (BELL_LEN - 3.4) * s), 1.4 * s);
  d.capsule({ mat: IR, z: z + 0.2, group: 'icollar' }, f(-0.6 * s, 2.7 * s), f(-0.6 * s, -2.7 * s), 1.2 * s, 1.2 * s);
}

/** Arcs of the toll on one side of the bell (screen space, y down). */
function tollArcs(b: { set(x: number, y: number, c: RGBA): void }, cx: number, cy: number, radii: number[], a0: number, a1: number) {
  radii.forEach((r, k) => {
    for (let a = a0; a <= a1; a += 0.06) {
      const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
      b.set(x, y, GO.ramp[k === 0 ? 5 : 4]);
    }
  });
}

export const bellringer: ChampionArt = {
  char,
  iconBg: MAT.indigo,
  icons: {
    warning_toll: () =>
      compose(MAT.indigo, glyph((d) => {
        // the bell swung out, mouth forward, the clapper striking
        iconBell(d, v(10, 33), -52, 1.6, 10, -24);
      }), (b) => tollArcs(b, 25, 28, [9, 12.5], -1.0, 1.5)),
    last_peal: () =>
      compose(MAT.indigo, glyph((d) => {
        // a shield of dark iron behind the bell: the toll that hardens him
        const sh = [v(6, 33), v(34, 33), v(34, 19), v(20, 4), v(6, 19)];
        d.poly({ mat: IR, z: 1, group: 'ishield', shade: -1 }, sh, { kind: 'dome', c: v(20, 22), r: 18, bevel: 1.2 });
        iconBell(d, v(20, 33), -90, 1.45, 10, 8);
      }), (b) => tollArcs(b, 20, 32, [15], 0.25, Math.PI - 0.25)),
  },
};
