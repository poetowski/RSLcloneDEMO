// The Astronomer Royal (docs/DESIGN_DECISIONS.md section 73, Jakub's choice of 2026-11-02:
// "very royal, creative and supreme looking and magic"). She levitates, her hem clear of
// the floor, tall in the Crown's night-blue velvet: a train sweeping far behind her mapped
// with gold constellations and white stars; a high lace collar; a towering gold crown with
// a star over it, silver hair and a long braid, brown skin. Behind her head stands a gold
// armillary halo with a small sun on it, and two planets orbit her body, passing behind and
// before her (the silhouette); for her Hour of Destiny they leave their orbits and line up
// above her. A long brass telescope is her staff, its lens alight; a star hangs over her
// other palm. The Crown's gold crown is on her chest. Her affinity (Ember) sets nothing
// here (Jakub, 2026-10-11).
//
// Pose channels: `wave` the drift of everything that orbits, `align` the planets lined up
// (0..1), `flare` the magic burning up (0..1), `drop` the telescope on the floor, `dead`
// the lights out, the halo and planets fallen.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT, Material } from '../palette.ts';
import { foldTex, robe, RobeCfg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16,
  shin: 16,
  ankleH: 3,
  footLen: 5,
  spine: 22,
  neck: 5,
  upperArm: 12,
  foreArm: 12,
  shoulderDrop: 3.6,
  shoulderN: -2.4,
  shoulderF: 2.6,
  hipN: -1.2,
  hipF: 1.2,
};

const VL = MAT.nightVelvet, AU = MAT.gold, AG = MAT.silver, WH = MAT.whiteCloth, SK = MAT.skinBrown, SU = MAT.glowGold, IC = MAT.glowIce, RD = MAT.glowRed, VI = MAT.glowViolet;
const E = ACCENT;

