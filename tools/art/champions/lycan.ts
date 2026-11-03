// Lycan (docs/DESIGN_DECISIONS.md section 75, Jakub's brief of 2026-11-02: a Heroic Damage of the
// Ashveil Reign, "creative lycanthrope design"; redrawn on his word of 2026-11-03, "be a bit
// different this time", the kit unchanged). A soldier of the Reign gone wholly to the wolf: a
// great hunched beast on digitigrade wolf's legs, a deep barrel chest and heavy shoulders over a
// narrow waist, a coat of dark brown-black fur, grizzled; a shaggy silver-grey mane over his
// neck and shoulders that bristles when he howls; a long wolf's head, its muzzle and throat
// cream, eyes of the Reign's pale light, a notch torn from one tall ear; huge hands with long
// pale claws; a heavy brush of a tail. What is left of the man: the Reign's plum sash knotted at
// his waist, its ends hanging, and iron shackles on both wrists, a few links of broken chain
// swinging from the near one. He runs on all fours. His affinity (Tide) sets nothing here
// (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, Dims, Draw, ease, ik2, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 33,
  thigh: 14,
  shin: 14,
  ankleH: 2,
  footLen: 6,
  spine: 22,
  neck: 8,
  upperArm: 15,
  foreArm: 14.4,
  shoulderDrop: 4.4,
  shoulderN: -5.4,
  shoulderF: 5.4,
  hipN: -2.6,
  hipF: 2.6,
};

const FR = MAT.bullBlack, MN = MAT.furGrey, CR = MAT.furCream, BK = MAT.furBlack, CL = MAT.bone, PL = MAT.ashPlum, IR = MAT.iron;
const E = ACCENT;

/** Leg bones of the digitigrade hind leg: hip to knee, knee to hock (the hock to the paw is the pose's own offset). */
const THIGH = 14, SHANK = 13.6;
/** Head scale on the sprite. */
const HK = 1.2;

