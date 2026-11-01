// The Crossbowman (Jakub's brief, docs/DESIGN_DECISIONS.md section 58,
// 2026-11-01): an Elite Damage of the Azure Crown in city medieval dress of
// green, yellow and blue, a fancy hat with a feather, a big mustache, a crossbow.
// So a guild master on parade: a green doublet striped with yellow, slashed
// sleeves puffed at the shoulder, blue hose and blue forearms, tall boots; a broad
// blue hat with a yellow band and one long yellow feather curling back past his
// shoulders, a great handlebar mustache; a small gold crown on his chest (the
// Crown's mark). The crossbow is held in both hands, the near one on the grip, the
// far one under the stock. A1 is a shot from the shoulder; A2 is taken from one
// knee with a long aim. His affinity (Tide) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { compose, glyph, impactStar, speedLines } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, leg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, lerpPose, pose, Pose, Skel, solve, tweak, V, v } from '../rig.ts';
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

const SK = MAT.skinLight, GR = MAT.green, YE = MAT.yellowCloth, BL = MAT.blue, LE = MAT.leather, DL = MAT.darkleather, WD = MAT.wood, IR = MAT.iron, GO = MAT.gold, HR = MAT.hairBrown;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;

  feather(d, s, 3);

  // far leg, far arm under the stock
  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(20, -1));
  puff(d, s.sF, s.eF, 20.5, -1, 'F');

  torso(d, s, 30);
  head(d, s, P);

  // the crossbow across him, or fallen
  if (P.drop) crossbow(d, v(10, 4), 2, 0, 0, 44, 0.24);
  else {
    const grip = s.hN;
    crossbow(d, grip, P.cbAng ?? 34, P.loaded ?? 1, P.span ?? 1, 44);
    // the far hand's fingers closed under the stock
    d.ellipse({ mat: SK, z: 44.5, group: 'gripF', shade: -1 }, s.hF, 2.1, 1.7, P.cbAng ?? 34);
  }

  leg(d, s, 'N', legCfg(50, 0));
  skirt(d, s, 52);
  arm(d, s, 'N', armCfg(60, 0));
  puff(d, s.sN, s.eN, 60.5, 0, 'N');
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: BL, shin: BL, foot: LE, rThigh: [4.0, 3.2] as [number, number], rShin: [3.0, 2.5] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: LE, from: 0.56, r: [3.1, 2.9] as [number, number], cuff: YE },
});

const armCfg = (z: number, shade: number) => ({
  upper: YE, fore: BL, hand: SK, rUp: [3.0, 2.6] as [number, number], rLo: [2.5, 2.1] as [number, number], rHand: 2.0, z, shade, cuff: YE,
});

/** A sleeve puffed at the shoulder, yellow, slashed with green. */
function puff(d: Draw, sh: V, el: V, z: number, shade: number, side: string) {
  const c = v(sh.x + (el.x - sh.x) * 0.42, sh.y + (el.y - sh.y) * 0.42);
  const a = (Math.atan2(el.y - sh.y, el.x - sh.x) * 180) / Math.PI;
  d.ellipse({ mat: YE, z, group: 'puff' + side, shade }, c, 6, 4.3, a);
  const f = d.frame(c, a);
  for (const u of [-2.6, 0, 2.6]) d.line({ mat: GR, z: z + 0.05, group: 'puff' + side, line: 'none' }, f(u, -2.8), f(u, 2.8), GR.ramp[shade < 0 ? 2 : 3]);
}

