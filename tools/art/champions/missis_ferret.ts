// Missis Ferret (docs/DESIGN_DECISIONS.md section 90, Jakub's brief of
// 2026-11-07: "some big trained ferret", his name): an Elite Tank of the Azure
// Crown. A sable ferret the size of a pony, long and low: pale cream underfur
// with dark sable guard hairs along the back, dark legs and a dark tail, a
// cream face with the dark mask across the eyes, small round ears, a pink
// nose. The Crown's tunnellers dress her in a padded azure caparison over the
// back, trimmed white, its gold crown on the flank, a small steel plate along
// her snout and a dark leather collar with a brass bell under the throat. The
// silhouette is the long low body and the head carried high on a long neck.
// Nip and Worry darts in and bites; War Dance is a ferret's own war dance,
// hops and twists with the back arched. Her affinity (Bloom) sets nothing here
// (Jakub, 2026-10-11).
//
// The rig is the Follower's wolf (solveWolf in follower.ts) with a ferret's
// proportions: shorter legs, a longer body and neck. The shared pose's torso
// is the body's axis, its head the neck; armN / armF and legN / legF are the
// paws, IK targets on the ground; p.snout is the muzzle's direction, p.jaw
// opens the mouth, p.ear lays the ears back, p.tail is the tail's angle and
// p.arch bows the back up (the war dance).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, dir, Dims, Draw, ease, ik2, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 26,
  thigh: 11,
  shin: 11,
  ankleH: 3,
  footLen: 6,
  spine: 20,
  neck: 25,
  upperArm: 9,
  foreArm: 13,
  shoulderDrop: 0,
  shoulderN: 0,
  shoulderF: 0,
  hipN: 0,
  hipF: 0,
};

const CR = MAT.furCream, SB = MAT.furBrown, BK = MAT.furBlack, PK = MAT.earPink;
const CP = MAT.blue, WT = MAT.whiteCloth, GD = MAT.gold, ST = MAT.steel, DL = MAT.darkleather, BZ = MAT.bronze;

/** The body's centre stands this far behind the pivot (x of every pose). */
const BACK = -4;
/** The head's scale on the sprite. */
const HEAD = 1.4;
/** Leg bones: front (shoulder to elbow, elbow to wrist), hind (hip to stifle, stifle to hock). */
const UPPER = 7, LOWER = 10, THIGH = 9, GASKIN = 9.5;

interface Leg { root: V; mid: V; low: V; paw: V }
interface Ferret { B: (u: number, w: number) => V; withers: V; head: V; neck: number; fN: Leg; fF: Leg; hN: Leg; hF: Leg }

