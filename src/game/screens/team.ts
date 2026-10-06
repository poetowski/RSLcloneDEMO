// Team select: your formation stands on podiums in the stage's arena facing
// the enemy line-up. Pick up to three champions from the roster below; every
// card shows how many enemies that champion hits strong (+) or weak (-). A
// roster wider than its panel scrolls sideways (wheel, the end arrows,
// keyboard focus).
import { H, W } from '../../engine/screen';
import { App } from '../app';
import { locationOf, stage } from '../data/campaign';
import { champion, CHAMPIONS } from '../data/champions';
import { affinityEdge, AFFINITIES, RARITIES } from '../data/meta';
import { ChampionDef, StageDef } from '../data/types';
import { isUnlocked, roster } from '../profile';
import { Scroller } from '../ui/scroll';
import { COLORS } from '../ui/ui';
import { blit, nine, Rect4 } from '../view/assets';
import { BaseScreen, Diorama } from './base';

export class TeamScreen extends BaseScreen {
  private s: StageDef;
  private team: string[];
  private diorama: Diorama;
  private strip = new Scroller();

  constructor(app: App, stageId: string) {
    super(app);
    this.s = stage(stageId);
    this.diorama = new Diorama(app, locationOf(stageId).zone);
    const own = roster(this.profile);
    this.team = this.profile.team.filter((id) => own.includes(id)).slice(0, 3);
    if (!this.team.length) this.team = own.slice(0, 3);
    this.ui.focusId = 'fight';
  }

  protected back() {
    this.app.router.campaign(this.s.id);
  }

  protected update(dt: number) {
    this.diorama.update(dt);
    this.strip.update(dt);
  }

  wheel(dy: number, dx: number) {
    const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    this.strip.by(Math.sign(d) * Math.min(138, Math.max(46, Math.abs(d))));
  }

  private matchup(c: ChampionDef) {
    let strong = 0, weak = 0;
    for (const e of this.s.enemies) {
      const edge = affinityEdge(c.affinity, champion(e.champion).affinity);
      if (edge > 0) strong++;
      if (edge < 0) weak++;
    }
    return { strong, weak };
  }

  private toggle(id: string) {
    const i = this.team.indexOf(id);
    if (i >= 0) this.team.splice(i, 1);
    else if (this.team.length < 3) this.team.push(id);
    else this.team[2] = id;
  }

