// Campaign: the world map with one node per area (a location). Choosing a node
// opens the area's stage list in a panel over the map: every stage with its
// stars, its lock or the boss crown, and for the selected stage its story, the
// enemy line-up, the reward and the way into team select. Stages have no place
// on the map of their own. The world is two screens wide and scrolls sideways:
// a camera follows the keyboard focus from node to node, the map can be dragged
// or slid with W A S D (or Shift + arrows), and M shows the whole world at once.
import { H, W } from '../../engine/screen';
import { App, KeyMods } from '../app';
import { cleared, frontier, isUnlocked, locationOpen, stageOpen } from '../archivist';
import { LOCATIONS, locationOf, stage } from '../data/campaign';
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
/** one press of W A S D or Shift + arrow slides the map this far */
const STEP = { x: 200, y: 120 };
/** keyboard focus keeps its node at least this far from the edges of the view */
const MARGIN = { x: 120, y: 60 };
/** the stage list panel */
const PX = 20, PY = 38, PW = 600, PH = 300;
/** one stage in the list */
const CELL = { w: 46, h: 50 };

export class CampaignScreen extends BaseScreen {
  /** the area whose stage list is open */
  private open: LocationDef | null = null;
  /** the stage selected in that list */
  private selected: StageDef | null = null;
  private camX = new Scroller();
  private camY = new Scroller();
  private overview = false;
  private followed: string | null = null;

  /** With a stage (back from a battle or team select), its area's list opens on it. */
  constructor(app: App, stageId?: string) {
    super(app);
    this.camX.extent(this.a.map.width, W);
    this.camY.extent(this.a.map.height, H);
    const s = stage(stageId ?? frontier(this.archivist));
    const loc = locationOf(s.id);
    this.centerOn(loc);
    this.ui.focusId = this.followed = 'loc_' + loc.id;
    // open on the area without a glide
    this.camX.pos = this.camX.target;
    this.camY.pos = this.camY.target;
    if (stageId) this.openList(loc, s);
  }

  protected back() {
    if (this.overview) this.overview = false;
    else if (this.open) this.closeList();
    else this.app.router.menu();
  }

  protected update(dt: number) {
    // the keyboard moved to another node: glide so it stays in view
    const f = this.ui.focusId;
    if (this.ui.keyboard && f !== this.followed && f?.startsWith('loc_')) {
      const loc = LOCATIONS.find((l) => 'loc_' + l.id === f);
      if (loc) this.keepInView(loc);
    }
    this.followed = f;
    this.camX.update(dt);
    this.camY.update(dt);
  }

  /** Opens an area's stage list on a stage: the given one, else the first open and uncleared, else the last open. */
  private openList(loc: LocationDef, s?: StageDef) {
    const p = this.archivist;
    this.open = loc;
    this.selected = s ?? loc.stages.find((x) => stageOpen(p, x.id) && !cleared(p, x.id)) ?? [...loc.stages].reverse().find((x) => stageOpen(p, x.id)) ?? loc.stages[0] ?? null;
    this.ui.focusId = this.selected ? 'st_' + this.selected.id : 'p_close';
    this.keepInView(loc);
  }

  private closeList() {
    const loc = this.open;
    this.open = null;
    this.selected = null;
    if (loc) this.ui.focusId = this.followed = 'loc_' + loc.id;
  }

  private prepare(s: StageDef) {
    if (stageOpen(this.archivist, s.id)) this.app.router.team(s.id);
  }

  private centerOn(loc: LocationDef) {
    this.camX.to(loc.map.x - W / 2);
    this.camY.to(loc.map.y - (TOP + H) / 2);
  }

  private keepInView(loc: LocationDef) {
    const sx = loc.map.x - this.camX.target, sy = loc.map.y - this.camY.target;
    if (sx < MARGIN.x) this.camX.by(sx - MARGIN.x);
    else if (sx > W - MARGIN.x) this.camX.by(sx - W + MARGIN.x);
    if (sy < TOP + MARGIN.y) this.camY.by(sy - TOP - MARGIN.y);
    else if (sy > H - MARGIN.y) this.camY.by(sy - H + MARGIN.y);
  }