/** The skeleton from a pose: body frame B (u forward along the spine, w down toward the belly; arched by p.arch), the neck and the four legs. */
function solve(p: Pose): Ferret {
  const c = v(p.x, D.hipH + p.y);
  const ax = dir(p.torso), dn = dir(p.torso - 90);
  const arch = p.p.arch ?? 0;
  // the back bows up in the middle when arched, a ferret's hunch
  const B = (u: number, w: number) => {
    const bow = arch * 7 * Math.max(0, 1 - (u / 26) ** 2);
    return v(c.x + ax.x * u + dn.x * (w - bow), c.y + ax.y * u + dn.y * (w - bow));
  };
  const withers = B(D.spine, -2);
  const head = at(withers, p.head, D.neck);
  const target = (l: Pose['armN']) => ('ik' in l ? l.ik : v(0, 1.6));
  const lift = (paw: V) => Math.max(0, Math.min(1, (paw.y - 1.6) / 6));
  const lie = p.p.lie ?? 0;
  const front = (root: V, paw: V): Leg => {
    const k = lift(paw);
    const r = ik2(root, v(paw.x - 1 + k * 3.4 - lie * 4, paw.y + 4.2 - k * 1.2 - lie * 3), UPPER, LOWER, -1);
    return { root, mid: r.mid, low: r.end, paw };
  };
  const hind = (root: V, paw: V): Leg => {
    const k = lift(paw);
    const r = ik2(root, v(paw.x - 2.2 - k * 2.4 - lie * 7, paw.y + 8 - k * 1.4 - lie * 7), THIGH, GASKIN, 1);
    return { root, mid: r.mid, low: r.end, paw };
  };
  return {
    B, withers, head, neck: p.head,
    fN: front(B(15, 7.5), target(p.armN)),
    fF: front(B(16.4, 7), target(p.armF)),
    hN: hind(B(-21, 3), target(p.legN)),
    hF: hind(B(-19.6, 2.6), target(p.legF)),
  };
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const g = solve(s.pose);
  const snout = P.snout ?? -6;
  const Hd = d.frame(g.head, snout);

  // the far legs, darker, behind everything near
  hindLeg(d, g.hF, 'F', 10, -1);
  frontLeg(d, g.fF, 'F', 12, -1);
  tail(d, g, P.tail ?? -150, 20);
  ear(d, Hd, snout, P.ear ?? 0, 'F', 26, HEAD);
  // the body: cream underfur, the sable over the back, the near haunch and shoulder
  body(d, g, 30);
  sable(d, g, 30.1);
  hindLeg(d, g.hN, 'N', 30.2, 0, true, false);
  frontLeg(d, g.fN, 'N', 30.25, 0, true, false);
  // the azure caparison over the back, its white trim and gold crown
  caparison(d, g, 31);
  // the lower near legs before the body
  hindLeg(d, g.hN, 'N', 34, 0, false, true);
  frontLeg(d, g.fN, 'N', 36, 0, false, true);
  // the long neck, the collar and its bell, the head, the near ear
  neck(d, g, 40);
  collar(d, g, 41);
  head(d, Hd, snout, P, 44, HEAD, 0);
  ear(d, Hd, snout, P.ear ?? 0, 'N', 46, HEAD);
}

/** Guard hairs breaking up each shade. */
const fur = (_h: unknown, x: number, y: number) => ((x * 3 + y * 7) % 13 === 0 ? -1 : (x * 5 + y * 2) % 19 === 0 ? 1 : 0);

/** The long body, a tube from the rump to the chest. */
function body(d: Draw, g: Ferret, z: number) {
  const B = g.B;
  d.poly(
    { mat: CR, z, group: 'body', tex: fur },
    [B(-29, -1), B(-26, -6.4), B(-16, -8.0), B(-4, -8.4), B(8, -8.4), B(18, -8.4), B(24, -6.0), B(27, -1), B(27, 5), B(24, 10.6), B(17, 12.0), B(6, 11.6), B(-6, 11.2), B(-17, 11.6), B(-25, 9.6), B(-29.4, 4.2)],
    { kind: 'cyl', a: B(-29, 2), b: B(27, 2), r: 9, bevel: 1.2 },
  );
}

/** Dark sable guard hairs over the back and the haunches, thinning toward the belly. */
function sable(d: Draw, g: Ferret, z: number) {
  const B = g.B;
  d.poly(
    { mat: SB, z, group: 'sable', line: 'none', tex: fur },
    [B(-29, -0.6), B(-26, -6.6), B(-16, -8.2), B(-4, -8.6), B(8, -8.6), B(18, -8.6), B(22, -6.6), B(19, -1.0), B(12, 1.0), B(4, 0.4), B(-4, 1.6), B(-12, 1.0), B(-18, 4.4), B(-23, 7.6), B(-27, 6.0)],
    { kind: 'cyl', a: B(-29, 2), b: B(27, 2), r: 9, bevel: 1.2 },
  );
}

/**
 * The padded azure caparison over the middle of the back, hanging down the
 * flank: quilted in rows, a white trim along its lower edge and its ends, the
 * Crown's small gold crown on the flank.
 */
