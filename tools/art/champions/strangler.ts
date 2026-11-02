// The Strangler (docs/DESIGN_DECISIONS.md section 76, 2026-11-02: Jakub's "Go A" on the kit I
// proposed for a Heroic Damage of the Court of Root; the look is mine and stands in until he
// sets it). A hunter grown the way a strangler fig grows: tall and lean, a body of pale grey-brown
// roots wound round and round, open at the breast where a heart of amber sap glows through the
// gaps; a long head like a mask of knotted root with two amber eyes and no mouth, tendrils of
// root trailing back from it like hair, thorns on them; moss over the shoulders; a belt of vine
// with three ripe figs hanging from it, plum-skinned and sour with poison. The near arm ends in a
// long thorned vine he uses as a whip (the silhouette, with the trailing tendrils); the far hand
// is a cluster of root fingers. His affinity (Bloom) sets nothing here (Jakub, 2026-10-11): the
// greens are the moss and the vine, the amber the sap of the fig.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { leg } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 36,
  thigh: 17,
  shin: 16.4,
  ankleH: 3,
  footLen: 7.4,
  spine: 23,
  neck: 7,
  upperArm: 14.4,
  foreArm: 14,
  shoulderDrop: 4.6,
  shoulderN: -4.2,
  shoulderF: 4.6,
  hipN: -2.4,
  hipF: 2.4,
};

const BK = MAT.bark, MS = MAT.moss, FG = MAT.plum, SAP = MAT.glowAmber, TH = MAT.bone, VN = MAT.moss;
const E = ACCENT;

/** Roots wound round a limb or the body: strands slanting across the shape, light and dark. */
const wound = (h: { u: number; v: number }) => {
  const k = (h.u * 7 + h.v * 3) % 1;
  return k < 0.16 ? -1 : k > 0.86 ? 1 : 0;
};

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  void info;

  tendrils(d, s, P, 2);

  leg(d, s, 'F', legCfg(10, -1));
  farArm(d, s, P, 14);

  torso(d, s, P, 30);
  belt(d, s, P, 33);
  head(d, s, P, 36);

  leg(d, s, 'N', legCfg(40, 0));
  figs(d, s, P, 42);
  if (!P.nowhip) whip(d, s, P, 55);
  nearArm(d, s, 60);
  moss(d, s, 62);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: BK, shin: BK, foot: BK, rThigh: [4.4, 3.4] as [number, number], rShin: [3.4, 2.6] as [number, number], z, shade, footStyle: 'bare' as const,
  thighTex: wound, shinTex: wound,
});

function nearArm(d: Draw, s: Skel, z: number) {
  d.capsule({ mat: BK, z, group: 'armN', tex: wound }, s.sN, s.eN, 3.4, 2.8);
  d.capsule({ mat: BK, z: z + 0.1, group: 'armN', tex: wound }, s.eN, s.hN, 2.8, 2.3);
  d.ellipse({ mat: BK, z: z + 0.2, group: 'armN' }, s.hN, 2.6, 2.2, s.loN);
  // thorns along the forearm
  for (const u of [0.3, 0.6]) d.ribbon({ mat: TH, z: z + 0.25, group: 'thN' + u, line: 'soft' }, [at(s.eN, s.loN, 14 * u), at(at(s.eN, s.loN, 14 * u), s.loN + 120, 2.6)], [0.8, 0.2]);
}

