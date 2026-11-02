// The Haruspex (docs/DESIGN_DECISIONS.md section 63, 2026-11-01, my proposal on
// Jakub's word): an Elite Support of the Ashveil Reign, a dead seer who reads
// the fight in knucklebones. An old woman, gaunt and a little bent, her eyes
// bound with a strip of linen whose ends hang behind her head; long white hair
// down her back; a robe of tomb-dust wool to the floor under a charcoal shawl,
// a string of knucklebones round her neck; her forearms wrapped. In her far hand
// a staff taller than she is, topped by a ram's skull with curling horns and
// strings of bones hanging from it (the silhouette feature); with her near hand
// she casts the bones. Her affinity (Tide) sets nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, MAT } from '../palette.ts';
import { foldTex, robe, RobeCfg, torsoPts } from '../parts.ts';
import { at, Dims, Draw, ease, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 34,
  thigh: 16,
  shin: 16,
  ankleH: 3,
  footLen: 5.2,
  spine: 20,
  neck: 5.6,
  upperArm: 12,
  foreArm: 11.4,
  shoulderDrop: 3.4,
  shoulderN: -2.2,
  shoulderF: 2.4,
  hipN: -1.2,
  hipF: 1.2,
};

const SK = MAT.rotPale, RB = MAT.tombDust, SW = MAT.charcoal, LN = MAT.linen, HR = MAT.ashBone, WD = MAT.bark, BN = MAT.bone, HN = MAT.ashBone, WR = MAT.bandage;
const E = ACCENT;

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  hairBack(d, s, wave, 3);
  // the staff in her far hand, behind her body, its skull over her head
  if (P.drop) staff(d, v(-30, 3.4), -2, 4, wave, 0.5);
  else staff(d, s.hF, P.stf ?? 90, 8, wave, 1);
  sleeveArm(d, s.sF, s.eF, s.hF, s.loF, 14, -1, 'armF');
  if (!P.drop) d.ellipse({ mat: SK, z: 15, group: 'gripF', shade: -1 }, s.hF, 1.9, 1.6, s.loF);

  feet(d, s, 18);
  skirt(d, s, wave, 22);
  bodice(d, s, 30);
  shawl(d, s, wave, 32);
  head(d, s, wave);

  sleeveArm(d, s.sN, s.eN, s.hN, s.loN, 60, 0, 'armN');
  // the bones in her near hand while she holds them
  if (P.hold) d.pixels({ mat: BN, z: 61, group: 'held', outline: false, line: 'none' }, [{ p: at(s.hN, s.loN, 2), c: BN.ramp[4] }, { p: at(at(s.hN, s.loN, 1.4), s.loN + 90, 1.2), c: BN.ramp[3] }]);
}

// ---------------------------------------------------------------------------
// body and clothes
// ---------------------------------------------------------------------------

const ROBE: RobeCfg = { waist: [1.4, 5.0, 5.4], hemDrop: 1.2, hemFloor: 0.6, hemBack: [8.4, 6.6], hemFront: [5.4, 4.2], midBack: [4.4, 3.2], midFront: [3.4, 2.0], ripple: 0.7, zigzag: 0.8 };

/** The robe from the waist to the floor, its hem worn ragged. */
function skirt(d: Draw, s: Skel, wave: number, z: number) {
  const r = robe(s, ROBE, wave);
  d.poly({ mat: RB, z, group: 'robe', tex: foldTex(9, wave * 0.5, 0.6) }, r.outline, { kind: 'cyl', a: r.axisA, b: r.axisB, r: Math.max(6, r.halfWidth), bevel: 1.2 });
}

function bodice(d: Draw, s: Skel, z: number) {
  const torso = torsoPts(s, [
    [0, 4.8, 5.0],
    [5, 4.4, 4.6],
    [10, 4.8, 5.2],
    [14, 5.4, 5.4],
    [17, 5.0, 4.6],
    [19.4, 3.6, 2.8],
    [20.4, 2.2, 1.6],
  ]);
  d.poly({ mat: RB, z, group: 'body', tex: foldTex(6, 0.8, 0.75) }, torso, { kind: 'cyl', a: s.T(0, 0.3), b: s.T(20, 0.3), r: 5.6, bevel: 1.3 });
  // a cord at the waist
  d.ribbon({ mat: SW, z: z + 0.1, group: 'cord' }, [s.T(1.8, -5), s.T(1.6, 0), s.T(1.8, 5.6)], [0.7, 0.8, 0.7]);
}

