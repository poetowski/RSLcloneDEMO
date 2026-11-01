// The Verdant Luminary (Jakub's brief, docs/DESIGN_DECISIONS.md section 60,
// 2026-11-01): an Elite Support of the Azure Crown, a forest nymph with a sword and a
// bag on her back (first a shortbow; Jakub's correction the same day) and a big bow in
// her hand, born in the kingdom and raised on government money to represent it toward the green races. So two things at once:
// a nymph (skin pale as birch, long copper hair with leaves in it, pointed ears,
// bare feet, a skirt of green leaves) in the Crown's service, and its blue is what you
// see first (Jakub's word, the same day): a blue bodice, tabard and shoulder caps edged
// in gold, the gold crown large on the chest and again on the tabard,
// a thin gold circlet, gold on the great bow. The great bow is taller than she is,
// grown rather than cut, longer above the grip than below, a leaf sprouting from each limb, its tips capped in gold and a
// blue ribbon at the grip: the far hand holds it, the near hand draws, as with the
// Archer. The sword, sheathed, crosses her back over her hair, its hilt past her
// shoulder, and a leather bag with the Crown's blue flap rides at the small of it. Her
// affinity (Bloom) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, limbOf, torsoPts } from '../parts.ts';
import { at, D2R, Dims, Draw, lerpPose, pose, Pose, Skel, solve, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16.4,
  shin: 16.6,
  ankleH: 2.6,
  footLen: 5.2,
  spine: 20,
  neck: 6.2,
  upperArm: 12,
  foreArm: 11.4,
  shoulderDrop: 3.6,
  shoulderN: -2.4,
  shoulderF: 2.8,
  hipN: -1.6,
  hipF: 1.6,
};

const SK = MAT.skinNymph, GR = MAT.green, HR = MAT.hairGinger, BL = MAT.blue, GO = MAT.gold, WD = MAT.wood, BK = MAT.bark, DL = MAT.darkleather, LE = MAT.leather, HN = MAT.bone, IR = MAT.iron;
const E = ACCENT;

/** The great bow: grip to the upper tip, grip to the lower; the string's rest behind the grip; how far a full draw takes it. */
const UP = 42, LOW = 29, BRACE = 4, DRAW = 15;
/** Her long arrow, nock to point. */
const ARROW = 25;

const angle = (a: V, b: V) => Math.atan2(b.y - a.y, b.x - a.x) / D2R;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const nocked = (P.nock ?? 0) >= 0.5 && !P.drop;
  const wave = P.wave ?? 0;

  hairBack(d, s, wave, 3);
  swordAndBag(d, s, 5);

  // far leg, far arm (her bow arm)
  bareLeg(d, s, 'F', 10, -1);
  arm(d, s, 'F', armCfg(20, -1));
  goldBand(d, s.eF, s.hF, 20.5, -1, 'F');
  shoulderCap(d, s.sF, s.eF, 20.6, -1, 'F');

  torso(d, s, 30);
  head(d, s, P, wave);

  // the great bow before her, in her far hand or fallen; the arrow on the string
  if (P.drop) greatBow(d, v(4, 3.4), 2, 0, null, 44, 0.22);
  else {
    const nockP = nocked ? s.hN : null;
    greatBow(d, s.hF, P.bowAng ?? 94, nocked ? P.draw ?? 0 : 0, nockP, 44);
    d.ellipse({ mat: SK, z: 44.5, group: 'gripF', shade: -1 }, d.frame(s.hF, P.bowAng ?? 94)(0, -1), 2, 1.6, P.bowAng ?? 94);
    if (nockP && (P.arrow ?? 0) >= 0.5) arrow(d, nockP, P.aimAng ?? 0, 59);
  }

  bareLeg(d, s, 'N', 50, 0);
  skirt(d, s, wave, 52);
  tabard(d, s, 53);
  arm(d, s, 'N', armCfg(60, 0));
  goldBand(d, s.eN, s.hN, 60.5, 0, 'N');
  shoulderCap(d, s.sN, s.eN, 60.6, 0, 'N');
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

