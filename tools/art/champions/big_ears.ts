// Big Ears (docs/DESIGN_DECISIONS.md section 24, Jakub's proposal of
// 2026-10-17): an Elite of the Court of Root, a small humanoid with a large
// head and two big ears, blowing poisoned darts at enemies. So he is a small
// dweller of the undergrowth, the Court's hidden kind: a big round head with
// a short snout and a large amber eye for the dark, two great ears standing
// up from it (the silhouette feature, with the long blowpipe), thin limbs,
// big hands and feet, a dusky mauve hide; a loincloth of dark hide, a sash
// with a bamboo quiver of fletched darts, a gourd of poison at his belt; the
// blowpipe a cane longer than he is tall. What the brief leaves open is a
// first take: his hide's colour, his face and eye, the ears' shape, the
// pipe and the quiver. His affinity sets nothing here (affinities are
// abstract, Jakub, 2026-10-11): his darts carry the green of their poison,
// which is what the skills do (fx/court_of_root.ts).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, FXR, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { leg, torsoPts } from '../parts.ts';
import { angleOf, at, Dims, Draw, ease, ik2, lerpPose, lerpV, pose, Pose, Skel, sub, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 20,
  thigh: 9.6,
  shin: 9.2,
  ankleH: 2.2,
  footLen: 6.8,
  spine: 12.6,
  neck: 3.2,
  upperArm: 9.0,
  foreArm: 8.6,
  shoulderDrop: 3,
  shoulderN: -2.4,
  shoulderF: 2.8,
  hipN: -1.6,
  hipF: 1.6,
};

const DH = MAT.duskHide, EP = MAT.earPink, DL = MAT.darkleather, LE = MAT.leather, CB = MAT.calabash, BN = MAT.bone, RD = MAT.red, WD = MAT.wood, GG = MAT.glowGreen;

/** The blowpipe: its length, and where the near and far hands hold it from the mouthpiece. */
const PIPE = 36, NEAR = 15, FAR = 5;

interface Pipe {
  back: V;
  front: V;
  ang: number;
}

/**
 * The blowpipe at `pipeAng`: held in the hands (`aim` 0, the near hand `NEAR`
 * px from its mouthpiece) or up at his lips (`aim` 1); between the two,
 * blended. Both hands are solved onto it in build().
 */
function pipeAt(s: Skel, P: Record<string, number>): Pipe {
  const ang = P.pipeAng ?? -12;
  const aim = Math.max(0, Math.min(1, P.aim ?? 0));
  const held = at(s.hN, ang, -NEAR);
  const back = lerpV(held, mouth(s), aim);
  return { back, front: at(back, ang, PIPE), ang };
}

/** Where his lips are, head-local: the end of the snout. */
const mouth = (s: Skel) => s.H(8.6, -3.6);

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const pipe = pipeAt(s, P);
  // both hands on the pipe, whatever the pose said of them
  const nearArm = ik2(s.sN, at(pipe.back, pipe.ang, NEAR), D.upperArm, D.foreArm, -1);
  const farArm = ik2(s.sF, at(pipe.back, pipe.ang, FAR + (P.farSlide ?? 0)), D.upperArm, D.foreArm, (P.bendF ?? -1));

  // the quiver on his back, its darts' fletches over his shoulder
  quiver(d, s, P, 4);

  // far leg, the far arm behind the body
  leg(d, s, 'F', legCfg(10, -1));
  limb(d, s.sF, farArm.mid, farArm.end, 20, 'armF', -1, farArm.a2);

  // torso: bare hide, a little pot belly, the sash across it, the loincloth and the belt with its gourd
  const torso = torsoPts(s, [
    [0, 4.0, 4.4],
    [3, 4.4, 5.6],
    [6, 4.6, 5.9],
    [9, 4.4, 4.8],
    [11, 3.8, 3.4],
    [12.6, 2.4, 2.0],
  ]);
  d.poly({ mat: DH, z: 30, group: 'body', tex: (_h, x, y) => ((x * 3 + y * 5) % 11 === 0 ? -1 : 0) }, torso, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(12.6, 0.6), r: 5.6, bevel: 1.2 });
  d.ribbon({ mat: LE, z: 30.4, group: 'sash' }, [s.T(12.0, 3.0), s.T(8.6, 1.4), s.T(5.0, -1.6), s.T(2.4, -4.4)], [0.9, 1.0, 1.0, 0.9]);
  d.poly({ mat: DL, z: 32, group: 'belt' }, [s.T(1.8, -4.6), s.T(2.0, 5.0), s.T(0.6, 4.9), s.T(0.4, -4.4)], { kind: 'cyl', a: s.T(0, 0), b: s.T(2, 0), r: 5 });
  loin(d, s, 34);
  gourd(d, s, info, 34.5);
  necklace(d, s, 36.5);

  head(d, s, P);

  // near leg, the pipe, the near arm over it
  leg(d, s, 'N', legCfg(50, 0));
  blowpipe(d, pipe, 55);
  limb(d, s.sN, nearArm.mid, nearArm.end, 60, 'armN', 0, nearArm.a2);
}

