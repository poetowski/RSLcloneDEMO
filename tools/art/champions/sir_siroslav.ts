// Sir Siroslav (docs/DESIGN_DECISIONS.md section 64, Jakub's brief of
// 2026-11-01: name, Sanguine Dominion, Support, Elite, "be very creative and
// consistent"): a winged knight-commander. A crimson coat to the calf under a
// black breastplate with the Dominion's red hexagon, a black sash; brown riding
// boots; a tall cap of black fur with a crimson crown, a gold brooch and a white
// heron's plume; a long grey moustache hanging past his chin. Rising from his
// back, a pair of wooden frames hung with crimson and black feathers, curving up
// over his head (the silhouette feature); in his near hand a commander's mace, a
// round ribbed head of gold on a short haft. Sanguine is life (DESIGN_DECISIONS.md
// 3.2): nothing grim about him. His affinity (Ember) sets nothing here (Jakub,
// 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { arm, foldTex, leg, robe, RobeCfg, torsoPts } from '../parts.ts';
import { add, at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 33,
  thigh: 16,
  shin: 15.6,
  ankleH: 3,
  footLen: 6,
  spine: 21,
  neck: 5.4,
  upperArm: 12.6,
  foreArm: 11.6,
  shoulderDrop: 3.8,
  shoulderN: -3.0,
  shoulderF: 3.2,
  hipN: -1.8,
  hipF: 1.8,
};

const SK = MAT.skinLight, CR = MAT.crimson, PL = MAT.darksteel, HX = MAT.crimsonPlate, SA = MAT.blackCloth, BT = MAT.leather, MU = MAT.hairSilver, WD = MAT.wood, FR = MAT.red, FB = MAT.blackCloth, GD = MAT.gold;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;
  const flare = P.flare ?? 0;

  // the wings rise from his back, behind everything
  wing(d, s, -3.4, 1, -1, flare, wave + 1.2);
  wing(d, s, 0, 2, 0, flare, wave);

  leg(d, s, 'F', legCfg(10, -1));
  arm(d, s, 'F', armCfg(16, -1));
  sleeve(d, s.sF, s.eF, 16.6, -1, 'F');

  coatSkirt(d, s, wave, 22);
  leg(d, s, 'N', legCfg(24, 0));
  body(d, s, 30);
  head(d, s, P);

  // the mace in his near hand, then the hand over it
  if (P.drop) mace(d, v(18, 3.6), -6, 54, 0.5);
  else mace(d, s.hN, P.mace ?? -60, 56, 1);
  arm(d, s, 'N', armCfg(60, 0));
  sleeve(d, s.sN, s.eN, 60.6, 0, 'N');
}

// ---------------------------------------------------------------------------
// the body and his clothes
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: CR, shin: CR, foot: BT, rThigh: [4.6, 3.8] as [number, number], rShin: [3.4, 2.9] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: BT, from: 0.1, r: [3.8, 3.3] as [number, number], cuff: BT },
});

const armCfg = (z: number, shade: number) => ({
  upper: CR, fore: CR, hand: SK, rUp: [3.2, 2.8] as [number, number], rLo: [2.8, 2.4] as [number, number], rHand: 2.3, z, shade, cuff: PL,
});

/** A lame of black plate over the shoulder. */
function sleeve(d: Draw, sh: V, el: V, z: number, shade: number, side: string) {
  const end = lerpV(sh, el, 0.48);
  d.capsule({ mat: PL, z, group: 'pauldron' + side, shade }, at(sh, 90, 0.4), end, 3.4, 3.0);
  const ang = (Math.atan2(el.y - sh.y, el.x - sh.x) * 180) / Math.PI;
  d.line({ mat: GD, z: z + 0.05, group: 'pauldron' + side, line: 'none' }, at(end, ang + 90, 3), at(end, ang - 90, 3), GD.ramp[3 + (shade < 0 ? -1 : 0)]);
}