/** A long bare leg and a slim bare foot. */
function bareLeg(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const L = limbOf(s, side);
  const o = { mat: SK, group: 'leg' + side, shade };
  d.capsule({ ...o, z }, L.hip, L.kn, 3.3, 2.5);
  d.capsule({ ...o, z: z + 0.1 }, L.kn, L.an, 2.4, 1.5);
  const f = d.frame(L.an, L.foot);
  d.poly({ ...o, z: z + 0.3 }, [f(-1.5, 1.4), f(-2.1, -0.4), f(-1.9, -2.4), f(4.6, -2.4), f(5.8, -1.7), f(3.4, -0.7), f(1.3, 1.2)], { kind: 'bevel', w: 1.2 });
}

const armCfg = (z: number, shade: number) => ({
  upper: SK, fore: SK, hand: SK, rUp: [2.3, 2.0] as [number, number], rLo: [2.0, 1.6] as [number, number], rHand: 1.6, z, shade,
});

/** A thin gold band at the wrist: the Crown pays for it. */
function goldBand(d: Draw, el: V, ha: V, z: number, shade: number, side: string) {
  const a = angle(el, ha);
  const c = at(ha, a, -3.4);
  d.line({ mat: GO, z, group: 'band' + side, line: 'none' }, at(c, a + 90, 2), at(c, a - 90, 2), GO.ramp[shade < 0 ? 3 : 4]);
}

/** The Crown's gold crown, pixel by pixel so it stays crisp: three points over a band. */
function crownMark(d: Draw, c: V, z: number, group: string) {
  const x0 = Math.floor(c.x), y0 = Math.floor(c.y), R = GO.ramp;
  const px: { p: V; c: (typeof R)[number] }[] = [];
  const cells = [[-2, -2, 5], [0, -2, 5], [2, -2, 5], [-2, -1, 4], [-1, -1, 4], [0, -1, 5], [1, -1, 4], [2, -1, 4], [-2, 0, 4], [-1, 0, 4], [0, 0, 4], [1, 0, 4], [2, 0, 4], [-2, 1, 3], [-1, 1, 3], [0, 1, 3], [1, 1, 3], [2, 1, 3]];
  for (const [dx, dy, k] of cells) px.push({ p: v(x0 + dx + 0.5, y0 - dy + 0.5), c: R[k] });
  d.pixels({ mat: GO, z, group, line: 'none', outline: false }, px);
}

/** The bodice: the Crown's blue, narrow at the waist, a gold neckline and belt, the gold crown large on the chest. */
function torso(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 5.0, 5.0],
    [4, 4.2, 4.4],
    [8.5, 4.4, 5.2],
    [12.5, 4.8, 6.0],
    [15.6, 5.0, 5.4],
    [18, 3.8, 3.0],
    [19.6, 2.2, 1.8],
  ]);
  d.poly({ mat: BL, z, group: 'bodice' }, body, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(19.6, 0.6), r: 5.8, bevel: 1.2 });
  // the bare shoulders and throat above it, the gold along its edge
  d.poly({ mat: SK, z: z + 0.2, group: 'throat' }, [s.T(20.2, -2.6), s.T(20.2, 2.4), s.T(17.4, 3.8), s.T(17, -3.6)], { kind: 'bevel', w: 0.8 });
  d.line({ mat: GO, z: z + 0.3, group: 'neckline', line: 'none' }, s.T(17.2, -3.6), s.T(17.4, 4), GO.ramp[4]);
  d.poly({ mat: GO, z: z + 0.4, group: 'belt' }, [s.T(3.6, -4.6), s.T(3.8, 4.8), s.T(2.2, 4.8), s.T(2.0, -4.8)], { kind: 'bevel', w: 0.7 });
  crownMark(d, s.T(11, 2.6), z + 0.5, 'chestMark');
}

/** The skirt of leaves, to the top of the thigh: four broad pointed leaves lapping one another, each with a light midrib; they stir with her. */
function skirt(d: Draw, s: Skel, wave: number, z: number) {
  const sw = Math.sin(wave) * 0.5;
  const hem: [number, number][] = [[-7, -11], [-2.6, -13.6], [2, -13.2], [6.2, -10.6]];
  hem.forEach(([w, u], i) => {
    const root = s.T(2.4, w * 0.6), tip = s.T(u, w * 1.1 + sw);
    d.ribbon({ mat: GR, z: z + i * 0.02, group: 'leafskirt' + i, line: 'soft' }, [root, s.T((2.4 + u) * 0.5, w + sw * 0.5), tip], [3, 3.2, 0.5]);
    d.line({ mat: GR, z: z + i * 0.02 + 0.01, group: 'leafskirt' + i, line: 'none' }, s.T(-1, w * 0.84), s.T(u + 3, w * 1.06 + sw), GR.ramp[5]);
  });
}

