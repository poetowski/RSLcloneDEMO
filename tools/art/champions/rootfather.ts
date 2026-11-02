// Rootfather (docs/DESIGN_DECISIONS.md section 71, Jakub's brief of 2026-11-02): a
// Heroic Support of the Court of Root. An ancient wanderer, lean and weathered, his skin
// old bark with faint green light in its veins; moss on his shoulders and forearms; a
// long grey beard with tiny flowers in it, one of them opening and closing as he
// breathes; a crown of twisted branches and two antlers hung with a feather, dried
// leaves and small bones; a long cloak of overlapping leaves over rough hide, roots at
// its hem; leather armour splinted with living wood; roots coiled round his boots and
// growing into the ground where he stands; a crooked staff with an emerald seed floating
// in its twisted crown. His affinity (Ember) sets nothing here (Jakub, 2026-10-11).
//
// Pose channels: `stAng` the staff's direction, `wave` the seed's float and the cloak's
// sway, `flare` the seed's brightness (0..1), `rooted` how far the roots reach the ground
// (0..1), `drop` the staff lying on the floor, `dead` the light gone out of him.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT, Material } from '../palette.ts';
import { foldTex, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 35,
  thigh: 17,
  shin: 16,
  ankleH: 3,
  footLen: 6,
  spine: 20,
  neck: 5,
  upperArm: 12,
  foreArm: 12,
  shoulderDrop: 3.4,
  shoulderN: -2.2,
  shoulderF: 2.4,
  hipN: -1.4,
  hipF: 1.4,
};

const SK = MAT.bark, MS = MAT.moss, LF = MAT.green, LE = MAT.darkleather, WD = MAT.wood, HD = MAT.furSaddle, BN = MAT.bone, BE = MAT.ashBone, SD = MAT.glowGreen, FE = MAT.furCream;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;
  const dead = !!P.dead;

  cloak(d, s, wave, 4);
  if (P.drop) staff(d, v(16, 3), 2, 0, 0, 8);
  arm(d, s.sF, s.eF, s.hF, s.loF, 12, -1, 'armF', dead);
  leg(d, s, 'F', P.rooted ?? 1, 16, -1);
  body(d, s, dead, 30);
  head(d, s, wave, dead, 38);
  leg(d, s, 'N', P.rooted ?? 1, 46, 0);
  if (!P.drop) staff(d, s.hN, P.stAng ?? 88, wave, P.flare ?? 0, 50);
  arm(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN', dead);
  beard(d, s, wave, dead, 66);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

/** One leaf: a blunt point, a dark rib (the Forest Gargoyle's are sharper). */
function leaf(d: Draw, base: V, ang: number, len: number, w: number, z: number, g: string, mat: Material, shade = 0) {
  const f = d.frame(base, ang);
  d.poly({ mat, z, group: g, shade, line: 'soft' }, [f(0, 0), f(len * 0.4, w), f(len, 0), f(len * 0.4, -w)], { kind: 'bevel', w: 0.8 });
  d.line({ mat, z: z + 0.01, group: g, line: 'none' }, f(1, 0), f(len * 0.75, 0), mat.ramp[1]);
}

/** The cloak: rough hide behind him to the calves, overlapping rows of leaves over it, roots trailing from the hem. */
function cloak(d: Draw, s: Skel, wave: number, z: number) {
  const topB = s.T(20, -6), topF = s.T(20, 3);
  const hang = s.pose.torso - 189 + Math.sin(wave) * 1.2;
  const botB = at(topB, hang - 6, 45), botF = at(topF, hang + 4, 39);
  const midB = at(topB, hang - 10, 23);
  d.poly({ mat: HD, z, group: 'cloak', tex: foldTex(7, wave * 0.4, 0.5) }, [topF, topB, midB, botB, lerpV(botB, botF, 0.33), lerpV(botB, botF, 0.66), botF], { kind: 'cyl', a: lerpV(topB, topF, 0.5), b: lerpV(botB, botF, 0.5), r: 7, bevel: 1.2 });
  // the leaves: rows from the hem up, each lying over the one below; keyed to the cloak, so they stay put on it
  const rows = 7;
  for (let r = 0; r < rows; r++) {
    const k = 1 - r / (rows - 0.4);
    const a = lerpV(topB, botB, k), b = lerpV(topF, botF, k);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const pick = (r * 2 + i * 3) % 5;
      const mat = pick === 0 ? MS : pick === 3 ? WD : LF;
      const q = lerpV(a, b, (i + (r % 2 ? 0.55 : 0.1)) / n);
      leaf(d, q, hang - 4 + (i - 1.5) * 7, 9, 3.4, z + 0.5 + r * 0.1, 'cl' + r + i, mat, mat === WD ? -1 : 0);
    }
  }
  // the roots at its hem
  for (const [k, sw] of [[0.1, -3], [0.45, 2], [0.8, -2]] as const) {
    const q = lerpV(botB, botF, k);
    d.ribbon({ mat: WD, z: z + 1.4, group: 'hem' + k, line: 'none' }, [q, v(q.x + sw * 0.4, Math.max(0.6, q.y - 5)), v(q.x + sw, Math.max(0.6, q.y - 9))], [1.3, 1, 0.5]);
  }
}

