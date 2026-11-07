// The Dowager Countess (docs/DESIGN_DECISIONS.md section 93, Jakub's brief of
// 2026-11-07: an "elegant lady", grey hair, Support, Ember, "bit weak"): an
// Elite Support of the Sanguine Dominion. Tall and slim on the Transfusionist's
// proportions, very upright: a floor-length gown of crimson with a black
// bodice, a high black collar edged red, long black gloves; silver-grey hair
// swept up into a high coil, a ruby hexagon pin in it (the Dominion's mark); a
// closed black fan in her near hand, opened for The Council's Favour, its red
// edge showing. Her affinity (Ember) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { foldTex, robe, RobeCfg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { RGBA } from '../raster.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 37,
  thigh: 16.8,
  shin: 16.8,
  ankleH: 3,
  footLen: 5.4,
  spine: 21.4,
  neck: 7.0,
  upperArm: 12.4,
  foreArm: 11.8,
  shoulderDrop: 3.6,
  shoulderN: -2.4,
  shoulderF: 2.6,
  hipN: -1.2,
  hipF: 1.2,
};

const SK = MAT.skinLight, CR = MAT.crimson, BK = MAT.blackCloth, RD = MAT.red, HR = MAT.hairSilver, LE = MAT.darkleather;
const E = ACCENT;

const ROBE: RobeCfg = { waist: [1.4, 5.0, 5.4], hemDrop: 1.4, hemFloor: 0.6, hemBack: [10, 8], hemFront: [6.6, 5.4], midBack: [6, 4.4], midFront: [4.4, 3], ripple: 0.4, zigzag: 0 };

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  feet(d, s, 8);
  sleeve(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF');
  gown(d, s, wave, 20);
  bodice(d, s, 30);
  head(d, s, P);
  if (!P.drop) fan(d, s.hN, P.fanAng ?? 70, P.open ?? 0, 48);
  else fan(d, v(16, 2.4), 2, 0, 48);
  sleeve(d, s.sN, s.eN, s.hN, s.loN, 50, 0, 'armN');
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

function gown(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: CR, z, group: 'gown', tex: foldTex(8, wave * 0.5, 0.6) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  // a black band along the hem
  d.ribbon({ mat: BK, z: z + 0.1, group: 'gownHem', line: 'none' }, r.hem, r.hem.map(() => 0.9));
}

/** The black bodice, slim at the waist, the high collar edged in red. */
function bodice(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 4.8, 5.0],
    [4, 4.2, 4.6],
    [9, 4.8, 5.6],
    [14, 5.6, 6.4],
    [17.4, 5.4, 5.4],
    [19.6, 3.8, 3.2],
    [21.4, 2.4, 2.0],
  ]);
  d.poly({ mat: BK, z, group: 'bodice', tex: (h) => (Math.sin(h.v * 10) > 0.9 ? 1 : 0) }, body, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(21.4, 0.6), r: 6.2, bevel: 1.2 });
  // a crimson panel down the front of the bodice to a point at the waist
  d.poly({ mat: CR, z: z + 0.2, group: 'panel', line: 'soft' }, [s.T(16.4, 2.6), s.T(16.4, 5.8), s.T(0.6, 4.6), s.T(-1.4, 3.6)], { kind: 'bevel', w: 0.8 });
  // the high collar
  d.poly({ mat: BK, z: z + 0.5, group: 'collar' }, [s.T(19, -3.8), s.T(19, 3.4), s.T(24.8, 3.6), s.T(25.4, -3.4)], { kind: 'bevel', w: 0.9 });
  d.line({ mat: RD, z: z + 0.55, group: 'collar', line: 'none' }, s.T(24.8, 3.6), s.T(25.2, -3.2), RD.ramp[4]);
}

/** A long black glove from above the elbow, the black sleeve's red cuff at the shoulder. */
function sleeve(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: BK, z, group, shade }, sh, el, 2.6, 2.2);
  d.capsule({ mat: RD, z: z + 0.05, group, shade, line: 'soft' }, sh, at(sh, Math.atan2(el.y - sh.y, el.x - sh.x) * 57.29578, 2.2), 2.9, 2.8);
  d.capsule({ mat: BK, z: z + 0.1, group, shade }, el, at(ha, lo, -1.2), 2.1, 1.8);
  d.ellipse({ mat: BK, z: z + 0.3, group, shade }, at(ha, lo, 0.4), 1.7, 1.5, lo);
}

