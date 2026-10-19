// The Automated Soul (docs/DESIGN_DECISIONS.md section 32, Jakub's brief of
// 2026-10-18): an Elite of the Ashveil Reign, Damage, Tide. "This is archer
// skeleton without head but in shiny azure and gold plated armor. his bow is
// wooden longbow. he fires arrows on attack." So he is built bone by bone like
// the Reign's other skeletons (tools/art/bones.ts), tall and straight, with no
// skull: the neck's last two vertebrae stand up out of an empty gorget, and a
// pale light shows in it where the head should be. Over the bones, plate of
// azure enamel polished to a shine and trimmed with gold: a cuirass, the
// gorget, pauldrons, a fauld and short tassets, vambraces, greaves and
// sabatons; between the plates the bones show (the upper arms, the thighs,
// the knees, the bony hands). A wooden longbow nearly as tall as he is, its
// grip wrapped in leather, horn at its tips; a quiver of azure-fletched arrows
// at his back. Every skill looses arrows: Unerring Shot one at the enemy,
// Sundering Volley a volley into the sky, Pinning Shot one at full draw. He
// dies the way the Reign's skeletons do: the bones give way and he falls apart
// into a heap, plates and all, the bow beside it, the light going out. What
// the brief leaves open is a first take; nothing in the look comes from his
// affinity (affinities are abstract, Jakub, 2026-10-11).
//
// Pose channels: `bowAng` the bow's axis (deg; 90 upright), `draw` how far the
// string is drawn (0..1), `nock` 1 while the string is in his near hand,
// `arrow` 1 with an arrow on the string, `aimAng` its line, `glint` a gleam on
// its head at full draw, `soul` the light in the gorget (0..1), `heap` lets
// the bones fall apart (0..1).
import { armBones, BN, BoneSet, fallApart, legBones, trunkFrame, vertebrae } from '../bones.ts';
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { arrowGlyph, compose, glyph, impactStar, speedLines } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, D2R, Dims, Draw, ease, lerpPose, pose, Pose, Skel, solve, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 39.6,
  thigh: 19,
  shin: 18.2,
  ankleH: 3,
  footLen: 6.4,
  spine: 23,
  neck: 7.5,
  upperArm: 14,
  foreArm: 13,
  shoulderDrop: 4.4,
  shoulderN: -2.6,
  shoulderF: 3.0,
  hipN: -1.6,
  hipF: 1.6,
};

const AZ = MAT.azurePlate, GO = MAT.gold, WD = MAT.wood, DL = MAT.darkleather, IR = MAT.iron, BL = MAT.blue, HN = MAT.bone;
const E = ACCENT;

/** The longbow, grip to tip; how far the string sits behind the grip at rest; how far a full draw takes it. */
const BOW = 28, BRACE = 4, DRAW = 18;
/** An arrow, nock to point. */
const ARROW = 26;

// ---------------------------------------------------------------------------
// The bones (and the bow), as placed this frame: from the solved skeleton
// while he stands, falling apart toward the heap while he dies
// ---------------------------------------------------------------------------

interface Bones extends BoneSet {
  /** where the bow's grip is: in his far hand, or where it fell */
  grip: V;
  /** the bow's axis (deg) */
  bow: number;
}

/** Where everything comes to rest when he falls apart: the cuirass on its back, the limbs scattered in their plates, the bow flat in front. */
const HEAP: Bones = {
  pelvis: v(-5, 9.4), torso: 176,
  head: v(-31, 8), headDir: 176,
  sN: v(2, 4.4), eN: v(14, 2.8), hN: v(25, 3.4),
  sF: v(-12, 5.8), eF: v(-24, 3.2), hF: v(-35, 2.6),
  hipN: v(-2, 4.6), kneeN: v(10, 5.4), ankN: v(21, 3.8), footN: -4,
  hipF: v(-6, 4.2), kneeF: v(-17, 4.8), ankF: v(-28, 3.8), footF: 176,
  grip: v(19, 1.9), bow: 4,
};

