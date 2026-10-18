// The Rot Hulk (docs/DESIGN_DECISIONS.md section 29, Jakub's brief of
// 2026-10-18): the Ashveil Reign's second champion, a Common, Tank, Ember. A
// big, fat abomination in patches of many colours, "not any legendary hero
// just a rot bulk of entry level". So he is a hunched, bloated hulk sewn
// together out of the dead flesh of many: a body of rotted grey-green with a
// corpse-pale belly, a bruised purple chest and a jaundiced hip stitched on in
// crude black thread, a square of old leather sewn over his hump, iron staples
// where the seams gave; mismatched arms ending in great mitts, the near one
// grey-green with a bruised forearm and a pale hand, the far one bruised and
// bound in dirty bandages; stumpy legs; a small, pale, stitched head sunk low
// between his shoulders, a milky eye and a small dark one, a slack mouth of
// crooked teeth that drools; a rusty meat hook stuck in his hump with a length
// of chain; a few flies that never leave him. A dark grey rag with a white
// bone is tied round his arm: the Reign's standard. He fights with his fists:
// Putrid Slam brings both down on one enemy, and the rot splashes. Everything
// the brief leaves open is a first take; nothing in the look comes from his
// affinity (affinities are abstract, Jakub, 2026-10-11).
//
// Pose channels: `breath` swells the belly (0..1), `jaw` opens the mouth
// (degrees), `flies` turns the flies round his head (one orbit a unit), `drip`
// lets a drop of drool fall (0..1), `gas` puffs rot as he falls (0..1).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { smear, torsoPts } from '../parts.ts';
import { add, at, D2R, dir, Dims, Draw, ease, lerpPose, mul, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 29,
  thigh: 12,
  shin: 11.5,
  ankleH: 3,
  footLen: 7.5,
  spine: 30,
  neck: 3,
  upperArm: 15,
  foreArm: 14,
  shoulderDrop: 8,
  shoulderN: -9,
  shoulderF: 6,
  hipN: -6,
  hipF: 6,
};

const RG = MAT.rotGreen, RP = MAT.rotPale, BR = MAT.bruise, JA = MAT.jaundice, BI = MAT.bile, LE = MAT.leather, BA = MAT.bandage, IR = MAT.iron, RU = MAT.rust, CH = MAT.charcoal, BN = MAT.ashBone;
const E = ACCENT;
/** the crude black thread of his seams */
const THREAD = BR.ramp[0];

/** The streak of his fists: a dull pale smear with the sick green of the rot at its edge. */
const SWING = { core: RP.ramp[5], edge: BI.ramp[3] };

/** The body's outline, torso-local [u up from the pelvis, half-width behind, half-width before]: a belly hanging forward, a hump behind. */
const ROWS: [number, number, number][] = [
  [-4, 9, 11],
  [0, 14, 17],
  [5, 17, 22],
  [10, 18, 24],
  [15, 18, 23],
  [20, 17.5, 20],
  [25, 16, 15],
  [29, 13.5, 10],
  [33, 10, 5],
  [36, 6, 1.5],
  [37.5, 2, 0],
];

/** The outline swelling with a breath: the belly most. */
const breathing = (b: number): [number, number, number][] => ROWS.map(([u, bk, fr]) => [u, bk + b * 0.35, fr + b * (u > 1 && u < 20 ? 1.2 : 0.35)]);

/** The body's half-width at height u, behind (side -1) or before (side 1). */
function edgeAt(rows: [number, number, number][], u: number, side: -1 | 1): number {
  for (let i = 1; i < rows.length; i++) {
    const [u0, b0, f0] = rows[i - 1], [u1, b1, f1] = rows[i];
    if (u <= u1) {
      const t = Math.max(0, (u - u0) / (u1 - u0));
      return side < 0 ? b0 + (b1 - b0) * t : f0 + (f1 - f0) * t;
    }
  }
  return 0;
}

