// The Sentry (Jakub's brief, docs/DESIGN_DECISIONS.md section 46,
// 2026-11-01): a Common Tank of the Sanguine Dominion, a soldier who patrols
// the border, lightly armoured, with a long sword and dark-brown shoulders.
// On the Town Guard's rig: a dark-red padded gambeson to mid-thigh with a
// small red hexagon on the chest (the Dominion's mark), dark-brown leather
// pauldrons and bracers, charcoal trousers and travel boots, a short
// dark-grey cloak, an open-faced iron cap, a stubbled face; a long sword with
// a long grip, held in both hands, point down at rest. Checkpoint Cut: a
// two-handed diagonal cut with a plain white streak; Watch Rotation: the
// sword planted, rose light rising round him. His affinity (Tide) sets
// nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, FXR, MAT } from '../palette.ts';
import { arm, cape, leg, smear, sword, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
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

const SK = MAT.skinTan, GB = MAT.maroon, BR = MAT.darkleather, CH = MAT.charcoal, CL = MAT.blackCloth, IR = MAT.iron, ST = MAT.steel, RD = MAT.red, HR = MAT.hairBrown;
const E = ACCENT;

/** The streak of a cut: plain white with the light of the steel. */
const SWING = { core: E.white, edge: ST.ramp[4] };

/** The long sword: blade length from the near hand; where the far hand holds the long grip, back toward the pommel. */
const BLADE = 27, TWO = -3.6;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const prev = info.prev?.pose.p;
  const ang = P.swordAng ?? -80;
  const held = !P.drop;

  // the short cloak behind him
  cape(d, s, { mat: CL, z: 4, group: 'cloak', len: s.torso < 55 ? 14 : 26, topU: 20, topBack: 5.6, topFront: 2.0, spread: 4, wind: P.wind ?? 0.1, wave: P.wave ?? 0 });

  // far leg; the far arm, its hand on the long grip behind the near one while he holds the sword
  leg(d, s, 'F', legCfg(10, -1));
  const far = held ? farArm(s, ang) : { e: s.eF, h: s.hF, lo: s.loF };
  farArmDraw(d, s.sF, far.e, far.h, 20, -1);
  pauldron(d, s, 'F', 22, -1);

  // the gambeson, its skirt, the badge, the belt
  gambeson(d, s, 30);

  head(d, s, P);

  // near leg
  leg(d, s, 'N', legCfg(50, 0));

  // the long sword, its smear, then the near arm over the grip
  if (held) {
    if (info.def.smear && prev && prev.swordAng !== undefined) smear(d, s.hN, prev.swordAng, ang, BLADE + 3, 9, SWING, 55);
    blade(d, s.hN, ang, 56);
  } else blade(d, v(-4, 3.6), 2, 56);
  arm(d, s, 'N', armCfg(60, 0));
  bracer(d, s.eN, s.hN, 60.5, 0, 'N');
  pauldron(d, s, 'N', 62, 0);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const legCfg = (z: number, shade: number) => ({
  thigh: CH, shin: CH, foot: BR, rThigh: [4.2, 3.4] as [number, number], rShin: [3.1, 2.6] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: BR, from: 0.45, r: [3.3, 3.0] as [number, number], cuff: BR },
});

// the gambeson's padded sleeves, dark-red to the wrist
const armCfg = (z: number, shade: number) => ({
  upper: GB, fore: GB, hand: SK, rUp: [3.2, 2.8] as [number, number], rLo: [2.7, 2.3] as [number, number], rHand: 2.1, z, shade,
});

/** Where the far arm reaches: its hand on the long grip, `TWO` from the near hand toward the pommel. */
function farArm(s: Skel, ang: number): { e: V; h: V; lo: number } {
  const grip = at(s.hN, ang, TWO);
  const r = ik2(s.sF, grip, D.upperArm, D.foreArm, -1);
  return { e: r.mid, h: r.end, lo: r.a2 };
}