/** A lean bark arm: moss on the shoulder and the forearm, a green vein under the skin. */
function arm(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string, dead: boolean) {
  d.capsule({ mat: SK, z, group, shade }, sh, el, 2.5, 2);
  d.capsule({ mat: SK, z: z + 0.1, group, shade }, el, at(ha, lo, -1), 2, 1.8);
  d.ellipse({ mat: SK, z: z + 0.3, group, shade }, at(ha, lo, 0.4), 2, 1.7, lo);
  // the moss
  const fa = lerpV(el, ha, 0.45);
  d.ellipse({ mat: MS, z: z + 0.2, group: group + 'm', line: 'soft', shade }, lerpV(el, ha, 0.35), 3.4, 2.1, lo);
  d.ellipse({ mat: MS, z: z + 0.2, group: group + 's', line: 'soft', shade }, v(sh.x - 1.6, sh.y + 1.2), 3.2, 2.3, 0);
  // the vein, faint
  if (!dead && shade === 0) {
    const m = lerpV(sh, el, 0.6);
    d.pixels({ mat: SD, z: z + 0.25, group, line: 'none', outline: false }, [m, lerpV(sh, el, 0.8), lerpV(el, ha, 0.72), lerpV(el, ha, 0.86), fa].map((p, i) => ({ p, c: SD.ramp[i % 2 ? 3 : 2] })));
  }
}

/** A leg in a wrapped legging, a boot, roots coiled round both, and with the foot down, growing into the ground. */
function leg(d: Draw, s: Skel, side: 'N' | 'F', rooted: number, z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF, kn = side === 'N' ? s.kneeN : s.kneeF, an = side === 'N' ? s.ankN : s.ankF, fa = side === 'N' ? s.pose.footN : s.pose.footF;
  const g = 'leg' + side;
  d.capsule({ mat: LE, z, group: g, shade }, hip, kn, 2.6, 2);
  d.capsule({ mat: LE, z: z + 0.1, group: g, shade }, kn, an, 2, 1.9);
  const f = d.frame(an, fa);
  d.poly({ mat: LE, z: z + 0.2, group: 'boot' + side, shade }, [f(-2.4, 2.4), f(-2.8, -1), f(-2.2, -3), f(5.6, -3), f(6.4, -1.4), f(3.2, 0.4), f(2, 2.4)], { kind: 'bevel', w: 1.2 });
  // the coils, thin rings across the shin
  for (const k of [0.34, 0.58, 0.8]) {
    const c = lerpV(kn, an, k);
    d.ribbon({ mat: WD, z: z + 0.3, group: 'coil' + side + k, shade, line: 'none' }, [v(c.x - 3, c.y + 1), v(c.x, c.y), v(c.x + 3, c.y - 1)], [0.8, 1, 0.8]);
  }
  // into the ground: only a foot that stands
  if (an.y > 5.5 || rooted <= 0) return;
  for (const [dx, ex] of [[-2, -7], [1, -1], [5, 8], [3, 12]] as const) {
    const b = f(dx, -2.6);
    const e = v(an.x + ex * rooted, 0.5);
    d.ribbon({ mat: WD, z: z + 0.4, group: 'root' + side + dx, shade, line: 'none' }, [b, lerpV(b, e, 0.5), e], [1.2, 0.9, 0.5]);
  }
}