function caparison(d: Draw, g: Ferret, z: number) {
  const B = g.B;
  const top = [B(-14, -9.0), B(-6, -9.4), B(2, -9.4), B(10, -9.2)];
  const hem = [B(11.4, 4.4), B(6, 5.8), B(-2, 6.2), B(-10, 5.8), B(-15.4, 4.2)];
  d.poly(
    { mat: CP, z, group: 'cap', tex: (h) => (Math.sin(h.u * 26) > 0.86 ? -1 : 0) },
    [...top, ...hem],
    { kind: 'cyl', a: B(-14, -1), b: B(10, -1), r: 8, bevel: 1.2 },
  );
  d.ribbon({ mat: WT, z: z + 0.1, group: 'cap', line: 'soft' }, hem, [1.0, 1.0, 1.0, 1.0, 1.0]);
  d.ribbon({ mat: WT, z: z + 0.1, group: 'cap', line: 'soft' }, [top[3], hem[0]], [0.8, 0.9]);
  d.ribbon({ mat: WT, z: z + 0.1, group: 'cap', line: 'soft' }, [hem[4], top[0]], [0.9, 0.8]);
  crown(d, B(-2, 0), 31.2);
}

/** The Crown's small gold crown: three points over a band, upright, pixel by pixel. */
function crown(d: Draw, center: V, z: number) {
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const R = GD.ramp;
  const px: { p: V; c: RGBA }[] = [];
  for (const x of [-2, 0, 2]) px.push({ p: v(c.x + x, c.y - 2), c: R[4] });
  for (let x = -2; x <= 2; x++) px.push({ p: v(c.x + x, c.y - 1), c: R[4] }, { p: v(c.x + x, c.y), c: x < 1 ? R[3] : R[2] });
  d.pixels({ mat: GD, z, group: 'crest', line: 'none', outline: false }, px);
}

/** A front leg: a dark shoulder and a short foreleg to a small paw. */
function frontLeg(d: Draw, l: Leg, side: 'N' | 'F', z: number, shade: number, upper = true, lower = true) {
  const g = 'front' + side;
  if (upper) d.capsule({ mat: SB, z, group: g, shade, tex: fur }, l.root, l.mid, 5.4, 3.4);
  if (!lower) return;
  d.capsule({ mat: SB, z: z + 0.1, group: g, shade }, l.mid, l.low, 2.6, 2.2);
  d.capsule({ mat: BK, z: z + 0.2, group: g, shade }, l.low, l.paw, 2.0, 2.0);
  paw(d, l.paw, z + 0.3, g, shade);
}

/** A hind leg: a dark haunch, then a short shank, the hock and the paw. */
function hindLeg(d: Draw, l: Leg, side: 'N' | 'F', z: number, shade: number, upper = true, lower = true) {
  const g = 'hind' + side;
  if (upper) d.capsule({ mat: SB, z, group: g, shade, tex: fur }, l.root, l.mid, 7.0, 3.8);
  if (!lower) return;
  d.capsule({ mat: SB, z: z + 0.1, group: g, shade }, l.mid, l.low, 3.0, 2.0);
  d.capsule({ mat: BK, z: z + 0.2, group: g, shade }, l.low, l.paw, 1.9, 2.0);
  paw(d, l.paw, z + 0.3, g, shade);
}

/** A small dark paw, pointing forward. */
function paw(d: Draw, p: V, z: number, g: string, shade: number) {
  d.ellipse({ mat: BK, z, group: g, shade }, v(p.x + 1.2, p.y + 0.2), 2.8, 1.8, 0);
}

/** The tail: thick at the root, tapering, dark sable, carried low behind. */
function tail(d: Draw, g: Ferret, ang: number, z: number) {
  const p0 = g.B(-28, 0);
  const p1 = at(p0, ang, 6), p2 = at(p1, ang - 8, 6), p3 = at(p2, ang - 14, 5.5), p4 = at(p3, ang - 18, 4);
  d.ribbon({ mat: SB, z, group: 'tail', tex: fur }, [p0, p1, p2, p3, p4], [3.0, 3.0, 2.6, 2.0, 1.0]);
}

