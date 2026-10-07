// Battle heads-up display, built on the shared UI kit: turn meter, unit bars
// and status rows, the active champion panel, skill slots, banners, the
// title cards, the pause menu and the results panel.
import { H, W } from '../../engine/screen';
import { RARITIES } from '../data/meta';
import { STATUSES } from '../data/statuses';
import { ChampionDef, SkillDef } from '../data/types';
import { COLORS, Ui } from '../ui/ui';
import { Assets, blit, nine } from './assets';
import { UnitView } from './unit';

export interface SkillSlot {
  skill: SkillDef;
  cooldown: number;
  selected: boolean;
}

export interface ResultsInfo {
  victory: boolean;
  stars: number;
  stageId?: string;
  stageName?: string;
  /** champion recruited by this first clear */
  recruit?: ChampionDef;
  firstClear?: boolean;
  turns: number;
}

export class Hud extends Ui {
  bannerText = '';
  bannerT = -1;
  bannerColor = '#ffe9a0';
  title: { text: string; sub?: string; color: string; grad: string; t: number } | null = null;

  constructor(a: Assets) {
    super(a);
  }

  /** Turn meter track with sliding champion chips (allies above, enemies below). */
  drawTurnMeter(ctx: CanvasRenderingContext2D, units: UnitView[], active?: UnitView) {
    const x0 = 196, x1 = 444, y = 30;
    const w = x1 - x0;
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(x0 - 2, y - 2, w + 4, 6);
    ctx.fillStyle = '#1c2438';
    ctx.fillRect(x0 - 1, y - 1, w + 2, 4);
    for (let i = 0; i < w; i += 2) {
      const k = i / w;
      ctx.fillStyle = k > 0.92 ? '#f0c650' : k > 0.6 ? '#3e5682' : '#2a3a5a';
      ctx.fillRect(x0 + i, y, 1, 2);
    }
    const ui = this.a.ui.img;
    blit(ctx, ui, this.part('chevron_gold'), x1 - 5, y - 11);
    const order = [...units].filter((u) => !u.dead).sort((a, b) => a.tm - b.tm);
    for (const u of order) {
      const above = u.team === 'player';
      const cx = Math.round(x0 + (Math.min(100, u.tm) / 100) * w);
      const cy = above ? y - 27 : y + 6;
      const isActive = u === active;
      const p = this.a.ui.json.portraits[u.champion.id];
      const border = isActive ? '#ffe070' : above ? '#4f8ae6' : '#d84a4a';
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(cx - 12, cy - 1, 24, 24);
      ctx.fillStyle = border;
      ctx.fillRect(cx - 11, cy, 22, 22);
      ctx.drawImage(ui, p[0] + 4, p[1] + 1, 20, 20, cx - 10, cy + 1, 20, 20);
      if (u.boss) blit(ctx, ui, this.part('crown'), cx - 6, above ? cy - 8 : cy + 15);
      ctx.fillStyle = border;
      if (above) ctx.fillRect(cx, cy + 23, 1, y - cy - 23);
      else ctx.fillRect(cx, y + 3, 1, cy - y - 4);
    }
  }

  drawTopBar(ctx: CanvasRenderingContext2D, zone: string, stage: string, turn: number) {
    this.text(ctx, zone.toUpperCase(), 8, 6, { color: COLORS.gold, variant: 'bold' });
    this.text(ctx, `${stage}   Turn ${turn}`, 8, 18, { color: COLORS.dim });
  }

