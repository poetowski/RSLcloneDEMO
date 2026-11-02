// The Wraith (docs/DESIGN_DECISIONS.md section 62, 2026-11-01, my proposal on
// Jakub's word): an Elite Damage of the Ashveil Reign, a shade with no body
// left. It floats a hand above the ground: a grave-shroud hangs from its
// shoulders and runs out behind it in a ragged tail that frays into smoke; a deep
// hood with a point bent forward over a mask of bone, two holes in it and the
// Reign's pale light behind them; long arms of bare bone out of torn sleeves,
// iron talons on its fingers (the silhouette features: the tail, the hood's point
// and the talons). Its death is the shroud falling empty, the mask on top of it.
// Its affinity (Ember) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { foldTex, smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 34,
  thigh: 15,
  shin: 15,
  ankleH: 3,
  footLen: 5,
  spine: 20,
  neck: 4.6,
  upperArm: 13,
  foreArm: 13,
  shoulderDrop: 3.4,
  shoulderN: -2.4,
  shoulderF: 2.6,
  hipN: -1.2,
  hipF: 1.2,
};

const SH = MAT.shroud, VO = MAT.blackCloth, BN = MAT.ashBone, IR = MAT.iron;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  hoodBack(d, s, wave, 3);
  limb(d, s, 'F', 12, -1, P.clawF ?? 0);
  tail(d, s, P, wave, 20);
  body(d, s, wave, 30);
  head(d, s, P);
  limb(d, s, 'N', 60, 0, P.clawN ?? 0);

  // the talons' streaks on the frames that strike
  if (info.def.smear && info.prev) {
    const near = P.rake !== 2;
    const prevLo = near ? info.prev.loN : info.prev.loF, lo = near ? s.loN : s.loF;
    const sh = near ? s.sN : s.sF;
    smear(d, sh, prevLo, lo, D.upperArm + D.foreArm + 4, 4, { core: E.pale, edge: BN.ramp[5] }, 70);
  }
}

// ---------------------------------------------------------------------------
// the shroud
// ---------------------------------------------------------------------------

/**
 * The shroud below the waist: no legs under it, only a hanging fold that runs
 * back into a long ragged tail, swaying, its tip fraying into smoke. `wind`
 * streams it out behind; once the Wraith has fallen (`heap`) it lies flat.
 */
function tail(d: Draw, s: Skel, P: Record<string, number>, wave: number, z: number) {
  const heap = P.heap ?? 0;
  const wind = P.wind ?? 0;
  const B = s.T(1.4, -6.4), F = s.T(1.4, 6.2);
  const ground = 1.5;
  const sw = Math.sin(wave) * 2;
  const hemF = v(F.x - 1 - wind * 2, Math.max(ground, F.y - 13 * (1 - heap * 0.5)));
  const tip = v(B.x - 24 - wind * 10 - heap * 4, Math.max(ground, F.y - 24 + sw + wind * 8 - heap * 10));
  const pts: V[] = [B, F, v(F.x + 1.6 - wind * 2, (F.y + hemF.y) / 2), hemF];
  // the ragged hem from the front, sweeping back and down to the tip
  const n = 9;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = hemF.x + (tip.x - hemF.x) * t;
    const y = hemF.y + (tip.y - hemF.y) * Math.pow(t, 0.7) + Math.sin(wave * 1.4 + t * 7) * 1.1;
    pts.push(v(x, Math.max(ground, y + (i % 2 ? -2.4 : 0))));
  }
  pts.push(tip);
  // the back edge, rising from the tip to the shoulders' fall
  pts.push(v((tip.x + B.x) / 2 - 2, Math.max(ground, (tip.y + B.y) / 2 + 2 + sw * 0.5)));
  pts.push(v(B.x - 4, B.y - 4));
  d.poly({ mat: SH, z, group: 'tail', tex: foldTex(7, wave * 0.6, 0.6) }, pts, { kind: 'cyl', a: s.T(1.4, 0), b: v((tip.x + hemF.x) / 2, (tip.y + hemF.y) / 2), r: 8, bevel: 1.2 });
  // the smoke it frays into, behind and under the tip
  const smoke: { p: V; c: (typeof SH.ramp)[number] }[] = [];
  for (let k = 0; k < 9; k++) {
    const ph = ((wave / (Math.PI * 2)) + k / 9) % 1;
    const x = tip.x + 2 - ph * (8 + wind * 6) + Math.sin(k * 2.3) * 2;
    const y = tip.y + Math.sin(k * 1.7) * 2.4 + ph * 4;
    if (y < 1) continue;
    smoke.push({ p: v(x, y), c: SH.ramp[ph < 0.5 ? 4 : 3] });
  }
  d.pixels({ mat: SH, z: z - 0.5, group: 'smoke', outline: false, line: 'none' }, smoke);
}