/** The lean trunk in primitive leather, splints of living wood across it, one still in leaf; bark at the throat with a green vein. */
function body(d: Draw, s: Skel, dead: boolean, z: number) {
  const b = torsoPts(s, [
    [-1, 4.2, 4.2],
    [4, 3.8, 3.8],
    [9, 4, 4.2],
    [14, 4.4, 4.8],
    [18, 4.4, 4],
    [20, 3, 2.4],
  ]);
  d.poly({ mat: LE, z, group: 'body', tex: foldTex(6, 0.8, 0.5) }, b, { kind: 'cyl', a: s.T(0, 0.4), b: s.T(20, 0.4), r: 5.2, bevel: 1.2 });
  // the throat
  d.poly({ mat: SK, z: z + 0.1, group: 'throat', line: 'soft' }, [s.T(20.5, -2), s.T(20.5, 3), s.T(15, 3.8), s.T(15, 0)], { kind: 'bevel', w: 0.8 });
  // the splints
  for (const [u, l, r] of [[3, -3.6, 3.6], [7.4, -3.8, 3.8], [11.8, -4, 4.2]] as const) {
    d.ribbon({ mat: WD, z: z + 0.2, group: 'spl' + u }, [s.T(u, l), s.T(u + 0.8, 0), s.T(u, r)], [1.1, 1.3, 1.1]);
  }
  leaf(d, s.T(12.4, 4.2), s.pose.torso - 30, 6, 1.8, z + 0.3, 'splLeaf', LF);
  // a belt of root
  d.ribbon({ mat: WD, z: z + 0.25, group: 'belt' }, [s.T(0.6, -4.4), s.T(1.2, 0), s.T(0.6, 4.4)], [1.4, 1.6, 1.4]);
  if (!dead) d.pixels({ mat: SD, z: z + 0.3, group: 'throat', line: 'none', outline: false }, [{ p: s.T(17, 1.4), c: SD.ramp[3] }, { p: s.T(16, 2), c: SD.ramp[2] }]);
}

/** One antler: a main beam up and back, its tines; the shed colour of old bone with bark at the root. */
function antler(d: Draw, H: (u: number, w: number) => V, base: [number, number], sweep: number, z: number, g: string, shade: number) {
  const [bu, bw] = base;
  const at2 = (k: number, off = 0, up = 0) => H(bu + sweep * k * k + off, bw + 21 * k + up);
  d.ribbon({ mat: BN, z, group: g, shade: shade - 1, line: 'soft' }, [at2(0), at2(0.35), at2(0.7), at2(1)], [0.9, 0.7, 0.55, 0.3]);
  for (const [k, off, up] of [[0.3, -sweep * 0.45, 4], [0.58, sweep * 0.5, 4], [0.8, -sweep * 0.4, 3.4]] as const) {
    d.ribbon({ mat: BN, z: z + 0.02, group: g, shade: shade - 1, line: 'soft' }, [at2(k), at2(k, off, up)], [0.5, 0.25]);
  }
}

