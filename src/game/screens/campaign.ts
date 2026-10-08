// Campaign: the world map with locations and stage nodes. The world is three
// screens wide and two tall: a camera follows the keyboard focus from stage to
// stage, the map can be dragged or slid with W A S D (or Shift + arrows), and
// M shows the whole world at once. Selecting a stage opens a panel on the side
// away from the node, with the story, the enemy line-up, the reward and the
// way into team select.
import { H, W } from '../../engine/screen';
import { App, KeyMods } from '../app';
import { cleared, frontier, isUnlocked, locationOpen, stageOpen } from '../archivist';
import { allStages, LOCATIONS, locationOf, stage } from '../data/campaign';
import { champion } from '../data/champions';
import { AFFINITIES, RARITIES } from '../data/meta';
import { LocationDef, StageDef } from '../data/types';
import { Scroller } from '../ui/scroll';
import { COLORS } from '../ui/ui';
import { blit, Rect4 } from '../view/assets';
import { BaseScreen } from './base';

/** first map row below the header */
const TOP = 32;
const VIEW: Rect4 = [0, TOP, W, H - TOP];
const PANEL_W = 236, PANEL_H = 286;
/** one press of W A S D or Shift + arrow slides the map this far */
const STEP = { x: 200, y: 120 };
/** keyboard focus keeps its stage at least this far from the edges of the free view */
const MARGIN = { x: 90, y: 60 };

export class CampaignScreen extends BaseScreen {
  private selected: StageDef | null = null;
  private panelLeft = true;
  private camX = new Scroller();
  private camY = new Scroller();
  private overview = false;
  private followed: string | null = null;

  constructor(app: App, stageId?: string) {
    super(app);
    this.camX.extent(this.a.map.width, W);
    this.camY.extent(this.a.map.height, H);
    const s = stage(stageId ?? frontier(this.archivist));
    this.center(s);
    this.ui.focusId = this.followed = 'node_' + s.id;
    // open on the stage without a glide
    this.camX.pos = this.camX.target;
    this.camY.pos = this.camY.target;
  }

  protected back() {
    if (this.overview) this.overview = false;
    else if (this.selected) this.selected = null;
    else this.app.router.menu();
  }

  protected update(dt: number) {
    // the keyboard moved to another stage: glide so it stays in view
    const f = this.ui.focusId;
    if (this.ui.keyboard && f !== this.followed && f?.startsWith('node_')) this.keepInView(stage(f.slice(5)));
    this.followed = f;
    this.camX.update(dt);
    this.camY.update(dt);
  }

  /** Opens a stage's panel on the side away from the stage; the map moves only if the stage would end up under it. */
  private select(s: StageDef | null) {
    this.selected = s;
    if (!s) return;
    this.panelLeft = s.map.x - this.camX.target > W / 2;
    this.keepInView(s);
  }

  /** Opens a stage's panel with the stage in the middle of the free part of the screen. */
  private center(s: StageDef) {
    this.camX.to(s.map.x - W / 2);
    this.select(s);
    const [l, r] = this.freeView();
    this.camX.to(s.map.x - (l + r) / 2);
    this.camY.to(s.map.y - (TOP + H) / 2);
  }

  /** Free view: the screen below the header, minus the open panel. */
  private freeView(): [number, number] {
    if (!this.selected) return [0, W];
    return this.panelLeft ? [12 + PANEL_W, W] : [0, W - 12 - PANEL_W];
  }

  private keepInView(s: StageDef) {
    const [l, r] = this.freeView();
    const sx = s.map.x - this.camX.target, sy = s.map.y - this.camY.target;
    if (sx < l + MARGIN.x) this.camX.by(sx - l - MARGIN.x);
    else if (sx > r - MARGIN.x) this.camX.by(sx - r + MARGIN.x);
    if (sy < TOP + MARGIN.y) this.camY.by(sy - TOP - MARGIN.y);
    else if (sy > H - MARGIN.y) this.camY.by(sy - H + MARGIN.y);
  }

  drag(dx: number, dy: number) {
    if (this.overview) return;
    this.camX.shift(-dx);
    this.camY.shift(-dy);
  }

