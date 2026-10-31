// Chief Engineer CJ (docs/DESIGN_DECISIONS.md section 37, Jakub's brief of
// 2026-10-31, and his word the same day: "make him more fantasy and remove no
// yolo words"): a Heroic of the Sanguine Dominion, Tank. A fat man holding a big
// two-handed hammer that produces electrical sparks, with a gear belt and an
// orange hat, "weird for settings, but he do". So he is a forge-master of the
// Dominion: a broad, heavy man with a belly hanging over his belt, in a maroon
// coat and dark breeches under a great leather apron, the Dominion's red hexagon
// on a bronze medallion on its front; bronze pauldrons, bracers and boot cuffs;
// a round face, a thick moustache, a long brown beard with a bronze ring round its
// braid. The hat is his orange: an enamelled helm with a bronze ridge and rim and
// a rune lit at its front. The belt carries gears (a copper cog for a buckle), a
// spanner and pouches. The hammer is a long dark haft under a great iron head with
// steel faces and a bronze band cut with lit runes, blue-white arcs jumping off it
// now and then, sparks falling. What the brief leaves open is a first take. His
// affinity sets nothing here (affinities are abstract, Jakub, 2026-10-11).
//
// Pose channels: `hamAng` the hammer's direction from the near hand, `grip` how
// far up the haft the far hand holds, `solo` the far hand alone holds it (planted,
// the head on the ground), `breath` swells the belly, `charge` how much the head
// arcs (0..3), `fault` the charge running along the ground from the blow (0..1),
// `shout` opens his mouth, `finger` the near hand holds up one finger (`fist`: it does not), `hatX` `hatY` `hatAng` the hat off his
// head, on the ground.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { hash2, RGBA } from '../raster.ts';
import { leg, smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 30,
  thigh: 14,
  shin: 13.2,
  ankleH: 3,
  footLen: 8,
  spine: 25,
  neck: 3.2,
  upperArm: 13.5,
  foreArm: 12.5,
  shoulderDrop: 5.5,
  shoulderN: -7,
  shoulderF: 7,
  hipN: -5,
  hipF: 5,
};

const SU = MAT.maroon, LG = MAT.charcoal, AP = MAT.leather, BZ = MAT.bronze, DK = MAT.darksteel, HT = MAT.safetyOrange, SK = MAT.skinLight, BT = MAT.darkleather, BE = MAT.leather, IR = MAT.iron, ST = MAT.steel, WD = MAT.ebony, CU = MAT.copper, HR = MAT.hairBrown, AR = MAT.glowIce;
const E = ACCENT;

/** The streak of a swing: the steel's pale light with the arcs' blue at its edge. */
const SWING = { core: AR.ramp[5], edge: AR.ramp[3] };

/** The hammer, measured from the near hand along the haft: the butt, the head's centre, its half height along the haft and half length across it. */
const BUTT = 9, HEAD = 37, HH = 7.5, HW = 13;
const GRIP = 13;

/** The body's outline, torso-local [u, half-width behind, half-width before]: a belly hanging forward, a rounded back. */
const ROWS: [number, number, number][] = [
  [-3, 9.5, 13],
  [0, 11.5, 17],
  [4, 12, 20],
  [8, 12.5, 21.5],
  [12, 12.5, 20.5],
  [16, 12, 17],
  [20, 11, 12],
  [23, 8.5, 7.5],
  [25.2, 4, 3.5],
];

/** The outline swelling with a breath: the belly most. */
const breathing = (b: number): [number, number, number][] => ROWS.map(([u, bk, fr]) => [u, bk + b * 0.3, fr + b * (u > 1 && u < 17 ? 1 : 0.3)]);

/** The big letters, five pixels tall; a Y needs five across to read as one. */
const GLYPHS: Record<string, string[]> = {
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.##.', '#..#', '#..#', '#..#', '.##.'],
  Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..'],
  L: ['#...', '#...', '#...', '#...', '####'],
};

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const ang = P.hamAng ?? -24;
  const solo = (P.solo ?? 0) >= 0.5;

  // the streak of a swing behind everything
  if (info.def.smear && info.prev) smear(d, s.hN, P.sweepFrom ?? info.prev.pose.p.hamAng ?? ang, ang, HEAD + HH, 16, SWING, 3);

  // far leg, far arm behind the body
  leg(d, s, 'F', legCfg(10, -1));
  const far = farArm(s, ang);
  suitArm(d, far.s, far.e, far.h, 20, -1, 'armF');
  pauldron(d, far.s, Math.atan2(far.e.y - far.s.y, far.e.x - far.s.x) * 57.2958, 20.5, -1, 'paulF');

  // the body under its apron, the head
  body(d, s, breathing(P.breath ?? 0), 30);
  head(d, s, P, 38);

  // near leg, the gear belt over the hips
  leg(d, s, 'N', legCfg(50, 0));
  belt(d, s, 53);
  bellyFold(d, s, breathing(P.breath ?? 0), 53.6);

  // the hammer, the far glove on its haft, the near arm over it
  const hand = solo ? far.h : s.hN;
  hammer(d, hand, ang, 56);
  glove(d, far.h, ang, 57, -1, 'handF');
  if (solo) fingerArm(d, s, 60, P);
  else {
    suitArm(d, s.sN, s.eN, s.hN, 60, 0, 'armN');
    glove(d, s.hN, ang, 60.4, 0, 'handN');
  }
  pauldron(d, s.sN, s.upN, 61, 0, 'paulN');

  if (P.hatX !== undefined) hat(d, d.frame(v(P.hatX, P.hatY ?? 3), P.hatAng ?? 0), 62);
  arcs(d, hand, ang, info, P, 70);
  if (P.fault) groundArcs(d, hand, ang, info, P.fault, 71);
}

