// Loads every generated asset (see tools/art/build.ts for the producers):
// champion atlases, effects, combat backgrounds, the UI atlas, the font, the
// world map and the main menu's sanctum.
import { loadImage, loadJson, silhouette } from '../../engine/assets';
import { BitmapFont, FontJson } from '../../engine/font';

export type Rect6 = [number, number, number, number, number, number];
export type Rect4 = [number, number, number, number];

export interface ChampionAtlasJson {
  id: string;
  name: string;
  frameW: number;
  frameH: number;
  pivotX: number;
  pivotY: number;
  /** the shadow's width as a share of a standing champion's: a beast on four legs casts a longer one */
  footprint?: number;
  frames: Record<string, Rect6>;
  anims: Record<string, { loop: boolean; ms: number[]; hits: number[]; events: Record<string, string> }>;
  /** a burning blade (the Paladin's sword), key as in `frames`: its base and tip in the frame box, and its heat (1 at rest) */
  glow?: Record<string, [number, number, number, number, number]>;
}

export interface FxJson {
  anims: Record<string, { w: number; h: number; ax: number; ay: number; ms: number; loop: boolean; frames: Rect6[] }>;
}

export interface PropKind {
  anchor: [number, number];
  mode: 'static' | 'loop' | 'pulse';
  ms?: number;
  fire?: { dy: number; flame?: boolean };
  /** drifts up and down by `amp` px, once every `ms` */
  bob?: { amp: number; ms: number };
  /** drifts sideways across the screen at `speed` px a second, coming round again from the other side (clouds) */
  drift?: { speed: number };
  /** walks to and fro along its row (an animal grazing): see tools/art/zones/shared.ts */
  roam?: { span: number; speed: number; pause: number; walk: number };
  frames: number;
}

/** Sparks born along a line of the scene (tools/art/zones/shared.ts SparkEmitter). */
export interface SparkEmitter {
  path: [number, number][];
  colors: string[];
  every: number;
  speed: number;
  /** how long a spark lives, ms (default 500-1600) */
  life?: [number, number];
}

export interface ZoneJson {
  id: string;
  name: string;
  tile: number;
  cols: number;
  rows: number;
  tiles: string[];
  atlasCols: number;
  layers: { ground: number[]; wall: number[] };
  props: { kind: string; x: number; y: number; layer: 'far' | 'back' | 'fg' | 'floor' }[];
  kinds: Record<string, PropKind>;
  spawns: { player: [number, number][]; enemy: [number, number][] };
  propFrames: Record<string, Rect4>;
  horizon: number;
  sparks?: SparkEmitter[];
}

export interface UiJson {
  icons: Record<string, Rect4>;
  status: Record<string, { rect: Rect4; buff: boolean }>;
  parts: Record<string, Rect4>;
  portraits: Record<string, Rect4>;
}

/** The main menu's sanctum (tools/art/sanctum.ts SanctumJson). */
export interface MenuSprite {
  frames: Rect4[];
  x: number;
  y: number;
  layer: 'far' | 'island' | 'building' | 'front';
  mode: 'static' | 'loop' | 'pulse';
  ms?: number;
  bob?: { amp: number; ms: number; phase: number };
}

export type MenuPlace = 'campaign' | 'champions' | 'weaving' | 'academy' | 'options' | 'challenges';

export interface MenuJson {
  sprites: Record<string, MenuSprite>;
  order: string[];
  hotspots: { id: MenuPlace; name: string; sprites: string[]; outline: Rect4; ox: number; oy: number; label: [number, number] }[];
  spots: { x: number; y: number; facing: 'L' | 'R' }[];
  twinkles: [number, number, number][];
  rings: { cx: number; cy: number; rx: number; ry: number; tilt: number; half: number; rail: number }[];
  rimBreak: number[];
  warp: [number, number][][];
  thread: [number, number][];
  falls: [number, number][];
  portal: [number, number];
  lights: { x: number; y: number; rx: number; ry: number; rgb: [number, number, number]; k: number; rate: number }[];
}

export interface ChampionArt {
  json: ChampionAtlasJson;
  img: HTMLImageElement;
  /** white silhouette for hit flashes */
  white: HTMLCanvasElement;
  /** near-black silhouette for locked champions */
  shadow: HTMLCanvasElement;
}

export interface ZoneArt {
  json: ZoneJson;
  tiles: HTMLImageElement;
  backdrop: HTMLImageElement;
  props: HTMLImageElement;
}

