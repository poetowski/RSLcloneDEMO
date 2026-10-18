// The Necromancer (docs/DESIGN_DECISIONS.md section 31, Jakub's brief of
// 2026-10-18): an Elite of the Ashveil Reign, Support. "Human dressed in dark
// black robe with also robe hood over pale head, just a bit of face is
// steering. holds a necronomicon book in left hand and a small black particles
// orbits his other hand." So: a tall, gaunt man in a black robe to his feet, its
// hem ragged, wide sleeves, a rope belt with a bone toggle; a deep hood over
// his head whose rim shadows his eyes, so of his pale face only the nose, the
// mouth and the chin show, with one faint glint where an eye is; in his left
// hand (the far one, facing right) a thick book bound in maroon leather, iron
// corners, a clasp, the Reign's white bone on its cover, its pages yellowed
// and written dark; round his right hand small black motes circling on a
// tilted ring (the silhouette features: the hood's point and the book). What
// the brief leaves open is a first take: his face, the robe's cut and its
// belt, the book's binding and emblem, the motes' glint and how they move.
// His affinity sets nothing here (affinities are abstract, Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { foldTex, robe, RobeCfg, torsoPts, upRobe } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 37,
  thigh: 17,
  shin: 17.4,
  ankleH: 3,
  footLen: 5.6,
  spine: 21,
  neck: 6.8,
  upperArm: 12.8,
  foreArm: 11.8,
  shoulderDrop: 3.8,
  shoulderN: -2.4,
  shoulderF: 2.8,
  hipN: -1.4,
  hipF: 1.4,
};

const SK = MAT.skinPale, RB = MAT.blackCloth, CH = MAT.charcoal, BK = MAT.maroon, IR = MAT.iron, PG = MAT.bone, BN = MAT.ashBone, VG = MAT.glowViolet;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  // the hood's fall down his back, the far half of the motes behind his hand
  hoodBack(d, s, wave, 3);

  // feet under the hem, the far arm behind the robe
  feet(d, s, 11);
  sleeveArm(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF', false);

  // the robe from the waist down, its ragged hem; the bodice; the rope belt; the mantle of the hood over the shoulders
  skirt(d, s, wave, 15);
  bodice(d, s, 30);
  belt(d, s, wave, 32);
  mantle(d, s, wave, 34);

  head(d, s, P);

  // the book in his far hand, in front of him; the near arm, the motes round its hand
  book(d, s, P, 55);
  d.ellipse({ mat: SK, z: 57, group: 'handF', shade: -1 }, at(s.hF, s.loF, 0.4), 1.8, 1.5, s.loF);
  motes(d, s, P, false);
  sleeveArm(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN', true);
  motes(d, s, P, true);
}

// ---------------------------------------------------------------------------
// the robe and the hood
// ---------------------------------------------------------------------------

const ROBE: RobeCfg = { waist: [1.4, 5.2, 5.6], hemDrop: 1.6, hemFloor: 0.6, hemBack: [8.4, 6.8], hemFront: [5.6, 4.6], midBack: [4.4, 3.2], midFront: [3.6, 2.0], ripple: 0.8, zigzag: 1.4 };

/** The robe from the waist to his feet: black, its folds catching a little light, the hem ragged. */
function skirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: RB, z, group: 'robe', tex: foldTex(10, wave * 0.5, 0.55) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  // a darker band along the hem, worn and frayed
  d.ribbon({ mat: RB, z: z + 0.2, group: 'robe', line: 'none', shade: -1 }, upRobe(r, r.hem, 1.0), r.hem.map(() => 0.9));
}

/** The robe's bodice, black to the throat. */
function bodice(d: Draw, s: Skel, z: number) {
  const torso = torsoPts(s, [
    [0, 5.0, 5.2],
    [4, 4.6, 5.0],
    [8.5, 5.0, 5.8],
    [12.5, 5.4, 6.2],
    [16, 5.6, 5.6],
    [18.6, 4.2, 3.4],
    [21, 2.6, 2.2],
  ]);
  d.poly({ mat: RB, z, group: 'body', tex: foldTex(6, 0.8, 0.75) }, torso, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(21, 0.6), r: 6.2, bevel: 1.3 });
}

