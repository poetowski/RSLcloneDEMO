// The Executioner (docs/DESIGN_DECISIONS.md section 77, 2026-11-02: Jakub's choice of the second
// of three concepts I proposed, renamed by him, "Make his design wearing white instead of black";
// redrawn on his word of 2026-11-03, "be a bit different this time", the kit unchanged). The
// Sanguine Dominion's headsman: a massive man, broad as a door, heavy in the gut and the arms;
// a white cowl over his whole head, two eye holes cut in it, falling in a long mantle over his
// shoulders and chest, its edge stitched in crimson; a long white leather apron, the headsman's,
// hanging to his shins over loose white trousers and tall white boots; a crimson sash at his
// waist with an iron buckle cast as the Dominion's hexagon; his bare forearms wrapped in white
// strips; iron manacles hanging at the back of his sash, their chain coiled, which he whirls and throws in Shackle. His axe is
// a great bearded headsman's axe: a long haft wound in crimson at the grip, a long blade whose
// edge runs down along the haft, the hexagon stamped in it (the silhouette, with the peaked
// cowl). At rest he stands over it, the head on the ground, both hands stacked on the haft. The
// white is Jakub's word; red and black are the Dominion's heraldry (DESIGN_DECISIONS.md 3.2). His
// affinity (Tide) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph, impactStar } from '../icons.ts';
import { ACCENT, FXR, INK, MAT } from '../palette.ts';
import { leg, smear, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, ik2, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 36,
  thigh: 16,
  shin: 15.6,
  ankleH: 3,
  footLen: 8.4,
  spine: 26,
  neck: 5,
  upperArm: 14.6,
  foreArm: 14,
  shoulderDrop: 5.4,
  shoulderN: -6.4,
  shoulderF: 6.8,
  hipN: -3.4,
  hipF: 3.4,
};

const SK = MAT.skinTan, WL = MAT.whiteCloth, CR = MAT.crimson, IR = MAT.iron, ST = MAT.steel, WD = MAT.wood, LN = MAT.linen;

/** The axe's streak: plain white with the steel's light, the colour of motion. */
const SWING = { core: ACCENT.white, edge: ST.ramp[4] };

/** The axe, measured from the near hand: where the head is on the haft, and the far hand up or down the haft from the near. */
const HEAD = 36, LOWER = 8;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const ang = P.axeAng ?? -90;
  const two = (P.two ?? 1) >= 0.5;

  if (info.def.smear && info.prev) {
    const from = info.prev.pose.p.axeAng ?? ang;
    smear(d, s.hN, P.sweep ?? from, ang, HEAD + 8, 16, SWING, 3);
  }

  // the axe behind him when it rests on his shoulder or is lifted back
  const axeBehind = (P.behind ?? 0) >= 0.5;
  if (axeBehind) axe(d, s.hN, ang, 4);

  if (two || P.chain === undefined) manacles(d, s, P, 8);
  leg(d, s, 'F', legCfg(10, -1));

  // the far arm: on the haft with both hands, or free with the chain (Shackle)
  const far = farArm(s, ang, two);
  armOf(d, s.sF, far.e, far.h, 20, -1, 'armF');
  if (!two && P.chain !== undefined) chain(d, far.h, P, 21);

  torso(d, s, 30);
  apron(d, s, P, 33);

  leg(d, s, 'N', legCfg(50, 0));

  if (!axeBehind) axe(d, s.hN, ang, 56);
  if (two) d.ellipse({ mat: SK, z: axeBehind ? 57 : 57, group: 'handF', shade: -1 }, far.h, 3.2, 2.8, ang);
  armOf(d, s.sN, s.eN, s.hN, 60, 0, 'armN');
  d.ellipse({ mat: SK, z: 60.5, group: 'handN' }, s.hN, 3.4, 3, s.loN);
  // the cowl's mantle over the shoulders and the tops of the arms, the cowl over it
  mantle(d, s, P, 62);
  cowl(d, s, 64);
}

const legCfg = (z: number, shade: number) => ({
  thigh: LN, shin: LN, foot: WL, rThigh: [6.2, 5.0] as [number, number], rShin: [4.8, 4.2] as [number, number], z, shade, footStyle: 'boot' as const,
  // loose white trousers, creased
  thighTex: (h: { u: number }) => (Math.sin(h.u * 18) > 0.8 ? -1 : 0),
  boot: { mat: WL, from: 0.4, r: [4.8, 4.4] as [number, number], cuff: WL },
});

