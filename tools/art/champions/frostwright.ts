// The Frostwright (docs/DESIGN_DECISIONS.md section 91, Jakub's brief of
// 2026-11-07: "mage with hoodie", A1 and A2 with Freeze; then "cold coat in
// white color with red and black insignias"; redrawn on his word of the same
// day, the first drawing "not sufficient"): an Elite Damage of the Sanguine
// Dominion, a young frost-mage drafted into its service. On the Junior Ward's
// rig, lean and upright: a closed white greatcoat flaring to the ankles, a
// black band at its hem edged red; a short black shoulder cape lined red over
// it (the Dominion's military cut); a deep hood with a thick white fur ruff
// framing a pale young face and cold pale eyes; the insignia: a black armband
// with the red hexagon on the near sleeve and a black sash across the chest
// with a small red hexagon clasp; black gloves, black boots with fur cuffs.
// Rime crusts his shoulders and icicles hang from the coat's hem. Three shards
// of ice turn over his raised palm. Rime Shard thrusts the palm out; Deep
// Winter throws both arms up, shards round each hand. The cold is what his
// skills do: his affinity (Bloom) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { cape, foldTex, leg, robe, RobeCfg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { RGBA } from '../raster.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 36,
  thigh: 17,
  shin: 16.8,
  ankleH: 3,
  footLen: 6.4,
  spine: 21.8,
  neck: 6.4,
  upperArm: 12.8,
  foreArm: 12.2,
  shoulderDrop: 4.2,
  shoulderN: -2.8,
  shoulderF: 3.0,
  hipN: -1.6,
  hipF: 1.6,
};

const SK = MAT.skinPale, WT = MAT.whiteCloth, FU = MAT.furWhite, BK = MAT.blackCloth, RD = MAT.red, IC = MAT.ice;
const E = ACCENT;

// the greatcoat's skirt, to the ankles, flaring
const COAT: RobeCfg = { waist: [1.4, 6.4, 6.8], hemDrop: -2, hemFloor: 3, hemBack: [6.6, 5.6], hemFront: [5.8, 5], midBack: [5.4, 4], midFront: [4.6, 3.2], ripple: 0.5, zigzag: 0 };

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;
  const spin = P.spin ?? 0;

  // the far leg, the far arm and its shards behind the body
  leg(d, s, 'F', legCfg(10, -1));
  sleeve(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF', false);
  if (P.shardsF) shards(d, s.hF, spin + 0.5, P.shardsF, 15);
  // the coat's skirt with its black hem band and icicles, the near leg's boot under it
  coatSkirt(d, s, wave, 20);
  leg(d, s, 'N', legCfg(19, 0));
  // the coat's body, the sash, the shoulder cape, the hood's back
  coatBody(d, s, 30);
  cape(d, s, { mat: BK, z: 31, group: 'capelet', len: 6.5, topU: 21.4, topBack: 6.8, topFront: 5.8, spread: 3, wind: P.wind ?? 0.04, wave });
  capeLining(d, s, 31.2);
  rime(d, s, 31.4);
  head(d, s, P, 38);
  // the near arm, its armband, the shards over the palm
  sleeve(d, s.sN, s.eN, s.hN, s.loN, 50, 0, 'armN', true);
  if ((P.shards ?? 1) > 0) shards(d, s.hN, spin, P.shards ?? 1, 52);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

// black trousers into tall black boots with white fur cuffs (mostly under the coat)
const legCfg = (z: number, shade: number) => ({
  thigh: BK, shin: BK, foot: BK, rThigh: [3.8, 3.0] as [number, number], rShin: [2.8, 2.5] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: BK, from: 0.45, r: [3.0, 2.8] as [number, number], cuff: FU },
});

