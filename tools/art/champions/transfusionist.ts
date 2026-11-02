// The Transfusionist (docs/DESIGN_DECISIONS.md section 67, 2026-11-02, my design on
// Jakub's word): an Elite Support of the Sanguine Dominion, a field doctor. A tall,
// upright older woman in a long black coat with a high collar and a red apron with
// the Dominion's hexagon; grey hair in a bun, small gold spectacles; a great round
// glass flask of blood in a brass frame on her back, rising past her shoulder (the
// silhouette feature), and a red tube from it to the long brass needle in her near
// hand. The Dominion's blood means life, so nothing here is grim: the flask glows a
// clear warm red. Her affinity (Tide) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { foldTex, robe, RobeCfg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 36,
  thigh: 16.4,
  shin: 16.4,
  ankleH: 3,
  footLen: 5.6,
  spine: 21,
  neck: 6.2,
  upperArm: 12.4,
  foreArm: 11.8,
  shoulderDrop: 3.8,
  shoulderN: -2.6,
  shoulderF: 2.8,
  hipN: -1.4,
  hipF: 1.4,
};

const SK = MAT.skinLight, CO = MAT.blackCloth, RD = MAT.red, CR = MAT.crimson, BR = MAT.bronze, GO = MAT.gold, HR = MAT.hairSilver, LE = MAT.darkleather, GL = MAT.whiteCloth;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  feet(d, s, 8);
  sleeve(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF');
  flask(d, s, P, 16);
  skirt(d, s, wave, 20);
  coat(d, s, 30);
  head(d, s, P);
  apron(d, s, wave, 40);
  // the tube from the flask to the needle
  if (!P.drop) tube(d, s, 44);
  if (P.drop) needle(d, v(18, 2.4), 2, 46);
  else needle(d, s.hN, P.ndAng ?? 90, 46);
  sleeve(d, s.sN, s.eN, s.hN, s.loN, 50, 0, 'armN');
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const ROBE: RobeCfg = { waist: [1.4, 5.4, 5.8], hemDrop: 1.2, hemFloor: 0.6, hemBack: [9, 7], hemFront: [6.6, 5.2], midBack: [5.6, 4], midFront: [4.4, 2.8], ripple: 0.5, zigzag: 0 };

function skirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: CO, z, group: 'coat', tex: foldTex(9, wave * 0.5, 0.6) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
}

function coat(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 5.2, 5.4],
    [4, 4.8, 5],
    [9, 5.2, 6],
    [14, 5.8, 6.4],
    [17.4, 5.6, 5.4],
    [19.6, 4, 3.2],
    [21, 2.4, 2],
  ]);
  d.poly({ mat: CO, z, group: 'body' }, body, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(21, 0.6), r: 6.4, bevel: 1.2 });
  // the high collar
  d.poly({ mat: CO, z: z + 0.5, group: 'collar' }, [s.T(19, -4), s.T(19, 3.6), s.T(24, 3), s.T(24.4, -3.6)], { kind: 'bevel', w: 0.9 });
  d.line({ mat: RD, z: z + 0.55, group: 'collar', line: 'none' }, s.T(24, 3), s.T(24.2, -3.4), RD.ramp[3]);
}

/** The red apron from the chest to the shins down her front, its bib carrying the Dominion's black hexagon. */
function apron(d: Draw, s: Skel, wave: number, z: number) {
  d.poly({ mat: CR, z, group: 'apron', tex: foldTex(7, wave * 0.4, 0.7) }, [s.T(16.4, 0.6), s.T(16.4, 6), s.T(3, 5.6), s.T(-27, 9), s.T(-29, 3.6), s.T(-27, -1.6), s.T(3, -0.8)], { kind: 'bevel', w: 1 });
  d.poly({ mat: LE, z: z + 0.05, group: 'apronTie' }, [s.T(4, -5.4), s.T(4.2, 6), s.T(2.4, 6), s.T(2.2, -5.2)], { kind: 'bevel', w: 0.6 });
  const c = s.T(10.6, 3.2), x0 = Math.floor(c.x) + 0.5, y0 = Math.floor(c.y) + 0.5;
  const K = CO.ramp[1], px: { p: V; c: typeof K }[] = [];
  for (const [x, y] of [[-1, 2], [0, 2], [1, 2], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-1, -2], [0, -2], [1, -2]]) px.push({ p: v(x0 + x, y0 + y), c: K });
  d.pixels({ mat: CO, z: z + 0.1, group: 'apronMark', line: 'none', outline: false }, px);
}

