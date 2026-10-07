// Dev tool: snapshot every rendered frame of some heroes, or compare them
// against a snapshot and list the frames whose pixels changed. Use it to prove
// a refactor only touches the frames it means to.
//   npx tsx tools/art/framediff.ts save <dir> <hero,hero>
//   npx tsx tools/art/framediff.ts diff <dir> <hero,hero>
import fs from 'node:fs';
import path from 'node:path';
import { renderAnim } from './char.ts';
import { HEROES } from './champions/index.ts';

const [mode, dir, ids] = process.argv.slice(2);
if (!mode || !dir || !ids) throw new Error('usage: framediff.ts save|diff <dir> <hero,hero>');
fs.mkdirSync(dir, { recursive: true });
let changed = 0, total = 0;
for (const id of ids.split(',')) {
  const c = HEROES[id];
  for (const anim of Object.keys(c.anims)) {
    for (const [face, f] of [['R', 1], ['L', -1]] as const) {
      renderAnim(c, anim, f).forEach((r, i) => {
        const file = path.join(dir, `${id}_${face}_${anim}_${i}.bin`);
        total++;
        if (mode === 'save') fs.writeFileSync(file, r.bmp.data);
        else {
          const old = fs.existsSync(file) ? fs.readFileSync(file) : null;
          if (!old || Buffer.compare(old, Buffer.from(r.bmp.data)) !== 0) {
            changed++;
            let n = 0;
            if (old) for (let k = 0; k < old.length; k += 4) if (old.readUInt32BE(k) !== Buffer.from(r.bmp.data.buffer, r.bmp.data.byteOffset + k, 4).readUInt32BE(0)) n++;
            console.log(`  changed ${id} ${face}/${anim}/${i}  (${n} px)`);
          }
        }
      });
    }
  }
}
console.log(mode === 'save' ? `saved ${total} frames` : `${changed} of ${total} frames changed`);
