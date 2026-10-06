// The Academy: a codex of chapters on the left, a scrollable page on the
// right. Pages are built from blocks (src/game/data/codex.ts): paragraphs,
// lists, tips, status tables and live figures (a running turn meter, the
// affinity wheel, the damage formula). Chapters with a demo replay a real
// skill in the arena.
import { H, W } from '../../engine/screen';
import { App } from '../app';
import { champion, CHAMPIONS } from '../data/champions';
import { Block, Chapter, chapter, CHAPTERS, FigureId } from '../data/codex';
import { AFFINITIES, RARITIES, ROLES } from '../data/meta';
import { STATUSES } from '../data/statuses';
import { Affinity, Role } from '../data/types';
import { COLORS } from '../ui/ui';
import { blit, nine } from '../view/assets';
import { BaseScreen, Diorama } from './base';

export class AcademyScreen extends BaseScreen {
  private ch: Chapter;
  private scroll = 0;
  private maxScroll = 0;
  private diorama: Diorama;

  constructor(app: App, id?: string) {
    super(app);
    this.ch = id ? chapter(id) : (CHAPTERS.find((c) => !this.profile.read.includes(c.id)) ?? CHAPTERS[0]);
    this.diorama = new Diorama(app, 'frostfang');
    this.markRead();
    this.ui.focusId = 'ch_' + this.ch.id;
  }

  private markRead() {
    if (!this.profile.read.includes(this.ch.id)) {
      this.profile.read.push(this.ch.id);
      this.app.save();
    }
  }

  private open(c: Chapter) {
    this.ch = c;
    this.scroll = 0;
    this.markRead();
  }

  protected back() {
    this.app.router.menu();
  }

  protected update(dt: number) {
    this.diorama.update(dt);
  }