  key(k: string, mods?: KeyMods) {
    if (this.app.busy) return;
    if (k === 'm') {
      this.overview = !this.overview;
      return;
    }
    const slide: Record<string, [number, number]> = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0] };
    const arrows: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowRight: [1, 0] };
    // in the overview the arrows move the view frame; on the map they jump between stages unless Shift is held
    const step = slide[k] ?? (this.overview || mods?.shift ? arrows[k] : undefined);
    if (step) {
      this.camX.by(step[0] * STEP.x);
      this.camY.by(step[1] * STEP.y);
      return;
    }
    if (this.overview) {
      if (k === 'Enter' || k === ' ' || k === 'Escape' || k === 'Backspace') this.overview = false;
      return;
    }
    if (k === 'Enter' && this.selected && !this.ui.focusId?.startsWith('p_') && !this.ui.focusId?.startsWith('node_') && this.ui.focusId !== 'overview') {
      this.app.router.team(this.selected.id);
      return;
    }
    super.key(k);
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const ox = -this.camX.offset, oy = -this.camY.offset;
    ctx.drawImage(this.a.map, ox, oy);
    if (this.overview) {
      this.drawOverview(ctx);
      return;
    }
    const p = this.archivist;
    const front = frontier(p);

    // location banners, under their landmarks
    for (const loc of LOCATIONS) this.banner(ctx, loc, loc.map.x + ox, loc.map.y + 4 + oy);

    // stage nodes, in campaign order
    for (const s of allStages()) {
      const open = stageOpen(p, s.id);
      const done = cleared(p, s.id);
      const boss = s.enemies.some((e) => e.boss);
      const kind = !open ? 'node_locked' : boss && !done ? 'node_boss' : done ? 'node_cleared' : 'node_open';
      const r = ui.part(kind);
      const nx = s.map.x + ox, ny = s.map.y + oy;
      const x = nx - Math.floor(r[2] / 2), y = ny - Math.floor(r[3] / 2);
      const id = 'node_' + s.id;
      const hot = ui.hot(id, x - 2, y - 2, r[2] + 4, r[3] + 4, VIEW) || this.selected?.id === s.id;
      if (s.id === front && open) {
        const g = ui.part('node_glow_' + (Math.floor(this.t / 120) % 3));
        blit(ctx, this.a.ui.img, g, nx - Math.floor(g[2] / 2), ny - Math.floor(g[3] / 2));
      }
      blit(ctx, this.a.ui.img, r, x, y - (hot ? 1 : 0));
      if (open && kind !== 'node_boss') ui.text(ctx, s.id, nx, y + 6 - (hot ? 1 : 0), { color: done ? '#2a1404' : COLORS.text, align: 'center', outline: done ? '#ffe070' : COLORS.ink });
      if (boss && open) ui.blit(ctx, 'crown', nx - 6, y - 9);
      if (done) {
        const st = p.stars[s.id] ?? 0;
        for (let i = 0; i < 3; i++) ui.blit(ctx, i < st ? 'star_s' : 'star_s_off', nx - 14 + i * 9, y + r[3] - 1);
      }
      ui.regions.push({
        id, x: x - 2, y: y - 2, w: r[2] + 4, h: r[3] + 4, clip: VIEW,
        click: () => this.select(s),
        tip: () => ({ title: `${s.id}  ${s.name}`, sub: open ? (done ? 'Cleared' : 'Open') : 'Locked', body: open ? '' : 'Clear the previous stage to open it.', color: COLORS.goldHi }),
      });
    }

    this.header(ctx, 'CAMPAIGN', 'Choose a stage');
    this.overviewButton(ctx);
    if (this.selected) this.drawPanel(ctx, this.selected);
    ui.text(ctx, 'Drag or W A S D: move the map    Arrows: stages    M: whole map', W / 2, H - 12, { color: COLORS.dim, align: 'center' });
  }

  /** A location's name on a banner centered at (cx, y); dimmed and locked until the location opens. */
  private banner(ctx: CanvasRenderingContext2D, loc: LocationDef, cx: number, y: number) {
    const ui = this.ui;
    const open = locationOpen(this.archivist, loc);
    const label = `${loc.chapter}. ${loc.name}`;
    const w = ui.measure(label, 'bold') + 30;
    const x = Math.round(cx - w / 2);
    const b = ui.part('banner');
    ctx.globalAlpha = open ? 1 : 0.75;
    ctx.drawImage(this.a.ui.img, b[0], b[1], 12, b[3], x, y, 12, b[3]);
    ctx.drawImage(this.a.ui.img, b[0] + 12, b[1], 8, b[3], x + 12, y, w - 24, b[3]);
    ctx.drawImage(this.a.ui.img, b[0] + b[2] - 12, b[1], 12, b[3], x + w - 12, y, 12, b[3]);
    ctx.globalAlpha = 1;
    ui.text(ctx, label, cx, y + 5, { color: open ? '#ffe9a0' : '#b0a0a0', variant: 'bold', align: 'center' });
    if (!open) ui.blit(ctx, 'lock', x - 6, y + 2);
  }

  private overviewButton(ctx: CanvasRenderingContext2D) {
    this.ui.button(ctx, 'overview', 430, 5, 108, 20, this.overview ? 'BACK TO MAP' : 'WHOLE MAP (M)', { click: () => (this.overview = !this.overview), kind: 'small' });
  }

  /** The whole world on one screen: every stage, the part the camera shows, click to go there. */
  private drawOverview(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const o = this.a.overview;
    const k = o.width / this.a.map.width;
    const x0 = Math.round((W - o.width) / 2), y0 = Math.round(TOP + (H - TOP - o.height) / 2) - 4;
    ui.dim(ctx, 0.85);
    ctx.drawImage(o, x0, y0);
    // the jump: anywhere on the world centers the map there
    ui.regions.push({
      x: x0, y: y0, w: o.width, h: o.height,
      click: () => {
        const m = ui.mouse;
        this.camX.to((m.x - x0) / k - W / 2);
        this.camY.to((m.y - y0) / k - (TOP + H) / 2);
        this.overview = false;
      },
    });
    // the part of the world the map shows now
    const fx = Math.round(x0 + this.camX.offset * k), fy = Math.round(y0 + this.camY.offset * k);
    const fw = Math.round(W * k), fh = Math.round(H * k);
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(fx - 1, fy - 1, fw + 2, 3);
    ctx.fillRect(fx - 1, fy + fh - 2, fw + 2, 3);
    ctx.fillRect(fx - 1, fy - 1, 3, fh + 2);
    ctx.fillRect(fx + fw - 2, fy - 1, 3, fh + 2);
    ctx.fillStyle = COLORS.goldHi;
    ctx.fillRect(fx, fy, fw, 1);
    ctx.fillRect(fx, fy + fh - 1, fw, 1);
    ctx.fillRect(fx, fy, 1, fh);
    ctx.fillRect(fx + fw - 1, fy, 1, fh);
    // locations above their landmarks (the stages crowd the space under them at this size), then the stages
    const p = this.archivist;
    const banner = ui.part('banner');
    for (const loc of LOCATIONS) this.banner(ctx, loc, Math.round(x0 + loc.map.x * k), Math.round(y0 + loc.map.y * k) - 26 - banner[3]);
    for (const s of allStages()) {
      const open = stageOpen(p, s.id);
      const done = cleared(p, s.id);
      const boss = s.enemies.some((e) => e.boss);
      const r = ui.part(!open ? 'node_locked' : boss && !done ? 'node_boss' : done ? 'node_cleared' : 'node_open');
      const nx = Math.round(x0 + s.map.x * k), ny = Math.round(y0 + s.map.y * k);
      const x = nx - Math.floor(r[2] / 2), y = ny - Math.floor(r[3] / 2);
      const id = 'ov_' + s.id;
      const hot = ui.hot(id, x - 2, y - 2, r[2] + 4, r[3] + 4);
      blit(ctx, this.a.ui.img, r, x, y - (hot ? 1 : 0));
      if (open && !(boss && !done)) ui.text(ctx, s.id, nx, y + 6 - (hot ? 1 : 0), { color: done ? '#2a1404' : COLORS.text, align: 'center', outline: done ? '#ffe070' : COLORS.ink });
      ui.regions.push({
        id, x: x - 2, y: y - 2, w: r[2] + 4, h: r[3] + 4,
        click: () => {
          this.overview = false;
          this.ui.focusId = this.followed = 'node_' + s.id;
          this.center(s);
        },
        tip: () => ({ title: `${s.id}  ${s.name}`, sub: open ? (done ? 'Cleared' : 'Open') : 'Locked', body: '', color: COLORS.goldHi }),
      });
    }
    this.header(ctx, 'CAMPAIGN', 'The whole world');
    this.overviewButton(ctx);
    ui.text(ctx, 'Click a place to go there    Arrows: move the frame    M or Esc: back to the map', W / 2, H - 12, { color: COLORS.dim, align: 'center' });
  }

  private drawPanel(ctx: CanvasRenderingContext2D, s: StageDef) {
    const ui = this.ui;
    const p = this.archivist;
    const w = PANEL_W, h = PANEL_H;
    const x = this.panelLeft ? 12 : W - w - 12, y = 40;
    const open = stageOpen(p, s.id);
    const loc = locationOf(s.id);
    // the panel stops clicks from reaching the stages under it
    ui.regions.push({ x, y, w, h });
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
    ui.button(ctx, 'p_close', x + 12, y + h - 34, bw, 24, 'CLOSE', { click: () => this.select(null), kind: 'small' });
    ui.button(ctx, 'p_go', x + 20 + bw, y + h - 34, bw, 24, 'PREPARE', { click: () => this.app.router.team(s.id), icon: 'mi_fight', disabled: !open });
    if (!open) ui.text(ctx, 'Clear the previous stage first.', x + w / 2, y + h - 48, { color: COLORS.bad, align: 'center' });
  }
}