/** Her head: a soft profile, grey hair drawn back into a bun, small gold spectacles. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.2, 2);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[2], browStyle: P.grit ? 'angry' : 'calm', mouth: P.grit ? 'shout' : 'line', lip: SK.ramp[1], rx: 5.6, ry: 6.3, profile: 'soft' });
  d.poly({ mat: HR, z: 38.6, group: 'hair' }, [H(5.2, 3.4), H(5, 5.8), H(2, 7.8), H(-2.6, 8), H(-6, 5.6), H(-7, 1.2), H(-5.6, -3), H(-3.6, -1.6), H(-2.6, 1.8), H(0, 3.8)], { kind: 'dome', c: H(-1, 3.2), r: 8, bevel: 1 });
  d.circle({ mat: HR, z: 38.5, group: 'bun' }, H(-7, 5.4), 3.2);
  d.line({ mat: HR, z: 38.65, group: 'hair', line: 'none' }, H(2.4, 6.4), H(-3.6, 6), HR.ramp[5]);
  // the spectacles: a gold ring round the eye and its arm back to the ear
  const R = GO.ramp[4];
  d.pixels({ mat: GO, z: 38.8, group: 'specs', line: 'none', outline: false }, [
    { p: H(2.4, 1.6), c: R }, { p: H(3.6, 1.8), c: R }, { p: H(4.8, 1.6), c: R }, { p: H(5, 0.2), c: R }, { p: H(2.2, 0.2), c: R }, { p: H(2.4, -1.2), c: R }, { p: H(3.6, -1.4), c: R }, { p: H(4.8, -1.2), c: R },
    { p: H(1.2, 0.8), c: GO.ramp[3] }, { p: H(0, 0.8), c: GO.ramp[3] }, { p: H(-1.2, 0.8), c: GO.ramp[3] },
  ]);
}

function sleeve(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: CO, z, group, shade }, sh, el, 2.8, 2.4);
  d.capsule({ mat: CO, z: z + 0.1, group, shade }, el, at(ha, lo, -1.4), 2.4, 2.5);
  d.capsule({ mat: RD, z: z + 0.15, group, shade, line: 'soft' }, at(ha, lo, -3), at(ha, lo, -1.6), 2.6, 2.6);
  d.ellipse({ mat: SK, z: z + 0.3, group, shade }, at(ha, lo, 0.4), 1.8, 1.5, lo);
}

function feet(d: Draw, s: Skel, z: number) {
  for (const [side, shade] of [['F', -1], ['N', 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF, fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: LE, z: z + (side === 'N' ? 1 : 0), group: 'foot' + side, shade }, [f(-2.2, 1.6), f(-2.6, -1), f(-2, -3), f(5, -3), f(6.2, -1.6), f(3, 0), f(1, 1.6)], { kind: 'bevel', w: 1.3 });
  }
}

/** Where the flask sits: behind her shoulders, or on the ground beside her once she has fallen. */
const flaskAt = (s: Skel, P: Record<string, number>) => (P.drop ? v(-30, 9.6) : s.T(17, -13));

