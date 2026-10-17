// The Black Rhino (docs/DESIGN_DECISIONS.md section 26, Jakub's proposal of
// 2026-10-17): an Elite of the Sanguine Dominion, Tank: a bulky, furry black
// bull with long prosthetic tusks made to raise its damage, a red X painted on
// its back by its master. So he is a great black bull, low and massive: a
// shoulder hump under a shaggy mane that runs down his neck, his chest and the
// tops of his forelegs, the hindquarters sleeker; his own horns sawn to stumps
// and capped in iron, and in their place two long tusks of ivory, banded and
// shod with iron and strapped to his muzzle with a band of leather, running
// forward under his nose and curving up before it (the silhouette feature,
// with the hump); the X his master daubed in red paint across his back, behind
// the hump. What the brief leaves open is a first take: his size, the shag, the
// horn stumps, the tusks' make and the band. His affinity sets nothing
// here (affinities are abstract, Jakub, 2026-10-11): his gore lands as the
// thrust of two tusks in a dull flash and chips, his bellow as rings of sound
// and dust (fx/sanguine_dominion.ts).
//
// The rig, like the Bloodhound's: the shared pose drives a four-legged body of
// its own (solveBull). The pose's torso is the body's axis (0 = level), its
// head the neck (from the withers to the centre of the head); armN / armF are
// the front hooves and legN / legF the hind hooves, IK targets on the ground;
// p.snout is the face's direction, p.jaw opens the mouth (0-1), p.ear swings the
// ear, p.tail is the tail's angle and p.shag stirs the mane. Dims are set so the
// shared solver's head is this head (the portrait is cut around it), and the
// body stands behind the pivot so that the pivot, where effects and hits land,
// is under his chest.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, INK, MAT } from '../palette.ts';
import { hash2, RGBA } from '../raster.ts';
import { Hit } from '../render.ts';
import { angleOf, at, dir, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, sub, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 40,
  thigh: 15,
  shin: 16,
  ankleH: 3,
  footLen: 6,
  spine: 22,
  neck: 16,
  upperArm: 13,
  foreArm: 15,
  shoulderDrop: 0,
  shoulderN: 0,
  shoulderF: 0,
  hipN: 0,
  hipF: 0,
};

const BK = MAT.bullBlack, BN = MAT.bone, IR = MAT.iron, DL = MAT.darkleather, RD = MAT.red, HF = MAT.ebony, MZ = MAT.charcoal;

/** The body's centre stands this far behind the pivot (x of every pose). */
const BACK = -14;
/** Leg bones: front (shoulder to elbow, elbow to fetlock), hind (hip to stifle, stifle to hock). */
const UPPER = 13, LOWER = 15, THIGH = 15, GASKIN = 16;
/** The head is drawn this much larger than its frame's units: a bull's great head. */
const HK = 1.2;

type HeadFrame = (u: number, w: number) => V;

interface Leg { root: V; mid: V; low: V; hoof: V }
interface Bull { B: (u: number, w: number) => V; withers: V; head: V; neck: number; fN: Leg; fF: Leg; hN: Leg; hF: Leg }

/** The bull's skeleton from a pose: body frame B (u forward along the spine, w down toward the belly), the neck and the four legs. */
function solveBull(p: Pose): Bull {
  const c = v(p.x, D.hipH + p.y);
  const ax = dir(p.torso), dn = dir(p.torso - 90);
  const B = (u: number, w: number) => v(c.x + ax.x * u + dn.x * w, c.y + ax.y * u + dn.y * w);
  const withers = at(c, p.torso, D.spine);
  const head = at(withers, p.head, D.neck);
  const target = (l: Pose['armN']) => ('ik' in l ? l.ik : v(0, 1.6));
  // a lifted hoof folds back at the knee (front) or swings under at the hock (hind);
  // lying down (p.lie), the legs fold and rest on the ground beside the body
  const lift = (h: V) => Math.max(0, Math.min(1, (h.y - 1.6) / 6));
  const lie = p.p.lie ?? 0;
  const front = (root: V, hoof: V): Leg => {
    const k = lift(hoof);
    const r = ik2(root, v(hoof.x - 1 + k * 4 - lie * 5, hoof.y + 6 - k * 1.4 - lie * 4), UPPER, LOWER, -1);
    return { root, mid: r.mid, low: r.end, hoof };
  };
  const hind = (root: V, hoof: V): Leg => {
    const k = lift(hoof);
    const r = ik2(root, v(hoof.x - 3 - k * 3 - lie * 9, hoof.y + 11.5 - k * 1.5 - lie * 10), THIGH, GASKIN, 1);
    return { root, mid: r.mid, low: r.end, hoof };
  };
  return {
    B, withers, head, neck: p.head,
    fN: front(B(19, 9), target(p.armN)),
    fF: front(B(21, 8), target(p.armF)),
    hN: hind(B(-22, 4), target(p.legN)),
    hF: hind(B(-20, 3), target(p.legF)),
  };
}

