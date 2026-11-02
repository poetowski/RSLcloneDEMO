// The Executioner (docs/DESIGN_DECISIONS.md section 77, 2026-11-02: Jakub's choice of the second
// of three concepts I proposed, renamed by him, "Make his design wearing white instead of black").
// The Sanguine Dominion's headsman: huge and broad, a white leather hood over his whole head with
// two eye holes, its cape falling to his shoulders; a bare, scarred torso; a long crimson tabard
// hanging from his belt with the Dominion's black hexagon; white leather breeches, bracers and
// boots; a pair of iron manacles on a chain at his belt, which he swings in Shackle; a great axe
// on a long haft, a broad crescent blade (the silhouette, with the pointed hood). The white is his
// word; red and black are the Dominion's heraldry (DESIGN_DECISIONS.md 3.2). His affinity (Tide)
// sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, INK, MAT } from '../palette.ts';
import { leg, smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, ik2, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 36,
  thigh: 17,
  shin: 16.4,
  ankleH: 3,
  footLen: 8,
  spine: 25,
  neck: 6,
  upperArm: 14.4,
  foreArm: 13.6,
  shoulderDrop: 5,
  shoulderN: -5,
  shoulderF: 5.6,
  hipN: -2.8,
  hipF: 2.8,
};

const SK = MAT.skinTan, WL = MAT.whiteCloth, CR = MAT.crimson, IR = MAT.iron, ST = MAT.steel, WD = MAT.wood, DL = MAT.darkleather;

/** The axe's streak: plain white with the steel's light, the colour of motion. */
const SWING = { core: ACCENT.white, edge: ST.ramp[4] };

/** The axe, measured from the near hand: the haft's head end, and the far hand down the haft. */
const HEAD = 34, LOWER = 9;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const ang = P.axeAng ?? 140;
  const two = (P.two ?? 1) >= 0.5;
  void info;

  if (info.def.smear && info.prev) {
    const from = info.prev.pose.p.axeAng ?? ang;
    smear(d, s.hN, P.sweep ?? from, ang, HEAD + 4, 14, SWING, 3);
  }

  hoodCape(d, s, 4);

  leg(d, s, 'F', legCfg(10, -1));

  // the far arm: on the haft with both hands, or free with the chain (Shackle)
  const far = farArm(s, ang, two);
  d.capsule({ mat: SK, z: 20, group: 'armF', shade: -1 }, s.sF, far.e, 4.4, 3.8);
  d.capsule({ mat: SK, z: 20.1, group: 'armF', shade: -1 }, far.e, far.h, 3.8, 3.2);
  bracer(d, far.e, far.h, 20.2, -1, 'armF');
  if (!two && P.chain !== undefined) chain(d, s, far.h, P, 21);

  torso(d, s, 30);
  head(d, s, 38);

  leg(d, s, 'N', legCfg(50, 0));
  tabard(d, s, P, 52);
  if (two || P.chain === undefined) manacles(d, s, P, 53);

  axe(d, s.hN, ang, 56);
  if (two) d.ellipse({ mat: SK, z: 57, group: 'handF', shade: -1 }, far.h, 3, 2.6, ang);
  d.capsule({ mat: SK, z: 60, group: 'armN' }, s.sN, s.eN, 4.6, 4.0);
  d.capsule({ mat: SK, z: 60.1, group: 'armN' }, s.eN, s.hN, 4.0, 3.4);
  bracer(d, s.eN, s.hN, 60.2, 0, 'armN');
  d.ellipse({ mat: SK, z: 60.3, group: 'handN' }, s.hN, 3.2, 2.8, s.loN);
}

const legCfg = (z: number, shade: number) => ({
  thigh: WL, shin: WL, foot: WL, rThigh: [5.6, 4.6] as [number, number], rShin: [4.4, 3.6] as [number, number], z, shade, footStyle: 'boot' as const,
  boot: { mat: WL, from: 0.45, r: [4.2, 3.8] as [number, number], cuff: WL },
});

function farArm(s: Skel, ang: number, two: boolean): { e: V; h: V } {
  if (!two) return { e: s.eF, h: s.hF };
  const r = ik2(s.sF, at(s.hN, ang, -LOWER), D.upperArm, D.foreArm, (s.pose.p.bendF ?? -1) as number);
  return { e: r.mid, h: r.end };
}

