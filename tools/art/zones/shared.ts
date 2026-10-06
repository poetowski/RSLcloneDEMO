// Shared zone (combat background) contract and builder. A zone module
// exports a ZoneArt: 32x32 tile painters, a 640x200 backdrop, prop sprites
// with their behaviour (PropKind) and a layout that places tiles and props on
// the 20x12 grid. buildZone() writes public/assets/zones/<id>/ and a preview
// to docs/images/zone_<id>.png. Rules: docs/ART_GUIDE.md "Combat backgrounds"
// and .claude/skills/new-combat-background.
import path from 'node:path';
import { writeJson } from '../io.ts';
import { rampDither } from '../paint.ts';
import { Bitmap, hash2, RGBA, rng } from '../raster.ts';

export const TILE = 32;
export const MAP_COLS = 20;
export const MAP_ROWS = 12;
export const SCREEN_W = 640;
export const SCREEN_H = 360;
/** Tile rows: 0-1 sky, 2-5 the back wall, 6-11 the battle floor. */
export const WALL_ROWS = [2, 3, 4, 5];
export const FLOOR_TOP = 6 * TILE;

/** Formation feet positions shared by every zone: front, back-top, back-bottom. */
export const SPAWNS: { player: [number, number][]; enemy: [number, number][] } = {
  player: [
    [216, 250],
    [152, 216],
    [136, 284],
  ],
  enemy: [
    [424, 250],
    [488, 216],
    [504, 284],
  ],
};

export type Painter = (b: Bitmap, seed: number) => void;
export type Rect4 = [number, number, number, number];

/** How the runtime draws a prop kind (src/game/view/zone.ts). */
export interface PropKind {
  /** anchor inside the sprite as a fraction (0.5,1 = bottom center) */
  anchor: [number, number];
  /** static: frame 0 | loop: cycle frames every `ms` | pulse: frame 1 breathes over frame 0 */
  mode: 'static' | 'loop' | 'pulse';
  ms?: number;
  /** a fire burns on top: `flame` frames drawn after the units at this offset, embers and a light pool */
  fire?: { dy: number };
}

export interface PropPlacement {
  kind: string;
  x: number;
  y: number;
  /** back: behind units, before floor props | floor: on the ground | fg: in front of everything */
  layer: 'back' | 'floor' | 'fg';
}

export interface ZoneArt {
  id: string;
  name: string;
  tiles: Record<string, Painter>;
  /** 640x200 painting behind the tiles; the key light (sun/moon) sits top-left */
  backdrop(): Bitmap;
  /** prop sprites by kind (one bitmap per frame); every kind needs an entry in `kinds` */
  props(): Record<string, Bitmap[]>;
  kinds: Record<string, PropKind>;
  /** grid layers (tile ids from `id(name)`, -1 = empty) and prop placements */
  layout(id: (name: string) => number): { ground: number[]; wall: number[]; props: PropPlacement[] };
  /** backdrop y where land meets sky (heat haze band, mist) */
  horizon: number;
}

export interface ZoneJson {
  id: string;
  name: string;
  tile: number;
  cols: number;
  rows: number;
  /** names indexed by tile id (atlas order) */
  tiles: string[];
  /** tileset columns in tiles.png */
  atlasCols: number;
  layers: { ground: number[]; wall: number[] };
  props: PropPlacement[];
  kinds: Record<string, PropKind & { frames: number }>;
  propFrames: Record<string, Rect4>;
  spawns: { player: [number, number][]; enemy: [number, number][] };
  horizon: number;
}

// ---------------------------------------------------------------------------
// shared painters
// ---------------------------------------------------------------------------

