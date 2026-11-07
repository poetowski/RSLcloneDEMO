// The Strung Thrall (docs/DESIGN_DECISIONS.md section 99, Jakub's brief of
// 2026-11-07: an Elite Support of the Ashveil Reign, "some kind of controlled
// zombie"): a lanky stitched corpse worked like a marionette. Over it floats
// the control: the Reign's white bone laid across (its standard) with a short
// crossbar, and threads of violet light run from it to the wrists, the crown
// of the head and the knees (the silhouette feature); the body hangs from them
// as much as it stands, the head lolling, the hands limp from the wrists. A
// cold blue-grey skin (`thrallSkin`) with crude black stitches round the neck
// and down the chest, a torn dark grey shroud (`charcoal`) to the knee,
// strips of dirty bandage round the forearms and shins, a few long strands of
// dark hair; an iron nail through a tag of linen on its brow, a violet sigil
// on the tag. The bar sways and the body follows a beat after. When it dies
// the bar drops and the threads go slack, and it folds up on the floor. Its
// affinity sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { robe, RobeCfg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { RGBA } from '../raster.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16.6,
  shin: 16.2,
  ankleH: 3,
  footLen: 5.6,
  spine: 21,
  neck: 5.4,
  upperArm: 13.6,
  foreArm: 13,
  shoulderDrop: 3.6,
  shoulderN: -2.4,
  shoulderF: 2.6,
  hipN: -1.4,
  hipF: 1.4,
};

const SK = MAT.thrallSkin, SH = MAT.charcoal, BA = MAT.bandage, BO = MAT.ashBone, GV = MAT.glowViolet, HR = MAT.hairDark, LI = MAT.linen, IR = MAT.iron;
const E = ACCENT;

// the torn shroud to the knee, its hem ragged
const ROBE: RobeCfg = { waist: [1.2, 5.0, 5.4], hemDrop: -14, hemFloor: 16, hemBack: [5.4, 5], hemFront: [4.6, 4.2], midBack: [4.6, 3.6], midFront: [4.0, 3.0], ripple: 0.8, zigzag: 2.2 };

