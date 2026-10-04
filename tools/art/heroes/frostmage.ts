// Ysolde, the Frost Witch — enemy caster. Long ice-blue robe with white fur
// trim, silver hair, crown of ice crystals, crystal staff with orbiting
// shards. Signature color: ice blue + cyan glow.
import { BuildInfo, CharDef, cycle, keys } from '../char.ts';
import { INK, MAT } from '../palette.ts';
import { foldTex, torsoPts } from '../parts.ts';
import { hex } from '../raster.ts';
import { at, Dims, Draw, ease, lerpPose, lerpV, pose, Pose, Skel, tweak, V, v } from '../rig.ts';
import { face } from './common.ts';

const D: Dims = {
  hipH: 34,
  thigh: 16,
  shin: 16,
  ankleH: 3,
  footLen: 5.5,
  spine: 20,
  neck: 7.4,
  upperArm: 12,
  foreArm: 11,
  shoulderDrop: 3.6,
  shoulderN: -2.4,
  shoulderF: 2.8,
  hipN: -1.4,
  hipF: 1.4,
};

const IC = MAT.ice, FW = MAT.furWhite, SV = MAT.silver, SK = MAT.skinPale, HS = MAT.hairSilver, GI = MAT.glowIce, CH = MAT.charcoal;

function build(d: Draw, s: Skel, info: BuildInfo) {
  const P = s.pose.p;
  const wave = P.wave ?? 0;

  hairBack(d, s, P.hair ?? 0);

  // feet peeking under the robe
  for (const [side, z, shade] of [['F', 11, -1], ['N', 12, 0]] as const) {
    const an = side === 'N' ? s.ankN : s.ankF;
    const fa = side === 'N' ? s.pose.footN : s.pose.footF;
    const f = d.frame(an, fa);
    d.poly({ mat: CH, z, group: 'foot' + side, shade }, [f(-2.4, 1.8), f(-2.8, -1), f(-2.2, -3), f(5.6, -3), f(7.8, -1.2), f(3.6, 0), f(1, 1.8)], { kind: 'bevel', w: 1.4 });
  }

  robeSkirt(d, s, wave);

  // far arm with bell sleeve
  sleeveArm(d, s, 'F', 20, -1);

  // torso: fitted robe bodice
  const torso = torsoPts(s, [
    [0, 5.2, 5.4],
    [4, 4.8, 5.4],
    [8.5, 5.2, 6.6],
    [12.5, 5.8, 7.2],
    [16, 6.0, 6.0],
    [18.5, 4.6, 3.8],
    [20, 2.8, 2.2],
  ]);
  d.poly({ mat: IC, z: 30, group: 'body' }, torso, { kind: 'cyl', a: s.T(0, 0.6), b: s.T(20, 0.6), r: 6.6, bevel: 1.3 });
  // silver front trim + belt with a crystal clasp
  d.capsule({ mat: SV, z: 30.5, group: 'body', line: 'none' }, s.T(17.5, 4.4), s.T(3.4, 4.6), 0.6, 0.6);
  d.poly({ mat: SV, z: 33, group: 'body' }, [s.T(3.2, -5.4), s.T(3.4, 5.9), s.T(1.2, 5.7), s.T(1.0, -5.2)], { kind: 'cyl', a: s.T(0, 0), b: s.T(3, 0), r: 5.8 });
  d.ellipse({ mat: GI, z: 33.3, group: 'body' }, s.T(2.2, 5.1), 1.3, 1.6, s.torso);

  // fur collar
  d.poly(
    { mat: FW, z: 36, group: 'collar', tex: (h, x, y) => ((x * 5 + y * 3) % 6 === 0 ? -1 : 0) },
    [s.T(21.6, -4.6), s.T(21.8, 3.6), s.T(19, 6.6), s.T(17.2, 5.4), s.T(16.2, 6.4), s.T(15.6, 3.8), s.T(16.4, 1), s.T(15.2, -1.6), s.T(16.2, -4.2), s.T(15.6, -6.6), s.T(18.2, -7.4), s.T(20.4, -6.6)],
    { kind: 'dome', c: s.T(19, -0.5), r: 9, bevel: 1.4 },
  );

  head(d, s, P);

  // staff in the near hand
  staff(d, s, P);

  sleeveArm(d, s, 'N', 60, 0);

  // casting glow in the far hand
  if (P.handGlow) handGlow(d, s.hF, P.handGlow);
}

