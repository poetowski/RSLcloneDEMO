// Immediate-mode UI kit shared by every screen and the battle HUD. Everything
// is drawn in the 640x360 buffer with the pixel font and the generated UI
// parts; clickable regions are rebuilt every frame. Mouse hover and keyboard
// focus are the same state, so every menu works with arrows + Enter.
// Layout rules and part names: docs/UI_GUIDE.md.
import { TextStyle } from '../../engine/font';
import { H, W } from '../../engine/screen';
import { Assets, blit, nine, Rect4 } from '../view/assets';

export interface Tip {
  title: string;
  sub?: string;
  body: string;
  color?: string;
}

export interface Region {
  /** stable id: keyboard focus survives the per-frame rebuild through it */
  id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  click?: () => void;
  hover?: () => void;
  tip?: () => Tip;
  /** place the tooltip under the region instead of above it */
  tipBelow?: boolean;
  /** the pointer only hits it inside this rect [x, y, w, h] (items of a scrolled list) */
  clip?: Rect4;
}

export const COLORS = {
  ink: '#07080e',
  text: '#e8eef8',
  dim: '#9fb0cc',
  faint: '#6f7f9c',
  gold: '#f0c650',
  goldHi: '#ffe070',
  good: '#8cff7a',
  bad: '#ff8a7a',
  panel: '#0d1220',
};

const TINY: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
};

export interface ButtonOpts {
  click: () => void;
  /** small = 16px HUD button, big = menu button with the gold bevel */
  kind?: 'big' | 'small';
  /** menu glyph part drawn left of the label (mi_* or g_*) */
  icon?: string;
  disabled?: boolean;
  /** draws lit even when not hovered (toggles) */
  active?: boolean;
  color?: string;
  tip?: () => Tip;
}

export class Ui {
  regions: Region[] = [];
  mouse = { x: -1, y: -1 };
  /** focused region id (keyboard), or the hovered one (mouse) */
  focusId: string | null = null;
  /** true after a key press until the mouse moves again */
  keyboard = false;

  constructor(readonly a: Assets) {}

  part(name: string): Rect4 {
    const r = this.a.ui.json.parts[name];
    if (!r) throw new Error('no ui part ' + name);
    return r;
  }

  blit(ctx: CanvasRenderingContext2D, name: string, x: number, y: number) {
    blit(ctx, this.a.ui.img, this.part(name), x, y);
  }