/** The far arm drawn from its solved joints: the padded sleeve, the bracer, the hand. */
function farArmDraw(d: Draw, sh: V, el: V, ha: V, z: number, shade: number) {
  d.capsule({ mat: GB, z, group: 'armF', shade }, sh, el, 3.2, 2.8);
  d.capsule({ mat: GB, z: z + 0.1, group: 'armF', shade }, el, ha, 2.7, 2.3);
  bracer(d, el, ha, z + 0.2, shade, 'F');
  d.circle({ mat: SK, z: z + 0.3, group: 'armF', shade }, ha, 2.1);
}

/** A dark-brown leather bracer on the forearm. */
function bracer(d: Draw, el: V, ha: V, z: number, shade: number, side: string) {
  const a = (Math.atan2(ha.y - el.y, ha.x - el.x) * 180) / Math.PI;
  d.capsule({ mat: BR, z, group: 'bracer' + side, shade }, at(el, a, 3.8), at(ha, a, -2.0), 2.8, 2.6);
}

/** A dark-brown leather pauldron over the shoulder, two lames. */
function pauldron(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const up = side === 'N' ? s.upN : s.upF;
  const c = at(at(sh, up, 1.0), s.torso, 1.0);
  d.ellipse({ mat: BR, z, group: 'pauldron' + side, shade, line: 'soft' }, c, 5.0, 3.8, up + 90, 0.15);
  const lame = at(c, up, 2.8);
  d.capsule({ mat: BR, z: z + 0.1, group: 'pauldron' + side, shade: shade - 1, line: 'soft' }, at(lame, up + 90, 4.0), at(lame, up - 90, 4.0), 1.0, 1.0);
}

/** The gambeson: dark-red, padded in rows, a skirt to mid-thigh, a small red hexagon on the chest, a dark-brown belt. */
function gambeson(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [
    [0, 6.4, 6.6],
    [4, 6.6, 7.2],
    [9, 7.2, 8.0],
    [14, 7.6, 8.4],
    [17.4, 7.4, 7.6],
    [19.8, 6.0, 5.4],
    [21.2, 3.4, 2.8],
  ]);
  d.poly({ mat: GB, z, group: 'gambeson', tex: (h) => (Math.sin(h.u * 40) > 0.86 ? -1 : 0) }, body, { kind: 'cyl', a: s.T(0, 1), b: s.T(21.2, 1), r: 8.4, bevel: 1.2 });
  // the skirt over the hips, hanging between the thighs
  const ang = Math.max(-118, Math.min(-62, (s.thN + s.thF) / 2));
  const f0 = s.T(1.2, -7.0), f1 = s.T(1.2, 7.4);
  const f2 = at(f1, ang + 8, 11), f3 = at(f0, ang - 8, 10);
  d.poly({ mat: GB, z: z - 0.5, group: 'skirt', tex: (h) => (Math.sin(h.u * 30) > 0.86 ? -1 : 0) }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 7, bevel: 1 });
  // the belt
  d.poly({ mat: BR, z: z + 1, group: 'belt' }, [s.T(3.4, -6.8), s.T(3.6, 7.6), s.T(1.2, 7.4), s.T(1.0, -6.6)], { kind: 'cyl', a: s.T(1.0, 0), b: s.T(3.6, 0), r: 7.4 });
  d.poly({ mat: IR, z: z + 1.1, group: 'buckle' }, [s.T(3.8, 4.8), s.T(3.8, 7.6), s.T(0.8, 7.6), s.T(0.8, 4.8)], { kind: 'bevel', w: 1 });
  hexBadge(d, s.T(14.4, 3.2), z + 1.2);
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