/** A long, composed face; silver-grey hair swept up into a high coil, a ruby hexagon pin in it. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.0, 1.9);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[2], browStyle: 'calm', mouth: P.grit ? 'shout' : 'line', lip: E.lipRose, rx: 5.4, ry: 6.4, profile: 'soft', lash: BK.ramp[1] });
  // the hair swept back from the brow and up over the crown
  d.poly(
    { mat: HR, z: 38.6, group: 'hair', shade: -1, tex: (h) => (Math.sin(h.u * 16 + h.v * 4) > 0.8 ? -1 : 0) },
    [H(5.0, 3.6), H(4.4, 6.4), H(1.4, 8.2), H(-3.0, 8.4), H(-6.2, 6.0), H(-7.0, 1.6), H(-5.8, -2.6), H(-3.8, -1.4), H(-2.6, 2.0), H(0.4, 4.0)],
    { kind: 'dome', c: H(-1, 3.4), r: 8, bevel: 1 },
  );
  // the high coil on the crown, toward the back
  d.ellipse({ mat: HR, z: 38.5, group: 'coil', shade: -1 }, H(-4.0, 9.4), 3.0, 2.6, s.headDir - 90);
  d.ellipse({ mat: HR, z: 38.55, group: 'coil', shade: 1, line: 'none' }, H(-3.6, 10.0), 1.6, 1.0, s.headDir - 90);
  d.line({ mat: HR, z: 38.65, group: 'hair', line: 'none' }, H(2.4, 6.6), H(-3.4, 6.4), HR.ramp[5]);
  // the ruby hexagon pin at the coil's side
  const c = H(-1.6, 8.6), x0 = Math.floor(c.x) + 0.5, y0 = Math.floor(c.y) + 0.5;
  const R = RD.ramp;
  const px: { p: V; c: RGBA }[] = [];
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) px.push({ p: v(x0 + x, y0 + y), c: x === 0 && y === 1 ? R[5] : R[3] });
  d.pixels({ mat: RD, z: 38.8, group: 'pin', line: 'none', outline: false }, px);
}

function feet(d: Draw, s: Skel, z: number) {
  for (const [side, shade] of [['F', -1], ['N', 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF, fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: LE, z: z + (side === 'N' ? 1 : 0), group: 'foot' + side, shade }, [f(-2.0, 1.6), f(-2.4, -1), f(-1.8, -3), f(5, -3), f(5.8, -1.8), f(2.6, 0), f(1, 1.6)], { kind: 'bevel', w: 1.2 });
  }
}

/** The black fan: closed, a slim rod; open (`open` 1), a half-wheel of black leaves with a red edge. */
function fan(d: Draw, hand: V, ang: number, open: number, z: number) {
  const f = d.frame(hand, ang);
  const L = 10;
  if (open < 0.5) {
    d.capsule({ mat: BK, z, group: 'fan' }, f(-1.6, 0), f(L, 0), 1.2, 1.4);
    d.line({ mat: RD, z: z + 0.05, group: 'fan', line: 'none' }, f(1, 0.6), f(L - 0.6, 0.8), RD.ramp[3]);
    return;
  }
  const spread = 140 * open;
  const pts: V[] = [f(0, 0)];
  for (let i = 0; i <= 8; i++) pts.push(at(hand, ang - spread / 2 + (spread * i) / 8, L));
  d.poly({ mat: BK, z, group: 'fanOpen', tex: (h) => (Math.sin(h.u * 20) > 0.6 ? 1 : 0) }, pts, { kind: 'bevel', w: 0.8 });
  d.ribbon({ mat: RD, z: z + 0.1, group: 'fanEdge', line: 'none' }, pts.slice(1), pts.slice(1).map(() => 0.7));
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// At rest: very upright, the closed fan held at her waist, the far hand resting over it.
const IDLE = pose({
  y: -1, torso: 91, head: 94,
  legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) },
  armN: { ik: v(6, 34), bend: -1 }, armF: { ik: v(7, 33), bend: -1 },
  p: { fanAng: 40, open: 0 },
});

