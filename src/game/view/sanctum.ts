// Renders the main menu's sanctum (tools/art/sanctum.ts): the sky with the
// Loom, the island and its places, and everything that moves there, calmly
// and each on its own pace (Jakub's calm-motion rule): stars twinkling, glints
// creeping round the Loom's gigantic rim, light running down its hanging
// threads, motes climbing the golden thread from the Weaver's Spire to the
// rim's break, star-dust rising off the island, spray where the waterfalls
// thin into the void, windows and the rose window breathing, pools of light,
// now and then a shooting star. The menu stands the champions between
// `drawBack` and `drawFront`, and asks `placeAt` which place the pointer is on:
// a place is hit on its own pixels (or the ring of light round them), never
// on its bounding box.
import { Particles } from '../../engine/particles';
import { H, W } from '../../engine/screen';
import { Assets, blit, MenuJson, MenuPlace, MenuSprite, Rect4 } from './assets';

/** A light running down one of the warp threads now and then. */
interface Pulse {
  path: [number, number][];
  /** ms for one run, ms between runs, where in the cycle it starts */
  run: number;
  every: number;
  offset: number;
}

export class SanctumView {
  readonly json: MenuJson;
  private t = 0;
  /** star-dust rising off the island */
  private dust = new Particles();
  /** spray where the waterfalls thin out */
  private spray = new Particles();
  private sprayT: number[] = [];
  /** shooting stars, rare */
  private sky = new Particles();
  private starT = 9000 + Math.random() * 9000;
  private pulses: Pulse[];
  /** the scene atlas's alpha, for hitting places on their own pixels */
  private alpha: Uint8ClampedArray | null = null;
  private glows = new Map<string, HTMLCanvasElement>();
  private vignette: HTMLCanvasElement;

  constructor(private a: Assets) {
    this.json = a.menu.json;
    this.pulses = this.json.warp.map((path, i) => ({ path, run: 3800 + ((i * 977) % 2600), every: 9000 + ((i * 1733) % 8000), offset: (i * 2311) % 12000 }));
    this.sprayT = this.json.falls.map(() => 0);
    for (let i = 0; i < 26; i++) this.spawnDust(true);
    this.vignette = makeVignette();
    this.alpha = sceneAlpha(a.menu.scene);
  }

  // ---------------------------------------------------------------------------
  // motion

  /** A mote of star-dust: born on the island's top, it rises slowly, kindling and fading. `anywhere` puts it somewhere in its life already. */
  private spawnDust(anywhere = false) {
    const life = 6000 + Math.random() * 7000;
    const hue = Math.random();
    const fade = hue < 0.55 ? ['#0e3a4a', '#1a6a80', '#4ab4cc', '#c8f4ff', '#4ab4cc', '#1a6a80'] : hue < 0.85 ? ['#3a2a10', '#a87a28', '#f0c650', '#fff0a8', '#f0c650', '#a87a28'] : ['#2a1440', '#6a3aa8', '#b48ae8', '#f0e4ff', '#b48ae8', '#6a3aa8'];
    this.dust.add({
      x: 70 + Math.random() * 520,
      y: anywhere ? 120 + Math.random() * 130 : 236 + Math.random() * 26,
      vx: (Math.random() - 0.5) * 4,
      vy: -(4 + Math.random() * 6),
      life: anywhere ? Math.random() * life : life,
      max: life,
      size: Math.random() < 0.15 ? 2 : 1,
      color: fade[0],
      fade,
      sway: 3 + Math.random() * 5,
      additive: true,
    });
  }

