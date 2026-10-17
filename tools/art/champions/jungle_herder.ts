// The Jungle Herder (docs/DESIGN_DECISIONS.md section 21, Jakub's proposal of
// 2026-10-17): an Elite of the Court of Root, a bipedal humanoid with a
// hunchback and a herding staff, a medium-sized bell at his belt. So he is an
// old herder of the jungle's beasts, broad and bent: a great hump under a
// mantle of shaggy russet hide, his head thrust forward under a wide hat of
// woven straw with a macaw's red feather in its band, long arms, bare feet; a
// long crook of gnarled wood taller than he is, its hook curled over at the
// top (the silhouette feature, with the hump and the brim); a bronze bell
// hanging from his rope belt, swinging as he moves. What the brief leaves open
// is a first take: the hat, the mantle, the beard, the wraps, the hook and
// the bell's shape. His affinity sets nothing here (affinities are abstract,
// Jakub, 2026-10-11): his blow leaves a plain grey-white streak, his bell
// rings in its own bronze (fx/court_of_root.ts).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { leg, smear, torsoPts } from '../parts.ts';
import { add, angleOf, at, Dims, Draw, ease, lerpPose, lerpV, mul, pose, Pose, Skel, sub, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 33,
  thigh: 15.8,
  shin: 15.2,
  ankleH: 3,
  footLen: 7.6,
  spine: 21,
  neck: 5.6,
  upperArm: 13.4,
  foreArm: 12.6,
  shoulderDrop: 5.4,
  shoulderN: -3.4,
  shoulderF: 4.6,
  hipN: -2.4,
  hipF: 2.4,
};

const SK = MAT.skinDeep, RU = MAT.furRusset, ST = MAT.calabash, DL = MAT.darkleather, CH = MAT.charcoal, LE = MAT.leather, WD = MAT.wood, BZ = MAT.bronze, IR = MAT.iron, BD = MAT.bandage, HR = MAT.furCream, BN = MAT.bone, RD = MAT.red;

/** The streak of a blow: plain grey-white, the colour of motion, not of an affinity. */
const SWING = { core: ACCENT.white, edge: IR.ramp[4] };

/** The crook: its shaft from the foot to where the hook begins, where the near hand holds it when it is swung, and the hook's radius. */
const CROOK = 72, GRIP = 44, HOOK = 4.6;

interface Crook {
  foot: V;
  top: V;
  ang: number;
}

/**
 * Planted (`free` 0: its foot on the ground at `plant`, the near hand on the
 * shaft) or swung (`free` 1: `crookAng` from the hand toward the hook, held
 * `grip` from the foot); between the two, blended. Driven into the ground
 * (`stand`) it stands by itself.
 */
function crookAt(s: Skel, P: Record<string, number>): Crook {
  // driven into the ground (`stand`), it stands at `standAng` on its own and leaves his hand free
  if (P.stand) {
    const foot = v(P.plant ?? 17, 0.6), ang = P.standAng ?? 86;
    return { foot, top: at(foot, ang, CROOK), ang };
  }
  const free = Math.max(0, Math.min(1, P.free ?? 0));
  const swung = () => {
    const a = P.crookAng ?? 90, g = P.grip ?? GRIP;
    return { foot: at(s.hN, a, -g), top: at(s.hN, a, CROOK - g) };
  };
  const planted = () => {
    const foot = v(P.plant ?? 16, 0.6);
    return { foot, top: at(foot, angleOf(sub(s.hN, foot)), CROOK) };
  };
  const c = free >= 1 || P.plant === undefined ? swung() : free <= 0 ? planted() : (() => {
    const a = planted(), b = swung();
    return { foot: lerpV(a.foot, b.foot, free), top: lerpV(a.top, b.top, free) };
  })();
  return { ...c, ang: angleOf(sub(c.top, c.foot)) };
}

/** The points of the hook: up from the shaft's top, curling over toward the front and down. */
function hookPts(c: Crook, r = HOOK, sweep = 205, n = 9): V[] {
  const center = at(c.top, c.ang - 90, r);
  const pts: V[] = [];
  for (let k = 0; k <= n; k++) pts.push(at(center, c.ang + 90 - (sweep * k) / n, r));
  return pts;
}