function farArm(s: Skel, ang: number, two: boolean): { e: V; h: V } {
  if (!two) return { e: s.eF, h: s.hF };
  const r = ik2(s.sF, at(s.hN, ang, -(s.pose.p.lower ?? LOWER)), D.upperArm, D.foreArm, (s.pose.p.bendF ?? -1) as number);
  return { e: r.mid, h: r.end };
}

/** A massive bare arm: the shoulder's bulk, a thick upper arm, the forearm wrapped in white strips. */
function armOf(d: Draw, sh: V, el: V, ha: V, z: number, shade: number, group: string) {
  d.capsule({ mat: SK, z, group, shade }, sh, el, 5.4, 4.6);
  d.capsule({ mat: SK, z: z + 0.1, group, shade }, el, ha, 4.6, 3.6);
  // the wrapping, from the wrist halfway to the elbow, in three bands
  for (const t of [0.12, 0.28, 0.44]) {
    const c = { x: ha.x + (el.x - ha.x) * t, y: ha.y + (el.y - ha.y) * t };
    const a = Math.atan2(el.y - ha.y, el.x - ha.x) * 57.29578;
    d.capsule({ mat: WL, z: z + 0.15, group: group + 'w' + t, shade, line: 'soft' }, at(c, a + 90, 4.2), at(c, a - 90, 4.2), 1.1, 1.1);
  }
}

function torso(d: Draw, s: Skel, z: number) {
  const body = torsoPts(s, [[-1, 9, 9.6], [4, 9.6, 11.6], [9, 10.4, 13], [14, 11.4, 12.4], [19, 12.2, 11.4], [23, 10.4, 8], [25.4, 5.4, 3.6]]);
  d.poly({ mat: SK, z, group: 'body' }, body, { kind: 'cyl', a: s.T(0, 1), b: s.T(25, 1), r: 12.4, bevel: 1.4 });
  // the gut's curve and the old scars across the belly
  d.line({ mat: SK, z: z + 0.1, group: 'body', line: 'none' }, s.T(5, 11.4), s.T(12, 12.4), SK.ramp[2]);
  d.line({ mat: SK, z: z + 0.15, group: 'scars', line: 'none' }, s.T(14, 6), s.T(9, 11), SK.ramp[4]);
  d.line({ mat: SK, z: z + 0.15, group: 'scars', line: 'none' }, s.T(11, 3), s.T(8, 7), SK.ramp[4]);
  // the crimson sash at the waist, and the buckle cast as the hexagon
  d.poly({ mat: CR, z: z + 0.3, group: 'sash', tex: (h) => (Math.sin(h.u * 16) > 0.7 ? -1 : 0) }, [s.T(4.8, -9.6), s.T(5, 11.8), s.T(1.2, 10.4), s.T(1, -9.2)], { kind: 'cyl', a: s.T(1, 0), b: s.T(5, 0), r: 10.6 });
  const bc = s.T(3, 10.6);
  d.poly({ mat: IR, z: z + 0.35, group: 'buckle' }, [0, 60, 120, 180, 240, 300].map((deg) => at(bc, deg + 30, 2.6)), { kind: 'bevel', w: 0.8 });
  d.pixels({ mat: IR, z: z + 0.36, group: 'buckle', line: 'none' }, [{ p: v(bc.x - 0.6, bc.y + 0.6), c: IR.ramp[5] }]);
}

/** The long white leather apron hanging from the sash to his shins, stiff, its edge stitched in crimson; it swings a little with him. */
function apron(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const top = s.T(2, 8);
  const w = Math.sin(P.wave ?? 0) * 1.2 + (P.lean ?? 0);
  const len = 26;
  // it hangs straight down while he stands, and along his legs once he is down
  const hang = s.torso < 55 ? s.torso + 180 : -90;
  const across = hang + 90;
  const a = at(top, across, 6), b = at(top, across, -6.4);
  const bot = at(top, hang, len);
  const c = at(at(bot, across, -7.4), across, -w), e = at(at(bot, across, 5), across, -w);
  d.poly({ mat: WL, z, group: 'apron', line: 'soft', tex: (h) => (Math.sin(h.u * 7) > 0.85 ? -1 : 0) }, [a, b, c, e], { kind: 'cyl', a: top, b: bot, r: 7, bevel: 1 });
  // the crimson stitching down its edges and along its hem
  const stitch: { p: V; c: typeof CR.ramp[0] }[] = [];
  for (let k = 1; k < 9; k++) {
    const t = k / 9;
    stitch.push({ p: v(a.x + (e.x - a.x) * t + 1.2, a.y + (e.y - a.y) * t), c: CR.ramp[3] });
    stitch.push({ p: v(b.x + (c.x - b.x) * t - 1.2, b.y + (c.y - b.y) * t), c: CR.ramp[3] });
  }
  for (let k = 1; k < 6; k++) stitch.push({ p: at(v(e.x + (c.x - e.x) * (k / 6), e.y + (c.y - e.y) * (k / 6)), hang, -1.2), c: CR.ramp[3] });
  d.pixels({ mat: WL, z: z + 0.05, group: 'apron', line: 'none' }, stitch);
}

