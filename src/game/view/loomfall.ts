// Renders the main menu's diorama, Loomfall (tools/art/loomfall.ts): the dusk
// sky with the broken Loom, the town and its places, and everything that moves
// there, calmly and each on its own pace (Jakub's calm-motion rule): the first
// stars twinkling, light running down the Loom's threads now and then, a
// flight of birds crossing the glow now and then, smoke from the chimneys, the
// mill's wheel and water, the cloth and the banners stirring, the Clocktower's
// works turning and its hands keeping your own time, torches and braziers
// flickering, lit windows breathing, fireflies over the square, souls drifting
// in to the Wishing Star, which shines brighter while a summon waits. The Arena
// across the lake stays dark under its seal while Extra Combat is shut. The menu
// stands the champions between `drawBack` and `drawFront`, and asks `placeAt`
// which place the pointer is on: a place is hit on its own pixels (or the ring
// of light round them), never on its bounding box.
import { Particles } from '../../engine/particles';
import { H, W } from '../../engine/screen';
import { Assets, blit, MenuJson, MenuPlace, MenuSprite, Rect4 } from './assets';

/** A light running down one of the Loom's threads now and then. */
interface Pulse {
  path: [number, number][];
  /** ms for one run, ms between runs, where in the cycle it starts */
  run: number;
  every: number;
  offset: number;
}

/** A flight of birds crossing the sky: where its lead is, how fast it goes, each bird's place behind the lead and its wingbeat. */
interface Flight {
  x: number;
  y: number;
  vx: number;
  birds: { dx: number; dy: number; phase: number }[];
}

const SMOKE = ['#6a6078', '#7c7288', '#8e8496', '#a096a6', '#8e8496', '#6a6078'];
const FLY = ['#2a3010', '#7a8a2a', '#d8e870', '#fffbb0', '#d8e870', '#7a8a2a', '#2a3010'];

export class LoomfallView {
  readonly json: MenuJson;
  private t = 0;
  private smoke = new Particles();
  private smokeT: number[];
  private flies = new Particles();
  private pulses: Pulse[];
  private flight: Flight | null = null;
  private flightT = 9000 + Math.random() * 12000;
  /** the scene atlas's alpha, for hitting places on their own pixels */
  private alpha: Uint8ClampedArray | null = null;
  private glows = new Map<string, HTMLCanvasElement>();
  private vignette: HTMLCanvasElement;
  /** souls drifting in to the Wishing Star: where each set out, how long it has drifted, its whole way, how far it bows aside */
  private souls: { x0: number; y0: number; t: number; life: number; sway: number }[] = [];
  private soulT = 1200;
  /** a summon waits: the Wishing Star shines brighter and calls more often */
  wishLit = false;
  /** Extra Combat is open: the Arena lit, its seal gone */
  extraOpen = false;

  constructor(private a: Assets) {
    this.json = a.menu.json;
    this.pulses = this.json.warp.map((path, i) => ({ path, run: 4200 + ((i * 977) % 2600), every: 8000 + ((i * 1733) % 9000), offset: (i * 2311) % 12000 }));
    this.smokeT = this.json.smokes.map((_, i) => i * 300);
    for (let i = 0; i < 12; i++) this.spawnFly(true);
    for (let i = 0; i < 18; i++) this.json.smokes.forEach(([x, y], k) => this.spawnSmoke(x, y, k, Math.random()));
    this.vignette = makeVignette();
    this.alpha = sceneAlpha(a.menu.scene);
  }

  /** Whether a sprite shows now: the Arena's seal while Extra Combat is shut, its lights once it is open. */
  private shows(key: string): boolean {
    return this.extraOpen ? !this.json.shut.includes(key) : !this.json.open.includes(key);
  }

  // ---------------------------------------------------------------------------
  // motion

