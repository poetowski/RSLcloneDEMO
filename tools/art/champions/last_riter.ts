// The Last Riter (Jakub's brief, docs/DESIGN_DECISIONS.md section 42,
// 2026-10-31): a Common Support of the Azure Crown, a priestess who says the
// last rites. Read from the brief: a white undergown that shows at the
// sleeves and the hem, a dark-blue dress over it with a small gold crown on
// the chest, a big yellow cope over everything with its hood up, her face in
// its shadow; in her hands an ornate gold casket of olibanum, pale smoke
// curling from its lid. Built on the Associate's robe and proportions, with
// the casket held like the Strongman's stone. Incense Veil lifts the casket to
// her face and the smoke rises round her; Last Unction opens the lid and holds
// it out, the smoke drifting over the enemy. Her affinity (Ember) sets nothing
// here (Jakub, 2026-10-11): her effects are the smoke and the gold of her own
// casket.
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { cape, foldTex, robe, RobeCfg, torsoPts, upRobe } from '../parts.ts';
import { at, dir, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 35,
  thigh: 16,
  shin: 16.4,
  ankleH: 3,
  footLen: 5.4,
  spine: 19.6,
  neck: 7.0,
  upperArm: 12,
  foreArm: 11,
  shoulderDrop: 3.6,
  shoulderN: -2.4,
  shoulderF: 2.8,
  hipN: -1.4,
  hipF: 1.4,
};

const SK = MAT.skinLight, WC = MAT.whiteCloth, IN = MAT.indigo, YC = MAT.yellowCloth, GD = MAT.gold, BR = MAT.bronze;
/** The olibanum's smoke: the pale greys of white cloth, lightest where it leaves the casket. */
const SMOKE = [WC.ramp[1], WC.ramp[2], WC.ramp[2], WC.ramp[3], WC.ramp[4]];

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  // the cope hangs behind her from the shoulders nearly to the ground; the hood behind the head
  if (s.torso < 55) copeLying(d, s, 4);
  else cape(d, s, { mat: YC, z: 4, group: 'cope', len: Math.min(47, s.T(19, 0).y - 2), topU: 19, topBack: 6.2, topFront: 2.6, spread: 9, wind: P.wind ?? 0, wave });
  hoodBack(d, s, 6);

  // slippers under the hem, the far arm behind the dress
  slippers(d, s, 11);
  sleeveArm(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF');

  // the dark-blue dress to the floor, the white undergown at its hem, the bodice with its crown
  skirt(d, s, wave, 15);
  bodice(d, s, 30);
  // the cope over her shoulders, open at the front
  mantle(d, s, 34);

  head(d, s, P);

  // the casket in her hands, then the near arm over it
  const c = P.drop ? v(17, 3.4) : v((s.hN.x + s.hF.x) / 2 + 0.5, (s.hN.y + s.hF.y) / 2 + 1.5);
  casket(d, c, P.drop ? 0 : P.open ?? 0, P.drop ? -8 : 0, 55);
  if (!P.drop) smoke(d, c, P.puff ?? 0, P.plume ?? 0, 56);
  sleeveArm(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN');
  shoulderCap(d, s, 62);
}

/** Fallen, the cope lies along her body on the ground, from her shoulders toward her feet. */
function copeLying(d: Draw, s: Skel, z: number) {
  const hang = s.torso + 180;
  const floor = (p: V) => v(p.x, Math.max(0.6, p.y));
  const topB = floor(s.T(19, -6.2)), topF = floor(s.T(19.5, 2.6));
  const botB = floor(at(topB, hang, 42)), botF = floor(at(topF, hang, 38));
  d.poly({ mat: YC, z, group: 'cope', tex: foldTex(8, 0.4, 0.6) }, [topF, topB, botB, botF], { kind: 'cyl', a: lerpV(topB, topF, 0.5), b: lerpV(botB, botF, 0.5), r: 5, bevel: 1.2 });
}

/** The cope over the top of the near arm, a gold edge where it ends. */
function shoulderCap(d: Draw, s: Skel, z: number) {
  const f = d.frame(s.T(17.8, -1.6), s.upN);
  d.poly({ mat: YC, z, group: 'capN', line: 'soft', tex: foldTex(3, 0.2, 0.7) }, [f(-2.6, -3.6), f(-2.6, 3.6), f(4.6, 3.8), f(5.6, 0), f(4.6, -3.8)], { kind: 'cyl', a: f(-2.6, 0), b: f(5.4, 0), r: 3.8, bevel: 1 });
  d.ribbon({ mat: GD, z: z + 0.1, group: 'capN', line: 'none' }, [f(4.4, 3.6), f(5.4, 0), f(4.4, -3.6)], [0.5, 0.5, 0.5]);
}

// ---------------------------------------------------------------------------
// parts
// ---------------------------------------------------------------------------

const ROBE: RobeCfg = { waist: [1.4, 5.0, 5.4], hemDrop: 1.4, hemFloor: 1.0, hemBack: [7.6, 6.2], hemFront: [5.2, 4.2], midBack: [4.0, 2.8], midFront: [3.4, 1.8], ripple: 0.7 };

/** The dress from the waist to the floor: dark blue, the white undergown showing in a band at its hem. */
function skirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: IN, z, group: 'dress', tex: foldTex(9, wave * 0.5, 0.62) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
  d.ribbon({ mat: WC, z: z + 0.2, group: 'dress', line: 'none' }, upRobe(r, r.hem, 1.3), r.hem.map(() => 1.1));
}