/** A rope belt of charcoal round the waist, its ends hanging, a bone toggle through the knot. */
function belt(d: Draw, s: Skel, wave: number, z: number) {
  d.poly({ mat: CH, z, group: 'belt' }, [s.T(2.4, -5.3), s.T(2.6, 5.8), s.T(1.3, 5.7), s.T(1.1, -5.2)], { kind: 'cyl', a: s.T(0, 0), b: s.T(2.6, 0), r: 5.6 });
  const knot = s.T(1.9, 5.2);
  d.circle({ mat: CH, z: z + 0.05, group: 'belt' }, knot, 1.1);
  const hang = -96 + Math.sin(wave) * 4;
  const e1 = at(knot, hang + 8, 4), e2 = at(e1, hang, 4);
  d.ribbon({ mat: CH, z: z + 0.1, group: 'beltend', line: 'soft' }, [knot, e1, e2], [0.6, 0.55, 0.5]);
  d.ribbon({ mat: CH, z: z + 0.08, group: 'beltend', shade: -1, line: 'soft' }, [knot, at(knot, hang - 6, 3.2), at(at(knot, hang - 6, 3.2), hang - 2, 2.6)], [0.6, 0.55, 0.5]);
  // the toggle: a small bone through the knot
  d.capsule({ mat: BN, z: z + 0.15, group: 'toggle' }, at(knot, 20, -1.8), at(knot, 20, 1.8), 0.7, 0.7);
}

/** The mantle of the hood over his shoulders, falling to the chest, its edge ragged. */
function mantle(d: Draw, s: Skel, wave: number, z: number) {
  const rag = (u: number, w: number, k: number) => s.T(u + Math.sin(wave + k) * 0.3, w);
  d.poly(
    { mat: RB, z, group: 'mantle', tex: foldTex(7, wave * 0.4 + 1, 0.6) },
    [
      s.T(20.6, 3.2), s.T(21.6, 0.4), s.T(21.2, -3.4), s.T(19.6, -6.2), s.T(16.6, -7.0),
      rag(12.6, -6.6, 0), rag(11.4, -4.6, 1), rag(12.4, -2.8, 2), rag(10.8, -0.8, 3), rag(12.0, 1.2, 4), rag(10.6, 3.0, 5), rag(11.8, 4.8, 6),
      s.T(15.2, 6.8), s.T(18.4, 5.8),
    ],
    { kind: 'cyl', a: s.T(11, 0), b: s.T(21.5, 0), r: 7.2, bevel: 1.2 },
  );
}

/** The hood's fall behind his head and down his back. */
function hoodBack(d: Draw, s: Skel, wave: number, z: number) {
  const H = s.H, T = s.T;
  d.poly({ mat: RB, z, group: 'hoodback', shade: -1 }, [H(-2.0, 8.2), H(-7.6, 6.0), H(-9.6, 0.6), T(17.4 - Math.sin(wave) * 0.4, -8.4), T(13.4, -7.6), T(14.0, -4.0), H(-3.0, -5.6)], { kind: 'dome', c: H(-5, -1), r: 10, bevel: 1 });
}