/** The charcoal shawl over her shoulders, fringed, and the knucklebones strung round her neck. */
function shawl(d: Draw, s: Skel, wave: number, z: number) {
  const sh = torsoPts(s, [
    [11.6, 6.0, 5.8],
    [13.4, 6.4, 6.4],
    [16.6, 6.0, 5.6],
    [19.6, 4.2, 3.4],
    [21.2, 2.6, 2.0],
  ]);
  d.poly({ mat: SW, z, group: 'shawl', tex: foldTex(5, 1.2, 0.7) }, sh, { kind: 'cyl', a: s.T(11.6, 0), b: s.T(21, 0), r: 6.4, bevel: 1.1 });
  // the fringe along its lower edge
  const fringe: { p: V; c: (typeof SW.ramp)[number] }[] = [];
  for (let w = -5.6; w <= 5.6; w += 1.4) {
    const top = s.T(11.6 - Math.abs(w) * 0.1, w);
    const len = 2 + (Math.round(w * 3) % 2 ? 1 : 0) + Math.sin(wave + w) * 0.4;
    for (let k = 1; k <= len; k++) fringe.push({ p: v(top.x, top.y - k), c: SW.ramp[k === 1 ? 3 : 2] });
  }
  d.pixels({ mat: SW, z: z + 0.1, group: 'fringe', outline: false, line: 'none' }, fringe);
  // the knucklebones on a cord
  const beads: { p: V; c: (typeof BN.ramp)[number] }[] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const p = s.T(19.2 - Math.sin(t * Math.PI) * 4.4, -1.4 + t * 5.6);
    beads.push({ p, c: BN.ramp[4] }, { p: v(p.x, p.y - 1), c: BN.ramp[2] });
  }
  d.pixels({ mat: BN, z: z + 0.2, group: 'beads', line: 'none' }, beads);
}

/** Long white hair down her back from under the binding. */
function hairBack(d: Draw, s: Skel, wave: number, z: number) {
  const H = s.H, T = s.T;
  const w = Math.sin(wave) * 0.5;
  d.poly({ mat: HR, z, group: 'hairback', shade: -2, tex: (h) => (Math.sin(h.v * 11 + h.u * 1.5) > 0.6 ? -1 : 0) }, [H(-1.6, 7.8), H(-7.2, 5.4), H(-8.2, -1), T(14 + w, -7.4), T(8 + w, -8.0), T(7, -4), T(14, -2), H(-2.4, -5)], { kind: 'dome', c: H(-4, 0), r: 9, bevel: 1 });
}

/**
 * Her head: an old face, gaunt; a strip of linen bound over her eyes and knotted
 * behind, its ends hanging; white hair parted over the crown and down past the
 * ear.
 */
function head(d: Draw, s: Skel, wave: number) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.4, group: 'neck' }, s.neck, H(0, -4), 2.4, 2.2);
  face(d, s, { skin: SK, z: 38, browStyle: 'none', mouth: 'line', lip: SK.ramp[1], profile: 'soft', rx: 5.8, ry: 6.4 });
  // the hollows of the cheek
  d.pixels({ mat: SK, z: 38.4, group: 'hollow', outline: false, line: 'none' }, [{ p: H(3.0, -2.0), c: SK.ramp[2] }, { p: H(2.4, -3.0), c: SK.ramp[2] }]);
  // the hair: over the crown and down behind the ear
  d.poly({ mat: HR, z: 38.6, group: 'hair', shade: -1, tex: (h) => (Math.sin(h.v * 12) > 0.6 ? -1 : 0) }, [H(4.6, 6.2), H(1.2, 7.8), H(-4, 7.2), H(-7.2, 3.6), H(-7.6, -2.4), H(-5.4, -7.4), H(-2.6, -6.8), H(-2.0, -1.6), H(-0.2, 2.6), H(2.4, 4.6), H(5.6, 4.8)], { kind: 'dome', c: H(-1.6, 1.4), r: 8.2, bevel: 1 });
  // the binding over her eyes, round the head, the knot behind and its ends
  d.poly({ mat: LN, z: 39, group: 'binding' }, [H(7.0, 2.0), H(7.0, -0.8), H(-7.4, -0.4), H(-7.6, 2.6)], { kind: 'cyl', a: H(0, 2.4), b: H(0, -1), r: 2, bevel: 0.6 });
  const knot = H(-7.4, 1.0);
  d.ellipse({ mat: LN, z: 39.1, group: 'bknot' }, knot, 1.2, 1.4, s.headDir);
  const hang = -100 + Math.sin(wave) * 6;
  d.ribbon({ mat: LN, z: 39.05, group: 'bends', line: 'soft' }, [knot, at(knot, hang - 30, 3), at(at(knot, hang - 30, 3), hang, 5)], [0.9, 0.8, 0.6]);
}

