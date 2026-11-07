// The Veil Adept (docs/DESIGN_DECISIONS.md section 98, Jakub's brief of
// 2026-11-07: an Elite Damage of the Ashveil Reign, "a dark adept"): a slender
// woman on the Dowager Countess's proportions. A floor-length black robe, a tall
// standing collar flaring up behind her head (the silhouette feature, with the
// veil); wide black sleeves to the elbow, her forearms bare and pale with
// bangles of bone; a veil of grey ash-cloth (`ashVeil`) over her head and her
// whole face, its tails down her back, the violet light of her eyes showing
// through it; the Reign's white bone pinned at her throat. A small black flame
// with a violet rim burns on her near palm. Her shadow lies on the floor
// behind her, darker than anyone's, two violet points where its eyes would be,
// a beat behind her as she breathes; for Shadow Feast it leaves the floor (it
// is the shadow that rises under the enemy) and comes back after. Her affinity
// sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { foldTex, robe, RobeCfg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { RGBA } from '../raster.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 36,
  thigh: 16.6,
  shin: 16.4,
  ankleH: 3,
  footLen: 5.4,
  spine: 21,
  neck: 6.6,
  upperArm: 12.6,
  foreArm: 12,
  shoulderDrop: 3.6,
  shoulderN: -2.4,
  shoulderF: 2.6,
  hipN: -1.2,
  hipF: 1.2,
};

const SK = MAT.skinPale, BK = MAT.blackCloth, CH = MAT.charcoal, VE = MAT.ashVeil, BO = MAT.ashBone, GV = MAT.glowViolet, LE = MAT.darkleather;
const E = ACCENT;

const ROBE: RobeCfg = { waist: [1.4, 4.8, 5.2], hemDrop: 1.4, hemFloor: 0.6, hemBack: [9, 7.4], hemFront: [6.0, 5.0], midBack: [5.6, 4.2], midFront: [4.2, 3], ripple: 0.5, zigzag: 0.6 };

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  if (!P.shadowGone && !P.drop) floorShadow(d, s, P.lag ?? 0, P.eyes ?? 0.5, 1);
  veilTail(d, s, wave, 4);
  collarBack(d, s, 6);
  feet(d, s, 8);
  arm(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF');
  gown(d, s, wave, 20);
  bodice(d, s, 30);
  head(d, s, P, 38);
  arm(d, s.sN, s.eN, s.hN, s.loN, 50, 0, 'armN');
  if ((P.fire ?? 0) > 0) palmFlame(d, s.hN, s.loN, P.fire, P.flick ?? 0, 54);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

/**
 * Her shadow, lying on the floor behind her from her feet: a flat black
 * figure, its head toward the back, two violet points for eyes (`eyes` 0..1,
 * how bright). `lag` moves its upper half a pixel or two after her.
 */
function floorShadow(d: Draw, s: Skel, lag: number, eyes: number, z: number) {
  const x = s.pelvis.x;
  const L = (dx: number, y: number, k = 1) => v(x + dx + lag * k, y);
  const pts = [L(4, 0.4, 0), L(3, 2.0, 0), L(-6, 2.8, 0.3), L(-13, 3.2, 0.7), L(-16, 4.2), L(-20, 4.2), L(-21.4, 5.4), L(-25, 5.4), L(-26.8, 3.2), L(-25.4, 0.6), L(-20, 0.4), L(-12, 0.4, 0.6), L(-4, 0.4, 0.2)];
  d.poly({ mat: BK, z, group: 'shadow', flat: 0, outline: false, line: 'none' }, pts, { kind: 'bevel', w: 0.5 });
  if (eyes > 0) d.pixels({ mat: GV, z: z + 0.1, group: 'shadowEyes', outline: false, line: 'none' }, [{ p: L(-24.6, 3.6), c: GV.ramp[eyes > 0.7 ? 5 : 4] }, { p: L(-23.2, 3.6), c: GV.ramp[eyes > 0.7 ? 4 : 3] }]);
}

function gown(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: BK, z, group: 'gown', tex: foldTex(9, wave * 0.5, 0.7) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  d.ribbon({ mat: VE, z: z + 0.1, group: 'gownHem', line: 'none' }, r.hem, r.hem.map(() => 0.9));
}

/** The black bodice, a narrow belt, the Reign's white bone pinned at the throat. */
function bodice(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 4.6, 4.8],
    [4, 4.0, 4.4],
    [9, 4.6, 5.2],
    [14, 5.4, 6.0],
    [17.4, 5.2, 5.2],
    [19.6, 3.8, 3.2],
    [21, 2.4, 2.0],
  ]);
  d.poly({ mat: BK, z, group: 'bodice', tex: (h) => (Math.sin(h.v * 10) > 0.9 ? 1 : 0) }, body, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(21, 0.6), r: 6, bevel: 1.2 });
  d.poly({ mat: LE, z: z + 0.2, group: 'belt' }, [s.T(1.4, -4.8), s.T(3.0, -4.6), s.T(3.0, 5.0), s.T(1.4, 5.2)], { kind: 'cyl', a: s.T(2, -5), b: s.T(2, 5.2), r: 5 });
  // the front of the high collar, closed at the throat
  d.poly({ mat: BK, z: z + 0.5, group: 'collarFront' }, [s.T(18.6, 1.0), s.T(18.6, 4.0), s.T(24.6, 4.6), s.T(25.4, 1.6)], { kind: 'bevel', w: 0.8 });
  const c = s.T(19.6, 4.6);
  d.capsule({ mat: BO, z: z + 0.7, group: 'pin' }, v(c.x - 1.8, c.y), v(c.x + 1.8, c.y), 0.6, 0.6);
  d.pixels({ mat: BO, z: z + 0.75, group: 'pin', line: 'none' }, [{ p: v(c.x - 2.4, c.y + 0.6), c: BO.ramp[5] }, { p: v(c.x + 2.4, c.y + 0.6), c: BO.ramp[4] }]);
}

