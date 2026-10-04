// Generates every runtime asset into public/assets. Deterministic: running it
// twice produces byte-identical files.
//   npm run art            (everything)
//   npm run art -- heroes  (one group: heroes | fx | tiles | ui | font)
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from './io.ts';
import { FRAME_H, FRAME_W, PIVOT, renderAnim } from './char.ts';
import { HEROES } from './heroes/index.ts';
import { Bitmap, packShelves, PackItem } from './raster.ts';
import { buildFx } from './fx.ts';
import { buildTiles } from './tiles.ts';
import { buildUi } from './ui.ts';
import { buildFont } from './font.ts';

export const OUT = path.resolve('public/assets');

export interface HeroAtlasJson {
  id: string;
  name: string;
  frameW: number;
  frameH: number;
  pivotX: number;
  pivotY: number;
  /** key "R|L/anim/index" -> atlas rect + offset of the trimmed rect inside the frame box */
  frames: Record<string, [number, number, number, number, number, number]>;
  anims: Record<string, { loop: boolean; ms: number[]; hits: number[]; events: Record<string, string> }>;
}

function buildHeroes() {
  const portraits: { id: string; bmp: Bitmap }[] = [];
  for (const [id, c] of Object.entries(HEROES)) {
    const items: PackItem[] = [];
    const offsets = new Map<string, [number, number]>();
    const anims: HeroAtlasJson['anims'] = {};
    for (const [face, facing] of [['R', 1], ['L', -1]] as const) {
      for (const name of Object.keys(c.anims)) {
        const frames = renderAnim(c, name, facing);
        frames.forEach((f, i) => {
          const key = `${face}/${name}/${i}`;
          const b = f.bmp.bounds() ?? { x: 0, y: 0, w: 1, h: 1 };
          items.push({ key, bmp: f.bmp.crop(b) });
          offsets.set(key, [b.x, b.y]);
        });
        if (face === 'R') {
          anims[name] = {
            loop: c.anims[name].loop,
            ms: frames.map((f) => f.def.ms),
            hits: frames.flatMap((f, i) => (f.def.hit ? [i] : [])),
            events: Object.fromEntries(frames.flatMap((f, i) => (f.def.event ? [[String(i), f.def.event]] : []))),
          };
        }
      }
    }
    const { atlas, frames } = packShelves(items, 1024);
    const json: HeroAtlasJson = {
      id,
      name: c.name,
      frameW: FRAME_W,
      frameH: FRAME_H,
      pivotX: PIVOT.x,
      pivotY: PIVOT.y,
      frames: Object.fromEntries(frames.map((f) => [f.key, [f.x, f.y, f.w, f.h, ...offsets.get(f.key)!]])),
      anims,
    };
    atlas.save(path.join(OUT, 'heroes', `${id}.png`));
    writeJson(path.join(OUT, 'heroes', `${id}.json`), json);
    console.log(`  hero ${id}: ${items.length} frames -> ${atlas.w}x${atlas.h}`);

    // portrait: head-and-shoulders crop of idle frame 0, always facing right
    const idle = renderAnim(c, 'idle', 1)[0].bmp;
    portraits.push({ id, bmp: idle });
  }
  return portraits;
}

const only = process.argv[2];
const t0 = Date.now();
fs.mkdirSync(OUT, { recursive: true });
let portraits: { id: string; bmp: Bitmap }[] = [];
if (!only || only === 'heroes' || only === 'ui') portraits = buildHeroes();
if (!only || only === 'fx') buildFx(OUT);
if (!only || only === 'tiles') buildTiles(OUT);
if (!only || only === 'font') buildFont(OUT);
if (!only || only === 'ui') buildUi(OUT, portraits);
console.log(`art done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
