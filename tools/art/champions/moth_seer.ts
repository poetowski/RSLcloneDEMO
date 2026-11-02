// The Moth Seer (docs/DESIGN_DECISIONS.md section 70, 2026-11-02, my design on Jakub's
// word): an Elite Support of the Court of Root. A slender figure in a long hooded cloak
// of grey-brown down, a pale mask of bark with two great dark moth's eyes and no other
// face, feathered antennae rising from the brow; two great pale wings on its back with
// an eye-spot on each (the silhouette); a lantern of fireflies hanging from a crooked
// stick in its near hand. No insignia: the Court shares a nature, not a hierarchy. Its
// wings move slowly (the calm motion rule). Its affinity (Bloom) sets nothing here
// (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { foldTex, robe, RobeCfg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16,
  shin: 16,
  ankleH: 3,
  footLen: 5,
  spine: 20,
  neck: 6,
  upperArm: 11.6,
  foreArm: 11.4,
  shoulderDrop: 3.6,
  shoulderN: -2.2,
  shoulderF: 2.6,
  hipN: -1.2,
  hipF: 1.2,
};

const CL = MAT.furBrown, WG = MAT.furCream, SP = MAT.amber, MK = MAT.bone, DK = MAT.charcoal, WD = MAT.bark, LN = MAT.glowAmber, FU = MAT.furSaddle;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;
  const open = P.wing ?? 0;

  wing(d, s, open, wave, 'F', 2, -1);
  wing(d, s, open, wave, 'N', 4, 0);
  feet(d, s, 8);
  sleeve(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF');
  skirt(d, s, wave, 20);
  body(d, s, 30);
  head(d, s, P, 38);
  if (P.drop) lantern(d, v(20, 2.6), 3, wave, 50, true);
  else lantern(d, s.hN, P.stAng ?? 72, wave, 50, false);
  sleeve(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN');
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

/** One great wing, from between the shoulders: the fore wing rising and the hind wing below it, pale, a dark edge, an eye-spot. `open` spreads them (0-1). */
function wing(d: Draw, s: Skel, open: number, wave: number, side: 'N' | 'F', z: number, shade: number) {
  const root = s.T(17, -3.6);
  const beat = Math.sin(wave) * 3;
  const off = side === 'F' ? -14 : 0;
  const base = s.pose.torso + 30 - open * 22 + beat + off;
  const f = d.frame(root, base);
  const g = 'wing' + side;
  // the fore wing, up and back
  d.poly({ mat: WG, z, group: g + 'A', shade }, [f(0, 0), f(10, 8.4), f(24, 13), f(36, 11), f(38, 4), f(30, -3), f(16, -5)], { kind: 'bevel', w: 1.4 });
  d.ribbon({ mat: FU, z: z + 0.05, group: g + 'A', line: 'none', shade }, [f(24, 13), f(36, 11), f(38, 4), f(30, -3)], [1, 1.3, 1.3, 1]);
  // the hind wing, down behind it
  const h = d.frame(root, s.pose.torso + 104 + open * 34 - beat * 0.6 - off * 0.7);
  d.poly({ mat: WG, z: z - 0.1, group: g + 'B', shade: shade - 1 }, [h(0, 0), h(8, 7), h(20, 9), h(29, 5), h(27, -3), h(14, -6)], { kind: 'bevel', w: 1.2 });
  d.ribbon({ mat: FU, z: z - 0.05, group: g + 'B', line: 'none', shade: shade - 1 }, [h(20, 9), h(29, 5), h(27, -3)], [0.9, 1.1, 0.9]);
  if (side === 'N') {
    // the eye-spot on the fore wing, and its veins
    d.circle({ mat: SP, z: z + 0.1, group: 'spot' }, f(24, 4), 3.8);
    d.circle({ mat: DK, z: z + 0.12, group: 'spot', line: 'none' }, f(24, 4), 2);
    d.pixels({ mat: DK, z: z + 0.14, group: 'spot', line: 'none', outline: false }, [{ p: f(25, 5), c: E.white }]);
    d.line({ mat: WG, z: z + 0.06, group: g + 'A', line: 'none' }, f(3, 0.6), f(19, 1.4), WG.ramp[2]);
  }
}

const ROBE: RobeCfg = { waist: [1.4, 4.6, 5], hemDrop: 1.4, hemFloor: 0.6, hemBack: [8.6, 6.8], hemFront: [5.6, 4.4], midBack: [4.6, 3.2], midFront: [3.4, 2], ripple: 0.9, zigzag: 1.6 };

function skirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: CL, z, group: 'cloak', tex: foldTex(9, wave * 0.5, 0.6) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
}

function body(d: Draw, s: Skel, z: number) {
  const b = torsoPts(s, [
    [0, 4.4, 4.6],
    [4, 4, 4.2],
    [9, 4.4, 5],
    [14, 5, 5.4],
    [17, 5, 4.8],
    [19, 4, 3],
    [20, 2.4, 2],
  ]);
  d.poly({ mat: CL, z, group: 'body', tex: foldTex(6, 0.8, 0.75) }, b, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(20, 0.6), r: 5.6, bevel: 1.2 });
  // a ruff of soft pale down at the throat, like a moth's
  d.poly({ mat: WG, z: z + 0.2, group: 'ruff', line: 'soft' }, [s.T(21, -3), s.T(21, 3.4), s.T(17.6, 5.4), s.T(15.6, 3.4), s.T(16.8, 1), s.T(15.4, -1.4), s.T(17, -4.4)], { kind: 'bevel', w: 1 });
}

