// Renders a combat background: backdrop, the far layer (sky pieces and distant
// scenery behind the tiles, some of them bobbing, clouds drifting across),
// spark emitters, pre-baked tile layers, props driven by their kind (static,
// looping, pulsing, burning), the ambience of the zone (falling snow, blowing
// sand, drifting star-dust with shooting stars, autumn leaves tumbling in the
// wind, pollen drifting in the sunlight, glowing spores drifting in their
// halos, feather-grass seeds sailing on the wind, or snow flurries blown in
// ahead of a storm; circling birds, butterflies, heat haze, now and then a flash of
// strange light across the sky or a shooting star), light pools, a mood tint
// and the vignette. Everything zone-specific
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

/** A butterfly wandering about its spot: slow loops, wings beating, now and then a glide. */
interface Butterfly {
  hx: number;
  hy: number;
  ax: number;
  ay: number;
  f: [number, number, number];
  p: [number, number, number];
  /** wingbeats a second */
  rate: number;
  wing: string;
  edge: string;
  x: number;
  y: number;
  frame: number;
}

/** Wing colours and their dark edges: a blue morpho, an orange, a yellow and a white. */
const BUTTERFLY_TONES: [string, string][] = [
  ['#46a6ff', '#163c8c'],
  ['#ff9a30', '#6e2e0e'],
  ['#ffdc4a', '#7a5a10'],
  ['#f6f2e6', '#7c786c'],
];

/** Wings open, half raised, closed: W wing, E its dark tips, B the body. */
const BUTTERFLY_FRAMES = [
  ['EWW.WWE', 'WWWBWWW', '.WWBWW.', '..W.W..'],
  ['..W.W..', '.WWBWW.', '..WBW..', '...B...'],
  ['...W...', '...W...', '...W...', '...B...'],
];

/**
 * A glowing dust-mote of the basin's flora (ambient 'spores'): it drifts and
 * wanders slowly, rising a little, in a soft halo that breathes, its pearl
 * hue turning from one tint to the next; it kindles when born and fades out.
 * Far ones are small and drawn behind the champions, near ones in front.
 */
interface Spore {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** wander: phases and rates (radians a second) of the side-to-side and up-and-down drift */
  p: [number, number];
  f: [number, number];
  /** the breath of its glow: phase and rate (breaths a second) */
  bp: number;
  br: number;
  /** where in the pearl tints it starts, and how fast it turns through them (tints a second) */
  hue: number;
  turn: number;
  near: boolean;
  age: number;
  life: number;
}