const legCfg = (z: number, shade: number) => ({
  thigh: LG, shin: LG, foot: BT, knee: LG, kneeR: 4.6, rThigh: [7.2, 5.4] as [number, number], rShin: [4.8, 4] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: BT, from: 0.68, r: [4.8, 4.4] as [number, number], cuff: BT },
});

/** The far arm: on the haft `grip` ahead of the near hand, solved so it stays there through every blend; with `solo` it holds the hammer alone. */
function farArm(s: Skel, ang: number): { s: V; e: V; h: V } {
  if ((s.pose.p.solo ?? 0) >= 0.5) return { s: s.sF, e: s.eF, h: s.hF };
  const r = ik2(s.sF, at(s.hN, ang, s.pose.p.grip ?? GRIP), D.upperArm, D.foreArm, -1);
  return { s: s.sF, e: r.mid, h: r.end };
}

/** A thick arm in its maroon sleeve, a bronze bracer on the forearm. */
function suitArm(d: Draw, sh: V, el: V, ha: V, z: number, shade: number, g: string) {
  const lo = Math.atan2(ha.y - el.y, ha.x - el.x) * 57.2958;
  d.circle({ mat: SU, z, group: g, shade }, sh, 5.2);
  d.capsule({ mat: SU, z: z + 0.05, group: g, shade }, sh, el, 5, 4.2);
  d.capsule({ mat: SU, z: z + 0.1, group: g, shade }, el, ha, 4.2, 3.6);
  d.capsule({ mat: BT, z: z + 0.15, group: g + 'b', shade, line: 'soft' }, at(ha, lo, -7), at(ha, lo, -2.8), 4.2, 3.9);
  d.line({ mat: BZ, z: z + 0.16, group: g + 'b', line: 'none' }, at(at(ha, lo, -4), lo + 90, 3.4), at(at(ha, lo, -4), lo - 90, 3.4), BZ.ramp[shade < 0 ? 2 : 4]);
}

/** A pauldron of dark steel: two lames over the shoulder, bronze along the lower edge, a rivet on the top one. */
function pauldron(d: Draw, sh: V, up: number, z: number, shade: number, g: string) {
  const off = ((up + 90 + 540) % 360) - 180;
  const a = -90 + Math.max(-50, Math.min(50, off));
  const top = at(sh, a, -0.6);
  d.ellipse({ mat: BZ, z: z - 0.02, group: g + '1', shade, line: 'soft' }, at(top, a, 3.4), 5.8, 3.2, a + 90, 0.15);
  d.ellipse({ mat: DK, z: z - 0.01, group: g + '1', shade, line: 'none' }, at(top, a, 2.8), 5.4, 3, a + 90, 0.15);
  d.ellipse({ mat: DK, z, group: g + '0', shade, line: 'soft' }, top, 6.2, 4, a + 90, 0.15);
  d.pixels({ mat: BZ, z: z + 0.01, group: g + '0', line: 'none' }, [{ p: top, c: BZ.ramp[5] }, { p: v(top.x + 1, top.y - 1), c: BZ.ramp[2] }]);
}

/** A work glove round the haft. */
function glove(d: Draw, h: V, ang: number, z: number, shade: number, g: string) {
  d.ellipse({ mat: BE, z, group: g, shade }, h, 3.5, 3.2, ang);
  const f = d.frame(h, ang);
  for (const u of [-1.6, 0, 1.6]) d.line({ mat: BE, z: z + 0.05, group: g, line: 'none' }, f(u, -2.4), f(u, 2.2), BE.ramp[2]);
}

/** The near arm as he gives his word: its hand held up behind his head, one finger raised. */
function fingerArm(d: Draw, s: Skel, z: number, P: Record<string, number>) {
  suitArm(d, s.sN, s.eN, s.hN, z, 0, 'armN');
  d.ellipse({ mat: BE, z: z + 0.3, group: 'handN' }, s.hN, 3.2, 3.0, s.loN);
  if (P.fist) return;
  const tip = at(s.hN, 90 + (P.finger ?? 0), 7.4);
  d.capsule({ mat: BE, z: z + 0.35, group: 'handN' }, s.hN, tip, 1.4, 1.1);
}

/** The body's half-width before, at height u. */
function frontAt(rows: [number, number, number][], u: number): number {
  for (let i = 1; i < rows.length; i++) if (u <= rows[i][0]) {
    const [u0, , f0] = rows[i - 1], [u1, , f1] = rows[i];
    return f0 + ((f1 - f0) * (u - u0)) / (u1 - u0);
  }
  return 0;
}

