// The Toadcap (docs/DESIGN_DECISIONS.md section 50, 2026-11-01, my proposal on
// Jakub's word): a Common Damage of the Court of Root, a walking mushroom. A pale
// fat stalk with stubby arms and root feet, a huge russet cap with pale warts and
// gills beneath (the silhouette), two small dark eyes in the stalk under the cap,
// spores drifting off it. It butts with the cap; when
// it dies the cap topples off.
// Redrawn on Jakub's word of 2026-11-03 ("not interesting and should have some fancy detail
// funny"): the cap a red toadstool's with white warts, big round eyes, rosy cheeks and a cheeky
// grin in the stalk, and the joke of its name: a fat toad living on the cap, blinking, puffing
// out its throat, thrown up off the cap when it butts and landing back, and sitting on the
// toppled cap, quite unbothered, when the Toadcap falls. Its affinity (Ember) sets nothing here (Jakub,
// 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { arm, leg, torsoPts } from '../parts.ts';
import { Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 21,
  thigh: 10,
  shin: 9.4,
  ankleH: 3,
  footLen: 6,
  spine: 16,
  neck: 7,
  upperArm: 8.4,
  foreArm: 7.4,
  shoulderDrop: 4.6,
  shoulderN: -5,
  shoulderF: 5.4,
  hipN: -3,
  hipF: 3,
};

const ST = MAT.linen, CP = MAT.red, GL = MAT.bone, RT = MAT.bark, TD = MAT.green, TB = MAT.straw;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(14, -1));
  stalk(d, s, 30);
  leg(d, s, 'N', legCfg(40, 0));
  arm(d, s, 'N', armCfg(60, 0));
  face(d, s, P, 38);
  if (P.drop) {
    fallenCap(d, 56);
    toad(d, (x, y) => v(10 + x * 1.4, 15 + y * 1.4), P, 58);
  } else {
    cap(d, s, P, 50);
    const q = P.squash ?? 0;
    toad(d, (x, y) => s.H(x * 1.4 * (1 + q * 0.2), y * 1.4 + 13.2 * (1 - q * 0.3) + (P.hop ?? 0)), P, 52);
  }
  spores(d, s, P);
}

const legCfg = (z: number, shade: number) => ({
  thigh: ST, shin: ST, foot: RT, rThigh: [5.0, 4.6] as [number, number], rShin: [4.4, 3.8] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: RT, from: 0.8, r: [3.8, 4.0] as [number, number], cuff: RT },
});
const armCfg = (z: number, shade: number) => ({
  upper: ST, fore: ST, hand: RT, rUp: [2.6, 2.4] as [number, number], rLo: [2.4, 2.2] as [number, number], rHand: 2.4, z, shade,
});

/** The fat stalk, wider at the foot, ringed with the old veil's frill under the cap. */
function stalk(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [-2, 8.4, 8.6],
    [4, 8.8, 9.0],
    [9, 8.0, 8.2],
    [14, 6.8, 7.0],
    [18, 5.8, 6.0],
    [23, 5.2, 5.4],
  ]);
  d.poly({ mat: ST, z, group: 'stalk', tex: (h) => (Math.sin(h.u * 28) > 0.9 ? -1 : 0) }, body, { kind: 'cyl', a: s.T(-2, 0), b: s.T(23, 0), r: 8.8, bevel: 1.4 });
  d.ribbon({ mat: GL, z: z + 0.5, group: 'frill' }, [s.T(13, -7.2), s.T(12, -2), s.T(12.6, 3), s.T(12, 7.4)], [1.0, 1.3, 1.3, 1.0]);
}

