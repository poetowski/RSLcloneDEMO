// Bitmap font renderer for the generated pixel font (public/assets/ui/font.*).
// Glyphs are white in the atlas; colored copies are cached per color.

export interface FontJson {
  cellH: number;
  baseline: number;
  lineH: number;
  glyphs: Record<'regular' | 'bold', Record<string, [number, number, number]>>;
}

export type Variant = 'regular' | 'bold';

export interface TextStyle {
  color?: string;
  outline?: string;
  /** drop shadow color (1px down) */
  shadow?: string;
  variant?: Variant;
  scale?: number;
  align?: 'left' | 'center' | 'right';
  /** vertical gradient: second color for the lower half (titles) */
  gradient?: string;
}

export class BitmapFont {
  private tinted = new Map<string, HTMLCanvasElement>();
  constructor(
    private img: HTMLImageElement,
    readonly meta: FontJson,
  ) {}

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
        // lower part of each glyph row in the second color
        g.fillStyle = gradient;
        const ch = this.meta.cellH;
        for (const rowY of [0, ch + 1]) g.fillRect(0, rowY + 4, c.width, ch - 4 - 2);
      }
      this.tinted.set(key, c);
    }
    return c;
  }

  measure(text: string, variant: Variant = 'regular', scale = 1): number {
    let w = 0;
    const gl = this.meta.glyphs[variant];
    for (const ch of text) {
      const g = gl[ch] ?? gl['?'];
      w += g[2] + 1;
    }
    return Math.max(0, w - 1) * scale;
  }

  draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, st: TextStyle = {}): number {
    const variant = st.variant ?? 'regular';
    const scale = st.scale ?? 1;
    const w = this.measure(text, variant, scale);
    let ox = Math.round(st.align === 'center' ? x - w / 2 : st.align === 'right' ? x - w : x);
    const oy = Math.round(y);
    if (st.shadow) this.run(ctx, text, ox, oy + scale, variant, scale, this.sheet(st.shadow));
    if (st.outline) {
      const s = this.sheet(st.outline);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) this.run(ctx, text, ox + dx * scale, oy + dy * scale, variant, scale, s);
    }
    this.run(ctx, text, ox, oy, variant, scale, this.sheet(st.color ?? '#ffffff', st.gradient));
    ox += w;
    return w;
  }

  private run(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, variant: Variant, scale: number, sheet: HTMLCanvasElement) {
    const gl = this.meta.glyphs[variant];
    const h = this.meta.cellH;
    let cx = x;
    for (const ch of text) {
      const g = gl[ch] ?? gl['?'];
      if (ch !== ' ') ctx.drawImage(sheet, g[0], g[1], g[2], h, cx, y, g[2] * scale, h * scale);
      cx += (g[2] + 1) * scale;
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
