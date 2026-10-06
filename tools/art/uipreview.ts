// Dev tool: every UI part (and the status icons) on a dark backdrop.
//   npx tsx tools/art/uipreview.ts <out.png> [scale] [name,name]
import { Bitmap, hex } from './raster.ts';
import { allParts } from './ui/index.ts';
import { STATUS_ICONS, statusIcon } from './ui/status.ts';

const [out = 'ui_preview.png', scale = '3', only] = process.argv.slice(2);
const parts = allParts();
for (const [id, def] of Object.entries(STATUS_ICONS)) parts['status_' + id] = statusIcon(def);
const list = Object.entries(parts).filter(([n]) => !only || only.split(',').some((o) => n.startsWith(o)));
const W = 300;
let x = 4, y = 4, rowH = 0;
const pos: [Bitmap, number, number][] = [];
for (const [, b] of list) {
  if (x + b.w + 4 > W) {
    x = 4;
    y += rowH + 4;
    rowH = 0;
  }
  pos.push([b, x, y]);
  x += b.w + 4;
  rowH = Math.max(rowH, b.h);
}
const sheet = new Bitmap(W, y + rowH + 4).fill(hex('#3d4b5c'));
for (const [b, px, py] of pos) sheet.blit(b, px, py);
sheet.scaled(Number(scale)).save(out);
console.log('wrote', out, list.length, 'parts');