/** The shroud over the gaunt chest and the shoulders, hanging in folds. */
function body(d: Draw, s: Skel, wave: number, z: number) {
  const torso = torsoPts(s, [
    [0, 6.2, 6.0],
    [5, 5.6, 6.0],
    [10, 5.4, 6.4],
    [14.6, 6.2, 6.8],
    [17.6, 6.6, 6.0],
    [20, 4.6, 3.6],
    [21.4, 2.4, 1.6],
  ]);
  d.poly({ mat: SH, z, group: 'body', tex: foldTex(6, wave * 0.4, 0.66) }, torso, { kind: 'cyl', a: s.T(0, 0.4), b: s.T(21, 0.4), r: 6.8, bevel: 1.3 });
  // a torn edge across the chest where the shroud is wrapped over itself
  d.ribbon({ mat: SH, z: z + 0.2, group: 'wrap', line: 'soft' }, [s.T(16.6, -4), s.T(12.6, 2), s.T(7.4, 6.2)], [0.9, 1, 0.8]);
}

/** The hood's fall behind the head, down the back. */
function hoodBack(d: Draw, s: Skel, wave: number, z: number) {
  const H = s.H, T = s.T;
  const w = Math.sin(wave) * 0.6;
  d.poly({ mat: SH, z, group: 'hoodback', shade: -1 }, [H(-1.6, 8.4), H(-7.4, 6), H(-9.6, -0.6), T(13 + w, -9.6), T(8.6, -8.6), T(12, -3), H(-2.4, -5.4)], { kind: 'dome', c: H(-5, 0), r: 10, bevel: 1 });
}

/**
 * The head: a deep hood, its point bent forward over the brow; in its dark a
 * mask of bone, two holes in it, the pale light behind them; nothing below the
 * mask but the dark.
 */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  const lit = P.dim ? E.ashEyeDim : P.flare ? E.white : E.ashEye;
  // the dark inside the hood
  d.poly({ mat: VO, z: 38, group: 'void' }, [H(6.4, 5.6), H(7.2, -0.6), H(6.0, -7.2), H(1.2, -8.4), H(-1.8, -2), H(-0.6, 4.8)], { kind: 'bevel', w: 0.8 });
  // the mask: an oval of bone, flat to the front, two holes and a crack
  d.poly({ mat: MAT.bone, z: 38.4, group: 'mask' }, [H(3.0, 4.4), H(5.6, 3.6), H(6.6, 0.6), H(6.0, -3.6), H(4.2, -6.0), H(2.2, -5.4), H(1.4, -1.2), H(1.6, 2.8)], { kind: 'bevel', w: 1.2 });
  d.pixels({ mat: BN, z: 38.5, group: 'maskholes', outline: false, line: 'none' }, [
    { p: H(4.4, 1.6), c: VO.ramp[0] }, { p: H(5.4, 1.6), c: VO.ramp[0] }, { p: H(4.4, 0.6), c: VO.ramp[0] }, { p: H(5.4, 0.6), c: lit },
    { p: H(2.4, 1.6), c: VO.ramp[0] }, { p: H(2.4, 0.6), c: lit }, { p: H(3.4, 1.6), c: VO.ramp[0] },
    { p: H(5.6, -1.6), c: VO.ramp[0] }, { p: H(5.2, -2.6), c: VO.ramp[0] },
    { p: H(4.2, -2.6), c: BN.ramp[2] }, { p: H(3.8, -3.6), c: BN.ramp[2] }, { p: H(4.4, -4.6), c: BN.ramp[1] },
  ]);
  // the hood round it, the point bent forward over the brow
  d.poly(
    { mat: SH, z: 39, group: 'hood', tex: foldTex(5, 1.0, 0.7) },
    [H(10.4, 9.6), H(6.6, 11.6), H(0.4, 11.2), H(-6.6, 8.2), H(-9.2, 1.4), H(-8.2, -5.4), H(-4.6, -9.4), H(-0.4, -9.6), H(0.6, -5.4), H(-0.4, 0.4), H(0.4, 5.2), H(3.6, 7.2), H(7.6, 7.0)],
    { kind: 'dome', c: H(-1.6, 2), r: 10.6, bevel: 1.2 },
  );
  d.ribbon({ mat: SH, z: 39.1, group: 'hood', line: 'none' }, [H(9.8, 8.6), H(5.6, 7.2), H(1.2, 5.2), H(0.0, 0.2), H(0.4, -5.4)], [0.6, 0.7, 0.7, 0.7, 0.6]);
}