const SKIRT: RobeCfg = { waist: [1.6, 5.8, 7.0], hemDrop: -9, hemFloor: 9, hemBack: [5.4, 4.6], hemFront: [4.4, 3.6], midBack: [3.8, 3.4], midFront: [3.2, 2.4], ripple: 0.5 };

/** The crimson coat from the waist to the calf, open over the boots at the front. */
function coatSkirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, SKIRT, wave);
  d.poly({ mat: CR, z, group: 'coat', tex: foldTex(8, wave * 0.4, 0.62) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  // a gold braid along the coat's front edge
  d.line({ mat: CR, z: z + 0.1, group: 'coat', line: 'none' }, r.waistF, r.hemF, GD.ramp[3]);
}

/** The coat, the black breastplate over it with the red hexagon, the black sash at the waist. */
function body(d: Draw, s: Skel, z: number) {
  const coat = torsoPts(s, [
    [0, 5.8, 7.0],
    [5, 5.6, 7.4],
    [10, 6.0, 8.2],
    [14.6, 6.6, 8.4],
    [18, 6.6, 7.0],
    [20.4, 4.8, 3.8],
    [21.6, 2.6, 2.0],
  ]);
  d.poly({ mat: CR, z, group: 'coatTop', tex: foldTex(6, 0.6, 0.75) }, coat, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(21, 0.6), r: 7.6, bevel: 1.3 });
  // the breastplate: from the sash to the collar, rounded at the front
  const plate = [s.T(3.4, -4.6), s.T(3.4, 7.4), s.T(8, 8.6), s.T(13.2, 8.6), s.T(16.4, 7.0), s.T(18.0, 3.6), s.T(18.2, -2.4), s.T(16, -5.4), s.T(10, -5.6)];
  d.poly({ mat: PL, z: z + 0.3, group: 'plate' }, plate, { kind: 'dome', c: s.T(12, 4.4), r: 9, bevel: 1.4 });
  d.ribbon({ mat: GD, z: z + 0.35, group: 'plateRim', line: 'none' }, [s.T(18.0, 3.6), s.T(16.4, 7.0), s.T(13.2, 8.6), s.T(8, 8.6), s.T(3.6, 7.4)], [0.5, 0.5, 0.5, 0.5, 0.5]);
  // the Dominion's red hexagon on the chest
  const c = s.T(12.2, 4.6);
  const hex: V[] = [];
  for (let k = 0; k < 6; k++) hex.push(add(c, v(Math.cos((k / 6) * Math.PI * 2) * 2.8, Math.sin((k / 6) * Math.PI * 2) * 2.8)));
  d.poly({ mat: HX, z: z + 0.4, group: 'hex' }, hex, { kind: 'bevel', w: 0.8 });
  // the black sash
  d.poly({ mat: SA, z: z + 0.5, group: 'sash' }, [s.T(3.6, -5.8), s.T(3.6, 7.6), s.T(0.4, 7.4), s.T(0.4, -5.8)], { kind: 'cyl', a: s.T(3.6, 0), b: s.T(0.4, 0), r: 7.4, bevel: 0.8 });
  d.ribbon({ mat: SA, z: z + 0.55, group: 'sashEnd', line: 'soft' }, [s.T(2, 7), at(s.T(2, 7), -100, 5), at(s.T(2, 7), -96, 8)], [1.4, 1.2, 0.9]);
}

