// The Orchid Huntress (docs/DESIGN_DECISIONS.md section 76, 2026-11-02: Jakub's choice of the
// second of three concepts I proposed, named by him; the kit is the one he chose before, "Go A").
// An elegant and deadly huntress of the jungle, a beautiful lure for prey: a tall, slender woman
// whose pale skin shades into the white and violet of an orchid. A great orchid crown frames her
// head, its petals white with violet throats, opening wide when she looses its pollen; dark hair
// falls down her back; a band of green leaf crosses her brow; a bodice of overlapping leaves; long petals hanging from her hips over
// leaf-wrapped legs. A thorned vine winds round her near forearm and uncoils from her hand into a
// long whip (the silhouette, with the crown); pale gold pollen drifts from the crown in every
// frame; roots run from her feet into the ground when she kneels for Root Embrace. Her affinity
// (Bloom) sets nothing here (Jakub, 2026-10-11): she is a flower because of who she is.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { hash2, RGBA } from '../raster.ts';
import { cape, leg } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16.4,
  shin: 16,
  ankleH: 3,
  footLen: 6.8,
  spine: 21,
  neck: 6,
  upperArm: 13,
  foreArm: 12.6,
  shoulderDrop: 4.4,
  shoulderN: -3.6,
  shoulderF: 4.2,
  hipN: -2.2,
  hipF: 2.2,
};

const SK = MAT.skinLight, HR = MAT.hairDark, OR = MAT.orchid, LF = MAT.green, VN = MAT.moss, TH = MAT.bone, PO = MAT.glowGold, RT = MAT.bark;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;

  // the long back petals of her skirt and the back of the crown, behind everything
  cape(d, s, { mat: OR, z: 2, len: 27, topU: 3, topBack: 5, topFront: 1.6, spread: 7, wind: P.wind ?? 0.1, wave: P.wave ?? 0, group: 'backPetals' });
  crown(d, s, P, 3, true);

  if (P.rooted) roots(d, s, P, 5);
  leg(d, s, 'F', legCfg(10, -1));
  armOf(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF');

  torso(d, s, 30);
  hair(d, s, P, 35);
  head(d, s, P, 36);
  crown(d, s, P, 38, false);

  leg(d, s, 'N', legCfg(40, 0));
  hipPetals(d, s, P, 42);
  if (!P.nowhip) whip(d, s, P, 55);
  armOf(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN');
  vineWrap(d, s, 61);
  if (!P.dead) pollen(d, s, P, info, 70);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: LF, shin: LF, foot: SK, rThigh: [3.9, 3.0] as [number, number], rShin: [3.0, 2.3] as [number, number], z, shade, footStyle: 'bare' as const,
  // the leaves wrapping her legs, overlapping down the shin
  thighTex: (h: { u: number }) => (Math.floor(h.u * 5) % 2 ? -1 : 0),
  shinTex: (h: { u: number }) => (Math.floor(h.u * 5) % 2 ? -1 : 0),
});

function armOf(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: SK, z, group, shade }, sh, el, 2.5, 2.1);
  d.capsule({ mat: SK, z: z + 0.1, group, shade }, el, ha, 2.1, 1.8);
  d.ellipse({ mat: SK, z: z + 0.2, group, shade }, ha, 2.1, 1.7, lo);
}

/** The thorned vine wound round her near forearm, three turns, a thorn or two on it. */
function vineWrap(d: Draw, s: Skel, z: number) {
  for (const u of [0.2, 0.45, 0.7]) {
    const c = at(s.eN, s.loN, 12.6 * u);
    d.capsule({ mat: VN, z, group: 'wrap' + u, line: 'soft' }, at(c, s.loN + 70, 2.4), at(c, s.loN - 110, 2.4), 0.8, 0.8);
  }
  d.pixels({ mat: TH, z: z + 0.1, group: 'wrapThorn', line: 'none' }, [{ p: at(at(s.eN, s.loN, 5), s.loN + 90, 3), c: TH.ramp[4] }, { p: at(at(s.eN, s.loN, 9), s.loN - 90, 2.8), c: TH.ramp[4] }]);
}

