// The Follower (docs/DESIGN_DECISIONS.md section 18, Jakub's brief of
// 2026-10-13): a Common of the Court of Root, Damage, a wolf on four legs in
// grey, a little wild, with no collar. So he is a lean grey wolf, about as
// tall as the Bloodhound but longer in the leg: grey over the body and the
// head, a darker saddle along the back and the top of the tail, cream under
// the belly, on the throat, the cheeks and the legs; the erect pointed ears,
// the shaggy ruff round the neck and the long bushy tail carried low (the
// silhouette, with the long muzzle). He looks a little wild in the ragged fur
// of the ruff, the belly and the legs, a nick in his near ear and a fang
// showing at the lip. No collar, so no insignia: the Court shares a nature,
// not a hierarchy. What the brief leaves open is a first take: the shade of
// his grey and its pattern, his size, the ragged fur, the nick and the fang.
// His affinity sets nothing here (affinities are abstract, Jakub, 2026-10-11):
// his snap lands as two rows of white fangs, his rend as ragged tears
// (fx/court_of_root.ts).
//
// The rig is the Bloodhound's (solveDog in bloodhound.ts) with a wolf's
// proportions: the shared pose's torso is the body's axis (0 = level), its
// head the neck (from the withers to the centre of the head); armN / armF are
// the front paws and legN / legF the hind paws, IK targets on the ground;
// p.snout is the muzzle's direction, p.jaw opens the mouth (0-1), p.ear lays
// the ears back, p.tail is the tail's angle and p.bristle raises the ruff
// (0-1). Dims make the shared solver's head this head (the portrait is cut
// around it), and the body stands behind the pivot so that the pivot, where
// effects and hits land, is under his chest.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, dir, Dims, Draw, ease, ik2, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 41,
  thigh: 15,
  shin: 15,
  ankleH: 3,
  footLen: 6,
  spine: 18,
  neck: 20,
  upperArm: 11,
  foreArm: 17,
  shoulderDrop: 0,
  shoulderN: 0,
  shoulderF: 0,
  hipN: 0,
  hipF: 0,
};

const GY = MAT.furGrey, SD = MAT.furSaddle, CR = MAT.furCream, BK = MAT.furBlack;

/** The body's centre stands this far behind the pivot (x of every pose). */
const BACK = -6;
/** The head's scale on the sprite: a wolf's head is big for his body. */
const HEAD = 1.1;
/** Leg bones: front (shoulder to elbow, elbow to wrist), hind (hip to stifle, stifle to hock). */
const UPPER = 11, LOWER = 17, THIGH = 15, GASKIN = 15;

interface Leg { root: V; mid: V; low: V; paw: V }
interface Wolf { B: (u: number, w: number) => V; withers: V; head: V; neck: number; fN: Leg; fF: Leg; hN: Leg; hF: Leg }

