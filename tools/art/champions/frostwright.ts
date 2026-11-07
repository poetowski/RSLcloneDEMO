// The Frostwright (docs/DESIGN_DECISIONS.md section 91, Jakub's brief of
// 2026-11-07: "mage with hoodie", A1 and A2 with Freeze): an Elite Damage of
// the Sanguine Dominion. Lanky and young on the Junior Ward's rig, in a long
// white cold-weather coat to the shins (white on Jakub's word of 2026-11-07,
// "cold coat in white color with red and black insignias"; crimson first), its
// hood always up and deep, rimmed with white fur, its shadow over his eyes so
// only a pale jaw shows; the insignia: the Dominion's red hexagon on a black
// band down his chest, a black-and-red band on each sleeve, a black belt; dark
// trousers and boots, black gloves crusted white with frost at the fingertips. A shard of
// ice turns over his near palm. Rime Shard flings it; Deep Winter throws both
// hands open. The cold is what his skills do: his affinity (Bloom) sets
// nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { foldTex, leg, robe, RobeCfg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { RGBA } from '../raster.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 36,
  thigh: 17,
  shin: 16.6,
  ankleH: 3,
  footLen: 6.2,
  spine: 21.6,
  neck: 6.6,
  upperArm: 13,
  foreArm: 12.4,
  shoulderDrop: 4.2,
  shoulderN: -2.8,
  shoulderF: 3.0,
  hipN: -1.6,
  hipF: 1.6,
};

const SK = MAT.skinPale, CR = MAT.whiteCloth, FU = MAT.furWhite, BK = MAT.blackCloth, RD = MAT.red, LE = MAT.darkleather, IC = MAT.ice, WT = MAT.whiteCloth;
const E = ACCENT;

const ROBE: RobeCfg = { waist: [1.4, 6.0, 6.4], hemDrop: -7, hemFloor: 8, hemBack: [8, 6], hemFront: [6.4, 5], midBack: [5.8, 4], midFront: [4.6, 3], ripple: 0.5, zigzag: 0 };

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  // the hood's back hangs behind the head
  hoodBack(d, s, 8);
  // the far leg under the robe, the far arm in its sleeve
  leg(d, s, 'F', legCfg(10, -1));
  sleeve(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF');
  if (P.shardF) shard(d, s.hF, P.spin ?? 0, 15);
  // the robe's skirt, the body
  skirtPart(d, s, wave, 20);
  leg(d, s, 'N', legCfg(21, 0));
  body(d, s, 30);
  head(d, s, P);
  sleeve(d, s.sN, s.eN, s.hN, s.loN, 50, 0, 'armN');
  if (!P.drop && (P.shard ?? 1) > 0) shard(d, s.hN, P.spin ?? 0, 52);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: BK, shin: BK, foot: LE, rThigh: [4.0, 3.2] as [number, number], rShin: [3.0, 2.6] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: LE, from: 0.5, r: [3.1, 2.8] as [number, number], cuff: LE },
});

function skirtPart(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: CR, z, group: 'skirt', tex: foldTex(9, wave * 0.5, 0.6) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
}

