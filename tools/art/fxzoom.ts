// Dev tool: chosen frames of one effect side by side, each inside a 1px
// outline of its box, so anything cut off at the box edge is obvious.
//   npx tsx tools/art/fxzoom.ts <name> <out.png> [scale] [frames: 3,4,5]
import { FX } from './fx/index.ts';
import { fxBox, renderFx } from './fx/kit.ts';
import { Bitmap, hex } from './raster.ts';

const [name = 'hit', out = 'fxzoom.png', scaleArg = '4', framesArg] = process.argv.slice(2);
const d = FX[name];
if (!d) throw new Error(`unknown effect ${name}`);
const frames = framesArg ? framesArg.split(',').map(Number) : Array.from({ length: d.n }, (_, i) => i);
const box = fxBox(d);
const pad = 4;
const sheet = new Bitmap(frames.length * (box.w + 2 + pad) + pad, box.h + 2 + pad * 2).fill(hex('#202838'));
frames.forEach((i, k) => {
  const x = pad + k * (box.w + 2 + pad), y = pad;
  sheet.rect(x, y, box.w + 2, box.h + 2, hex('#ff3aa0'));
  sheet.rect(x + 1, y + 1, box.w, box.h, hex('#2c3648'));
  sheet.blit(renderFx(d, i), x + 1, y + 1);
  // the anchor (where the effect is planted on the unit)
  sheet.set(x + 1 + Math.round(box.ax * box.w), y + 1 + Math.round(box.ay * box.h), hex('#ffff00'));
});
sheet.scaled(Number(scaleArg)).save(out);
console.log('wrote', out);
