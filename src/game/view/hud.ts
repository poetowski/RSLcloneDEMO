// Heads-up display. Everything is drawn in the 640x360 buffer with the pixel
// font and generated UI parts. Clickable regions are rebuilt every frame.
import { TextStyle } from '../../engine/font';
import { H, W } from '../../engine/screen';
import { STATUSES } from '../data/statuses';
import { SkillDef } from '../data/types';
import { Assets, blit, nine, Rect4 } from './assets';
import { UnitView } from './unit';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
  click?: () => void;
  hover?: () => void;
  /** tooltip content shown while hovered */
  tip?: () => { title: string; sub?: string; body: string; color?: string };
  /** place the tooltip under the region instead of above it */
  tipBelow?: boolean;
}

export interface SkillSlot {
  skill: SkillDef;
  cooldown: number;
  selected: boolean;
}

const TINY: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
};

export class Hud {
  regions: Region[] = [];
  mouse = { x: -1, y: -1 };
  bannerText = '';
  bannerT = -1;
  bannerColor = '#ffe9a0';
  title: { text: string; sub?: string; color: string; grad: string; t: number } | null = null;

  constructor(private a: Assets) {}

  part(name: string): Rect4 {
    return this.a.ui.json.parts[name];
  }

  text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, st: TextStyle = {}) {
    return this.a.font.draw(ctx, s, x, y, { outline: '#07080e', ...st });
  }

  tinyNum(ctx: CanvasRenderingContext2D, n: number, x: number, y: number, color = '#ffffff') {
    const s = String(n);
    let cx = x;
    for (const ch of s) {
      const g = TINY[ch];
      if (!g) continue;
      ctx.fillStyle = '#07080e';
      ctx.fillRect(cx - 1, y - 1, 5, 7);
      ctx.fillStyle = color;
      g.forEach((row, yy) => [...row].forEach((c, xx) => c === '#' && ctx.fillRect(cx + xx, y + yy, 1, 1)));
      cx += 4;
    }
  }

  beginFrame() {
    this.regions = [];
  }

  hit(x: number, y: number): Region | undefined {
    for (let i = this.regions.length - 1; i >= 0; i--) {
      const r = this.regions[i];
      if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r;
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------

  /** Turn meter track with sliding hero chips (allies above, enemies below). */
  drawTurnMeter(ctx: CanvasRenderingContext2D, units: UnitView[], active?: UnitView) {
    const x0 = 196, x1 = 444, y = 30;
    const w = x1 - x0;
    ctx.fillStyle = '#07080e';
    ctx.fillRect(x0 - 2, y - 2, w + 4, 6);
    ctx.fillStyle = '#1c2438';
    ctx.fillRect(x0 - 1, y - 1, w + 2, 4);
    // graduated fill toward the action end
    for (let i = 0; i < w; i += 2) {
      const k = i / w;
      ctx.fillStyle = k > 0.92 ? '#f0c650' : k > 0.6 ? '#3e5682' : '#2a3a5a';
      ctx.fillRect(x0 + i, y, 1, 2);
    }
    // gold end cap
    const ui = this.a.ui.img;
    blit(ctx, ui, this.part('chevron_gold'), x1 - 5, y - 11);
    const order = [...units].filter((u) => !u.dead).sort((a, b) => a.tm - b.tm);
    for (const u of order) {
      const above = u.team === 'player';
      const cx = Math.round(x0 + (Math.min(100, u.tm) / 100) * w);
      const cy = above ? y - 27 : y + 6;
      const isActive = u === active;
      const p = this.a.ui.json.portraits[u.hero.id];
      // 20x20 face crop of the portrait inside a colored rim
      const border = isActive ? '#ffe070' : above ? '#4f8ae6' : '#d84a4a';
      ctx.fillStyle = '#07080e';
      ctx.fillRect(cx - 12, cy - 1, 24, 24);
      ctx.fillStyle = border;
      ctx.fillRect(cx - 11, cy, 22, 22);
      ctx.drawImage(ui, p[0] + 4, p[1] + 1, 20, 20, cx - 10, cy + 1, 20, 20);
      // stem to the track
      ctx.fillStyle = border;
      if (above) ctx.fillRect(cx, cy + 23, 1, y - cy - 23);
      else ctx.fillRect(cx, y + 3, 1, cy - y - 4);
    }
  }

  drawTopBar(ctx: CanvasRenderingContext2D, zone: string, turn: number) {
    this.text(ctx, zone.toUpperCase(), 8, 6, { color: '#f0c650', variant: 'bold' });
    this.text(ctx, `Stage 1-1   Turn ${turn}`, 8, 18, { color: '#9fb0cc' });
  }

  /** Small icon buttons in the top-right corner. */
  drawControls(ctx: CanvasRenderingContext2D, state: { auto: boolean; speed: number; paused: boolean }, on: { auto: () => void; speed: () => void; pause: () => void }) {
    const btn = (x: number, label: string, glyph: string, lit: boolean, click: () => void, tip: string) => {
      const w = 40, h = 16, y = 6;
      const hov = this.inside(x, y, w, h);
      nine(ctx, this.a.ui.img, this.part(lit ? 'btn_hover' : hov ? 'btn_hover' : 'btn_up'), x, y, w, h, 4);
      const g = this.part('g_' + glyph);
      blit(ctx, this.a.ui.img, g, x + 5, y + 4);
      this.text(ctx, label, x + 14, y + 4, { color: lit ? '#ffe070' : '#d8e2f4' });
      this.regions.push({ x, y, w, h, click, tip: () => ({ title: tip, body: '' }) });
    };
    btn(W - 136, 'AUTO', 'auto', state.auto, on.auto, 'Auto battle (A)');
    btn(W - 92, `x${state.speed}`, 'speed', state.speed > 1, on.speed, 'Battle speed (S)');
    btn(W - 48, state.paused ? 'PLAY' : 'STOP', state.paused ? 'play' : 'pause', state.paused, on.pause, 'Pause (P)');
  }

  inside(x: number, y: number, w: number, h: number) {
    return this.mouse.x >= x && this.mouse.y >= y && this.mouse.x < x + w && this.mouse.y < y + h;
  }

  /** HP / shield / TM bars and status icons above a unit. */
  drawUnitBars(ctx: CanvasRenderingContext2D, u: UnitView) {
    if (u.dead && u.alpha <= 0.05) return;
    const w = 34;
    const x = Math.round(u.x - w / 2);
    const y = Math.round(u.y - u.h - u.spriteH - 10);
    ctx.globalAlpha = u.dead ? u.alpha : 1;
    ctx.fillStyle = '#07080e';
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
      ctx.fillStyle = '#07080e';
      ctx.fillRect(x - 1, y - 4, sw + 2, 1);
    }
    // turn meter
    ctx.fillStyle = '#1a2a44';
    ctx.fillRect(x, y + 4, w, 1);
    ctx.fillStyle = '#5ab4ff';
    ctx.fillRect(x, y + 4, Math.round((Math.min(100, u.tm) / 100) * w), 1);
    // statuses (buffs first)
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
      blit(ctx, this.a.ui.img, c, u.x - c[2] / 2, u.y - u.spriteH - 30 + bob);
    }
  }

  /** Active hero panel (bottom-left). */
  drawHeroPanel(ctx: CanvasRenderingContext2D, u: UnitView) {
    const x = 6, y = H - 58, w = 186, h = 52;
    nine(ctx, this.a.ui.img, this.part(u.team === 'player' ? 'panel' : 'panel_red'), x, y, w, h, 6);
    const p = this.a.ui.json.portraits[u.hero.id];
    ctx.fillStyle = '#07080e';
    ctx.fillRect(x + 6, y + 6, 32, 32);
    ctx.fillStyle = u.hero.color;
    ctx.fillRect(x + 7, y + 7, 30, 30);
    blit(ctx, this.a.ui.img, p, x + 8, y + 8);
    this.text(ctx, u.hero.name, x + 44, y + 6, { color: u.hero.color, variant: 'bold' });
    this.text(ctx, `${u.hero.title}`, x + 44, y + 17, { color: '#9fb0cc' });
    // HP bar
    const bx = x + 44, by = y + 29, bw = 134;
    ctx.fillStyle = '#07080e';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
    ctx.fillStyle = '#2a1018';
    ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = '#fff0d0';
    ctx.fillRect(bx, by, Math.round((u.lagHp / u.maxHp) * bw), 5);
    ctx.fillStyle = u.team === 'player' ? '#3ccf5a' : '#e0453a';
    ctx.fillRect(bx, by, Math.round((u.hp / u.maxHp) * bw), 5);
    this.text(ctx, `${Math.max(0, Math.round(u.hp))} / ${u.maxHp}`, bx + bw, by + 7, { color: '#d8e2f4', align: 'right' });
    // statuses with hover tips
    u.statuses.slice(0, 6).forEach((s, i) => {
      const r = this.a.ui.json.status[s.id].rect;
      const sx = x + 8 + i * 13, sy = y + h - 14;
      if (sx > x + 40) return;
      blit(ctx, this.a.ui.img, r, sx, sy);
      this.regions.push({ x: sx, y: sy, w: 12, h: 12, tip: () => ({ title: STATUSES[s.id].name, sub: `${s.turns} turn${s.turns === 1 ? '' : 's'}`, body: STATUSES[s.id].desc, color: STATUSES[s.id].color }) });
    });
    this.text(ctx, u.hero.role.toUpperCase(), bx, by + 7, { color: '#6f7f9c' });
  }

  /** Skill slots for the hero whose turn it is. */
  drawSkills(ctx: CanvasRenderingContext2D, slots: SkillSlot[], onPick: (s: SkillDef) => void, t: number) {
    const S = 48, gap = 4;
    const x0 = W - 8 - slots.length * S - (slots.length - 1) * gap, y0 = H - 8 - S;
    slots.forEach((sl, i) => {
      const x = x0 + i * (S + gap);
      const lift = sl.selected ? -3 : 0;
      const y = y0 + lift;
      const icon = this.a.ui.json.icons[sl.skill.id];
      ctx.fillStyle = '#07080e';
      ctx.fillRect(x + 3, y + 3, S - 6, S - 6);
      blit(ctx, this.a.ui.img, icon, x + 4, y + 4);
      const off = sl.cooldown > 0;
      if (off) {
        ctx.fillStyle = 'rgba(6,8,14,0.72)';
        ctx.fillRect(x + 4, y + 4, 40, 40);
        this.text(ctx, String(sl.cooldown), x + S / 2, y + 16, { color: '#ffffff', variant: 'bold', scale: 2, align: 'center' });
      }
      const hov = this.inside(x, y, S, S);
      blit(ctx, this.a.ui.img, this.part(off ? 'frame_off' : sl.selected ? 'frame_sel' : 'frame_idle'), x, y);
      if (sl.selected && !off) {
        // shimmering corner sparkle
        const k = Math.floor(t / 90) % 4;
        ctx.fillStyle = '#fff6c0';
        ctx.fillRect(x + [2, S - 3, S - 3, 2][k], y + [2, 2, S - 3, S - 3][k], 1, 1);
      }
      // key badge
      this.text(ctx, String(i + 1), x + 5, y + S - 12, { color: hov ? '#ffe070' : '#c0cbe0' });
      this.regions.push({
        x, y, w: S, h: S,
        click: () => !off && onPick(sl.skill),
        tip: () => ({
          title: sl.skill.name,
          sub: `${sl.skill.tag}${sl.skill.cooldown ? `  -  Cooldown ${sl.skill.cooldown}` : ''}${off ? `  (ready in ${sl.cooldown})` : ''}`,
          body: sl.skill.desc,
          color: '#ffe070',
        }),
      });
    });
  }

  drawPrompt(ctx: CanvasRenderingContext2D, text: string) {
    const w = this.a.font.measure(text) + 16;
    const x = W - 8 - w, y = H - 74;
    nine(ctx, this.a.ui.img, this.part('panel'), x, y, w, 15, 5);
    this.text(ctx, text, x + 8, y + 3, { color: '#d8e2f4' });
  }

  /** Tooltip for whatever region the mouse is over. */
  drawTooltip(ctx: CanvasRenderingContext2D) {
    const r = this.hit(this.mouse.x, this.mouse.y);
    if (!r?.tip) return;
    const tip = r.tip();
    const font = this.a.font;
    const maxW = 210;
    const lines = tip.body ? font.wrap(tip.body, maxW - 14) : [];
    const w = Math.max(font.measure(tip.title, 'bold'), tip.sub ? font.measure(tip.sub) : 0, ...lines.map((l) => font.measure(l))) + 14;
    const h = 12 + (tip.sub ? 10 : 0) + lines.length * 10 + (lines.length ? 4 : 0) + 6;
    let x = Math.round(r.x + r.w / 2 - w / 2), y = r.tipBelow ? r.y + r.h + 4 : r.y - h - 4;
    x = Math.max(4, Math.min(W - w - 4, x));
    if (y < 4) y = r.y + r.h + 4;
    if (y + h > H - 4) y = H - 4 - h;
    nine(ctx, this.a.ui.img, this.part('panel_gold'), x, y, w, h, 6);
    let cy = y + 5;
    this.text(ctx, tip.title, x + 7, cy, { color: tip.color ?? '#ffe070', variant: 'bold' });
    cy += 11;
    if (tip.sub) {
      this.text(ctx, tip.sub, x + 7, cy, { color: '#8fa0c0' });
      cy += 10;
    }
    if (lines.length) cy += 3;
    for (const l of lines) {
      this.text(ctx, l, x + 7, cy, { color: '#e8eef8' });
      cy += 10;
    }
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
    const font = this.a.font;
    const tw = font.measure(this.bannerText, 'bold');
    const w = tw + 44;
    const slide = t < 160 ? 1 - t / 160 : t > 1300 ? (t - 1300) / 200 : 0;
    const x = Math.round(W / 2 - w / 2), y = 64;
    ctx.globalAlpha = 1 - slide;
    const b = this.part('banner');
    // 3-slice: 12px caps
    ctx.drawImage(this.a.ui.img, b[0], b[1], 12, b[3], x, y, 12, b[3]);
    ctx.drawImage(this.a.ui.img, b[0] + 12, b[1], 8, b[3], x + 12, y, w - 24, b[3]);
    ctx.drawImage(this.a.ui.img, b[0] + b[2] - 12, b[1], 12, b[3], x + w - 12, y, 12, b[3]);
    this.text(ctx, this.bannerText, W / 2, y + 5, { color: this.bannerColor, variant: 'bold', align: 'center' });
    ctx.globalAlpha = 1;
  }

  showTitle(text: string, color: string, grad: string, sub?: string) {
    this.title = { text, sub, color, grad, t: 0 };
  }

  drawTitle(ctx: CanvasRenderingContext2D, dt: number, button?: { label: string; click: () => void }) {
    if (!this.title) return;
    const tt = this.title;
    tt.t += dt;
    const scale = 4;
    const pop = tt.t < 180 ? 0.6 + (tt.t / 180) * 0.4 : 1;
    const y = 120;
    if (button) {
      ctx.fillStyle = 'rgba(4,6,14,0.55)';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = Math.min(1, tt.t / 120);
    this.a.font.draw(ctx, tt.text, W / 2, y - (scale * 9 * pop) / 2, { color: tt.color, gradient: tt.grad, variant: 'bold', scale: Math.max(1, Math.round(scale * pop)), align: 'center', outline: '#07080e', shadow: '#3a1e06' });
    if (tt.sub) this.text(ctx, tt.sub, W / 2, y + 26, { color: '#d8e2f4', align: 'center' });
    ctx.globalAlpha = 1;
    if (button && tt.t > 500) {
      const w = 96, h = 20, x = W / 2 - w / 2, by = y + 46;
      const hov = this.inside(x, by, w, h);
      nine(ctx, this.a.ui.img, this.part(hov ? 'panel_gold' : 'panel'), x, by, w, h, 6);
      this.text(ctx, button.label, W / 2, by + 6, { color: hov ? '#ffe070' : '#e8eef8', variant: 'bold', align: 'center' });
      this.regions.push({ x, y: by, w, h, click: button.click });
    }
  }
}
