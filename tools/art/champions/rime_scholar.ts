// The Rime Scholar (docs/DESIGN_DECISIONS.md section 8). Jakub's look: a
// censer with small ice flakes flowing around it, held as a focus and never
// swung; long blonde hair and a normal skin tone (not pale); a dark green
// dress with a blue circle on the back; tall and still, because cold is
// motionless, and deliberate when she moves. She does not wear the Sanguine
// Dominion's black and red, and neither the circle nor the dress is a faction
// or affinity mark. In the 3/4 view the circle shows as a narrow ellipse on
// the back of the bodice. Her face, sleeves and the censer's shape are a first
// take: the record does not describe them.
import { BuildInfo, ChampionArt, CharDef, cycle, keys } from '../char.ts';
import { compose, crystal, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { line } from '../paint.ts';
import { foldTex, robe, RobeCfg, torsoPts, upRobe } from '../parts.ts';
import { angleOf, at, D2R, dir, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 37,
  thigh: 17,
  shin: 17.5,
  ankleH: 3,
  footLen: 5.5,
  spine: 20.5,
  neck: 7.6,
  upperArm: 12.5,
  foreArm: 11.5,
  shoulderDrop: 3.6,
  shoulderN: -2.4,
  shoulderF: 2.8,
  hipN: -1.4,
  hipF: 1.4,
};

const SK = MAT.skinLight, GR = MAT.pine, HR = MAT.hairBlonde, BL = MAT.blue, SV = MAT.silver, ICE = MAT.glowIce;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const wave = P.wave ?? 0;
  void info;

  hairBack(d, s, P.hair ?? 0);

  // slippers peek under the hem
  for (const [side, z, shade] of [['F', 11, -1], ['N', 12, 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF;
    const fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: GR, z, group: 'foot' + side, shade: shade - 1 }, [f(-2.4, 1.8), f(-2.8, -1), f(-2.2, -3), f(5.4, -3), f(6.8, -1.6), f(3.4, 0), f(1, 1.8)], { kind: 'bevel', w: 1.4 });
  }

  // the far arm hangs behind the dress (it shows when she raises it)
  sleeveArm(d, s, 'F', 14, -1);
  dress(d, s, wave);

  // bodice: slim, high-necked
  const torso = torsoPts(s, [
    [0, 4.8, 5.0],
    [4, 4.4, 4.9],
    [8.5, 4.8, 6.0],
    [12.5, 5.4, 6.6],
    [16, 5.6, 5.6],
    [18.6, 4.2, 3.4],
    [20.4, 2.6, 2.2],
  ]);
  d.poly({ mat: GR, z: 30, group: 'body', tex: foldTex(6, 0.6, 0.78) }, torso, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(20, 0.6), r: 6.2, bevel: 1.3 });
  // the blue circle on the back, seen edge-on from the side
  backCircle(d, s, 30.4);
  // a darker sash at the waist
  d.poly({ mat: GR, z: 30.6, group: 'sash', shade: -1, line: 'none' }, [s.T(2.6, -4.6), s.T(2.8, 5.0), s.T(1.2, 5.1), s.T(1.0, -4.7)], { kind: 'cyl', a: s.T(0, 0), b: s.T(3, 0), r: 5.4 });
  // the neckline's trim
  d.ribbon({ mat: GR, z: 30.7, group: 'trim', shade: 1, line: 'none' }, [s.T(19.6, -1.6), s.T(19.9, 1.0), s.T(19.5, 2.6)], [0.6, 0.6, 0.6]);

  head(d, s, P);

  censer(d, s, P);
  sleeveArm(d, s, 'N', 60, 0);
  flakes(d, s, P, true);
}

/** Long sleeves of the dress, widening a little toward the wrist; bare hands. */
function sleeveArm(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const el = side === 'N' ? s.eN : s.eF;
  const ha = side === 'N' ? s.hN : s.hF;
  const lo = side === 'N' ? s.loN : s.loF;
  const g = 'arm' + side;
  d.capsule({ mat: GR, z, group: g, shade }, sh, el, 2.9, 2.5);
  d.capsule({ mat: GR, z: z + 0.1, group: g, shade }, el, at(ha, lo, -1.6), 2.5, 3.1, 0.2);
  // the cuff's lighter trim
  d.capsule({ mat: GR, z: z + 0.15, group: g, shade: shade + 1, line: 'none' }, at(ha, lo, -2.4), at(ha, lo, -1.6), 3.1, 3.1, 0.3);
  d.ellipse({ mat: SK, z: z + 0.3, group: g, shade }, at(ha, lo, 0.8), 2.1, 1.7, lo);
}