/** The coat's skirt: white, a black band at the hem edged red, short icicles hanging from it. */
function coatSkirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, COAT, wave);
  d.poly({ mat: WT, z, group: 'skirt', tex: foldTex(10, wave * 0.5, 0.6) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  // the hem band: black, its top edge red
  const hem = r.hem;
  d.ribbon({ mat: BK, z: z + 0.1, group: 'hemband', line: 'none' }, hem.map((p) => v(p.x, p.y + 1.6)), hem.map(() => 1.4));
  d.ribbon({ mat: RD, z: z + 0.15, group: 'hemband', line: 'none' }, hem.map((p) => v(p.x, p.y + 3.2)), hem.map(() => 0.5));
  // icicles from the hem, a pixel or two long
  const px: { p: V; c: RGBA }[] = [];
  hem.forEach((p, i) => {
    if (i % 2) return;
    px.push({ p: v(Math.round(p.x), Math.round(p.y - 0.4)), c: IC.ramp[4] });
    if (i % 4 === 0) px.push({ p: v(Math.round(p.x), Math.round(p.y - 1.4)), c: IC.ramp[3] });
  });
  d.pixels({ mat: IC, z: z + 0.2, group: 'icicles', line: 'none', outline: false }, px);
}

/** The coat's body, closed and double-breasted, the black sash across it with its red hexagon clasp. */
function coatBody(d: Draw, s: Skel, z: number) {
  const pts = torsoPts(s, [
    [0, 6.2, 6.6],
    [4, 6.0, 6.6],
    [9, 6.4, 7.2],
    [14, 6.8, 7.6],
    [18, 6.6, 7.0],
    [20.4, 5.0, 4.4],
    [21.8, 2.8, 2.4],
  ]);
  d.poly({ mat: WT, z, group: 'coat', tex: (h) => (Math.sin(h.v * 6 + 0.3) > 0.9 ? -1 : 0) }, pts, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(21.8, 0.6), r: 7.2, bevel: 1.2 });
  // the double row of black buttons down the front
  const px: { p: V; c: RGBA }[] = [];
  for (const u of [5, 9, 13]) px.push({ p: s.T(u, 4.2), c: BK.ramp[2] }, { p: s.T(u, 6.4), c: BK.ramp[2] });
  d.pixels({ mat: WT, z: z + 0.1, group: 'buttons', line: 'none' }, px);
  // the black sash from the far shoulder to the near hip
  d.ribbon({ mat: BK, z: z + 0.3, group: 'sash' }, [s.T(20, -3.4), s.T(14, 1.6), s.T(8, 5.4), s.T(2, 7.0)], [1.4, 1.5, 1.5, 1.3]);
  hexagon(d, s.T(14, 1.8), z + 0.4, 1);
  // the black belt
  d.poly({ mat: BK, z: z + 0.2, group: 'belt' }, [s.T(2.6, -6.6), s.T(2.8, 7.0), s.T(1.2, 7.0), s.T(1.0, -6.4)], { kind: 'cyl', a: s.T(1, 0), b: s.T(2.8, 0), r: 7 });
}

/** The Dominion's red hexagon, pixel by pixel: `size` 1 a 5-px clasp, 0 a 3-px mark on the armband. */
function hexagon(d: Draw, center: V, z: number, size: number) {
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const R = RD.ramp;
  const px: { p: V; c: RGBA }[] = [];
  const cells = size
    ? [[-1, 2], [0, 2], [1, 2], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-1, -2], [0, -2], [1, -2]]
    : [[0, 1], [1, 1], [-1, 0], [0, 0], [1, 0], [0, -1], [1, -1]];
  for (const [x, y] of cells) px.push({ p: v(c.x + x, c.y + y), c: y > 0 || x < 0 ? R[4] : R[3] });
  d.pixels({ mat: RD, z, group: 'hex', line: 'none', outline: false }, px);
}

/** The shoulder cape's red lining, a line along its front edge. */
function capeLining(d: Draw, s: Skel, z: number) {
  const a = s.T(21.6, 5.6), b = s.T(16.6, 6.8);
  d.line({ mat: RD, z, group: 'capelet', line: 'none' }, a, b, RD.ramp[3]);
}