function torso(d: Draw, s: Skel, z: number) {
  const rows = [[-2, 5.4, 5.8], [3, 4.8, 5.2], [8, 5.2, 6.4], [13, 6, 7.4], [17, 6.2, 6.6], [19.6, 4.6, 3.8], [21, 2.4, 2]] as [number, number, number][];
  const front = rows.map(([u, , f]) => s.T(u, f));
  const back = rows.map(([u, b]) => s.T(u, -b)).reverse();
  d.poly({ mat: SK, z, group: 'body' }, [...front, ...back], { kind: 'cyl', a: s.T(0, 1), b: s.T(21, 1), r: 7, bevel: 1.2 });
  // the bodice of overlapping leaves, from the hip to under the arms, its leaves pointing down
  const bod = [[-1.4, 5.8, 6.2], [3, 5.2, 5.6], [8, 5.6, 6.8], [14.6, 6.4, 7.6]] as [number, number, number][];
  const bf = bod.map(([u, , f]) => s.T(u, f + 0.3));
  const bb = bod.map(([u, b]) => s.T(u, -b - 0.3)).reverse();
  d.poly({ mat: LF, z: z + 0.1, group: 'bodice', tex: (h) => ((Math.floor(h.u * 4) + (h.v > 0.5 ? 1 : 0)) % 2 ? -1 : 0) }, [...bf, ...bb], { kind: 'cyl', a: s.T(0, 1), b: s.T(14.6, 1), r: 7.6, bevel: 1 });
  // the leaves' points along the bodice's top edge, and a violet orchid at the breast
  for (const vv of [-4, -1, 2, 5]) d.poly({ mat: LF, z: z + 0.15, group: 'bodTop', line: 'soft' }, [s.T(14.2, vv - 1.4), s.T(16.6, vv), s.T(14.2, vv + 1.4)], { kind: 'bevel', w: 0.6 });
  d.circle({ mat: OR, z: z + 0.2, group: 'brooch' }, s.T(12.4, 6.6), 1.6);
  d.pixels({ mat: OR, z: z + 0.25, group: 'brooch', line: 'none' }, [{ p: s.T(12.4, 6.8), c: OR.ramp[1] }]);
}

/** Long petals hanging from her hips in front, white with a violet streak down each, swaying. */
function hipPetals(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const w = Math.sin(P.wave ?? 0) * 1.2;
  [[0, 5.6, 15, -4], [0.4, 2, 17, 0], [0, -2.4, 14, 4]].forEach(([u, vv, len, lean], k) => {
    const top = s.T(u, vv);
    const tip = v(top.x + lean * 0.3 + w * (k % 2 ? 1 : -1), top.y - len);
    const midL = v(top.x - 2.6 + lean * 0.15, top.y - len * 0.5), midR = v(top.x + 2.6 + lean * 0.15, top.y - len * 0.5);
    d.poly({ mat: OR, z: z + k * 0.01, group: 'hipPetal' + k, line: 'soft' }, [v(top.x - 1.6, top.y), midL, tip, midR, v(top.x + 1.6, top.y)], { kind: 'bevel', w: 1 });
    d.line({ mat: OR, z: z + 0.005 + k * 0.01, group: 'hipPetal' + k, line: 'none' }, v(top.x, top.y - 1), v((top.x + tip.x) / 2, (top.y + tip.y) / 2), OR.ramp[2]);
  });
}

/** The head frame: the face looks ahead, a little down, whatever the neck does. */
function headFrame(s: Skel) {
  const dd = ((88 + (s.headDir - 90) * 0.5) - s.headDir) * (Math.PI / 180);
  const c = Math.cos(dd), n = Math.sin(dd);
  return (u: number, w: number) => s.H(u * c - w * n, u * n + w * c);
}

/** Her face, calm and lovely, and a band of green leaf across her brow. */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = headFrame(s);
  d.capsule({ mat: SK, z: z - 0.5, group: 'neck' }, s.neck, H(0, -4), 2.6, 2.4);
  face(d, s, { skin: SK, z, brow: HR.ramp[1], browStyle: 'calm', mouth: P.dead ? 'none' : 'line', lip: E.lipRose, rx: 5.7, ry: 6.3, profile: 'soft', ear: 'none', lash: E.kohl });
  // a band of green leaf across her brow, its tip curling past the temple
  d.poly({ mat: LF, z: z + 0.4, group: 'mask', line: 'soft' }, [H(-1.6, 5.2), H(2.4, 5.4), H(5.4, 4.6), H(6.2, 3.8), H(5, 3.6), H(2.4, 4.2), H(-1.6, 3.8)], { kind: 'bevel', w: 0.6 });
  d.line({ mat: LF, z: z + 0.45, group: 'mask', line: 'none' }, H(0, 4.6), H(4, 4.8), LF.ramp[5]);
}