/** Where the bell hangs from: its cord at the front of the belt, or in the near hand once he lifts it (`lift`). */
function bellAnchor(s: Skel, P: Record<string, number>): V {
  const belt = s.T(0.6, 6.6);
  const k = Math.max(0, Math.min(1, P.lift ?? 0));
  return lerpV(belt, add(s.hN, v(0, -1.8)), k);
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const c = crookAt(s, P);
  const prev = info.prev ? crookAt(info.prev, info.prev.pose.p) : undefined;

  // the streak of the blow behind the body, from the hand along the shaft to the hook
  if (info.def.smear && prev && info.prev) {
    const a0 = angleOf(sub(prev.top, info.prev.hN)), a1 = angleOf(sub(c.top, s.hN));
    smear(d, s.hN, P.sweep ?? a1 - (((a1 - a0 + 540) % 360) - 180), a1, CROOK - (P.grip ?? GRIP) + HOOK * 2, 11, SWING, 3);
  }

  // far leg and the far piece of the wrap
  leg(d, s, 'F', legCfg(10, -1));
  wrapSkirt(d, s, 'F', 11, -1);

  // the far arm behind the body
  bareArm(d, s, 'F', 20, -1);
  const lifted = (P.lift ?? 0) >= 0.5;

  // torso: a jerkin of dark hide over a great hump, the mantle of russet hide over the hump and the shoulders
  const torso = torsoPts(s, [
    [0, 6.6, 6.6],
    [4, 7.2, 7.4],
    [9, 9.6, 8.4],
    [13, 12.8, 8.8],
    [16.4, 14.6, 8.2],
    [19.4, 13.8, 6.0],
    [21.6, 8.4, 3.0],
  ]);
  d.poly({ mat: CH, z: 30, group: 'jerkin', tex: (h) => (Math.sin(h.v * 6.5 + 0.4) > 0.86 ? -1 : 0) }, torso, { kind: 'cyl', a: s.T(0, 0), b: s.T(21.4, 0), r: 10.6, bevel: 1.4 });
  mantle(d, s, P, 31);
  // the rope belt, knotted at the front
  d.poly({ mat: LE, z: 32, group: 'belt' }, [s.T(2.6, -7.6), s.T(2.9, 7.8), s.T(1.3, 7.7), s.T(1.0, -7.4)], { kind: 'cyl', a: s.T(0, 0), b: s.T(2.8, 0), r: 7.6 });
  const rope: { p: V; c: RGBA }[] = [];
  for (let w = -7; w <= 7; w += 2) rope.push({ p: s.T(1.9, w), c: LE.ramp[2] });
  d.pixels({ mat: LE, z: 32.1, group: 'belt' }, rope);
  wrapFront(d, s, 35);
  if (!lifted) bell(d, s, info, 36);

  head(d, s, P);

  // near leg and its piece of the wrap
  leg(d, s, 'N', legCfg(50, 0));
  wrapSkirt(d, s, 'N', 52, 0);

  // the crook (behind everything once he has driven it in behind him), then the near arm over it, the bell in
  // its hand once he lifts it, and the mantle's ragged fringe over the near shoulder
  crook(d, c, P.stand && (P.plant ?? 17) < 4 ? 4 : 56);
  bareArm(d, s, 'N', 60, 0);
  if (lifted) bell(d, s, info, 61);
  shoulderFringe(d, s, P, 62);
}

/** Shaggy fur: strands of a darker shade running along the hide. */
const shag = (ph: number) => (_h: unknown, x: number, y: number) => {
  const k = Math.round(ph * 3);
  return (x * 5 + Math.floor((y + k) / 2) * 3) % 7 === 0 ? -1 : (x * 3 + y + k) % 13 === 0 ? 1 : 0;
};

const legCfg = (z: number, shade: number) => ({
  thigh: SK, shin: BD, foot: SK, rThigh: [4.4, 3.6] as [number, number], rShin: [3.4, 2.6] as [number, number], z, shade, footStyle: 'bare' as const,
  // the shin wrapped in strips of cloth, a darker turn every few pixels
  shinTex: (h: { u: number }) => (Math.sin(h.u * 22) > 0.55 ? -1 : 0),
});

