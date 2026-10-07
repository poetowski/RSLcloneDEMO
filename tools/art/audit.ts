// Art audit: proves the generated assets follow docs/ART_GUIDE.md.
//   npm run audit            (run after npm run art)
// Checks
//   champions  every pixel comes from the palette (MAT ramps, ACCENT, INK)
//              idle height >= 64 px, no frame touches the frame box edges,
//              no hex literals in tools/art/champions/*.ts
//   zones      backdrop 640x200, tiles on the 32px grid, color budgets
//   effects    no frame is cut off at the edge of its box; padding keeps
//              ground effects (anchor ay > 0.8) planted on the feet
//   ui         skill icons 40x40, status icons 12x12
// Exits with code 1 when anything fails.
import fs from 'node:fs';
import path from 'node:path';
import { FRAME_H, FRAME_W } from './char.ts';
import { CHAMPION_ART } from './champions/index.ts';
import { ACCENT, INK, MAT } from './palette.ts';
import { A, Bitmap } from './raster.ts';
import { ZONE_ART } from './zones/index.ts';
import { FX } from './fx/index.ts';
import { fxBox, fxEdges } from './fx/kit.ts';

const MIN_HEIGHT = 64;
const MAX_HEIGHT = 96;
const BACKDROP_COLORS = 220;
const TILESET_COLORS = 160;

let failures = 0;
const ok = (msg: string) => console.log(`  ok    ${msg}`);
const fail = (msg: string) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};

const rgb = (c: number) => c >>> 8; // drop alpha
const palette = new Set<number>();
for (const m of Object.values(MAT)) for (const c of m.ramp) palette.add(rgb(c));
for (const c of Object.values(ACCENT)) palette.add(rgb(c));
for (const c of Object.values(INK)) palette.add(rgb(c));

function colors(b: Bitmap): Map<number, number> {
  const m = new Map<number, number>();
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const c = b.get(x, y);
      if (A(c) === 0) continue;
      m.set(rgb(c), (m.get(rgb(c)) ?? 0) + 1);
    }
  }
  return m;
}

const hex6 = (c: number) => '#' + c.toString(16).padStart(6, '0');

console.log('champions');
for (const id of Object.keys(CHAMPION_ART)) {
  const png = `public/assets/champions/${id}.png`, js = `public/assets/champions/${id}.json`;
  if (!fs.existsSync(png)) {
    fail(`${id}: no atlas (run npm run art)`);
    continue;
  }
  const atlas = Bitmap.load(png);
  const json = JSON.parse(fs.readFileSync(js, 'utf8'));
  const off = [...colors(atlas)].filter(([c]) => !palette.has(c));
  if (off.length) fail(`${id}: ${off.length} colors outside the palette, e.g. ${off.slice(0, 4).map(([c, n]) => `${hex6(c)} x${n}`).join(', ')}`);
  else ok(`${id}: palette clean`);
  const idle = json.frames['R/idle/0'];
  const height = json.pivotY - idle[5];
  if (height < MIN_HEIGHT || height > MAX_HEIGHT) fail(`${id}: idle height ${height}px outside ${MIN_HEIGHT}-${MAX_HEIGHT}`);
  else ok(`${id}: idle height ${height}px`);
  const clipped = Object.entries(json.frames as Record<string, number[]>).filter(([, f]) => f[4] <= 0 || f[5] <= 0 || f[4] + f[2] >= FRAME_W || f[5] + f[3] >= FRAME_H);
  if (clipped.length) fail(`${id}: ${clipped.length} frames touch the ${FRAME_W}x${FRAME_H} frame box, e.g. ${clipped.slice(0, 3).map(([k]) => k).join(', ')}`);
  else ok(`${id}: ${Object.keys(json.frames).length} frames inside the frame box`);
  const src = fs.readFileSync(path.join('tools/art/champions', `${id}.ts`), 'utf8');
  const literals = src.match(/hex\('#[0-9a-fA-F]+'\)|'#[0-9a-fA-F]{6}'/g);
  if (literals) fail(`${id}.ts: ${literals.length} color literals (${literals.slice(0, 3).join(', ')}); use MAT, ACCENT or INK from palette.ts`);
}

console.log('zones');
for (const z of Object.values(ZONE_ART)) {
  const dir = `public/assets/zones/${z.id}`;
  if (!fs.existsSync(`${dir}/backdrop.png`)) {
    fail(`${z.id}: not built (run npm run art)`);
    continue;
  }
  const bd = Bitmap.load(`${dir}/backdrop.png`);
  if (bd.w !== 640 || bd.h !== 200) fail(`${z.id}: backdrop is ${bd.w}x${bd.h}, expected 640x200`);
  const nb = colors(bd).size;
  if (nb > BACKDROP_COLORS) fail(`${z.id}: backdrop uses ${nb} colors (budget ${BACKDROP_COLORS})`);
  else ok(`${z.id}: backdrop ${nb} colors`);
  const tiles = Bitmap.load(`${dir}/tiles.png`);
  if (tiles.w % 32 || tiles.h % 32) fail(`${z.id}: tileset ${tiles.w}x${tiles.h} is not on the 32px grid`);
  const nt = colors(tiles).size;
  if (nt > TILESET_COLORS) fail(`${z.id}: tileset uses ${nt} colors (budget ${TILESET_COLORS})`);
  else ok(`${z.id}: tileset ${tiles.w / 32}x${tiles.h / 32} tiles, ${nt} colors`);
}

console.log('effects');
let fxBad = 0;
for (const [name, d] of Object.entries(FX)) {
  const cut = fxEdges(d);
  if (cut.length) {
    fxBad++;
    fail(`${name}: ${cut.map((e) => `frame ${e.frame} ${e.empty ? 'is empty' : `cut off at the ${Object.keys(e.cut).join(', ')}`}`).join('; ')} (give it room with \`pad\`)`);
  }
  // the battle plants effects with ay > 0.8 on the target's feet: padding must not move one across that line
  if ((d.ay > 0.8) !== (fxBox(d).ay > 0.8)) {
    fxBad++;
    fail(`${name}: padding moves the anchor across ay 0.8 (${d.ay} -> ${fxBox(d).ay}); pad the other side too`);
  }
}
if (!fxBad) ok(`${Object.keys(FX).length} effects inside their boxes`);

console.log('ui');
const ui = JSON.parse(fs.readFileSync('public/assets/ui/ui.json', 'utf8'));
const badIcons = Object.entries(ui.icons as Record<string, number[]>).filter(([, r]) => r[2] !== 40 || r[3] !== 40);
if (badIcons.length) fail(`skill icons not 40x40: ${badIcons.map(([k]) => k).join(', ')}`);
else ok(`${Object.keys(ui.icons).length} skill icons 40x40`);
const badStatus = Object.entries(ui.status as Record<string, { rect: number[] }>).filter(([, s]) => s.rect[2] !== 12 || s.rect[3] !== 12);
if (badStatus.length) fail(`status icons not 12x12: ${badStatus.map(([k]) => k).join(', ')}`);
else ok(`${Object.keys(ui.status).length} status icons 12x12`);

console.log(failures ? `\n${failures} problem(s)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
