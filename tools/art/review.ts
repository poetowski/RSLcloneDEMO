// Dev tool: tight review sheet for one champion: every animation as a row,
// each frame cropped to the animation's union bounding box, upscaled. Frames
// carry a hit marker (red tick) and an event marker (cyan tick) underneath.
//   npx tsx tools/art/review.ts <hero> <out.png> [scale] [left|both] [anim,anim]
import { FRAME_H, FRAME_W, PIVOT, renderAnim } from './char.ts';
import { HEROES } from './champions/index.ts';
import { Bitmap, hex } from './raster.ts';

const [id = 'azure_warrior', out = 'review.png', scaleArg = '2', side = 'right', only] = process.argv.slice(2);
const c = HEROES[id];
if (!c) throw new Error(`unknown hero ${id}`);
const facings: (1 | -1)[] = side === 'both' ? [1, -1] : side === 'left' ? [-1] : [1];
const anims = only ? only.split(',') : Object.keys(c.anims);
const rows: { frames: Bitmap[]; hits: boolean[]; events: boolean[]; box: { x: number; y: number; w: number; h: number } }[] = [];
for (const a of anims) {
  for (const f of facings) {
    const fr = renderAnim(c, a, f);
    let x0 = FRAME_W, y0 = FRAME_H, x1 = 0, y1 = PIVOT.y;
    for (const { bmp } of fr) {
      const b = bmp.bounds();
      if (!b) continue;
      x0 = Math.min(x0, b.x);
      y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.w);
      y1 = Math.max(y1, b.y + b.h);
    }
    const box = { x: x0 - 2, y: y0 - 2, w: x1 - x0 + 4, h: y1 - y0 + 4 };
    rows.push({ frames: fr.map((r) => r.bmp), hits: fr.map((r) => !!r.def.hit), events: fr.map((r) => !!r.def.event), box });
  }
}
const pad = 3;
const W = Math.max(...rows.map((r) => r.frames.length * (r.box.w + pad))) + pad;
const H = rows.reduce((s, r) => s + r.box.h + pad + 3, pad);
const sheet = new Bitmap(W, H).fill(hex('#2c3644'));
let y = pad;
rows.forEach((r, ri) => {
  r.frames.forEach((bmp, i) => {
    const x = pad + i * (r.box.w + pad);
    sheet.rect(x, y, r.box.w, r.box.h, (i + ri) % 2 ? hex('#3d4b5c') : hex('#435366'));
    // ground line
    const gy = PIVOT.y - r.box.y;
    if (gy >= 0 && gy < r.box.h) sheet.rect(x, y + gy, r.box.w, 1, hex('#2c3644'));
    sheet.blit(bmp, x, y, { src: r.box });
    if (r.hits[i]) sheet.rect(x, y + r.box.h + 1, Math.min(8, r.box.w), 2, hex('#ff4a3a'));
    if (r.events[i]) sheet.rect(x + 10, y + r.box.h + 1, Math.min(8, r.box.w), 2, hex('#3ad8ff'));
  });
  y += r.box.h + pad + 3;
});
sheet.scaled(Number(scaleArg)).save(out);
console.log(`wrote ${out} (${rows.length} rows)`);