/** A loose sleeve to the wrist, her forearm wrapped, a thin old hand. */
function sleeveArm(d: Draw, sh: V, el: V, ha: V, lo: number, z: number, shade: number, group: string) {
  d.capsule({ mat: RB, z, group, shade }, sh, el, 2.4, 2.4);
  d.capsule({ mat: WR, z: z + 0.1, group, shade, tex: (h) => (Math.sin(h.u * 14) > 0.5 ? -1 : 0) }, el, at(ha, lo, -1.2), 1.8, 1.5);
  d.capsule({ mat: RB, z: z + 0.15, group, shade }, at(el, lo, -0.4), at(el, lo, 2.4), 3.0, 2.6);
  d.ellipse({ mat: SK, z: z + 0.3, group, shade }, at(ha, lo, 0.2), 1.6, 1.3, lo);
}

function feet(d: Draw, s: Skel, z: number) {
  for (const [side, shade] of [['F', -1], ['N', 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF;
    const fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: WR, z: z + (side === 'N' ? 1 : 0), group: 'foot' + side, shade: shade - 1 }, [f(-2.2, 1.6), f(-2.6, -1), f(-2, -3), f(5, -3), f(6.2, -1.6), f(3, 0), f(1, 1.6)], { kind: 'bevel', w: 1.3 });
  }
}

// ---------------------------------------------------------------------------
// the staff
// ---------------------------------------------------------------------------

/**
 * The staff: a long crooked shaft of old wood, and on its head a ram's skull
 * looking forward, horns curling back round its sockets, two strings of
 * knucklebones hanging under it and swaying. `lie` flattens it when it falls.
 */
function staff(d: Draw, hand: V, ang: number, z: number, wave: number, lie: number) {
  const f0 = d.frame(hand, ang);
  const f = (u: number, w: number) => f0(u, w * lie);
  d.capsule({ mat: WD, z, group: 'shaft' }, f(-30, 0.4), f(4, -0.4), 1.2, 1.3);
  d.capsule({ mat: WD, z, group: 'shaft' }, f(4, -0.4), f(30, 0.6), 1.3, 1.5);
  // the skull: the cranium on the staff's head, the long face forward (w < 0 is forward when it stands)
  const top = f(31, 0);
  const sk = (u: number, w: number) => f(31 + u, w);
  d.poly({ mat: BN, z: z + 0.2, group: 'skull' }, [sk(3.4, 2.4), sk(4.0, -1.6), sk(2.6, -5.6), sk(0.6, -9.6), sk(-1.4, -10.0), sk(-2.6, -6.6), sk(-3.0, -1.0), sk(-1.6, 2.6)], { kind: 'dome', c: sk(0.4, -2), r: 5.6, bevel: 1.2 });
  // the sockets and the nostrils, dark
  d.pixels({ mat: BN, z: z + 0.3, group: 'skullholes', outline: false, line: 'none' }, [
    { p: sk(1.2, -2.4), c: MAT.blackCloth.ramp[0] }, { p: sk(0.2, -2.4), c: MAT.blackCloth.ramp[0] }, { p: sk(1.2, -3.4), c: MAT.blackCloth.ramp[1] },
    { p: sk(-1.0, -9.0), c: MAT.blackCloth.ramp[1] },
  ]);
  // the horns: from the crown, back and round in a curl
  const horn = (dw: number, zz: number, shade: number) => {
    const pts = [sk(3.0, 1.2 + dw), sk(6.8, 4.0 + dw), sk(6.0, 9.4 + dw), sk(1.6, 11.0 + dw), sk(-2.2, 8.6 + dw), sk(-1.6, 5.0 + dw), sk(0.6, 5.6 + dw)];
    d.ribbon({ mat: HN, z: zz, group: 'horn' + dw, shade, tex: (h) => (Math.sin(h.u * 18) > 0.4 ? -1 : 0) }, pts, [2.4, 2.3, 2.0, 1.7, 1.3, 0.9, 0.6]);
  };
  horn(0.6, z - 0.1, -1);
  horn(-0.6, z + 0.4, 0);
  // the strings of knucklebones hanging under it
  for (const [dw, len] of [[-2.6, 6], [1.4, 8]] as const) {
    const from = sk(-3, dw);
    const swing = Math.sin(wave + dw) * 3;
    const end = v(from.x + swing * 0.6, from.y - len * lie);
    d.line({ mat: SW, z: z + 0.25, group: 'string' + dw, line: 'none' }, from, end, SW.ramp[3]);
    d.pixels({ mat: BN, z: z + 0.26, group: 'sbone' + dw, line: 'none' }, [{ p: end, c: BN.ramp[4] }, { p: v(end.x, end.y + 1), c: BN.ramp[3] }, { p: v((from.x + end.x) / 2, (from.y + end.y) / 2), c: BN.ramp[4] }]);
  }
  void top;
}