/** The pearl tints of the spores' halos (rose, ice, lilac, mint) and their bright cores. */
const SPORE_HALO = ['#ffcfe6', '#cfe2ff', '#ddd0ff', '#c8fff0'];
const SPORE_CORE = ['#fff2f8', '#f2f8ff', '#f6f0ff', '#effff9'];

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
  private butterflies: Butterfly[] = [];
  private spores: Spore[] = [];
  /** one soft halo per pearl tint, small (far spores) and large (near ones) */
  private sporeHalos: HTMLCanvasElement[][] = [];
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
    const n = def.ambient === 'snow' ? 90 : def.ambient === 'leaves' ? 34 : def.ambient === 'pollen' ? 22 : def.ambient === 'seeds' ? SEEDS : def.ambient === 'flurries' ? FLURRIES : def.ambient === 'spores' ? 0 : 70;
    for (let i = 0; i < n; i++) this.spawnAmbient(Math.random() * W, Math.random() * H);
    if (def.ambient === 'spores') {
      this.sporeHalos = SPORE_HALO.map((c) => [makeHalo(6, c), makeHalo(9, c)]);
      for (let i = 0; i < SPORES; i++) this.spawnSpore(true);
    }
    if (def.shootingStars) this.starT = def.shootingStars[0] * (0.3 + Math.random() * 0.7);
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
    (def.butterflies ?? []).forEach(([hx, hy], i) => {
      const [wing, edge] = BUTTERFLY_TONES[i % BUTTERFLY_TONES.length];
      const rnd = () => Math.random();
      this.butterflies.push({
        hx, hy, ax: 30 + rnd() * 18, ay: 9 + rnd() * 8,
        f: [0.3 + rnd() * 0.25, 0.4 + rnd() * 0.3, 0.9 + rnd() * 0.5],
        p: [rnd() * 6.3, rnd() * 6.3, rnd() * 6.3],
        rate: 3 + rnd() * 1.4, wing, edge, x: hx, y: hy, frame: 0,
      });
    });
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
    if (this.def.ambient === 'flurries') {
      // flurries blown in from the right ahead of the storm: flakes driven left and down, melting away as they go
      // (so they thin out toward the left), a few close to the camera
      const respawn = x < 0;
      const near = Math.random() < 0.22;
      const life = 6000 + Math.random() * 8000;
      this.ambient.add({
        x: respawn ? W + 4 : x,
        y: respawn ? -20 + Math.random() * 300 : y,
        vx: -(near ? 36 + Math.random() * 18 : 18 + Math.random() * 16),
        vy: near ? 13 + Math.random() * 8 : 6 + Math.random() * 7,
        life: respawn ? life : Math.random() * life,
        max: life,
        size: near ? 2 : 1,
        color: near ? '#f6f2ff' : '#d4cce8',
        fade: near ? ['#f6f2ff', '#f6f2ff', '#f6f2ff', '#e2dcf2'] : ['#d4cce8', '#d4cce8', '#bcb4d6', '#a49cc2'],
        sway: near ? 10 : 6,
      });
      return;
    }
    if (this.def.ambient === 'seeds') {
      // feather-grass seeds sailing across the steppe on the wind from the left: silky awns, a few close to the camera
      const respawn = x < 0;
      const near = Math.random() < 0.25;
      this.ambient.add({
        x: respawn ? -4 : x,
        y: respawn ? 40 + Math.random() * 310 : y,
        vx: near ? 26 + Math.random() * 14 : 11 + Math.random() * 12,
        vy: (Math.random() - 0.6) * 4,
        life: Infinity,
        w: near ? 3 : 2,
        h: 1,
        color: near ? '#fbf6e4' : Math.random() < 0.5 ? '#e8e0c6' : '#d8cfb0',
        sway: near ? 9 : 5,
      });
      return;
    }
    if (this.def.ambient === 'pollen') {
      // pollen and seed down drifting slowly through the sunlight
      const respawn = x < 0;
      this.ambient.add({
        x: respawn ? -2 : x,
        y: respawn ? 30 + Math.random() * 290 : y,
        vx: 2 + Math.random() * 4,
        vy: (Math.random() - 0.6) * 2,
        life: Infinity,
        size: 1,
        color: Math.random() < 0.35 ? '#fff6cc' : '#e4dca8',
        sway: 3 + Math.random() * 5,
      });
      return;
    }
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

  /**
   * A spore: most rise from the floor, from the moss and the flora round the
   * pools; some are born in the air. `anywhere` puts it somewhere in its life
   * already (the scene opens with motes drifting).
   */
  private spawnSpore(anywhere = false) {
    const fromFloor = Math.random() < 0.6;
    const life = 9000 + Math.random() * 9000;
    this.spores.push({
      x: Math.random() * W,
      y: fromFloor ? 210 + Math.random() * 140 : 90 + Math.random() * 200,
      vx: (Math.random() - 0.5) * 5,
      vy: -(1.5 + Math.random() * 3.5),
      p: [Math.random() * 6.3, Math.random() * 6.3],
      f: [0.25 + Math.random() * 0.3, 0.35 + Math.random() * 0.35],
      bp: Math.random() * 6.3,
      br: 0.3 + Math.random() * 0.4,
      hue: Math.random() * 4,
      turn: 0.06 + Math.random() * 0.08,
      near: Math.random() < 0.4,
      age: anywhere ? Math.random() * life : 0,
      life,
    });
  }

  /** Draws the far spores (behind the champions) or the near ones (in front). */
  private drawSpores(ctx: CanvasRenderingContext2D, near: boolean) {
    if (!this.spores.length) return;
    const s = this.t / 1000;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.spores) {
      if (p.near !== near) continue;
      // kindle over the first second and a half, fade over the last three
      const env = Math.min(1, p.age / 1500, (p.life - p.age) / 3000);
      if (env <= 0) continue;
      const breath = 0.6 + 0.4 * Math.sin(s * p.br * Math.PI * 2 + p.bp);
      const h = (p.hue + s * p.turn) % 4;
      const i0 = Math.floor(h), i1 = (i0 + 1) % 4, k = h - i0;
      const x = Math.round(p.x + Math.sin(s * p.f[0] + p.p[0]) * 7), y = Math.round(p.y + Math.sin(s * p.f[1] + p.p[1]) * 3);
      const a = env * breath * (near ? 0.95 : 0.75);
      // the halo crossfades from one pearl tint to the next
      for (const [i, w] of [[i0, 1 - k], [i1, k]] as const) {
        if (w <= 0.02) continue;
        const c = this.sporeHalos[i][near ? 1 : 0];
        ctx.globalAlpha = a * w;
        ctx.drawImage(c, x - (c.width >> 1), y - (c.height >> 1));
      }
      ctx.globalAlpha = env * (0.55 + 0.45 * breath);
      ctx.fillStyle = SPORE_CORE[k < 0.5 ? i0 : i1];
      ctx.fillRect(x, y, 1, 1);
      if (near && breath > 0.7) {
        ctx.globalAlpha *= 0.5;
        ctx.fillRect(x - 1, y, 1, 1);
        ctx.fillRect(x + 1, y, 1, 1);
        ctx.fillRect(x, y - 1, 1, 1);
        ctx.fillRect(x, y + 1, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** A shooting star streaking down across the sky, its head and tail fading through `fade`. */
  private shootingStar(fade: [string[], string[]]) {
    const x0 = 140 + Math.random() * 460, y0 = 6 + Math.random() * 30;
    const vx = -(150 + Math.random() * 90), vy = 55 + Math.random() * 35;
    const len = Math.hypot(vx, vy);
    for (let k = 0; k < 7; k++) {
      this.sky.add({
        x: x0 - (vx / len) * k * 1.6, y: y0 - (vy / len) * k * 1.6, vx, vy,
        life: 520 - k * 30, color: '#ffffff', fade: k < 2 ? fade[0] : fade[1],
        additive: true,
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
    // the spores are their own system (spawnSpore), not particles
    const target = this.def.ambient === 'snow' ? 90 : this.def.ambient === 'motes' ? 46 : this.def.ambient === 'leaves' ? 34 : this.def.ambient === 'pollen' ? 22 : this.def.ambient === 'seeds' ? SEEDS : this.def.ambient === 'flurries' ? FLURRIES : this.def.ambient === 'spores' ? 0 : this.gust > 0 ? 150 : 70;
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
    if (this.def.ambient === 'motes' || this.def.shootingStars) {
      // now and then a shooting star streaks down across the sky (rarely, unless the air is full of star-dust)
      this.sky.update(dt);
      this.starT -= dt;
      if (this.starT <= 0) {
        const [lo, hi] = this.def.shootingStars ?? [3500, 9500];
        this.starT = lo + Math.random() * (hi - lo);
        this.shootingStar(this.def.ambient === 'motes' ? [['#ffffff', '#e8fff8', '#90f5e2'], ['#90f5e2', '#36d0c0', '#18908a']] : [['#ffffff', '#f2f6ff', '#c8d6ff'], ['#c8d6ff', '#8a9ad8', '#4a5694']]);
      }
    }
    if (this.spores.length) {
      // the spores drift, wander and rise; one that has lived its life is born again elsewhere
      const k = dt / 1000;
      for (const p of this.spores) {
        p.age += dt;
        p.x += p.vx * k;
        p.y += p.vy * k;
        if (p.x < -12) p.x += W + 24;
        else if (p.x > W + 12) p.x -= W + 24;
      }
      this.spores = this.spores.filter((p) => p.age < p.life && p.y > 40);
      while (this.spores.length < SPORES) this.spawnSpore();
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
    // butterflies loop slowly about their spots, their wings beating, now and then gliding
    const s = this.t / 1000;
    for (const f of this.butterflies) {
      f.x = f.hx + Math.sin(s * f.f[0] + f.p[0]) * f.ax + Math.sin(s * f.f[2] + f.p[2]) * f.ax * 0.3;
      f.y = f.hy + Math.sin(s * f.f[1] + f.p[1]) * f.ay + Math.sin(s * f.rate * Math.PI * 2) * 0.7;
      const glide = Math.sin(s * 0.8 + f.p[1]) > 0.8;
      const beat = Math.sin(s * f.rate * Math.PI * 2 + f.p[0]);
      f.frame = glide || beat > 0.35 ? 0 : beat > -0.35 ? 1 : 2;
    }
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
    let px = p.x;
    if (k.drift) {
      // drifting across the sky, coming round again from the other side
      const w = this.frame(p.kind, 0)[2];
      const span = W + w;
      const left = p.x - w * k.anchor[0];
      px = ((((left + w + (this.t / 1000) * k.drift.speed) % span) + span) % span) - w + w * k.anchor[0];
    }
    const place = (r: Rect4) => [px - r[2] * k.anchor[0], p.y + bob - r[3] * k.anchor[1]] as const;
    if (k.roam) {
      // out along its row, a graze, back, a graze: each placement on its own phase, facing the way it walks
      const { span, speed, pause, walk } = k.roam;
      const leg = (span / speed) * 1000, cycle = 2 * (leg + pause);
      const t = (((this.t + p.x * 97) % cycle) + cycle) % cycle;
      const out = t < leg + pause;
      const u = out ? t : t - leg - pause;
      const walking = u < leg;
      const off = out ? (walking ? (u / leg) * span : span) : walking ? span - (u / leg) * span : 0;
      const step = Math.floor(this.t / (k.ms ?? 150));
      const r = this.frame(p.kind, walking ? step % walk : walk + (step % Math.max(1, k.frames - walk)));
      const [x, y] = place(r);
      if (out) blit(ctx, img, r, x + off, y);
      else {
        ctx.save();
        ctx.translate(Math.round(x + off) + r[2], Math.round(y));
        ctx.scale(-1, 1);
        ctx.drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
        ctx.restore();
      }
    } else if (k.mode === 'loop') {
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
    this.drawSpores(ctx, false);
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
    this.drawSpores(ctx, true);
    for (const f of this.butterflies) {
      const rows = BUTTERFLY_FRAMES[f.frame];
      const x0 = Math.round(f.x) - 3, y0 = Math.round(f.y) - 2;
      rows.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') return;
        ctx.fillStyle = ch === 'W' ? f.wing : ch === 'E' ? f.edge : '#1a1612';
        ctx.fillRect(x0 + x, y0 + y, 1, 1);
      }));
    }
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

/** How many spores drift in the air at once (ambient 'spores'). */
const SPORES = 30;
/** How many feather-grass seeds sail on the wind at once (ambient 'seeds'). */
const SEEDS = 24;
/** How many snowflakes blow in ahead of the storm at once (ambient 'flurries'). */
const FLURRIES = 44;

/** A spore's halo: a small soft disc of light, dithered into four bands so it reads as pixel art. */
function makeHalo(r: number, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = r * 2 + 1;
  const g = c.getContext('2d')!;
  const img = g.createImageData(c.width, c.height);
  const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const d = Math.hypot(x - r, y - r) / (r + 0.5);
      if (d >= 1) continue;
      const k = Math.floor((1 - d) * (1 - d) * 4 + bayer[(y & 3) * 4 + (x & 3)] / 16) / 4;
      if (k <= 0) continue;
      const i = (y * c.width + x) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = Math.round(k * 200);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
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
