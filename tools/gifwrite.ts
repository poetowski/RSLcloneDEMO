// GIF writer shared by the docs tools. Uses one global palette (stable colors)
// and frame differencing: pixels unchanged since the previous frame are written
// as a transparent index over an undisposed frame, so static areas cost nothing.
import fs from 'node:fs';
import gifenc from 'gifenc';
import { Bitmap } from './art/raster.ts';

const { applyPalette, GIFEncoder, quantize } = gifenc;

export function writeGif(file: string, frames: { bmp: Bitmap; ms: number }[]) {
  const stride = Math.max(1, Math.floor((frames.length * frames[0].bmp.data.length) / 4 / 400000));
  const sample: number[] = [];
  for (const f of frames) for (let i = 0; i < f.bmp.data.length; i += 4 * stride) sample.push(f.bmp.data[i], f.bmp.data[i + 1], f.bmp.data[i + 2], 255);
  const palette = quantize(new Uint8Array(sample), 255, { format: 'rgb565' });
  const real = palette.slice(0, 255);
  while (palette.length < 256) palette.push([0, 0, 0]);
  const enc = GIFEncoder();
  let prev: Uint8Array | null = null;
  for (const f of frames) {
    const idx = applyPalette(f.bmp.data, real, 'rgb565');
    const out = idx.slice();
    if (prev && prev.length === idx.length) for (let i = 0; i < idx.length; i++) if (idx[i] === prev[i]) out[i] = 255;
    enc.writeFrame(out, f.bmp.w, f.bmp.h, { palette, delay: f.ms, repeat: 0, transparent: !!prev, transparentIndex: 255, dispose: 1 });
    prev = idx;
  }
  enc.finish();
  fs.writeFileSync(file, enc.bytes());
  return fs.statSync(file).size;
}