/** The bodice: dark blue to the throat, a small gold crown on the chest, a white edge at the neck. */
function bodice(d: Draw, s: Skel, z: number) {
  const torso = torsoPts(s, [
    [0, 4.6, 4.9],
    [4, 4.4, 4.8],
    [8.5, 4.8, 5.8],
    [12.5, 5.2, 6.3],
    [15.8, 5.4, 5.4],
    [18, 4.0, 3.2],
    [19.6, 2.4, 2.0],
  ]);
  d.poly({ mat: IN, z, group: 'body', tex: foldTex(6, 0.6, 0.8) }, torso, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(19.6, 0.6), r: 6, bevel: 1.3 });
  crown(d, s.T(11.6, 3.4), s.torso, z + 0.3);
  // a white sash at the waist, the undergown's
  d.poly({ mat: WC, z: z + 0.4, group: 'sash' }, [s.T(2.2, -4.9), s.T(2.4, 5.4), s.T(1.0, 5.3), s.T(0.8, -4.8)], { kind: 'cyl', a: s.T(0, 0), b: s.T(2.4, 0), r: 5.2 });
}

/** A small gold crown (the Azure Crown's): three points over a band, snapped to a quarter turn so the pixels stay crisp. */
function crown(d: Draw, center: V, torso: number, z: number) {
  const q = Math.round((torso - 90) / 90) * 90;
  const up = dir(q + 90), right = dir(q);
  const c = v(Math.floor(center.x) + 0.5, Math.floor(center.y) + 0.5);
  const P = (x: number, y: number) => v(c.x + Math.round(right.x) * x + Math.round(up.x) * y, c.y + Math.round(right.y) * x + Math.round(up.y) * y);
  const g = GD.ramp;
  const px: { p: V; c: (typeof g)[number] }[] = [];
  for (const x of [-1, 1]) px.push({ p: P(x, 1), c: g[5] });
  for (let x = -1; x <= 1; x++) px.push({ p: P(x, 0), c: x < 1 ? g[4] : g[3] });
  d.pixels({ mat: GD, z, group: 'crest' }, px);
}