// ---------------------------------------------------------------------------
// Poses & animations (arm angles are absolute: 0 points forward, 90 up)
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  y: 0,
  torso: 86,
  head: 82,
  legN: { ik: v(-4, 3) },
  legF: { ik: v(5, 3) },
  armN: { up: -70, lo: -10 },
  armF: { up: -50, lo: 36 },
  p: { stf: 92, hold: 1 },
});

/** She sways a little, the bones on her staff swinging. */
function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, { y: -b, p: { ...IDLE.p, wave: a } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : 0;
  const foot = (ph: number) => {
    const sn = Math.sin(ph);
    return { x: -7 * Math.cos(ph), y: 3 + (sn > 0 ? 3 * sn : 0) };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return tweak(IDLE, { y: bob - 1, torso: 80, head: 78, legN: { ik: v(n.x, n.y) }, legF: { ik: v(f.x, f.y) }, armN: { up: -96, lo: -40 }, p: { ...IDLE.p, wave: a * 2, stf: 84 } });
}

// Cast the Bones: the bones shaken in the near hand by her hip, then flung out and up at the enemy.
const CB_SHAKE = tweak(IDLE, { x: -1, torso: 92, head: 86, armN: { up: -130, lo: -70 }, p: { ...IDLE.p, hold: 1 } });
const CB_FLING = tweak(IDLE, { x: 3, torso: 80, head: 84, armN: { up: 6, lo: 24 }, p: { ...IDLE.p, hold: 0 } });
const CB_HOLD = tweak(CB_FLING, { x: 2, torso: 82, armN: { up: -10, lo: 10 } });

// Read the Omens: the staff lifted high, her bound face turned up to it.
const RO_LIFT = tweak(IDLE, { y: 1, torso: 92, head: 108, armF: { up: 40, lo: 80 }, armN: { up: -40, lo: 20 }, p: { ...IDLE.p, stf: 94, hold: 0 } });
const RO_HIGH = tweak(RO_LIFT, { y: 2, head: 112, armF: { up: 62, lo: 88 }, p: { ...RO_LIFT.p, wave: 2 } });

// Ill Omen: the staff swung down to point the ram's skull at the enemy, her near hand along its shaft.
const IO_DRAW = tweak(IDLE, { x: -2, torso: 96, head: 90, armF: { up: 20, lo: 70 }, armN: { up: -50, lo: 30 }, p: { ...IDLE.p, stf: 120, hold: 0 } });
const IO_POINT = pose({ x: 4, y: -1, torso: 76, head: 78, legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) }, armF: { up: -10, lo: 4 }, armN: { up: -30, lo: 4 }, p: { stf: 28, hold: 0 } });
const IO_HOLD = tweak(IO_POINT, { x: 5, torso: 74, p: { ...IO_POINT.p, wave: 2 } });

const HURT = tweak(IDLE, { x: -4, y: -1, torso: 98, head: 102, armN: { up: -100, lo: -40 }, p: { ...IDLE.p, stf: 100 } });
const DEATH_KNEEL = pose({ x: 0, y: -13, torso: 72, head: 56, legN: { ik: v(-12, 3) }, legF: { ik: v(8, 3) }, footN: -30, armN: { up: -70, lo: -40 }, armF: { up: -60, lo: -30 }, p: { stf: 70, wave: 1 } });
const DEATH_FALL = pose({ x: 2, y: -10, torso: 30, head: 16, legN: { up: -150, lo: -175 }, legF: { up: -118, lo: -170 }, footN: -90, footF: -80, armN: { up: -40, lo: -20 }, armF: { up: -30, lo: -10 }, p: { drop: 1, wave: 2 } });
const DEATH_DOWN = pose({ x: 5, y: -21, torso: 4, head: -2, legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 }, armN: { up: 4, lo: 2 }, armF: { up: -2, lo: 4 }, p: { drop: 1, wave: 2 } });