/** The bark face, a heavy brow, a long nose, an eye with the green in it, the long beard and its flowers, the crown. */
function head(d: Draw, s: Skel, wave: number, dead: boolean, z: number) {
  const H = s.H;
  // antlers behind the head
  antler(d, H, [2, 5.4], 9, z - 0.6, 'antF', -1);
  antler(d, H, [-3, 5.6], -11, z - 0.4, 'antN', 0);
  // what hangs from the crown, behind: the feather and a dried leaf
  leaf(d, H(-6, 5), -128, 11, 2.2, z - 0.3, 'feather', FE);
  leaf(d, H(-6.6, 2), -112, 7, 2.2, z - 0.3, 'dryLeaf', WD);
  // hair, thin and grey, down the back of the head
  d.poly({ mat: BE, z: z - 0.1, group: 'hair' }, [H(-2, 6), H(-5.2, 4.6), H(-6.4, 0), H(-6.8, -6), H(-4.6, -7), H(-3, -3)], { kind: 'bevel', w: 1 });
  // the skull
  d.poly({ mat: SK, z, group: 'head' }, [H(5.2, 5.2), H(1, 6.8), H(-4, 5.8), H(-5.6, 1), H(-4, -4.4), H(1, -6), H(5, -5), H(5.6, -1)], { kind: 'dome', c: H(0.6, 0.6), r: 6.8, bevel: 1.2 });
  // the nose, long and crooked
  d.poly({ mat: SK, z: z + 0.1, group: 'nose', line: 'soft' }, [H(5, 2.4), H(8.4, -1.8), H(6.8, -2.6), H(5, -1.6)], { kind: 'bevel', w: 0.7 });
  const px: { p: V; c: typeof E.white }[] = [];
  // the brow's shadow, the eye, the grain and the vein in his cheek
  for (const u of [2.6, 3.6, 4.6]) px.push({ p: H(u, 2.4), c: SK.ramp[0] });
  px.push({ p: H(3.6, 1), c: dead ? SK.ramp[0] : SD.ramp[4] }, { p: H(4.6, 1), c: dead ? SK.ramp[0] : SD.ramp[3] });
  px.push({ p: H(-1.6, 2), c: SK.ramp[1] }, { p: H(-0.6, 4), c: SK.ramp[1] }, { p: H(0, -1), c: SK.ramp[1] });
  d.pixels({ mat: BE, z: z + 0.3, group: 'face', line: 'none', outline: false }, px);
  // the crown: twisted branches round the brow, a bud of leaf, a small bone on a cord
  d.ribbon({ mat: WD, z: z + 0.4, group: 'crown' }, [H(-5.6, 3.2), H(-1.6, 6), H(2, 5.6), H(5.4, 4.2)], [1.4, 1.6, 1.4, 1.1]);
  d.ribbon({ mat: WD, z: z + 0.45, group: 'crown2', line: 'none' }, [H(-5, 4.4), H(-2, 4.4), H(1.4, 6.6), H(4.6, 5)], [0.6, 0.7, 0.7, 0.5]);
  d.ribbon({ mat: WD, z: z - 0.2, group: 'twig', line: 'soft' }, [H(3.4, 5.4), H(5, 10), H(8, 13)], [1, 0.8, 0.4]);
  leaf(d, H(5, 10), 70, 5, 1.5, z - 0.15, 'twigLeaf', LF);
  d.capsule({ mat: BN, z: z + 0.5, group: 'tinyBone' }, H(-4, 1.4), H(-4.6, -2.2), 0.7, 0.7);
}

/** The beard, long, to the belly, over the near arm; two tiny flowers always, a third opening and closing with his breath. */
function beard(d: Draw, s: Skel, wave: number, dead: boolean, z: number) {
  const H = s.H;
  d.poly({ mat: BE, z, group: 'beard', line: 'soft' }, [H(6.4, -2), H(3.4, -1.2), H(-1.2, -3), H(-1.6, -9), H(-0.4, -16), H(1.8, -23), H(3.6, -17), H(5.8, -10), H(6.8, -5)], { kind: 'bevel', w: 1 });
  const px: { p: V; c: typeof E.white }[] = [];
  for (const [u, w] of [[1, -7], [2.6, -10], [0.6, -12], [3, -14], [1.6, -17], [4.6, -5]] as const) px.push({ p: H(u, w), c: BE.ramp[2] });
  for (const [u, w, on] of [[3.6, -8, 1], [0.6, -14, 1], [2.2, -19, Math.sin(wave) > 0 ? 1 : 0]] as const) {
    if (!on || dead) continue;
    px.push({ p: H(u, w), c: E.eyeAmber }, { p: H(u + 1, w), c: E.white }, { p: H(u - 1, w), c: E.white }, { p: H(u, w + 1), c: E.white }, { p: H(u, w - 1), c: E.white });
  }
  d.pixels({ mat: BE, z: z + 0.1, group: 'beard', line: 'none', outline: false }, px);
}

