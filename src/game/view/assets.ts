// Loads every generated asset (see tools/art/build.ts for the producers).
import { loadImage, loadJson, silhouette } from '../../engine/assets';
import { BitmapFont, FontJson } from '../../engine/font';

export type Rect6 = [number, number, number, number, number, number];
export type Rect4 = [number, number, number, number];

export interface HeroAtlasJson {
  id: string;
  name: string;
  frameW: number;
  frameH: number;
  pivotX: number;
  pivotY: number;
  frames: Record<string, Rect6>;
  anims: Record<string, { loop: boolean; ms: number[]; hits: number[]; events: Record<string, string> }>;
}

export interface FxJson {
  anims: Record<string, { w: number; h: number; ax: number; ay: number; ms: number; loop: boolean; frames: Rect6[] }>;
}

export interface ZoneJson {
  name: string;
  tile: number;
  cols: number;
  rows: number;
  tiles: string[];
  atlasCols: number;
  layers: { ground: number[]; wall: number[] };
  props: { kind: string; x: number; y: number; layer: 'back' | 'fg' | 'floor' }[];
  spawns: { player: [number, number][]; enemy: [number, number][] };
  propFrames: Record<string, Rect4>;
}

export interface UiJson {
  icons: Record<string, Rect4>;
  status: Record<string, { rect: Rect4; buff: boolean }>;
  parts: Record<string, Rect4>;
  portraits: Record<string, Rect4>;
}

export interface HeroArt {
  json: HeroAtlasJson;
  img: HTMLImageElement;
  /** white silhouette for hit flashes */
  white: HTMLCanvasElement;
}

export interface Assets {
  heroes: Record<string, HeroArt>;
  fx: { json: FxJson; img: HTMLImageElement };
  zone: { json: ZoneJson; tiles: HTMLImageElement; backdrop: HTMLImageElement; props: HTMLImageElement };
  ui: { json: UiJson; img: HTMLImageElement };
  font: BitmapFont;
}

export async function loadAssets(heroIds: string[], progress?: (k: number) => void): Promise<Assets> {
  let done = 0;
  const jobs: Promise<unknown>[] = [];
  const track = <T>(p: Promise<T>): Promise<T> => {
    jobs.push(p);
    return p.then((v) => {
      done++;
      progress?.(done / jobs.length);
      return v;
    });
  };
  const heroes: Record<string, HeroArt> = {};
  const heroJobs = heroIds.map(async (id) => {
    const [json, img] = await Promise.all([track(loadJson<HeroAtlasJson>(`assets/heroes/${id}.json`)), track(loadImage(`assets/heroes/${id}.png`))]);
    heroes[id] = { json, img, white: silhouette(img, '#ffffff') };
  });
  const [fxJson, fxImg, zoneJson, tiles, backdrop, props, uiJson, uiImg, fontJson, fontImg] = await Promise.all([
    track(loadJson<FxJson>('assets/fx/fx.json')),
    track(loadImage('assets/fx/fx.png')),
    track(loadJson<ZoneJson>('assets/zone/zone.json')),
    track(loadImage('assets/zone/tiles.png')),
    track(loadImage('assets/zone/backdrop.png')),
    track(loadImage('assets/zone/props.png')),
    track(loadJson<UiJson>('assets/ui/ui.json')),
    track(loadImage('assets/ui/ui.png')),
    track(loadJson<FontJson>('assets/ui/font.json')),
    track(loadImage('assets/ui/font.png')),
  ]);
  await Promise.all(heroJobs);
  return {
    heroes,
    fx: { json: fxJson, img: fxImg },
    zone: { json: zoneJson, tiles, backdrop, props },
    ui: { json: uiJson, img: uiImg },
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