/** A stubbled face under an open-faced iron cap, a riveted brim, the hair at the nape. */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.9, 2.7);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[1], browStyle: P.grit ? 'angry' : 'flat', mouth: P.grit ? 'shout' : 'line', lip: SK.ramp[1], rx: 6.0, ry: 6.6 });
  // stubble along the jaw
  d.pixels({ mat: SK, z: 38.4, group: 'stubble', line: 'none', outline: false }, [
    { p: H(4.6, -4.6), c: SK.ramp[2] }, { p: H(3.0, -5.6), c: SK.ramp[2] }, { p: H(1.4, -5.8), c: SK.ramp[2] }, { p: H(-0.2, -5.2), c: SK.ramp[2] },
  ]);
  // hair at the nape under the cap
  d.poly({ mat: HR, z: 38.6, group: 'nape', shade: -1 }, [H(-6.2, 0.4), H(-5.6, -3.0), H(-3.6, -2.8), H(-3.6, 0.4)], { kind: 'flat', n: [0, 0, 1] });
  // the iron cap: a rounded skull, a brim all round, a rivet or two
  d.poly({ mat: IR, z: 39, group: 'cap', line: 'soft' }, [H(6.4, 3.0), H(5.4, 6.6), H(2.4, 9.0), H(-1.6, 9.4), H(-5.4, 8.0), H(-7.6, 4.6), H(-7.8, 1.6), H(-2.0, 2.8), H(2.4, 3.2)], { kind: 'dome', c: H(-0.8, 4.6), r: 8.6, bevel: 1.3 });
  d.ribbon({ mat: IR, z: 39.1, group: 'brim', shade: -1 }, [H(8.0, 2.8), H(3.0, 2.6), H(-2.4, 2.0), H(-7.0, 1.0), H(-8.6, 0.4)], [1.0, 1.1, 1.1, 1.0, 0.9]);
  d.pixels({ mat: IR, z: 39.2, group: 'cap' }, [{ p: H(-1.6, 9.0), c: IR.ramp[5] }, { p: H(2.6, 3.4), c: IR.ramp[4] }, { p: H(-3.6, 2.8), c: IR.ramp[4] }]);
}

/** The long sword: a straight blade to a point, a cross guard, a long leather grip for two hands, a round pommel. */
function blade(d: Draw, hand: V, ang: number, z: number) {
  sword(d, hand, ang, { blade: ST, guard: IR, grip: BR, pommel: IR, len: BLADE, width: 2.8, guardW: 3.6, gripLen: 6.4, z, group: 'sword' });
}

// ---------------------------------------------------------------------------
// Poses & animations (the sword's angle is absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

// At rest: the long sword held point-down before him in both hands, feet apart, watching.
const IDLE: Pose = pose({
  y: -1,
  torso: 86,
  head: 88,
  legN: { ik: v(-9, 3) },
  legF: { ik: v(9, 3) },
  armN: { up: -58, lo: -40 },
  armF: { up: -70, lo: -30 },
  p: { swordAng: -84 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 86 - b,
    armN: { up: -58 + b * 2, lo: -40 + b * 2 },
    p: { swordAng: -84 + b * 2, wave: a },
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
  return pose({
    y: bob - 2,
    torso: 74,
    head: 80,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -40, lo: 6 },
    armF: { up: -60, lo: 0 },
    p: { swordAng: 150, wind: 0.8, wave: a * 2 },
  });
}

// Checkpoint Cut: the sword raised over his near shoulder in both hands, then a diagonal cut down through the enemy.
const CC_WIND = pose({
  x: -2, y: -2, torso: 92, head: 88,
  legN: { ik: v(-12, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 96, lo: 130 }, armF: { up: -60, lo: 10 },
  p: { swordAng: 150, wind: 0.2 },
});
const CC_STRIKE = pose({
  x: 8, y: -4, torso: 70, head: 78,
  legN: { ik: v(-10, 3) }, legF: { ik: v(15, 3) },
  armN: { up: -6, lo: -30 }, armF: { up: -60, lo: 0 },
  p: { swordAng: -42, grit: 1, wind: 0.6 },
});
const CC_FOLLOW = tweak(CC_STRIKE, { x: 9, torso: 68, armN: { up: -24, lo: -54 }, p: { swordAng: -72, grit: 0, wind: 0.4 } });

// Watch Rotation: he plants the sword point-down before him, stands tall, chin up.
const WR_SET = pose({
  y: 0, torso: 92, head: 96,
  legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) },
  armN: { up: -50, lo: -10 }, armF: { up: -60, lo: -6 },
  p: { swordAng: -88, wind: 0.1 },
});

