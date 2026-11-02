// The Cinder Sylph (docs/DESIGN_DECISIONS.md section 72, Jakub's brief of 2026-11-02): a
// demon of the Ashveil Reign, "more demonic and scary" on his word. Tall and gaunt, she
// hovers with her taloned feet off the floor: skin the grey-black of a burned log, her
// ribs showing with fire between them; a skull of a face with hollow sockets, a burning
// point in each, and a wide grin of teeth; great horns; hair burning up off her head;
// bone spikes at her shoulders; long arms and long claws; two great bat wings burned to
// their bones, tatters of membrane still alight (the silhouette); a barbed tail; shreds
// of black hide at the waist. In her hand a heavy iron scepter with a head of prongs and
// fire burning in it, in every frame, the game lighting the air round it. She moves
// slowly (the calm motion rule). Her affinity (Tide) sets nothing here (Jakub, 2026-10-11).
//
// Pose channels: `wave` the wings' and fire's slow drift, `wing` how wide the wings stand,
// `flare` the fire burning up (0..1), `drop` the scepter on the floor, its fire out,
// `dead` the fire gone out of her.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 30,
  thigh: 14,
  shin: 14,
  ankleH: 3,
  footLen: 6,
  spine: 19,
  neck: 3,
  upperArm: 13,
  foreArm: 13,
  shoulderDrop: 3,
  shoulderN: -2.4,
  shoulderF: 2.6,
  hipN: -1.4,
  hipF: 1.4,
};

const SK = MAT.skinCinder, MB = MAT.emberMembrane, VN = MAT.ebony, HR = MAT.charcoal, CK = MAT.glowRed, CO = MAT.glowAmber, BN = MAT.ashBone;
const E = ACCENT;
const PITCH = VN.ramp[0];