/** The maroon coat, and over the belly the great leather apron: its straps to the neck, brass studs down its edge, the Dominion's hexagon on a bronze medallion. */
function body(d: Draw, s: Skel, rows: [number, number, number][], z: number) {
  const T = s.T;
  const nm = { kind: 'cyl' as const, a: T(-3, 2), b: T(25, 2), r: 18, bevel: 1.5 };
  d.poly({ mat: SU, z, group: 'body' }, torsoPts(s, rows), nm);
  // the apron: from high on the chest to below the belly, wrapped round his front
  const us = [20, 16, 12, 8, 4, 0, -3];
  const edge = (u: number) => -4 - Math.max(0, 14 - Math.abs(u - 7)) * 0.25;
  d.poly(
    { mat: AP, z: z + 0.2, group: 'apron', line: 'soft', tex: (h) => (Math.sin(h.u * 19 + h.v * 5) > 0.86 ? -1 : 0) },
    [...us.map((u) => T(u, frontAt(rows, u) + 0.2)), ...[...us].reverse().map((u) => T(u, edge(u)))],
    nm,
  );
  // the straps to the neck
  d.ribbon({ mat: AP, z: z + 0.25, group: 'apron' }, [T(19.6, 7.4), T(23, 4), T(25, 0.6)], [1.1, 1, 0.9]);
  d.ribbon({ mat: AP, z: z + 0.25, group: 'apron' }, [T(19.6, -3), T(23, -2), T(25, -0.8)], [1.1, 1, 0.9]);
  // the studs down its back edge
  const px: { p: V; c: RGBA }[] = [];
  for (const u of [17, 12.5, 8, 3.5]) px.push({ p: T(u, edge(u) + 1.2), c: BZ.ramp[4] });
  d.pixels({ mat: BZ, z: z + 0.3, group: 'apron', line: 'none' }, px);
  medallion(d, s, z + 0.4);
}

/** A bronze medallion on the apron's front, the Dominion's red hexagon on black in its middle. Laid pixel by pixel on the torso, so it leans with him. */
function medallion(d: Draw, s: Skel, z: number) {
  const px: { p: V; c: RGBA }[] = [];
  const rows = ['..#######..', '.#xxxxxxx#.', '#xxxrrrxxx#', '#xxrrrrrxx#', '#xrrrrrrrx#', '#xxrrrrrxx#', '#xxxrrrxxx#', '.#xxxxxxx#.', '..#######..'];
  rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch === '.') return;
    const lit = ry + rx < 8;
    const c = ch === '#' ? BZ.ramp[lit ? 5 : 3] : ch === 'x' ? INK.black : E.red;
    px.push({ p: s.T(16.5 - ry, 8.5 + d.facing * (rx - 5)), c });
  }));
  d.pixels({ mat: BZ, z, group: 'medal', line: 'none' }, px);
}

/** The lowest fold of the belly, hanging over the belt: drawn after it, the crease under it dark. */
function bellyFold(d: Draw, s: Skel, rows: [number, number, number][], z: number) {
  const T = s.T;
  const f = (u: number) => frontAt(rows, u);
  const nm = { kind: 'cyl' as const, a: T(-3, 2), b: T(25, 2), r: 18, bevel: 1.5 };
  d.poly({ mat: AP, z, group: 'fold', line: 'none' }, [T(8, -1), T(8, f(8)), T(5, f(5)), T(3, f(3) - 0.5), T(1.6, 17), T(1.4, 11), T(2.4, 5), T(4, 0.5)], nm);
  d.ribbon({ mat: AP, z: z + 0.01, group: 'fold', line: 'none', color: AP.ramp[1] }, [T(4, 0.5), T(2.4, 5), T(1.4, 11), T(1.6, 17), T(3, f(3) - 0.5)], [0.5, 0.6, 0.6, 0.6, 0.4]);
}

/** The gear belt: wide leather slung under the belly, a cog for a buckle, a spanner, two pouches and a spare cog. */
function belt(d: Draw, s: Skel, z: number) {
  const T = s.T;
  d.poly({ mat: BT, z, group: 'belt' }, [T(6.2, -12.8), T(2.4, 16.6), T(-0.8, 15.6), T(3, -12.4)], { kind: 'cyl', a: T(0.4, 2), b: T(6.2, 2), r: 8, bevel: 0.8 });
  // the pouches behind the buckle, over the hip
  d.poly({ mat: BT, z: z + 0.1, group: 'pouch0', line: 'soft' }, [T(3.6, -9), T(2.6, -2.8), T(-4, -3), T(-3.6, -9)], { kind: 'bevel', w: 1.1 });
  d.line({ mat: BT, z: z + 0.11, group: 'pouch0', line: 'none' }, T(1.6, -8.8), T(1, -3.2), BZ.ramp[4]);
  d.poly({ mat: BT, z: z + 0.1, group: 'pouch1', line: 'soft' }, [T(2.4, -1.4), T(1.8, 3.4), T(-2.8, 3.2), T(-2.6, -1.4)], { kind: 'bevel', w: 1 });
  // the spanner hanging from the belt, open jaw down
  const a = T(3, 5.6), b = T(-7.8, 7.4);
  d.capsule({ mat: IR, z: z + 0.2, group: 'spanner' }, a, b, 0.95, 0.95);
  const j = d.frame(b, s.torso - 90 - 80);
  d.poly({ mat: IR, z: z + 0.21, group: 'spanner', line: 'soft' }, [j(0, -2.4), j(3.2, -2.6), j(3.4, -1), j(1.6, -0.8), j(1.6, 0.8), j(3.4, 1), j(3.2, 2.6), j(0, 2.4)], { kind: 'bevel', w: 0.7 });
  cog(d, T(-0.4, 7.4), 2.8, z + 0.8, CU, 'buckle');
  cog(d, T(4.4, -11), 2.4, z + 0.12, IR, 'cogB');
}

/** A cog: a disc with teeth round it and a dark hole. */
function cog(d: Draw, c: V, r: number, z: number, mat: typeof IR, g: string) {
  const n = 8;
  for (let k = 0; k < n; k++) {
    const a = (k * 360) / n + 22.5;
    d.capsule({ mat, z: z - 0.01, group: g, line: 'soft' }, at(c, a, r * 0.6), at(c, a, r + 0.9), 0.75, 0.65);
  }
  d.circle({ mat, z, group: g, line: 'soft' }, c, r);
  d.pixels({ mat, z: z + 0.01, group: g, line: 'none' }, [{ p: c, c: mat.ramp[0] }, { p: v(c.x - r * 0.5, c.y + r * 0.5), c: mat.ramp[5] }]);
}