  text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, st: TextStyle = {}) {
    return this.a.font.draw(ctx, s, x, y, { outline: COLORS.ink, ...st });
  }

  measure(s: string, variant: 'regular' | 'bold' = 'regular', scale = 1) {
    return this.a.font.measure(s, variant, scale);
  }

  /** Word-wrapped paragraph; returns the height used. */
  para(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, maxW: number, st: TextStyle = {}, lineH = 11): number {
    const lines = this.a.font.wrap(s, maxW, st.variant ?? 'regular');
    lines.forEach((l, i) => this.text(ctx, l, x, y + i * lineH, st));
    return lines.length * lineH;
  }

  tinyNum(ctx: CanvasRenderingContext2D, n: number, x: number, y: number, color = '#ffffff') {
    let cx = x;
    for (const ch of String(n)) {
      const g = TINY[ch];
      if (!g) continue;
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(cx - 1, y - 1, 5, 7);
      ctx.fillStyle = color;
      g.forEach((row, yy) => [...row].forEach((c, xx) => c === '#' && ctx.fillRect(cx + xx, y + yy, 1, 1)));
      cx += 4;
    }
  }

  beginFrame() {
    this.regions = [];
  }

  hit(x: number, y: number): Region | undefined {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];
      if (r.clip && !(x >= r.clip[0] && y >= r.clip[1] && x < r.clip[0] + r.clip[2] && y < r.clip[1] + r.clip[3])) continue;
      if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r;
    }
    return undefined;
  }

  inside(x: number, y: number, w: number, h: number) {
    return !this.keyboard && this.mouse.x >= x && this.mouse.y >= y && this.mouse.x < x + w && this.mouse.y < y + h;
  }

  /** Hovered by the mouse or focused by the keyboard; `clip` limits hovering to a scrolled list's window. */
  hot(id: string, x: number, y: number, w: number, h: number, clip?: Rect4) {
    return this.keyboard ? this.focusId === id : this.inside(x, y, w, h) && (!clip || this.inside(...clip));
  }

  panel(ctx: CanvasRenderingContext2D, kind: 'dark' | 'gold' | 'red' | 'well', x: number, y: number, w: number, h: number) {
    if (kind === 'well') nine(ctx, this.a.ui.img, this.part('well'), x, y, w, h, 6);
    else nine(ctx, this.a.ui.img, this.part(kind === 'dark' ? 'panel' : kind === 'gold' ? 'panel_gold' : 'panel_red'), x, y, w, h, 6);
  }

  /** A button; returns whether it is hot (hovered/focused). */
  button(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, w: number, h: number, label: string, o: ButtonOpts): boolean {
    const hot = !o.disabled && this.hot(id, x, y, w, h);
    const big = (o.kind ?? 'big') === 'big';
    const pressed = hot && this.down;
    if (big) {
      const p = o.disabled ? 'big_off' : pressed ? 'big_down' : hot || o.active ? 'big_hover' : 'big_up';
      nine(ctx, this.a.ui.img, this.part(p), x, y, w, h, 8);
    } else {
      const p = o.disabled ? 'btn_off' : pressed ? 'btn_down' : hot || o.active ? 'btn_hover' : 'btn_up';
      nine(ctx, this.a.ui.img, this.part(p), x, y, w, h, 4);
    }
    const icon = o.icon ? this.part(o.icon) : null;
    const tw = this.measure(label, big ? 'bold' : 'regular');
    const gap = icon ? icon[2] + 5 : 0;
    const cx = Math.round(x + w / 2 - (tw + gap) / 2) + (pressed ? 1 : 0);
    const cy = Math.round(y + h / 2) + (pressed ? 1 : 0);
    if (icon) {
      ctx.globalAlpha = o.disabled ? 0.45 : 1;
      blit(ctx, this.a.ui.img, icon, cx, cy - Math.round(icon[3] / 2));
      ctx.globalAlpha = 1;
    }
    const color = o.disabled ? '#6a7080' : hot || o.active ? COLORS.goldHi : (o.color ?? COLORS.text);
    this.text(ctx, label, cx + gap, cy - 4, { color, variant: big ? 'bold' : 'regular' });
    this.regions.push({ id, x, y, w, h, click: o.disabled ? undefined : o.click, tip: o.tip });
    return hot;
  }

  /** Pressed state for the button under the pointer (set by the app). */
  down = false;

  /** Gold rule with a diamond, stretched to `w`. */
  divider(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
    const r = this.part('divider');
    const ends = 6;
    ctx.drawImage(this.a.ui.img, r[0], r[1], ends, r[3], x, y, ends, r[3]);
    ctx.drawImage(this.a.ui.img, r[0] + ends, r[1], 4, r[3], x + ends, y, Math.round(w / 2) - ends - 3, r[3]);
    ctx.drawImage(this.a.ui.img, r[0] + r[2] / 2 - 4, r[1], 8, r[3], Math.round(x + w / 2 - 4), y, 8, r[3]);
    ctx.drawImage(this.a.ui.img, r[0] + r[2] - ends - 4, r[1], 4, r[3], Math.round(x + w / 2 + 4), y, Math.round(w / 2) - ends - 4, r[3]);
    ctx.drawImage(this.a.ui.img, r[0] + r[2] - ends, r[1], ends, r[3], x + w - ends, y, ends, r[3]);
  }

  /** Horizontal bar with an outline, fill and a light top row. */
  bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number, fill: string, light: string, back = '#1a2238') {
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = back;
    ctx.fillRect(x, y, w, h);
    const fw = Math.round(Math.max(0, Math.min(1, k)) * w);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, fw, h);
    ctx.fillStyle = light;
    ctx.fillRect(x, y, fw, 1);
  }

  /**
   * Posterized vertical gradient: `n` flat bands stepping from `top` to
   * `bottom` (#rrggbb). Pixel art never uses smooth gradients.
   */
  bands(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: string, bottom: string, n = 6) {
    const a = parseInt(top.slice(1), 16), b = parseInt(bottom.slice(1), 16);
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) : 0;
      const ch = (s: number) => Math.round(((a >> s) & 255) + ((((b >> s) & 255) - ((a >> s) & 255)) * k));
      ctx.fillStyle = `rgb(${ch(16)},${ch(8)},${ch(0)})`;
      const y0 = Math.round(y + (h * i) / n), y1 = Math.round(y + (h * (i + 1)) / n);
      ctx.fillRect(x, y0, w, y1 - y0);
    }
  }

  private glows = new Map<string, HTMLCanvasElement>();

  /** Hard-banded radial glow (pixel-art light pool), cached per size and color. */
  glow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string, alpha = 1) {
    const key = `${rx}|${ry}|${color}`;
    let c = this.glows.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = rx * 2;
      c.height = ry * 2;
      const g = c.getContext('2d')!;
      const img = g.createImageData(c.width, c.height);
      const n = parseInt(color.slice(1), 16);
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const d = Math.hypot((x + 0.5 - rx) / rx, (y + 0.5 - ry) / ry);
          if (d >= 1) continue;
          const k = Math.floor((1 - d) * 5 + 1) / 5;
          const i = (y * c.width + x) * 4;
          img.data[i] = (n >> 16) & 255;
          img.data[i + 1] = (n >> 8) & 255;
          img.data[i + 2] = n & 255;
          img.data[i + 3] = Math.round(k * k * 150);
        }
      }
      g.putImageData(img, 0, 0);
      this.glows.set(key, c);
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(c, Math.round(cx - rx), Math.round(cy - ry));
    ctx.globalAlpha = 1;
  }

  /** Dims everything drawn so far (modal overlays). */
  dim(ctx: CanvasRenderingContext2D, alpha = 0.6) {
    ctx.fillStyle = `rgba(4,6,14,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------------------------------------------------------------------------
  // keyboard focus

  private focusables() {
    return this.regions.filter((r) => r.id && r.click);
  }

  navigate(dir: 'up' | 'down' | 'left' | 'right') {
    const list = this.focusables();
    if (!list.length) return;
    this.keyboard = true;
    const cur = list.find((r) => r.id === this.focusId);
    if (!cur) {
      this.focusId = list[0].id!;
      return;
    }
    const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
    let best: Region | null = null, bestS = Infinity;
    for (const r of list) {
      if (r === cur) continue;
      const dx = r.x + r.w / 2 - cx, dy = r.y + r.h / 2 - cy;
      const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
      const across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      if (along <= 2) continue;
      const score = along + across * 2.2;
      if (score < bestS) {
        bestS = score;
        best = r;
      }
    }
    if (best) this.focusId = best.id!;
  }

  activate(): boolean {
    const r = this.focusables().find((x) => x.id === this.focusId);
    if (r?.click) {
      r.click();
      return true;
    }
    return false;
  }

  pointer(x: number, y: number) {
    if (Math.abs(x - this.mouse.x) + Math.abs(y - this.mouse.y) > 0.5) this.keyboard = false;
    this.mouse = { x, y };
    const r = this.hit(x, y);
    if (r?.id) this.focusId = r.id;
    r?.hover?.();
    return r;
  }

  /** Tooltip for whatever region the mouse (or focus) is over. */
  drawTooltip(ctx: CanvasRenderingContext2D) {
    const r = this.keyboard ? this.regions.find((x) => x.id && x.id === this.focusId) : this.hit(this.mouse.x, this.mouse.y);
    if (!r?.tip) return;
    const tip = r.tip();
    const font = this.a.font;
    const maxW = 220;
    const lines = tip.body ? font.wrap(tip.body, maxW - 14) : [];
    const w = Math.max(font.measure(tip.title, 'bold'), tip.sub ? font.measure(tip.sub) : 0, ...lines.map((l) => font.measure(l))) + 14;
    const h = 12 + (tip.sub ? 10 : 0) + lines.length * 10 + (lines.length ? 4 : 0) + 6;
    let x = Math.round(r.x + r.w / 2 - w / 2), y = r.tipBelow ? r.y + r.h + 4 : r.y - h - 4;
    x = Math.max(4, Math.min(W - w - 4, x));
    if (y < 4) y = r.y + r.h + 4;
    if (y + h > H - 4) y = H - 4 - h;
    nine(ctx, this.a.ui.img, this.part('panel_gold'), x, y, w, h, 6);
    let cy = y + 5;
    this.text(ctx, tip.title, x + 7, cy, { color: tip.color ?? COLORS.goldHi, variant: 'bold' });
    cy += 11;
    if (tip.sub) {
      this.text(ctx, tip.sub, x + 7, cy, { color: '#8fa0c0' });
      cy += 10;
    }
    if (lines.length) cy += 3;
    for (const l of lines) {
      this.text(ctx, l, x + 7, cy, { color: COLORS.text });
      cy += 10;
    }
  }
}