/** Its face in the stalk under the cap: two big round eyes, rosy cheeks, a wide cheeky grin with one tooth; a grimace when it strikes (`grit`), crosses for eyes when it falls. */
function face(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const T = s.T;
  const px: { p: V; c: RGBA }[] = [];
  if (!P.dead) {
    for (const w of [2.4, 5.6]) {
      px.push({ p: T(16.0, w), c: INK.eye }, { p: T(16.0, w + 1), c: INK.white }, { p: T(15.0, w), c: INK.eye }, { p: T(15.0, w + 1), c: INK.eye }, { p: T(17.0, w), c: INK.eye }, { p: T(17.0, w + 1), c: INK.eye });
      px.push({ p: T(17.2, w - 0.4), c: ST.ramp[1] }, { p: T(17.4, w + 0.8), c: ST.ramp[1] });
    }
    px.push({ p: T(13.0, 1.4), c: INK.blush }, { p: T(13.0, 7.8), c: INK.blush }, { p: T(12.6, 8.4), c: INK.blush });
    if (P.grit) for (let w = 2.6; w <= 7; w += 1) px.push({ p: T(11.6, w), c: w === 4.6 ? INK.white : INK.eye });
    else {
      px.push({ p: T(12.0, 2.4), c: INK.eye }, { p: T(11.2, 3.4), c: INK.eye }, { p: T(11.0, 4.4), c: INK.eye }, { p: T(11.0, 5.4), c: INK.eye }, { p: T(11.2, 6.4), c: INK.eye }, { p: T(12.0, 7.4), c: INK.eye });
      px.push({ p: T(11.9, 5.4), c: INK.white });
    }
  } else {
    for (const w of [2.4, 5.6]) px.push({ p: T(16.0, w), c: ST.ramp[1] }, { p: T(15.0, w + 1), c: ST.ramp[1] }, { p: T(15.0, w), c: ST.ramp[1] }, { p: T(16.0, w + 1), c: ST.ramp[1] });
    px.push({ p: T(11.4, 4), c: ST.ramp[1] }, { p: T(11.4, 5), c: ST.ramp[1] });
  }
  d.pixels({ mat: ST, z, group: 'eyes', outline: false, line: 'none' }, px);
}

/**
 * The toad that lives on its cap, the joke of its name: fat and olive-green with a pale belly,
 * two bulging gold eyes, a wide mouth; it blinks (`blink`), puffs out its throat (`croak`), and is
 * thrown up off the cap when the Toadcap butts (`hop`), its legs splayed.
 */
function toad(d: Draw, F: (x: number, y: number) => V, P: Record<string, number>, z: number) {
  const hop = P.hop ?? 0;
  const spread = Math.min(1, hop / 3);
  // the back leg: folded under when sitting, kicked out behind when it flies
  d.ellipse({ mat: TD, z, group: 'toadLeg', shade: -1 }, F(-3 - spread * 2, 1.6 - spread), 2.4, 1.6, spread * -30);
  d.ellipse({ mat: TD, z: z + 0.1, group: 'toad' }, F(0.6, 3), 4.8, 3.2, 8);
  d.ellipse({ mat: TB, z: z + 0.15, group: 'toadBelly', line: 'none' }, F(2.2, 1.8), 2.8, 1.5, 8);
  // warts on the back
  d.pixels({ mat: TD, z: z + 0.2, group: 'toad', line: 'none' }, [{ p: F(-1.6, 4.8), c: TD.ramp[5] }, { p: F(0.4, 5.6), c: TD.ramp[4] }, { p: F(-3, 3.4), c: TD.ramp[4] }]);
  // the front leg, planted on the cap or reaching down
  d.ribbon({ mat: TD, z: z + 0.25, group: 'toadArm', line: 'soft' }, [F(3.4, 1.8), F(4.4 + spread, 0.4 - spread), F(5.4 + spread * 1.4, -0.4 - spread * 2)], [1.1, 0.9, 0.9]);
  // the throat, puffed out when it croaks
  const cr = P.croak ?? 0;
  if (cr > 0.1) d.circle({ mat: TB, z: z + 0.3, group: 'toadSac', line: 'soft' }, F(4.6, 1.6), 1 + cr * 1.8);
  // the wide mouth
  d.line({ mat: TD, z: z + 0.32, group: 'toad', line: 'none' }, F(5.2, 2.6), F(2.6, 2.4), TD.ramp[0]);
  // the eyes on top, bulging
  for (const [x, y, k] of [[3.2, 5.6, 0], [1.4, 6, 1]] as const) {
    const c = F(x, y);
    d.circle({ mat: TD, z: z + 0.35 - k * 0.02, group: 'toadEye' + k, shade: k ? -1 : 0 }, c, 1.4);
    const closed = (P.blink ?? 0) > 0.5 || P.dead;
    d.pixels({ mat: TD, z: z + 0.4, group: 'toadEye' + k, line: 'none', outline: false }, closed
      ? [{ p: c, c: TD.ramp[1] }, { p: v(c.x + 1, c.y), c: TD.ramp[1] }]
      : [{ p: c, c: ACCENT.eyeAmber }, { p: v(c.x + 1, c.y), c: INK.eye }]);
  }
}

