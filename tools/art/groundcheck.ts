// Dev tool: lists frames with pixels below the ground line (feet or props
// sinking into the floor), per champion and animation.
//   npx tsx tools/art/groundcheck.ts [tolerance px]
import { PIVOT, renderAnim } from './char.ts';
import { HEROES } from './champions/index.ts';

const tol = Number(process.argv[2] ?? '1');
for (const [id, c] of Object.entries(HEROES)) {
  for (const anim of Object.keys(c.anims)) {
    renderAnim(c, anim, 1).forEach((f, i) => {
      let deepest = 0, count = 0;
      for (let y = PIVOT.y + 1 + tol; y < f.bmp.h; y++) {
        for (let x = 0; x < f.bmp.w; x++) {
          if (!(f.bmp.get(x, y) & 255)) continue;
          count++;
          deepest = Math.max(deepest, y - PIVOT.y);
        }
      }
      if (count) console.log(`${id.padEnd(12)} ${anim}[${i}]  ${count} px below ground, deepest ${deepest}`);
    });
  }
}