const DRESS: RobeCfg = { waist: [1.6, 4.8, 5.2], hemDrop: 1.6, hemFloor: 1.2, hemBack: [6.6, 5.4], hemFront: [4.4, 3.4], midBack: [3.6, 2.4], midFront: [3.0, 1.4], ripple: 0.6 };

/** The long dark green dress; its hem a shade darker. */
function dress(d: Draw, s: Skel, wave: number) {
  const r = robe(s, DRESS, wave);
  d.poly({ mat: GR, z: 15, group: 'dress', tex: foldTex(9, wave * 0.5, 0.62) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  d.ribbon({ mat: GR, z: 15.2, group: 'dress', shade: -1, line: 'none' }, upRobe(r, r.hem, 0.9), r.hem.map(() => 0.9));
  return r.down;
}

function backCircle(d: Draw, s: Skel, z: number) {
  // a disc on the back plane, foreshortened: narrow across the body, full height along the spine
  const c = s.T(13.2, -3.7);
  const pts: V[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pts.push(s.T(13.2 + Math.sin(a) * 3.4, -3.7 + Math.cos(a) * 1.5));
  }
  d.poly({ mat: BL, z, group: 'circle', line: 'none' }, pts, { kind: 'cyl', a: s.T(9, -3.7), b: s.T(17, -3.7), r: 2, bevel: 0.6 });
  void c;
}

/** Long hair falling down her back to the waist; `sway` streams it back. */
function hairBack(d: Draw, s: Skel, sway: number) {
  const H = s.H, T = s.T;
  const pts = [
    H(-0.5, 7.6), H(-6.4, 5.4), H(-8.2, 0.6),
    T(15.5 - sway * 0.3, -8.6 - sway * 0.8), T(9.5 - sway * 0.6, -9.0 - sway * 1.6), T(4.2 - sway, -8.4 - sway * 2.6), T(1.4 - sway, -7.0 - sway * 3),
    T(2.6 - sway * 0.8, -6.0 - sway * 2.2), T(1.6 - sway * 0.6, -5.2 - sway * 2), T(6, -5.6 - sway), T(12, -5.8), H(-4.2, -5.4), H(-1, -1),
  ];
  d.poly({ mat: HR, z: 3, group: 'hairback', tex: (h, x, y) => ((x * 3 + y) % 5 === 0 ? -1 : 0) }, pts, { kind: 'dome', c: H(-5, -2), r: 12, bevel: 1.2 });
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'head' }, s.neck, H(0, -4), 2.3, 2.1);
  // the high collar of the dress
  d.capsule({ mat: GR, z: 37.6, group: 'collar' }, s.T(19.8, -2.4), s.T(20.3, 2.0), 1.6, 1.5);
  face(d, s, { skin: SK, z: 38, brow: HR.ramp[2], browStyle: 'calm', ear: 'none', mouth: 'line', lip: ACCENT.lipRose, rx: 5.8, ry: 6.4, profile: 'soft', lash: ACCENT.kohl });
  // the crown of the hair, parted, with a lock falling past the cheek to the shoulder
  d.poly(
    { mat: HR, z: 38.8, group: 'head', tex: (h, x, y) => ((x * 3 + y) % 5 === 0 ? -1 : 0) },
    [H(5.4, 4.6), H(4.4, 6.4), H(1.6, 7.9), H(-2.6, 8.0), H(-6.6, 5.2), H(-7.6, 0.4), H(-7.0, -5.6), H(-4.6, -7.4), H(-2.4, -5.0), H(-1.0, -1.0), H(0.6, 2.6), H(2.6, 4.6), H(4.0, 4.2)],
    { kind: 'dome', c: H(-1.5, 2.5), r: 9.5, bevel: 1.2 },
  );
  // a loose strand in front of the ear, catching the light
  d.ribbon({ mat: HR, z: 38.9, group: 'head', line: 'soft' }, [H(0.2, 2.6), H(-0.6, -1.6), H(-1.4 + (P.hair ?? 0) * 0.2, -6.4)], [0.9, 0.8, 0.6]);
}