/** Rot on the flesh: darker blotches keyed to the shape (they stay put as he breathes). */
const mottle = (h: { u: number; v: number }) => {
  const a = Math.sin(h.u * 23.1 + h.v * 4.3) + Math.sin(h.u * 9.7 - h.v * 7.9);
  return a > 1.45 ? -1 : a < -1.7 ? 1 : 0;
};

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const rows = breathing(P.breath ?? 0);

  // the legs under the belly, the far arm behind the body
  stumpLeg(d, s, 'F', 10, -1);
  heavyArm(d, s, 'F', 14, -1);
  stumpLeg(d, s, 'N', 26, 0);

  body(d, s, rows, 30);
  hook(d, s, rows, P, 33);

  head(d, s, P, 40);

  // the near arm in front, the smear of the slam
  if (info.def.smear && info.prev) smear(d, s.sN, info.prev.upN, s.upN, D.upperArm + D.foreArm + 4, 7, SWING, 49);
  heavyArm(d, s, 'N', 50, 0);
  token(d, s, 51);

  flies(d, s, P, 60);
  gas(d, s, P, 61);
}

// ---------------------------------------------------------------------------
// The body: a patchwork of dead flesh, stitched and stapled
// ---------------------------------------------------------------------------

/** A patch on one side of the body: from the outline (side 1 front, -1 back) in to a wavering seam, between heights u0 and u1. */
function sidePatch(rows: [number, number, number][], side: -1 | 1, u0: number, u1: number, seam: (u: number) => number): [number, number][] {
  const pts: [number, number][] = [];
  for (let u = u0; u <= u1 + 1e-6; u += 1) pts.push([u, side * edgeAt(rows, u, side) * 0.99]);
  for (let u = u1; u >= u0 - 1e-6; u -= 1) pts.push([u, seam(u)]);
  return pts;
}

/** Stitches along a seam: the thread, and a cross-stitch over it every few pixels. */
function stitches(d: Draw, s: Skel, pts: [number, number][], z: number, group: string) {
  const T = s.T;
  const px: { p: V; c: RGBA }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [u0, w0] = pts[i], [u1, w1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(u1 - u0, w1 - w0) * 1.5));
    for (let k = 0; k < n; k++) {
      const u = u0 + ((u1 - u0) * k) / n, w = w0 + ((w1 - w0) * k) / n;
      px.push({ p: T(u, w), c: THREAD });
      // a cross-stitch: a short bar across the seam, every few steps
      if ((i * n + k) % 5 === 2) {
        const nu = -(w1 - w0), nw = u1 - u0, l = Math.hypot(nu, nw) || 1;
        px.push({ p: T(u + nu / l, w + nw / l), c: THREAD }, { p: T(u - nu / l, w - nw / l), c: THREAD });
      }
    }
  }
  // decals: no separation line round them, or every stitch grows a dark ring
  d.pixels({ mat: BR, z, group, line: 'none' }, px);
}

