// One-shot effect sprites, projectiles and floating combat text.
import { Clock } from '../../engine/clock';
import { Particles } from '../../engine/particles';
import { TextStyle } from '../../engine/font';
import { Assets } from './assets';

export type FxLayerId = 'ground' | 'world' | 'top';

interface FxInst {
  name: string;
  x: number;
  y: number;
  /** depth for sorting with units in the world layer */
  z: number;
  frame: number;
  t: number;
  layer: FxLayerId;
  flip: boolean;
  additive: boolean;
  loops: number;
  done: () => void;
}

interface Projectile {
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  arc: number;
  rotate: boolean;
  trail?: string[];
  done: () => void;
  frame: number;
  ft: number;
}

interface FloatText {
  key: string;
  text: string;
  x: number;
  y: number;
  t: number;
  delay: number;
  dur: number;
  rise: number;
  style: TextStyle;
}

export class FxLayer {
  private list: FxInst[] = [];
  private projs: Projectile[] = [];
  private texts: FloatText[] = [];
  readonly particles = new Particles();
  private textSlots = new Map<string, number>();

  constructor(
    private a: Assets,
    private clock: Clock,
  ) {}

  /** Plays an effect once; resolves when it finishes. */
  spawn(name: string, x: number, y: number, opts: { layer?: FxLayerId; z?: number; flip?: boolean; additive?: boolean; loops?: number } = {}): Promise<void> {
    if (!this.a.fx.json.anims[name]) return Promise.resolve();
    return new Promise((done) =>
      this.list.push({
        name, x, y, z: opts.z ?? y, frame: 0, t: 0,
        layer: opts.layer ?? 'world', flip: !!opts.flip, additive: !!opts.additive, loops: opts.loops ?? 1, done,
      }),
    );
  }

  projectile(name: string, from: { x: number; y: number }, to: { x: number; y: number }, opts: { speed?: number; arc?: number; rotate?: boolean; trail?: string[] } = {}): Promise<void> {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const dur = Math.max(120, (dist / (opts.speed ?? 520)) * 1000);
    return new Promise((done) =>
      this.projs.push({ name, x0: from.x, y0: from.y, x1: to.x, y1: to.y, t: 0, dur, arc: opts.arc ?? 0, rotate: opts.rotate ?? true, trail: opts.trail, done, frame: 0, ft: 0 }),
    );
  }

  /** Floating combat text; texts on the same unit stack upward instead of overlapping. */
  text(key: string, x: number, y: number, text: string, style: TextStyle, opts: { delay?: number; dur?: number; rise?: number } = {}) {
    const now = this.clock.now;
    const last = this.textSlots.get(key) ?? -1e9;
    const delay = Math.max(opts.delay ?? 0, last + 90 - now);
    this.textSlots.set(key, now + delay);
    // lift above texts of the same unit that are still young
    const live = this.texts.filter((t) => t.key === key && t.t - t.delay < 520);
    const lift = live.length * 10 * (style.variant === 'display' || (style.scale ?? 1) > 1 ? 1.6 : 1);
    this.texts.push({ key, text, x, y: y - lift, t: 0, delay, dur: opts.dur ?? 1050, rise: opts.rise ?? 14, style });
  }

  update(dt: number) {
    const fx = this.a.fx.json.anims;
    for (const f of [...this.list]) {
      const an = fx[f.name];
      f.t += dt;
      while (f.t >= an.ms) {
        f.t -= an.ms;
        f.frame++;
        if (f.frame >= an.frames.length) {
          if (an.loop && --f.loops > 0) f.frame = 0;
          else {
            this.list.splice(this.list.indexOf(f), 1);
            f.done();
            break;
          }
        }
      }
    }
    for (const p of [...this.projs]) {
      p.t += dt;
      p.ft += dt;
      const an = fx[p.name];
      if (an && p.ft > an.ms) {
        p.ft = 0;
        p.frame = (p.frame + 1) % an.frames.length;
      }
      if (p.trail) {
        const pos = this.projPos(p);
        if (Math.random() < 0.8) this.particles.add({ x: pos.x, y: pos.y, life: 260, color: p.trail[0], fade: p.trail, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 });
      }
      if (p.t >= p.dur) {
        this.projs.splice(this.projs.indexOf(p), 1);
        p.done();
      }
    }
    for (const t of [...this.texts]) {
      t.t += dt;
      if (t.t > t.delay + t.dur) this.texts.splice(this.texts.indexOf(t), 1);
    }
    this.particles.update(dt);
  }

