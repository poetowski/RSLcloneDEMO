// Scrolling for lists and grids that outgrow their window (the champion
// collection, the team-select roster): an eased offset that lands on whole
// pixels, wheel and page steps, and `reveal` so keyboard focus always pulls
// the focused item into view.
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