/** The far arm, and its hand of root fingers, four of them, curled; it holds a fig in Spore Burst (`fig`). */
function farArm(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  d.capsule({ mat: BK, z, group: 'armF', shade: -1, tex: wound }, s.sF, s.eF, 3.2, 2.6);
  d.capsule({ mat: BK, z: z + 0.1, group: 'armF', shade: -1, tex: wound }, s.eF, s.hF, 2.6, 2.2);
  for (const k of [-1.5, -0.5, 0.5, 1.5]) {
    const base = at(at(s.hF, s.loF, 1), s.loF + 90, k * 1.1);
    d.ribbon({ mat: BK, z: z + 0.2, group: 'fF' + k, shade: -1, line: 'soft' }, [base, at(base, s.loF + k * 10, 3), at(base, s.loF + k * 14 - 30, 5.4)], [0.9, 0.8, 0.3]);
  }
  if (P.fig) {
    const c = at(s.hF, s.loF, 3.4);
    if (P.fig > 1) {
      // crushed: the skin split, the pulp showing
      d.ellipse({ mat: FG, z: z + 0.3, group: 'figHeld', shade: -1 }, c, 3.6, 2.2, 0);
      d.pixels({ mat: FG, z: z + 0.32, group: 'figHeld', line: 'none' }, [{ p: v(c.x - 1, c.y + 1), c: MAT.bile.ramp[4] }, { p: v(c.x + 1, c.y + 1), c: MAT.bile.ramp[3] }]);
    } else {
      d.ellipse({ mat: FG, z: z + 0.3, group: 'figHeld' }, c, 3.4, 3.8, 0);
      d.pixels({ mat: FG, z: z + 0.32, group: 'figHeld', line: 'none' }, [{ p: v(c.x - 1, c.y + 1), c: FG.ramp[5] }]);
    }
  }
}

function torso(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const rows = [[-2, 5.4, 6], [4, 5.8, 6.6], [10, 7, 8.2], [15, 7.8, 8.8], [19, 7.2, 7.4], [22, 5, 4.4], [23.6, 2.6, 2.2]] as [number, number, number][];
  const front = rows.map(([u, , f]) => s.T(u, f));
  const back = rows.map(([u, b]) => s.T(u, -b)).reverse();
  d.poly({ mat: BK, z, group: 'body', tex: wound }, [...front, ...back], { kind: 'cyl', a: s.T(0, 1), b: s.T(23.6, 1), r: 8.4, bevel: 1.2 });
  // the gap in the breast where the roots part, and the heart of amber sap glowing in it
  const hc = s.T(14.4, 4.6);
  d.ellipse({ mat: BK, z: z + 0.1, group: 'hollow', line: 'none', shade: -2 }, hc, 4.6, 3.6, s.torso);
  const beat = P.beat ?? 0;
  d.ellipse({ mat: SAP, z: z + 0.2, group: 'heart', line: 'none', outline: false }, hc, 2.6 + beat * 0.6, 2.2 + beat * 0.5, s.torso);
  d.pixels({ mat: SAP, z: z + 0.25, group: 'heart', line: 'none', outline: false }, [{ p: v(hc.x, hc.y + 1), c: SAP.ramp[5] }]);
  // two roots crossing over the hollow, like ribs
  d.ribbon({ mat: BK, z: z + 0.3, group: 'ribs', line: 'soft' }, [s.T(17.6, 1.4), s.T(14.4, 5.4), s.T(11, 8.2)], [1, 1.1, 0.9]);
  d.ribbon({ mat: BK, z: z + 0.3, group: 'ribs2', line: 'soft' }, [s.T(18, 7.8), s.T(14.6, 4.0), s.T(11.4, 1.6)], [0.9, 1, 0.8]);
}

/** A belt of green vine at the waist. */
function belt(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  void P;
  d.poly({ mat: VN, z, group: 'belt' }, [s.T(6.4, -6), s.T(6.6, 6.8), s.T(4.8, 6.6), s.T(4.6, -5.8)], { kind: 'cyl', a: s.T(4.6, 0), b: s.T(6.6, 0), r: 6.6 });
}