/**
 * One arm: a torn sleeve over the upper arm, its rag hanging under the forearm;
 * the forearm and the hand bare bone; three long iron talons on the fingers,
 * spread by `claw` (0 hanging together, 1 splayed).
 */
function limb(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number, claw: number) {
  const sh = side === 'N' ? s.sN : s.sF, el = side === 'N' ? s.eN : s.eF, ha = side === 'N' ? s.hN : s.hF, lo = side === 'N' ? s.loN : s.loF;
  const g = 'arm' + side;
  d.capsule({ mat: BN, z, group: g, shade }, el, ha, 1.3, 1.1);
  d.circle({ mat: BN, z: z + 0.1, group: g, shade }, el, 1.6);
  d.capsule({ mat: SH, z: z + 0.2, group: g + 's', shade }, sh, el, 3.6, 3.0);
  // the sleeve's rag hanging from the elbow
  const rag0 = at(el, lo, 1), drop = -96;
  d.ribbon({ mat: SH, z: z + 0.25, group: g + 'r', shade, line: 'soft' }, [at(el, lo + 180, 1.6), at(rag0, drop, 3), at(at(rag0, lo, 3), drop, 7)], [2.6, 2.0, 0.8]);
  // the bony hand and its talons
  d.ellipse({ mat: BN, z: z + 0.3, group: g + 'h', shade }, at(ha, lo, 0.6), 1.7, 1.3, lo);
  for (const k of [-1, 0, 1]) {
    const a = lo + k * (6 + claw * 18);
    const base = at(ha, lo, 1.6);
    const mid = at(base, a, 5);
    const tip = at(mid, a - 22, 4.6);
    d.capsule({ mat: IR, z: z + 0.4 + k * 0.01, group: g + 't' + k, shade, line: 'soft' }, base, mid, 0.7, 0.6);
    d.capsule({ mat: IR, z: z + 0.41 + k * 0.01, group: g + 't' + k, shade, line: 'soft' }, mid, tip, 0.6, 0.3);
  }
}

// ---------------------------------------------------------------------------
// Poses & animations (arm angles are absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

/** It floats a hand above the ground, a little hunched, its talons hanging before it. */
const IDLE: Pose = pose({
  y: 6,
  torso: 80,
  head: 74,
  legN: { ik: v(-3, 12) },
  legF: { ik: v(3, 12) },
  armN: { up: -56, lo: -40 },
  armF: { up: -48, lo: -30 },
  p: { clawN: 0.2, clawF: 0.2 },
});

/** It rises and sinks on the air, the tail swaying. */
function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round(Math.sin(a) * 1.4);
  return tweak(IDLE, { y: 6 + b, armN: { up: -56 - b * 2, lo: -40 - b * 2 }, armF: { up: -48 + b * 2, lo: -30 + b * 2 }, p: { wave: a } });
}

/** It glides, leaning into it, the tail streaming back. */
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round(Math.sin(a * 2));
  return tweak(IDLE, { y: 7 + b, torso: 66, head: 66, armN: { up: -120, lo: -136 }, armF: { up: -110, lo: -126 }, p: { wave: a * 2, wind: 1 } });
}

// Grave Talons: the near talons raised and raked down through the enemy, then the far ones swung up through it.
const GT_RAISE = pose({ x: -2, y: 9, torso: 92, head: 84, legN: { ik: v(-3, 14) }, legF: { ik: v(3, 14) }, armN: { up: 70, lo: 110 }, armF: { up: -40, lo: -10 }, p: { clawN: 1, clawF: 0.4 } });
const GT_RAKE = pose({ x: 8, y: 5, torso: 64, head: 70, legN: { ik: v(4, 10) }, legF: { ik: v(8, 10) }, armN: { up: -40, lo: -78 }, armF: { up: -70, lo: -50 }, p: { clawN: 1, clawF: 0.6, rake: 1 } });
const GT_BACK = pose({ x: 6, y: 6, torso: 72, head: 72, legN: { ik: v(2, 11) }, legF: { ik: v(6, 11) }, armN: { up: -100, lo: -120 }, armF: { up: -120, lo: -140 }, p: { clawN: 0.6, clawF: 1, rake: 2 } });
const GT_UP = pose({ x: 9, y: 8, torso: 78, head: 80, legN: { ik: v(3, 12) }, legF: { ik: v(7, 12) }, armN: { up: -110, lo: -130 }, armF: { up: 20, lo: 56 }, p: { clawN: 0.4, clawF: 1, rake: 2 } });