/** A long bare arm, the forearm wrapped in strips of cloth, a big hand. */
function bareArm(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF, el = side === 'N' ? s.eN : s.eF, ha = side === 'N' ? s.hN : s.hF, lo = side === 'N' ? s.loN : s.loF;
  const g = 'arm' + side;
  d.capsule({ mat: SK, z, group: g, shade }, sh, el, 3.6, 3.0);
  d.capsule({ mat: BD, z: z + 0.1, group: g, shade, tex: (h) => (Math.sin(h.u * 19 + 0.7) > 0.5 ? -1 : 0) }, el, at(ha, lo, -1.6), 2.9, 2.5);
  d.ellipse({ mat: SK, z: z + 0.3, group: g, shade }, ha, 2.9, 2.5, lo);
}

/**
 * The mantle: a shaggy russet hide thrown over the hump and the shoulders,
 * its hem ragged with tufts; it shifts a little with `wave`.
 */
function mantle(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const w = P.wave ?? 0;
  const tuft = (u: number, b: number, k: number) => s.T(u + Math.sin(w + k) * 0.5, b);
  const pts = [
    // the collar, then over the top of the hump and down the back
    s.T(20.8, 5.6), s.T(22.6, 2.0), s.T(23.8, -2.6), s.T(24.2, -7.2), s.T(23.0, -11.8), s.T(20.2, -15.4), s.T(16.2, -16.8), s.T(12.0, -16.2), s.T(8.2, -14.0),
    // the ragged hem from the small of the back round the side to the front of the chest
    tuft(4.8, -12.0, 0), tuft(5.2, -9.0, 1), tuft(3.6, -7.4, 2), tuft(6.0, -4.6, 3), tuft(5.0, -2.2, 4), tuft(8.0, -0.4, 5),
    tuft(7.6, 2.4, 6), tuft(10.4, 3.8, 7), tuft(10.4, 6.2, 8), tuft(13.0, 7.2, 9), tuft(13.6, 8.8, 10), tuft(16.4, 8.6, 11), s.T(18.6, 7.8),
  ];
  d.poly({ mat: RU, z, group: 'mantle', tex: shag(0.4) }, pts, { kind: 'dome', c: s.T(17.0, -7.6), r: 13.5, bevel: 1.4 });
}

/** The mantle's edge over the near shoulder: a ragged fringe of the hide hanging over the top of the arm. */
function shoulderFringe(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  // the tufts hang halfway between the upper arm and straight down
  const hang = s.upN + (((-90 - s.upN + 540) % 360) - 180) * 0.5;
  const n = 6;
  const roots: V[] = [], tips: V[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const r = s.T(20.4 - t * 1.4, -6.6 + t * 8.6);
    roots.push(r);
    tips.push(at(r, hang + Math.sin((P.wave ?? 0) + k * 1.3) * 5, k % 2 ? 4.0 : 6.6));
  }
  const axis = { a: lerpV(roots[0], roots[n], 0.5), b: lerpV(tips[0], tips[n], 0.5) };
  d.poly({ mat: RU, z, group: 'mantleN', line: 'soft', tex: shag(1.3) }, [...roots, ...tips.reverse()], { kind: 'cyl', ...axis, r: 5, bevel: 1 });
}

/** A short wrap of dark hide over each thigh, its hem cut ragged. */
function wrapSkirt(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.35;
  const a = at(hip, hang, -1.6), b = at(hip, hang, 8.6);
  const hem: V[] = [];
  for (let k = 0; k <= 6; k++) {
    const wv = 5.2 - (10.4 * k) / 6;
    hem.push(at(at(b, hang + 90, wv), hang, k % 2 ? 1.6 : 0));
  }
  d.poly(
    { mat: DL, z, group: 'wrap' + side, shade, tex: (h) => (Math.sin(h.v * 7 + (side === 'N' ? 0 : 1.3)) > 0.8 ? -1 : 0) },
    [at(a, hang + 90, 4.8), ...hem, at(a, hang - 90, 4.8)],
    { kind: 'cyl', a, b, r: 5.4, bevel: 1 },
  );
}