/** The head's frame along the face, scaled by k: u from the poll to the muzzle, w toward the front of the face. */
const headFrame = (d: Draw, at0: V, snout: number, k = HK): HeadFrame => {
  const F = d.frame(at0, snout);
  return (u: number, w: number) => F(u * k, w * k);
};

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const g = solveBull(s.pose);
  const snout = P.snout ?? -52;
  const Hd = headFrame(d, g.head, snout);

  // the streak of the gore: the line his tusks drive along
  if (info.def.smear && info.prev) {
    const pg = solveBull(info.prev.pose);
    const ps = info.prev.pose.p.snout ?? -52;
    streak(d, tuskTip(headFrame(d, pg.head, ps), ps), tuskTip(Hd, snout), 3);
  }

  // the tail swings behind the rump
  tail(d, g, P.tail ?? -100, 4);
  // the far legs, darker, behind everything near
  hindLeg(d, g.hF, 'F', 10, -1);
  frontLeg(d, g.fF, 'F', 12, -1);
  // the body, the near haunch and shoulder over it, the paint on his back, the mane over the forequarters
  body(d, g, 30);
  hindLeg(d, g.hN, 'N', 30.05, 0, true, false);
  frontLeg(d, g.fN, 'N', 30.06, 0, true, false);
  paintX(d, g, 30.3);
  mane(d, g, P.shag ?? 0, 30.4);
  // the lower near legs before the body
  hindLeg(d, g.hN, 'N', 34, 0, false, true);
  frontLeg(d, g.fN, 'N', 36, 0, false, true);
  // the far tusk behind the head, the neck, the head with its stumps, ear, forelock and band, and the near tusk
  tusk(d, Hd, snout, 'F', 38, HK);
  neck(d, g, Hd, 40);
  head(d, Hd, snout, P, 44, HK, 0);
  tusk(d, Hd, snout, 'N', 48, HK);
}

/**
 * Hair anchored to the shape it grows on (the texture coordinates of a `cyl`
 * shape), so it moves with him instead of swimming over him: strands running
 * across the shape's axis, `run` px long, some darker and a few lighter.
 * `len` and `r` are the axis's length and the shape's half width in px.
 */
const hair = (len: number, r: number, run: number, dark: number, light: number, seed: number, ph = 0) => (h: Hit) => {
  const sx = Math.floor(h.u * len);
  const sy = Math.floor(((h.v + 1) * r + (((sx % 3) + 3) % 3) * 1.4 + ph) / run);
  const k = hash2(sx, sy, seed);
  return k < dark ? -1 : k > 1 - light ? 1 : 0;
};

/** The short coat of the legs and the head, screen-anchored: a dark dash here and there, running down. */
const fur = (_h: unknown, x: number, y: number) => ((x * 5 + Math.floor(y / 2) * 3) % 13 === 0 ? -1 : 0);

/** Shaggy hair on small parts (fetlocks, the tail's tuft, the forelock, the icons): strands of a darker and a lighter shade. */
const shagTex = (ph: number) => (_h: unknown, x: number, y: number) => {
  const k = Math.round(ph * 3);
  const q = hash2(x, Math.floor((y + k + (x % 2) * 2) / 3), 7);
  return q < 0.22 ? -1 : q > 0.88 ? 1 : 0;
};

/** The barrel of his body: the back rising to the hump over his shoulders, the deep chest, the belly and the round of the rump. */
function body(d: Draw, g: Bull, z: number) {
  const B = g.B;
  d.poly(
    { mat: BK, z, group: 'body', tex: hair(63, 18, 2, 0.12, 0.04, 11) },
    [
      B(-33, -9), B(-29, -13), B(-20, -15), B(-9, -16), B(1, -17.5), B(8, -20), B(13, -23), B(18, -23.5), B(23, -20.5),
      B(27, -13), B(29.5, -4), B(29.5, 5), B(27, 12.5), B(21, 16.5),
      B(13, 16.5), B(4, 15), B(-6, 14.5), B(-15, 13.5), B(-22, 12), B(-28, 9), B(-33, 3.5), B(-35, -2.5),
    ],
    { kind: 'cyl', a: B(-34, 0), b: B(29, 0), r: 18, bevel: 1.4 },
  );
}

/**
 * The mane: the long shag over the hump, the shoulder and the chest, its lower
 * edge hanging in tufts over the tops of the forelegs; it stirs with p.shag.
 */
