// The Town Guard (Jakub's brief, docs/DESIGN_DECISIONS.md section 41,
// 2026-10-31): a Common Tank of the Azure Crown in light armour, a sword and a
// round shield, boots, no helmet, long blonde hair. Built on the Lineholder's
// rig, plainer and lighter: a padded blue tabard over a leather jerkin with
// the Crown's small gold crown on the chest, leather sleeves and bracers,
// charcoal breeches and tall brown boots; a plain round shield of wooden
// planks with an iron rim and boss on the far arm; a straight arming sword in
// the near hand; straight blonde hair to the shoulders, an ordinary face. He
// must not read as the Paladin (silver plate, cloak, cross shield). Watch Cut
// leaves a plain white streak; Shield Check drives the rim forward into a dull
// flash. His affinity (Ember) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { arm, leg, smear, sword, torsoPts } from '../parts.ts';
import { at, dir, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 33,
  thigh: 15.6,
  shin: 15,
  ankleH: 3,
  footLen: 6.6,
  spine: 21.4,
  neck: 6.4,
  upperArm: 12.4,
  foreArm: 11.4,
  shoulderDrop: 4.6,
  shoulderN: -3.4,
  shoulderF: 4.0,
  hipN: -2.2,
  hipF: 2.2,
};

const SK = MAT.skinLight, CH = MAT.charcoal, TB = MAT.blue, LE = MAT.leather, DL = MAT.darkleather, IR = MAT.iron, ST = MAT.steel, GD = MAT.gold, WD = MAT.wood, HR = MAT.hairBlonde;

/** The streak of a cut: plain white with the light of the steel, the colour of motion, not of an affinity. */
const SWING = { core: ACCENT.white, edge: MAT.steel.ramp[4] };

/** Blade length from the hand: an arming sword. */
const BLADE = 21;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const prev = info.prev?.pose.p;

  // the long hair falls behind the head and the neck
  hairBack(d, s, 8);

  // far leg and the far panel of the tabard
  leg(d, s, 'F', legCfg(10, -1));
  panel(d, s, 'F', 11, -1);

  // the far arm carries the shield; its hand is hidden behind it
  arm(d, s, 'F', armCfg(20, -1));

  // torso: a leather jerkin under a padded blue tabard
  const torso = torsoPts(s, [
    [0, 6.4, 6.6],
    [4, 6.6, 7.2],
    [9, 7.2, 8.0],
    [14, 7.6, 8.6],
    [17.4, 7.6, 8.0],
    [19.6, 6.2, 5.6],
    [21.0, 3.6, 3.0],
  ]);
  d.poly({ mat: LE, z: 30, group: 'jerkin' }, torso, { kind: 'cyl', a: s.T(0, 1), b: s.T(21, 1), r: 8.4, bevel: 1.2 });
  // the tabard: a padded front panel from the collar to below the belt, quilted in rows
  d.poly(
    { mat: TB, z: 30.5, group: 'tabard', tex: (h) => (Math.sin(h.v * 30) > 0.88 ? -1 : 0) },
    [s.T(19.4, -1.6), s.T(19.6, 7.4), s.T(14, 8.4), s.T(4, 7.2), s.T(-1, 7.0), s.T(-1, -1.2), s.T(9, -2.4)],
    { kind: 'cyl', a: s.T(-1, 3), b: s.T(19.6, 3), r: 8.4, bevel: 1 },
  );
  // the leather collar at the neck
  d.capsule({ mat: LE, z: 30.6, group: 'collar' }, s.T(20.2, -4.4), s.T(20.8, 4.0), 1.4, 1.3);
  // the Crown's small gold crown on the chest
  crown(d, s.T(14, 4.2), s.torso, 30.8);
  // belt with an iron buckle
  d.poly({ mat: DL, z: 32, group: 'belt' }, [s.T(4.4, -6.8), s.T(4.6, 7.8), s.T(2.4, 7.6), s.T(2.2, -6.6)], { kind: 'cyl', a: s.T(2, 0), b: s.T(4.4, 0), r: 7.4 });
  d.poly({ mat: IR, z: 32.1, group: 'buckle' }, [s.T(4.8, 4.6), s.T(4.8, 7.6), s.T(2.0, 7.6), s.T(2.0, 4.6)], { kind: 'bevel', w: 1 });
  panelFront(d, s, 35);

  head(d, s, P);

  // the shield before the body
  shield(d, s, P.shieldAng ?? 92, 45, !!P.back);

  // near leg and its panel
  leg(d, s, 'N', legCfg(50, 0));
  panel(d, s, 'N', 52, 0);

  // near arm, the sword under the hand
  const ang = P.swordAng ?? 24;
  if (info.def.smear && prev && prev.swordAng !== undefined) smear(d, s.hN, prev.swordAng, ang, BLADE + 3, 8, SWING, 56);
  blade(d, s.hN, ang, 57);
  arm(d, s, 'N', armCfg(58, 0));
}