// Strip the Living: out of the dark behind the enemy, both arms spread high, then both sets of talons driven down into it.
const SL_SPREAD = pose({ x: -2, y: 12, torso: 96, head: 92, legN: { ik: v(-3, 18) }, legF: { ik: v(3, 18) }, armN: { up: 60, lo: 96 }, armF: { up: 100, lo: 130 }, p: { clawN: 1, clawF: 1, flare: 1 } });
const SL_PLUNGE = pose({ x: 9, y: 4, torso: 58, head: 62, legN: { ik: v(5, 9) }, legF: { ik: v(9, 9) }, armN: { up: -30, lo: -66 }, armF: { up: -20, lo: -58 }, p: { clawN: 0.3, clawF: 0.3, rake: 1, flare: 1 } });
const SL_TEAR = tweak(SL_PLUNGE, { x: 6, y: 6, torso: 70, armN: { up: -60, lo: -100 }, armF: { up: -50, lo: -96 }, p: { clawN: 1, clawF: 1, flare: 0 } });

// Hollow Wail: it draws up, then throws its head back and its arms wide and wails.
const HW_DRAW = pose({ y: 4, torso: 70, head: 56, legN: { ik: v(-3, 10) }, legF: { ik: v(3, 10) }, armN: { up: -100, lo: -60 }, armF: { up: -90, lo: -50 }, p: { clawN: 0, clawF: 0 } });
const HW_WAIL = pose({ y: 12, torso: 100, head: 116, legN: { ik: v(-3, 18) }, legF: { ik: v(3, 18) }, armN: { up: 24, lo: 10 }, armF: { up: 150, lo: 170 }, p: { clawN: 1, clawF: 1, flare: 1, wind: 0.4 } });

const HURT = pose({ x: -5, y: 7, torso: 98, head: 104, legN: { ik: v(-6, 13) }, legF: { ik: v(0, 13) }, armN: { up: -80, lo: -20 }, armF: { up: -60, lo: 10 }, p: { clawN: 0.6, clawF: 0.6, wind: 0.3 } });
const DEATH_SAG = pose({ x: 0, y: 2, torso: 74, head: 50, legN: { ik: v(-3, 8) }, legF: { ik: v(3, 8) }, armN: { up: -96, lo: -96 }, armF: { up: -86, lo: -90 }, p: { dim: 1, heap: 0.3 } });
const DEATH_SINK = pose({ x: 2, y: -14, torso: 40, head: 20, legN: { ik: v(-8, 4) }, legF: { ik: v(0, 4) }, armN: { up: -20, lo: -10 }, armF: { up: -30, lo: -20 }, p: { dim: 1, heap: 0.7 } });
const DEATH_DOWN = pose({ x: 4, y: -26, torso: 6, head: 2, legN: { up: 180, lo: 180 }, legF: { up: 180, lo: 180 }, armN: { up: 2, lo: 0 }, armF: { up: -4, lo: 2 }, p: { dim: 1, heap: 1 } });

