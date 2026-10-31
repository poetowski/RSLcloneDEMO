// The Forest Gargoyle (docs/DESIGN_DECISIONS.md section 38, Jakub's brief of
// 2026-10-31): a Heroic, Tank. "Gargoyle carved from wood instead of stone
// material. almost does not move. on idle it can even be static with one small
// tick of head. winged creature. features are sharp leaves." So he is a perched
// gargoyle in weathered old wood, its grain, knots and chisel cuts showing: squatting
// on his haunches, his hands on his knees, a snarling horned head thrust forward,
// two wings folded behind him with their wrists above his shoulders, their skin dark,
// a tail lying behind. Everything that would be a spine, a fin, an ear or a tuft
// is a sharp green leaf. He does not breathe: his idle is one pose, the head ticks
// once and holds, and ticks back. He moves stiffly and rarely, in sudden snaps; he
// glides rather than walks. What the brief leaves open is a first take. His
// affinity sets nothing here (affinities are abstract, Jakub, 2026-10-11).
//
// Pose channels: `wingN` `wingF` the direction of each wing's arm (over 90 it
// trails behind him, under 90 it reaches forward), `open` how wide they stand, `over` they lie forward over his back as he falls, `jaw`
// opens the mouth (degrees), `eyes` lights them (0..2), `cracks` splits the wood as
// he dies (0..1), `fall` the leaves he sheds as he falls (0..1), `chip` chips thrown
// off him by a blow (0..1).
import { BuildInfo, ChampionArt, CharDef, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT, Material } from '../palette.ts';
import { hash2, RGBA } from '../raster.ts';
import { smear, torsoPts } from '../parts.ts';
import { at, D2R, Dims, Draw, ease, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 30,
  thigh: 14,
  shin: 14,
  ankleH: 3,
  footLen: 8,
  spine: 24,
  neck: 4,
  upperArm: 16,
  foreArm: 15,
  shoulderDrop: 4,
  shoulderN: -5,
  shoulderF: 5,
  hipN: -4,
  hipF: 4,
};

const WD = MAT.bark, BK = MAT.darkleather, LF = MAT.green, CL = MAT.ebony, FG = MAT.bone, GL = MAT.glowAmber, BG = MAT.pine;
const E = ACCENT;

/** The streak of a rake: pale, with the leaves' green at its edge. */
const SWING = { core: E.white, edge: LF.ramp[4] };

/** The grain of the wood, keyed to the shape so it stays put: a dark line now and then, wandering a little. */
const grain = (h: { u: number; v: number }) => {
  const g = Math.sin(h.v * 26 + Math.sin(h.u * 9) * 1.6);
  return g > 0.62 ? -1 : g < -0.92 ? 1 : 0;
};

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;

  // the rake's streak behind everything
  if (info.def.smear && info.prev) smear(d, s.sN, info.prev.upN, s.upN, D.upperArm + D.foreArm, 8, SWING, 1);

  // the far wing, the tail, the far leg and arm
  wing(d, s.T(20, 3), P.wingF ?? 96, P.open ?? 0.15, 2, -1, 'wingF', !!P.over);
  tail(d, s, 6);
  limbLeg(d, s, 'F', 10, -1);
  limbArm(d, s, 'F', 20, -1);

  // the near wing behind the body, the leaves along the back, the body, the head
  wing(d, s.T(20, -6), P.wingN ?? 104, P.open ?? 0.15, 26, 0, 'wingN', !!P.over);
  backLeaves(d, s, 29.5);
  body(d, s, P, 30);
  head(d, s, P, 40);

  // near leg and arm before him, the leaves at the shoulder
  limbLeg(d, s, 'N', 50, 0);
  limbArm(d, s, 'N', 60, 0);
  for (const [off, len] of [[-38, 11], [4, 15], [44, 11]] as const) leaf(d, at(s.sN, s.upN, -1), s.upN + 180 + off, len, 2.4, 62, 'shoulder');

  bits(d, s, P, 70);
}