function bonesOf(s: Skel, heap: number): Bones {
  const P = s.pose.p;
  const alive: Bones = {
    pelvis: s.pelvis, torso: s.torso, head: s.head, headDir: s.headDir,
    sN: s.sN, eN: s.eN, hN: s.hN, sF: s.sF, eF: s.eF, hF: s.hF,
    hipN: s.hipN, kneeN: s.kneeN, ankN: s.ankN, footN: s.pose.footN,
    hipF: s.hipF, kneeF: s.kneeF, ankF: s.ankF, footF: s.pose.footF,
    grip: s.hF, bow: P.bowAng ?? 98,
  };
  return fallApart(alive, HEAP, heap);
}

const angle = (a: V, b: V) => Math.atan2(b.y - a.y, b.x - a.x) / D2R;

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const heap = P.heap ?? 0;
  const B = bonesOf(s, heap);
  const T = trunkFrame(B);
  void info;
  const nocked = (P.nock ?? 0) >= 0.5 && heap === 0;

  // the quiver at his back
  quiver(d, T, 3);

  // far leg and its plates, far tasset, far arm (its hand comes round the bow later), far pauldron, a shade darker
  legBones(d, B.hipF, B.kneeF, B.ankF, B.footF, 10, -1, 'F', false);
  greave(d, B.kneeF, B.ankF, 11, -1, 'F');
  sabaton(d, B.ankF, B.footF, 11.5, -1, 'F');
  tasset(d, B.hipF, B.kneeF, B.torso, 13, -1, 'F');
  armBones(d, B.sF, B.eF, B.hF, 20, -1, 'F', heap < 0.5 ? 'none' : 'claw');
  vambrace(d, B.eF, B.hF, 20.5, -1, 'F');
  pauldron(d, B.sF, angle(B.sF, B.eF), B.torso, 28, -1, 'F');

  // the trunk in its plate, the empty gorget, the neck's last bones and the light in it
  trunk(d, T, 30);
  gorget(d, T, P.soul ?? 1, 36);

  // the bow before him, the far hand round its grip, the arrow on the string
  const nockP = nocked ? B.hN : null;
  bow(d, B.grip, B.bow, nocked ? P.draw ?? 0 : 0, nockP, 44);
  if (heap < 0.5) bowHand(d, B.hF, B.bow, 44.5, -1);
  if (nockP && (P.arrow ?? 0) >= 0.5) arrow(d, nockP, P.aimAng ?? 0, P.glint ?? 0, 59);

  // near leg and its plates, near tasset
  legBones(d, B.hipN, B.kneeN, B.ankN, B.footN, 50, 0, 'N', false);
  greave(d, B.kneeN, B.ankN, 51, 0, 'N');
  sabaton(d, B.ankN, B.footN, 51.5, 0, 'N');
  tasset(d, B.hipN, B.kneeN, B.torso, 53, 0, 'N');

  // the near arm, its bony hand hooked on the string or open, and the near pauldron
  armBones(d, B.sN, B.eN, B.hN, 60, 0, 'N', nocked ? 'grip' : 'claw', B.bow);
  vambrace(d, B.eN, B.hN, 60.5, 0, 'N');
  pauldron(d, B.sN, angle(B.sN, B.eN), B.torso, 62, 0, 'N');
}

// ---------------------------------------------------------------------------
// The plate: azure enamel, polished, trimmed with gold
// ---------------------------------------------------------------------------

/**
 * The trunk: a breastplate of azure over the ribs, from below the chest to the
 * neck, a lit keel down its front and gold along its lower edge; under it the
 * bones show, the two floating ribs and the spine down to the belt; a fauld of
 * two lames hangs from the belt over the pelvis, gold at their edges; the
 * quiver's strap across the chest, its gold buckle.
 */
