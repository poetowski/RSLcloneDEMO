// The War Tigress (docs/DESIGN_DECISIONS.md section 65, 2026-11-02, my design on
// Jakub's word): an Elite Damage of the Sanguine Dominion, a war beast on four legs.
// A long, low cat: a russet coat with black stripes, cream under the belly, on the
// cheeks and the paws (the silhouette: the small round ears, the short broad muzzle,
// the long striped tail carried low); a heavy, low body, a big head carried forward; a
// black war-blanket on her back, edged in red, with the Dominion's red hexagon, and a
// strap under her chest, so she belongs to someone, as the Black Rhino and the
// Bloodhound do. Her affinity (Ember) sets nothing here (Jakub,
// 2026-10-11).
//
// The rig is the Follower's (solveWolf in follower.ts) with a cat's proportions: the
// pose's torso is the body's axis (0 = level), its head the neck; armN / armF are the
// front paws and legN / legF the hind paws, IK targets on the ground; p.snout is the
// muzzle's direction, p.jaw opens the mouth (0-1), p.tail is the tail's angle. The
// body stands behind the pivot so that effects and hits land under her chest.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, dir, Dims, Draw, ease, ik2, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 42,
  thigh: 15,
  shin: 15,
  ankleH: 3,
  footLen: 6,
  spine: 18,
  neck: 14,
  upperArm: 11,
  foreArm: 16,
  shoulderDrop: 0,
  shoulderN: 0,
  shoulderF: 0,
  hipN: 0,
  hipF: 0,
};

const RU = MAT.furRusset, SK = MAT.furBlack, CR = MAT.furWhite, HA = MAT.darkleather, RD = MAT.red, IR = MAT.iron;
const E = ACCENT;

const BACK = -6;
const HEAD = 1.4;
const UPPER = 11, LOWER = 16, THIGH = 15, GASKIN = 15;

interface Leg { root: V; mid: V; low: V; paw: V }
interface Cat { B: (u: number, w: number) => V; withers: V; head: V; neck: number; fN: Leg; fF: Leg; hN: Leg; hF: Leg }

function solveCat(p: Pose): Cat {
  const c = v(p.x, D.hipH + p.y);
  const ax = dir(p.torso), dn = dir(p.torso - 90);
  const B = (u: number, w: number) => v(c.x + ax.x * u + dn.x * w, c.y + ax.y * u + dn.y * w);
  const withers = at(c, p.torso, D.spine);
  const head = at(withers, p.head, D.neck);
  const target = (l: Pose['armN']) => ('ik' in l ? l.ik : v(0, 1.6));
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
  const g = solveCat(s.pose);
  const snout = P.snout ?? -10;
  const Hd = d.frame(g.head, snout);

  hindLeg(d, g.hF, 'F', 10, -1);
  frontLeg(d, g.fF, 'F', 12, -1);
  tail(d, g, P.tail ?? 176, 20);
  ear(d, Hd, 'F', 26, HEAD);
  frontLeg(d, g.fN, 'N', 29, 0, true, false);
  body(d, g, 30);
  hindLeg(d, g.hN, 'N', 30.05, 0, true, false);
  belly(d, g, 30.1);
  stripes(d, g, 30.2);
  harness(d, g, 30.4);
  hindLeg(d, g.hN, 'N', 34, 0, false, true);
  frontLeg(d, g.fN, 'N', 36, 0, false, true);
  neck(d, g, 40);
  head(d, Hd, snout, P, 44, HEAD);
  ear(d, Hd, 'N', 46, HEAD);
}

function body(d: Draw, g: Cat, z: number) {
  const B = g.B;
  d.poly(
    { mat: RU, z, group: 'body' },
    [B(-25, -1.6), B(-22, -6), B(-14, -7), B(-4, -6.6), B(6, -7.4), B(14, -9), B(20, -7.4), B(24.6, -2), B(25.4, 6), B(22.6, 12), B(17, 15), B(11, 15.4), B(5.6, 14), B(1, 11.6), B(-4, 10), B(-9, 9.6), B(-14, 10), B(-19, 9.6), B(-23.5, 6.6), B(-26, 2)],
    { kind: 'cyl', a: B(-25, 3), b: B(24, 3), r: 12, bevel: 1.2 },
  );
}

