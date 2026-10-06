// Combat effects. Every effect is a short frame sequence drawn with the same
// palette rules as the heroes: hard pixels, ramps from FXR, a white-hot core
// and colored falloff. Packed into one atlas with per-effect anchors.
// Adding effects for a new champion: see .claude/skills/new-champion.
import path from 'node:path';
import { writeJson } from '../io.ts';
import { Bitmap, hex, packShelves, PackItem } from '../raster.ts';
import { COMMON_FX } from './common.ts';
import { FxDef, FxJson } from './kit.ts';
import { SUNSCAR_FX } from './sunscar.ts';

export type { FxJson };

/** Every effect by name; names are what SkillDef.hits[].fx / projectile / castFx refer to. */
export const FX: Record<string, FxDef> = { ...COMMON_FX, ...SUNSCAR_FX };

export function buildFx(out: string) {
  const items: PackItem[] = [];
  const meta: FxJson = { anims: {} };
  const offsets = new Map<string, [number, number]>();
  for (const [name, d] of Object.entries(FX)) {
    for (let i = 0; i < d.n; i++) {
      const b = new Bitmap(d.w, d.h);
      d.draw(b, d.n > 1 ? i / (d.n - 1) : 0, i);
      const bb = b.bounds() ?? { x: 0, y: 0, w: 1, h: 1 };
      const key = `${name}/${i}`;
      items.push({ key, bmp: b.crop(bb) });
      offsets.set(key, [bb.x, bb.y]);
    }
  }
  const { atlas, frames } = packShelves(items, 1024);
  const byKey = new Map(frames.map((f) => [f.key, f]));
  for (const [name, d] of Object.entries(FX)) {
    meta.anims[name] = {
      w: d.w, h: d.h, ax: d.ax, ay: d.ay, ms: d.ms, loop: !!d.loop,
      frames: Array.from({ length: d.n }, (_, i) => {
        const f = byKey.get(`${name}/${i}`)!;
        const [ox, oy] = offsets.get(`${name}/${i}`)!;
        return [f.x, f.y, f.w, f.h, ox, oy];
      }),
    };
  }
  atlas.save(path.join(out, 'fx', 'fx.png'));
  writeJson(path.join(out, 'fx', 'fx.json'), meta);
  console.log(`  fx: ${Object.keys(FX).length} effects, ${items.length} frames -> ${atlas.w}x${atlas.h}`);
}

/** Dev preview: every effect as a row of frames on a dark backdrop. */
export function fxPreview(names?: string[]): Bitmap {
  const rows = Object.entries(FX).filter(([n]) => !names || names.includes(n));
  const cellW = Math.max(...rows.map(([, d]) => d.w)) + 4;
  const maxN = Math.max(...rows.map(([, d]) => d.n));
  const rowH = rows.map(([, d]) => d.h + 4);
  const sheet = new Bitmap(maxN * cellW, rowH.reduce((a, b) => a + b, 0));
  sheet.fill(hex('#2a3344'));
  let y = 0;
  rows.forEach(([, d], ri) => {
    for (let i = 0; i < d.n; i++) {
      const b = new Bitmap(d.w, d.h);
      d.draw(b, d.n > 1 ? i / (d.n - 1) : 0, i);
      sheet.blit(b, i * cellW + 2, y + 2);
    }
    y += rowH[ri];
  });
  return sheet;
}