function body(d: Draw, s: Skel, rows: [number, number, number][], z: number) {
  const T = s.T;
  const nm = { kind: 'cyl' as const, a: T(-4, 0), b: T(38, 0), r: 21, bevel: 1.4 };
  // the base: rotted grey-green
  d.poly({ mat: RG, z, group: 'body', tex: mottle }, torsoPts(s, rows), nm);
  const patch = (pts: [number, number][], mat: typeof RG, zz: number, group: string) =>
    d.poly({ mat, z: zz, group, tex: mottle, line: 'none' }, pts.map(([u, w]) => T(u, w)), nm);
  // the belly: corpse pale, hanging forward
  const bellySeam = (u: number) => 6 + Math.sin(u * 0.6) * 1.8;
  const belly = sidePatch(rows, 1, -1, 18, bellySeam);
  patch(belly, RP, z + 0.1, 'pBelly');
  // the chest: a purple bruise
  const chestSeam = (u: number) => 1 + Math.sin(u * 0.8) * 1.4;
  const chest = sidePatch(rows, 1, 20, 33, chestSeam);
  patch(chest, BR, z + 0.11, 'pChest');
  // the hip behind: jaundiced yellow
  const hipSeam = (u: number) => -9 - Math.sin(u * 0.9) * 1.4;
  const hip = sidePatch(rows, -1, -3, 13, hipSeam);
  patch(hip, JA, z + 0.12, 'pHip');
  // a square of old leather sewn over the hump
  const sq: [number, number][] = [[24, -14.5], [31.5, -11.5], [30, -6], [22.5, -8.4]];
  patch(sq, LE, z + 0.13, 'pLeather');
  // the seams: each patch's inner edge, the belly's long cut, the leather square all round
  stitches(d, s, belly.slice(Math.floor(belly.length / 2)), z + 0.3, 'seamBelly');
  stitches(d, s, chest.slice(Math.floor(chest.length / 2)), z + 0.31, 'seamChest');
  stitches(d, s, hip.slice(Math.floor(hip.length / 2)), z + 0.32, 'seamHip');
  stitches(d, s, [...sq, sq[0]], z + 0.33, 'seamLeather');
  stitches(d, s, [[1, 13.6], [5, 14.8], [10, 15.2], [15, 14.4], [18, 12.8]], z + 0.34, 'seamCut');
  // iron staples where a seam gave, rust round them
  const px: { p: V; c: RGBA }[] = [];
  for (const [u, w] of [[9, 7.4], [24, 2.6], [6, -10.4]] as const) {
    px.push({ p: T(u + 1, w), c: IR.ramp[4] }, { p: T(u, w), c: IR.ramp[3] }, { p: T(u - 1, w), c: IR.ramp[2] }, { p: T(u - 1, w - 0.9), c: RU.ramp[2] });
  }
  // drips of the rot oozing from the belly's cut
  for (const [u, w, c] of [[4.2, 14.9, 3], [3.2, 14.9, 4], [12.2, 15.1, 3]] as const) px.push({ p: T(u, w), c: BI.ramp[c] });
  d.pixels({ mat: IR, z: z + 0.4, group: 'staples', line: 'none' }, px);
}

/** A rusty meat hook stuck in his hump: the shank out of the flesh, the hook curling over and down to a point, a length of chain from its eye. */
function hook(d: Draw, s: Skel, rows: [number, number, number][], P: Record<string, number>, z: number) {
  const T = s.T;
  const root = T(30, -edgeAt(rows, 30, -1) + 2);
  const back = s.torso + 90;
  // the shank, rising back out of the flesh
  const top = at(root, back - 30, 7);
  d.capsule({ mat: IR, z, group: 'hook', tex: (h) => (Math.sin(h.u * 9) > 0.5 ? -1 : 0) }, root, top, 1.1, 1.0);
  // the hook: an arc over the top and down, tapering to its point
  const c = at(top, back + 60, 3.2);
  const pts: V[] = [];
  for (let k = 0; k <= 6; k++) pts.push(at(c, back - 120 + k * 30, 3.2));
  d.ribbon({ mat: IR, z: z + 0.05, group: 'hook' }, pts, [1.0, 1.0, 0.95, 0.85, 0.7, 0.5, 0.3]);
  d.pixels({ mat: IR, z: z + 0.07, group: 'hook', line: 'none' }, [{ p: at(top, back - 30, -1.5), c: RU.ramp[3] }, { p: pts[2], c: RU.ramp[2] }, { p: pts[4], c: RU.ramp[3] }]);
  // the chain hangs from the shank, swaying with the body
  const sway = (P.breath ?? 0) * 6 - (s.torso - 78) * 0.6;
  let p = at(at(root, back - 30, 3.5), -90 + sway, 1.4);
  for (let k = 0; k < 4; k++) {
    const flatLink = k % 2 === 0;
    d.ellipse({ mat: k % 2 ? IR : RU, z: z + 0.1 + k * 0.01, group: 'chain' + k }, p, flatLink ? 1.5 : 0.7, flatLink ? 0.9 : 1.5, -90 + sway);
    p = at(p, -90 + sway + k * 3, 2.4);
  }
}

