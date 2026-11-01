// The Bristleback (docs/DESIGN_DECISIONS.md section 51, 2026-11-01, my proposal on
// Jakub's word): a Common Tank of the Court of Root, a heavy old boar on four
// legs. Dark brown bristled hide, a black crest along his spine, a heavy wedge of a
// head, a flat snout, two curved bone tusks, small ears; moss on his back and a
// little sapling growing out of his shoulders (the silhouette: the hump, the
// sapling and the tusks). No collar: the Court shares a nature, not a hierarchy.
// The rig is the Follower's, with a boar's proportions. His affinity (Tide) sets
// nothing here (Jakub, 2026-10-11).
import { BuildInfo, ChampionArt, CharDef, cycle, keys, tween } from '../char.ts';
import { compose, glyph } from '../icons.ts';
import { ACCENT, INK, MAT } from '../palette.ts';
import { RGBA } from '../raster.ts';
import { at, dir, Dims, Draw, ease, ik2, lerpPose, pose, Pose, Skel, tweak, V, v } from '../rig.ts';

const D: Dims = {
  hipH: 33,
  thigh: 15,
  shin: 15,
  ankleH: 3,
  footLen: 6,
  spine: 17,
  neck: 15,
  upperArm: 11,
  foreArm: 17,
  shoulderDrop: 0,
  shoulderN: 0,
  shoulderF: 0,
  hipN: 0,
  hipF: 0,
};

const HD = MAT.furBrown, BK = MAT.furBlack, MS = MAT.moss, TK = MAT.bone, BR = MAT.bark, LF = MAT.green;

/** The body's centre stands this far behind the pivot (x of every pose). */
const BACK = -6;
/** The head's scale on the sprite: a boar's head is big for his body. */
const HEAD = 1.05;
/** Leg bones: front (shoulder to elbow, elbow to wrist), hind (hip to stifle, stifle to hock). */
const UPPER = 10, LOWER = 14, THIGH = 13, GASKIN = 13;

interface Leg { root: V; mid: V; low: V; paw: V }
interface Boar { B: (u: number, w: number) => V; withers: V; head: V; neck: number; fN: Leg; fF: Leg; hN: Leg; hF: Leg }

/** The boar's skeleton from a pose: body frame B (u forward along the spine, w down toward the belly), the neck and the four legs. */
function solveBoar(p: Pose): Boar {
  const c = v(p.x, D.hipH + p.y);
  const ax = dir(p.torso), dn = dir(p.torso - 90);
  const B = (u: number, w: number) => v(c.x + ax.x * u + dn.x * w, c.y + ax.y * u + dn.y * w);
  const withers = at(c, p.torso, D.spine);
  const head = at(withers, p.head, D.neck);
  const target = (l: Pose['armN']) => ('ik' in l ? l.ik : v(0, 1.6));
  // a lifted paw folds back at the wrist (front) or swings under at the hock (hind);
  // lying down (p.lie), the pasterns and hocks rest flat on the ground behind the paws
  const lift = (paw: V) => Math.max(0, Math.min(1, (paw.y - 1.6) / 6));
  const lie = p.p.lie ?? 0;
  const front = (root: V, paw: V): Leg => {
    const k = lift(paw);
    const r = ik2(root, v(paw.x - 1.2 + k * 4.4 - lie * 5, paw.y + 4.4 - k * 1.4 - lie * 4), UPPER, LOWER, -1);
    return { root, mid: r.mid, low: r.end, paw };
  };
  const hind = (root: V, paw: V): Leg => {
    const k = lift(paw);
    const r = ik2(root, v(paw.x - 2.6 - k * 3 - lie * 9.5, paw.y + 8.6 - k * 1.6 - lie * 10.4), THIGH, GASKIN, 1);
    return { root, mid: r.mid, low: r.end, paw };
  };
  return {
    B, withers, head, neck: p.head,
    fN: front(B(11, 7.5), target(p.armN)),
    fF: front(B(12.4, 7), target(p.armF)),
    hN: hind(B(-15.5, 2.6), target(p.legN)),
    hF: hind(B(-14, 2.1), target(p.legF)),
  };
}