/**
 * His head under the hood: the pale face, the hood's deep rim coming forward
 * over his brow so his eyes lie in its shadow, one faint glint in it; of the
 * face only the nose, the mouth and the chin catch the light; the hood's point
 * hanging back.
 */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.0, 1.8);
  face(d, s, { skin: SK, z: 38, browStyle: 'none', ear: 'none', mouth: P.speak ? 'shout' : 'line', lip: SK.ramp[2], rx: 5.6, ry: 6.6, profile: 'strong' });
  // the hood's shadow over his brow and eyes, a glint where an eye is
  d.poly({ mat: RB, z: 38.6, group: 'hoodshade', flat: 0, line: 'none' }, [H(7.4, 3.6), H(7.2, 1.8), H(6.0, 0.6), H(3.4, 0.2), H(0.6, 1.0), H(0.4, 3.8)], { kind: 'flat', n: [0, 0, 1] });
  d.pixels({ mat: VG, z: 38.7, group: 'hoodshade', outline: false, line: 'none' }, [{ p: H(4.0, 1.4), c: (P.glow ?? 0) > 0.5 ? VG.ramp[5] : VG.ramp[4] }]);
  // the hood: over the crown and the back of the head, its rim forward over the brow and down past the cheek to the throat
  d.poly(
    { mat: RB, z: 39, group: 'hood', tex: foldTex(5, 1.2, 0.7) },
    [H(8.0, 4.4), H(7.4, 3.2), H(4.6, 2.6), H(1.6, 1.6), H(0.2, -2.0), H(0.0, -5.6), H(-0.8, -8.2), H(-3.6, -8.4), H(-7.6, -4.8), H(-9.4, 1.0), H(-8.6, 6.2), H(-5.2, 9.8), H(-0.4, 10.6), H(4.4, 8.8)],
    { kind: 'dome', c: H(-1.2, 2.4), r: 10, bevel: 1.2 },
  );
  // the rim of the hood, its fold catching the light along the opening
  d.ribbon({ mat: RB, z: 39.1, group: 'hood', line: 'none', minIdx: 3 }, [H(7.8, 4.2), H(5.4, 2.9), H(2.4, 1.9), H(0.6, -1.8), H(0.4, -5.4)], [0.7, 0.75, 0.75, 0.7, 0.6]);
  // the hood's point, hanging back over the nape
  d.poly({ mat: RB, z: 38.9, group: 'hood', shade: -1 }, [H(-6.6, 7.4), H(-11.4, 5.6), H(-13.6, 1.2), H(-9.4, 2.8)], { kind: 'bevel', w: 1.2 });
}

/** A wide black sleeve to a ragged cuff, his pale hand. */
function sleeveArm(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string, hand: boolean) {
  d.capsule({ mat: RB, z, group, shade }, sh, el, 2.7, 2.5);
  d.capsule({ mat: RB, z: z + 0.1, group, shade }, el, at(ha, lo, -1.8), 2.5, 3.6, 0.2);
  // the cuff, frayed
  const f = d.frame(at(ha, lo, -1.8), lo);
  d.poly({ mat: RB, z: z + 0.15, group, shade: shade - 1, line: 'none' }, [f(-1.2, 3.6), f(0.6, 3.2), f(0.2, 1.4), f(1.0, 0), f(0.2, -1.6), f(0.8, -3.4), f(-1.2, -3.6)], { kind: 'bevel', w: 1 });
  if (hand) {
    // a gaunt hand, the fingers long
    d.ellipse({ mat: SK, z: z + 0.3, group, shade }, at(ha, lo, 0.4), 1.9, 1.5, lo);
    d.capsule({ mat: SK, z: z + 0.32, group, shade }, at(ha, lo, 1.2), at(ha, lo + 14, 3.6), 0.7, 0.5);
  }
}

/** Feet in soft dark shoes, peeking under the hem. */
function feet(d: Draw, s: Skel, z: number) {
  for (const [side, shade] of [['F', -1], ['N', 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF;
    const fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: CH, z: z + (side === 'N' ? 1 : 0), group: 'foot' + side, shade: shade - 1 }, [f(-2.4, 1.8), f(-2.8, -1), f(-2.2, -3), f(5.4, -3), f(6.8, -1.6), f(3.4, 0), f(1, 1.8)], { kind: 'bevel', w: 1.4 });
  }
}

// ---------------------------------------------------------------------------
// the necronomicon
// ---------------------------------------------------------------------------

/**
 * The book in his far hand. Closed (`open` 0) it stands in the hand, its
 * cover toward us: maroon leather, iron corners, a strap and clasp, the Reign's
 * white bone across it, the yellowed fore-edge of its pages on one side. Open
 * (`open` 1) it lies spread on his palm, tilted toward him: two yellowed pages
 * written dark, the cover's edge round them, a line of glow on the pages when
 * it is read (`glow`). `bookAng` turns it in his hand.
 */