  /** A puff from a chimney: it rises slowly, leaning east on the wind, and thins. `along` puts it somewhere in its life already. */
  private spawnSmoke(x: number, y: number, k: number, along = 0) {
    const life = 5200 + Math.random() * 2600;
    const p = this.smoke.add({ x: x + (Math.random() - 0.5) * 2, y, vx: 2.4 + Math.random() * 1.6, vy: -(5 + Math.random() * 2.5), life, max: life, size: Math.random() < 0.5 ? 2 : 1, color: SMOKE[0], fade: SMOKE, sway: 1.5 + k });
    if (along) {
      const dt = along * life;
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
      p.life = life - dt;
    }
  }

  /** A firefly over the square or the lake's shore, wandering and glowing on and off. */
  private spawnFly(anywhere = false) {
    const life = 4000 + Math.random() * 4000;
    const shore = Math.random() < 0.3;
    this.flies.add({
      x: shore ? 440 + Math.random() * 160 : 60 + Math.random() * 520,
      y: shore ? 202 + Math.random() * 12 : 244 + Math.random() * 84,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 3,
      life: anywhere ? Math.random() * life : life,
      max: life,
      size: 1,
      color: FLY[0],
      fade: FLY,
      sway: 4 + Math.random() * 4,
      additive: true,
    });
  }