/** The doublet: green with yellow stripes down it, a yellow hem and collar, a belt with a gold buckle, the Crown's mark on the chest. */
function torso(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 6.6, 6.8],
    [4, 6.0, 6.6],
    [9, 6.6, 7.4],
    [14, 7.2, 7.8],
    [17.2, 7.0, 7.2],
    [19.4, 5.6, 5.0],
    [20.8, 3.2, 2.6],
  ]);
  d.poly({ mat: GR, z, group: 'doublet', tex: (h) => (Math.sin(h.u * 1.5) > 0.72 ? 3 : 0) }, body, { kind: 'cyl', a: s.T(0, 1), b: s.T(20.8, 1), r: 7.6, bevel: 1.2 });
  // the stripes, yellow, down the doublet
  for (const w of [-3.6, 0.2, 4]) d.line({ mat: YE, z: z + 0.4, group: 'stripes', line: 'none' }, s.T(18.6, w), s.T(4.4, w), YE.ramp[w > 3 ? 4 : 3]);
  // the collar
  d.poly({ mat: YE, z: z + 0.5, group: 'collar' }, [s.T(21.4, -3.6), s.T(21.4, 3.4), s.T(19, 5.2), s.T(19, -5)], { kind: 'bevel', w: 0.8 });
  // the belt
  d.poly({ mat: DL, z: z + 1, group: 'belt' }, [s.T(4.0, -6.6), s.T(4.2, 7.0), s.T(2.0, 6.8), s.T(1.8, -6.4)], { kind: 'cyl', a: s.T(1.8, 0), b: s.T(4.2, 0), r: 7 });
  d.poly({ mat: GO, z: z + 1.1, group: 'buckle' }, [s.T(4.4, 3.6), s.T(4.4, 6.4), s.T(1.6, 6.4), s.T(1.6, 3.6)], { kind: 'bevel', w: 1 });
  // the Crown's mark
  const c = s.T(13.6, 2.2), x0 = Math.floor(c.x), y0 = Math.floor(c.y);
  const px: { p: V; c: (typeof GO.ramp)[number] }[] = [];
  for (const [dx, dy, k] of [[-2, 1, 5], [0, 1, 5], [2, 1, 5], [-2, 0, 4], [-1, 0, 4], [0, 0, 4], [1, 0, 4], [2, 0, 4], [-2, -1, 3], [-1, -1, 3], [0, -1, 3], [1, -1, 3], [2, -1, 3]]) px.push({ p: v(x0 + dx + 0.5, y0 + dy + 0.5), c: GO.ramp[k] });
  d.pixels({ mat: GO, z: z + 1.2, group: 'crownMark', line: 'none', outline: false }, px);
}

/** The doublet's short skirt, over his hips and the tops of his legs: green, striped, a yellow hem. */
function skirt(d: Draw, s: Skel, z: number) {
  d.poly({ mat: GR, z, group: 'skirt' }, [s.T(2.4, -6.6), s.T(2.4, 7), s.T(-6, 9.2), s.T(-6, -8.8)], { kind: 'cyl', a: s.T(-6, 0), b: s.T(2.4, 0), r: 8.6, bevel: 1 });
  for (const w of [-4, 0.2, 4.4]) d.line({ mat: YE, z: z + 0.1, group: 'skirt', line: 'none' }, s.T(1.6, w), s.T(-5, w * 1.24), YE.ramp[w > 3 ? 4 : 3]);
  d.poly({ mat: YE, z: z + 0.2, group: 'skirtHem' }, [s.T(-5.2, -9), s.T(-5.2, 9.4), s.T(-7, 9.6), s.T(-7, -9.2)], { kind: 'bevel', w: 0.7 });
}