/** The long neck from the withers to the head: sable along the nape, cream at the throat. */
function neck(d: Draw, g: Ferret, z: number) {
  const a = g.neck;
  const f = d.frame(at(g.withers, a, -4), a);
  const L = D.neck + 3;
  d.poly(
    { mat: CR, z, group: 'neck', tex: fur },
    [f(-2, 7.2), f(L * 0.4, 6.0), f(L * 0.8, 5.0), f(L, 4.2), f(L, -4.0), f(L * 0.7, -5.0), f(L * 0.3, -6.4), f(-2, -7.8)],
    { kind: 'cyl', a: f(0, 0), b: f(L, 0), r: 7, bevel: 1.2 },
  );
  d.poly(
    { mat: SB, z: z + 0.1, group: 'neck', line: 'none', tex: fur },
    [f(-2, 7.0), f(L * 0.4, 5.8), f(L * 0.8, 4.8), f(L * 0.9, 2.4), f(L * 0.5, 2.4), f(0, 3.0)],
    { kind: 'cyl', a: f(0, 0), b: f(L, 0), r: 6 },
  );
}

/** A dark leather collar round the neck below the head, a brass bell hanging under the throat. */
function collar(d: Draw, g: Ferret, z: number) {
  const a = g.neck;
  const f = d.frame(at(g.withers, a, -4), a);
  const u = D.neck * 0.62;
  d.capsule({ mat: DL, z, group: 'collar' }, f(u + 1, 5.4), f(u - 1, -5.6), 1.3, 1.3);
  const hang = f(u - 1.2, -6.4);
  d.circle({ mat: BZ, z: z + 0.1, group: 'bell' }, v(hang.x, hang.y - 1.6), 1.9);
  d.pixels({ mat: BZ, z: z + 0.2, group: 'bell', line: 'none' }, [{ p: v(hang.x - 0.6, hang.y - 1.0), c: BZ.ramp[5] }, { p: v(hang.x, hang.y - 3.2), c: BZ.ramp[1] }]);
}

/**
 * The head in a frame along the muzzle (u forward, w up), scaled by k for the
 * icons: a rounded cream skull, a short blunt muzzle, the dark mask across the
 * eyes, a pink nose, a small steel plate along the top of the snout, the jaw
 * opening at p.jaw onto small white teeth.
 */