const legCfg = (z: number, shade: number) => ({
  thigh: DH, shin: DH, foot: DH, rThigh: [2.7, 2.1] as [number, number], rShin: [2.0, 1.6] as [number, number], z, shade, footStyle: 'bare' as const,
});

/** A thin arm of bare hide and a big hand. */
function limb(d: Draw, sh: V, el: V, ha: V, z: number, group: string, shade: number, lo: number) {
  d.capsule({ mat: DH, z, group, shade }, sh, el, 2.0, 1.7);
  d.capsule({ mat: DH, z: z + 0.1, group, shade }, el, ha, 1.7, 1.5);
  d.ellipse({ mat: DH, z: z + 0.3, group, shade }, ha, 2.4, 2.0, lo);
}

/** The loincloth: a flap of dark hide at the front between the legs and a shorter one behind. */
function loin(d: Draw, s: Skel, z: number) {
  const ang = Math.max(-116, Math.min(-64, (s.thN + s.thF) / 2));
  const f0 = s.T(1.0, -0.8), f1 = s.T(1.0, 5.2);
  const f2 = at(f1, ang + 6, 7.4), f3 = at(f0, ang - 2, 7.0);
  d.poly({ mat: DL, z, group: 'loin', tex: (h) => (Math.sin(h.v * 8) > 0.8 ? -1 : 0) }, [f0, f1, f2, lerpV(f2, f3, 0.5), f3], { kind: 'cyl', a: lerpV(f0, f1, 0.5), b: lerpV(f2, f3, 0.5), r: 3.6, bevel: 1 });
  const b0 = s.T(1.2, -4.6), b1 = s.T(1.2, -1.4);
  d.poly({ mat: DL, z: 11.5, group: 'loinB', shade: -1 }, [b0, b1, at(b1, ang - 8, 5), at(b0, ang - 14, 5.4)], { kind: 'bevel', w: 1 });
}

/** A small gourd of poison on a cord at his near hip, a green stopper; it swings a little with his moves. */
function gourd(d: Draw, s: Skel, info: BuildInfo, z: number) {
  const top = s.T(1.2, 4.0);
  const before = info.prev ? info.prev.T(1.2, 4.0) : top;
  const swing = Math.max(-40, Math.min(40, -(top.x - before.x) * 6));
  const down = s.torso < 55 ? s.torso - 160 : -90 + swing;
  const c = at(top, down, 3.6);
  d.capsule({ mat: LE, z, group: 'gourd', line: 'none' }, top, at(top, down, 1.4), 0.5, 0.5);
  d.ellipse({ mat: CB, z: z + 0.1, group: 'gourd' }, c, 2.4, 2.8, down + 90);
  d.circle({ mat: CB, z: z + 0.11, group: 'gourd' }, at(c, down, -2.6), 1.4);
  d.pixels({ mat: CB, z: z + 0.12, group: 'gourd' }, [{ p: at(c, down, -3.8), c: GG.ramp[3] }]);
}