/** The hammer: a long dark haft with a leather grip and bronze collars under a great iron head. */
function hammer(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: WD, z, group: 'haft' }, f(-BUTT, 0), f(HEAD, 0), 1.6, 1.8);
  d.capsule({ mat: BT, z: z + 0.02, group: 'haft', line: 'none', tex: (h) => (Math.floor(h.u * 14) % 2 ? 1 : 0) }, f(-BUTT + 3, 0), f(GRIP + 5, 0), 1.85, 1.85);
  d.ellipse({ mat: BZ, z: z + 0.04, group: 'haft' }, f(-BUTT - 0.6, 0), 2.8, 2.5, ang);
  d.capsule({ mat: BZ, z: z + 0.04, group: 'haft', line: 'soft' }, f(HEAD - HH - 3, 0), f(HEAD - HH, 0), 2.4, 2.9);
  headShape(d, f, HEAD, 1, z + 0.1);
}

/** The great head at `u` along the haft, `k` its scale: the iron block, flared steel faces at both ends, a bronze band round its middle cut with lit runes. */
function headShape(d: Draw, f: (u: number, w: number) => V, u: number, k: number, z: number) {
  const h = HH * k, w = HW * k;
  const nm = { kind: 'cyl' as const, a: f(u, -w), b: f(u, w), r: h + 1, bevel: 1.2 };
  d.poly({ mat: IR, z, group: 'head' }, [f(u - h + 1.5 * k, -w + 3 * k), f(u + h - 1.5 * k, -w + 3 * k), f(u + h, -w + 5 * k), f(u + h, w - 5 * k), f(u + h - 1.5 * k, w - 3 * k), f(u - h + 1.5 * k, w - 3 * k), f(u - h, w - 5 * k), f(u - h, -w + 5 * k)], nm);
  for (const side of [-1, 1]) {
    d.poly({ mat: ST, z: z + 0.05, group: 'face' + side }, [f(u - h + 0.8 * k, side * (w - 3.8 * k)), f(u + h - 0.8 * k, side * (w - 3.8 * k)), f(u + h + 1.4 * k, side * (w + 0.2 * k)), f(u - h - 1.4 * k, side * (w + 0.2 * k))], nm);
  }
  d.poly({ mat: DK, z: z + 0.1, group: 'band', line: 'soft' }, [f(u - h - 0.7 * k, -6.4 * k), f(u + h + 0.7 * k, -6.4 * k), f(u + h + 0.7 * k, 6.4 * k), f(u - h - 0.7 * k, 6.4 * k)], { kind: 'cyl', a: f(u - h, 0), b: f(u + h, 0), r: 7 * k, bevel: 1 });
  for (const side of [-1, 1]) d.line({ mat: BZ, z: z + 0.11, group: 'band', line: 'none' }, f(u - h - 0.5 * k, side * 6.4 * k), f(u + h + 0.5 * k, side * 6.4 * k), BZ.ramp[4]);
  // three runes cut in it, lit: an upright and its arms
  const rune = (w0: number, arms: [number, number, number, number][]) => {
    d.line({ mat: DK, z: z + 0.12, group: 'band', line: 'none' }, f(u - 4 * k, w0), f(u + 4 * k, w0), AR.ramp[5]);
    for (const [u0, w1, u1, w2] of arms) d.line({ mat: DK, z: z + 0.12, group: 'band', line: 'none' }, f(u + u0 * k, w0 + w1 * k), f(u + u1 * k, w0 + w2 * k), AR.ramp[4]);
  };
  rune(-4 * k, [[3.5, 0, 1, 1.6], [0, 0, -2.5, 1.6]]);
  rune(0, [[3.5, -1.6, 1.5, 0], [3.5, 1.6, 1.5, 0]]);
  rune(4 * k, [[-3.5, 0, -1, -1.6], [0, 0, 2.5, -1.6]]);
  const px: { p: V; c: RGBA }[] = [];
  for (const [a, b] of [[h - 1.6 * k, -7.8 * k], [h - 1.6 * k, 7.8 * k], [-h + 1.6 * k, -7.8 * k], [-h + 1.6 * k, 7.8 * k]]) px.push({ p: f(u + a, b), c: IR.ramp[5] });
  d.pixels({ mat: BZ, z: z + 0.12, group: 'band', line: 'none' }, px);
}

/** Flicker time: whole cycles over a looping animation, an even pace through the others. */
function arcTime(info: BuildInfo): number {
  const a = char.anims[info.anim];
  return a.loop ? info.index / a.frames.length : info.index * 0.13;
}

/** One jagged arc from `a` to `b`: a white core, here and there the blue beside it. */
function bolt(px: { p: V; c: RGBA }[], a: V, b: V, jag: number, seed: number) {
  const n = Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 2));
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const off = i === n ? 0 : (hash2(seed, i, 41) - 0.5) * 2 * jag;
    const q = v(a.x + (b.x - a.x) * t - ((b.y - a.y) / n) * off * 0.5, a.y + (b.y - a.y) * t + ((b.x - a.x) / n) * off * 0.5);
    const steps = Math.ceil(Math.hypot(q.x - prev.x, q.y - prev.y));
    for (let k = 0; k <= steps; k++) {
      const p = lerpV(prev, q, k / Math.max(1, steps));
      px.push({ p, c: AR.ramp[t < 0.75 ? 5 : 4] });
      if (hash2(seed, i * 7 + k, 43) > 0.6) px.push({ p: v(p.x + 1, p.y - 1), c: AR.ramp[3] });
    }
    prev = q;
  }
}