/** The wolf's skeleton from a pose: body frame B (u forward along the spine, w down toward the belly), the neck and the four legs. */
function solveWolf(p: Pose): Wolf {
  const c = v(p.x, D.hipH + p.y);
  const ax = dir(p.torso), dn = dir(p.torso - 90);
  const B = (u: number, w: number) => v(c.x + ax.x * u + dn.x * w, c.y + ax.y * u + dn.y * w);
  const withers = at(c, p.torso, D.spine);
  const head = at(withers, p.head, D.neck);
  const target = (l: Pose['armN']) => ('ik' in l ? l.ik : v(0, 1.6));
  // a lifted paw folds back at the wrist (front) or swings under at the hock (hind);
  // lying down (p.lie), the pasterns and hocks rest flat on the ground behind the paws
  const lift = (paw: V) => Math.max(0, Math.min(1, (paw.y - 1.6) / 6));
  const lie = p.p.lie ?? 0;
  const front = (root: V, paw: V): Leg => {
    const k = lift(paw);
    const r = ik2(root, v(paw.x - 1.2 + k * 4.4 - lie * 5, paw.y + 5.6 - k * 1.4 - lie * 4), UPPER, LOWER, -1);
    return { root, mid: r.mid, low: r.end, paw };
  };
  const hind = (root: V, paw: V): Leg => {
    const k = lift(paw);
    const r = ik2(root, v(paw.x - 2.6 - k * 3 - lie * 9.5, paw.y + 11.6 - k * 1.6 - lie * 10.4), THIGH, GASKIN, 1);
    return { root, mid: r.mid, low: r.end, paw };
  };
  return {
    B, withers, head, neck: p.head,
    fN: front(B(11, 7.5), target(p.armN)),
    fF: front(B(12.4, 7), target(p.armF)),
    hN: hind(B(-15.5, 2.6), target(p.legN)),
    hF: hind(B(-14, 2.1), target(p.legF)),
  };
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const g = solveWolf(s.pose);
  const snout = P.snout ?? -10;
  const Hd = d.frame(g.head, snout);

  // the far legs, darker, behind everything near
  hindLeg(d, g.hF, 'F', 10, -1);
  frontLeg(d, g.fF, 'F', 12, -1);
  // the tail hangs between the hind legs, behind the near one
  tail(d, g, P.tail ?? -122, 20);
  // the far ear stands behind the head
  ear(d, Hd, snout, P.ear ?? 0, 'F', 26, HEAD);
  // the body: grey, the near shoulder hidden in its fur, the near haunch over it, the cream belly and the dark saddle over them
  frontLeg(d, g.fN, 'N', 29, 0, true, false);
  body(d, g, 30);
  hindLeg(d, g.hN, 'N', 30.05, 0, true, false);
  belly(d, g, 30.1);
  saddle(d, g, 30.2);
  // the lower near legs before the body
  hindLeg(d, g.hN, 'N', 34, 0, false, true);
  frontLeg(d, g.fN, 'N', 36, 0, false, true);
  // the neck in its ruff, the head, the near ear over its side
  neck(d, g, P.bristle ?? 0, 40);
  head(d, Hd, snout, P, 44, HEAD, 0);
  ear(d, Hd, snout, P.ear ?? 0, 'N', 46, HEAD);
}

/** A grizzled coat: a few darker and a few lighter hairs breaking up each shade. */
const fur = (_h: unknown, x: number, y: number) => ((x * 3 + y * 7) % 13 === 0 ? -1 : (x * 5 + y * 2) % 19 === 0 ? 1 : 0);

function body(d: Draw, g: Wolf, z: number) {
  const B = g.B;
  d.poly(
    { mat: GY, z, group: 'body', tex: fur },
    [B(-25, -1.6), B(-22, -4.6), B(-14, -5.4), B(-4, -5.6), B(6, -6.4), B(14, -7.8), B(20, -6.0), B(24, -1.0), B(24.6, 5), B(22, 11.0), B(17, 14.2), B(11, 14.6), B(5.6, 12.6), B(1, 8.8), B(-4, 6.8), B(-9, 6.4), B(-14, 7.4), B(-19, 8.2), B(-23.5, 5.8), B(-26, 2.0)],
    { kind: 'cyl', a: B(-25, 2.5), b: B(24, 2.5), r: 10.5, bevel: 1.2 },
  );
}

/** Cream under the chest and the belly, its lower edge hanging in ragged tufts. */
function belly(d: Draw, g: Wolf, z: number) {
  const B = g.B;
  d.poly(
    { mat: CR, z, group: 'belly', line: 'none', shade: -1, tex: fur },
    [B(24.4, 4.0), B(24.6, 5), B(22, 11.0), B(18.6, 13.6), B(16.4, 15.8), B(14, 14.4), B(11.2, 15.8), B(8.6, 13.6), B(5.6, 12.6), B(3.4, 11.2), B(1.6, 10.4), B(-0.6, 8.4), B(-4, 6.8), B(-7.6, 6.4), B(-4, 5.6), B(1, 7.4), B(6, 10.4), B(12, 11.8), B(18, 11.0), B(22, 8.0)],
    { kind: 'cyl', a: B(-25, 2.5), b: B(24, 2.5), r: 10.5, bevel: 1.2 },
  );
}

