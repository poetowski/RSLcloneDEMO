// Generates the images used by README.md and the guides:
//   docs/images/palette.png        every material ramp
//   docs/images/lineup.png         all heroes, idle frame, 3x
//   docs/images/lineup.gif         all heroes idling, 2x
//   docs/images/reel_<hero>.gif    each hero's full animation reel, 3x
//   docs/images/tileset.png        the zone tileset, 2x
//   npx tsx tools/art/docsart.ts
import fs from 'node:fs';
import path from 'node:path';
import { writeGif } from '../gifwrite.ts';
import { PIVOT, renderAnim, renderFrame } from './char.ts';
import { HEROES } from './heroes/index.ts';
import { MAT } from './palette.ts';
import { Bitmap, hex } from './raster.ts';

const OUT = 'docs/images';
fs.mkdirSync(OUT, { recursive: true });
const BG = hex('#2c3648'), FLOOR = hex('#232b3a');

function gif(file: string, frames: { bmp: Bitmap; ms: number }[]) {
  const size = writeGif(file, frames);
  console.log(`  ${file} (${frames.length} frames, ${(size / 1024).toFixed(0)} KB)`);
}

// --- palette swatch
{
  const mats = Object.values(MAT);
  const sw = 14, labelW = 0;
  const b = new Bitmap(labelW + 6 * sw + 4, mats.length * (sw + 2) + 2).fill(hex('#0b0f1c'));
  mats.forEach((m, i) => m.ramp.forEach((c, j) => b.rect(2 + labelW + j * sw, 2 + i * (sw + 2), sw - 1, sw, c)));
  b.scaled(2).save(path.join(OUT, 'palette.png'));
}

// --- lineup (static + idle gif)
const ids = Object.keys(HEROES);
const cellW = 84, cellH = 100;
function lineupFrame(t: number): Bitmap {
  const b = new Bitmap(cellW * ids.length + 16, cellH + 8).fill(BG);
  b.rect(0, cellH - 4, b.w, 12, FLOOR);
  ids.forEach((id, i) => {
    const c = HEROES[id];
    const an = c.anims.idle;
    const total = an.frames.reduce((s, f) => s + f.ms, 0);
    let tt = t % total, k = 0;
    while (k < an.frames.length - 1 && tt >= an.frames[k].ms) tt -= an.frames[k++].ms;
    const bmp = renderFrame(c, 'idle', k, i < 3 ? 1 : -1);
    b.blit(bmp, 8 + i * cellW + cellW / 2 - PIVOT.x, cellH - 4 - PIVOT.y);
  });
  return b;
}
lineupFrame(0).scaled(3).save(path.join(OUT, 'lineup.png'));
gif(path.join(OUT, 'lineup.gif'), Array.from({ length: 24 }, (_, i) => ({ bmp: lineupFrame(i * 70).scaled(2), ms: 70 })));

// --- per-hero reels
for (const [id, c] of Object.entries(HEROES)) {
  const frames: { bmp: Bitmap; ms: number }[] = [];
  const W = 176, H = 132;
  const facing = ids.indexOf(id) < 3 ? 1 : -1;
  for (const name of Object.keys(c.anims)) {
    const reps = c.anims[name].loop ? 2 : 1;
    for (let r = 0; r < reps; r++) {
      for (const f of renderAnim(c, name, facing)) {
        const b = new Bitmap(W, H).fill(BG);
        b.rect(0, H - 12, W, 12, FLOOR);
        b.blit(f.bmp, W / 2 - PIVOT.x, H - 12 - PIVOT.y);
        frames.push({ bmp: b.scaled(2), ms: Math.max(20, Math.round(f.def.ms / 10) * 10) });
      }
    }
    // short pause between animations
    frames[frames.length - 1].ms += 250;
  }
  gif(path.join(OUT, `reel_${id}.gif`), frames);
}

// --- tileset at 2x
Bitmap.load('public/assets/zone/tiles.png').scaled(2).save(path.join(OUT, 'tileset.png'));
console.log('docs art done');