/**
 * The hammer's sparks: arcs jumping off the head, each from its own place on its
 * own whole cycle, so at rest only now and then and rarely two at once; `charge`
 * wakes more of them and lengthens them. Sparks shake off it and fall.
 */
function arcs(d: Draw, hand: V, ang: number, info: BuildInfo, P: Record<string, number>, z: number) {
  const t = arcTime(info);
  const charge = P.charge ?? 0;
  const f = d.frame(hand, ang);
  const px: { p: V; c: RGBA }[] = [];
  const spots: [number, number, number, number, number][] = [
    // u along the haft, w across, out-angle off the haft, cycles a loop, phase
    [HEAD + HH, -HW, 40, 1, 0.08],
    [HEAD + HH, HW, -40, 2, 0.31],
    [HEAD - HH, HW, -140, 1, 0.56],
    [HEAD + 2, HW + 0.5, -80, 3, 0.77],
    [HEAD - HH, -HW, 140, 2, 0.93],
    [HEAD + HH, 0, 0, 1, 0.42],
  ];
  spots.forEach(([u, w, off, cyc, ph], k) => {
    const on = ((t * cyc + ph) % 1) < 0.13 + charge * 0.14;
    if (!on) return;
    const a = f(u, w);
    const len = 6 + (k % 3) * 2 + charge * 4;
    const out = at(a, ang + off, len);
    bolt(px, a, out, 1.5 + charge * 0.4, k * 11 + info.index * 3 + (info.anim.length << 4));
  });
  // sparks shaken off the head, falling, each on its own whole cycle
  const n = 3 + Math.round(charge * 2);
  for (let m = 0; m < n; m++) {
    const age = (t * (1 + (m % 2)) + hash2(m, 3, 7)) % 1;
    if (age > 0.55 + charge * 0.15) continue;
    const a = f(HEAD + (hash2(m, 5, 9) - 0.5) * 2 * HH, (hash2(m, 2, 3) - 0.5) * 2 * HW);
    const k = age / 0.55;
    const drift = (hash2(m, 8, 1) - 0.5) * 14;
    px.push({ p: v(Math.round(a.x + drift * k), Math.round(a.y + 3 * k - 12 * k * k)), c: k < 0.4 ? AR.ramp[5] : k < 0.75 ? E.sparkGold : E.orange });
  }
  d.pixels({ mat: AR, z, group: 'arcs', outline: false, line: 'none' }, px.map(({ p, c }) => ({ p: v(p.x, Math.max(p.y, 0.5)), c })));
}

/** Earthen Surge: from where the head struck, the charge runs off along the ground ahead of him in forked arcs. */
function groundArcs(d: Draw, hand: V, ang: number, info: BuildInfo, k: number, z: number) {
  const o = at(hand, ang, HEAD + HW * 0.4);
  const start = v(o.x, 1.4);
  const px: { p: V; c: RGBA }[] = [];
  const reach = Math.min(18 + k * 60, 92 - start.x);
  for (let a = 0; a < 2; a++) {
    const seed = info.index * 5 + a * 17;
    const end = v(start.x + reach * (1 - a * 0.22), 1 + a * 2);
    bolt(px, start, end, 2.6, seed);
    // a fork rising off it
    const mid = lerpV(start, end, 0.45 + a * 0.15);
    bolt(px, mid, v(mid.x + 7, mid.y + 7 + a * 3), 1.6, seed + 3);
  }
  // behind him too, shorter
  bolt(px, start, v(start.x - reach * 0.32, 1.6), 2, info.index * 7 + 53);
  d.pixels({ mat: AR, z, group: 'ground', outline: false, line: 'none' }, px.map(({ p, c }) => ({ p: v(p.x, Math.max(p.y, 0.5)), c })));
}

function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  d.capsule({ mat: SK, z: z - 0.5, group: 'neck' }, s.neck, H(0, -4), 5, 4.8);
  face(d, s, { skin: SK, z, brow: HR.ramp[2], browStyle: 'flat', mouth: P.shout ? 'shout' : 'none', lip: SK.ramp[1], rx: 7, ry: 6.8 });
  // the jowls, heavy under the jaw, and a long beard over them, its braid bound in a bronze ring
  d.ellipse({ mat: SK, z: z + 0.15, group: 'head', line: 'soft' }, H(2.2, -5.4), 6, 3, s.headDir - 94);
  d.poly({ mat: HR, z: z + 0.2, group: 'beard', line: 'soft', tex: (h) => (Math.sin(h.v * 16) > 0.6 ? -1 : 0) }, [H(-1.6, -1.6), H(-0.8, -6), H(1.4, -10), H(3.4, -15.5), H(5.4, -10.5), H(7.6, -6.5), H(8, -3.8), H(5.6, -4.8), H(2.6, -4), H(0.8, -1.2)], { kind: 'dome', c: H(3, -5), r: 8, bevel: 0.8 });
  d.pixels({ mat: BZ, z: z + 0.25, group: 'beard', line: 'none' }, [{ p: H(2.6, -11.6), c: BZ.ramp[5] }, { p: H(3.6, -11.6), c: BZ.ramp[4] }, { p: H(4.6, -11.6), c: BZ.ramp[3] }, { p: H(2.8, -12.6), c: BZ.ramp[3] }, { p: H(3.8, -12.6), c: BZ.ramp[2] }]);
  // a thick moustache under the nose
  d.ribbon({ mat: HR, z: z + 0.35, group: 'head', line: 'none' }, [H(2.8, -3.6), H(4.6, -2.6), H(6.8, -2.8), H(7.6, -3.8)], [0.8, 1.2, 1.1, 0.6]);
  // short hair at the nape, under the hat
  d.poly({ mat: HR, z: z + 0.2, group: 'head', line: 'soft' }, [H(-3, 2.6), H(-7.6, 2.6), H(-7.8, -2.4), H(-5.4, -3.6), H(-3.6, -1)], { kind: 'bevel', w: 0.8 });
  if (P.hatX === undefined) hat(d, H, z + 1);
}