function mane(d: Draw, g: Bull, ph: number, z: number) {
  const B = g.B;
  const t = (u: number, w: number, k: number) => B(u + Math.sin(ph + k) * 0.5, w);
  d.poly(
    { mat: BK, z, group: 'mane', line: 'soft', tex: hair(27, 19, 4, 0.2, 0.14, 13, Math.sin(ph) * 1.5) },
    [
      B(0, -18.6), B(7, -21.6), B(12.5, -25), B(18, -25.4), B(23.5, -22), B(27.6, -14.4), B(31, -5), B(31.2, 6), B(28.6, 14.4),
      t(25, 19, 0), t(22, 15.6, 1), t(19, 19.6, 2), t(15.6, 14.6, 3), t(12.6, 17.6, 4), t(10, 11.6, 5), t(7, 13.6, 6), t(5, 7.4, 7),
      t(2, 8.4, 8), t(2.6, 2.4, 9), t(-0.6, 0, 10), t(1.4, -5.2, 11), t(-1.6, -8.4, 12), t(0.8, -12, 13), t(-2, -15, 14),
    ],
    { kind: 'cyl', a: B(2, -6), b: B(29, -6), r: 19, bevel: 1.4 },
  );
}

/** The red X his master painted across his back, behind the hump: two crude strokes, a drip under each. */
function paintX(d: Draw, g: Bull, z: number) {
  const B = g.B;
  const R = RD.ramp;
  const px: { p: V; c: RGBA }[] = [];
  const stroke = (a: V, b: V, k: number) => {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2);
    for (let i = 0; i <= n; i++) {
      const q = lerpV(a, b, i / n);
      // a little wobble in the brush, the paint thinner at the ends
      const wob = Math.sin(i * 1.7 + k) * 0.4;
      const ends = i < 2 || i > n - 2;
      for (const o of ends ? [-0.4, 0.5] : [-1.1, -0.3, 0.5, 1.2]) {
        const p = v(Math.floor(q.x + wob + o * 0.4) + 0.5, Math.floor(q.y + o) + 0.5);
        px.push({ p, c: o > 1 ? R[4] : o < -1 ? R[2] : i % 6 === 3 ? R[2] : R[3] });
      }
    }
  };
  stroke(B(-15, -15.6), B(-3, -4.6), 0);
  stroke(B(-15, -4.4), B(-3.4, -16), 2);
  // the drips running down from the low ends of the strokes
  for (const [u, w, n] of [[-3.2, -3.6, 3], [-14.8, -3.4, 2], [-9.2, -8.6, 1]] as const) for (let k = 1; k <= n; k++) px.push({ p: B(u, w + k), c: k === n ? R[2] : R[3] });
  d.pixels({ mat: RD, z, group: 'paint', line: 'none', outline: false, noClean: true }, px);
}

/** A front leg: shoulder to elbow (`upper`), then the forearm and cannon, a feathered fetlock, the pastern and the hoof (`lower`). */
function frontLeg(d: Draw, l: Leg, side: 'N' | 'F', z: number, shade: number, upper = true, lower = true) {
  const g = 'front' + side;
  if (upper) d.capsule({ mat: BK, z, group: g, shade, tex: fur }, l.root, l.mid, 6.8, 4.8);
  if (!lower) return;
  d.capsule({ mat: BK, z: z + 0.1, group: g, shade, tex: fur }, l.mid, l.low, 4.0, 2.9);
  d.capsule({ mat: BK, z: z + 0.15, group: g, shade }, l.low, at(l.hoof, 90, 2.2), 2.8, 2.6);
  feather(d, l.low, z + 0.2, g, shade);
  hoof(d, l.hoof, z + 0.3, g, shade);
}

/** A hind leg: the haunch (`upper`), then the gaskin, the hock, the cannon and the hoof (`lower`). */
function hindLeg(d: Draw, l: Leg, side: 'N' | 'F', z: number, shade: number, upper = true, lower = true) {
  const g = 'hind' + side;
  if (upper) d.capsule({ mat: BK, z, group: g, shade, tex: fur }, l.root, l.mid, 8.6, 5.6);
  if (!lower) return;
  d.capsule({ mat: BK, z: z + 0.1, group: g, shade, tex: fur }, l.mid, l.low, 4.6, 3.0);
  d.circle({ mat: BK, z: z + 0.15, group: g, shade }, l.low, 3.0);
  d.capsule({ mat: BK, z: z + 0.2, group: g, shade }, l.low, at(l.hoof, 90, 2.2), 2.8, 2.5);
  feather(d, at(l.hoof, 90, 4.4), z + 0.25, g, shade);
  hoof(d, l.hoof, z + 0.3, g, shade);
}