/** A grizzled coat: a few darker and a few lighter hairs breaking up each shade. */
const fur = (_h: unknown, x: number, y: number) => ((x * 3 + y * 7) % 13 === 0 ? -1 : (x * 5 + y * 2) % 17 === 0 ? 1 : 0);

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const snout = P.snout ?? -12;
  const Hd = d.frame(s.head, snout);

  tail(d, s, P, 2);
  legOf(d, s, 'F', 10, -1);
  armOf(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF', P);
  cuff(d, s.hF, s.loF, 15, -1, 'cuffF');

  torso(d, s, 30);
  sash(d, s, P, 32);
  mane(d, s, P, 34);
  ear(d, Hd, snout, P.ear ?? 0, 'F', 35);
  head(d, Hd, snout, P, 36);
  ear(d, Hd, snout, P.ear ?? 0, 'N', 38);

  legOf(d, s, 'N', 40, 0);
  armOf(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN', P);
  cuff(d, s.hN, s.loN, 61, 0, 'cuffN');
  chain(d, s, P, 62);
}

// ---------------------------------------------------------------------------
// the body
// ---------------------------------------------------------------------------

function torso(d: Draw, s: Skel, z: number) {
  const rows: [number, number, number][] = [[-3, 6.4, 6.6], [3, 6.4, 7.6], [8, 8.6, 11.4], [13, 10.6, 14], [17.6, 11.4, 13], [21, 9.6, 8.6], [23.4, 5.6, 4]];
  const front = rows.map(([u, , f]) => s.T(u, f));
  const back = rows.map(([u, b]) => s.T(u, -b)).reverse();
  d.poly({ mat: FR, z, group: 'body', tex: fur }, [...front, ...back], { kind: 'cyl', a: s.T(0, 1), b: s.T(23, 1), r: 11.4, bevel: 1.4 });
  // the cream fur of the chest and the belly, its lower edge in ragged tufts
  d.poly(
    { mat: CR, z: z + 0.1, group: 'chest', line: 'none', tex: fur },
    [s.T(21, 8.4), s.T(17.6, 13), s.T(13, 14), s.T(10, 12.2), s.T(8.6, 10), s.T(6.6, 10.4), s.T(5.2, 8), s.T(3, 8.2), s.T(4, 5), s.T(8, 6.4), s.T(12, 8.4), s.T(16, 8.8)],
    { kind: 'cyl', a: s.T(4, 7), b: s.T(20, 7), r: 6, bevel: 1 },
  );
  // the hard lines of the chest and the ribs under the coat
  d.line({ mat: CR, z: z + 0.15, group: 'chest', line: 'none' }, s.T(15.6, 8.6), s.T(15.2, 11.4), CR.ramp[2]);
  for (const u of [7, 9.4, 11.8]) d.line({ mat: FR, z: z + 0.15, group: 'body', line: 'none' }, s.T(u, -3), s.T(u + 1, 4), FR.ramp[1]);
}

/** The shaggy silver mane over the neck, the shoulders and the top of the back, ragged at every edge; `bristle` raises it. */
function mane(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const T = s.T;
  const br = P.bristle ?? 0;
  const w = Math.sin(P.wave ?? 0) * 0.6;
  d.poly(
    { mat: MN, z, group: 'mane', tex: fur },
    [T(28, 7), T(29.4, 0), T(28.6, -7 - br), T(26.4, -14.6 - br * 2), T(24, -12), T(22, -17.4 - br * 2.4 + w), T(19.4, -13), T(16.8, -16.6 - br * 2 + w), T(14.6, -12), T(11.6, -14.2 - br), T(10.4, -9), T(13, -6), T(14.6, -2), T(17, 3), T(18, 8.4), T(20.6, 11.6), T(22.4, 9.6), T(24, 12.6), T(26, 10)],
    { kind: 'dome', c: T(21, -4), r: 12, bevel: 1.2 },
  );
  // a darker grizzle down the middle of it
  d.poly({ mat: MN, z: z + 0.05, group: 'mane', line: 'none', shade: -1, tex: fur }, [T(27, -5), T(25.6, -11), T(22, -13), T(18.4, -11.6), T(14.4, -10.4), T(17, -7.4), T(22, -6.6)], { kind: 'bevel', w: 1 });
}

/** The plum sash of the Reign knotted round his waist, its two ends hanging from the knot and swaying. */
function sash(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const T = s.T;
  d.poly({ mat: PL, z, group: 'sash', tex: (h) => (Math.sin(h.u * 14) > 0.75 ? -1 : 0) }, [T(4.6, -7), T(4.8, 7.8), T(1.4, 7.4), T(1.2, -6.8)], { kind: 'cyl', a: T(1.2, 0), b: T(4.8, 0), r: 7.4 });
  const knot = T(3, 6.2);
  d.circle({ mat: PL, z: z + 0.05, group: 'sashKnot', line: 'soft' }, knot, 2);
  const w = Math.sin(P.wave ?? 0) * 1.6 + (P.wind ?? 0) * -4;
  const hang = s.torso < 40 ? s.torso + 180 : -90;
  const A = (o: number, l: number) => at(at(knot, hang, l), hang + 90, o);
  d.ribbon({ mat: PL, z: z + 0.04, group: 'sashEnd1', line: 'soft' }, [knot, A(-0.6 - w * 0.4, 6), A(-1.4 - w, 12)], [1.8, 1.6, 0.4]);
  d.ribbon({ mat: PL, z: z + 0.03, group: 'sashEnd2', line: 'soft' }, [knot, A(2 - w * 0.3, 5), A(3.6 - w * 0.8, 9)], [1.6, 1.4, 0.3]);
}

/** The tail: a heavy brush from the base of the spine, carried low or streaming out behind; `tail` its angle. */
function tail(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const ang = P.tail ?? 200;
  const sw = Math.sin(P.wave ?? 0) * 6;
  const p0 = s.T(0, -5.4);
  const p1 = at(p0, ang + sw * 0.3, 6), p2 = at(p1, ang + 10 + sw * 0.6, 7), p3 = at(p2, ang + 18 + sw, 7), p4 = at(p3, ang + 22 + sw * 1.2, 5);
  d.ribbon({ mat: FR, z, group: 'tail', shade: -1, tex: fur }, [p0, p1, p2, p3, p4], [2.4, 3.8, 4.4, 3.6, 1.2]);
  d.ribbon({ mat: MN, z: z + 0.1, group: 'tail', line: 'none', shade: -1, tex: fur }, [at(p3, ang + 20, 1), p4], [2.4, 1.2]);
}

/**
 * A digitigrade hind leg: the haunch from the hip to the knee, the long shank back to the hock,
 * then the hock to a broad paw on the ground. The pose's leg target is the paw; `hockX`, `hockY`
 * put the hock (behind and above it, standing).
 */
function legOf(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const P = s.pose.p;
  const hip = side === 'N' ? s.hipN : s.hipF;
  const L = side === 'N' ? s.pose.legN : s.pose.legF;
  const paw = 'ik' in L ? L.ik : side === 'N' ? s.ankN : s.ankF;
  const hock = v(paw.x + (P.hockX ?? -4.4), paw.y + (P.hockY ?? 8.6));
  const r = ik2(hip, hock, THIGH, SHANK, 1);
  const g = 'leg' + side;
  d.capsule({ mat: FR, z, group: g, shade, tex: fur }, hip, r.mid, 6.4, 4.4);
  // the long fur at the back of the haunch, in ragged points
  const ta = Math.atan2(r.mid.y - hip.y, r.mid.x - hip.x) * 57.29578;
  const T = d.frame(hip, ta);
  d.poly({ mat: FR, z: z + 0.02, group: g, shade, tex: fur }, [T(2, -5.6), T(5.4, -8), T(7.2, -5.6), T(10, -7.2), T(11, -4.6), T(13, -4.2), T(12, -1.6)], { kind: 'bevel', w: 1.2 });
  d.capsule({ mat: FR, z: z + 0.1, group: g, shade, tex: fur }, r.mid, r.end, 4.0, 2.6);
  d.capsule({ mat: FR, z: z + 0.15, group: g, shade, tex: fur }, r.end, paw, 2.4, 2.2);
  // the paw: a broad pad, three pale claws digging in
  const fwd = P.dead ? 0 : 0;
  d.ellipse({ mat: FR, z: z + 0.2, group: g, shade }, v(paw.x + 2, paw.y), 4, 2.2, fwd);
  d.pixels({ mat: CL, z: z + 0.25, group: g, line: 'none' }, [{ p: v(paw.x + 5.6, paw.y - 0.6), c: CL.ramp[4] }, { p: v(paw.x + 4.4, paw.y - 1), c: CL.ramp[3] }, { p: v(paw.x + 6.2, paw.y + 0.4), c: CL.ramp[4] }]);
}

/** An arm: a heavy fur shoulder and upper arm, a ruff at the elbow, a long forearm, a huge hand with four long pale claws; `claw` 0..1 spreads them. */
function armOf(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string, P: Record<string, number>) {
  d.circle({ mat: FR, z: z - 0.05, group, shade, tex: fur }, sh, 5.2);
  d.capsule({ mat: FR, z, group, shade, tex: fur }, sh, el, 4.8, 3.8);
  d.capsule({ mat: FR, z: z + 0.1, group, shade, tex: fur }, el, ha, 3.6, 2.8);
  // the ruff behind the elbow
  const fa = Math.atan2(ha.y - el.y, ha.x - el.x) * 57.29578;
  const T = d.frame(el, fa);
  d.poly({ mat: FR, z: z + 0.12, group, shade, tex: fur }, [T(-1, -2.4), T(2.4, -5), T(3.6, -3), T(5.6, -4), T(6, -2)], { kind: 'bevel', w: 1 });
  d.ellipse({ mat: FR, z: z + 0.2, group, shade }, ha, 3.4, 2.8, lo);
  const spread = 10 + (P.claw ?? 0) * 12;
  for (const k of [-1.5, -0.5, 0.5, 1.5]) {
    const base = at(at(ha, lo, 2.4), lo + 90, k * 1.2);
    d.ribbon({ mat: CL, z: z + 0.25, group: group + 'c' + k, shade, line: 'soft' }, [base, at(base, lo + k * spread * 0.5, 3), at(base, lo + k * spread - 24, 6.4)], [1, 0.8, 0.2]);
  }
}

/** An iron shackle round the wrist. */
function cuff(d: Draw, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: IR, z, group, shade, line: 'soft' }, at(ha, lo, -5.4), at(ha, lo, -3.2), 3.4, 3.4);
  d.pixels({ mat: IR, z: z + 0.05, group, line: 'none' }, [{ p: at(at(ha, lo, -4.4), lo + 90, 3), c: IR.ramp[5] }]);
}