/** Brazier / torch flame frames: a teardrop with flickering tongues. */
export function flames(ramp: RGBA[], n = 6): Bitmap[] {
  const out: Bitmap[] = [];
  for (let i = 0; i < n; i++) {
    const b = new Bitmap(20, 26);
    const ph = (i / n) * Math.PI * 2;
    for (let y = 0; y < 26; y++) {
      for (let x = 0; x < 20; x++) {
        const t = y / 25;
        const sway = Math.sin(ph + t * 4) * (1 - t) * 2.2;
        const half = (Math.sin(t * Math.PI * 0.95) * 6.5 + 1) * (0.75 + 0.25 * Math.sin(ph * 2 + y * 0.5));
        const dx = Math.abs(x + 0.5 - 10 - sway);
        if (dx > half) continue;
        const core = 1 - dx / half;
        let v = t * 2.2 + core * 2.2 - 0.6 + (hash2(x, y + i * 31, 9) - 0.5) * 0.8;
        if (t < 0.25 && core < 0.5) v -= 1;
        if (v < 0.3) continue;
        b.set(x, y, rampDither(ramp, v, x, y));
      }
    }
    const r = rng(i * 17);
    for (let k = 0; k < 2; k++) b.set(4 + Math.floor(r() * 12), Math.floor(r() * 8), ramp[3]);
    out.push(b);
  }
  return out;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

function packProps(props: Record<string, Bitmap[]>): { sheet: Bitmap; placed: Record<string, Rect4> } {
  const items: { key: string; bmp: Bitmap }[] = [];
  for (const [k, list] of Object.entries(props)) list.forEach((bmp, i) => items.push({ key: `${k}/${i}`, bmp }));
  const sheetW = Math.max(256, ...items.map((i) => i.bmp.w + 2));
  const placed: Record<string, Rect4> = {};
  let x = 0, y = 0, rowH = 0;
  for (const it of items) {
    if (x + it.bmp.w > sheetW) {
      x = 0;
      y += rowH + 1;
      rowH = 0;
    }
    placed[it.key] = [x, y, it.bmp.w, it.bmp.h];
    x += it.bmp.w + 1;
    rowH = Math.max(rowH, it.bmp.h);
  }
  const sheet = new Bitmap(sheetW, y + rowH + 1);
  for (const it of items) sheet.blit(it.bmp, placed[it.key][0], placed[it.key][1]);
  return { sheet, placed };
}

export function buildZone(z: ZoneArt, out: string): ZoneJson {
  const names = Object.keys(z.tiles);
  const cols = 8;
  const atlas = new Bitmap(cols * TILE, Math.ceil(names.length / cols) * TILE);
  names.forEach((n, i) => {
    const t = new Bitmap(TILE, TILE);
    z.tiles[n](t, i * 97 + 13);
    atlas.blit(t, (i % cols) * TILE, Math.floor(i / cols) * TILE);
  });
  const bd = z.backdrop();
  const props = z.props();
  for (const k of Object.keys(props)) if (!z.kinds[k]) throw new Error(`zone ${z.id}: prop "${k}" has no kind entry`);
  const { sheet, placed } = packProps(props);
  const id = (n: string) => {
    const i = names.indexOf(n);
    if (i < 0) throw new Error(`zone ${z.id}: no tile "${n}"`);
    return i;
  };
  const lay = z.layout(id);
  for (const p of lay.props) if (!props[p.kind]) throw new Error(`zone ${z.id}: placed prop "${p.kind}" has no sprite`);
  const json: ZoneJson = {
    id: z.id,
    name: z.name,
    tile: TILE,
    cols: MAP_COLS,
    rows: MAP_ROWS,
    tiles: names,
    atlasCols: cols,
    layers: { ground: lay.ground, wall: lay.wall },
    props: lay.props,
    kinds: Object.fromEntries(Object.entries(z.kinds).map(([k, v]) => [k, { ...v, frames: props[k]?.length ?? 0 }])),
    propFrames: placed,
    spawns: SPAWNS,
    horizon: z.horizon,
  };
  const dir = path.join(out, 'zones', z.id);
  atlas.save(path.join(dir, 'tiles.png'));
  bd.save(path.join(dir, 'backdrop.png'));
  sheet.save(path.join(dir, 'props.png'));
  writeJson(path.join(dir, 'zone.json'), json);
  composeZone(json, atlas, bd, sheet).save(path.join('docs', 'images', `zone_${z.id}.png`));
  console.log(`  zone ${z.id}: ${names.length} tiles, ${Object.keys(props).length} prop kinds, ${Object.keys(placed).length} prop frames`);
  return json;
}

/** Static composition of a zone (docs, previews, the menu backdrop check). */
export function composeZone(map: ZoneJson, atlas: Bitmap, bd: Bitmap, props: Bitmap): Bitmap {
  const out = new Bitmap(SCREEN_W, SCREEN_H);
  out.blit(bd, 0, 0);
  const drawLayer = (layer: number[]) => {
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const t = layer[r * map.cols + c];
        if (t < 0) continue;
        out.blit(atlas, c * TILE, r * TILE, { src: { x: (t % map.atlasCols) * TILE, y: Math.floor(t / map.atlasCols) * TILE, w: TILE, h: TILE } });
      }
    }
  };
  drawLayer(map.layers.ground);
  drawLayer(map.layers.wall);
  const order = { back: 0, floor: 1, fg: 2 } as const;
  for (const p of [...map.props].sort((a, b) => order[a.layer] - order[b.layer] || a.y - b.y)) {
    const k = map.kinds[p.kind];
    const f = map.propFrames[`${p.kind}/${k.mode === 'pulse' ? 1 : 0}`];
    out.blit(props, Math.round(p.x - f[2] * k.anchor[0]), Math.round(p.y - f[3] * k.anchor[1]), { src: { x: f[0], y: f[1], w: f[2], h: f[3] } });
    if (k.fire) {
      const fl = map.propFrames['flame/0'];
      if (fl) out.blit(props, Math.round(p.x - fl[2] / 2), Math.round(p.y + k.fire.dy - fl[3] + 8), { src: { x: fl[0], y: fl[1], w: fl[2], h: fl[3] } });
    }
  }
  return out;
}