function build(d: Draw, s: Skel, info: BuildInfo) {
  void info;
  const P = s.pose.p;
  const g = solveBoar(s.pose);
  const snout = P.snout ?? -22;
  const Hd = d.frame(g.head, snout);

  leg_(d, g.hF, 'hF', 10, -1, 6.6, 3.0);
  leg_(d, g.fF, 'fF', 12, -1, 5.6, 2.9);
  // the short tail with its tuft, behind the rump
  const t0 = g.B(-26, -2.4);
  const ta = P.tail ?? -130;
  d.ribbon({ mat: HD, z: 20, group: 'tail' }, [t0, at(t0, ta, 4), at(t0, ta - 12, 7.4)], [1.1, 0.9, 0.7]);
  d.circle({ mat: BK, z: 20.1, group: 'tail' }, at(t0, ta - 12, 8.4), 1.3);
  leg_(d, g.fN, 'fN', 29, 0, 6.2, 3.1);
  leg_(d, g.hN, 'hN', 29.5, 0, 7.6, 3.2);
  body(d, g, 30);
  mane(d, g, P.bristle ?? 0, 31);
  mossBack(d, g, P.wave ?? 0, 32);
  neck(d, g, 40);
  head(d, Hd, snout, P, 44, HEAD);
}

/** A coarse hide: dark hairs breaking it up. */
const fur = (_h: unknown, x: number, y: number) => ((x * 3 + y * 7) % 7 === 0 ? -1 : (x * 5 + y * 2) % 23 === 0 ? 1 : 0);

function leg_(d: Draw, l: Leg, g: string, z: number, shade: number, r0: number, r1: number) {
  d.capsule({ mat: HD, z, group: g, shade, tex: fur }, l.root, l.mid, r0, r0 * 0.66);
  d.capsule({ mat: HD, z: z + 0.1, group: g, shade }, l.mid, l.low, r0 * 0.56, r1);
  d.capsule({ mat: HD, z: z + 0.2, group: g, shade }, l.low, l.paw, r1, r1 * 0.9);
  // the cloven hoof
  d.ellipse({ mat: BK, z: z + 0.3, group: g, shade }, v(l.paw.x + 0.8, l.paw.y + 0.2), 2.8, 1.7, 0);
  d.pixels({ mat: BK, z: z + 0.35, group: g, outline: false, line: 'none' }, [{ p: v(l.paw.x + 1.4, l.paw.y), c: BK.ramp[0] }]);
}

/** The barrel of him, the high hump over the shoulders, sloping to the rump. */
function body(d: Draw, g: Boar, z: number) {
  const B = g.B;
  d.poly(
    { mat: HD, z, group: 'body', tex: fur },
    [B(-27, -1), B(-23, -6), B(-13, -8), B(-3, -9), B(7, -11.6), B(15, -13.4), B(22, -10.6), B(25.6, -3), B(25.4, 5), B(21, 11), B(14, 13), B(4, 13), B(-8, 12.2), B(-18, 10.4), B(-25, 6)],
    { kind: 'dome', c: B(0, -1), r: 27, bevel: 1.3 },
  );
}

/** The black crest along his spine, raised by `bristle`. */
function mane(d: Draw, g: Boar, bristle: number, z: number) {
  const B = g.B;
  const pts: V[] = [];
  for (let k = 0; k <= 14; k++) {
    const u = -14 + k * 2.8;
    const top = u < 7 ? -8.2 - (u + 14) * 0.17 : -11.8 - (u - 7) * 0.2;
    pts.push(B(u, top + 2), B(u + 1.2, top - (k % 2 ? 2.6 : 1.2) - bristle * 1.8));
  }
  const back: V[] = [];
  for (let k = 14; k >= 0; k--) back.push(B(-14 + k * 2.8, (k < 8 ? -6.6 : -9.4)));
  d.poly({ mat: BK, z, group: 'mane', line: 'soft' }, [...pts, ...back], { kind: 'bevel', w: 1 });
}

