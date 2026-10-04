// Minimal RGBA bitmap used by every art generator. No anti-aliasing anywhere:
// every write is a hard pixel, which is the whole point of the pipeline.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

/** Packed 0xRRGGBBAA, always unsigned. */
export type RGBA = number;

export const TRANSPARENT: RGBA = 0;

export function hex(h: string, a = 255): RGBA {
  const s = h.replace('#', '');
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return rgba(r, g, b, a);
}

export function rgba(r: number, g: number, b: number, a = 255): RGBA {
  return (((r & 255) << 24) | ((g & 255) << 16) | ((b & 255) << 8) | (a & 255)) >>> 0;
}

export const R = (c: RGBA) => (c >>> 24) & 255;
export const G = (c: RGBA) => (c >>> 16) & 255;
export const B = (c: RGBA) => (c >>> 8) & 255;
export const A = (c: RGBA) => c & 255;

export function withAlpha(c: RGBA, a: number): RGBA {
  return ((c & 0xffffff00) | (a & 255)) >>> 0;
}

export function toHex(c: RGBA): string {
  return '#' + [R(c), G(c), B(c)].map((n) => n.toString(16).padStart(2, '0')).join('');
}

/** Linear mix of two colors (used only for authoring palettes, never per pixel at runtime). */
export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  const l = (x: number, y: number) => Math.round(x + (y - x) * t);
  return rgba(l(R(a), R(b)), l(G(a), G(b)), l(B(a), B(b)), l(A(a), A(b)));
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Bitmap {
  readonly data: Uint8Array;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8Array(w * h * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): RGBA {
    if (!this.inside(x, y)) return 0;
    const i = (y * this.w + x) * 4;
    const d = this.data;
    return rgba(d[i], d[i + 1], d[i + 2], d[i + 3]);
  }

  set(x: number, y: number, c: RGBA): void {
    x |= 0;
    y |= 0;
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    const d = this.data;
    d[i] = R(c);
    d[i + 1] = G(c);
    d[i + 2] = B(c);
    d[i + 3] = A(c);
  }

  /** Source-over blend; used for compositing finished layers. */
  blend(x: number, y: number, c: RGBA): void {
    const a = A(c);
    if (a === 0) return;
    if (a === 255) return this.set(x, y, c);
    x |= 0;
    y |= 0;
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    const d = this.data;
    const sa = a / 255;
    const da = d[i + 3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    d[i] = Math.round((R(c) * sa + d[i] * da * (1 - sa)) / oa);
    d[i + 1] = Math.round((G(c) * sa + d[i + 1] * da * (1 - sa)) / oa);
    d[i + 2] = Math.round((B(c) * sa + d[i + 2] * da * (1 - sa)) / oa);
    d[i + 3] = Math.round(oa * 255);
  }

  fill(c: RGBA): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, c);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: RGBA): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }

  /** Copies `src` onto this bitmap (alpha blended). */
  blit(src: Bitmap, dx: number, dy: number, opts: { flipX?: boolean; src?: Rect } = {}): void {
    const s = opts.src ?? { x: 0, y: 0, w: src.w, h: src.h };
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) {
        const sx = opts.flipX ? s.x + s.w - 1 - x : s.x + x;
        const c = src.get(sx, s.y + y);
        if (A(c)) this.blend(dx + x, dy + y, c);
      }
    }
  }

  /** Nearest-neighbour upscale, for previews only. */
  scaled(n: number): Bitmap {
    const out = new Bitmap(this.w * n, this.h * n);
    for (let y = 0; y < out.h; y++) {
      for (let x = 0; x < out.w; x++) out.set(x, y, this.get((x / n) | 0, (y / n) | 0));
    }
    return out;
  }

  /** Tight bounding box of non-transparent pixels, or null if empty. */
  bounds(): Rect | null {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.data[(y * this.w + x) * 4 + 3]) {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  crop(r: Rect): Bitmap {
    const out = new Bitmap(r.w, r.h);
    out.blit(this, 0, 0, { src: r });
    return out;
  }

  clone(): Bitmap {
    const out = new Bitmap(this.w, this.h);
    out.data.set(this.data);
    return out;
  }

  toPNG(): Buffer {
    const png = new PNG({ width: this.w, height: this.h });
    png.data = Buffer.from(this.data);
    return PNG.sync.write(png);
  }

  save(file: string): void {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, this.toPNG());
  }

  static load(file: string): Bitmap {
    const png = PNG.sync.read(fs.readFileSync(file));
    const bmp = new Bitmap(png.width, png.height);
    bmp.data.set(png.data);
    return bmp;
  }
}

// ---------------------------------------------------------------------------
// Atlas packing: trimmed frames packed on shelves, sorted by height.
// ---------------------------------------------------------------------------

export interface PackItem {
  key: string;
  bmp: Bitmap;
}

export interface PackedFrame {
  key: string;
  /** Position inside the atlas. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export function packShelves(items: PackItem[], maxWidth = 1024, pad = 1): { atlas: Bitmap; frames: PackedFrame[] } {
  const order = [...items].sort((a, b) => b.bmp.h - a.bmp.h || b.bmp.w - a.bmp.w);
  const placed: PackedFrame[] = [];
  let x = pad, y = pad, shelfH = 0, usedW = 0;
  for (const it of order) {
    if (x + it.bmp.w + pad > maxWidth) {
      x = pad;
      y += shelfH + pad;
      shelfH = 0;
    }
    placed.push({ key: it.key, x, y, w: it.bmp.w, h: it.bmp.h });
    x += it.bmp.w + pad;
    usedW = Math.max(usedW, x);
    shelfH = Math.max(shelfH, it.bmp.h);
  }
  const atlas = new Bitmap(Math.max(1, usedW), Math.max(1, y + shelfH + pad));
  const byKey = new Map(items.map((i) => [i.key, i.bmp]));
  for (const p of placed) atlas.blit(byKey.get(p.key)!, p.x, p.y);
  return { atlas, frames: placed };
}

/** Deterministic PRNG (mulberry32) so regenerated art is byte-identical. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cheap value noise in [0,1), stable per integer lattice point. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed, 982451653)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