/** The darker saddle over the back, from the withers to the rump, its lower edge grizzled. */
function saddle(d: Draw, g: Wolf, z: number) {
  const B = g.B;
  d.poly(
    { mat: SD, z, group: 'saddle', line: 'none', tex: fur },
    [B(-25, -1.3), B(-22, -4.8), B(-14, -5.8), B(-4, -6.0), B(6, -6.6), B(14, -7.8), B(18.6, -6.2), B(15.4, -2.6), B(11, -1.2), B(7, -2.4), B(3, -1.4), B(-2, -2.8), B(-7, -1.8), B(-12, -3.0), B(-17, -2.0), B(-21, -0.8), B(-24.4, 0.2)],
    { kind: 'cyl', a: B(-25, 2.5), b: B(24, 2.5), r: 10.5, bevel: 1.2 },
  );
}

/** A front leg: shoulder to elbow (`upper`, grey, a tuft behind the elbow), then the foreleg, the pastern and the paw (`lower`, cream). */
function frontLeg(d: Draw, l: Leg, side: 'N' | 'F', z: number, shade: number, upper = true, lower = true) {
  const g = 'front' + side;
  if (upper) d.capsule({ mat: GY, z, group: g, shade, tex: fur }, l.root, l.mid, 5.2, 3.8);
  if (!lower) return;
  // the feathering behind the elbow: a ragged tuft pointing back and down
  const fa = Math.atan2(l.low.y - l.mid.y, l.low.x - l.mid.x) * 57.29578;
  const T = d.frame(l.mid, fa);
  d.poly({ mat: GY, z: z + 0.05, group: g, shade: shade - 1, tex: fur }, [T(-1, 1.6), T(2.4, 4.2), T(3.8, 2.2), T(5.8, 3.2), T(5.6, 0.4)], { kind: 'bevel', w: 1.2 });
  d.capsule({ mat: CR, z: z + 0.1, group: g, shade: shade - 1 }, l.mid, l.low, 2.6, 2.0);
  d.capsule({ mat: CR, z: z + 0.2, group: g, shade: shade - 1 }, l.low, l.paw, 1.9, 2.1);
  paw(d, l.paw, z + 0.3, g, shade - 1);
}

/** A hind leg: the haunch (`upper`, grey, ragged at the back of the thigh), then the gaskin, the hock and the paw (`lower`, cream). */
function hindLeg(d: Draw, l: Leg, side: 'N' | 'F', z: number, shade: number, upper = true, lower = true) {
  const g = 'hind' + side;
  if (upper) {
    d.capsule({ mat: GY, z, group: g, shade, tex: fur, line: 'none' }, l.root, l.mid, 7.0, 4.2);
    // the "trousers": long fur hanging at the back of the thigh
    const ta = Math.atan2(l.mid.y - l.root.y, l.mid.x - l.root.x) * 57.29578;
    const T = d.frame(l.root, ta);
    d.poly({ mat: GY, z: z + 0.01, group: g, shade, tex: fur }, [T(2, -5.8), T(5.4, -7.6), T(6.6, -5.6), T(9.4, -6.6), T(9.8, -4.4), T(12.6, -4.4), T(11.6, -1.6)], { kind: 'bevel', w: 1.4 });
  }
  if (!lower) return;
  d.capsule({ mat: GY, z: z + 0.1, group: g, shade, tex: fur }, l.mid, l.low, 3.4, 2.0);
  d.circle({ mat: CR, z: z + 0.15, group: g, shade: shade - 1 }, l.low, 2.0);
  d.capsule({ mat: CR, z: z + 0.2, group: g, shade: shade - 1 }, l.low, l.paw, 1.8, 2.1);
  paw(d, l.paw, z + 0.3, g, shade - 1);
}

/** A big paw: a rounded pad pointing forward, two dark lines between the toes. */
function paw(d: Draw, p: V, z: number, g: string, shade: number) {
  d.ellipse({ mat: CR, z, group: g, shade }, v(p.x + 1.5, p.y + 0.3), 3.6, 2.2, 0);
  d.pixels({ mat: CR, z: z + 0.05, group: g }, [{ p: v(p.x + 2.6, p.y - 0.5), c: CR.ramp[1] }, { p: v(p.x + 4.0, p.y - 0.5), c: CR.ramp[1] }]);
}