/** The tall standing collar: it rises from her shoulders behind her head and flares out to two points. */
function collarBack(d: Draw, s: Skel, z: number) {
  const H = s.H;
  const a = s.T(18.4, -4.4), b = s.T(19.6, 2.2);
  d.poly({ mat: BK, z, group: 'collarBack', tex: (h) => (Math.sin(h.u * 12) > 0.8 ? 1 : 0) }, [a, H(-10.4, 5.0), H(-11.4, 15.8), H(-6.2, 10.4), H(-1.4, 16.2), H(0.4, 5.0), b], { kind: 'bevel', w: 1.4 });
  // its charcoal lining, seen inside the flare
  d.poly({ mat: CH, z: z + 0.1, group: 'collarLining', line: 'soft' }, [H(-8.6, 6.4), H(-9.8, 13.0), H(-6.2, 8.8), H(-2.4, 13.0), H(-1.6, 6.4)], { kind: 'bevel', w: 0.8 });
}

/** The tails of the veil, hanging down her back from under the collar, swaying a little. */
function veilTail(d: Draw, s: Skel, wave: number, z: number) {
  const r0 = s.H(-5.4, -1.0);
  const sw = Math.sin(wave * Math.PI * 2) * 0.8;
  const p1 = v(r0.x - 2.4, r0.y - 6), p2 = v(r0.x - 3.6 + sw, r0.y - 13), p3 = v(r0.x - 4.6 + sw * 1.6, r0.y - 19);
  d.ribbon({ mat: VE, z, group: 'veilTail', shade: -1, tex: (h) => (Math.sin(h.v * 10) > 0.7 ? -1 : 0) }, [r0, p1, p2, p3], [2.4, 2.2, 1.8, 1.0]);
}