  /** Small icon buttons in the top-right corner. */
  drawControls(ctx: CanvasRenderingContext2D, state: { auto: boolean; speed: number; paused: boolean }, on: { auto: () => void; speed: () => void; pause: () => void }) {
    const btn = (id: string, x: number, label: string, glyph: string, lit: boolean, click: () => void, tip: string) => {
      const w = 40, h = 16, y = 6;
      const hot = this.hot(id, x, y, w, h);
      nine(ctx, this.a.ui.img, this.part(lit || hot ? 'btn_hover' : 'btn_up'), x, y, w, h, 4);
      blit(ctx, this.a.ui.img, this.part('g_' + glyph), x + 5, y + 4);
      this.text(ctx, label, x + 14, y + 4, { color: lit ? COLORS.goldHi : '#d8e2f4' });
      this.regions.push({ id, x, y, w, h, click, tip: () => ({ title: tip, body: '' }) });
    };
    btn('ctl_auto', W - 136, 'AUTO', 'auto', state.auto, on.auto, 'Auto battle (A)');
    btn('ctl_speed', W - 92, `x${state.speed}`, 'speed', state.speed > 1, on.speed, 'Battle speed (S)');
    btn('ctl_pause', W - 48, 'MENU', 'pause', state.paused, on.pause, 'Pause menu (Esc)');
  }

  /** HP / shield / TM bars and status icons above a unit; bosses get a wider, crowned bar. */
  drawUnitBars(ctx: CanvasRenderingContext2D, u: UnitView) {
    if (u.dead && u.alpha <= 0.05) return;
    const w = u.boss ? 48 : 34;
    const x = Math.round(u.x - w / 2);
    const y = Math.round(u.y - u.h - u.spriteH - 10);
    ctx.globalAlpha = u.dead ? u.alpha : 1;
    if (u.boss) {
      ctx.fillStyle = '#a8701e';
      ctx.fillRect(x - 2, y - 2, w + 4, 9);
      blit(ctx, this.a.ui.img, this.part('crown'), u.x - 6, y - 25);
    }
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(x - 1, y - 1, w + 2, 7);
    ctx.fillStyle = '#2a1018';
    ctx.fillRect(x, y, w, 4);
    const lag = Math.round((u.lagHp / u.maxHp) * w);
    const hp = Math.round((u.hp / u.maxHp) * w);
    ctx.fillStyle = '#fff0d0';
    ctx.fillRect(x, y, lag, 4);
    ctx.fillStyle = u.team === 'player' ? '#3ccf5a' : '#e0453a';
    ctx.fillRect(x, y, hp, 4);
    ctx.fillStyle = u.team === 'player' ? '#9dff9a' : '#ff9a8a';
    ctx.fillRect(x, y, hp, 1);
    if (u.shield > 0) {
      const sw = Math.min(w, Math.round((u.shield / u.maxHp) * w));
      ctx.fillStyle = '#ffe48a';
      ctx.fillRect(x, y - 3, sw, 2);
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(x - 1, y - 4, sw + 2, 1);
    }
    ctx.fillStyle = '#1a2a44';
    ctx.fillRect(x, y + 4, w, 1);
    ctx.fillStyle = '#5ab4ff';
    ctx.fillRect(x, y + 4, Math.round((Math.min(100, u.tm) / 100) * w), 1);
    const sts = [...u.statuses].sort((a, b) => Number(STATUSES[b.id].buff) - Number(STATUSES[a.id].buff)).slice(0, 5);
    const ix = Math.round(u.x - (sts.length * 12) / 2);
    sts.forEach((s, i) => {
      const r = this.a.ui.json.status[s.id].rect;
      blit(ctx, this.a.ui.img, r, ix + i * 12, y - 15);
      if (s.turns < 9) this.tinyNum(ctx, s.turns, ix + i * 12 + 8, y - 8);
    });
    ctx.globalAlpha = 1;
  }

  drawMarkers(ctx: CanvasRenderingContext2D, u: UnitView, kind: 'active' | 'target' | 'heal' | 'ally' | 'enemy', t: number, hovered: boolean) {
    const name = kind === 'ally' ? 'ring_ally' : kind === 'enemy' ? 'ring_enemy' : `ring_${kind}_${Math.floor(t / 110) % 3}`;
    const r = this.part(name);
    blit(ctx, this.a.ui.img, r, u.x - r[2] / 2, u.y - r[3] / 2 + 1);
    if (hovered && kind !== 'active') {
      const c = this.part(kind === 'heal' ? 'chevron_green' : 'chevron_red');
      const bob = Math.round(Math.sin(t / 120) * 2);
      blit(ctx, this.a.ui.img, c, u.x - c[2] / 2, u.y - u.spriteH - 30 + bob - (u.boss ? 10 : 0));
    }
  }