/** The cowl's mantle over his shoulders and the top of his chest, white, its scalloped edge stitched in crimson. */
function mantle(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const T = s.T;
  const w = (P.wind ?? 0) * 2;
  const pts = [T(27, -6), T(27.6, 4), T(22, 11.6), T(19.4, 10), T(17.6, 12), T(15.4, 9.4), T(14.6, 4), T(15, -2), T(15.6, -7.6 - w), T(17.6, -12 - w), T(21, -12.6 - w * 0.6), T(25, -10)];
  d.poly({ mat: WL, z, group: 'mantle' }, pts, { kind: 'dome', c: T(22, 0), r: 12, bevel: 1.3 });
  const st: { p: V; c: typeof CR.ramp[0] }[] = [];
  for (const [u, ww] of [[21.4, 10.4], [19, 9], [17, 10.4], [15.6, 7.6], [15.2, 3], [15.4, -2], [16, -6.6]] as const) st.push({ p: T(u + 0.8, ww - 0.6), c: CR.ramp[3] });
  d.pixels({ mat: WL, z: z + 0.05, group: 'mantle', line: 'none' }, st);
}

/** The cowl over his whole head, peaked, two eye holes in it and the dark in them, a seam down the front. */
function cowl(d: Draw, s: Skel, z: number) {
  const H = (x: number, y: number) => s.H(x * 1.08, y * 1.08);
  d.poly({ mat: WL, z, group: 'cowl' }, [H(-6.6, -5), H(-7.4, 1), H(-6, 6.4), H(-3, 10), H(-1, 13.6), H(1.8, 9.6), H(5.4, 5.8), H(7.2, 1), H(7, -3.6), H(5, -6.4), H(0, -7.4)], { kind: 'dome', c: H(0, 1.6), r: 9.4, bevel: 1.3 });
  for (const [x, y] of [[3.2, 1.6], [5.8, 1.4]] as const) d.ellipse({ mat: WL, z: z + 0.1, group: 'eyes', line: 'none', color: INK.black }, H(x, y), 1.5, 1.0, 0);
  d.pixels({ mat: WL, z: z + 0.15, group: 'eyes', line: 'none', outline: false }, [{ p: H(6.0, 1.6), c: ACCENT.ashEyeDim }, { p: H(3.4, 1.8), c: ACCENT.ashEyeDim }]);
  d.line({ mat: WL, z: z + 0.1, group: 'cowl', line: 'none' }, H(6.6, -1), H(5.6, -6), WL.ramp[2]);
  d.line({ mat: WL, z: z + 0.1, group: 'cowl', line: 'none' }, H(1.2, 10.4), H(5.2, 5.6), WL.ramp[2]);
}

/** At rest the manacles hang at the back of his sash, their chain coiled in a loop of iron links, behind the far leg. */
function manacles(d: Draw, s: Skel, P: Record<string, number>, z: number) {
  const hook = s.T(3, -10.6);
  const sw = Math.sin(P.wave ?? 0) * 0.8;
  const c = v(hook.x - 1.4 + sw, hook.y - 4.6);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    d.circle({ mat: IR, z: z + k * 0.01, group: 'mcoil' + k, line: 'soft', shade: -1 }, v(c.x + Math.cos(a) * 3.2, c.y + Math.sin(a) * 4.2), 1.0);
  }
  d.capsule({ mat: IR, z: z + 0.2, group: 'mcuff', line: 'soft', shade: -1 }, v(c.x - 1.6, c.y - 4.6), v(c.x + 1.8, c.y - 5.2), 1.4, 1.4);
}

