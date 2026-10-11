// The Skirmisher (docs/DESIGN_DECISIONS.md section 12, Jakub's brief of
// 2026-10-11): a Common of the Azure Crown, a light-armoured man with a
// leather helmet and two short swords; his leather is blue and carries the
// Azure insignia; he must look weaker than the starters. So he is slighter
// than Captain Gareth: narrower in the shoulders, thinner in the limbs, plainer
// in his kit, his stance a little hunched. What the brief leaves open is a
// first take: the cut of the jerkin, the leather strips over the hips and the
// bracers, the helmet's cheek guards and seam, the insignia (the Crown's gold
// crown on an azure badge), his face, the swords' shape. His Bloom shows in
// his cuts (a leaf-green smear, the effects in fx/azure_crown.ts), never on
// the blades.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, leg, smear, sword, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 32,
  thigh: 15,
  shin: 14.5,
  ankleH: 3,
  footLen: 6.2,
  spine: 19.5,
  neck: 6.8,
  upperArm: 11.5,
  foreArm: 10.5,
  shoulderDrop: 4.6,
  shoulderN: -2.6,
  shoulderF: 3.2,
  hipN: -1.7,
  hipF: 1.7,
};

const SK = MAT.skinLight, BL = MAT.blueLeather, DL = MAT.darkleather, LE = MAT.leather, CH = MAT.charcoal, IR = MAT.iron, ST = MAT.steel, AZ = MAT.lapis, GD = MAT.gold, HR = MAT.hairDark;

/** Bloom in the cut: green-gold, white at its heart. */
const BLOOM = { core: ACCENT.leafCore, edge: ACCENT.smearLeaf };

/** Blade length from the hand: short swords. */
const BLADE = 19;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const prev = info.prev?.pose.p;

  // far leg and the far strip of the leather skirt
  leg(d, s, 'F', legCfg(10, -1));
  strip(d, s, 'F', 11, -1);

  // the far sword under the far hand, its smear, then the far arm
  if (info.def.smear && prev && P.smearF) smearOf(d, s.hF, prev.swordF, P.swordF, 12);
  blade(d, s.hF, P.swordF ?? 40, 18);
  arm(d, s, 'F', armCfg(20, -1));
  shoulder(d, s, 'F', 21, -1);

  // torso: a plain jerkin of blue leather, a seam down the front, belted
  const torso = torsoPts(s, [
    [0, 5.2, 5.4],
    [4, 5.3, 5.7],
    [9, 5.8, 6.4],
    [14, 6.2, 7.0],
    [17.2, 6.3, 6.6],
    [19, 5.0, 4.3],
    [20.4, 2.9, 2.4],
  ]);
  d.poly({ mat: BL, z: 30, group: 'jerkin', tex: (h) => (Math.sin(h.v * 6.5 + 0.8) > 0.82 ? -1 : 0) }, torso, { kind: 'cyl', a: s.T(0, 1), b: s.T(20.4, 1), r: 7.2, bevel: 1.2 });
  d.line({ mat: BL, z: 30.2, group: 'jerkin', line: 'none' }, s.T(5.4, 5.6), s.T(16.6, 6.6), BL.ramp[1]);
  // the insignia over the heart: the Crown's gold crown on an azure badge
  insignia(d, s, 30.5);
  // belt with an iron buckle
  d.poly({ mat: DL, z: 32, group: 'belt' }, [s.T(3.3, -5.6), s.T(3.5, 6.1), s.T(1.6, 5.9), s.T(1.4, -5.4)], { kind: 'cyl', a: s.T(0, 0), b: s.T(3.3, 0), r: 6 });
  d.poly({ mat: IR, z: 32.1, group: 'buckle' }, [s.T(3.6, 3.8), s.T(3.6, 6.3), s.T(1.3, 6.3), s.T(1.3, 3.8)], { kind: 'bevel', w: 1 });
  // the front strip of the skirt between the legs
  stripFront(d, s, 35);

  head(d, s, P);

  // near leg and its strip
  leg(d, s, 'N', legCfg(50, 0));
  strip(d, s, 'N', 52, 0);

  // the near sword, its smear, then the near arm over the grip
  if (info.def.smear && prev && !P.smearF) smearOf(d, s.hN, prev.swordN, P.swordN, 57);
  blade(d, s.hN, P.swordN ?? 30, 58);
  arm(d, s, 'N', armCfg(60, 0));
  shoulder(d, s, 'N', 62, 0);
}