/** Three ripe figs hanging from the belt on short stalks, swaying. */
function figs(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const w = Math.sin(P.wave ?? 0) * 0.8;
  [[5.4, 6.2, 5.2], [5.2, 2.4, 6.4], [5.4, -1.6, 4.6]].forEach(([u, vv, len], k) => {
    const top = s.T(u, vv);
    const c = v(top.x + w * (k % 2 ? -1 : 1), top.y - len);
    d.line({ mat: VN, z: z + k * 0.01, group: 'figStalk' + k, line: 'none' }, top, c, VN.ramp[2]);
    d.ellipse({ mat: FG, z: z + 0.02 + k * 0.01, group: 'fig' + k }, v(c.x, c.y - 2.4), 2.4, 2.8, 0);
    d.pixels({ mat: FG, z: z + 0.05 + k * 0.01, group: 'fig' + k, line: 'none' }, [{ p: v(c.x - 1, c.y - 1.4), c: FG.ramp[5] }, { p: v(c.x + 1, c.y - 4), c: MAT.bile.ramp[3] }]);
  });
}

/** Moss over the near shoulder, hanging in a few strands. */
function moss(d: Draw, s: Skel, z: number) {
  d.ellipse({ mat: MS, z, group: 'shMoss' }, at(s.sN, s.torso, 1.4), 4.6, 3.2, s.torso + 90);
  for (const k of [-2, 0, 2]) d.ribbon({ mat: MS, z: z + 0.05, group: 'mossStr' + k, line: 'soft' }, [at(at(s.sN, s.torso, 1), s.torso + 90, k), v(at(s.sN, s.torso + 90, k).x + k * 0.3, s.sN.y - 6)], [1, 0.3]);
}

/**
 * The whip: a long vine from the near hand, `whipAng` where it leaves the hand, `curl` degrees
 * turned at each joint; pale thorns along it. At rest it coils and drags; in a lash it is thrown
 * out nearly straight.
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
  const widths = pts.map((_, k) => 1.4 - (k / n) * 1.0);
  d.ribbon({ mat: VN, z, group: 'whip', line: 'soft' }, pts, widths);
  const th: { p: V; c: typeof TH.ramp[0] }[] = [];
  for (let k = 2; k < n; k += 2) {
    const dir = Math.atan2(pts[k + 1].y - pts[k].y, pts[k + 1].x - pts[k].x) * (180 / Math.PI);
    th.push({ p: at(pts[k], dir + (k % 4 ? 90 : -90), 1.6), c: TH.ramp[4] });
  }
  d.pixels({ mat: TH, z: z + 0.1, group: 'whip', line: 'none' }, th);
}

/** The head frame: the face looks ahead, a little down, whatever the neck does. */
function headFrame(s: Skel) {
  const dd = ((86 + (s.headDir - 90) * 0.5) - s.headDir) * (Math.PI / 180);
  const c = Math.cos(dd), n = Math.sin(dd);
  return (u: number, w: number) => s.H(u * c - w * n, u * n + w * c);
}

/** The long head: a mask of knotted root, two amber eyes, a crack for a mouth, a knot at the brow. */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = headFrame(s);
  d.capsule({ mat: BK, z: z - 0.5, group: 'neck', tex: wound }, s.neck, H(-0.6, -3), 2.8, 2.4);
  d.poly({ mat: BK, z, group: 'mask', tex: wound }, [H(-4.6, -3), H(-5.2, 3), H(-3, 8), H(1, 9.6), H(4.6, 7.4), H(6.2, 3), H(6.4, -1.4), H(5.2, -6), H(2.6, -9), H(0, -8.4), H(-3, -6)], { kind: 'dome', c: H(1, 1), r: 9, bevel: 1.2 });
  // the knot at the brow
  d.circle({ mat: BK, z: z + 0.1, group: 'knot', line: 'soft' }, H(4.6, 5.4), 1.6);
  // amber eyes, deep-set under the brow roots; dull when dead
  d.pixels({ mat: SAP, z: z + 0.2, group: 'eyes', line: 'none', outline: false }, P.dead
    ? [{ p: H(4.2, 1.6), c: BK.ramp[0] }, { p: H(5.2, 1.6), c: BK.ramp[0] }]
    : [{ p: H(4.2, 1.6), c: SAP.ramp[4] }, { p: H(5.2, 1.6), c: SAP.ramp[5] }, { p: H(5.2, 0.6), c: SAP.ramp[2] }]);
  d.line({ mat: BK, z: z + 0.15, group: 'brow', line: 'none' }, H(2.6, 3.2), H(6.2, 2.6), BK.ramp[0]);
  // the crack for a mouth
  d.line({ mat: BK, z: z + 0.15, group: 'mouth', line: 'none' }, H(3, -4.4), H(5.6, -3.2), BK.ramp[0]);
}