/** In Shackle the manacles swing from the far hand on their chain, `chain` the angle of the throw, `chainCurl` its bend. */
function chain(d: Draw, hand: V, P: Record<string, number>, z: number) {
  const a = P.chain ?? -90;
  let p = hand;
  for (let k = 0; k < 7; k++) {
    p = at(p, a + k * (P.chainCurl ?? 0), 3);
    d.circle({ mat: IR, z: z + k * 0.01, group: 'chain' + k, line: 'soft' }, p, 1.15);
  }
  d.ellipse({ mat: IR, z: z + 0.1, group: 'scuff1', line: 'soft' }, at(p, a, 2.4), 3, 2.3, a);
  d.ellipse({ mat: IR, z: z + 0.11, group: 'scuff2', line: 'soft' }, at(at(p, a, 3.6), a + 90, 2.8), 3, 2.3, a + 60);
}

/**
 * The bearded headsman's axe: a long haft of dark wood, wound in crimson at the grip, iron at its
 * foot; at the head a long blade whose curved edge runs back down along the haft (the beard), a
 * short spike behind, the hexagon stamped in the blade.
 */
function axe(d: Draw, hand: V, ang: number, z: number) {
  const f = d.frame(hand, ang);
  d.capsule({ mat: WD, z, group: 'haft', tex: (h) => (Math.sin(h.u * 30) > 0.9 ? 1 : 0) }, f(-18, 0), f(HEAD + 4, 0), 1.7, 1.7);
  d.capsule({ mat: IR, z: z + 0.02, group: 'foot' }, f(-19, 0), f(-16, 0), 2.1, 2.1);
  d.capsule({ mat: CR, z: z + 0.03, group: 'grip', tex: (h) => (Math.floor(h.u * 10) % 2 ? -1 : 0) }, f(-12, 0), f(6, 0), 2.0, 2.0);
  d.capsule({ mat: IR, z: z + 0.05, group: 'collar' }, f(HEAD - 12, 0), f(HEAD + 3, 0), 2.6, 2.6);
  // the blade: from the head down along the haft, its edge a long curve
  const blade = [f(HEAD + 3, 2.2), f(HEAD + 5.6, 8), f(HEAD + 5.2, 12.6), f(HEAD + 2, 15.6), f(HEAD - 5, 16.4), f(HEAD - 12, 15), f(HEAD - 18, 11.4), f(HEAD - 21, 7.6), f(HEAD - 17, 7.4), f(HEAD - 12.6, 5.6), f(HEAD - 9, 3), f(HEAD - 7, 2.2)];
  d.poly({ mat: ST, z: z + 0.1, group: 'blade' }, blade, { kind: 'cyl', a: f(HEAD - 6, 2), b: f(HEAD - 6, 21), r: 11, bevel: 1.2 });
  // the bright, ground edge
  d.ribbon({ mat: ST, z: z + 0.12, group: 'blade', line: 'none' }, [f(HEAD + 5.2, 8.4), f(HEAD + 4.6, 12.6), f(HEAD + 1.6, 15.2), f(HEAD - 5, 16), f(HEAD - 12, 14.6), f(HEAD - 18, 11), f(HEAD - 20.4, 7.8)], [0.6, 0.8, 0.9, 0.9, 0.9, 0.8, 0.5]);
  // the spike behind
  d.poly({ mat: IR, z: z + 0.08, group: 'spike' }, [f(HEAD - 5, -1.8), f(HEAD - 1, -7.4), f(HEAD + 1.6, -1.8)], { kind: 'bevel', w: 0.8 });
  // the hexagon stamped in the blade
  const hc = f(HEAD - 4, 9.6);
  d.poly({ mat: ST, z: z + 0.14, group: 'blade', line: 'none', color: ST.ramp[1] }, [0, 60, 120, 180, 240, 300].map((deg) => at(hc, deg + 30, 2.6)));
  d.poly({ mat: ST, z: z + 0.15, group: 'blade', line: 'none', color: ST.ramp[3] }, [0, 60, 120, 180, 240, 300].map((deg) => at(hc, deg + 30, 1.4)));
}

// ---------------------------------------------------------------------------
// Poses & animations (the axe's angle runs from the near hand to the head: 0 forward, 90 up)
// ---------------------------------------------------------------------------

