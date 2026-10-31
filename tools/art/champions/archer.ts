// The Archer (Jakub's brief, docs/DESIGN_DECISIONS.md section 43,
// 2026-10-31): a Common Damage of the Sanguine Dominion, a short-bow archer
// in a hunting vest, no helmet, bald with a goatee. Lean and lightly dressed,
// so he never reads as Red Cloak (plate, cloak, zweihander): a vest of brown
// leather over a dark-red shirt, its sleeves rolled to the elbow, a small red
// hexagon badge on the vest (the Dominion's mark), a leather bracer on the bow
// arm, dark breeches and boots, a quiver of red-fletched arrows on his back, a
// short recurve bow of dark wood; a bald, tanned head, a dark goatee. The bow
// and the draw follow the Automated Soul's: the far hand holds the bow, the
// near hand draws the string. His affinity (Bloom) sets nothing here (Jakub,
// 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { arrowGlyph, compose, glyph, impactStar, speedLines } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, leg, torsoPts } from '../parts.ts';
import { at, D2R, Dims, Draw, lerpPose, pose, Pose, Skel, solve, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 33,
  thigh: 15.6,
  shin: 15,
  ankleH: 3,
  footLen: 6.4,
  spine: 21,
  neck: 6.6,
  upperArm: 12.4,
  foreArm: 11.4,
  shoulderDrop: 4.4,
  shoulderN: -3.0,
  shoulderF: 3.4,
  hipN: -2.0,
  hipF: 2.0,
};

const SK = MAT.skinTan, SH = MAT.maroon, LE = MAT.leather, DL = MAT.darkleather, CH = MAT.charcoal, WD = MAT.wood, IR = MAT.iron, RD = MAT.red, HR = MAT.hairDark, HN = MAT.bone;
const E = ACCENT;

/** The short recurve bow, grip to tip; how far the string sits behind the grip at rest; how far a full draw takes it. */
const BOW = 19, BRACE = 3, DRAW = 13;
/** An arrow, nock to point. */
const ARROW = 19;

const angle = (a: V, b: V) => Math.atan2(b.y - a.y, b.x - a.x) / D2R;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const nocked = (P.nock ?? 0) >= 0.5 && !P.drop;

  // the quiver at his back
  quiver(d, s, 3);

  // far leg, the far arm (his bow arm: rolled sleeve, bare forearm, the bracer)
  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(20, -1));
  bracer(d, s.eF, s.hF, 20.5, -1, 'F');

  // the shirt, the vest over it, the badge, the belt
  torso(d, s, 30);

  head(d, s, P);

  // the bow before him, in his far hand or fallen; the arrow on the string
  if (P.drop) bow(d, v(16, 1.6), 4, 0, null, 44);
  else {
    const nockP = nocked ? s.hN : null;
    bow(d, s.hF, P.bowAng ?? 98, nocked ? P.draw ?? 0 : 0, nockP, 44);
    gripHand(d, s.hF, P.bowAng ?? 98, 44.5, -1);
    if (nockP && (P.arrow ?? 0) >= 0.5) arrow(d, nockP, P.aimAng ?? 0, 59);
  }

  // near leg, near arm (the drawing hand)
  leg(d, s, 'N', legCfg(50, 0));
  arm(d, s, 'N', armCfg(60, 0));
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: CH, shin: CH, foot: LE, rThigh: [4.0, 3.3] as [number, number], rShin: [3.0, 2.5] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: LE, from: 0.5, r: [3.2, 2.9] as [number, number], cuff: DL },
});

// the shirt's sleeve rolled to the elbow: dark red above, bare tanned forearm below
const armCfg = (z: number, shade: number) => ({
  upper: SH, fore: SK, hand: SK, rUp: [3.0, 2.7] as [number, number], rLo: [2.5, 2.2] as [number, number], rHand: 2.0, z, shade, cuff: SH,
});

/** The leather bracer on the bow arm's forearm. */
function bracer(d: Draw, el: V, ha: V, z: number, shade: number, side: string) {
  const a = angle(el, ha);
  d.capsule({ mat: DL, z, group: 'bracer' + side, shade }, at(el, a, 3.6), at(ha, a, -2.0), 2.6, 2.4);
  d.line({ mat: DL, z: z + 0.05, group: 'bracer' + side, line: 'none' }, at(at(el, a, 5.4), a + 90, 1.6), at(at(el, a, 5.4), a - 90, 1.6), DL.ramp[4]);
}