/** The Crown's blue tabard hanging from the belt over the leaves, nearly to the end of them, gold at its edges and hem, the crown on it. */
function tabard(d: Draw, s: Skel, z: number) {
  d.poly({ mat: BL, z, group: 'tabard' }, [s.T(2.4, -4), s.T(2.4, 5), s.T(-11.6, 5.4), s.T(-14.2, 0.6), s.T(-11.6, -4.4)], { kind: 'cyl', a: s.T(-14, 0.4), b: s.T(2.4, 0.4), r: 5.4, bevel: 1 });
  for (const w of [-4.2, 5.2]) d.line({ mat: GO, z: z + 0.05, group: 'tabard', line: 'none' }, s.T(1.6, w), s.T(-11, w), GO.ramp[w > 0 ? 4 : 3]);
  d.line({ mat: GO, z: z + 0.05, group: 'tabard', line: 'none' }, s.T(-11.8, 5.2), s.T(-14, 0.6), GO.ramp[4]);
  d.line({ mat: GO, z: z + 0.05, group: 'tabard', line: 'none' }, s.T(-14, 0.6), s.T(-11.8, -4.2), GO.ramp[3]);
  crownMark(d, s.T(-5.4, 0.6), z + 0.1, 'tabardMark');
}

/** A cap of the Crown's blue over the shoulder, a gold edge. */
function shoulderCap(d: Draw, sh: V, el: V, z: number, shade: number, side: string) {
  const a = angle(sh, el), c = at(sh, a, 2.6);
  d.ellipse({ mat: BL, z, group: 'cap' + side, shade }, c, 4.6, 3.8, a);
  const rim = at(sh, a, 6.2);
  d.line({ mat: GO, z: z + 0.05, group: 'cap' + side, line: 'none' }, at(rim, a + 90, 3), at(rim, a - 90, 3), GO.ramp[shade < 0 ? 3 : 4]);
}

/** The long hair down her back to the waist: three locks close along her back, copper, their ends flicking out behind, a lighter strand on each. */
function hairBack(d: Draw, s: Skel, wave: number, z: number) {
  const H = s.H, T = s.T;
  const w = Math.sin(wave);
  const locks: [V, number, number][] = [[H(-6.8, 2), -8.4, -2], [H(-5.4, 5), -6.8, -6], [H(-3.6, 7), -5, -9]];
  locks.forEach(([from, back, end], i) => {
    const sway = w * (0.5 + i * 0.2);
    const pts = [from, T(18, back), T(11, back - 0.6 + sway * 0.4), T(4 + i, back - 0.8 + sway * 0.8), T(end, back - 3.6 + sway * 1.3)];
    d.ribbon({ mat: HR, z: z + i * 0.02, group: 'hairB' + i, line: i === 0 ? undefined : 'soft' }, pts, [2.6, 2.8, 2.6, 1.7, 0.4]);
    d.line({ mat: HR, z: z + i * 0.02 + 0.01, group: 'hairB' + i, line: 'none' }, T(16, back + 0.4), T(6 + i, back - 0.2 + sway * 0.6), HR.ramp[i === 2 ? 5 : 4]);
  });
}