function book(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const open = Math.max(0, Math.min(1, P.open ?? 0));
  const ang = P.bookAng ?? 90;
  const base = at(s.hF, s.loF, 0.6);
  const f = d.frame(base, ang);
  if (open < 0.5) {
    // closed: the cover, the fore-edge, the spine, iron at the corners, the strap and the bone
    const cover = [f(-0.6, -3.6), f(9.2, -3.4), f(9.0, 3.6), f(-0.8, 3.8)];
    d.poly({ mat: BK, z, group: 'book', maxIdx: 4, tex: (h) => (Math.sin(h.u * 9) > 0.9 ? -1 : 0) }, cover, { kind: 'bevel', w: 1.4 });
    // the yellowed page block along its top, seen from a little above
    d.poly({ mat: PG, z: z - 0.1, group: 'book' }, [f(8.6, -3.2), f(10.2, -3.0), f(10.2, 3.0), f(8.6, 3.2)], { kind: 'bevel', w: 0.8 });
    d.ribbon({ mat: BK, z: z + 0.05, group: 'book', shade: -1, line: 'none' }, [f(-0.4, -3.8), f(9.0, -3.6)], [0.8, 0.8]);
    const corners: { p: V; c: RGBA }[] = [];
    for (const [cu, cw] of [[0, -3.0], [8.4, -2.8], [8.2, 3.0], [0, 3.2]] as const) corners.push({ p: f(cu, cw), c: IR.ramp[4] }, { p: f(cu + (cu < 4 ? 0.9 : -0.9), cw), c: IR.ramp[2] });
    d.pixels({ mat: IR, z: z + 0.1, group: 'book', outline: false, line: 'none' }, corners);
    // the strap across the fore-edge and its clasp
    d.capsule({ mat: IR, z: z + 0.12, group: 'clasp', line: 'none' }, f(4.0, 2.4), f(4.0, 4.6), 0.6, 0.6);
    // the white bone across the cover
    d.capsule({ mat: BN, z: z + 0.15, group: 'emblem', line: 'none' }, f(4.2, -1.8), f(4.2, 1.8), 0.45, 0.45);
    d.pixels({ mat: BN, z: z + 0.16, group: 'emblem', outline: false, line: 'none' }, [
      { p: f(4.8, -2.2), c: BN.ramp[5] }, { p: f(3.6, -2.2), c: BN.ramp[4] },
      { p: f(4.8, 2.2), c: BN.ramp[4] }, { p: f(3.6, 2.2), c: BN.ramp[3] },
    ]);
    return;
  }
  // open: the covers spread, the pages on them, the gutter, a few lines written on them (a glyph glowing on each page while he reads)
  const w = 3.0 + open * 2.6;
  d.poly({ mat: BK, z, group: 'book', maxIdx: 4 }, [f(-0.6, -w - 0.8), f(7.8, -w - 0.6), f(8.2, w + 0.8), f(-0.4, w + 0.6)], { kind: 'bevel', w: 1 });
  d.poly({ mat: PG, z: z + 0.05, group: 'pages', maxIdx: 4 }, [f(0.2, -w), f(7.2, -w + 0.2), f(7.6, w - 0.2), f(0.4, w)], { kind: 'bevel', w: 1, n: [0, 0.3, 1] });
  const lines: { p: V; c: RGBA }[] = [];
  const glow = P.glow ?? 0;
  for (const row of [1.6, 3.4, 5.2]) {
    for (const side of [-1, 1]) {
      for (let k = 1; k < w - 0.8; k += 1) if (Math.round(k + row) % 3 !== 0) lines.push({ p: f(row, side * (k + 0.4)), c: PG.ramp[1] });
    }
  }
  if (glow > 0.5) for (const side of [-1, 1]) lines.push({ p: f(4.4, side * 2.4), c: VG.ramp[4] }, { p: f(4.4, side * 3.4), c: VG.ramp[3] });
  d.pixels({ mat: PG, z: z + 0.1, group: 'pages', outline: false, line: 'none' }, lines);
  d.ribbon({ mat: BK, z: z + 0.12, group: 'pages', shade: -1, line: 'none' }, [f(0.2, 0), f(7.4, 0)], [0.5, 0.5]);
}