/** The head: brown hair at the nape, the great handlebar mustache, the broad hat. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.8, 2.6);
  d.poly({ mat: HR, z: 37.8, group: 'hairBack' }, [H(-6.4, 3), H(-6.8, -3), H(-5.2, -6.4), H(-1.6, -5), H(-1.6, 3)], { kind: 'bevel', w: 1 });
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.grit ? 'angry' : 'flat', mouth: 'line', lip: SK.ramp[1], rx: 6.0, ry: 6.8 });
  // the mustache: a handlebar, thick under the nose, each side sweeping out and curling up, the chin bare below it
  const stache = { mat: HR, z: 38.7, line: 'soft' as const };
  d.ribbon({ ...stache, group: 'mustache' }, [H(5.2, -2.4), H(7.8, -3.2), H(10.2, -2.6), H(11.6, -0.8), H(11.2, 1.4)], [1.7, 1.5, 1.1, 0.8, 0.5]);
  d.ribbon({ ...stache, group: 'mustache' }, [H(5.2, -2.4), H(2.6, -3.2), H(0.2, -2.6), H(-1.6, -0.8), H(-1.4, 1.6)], [1.7, 1.5, 1.1, 0.8, 0.5]);
  d.pixels({ mat: HR, z: 38.8, group: 'mustache', line: 'none', outline: false }, [{ p: H(7.8, -2.2), c: HR.ramp[5] }, { p: H(2.6, -2.2), c: HR.ramp[5] }, { p: H(5.2, -1.6), c: HR.ramp[4] }]);
  // the hat: a broad brim tipped back, a soft crown puffed over it, a yellow band
  d.poly({ mat: BL, z: 39.2, group: 'crownHat' }, [H(-6.6, 6), H(-7.2, 10), H(-5, 13.6), H(-0.6, 14.8), H(3.6, 13.8), H(6, 10.6), H(6.2, 6)], { kind: 'bevel', w: 1.6 });
  d.poly({ mat: YE, z: 39.3, group: 'hatBand' }, [H(-6.8, 8.8), H(6.3, 8.8), H(6.3, 6.4), H(-6.8, 6.4)], { kind: 'bevel', w: 0.8 });
  d.ribbon({ mat: BL, z: 39.4, group: 'brim' }, [H(-11, 8.2), H(-6, 6.6), H(0, 5.8), H(6, 5.8), H(11, 7)], [1, 1.4, 1.5, 1.4, 0.9]);
  d.ellipse({ mat: GO, z: 39.5, group: 'hatPin' }, H(-4.6, 7.8), 1.5, 1.5, 0);
}

/** One long yellow feather from the hat's pin, curling back and down past his shoulders, green at its tip; it trails a little with his head. */
function feather(d: Draw, s: Skel, z: number) {
  const H = s.H;
  const pts = [H(-4.4, 8.4), H(-9, 13.4), H(-15, 14.2), H(-20, 10.6), H(-22.6, 5), H(-22.6, 0)];
  d.ribbon({ mat: YE, z, group: 'feather' }, pts, [1, 2, 2.6, 2.3, 1.6, 0.8]);
  d.ribbon({ mat: GR, z: z + 0.1, group: 'featherTip' }, pts.slice(3), [1.5, 1.2, 0.6]);
  d.line({ mat: YE, z: z + 0.2, group: 'feather', line: 'none' }, pts[1], pts[3], YE.ramp[5]);
}

/**
 * The crossbow, from the grip: a stock of dark wood with its butt behind the hand,
 * inlaid with gold, an iron nut, the steel prod across its head, seen a little from
 * the side so it reads as a bow; `loaded` a bolt lying on it, `span` the string
 * drawn back to the nut or (0) straight across the prod; `lie` squashes the prod
 * when it lies flat on the ground.
 */