/** Long hair at the fetlock, hanging over the top of the hoof. */
function feather(d: Draw, p: V, z: number, g: string, shade: number) {
  d.poly({ mat: BK, z, group: g, shade, tex: shagTex(0.5) }, [v(p.x - 3.2, p.y + 1.6), v(p.x + 3.2, p.y + 1.6), v(p.x + 3.8, p.y - 2.6), v(p.x + 1.6, p.y - 1.4), v(p.x, p.y - 3.4), v(p.x - 1.6, p.y - 1.6), v(p.x - 3.8, p.y - 2.8)], { kind: 'bevel', w: 1 });
}

/** A cloven hoof of dark horn pointing forward, the cleft between its two toes. */
function hoof(d: Draw, p: V, z: number, g: string, shade: number) {
  d.poly({ mat: HF, z, group: g, shade }, [v(p.x - 2.8, p.y - 1.6), v(p.x + 3.6, p.y - 1.6), v(p.x + 4.2, p.y - 0.2), v(p.x + 2.6, p.y + 2.2), v(p.x - 2.4, p.y + 2.2)], { kind: 'bevel', w: 1.2 });
  d.pixels({ mat: HF, z: z + 0.05, group: g }, [{ p: v(p.x + 2.2, p.y - 1.1), c: HF.ramp[0] }, { p: v(p.x + 2.4, p.y), c: HF.ramp[1] }]);
}

/** The tail: a long switch from the rump, its tuft of black hair at the end. */
function tail(d: Draw, g: Bull, ang: number, z: number) {
  const p0 = g.B(-33.4, -8.4);
  const p1 = at(p0, ang + 26, 6), p2 = at(p1, ang + 8, 7), p3 = at(p2, ang - 4, 6.5);
  d.ribbon({ mat: BK, z, group: 'tail' }, [p0, p1, p2, p3], [1.9, 1.3, 1.1, 1.0]);
  const tuft = at(p3, ang - 8, 3.4);
  d.poly({ mat: BK, z: z + 0.1, group: 'tail', tex: shagTex(1) }, [at(p3, ang + 90, 1.6), at(tuft, ang + 70, 2.6), at(tuft, ang, 3.6), at(tuft, ang - 70, 2.6), at(p3, ang - 90, 1.6)], { kind: 'bevel', w: 1 });
}

/** The thick neck from the hump and the chest down to the head, shaggy like the mane. */
function neck(d: Draw, g: Bull, Hd: HeadFrame, z: number) {
  const B = g.B;
  d.poly(
    { mat: BK, z, group: 'neck', shade: -1, tex: hair(30, 14, 4, 0.2, 0.1, 17) },
    [B(19, -24.4), B(25, -19.6), Hd(-1.6, 6.4), Hd(-4.8, 2.4), Hd(-3.6, -4.6), Hd(1.6, -7.8), B(31, 9.4), B(29.4, -4)],
    { kind: 'cyl', a: B(22, -6), b: Hd(-1, 0), r: 14, bevel: 1.3 },
  );
}

/**
 * The points of a tusk: from the corner of the mouth it runs forward under the
 * nose, then curves up in front of it; the far one starts higher on the far
 * side of the face and shows past it.
 */
function tuskPts(Hd: HeadFrame, snout: number, side: 'N' | 'F', k: number): V[] {
  const base = side === 'N' ? Hd(11.6, -3.4) : Hd(11.2, 0.6);
  const a0 = snout + (side === 'N' ? 30 : 40);
  const pts = [base];
  for (let i = 1; i <= 6; i++) pts.push(at(pts[i - 1], a0 + i * 10, 3.9 * k));
  return pts;
}

/** The point of the near tusk. */
const tuskTip = (Hd: HeadFrame, snout: number, k = HK) => tuskPts(Hd, snout, 'N', k)[6];

/** A tusk of ivory, a band of iron round it, its point sheathed in iron, all of a piece (no seam line). */
function tusk(d: Draw, Hd: HeadFrame, snout: number, side: 'N' | 'F', z: number, k: number) {
  const pts = tuskPts(Hd, snout, side, k);
  const g = 'tusk' + side;
  const shade = side === 'F' ? -1 : 0;
  d.ribbon({ mat: BN, z, group: g, shade }, pts, [1.6, 1.55, 1.45, 1.3, 1.1, 0.8, 0.3].map((r) => r * k));
  d.ribbon({ mat: IR, z: z + 0.1, group: g, shade, line: 'none' }, [lerpV(pts[4], pts[5], 0.4), pts[5], pts[6]], [1.05, 0.85, 0.35].map((r) => r * k));
  const a = angleOf(sub(pts[3], pts[2]));
  d.capsule({ mat: IR, z: z + 0.05, group: g, shade, line: 'none' }, at(pts[2], a, -0.3 * k), at(pts[2], a, 0.3 * k), 1.8 * k, 1.75 * k);
}

