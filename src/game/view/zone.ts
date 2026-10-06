// Renders a combat background: backdrop, pre-baked tile layers, props driven
// by their kind (static, looping, pulsing, burning), the ambience of the zone
// (falling snow, blowing sand or drifting star-dust with shooting stars,
// circling birds, heat haze), light pools, a mood tint and the vignette. Everything zone-specific comes from the zone's
// JSON (art) and ZoneDef (behaviour), so a new zone needs no code here.
import { Particles } from '../../engine/particles';
import { H, W } from '../../engine/screen';
import { ZoneDef } from '../data/types';
import { Assets, blit, Rect4, ZoneArt, ZoneJson } from './assets';

interface Bird {
  cx: number;
  cy: number;
  r: number;
  ry: number;
  a: number;
  speed: number;
}

export class ZoneView {
  private tilesLayer: HTMLCanvasElement;
  private light: HTMLCanvasElement;
  private vignette: HTMLCanvasElement;
  private t = 0;
  readonly ambient = new Particles();
  readonly embers = new Particles();
  /** shooting stars cross the sky behind the architecture */
  private sky = new Particles();
  private starT = 1500;
  readonly json: ZoneJson;
  private art: ZoneArt;
  private birds: Bird[] = [];
  private gust = 0;
  private gustT = 4000;