/** Tendrils of root trailing back from the crown like hair, thorns on them, swaying. */
function tendrils(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = headFrame(s);
  const w = Math.sin(P.wave ?? 0) * 6;
  const flare = P.flare ?? 0;
  [[-2, 8, 150, 18], [-4, 6, 170, 22], [-5, 3, 190, 20], [-4.6, 0, 205, 14]].forEach(([x, y, ang, len], k) => {
    const p0 = H(x, y);
    const a0 = ang - flare * 40 + w * (k % 2 ? 1 : -1) * 0.5;
    const p1 = at(p0, a0, len * 0.4), p2 = at(p1, a0 + 18 + w * 0.6, len * 0.35), p3 = at(p2, a0 + 34 + w, len * 0.3);
    d.ribbon({ mat: BK, z: z + k * 0.01, group: 'tendril' + k, shade: -1, line: 'soft' }, [p0, p1, p2, p3], [1.6, 1.3, 0.9, 0.3]);
    d.pixels({ mat: TH, z: z + 0.05, group: 'tendril' + k, line: 'none' }, [{ p: at(p1, a0 + 90, 1.4), c: TH.ramp[3] }]);
  });
}

// ---------------------------------------------------------------------------
// Poses & animations (hand coordinates: [forward, up] from the feet)
// ---------------------------------------------------------------------------

const st = (hN: V, hF: V, o: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hN, bend: -1 }, armF: { ik: hF, bend: -1 }, ...o, p: { whipAng: -70, curl: 18, ...(o.p ?? {}) } });

const STAND = { torso: 84, head: 86, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) } };
const IDLE = st(v(12, 36), v(18, 38), { y: -1, ...STAND });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return st(v(12, 36 - b), v(18, 38 - b), { y: -1 - b, ...STAND, torso: 84 - b, p: { wave: a, beat: b, whipAng: -72 + b * 2 } });
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
  return st(v(10 + sw * 6, 38 + bob), v(16 - sw * 6, 39 + bob), {
    y: bob - 2, torso: 74, head: 80,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    p: { wave: a * 2, whipAng: -150, curl: 6, flare: 0.4 },
  });
}

// Thorn Lash: the vine drawn back over the shoulder, cracked down across the enemy; drawn back low, cracked up.
const TL_WIND = st(v(-4, 60), v(18, 40), { x: -3, y: -1, torso: 92, head: 92, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, p: { whipAng: 160, curl: -14, flare: 0.3 } });
const TL_ONE = st(v(22, 46), v(12, 40), { x: 6, y: -3, torso: 72, head: 80, legN: { ik: v(-12, 3) }, legF: { ik: v(15, 3) }, p: { whipAng: -12, curl: -2, flare: 0.6, wave: 1.4 } });
const TL_LOW = st(v(8, 30), v(16, 44), { x: 4, y: -3, torso: 78, head: 84, legN: { ik: v(-12, 3) }, legF: { ik: v(14, 3) }, p: { whipAng: -150, curl: 6, wave: 2 } });
const TL_TWO = st(v(24, 52), v(10, 38), { x: 7, y: -2, torso: 76, head: 82, legN: { ik: v(-13, 3) }, legF: { ik: v(16, 3) }, p: { whipAng: 14, curl: -3, flare: 0.6, wave: 2.6 } });