/** The crooked staff, grown not cut: its crown twisted open at the top round a floating emerald seed. */
function staff(d: Draw, hand: V, ang: number, wave: number, flare: number, z: number) {
  const f = d.frame(hand, ang);
  d.ribbon({ mat: WD, z, group: 'staff' }, [f(-39, -1), f(-22, 1.4), f(-6, -0.6), f(10, 1), f(24, -1), f(35, 0.6)], [1.1, 1.3, 1.4, 1.4, 1.5, 1.7]);
  // a knot and a leaf on it
  d.ellipse({ mat: WD, z: z + 0.05, group: 'staffKnot' }, f(14, 0.6), 2.4, 1.9, ang);
  leaf(d, f(21, 1), ang - 52, 6, 1.6, z + 0.06, 'staffLeaf', LF);
  // the twisted crown: three boughs curling up and in
  const c = f(44, 0);
  d.ribbon({ mat: WD, z: z - 0.2, group: 'bough0' }, [f(35, 0.6), f(41, -5), f(47, -4.6), f(50, -1)], [1.3, 1.1, 0.8, 0.4]);
  d.ribbon({ mat: WD, z: z + 0.2, group: 'bough1' }, [f(35, 0.6), f(41, 5.4), f(47, 4.6), f(50, 1)], [1.3, 1.1, 0.8, 0.4]);
  // the seed floats between them, whole pixels up and down, slowly
  const lift = Math.round(Math.sin(wave) * 1.2);
  const q = v(c.x, c.y + lift);
  d.ellipse({ mat: SD, z: z + 0.1, group: 'seed' }, q, 2.6 + flare, 3.4 + flare * 1.4, ang);
  d.pixels({ mat: SD, z: z + 0.15, group: 'seed', line: 'none', outline: false }, [{ p: v(q.x - 1, q.y + 1), c: E.white }, { p: q, c: SD.ramp[5] }]);
  if (flare > 0.5) d.pixels({ mat: SD, z: z + 9, group: 'seedRays', line: 'none', outline: false }, [[-7, 0], [7, 0], [0, 8], [-5, 5], [5, 5], [-5, -5], [5, -5]].map(([x, y]) => ({ p: v(q.x + x, q.y + y), c: SD.ramp[4] })));
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const elder = (hN: V, hF: V, o: Partial<Pose> & { p?: Record<string, number> }, st = 87) =>
  pose({ armN: { ik: hN, bend: -1 }, armF: { ik: hF, bend: -1 }, ...o, p: { stAng: st, rooted: 1, ...(o.p ?? {}) } });

const STAND = { torso: 86, head: 86, legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) } };
const IDLE = elder(v(15, 41), v(3, 30), { y: -1, ...STAND });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return elder(v(15, 41), v(3, 30 - b), { y: -1 - b, ...STAND, p: { wave: a } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -8 * Math.cos(ph), y: 3 + (sn > 0 ? 4 * sn : 0) };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return elder(v(15, 44 + bob), v(3, 31 + bob), { y: bob - 1, torso: 80, head: 84, legN: { ik: v(n.x, n.y) }, legF: { ik: v(f.x, f.y) }, p: { wave: a, rooted: 0 } }, 72);
}

// Root Wake: the staff lifted in both hands, then driven down; the roots answer.
const RW_UP = elder(v(14, 56), v(9, 50), { y: 1, torso: 94, head: 92, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) } }, 92);
const RW_DOWN = elder(v(17, 37), v(12, 33), { y: -4, x: 2, torso: 72, head: 76, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, p: { flare: 1 } }, 88);
const RW_HOLD = tweak(RW_DOWN, { y: -3, torso: 76, p: { flare: 0.3 } });

// Long Winter: the staff raised high and held, the seed bright, his free hand open.
const LW_LIFT = elder(v(13, 62), v(18, 46), { y: 1, torso: 92, head: 102, legN: { ik: v(-5, 3) }, legF: { ik: v(5, 3) }, p: { flare: 1 } }, 84);
const LW_HELD = tweak(LW_LIFT, { y: 2, p: { flare: 1, wave: 1.5 } });

// Blight Seed: drawn back, then the crown of the staff levelled at the enemy.
const BS_BACK = elder(v(6, 48), v(0, 36), { x: -2, torso: 96, head: 90, legN: { ik: v(-5, 3) }, legF: { ik: v(7, 3) } }, 108);
const BS_AIM = elder(v(18, 48), v(9, 42), { x: 3, y: -1, torso: 76, head: 84, legN: { ik: v(-9, 3) }, legF: { ik: v(8, 3) }, p: { flare: 1 } }, 34);
const BS_HOLD = tweak(BS_AIM, { x: 2, p: { flare: 0.2 } }, );