const HURT = pose({
  x: -4, y: -1, torso: 98, head: 104,
  legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10,
  armN: { up: -76, lo: -30 }, armF: { up: -82, lo: -20 },
  p: { swordAng: -110, grit: 1, wind: 0.3 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -10, torso: 76, head: 62,
  legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -30,
  armN: { up: -60, lo: 10 }, armF: { up: -70, lo: 10 },
  p: { swordAng: 40 },
});
const DEATH_FALL = pose({
  x: 2, y: -6, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { drop: 1 },
});
const DEATH_DOWN = pose({
  x: 6, y: -15.5, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { drop: 1 },
});

// Victory: the long sword raised high in both hands.
const RAISED = pose({
  y: -1, torso: 88, head: 94,
  legN: { ik: v(-9, 3) }, legF: { ik: v(9, 3) },
  armN: { up: 96, lo: 92 }, armF: { up: 80, lo: 70 },
  p: { swordAng: 90, grit: 1 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'sentry',
  name: 'Sentry',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(6, 170, idle) },
    run: { loop: true, frames: cycle(8, 76, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CC_WIND, 2, 80, ease.out),
        ...keys([
          [CC_WIND, 170],
          [mid(CC_WIND, CC_STRIKE, 0.5), 45],
          [CC_STRIKE, 65, { smear: true, hit: true }],
          [CC_FOLLOW, 180],
        ]),
        ...tween(D, CC_FOLLOW, IDLE, 2, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, WR_SET, 2, 100, ease.out),
        ...keys([
          [tweak(WR_SET, { y: -1 }), 120],
          [WR_SET, 300, { hit: true }],
          [tweak(WR_SET, { head: 94 }), 260],
        ]),
        ...tween(D, WR_SET, IDLE, 2, 110, ease.inOut),
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
        [tweak(DEATH_DOWN, { y: -16 }), 600],
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

/** The long sword in an icon, scaled up for 40x40. */
function iconSword(d: Draw, hilt: V, ang: number, z: number, len = 28) {
  const f = d.frame(hilt, ang);
  const g = 'isword' + z;
  d.capsule({ mat: BR, z, group: g, tex: (h) => (Math.floor(h.u * 6) % 2 ? 1 : 0) }, f(-7, 0), f(2, 0), 1.6, 1.6);
  d.circle({ mat: IR, z: z + 0.05, group: g }, f(-8.4, 0), 2.2);
  d.poly({ mat: ST, z: z + 0.1, group: g }, [f(3.6, -2.4), f(len - 5, -2.2), f(len, 0), f(len - 5, 2.2), f(3.6, 2.4)], { kind: 'cyl', a: f(3.6, 0), b: f(len, 0), r: 3 });
  d.capsule({ mat: IR, z: z + 0.2, group: g }, f(3.2, -6), f(3.2, 6), 1.4, 1.4);
}

export const sentry: ChampionArt = {
  char,
  iconBg: GB,
  icons: {
    checkpoint_cut: () =>
      compose(GB, glyph((d) => {
        // one diagonal cut of the long sword
        smear(d, v(16, 18), 150, -40, 22, 5, SWING, 1);
        iconSword(d, v(6, 8), 44, 10);
      }), (b) => {
        for (const [x, y] of [[34, 7], [36, 10], [31, 5]]) b.set(x, y, E.white);
      }),
    watch_rotation: () =>
      compose(GB, glyph((d) => {
        // the sword planted point-down
        iconSword(d, v(20, 30), -90, 10, 26);
      }), (b) => {
        // rose light rising round it (screen space, y down)
        const R = FXR.rose;
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          b.set(Math.round(20 + Math.cos(a) * 12), Math.round(34 + Math.sin(a) * 3), R[k % 2 ? 3 : 4]);
        }
        for (const [x, y, c] of [[9, 24, 4], [31, 22, 4], [12, 14, 3], [28, 12, 3], [8, 8, 2], [32, 6, 2]] as const) b.set(x, y, R[c]);
      }),
  },
};