/**
 * The orchid crown: five great petals round the back and top of her head, white with violet
 * throats, and a lip petal curling down behind the ear; `flare` opens them wide. The back petals
 * go behind the head (`back`), the two over the brow in front of it.
 */
function crown(d: Draw, s: Skel, P: Record<string, number>, z: number, back: boolean) {
  const H = headFrame(s);
  const fl = P.flare ?? 0;
  const sway = Math.sin(P.wave ?? 0) * 3;
  const petals: [number, number, number, number, number, boolean][] = back
    ? [[-4, 4, 150 + fl * 12, 9.5 + fl * 3, 3.6, true], [-5, 1, 196 + fl * 14, 8.5 + fl * 3, 3.2, true], [-3, 6.4, 116 + fl * 6, 9.5 + fl * 3, 3.6, true]]
    : [[-1.4, 6.8, 92 - fl * 8, 8 + fl * 2, 3, false], [-4.4, -1.6, 236 + fl * 8, 8 + fl * 2, 3, false]];
  petals.forEach(([x, y, ang0, len, wid], k) => {
    const base = H(x, y);
    const ang = ang0 + s.headDir - 90 + sway * (k % 2 ? 1 : -1);
    const tip = at(base, ang, len);
    const mid = at(base, ang, len * 0.5);
    d.poly({ mat: OR, z: z + k * 0.01, group: (back ? 'crB' : 'crF') + k, line: 'soft', shade: back ? -1 : 0 }, [base, at(mid, ang + 90, wid), tip, at(mid, ang - 90, wid)], { kind: 'dome', c: mid, r: len * 0.6, bevel: 0.8 });
    // the violet throat of the petal
    d.line({ mat: OR, z: z + 0.005 + k * 0.01, group: (back ? 'crB' : 'crF') + k, line: 'none' }, base, at(base, ang, len * 0.55), OR.ramp[1]);
  });
  if (!back) {
    // the heart of the flower behind her ear: a violet throat and a gold column
    const c = H(-4.6, 3.4);
    d.circle({ mat: OR, z: z + 0.1, group: 'crHeart' }, c, 2 + fl * 0.6);
    d.pixels({ mat: PO, z: z + 0.15, group: 'crHeart', line: 'none', outline: false }, [{ p: c, c: PO.ramp[4] }, { p: v(c.x, c.y + 1), c: PO.ramp[5] }]);
  }
}

/** Long dark hair from under the crown down her back, swaying. */
function hair(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = headFrame(s);
  const w = Math.sin(P.wave ?? 0) * 1.2 + (P.wind ?? 0) * 3;
  d.poly({ mat: HR, z, group: 'hair', line: 'soft', tex: (h) => (Math.sin(h.v * 12) > 0.7 ? 1 : 0) },
    [H(-1, 7), H(-5, 6.6), H(-8, 3), H(-9 - w, -4), H(-10 - w * 1.4, -12), H(-7 - w, -15), H(-5, -8), H(-4.6, -2), H(-3, 3)],
    { kind: 'dome', c: H(-3, 0), r: 9, bevel: 1 });
}

/** Pale gold pollen drifting up from the crown in every frame, more of it when the crown is open. */
function pollen(d: Draw, s: Skel, P: Record<string, number>, info: BuildInfo, z: number) {
  const H = headFrame(s);
  const n = 5 + Math.round((P.flare ?? 0) * 9);
  const pts: { p: V; c: RGBA }[] = [];
  for (let k = 0; k < n; k++) {
    const life = (info.index + k * 2) % 7;
    const x0 = -6 + hash2(k, 3, 11) * 10, y0 = 4 + hash2(k, 7, 5) * 6;
    const p = H(x0 + Math.sin(life + k) * 1.2, y0 + life * 1.6);
    pts.push({ p, c: life < 3 ? PO.ramp[5] : life < 5 ? PO.ramp[4] : PO.ramp[2] });
  }
  d.pixels({ mat: PO, z, group: 'fx', outline: false, line: 'none' }, pts);
}