/** The front of the wrap: hangs between the legs and swings with them. */
function wrapFront(d: Draw, s: Skel, z: number) {
  const ang = Math.max(-116, Math.min(-64, (s.thN + s.thF) / 2));
  const f0 = s.T(1.2, -1.8), f1 = s.T(1.2, 6.8);
  const f2 = at(f1, ang + 5, 10), f3 = at(f0, ang - 3, 9.4);
  d.poly({ mat: DL, z, group: 'wrapfront', shade: -1, tex: (h) => (Math.sin(h.v * 9) > 0.78 ? -1 : 0) }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 4.6, bevel: 1 });
}

/**
 * The bronze bell: a cord from the belt (or from the far hand), the bell
 * flaring to its mouth, a clapper of iron. It hangs plumb and swings with
 * `bellSwing` and with the travel of its cord since the last frame.
 */
function bell(d: Draw, s: Skel, info: BuildInfo, z: number) {
  const P = s.pose.p;
  const top = bellAnchor(s, P);
  const before = info.prev ? bellAnchor(info.prev, info.prev.pose.p) : top;
  const travel = sub(top, before);
  const fallen = s.torso < 55;
  const swing = Math.max(-70, Math.min(70, (P.bellSwing ?? 0) - travel.x * 5));
  const down = fallen ? s.torso - 180 + 20 : -90 + swing;
  const g = 'bell';
  const knot = at(top, down, 2.6);
  d.capsule({ mat: LE, z, group: g, line: 'soft' }, top, knot, 0.6, 0.6);
  const f = d.frame(knot, down);
  // the bell: rounded at its crown, flaring to the mouth (u runs down the bell, w across it)
  d.poly({ mat: BZ, z: z + 0.1, group: g }, [f(0.2, -2.0), f(0.0, 0), f(0.2, 2.0), f(2.6, 2.7), f(5.6, 3.5), f(7.0, 4.1), f(7.4, 0), f(7.0, -4.1), f(5.6, -3.5), f(2.6, -2.7)], { kind: 'cyl', a: f(0, 0), b: f(7.2, 0), r: 4.2, bevel: 1 });
  // a raised band round its waist, and the dark of its mouth
  d.line({ mat: BZ, z: z + 0.15, group: g, line: 'none' }, f(4.4, -3.0), f(4.4, 3.0), BZ.ramp[4]);
  d.line({ mat: BZ, z: z + 0.16, group: g, line: 'none' }, f(7.0, -3.4), f(7.0, 3.4), BZ.ramp[1]);
  // the clapper shows under the mouth as the bell swings
  if (Math.abs(swing) > 12 || (P.ring ?? 0) > 0) d.circle({ mat: IR, z: z + 0.05, group: g, shade: -1 }, f(8.0, swing > 0 ? -1.4 : 1.4), 1.1);
}