/** The tail: long and bushy, hanging from the rump; grey with the saddle's dark along its top and a dark tip, cream beneath. */
function tail(d: Draw, g: Wolf, ang: number, z: number) {
  const p0 = g.B(-24.2, -1.8);
  const p1 = at(p0, ang, 6), p2 = at(p1, ang - 5, 6.5), p3 = at(p2, ang - 10, 6.5), p4 = at(p3, ang - 14, 5);
  d.ribbon({ mat: GY, z, group: 'tail', tex: fur }, [p0, p1, p2, p3, p4], [2.4, 3.6, 4.0, 3.4, 1.3]);
  // the saddle's dark along its top: the side a quarter turn back from the tail's direction, hanging or held out behind
  const up = (pt: V, a: number, r: number) => at(pt, a - 90, r);
  d.ribbon({ mat: SD, z: z + 0.1, group: 'tail', line: 'none', tex: fur }, [up(p0, ang, 1.6), up(p1, ang, 2.6), up(p2, ang - 5, 3.0), up(p3, ang - 10, 2.4)], [1.0, 1.1, 1.1, 1.0]);
  // the dark tip
  d.ribbon({ mat: SD, z: z + 0.15, group: 'tail', line: 'none' }, [at(p3, ang - 14, 2.0), p4], [2.6, 1.3]);
}

/**
 * The neck in its ruff, from the withers to the head (w > 0 the nape, w < 0
 * the throat): grey with the saddle's dark along the nape, the throat's ruff
 * cream, every edge ragged; `bristle` (0-1) raises the hackles.
 */
function neck(d: Draw, g: Wolf, bristle: number, z: number) {
  const a = g.neck;
  const f = d.frame(at(g.withers, a, -5), a);
  const L = D.neck + 3;
  const br = bristle;
  const nape = [f(-2, 9.0), f(L * 0.04, 11.4 + br * 1.4), f(L * 0.12, 10.2 + br), f(L * 0.2, 13.0 + br * 2.6), f(L * 0.3, 10.8 + br), f(L * 0.4, 12.6 + br * 2.4), f(L * 0.5, 10.2 + br * 0.6), f(L * 0.6, 11.4 + br * 1.8), f(L * 0.7, 9.0), f(L * 0.8, 9.6 + br), f(L * 0.9, 6.8), f(L, 5.0)];
  const throat = [f(L, -4.6), f(L * 0.84, -8.2), f(L * 0.7, -11.2), f(L * 0.6, -10.0), f(L * 0.48, -13.0), f(L * 0.36, -11.6), f(L * 0.24, -14.0), f(L * 0.12, -12.4), f(0, -13.2)];
  d.poly({ mat: GY, z, group: 'neck', tex: fur }, [...nape, ...throat], { kind: 'cyl', a: f(0, 0), b: f(L, 0), r: 10, bevel: 1.2 });
  d.poly(
    { mat: SD, z: z + 0.1, group: 'neck', line: 'none', tex: fur },
    [...nape.slice(0, 11), f(L * 0.86, 4.4), f(L * 0.66, 5.4), f(L * 0.46, 4.2), f(L * 0.26, 5.6), f(-2, 4.0)],
    { kind: 'cyl', a: f(0, 0), b: f(L, 0), r: 8.5 },
  );
  d.poly(
    { mat: CR, z: z + 0.15, group: 'neck', line: 'none', tex: fur },
    [f(L, -1.4), ...throat, f(0, -6.4), f(L * 0.3, -5.2), f(L * 0.6, -4.0), f(L * 0.85, -2.4)],
    { kind: 'cyl', a: f(0, 0), b: f(L, 0), r: 8.5 },
  );
}

/**
 * The head in a frame along the muzzle (u forward, w up), scaled by k for the
 * icons: a broad skull with cream cheek fur flaring back, a long deep muzzle,
 * grey above and cream along the lip, the jaw opening at p.jaw onto white
 * fangs, a black nose, an amber eye under a dark brow, a fang showing at the
 * lip when the mouth is shut.
 */