function idle(t: number): Pose {
  const b = Math.round((1 - Math.cos(t * Math.PI * 2)) / 2);
  return tweak(IDLE, { y: -1 - b, p: { wave: t } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -9 * Math.cos(ph), y: 3 + (sn > 0 ? 5 * sn : 0), ang: sn > 0 ? -18 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return pose({
    y: bob - 1, torso: 84, head: 90,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armN: { ik: v(8, 36), bend: -1 }, armF: { up: -100, lo: -70 },
    p: { fanAng: 50, open: 0, wave: t },
  });
}

// Fan Rebuke: the fan lifted, then brought down smartly on the enemy.
const FR_LIFT = pose({ x: 0, y: -1, torso: 94, head: 98, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) }, armN: { ik: v(4, 58), bend: 1 }, armF: { ik: v(6, 32), bend: -1 }, p: { fanAng: 110, open: 0 } });
const FR_RAP = pose({ x: 5, y: -2, torso: 84, head: 88, legN: { ik: v(-8, 3) }, legF: { ik: v(9, 3) }, armN: { ik: v(20, 40), bend: -1 }, armF: { ik: v(6, 32), bend: -1 }, p: { fanAng: -30, open: 0, grit: 1, wave: 0.4 } });
const FR_HOLD = tweak(FR_RAP, { p: { grit: 0, fanAng: -20 } });

// The Council's Favour: the fan flicked open before her, a small inclination of the head.
const CF_OPEN = pose({ y: -1, torso: 90, head: 84, legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) }, armN: { ik: v(14, 46), bend: -1 }, armF: { ik: v(7, 33), bend: -1 }, p: { fanAng: 80, open: 1, wave: 0.3 } });
const CF_HOLD = tweak(CF_OPEN, { head: 80, p: { wave: 0.5 } });

const HURT = pose({ x: -3, y: -1, torso: 98, head: 104, legN: { ik: v(-8, 3) }, legF: { ik: v(6, 4) }, armN: { ik: v(2, 44), bend: -1 }, armF: { up: -110, lo: -80 }, p: { fanAng: 60, open: 0, grit: 1 } });

// Death: she sinks to her knees in the gown, then falls to her side.
const DEATH_KNEEL = pose({ x: 0, y: -12, torso: 82, head: 70, legN: { ik: v(-10, 3) }, legF: { ik: v(6, 3) }, footN: -30, armN: { up: -80, lo: -60 }, armF: { up: -90, lo: -70 }, p: { fanAng: 20, open: 0 } });
const DEATH_FALL = pose({ x: 2, y: -6, torso: 30, head: 16, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { drop: 1 } });
const DEATH_DOWN = pose({ x: 6, y: -15, torso: 4, head: -2, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { drop: 1 } });

// Victory: the fan opened under her chin.
const VIC = pose({ y: -1, torso: 91, head: 96, legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) }, armN: { ik: v(8, 50), bend: -1 }, armF: { ik: v(7, 33), bend: -1 }, p: { fanAng: 90, open: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'dowager_countess',
  name: 'Dowager Countess',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 190, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, FR_LIFT, 2, 90, ease.out),
        ...keys([
          [FR_LIFT, 200],
          [FR_RAP, 70, { hit: true }],
          [FR_HOLD, 240],
        ]),
        ...tween(D, FR_HOLD, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CF_OPEN, 2, 110, ease.out),
        ...keys([
          [tweak(CF_OPEN, { p: { open: 0.5 } }), 80, { event: 'cast' }],
          [CF_OPEN, 120, { hit: true }],
          [CF_HOLD, 500],
        ]),
        ...tween(D, CF_HOLD, IDLE, 3, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -2, torso: 95, head: 100 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 260],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -15.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, VIC, 0.5), 110],
        [VIC, 800],
        [mid(VIC, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons
// ---------------------------------------------------------------------------

export const dowagerCountess: ChampionArt = {
  char,
  iconBg: BK,
  icons: {
    fan_rebuke: () =>
      compose(BK, glyph((d) => {
        const f = d.frame(v(8, 30), -40);
        d.capsule({ mat: CR, z: 10, group: 'ifan' }, f(0, 0), f(28, 0), 2.4, 2.8);
      }), (b) => {
        for (const [x, y] of [[32, 10], [34, 12], [30, 8], [35, 9]] as const) b.set(x, y, E.white);
      }),
    councils_favour: () =>
      compose(BK, glyph((d) => {
        const c = v(20, 8), pts: V[] = [c];
        for (let i = 0; i <= 10; i++) pts.push(at(c, 15 + i * 15, 26));
        d.poly({ mat: CR, z: 10, group: 'ifan2' }, pts, { kind: 'bevel', w: 1.2 });
      })),
    noblesse_oblige: () =>
      compose(BK, glyph((d) => {
        d.ellipse({ mat: HR, z: 10, group: 'icoil' }, v(20, 20), 9, 8, 0);
      }), (b) => {
        for (const [x, y] of [[19, 13], [20, 13], [21, 13], [20, 12], [20, 14]] as const) b.set(x, y, RD.ramp[4]);
      }),
  },
};