function belly(d: Draw, g: Cat, z: number) {
  const B = g.B;
  d.poly(
    { mat: CR, z, group: 'belly', line: 'none' },
    [B(25, 6), B(22.6, 12), B(17, 15), B(11, 15.4), B(5.6, 14), B(1, 11.6), B(-4, 10), B(-9, 9.6), B(-5, 8), B(1, 9.4), B(6, 11.8), B(12, 12.8), B(18, 11.8), B(22, 8.6)],
    { kind: 'cyl', a: B(-25, 3), b: B(24, 3), r: 12, bevel: 1.2 },
  );
}

/** A black stripe running down from the back: broad at the top, ending in a point. */
function stripe(d: Draw, F: (u: number, w: number) => V, u: number, w0: number, w1: number, lean: number, z: number, group: string) {
  d.poly({ mat: SK, z, group, line: 'none' }, [F(u - 1, w0), F(u + 1, w0), F(u + lean + 0.2, w1)]);
}

function stripes(d: Draw, g: Cat, z: number) {
  const B = g.B;
  for (const [u, w0, w1, lean] of [[-22.5, -5, 3, -1], [-18, -6.4, 5, -1], [-13.5, -6.8, 6, -0.6], [14, -8.6, 2, 1.4], [18.6, -7.4, 3.6, 1.6]] as const) stripe(d, B, u, w0, w1, lean, z, 'stripes');
  for (const [u, w1] of [[-8.6, 7.6], [-4, 8], [1, 8.6], [6, 9.6], [10.6, 10.4]] as const) stripe(d, B, u, 3, w1, 0.4, z, 'stripes');
}

/** The black war-blanket on her back, edged in red, the Dominion's red hexagon on it, and the strap under her chest that holds it. */
function harness(d: Draw, g: Cat, z: number) {
  const B = g.B;
  d.poly({ mat: HA, z: z - 0.05, group: 'strap' }, [B(7, 1), B(10.4, 1), B(12.4, 15.6), B(9, 15.8)], { kind: 'bevel', w: 0.9 });
  d.poly({ mat: MAT.blackCloth, z, group: 'blanket' }, [B(-11, -7.4), B(-4, -7), B(6, -7.8), B(12.6, -9.4), B(13.6, 2.6), B(11, 4.6), B(-7, 4), B(-11.4, 2)], { kind: 'cyl', a: B(1, -8), b: B(1, 5), r: 12, bevel: 1 });
  d.ribbon({ mat: RD, z: z + 0.05, group: 'blanket', line: 'none' }, [B(-11.4, 2), B(-7, 4), B(11, 4.6), B(13.6, 2.6)], [0.8, 0.8, 0.8, 0.8]);
  const c = B(1.4, -1.6), x0 = Math.floor(c.x) + 0.5, y0 = Math.floor(c.y) + 0.5;
  const R = RD.ramp, px: { p: V; c: RGBA }[] = [];
  for (const [x, y] of [[-1, 2], [0, 2], [1, 2], [-2, 1], [2, 1], [-2, 0], [2, 0], [-2, -1], [2, -1], [-1, -2], [0, -2], [1, -2]]) px.push({ p: v(x0 + x, y0 + y), c: R[2] });
  for (const [x, y] of [[-1, 1], [0, 1], [1, 1], [-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1]]) px.push({ p: v(x0 + x, y0 + y), c: y > 0 || x < 0 ? R[5] : R[4] });
  d.pixels({ mat: RD, z: z + 0.1, group: 'badge', line: 'none', outline: false }, px);
}

function frontLeg(d: Draw, l: Leg, side: 'N' | 'F', z: number, shade: number, upper = true, lower = true) {
  const g = 'front' + side;
  if (upper) d.capsule({ mat: RU, z, group: g, shade }, l.root, l.mid, 6.6, 5.2);
  if (!lower) return;
  d.capsule({ mat: RU, z: z + 0.1, group: g, shade }, l.mid, l.low, 4.6, 3.6);
  const m = v((l.mid.x + l.low.x) / 2, (l.mid.y + l.low.y) / 2);
  d.line({ mat: SK, z: z + 0.15, group: g, line: 'none' }, v(m.x - 2.4, m.y + 1), v(m.x + 1.4, m.y + 1), SK.ramp[1]);
  d.line({ mat: SK, z: z + 0.15, group: g, line: 'none' }, v(m.x - 2, m.y - 3), v(m.x + 1, m.y - 3), SK.ramp[1]);
  d.capsule({ mat: RU, z: z + 0.2, group: g, shade }, l.low, v(l.paw.x, l.paw.y + 2.6), 3.4, 2.4);
  paw(d, l.paw, z + 0.3, g, shade);
}