/**
 * The head in its frame along the face (u from the poll to the muzzle, w
 * toward its front), radii scaled by k: a broad skull and a long face, the jaw
 * opening at p.jaw, the horns sawn to stumps capped in iron, a curly forelock
 * between them, a small ear, a deep-set eye under a heavy brow, a broad grey
 * muzzle with wide nostrils, and the band of leather that holds the tusks on.
 */
function head(d: Draw, H: HeadFrame, snout: number, P: Record<string, number>, z: number, k: number, shade: number) {
  const g = 'head' + Math.round(z);
  const jaw = P.jaw ?? 0;
  // the lower jaw turns down round its hinge
  const th = -jaw * 0.6, hu = 1.2, hw = -6.2;
  const J = (u: number, w: number) => {
    const du = u - hu, dw = w - hw;
    return H(hu + du * Math.cos(th) - dw * Math.sin(th), hw + du * Math.sin(th) + dw * Math.cos(th));
  };
  // the far horn stump and the far ear behind the skull
  hornStump(d, H(-0.4, 6.2), snout + 116, z - 0.4, g + 'hf', -1, k);
  ear(d, H(-2.6, 3.2), snout + 176 + (P.ear ?? 0), z - 0.3, g + 'ef', -1, k);
  if (jaw > 0.05) {
    // the mouth open: dark inside, the tongue
    d.poly({ mat: BK, z: z - 0.2, group: g + 'm', color: ACCENT.mouthRed, line: 'none' }, [H(4, -5.4), H(15.6, -2.2), J(15.4, -2.6), J(4, -6.4)]);
    d.poly({ mat: BK, z: z - 0.15, group: g + 'm', color: ACCENT.lipRose, line: 'none' }, [J(6, -6.2), J(13, -3.4), J(13.4, -4.2), J(6.4, -6.9)]);
  }
  // the lower jaw
  d.poly({ mat: BK, z: z - 0.1, group: g + 'j', shade }, [J(1.4, -5.4), J(8, -4.4), J(13.2, -3.0), J(15.8, -2.4), J(15.4, -4.6), J(12, -6.2), J(7, -7.6), J(2.4, -8.0)], { kind: 'bevel', w: 1.2 * k });
  // skull and face, the light along the brow and down the front of the face
  d.poly(
    { mat: BK, z, group: g, shade, tex: fur },
    [H(-4, 3), H(-2, 5.6), H(3, 6.4), H(8, 5.8), H(12.5, 5.2), H(15.2, 4.2), H(16.6, 1.6), H(16.4, -1.8), H(13, -3.0), H(8, -4.6), H(3, -6.2), H(-1, -6.8), H(-3.6, -4.8), H(-4.6, -1.0)],
    { kind: 'dome', c: H(5, 1.6), r: 11 * k, bevel: 1.2 },
  );
  const rim: { p: V; c: RGBA }[] = [];
  for (let u = 0; u <= 11; u += 0.8) rim.push({ p: H(u, 5.6 - Math.max(0, u - 3) * 0.08), c: u < 6 ? BK.ramp[5] : BK.ramp[4] });
  d.pixels({ mat: BK, z: z + 0.05, group: g }, rim);
  // the muzzle, broad and grey, the nostrils dark in it, the line of the mouth under it
  d.poly({ mat: MZ, z: z + 0.1, group: g + 'mz', shade, line: 'none' }, [H(12.2, 5.0), H(15.2, 4.2), H(16.8, 1.6), H(16.4, -1.8), H(13.6, -2.6), H(11.8, 1.0)], { kind: 'dome', c: H(13.6, 2.6), r: 4.4 * k, bevel: 1 });
  const px: { p: V; c: RGBA }[] = [
    { p: H(15.9, 1.6), c: MZ.ramp[0] }, { p: H(15.7, 0.6), c: MZ.ramp[1] }, { p: H(15.8, 3.2), c: MZ.ramp[5] },
  ];
  for (let u = 12.4; u <= 16; u += 0.8) px.push({ p: H(u, -2.2 - (16 - u) * 0.25), c: BK.ramp[0] });
  // the eye, deep-set under a heavy brow, a glint in it; closed when he is down
  if (P.dead) px.push({ p: H(3.2, 2.4), c: BK.ramp[1] }, { p: H(4.2, 2.2), c: BK.ramp[1] });
  else px.push({ p: H(3.4, 2.4), c: INK.eye }, { p: H(4.2, 2.2), c: INK.eye }, { p: H(3.4, 1.6), c: ACCENT.mouthRed }, { p: H(4.0, 2.8), c: INK.white }, { p: H(2.6, 3.6), c: BK.ramp[0] }, { p: H(3.8, 3.6), c: BK.ramp[0] }, { p: H(5.0, 3.4), c: BK.ramp[0] });
  d.pixels({ mat: BK, z: z + 0.35, group: g }, px);
  // the near horn stump with its iron cap, the curly forelock between the horns, the near ear
  hornStump(d, H(-1.8, 5.2), snout + 124, z + 0.4, g + 'hn', 0, k);
  forelock(d, H, z + 0.45, g + 'fl');
  ear(d, H(-3.4, 2.4), snout + 176 + (P.ear ?? 0), z + 0.5, g + 'en', 0, k);
  // the band of leather round the muzzle that holds the tusks, a rivet of iron on it
  d.ribbon({ mat: DL, z: z + 0.6, group: g + 's', line: 'soft' }, [H(10.6, 5.8), H(11, 1.2), H(11.4, -3.8)], [0.85 * k, 0.95 * k, 0.85 * k]);
  d.pixels({ mat: IR, z: z + 0.62, group: g + 's' }, [{ p: H(10.9, 2.4), c: IR.ramp[4] }]);
}