/** A wide black sleeve to the elbow, its mouth hanging open; the forearm bare and pale, two bangles of bone round it. */
function arm(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: SK, z, group, shade }, el, at(ha, lo, -1.0), 1.8, 1.5);
  d.ellipse({ mat: SK, z: z + 0.2, group, shade }, at(ha, lo, 0.6), 1.6, 1.3, lo);
  const px: { p: V; c: RGBA }[] = [];
  const len = Math.hypot(ha.x - el.x, ha.y - el.y);
  for (const t of [0.66, 0.8]) {
    const m = at(el, lo, len * t);
    for (const k of [-1.4, -0.5, 0.4, 1.3]) px.push({ p: at(m, lo + 90, k), c: BO.ramp[shade < 0 ? 3 : 4] });
  }
  d.pixels({ mat: SK, z: z + 0.25, group, line: 'none', outline: false }, px);
  // the sleeve: down the upper arm, its wide mouth hanging below the elbow
  const up = Math.atan2(el.y - sh.y, el.x - sh.x) * 57.29578;
  d.capsule({ mat: BK, z: z + 0.4, group: group + 'Sleeve', shade }, sh, el, 2.8, 3.2);
  const m0 = at(el, up + 90, 3.4), m1 = at(el, up - 90, 3.4);
  d.poly({ mat: BK, z: z + 0.45, group: group + 'Sleeve', shade, tex: (h) => (Math.sin(h.u * 9) > 0.7 ? -1 : 0) }, [m0, m1, v(m1.x + 0.6, m1.y - 7.4), v((m0.x + m1.x) / 2, Math.min(m0.y, m1.y) - 8.6), v(m0.x - 0.4, m0.y - 6.2)], { kind: 'bevel', w: 1 });
}

/** The black flame on her palm: a dark tongue rimmed in violet, flickering on whole frames (`flick` 0..1). */
function palmFlame(d: Draw, hand: V, lo: number, size: number, flick: number, z: number) {
  const base = at(hand, lo + 90, 2.0);
  const h = 3 + size * 4, sway = flick > 0.5 ? 1 : 0;
  const px: { p: V; c: RGBA }[] = [];
  for (let y = 0; y <= h; y++) {
    const w = Math.max(0, Math.round((1 - y / h) * (1.6 + size) - (y < 2 ? 0.6 : 0)));
    const xo = y > h / 2 ? sway : 0;
    for (let x = -w; x <= w; x++) {
      const edge = Math.abs(x) === w || y >= h - 1;
      px.push({ p: v(base.x + x + xo, base.y + y), c: edge ? GV.ramp[y > h * 0.6 ? 4 : 3] : BK.ramp[y < 2 ? 2 : 0] });
    }
  }
  d.pixels({ mat: GV, z, group: 'flame', outline: false, line: 'none' }, px);
}

/** The face beneath, the veil over all of it: the crown, the sides and a panel hanging over the face; the violet light of her eyes shows through. */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  d.capsule({ mat: SK, z: z - 0.5, group: 'neck' }, s.neck, H(0, -4), 2.0, 1.9);
  face(d, s, { skin: SK, z, browStyle: 'none', mouth: 'none', rx: 5.4, ry: 6.4, profile: 'soft' });
  d.poly(
    { mat: VE, z: z + 0.6, group: 'veil' },
    [H(6.2, 3.0), H(4.6, 6.4), H(1.2, 8.0), H(-3.6, 7.4), H(-6.8, 3.4), H(-7.2, -2.2), H(-5.4, -6.4), H(-1.0, -7.4), H(2.4, -8.6), H(4.2, -10.4), H(6.2, -8.6), H(7.8, -4.4), H(7.8, 0.4)],
    { kind: 'dome', c: H(0, 0.6), r: 8.6, bevel: 1 },
  );
  // the face's shadow behind the thin cloth, folds hanging straight down it
  d.poly({ mat: VE, z: z + 0.62, group: 'veil', shade: -2, line: 'none' }, [H(2.4, 2.6), H(6.0, 2.2), H(6.4, -2.0), H(5.6, -6.4), H(3.4, -7.0), H(1.8, -3.0)], { kind: 'bevel', w: 1.2 });
  const px: { p: V; c: RGBA }[] = [];
  for (const [x0, y0, n] of [[-3.0, 5.6, 9], [-5.4, 2.4, 6], [0.4, 6.6, 5]] as const) {
    const top = H(x0, y0);
    for (let k = 0; k < n; k++) px.push({ p: v(top.x, top.y - k), c: VE.ramp[2] });
  }
  px.push({ p: H(4.2, -10.0), c: VE.ramp[4] }, { p: H(5.6, -8.6), c: VE.ramp[4] });
  d.pixels({ mat: VE, z: z + 0.65, group: 'veil', line: 'none' }, px);
  if (!P.dead) {
    const k = P.eyes ?? 0.5;
    d.pixels({ mat: GV, z: z + 0.7, group: 'eyes', outline: false, line: 'none' }, [
      { p: H(4.4, 0.8), c: GV.ramp[k > 0.7 ? 5 : 4] },
      { p: H(5.4, 0.8), c: GV.ramp[k > 0.7 ? 4 : 3] },
      { p: H(4.4, -0.2), c: GV.ramp[2] },
    ]);
  }
}