/** Roots running from her feet into the ground, spreading as she kneels (`rooted`). */
function roots(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const k = P.rooted ?? 0;
  const f = v(s.pelvis.x, 1);
  for (const [dx, len] of [[-1, 10], [1, 12], [-1, 6], [1, 7]] as const) {
    const a = v(f.x + dx * 2, 1.2), b = v(f.x + dx * (2 + len * k), 0.4);
    d.ribbon({ mat: RT, z, group: 'root' + dx + len, line: 'soft' }, [a, v((a.x + b.x) / 2, 1.4), b], [1.4, 1, 0.3]);
  }
}

/**
 * The whip: the vine uncoils from her hand, `whipAng` where it leaves it, `curl` degrees turned at
 * each joint; pale thorns along it. At rest it coils and trails on the ground; in a lash it is
 * thrown out nearly straight.
 */
function whip(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const n = 9, seg = 4.2;
  let a = P.whipAng ?? -70;
  const curl = P.curl ?? 18;
  const sway = Math.sin(P.wave ?? 0) * 4;
  const pts: V[] = [s.hN];
  for (let k = 0; k < n; k++) {
    let p = at(pts[pts.length - 1], a, seg);
    if (p.y < 0.6) p = v(p.x, 0.6);
    pts.push(p);
    a += curl + sway * (k / n);
  }
  d.ribbon({ mat: VN, z, group: 'whip', line: 'soft' }, pts, pts.map((_, k) => 1.3 - (k / n) * 0.9));
  const th: { p: V; c: RGBA }[] = [];
  for (let k = 2; k < n; k += 2) {
    const dir = Math.atan2(pts[k + 1].y - pts[k].y, pts[k + 1].x - pts[k].x) * (180 / Math.PI);
    th.push({ p: at(pts[k], dir + (k % 4 ? 90 : -90), 1.6), c: TH.ramp[4] });
  }
  // a small violet bud at the tip
  d.pixels({ mat: TH, z: z + 0.1, group: 'whip', line: 'none' }, [...th, { p: pts[n], c: OR.ramp[3] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations (hand coordinates: [forward, up] from the feet)
// ---------------------------------------------------------------------------

const hu = (hN: V, hF: V, o: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hN, bend: -1 }, armF: { ik: hF, bend: -1 }, ...o, p: { whipAng: -70, curl: 18, ...(o.p ?? {}) } });

// At rest: a hunter's poise, light on her feet, the vine trailing from her hand, the other hand at her hip.
const STAND = { torso: 86, head: 88, legN: { ik: v(-8, 3) }, legF: { ik: v(9, 3) } };
const IDLE = hu(v(12, 36), v(6, 34), { y: -1, ...STAND });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return hu(v(12, 36 - b), v(6, 34 - b), { y: -1 - b, ...STAND, torso: 86 - b, p: { wave: a, whipAng: -72 + b * 2, flare: 0.1 * b } });
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
  return hu(v(10 + sw * 6, 38 + bob), v(14 - sw * 6, 39 + bob), {
    y: bob - 2, torso: 76, head: 82,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    p: { wave: a * 2, whipAng: -150, curl: 6, wind: 0.8 },
  });
}

// Thorn Kiss: the vine drawn back over the shoulder, cracked down across the enemy; drawn back low, cracked up.
const TK_WIND = hu(v(-4, 58), v(14, 40), { x: -3, y: -1, torso: 94, head: 92, legN: { ik: v(-11, 3) }, legF: { ik: v(8, 3) }, p: { whipAng: 160, curl: -14, wind: 0.4 } });
const TK_ONE = hu(v(22, 46), v(4, 38), { x: 6, y: -3, torso: 74, head: 82, legN: { ik: v(-12, 3) }, legF: { ik: v(15, 3) }, p: { whipAng: -12, curl: -2, wave: 1.4, wind: 0.8 } });
const TK_LOW = hu(v(8, 30), v(6, 42), { x: 4, y: -3, torso: 80, head: 84, legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) }, p: { whipAng: -150, curl: 6, wave: 2 } });
const TK_TWO = hu(v(24, 52), v(2, 36), { x: 7, y: -2, torso: 78, head: 84, legN: { ik: v(-13, 3) }, legF: { ik: v(16, 3) }, p: { whipAng: 14, curl: -3, wave: 2.6, wind: 0.8 } });

