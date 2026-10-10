// Main menu: the logo over a living diorama of the campaign frontier — your
// last team on the left, the next stage's enemies waiting on the right.
import { H, W } from '../../engine/screen';
import { App } from '../app';
import { anyFresh, cleared, frontier, isUnlocked } from '../archivist';
import { stage, STARTERS, zoneOf } from '../data/campaign';
import { CHAMPIONS } from '../data/champions';
import { CHAPTERS } from '../data/codex';
import { COLORS } from '../ui/ui';
import { BaseScreen, Diorama } from './base';

export class MainMenu extends BaseScreen {
  private diorama: Diorama;

  constructor(app: App) {
    super(app);
    const next = stage(frontier(this.archivist));
    this.diorama = new Diorama(app, zoneOf(next.id));
    // the formation steps out to the sides so the menu column stays clear
    const left: [number, number][] = [[156, 262], [96, 226], [84, 302]];
    const team = (this.archivist.team.length ? this.archivist.team : STARTERS).filter((id) => isUnlocked(this.archivist, id)).slice(0, 3);
    team.forEach((id, i) => this.diorama.figures.push({ id, x: left[i][0], y: left[i][1], facing: 'R', phase: i * 333 }));
    next.enemies.forEach((e, i) => this.diorama.figures.push({ id: e.champion, x: W - left[i][0], y: left[i][1], facing: 'L', phase: i * 251 + 100 }));
    this.ui.focusId = 'm_campaign';
  }

  protected update(dt: number) {
    this.diorama.update(dt);
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    this.diorama.draw(ctx, this.t, 0.4);
    const ui = this.ui;
    // logo with a slow shine sweeping across, the subtitle between two dividers
    const logo = ui.part('logo');
    const lx = Math.round(W / 2 - logo[2] / 2), ly = 12;
    ui.blit(ctx, 'logo', lx, ly);
    const sweep = (this.t / 9) % (logo[2] + 400) - 40;
    if (sweep < logo[2]) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(lx + sweep, ly, 10, logo[3]);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ui.blit(ctx, 'logo', lx, ly);
      ctx.restore();
    }
    const sub = 'RELIQUARY OF LEGENDS';
    const sy = ly + logo[3] + 3, sw = ui.measure(sub, 'display');
    ui.text(ctx, sub, W / 2, sy, { color: COLORS.gold, align: 'center', variant: 'display' });
    ui.divider(ctx, Math.round(W / 2 - sw / 2 - 52), sy + 6, 44);
    ui.divider(ctx, Math.round(W / 2 + sw / 2 + 8), sy + 6, 44);

    const fr = frontier(this.archivist);
    const owned = CHAMPIONS.filter((c) => isUnlocked(this.archivist, c.id)).length;
    const unread = CHAPTERS.filter((c) => !this.archivist.read.includes(c.id)).length;
    const bw = 172, bh = 26, bx = Math.round(W / 2 - bw / 2);
    let by = 112;
    const row = (id: string, label: string, icon: string, click: () => void, right?: string, badge?: boolean) => {
      ui.button(ctx, id, bx, by, bw, bh, label, { click, icon });
      if (right) ui.text(ctx, right, bx + bw - 10, by + 9, { color: COLORS.dim, align: 'right' });
      if (badge) ui.blit(ctx, 'new', bx + bw - 14, by - 4);
      by += bh + 6;
    };
    row('m_campaign', 'CAMPAIGN', 'mi_campaign', () => this.app.router.campaign(), cleared(this.archivist, fr) ? 'replay' : fr);
    row('m_champions', 'CHAMPIONS', 'mi_champions', () => this.app.router.collection(), `${owned}/${CHAMPIONS.length}`, anyFresh(this.archivist));
    row('m_academy', 'ACADEMY', 'mi_academy', () => this.app.router.academy(), unread ? `${unread} new` : undefined);
    row('m_options', 'OPTIONS', 'mi_options', () => this.app.router.options());
    ui.text(ctx, 'Mouse, or arrows + Enter.  Esc goes back.', W / 2, H - 14, { color: COLORS.faint, align: 'center' });
  }
}