const th = (hand: V, ang: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  pose({ armN: { ik: hand, bend: -1 }, armF: { up: -90, lo: -60 }, ...extra, p: { axeAng: ang, two: 1, ...(extra.p ?? {}) } });

// At rest: he stands over the axe, its head on the ground before him, both hands stacked on the top of the haft.
const IDLE: Pose = th(v(17, 44), -92, { y: -1, torso: 90, head: 86, legN: { ik: v(-10, 3) }, legF: { ik: v(10, 3) }, p: { lower: -6 } });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -1 - b, torso: 90 - b, head: 86 - b, armN: { ik: v(17, 44 - b), bend: -1 }, p: { axeAng: -92, lower: -6, wave: a } });
}

// Run: the axe carried on his shoulder, head behind him.
function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -11 * Math.cos(ph), y: 3 + (sn > 0 ? 6 * sn : 0), ang: sn > 0 ? -22 * sn : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  const sw = Math.cos(a);
  return th(v(14 + sw, 46 + bob), 146 + sw * 3, { y: bob - 2, torso: 78, head: 82, legN: { ik: v(n.x - 1, n.y) }, legF: { ik: v(f.x + 1, f.y) }, footN: n.ang, footF: f.ang, p: { wave: a * 2, behind: 1, wind: 0.8, lean: -2 } });
}

// Sentence: the axe swung up off the ground, round past his shoulder and over his head, and down through the enemy.
const SE_LIFT = th(v(16, 46), 30, { x: -1, y: 0, torso: 90, head: 88, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, p: { wave: 0.6 } });
const SE_WIND = th(v(2, 70), 150, { x: -4, y: 0, torso: 100, head: 92, legN: { ik: v(-12, 3) }, legF: { ik: v(9, 3) }, p: { wave: 1, behind: 1 } });
const SE_CUT = th(v(24, 36), -28, { x: 9, y: -6, torso: 66, head: 74, legN: { ik: v(-12, 3) }, legF: { ik: v(18, 3) }, p: { wave: 2, lean: 2, sweep: 150 } });
const SE_HOLD = th(v(24, 34), -46, { x: 9, y: -6, torso: 62, head: 72, legN: { ik: v(-12, 3) }, legF: { ik: v(18, 3) }, p: { wave: 3, lean: 2 } });

// Shackle: the axe left standing on its head in the near hand, the manacles whirled overhead in the far, then flung at the enemy.
const sh = (chainAng: number, curl: number, extra: Partial<Pose> & { p?: Record<string, number> }) =>
  th(v(18, 44), -92, { ...extra, p: { two: 0, chain: chainAng, chainCurl: curl, ...(extra.p ?? {}) } });
const SH_LOW = sh(-90, 0, { x: -2, torso: 90, head: 86, armF: { up: -100, lo: -80 }, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) } });
const SH_WHIRL1 = sh(170, -22, { x: -2, torso: 94, head: 92, armF: { up: 114, lo: 96 }, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, p: { wave: 1 } });
const SH_WHIRL2 = sh(40, -22, { x: -2, torso: 94, head: 92, armF: { up: 104, lo: 76 }, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, p: { wave: 1.6 } });
const SH_WHIRL3 = sh(-80, -22, { x: -2, torso: 94, head: 92, armF: { up: 110, lo: 70 }, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, p: { wave: 2 } });
const SH_THROW = sh(2, 1, { x: 7, y: -4, torso: 72, head: 80, armF: { up: 18, lo: 4 }, legN: { ik: v(-12, 3) }, legF: { ik: v(16, 3) }, p: { wave: 2.4, lean: 2 } });
const SH_HOLD = sh(-34, 8, { x: 7, y: -4, torso: 74, head: 80, armF: { up: 8, lo: -12 }, legN: { ik: v(-12, 3) }, legF: { ik: v(16, 3) }, p: { wave: 3 } });

// Final Verdict: the axe lifted slowly high over his head, held while the moment stretches, then all of him comes down after it and the blade bites into the ground; he wrenches it free.
const FV_LIFT = th(v(8, 76), 96, { x: -2, y: 1, torso: 96, head: 100, legN: { ik: v(-11, 3) }, legF: { ik: v(10, 3) }, p: { wave: 1 } });
const FV_PEAK = th(v(0, 80), 150, { x: -5, y: 1, torso: 104, head: 104, legN: { ik: v(-13, 3) }, legF: { ik: v(9, 3) }, p: { wave: 1.4, behind: 1, wind: 0.4 } });
const FV_FALL = th(v(26, 34), -46, { x: 11, y: -9, torso: 50, head: 64, legN: { ik: v(-13, 3) }, legF: { ik: v(20, 3) }, p: { wave: 2.4, sweep: 150, lean: 3 } });
const FV_BITE = tweak(FV_FALL, { y: -10, armN: { ik: v(26, 31), bend: -1 }, p: { wave: 3, axeAng: -48 } });
const FV_WRENCH = th(v(22, 30), -40, { x: 8, y: -6, torso: 64, head: 72, legN: { ik: v(-13, 3) }, legF: { ik: v(18, 3) }, p: { wave: 3.4, lean: 1 } });