/**
 * The censer: a pierced silver vessel hanging on its chains from the near
 * hand, cold light showing through. Flakes of ice drift round it (`flakes`).
 */
function censer(d: Draw, s: Skel, P: Record<string, number>) {
  const hand = s.hN;
  const swing = P.swing ?? 0;
  const hang = -90 + swing;
  const top = at(hand, hang, 8.6);
  const body = at(hand, hang, 12.2);
  const z = 55;
  // three chains from the ring in the hand to the lid
  for (const k of [-1, 0, 1]) {
    const b = at(top, hang + 90, k * 1.6);
    d.line({ mat: SV, z: z - 0.2 + k * 0.01, group: 'chain', line: 'none', outline: false }, at(hand, hang, 1.4), b, k === 1 ? SV.ramp[2] : SV.ramp[4]);
  }
  // lid, finial and the bowl
  d.ellipse({ mat: SV, z, group: 'censer' }, at(top, hang, 1.2), 2.4, 1.7, hang + 90);
  d.circle({ mat: SV, z: z + 0.05, group: 'censer' }, at(top, hang, -0.4), 0.9);
  d.ellipse({ mat: SV, z: z + 0.1, group: 'censer' }, body, 3.5, 3.1, hang + 90);
  d.capsule({ mat: SV, z: z + 0.15, group: 'censer' }, at(body, hang + 90, -3.4), at(body, hang + 90, 3.4), 0.7, 0.7);
  d.ellipse({ mat: SV, z: z + 0.12, group: 'censer' }, at(body, hang, 3.4), 1.8, 1.1, hang + 90);
  // cold light through the piercings
  const glow = Math.round(P.cold ?? 0);
  const f = d.frame(body, hang + 90);
  d.pixels({ mat: ICE, z: z + 0.2, group: 'censer' }, [
    { p: f(-1.6, -1.2), c: ICE.ramp[3 + Math.min(1, glow)] },
    { p: f(1.4, -1.0), c: ICE.ramp[4] },
    { p: f(0, -2.1), c: ICE.ramp[3] },
    { p: f(-0.2, 0.9), c: glow ? ICE.ramp[5] : ICE.ramp[4] },
  ]);
  flakes(d, s, P, false);
}

/**
 * Ice flakes orbit the censer on a tilted ring and drift upward: the back half
 * behind the vessel, the front half before her hand. `cold` widens the ring
 * when she casts.
 */
function flakes(d: Draw, s: Skel, P: Record<string, number>, front: boolean) {
  const swing = P.swing ?? 0;
  const c = at(s.hN, -90 + swing, 12.2);
  const ph = P.flake ?? 0;
  const cold = P.cold ?? 0;
  const rx = 7 + cold * 5, ry = 3 + cold * 2.2;
  const pts: { p: V; c: typeof ICE.ramp[0] }[] = [];
  const n = 8 + Math.round(cold * 4);
  for (let k = 0; k < n; k++) {
    const a = ph + (k / n) * Math.PI * 2;
    // the near half of the ring sits lower on screen and in front of the vessel
    const inFront = Math.sin(a) > 0;
    if (inFront !== front) continue;
    const rise = ((k * 0.37 + ph / (Math.PI * 2)) % 1) * (4 + cold * 6);
    const q = v(c.x + Math.cos(a) * rx, c.y - Math.sin(a) * ry + rise);
    const col = k % 3 === 0 ? ACCENT.white : k % 3 === 1 ? ACCENT.flake : ICE.ramp[4];
    pts.push({ p: q, c: col });
    // every third flake is a small cross of light, so the ring reads even at 1x
    if (k % 3 === 0) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) pts.push({ p: v(q.x + dx, q.y + dy), c: cold > 0.5 ? ICE.ramp[4] : ICE.ramp[3] });
  }
  if (pts.length) d.pixels({ mat: ICE, z: front ? 70 : 54, group: 'flakes', outline: false, line: 'none', noClean: true }, pts);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 90,
  head: 88,
  legN: { ik: v(-4, 3) },
  legF: { ik: v(5, 3) },
  armN: { up: -72, lo: 16 },
  armF: { up: -94, lo: -86 },
  p: { wave: 0, hair: 0, flake: 0, cold: 0, swing: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b * 0.6,
    armN: { up: -72 + b, lo: 16 + b },
    p: { wave: a * 0.5, hair: Math.sin(a) * 0.4, flake: a, cold: 0, swing: Math.sin(a) * 2 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.6 ? 1 : 0;
  const ft = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -8 * Math.cos(ph), y: 3 + (sn > 0 ? 4 * sn : 0), ang: sn > 0 ? -16 * sn : 0 };
  };
  const n = ft(a), f = ft(a + Math.PI);
  return pose({
    y: bob - 1,
    torso: 84,
    head: 88,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -48, lo: 14 },
    armF: { up: -110 + Math.cos(a) * 6, lo: -96 },
    p: { wave: a * 2 + 2, hair: 2.2 + Math.sin(a * 2) * 0.4, flake: a * 1.5, cold: 0, swing: -24 },
  });
}

