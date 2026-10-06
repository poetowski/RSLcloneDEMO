// Champion detail: the champion at double size on a podium (preview any of
// its animations), and its card: rarity, affinity, faction, role, skills,
// stats and lore. Locked champions show as a silhouette with the stage that
// recruits them; their kit can still be studied.
import { H, W } from '../../engine/screen';
import { App } from '../app';
import { recruitStage, STARTERS } from '../data/campaign';
import { champion, CHAMPIONS } from '../data/champions';
import { AFFINITIES, FACTIONS, RARITIES, ROLES } from '../data/meta';
import { STAT_LIMITS } from '../data/norms';
import { ChampionDef } from '../data/types';
import { isUnlocked } from '../profile';
import { COLORS } from '../ui/ui';
import { blit, nine } from '../view/assets';
import { drawChampion, frameAt } from '../view/unit';
import { BaseScreen, Diorama } from './base';

type Tab = 'skills' | 'stats' | 'lore';

export class ChampionScreen extends BaseScreen {
  private c: ChampionDef;
  private tab: Tab = 'skills';
  private anim = 'idle';
  private animT = 0;
  private diorama: Diorama;

  constructor(
    app: App,
    id: string,
    private list: string[] = CHAMPIONS.map((c) => c.id),
  ) {
    super(app);
    this.c = champion(id);
    this.diorama = new Diorama(app, this.c.faction === 'sunscar' ? 'sunscar' : 'frostfang');
    this.seen();
  }

  private seen() {
    const p = this.profile;
    if (p.fresh.includes(this.c.id)) {
      p.fresh = p.fresh.filter((x) => x !== this.c.id);
      this.app.save();
    }
  }

  protected back() {
    this.app.router.collection();
  }

  private cycle(d: number) {
    const i = this.list.indexOf(this.c.id);
    this.c = champion(this.list[(i + d + this.list.length) % this.list.length]);
    this.anim = 'idle';
    this.seen();
  }

  protected update(dt: number) {
    this.diorama.update(dt);
    this.animT += dt;
    const art = this.a.champions[this.c.id];
    const a = art.json.anims[this.anim];
    if (a && !a.loop) {
      const total = a.ms.reduce((s, m) => s + m, 0);
      if (this.animT > total + 350) this.play('idle');
    }
  }