/** A white leather bracer from the wrist halfway up the forearm, laced. */
function bracer(d: Draw, el: V, ha: V, z: number, shade: number, group: string) {
  const a = { x: el.x + (ha.x - el.x) * 0.45, y: el.y + (ha.y - el.y) * 0.45 };
  d.capsule({ mat: WL, z, group, shade }, a, { x: ha.x + (el.x - ha.x) * 0.12, y: ha.y + (el.y - ha.y) * 0.12 }, 4.0, 3.7);
}

function torso(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [[0, 8, 8.4], [5, 8.6, 9.4], [10, 9.4, 10.6], [15, 10.6, 11.2], [20, 10.6, 9.6], [23, 8, 6], [25, 4, 3]]);
  d.poly({ mat: SK, z, group: 'body' }, body, { kind: 'cyl', a: s.T(0, 1), b: s.T(25, 1), r: 11, bevel: 1.4 });
  // the chest and the belly's line, and the old scars across them
  d.line({ mat: SK, z: z + 0.1, group: 'body', line: 'none' }, s.T(15.4, 2), s.T(15.8, 10.2), SK.ramp[2]);
  d.line({ mat: SK, z: z + 0.1, group: 'body', line: 'none' }, s.T(6, 9), s.T(13, 9.4), SK.ramp[2]);
  d.line({ mat: SK, z: z + 0.15, group: 'scars', line: 'none' }, s.T(19, 3), s.T(12, 9), SK.ramp[4]);
  d.line({ mat: SK, z: z + 0.15, group: 'scars', line: 'none' }, s.T(10, 2), s.T(7, 7), SK.ramp[4]);
  // the belt of white leather with an iron buckle
  d.poly({ mat: WL, z: z + 0.3, group: 'belt' }, [s.T(4.4, -8.4), s.T(4.6, 9.2), s.T(1.6, 9), s.T(1.4, -8.2)], { kind: 'cyl', a: s.T(1.4, 0), b: s.T(4.6, 0), r: 9 });
  d.poly({ mat: IR, z: z + 0.35, group: 'buckle' }, [s.T(4.8, 6.6), s.T(4.8, 9.4), s.T(1.2, 9.4), s.T(1.2, 6.6)], { kind: 'bevel', w: 1 });
}

/** The long crimson tabard hanging from the belt in front, the Dominion's black hexagon on it, swaying. */
function tabard(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const top = s.T(2, 6.4);
  const w = Math.sin(P.wave ?? 0) * 1.4;
  const len = 22;
  const a = v(top.x - 5, top.y), b = v(top.x + 5, top.y);
  const c = v(top.x + 5.6 + w, top.y - len), e = v(top.x - 4.4 + w, top.y - len);
  d.poly({ mat: CR, z, group: 'tabard', line: 'soft', tex: (h) => (Math.sin(h.u * 9) > 0.8 ? -1 : 0) }, [a, b, c, e], { kind: 'cyl', a: v(top.x, top.y), b: v(top.x + w, top.y - len), r: 6, bevel: 1 });
  // the hexagon
  const hc = v(top.x + 0.4 + w * 0.4, top.y - 8);
  const hex: V[] = [0, 60, 120, 180, 240, 300].map((deg) => at(hc, deg + 30, 3.2));
  d.poly({ mat: CR, z: z + 0.05, group: 'hex', line: 'none', color: INK.black }, hex);
  // the hem's fringe
  for (let k = 0; k < 4; k++) d.pixels({ mat: CR, z: z + 0.06, group: 'tabard', line: 'none' }, [{ p: v(e.x + 1 + k * 2.6, e.y - 1), c: CR.ramp[1] }]);
}

/** The manacles hanging from his belt at the near hip, two iron cuffs and a short chain. */
function manacles(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const hook = s.T(2.4, -5.6);
  const sw = Math.sin(P.wave ?? 0) * 1.2;
  let p = hook;
  for (let k = 0; k < 3; k++) {
    p = v(p.x + sw * 0.4, p.y - 2.4);
    d.circle({ mat: IR, z: z + k * 0.01, group: 'mchain' + k, line: 'soft' }, p, 1.1);
  }
  d.ellipse({ mat: IR, z: z + 0.05, group: 'cuff1', line: 'soft' }, v(p.x - 1.6, p.y - 2.6), 2.6, 2.0, 10);
  d.ellipse({ mat: IR, z: z + 0.06, group: 'cuff2', line: 'soft' }, v(p.x + 2, p.y - 3.4), 2.6, 2.0, -20);
}

