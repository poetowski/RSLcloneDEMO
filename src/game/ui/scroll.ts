// Scrolling for lists and grids that outgrow their window (the champion
// collection, Weaving's spools, the team-select roster): an eased offset that
// lands on whole pixels, wheel and page steps, and `reveal` so keyboard focus
// always pulls the focused item into view; `drawScrollHints` shows where more
// content is.
import { Rect4 } from '../view/assets';
import { COLORS, Ui } from './ui';

export class Scroller {
  /** eased offset that is drawn, in px */
  pos = 0;
  /** where the offset is heading */
  target = 0;
  /** largest offset: content length minus window length */
  max = 0;

  /** Content and window length along the scroll axis; keeps the offset in range. */
  extent(content: number, view: number) {
    this.max = Math.max(0, Math.round(content - view));
    this.target = this.clamp(this.target);
    this.pos = Math.min(this.pos, this.max);
  }

  by(px: number) {
    this.target = this.clamp(this.target + px);
  }

  to(px: number) {
    this.target = this.clamp(px);
  }

  /** Moves at once, without easing (dragging). */
  shift(px: number) {
    this.target = this.clamp(this.target + px);
    this.pos = this.target;
  }

  /** Scrolls the least distance that shows [start, start + size) in a window of `view`. */
  reveal(start: number, size: number, view: number) {
    if (start < this.target) this.to(start);
    else if (start + size > this.target + view) this.to(start + size - view);
  }

  update(dt: number) {
    const d = this.target - this.pos;
    if (Math.abs(d) < 0.5) this.pos = this.target;
    else this.pos += d * Math.min(1, dt / 70);
  }

  get offset() {
    return Math.round(this.pos);
  }

  /** more content beyond the window's start / end */
  get before() {
    return this.target > 0;
  }

  get after() {
    return this.target < this.max;
  }

  private clamp(v: number) {
    return Math.max(0, Math.min(this.max, v));
  }
}

/**
 * A vertical window's scroll hints: a scrollbar along its right edge, and a
 * fade with a bobbing chevron at each edge that has more beyond it; the fades
 * are clickable (a step of `step` pixels), for touch screens without a wheel.
 */
export function drawScrollHints(ui: Ui, ctx: CanvasRenderingContext2D, sc: Scroller, view: Rect4, step: number, t: number) {
  if (!sc.max) return;
  const [vx, vy, vw, vh] = view;
  const right = vx + vw, bottom = vy + vh, mid = vx + vw / 2;
  const img = ui.a.ui.img;
  const total = vh + sc.max;
  const th = Math.max(18, Math.round((vh - 8) * (vh / total)));
  const ty = vy + 4 + Math.round(((vh - 8 - th) * sc.offset) / sc.max);
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(right - 9, vy + 3, 5, vh - 6);
  ctx.fillStyle = '#1a2238';
  ctx.fillRect(right - 8, vy + 4, 3, vh - 8);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(right - 8, ty, 3, th);
  ctx.fillStyle = COLORS.goldHi;
  ctx.fillRect(right - 8, ty, 3, 1);
  const bob = Math.round(Math.sin(t / 220) * 1.5);
  const r = ui.part('chevron_gold');
  if (sc.after) {
    ui.bands(ctx, vx, bottom - 14, vw - 10, 14, '#05070c', '#05070c', 1);
    ctx.globalAlpha = 0.55;
    ui.bands(ctx, vx, bottom - 26, vw - 10, 12, '#05070c', '#05070c', 1);
    ctx.globalAlpha = 1;
    ctx.drawImage(img, r[0], r[1], r[2], r[3], mid - 5, bottom - 12 + bob, r[2], r[3]);
    ui.text(ctx, 'MORE', mid - 12, bottom - 12, { color: COLORS.dim, align: 'right' });
    ui.regions.push({ x: mid - 60, y: bottom - 26, w: 120, h: 26, click: () => sc.by(step) });
  }
  if (sc.before) {
    ctx.globalAlpha = 0.55;
    ui.bands(ctx, vx, vy, vw - 10, 10, '#05070c', '#05070c', 1);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(mid - 5, vy + 11 - bob);
    ctx.scale(1, -1);
    ctx.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
    ctx.restore();
    ui.regions.push({ x: mid - 60, y: vy, w: 120, h: 14, click: () => sc.by(-step) });
  }
}