function hindLeg(d: Draw, l: Leg, side: 'N' | 'F', z: number, shade: number, upper = true, lower = true) {
  const g = 'hind' + side;
  if (upper) {
    d.capsule({ mat: RU, z, group: g, shade, line: 'none' }, l.root, l.mid, 8.6, 5.4);
    const T = d.frame(l.root, Math.atan2(l.mid.y - l.root.y, l.mid.x - l.root.x) * 57.29578);
    for (const u of [2, 6, 10]) d.line({ mat: SK, z: z + 0.01, group: g, line: 'none' }, T(u, -5.4), T(u + 1, 0.4), SK.ramp[1]);
  }
  if (!lower) return;
  d.capsule({ mat: RU, z: z + 0.1, group: g, shade }, l.mid, l.low, 4.6, 3);
  d.capsule({ mat: RU, z: z + 0.2, group: g, shade }, l.low, v(l.paw.x, l.paw.y + 2.6), 3, 2.4);
  paw(d, l.paw, z + 0.3, g, shade);
}

function paw(d: Draw, p: V, z: number, g: string, shade: number) {
  d.ellipse({ mat: CR, z, group: g, shade }, v(p.x + 1.6, p.y + 1.6), 5, 2.6, 0);
  d.pixels({ mat: CR, z: z + 0.05, group: g }, [{ p: v(p.x + 3, p.y + 0.6), c: CR.ramp[2] }, { p: v(p.x + 4.6, p.y + 0.6), c: CR.ramp[2] }]);
}

/** The tail: long and even, carried out behind in a curve, ringed in black to a black tip. */
function tail(d: Draw, g: Cat, ang: number, z: number) {
  const p0 = g.B(-24.4, -1.2);
  const p1 = at(p0, ang - 20, 8), p2 = at(p1, ang - 8, 8), p3 = at(p2, ang + 14, 8), p4 = at(p3, ang + 40, 7);
  d.ribbon({ mat: RU, z, group: 'tail' }, [p0, p1, p2, p3, p4], [2.6, 2.6, 2.4, 2.4, 2.1]);
  const rings: [V, V][] = [[p1, p2], [p2, p3], [p3, p4]];
  for (const [a, b] of rings) {
    const m = v((a.x + b.x) / 2, (a.y + b.y) / 2), r = Math.atan2(b.y - a.y, b.x - a.x) * 57.29578 + 90;
    d.line({ mat: SK, z: z + 0.1, group: 'tail', line: 'none' }, at(m, r, 2.2), at(m, r, -2.2), SK.ramp[1]);
  }
  d.ribbon({ mat: SK, z: z + 0.15, group: 'tail', line: 'none' }, [v((p3.x + p4.x) / 2, (p3.y + p4.y) / 2), p4], [2.2, 2]);
}

/** The neck: thick and short, russet, cream at the throat, two black stripes. */
function neck(d: Draw, g: Cat, z: number) {
  const a = g.neck;
  const f = d.frame(at(g.withers, a, -6), a);
  const L = D.neck + 5;
  d.poly({ mat: RU, z, group: 'neck' }, [f(-2, 12), f(L * 0.5, 10), f(L, 6.6), f(L, -5.6), f(L * 0.5, -10.4), f(0, -14)], { kind: 'cyl', a: f(0, 0), b: f(L, 0), r: 11, bevel: 1.2 });
  d.poly({ mat: CR, z: z + 0.1, group: 'neck', line: 'none' }, [f(L, -2), f(L, -5.6), f(L * 0.5, -10.4), f(0, -14), f(0, -8), f(L * 0.5, -5.6)], { kind: 'cyl', a: f(0, 0), b: f(L, 0), r: 10 });
  for (const u of [0.25, 0.6]) d.line({ mat: SK, z: z + 0.2, group: 'neck', line: 'none' }, f(L * u, 9.6), f(L * u + 1, 2.6), SK.ramp[1]);
}