/** The robe's body, the black chest band with the red hexagon, the black cord belt. */
function body(d: Draw, s: Skel, z: number) {
  const pts = torsoPts(s, [
    [0, 5.8, 6.0],
    [4, 5.6, 6.0],
    [9, 6.0, 6.6],
    [14, 6.4, 7.0],
    [18, 6.2, 6.4],
    [20.4, 4.6, 4.0],
    [21.6, 2.6, 2.2],
  ]);
  d.poly({ mat: CR, z, group: 'body', tex: (h) => (Math.sin(h.v * 6 + 0.3) > 0.9 ? -1 : 0) }, pts, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(21.6, 0.6), r: 7, bevel: 1.2 });
  // a black band down the front, the hexagon on it at the chest
  d.poly({ mat: BK, z: z + 0.3, group: 'band', line: 'soft' }, [s.T(20.4, 2.4), s.T(20.4, 5.8), s.T(0.4, 6.4), s.T(0.4, 3.4)], { kind: 'bevel', w: 0.8 });
  hexBadge(d, s.T(14.4, 4.6), z + 0.4);
  d.poly({ mat: BK, z: z + 0.5, group: 'belt' }, [s.T(3.2, -6.2), s.T(3.4, 6.8), s.T(1.8, 6.8), s.T(1.6, -6.0)], { kind: 'cyl', a: s.T(1.6, 0), b: s.T(3.4, 0), r: 6.8 });
  const knot = s.T(2.4, 5.6);
  d.ribbon({ mat: BK, z: z + 0.6, group: 'belt', line: 'soft' }, [knot, at(knot, -96, 5), at(knot, -92, 8)], [0.7, 0.6, 0.5]);
}

/** The Dominion's red hexagon, pixel by pixel so it stays crisp. */
function hexBadge(d: Draw, center: V, z: number) {
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const R = RD.ramp;
  const px: { p: V; c: RGBA }[] = [];
  for (const [x, y] of [[-1, 1], [0, 1], [1, 1], [-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1], [0, 2], [0, -2]]) px.push({ p: v(c.x + x, c.y + y), c: y > 0 || x < 0 ? R[4] : R[3] });
  d.pixels({ mat: RD, z, group: 'badge', line: 'none', outline: false }, px);
}

/** A loose crimson sleeve to the wrist, a black glove, white frost on the fingertips. */
function sleeve(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: CR, z, group, shade }, sh, el, 3.2, 3.0);
  d.capsule({ mat: CR, z: z + 0.1, group, shade }, el, at(ha, lo, -1.6), 3.0, 3.4);
  // the insignia band round the upper sleeve: black, a red stripe through it
  const ua = Math.atan2(el.y - sh.y, el.x - sh.x) * 57.29578;
  d.capsule({ mat: BK, z: z + 0.05, group, shade, line: 'soft' }, at(sh, ua, 4.2), at(sh, ua, 6.6), 3.3, 3.2);
  d.line({ mat: RD, z: z + 0.06, group, line: 'none' }, at(at(sh, ua, 5.4), ua + 90, 3), at(at(sh, ua, 5.4), ua - 90, 3), RD.ramp[4]);
  d.ellipse({ mat: BK, z: z + 0.3, group, shade }, at(ha, lo, 0.4), 2.0, 1.7, lo);
  d.pixels({ mat: BK, z: z + 0.35, group, line: 'none' }, [{ p: at(ha, lo, 2.0), c: WT.ramp[5] }, { p: at(at(ha, lo, 1.4), lo + 90, 1), c: WT.ramp[4] }]);
}

/** The hood's back: a deep cowl hanging behind the head onto the shoulders. */
function hoodBack(d: Draw, s: Skel, z: number) {
  const H = s.H;
  d.poly({ mat: CR, z, group: 'hoodBack', shade: -1 }, [H(-2, 9.4), H(-8.4, 6), H(-9.4, -1), s.T(18, -6.4), s.T(21, -2), H(-2, 2)], { kind: 'bevel', w: 1.2 });
}