/** Rime crusted on the shoulders: pale ice pixels over the cape. */
function rime(d: Draw, s: Skel, z: number) {
  const px: { p: V; c: RGBA }[] = [];
  for (const [u, w, k] of [[21.6, -4.6, 5], [21.8, -2.4, 4], [21.4, 0.2, 5], [21.8, 2.6, 4], [20.6, -6.0, 3], [20.8, 4.4, 3]] as const) px.push({ p: s.T(u, w), c: IC.ramp[k] });
  d.pixels({ mat: IC, z, group: 'rime', line: 'none', outline: false }, px);
}

/** A white sleeve, a fur cuff, a black glove; on the near arm the black armband with the red hexagon. */
function sleeve(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string, band: boolean) {
  d.capsule({ mat: WT, z, group, shade }, sh, el, 3.0, 2.8);
  d.capsule({ mat: WT, z: z + 0.1, group, shade }, el, at(ha, lo, -1.8), 2.8, 3.0);
  d.capsule({ mat: FU, z: z + 0.15, group, shade, line: 'soft' }, at(ha, lo, -2.4), at(ha, lo, -1.2), 3.1, 3.1);
  d.ellipse({ mat: BK, z: z + 0.3, group, shade }, at(ha, lo, 0.4), 2.0, 1.7, lo);
  if (!band) return;
  const ua = Math.atan2(el.y - sh.y, el.x - sh.x) * 57.29578;
  const m = at(sh, ua, 5.4);
  d.capsule({ mat: BK, z: z + 0.2, group: group + 'band', line: 'soft' }, at(sh, ua, 3.8), at(sh, ua, 7.0), 3.2, 3.1);
  hexagon(d, m, z + 0.25, 0);
}

/** The head: a pale young face, cold pale eyes; the deep hood over it, its thick fur ruff framing the face. */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  d.capsule({ mat: SK, z: z - 0.5, group: 'neck' }, s.neck, H(0, -4), 2.4, 2.2);
  // the hood's back and sides, behind the face
  d.poly({ mat: WT, z: z - 0.3, group: 'hood', tex: (h) => (Math.sin(h.u * 9) > 0.86 ? -1 : 0) }, [H(3.4, 7.6), H(-0.6, 10.4), H(-6.4, 9.0), H(-9.4, 4.0), H(-9.0, -3.6), H(-5.4, -6.0), H(-1.0, -5.0), H(0, 3.6)], { kind: 'dome', c: H(-3, 2), r: 10, bevel: 1.2 });
  face(d, s, { skin: SK, z, brow: MAT.hairSilver.ramp[2], browStyle: 'flat', eye: IC.ramp[1], mouth: P.grit ? 'shout' : 'line', lip: SK.ramp[2], rx: 5.4, ry: 6.2, profile: 'soft' });
  // a shadow under the hood's rim across the brow
  d.ribbon({ mat: SK, z: z + 0.35, group: 'shade', shade: -2, line: 'none' }, [H(-0.6, 4.6), H(2.6, 4.0), H(5.6, 3.2)], [0.8, 0.8, 0.6]);
  // the hood's front rim over the brow, and the fur ruff round the face
  d.poly({ mat: WT, z: z + 0.5, group: 'hoodRim' }, [H(6.4, 4.6), H(3.6, 7.8), H(-1.0, 9.0), H(-1.2, 6.6), H(2.6, 5.2), H(5.6, 3.6)], { kind: 'bevel', w: 1 });
  d.ribbon(
    { mat: FU, z: z + 0.6, group: 'ruff', line: 'soft', tex: (h) => (Math.sin(h.u * 34) > 0.4 ? -1 : 0) },
    [H(6.8, 3.8), H(4.4, 7.6), H(0.2, 9.0), H(-2.0, 6.0), H(-2.4, 1.0), H(-1.6, -4.0), H(1.4, -7.0)],
    [1.5, 1.8, 1.8, 1.7, 1.7, 1.7, 1.5],
  );
  // frost on his breath
  if (P.breath) d.pixels({ mat: IC, z: z + 0.7, group: 'breath', line: 'none', outline: false }, [{ p: H(8.4, -3.4), c: WT.ramp[5] }, { p: H(10.2, -2.6), c: WT.ramp[4] }, { p: H(11.6, -3.6), c: WT.ramp[3] }]);
}