/** The head: a tall fur cap with a jewelled plume, a long grey moustache hanging past the chin. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.4, group: 'neck' }, s.neck, H(0.2, -4), 3.0, 2.8);
  face(d, s, { skin: SK, z: 38, brow: MU.ramp[2], browStyle: P.shout ? 'angry' : 'flat', mouth: P.shout ? 'shout' : 'none', rx: 6.2, ry: 6.8 });
  // the kolpak: a tall cap of black fur from the brow, a crimson crown bulging from its top,
  // a gold brooch at the front with a red stone, a white heron's plume rising from it and sweeping back
  d.poly({ mat: MAT.crimson, z: 38.5, group: 'capTop' }, [H(3.4, 9.6), H(1.2, 12.4), H(-3.6, 12.6), H(-6.4, 10.4), H(-5.6, 8.6), H(1.6, 8.8)], { kind: 'dome', c: H(-1.6, 10), r: 6, bevel: 1 });
  d.poly({ mat: MAT.furBlack, z: 38.6, group: 'cap', tex: (h) => (Math.sin(h.u * 9 + h.v * 7) > 0.5 ? 1 : 0) }, [H(6.2, 3.0), H(5.4, 10.0), H(-0.4, 11.0), H(-6.4, 9.8), H(-7.6, 4.4), H(-6.8, 1.0), H(-1.2, 2.4)], { kind: 'cyl', a: H(-1, 1.6), b: H(-1, 10.6), r: 7, bevel: 1.2 });
  const br = H(4.6, 6.4);
  const sway = P.flare ? -8 * P.flare : 0;
  d.ribbon({ mat: MAT.whiteCloth, z: 38.65, group: 'plume', line: 'soft' }, [br, H(3.4, 12), H(0.6, 17.6), H(-4 + sway * 0.2, 21)], [1.0, 1.3, 1.1, 0.5]);
  d.circle({ mat: GD, z: 38.7, group: 'brooch' }, br, 1.5);
  d.pixels({ mat: GD, z: 38.75, group: 'stone', outline: false, line: 'none' }, [{ p: br, c: MAT.red.ramp[4] }]);
  // the moustache: from under the nose, down past the chin on either side
  const m0 = H(5.6, -2.2);
  d.ribbon({ mat: MU, z: 38.8, group: 'moustache', line: 'soft' }, [m0, H(4.4, -3.6), H(3.0, -6.4), H(2.6, -9.6)], [1.2, 1.3, 1.0, 0.6]);
  d.ribbon({ mat: MU, z: 38.75, group: 'moustacheF', line: 'soft', shade: -1 }, [m0, H(6.8, -3.4), H(7.0, -6.4), H(6.4, -9.0)], [1.1, 1.1, 0.9, 0.5]);
}

// ---------------------------------------------------------------------------
// the wings and the mace
// ---------------------------------------------------------------------------

/** The rod of one wing from his back plate, up over his head and curling forward: [back, up] from the base. */
const ROD: [number, number][] = [[0, 0], [-2.6, 10], [-3.6, 20], [-3.0, 30], [-0.6, 38], [3.4, 43]];

/**
 * One wing: a wooden rod rising from the back plate and curling forward over
 * his head, hung along its back edge with feathers, crimson and black in turn.
 * `flare` sweeps it back and spreads the feathers; `wave` stirs them.
 */
function wing(d: Draw, s: Skel, dx: number, z: number, shade: number, flare: number, wave: number) {
  const base = s.T(15.4, -8.4);
  const lean = s.torso - 90 + flare * 16 + Math.sin(wave) * 1.2;
  const rot = (p: [number, number]): V => {
    const a = (lean * Math.PI) / 180;
    const x = p[0] + dx, y = p[1];
    return v(base.x + x * Math.cos(a) - y * Math.sin(a), base.y + x * Math.sin(a) + y * Math.cos(a));
  };
  const rod = ROD.map(rot);
  // the feathers along its back edge
  const n = 9;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const f = t * (rod.length - 1);
    const k = Math.min(rod.length - 2, Math.floor(f));
    const p = lerpV(rod[k], rod[k + 1], f - k);
    const tan = Math.atan2(rod[k + 1].y - rod[k].y, rod[k + 1].x - rod[k].x) * 57.3;
    const out = tan + 118 + flare * 14 + Math.sin(wave * 1.6 + i) * 3;
    const len = 8 + Math.sin(t * Math.PI) * 3 + flare * 2;
    const mat = i % 2 ? FR : FB;
    d.ribbon({ mat, z: z + i * 0.01, group: 'feather' + z + i, shade, line: 'soft' }, [p, at(p, out, len * 0.55), at(at(p, out, len * 0.55), out + 12, len * 0.45)], [1.4, 1.3, 0.4]);
  }
  d.ribbon({ mat: WD, z: z + 0.5, group: 'rod' + z, shade }, rod, rod.map((_, i) => 1.2 - i * 0.1));
}