const legCfg = (z: number, shade: number) => ({
  thigh: CH, shin: CH, foot: LE, rThigh: [3.9, 3.2] as [number, number], rShin: [2.9, 2.4] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: LE, from: 0.46, r: [3.1, 2.8] as [number, number], cuff: DL },
  thighTex: (h: { v: number }) => (Math.sin(h.v * 9) > 0.8 ? -1 : 0),
});

const armCfg = (z: number, shade: number) => ({
  upper: CH, fore: BL, hand: DL, rUp: [2.8, 2.5] as [number, number], rLo: [2.4, 2.1] as [number, number], rHand: 1.9, z, shade, cuff: BL,
});

/** A short sword: a straight blade to a point, a leather grip, a small iron guard and pommel. */
function blade(d: Draw, hand: V, ang: number, z: number) {
  sword(d, hand, ang, { blade: ST, guard: IR, grip: DL, pommel: IR, len: BLADE, width: 3.2, guardW: 2.1, gripLen: 3, z, group: 'sword' + Math.round(z) });
}

function smearOf(d: Draw, hand: V, from: number | undefined, to: number | undefined, z: number) {
  if (from === undefined || to === undefined) return;
  smear(d, hand, from, to, BLADE + 3, 8, BLOOM, z);
}

/** A small rounded leather shoulder guard. */
function shoulder(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  d.ellipse({ mat: BL, z, group: 'shoulder' + side, shade, line: 'soft' }, at(at(sh, up, 0.8), s.torso, 1), 3.7, 2.8, up + 90, 0.15);
}

/** A strip of blue leather over each thigh, from the belt to mid-thigh. */
function strip(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const hip = side === 'N' ? s.hipN : s.hipF;
  const th = side === 'N' ? s.thN : s.thF;
  const hang = s.torso < 55 ? th : th + (((-90 - th + 540) % 360) - 180) * 0.3;
  const a = at(hip, hang, -1.2), b = at(hip, hang, 7.8);
  d.poly(
    { mat: BL, z, group: 'strip' + side, shade },
    [at(a, hang + 90, 4.0), at(b, hang + 90, 4.3), at(b, hang - 90, 4.5), at(a, hang - 90, 4.0)],
    { kind: 'cyl', a, b, r: 4.5, bevel: 1 },
  );
  d.ribbon({ mat: BL, z: z + 0.05, group: 'strip' + side, shade: shade - 1, line: 'none' }, [at(at(b, hang + 90, 3.9), hang, -0.5), at(at(b, hang - 90, 4.1), hang, -0.5)], [0.6, 0.6]);
}

/** The front strip: hangs between the legs and swings with them. */
function stripFront(d: Draw, s: Skel, z: number) {
  const ang = Math.max(-116, Math.min(-64, (s.thN + s.thF) / 2));
  const f0 = s.T(1.6, -2), f1 = s.T(1.6, 5.6);
  const f2 = at(f1, ang + 5, 9.5), f3 = at(f0, ang - 3, 8.6);
  d.poly({ mat: BL, z, group: 'stripfront' }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 4.2, bevel: 1 });
}

/** The Azure Crown's insignia on the chest: an azure badge with a small gold crown. */
function insignia(d: Draw, s: Skel, z: number) {
  const c = s.T(13.4, 3.2);
  d.circle({ mat: AZ, z, group: 'badge', line: 'soft' }, c, 2.1);
  const f = d.frame(c, s.torso - 90);
  d.pixels({ mat: GD, z: z + 0.1, group: 'badge' }, [
    { p: f(-1, 0.8), c: GD.ramp[5] }, { p: f(1, 0.8), c: GD.ramp[4] },
    { p: f(-1, -0.3), c: GD.ramp[4] }, { p: f(0, -0.3), c: GD.ramp[4] }, { p: f(1, -0.3), c: GD.ramp[3] },
  ]);
}

