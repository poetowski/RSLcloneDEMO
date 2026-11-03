// Low-resolution render target (640x360) presented as large as the window
// allows, centred, with dark bars where the window is not 16:9. At a
// whole-number scale every art pixel maps to an exact square of screen pixels;
// between whole numbers the frame is first blown up by the next whole number
// (nearest neighbour), then smoothed down to fit, so the pixels stay sharp and
// even-sized, with at most a soft seam of one screen pixel between them.
export const W = 640;
export const H = 360;

/** A fit this little above a whole number is presented at the whole number: perfectly sharp, for a sliver of border. */
const SNAP = 0.04;

const BARS = '#05060a';

export class Screen {
  readonly display: HTMLCanvasElement;
  readonly buf: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private dctx: CanvasRenderingContext2D;
  /** device pixels per art pixel */
  scale = 1;
  private ox = 0;
  private oy = 0;
  /** the frame's size on the display, in device pixels */
  private dw = W;
  private dh = H;
  /** device pixels per CSS pixel, as the canvas has them */
  private dpr = 1;
  /** the whole-number blow-up a fractional scale goes through */
  private up: HTMLCanvasElement | null = null;
  private uctx: CanvasRenderingContext2D | null = null;
  /** shown under the frame while a touch screen is held upright: a hint to turn it */
  hint: HTMLCanvasElement | null = null;
  private upright = false;

  constructor(parent: HTMLElement) {
    this.display = document.createElement('canvas');
    this.display.className = 'screen';
    parent.appendChild(this.display);
    this.dctx = this.display.getContext('2d')!;
    this.buf = document.createElement('canvas');
    this.buf.width = W;
    this.buf.height = H;
    this.ctx = this.buf.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    const resize = () => this.resize();
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    // some phones report the new size only a moment after turning
    window.addEventListener('orientationchange', () => setTimeout(resize, 300));
    this.watchDpr();
    this.watchPixels();
    this.resize();
  }

  /** Fits the display canvas to the window, its backing store to the device pixels it covers. */
  resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    this.display.style.width = vw + 'px';
    this.display.style.height = vh + 'px';
    const dpr = window.devicePixelRatio || 1;
    this.fit(Math.round(vw * dpr), Math.round(vh * dpr));
  }

  /** The window moved to a screen of another pixel density, or the page was zoomed. */
  private watchDpr() {
    const mq = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    mq?.addEventListener?.(
      'change',
      () => {
        this.resize();
        this.watchDpr();
      },
      { once: true },
    );
  }

  /** The canvas's exact size in device pixels where the browser reports it (Chrome, Edge, Firefox), so it is never resampled. */
  private watchPixels() {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.devicePixelContentBoxSize?.[0];
      if (!box) return;
      // it differs from the CSS size times the ratio only by rounding; anything else (an emulated ratio) is not trusted
      const dpr = window.devicePixelRatio || 1;
      const ew = Math.round(parseFloat(this.display.style.width) * dpr), eh = Math.round(parseFloat(this.display.style.height) * dpr);
      if (Math.abs(box.inlineSize - ew) <= 1 && Math.abs(box.blockSize - eh) <= 1) this.fit(box.inlineSize, box.blockSize);
    });
    try {
      ro.observe(this.display, { box: 'device-pixel-content-box' });
    } catch {
      ro.disconnect();
    }
  }

  private fit(pw: number, ph: number) {
    if (this.display.width !== pw) this.display.width = pw;
    if (this.display.height !== ph) this.display.height = ph;
    this.dpr = pw / (parseFloat(this.display.style.width) || pw);
    const fit = Math.min(pw / W, ph / H);
    const whole = Math.floor(fit);
    this.scale = whole >= 1 && fit - whole < SNAP ? whole : fit;
    this.dw = Math.round(W * this.scale);
    this.dh = Math.round(H * this.scale);
    this.ox = Math.floor((pw - this.dw) / 2);
    this.oy = Math.floor((ph - this.dh) / 2);
    const k = Number.isInteger(this.scale) ? 1 : Math.ceil(this.scale);
    if (k > 1) {
      if (!this.up) {
        this.up = document.createElement('canvas');
        this.uctx = this.up.getContext('2d')!;
      }
      if (this.up.width !== W * k) this.up.width = W * k;
      if (this.up.height !== H * k) this.up.height = H * k;
    } else {
      this.up = null;
      this.uctx = null;
    }
    this.upright = ph > pw && !!window.matchMedia?.('(pointer: coarse)').matches;
  }

  present() {
    const d = this.dctx;
    d.fillStyle = BARS;
    d.fillRect(0, 0, this.display.width, this.display.height);
    this.paint(d, this.buf);
    if (this.hint && this.upright) this.drawHint(d, this.hint);
  }

  /**
   * Draws a 640x360 layer (the frame, or one laid over it) where the frame lies
   * on a canvas the size of the display, sharp at any scale.
   */
  paint(d: CanvasRenderingContext2D, src: HTMLCanvasElement) {
    if (Number.isInteger(this.scale)) {
      d.imageSmoothingEnabled = false;
      d.drawImage(src, this.ox, this.oy, this.dw, this.dh);
      return;
    }
    let from: HTMLCanvasElement = src;
    if (this.up && this.uctx) {
      const u = this.uctx;
      u.imageSmoothingEnabled = false;
      u.globalCompositeOperation = 'copy';
      u.drawImage(src, 0, 0, this.up.width, this.up.height);
      u.globalCompositeOperation = 'source-over';
      from = this.up;
    }
    d.imageSmoothingEnabled = true;
    d.imageSmoothingQuality = 'low';
    d.drawImage(from, this.ox, this.oy, this.dw, this.dh);
  }

  /**
   * The hint in the bar under the frame: its pixels whole and twice the frame's,
   * the frame being small on a phone held upright, as long as it fits the width.
   */
  private drawHint(d: CanvasRenderingContext2D, hint: HTMLCanvasElement) {
    const s = Math.max(1, Math.min(Math.ceil(this.scale * 2), Math.floor((this.display.width * 0.85) / hint.width)));
    const hw = hint.width * s, hh = hint.height * s;
    const y = this.oy + this.dh + 8 * s;
    if (y + hh > this.display.height || hw > this.display.width) return;
    d.imageSmoothingEnabled = false;
    d.drawImage(hint, Math.round((this.display.width - hw) / 2), y, hw, hh);
  }

  /** Buffer coordinates -> CSS client coordinates (the inverse of `toVirtual`). */
  toClient(x: number, y: number): { x: number; y: number } {
    const r = this.display.getBoundingClientRect();
    return { x: r.left + (this.ox + x * this.scale) / this.dpr, y: r.top + (this.oy + y * this.scale) / this.dpr };
  }

  /** Where the buffer lies on the display canvas: its offset and scale in device pixels, and the device pixel ratio. */
  get grid(): { ox: number; oy: number; scale: number; dpr: number } {
    return { ox: this.ox, oy: this.oy, scale: this.scale, dpr: this.dpr };
  }

  /** CSS client coordinates -> buffer coordinates. */
  toVirtual(cx: number, cy: number): { x: number; y: number } {
    const r = this.display.getBoundingClientRect();
    const px = (cx - r.left) * this.dpr, py = (cy - r.top) * this.dpr;
    return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale };
  }
}
