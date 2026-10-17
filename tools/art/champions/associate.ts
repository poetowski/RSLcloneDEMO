// The Associate (docs/DESIGN_DECISIONS.md section 25, Jakub's proposal of
// 2026-10-17): an Elite of the Azure Crown, Support: a woman mage in a full
// azure robe with white stripes and dark-blue woven shoulders, a magic staff
// with small white particles round its broader top, medium-length dark curly
// hair. So she is a mage of the Crown: a full robe of azure from her throat to
// her feet, white stripes running down its front and side, a white band at its
// hem and cuffs, wide sleeves; over her shoulders a short cape of dark-blue
// cloth in a basket weave, its edge fringed; a white cord at her waist; a
// staff of dark polished wood shod in silver, its head opening into three
// silver tines like a small crown with a pale light at their heart, and white
// motes circling it (the silhouette feature, with her curls); dark curls to
// her shoulders round a calm face. What the brief leaves open is a first take:
// her face and skin, the robe's cut and where its stripes run, the weave, the
// staff's wood and tines, and how the motes move. Her affinity sets nothing
// here (affinities are abstract, Jakub, 2026-10-11): her bolt and her
// quickening are the motes of her staff, white light (fx/azure_crown.ts).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { Hit } from '../render.ts';
import { foldTex, robe, RobeCfg, torsoPts, upRobe } from '../parts.ts';
import { angleOf, at, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, sub, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16,
  shin: 16.4,
  ankleH: 3,
  footLen: 5.4,
  spine: 19.6,
  neck: 7.2,
  upperArm: 12,
  foreArm: 11,
  shoulderDrop: 3.6,
  shoulderN: -2.4,
  shoulderF: 2.8,
  hipN: -1.4,
  hipF: 1.4,
};

const SK = MAT.skinTan, AZ = MAT.ice, WC = MAT.whiteCloth, IN = MAT.indigo, HR = MAT.hairDark, WD = MAT.ebony, SV = MAT.silver, GL = MAT.glowIce;

/** The staff: its length to the root of the tines, and where the near hand holds it from the foot when she carries or points it. */
const STAFF = 62, GRIP = 28;

interface Staff {
  foot: V;
  head: V;
  ang: number;
}

/**
 * Planted (`free` 0: its foot on the ground at `plant`, the near hand on the
 * shaft) or held (`free` 1: `headAng` from the hand toward its head, held
 * `grip` from its foot); between the two, blended.
 */
function staffAt(s: Skel, P: Record<string, number>): Staff {
  const free = Math.max(0, Math.min(1, P.free ?? 0));
  const held = () => {
    const a = P.headAng ?? 90, g = P.grip ?? GRIP;
    return { foot: at(s.hN, a, -g), head: at(s.hN, a, STAFF - g) };
  };
  const planted = () => {
    const foot = v(P.plant ?? 16, 0.6);
    return { foot, head: at(foot, angleOf(sub(s.hN, foot)), STAFF) };
  };
  const st = free >= 1 || P.plant === undefined ? held() : free <= 0 ? planted() : (() => {
    const a = planted(), b = held();
    return { foot: lerpV(a.foot, b.foot, free), head: lerpV(a.head, b.head, free) };
  })();
  return { ...st, ang: angleOf(sub(st.head, st.foot)) };
}

