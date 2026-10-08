// Champion collection: every champion as a card. Recruited champions stand
// in their idle loop (hover: they show off their basic attack); locked ones
// are dark silhouettes with the stage that recruits them. The grid scrolls
// (wheel, PageUp/PageDown, Home/End, the edge chevrons, keyboard focus) once
// the roster outgrows the screen.
import { H, W } from '../../engine/screen';
import { App } from '../app';
import { frontier, isFresh, isUnlocked } from '../archivist';
import { locationOf, recruitStage } from '../data/campaign';
import { CHAMPIONS } from '../data/champions';
import { AFFINITIES, RARITIES } from '../data/meta';
import { Affinity, ChampionDef } from '../data/types';
import { Scroller } from '../ui/scroll';
import { COLORS } from '../ui/ui';
import { nine, Rect4 } from '../view/assets';
import { drawChampion, frameAt } from '../view/unit';
import { BaseScreen, Diorama } from './base';

const FILTERS: (Affinity | 'all')[] = ['all', 'force', 'wild', 'arcane', 'void'];

/** Card grid geometry and the window it scrolls in (below the filter tabs). */
const CW = 112, CH = 140, GAP = 8, COLS = 5;
const VIEW: Rect4 = [0, 54, W, H - 54];
/** room above the first row for the NEW badges, and below the last */
const PAD_TOP = 5, PAD_BOTTOM = 6;

export class CollectionScreen extends BaseScreen {
  private filter: Affinity | 'all' = 'all';
  private diorama: Diorama;
  private hoverSince = new Map<string, number>();
  private scroll = new Scroller();

  constructor(app: App) {
    super(app);
    this.diorama = new Diorama(app, locationOf(frontier(this.archivist)).zone);
    this.ui.focusId = 'card_' + CHAMPIONS[0].id;
  }

  protected back() {
    this.app.router.menu();
  }

  protected update(dt: number) {
    this.diorama.update(dt);
    this.scroll.update(dt);
  }

  wheel(dy: number) {
    this.scroll.by(Math.sign(dy) * Math.min(CH + GAP, Math.max(36, Math.abs(dy))));
  }

  key(k: string) {
    const page = VIEW[3] - 40;
    if (k === 'PageDown') this.scroll.by(page);
    else if (k === 'PageUp') this.scroll.by(-page);
    else if (k === 'Home') this.scroll.to(0);
    else if (k === 'End') this.scroll.to(this.scroll.max);
    else super.key(k);
  }