/** In Shackle the manacles swing from the far hand on their chain, `chain` the angle of the throw. */
function chain(d: Draw, s: Skel, hand: V, P: Record<string, number>, z: number) {
  const a = P.chain ?? -90;
  let p = hand;
  for (let k = 0; k < 6; k++) {
    p = at(p, a + k * (P.chainCurl ?? 0), 3);
    d.circle({ mat: IR, z: z + k * 0.01, group: 'chain' + k, line: 'soft' }, p, 1.15);
  }
  d.ellipse({ mat: IR, z: z + 0.1, group: 'scuff1', line: 'soft' }, at(p, a, 2.4), 2.8, 2.2, a);
  d.ellipse({ mat: IR, z: z + 0.11, group: 'scuff2', line: 'soft' }, at(at(p, a, 3.4), a + 90, 2.6), 2.8, 2.2, a + 60);
  void s;
}

/** The white leather hood over his whole head, peaked, two eye holes in the dark of it, a seam down the front. */
function head(d: Draw, s: Skel, z: number) {
  const H = (x: number, y: number) => s.H(x * 1.15, y * 1.15);
  d.capsule({ mat: SK, z: z - 0.5, group: 'neck' }, s.neck, H(0, -4), 4.6, 4.4);
  d.poly({ mat: WL, z, group: 'hood' }, [H(-6.6, -5), H(-7.4, 1), H(-6, 6.4), H(-2.4, 10.4), H(0.4, 13.2), H(2.4, 9.4), H(5.6, 5.6), H(7.2, 1), H(7, -3.6), H(5, -6.4), H(0, -7.4)], { kind: 'dome', c: H(0, 1.6), r: 9.4, bevel: 1.3 });
  // the eye holes and the dark in them, a faint glint of the eyes
  for (const [x, y] of [[3.4, 1.6], [6.0, 1.4]] as const) {
    d.ellipse({ mat: WL, z: z + 0.1, group: 'eyes', line: 'none', color: INK.black }, H(x, y), 1.5, 1.1, 0);
  }
  d.pixels({ mat: WL, z: z + 0.15, group: 'eyes', line: 'none', outline: false }, [{ p: H(6.2, 1.6), c: ACCENT.ashEyeDim }]);
  // the seam and the stitches down the front
  d.line({ mat: WL, z: z + 0.1, group: 'hood', line: 'none' }, H(6.6, -1), H(5.6, -6), WL.ramp[2]);
  d.line({ mat: WL, z: z + 0.1, group: 'hood', line: 'none' }, H(1.6, 10.4), H(5.4, 5.4), WL.ramp[2]);
}

/** The hood's cape falling over his shoulders, white, its edge cut in points. */
function hoodCape(d: Draw, s: Skel, z: number) {
  const T = s.T;
  d.poly({ mat: WL, z: z + 26, group: 'hoodCape', line: 'soft' }, [T(26, -5), T(26, 5), T(21, 9.4), T(18.4, 7), T(17.6, 9), T(16.8, 3), T(17.4, -2), T(16.4, -6), T(18.4, -10), T(21, -9)], { kind: 'dome', c: T(22, 0), r: 9, bevel: 1.2 });
}

/** The axe: a long haft of dark wood bound in white leather at the grip, an iron collar, a broad crescent blade with the hexagon stamped in it. */
function axe(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: WD, z, group: 'haft', tex: (h) => (Math.sin(h.u * 30) > 0.9 ? 1 : 0) }, f(-14, 0), f(HEAD + 2, 0), 1.6, 1.6);
  d.capsule({ mat: WL, z: z + 0.02, group: 'grip', tex: (h) => (Math.floor(h.u * 10) % 2 ? -1 : 0) }, f(-12, 0), f(2, 0), 1.9, 1.9);
  d.capsule({ mat: IR, z: z + 0.05, group: 'collar' }, f(HEAD - 6, 0), f(HEAD + 1, 0), 2.4, 2.4);
  // the blade: broad, flaring from a narrow neck at the haft to a long curved edge, its edge bright
  d.poly(
    { mat: ST, z: z + 0.1, group: 'blade' },
    [f(HEAD - 5, 1.6), f(HEAD - 12, 13), f(HEAD - 13, 19), f(HEAD - 8, 21.6), f(HEAD, 22.4), f(HEAD + 7, 20.6), f(HEAD + 9, 15), f(HEAD + 4, 9), f(HEAD + 2, 1.6)],
    { kind: 'cyl', a: f(HEAD - 2, 2), b: f(HEAD - 2, 22), r: 10, bevel: 1.2 },
  );
  d.ribbon({ mat: ST, z: z + 0.12, group: 'blade', line: 'none' }, [f(HEAD - 12.4, 18.4), f(HEAD - 7.6, 21), f(HEAD, 21.8), f(HEAD + 6.4, 20), f(HEAD + 8.4, 15.4)], [0.7, 0.8, 0.8, 0.8, 0.7]);
  // a small back spike, and the hexagon stamped in the blade
  d.poly({ mat: IR, z: z + 0.08, group: 'spike' }, [f(HEAD - 4, -1.6), f(HEAD - 1, -6), f(HEAD + 1, -1.6)], { kind: 'bevel', w: 0.8 });
  const hc = f(HEAD - 2.4, 12);
  d.poly({ mat: ST, z: z + 0.14, group: 'blade', line: 'none', color: ST.ramp[1] }, [0, 60, 120, 180, 240, 300].map((deg) => at(hc, deg + 30, 2.6)));
}