/** The far arm: with `twoK` up its hand goes to the staff, `two` px from the near hand toward the head (negative: toward the foot), solved so it stays on the shaft. */
function farArm(s: Skel, st: Staff, P: Record<string, number>): { e: V; h: V; lo: number; on: boolean } {
  const k = Math.max(0, Math.min(1, P.twoK ?? 0));
  if (k < 0.01) return { e: s.eF, h: s.hF, lo: s.loF, on: false };
  const grip = at(s.hN, st.ang, P.two ?? -8);
  const r = ik2(s.sF, lerpV(s.hF, grip, k), D.upperArm, D.foreArm, P.bendF ?? -1);
  return { e: r.mid, h: r.end, lo: r.a2, on: k >= 0.5 };
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const st = staffAt(s, P);
  const far = farArm(s, st, P);
  const wave = P.wave ?? 0;

  // her curls behind the head and down to the shoulders, the far half of the motes behind the staff
  hairBack(d, s, P.hair ?? 0, 3);
  motes(d, st, P, false);

  // slippers under the hem, the far arm behind the robe
  slippers(d, s, 11);
  sleeveArm(d, s.sF, far.e, far.h, far.lo, 14, -1, 'armF', !far.on);

  // the robe from the waist down with its stripes and its hem, the bodice, the cord at the waist
  skirt(d, s, wave, 15);
  bodice(d, s, 30);
  // the woven cape over the shoulders, the far shoulder's weave behind
  shoulders(d, s, wave, 34);

  head(d, s, P);

  // the staff, the far hand round it, the near arm over it, the weave over the near shoulder
  staff(d, st, 55);
  if (far.on) d.ellipse({ mat: SK, z: 57, group: 'handF', shade: -1 }, far.h, 2.0, 1.7, far.lo);
  sleeveArm(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN', true);
  shoulderCap(d, s, wave, 62);
  motes(d, st, P, true);
}

// ---------------------------------------------------------------------------
// the weave, anchored to the cloth it lies on (its cyl coordinates), so it moves with her
// ---------------------------------------------------------------------------

/** A basket weave: cells of two threads, laid across and along by turns. `len` and `r` are the shape's axis length and half width in px. */
const weave = (len: number, r: number) => (h: Hit) => {
  const x = Math.floor(h.u * len), y = Math.floor((h.v + 1) * r);
  const cell = (Math.floor(x / 2) + Math.floor(y / 2)) % 2;
  return cell ? (x % 2 === 0 ? 1 : 0) : y % 2 === 0 ? -1 : 0;
};

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const ROBE: RobeCfg = { waist: [1.4, 5.0, 5.4], hemDrop: 1.4, hemFloor: 1.0, hemBack: [7.6, 6.2], hemFront: [5.2, 4.2], midBack: [4.0, 2.8], midFront: [3.4, 1.8], ripple: 0.7 };

/** The robe from the waist to her feet: azure, a white band at the hem, two white stripes down its front and its side. */
function skirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: AZ, z, group: 'robe', tex: foldTex(9, wave * 0.5, 0.62) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  d.ribbon({ mat: WC, z: z + 0.2, group: 'robe', line: 'none' }, upRobe(r, r.hem, 1.2), r.hem.map(() => 0.95));
  for (const t of [0.8, 0.42]) {
    const top = lerpV(r.waistB, r.waistF, t);
    const bot = upRobe(r, [r.hem[Math.round((1 - t) * 8)]], 1.6)[0];
    d.ribbon({ mat: WC, z: z + 0.15, group: 'robe', line: 'none' }, [top, lerpV(top, bot, 0.5), bot], [0.6, 0.65, 0.7]);
  }
}

/** The bodice: azure to the throat, the front stripe running up it, a white cord knotted at the waist. */
function bodice(d: Draw, s: Skel, z: number) {
  const torso = torsoPts(s, [
    [0, 4.6, 4.9],
    [4, 4.4, 4.8],
    [8.5, 4.8, 5.8],
    [12.5, 5.2, 6.3],
    [15.8, 5.4, 5.4],
    [18, 4.0, 3.2],
    [19.6, 2.4, 2.0],
  ]);
  d.poly({ mat: AZ, z, group: 'body', tex: foldTex(6, 0.6, 0.8) }, torso, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(19.6, 0.6), r: 6, bevel: 1.3 });
  d.ribbon({ mat: WC, z: z + 0.2, group: 'body', line: 'none' }, [s.T(1.4, 3.6), s.T(8, 4.4), s.T(13, 4.6)], [0.6, 0.6, 0.6]);
  d.poly({ mat: WC, z: z + 0.4, group: 'cord' }, [s.T(2.2, -4.9), s.T(2.4, 5.4), s.T(1.3, 5.3), s.T(1.1, -4.8)], { kind: 'cyl', a: s.T(0, 0), b: s.T(2.4, 0), r: 5.2 });
  const knot = s.T(1.8, 4.8);
  d.circle({ mat: WC, z: z + 0.45, group: 'cord' }, knot, 1.0);
  const hang = Math.max(-112, Math.min(-68, (s.thN + s.thF) / 2));
  d.ribbon({ mat: WC, z: z + 0.5, group: 'cord', line: 'soft' }, [knot, at(knot, hang + 6, 3.2), at(at(knot, hang + 6, 3.2), hang, 3.0)], [0.6, 0.55, 0.5]);
  d.ribbon({ mat: WC, z: z + 0.48, group: 'cord', shade: -1, line: 'soft' }, [knot, at(knot, hang - 8, 2.6), at(at(knot, hang - 8, 2.6), hang - 4, 2.4)], [0.6, 0.55, 0.5]);
}