/** The shirt, the vest of brown leather over it, open at the throat, the red hexagon badge, a belt. */
function torso(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 6.0, 6.2],
    [4, 6.0, 6.6],
    [9, 6.6, 7.4],
    [14, 7.0, 7.8],
    [17.2, 7.0, 7.2],
    [19.4, 5.6, 5.0],
    [20.8, 3.2, 2.6],
  ]);
  d.poly({ mat: SH, z, group: 'shirt' }, body, { kind: 'cyl', a: s.T(0, 1), b: s.T(20.8, 1), r: 7.6, bevel: 1.2 });
  // the vest: everything but a wedge of shirt at the throat and a strip down the front
  d.poly(
    { mat: LE, z: z + 0.5, group: 'vest', tex: (h) => (Math.sin(h.v * 22) > 0.85 ? -1 : 0) },
    [s.T(-0.6, -6.6), s.T(-0.6, 5.4), s.T(9, 5.6), s.T(15.6, 4.2), s.T(19.8, 2.0), s.T(20.4, -2.0), s.T(19.2, -5.8), s.T(14, -7.6), s.T(6, -7.0)],
    { kind: 'cyl', a: s.T(0, 0), b: s.T(20.4, 0), r: 7.8, bevel: 1.1 },
  );
  // the vest's lacing down its front edge
  for (const u of [7, 10, 13]) d.pixels({ mat: DL, z: z + 0.6, group: 'vest' }, [{ p: s.T(u, 5.0), c: DL.ramp[1] }]);
  // the red hexagon badge on the chest
  hexBadge(d, s.T(13.6, 1.6), z + 0.7);
  // belt with an iron buckle
  d.poly({ mat: DL, z: z + 1, group: 'belt' }, [s.T(3.0, -6.6), s.T(3.2, 7.2), s.T(1.0, 7.0), s.T(0.8, -6.4)], { kind: 'cyl', a: s.T(0.8, 0), b: s.T(3.2, 0), r: 7 });
  d.poly({ mat: IR, z: z + 1.1, group: 'buckle' }, [s.T(3.4, 4.4), s.T(3.4, 7.0), s.T(0.6, 7.0), s.T(0.6, 4.4)], { kind: 'bevel', w: 1 });
}

/** A small red hexagon (the Sanguine Dominion's mark) with a dark rim, pixel by pixel so it stays crisp. */
function hexBadge(d: Draw, center: V, z: number) {
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const R = RD.ramp;
  const px: { p: V; c: (typeof R)[number] }[] = [];
  for (const [x, y] of [[-1, 2], [0, 2], [1, 2], [-2, 1], [2, 1], [-2, 0], [2, 0], [-2, -1], [2, -1], [-1, -2], [0, -2], [1, -2]]) px.push({ p: v(c.x + x, c.y + y), c: R[1] });
  for (const [x, y] of [[-1, 1], [0, 1], [1, 1], [-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1]]) px.push({ p: v(c.x + x, c.y + y), c: y > 0 || x < 0 ? R[4] : R[3] });
  d.pixels({ mat: RD, z, group: 'badge', line: 'none', outline: false }, px);
}

/** The bald, tanned head: a shine on the crown, dark brows, a dark goatee on the chin. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.8, 2.6);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.grit ? 'angry' : 'flat', mouth: P.grit ? 'shout' : 'line', lip: SK.ramp[1], rx: 6.0, ry: 6.8 });
  // the shine on the bald crown
  d.pixels({ mat: SK, z: 38.5, group: 'shine', line: 'none', outline: false }, [{ p: H(-1.6, 6.4), c: SK.ramp[5] }, { p: H(-0.6, 6.6), c: SK.ramp[4] }, { p: H(-2.6, 5.8), c: SK.ramp[4] }]);
  // the goatee: a pointed tuft under the lip, a short line over it
  d.poly({ mat: HR, z: 38.7, group: 'goatee', line: 'soft' }, [H(5.8, -3.4), H(5.4, -6.6), H(4.2, -9.2), H(2.8, -7.4), H(2.4, -4.4), H(3.6, -3.0)], { kind: 'bevel', w: 0.8 });
  d.pixels({ mat: HR, z: 38.75, group: 'goatee' }, [{ p: H(5.4, -2.4), c: HR.ramp[2] }, { p: H(4.6, -2.2), c: HR.ramp[2] }]);
}

/**
 * The short recurve bow: dark wood bent back toward the string, its tips curling
 * forward, the grip wrapped in leather; the string straight between the tips, or
 * drawn back to `nockP`. `ang` is its axis (the upper limb's way), `draw` bends it.
 */