function trunk(d: Draw, T: (u: number, w: number) => V, z: number) {
  // the bones of the waist, between the breastplate and the belt
  d.capsule({ mat: BN, z: z - 1, group: 'spine', tex: (h) => (Math.floor(h.u * 10) % 2 ? -1 : 0) }, T(3.8, -1.6), T(12, -2.0), 1.05, 1.0);
  for (let k = 0; k < 4; k++) d.circle({ mat: BN, z: z - 0.9, group: 'lumbar' + k, line: 'soft' }, T(5.2 + k * 1.75, -1.7 - k * 0.08), 1.3);
  for (const [k, u, f] of [[0, 11.4, 3.4], [1, 9.8, 2.4]] as const) {
    d.ribbon({ mat: BN, z: z - 0.8 + k * 0.01, group: 'float' + k, line: 'strong' }, [T(u + 0.4, -2.0), T(u + 0.2, 0.2), T(u - 0.6, f)], [0.5, 0.55, 0.45]);
  }
  const prof: [number, number, number][] = [
    [10.4, 5.6, 6.4],
    [13, 6.1, 7.4],
    [16, 6.5, 7.8],
    [18.6, 6.6, 7.3],
    [21, 5.4, 5.0],
    [23, 3.6, 3.2],
  ];
  const pts = [...prof.map(([u, , f]) => T(u, f)), ...[...prof].reverse().map(([u, b]) => T(u, -b))];
  d.poly({ mat: AZ, z, group: 'cuirass' }, pts, { kind: 'cyl', a: T(10.4, 1), b: T(23, 1), r: 8.4, bevel: 1.5 });
  // the keel catching the light, gold along the lower edge
  d.line({ mat: AZ, z: z + 0.1, group: 'cuirass', line: 'none' }, T(12.4, 7.2), T(18, 7.2), AZ.ramp[5]);
  d.ribbon({ mat: GO, z: z + 0.2, group: 'cuirass', line: 'none' }, [T(10.9, -5.2), T(10.7, 0.6), T(11.0, 6.1)], [0.55, 0.55, 0.55]);
  // the fauld: two lames, each edged in gold
  for (const [u0, u1, k] of [[0.6, 3.4, 0], [-1.8, 1.2, 1]] as const) {
    d.poly({ mat: AZ, z: z + 1 + k * 0.01, group: 'fauld' + k, line: 'soft' }, [T(u1, -5.4), T(u1, 5.8), T(u0, 6.0), T(u0, -5.3)], { kind: 'cyl', a: T(u0, 1), b: T(u1, 1), r: 6.2, bevel: 1 });
    d.line({ mat: GO, z: z + 1.05 + k * 0.01, group: 'fauld' + k, line: 'none' }, T(u0 + 0.3, -4.8), T(u0 + 0.3, 5.6), GO.ramp[3]);
  }
  // the belt over the fauld's top, and the quiver's strap across the chest with its buckle
  d.poly({ mat: DL, z: z + 2, group: 'belt' }, [T(4.8, -5.2), T(5.0, 5.6), T(3.4, 5.6), T(3.2, -5.1)], { kind: 'cyl', a: T(3.2, 0), b: T(5.0, 0), r: 5.6 });
  d.capsule({ mat: DL, z: z + 2.2, group: 'strap' }, T(21.2, 3.2), T(11.2, -3.2), 0.95, 0.95);
  d.poly({ mat: GO, z: z + 2.3, group: 'buckle' }, [T(16.6, 0.9), T(16.8, 2.9), T(14.8, 2.7), T(14.6, 0.7)], { kind: 'bevel', w: 0.8 });
}

/**
 * The gorget, standing empty: a collar round the neck, gold at its rim;
 * inside it the dark of the hollow, the neck's last three vertebrae standing
 * up out of it, the top one broken off where the head was, and a pale light
 * at its mouth (`soul`, 0..1; over 1 it flares).
 */
