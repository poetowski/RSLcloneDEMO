// Dev tool: tiles screenshots (taken at 2x) into one contact sheet at 1x.
//   npx tsx tools/montage.ts <out.png> <cols> <in1.png> <in2.png> ...
import { Bitmap } from './art/raster.ts';
const [out, colsArg, ...files] = process.argv.slice(2);
const cols = Number(colsArg);
const imgs = files.map((f) => Bitmap.load(f));
const k = imgs[0].w > 640 ? 2 : 1;
const w = imgs[0].w / k, h = imgs[0].h / k;
const rows = Math.ceil(imgs.length / cols);
const sheet = new Bitmap(cols * w + (cols - 1) * 4, rows * h + (rows - 1) * 4);
imgs.forEach((img, i) => {
  const ox = (i % cols) * (w + 4), oy = Math.floor(i / cols) * (h + 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) sheet.set(ox + x, oy + y, img.get(x * k, y * k));
});
sheet.save(out);
console.log('montage', out, sheet.w, sheet.h);