// ---------------------------------------------------------------------------
// Limbs: heavy, mismatched arms with mitts of hands; stumpy legs
// ---------------------------------------------------------------------------

function heavyArm(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const near = side === 'N';
  const sh = near ? s.sN : s.sF, el = near ? s.eN : s.eF, ha = near ? s.hN : s.hF;
  const lo = near ? s.loN : s.loF;
  const g = 'arm' + side;
  const upper = near ? RG : BR, fore = BR, hand = near ? RP : RG;
  // the shoulder's lump, the upper arm
  d.circle({ mat: upper, z, group: g, shade, tex: mottle }, sh, 5.2);
  d.capsule({ mat: upper, z: z + 0.05, group: g, shade, tex: mottle }, sh, el, 4.6, 4.0);
  // the forearm, swollen toward the wrist; a seam at the elbow where it was sewn on
  d.capsule({ mat: fore, z: z + 0.1, group: g + 'f', shade, tex: mottle }, el, ha, 4.0, 4.8);
  const elbowSeam = [at(el, lo + 90, 3.8), at(at(el, lo, 1.2), lo - 90, 4.0)];
  if (near) d.line({ mat: fore, z: z + 0.12, group: g + 'f' }, elbowSeam[0], elbowSeam[1], THREAD);
  // the far forearm bound in dirty bandages
  if (!near) {
    for (const t of [0.25, 0.5, 0.72]) {
      const c = add(el, mul(v(ha.x - el.x, ha.y - el.y), t));
      d.capsule({ mat: BA, z: z + 0.15 + t * 0.01, group: g + 'b' + t, shade, line: 'soft' }, at(c, lo + 90, 4.4 + t), at(c, lo - 90, 4.4 + t), 1.0, 1.0);
    }
  }
  // the hand: a great mitt, three thick fingers curled
  d.ellipse({ mat: hand, z: z + 0.2, group: g + 'h', shade, tex: mottle }, at(ha, lo, 1.5), 4.6, 4.0, lo);
  for (const [da, l] of [[-28, 3.4], [0, 3.8], [26, 3.2]] as const) {
    const a = lo + da;
    d.capsule({ mat: hand, z: z + 0.22 + da * 0.001, group: g + 'k' + da, shade, line: 'soft' }, at(at(ha, lo, 3.4), a, 0.5), at(at(ha, lo, 3.4), a, l), 1.5, 1.3);
  }
}

function stumpLeg(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const near = side === 'N';
  const hip = near ? s.hipN : s.hipF, kn = near ? s.kneeN : s.kneeF, an = near ? s.ankN : s.ankF;
  const footAng = near ? s.pose.footN : s.pose.footF;
  const g = 'leg' + side;
  const thigh = near ? RG : RP, shin = near ? JA : RP;
  d.capsule({ mat: thigh, z, group: g, shade, tex: mottle }, hip, kn, 6.2, 5.2);
  d.capsule({ mat: shin, z: z + 0.1, group: g + 's', shade, tex: mottle }, kn, an, 5.0, 4.4);
  // a seam at the knee; rags wound round the near shin
  if (near) {
    const ang = Math.atan2(an.y - kn.y, an.x - kn.x) / D2R;
    d.line({ mat: shin, z: z + 0.12, group: g + 's' }, at(kn, ang + 90, 4.6), at(kn, ang - 90, 4.6), THREAD);
    for (const t of [0.45, 0.7]) {
      const c = add(kn, mul(v(an.x - kn.x, an.y - kn.y), t));
      d.capsule({ mat: BA, z: z + 0.15 + t * 0.01, group: g + 'r' + t, shade, line: 'soft' }, at(c, ang + 90, 4.7), at(c, ang - 90, 4.7), 1.0, 1.0);
    }
  }
  // a broad bare foot, three toes
  const f = d.frame(an, footAng);
  d.poly({ mat: thigh, z: z + 0.2, group: g + 'ft', shade }, [f(-3.2, 3.4), f(-4.2, 0), f(-3.6, -3), f(7.6, -3), f(8.8, -1.4), f(6.4, 0.6), f(2.4, 2.2)], { kind: 'bevel', w: 1.8 });
  for (const w of [-2.4, -1.0]) d.line({ mat: thigh, z: z + 0.21, group: g + 'ft' }, f(5.6, w), f(8.2, w + 0.3), thigh.ramp[1]);
}

