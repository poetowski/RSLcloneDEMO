// Emissary Handlings (docs/DESIGN_DECISIONS.md section 22, Jakub's proposal
// of 2026-10-17): an Elite of the Azure Crown, a tall human in medium armour
// and a blue cloak, holding a flag banner, no other weapon, a proud look. So
// he is the Crown's emissary carrying its standard: tall and upright, his chin
// up, his free hand on his hip; a polished breastplate edged in gold over
// mail, pauldrons and vambraces of the same steel, a long bright-blue cloak
// with a gold crown at its clasp; the banner taller than he is (the silhouette
// feature): a pole with a gilded finial and a crossbar, the Crown's standard
// hanging from it, blue with a gold crown, a swallowtail hem and a gold fringe,
// rippling slowly. What the brief leaves open is a first take: the cut of the
// armour, his face and fair hair, the banner's shape and the finial. His
// affinity sets nothing here (affinities are abstract, Jakub, 2026-10-11): his
// strike leaves a plain white streak, and in fx/azure_crown.ts a dull flash
// and gold glints; the standard's light is its own gold.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { cape, leg, smear, torsoPts } from '../parts.ts';
import { add, angleOf, at, Dims, Draw, ease, lerpPose, lerpV, mul, pose, Pose, Skel, sub, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 35.5,
  thigh: 16.8,
  shin: 16.2,
  ankleH: 3,
  footLen: 7,
  spine: 23,
  neck: 7,
  upperArm: 13.6,
  foreArm: 12.6,
  shoulderDrop: 5,
  shoulderN: -3.6,
  shoulderF: 4.4,
  hipN: -2.2,
  hipF: 2.2,
};

const SK = MAT.skinLight, SV = MAT.steel, IR = MAT.iron, GD = MAT.gold, BL = MAT.blue, LP = MAT.lapis, CH = MAT.charcoal, DL = MAT.darkleather, WD = MAT.ebony, HR = MAT.hairBlonde;

/** The streak of the strike: plain white with the light of the steel, the colour of motion, not of an affinity. */
const SWING = { core: ACCENT.white, edge: MAT.steel.ramp[4] };

/** The banner's pole from its butt to the finial, where the near hand holds it when he swings or carries it, and the standard on its crossbar. */
const POLE = 82, GRIP = 40;
const FLAG = { w: 17, h: 23, drop: 5 };

interface Pole {
  foot: V;
  top: V;
  ang: number;
}

/**
 * Planted (`free` 0: its butt on the ground at `plant`, the near hand on the
 * pole) or carried (`free` 1: `poleAng` from the hand toward the finial, held
 * `grip` from the butt); between the two, blended.
 */
function poleAt(s: Skel, P: Record<string, number>): Pole {
  const free = Math.max(0, Math.min(1, P.free ?? 0));
  const carried = () => {
    const a = P.poleAng ?? 90, g = P.grip ?? GRIP;
    return { foot: at(s.hN, a, -g), top: at(s.hN, a, POLE - g) };
  };
  const planted = () => {
    const foot = v(P.plant ?? 14, 0.6);
    return { foot, top: at(foot, angleOf(sub(s.hN, foot)), POLE) };
  };
  const c = free >= 1 || P.plant === undefined ? carried() : free <= 0 ? planted() : (() => {
    const a = planted(), b = carried();
    return { foot: lerpV(a.foot, b.foot, free), top: lerpV(a.top, b.top, free) };
  })();
  return { ...c, ang: angleOf(sub(c.top, c.foot)) };
}

/** The far hand: on his hip (`hip` 1), or on the pole `two` px below the near hand (`twoK` 1), solved here so it stays there through every blend. */
function farHand(s: Skel, pole: Pole, P: Record<string, number>): { e: V; h: V; lo: number; on: boolean } {
  const k = Math.max(0, Math.min(1, P.twoK ?? 0));
  const hip = Math.max(0, Math.min(1, P.hip ?? 0));
  if (k < 0.01 && hip < 0.01) return { e: s.eF, h: s.hF, lo: s.loF, on: false };
  const onHip = s.T(4.6, -5.4);
  const target = k >= 0.01 ? lerpV(s.hF, at(s.hN, pole.ang, -(P.two ?? 8)), k) : lerpV(s.hF, onHip, hip);
  // on the hip the elbow points back, behind the body
  const r = ik(s.sF, target, P.bendF ?? -1);
  return { e: r.mid, h: r.end, lo: r.a2, on: k >= 0.5 };
}

