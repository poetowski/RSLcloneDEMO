// Brimhorn (docs/DESIGN_DECISIONS.md section 97, Jakub's brief of 2026-11-07:
// an Elite Tank of the Ashveil Reign, "some bulk demon with red colors and
// horns"): a huge hunched demon on Greyback's build, a little more upright.
// Deep red hide (`demonHide`), a barrel chest and a heavy belly; two great ram
// horns curling forward round the sides of his head and a third horn on the
// brow, broken off and capped in an iron ring (the silhouette feature); broken
// iron shackles on both wrists, a length of chain hanging from each and
// swinging with the travel of his hands; an iron collar with the Reign's white
// bone on it, a dark grey loincloth with the white bone across its flap (the
// standard); cloven hooves, a heavy tail ending in a spade, the Reign's pale
// light in his eyes, ash flaking slowly off his shoulders. Gore lowers his head
// and drives the horns in; Chains of the Pit winds up, spins once and whips both
// chains round, then he roars. His affinity sets nothing here (Jakub,
// 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { RGBA } from '../raster.ts';

const D: Dims = {
  hipH: 31,
  thigh: 15,
  shin: 14.6,
  ankleH: 3,
  footLen: 6.4,
  spine: 26,
  neck: 4,
  upperArm: 17,
  foreArm: 16,
  shoulderDrop: 5,
  shoulderN: -3.8,
  shoulderF: 4.2,
  hipN: -3,
  hipF: 3,
};

const HI = MAT.demonHide, HO = MAT.horn, IR = MAT.iron, CH = MAT.charcoal, BO = MAT.ashBone, LE = MAT.darkleather, DU = MAT.ashClay;
const E = ACCENT;