// ---------------------------------------------------------------------------
// The head: small, pale, stitched, sunk between the shoulders
// ---------------------------------------------------------------------------

function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  const ha = s.headDir - 90;
  const jaw = P.jaw ?? 0;
  // the lumpy pate and the jaw hanging under it
  d.ellipse({ mat: RP, z, group: 'head', tex: mottle }, H(-0.6, 1.0), 6.8, 6.0, ha);
  const hx = -0.6, hy = -1.6;
  const c = Math.cos(-jaw * D2R), sn = Math.sin(-jaw * D2R);
  const J = (x: number, y: number) => H(hx + (x - hx) * c - (y - hy) * sn, hy + (x - hx) * sn + (y - hy) * c);
  d.poly({ mat: RP, z: z - 0.05, group: 'jaw' }, [J(-2.6, -0.6), J(-2.0, -3.6), J(1.6, -5.4), J(5.0, -5.0), J(6.6, -3.6), J(6.4, -2.4), J(2.0, -2.0)], { kind: 'dome', c: J(2.4, -3.4), r: 5, bevel: 0.8 });
  // the mouth: a slack dark gash, crooked teeth; drool
  const px: { p: V; c: RGBA }[] = [];
  for (let x = 2.0; x <= 6.0; x += 0.5) px.push({ p: J(x, -2.6 - (x - 4) * 0.1), c: INK.eye });
  for (const [x, up] of [[2.6, 1], [3.8, 0], [5.2, 1]] as const) px.push({ p: J(x, -2.6 + up * 0.6), c: BN.ramp[4] });
  if (jaw > 6) for (let x = 2.4; x <= 5.6; x += 0.5) px.push({ p: J(x, -3.3), c: INK.eye }, { p: H(x, -2.4), c: INK.eye });
  // the brow, heavy; the milky near eye and the small dark far one
  for (let x = 1.0; x <= 6.0; x += 0.5) px.push({ p: H(x, 2.4 - (x - 3.5) * 0.08), c: RP.ramp[1] });
  px.push({ p: H(2.6, 1.0), c: RP.ramp[5] }, { p: H(3.2, 1.0), c: E.ashEye }, { p: H(2.6, 0.4), c: RP.ramp[4] }, { p: H(3.2, 0.4), c: RP.ramp[3] }, { p: H(2.9, 0.7), c: RP.ramp[2] });
  px.push({ p: H(5.4, 1.0), c: INK.eye }, { p: H(5.4, 0.5), c: RP.ramp[1] });
  // the nose: a flat stub, two dark holes
  px.push({ p: H(6.3, -0.6), c: RP.ramp[1] }, { p: H(5.8, -0.9), c: INK.eye });
  // the seam across his scalp, a few lank hairs
  for (const [x, y] of [[-4.6, 3.6], [-3.4, 4.6], [-2.0, 5.4], [-0.6, 5.8], [0.8, 5.8]] as const) px.push({ p: H(x, y), c: THREAD }, { p: H(x + 0.3, y + 0.9), c: THREAD });
  for (const [x, y, l] of [[-3.6, 5.6, 2], [-1.2, 6.2, 3], [-5.6, 3.2, 2]] as const) for (let k = 0; k < l; k++) px.push({ p: H(x - k * 0.6, y + k * 0.8), c: MAT.hairDark.ramp[2] });
  // drool falling from the lip
  const drip = P.drip ?? 0;
  px.push({ p: J(4.6, -4.6), c: BI.ramp[3] });
  if (drip > 0) px.push({ p: v(J(4.6, -5.4).x, J(4.6, -5.4).y - drip * 9), c: BI.ramp[4] });
  d.pixels({ mat: RP, z: z + 0.2, group: 'head', line: 'none' }, px);
}