/** Three shards of ice turning in a ring over a palm; `k` (0-1) how far they have formed. */
function shards(d: Draw, hand: V, spin: number, k: number, z: number) {
  const c = v(hand.x + 1, hand.y + 6.5);
  for (let i = 0; i < 3; i++) {
    const a = spin * Math.PI * 2 + (i / 3) * Math.PI * 2;
    const p = v(c.x + Math.cos(a) * 4.2, c.y + Math.sin(a) * 1.6);
    const front = Math.sin(a) < 0;
    const len = (front ? 3.2 : 2.6) * k;
    if (len < 0.8) continue;
    const f = d.frame(p, 90 + Math.cos(a) * 20);
    d.poly({ mat: IC, z: z + (front ? 0.2 : -4), group: 'shard' + i, shade: front ? 0 : -1 }, [f(-len, 0), f(0, len * 0.4), f(len, 0), f(0, -len * 0.4)], { kind: 'bevel', w: 0.6 });
    if (front) d.pixels({ mat: IC, z: z + 0.3, group: 'shard' + i, line: 'none', outline: false }, [{ p: f(0.4, 0.2), c: E.white }]);
  }
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// At rest: upright, the near hand raised before him palm up, the shards turning over it; the far hand behind his back.
const IDLE = pose({
  y: -1, torso: 90, head: 90,
  legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) },
  armN: { ik: v(12, 40), bend: -1 }, armF: { ik: v(-6, 30), bend: 1 },
  p: { shards: 1 },
});

function idle(t: number): Pose {
  const b = Math.round((1 - Math.cos(t * Math.PI * 2)) / 2);
  return tweak(IDLE, { y: -1 - b, armN: { ik: v(12, 40 - b), bend: -1 }, p: { spin: t / 3, wave: t, breath: t > 0.6 ? 1 : 0 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (sn > 0 ? 6 * sn : 0), ang: sn > 0 ? -22 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 2, torso: 80, head: 84,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armN: { up: -70 + sw * 24, lo: -30 + sw * 24 }, armF: { up: -70 - sw * 24, lo: -30 - sw * 24 },
    p: { shards: 0, wave: t, wind: 0.5 },
  });
}

// Rime Shard: the palm drawn in to the chest, the shards gathering, then thrust out; they fly.
const RS_DRAW = pose({ x: -2, y: -1, torso: 94, head: 88, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, armN: { ik: v(4, 44), bend: -1 }, armF: { ik: v(-6, 30), bend: 1 }, p: { shards: 1, spin: 0.15 } });
const RS_THRUST = pose({ x: 4, y: -3, torso: 80, head: 84, legN: { ik: v(-11, 3) }, legF: { ik: v(13, 3) }, armN: { ik: v(26, 46), bend: -1 }, armF: { ik: v(-8, 28), bend: 1 }, p: { shards: 0, grit: 1, breath: 1, wave: 0.4, wind: 0.3 } });
const RS_HOLD = tweak(RS_THRUST, { x: 3, p: { grit: 0, shards: 0.3 } });

// Deep Winter: both hands drawn down, the shards forming round both, then thrown up high; the coat lifts.
const DW_GATHER = pose({ y: -3, torso: 88, head: 82, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, armN: { ik: v(12, 30), bend: -1 }, armF: { ik: v(10, 31), bend: -1 }, p: { shards: 1, shardsF: 0.6, spin: 0.2 } });
const DW_RAISE = pose({ x: 1, y: -1, torso: 92, head: 100, legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) }, armN: { ik: v(16, 70), bend: -1 }, armF: { ik: v(-4, 70), bend: 1 }, p: { shards: 1, shardsF: 1, spin: 0.5, grit: 1, breath: 1, wind: 0.6, wave: 0.6 } });
const DW_HOLD = tweak(DW_RAISE, { p: { spin: 0.75, grit: 0, wind: 0.4, wave: 0.8 } });