/** Victory: it rises tall, arms wide, the light in its mask flaring. */
const VICTORY = pose({ y: 13, torso: 94, head: 98, legN: { ik: v(-3, 19) }, legF: { ik: v(3, 19) }, armN: { up: 30, lo: 50 }, armF: { up: 140, lo: 120 }, p: { clawN: 1, clawF: 1, flare: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'wraith',
  name: 'Wraith',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 90, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, GT_RAISE, 0.5), 80],
        [GT_RAISE, 150],
        [mid(GT_RAISE, GT_RAKE, 0.5), 45],
        [GT_RAKE, 90, { hit: true, smear: true }],
        [GT_BACK, 110],
        [mid(GT_BACK, GT_UP, 0.5), 45],
        [GT_UP, 90, { hit: true, smear: true }],
        [tweak(GT_UP, { x: 8, torso: 80 }), 140],
        [mid(GT_UP, IDLE, 0.5), 110],
        [IDLE, 80],
      ]),
    },
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, SL_SPREAD, 0.5), 80],
        [SL_SPREAD, 220],
        [mid(SL_SPREAD, SL_PLUNGE, 0.5), 50],
        [SL_PLUNGE, 120, { hit: true, smear: true }],
        [tweak(SL_PLUNGE, { x: 10, torso: 56 }), 140],
        [SL_TEAR, 180],
        [mid(SL_TEAR, IDLE, 0.5), 110],
        [IDLE, 80],
      ]),
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, HW_DRAW, 3, 100, ease.out),
        ...keys([
          [HW_DRAW, 220],
          [mid(HW_DRAW, HW_WAIL, 0.5), 60],
          [HW_WAIL, 160, { hit: true, event: 'cast' }],
          [tweak(HW_WAIL, { y: 13, head: 118, p: { ...HW_WAIL.p, wave: 2 } }), 200],
          [tweak(HW_WAIL, { y: 12, head: 116, p: { ...HW_WAIL.p, wave: 4 } }), 200],
          [mid(HW_WAIL, IDLE, 0.5), 120],
          [IDLE, 90],
        ]),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -4, torso: 94, head: 98 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [DEATH_SAG, 220],
        [mid(DEATH_SAG, DEATH_SINK, 0.5), 110],
        [DEATH_SINK, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -26.4 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VICTORY, 3, 110, ease.out),
        ...keys([
          [VICTORY, 700],
          [mid(VICTORY, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** A bony hand and its three talons, from `base` along `ang`, spread by `spread` degrees. */
function iconTalons(d: Draw, base: V, ang: number, spread: number, z: number) {
  d.capsule({ mat: BN, z, group: 'iarm' }, at(base, ang + 180, 12), base, 2.2, 2);
  d.ellipse({ mat: BN, z: z + 0.1, group: 'ihand' }, base, 3, 2.4, ang);
  for (const k of [-1, 0, 1]) {
    const a = ang + k * spread;
    const m = at(at(base, ang, 2), a, 8);
    d.capsule({ mat: IR, z: z + 0.2, group: 'it' + k }, at(base, ang, 2), m, 1.2, 1);
    d.capsule({ mat: IR, z: z + 0.21, group: 'it' + k }, m, at(m, a - 30, 7), 1, 0.5);
  }
}

export const wraith: ChampionArt = {
  char,
  iconBg: SH,
  icons: {
    grave_talons: () =>
      compose(SH, glyph((d) => {
        iconTalons(d, v(16, 24), -40, 16, 2);
      }), (b) => {
        // two pale rakes
        for (let k = 0; k < 2; k++) for (let i = 0; i < 16; i++) b.set(18 + i + k * 4, 8 + Math.round(i * 0.9) + k, E.pale);
      }),
    strip_the_living: () =>
      compose(SH, glyph((d) => {
        iconTalons(d, v(14, 26), -60, 22, 2);
      }), (b) => {
        // the blessing torn off: broken gold rays falling away
        const G = MAT.glowGold.ramp;
        for (const [x, y, k] of [[26, 30, 4], [29, 28, 3], [32, 31, 4], [28, 24, 3], [33, 25, 2], [30, 20, 2], [35, 21, 3], [31, 15, 2]] as const) b.set(x, y, G[k]);
      }),
    hollow_wail: () =>
      compose(SH, glyph((d) => {
        // the hood and its mask, thrown back
        d.poly({ mat: VO, z: 2, group: 'iv' }, [v(14, 30), v(24, 32), v(28, 22), v(22, 10), v(13, 14)], { kind: 'bevel', w: 1 });
        d.poly({ mat: BN, z: 3, group: 'im' }, [v(16, 28), v(23, 29), v(25, 21), v(21, 13), v(16, 16)], { kind: 'bevel', w: 1.4 });
        d.poly({ mat: SH, z: 4, group: 'ih' }, [v(8, 36), v(28, 37), v(32, 26), v(26, 30), v(15, 30), v(12, 16), v(18, 6), v(8, 10), v(5, 24)], { kind: 'dome', c: v(14, 24), r: 16, bevel: 1.4 });
      }), (b) => {
        for (const [x, y] of [[19, 24], [22, 24]] as const) b.set(x, 40 - y, E.ashEye);
        for (const r of [6, 10, 14]) for (let a = -0.8; a <= 0.8; a += 0.12) b.set(Math.round(26 + Math.cos(a) * r), Math.round(20 + Math.sin(a) * r), E.ashEyeDim);
      }),
  },
};