/** The cope over her shoulders: yellow from the nape to below the shoulder blades, open at the throat, a gold edge along its front. */
function mantle(d: Draw, s: Skel, z: number) {
  d.poly(
    { mat: YC, z, group: 'mantle', tex: foldTex(5, 0.4, 0.7) },
    [s.T(20.4, 3.0), s.T(21.2, 0.4), s.T(20.8, -3.4), s.T(19.0, -6.8), s.T(14.6, -7.8), s.T(10.6, -7.0), s.T(12.0, -3.0), s.T(15.0, 0.8), s.T(17.4, 3.8)],
    { kind: 'cyl', a: s.T(10.6, -2), b: s.T(21, -2), r: 7, bevel: 1.2 },
  );
  d.ribbon({ mat: GD, z: z + 0.1, group: 'mantle', line: 'none' }, [s.T(10.8, -6.6), s.T(12.2, -2.8), s.T(15.2, 1.0), s.T(17.6, 3.8), s.T(20.0, 3.2)], [0.55, 0.55, 0.55, 0.55, 0.5]);
}

/** A wide white sleeve of the undergown to a dark-blue cuff, her hand. */
function sleeveArm(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: WC, z, group, shade }, sh, el, 2.6, 2.4);
  d.capsule({ mat: WC, z: z + 0.1, group, shade }, el, at(ha, lo, -1.6), 2.4, 3.3, 0.2);
  d.capsule({ mat: IN, z: z + 0.15, group, shade, line: 'none' }, at(ha, lo, -2.5), at(ha, lo, -1.6), 3.3, 3.3, 0.3);
  d.ellipse({ mat: SK, z: z + 0.3, group, shade }, at(ha, lo, 0.6), 2.0, 1.7, lo);
}

/** Slippers of dark blue peeking under the hem. */
function slippers(d: Draw, s: Skel, z: number) {
  for (const [side, shade] of [['F', -1], ['N', 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF;
    const fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: IN, z: z + (side === 'N' ? 1 : 0), group: 'foot' + side, shade }, [f(-2.4, 1.8), f(-2.8, -1), f(-2.2, -3), f(5.0, -3), f(6.4, -1.6), f(3.2, 0), f(1, 1.8)], { kind: 'bevel', w: 1.4 });
  }
}

/** The hood behind her head, falling to the cope at her shoulders. */
function hoodBack(d: Draw, s: Skel, z: number) {
  const H = s.H;
  d.poly(
    { mat: YC, z, group: 'hoodback', line: 'soft', tex: foldTex(4, 0.3, 0.7) },
    [H(5.2, 7.4), H(1.6, 10.4), H(-3.4, 10.9), H(-8.0, 8.8), H(-10.4, 3.6), H(-10.8, -3.0), H(-9.8, -9.8), H(-5.0, -11.4), H(-1.0, -9.0), H(1.0, -4.0)],
    { kind: 'dome', c: H(-3.6, 1), r: 12, bevel: 1.2 },
  );
}

/**
 * Her head deep in the hood: its rim comes forward over her brow and down past
 * her cheek to the throat, so her eyes lie in its shadow; of her face only the
 * tip of the nose, the lips and the chin catch the light.
 */
function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'neck' }, s.neck, H(0, -4), 2.2, 2.0);
  // the undergown's white collar at the throat
  d.capsule({ mat: WC, z: 37.6, group: 'collar' }, s.T(19.2, -2.4), s.T(19.8, 2.2), 1.6, 1.5);
  face(d, s, { skin: SK, z: 38, browStyle: 'none', ear: 'none', mouth: P.call ? 'shout' : 'line', lip: ACCENT.lipRose, rx: 5.6, ry: 6.3, profile: 'soft' });
  // the hood's shadow over her brow and eyes
  d.poly(
    { mat: YC, z: 38.6, group: 'hoodshade', shade: -3, line: 'none' },
    [H(7.6, 3.2), H(7.4, 1.4), H(6.2, 0.2), H(3.6, -0.4), H(0.6, 0.4), H(0.2, 3.6)],
    { kind: 'flat', n: [0, 0, 1] },
  );
  // the hood: over the crown and the back of the head, its rim forward over the brow and down past the cheek to the throat
  d.poly(
    { mat: YC, z: 39, group: 'hood', tex: foldTex(5, 0.6, 0.7) },
    [H(8.4, 4.0), H(7.6, 2.8), H(4.8, 2.2), H(1.8, 1.2), H(0.4, -2.2), H(0.2, -5.8), H(-0.6, -8.6), H(-3.8, -8.8), H(-8.0, -5.0), H(-9.8, 1.0), H(-9.0, 6.6), H(-5.4, 10.4), H(-0.2, 11.2), H(4.8, 9.2), H(7.6, 6.4)],
    { kind: 'dome', c: H(-1.2, 2.4), r: 10.5, bevel: 1.2 },
  );
  // the rim of the hood, edged in gold like the cope, along the opening
  d.ribbon({ mat: GD, z: 39.1, group: 'hood', line: 'none' }, [H(8.2, 3.8), H(5.4, 2.6), H(2.4, 1.6), H(0.8, -1.8), H(0.6, -5.6)], [0.55, 0.6, 0.6, 0.55, 0.5]);
  // a seam down the crown of the hood
  d.line({ mat: YC, z: 39.15, group: 'hood', line: 'none' }, H(1.0, 10.6), H(-7.4, 6.0), YC.ramp[2]);
}

