// Generates every runtime asset into public/assets. Deterministic: running it
// twice produces byte-identical files.
//   npm run art                    (everything)
//   npm run art -- champions       (one group: champions | fx | zones | ui | font | map)
//   npm run art -- champions monk  (one champion)
//   npm run art -- zones sunscar   (one zone)
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from './io.ts';
import { FRAME_H, FRAME_W, PIVOT, renderAnim } from './char.ts';
import { HEROES } from './champions/index.ts';
import { Bitmap, packShelves, PackItem } from './raster.ts';
import { buildFx } from './fx/index.ts';
import { buildZones } from './zones/index.ts';
import { buildUi } from './ui/index.ts';
import { buildFont } from './font.ts';
import { buildMap } from './map.ts';

export const OUT = path.resolve('public/assets');

export interface ChampionAtlasJson {
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

function buildChampions(only?: string) {
  const portraits: { id: string; bmp: Bitmap }[] = [];
  for (const [id, c] of Object.entries(HEROES)) {
    // portrait source: idle frame 0, always facing right
    portraits.push({ id, bmp: renderAnim(c, 'idle', 1)[0].bmp });
    if (only && only !== id) continue;
    const items: PackItem[] = [];
    const offsets = new Map<string, [number, number]>();
    const anims: ChampionAtlasJson['anims'] = {};
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
    const json: ChampionAtlasJson = {
      id,
      name: c.name,
      frameW: FRAME_W,
      frameH: FRAME_H,
      pivotX: PIVOT.x,
      pivotY: PIVOT.y,
      frames: Object.fromEntries(frames.map((f) => [f.key, [f.x, f.y, f.w, f.h, ...offsets.get(f.key)!]])),
      anims,
    };
    atlas.save(path.join(OUT, 'champions', `${id}.png`));
    writeJson(path.join(OUT, 'champions', `${id}.json`), json);
    console.log(`  champion ${id}: ${items.length} frames -> ${atlas.w}x${atlas.h}`);
  }
  return portraits;
}

const [group, sub] = process.argv.slice(2);
const want = (g: string) => !group || group === g;
const t0 = Date.now();
fs.mkdirSync(OUT, { recursive: true });
let portraits: { id: string; bmp: Bitmap }[] = [];
// the UI needs every portrait; a UI-only run renders them without rewriting atlases
if (want('champions') || want('ui')) portraits = buildChampions(group === 'champions' ? sub : group === 'ui' ? '-' : undefined);
if (want('fx')) buildFx(OUT);
if (want('zones')) buildZones(OUT, sub);
if (want('font')) buildFont(OUT);
if (want('ui')) buildUi(OUT, portraits);
if (want('map')) buildMap(OUT);
console.log(`art done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