  /** Active champion panel (bottom-left). */
  drawHeroPanel(ctx: CanvasRenderingContext2D, u: UnitView) {
    const x = 6, y = H - 58, w = 186, h = 52;
    nine(ctx, this.a.ui.img, this.part(u.team === 'player' ? 'panel' : 'panel_red'), x, y, w, h, 6);
    const c = u.champion;
    const p = this.a.ui.json.portraits[c.id];
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(x + 6, y + 6, 32, 32);
    ctx.fillStyle = RARITIES[c.rarity].color;
    ctx.fillRect(x + 7, y + 7, 30, 30);
    blit(ctx, this.a.ui.img, p, x + 8, y + 8);
    blit(ctx, this.a.ui.img, this.part('gem_' + c.affinity), x + 30, y + 30);
    this.text(ctx, c.name, x + 44, y + 6, { color: c.color, variant: 'bold' });
    this.text(ctx, c.title, x + 44, y + 17, { color: COLORS.dim });
    const bx = x + 44, by = y + 29, bw = 134;
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
    ctx.fillStyle = '#2a1018';
    ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = '#fff0d0';
    ctx.fillRect(bx, by, Math.round((u.lagHp / u.maxHp) * bw), 5);
    ctx.fillStyle = u.team === 'player' ? '#3ccf5a' : '#e0453a';
    ctx.fillRect(bx, by, Math.round((u.hp / u.maxHp) * bw), 5);
    this.text(ctx, `${Math.max(0, Math.round(u.hp))} / ${u.maxHp}`, bx + bw, by + 7, { color: '#d8e2f4', align: 'right' });
    u.statuses.slice(0, 5).forEach((s, i) => {
      const r = this.a.ui.json.status[s.id].rect;
      const sx = bx + i * 13, sy = by + 8;
      blit(ctx, this.a.ui.img, r, sx, sy);
      if (s.turns < 9) this.tinyNum(ctx, s.turns, sx + 8, sy + 7);
      this.regions.push({ x: sx, y: sy, w: 12, h: 12, tip: () => ({ title: STATUSES[s.id].name, sub: `${s.turns} turn${s.turns === 1 ? '' : 's'}`, body: STATUSES[s.id].desc, color: STATUSES[s.id].color }) });
    });
    blit(ctx, this.a.ui.img, this.part('role_' + c.role), x + w - 16, y + 6);
  }

  /** Skill slots for the champion whose turn it is. */
  drawSkills(ctx: CanvasRenderingContext2D, slots: SkillSlot[], onPick: (s: SkillDef) => void, t: number) {
    const S = 48, gap = 4;
    const x0 = W - 8 - slots.length * S - (slots.length - 1) * gap, y0 = H - 8 - S;
    slots.forEach((sl, i) => {
      const x = x0 + i * (S + gap);
      const y = y0 + (sl.selected ? -3 : 0);
      const icon = this.a.ui.json.icons[sl.skill.id];
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(x + 3, y + 3, S - 6, S - 6);
      blit(ctx, this.a.ui.img, icon, x + 4, y + 4);
      const off = sl.cooldown > 0;
      if (off) {
        ctx.fillStyle = 'rgba(6,8,14,0.72)';
        ctx.fillRect(x + 4, y + 4, 40, 40);
        this.text(ctx, String(sl.cooldown), x + S / 2, y + 16, { color: '#ffffff', variant: 'display', align: 'center' });
      }
      const hov = this.hot('skill' + i, x, y, S, S);
      blit(ctx, this.a.ui.img, this.part(off ? 'frame_off' : sl.selected ? 'frame_sel' : 'frame_idle'), x, y);
      if (sl.selected && !off) {
        const k = Math.floor(t / 90) % 4;
        ctx.fillStyle = '#fff6c0';
        ctx.fillRect(x + [2, S - 3, S - 3, 2][k], y + [2, 2, S - 3, S - 3][k], 1, 1);
      }
      this.text(ctx, String(i + 1), x + 5, y + S - 12, { color: hov ? COLORS.goldHi : '#c0cbe0' });
      this.regions.push({
        id: 'skill' + i,
        x, y, w: S, h: S,
        click: () => !off && onPick(sl.skill),
        tip: () => ({
          title: sl.skill.name,
          sub: `${sl.skill.tag}${sl.skill.cooldown ? `  -  Cooldown ${sl.skill.cooldown}` : ''}${off ? `  (ready in ${sl.cooldown})` : ''}`,
          body: sl.skill.desc,
          color: COLORS.goldHi,
        }),
      });
    });
  }