// Pale Strike: a short, close motion of the free hand; a pale shard leaves her fingers.
const PS_GATHER = pose({
  torso: 92, head: 90,
  legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) },
  armN: { up: -72, lo: 16 }, armF: { up: -66, lo: 64 },
  p: { wave: 0.6, hair: 0, flake: 1.2, cold: 0.3, swing: 2 },
});
const PS_FLICK = pose({
  x: 1, torso: 88, head: 87,
  legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) },
  armN: { up: -72, lo: 16 }, armF: { up: -34, lo: 4 },
  p: { wave: 1.0, hair: 0.4, flake: 1.8, cold: 0.6, swing: -3 },
});

// Rimebind: the censer rises before her, the cold spreads, her free hand presses it down onto the enemy line.
const RB_RAISE = pose({
  y: 1, torso: 95, head: 98,
  legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) },
  armN: { up: 22, lo: 74 }, armF: { up: -112, lo: -150 },
  p: { wave: 1.2, hair: 0.6, flake: 2.4, cold: 1, swing: 0 },
});
const RB_BIND = pose({
  x: 2, torso: 86, head: 84,
  legN: { ik: v(-5, 3) }, legF: { ik: v(6, 3) },
  armN: { up: -8, lo: 34 }, armF: { up: -34, lo: -44 },
  p: { wave: 2.2, hair: 0.8, flake: 3.4, cold: 1, swing: -6 },
});