function bow(d: Draw, grip: V, ang: number, draw: number, nockP: V | null, z: number) {
  const f = d.frame(grip, ang); // u toward the upper tip, w toward the string
  const back = 2.6 + draw * 3.0;
  const tipU = f(BOW, back - 1.6), tipL = f(-BOW, back - 1.6);
  const limb = [f(-BOW - 1.2, back - 3.0), tipL, f(-13, back * 0.75), f(-6, back * 0.25), f(0, 0), f(6, back * 0.25), f(13, back * 0.75), tipU, f(BOW + 1.2, back - 3.0)];
  d.ribbon({ mat: WD, z, group: 'bow', tex: (h) => (h.v > 0.35 ? -1 : 0) }, limb, [0.6, 0.8, 1.1, 1.3, 1.5, 1.3, 1.1, 0.8, 0.6]);
  d.capsule({ mat: DL, z: z + 0.05, group: 'bowGrip' }, f(-2.0, 0.1), f(2.0, 0.1), 1.3, 1.3);
  const so = { mat: HN, z: z - 0.5, group: 'string', outline: false, line: 'none' as const };
  if (nockP) {
    d.line(so, tipU, nockP, E.string);
    d.line(so, nockP, tipL, E.string);
  } else {
    d.line(so, tipU, tipL, E.string);
  }
}

/** The far hand's fingers closed round the bow's grip. */
function gripHand(d: Draw, hand: V, bowAng: number, z: number, shade: number) {
  const f = d.frame(hand, bowAng);
  d.ellipse({ mat: SK, z, group: 'gripF', shade }, f(0, -1.0), 2.0, 1.6, bowAng);
}

/** An arrow on the string: the shaft, an iron head, red fletching by the nock. */
function arrow(d: Draw, nockP: V, aim: number, z: number) {
  const tip = at(nockP, aim, ARROW);
  d.line({ mat: WD, z, group: 'arrow', line: 'none' }, at(nockP, aim, 0.5), at(nockP, aim, ARROW - 2.4), WD.ramp[4]);
  const hf = d.frame(tip, aim);
  d.poly({ mat: IR, z: z + 0.2, group: 'arrowHead' }, [hf(1.2, 0), hf(-2.4, 1.3), hf(-1.6, 0), hf(-2.4, -1.3)], { kind: 'bevel', w: 1 });
  const fl = (u: number, w: number) => at(at(nockP, aim, u), aim + 90, w);
  d.pixels({ mat: RD, z: z + 0.1, group: 'fletch', outline: false, line: 'none' }, [
    { p: fl(1.8, 1), c: RD.ramp[4] }, { p: fl(3.0, 1), c: RD.ramp[3] },
    { p: fl(1.8, -1), c: RD.ramp[3] }, { p: fl(3.0, -1), c: RD.ramp[2] },
  ]);
}

/** The quiver on his back, slung over the far shoulder: dark leather, three red fletchings standing out of it. */
function quiver(d: Draw, s: Skel, z: number) {
  const top = s.T(20.0, -6.4), bot = s.T(5.6, -8.4);
  d.capsule({ mat: DL, z, group: 'quiver' }, top, bot, 2.0, 1.8, 0.3);
  const a = angle(top, bot);
  for (const k of [0.14, 0.86]) {
    const p = v(top.x + (bot.x - top.x) * k, top.y + (bot.y - top.y) * k);
    d.capsule({ mat: LE, z: z + 0.05, group: 'quiverBand' + k, line: 'soft' }, at(p, a + 90, 2.0), at(p, a - 90, 2.0), 0.5, 0.5);
  }
  const up = angle(bot, top);
  for (const [i, o, l] of [[0, -1.4, 4.2], [1, 0.4, 5.0], [2, 1.9, 3.6]] as const) {
    const base = at(at(top, up, 0.6), up + 90, o);
    d.capsule({ mat: RD, z: z - 0.5 + i * 0.01, group: 'fletchQ' + i, line: 'soft' }, at(base, up, 1.6), at(base, up + (i - 1) * 6, l), 0.9, 1.2);
  }
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const REST = { bowAng: 98, draw: 0, arrow: 0, nock: 0, aimAng: 0 };

/** Idle: easy on his feet, the bow upright in his far hand, the near hand loose. */
const IDLE: Pose = pose({
  torso: 86,
  head: 88,
  legN: { ik: v(-7, 3) },
  legF: { ik: v(7, 3) },
  armN: { up: -100, lo: -84 },
  armF: { up: -64, lo: -30 },
  p: REST,
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b,
    armN: { up: -100 + b, lo: -84 + b },
    armF: { up: -64 + b, lo: -30 + b },
    p: { bowAng: 98 - b },
  });
}