  private play(anim: string) {
    this.anim = anim;
    this.animT = 0;
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const c = this.c;
    const own = isUnlocked(this.profile, c.id);
    this.diorama.draw(ctx, this.t, 0.66);
    this.header(ctx, 'CHAMPION', `${this.list.indexOf(c.id) + 1} / ${this.list.length}`);

    // --- showcase
    const sx = 132, sy = 286;
    const rar = RARITIES[c.rarity];
    ui.glow(ctx, sx, sy - 80, 110, 120, rar.color, 0.55);
    const pod = ui.part('podium');
    ctx.drawImage(this.a.ui.img, pod[0], pod[1], pod[2], pod[3], sx - pod[2], sy - 18, pod[2] * 2, pod[3] * 2);
    const art = this.a.champions[c.id];
    const a = art.json.anims[this.anim];
    const f = a.loop ? frameAt(art, this.anim, this.animT) : (() => {
      let k = this.animT;
      for (let i = 0; i < a.ms.length; i++) {
        if (k < a.ms[i]) return i;
        k -= a.ms[i];
      }
      return a.ms.length - 1;
    })();
    ctx.save();
    ctx.beginPath();
    ctx.rect(4, 34, 258, H - 34);
    ctx.clip();
    drawChampion(ctx, art, this.anim, f, sx, sy, { facing: 'R', scale: 2, shadow: !own });
    ctx.restore();
    if (!own) {
      const st = recruitStage(c.id);
      ui.panel(ctx, 'red', sx - 96, 54, 192, 34);
      ui.blit(ctx, 'lock', sx - 88, 64);
      ui.text(ctx, 'NOT YET RECRUITED', sx + 6, 60, { color: '#ffd0c0', variant: 'bold', align: 'center' });
      ui.text(ctx, st ? `Clear ${st.id} ${st.name}` : '', sx + 6, 72, { color: COLORS.dim, align: 'center' });
    }
    // animation preview buttons
    const anims: [string, string][] = [['IDLE', 'idle'], ['RUN', 'run'], ...c.skills.map((s, i) => [`A${i + 1}`, s.anim] as [string, string])];
    if (art.json.anims.rise) anims.push(['RISE', 'rise']);
    const bw = 36, gap = 4, bx0 = Math.round(sx - (anims.length * (bw + gap) - gap) / 2);
    anims.forEach(([label, an], i) => ui.button(ctx, 'anim_' + label, bx0 + i * (bw + gap), H - 40, bw, 18, label, { click: () => this.play(an), kind: 'small', active: this.anim === an }));
    ui.text(ctx, 'Preview animations', sx, H - 18, { color: COLORS.faint, align: 'center' });
    // cycle arrows
    const al = ui.part('arrow_l'), arr = ui.part('arrow_r');
    blit(ctx, this.a.ui.img, al, 12, 150);
    blit(ctx, this.a.ui.img, arr, 244, 150);
    ui.regions.push({ id: 'prev', x: 6, y: 140, w: 22, h: 36, click: () => this.cycle(-1) });
    ui.regions.push({ id: 'next', x: 238, y: 140, w: 22, h: 36, click: () => this.cycle(1) });

    // --- card
    const px = 268, py = 38, pw = W - px - 8, ph = H - py - 8;
    ui.panel(ctx, 'gold', px, py, pw, ph);
    ui.text(ctx, c.name, px + 12, py + 10, { color: c.color, variant: 'bold', scale: 2 });
    ui.text(ctx, c.title, px + 14 + ui.measure(c.name, 'bold', 2) + 6, py + 19, { color: COLORS.dim });
    let lx = px + 12;
    const ly = py + 34;
    const chip = (part: string, label: string, color: string, tip: () => { title: string; body: string; color?: string }) => {
      const r = ui.part(part);
      blit(ctx, this.a.ui.img, r, lx, ly + 4 - Math.round(r[3] / 2));
      ui.text(ctx, label, lx + r[2] + 3, ly, { color });
      const w = r[2] + 3 + ui.measure(label);
      ui.regions.push({ x: lx, y: ly - 4, w, h: 14, tip });
      lx += w + 12;
    };
    ui.text(ctx, rar.name.toUpperCase(), lx, ly, { color: rar.color, variant: 'bold' });
    lx += ui.measure(rar.name.toUpperCase(), 'bold') + 12;
    const aff = AFFINITIES[c.affinity];
    chip('gem_' + c.affinity, aff.name, aff.color, () => ({ title: aff.name, body: aff.desc, color: aff.color }));
    const fac = FACTIONS[c.faction];
    chip('emblem_' + c.faction, fac.name, fac.color, () => ({ title: fac.name, body: fac.desc, color: fac.color }));
    chip('role_' + c.role, c.role, COLORS.text, () => ({ title: c.role, body: ROLES[c.role].desc }));
    ui.divider(ctx, px + 10, py + 48, pw - 20);

    // tabs
    let tx = px + 12;
    for (const t of ['skills', 'stats', 'lore'] as Tab[]) {
      const label = t.toUpperCase();
      const w = ui.measure(label) + 18;
      const on = this.tab === t;
      const id = 'tab_' + t;
      const hot = ui.hot(id, tx, py + 58, w, 16);
      nine(ctx, this.a.ui.img, ui.part(on ? 'tab_on' : 'tab_off'), tx, py + 58, w, 16, 5);
      ui.text(ctx, label, tx + 9, py + 62, { color: on || hot ? COLORS.goldHi : COLORS.dim });
      ui.regions.push({ id, x: tx, y: py + 58, w, h: 16, click: () => (this.tab = t) });
      tx += w + 4;
    }
    ctx.fillStyle = '#a8701e';
    ctx.fillRect(px + 10, py + 74, pw - 20, 1);
    const bx = px + 12, by = py + 82, bwid = pw - 24;
    if (this.tab === 'skills') this.skills(ctx, bx, by, bwid);
    else if (this.tab === 'stats') this.stats(ctx, bx, by, bwid);
    else this.lore(ctx, bx, by, bwid);
  }