/**
 * The casket of olibanum: a small box of gold with bronze bands, a pitched lid
 * with a knob, ornament dots along its face. Held level whatever her pose;
 * `open` tips the lid back on its hinge, `tilt` turns the whole box (fallen).
 */
function casket(d: Draw, c: V, open: number, tilt: number, z: number) {
  const f = d.frame(c, tilt);
  const W = 5.2, Hb = 3.4;
  d.poly({ mat: GD, z, group: 'casket' }, [f(-W, -Hb), f(W, -Hb), f(W, Hb), f(-W, Hb)], { kind: 'bevel', w: 1.2 });
  // bronze bands at the foot and the rim, and down the middle
  d.line({ mat: BR, z: z + 0.1, group: 'casket', line: 'none' }, f(-W + 0.6, -Hb + 0.8), f(W - 0.6, -Hb + 0.8), BR.ramp[1]);
  d.line({ mat: BR, z: z + 0.1, group: 'casket', line: 'none' }, f(-W + 0.6, Hb - 0.6), f(W - 0.6, Hb - 0.6), BR.ramp[2]);
  d.line({ mat: BR, z: z + 0.1, group: 'casket', line: 'none' }, f(0, -Hb + 0.8), f(0, Hb - 0.6), BR.ramp[2]);
  d.pixels({ mat: GD, z: z + 0.2, group: 'casket' }, [{ p: f(-2.6, 0.4), c: GD.ramp[5] }, { p: f(2.6, 0.4), c: GD.ramp[5] }]);
  // the lid: pitched, a knob at its peak; open, tipped back on its hinge at the back
  const hinge = f(-W, Hb);
  const la = tilt + 160 * open;
  const g = d.frame(hinge, la);
  d.poly({ mat: GD, z: z + 0.3, group: 'lid' }, [g(0, 0), g(2 * W, 0), g(2 * W - 0.6, 1.6), g(W, 3.0), g(0.6, 1.6)], { kind: 'bevel', w: 1 });
  d.circle({ mat: BR, z: z + 0.35, group: 'lid' }, g(W, 3.6), 1.0);
}

/** Smoke curling up from the casket: a few wisps of pale grey that rise and sway with `puff`; `plume` makes them taller. */
function smoke(d: Draw, c: V, puff: number, plume: number, z: number) {
  const px: { p: V; c: (typeof SMOKE)[number] }[] = [];
  const n = 5 + Math.round(plume * 6);
  for (let k = 0; k < n; k++) {
    const y = c.y + 5 + k * 1.6;
    const x = c.x + Math.round(Math.sin(puff + k * 0.9) * (0.8 + k * 0.25));
    px.push({ p: v(x, y), c: SMOKE[Math.max(1, 4 - Math.floor(k / 2))] });
    if (k % 3 === 1) px.push({ p: v(x + 1, y), c: SMOKE[Math.max(1, 3 - Math.floor(k / 3))] });
  }
  d.pixels({ mat: WC, z, group: 'smoke', line: 'none', outline: false }, px);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

// Idle: the casket held before her chest in both hands, the smoke curling up from it.
const IDLE: Pose = pose({
  torso: 86,
  head: 88,
  legN: { ik: v(-6, 3) },
  legF: { ik: v(5, 3) },
  armN: { up: -60, lo: 36 },
  armF: { up: -64, lo: 32 },
  p: { wave: 0, puff: 0, plume: 0, open: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b * 0.6,
    armN: { up: -60 + b, lo: 36 + b },
    armF: { up: -64 + b, lo: 32 + b },
    p: { wave: a * 0.5, puff: a },
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
    torso: 80,
    head: 86,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -60, lo: 36 },
    armF: { up: -64, lo: 32 },
    p: { wave: a * 2 + 2, wind: 0.5, puff: a * 2, plume: 0 },
  });
}