function sleeveArm(d: Draw, s: Skel, side: 'N' | 'F', z: number, shade: number) {
  const sh = side === 'N' ? s.sN : s.sF;
  const el = side === 'N' ? s.eN : s.eF;
  const ha = side === 'N' ? s.hN : s.hF;
  const lo = side === 'N' ? s.loN : s.loF;
  const g = 'arm' + side;
  d.capsule({ mat: IC, z, group: g, shade }, sh, el, 2.9, 2.6);
  // bell sleeve: flares toward the wrist and drapes toward the ground
  const L = Math.hypot(ha.x - el.x, ha.y - el.y) - 1.5;
  const f = d.frame(el, lo);
  const downSide = Math.sin(((lo + 90) * Math.PI) / 180) < 0 ? 1 : -1; // which w side faces the ground
  const drape = 2.6 * Math.abs(Math.cos((lo * Math.PI) / 180));
  const wTop = -downSide, wBot = downSide;
  const pts = [f(-0.5, 2.6 * wTop), f(L - 1, 4.0 * wTop), f(L + 0.6, 3.7 * wTop), f(L + 0.6 + drape * 0.5, (3.9 + drape) * wBot), f(L - 2, (4.2 + drape) * wBot), f(-0.5, 2.6 * wBot)];
  d.poly({ mat: IC, z: z + 0.1, group: g, shade, tex: foldTex(6, 0.5, 0.65) }, pts, { kind: 'cyl', a: f(0, 0), b: f(L, 0), r: 4.4, bevel: 1 });
  // dark inside of the sleeve + silver cuff trim
  d.ellipse({ mat: IC, z: z + 0.15, group: g, flat: 1, line: 'none' }, f(L + 0.2, drape * 0.45 * wBot), 0.9, 3.2 + drape * 0.4, lo);
  d.capsule({ mat: SV, z: z + 0.2, group: g, shade, line: 'none' }, f(L + 0.4, 3.6 * wTop), f(L + 0.6 + drape * 0.5, (3.8 + drape) * wBot), 0.7, 0.7);
  // hand emerging from the sleeve
  d.ellipse({ mat: SK, z: z - 0.05, group: g + 'h', shade, line: 'soft' }, at(ha, lo, 0.8), 2.2, 1.9, lo);
}

function robeSkirt(d: Draw, s: Skel, wave: number) {
  const back = s.ankN.x < s.ankF.x ? s.ankN : s.ankF;
  const front = back === s.ankN ? s.ankF : s.ankN;
  const kneeF = Math.max(s.kneeN.x, s.kneeF.x);
  const kneeB = Math.min(s.kneeN.x, s.kneeF.x);
  const waistB = s.T(1.6, -5.4), waistF = s.T(1.6, 5.6);
  const hemB = v(Math.min(back.x - 6.5, waistB.x - 4.5), Math.max(1.2, back.y - 1.6));
  const hemF = v(Math.max(front.x + 3.8, waistF.x + 2.5), Math.max(1.2, front.y - 1.6));
  const midF = v(Math.max(kneeF + 3.5, waistF.x + 1.4), lerpV(waistF, hemF, 0.5).y);
  const midB = v(Math.min(kneeB - 4.2, waistB.x - 2.5), lerpV(waistB, hemB, 0.5).y);
  const hem: V[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = lerpV(hemF, hemB, t);
    hem.push(v(p.x, p.y + Math.sin(wave + t * 9) * 0.9 + (i % 2 ? 0.6 : 0)));
  }
  const axisA = lerpV(waistB, waistF, 0.5), axisB = lerpV(hemB, hemF, 0.5);
  d.poly(
    { mat: IC, z: 15, group: 'skirt', tex: foldTex(9, wave * 0.6, 0.62) },
    [waistB, waistF, midF, ...hem, midB],
    { kind: 'cyl', a: axisA, b: axisB, r: Math.max(7, (hemF.x - hemB.x) / 2), bevel: 1.2 },
  );
  // fur hem
  d.ribbon({ mat: FW, z: 15.2, group: 'skirt', tex: (h, x, y) => ((x * 5 + y * 3) % 6 === 0 ? -1 : 0) }, hem.map((p) => v(p.x, p.y + 0.6)), hem.map(() => 1.5));
  // front opening trim
  d.capsule({ mat: SV, z: 15.3, group: 'skirt', line: 'none' }, lerpV(waistF, waistB, 0.25), lerpV(hemF, hemB, 0.2), 0.6, 0.6);
}