function gorget(d: Draw, T: (u: number, w: number) => V, soul: number, z: number) {
  d.poly({ mat: AZ, z, group: 'gorget' }, [T(20.6, -5.0), T(23.4, -3.9), T(24.0, 3.7), T(21.0, 5.0)], { kind: 'cyl', a: T(20.6, 0), b: T(24.0, 0), r: 5.2, bevel: 1 });
  d.line({ mat: AZ, z: z + 0.05, group: 'gorget', line: 'none' }, T(22.2, -4.6), T(22.5, 4.4), AZ.ramp[1]);
  d.ribbon({ mat: GO, z: z + 0.1, group: 'gorgetRim', line: 'none' }, [T(23.6, -3.7), T(24.2, 0.1), T(23.9, 3.5)], [0.6, 0.65, 0.6]);
  // the hollow
  d.ellipse({ mat: AZ, z: z + 0.15, group: 'hollow', flat: 0, line: 'none' }, T(24.1, -0.1), 3.4, 1.0, 0);
  // the neck's last bones, the top one broken off ragged
  vertebrae(d, T(23.4, -0.7), T(28.6, -1.2), z + 0.3, 3);
  d.pixels({ mat: BN, z: z + 0.4, group: 'neck2' }, [{ p: T(29.4, -1.8), c: BN.ramp[4] }, { p: T(29.0, -0.6), c: BN.ramp[2] }, { p: T(28.6, -2.4), c: BN.ramp[1] }]);
  // the light at its mouth, round the bones
  if (soul > 0.05) {
    const px: { p: V; c: RGBA }[] = [{ p: T(24.4, 1.4), c: soul > 0.5 ? E.ashEye : E.ashEyeDim }, { p: T(24.4, 2.4), c: E.ashEyeDim }, { p: T(24.4, -2.6), c: E.ashEyeDim }];
    if (soul > 0.75) px.push({ p: T(25.4, 1.8), c: E.ashEye }, { p: T(24.4, -1.8), c: E.ashEye }, { p: T(26.4, 2.0), c: E.ashEyeDim });
    if (soul > 1.2) px.push({ p: T(26.4, 2.4), c: E.ashEye }, { p: T(26.4, -3.2), c: E.ashEye }, { p: T(27.6, 2.0), c: E.ashEyeDim }, { p: T(27.4, -3.0), c: E.ashEyeDim });
    d.pixels({ mat: BN, z: z + 0.5, group: 'soul', outline: false, line: 'none' }, px);
  }
}

/** A pauldron of two lames capping the shoulder, the lower rimmed in gold, a gold rivet at its top; it sits low, under the gorget's rim. */
function pauldron(d: Draw, sh: V, up: number, torso: number, z: number, shade: number, side: string) {
  const g = 'paul' + side;
  const top = at(sh, up, 0.6);
  const lames: [number, number, number][] = [[0, 3.4, 2.6], [1.6, 3.0, 2.1]];
  lames.forEach(([o, rx, ry], i) => d.ellipse({ mat: AZ, z: z - i * 0.01, group: g + i, shade, line: 'soft' }, at(top, up, o), rx, ry, up + 90, 0.15));
  const rim = at(top, up, 3.4);
  d.capsule({ mat: GO, z: z - 0.025, group: g + '1', shade, line: 'none' }, at(rim, up + 90, 2.6), at(rim, up - 90, 2.6), 0.5, 0.5);
  d.pixels({ mat: GO, z: z + 0.01, group: g + '0' }, [{ p: at(top, up + 90, 0.8), c: GO.ramp[5] }]);
}

/** A vambrace: a tube of azure over the forearm's bones, from below the elbow to the wrist, a gold band round its wrist end. */
function vambrace(d: Draw, el: V, ha: V, z: number, shade: number, side: string) {
  const lo = angle(el, ha);
  const a = at(el, lo, 3.4), b = at(ha, lo, -1.7);
  d.capsule({ mat: AZ, z, group: 'vam' + side, shade }, a, b, 1.9, 1.75);
  d.capsule({ mat: GO, z: z + 0.05, group: 'vam' + side + 'g', shade, line: 'soft' }, at(b, lo + 90, 1.9), at(b, lo - 90, 1.9), 0.6, 0.6);
}

/** A greave over the shin's bones, below the knee so the kneecap shows: azure, a lit ridge down its front, gold round its top. */
function greave(d: Draw, knee: V, ank: V, z: number, shade: number, side: string) {
  const sh = angle(knee, ank);
  const a = at(knee, sh, 2.8), b = at(ank, sh, -0.6);
  d.capsule({ mat: AZ, z, group: 'grv' + side, shade, tex: (h) => (Math.abs(h.v + 0.3) < 0.13 ? 1 : 0) }, a, b, 2.2, 1.8);
  d.capsule({ mat: GO, z: z + 0.05, group: 'grv' + side + 'g', shade, line: 'soft' }, at(a, sh + 90, 2.2), at(a, sh - 90, 2.2), 0.6, 0.6);
}