const HURT = pose({
  x: -4, torso: 100, head: 106,
  legN: { ik: v(-6, 3) }, legF: { ik: v(5, 4) },
  armN: { up: -100, lo: -50 }, armF: { up: -130, lo: -100 },
  p: { wave: 2, hair: -1, flake: 2, cold: 0, swing: 22 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -15, torso: 76, head: 60,
  legN: { ik: v(-12, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -84, lo: -70 }, armF: { up: -80, lo: -70 },
  p: { wave: 1, hair: 0.4, flake: 1, cold: 0, swing: 0 },
});
const DEATH_FALL = pose({
  x: 1, y: -23, torso: 30, head: 14,
  legN: { up: -150, lo: -175 }, legF: { up: -120, lo: -170 },
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { wave: 1.6, hair: 1, flake: 1.4, cold: 0, swing: 40 },
});
const DEATH_DOWN = pose({
  x: 5, y: -30, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 },
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { wave: 2, hair: 1.2, flake: 1.6, cold: 0, swing: 84 },
});

// Victory: still; the censer lifts a little and the flakes rise round her hand.
const VICTORY = pose({
  y: 1, torso: 91, head: 96,
  legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) },
  armN: { up: -30, lo: 40 }, armF: { up: -94, lo: -86 },
  p: { wave: 0.8, hair: 0.2, flake: 1, cold: 0.7, swing: 0 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'rime_scholar',
  name: 'Rime Scholar',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 160, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, PS_GATHER, 0.5), 90],
        [PS_GATHER, 170],
        [PS_FLICK, 80, { event: 'shoot', hit: true }],
        [tweak(PS_FLICK, { p: { flake: 2.4, cold: 0.4 } }), 220],
        [mid(PS_FLICK, IDLE, 0.5), 110],
        [IDLE, 100],
      ]),
    },
    skill: {
      loop: false,
      frames: keys([
        [mid(IDLE, RB_RAISE, 0.4), 110],
        [mid(IDLE, RB_RAISE, 0.8), 110],
        [RB_RAISE, 170, { event: 'cast' }],
        [tweak(RB_RAISE, { p: { flake: 3.0 } }), 130],
        [mid(RB_RAISE, RB_BIND, 0.5), 60],
        [RB_BIND, 120, { hit: true }],
        [tweak(RB_BIND, { p: { flake: 4.2, cold: 0.8 } }), 220],
        [mid(RB_BIND, IDLE, 0.5), 120],
        [IDLE, 110],
      ]),
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 97, head: 100, p: { swing: 12 } }), 110],
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
        [tweak(DEATH_DOWN, { y: -31 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...keys([
          [mid(IDLE, VICTORY, 0.5), 120],
          [VICTORY, 160],
          [tweak(VICTORY, { p: { flake: 1.8 } }), 160],
          [tweak(VICTORY, { p: { flake: 2.6 } }), 160],
          [tweak(VICTORY, { p: { flake: 3.4 } }), 160],
          [mid(VICTORY, IDLE, 0.5), 120],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (and the passive's)
// ---------------------------------------------------------------------------

/** A small four-point glint painted flat. */
function sparkle(b: { set(x: number, y: number, c: number): void }, cx: number, cy: number, r: number, core: number, arm: number) {
  b.set(cx, cy, core);
  for (let i = 1; i <= r; i++) {
    const c = i === 1 ? core : arm;
    b.set(cx + i, cy, c);
    b.set(cx - i, cy, c);
    b.set(cx, cy + i, c);
    b.set(cx, cy - i, c);
  }
}

export const rimeScholar: ChampionArt = {
  char,
  iconBg: MAT.ice,
  icons: {
    pale_strike: () =>
      compose(MAT.ice, glyph((d) => {
        crystal(d, v(9, 13), v(33, 29), 2.6, 10, ICE);
      }), (b) => {
        // a few streaks of cold behind it, a glint where it strikes
        for (const [x0, y0, n] of [[4, 22, 7], [7, 30, 9], [12, 34, 5]] as const) {
          for (let i = 0; i < n; i++) b.set(x0 + i, y0 - Math.round(i * 0.66), i % 2 ? ICE.ramp[3] : ICE.ramp[4]);
        }
        sparkle(b, 32, 8, 3, ACCENT.white, ICE.ramp[4]);
      }),
    rimebind: () =>
      compose(MAT.ice, glyph((d) => {
        // a ring of rime closing on the ground, crystals rising from it
        for (const [x, h, w] of [[11, 14, 2.4], [20, 20, 3], [29, 13, 2.4]] as const) crystal(d, v(x, 9), v(x + (x - 20) * 0.2, 9 + h), w, 10 + x * 0.01, ICE);
      }), (b) => {
        for (let a = 0; a < Math.PI * 2; a += 0.04) {
          const x = Math.round(20 + Math.cos(a) * 15), y = Math.round(31 + Math.sin(a) * 4.5);
          b.set(x, y, Math.sin(a) > 0 ? ICE.ramp[4] : ICE.ramp[3]);
        }
        sparkle(b, 9, 9, 2, ACCENT.white, ICE.ramp[4]);
        sparkle(b, 32, 12, 2, ACCENT.white, ICE.ramp[4]);
      }),
    cold_rebuke: () =>
      compose(MAT.ice, glyph((d) => {
        // the cold itself: a great six-armed flake of ice
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * 360 + 90;
          crystal(d, v(17, 17), at(v(17, 17), a, 13), 2.2, 10 + k * 0.01, ICE);
        }
      }), (b) => {
        // the critical blow that wakes it, broken on the flake
        const bolt: [number, number][] = [[37, 3], [33, 8], [35, 10], [30, 15], [31, 17], [27, 21]];
        for (let i = 0; i < bolt.length - 1; i++) {
          const [x0, y0] = bolt[i], [x1, y1] = bolt[i + 1];
          line(b, x0, y0, x1, y1, ACCENT.orange);
          line(b, x0 + 1, y0, x1 + 1, y1, ACCENT.goldHot);
        }
        for (const [x, y] of [[26, 20], [25, 22], [28, 22], [26, 23]]) b.set(x, y, ACCENT.white);
      }),
  },
};

void angleOf;
void D2R;
void dir;
void ease;
void lerpV;
void line;