/** Run: a light, quick stride, the bow carried slanting forward, the near arm swinging. */
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (sn > 0 ? 6.5 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 1.5,
    torso: 76,
    head: 82,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -86 + sw * 32, lo: -46 + sw * 34 },
    armF: { up: -60 - sw * 10, lo: -22 - sw * 10 },
    p: { ...REST, bowAng: 34 - sw * 8 },
  });
}

/** Feet set apart to shoot, side on. */
const STANCE = pose({
  torso: 88,
  head: 90,
  legN: { ik: v(-9, 3) },
  legF: { ik: v(8.5, 3) },
  p: REST,
});

/** The bow arm out along `aimAng`, the string hand drawn back by `draw` (0..1), an arrow on the string. */
function aim(base: Pose, aimAng: number, draw: number, extra: Partial<Pose> & { p?: Record<string, number> } = {}): Pose {
  const p = tweak(base, { ...extra, armF: { up: aimAng - 4, lo: aimAng + 1 } });
  const s = solve(p, D);
  const nock = at(s.hF, aimAng, -(BRACE + draw * DRAW));
  return tweak(p, { armN: { ik: nock, bend: 1 }, p: { ...(extra.p ?? {}), aimAng, bowAng: aimAng + 90, draw, arrow: 1, nock: 1 } });
}

/** Loosed: the string straight again, the drawing hand flung back past the nock. */
function release(base: Pose, aimAng: number, extra: Partial<Pose> & { p?: Record<string, number> } = {}): Pose {
  const p = tweak(base, { ...extra, armF: { up: aimAng + 2, lo: aimAng + 7 } });
  const s = solve(p, D);
  const hand = at(at(s.hF, aimAng, -(BRACE + DRAW + 3)), aimAng + 90, 3);
  return tweak(p, { armN: { ik: hand, bend: 1 }, p: { ...(extra.p ?? {}), aimAng, bowAng: aimAng + 94, draw: 0, arrow: 0, nock: 0 } });
}

// Piercing Shot: a quick nock, a full draw held a beat with a narrowed eye, loosed straight.
const A1 = 2;

const HURT = pose({
  x: -4, y: -1, torso: 98, head: 104,
  legN: { ik: v(-11, 3) }, legF: { ik: v(7, 4) }, footF: 10,
  armN: { up: -126, lo: -104 }, armF: { up: -40, lo: -8 },
  p: { ...REST, bowAng: 116, grit: 1 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -10, torso: 76, head: 62,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -30,
  armN: { up: -96, lo: -86 }, armF: { up: -70, lo: -40 },
  p: { ...REST, bowAng: 30 },
});
const DEATH_FALL = pose({
  x: 2, y: -8, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { ...REST, drop: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -22, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { ...REST, drop: 1 },
});

/** Victory: the bow lifted high in his far hand. */
const RAISE = pose({
  torso: 88, head: 92,
  legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -104, lo: -80 },
  armF: { up: 84, lo: 90 },
  p: { ...REST, bowAng: 94, grit: 1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'archer',
  name: 'Archer',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 170, idle) },
    run: { loop: true, frames: cycle(8, 75, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, aim(STANCE, A1, 0), 0.5), 70],
        [aim(STANCE, A1, 0), 90],
        [aim(STANCE, A1, 0.55), 80],
        [aim(STANCE, A1, 1, { p: { grit: 1 } }), 220],
        [release(STANCE, A1, { x: -1 }), 80, { event: 'shoot', hit: true }],
        [release(STANCE, A1 + 3, { x: -1, torso: 89 }), 160],
        [mid(release(STANCE, A1 + 3), IDLE, 0.5), 100],
        [IDLE, 100],
      ]),
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 95, head: 100 }), 110],
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
// skill icon (glyph space: y up)
// ---------------------------------------------------------------------------

export const archer: ChampionArt = {
  char,
  iconBg: SH,
  icons: {
    piercing_shot: () =>
      compose(SH, glyph((d) => {
        // a plate split by the arrow driven through it
        d.poly({ mat: IR, z: 2, group: 'plate' }, [v(24, 6), v(33, 9), v(33, 31), v(24, 34)], { kind: 'bevel', w: 1.2 });
        arrowGlyph(d, v(3, 20), v(36, 20), 10, MAT.iron, MAT.red);
      }), (b) => {
        // the crack where it went in, and its speed (screen space, y down)
        impactStar(b, 28, 20, 1, 7, 8, IR.ramp[3], E.white);
        speedLines(b, [[2, 14, 10, 14], [4, 26, 12, 26]], E.white);
      }),
  },
};
