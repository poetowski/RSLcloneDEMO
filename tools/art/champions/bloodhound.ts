// The Bloodhound (docs/DESIGN_DECISIONS.md section 16, Jakub's brief of
// 2026-10-12): a Common of the Sanguine Dominion, Tank, the first champion on
// four legs: a dog, the Dominion's insignia on his collar. So he is a big
// black-and-tan bloodhound, waist-high to the others: tan on the head, the
// chest and the legs, black over the back, the ears and the tail; the long
// hanging ears and the loose skin of the face and throat (the silhouette
// feature, with the long body and the high tail); a black leather collar with
// the Dominion's hexagon, red, hanging at the throat. What the brief leaves
// open is a first take: the breed's look, his size, the colours of his coat,
// the collar and the tag. His affinity sets nothing here (affinities are
// abstract, Jakub, 2026-10-11): his bite lands as two white rows of teeth and
// a flash, his bay as rings of sound (fx/sanguine_dominion.ts).
//
// The rig: the shared pose drives a four-legged body of its own (solveDog).
// The pose's torso is the body's axis (0 = level), its head the neck (from the
// withers to the centre of the head); armN / armF are the front paws and
// legN / legF the hind paws, IK targets on the ground; p.snout is the muzzle's
// direction, p.jaw opens the mouth (0-1), p.ear swings the ears, p.tail is the
// tail's angle. Dims are set so the shared solver's head is this head (the
// portrait is cut around it), and the body stands a little behind the pivot so
// that the pivot, where effects and hits land, is under his chest.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, dir, Dims, Draw, ease, ik2, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 38,
  thigh: 14,
  shin: 13,
  ankleH: 3,
  footLen: 6,
  spine: 19,
  neck: 25,
  upperArm: 10,
  foreArm: 16,
  shoulderDrop: 0,
  shoulderN: 0,
  shoulderF: 0,
  hipN: 0,
  hipF: 0,
};

const TN = MAT.furTan, BK = MAT.furBlack, CL = MAT.darkleather, CP = MAT.crimsonPlate;

/** The body's centre stands this far behind the pivot (x of every pose). */
const BACK = -6;
/** Leg bones: front (shoulder to elbow, elbow to wrist), hind (hip to stifle, stifle to hock). */
const UPPER = 10, LOWER = 16, THIGH = 14, GASKIN = 13;

interface Leg { root: V; mid: V; low: V; paw: V }
interface Dog { B: (u: number, w: number) => V; withers: V; head: V; neck: number; fN: Leg; fF: Leg; hN: Leg; hF: Leg }

/** The dog's skeleton from a pose: body frame B (u forward along the spine, w down toward the belly), the neck and the four legs. */
function solveDog(p: Pose): Dog {
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
    const r = ik2(root, v(paw.x - 1.4 + k * 4.2 - lie * 4.6, paw.y + 4.8 - k * 1.2 - lie * 3.4), UPPER, LOWER, -1);
    return { root, mid: r.mid, low: r.end, paw };
  };
  const hind = (root: V, paw: V): Leg => {
    const k = lift(paw);
    const r = ik2(root, v(paw.x - 2.4 - k * 2.8 - lie * 8.6, paw.y + 10.5 - k * 1.5 - lie * 9.2), THIGH, GASKIN, 1);
    return { root, mid: r.mid, low: r.end, paw };
  };
  return {
    B, withers, head, neck: p.head,
    fN: front(B(12, 8), target(p.armN)),
    fF: front(B(13.5, 7.4), target(p.armF)),
    hN: hind(B(-17, 3), target(p.legN)),
    hF: hind(B(-15.4, 2.4), target(p.legF)),
  };
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const g = solveDog(s.pose);
  const snout = P.snout ?? -14;
  const Hd = d.frame(g.head, snout);

  // the tail rises from the rump, behind the body
  tail(d, g, P.tail ?? 118, 4);
  // the far legs, darker, behind everything near
  hindLeg(d, g.hF, 'F', 10, -1);
  frontLeg(d, g.fF, 'F', 12, -1);
  // the far ear hangs behind the neck
  ear(d, Hd, snout, P.ear ?? 0, 'F', 26, 1);
  // the body: tan, the near haunch and shoulder over it, the black saddle over all three
  body(d, g, 30);
  hindLeg(d, g.hN, 'N', 30.05, 0, true, false);
  frontLeg(d, g.fN, 'N', 30.06, 0, true, false);
  saddle(d, g, 30.2);
  // the lower near legs before the body
  hindLeg(d, g.hN, 'N', 34, 0, false, true);
  frontLeg(d, g.fN, 'N', 36, 0, false, true);
  // neck and collar, the head, the near ear over its side, the tag at the throat
  const throat = neck(d, g, 40);
  head(d, Hd, snout, P, 44, 1, 0);
  ear(d, Hd, snout, P.ear ?? 0, 'N', 46, 1);
  tag(d, throat, 47);
}

