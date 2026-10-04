// Writes public/favicon.png: the knight's portrait in a gold frame (32x32).
import { Bitmap, hex } from './raster.ts';
const ui = Bitmap.load('public/assets/ui/ui.png');
const json = JSON.parse((await import('node:fs')).readFileSync('public/assets/ui/ui.json', 'utf8'));
const [x, y, w, h] = json.portraits.knight;
const out = new Bitmap(32, 32).fill(hex('#120c08'));
out.rect(1, 1, 30, 30, hex('#e8b440'));
out.blit(ui, 2, 2, { src: { x, y, w, h } });
out.save('public/favicon.png');
console.log('favicon written');