/** Her head: a soft profile, the pointed ear through the hair, the hair swept over the crown and a lock falling past the ear, a thin gold circlet, a leaf in it. */
function head(d: Draw, s: Skel, P: Record<string, number>, wave: number) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.0, 1.9);
  face(d, s, { skin: SK, z: 38, ear: 'none', brow: HR.ramp[2], browStyle: P.grit ? 'angry' : 'calm', mouth: P.grit ? 'shout' : 'line', lip: MAT.earPink.ramp[2], rx: 5.4, ry: 6.2, profile: 'soft' });
  // the hair over the crown, swept back from a fringe at the brow
  d.poly({ mat: HR, z: 38.6, group: 'hairTop' }, [H(5.6, 2.6), H(5.8, 4.8), H(3.8, 7.4), H(-0.6, 8.8), H(-5, 7.8), H(-7.6, 4), H(-8, -1), H(-6.4, -5), H(-4, -4), H(-3.2, 0), H(-0.6, 2.8), H(2.4, 3.8)], { kind: 'dome', c: H(-1, 3.6), r: 8.6, bevel: 1 });
  d.line({ mat: HR, z: 38.65, group: 'hairTop', line: 'none' }, H(2.4, 6.8), H(-2.6, 7.4), HR.ramp[4]);
  // the lock falling before her ear, in front of the shoulder
  const sw = Math.sin(wave) * 0.4;
  d.ribbon({ mat: HR, z: 38.7, group: 'hairLock', line: 'soft' }, [H(0, 2.6), H(0.4, -3), H(0 + sw, -8), H(0.6 + sw, -12.5)], [1.2, 1.4, 1.1, 0.4]);
  // the pointed ear, up and back through the hair
  d.poly({ mat: SK, z: 38.8, group: 'ear' }, [H(-1.6, -1.8), H(-2.6, 1.4), H(-10.4, 6), H(-4.8, -0.6), H(-3.2, -2.6)], { kind: 'bevel', w: 0.9 });
  // the thin gold circlet across the brow
  d.ribbon({ mat: GO, z: 38.9, group: 'circlet', line: 'none' }, [H(-6.6, 4.6), H(-1.6, 4.8), H(2.4, 4.4), H(5.6, 3.4)], [0.7, 0.7, 0.7, 0.7]);
  // a young leaf in her hair, at the back of the circlet
  d.ribbon({ mat: GR, z: 39.1, group: 'hairLeaf', line: 'soft' }, [H(-4.6, 7), H(-6.4, 9.6), H(-9, 10.6)], [0.8, 1.5, 0.4]);
}

/** On her back, over her hair: the sword in its dark scabbard, slanting, its hilt past her shoulder; the leather bag at the small of her back, a blue flap, a gold clasp. */
function swordAndBag(d: Draw, s: Skel, z: number) {
  const T = s.T;
  const guard = T(23, -14), pommel = T(30, -17.4), chape = T(-7, -1.6);
  d.capsule({ mat: DL, z, group: 'scabbard' }, guard, chape, 1.6, 1.2);
  d.line({ mat: GO, z: z + 0.02, group: 'scabbard', line: 'none' }, T(6, -6.8), T(5, -5.4), GO.ramp[4]);
  d.capsule({ mat: LE, z: z + 0.05, group: 'hilt' }, guard, pommel, 1, 1);
  d.capsule({ mat: GO, z: z + 0.06, group: 'guard' }, T(23.8, -11.4), T(22.2, -16.6), 1, 1);
  d.ellipse({ mat: GO, z: z + 0.07, group: 'pommel' }, pommel, 1.5, 1.5, 0);
  // the bag
  d.poly({ mat: LE, z: z + 0.2, group: 'bag' }, [s.T(8.4, -6), s.T(8.8, -13), s.T(4, -15), s.T(-3, -14.6), s.T(-4.4, -11), s.T(-3.4, -6)], { kind: 'bevel', w: 1.4 });
  d.poly({ mat: BL, z: z + 0.25, group: 'bagFlap' }, [s.T(9, -6), s.T(9.4, -13.4), s.T(4.6, -15.4), s.T(2.4, -11), s.T(3.4, -6)], { kind: 'bevel', w: 1 });
  d.ellipse({ mat: GO, z: z + 0.3, group: 'bagClasp' }, s.T(3.4, -11), 1.1, 1.1, 0);
}

/**
 * The great bow, living wood: longer above the grip than below, thick at the grip and
 * thin at the tips, a leaf sprouting from each limb, capped in gold, a blue ribbon at
 * the grip; the string straight between the tips or drawn back to `nockP`. `ang` is
 * its axis (the upper limb's way), `draw` bends it, `lie` flattens it on the ground.
 */