/** The cape over her shoulders: dark-blue cloth in a basket weave from the throat to the chest, its edge fringed. */
function shoulders(d: Draw, s: Skel, wave: number, z: number) {
  const fringe = (u: number, w: number, k: number) => s.T(u + Math.sin(wave + k) * 0.3, w);
  d.poly(
    { mat: IN, z, group: 'cape', tex: weave(10, 7) },
    [
      s.T(19.8, 3.2), s.T(20.9, 0.6), s.T(20.7, -2.8), s.T(19.2, -5.6), s.T(16.2, -6.6),
      fringe(12.4, -6.4, 0), fringe(11.4, -5.0, 1), fringe(12.2, -3.6, 2), fringe(11.0, -2.0, 3), fringe(12.0, -0.4, 4),
      fringe(10.8, 1.2, 5), fringe(11.8, 2.8, 6), fringe(10.8, 4.4, 7), fringe(12.2, 5.8, 8),
      s.T(15.4, 6.6), s.T(18.2, 5.6),
    ],
    { kind: 'cyl', a: s.T(11, 0), b: s.T(21, 0), r: 7, bevel: 1.2 },
  );
}

/** The cape's weave over the top of the near arm, fringed where it ends. */
function shoulderCap(d: Draw, s: Skel, wave: number, z: number) {
  const a = s.upN;
  const root = s.T(17.6, -2.0);
  const f = d.frame(root, a);
  d.poly(
    { mat: IN, z, group: 'capeN', line: 'soft', tex: weave(6, 4) },
    [f(-2.4, -3.2), f(-2.4, 3.2), f(3.6, 3.6), f(5.2 + Math.sin(wave) * 0.3, 2.2), f(4.2, 0.8), f(5.6, -0.6), f(4.4, -2.0), f(5.0, -3.4)],
    { kind: 'cyl', a: f(-2.4, 0), b: f(5, 0), r: 3.6, bevel: 1 },
  );
}

/** A wide sleeve of azure to a white cuff, her hand. */
function sleeveArm(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string, hand: boolean) {
  d.capsule({ mat: AZ, z, group, shade }, sh, el, 2.6, 2.4);
  d.capsule({ mat: AZ, z: z + 0.1, group, shade }, el, at(ha, lo, -1.6), 2.4, 3.3, 0.2);
  d.capsule({ mat: WC, z: z + 0.15, group, shade, line: 'none' }, at(ha, lo, -2.5), at(ha, lo, -1.6), 3.3, 3.3, 0.3);
  if (hand) d.ellipse({ mat: SK, z: z + 0.3, group, shade }, at(ha, lo, 0.6), 2.0, 1.7, lo);
}

/** Slippers of dark blue peeking under the hem. */
function slippers(d: Draw, s: Skel, z: number) {
  for (const [side, shade] of [['F', -1], ['N', 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF;
    const fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: IN, z: z + (side === 'N' ? 1 : 0), group: 'foot' + side, shade }, [f(-2.4, 1.8), f(-2.8, -1), f(-2.2, -3), f(5.0, -3), f(6.4, -1.6), f(3.2, 0), f(1, 1.8)], { kind: 'bevel', w: 1.4 });
  }
}

/**
 * A bunch of curls: a round lock lit on its own (each bunch catches the light
 * at its top), a dark hollow and a bright crest of a curl in it.
 */
function bunch(d: Draw, c: V, r: number, z: number, group: string, shade = -1) {
  d.circle({ mat: HR, z, group, shade, line: 'none' }, c, r);
  d.pixels({ mat: HR, z: z + 0.01, group, line: 'none', outline: false }, [
    { p: v(c.x - r * 0.35, c.y + r * 0.45), c: HR.ramp[4] },
    { p: v(c.x + r * 0.2, c.y - r * 0.2), c: HR.ramp[0] },
  ]);
}