/** The head (u along the muzzle, w up), scaled by k: round, a short broad muzzle, white cheeks flaring back, black bars on the brow and cheek, a pink nose, an amber eye; p.jaw opens it on white fangs. */
function head(d: Draw, Hd: (u: number, w: number) => V, snout: number, P: Record<string, number>, z: number, k: number) {
  const H = (u: number, w: number) => Hd(u * k, w * k);
  const g = 'head' + Math.round(z);
  const jaw = P.jaw ?? 0;
  const th = -jaw * 0.7, hu = 0.4, hw = -2.2;
  const J = (u: number, w: number) => {
    const du = u - hu, dw = w - hw;
    return H(hu + du * Math.cos(th) - dw * Math.sin(th), hw + du * Math.sin(th) + dw * Math.cos(th));
  };
  if (jaw > 0.05) {
    d.poly({ mat: CR, z: z - 0.2, group: g + 'm', color: E.mouthRed, line: 'none' }, [H(0.8, -1.8), H(10, -1.4), J(9.6, -2.6), J(1.4, -3)]);
    d.poly({ mat: CR, z: z - 0.1, group: g + 'j' }, [J(0.4, -2.2), J(9.8, -2.4), J(10, -3.8), J(7, -5), J(2.2, -5.2)], { kind: 'bevel', w: 1.2 * k });
    d.pixels({ mat: CR, z: z + 0.4, group: g + 'j' }, [{ p: H(9, -2), c: E.white }, { p: H(9, -3), c: E.white }, { p: H(9, -4), c: E.white }, { p: J(8.4, -2.4), c: E.white }, { p: J(8.4, -1.4), c: E.white }]);
  }
  d.ellipse({ mat: RU, z, group: g }, H(-1, 1.4), 7.4 * k, 6.6 * k, snout);
  // the white ruff of the cheek
  d.poly({ mat: CR, z: z + 0.02, group: g, line: 'none' }, [H(2, -1), H(0, -4.6), H(-3.6, -6.8), H(-5, -4.8), H(-8, -5.8), H(-7.6, -3), H(-9.6, -2.4), H(-6.6, -0.2), H(-2, 0.6)], { kind: 'bevel', w: 1.2 * k });
  // the short, broad muzzle
  d.poly({ mat: RU, z: z + 0.05, group: g }, [H(1, 4.6), H(5, 3.8), H(9, 2.8), H(10.6, 1), H(10.4, -1.2), H(8.6, -2.4), H(4, -2.8), H(0, -2.4)], { kind: 'dome', c: H(4.6, 1), r: 7.5 * k, bevel: 1 });
  d.poly({ mat: CR, z: z + 0.08, group: g, line: 'none' }, [H(2, -0.2), H(6, -0.2), H(9.8, -0.4), H(10.4, -1.2), H(8.6, -2.4), H(4, -2.8), H(1, -2.4)], { kind: 'bevel', w: 1 * k });
  if (jaw <= 0.05) d.poly({ mat: CR, z: z + 0.04, group: g + 'j' }, [H(0.6, -2.4), H(8.8, -2.4), H(8.2, -3.8), H(4, -4.4), H(1, -4.2)], { kind: 'bevel', w: 1 * k });
  d.ellipse({ mat: MAT.earPink, z: z + 0.3, group: g + 'n' }, H(10.2, 0.8), 1.4 * k, 1.1 * k, snout);
  const px: { p: V; c: RGBA }[] = [];
  const S = SK.ramp[1];
  // black bars: the brow, the crown, the cheek
  for (const [u, w] of [[-3.6, 6.2], [-3.2, 5], [-0.4, 7], [-0.2, 5.8], [2.2, 5.6], [-5.6, 1.2], [-4.4, 0.6], [-6.2, -1], [-5, -1.4]] as const) px.push({ p: H(u, w), c: S });
  if (jaw <= 0.05) for (const u of [5, 8]) px.push({ p: H(u, -2.5), c: CR.ramp[2] });
  if (P.dead) px.push({ p: H(4, 2), c: S }, { p: H(5, 1.8), c: S });
  else px.push({ p: H(4.2, 2.2), c: E.eyeAmber }, { p: H(5, 2.1), c: INK.eye }, { p: H(3.4, 3.2), c: S }, { p: H(4.6, 3.4), c: S });
  d.pixels({ mat: RU, z: z + 0.35, group: g }, px);
}