function ik(root: V, target: V, bend: number) {
  const d0 = sub(target, root);
  const l1 = D.upperArm, l2 = D.foreArm;
  const d = Math.min(Math.max(Math.hypot(d0.x, d0.y), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.001);
  const base = angleOf(d0);
  const a = (Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) * 180) / Math.PI;
  const mid = at(root, base + bend * a, l1);
  const end = at(root, base, d);
  return { mid, end, a2: angleOf(sub(end, mid)) };
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const pole = poleAt(s, P);
  const prev = info.prev ? poleAt(info.prev, info.prev.pose.p) : undefined;
  const far = farHand(s, pole, P);

  // the streak of the strike behind everything, from the hand to the finial
  if (info.def.smear && prev && info.prev) {
    const a0 = angleOf(sub(prev.top, info.prev.hN)), a1 = angleOf(sub(pole.top, s.hN));
    smear(d, s.hN, P.sweep ?? a1 - (((a1 - a0 + 540) % 360) - 180), a1, POLE - (P.grip ?? GRIP) + 2, 12, SWING, 2);
  }

  // the long blue cloak hangs from the shoulders behind everything
  cape(d, s, { mat: BL, z: 3, len: 42, topU: 21.2, topBack: 6.2, topFront: 2.6, spread: 9, wind: P.cape ?? 0.08, wave: P.wave ?? 0 });

  // far leg
  leg(d, s, 'F', legCfg(10, -1));

  // far pauldron and the far arm behind the body: a mail sleeve, a vambrace, a gloved hand on the hip or on the pole
  pauldron(d, s, 'F', 19.4, -1);
  d.capsule({ mat: IR, z: 20, group: 'armF', shade: -1, tex: mail }, s.sF, far.e, 3.3, 2.9);
  d.capsule({ mat: SV, z: 20.1, group: 'armF', shade: -1 }, far.e, far.h, 2.8, 2.4);
  if (!far.on) d.ellipse({ mat: DL, z: 20.2, group: 'armF', shade: -1 }, far.h, 2.4, 2.1, far.lo);

  // torso: mail to the thighs, the breastplate over it, edged in gold, the gorget at the throat
  const mailPts = torsoPts(s, [
    [-2.4, 6.6, 7.0],
    [0, 6.6, 7.0],
    [4, 6.8, 7.6],
    [9, 7.2, 8.6],
    [14, 7.6, 9.6],
    [18.4, 7.8, 9.0],
    [21.2, 6.2, 5.6],
    [23.2, 3.6, 3.0],
  ]);
  d.poly({ mat: IR, z: 30, group: 'mail', tex: mail }, mailPts, { kind: 'cyl', a: s.T(0, 1), b: s.T(23, 1), r: 9, bevel: 1.2 });
  const plate = torsoPts(s, [
    [7.6, 6.8, 8.0],
    [10, 7.0, 9.0],
    [14, 7.4, 9.8],
    [18, 7.4, 9.2],
    [20.6, 5.8, 6.4],
  ]);
  d.poly({ mat: SV, z: 31, group: 'plate' }, plate, { kind: 'cyl', a: s.T(7.6, 1.4), b: s.T(20.6, 1.4), r: 9.4, bevel: 1.6 });
  // the keel of the breastplate catches the light; its rim is edged in gold
  d.line({ mat: SV, z: 31.1, group: 'plate', line: 'none' }, s.T(10, 6.8), s.T(18, 8.0), SV.ramp[5]);
  d.ribbon({ mat: GD, z: 31.2, group: 'plate', line: 'none' }, [s.T(7.8, 8.0), s.T(7.4, 3.0), s.T(7.4, -2.0), s.T(7.6, -6.8)], [0.6, 0.6, 0.6, 0.6]);
  d.ribbon({ mat: GD, z: 31.2, group: 'plate', line: 'none' }, [s.T(20.4, -5.6), s.T(20.9, 0), s.T(20.4, 6.2)], [0.6, 0.6, 0.6]);
  // a belt of dark leather with a gold buckle, over the mail
  d.poly({ mat: DL, z: 32, group: 'belt' }, [s.T(4.2, -7.0), s.T(4.4, 7.8), s.T(2.6, 7.6), s.T(2.4, -6.8)], { kind: 'cyl', a: s.T(0, 0), b: s.T(4.4, 0), r: 7.6 });
  d.poly({ mat: GD, z: 32.1, group: 'buckle' }, [s.T(4.6, 5.0), s.T(4.6, 8.0), s.T(2.2, 8.0), s.T(2.2, 5.0)], { kind: 'bevel', w: 1 });
  mailSkirt(d, s, 33);

  head(d, s, P);

  // near leg
  leg(d, s, 'N', legCfg(50, 0));

  // the banner, the far hand round its pole, the near arm over it, the near pauldron with the cloak's clasp
  banner(d, s, pole, prev, P, 55);
  if (far.on) d.ellipse({ mat: DL, z: 57.5, group: 'handF', shade: -1 }, far.h, 2.4, 2.1, pole.ang);
  nearArm(d, s, 60);
  pauldron(d, s, 'N', 62, 0);
  clasp(d, s, 63);
}