/** A string of small teeth round his neck. */
function necklace(d: Draw, s: Skel, z: number) {
  const px: { p: V; c: RGBA }[] = [];
  for (let k = 0; k < 4; k++) px.push({ p: s.T(11.6 - k * 0.2, 2.6 - k * 1.6), c: k % 2 ? BN.ramp[3] : BN.ramp[4] });
  d.pixels({ mat: DH, z, group: 'body' }, px);
}

/** The quiver: a short tube of cane slung across his back, three darts' fletches standing out of it, white and red. */
function quiver(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const a = s.T(3.0, -4.2), b = s.T(12.6, -10.8);
  d.capsule({ mat: CB, z, group: 'quiver', tex: (h) => (Math.floor(h.u * 5) % 2 ? -1 : 0) }, a, b, 2.0, 2.2);
  d.capsule({ mat: DL, z: z + 0.05, group: 'quiver', line: 'none' }, lerpV(a, b, 0.3), lerpV(a, b, 0.36), 2.3, 2.3);
  const ang = angleOf(sub(b, a));
  [[-1.2, 0], [0.2, 1], [1.4, 2]].forEach(([w, k]) => {
    const root = at(at(b, ang, 0.6), ang + 90, w);
    const tip = at(root, ang + (k - 1) * 9 + (P.wave ? Math.sin(P.wave + k) * 2 : 0), 3.6);
    d.capsule({ mat: k === 1 ? RD : BN, z: z + 0.1 + k * 0.01, group: 'fletch' + k, line: 'soft' }, root, tip, 0.9, 1.3);
  });
}

/** The blowpipe: a cane longer than he is tall, three bindings of dark hide, a mouthpiece of bone and a ring at its end. */
function blowpipe(d: Draw, p: Pipe, z: number) {
  d.capsule({ mat: CB, z, group: 'pipe', tex: (h) => (Math.sin(h.u * 46) > 0.9 ? -1 : 0) }, p.back, p.front, 1.0, 0.9);
  for (const k of [0.3, 0.55, 0.8]) d.capsule({ mat: DL, z: z + 0.05, group: 'pipe', line: 'none' }, at(p.back, p.ang, PIPE * k - 0.6), at(p.back, p.ang, PIPE * k + 0.6), 1.25, 1.25);
  d.capsule({ mat: BN, z: z + 0.06, group: 'pipe' }, p.back, at(p.back, p.ang, 2.4), 1.35, 1.15);
  d.circle({ mat: CB, z: z + 0.06, group: 'pipe', shade: -1 }, p.front, 1.2);
}

/**
 * The head: a big round skull and a short snout, one large amber eye for the
 * dark, a small nose, cheeks that puff out before a dart (`puff`); the two
 * great ears standing up from the back of the skull, swaying slowly and laid
 * back in a run (`earN`, `earF`).
 */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  const ha = s.headDir - 90;
  d.capsule({ mat: DH, z: 37.2, group: 'neck' }, s.neck, H(-0.6, -4.0), 2.4, 2.6);
  // the far ear behind the skull, leaning forward
  ear(d, H(1.6, 6.6), s.headDir - 16 + (P.earF ?? 0), 24, 5.6, 37.0, -1, 'earF');
  // skull, snout and lower jaw
  d.ellipse({ mat: DH, z: 38, group: 'head' }, H(-0.8, 1.4), 9.8, 8.8, ha);
  d.ellipse({ mat: DH, z: 38.05, group: 'head' }, H(5.6, -2.4), 5.0, 3.8, ha);
  d.ellipse({ mat: DH, z: 38.04, group: 'head', shade: -1 }, H(4.0, -5.0), 3.8, 2.0, ha);
  if (P.puff) d.ellipse({ mat: DH, z: 38.06, group: 'head' }, H(6.0, -2.8), 4.4, 3.6, ha);
  // the near ear, broad, splayed back from the top of the skull
  ear(d, H(-3.6, 6.2), s.headDir + 30 + (P.earN ?? 0), 25, 6.4, 38.5, 0, 'earN');
  // the face: a big eye with its lid, the nose at the snout's end, the mouth
  const px: { p: V; c: RGBA }[] = [];
  const e = H(3.6, 1.8);
  const E = (dx: number, dy: number) => v(Math.floor(e.x) + 0.5 + dx, Math.floor(e.y) + 0.5 + dy);
  for (let dx = -1; dx <= 2; dx++) for (let dy = -1; dy <= 2; dy++) if (!((dx === -1 || dx === 2) && (dy === -1 || dy === 2))) px.push({ p: E(dx, dy), c: ACCENT.eyeAmber });
  px.push({ p: E(0, 0), c: INK.eye }, { p: E(1, 0), c: INK.eye }, { p: E(1, 1), c: INK.eye }, { p: E(0, 1), c: INK.eye }, { p: E(-1, 1), c: INK.eyeWhite });
  for (const dx of [-2, -1, 0, 1, 2, 3]) px.push({ p: E(dx, 3), c: DH.ramp[1] });
  px.push({ p: H(10.2, -1.8), c: DH.ramp[0] }, { p: H(9.8, -2.6), c: DH.ramp[1] });
  if (P.blow) px.push({ p: H(9.0, -3.8), c: INK.black });
  else if (!P.aim || P.aim < 0.5) for (const k of [5.6, 6.6, 7.6, 8.4]) px.push({ p: H(k, -4.6 + (k - 5.6) * 0.25), c: DH.ramp[1] });
  d.pixels({ mat: DH, z: 38.6, group: 'head' }, px);
}