/** A sabaton: a plate shoe of lames over the foot's bones, its toe pointed, gold at its cuff. */
function sabaton(d: Draw, ank: V, footAng: number, z: number, shade: number, side: string) {
  const g = 'sab' + side;
  const f = d.frame(ank, footAng);
  d.poly({ mat: AZ, z, group: g, shade }, [f(-2.2, 1.6), f(-2.7, -1.2), f(-2.3, -3.0), f(5.6, -3.0), f(7.4, -2.5), f(6.2, -1.3), f(3.4, 0.4), f(0.4, 1.9)], { kind: 'bevel', w: 1.2 });
  d.line({ mat: AZ, z: z + 0.05, group: g, line: 'none' }, f(1.4, 1.3), f(2.4, -1.6), AZ.ramp[1]);
  d.line({ mat: AZ, z: z + 0.05, group: g, line: 'none' }, f(3.6, 0.2), f(4.4, -1.8), AZ.ramp[1]);
  d.capsule({ mat: GO, z: z + 0.1, group: g + 'g', shade, line: 'soft' }, f(-1.9, 1.9), f(0.9, 2.1), 0.6, 0.6);
}

/** A short tasset over the top of the thigh, hanging from the fauld; the femur shows below it to the knee. */
function tasset(d: Draw, hip: V, knee: V, torso: number, z: number, shade: number, side: string) {
  const th = angle(hip, knee);
  const hang = torso < 55 || torso > 125 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.3;
  const a = at(hip, hang, -1.4), b = at(hip, hang, 5.2);
  d.poly({ mat: AZ, z, group: 'tas' + side, shade, line: 'soft' }, [at(a, hang + 90, 3.8), at(b, hang + 90, 4.2), at(b, hang - 90, 4.4), at(a, hang - 90, 4.0)], { kind: 'cyl', a, b, r: 4.6, bevel: 1 });
  d.capsule({ mat: GO, z: z + 0.05, group: 'tas' + side + 'g', shade, line: 'none' }, at(b, hang + 90, 4.0), at(b, hang - 90, 4.2), 0.5, 0.5);
}

// ---------------------------------------------------------------------------
// The bow, the arrow, the quiver
// ---------------------------------------------------------------------------

/**
 * The longbow: a long wooden stave bent back toward the string, its belly
 * darker, the grip wrapped in dark leather, horn at its tips; the string
 * straight between the tips, or drawn back to `nockP`. `ang` is its axis
 * (the upper limb's way), `draw` bends it further.
 */
function bow(d: Draw, grip: V, ang: number, draw: number, nockP: V | null, z: number) {
  const f = d.frame(grip, ang); // u toward the upper tip, w toward the string
  const back = 3.4 + draw * 3.8;
  const tipU = f(BOW, back), tipL = f(-BOW, back);
  const limb = [tipL, f(-20, back * 0.6), f(-10, back * 0.2), f(0, 0), f(10, back * 0.2), f(20, back * 0.6), tipU];
  d.ribbon({ mat: WD, z, group: 'bow', tex: (h) => (h.v > 0.35 ? -1 : 0) }, limb, [0.8, 1.15, 1.4, 1.6, 1.4, 1.15, 0.8]);
  d.capsule({ mat: DL, z: z + 0.05, group: 'bowGrip' }, f(-2.2, 0.1), f(2.2, 0.1), 1.3, 1.3);
  d.circle({ mat: HN, z: z + 0.06, group: 'hornU' }, tipU, 0.85);
  d.circle({ mat: HN, z: z + 0.06, group: 'hornL' }, tipL, 0.85);
  const so = { mat: HN, z: z - 0.5, group: 'string', outline: false, line: 'none' as const };
  if (nockP) {
    d.line(so, tipU, nockP, E.string);
    d.line(so, nockP, tipL, E.string);
  } else {
    d.line(so, tipU, tipL, E.string);
  }
}