/** The flask: a round glass globe in a bronze frame, a long neck with a stopper, clear warm blood to `level`, a highlight on the glass. */
function flask(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const c = flaskAt(s, P), R = 8.6;
  d.capsule({ mat: GL, z: z - 0.4, group: 'flaskNeck' }, c, v(c.x, c.y + R + 5), 2.8, 2.4);
  d.capsule({ mat: BR, z: z - 0.3, group: 'stopper' }, v(c.x - 2.6, c.y + R + 5.6), v(c.x + 2.6, c.y + R + 5.6), 1.2, 1.2);
  d.circle({ mat: GL, z: z - 0.2, group: 'flaskGlass' }, c, R);
  // the blood: fills the lower part of the globe, its surface level with the ground
  const level = c.y + (P.level ?? 0.4) * R;
  const pts: V[] = [];
  for (let a = -180; a <= 0; a += 20) {
    const p = at(c, a, R - 1);
    pts.push(v(p.x, Math.min(p.y, level)));
  }
  const top = Math.min(1, ((level - c.y) / R));
  const hw = Math.sqrt(Math.max(0, 1 - top * top)) * (R - 1);
  d.poly({ mat: RD, z: z - 0.1, group: 'blood', line: 'none' }, [v(c.x + hw, level), ...pts.slice().reverse(), v(c.x - hw, level)].slice().reverse(), { kind: 'dome', c: v(c.x - 2, c.y), r: R, bevel: 1 });
  d.line({ mat: RD, z: z - 0.05, group: 'blood', line: 'none' }, v(c.x - hw + 1, level), v(c.x + hw - 1, level), RD.ramp[5]);
  d.pixels({ mat: GL, z: z, group: 'flaskShine', line: 'none', outline: false }, [{ p: v(c.x - 4, c.y + 5), c: E.white }, { p: v(c.x - 3, c.y + 6), c: E.white }, { p: v(c.x - 5, c.y + 4), c: GL.ramp[5] }]);
  // the bronze bands of the frame
  d.ribbon({ mat: BR, z: z + 0.1, group: 'frame', line: 'soft' }, [v(c.x - 6, c.y - R + 1), v(c.x, c.y - R - 0.6), v(c.x + 6, c.y - R + 1)], [0.9, 1, 0.9]);
}

/** The red tube, from the bottom of the flask, sagging down and forward to the needle's hub. */
function tube(d: Draw, s: Skel, z: number) {
  const c = flaskAt(s, s.pose.p);
  const a = v(c.x + 3, c.y - 8), b = s.hN;
  const m = v(a.x * 0.45 + b.x * 0.55, Math.min(a.y, b.y) - 5);
  d.ribbon({ mat: RD, z, group: 'tube', line: 'none' }, [a, m, b], [0.7, 0.7, 0.7]);
}

/** The long needle: a brass rod, a bulb at the hub under her hand, a fine steel point at the top. */
function needle(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: BR, z, group: 'rod' }, f(-14, 0), f(16, 0), 1, 0.9);
  d.circle({ mat: BR, z: z + 0.02, group: 'rod' }, f(-15, 0), 1.7);
  d.capsule({ mat: GO, z: z + 0.03, group: 'hub' }, f(6, 0), f(9, 0), 1.7, 1.7);
  d.poly({ mat: MAT.steel, z: z + 0.04, group: 'point' }, [f(16, -1), f(29, 0), f(16, 1)], { kind: 'bevel', w: 0.7 });
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const doc = (hN: V, hF: V, o: Partial<Pose> & { p?: Record<string, number> }, nd = 86) =>
  pose({ armN: { ik: hN, bend: -1 }, armF: { ik: hF, bend: -1 }, ...o, p: { ndAng: nd, level: 0.4, ...(o.p ?? {}) } });

const STAND = { torso: 89, head: 91, legN: { ik: v(-5, 3) }, legF: { ik: v(5, 3) } };
const IDLE = doc(v(13, 37), v(8, 41), { y: -1, ...STAND });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return doc(v(13, 37 - b), v(8, 41 - b), { y: -1 - b, ...STAND, p: { wave: a, level: 0.4 + Math.sin(a) * 0.04 } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -9 * Math.cos(ph), y: 3 + (sn > 0 ? 4 * sn : 0), ang: 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return doc(v(14, 42 + bob), v(10, 46 + bob), { y: bob - 1, torso: 80, head: 86, legN: { ik: v(n.x, n.y) }, legF: { ik: v(f.x, f.y) }, p: { wave: a * 2, level: 0.4 + bob * 0.08 } }, 30);
}

// Draw Blood: the needle levelled, a quick, exact prick, and the flask's level rises.
const DB_AIM = doc(v(-1, 44), v(16, 44), { x: -2, torso: 94, head: 90, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) } }, 4);
const DB_HIT = doc(v(22, 44), v(14, 40), { x: 8, y: -3, torso: 72, head: 80, legN: { ik: v(-11, 3) }, legF: { ik: v(15, 3) }, p: { level: 0.5 } }, 2);
const DB_HOLD = tweak(DB_HIT, { x: 7, p: { level: 0.56 } });

// Open the Flask: the needle lifted, her far hand up, the flask's level falling as it goes to her line.
const OF_LIFT = doc(v(11, 62), v(18, 50), { torso: 92, head: 98, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) }, p: { level: 0.55 } }, 88);
const OF_GIVE = tweak(OF_LIFT, { y: 1, p: { level: 0.25 } });
const OF_LOW = tweak(OF_LIFT, { p: { level: 0 } });