function crossbow(d: Draw, grip: V, ang: number, loaded: number, span: number, z: number, lie = 1) {
  const f = d.frame(grip, ang);
  // the prod, then the string behind the stock
  const head = 19;
  const tipU = f(head - 2.4 - span * 1.6, 12.5 * lie), tipD = f(head - 2.4 - span * 1.6, -12.5 * lie);
  d.ribbon({ mat: IR, z: z - 0.2, group: 'prod' }, [tipD, f(head - 0.6, -6.5 * lie), f(head + 0.6, 0), f(head - 0.6, 6.5 * lie), tipU], [0.7, 1.1, 1.4, 1.1, 0.7]);
  const so = { mat: MAT.bone, z: z - 0.3, group: 'string', outline: false, line: 'none' as const };
  const nut = f(span ? 3 : head - 2, 1.2);
  d.line(so, tipU, nut, E.string);
  d.line(so, nut, tipD, E.string);
  // the stock, deep at the butt
  d.ribbon({ mat: WD, z, group: 'stock', tex: (h) => (h.v > 0.4 ? -1 : 0) }, [f(-11, -2.2), f(-5, -0.8), f(4, 0), f(14, 0.2), f(head + 1.4, 0.2)], [2.6, 2, 1.6, 1.4, 1.2]);
  d.line({ mat: GO, z: z + 0.05, group: 'stock', line: 'none' }, f(-8, -1.2), f(9, 0.2), GO.ramp[4]);
  d.ellipse({ mat: IR, z: z + 0.1, group: 'nut' }, f(3, 1.2), 1.5, 1.3, ang);
  // the stirrup at its nose
  d.line({ mat: IR, z: z + 0.1, group: 'stirrup', line: 'none' }, f(head + 1.4, 0.2), f(head + 3.4, 0.2), IR.ramp[3]);
  if (loaded >= 0.5) {
    d.line({ mat: WD, z: z + 0.2, group: 'bolt', line: 'none' }, f(3.6, 2.2), f(head + 2, 2.2), WD.ramp[4]);
    d.poly({ mat: IR, z: z + 0.3, group: 'boltHead' }, [f(head + 5, 2.2), f(head + 1.6, 3.6), f(head + 1.6, 0.8)], { kind: 'bevel', w: 1 });
    d.pixels({ mat: GR, z: z + 0.25, group: 'boltFletch', line: 'none', outline: false }, [{ p: f(4.4, 3.2), c: GR.ramp[4] }, { p: f(5.6, 3.2), c: GR.ramp[3] }]);
  }
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

/**
 * Both hands on the crossbow: the near one on the grip at the point `up` along his
 * spine and `out` in front of it, the far one under the stock further along.
 */
function hold(base: Pose, ang: number, up: number, out: number, p: Record<string, number> = {}): Pose {
  const s = solve(base, D);
  const grip = s.T(up, out);
  return tweak(base, { armN: { ik: grip, bend: 1 }, armF: { ik: at(grip, ang, 11), bend: 1 }, p: { cbAng: ang, loaded: 1, span: 1, ...p } });
}

const STAND = pose({ torso: 86, head: 88, legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) }, p: {} });
/** At ease, the crossbow slanting up across his hip. */
const IDLE = hold(STAND, 16, 5, 8);

function idle(t: number): Pose {
  const b = Math.round((1 - Math.cos(t * Math.PI * 2)) / 2);
  return hold(tweak(STAND, { y: -b }), 16 - b, 5, 8);
}

/** Run: a brisk stride, the crossbow carried high at the port. */
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (sn > 0 ? 6.5 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return hold(pose({ y: bob - 1.5, torso: 78, head: 84, legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang, p: {} }), 44, 8, 7);
}

/** Feet set apart for a shot from the shoulder. */
const SHOOT = pose({ torso: 88, head: 90, legN: { ik: v(-9, 3) }, legF: { ik: v(8.5, 3) }, p: {} });
/** Down on his near knee, for the long aim. */
const KNEEL = pose({ y: -9, torso: 86, head: 90, legN: { ik: v(-13, 5) }, legF: { ik: v(9, 3) }, footN: -12, p: {} });

const AIM = 2;
const shoulder = (base: Pose, ang = AIM, p: Record<string, number> = {}) => hold(base, ang, 15.5, 8, p);
const fired = (base: Pose, ang: number) => hold(tweak(base, { x: -2 }), ang + 5, 16.5, 6.5, { loaded: 0, span: 0 });