/** The head under the hood: a pale young jaw, the eyes lost in the hood's shadow, frost on his breath. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.4, 2.2);
  face(d, s, { skin: SK, z: 38, browStyle: 'none', mouth: P.grit ? 'shout' : 'line', lip: SK.ramp[2], rx: 5.6, ry: 6.4, profile: 'soft' });
  // the hood: a deep cowl over the crown, its front edge hanging past the brow
  d.poly(
    { mat: CR, z: 39, group: 'hood', tex: (h) => (Math.sin(h.u * 9) > 0.86 ? -1 : 0) },
    [H(7.2, 3.6), H(6.4, 7.6), H(2.4, 10.0), H(-3.4, 10.2), H(-8.0, 7.4), H(-9.2, 2.4), H(-8.6, -3.2), H(-5.6, -4.6), H(-4.4, -0.4), H(-2.0, 3.4), H(2.6, 4.6)],
    { kind: 'dome', c: H(-1.4, 4.4), r: 9.6, bevel: 1.2 },
  );
  // white fur round the hood's opening
  d.ribbon({ mat: FU, z: 39.1, group: 'fur', line: 'soft', tex: (h) => (Math.sin(h.u * 30) > 0.5 ? -1 : 0) }, [H(5.4, -4.6), H(7.4, -0.6), H(7.4, 3.8), H(5.8, 7.6), H(2.4, 10.0)], [1.4, 1.6, 1.6, 1.5, 1.2]);
  // the shadow inside the hood over the eyes, and a faint glint of an eye in it
  d.poly({ mat: BK, z: 38.8, group: 'shade', line: 'none' }, [H(6.6, 3.8), H(1.4, 4.4), H(-1.6, 3.0), H(-1.2, -0.2), H(3.2, -0.6), H(6.8, -0.2)], { kind: 'bevel', w: 0.6 });
  if (!P.dead) d.pixels({ mat: IC, z: 38.9, group: 'shade', line: 'none', outline: false }, [{ p: H(3.8, 1.4), c: IC.ramp[4] }]);
  // frost on his breath
  if (P.breath) d.pixels({ mat: IC, z: 39.2, group: 'breath', line: 'none', outline: false }, [{ p: H(8.4, -3.2), c: WT.ramp[4] }, { p: H(10.2, -2.4), c: WT.ramp[3] }, { p: H(11.6, -3.4), c: WT.ramp[3] }]);
}

/** The shard of ice turning over a palm: a small long diamond, its tilt following `spin`. */
function shard(d: Draw, hand: V, spin: number, z: number) {
  const c = v(hand.x + 1, hand.y + 6);
  const a = 90 + Math.round(Math.sin(spin * Math.PI * 2) * 2) * 15;
  const f = d.frame(c, a);
  d.poly({ mat: IC, z, group: 'shard' }, [f(-3.4, 0), f(0, 1.6), f(3.6, 0), f(0, -1.6)], { kind: 'bevel', w: 0.8 });
  d.pixels({ mat: IC, z: z + 0.1, group: 'shard', line: 'none', outline: false }, [{ p: f(0.6, 0.4), c: E.white }]);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// At rest: a little hunched, the near hand open before him with the shard over it, the far hand at his side.
const IDLE = pose({
  y: -1, torso: 86, head: 84,
  legN: { ik: v(-6, 3) }, legF: { ik: v(7, 3) },
  armN: { ik: v(10, 38), bend: -1 }, armF: { up: -98, lo: -74 },
  p: { shard: 1 },
});

function idle(t: number): Pose {
  const b = Math.round((1 - Math.cos(t * Math.PI * 2)) / 2);
  return tweak(IDLE, { y: -1 - b, armN: { ik: v(10, 38 - b), bend: -1 }, p: { spin: t, wave: t, breath: t > 0.6 ? 1 : 0 } });
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
    y: bob - 2, torso: 76, head: 80,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armN: { up: -70 + sw * 24, lo: -30 + sw * 24 }, armF: { up: -70 - sw * 24, lo: -30 - sw * 24 },
    p: { shard: 0, wave: t },
  });
}

// Rime Shard: the near hand drawn back past his ear, then flung forward, the shard leaving it.
const RS_DRAW = pose({ x: -2, y: -1, torso: 96, head: 88, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, armN: { ik: v(-8, 52), bend: 1 }, armF: { up: -60, lo: -10 }, p: { shard: 1, spin: 0.3 } });
const RS_THROW = pose({ x: 4, y: -3, torso: 76, head: 80, legN: { ik: v(-12, 3) }, legF: { ik: v(13, 3) }, armN: { ik: v(24, 50), bend: -1 }, armF: { up: -120, lo: -110 }, p: { shard: 0, grit: 1, breath: 1 } });
const RS_HOLD = tweak(RS_THROW, { x: 3, p: { grit: 0 } });

