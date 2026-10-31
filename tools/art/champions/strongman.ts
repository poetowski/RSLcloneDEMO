// The Strongman (worksheet approved by Jakub, 2026-10-31): a Common Damage of
// the Azure Crown, a naked, broad man who lifts a heavy stone. His look is a
// first take, on the Skirmisher's rig: bare skin over a heavy frame, dark
// breeches and boots, a wide blue belt with an iron buckle (the Crown's blue,
// cut in the leather), short dark hair and no helmet. The stone is a grey
// boulder held in both hands at the chest; Stone Slam raises it overhead and
// brings it down, Gather Strength lifts it to the shoulders and flexes. No
// affinity colour: Tide sets nothing in the art (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, leg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 32,
  thigh: 15,
  shin: 14.5,
  ankleH: 3,
  footLen: 6.2,
  spine: 19.5,
  neck: 6.8,
  upperArm: 12.5,
  foreArm: 11.2,
  shoulderDrop: 4.2,
  shoulderN: -3.4,
  shoulderF: 3.6,
  hipN: -2.2,
  hipF: 2.2,
};

const SK = MAT.skinLight, CH = MAT.charcoal, LE = MAT.leather, BL = MAT.blue, DL = MAT.darkleather, IR = MAT.iron, GD = MAT.gold, HR = MAT.hairDark;

/** The stone: a grey boulder, cool and rough, set in the hands. */
const ROCK = IR;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  // far leg in its breeches and boot
  leg(d, s, 'F', legCfg(10, -1));
  // far arm, bare
  arm(d, s, 'F', armCfg(20, -1));

  // torso: a broad bare chest and back, the belly narrowing to the hips
  const torso = torsoPts(s, [
    [0, 6.4, 6.0],
    [4, 6.9, 7.2],
    [9, 8.0, 8.4],
    [14, 8.2, 8.6],
    [17.4, 7.6, 7.8],
    [19.6, 5.6, 5.2],
    [20.6, 3.6, 3.0],
  ]);
  d.poly({ mat: SK, z: 30, group: 'torso' }, torso, { kind: 'cyl', a: s.T(0, 1), b: s.T(20.4, 1), r: 8, bevel: 1.4 });
  // the chest's two pectoral curves and the line down the middle
  d.line({ mat: SK, z: 30.2, group: 'torso', line: 'none' }, s.T(12.6, 0.8), s.T(12.6, 4.2), SK.ramp[2]);
  d.line({ mat: SK, z: 30.2, group: 'torso', line: 'none' }, s.T(12.4, 4.8), s.T(13.4, 7.4), SK.ramp[2]);
  d.line({ mat: SK, z: 30.2, group: 'torso', line: 'none' }, s.T(9, 4.4), s.T(12, 4.4), SK.ramp[2]);
  // the belly: two faint rows of abdominal muscle
  d.pixels({ mat: SK, z: 30.3, group: 'torso' }, [{ p: s.T(9.4, 2.6), c: SK.ramp[2] }, { p: s.T(7.4, 2.8), c: SK.ramp[2] }, { p: s.T(9.4, 6.2), c: SK.ramp[2] }, { p: s.T(7.4, 6.2), c: SK.ramp[2] }]);

  // the wide blue belt over the waist, its buckle in iron
  d.poly({ mat: BL, z: 32, group: 'belt' }, [s.T(-1.6, -7.0), s.T(-1.6, 7.4), s.T(6.6, 8.2), s.T(6.6, -7.6)], { kind: 'cyl', a: s.T(-1.6, 0), b: s.T(6.6, 0), r: 8.2, bevel: 1 });
  d.line({ mat: BL, z: 32.1, group: 'belt', line: 'none' }, s.T(-0.6, 7.0), s.T(5.8, 7.8), BL.ramp[4]);
  d.line({ mat: BL, z: 32.1, group: 'belt', line: 'none' }, s.T(5.8, -6.8), s.T(5.8, 7.6), BL.ramp[1]);
  d.poly({ mat: IR, z: 32.2, group: 'buckle' }, [s.T(0.2, 4.0), s.T(0.2, 8.0), s.T(4.6, 8.0), s.T(4.6, 4.0)], { kind: 'bevel', w: 1 });
  d.pixels({ mat: GD, z: 32.3, group: 'buckle' }, [{ p: s.T(2.4, 6.0), c: GD.ramp[4] }]);

  // breeches down the hips, dark cloth to the knee
  d.poly({ mat: CH, z: 33, group: 'hips' }, [s.T(-1.6, -7.4), s.T(-1.6, 7.2), s.T(-4.4, 6.6), s.T(-4.4, -6.8)], { kind: 'cyl', a: s.T(-1.6, 0), b: s.T(-4.4, 0), r: 7.6, bevel: 1 });

  head(d, s, P);

  // near leg in its breeches and boot
  leg(d, s, 'N', legCfg(50, 0));

  // the stone: held in both hands at the chest, drawn between the two arms
  stone(d, s);

  // near arm, bare, over the stone
  arm(d, s, 'N', armCfg(60, 0));
}