/** His orange hat, an enamelled helm: a dome, a bronze ridge along its top, a bronze rim and a long peak over his eyes, a rune lit at the front. `F` places it: on his head, or lying on the ground. */
function hat(d: Draw, F: (x: number, y: number) => V, z: number) {
  d.poly(
    { mat: HT, z, group: 'hat' },
    [F(7.6, 3.2), F(7.6, 6), F(6, 9), F(2.8, 11), F(-1.6, 11.4), F(-5.4, 10.2), F(-7.8, 7.4), F(-8.4, 3)],
    { kind: 'dome', c: F(-1.2, 3.4), r: 10.4, bevel: 1.2 },
  );
  d.ribbon({ mat: BZ, z: z + 0.1, group: 'hat', line: 'soft' }, [F(6, 8.4), F(2.4, 11.4), F(-2, 11.8), F(-6, 9.8)], [0.8, 1.2, 1.2, 0.8]);
  d.ribbon({ mat: BZ, z: z + 0.2, group: 'hat' }, [F(-9.2, 2.8), F(-4, 3), F(4, 3.2), F(9, 3), F(12, 2)], [0.8, 1, 1, 0.95, 0.6]);
  d.line({ mat: BZ, z: z + 0.21, group: 'hat', line: 'none' }, F(-7.6, 2), F(10.6, 1.8), BZ.ramp[1]);
  const px: { p: V; c: RGBA }[] = [];
  for (const [x, y, c] of [[4.6, 7, 5], [4.6, 6, 5], [4.6, 5, 4], [3.6, 6.6, 3], [5.6, 5.6, 3]] as const) px.push({ p: F(x, y), c: AR.ramp[c] });
  for (const [x, y] of [[-3, 4.4], [-6, 4.6], [0, 4.4]] as const) px.push({ p: F(x, y), c: BZ.ramp[4] });
  d.pixels({ mat: HT, z: z + 0.22, group: 'hat', line: 'none' }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations (the hammer's angle runs from the near hand along the haft: 0 forward, 90 up)
// ---------------------------------------------------------------------------

/** The near hand at `hand`, the hammer at `ang`. */
const hm = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, ...extra, p: { hamAng: ang, ...(extra.p ?? {}) } });

// At rest: both hands low before his hips, the hammer's head dropped forward near the ground; the belly and its letters clear.
const IDLE: Pose = hm(v(1, 31), -24, {
  y: -1,
  torso: 88,
  head: 90,
  legN: { ik: v(-10, 3) },
  legF: { ik: v(11, 3) },
  p: { breath: 0, grip: GRIP },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = (1 - Math.cos(a)) / 2;
  const bob = Math.round(b);
  return tweak(IDLE, {
    y: -1 - bob,
    torso: 88 - bob,
    head: 90 + bob,
    armN: { ik: v(1, 31 - bob), bend: -1 },
    p: { breath: b, hamAng: -24 + bob },
  });
}

/** Run: a heavy, rolling trot, the hammer across his front, its head bouncing, the belly with it. */
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -10.5 * Math.cos(ph), y: 3 + (sn > 0 ? 5.5 * sn : 0), ang: sn > 0 ? -20 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return hm(v(2, 33 + bob), -12 + bob * 3, {
    y: bob - 2,
    torso: 79 + Math.sin(a) * 2,
    head: 84,
    legN: { ik: v(n.x - 2, n.y) },
    legF: { ik: v(f.x + 2, f.y) },
    footN: n.ang,
    footF: f.ang,
    p: { breath: (1 + c2) / 2, charge: 0.4 },
  });
}

// Mending Blows: a hook swung up from behind him into the enemy; the head carried on over his shoulder; then straight down on it.
const PM_WIND = hm(v(-8, 44), 150, { x: -4, y: -2, torso: 97, head: 92, legN: { ik: v(-12, 3) }, legF: { ik: v(10, 3) }, p: { grip: 9, breath: 0.8, charge: 1 } });
const PM_HOOK = hm(v(15, 41), 4, { x: 8, y: -4, torso: 72, head: 78, legN: { ik: v(-11, 3) }, legF: { ik: v(15, 3) }, p: { grip: 11, breath: 0.2, shout: 1, charge: 2, sweepFrom: 150 } });
const PM_PASS = hm(v(13, 48), 58, { x: 6, y: -3, torso: 78, head: 82, legN: { ik: v(-11, 3) }, legF: { ik: v(14, 3) }, p: { grip: 9, breath: 0.3, charge: 1 } });
const PM_LIFT = hm(v(13, 60), 98, { x: 1, y: 0, torso: 98, head: 92, legN: { ik: v(-10, 3) }, legF: { ik: v(12, 3) }, p: { grip: 7, breath: 1, charge: 1.5 } });
const PM_OVER = hm(v(13, 56), 44, { x: 5, y: -2, torso: 80, head: 84, legN: { ik: v(-10, 3) }, legF: { ik: v(14, 3) }, p: { grip: 9, breath: 0.6, shout: 1, charge: 1.5 } });
const PM_SLAM = hm(v(19, 35), -32, { x: 9, y: -8, torso: 60, head: 72, legN: { ik: v(-11, 3) }, legF: { ik: v(16, 3) }, p: { grip: 11, breath: 0, shout: 1, charge: 3 } });
const PM_HOLD = tweak(PM_SLAM, { y: -9, torso: 58, p: { shout: 0, charge: 1.6 } });

// Master's Decree: the hammer planted before him, head on the ground, in the far hand; the near hand up, one finger raised, wagged as he speaks.
const SB_PLANT = (finger: number, shout: number, charge = 0): Pose =>
  pose({
    y: -1, torso: 92, head: 92,
    legN: { ik: v(-10, 3) }, legF: { ik: v(11, 3) },
    armN: { ik: v(-13, 74), bend: 1 },
    armF: { ik: v(21, 44), bend: -1 },
    p: { solo: 1, hamAng: -88, finger, shout, breath: 0.9, charge },
  });
const SB_TURN = hm(v(-2, 44), -56, { y: -1, torso: 90, head: 90, legN: { ik: v(-10, 3) }, legF: { ik: v(11, 3) }, p: { grip: 13, breath: 0.4 } });

// Earthen Surge: the hammer heaved up over his head, the windings waking, then brought down with all his weight; the charge runs off along the ground.
const GF_HEAVE = hm(v(9, 55), 118, { x: -3, y: -1, torso: 100, head: 94, legN: { ik: v(-12, 3) }, legF: { ik: v(10, 3) }, p: { grip: 8, breath: 0.8, charge: 1 } });
const GF_TOP = hm(v(13, 61), 100, { x: -2, y: 2, torso: 102, head: 96, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, p: { grip: 7, breath: 1, shout: 1, charge: 3 } });
const GF_OVER = hm(v(12, 58), 46, { x: 4, y: -1, torso: 80, head: 84, legN: { ik: v(-10, 3) }, legF: { ik: v(14, 3) }, p: { grip: 9, breath: 0.6, shout: 1, charge: 3 } });
const GF_STRIKE = hm(v(12, 29), -24, { x: 8, y: -11, torso: 54, head: 66, legN: { ik: v(-12, 3) }, legF: { ik: v(16, 3) }, p: { grip: 11, breath: 0, shout: 1, charge: 3, fault: 0.2 } });
const GF_RUN = (fault: number, charge: number) => tweak(GF_STRIKE, { y: -12, torso: 52, p: { fault, charge } });

const HURT = hm(v(-8, 36), -34, {
  x: -4, y: -1, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  p: { breath: 1, shout: 1, grip: 12, charge: 0.8 },
});

// Death: he staggers, sits down hard, goes over on his back with the belly up; the hammer drops before him with its last sparks, the hat rolls off.
const STAGGER = hm(v(-7, 36), -32, {
  x: -3, y: -3, torso: 98, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(6, 4) },
  p: { breath: 1, shout: 1, grip: 12, charge: 1 },
});
const SIT = pose({
  x: -4, y: -11, torso: 112, head: 112,
  legN: { up: -14, lo: -66 }, legF: { up: 0, lo: -60 }, footN: -20, footF: -10,
  armN: { up: -150, lo: -160 }, armF: { up: -48, lo: -4 },
  p: { solo: 1, hamAng: -18, breath: 0.8, shout: 1, fist: 1, hatX: -30, hatY: 20, hatAng: 30, charge: 0.6 },
});
const FALLING = pose({
  x: -7, y: -14, torso: 142, head: 148,
  legN: { up: 6, lo: -38 }, legF: { up: 18, lo: -28 }, footN: 20, footF: 30,
  armN: { up: -176, lo: 170 }, armF: { up: -22, lo: -8 },
  p: { solo: 1, hamAng: 2, breath: 0.5, fist: 1, hatX: -46, hatY: 14, hatAng: 100, charge: 0.3 },
});
const DOWN = pose({
  x: -9, y: -18, torso: 170, head: 174,
  legN: { up: 22, lo: -30 }, legF: { up: 32, lo: -18 }, footN: 50, footF: 60,
  armN: { up: 176, lo: 178 }, armF: { up: -28, lo: -6 },
  p: { solo: 1, hamAng: 2, breath: 0.2, fist: 1, hatX: -60, hatY: 11.5, hatAng: 172, charge: 0.15 },
});