/** A sharp leaf from `base` along `ang`: widest low down, drawn to a long point, its rib dark. */
function leaf(d: Draw, base: V, ang: number, len: number, w: number, z: number, g: string, shade = 0, mat: Material = LF) {
  const f = d.frame(base, ang);
  d.poly({ mat, z, group: g, shade, line: 'soft' }, [f(0, 0), f(len * 0.26, w), f(len, 0), f(len * 0.26, -w)], { kind: 'bevel', w: 0.8 });
  d.line({ mat, z: z + 0.01, group: g, line: 'none' }, f(1, 0), f(len * 0.78, 0), mat.ramp[1]);
}

/**
 * A wing: an arm of wood from the shoulder to a wrist, a thorn at the wrist, four
 * fingers from it with a dark skin between them, hollowed between each pair, and a
 * sharp leaf at every finger's tip and along the edge between them. Folded (`open`
 * near 0) the fingers hang together behind him; open they fan out, and past 1 they
 * draw out further. Under 90 degrees the wing reaches forward.
 */
function wing(d: Draw, root: V, ang: number, open: number, z: number, shade: number, g: string, over = false) {
  const sign = ang >= 90 && !over ? 1 : -1;
  const wrist = at(root, ang, 24 + open * 2);
  const k = Math.min(1, open);
  const folded = [95, 118, 132, 145, 158], spread = [-22, 32, 72, 108, 134], lens = [22, 32, 37, 34, 26];
  const tips = lens.map((len, i) => {
    const a = ang + sign * (folded[i] + (spread[i] - folded[i]) * k);
    return { a, p: at(wrist, a, len * (0.75 + open * 0.35)) };
  });
  // the skin, hollowed between the fingers
  const edge: V[] = [];
  tips.forEach((t, i) => {
    edge.push(t.p);
    if (tips[i + 1]) edge.push(lerpV(lerpV(t.p, tips[i + 1].p, 0.5), wrist, 0.2));
  });
  d.poly({ mat: BK, z, group: g, shade }, [root, wrist, ...edge], { kind: 'flat', n: [-0.15, 0.2, 0.92] });
  // the grain of the skin, running out from the wrist
  tips.forEach((t, i) => {
    if (tips[i + 1]) d.line({ mat: BK, z: z + 0.01, group: g, line: 'none' }, wrist, lerpV(lerpV(t.p, tips[i + 1].p, 0.5), wrist, 0.26), BK.ramp[1]);
  });
  // the leaves along the edge, behind the bones
  tips.forEach((t, i) => {
    leaf(d, at(t.p, t.a, -2), t.a, 14, 2.5, z + 0.05, g + 'l', shade);
    const next = tips[i + 1];
    if (next && open > 0.3) leaf(d, lerpV(lerpV(t.p, next.p, 0.5), wrist, 0.2), (t.a + next.a) / 2, 11, 2.2, z + 0.05, g + 'l', shade);
  });
  // the bones
  d.capsule({ mat: WD, z: z + 0.1, group: g + 'b', shade, tex: grain }, root, wrist, 3.6, 2.6);
  for (const t of tips) d.capsule({ mat: WD, z: z + 0.11, group: g + 'b', shade }, wrist, t.p, 1.5, 0.8);
  d.circle({ mat: WD, z: z + 0.12, group: g + 'b', shade }, wrist, 2.9);
  // the thorn at the wrist
  leaf(d, wrist, ang - sign * 14, 9, 1.9, z + 0.13, g + 'b', shade, CL);
}