/** The crook: a long shaft of gnarled wood, two knots, its hook curled over at the top, a leather binding with bone beads and a tuft of hide under it. */
function crook(d: Draw, c: Crook, z: number) {
  const g = 'crook';
  d.capsule({ mat: WD, z, group: g, tex: (h) => (Math.sin(h.u * 39) > 0.82 ? -1 : 0) }, c.foot, c.top, 1.3, 1.4);
  for (const k of [0.34, 0.63]) d.ellipse({ mat: WD, z: z + 0.02, group: g }, lerpV(c.foot, c.top, k), 1.9, 1.5, c.ang);
  d.ribbon({ mat: WD, z: z + 0.04, group: g }, hookPts(c), [1.4, 1.45, 1.45, 1.4, 1.35, 1.3, 1.2, 1.1, 1.0, 0.95]);
  // the binding under the hook, two beads of bone, a tuft of russet hide hanging from it
  const tie = at(c.top, c.ang, -6.4);
  d.capsule({ mat: LE, z: z + 0.1, group: 'crookbind', line: 'soft' }, at(tie, c.ang, -1.2), at(tie, c.ang, 1.2), 1.8, 1.8);
  const hang = at(tie, -90, 0.2);
  d.circle({ mat: BN, z: z + 0.12, group: 'crookbead' }, at(hang, c.ang + 90, 2.4), 1.0);
  d.circle({ mat: BN, z: z + 0.12, group: 'crookbead', shade: -1 }, at(at(hang, c.ang + 90, 2.4), -90, 2.0), 0.9);
  d.ribbon({ mat: RU, z: z + 0.11, group: 'crooktuft', tex: shag(2) }, [at(tie, c.ang - 90, 1.6), at(at(tie, c.ang - 90, 2.4), -96, 3), at(at(tie, c.ang - 90, 2.8), -100, 6)], [1.2, 1.1, 0.6]);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.6, 3.2);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[3], browStyle: P.call ? 'angry' : 'flat', mouth: P.call ? 'shout' : 'none', rx: 6.6, ry: 6.8 });
  // a grizzled beard along the jaw to a broad chin, and a heavy moustache
  d.poly(
    { mat: HR, z: 38.5, group: 'beard', shade: -1, line: 'soft', tex: (h, x, y) => ((x + y * 2) % 4 === 0 ? -1 : 0) },
    [H(-0.6, 0.6), H(0.4, -2.6), H(1.8, -5.8), H(3.6, -8.2), H(5.6, -8.6), H(7.0, -7.0), H(6.8, -5.2), H(5.2, -5.4), H(3.6, -4.6), H(2.4, -2.8), H(1.2, -0.4)],
    { kind: 'dome', c: H(3.4, -5.2), r: 7.2, bevel: 0.6 },
  );
  d.pixels({ mat: HR, z: 38.6, group: 'beard' }, [{ p: H(4.8, -3.1), c: HR.ramp[4] }, { p: H(5.6, -3.1), c: HR.ramp[4] }, { p: H(6.4, -3.4), c: HR.ramp[3] }]);
  hat(d, s, P);
}

/**
 * The hat: a wide brim and a low cone of woven straw, a band of leather
 * round the crown with a macaw's red feather tucked in it. Its brim throws a
 * line of shade across his brow.
 */
function hat(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  const ha = s.headDir - 90;
  const weave = (_h: unknown, x: number, y: number) => ((x + y) % 3 === 0 ? -1 : (x - y + 30) % 6 === 0 ? 1 : 0);
  // the shade of the brim across the brow
  d.pixels({ mat: SK, z: 38.4, group: 'head' }, [H(1.6, 3.6), H(2.8, 3.4), H(4.0, 3.3), H(5.2, 3.2)].map((p) => ({ p, c: SK.ramp[1] })));
  // the brim, tipped a little down at the front
  d.ellipse({ mat: ST, z: 40, group: 'brim', tex: weave }, H(0.2, 4.4), 14.2, 3.0, ha - 4, 0.25);
  d.ellipse({ mat: ST, z: 40.05, group: 'brim', shade: -1, line: 'none' }, H(0.6, 3.8), 12.4, 1.4, ha - 4, 0.3);
  // the crown: a low cone with a rounded top
  d.poly(
    { mat: ST, z: 40.2, group: 'crown', tex: weave },
    [H(-8.6, 4.9), H(-7.0, 7.6), H(-4.0, 10.6), H(-1.4, 12.0), H(1.0, 11.8), H(3.6, 10.0), H(6.4, 7.2), H(7.8, 4.6)],
    { kind: 'dome', c: H(-0.8, 6.4), r: 9.4, bevel: 1.2 },
  );
  // the band and the feather
  d.ribbon({ mat: LE, z: 40.3, group: 'hatband', shade: -1 }, [H(-8.2, 5.6), H(-3.0, 6.3), H(2.0, 6.2), H(7.4, 5.4)], [0.9, 0.9, 0.9, 0.9]);
  const sway = Math.sin(P.wave ?? 0) * 3 + (P.wind ?? 0) * 18;
  const base = H(-6.4, 6.0);
  const q1 = at(base, ha + 148 - sway, 3.2), q2 = at(q1, ha + 160 - sway, 3.4);
  d.ribbon({ mat: RD, z: 40.1, group: 'feather', line: 'soft' }, [base, q1, q2, at(q2, ha + 174 - sway, 2.2)], [0.7, 1.1, 1.0, 0.5]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the crook's `crookAng` runs from the near hand toward the hook: 0 forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  x: -1,
  y: -2,
  torso: 64,
  head: 86,
  legN: { ik: v(-9, 3) },
  legF: { ik: v(9, 3) },
  armN: { up: -42, lo: 38 },
  armF: { up: -100, lo: -82 },
  p: { plant: 17, free: 0, crookAng: 84, grip: 50, wave: 0, bellSwing: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -2 - b,
    torso: 64 - b,
    armN: { up: -42 + b * 2, lo: 38 + b },
    armF: { up: -100 + b * 2, lo: -82 + b * 3 },
    // the bell sways a little, slowly, behind the breath
    p: { wave: a, bellSwing: Math.sin(a - 0.8) * 5 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (sn > 0 ? 6 * sn : 0), ang: sn > 0 ? -22 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    x: -1,
    y: bob - 3,
    torso: 62,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -60 + sw * 10, lo: 2 + sw * 10 },
    armF: { up: -96 - sw * 26, lo: -70 - sw * 26 },
    p: { free: 1, grip: 40, crookAng: 58 + sw * 4, wind: 1, wave: a * 2, bellSwing: sw * 22 },
  });
}