function greatBow(d: Draw, grip: V, ang: number, draw: number, nockP: V | null, z: number, lie = 1) {
  const f0 = d.frame(grip, ang); // u toward the upper tip, w toward the string
  const f = (u: number, w: number) => f0(u, w * lie);
  const back = 8 + draw * 4;
  const tipU = f(UP, back - 1.2), tipL = f(-LOW, back - 1.2);
  d.ribbon(
    { mat: BK, z, group: 'greatBow', tex: (h) => (h.v > 0.35 ? -1 : 0) },
    [f(-LOW - 2.4, back - 4), tipL, f(-20, back * 0.62), f(-9, back * 0.14), f(0, 0), f(12, back * 0.14), f(29, back * 0.62), tipU, f(UP + 2.4, back - 4)],
    [0.7, 0.9, 1.3, 1.6, 1.9, 1.6, 1.3, 0.9, 0.7],
  );
  // the gold caps
  d.capsule({ mat: GO, z: z + 0.1, group: 'capU' }, f(UP - 1.6, back - 1.2), f(UP + 2.4, back - 4), 1.1, 0.8);
  d.capsule({ mat: GO, z: z + 0.1, group: 'capL' }, f(-LOW + 1.6, back - 1.2), f(-LOW - 2.4, back - 4), 1.1, 0.8);
  // a leaf from each limb
  if (lie === 1) {
    d.ribbon({ mat: GR, z: z + 0.15, group: 'bowLeafU', line: 'soft' }, [f(20, back * 0.34 - 1), f(23, -3), f(25, -6.4)], [0.8, 1.7, 0.4]);
    d.ribbon({ mat: GR, z: z + 0.15, group: 'bowLeafL', line: 'soft' }, [f(-14, back * 0.3 - 1), f(-16.4, -2.4), f(-18, -5)], [0.8, 1.4, 0.4]);
  }
  // the blue ribbon at the grip, its end hanging straight down
  d.capsule({ mat: BL, z: z + 0.2, group: 'bowGrip' }, f(-2.6, 0), f(2.6, 0), 1.6, 1.6);
  if (lie === 1) {
    const g = f(-2.4, 0.6);
    d.ribbon({ mat: BL, z: z + 0.25, group: 'bowRibbon', line: 'soft' }, [g, v(g.x - 1, g.y - 4), v(g.x - 0.4, g.y - 8)], [0.9, 1, 0.6]);
  }
  const so = { mat: HN, z: z - 0.5, group: 'string', outline: false, line: 'none' as const };
  if (nockP) {
    d.line(so, tipU, nockP, E.string);
    d.line(so, nockP, tipL, E.string);
  } else d.line(so, tipU, tipL, E.string);
}

/** Her long arrow on the string: the pale shaft, a gold head, green fletching. */
function arrow(d: Draw, nockP: V, aim: number, z: number) {
  const tip = at(nockP, aim, ARROW);
  d.line({ mat: WD, z, group: 'arrow', line: 'none' }, at(nockP, aim, 0.5), at(nockP, aim, ARROW - 2.4), WD.ramp[5]);
  const hf = d.frame(tip, aim);
  d.poly({ mat: GO, z: z + 0.2, group: 'arrowHead' }, [hf(1.4, 0), hf(-2.6, 1.4), hf(-1.8, 0), hf(-2.6, -1.4)], { kind: 'bevel', w: 1 });
  const fl = (u: number, w: number) => at(at(nockP, aim, u), aim + 90, w);
  d.pixels({ mat: GR, z: z + 0.1, group: 'fletch', outline: false, line: 'none' }, [
    { p: fl(1.8, 1), c: GR.ramp[5] }, { p: fl(3.0, 1), c: GR.ramp[4] },
    { p: fl(1.8, -1), c: GR.ramp[4] }, { p: fl(3.0, -1), c: GR.ramp[3] },
  ]);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const REST = { bowAng: 94, draw: 0, arrow: 0, nock: 0, aimAng: 0 };

/** Her near hand on her hip, the elbow out behind her. */
const onHip = (b: Pose): Pose => tweak(b, { armN: { ik: solve(b, D).T(0.5, 5), bend: -1 } });

/** Idle: at ease, the great bow upright in her far hand, the near hand on her hip. */
const IDLE: Pose = onHip(pose({
  torso: 87,
  head: 90,
  legN: { ik: v(-6, 2.6) },
  legF: { ik: v(6, 2.6) },
  armF: { up: -62, lo: -22 },
  p: REST,
}));

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return onHip(tweak(IDLE, {
    y: -b,
    armF: { up: -62 + b, lo: -22 + b },
    p: { bowAng: 94 - b * 0.5, wave: a },
  }));
}