// Spore Burst: a ripe fig plucked from the belt, raised overhead in the far hand and crushed.
const SB_PLUCK = st(v(12, 36), v(10, 30), { x: -1, torso: 86, head: 80, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, p: { fig: 1 } });
const SB_RAISE = st(v(14, 40), v(8, 74), { x: -2, y: 0, torso: 92, head: 98, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, p: { fig: 1, flare: 0.5 } });
const SB_CRUSH = st(v(14, 40), v(9, 70), { x: -2, y: -1, torso: 90, head: 96, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, p: { fig: 2, flare: 1, wave: 2 } });

// Reaping Root: he drops to a knee and drives his near arm into the ground; the roots go to the enemy under the earth.
const RR_LIFT = st(v(6, 66), v(18, 42), { x: -2, y: 0, torso: 92, head: 94, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, p: { whipAng: 120, curl: -10, flare: 0.4 } });
const RR_PLUNGE = st(v(18, 2), v(12, 26), { x: 2, y: -14, torso: 56, head: 64, legN: { ik: v(-14, 3) }, legF: { ik: v(12, 3) }, footN: -50, p: { nowhip: 1, flare: 1, wave: 1, beat: 1 } });
const RR_HOLD = tweak(RR_PLUNGE, { y: -13, p: { flare: 0.8, wave: 2.2, beat: 0 } });

const HURT = st(v(8, 38), v(14, 40), { x: -4, y: -1, torso: 98, head: 100, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10, p: { flare: 0.5, whipAng: -110, curl: 10 } });
const DEATH_KNEEL = st(v(14, 10), v(20, 12), { y: -14, torso: 66, head: 50, legN: { ik: v(-14, 3) }, legF: { ik: v(9, 3) }, footN: -60, p: { dead: 1, whipAng: -10, curl: 4 } });
const DEATH_FALL = pose({
  x: 2, y: -22, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -40, lo: -10 }, armF: { up: -20, lo: 10 },
  p: { dead: 1, whipAng: -5, curl: 2, wave: 2 },
});
const DEATH_DOWN = pose({
  x: 6, y: -28, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { dead: 1, whipAng: 2, curl: 1, wave: 3 },
});