function head(d: Draw, Hd: (u: number, w: number) => V, snout: number, P: Record<string, number>, z: number, k: number, shade: number) {
  const H = (u: number, w: number) => Hd(u * k, w * k);
  const g = 'head' + Math.round(z);
  const jaw = P.jaw ?? 0;
  // the lower jaw turns down round its hinge
  const th = -jaw * 0.62, hu = 0.4, hw = -2.4;
  const J = (u: number, w: number) => {
    const du = u - hu, dw = w - hw;
    return H(hu + du * Math.cos(th) - dw * Math.sin(th), hw + du * Math.sin(th) + dw * Math.cos(th));
  };
  if (jaw > 0.05) {
    // the mouth open: dark inside, the tongue, the lower jaw with its fangs
    d.poly({ mat: CR, z: z - 0.2, group: g + 'm', color: ACCENT.mouthRed, line: 'none' }, [H(0.8, -1.8), H(13.6, -1.4), J(13.2, -2.6), J(1.4, -3.0)]);
    d.poly({ mat: CR, z: z - 0.15, group: g + 'm', color: ACCENT.lipRose, line: 'none' }, [J(3, -2.8), J(10.2, -2.4), J(10.8, -3.3), J(4, -3.8)]);
    d.poly({ mat: CR, z: z - 0.1, group: g + 'j', shade }, [J(0.4, -2.4), J(13.4, -2.6), J(13.6, -3.8), J(10, -5.0), J(2.2, -5.2)], { kind: 'bevel', w: 1.2 * k });
    const teeth: { p: V; c: RGBA }[] = [];
    // the upper fangs hang from the lip, the lower ones rise from the jaw
    for (const [u, n] of [[12.4, 2], [9.6, 1], [7.2, 1]] as const) for (let i = 0; i < n; i++) teeth.push({ p: H(u, -2.0 - i * k), c: ACCENT.white });
    for (const [u, n] of [[11.8, 2], [9.0, 1]] as const) for (let i = 0; i < n; i++) teeth.push({ p: J(u, -2.6 + i * k), c: ACCENT.white });
    d.pixels({ mat: CR, z: z + 0.4, group: g + 'j' }, teeth);
  }
  // the skull, broad between the ears
  d.ellipse({ mat: GY, z, group: g, shade, tex: fur }, H(-1.4, 1.4), 7.0 * k, 6.0 * k, snout);
  // the cheek fur: cream, flaring back from the jaw in ragged points
  d.poly(
    { mat: CR, z: z + 0.02, group: g, shade, line: 'none', tex: fur },
    [H(1.8, -1.2), H(-0.4, -4.2), H(-3.6, -6.2), H(-4.8, -4.4), H(-7.4, -5.4), H(-7.2, -3.0), H(-9.2, -2.6), H(-6.6, -0.4), H(-2.0, 0.4)],
    { kind: 'bevel', w: 1.2 * k },
  );
  // the muzzle: long and deep, grey above, cream along the lip
  d.poly(
    { mat: GY, z: z + 0.05, group: g, shade, tex: fur },
    [H(0.4, 5.4), H(5, 4.0), H(9.6, 2.8), H(13.2, 1.9), H(14.8, 0.6), H(14.6, -1.2), H(12.8, -2.2), H(6, -2.6), H(0, -2.4)],
    { kind: 'dome', c: H(5.4, 1.0), r: 9 * k, bevel: 1 },
  );
  d.poly(
    { mat: CR, z: z + 0.08, group: g, shade, line: 'none' },
    [H(1.8, -0.4), H(8, -0.6), H(13.2, -0.6), H(14.2, -1.3), H(12.8, -2.2), H(6, -2.6), H(0.6, -2.4)],
    { kind: 'bevel', w: 1 * k },
  );
  // the lower jaw shut: a cream strip under the muzzle
  if (jaw <= 0.05) d.poly({ mat: CR, z: z + 0.04, group: g + 'j', shade }, [H(0.4, -2.4), H(12.6, -2.2), H(12, -3.4), H(6, -4.0), H(1, -4.0)], { kind: 'bevel', w: 1 * k });
  // the nose
  d.ellipse({ mat: BK, z: z + 0.3, group: g + 'n' }, H(14.2, 0.6), 1.8 * k, 1.4 * k, snout);
  const px: { p: V; c: RGBA }[] = [{ p: H(14.6, 1.2), c: BK.ramp[5] }];
  // the mouth's line, and the fang showing at the lip
  if (jaw <= 0.05) {
    for (const u of [5.6, 7.2, 8.8, 10.4, 12.0, 13.2]) px.push({ p: H(u, -2.3), c: SD.ramp[1] });
    px.push({ p: H(11.6, -3.0), c: ACCENT.white });
  }
  // the eye: amber under a dark brow, a dark line running from it toward the nose; closed when he is down
  if (P.dead) px.push({ p: H(4.6, 1.9), c: SD.ramp[1] }, { p: H(5.6, 1.7), c: SD.ramp[1] });
  else px.push({ p: H(5.0, 2.0), c: ACCENT.eyeAmber }, { p: H(5.8, 1.9), c: INK.eye }, { p: H(4.2, 2.9), c: SD.ramp[1] }, { p: H(5.2, 3.1), c: SD.ramp[1] }, { p: H(6.2, 2.8), c: SD.ramp[2] }, { p: H(6.9, 1.5), c: SD.ramp[2] });
  d.pixels({ mat: GY, z: z + 0.35, group: g }, px);
}