/** Run: a long, light stride, the great bow carried slanting forward. */
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 2.6 + (sn > 0 ? 6.5 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 1.5,
    torso: 76,
    head: 84,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -86 + sw * 30, lo: -46 + sw * 32 },
    armF: { up: -56 - sw * 8, lo: -20 - sw * 8 },
    p: { ...REST, bowAng: 44 - sw * 6, wave: a * 2 },
  });
}

/** Feet set apart to shoot. */
const STANCE = pose({ torso: 88, head: 91, legN: { ik: v(-9, 2.6) }, legF: { ik: v(8.5, 2.6) }, p: REST });
/** Leaning back, to send the volley into the sky. */
const LEAN = { torso: 98, head: 104 };

/** The bow arm out along `aimAng`, the string hand drawn back by `draw` (0..1), an arrow on the string. */
function aim(base: Pose, aimAng: number, draw: number, extra: Partial<Pose> & { p?: Record<string, number> } = {}): Pose {
  const p = tweak(base, { ...extra, armF: { up: aimAng - 4, lo: aimAng + 1 } });
  const s = solve(p, D);
  const nock = at(s.hF, aimAng, -(BRACE + draw * DRAW));
  return tweak(p, { armN: { ik: nock, bend: 1 }, p: { ...(extra.p ?? {}), aimAng, bowAng: aimAng + 90, draw, arrow: 1, nock: 1 } });
}

/** Loosed: the string straight again, the drawing hand flung back past the nock. */
function release(base: Pose, aimAng: number, extra: Partial<Pose> & { p?: Record<string, number> } = {}): Pose {
  const p = tweak(base, { ...extra, armF: { up: aimAng + 2, lo: aimAng + 7 } });
  const s = solve(p, D);
  const hand = at(at(s.hF, aimAng, -(BRACE + DRAW + 2)), aimAng + 90, 3);
  return tweak(p, { armN: { ik: hand, bend: 1 }, p: { ...(extra.p ?? {}), aimAng, bowAng: aimAng + 94, draw: 0, arrow: 0, nock: 0 } });
}

const A1 = 2, A2 = 52;