// ---------------------------------------------------------------------------
// Poses & animations (the axe's angle runs from the near hand to the head: 0 forward, 90 up)
// ---------------------------------------------------------------------------

const th = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, armF: { up: -90, lo: -60 }, ...extra, p: { axeAng: ang, two: 1, ...(extra.p ?? {}) } });

// At rest: the axe on his near shoulder, both hands on the haft before his chest.
const IDLE: Pose = th(v(14, 42), 132, { y: -1, torso: 88, head: 88, legN: { ik: v(-11, 3) }, legF: { ik: v(11, 3) } });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -1 - b, torso: 88 - b, armN: { ik: v(14, 42 - b), bend: -1 }, p: { axeAng: 132 + b, wave: a } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11.5 * Math.cos(ph), y: 3 + (sn > 0 ? 6.5 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return th(v(13 + sw, 41 + bob), 138 + sw * 3, { y: bob - 2, torso: 76, head: 80, legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang, p: { wave: a * 2 } });
}

// Sentence: the axe up over the shoulder and down through the target.
const SE_WIND = th(v(0, 68), 160, { x: -3, y: -1, torso: 98, head: 94, legN: { ik: v(-12, 3) }, legF: { ik: v(9, 3) }, p: { wave: 1 } });
const SE_CUT = th(v(22, 30), -40, { x: 8, y: -5, torso: 64, head: 74, legN: { ik: v(-11, 3) }, legF: { ik: v(17, 3) }, p: { wave: 2 } });
const SE_HOLD = th(v(22, 28), -50, { x: 8, y: -5, torso: 62, head: 72, legN: { ik: v(-11, 3) }, legF: { ik: v(17, 3) }, p: { wave: 3 } });

// Shackle: the axe kept low in the near hand, the manacles whirled on their chain in the far, then flung at the enemy.
const sh = (hand: V, ang: number, chainAng: number, curl: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  th(hand, ang, { ...extra, p: { two: 0, chain: chainAng, chainCurl: curl, ...(extra.p ?? {}) } });
const SH_LOW = sh(v(12, 30), -60, -90, 0, { x: -2, torso: 86, head: 86, armF: { up: -100, lo: -80 }, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) } });
const SH_WHIRL1 = sh(v(12, 30), -60, 160, -20, { x: -2, torso: 90, head: 90, armF: { up: 120, lo: 100 }, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, p: { wave: 1 } });
const SH_WHIRL2 = sh(v(12, 30), -60, 40, -20, { x: -2, torso: 90, head: 90, armF: { up: 110, lo: 80 }, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, p: { wave: 1.6 } });
const SH_THROW = sh(v(14, 30), -60, 2, 1, { x: 7, y: -4, torso: 70, head: 78, armF: { up: 20, lo: 4 }, legN: { ik: v(-12, 3) }, legF: { ik: v(16, 3) }, p: { wave: 2.4 } });
const SH_HOLD = sh(v(14, 30), -60, -30, 8, { x: 7, y: -4, torso: 72, head: 78, armF: { up: 10, lo: -10 }, legN: { ik: v(-12, 3) }, legF: { ik: v(16, 3) }, p: { wave: 3 } });

// Final Verdict: the axe lifted slowly high over his head, held while the moment stretches, then all of him comes down after it.
const FV_LIFT = th(v(4, 78), 100, { x: -2, y: 1, torso: 96, head: 100, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, p: { wave: 1 } });
const FV_PEAK = th(v(-2, 80), 150, { x: -4, y: 1, torso: 100, head: 102, legN: { ik: v(-12, 3) }, legF: { ik: v(9, 3) }, p: { wave: 1.4 } });
const FV_FALL = th(v(26, 22), -52, { x: 10, y: -8, torso: 54, head: 66, legN: { ik: v(-12, 3) }, legF: { ik: v(19, 3) }, p: { wave: 2.4, sweep: 150 } });
const FV_HOLD = tweak(FV_FALL, { y: -7, p: { wave: 3 } });