/** Victory: the staff raised, the bones thrown up from her other hand. */
const VICTORY = tweak(IDLE, { y: 1, torso: 90, head: 100, armF: { up: 54, lo: 86 }, armN: { up: 30, lo: 60 }, p: { ...IDLE.p, stf: 92, hold: 0 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'haruspex',
  name: 'Haruspex',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 190, idle) },
    run: { loop: true, frames: cycle(8, 90, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, CB_SHAKE, 2, 100, ease.out),
        ...keys([
          [tweak(CB_SHAKE, { armN: { up: -124, lo: -60 } }), 90],
          [CB_SHAKE, 90],
          [mid(CB_SHAKE, CB_FLING, 0.5), 60],
          [CB_FLING, 90, { hit: true }],
          [CB_HOLD, 240],
        ]),
        ...tween(D, CB_HOLD, IDLE, 3, 100, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, RO_LIFT, 3, 110, ease.out),
        ...keys([
          [RO_LIFT, 160],
          [RO_HIGH, 160, { hit: true, event: 'cast' }],
          [tweak(RO_HIGH, { p: { ...RO_HIGH.p, wave: 3.2 } }), 200],
          [tweak(RO_HIGH, { p: { ...RO_HIGH.p, wave: 4.4 } }), 200],
        ]),
        ...tween(D, RO_HIGH, IDLE, 3, 120, ease.inOut),
      ],
    },
    ritual: {
      loop: false,
      frames: [
        ...tween(D, IDLE, IO_DRAW, 3, 110, ease.out),
        ...keys([
          [IO_DRAW, 200],
          [mid(IO_DRAW, IO_POINT, 0.5), 60],
          [IO_POINT, 140, { hit: true, event: 'cast' }],
          [IO_HOLD, 360],
          [mid(IO_HOLD, IDLE, 0.5), 120],
          [IDLE, 90],
        ]),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: -3, torso: 95, head: 98 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 260],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -21.4 }), 600],
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

/** The ram's skull, face down to the left, for the icons. */
function iconSkull(d: Draw, c: V, z: number) {
  d.poly({ mat: BN, z, group: 'isk' }, [v(c.x + 5, c.y + 6), v(c.x + 7, c.y), v(c.x + 3, c.y - 7), v(c.x - 3, c.y - 12), v(c.x - 7, c.y - 9), v(c.x - 5, c.y - 1), v(c.x - 2, c.y + 6)], { kind: 'dome', c: v(c.x, c.y - 1), r: 9, bevel: 1.4 });
  d.ribbon({ mat: HN, z: z + 0.2, group: 'ihorn', tex: (h) => (Math.sin(h.u * 18) > 0.4 ? -1 : 0) }, [v(c.x + 3, c.y + 5), v(c.x + 9, c.y + 9), v(c.x + 13, c.y + 4), v(c.x + 11, c.y - 2), v(c.x + 7, c.y - 1)], [2.6, 2.4, 2, 1.6, 1.1]);
}

export const haruspex: ChampionArt = {
  char,
  iconBg: RB,
  icons: {
    cast_the_bones: () =>
      compose(RB, glyph((d) => {
        // a thin hand flinging, the bones flying from it
        d.capsule({ mat: WR, z: 2, group: 'iarm' }, v(3, 6), v(12, 15), 2.6, 2.2);
        d.ellipse({ mat: SK, z: 3, group: 'ihand' }, v(14, 17), 3.2, 2.4, 40);
      }), (b) => {
        const R = BN.ramp;
        for (const [x, y] of [[20, 20], [25, 15], [30, 18], [27, 9], [33, 11]] as const) {
          b.set(x, y, R[4]); b.set(x + 1, y, R[4]); b.set(x, y + 1, R[2]); b.set(x + 1, y + 1, R[3]);
        }
      }),
    read_the_omens: () =>
      compose(RB, glyph((d) => {
        d.capsule({ mat: WD, z: 1, group: 'ish' }, v(20, 2), v(20, 22), 1.6, 1.6);
        iconSkull(d, v(18, 28), 2);
      }), (b) => {
        // rays of favour rising from it
        const G = MAT.glowGold.ramp;
        for (const [x, y, k] of [[8, 6, 3], [6, 12, 2], [32, 6, 3], [34, 12, 2], [14, 3, 4], [26, 3, 4]] as const) b.set(x, y, G[k]);
      }),
    ill_omen: () =>
      compose(RB, glyph((d) => {
        // the skull pointed at the enemy, the staff behind it
        d.capsule({ mat: WD, z: 1, group: 'ish' }, v(34, 30), v(20, 22), 1.6, 1.6);
        iconSkull(d, v(15, 20), 2);
      }), (b) => {
        // a shadow going out from it
        const R = MAT.blackCloth.ramp;
        for (let i = 0; i < 9; i++) for (const dy of [-i * 0.6, 0, i * 0.6]) b.set(9 - Math.round(i * 0.7), Math.round(24 + dy), R[2]);
      }),
  },
};
