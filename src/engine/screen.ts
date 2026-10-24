// Low-resolution render target (640x360) presented with whole-number scaling,
// so every art pixel maps to an exact square of screen pixels.
export const W = 640;
export const H = 360;

export class Screen {
  readonly display: HTMLCanvasElement;
  readonly buf: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private dctx: CanvasRenderingContext2D;
  scale = 1;
  private ox = 0;
  private oy = 0;
  private dpr = 1;

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
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth, vh = window.innerHeight;
    const pw = Math.floor(vw * this.dpr), ph = Math.floor(vh * this.dpr);
    this.display.width = pw;
    this.display.height = ph;
    this.display.style.width = vw + 'px';
    this.display.style.height = vh + 'px';
    const fit = Math.min(pw / W, ph / H);
    this.scale = fit >= 1 ? Math.floor(fit) : fit;
    this.ox = Math.floor((pw - W * this.scale) / 2);
    this.oy = Math.floor((ph - H * this.scale) / 2);
  }

  present() {
    const d = this.dctx;
    d.imageSmoothingEnabled = false;
    d.fillStyle = '#05060a';
    d.fillRect(0, 0, this.display.width, this.display.height);
    d.drawImage(this.buf, this.ox, this.oy, W * this.scale, H * this.scale);
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
