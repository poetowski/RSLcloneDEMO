// Prints each hero's standing height (feet to top of head/helmet, weapons
// excluded) for idle frame 0, plus the full sprite bounding box.
import { renderFrame, PIVOT } from './char.ts';
import { HEROES } from './champions/index.ts';
import { solve } from './rig.ts';

for (const [id, c] of Object.entries(HEROES)) {
  const pose = c.anims.idle.frames[0].pose;
  const s = solve(pose, c.dims);
  const headTop = s.head.y + 7; // head radius ~7 incl. outline
  const b = renderFrame(c, 'idle', 0, 1).bounds()!;
  console.log(`${id.padEnd(12)} head-top ${headTop.toFixed(1)}px  sprite bbox ${b.w}x${b.h} (top ${PIVOT.y - b.y}px above feet)`);
}
