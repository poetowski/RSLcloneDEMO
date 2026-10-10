// Dev tool: one frame of a hero, cropped around the body and upscaled, for
// judging pixel-level detail (faces, trims, small props).
//   npx tsx tools/art/zoom.ts <hero> <anim> <frame> <out.png> [scale] [left]
import { PIVOT, renderFrame } from './char.ts';
import { HEROES } from './champions/index.ts';
import { Bitmap, hex } from './raster.ts';

const [id = 'azure_warrior', anim = 'idle', frameArg = '0', out = 'zoom.png', scaleArg = '10', side] = process.argv.slice(2);
const c = HEROES[id];
if (!c) throw new Error(`unknown hero ${id}; have ${Object.keys(HEROES).join(', ')}`);
const bmp = renderFrame(c, anim, Number(frameArg), side === 'left' ? -1 : 1);
let x0 = bmp.w, y0 = bmp.h, x1 = 0, y1 = 0;
for (let y = 0; y < bmp.h; y++) {
  for (let x = 0; x < bmp.w; x++) {
    if (!(bmp.get(x, y) & 255)) continue;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
}
x0 -= 3;
y0 -= 3;
x1 += 3;
y1 = Math.max(y1, PIVOT.y) + 3;
const w = x1 - x0 + 1, h = y1 - y0 + 1;
const sheet = new Bitmap(w, h);
sheet.fill(hex('#3d4b5c'));
sheet.rect(0, PIVOT.y - y0, w, 1, hex('#2c3644'));
sheet.blit(bmp, -x0, -y0);
sheet.scaled(Number(scaleArg)).save(out);
console.log(`wrote ${out} (${w}x${h} px)`);