// ---------------------------------------------------------------------------
// the motes
// ---------------------------------------------------------------------------

/**
 * The black motes circling his near hand on a tilted ring, each with a glint
 * of violet so it shows against his robe: `orb` turns the ring (a whole turn
 * per 2π, so loops close), `glow` widens it and lifts the motes, `gather` draws
 * them into the palm, `spent` hides those that have just flown off, `rise`
 * spirals them up. The far half is drawn behind the hand, the near half in
 * front of it.
 */
function motes(d: Draw, s: Skel, P: Record<string, number>, front: boolean) {
  const c = at(s.hN, s.loN, 1.4);
  const ph = P.orb ?? 0, glow = P.glow ?? 0, gather = Math.max(0, Math.min(1, P.gather ?? 0)), spent = P.spent ?? 0, rise = P.rise ?? 0;
  const rx = (5.6 + glow * 4.4) * (1 - gather * 0.8), ry = (2.2 + glow * 1.6) * (1 - gather * 0.8);
  const n = 7;
  const pts: { p: V; c: RGBA }[] = [];
  for (let k = 0; k < n; k++) {
    if (k < Math.round(spent * n)) continue;
    const a = ph + (k / n) * Math.PI * 2;
    if (Math.sin(a) < 0 !== front) continue;
    const bob = Math.sin(ph * 2 + k * 1.9) * 1.1 * (1 - gather) + rise * (2 + k * 1.6);
    const q = v(Math.round(c.x + Math.cos(a) * rx) + 0.5, Math.round(c.y + Math.sin(a) * ry + bob) + 0.5);
    const big = k % 3 === 0;
    pts.push({ p: q, c: INK.black });
    // a glint of violet on its upper side, so it reads against the black of the robe
    pts.push({ p: v(q.x, q.y + 1), c: glow > 0.5 ? VG.ramp[2] : VG.ramp[1] });
    if (big) {
      pts.push({ p: v(q.x + 1, q.y), c: RB.ramp[0] }, { p: v(q.x + 1, q.y + 1), c: glow > 0.5 ? VG.ramp[1] : RB.ramp[3] });
    }
  }
  if (pts.length) d.pixels({ mat: VG, z: front ? 70 : 59, group: 'motes', outline: false, line: 'none', noClean: true }, pts);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 87,
  head: 82,
  legN: { ik: v(-4, 3) },
  legF: { ik: v(5, 3) },
  armN: { up: -58, lo: -8 },
  armF: { up: -80, lo: 34 },
  p: { orb: 0, open: 0, bookAng: 98, glow: 0, gather: 0, spent: 0, rise: 0, wave: 0, speak: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b * 0.6,
    armN: { up: -58 + b, lo: -8 + b },
    armF: { up: -80 + b, lo: 34 + b },
    // the motes go round once a loop, the robe stirs at its own pace
    p: { orb: a, wave: a * 0.5 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.6 ? 1 : 0;
  const ft = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -8 * Math.cos(ph), y: 3 + (sn > 0 ? 4 * sn : 0), ang: sn > 0 ? -16 * sn : 0 };
  };
  const n = ft(a), f = ft(a + Math.PI);
  return pose({
    y: bob - 1,
    torso: 80,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    // the book clutched to his chest, the near hand trailing its motes
    armN: { up: -118 + Math.cos(a) * 10, lo: -96 },
    armF: { up: -72, lo: 40 },
    p: { orb: a * 2, open: 0, bookAng: 96, glow: 0, gather: 0.3, spent: 0, rise: 0, wave: a * 2 + 2, speak: 0 },
  });
}

