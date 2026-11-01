// The Toadcap (docs/DESIGN_DECISIONS.md section 50, 2026-11-01, my proposal on
// Jakub's word): a Common Damage of the Court of Root, a walking mushroom. A pale
// fat stalk with stubby arms and root feet, a huge russet cap with pale warts and
// gills beneath (the silhouette), two small dark eyes in the stalk under the cap,
// spores drifting off it. It butts with the cap; when
// it dies the cap topples off. Its affinity (Ember) sets nothing here (Jakub,
// 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
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

const ST = MAT.linen, CP = MAT.terracotta, GL = MAT.bone, RT = MAT.bark;
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
  if (P.drop) fallenCap(d, 56);
  else cap(d, s, P, 50);
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

function face(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const open = P.dead ? 0 : 1;
  const px: { p: V; c: typeof INK.eye }[] = [];
  if (open) {
    px.push({ p: s.T(18.6, 3.0), c: INK.eye }, { p: s.T(19.6, 3.0), c: INK.eye }, { p: s.T(18.6, 6.0), c: INK.eye }, { p: s.T(19.6, 6.0), c: INK.eye });
    if (P.grit) px.push({ p: s.T(16, 3.6), c: INK.eye }, { p: s.T(16, 4.6), c: INK.eye }, { p: s.T(16, 5.6), c: INK.eye });
  } else px.push({ p: s.T(19, 3.0), c: ST.ramp[1] }, { p: s.T(19, 4.0), c: ST.ramp[1] }, { p: s.T(19, 6.0), c: ST.ramp[1] });
  d.pixels({ mat: ST, z, group: 'eyes', outline: false, line: 'none' }, px);
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
  for (const [x, y, r] of [[-10, 3, 2], [-3, 8, 2], [4, 3, 3], [10, 5, 1], [-6, 0, 1], [13, 0, 1], [-13, 0, 1], [1, 11, 1]] as const) {
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
  return tweak(IDLE, { y: -1 - b, head: 90 + Math.round(Math.sin(a)), p: { wave: a } });
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
const SS_BUTT = tweak(IDLE, { x: 9, y: -3, torso: 52, head: 26, legN: { ik: v(-10, 3) }, legF: { ik: v(8, 3) }, armN: { up: -100, lo: -70 }, armF: { up: -100, lo: -70 }, p: { grit: 1, squash: 0.3 } });
const SS_HOLD = tweak(SS_BUTT, { x: 7, torso: 60, head: 40, p: { grit: 0, squash: 0 } });

const HURT = tweak(IDLE, { x: -4, y: -2, torso: 104, head: 112, p: { squash: 0.3, grit: 1 } });
const DEATH_SAG = tweak(IDLE, { y: -7, torso: 74, head: 54, legN: { ik: v(-9, 3) }, legF: { ik: v(8, 3) }, p: { squash: 0.3, dead: 1 } });
const DEATH_DOWN = pose({
  x: -4, y: -10, torso: 172, head: 172,
  legN: { up: 12, lo: 6 }, legF: { up: 2, lo: -6 }, footN: 80, footF: 80,
  armN: { up: 120, lo: 150 }, armF: { up: 150, lo: 170 },
  p: { drop: 1, dead: 1 },
});

// Victory: a little hop, the arms up.
const HOP = tweak(IDLE, { y: 5, armN: { up: 50, lo: 80 }, armF: { up: 50, lo: 80 }, p: { squash: 0 } });
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