function head(d: Draw, Hd: (u: number, w: number) => V, snout: number, P: Record<string, number>, z: number, k: number, shade: number) {
  const H = (u: number, w: number) => Hd(u * k, w * k);
  const g = 'head' + Math.round(z);
  const jaw = P.jaw ?? 0;
  const th = -jaw * 0.6, hu = 0, hw = -2.0;
  const J = (u: number, w: number) => {
    const du = u - hu, dw = w - hw;
    return H(hu + du * Math.cos(th) - dw * Math.sin(th), hw + du * Math.sin(th) + dw * Math.cos(th));
  };
  if (jaw > 0.05) {
    d.poly({ mat: CR, z: z - 0.2, group: g + 'm', color: ACCENT.mouthRed, line: 'none' }, [H(0.6, -1.4), H(9.4, -1.2), J(9.0, -2.2), J(1.0, -2.6)]);
    d.poly({ mat: CR, z: z - 0.1, group: g + 'j', shade }, [J(0.2, -2.0), J(9.2, -2.2), J(9.0, -3.4), J(6, -4.2), J(1.6, -4.4)], { kind: 'bevel', w: 1.1 * k });
    const teeth: { p: V; c: RGBA }[] = [{ p: H(8.6, -1.6), c: ACCENT.white }, { p: H(6.8, -1.6), c: ACCENT.white }, { p: J(8.2, -2.4), c: ACCENT.white }];
    d.pixels({ mat: CR, z: z + 0.4, group: g + 'j' }, teeth);
  }
  // the skull, round and a little flat
  d.ellipse({ mat: CR, z, group: g, shade, tex: fur }, H(-1.6, 1.2), 6.4 * k, 5.2 * k, snout);
  // the muzzle: short and blunt
  d.poly(
    { mat: CR, z: z + 0.05, group: g, shade },
    [H(-0.4, 4.4), H(4, 3.6), H(7.6, 2.4), H(9.8, 1.0), H(10.0, -0.8), H(8.6, -1.8), H(4, -2.2), H(-0.6, -2.0)],
    { kind: 'dome', c: H(4, 0.8), r: 7 * k, bevel: 1 },
  );
  if (jaw <= 0.05) d.poly({ mat: CR, z: z + 0.04, group: g + 'j', shade }, [H(0.2, -2.0), H(8.6, -1.8), H(8, -3.0), H(4, -3.6), H(0.6, -3.4)], { kind: 'bevel', w: 1 * k });
  // the mask: a dark band from the cheek across the eye, fading to the cream of the muzzle
  d.poly(
    { mat: SB, z: z + 0.1, group: g, shade, line: 'none' },
    [H(-4.6, 2.2), H(-1.6, 3.4), H(2.6, 3.4), H(5.6, 2.6), H(6.4, 1.2), H(4.2, 0.6), H(1.2, 0.8), H(-2.2, 0.0), H(-4.8, 0.4)],
    { kind: 'bevel', w: 1 * k },
  );
  // the steel plate along the top of the snout, a rivet at its back
  d.poly({ mat: ST, z: z + 0.2, group: g + 'p' }, [H(3.4, 4.0), H(6.0, 3.4), H(8.2, 2.4), H(7.8, 1.8), H(5.4, 2.6), H(3.4, 3.0)], { kind: 'bevel', w: 0.9 * k });
  // the nose
  d.ellipse({ mat: PK, z: z + 0.3, group: g + 'n' }, H(9.6, 0.2), 1.3 * k, 1.1 * k, snout);
  const px: { p: V; c: RGBA }[] = [{ p: H(3.8, 3.6), c: ST.ramp[5] }];
  if (jaw <= 0.05) for (const u of [4.4, 6.0, 7.6]) px.push({ p: H(u, -1.9), c: CR.ramp[1] });
  // the eye in the mask: a bright bead, shut when she is down
  if (P.dead) px.push({ p: H(3.4, 1.8), c: BK.ramp[1] }, { p: H(4.2, 1.8), c: BK.ramp[1] });
  else px.push({ p: H(3.8, 1.9), c: INK.eye }, { p: H(4.4, 2.3), c: ACCENT.white });
  d.pixels({ mat: CR, z: z + 0.35, group: g }, px);
}

/** A small round ear at the back of the skull, cream with a pink inside. */
function ear(d: Draw, Hd: (u: number, w: number) => V, snout: number, back: number, side: 'N' | 'F', z: number, k: number) {
  const root = side === 'N' ? Hd(-4.6 * k, 4.0 * k) : Hd(-3.0 * k, 4.6 * k);
  const a = snout + 110 + back + (side === 'F' ? -12 : 0);
  const c = at(root, a, 1.8 * k);
  d.ellipse({ mat: CR, z, group: 'ear' + side, shade: side === 'F' ? -1 : 0 }, c, 2.4 * k, 2.0 * k, a);
  if (side === 'N') d.ellipse({ mat: PK, z: z + 0.1, group: 'ear' + side, line: 'none', shade: -1 }, at(c, a - 160, 0.4 * k), 1.2 * k, 1.0 * k, a);
}

// ---------------------------------------------------------------------------
// Poses & animations (paws are IK targets on the ground; x is the body behind the pivot)
// ---------------------------------------------------------------------------

