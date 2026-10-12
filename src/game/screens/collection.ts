// Champion collection: every champion as a card. Recruited champions stand
// in their idle loop (hover: they show off their basic attack); locked ones
// are dark silhouettes with the stage that recruits them. Filters by affinity
// and by class (role) combine; the cards stand in groups by faction, each
// under its emblem, the rarest first, every rarity on rows of its own (Jakub,
// 2026-10-12). The grid scrolls (wheel, PageUp/PageDown, Home/End, the edge
// chevrons, keyboard focus) once the roster outgrows the screen.
import { H, W } from '../../engine/screen';
import { App } from '../app';
import { frontier, isFresh, isUnlocked } from '../archivist';
import { recruitStage, zoneOf } from '../data/campaign';
import { CHAMPIONS } from '../data/champions';
import { AFFINITIES, FACTIONS, RARITIES } from '../data/meta';
import { Affinity, ChampionDef, FactionId, Rarity, Role } from '../data/types';
import { Scroller } from '../ui/scroll';
import { COLORS } from '../ui/ui';
import { nine, Rect4 } from '../view/assets';
import { drawChampion, frameAt } from '../view/unit';
import { BaseScreen, Diorama } from './base';

/** The filter tabs after ALL: one per affinity, then one per class. */
const AFFINITY_TABS = Object.keys(AFFINITIES) as Affinity[];
const ROLE_TABS: Role[] = ['Damage', 'Tank', 'Support'];
/** Rarest first: in a faction's group every rarity has rows of its own (Jakub, 2026-10-12). */
const RARITY_ROWS = (Object.keys(RARITIES) as Rarity[]).sort((a, b) => RARITIES[b].rank - RARITIES[a].rank);

/** Card grid geometry and the window it scrolls in (below the filter tabs). */
const CW = 112, CH = 140, GAP = 8, COLS = 5;
const VIEW: Rect4 = [0, 54, W, H - 54];
/** room above the first row for the NEW badges, and below the last */
const PAD_TOP = 5, PAD_BOTTOM = 6;
/** a faction's header above its cards, and the space before the next faction */
const HEAD = 20, GROUP_GAP = 6;
const GRID_W = COLS * CW + (COLS - 1) * GAP, GRID_X = Math.round(W / 2 - GRID_W / 2);

/** A card's place in the scrolling grid (content pixels). */
interface Slot {
  c: ChampionDef;
  x: number;
  y: number;
}

export class CollectionScreen extends BaseScreen {
  private affinity: Affinity | 'all' = 'all';
  private role: Role | null = null;
  private diorama: Diorama;
  private hoverSince = new Map<string, number>();
  private scroll = new Scroller();

