// Summoning's parts (Jakub, 2026-10-25; the names are my proposal): Stardust,
// the fragments every victory finds, a drift of glinting grains; the Soulstar
// merged from 100 of them, the Wishing Star's own crystal in small
// (tools/art/star.ts); and the glyph on the SUMMON button. Each in a small size
// for lines of text and a large one for the Wishing Star's panels and the
// Journey's reward column. Usage: docs/UI_GUIDE.md.
import { dith, outline, rampDither } from '../paint.ts';
import { Bitmap, hex, RGBA } from '../raster.ts';
import { starCrystal } from '../star.ts';

const H = (list: string[]) => list.map((h) => hex(h));
/** Stardust: old gold paling to white */
const DUST = H(['#3a2810', '#6e4e1c', '#a87a2c', '#d8aa48', '#f4d88a', '#fff4d0', '#ffffff']);
/** the Soulstar: the Wishing Star's lilac light (tools/art/sanctum.ts SOUL) */
const SOUL = H(['#1a1230', '#2c2050', '#433474', '#5f4e9c', '#8a78c4', '#b6a8e6', '#e0d8fa', '#ffffff']);

/** A grain that glints: a bright heart, and arms of `arm` px in the dust's colour. */
function glint(b: Bitmap, x: number, y: number, arm: number, ramp: RGBA[]) {
  b.set(x, y, ramp[ramp.length - 1]);
  for (let i = 1; i <= arm; i++) {
    const c = ramp[Math.max(2, ramp.length - 2 - i)];
    b.set(x + i, y, c);
    b.set(x - i, y, c);
    b.set(x, y + i, c);
    b.set(x, y - i, c);
  }
}

/** Stardust (11x11 or 24x24): motes of starlight strewn along a swirl, the larger ones glinting in four arms, the least of them single grains. */
export function stardust(size: 11 | 24): Bitmap {
  const b = new Bitmap(size, size);
  // [x, y, arm] along a swirl from the lower left up to the right
  const motes: [number, number, number][] = size === 24
    ? [[7, 15, 3], [15, 7, 3], [18, 15, 2], [11, 10, 1], [4, 9, 1], [12, 19, 1], [20, 4, 0], [9, 4, 0], [21, 10, 0], [3, 19, 0], [16, 20, 0]]
    : [[3, 7, 2], [8, 3, 1], [8, 8, 0], [5, 2, 0], [1, 3, 0]];
  for (const [x, y, arm] of motes) {
    if (arm) glint(b, x, y, arm, DUST);
    else {
      b.set(x, y, DUST[5]);
      if (size === 24) b.set(x + 1, y, DUST[3]);
    }
  }
  // a breath of dust between the motes, thinning out
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (b.get(x, y) & 255) continue;
      const u = (x - y + size) / (2 * size);
      const along = Math.abs(x + y - size) / size;
      if (along < 0.34 && dith(x, y, 0.22 * (1 - along / 0.34)) && u > 0.15 && u < 0.85) b.set(x, y, DUST[2]);
    }
  }
  return outline(b, DUST[0]);
}

/** The Soulstar (11x11 or 24x24): the Wishing Star's crystal of eight points, outlined so it reads on any panel. */
export function soulstar(size: 11 | 24): Bitmap {
  const b = new Bitmap(size, size);
  const c = size / 2;
  const s = size === 24 ? { up: 11, down: 11, side: 10, diag: 6.6, waist: 4.8 } : { up: 5.2, down: 5.2, side: 4.8, diag: 3.4, waist: 2.5 };
  starCrystal(b, c, c, s, SOUL);
  return outline(b, SOUL[0]);
}

/** The SUMMON button's glyph (16x16): the Soulstar at the size of the other menu glyphs. */
export function summonGlyph(): Bitmap {
  const b = new Bitmap(16, 16);
  starCrystal(b, 8, 8, { up: 7.4, down: 7.4, side: 6.8, diag: 4.4, waist: 3.2 }, SOUL);
  return outline(b, SOUL[0]);
}