/** Moss in patches over his rump and a small sapling growing out of his shoulders, its leaves stirring. */
function mossBack(d: Draw, g: Boar, wave: number, z: number) {
  const B = g.B;
  d.poly({ mat: MS, z, group: 'moss', line: 'soft', tex: fur }, [B(-22, -5.8), B(-14, -8.2), B(-6, -8.8), B(-3, -5.6), B(-8, -3), B(-14, -4), B(-20, -2)], { kind: 'dome', c: B(-12, -5), r: 9, bevel: 1 });
  const r = B(9, -11.4);
  const a = 100 + Math.sin(wave) * 2;
  const m = at(r, a, 9), t = at(m, a - 14, 9);
  d.ribbon({ mat: BR, z: z + 0.1, group: 'sapling' }, [r, m, t], [1.1, 0.8, 0.5]);
  const b1 = at(m, a + 50, 4.4);
  d.ribbon({ mat: BR, z: z + 0.1, group: 'sapling' }, [m, b1], [0.6, 0.4]);
  for (const [p, rot] of [[t, 0], [b1, 1], [at(m, a - 60, 3.4), 2]] as const) {
    d.ellipse({ mat: LF, z: z + 0.2, group: 'leaf' + rot }, p, 2.6, 1.7, a - 20 + rot * 40 + Math.sin(wave + rot) * 6);
  }
}

function neck(d: Draw, g: Boar, z: number) {
  const a = g.neck;
  const f = d.frame(at(g.withers, a, -4), a);
  const L = D.neck + 4;
  d.poly({ mat: HD, z, group: 'body', tex: fur }, [f(-2, 11), f(L * 0.5, 9.4), f(L, 6.4), f(L, -6.4), f(L * 0.5, -10), f(-2, -12)], { kind: 'dome', c: f(L * 0.4, 0), r: 14, bevel: 1.2 });
}

/** The wedge of his head in a frame along the snout (u forward, w up): the flat snout disc, the tusks, a small dark eye, short ears. */
function head(d: Draw, Hd: (u: number, w: number) => V, snout: number, P: Record<string, number>, z: number, k: number) {
  const H = (u: number, w: number) => Hd(u * k, w * k);
  const g = 'head' + Math.round(z);
  const jaw = P.jaw ?? 0;
  // the far ear
  d.poly({ mat: HD, z: z - 0.4, group: g + 'ef', shade: -1 }, [H(-4, 5), H(-6, 10), H(-2.4, 8), H(-1, 5)], { kind: 'bevel', w: 1 });
  // the lower jaw
  const dn = jaw * 3.4;
  d.poly({ mat: HD, z: z - 0.2, group: g + 'j', shade: -1 }, [H(-1, -3 - dn * 0.3), H(13, -3.6 - dn), H(13, -5.4 - dn), H(5, -6.4 - dn), H(-2, -6)], { kind: 'bevel', w: 1.1 });
  // the skull and muzzle: a long wedge
  d.poly({ mat: HD, z, group: g, tex: fur }, [H(-7, 5.6), H(-2, 6.8), H(4, 5), H(10, 2.8), H(15, 1.8), H(16.4, 0), H(16, -2.8), H(10, -3.8), H(2, -4.6), H(-7, -5)], { kind: 'dome', c: H(2, 0.6), r: 11 * k, bevel: 1 });
  // the snout's flat disc
  d.ellipse({ mat: MAT.earPink, z: z + 0.2, group: g + 'n', shade: -2 }, H(16.2, -0.5), 1.4 * k, 2.6 * k, snout);
  // the tusks, curving up out of the lower jaw
  for (const [u, sh] of [[10.6, -1], [12.4, 0]] as const) {
    d.ribbon({ mat: TK, z: z + 0.3, group: g + 't' + u, shade: sh }, [H(u, -4 - dn), H(u + 1.6, -2 - dn * 0.5), H(u + 1.4, 1.6)], [1.2, 0.9, 0.35]);
  }
  // the eye
  const px: { p: V; c: RGBA }[] = P.dead
    ? [{ p: H(3.6, 2.4), c: BK.ramp[1] }, { p: H(4.6, 2.4), c: BK.ramp[1] }]
    : [{ p: H(4, 2.6), c: ACCENT.eyeAmber }, { p: H(4.8, 2.6), c: INK.eye }, { p: H(3.2, 3.6), c: BK.ramp[1] }, { p: H(4.4, 3.6), c: BK.ramp[1] }];
  d.pixels({ mat: HD, z: z + 0.35, group: g, outline: false, line: 'none' }, px);
  // the near ear
  const back = (P.ear ?? 0) * 0.08;
  d.poly({ mat: HD, z: z + 0.5, group: g + 'en' }, [H(-6, 3.8), H(-9 - back, 9 - back), H(-4.6, 7.4), H(-2.4, 4.6)], { kind: 'bevel', w: 1.1 });
}