const legCfg = (z: number, shade: number) => ({
  thigh: CH, shin: CH, foot: LE, rThigh: [4.4, 3.6] as [number, number], rShin: [3.2, 2.7] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: LE, from: 0.46, r: [3.4, 3.0] as [number, number], cuff: DL },
  thighTex: (h: { v: number }) => (Math.sin(h.v * 9) > 0.8 ? -1 : 0),
});

const armCfg = (z: number, shade: number) => ({
  upper: SK, fore: SK, hand: SK, rUp: [3.4, 2.9] as [number, number], rLo: [2.9, 2.5] as [number, number], rHand: 2.3, z, shade,
});

/** The boulder between the hands: a rough round stone with a crack and a lit top. */
function stone(d: Draw, s: Skel) {
  const c = v((s.hN.x + s.hF.x) / 2, (s.hN.y + s.hF.y) / 2 + 1);
  const r = 7;
  d.circle({ mat: ROCK, z: 58, group: 'stone', line: 'soft' }, c, r);
  d.line({ mat: ROCK, z: 58.2, group: 'stone', line: 'none' }, v(c.x - 3, c.y - 1), v(c.x + 1, c.y + 2), ROCK.ramp[0]);
  d.line({ mat: ROCK, z: 58.2, group: 'stone', line: 'none' }, v(c.x + 1, c.y + 2), v(c.x + 3, c.y - 2), ROCK.ramp[0]);
  d.pixels({ mat: ROCK, z: 58.3, group: 'stone' }, [{ p: v(c.x - 3, c.y + 3), c: ROCK.ramp[5] }, { p: v(c.x - 2, c.y + 4), c: ROCK.ramp[5] }]);
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'head' }, s.neck, H(0, -4), 3.2, 3.0);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.grit ? 'angry' : 'flat', mouth: P.shout ? 'shout' : 'line', lip: SK.ramp[1], rx: 6.0, ry: 6.6 });
  // short dark hair, cropped close
  d.poly(
    { mat: HR, z: 39, group: 'hair', line: 'soft' },
    [H(6.2, 2.4), H(5.0, 6.2), H(1.6, 8.4), H(-2.8, 8.4), H(-6.0, 6.0), H(-6.8, 1.8), H(-5.2, 0.4), H(-3.6, 3.4), H(0.8, 4.2), H(4.0, 3.4)],
    { kind: 'dome', c: H(-0.4, 3.5), r: 7.8, bevel: 1 },
  );
  d.pixels({ mat: HR, z: 39.1, group: 'hair' }, [{ p: H(-3.4, 6.6), c: HR.ramp[3] }, { p: H(1.2, 7.4), c: HR.ramp[3] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations (arm angles are absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

// Idle: the stone held at the chest, elbows down, the strongman square and steady.
const IDLE: Pose = pose({
  y: -2,
  torso: 80,
  head: 84,
  legN: { ik: v(-10, 3) },
  legF: { ik: v(9, 3) },
  armN: { up: -58, lo: 40 },
  armF: { up: -62, lo: 36 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -2 - b,
    torso: 80 - b,
    armN: { up: -58 + b * 2, lo: 40 + b * 2 },
    armF: { up: -62 + b * 2, lo: 36 + b * 2 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11.5 * Math.cos(ph), y: 3 + (sn > 0 ? 7 * sn : 0), ang: sn > 0 ? -26 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return pose({
    y: bob - 3,
    torso: 72,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -60, lo: 40 },
    armF: { up: -64, lo: 36 },
  });
}

// Stone Slam: the stone goes up over the head, then comes down in front of him.
const SS_WIND = pose({
  x: -2, y: -2, torso: 96, head: 92,
  legN: { ik: v(-11, 3) }, legF: { ik: v(8, 3) },
  armN: { up: 100, lo: 96 }, armF: { up: 94, lo: 90 },
  p: { grit: 1 },
});
const SS_STRIKE = pose({
  x: 8, y: -5, torso: 60, head: 74,
  legN: { ik: v(-9, 3) }, legF: { ik: v(14, 3) },
  armN: { up: -96, lo: -72 }, armF: { up: -92, lo: -68 },
  p: { grit: 1, shout: 1 },
});
const SS_DROP = pose({
  x: 4, y: -3, torso: 76, head: 80,
  legN: { ik: v(-10, 3) }, legF: { ik: v(12, 3) },
  armN: { up: 40, lo: 30 }, armF: { up: 46, lo: 34 },
  p: { grit: 1 },
});
const SS_FOLLOW = tweak(SS_STRIKE, { x: 9, torso: 56, armN: { up: -104, lo: -86 }, armF: { up: -100, lo: -84 }, p: { shout: 0 } });

// Gather Strength: he crouches, then lifts the stone to his shoulders and flexes.
const GS_CROUCH = pose({
  y: -4, torso: 86, head: 88,
  legN: { ik: v(-11, 3) }, legF: { ik: v(11, 3) },
  armN: { up: -40, lo: 60 }, armF: { up: -44, lo: 56 },
});
const GS_FLEX = pose({
  y: -2, torso: 92, head: 96,
  legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) },
  armN: { up: 102, lo: 98 }, armF: { up: 96, lo: 92 },
  p: { grit: 1, shout: 1 },
});

const HURT = pose({
  x: -4, y: -2, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -40, lo: 70 }, armF: { up: -34, lo: 64 },
  p: { grit: 1 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -10, torso: 76, head: 60,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -30,
  armN: { up: -66, lo: -10 }, armF: { up: -60, lo: -6 },
});
const DEATH_FALL = pose({
  x: 2, y: -8, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
});
const DEATH_DOWN = pose({
  x: 6, y: -22, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'strongman',
  name: 'Strongman',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 150, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SS_WIND, 1, 80, ease.out),
        ...keys([
          [SS_WIND, 160],
          [SS_DROP, 40],
          [SS_STRIKE, 60, { hit: true }],
          [SS_FOLLOW, 180],
        ]),
        ...tween(D, SS_FOLLOW, IDLE, 2, 90, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, GS_CROUCH, 1, 90, ease.inOut),
        ...keys([
          [GS_CROUCH, 120],
          [mid(GS_CROUCH, GS_FLEX, 0.5), 70],
          [GS_FLEX, 260, { hit: true }],
        ]),
        ...tween(D, GS_FLEX, IDLE, 2, 100, ease.inOut),
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
        [tweak(DEATH_DOWN, { y: -22.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SS_WIND, 2, 110, ease.out),
        ...keys([
          [SS_WIND, 220],
          [tweak(SS_WIND, { p: { shout: 1 } }), 140],
          [IDLE, 160],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

const E = ACCENT;

export const strongman: ChampionArt = {
  char,
  iconBg: BL,
  icons: {
    stone_slam: () =>
      compose(BL, glyph((d) => {
        // a boulder falling on a crack in the ground
        d.circle({ mat: ROCK, z: 2, group: 'rock', line: 'soft' }, v(20, 23), 11);
        d.line({ mat: ROCK, z: 2.2, group: 'rock', line: 'none' }, v(16, 26), v(21, 21), ROCK.ramp[0]);
        d.line({ mat: ROCK, z: 2.2, group: 'rock', line: 'none' }, v(21, 21), v(26, 27), ROCK.ramp[0]);
        d.line({ mat: MAT.iron, z: 1, group: 'crack', line: 'none' }, v(6, 7), v(34, 7), MAT.iron.ramp[2]);
        d.line({ mat: MAT.iron, z: 1, group: 'crack', line: 'none' }, v(12, 4), v(28, 4), MAT.iron.ramp[1]);
      }), (b) => {
        for (const [x, y] of [[5, 12], [7, 9], [34, 12], [32, 9]]) b.set(x, y, E.white);
      }),
    gather_strength: () =>
      compose(BL, glyph((d) => {
        // a flexed arm: the upper arm level, the bicep swelling, the forearm and fist raised
        d.capsule({ mat: SK, z: 2, group: 'arm' }, v(3, 9), v(21, 10), 5.2, 5.0);
        d.ellipse({ mat: SK, z: 2.3, group: 'arm' }, v(13, 14), 7.4, 5.4, 0);
        d.capsule({ mat: SK, z: 2.1, group: 'arm' }, v(21, 10), v(25, 27), 5.0, 4.4);
        d.ellipse({ mat: SK, z: 2.5, group: 'arm' }, v(25, 31), 5.4, 5.0, 0);
        d.line({ mat: SK, z: 2.6, group: 'arm', line: 'none' }, v(22, 32), v(28, 32), SK.ramp[1]);
        d.capsule({ mat: BL, z: 2.7, group: 'band' }, v(22, 24), v(27, 23), 1.4, 1.4);
      }), (b) => {
        for (const [x, y] of [[33, 5], [35, 8], [31, 3], [15, 15], [12, 17], [18, 14]]) b.set(x, y, E.white);
      }),
  },
};