  private projPos(p: Projectile) {
    const k = Math.min(1, p.t / p.dur);
    return { x: p.x0 + (p.x1 - p.x0) * k, y: p.y0 + (p.y1 - p.y0) * k - Math.sin(k * Math.PI) * p.arc, k };
  }

  /** World-layer items with depth for interleaving with units. */
  worldItems(): { z: number; draw: (ctx: CanvasRenderingContext2D) => void }[] {
    return this.list.filter((f) => f.layer === 'world').map((f) => ({ z: f.z, draw: (ctx: CanvasRenderingContext2D) => this.drawOne(ctx, f) }));
  }

  drawLayer(ctx: CanvasRenderingContext2D, layer: FxLayerId) {
    for (const f of this.list) if (f.layer === layer) this.drawOne(ctx, f);
    if (layer === 'top') {
      this.particles.draw(ctx);
      for (const p of this.projs) this.drawProj(ctx, p);
    }
  }

  private drawOne(ctx: CanvasRenderingContext2D, f: FxInst) {
    const an = this.a.fx.json.anims[f.name];
    const r = an.frames[Math.min(f.frame, an.frames.length - 1)];
    const ox = f.flip ? an.w - r[4] - r[2] : r[4];
    const x = Math.round(f.x - (f.flip ? an.w * (1 - an.ax) : an.w * an.ax) + ox);
    const y = Math.round(f.y - an.h * an.ay + r[5]);
    if (f.additive) ctx.globalCompositeOperation = 'lighter';
    if (f.flip) {
      ctx.save();
      ctx.translate(x + r[2], y);
      ctx.scale(-1, 1);
      ctx.drawImage(this.a.fx.img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
      ctx.restore();
    } else ctx.drawImage(this.a.fx.img, r[0], r[1], r[2], r[3], x, y, r[2], r[3]);
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawProj(ctx: CanvasRenderingContext2D, p: Projectile) {
    const an = this.a.fx.json.anims[p.name];
    if (!an) return;
    const r = an.frames[p.frame % an.frames.length];
    const pos = this.projPos(p);
    const k2 = Math.min(1, (p.t + 16) / p.dur);
    const nx = p.x0 + (p.x1 - p.x0) * k2, ny = p.y0 + (p.y1 - p.y0) * k2 - Math.sin(k2 * Math.PI) * p.arc;
    const ang = p.rotate ? Math.atan2(ny - pos.y, nx - pos.x) : 0;
    ctx.save();
    ctx.translate(Math.round(pos.x), Math.round(pos.y));
    ctx.rotate(ang);
    ctx.drawImage(this.a.fx.img, r[0], r[1], r[2], r[3], Math.round(-an.w * an.ax + r[4]), Math.round(-an.h * an.ay + r[5]), r[2], r[3]);
    ctx.restore();
  }

  drawTexts(ctx: CanvasRenderingContext2D) {
    const font = this.a.font;
    for (const t of this.texts) {
      const tt = t.t - t.delay;
      if (tt < 0) continue;
      const k = Math.min(1, tt / 380);
      const rise = (1 - Math.pow(1 - k, 3)) * t.rise;
      const pop = tt < 90 ? 1 + (1 - tt / 90) * 0.0 : 1;
      const fade = tt > t.dur - 300 ? Math.max(0, (t.dur - tt) / 300) : 1;
      ctx.globalAlpha = fade;
      font.draw(ctx, t.text, t.x, t.y - rise, { ...t.style, scale: (t.style.scale ?? 1) * pop, align: 'center' });
      ctx.globalAlpha = 1;
    }
  }
}