/**
 * An ear standing up from the back of the skull, short and broad with a
 * rounded tip as a wolf's, laid back by `back` (degrees): grey with a dark rim
 * along its back edge and cream inside along its front; the near one carries a
 * nick, the far one stands behind the head.
 */
function ear(d: Draw, Hd: (u: number, w: number) => V, snout: number, back: number, side: 'N' | 'F', z: number, k: number) {
  const root = side === 'N' ? Hd(-3.0 * k, 4.6 * k) : Hd(-1.2 * k, 5.2 * k);
  const a = snout + 96 + back + (side === 'F' ? -10 : 0);
  // u up the ear, w > 0 toward its back edge
  const E = d.frame(root, a);
  const L = (side === 'N' ? 7.2 : 6.6) * k;
  const s = side === 'F' ? -1 : 0;
  const outline = side === 'N'
    ? [E(-1, -2.9 * k), E(L * 0.55, -2.1 * k), E(L * 0.92, -0.7 * k), E(L, 0.4 * k), E(L * 0.82, 1.7 * k), E(L * 0.66, 1.1 * k), E(L * 0.54, 2.3 * k), E(0, 3.1 * k), E(-1, 0)]
    : [E(-1, -2.9 * k), E(L * 0.55, -2.1 * k), E(L * 0.92, -0.7 * k), E(L, 0.4 * k), E(L * 0.6, 2.2 * k), E(0, 3.1 * k), E(-1, 0)];
  d.poly({ mat: GY, z, group: 'ear' + side, shade: s, tex: fur }, outline, { kind: 'bevel', w: 1.2 * k });
  if (side === 'N') {
    d.poly({ mat: CR, z: z + 0.1, group: 'ear' + side, line: 'none', shade: -1 }, [E(0.4, -2.0 * k), E(L * 0.55, -1.2 * k), E(L * 0.84, -0.3 * k), E(L * 0.4, 0.3 * k), E(0.6, 0.6 * k)], { kind: 'bevel', w: 1 * k });
    d.line({ mat: SD, z: z + 0.1, group: 'ear' + side, line: 'none' }, E(L * 0.1, 2.7 * k), E(L * 0.45, 2.1 * k), SD.ramp[2]);
  }
}

// ---------------------------------------------------------------------------
// Poses & animations (paws are IK targets on the ground; x is the body behind the pivot)
// ---------------------------------------------------------------------------

/** A pose with the paws given as [near front, far front, near hind, far hind] x positions on the ground. */
const wolf = (o: Partial<Pose> & { p?: Record<string, number> }, paws: [number, number, number, number] = [9, 12, -27, -24], lift: [number, number, number, number] = [0, 0, 0, 0]) =>
  pose({
    ...o,
    x: BACK + (o.x ?? 0),
    armN: { ik: v(paws[0], 1.6 + lift[0]) },
    armF: { ik: v(paws[1], 1.6 + lift[1]) },
    legN: { ik: v(paws[2], 1.6 + lift[2]) },
    legF: { ik: v(paws[3], 1.6 + lift[3]) },
  });