/** The Reign's token: a dark grey rag tied round the near upper arm, a white bone across it. */
function token(d: Draw, s: Skel, z: number) {
  const c = at(s.sN, s.upN, 6.2);
  const a = s.upN + 90;
  d.capsule({ mat: CH, z, group: 'rag', shade: -1 }, at(c, a, 4.8), at(c, a, -4.8), 1.8, 1.8);
  // its knot and the hanging end
  d.poly({ mat: CH, z: z + 0.05, group: 'rag', shade: -1 }, [at(c, a, -4.2), at(at(c, a, -5.6), s.upN, 3.6), at(at(c, a, -3.8), s.upN, 3.2)], { kind: 'flat', n: [0, 0, 1] });
  // the bone: a white shaft, knobs at its ends
  const f = d.frame(c, a);
  d.pixels({ mat: CH, z: z + 0.1, group: 'rag', line: 'none' }, [
    { p: f(-1.2, 0), c: BN.ramp[5] }, { p: f(0, 0), c: BN.ramp[4] }, { p: f(1.2, 0), c: BN.ramp[4] },
    { p: f(-2.2, 0.6), c: BN.ramp[5] }, { p: f(-2.2, -0.6), c: BN.ramp[4] }, { p: f(2.2, 0.6), c: BN.ramp[4] }, { p: f(2.2, -0.6), c: BN.ramp[3] },
  ]);
}

/** The flies that never leave him: three, circling his head, each on its own orbit (whole orbits per loop). */
function flies(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  if (P.flies === undefined) return;
  const c = s.H(0, 3);
  const px: { p: V; c: RGBA }[] = [];
  [[11, 5, 1, 0], [8, 6, 2, 0.4], [14, 4, -1, 0.7]].forEach(([rx, ry, turns, ph], k) => {
    const a = (P.flies * turns + ph) * Math.PI * 2;
    const p = v(Math.round(c.x + Math.cos(a) * rx), Math.round(c.y + 3 + Math.sin(a) * ry + k * 2));
    px.push({ p, c: INK.black });
    // a wing catching the light every other frame
    if (Math.round(P.flies * 16 + k) % 2 === 0) px.push({ p: v(p.x, p.y + 1), c: E.ashEyeDim });
  });
  d.pixels({ mat: RG, z, group: 'flies', outline: false, line: 'none' }, px);
}

/** A puff of rot as he falls (`gas` 0..1): sick green and bruise grey rising off him, spreading and thinning away. */
function gas(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const k = P.gas ?? 0;
  if (k <= 0) return;
  // from the belly's middle, rising in the world, not along the body
  const c = s.T(14, 6);
  const px: { p: V; c: RGBA }[] = [];
  const n = Math.round(34 * (1 - k * 0.55));
  for (let i = 0; i < n; i++) {
    const a = i * 2.4, r = (2 + (i % 7) * 2.1) * (0.55 + k * 0.75);
    const p = v(Math.round(c.x + Math.cos(a) * r * 1.5), Math.round(c.y + 12 + k * 12 + Math.sin(a) * r * 0.6));
    px.push({ p, c: i % 3 ? BI.ramp[2] : BR.ramp[3] });
    if (i % 2) px.push({ p: v(p.x + 1, p.y), c: i % 4 === 1 ? BI.ramp[3] : BI.ramp[1] });
  }
  d.pixels({ mat: BI, z, group: 'gas', outline: false, line: 'none' }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 78,
  head: 80,
  legN: { ik: v(-10, 3) },
  legF: { ik: v(11, 3) },
  armN: { up: -104, lo: -92 },
  armF: { up: -78, lo: -70 },
  p: { breath: 0, jaw: 4, flies: 0, drip: 0 },
});

