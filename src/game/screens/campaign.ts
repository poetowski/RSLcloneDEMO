// Campaign: the world map with locations and stage nodes. Selecting a stage
// opens a panel (on the side away from the node) with the story, the enemy
// line-up, the reward and the way into team select.
import { W } from '../../engine/screen';
import { App } from '../app';
import { allStages, LOCATIONS, locationOf, stage } from '../data/campaign';
import { champion } from '../data/champions';
import { AFFINITIES, RARITIES } from '../data/meta';
import { StageDef } from '../data/types';
import { cleared, frontier, isUnlocked, locationOpen, stageOpen } from '../profile';
import { COLORS } from '../ui/ui';
import { blit } from '../view/assets';
import { BaseScreen } from './base';

export class CampaignScreen extends BaseScreen {
  private selected: StageDef | null;

  constructor(app: App, stageId?: string) {
    super(app);
    this.selected = stage(stageId ?? frontier(this.profile));
    this.ui.focusId = 'node_' + this.selected.id;
  }

  protected back() {
    if (this.selected) this.selected = null;
    else this.app.router.menu();
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    ctx.drawImage(this.a.map, 0, 0);
    const p = this.profile;
    const front = frontier(p);

    // location banners
    for (const loc of LOCATIONS) {
      const open = locationOpen(p, loc);
      const label = `${loc.chapter}. ${loc.name}`;
      const w = ui.measure(label, 'bold') + 30;
      const x = Math.round(loc.map.x - w / 2), y = loc.map.y + 4;
      const b = ui.part('banner');
      ctx.globalAlpha = open ? 1 : 0.75;
      ctx.drawImage(this.a.ui.img, b[0], b[1], 12, b[3], x, y, 12, b[3]);
      ctx.drawImage(this.a.ui.img, b[0] + 12, b[1], 8, b[3], x + 12, y, w - 24, b[3]);
      ctx.drawImage(this.a.ui.img, b[0] + b[2] - 12, b[1], 12, b[3], x + w - 12, y, 12, b[3]);
      ctx.globalAlpha = 1;
      ui.text(ctx, label, loc.map.x, y + 5, { color: open ? '#ffe9a0' : '#b0a0a0', variant: 'bold', align: 'center' });
      if (!open) ui.blit(ctx, 'lock', x - 6, y + 2);
    }

    // stage nodes, in campaign order
    for (const s of allStages()) {
      const open = stageOpen(p, s.id);
      const done = cleared(p, s.id);
      const boss = s.enemies.some((e) => e.boss);
      const kind = !open ? 'node_locked' : boss && !done ? 'node_boss' : done ? 'node_cleared' : 'node_open';
      const r = ui.part(kind);
      const x = s.map.x - Math.floor(r[2] / 2), y = s.map.y - Math.floor(r[3] / 2);
      const id = 'node_' + s.id;
      const hot = ui.hot(id, x - 2, y - 2, r[2] + 4, r[3] + 4) || this.selected?.id === s.id;
      if (s.id === front && open) {
        const g = ui.part('node_glow_' + (Math.floor(this.t / 120) % 3));
        blit(ctx, this.a.ui.img, g, s.map.x - Math.floor(g[2] / 2), s.map.y - Math.floor(g[3] / 2));
      }
      blit(ctx, this.a.ui.img, r, x, y - (hot ? 1 : 0));
      if (open && kind !== 'node_boss') ui.text(ctx, s.id, s.map.x, y + 6 - (hot ? 1 : 0), { color: done ? '#2a1404' : COLORS.text, align: 'center', outline: done ? '#ffe070' : COLORS.ink });
      if (boss && open) ui.blit(ctx, 'crown', s.map.x - 6, y - 9);
      if (done) {
        const st = p.stars[s.id] ?? 0;
        for (let i = 0; i < 3; i++) ui.blit(ctx, i < st ? 'star_s' : 'star_s_off', s.map.x - 14 + i * 9, y + r[3] - 1);
      }
      ui.regions.push({
        id, x: x - 2, y: y - 2, w: r[2] + 4, h: r[3] + 4,
        click: () => (this.selected = s),
        tip: () => ({ title: `${s.id}  ${s.name}`, sub: open ? (done ? 'Cleared' : 'Open') : 'Locked', body: open ? '' : 'Clear the previous stage to open it.', color: COLORS.goldHi }),
      });
    }

    this.header(ctx, 'CAMPAIGN', 'Choose a stage');
    if (this.selected) this.drawPanel(ctx, this.selected);
  }

