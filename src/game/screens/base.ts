// Shared plumbing for the menu screens: the UI kit, a frame clock, keyboard
// navigation, the standard header (back button, title, star counter) and a
// living diorama of a combat background to stand behind the menus.
import { H, W } from '../../engine/screen';
import { App, Screen } from '../app';
import { totalStars } from '../archivist';
import { allStages } from '../data/campaign';
import { zone } from '../data/zones';
import { COLORS, Ui } from '../ui/ui';
import { drawChampion, Facing, frameAt } from '../view/unit';
import { ZoneView } from '../view/zone';

export abstract class BaseScreen implements Screen {
  readonly ui: Ui;
  t = 0;
  private last = 0;

  constructor(protected app: App) {
    this.ui = new Ui(app.a);
  }

  get a() {
    return this.app.a;
  }

  get ctx() {
    return this.app.ctx;
  }

  get archivist() {
    return this.app.archivist;
  }

  frame(now: number) {
    const dt = this.last ? Math.min(100, now - this.last) : 16;
    this.last = now;
    this.t += dt;
    this.update(dt);
    this.ui.beginFrame();
    this.draw(this.ctx);
    this.ui.drawTooltip(this.ctx);
  }

  protected update(dt: number) {
    void dt;
  }

  protected abstract draw(ctx: CanvasRenderingContext2D): void;

  /** Escape / back button. */
  protected back() {}

  pointerMove(x: number, y: number) {
    return !!this.ui.pointer(x, y)?.click;
  }

  click(x: number, y: number) {
    if (this.app.busy) return;
    this.ui.pointer(x, y);
    this.ui.hit(x, y)?.click?.();
  }

  key(k: string) {
    if (this.app.busy) return;
    if (k === 'Escape' || k === 'Backspace') this.back();
    else if (k === 'Enter' || k === ' ') this.ui.activate();
    else if (k === 'ArrowUp') this.ui.navigate('up');
    else if (k === 'ArrowDown') this.ui.navigate('down');
    else if (k === 'ArrowLeft') this.ui.navigate('left');
    else if (k === 'ArrowRight') this.ui.navigate('right');
  }

  /** Top bar: back button, title, and the campaign star counter. */
  protected header(ctx: CanvasRenderingContext2D, title: string, sub?: string) {
    ctx.fillStyle = 'rgba(5,7,12,0.78)';
    ctx.fillRect(0, 0, W, 30);
    ctx.fillStyle = '#a8701e';
    ctx.fillRect(0, 30, W, 1);
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(0, 31, W, 1);
    this.ui.button(ctx, 'back', 6, 5, 64, 20, 'BACK', { click: () => this.back(), icon: 'mi_back', kind: 'small' });
    this.ui.text(ctx, title, 82, 7, { color: COLORS.goldHi, variant: 'bold', scale: 1 });
    if (sub) this.ui.text(ctx, sub, 82 + this.ui.measure(title, 'bold') + 10, 7, { color: COLORS.dim });
    const stars = `${totalStars(this.archivist)} / ${allStages().length * 3}`;
    const sw = this.ui.measure(stars);
    this.ui.blit(ctx, 'star_m', W - 18 - sw - 16, 8);
    this.ui.text(ctx, stars, W - 12 - sw, 10, { color: COLORS.text });
  }
}

export interface Figure {
  id: string;
  x: number;
  y: number;
  facing: Facing;
  anim?: string;
  /** desync idle loops */
  phase?: number;
  dim?: boolean;
}

/** A combat background kept alive behind a menu, optionally with champions standing in it. */
export class Diorama {
  readonly view: ZoneView;
  figures: Figure[] = [];
  private shadow: HTMLCanvasElement;

  constructor(
    private app: App,
    zoneId: string,
  ) {
    this.view = new ZoneView(app.a, zone(zoneId));
    this.shadow = document.createElement('canvas');
    this.shadow.width = 30;
    this.shadow.height = 8;
    const g = this.shadow.getContext('2d')!;
    g.fillStyle = 'rgba(6,8,20,0.45)';
    g.beginPath();
    g.ellipse(15, 4, 15, 4, 0, 0, Math.PI * 2);
    g.fill();
  }

  update(dt: number) {
    this.view.update(dt);
  }

  /** `under` draws on the floor beneath the figures (podiums, markers). */
  draw(ctx: CanvasRenderingContext2D, t: number, dim = 0.45, under?: (ctx: CanvasRenderingContext2D) => void) {
    const v = this.view;
    v.drawBack(ctx);
    under?.(ctx);
    const sh = v.def.shadow;
    for (const f of [...this.figures].sort((p, q) => p.y - q.y)) {
      const art = this.app.a.champions[f.id];
      ctx.drawImage(this.shadow, Math.round(f.x - 15 + sh.dx), Math.round(f.y - 4));
      drawChampion(ctx, art, f.anim ?? 'idle', frameAt(art, f.anim ?? 'idle', t + (f.phase ?? 0)), f.x, f.y, { facing: f.facing, alpha: f.dim ? 0.55 : 1 });
    }
    v.drawFire(ctx);
    v.drawFront(ctx);
    v.drawLighting(ctx);
    if (dim > 0) {
      ctx.fillStyle = `rgba(5,7,14,${dim})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}