// Victory: both arms lifted, the tendrils flaring, the vine curling up.
const RAISE = st(v(18, 66), v(6, 70), { y: 0, torso: 88, head: 96, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, p: { whipAng: 60, curl: 16, flare: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const waved = (p: Pose, w: number) => tweak(p, { p: { wave: w } });

const char: CharDef = {
  id: 'strangler',
  name: 'Strangler',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TL_WIND, 2, 80),
        ...keys([
          [TL_WIND, 190],
          [mid(TL_WIND, TL_ONE, 0.5), 40],
          [TL_ONE, 70, { hit: true }],
          [waved(TL_ONE, 1.8), 90],
          [TL_LOW, 90],
          [mid(TL_LOW, TL_TWO, 0.5), 40],
          [TL_TWO, 70, { hit: true }],
          [waved(TL_TWO, 3), 200],
        ]),
        ...tween(D, TL_TWO, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SB_PLUCK, 2, 90),
        ...keys([
          [SB_PLUCK, 160],
          [mid(SB_PLUCK, SB_RAISE, 0.5), 90],
          [SB_RAISE, 220],
          [SB_CRUSH, 120, { event: 'cast', hit: true }],
          [waved(SB_CRUSH, 3), 240],
          [waved(SB_CRUSH, 4), 200],
        ]),
        ...tween(D, tweak(SB_CRUSH, { p: { fig: 0 } }), IDLE, 3, 110, ease.inOut),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RR_LIFT, 2, 90),
        ...keys([
          [RR_LIFT, 220],
          [mid(RR_LIFT, RR_PLUNGE, 0.5), 60],
          [RR_PLUNGE, 160],
          [RR_HOLD, 120, { hit: true }],
          [waved(RR_HOLD, 3), 260],
          [waved(RR_HOLD, 4), 220],
          [mid(RR_HOLD, IDLE, 0.5), 120],
        ]),
        ...tween(D, mid(RR_HOLD, IDLE, 0.5), IDLE, 2, 110, ease.inOut),
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
        [tweak(DEATH_DOWN, { y: -28.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RAISE, 2, 110, ease.out),
        ...keys([
          [waved(RAISE, 1.6), 300],
          [waved(RAISE, 2.6), 300],
          [waved(RAISE, 3.6), 300],
          [mid(RAISE, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** A curling thorned vine in an icon, from `p0` at `a0`, `curl` per joint. */
function iconVine(d: Draw, p0: V, a0: number, curl: number, n: number, seg: number, z: number) {
  const pts: V[] = [p0];
  let a = a0;
  for (let k = 0; k < n; k++) { pts.push(at(pts[pts.length - 1], a, seg)); a += curl; }
  d.ribbon({ mat: VN, z, group: 'ivine' + z, line: 'soft' }, pts, pts.map((_, k) => 2.4 - (k / n) * 1.8));
  for (let k = 1; k < n; k += 2) d.ribbon({ mat: TH, z: z + 0.1, group: 'ithorn' + z + k, line: 'none' }, [pts[k], at(pts[k], a0 + k * curl + 90, 2.6)], [1, 0.2]);
}

export const strangler: ChampionArt = {
  char,
  iconBg: BK,
  icons: {
    thorn_lash: () =>
      compose(BK, glyph((d) => iconVine(d, v(4, 6), 70, -16, 9, 4.6, 10)), (b) => impactStar(b, 30, 30, 1, 6, 7, FXR.bile[3], E.white)),
    spore_burst: () =>
      compose(BK, glyph((d) => {
        d.ellipse({ mat: FG, z: 10, group: 'ifig' }, v(20, 17), 7, 8, 0);
        d.ribbon({ mat: VN, z: 10.1, group: 'istalk', line: 'soft' }, [v(20, 24), v(21, 30)], [1.2, 0.8]);
      }), (b) => {
        for (const [x, y] of [[8, 10], [12, 6], [30, 8], [33, 14], [6, 18], [34, 22], [10, 30], [29, 31], [16, 4], [24, 3]] as const) {
          b.set(x, y, FXR.bile[3]);
          b.set(x + 1, y, FXR.bile[2]);
        }
        for (const [x, y] of [[19, 21], [21, 23], [18, 24]] as const) b.set(x, y, FXR.bile[4]);
      }),
    reaping_root: () =>
      compose(BK, glyph((d) => {
        for (const [x, h, lean] of [[11, 22, 4], [20, 30, -3], [29, 20, -5]] as const) {
          d.ribbon({ mat: MAT.bark, z: 10, group: 'iroot' + x, line: 'soft' }, [v(x, 3), v(x + lean * 0.5, 3 + h * 0.5), v(x + lean, 3 + h)], [3, 2.2, 0.4]);
        }
      }), (b) => {
        impactStar(b, 20, 10, 1, 7, 8, FXR.bile[3], FXR.bile[4]);
        for (let x = 3; x <= 36; x++) b.set(x, 37, MAT.bark.ramp[1]);
      }),
    bitter_sap: () =>
      compose(BK, glyph((d) => {
        d.ellipse({ mat: SAP, z: 10, group: 'idrop', line: 'soft' }, v(20, 14), 7, 7, 0);
        d.poly({ mat: SAP, z: 10.1, group: 'idrop' }, [v(14, 17), v(26, 17), v(20, 31)], { kind: 'bevel', w: 1 });
      }), (b) => {
        for (const [x, y] of [[17, 22], [18, 21], [19, 24]] as const) b.set(x, y, E.white);
      }),
  },
};
