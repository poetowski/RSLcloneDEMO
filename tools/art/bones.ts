// The bones of the Ashveil Reign's skeletons, drawn one by one in bone dulled
// grey with ash (`MAT.ashBone`): long bones with knobbed ends, the paired
// bones of forearms and shins, legs and arms, the neck's vertebrae, and the
// frames a trunk and a skull are drawn in. Every bone is placed once per frame
// (a `BoneSet`), so a skeleton can fall apart in its death: each bone moves
// toward where it comes to rest (`fallApart`). The Skeleton
// (champions/skeleton.ts) and the Bellringer (champions/bellringer.ts) are
// built from these, each with its own trunk, skull, proportions and gear.
import { MAT } from './palette.ts';
import { add, at, D2R, dir, Draw, ease, lerp, lerpAngle, lerpV, mul, sub, V, v } from './rig.ts';

export const BN = MAT.ashBone;

/** Every bone's placement this frame (the rig's joints); a champion adds its own props to it (the Skeleton's sword, the Bellringer's bell). */
export interface BoneSet {
  pelvis: V;
  torso: number;
  head: V;
  headDir: number;
  sN: V; eN: V; hN: V;
  sF: V; eF: V; hF: V;
  hipN: V; kneeN: V; ankN: V; footN: number;
  hipF: V; kneeF: V; ankF: V; footF: number;
}

/**
 * The bones falling apart (`heap`, 0..1): each point moves toward where it
 * comes to rest, down faster than across, and each angle turns the short way
 * round to its resting angle. The resting set has the same keys as the live one.
 */
export function fallApart<T extends object>(alive: T, rest: T, heap: number): T {
  if (heap <= 0) return alive;
  // things fall: down faster than across
  const fx = ease.inOut(heap), fy = Math.min(1, ease.in(heap) * 1.25);
  const pt = (a: V, b: V) => v(lerp(a.x, b.x, fx), lerp(a.y, b.y, fy));
  const out = { ...alive } as Record<string, V | number>;
  for (const [k, val] of Object.entries(alive)) {
    const h = (rest as unknown as Record<string, V | number>)[k];
    out[k] = typeof val === 'number' ? lerpAngle(val, h as number, fx) : pt(val as V, h as V);
  }
  return out as unknown as T;
}

/** The trunk's frame: u up the spine from the pelvis, w toward the front (the rig's T, for any placement). */
export const trunkFrame = (b: { pelvis: V; torso: number }) => (u: number, w: number): V => add(at(b.pelvis, b.torso, u), mul(dir(b.torso - 90), w));
/** The skull's frame: x toward the face, y up (the rig's H). */
export const skullFrame = (b: { head: V; headDir: number }) => (x: number, y: number): V => add(at(b.head, b.headDir, y), mul(dir(b.headDir - 90), x));

/** A long bone: a shaft with knobbed ends, lit like any other form. */
export function longBone(d: Draw, a: V, b: V, r: [number, number], knobs: [number, number], z: number, group: string, shade: number) {
  d.capsule({ mat: BN, z, group, shade }, a, b, r[0], r[1]);
  if (knobs[0]) d.circle({ mat: BN, z: z + 0.02, group, shade }, a, knobs[0]);
  if (knobs[1]) d.circle({ mat: BN, z: z + 0.03, group, shade }, b, knobs[1]);
}

/** Two thin bones side by side from `a` to `b` (forearm, shin), a dark slit between them. */
export function pairedBones(d: Draw, a: V, b: V, r: [number, number], gap: number, z: number, group: string, shade: number, second = 0.55) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x) / D2R;
  const off = mul(dir(ang + 90), gap / 2);
  d.capsule({ mat: BN, z, group, shade }, add(a, off), add(b, off), r[0], r[1]);
  d.capsule({ mat: BN, z: z - 0.01, group: group + 'b', shade: shade - 1, line: 'soft' }, sub(a, off), sub(b, off), second, second * 0.9);
}