const HURT = doc(v(9, 37), v(4, 40), { x: -4, y: -1, torso: 99, head: 106, legN: { ik: v(-9, 3) }, legF: { ik: v(6, 4) }, footF: 10, p: { grit: 1 } }, 100);
const DEATH_KNEEL = doc(v(8, 24), v(12, 20), { y: -10, torso: 76, head: 60, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, footN: -14 }, 40);
const DEATH_FALL = pose({
  x: 2, y: -7, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { level: 0.2 },
});
const DEATH_DOWN = pose({
  x: 6, y: -21, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { drop: 1, level: 0.1 },
});
const RAISE = doc(v(12, 66), v(9, 42), { y: -1, torso: 90, head: 96, legN: { ik: v(-5, 3) }, legF: { ik: v(5, 3) }, p: { level: 0.6 } }, 90);

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'transfusionist',
  name: 'Transfusionist',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 190, idle) },
    run: { loop: true, frames: cycle(8, 82, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, DB_AIM, 2, 90, ease.out),
        ...keys([
          [DB_AIM, 220],
          [DB_HIT, 80, { hit: true }],
          [DB_HOLD, 260],
        ]),
        ...tween(D, DB_HOLD, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, OF_LIFT, 2, 110, ease.out),
        ...keys([
          [OF_LIFT, 280],
          [OF_GIVE, 100, { hit: true }],
          [OF_GIVE, 240],
          [OF_LOW, 340],
        ]),
        ...tween(D, OF_LOW, IDLE, 3, 130, ease.inOut),
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
        [tweak(DEATH_DOWN, { y: -21.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, RAISE, 0.5), 100],
        [RAISE, 700],
        [mid(RAISE, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons (glyph space: y up)
// ---------------------------------------------------------------------------

function iconFlask(d: Draw, c: V, R: number, level: number) {
  d.capsule({ mat: GL, z: 1, group: 'neck' }, c, v(c.x, c.y + R + 7), 3.4, 3);
  d.capsule({ mat: BR, z: 1.2, group: 'stopper' }, v(c.x - 3.6, c.y + R + 7), v(c.x + 3.6, c.y + R + 7), 1.6, 1.6);
  d.circle({ mat: GL, z: 2, group: 'glass' }, c, R);
  d.poly({ mat: RD, z: 3, group: 'blood', line: 'none' }, [v(c.x - R + 1.6, c.y + level), v(c.x + R - 1.6, c.y + level), v(c.x + R - 3, c.y - R + 4), v(c.x, c.y - R + 1.4), v(c.x - R + 3, c.y - R + 4)], { kind: 'bevel', w: 1.4 });
}

export const transfusionist: ChampionArt = {
  char,
  iconBg: CO,
  icons: {
    draw_blood: () =>
      compose(CO, glyph((d) => {
        d.capsule({ mat: BR, z: 3, group: 'rod' }, v(4, 8), v(25, 25), 1.4, 1.2);
        d.capsule({ mat: GO, z: 3.1, group: 'hub' }, v(13, 15), v(17, 18), 2.4, 2.4);
        d.poly({ mat: MAT.steel, z: 3.2, group: 'point' }, [v(24, 26.4), v(36, 36), v(26, 24)], { kind: 'bevel', w: 0.8 });
      }), (b) => {
        for (const [x, y, c] of [[30, 12, RD.ramp[4]], [31, 13, RD.ramp[3]], [34, 18, RD.ramp[4]], [24, 8, RD.ramp[4]]] as const) b.set(x, y, c);
      }),
    open_the_flask: () => compose(CR, glyph((d) => iconFlask(d, v(20, 15), 12, 2))),
    bedside_rounds: () =>
      compose(CO, glyph((d) => {
        d.poly({ mat: RD, z: 3, group: 'drop' }, [v(20, 35), v(28, 20), v(28, 13), v(23, 7), v(17, 7), v(12, 13), v(12, 20)], { kind: 'bevel', w: 2 });
      }), (b) => {
        for (const [x, y] of [[16, 25], [15, 26], [15, 27], [16, 28]] as const) b.set(x, y, E.white);
      }),
  },
};