const HURT = elder(v(11, 40), v(0, 30), { x: -4, y: -1, torso: 96, head: 102, legN: { ik: v(-8, 3) }, legF: { ik: v(5, 4) }, footF: 10 }, 98);
const DEATH_KNEEL = elder(v(16, 39), v(4, 20), { y: -11, torso: 70, head: 50, legN: { ik: v(-11, 3) }, legF: { ik: v(9, 3) }, footN: -12, p: { dead: 1, rooted: 0.6 } }, 82);
const DEATH_FALL = pose({
  x: 2, y: -8, torso: 34, head: 18,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { dead: 1, drop: 1, rooted: 0 },
});
const DEATH_DOWN = pose({
  x: 6, y: -19, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { dead: 1, drop: 1, rooted: 0 },
});
const RAISE = elder(v(14, 60), v(4, 32), { y: 1, torso: 89, head: 96, legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) }, p: { flare: 0.7 } }, 86);

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'rootfather',
  name: 'Rootfather',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 230, idle) },
    run: { loop: true, frames: cycle(8, 90, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RW_UP, 3, 110, ease.out),
        ...keys([
          [RW_UP, 240],
          [mid(RW_UP, RW_DOWN, 0.55), 60],
          [RW_DOWN, 110, { hit: true }],
          [RW_HOLD, 320],
        ]),
        ...tween(D, RW_HOLD, IDLE, 3, 130, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, LW_LIFT, 3, 120, ease.out),
        ...keys([
          [LW_LIFT, 200, { event: 'cast' }],
          [LW_HELD, 140, { hit: true }],
          [tweak(LW_HELD, { p: { flare: 1, wave: 3 } }), 320],
          [LW_HELD, 240],
        ]),
        ...tween(D, LW_HELD, IDLE, 3, 130, ease.inOut),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...tween(D, IDLE, BS_BACK, 3, 110, ease.out),
        ...keys([
          [BS_BACK, 240],
          [mid(BS_BACK, BS_AIM, 0.5), 70],
          [BS_AIM, 110, { event: 'shoot', hit: true }],
          [BS_HOLD, 320],
        ]),
        ...tween(D, BS_HOLD, IDLE, 3, 130, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 93, head: 96 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 130],
        [DEATH_KNEEL, 300],
        [DEATH_FALL, 120],
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

/** The seed in the staff's crown. */
function iconSeed(d: Draw, c: V, k: number) {
  const P = (x: number, y: number) => v(c.x + x * k, c.y + y * k);
  for (const s of [-1, 1]) d.ribbon({ mat: WD, z: 3, group: 'b' + s }, [P(s * 2, -15), P(s * 11, -5), P(s * 10, 6), P(s * 3, 13)], [2.2, 1.9, 1.5, 0.8]);
  d.ellipse({ mat: SD, z: 4, group: 'seed' }, P(0, 0), 5.6 * k, 7.4 * k, 90);
}

export const rootfather: ChampionArt = {
  char,
  iconBg: HD,
  icons: {
    root_wake: () =>
      compose(HD, glyph((d) => {
        for (const [x, lean, h, w] of [[9, 7, 26, 3], [20, -3, 32, 3.4], [31, -7, 24, 3]] as const) {
          d.ribbon({ mat: WD, z: 3, group: 'r' + x }, [v(x, 4), v(x + lean * 0.2 + 2, 4 + h * 0.5), v(x + lean, 4 + h)], [w, w * 0.7, 0.8]);
        }
      })),
    long_winter: () =>
      compose(MS, glyph((d) => {
        iconSeed(d, v(20, 25), 0.75);
        for (const y of [5, 9]) d.ribbon({ mat: WD, z: 2, group: 'coil' + y }, [v(4, y), v(20, y + 3), v(36, y)], [1, 1.5, 1]);
      })),
    blight_seed: () =>
      compose(LE, glyph((d) => {
        iconSeed(d, v(14, 20), 0.8);
        d.ribbon({ mat: SD, z: 5, group: 'bolt', line: 'none' }, [v(19, 20), v(36, 26)], [2, 0.8]);
      })),
    sap_rises: () =>
      compose(LF, glyph((d) => {
        d.ribbon({ mat: SD, z: 3, group: 'sap', line: 'none' }, [v(20, 4), v(14, 13), v(25, 22), v(20, 34)], [2, 1.7, 1.4, 0.7]);
        d.ribbon({ mat: WD, z: 2, group: 'root' }, [v(4, 5), v(20, 7), v(36, 5)], [1.6, 2.2, 1.6]);
      })),
  },
};