export interface Assets {
  champions: Record<string, ChampionArt>;
  fx: { json: FxJson; img: HTMLImageElement };
  zones: Record<string, ZoneArt>;
  ui: { json: UiJson; img: HTMLImageElement };
  /** the main menu's sanctum: its sky, its scene atlas and their layout */
  menu: { json: MenuJson; sky: HTMLImageElement; scene: HTMLImageElement };
  /** the campaign world, larger than the screen */
  map: HTMLImageElement;
  /** the same world drawn small enough to fit one screen */
  overview: HTMLImageElement;
  font: BitmapFont;
}

export async function loadAssets(championIds: string[], zoneIds: string[], progress?: (k: number) => void): Promise<Assets> {
  let done = 0, total = 0;
  const track = <T>(p: Promise<T>): Promise<T> => {
    total++;
    return p.then((v) => {
      done++;
      progress?.(done / total);
      return v;
    });
  };
  const champions: Record<string, ChampionArt> = {};
  const championJobs = championIds.map(async (id) => {
    const [json, img] = await Promise.all([track(loadJson<ChampionAtlasJson>(`assets/champions/${id}.json`)), track(loadImage(`assets/champions/${id}.png`))]);
    champions[id] = { json, img, white: silhouette(img, '#ffffff'), shadow: silhouette(img, '#0b0d16') };
  });
  const zones: Record<string, ZoneArt> = {};
  const zoneJobs = zoneIds.map(async (id) => {
    const [json, tiles, backdrop, props] = await Promise.all([
      track(loadJson<ZoneJson>(`assets/zones/${id}/zone.json`)),
      track(loadImage(`assets/zones/${id}/tiles.png`)),
      track(loadImage(`assets/zones/${id}/backdrop.png`)),
      track(loadImage(`assets/zones/${id}/props.png`)),
    ]);
    zones[id] = { json, tiles, backdrop, props };
  });
  const [fxJson, fxImg, uiJson, uiImg, fontJson, fontImg, map, overview, menuJson, menuSky, menuScene] = await Promise.all([
    track(loadJson<FxJson>('assets/fx/fx.json')),
    track(loadImage('assets/fx/fx.png')),
    track(loadJson<UiJson>('assets/ui/ui.json')),
    track(loadImage('assets/ui/ui.png')),
    track(loadJson<FontJson>('assets/ui/font.json')),
    track(loadImage('assets/ui/font.png')),
    track(loadImage('assets/map/world.png')),
    track(loadImage('assets/map/overview.png')),
    track(loadJson<MenuJson>('assets/menu/menu.json')),
    track(loadImage('assets/menu/sky.png')),
    track(loadImage('assets/menu/scene.png')),
  ]);
  await Promise.all([...championJobs, ...zoneJobs]);
  return {
    champions,
    fx: { json: fxJson, img: fxImg },
    zones,
    ui: { json: uiJson, img: uiImg },
    menu: { json: menuJson, sky: menuSky, scene: menuScene },
    map,
    overview,
    font: new BitmapFont(fontImg, fontJson),
  };
}

/** Draws a 4-rect sprite from an atlas at integer coordinates. */
export function blit(ctx: CanvasRenderingContext2D, img: CanvasImageSource, r: Rect4, x: number, y: number) {
  ctx.drawImage(img, r[0], r[1], r[2], r[3], Math.round(x), Math.round(y), r[2], r[3]);
}

/** Nine-slice panel from a square part with `edge` px corners. */
export function nine(ctx: CanvasRenderingContext2D, img: CanvasImageSource, r: Rect4, x: number, y: number, w: number, h: number, edge = 6) {
  const [sx, sy, sw, sh] = r;
  const e = edge;
  const mw = sw - 2 * e, mh = sh - 2 * e;
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  const cw = w - 2 * e, ch = h - 2 * e;
  const d = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) => {
    if (bw > 0 && bh > 0) ctx.drawImage(img, ax, ay, aw, ah, bx, by, bw, bh);
  };
  d(sx, sy, e, e, x, y, e, e);
  d(sx + e, sy, mw, e, x + e, y, cw, e);
  d(sx + sw - e, sy, e, e, x + w - e, y, e, e);
  d(sx, sy + e, e, mh, x, y + e, e, ch);
  d(sx + e, sy + e, mw, mh, x + e, y + e, cw, ch);
  d(sx + sw - e, sy + e, e, mh, x + w - e, y + e, e, ch);
  d(sx, sy + sh - e, e, e, x, y + h - e, e, e);
  d(sx + e, sy + sh - e, mw, e, x + e, y + h - e, cw, e);
  d(sx + sw - e, sy + sh - e, e, e, x + w - e, y + h - e, e, e);
}