const HURT = pose({ x: -4, y: -1, torso: 100, head: 106, legN: { ik: v(-11, 3) }, legF: { ik: v(8, 4) }, footF: 10, armN: { up: -130, lo: -90 }, armF: { up: -110, lo: -80 }, p: { shards: 0, grit: 1 } });

// Death: he sinks to his knees and falls forward, the coat spreading.
const DEATH_KNEEL = pose({ x: 0, y: -12, torso: 80, head: 66, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, footN: -30, armN: { up: -80, lo: -60 }, armF: { up: -90, lo: -70 }, p: { shards: 0 } });
const DEATH_FALL = pose({ x: 2, y: -5, torso: 30, head: 16, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { shards: 0 } });
const DEATH_DOWN = pose({ x: 6, y: -15, torso: 4, head: -2, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { shards: 0 } });

// Victory: the shards spun up high over his raised palm.
const VIC = pose({ y: -1, torso: 90, head: 96, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) }, armN: { ik: v(12, 62), bend: -1 }, armF: { ik: v(-6, 30), bend: 1 }, p: { shards: 1, breath: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'frostwright',
  name: 'Frostwright',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 180, idle) },
    run: { loop: true, frames: cycle(8, 78, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RS_DRAW, 2, 80, ease.out),
        ...keys([
          [RS_DRAW, 120],
          [tweak(RS_DRAW, { p: { spin: 0.4 } }), 100],
          [RS_THRUST, 70, { hit: true }],
          [RS_HOLD, 240],
        ]),
        ...tween(D, RS_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, DW_GATHER, 2, 100, ease.out),
        ...keys([
          [DW_GATHER, 180],
          [tweak(DW_GATHER, { p: { spin: 0.45, shardsF: 1 } }), 160],
          [mid(DW_GATHER, DW_RAISE, 0.5), 70, { event: 'cast' }],
          [DW_RAISE, 110, { hit: true }],
          [DW_HOLD, 380],
        ]),
        ...tween(D, DW_HOLD, IDLE, 3, 120, ease.inOut),
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
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 240],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -15.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, VIC, 0.5), 100],
        [VIC, 200],
        [tweak(VIC, { p: { spin: 0.33 } }), 200],
        [tweak(VIC, { p: { spin: 0.66 } }), 400],
        [mid(VIC, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons
// ---------------------------------------------------------------------------

/** A big shard of ice for the icons, pointing along `ang`. */
function iconShard(d: Draw, c: V, ang: number, len: number, z: number) {
  const f = d.frame(c, ang);
  d.poly({ mat: IC, z, group: 'ishard' + z }, [f(-len * 0.5, 0), f(0, len * 0.22), f(len * 0.5, 0), f(0, -len * 0.22)], { kind: 'bevel', w: 1.4 });
}

export const frostwright: ChampionArt = {
  char,
  iconBg: BK,
  icons: {
    rime_shard: () =>
      compose(BK, glyph((d) => {
        iconShard(d, v(22, 20), 20, 26, 10);
      }), (b) => {
        for (const [x, y] of [[4, 28], [7, 27], [10, 26], [5, 31], [9, 30]] as const) b.set(x, y, E.white);
      }),
    deep_winter: () =>
      compose(BK, glyph((d) => {
        iconShard(d, v(12, 14), 60, 14, 10);
        iconShard(d, v(26, 12), 110, 14, 11);
        iconShard(d, v(20, 26), 90, 18, 12);
      }), (b) => {
        for (const [x, y] of [[6, 6], [33, 8], [4, 22], [35, 24], [12, 34], [28, 34]] as const) b.set(x, y, E.white);
      }),
  },
};