/** A horn sawn to a stump, an iron cap riveted over the cut. */
function hornStump(d: Draw, root: V, ang: number, z: number, g: string, shade: number, k: number) {
  d.capsule({ mat: BN, z, group: g, shade: shade - 1 }, root, at(root, ang, 3.2 * k), 2.1 * k, 1.8 * k);
  d.capsule({ mat: IR, z: z + 0.05, group: g, shade }, at(root, ang, 2.6 * k), at(root, ang, 4.0 * k), 2.0 * k, 1.6 * k);
}

/** The ear: a small leaf of hide below the horn, sticking out back and down, its inside in shadow. */
function ear(d: Draw, root: V, ang: number, z: number, g: string, shade: number, k: number) {
  const E = d.frame(root, ang);
  d.poly({ mat: BK, z, group: g, shade, line: 'soft' }, [E(-0.6 * k, -1.6 * k), E(2.6 * k, -2.4 * k), E(5.6 * k, -1.2 * k), E(6.4 * k, 0), E(5.0 * k, 1.4 * k), E(2.0 * k, 1.8 * k), E(-0.6 * k, 1.2 * k)], { kind: 'bevel', w: 1 });
  d.line({ mat: BK, z: z + 0.05, group: g, line: 'none' }, E(1.2 * k, 0), E(4.6 * k, 0), BK.ramp[1]);
}

/** The curly hair on his poll between the horns: a few tight curls catching the light. */
function forelock(d: Draw, H: HeadFrame, z: number, g: string) {
  d.poly({ mat: BK, z, group: g, tex: shagTex(2), line: 'soft' }, [H(-2.4, 4.4), H(-1.4, 7.4), H(0.4, 6.4), H(1.6, 8.0), H(2.8, 6.4), H(4.6, 7.2), H(5.0, 5.0), H(3.0, 4.0)], { kind: 'bevel', w: 1 });
  d.pixels({ mat: BK, z: z + 0.05, group: g }, [{ p: H(0.4, 6.6), c: BK.ramp[5] }, { p: H(2.8, 6.8), c: BK.ramp[4] }, { p: H(4.2, 6.4), c: BK.ramp[5] }]);
}

/** The line of a thrust: two streaks running back from where the tusks drive. */
function streak(d: Draw, from: V, to: V, z: number) {
  const o = { mat: IR, z, outline: false, line: 'none' as const, noClean: true };
  const ang = angleOf(sub(to, from));
  const back = Math.max(10, Math.hypot(to.x - from.x, to.y - from.y) * 1.2);
  for (const [w, k] of [[3.4, 1], [-3.2, 0.7]] as const) {
    const a = at(at(to, ang + 90, w), ang, -2), b = at(a, ang, -back * k);
    d.ribbon({ ...o, group: 'streak', color: IR.ramp[4] }, [b, a], [0.3, 1.1]);
    d.line({ ...o, z: z + 0.01, group: 'streak' }, lerpV(a, b, 0.5), a, ACCENT.white);
  }
}

// ---------------------------------------------------------------------------
// Poses & animations (hooves are IK targets on the ground; x is the body behind the pivot)
// ---------------------------------------------------------------------------

/** A pose with the hooves given as [near front, far front, near hind, far hind] x positions on the ground. */
const bull = (o: Partial<Pose> & { p?: Record<string, number> }, hooves: [number, number, number, number] = [5, 8, -38, -35], lift: [number, number, number, number] = [0, 0, 0, 0]) =>
  pose({
    ...o,
    x: BACK + (o.x ?? 0),
    armN: { ik: v(hooves[0], 1.6 + lift[0]) },
    armF: { ik: v(hooves[1], 1.6 + lift[1]) },
    legN: { ik: v(hooves[2], 1.6 + lift[2]) },
    legF: { ik: v(hooves[3], 1.6 + lift[3]) },
  });