/**
 * The commander's mace: a short haft of gilded wood, a gold grip, a round head
 * of gold ribbed with flanges, a gold finial. `lie` flattens it on the ground.
 */
function mace(d: Draw, hand: V, ang: number, z: number, lie: number) {
  const f0 = d.frame(hand, ang);
  const f = (u: number, w: number) => f0(u, w * lie);
  d.capsule({ mat: MAT.oldGold, z, group: 'haft' }, f(-4, 0), f(15, 0), 1.1, 1.2);
  d.ellipse({ mat: GD, z: z + 0.1, group: 'pommel' }, f(-4.6, 0), 1.6, 1.5, ang);
  const c = f(17.4, 0);
  d.circle({ mat: GD, z: z + 0.2, group: 'maceHead' }, c, 3.4);
  for (const w of [-2, 0, 2]) d.line({ mat: GD, z: z + 0.25, group: 'maceHead', line: 'none' }, f(15, w * 0.9), f(19.8, w * 0.9), GD.ramp[1]);
  d.circle({ mat: GD, z: z + 0.3, group: 'finial' }, f(21.4, 0), 1.0);
}

// ---------------------------------------------------------------------------
// Poses & animations (arm angles are absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 90,
  head: 90,
  legN: { ik: v(-8, 3) },
  legF: { ik: v(8, 3) },
  armN: { up: -76, lo: -30 },
  armF: { up: -110, lo: -60 },
  p: { mace: 60, wind: 0.05 },
});

/** He stands proud, chest out, the mace resting up against his shoulder; the feathers stir. */
function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -1 - b, armN: { up: -76 + b, lo: -30 + b }, p: { ...IDLE.p, wave: a } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -9 * Math.cos(ph), y: 3 + (sn > 0 ? 4.5 * sn : 0), ang: sn > 0 ? -18 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 1.5, torso: 82, head: 84,
    legN: { ik: v(n.x, n.y) }, legF: { ik: v(f.x, f.y) }, footN: n.ang, footF: f.ang,
    armN: { up: -70 + sw * 14, lo: -24 + sw * 14 }, armF: { up: -100 - sw * 16, lo: -60 - sw * 16 },
    p: { mace: 50 + sw * 10, wave: a * 2, wind: 0.5, flare: 0.3 },
  });
}

// Mace of Command: the mace drawn up and back over his shoulder, then brought down on the enemy.
const MC_WIND = pose({ x: -3, y: -1, torso: 98, head: 94, legN: { ik: v(-10, 3) }, legF: { ik: v(8, 3) }, armN: { up: 110, lo: 150 }, armF: { up: -70, lo: -10 }, p: { mace: 170, shout: 1 } });
const MC_STRIKE = pose({ x: 9, y: -4, torso: 72, head: 76, legN: { ik: v(-12, 3) }, legF: { ik: v(12, 3) }, armN: { up: -10, lo: -34 }, armF: { up: -110, lo: -70 }, p: { mace: -46, shout: 1, flare: 0.3 } });
const MC_FOLLOW = tweak(MC_STRIKE, { x: 10, torso: 70, armN: { up: -20, lo: -50 }, p: { mace: -64, shout: 0, flare: 0.2 } });