  private fight() {
    if (!this.team.length) return;
    this.profile.team = [...this.team];
    this.app.save();
    this.app.router.battle(this.s.id, this.team);
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    // the formation stands a little higher than in battle so the roster strip never hides it
    const lift = (pts: [number, number][]) => pts.map(([x, y]) => [x, y - 22] as [number, number]);
    const sp = { player: lift(this.diorama.view.json.spawns.player), enemy: lift(this.diorama.view.json.spawns.enemy) };
    const d = this.diorama;
    d.figures = [];
    this.team.forEach((id, i) => d.figures.push({ id, x: sp.player[i][0], y: sp.player[i][1], facing: 'R', phase: i * 300 }));
    this.s.enemies.forEach((e, i) => d.figures.push({ id: e.champion, x: sp.enemy[i][0], y: sp.enemy[i][1], facing: 'L', phase: i * 200 + 90 }));
    d.draw(ctx, this.t, 0.22, (c) => {
      for (let i = 0; i < 3; i++) {
        const r = ui.part('podium');
        blit(c, this.a.ui.img, r, sp.player[i][0] - r[2] / 2, sp.player[i][1] - 12);
      }
    });

    // labels under the formation and the enemies
    for (let i = 0; i < 3; i++) {
      const [x, y] = sp.player[i];
      const id = this.team[i];
      if (!id) {
        ui.text(ctx, '+', x, y - 34, { color: COLORS.goldHi, variant: 'bold', scale: 2, align: 'center' });
        ui.text(ctx, 'EMPTY', x, y - 12, { color: COLORS.dim, align: 'center' });
        continue;
      }
      const c = champion(id);
      ui.blit(ctx, 'gem_' + c.affinity, x - ui.measure(c.name) / 2 - 13, y + 11);
      ui.text(ctx, c.name, x, y + 12, { color: c.color, align: 'center' });
      ui.regions.push({ id: 'slot' + i, x: x - 24, y: y - 72, w: 48, h: 80, click: () => this.toggle(id), tip: () => ({ title: c.name, sub: 'Click to remove', body: c.title, color: c.color }) });
    }
    this.s.enemies.forEach((e, i) => {
      const [x, y] = sp.enemy[i];
      const c = champion(e.champion);
      ui.blit(ctx, 'gem_' + c.affinity, x - ui.measure(c.name) / 2 - 13, y + 11);
      ui.text(ctx, c.name, x, y + 12, { color: e.boss ? '#ffb0a0' : COLORS.text, align: 'center' });
      if (e.boss) ui.blit(ctx, 'crown', x - 6, y - 92);
      ui.regions.push({ x: x - 24, y: y - 72, w: 48, h: 80, tip: () => ({ title: c.name + (e.boss ? ' (Boss)' : ''), sub: `${RARITIES[c.rarity].name} ${c.role}, ${AFFINITIES[c.affinity].name}`, body: c.skills.map((k) => `${k.name}: ${k.desc}`).join(' '), color: c.color }) });
    });

    this.header(ctx, 'PREPARE', `${this.s.id}  ${this.s.name}`);

    // roster strip: centered when it fits, otherwise a window that scrolls between two arrows
    const own = CHAMPIONS.filter((c) => isUnlocked(this.profile, c.id));
    const cw = 40, chh = 48, gap = 6;
    const stripW = own.length * (cw + gap) - gap;
    // the title row has its own band so cards never cover it
    const px = 10, py = H - 72, pw = W - 20 - 118, ph = 64;
    ui.panel(ctx, 'dark', px, py, pw, ph);
    ui.text(ctx, `ROSTER  ${this.team.length}/3`, px + 10, py + 5, { color: COLORS.dim, variant: 'bold' });
    ui.text(ctx, '+ strong hits   - weak hits', px + pw - 10, py + 5, { color: COLORS.faint, align: 'right' });
    const scrolls = stripW > pw - 16;
    const win: Rect4 = scrolls ? [px + 20, py + 8, pw - 40, ph - 10] : [px, py, pw, ph];
    this.strip.extent(scrolls ? stripW : 0, win[2]);
    const focused = own.findIndex((c) => 'r_' + c.id === ui.focusId);
    if (ui.keyboard && focused >= 0) this.strip.reveal(focused * (cw + gap), cw, win[2]);
    let x = scrolls ? win[0] - this.strip.offset : Math.round(px + pw / 2 - stripW / 2);
    const y = py + 15;
    ctx.save();
    ctx.beginPath();
    ctx.rect(...win);
    ctx.clip();
    for (const c of own) {
      const sel = this.team.includes(c.id);
      const id = 'r_' + c.id;
      const hot = ui.hot(id, x, y, cw, chh, win);
      const top = y + (sel ? -2 : 0);
      ctx.fillStyle = sel ? '#2a3a5a' : '#141c30';
      ctx.fillRect(x + 2, top + 2, cw - 4, chh - 4);
      blit(ctx, this.a.ui.img, this.a.ui.json.portraits[c.id], x + 6, top + 4);
      nine(ctx, this.a.ui.img, ui.part('card_' + c.rarity), x, top, cw, chh, 8);
      ui.blit(ctx, 'gem_' + c.affinity, x + 3, top + 24);
      const m = this.matchup(c);
      if (m.strong) ui.text(ctx, `+${m.strong}`, x + 6, top + 35, { color: COLORS.good, variant: 'bold' });
      if (m.weak) ui.text(ctx, `-${m.weak}`, x + cw - 6, top + 35, { color: COLORS.bad, variant: 'bold', align: 'right' });
      if (sel) ui.blit(ctx, 'check', x + cw - 11, top + 2);
      if (hot) {
        ctx.strokeStyle = COLORS.goldHi;
        ctx.strokeRect(x + 0.5, top + 0.5, cw - 1, chh - 1);
      }
      if (this.profile.fresh.includes(c.id)) ui.blit(ctx, 'new', x + cw - 16, top - 5);
      ui.regions.push({
        id, x, y: top, w: cw, h: chh, clip: win,
        click: () => this.toggle(c.id),
        tip: () => {
          const strong = this.s.enemies.filter((e) => affinityEdge(c.affinity, champion(e.champion).affinity) > 0).map((e) => champion(e.champion).name);
          const weak = this.s.enemies.filter((e) => affinityEdge(c.affinity, champion(e.champion).affinity) < 0).map((e) => champion(e.champion).name);
          return {
            title: c.name,
            sub: `${RARITIES[c.rarity].name} ${c.role}, ${AFFINITIES[c.affinity].name}`,
            body: [strong.length ? `Strong against ${strong.join(', ')}.` : '', weak.length ? `Weak against ${weak.join(', ')}.` : '', !strong.length && !weak.length ? 'Neutral against this line-up.' : ''].join(' ').trim(),
            color: c.color,
          };
        },
      });
      x += cw + gap;
    }
    ctx.restore();
    if (scrolls) {
      // page by most of the window; an arrow dims when there is nothing more on its side
      const page = win[2] - cw;
      for (const [part, ax, more, d] of [['arrow_l', px + 5, this.strip.before, -1], ['arrow_r', px + pw - 15, this.strip.after, 1]] as const) {
        const ay = py + 31;
        const hot = more && ui.inside(ax - 4, ay - 6, 18, 27);
        ctx.globalAlpha = more ? 1 : 0.3;
        ui.blit(ctx, part, ax + (hot ? d : 0), ay);
        ctx.globalAlpha = 1;
        if (more) ui.regions.push({ x: ax - 4, y: ay - 6, w: 18, h: 27, click: () => this.strip.by(d * page) });
      }
    }
    ui.button(ctx, 'fight', W - 124, H - 62, 114, 46, 'FIGHT!', { click: () => this.fight(), icon: 'mi_fight', disabled: !this.team.length });
  }

  key(k: string) {
    if (k === 'Enter' && this.ui.focusId === null) {
      this.fight();
      return;
    }
    super.key(k);
  }
}