/** The tail, lying behind him in a long curve, a sharp leaf for a spade at its end. */
function tail(d: Draw, s: Skel, z: number) {
  const o = s.pelvis;
  const pts = [v(o.x - 4, o.y + 2), v(o.x - 16, o.y - 8), v(o.x - 28, Math.max(3, o.y - 16)), v(o.x - 40, Math.max(3, o.y - 15)), v(o.x - 48, Math.max(5, o.y - 11))];
  d.ribbon({ mat: WD, z, group: 'tail', tex: grain }, pts, [4.6, 3.8, 2.8, 1.9, 1.1]);
  leaf(d, pts[4], 28, 14, 3.4, z + 0.1, 'tail');
  leaf(d, pts[3], 110, 7, 1.8, z - 0.1, 'taill');
  leaf(d, pts[2], 118, 8, 2, z - 0.1, 'taill');
}

/** The sharp leaves standing along his back, longest between the shoulders. */
function backLeaves(d: Draw, s: Skel, z: number) {
  for (const [u, w, len] of [[1, -7.4, 12], [9, -9.6, 16], [17, -10.8, 18]] as const) {
    leaf(d, s.T(u, w + 1.6), s.torso + 112, len, 2.7, z, 'back');
  }
}

/** The body, carved: a deep chest over a narrow waist, the chisel's cuts for its muscles and ribs. */
function body(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const T = s.T;
  d.poly({ mat: WD, z, group: 'body', tex: grain }, torsoPts(s, [[-3, 6.5, 6.5], [2, 8, 8.5], [8, 9.5, 10.5], [14, 11, 13], [19, 11, 12.5], [22, 8.5, 8.5], [24.6, 5, 4]]), { kind: 'cyl', a: T(-3, 1), b: T(25, 1), r: 13, bevel: 1.8 });
  const cuts: [number, number, number, number][] = [
    [18.6, 3, 13, 1.6], [13, 1.6, 12.2, 8.6], // the chest's plate
    [9.6, 2, 9.4, 8.4], [6.6, 2.4, 6.6, 7.6], [3.6, 2.8, 3.8, 6.8], // the belly's cuts
    [16, -3, 8, -5], // the flank
  ];
  for (const [u0, w0, u1, w1] of cuts) d.line({ mat: WD, z: z + 0.1, group: 'body', line: 'none' }, T(u0, w0), T(u1, w1), WD.ramp[1]);
  d.line({ mat: WD, z: z + 0.1, group: 'body', line: 'none' }, T(18.4, 4), T(14.4, 10.4), WD.ramp[5]);
  // the wood splitting as he dies
  if (P.cracks) {
    const px: { p: V; c: RGBA }[] = [];
    for (let k = 0; k < 16 * P.cracks; k++) px.push({ p: T(22 - k * 1.2, 2 + Math.sin(k * 1.9) * 2.4), c: INK.eye });
    d.pixels({ mat: WD, z: z + 0.2, group: 'body', line: 'none' }, px);
  }
  // moss in the hollow of the shoulder
  d.pixels({ mat: LF, z: z + 0.15, group: 'body', line: 'none' }, [[21, -1], [20, 0], [20, -2], [19, -1], [21, 1]].map(([u, w]) => ({ p: T(u, w), c: MAT.moss.ramp[3] })));
}

/** A long arm of wood ending in three black talons; a sharp leaf at the elbow. */
function limbArm(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const near = side === 'N';
  const sh = near ? s.sN : s.sF, el = near ? s.eN : s.eF, ha = near ? s.hN : s.hF, lo = near ? s.loN : s.loF;
  const g = 'arm' + side;
  d.circle({ mat: WD, z, group: g, shade }, sh, 5.2);
  d.capsule({ mat: WD, z: z + 0.05, group: g, shade, tex: grain }, sh, el, 4.8, 3.6);
  d.capsule({ mat: WD, z: z + 0.1, group: g, shade, tex: grain }, el, ha, 3.6, 3.2);
  d.line({ mat: WD, z: z + 0.12, group: g, line: 'none' }, at(el, lo + 90, 3.4), at(el, lo - 90, 3.4), WD.ramp[1]);
  leaf(d, el, lo + 165, 12, 2.2, z + 0.02, g + 'l', shade);
  d.ellipse({ mat: WD, z: z + 0.2, group: g + 'h', shade }, ha, 4, 3.3, lo);
  for (const off of [-30, 0, 30]) {
    const a = lo + off;
    const b = at(ha, a, 2.6);
    d.capsule({ mat: WD, z: z + 0.22, group: g + 'h', shade, line: 'soft' }, b, at(b, a, 2.6), 1.5, 1.2);
    d.poly({ mat: CL, z: z + 0.24, group: g + 'c', shade, line: 'soft' }, [at(at(b, a, 2.2), a + 90, 1.2), at(b, a, 7), at(at(b, a, 2.2), a - 90, 1.2)], { kind: 'bevel', w: 0.6 });
  }
}

