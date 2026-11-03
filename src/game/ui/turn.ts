// The hint under the game while a phone is held upright (engine/screen.ts draws
// it in the bar below the frame, at the frame's pixel size): a phone turning
// onto its side, and the words. The game is 16:9, so it is largest held sideways.
import type { BitmapFont } from '../../engine/font';
import { COLORS } from './ui';

const TEXT = 'Turn your phone sideways to play';

export function turnHint(font: BitmapFont): HTMLCanvasElement {
  const icons = 26, gap = 6;
  const c = document.createElement('canvas');
  c.width = icons + gap + Math.ceil(font.measure(TEXT)) + 2;
  c.height = 14;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // a phone in gold with its dark screen, upright, then on its side
  const phone = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#1a2238';
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  };
  phone(1, 1, 7, 12);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(4, 11, 1, 1);
  // the arrow from one to the other
  ctx.fillStyle = COLORS.goldHi;
  ctx.fillRect(10, 7, 4, 1);
  ctx.fillRect(13, 6, 1, 3);
  ctx.fillRect(14, 7, 1, 1);
  phone(15, 4, 11, 7);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(24, 7, 1, 1);
  font.draw(ctx, TEXT, icons + gap, 3, { color: COLORS.text, outline: COLORS.ink });
  return c;
}