/** A few links of the broken chain hanging from the near shackle, swinging with the arm. */
function chain(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  let p = at(s.hN, s.loN, -4.4);
  const sw = Math.sin((P.wave ?? 0) * 1.3) * 14 + (P.swing ?? 0);
  for (let k = 0; k < 4; k++) {
    p = at(p, -90 + sw * (k + 1) * 0.3, 2.2);
    d.circle({ mat: IR, z: z + k * 0.01, group: 'chain' + k, line: 'soft' }, p, k === 3 ? 0.9 : 1.1);
  }
}

// ---------------------------------------------------------------------------
// the head (in a frame along the muzzle: u forward, w up)
// ---------------------------------------------------------------------------

function head(d: Draw, Hd: (u: number, w: number) => V, snout: number, P: Record<string, number>, z: number) {
  const H = (u: number, w: number) => Hd(u * HK, w * HK);
  const g = 'head';
  const jaw = P.jaw ?? 0;
  const th = -jaw * 0.66, hu = 0.4, hw = -2.4;
  const J = (u: number, w: number) => {
    const du = u - hu, dw = w - hw;
    return H(hu + du * Math.cos(th) - dw * Math.sin(th), hw + du * Math.sin(th) + dw * Math.cos(th));
  };
  if (jaw > 0.05) {
    d.poly({ mat: CR, z: z - 0.2, group: g + 'm', color: E.mouthRed, line: 'none' }, [H(0.8, -1.8), H(13.6, -1.4), J(13.2, -2.6), J(1.4, -3.0)]);
    d.poly({ mat: CR, z: z - 0.15, group: g + 'm', color: E.lipRose, line: 'none' }, [J(3, -2.8), J(10.2, -2.4), J(10.8, -3.3), J(4, -3.8)]);
    d.poly({ mat: FR, z: z - 0.1, group: g + 'j', tex: fur }, [J(0.4, -2.4), J(13.4, -2.6), J(13.6, -3.8), J(10, -5.0), J(2.2, -5.4)], { kind: 'bevel', w: 1.2 });
    d.poly({ mat: CR, z: z - 0.05, group: g + 'j', line: 'none' }, [J(2, -4.2), J(12, -3.2), J(12.4, -3.8), J(9, -4.8), J(2.6, -5.0)]);
    const teeth: { p: V; c: RGBA }[] = [];
    for (const [u, n] of [[12.4, 3], [9.6, 1], [7.2, 1]] as const) for (let i = 0; i < n; i++) teeth.push({ p: H(u, -2.0 - i), c: E.white });
    for (const [u, n] of [[11.8, 3], [9.0, 1]] as const) for (let i = 0; i < n; i++) teeth.push({ p: J(u, -2.6 + i), c: E.white });
    d.pixels({ mat: CR, z: z + 0.4, group: g + 'j' }, teeth);
  }
  // the skull, broad between the ears, and the silver cheek fur flaring back
  d.ellipse({ mat: FR, z, group: g, tex: fur }, H(-1.4, 1.6), 7.2 * HK, 6.2 * HK, snout);
  d.poly(
    { mat: MN, z: z + 0.02, group: g, line: 'none', tex: fur },
    [H(1.8, -1.2), H(-0.4, -4.6), H(-3.6, -6.6), H(-4.8, -4.6), H(-7.6, -5.8), H(-7.4, -3.0), H(-9.6, -2.6), H(-6.6, -0.2), H(-2.0, 0.6)],
    { kind: 'bevel', w: 1.2 },
  );
  // the long, heavy muzzle: dark above, cream along the lip
  d.poly(
    { mat: FR, z: z + 0.05, group: g, tex: fur },
    [H(0.4, 5.6), H(5, 4.2), H(9.6, 3.0), H(13.4, 2.0), H(15, 0.6), H(14.8, -1.2), H(12.8, -2.2), H(6, -2.6), H(0, -2.4)],
    { kind: 'dome', c: H(5.4, 1.0), r: 9 * HK, bevel: 1 },
  );
  d.poly({ mat: CR, z: z + 0.08, group: g, line: 'none' }, [H(1.8, -0.4), H(8, -0.6), H(13.2, -0.6), H(14.2, -1.3), H(12.8, -2.2), H(6, -2.6), H(0.6, -2.4)], { kind: 'bevel', w: 1 });
  if (jaw <= 0.05) d.poly({ mat: CR, z: z + 0.04, group: g + 'j' }, [H(0.4, -2.4), H(12.6, -2.2), H(12, -3.4), H(6, -4.0), H(1, -4.0)], { kind: 'bevel', w: 1 });
  d.ellipse({ mat: BK, z: z + 0.3, group: g + 'n' }, H(14.4, 0.6), 1.9 * HK, 1.5 * HK, snout);
  const px: { p: V; c: RGBA }[] = [{ p: H(14.8, 1.2), c: BK.ramp[5] }];
  if (jaw <= 0.05) {
    for (const u of [5.6, 7.2, 8.8, 10.4, 12.0, 13.2]) px.push({ p: H(u, -2.3), c: FR.ramp[0] });
    px.push({ p: H(11.6, -3.0), c: E.white }, { p: H(11.6, -3.8), c: E.white });
  }
  // the eye: the Reign's pale light under a heavy dark brow; a scar across the muzzle
  if (P.dead) px.push({ p: H(4.6, 1.9), c: FR.ramp[0] }, { p: H(5.6, 1.7), c: FR.ramp[0] });
  else px.push({ p: H(5.0, 2.0), c: E.ashEye }, { p: H(5.8, 1.9), c: E.white }, { p: H(4.2, 3.0), c: INK.eye }, { p: H(5.2, 3.2), c: INK.eye }, { p: H(6.2, 2.9), c: INK.eye }, { p: H(6.9, 1.6), c: FR.ramp[0] });
  px.push({ p: H(9, 2.6), c: CR.ramp[3] }, { p: H(9.8, 1.8), c: CR.ramp[3] }, { p: H(10.6, 1.2), c: CR.ramp[3] });
  d.pixels({ mat: FR, z: z + 0.35, group: g, outline: false }, px);
}

