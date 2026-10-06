// Renders all heroes side by side (players facing right, enemies facing left)
// so proportions, palette and value structure can be compared at a glance.
//   npx tsx tools/art/lineup.ts <out.png> [scale] [anim] [frame]
import { PIVOT, renderFrame } from './char.ts';
import { HEROES } from './champions/index.ts';
import { Bitmap, hex } from './raster.ts';

const [out = 'lineup.png', scaleArg = '3', anim = 'idle', frameArg = '0'] = process.argv.slice(2);
const ids = Object.keys(HEROES);
const cellW = 84, cellH = 104;
const sheet = new Bitmap(cellW * ids.length + 16, cellH + 12);
sheet.fill(hex('#3d4b5c'));
sheet.rect(0, cellH - 2, sheet.w, 14, hex('#33404f'));
ids.forEach((id, i) => {
  const facing = i < 3 ? 1 : -1;
  const c = HEROES[id];
  const fr = Math.min(Number(frameArg), c.anims[anim].frames.length - 1);
  const bmp = renderFrame(c, anim, fr, facing);
  const ox = 8 + i * cellW + cellW / 2 - PIVOT.x, oy = cellH - PIVOT.y;
  sheet.blit(bmp, ox, oy);
});
sheet.scaled(Number(scaleArg)).save(out);
console.log('wrote', out);