/** Idle: a slow, heavy breath that swells the belly, the head lolling, a drop of drool falling, flies circling. */
function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = (1 - Math.cos(a)) / 2;
  const bob = Math.round(b);
  return tweak(IDLE, {
    y: -1 - bob,
    torso: 78 + bob,
    head: 80 - bob * 3,
    armN: { up: -104 + bob * 2, lo: -92 + bob * 2 },
    armF: { up: -78 + bob * 2, lo: -70 + bob },
    p: { breath: b, jaw: 4 + bob * 4, flies: t, drip: t > 0.5 ? (t - 0.5) * 2 : 0 },
  });
}

/** Run: a heavy, rolling lumber, the arms swinging, the belly bouncing. */
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -10 * Math.cos(ph), y: 3 + (sn > 0 ? 5 * sn : 0), ang: sn > 0 ? -18 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 2,
    torso: 72 + Math.sin(a) * 2,
    head: 76,
    legN: { ik: v(n.x - 2, n.y) },
    legF: { ik: v(f.x + 2, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -106 + sw * 22, lo: -86 + sw * 24 },
    armF: { up: -74 - sw * 24, lo: -60 - sw * 22 },
    p: { breath: (1 + c2) / 2, jaw: 8, flies: t, drip: 0 },
  });
}

// Putrid Slam: his fists swing back and up over his head, come over and down on the target, and he hangs over the blow.
const PS_WIND = pose({
  x: -2, y: 0, torso: 84, head: 84,
  legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) },
  armN: { up: -158, lo: -146 }, armF: { up: -146, lo: -132 },
  p: { breath: 0.8, jaw: 12, flies: 0.15, drip: 0 },
});
const PS_RAISE = pose({
  x: -3, y: 0, torso: 86, head: 84,
  legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) },
  armN: { up: 112, lo: 100 }, armF: { up: 104, lo: 90 },
  p: { breath: 1, jaw: 22, flies: 0.3, drip: 0 },
});
/** The fists on their way over: an authored frame, since a blend of the two poses would turn the forearms the short way round. */
const PS_OVER = pose({
  x: 2, y: -1, torso: 76, head: 78,
  legN: { ik: v(-10, 3) }, legF: { ik: v(11, 3) },
  armN: { up: 46, lo: 16 }, armF: { up: 40, lo: 8 },
  p: { breath: 0.6, jaw: 22, flies: 0.4, drip: 0 },
});
const PS_SLAM = pose({
  x: 9, y: -6, torso: 50, head: 58,
  legN: { ik: v(-9, 3) }, legF: { ik: v(13, 3) },
  armN: { up: -16, lo: -48 }, armF: { up: -24, lo: -56 },
  p: { breath: 0.2, jaw: 26, flies: 0.5, drip: 0 },
});
const PS_HOLD = tweak(PS_SLAM, { x: 9, y: -7, torso: 48, head: 56, p: { breath: 0.1, jaw: 16, flies: 0.6 } });