/** A haunch and shin of wood, a clawed foot; a sharp leaf at the knee. */
function limbLeg(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const near = side === 'N';
  const hip = near ? s.hipN : s.hipF, kn = near ? s.kneeN : s.kneeF, an = near ? s.ankN : s.ankF;
  const ft = near ? s.pose.footN : s.pose.footF, th = near ? s.thN : s.thF;
  const g = 'leg' + side;
  d.capsule({ mat: WD, z, group: g, shade, tex: grain }, hip, kn, 7, 4.6);
  d.capsule({ mat: WD, z: z + 0.1, group: g, shade, tex: grain }, kn, an, 4.2, 3);
  // a knot in the haunch, its rings cut round it
  const knot = lerpV(hip, kn, 0.45);
  const px: { p: V; c: RGBA }[] = [{ p: knot, c: WD.ramp[0] }];
  for (let a = 0; a < 360; a += 45) px.push({ p: at(knot, a, 2.2), c: WD.ramp[1] });
  d.pixels({ mat: WD, z: z + 0.11, group: g, line: 'none' }, px);
  leaf(d, kn, th + 8, 12, 2.3, z + 0.12, g + 'l', shade);
  const f = d.frame(an, ft);
  d.poly({ mat: WD, z: z + 0.2, group: g + 'f', shade }, [f(-3, 2.6), f(-3.4, -3), f(6, -3), f(7, -1.2), f(3.4, 1.6)], { kind: 'bevel', w: 1.4 });
  for (const w of [-2.2, -0.4]) d.poly({ mat: CL, z: z + 0.25, group: g + 'c', shade, line: 'soft' }, [f(5, w + 1.1), f(11, w - 0.6), f(5, w - 1)], { kind: 'bevel', w: 0.5 });
}

