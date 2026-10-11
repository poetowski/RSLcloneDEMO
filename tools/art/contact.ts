// Dev tool: tiles burst captures (tools/shots.ts B<n>:<ms>) into one contact
// sheet, optionally cropped to a region of the 640x360 buffer, to review a
// skill's choreography frame by frame.
//   npx tsx tools/art/contact.ts <prefix> <first> <count> <out.png> [cols] [x,y,w,h] [scale]
import { Bitmap, hex } from './raster.ts';

const [prefix, firstArg = '0', countArg = '12', out = 'contact.png', colsArg = '4', crop, scaleArg = '1'] = process.argv.slice(2);
const first = Number(firstArg), count = Number(countArg), cols = Number(colsArg);
const [cx, cy, cw, ch] = crop ? crop.split(',').map(Number) : [0, 0, 640, 360];
const rows = Math.ceil(count / cols);
const sheet = new Bitmap(cols * (cw + 2), rows * (ch + 2)).fill(hex('#101018'));
for (let i = 0; i < count; i++) {
  const b = Bitmap.load(`${prefix}_${first + i}.png`);
  sheet.blit(b, (i % cols) * (cw + 2), Math.floor(i / cols) * (ch + 2), { src: { x: cx, y: cy, w: cw, h: ch } });
}
sheet.scaled(Number(scaleArg)).save(out);
console.log(`wrote ${out} (${count} frames)`);
