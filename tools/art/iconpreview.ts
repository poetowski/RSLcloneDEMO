// Dev tool: a champion's skill icons (A1..A3) side by side, upscaled.
//   npx tsx tools/art/iconpreview.ts <hero[,hero]> <out.png> [scale]
import { CHAMPION_ART } from './champions/index.ts';
import { ICON } from './icons.ts';
import { Bitmap, hex } from './raster.ts';

const [ids = 'azure_warrior', out = 'icons.png', scale = '6'] = process.argv.slice(2);
const list = ids.split(',');
const sheet = new Bitmap(3 * (ICON + 4) + 4, list.length * (ICON + 4) + 4).fill(hex('#141a28'));
list.forEach((id, r) => {
  const art = CHAMPION_ART[id];
  if (!art) throw new Error(`unknown hero ${id}`);
  Object.values(art.icons).forEach((make, c) => sheet.blit(make(), 4 + c * (ICON + 4), 4 + r * (ICON + 4)));
});
sheet.scaled(Number(scale)).save(out);
console.log('wrote', out);