// Pollen Veil: she gathers herself, then lifts her face and her free hand and the crown opens wide.
const PV_GATHER = hu(v(12, 38), v(10, 44), { x: -1, torso: 84, head: 76, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, p: { flare: 0.2 } });
const PV_RISE = hu(v(14, 40), v(10, 72), { x: -2, y: 0, torso: 92, head: 102, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, p: { flare: 0.6, wind: 0.3 } });
const PV_OPEN = hu(v(16, 44), v(4, 74), { x: -2, y: 0, torso: 94, head: 106, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, p: { flare: 1, wave: 2, wind: 0.5 } });

// Root Embrace: the vine lifted, then she sinks to a knee and lays her palm on the ground; roots run from her into it.
const RE_LIFT = hu(v(6, 64), v(14, 42), { x: -2, y: 0, torso: 94, head: 94, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, p: { whipAng: 120, curl: -10 } });
const RE_KNEEL = hu(v(18, 2), v(8, 26), { x: 2, y: -14, torso: 60, head: 68, legN: { ik: v(-14, 3) }, legF: { ik: v(12, 3) }, footN: -50, p: { nowhip: 1, wave: 1, rooted: 0.6, flare: 0.5 } });
const RE_HOLD = tweak(RE_KNEEL, { y: -13, p: { wave: 2.2, rooted: 1, flare: 0.7 } });

const HURT = hu(v(8, 38), v(4, 40), { x: -4, y: -1, torso: 98, head: 100, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10, p: { whipAng: -110, curl: 10, wind: 0.5 } });
const DEATH_KNEEL = hu(v(14, 10), v(18, 12), { y: -14, torso: 66, head: 50, legN: { ik: v(-14, 3) }, legF: { ik: v(9, 3) }, footN: -60, p: { dead: 1, whipAng: -10, curl: 4 } });
const DEATH_FALL = pose({
  x: 2, y: -22, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -40, lo: -10 }, armF: { up: -20, lo: 10 },
  p: { dead: 1, whipAng: -5, curl: 2, wave: 2 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { dead: 1, whipAng: 2, curl: 1, wave: 3 },
});