// Grave Chill: he draws his hand back to his shoulder as the motes gather in it, then flings it out at the enemy and they fly.
const GC_DRAW = pose({
  x: -1, torso: 92, head: 86,
  legN: { ik: v(-6, 3) }, legF: { ik: v(5, 3) },
  armN: { up: 28, lo: 150 }, armF: { up: -78, lo: -4 },
  p: { orb: 0.8, open: 0, bookAng: 92, glow: 0.2, gather: 0.9, spent: 0, rise: 0, wave: 0.6, speak: 0 },
});
const GC_FLING = pose({
  x: 2, torso: 83, head: 84,
  legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) },
  armN: { up: 6, lo: -2 }, armF: { up: -80, lo: -10 },
  p: { orb: 1.6, open: 0, bookAng: 92, glow: 0.4, gather: 1, spent: 1, rise: 0, wave: 1.2, speak: 0 },
});
const GC_HOLD = tweak(GC_FLING, { x: 2, torso: 84, p: { orb: 2.2, gather: 0.4, spent: 0.7 } });

// Plague Verse: he opens the book on his palm and reads from it, then turns his hand on the enemy.
const PV_OPEN = pose({
  x: -1, torso: 86, head: 70,
  legN: { ik: v(-5, 3) }, legF: { ik: v(5, 3) },
  armN: { up: -30, lo: 40 }, armF: { up: -46, lo: 14 },
  p: { orb: 0.6, open: 1, bookAng: 28, glow: 0.2, gather: 0.2, spent: 0, rise: 0, wave: 0.8, speak: 0 },
});
const PV_READ = tweak(PV_OPEN, { head: 66, p: { orb: 1.4, glow: 1, speak: 1, wave: 1.2 } });
const PV_POINT = pose({
  x: 2, torso: 84, head: 80,
  legN: { ik: v(-7, 3) }, legF: { ik: v(6, 3) },
  armN: { up: 4, lo: 6 }, armF: { up: -46, lo: 14 },
  p: { orb: 2.2, open: 1, bookAng: 28, glow: 1, gather: 0, spent: 0.5, rise: 0, wave: 1.8, speak: 1 },
});