  update(dt: number) {
    this.t += dt;
    this.dust.update(dt);
    while (this.dust.list.length < 30) this.spawnDust();
    // spray: droplets breaking off where each fall thins, drifting down and fading
    this.spray.update(dt);
    this.json.falls.forEach(([x, y], i) => {
      this.sprayT[i] -= dt;
      while (this.sprayT[i] <= 0) {
        this.sprayT[i] += 70 + Math.random() * 90;
        const life = 900 + Math.random() * 900;
        this.spray.add({
          x: x + (i ? 5 : -5) + (Math.random() - 0.5) * 9, y: y + 42 + Math.random() * 46,
          vx: (Math.random() - 0.5) * 6, vy: 10 + Math.random() * 12,
          life, max: life, size: 1, color: '#e8f6ff', fade: ['#e8f6ff', '#acd0ee', '#76a2d0', '#4a74aa'], sway: 2,
        });
      }
    });
    // a shooting star now and then, rarely
    this.sky.update(dt);
    if ((this.starT -= dt) <= 0) {
      this.starT = 14000 + Math.random() * 18000;
      const x0 = 160 + Math.random() * 300, y0 = 8 + Math.random() * 40;
      const vx = -(150 + Math.random() * 80), vy = 50 + Math.random() * 30;
      const len = Math.hypot(vx, vy);
      for (let k = 0; k < 7; k++) {
        this.sky.add({ x: x0 - (vx / len) * k * 1.6, y: y0 - (vy / len) * k * 1.6, vx, vy, life: 520 - k * 30, color: '#ffffff', fade: k < 2 ? ['#ffffff', '#f2f6ff', '#c8d6ff'] : ['#c8d6ff', '#8a9ad8', '#4a5694'], additive: true });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // drawing

  private bobOf(s: MenuSprite): number {
    return s.bob ? Math.round(Math.sin((this.t / s.bob.ms + s.bob.phase) * Math.PI * 2) * s.bob.amp) : 0;
  }

  private drawSprite(ctx: CanvasRenderingContext2D, key: string) {
    const s = this.json.sprites[key];
    const img = this.a.menu.scene;
    const y = s.y + this.bobOf(s);
    if (s.mode === 'pulse') {
      // one slow breath every `ms`, each glow on its own phase
      ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin((this.t / (s.ms ?? 4400)) * Math.PI * 2 + s.x * 0.05));
      blit(ctx, img, s.frames[0], s.x, y);
      ctx.globalAlpha = 1;
    } else if (s.mode === 'loop') {
      const f = Math.floor(this.t / (s.ms ?? 150)) % s.frames.length;
      blit(ctx, img, s.frames[f], s.x, y);
    } else blit(ctx, img, s.frames[0], s.x, y);
  }

  private drawLayer(ctx: CanvasRenderingContext2D, layer: MenuSprite['layer']) {
    for (const key of this.json.order) if (this.json.sprites[key].layer === layer) this.drawSprite(ctx, key);
  }

  /** Everything behind the champions: the sky and its motion, the far rocks and fragments, the island, the places; `hover` rings one place in light. */
  drawBack(ctx: CanvasRenderingContext2D, hover: MenuPlace | null) {
    const j = this.json;
    const s = this.t / 1000;
    ctx.drawImage(this.a.menu.sky, 0, 0);
    // the stars twinkle, each at its own pace
    ctx.globalCompositeOperation = 'lighter';
    j.twinkles.forEach(([x, y, size], i) => {
      const k = Math.max(0, Math.sin(s * (0.35 + (i % 7) * 0.09) + i * 1.7));
      if (k < 0.15) return;
      ctx.globalAlpha = k * 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 1, 1);
      if (size > 1 && k > 0.6) {
        ctx.globalAlpha = (k - 0.6) * 0.9;
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    });
    // glints creeping round the Loom's rim: gigantic, so a turn takes minutes
    const rim = j.rings[0];
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + ((i / 9) * Math.PI * 2 + s * 0.012) % (Math.PI * 2);
      if (a > j.rimBreak[0] - 0.02 && a < j.rimBreak[1] + 0.02) continue;
      const c = Math.cos(rim.tilt), sn = Math.sin(rim.tilt);
      const ex = (rim.rx + rim.half * 0.6) * Math.cos(a), ey = (rim.ry + rim.half * 0.6) * Math.sin(a);
      const x = Math.round(rim.cx + ex * c - ey * sn), y = Math.round(rim.cy + ex * sn + ey * c);
      if (x < -2 || x > W + 2 || y < -2 || y > H + 2) continue;
      const k = 0.55 + 0.45 * Math.sin(s * 0.9 + i * 2.1);
      ctx.globalAlpha = k;
      ctx.fillStyle = '#fff6d8';
      ctx.fillRect(x, y, 1, 1);
      ctx.globalAlpha = k * 0.5;
      ctx.fillRect(x - 2, y, 5, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
    // light running down the hanging threads, now and then
    ctx.fillStyle = '#f0e8ff';
    for (const p of this.pulses) {
      const u = ((this.t + p.offset) % (p.run + p.every)) / p.run;
      if (u > 1) continue;
      const n = p.path.length - 1;
      for (let k = 0; k < 3; k++) {
        const v = u - k * 0.03;
        if (v < 0) continue;
        const f = v * n, i0 = Math.floor(f), i1 = Math.min(n, i0 + 1), w = f - i0;
        const x = p.path[i0][0] + (p.path[i1][0] - p.path[i0][0]) * w, y = p.path[i0][1] + (p.path[i1][1] - p.path[i0][1]) * w;
        ctx.globalAlpha = (1 - k * 0.35) * Math.min(1, (1 - u) * 4);
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    // motes climbing the golden thread to the break, each on its own phase
    const th = j.thread;
    for (let i = 0; i < 6; i++) {
      const u = ((s / 7.5 + i / 6) % 1);
      const f = u * (th.length - 1), i0 = Math.floor(f), i1 = Math.min(th.length - 1, i0 + 1), w = f - i0;
      const x = th[i0][0] + (th[i1][0] - th[i0][0]) * w, y = th[i0][1] + (th[i1][1] - th[i0][1]) * w;
      const k = Math.sin(u * Math.PI);
      ctx.globalAlpha = k;
      ctx.fillStyle = '#fffbe8';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      ctx.globalAlpha = k * 0.45;
      ctx.fillStyle = '#f0c650';
      ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
      ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.sky.draw(ctx);
    this.drawLayer(ctx, 'far');
    this.drawLayer(ctx, 'island');
    this.drawLayer(ctx, 'building');
    this.lights(ctx);
    if (hover) this.drawOutline(ctx, hover);
  }

  /** In front of the champions: the drifting astrolabe, the star-dust and spray, the vignette. */
  drawFront(ctx: CanvasRenderingContext2D, hover: MenuPlace | null) {
    this.drawLayer(ctx, 'front');
    if (hover === 'options') this.drawOutline(ctx, hover);
    this.spray.draw(ctx);
    this.dust.draw(ctx);
    ctx.drawImage(this.vignette, 0, 0);
  }

  /** Pools of light that breathe (the art's `lights`): the portal's violet, the rose window's blue, the spool's gold, the lanterns' warmth. */
  private lights(ctx: CanvasRenderingContext2D) {
    const s = this.t / 1000;
    ctx.globalCompositeOperation = 'lighter';
    for (const l of this.json.lights) {
      const key = `${l.rx}|${l.ry}|${l.rgb.join(',')}`;
      let c = this.glows.get(key);
      if (!c) this.glows.set(key, (c = makeGlow(l.rx, l.ry, l.rgb)));
      ctx.globalAlpha = l.k * (0.75 + 0.25 * Math.sin(s * l.rate + l.x));
      ctx.drawImage(c, Math.round(l.x - l.rx), Math.round(l.y - l.ry));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** The ring of light round a place, breathing. */
  private drawOutline(ctx: CanvasRenderingContext2D, id: MenuPlace) {
    const h = this.json.hotspots.find((x) => x.id === id);
    if (!h) return;
    const bob = this.bobOf(this.json.sprites[h.sprites[0]]);
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.t / 260);
    blit(ctx, this.a.menu.scene, h.outline, h.ox, h.oy + bob);
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // hitting

  /** Whether the atlas has a pixel at (x, y) inside `r`. */
  private solid(r: Rect4, lx: number, ly: number): boolean {
    if (lx < 0 || ly < 0 || lx >= r[2] || ly >= r[3]) return false;
    if (!this.alpha) return true;
    const w = this.a.menu.scene.width;
    return this.alpha[((r[1] + ly) * w + r[0] + lx) * 4 + 3] > 0;
  }

  /** The place under (x, y): on one of its sprites' pixels as drawn now, or on the ring of light round it; the front first. */
  placeAt(x: number, y: number): MenuPlace | null {
    const hs = [...this.json.hotspots].sort((p, q) => (this.json.sprites[q.sprites[0]].layer === 'front' ? 1 : 0) - (this.json.sprites[p.sprites[0]].layer === 'front' ? 1 : 0));
    for (const h of hs) {
      const bob = this.bobOf(this.json.sprites[h.sprites[0]]);
      if (this.solid(h.outline, Math.floor(x - h.ox), Math.floor(y - h.oy - bob))) return h.id;
      for (const key of h.sprites) {
        const s = this.json.sprites[key];
        const f = s.mode === 'loop' ? Math.floor(this.t / (s.ms ?? 150)) % s.frames.length : 0;
        if (this.solid(s.frames[f], Math.floor(x - s.x), Math.floor(y - s.y - this.bobOf(s)))) return h.id;
      }
    }
    return null;
  }

  /** A place's box on the screen (its outline's), for keyboard focus. */
  boxOf(id: MenuPlace): Rect4 {
    const h = this.json.hotspots.find((x) => x.id === id)!;
    return [h.ox, h.oy, h.outline[2], h.outline[3]];
  }
}

/** The scene atlas's pixels, read once (the menu opens again and again); null where the canvas will not give them up. */
const alphaCache = new WeakMap<HTMLImageElement, Uint8ClampedArray | null>();
function sceneAlpha(img: HTMLImageElement): Uint8ClampedArray | null {
  if (alphaCache.has(img)) return alphaCache.get(img)!;
  let data: Uint8ClampedArray | null = null;
  try {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    data = g.getImageData(0, 0, c.width, c.height).data;
  } catch {
    // without pixel access the places are hit on their boxes
  }
  alphaCache.set(img, data);
  return data;
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
      img.data[i + 3] = Math.round(k * k * 110);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** The corners sink into the dark, in four dithered steps. */
function makeVignette(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2), dy = (y - H * 0.5) / (H * 0.6);
      const d = Math.max(0, Math.hypot(dx, dy) - 0.72) / 0.6;
      if (d <= 0) continue;
      const step = Math.floor(Math.min(1, d) * 4 + bayer[(y & 3) * 4 + (x & 3)] / 16) / 4;
      const i = (y * W + x) * 4;
      img.data[i] = 3;
      img.data[i + 1] = 2;
      img.data[i + 2] = 10;
      img.data[i + 3] = Math.round(step * 140);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