/** The hood and the pale bark mask: two great dark eyes with a light in them, no nose, no mouth; two feathered antennae rising from the brow. */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  // the antennae behind the hood
  for (const [dx, sweep, shade] of [[1.6, -5, -1], [-0.6, -9, 0]] as const) {
    const r = H(dx, 6);
    const tip = H(dx + sweep, 18);
    const m = H(dx + sweep * 0.3, 13);
    d.ribbon({ mat: FU, z: z - 0.4, group: 'ant' + dx, shade, line: 'none' }, [r, m, tip], [0.6, 0.5, 0.4]);
    for (const k of [0.3, 0.5, 0.7, 0.9]) {
      const q = H(dx + sweep * k * k, 6 + 12 * k);
      d.line({ mat: WG, z: z - 0.35, group: 'ant' + dx, shade, line: 'none' }, v(q.x - 2.4 * (1.2 - k), q.y + 1), v(q.x + 2.4 * (1.2 - k), q.y - 1), WG.ramp[3]);
    }
  }
  // the hood
  d.poly({ mat: CL, z, group: 'hood' }, [H(5.2, 5.6), H(1, 8.4), H(-4, 7.8), H(-7.4, 3.4), H(-8, -3), H(-5.4, -7), H(-1, -7), H(0.4, 0), H(3, 4)], { kind: 'dome', c: H(-2, 1.6), r: 8.6, bevel: 1.2 });
  // the mask
  d.poly({ mat: MK, z: z + 0.1, group: 'mask' }, [H(-0.6, 4.4), H(4.8, 5.2), H(7, 2), H(7, -2), H(4.4, -6.4), H(1.6, -7), H(-1.2, -2)], { kind: 'dome', c: H(3, -0.6), r: 7, bevel: 1 });
  const px: { p: V; c: typeof INK.eye }[] = [];
  for (const [u, w] of [[2.6, 1], [3.8, 1], [5, 1], [2.6, 0], [3.8, 0], [5, 0], [3.2, -1], [4.4, -1], [3.2, 2], [4.4, 2]] as const) px.push({ p: H(u, w), c: INK.black });
  if (!P.dead) px.push({ p: H(4.4, 1), c: E.eyeAmber });
  // the grain of the bark
  px.push({ p: H(1, -3), c: MK.ramp[2] }, { p: H(2.4, -4.4), c: MK.ramp[2] }, { p: H(4.2, -4), c: MK.ramp[2] });
  d.pixels({ mat: MK, z: z + 0.2, group: 'mask', line: 'none', outline: false }, px);
}

function sleeve(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: CL, z, group, shade }, sh, el, 2.6, 2.2);
  d.capsule({ mat: CL, z: z + 0.1, group, shade }, el, at(ha, lo, -1.4), 2.2, 2.8);
  d.ellipse({ mat: MK, z: z + 0.3, group, shade }, at(ha, lo, 0.2), 1.6, 1.3, lo);
}