/** The leather helmet: a rounded cap of blue leather, a darker brow band with rivets, a cheek guard over the ear, a seam over the crown. */
function helmet(d: Draw, s: Skel) {
  const H = s.H;
  d.poly(
    { mat: BL, z: 39, group: 'cap', line: 'soft' },
    [H(6.4, 2.8), H(5.2, 5.9), H(2.6, 8.0), H(-0.8, 8.6), H(-4.4, 7.7), H(-7.1, 5.0), H(-7.9, 1.4), H(-7.3, -1.5), H(-5.4, -1.1), H(-2.5, 1.5), H(1.6, 2.5)],
    { kind: 'dome', c: H(-0.6, 4), r: 8.6, bevel: 1.2 },
  );
  for (const [x, y] of [[3.8, 6.3], [1.9, 7.7], [-0.2, 8.3], [-2.4, 8.2], [-4.4, 7.3]] as const) d.pixels({ mat: BL, z: 39.1, group: 'cap' }, [{ p: H(x, y), c: BL.ramp[4] }]);
  d.ribbon({ mat: BL, z: 39.2, group: 'band', shade: -1 }, [H(6.6, 3.0), H(2.8, 2.4), H(-2.6, 1.3), H(-5.8, -0.6), H(-7.6, -1.3)], [1.2, 1.3, 1.3, 1.2, 1.0]);
  d.pixels({ mat: IR, z: 39.3, group: 'band' }, [{ p: H(4.4, 2.8), c: IR.ramp[4] }, { p: H(-0.2, 1.9), c: IR.ramp[4] }]);
  d.poly(
    { mat: BL, z: 39.25, group: 'cheek', line: 'soft' },
    [H(1.5, 2.1), H(2.2, -1.0), H(2.3, -4.0), H(1.0, -5.1), H(-1.3, -3.9), H(-2.4, -0.6), H(-2.2, 1.7)],
    { kind: 'dome', c: H(0, -1), r: 4.6, bevel: 0.8 },
  );
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'head' }, s.neck, H(0, -4), 2.9, 2.7);
  d.capsule({ mat: BL, z: 37.6, group: 'collar' }, s.T(19.7, -3.2), s.T(20.1, 2.6), 1.8, 1.6);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.grit ? 'angry' : 'flat', mouth: P.shout ? 'shout' : 'line', lip: SK.ramp[1], rx: 5.8, ry: 6.4 });
  // dark hair at the nape under the cap
  d.poly({ mat: HR, z: 38.7, group: 'nape', shade: -1 }, [H(-6.4, -0.8), H(-5.0, -3.2), H(-3.3, -2.8), H(-3.6, -0.4)], { kind: 'flat', n: [0, 0, 1] });
  helmet(d, s);
}

// ---------------------------------------------------------------------------
// Poses & animations (sword angles are absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -2,
  torso: 77,
  head: 82,
  legN: { ik: v(-10, 3) },
  legF: { ik: v(9, 3) },
  armN: { up: -58, lo: -12 },
  armF: { up: -80, lo: 16 },
  p: { swordN: 24, swordF: 56 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -2 - b,
    torso: 77 - b,
    armN: { up: -58 + b * 2, lo: -12 + b * 3 },
    armF: { up: -80 + b * 2, lo: 16 + b * 2 },
    p: { swordN: 24 - b * 3, swordF: 56 - b * 2 },
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
  const sw = Math.cos(a);
  return pose({
    y: bob - 3,
    torso: 68,
    head: 78,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -104 + sw * 24, lo: -70 + sw * 24 },
    armF: { up: -78 - sw * 28, lo: -48 - sw * 28 },
    p: { swordN: -150 + sw * 16, swordF: -140 - sw * 16 },
  });
}

// Twin Cut: the near sword cuts high to low, then the far sword cuts back low to high.
const TC_WIND = pose({
  x: -2, y: -2, torso: 90, head: 86,
  legN: { ik: v(-11, 3) }, legF: { ik: v(8, 3) },
  armN: { up: 108, lo: 132 }, armF: { up: -66, lo: 12 },
  p: { swordN: 146, swordF: 48 },
});
const TC_CUT1 = pose({
  x: 7, y: -5, torso: 66, head: 76,
  legN: { ik: v(-9, 3) }, legF: { ik: v(14, 3) },
  armN: { up: -8, lo: -30 }, armF: { up: -140, lo: -122 },
  p: { swordN: -38, swordF: -146, grit: 1 },
});
const TC_SWITCH = tweak(TC_CUT1, { x: 8, torso: 64, armN: { up: -36, lo: -64 }, armF: { up: -156, lo: -140 }, p: { swordN: -80, swordF: -158 } });
const TC_CUT2 = pose({
  x: 9, y: -5, torso: 70, head: 78,
  legN: { ik: v(-8, 3) }, legF: { ik: v(15, 3) },
  armN: { up: -118, lo: -86 }, armF: { up: 22, lo: 46 },
  p: { swordN: -132, swordF: 62, smearF: 1, shout: 1 },
});
const TC_FOLLOW = tweak(TC_CUT2, { x: 10, torso: 72, armF: { up: 38, lo: 70 }, p: { swordF: 94, smearF: 0, shout: 0, grit: 1 } });

