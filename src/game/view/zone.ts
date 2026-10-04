// Renders the battlefield: backdrop, pre-baked tile layers, animated props
// (banners, brazier fire, rune circle), falling snow, embers and lighting.
import { Particles } from '../../engine/particles';
import { H, W } from '../../engine/screen';
import { Assets, blit, Rect4, ZoneJson } from './assets';

export class ZoneView {
  private tilesLayer: HTMLCanvasElement;
  private light: HTMLCanvasElement;
  private vignette: HTMLCanvasElement;
  private t = 0;
  readonly snow = new Particles();
  readonly embers = new Particles();
  readonly json: ZoneJson;

  constructor(private a: Assets) {
    this.json = a.zone.json;
    this.tilesLayer = this.bakeTiles();
    this.light = makeGlow(64, 40, [255, 170, 80]);
    this.vignette = makeVignette();
    // seed ambient snow across the screen
    for (let i = 0; i < 90; i++) this.spawnFlake(Math.random() * H);
  }

  private bakeTiles(): HTMLCanvasElement {
    const z = this.json;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    const T = z.tile;
    for (const layer of [z.layers.ground, z.layers.wall]) {
      for (let r = 0; r < z.rows; r++) {
        for (let col = 0; col < z.cols; col++) {
          const t = layer[r * z.cols + col];
          if (t < 0) continue;
          g.drawImage(this.a.zone.tiles, (t % z.atlasCols) * T, Math.floor(t / z.atlasCols) * T, T, T, col * T, r * T, T, T);
        }
      }
    }
    return c;
  }

  private spawnFlake(y = -4) {
    const near = Math.random() < 0.35;
    this.snow.add({
      x: Math.random() * (W + 40) - 20,
      y,
      vx: -4 - Math.random() * 6,
      vy: near ? 22 + Math.random() * 14 : 9 + Math.random() * 7,
      life: Infinity,
      size: near ? 2 : 1,
      color: near ? '#f2f8ff' : '#9fb4d8',
      sway: near ? 10 : 5,
    });
  }

  prop(kind: string, i = 0): Rect4 {
    return this.json.propFrames[`${kind}/${i}`];
  }

  update(dt: number) {
    this.t += dt;
    this.snow.update(dt);
    for (const p of this.snow.list) if (p.y > H + 4) p.life = 0;
    while (this.snow.list.length < 90) this.spawnFlake();
    this.embers.update(dt);
    for (const b of this.json.props) {
      if (b.kind === 'brazier' && Math.random() < dt / 140) {
        this.embers.add({
          x: b.x - 3 + Math.random() * 6, y: b.y - 34,
          vx: (Math.random() - 0.5) * 8, vy: -18 - Math.random() * 14,
          life: 900 + Math.random() * 700, color: '#ffd060', fade: ['#fff0b0', '#ffb84a', '#f2731e', '#c8361a'],
          sway: 6, additive: true,
        });
      }
    }
  }

  /** Everything behind the units. */
  drawBack(ctx: CanvasRenderingContext2D) {
    const img = this.a.zone.props;
    ctx.drawImage(this.a.zone.backdrop, 0, 0);
    ctx.drawImage(this.tilesLayer, 0, 0);
    for (const p of this.json.props) {
      if (p.layer === 'fg') continue;
      if (p.kind === 'banner') {
        const f = Math.floor(this.t / 160 + p.x * 0.01) % 4;
        blit(ctx, img, this.prop('banner', f), p.x, p.y);
      } else if (p.kind === 'rune') {
        const dim = this.prop('rune', 0), bright = this.prop('rune', 1);
        blit(ctx, img, dim, p.x - dim[2] / 2, p.y - dim[3] / 2);
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(this.t / 700);
        blit(ctx, img, bright, p.x - bright[2] / 2, p.y - bright[3] / 2);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'brazier') {
        const r = this.prop('brazier');
        blit(ctx, img, r, p.x - r[2] / 2, p.y - r[3]);
      } else {
        const r = this.prop(p.kind);
        if (r) blit(ctx, img, r, p.x - r[2] / 2, p.y - r[3]);
      }
    }
  }

  /** Fire is drawn after the units so flames glow over nearby shapes. */
  drawFire(ctx: CanvasRenderingContext2D) {
    const img = this.a.zone.props;
    for (const p of this.json.props) {
      if (p.kind !== 'brazier') continue;
      const f = Math.floor(this.t / 90 + p.x) % 6;
      const r = this.prop('flame', f);
      blit(ctx, img, r, p.x - r[2] / 2, p.y - 30 - r[3] + 8);
    }
    this.embers.draw(ctx);
  }

  drawFront(ctx: CanvasRenderingContext2D) {
    const img = this.a.zone.props;
    for (const p of this.json.props) {
      if (p.layer !== 'fg') continue;
      const r = this.prop(p.kind);
      blit(ctx, img, r, p.x - r[2] / 2, p.y - r[3]);
    }
    this.snow.draw(ctx);
  }

  drawLighting(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.json.props) {
      if (p.kind !== 'brazier') continue;
      const flick = 0.75 + 0.12 * Math.sin(this.t / 70 + p.x) + 0.08 * Math.sin(this.t / 31);
      ctx.globalAlpha = flick * 0.55;
      ctx.drawImage(this.light, p.x - this.light.width / 2, p.y - 30 - this.light.height / 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.vignette, 0, 0);
  }
}

/** Soft radial light, quantized into 6 bands so it reads as pixel art. */
function makeGlow(rx: number, ry: number, rgb: [number, number, number]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = rx * 2;
  c.height = ry * 2;
  const g = c.getContext('2d')!;
  const img = g.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const d = Math.hypot((x + 0.5 - rx) / rx, (y + 0.5 - ry) / ry);
      if (d >= 1) continue;
      const k = Math.floor((1 - d) * 6) / 6;
      const i = (y * c.width + x) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = Math.round(k * k * 120);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function makeVignette(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2), dy = (y - H * 0.55) / (H * 0.62);
      const d = Math.max(0, Math.hypot(dx, dy) - 0.62) / 0.6;
      if (d <= 0) continue;
      const k = Math.min(1, d);
      const step = Math.floor(k * 4 + bayer[(y & 3) * 4 + (x & 3)] / 16) / 4;
      const i = (y * W + x) * 4;
      img.data[i] = 4;
      img.data[i + 1] = 6;
      img.data[i + 2] = 16;
      img.data[i + 3] = Math.round(step * 150);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