/** The cap on the head's frame: gills under it, a wide russet dome, pale warts. `squash` flattens and widens it. */
function cap(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const q = P.squash ?? 0;
  const wx = 1 + q * 0.2, wy = 1 - q * 0.3;
  const H = (x: number, y: number) => s.H(x * wx, y * wy);
  d.poly({ mat: GL, z: z - 0.2, group: 'gills', tex: (h) => (Math.sin(h.u * 44) > 0 ? -1 : 0) }, [H(-16.4, -3), H(-8, -5.6), H(0, -6.2), H(8, -5.6), H(16.4, -3), H(14, 0), H(-14, 0)], { kind: 'bevel', w: 1 });
  d.poly({ mat: CP, z, group: 'cap' }, [H(-17.6, -2.6), H(-16.6, 2.4), H(-13, 7.8), H(-7.4, 12.2), H(-1, 14.0), H(5.4, 12.8), H(11.4, 8.6), H(15.8, 3.0), H(17.6, -2.6), H(10, -2.4), H(0, -2.0), H(-10, -2.4)], { kind: 'dome', c: H(-1.6, 3.6), r: 18, bevel: 1.6 });
  warts(d, H, z + 0.2);
}

function warts(d: Draw, H: (x: number, y: number) => V, z: number) {
  const W = GL.ramp;
  const px: { p: V; c: (typeof W)[number] }[] = [];
  for (const [x, y, r] of [[-11, 3, 3], [-4, 8, 3], [4, 3, 3], [10, 6, 2], [-6, 0, 2], [13, 1, 2], [-14, 0, 1], [1, 11, 2], [7, 10, 1], [-9, 8, 1]] as const) {
    for (let a = 0; a < r; a++) for (let b = 0; b < r; b++) px.push({ p: H(x + a * 1.1, y + b * 1.1), c: W[a + b ? 4 : 5] });
  }
  d.pixels({ mat: CP, z, group: 'warts', outline: false, line: 'none' }, px);
}

/** The cap toppled off it, lying tipped on the ground in front. */
function fallenCap(d: Draw, z: number) {
  const f = d.frame(v(16, 8), 62);
  const H = (x: number, y: number) => f(y, -x);
  d.poly({ mat: GL, z: z - 0.2, group: 'gills' }, [H(-14, -4), H(0, -5.6), H(14, -4), H(12, 0), H(-12, 0)], { kind: 'bevel', w: 1 });
  d.poly({ mat: CP, z, group: 'cap' }, [H(-15, -2), H(-13, 5), H(-6, 11), H(0, 12), H(7, 10.4), H(13, 5), H(15, -2), H(0, -1.6)], { kind: 'dome', c: H(0, 3), r: 15, bevel: 1.4 });
  warts(d, (x, y) => H(x * 0.8, y * 0.8), z + 0.2);
}