// Victory: the hammer thrust up in his far hand, sparks flying, the near fist on his hip, the belly and its letters out.
const WIN = (hand: V, ang: number, charge: number, y = -1): Pose =>
  pose({
    y, torso: 94, head: 96,
    legN: { ik: v(-10, 3) }, legF: { ik: v(11, 3) },
    armN: { ik: v(-11, 33), bend: -1 },
    armF: { ik: hand, bend: -1 },
    p: { solo: 1, hamAng: ang, fist: 1, breath: 1, shout: 1, charge },
  });
const RAISE = WIN(v(22, 67), 92, 2.2);

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'chief_engineer_cj',
  name: 'Chief Engineer CJ',
  dims: D,
  build,
  footprint: 1.5,
  anims: {
    idle: { loop: true, frames: cycle(12, 140, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, PM_WIND, 2, 80, ease.out),
        ...keys([
          [PM_WIND, 170],
          [PM_HOOK, 70, { smear: true, hit: true }],
          [PM_PASS, 110],
          [PM_LIFT, 170],
          [PM_OVER, 45],
          [PM_SLAM, 70, { smear: true, hit: true }],
          [PM_HOLD, 240],
        ]),
        ...tween(D, PM_HOLD, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SB_TURN, 2, 80, ease.out),
        ...keys([
          [SB_PLANT(0, 0), 130],
          [SB_PLANT(0, 1), 150, { event: 'cast' }],
          [SB_PLANT(-14, 1), 130],
          [SB_PLANT(12, 0), 130, { hit: true }],
          [SB_PLANT(-14, 1), 130],
          [SB_PLANT(12, 1), 130],
          [SB_PLANT(0, 0), 170],
          [SB_TURN, 110],
        ]),
        ...tween(D, SB_TURN, IDLE, 2, 110, ease.inOut),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...tween(D, IDLE, GF_HEAVE, 3, 90, ease.out),
        ...keys([
          [GF_HEAVE, 130],
          [GF_TOP, 300],
          [GF_OVER, 50],
          [GF_STRIKE, 80, { smear: true, hit: true }],
          [GF_RUN(0.5, 3), 80],
          [GF_RUN(0.85, 2.4), 90],
          [GF_RUN(1, 1.8), 120],
          [GF_RUN(1, 1), 150],
        ]),
        ...tween(D, tweak(GF_STRIKE, { p: { fault: 0, charge: 0.6, shout: 0 } }), IDLE, 3, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 100],
        [tweak(HURT, { x: -3, torso: 96, head: 100, p: { breath: 0.5 } }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [STAGGER, 140],
        [SIT, 150],
        [FALLING, 110],
        [DOWN, 160],
        [tweak(DOWN, { y: -19, p: { charge: 0 } }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...keys([
          [SB_TURN, 90],
          [WIN(v(24, 44), 36, 1), 90],
          [WIN(v(24, 58), 70, 1.6), 90],
          [RAISE, 230],
          [WIN(v(22, 69), 92, 3, 0), 230],
          [RAISE, 300],
          [WIN(v(24, 50), 40, 1), 110],
          [SB_TURN, 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Skill icons
// ---------------------------------------------------------------------------

/** A jagged arc in an icon (screen space, y down). */
function iconBolt(b: { set(x: number, y: number, c: RGBA): void }, pts: [number, number][]) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
      b.set(x + 1, y, AR.ramp[3]);
      b.set(x, y, AR.ramp[5]);
    }
  }
}

export const chiefEngineerCj: ChampionArt = {
  char,
  iconBg: SU,
  icons: {
    mending_blows: () =>
      compose(SU, glyph((d) => {
        // the hammer coming down
        const f = d.frame(v(6, 3), 56);
        d.capsule({ mat: ST, z: 10, group: 'ihaft' }, f(0, 0), f(28, 0), 1.9, 1.9);
        d.capsule({ mat: BT, z: 10.1, group: 'ihaft', line: 'none', tex: (h) => (Math.floor(h.u * 9) % 2 ? 1 : 0) }, f(1, 0), f(14, 0), 2, 2);
        headShape(d, f, 29, 0.92, 11);
      }), (b) => {
        iconBolt(b, [[5, 7], [9, 10], [7, 13], [12, 16]]);
        iconBolt(b, [[33, 26], [29, 28], [32, 31], [28, 35]]);
      }),
    masters_decree: () =>
      compose(SU, glyph((d) => {
        // his sigil: a hexagon of bronze, a rune lit in its middle
        const hex = (r: number) => [0, 1, 2, 3, 4, 5].map((k) => at(v(20, 20), 30 + k * 60, r));
        d.poly({ mat: BZ, z: 10, group: 'isign' }, hex(17), { kind: 'dome', c: v(16, 24), r: 22, bevel: 1.4 });
        d.poly({ mat: MAT.blackCloth, z: 10.1, group: 'isign', line: 'none' }, hex(13), { kind: 'flat', n: [0, 0, 1] });
        d.capsule({ mat: AR, z: 11, group: 'irune', line: 'none' }, v(20, 11), v(20, 29), 0.9, 0.9);
        for (const y of [29, 21]) for (const x of [13, 27]) d.capsule({ mat: AR, z: 11, group: 'irune', line: 'none' }, v(20, y - 1), v(x, y - 7), 0.8, 0.8);
      })),
    earthen_surge: () =>
      compose(SU, glyph((d) => {
        // the head driven into the ground, seen from the side
        const f = d.frame(v(20, 40), -90);
        d.capsule({ mat: ST, z: 10, group: 'ihaft' }, f(0, 0), f(18, 0), 1.9, 1.9);
        headShape(d, f, 21, 0.86, 11);
      }), (b) => {
        // the charge running off along the ground both ways
        iconBolt(b, [[22, 31], [27, 33], [30, 30], [35, 33], [38, 30]]);
        iconBolt(b, [[17, 31], [12, 33], [9, 30], [5, 33], [2, 30]]);
        for (let x = 1; x < 39; x++) b.set(x, 35, x % 3 ? MAT.charcoal.ramp[1] : MAT.charcoal.ramp[5]);
      }),
    masters_eye: () =>
      compose(SU, glyph((d) => {
        // the orange hat
        const F = (x: number, y: number) => v(18 + x * 1.5, 11 + y * 1.5);
        hat(d, F, 10);
      }), (b) => {
        // a star of green light: the affliction lifted
        for (let k = 0; k < 7; k++) for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) b.set(30 + dx, 30 + dy, k < 3 ? E.white : E.green);
      }),
  },
};
