// Visual state of one hero on the battlefield: sprite playback with hit and
// event callbacks, position (including jump height), flashes, displayed HP
// and the overlays that follow the unit (ice prison, stun stars).
import { StatusId, TeamId, HeroDef } from '../data/types';
import { Assets, HeroArt } from './assets';

export type Facing = 'R' | 'L';

interface Handlers {
  hit?: (k: number) => void;
  event?: (name: string) => void;
  done?: () => void;
}

export class UnitView {
  x: number;
  y: number;
  readonly homeX: number;
  readonly homeY: number;
  /** height above the ground (jumps); the shadow stays on the floor */
  h = 0;
  facing: Facing;
  readonly homeFacing: Facing;
  anim = 'idle';
  frame = 0;
  private t = 0;
  private loop = true;
  private hits = 0;
  private hd: Handlers = {};
  flash = 0;
  alpha = 1;
  shake = 0;
  dead = false;
  /** displayed values; they chase the battle state when events play */
  hp: number;
  lagHp: number;
  maxHp: number;
  shield = 0;
  tm = 0;
  statuses: { id: StatusId; turns: number }[] = [];
  /** ice block overlay frame (-1 = none) */
  ice = -1;
  private iceT = 0;
  private iceMode: 'form' | 'hold' | 'shatter' | 'none' = 'none';
  stunned = false;
  private stunT = 0;
  private readonly art: HeroArt;
  readonly spriteH: number;

  constructor(
    readonly uid: string,
    readonly hero: HeroDef,
    readonly team: TeamId,
    private a: Assets,
    x: number,
    y: number,
  ) {
    this.art = a.heroes[hero.id];
    this.x = this.homeX = x;
    this.y = this.homeY = y;
    this.facing = this.homeFacing = team === 'player' ? 'R' : 'L';
    this.hp = this.lagHp = this.maxHp = hero.stats.hp;
    const f = this.art.json.frames[`${this.facing}/idle/0`];
    this.spriteH = this.art.json.pivotY - f[5];
    // desync idle loops
    this.frame = Math.floor(Math.random() * this.art.json.anims.idle.ms.length);
  }

  hasAnim(name: string): boolean {
    return !!this.art.json.anims[name];
  }

  /** Plays an animation; resolves when a non-looping one ends (loops resolve at once). */
  play(name: string, opts: { loop?: boolean; hit?: (k: number) => void; event?: (e: string) => void } = {}): Promise<void> {
    const prev = this.hd.done;
    this.hd = {};
    prev?.();
    const a = this.art.json.anims[name];
    this.anim = name;
    this.frame = 0;
    this.t = 0;
    this.hits = 0;
    this.loop = opts.loop ?? a.loop;
    return new Promise((res) => {
      this.hd = { hit: opts.hit, event: opts.event, done: this.loop ? undefined : res };
      if (this.loop) res();
      this.enter(0);
    });
  }

  /** Time in ms from frame `from` until frame `to` begins. */
  timeBetween(anim: string, from: number, to: number): number {
    const ms = this.art.json.anims[anim].ms;
    let s = 0;
    for (let i = from; i < to; i++) s += ms[i];
    return s;
  }

  animInfo(anim: string) {
    return this.art.json.anims[anim];
  }

  private enter(i: number) {
    const a = this.art.json.anims[this.anim];
    if (a.hits.includes(i)) this.hd.hit?.(this.hits++);
    const ev = a.events[String(i)];
    if (ev) this.hd.event?.(ev);
  }

