// Prints each hero's standing height (feet to top of head/helmet, weapons
// excluded) for idle frame 0, plus the full sprite bounding box.
//   npx tsx tools/art/measure.ts
// With a hero and an animation it prints both hands (rig space: [forward, up]
// from the feet) at every hit frame, the starting point for a `muzzle`:
//   npx tsx tools/art/measure.ts azure_warrior attack3
import { renderFrame, PIVOT } from './char.ts';
import { HEROES } from './champions/index.ts';
import { solve } from './rig.ts';

const [hero, anim] = process.argv.slice(2);
if (hero && anim) {
  const c = HEROES[hero];
  c.anims[anim].frames.forEach((f, i) => {
    if (!f.hit && !f.event) return;
    const s = solve(f.pose, c.dims);
    const r = (n: number) => n.toFixed(1);
    console.log(`${anim}[${i}]${f.hit ? ' hit' : ''}${f.event ? ' ' + f.event : ''}  near hand [${r(s.hN.x)}, ${r(s.hN.y)}]  far hand [${r(s.hF.x)}, ${r(s.hF.y)}]  head [${r(s.head.x)}, ${r(s.head.y)}]`);
  });
} else {
  for (const [id, c] of Object.entries(HEROES)) {
    const pose = c.anims.idle.frames[0].pose;
    const s = solve(pose, c.dims);
    const headTop = s.head.y + 7; // head radius ~7 incl. outline
    const b = renderFrame(c, 'idle', 0, 1).bounds()!;
    console.log(`${id.padEnd(12)} head-top ${headTop.toFixed(1)}px  sprite bbox ${b.w}x${b.h} (top ${PIVOT.y - b.y}px above feet)`);
  }
}
