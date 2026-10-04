// Dev tool: assembles captured 640x360 buffer frames into a GIF.
//   npx tsx tools/gif.ts <out.gif> <delayMs> <scale> <dir> <prefix> <count> [step]
import { Bitmap } from './art/raster.ts';
import { writeGif } from './gifwrite.ts';

const [out, delayArg, scaleArg, dir, prefix, countArg, stepArg = '1'] = process.argv.slice(2);
const scale = Number(scaleArg);
const frames: { bmp: Bitmap; ms: number }[] = [];
for (let i = 0; i < Number(countArg); i += Number(stepArg)) {
  const b = Bitmap.load(`${dir}/${prefix}${i}.png`);
  frames.push({ bmp: scale === 1 ? b : b.scaled(scale), ms: Number(delayArg) });
}
const size = writeGif(out, frames);
console.log(out, frames.length, 'frames', (size / 1024 / 1024).toFixed(2), 'MB');