/** Her dark curls falling behind her head and neck to the shoulders, in bunches; `sway` swings them back. */
function hairBack(d: Draw, s: Skel, sway: number, z: number) {
  const H = s.H, T = s.T;
  d.poly({ mat: HR, z, group: 'hairback', shade: -1, line: 'none' }, [H(-1.0, 7.0), H(-6.2, 5.4), H(-8.6, 0.4), T(17.2 - sway * 0.4, -7.8 - sway * 1.4), T(14.6 - sway * 0.5, -6.6 - sway * 1.6), T(14.2, -3.4), H(-2.4, -5.4)], { kind: 'dome', c: H(-5, -2), r: 9, bevel: 1 });
  const locks: [V, number][] = [
    [H(-8.4, 2.4), 2.8], [H(-8.8, -1.6), 2.9], [T(18.0 - sway * 0.3, -7.4 - sway), 2.7], [T(15.6 - sway * 0.5, -8.2 - sway * 1.6), 2.6],
    [T(14.2 - sway * 0.6, -6.0 - sway * 1.8), 2.4], [T(14.6 - sway * 0.4, -3.4 - sway), 2.2], [H(-5.4, -4.6), 2.6],
  ];
  locks.forEach(([c, r], i) => bunch(d, c, r, z + 0.01 * i, 'hairback'));
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.2, 2.0);
  // the robe's collar round the throat, a white edge to it
  d.capsule({ mat: AZ, z: 37.6, group: 'collar' }, s.T(19.2, -2.4), s.T(19.8, 2.2), 1.6, 1.5);
  d.ribbon({ mat: WC, z: 37.65, group: 'collar', line: 'none' }, [s.T(20.4, -2.0), s.T(20.8, 0.2), s.T(20.4, 2.2)], [0.5, 0.5, 0.5]);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: 'calm', ear: 'none', mouth: P.call ? 'shout' : 'line', lip: ACCENT.lipRose, rx: 5.7, ry: 6.3, profile: 'soft', lash: ACCENT.kohl });
  // a crown of curls over her brow and the back of her head, in round bunches
  d.poly({ mat: HR, z: 38.8, group: 'hair', shade: -1, line: 'none' }, [H(4.2, 4.6), H(2.2, 7.6), H(-2.0, 8.8), H(-6.0, 7.0), H(-8.0, 3.0), H(-7.6, -1.6), H(-4.8, -2.6), H(-2.6, 0.4), H(-0.4, 3.0), H(2.6, 4.4)], { kind: 'dome', c: H(-1.6, 3), r: 8, bevel: 1 });
  const crown: [number, number, number][] = [
    [4.0, 5.0, 2.0], [2.2, 7.2, 2.4], [-0.6, 8.4, 2.6], [-3.8, 8.0, 2.6], [-6.4, 6.0, 2.6], [-7.8, 2.8, 2.5], [-7.4, -0.8, 2.4],
    [-1.0, 5.4, 2.4], [-4.2, 4.6, 2.4],
  ];
  crown.forEach(([x, y, r], i) => bunch(d, H(x, y), r, 38.81 + i * 0.01, 'hair'));
  // a curl falling by her cheek
  d.ribbon({ mat: HR, z: 38.95, group: 'hair', shade: -1, line: 'soft' }, [H(0.6, 3.4), H(-0.4, 0.4), H(0.4, -1.8), H(-0.4 + (P.hair ?? 0) * 0.2, -3.8)], [1.0, 0.95, 0.9, 0.7]);
  bunch(d, H(-0.2 + (P.hair ?? 0) * 0.2, -4.4), 1.5, 38.96, 'hair');
}

/** The staff: dark polished wood shod in silver, a silver collar under its head, three silver tines opening like a small crown, a pale light at their heart. */
function staff(d: Draw, st: Staff, z: number) {
  d.capsule({ mat: WD, z, group: 'staff', tex: (h) => (Math.sin(h.u * 40) > 0.92 ? 1 : 0) }, st.foot, st.head, 0.95, 1.1);
  d.capsule({ mat: SV, z: z + 0.05, group: 'staff', line: 'none' }, st.foot, at(st.foot, st.ang, 2.4), 1.1, 1.1);
  d.capsule({ mat: SV, z: z + 0.1, group: 'staffhead' }, at(st.head, st.ang, -2.4), at(st.head, st.ang, 0.6), 1.4, 1.7);
  const f = d.frame(st.head, st.ang);
  for (const side of [-1, 1]) d.ribbon({ mat: SV, z: z + 0.12, group: 'tine' + side, shade: side < 0 ? -1 : 0 }, [f(0.4, side * 0.9), f(2.4, side * 2.9), f(4.8, side * 3.3), f(6.8, side * 2.3)], [0.65, 0.6, 0.5, 0.35]);
  d.ribbon({ mat: SV, z: z + 0.13, group: 'tine0' }, [f(0.6, 0), f(4.0, 0), f(7.6, 0)], [0.65, 0.55, 0.35]);
  d.pixels({ mat: GL, z: z + 0.14, group: 'tine0', outline: false, line: 'none' }, [{ p: f(3.2, -1.4), c: GL.ramp[5] }, { p: f(2.4, -1.6), c: GL.ramp[4] }]);
}