function feet(d: Draw, s: Skel, z: number) {
  for (const [side, shade] of [['F', -1], ['N', 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF, fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: LE, z: z + (side === 'N' ? 1 : 0), group: 'foot' + side, shade }, [f(-2.0, 1.6), f(-2.4, -1), f(-1.8, -3), f(5, -3), f(5.8, -1.8), f(2.6, 0), f(1, 1.6)], { kind: 'bevel', w: 1.2 });
  }
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// At rest: upright and still, the black flame on her near palm before her, the far hand at her side.
const IDLE = pose({
  y: -1, torso: 91, head: 92,
  legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) },
  armN: { ik: v(11, 36), bend: -1 }, armF: { ik: v(3, 28), bend: -1 },
  p: { fire: 0.5 },
});

function idle(t: number, i: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  // the shadow follows her breath a quarter of a cycle late
  const lag = Math.round((1 - Math.cos(a - Math.PI / 2)) / 2) - b;
  return tweak(IDLE, { y: -1 - b, armN: { ik: v(11, 36 - b), bend: -1 }, p: { wave: t, flick: i % 3 === 0 ? 1 : 0, lag, eyes: 0.5 } });
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
    armN: { ik: v(10, 34), bend: -1 }, armF: { up: -110, lo: -80 },
    p: { fire: 0.3, wave: t, lag: -1 },
  });
}

// Veilfire: the flame drawn back to her shoulder and fed until it is big, then the palm thrust out and the bolt cast.
const VF_DRAW = pose({ x: -2, y: -1, torso: 96, head: 94, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) }, armN: { ik: v(2, 44), bend: -1 }, armF: { ik: v(8, 34), bend: -1 }, p: { fire: 1, wave: 0.2, eyes: 1 } });
const VF_FEED = tweak(VF_DRAW, { p: { fire: 1, flick: 1, wave: 0.3, eyes: 1 } });
const VF_CAST = pose({ x: 4, y: -2, torso: 84, head: 86, legN: { ik: v(-8, 3) }, legF: { ik: v(9, 3) }, armN: { ik: v(26, 44), bend: -1 }, armF: { ik: v(-2, 30), bend: -1 }, p: { fire: 0, wave: 0.6, eyes: 1, lag: 1 } });
const VF_HOLD = tweak(VF_CAST, { x: 3, p: { fire: 0, wave: 0.7, eyes: 0.5, lag: 0 } });

// Shadow Feast: she lowers both hands, palms to the floor; her shadow leaves it; her fingers close twice as it bites.
const SF_LOWER = pose({ y: -1, torso: 88, head: 76, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) }, armN: { ik: v(14, 24), bend: -1 }, armF: { ik: v(-4, 24), bend: -1 }, p: { fire: 0, wave: 0.3, eyes: 1, lag: -2 } });
const SF_GONE = tweak(SF_LOWER, { y: -2, head: 72, p: { fire: 0, wave: 0.4, eyes: 1, shadowGone: 1 } });
const SF_CLOSE = tweak(SF_GONE, { armN: { ik: v(16, 22), bend: -1 }, armF: { ik: v(-2, 22), bend: -1 }, p: { fire: 0, wave: 0.5, eyes: 1, shadowGone: 1 } });
const SF_OPEN = tweak(SF_GONE, { armN: { ik: v(15, 26), bend: -1 }, armF: { ik: v(-5, 26), bend: -1 }, p: { fire: 0, wave: 0.6, eyes: 1, shadowGone: 1 } });

const HURT = pose({ x: -3, y: -1, torso: 98, head: 104, legN: { ik: v(-8, 3) }, legF: { ik: v(6, 4) }, armN: { ik: v(4, 42), bend: -1 }, armF: { up: -110, lo: -80 }, p: { fire: 0, lag: 2 } });