// Deep Winter: both hands drawn in to the chest, then thrown open wide, cold pouring out.
const DW_GATHER = pose({ y: -2, torso: 90, head: 86, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, armN: { ik: v(6, 42), bend: -1 }, armF: { ik: v(7, 43), bend: -1 }, p: { shard: 1, shardF: 1, spin: 0.5 } });
const DW_OPEN = pose({ x: 2, y: -2, torso: 84, head: 82, legN: { ik: v(-11, 3) }, legF: { ik: v(11, 3) }, armN: { ik: v(24, 52), bend: -1 }, armF: { ik: v(18, 58), bend: -1 }, p: { shard: 0, grit: 1, breath: 1, wave: 0.5 } });
const DW_HOLD = tweak(DW_OPEN, { p: { grit: 0, wave: 0.7 } });

const HURT = pose({ x: -4, y: -1, torso: 100, head: 106, legN: { ik: v(-11, 3) }, legF: { ik: v(8, 4) }, footF: 10, armN: { up: -130, lo: -90 }, armF: { up: -110, lo: -80 }, p: { shard: 0, grit: 1 } });

// Death: he folds to his knees and falls forward.
const DEATH_KNEEL = pose({ x: 0, y: -12, torso: 76, head: 64, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, footN: -30, armN: { up: -80, lo: -60 }, armF: { up: -90, lo: -70 }, p: { shard: 0 } });
const DEATH_FALL = pose({ x: 2, y: -5, torso: 30, head: 16, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { shard: 0, drop: 1 } });
const DEATH_DOWN = pose({ x: 6, y: -15, torso: 4, head: -2, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { shard: 0, drop: 1, dead: 1 } });

// Victory: the shard tossed up and caught.
const VIC_UP = pose({ y: -1, torso: 90, head: 96, legN: { ik: v(-6, 3) }, legF: { ik: v(7, 3) }, armN: { ik: v(10, 50), bend: -1 }, armF: { up: -98, lo: -74 }, p: { shard: 1, spin: 0.25, breath: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'frostwright',
  name: 'Frostwright',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 78, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RS_DRAW, 2, 80, ease.out),
        ...keys([
          [RS_DRAW, 180],
          [RS_THROW, 70, { hit: true }],
          [RS_HOLD, 220],
        ]),
        ...tween(D, RS_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, DW_GATHER, 2, 100, ease.out),
        ...keys([
          [DW_GATHER, 260],
          [tweak(DW_GATHER, { p: { spin: 0.75 } }), 140],
          [mid(DW_GATHER, DW_OPEN, 0.5), 70, { event: 'cast' }],
          [DW_OPEN, 110, { hit: true }],
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
        [mid(IDLE, VIC_UP, 0.5), 100],
        [VIC_UP, 300],
        [tweak(VIC_UP, { p: { spin: 0.75 } }), 400],
        [mid(VIC_UP, IDLE, 0.5), 110],
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
  iconBg: CR,
  icons: {
    rime_shard: () =>
      compose(CR, glyph((d) => {
        iconShard(d, v(22, 20), 20, 26, 10);
      }), (b) => {
        for (const [x, y] of [[4, 28], [7, 27], [10, 26], [5, 31], [9, 30]] as const) b.set(x, y, E.white);
      }),
    deep_winter: () =>
      compose(CR, glyph((d) => {
        iconShard(d, v(12, 14), 60, 14, 10);
        iconShard(d, v(26, 12), 110, 14, 11);
        iconShard(d, v(20, 26), 90, 18, 12);
      }), (b) => {
        for (const [x, y] of [[6, 6], [33, 8], [4, 22], [35, 24], [12, 34], [28, 34]] as const) b.set(x, y, E.white);
      }),
  },
};