const HURT = pose({
  x: -4, y: -1, torso: 80, head: 92,
  legN: { ik: v(-11, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -120, lo: -100 }, armF: { up: -60, lo: -40 },
  p: { breath: 1, jaw: 24, flies: 0.2, drip: 0 },
});

// Death: he staggers back, sits down hard and falls on his back, the rot puffing out of him.
const STAGGER = pose({
  x: -3, y: -3, torso: 96, head: 104,
  legN: { ik: v(-12, 3) }, legF: { ik: v(6, 4) },
  armN: { up: -130, lo: -110 }, armF: { up: -50, lo: -20 },
  p: { breath: 1, jaw: 26 },
});
const SIT = pose({
  x: -4, y: -9, torso: 108, head: 112,
  legN: { up: -20, lo: -70 }, legF: { up: -6, lo: -62 }, footN: -20, footF: -10,
  armN: { up: -150, lo: -160 }, armF: { up: -30, lo: -10 },
  p: { breath: 0.8, jaw: 20 },
});
const FALLING = pose({
  x: -6, y: -15, torso: 142, head: 150,
  legN: { up: 4, lo: -40 }, legF: { up: 14, lo: -30 }, footN: 20, footF: 30,
  armN: { up: -176, lo: 170 }, armF: { up: 40, lo: 70 },
  p: { breath: 0.5, jaw: 16, gas: 0.15 },
});
const DOWN = pose({
  x: -8, y: -14, torso: 168, head: 172,
  legN: { up: 20, lo: -30 }, legF: { up: 30, lo: -20 }, footN: 50, footF: 60,
  armN: { up: 176, lo: 178 }, armF: { up: -30, lo: -8 },
  p: { breath: 0.2, jaw: 22, gas: 0.45 },
});

// Victory: he pounds his belly with both fists, roaring.
const POUND = (near: boolean) => pose({
  y: -1, torso: 76, head: 88,
  legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) },
  armN: near ? { up: -40, lo: 40 } : { up: -70, lo: -20 },
  armF: near ? { up: -70, lo: -10 } : { up: -36, lo: 44 },
  p: { breath: near ? 0.4 : 0.8, jaw: 26, flies: near ? 0.25 : 0.5 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'rot_hulk',
  name: 'Rot Hulk',
  dims: D,
  build,
  footprint: 1.5,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 90, run) },
    attack1: {
      loop: false,
      frames: [
        ...keys([
          [PS_WIND, 90],
          [PS_RAISE, 220],
          [PS_OVER, 50],
          [PS_SLAM, 80, { smear: true, hit: true }],
          [PS_HOLD, 240],
        ]),
        ...tween(D, PS_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 100],
        [tweak(HURT, { x: -3, torso: 76, head: 88, p: { breath: 0.5, jaw: 14 } }), 120],
        [mid(HURT, IDLE, 0.6), 120],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [STAGGER, 140],
        [SIT, 140],
        [FALLING, 110],
        [DOWN, 160],
        [tweak(DOWN, { y: -15, p: { gas: 1 } }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, POUND(true), 2, 90, ease.out),
        ...keys([
          [POUND(false), 140],
          [POUND(true), 140],
          [POUND(false), 140],
          [POUND(true), 140],
          [tweak(POUND(true), { head: 94, p: { jaw: 30 } }), 500],
          [mid(POUND(true), IDLE, 0.5), 120],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------

/** A great fist in an icon: the sprite's near arm (a bruised forearm, a pale mitt), scaled up, coming down. */
function iconFist(d: Draw, wrist: V, ang: number, z: number) {
  const f = d.frame(wrist, ang);
  d.capsule({ mat: BR, z, group: 'iforearm', tex: mottle }, f(-14, 0), f(0, 0), 6, 7);
  d.line({ mat: BR, z: z + 0.05, group: 'iforearm' }, f(-9, -6), f(-9, 6), THREAD);
  d.ellipse({ mat: RP, z: z + 0.1, group: 'ifist', tex: mottle }, f(5, 0), 8, 7, ang);
  for (const w of [-4.5, -1.5, 1.5, 4.5]) d.circle({ mat: RP, z: z + 0.12, group: 'iknuckle' + w, line: 'soft' }, f(11, w), 2.2);
}

export const rotHulk: ChampionArt = {
  char,
  iconBg: RG,
  icons: {
    putrid_slam: () =>
      compose(RG, glyph((d) => {
        // the fist come down, its streak above it
        smear(d, v(10, 34), 120, -40, 24, 7, SWING, 1);
        iconFist(d, v(14, 25), -52, 10);
      }), (b) => {
        // the rot splashing out where it lands (screen space, y down)
        for (const [x, y, c] of [[30, 33, 3], [33, 31, 4], [27, 35, 2], [35, 35, 3], [31, 28, 4], [24, 32, 3], [36, 28, 2], [29, 36, 4]] as const) {
          b.set(x, y, BI.ramp[c]);
          b.set(x + 1, y, BI.ramp[c - 1]);
        }
      }),
  },
};