// Crook Strike: the crook drawn back over the hump in both hands, then its hook brought down on the enemy.
const CS_WIND = pose({
  x: -3, y: -2, torso: 76, head: 86,
  legN: { ik: v(-11, 3) }, legF: { ik: v(9, 3) },
  armN: { ik: v(-4, 60), bend: 1 }, armF: { up: 70, lo: 110 },
  p: { free: 1, grip: 34, crookAng: 150, bellSwing: -10 },
});
const CS_TOP = pose({
  x: 1, y: -2, torso: 70, head: 84,
  legN: { ik: v(-11, 3) }, legF: { ik: v(11, 3) },
  armN: { ik: v(8, 60) }, armF: { up: 40, lo: 70 },
  p: { free: 1, grip: 34, crookAng: 84, bellSwing: -18 },
});
const CS_HIT = pose({
  x: 6, y: -5, torso: 56, head: 72,
  legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) },
  armN: { ik: v(16, 40) }, armF: { up: -30, lo: -10 },
  p: { free: 1, grip: 34, crookAng: -18, call: 1, sweep: 120, bellSwing: 26 },
});
const CS_FOLLOW = tweak(CS_HIT, { x: 7, torso: 54, armN: { ik: v(17, 36) }, p: { crookAng: -34, call: 0, bellSwing: 34 } });

// Bellwether: he drives the crook into the ground behind him, takes the bell from his belt and rings it out before him.
/** Where the crook stands once he has driven it in behind him: its foot, its lean, and the point his hand lets go of. */
const BACK = { plant: -11, ang: 95 };
const backGrip = at(v(BACK.plant, 0.6), BACK.ang, 40);
const BW_DRIVE = pose({
  x: 0, y: -4, torso: 62, head: 82,
  legN: { ik: v(-9, 3) }, legF: { ik: v(11, 3) },
  armN: { ik: backGrip, bend: 1 }, armF: { up: -100, lo: -80 },
  p: { free: 1, grip: 40, crookAng: BACK.ang, bellSwing: 10 },
});
const BW_REACH = pose({
  x: 0, y: -4, torso: 60, head: 80,
  legN: { ik: v(-9, 3) }, legF: { ik: v(11, 3) },
  armN: { ik: v(5, 31), bend: -1 }, armF: { up: -100, lo: -80 },
  p: { plant: BACK.plant, stand: 1, standAng: BACK.ang, lift: 0.9, bellSwing: 0 },
});
const BW_LIFT = pose({
  x: 1, y: -2, torso: 66, head: 90,
  legN: { ik: v(-10, 3) }, legF: { ik: v(11, 3) },
  armN: { ik: v(23, 52), bend: -1 }, armF: { up: -110, lo: -60 },
  p: { plant: BACK.plant, stand: 1, standAng: BACK.ang, lift: 1, bellSwing: -16 },
});
const BW_RING = (k: number, swing: number) =>
  tweak(BW_LIFT, { armN: { ik: v(23 + k * 2, 52 + k), bend: -1 }, p: { bellSwing: swing, ring: 1, call: 1 } });