/** Mail at this scale: a fine checker of darker rings. */
const mail = (_h: unknown, x: number, y: number) => ((x + y) % 2 === 0 ? -1 : 0);

const legCfg = (z: number, shade: number) => ({
  thigh: CH, shin: DL, foot: DL, knee: SV, kneeR: 3.2, rThigh: [4.4, 3.6] as [number, number], rShin: [3.3, 2.7] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: DL, from: 0.18, r: [3.6, 3.2] as [number, number], cuff: DL },
});

/** The near arm: a mail sleeve under the pauldron, a vambrace of polished steel, a gloved hand on the pole. */
function nearArm(d: Draw, s: Skel, z: number) {
  d.capsule({ mat: IR, z, group: 'armN', tex: mail }, s.sN, s.eN, 3.4, 3.0);
  d.capsule({ mat: SV, z: z + 0.1, group: 'armN' }, s.eN, s.hN, 2.9, 2.5);
  d.capsule({ mat: SV, z: z + 0.15, group: 'armN' }, at(s.hN, s.loN, -4.4), at(s.hN, s.loN, -1.8), 2.9, 3.3, 0.3);
  d.ellipse({ mat: DL, z: z + 0.3, group: 'handN' }, s.hN, 2.6, 2.3, s.loN);
}

/** A pauldron of polished steel: two lames over the shoulder, the top one edged in gold. */
function pauldron(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  const g = 'paul' + side;
  const top = at(at(sh, up, 0.4), s.torso, 1.6);
  d.ellipse({ mat: SV, z, group: g + '0', shade, line: 'soft' }, top, 5.4, 4.0, up + 90, 0.15);
  d.ellipse({ mat: SV, z: z - 0.01, group: g + '1', shade, line: 'soft' }, at(top, up, 2.8), 4.8, 3.2, up + 90, 0.15);
  const rim = at(top, up, 3.6);
  d.capsule({ mat: GD, z: z + 0.01, group: g + '0', shade, line: 'none' }, at(rim, up + 90, 3.8), at(rim, up - 90, 3.8), 0.55, 0.55);
}

/** The cloak's clasp at the near shoulder: a small gold crown. */
function clasp(d: Draw, s: Skel, z: number) {
  const c = s.T(20.6, -1.6);
  const px: { p: V; c: RGBA }[] = [];
  for (const [dx, dy, k] of [[-1, 1, 5], [0, 1, 4], [1, 1, 4], [-1, 0, 4], [0, 0, 3], [1, 0, 3], [-1, 2, 4], [1, 2, 3]] as const) px.push({ p: v(Math.floor(c.x) + 0.5 + dx, Math.floor(c.y) + 0.5 + dy), c: GD.ramp[k] });
  d.pixels({ mat: GD, z, group: 'clasp' }, px);
}

/** The mail skirt between the legs, below the belt. */
function mailSkirt(d: Draw, s: Skel, z: number) {
  const ang = Math.max(-116, Math.min(-64, (s.thN + s.thF) / 2));
  const f0 = s.T(2.4, -4.6), f1 = s.T(2.4, 7.4);
  const f2 = at(f1, ang + 5, 10.6), f3 = at(f0, ang - 3, 10);
  d.poly({ mat: IR, z, group: 'mailskirt', shade: -1, tex: mail }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 5.8, bevel: 1 });
}

/**
 * The banner: a pole of dark polished wood with gold fittings, a gilded
 * finial, a crossbar near the top; from it hangs the Crown's standard, blue
 * with a gold crown, a swallowtail hem and a gold fringe. The cloth hangs
 * along the pole and away from it as the pole leans, trails the pole's
 * travel since the last frame, and ripples with `wave` (slowly: a big cloth
 * moves calmly).
 */
