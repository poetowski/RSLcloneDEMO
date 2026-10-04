// Pixel particles: snow, embers, sparks, dust. Each particle is a 1-2px
// square drawn at integer coordinates in the low-res buffer.

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** remaining life in ms (Infinity for ambient particles) */
  life: number;
  max: number;
  size: number;
  color: string;
  /** colors to step through as life runs out */
  fade?: string[];
  gravity: number;
  drag: number;
  sway: number;
  phase: number;
  additive?: boolean;
}

export class Particles {
  list: Particle[] = [];

  add(p: Partial<Particle> & { x: number; y: number }): Particle {
    const full: Particle = {
      vx: 0,
      vy: 0,
      life: 600,
      max: p.life ?? 600,
      size: 1,
      color: '#ffffff',
      gravity: 0,
      drag: 0,
      sway: 0,
      phase: Math.random() * Math.PI * 2,
      ...p,
    };
    this.list.push(full);
    return full;
  }

  burst(x: number, y: number, n: number, colors: string[], opts: { speed?: number; up?: number; gravity?: number; life?: number; size?: number; additive?: boolean } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed ?? 60) * (0.4 + Math.random() * 0.6);
      this.add({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.up ?? 0),
        life: (opts.life ?? 500) * (0.6 + Math.random() * 0.4),
        size: opts.size ?? (Math.random() < 0.3 ? 2 : 1),
        color: colors[0],
        fade: colors,
        gravity: opts.gravity ?? 120,
        drag: 1.5,
        additive: opts.additive,
      });
    }
  }

  update(dt: number) {
    const s = dt / 1000;
    for (const p of this.list) {
      p.life -= dt;
      p.vy += p.gravity * s;
      if (p.drag) {
        p.vx *= Math.max(0, 1 - p.drag * s);
        p.vy *= Math.max(0, 1 - p.drag * s * 0.5);
      }
      p.phase += s * 2;
      p.x += (p.vx + Math.sin(p.phase) * p.sway) * s;
      p.y += p.vy * s;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, filter?: (p: Particle) => boolean) {
    for (const p of this.list) {
      if (filter && !filter(p)) continue;
      let c = p.color;
      if (p.fade && isFinite(p.life)) {
        const k = 1 - p.life / p.max;
        c = p.fade[Math.min(p.fade.length - 1, Math.floor(k * p.fade.length))];
      }
      ctx.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
