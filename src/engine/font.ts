// Bitmap font renderer for the generated pixel font (public/assets/ui/font.*).
// Three faces of one family: regular and bold for running text, display for
// titles, names and critical hits (drawn at full size, never by doubling the
// body pixels). Glyphs are white in the atlas; colored copies are cached per color.

export type Variant = 'regular' | 'bold' | 'display';

export interface FaceJson {
  /** top of this face's row in the atlas */
  y: number;
  cellH: number;
  cap: number;
  gap: number;
  /** text in this face is drawn in capitals */
  caps: boolean;
  glyphs: Record<string, [number, number, number]>;
}

export interface FontJson {
  lineH: number;
  faces: Record<Variant, FaceJson>;
}

export interface TextStyle {
  color?: string;
  outline?: string;
  /** drop shadow color (1px down) */
  shadow?: string;
  variant?: Variant;
  scale?: number;
  align?: 'left' | 'center' | 'right';
  /** two-tone fill: second color for the lower half of the capitals (titles) */
  gradient?: string;
}

export class BitmapFont {
  private tinted = new Map<string, HTMLCanvasElement>();
  constructor(
    private img: HTMLImageElement,
    readonly meta: FontJson,
  ) {}

  /** Cell height of a face in pixels at scale 1. */
  height(variant: Variant = 'regular'): number {
    return this.meta.faces[variant].cellH;
  }

  private sheet(color: string, gradient?: string): HTMLCanvasElement {
    const key = color + '|' + (gradient ?? '');
    let c = this.tinted.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = this.img.width;
      c.height = this.img.height;
      const g = c.getContext('2d')!;
      g.drawImage(this.img, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
      if (gradient) {
        // lower half of the capitals of every face in the second color
        g.fillStyle = gradient;
        for (const f of Object.values(this.meta.faces)) {
          const top = Math.ceil(f.cap / 2);
          g.fillRect(0, f.y + top, c.width, f.cap - top);
        }
      }
      this.tinted.set(key, c);
    }
    return c;
  }

  private face(variant: Variant, text: string): [FaceJson, string] {
    const f = this.meta.faces[variant];
    return [f, f.caps ? text.toUpperCase() : text];
  }

  private glyph(f: FaceJson, ch: string): [number, number, number] {
    return f.glyphs[ch] ?? f.glyphs['?'];
  }

  measure(text: string, variant: Variant = 'regular', scale = 1): number {
    const [f, t] = this.face(variant, text);
    let w = 0;
    for (const ch of t) w += this.glyph(f, ch)[2] + f.gap;
    return Math.max(0, w - f.gap) * scale;
  }

  draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, st: TextStyle = {}): number {
    const variant = st.variant ?? 'regular';
    const scale = st.scale ?? 1;
    const w = this.measure(text, variant, scale);
    const ox = Math.round(st.align === 'center' ? x - w / 2 : st.align === 'right' ? x - w : x);
    const oy = Math.round(y);
    if (st.shadow) this.run(ctx, text, ox, oy + scale, variant, scale, this.sheet(st.shadow));
    if (st.outline) {
      const s = this.sheet(st.outline);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) this.run(ctx, text, ox + dx * scale, oy + dy * scale, variant, scale, s);
    }
    this.run(ctx, text, ox, oy, variant, scale, this.sheet(st.color ?? '#ffffff', st.gradient));
    return w;
  }

  private run(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, variant: Variant, scale: number, sheet: HTMLCanvasElement) {
    const [f, t] = this.face(variant, text);
    let cx = x;
    for (const ch of t) {
      const g = this.glyph(f, ch);
      if (ch !== ' ') ctx.drawImage(sheet, g[0], g[1], g[2], f.cellH, cx, y, g[2] * scale, f.cellH * scale);
      cx += (g[2] + f.gap) * scale;
    }
  }

  /** Greedy word wrap to a pixel width. */
  wrap(text: string, maxW: number, variant: Variant = 'regular'): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (this.measure(t, variant) > maxW && line) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  }
}