/** Where the control floats: over the body, high; it sways and the body follows it. */
function barAt(s: Skel): { c: V; a: number } {
  const P = s.pose.p;
  return { c: v(s.pelvis.x + 3 + (P.barX ?? 0), 84 + (P.barY ?? 0)), a: P.barA ?? 0 };
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;
  const bar = barAt(s);
  const B = d.frame(bar.c, bar.a);
  // the threads' anchors on the control: the bone's ends for the wrists, its middle for the head, the crossbar's ends for the knees
  const anchors = { hN: B(7.6, -0.6), hF: B(-7.6, -0.6), head: B(0.4, -0.8), kN: B(2.6, -2.4), kF: B(-1.8, -1.6) };
  const slack = P.slack ?? 0, glow = P.glow ?? 0;

  thread(d, anchors.hF, at(s.hF, s.loF, -1.2), slack, glow, 2);
  thread(d, anchors.kF, s.kneeF, slack, glow, 2);
  hair(d, s, 6);
  leg(d, s.hipF, s.kneeF, s.ankF, s.pose.footF, 10, -1, 'legF');
  arm(d, s.sF, s.eF, s.hF, s.loF, 20, -1, 'armF');
  shroud(d, s, wave, 28);
  head(d, s, P, 38);
  leg(d, s.hipN, s.kneeN, s.ankN, s.pose.footN, 50, 0, 'legN');
  arm(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN');
  thread(d, anchors.head, s.H(-0.6, 6.4), slack, glow, 78);
  thread(d, anchors.kN, s.kneeN, slack, glow, 78);
  thread(d, anchors.hN, at(s.hN, s.loN, -1.2), slack, glow, 78);
  control(d, bar.c, bar.a, glow, 80);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

/** One thread of violet light, straight while it holds, sagging as it goes slack (`slack` 0..1) but never through the floor; brighter with `glow`. */
function thread(d: Draw, a: V, b: V, slack: number, glow: number, z: number) {
  const c = GV.ramp[glow > 0.5 ? 4 : 2];
  if (slack <= 0) {
    d.line({ mat: GV, z, group: 'thread', outline: false, line: 'none' }, a, b, c);
    return;
  }
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const m = v((a.x + b.x) / 2 + slack * 3, Math.max(1, Math.min(a.y, b.y) - slack * len * 0.35));
  d.line({ mat: GV, z, group: 'thread', outline: false, line: 'none' }, a, m, GV.ramp[1]);
  d.line({ mat: GV, z, group: 'thread', outline: false, line: 'none' }, m, b, GV.ramp[1]);
}

/** The control: the Reign's white bone laid across, a knob at each end, a short crossbar of darker bone over its middle. */
function control(d: Draw, c: V, ang: number, glow: number, z: number) {
  const f = d.frame(c, ang);
  d.capsule({ mat: BO, z, group: 'barBone' }, f(-7, 0), f(7, 0), 1.0, 1.0);
  for (const x of [-7.6, 7.6]) for (const y of [-0.9, 0.9]) d.circle({ mat: BO, z: z + 0.05, group: 'barBone' }, f(x, y), 1.2);
  d.capsule({ mat: BO, z: z + 0.2, group: 'barCross', shade: -1 }, f(-2.2, 1.4), f(3.0, -2.6), 0.8, 0.8);
  const px: { p: V; c: RGBA }[] = [];
  if (glow > 0.5) for (const x of [-7.6, 0.4, 7.6]) px.push({ p: f(x, -1.4), c: GV.ramp[5] });
  d.pixels({ mat: GV, z: z + 0.3, group: 'barGlow', outline: false, line: 'none' }, px);
}

/** A long thin leg, a strip of bandage round the shin, a bare foot hanging from the ankle. */
function leg(d: Draw, hip: V, knee: V, ank: V, footAng: number, z: number, shade: number, g: string) {
  d.capsule({ mat: SK, z, group: g, shade }, hip, knee, 2.8, 2.2);
  d.capsule({ mat: SK, z: z + 0.1, group: g, shade }, knee, ank, 2.0, 1.6);
  const ang = Math.atan2(ank.y - knee.y, ank.x - knee.x) * 57.29578;
  const len = Math.hypot(ank.x - knee.x, ank.y - knee.y);
  d.capsule({ mat: BA, z: z + 0.15, group: g + 'Wrap', shade }, at(knee, ang, len * 0.35), at(knee, ang, len * 0.75), 2.3, 2.0);
  const px: { p: V; c: RGBA }[] = [];
  for (const t of [0.45, 0.6]) for (const k of [-1.6, -0.6, 0.4, 1.4]) px.push({ p: at(at(knee, ang, len * t), ang + 90, k), c: BA.ramp[1] });
  d.pixels({ mat: BA, z: z + 0.2, group: g + 'Wrap', line: 'none' }, px);
  const f = d.frame(ank, footAng);
  d.poly({ mat: SK, z: z + 0.3, group: g, shade }, [f(-2.0, 1.8), f(-2.6, -0.6), f(-2.2, -2.8), f(5.0, -2.8), f(5.8, -1.8), f(3.6, -0.6), f(1.4, 1.4)], { kind: 'bevel', w: 1.4 });
}

/** A long thin arm, a strip of bandage round the forearm, the hand hanging limp from the wrist, long fingers down. */
function arm(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, g: string) {
  d.capsule({ mat: SK, z, group: g, shade }, sh, el, 2.2, 1.8);
  d.capsule({ mat: SK, z: z + 0.1, group: g, shade }, el, ha, 1.8, 1.4);
  const len = Math.hypot(ha.x - el.x, ha.y - el.y);
  d.capsule({ mat: BA, z: z + 0.15, group: g + 'Wrap', shade }, at(el, lo, len * 0.4), at(el, lo, len * 0.8), 2.0, 1.8);
  const px: { p: V; c: RGBA }[] = [];
  for (const t of [0.5, 0.68]) for (const k of [-1.4, -0.4, 0.6]) px.push({ p: at(at(el, lo, len * t), lo + 90, k), c: BA.ramp[1] });
  d.pixels({ mat: BA, z: z + 0.2, group: g + 'Wrap', line: 'none' }, px);
  // the limp hand: it hangs from the wrist whatever the forearm does, turned a little with it
  const ha2 = -90 + Math.max(-30, Math.min(30, (lo + 90) * 0.25));
  const f = d.frame(ha, ha2);
  d.poly({ mat: SK, z: z + 0.3, group: g, shade }, [f(-0.6, -1.6), f(-0.6, 1.6), f(3.6, 1.8), f(6.6, 1.0), f(6.8, -0.4), f(4.4, -1.8)], { kind: 'bevel', w: 1 });
  d.pixels({ mat: SK, z: z + 0.35, group: g, line: 'none' }, [{ p: f(5.6, 0.2), c: SK.ramp[1] }, { p: f(4.6, 0.2), c: SK.ramp[1] }]);
}

/** The torn shroud: a sleeveless tunic to the knee, ragged at the hem, torn open down the chest over a stitched seam. */
function shroud(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: SH, z, group: 'skirt', tex: (h) => (Math.sin(h.u * 13 + wave * 3) > 0.7 ? -1 : 0) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  const body = torsoPts(s, [
    [0, 4.8, 5.0],
    [5, 4.6, 4.8],
    [10, 4.8, 5.2],
    [15, 5.4, 5.4],
    [18, 5.0, 4.6],
    [20, 3.6, 3.0],
    [21, 2.2, 1.8],
  ]);
  d.poly({ mat: SK, z: z + 0.5, group: 'chest' }, body, { kind: 'cyl', a: s.T(0, 0.2), b: s.T(21, 0.2), r: 5.4, bevel: 1.2 });
  // the shroud over the torso, torn open in a ragged V down the front
  d.poly(
    { mat: SH, z: z + 0.6, group: 'tunic', tex: (h) => (Math.sin(h.v * 11) > 0.75 ? -1 : 0) },
    [s.T(0, -4.8), s.T(10, -5.0), s.T(18, -5.0), s.T(20.4, -3.4), s.T(20.6, 0.6), s.T(17, 1.4), s.T(13.6, 3.0), s.T(10.4, 2.4), s.T(7, 4.0), s.T(3.6, 4.4), s.T(0, 5.2)],
    { kind: 'cyl', a: s.T(0, 0), b: s.T(21, 0), r: 5.4, bevel: 1.2 },
  );
  // the stitches: a seam round the neck, another down the chest, crossed with black thread
  const px: { p: V; c: RGBA }[] = [];
  for (let w = -3.4; w <= 3.4; w += 1.1) px.push({ p: s.T(21.6, w), c: INK.black });
  for (const u of [19.8, 18.6, 17.4, 16.2, 15.0]) {
    const w = 3.6 + (19.8 - u) * 0.1;
    px.push({ p: s.T(u, w), c: INK.black }, { p: s.T(u + 0.5, w - 0.8), c: SK.ramp[1] }, { p: s.T(u + 0.5, w + 0.8), c: SK.ramp[1] });
  }
  d.pixels({ mat: SK, z: z + 0.7, group: 'seams', line: 'none' }, px);
}

/** A few long strands of dark hair from the crown, hanging straight down behind the head. */
function hair(d: Draw, s: Skel, z: number) {
  for (const [x, y, len] of [[-3.0, 6.2, 12], [-5.4, 4.2, 10], [-0.6, 6.8, 8]] as const) {
    const r = s.H(x, y);
    d.ribbon({ mat: HR, z, group: 'hair' + x, line: 'none' }, [r, v(r.x - 1.0, r.y - len * 0.5), v(r.x - 1.4, r.y - len)], [0.8, 0.6, 0.4]);
  }
}

/** The head, lolling: a hollow face, an eye with the faint pale light in it, the jaw slack; a tag of linen nailed to the brow. */
function head(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const H = s.H;
  d.capsule({ mat: SK, z: z - 0.5, group: 'neck' }, s.neck, H(0, -4), 2.0, 1.8);
  face(d, s, { skin: SK, z, browStyle: 'none', mouth: 'none', glowEye: P.dead ? SK.ramp[0] : E.ashEyeDim, rx: 5.6, ry: 6.6 });
  const px: { p: V; c: RGBA }[] = [];
  // the hollow under the eye, the slack mouth
  px.push({ p: H(3.2, -0.8), c: SK.ramp[1] }, { p: H(4.2, -1.2), c: SK.ramp[1] });
  px.push({ p: H(4.8, -3.6), c: INK.black }, { p: H(5.4, -3.6), c: INK.black }, { p: H(5.0, -4.6), c: INK.black });
  d.pixels({ mat: SK, z: z + 0.4, group: 'head', line: 'none' }, px);
  // the tag, hanging straight down from the nail
  const n = H(2.0, 4.6);
  const tag = [v(n.x - 1.6, n.y + 0.6), v(n.x + 1.6, n.y + 0.6), v(n.x + 1.9, n.y - 6.2), v(n.x + 0.4, n.y - 7.0), v(n.x - 1.4, n.y - 6.4)];
  d.poly({ mat: LI, z: z + 0.8, group: 'tag', shade: -1 }, tag, { kind: 'bevel', w: 0.6 });
  const g: { p: V; c: RGBA }[] = [
    { p: v(n.x, n.y - 2), c: GV.ramp[4] }, { p: v(n.x, n.y - 3), c: GV.ramp[3] }, { p: v(n.x - 0.8, n.y - 4), c: GV.ramp[3] }, { p: v(n.x + 0.8, n.y - 4), c: GV.ramp[3] },
  ];
  d.pixels({ mat: GV, z: z + 0.85, group: 'sigil', outline: false, line: 'none' }, g);
  d.pixels({ mat: IR, z: z + 0.9, group: 'nail', line: 'none' }, [{ p: v(n.x, n.y), c: IR.ramp[4] }, { p: v(n.x + 0.9, n.y), c: IR.ramp[2] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// At rest: hung from the control, slumped, the head lolling forward, the wrists held up before it and the hands limp.
const IDLE = pose({
  y: -1, torso: 84, head: 58,
  legN: { ik: v(-5, 3) }, legF: { ik: v(6, 3) }, footN: -8, footF: -4,
  armN: { ik: v(14, 44), bend: -1 }, armF: { ik: v(2, 46), bend: -1 },
  p: {},
});

function idle(t: number, i: number): Pose {
  const a = t * Math.PI * 2;
  const sw = Math.sin(a);
  // the body follows the bar a beat late; once round the loop the head is jerked up and falls back
  const late = Math.sin(a - 0.9);
  const jerk = i === 5 ? 1 : 0;
  return tweak(IDLE, {
    x: Math.round(late * 0.6), y: -1 - (jerk ? 1 : 0),
    torso: 84 + late * 2, head: 58 + jerk * 22,
    armN: { ik: v(14 + late, 44 + (jerk ? 2 : 0)), bend: -1 }, armF: { ik: v(2 + late, 46), bend: -1 },
    p: { barX: sw * 1.2, barA: sw * 5, wave: t },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -9 * Math.cos(ph), y: 3 + (sn > 0 ? 7 * sn : 0), ang: sn > 0 ? -40 * sn : -6 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.sin(a);
  // carried along by the bar: the knees jerked up in turn, the arms flopping
  return pose({
    y: bob - 1, torso: 80, head: 54,
    legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang,
    armN: { ik: v(16 + sw * 3, 42), bend: -1 }, armF: { ik: v(6 - sw * 3, 44), bend: -1 },
    p: { barX: 3, barY: bob, barA: -6 + sw * 4, wave: t },
  });
}

// Jerked Blow: the bar is snatched up and its arm with it, high over its head, then slung down across the enemy.
const JB_UP = pose({ x: -1, y: 0, torso: 92, head: 80, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 4) }, footF: -10, armN: { ik: v(4, 74), bend: 1 }, armF: { ik: v(0, 46), bend: -1 }, p: { barX: -2, barY: 4, barA: -18 } });
const JB_SWING = pose({ x: 6, y: -2, torso: 78, head: 52, legN: { ik: v(-9, 3) }, legF: { ik: v(10, 3) }, armN: { ik: v(26, 34), bend: -1 }, armF: { ik: v(4, 44), bend: -1 }, p: { barX: 8, barY: -2, barA: 16, wave: 0.5 } });
const JB_HOLD = tweak(JB_SWING, { x: 5, head: 48, p: { barX: 7, barY: -2, barA: 10, wave: 0.6 } });

// Stitch and Pull: the bar lifted, its arms drawn up and out wide, the threads blazing; then pulled back in.
const SP_SPREAD = pose({ y: 1, torso: 92, head: 84, legN: { ik: v(-6, 4) }, legF: { ik: v(6, 4) }, footN: -16, footF: -16, armN: { ik: v(22, 58), bend: -1 }, armF: { ik: v(-14, 58), bend: 1 }, p: { barY: 4, glow: 1, wave: 0.3 } });
const SP_PULL = pose({ y: -1, torso: 88, head: 76, legN: { ik: v(-5, 3) }, legF: { ik: v(6, 3) }, armN: { ik: v(12, 52), bend: -1 }, armF: { ik: v(-2, 52), bend: -1 }, p: { barY: 1, barA: -6, glow: 1, wave: 0.6 } });

const HURT = pose({ x: -4, y: -1, torso: 96, head: 92, legN: { ik: v(-8, 3) }, legF: { ik: v(6, 4) }, footF: 10, armN: { ik: v(8, 50), bend: -1 }, armF: { ik: v(-4, 50), bend: -1 }, p: { barX: -3, barA: -10 } });

// Death: the bar drops, the threads go slack and it folds up: to its knees, then down on its side; the bar lies by it.
const DEATH_DROP = pose({ x: 0, y: -4, torso: 80, head: 40, legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) }, armN: { ik: v(12, 34), bend: -1 }, armF: { ik: v(2, 34), bend: -1 }, p: { barY: -10, barA: 14, slack: 0.4 } });
const DEATH_KNEEL = pose({ x: 0, y: -13, torso: 76, head: 30, legN: { ik: v(-11, 3) }, legF: { ik: v(6, 3) }, footN: -30, armN: { up: -80, lo: -70 }, armF: { up: -90, lo: -80 }, p: { barY: -34, barA: 24, slack: 0.8 } });
const DEATH_FALL = pose({ x: 2, y: -6, torso: 30, head: 10, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { barX: 6, barY: -62, barA: 30, slack: 1 } });
const DEATH_DOWN = pose({ x: 6, y: -15, torso: 4, head: -6, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { barX: 8, barY: -79, barA: 6, slack: 1, dead: 1 } });

// Victory: the control tips it into a puppet's bow, one arm across its chest, and draws it up again.
const VIC_BOW = pose({ x: 1, y: -2, torso: 46, head: 20, legN: { ik: v(-5, 3) }, legF: { ik: v(6, 3) }, armN: { ik: v(12, 38), bend: -1 }, armF: { ik: v(-12, 50), bend: 1 }, p: { barX: 6, barY: -6, barA: 18 } });
const VIC_UP = pose({ y: 0, torso: 90, head: 82, legN: { ik: v(-5, 3) }, legF: { ik: v(6, 3) }, armN: { ik: v(16, 50), bend: -1 }, armF: { ik: v(0, 50), bend: -1 }, p: { barY: 2, glow: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'strung_thrall',
  name: 'Strung Thrall',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 220, idle) },
    run: { loop: true, frames: cycle(8, 84, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, JB_UP, 2, 90, ease.out),
        ...keys([
          [JB_UP, 200],
          [mid(JB_UP, JB_SWING, 0.5), 60],
          [JB_SWING, 80, { hit: true }],
          [JB_HOLD, 260],
        ]),
        ...tween(D, JB_HOLD, IDLE, 3, 120, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SP_SPREAD, 3, 110, ease.out),
        ...keys([
          [SP_SPREAD, 160, { event: 'cast' }],
          [tweak(SP_SPREAD, { p: { barY: 5, glow: 1, wave: 0.4 } }), 160, { hit: true }],
          [SP_SPREAD, 200],
          [mid(SP_SPREAD, SP_PULL, 0.5), 90],
          [SP_PULL, 300],
        ]),
        ...tween(D, SP_PULL, IDLE, 3, 130, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 92, head: 80 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [DEATH_DROP, 140],
        [DEATH_KNEEL, 220],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -15.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: keys([
        [mid(IDLE, VIC_BOW, 0.5), 120],
        [VIC_BOW, 500],
        [mid(VIC_BOW, VIC_UP, 0.5), 120],
        [VIC_UP, 500],
        [mid(VIC_UP, IDLE, 0.5), 120],
        [IDLE, 120],
      ]),
    },
  },
};

// ---------------------------------------------------------------------------
// icons
// ---------------------------------------------------------------------------

/** The control for the icons: the white bone across, a knob at each end. */
function iconBar(d: Draw, c: V, w: number, z: number) {
  d.capsule({ mat: BO, z, group: 'ib' + z }, v(c.x - w, c.y), v(c.x + w, c.y), 2.0, 2.0);
  for (const x of [-w - 1, w + 1]) for (const y of [-1.8, 1.8]) d.circle({ mat: BO, z: z + 0.1, group: 'ib' + z }, v(c.x + x, c.y + y), 2.2);
}

export const strungThrall: ChampionArt = {
  char,
  iconBg: SH,
  icons: {
    jerked_blow: () =>
      compose(SH, glyph((d) => {
        iconBar(d, v(20, 33), 10, 10);
        const f = d.frame(v(26, 10), -60);
        d.poly({ mat: SK, z: 11, group: 'ih' }, [f(-2, -3), f(-2, 3), f(6, 4), f(11, 2), f(11, -2), f(6, -4)], { kind: 'bevel', w: 1.5 });
      }), (b) => {
        for (let y = 14; y <= 30; y++) b.set(Math.round(24 + (30 - y) * 0.15), y, GV.ramp[4]);
        for (let y = 8; y <= 30; y++) b.set(Math.round(10 + (30 - y) * 0.1), y, GV.ramp[3]);
      }),
    stitch_and_pull: () =>
      compose(SH, glyph((d) => {
        d.capsule({ mat: IR, z: 10, group: 'in' }, v(6, 34), v(30, 8), 1.4, 0.8);
      }), (b) => {
        for (let k = 0; k < 7; k++) {
          const x = 10 + k * 4, y = 20 + (k % 2 ? -4 : 4);
          for (let j = 0; j < 4; j++) b.set(x + j, y + (k % 2 ? j * 2 : -j * 2), GV.ramp[k % 2 ? 4 : 3]);
        }
      }),
    snagging_threads: () =>
      compose(SH, glyph((d) => {
        iconBar(d, v(20, 34), 9, 10);
      }), (b) => {
        for (let k = 0; k < 40; k++) {
          const a = k * 0.5;
          const x = Math.round(20 + Math.cos(a) * (4 + k * 0.25)), y = Math.round(16 + Math.sin(a) * (3 + k * 0.18));
          b.set(x, y, GV.ramp[k % 3 === 0 ? 5 : 4]);
        }
      }),
  },
};