const IDLE: Pose = bull({ torso: 0, head: -26, p: { snout: -52, jaw: 0, ear: 0, tail: -100, shag: 0} });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  // he breathes slowly, the tail swings once and the ear twitches at its own pace (whole cycles, so the loop closes)
  return bull({ y: -b, torso: 0, head: -26 - b, p: { snout: -52 + b, jaw: 0, ear: Math.round(Math.sin(a * 2) * 4), tail: -100 + Math.round(Math.sin(a) * 9), shag: a} });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  // a heavy gallop: front pair, then hind pair, each a little out of step with its partner
  const hoof = (base: number, ph: number, reach: number, lift: number): [number, number] => {
    const s = Math.sin(ph);
    return [base - reach * Math.cos(ph), s > 0 ? lift * s : 0];
  };
  const [fNx, fNy] = hoof(6, a, 9, 6), [fFx, fFy] = hoof(9, a + 0.7, 9, 6);
  const [hNx, hNy] = hoof(-37, a + Math.PI, 9, 5), [hFx, hFy] = hoof(-34, a + Math.PI + 0.7, 9, 5);
  const bob = Math.round(Math.sin(2 * a) * 1.5);
  return bull(
    { y: bob - 1, torso: Math.round(Math.sin(a + 0.6) * 2), head: -34 + Math.round(Math.sin(a) * 3), p: { snout: -56, jaw: 0.1, ear: 18, tail: -150 + Math.round(Math.sin(a) * 6), shag: a * 2} },
    [fNx, fFx, hNx, hFx],
    [fNy, fFy, hNy, hFy],
  );
}

// Gore: he drops his head with the tusks levelled, then drives them forward and up through the enemy.
// The target stands 38 px ahead: the iron points reach past its middle.
const GR_LOWER = bull({ x: -4, y: -2, torso: -3, head: -40, p: { snout: -48, jaw: 0, ear: 16, tail: -86, shag: 1} }, [5, 8, -40, -37]);
const GR_THRUST = bull({ x: 5, y: -1, torso: -2, head: -18, p: { snout: -26, jaw: 0.2, ear: 26, tail: -140, shag: 2} }, [11, 14, -36, -33]);
const GR_TOSS = bull({ x: 6, y: 0, torso: 2, head: -4, p: { snout: -10, jaw: 0.1, ear: 22, tail: -130, shag: 2.6} }, [11, 14, -36, -33]);

// War Bellow: he paws the ground with the head low, stamps, then throws the head up and bellows.
const WB_PAW = bull({ x: -2, y: -1, torso: -2, head: -40, p: { snout: -70, jaw: 0, ear: 10, tail: -96, shag: 0.6} }, [8, 8, -38, -35], [5, 0, 0, 0]);
const WB_STAMP = bull({ x: -1, y: -2, torso: -1, head: -34, p: { snout: -64, jaw: 0, ear: 4, tail: -104, shag: 1} }, [6, 8, -38, -35]);
const WB_CALL = bull({ x: -2, y: 1, torso: 7, head: 6, p: { snout: 18, jaw: 1, ear: -18, tail: -124, shag: 1.8} }, [5, 8, -38, -35]);

const HURT = bull({ x: -4, y: -1, torso: 3, head: -16, p: { snout: -38, jaw: 0.35, ear: 24, tail: -80, shag: 2} }, [3, 6, -39, -36]);
const DEATH_SAG = bull({ x: -2, y: -10, torso: -6, head: -42, p: { snout: -70, jaw: 0.2, ear: 20, tail: -88, shag: 2.4 } }, [9, 12, -36, -33]);
const DEATH_DOWN = bull({ y: -22, torso: 0, head: -24, p: { snout: -26, jaw: 0, ear: 30, tail: -170, shag: 3, dead: 1, lie: 1 } }, [20, 23, -20, -17]);