/** A small round ear, black behind and pale inside. */
function ear(d: Draw, Hd: (u: number, w: number) => V, side: 'N' | 'F', z: number, k: number) {
  const c = side === 'N' ? Hd(-3.6 * k, 6.2 * k) : Hd(-0.8 * k, 6.6 * k);
  d.circle({ mat: RU, z, group: 'ear' + side, shade: side === 'F' ? -1 : 0 }, c, 2.3 * k);
  if (side === 'N') d.circle({ mat: CR, z: z + 0.1, group: 'ear' + side, line: 'none' }, v(c.x + 0.6, c.y - 0.2), 1.1 * k);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const cat = (o: Partial<Pose> & { p?: Record<string, number> }, paws: [number, number, number, number] = [9, 12, -27, -24], lift: [number, number, number, number] = [0, 0, 0, 0]) =>
  pose({
    ...o,
    x: BACK + (o.x ?? 0),
    armN: { ik: v(paws[0], 1.6 + lift[0]) },
    armF: { ik: v(paws[1], 1.6 + lift[1]) },
    legN: { ik: v(paws[2], 1.6 + lift[2]) },
    legF: { ik: v(paws[3], 1.6 + lift[3]) },
  });

const IDLE: Pose = cat({ torso: 2, head: 32, p: { snout: -8, jaw: 0, tail: 150 } });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return cat({ y: -b, torso: 2, head: 32 - b, p: { snout: -8 + b, jaw: 0, tail: 176 + Math.round(Math.sin(a) * 4) } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const paw = (base: number, ph: number, reach: number, lift: number): [number, number] => {
    const s = Math.sin(ph);
    return [base - reach * Math.cos(ph), s > 0 ? lift * s : 0];
  };
  const [fNx, fNy] = paw(10, a, 11, 7), [fFx, fFy] = paw(12, a + 0.7, 11, 7);
  const [hNx, hNy] = paw(-26, a + Math.PI, 11, 6), [hFx, hFy] = paw(-24, a + Math.PI + 0.7, 11, 6);
  const bob = Math.round(Math.sin(2 * a) * 1.5);
  return cat({ y: bob - 2, torso: Math.round(Math.sin(a + 0.6) * 3), head: 22 + Math.round(Math.sin(a) * 3), p: { snout: -6, jaw: 0.15, tail: 172 + Math.round(Math.sin(a) * 6) } }, [fNx, fFx, hNx, hFx], [fNy, fFy, hNy, hFy]);
}

// Claw Rake: she rears a little, the near paw comes down across the enemy, then the far one.
const RK_REAR = cat({ x: -3, y: 3, torso: 14, head: 30, p: { snout: -4, jaw: 0.6, tail: 165 } }, [12, 11, -24, -21], [17, 0, 0, 0]);
const RK_ONE = cat({ x: 5, y: -2, torso: 0, head: 18, p: { snout: -8, jaw: 0.9, tail: 172 } }, [27, 13, -24, -21], [4, 0, 0, 0]);
const RK_REAR2 = cat({ x: 3, y: 3, torso: 12, head: 26, p: { snout: -4, jaw: 0.6, tail: 168 } }, [18, 17, -24, -21], [0, 18, 0, 0]);
const RK_TWO = cat({ x: 7, y: -3, torso: -2, head: 16, p: { snout: -10, jaw: 0.9, tail: 176 } }, [20, 30, -22, -19], [0, 4, 0, 0]);
const RK_HOLD = tweak(RK_TWO, { p: { jaw: 0.2 } });

// Blood Pounce: she sinks, leaps, comes down with her jaws on the target and wrenches.
const PO_GATHER = cat({ x: -5, y: -9, torso: -5, head: 16, p: { snout: -16, jaw: 0.1, tail: 158 } }, [7, 10, -29, -26]);
const PO_LAUNCH = cat({ x: 2, y: 2, torso: 16, head: 30, p: { snout: 2, jaw: 0.5, tail: 178 } }, [17, 20, -33, -30], [8, 7, 0, 0]);
const PO_FLY = cat({ x: 2, y: 5, torso: 4, head: 18, p: { snout: -2, jaw: 1, tail: 186 } }, [25, 27, -37, -34], [10, 9, 8, 7]);
const PO_REACH = cat({ x: 3, y: 2, torso: -6, head: 14, p: { snout: -6, jaw: 1, tail: 178 } }, [23, 25, -31, -28], [5, 4, 9, 8]);
const PO_BITE = cat({ x: 4, y: -4, torso: -8, head: 10, p: { snout: -8, jaw: 0, tail: 170 } }, [17, 20, -24, -21]);
const PO_DOWN = cat({ x: 1, y: -5, torso: -7, head: 0, p: { snout: -32, jaw: 0.05, tail: 162 } }, [17, 20, -25, -22]);
const PO_LET = cat({ x: -3, y: -1, torso: 0, head: 26, p: { snout: -10, jaw: 0.3, tail: 150 } }, [13, 16, -27, -24]);

const HURT = cat({ x: -4, y: -1, torso: -4, head: 24, p: { snout: -22, jaw: 0.4, tail: 130 } }, [7, 10, -29, -26]);
const DEATH_SAG = cat({ x: -2, y: -11, torso: -6, head: 14, p: { snout: -20, jaw: 0.1, tail: 130 } }, [14, 17, -24, -21]);
const DEATH_DOWN = cat({ y: -20, torso: 0, head: -6, p: { snout: -4, jaw: 0, tail: 176, dead: 1, lie: 1 } }, [25, 28, -7, -4]);

// Victory: she lifts her head and roars, one long note.
const VIC_A = cat({ torso: 6, head: 60, p: { snout: 42, jaw: 0.6, tail: 140 } });
const VIC_B = tweak(VIC_A, { head: 62, p: { snout: 48, jaw: 0.85 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'war_tigress',
  name: 'War Tigress',
  dims: D,
  build,
  footprint: 1.9,
  anims: {
    idle: { loop: true, frames: cycle(8, 190, idle) },
    run: { loop: true, frames: cycle(8, 72, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RK_REAR, 1, 90),
        ...keys([
          [RK_REAR, 170],
          [RK_ONE, 80, { hit: true }],
          [RK_REAR2, 130],
          [RK_TWO, 80, { hit: true }],
          [RK_HOLD, 170],
        ]),
        ...tween(D, RK_HOLD, IDLE, 2, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, PO_GATHER, 1, 100),
        ...keys([
          [PO_GATHER, 280],
          [PO_LAUNCH, 90, { event: 'jump' }],
          [PO_FLY, 120],
          [PO_REACH, 110],
          [PO_BITE, 100, { hit: true }],
          [PO_DOWN, 140],
          [PO_BITE, 110],
          [PO_DOWN, 120],
          [PO_LET, 160],
        ]),
        ...tween(D, PO_LET, IDLE, 2, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: BACK - 3, torso: -3, head: 28 }), 110],
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
        [tweak(DEATH_DOWN, { y: -20.5 }), 600],
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

function iconHead(d: Draw, at0: V, snout: number, P: Record<string, number>, k: number) {
  const Hd = d.frame(at0, snout);
  ear(d, Hd, 'F', 8, k);
  head(d, Hd, snout, P, 10, k);
  ear(d, Hd, 'N', 12, k);
}

/** Three claw marks, screen space. */
function claws(b: { set(x: number, y: number, c: RGBA): void }, x: number, y: number, n: number) {
  for (let k = 0; k < 3; k++) for (let i = 0; i < n; i++) {
    b.set(x + k * 7 - Math.round(i * 0.35), y + i, E.white);
    b.set(x + k * 7 + 1 - Math.round(i * 0.35), y + i, i < 3 || i > n - 3 ? MAT.steel.ramp[4] : E.white);
  }
}

export const warTigress: ChampionArt = {
  char,
  iconBg: RU,
  icons: {
    claw_rake: () => compose(HA, glyph(() => undefined), (b) => claws(b, 13, 7, 26)),
    blood_pounce: () => compose(RD, glyph((d) => iconHead(d, v(13, 20), -4, { jaw: 0.9 }, 1.7))),
    scent_of_blood: () => compose(RU, glyph((d) => iconHead(d, v(12, 19), 0, { jaw: 0 }, 1.8))),
  },
};