/** The far hand's bony fingers closed round the bow's grip, over the leather. */
function bowHand(d: Draw, hand: V, bowAng: number, z: number, shade: number) {
  const f = d.frame(hand, bowAng);
  for (const u of [-1.5, 0, 1.5]) d.circle({ mat: BN, z: z + u * 0.001, group: 'gripF' + u, shade, line: 'soft' }, f(u, -1.6), 0.62);
  d.circle({ mat: BN, z: z + 0.01, group: 'thumbF', shade, line: 'soft' }, f(1.1, 1.6), 0.55);
}

/** An arrow on the string: the shaft, an iron head, azure fletching by the nock; at full draw (`glint`) the head catches the light. */
function arrow(d: Draw, nockP: V, aim: number, glint: number, z: number) {
  const tip = at(nockP, aim, ARROW);
  d.line({ mat: WD, z, group: 'arrow', line: 'none' }, at(nockP, aim, 0.5), at(nockP, aim, ARROW - 2.4), WD.ramp[4]);
  const hf = d.frame(tip, aim);
  d.poly({ mat: IR, z: z + 0.2, group: 'arrowHead' }, [hf(1.2, 0), hf(-2.4, 1.4), hf(-1.6, 0), hf(-2.4, -1.4)], { kind: 'bevel', w: 1 });
  const fl = (u: number, w: number) => at(at(nockP, aim, u), aim + 90, w);
  d.pixels({ mat: BL, z: z + 0.1, group: 'fletch', outline: false, line: 'none' }, [
    { p: fl(1.8, 1), c: BL.ramp[4] }, { p: fl(3.0, 1), c: BL.ramp[3] },
    { p: fl(1.8, -1), c: BL.ramp[3] }, { p: fl(3.0, -1), c: BL.ramp[2] },
  ]);
  if (glint > 0.5) d.pixels({ mat: IR, z: z + 0.3, group: 'glint', outline: false, line: 'none' }, [{ p: at(tip, aim, -0.6), c: E.ashEye }, { p: at(at(tip, aim, -1.6), aim + 90, 1), c: E.ashEyeDim }]);
}

/** The quiver at his back, slung from the strap: dark leather, gold bands, three azure fletchings standing out of it. */
function quiver(d: Draw, T: (u: number, w: number) => V, z: number) {
  const top = T(20.6, -6.6), bot = T(6.4, -8.6);
  d.capsule({ mat: DL, z, group: 'quiver' }, top, bot, 2.0, 1.8, 0.3);
  const band = (k: number) => {
    const p = { x: top.x + (bot.x - top.x) * k, y: top.y + (bot.y - top.y) * k };
    const a = angle(top, bot);
    d.capsule({ mat: GO, z: z + 0.05, group: 'quiverBand' + k, line: 'soft' }, at(p, a + 90, 2.0), at(p, a - 90, 2.0), 0.5, 0.5);
  };
  band(0.12);
  band(0.85);
  const up = angle(bot, top);
  for (const [i, o, l] of [[0, -1.4, 4.4], [1, 0.4, 5.2], [2, 1.9, 3.8]] as const) {
    const base = at(at(top, up, 0.6), up + 90, o);
    const tipP = at(base, up + (i - 1) * 6, l);
    d.capsule({ mat: BL, z: z - 0.5 + i * 0.01, group: 'fletchQ' + i, line: 'soft' }, at(base, up, 1.6), tipP, 0.9, 1.2);
  }
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const REST = { bowAng: 98, draw: 0, arrow: 0, nock: 0, aimAng: 0, glint: 0, soul: 1, heap: 0 };

const IDLE: Pose = pose({
  torso: 89,
  head: 90,
  legN: { ik: v(-5, 3) },
  legF: { ik: v(6, 3) },
  armN: { up: -98, lo: -86 },
  armF: { up: -68, lo: -36 },
  p: REST,
});

/** Idle: he stands as he was set to stand, the bow upright before him; a slow settle of the plates, the light in the gorget waxing and waning. */
function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b,
    armN: { up: -98 + b, lo: -86 + b },
    armF: { up: -68 + b, lo: -36 + b },
    p: { bowAng: 98 - b, soul: 0.7 + 0.3 * Math.cos(a) },
  });
}