/** A few coarser hairs breaking up the coat. */
const fur = (_h: unknown, x: number, y: number) => ((x * 3 + y * 7) % 13 === 0 ? -1 : 0);

function body(d: Draw, g: Dog, z: number) {
  const B = g.B;
  d.poly(
    { mat: TN, z, group: 'body', tex: fur },
    [B(-24, -3), B(-20, -5.6), B(-8, -6.4), B(6, -6.8), B(15, -7.4), B(21, -5), B(26, 1), B(25.5, 7), B(21, 12.5), B(13, 15), B(5, 14.5), B(-3, 11.4), B(-10, 10.2), B(-17, 11.6), B(-23, 8.4), B(-27, 2)],
    { kind: 'cyl', a: B(-25, 3), b: B(25, 3), r: 12.5, bevel: 1.2 },
  );
}

/** The black saddle over the back, from the withers to the rump, its lower edge a little ragged. */
function saddle(d: Draw, g: Dog, z: number) {
  const B = g.B;
  d.poly(
    { mat: BK, z, group: 'saddle', line: 'soft', tex: fur },
    [B(-24.6, -2.7), B(-20, -5.8), B(-8, -6.6), B(6, -7.0), B(15, -7.6), B(18.4, -4.8), B(15, 0.4), B(9, 2.0), B(3, 1.2), B(-3, 2.6), B(-9, 2.0), B(-15, 3.0), B(-20, 1.8), B(-24.6, 1.2)],
    { kind: 'cyl', a: B(-25, 3), b: B(25, 3), r: 12.5, bevel: 1.2 },
  );
}

/** A front leg: shoulder to elbow (`upper`), then the foreleg, the pastern and the paw (`lower`). */
function frontLeg(d: Draw, l: Leg, side: 'N' | 'F', z: number, shade: number, upper = true, lower = true) {
  const g = 'front' + side;
  if (upper) d.capsule({ mat: TN, z, group: g, shade }, l.root, l.mid, 5.4, 4.0);
  if (!lower) return;
  d.capsule({ mat: TN, z: z + 0.1, group: g, shade }, l.mid, l.low, 3.4, 2.8);
  d.capsule({ mat: TN, z: z + 0.2, group: g, shade }, l.low, l.paw, 2.6, 2.7);
  paw(d, l.paw, z + 0.3, g, shade);
}

/** A hind leg: the haunch (`upper`), then the gaskin, the hock and the paw (`lower`). */
function hindLeg(d: Draw, l: Leg, side: 'N' | 'F', z: number, shade: number, upper = true, lower = true) {
  const g = 'hind' + side;
  if (upper) d.capsule({ mat: TN, z, group: g, shade }, l.root, l.mid, 7.4, 4.8);
  if (!lower) return;
  d.capsule({ mat: TN, z: z + 0.1, group: g, shade }, l.mid, l.low, 4.2, 2.8);
  d.circle({ mat: TN, z: z + 0.15, group: g, shade }, l.low, 2.8);
  d.capsule({ mat: TN, z: z + 0.2, group: g, shade }, l.low, l.paw, 2.5, 2.6);
  paw(d, l.paw, z + 0.3, g, shade);
}

/** A paw: a rounded pad pointing forward, two dark lines between the toes. */
function paw(d: Draw, p: V, z: number, g: string, shade: number) {
  d.ellipse({ mat: TN, z, group: g, shade }, v(p.x + 1.6, p.y + 0.2), 3.8, 2.3, 0);
  d.pixels({ mat: TN, z: z + 0.05, group: g }, [{ p: v(p.x + 2.6, p.y - 0.6), c: TN.ramp[1] }, { p: v(p.x + 4.0, p.y - 0.6), c: TN.ramp[1] }]);
}

