// Game-time clock. Everything that animates (tweens, waits, sprite frames)
// runs on this clock, so speed x2 and pause affect the whole battle at once.

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inQuad: (t: number) => t * t,
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

interface Tween {
  obj: Record<string, number>;
  from: Record<string, number>;
  to: Record<string, number>;
  start: number;
  dur: number;
  ease: Ease;
  done: () => void;
}

export class Clock {
  /** game time in ms */
  now = 0;
  speed = 1;
  paused = false;
  private stop = 0;
  private waits: { at: number; res: () => void }[] = [];
  private tweens: Tween[] = [];
  private tickers = new Set<(dt: number) => void>();

  /** Advances by real elapsed ms; returns the game-time delta. */
  update(realMs: number): number {
    if (this.paused) return 0;
    let dt = Math.min(realMs, 100) * this.speed;
    // hit-stop: time crawls for a few frames on heavy impacts
    if (this.stop > 0) {
      this.stop -= Math.min(realMs, 100);
      dt *= 0.06;
    }
    this.now += dt;
    for (const t of [...this.tweens]) {
      const k = Math.min(1, (this.now - t.start) / t.dur);
      const e = t.ease(k);
      for (const key in t.to) t.obj[key] = t.from[key] + (t.to[key] - t.from[key]) * e;
      if (k >= 1) {
        this.tweens.splice(this.tweens.indexOf(t), 1);
        t.done();
      }
    }
    if (this.waits.length) {
      const due = this.waits.filter((w) => w.at <= this.now);
      this.waits = this.waits.filter((w) => w.at > this.now);
      for (const w of due) w.res();
    }
    for (const f of this.tickers) f(dt);
    return dt;
  }

  wait(ms: number): Promise<void> {
    return new Promise((res) => this.waits.push({ at: this.now + ms, res }));
  }

  hitStop(realMs: number) {
    this.stop = Math.max(this.stop, realMs);
  }

  tween<T extends object>(obj: T, to: Partial<Record<keyof T, number>>, ms: number, e: Ease = ease.outQuad): Promise<void> {
    const o = obj as unknown as Record<string, number>;
    const from: Record<string, number> = {};
    for (const k in to) from[k] = o[k];
    // a new tween on the same keys replaces the old one
    for (const t of [...this.tweens]) if (t.obj === o && Object.keys(to).some((k) => k in t.to)) this.tweens.splice(this.tweens.indexOf(t), 1);
    return new Promise((done) => this.tweens.push({ obj: o, from, to: to as Record<string, number>, start: this.now, dur: Math.max(1, ms), ease: e, done }));
  }

  onTick(f: (dt: number) => void): () => void {
    this.tickers.add(f);
    return () => this.tickers.delete(f);
  }
}