  drawPrompt(ctx: CanvasRenderingContext2D, text: string) {
    const w = this.measure(text) + 16;
    const x = W - 8 - w, y = H - 74;
    nine(ctx, this.a.ui.img, this.part('panel'), x, y, w, 15, 5);
    this.text(ctx, text, x + 8, y + 3, { color: '#d8e2f4' });
  }

  showBanner(text: string, color = '#ffe9a0') {
    this.bannerText = text;
    this.bannerColor = color;
    this.bannerT = 0;
  }

  drawBanner(ctx: CanvasRenderingContext2D, dt: number) {
    if (this.bannerT < 0) return;
    this.bannerT += dt;
    const t = this.bannerT;
    if (t > 1500) {
      this.bannerT = -1;
      return;
    }
    const tw = this.measure(this.bannerText, 'bold');
    const w = tw + 44;
    const slide = t < 160 ? 1 - t / 160 : t > 1300 ? (t - 1300) / 200 : 0;
    const x = Math.round(W / 2 - w / 2), y = 64;
    ctx.globalAlpha = 1 - slide;
    const b = this.part('banner');
    ctx.drawImage(this.a.ui.img, b[0], b[1], 12, b[3], x, y, 12, b[3]);
    ctx.drawImage(this.a.ui.img, b[0] + 12, b[1], 8, b[3], x + 12, y, w - 24, b[3]);
    ctx.drawImage(this.a.ui.img, b[0] + b[2] - 12, b[1], 12, b[3], x + w - 12, y, 12, b[3]);
    this.text(ctx, this.bannerText, W / 2, y + 5, { color: this.bannerColor, variant: 'bold', align: 'center' });
    ctx.globalAlpha = 1;
  }

  showTitle(text: string, color: string, grad: string, sub?: string) {
    this.title = { text, sub, color, grad, t: 0 };
  }

  drawTitle(ctx: CanvasRenderingContext2D, dt: number) {
    if (!this.title) return;
    const tt = this.title;
    tt.t += dt;
    const scale = 2;
    const pop = tt.t < 180 ? 0.6 + (tt.t / 180) * 0.4 : 1;
    const y = 120;
    ctx.globalAlpha = Math.min(1, tt.t / 120);
    this.a.font.draw(ctx, tt.text, W / 2, y - (scale * this.a.font.height('display') * pop) / 2, { color: tt.color, gradient: tt.grad, variant: 'display', scale: Math.max(1, Math.round(scale * pop)), align: 'center', outline: COLORS.ink, shadow: '#3a1e06' });
    if (tt.sub) this.text(ctx, tt.sub, W / 2, y + 26, { color: '#d8e2f4', align: 'center' });
    ctx.globalAlpha = 1;
  }

  /** Pause menu. */
  drawPause(ctx: CanvasRenderingContext2D, on: { resume: () => void; retreat: () => void; auto: () => void; speed: () => void }, state: { auto: boolean; speed: number }, canRetreat: boolean) {
    this.dim(ctx, 0.62);
    const w = 180, h = canRetreat ? 150 : 124, x = W / 2 - w / 2, y = H / 2 - h / 2;
    this.panel(ctx, 'gold', x, y, w, h);
    this.text(ctx, 'PAUSED', W / 2, y + 10, { color: COLORS.goldHi, variant: 'display', align: 'center' });
    this.divider(ctx, x + 14, y + 32, w - 28);
    let by = y + 44;
    this.button(ctx, 'p_resume', x + 20, by, w - 40, 22, 'RESUME', { click: on.resume, icon: 'mi_play' });
    by += 26;
    this.button(ctx, 'p_auto', x + 20, by, (w - 44) / 2, 22, state.auto ? 'AUTO ON' : 'AUTO OFF', { click: on.auto, kind: 'small', active: state.auto });
    this.button(ctx, 'p_speed', x + 24 + (w - 44) / 2, by, (w - 44) / 2, 22, `SPEED x${state.speed}`, { click: on.speed, kind: 'small' });
    by += 26;
    if (canRetreat) {
      this.button(ctx, 'p_retreat', x + 20, by, w - 40, 22, 'RETREAT', { click: on.retreat, icon: 'mi_back', color: COLORS.bad });
      by += 26;
    }
    this.text(ctx, 'Esc to resume', W / 2, by + 4, { color: COLORS.faint, align: 'center' });
  }