/** A tall ear standing from the back of the skull, pointed; `back` lays it back; the near one has a notch torn from its edge. */
function ear(d: Draw, Hd: (u: number, w: number) => V, snout: number, back: number, side: 'N' | 'F', z: number) {
  const k = HK;
  const root = side === 'N' ? Hd(-3.0 * k, 4.8 * k) : Hd(-1.0 * k, 5.4 * k);
  const a = snout + 100 + back + (side === 'F' ? -10 : 0);
  const Ef = d.frame(root, a);
  const L = (side === 'N' ? 9.4 : 8.6) * k;
  const outline = side === 'N'
    ? [Ef(-1, -3 * k), Ef(L * 0.5, -2 * k), Ef(L, 0), Ef(L * 0.78, 1.6 * k), Ef(L * 0.62, 0.8 * k), Ef(L * 0.5, 2.4 * k), Ef(0, 3.2 * k), Ef(-1, 0)]
    : [Ef(-1, -3 * k), Ef(L * 0.5, -2 * k), Ef(L, 0), Ef(L * 0.5, 2.4 * k), Ef(0, 3.2 * k), Ef(-1, 0)];
  d.poly({ mat: FR, z, group: 'ear' + side, shade: side === 'F' ? -1 : 0, tex: fur }, outline, { kind: 'bevel', w: 1.2 * k });
  if (side === 'N') d.poly({ mat: MN, z: z + 0.1, group: 'ear' + side, line: 'none', shade: -1 }, [Ef(0.4, -2 * k), Ef(L * 0.5, -1.2 * k), Ef(L * 0.86, -0.2 * k), Ef(L * 0.4, 0.4 * k), Ef(0.6, 0.6 * k)], { kind: 'bevel', w: 1 });
}

