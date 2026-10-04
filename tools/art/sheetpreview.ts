// Dev tool: shows a PNG (optionally cropped) on a backdrop, upscaled.
//   npx tsx tools/art/sheetpreview.ts <in.png> <out.png> <scale> [x y w h] [bg]
import { Bitmap, hex } from './raster.ts';
const [inp, out, scale = '3', x, y, w, h, bg = '#3d4b5c'] = process.argv.slice(2);
let b = Bitmap.load(inp);
if (x !== undefined) b = b.crop({ x: +x, y: +y, w: Math.min(+w, b.w - +x), h: Math.min(+h, b.h - +y) });
const back = new Bitmap(b.w, b.h).fill(hex(bg));
back.blit(b, 0, 0);
back.scaled(Number(scale)).save(out);
console.log('wrote', out, b.w, b.h);