function hairBack(d: Draw, s: Skel, sway: number) {
  const H = s.H, T = s.T;
  const pts = [H(-0.5, 7), H(-6.4, 4.6), H(-8.0, 0), T(16, -7.4 - sway * 0.4), T(9, -8.6 - sway), T(3.5, -8.0 - sway * 1.4), T(4.6, -6.2 - sway), T(10, -5.6), H(-3, -4.2)];
  d.poly({ mat: HS, z: 3, group: 'hair', tex: (h, x, y) => ((x * 3 + y) % 5 === 0 ? -1 : 0) }, pts, { kind: 'dome', c: H(-4, -2), r: 12, bevel: 1.4 });
}

function head(d: Draw, s: Skel, P: Record<string, number>) {
  const H = s.H;
  d.capsule({ mat: SK, z: 37.5, group: 'head' }, s.neck, H(0, -4), 2.4, 2.2);
  face(d, s, { skin: SK, z: 38, brow: HS.ramp[2], browStyle: 'calm', glowEye: hex('#8ff0ff'), ear: 'none', mouth: 'line', lip: INK.frostLip, rx: 5.9, ry: 6.5 });
  // silver hair: crown of the head + side lock framing the face
  d.poly(
    { mat: HS, z: 38.8, group: 'head' },
    [H(6.0, 4.2), H(3.4, 7.6), H(-2, 8), H(-6.4, 5), H(-7.2, 0), H(-5, -6.5), H(-2.2, -7.6), H(-1.6, -2.4), H(0.6, 1.6), H(3.6, 3.4)],
    { kind: 'dome', c: H(-1, 3), r: 9, bevel: 1.2 },
  );
  // ice crown
  const spikes: [number, number, number][] = [
    [-4.4, 6.4, 5], [-1.4, 7.8, 8], [1.6, 7.6, 6], [4.0, 6.4, 3.6],
  ];
  for (const [x, y, h] of spikes) {
    const base = H(x, y);
    const tip = H(x + 0.8, y + h);
    d.poly({ mat: GI, z: 39 + x * 0.01, group: 'crown' }, [at(base, s.headDir, -0.4), H(x - 1.3, y + 0.6), tip, H(x + 1.5, y + 0.6)], { kind: 'bevel', w: 1 });
  }
  d.capsule({ mat: SV, z: 39.2, group: 'crown' }, H(-5.6, 6.0), H(4.8, 6.0), 0.8, 0.8);
}

function staff(d: Draw, s: Skel, P: Record<string, number>) {
  const ang = P.staffAng ?? 90;
  const f = d.frame(s.hN, ang);
  d.capsule({ mat: SV, z: 55, group: 'staff', tex: (h) => (Math.floor(h.u * 16) % 5 === 0 ? -1 : 0) }, f(-26, 0), f(21, 0), 1.2, 1.3);
  // claw holding the crystal
  d.poly({ mat: SV, z: 55.2, group: 'staff' }, [f(20, -1.4), f(23.5, -3.2), f(25.5, -2.4), f(22.5, -0.8), f(22.5, 0.8), f(25.5, 2.4), f(23.5, 3.2), f(20, 1.4)], { kind: 'bevel', w: 1 });
  // crystal (glow), pulse shifts the ramp
  const pulse = P.glow ?? 0;
  const cf = d.frame(at(s.hN, ang, 24.5), ang);
  d.poly(
    { mat: GI, z: 55.4, group: 'crystal', shade: Math.round(pulse) },
    [cf(-1, 0), cf(3, -3.1), cf(9.5, -2.6), cf(13, 0), cf(9.5, 2.6), cf(3, 3.1)],
    { kind: 'bevel', w: 2 },
  );
  // orbiting shards
  const orb = P.orbit ?? 0;
  for (let i = 0; i < 2; i++) {
    const a = orb + i * Math.PI;
    const c = cf(6 + Math.sin(a) * 2, Math.cos(a) * 8.5);
    const zz = Math.sin(a) > 0 ? 55.5 : 54.5;
    d.poly({ mat: GI, z: zz, group: 'shard' + i }, [v(c.x, c.y + 2), v(c.x + 1.3, c.y), v(c.x, c.y - 2), v(c.x - 1.3, c.y)], { kind: 'bevel', w: 1 });
  }
}