function feet(d: Draw, s: Skel, z: number) {
  for (const [side, shade] of [['F', -1], ['N', 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF, fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: FU, z: z + (side === 'N' ? 1 : 0), group: 'foot' + side, shade }, [f(-2.2, 1.6), f(-2.6, -1), f(-2, -3), f(5, -3), f(6, -1.6), f(3, 0), f(1, 1.6)], { kind: 'bevel', w: 1.3 });
  }
}

/** The crooked stick, a little lantern of woven twigs hanging from its end, fireflies in it and round it. */
function lantern(d: Draw, hand: V, ang: number, wave: number, z: number, fallen: boolean) {
  const f = d.frame(hand, ang);
  d.ribbon({ mat: WD, z, group: 'stick' }, [f(-12, 0), f(4, 0.6), f(18, -0.6), f(28, 1.4), f(32, 6)], [1, 1, 0.9, 0.9, 0.7]);
  const end = f(32, 6);
  const sw = fallen ? 0 : Math.sin(wave) * 2;
  const c = fallen ? v(end.x + 2, 6) : v(end.x + sw, end.y - 8);
  if (!fallen) d.line({ mat: DK, z: z + 0.1, group: 'cord', line: 'none' }, end, v(c.x, c.y + 4), DK.ramp[3]);
  d.ellipse({ mat: LN, z: z + 0.2, group: 'lanternGlow' }, c, 3.8, 4.4, 0);
  for (const dx of [-2, 0, 2]) d.line({ mat: WD, z: z + 0.3, group: 'lanternCage', line: 'none' }, v(c.x + dx, c.y + 4), v(c.x + dx, c.y - 4), WD.ramp[1]);
  if (fallen) return;
  const px: { p: V; c: typeof E.white }[] = [];
  for (let n = 0; n < 4; n++) {
    const a = wave + n * 1.57;
    px.push({ p: v(c.x + Math.cos(a) * (7 + n), c.y + Math.sin(a * 2) * 3 + Math.sin(a) * 4), c: LN.ramp[n % 2 ? 4 : 5] });
  }
  d.pixels({ mat: LN, z: z + 9, group: 'flies', line: 'none', outline: false }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const seer = (hN: V, hF: V, o: Partial<Pose> & { p?: Record<string, number> }, st = 72) =>
  pose({ armN: { ik: hN, bend: -1 }, armF: { ik: hF, bend: -1 }, ...o, p: { stAng: st, wing: 0, ...(o.p ?? {}) } });

const STAND = { torso: 89, head: 90, legN: { ik: v(-4, 3) }, legF: { ik: v(4, 3) } };
const IDLE = seer(v(13, 35), v(7, 33), { y: -1, ...STAND });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return seer(v(13, 35 - b), v(7, 33 - b), { y: -1 - b, ...STAND, p: { wave: a, wing: 0.05 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -8 * Math.cos(ph), y: 3 + (sn > 0 ? 4 * sn : 0), ang: 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return seer(v(13, 38 + bob), v(8, 36 + bob), { y: bob - 1, torso: 80, head: 84, legN: { ik: v(n.x, n.y) }, legF: { ik: v(f.x, f.y) }, p: { wave: a * 2, wing: 0.25 } }, 50);
}

// Dust Wing: the wings drawn up, then one slow beat forward.
const DW_UP = seer(v(10, 36), v(5, 34), { x: -2, torso: 96, head: 92, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) }, p: { wing: 1 } }, 80);
const DW_BEAT = seer(v(15, 38), v(16, 44), { x: 2, torso: 78, head: 82, legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) }, p: { wing: -0.5 } }, 60);
const DW_HOLD = tweak(DW_BEAT, { torso: 82, p: { wing: -0.2 } });

// Night Powder: the lantern lifted, the wings opened as far as they go, held.
const NP_LIFT = seer(v(12, 60), v(16, 40), { y: 1, torso: 93, head: 100, legN: { ik: v(-5, 3) }, legF: { ik: v(5, 3) }, p: { wing: 1 } }, 80);
const NP_HELD = tweak(NP_LIFT, { y: 2, p: { wing: 0.85, wave: 1.5 } });