/** One ear: a long leaf of hide from `base` along `ang`, the pink skin inside it, a tuft at its tip. */
function ear(d: Draw, base: V, ang: number, len: number, w: number, z: number, shade: number, group: string) {
  const edge = (k: number) => {
    const L: V[] = [], R: V[] = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const c = at(base, ang, len * t);
      const wt = w * k * (t < 0.2 ? 0.75 + t * 1.25 : Math.max(0.05, 1 - Math.pow((t - 0.2) / 0.8, 1.6)));
      L.push(at(c, ang + 90, wt));
      R.push(at(c, ang - 90, wt * 0.9));
    }
    return { L, R };
  };
  const o = edge(1);
  const tip = at(base, ang, len + 1);
  d.poly({ mat: DH, z, group, shade, line: 'soft' }, [...o.L, tip, ...[...o.R].reverse()], { kind: 'cyl', a: base, b: tip, r: w + 0.5, bevel: 1 });
  const i = edge(0.52);
  const inner = [...i.L.slice(1, 7), ...[...i.R.slice(1, 7)].reverse()].map((p) => at(p, ang + 90, w * 0.12));
  d.poly({ mat: EP, z: z + 0.05, group, shade, line: 'none' }, inner, { kind: 'cyl', a: at(base, ang, len * 0.15), b: at(base, ang, len * 0.85), r: w * 0.6 });
  d.pixels({ mat: DH, z: z + 0.06, group }, [{ p: at(tip, ang, 0.6), c: DH.ramp[4] }, { p: at(at(tip, ang, -1.2), ang + 90, 0.9), c: DH.ramp[5] }]);
}

// ---------------------------------------------------------------------------
// Poses & animations (the pipe's `pipeAng` runs from the mouthpiece toward its end: 0 forward)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: -1,
  torso: 76,
  head: 94,
  legN: { ik: v(-6, 3) },
  legF: { ik: v(6, 3) },
  armN: { up: -40, lo: 6 },
  armF: { up: -70, lo: 0 },
  p: { pipeAng: -14, aim: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -1 - b,
    torso: 76 - b,
    armN: { up: -40 + b * 2, lo: 6 + b },
    // the ears sway, slowly and each at its own pace
    p: { earN: Math.sin(a) * 3, earF: Math.sin(a + 1.9) * 2.5, wave: a },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -8 * Math.cos(ph), y: 3 + (sn > 0 ? 5 * sn : 0), ang: sn > 0 ? -24 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return pose({
    y: bob - 1,
    torso: 64,
    head: 86,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -36 + sw * 8, lo: 4 + sw * 8 },
    armF: { up: -80, lo: -10 },
    // ears laid back, streaming
    p: { pipeAng: -20 + sw * 3, aim: 0, earN: 30 + sw * 4, earF: 26 - sw * 4, wave: a * 2 },
  });
}