function handGlow(d: Draw, p: V, stage: number) {
  const r = [0, 2.4, 3.6, 4.6, 3.4][stage] ?? 2;
  d.circle({ mat: GI, z: 70, group: 'glow', line: 'none', flat: 3 }, p, r + 1.2);
  d.circle({ mat: GI, z: 70.1, group: 'glow', line: 'none', flat: 5 }, p, r * 0.6);
}

// ---------------------------------------------------------------------------
// Poses & animations
// ---------------------------------------------------------------------------

const IDLE: Pose = pose({
  torso: 89,
  head: 88,
  legN: { ik: v(-5, 3) },
  legF: { ik: v(6, 3) },
  armN: { up: -78, lo: 20 },
  armF: { up: -96, lo: -62 },
  p: { staffAng: 92, glow: 0, orbit: 0, wave: 0, hair: 0, handGlow: 0 },
});

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return tweak(IDLE, {
    y: -b,
    armN: { up: -78 + b * 2, lo: 20 + b * 2 },
    armF: { up: -96 + b * 2, lo: -62 + b * 4 },
    p: { staffAng: 92, glow: t < 0.5 ? 0 : 1, orbit: a, wave: a, hair: Math.sin(a) * 0.8 },
  });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const c2 = Math.cos(2 * a);
  const bob = c2 > 0.5 ? 1 : c2 < -0.5 ? -1 : 0;
  const foot = (ph: number) => {
    const s = Math.sin(ph);
    return { x: -9 * Math.cos(ph), y: 3 + (s > 0 ? 5 * s : 0), ang: s > 0 ? -20 * s : 0 };
  };
  const n = foot(a), f = foot(a + Math.PI);
  return pose({
    y: bob - 1,
    torso: 80,
    head: 86,
    legN: { ik: v(n.x - 1, n.y) },
    legF: { ik: v(f.x + 1, f.y) },
    footN: n.ang,
    footF: f.ang,
    armN: { up: -55, lo: 10 },
    armF: { up: -125 + Math.cos(a) * 10, lo: -100 },
    p: { staffAng: 62, glow: 1, orbit: a * 2, wave: a * 2 + 2, hair: 2.2 + Math.sin(a * 2) * 0.5 },
  });
}

// Ice Shard: thrust the staff at the target.
const SH_WIND = pose({
  x: -2, torso: 95, head: 92,
  legN: { ik: v(-8, 3) }, legF: { ik: v(6, 3) },
  armN: { up: -120, lo: -40 }, armF: { up: -60, lo: 10 },
  p: { staffAng: 128, glow: 1, orbit: 1, wave: 1, hair: -0.6 },
});
const SH_THRUST = pose({
  x: 5, y: -2, torso: 72, head: 82,
  legN: { ik: v(-8, 3) }, legF: { ik: v(12, 3) },
  armN: { up: 5, lo: 8 }, armF: { up: -140, lo: -110 },
  p: { staffAng: 14, glow: 2, orbit: 2, wave: 2, hair: 1.6 },
});

// Blizzard: staff raised high, then slammed down.
const BZ_RAISE = pose({
  y: 1, torso: 95, head: 104,
  legN: { ik: v(-6, 3) }, legF: { ik: v(6, 3) },
  armN: { up: 96, lo: 92 }, armF: { up: 80, lo: 70 },
  p: { staffAng: 92, glow: 2, orbit: 1, wave: 1, hair: -1, handGlow: 2 },
});
const BZ_SLAM = pose({
  y: -4, torso: 78, head: 80,
  legN: { ik: v(-9, 3) }, legF: { ik: v(8, 3) },
  armN: { up: -20, lo: 30 }, armF: { up: -60, lo: -20 },
  p: { staffAng: 88, glow: 2, orbit: 2, wave: 2.6, hair: 1.6 },
});

// Glacial Prison: open palm forward, channelling.
const GP_CAST = pose({
  x: 2, torso: 84, head: 86,
  legN: { ik: v(-8, 3) }, legF: { ik: v(8, 3) },
  armN: { up: -110, lo: -60 }, armF: { up: 6, lo: 10 },
  p: { staffAng: 112, glow: 1, orbit: 1, wave: 1, hair: 0.6, handGlow: 1 },
});