// ---------------------------------------------------------------------------
// Poses & animations: the leg targets are the paws on the ground, the hands IK targets ([forward, up] from the feet)
// ---------------------------------------------------------------------------

const ly = (hN: V, hF: V, o: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hN, bend: -1 }, armF: { ik: hF, bend: -1 }, ...o, p: { jaw: 0, snout: -12, ...(o.p ?? {}) } });

/** Paws on the ground at x. */
const paws = (n: number, f: number, ln = 1.6, lf = 1.6) => ({ legN: { ik: v(n, ln) }, legF: { ik: v(f, lf) } });

// At rest: hunched and menacing, the head low and thrust forward, the hands hanging before him with the claws out.
const IDLE = ly(v(16, 26), v(24, 28), { x: -2, y: -2, torso: 62, head: 60, ...paws(-9, 9), p: { snout: -14, claw: 0.3 } });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return ly(v(16, 26 - b), v(24, 28 - b), { x: -2, y: -2 - b, torso: 62 + b * 2, head: 60 - b, ...paws(-9, 9), p: { snout: -14 + b * 3, jaw: b * 0.15, claw: 0.3 + b * 0.3, wave: a, ear: b * -4 } });
}

// Run: on all fours, a bounding gallop, the hands reaching for the ground ahead.
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const step = (ph: number, reach: number, base: number, lift: number, floor = 1.6) => ({ x: base + reach * Math.cos(ph), y: floor + Math.max(0, Math.sin(ph)) * lift });
  const fn = step(a, 9, 20, 6, 7), ff = step(a + 0.5, 9, 23, 6, 7);
  const hn = step(a + Math.PI, 8, -10, 5), hf = step(a + Math.PI + 0.5, 8, -7, 5);
  const bob = Math.round(Math.sin(a * 2) * 1.4);
  return ly(v(fn.x, fn.y), v(ff.x, ff.y), {
    x: 2, y: -8 + bob, torso: 16 + Math.round(Math.sin(a) * 4), head: 32,
    legN: { ik: v(hn.x, hn.y) }, legF: { ik: v(hf.x, hf.y) },
    p: { snout: -4, jaw: 0.4, tail: 182, wave: a * 2, ear: -14, claw: 0.6, hockX: -5.4, hockY: 7.4 },
  });
}