// Poison Dart: the pipe comes up to his lips, he fills his cheeks, takes aim, and blows.
const PD_RAISE = pose({
  x: -1, y: -1, torso: 80, head: 92,
  legN: { ik: v(-7, 3) }, legF: { ik: v(6, 3) },
  armN: { up: -30, lo: 20 }, armF: { up: -60, lo: 10 },
  p: { pipeAng: 2, aim: 0.6, earN: -4, earF: -3 },
});
const PD_AIM = pose({
  x: -1, y: -2, torso: 82, head: 90,
  legN: { ik: v(-8, 3) }, legF: { ik: v(6, 3) },
  p: { pipeAng: 3, aim: 1, puff: 1, earN: -10, earF: -6 },
});
const PD_BLOW = tweak(PD_AIM, { x: -2, torso: 84, p: { puff: 0, blow: 1, earN: -12, earF: -8 } });
const PD_HOLD = tweak(PD_AIM, { x: -2, torso: 83, p: { puff: 0, blow: 0, earN: -8, earF: -5 } });

// Dart Volley: a deep breath, ears laid back, then three quick darts at every enemy.
const DV_BREATH = pose({
  x: -2, y: 0, torso: 88, head: 96,
  legN: { ik: v(-8, 3) }, legF: { ik: v(6, 3) },
  p: { pipeAng: 3, aim: 1, puff: 1, earN: 16, earF: 12 },
});
const DV_BLOW = (k: number) => tweak(PD_BLOW, { x: -2 - k * 0.5, p: { pipeAng: 3, earN: -12 + k * 2 } });
const DV_FILL = (k: number) => tweak(PD_AIM, { x: -1 - k * 0.5, p: { pipeAng: 3, puff: 1, earN: -8 + k * 2 } });

const HURT = pose({
  x: -4, y: -1, torso: 96, head: 104,
  legN: { ik: v(-9, 3) }, legF: { ik: v(6, 4) }, footF: 10,
  armN: { up: -100, lo: -30 }, armF: { up: -70, lo: 0 },
  p: { pipeAng: 30, aim: 0, earN: 34, earF: 30 },
});
const DEATH_KNEEL = pose({
  x: 0, y: -9, torso: 70, head: 60,
  legN: { ik: v(-10, 3) }, legF: { ik: v(6, 3) }, footN: -60,
  armN: { up: -84, lo: -60 }, armF: { up: -80, lo: -60 },
  p: { pipeAng: -50, aim: 0, earN: 30, earF: 24 },
});
const DEATH_FALL = pose({
  x: 2, y: -14, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { pipeAng: -30, aim: 0, earN: 40, earF: 36 },
});
const DEATH_DOWN = pose({
  x: 6, y: -17, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: -95, footF: -95,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { pipeAng: 4, aim: 0, earN: 50, earF: 44 },
});