/** The tail: three segments curving up from the rump, black to a tan tip. */
function tail(d: Draw, g: Dog, ang: number, z: number) {
  const p0 = g.B(-23.6, -2.8);
  const p1 = at(p0, ang, 7), p2 = at(p1, ang - 16, 7), p3 = at(p2, ang - 30, 6);
  d.ribbon({ mat: BK, z, group: 'tail' }, [p0, p1, p2, p3], [2.6, 2.1, 1.6, 0.9]);
  d.ribbon({ mat: TN, z: z + 0.1, group: 'tail', line: 'none' }, [at(p2, ang - 16, 3.2), p3], [1.2, 0.8]);
}

/** The neck from the withers to the head, the loose skin of the throat hanging under it, black along the nape; returns the collar's throat point. */
function neck(d: Draw, g: Dog, z: number): V {
  const a = g.neck;
  const f = d.frame(at(g.withers, a, -4), a);
  const L = D.neck + 4;
  // w > 0 is the nape, w < 0 the throat
  d.poly(
    { mat: TN, z, group: 'neck', tex: fur },
    [f(0, 7.4), f(L * 0.5, 5.6), f(L, 4.4), f(L, -3.4), f(L * 0.8, -6.6), f(L * 0.55, -8.2), f(L * 0.25, -9.0), f(0, -10.2)],
    { kind: 'cyl', a: f(0, 0), b: f(L, 0), r: 7.5, bevel: 1.2 },
  );
  d.poly(
    { mat: BK, z: z + 0.1, group: 'neck', line: 'none', tex: fur },
    [f(0, 7.4), f(L * 0.5, 5.6), f(L * 0.86, 4.6), f(L * 0.8, 2.2), f(L * 0.42, 1.4), f(0, 2.6)],
    { kind: 'cyl', a: f(0, 0), b: f(L, 0), r: 7.5 },
  );
  // the collar: black leather round the neck
  const top = f(L * 0.3, 6.6), bot = f(L * 0.36, -8.6);
  d.capsule({ mat: CL, z: z + 0.2, group: 'collar', shade: -1 }, top, bot, 1.3, 1.3);
  return bot;
}

/** The Dominion's hexagon, red, hanging from the collar at the throat. */
function tag(d: Draw, at0: V, z: number) {
  const c = v(Math.floor(at0.x) + 0.5, Math.floor(at0.y - 3.2) + 0.5);
  const R = CP.ramp;
  const px: { p: V; c: RGBA }[] = [];
  // the ring to the collar
  px.push({ p: v(c.x, c.y + 2), c: R[1] });
  // a hexagon, flat at top and bottom: rows of 3, 5, 5, 3, edged dark
  const rows: [number, number][] = [[1, 1], [0, 2], [-1, 2], [-2, 1]];
  for (const [y, h] of rows) for (let x = -h; x <= h; x++) px.push({ p: v(c.x + x, c.y + y), c: Math.abs(x) === h ? R[1] : y >= 0 && x < 1 ? R[4] : R[3] });
  px.push({ p: v(c.x - 1, c.y + 1), c: R[5] });
  d.pixels({ mat: CP, z, group: 'tag' }, px);
}

/**
 * The head in a frame along the muzzle (u forward, w up), scaled by k for the
 * icons: a long skull and a deep muzzle, loose flews hanging under it, the jaw
 * opening at p.jaw, a big black nose, a deep-set eye with its red haw and the
 * folds of loose skin.
 */