// Victory: a bellow with the head thrown up, a stamp, another bellow.
const VIC_A = bull({ y: 1, torso: 5, head: 2, p: { snout: 12, jaw: 0.85, ear: -14, tail: -118, shag: 1 } });
const VIC_B = bull({ y: -1, torso: 1, head: -20, p: { snout: -40, jaw: 0.1, ear: 6, tail: -96, shag: 2 } }, [5, 8, -38, -35], [4, 0, 0, 0]);

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'black_rhino',
  name: 'Black Rhino',
  dims: D,
  build,
  footprint: 2.3,
  anims: {
    idle: { loop: true, frames: cycle(8, 180, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, GR_LOWER, 2, 90),
        ...keys([
          [GR_LOWER, 200],
          [mid(GR_LOWER, GR_THRUST, 0.5), 50],
          [GR_THRUST, 80, { hit: true, smear: true }],
          [GR_TOSS, 200],
        ]),
        ...tween(D, GR_TOSS, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, WB_PAW, 2, 100),
        ...keys([
          [WB_PAW, 200],
          [WB_STAMP, 120],
          [mid(WB_STAMP, WB_CALL, 0.55), 70],
          [WB_CALL, 140, { hit: true, event: 'cast' }],
          [tweak(WB_CALL, { p: { jaw: 0.9, snout: 22, shag: 2.2 } }), 220],
          [tweak(WB_CALL, { p: { jaw: 0.6, snout: 16, shag: 2.6 } }), 200],
        ]),
        ...tween(D, WB_CALL, IDLE, 3, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: BACK - 3, torso: 2, head: -20 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_SAG, 0.5), 110],
        [DEATH_SAG, 260],
        [mid(DEATH_SAG, DEATH_DOWN, 0.6), 130],
        [DEATH_DOWN, 150],
        [tweak(DEATH_DOWN, { y: -23 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VIC_A, 2, 110, ease.out),
        ...keys([
          [VIC_A, 300],
          [VIC_B, 160],
          [mid(VIC_B, VIC_A, 0.5), 90],
          [VIC_A, 360],
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

/** The head for an icon, scaled up: its stumps, ear, forelock and band, and both tusks. */
function iconHead(d: Draw, at0: V, snout: number, P: Record<string, number>, k: number) {
  const Hd = headFrame(d, at0, snout, k);
  tusk(d, Hd, snout, 'F', 8, k);
  head(d, Hd, snout, P, 10, k, 0);
  tusk(d, Hd, snout, 'N', 12, k);
}

const E = ACCENT;

export const blackRhino: ChampionArt = {
  char,
  iconBg: MAT.crimson,
  icons: {
    gore: () =>
      compose(MAT.crimson, glyph((d) => {
        iconHead(d, v(7, 25), -40, { jaw: 0.1, ear: 20 }, 1.25);
      }), (b) => {
        // the thrust driven home: a white streak along the tusks and the blow where the points land (screen space)
        for (const [x, y] of [[20, 26], [22, 24], [24, 23], [18, 28]] as const) b.set(x, y, E.white);
        impactStar(b, 34, 12, 2, 8, 9, FXR.dust[3], E.white);
      }),
    war_bellow: () => {
      const art = glyph((d) => iconHead(d, v(9, 13), 30, { jaw: 1, ear: -16 }, 1.15));
      // rings of the bellow rising from the open mouth (screen space)
      for (const [r, c] of [[5, E.white], [9, E.white], [13, MAT.steel.ramp[4]]] as const) {
        for (let deg = -70; deg <= 10; deg += 4) {
          const t = (deg * Math.PI) / 180;
          art.set(Math.round(27 + Math.cos(t) * r), Math.round(11 + Math.sin(t) * r), c);
        }
      }
      return compose(MAT.crimson, art, (b) => {
        // the dust of the stamp along the ground
        for (let x = 4; x < 36; x++) if ((x * 7) % 5 < 3) b.set(x, 34 - ((x * 3) % 3), FXR.dust[(x % 3) + 1]);
      });
    },
    thick_hide: () => {
      const art = glyph((d) => {
        // a stretch of his shaggy back, the red X across it
        d.poly({ mat: BK, z: 10, group: 'hide', tex: shagTex(0.3) }, [v(3, 6), v(8, 30), v(16, 35), v(27, 35), v(36, 27), v(37, 8), v(30, 4), v(18, 3)], { kind: 'dome', c: v(14, 26), r: 26, bevel: 1.4 });
        const px: { p: V; c: RGBA }[] = [];
        for (let k = -9; k <= 9; k++) {
          for (const o of [-1, 0, 1]) {
            px.push({ p: v(20.5 + k + o * 0.6, 19.5 + k), c: o > 0 ? RD.ramp[4] : RD.ramp[3] });
            px.push({ p: v(20.5 + k + o * 0.6, 19.5 - k), c: o > 0 ? RD.ramp[4] : RD.ramp[3] });
          }
        }
        d.pixels({ mat: RD, z: 11, group: 'x', line: 'none', outline: false, noClean: true }, px);
      });
      // the shell of dull light closing over the hide, and a glint on it where it turns the blow (screen space)
      for (let a = -2.75; a <= -0.35; a += 0.035) {
        for (const [r, c] of [[16.5, MAT.steel.ramp[5]], [15.6, MAT.steel.ramp[4]]] as const) art.set(Math.round(20 + Math.cos(a) * r), Math.round(21 + Math.sin(a) * r * 0.92), c);
      }
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]] as const) art.set(10 + dx, 9 + dy, Math.abs(dx) + Math.abs(dy) > 1 ? MAT.steel.ramp[4] : E.white);
      return compose(MAT.crimson, art);
    },
  },
};