function banner(d: Draw, s: Skel, pole: Pole, prev: Pole | undefined, P: Record<string, number>, z: number) {
  const g = 'pole';
  d.capsule({ mat: WD, z, group: g, tex: (h) => (Math.sin(h.u * 44) > 0.9 ? 1 : 0) }, pole.foot, pole.top, 1.15, 1.25);
  d.capsule({ mat: GD, z: z + 0.02, group: g, shade: -1 }, pole.foot, lerpV(pole.foot, pole.top, 0.035), 1.4, 1.35);
  // the finial: a gilded knob crowned with three points
  const f = d.frame(pole.top, pole.ang);
  d.ellipse({ mat: GD, z: z + 0.05, group: 'finial' }, f(1.4, 0), 2.3, 2.0, pole.ang);
  d.poly({ mat: GD, z: z + 0.06, group: 'finial' }, [f(2.8, -2.2), f(6.4, -2.4), f(4.6, -0.9), f(7.4, 0), f(4.6, 0.9), f(6.4, 2.4), f(2.8, 2.2)], { kind: 'bevel', w: 1 });
  // the crossbar, 6 px under the finial, reaching forward of the pole
  const barAt = at(pole.top, pole.ang, -6);
  const across = pole.ang - 90;
  const barEnd = at(barAt, across, FLAG.w + 1);
  d.capsule({ mat: WD, z: z - 0.4, group: 'bar' }, at(barAt, across, -1.2), barEnd, 0.9, 0.9);
  d.circle({ mat: GD, z: z - 0.38, group: 'bar' }, barEnd, 1.2);

  // the cloth hangs from the crossbar: along the pole, pulled down by its weight, trailing its travel
  const moved = prev ? sub(pole.top, prev.top) : v(0, 0);
  const far = Math.hypot(moved.x, moved.y);
  const travel = far > 12 ? mul(moved, 12 / far) : moved;
  const wind = P.wind ?? 0;
  const pull = add(add(mul(v(Math.cos((pole.ang + 180) * Math.PI / 180), Math.sin((pole.ang + 180) * Math.PI / 180)), 0.55), v(-wind * 0.8, -0.6)), mul(travel, -0.035));
  const hang = angleOf(pull);
  const wave = P.wave ?? 0;
  const A = at(barAt, across, 0.6), B = at(barAt, across, FLAG.w);
  // edges: the pole side and the free side, each with a slow ripple that grows down the cloth
  const n = 6;
  const side = (root: V, ph: number, len: number) => {
    const pts: V[] = [root];
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      pts.push(at(pts[k - 1], hang + Math.sin(wave + ph + t * 2.4) * (6 + wind * 10) * t, len / n));
    }
    return pts;
  };
  const near = side(A, 0, FLAG.h), freeSide = side(B, 0.9, FLAG.h - 1);
  // the swallowtail hem between the two bottom corners: a notch rising into the middle
  const notch = at(lerpV(near[n], freeSide[n], 0.5), hang, -FLAG.drop);
  const outline = [...near, notch, ...[...freeSide].reverse()];
  const pa = d.P(A), pb = d.P(B);
  const ux = (pb.x - pa.x) / FLAG.w, uy = (pb.y - pa.y) / FLAG.w;
  // vertical folds that drift across the cloth with the wave
  const folds = (_h: unknown, x: number, y: number) => {
    const t = (x + 0.5 - pa.x) * ux + (y + 0.5 - pa.y) * uy;
    const k = Math.sin(t * 0.85 - wave * 1.6);
    return k > 0.6 ? -1 : k < -0.75 ? 1 : 0;
  };
  d.poly({ mat: LP, z: z - 0.5, group: 'flag', tex: folds }, outline, { kind: 'bevel', w: 1.2, n: [0.15, 0.1, 1] });
  // the gold fringe along the hem
  const hem = [near[n], notch, freeSide[n]];
  for (let k = 0; k < 2; k++) d.line({ mat: GD, z: z - 0.45, group: 'flag', line: 'none' }, at(hem[k], hang, 0.8), at(hem[k + 1], hang, 0.8), GD.ramp[k ? 3 : 4]);
  // the Crown's crown in the middle of the cloth
  const mid = lerpV(lerpV(near[3], freeSide[3], 0.5), lerpV(A, B, 0.5), 0.12);
  crown(d, mid, z - 0.44);
}