const HURT = pose({
  x: -4, y: -1, torso: 98, head: 104,
  legN: { ik: v(-11, 2.6) }, legF: { ik: v(7, 3.6) }, footF: 10,
  armN: { up: -126, lo: -100 }, armF: { up: -44, lo: -10 },
  p: { ...REST, bowAng: 110, grit: 1 },
});
const DEATH_KNEEL = pose({
  y: -10, torso: 74, head: 58,
  legN: { ik: v(-14, 3.4) }, legF: { ik: v(8, 2.6) }, footN: -12,
  armN: { up: -96, lo: -86 }, armF: { up: -70, lo: -40 },
  p: { ...REST, bowAng: 20 },
});
const DEATH_FALL = pose({
  x: 2, y: -8, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { ...REST, drop: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -24, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { ...REST, drop: 1 },
});

/** Victory: the great bow lifted high in her far hand. */
const RAISE = pose({
  torso: 88, head: 94,
  legN: { ik: v(-6, 2.6) }, legF: { ik: v(6, 2.6) },
  armN: { up: -104, lo: -70 },
  armF: { up: 62, lo: 76 },
  p: { ...REST, bowAng: 92 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'verdant_luminary',
  name: 'Verdant Luminary',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 190, idle) },
    run: { loop: true, frames: cycle(8, 78, run) },
    // Envoy's Arrow: unhurried, the long draw held a beat
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, aim(STANCE, A1, 0), 0.5), 80],
        [aim(STANCE, A1, 0), 100],
        [aim(STANCE, A1, 0.55), 100],
        [aim(STANCE, A1, 1), 240],
        [release(STANCE, A1, { x: -1 }), 80, { event: 'shoot', hit: true }],
        [release(STANCE, A1 + 3, { x: -1, torso: 89 }), 160],
        [mid(release(STANCE, A1 + 3), IDLE, 0.5), 100],
        [IDLE, 100],
      ]),
    },
    // Crown's Mandate: she leans back and looses into the sky
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, aim(STANCE, A2, 0, LEAN), 0.5), 90],
        [aim(STANCE, A2, 0, LEAN), 110],
        [aim(STANCE, A2, 0.6, LEAN), 110],
        [aim(STANCE, A2, 1, LEAN), 280],
        [release(STANCE, A2, { ...LEAN, x: -1 }), 90, { event: 'shoot', hit: true }],
        [release(STANCE, A2 + 3, { ...LEAN, x: -1 }), 240],
        [mid(release(STANCE, A2 + 3, LEAN), IDLE, 0.5), 120],
        [IDLE, 120],
      ]),
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 95, head: 100 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [tweak(mid(HURT, DEATH_KNEEL, 0.5), { p: { bowAng: 46 } }), 110],
        [DEATH_KNEEL, 240],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -24.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, RAISE, 0.5), 110],
        [RAISE, 700],
        [mid(RAISE, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** The great bow upright, its back to the left, an arrow on it. */
function iconBow(d: Draw, x: number) {
  d.ribbon({ mat: BK, z: 3, group: 'bow' }, [v(x + 7, 37), v(x + 1, 28), v(x - 2, 20), v(x + 1, 11), v(x + 7, 3)], [0.9, 1.4, 2, 1.4, 0.9]);
  d.line({ mat: HN, z: 2, group: 'string', line: 'none', outline: false }, v(x + 7, 37), v(x + 7, 3), E.string);
  d.capsule({ mat: GO, z: 3.2, group: 'capU' }, v(x + 6, 36), v(x + 7, 38), 1.2, 0.9);
  d.capsule({ mat: GO, z: 3.2, group: 'capL' }, v(x + 6, 4), v(x + 7, 2), 1.2, 0.9);
  d.capsule({ mat: BL, z: 3.3, group: 'grip' }, v(x - 2, 17.6), v(x - 2, 22.4), 1.8, 1.8);
}

export const verdantLuminary: ChampionArt = {
  char,
  iconBg: GR,
  icons: {
    envoys_arrow: () =>
      compose(GR, glyph((d) => {
        iconBow(d, 12);
        d.line({ mat: WD, z: 4, group: 'arrow', line: 'none' }, v(19, 20), v(35, 20), WD.ramp[5]);
        d.poly({ mat: GO, z: 5, group: 'head' }, [v(39, 20), v(34, 22.4), v(34, 17.6)], { kind: 'bevel', w: 1 });
      })),
    crowns_mandate: () =>
      compose(BL, glyph((d) => {
        // arrows coming down, leaves among them
        for (const [x, y] of [[9, 30], [20, 34], [31, 28]] as const) {
          d.line({ mat: WD, z: 3, group: 'arrow' + x, line: 'none' }, v(x + 3, y), v(x - 2, y - 17), WD.ramp[5]);
          d.poly({ mat: GO, z: 4, group: 'head' + x }, [v(x - 3.4, y - 21), v(x - 3.8, y - 15.4), v(x + 0.2, y - 16.6)], { kind: 'bevel', w: 1 });
        }
        d.ribbon({ mat: GR, z: 5, group: 'leaf' }, [v(13, 9), v(19, 12), v(25, 9)], [0.6, 2.4, 0.6]);
      })),
    formal_protest: () =>
      compose(BL, glyph((d) => {
        // the Crown's seal, gold on the blue
        d.poly({ mat: GO, z: 3, group: 'crown' }, [v(8, 12), v(32, 12), v(35, 31), v(27, 21), v(20, 34), v(13, 21), v(5, 31)], { kind: 'bevel', w: 1.8 });
        d.poly({ mat: IR, z: 4, group: 'band' }, [v(9, 8), v(31, 8), v(31, 11), v(9, 11)], { kind: 'bevel', w: 1 });
      }), (b) => impactStar(b, 20, 12, 1, 5, 6, GO.ramp[4], E.white)),
  },
};