const HURT = pose({
  x: -4, y: -2, torso: 100, head: 106,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -126, lo: -96 }, armF: { up: -60, lo: 12 },
  p: { swordN: -118, swordF: 70, grit: 1 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -13, torso: 76, head: 60,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60,
  armN: { up: -90, lo: -88 }, armF: { up: -80, lo: -66 },
  p: { swordN: -94, swordF: -100 },
});
const DEATH_FALL = pose({
  x: 2, y: -20, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { swordN: -30, swordF: -20 },
});
const DEATH_DOWN = pose({
  x: 6, y: -26, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { swordN: 10, swordF: -12 },
});

// Victory: a quick twirl of the near sword, then both blades crossed before the chest.
const CROSSED = pose({
  y: -1, torso: 86, head: 88,
  legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) },
  armN: { up: -36, lo: 70 }, armF: { up: -48, lo: 64 },
  p: { swordN: 112, swordF: 64 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'skirmisher',
  name: 'Skirmisher',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 140, idle) },
    run: { loop: true, frames: cycle(8, 70, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TC_WIND, 1, 70),
        ...keys([
          [TC_WIND, 130],
          [mid(TC_WIND, TC_CUT1, 0.45), 40],
          [TC_CUT1, 60, { smear: true, hit: true }],
          [TC_SWITCH, 90],
          [mid(TC_SWITCH, TC_CUT2, 0.45), 40],
          [TC_CUT2, 60, { smear: true, hit: true }],
          [TC_FOLLOW, 180],
        ]),
        ...tween(D, TC_FOLLOW, IDLE, 2, 90, ease.inOut),
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
        [tweak(DEATH_DOWN, { y: -27 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...keys([
          [tweak(IDLE, { p: { swordN: 120 } }), 70],
          [tweak(IDLE, { p: { swordN: 210 } }), 70],
          [tweak(IDLE, { p: { swordN: 300 } }), 70],
        ]),
        ...tween(D, IDLE, CROSSED, 2, 90, ease.out),
        ...keys([
          [CROSSED, 700],
          [mid(CROSSED, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icon
// ---------------------------------------------------------------------------

/** A short sword in an icon: the sprite's sword, scaled up for 40x40. */
function iconBlade(d: Draw, hilt: V, ang: number, z: number, len = 24) {
  const f = d.frame(hilt, ang);
  const g = 'iblade' + z;
  d.capsule({ mat: DL, z, group: g, tex: (h) => (Math.floor(h.u * 5) % 2 ? 1 : 0) }, f(-4.6, 0), f(2.6, 0), 1.7, 1.7);
  d.circle({ mat: IR, z: z + 0.05, group: g }, f(-6, 0), 2.2);
  d.poly({ mat: ST, z: z + 0.1, group: g }, [f(4, -2.9), f(len - 6, -2.7), f(len, 0), f(len - 6, 2.7), f(4, 2.9)], { kind: 'cyl', a: f(4, 0), b: f(len, 0), r: 3.4 });
  d.capsule({ mat: IR, z: z + 0.2, group: g }, f(3.6, -4.4), f(3.6, 4.4), 1.4, 1.4);
}

const E = ACCENT;

export const skirmisher: ChampionArt = {
  char,
  iconBg: BL,
  icons: {
    twin_cut: () =>
      compose(BL, glyph((d) => {
        // two cuts, one from each sword: down, then back up
        smear(d, v(15, 16), 150, -40, 17, 5, BLOOM, 1);
        smear(d, v(25, 24), -150, 40, 17, 5, BLOOM, 2);
        iconBlade(d, v(7, 8), 42, 10, 22);
        iconBlade(d, v(33, 33), -138, 11, 22);
      }), (b) => {
        for (const [x, y] of [[34, 7], [36, 10], [31, 5], [5, 31], [8, 34]]) b.set(x, y, E.leafCore);
      }),
  },
};