/** A few spores drifting off the cap in a loop. */
function spores(d: Draw, s: Skel, P: Record<string, number>) {
  if (P.drop) return;
  const wave = P.wave ?? 0;
  const c = s.H(0, 6);
  const px: { p: V; c: (typeof GL.ramp)[number] }[] = [];
  for (let k = 0; k < 4; k++) {
    const ph = (wave / (Math.PI * 2) + k / 4) % 1;
    px.push({ p: v(c.x - 14 + k * 9 + Math.sin(k + wave) * 1.4, c.y + 6 + ph * 16), c: GL.ramp[ph < 0.5 ? 4 : 2] });
  }
  d.pixels({ mat: GL, z: 70, group: 'spores', outline: false, line: 'none' }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 90,
  head: 90,
  legN: { ik: v(-6, 3) },
  legF: { ik: v(6, 3) },
  armN: { up: -70, lo: -50 },
  armF: { up: -70, lo: -50 },
  p: { squash: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  const i = Math.round(t * 8);
  return tweak(IDLE, { y: -1 - b, head: 90 + Math.round(Math.sin(a)), p: { wave: a, blink: i === 5 ? 1 : 0, croak: i === 2 ? 0.6 : i === 3 ? 1 : 0 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -7 * Math.cos(ph), y: 3 + (sn > 0 ? 4 * sn : 0) };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return tweak(IDLE, { y: (c2 > 0 ? 0 : -1) - 1, torso: 82, head: 84, legN: { ik: v(n.x, n.y) }, legF: { ik: v(f.x, f.y) }, armN: { up: -30, lo: 10 }, armF: { up: -100, lo: -70 }, p: { wave: a * 2 } });
}

// Spore Slap: it rears back, the cap tipped behind it, and bows hard into the enemy.
const SS_BACK = tweak(IDLE, { x: -3, y: 0, torso: 106, head: 118, legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) }, armN: { up: -120, lo: -80 }, armF: { up: -120, lo: -80 } });
const SS_BUTT = tweak(IDLE, { x: 9, y: -3, torso: 52, head: 26, legN: { ik: v(-10, 3) }, legF: { ik: v(8, 3) }, armN: { up: -100, lo: -70 }, armF: { up: -100, lo: -70 }, p: { grit: 1, squash: 0.3, hop: 6 } });
const SS_HOLD = tweak(SS_BUTT, { x: 7, torso: 60, head: 40, p: { grit: 0, squash: 0, hop: 3, croak: 1 } });

const HURT = tweak(IDLE, { x: -4, y: -2, torso: 104, head: 112, p: { squash: 0.3, grit: 1, hop: 2, blink: 1 } });
const DEATH_SAG = tweak(IDLE, { y: -7, torso: 74, head: 54, legN: { ik: v(-9, 3) }, legF: { ik: v(8, 3) }, p: { squash: 0.3, dead: 1 } });
const DEATH_DOWN = pose({
  x: -4, y: -10, torso: 172, head: 172,
  legN: { up: 12, lo: 6 }, legF: { up: 2, lo: -6 }, footN: 80, footF: 80,
  armN: { up: 120, lo: 150 }, armF: { up: 150, lo: 170 },
  p: { drop: 1, dead: 1 },
});

// Victory: a little hop, the arms up.
const HOP = tweak(IDLE, { y: 5, armN: { up: 50, lo: 80 }, armF: { up: 50, lo: 80 }, p: { squash: 0, hop: 4, croak: 1 } });
const LAND = tweak(IDLE, { y: -3, armN: { up: 30, lo: 60 }, armF: { up: 30, lo: 60 }, p: { squash: 0.5 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'toadcap',
  name: 'Toadcap',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 180, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SS_BACK, 2, 90, ease.out),
        ...keys([
          [SS_BACK, 200],
          [mid(SS_BACK, SS_BUTT, 0.5), 50],
          [SS_BUTT, 80, { hit: true }],
          [SS_HOLD, 200],
        ]),
        ...tween(D, SS_HOLD, IDLE, 2, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 100, head: 106 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_SAG, 0.5), 110],
        [DEATH_SAG, 260],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -10.4 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...keys([
          [LAND, 120],
          [HOP, 140],
          [LAND, 120],
          [HOP, 140],
          [LAND, 160],
        ]),
        ...tween(D, LAND, IDLE, 2, 110, ease.inOut),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

function iconCap(d: Draw, c: V, k: number, z: number) {
  const H = (x: number, y: number) => v(c.x + x * k, c.y + y * k);
  d.poly({ mat: GL, z: z - 0.1, group: 'igills' }, [H(-14, -2), H(0, -5), H(14, -2), H(12, 0), H(-12, 0)], { kind: 'bevel', w: 1 });
  d.poly({ mat: CP, z, group: 'icap' }, [H(-15, -1), H(-13, 6), H(-6, 11), H(1, 12), H(8, 10), H(13, 5), H(15, -1), H(0, -1)], { kind: 'dome', c: H(-1, 3), r: 15 * k, bevel: 1.4 });
}

export const toadcap: ChampionArt = {
  char,
  iconBg: MAT.bark,
  icons: {
    spore_slap: () =>
      compose(MAT.bark, glyph((d) => {
        iconCap(d, v(16, 18), 0.95, 10);
      }), (b) => {
        for (const [x, y] of [[33, 14], [35, 19], [33, 23], [36, 25], [37, 12]]) b.set(x, y, E.white);
      }),
  },
};