/** sparse dark flecks keyed to the shape, so the hide reads as hide, not paint */
const hide = (h: { u: number; v: number }) => (Math.sin(h.u * 23 + h.v * 7) > 0.93 ? -1 : 0);

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  // the chains trail the travel of the hands since the last frame, clamped so a fast swing never flips them
  const trail = (now: V, was: V | undefined) => (was ? Math.max(-50, Math.min(50, (now.x - was.x) * 7)) : 0);
  const chN = P.chainN ?? -90 - trail(s.hN, info.prev?.hN);
  const chF = P.chainF ?? -90 - trail(s.hF, info.prev?.hF);

  tail(d, s, P.tail ?? 0, 6);
  limb(d, s.hipF, s.kneeF, s.ankF, s.pose.footF, 10, -1, 'legF', true);
  chain(d, at(s.hF, s.loF, -5.0), chF, P.curlF ?? 0, P.lenF ?? 6, 18, 'chainF', -1);
  limb(d, s.sF, s.eF, s.hF, s.loF, 20, -1, 'armF', false);
  loincloth(d, s, 27, P.flap ?? 0);
  body(d, s, 30);
  collar(d, s, 36);
  head(d, s, P, 38);
  limb(d, s.hipN, s.kneeN, s.ankN, s.pose.footN, 50, 0, 'legN', true);
  limb(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN', false);
  chain(d, at(s.hN, s.loN, -5.0), chN, P.curlN ?? 0, P.lenN ?? 6, 62, 'chainN', 0);
  if (P.ash !== undefined) ash(d, s, P.ash);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

/** A thick limb of red hide: an arm ends in a clawed fist with an iron shackle at the wrist, a leg in a cloven hoof. */
function limb(d: Draw, root: V, mid: V, end: V, endAng: number, z: number, shade: number, g: string, isLeg: boolean) {
  d.capsule({ mat: HI, z, group: g, shade, tex: hide }, root, mid, isLeg ? 6.2 : 5.4, isLeg ? 4.8 : 4.4);
  d.capsule({ mat: HI, z: z + 0.1, group: g, shade, tex: hide }, mid, end, isLeg ? 4.2 : 4.4, isLeg ? 3.0 : 3.4);
  if (!isLeg) {
    d.ellipse({ mat: HI, z: z + 0.3, group: g, shade }, at(end, endAng, 1.8), 3.6, 3.0, endAng);
    // the claws: three dark points past the knuckles
    const px: { p: V; c: RGBA }[] = [];
    for (const k of [-1.6, 0, 1.6]) px.push({ p: at(at(end, endAng, 4.6), endAng + 90, k), c: HO.ramp[shade < 0 ? 3 : 4] });
    d.pixels({ mat: HO, z: z + 0.35, group: g, line: 'none' }, px);
    // the broken shackle: a thick iron band round the wrist, a rivet on it
    const a = at(end, endAng, -6.4), b = at(end, endAng, -3.6);
    d.capsule({ mat: IR, z: z + 0.4, group: g + 'Cuff', shade }, a, b, 3.7, 3.7, 0.3);
    d.pixels({ mat: IR, z: z + 0.45, group: g + 'Cuff', line: 'none' }, [{ p: at(at(end, endAng, -5.0), endAng + 90, 2.4), c: IR.ramp[5] }]);
    return;
  }
  // the hoof: a short block of dark horn split at the front
  const f = d.frame(end, endAng);
  d.capsule({ mat: HI, z: z + 0.2, group: g, shade }, end, f(2.4, -0.4), 3.0, 2.8);
  d.poly({ mat: HO, z: z + 0.3, group: g + 'Hoof', shade }, [f(-2.6, 0), f(-3.0, -3.0), f(6.0, -3.0), f(6.4, -1.2), f(4.6, 0.6), f(-0.6, 1.2)], { kind: 'bevel', w: 1.1 });
  d.pixels({ mat: HO, z: z + 0.35, group: g + 'Hoof', line: 'none' }, [{ p: f(5.0, -2.2), c: HO.ramp[0] }, { p: f(5.0, -1.2), c: HO.ramp[0] }]);
}

/**
 * A length of broken chain from the shackle: `n` links stepping out at `ang`
 * (deg), each turned `curl` deg further than the last; the rings face the eye
 * in turn and edge-on in between, the last one torn open.
 */
function chain(d: Draw, from: V, ang: number, curl: number, n: number, z: number, g: string, shade: number) {
  let p = from, a = ang;
  const px: { p: V; c: RGBA }[] = [];
  for (let i = 0; i < n; i++) {
    const q = at(p, a, 2.7);
    const c = v((p.x + q.x) / 2, (p.y + q.y) / 2);
    if (i % 2 === 0) {
      d.ellipse({ mat: IR, z, group: g, shade }, c, 1.7, 1.1, a);
      if (i < n - 1) px.push({ p: c, c: IR.ramp[0] });
    } else d.capsule({ mat: IR, z: z + 0.05, group: g, shade }, p, q, 0.7, 0.7);
    p = q;
    a += curl;
  }
  d.pixels({ mat: IR, z: z + 0.1, group: g, line: 'none' }, px);
}

/** The great body: a barrel chest, a heavy belly, the muscles of the chest and belly marked in darker red. */
function body(d: Draw, s: Skel, z: number) {
  const pts = torsoPts(s, [
    [-1, 8.4, 9.0],
    [5, 9.2, 11.4],
    [11, 11.0, 12.4],
    [17, 13.0, 12.4],
    [22, 14.2, 11.0],
    [26, 13.4, 7.4],
    [29, 9.6, 3.0],
    [30.4, 4.0, 0.6],
  ]);
  d.poly({ mat: HI, z, group: 'body', tex: hide }, pts, { kind: 'cyl', a: s.T(-1, 0), b: s.T(30.4, 0), r: 13, bevel: 1.4 });
  // the lines of the chest and the belly
  const px: { p: V; c: RGBA }[] = [];
  for (let u = 14; u <= 21; u += 1) px.push({ p: s.T(u, 7.0 - (u - 14) * 0.2), c: HI.ramp[1] });
  for (let w = 3.4; w <= 9.4; w += 1) px.push({ p: s.T(14.2 - (w - 3.4) * 0.3, w), c: HI.ramp[2] });
  for (const u of [6, 9, 12]) for (const w of [5.6, 7.6]) px.push({ p: s.T(u, w), c: HI.ramp[2] });
  d.pixels({ mat: HI, z: z + 0.2, group: 'body', line: 'none' }, px);
}

/** The iron collar round his thick neck, the Reign's white bone hanging from its front. */
function collar(d: Draw, s: Skel, z: number) {
  d.poly({ mat: IR, z, group: 'collar' }, [s.T(23.4, -9.6), s.T(25.6, -9.0), s.T(27.0, 3.2), s.T(25.4, 7.6), s.T(23.2, 7.0), s.T(24.6, 2.6)], { kind: 'cyl', a: s.T(24.4, -9), b: s.T(24.4, 8), r: 3, bevel: 0.8 });
  // the bone: a short shaft, a knob at each end
  const c = s.T(21.6, 7.8);
  d.capsule({ mat: BO, z: z + 0.2, group: 'tagBone' }, v(c.x - 2.6, c.y), v(c.x + 2.6, c.y), 0.8, 0.8);
  for (const dx of [-3.0, 3.0]) d.circle({ mat: BO, z: z + 0.25, group: 'tagBone' }, v(c.x + dx, c.y + 0.4), 1.1);
  d.line({ mat: IR, z: z + 0.1, group: 'tagRing', line: 'none' }, s.T(23.6, 7.2), v(c.x, c.y + 1.2), IR.ramp[3]);
}

/** A dark grey loincloth on a leather belt, the flap at the front hanging straight down, the white bone across it (the standard). */
function loincloth(d: Draw, s: Skel, z: number, flap: number) {
  d.poly({ mat: LE, z: z + 4, group: 'belt' }, [s.T(1.6, -8.4), s.T(3.6, -8.8), s.T(3.8, 10.6), s.T(1.8, 10.2)], { kind: 'cyl', a: s.T(2.6, -9), b: s.T(2.6, 10.6), r: 2.2 });
  const a = s.T(1.8, 3.4), b = s.T(1.8, 10.0);
  const sw = flap * 3;
  const fa = v(a.x - 1 + sw, a.y - 13), fb = v(b.x + sw * 1.2, b.y - 12.4);
  d.poly({ mat: CH, z: z + 4.2, group: 'flap', tex: (h) => (Math.sin(h.v * 9) > 0.8 ? -1 : 0) }, [a, b, fb, v((fa.x + fb.x) / 2 + 0.4, fa.y - 1.4), fa], { kind: 'bevel', w: 1.2 });
  const m = v((a.x + b.x) / 2 + sw * 0.5, (a.y + fa.y) / 2 - 1);
  d.capsule({ mat: BO, z: z + 4.3, group: 'flapBone' }, v(m.x - 2.4, m.y), v(m.x + 2.4, m.y), 0.7, 0.7);
  for (const dx of [-2.8, 2.8]) d.circle({ mat: BO, z: z + 4.35, group: 'flapBone' }, v(m.x + dx, m.y + 0.3), 1.0);
  // the back of the cloth behind the far thigh
  const c = s.T(1.8, -7.8);
  d.poly({ mat: CH, z: z - 18, group: 'flapBack', shade: -1 }, [s.T(1.8, -2), c, v(c.x - 2 - sw, c.y - 11), v(c.x + 3 - sw, c.y - 12)], { kind: 'bevel', w: 1 });
}

/** The heavy tail: thick at the root, down behind him and up at the end into a spade. */
function tail(d: Draw, s: Skel, sway: number, z: number) {
  const r = s.T(3, -7.6);
  const p1 = v(r.x - 6, r.y - 5), p2 = v(r.x - 11 - sway, r.y - 14), p3 = v(r.x - 17 - sway * 2, r.y - 17), p4 = v(r.x - 21 - sway * 2, r.y - 13 + sway);
  d.ribbon({ mat: HI, z, group: 'tail', shade: -1, tex: hide }, [r, p1, p2, p3, p4], [3.4, 2.8, 2.0, 1.4, 1.0]);
  const ang = Math.atan2(p4.y - p3.y, p4.x - p3.x) * 57.29578;
  const f = d.frame(p4, ang);
  d.poly({ mat: HI, z: z + 0.1, group: 'tailTip', shade: -2 }, [f(-1, 0), f(1.4, 2.8), f(5.4, 0), f(1.4, -2.8)], { kind: 'bevel', w: 0.8 });
}

/**
 * The head, sunk low between the shoulders: a heavy brow, a broad jaw with two
 * tusks up from it, pale light in the eyes; two ram horns curling round the
 * sides and a broken horn on the brow, capped in iron.
 */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  const jaw = P.jaw ?? 0;
  hornCurl(d, s, 5.6, -3.0, z - 1.2, -1);
  d.capsule({ mat: HI, z: z - 0.5, group: 'neck', tex: hide }, s.neck, H(-1, -2), 4.6, 4.4);
  d.ellipse({ mat: HI, z, group: 'skull', tex: hide }, H(-0.8, 1.2), 6.2, 6.0, s.headDir - 90);
  d.poly(
    { mat: HI, z: z + 0.1, group: 'face', tex: hide },
    [H(1.0, 3.6), H(5.6, 3.0), H(6.8, 1.0), H(7.8, -1.4), H(7.6, -4.4 - jaw * 1.4), H(4.8, -6.4 - jaw * 2), H(0.6, -5.8 - jaw * 1.4), H(-1.6, -2.4)],
    { kind: 'dome', c: H(3.6, -1.2), r: 7.4, bevel: 1 },
  );
  d.ribbon({ mat: HI, z: z + 0.15, group: 'brow', shade: -1, line: 'none' }, [H(1.6, 2.8), H(4.4, 3.2), H(6.8, 2.0)], [1.1, 1.2, 0.8]);
  // the tusks up from the lower jaw
  for (const [x, k] of [[6.8, 0], [4.6, -1]] as const) {
    const b = H(x, -4.6 - jaw * 1.8);
    d.poly({ mat: BO, z: z + 0.3 + k * 0.01, group: 'tusk' + x, shade: k }, [v(b.x - 0.9, b.y), v(b.x + 0.9, b.y), v(b.x + 0.3, b.y + 3.0)], { kind: 'bevel', w: 0.4 });
  }
  const px: { p: V; c: RGBA }[] = [];
  px.push({ p: H(7.4, -1.4), c: HI.ramp[0] });
  if (jaw > 0.3) for (const x of [3.4, 4.4, 5.4, 6.2]) px.push({ p: H(x, -3.6), c: INK.black }), px.push({ p: H(x, -4.4 - jaw), c: INK.black });
  else for (const x of [3.0, 4.0, 5.0, 6.0]) px.push({ p: H(x, -3.8), c: HI.ramp[0] });
  if (P.dead) px.push({ p: H(4.4, 1.2), c: HI.ramp[0] }, { p: H(5.2, 1.2), c: HI.ramp[0] });
  else px.push({ p: H(4.4, 1.2), c: E.ashEye }, { p: H(5.2, 1.2), c: E.white }, { p: H(4.4, 0.4), c: E.ashEyeDim });
  d.pixels({ mat: HI, z: z + 0.2, group: 'face', line: 'none' }, px);
  // the broken horn on the brow, its stump capped by an iron ring
  const r0 = H(2.6, 4.4), r1 = H(3.8, 7.6);
  d.capsule({ mat: HO, z: z + 0.4, group: 'brokenHorn' }, r0, r1, 1.9, 1.6, 0.4);
  const ring: { p: V; c: RGBA }[] = [];
  for (const k of [-1.6, -0.6, 0.4, 1.4]) ring.push({ p: at(H(3.4, 6.6), s.headDir - 90 + 90 - 90, k), c: IR.ramp[k < 0 ? 4 : 3] });
  d.pixels({ mat: IR, z: z + 0.45, group: 'brokenHorn', line: 'none' }, ring);
  d.pixels({ mat: HO, z: z + 0.45, group: 'brokenHorn', line: 'none' }, [{ p: r1, c: HO.ramp[4] }, { p: H(3.0, 7.8), c: HO.ramp[3] }]);
  hornCurl(d, s, 0, 0, z + 0.6, 0);
}