  constructor(
    a: Assets,
    readonly def: ZoneDef,
  ) {
    this.art = a.zones[def.id];
    this.json = this.art.json;
    this.tilesLayer = this.bakeTiles();
    this.light = makeGlow(64, 40, def.glow);
    this.vignette = makeVignette();
    const n = def.ambient === 'snow' ? 90 : 70;
    for (let i = 0; i < n; i++) this.spawnAmbient(Math.random() * W, Math.random() * H);
    for (let i = 0; i < (def.birds ?? 0); i++) {
      this.birds.push({ cx: 380 + Math.random() * 200, cy: 22 + Math.random() * 26, r: 30 + Math.random() * 40, ry: 6 + Math.random() * 6, a: Math.random() * Math.PI * 2, speed: (0.00025 + Math.random() * 0.0002) * (i % 2 ? 1 : -1) });
    }
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
          g.drawImage(this.art.tiles, (t % z.atlasCols) * T, Math.floor(t / z.atlasCols) * T, T, T, col * T, r * T, T, T);
        }
      }
    }
    return c;
  }

  private spawnAmbient(x = -4, y = -4) {
    if (this.def.ambient === 'motes') {
      // star-dust: glowing motes rising slowly through the air, kindling and fading as they go
      const respawn = x < 0;
      const life = 5000 + Math.random() * 6000;
      const hue = Math.random();
      const fade = hue < 0.6 ? ['#0e5a5a', '#18908a', '#36d0c0', '#90f5e2', '#36d0c0', '#18908a'] : hue < 0.85 ? ['#5a3a10', '#c08a28', '#ffd070', '#fff0a8', '#ffd070', '#c08a28'] : ['#4a1040', '#b02a8c', '#ff9ad8', '#ffe8f6', '#ff9ad8', '#b02a8c'];
      this.ambient.add({
        x: respawn ? Math.random() * W : x,
        y: respawn ? 120 + Math.random() * (H - 110) : y,
        vx: (Math.random() - 0.5) * 5,
        vy: -(3 + Math.random() * 7),
        life,
        max: life,
        size: Math.random() < 0.18 ? 2 : 1,
        color: fade[0],
        fade,
        sway: 4 + Math.random() * 6,
        additive: true,
      });
      return;
    }
    if (this.def.ambient === 'snow') {
      const near = Math.random() < 0.35;
      this.ambient.add({
        x: x < 0 ? Math.random() * (W + 40) - 20 : x,
        y,
        vx: -4 - Math.random() * 6,
        vy: near ? 22 + Math.random() * 14 : 9 + Math.random() * 7,
        life: Infinity,
        size: near ? 2 : 1,
        color: near ? '#f2f8ff' : '#9fb4d8',
        sway: near ? 10 : 5,
      });
    } else {
      // blowing sand: low grains racing along the floor, a few motes high in the air
      const low = Math.random() < 0.7;
      this.ambient.add({
        x: x < 0 ? -6 - Math.random() * 40 : x,
        y: low ? 190 + Math.random() * 170 : 40 + Math.random() * 150,
        vx: low ? 70 + Math.random() * 60 : 30 + Math.random() * 25,
        vy: (Math.random() - 0.5) * 6,
        life: Infinity,
        size: Math.random() < 0.25 ? 2 : 1,
        color: ['#f2c274', '#e0a252', '#fde4aa', '#c47e3c'][Math.floor(Math.random() * 4)],
        sway: low ? 4 : 8,
      });
    }
  }

  frame(kind: string, i: number): Rect4 {
    return this.json.propFrames[`${kind}/${i}`];
  }

  update(dt: number) {
    this.t += dt;
    const amb = this.ambient;
    const speedUp = this.def.ambient === 'sand' && this.gust > 0 ? 2.2 : 1;
    amb.update(dt * speedUp);
    for (const p of amb.list) if (p.y > H + 4 || p.y < -6 || p.x > W + 8 || p.x < -60) p.life = 0;
    const target = this.def.ambient === 'snow' ? 90 : this.def.ambient === 'motes' ? 46 : this.gust > 0 ? 150 : 70;
    while (amb.list.length < target) this.spawnAmbient();
    if (this.def.ambient === 'sand') {
      // every few seconds a gust sweeps a veil of sand across the arena
      this.gustT -= dt;
      if (this.gustT <= 0) {
        this.gust = 1400;
        this.gustT = 6000 + Math.random() * 5000;
      }
      this.gust = Math.max(0, this.gust - dt);
    }
    if (this.def.ambient === 'motes') {
      // now and then a shooting star streaks down across the sky
      this.sky.update(dt);
      this.starT -= dt;
      if (this.starT <= 0) {
        this.starT = 3500 + Math.random() * 6000;
        const x0 = 140 + Math.random() * 460, y0 = 6 + Math.random() * 30;
        const vx = -(150 + Math.random() * 90), vy = 55 + Math.random() * 35;
        const len = Math.hypot(vx, vy);
        for (let k = 0; k < 7; k++) {
          this.sky.add({
            x: x0 - (vx / len) * k * 1.6, y: y0 - (vy / len) * k * 1.6, vx, vy,
            life: 520 - k * 30, color: '#ffffff', fade: k < 2 ? ['#ffffff', '#e8fff8', '#90f5e2'] : ['#90f5e2', '#36d0c0', '#18908a'],
            additive: true,
          });
        }
      }
    }
    this.embers.update(dt);
    const em = this.def.embers ?? ['#ffd060', '#fff0b0', '#ffb84a', '#f2731e', '#c8361a'];
    for (const p of this.json.props) {
      const k = this.json.kinds[p.kind];
      if (k?.fire && Math.random() < dt / 140) {
        this.embers.add({
          x: p.x - 3 + Math.random() * 6, y: p.y + k.fire.dy - 4,
          vx: (Math.random() - 0.5) * 8 + (this.def.ambient === 'sand' ? 6 : 0), vy: -18 - Math.random() * 14,
          life: 900 + Math.random() * 700, color: em[0], fade: em.slice(1),
          sway: 6, additive: true,
        });
      }
    }
    for (const b of this.birds) b.a += b.speed * dt;
  }

  private drawProp(ctx: CanvasRenderingContext2D, p: ZoneJson['props'][number]) {
    const k = this.json.kinds[p.kind];
    if (!k) return;
    const img = this.art.props;
    const place = (r: Rect4) => [p.x - r[2] * k.anchor[0], p.y - r[3] * k.anchor[1]] as const;
    if (k.mode === 'loop') {
      const f = Math.floor(this.t / (k.ms ?? 150) + p.x * 0.01) % k.frames;
      const r = this.frame(p.kind, f);
      blit(ctx, img, r, ...place(r));
    } else if (k.mode === 'pulse') {
      const dim = this.frame(p.kind, 0), bright = this.frame(p.kind, 1);
      blit(ctx, img, dim, ...place(dim));
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(this.t / 700);
      blit(ctx, img, bright, ...place(bright));
      ctx.globalAlpha = 1;
    } else {
      const r = this.frame(p.kind, 0);
      blit(ctx, img, r, ...place(r));
    }
  }

  /** Everything behind the units. */
  drawBack(ctx: CanvasRenderingContext2D) {
    const bd = this.art.backdrop;
    ctx.drawImage(bd, 0, 0);
    this.sky.draw(ctx);
    if (this.def.haze) {
      // heat shimmer: the rows around the horizon wobble a pixel side to side
      const h0 = this.json.horizon - 26, h1 = Math.min(bd.height, this.json.horizon + 14);
      for (let y = h0; y < h1; y++) {
        const off = Math.round(Math.sin(this.t / 260 + y * 0.9) * (y > this.json.horizon - 8 ? 1.2 : 0.7));
        if (off) ctx.drawImage(bd, 0, y, W, 1, off, y, W, 1);
      }
    }
    if (this.birds.length && this.json.kinds.bird) {
      for (const b of this.birds) {
        const x = b.cx + Math.cos(b.a) * b.r, y = b.cy + Math.sin(b.a) * b.ry;
        const f = this.frame('bird', Math.floor(this.t / 140 + b.cx) % this.json.kinds.bird.frames);
        const left = Math.sin(b.a) * b.speed > 0;
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (left) ctx.scale(-1, 1);
        ctx.drawImage(this.art.props, f[0], f[1], f[2], f[3], -Math.round(f[2] / 2), -Math.round(f[3] / 2), f[2], f[3]);
        ctx.restore();
      }
    }
    ctx.drawImage(this.tilesLayer, 0, 0);
    for (const layer of ['back', 'floor'] as const) for (const p of this.json.props) if (p.layer === layer) this.drawProp(ctx, p);
  }

  /** Fire is drawn after the units so flames glow over nearby shapes. */
  drawFire(ctx: CanvasRenderingContext2D) {
    const img = this.art.props;
    const flame = this.json.kinds.flame;
    for (const p of this.json.props) {
      const k = this.json.kinds[p.kind];
      if (!k?.fire || !flame) continue;
      const f = Math.floor(this.t / (flame.ms ?? 90) + p.x) % flame.frames;
      const r = this.frame('flame', f);
      blit(ctx, img, r, p.x - r[2] / 2, p.y + k.fire.dy - r[3] + 8);
    }
    this.embers.draw(ctx);
  }

  drawFront(ctx: CanvasRenderingContext2D) {
    for (const p of this.json.props) if (p.layer === 'fg') this.drawProp(ctx, p);
    this.ambient.draw(ctx);
    if (this.def.ambient === 'sand' && this.gust > 0) {
      // the gust itself: a low dithered veil that sweeps across and fades
      const k = Math.sin((this.gust / 1400) * Math.PI);
      ctx.globalAlpha = 0.18 * k;
      ctx.fillStyle = '#e0a252';
      for (let y = 200; y < H; y += 2) ctx.fillRect(0, y + (Math.floor(this.t / 60) % 2), W, 1);
      ctx.globalAlpha = 1;
    }
  }

  drawLighting(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.json.props) {
      const k = this.json.kinds[p.kind];
      if (!k?.fire) continue;
      const flick = 0.75 + 0.12 * Math.sin(this.t / 70 + p.x) + 0.08 * Math.sin(this.t / 31);
      ctx.globalAlpha = flick * 0.55;
      ctx.drawImage(this.light, p.x - this.light.width / 2, p.y + k.fire.dy - this.light.height / 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const tint = this.def.tint;
    if (tint) {
      ctx.globalCompositeOperation = tint.op;
      ctx.globalAlpha = tint.alpha;
      ctx.fillStyle = tint.color;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
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