  constructor(app: App) {
    super(app);
    this.diorama = new Diorama(app, zoneOf(frontier(this.archivist)));
    this.ui.focusId = 'card_' + (this.layout().slots[0]?.c.id ?? CHAMPIONS[0].id);
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

  private setFilter(affinity: Affinity | 'all', role: Role | null) {
    this.affinity = affinity;
    this.role = role;
    this.scroll.to(0);
  }

  private passes(c: ChampionDef): boolean {
    return (this.affinity === 'all' || c.affinity === this.affinity) && (!this.role || c.role === this.role);
  }

  /**
   * The cards in groups by faction, in the order of the factions: each group
   * under its header, its champions the rarest first, every rarity starting a
   * row of its own, so a row never holds two rarities (Jakub, 2026-10-12).
   * Within a rarity, the order they join in.
   */
  private layout(): { slots: Slot[]; heads: { faction: FactionId; y: number }[]; height: number } {
    const slots: Slot[] = [];
    const heads: { faction: FactionId; y: number }[] = [];
    let y = PAD_TOP;
    for (const f of Object.keys(FACTIONS) as FactionId[]) {
      const mine = CHAMPIONS.filter((c) => c.faction === f && this.passes(c));
      if (!mine.length) continue;
      heads.push({ faction: f, y });
      y += HEAD;
      for (const r of RARITY_ROWS) {
        const row = mine.filter((c) => c.rarity === r);
        for (let i = 0; i < row.length; i += COLS) {
          row.slice(i, i + COLS).forEach((c, k) => slots.push({ c, x: GRID_X + k * (CW + GAP), y }));
          y += CH + GAP;
        }
      }
      y += GROUP_GAP;
    }
    return { slots, heads, height: slots.length ? y - GAP - GROUP_GAP + PAD_BOTTOM : 0 };
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    this.diorama.draw(ctx, this.t, 0.72);
    const owned = CHAMPIONS.filter((c) => isUnlocked(this.archivist, c.id)).length;
    this.header(ctx, 'CHAMPIONS', `${owned} / ${CHAMPIONS.length} recruited`);

    // filter tabs: ALL, the affinities, then the classes; an affinity and a class combine,
    // a lit tab clicked again lets go of its filter, ALL lets go of both
    let tx = 20;
    const tab = (id: string, label: string, icon: string | null, on: boolean, click: () => void) => {
      const w = ui.measure(label) + (icon ? 28 : 16);
      const hot = ui.hot(id, tx, 36, w, 16);
      nine(ctx, this.a.ui.img, ui.part(on ? 'tab_on' : 'tab_off'), tx, 36, w, 16, 5);
      if (icon) {
        const r = ui.part(icon);
        ui.blit(ctx, icon, tx + 6 + Math.floor((11 - r[2]) / 2), 36 + Math.floor((16 - r[3]) / 2));
      }
      ui.text(ctx, label, tx + (icon ? 20 : 8), 40, { color: on || hot ? COLORS.goldHi : COLORS.dim });
      ui.regions.push({ id, x: tx, y: 36, w, h: 16, click });
      tx += w + 4;
    };
    tab('tab_all', 'ALL', null, this.affinity === 'all' && !this.role, () => this.setFilter('all', null));
    for (const f of AFFINITY_TABS) tab('tab_' + f, AFFINITIES[f].name.toUpperCase(), 'gem_' + f, this.affinity === f, () => this.setFilter(this.affinity === f ? 'all' : f, this.role));
    tx += 10;
    for (const r of ROLE_TABS) tab('tab_' + r, r.toUpperCase(), 'role_' + r, this.role === r, () => this.setFilter(this.affinity, this.role === r ? null : r));

    const { slots, heads, height } = this.layout();
    const order = slots.map((s) => s.c);
    const [vx, vy, vw, vh] = VIEW;
    this.scroll.extent(height, vh);
    // keyboard focus pulls its card (and the header above it) into view
    const focused = slots.find((s) => 'card_' + s.c.id === ui.focusId);
    if (ui.keyboard && focused) this.scroll.reveal(Math.max(0, focused.y - HEAD), CH + HEAD + PAD_BOTTOM, vh);

    const oy = vy - this.scroll.offset;
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx, vy, vw, vh);
    ctx.clip();
    for (const h of heads) this.head(ctx, h.faction, GRID_X, oy + h.y, GRID_W);
    for (const sl of slots) this.card(ctx, sl.c, sl.x, oy + sl.y, CW, CH, order);
    if (!slots.length) ui.text(ctx, 'No champion is both of these.', W / 2, vy + 60, { color: COLORS.dim, align: 'center' });
    ctx.restore();
    this.scrollHints(ctx);
  }

  /** A faction's header: its emblem, its name in its colour, a rule running on across the grid. */
  private head(ctx: CanvasRenderingContext2D, f: FactionId, x: number, y: number, w: number) {
    if (y + HEAD < VIEW[1] || y > VIEW[1] + VIEW[3]) return;
    const ui = this.ui;
    const fac = FACTIONS[f];
    const name = fac.name.toUpperCase();
    ui.blit(ctx, 'emblem_' + f, x, y);
    ui.text(ctx, name, x + 20, y + 4, { color: fac.color, variant: 'bold' });
    const lx = x + 26 + ui.measure(name, 'bold');
    ctx.fillStyle = '#a8701e';
    ctx.fillRect(lx, y + 8, x + w - lx, 1);
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(lx, y + 9, x + w - lx, 1);
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