// Ravening Claws: the near hand drawn far back past his ear, a lunge and a rake down across the enemy; the far hand back, and across again.
const RK_WIND = ly(v(-10, 52), v(22, 30), { x: -4, y: -1, torso: 76, head: 70, ...paws(-12, 8), p: { snout: 0, jaw: 0.5, claw: 1, wave: 1 } });
const RK_ONE = ly(v(34, 30), v(18, 34), { x: 8, y: -5, torso: 48, head: 46, ...paws(-13, 17), p: { snout: -10, jaw: 0.9, claw: 1, wave: 1.6, swing: 30 } });
const RK_WIND2 = ly(v(22, 16), v(-6, 50), { x: 6, y: -3, torso: 60, head: 56, ...paws(-12, 16), p: { snout: -4, jaw: 0.6, claw: 1, wave: 2 } });
const RK_TWO = ly(v(18, 24), v(36, 34), { x: 10, y: -6, torso: 44, head: 42, ...paws(-14, 19), p: { snout: -8, jaw: 1, claw: 1, wave: 2.6, swing: -20 } });

// Hunter's Howl: he rears up off his hands, the chest thrown out, the arms flung down and back, the mane bristling, the muzzle at the moon.
const HW_LOW = ly(v(18, 18), v(24, 18), { x: -2, y: -6, torso: 50, head: 46, ...paws(-10, 10), p: { snout: -22, jaw: 0, ear: -10, claw: 0.4 } });
const HW_UP = ly(v(14, 30), v(-12, 34), { x: -3, y: 1, torso: 100, head: 116, ...paws(-10, 9), p: { snout: 64, jaw: 1, ear: -16, bristle: 1, tail: 214, claw: 1, wave: 1 } });
const HW_HOLD = tweak(HW_UP, { y: 2, p: { snout: 70, jaw: 0.9, bristle: 1, wave: 2.2 } });