/** Run: a steady, even stride, the bow carried slanting forward in his far hand, the near arm swinging. */
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11.5 * Math.cos(ph), y: 3 + (sn > 0 ? 6.5 * sn : 0), ang: sn > 0 ? -22 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 1.5,
    torso: 82,
    head: 86,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -84 + sw * 34, lo: -46 + sw * 36 },
    armF: { up: -64 - sw * 12, lo: -24 - sw * 12 },
    p: { ...REST, bowAng: 30 - sw * 8 },
  });
}

/** Feet set apart to shoot. */
const STANCE = pose({
  torso: 88,
  head: 90,
  legN: { ik: v(-9, 3) },
  legF: { ik: v(8.5, 3) },
  p: REST,
});

/** The bow arm out along `aimAng`, the string hand drawn back by `draw` (0..1), an arrow on the string. */
function aim(base: Pose, aimAng: number, draw: number, extra: Partial<Pose> & { p?: Record<string, number> } = {}): Pose {
  const p = tweak(base, { ...extra, armF: { up: aimAng - 4, lo: aimAng + 1 } });
  const s = solve(p, D);
  const nock = at(s.hF, aimAng, -(BRACE + draw * DRAW));
  return tweak(p, { armN: { ik: nock, bend: 1 }, p: { ...(extra.p ?? {}), aimAng, bowAng: aimAng + 90, draw, arrow: 1, nock: 1 } });
}

/** Loosed: the string straight again, the drawing hand flung back past the nock. */
function release(base: Pose, aimAng: number, extra: Partial<Pose> & { p?: Record<string, number> } = {}): Pose {
  const p = tweak(base, { ...extra, armF: { up: aimAng + 2, lo: aimAng + 7 } });
  const s = solve(p, D);
  const hand = at(at(s.hF, aimAng, -(BRACE + DRAW + 3)), aimAng + 90, 3);
  return tweak(p, { armN: { ik: hand, bend: 1 }, p: { ...(extra.p ?? {}), aimAng, bowAng: aimAng + 94, draw: 0, arrow: 0, nock: 0, glint: 0 } });
}

// Unerring Shot: straight at the enemy, drawn and held a beat, loosed.
const A1 = 2;
// Sundering Volley: high into the sky, leaning back into it.
const A2 = 56;
const LEAN = { torso: 97 };
// Pinning Shot: feet planted wide, a long full draw, a gleam on the head, loosed with a recoil.
const A3 = 3;
const PLANT = pose({ y: -1, torso: 86, head: 90, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, p: REST });

const HURT = pose({
  x: -4, y: -1, torso: 98, head: 102,
  legN: { ik: v(-8, 3.5) }, legF: { ik: v(5, 4) }, footF: 10,
  armN: { up: -128, lo: -108 }, armF: { up: -42, lo: -12 },
  p: { ...REST, bowAng: 116, soul: 0.5 },
});

/** His bones give way: the knees fold, the trunk sags, then everything falls into a heap, the bow beside it, the light going out. */
const BUCKLE = pose({
  x: 1, y: -11, torso: 74, head: 70,
  legN: { ik: v(-9, 3.5) }, legF: { ik: v(8, 3.5) }, footN: -6,
  armN: { up: -82, lo: -98 }, armF: { up: -96, lo: -104 },
  p: { ...REST, bowAng: 16, soul: 0.4, heap: 0 },
});
const HEAPED = (k: number, y = 0) => tweak(BUCKLE, { y: -11 + y, p: { heap: k, soul: 0.4 * (1 - k) } });

