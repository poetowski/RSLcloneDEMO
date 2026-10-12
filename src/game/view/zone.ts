// Renders a combat background: backdrop, the far layer (sky pieces and distant
// scenery behind the tiles, some of them bobbing), spark emitters, pre-baked
// tile layers, props driven by their kind (static, looping, pulsing, burning),
// the ambience of the zone (falling snow, blowing sand, drifting star-dust with
// shooting stars, or autumn leaves tumbling in the wind; circling birds, heat
// haze, now and then a flash of strange light across the sky), light pools, a
// mood tint and the vignette. Everything zone-specific
// comes from the zone's JSON (art) and ZoneDef (behaviour), so a new zone
// needs no code here.
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
  /** sparks shed by the zone's emitters (a rift's lips), drawn with the far layer */
  private sparks = new Particles();
  private sparkT: number[] = [];
  readonly json: ZoneJson;
  private art: ZoneArt;
  private birds: Bird[] = [];
  private gust = 0;
  private gustT = 4000;
  /** the sky's rare flash: its mask, one tinted copy per colour, the time to the next one, how far into one we are (-1: none) */
  private flashMask?: HTMLCanvasElement;
  private flashTints = new Map<string, HTMLCanvasElement>();
  private flashT = 0;
  private flashAge = -1;
  private flashColors: [string, string] = ['', ''];
  /** ?skyflash=1 brings the flash every few seconds (previews and screenshots) */
  private flashPreview = typeof location !== 'undefined' && new URLSearchParams(location.search).get('skyflash') === '1';

  constructor(
    a: Assets,
    readonly def: ZoneDef,
  ) {
    this.art = a.zones[def.id];
    this.json = this.art.json;
    this.tilesLayer = this.bakeTiles();
    this.light = makeGlow(64, 40, def.glow);
    this.vignette = makeVignette();
    const n = def.ambient === 'snow' ? 90 : def.ambient === 'leaves' ? 34 : 70;
    for (let i = 0; i < n; i++) this.spawnAmbient(Math.random() * W, Math.random() * H);
    this.sparkT = (this.json.sparks ?? []).map(() => 0);
    for (let i = 0; i < (def.birds ?? 0); i++) {
      const at = def.birdsAt?.[i % def.birdsAt.length];
      this.birds.push(
        at
          ? // a few birds wheeling slowly over one spot
            { cx: at[0] + (Math.random() - 0.5) * 36, cy: at[1] + (Math.random() - 0.5) * 12, r: 12 + Math.random() * 16, ry: 3 + Math.random() * 4, a: Math.random() * Math.PI * 2, speed: (0.00016 + Math.random() * 0.0001) * (i % 2 ? 1 : -1) }
          : { cx: 380 + Math.random() * 200, cy: 22 + Math.random() * 26, r: 30 + Math.random() * 40, ry: 6 + Math.random() * 6, a: Math.random() * Math.PI * 2, speed: (0.00025 + Math.random() * 0.0002) * (i % 2 ? 1 : -1) },
      );
    }
    if (def.flash) {
      this.flashMask = makeFlashMask(def.flash.at, this.json.horizon);
      this.flashT = this.nextFlash() * (this.flashPreview ? 0.4 : 1);
    }
  }

  private nextFlash(): number {
    const f = this.def.flash!;
    const [lo, hi] = this.flashPreview ? [2500, 4000] : f.every;
    return lo + Math.random() * (hi - lo);
  }

  /** The flash mask filled with one colour (cached). */
  private flashTint(color: string): HTMLCanvasElement {
    let c = this.flashTints.get(color);
    if (!c) {
      const m = this.flashMask!;
      c = document.createElement('canvas');
      c.width = m.width;
      c.height = m.height;
      const g = c.getContext('2d')!;
      g.drawImage(m, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
      this.flashTints.set(color, c);
    }
    return c;
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
    if (this.def.ambient === 'leaves') {
      // autumn leaves tumbling across in the wind from the left, a few close to the camera
      const respawn = x < 0;
      const near = Math.random() < 0.3;
      const tone = Math.floor(Math.random() * 4);
      const [c, alt] = [['#c8682a', '#8a3a16'], ['#d89a3a', '#9a6420'], ['#a8441c', '#6a2410'], ['#b88a40', '#7a5428']][tone];
      const fromLeft = respawn && Math.random() < 0.55;
      this.ambient.add({
        x: respawn ? (fromLeft ? -4 : Math.random() * W) : x,
        y: respawn ? (fromLeft ? Math.random() * H * 0.8 : -4) : y,
        vx: near ? 30 + Math.random() * 20 : 16 + Math.random() * 16,
        vy: near ? 16 + Math.random() * 10 : 8 + Math.random() * 8,
        life: Infinity,
        size: near ? 2 : 1,
        w: near ? 3 : 2,
        h: near ? 2 : 1,
        color: c,
        alt,
        spin: 2 + Math.random() * 3,
        sway: near ? 18 : 10,
      });
      return;
    }
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
    const target = this.def.ambient === 'snow' ? 90 : this.def.ambient === 'motes' ? 46 : this.def.ambient === 'leaves' ? 34 : this.gust > 0 ? 150 : 70;
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
    // sparks crackle off the emitters' lines, drift away and twinkle out
    this.sparks.update(dt);
    (this.json.sparks ?? []).forEach((e, i) => {
      this.sparkT[i] -= dt;
      while (this.sparkT[i] <= 0) {
        this.sparkT[i] += e.every * (0.5 + Math.random());
        const seg = Math.floor(Math.random() * (e.path.length - 1));
        const [x0, y0] = e.path[seg], [x1, y1] = e.path[seg + 1];
        const k = Math.random();
        const a = Math.random() * Math.PI * 2, sp = e.speed * (0.4 + Math.random() * 0.8);
        const life = e.life ? e.life[0] + Math.random() * (e.life[1] - e.life[0]) : 500 + Math.random() * 1100;
        this.sparks.add({
          x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life, max: life, size: Math.random() < 0.2 ? 2 : 1,
          color: e.colors[0], fade: e.colors, drag: 0.6, sway: 3, additive: true,
        });
      }
    });
    this.embers.update(dt);
    const em = this.def.embers ?? ['#ffd060', '#fff0b0', '#ffb84a', '#f2731e', '#c8361a'];
    for (const p of this.json.props) {
      const k = this.json.kinds[p.kind];
      if (k?.fire && Math.random() < dt / 180) {
        // embers drift up slowly and wander rather than shoot out
        this.embers.add({
          x: p.x - 3 + Math.random() * 6, y: p.y + k.fire.dy - 4,
          vx: (Math.random() - 0.5) * 6 + (this.def.ambient === 'sand' ? 6 : 0), vy: -10 - Math.random() * 9,
          life: 1300 + Math.random() * 1000, color: em[0], fade: em.slice(1),
          sway: 5, additive: true,
        });
      }
    }
    for (const b of this.birds) b.a += b.speed * dt;
    const f = this.def.flash;
    if (f) {
      if (this.flashAge >= 0) {
        this.flashAge += dt;
        if (this.flashAge > f.ms) this.flashAge = -1;
      } else if ((this.flashT -= dt) <= 0) {
        const pick = () => f.colors[Math.floor(Math.random() * f.colors.length)];
        const a = pick();
        let b = pick();
        for (let k = 0; k < 4 && b === a && f.colors.length > 1; k++) b = pick();
        this.flashColors = [a, b];
        this.flashAge = 0;
        this.flashT = this.nextFlash();
      }
    }
  }

  /**
   * The sky's flash, behind the islands and everything else in the sky: it
   * swells, stutters once and fades, its colour turning from one to the other.
   */
  private drawFlash(ctx: CanvasRenderingContext2D) {
    const f = this.def.flash;
    if (!f || this.flashAge < 0 || !this.flashMask) return;
    const u = this.flashAge / f.ms;
    const env = u < 0.08 ? u / 0.08 : u < 0.15 ? 1 - ((u - 0.08) / 0.07) * 0.5 : u < 0.22 ? 0.5 + ((u - 0.15) / 0.07) * 0.45 : 0.95 * Math.pow(1 - (u - 0.22) / 0.78, 1.7);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = env * (1 - u);
    ctx.drawImage(this.flashTint(this.flashColors[0]), 0, 0);
    ctx.globalAlpha = env * u;
    ctx.drawImage(this.flashTint(this.flashColors[1]), 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawProp(ctx: CanvasRenderingContext2D, p: ZoneJson['props'][number]) {
    const k = this.json.kinds[p.kind];
    if (!k) return;
    const img = this.art.props;
    // a bobbing prop drifts a pixel or two up and down, each on its own phase
    const bob = k.bob ? Math.round(Math.sin((this.t / k.bob.ms) * Math.PI * 2 + p.x * 0.05) * k.bob.amp) : 0;
    const place = (r: Rect4) => [p.x - r[2] * k.anchor[0], p.y + bob - r[3] * k.anchor[1]] as const;
    if (k.mode === 'loop') {
      // each placement runs on its own phase (props left of the screen edge included)
      const f = ((Math.floor(this.t / (k.ms ?? 150) + p.x * 0.01) % k.frames) + k.frames) % k.frames;
      const r = this.frame(p.kind, f);
      blit(ctx, img, r, ...place(r));
    } else if (k.mode === 'pulse') {
      const dim = this.frame(p.kind, 0), bright = this.frame(p.kind, 1);
      blit(ctx, img, dim, ...place(dim));
      // one slow breath every `ms` (4.4 s unless the kind sets its own)
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin((this.t / (k.ms ?? 4400)) * Math.PI * 2);
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
    this.drawFlash(ctx);
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
        const f = this.frame('bird', Math.floor(this.t / (this.json.kinds.bird.ms ?? 140) + b.cx) % this.json.kinds.bird.frames);
        const left = Math.sin(b.a) * b.speed > 0;
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (left) ctx.scale(-1, 1);
        ctx.drawImage(this.art.props, f[0], f[1], f[2], f[3], -Math.round(f[2] / 2), -Math.round(f[3] / 2), f[2], f[3]);
        ctx.restore();
      }
    }
    for (const p of this.json.props) if (p.layer === 'far') this.drawProp(ctx, p);
    this.sparks.draw(ctx);
    ctx.drawImage(this.tilesLayer, 0, 0);
    for (const layer of ['back', 'floor'] as const) for (const p of this.json.props) if (p.layer === layer) this.drawProp(ctx, p);
  }

  /** Fire is drawn after the units so flames glow over nearby shapes. */
  drawFire(ctx: CanvasRenderingContext2D) {
    const img = this.art.props;
    const flame = this.json.kinds.flame;
    for (const p of this.json.props) {
      const k = this.json.kinds[p.kind];
      if (!k?.fire || k.fire.flame === false || !flame) continue;
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
      // the firelight breathes slowly; a quick flicker made the fire look busy (Jakub, 2026-10-12)
      const flick = 0.78 + 0.1 * Math.sin(this.t / 330 + p.x) + 0.05 * Math.sin(this.t / 190);
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

/**
 * Where the sky's flash shows and how strongly: everything above the horizon,
 * brightest round `at` and fading outward and down to the land, in six
 * dithered bands so it reads as pixel art. White; tinted per flash.
 */
function makeFlashMask(at: [number, number], horizon: number): HTMLCanvasElement {
  const h = horizon + 12;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = h;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, h);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < h; y++) {
    const down = Math.min(1, Math.max(0, (horizon + 10 - y) / 46));
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - at[0]) / 1.15, (y - at[1]) * 1.6) / 560;
      const k = Math.pow(Math.max(0, 1 - d), 1.3) * (0.35 + 0.65 * down) * down;
      const step = Math.floor(k * 6 + bayer[(y & 3) * 4 + (x & 3)] / 16) / 6;
      if (step <= 0) continue;
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(step * 175);
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