  update(dt: number) {
    this.t += dt;
    this.smoke.update(dt);
    this.json.smokes.forEach(([x, y], k) => {
      this.smokeT[k] -= dt;
      while (this.smokeT[k] <= 0) {
        this.smokeT[k] += 380 + Math.random() * 300;
        this.spawnSmoke(x, y, k);
      }
    });
    this.flies.update(dt);
    while (this.flies.list.length < 14) this.spawnFly();
    // now and then a soul drifts in to the Wishing Star from somewhere round it
    this.soulT -= dt * (this.wishLit ? 1.7 : 1);
    if (this.soulT <= 0) {
      this.soulT = 1700 + Math.random() * 2300;
      const ang = Math.random() * Math.PI * 2, d = 40 + Math.random() * 30;
      const [wx, wy] = this.json.wish;
      this.souls.push({ x0: wx + Math.cos(ang) * d, y0: wy + Math.sin(ang) * d * 0.6, t: 0, life: 3800 + Math.random() * 1800, sway: (Math.random() - 0.5) * 18 });
    }
    for (const s of this.souls) s.t += dt;
    this.souls = this.souls.filter((s) => s.t < s.life);
    // a flight of birds over the glow, now and then: slow, and rare
    if (this.flight) {
      this.flight.x += (this.flight.vx * dt) / 1000;
      if (this.flight.x > W + 60) this.flight = null;
    } else if ((this.flightT -= dt) <= 0) {
      this.flightT = 26000 + Math.random() * 30000;
      const n = 4 + Math.floor(Math.random() * 4);
      this.flight = {
        x: -30,
        y: 92 + Math.random() * 46,
        vx: 15 + Math.random() * 6,
        birds: [...Array(n)].map((_, i) => ({ dx: -i * (7 + Math.random() * 3), dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 4 + (Math.random() - 0.5) * 2, phase: Math.random() * 600 })),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // drawing

  private drawSprite(ctx: CanvasRenderingContext2D, key: string) {
    const s = this.json.sprites[key];
    const img = this.a.menu.scene;
    if (s.mode === 'pulse') {
      // one slow breath every `ms`, each glow on its own phase; the Wishing Star's brighter while a summon waits
      const lit = key === 'wish_glow' || key === 'well_glow' ? (this.wishLit ? 1.3 : 0.8) : 1;
      ctx.globalAlpha = Math.min(1, lit * (0.3 + 0.45 * (0.5 + 0.5 * Math.sin((this.t / (s.ms ?? 4400)) * Math.PI * 2 + s.x * 0.05))));
      blit(ctx, img, s.frames[0], s.x, s.y);
      ctx.globalAlpha = 1;
    } else if (s.mode === 'loop') {
      blit(ctx, img, s.frames[Math.floor(this.t / (s.ms ?? 150)) % s.frames.length], s.x, s.y);
    } else blit(ctx, img, s.frames[0], s.x, s.y);
  }

  private drawLayer(ctx: CanvasRenderingContext2D, layer: MenuSprite['layer']) {
    for (const key of this.json.order) if (this.json.sprites[key].layer === layer && this.shows(key)) this.drawSprite(ctx, key);
  }

  /** Everything behind the champions: the sky and its motion, the Arena, the square, the town's places; `hover` rings one place in light. */
  drawBack(ctx: CanvasRenderingContext2D, hover: MenuPlace | null) {
    const j = this.json;
    const s = this.t / 1000;
    ctx.drawImage(this.a.menu.sky, 0, 0);
    // the first stars twinkle, each at its own pace
    ctx.globalCompositeOperation = 'lighter';
    j.twinkles.forEach(([x, y, size], i) => {
      const k = Math.max(0, Math.sin(s * (0.3 + (i % 7) * 0.08) + i * 1.7));
      if (k < 0.2) return;
      ctx.globalAlpha = k * 0.65;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 1, 1);
      if (size > 1 && k > 0.65) {
        ctx.globalAlpha = (k - 0.65) * 0.9;
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    });
    // light running down the Loom's threads, now and then
    ctx.fillStyle = '#fff6dc';
    for (const p of this.pulses) {
      const u = ((this.t + p.offset) % (p.run + p.every)) / p.run;
      if (u > 1 || p.path.length < 2) continue;
      const n = p.path.length - 1;
      for (let k = 0; k < 4; k++) {
        const v = u - k * 0.025;
        if (v < 0) continue;
        const f = v * n, i0 = Math.floor(f), i1 = Math.min(n, i0 + 1), w = f - i0;
        const x = p.path[i0][0] + (p.path[i1][0] - p.path[i0][0]) * w, y = p.path[i0][1] + (p.path[i1][1] - p.path[i0][1]) * w;
        ctx.globalAlpha = (1 - k * 0.3) * Math.min(1, (1 - u) * 4, u * 8);
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.drawFlight(ctx);
    this.drawLayer(ctx, 'far');
    this.drawLayer(ctx, 'ground');
    this.drawLayer(ctx, 'building');
    this.drawClock(ctx);
    this.smoke.draw(ctx);
    this.lights(ctx);
    this.drawSouls(ctx);
    if (hover && !this.inFront(hover)) this.drawOutline(ctx, hover);
  }

  /** The birds against the glow: dark ticks, their wings beating slowly. */
  private drawFlight(ctx: CanvasRenderingContext2D) {
    const f = this.flight;
    if (!f) return;
    ctx.fillStyle = '#1c1828';
    for (const b of f.birds) {
      const x = Math.round(f.x + b.dx), y = Math.round(f.y + b.dy + Math.sin((this.t + b.phase) / 900) * 1.5);
      const up = Math.floor((this.t + b.phase) / 260) % 2 === 0;
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x - 1, y + (up ? -1 : 0), 1, 1);
      ctx.fillRect(x + 1, y + (up ? -1 : 0), 1, 1);
      if (up) {
        ctx.fillRect(x - 2, y - 1, 1, 1);
        ctx.fillRect(x + 2, y - 1, 1, 1);
      }
    }
  }

  /** The Clocktower's hands at the hour where you are. */
  private drawClock(ctx: CanvasRenderingContext2D) {
    const { cx, cy, r } = this.json.clock;
    const now = new Date();
    const min = now.getMinutes() + now.getSeconds() / 60, hr = (now.getHours() % 12) + min / 60;
    const hand = (turns: number, len: number, color: string) => {
      const a = turns * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = color;
      for (let d = 0; d <= len; d += 0.5) ctx.fillRect(Math.round(cx + 0.5 + Math.cos(a) * d - 0.5), Math.round(cy + 0.5 + Math.sin(a) * d - 0.5), 1, 1);
    };
    hand(hr / 12, r * 0.5, '#2a2230');
    hand(min / 60, r * 0.8, '#2a2230');
    ctx.fillStyle = '#efc04a';
    ctx.fillRect(Math.round(cx), Math.round(cy), 1, 1);
  }

  /** The souls on their way in to the Wishing Star: each kindles as it sets out, bows aside a little, and fades into the star. */
  private drawSouls(ctx: CanvasRenderingContext2D) {
    const [wx, wy] = this.json.wish;
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.souls) {
      const u = s.t / s.life;
      const e = u * u * (3 - 2 * u);
      const x = Math.round(s.x0 + (wx - s.x0) * e + Math.sin(u * Math.PI) * s.sway), y = Math.round(s.y0 + (wy - s.y0) * e);
      const k = Math.min(1, u * 5) * Math.min(1, (1 - u) * 8);
      ctx.globalAlpha = k * 0.9;
      ctx.fillStyle = '#f4eeff';
      ctx.fillRect(x, y, 1, 1);
      ctx.globalAlpha = k * 0.4;
      ctx.fillStyle = '#b6a8e6';
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Whether a place stands in front of the champions (the wagon, the Herald's Board): its ring of light is drawn with the front. */
  inFront(id: MenuPlace): boolean {
    const h = this.json.hotspots.find((x) => x.id === id);
    return !!h && this.json.sprites[h.sprites[0]].layer === 'front';
  }

  /** In front of the champions: the wagon and the Herald's Board, the fireflies, the vignette. */
  drawFront(ctx: CanvasRenderingContext2D, hover: MenuPlace | null) {
    this.drawLayer(ctx, 'front');
    if (hover && this.inFront(hover)) this.drawOutline(ctx, hover);
    this.flies.draw(ctx);
    ctx.drawImage(this.vignette, 0, 0);
  }

  /** Pools of light that breathe (the art's `lights`): windows, braziers, torches, lanterns, the star; one tied to a sprite only while it shows. */
  private lights(ctx: CanvasRenderingContext2D) {
    const s = this.t / 1000;
    ctx.globalCompositeOperation = 'lighter';
    for (const l of this.json.lights) {
      if (l.when && !this.shows(l.when)) continue;
      const key = `${l.rx}|${l.ry}|${l.rgb.join(',')}`;
      let c = this.glows.get(key);
      if (!c) this.glows.set(key, (c = makeGlow(l.rx, l.ry, l.rgb)));
      const lit = l.x === this.json.wish[0] && l.y === this.json.wish[1] ? (this.wishLit ? 1.3 : 0.75) : 1;
      ctx.globalAlpha = Math.min(1, lit * l.k * (0.75 + 0.25 * Math.sin(s * l.rate + l.x)));
      ctx.drawImage(c, Math.round(l.x - l.rx), Math.round(l.y - l.ry));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** The ring of light round a place, breathing. */
  private drawOutline(ctx: CanvasRenderingContext2D, id: MenuPlace) {
    const h = this.json.hotspots.find((x) => x.id === id);
    if (!h) return;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.t / 260);
    blit(ctx, this.a.menu.scene, h.outline, h.ox, h.oy);
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
    const front = (h: MenuJson['hotspots'][number]) => (this.json.sprites[h.sprites[0]].layer === 'front' ? 1 : 0);
    const hs = [...this.json.hotspots].sort((p, q) => front(q) - front(p));
    for (const h of hs) {
      if (this.solid(h.outline, Math.floor(x - h.ox), Math.floor(y - h.oy))) return h.id;
      for (const key of h.sprites) {
        const s = this.json.sprites[key];
        const f = s.mode === 'loop' ? Math.floor(this.t / (s.ms ?? 150)) % s.frames.length : 0;
        if (this.solid(s.frames[f], Math.floor(x - s.x), Math.floor(y - s.y))) return h.id;
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

/** The corners sink into the dusk, in four dithered steps. */
function makeVignette(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2), dy = (y - H * 0.5) / (H * 0.62);
      const d = Math.max(0, Math.hypot(dx, dy) - 0.8) / 0.55;
      if (d <= 0) continue;
      const step = Math.floor(Math.min(1, d) * 4 + bayer[(y & 3) * 4 + (x & 3)] / 16) / 4;
      const i = (y * W + x) * 4;
      img.data[i] = 6;
      img.data[i + 1] = 4;
      img.data[i + 2] = 14;
      img.data[i + 3] = Math.round(step * 120);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