const lift = (p: V): V => v(p.x, Math.max(0.6, p.y));

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0, open = P.wing ?? 0.2, flare = P.flare ?? 0;
  const dead = !!P.dead;

  wing(d, s, open, wave, 'F', 2, -1, dead);
  tail(d, s, wave, 5);
  wing(d, s, open, wave, 'N', 8, 0, dead);
  hair(d, s, wave, dead, 12);
  arm(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF', dead);
  leg(d, s, 'F', 16, -1);
  shreds(d, s, wave, 18, -1);
  body(d, s, dead, 24);
  leg(d, s, 'N', 22, 0);
  shreds(d, s, wave, 26, 0);
  head(d, s, wave, dead, 32);
  if (P.drop) scepter(d, v(24, 3.4), 3, wave, 0, 40, true);
  else scepter(d, s.hN, P.stAng ?? 72, wave, flare, 40, dead);
  arm(d, s.sN, s.eN, s.hN, s.loN, 50, 0, 'armN', dead);
  spikes(d, s.sN, 53);
  if (!dead) ash(d, s, wave, 60);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

/** A great bat wing: an arm of bone up from the back to a clawed wrist, long fingers fanning out from it, burned membrane torn between them. */
function wing(d: Draw, s: Skel, open: number, wave: number, side: 'N' | 'F', z: number, shade: number, dead: boolean) {
  const root = s.T(15, -3);
  const beat = Math.sin(wave) * 2.4;
  const off = side === 'F' ? -20 : 0;
  const g = 'wing' + side;
  const ang = s.pose.torso + 28 - open * 20 + beat + off;
  const wrist = lift(at(root, ang, 22));
  const tips = [ang + 6 + open * 8, ang + 52, ang + 84, ang + 116 - open * 8].map((a, i) => lift(at(wrist, a, [10, 30, 36, 34][i])));
  const base = lift(s.T(3, -3.4));
  // the membrane between each pair of fingers, its edge scalloped in toward the wrist, a tear left in each
  const pairs: [V, V][] = [[tips[0], tips[1]], [tips[1], tips[2]], [tips[2], tips[3]], [tips[3], base]];
  pairs.forEach(([a, b], i) => {
    const m = lerpV(lerpV(a, b, 0.5), wrist, 0.44 + (i % 2) * 0.08);
    const tear = lerpV(m, wrist, 0.32);
    d.poly({ mat: MB, z, group: g + 'M' + i, shade: shade - 1 }, [wrist, lerpV(wrist, a, 0.96), m, lerpV(tear, a, 0.1), tear, lerpV(tear, b, 0.1), lerpV(m, b, 0.2), lerpV(wrist, b, 0.96)].map(lift), { kind: 'bevel', w: 0.9 });
  });
  // the bones over it
  d.ribbon({ mat: VN, z: z + 0.1, group: g + 'B', shade }, [root, lerpV(root, wrist, 0.5), wrist], [1.7, 1.5, 1.5]);
  tips.forEach((t, i) => d.ribbon({ mat: VN, z: z + 0.15, group: g + 'F' + i, shade, line: 'none' }, [wrist, lerpV(wrist, t, 0.6), t], [1, 0.7, 0.3]));
  // the claw at the wrist
  const cl = lift(at(wrist, ang - 48, 6));
  d.ribbon({ mat: BN, z: z + 0.2, group: g + 'C', shade: shade - 1, line: 'soft' }, [wrist, cl], [1, 0.3]);
  if (dead) return;
  // the tips still alight
  d.pixels({ mat: CO, z: z + 0.3, group: g + 'B', line: 'none', outline: false }, tips.map((p, i) => ({ p, c: CO.ramp[(i + Math.round(wave)) % 2 ? 5 : 4] })));
}

/** The long barbed tail, swaying slowly, a blade of bone at its end. */
function tail(d: Draw, s: Skel, wave: number, z: number) {
  const r = s.T(0.5, -2.6);
  const sw = Math.sin(wave) * 1.8;
  const a = lift(v(r.x - 8, r.y - 8));
  const b = lift(v(r.x - 17 + sw, r.y - 11));
  const e = lift(v(r.x - 26 + sw, r.y - 5 + sw));
  d.ribbon({ mat: VN, z, group: 'tail' }, [r, a, b, e], [1.7, 1.3, 1, 0.8]);
  for (const k of [0.3, 0.65]) {
    const q = lerpV(a, b, k);
    d.ribbon({ mat: BN, z: z + 0.05, group: 'barb' + k, shade: -1, line: 'none' }, [q, v(q.x - 2, q.y + 3)], [0.7, 0.2]);
  }
  const f = d.frame(e, Math.atan2(e.y - b.y, e.x - b.x) * 57.3);
  d.poly({ mat: BN, z: z + 0.1, group: 'blade', shade: -1 }, [f(-1, 0), f(1, 3), f(8, 0), f(1, -3)].map(lift), { kind: 'bevel', w: 0.7 });
}

/** Hair burning up and back off her head: black at the root, its tips alight. */
function hair(d: Draw, s: Skel, wave: number, dead: boolean, z: number) {
  const H = s.H;
  const sw = Math.round(Math.sin(wave) * 1.2);
  d.poly({ mat: HR, z, group: 'hairB', shade: -1 }, [H(1, 6), H(-3, 11), H(-5, 8), H(-9, 14 + sw), H(-9, 8), H(-14, 10 + sw), H(-11, 4), H(-15, 2 - sw), H(-9, -1), H(-11, -6 - sw), H(-5, -5), H(-3, -2)], { kind: 'bevel', w: 1 });
  if (dead) return;
  d.pixels({ mat: CK, z: z + 0.1, group: 'hairB', line: 'none', outline: false }, [H(-3, 11), H(-9, 14 + sw), H(-14, 10 + sw), H(-15, 2 - sw), H(-11, -6 - sw)].map((p, i) => ({ p, c: i % 2 ? CO.ramp[4] : CK.ramp[4] })));
}

/** A long thin arm, ember cracks along it, and long claws: the near hand's close on the scepter, the far hand's reach. */
function arm(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string, dead: boolean) {
  d.capsule({ mat: SK, z, group, shade }, sh, el, 2, 1.5);
  d.capsule({ mat: SK, z: z + 0.1, group, shade }, el, at(ha, lo, -0.6), 1.5, 1.2);
  d.ellipse({ mat: SK, z: z + 0.2, group, shade }, ha, 1.8, 1.5, lo);
  for (const off of shade < 0 ? [-26, 0, 26] : [-20, 20]) {
    const f = d.frame(ha, lo + off);
    d.ribbon({ mat: BN, z: z + 0.25, group: group + 'c' + off, shade: shade - 1, line: 'soft' }, [f(1, 0), f(5, 0.6), f(8, -0.8)], [0.7, 0.5, 0.2]);
  }
  if (!dead && shade === 0) d.pixels({ mat: CK, z: z + 0.3, group, line: 'none', outline: false }, [lerpV(sh, el, 0.4), lerpV(sh, el, 0.62), lerpV(el, ha, 0.25), lerpV(el, ha, 0.5)].map((p, i) => ({ p, c: CK.ramp[i % 2 ? 4 : 3] })));
}

/** Bone spikes at the shoulder. */
function spikes(d: Draw, sh: V, z: number) {
  for (const [dx, a, l] of [[-2, 128, 8], [0, 104, 10], [2, 78, 6]] as const) {
    const b = v(sh.x + dx, sh.y + 1);
    d.ribbon({ mat: BN, z: z + dx * 0.01, group: 'spike' + dx, shade: -1, line: 'soft' }, [b, at(b, a, l)], [1.3, 0.25]);
  }
}

/** A thin leg, black from the knee, and a foot of three talons. */
function leg(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF, kn = side === 'N' ? s.kneeN : s.kneeF, an = side === 'N' ? s.ankN : s.ankF, fa = side === 'N' ? s.pose.footN : s.pose.footF;
  const g = 'leg' + side;
  d.capsule({ mat: SK, z, group: g, shade }, hip, kn, 2.6, 1.7);
  d.capsule({ mat: VN, z: z + 0.1, group: g, shade }, kn, an, 1.8, 1.1);
  for (const off of [-22, 0, 22]) {
    const f = d.frame(an, fa + off);
    d.ribbon({ mat: VN, z: z + 0.2, group: 'tal' + side + off, shade }, [lift(f(0, 0)), lift(f(4, 0.5)), lift(f(7.5, -1))], [1, 0.7, 0.2]);
  }
}

/** Narrow shreds of black hide from the waist, stirring. */
function shreds(d: Draw, s: Skel, wave: number, z: number, shade: number) {
  const spread: [number, number, number][] = shade < 0 ? [[-3.6, -122, 13], [3.8, -62, 11]] : [[-3, -108, 15], [0.2, -92, 11], [3.4, -72, 13]];
  spread.forEach(([u, a, len], i) => {
    const f = d.frame(s.T(1, u), a + s.pose.torso - 87 + Math.sin(wave + i) * 3);
    d.poly({ mat: VN, z: z + i * 0.1, group: 'shred' + shade + i, shade }, [f(0, 2), f(len * 0.5, 1.8), f(len * 0.7, 0.2), f(len, -0.4), f(len * 0.6, -1.4), f(0, -2)].map(lift), { kind: 'bevel', w: 0.7 });
  });
}

/** The gaunt trunk: ribs standing out, the fire showing between them. */
function body(d: Draw, s: Skel, dead: boolean, z: number) {
  const b = torsoPts(s, [
    [0, 3.4, 3.2],
    [5, 2.6, 2.4],
    [10, 3.4, 3.6],
    [15, 4, 4.4],
    [18.5, 3.2, 3],
  ]);
  d.poly({ mat: SK, z, group: 'body' }, b, { kind: 'cyl', a: s.T(0, 0.1), b: s.T(19, 0.1), r: 4.2, bevel: 1 });
  const px: { p: V; c: typeof E.white }[] = [];
  for (const u of [7.4, 10, 12.6, 15.2]) {
    for (let w = -2; w <= 3; w++) px.push({ p: s.T(u + 1.2, w), c: dead ? SK.ramp[0] : w > -1 && w < 3 ? CK.ramp[u < 11 ? 3 : 4] : CK.ramp[2] });
    for (const w of [-2, 0, 2]) px.push({ p: s.T(u, w), c: SK.ramp[4] });
  }
  // the sunken belly
  for (const [u, w] of [[3, 0], [4, 1], [2, 2]] as const) px.push({ p: s.T(u, w), c: SK.ramp[0] });
  d.pixels({ mat: SK, z: z + 0.2, group: 'ribs', line: 'none', outline: false }, px);
  // a cord of black hide at the hips
  d.ribbon({ mat: VN, z: z + 0.3, group: 'belt' }, [s.T(1, -3.6), s.T(1.6, 0), s.T(1, 3.6)], [1, 1.2, 1]);
}

/** A skull of a face: a narrow cranium, a long jaw, hollow sockets with a burning point, a wide grin of teeth; great horns. */
function head(d: Draw, s: Skel, wave: number, dead: boolean, z: number) {
  const H = s.H;
  horn(d, H, 2.4, z - 0.2, -1);
  d.poly({ mat: SK, z, group: 'head' }, [H(5.6, 4.4), H(1.6, 6.4), H(-3, 5.6), H(-5, 1.4), H(-3.6, -3), H(-0.6, -7.4), H(3.6, -9), H(6.4, -7), H(6.6, -3), H(5.6, -1.6), H(6.4, 1)], { kind: 'dome', c: H(0.8, 0), r: 6.8, bevel: 1 });
  horn(d, H, -1.4, z + 0.3, 0);
  // a brow of ridges and bone over the sockets
  d.ribbon({ mat: VN, z: z + 0.2, group: 'brow', line: 'none' }, [H(-0.4, 3.4), H(3, 3.2), H(6.6, 1.6)], [0.8, 0.9, 0.7]);
  const px: { p: V; c: typeof E.white }[] = [];
  // the socket, black and deep, a burning point in it
  for (const u of [2.4, 3.4, 4.4, 5.4]) for (const w of [2, 1, 0]) px.push({ p: H(u, w), c: PITCH });
  px.push({ p: H(1, -1), c: SK.ramp[1] }, { p: H(1.6, -2.2), c: SK.ramp[1] }, { p: H(2, -3.4), c: SK.ramp[1] });
  if (!dead) px.push({ p: H(4.4, 1), c: CO.ramp[5] }, { p: H(5.4, 1), c: CK.ramp[4] }, { p: H(3.4, 1), c: CK.ramp[2] });
  // the grin: black, back along the jaw, the teeth white and uneven
  for (let u = 0.6; u <= 6.4; u += 1) for (const w of [-4, -5, -6]) px.push({ p: H(u, w + (6.4 - u) * 0.28), c: PITCH });
  for (let u = 0.6; u <= 6.4; u += 1) {
    px.push({ p: H(u, -4 + (6.4 - u) * 0.28), c: E.white });
    if (Math.round(u) % 2) px.push({ p: H(u, -6 + (6.4 - u) * 0.28), c: BN.ramp[4] });
  }
  if (!dead) {
    const k = Math.sin(wave) > 0 ? 4 : 3;
    px.push({ p: H(-2, 3), c: CK.ramp[k] }, { p: H(-1.4, 1.6), c: CK.ramp[3] }, { p: H(-2.4, 0.4), c: CK.ramp[k] });
  }
  d.pixels({ mat: SK, z: z + 0.4, group: 'face', line: 'none', outline: false }, px);
}

function horn(d: Draw, H: (u: number, w: number) => V, u: number, z: number, shade: number) {
  d.ribbon({ mat: VN, z, group: 'horn' + u, shade, line: 'soft' }, [H(u, 5), H(u - 2, 10), H(u - 2, 15), H(u + 1, 19.6), H(u + 4, 21.6)], [2.2, 1.9, 1.4, 0.9, 0.3]);
  // rings on it
  for (const a of [8, 11.4]) d.line({ mat: VN, z: z + 0.05, group: 'horn' + u, shade, line: 'none' }, H(u - 3.4, a), H(u - 0.6, a), VN.ramp[4]);
}

/** The heavy scepter: a thick iron shaft banded with hot metal, a spike for a foot, four prongs at the head and fire burning in them, rising whichever way it points. */
function scepter(d: Draw, hand: V, ang: number, wave: number, flare: number, z: number, out: boolean) {
  const f = d.frame(hand, ang);
  d.ribbon({ mat: VN, z, group: 'shaft' }, [f(-13, 0), f(4, 0), f(21, 0)], [1.5, 1.7, 1.9]);
  d.ribbon({ mat: VN, z: z + 0.05, group: 'foot', line: 'soft' }, [f(-13, 0), f(-19, 0)], [1.6, 0.2]);
  for (const u of [-9, 9, 17]) d.line({ mat: MB, z: z + 0.1, group: 'shaft', line: 'none' }, f(u, -2), f(u, 2), out ? VN.ramp[3] : MB.ramp[5]);
  // the head: a collar and prongs
  d.poly({ mat: VN, z: z + 0.2, group: 'collar' }, [f(20, -3.4), f(24, -5), f(25, 0), f(24, 5), f(20, 3.4)], { kind: 'bevel', w: 1 });
  for (const [o, e] of [[-4.6, -6.4], [-1.6, -2.4], [1.6, 2.4], [4.6, 6.4]] as const) d.ribbon({ mat: VN, z: z + (Math.abs(o) > 2 ? 0.3 : -0.2), group: 'prong' + o, line: 'soft' }, [f(24, o), f(30, e), f(36, e * 0.5)], [1.2, 1, 0.3]);
  if (out) return;
  // the fire
  const c = f(30, 0);
  const k = 1 + flare * 0.6;
  const fl = Math.round(Math.sin(wave * 2) * 1.5);
  const tongue = (x: number, w: number, h: number, mat: typeof CK, zz: number, g: string) =>
    d.poly({ mat, z: z + zz, group: g, line: mat === CK ? 'soft' : 'none' }, [v(c.x + x - w, c.y - 3), v(c.x + x - w * 1.1, c.y + h * 0.35), v(c.x + x - w * 0.3 + fl * 0.4, c.y + h * 0.7), v(c.x + x + fl, c.y + h), v(c.x + x + w * 0.6, c.y + h * 0.55), v(c.x + x + w * 1.1, c.y + h * 0.28), v(c.x + x + w, c.y - 3)], { kind: 'bevel', w: 0.9 });
  tongue(-3, 2.4, (10 - fl) * k, CK, 0.1, 'fireB');
  tongue(3, 2.4, (9 + fl) * k, CK, 0.11, 'fireC');
  tongue(0, 4, (15 + fl) * k, CK, 0.12, 'fireA');
  tongue(0, 2.2, (8 + fl * 0.5) * k, CO, 0.15, 'fireD');
  d.pixels({ mat: CO, z: z + 9, group: 'sparks', line: 'none', outline: false }, [[-5, 15], [6, 13], [1, 18]].map(([x, y], i) => ({ p: v(c.x + x + (i ? fl : -fl), c.y + y * k + fl), c: CO.ramp[4 + (i % 2)] })));
}

/** Ash coming off her, falling once per loop. */
function ash(d: Draw, s: Skel, wave: number, z: number) {
  const px: { p: V; c: typeof E.white }[] = [];
  for (let n = 0; n < 6; n++) {
    const ph = ((wave / (Math.PI * 2)) + n / 6) % 1;
    const y = Math.round(s.hipN.y + 22 - ph * (s.hipN.y + 20));
    if (y < 1) continue;
    px.push({ p: v(s.hipN.x - 12 + n * 4 + Math.sin(wave + n) * 1.5, y), c: BN.ramp[n % 2 ? 4 : 3] });
  }
  d.pixels({ mat: BN, z, group: 'ash', line: 'none', outline: false }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const HOVER = 6;
const LEGS = { legN: { up: -80, lo: -108 }, legF: { up: -98, lo: -128 }, footN: -62, footF: -74 };

const demon = (hN: V, hF: V, o: Partial<Pose> & { p?: Record<string, number> }, st = 72) =>
  pose({ armN: { ik: hN, bend: -1 }, armF: { ik: hF, bend: -1 }, ...LEGS, ...o, p: { stAng: st, ...(o.p ?? {}) } });

const IDLE = demon(v(16, 46), v(14, 38), { y: HOVER, torso: 80, head: 76 });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round(Math.sin(a) * 1.4);
  return demon(v(16, 46 + b), v(14, 38 + b), { y: HOVER + b, torso: 80, head: 76, p: { wave: a, wing: 0.15 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round(Math.sin(a));
  return demon(v(18, 46 + b), v(16, 40 + b), { y: HOVER + 2 + b, torso: 62, head: 72, legN: { up: -132, lo: -156 }, legF: { up: -146, lo: -170 }, footN: -140, footF: -160, p: { wave: a * 2, wing: 0.5 } }, 50);
}

// Cinder Touch: the scepter drawn back, then swept forward, loosing a coal from its fire.
const CT_BACK = demon(v(8, 54), v(10, 42), { x: -2, y: HOVER + 1, torso: 92, head: 82, p: { wing: 0.4 } }, 112);
const CT_FLICK = demon(v(24, 52), v(10, 38), { x: 3, y: HOVER, torso: 70, head: 72, p: { wing: 0, flare: 1 } }, 22);
const CT_HOLD = tweak(CT_FLICK, { x: 2, torso: 74, p: { wing: 0.05, flare: 0.2 } });

// Falling Ash: the wings drawn up as far as they go, then one great slow beat down.
const FA_UP = demon(v(12, 58), v(8, 50), { y: HOVER + 3, torso: 90, head: 92, p: { wing: 1 } }, 82);
const FA_BEAT = demon(v(20, 44), v(18, 36), { y: HOVER - 2, torso: 72, head: 68, p: { wing: -0.5 } }, 48);
const FA_HOLD = tweak(FA_BEAT, { y: HOVER - 1, p: { wing: -0.2 } });

// Rise From Ash: bowed over the fire, then risen, arms flung wide, the wings open, screaming at the sky; held long.
const RA_GATHER = demon(v(14, 40), v(10, 34), { y: HOVER - 3, torso: 66, head: 48, p: { wing: -0.3 } }, 92);
const RA_OPEN = demon(v(15, 70), v(-3, 68), { y: HOVER + 6, torso: 94, head: 118, p: { wing: 1, flare: 1 } }, 84);
const RA_HELD = tweak(RA_OPEN, { y: HOVER + 7, p: { wing: 0.85, flare: 1, wave: 1.5 } });

const HURT = demon(v(11, 46), v(6, 40), { x: -4, y: HOVER, torso: 98, head: 108, legN: { up: -60, lo: -88 }, legF: { up: -76, lo: -104 }, p: { wing: 0.6 } }, 92);
const DEATH_DROP = demon(v(14, 36), v(8, 30), { y: 0, torso: 62, head: 36, p: { wing: -0.5, dead: 1 } }, 40);
const DEATH_FALL = pose({
  x: 2, y: -11, torso: 26, head: 12,
  legN: { up: -150, lo: -172 }, legF: { up: -124, lo: -160 }, footN: -130, footF: -120,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { wing: -2, dead: 1, drop: 1 },
});
const DEATH_DOWN = pose({
  x: 5, y: -19, torso: 3, head: -3,
  legN: { up: 174, lo: 178 }, legF: { up: 178, lo: 183 }, footN: -170, footF: -170,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { wing: -7, dead: 1, drop: 1 },
});
const RAISE = demon(v(16, 62), v(10, 44), { y: HOVER + 2, torso: 86, head: 94, p: { wing: 0.8, flare: 0.8 } }, 80);

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'cinder_sylph',
  name: 'Cinder Sylph',
  dims: D,
  build,
  // the fire in the scepter: the game lights the air round it and throws embers off it
  glow: (s) => {
    const P = s.pose.p;
    if (P.drop || P.dead) return undefined;
    const c = at(s.hN, P.stAng ?? 72, 30);
    return { from: c, to: v(c.x, c.y + 14), heat: 0.7 + (P.flare ?? 0) * 0.3 };
  },
  anims: {
    idle: { loop: true, frames: cycle(8, 220, idle) },
    run: { loop: true, frames: cycle(8, 90, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CT_BACK, 2, 110, ease.out),
        ...keys([
          [CT_BACK, 220],
          [mid(CT_BACK, CT_FLICK, 0.5), 60],
          [CT_FLICK, 100, { event: 'shoot', hit: true }],
          [CT_HOLD, 260],
        ]),
        ...tween(D, CT_HOLD, IDLE, 3, 120, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, FA_UP, 3, 120, ease.out),
        ...keys([
          [FA_UP, 280],
          [mid(FA_UP, FA_BEAT, 0.5), 80],
          [FA_BEAT, 120, { event: 'cast', hit: true }],
          [FA_HOLD, 340],
        ]),
        ...tween(D, FA_HOLD, IDLE, 3, 130, ease.inOut),
      ],
    },
    ritual: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RA_GATHER, 3, 130, ease.out),
        ...keys([
          [RA_GATHER, 380],
          [mid(RA_GATHER, RA_OPEN, 0.5), 90],
          [RA_OPEN, 140, { event: 'cast', hit: true }],
          [RA_HELD, 420],
          [tweak(RA_HELD, { p: { wing: 0.95, flare: 1, wave: 3 } }), 420],
          [RA_HELD, 240],
        ]),
        ...tween(D, RA_HELD, IDLE, 3, 140, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 94, head: 100 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_DROP, 0.5), 110],
        [DEATH_DROP, 200],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 150],
        [tweak(DEATH_DOWN, { y: -19.5 }), 600],
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

/** A burned bat wing, spread out from (x, y). */
function iconWing(d: Draw, x: number, y: number, s: number, z: number) {
  const P = (a: number, b: number) => v(x + s * a, y + b);
  d.poly({ mat: MB, z, group: 'w' + s }, [P(0, -2), P(6, 13), P(18, 12), P(13, 6), P(18, -2), P(11, 0), P(11, -9), P(6, -3)], { kind: 'bevel', w: 1 });
  for (const [a, b] of [[18, 12], [18, -2], [11, -9]] as const) d.ribbon({ mat: VN, z: z + 0.1, group: 'w' + s, line: 'none' }, [P(6, 13), P(a, b)], [1, 0.4]);
  d.ribbon({ mat: VN, z: z + 0.1, group: 'w' + s, line: 'none' }, [P(0, -2), P(6, 13)], [1.4, 1.1]);
}

/** A flame from (x, y) up. */
function iconFlame(d: Draw, x: number, y: number, k: number) {
  const P = (a: number, b: number) => v(x + a * k, y + b * k);
  d.poly({ mat: CK, z: 3, group: 'flame' }, [P(0, 22), P(8, 9), P(7, 1), P(0, -3), P(-7, 1), P(-8, 9)], { kind: 'bevel', w: 1.4 });
  d.poly({ mat: CO, z: 3.2, group: 'flameIn', line: 'none' }, [P(0, 11), P(3.6, 4), P(0, -1), P(-3.6, 4)], { kind: 'bevel', w: 0.9 });
}

export const cinderSylph: ChampionArt = {
  char,
  iconBg: VN,
  icons: {
    cinder_touch: () =>
      compose(VN, glyph((d) => {
        d.ribbon({ mat: HR, z: 2, group: 'shaft' }, [v(5, 3), v(19, 19)], [2, 2.4]);
        iconFlame(d, 23, 18, 0.8);
      })),
    falling_ash: () =>
      compose(HR, glyph((d) => {
        iconWing(d, 20, 22, -1, 3);
        iconWing(d, 20, 22, 1, 3);
      }), (b) => {
        for (const [x, y, k] of [[8, 32, 4], [14, 35, 5], [20, 31, 4], [27, 34, 5], [33, 31, 4], [11, 27, 3], [30, 27, 3]] as const) b.set(x, y, BN.ramp[k]);
      }),
    rise_from_ash: () =>
      compose(MB, glyph((d) => {
        d.poly({ mat: SK, z: 3, group: 'hand' }, [v(13, 3), v(27, 3), v(27, 17), v(33, 30), v(26, 22), v(24, 36), v(21, 22), v(17, 37), v(16, 22), v(8, 30), v(13, 17)], { kind: 'bevel', w: 1.2 });
        d.pixels({ mat: CK, z: 4, group: 'hand', line: 'none', outline: false }, [[17, 8], [19, 11], [22, 9], [23, 13], [20, 15]].map(([x, y]) => ({ p: v(x, y), c: CK.ramp[4] })));
      })),
    smoulder: () =>
      compose(VN, glyph((d) => {
        iconFlame(d, 20, 9, 1.1);
      })),
  },
};