/**
 * The white motes circling the head of her staff on a tilted ring, each
 * rising and sinking at its own pace: `mote` turns the ring (a whole turn per
 * 2π, so loops close), `glow` widens it, `gather` draws the motes in to the
 * tines and `spent` hides those that have just flown off. The far half is drawn
 * behind the staff, the near half before her hand.
 */
function motes(d: Draw, st: Staff, P: Record<string, number>, front: boolean) {
  const c = at(st.head, st.ang, 3.8);
  const ph = P.mote ?? 0, glow = P.glow ?? 0, gather = Math.max(0, Math.min(1, P.gather ?? 0)), spent = P.spent ?? 0;
  const rx = (6.4 + glow * 7) * (1 - gather * 0.8), ry = (2.6 + glow * 2.4) * (1 - gather * 0.8);
  const n = 7;
  const pts: { p: V; c: RGBA }[] = [];
  for (let k = 0; k < n; k++) {
    if (k < Math.round(spent * n)) continue;
    const a = ph + (k / n) * Math.PI * 2;
    if (Math.sin(a) > 0 !== front) continue;
    const bob = Math.sin(ph * 2 + k * 2.1) * 1.3 * (1 - gather);
    const q = v(Math.round(c.x + Math.cos(a) * rx) + 0.5, Math.round(c.y - Math.sin(a) * ry + bob) + 0.5);
    const big = k % 3 === 0;
    pts.push({ p: q, c: big ? ACCENT.white : k % 3 === 1 ? ACCENT.flake : GL.ramp[4] });
    // every third mote is a small cross of light, so the ring reads at 1x
    if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) pts.push({ p: v(q.x + dx, q.y + dy), c: glow > 0.5 ? GL.ramp[5] : GL.ramp[4] });
  }
  if (pts.length) d.pixels({ mat: GL, z: front ? 70 : 54, group: 'motes', outline: false, line: 'none', noClean: true }, pts);
}

// ---------------------------------------------------------------------------
// Poses & animations (the staff's `headAng` runs from the near hand toward its head: 0 forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 90,
  head: 88,
  legN: { ik: v(-4, 3) },
  legF: { ik: v(5, 3) },
  armN: { up: -62, lo: 26 },
  armF: { up: -98, lo: -82 },
  p: { plant: 16, free: 0, headAng: 90, grip: GRIP, wave: 0, hair: 0, mote: 0, glow: 0, gather: 0, spent: 0, twoK: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b * 0.6,
    armN: { up: -62 + b, lo: 26 + b },
    armF: { up: -98 + b, lo: -82 + b },
    // the motes go round once, the robe and the curls stir at their own pace
    p: { wave: a * 0.5, hair: Math.sin(a) * 0.4, mote: a },
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
    torso: 82,
    head: 86,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -46, lo: 16 },
    armF: { up: -110 + Math.cos(a) * 8, lo: -96 },
    p: { free: 1, grip: 30, headAng: 64, wave: a * 2 + 2, hair: 2.2 + Math.sin(a * 2) * 0.4, mote: a, glow: 0, gather: 0.2, spent: 0, twoK: 0 },
  });
}