// ---------------------------------------------------------------------------
// Poses & animations (hooves are IK targets on the ground; x is the body behind the pivot)
// ---------------------------------------------------------------------------

/** A pose with the hooves given as [near front, far front, near hind, far hind] x positions on the ground. */
const boar = (o: Partial<Pose> & { p?: Record<string, number> }, paws: [number, number, number, number] = [10, 13, -24, -21], lift: [number, number, number, number] = [0, 0, 0, 0]) =>
  pose({
    ...o,
    x: BACK + (o.x ?? 0),
    armN: { ik: v(paws[0], 1.6 + lift[0]) },
    armF: { ik: v(paws[1], 1.6 + lift[1]) },
    legN: { ik: v(paws[2], 1.6 + lift[2]) },
    legF: { ik: v(paws[3], 1.6 + lift[3]) },
  });

const IDLE: Pose = boar({ torso: 0, head: 14, p: { snout: -22, jaw: 0, tail: -130, bristle: 0 } });

function idle(t: number): Pose {
  const a = t * Math.PI * 2;
  const b = Math.round((1 - Math.cos(a)) / 2);
  return boar({ y: -b, torso: 0, head: 14 - b, p: { snout: -22 + b, jaw: 0, tail: -130 + Math.round(Math.sin(a) * 4), bristle: 0, wave: a } });
}

function run(t: number): Pose {
  const a = t * Math.PI * 2;
  const paw = (base: number, ph: number, reach: number, lift: number): [number, number] => {
    const s = Math.sin(ph);
    return [base - reach * Math.cos(ph), s > 0 ? lift * s : 0];
  };
  const [fNx, fNy] = paw(11, a, 8, 5), [fFx, fFy] = paw(13, a + 0.7, 8, 5);
  const [hNx, hNy] = paw(-23, a + Math.PI, 8, 5), [hFx, hFy] = paw(-21, a + Math.PI + 0.7, 8, 5);
  return boar(
    { y: Math.round(Math.sin(2 * a)) - 1, torso: Math.round(Math.sin(a + 0.6) * 2), head: 8, p: { snout: -24, jaw: 0, tail: -150, bristle: 0.5, wave: a * 2 } },
    [fNx, fFx, hNx, hFx],
    [fNy, fFy, hNy, hFy],
  );
}

// Tusk Gore: he drops his head low, then hooks it up and through.
const TG_LOW = boar({ x: -5, y: -3, torso: -3, head: -8, p: { snout: -40, jaw: 0, tail: -150, bristle: 1 } }, [8, 11, -26, -23]);
const TG_HOOK = boar({ x: 5, y: -1, torso: 6, head: 30, p: { snout: 18, jaw: 0.6, tail: -168, bristle: 1 } }, [15, 18, -21, -18]);
const TG_HOLD = boar({ x: 3, y: -1, torso: 3, head: 20, p: { snout: -6, jaw: 0.2, tail: -150, bristle: 0.6 } }, [15, 18, -21, -18]);

// Dig In: a stamp of the front hooves, head down, crest up, a long snort.
const DI_REAR = boar({ x: -2, y: 1, torso: 8, head: 26, p: { snout: -8, jaw: 0, tail: -120, bristle: 0.4 } }, [11, 14, -24, -21], [5, 3, 0, 0]);
const DI_PLANT = boar({ x: 0, y: -3, torso: -2, head: 2, p: { snout: -32, jaw: 0.3, tail: -110, bristle: 1 } }, [12, 15, -26, -23]);