// Hold the Line: the mace raised high over his head, his far hand out to his line, a shout.
const HL_DRAW = pose({ y: -1, torso: 92, head: 92, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, armN: { up: 40, lo: 70 }, armF: { up: -70, lo: -20 }, p: { mace: 90 } });
const HL_RAISE = pose({ y: 0, torso: 94, head: 100, legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) }, armN: { up: 74, lo: 92 }, armF: { up: -150, lo: -170 }, p: { mace: 96, shout: 1, flare: 0.4 } });

// Winged Charge: he crouches, then rises with his arms flung wide, the wings swept back and spread, as at the charge.
const WC_CROUCH = pose({ x: -1, y: -5, torso: 74, head: 80, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, armN: { up: -60, lo: -20 }, armF: { up: -100, lo: -70 }, p: { mace: 30, flare: -0.2 } });
const WC_SPREAD = pose({ y: 1, torso: 96, head: 102, legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) }, armN: { up: 30, lo: 50 }, armF: { up: 150, lo: 130 }, p: { mace: 80, shout: 1, flare: 1, wind: 0.6 } });

const HURT = pose({ x: -4, y: -1, torso: 102, head: 104, legN: { ik: v(-11, 3) }, legF: { ik: v(7, 4) }, footF: 10, armN: { up: -100, lo: -50 }, armF: { up: -120, lo: -80 }, p: { mace: 30, flare: 0.3 } });
const DEATH_SWAY = pose({ x: 2, y: -3, torso: 84, head: 68, legN: { ik: v(-10, 3) }, legF: { ik: v(9, 3) }, armN: { up: -96, lo: -96 }, armF: { up: -84, lo: -80 }, p: { drop: 1 } });
const DEATH_FALL = pose({ x: -4, y: -10, torso: 136, head: 146, legN: { ik: v(-4, 3) }, legF: { ik: v(10, 5) }, armN: { up: 168, lo: 174 }, armF: { up: 158, lo: 168 }, p: { drop: 1, flare: 0.6 } });
const DEATH_DOWN = pose({ x: -8, y: -20, torso: 176, head: 178, legN: { up: 4, lo: -2 }, legF: { up: 10, lo: 2 }, footN: 80, footF: 80, armN: { up: 176, lo: 178 }, armF: { up: 184, lo: 180 }, p: { drop: 1, flare: 0.2 } });

/** Victory: the mace held up, the wings spread, a laugh under the moustache. */
const VICTORY = tweak(HL_RAISE, { p: { mace: 96, shout: 1, flare: 0.8 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'sir_siroslav',
  name: 'Sir Siroslav',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 200, idle) },
    run: { loop: true, frames: cycle(8, 90, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, MC_WIND, 0.5), 90],
        [MC_WIND, 180],
        [mid(MC_WIND, MC_STRIKE, 0.55), 50],
        [MC_STRIKE, 100, { hit: true }],
        [MC_FOLLOW, 170],
        [mid(MC_FOLLOW, IDLE, 0.5), 110],
        [IDLE, 90],
      ]),
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, HL_DRAW, 2, 100, ease.out),
        ...keys([
          [HL_DRAW, 160],
          [HL_RAISE, 160, { hit: true, event: 'cast' }],
          [tweak(HL_RAISE, { p: { ...HL_RAISE.p, wave: 2 } }), 260],
          [tweak(HL_RAISE, { p: { ...HL_RAISE.p, wave: 4, shout: 0 } }), 220],
        ]),
        ...tween(D, HL_RAISE, IDLE, 3, 110, ease.inOut),
      ],
    },
    ritual: {
      loop: false,
      frames: [
        ...tween(D, IDLE, WC_CROUCH, 3, 100, ease.out),
        ...keys([
          [WC_CROUCH, 200],
          [mid(WC_CROUCH, WC_SPREAD, 0.5), 60],
          [WC_SPREAD, 160, { hit: true, event: 'cast' }],
          [tweak(WC_SPREAD, { p: { ...WC_SPREAD.p, wave: 2 } }), 240],
          [tweak(WC_SPREAD, { p: { ...WC_SPREAD.p, wave: 4 } }), 240],
        ]),
        ...tween(D, WC_SPREAD, IDLE, 3, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 98, head: 100 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [tweak(HURT, { p: { ...HURT.p, drop: 1 } }), 120],
        [DEATH_SWAY, 240],
        [mid(DEATH_SWAY, DEATH_FALL, 0.5), 110],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -20.4 }), 600],
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