  private list(): ChampionDef[] {
    return CHAMPIONS.filter((c) => this.filter === 'all' || c.affinity === this.filter);
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    this.diorama.draw(ctx, this.t, 0.72);
    const owned = CHAMPIONS.filter((c) => isUnlocked(this.archivist, c.id)).length;
    this.header(ctx, 'CHAMPIONS', `${owned} / ${CHAMPIONS.length} recruited`);

    // affinity filter tabs
    let tx = 20;
    for (const f of FILTERS) {
      const label = f === 'all' ? 'ALL' : AFFINITIES[f].name.toUpperCase();
      const w = ui.measure(label) + (f === 'all' ? 16 : 28);
      const on = this.filter === f;
      const id = 'tab_' + f;
      const hot = ui.hot(id, tx, 36, w, 16);
      nine(ctx, this.a.ui.img, ui.part(on ? 'tab_on' : 'tab_off'), tx, 36, w, 16, 5);
      if (f !== 'all') ui.blit(ctx, 'gem_' + f, tx + 6, 39);
      ui.text(ctx, label, tx + (f === 'all' ? 8 : 20), 40, { color: on || hot ? COLORS.goldHi : COLORS.dim });
      ui.regions.push({
        id, x: tx, y: 36, w, h: 16, click: () => {
          this.filter = f;
          this.scroll.to(0);
        },
      });
      tx += w + 4;
    }

    const list = this.list();
    const rows = Math.ceil(list.length / COLS);
    const [vx, vy, vw, vh] = VIEW;
    this.scroll.extent(PAD_TOP + rows * (CH + GAP) - GAP + PAD_BOTTOM, vh);
    // keyboard focus pulls its card into view
    const focused = list.findIndex((c) => 'card_' + c.id === ui.focusId);
    if (ui.keyboard && focused >= 0) this.scroll.reveal(Math.floor(focused / COLS) * (CH + GAP), CH + PAD_TOP + PAD_BOTTOM, vh);

    const x0 = Math.round(W / 2 - (COLS * CW + (COLS - 1) * GAP) / 2), y0 = vy + PAD_TOP - this.scroll.offset;
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx, vy, vw, vh);
    ctx.clip();
    list.forEach((c, i) => {
      const x = x0 + (i % COLS) * (CW + GAP), y = y0 + Math.floor(i / COLS) * (CH + GAP);
      this.card(ctx, c, x, y, CW, CH, list);
    });
    ctx.restore();
    this.scrollHints(ctx);
  }

  /** Scrollbar on the right, and a fade with a chevron at each edge that has more cards beyond it. */
  private scrollHints(ctx: CanvasRenderingContext2D) {
    const sc = this.scroll;
    if (!sc.max) return;
    const ui = this.ui;
    const [, vy, , vh] = VIEW;
    const total = vh + sc.max;
    const th = Math.max(18, Math.round((vh - 8) * (vh / total)));
    const ty = vy + 4 + Math.round(((vh - 8 - th) * sc.offset) / sc.max);
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(W - 9, vy + 3, 5, vh - 6);
    ctx.fillStyle = '#1a2238';
    ctx.fillRect(W - 8, vy + 4, 3, vh - 8);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(W - 8, ty, 3, th);
    ctx.fillStyle = COLORS.goldHi;
    ctx.fillRect(W - 8, ty, 3, 1);
    const bob = Math.round(Math.sin(this.t / 220) * 1.5);
    const r = ui.part('chevron_gold');
    const step = CH + GAP;
    if (sc.after) {
      ui.bands(ctx, 0, H - 14, W - 10, 14, '#05070c', '#05070c', 1);
      ctx.globalAlpha = 0.55;
      ui.bands(ctx, 0, H - 26, W - 10, 12, '#05070c', '#05070c', 1);
      ctx.globalAlpha = 1;
      ctx.drawImage(this.a.ui.img, r[0], r[1], r[2], r[3], W / 2 - 5, H - 12 + bob, r[2], r[3]);
      ui.text(ctx, 'MORE', W / 2 - 12, H - 12, { color: COLORS.dim, align: 'right' });
      ui.regions.push({ x: W / 2 - 60, y: H - 26, w: 120, h: 26, click: () => sc.by(step) });
    }
    if (sc.before) {
      ctx.globalAlpha = 0.55;
      ui.bands(ctx, 0, vy, W - 10, 10, '#05070c', '#05070c', 1);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(W / 2 - 5, vy + 11 - bob);
      ctx.scale(1, -1);
      ctx.drawImage(this.a.ui.img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
      ctx.restore();
      ui.regions.push({ x: W / 2 - 60, y: vy, w: 120, h: 14, click: () => sc.by(-step) });
    }
  }

  private card(ctx: CanvasRenderingContext2D, c: ChampionDef, x: number, y: number, w: number, h: number, list: ChampionDef[]) {
    const ui = this.ui;
    const id = 'card_' + c.id;
    const own = isUnlocked(this.archivist, c.id);
    const hot = ui.hot(id, x, y, w, h, VIEW);
    // cards scrolled out of the window are not drawn, but keep their region so arrow keys can reach them
    if (y + h + 4 < VIEW[1] || y - 4 > VIEW[1] + VIEW[3]) {
      ui.regions.push({ id, x, y, w, h, clip: VIEW, click: () => this.app.router.champion(c.id, list.map((l) => l.id)) });
      return;
    }
    if (hot && !this.hoverSince.has(c.id)) this.hoverSince.set(c.id, this.t);
    if (!hot) this.hoverSince.delete(c.id);
    const aff = AFFINITIES[c.affinity];
    // window: a dark stage tinted by the affinity, a floor line, the champion
    // locked cards get a pale stage so the dark silhouette reads against it
    ui.bands(ctx, x + 3, y + 3, w - 6, 94, own ? '#080a12' : '#1a2032', own ? shade(aff.color, 0.3) : '#4a5470', 7);
    ui.bands(ctx, x + 3, y + 97, w - 6, h - 100, own ? shade(aff.color, 0.22) : '#3a4258', '#080a12', 3);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 3, y + 96, w - 6, 1);
    const art = this.a.champions[c.id];
    const anim = own && hot ? 'attack1' : 'idle';
    const since = this.hoverSince.get(c.id) ?? 0;
    const f = frameAt(art, anim, anim === 'idle' ? this.t + c.id.length * 97 : this.t - since);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 3, y + 3, w - 6, h - 6);
    ctx.clip();
    drawChampion(ctx, art, anim, f, x + w / 2, y + 96, { facing: 'R', shadow: !own });
    ctx.restore();
    // name plate
    ctx.fillStyle = 'rgba(5,7,12,0.82)';
    ctx.fillRect(x + 3, y + 100, w - 6, h - 103);
    nine(ctx, this.a.ui.img, ui.part(own ? 'card_' + c.rarity : 'card_locked'), x, y, w, h, 8);
    ui.blit(ctx, 'gem_' + c.affinity, x + 6, y + 6);
    ui.blit(ctx, 'role_' + c.role, x + w - 15, y + 7);
    if (own) {
      ui.text(ctx, c.name, x + w / 2, y + 104, { color: c.color, variant: 'bold', align: 'center' });
      ui.text(ctx, RARITIES[c.rarity].name.toUpperCase(), x + w / 2, y + 116, { color: RARITIES[c.rarity].color, align: 'center' });
      ui.text(ctx, c.role, x + w / 2, y + 126, { color: COLORS.faint, align: 'center' });
    } else {
      const st = recruitStage(c.id);
      ui.blit(ctx, 'lock', x + w / 2 - 5, y + 44);
      ui.text(ctx, c.name, x + w / 2, y + 104, { color: '#8a90a0', variant: 'bold', align: 'center' });
      ui.text(ctx, st ? `Clear stage ${st.id}` : 'Locked', x + w / 2, y + 117, { color: COLORS.bad, align: 'center' });
    }
    if (isFresh(this.archivist, c.id)) ui.blit(ctx, 'new', x + w - 24, y - 3);
    if (hot) {
      ctx.strokeStyle = COLORS.goldHi;
      ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    }
    ui.regions.push({ id, x, y, w, h, clip: VIEW, click: () => this.app.router.champion(c.id, list.map((l) => l.id)) });
  }
}

/** Darkens a #rrggbb color (card window tints). */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * k).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}