const HURT = boar({ x: -4, y: -1, torso: 3, head: 24, p: { snout: -6, jaw: 0.5, tail: -100, bristle: 0.4 } }, [7, 10, -26, -23]);
const DEATH_SAG = boar({ x: -2, y: -9, torso: -5, head: -6, p: { snout: -34, jaw: 0.1, tail: -104, bristle: 0 } }, [13, 16, -22, -19]);
const DEATH_DOWN = boar({ y: -13, torso: 0, head: -8, p: { snout: -8, jaw: 0, tail: -170, dead: 1, lie: 1, bristle: 0 } }, [23, 26, -8, -5]);

// Victory: he lifts his snout and grunts, the crest up.
const VIC_A = boar({ torso: 5, head: 30, p: { snout: 16, jaw: 0.4, tail: -116, bristle: 1 } });
const VIC_B = tweak(VIC_A, { head: 32, p: { snout: 22, jaw: 0.6 } });

const mid = (a: Pose, b: Pose, t: number) => lerpPose(a, b, t, D);

const char: CharDef = {
  id: 'bristleback',
  name: 'Bristleback',
  dims: D,
  build,
  footprint: 1.9,
  anims: {
    idle: { loop: true, frames: cycle(6, 200, idle) },
    run: { loop: true, frames: cycle(8, 85, run) },
    attack1: {
      loop: false,
      frames: [
        ...tween(D, IDLE, TG_LOW, 1, 100),
        ...keys([
          [TG_LOW, 240],
          [mid(TG_LOW, TG_HOOK, 0.5), 60],
          [TG_HOOK, 90, { hit: true }],
          [TG_HOLD, 200],
        ]),
        ...tween(D, TG_HOLD, IDLE, 2, 110, ease.inOut),
      ],
    },
    skill: {
      loop: false,
      frames: [
        ...tween(D, IDLE, DI_REAR, 2, 100, ease.out),
        ...keys([
          [DI_REAR, 200],
          [mid(DI_REAR, DI_PLANT, 0.5), 60],
          [DI_PLANT, 320, { hit: true }],
          [tweak(DI_PLANT, { p: { jaw: 0.1 } }), 240],
        ]),
        ...tween(D, DI_PLANT, IDLE, 2, 120, ease.inOut),
      ],
    },
    hurt: {
      loop: false,
      frames: keys([
        [HURT, 90],
        [tweak(HURT, { x: BACK - 3, torso: 2, head: 22 }), 110],
        [mid(HURT, IDLE, 0.6), 110],
      ]),
    },
    death: {
      loop: false,
      frames: keys([
        [HURT, 120],
        [mid(HURT, DEATH_SAG, 0.5), 110],
        [DEATH_SAG, 260],
        [mid(DEATH_SAG, DEATH_DOWN, 0.6), 120],
        [DEATH_DOWN, 140],
        [tweak(DEATH_DOWN, { y: -13.4 }), 600],
      ]),
    },
    victory: {
      loop: false,
      frames: [
        ...tween(D, IDLE, VIC_A, 2, 120, ease.out),
        ...keys([
          [VIC_A, 240],
          [VIC_B, 600],
          [VIC_A, 200],
          [mid(VIC_A, IDLE, 0.5), 120],
          [IDLE, 120],
        ]),
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// skill icons
// ---------------------------------------------------------------------------

const E = ACCENT;

export const bristleback: ChampionArt = {
  char,
  iconBg: MS,
  icons: {
    tusk_gore: () =>
      compose(MS, glyph((d) => {
        const Hd = d.frame(v(9, 20), -8);
        head(d, Hd, -8, { jaw: 0.5 }, 10, 1.5);
      }), (b) => {
        for (const [x, y] of [[36, 12], [34, 9], [37, 16]] as const) b.set(x, y, E.white);
      }),
    dig_in: () =>
      compose(MS, glyph((d) => {
        const Hd = d.frame(v(10, 18), -30);
        head(d, Hd, -30, { jaw: 0.2 }, 10, 1.45);
      }), (b) => {
        // the DEF Up it brings: a gold chevron
        for (const [dx, dy] of [[0, 0], [1, -1], [2, -2], [3, -1], [4, 0], [1, 0], [3, 0]]) b.set(30 + dx, 9 + dy, E.goldHot);
      }),
  },
};
