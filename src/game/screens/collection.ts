// Champion collection: every champion as a card. Recruited champions stand
// in their idle loop (hover: they show off their basic attack); locked ones
// are dark silhouettes with the stage that recruits them.
import { W } from '../../engine/screen';
import { App } from '../app';
import { frontier } from '../profile';
import { locationOf, recruitStage } from '../data/campaign';
import { CHAMPIONS } from '../data/champions';
import { AFFINITIES, RARITIES } from '../data/meta';
import { Affinity, ChampionDef } from '../data/types';
import { isUnlocked } from '../profile';
import { COLORS } from '../ui/ui';
import { nine } from '../view/assets';
import { drawChampion, frameAt } from '../view/unit';
import { BaseScreen, Diorama } from './base';

const FILTERS: (Affinity | 'all')[] = ['all', 'force', 'wild', 'arcane', 'void'];

export class CollectionScreen extends BaseScreen {
  private filter: Affinity | 'all' = 'all';
  private diorama: Diorama;
  private hoverSince = new Map<string, number>();

  constructor(app: App) {
    super(app);
    this.diorama = new Diorama(app, locationOf(frontier(this.profile)).zone);
    this.ui.focusId = 'card_' + CHAMPIONS[0].id;
  }

  protected back() {
    this.app.router.menu();
  }

  protected update(dt: number) {
    this.diorama.update(dt);
  }

  private list(): ChampionDef[] {
    return CHAMPIONS.filter((c) => this.filter === 'all' || c.affinity === this.filter);
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    this.diorama.draw(ctx, this.t, 0.72);
    const owned = CHAMPIONS.filter((c) => isUnlocked(this.profile, c.id)).length;
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
      ui.regions.push({ id, x: tx, y: 36, w, h: 16, click: () => (this.filter = f) });
      tx += w + 4;
    }

    const list = this.list();
    const cw = 112, ch = 140, gap = 8, cols = 5;
    const x0 = Math.round(W / 2 - (cols * cw + (cols - 1) * gap) / 2), y0 = 58;
    list.forEach((c, i) => {
      const x = x0 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
      this.card(ctx, c, x, y, cw, ch, list);
    });
  }

  private card(ctx: CanvasRenderingContext2D, c: ChampionDef, x: number, y: number, w: number, h: number, list: ChampionDef[]) {
    const ui = this.ui;
    const id = 'card_' + c.id;
    const own = isUnlocked(this.profile, c.id);
    const hot = ui.hot(id, x, y, w, h);
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
    if (this.profile.fresh.includes(c.id)) ui.blit(ctx, 'new', x + w - 24, y - 3);
    if (hot) {
      ctx.strokeStyle = COLORS.goldHi;
      ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    }
    ui.regions.push({ id, x, y, w, h, click: () => this.app.router.champion(c.id, list.map((l) => l.id)) });
  }
}

/** Darkens a #rrggbb color (card window tints). */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * k).toString(16).padStart(2, '0');
  return `#${c(16)}${c(8)}${c(0)}`;
}