  /** Victory / defeat panel with stars, the first-clear recruit and the way out. */
  drawResults(ctx: CanvasRenderingContext2D, r: ResultsInfo, t: number, on: { next: () => void; retry: () => void; map: () => void }) {
    this.dim(ctx, Math.min(0.55, t / 600));
    if (t < 300) return;
    const w = 260, h = r.victory ? (r.recruit ? 176 : 150) : 142;
    const x = W / 2 - w / 2, y = 64;
    this.panel(ctx, r.victory ? 'gold' : 'red', x, y, w, h);
    const pop = Math.min(1, (t - 300) / 200);
    this.a.font.draw(ctx, r.victory ? 'VICTORY' : 'DEFEAT', W / 2, y + 8, { color: r.victory ? '#fff6c0' : '#ffd0c0', gradient: r.victory ? '#f0a020' : '#c02020', variant: 'display', scale: pop < 1 ? 1 : 2, align: 'center', outline: COLORS.ink, shadow: '#3a1e06' });
    let cy = y + 42;
    if (r.stageName) {
      this.text(ctx, `${r.stageId}  ${r.stageName}`, W / 2, cy, { color: COLORS.dim, align: 'center' });
      cy += 14;
    }
    if (r.victory) {
      // stars pop in one by one
      for (let i = 0; i < 3; i++) {
        const due = 600 + i * 260;
        const got = i < r.stars && t > due;
        const sx = W / 2 - 46 + i * 34, sy = cy + (i === 1 ? -4 : 0);
        blit(ctx, this.a.ui.img, this.part(got ? 'star_l' : 'star_l_off'), sx, sy);
      }
      cy += 32;
      this.text(ctx, r.stars === 3 ? 'Flawless: nobody fell.' : r.stars === 2 ? 'One champion fell.' : 'Several champions fell.', W / 2, cy, { color: COLORS.text, align: 'center' });
      cy += 14;
      if (r.recruit && t > 1500) {
        const c = r.recruit;
        this.text(ctx, 'FIRST CLEAR REWARD', W / 2, cy, { color: COLORS.goldHi, variant: 'bold', align: 'center' });
        cy += 11;
        this.text(ctx, `${c.name} joins your cause!`, W / 2, cy, { color: RARITIES[c.rarity].color, align: 'center' });
        cy += 14;
      } else if (r.recruit) cy += 25;
    } else {
      this.para(ctx, 'Your champions have fallen. Check affinities and buffs in the Academy, pick a different team and try again.', x + 18, cy + 4, w - 36, { color: COLORS.text });
      cy += 44;
    }
    if (t > 900) {
      const bw = 104;
      if (r.victory) {
        this.button(ctx, 'r_next', W / 2 - bw / 2 - (r.recruit ? 0 : 0), y + h - 30, bw, 22, r.recruit ? 'MEET THEM' : 'CONTINUE', { click: on.next, icon: 'mi_play' });
      } else {
        this.button(ctx, 'r_retry', W / 2 - bw - 4, y + h - 30, bw, 22, 'RETRY', { click: on.retry, icon: 'mi_fight' });
        this.button(ctx, 'r_map', W / 2 + 4, y + h - 30, bw, 22, 'MAP', { click: on.map, icon: 'mi_back' });
      }
    }
  }
}