// Moonlit Maul: down on all fours, gathered; he springs (the scene carries him along the arc), comes down with the claws out and the jaws on the target, and tears.
const ML_CROUCH = ly(v(22, 8), v(25, 8), { x: -2, y: -14, torso: 22, head: 30, ...paws(-12, -6), p: { snout: -12, jaw: 0.3, ear: -14, tail: 190, hockX: -6, hockY: 5.4 } });
const ML_LAUNCH = ly(v(30, 30), v(28, 24), { x: 4, y: -2, torso: 30, head: 40, legN: { ik: v(-18, 6) }, legF: { ik: v(-14, 3) }, p: { snout: 0, jaw: 0.7, ear: -18, tail: 196, claw: 1, hockX: -6, hockY: 4 } });
const ML_FLY = ly(v(38, 40), v(36, 34), { x: 4, y: 4, torso: 18, head: 30, legN: { ik: v(-18, 14) }, legF: { ik: v(-14, 12) }, p: { snout: 0, jaw: 1, ear: -20, tail: 186, claw: 1, wave: 2, hockX: -7, hockY: 2 } });
const ML_BITE = ly(v(30, 14), v(28, 10), { x: 6, y: -8, torso: 26, head: 24, ...paws(-12, 4), p: { snout: -36, jaw: 0, claw: 1, wave: 2.6, tail: 200 } });
const ML_TEAR = ly(v(26, 12), v(24, 8), { x: 4, y: -9, torso: 30, head: 30, ...paws(-12, 4), p: { snout: -10, jaw: 0.2, claw: 1, wave: 3, tail: 196 } });
const ML_BACK = ly(v(18, 24), v(24, 26), { x: 0, y: -3, torso: 56, head: 54, ...paws(-10, 9), p: { snout: -10, jaw: 0.5, wave: 1 } });