  drag(dx: number, dy: number) {
    if (this.overview || this.open) return;
    this.camX.shift(-dx);
    this.camY.shift(-dy);
  }

  key(k: string, mods?: KeyMods) {
    if (this.app.busy) return;
    if (this.open) {
      // Enter on the selected stage goes straight to team select
      if (k === 'Enter' && this.selected && this.ui.focusId === 'st_' + this.selected.id) {
        this.prepare(this.selected);
        return;
      }
      super.key(k);
      return;
    }
    if (k === 'm') {
      this.overview = !this.overview;
      return;
    }
    const slide: Record<string, [number, number]> = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0] };
    const arrows: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowRight: [1, 0] };
    // in the overview the arrows move the view frame; on the map they jump between areas unless Shift is held
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
    // left and right walk the line of areas in campaign order, wherever the map has been slid
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      const i = LOCATIONS.findIndex((l) => 'loc_' + l.id === this.ui.focusId);
      const next = LOCATIONS[Math.max(0, Math.min(LOCATIONS.length - 1, (i < 0 ? 0 : i) + (i < 0 ? 0 : k === 'ArrowLeft' ? -1 : 1)))];
      this.ui.keyboard = true;
      this.ui.focusId = 'loc_' + next.id;
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
    const current = locationOf(frontier(this.archivist));
    for (const loc of LOCATIONS) this.node(ctx, loc, loc.map.x + ox, loc.map.y + oy, loc === current, !this.open);
    this.header(ctx, 'CAMPAIGN', this.open ? `${this.open.chapter}. ${this.open.name}` : 'Choose an area');
    if (this.open) {
      this.drawList(ctx, this.open);
      return;
    }
    this.overviewButton(ctx);
    ui.text(ctx, 'Drag or W A S D: move the map    Arrows: areas    M: whole map', W / 2, H - 12, { color: COLORS.dim, align: 'center' });
  }

  /** Stars won and stars there are in an area. */
  private starsOf(loc: LocationDef): [number, number] {
    return [loc.stages.reduce((n, s) => n + (this.archivist.stars[s.id] ?? 0), 0), loc.stages.length * 3];
  }

  /** What an area's node says under its name. */
  private statusOf(loc: LocationDef): string {
    if (!locationOpen(this.archivist, loc)) return `Opens after stage ${loc.requires}`;
    if (!loc.stages.length) return 'Stages not designed yet';
    const done = loc.stages.filter((s) => cleared(this.archivist, s.id)).length;
    return `${done} / ${loc.stages.length} stages`;
  }

  /** An area's node: a medallion with its numeral, the name on a banner, its progress; `interactive` while no list is open. */
  private node(ctx: CanvasRenderingContext2D, loc: LocationDef, x: number, y: number, current: boolean, interactive: boolean) {
    const ui = this.ui;
    const open = locationOpen(this.archivist, loc);
    const total = loc.stages.length, done = loc.stages.filter((s) => cleared(this.archivist, s.id)).length;
    const kind = !open ? 'camp_locked' : total && done === total ? 'camp_cleared' : 'camp_open';
    const id = 'loc_' + loc.id;
    const r = ui.part(kind);
    const hot = interactive && ui.hot(id, x - 60, y - 20, 120, 72, VIEW);
    const lift = hot ? 1 : 0;
    if (current && open) {
      const g = ui.part('camp_glow_' + (Math.floor(this.t / 120) % 3));
      blit(ctx, this.a.ui.img, g, x - Math.floor(g[2] / 2), y - Math.floor(g[3] / 2));
    }
    blit(ctx, this.a.ui.img, r, x - Math.floor(r[2] / 2), y - Math.floor(r[3] / 2) - lift);
    if (open) ui.text(ctx, loc.chapter, x, y - 9 - lift, { color: kind === 'camp_cleared' ? '#2a1404' : '#fff0b0', variant: 'display', align: 'center', outline: kind === 'camp_cleared' ? '#ffe070' : COLORS.ink });
    this.banner(ctx, loc, x, y + 19);
    const status = this.statusOf(loc);
    const [won, all] = this.starsOf(loc);
    const line = open && all ? `${status}    ${won}/${all}` : status;
    const lw = ui.measure(line) + (open && all ? 10 : 0);
    const lx = Math.round(x - lw / 2);
    ctx.fillStyle = 'rgba(5,7,12,0.7)';
    ctx.fillRect(lx - 4, y + 40, lw + 8, 12);
    ui.text(ctx, line, lx, y + 42, { color: open ? COLORS.text : COLORS.dim });
    if (open && all) ui.blit(ctx, 'star_s', lx + lw - 9, y + 41);
    if (!interactive) return;
    ui.regions.push({
      id, x: x - 60, y: y - 20, w: 120, h: 72, clip: VIEW,
      click: () => this.openList(loc),
      tip: () => ({ title: `${loc.chapter}. ${loc.name}`, sub: status, body: loc.blurb, color: COLORS.goldHi }),
    });
  }

  /** An area's name on a banner centered at (cx, y); dimmed and locked until the area opens. */
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

  /** The stage list of an area, over the dimmed map. */
  private drawList(ctx: CanvasRenderingContext2D, loc: LocationDef) {
    const ui = this.ui;
    const p = this.archivist;
    ui.dim(ctx, 0.55);
    // a click beside the panel closes it; the panel itself stops clicks
    ui.regions.push({ x: 0, y: TOP, w: W, h: H - TOP, click: () => this.closeList() });
    ui.regions.push({ x: PX, y: PY, w: PW, h: PH });
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(PX + 3, PY + 3, PW - 6, PH - 6);
    ui.panel(ctx, 'gold', PX, PY, PW, PH);
    const open = locationOpen(p, loc);
    ui.text(ctx, `${loc.chapter}. ${loc.name.toUpperCase()}`, PX + 14, PY + 11, { color: COLORS.goldHi, variant: 'bold' });
    const [won, all] = this.starsOf(loc);
    if (all) {
      const s = `${won} / ${all}`;
      const sw = ui.measure(s);
      ui.text(ctx, s, PX + PW - 14 - sw, PY + 12, { color: COLORS.text });
      ui.blit(ctx, 'star_m', PX + PW - 30 - sw, PY + 9);
      const st = this.statusOf(loc);
      ui.text(ctx, st, PX + PW - 40 - sw - ui.measure(st), PY + 12, { color: COLORS.dim });
    }
    let cy = PY + 26;
    cy += ui.para(ctx, loc.blurb, PX + 14, cy, PW - 28, { color: COLORS.dim }) + 4;
    ui.divider(ctx, PX + 10, cy, PW - 20);
    cy += 12;
    const bw = 100;
    if (!loc.stages.length) {
      ui.text(ctx, 'Its stages are not designed yet.', PX + PW / 2, cy + 40, { color: COLORS.text, align: 'center' });
      if (!open) ui.text(ctx, `The area opens after stage ${loc.requires}.`, PX + PW / 2, cy + 56, { color: COLORS.dim, align: 'center' });
      ui.button(ctx, 'p_close', PX + PW / 2 - bw / 2, PY + PH - 36, bw, 24, 'CLOSE', { click: () => this.closeList(), kind: 'small' });
      return;
    }
    // left: every stage, five to a row
    const gx = PX + 14;
    loc.stages.forEach((s, i) => this.tile(ctx, s, gx + (i % 5) * CELL.w, cy + Math.floor(i / 5) * CELL.h));
    const rows = Math.ceil(loc.stages.length / 5);
    if (!open) ui.text(ctx, `The area opens after stage ${loc.requires}.`, gx, cy + rows * CELL.h + 6, { color: COLORS.bad });
    else ui.text(ctx, 'Clear a stage to open the next.', gx, cy + rows * CELL.h + 6, { color: COLORS.faint });
    // right: the selected stage
    const dx = PX + 14 + 5 * CELL.w + 16;
    ctx.fillStyle = '#a8701e';
    ctx.fillRect(dx - 9, cy - 2, 1, PY + PH - cy - 12);
    if (this.selected) this.details(ctx, this.selected, dx, cy, PX + PW - 14 - dx);
    ui.button(ctx, 'p_close', PX + PW - 14 - 2 * bw - 8, PY + PH - 36, bw, 24, 'CLOSE', { click: () => this.closeList(), kind: 'small' });
    const go = this.selected && stageOpen(p, this.selected.id) ? this.selected : null;
    ui.button(ctx, 'p_go', PX + PW - 14 - bw, PY + PH - 36, bw, 24, 'PREPARE', { click: () => go && this.prepare(go), icon: 'mi_fight', disabled: !go });
  }

  /** One stage in the list: its node, its id, its stars; click to select it. */
  private tile(ctx: CanvasRenderingContext2D, s: StageDef, x: number, y: number) {
    const ui = this.ui;
    const p = this.archivist;
    const open = stageOpen(p, s.id);
    const done = cleared(p, s.id);
    const boss = s.enemies.some((e) => e.boss);
    const kind = !open ? 'node_locked' : boss && !done ? 'node_boss' : done ? 'node_cleared' : 'node_open';
    const r = ui.part(kind);
    const id = 'st_' + s.id;
    const hot = ui.hot(id, x, y, CELL.w, CELL.h - 4);
    const sel = this.selected?.id === s.id;
    const cx = x + CELL.w / 2, ny = y + 8 - (hot ? 1 : 0);
    if (sel) {
      const g = ui.part('node_glow_' + (Math.floor(this.t / 120) % 3));
      blit(ctx, this.a.ui.img, g, cx - Math.floor(g[2] / 2), y + 8 + 10 - Math.floor(g[3] / 2));
    }
    blit(ctx, this.a.ui.img, r, cx - Math.floor(r[2] / 2), ny);
    if (open && kind !== 'node_boss') ui.text(ctx, s.id, cx, ny + 6, { color: done ? '#2a1404' : COLORS.text, align: 'center', outline: done ? '#ffe070' : COLORS.ink });
    if (boss && open) ui.blit(ctx, 'crown', cx - 6, ny - 9);
    const st = p.stars[s.id] ?? 0;
    for (let i = 0; i < 3; i++) ui.blit(ctx, i < st ? 'star_s' : 'star_s_off', cx - 14 + i * 9, y + 31);
    if (!open || kind === 'node_boss') ui.text(ctx, s.id, cx, y + 41, { color: COLORS.faint, align: 'center' });
    ui.regions.push({
      id, x, y, w: CELL.w, h: CELL.h - 4,
      click: () => (this.selected = s),
      tip: () => ({ title: `Stage ${s.id}`, sub: open ? (done ? 'Cleared' : 'Open') : 'Locked', body: open ? '' : 'Clear the previous stage to open it.', color: COLORS.goldHi }),
    });
  }

  /** The selected stage: story, enemies, power and what its first clear brings. */
  private details(ctx: CanvasRenderingContext2D, s: StageDef, x: number, y: number, w: number) {
    const ui = this.ui;
    const p = this.archivist;
    ui.text(ctx, `STAGE ${s.id}`, x, y, { color: COLORS.goldHi, variant: 'bold' });
    const best = p.stars[s.id] ?? 0;
    for (let i = 0; i < 3; i++) ui.blit(ctx, i < best ? 'star_m' : 'star_m_off', x + w - 42 + i * 14, y - 3);
    let cy = y + 14;
    cy += ui.para(ctx, s.blurb, x, cy, w, { color: COLORS.text }) + 6;
    ui.text(ctx, 'ENEMIES', x, cy, { color: COLORS.dim, variant: 'bold' });
    const power = Math.round(s.power * 100);
    ui.text(ctx, `power ${power}%`, x + w, cy, { color: power > 100 ? COLORS.bad : COLORS.dim, align: 'right' });
    cy += 12;
    for (const e of s.enemies) {
      const c = champion(e.champion);
      const pr = this.a.ui.json.portraits[c.id];
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(x, cy, 30, 30);
      ctx.fillStyle = RARITIES[c.rarity].color;
      ctx.fillRect(x + 1, cy + 1, 28, 28);
      blit(ctx, this.a.ui.img, pr, x + 1, cy + 1);
      ui.blit(ctx, 'gem_' + c.affinity, x + 21, cy + 21);
      if (e.boss) ui.blit(ctx, 'crown', x + 9, cy - 5);
      ui.text(ctx, c.name + (e.boss ? '  (BOSS)' : ''), x + 36, cy + 4, { color: e.boss ? '#ffb0a0' : c.color, variant: 'bold' });
      ui.text(ctx, `${c.role}  -  ${AFFINITIES[c.affinity].name}`, x + 36, cy + 16, { color: COLORS.dim });
      ui.regions.push({ x, y: cy, w, h: 30, tip: () => ({ title: c.name, sub: `${RARITIES[c.rarity].name} ${c.role}, ${AFFINITIES[c.affinity].name}`, body: c.skills.map((k) => k.name).join(', '), color: c.color }) });
      cy += 33;
    }
    if (s.recruit) {
      const c = champion(s.recruit);
      const owned = isUnlocked(p, c.id);
      cy += 2;
      ui.text(ctx, owned ? 'RECRUITED' : 'FIRST CLEAR: RECRUIT', x, cy, { color: owned ? COLORS.good : COLORS.goldHi, variant: 'bold' });
      ui.text(ctx, c.name, x + w, cy, { color: RARITIES[c.rarity].color, align: 'right' });
    }
    if (!stageOpen(p, s.id)) ui.text(ctx, 'Clear the previous stage first.', x, PY + PH - 50, { color: COLORS.bad });
  }

  /** The whole world on one screen: every area, the part the camera shows, click to go there. */
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
    // the areas, with their names above them
    const p = this.archivist;
    const banner = ui.part('banner');
    for (const loc of LOCATIONS) {
      const open = locationOpen(p, loc);
      const done = loc.stages.length > 0 && loc.stages.every((s) => cleared(p, s.id));
      const r = ui.part(!open ? 'node_locked' : done ? 'node_cleared' : 'node_open');
      const nx = Math.round(x0 + loc.map.x * k), ny = Math.round(y0 + loc.map.y * k);
      const x = nx - Math.floor(r[2] / 2), y = ny - Math.floor(r[3] / 2);
      const id = 'ov_' + loc.id;
      const hot = ui.hot(id, x - 2, y - 2, r[2] + 4, r[3] + 4);
      this.banner(ctx, loc, nx, y - 6 - banner[3]);
      blit(ctx, this.a.ui.img, r, x, y - (hot ? 1 : 0));
      if (open) ui.text(ctx, loc.chapter, nx, y + 6 - (hot ? 1 : 0), { color: done ? '#2a1404' : COLORS.text, align: 'center', outline: done ? '#ffe070' : COLORS.ink });
      ui.regions.push({
        id, x: x - 2, y: y - 2, w: r[2] + 4, h: r[3] + 4,
        click: () => {
          this.overview = false;
          this.ui.focusId = this.followed = 'loc_' + loc.id;
          this.centerOn(loc);
        },
        tip: () => ({ title: `${loc.chapter}. ${loc.name}`, sub: this.statusOf(loc), body: '', color: COLORS.goldHi }),
      });
    }
    this.header(ctx, 'CAMPAIGN', 'The whole world');
    this.overviewButton(ctx);
    ui.text(ctx, 'Click a place to go there    Arrows: move the frame    M or Esc: back to the map', W / 2, H - 12, { color: COLORS.dim, align: 'center' });
  }
}