const legCfg = (z: number, shade: number) => ({
  thigh: CH, shin: CH, foot: LE, rThigh: [4.4, 3.6] as [number, number], rShin: [3.2, 2.7] as [number, number], z, shade, footStyle: 'boot' as const,
  // tall boots, to below the knee
  boot: { mat: LE, from: 0.18, r: [3.5, 3.1] as [number, number], cuff: DL },
});

// leather sleeves, dark leather bracers at the wrists; the far hand is behind the shield
const armCfg = (z: number, shade: number) => ({
  upper: LE, fore: LE, hand: SK, rUp: [3.3, 2.9] as [number, number], rLo: [2.8, 2.4] as [number, number], rHand: 2.1, z, shade, cuff: DL,
});

/** A panel of the tabard's skirt over each thigh, blue with a darker hem. */
function panel(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  // cloth hangs halfway between the thigh and straight down (or along the body once he falls)
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.35;
  const a = at(hip, hang, -1.2), b = at(hip, hang, 8.6);
  d.poly(
    { mat: TB, z, group: 'panel' + side, shade },
    [at(a, hang + 90, 4.4), at(b, hang + 90, 5.0), at(b, hang - 90, 5.2), at(a, hang - 90, 4.4)],
    { kind: 'cyl', a, b, r: 5.2, bevel: 1 },
  );
  d.ribbon({ mat: TB, z: z + 0.05, group: 'panel' + side, shade: shade - 1, line: 'none' }, [at(at(b, hang + 90, 4.6), hang, -0.6), at(at(b, hang - 90, 4.8), hang, -0.6)], [0.7, 0.7]);
}

/** The front of the tabard below the belt: hangs between the legs and swings with them. */
function panelFront(d: Draw, s: Skel, z: number) {
  const ang = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  const f0 = s.T(1.6, -1.6), f1 = s.T(1.6, 7.0);
  const f2 = at(f1, ang + 6, 10.5), f3 = at(f0, ang - 3, 9.8);
  d.poly({ mat: TB, z, group: 'panelfront' }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 4.8, bevel: 1 });
  d.ribbon({ mat: TB, z: z + 0.05, group: 'panelfront', shade: -1, line: 'none' }, [lerpV(f3, f2, 0.06), lerpV(f3, f2, 0.94)], [0.7, 0.7]);
}

/** A small gold crown (the Azure Crown's): three points over a band, snapped to a quarter turn so the pixels stay crisp. */
function crown(d: Draw, center: V, torso: number, z: number) {
  const q = Math.round((torso - 90) / 90) * 90;
  const up = dir(q + 90), right = dir(q);
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const P = (x: number, y: number) => v(c.x + Math.round(right.x) * x + Math.round(up.x) * y, c.y + Math.round(right.y) * x + Math.round(up.y) * y);
  const g = GD.ramp;
  const px: { p: V; c: (typeof g)[number] }[] = [];
  for (const x of [-1, 1]) px.push({ p: P(x, 1), c: g[4] });
  for (let x = -1; x <= 1; x++) px.push({ p: P(x, 0), c: x < 1 ? g[4] : g[3] });
  d.pixels({ mat: GD, z, group: 'crest' }, px);
}

/**
 * The round shield: planks of plain wood in an iron rim, an iron boss at its
 * heart. Strapped to the far forearm and held before the body, its face turned
 * a little away, so it reads as an upright oval.
 */
function shield(d: Draw, s: Skel, ang: number, z: number, back = false) {
  shieldAt(d, at(lerpV(s.eF, s.hF, 0.5), s.torso - 90, 1.6), ang, z, back);
}

function shieldAt(d: Draw, c: V, ang: number, z: number, back = false, R = 11) {
  const K = 0.8; // the face is turned a little away: narrower across
  d.ellipse({ mat: IR, z, group: 'shield', line: 'soft' }, c, R * K, R, ang - 90);
  const f = d.frame(c, ang);
  const inner = R - 1.6;
  const pts: V[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    pts.push(f(Math.cos(a) * inner, Math.sin(a) * inner * K));
  }
  // the planks run up and down the face; their seams are dark lines across it
  const planks = (h: { u: number }, x: number, y: number) => (Math.abs(((h.u * 3.4) % 1) - 0.5) > 0.44 ? -2 : (x * 7 + y * 13) % 31 === 0 ? -1 : 0);
  d.poly({ mat: WD, z: z + 0.1, group: 'shield', line: 'none', tex: back ? undefined : planks }, pts, { kind: 'dome', c: f(2, R * 0.2), r: R * 2, bevel: 1 });
  if (back) {
    // fallen face down: two leather straps across the bare planks
    for (const u of [3, -3]) d.capsule({ mat: DL, z: z + 0.2, group: 'shield' }, f(u, -inner * K * 0.8), f(u, inner * K * 0.8), 0.9, 0.9);
    return;
  }
  d.circle({ mat: IR, z: z + 0.2, group: 'shield' }, f(0.3, 0), 2.6);
  d.pixels({ mat: IR, z: z + 0.25, group: 'shield' }, [{ p: f(1.2, -0.6), c: IR.ramp[5] }]);
  // rivets round the rim
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    d.pixels({ mat: IR, z: z + 0.15, group: 'shield' }, [{ p: f(Math.cos(a) * (R - 0.8), Math.sin(a) * (R - 0.8) * K), c: IR.ramp[5] }]);
  }
}