const HURT = seer(v(9, 34), v(4, 32), { x: -4, y: -1, torso: 99, head: 106, legN: { ik: v(-8, 3) }, legF: { ik: v(5, 4) }, footF: 10, p: { wing: 0.5 } }, 90);
const DEATH_KNEEL = seer(v(8, 22), v(4, 20), { y: -10, torso: 74, head: 54, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, footN: -12, p: { wing: -0.5, dead: 1 } }, 30);
const DEATH_FALL = pose({
  x: 2, y: -7, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { wing: -0.2, dead: 1, drop: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -21, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { wing: -0.9, dead: 1, drop: 1 },
});
const RAISE = seer(v(12, 66), v(8, 38), { y: 1, torso: 90, head: 96, legN: { ik: v(-4, 3) }, legF: { ik: v(4, 3) }, p: { wing: 1 } }, 86);

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'moth_seer',
  name: 'Moth Seer',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 210, idle) },
    run: { loop: true, frames: cycle(8, 84, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, DW_UP, 2, 110, ease.out),
        ...keys([
          [DW_UP, 240],
          [mid(DW_UP, DW_BEAT, 0.5), 70],
          [DW_BEAT, 100, { event: 'shoot', hit: true }],
          [DW_HOLD, 260],
        ]),
        ...tween(D, DW_HOLD, IDLE, 3, 120, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, NP_LIFT, 3, 120, ease.out),
        ...keys([
          [NP_LIFT, 260],
          [NP_HELD, 120, { hit: true }],
          [tweak(NP_HELD, { p: { wing: 0.95, wave: 3 } }), 300],
          [NP_HELD, 240],
        ]),
        ...tween(D, NP_HELD, IDLE, 3, 130, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 96, head: 100 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 120],
        [DEATH_KNEEL, 280],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 150],
        [tweak(DEATH_DOWN, { y: -21.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, RAISE, 0.5), 110],
        [RAISE, 700],
        [mid(RAISE, IDLE, 0.5), 120],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** A moth seen from above. */
function iconMoth(d: Draw, c: V, k: number) {
  const P = (x: number, y: number) => v(c.x + x * k, c.y + y * k);
  for (const s of [-1, 1]) {
    d.poly({ mat: WG, z: 3, group: 'wingA' + s }, [P(0, 3), P(s * 8, 14), P(s * 18, 13), P(s * 18, 3), P(s * 8, -1)], { kind: 'bevel', w: 1.4 });
    d.poly({ mat: WG, z: 2.6, group: 'wingB' + s, shade: -1 }, [P(0, 1), P(s * 9, 0), P(s * 14, -7), P(s * 8, -13), P(0, -8)], { kind: 'bevel', w: 1.2 });
    d.circle({ mat: SP, z: 3.2, group: 'spot' + s }, P(s * 11, 7), 2.6);
    d.circle({ mat: DK, z: 3.3, group: 'spot' + s, line: 'none' }, P(s * 11, 7), 1.2);
  }
  d.capsule({ mat: CL, z: 4, group: 'body' }, P(0, 8), P(0, -10), 2.2, 1.4);
}

export const mothSeer: ChampionArt = {
  char,
  iconBg: CL,
  icons: {
    dust_wing: () =>
      compose(CL, glyph((d) => iconMoth(d, v(15, 21), 0.8)), (b) => {
        for (const [x, y, k] of [[31, 14, 5], [34, 18, 4], [36, 13, 3], [33, 23, 4], [37, 21, 3], [30, 27, 3]] as const) b.set(x, y, WG.ramp[k]);
      }),
    night_powder: () =>
      compose(DK, glyph((d) => iconMoth(d, v(20, 21), 1)), (b) => {
        for (const [x, y] of [[6, 8], [34, 6], [4, 30], [36, 31], [20, 37]] as const) b.set(x, y, WG.ramp[5]);
      }),
    soft_powder: () =>
      compose(FU, glyph((d) => {
        d.ellipse({ mat: LN, z: 3, group: 'lantern' }, v(20, 19), 9, 11, 0);
        for (const x of [14, 20, 26]) d.line({ mat: WD, z: 4, group: 'cage', line: 'none' }, v(x, 30), v(x, 8), WD.ramp[1]);
      })),
  },
};