const HURT = pose({
  x: -4, y: -2, torso: 80, head: 98,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -100, lo: -10 }, armF: { up: -70, lo: 6 },
  p: { free: 1, grip: 40, crookAng: 104, bellSwing: -24 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -13, torso: 60, head: 50,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -84, lo: -70 }, armF: { up: -84, lo: -70 },
  p: { free: 1, grip: 36, crookAng: 120 },
});
const DEATH_FALL = pose({
  x: 2, y: -20, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { free: 1, grip: 36, crookAng: 64 },
});
const DEATH_DOWN = pose({
  x: 6, y: -24, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { free: 1, grip: 36, crookAng: 6 },
});

// Victory: the crook raised high in the near hand, hook to the sky, the bell swinging at his belt.
const CALL = pose({
  y: -1, torso: 78, head: 96,
  legN: { ik: v(-8, 3) }, legF: { ik: v(9, 3) },
  armN: { ik: v(-4, 72) }, armF: { up: -94, lo: -76 },
  p: { free: 1, grip: 36, crookAng: 92, call: 1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const swung = (p: Pose, sw: number) => tweak(p, { p: { bellSwing: sw } });

const char: CharDef = {
  id: 'jungle_herder',
  name: 'Jungle Herder',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CS_WIND, 2, 90),
        ...keys([
          [CS_WIND, 200],
          [CS_TOP, 50],
          [CS_HIT, 70, { smear: true, hit: true }],
          [CS_FOLLOW, 230],
        ]),
        ...tween(D, CS_FOLLOW, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, BW_DRIVE, 1, 90, ease.out),
        ...keys([
          [BW_DRIVE, 120],
          [BW_REACH, 140],
          [mid(BW_REACH, BW_LIFT, 0.5), 90],
          [BW_LIFT, 160],
          [BW_RING(1, 30), 110, { hit: true }],
          [BW_RING(0, -30), 110],
          [BW_RING(1, 26), 110],
          [BW_RING(0, -18), 140],
          [tweak(BW_LIFT, { p: { bellSwing: 8 } }), 160],
          [mid(BW_LIFT, BW_REACH, 0.5), 100],
          [BW_REACH, 110],
          [BW_DRIVE, 110],
        ]),
        ...tween(D, BW_DRIVE, IDLE, 1, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [swung(tweak(HURT, { x: -3, torso: 76, head: 92 }), 18), 110],
        [swung(mid(HURT, IDLE, 0.6), -8), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 240],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -25 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CALL, 2, 110, ease.out),
        ...keys([
          [swung(CALL, 16), 220],
          [swung(CALL, -14), 220],
          [swung(CALL, 10), 220],
          [swung(tweak(CALL, { p: { call: 0 } }), -6), 260],
          [mid(CALL, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** The crook in an icon: thicker for 40x40, its knots, the hook and the binding with its beads. */
function iconCrook(d: Draw, foot: V, top: V, z: number) {
  const c: Crook = { foot, top, ang: angleOf(sub(top, foot)) };
  d.capsule({ mat: WD, z, group: 'icrook', tex: (h) => (Math.sin(h.u * 30) > 0.84 ? -1 : 0) }, foot, top, 1.9, 2.0);
  for (const k of [0.3, 0.62]) d.ellipse({ mat: WD, z: z + 0.02, group: 'icrook' }, lerpV(foot, top, k), 2.7, 2.1, c.ang);
  d.ribbon({ mat: WD, z: z + 0.04, group: 'icrook' }, hookPts(c, 6.4, 210), [2.0, 2.05, 2.05, 2.0, 1.9, 1.8, 1.7, 1.55, 1.4, 1.3]);
  const tie = at(top, c.ang, -8);
  d.capsule({ mat: LE, z: z + 0.1, group: 'icrookbind' }, at(tie, c.ang, -1.6), at(tie, c.ang, 1.6), 2.6, 2.6);
  d.circle({ mat: BN, z: z + 0.12, group: 'icrookbead' }, at(at(tie, c.ang + 90, 3.4), -90, 1.6), 1.4);
}

/** The bell in an icon, scaled up for 40x40, swung `deg` from plumb; the rings it sounds are painted after. */
function iconBell(d: Draw, top: V, deg: number, z: number) {
  const down = -90 + deg;
  d.capsule({ mat: LE, z, group: 'ibell' }, top, at(top, down, 4), 1.0, 1.0);
  const f = d.frame(at(top, down, 4), down);
  d.poly({ mat: BZ, z: z + 0.1, group: 'ibell' }, [f(0.3, -3.6), f(0, 0), f(0.3, 3.6), f(4.6, 4.8), f(10, 6.4), f(12.6, 7.4), f(13.2, 0), f(12.6, -7.4), f(10, -6.4), f(4.6, -4.8)], { kind: 'cyl', a: f(0, 0), b: f(13, 0), r: 7.4, bevel: 1.6 });
  d.line({ mat: BZ, z: z + 0.15, group: 'ibell', line: 'none' }, f(8, -5.4), f(8, 5.4), BZ.ramp[4]);
  d.line({ mat: BZ, z: z + 0.16, group: 'ibell', line: 'none' }, f(12.6, -6.2), f(12.6, 6.2), BZ.ramp[1]);
  d.circle({ mat: IR, z: z + 0.05, group: 'ibell', shade: -1 }, f(14.4, -2.2), 1.8);
}

/** Rings of sound opening out from a point, painted flat (screen space). */
function soundRings(b: { set(x: number, y: number, c: RGBA): void }, cx: number, cy: number, radii: number[], a0: number, a1: number, ramp: RGBA[]) {
  radii.forEach((r, i) => {
    for (let a = a0; a <= a1; a += 0.06) {
      const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
      b.set(x, y, i === 0 ? ACCENT.white : ramp[Math.max(1, 4 - i)]);
    }
  });
}

const E = ACCENT;

export const jungleHerder: ChampionArt = {
  char,
  iconBg: RU,
  icons: {
    crook_strike: () =>
      compose(RU, glyph((d) => {
        // the crook brought down from over the shoulder, its hook landing at the lower right
        smear(d, v(8, 12), 160, -10, 27, 6, SWING, 1);
        iconCrook(d, v(4, 25), v(28, 13), 10);
      }), (b) => {
        impactStar(b, 33, 30, 2, 8, 9, FXR.dust[3], E.white);
      }),
    bellwether: () =>
      compose(RU, glyph((d) => {
        iconBell(d, v(17, 34), 14, 10);
      }), (b) => {
        // the bell rings out to both sides (screen space, y down)
        soundRings(b, 20, 17, [15, 18.5], -0.95, 0.75, FXR.gold);
        soundRings(b, 20, 17, [15, 18.5], Math.PI - 0.75, Math.PI + 0.95, FXR.gold);
      }),
    herders_ward: () =>
      compose(RU, glyph((d) => {
        // the crook's hook held over the frailest, the ward a shield of warm light beneath it
        iconCrook(d, v(30, 2), v(26, 30), 10);
      }), (b) => {
        const G = FXR.gold;
        // a small kite shield of light under the hook (screen space)
        for (let y = 0; y < 16; y++) {
          const half = y < 6 ? 6 : Math.max(0, 6 - (y - 6) * 0.6);
          for (let x = -Math.floor(half); x <= Math.floor(half); x++) {
            const edge = Math.abs(x) >= Math.floor(half) - 0 || y === 0 || y === 15;
            b.set(15 + x, 17 + y, edge ? G[3] : (x + y) % 2 ? G[1] : G[2]);
          }
        }
        for (const [x, y] of [[12, 20], [13, 19], [14, 21]] as const) b.set(x, y, E.white);
      }),
  },
};

void mul;