  update(dt: number) {
    const a = this.art.json.anims[this.anim];
    this.t += dt;
    let guard = 0;
    while (this.t >= a.ms[this.frame] && guard++ < 50) {
      this.t -= a.ms[this.frame];
      if (this.frame + 1 >= a.ms.length) {
        if (this.loop) {
          this.frame = 0;
          this.enter(0);
        } else {
          this.t = 0;
          const done = this.hd.done;
          this.hd = {};
          done?.();
          break;
        }
      } else {
        this.frame++;
        this.enter(this.frame);
      }
    }
    this.flash = Math.max(0, this.flash - dt / 140);
    this.shake = Math.max(0, this.shake - dt / 40);
    // HP lag bar drains after a short delay
    if (this.lagHp > this.hp) this.lagHp = Math.max(this.hp, this.lagHp - this.maxHp * (dt / 900));
    else this.lagHp = this.hp;
    // ice block overlay
    if (this.iceMode !== 'none') {
      this.iceT += dt;
      const fxa = this.a.fx.json.anims.ice_prison;
      if (this.iceT > fxa.ms) {
        this.iceT = 0;
        if (this.iceMode === 'form') {
          this.ice++;
          if (this.ice >= 5) this.iceMode = 'hold';
        } else if (this.iceMode === 'shatter') {
          this.ice++;
          if (this.ice > 7) {
            this.ice = -1;
            this.iceMode = 'none';
          }
        }
      }
    }
    if (this.stunned) this.stunT += dt;
  }

  setFrozen(on: boolean) {
    if (on && (this.iceMode === 'none' || this.iceMode === 'shatter')) {
      this.iceMode = 'form';
      this.ice = 0;
      this.iceT = 0;
    } else if (!on && (this.iceMode === 'hold' || this.iceMode === 'form')) {
      this.iceMode = 'shatter';
      this.ice = 6;
      this.iceT = 0;
    }
  }

  get frozenSolid(): boolean {
    return this.iceMode === 'hold' || this.iceMode === 'form';
  }

  /** Screen-space rect of the idle pose (stable click target). */
  bounds(): { x: number; y: number; w: number; h: number } {
    const f = this.art.json.frames[`${this.homeFacing}/idle/0`];
    return { x: this.x - this.art.json.pivotX + f[4], y: this.y - this.art.json.pivotY + f[5], w: f[2], h: f[3] };
  }

  /** Screen point of the chest, for impacts and projectiles. */
  chest(): { x: number; y: number } {
    return { x: this.x, y: this.y - this.h - this.spriteH * 0.55 };
  }

  head(): { x: number; y: number } {
    return { x: this.x, y: this.y - this.h - this.spriteH };
  }

  draw(ctx: CanvasRenderingContext2D) {
    const j = this.art.json;
    const f = j.frames[`${this.facing}/${this.anim}/${this.frame}`];
    if (!f) return;
    const sx = this.shake > 0 ? Math.round(Math.sin(this.shake * 9) * 2 * Math.min(1, this.shake)) : 0;
    const dx = Math.round(this.x - j.pivotX + f[4] + sx);
    const dy = Math.round(this.y - this.h - j.pivotY + f[5]);
    ctx.globalAlpha = this.alpha;
    ctx.drawImage(this.art.img, f[0], f[1], f[2], f[3], dx, dy, f[2], f[3]);
    if (this.flash > 0) {
      ctx.globalAlpha = this.alpha * Math.min(1, this.flash);
      ctx.drawImage(this.art.white, f[0], f[1], f[2], f[3], dx, dy, f[2], f[3]);
    }
    ctx.globalAlpha = 1;
  }

  /** Overlays that sit on top of the sprite. */
  drawOverlays(ctx: CanvasRenderingContext2D) {
    const fx = this.a.fx;
    if (this.ice >= 0) {
      const an = fx.json.anims.ice_prison;
      const r = an.frames[Math.min(this.ice, an.frames.length - 1)];
      const ox = this.x - an.w * an.ax + r[4], oy = this.y - an.h * an.ay + r[5];
      ctx.drawImage(fx.img, r[0], r[1], r[2], r[3], Math.round(ox), Math.round(oy), r[2], r[3]);
    }
    if (this.stunned && !this.dead) {
      const an = fx.json.anims.stun;
      const i = Math.floor(this.stunT / an.ms) % an.frames.length;
      const r = an.frames[i];
      const hd = this.head();
      ctx.drawImage(fx.img, r[0], r[1], r[2], r[3], Math.round(hd.x - an.w * an.ax + r[4]), Math.round(hd.y - 4 - an.h * an.ay + r[5]), r[2], r[3]);
    }
  }
}