/** The arming sword: a straight blade to a point, a cross guard, a leather grip, an iron pommel. */
function blade(d: Draw, hand: V, ang: number, z: number) {
  sword(d, hand, ang, { blade: ST, guard: IR, grip: DL, pommel: IR, len: BLADE, width: 3.0, guardW: 3.2, gripLen: 3.4, z, group: 'sword' });
}

/** The hair that falls behind: straight, to the shoulders. */
function hairBack(d: Draw, s: Skel, z: number) {
  const H = s.H;
  d.poly(
    { mat: HR, z, group: 'hairback', line: 'soft', tex: (h) => (Math.sin(h.v * 26) > 0.7 ? -1 : 0) },
    [H(-2.0, 6.4), H(-6.8, 5.0), H(-8.6, 0.6), H(-9.4, -6.0), H(-9.6, -12.4), H(-6.6, -13.6), H(-3.4, -12.6), H(-2.0, -7.0)],
    { kind: 'dome', c: H(-6, -3), r: 10, bevel: 1 },
  );
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 3.1, 2.9);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[2], browStyle: P.shout ? 'angry' : 'flat', mouth: P.shout ? 'shout' : 'line', lip: SK.ramp[1], rx: 6.0, ry: 6.6 });
  // the crown of the head and a fringe swept to the side, the locks over the ear
  d.poly(
    { mat: HR, z: 39, group: 'hair', line: 'soft', tex: (h) => (Math.sin(h.u * 20) > 0.75 ? -1 : 0) },
    [H(6.4, 3.0), H(5.2, 6.6), H(1.6, 8.6), H(-3.0, 8.6), H(-6.6, 6.2), H(-7.6, 1.4), H(-6.6, -4.4), H(-4.0, -5.0), H(-3.4, 0.6), H(-0.6, 3.4), H(3.2, 3.8)],
    { kind: 'dome', c: H(-0.6, 3.6), r: 8.4, bevel: 1 },
  );
  d.pixels({ mat: HR, z: 39.1, group: 'hair' }, [{ p: H(-2.6, 7.2), c: HR.ramp[5] }, { p: H(1.4, 7.6), c: HR.ramp[5] }, { p: H(-4.8, 5.4), c: HR.ramp[4] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations (sword and shield angles are absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 82,
  head: 85,
  legN: { ik: v(-10, 3) },
  legF: { ik: v(10, 3) },
  armN: { up: -62, lo: -10 },
  armF: { up: -70, lo: 42 },
  p: { swordAng: 30, shieldAng: 93 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 82 - b,
    armN: { up: -62 + b * 2, lo: -10 + b * 2 },
    armF: { up: -70 + b * 2, lo: 42 + b },
    p: { swordAng: 30 - b * 3, shieldAng: 93 },
  });
}

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
    y: bob - 2,
    torso: 72,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -96 + sw * 18, lo: -60 + sw * 18 },
    armF: { up: -60 - sw * 6, lo: 30 },
    p: { swordAng: -140 + sw * 12, shieldAng: 96 },
  });
}

// Watch Cut: the shield stays up; the sword comes up over his shoulder and down.
const WC_WIND = pose({
  x: -2, y: -2, torso: 92, head: 88,
  legN: { ik: v(-12, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 112, lo: 150 }, armF: { up: -66, lo: 34 },
  p: { swordAng: 160, shieldAng: 94 },
});
const WC_STRIKE = pose({
  x: 8, y: -4, torso: 70, head: 78,
  legN: { ik: v(-10, 3) }, legF: { ik: v(15, 3) },
  armN: { up: 2, lo: -22 }, armF: { up: -78, lo: 22 },
  p: { swordAng: -40, shieldAng: 98, shout: 1 },
});
const WC_FOLLOW = tweak(WC_STRIKE, { x: 9, torso: 68, armN: { up: -18, lo: -46 }, p: { swordAng: -74, shout: 0 } });

// Shield Check: he draws the shield in to his chest, then drives its rim forward with his whole weight.
const SC_DRAW = pose({
  x: -3, y: -2, torso: 90, head: 88,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) },
  armN: { up: -96, lo: -60 }, armF: { up: -88, lo: 60 },
  p: { swordAng: -130, shieldAng: 96 },
});
const SC_DRIVE = pose({
  x: 10, y: -4, torso: 66, head: 74,
  legN: { ik: v(-14, 3) }, legF: { ik: v(14, 3) }, footN: -8,
  armN: { up: -110, lo: -80 }, armF: { up: -14, lo: 6 },
  p: { swordAng: -140, shieldAng: 84, shout: 1 },
});
const SC_FOLLOW = tweak(SC_DRIVE, { x: 11, torso: 68, armF: { up: -22, lo: 4 }, p: { shout: 0 } });