/** A small gold crown of pixels, three points over a band, facing the viewer whichever way he faces. */
function crown(d: Draw, c: V, z: number) {
  const rows = ['#..#..#', '##.#.##', '#######', '.#####.'];
  const x0 = Math.floor(c.x) + 0.5 - 3, y0 = Math.floor(c.y) + 0.5 + 2;
  const px: { p: V; c: RGBA }[] = [];
  rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
    if (ch !== '#') return;
    const k = ry === 0 ? 5 : ry === 3 ? 2 : rx < 3 ? 4 : 3;
    px.push({ p: v(x0 + rx, y0 - ry), c: GD.ramp[k] });
  }));
  d.pixels({ mat: GD, z, group: 'flag' }, px);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.2, 3.0);
  // the gorget of polished steel round the throat
  d.capsule({ mat: SV, z: 37.7, group: 'gorget' }, s.T(21.6, -4.6), s.T(22.6, 3.6), 2.8, 2.6);
  d.capsule({ mat: GD, z: 37.75, group: 'gorget', line: 'none' }, s.T(20.6, -4.4), s.T(21.4, 3.8), 0.5, 0.5);
  // clean-shaven, a high brow and a firm mouth
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[2], browStyle: P.shout ? 'angry' : 'flat', mouth: P.shout ? 'shout' : 'line', lip: SK.ramp[1], rx: 6.3, ry: 7.0 });
  // fair hair combed back from a high brow, short at the nape
  d.poly(
    { mat: HR, z: 39, group: 'hair', line: 'soft', tex: (h, x, y) => ((x * 2 + y * 3) % 5 === 0 ? -1 : 0) },
    [H(3.8, 5.8), H(1.8, 7.8), H(-1.6, 8.6), H(-5.0, 7.6), H(-7.4, 4.8), H(-8.0, 1.0), H(-7.2, -2.6), H(-5.4, -3.2), H(-4.0, -1.4), H(-2.6, 1.0), H(-1.0, 3.4), H(0.8, 5.0)],
    { kind: 'dome', c: H(-1.6, 3.4), r: 8.8, bevel: 1.1 },
  );
  // combed lines running back
  d.line({ mat: HR, z: 39.1, group: 'hair', line: 'none' }, H(2.4, 6.6), H(-4.4, 6.0), HR.ramp[2]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the pole's `poleAng` runs from the near hand toward the finial: 0 forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 92,
  head: 94,
  legN: { ik: v(-8, 3) },
  legF: { ik: v(8, 3) },
  armN: { up: -40, lo: 44 },
  armF: { up: -110, lo: -60 },
  p: { plant: 15, free: 0, poleAng: 88, hip: 1, wave: 0, wind: 0.05 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 92 - b,
    armN: { up: -40 + b * 2, lo: 44 + b },
    p: { wave: a, wind: 0.05 + b * 0.04, cape: 0.06 + b * 0.04 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -12 * Math.cos(ph), y: 3 + (sn > 0 ? 7 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  // the banner carried before him, leaning forward, the cloth streaming back
  return pose({
    y: bob - 2,
    torso: 78,
    head: 86,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -40 + sw * 6, lo: 30 + sw * 6 },
    armF: { up: -84 - sw * 28, lo: -50 - sw * 28 },
    p: { free: 1, grip: 34, poleAng: 64 + sw * 3, wind: 1.6, cape: 0.75, wave: a },
  });
}

// Banner Strike: the pole drawn back over the shoulder in both hands, then swung down so its gilded head strikes the enemy.
const BS_WIND = pose({
  x: -3, y: -1, torso: 98, head: 94,
  legN: { ik: v(-11, 3) }, legF: { ik: v(8, 3) },
  armN: { ik: v(-2, 62), bend: 1 }, armF: { up: 60, lo: 100 },
  p: { free: 1, grip: 30, poleAng: 140, twoK: 1, two: -7, wind: 0.4, cape: 0.25, wave: 1 },
});
const BS_TOP = pose({
  x: 1, y: -1, torso: 90, head: 92,
  legN: { ik: v(-10, 3) }, legF: { ik: v(11, 3) },
  armN: { ik: v(7, 62) }, armF: { up: 40, lo: 70 },
  p: { free: 1, grip: 30, poleAng: 78, twoK: 1, two: -7, wind: 0.8, cape: 0.4, wave: 1.6 },
});
const BS_HIT = pose({
  x: 7, y: -4, torso: 72, head: 80,
  legN: { ik: v(-12, 3) }, legF: { ik: v(15, 3) },
  armN: { ik: v(15, 44) }, armF: { up: -20, lo: 0 },
  p: { free: 1, grip: 30, poleAng: -14, twoK: 1, two: -7, wind: 1.4, cape: 0.6, wave: 2.4, shout: 1, sweep: 130 },
});
const BS_FOLLOW = tweak(BS_HIT, { x: 8, torso: 70, armN: { ik: v(16, 41) }, p: { poleAng: -26, shout: 0, wind: 1, cape: 0.45, wave: 3.2 } });

// Rallying Standard: the banner lifted high in both hands, then planted hard; it unfurls over him.
const RS_LIFT = pose({
  x: -1, y: 0, torso: 94, head: 100,
  legN: { ik: v(-8, 3) }, legF: { ik: v(9, 3) },
  armN: { ik: v(10, 66) }, armF: { up: 60, lo: 84 },
  p: { free: 1, grip: 26, poleAng: 92, twoK: 1, two: -9, wind: 0.6, cape: 0.2, wave: 1 },
});
const RS_PLANT = pose({
  x: 1, y: -3, torso: 88, head: 98,
  legN: { ik: v(-10, 3) }, legF: { ik: v(11, 3) },
  armN: { ik: v(14, 46) }, armF: { up: 10, lo: 40 },
  p: { plant: 16, free: 0, twoK: 1, two: -9, wind: 1.2, cape: 0.45, wave: 2, shout: 1 },
});
const RS_HOLD = (w: number) => tweak(RS_PLANT, { y: -2, torso: 90, head: 100, p: { twoK: 0, hip: 1, wind: 0.9 - w * 0.15, cape: 0.35 - w * 0.07, wave: 2.6 + w * 0.9, shout: 0 } });

const HURT = pose({
  x: -4, y: -1, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -100, lo: -10 }, armF: { up: -60, lo: 12 },
  p: { free: 1, grip: 36, poleAng: 102, wind: 0.5, cape: 0.35, wave: 1 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -14, torso: 78, head: 60,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -84, lo: -70 }, armF: { up: -80, lo: -66 },
  p: { free: 1, grip: 34, poleAng: 118, wind: 0.2, wave: 1 },
});
const DEATH_FALL = pose({
  x: 2, y: -22, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { free: 1, grip: 46, poleAng: 60, wind: 0.6, wave: 2 },
});
const DEATH_DOWN = pose({
  x: 6, y: -29, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { free: 1, grip: 54, poleAng: 8, wind: 0.2, wave: 3 },
});

// Victory: the standard raised high in the near hand, the free hand on his hip, the cloth spread over him.
const RAISE = pose({
  y: -1, torso: 92, head: 100,
  legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) },
  armN: { ik: v(4, 72) }, armF: { up: -110, lo: -60 },
  p: { free: 1, grip: 24, poleAng: 88, hip: 1, wind: 0.5, cape: 0.2, wave: 1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const waved = (p: Pose, w: number) => tweak(p, { p: { wave: w } });

const char: CharDef = {
  id: 'emissary_handlings',
  name: 'Emissary Handlings',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 75, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, BS_WIND, 2, 90),
        ...keys([
          [BS_WIND, 190],
          [BS_TOP, 50],
          [BS_HIT, 70, { smear: true, hit: true }],
          [BS_FOLLOW, 220],
        ]),
        ...tween(D, BS_FOLLOW, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RS_LIFT, 2, 100, ease.out),
        ...keys([
          [RS_LIFT, 200],
          [mid(RS_LIFT, RS_PLANT, 0.5), 60],
          [RS_PLANT, 90, { hit: true }],
          [RS_HOLD(0), 160],
          [RS_HOLD(1), 160],
          [RS_HOLD(2), 160],
          [RS_HOLD(3), 200],
        ]),
        ...tween(D, RS_HOLD(3), IDLE, 2, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [waved(tweak(HURT, { x: -3, torso: 96, head: 100 }), 1.6), 110],
        [waved(mid(HURT, IDLE, 0.6), 2.2), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 250],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -30 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RAISE, 2, 110, ease.out),
        ...keys([
          [waved(RAISE, 1.8), 220],
          [waved(RAISE, 2.6), 220],
          [waved(RAISE, 3.4), 220],
          [waved(RAISE, 4.2), 260],
          [mid(RAISE, IDLE, 0.5), 120],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** The banner in an icon, scaled up for 40x40: its pole and finial, the standard streaming from the crossbar. */
function iconBanner(d: Draw, foot: V, top: V, z: number, stream: number) {
  const ang = angleOf(sub(top, foot));
  d.capsule({ mat: WD, z, group: 'ipole' }, foot, top, 1.6, 1.7);
  const f = d.frame(top, ang);
  d.ellipse({ mat: GD, z: z + 0.05, group: 'ifinial' }, f(2, 0), 3.2, 2.8, ang);
  d.poly({ mat: GD, z: z + 0.06, group: 'ifinial' }, [f(4, -3), f(9, -3.2), f(6.4, -1.2), f(10.2, 0), f(6.4, 1.2), f(9, 3.2), f(4, 3)], { kind: 'bevel', w: 1.2 });
  const bar = at(top, ang, -8);
  const end = at(bar, ang - 90, 18);
  d.capsule({ mat: WD, z: z - 0.4, group: 'ibar' }, bar, end, 1.2, 1.2);
  const pts = [at(bar, ang - 90, 1), end];
  const down = stream;
  const bl = at(pts[0], down, 20), br = at(end, down + 6, 18);
  const notch = at(lerpV(bl, br, 0.5), down, -6);
  d.poly({ mat: LP, z: z - 0.5, group: 'iflag', tex: (_h, x) => (x % 5 === 0 ? -1 : 0) }, [pts[0], end, br, notch, bl], { kind: 'bevel', w: 1.6, n: [0.15, 0.1, 1] });
  d.line({ mat: GD, z: z - 0.45, group: 'iflag', line: 'none' }, at(bl, down, 1), at(notch, down, 1), GD.ramp[4]);
  d.line({ mat: GD, z: z - 0.45, group: 'iflag', line: 'none' }, at(notch, down, 1), at(br, down + 6, 1), GD.ramp[3]);
  crown(d, lerpV(lerpV(pts[0], end, 0.5), lerpV(bl, br, 0.5), 0.45), z - 0.44);
}

const E = ACCENT;

export const emissaryHandlings: ChampionArt = {
  char,
  iconBg: BL,
  icons: {
    banner_strike: () =>
      compose(BL, glyph((d) => {
        // the pole brought down from over the shoulder, its gilded head striking at the lower right
        smear(d, v(6, 10), 150, -20, 30, 6, SWING, 1);
        iconBanner(d, v(4, 27), v(31, 11), 10, 178);
      }), (b) => {
        impactStar(b, 35, 30, 2, 8, 9, FXR.gold[3], E.white);
      }),
    rallying_standard: () =>
      compose(BL, glyph((d) => {
        // the standard planted upright, its cloth spread
        iconBanner(d, v(7, 1), v(7, 33), 10, -86);
      }), (b) => {
        // the line it rallies: three gold chevrons rising beside it (screen space, y down)
        for (const [cx, cy] of [[33, 30], [33, 22], [33, 14]] as const) {
          for (let k = -3; k <= 3; k++) {
            b.set(cx + k, cy + Math.abs(k), Math.abs(k) < 2 ? E.goldHot : E.chiGold);
            b.set(cx + k, cy + Math.abs(k) + 1, FXR.gold[1]);
          }
        }
      }),
    unbroken_flag: () => {
      // the standard leaning behind, and before it the ward it gives: a kite shield of gold light with the Crown's crown on it
      const art = glyph((d) => iconBanner(d, v(4, 2), v(12, 34), 10, -82));
      const G = FXR.gold;
      const cx = 25, top = 12;
      for (let y = 0; y < 23; y++) {
        const h = Math.round(y < 8 ? 8 : Math.max(0, 8 - (y - 8) * 0.56));
        for (let x = -h; x <= h; x++) {
          const edge = Math.abs(x) === h || y === 0 || y === 22;
          art.set(cx + x, top + y, edge ? (x < 0 || y === 0 ? G[4] : G[3]) : (x + y) % 2 ? G[1] : G[2]);
        }
      }
      ['#..#..#', '##.#.##', '#######'].forEach((row, ry) => [...row].forEach((ch, rx) => ch === '#' && art.set(cx - 3 + rx, top + 6 + ry, ry === 2 ? E.goldHot : E.white)));
      return compose(BL, art);
    },
  },
};