const IDLE: Pose = wolf({ torso: 2, head: 50, p: { snout: -10, jaw: 0, ear: 0, tail: -122, bristle: 0 } });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return wolf({ y: -b, torso: 2, head: 50 - b, p: { snout: -10 + b, jaw: 0, ear: Math.round(Math.sin(a) * 2), tail: -122 + Math.round(Math.sin(a) * 3), bristle: 0 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  // a gallop: front pair, then hind pair, each a little out of step with its partner
  const paw = (base: number, ph: number, reach: number, lift: number): [number, number] => {
    const s = Math.sin(ph);
    return [base - reach * Math.cos(ph), s > 0 ? lift * s : 0];
  };
  const [fNx, fNy] = paw(10, a, 10, 7), [fFx, fFy] = paw(12, a + 0.7, 10, 7);
  const [hNx, hNy] = paw(-26, a + Math.PI, 10, 6), [hFx, hFy] = paw(-24, a + Math.PI + 0.7, 10, 6);
  const bob = Math.round(Math.sin(2 * a) * 1.5);
  return wolf(
    { y: bob - 1, torso: Math.round(Math.sin(a + 0.6) * 3), head: 40 + Math.round(Math.sin(a) * 3), p: { snout: -6, jaw: 0.2, ear: 26 + Math.round(Math.sin(a) * 4), tail: -168 + Math.round(Math.sin(a) * 5), bristle: 0 } },
    [fNx, fFx, hNx, hFx],
    [fNy, fFy, hNy, hFy],
  );
}

// Snap: he drops low with the hackles up, darts in with the jaws wide and snaps them shut.
// The target stands 38 px ahead: the jaws close at its middle, the head thrust forward.
const SN_LOW = wolf({ x: -4, y: -4, torso: -3, head: 36, p: { snout: -18, jaw: 0.12, ear: 30, tail: -150, bristle: 1 } }, [8, 11, -28, -25]);
const SN_OPEN = wolf({ x: 1, y: -2, torso: -6, head: 30, p: { snout: 2, jaw: 1, ear: 34, tail: -170, bristle: 1 } }, [14, 17, -25, -22]);
const SN_SHUT = wolf({ x: 4, y: -3, torso: -6, head: 28, p: { snout: -8, jaw: 0, ear: 28, tail: -168, bristle: 1 } }, [16, 19, -24, -21]);
const SN_HOLD = wolf({ x: 3, y: -3, torso: -5, head: 32, p: { snout: -14, jaw: 0.1, ear: 20, tail: -160, bristle: 0.6 } }, [16, 19, -24, -21]);

// Rend: he gathers, leaps (the scene carries him to the enemy along the arc), lands with the
// jaws shut on the target and wrenches his head down and back to tear.
const RD_GATHER = wolf({ x: -5, y: -7, torso: -4, head: 34, p: { snout: -20, jaw: 0.1, ear: 30, tail: -150, bristle: 1 } }, [7, 10, -29, -26]);
const RD_LAUNCH = wolf({ x: 2, y: 2, torso: 16, head: 46, p: { snout: 2, jaw: 0.5, ear: 34, tail: -176, bristle: 1 } }, [17, 20, -33, -30], [8, 7, 0, 0]);
const RD_FLY = wolf({ x: 2, y: 5, torso: 4, head: 34, p: { snout: -2, jaw: 1, ear: 36, tail: 178, bristle: 1 } }, [25, 27, -37, -34], [10, 9, 8, 7]);
const RD_REACH = wolf({ x: 3, y: 2, torso: -6, head: 30, p: { snout: -6, jaw: 1, ear: 34, tail: -174, bristle: 1 } }, [23, 25, -31, -28], [5, 4, 9, 8]);
const RD_BITE = wolf({ x: 4, y: -3, torso: -8, head: 26, p: { snout: -8, jaw: 0, ear: 30, tail: -166, bristle: 1 } }, [17, 20, -24, -21]);
const RD_DOWN = wolf({ x: 1, y: -4, torso: -7, head: 16, p: { snout: -34, jaw: 0.06, ear: 26, tail: -158, bristle: 1 } }, [17, 20, -25, -22]);
const RD_BACK = wolf({ x: -3, y: -2, torso: -2, head: 34, p: { snout: -6, jaw: 0.06, ear: 22, tail: -150, bristle: 0.8 } }, [15, 18, -27, -24]);
const RD_LET = wolf({ x: -3, y: -1, torso: 0, head: 42, p: { snout: -12, jaw: 0.4, ear: 14, tail: -138, bristle: 0.4 } }, [13, 16, -27, -24]);

const HURT = wolf({ x: -4, y: -1, torso: -4, head: 40, p: { snout: -24, jaw: 0.35, ear: 44, tail: -100, bristle: 0.4 } }, [7, 10, -29, -26]);
const DEATH_SAG = wolf({ x: -2, y: -12, torso: -6, head: 30, p: { snout: -22, jaw: 0.1, ear: 36, tail: -104, bristle: 0 } }, [14, 17, -24, -21]);
const DEATH_DOWN = wolf({ y: -27, torso: 0, head: -6, p: { snout: -4, jaw: 0, ear: 44, tail: -176, dead: 1, lie: 1, bristle: 0 } }, [25, 28, -7, -4]);

// Victory: he lifts his head and howls, one long note.
const VIC_A = wolf({ torso: 8, head: 80, p: { snout: 58, jaw: 0.45, ear: 14, tail: -118, bristle: 0 } });
const VIC_B = tweak(VIC_A, { head: 82, p: { snout: 64, jaw: 0.6, ear: 18 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'follower',
  name: 'Follower',
  dims: D,
  build,
  footprint: 1.9,
  anims: {
    idle: { loop: true, frames: cycle(6, 180, idle) },
    run: { loop: true, frames: cycle(8, 75, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SN_LOW, 1, 90),
        ...keys([
          [SN_LOW, 200],
          [SN_OPEN, 60],
          [SN_SHUT, 90, { hit: true }],
          [SN_HOLD, 180],
        ]),
        ...tween(D, SN_HOLD, IDLE, 2, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RD_GATHER, 1, 100),
        ...keys([
          [RD_GATHER, 260],
          [RD_LAUNCH, 90, { event: 'jump' }],
          [RD_FLY, 120],
          [RD_REACH, 110],
          [RD_BITE, 100, { hit: true }],
          [RD_DOWN, 130],
          [RD_BACK, 130],
          [RD_DOWN, 110],
          [RD_LET, 160],
        ]),
        ...tween(D, RD_LET, IDLE, 2, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: BACK - 3, torso: -3, head: 44 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_SAG, 0.5), 110],
        [DEATH_SAG, 240],
        [mid(DEATH_SAG, DEATH_DOWN, 0.6), 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -28 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VIC_A, 2, 120, ease.out),
        ...keys([
          [VIC_A, 240],
          [VIC_B, 700],
          [VIC_A, 200],
          [mid(VIC_A, IDLE, 0.5), 120],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** The head for an icon: both ears, scaled up. */
function iconHead(d: Draw, at0: V, snout: number, P: Record<string, number>, k: number) {
  const Hd = d.frame(at0, snout);
  ear(d, Hd, snout, P.ear ?? 0, 'F', 8, k);
  head(d, Hd, snout, P, 10, k, 0);
  ear(d, Hd, snout, P.ear ?? 0, 'N', 12, k);
}

const E = ACCENT;

/** A ragged tear across an icon (screen space, y down): a white stroke two pixels wide, wandering a little, pale at its ends. */
function iconTear(b: { set(x: number, y: number, c: RGBA): void }, x0: number, y0: number, x1: number, y1: number) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = Math.round(x0 + (x1 - x0) * t + (i % 5 === 2 ? 1 : 0)), y = Math.round(y0 + (y1 - y0) * t);
    const end = t < 0.15 || t > 0.85;
    b.set(x, y, end ? MAT.steel.ramp[4] : E.white);
    if (!end) b.set(x + 1, y, MAT.steel.ramp[4]);
  }
}

export const follower: ChampionArt = {
  char,
  iconBg: SD,
  icons: {
    snap: () =>
      compose(SD, glyph((d) => {
        iconHead(d, v(13, 20), -4, { jaw: 0.9, ear: 24 }, 1.55);
      }), (b) => {
        // where the jaws snap shut: a flash and chips (screen space, y down)
        for (const [x, y] of [[35, 22], [36, 19], [34, 26], [37, 24], [33, 18], [38, 21]] as const) b.set(x, y, E.white);
      }),
    rend: () => {
      const art = glyph((d) => iconHead(d, v(9, 15), -14, { jaw: 0, ear: 28 }, 1.35));
      // three ragged tears ripping down and back across the enemy's guard
      iconTear(art, 37, 5, 30, 25);
      iconTear(art, 33, 4, 26, 22);
      iconTear(art, 29, 6, 23, 19);
      return compose(SD, art);
    },
  },
};