function iconMace(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: MAT.oldGold, z, group: 'ihaft' }, f(-6, 0), f(16, 0), 1.6, 1.8);
  d.circle({ mat: GD, z: z + 0.2, group: 'ihead' }, f(20, 0), 5.2);
  d.circle({ mat: GD, z: z + 0.3, group: 'ifin' }, f(26, 0), 1.6);
}

function iconFeather(d: Draw, p: V, ang: number, len: number, mat: typeof FR, z: number) {
  d.ribbon({ mat, z, group: 'if' + p.x + p.y }, [p, at(p, ang, len * 0.6), at(at(p, ang, len * 0.6), ang - 14, len * 0.4)], [2.2, 2, 0.6]);
}

export const sirSiroslav: ChampionArt = {
  char,
  iconBg: CR,
  icons: {
    mace_of_command: () =>
      compose(CR, glyph((d) => {
        iconMace(d, v(8, 8), 45, 2);
      }), (b) => impactStar(b, 28, 12, 2, 7, 8, GD.ramp[4], E.white)),
    hold_the_line: () =>
      compose(CR, glyph((d) => {
        // the mace raised, a red hexagon behind it
        const hex: V[] = [];
        for (let k = 0; k < 6; k++) hex.push(v(20 + Math.cos((k / 6) * Math.PI * 2) * 13, 20 + Math.sin((k / 6) * Math.PI * 2) * 13));
        d.poly({ mat: FB, z: 1, group: 'ihexb' }, hex, { kind: 'bevel', w: 1.6 });
        const inner = hex.map((p) => lerpV(p, v(20, 20), 0.35));
        d.poly({ mat: HX, z: 1.5, group: 'ihex' }, inner, { kind: 'bevel', w: 1.4 });
        iconMace(d, v(20, 3), 90, 2);
      })),
    winged_charge: () =>
      compose(CR, glyph((d) => {
        // a wing: the rod curling up and over, feathers off it
        const rod = [v(26, 4), v(20, 12), v(17, 22), v(19, 31), v(25, 36)];
        for (let i = 0; i < 9; i++) {
          const t = (i + 0.5) / 9;
          const k = Math.min(3, Math.floor(t * 4));
          const p = lerpV(rod[k], rod[k + 1], t * 4 - k);
          iconFeather(d, p, 160 + i * 4, 11, i % 2 ? FR : FB, 2 + i * 0.01);
        }
        d.ribbon({ mat: WD, z: 3, group: 'irod' }, rod, [1.8, 1.7, 1.6, 1.4, 1.1]);
      })),
    never_retreat: () =>
      compose(FB, glyph((d) => {
        // the mace planted upright before a wing: he does not give ground
        const rod = [v(30, 4), v(26, 14), v(25, 24), v(28, 33), v(33, 37)];
        for (let i = 0; i < 7; i++) {
          const t = (i + 0.5) / 7;
          const k = Math.min(3, Math.floor(t * 4));
          iconFeather(d, lerpV(rod[k], rod[k + 1], t * 4 - k), 170 + i * 5, 10, i % 2 ? FR : FB, 2 + i * 0.01);
        }
        d.ribbon({ mat: WD, z: 3, group: 'irod' }, rod, [1.6, 1.5, 1.4, 1.2, 1.0]);
        iconMace(d, v(14, 4), 90, 4);
      })),
  },
};