// Death: she sinks to her knees and falls to her side; her shadow is gone with her.
const DEATH_KNEEL = pose({ x: 0, y: -12, torso: 82, head: 70, legN: { ik: v(-10, 3) }, legF: { ik: v(6, 3) }, footN: -30, armN: { up: -80, lo: -60 }, armF: { up: -90, lo: -70 }, p: { fire: 0, lag: 3 } });
const DEATH_FALL = pose({ x: 2, y: -6, torso: 30, head: 16, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { drop: 1 } });
const DEATH_DOWN = pose({ x: 6, y: -15, torso: 4, head: -2, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { drop: 1, dead: 1 } });

// Victory: the flame lifted high on her palm, her shadow's eyes bright on the floor.
const VIC = pose({ y: -1, torso: 92, head: 98, legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) }, armN: { ik: v(8, 58), bend: -1 }, armF: { ik: v(3, 28), bend: -1 }, p: { fire: 1, eyes: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'veil_adept',
  name: 'Veil Adept',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 200, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VF_DRAW, 2, 90, ease.out),
        ...keys([
          [VF_DRAW, 130],
          [VF_FEED, 130],
          [VF_CAST, 80, { hit: true, event: 'shoot' }],
          [VF_HOLD, 260],
        ]),
        ...tween(D, VF_HOLD, IDLE, 3, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SF_LOWER, 2, 110, ease.out),
        ...keys([
          [SF_LOWER, 160],
          [SF_GONE, 220, { event: 'cast' }],
          [SF_OPEN, 140],
          [SF_CLOSE, 140, { hit: true }],
          [SF_OPEN, 160],
          [SF_CLOSE, 140, { hit: true }],
          [SF_GONE, 260],
          [SF_LOWER, 140],
        ]),
        ...tween(D, SF_LOWER, IDLE, 3, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -2, torso: 95, head: 100, p: { fire: 0, lag: 1 } }), 110],
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
        [VIC, 300],
        [tweak(VIC, { p: { fire: 1, flick: 1, eyes: 1 } }), 300],
        [VIC, 300],
        [mid(VIC, IDLE, 0.5), 110],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons
// ---------------------------------------------------------------------------

export const veilAdept: ChampionArt = {
  char,
  iconBg: VE,
  icons: {
    // glyph space has y up: the flame's tip at the top, the jaws' teeth drawn inside the glyph so they sit over the shadow
    veilfire: () =>
      compose(VE, glyph((d) => {
        const flame = [v(20, 36), v(23, 28), v(28, 22), v(30, 14), v(27, 7), v(20, 4), v(13, 7), v(10, 14), v(12, 22), v(17, 26)];
        d.poly({ mat: BK, z: 10, group: 'ifl' }, flame, { kind: 'dome', c: v(20, 14), r: 12 });
        const rim: { p: V; c: RGBA }[] = flame.map((p, k) => ({ p: v(p.x + (p.x < 20 ? 0.6 : -0.6), p.y + (p.y < 20 ? 0.8 : -0.8)), c: GV.ramp[k % 2 ? 3 : 4] }));
        rim.push({ p: v(20, 34), c: GV.ramp[5] }, { p: v(17, 13), c: GV.ramp[4] }, { p: v(23, 13), c: GV.ramp[4] });
        d.pixels({ mat: GV, z: 10.2, group: 'iflr', outline: false, line: 'none' }, rim);
      })),
    shadow_feast: () =>
      compose(VE, glyph((d) => {
        d.poly({ mat: BK, z: 10, group: 'ish' }, [v(6, 2), v(8, 20), v(13, 30), v(20, 36), v(27, 30), v(32, 20), v(34, 2), v(26, 8), v(14, 8)], { kind: 'bevel', w: 1.5 });
        const px: { p: V; c: RGBA }[] = [];
        for (const [x, y] of [[14.5, 22.5], [15.5, 22.5], [24.5, 22.5], [25.5, 22.5]] as const) px.push({ p: v(x, y), c: GV.ramp[5] });
        for (const x of [12.5, 15.5, 18.5, 21.5, 24.5, 27.5]) px.push({ p: v(x, 14.5), c: E.white }, { p: v(x, 13.5), c: E.white }, { p: v(x + 1.5, 9.5), c: BO.ramp[4] });
        d.pixels({ mat: GV, z: 10.2, group: 'ishx', outline: false, line: 'none' }, px);
      })),
  },
};