/** A pose with the paws given as [near front, far front, near hind, far hind] x positions on the ground. */
const fer = (o: Partial<Pose> & { p?: Record<string, number> }, paws: [number, number, number, number] = [13, 16, -29, -26], lift: [number, number, number, number] = [0, 0, 0, 0]) =>
  pose({
    ...o,
    x: BACK + (o.x ?? 0),
    armN: { ik: v(paws[0], 1.6 + lift[0]) },
    armF: { ik: v(paws[1], 1.6 + lift[1]) },
    legN: { ik: v(paws[2], 1.6 + lift[2]) },
    legF: { ik: v(paws[3], 1.6 + lift[3]) },
  });

// At rest: the head up on the long neck, alert.
const IDLE: Pose = fer({ torso: 2, head: 62, p: { snout: -6, jaw: 0, ear: 0, tail: -152, arch: 0 } });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return fer({ y: -b, torso: 2, head: 62 - b, p: { snout: -6 + b * 2, jaw: 0, ear: Math.round(Math.sin(a) * 2), tail: -152 + Math.round(Math.sin(a) * 3), arch: 0 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  // a ferret's bounding run: the front pair together, then the hind pair, the back bowing between
  const paw = (base: number, ph: number, reach: number, lift: number): [number, number] => {
    const s = Math.sin(ph);
    return [base - reach * Math.cos(ph), s > 0 ? lift * s : 0];
  };
  const [fNx, fNy] = paw(14, a, 8, 6), [fFx, fFy] = paw(16, a + 0.3, 8, 6);
  const [hNx, hNy] = paw(-28, a + Math.PI, 8, 5), [hFx, hFy] = paw(-26, a + Math.PI + 0.3, 8, 5);
  const bob = Math.round(Math.sin(2 * a) * 1.5);
  return fer(
    { y: bob - 1, torso: Math.round(Math.sin(a + 0.6) * 4), head: 40 + Math.round(Math.sin(a) * 3), p: { snout: -6, jaw: 0, ear: 20, tail: -172, arch: Math.max(0, Math.cos(a)) * 0.7 } },
    [fNx, fFx, hNx, hFx],
    [fNy, fFy, hNy, hFy],
  );
}

// Nip and Worry: she drops her head low, darts in with the jaws open, bites and shakes it.
const NP_LOW = fer({ x: -3, y: -3, torso: -2, head: 30, p: { snout: -14, jaw: 0.1, ear: 24, tail: -168, arch: 0.4 } }, [12, 15, -30, -27]);
const NP_OPEN = fer({ x: 2, y: -2, torso: -4, head: 18, p: { snout: 0, jaw: 1, ear: 30, tail: -176, arch: 0.1 } }, [18, 21, -27, -24]);
const NP_SHUT = fer({ x: 5, y: -3, torso: -5, head: 16, p: { snout: -6, jaw: 0, ear: 26, tail: -174, arch: 0 } }, [20, 23, -26, -23]);
const NP_SHAKE = tweak(NP_SHUT, { head: 22, p: { snout: -22 } });
const NP_HOLD = fer({ x: 3, y: -2, torso: -3, head: 26, p: { snout: -10, jaw: 0.1, ear: 18, tail: -166, arch: 0.2 } }, [19, 22, -26, -23]);

// War Dance: she arches her back, hops up, twists round and back, mouth open, chattering.
const WD_ARCH = fer({ x: -1, y: -2, torso: 0, head: 44, p: { snout: -16, jaw: 0.5, ear: 20, tail: -120, arch: 1 } }, [12, 15, -27, -24]);
const WD_HOP = fer({ x: 1, y: 7, torso: 8, head: 52, p: { snout: -8, jaw: 0.8, ear: 26, tail: -100, arch: 1 } }, [14, 17, -26, -23], [4, 3, 2, 1]);
const WD_TWIST = fer({ x: 0, y: 4, torso: -4, head: 36, p: { snout: -26, jaw: 0.7, ear: 30, tail: -90, arch: 1, turn: 1 } }, [11, 14, -27, -24], [2, 2, 3, 2]);
const WD_LAND = fer({ x: 0, y: -3, torso: 0, head: 46, p: { snout: -10, jaw: 0.9, ear: 18, tail: -116, arch: 0.9 } }, [13, 16, -27, -24]);

const HURT = fer({ x: -4, y: -1, torso: -3, head: 48, p: { snout: -20, jaw: 0.4, ear: 40, tail: -130, arch: 0.3 } }, [11, 14, -31, -28]);
const DEATH_SAG = fer({ x: -2, y: -5, torso: -4, head: 30, p: { snout: -20, jaw: 0.1, ear: 30, tail: -150, arch: 0 } }, [17, 20, -25, -22]);
const DEATH_DOWN = fer({ y: -6, torso: 0, head: -2, p: { snout: -4, jaw: 0, ear: 40, tail: -178, dead: 1, lie: 1, arch: 0 } }, [27, 30, -10, -7]);

// Victory: she rears up on the hind legs, head high, chattering.
const VIC_A = fer({ x: -2, y: 4, torso: 34, head: 80, p: { snout: 20, jaw: 0.6, ear: 10, tail: -150, arch: 0 } }, [8, 11, -22, -19], [8, 7, 0, 0]);
const VIC_B = tweak(VIC_A, { head: 84, p: { snout: 28, jaw: 0.2 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'missis_ferret',
  name: 'Missis Ferret',
  dims: D,
  build,
  footprint: 2.0,
  anims: {
    idle: { loop: true, frames: cycle(6, 180, idle) },
    run: { loop: true, frames: cycle(8, 72, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, NP_LOW, 1, 90),
        ...keys([
          [NP_LOW, 180],
          [NP_OPEN, 60],
          [NP_SHUT, 90, { hit: true }],
          [NP_SHAKE, 90],
          [NP_SHUT, 90],
          [NP_HOLD, 150],
        ]),
        ...tween(D, NP_HOLD, IDLE, 2, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, WD_ARCH, 2, 100, ease.out),
        ...keys([
          [WD_ARCH, 160],
          [WD_HOP, 110, { event: 'cast' }],
          [WD_TWIST, 120],
          [WD_LAND, 100],
          [WD_HOP, 110],
          [WD_TWIST, 120],
          [WD_LAND, 140, { hit: true }],
          [WD_ARCH, 200],
        ]),
        ...tween(D, WD_ARCH, IDLE, 2, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: BACK - 3, torso: -2, head: 52 }), 110],
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
        [tweak(DEATH_DOWN, { y: -6.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VIC_A, 2, 120, ease.out),
        ...keys([
          [VIC_A, 200],
          [VIC_B, 160],
          [VIC_A, 160],
          [VIC_B, 400],
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

export const missisFerret: ChampionArt = {
  char,
  iconBg: CP,
  icons: {
    nip_and_worry: () =>
      compose(CP, glyph((d) => {
        iconHead(d, v(12, 20), -6, { jaw: 0.9, ear: 20 }, 2.0);
      }), (b) => {
        // where the teeth meet: a flash and chips (screen space, y down)
        for (const [x, y] of [[35, 21], [36, 18], [34, 25], [37, 23], [33, 17], [38, 20]] as const) b.set(x, y, E.white);
      }),
    war_dance: () =>
      compose(CP, glyph((d) => {
        iconHead(d, v(17, 18), 14, { jaw: 0.7, ear: 24 }, 1.9);
      }), (b) => {
        // the chatter: little marks round her head, and the Taunt's red
        for (const [x, y] of [[6, 8], [8, 6], [31, 6], [33, 8], [4, 14], [35, 13]] as const) b.set(x, y, E.white);
        for (const [x, y] of [[19, 3], [20, 3], [19, 4], [20, 4], [19, 6], [20, 6]] as const) b.set(x, y, E.redHot);
      }),
    slippery: () =>
      compose(CP, glyph((d) => {
        iconHead(d, v(12, 20), 0, { jaw: 0, ear: 10 }, 1.9);
      })),
  },
};