/** A leg: the femur in its socket, the kneecap, tibia and fibula, and with `feet` the bare bones of the foot (a booted foot draws its boot instead). */
export function legBones(d: Draw, hip: V, knee: V, ank: V, footAng: number, z: number, shade: number, side: string, feet = true) {
  const g = 'leg' + side;
  // the femur, its head in the hip socket, the knee's condyles and the kneecap
  longBone(d, hip, knee, [1.05, 0.9], [1.5, 1.35], z, g, shade);
  const thighAng = Math.atan2(knee.y - hip.y, knee.x - hip.x) / D2R;
  d.circle({ mat: BN, z: z + 0.05, group: g + 'cap', shade, line: 'soft' }, at(knee, thighAng + 90, 1.1), 0.95);
  // tibia in front, the thin fibula behind it
  const shinAng = Math.atan2(ank.y - knee.y, ank.x - knee.x) / D2R;
  d.capsule({ mat: BN, z: z + 0.1, group: g + 's', shade }, at(knee, shinAng, 0.6), ank, 0.85, 0.7);
  d.capsule({ mat: BN, z: z + 0.08, group: g + 'f', shade: shade - 1, line: 'soft' }, at(at(knee, shinAng, 1.6), shinAng - 90, 1.25), at(at(ank, shinAng, -1.2), shinAng - 90, 0.9), 0.5, 0.45);
  if (!feet) return;
  // the foot: the ankle bone, the heel, three long thin bones out to the toes
  d.circle({ mat: BN, z: z + 0.2, group: g + 'ft', shade }, ank, 1.2);
  const f = d.frame(ank, footAng);
  d.circle({ mat: BN, z: z + 0.18, group: g + 'ft', shade }, f(-1.5, -1.6), 1.05);
  for (const [w, l] of [[0, 5.3], [1.2, 4.6]] as const) {
    d.capsule({ mat: BN, z: z + 0.22 - w * 0.01, group: g + 'toe' + w, shade, line: 'none', outline: true }, f(0.6, -1.6 + w * 0.4), f(l, -2.4 + w * 0.55), 0.6, 0.5);
  }
}

/**
 * An arm: the humerus, the forearm's two bones, then the hand: fingers
 * curled round a grip at `gripAng` ('grip'), a bony claw ('claw'), or none
 * where something is fixed in the hand's place (the Bellringer's bell).
 */
export function armBones(d: Draw, sh: V, el: V, ha: V, z: number, shade: number, side: string, hand: 'grip' | 'claw' | 'none', gripAng = 0) {
  const g = 'arm' + side;
  longBone(d, sh, el, [0.85, 0.75], [1.3, 1.15], z, g, shade);
  pairedBones(d, el, at(ha, Math.atan2(ha.y - el.y, ha.x - el.x) / D2R, -0.6), [0.55, 0.5], 1.2, z + 0.1, g + 'lo', shade);
  if (hand === 'none') return;
  const lo = Math.atan2(ha.y - el.y, ha.x - el.x) / D2R;
  // the wrist's small bones, then the fingers: curled round the grip, or a claw
  d.circle({ mat: BN, z: z + 0.2, group: g + 'h', shade }, ha, 1.1);
  if (hand === 'grip') {
    const f = d.frame(ha, gripAng);
    for (const u of [-1.3, 0, 1.3]) d.circle({ mat: BN, z: z + 0.25, group: g + 'f' + u, shade, line: 'soft' }, f(u, -1.1), 0.62);
    d.circle({ mat: BN, z: z + 0.24, group: g + 'th', shade, line: 'soft' }, f(0.9, 1.0), 0.55);
  } else {
    for (const [da, l] of [[-24, 2.8], [0, 3.3], [22, 2.6]] as const) {
      const a = lo + da;
      d.capsule({ mat: BN, z: z + 0.25 + da * 0.001, group: g + 'f' + da, shade, line: 'soft' }, at(ha, a, 0.9), at(at(ha, a, l), a + 70, 0.9), 0.45, 0.4);
    }
  }
}

/** The neck's vertebrae, `n` of them from the top of the spine up to the skull. */
export function vertebrae(d: Draw, from: V, to: V, z: number, n = 4) {
  for (let k = 0; k < n; k++) {
    const p = lerpV(from, to, (k + 0.5) / n);
    d.circle({ mat: BN, z: z + k * 0.01, group: 'neck' + k, line: 'soft', shade: k % 2 ? -1 : 0 }, p, 1.15);
  }
}