const HURT = pose({
  x: -4, y: -1, torso: 98, head: 104,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -110, lo: -70 }, armF: { up: -82, lo: 50 },
  p: { swordAng: -100, shieldAng: 100 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -10, torso: 76, head: 62,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -30,
  armN: { up: -90, lo: -80 }, armF: { up: -76, lo: -40 },
  p: { swordAng: -60, shieldAng: 80 },
});
const DEATH_FALL = pose({
  x: 2, y: -8, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { swordAng: -20, shieldAng: 30, back: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -16, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { swordAng: 4, shieldAng: -2, back: 1 },
});

// Victory: the sword raised high, the shield held before him.
const RAISED = pose({
  y: -1, torso: 88, head: 94,
  legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) },
  armN: { up: 98, lo: 92 }, armF: { up: -66, lo: 40 },
  p: { swordAng: 90, shieldAng: 92, shout: 1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'town_guard',
  name: 'Town Guard',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 160, idle) },
    run: { loop: true, frames: cycle(8, 75, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, WC_WIND, 1, 80),
        ...keys([
          [WC_WIND, 170],
          [mid(WC_WIND, WC_STRIKE, 0.5), 45],
          [WC_STRIKE, 65, { smear: true, hit: true }],
          [WC_FOLLOW, 180],
        ]),
        ...tween(D, WC_FOLLOW, IDLE, 2, 100, ease.inOut),
      ],
    },
    attack2: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SC_DRAW, 1, 80),
        ...keys([
          [SC_DRAW, 170],
          [mid(SC_DRAW, SC_DRIVE, 0.5), 45],
          [SC_DRIVE, 80, { hit: true }],
          [SC_FOLLOW, 200],
        ]),
        ...tween(D, SC_FOLLOW, IDLE, 2, 110, ease.inOut),
      ],
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
        [DEATH_KNEEL, 260],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -16.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RAISED, 2, 100, ease.out),
        ...keys([
          [RAISED, 700],
          [mid(RAISED, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** The arming sword in an icon, scaled up for 40x40. */
function iconBlade(d: Draw, hilt: V, ang: number, z: number, len = 26) {
  const f = d.frame(hilt, ang);
  const g = 'iblade' + z;
  d.capsule({ mat: DL, z, group: g, tex: (h) => (Math.floor(h.u * 5) % 2 ? 1 : 0) }, f(-5, 0), f(2.4, 0), 1.7, 1.7);
  d.circle({ mat: IR, z: z + 0.05, group: g }, f(-6.6, 0), 2.2);
  d.poly({ mat: ST, z: z + 0.1, group: g }, [f(4, -2.6), f(len - 5, -2.4), f(len, 0), f(len - 5, 2.4), f(4, 2.6)], { kind: 'cyl', a: f(4, 0), b: f(len, 0), r: 3.2 });
  d.capsule({ mat: IR, z: z + 0.2, group: g }, f(3.4, -5.6), f(3.4, 5.6), 1.4, 1.4);
}

const E = ACCENT;

export const townGuard: ChampionArt = {
  char,
  iconBg: TB,
  icons: {
    watch_cut: () =>
      compose(TB, glyph((d) => {
        // one plain cut, from high to low
        smear(d, v(14, 14), 150, -40, 20, 5, SWING, 1);
        iconBlade(d, v(7, 8), 42, 10);
      }), (b) => {
        for (const [x, y] of [[34, 7], [36, 10], [31, 5]]) b.set(x, y, E.white);
      }),
    shield_check: () =>
      compose(TB, glyph((d) => {
        // the round shield driven forward, rim first
        shieldAt(d, v(15, 20), 92, 10, false, 13);
      }), (b) => {
        // and the rim lands: a dull white flash and dust (screen space, y down)
        impactStar(b, 31, 18, 2, 9, 8, FXR.dust[3], E.white);
        for (const [x, y, k] of [[36, 12, 3], [37, 24, 2], [33, 27, 3], [38, 17, 4]] as const) b.set(x, y, FXR.dust[k]);
      }),
  },
};