// Victory: a hop with the pipe held up over his head, ears up.
const HOP = pose({
  y: 3, torso: 86, head: 98,
  legN: { ik: v(-5, 7) }, legF: { ik: v(5, 6) }, footN: -20, footF: -16,
  armN: { up: 70, lo: 60 }, armF: { up: 80, lo: 70 },
  p: { pipeAng: 0, aim: 0, earN: -6, earF: -4 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'big_ears',
  name: 'Big Ears',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 65, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, PD_RAISE, 2, 80),
        ...keys([
          [PD_RAISE, 100],
          [PD_AIM, 220],
          [PD_BLOW, 70, { hit: true }],
          [PD_HOLD, 180],
        ]),
        ...tween(D, PD_HOLD, IDLE, 2, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, PD_RAISE, 1, 80),
        ...keys([
          [DV_BREATH, 260],
          [DV_FILL(0), 80],
          [DV_BLOW(0), 60, { hit: true }],
          [DV_FILL(1), 110],
          [DV_BLOW(1), 60, { hit: true }],
          [DV_FILL(2), 110],
          [DV_BLOW(2), 60, { hit: true }],
          [PD_HOLD, 200],
        ]),
        ...tween(D, PD_HOLD, IDLE, 2, 100, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 92, head: 100 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 220],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -18 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, mid(IDLE, HOP, 0.5), 1, 90),
        ...keys([
          [HOP, 140],
          [tweak(HOP, { y: 5, p: { earN: -10, earF: -8 } }), 120],
          [mid(HOP, IDLE, 0.4), 100],
          [HOP, 140],
          [tweak(HOP, { y: 5, p: { earN: -10, earF: -8 } }), 120],
          [mid(HOP, IDLE, 0.5), 110],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

/** A dart in an icon: a slim shaft, a green poisoned point and a fluffy white-and-red fletch at its tail. */
function iconDart(d: Draw, tail: V, tip: V, z: number) {
  const ang = angleOf(sub(tip, tail));
  d.capsule({ mat: WD, z, group: 'idart' + z }, tail, at(tip, ang, -3), 0.9, 0.8);
  d.poly({ mat: GG, z: z + 0.1, group: 'idart' + z }, [at(tip, ang, -4), at(at(tip, ang, -3), ang + 90, 1.4), tip, at(at(tip, ang, -3), ang - 90, 1.4)], { kind: 'bevel', w: 1 });
  d.ellipse({ mat: BN, z: z + 0.05, group: 'idart' + z }, at(tail, ang, 1.4), 3.0, 2.2, ang);
  d.ellipse({ mat: RD, z: z + 0.06, group: 'idart' + z }, at(tail, ang, 0.2), 1.6, 1.4, ang);
}

/** The great ears and the eye in an icon. */
function iconHead(d: Draw, c: V, z: number) {
  ear(d, v(c.x - 1, c.y + 6), 98, 17, 4.4, z - 0.5, -1, 'ieF');
  d.ellipse({ mat: DH, z, group: 'ihead' }, c, 9, 8, 0);
  d.ellipse({ mat: DH, z: z + 0.05, group: 'ihead' }, v(c.x + 6, c.y - 3), 4.6, 3.6, 0);
  ear(d, v(c.x - 4, c.y + 5), 116, 19, 5, z + 0.2, 0, 'ieN');
}

const E = ACCENT;

export const bigEars: ChampionArt = {
  char,
  iconBg: DH,
  icons: {
    poison_dart: () =>
      compose(DH, glyph((d) => {
        iconDart(d, v(5, 9), v(33, 30), 10);
      }), (b) => {
        // the poison dripping from the point, and the line of its flight (screen space, y down)
        for (const [x, y, c] of [[35, 13, FXR.green[3]], [36, 15, FXR.green[2]], [33, 16, FXR.green[3]], [35, 18, FXR.green[1]]] as const) b.set(x, y, c);
        for (let k = 0; k < 6; k++) b.set(3 + k, 33 - Math.round(k * 0.75), k < 3 ? FXR.dust[3] : E.white);
      }),
    dart_volley: () =>
      compose(DH, glyph((d) => {
        iconDart(d, v(4, 20), v(34, 33), 10);
        iconDart(d, v(4, 16), v(35, 20), 11);
        iconDart(d, v(4, 12), v(33, 7), 12);
      }), (b) => {
        // the wound left open: a broken red cross, heals blocked (screen space)
        for (let k = -3; k <= 3; k++) {
          if (k !== 0) b.set(33 + k, 30, E.red);
          b.set(33, 30 + k, k === 0 ? E.white : E.red);
        }
      }),
    hidden_in_the_undergrowth: () =>
      compose(DH, glyph((d) => {
        iconHead(d, v(21, 12), 10);
      }), (b) => {
        // the undergrowth he hides in: blades of grass across the lower half, his eye glinting through (screen space)
        const G = FXR.green;
        for (let x = 3; x < 37; x++) {
          const h = 9 + Math.round(5 * Math.abs(Math.sin(x * 1.7)) + (x % 3));
          for (let y = 0; y < h; y++) b.set(x + (y > h - 3 ? (x % 2 ? 1 : -1) : 0), 37 - y, y > h - 3 ? G[2] : y % 4 === 0 ? G[0] : G[1]);
        }
        b.set(27, 24, E.eyeAmber);
        b.set(28, 24, E.eyeAmber);
        b.set(27, 23, E.white);
      }),
  },
};