const HURT = pose({
  x: -4, torso: 102, head: 108,
  legN: { ik: v(-7, 3) }, legF: { ik: v(5, 4) },
  armN: { up: -130, lo: -80 }, armF: { up: -40, lo: 20 },
  p: { staffAng: 118, glow: 0, orbit: 1, wave: 2, hair: -1.6 },
});
const DEATH_KNEEL = pose({
  x: -2, y: -14, torso: 74, head: 60,
  legN: { ik: v(-12, 3) }, legF: { ik: v(7, 3) },
  armN: { up: -90, lo: -80 }, armF: { up: -80, lo: -70 },
  p: { staffAng: 70, glow: 0, orbit: 2, wave: 1, hair: 0.6 },
});
const DEATH_FALL = pose({
  x: 1, y: -22, torso: 30, head: 14,
  legN: { up: -150, lo: -175 }, legF: { up: -120, lo: -170 },
  armN: { up: -60, lo: -30 }, armF: { up: -40, lo: -10 },
  p: { staffAng: 30, glow: 0, orbit: 3, wave: 1.6, hair: 1.4 },
});
const DEATH_DOWN = pose({
  x: 5, y: -28, torso: 4, head: -2,
  legN: { up: 172, lo: 176 }, legF: { up: 178, lo: 182 },
  armN: { up: 4, lo: 2 }, armF: { up: -8, lo: -4 },
  p: { staffAng: 6, glow: -1, orbit: 3, wave: 2, hair: 2.4 },
});

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

export const frostmage: CharDef = {
  id: 'frostmage',
  name: 'Ysolde',
  dims: D,
  build,
  anims: {
    idle: { loop: true, frames: cycle(8, 130, idle) },
    run: { loop: true, frames: cycle(8, 80, run) },
    attack1: {
      loop: false,
      frames: keys([
        [mid(IDLE, SH_WIND, 0.5), 80],
        [SH_WIND, 180],
        [mid(SH_WIND, SH_THRUST, 0.6), 50],
        [SH_THRUST, 80, { event: 'shoot', hit: true }],
        [tweak(SH_THRUST, { x: 6, torso: 70, p: { glow: 1, orbit: 2.6, wave: 2.6 } }), 200],
        [mid(SH_THRUST, IDLE, 0.5), 100],
        [IDLE, 100],
      ]),
    },
    attack2: {
      loop: false,
      frames: keys([
        [mid(IDLE, BZ_RAISE, 0.5), 90],
        [BZ_RAISE, 120, { event: 'cast' }],
        [tweak(BZ_RAISE, { y: 2, p: { orbit: 1.8, wave: 1.4, handGlow: 3 } }), 120],
        [tweak(BZ_RAISE, { y: 2, p: { orbit: 2.6, wave: 1.8, handGlow: 4 } }), 120],
        [BZ_SLAM, 80, { hit: true }],
        [tweak(BZ_SLAM, { y: -5, p: { orbit: 3, wave: 3 } }), 240],
        [mid(BZ_SLAM, IDLE, 0.5), 110],
        [IDLE, 100],
      ]),
    },
    attack3: {
      loop: false,
      frames: keys([
        [mid(IDLE, GP_CAST, 0.5), 90],
        [GP_CAST, 110, { event: 'cast' }],
        [tweak(GP_CAST, { x: 3, p: { handGlow: 2, orbit: 1.6, wave: 1.4 } }), 110],
        [tweak(GP_CAST, { x: 3, p: { handGlow: 3, orbit: 2.2, wave: 1.8 } }), 110],
        [tweak(GP_CAST, { x: 4, torso: 80, armF: { up: 10, lo: 14 }, p: { handGlow: 4, orbit: 2.8, wave: 2.2 } }), 120, { hit: true }],
        [tweak(GP_CAST, { x: 3, p: { handGlow: 1, orbit: 3.4, wave: 2.6 } }), 200],
        [mid(GP_CAST, IDLE, 0.5), 100],
        [IDLE, 100],
      ]),
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
        [HURT, 120],
        [mid(HURT, DEATH_KNEEL, 0.5), 110],
        [DEATH_KNEEL, 220],
        [DEATH_FALL, 110],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -29 }), 600],
      ]),
    },
  },
};