function head(d: Draw, Hd: (u: number, w: number) => V, snout: number, P: Record<string, number>, z: number, k: number, shade: number) {
  const H = (u: number, w: number) => Hd(u * k, w * k);
  const g = 'head' + Math.round(z);
  const jaw = P.jaw ?? 0;
  // the lower jaw turns down round its hinge
  const th = -jaw * 0.52, hu = 1.2, hw = -2.4;
  const J = (u: number, w: number) => {
    const du = u - hu, dw = w - hw;
    return H(hu + du * Math.cos(th) - dw * Math.sin(th), hw + du * Math.sin(th) + dw * Math.cos(th));
  };
  if (jaw > 0.05) {
    // the mouth open: dark inside, the tongue, the lower jaw with its teeth
    d.poly({ mat: TN, z: z - 0.2, group: g + 'm', color: ACCENT.mouthRed, line: 'none' }, [H(1.4, -2.0), H(12.4, -2.4), J(12.2, -3.2), J(2, -3.4)]);
    d.poly({ mat: TN, z: z - 0.15, group: g + 'm', color: ACCENT.lipRose, line: 'none' }, [J(3, -3.0), J(9.6, -2.8), J(10.4, -3.8), J(4, -4.4)]);
    d.poly({ mat: TN, z: z - 0.1, group: g + 'j', shade }, [J(1.0, -2.6), J(12.2, -3.2), J(12.4, -4.6), J(9.6, -6.0), J(2.6, -5.6)], { kind: 'bevel', w: 1.2 * k });
    d.pixels({ mat: TN, z: z + 0.4, group: g + 'j' }, [
      { p: H(12.0, -2.8), c: ACCENT.white }, { p: H(10.2, -2.9), c: ACCENT.white },
      { p: J(11.6, -2.6), c: ACCENT.white }, { p: J(9.8, -2.6), c: ACCENT.white },
    ]);
  }
  // skull and muzzle
  d.ellipse({ mat: TN, z, group: g, shade, tex: fur }, H(-1.6, 1.2), 6.6 * k, 6.0 * k, snout);
  d.poly(
    { mat: TN, z: z + 0.05, group: g, shade },
    [H(0.6, 5.2), H(6, 4.4), H(10.5, 3.6), H(13.2, 2.8), H(14.2, 0.8), H(14.0, -2.4), H(12.2, -3.4), H(6, -3.6), H(0, -3.0)],
    { kind: 'dome', c: H(5, 1.2), r: 9 * k, bevel: 1 },
  );
  // the flews: loose lips hanging below the muzzle, darker; lifted with an open mouth
  const drop = 1 - Math.min(1, jaw * 1.4);
  d.poly(
    { mat: TN, z: z + 0.1, group: g + 'f', shade: shade - 1 },
    [H(14.0, -1.8), H(13.6, -3.0 - 1.6 * drop), H(11.6, -3.8 - 2.6 * drop), H(7.8, -3.8 - 3.8 * drop), H(4.0, -3.4 - 3.2 * drop), H(1.6, -2.6), H(7, -2.6)],
    { kind: 'bevel', w: 1.1 * k },
  );
  // the nose
  d.ellipse({ mat: BK, z: z + 0.3, group: g + 'n' }, H(13.6, 1.4), 2.2 * k, 1.8 * k, snout);
  const px: { p: V; c: RGBA }[] = [{ p: H(14.0, 2.2), c: BK.ramp[5] }];
  // the eye, deep-set under a heavy fold, its red haw showing; closed when he is down
  if (P.dead) px.push({ p: H(4.0, 1.4), c: TN.ramp[1] }, { p: H(5.0, 1.3), c: TN.ramp[1] });
  else px.push({ p: H(4.4, 1.6), c: INK.eye }, { p: H(5.2, 1.6), c: INK.eye }, { p: H(4.6, 0.8), c: ACCENT.mouthRed }, { p: H(5.4, 0.9), c: ACCENT.mouthRed }, { p: H(3.6, 1.8), c: TN.ramp[1] }, { p: H(4.6, 2.4), c: TN.ramp[4] });
  // folds of loose skin on the brow and the cheek
  for (const [u, w] of [[3.0, 2.8], [4.2, 2.6], [5.4, 2.6], [1.6, 4.0], [2.8, 4.2], [4.0, 4.0], [0.6, 2.4], [1.2, -0.4], [2.0, -1.2], [3.0, -1.8], [4.2, -2.0], [5.6, 0.2], [6.4, -0.6]] as const) px.push({ p: H(u, w), c: TN.ramp[2] });
  d.pixels({ mat: TN, z: z + 0.35, group: g }, px);
}

