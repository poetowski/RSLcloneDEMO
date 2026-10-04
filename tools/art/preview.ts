// Dev tool: renders a contact sheet of a hero's animations, upscaled, onto a
// floor-colored backdrop so shapes can be judged the way they appear in game.
//   npx tsx tools/art/preview.ts <hero> <scale> <out.png> [anim,anim] [both]
import { FRAME_H, FRAME_W, PIVOT, renderAnim } from './char.ts';
import { HEROES } from './heroes/index.ts';
import { Bitmap, hex } from './raster.ts';

const [id = 'knight', scaleArg = '3', out = 'preview.png', animArg, facingArg] = process.argv.slice(2);
const c = HEROES[id];
if (!c) throw new Error(`unknown hero ${id}; have ${Object.keys(HEROES).join(', ')}`);
const scale = Number(scaleArg);
const anims = animArg && animArg !== 'all' ? animArg.split(',') : Object.keys(c.anims);
const facings: (1 | -1)[] = facingArg === 'both' ? [1, -1] : facingArg === 'left' ? [-1] : [1];

// crop window around the pivot keeps the sheet compact
const CX0 = 0, CX1 = FRAME_W, CY0 = 8, CY1 = FRAME_H;
const cw = CX1 - CX0, ch = CY1 - CY0;
const rows: { frames: Bitmap[] }[] = [];
for (const f of facings) {
  for (const spec of anims) {
    // "attack1:2" selects a single frame, "attack1:2-5" a range
    const [a, sel] = spec.split(':');
    let frames = renderAnim(c, a, f).map((r) => r.bmp);
    if (sel) {
      const [lo, hi] = sel.split('-').map(Number);
      frames = frames.slice(lo, (hi ?? lo) + 1);
    }
    rows.push({ frames });
  }
}
const cols = Math.max(...rows.map((r) => r.frames.length));
const sheet = new Bitmap(cols * cw, rows.length * ch);
const bg1 = hex('#3d4b5c'), bg2 = hex('#435366'), ground = hex('#2c3644');
rows.forEach((r, ri) => {
  for (let ci = 0; ci < cols; ci++) {
    const ox = ci * cw, oy = ri * ch;
    sheet.rect(ox, oy, cw, ch, (ri + ci) % 2 ? bg1 : bg2);
    sheet.rect(ox, oy + PIVOT.y - CY0, cw, 1, ground);
    const fr = r.frames[ci];
    if (fr) sheet.blit(fr, ox, oy, { src: { x: CX0, y: CY0, w: cw, h: ch } });
  }
});
sheet.scaled(scale).save(out);
console.log(`wrote ${out} (${rows.length} rows x ${cols} cols)`);