/** Victory: the bow lifted high in his far hand, the light in the gorget flaring. */
const RAISE = pose({
  torso: 90, head: 90,
  legN: { ik: v(-6, 3) }, legF: { ik: v(6.5, 3) },
  armN: { up: -104, lo: -78 },
  armF: { up: 82, lo: 88 },
  p: { ...REST, bowAng: 92, soul: 1.4 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'automated_soul',
  name: 'Automated Soul',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 200, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, aim(STANCE, A1, 0), 0.5), 80],
        [aim(STANCE, A1, 0), 100],
        [aim(STANCE, A1, 0.55), 90],
        [aim(STANCE, A1, 1), 240],
        [release(STANCE, A1, { x: -1 }), 80, { event: 'shoot', hit: true }],
        [release(STANCE, A1 + 3, { x: -1, torso: 89 }), 170],
        [mid(release(STANCE, A1 + 3), IDLE, 0.5), 110],
        [IDLE, 110],
      ]),
    },
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, aim(STANCE, A2, 0, LEAN), 0.5), 90],
        [aim(STANCE, A2, 0, LEAN), 110],
        [aim(STANCE, A2, 0.6, LEAN), 100],
        [aim(STANCE, A2, 1, LEAN), 230],
        [release(STANCE, A2, LEAN), 80, { event: 'shoot', hit: true }],
        [release(STANCE, A2 + 3, { torso: 95 }), 190],
        [mid(STANCE, IDLE, 0.5), 110],
        [IDLE, 110],
      ]),
    },
    attack3: {
      loop: false,
      frames: keys([
        [mid(IDLE, PLANT, 0.5), 90],
        [aim(PLANT, A3, 0), 110],
        [aim(PLANT, A3, 0.5), 130],
        [aim(PLANT, A3, 1, { p: { glint: 1 } }), 220],
        [aim(PLANT, A3, 1, { torso: 85, p: { glint: 1 } }), 200],
        [release(PLANT, A3, { x: -3, torso: 90 }), 80, { event: 'shoot', hit: true }],
        [release(PLANT, A3 + 4, { x: -3, torso: 92 }), 200],
        [mid(PLANT, IDLE, 0.5), 120],
        [IDLE, 110],
      ]),
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 94, p: { bowAng: 110, soul: 0.7 } }), 110],
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
          [tweak(RAISE, { y: 1 }), 160],
          [RAISE, 160],
          [tweak(RAISE, { y: 1, p: { soul: 1.25 } }), 160],
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

export const automatedSoul: ChampionArt = {
  char,
  iconBg: MAT.azurePlate,
  icons: {
    unerring_shot: () =>
      compose(MAT.azurePlate, glyph((d) => {
        // one arrow, dead straight
        arrowGlyph(d, v(5, 19), v(31, 23), 10, MAT.iron, MAT.blue);
      }), (b) => speedLines(b, [[3, 13, 12, 12], [5, 26, 14, 25], [2, 19, 8, 19]], E.white)),
    sundering_volley: () =>
      compose(MAT.azurePlate, glyph((d) => {
        // arrows falling, a broken plate under them
        for (const [x, y] of [[6, 37], [15, 39], [24, 37], [11, 26], [21, 28]]) arrowGlyph(d, v(x, y), v(x + 7, y - 14), 10 + x * 0.01, MAT.iron, MAT.blue);
        d.poly({ mat: MAT.azurePlate, z: 2, group: 'plate', shade: -1 }, [v(4, 9), v(18, 11), v(16, 4), v(5, 3)], { kind: 'bevel', w: 1.2 });
        d.poly({ mat: MAT.azurePlate, z: 2, group: 'plate2', shade: -1 }, [v(21, 11), v(36, 9), v(35, 3), v(23, 4)], { kind: 'bevel', w: 1.2 });
      })),
    pinning_shot: () =>
      compose(MAT.azurePlate, glyph((d) => {
        // a heavy arrow driven home, a gleam on its head
        arrowGlyph(d, v(4, 33), v(26, 13), 10, MAT.iron, MAT.blue);
      }), (b) => {
        impactStar(b, 31, 30, 3, 9, 8, E.ashEyeDim, E.ashEye);
        b.set(28, 24, E.ashEye);
        b.set(29, 23, E.white);
      }),
  },
};