const HURT = pose({ x: -4, y: -1, torso: 98, head: 104, legN: { ik: v(-11, 3) }, legF: { ik: v(7, 4) }, footF: 10, p: { grit: 1 } });
const HURT_HOLD = hold(HURT, 34, 5, 8, { grit: 1 });
const DEATH_KNEEL = pose({ y: -10, torso: 76, head: 62, legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -30, armN: { up: -96, lo: -86 }, armF: { up: -70, lo: -40 }, p: { drop: 1 } });
const DEATH_FALL = pose({ x: 2, y: -8, torso: 30, head: 16, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 }, p: { drop: 1 } });
const DEATH_DOWN = pose({ x: 6, y: -22, torso: 4, head: -2, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95, armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 }, p: { drop: 1 } });
/** Victory: the crossbow lifted high, a little flourish. */
const RAISE = hold(pose({ torso: 86, head: 92, legN: { ik: v(-7, 3) }, legF: { ik: v(7, 3) }, p: { grit: 1 } }), 66, 22, 7, { grit: 1 });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'crossbowman',
  name: 'Crossbowman',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 180, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    // Guild Shot: to the shoulder, a beat, the bolt away, a kick, and he winds a new one on
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, shoulder(SHOOT), 0.5), 80],
        [shoulder(SHOOT), 90],
        [shoulder(SHOOT, AIM, { grit: 1 }), 200],
        [fired(SHOOT, AIM), 90, { event: 'shoot', hit: true }],
        [fired(SHOOT, AIM + 3), 150],
        [hold(SHOOT, 24, 5, 8, { loaded: 0, span: 0 }), 110],
        [hold(SHOOT, 24, 5, 8), 110],
        [IDLE, 100],
      ]),
    },
    // Armour Breaker: down on one knee, a long steady aim, a heavy kick
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, shoulder(KNEEL), 0.4), 90],
        [shoulder(KNEEL, AIM + 4), 110],
        [shoulder(KNEEL, AIM), 180],
        [shoulder(KNEEL, AIM, { grit: 1 }), 320],
        [fired(KNEEL, AIM), 100, { event: 'shoot', hit: true }],
        [fired(tweak(KNEEL, { x: -2, torso: 92 }), AIM + 7), 170],
        [hold(KNEEL, 24, 5, 8, { loaded: 0, span: 0 }), 130],
        [mid(hold(KNEEL, 24, 5, 8), IDLE, 0.5), 110],
        [IDLE, 100],
      ]),
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT_HOLD, 90],
        [hold(tweak(HURT, { x: -3, torso: 95, head: 100 }), 30, 5, 8, { grit: 1 }), 110],
        [mid(HURT_HOLD, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT_HOLD, 120],
        [mid(HURT_HOLD, DEATH_KNEEL, 0.5), 110],
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
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** The crossbow, flat, pointing right. */
function iconBow(d: Draw, x: number, y: number) {
  d.ribbon({ mat: IR, z: 3, group: 'prod' }, [v(x + 17, y - 13), v(x + 21, y - 6), v(x + 22, y), v(x + 21, y + 6), v(x + 17, y + 13)], [0.9, 1.3, 1.6, 1.3, 0.9]);
  d.ribbon({ mat: WD, z: 4, group: 'stock' }, [v(x - 12, y - 2), v(x - 4, y - 1), v(x + 6, y), v(x + 23, y)], [3, 2.3, 1.8, 1.4]);
  d.line({ mat: GO, z: 4.2, group: 'stock', line: 'none' }, v(x - 9, y - 1), v(x + 8, y), GO.ramp[4]);
}

export const crossbowman: ChampionArt = {
  char,
  iconBg: GR,
  icons: {
    guild_shot: () =>
      compose(GR, glyph((d) => iconBow(d, 14, 20)), (b) => {
        speedLines(b, [[28, 14, 38, 14], [30, 20, 39, 20], [28, 26, 38, 26]], E.white);
      }),
    armour_breaker: () =>
      compose(BL, glyph((d) => {
        // a breastplate, a bolt driven through it
        d.poly({ mat: MAT.steel, z: 2, group: 'plate' }, [v(9, 33), v(31, 33), v(29, 14), v(20, 6), v(11, 14)], { kind: 'bevel', w: 1.6 });
        d.line({ mat: WD, z: 5, group: 'bolt', line: 'none' }, v(2, 24), v(22, 20), WD.ramp[4]);
        d.poly({ mat: IR, z: 6, group: 'head' }, [v(27, 19), v(21, 22.4), v(21, 18)], { kind: 'bevel', w: 1 });
      }), (b) => impactStar(b, 22, 19, 1, 8, 8, MAT.steel.ramp[3], E.white)),
    masters_eye: () =>
      compose(YE, glyph((d) => {
        // the hat with its feather
        d.poly({ mat: BL, z: 2, group: 'crown' }, [v(10, 16), v(11, 27), v(20, 30), v(29, 26), v(30, 16)], { kind: 'bevel', w: 1.6 });
        d.ribbon({ mat: BL, z: 3, group: 'brim' }, [v(4, 16), v(12, 13), v(28, 13), v(36, 16)], [1.2, 2, 2, 1.2]);
        d.ribbon({ mat: GR, z: 4, group: 'feather' }, [v(12, 18), v(6, 25), v(7, 33), v(14, 37)], [1, 2, 2, 0.8]);
      })),
  },
};