/** The head: a snarling carved face thrust forward, horns sweeping back, a jaw that drops, sharp leaves for ears and crest; the eyes dim until something wakes them. */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  const ha = s.headDir - 90;
  const jaw = P.jaw ?? 0;
  d.capsule({ mat: WD, z: z - 1, group: 'neck', tex: grain }, s.neck, H(-1, -1), 5, 4.6);
  // the far horn and ear behind the head
  d.ribbon({ mat: CL, z: z - 0.5, group: 'hornF', shade: -1 }, [H(1, 5.4), H(-1.6, 10.4), H(-7, 13.4), H(-13, 13)], [1.8, 1.4, 0.9, 0.35]);
  leaf(d, H(-2, 4), ha + 150, 12, 2.5, z - 0.6, 'earF', -1);
  // the crest of leaves over the skull and down the neck
  for (const [x, y, off, len] of [[2, 6.2, 106, 13], [-2, 6.2, 130, 16], [-5.4, 3.6, 156, 16], [-6.4, -0.6, 188, 14]] as const) leaf(d, H(x, y), ha + off, len, 2.2, z - 0.4, 'crest');
  // the jaw, hinged behind the cheek
  const hx = -1, hy = -1.5;
  const c = Math.cos(-jaw * D2R), sn = Math.sin(-jaw * D2R);
  const J = (x: number, y: number) => H(hx + (x - hx) * c - (y - hy) * sn, hy + (x - hx) * sn + (y - hy) * c);
  if (jaw > 4) d.poly({ mat: CL, z: z - 0.1, group: 'maw', line: 'none' }, [H(-1, -1.5), H(9, -2.6), J(8.6, -3)], { kind: 'flat', n: [0, 0, 1] });
  d.poly({ mat: WD, z, group: 'jaw', tex: grain }, [J(-3.4, -1.6), J(-0.6, -5.6), J(6.4, -6.6), J(9.4, -5), J(9.2, -3.2), J(1, -2.6)], { kind: 'dome', c: J(3, -3.6), r: 7, bevel: 0.8 });
  // the skull, faceted: a heavy brow over a blunt snout
  d.poly({ mat: WD, z: z + 0.1, group: 'skull', tex: grain }, [H(-5.4, 4.6), H(-0.6, 7), H(4, 6.2), H(7.4, 3.4), H(10.4, 1), H(11, -1.6), H(9, -3), H(2, -2.8), H(-3.6, -2), H(-6.2, 1.2)], { kind: 'dome', c: H(1.4, 2.6), r: 9.6, bevel: 1 });
  // the near horn and ear
  d.ribbon({ mat: CL, z: z + 0.2, group: 'hornN' }, [H(-2, 5.6), H(-5, 10.4), H(-10.6, 13), H(-17, 12)], [2, 1.6, 1, 0.4]);
  leaf(d, H(-3.6, 2.6), ha + 172, 16, 3, z + 0.25, 'earN');
  const px: { p: V; c: RGBA }[] = [];
  // the brow's cut and the socket under it
  for (let x = 1.6; x <= 8; x += 0.5) px.push({ p: H(x, 3.6 - (x - 1.6) * 0.42), c: WD.ramp[0] });
  for (const [x, y] of [[3, 1.8], [4, 1.8], [5, 1.4], [6, 1], [3.5, 0.9], [4.5, 0.8], [5.5, 0.4]] as const) px.push({ p: H(x, y), c: INK.eye });
  // the eye: a dim ember at rest, blazing when he wakes
  const eyes = P.eyes ?? 0;
  px.push({ p: H(4.6, 1.2), c: eyes >= 1 ? GL.ramp[5] : E.eyeAmber }, { p: H(5.4, 0.9), c: eyes >= 1 ? GL.ramp[5] : GL.ramp[3] });
  if (eyes >= 1) px.push({ p: H(3.8, 1.5), c: GL.ramp[4] }, { p: H(6.2, 0.7), c: GL.ramp[4] }, { p: H(5, 2), c: GL.ramp[3] });
  // the nostril; the cheek's cut; the fangs, down from the snout and up from the jaw
  px.push({ p: H(9.6, -0.6), c: INK.eye }, { p: H(2.4, -1), c: WD.ramp[1] }, { p: H(1.6, -2), c: WD.ramp[1] });
  for (const x of [4.2, 6.6, 9]) for (let k = 0; k < (x === 9 ? 3 : 2); k++) px.push({ p: H(x, -3.2 - k), c: FG.ramp[k ? 3 : 4] });
  for (const x of [3.4, 7.4]) for (let k = 0; k < 2; k++) px.push({ p: J(x, -3 + k * 0.9), c: FG.ramp[3] });
  d.pixels({ mat: WD, z: z + 0.3, group: 'skull', line: 'none' }, px);
}

