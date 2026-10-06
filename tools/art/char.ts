// Character definitions: a skeleton, a shape builder and a set of animations.
import { INK, Material } from './palette.ts';
import { Bitmap } from './raster.ts';
import { Frame, RenderOptions } from './render.ts';
import { Dims, Draw, lerpPose, Pose, Skel, solve, v } from './rig.ts';

/** Fixed frame box for every hero (see docs/ART_GUIDE.md "Sprite frames"). */
export const FRAME_W = 208;
export const FRAME_H = 160;
/** Feet pivot inside the frame. */
export const PIVOT = v(104, 140);

export interface FrameDef {
  pose: Pose;
  /** Display time in milliseconds. */
  ms: number;
  /** Gameplay impact moment: damage numbers / hit reactions fire here. */
  hit?: boolean;
  /** Named event (projectile release, cast flash, footstep...). */
  event?: string;
  /** Draw a weapon smear between the previous and this frame. */
  smear?: boolean;
}

export interface AnimDef {
  loop: boolean;
  frames: FrameDef[];
}

export interface BuildInfo {
  anim: string;
  index: number;
  def: FrameDef;
  /** Skeleton of the previous frame (smears, secondary motion). */
  prev?: Skel;
}

export interface CharDef {
  id: string;
  name: string;
  dims: Dims;
  anims: Record<string, AnimDef>;
  build(d: Draw, s: Skel, info: BuildInfo): void;
  render?: RenderOptions;
}

/**
 * One champion's complete art module: rig + animations + skill icons. Adding a
 * champion means adding one of these (see .claude/skills/new-champion).
 */
export interface ChampionArt {
  char: CharDef;
  /** signature ramp behind the skill icons */
  iconBg: Material;
  /** skill id -> 40x40 icon painter (tools/art/icons.ts toolkit) */
  icons: Record<string, () => Bitmap>;
}

export interface RenderedFrame {
  bmp: Bitmap;
  def: FrameDef;
}

export function renderFrame(c: CharDef, anim: string, i: number, facing: 1 | -1): Bitmap {
  const a = c.anims[anim];
  const def = a.frames[i];
  const prevDef = i > 0 ? a.frames[i - 1] : a.loop ? a.frames[a.frames.length - 1] : undefined;
  const f = new Frame(FRAME_W, FRAME_H);
  // pose channel `turn` flips the facing for a single frame (spins, turnarounds)
  const d = new Draw(f, def.pose.p.turn ? (-facing as 1 | -1) : facing, PIVOT);
  const s = solve(def.pose, c.dims);
  c.build(d, s, { anim, index: i, def, prev: prevDef ? solve(prevDef.pose, c.dims) : undefined });
  const bmp = f.render(c.render);
  if (anim === 'death' || anim === 'rise') groundClip(bmp, PIVOT.y + GROUND_CLIP);
  return bmp;
}

/** A fallen body rests on the ground plane: capes and sashes never hang more than this below the feet line. */
export const GROUND_CLIP = 8;

function groundClip(b: Bitmap, y0: number) {
  for (let y = y0 + 1; y < b.h; y++) for (let x = 0; x < b.w; x++) b.set(x, y, 0);
  // close the cut like any other silhouette edge
  for (let x = 0; x < b.w; x++) if (b.get(x, y0) & 255) b.set(x, y0, INK.black);
}

export function renderAnim(c: CharDef, anim: string, facing: 1 | -1): RenderedFrame[] {
  return c.anims[anim].frames.map((def, i) => ({ bmp: renderFrame(c, anim, i, facing), def }));
}

// ---------------------------------------------------------------------------
// Authoring helpers
// ---------------------------------------------------------------------------

/** Key = [pose, ms, flags]. Each key becomes exactly one frame. */
export type Key = [Pose, number, Omit<FrameDef, 'pose' | 'ms'>?];

export function keys(list: Key[]): FrameDef[] {
  return list.map(([pose, ms, extra]) => ({ pose, ms, ...(extra ?? {}) }));
}

/** In-between frames: blends `a`->`b` producing `n` frames (excluding a, including b). */
export function tween(D: Dims, a: Pose, b: Pose, n: number, ms: number, easeFn = (t: number) => t): FrameDef[] {
  const out: FrameDef[] = [];
  for (let i = 1; i <= n; i++) out.push({ pose: lerpPose(a, b, easeFn(i / n), D), ms });
  return out;
}

/** Parametric loop: fn(t in [0,1)) per frame. */
export function cycle(n: number, ms: number, fn: (t: number, i: number) => Pose): FrameDef[] {
  return Array.from({ length: n }, (_, i) => ({ pose: fn(i / n, i), ms }));
}