const lift = (p: V, floor = 0.6): V => v(p.x, Math.max(floor, p.y));

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0, flare = P.flare ?? 0, align = P.align ?? 0;
  const dead = !!P.dead;

  if (dead) fallenOrrery(d, s, 2);
  else halo(d, s, wave, flare, 2);
  if (!dead) planets(d, s, wave, align, flare, 'back', 3);
  train(d, s, wave, dead, 6);
  sleeve(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF', true);
  skirt(d, s, wave, dead, 20);
  body(d, s, 30);
  collar(d, s, 36);
  head(d, s, flare, dead, 38);
  if (P.drop) telescope(d, v(20, 3.2), 2, 0, 44, true);
  else telescope(d, s.hN, P.stAng ?? 85, flare, 50, dead);
  sleeve(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN', false);
  if (!dead) {
    star(d, v(s.hF.x + 1, s.hF.y + 6 + Math.round(Math.sin(wave))), 2 + flare, 66, 'palmStar');
    planets(d, s, wave, align, flare, 'front', 70);
    dust(d, s, wave, flare, 72);
  }
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

/** A star: a white heart and four points of gold, by whole pixels. */
function star(d: Draw, c: V, k: number, z: number, group: string) {
  const px = [{ p: c, c: E.white }];
  for (let i = 1; i <= k; i++) {
    const col = i === k ? SU.ramp[3] : SU.ramp[5];
    px.push({ p: v(c.x + i, c.y), c: col }, { p: v(c.x - i, c.y), c: col }, { p: v(c.x, c.y + i), c: col }, { p: v(c.x, c.y - i), c: col });
  }
  d.pixels({ mat: SU, z, group, line: 'none', outline: false }, px);
}

const circlePts = (c: V, rx: number, ry: number, from = 0, to = 360, n = 26): V[] => {
  const out: V[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    out.push(v(c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry));
  }
  return out;
};

/** The armillary halo behind her head: two gold rings, ticks of the zodiac, the small sun riding the outer ring, struts down to her back. */
function halo(d: Draw, s: Skel, wave: number, flare: number, z: number) {
  const c = s.T(23, -5);
  const R = 24;
  for (const u of [-1, 1]) d.ribbon({ mat: AU, z: z - 0.2, group: 'strut' + u, shade: -1 }, [s.T(15, -4), v(c.x + u * 9, c.y - R * 0.86)], [1, 0.8]);
  const outer = circlePts(c, R, R);
  d.ribbon({ mat: AU, z, group: 'haloA' }, outer, outer.map(() => 0.9));
  const inner = circlePts(c, R * 0.62, R * 0.92);
  d.ribbon({ mat: AU, z: z - 0.1, group: 'haloB', shade: -1, line: 'none' }, inner, inner.map(() => 0.5));
  const ticks: { p: V; c: typeof E.white }[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    ticks.push({ p: v(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R), c: i % 3 ? AU.ramp[5] : E.white });
  }
  d.pixels({ mat: AU, z: z + 0.1, group: 'haloT', line: 'none', outline: false }, ticks);
  // the sun, drifting a little along the ring
  const a = ((62 + Math.sin(wave) * 26) * Math.PI) / 180;
  const q = v(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R);
  d.circle({ mat: SU, z: z + 0.2, group: 'sun' }, q, 2.6 + flare);
  d.pixels({ mat: SU, z: z + 0.3, group: 'sun', line: 'none', outline: false }, [{ p: q, c: E.white }, { p: v(q.x + 1, q.y), c: SU.ramp[5] }]);
}

/** The two planets on their orbit round her, its near half before her and its far half behind; with `align` they rise out of it and line up over her head. */
function planets(d: Draw, s: Skel, wave: number, align: number, flare: number, part: 'back' | 'front', z: number) {
  const c = s.T(8, 0);
  const rx = 27, ry = 7;
  const fade = 1 - align;
  if (fade > 0.05) {
    const arc = part === 'back' ? circlePts(c, rx * fade, ry * fade, 0, 180, 14) : circlePts(c, rx * fade, ry * fade, 180, 360, 14);
    d.ribbon({ mat: AU, z, group: 'orbit' + part, line: 'none', shade: part === 'back' ? -1 : 0 }, arc, arc.map(() => 0.45));
  }
  const top = s.T(24, 0);
  ([[0, IC, 3.2, 12], [Math.PI * 0.9, RD, 2.4, 22]] as const).forEach(([ph, mat, r, h], i) => {
    const a = wave + ph;
    const behind = Math.sin(a) >= 0;
    if (behind !== (part === 'back')) return;
    const on = v(c.x + Math.cos(a) * rx, c.y + Math.sin(a) * ry);
    const up = v(top.x + 6, top.y + h + 8);
    const q = lerpV(on, up, align);
    planet(d, q, r + flare * 0.4, mat, z + 0.1, 'planet' + i);
  });
  if (align > 0.5 && part === 'front') planet(d, v(top.x + 6, top.y + 9), 1.6, VI, z + 0.1, 'planet3');
}

function planet(d: Draw, q: V, r: number, mat: Material, z: number, g: string) {
  d.circle({ mat, z, group: g }, q, r);
  d.pixels({ mat, z: z + 0.05, group: g, line: 'none', outline: false }, [{ p: v(q.x - 1, q.y + 1), c: mat.ramp[5] }]);
}

/** The fallen halo, lying on the floor behind her, its planets gone dark and rolled away. */
function fallenOrrery(d: Draw, s: Skel, z: number) {
  const c = v(s.hipN.x - 16, 7);
  const ring = circlePts(c, 20, 5.4).map((p) => lift(p));
  d.ribbon({ mat: AU, z, group: 'haloA', shade: -1 }, ring, ring.map(() => 0.8));
  for (const [dx, r] of [[-26, 2.6], [20, 2]] as const) d.circle({ mat: AG, z: z + 0.1, group: 'dead' + dx, shade: -2 }, v(c.x + dx, r + 0.8), r);
}

/** The train: velvet from her shoulders sweeping far behind her, a gold hem, gold constellations and white stars keyed to the cloth so they stay put on it. */
function train(d: Draw, s: Skel, wave: number, dead: boolean, z: number) {
  const floor = dead ? 0.6 : 2.6;
  const topB = s.T(20, -5), topF = s.T(20, 2.6);
  const hang = s.pose.torso - 186 + Math.sin(wave) * 1.1;
  // standing it fans out behind her; as she falls it comes to lie along her
  const up = Math.max(0, Math.min(1, (s.pose.torso - 25) / 50));
  const botB = lift(at(topB, hang + 10 - 36 * up, 66), floor), botF = lift(at(topF, hang + 4 + 6 * (1 - up), 52), floor);
  const midB = lift(at(topB, hang + 10 - 40 * up, 34), floor);
  const hemM = lift(lerpV(botB, botF, 0.5), floor);
  d.poly({ mat: VL, z, group: 'train', tex: foldTex(10, wave * 0.4, 0.5) }, [topF, topB, midB, botB, lerpV(botB, hemM, 0.5), hemM, lerpV(hemM, botF, 0.5), botF], { kind: 'cyl', a: lerpV(topB, topF, 0.5), b: lerpV(botB, botF, 0.5), r: 12, bevel: 1.2 });
  d.ribbon({ mat: AU, z: z + 0.1, group: 'trainHem', line: 'none' }, [botB, hemM, botF], [0.9, 0.9, 0.9]);
  d.ribbon({ mat: AU, z: z + 0.1, group: 'trainEdge', line: 'none', shade: -1 }, [topB, midB, botB], [0.5, 0.6, 0.7]);
  // bilinear on the cloth: k from the shoulders down, w from its back edge to its front
  const on = (k: number, w: number) => {
    const b = k < 0.5 ? lerpV(topB, midB, k * 2) : lerpV(midB, botB, (k - 0.5) * 2);
    return lift(lerpV(b, lerpV(topF, botF, k), w), floor);
  };
  const figs: [number, number][][] = [[[0.3, 0.3], [0.42, 0.6], [0.56, 0.42], [0.64, 0.74]], [[0.72, 0.14], [0.84, 0.32], [0.8, 0.58], [0.93, 0.74]]];
  for (const [i, fig] of figs.entries()) {
    const pts = fig.map(([k, w]) => on(k, w));
    d.ribbon({ mat: AU, z: z + 0.2, group: 'fig' + i, line: 'none', shade: -1 }, pts, pts.map(() => 0.28));
    d.pixels({ mat: WH, z: z + 0.3, group: 'fig' + i, line: 'none', outline: false }, pts.map((p, n) => ({ p, c: dead ? WH.ramp[2] : n % 2 === Math.round(wave / 2) % 2 ? E.white : AU.ramp[5] })));
  }
  d.pixels({ mat: WH, z: z + 0.3, group: 'dustCloth', line: 'none', outline: false }, [[0.18, 0.5], [0.48, 0.16], [0.7, 0.5], [0.9, 0.5], [0.62, 0.2], [0.34, 0.82]].map(([k, w]) => ({ p: on(k, w), c: WH.ramp[4] })));
}

const ROBE: RobeCfg = { waist: [1.4, 4.2, 4.6], hemDrop: 1.2, hemFloor: 3, hemBack: [8, 6], hemFront: [6, 5], midBack: [4, 3], midFront: [3.4, 2.4], ripple: 0.7, zigzag: 0 };

function skirt(d: Draw, s: Skel, wave: number, dead: boolean, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: VL, z, group: 'skirt', tex: foldTex(8, wave * 0.5, 0.6) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  d.ribbon({ mat: AU, z: z + 0.1, group: 'hem', line: 'none' }, r.hem, r.hem.map(() => 0.7));
  // the white panel down her front, gold at both edges
  const f0 = s.T(1, 1.8), f1 = lerpV(r.hemF, r.hemB, 0.3), g0 = s.T(1, 3.6), g1 = lerpV(r.hemF, r.hemB, 0.08);
  d.poly({ mat: WH, z: z + 0.15, group: 'panel', line: 'none' }, [f0, g0, g1, f1], { kind: 'bevel', w: 0.8 });
  d.ribbon({ mat: AU, z: z + 0.2, group: 'panel', line: 'none' }, [f0, f1], [0.4, 0.5]);
  d.ribbon({ mat: AU, z: z + 0.2, group: 'panel', line: 'none' }, [g0, g1], [0.4, 0.5]);
  if (!dead) {
    const px = [0.3, 0.55, 0.8].map((k) => ({ p: lerpV(lerpV(f0, g0, 0.5), lerpV(f1, g1, 0.5), k), c: AU.ramp[5] }));
    d.pixels({ mat: AU, z: z + 0.25, group: 'panel', line: 'none', outline: false }, px);
  }
}

function body(d: Draw, s: Skel, z: number) {
  const b = torsoPts(s, [
    [0, 4, 4.2],
    [5, 3.4, 3.6],
    [10, 3.8, 4.4],
    [16, 4.6, 5],
    [20, 4.2, 3.6],
    [22, 2.6, 2.2],
  ]);
  d.poly({ mat: VL, z, group: 'body', tex: foldTex(5, 0.6, 0.4) }, b, { kind: 'cyl', a: s.T(0, 0.4), b: s.T(22, 0.4), r: 5.2, bevel: 1.1 });
  // the gold belt
  d.ribbon({ mat: AU, z: z + 0.1, group: 'belt' }, [s.T(1.2, -4), s.T(1.8, 0), s.T(1.2, 4.2)], [1, 1.1, 1]);
  // gold down the front, and the Crown's gold crown on the chest
  d.ribbon({ mat: AU, z: z + 0.1, group: 'front', line: 'none' }, [s.T(2.4, 3.6), s.T(10, 3.8), s.T(19, 2.8)], [0.5, 0.5, 0.5]);
  const m = s.T(13, 1);
  const px: { p: V; c: typeof E.white }[] = [];
  for (const [x, y] of [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-2, 1], [0, 1], [2, 1], [-2, 2], [0, 2], [2, 2], [-1, 1], [1, 1]] as const) px.push({ p: v(m.x + x, m.y + y), c: y === 2 ? AU.ramp[5] : AU.ramp[4] });
  d.pixels({ mat: AU, z: z + 0.3, group: 'chestMark', line: 'none', outline: false }, px);
}

/** The high collar standing behind her head: a fan of white lace edged in gold. */
function collar(d: Draw, s: Skel, z: number) {
  const H = s.H;
  const base = s.T(20.5, -1);
  const rim = [H(-1, 3.4 - 13), H(-7, -5), H(-11, -1), H(-12.4, 4), H(-11.4, 9), H(-8.4, 12)];
  d.poly({ mat: WH, z: z - 8, group: 'collar', line: 'soft' }, [base, ...rim], { kind: 'bevel', w: 1 });
  d.ribbon({ mat: AU, z: z - 7.9, group: 'collar', line: 'none' }, rim, rim.map(() => 0.5));
  for (const p of rim.slice(1, 5)) d.line({ mat: WH, z: z - 7.95, group: 'collar', line: 'none' }, base, p, WH.ramp[1]);
}

/** A strong profile, silver hair and a long braid, the towering crown with a star over it. */
function head(d: Draw, s: Skel, flare: number, dead: boolean, z: number) {
  const H = s.H;
  // hair and the braid behind
  d.poly({ mat: AG, z: z - 0.2, group: 'hair' }, [H(0, 7), H(-5.4, 5.4), H(-6.4, 0), H(-5, -6), H(-2, -5), H(-1, 0)], { kind: 'dome', c: H(-3, 1), r: 6.6, bevel: 1 });
  const braid = [H(-5, -4), H(-7.6, -11), H(-7, -19), H(-9, -27)];
  d.ribbon({ mat: AG, z: z - 0.3, group: 'braid' }, braid, [1.7, 1.5, 1.2, 0.7]);
  // the face
  d.poly({ mat: SK, z, group: 'head' }, [H(4.8, 4.8), H(0.6, 5.4), H(-1.6, 1.6), H(-1, -3.4), H(1.6, -6.2), H(4.2, -6), H(5.8, -3.4), H(5.2, -1.4), H(6.8, -0.8), H(5.2, 1.4)], { kind: 'dome', c: H(1.8, 0), r: 6, bevel: 1 });
  const lit = dead ? SK.ramp[0] : IC.ramp[4];
  const px: { p: V; c: typeof E.white }[] = [
    { p: H(2.8, 2.4), c: SK.ramp[0] }, { p: H(3.8, 2.4), c: SK.ramp[0] }, { p: H(4.8, 2), c: SK.ramp[0] },
    { p: H(3.2, 1), c: SK.ramp[0] }, { p: H(4.2, 1), c: lit },
    { p: H(3.8, -3.4), c: RD.ramp[1] }, { p: H(4.8, -3.4), c: RD.ramp[2] },
    { p: H(0.4, -1.6), c: AU.ramp[5] },
  ];
  d.pixels({ mat: SK, z: z + 0.1, group: 'face', line: 'none', outline: false }, px);
  // the crown: velvet inside, five gold points, a jewel on each, a star over all
  const pts = [H(-5.8, 3.6), H(-7.6, 12.4), H(-3.8, 8.4), H(-1.6, 16), H(0.6, 8.8), H(3.2, 15), H(4, 8), H(7.6, 12), H(5.8, 3)];
  d.poly({ mat: VL, z: z + 0.15, group: 'crownIn', line: 'none' }, [H(-5, 4), H(-4, 11), H(4, 11), H(5, 3.6)], { kind: 'bevel', w: 0.8 });
  d.poly({ mat: AU, z: z + 0.2, group: 'crown' }, pts, { kind: 'bevel', w: 1.1 });
  d.ribbon({ mat: AU, z: z + 0.25, group: 'crownBand', shade: 1, line: 'none' }, [H(-5.8, 4.4), H(0, 5.2), H(5.8, 4)], [0.9, 0.9, 0.9]);
  const jewels: [number, number, Material][] = [[-7.2, 11.4, IC], [-1.6, 14.8, RD], [3.2, 13.8, IC], [7, 11, RD], [0, 5, IC]];
  d.pixels({ mat: AU, z: z + 0.3, group: 'jewels', line: 'none', outline: false }, jewels.map(([u, w, m]) => ({ p: H(u, w), c: dead ? AU.ramp[1] : m.ramp[4] })));
  if (!dead) star(d, H(-1.6, 19), 1 + Math.round(flare), z + 0.4, 'crownStar');
}

function sleeve(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string, open: boolean) {
  d.capsule({ mat: VL, z, group, shade }, sh, el, 3, 2.8);
  d.capsule({ mat: VL, z: z + 0.1, group, shade }, el, at(ha, lo, -2.4), 2.8, 3.8);
  d.ribbon({ mat: AU, z: z + 0.15, group: group + 'c', shade, line: 'none' }, [at(at(ha, lo, -2.2), lo + 90, 3.6), at(at(ha, lo, -2.2), lo - 90, 3.6)], [0.8, 0.8]);
  // gold at the shoulder
  d.ellipse({ mat: AU, z: z + 0.2, group: group + 's', shade }, sh, 3.4, 2.8, 0);
  d.ellipse({ mat: SK, z: z + 0.3, group: group + 'h', shade }, ha, 1.8, 1.5, lo);
  if (open) {
    const f = d.frame(ha, lo + 40);
    d.ribbon({ mat: SK, z: z + 0.35, group: group + 'h', shade, line: 'none' }, [f(0, 0), f(4, 0.4)], [0.8, 0.4]);
  }
}

/** The long brass telescope she carries as a staff: three drawn tubes, gold rings, its lens alight. */
function telescope(d: Draw, hand: V, ang: number, flare: number, z: number, out: boolean) {
  const f = d.frame(hand, ang);
  d.ribbon({ mat: AU, z, group: 'tubeA', shade: -1 }, [f(-34, 0), f(-12, 0)], [0.8, 1]);
  d.ribbon({ mat: AU, z: z + 0.1, group: 'tubeB' }, [f(-12, 0), f(10, 0)], [1.3, 1.5]);
  d.ribbon({ mat: AU, z: z + 0.2, group: 'tubeC' }, [f(10, 0), f(27, 0)], [2, 2.5]);
  for (const u of [-12, 10, 19, 27]) d.line({ mat: AG, z: z + 0.3, group: 'rings', line: 'none' }, f(u, -3), f(u, 3), AG.ramp[5]);
  // the foot, a point of silver
  d.ribbon({ mat: AG, z: z - 0.1, group: 'foot', line: 'soft' }, [f(-34, 0), f(-37, 0)], [0.9, 0.2]);
  d.ellipse({ mat: out ? AG : IC, z: z + 0.4, group: 'lens', shade: out ? -2 : 0 }, f(29, 0), 1.4 + flare * 0.6, 3.6 + flare, ang);
  if (out) return;
  d.pixels({ mat: IC, z: z + 0.5, group: 'lens', line: 'none', outline: false }, [{ p: f(29, 1), c: E.white }, { p: f(29, -1), c: IC.ramp[5] }]);
  if (flare > 0.5) star(d, f(35, 0), 3, z + 9, 'lensStar');
}

/** Star-dust rising under her hem and round her, on whole loops. */
function dust(d: Draw, s: Skel, wave: number, flare: number, z: number) {
  const n = 7 + Math.round(flare * 5);
  const px: { p: V; c: typeof E.white }[] = [];
  for (let i = 0; i < n; i++) {
    const ph = ((wave / (Math.PI * 2)) + i / n) % 1;
    const y = Math.round(1 + ph * (28 + flare * 26));
    const x = s.hipN.x - 16 + ((i * 37) % 34) + Math.sin(wave + i) * 1.4;
    px.push({ p: v(x, y), c: i % 3 ? SU.ramp[4] : IC.ramp[4] });
  }
  d.pixels({ mat: SU, z, group: 'dust', line: 'none', outline: false }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const queen = (hN: V, hF: V, o: Partial<Pose> & { p?: Record<string, number> }, st = 85) =>
  pose({ armN: { ik: hN, bend: -1 }, armF: { ik: hF, bend: -1 }, ...o, p: { stAng: st, ...(o.p ?? {}) } });

const STAND = { torso: 90, head: 91, legN: { ik: v(-3, 3) }, legF: { ik: v(3, 3) } };
const IDLE = queen(v(15, 37), v(21, 46), { ...STAND });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return queen(v(15, 37), v(21, 46 + b), { y: b, ...STAND, p: { wave: a } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round(Math.sin(a));
  // she does not run: she glides, leaning a little
  return queen(v(17, 38 + b), v(20, 44 + b), { y: 1 + b, torso: 82, head: 86, legN: { ik: v(-5, 4) }, legF: { ik: v(1, 4) }, p: { wave: a } }, 66);
}

// Falling Star: the telescope lifted to the sky, then she calls it down.
const FS_UP = queen(v(12, 50), v(8, 40), { y: 1, torso: 95, head: 104, legN: { ik: v(-3, 3) }, legF: { ik: v(3, 3) }, p: { wave: 1 } }, 66);
const FS_CALL = queen(v(19, 52), v(24, 40), { y: 1, torso: 86, head: 90, legN: { ik: v(-3, 3) }, legF: { ik: v(3, 3) }, p: { wave: 1.6, flare: 1 } }, 48);
const FS_HOLD = tweak(FS_CALL, { p: { wave: 2, flare: 0.3 } });

// Eclipse: the free hand raised and closing slowly over the sky.
const EC_LIFT = queen(v(15, 37), v(23, 62), { y: 2, torso: 92, head: 98, legN: { ik: v(-3, 3) }, legF: { ik: v(3, 3) }, p: { wave: 1, flare: 0.5 } });
const EC_HELD = tweak(EC_LIFT, { y: 3, p: { wave: 2, flare: 1 } });

// Hour of Destiny: she rises, the telescope and her hand lifted, and the planets leave their orbits and line up over her.
const HD_RISE = queen(v(14, 52), v(16, 60), { y: 5, torso: 91, head: 106, legN: { ik: v(-3, 3) }, legF: { ik: v(3, 3) }, p: { wave: 2, flare: 0.6, align: 0.5 } }, 88);
const HD_ALIGN = tweak(HD_RISE, { y: 7, p: { wave: 2, flare: 1, align: 1 } });

const HURT = queen(v(10, 36), v(14, 40), { x: -4, torso: 98, head: 106, legN: { ik: v(-6, 3) }, legF: { ik: v(3, 4) } }, 94);
const DEATH_KNEEL = queen(v(10, 26), v(6, 22), { y: -10, torso: 74, head: 54, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, footN: -12, p: { dead: 1 } }, 40);
const DEATH_FALL = pose({
  x: 2, y: -7, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { dead: 1, drop: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -21, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { dead: 1, drop: 1 },
});
const RAISE = queen(v(14, 50), v(20, 62), { y: 3, torso: 90, head: 98, legN: { ik: v(-3, 3) }, legF: { ik: v(3, 3) }, p: { wave: 1, flare: 0.8 } }, 84);

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'astronomer_royal',
  name: 'Astronomer Royal',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(16, 260, idle) },
    run: { loop: true, frames: cycle(8, 110, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, FS_UP, 3, 110, ease.out),
        ...keys([
          [FS_UP, 260],
          [mid(FS_UP, FS_CALL, 0.5), 80],
          [FS_CALL, 120, { hit: true }],
          [FS_HOLD, 320],
        ]),
        ...tween(D, FS_HOLD, IDLE, 3, 130, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, EC_LIFT, 3, 130, ease.out),
        ...keys([
          [EC_LIFT, 300, { event: 'cast' }],
          [EC_HELD, 140, { hit: true }],
          [tweak(EC_HELD, { p: { wave: 3, flare: 1 } }), 340],
          [EC_HELD, 240],
        ]),
        ...tween(D, EC_HELD, IDLE, 3, 140, ease.inOut),
      ],
    },
    ritual: {
      loop: false,
      frames: [
        ...tween(D, IDLE, HD_RISE, 4, 130, ease.out),
        ...keys([
          [mid(HD_RISE, HD_ALIGN, 0.5), 200],
          [HD_ALIGN, 160, { event: 'cast', hit: true }],
          [tweak(HD_ALIGN, { p: { wave: 2.5, flare: 1, align: 1 } }), 420],
          [HD_ALIGN, 320],
          [HD_RISE, 180],
        ]),
        ...tween(D, HD_RISE, IDLE, 3, 150, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 95, head: 100 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 120],
        [DEATH_KNEEL, 280],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 150],
        [tweak(DEATH_DOWN, { y: -21.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, RAISE, 0.5), 110],
        [RAISE, 700],
        [mid(RAISE, IDLE, 0.5), 120],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons (glyph space: y up)
// ---------------------------------------------------------------------------

const iconStar = (d: Draw, x: number, y: number, r: number, z: number, g: string) =>
  d.poly({ mat: SU, z, group: g, line: 'soft' }, [v(x, y + r), v(x + r * 0.26, y + r * 0.26), v(x + r, y), v(x + r * 0.26, y - r * 0.26), v(x, y - r), v(x - r * 0.26, y - r * 0.26), v(x - r, y), v(x - r * 0.26, y + r * 0.26)], { kind: 'bevel', w: 0.8 });

export const astronomerRoyal: ChampionArt = {
  char,
  iconBg: VL,
  icons: {
    falling_star: () =>
      compose(VL, glyph((d) => {
        d.ribbon({ mat: SU, z: 2, group: 'trail', line: 'none' }, [v(35, 35), v(14, 13)], [0.4, 2.4]);
        iconStar(d, 13, 12, 9, 3, 'star');
      })),
    eclipse: () =>
      compose(VL, glyph((d) => {
        d.circle({ mat: SU, z: 2, group: 'sun' }, v(20, 20), 13);
        d.circle({ mat: AG, z: 3, group: 'moon', shade: -3 }, v(22, 21), 11);
      })),
    hour_of_destiny: () =>
      compose(VL, glyph((d) => {
        d.circle({ mat: IC, z: 3, group: 'p1' }, v(20, 9), 5);
        d.circle({ mat: RD, z: 3, group: 'p2' }, v(20, 21), 4);
        d.circle({ mat: VI, z: 3, group: 'p3' }, v(20, 30), 2.6);
        const r = circlePts(v(20, 20), 16, 16);
        d.ribbon({ mat: AU, z: 2, group: 'ring' }, r, r.map(() => 0.8));
      })),
    fixed_stars: () =>
      compose(VL, glyph((d) => {
        iconStar(d, 20, 20, 13, 3, 'star');
        iconStar(d, 32, 32, 4, 3, 'star2');
        iconStar(d, 8, 9, 3, 3, 'star3');
      })),
  },
};