/** A great horn: up and back off the crown, then curling over and forward to a point above the brow, ridged across. */
function hornCurl(d: Draw, s: Skel, dx: number, dy: number, z: number, shade: number) {
  const H = (x: number, y: number) => s.H(x + dx, y + dy);
  const pts = [H(-0.6, 4.6), H(-4.4, 8.4), H(-7.4, 12.8), H(-7.0, 17.4), H(-3.4, 20.4), H(1.6, 21.0), H(5.8, 19.2), H(8.4, 15.6)];
  const radii = [2.8, 3.2, 3.0, 2.7, 2.3, 1.8, 1.2, 0.5];
  d.ribbon({ mat: HO, z, group: 'horn' + shade, shade }, pts, radii);
  // the ridges: short dark lines across the horn
  const px: { p: V; c: RGBA }[] = [];
  for (let i = 1; i < pts.length - 2; i++) {
    const a = pts[i], b = pts[i + 1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 57.29578;
    const m = v((a.x + b.x) / 2, (a.y + b.y) / 2);
    const r = (radii[i] + radii[i + 1]) / 2 - 0.6;
    for (let k = -r; k <= r; k += 0.9) px.push({ p: at(m, ang + 90, k), c: HO.ramp[shade < 0 ? 0 : 1] });
  }
  px.push({ p: pts[pts.length - 1], c: HO.ramp[5] });
  d.pixels({ mat: HO, z: z + 0.05, group: 'horn' + shade, line: 'none' }, px);
}

/** Ash flaking off his shoulders, drifting up slowly: three flakes on a loop, `t` 0..1 round it. */
function ash(d: Draw, s: Skel, t: number) {
  const px: { p: V; c: RGBA }[] = [];
  for (const [u, w, ph] of [[25, -6, 0], [23.6, 2, 0.4], [26, -1, 0.7]] as const) {
    const k = (t + ph) % 1;
    const b = s.T(u, w);
    px.push({ p: v(b.x - k * 3, b.y + 2 + k * 9), c: k < 0.6 ? DU.ramp[4] : DU.ramp[2] });
  }
  d.pixels({ mat: DU, z: 70, group: 'ash', line: 'none', outline: false }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// At rest: hunched over his fists, head low, the chains hanging from his wrists.
const IDLE = pose({
  y: -1, torso: 72, head: 58,
  legN: { ik: v(-7, 3) }, legF: { ik: v(8, 3) },
  armN: { ik: v(17, 21), bend: -1 }, armF: { ik: v(21, 22), bend: -1 },
  p: { jaw: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -1 - b, torso: 72 - b, armN: { ik: v(17, 21 - b), bend: -1 }, armF: { ik: v(21, 22 - b), bend: -1 }, p: { ash: t, tail: Math.sin(a) * 0.6 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -9 * Math.cos(ph), y: 3 + (sn > 0 ? 5 * sn : 0), ang: sn > 0 ? -20 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.sin(a);
  return pose({
    y: bob - 2, torso: 64, head: 50,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armN: { ik: v(16 + sw * 7, 24), bend: -1 }, armF: { ik: v(20 - sw * 7, 25), bend: -1 },
    p: { jaw: 0.2, tail: sw, flap: -0.6 },
  });
}

// Gore: he draws back, lowers his head until the horns point at the enemy, and drives them in.
const G_DRAW = pose({ x: -4, y: -1, torso: 80, head: 40, legN: { ik: v(-10, 3) }, legF: { ik: v(6, 3) }, armN: { ik: v(10, 22), bend: -1 }, armF: { ik: v(14, 24), bend: -1 }, p: { jaw: 0.4, tail: 1 } });
const G_LOW = pose({ x: -2, y: -3, torso: 56, head: 6, legN: { ik: v(-11, 3) }, legF: { ik: v(7, 3) }, armN: { ik: v(12, 16), bend: -1 }, armF: { ik: v(16, 18), bend: -1 }, p: { jaw: 0.2, tail: 1.4 } });
const G_RAM = pose({ x: 9, y: -4, torso: 44, head: -8, legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) }, footN: -10, armN: { ik: v(8, 14), bend: -1 }, armF: { ik: v(12, 16), bend: -1 }, p: { jaw: 0.8, tail: -1, flap: 1 } });
const G_HOLD = tweak(G_RAM, { x: 8, p: { jaw: 0.4, tail: -0.6, flap: 0.6 } });

// Chains of the Pit: he winds both chains up behind him, turns once, and whips them round through the enemies; then he roars.
const CP_WIND = pose({ x: -2, y: -2, torso: 82, head: 70, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, armN: { ik: v(-12, 40), bend: -1 }, armF: { ik: v(-8, 44), bend: -1 }, p: { chainN: 150, curlN: 8, chainF: 140, curlF: 8, lenN: 8, lenF: 8, jaw: 0.4, tail: -1 } });
const CP_TURN = pose({ x: 1, y: -2, torso: 84, head: 80, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, armN: { ik: v(14, 44), bend: -1 }, armF: { ik: v(-12, 42), bend: -1 }, p: { turn: 1, chainN: 40, curlN: -10, chainF: 170, curlF: 6, lenN: 8, lenF: 8, jaw: 0.6, flap: 1 } });
const CP_WHIP = pose({ x: 6, y: -3, torso: 74, head: 64, legN: { ik: v(-11, 3) }, legF: { ik: v(12, 3) }, armN: { ik: v(30, 38), bend: -1 }, armF: { ik: v(26, 34), bend: -1 }, p: { chainN: 6, curlN: -3, chainF: -4, curlF: -4, lenN: 8, lenF: 8, jaw: 1, flap: 1, tail: 1 } });
const CP_FOLLOW = pose({ x: 5, y: -3, torso: 70, head: 60, legN: { ik: v(-11, 3) }, legF: { ik: v(12, 3) }, armN: { ik: v(22, 22), bend: -1 }, armF: { ik: v(20, 20), bend: -1 }, p: { chainN: -40, curlN: -8, chainF: -50, curlF: -8, lenN: 8, lenF: 8, jaw: 0.6, flap: 0.6, tail: 0.6 } });
const CP_ROAR = pose({ x: 0, y: 0, torso: 92, head: 104, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, armN: { ik: v(-6, 46), bend: 1 }, armF: { ik: v(26, 50), bend: -1 }, p: { jaw: 1, tail: -0.6 } });

const HURT = pose({ x: -4, y: -1, torso: 82, head: 74, legN: { ik: v(-10, 3) }, legF: { ik: v(7, 4) }, footF: 10, armN: { ik: v(10, 24), bend: -1 }, armF: { ik: v(14, 26), bend: -1 }, p: { jaw: 0.8, tail: 1 } });

// Death: he sinks onto his knees, braces on a fist, and topples onto his side.
const DEATH_KNEEL = pose({ x: 0, y: -12, torso: 66, head: 40, legN: { ik: v(-12, 3) }, legF: { ik: v(6, 3) }, footN: -30, armN: { ik: v(20, 6), bend: -1 }, armF: { ik: v(24, 8), bend: -1 }, p: { jaw: 0.4, tail: 0.4 } });
const DEATH_FALL = pose({ x: 2, y: -8, torso: 30, head: 10, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { jaw: 0.3, chainN: -10, chainF: -20 } });
const DEATH_DOWN = pose({ x: 6, y: -15, torso: 4, head: -4, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { dead: 1, jaw: 0.2, chainN: 0, curlN: -2, chainF: 4, curlF: -2 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'brimhorn',
  name: 'Brimhorn',
  dims: D,
  build,
  footprint: 1.4,
  anims: {
    idle: { loop: true, frames: cycle(8, 210, idle) },
    run: { loop: true, frames: cycle(8, 82, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, G_DRAW, 2, 100, ease.out),
        ...keys([
          [G_DRAW, 160],
          [G_LOW, 140],
          [G_RAM, 80, { hit: true }],
          [G_HOLD, 240],
        ]),
        ...tween(D, G_HOLD, IDLE, 3, 120, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CP_WIND, 2, 110, ease.out),
        ...keys([
          [CP_WIND, 200],
          [CP_TURN, 80],
          [CP_WHIP, 90, { hit: true }],
          [CP_FOLLOW, 160],
          [mid(CP_FOLLOW, CP_ROAR, 0.5), 100],
          [CP_ROAR, 120, { event: 'cast' }],
          [CP_ROAR, 380],
        ]),
        ...tween(D, CP_ROAR, IDLE, 3, 130, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 78, head: 68 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 260],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -15.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CP_ROAR, 2, 120, ease.out),
        ...keys([
          [CP_ROAR, 900],
          [mid(CP_ROAR, IDLE, 0.5), 130],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// icons
// ---------------------------------------------------------------------------

/** A big ram horn for the icons: the same curl as the sprite's, drawn large. */
function iconHorn(d: Draw, c: V, k: number, z: number) {
  const P = (x: number, y: number) => v(c.x + x * k, c.y + y * k);
  const pts = [P(4, 8), P(-2, 12), P(-9, 10), P(-12, 3), P(-10, -4), P(-4, -8), P(2, -7), P(6, -3)];
  d.ribbon({ mat: HO, z, group: 'ih' + z }, pts, [3.6, 4.2, 4.4, 4.0, 3.4, 2.6, 1.8, 0.8].map((r) => r * k));
}

export const brimhorn: ChampionArt = {
  char,
  iconBg: HI,
  icons: {
    gore: () =>
      compose(HI, glyph((d) => {
        iconHorn(d, v(18, 20), 1.3, 10);
      }), (b) => {
        for (const [x, y] of [[33, 26], [35, 22], [34, 30], [36, 26]] as const) b.set(x, y, E.white);
      }),
    chains_of_the_pit: () =>
      compose(HI, glyph((d) => {
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          const c = v(20 + Math.cos(a) * 12, 20 + Math.sin(a) * 12);
          if (i % 2 === 0) d.ellipse({ mat: IR, z: 10, group: 'ic' }, c, 2.6, 1.8, (a * 57.29578) + 90);
          else d.circle({ mat: IR, z: 10.1, group: 'ic' }, c, 1.2);
        }
        d.capsule({ mat: IR, z: 11, group: 'icuff' }, v(16, 20), v(24, 20), 5, 5, 0.3);
      })),
  },
};