  wheel(dy: number) {
    this.scroll = Math.max(0, Math.min(this.maxScroll, this.scroll + Math.sign(dy) * 22));
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    this.diorama.draw(ctx, this.t, 0.8);
    const read = CHAPTERS.filter((c) => this.profile.read.includes(c.id)).length;
    this.header(ctx, 'ACADEMY', `${read} / ${CHAPTERS.length} chapters read`);

    // chapter list
    let y = 38;
    for (const c of CHAPTERS) {
      const id = 'ch_' + c.id;
      const on = c === this.ch;
      const hot = ui.hot(id, 8, y, 164, 20);
      nine(ctx, this.a.ui.img, ui.part(on ? 'btn_hover' : hot ? 'btn_hover' : 'btn_up'), 8, y, 164, 20, 4);
      this.icon(ctx, c.icon, 13, y + 4, 12);
      ui.text(ctx, c.title, 30, y + 6, { color: on ? COLORS.goldHi : hot ? '#ffffff' : COLORS.text });
      if (this.profile.read.includes(c.id)) ui.blit(ctx, 'check', 159, y + 6);
      ui.regions.push({ id, x: 8, y, w: 164, h: 20, click: () => this.open(c) });
      y += 22;
    }

    // page
    const px = 180, py = 38, pw = W - px - 8, ph = H - py - 8;
    ui.panel(ctx, 'gold', px, py, pw, ph);
    ui.text(ctx, this.ch.title.toUpperCase(), px + 14, py + 10, { color: COLORS.goldHi, variant: 'bold', scale: 2 });
    ui.divider(ctx, px + 10, py + 30, pw - 20);
    const cx = px + 16, cw = pw - 40;
    const top = py + 40, bottom = py + ph - (this.ch.demo ? 36 : 10);
    const total = this.layout(null, cx, 0, cw);
    this.maxScroll = Math.max(0, total - (bottom - top));
    this.scroll = Math.min(this.scroll, this.maxScroll);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 6, top, pw - 12, bottom - top);
    ctx.clip();
    this.layout(ctx, cx, top - this.scroll, cw);
    ctx.restore();
    if (this.maxScroll > 0) {
      // scrollbar
      const th = Math.max(16, ((bottom - top) * (bottom - top)) / (total || 1));
      const ty = top + ((bottom - top - th) * this.scroll) / this.maxScroll;
      ctx.fillStyle = '#1a2238';
      ctx.fillRect(px + pw - 12, top, 4, bottom - top);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(px + pw - 12, Math.round(ty), 4, Math.round(th));
      ui.regions.push({ x: px + 6, y: top, w: pw - 12, h: bottom - top });
    }
    if (this.ch.demo) {
      const d = this.ch.demo;
      const owner = champion(ownerOf(d.skill));
      ui.text(ctx, `${owner.name}, ${owner.title}`, px + 14, py + ph - 24, { color: COLORS.faint });
      // the button grows with its label (skill names vary in length)
      const label = d.label.toUpperCase();
      const bw = Math.max(144, ui.measure(label, 'bold') + 40);
      ui.button(ctx, 'demo', px + pw - 12 - bw, py + ph - 32, bw, 24, label, { click: () => this.app.router.demo(d.skill, () => this.app.router.academy(this.ch.id)), icon: 'mi_play' });
    }
  }

  /** Draws (ctx) or measures (null) the page; returns its height. */
  private layout(ctx: CanvasRenderingContext2D | null, x: number, y0: number, w: number): number {
    let y = y0;
    for (const b of this.ch.blocks) y += this.block(ctx, b, x, y, w) + 6;
    return y - y0;
  }

  private para(ctx: CanvasRenderingContext2D | null, text: string, x: number, y: number, w: number, color = COLORS.text, variant: 'regular' | 'bold' = 'regular') {
    const lines = this.a.font.wrap(text, w, variant);
    if (ctx) lines.forEach((l, i) => this.ui.text(ctx, l, x, y + i * 11, { color, variant }));
    return lines.length * 11;
  }

  private block(ctx: CanvasRenderingContext2D | null, b: Block, x: number, y: number, w: number): number {
    const ui = this.ui;
    switch (b.kind) {
      case 'p':
        return this.para(ctx, b.text, x, y, w);
      case 'h':
        if (ctx) ui.text(ctx, b.text.toUpperCase(), x, y + 2, { color: COLORS.gold, variant: 'bold' });
        return 14;
      case 'list': {
        let h = 0;
        for (const it of b.items) {
          if (ctx) {
            ctx.fillStyle = COLORS.gold;
            ctx.fillRect(x + 2, y + h + 3, 3, 3);
          }
          h += this.para(ctx, it, x + 12, y + h, w - 12) + 2;
        }
        return h;
      }
      case 'tip': {
        const ph = this.para(null, b.text, x + 36, 0, w - 46);
        if (ctx) {
          ui.panel(ctx, 'well', x, y, w, ph + 12);
          ui.text(ctx, 'TIP', x + 8, y + 6, { color: COLORS.good, variant: 'bold' });
          this.para(ctx, b.text, x + 36, y + 6, w - 46, '#d8f0d0');
        }
        return ph + 12;
      }
      case 'statuses': {
        let h = 0;
        for (const id of b.ids) {
          const st = STATUSES[id];
          const dh = this.para(null, st.desc, x + 104, 0, w - 104);
          if (ctx) {
            blit(ctx, this.a.ui.img, this.a.ui.json.status[id].rect, x, y + h - 1);
            ui.text(ctx, st.name, x + 18, y + h, { color: st.color, variant: 'bold' });
            this.para(ctx, st.desc, x + 104, y + h, w - 104);
            ui.regions.push({ x, y: y + h - 2, w, h: Math.max(14, dh), tip: () => ({ title: st.name, sub: st.buff ? 'Buff' : 'Debuff', body: st.desc, color: st.color }) });
          }
          h += Math.max(14, dh) + 4;
        }
        return h;
      }
      case 'figure':
        return this.figure(ctx, b.id, x, y, w);
    }
  }

  private icon(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, box: number) {
    const r = name.startsWith('status_') ? this.a.ui.json.status[name.slice(7)].rect : this.ui.part(name);
    blit(ctx, this.a.ui.img, r, x + Math.round((box - r[2]) / 2), y + Math.round((box - r[3]) / 2));
  }

  private figure(ctx: CanvasRenderingContext2D | null, id: FigureId, x: number, y: number, w: number): number {
    const ui = this.ui;
    const a = this.a;
    switch (id) {
      case 'turnmeter': {
        if (ctx) {
          const tx0 = x + 10, tx1 = x + w - 62, ty = y + 34;
          ctx.fillStyle = COLORS.ink;
          ctx.fillRect(tx0 - 2, ty - 2, tx1 - tx0 + 4, 6);
          for (let i = 0; i < tx1 - tx0; i += 2) {
            const k = i / (tx1 - tx0);
            ctx.fillStyle = k > 0.92 ? '#f0c650' : k > 0.6 ? '#3e5682' : '#2a3a5a';
            ctx.fillRect(tx0 + i, ty, 1, 2);
          }
          ui.blit(ctx, 'chevron_gold', tx1 - 5, ty - 11);
          const racers: [string, number][] = [['knight', 100], ['monk', 116], ['frostmage', 108], ['tomblord', 96]];
          racers.forEach(([cid, spd], i) => {
            const k = ((this.t * spd) / 400000 + i * 0.23) % 1;
            const cx = Math.round(tx0 + k * (tx1 - tx0));
            const above = i % 2 === 0;
            const cy = above ? ty - 26 : ty + 6;
            ctx.fillStyle = COLORS.ink;
            ctx.fillRect(cx - 11, cy - 1, 22, 22);
            ctx.fillStyle = above ? '#4f8ae6' : '#d84a4a';
            ctx.fillRect(cx - 10, cy, 20, 20);
            const p = a.ui.json.portraits[cid];
            ctx.drawImage(a.ui.img, p[0] + 5, p[1] + 2, 18, 18, cx - 9, cy + 1, 18, 18);
            ui.text(ctx, String(spd), cx + 13, above ? cy + 6 : cy + 6, { color: COLORS.dim });
          });
          ui.text(ctx, '100%: acts', tx1 + 4, ty - 3, { color: COLORS.goldHi });
        }
        return 66;
      }
      case 'skills': {
        if (ctx) {
          const k = champion('knight');
          k.skills.forEach((s, i) => {
            const sx = x + i * Math.floor(w / 3);
            const r = a.ui.json.icons[s.id];
            ctx.fillStyle = COLORS.ink;
            ctx.fillRect(sx, y, 42, 42);
            blit(ctx, a.ui.img, r, sx + 1, y + 1);
            if (i === 1) {
              ctx.fillStyle = 'rgba(6,8,14,0.7)';
              ctx.fillRect(sx + 1, y + 1, 40, 40);
              ui.text(ctx, '2', sx + 21, y + 13, { color: '#ffffff', variant: 'bold', scale: 2, align: 'center' });
            }
            ui.text(ctx, `A${i + 1} ${s.name}`, sx + 48, y + 8, { color: COLORS.goldHi, variant: 'bold' });
            ui.text(ctx, i === 0 ? 'always ready' : i === 1 ? 'ready in 2 turns' : `cooldown ${s.cooldown}`, sx + 48, y + 20, { color: COLORS.dim });
          });
        }
        return 46;
      }
      case 'damage': {
        const lines = [
          ['DAMAGE = ATK x skill multiplier x 4.8 x 100 / (100 + DEF)', COLORS.goldHi],
          ['x 1.2 strong hit, x 0.8 weak hit      x 1.25 if Weakened', COLORS.text],
          ['x 1.5 critical hit      x 0.92 to 1.08 random spread', COLORS.text],
          ['Example: 100 ATK, a 1.0 skill, a 100 DEF target: about 240 damage.', COLORS.dim],
        ] as const;
        if (ctx) {
          ui.panel(ctx, 'well', x, y, w, 56);
          lines.forEach(([l, c], i) => ui.text(ctx, l, x + 10, y + 7 + i * 11, { color: c, variant: i === 0 ? 'bold' : 'regular' }));
        }
        return 56;
      }
      case 'affinity': {
        if (ctx) {
          const cx = x + 90, cy = y + 50, r = 34;
          const pos: Record<Exclude<Affinity, 'void'>, [number, number]> = {
            force: [cx, cy - r],
            wild: [cx + r * 0.95, cy + r * 0.6],
            arcane: [cx - r * 0.95, cy + r * 0.6],
          };
          const arrow = (from: [number, number], to: [number, number], color: string) => {
            const dx = to[0] - from[0], dy = to[1] - from[1], l = Math.hypot(dx, dy);
            const ux = dx / l, uy = dy / l;
            const a0: [number, number] = [from[0] + ux * 11, from[1] + uy * 11], a1: [number, number] = [to[0] - ux * 12, to[1] - uy * 12];
            ctx.fillStyle = color;
            for (let s = 0; s <= 1; s += 1 / Math.ceil(l)) ctx.fillRect(Math.round(a0[0] + (a1[0] - a0[0]) * s), Math.round(a0[1] + (a1[1] - a0[1]) * s), 2, 2);
            for (const side of [-1, 1]) {
              for (let k = 0; k < 5; k++) ctx.fillRect(Math.round(a1[0] - ux * k + -uy * side * k * 0.8), Math.round(a1[1] - uy * k + ux * side * k * 0.8), 2, 2);
            }
          };
          arrow(pos.force, pos.wild, AFFINITIES.force.color);
          arrow(pos.wild, pos.arcane, AFFINITIES.wild.color);
          arrow(pos.arcane, pos.force, AFFINITIES.arcane.color);
          for (const [aff, [gx, gy]] of Object.entries(pos) as [Exclude<Affinity, 'void'>, [number, number]][]) {
            const g = ui.part('gem_' + aff);
            ctx.drawImage(a.ui.img, g[0], g[1], g[2], g[3], Math.round(gx - g[2]), Math.round(gy - g[3]), g[2] * 2, g[3] * 2);
            ui.text(ctx, AFFINITIES[aff].name.toUpperCase(), gx, gy + 12, { color: AFFINITIES[aff].color, variant: 'bold', align: 'center' });
          }
          const vx = x + 220, vy = y + 30;
          const g = ui.part('gem_void');
          ctx.drawImage(a.ui.img, g[0], g[1], g[2], g[3], vx, vy, g[2] * 2, g[3] * 2);
          ui.text(ctx, 'VOID', vx + 30, vy + 2, { color: AFFINITIES.void.color, variant: 'bold' });
          ui.text(ctx, 'outside the cycle', vx + 30, vy + 13, { color: COLORS.dim });
          ui.text(ctx, 'Arrow = deals strong hits to', vx, vy + 40, { color: COLORS.faint });
        }
        return 100;
      }
      case 'stars': {
        if (ctx) {
          [3, 2, 1].forEach((n, i) => {
            const sx = x + i * 120;
            for (let k = 0; k < 3; k++) ui.blit(ctx, k < n ? 'star_m' : 'star_m_off', sx + k * 15, y);
            ui.text(ctx, n === 3 ? 'flawless' : n === 2 ? 'one fell' : 'losses', sx + 50, y + 3, { color: COLORS.dim });
          });
        }
        return 18;
      }
      case 'rarity': {
        if (ctx) {
          let rx = x;
          for (const r of Object.values(RARITIES)) {
            const tw = ui.measure(r.name.toUpperCase(), 'bold');
            nine(ctx, a.ui.img, ui.part('card_' + r.id), rx, y, tw + 18, 20, 8);
            ui.text(ctx, r.name.toUpperCase(), rx + 9, y + 6, { color: r.color, variant: 'bold' });
            rx += tw + 24;
          }
        }
        return 22;
      }
      case 'roles': {
        let h = 0;
        for (const r of Object.keys(ROLES) as Role[]) {
          const dh = this.para(null, ROLES[r].desc, x + 70, 0, w - 70);
          if (ctx) {
            ui.blit(ctx, 'role_' + r, x, y + h);
            ui.text(ctx, r, x + 14, y + h + 1, { color: COLORS.goldHi, variant: 'bold' });
            this.para(ctx, ROLES[r].desc, x + 70, y + h + 1, w - 70);
          }
          h += dh + 3;
        }
        return h;
      }
      case 'duration': {
        if (ctx) {
          const steps: [string, string, string][] = [
            ['status_stun', 'Stun placed', COLORS.text],
            ['status_stun', 'next turn: skipped', '#fff070'],
            ['mi_play', 'then acts again', COLORS.good],
          ];
          steps.forEach(([icon, label, color], i) => {
            const sx = x + i * Math.floor(w / 3);
            this.icon(ctx, icon, sx, y, 16);
            ui.text(ctx, label, sx + 20, y + 5, { color });
            if (i < 2) ui.text(ctx, '>', sx + Math.floor(w / 3) - 12, y + 5, { color: COLORS.gold, variant: 'bold' });
          });
        }
        return 20;
      }
      case 'controls': {
        const rows: [string, string][] = [
          ['Mouse', 'Click a skill, then a target. Hover anything for details.'],
          ['1  2  3', 'Choose a skill'],
          ['Arrows', 'Cycle targets (battle) or move between buttons (menus)'],
          ['Enter', 'Confirm the skill or the focused button'],
          ['A', 'Toggle auto battle'],
          ['S', 'Battle speed x1 / x2 / x3'],
          ['Esc', 'Pause menu in battle, back in menus'],
          ['Q  E', 'Previous / next champion on the champion page'],
        ];
        if (ctx) {
          rows.forEach(([k, d], i) => {
            const ry = y + i * 14;
            ui.panel(ctx, 'well', x, ry - 2, 60, 13);
            ui.text(ctx, k, x + 30, ry + 1, { color: COLORS.goldHi, align: 'center' });
            ui.text(ctx, d, x + 70, ry + 1, { color: COLORS.text });
          });
        }
        return rows.length * 14;
      }
    }
  }

  key(k: string) {
    if (k === 'PageDown') return this.wheel(1);
    if (k === 'PageUp') return this.wheel(-1);
    super.key(k);
  }
}

function ownerOf(skill: string): string {
  const owner = CHAMPIONS.find((c) => c.skills.some((s) => s.id === skill));
  if (!owner) throw new Error('no owner for ' + skill);
  return owner.id;
}