// Incense Veil: she lifts the casket to her face, her head bowed over it, and the smoke rises round her.
const VE_LIFT = pose({
  y: 1, torso: 90, head: 80,
  legN: { ik: v(-5, 3) }, legF: { ik: v(5, 3) },
  armN: { up: -24, lo: 70 }, armF: { up: -28, lo: 66 },
  p: { wave: 0.8, puff: 1.2, plume: 0.6, open: 0.3 },
});
const VE_HOLD = tweak(VE_LIFT, { y: 1, head: 84, p: { wave: 1.2, puff: 2.4, plume: 1, open: 0.3 } });

// Last Unction: she opens the lid and holds the casket out toward the enemy.
const UN_OPEN = pose({
  x: -1, torso: 90, head: 90,
  legN: { ik: v(-6, 3) }, legF: { ik: v(5, 3) },
  armN: { up: -54, lo: 44 }, armF: { up: -58, lo: 40 },
  p: { wave: 0.6, puff: 1, plume: 0.3, open: 1 },
});
const UN_OFFER = pose({
  x: 3, torso: 80, head: 84,
  legN: { ik: v(-7, 3) }, legF: { ik: v(8, 3) },
  armN: { up: -20, lo: 4 }, armF: { up: -24, lo: 0 },
  p: { wave: 1.4, puff: 2, plume: 1, open: 1, call: 1 },
});
const UN_HOLD = tweak(UN_OFFER, { x: 3, p: { wave: 1.8, puff: 3, plume: 0.8, call: 0 } });