const HURT = th(v(12, 40), 116, { x: -4, y: -1, torso: 100, head: 106, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10, p: { wave: 1 } });
const DEATH_KNEEL = th(v(14, 36), -86, { x: 0, y: -13, torso: 76, head: 60, legN: { ik: v(-14, 3) }, legF: { ik: v(8, 3) }, footN: -60 });
const DEATH_FALL = pose({
  x: 2, y: -21, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { axeAng: -20, two: 0, wave: 2 },
});
const DEATH_DOWN = pose({
  x: 6, y: -27, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { axeAng: 4, two: 0, wave: 3 },
});

// Victory: the axe grounded head down before him, both hands on the haft's end.
const GROUND = th(v(14, 40), -94, { y: -1, torso: 88, head: 90, legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) }, p: { wave: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const waved = (p: Pose, w: number) => tweak(p, { p: { wave: w } });

const char: CharDef = {
  id: 'executioner',
  name: 'Executioner',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SE_WIND, 2, 80),
        ...keys([
          [SE_WIND, 220],
          [mid(SE_WIND, SE_CUT, 0.5), 45],
          [SE_CUT, 80, { smear: true, hit: true }],
          [SE_HOLD, 240],
        ]),
        ...tween(D, SE_HOLD, IDLE, 3, 120, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SH_LOW, 2, 90),
        ...keys([
          [SH_LOW, 120],
          [SH_WHIRL1, 90],
          [SH_WHIRL2, 90],
          [SH_WHIRL1, 80],
          [SH_WHIRL2, 80],
          [SH_THROW, 90, { hit: true }],
          [SH_HOLD, 240],
          [waved(SH_LOW, 3.4), 120],
        ]),
        ...tween(D, SH_LOW, IDLE, 3, 110, ease.inOut),
      ],
    },
    attack3: {
      loop: false,
      frames: [
        ...tween(D, IDLE, FV_LIFT, 3, 110, ease.out),
        ...keys([
          [FV_PEAK, 260],
          [waved(FV_PEAK, 1.8), 260],
          [mid(FV_PEAK, FV_FALL, 0.5), 45],
          [FV_FALL, 90, { smear: true, hit: true }],
          [FV_HOLD, 300],
        ]),
        ...tween(D, FV_HOLD, IDLE, 3, 130, ease.inOut),
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
        [DEATH_KNEEL, 260],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -27.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, GROUND, 2, 100, ease.out),
        ...keys([
          [waved(GROUND, 1.6), 300],
          [waved(GROUND, 2.6), 300],
          [waved(GROUND, 3.6), 300],
          [mid(GROUND, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// icons (glyph space: y up)
// ---------------------------------------------------------------------------

const E = ACCENT;

export const executioner: ChampionArt = {
  char,
  iconBg: CR,
  icons: {
    sentence: () =>
      compose(CR, glyph((d) => axe(d, v(6, 6), 50, 10)), (b) => impactStar(b, 31, 30, 1, 6, 7, FXR.dust[3], E.white)),
    shackle: () =>
      compose(CR, glyph((d) => {
        for (let k = 0; k < 6; k++) d.circle({ mat: IR, z: 10 + k * 0.01, group: 'ich' + k, line: 'soft' }, v(6 + k * 3.6, 30 - k * 2.4), 1.8);
        d.ellipse({ mat: IR, z: 11, group: 'icuff1', line: 'soft' }, v(28, 13), 5, 4, 10);
        d.ellipse({ mat: IR, z: 11.1, group: 'icuff2', line: 'soft' }, v(31, 7), 5, 4, -30);
      })),
    final_verdict: () =>
      compose(CR, glyph((d) => axe(d, v(10, 4), 100, 10)), (b) => {
        for (const [x, y] of [[30, 6], [33, 10], [6, 8]] as const) b.set(x, y, E.white);
      }),
    grim_duty: () =>
      compose(CR, glyph((d) => head(d, ({ H: (x: number, y: number) => v(20 + x * 1.5, 18 + y * 1.5), neck: v(20, 6) } as unknown) as Skel, 10))),
  },
};