// Victory: the vine curling up round her as she turns, the free hand lifted, the crown wide open.
const BLOOM = hu(v(22, 44), v(4, 72), { y: 0, torso: 90, head: 98, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, p: { whipAng: 70, curl: 20, flare: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const waved = (p: Pose, w: number) => tweak(p, { p: { wave: w } });

const char: CharDef = {
  id: 'orchid_huntress',
  name: 'Orchid Huntress',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TK_WIND, 2, 80),
        ...keys([
          [TK_WIND, 190],
          [mid(TK_WIND, TK_ONE, 0.5), 40],
          [TK_ONE, 70, { hit: true }],
          [waved(TK_ONE, 1.8), 90],
          [TK_LOW, 90],
          [mid(TK_LOW, TK_TWO, 0.5), 40],
          [TK_TWO, 70, { hit: true }],
          [waved(TK_TWO, 3), 200],
        ]),
        ...tween(D, TK_TWO, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, PV_GATHER, 2, 90),
        ...keys([
          [PV_GATHER, 180],
          [mid(PV_GATHER, PV_RISE, 0.5), 90],
          [PV_RISE, 160],
          [PV_OPEN, 120, { event: 'cast', hit: true }],
          [waved(PV_OPEN, 3), 240],
          [waved(PV_OPEN, 4), 220],
        ]),
        ...tween(D, PV_OPEN, IDLE, 3, 110, ease.inOut),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RE_LIFT, 2, 90),
        ...keys([
          [RE_LIFT, 220],
          [mid(RE_LIFT, RE_KNEEL, 0.5), 60],
          [RE_KNEEL, 160],
          [RE_HOLD, 120, { hit: true }],
          [waved(RE_HOLD, 3), 260],
          [waved(RE_HOLD, 4), 220],
          [mid(RE_HOLD, IDLE, 0.5), 120],
        ]),
        ...tween(D, mid(RE_HOLD, IDLE, 0.5), IDLE, 2, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 96 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 280],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 150],
        [tweak(DEATH_DOWN, { y: -27.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, BLOOM, 2, 110, ease.out),
        ...keys([
          [waved(BLOOM, 1.6), 300],
          [waved(BLOOM, 2.6), 300],
          [waved(BLOOM, 3.6), 300],
          [mid(BLOOM, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** A curling thorned vine in an icon, from `p0` at `a0`, `curl` per joint, a violet bud at its tip. */
function iconVine(d: Draw, p0: V, a0: number, curl: number, n: number, seg: number, z: number) {
  const pts: V[] = [p0];
  let a = a0;
  for (let k = 0; k < n; k++) { pts.push(at(pts[pts.length - 1], a, seg)); a += curl; }
  d.ribbon({ mat: VN, z, group: 'ivine' + z, line: 'soft' }, pts, pts.map((_, k) => 2.4 - (k / n) * 1.8));
  for (let k = 1; k < n; k += 2) d.ribbon({ mat: TH, z: z + 0.1, group: 'ithorn' + z + k, line: 'none' }, [pts[k], at(pts[k], a0 + k * curl + 90, 2.6)], [1, 0.2]);
  d.circle({ mat: OR, z: z + 0.2, group: 'ibud' + z }, pts[n], 1.8);
}

/** An orchid in an icon: five petals round a violet throat, `open` 0..1. */
function iconOrchid(d: Draw, c: V, r: number, open: number, z: number) {
  [90, 162, 234, 306, 18].forEach((ang, k) => {
    const len = r * (k === 4 ? 0.8 : 1) * (0.75 + open * 0.25);
    const mid = at(c, ang, len * 0.55), tip = at(c, ang, len);
    d.poly({ mat: OR, z: z + k * 0.01, group: 'ipetal' + k, line: 'soft' }, [c, at(mid, ang + 90, r * 0.36), tip, at(mid, ang - 90, r * 0.36)], { kind: 'dome', c: mid, r: len * 0.6, bevel: 0.8 });
  });
  d.circle({ mat: OR, z: z + 0.1, group: 'ithroat', shade: -1 }, c, r * 0.24);
}

export const orchidHuntress: ChampionArt = {
  char,
  iconBg: LF,
  icons: {
    thorn_kiss: () =>
      compose(LF, glyph((d) => iconVine(d, v(4, 6), 70, -16, 9, 4.6, 10)), (b) => impactStar(b, 30, 30, 1, 6, 7, FXR.bile[3], E.white)),
    pollen_veil: () =>
      compose(LF, glyph((d) => iconOrchid(d, v(20, 18), 12, 1, 10)), (b) => {
        for (const [x, y] of [[6, 6], [10, 3], [31, 5], [35, 11], [4, 14], [36, 20], [8, 33], [32, 33], [15, 37], [26, 37]] as const) {
          b.set(x, y, FXR.gold[3]);
          b.set(x + 1, y, FXR.bile[3]);
        }
      }),
    root_embrace: () =>
      compose(LF, glyph((d) => {
        for (const [x, h, lean] of [[11, 22, 4], [20, 30, -3], [29, 20, -5]] as const) {
          d.ribbon({ mat: RT, z: 10, group: 'iroot' + x, line: 'soft' }, [v(x, 3), v(x + lean * 0.5, 3 + h * 0.5), v(x + lean, 3 + h)], [3, 2.2, 0.4]);
        }
      }), (b) => {
        impactStar(b, 20, 10, 1, 7, 8, FXR.bile[3], FXR.bile[4]);
        for (let x = 3; x <= 36; x++) b.set(x, 37, RT.ramp[1]);
      }),
    bitter_nectar: () =>
      compose(LF, glyph((d) => {
        iconOrchid(d, v(20, 22), 9, 0.6, 10);
        d.ellipse({ mat: PO, z: 11, group: 'idrop', line: 'soft' }, v(20, 9), 3.4, 3.4, 0);
        d.poly({ mat: PO, z: 11.1, group: 'idrop' }, [v(17, 10), v(23, 10), v(20, 15)], { kind: 'bevel', w: 1 });
      })),
  },
};