const HURT = th(v(14, 44), -66, { x: -4, y: -1, torso: 100, head: 104, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 4) }, footF: 10, p: { wave: 1, lower: -6, lean: -2 } });
const DEATH_KNEEL = th(v(16, 44), -92, { x: 0, y: -11, torso: 80, head: 62, legN: { ik: v(-14, 3) }, legF: { ik: v(9, 3) }, footN: -30, p: { lower: -6, wave: 1 } });
const DEATH_FALL = pose({
  x: 2, y: -11, torso: 30, head: 16,
  legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -60, footF: -40,
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { axeAng: -20, two: 0, wave: 2 },
});
const DEATH_DOWN = pose({
  x: 6, y: -16, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, footN: 95, footF: 90,
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { axeAng: 4, two: 0, wave: 3 },
});

// Victory: the axe swung up onto his shoulder, the other hand on his hip, the cowl turned on the field.
const SHOULDER = th(v(12, 54), 140, { y: 0, torso: 92, head: 94, legN: { ik: v(-10, 3) }, legF: { ik: v(11, 3) }, p: { behind: 1, two: 0, wave: 1 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);
const waved = (p: Pose, w: number) => tweak(p, { p: { wave: w } });

const char: CharDef = {
  id: 'executioner',
  name: 'Executioner',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 180, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SE_LIFT, 2, 70),
        ...keys([
          [SE_LIFT, 90],
          [mid(SE_LIFT, SE_WIND, 0.5), 70],
          [SE_WIND, 200],
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
          [SH_WHIRL1, 80],
          [SH_WHIRL2, 80],
          [SH_WHIRL3, 80],
          [SH_WHIRL1, 70],
          [SH_WHIRL2, 70],
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
        ...tween(D, IDLE, FV_LIFT, 3, 120, ease.out),
        ...keys([
          [FV_PEAK, 280],
          [waved(FV_PEAK, 1.8), 280],
          [mid(FV_PEAK, FV_FALL, 0.5), 45],
          [FV_FALL, 90, { smear: true, hit: true }],
          [FV_BITE, 260],
          [FV_WRENCH, 140],
        ]),
        ...tween(D, FV_WRENCH, IDLE, 3, 130, ease.inOut),
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
        [DEATH_KNEEL, 280],
        [DEATH_FALL, 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -16.5 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, SHOULDER, 3, 100, ease.out),
        ...keys([
          [waved(SHOULDER, 1.6), 320],
          [waved(SHOULDER, 2.6), 320],
          [waved(SHOULDER, 3.6), 320],
          [mid(SHOULDER, IDLE, 0.5), 110],
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
      compose(CR, glyph((d) => axe(d, v(4, 4), 52, 10)), (b) => impactStar(b, 32, 31, 1, 6, 7, FXR.dust[3], E.white)),
    shackle: () =>
      compose(CR, glyph((d) => {
        for (let k = 0; k < 6; k++) d.circle({ mat: IR, z: 10 + k * 0.01, group: 'ich' + k, line: 'soft' }, v(6 + k * 3.6, 30 - k * 2.4), 1.8);
        d.ellipse({ mat: IR, z: 11, group: 'icuff1', line: 'soft' }, v(28, 13), 5, 4, 10);
        d.ellipse({ mat: IR, z: 11.1, group: 'icuff2', line: 'soft' }, v(31, 7), 5, 4, -30);
      })),
    final_verdict: () =>
      compose(CR, glyph((d) => axe(d, v(14, -10), 88, 10)), (b) => {
        for (const [x, y] of [[33, 6], [35, 10], [5, 8]] as const) b.set(x, y, E.white);
      }),
    grim_duty: () =>
      compose(CR, glyph((d) => cowl(d, ({ H: (x: number, y: number) => v(20 + x * 1.3, 18 + y * 1.3) } as unknown) as Skel, 10))),
  },
};