  private skills(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
    const ui = this.ui;
    let cy = y;
    this.c.skills.forEach((s, i) => {
      const icon = this.a.ui.json.icons[s.id];
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(x, cy, 42, 42);
      blit(ctx, this.a.ui.img, icon, x + 1, cy + 1);
      ui.text(ctx, s.name, x + 50, cy, { color: COLORS.goldHi, variant: 'bold' });
      ui.text(ctx, `A${i + 1}  -  ${s.tag}${s.cooldown ? `  -  Cooldown ${s.cooldown}` : ''}`, x + 50 + ui.measure(s.name, 'bold') + 8, cy, { color: COLORS.faint });
      const hgt = ui.para(ctx, s.desc, x + 50, cy + 12, w - 50, { color: COLORS.text }, 10);
      cy += Math.max(48, hgt + 18);
    });
    const p = this.c.passive;
    if (p) {
      ui.text(ctx, `PASSIVE: ${p.name}`, x, cy, { color: '#a2f56a', variant: 'bold' });
      ui.para(ctx, p.desc, x, cy + 12, w, { color: COLORS.text }, 10);
    }
  }

  private stats(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
    const ui = this.ui;
    const st = this.c.stats;
    const rows: [string, number, readonly [number, number], string, string][] = [
      ['HP', st.hp, STAT_LIMITS.hp, '#3ccf5a', 'Health. When it reaches 0 the champion falls.'],
      ['ATK', st.atk, STAT_LIMITS.atk, '#ff8a5a', 'Attack: the base of every damaging skill.'],
      ['DEF', st.def, STAT_LIMITS.def, '#5aa8ff', 'Defense: damage taken is multiplied by 100 / (100 + DEF).'],
      ['SPD', st.spd, STAT_LIMITS.spd, '#ffe070', 'Speed: how fast the Turn Meter fills.'],
      ['CRIT', st.crit, STAT_LIMITS.crit, '#ff5ac0', 'Critical rate: chance for each hit to deal +50% damage.'],
    ];
    rows.forEach(([name, val, [lo, hi], color, tip], i) => {
      const cy = y + i * 20;
      ui.text(ctx, name, x, cy + 2, { color: COLORS.dim, variant: 'bold' });
      const k = 0.15 + ((val - lo) / (hi - lo)) * 0.85;
      ui.bar(ctx, x + 40, cy + 3, w - 100, 6, k, color, '#ffffff');
      ui.text(ctx, name === 'CRIT' ? `${Math.round(val * 100)}%` : String(val), x + w, cy + 2, { color: COLORS.text, align: 'right' });
      ui.regions.push({ x, y: cy, w, h: 16, tip: () => ({ title: name, body: tip }) });
    });
    let cy = y + 108;
    const aff = AFFINITIES[this.c.affinity];
    const beats = aff.beats ? AFFINITIES[aff.beats].name : null;
    const loses = Object.values(AFFINITIES).find((a) => a.beats === this.c.affinity)?.name;
    ui.text(ctx, 'AFFINITY', x, cy, { color: COLORS.dim, variant: 'bold' });
    cy += 12;
    cy += ui.para(ctx, beats ? `Strong hits against ${beats}, weak hits against ${loses}.` : 'Void: never deals or takes strong or weak hits.', x, cy, w, { color: COLORS.text });
    cy += 8;
    ui.text(ctx, 'ROLE', x, cy, { color: COLORS.dim, variant: 'bold' });
    cy += 12;
    ui.para(ctx, ROLES[this.c.role].desc, x, cy, w, { color: COLORS.text });
  }

  private lore(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
    const ui = this.ui;
    let cy = y + ui.para(ctx, this.c.lore, x, y, w, { color: COLORS.text }, 12) + 10;
    const fac = FACTIONS[this.c.faction];
    ui.blit(ctx, 'emblem_' + this.c.faction, x, cy - 2);
    ui.text(ctx, fac.name, x + 20, cy + 2, { color: fac.color, variant: 'bold' });
    cy += 18;
    cy += ui.para(ctx, fac.desc, x, cy, w, { color: COLORS.dim }) + 10;
    const st = recruitStage(this.c.id);
    ui.text(ctx, STARTERS.includes(this.c.id) ? 'Joins you from the start.' : st ? `Recruited by the first clear of stage ${st.id}, ${st.name}.` : '', x, cy, { color: COLORS.faint });
  }

  key(k: string) {
    if (k === 'ArrowLeft' && !this.ui.keyboard) return this.cycle(-1);
    if (k === 'ArrowRight' && !this.ui.keyboard) return this.cycle(1);
    if (k === 'q') return this.cycle(-1);
    if (k === 'e') return this.cycle(1);
    super.key(k);
  }
}