/** A long ear hanging from the back of the skull, black, swinging with p.ear; the near one over the head, the far one behind. */
function ear(d: Draw, Hd: (u: number, w: number) => V, snout: number, swing: number, side: 'N' | 'F', z: number, k: number) {
  const root = side === 'N' ? Hd(-2.4 * k, 3.0 * k) : Hd(-1.0 * k, 3.6 * k);
  const a = -96 + swing + (snout + 14) * 0.35 + (side === 'F' ? 6 : 0);
  const E = d.frame(root, a);
  const L = (side === 'N' ? 15.6 : 14.4) * k;
  d.poly(
    { mat: BK, z, group: 'ear' + side, shade: side === 'F' ? -1 : 0, line: 'soft', tex: fur },
    [E(-1 * k, -2.2 * k), E(L * 0.3, -3.0 * k), E(L * 0.7, -3.0 * k), E(L * 0.95, -2.0 * k), E(L, 0), E(L * 0.94, 2.3 * k), E(L * 0.6, 3.0 * k), E(L * 0.2, 2.6 * k), E(-1 * k, 1.6 * k)],
    { kind: 'cyl', a: E(0, 0), b: E(L, 0), r: 3.2 * k, bevel: 0.8 },
  );
  // the fold down the ear
  if (side === 'N') d.line({ mat: BK, z: z + 0.1, group: 'ear' + side, line: 'none' }, E(L * 0.25, 0.6 * k), E(L * 0.8, 0.9 * k), BK.ramp[1]);
}

// ---------------------------------------------------------------------------
// Poses & animations (paws are IK targets on the ground; x is the body behind the pivot)
// ---------------------------------------------------------------------------

/** A pose with the paws given as [near front, far front, near hind, far hind] x positions on the ground. */
const dog = (o: Partial<Pose> & { p?: Record<string, number> }, paws: [number, number, number, number] = [12, 15, -26, -23], lift: [number, number, number, number] = [0, 0, 0, 0]) =>
  pose({
    ...o,
    x: BACK + (o.x ?? 0),
    armN: { ik: v(paws[0], 1.6 + lift[0]) },
    armF: { ik: v(paws[1], 1.6 + lift[1]) },
    legN: { ik: v(paws[2], 1.6 + lift[2]) },
    legF: { ik: v(paws[3], 1.6 + lift[3]) },
  });