  private drawPanel(ctx: CanvasRenderingContext2D, s: StageDef) {
    const ui = this.ui;
    const p = this.profile;
    const w = 236, h = 286;
    const left = s.map.x > W / 2;
    const x = left ? 12 : W - w - 12, y = 40;
    const open = stageOpen(p, s.id);
    const loc = locationOf(s.id);
    ctx.fillStyle = '#0d1220';
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    ui.panel(ctx, 'gold', x, y, w, h);
    ui.text(ctx, `${loc.chapter}. ${loc.name.toUpperCase()}`, x + 12, y + 10, { color: COLORS.dim });
    ui.text(ctx, `${s.id}  ${s.name}`, x + 12, y + 22, { color: COLORS.goldHi, variant: 'bold' });
    const best = p.stars[s.id] ?? 0;
    for (let i = 0; i < 3; i++) ui.blit(ctx, i < best ? 'star_m' : 'star_m_off', x + w - 52 + i * 14, y + 8);
    ui.divider(ctx, x + 10, y + 36, w - 20);
    let cy = y + 47;
    cy += ui.para(ctx, s.blurb, x + 12, cy, w - 24, { color: COLORS.text }) + 6;

    ui.text(ctx, 'ENEMIES', x + 12, cy, { color: COLORS.dim, variant: 'bold' });
    const power = Math.round(s.power * 100);
    ui.text(ctx, `power ${power}%`, x + w - 12, cy, { color: power > 100 ? COLORS.bad : COLORS.dim, align: 'right' });
    cy += 12;
    for (const e of s.enemies) {
      const c = champion(e.champion);
      const pr = this.a.ui.json.portraits[c.id];
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(x + 12, cy, 30, 30);
      ctx.fillStyle = RARITIES[c.rarity].color;
      ctx.fillRect(x + 13, cy + 1, 28, 28);
      blit(ctx, this.a.ui.img, pr, x + 13, cy + 1);
      ui.blit(ctx, 'gem_' + c.affinity, x + 33, cy + 21);
      if (e.boss) ui.blit(ctx, 'crown', x + 21, cy - 5);
      ui.text(ctx, c.name + (e.boss ? '  (BOSS)' : ''), x + 48, cy + 4, { color: e.boss ? '#ffb0a0' : c.color, variant: 'bold' });
      ui.text(ctx, `${c.role}  -  ${AFFINITIES[c.affinity].name}`, x + 48, cy + 16, { color: COLORS.dim });
      ui.regions.push({ x: x + 12, y: cy, w: w - 24, h: 30, tip: () => ({ title: c.name, sub: `${RARITIES[c.rarity].name} ${c.role}, ${AFFINITIES[c.affinity].name}`, body: c.skills.map((k) => k.name).join(', '), color: c.color }) });
      cy += 34;
    }
    cy = Math.max(cy, y + h - 74);
    if (s.recruit) {
      const c = champion(s.recruit);
      const owned = isUnlocked(p, c.id);
      ui.text(ctx, owned ? 'RECRUITED' : 'FIRST CLEAR: RECRUIT', x + 12, cy, { color: owned ? COLORS.good : COLORS.goldHi, variant: 'bold' });
      ui.text(ctx, c.name, x + w - 12, cy, { color: RARITIES[c.rarity].color, align: 'right' });
      cy += 14;
    }
    const bw = (w - 32) / 2;
    ui.button(ctx, 'p_close', x + 12, y + h - 34, bw, 24, 'CLOSE', { click: () => (this.selected = null), kind: 'small' });
    ui.button(ctx, 'p_go', x + 20 + bw, y + h - 34, bw, 24, 'PREPARE', { click: () => this.app.router.team(s.id), icon: 'mi_fight', disabled: !open });
    if (!open) ui.text(ctx, 'Clear the previous stage first.', x + w / 2, y + h - 48, { color: COLORS.bad, align: 'center' });
  }

  key(k: string) {
    if (k === 'Enter' && this.selected && !this.ui.focusId?.startsWith('p_') && !this.ui.focusId?.startsWith('node_')) {
      this.app.router.team(this.selected.id);
      return;
    }
    super.key(k);
  }
}