/** What flies off him: chips of wood from a blow, and the leaves he sheds as he falls. */
function bits(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const px: { p: V; c: RGBA }[] = [];
  const c = s.T(14, 4);
  if (P.chip) {
    for (let m = 0; m < 7; m++) {
      const a = hash2(m, 4, 2) * 200 + 60, r = 6 + hash2(m, 9, 2) * 12 * P.chip;
      const p = at(c, a, r);
      px.push({ p: v(Math.round(p.x), Math.round(p.y - P.chip * P.chip * 6)), c: WD.ramp[m % 2 ? 4 : 2] });
    }
  }
  if (P.fall) {
    for (let m = 0; m < 12; m++) {
      const x = s.pelvis.x - 26 + hash2(m, 3, 5) * 54, top = 18 + hash2(m, 6, 5) * 36;
      const y = Math.max(1, top - P.fall * (20 + hash2(m, 7, 5) * 24));
      px.push({ p: v(Math.round(x), Math.round(y)), c: LF.ramp[3 + (m % 2)] }, { p: v(Math.round(x) + 1, Math.round(y)), c: LF.ramp[2] });
    }
  }
  if (px.length) d.pixels({ mat: LF, z, group: 'bits', outline: false, line: 'none' }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// At rest: squatting on his haunches, his hands on his knees, the wings folded behind. It holds this pose and nothing else moves.
const IDLE: Pose = pose({
  x: -2, y: -14, torso: 66, head: 74,
  legN: { ik: v(2, 3), bend: 1 }, legF: { ik: v(11, 3), bend: 1 },
  armN: { ik: v(12, 21), bend: -1 }, armF: { ik: v(20, 20), bend: -1 },
  p: { wingN: 104, wingF: 96, open: 0.15 },
});
const IDLE_TICK = tweak(IDLE, { head: 82 });

/** Run: he does not run. Stiff, feet off the ground, wings half out, he glides; a slow beat of the wings, the body hardly bobbing. */
function glide(t: number): Pose {
  const a = t * Math.PI * 2;
  const bob = Math.round(Math.sin(a));
  return pose({
    x: 0, y: -2 + bob, torso: 50, head: 66,
    legN: { ik: v(-12, 11 + bob), bend: 1 }, legF: { ik: v(0, 10 + bob), bend: 1 },
    armN: { ik: v(14, 19 + bob), bend: -1 }, armF: { ik: v(27, 18 + bob), bend: -1 },
    p: { wingN: 132 + Math.sin(a) * 8, wingF: 122 + Math.sin(a) * 8, open: 0.75 },
  });
}

// Splinter Talon: nothing, then the near arm is up, then it has come down. A snap, and stillness again.
const ST_WIND = tweak(IDLE, { x: -3, y: -11, torso: 76, head: 76, armN: { up: 124, lo: 96 }, p: { eyes: 1 } });
const ST_RAKE = tweak(IDLE, { x: 9, y: -13, torso: 42, head: 56, armN: { ik: v(36, 22), bend: -1 }, legF: { ik: v(15, 3), bend: 1 }, armF: { ik: v(34, 12), bend: -1 }, p: { jaw: 14, eyes: 1 } });
const ST_HOLD = tweak(ST_RAKE, { armN: { ik: v(35, 16), bend: -1 }, p: { jaw: 6, eyes: 0 } });

// Razor Gale: he rises on his arms, the wings drawn high and back; one beat forward, and the leaves go.
const RG_DRAW = tweak(IDLE, { x: -4, y: -5, torso: 82, head: 84, armN: { ik: v(12, 24), bend: -1 }, armF: { ik: v(22, 24), bend: -1 }, p: { wingN: 142, wingF: 128, open: 1.2, eyes: 1 } });
const RG_BEAT = tweak(IDLE, { x: 4, y: -13, torso: 52, head: 64, p: { wingN: 62, wingF: 48, open: 1.25, jaw: 12, eyes: 1 } });
const RG_AFTER = tweak(RG_BEAT, { p: { wingN: 78, wingF: 64, open: 1.05, jaw: 4, eyes: 0 } });

// Graven Dread: the statue wakes. He rears up to his full height, the wings thrown wide, the jaw dropped, the eyes alight, and holds it; then he is on the enemy.
const GD_REAR = tweak(IDLE, { x: -4, y: -3, torso: 86, head: 84, armN: { up: -40, lo: 40 }, armF: { up: -8, lo: 56 }, legN: { ik: v(-8, 3), bend: 1 }, legF: { ik: v(8, 3), bend: 1 }, p: { wingN: 138, wingF: 44, open: 1.35, jaw: 26, eyes: 2 } });
const GD_LOOM = tweak(GD_REAR, { y: -2, p: { wingN: 134, wingF: 40, open: 1.45, jaw: 32, eyes: 2 } });
const GD_STRIKE = tweak(IDLE, { x: 11, y: -12, torso: 40, head: 54, armN: { ik: v(38, 20), bend: -1 }, armF: { ik: v(40, 14), bend: -1 }, legF: { ik: v(17, 3), bend: 1 }, p: { wingN: 132, wingF: 66, open: 1.3, jaw: 34, eyes: 2 } });
const GD_HOLD = tweak(GD_STRIKE, { p: { jaw: 20, eyes: 1 } });

const HURT = tweak(IDLE, { x: -2, head: 68, p: { chip: 0.5 } });

// Death: the eyes go out and the wood splits; he tips forward all of a piece, like a statue pulled over, and lies on his face, the leaves coming down round him.
const D_SPLIT = tweak(IDLE, { head: 66, p: { cracks: 0.6, eyes: 0, chip: 0.4 } });
const D_TIP = tweak(IDLE, { x: 6, y: -13, torso: 40, head: 48, armN: { ik: v(28, 8), bend: -1 }, armF: { ik: v(36, 8), bend: -1 }, p: { cracks: 1, fall: 0.15, wingN: 128, wingF: 118 } });
const D_FALL = pose({
  x: 14, y: -7, torso: 20, head: 26,
  legN: { up: -128, lo: 200 }, legF: { up: -110, lo: 212 }, footN: 40, footF: 50,
  armN: { up: 2, lo: -6 }, armF: { up: 6, lo: -2 },
  p: { cracks: 1, fall: 0.45, wingN: 170, wingF: 160, open: 0.3, over: 1 },
});
const D_DOWN = pose({
  x: 18, y: -14, torso: 5, head: 8,
  legN: { up: 188, lo: 178 }, legF: { up: 182, lo: 172 }, footN: 176, footF: 168,
  armN: { up: 4, lo: 0 }, armF: { up: 2, lo: -2 },
  p: { cracks: 1, fall: 0.8, wingN: 178, wingF: 170, open: 0.25, over: 1 },
});

// Victory: all he does is lift his head, the eyes kindle, the wings open a little, and it all sets again.
const V_LIFT = tweak(IDLE, { head: 88, p: { eyes: 1 } });
const V_OPEN = tweak(V_LIFT, { p: { wingN: 122, wingF: 110, open: 0.6, eyes: 2 } });

const char: CharDef = {
  id: 'forest_gargoyle',
  name: 'Forest Gargoyle',
  dims: D,
  build,
  footprint: 1.6,
  anims: {
    // one pose; the head ticks once and holds, then ticks back
    idle: { loop: true, frames: keys([[IDLE, 4200], [IDLE_TICK, 1500]]) },
    run: { loop: true, frames: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ pose: glide(i / 8), ms: 110 })) },
    attack1: {
      loop: false,
      frames: keys([
        [IDLE, 160],
        [ST_WIND, 240],
        [ST_RAKE, 80, { smear: true, hit: true }],
        [ST_HOLD, 360],
        [IDLE, 200],
      ]),
    },
    skill: {
      loop: false,
      frames: keys([
        [IDLE, 120],
        [RG_DRAW, 340],
        [RG_BEAT, 90, { event: 'cast' }],
        [RG_AFTER, 150, { hit: true }],
        [RG_AFTER, 320],
        [IDLE, 200],
      ]),
    },
    attack3: {
      loop: false,
      frames: [
        ...tween(D, IDLE, GD_REAR, 2, 110, ease.out),
        ...keys([
          [GD_REAR, 260, { event: 'cast' }],
          [GD_LOOM, 520],
          [GD_STRIKE, 90, { smear: true, hit: true }],
          [GD_HOLD, 380],
          [IDLE, 220],
        ]),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 110],
        [tweak(HURT, { x: -3, p: { chip: 1 } }), 110],
        [IDLE, 90],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [D_SPLIT, 260],
        [D_TIP, 170],
        [D_FALL, 130],
        [D_DOWN, 150],
        [tweak(D_DOWN, { p: { fall: 0.95 } }), 150],
        [tweak(D_DOWN, { p: { fall: 1 } }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [IDLE, 300],
        [V_LIFT, 420],
        [V_OPEN, 900],
        [V_LIFT, 300],
        [IDLE, 200],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// Skill icons
// ---------------------------------------------------------------------------

export const forestGargoyle: ChampionArt = {
  char,
  iconBg: BG,
  icons: {
    splinter_talon: () =>
      compose(BG, glyph((d) => {
        // a hand of wood coming down, three black talons, the streak of its rake behind
        smear(d, v(8, 36), 90, -30, 28, 7, SWING, 1);
        d.capsule({ mat: WD, z: 10, group: 'iarm', tex: grain }, v(4, 37), v(17, 22), 6, 5);
        d.ellipse({ mat: WD, z: 11, group: 'iarm' }, v(19, 20), 7, 6, -50);
        for (const a of [-92, -54, -16]) {
          const b = at(v(19, 20), a, 5);
          d.poly({ mat: CL, z: 12, group: 'iclaw', line: 'soft' }, [at(b, a + 90, 2.4), at(b, a, 15), at(b, a - 90, 2.4)], { kind: 'bevel', w: 0.8 });
        }
      })),
    razor_gale: () =>
      compose(BG, glyph((d) => {
        // sharp leaves flying
        leaf(d, v(4, 27), 12, 25, 5, 10, 'i0');
        leaf(d, v(11, 12), 18, 24, 4.6, 10, 'i1');
        leaf(d, v(2, 8), 34, 13, 3, 9, 'i2');
        leaf(d, v(16, 33), 8, 18, 3.6, 9, 'i3');
      })),
    graven_dread: () =>
      compose(BG, glyph((d) => {
        // his face, seen head on: the wood, the horns, the brow, a dropped jaw
        d.ribbon({ mat: CL, z: 9, group: 'ih' }, [v(13, 27), v(8, 33), v(3, 36)], [2.6, 1.8, 0.5]);
        d.ribbon({ mat: CL, z: 9, group: 'ih' }, [v(27, 27), v(32, 33), v(37, 36)], [2.6, 1.8, 0.5]);
        d.poly({ mat: WD, z: 10, group: 'iface', tex: grain }, [v(11, 31), v(29, 31), v(33, 22), v(29, 10), v(24, 3), v(16, 3), v(11, 10), v(7, 22)], { kind: 'dome', c: v(17, 22), r: 19, bevel: 1.2 });
        d.poly({ mat: CL, z: 11, group: 'imaw', line: 'none' }, [v(14, 15), v(26, 15), v(24, 6), v(16, 6)], { kind: 'flat', n: [0, 0, 1] });
        for (const [a, b] of [[v(10, 25), v(18, 20)], [v(30, 25), v(22, 20)]]) d.capsule({ mat: CL, z: 11, group: 'ibrow', line: 'none' }, a, b, 1, 1);
      }), undefined),
    heartwood: () =>
      compose(BG, glyph((d) => {
        // a cut through a trunk: its rings, sharp leaves round it
        for (const a of [20, 80, 140, 200, 260, 320]) leaf(d, at(v(20, 20), a, 12), a, 8, 2.4, 9, 'il');
        d.circle({ mat: WD, z: 10, group: 'iring' }, v(20, 20), 13);
        for (const [r, c] of [[10, 1], [6.5, 2], [3, 1]] as const) for (let k = 0; k < 48; k++) {
          const p = at(v(20, 20), k * 7.5, r);
          d.pixels({ mat: WD, z: 11, group: 'iring', line: 'none' }, [{ p, c: WD.ramp[c] }]);
        }
      })),
  },
};