// Mote Bolt: she draws the staff back over her shoulder as the motes gather in its tines, then points it at the enemy and they fly.
const MB_DRAW = pose({
  x: -1, torso: 94, head: 92,
  legN: { ik: v(-6, 3) }, legF: { ik: v(5, 3) },
  armN: { up: 30, lo: 82 }, armF: { up: -64, lo: -10 },
  p: { free: 1, grip: 24, headAng: 124, wave: 0.6, hair: 0.6, mote: 0.8, glow: 0.2, gather: 0.8, spent: 0, twoK: 0 },
});
const MB_POINT = pose({
  x: 2, torso: 84, head: 86,
  legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) },
  armN: { up: 10, lo: 4 }, armF: { up: -30, lo: 4 },
  p: { free: 1, grip: 34, headAng: 8, wave: 1.2, hair: 1.0, mote: 1.6, glow: 0.4, gather: 1, spent: 1, twoK: 1, two: -10 },
});
const MB_HOLD = tweak(MB_POINT, { x: 2, torso: 85, p: { wave: 1.6, mote: 2.2, gather: 0.3, spent: 0.7 } });

// Quickening: she lifts the staff high in both hands, the motes spreading wide round its head, then sweeps it out over her allies.
const QK_LIFT = pose({
  y: 1, torso: 95, head: 100,
  legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) },
  armN: { ik: v(2, 64) }, armF: { up: 70, lo: 90 },
  p: { free: 1, grip: 22, headAng: 92, wave: 1.0, hair: 0.6, mote: 1.4, glow: 1, gather: 0, spent: 0, twoK: 1, two: -9 },
});
const QK_SWEEP = pose({
  x: 2, torso: 86, head: 90,
  legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) },
  armN: { up: 26, lo: 18 }, armF: { up: -20, lo: 10 },
  p: { free: 1, grip: 26, headAng: 34, wave: 2.0, hair: 1.2, mote: 2.6, glow: 1.4, gather: 0, spent: 0.6, twoK: 1, two: -9 },
});

const HURT = pose({
  x: -4, torso: 100, head: 106,
  legN: { ik: v(-6, 3) }, legF: { ik: v(5, 4) },
  armN: { up: -96, lo: -40 }, armF: { up: -130, lo: -100 },
  p: { free: 1, grip: 30, headAng: 104, wave: 2, hair: -1, mote: 1, glow: 0.3, gather: 0, spent: 0, twoK: 0 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -14, torso: 76, head: 60,
  legN: { ik: v(-12, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -84, lo: -70 }, armF: { up: -80, lo: -70 },
  p: { free: 1, grip: 30, headAng: 120, wave: 1, hair: 0.4, mote: 1.4, glow: 0, gather: 0, spent: 0.6, twoK: 0 },
});
const DEATH_FALL = pose({
  x: 1, y: -22, torso: 30, head: 14,
  legN: { up: -150, lo: -175 }, legF: { up: -120, lo: -170 },
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { free: 1, grip: 30, headAng: 60, wave: 1.6, hair: 1, mote: 1.8, glow: 0, gather: 0, spent: 1, twoK: 0 },
});
const DEATH_DOWN = pose({
  x: 5, y: -29, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 },
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { free: 1, grip: 30, headAng: 6, wave: 2, hair: 1.2, mote: 2, glow: 0, gather: 0, spent: 1, twoK: 0 },
});

// Victory: the staff lifted high, the motes rising round its head.
const VICTORY = pose({
  y: 1, torso: 91, head: 96,
  legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) },
  armN: { ik: v(4, 60) }, armF: { up: -94, lo: -80 },
  p: { free: 1, grip: 24, headAng: 88, wave: 0.8, hair: 0.2, mote: 1, glow: 0.8, gather: 0, spent: 0, twoK: 0 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const turned = (p: Pose, m: number) => tweak(p, { p: { mote: m } });

const char: CharDef = {
  id: 'associate',
  name: 'Associate',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 180, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, MB_DRAW, 2, 90, ease.out),
        ...keys([
          [MB_DRAW, 160],
          [turned(MB_DRAW, 1.2), 120],
          [mid(MB_DRAW, MB_POINT, 0.5), 50],
          [MB_POINT, 80, { hit: true }],
          [MB_HOLD, 220],
        ]),
        ...tween(D, MB_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, QK_LIFT, 2, 100, ease.out),
        ...keys([
          [QK_LIFT, 160, { event: 'cast' }],
          [turned(QK_LIFT, 2.0), 140],
          [turned(QK_LIFT, 2.6), 120],
          [mid(QK_LIFT, QK_SWEEP, 0.5), 60],
          [QK_SWEEP, 120, { hit: true }],
          [turned(QK_SWEEP, 3.2), 220],
        ]),
        ...tween(D, QK_SWEEP, IDLE, 3, 110, ease.inOut),
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
        [tweak(DEATH_DOWN, { y: -30 }), 600],
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

/** The staff's head in an icon, scaled up: the silver collar, three tines and the light at their heart. */
function iconStaff(d: Draw, foot: V, head: V, z: number) {
  const ang = angleOf(sub(head, foot));
  d.capsule({ mat: WD, z, group: 'istaff' }, foot, head, 1.5, 1.7);
  d.capsule({ mat: SV, z: z + 0.1, group: 'icollar' }, at(head, ang, -3.4), at(head, ang, 0.8), 2.2, 2.6);
  const f = d.frame(head, ang);
  for (const side of [-1, 1]) d.ribbon({ mat: SV, z: z + 0.12, group: 'itine' + side, shade: side < 0 ? -1 : 0 }, [f(0.6, side * 1.4), f(3.6, side * 4.4), f(7.2, side * 5.0), f(10.2, side * 3.4)], [1.0, 0.9, 0.75, 0.5]);
  d.ribbon({ mat: SV, z: z + 0.13, group: 'itine0' }, [f(0.8, 0), f(6, 0), f(11.4, 0)], [1.0, 0.8, 0.5]);
}

/** A ring of motes painted flat round (cx, cy), every other one a small cross (screen space). */
function iconMotes(b: { set(x: number, y: number, c: RGBA): void }, cx: number, cy: number, rx: number, ry: number, n: number, rot: number) {
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
    b.set(x, y, ACCENT.white);
    if (k % 2 === 0) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, GL.ramp[4]);
  }
}