// Raise Dead: the book open on his palm, he lifts his near hand high and the motes spiral up from it, then he sweeps it down to the ground, calling the fallen up.
const RD_LIFT = pose({
  y: 1, torso: 94, head: 98,
  legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) },
  armN: { ik: v(6, 66) }, armF: { up: -40, lo: 20 },
  p: { orb: 1.0, open: 1, bookAng: 34, glow: 1, gather: 0, spent: 0, rise: 0.6, wave: 1.0, speak: 1 },
});
const RD_CALL = pose({
  x: 3, y: -2, torso: 76, head: 70,
  legN: { ik: v(-8, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -30, lo: -62 }, armF: { up: -40, lo: 20 },
  p: { orb: 2.6, open: 1, bookAng: 34, glow: 1, gather: 0, spent: 0.4, rise: -0.2, wave: 2.0, speak: 1 },
});

const HURT = pose({
  x: -4, torso: 100, head: 104,
  legN: { ik: v(-6, 3) }, legF: { ik: v(5, 4) },
  armN: { up: -96, lo: -40 }, armF: { up: -110, lo: -40 },
  p: { orb: 1, open: 0, bookAng: 110, glow: 0, gather: 0, spent: 0, rise: 0, wave: 2, speak: 1 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -14, torso: 74, head: 58,
  legN: { ik: v(-12, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -84, lo: -70 }, armF: { up: -70, lo: -60 },
  p: { orb: 1.4, open: 0, bookAng: 150, glow: 0, gather: 0, spent: 0.6, rise: 0, wave: 1, speak: 0 },
});
const DEATH_FALL = pose({
  x: 1, y: -13, torso: 30, head: 14,
  legN: { up: -150, lo: -175 }, legF: { up: -120, lo: -170 },
  armN: { up: -60, lo: -30 }, armF: { up: -30, lo: -4 },
  p: { orb: 1.8, open: 0, bookAng: 176, glow: 0, gather: 0, spent: 1, rise: 0, wave: 1.6, speak: 0 },
});
const DEATH_DOWN = pose({
  x: 5, y: -24, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 },
  armN: { up: 4, lo: 2 }, armF: { up: -2, lo: 4 },
  p: { orb: 2, open: 0, bookAng: 186, glow: 0, gather: 0, spent: 1, rise: 0, wave: 2, speak: 0 },
});

// Victory: the book raised open in his far hand, the motes rising round his near hand.
const VICTORY = pose({
  y: 1, torso: 90, head: 96,
  legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) },
  armN: { up: -24, lo: 34 }, armF: { up: 52, lo: 78 },
  p: { orb: 1, open: 1, bookAng: 30, glow: 0.8, gather: 0, spent: 0, rise: 0.4, wave: 0.8, speak: 0 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const turned = (p: Pose, m: number) => tweak(p, { p: { orb: m } });

const char: CharDef = {
  id: 'necromancer',
  name: 'Necromancer',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 190, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    attack1: {
      loop: false,
      frames: [
        ...keys([
          [mid(IDLE, GC_DRAW, 0.5), 90],
          [GC_DRAW, 160],
          [turned(GC_DRAW, 1.3), 110],
          [mid(GC_DRAW, GC_FLING, 0.5), 50],
          [GC_FLING, 80, { hit: true }],
          [GC_HOLD, 220],
        ]),
        ...tween(D, GC_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...keys([
          [mid(IDLE, PV_OPEN, 0.5), 100],
          [PV_OPEN, 140],
          [PV_READ, 180],
          [turned(PV_READ, 2.0), 160],
          [mid(PV_READ, PV_POINT, 0.5), 60],
          [PV_POINT, 120, { hit: true }],
          [turned(PV_POINT, 2.8), 240],
        ]),
        ...tween(D, PV_POINT, IDLE, 3, 110, ease.inOut),
      ],
    },
    ritual: {
      loop: false,
      frames: [
        ...keys([
          [mid(IDLE, RD_LIFT, 0.5), 110],
          [RD_LIFT, 160, { event: 'cast' }],
          [turned(RD_LIFT, 1.8), 150],
          [turned(tweak(RD_LIFT, { p: { rise: 1.0 } }), 2.6), 150],
          [mid(RD_LIFT, RD_CALL, 0.5), 70],
          [RD_CALL, 140, { hit: true }],
          [turned(RD_CALL, 3.4), 300],
        ]),
        ...tween(D, RD_CALL, IDLE, 3, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 97, head: 100 }), 110],
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
        [tweak(DEATH_DOWN, { y: -24.6 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VICTORY, 2, 110, ease.out),
        ...keys([
          [turned(VICTORY, 1.8), 160],
          [turned(VICTORY, 2.6), 160],
          [turned(VICTORY, 3.4), 160],
          [turned(VICTORY, 4.2), 160],
          [mid(VICTORY, IDLE, 0.5), 120],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** His gaunt hand in an icon, scaled up, palm up. */
function iconHand(d: Draw, wrist: V, ang: number, z: number) {
  d.capsule({ mat: RB, z, group: 'isleeve' }, at(wrist, ang, -12), at(wrist, ang, -1), 3.6, 4.4);
  d.ellipse({ mat: SK, z: z + 0.2, group: 'ihand' }, at(wrist, ang, 2.2), 3.2, 2.4, ang);
  for (let k = 0; k < 3; k++) d.capsule({ mat: SK, z: z + 0.25, group: 'ifinger' + k }, at(at(wrist, ang, 4), ang + 90, 1.4 - k * 1.4), at(at(wrist, ang + 18 - k * 12, 9), ang + 90, 1.6 - k * 1.6), 0.8, 0.6);
}

/** Black motes painted flat (screen space), each with its violet glint. */
function iconMotes(b: { set(x: number, y: number, c: RGBA): void }, pts: [number, number][]) {
  pts.forEach(([x, y], k) => {
    b.set(x, y, INK.black);
    b.set(x, y - 1, VG.ramp[3]);
    if (k % 2 === 0) {
      b.set(x + 1, y, INK.black);
      b.set(x + 1, y - 1, VG.ramp[2]);
    }
  });
}

/** The closed book in an icon: maroon leather, iron corners, the white bone. */
function iconBook(d: Draw, c: V, z: number) {
  const f = d.frame(c, 90);
  d.poly({ mat: BK, z, group: 'icover' }, [f(-10, -7), f(10, -7), f(10, 7), f(-10, 7)], { kind: 'bevel', w: 2 });
  d.poly({ mat: PG, z: z - 0.1, group: 'icover', shade: -1 }, [f(-9.4, 7), f(9.4, 7), f(9.2, 9.2), f(-9.2, 9.2)], { kind: 'bevel', w: 1 });
  d.capsule({ mat: BN, z: z + 0.2, group: 'ibone' }, f(0, -4), f(0, 4), 1.0, 1.0);
  for (const sgn of [-1, 1]) {
    d.circle({ mat: BN, z: z + 0.21, group: 'ibone' }, f(1.0, sgn * 4.6), 1.1);
    d.circle({ mat: BN, z: z + 0.21, group: 'ibone' }, f(-1.0, sgn * 4.6), 1.1);
  }
  for (const [u, w] of [[-9, -6], [9, -6], [9, 6], [-9, 6]] as const) d.circle({ mat: IR, z: z + 0.15, group: 'icorner' }, f(u, w), 1.4);
}

export const necromancer: ChampionArt = {
  char,
  iconBg: MAT.violet,
  icons: {
    grave_chill: () =>
      compose(MAT.violet, glyph((d) => {
        iconHand(d, v(12, 13), 30, 10);
      }), (b) => {
        // the motes flung from his fingers toward the upper right, slowing as they go (screen space, y down)
        iconMotes(b, [[22, 20], [25, 17], [28, 15], [30, 12], [33, 10], [35, 7], [24, 23], [29, 19]]);
        for (const [x, y] of [[31, 15], [34, 13], [36, 11]] as const) b.set(x, y, VG.ramp[4]);
      }),
    plague_verse: () =>
      compose(MAT.violet, glyph((d) => {
        iconBook(d, v(20, 13), 10);
      }), (b) => {
        // the verse's blight rising off the book: dark smoke going sickly green, motes in it (screen space)
        const G = MAT.glowGreen.ramp;
        for (let k = 0; k < 18; k++) {
          const x = Math.round(14 + (k % 6) * 2.4 + Math.sin(k) * 1.5), y = Math.round(16 - Math.floor(k / 6) * 4 - Math.cos(k * 1.3) * 1.2);
          b.set(x, y, k % 3 === 0 ? G[3] : VG.ramp[1]);
          b.set(x + 1, y, k % 4 === 0 ? G[4] : VG.ramp[2]);
        }
        iconMotes(b, [[12, 9], [27, 8], [20, 5]]);
      }),
    raise_dead: () =>
      compose(MAT.violet, glyph((d) => {
        // a pale hand reaching up out of the dark ground, fingers spread
        d.capsule({ mat: SK, z: 10, group: 'iarm' }, v(20, 4), v(19, 18), 2.6, 2.2);
        d.ellipse({ mat: SK, z: 10.2, group: 'ipalm' }, v(19, 21), 3.4, 2.8, 95);
        for (const [a, l] of [[60, 8], [80, 9.6], [100, 9], [120, 7.6], [150, 5.6]] as const) d.capsule({ mat: SK, z: 10.3, group: 'ifinger' + a }, at(v(19, 21), a, 2), at(v(19, 21), a, l), 0.9, 0.6);
        d.poly({ mat: RB, z: 11, group: 'iground' }, [v(2, 2), v(38, 2), v(38, 7), v(30, 9), v(24, 7), v(16, 8), v(8, 6), v(2, 8)], { kind: 'bevel', w: 1.4 });
      }), (b) => {
        // the motes spiralling up round it
        iconMotes(b, [[11, 30], [28, 28], [13, 22], [27, 18], [15, 13], [24, 9], [31, 24]]);
      }),
  },
};