const IDLE: Pose = dog({ torso: 1, head: 62, p: { snout: -14, jaw: 0, ear: 0, tail: 118 } });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return dog({ y: -b, torso: 1, head: 62 - b, p: { snout: -14 + b, jaw: 0, ear: Math.round(Math.sin(a) * 3), tail: 118 + Math.round(Math.sin(a) * 9) } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  // a gallop: front pair, then hind pair, each a little out of step with its partner
  const paw = (base: number, ph: number, reach: number, lift: number): [number, number] => {
    const s = Math.sin(ph);
    return [base - reach * Math.cos(ph), s > 0 ? lift * s : 0];
  };
  const [fNx, fNy] = paw(13, a, 9, 7), [fFx, fFy] = paw(15, a + 0.7, 9, 7);
  const [hNx, hNy] = paw(-25, a + Math.PI, 9, 6), [hFx, hFy] = paw(-23, a + Math.PI + 0.7, 9, 6);
  const bob = Math.round(Math.sin(2 * a) * 1.5);
  return dog(
    { y: bob - 1, torso: Math.round(Math.sin(a + 0.6) * 3), head: 52 + Math.round(Math.sin(a) * 3), p: { snout: -10, jaw: 0.25, ear: -20 + Math.round(Math.sin(a) * 6), tail: 140 + Math.round(Math.sin(a) * 6) } },
    [fNx, fFx, hNx, hFx],
    [fNy, fFy, hNy, hFy],
  );
}

// Bite: he gathers, lunges with the jaws wide and snaps them shut on the enemy.
// The target stands 38 px ahead: the jaws close at its chest, the head dipping forward and down.
const BT_COIL = dog({ x: -4, y: -3, torso: -2, head: 52, p: { snout: -22, jaw: 0.25, ear: 6, tail: 104 } }, [11, 14, -27, -24]);
const BT_OPEN = dog({ x: -1, y: -2, torso: -2, head: 40, p: { snout: 2, jaw: 1, ear: -20, tail: 126 } }, [14, 17, -25, -22]);
const BT_SNAP = dog({ y: -3, torso: -4, head: 34, p: { snout: -10, jaw: 0.05, ear: -28, tail: 132 } }, [16, 19, -24, -21]);
const BT_HOLD = dog({ y: -3, torso: -4, head: 36, p: { snout: -16, jaw: 0.15, ear: -14, tail: 126 } }, [16, 19, -24, -21]);

// Bay: he draws breath with the head low, then throws it up and bays.
const BY_DRAW = dog({ x: -1, y: -2, torso: -2, head: 46, p: { snout: -26, jaw: 0, ear: 6, tail: 110 } });
const BY_CALL = dog({ y: 1, torso: 6, head: 80, p: { snout: 34, jaw: 0.85, ear: -26, tail: 128 } }, [13, 16, -26, -23]);

const HURT = dog({ x: -4, y: -1, torso: -4, head: 44, p: { snout: -26, jaw: 0.3, ear: 14, tail: 84 } }, [11, 14, -27, -24]);
const DEATH_SAG = dog({ x: -2, y: -10, torso: -6, head: 36, p: { snout: -20, jaw: 0.1, ear: 10, tail: 92 } }, [16, 19, -24, -21]);
const DEATH_DOWN = dog({ y: -24, torso: 0, head: -8, p: { snout: -4, jaw: 0, ear: 18, tail: 176, dead: 1, lie: 1 } }, [26, 29, -8, -5]);

// Victory: a glad bay, the tail wagging.
const VIC_A = dog({ torso: 4, head: 74, p: { snout: 22, jaw: 0.7, ear: -16, tail: 100 } });
const VIC_B = tweak(VIC_A, { p: { tail: 132 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'bloodhound',
  name: 'Bloodhound',
  dims: D,
  build,
  footprint: 1.9,
  anims: {
    idle: { loop: true, frames: cycle(6, 170, idle) },
    run: { loop: true, frames: cycle(8, 75, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, BT_COIL, 1, 90),
        ...keys([
          [BT_COIL, 180],
          [BT_OPEN, 60],
          [BT_SNAP, 80, { hit: true }],
          [BT_HOLD, 200],
        ]),
        ...tween(D, BT_HOLD, IDLE, 2, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, BY_DRAW, 1, 100),
        ...keys([
          [BY_DRAW, 220],
          [mid(BY_DRAW, BY_CALL, 0.6), 60],
          [BY_CALL, 140, { hit: true }],
          [tweak(BY_CALL, { p: { jaw: 1, ear: -32, snout: 38 } }), 160],
          [tweak(BY_CALL, { p: { jaw: 0.75, ear: -24 } }), 260],
        ]),
        ...tween(D, BY_CALL, IDLE, 2, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: BACK - 3, torso: -3, head: 48 }), 110],
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
        [tweak(DEATH_DOWN, { y: -25 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VIC_A, 2, 100, ease.out),
        ...keys([
          [VIC_B, 140],
          [VIC_A, 140],
          [VIC_B, 140],
          [VIC_A, 300],
          [mid(VIC_A, IDLE, 0.5), 110],
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

export const bloodhound: ChampionArt = {
  char,
  iconBg: TN,
  icons: {
    bite: () =>
      compose(TN, glyph((d) => {
        iconHead(d, v(12, 21), -8, { jaw: 0.8, ear: -10 }, 1.55);
      }), (b) => {
        // where the jaws close: a flash and chips (screen space, y down)
        for (const [x, y, c] of [[35, 24, E.white], [36, 21, E.white], [34, 28, E.white], [37, 26, E.white], [33, 20, E.white], [38, 23, E.white]] as const) b.set(x, y, c);
      }),
    bay: () => {
      const art = glyph((d) => iconHead(d, v(13, 15), 40, { jaw: 0.9, ear: -24 }, 1.35));
      // rings of sound rising from the open mouth, and the Taunt it calls down: a gold mark
      for (const [r, c] of [[6, E.white], [10, E.white], [14, MAT.steel.ramp[4]]] as const) {
        for (let deg = -80; deg <= 0; deg += 4) {
          const t = (deg * Math.PI) / 180;
          art.set(Math.round(25 + Math.cos(t) * r), Math.round(14 + Math.sin(t) * r), c);
        }
      }
      for (const [x, y] of [[6, 4], [6, 5], [6, 6], [6, 8]]) art.set(x, y, E.goldHot);
      for (const [x, y] of [[7, 4], [7, 5], [7, 6], [7, 8]]) art.set(x, y, E.chiGold);
      return compose(TN, art);
    },
  },
};