const HURT = pose({
  x: -4, torso: 100, head: 106,
  legN: { ik: v(-6, 3) }, legF: { ik: v(5, 4) },
  armN: { up: -70, lo: 52 }, armF: { up: -74, lo: 48 },
  p: { wave: 2, puff: 0.6, plume: 0, open: 0 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -11, torso: 76, head: 60,
  legN: { ik: v(-12, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -66, lo: -6 }, armF: { up: -60, lo: -2 },
  p: { wave: 1, puff: 0.4, plume: 0, open: 0 },
});
const DEATH_FALL = pose({
  x: 1, y: -12, torso: 30, head: 14,
  legN: { up: -150, lo: -175 }, legF: { up: -120, lo: -170 },
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { wave: 1.6, drop: 1, open: 0.4 },
});
const DEATH_DOWN = pose({
  x: 5, y: -24, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 },
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { wave: 2, drop: 1, open: 0.4 },
});

// Victory: the casket raised before her face, the smoke rising tall.
const VICTORY = pose({
  y: 1, torso: 91, head: 96,
  legN: { ik: v(-4, 3) }, legF: { ik: v(5, 3) },
  armN: { up: 4, lo: 92 }, armF: { up: 0, lo: 88 },
  p: { wave: 0.8, puff: 1, plume: 1, open: 0 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const puffed = (p: Pose, k: number) => tweak(p, { p: { puff: k } });

const char: CharDef = {
  id: 'last_riter',
  name: 'Last Riter',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 170, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VE_LIFT, 2, 100, ease.out),
        ...keys([
          [VE_LIFT, 160],
          [puffed(VE_LIFT, 1.8), 120],
          [VE_HOLD, 160, { hit: true }],
          [puffed(VE_HOLD, 3.2), 200],
        ]),
        ...tween(D, VE_HOLD, IDLE, 3, 110, ease.inOut),
      ],
    },
    attack2: {
      loop: false,
      frames: [
        ...tween(D, IDLE, UN_OPEN, 2, 100, ease.out),
        ...keys([
          [UN_OPEN, 160],
          [mid(UN_OPEN, UN_OFFER, 0.5), 60],
          [UN_OFFER, 120, { hit: true }],
          [UN_HOLD, 240],
          [puffed(UN_HOLD, 3.8), 160],
        ]),
        ...tween(D, UN_HOLD, IDLE, 3, 110, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 97, head: 100 }), 110],
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
        [tweak(DEATH_DOWN, { y: -24.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VICTORY, 2, 110, ease.out),
        ...keys([
          [puffed(VICTORY, 1.8), 160],
          [puffed(VICTORY, 2.6), 160],
          [puffed(VICTORY, 3.4), 160],
          [puffed(VICTORY, 4.2), 160],
          [mid(VICTORY, IDLE, 0.5), 120],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons (glyph space: y up)
// ---------------------------------------------------------------------------

/** The casket in an icon, scaled up for 40x40. */
function iconCasket(d: Draw, c: V, open: number) {
  const W = 9, Hb = 6;
  d.poly({ mat: GD, z: 2, group: 'icasket' }, [v(c.x - W, c.y - Hb), v(c.x + W, c.y - Hb), v(c.x + W, c.y + Hb), v(c.x - W, c.y + Hb)], { kind: 'bevel', w: 1.6 });
  d.line({ mat: BR, z: 2.1, group: 'icasket', line: 'none' }, v(c.x - W + 1, c.y - Hb + 1.5), v(c.x + W - 1, c.y - Hb + 1.5), BR.ramp[1]);
  d.line({ mat: BR, z: 2.1, group: 'icasket', line: 'none' }, v(c.x, c.y - Hb + 1.5), v(c.x, c.y + Hb - 1), BR.ramp[2]);
  d.pixels({ mat: GD, z: 2.2, group: 'icasket' }, [{ p: v(c.x - 4.5, c.y + 1), c: GD.ramp[5] }, { p: v(c.x + 4.5, c.y + 1), c: GD.ramp[5] }]);
  const g = d.frame(v(c.x - W, c.y + Hb), 160 * open);
  d.poly({ mat: GD, z: 2.3, group: 'ilid' }, [g(0, 0), g(2 * W, 0), g(2 * W - 1, 2.6), g(W, 5), g(1, 2.6)], { kind: 'bevel', w: 1.4 });
  d.circle({ mat: BR, z: 2.35, group: 'ilid' }, g(W, 5.8), 1.6);
}

export const lastRiter: ChampionArt = {
  char,
  iconBg: IN,
  icons: {
    incense_veil: () =>
      compose(IN, glyph((d) => {
        iconCasket(d, v(20, 10), 0);
      }), (b) => {
        // smoke rising from the lid into a veil (screen space, y down)
        for (let k = 0; k < 14; k++) {
          const y = 22 - k * 1.4;
          const x = 20 + Math.round(Math.sin(k * 0.8) * (1 + k * 0.5));
          b.set(x, Math.round(y), SMOKE[Math.max(2, 4 - Math.floor(k / 5))]);
          if (k % 2 === 0) b.set(x + 1, Math.round(y), ACCENT.white);
        }
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI + Math.PI;
          b.set(Math.round(20 + Math.cos(a) * 14), Math.round(8 - Math.sin(a) * 4), SMOKE[4]);
        }
      }),
    last_unction: () =>
      compose(IN, glyph((d) => {
        iconCasket(d, v(12, 10), 1);
      }), (b) => {
        // the smoke drifts away to the right, warm motes in it
        for (let k = 0; k < 16; k++) {
          const x = 16 + k * 1.3;
          const y = 22 - k * 0.8 + Math.round(Math.sin(k * 0.9) * 1.5);
          b.set(Math.round(x), Math.round(y), SMOKE[Math.max(2, 4 - Math.floor(k / 6))]);
          if (k % 4 === 1) b.set(Math.round(x), Math.round(y) - 2, GD.ramp[5]);
        }
      }),
  },
};