export const associate: ChampionArt = {
  char,
  iconBg: MAT.lapis,
  icons: {
    mote_bolt: () =>
      compose(MAT.lapis, glyph((d) => {
        iconStaff(d, v(3, 6), v(17, 22), 10);
      }), (b) => {
        // the bolt of motes leaving the tines for the upper right, its trail behind it (screen space, y down)
        for (let k = 0; k < 9; k++) {
          const x = 22 + k * 1.6, y = 15 - k * 1.1;
          b.set(Math.round(x), Math.round(y), k > 5 ? ACCENT.white : GL.ramp[3 + (k % 2)]);
          if (k % 3 === 2) b.set(Math.round(x) - 1, Math.round(y) + 2, GL.ramp[4]);
        }
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) b.set(35 + dx, 5 + dy, Math.abs(dx) + Math.abs(dy) > 1 ? GL.ramp[4] : ACCENT.white);
      }),
    quickening: () =>
      compose(MAT.lapis, glyph((d) => {
        iconStaff(d, v(18, 2), v(20, 22), 10);
      }), (b) => {
        // the motes flung wide round the raised head, and the lines of their speed (screen space)
        iconMotes(b, 20, 10, 13, 5, 8, 0.3);
        for (const [x0, y0] of [[5, 26], [7, 31], [30, 27], [28, 32]] as const) for (let k = 0; k < 4; k++) b.set(x0 + (x0 < 20 ? -k : k), y0 - k, k < 2 ? ACCENT.white : GL.ramp[3]);
      }),
    bitter_motes: () =>
      compose(MAT.lapis, glyph(() => undefined), (b) => {
        // her motes circling in, the white of them turning the green of poison as they close, and the sting at the heart (screen space)
        const G = MAT.glowGreen.ramp;
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 + 0.3;
          const r = 14 - k * 0.7;
          const x = Math.round(20 + Math.cos(a) * r), y = Math.round(19 + Math.sin(a) * r * 0.85);
          const sour = k >= 4;
          b.set(x, y, sour ? G[5] : ACCENT.white);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.set(x + dx, y + dy, sour ? G[3] : GL.ramp[4]);
        }
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          for (let s = 1; s <= (k % 2 ? 3 : 5); s++) b.set(Math.round(20 + Math.cos(a) * s), Math.round(19 + Math.sin(a) * s), s < 3 ? G[5] : G[3]);
        }
        b.set(20, 19, ACCENT.white);
        // a drop of the poison falling from it
        for (const [x, y, c] of [[21, 26, G[4]], [21, 27, G[3]], [20, 28, G[3]], [21, 28, G[4]], [22, 28, G[2]], [21, 29, G[2]]] as const) b.set(x, y, c);
      }),
  },
};