const HURT = ly(v(10, 30), v(16, 32), { x: -5, y: -1, torso: 78, head: 76, ...paws(-13, 7), p: { snout: 14, jaw: 0.7, ear: -18, claw: 0.2 } });
const DEATH_KNEEL = ly(v(16, 6), v(22, 6), { x: 0, y: -12, torso: 44, head: 36, ...paws(-14, 6), p: { dead: 1, snout: -28, jaw: 0.4, ear: -20, hockX: -6, hockY: 5 } });
const DEATH_FALL = ly(v(26, 6), v(30, 6), { armN: { ik: v(30, 8), bend: 1 }, armF: { ik: v(34, 8), bend: 1 }, x: 2, y: -15, torso: 16, head: 20, ...paws(-18, -10), p: { dead: 1, snout: -10, jaw: 0.3, ear: -20, hockX: -8, hockY: 3, tail: 186 } });
const DEATH_DOWN = ly(v(30, 8), v(34, 8), { armN: { ik: v(34, 9), bend: 1 }, armF: { ik: v(38, 9), bend: 1 }, x: 4, y: -17, torso: 4, head: 20, ...paws(-22, -16), p: { dead: 1, snout: 6, jaw: 0, ear: -24, hockX: -8, hockY: 1.4, tail: 182, claw: -1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const waved = (p: Pose, w: number) => tweak(p, { p: { wave: w } });

const char: CharDef = {
  id: 'lycan',
  name: 'Lycan',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 70, run) },
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
          [HW_LOW, 240],
          [mid(HW_LOW, HW_UP, 0.5), 80],
          [HW_UP, 120, { event: 'cast', hit: true }],
          [HW_HOLD, 280],
          [waved(HW_HOLD, 3), 280],
          [mid(HW_HOLD, IDLE, 0.5), 110],
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
          [ML_TEAR, 120],
          [tweak(ML_BITE, { p: { jaw: 0.1, snout: -28 } }), 110],
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
        [tweak(HURT, { x: -4, torso: 76 }), 110],
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
        [tweak(DEATH_DOWN, { y: -17.5 }), 600],
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

/** The head in an icon, in a frame along the muzzle at `c`. */
function iconHead(d: Draw, c: V, snout: number, jaw: number) {
  const Hd = d.frame(c, snout);
  const P = { jaw };
  ear(d, Hd, snout, -6, 'F', 9);
  head(d, Hd, snout, P, 10);
  ear(d, Hd, snout, -6, 'N', 12);
}

export const lycan: ChampionArt = {
  char,
  iconBg: FR,
  icons: {
    ravening_claws: () =>
      compose(BK, glyph((d) => {
        for (const k of [-1, 0, 1]) d.ribbon({ mat: CL, z: 10, group: 'iclaw' + k, line: 'soft' }, [v(10 + k * 7, 34), v(15 + k * 7, 22), v(20 + k * 7, 8)], [0.6, 2.8, 0.4]);
      }), (b) => {
        impactStar(b, 28, 28, 2, 8, 9, FXR.dust[3], E.white);
        for (const [x, y] of [[8, 8], [11, 5], [6, 12]] as const) b.set(x, y, E.ashEye);
      }),
    hunters_howl: () =>
      compose(BK, glyph((d) => iconHead(d, v(12, 10), 52, 1)), (b) => {
        for (let yy = -5; yy <= 5; yy++) for (let xx = -5; xx <= 5; xx++) if (xx * xx + yy * yy <= 24 && (xx + 1) * (xx + 1) + (yy - 1) * (yy - 1) > 14) b.set(31 + xx, 7 + yy, E.ashEye);
      }),
    moonlit_maul: () =>
      compose(BK, glyph((d) => iconHead(d, v(8, 20), -6, 0.9)), (b) => impactStar(b, 33, 22, 1, 6, 7, FXR.dust[3], E.white)),
    moon_mad: () =>
      compose(BK, glyph((d) => {
        d.circle({ mat: CR, z: 10, group: 'imoon' }, v(20, 20), 11);
        d.circle({ mat: BK, z: 10.1, group: 'imoon2', line: 'none' }, v(25, 23), 9.4);
      }), (b) => {
        for (const [x0, y0, x1] of [[4, 30, 14], [3, 25, 11], [5, 20, 13]]) for (let x = x0; x <= x1; x++) b.set(x, y0, E.ashEye);
      }),
  },
};
