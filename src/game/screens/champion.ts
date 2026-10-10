// Champion detail: the champion at double size on a podium (preview any of
// its animations), and its card: rarity, affinity, faction, role, skills,
// stats, its Weaver Matrix and lore. Locked champions show as a silhouette with the stage that
// recruits them; their kit can still be studied.
import { H, W } from '../../engine/screen';
import { App } from '../app';
import { isUnlocked } from '../archivist';
import { recruitStage, STARTERS } from '../data/campaign';
import { champion, CHAMPIONS } from '../data/champions';
import { AFFINITIES, FACTIONS, RARITIES, ROLES } from '../data/meta';
import { STAT_LIMITS } from '../data/norms';
import { ATTUNE_BONUS, GRADES, MATRIX_LAYOUT, PATTERN_NAMES } from '../data/matrix';
import { ChampionDef, StatId, StatNode } from '../data/types';
import { homeZone } from '../data/zones';
import { attunedStats, fits, sameSpool, SlotIndex, StatBonus, strandValue, ThreadSpool, WeaverMatrix, wovenStats } from '../reliquary/matrix';
import { COLORS } from '../ui/ui';
import { blit, nine } from '../view/assets';
import { drawChampion, frameAt } from '../view/unit';
import { BaseScreen, Diorama } from './base';

type Tab = 'skills' | 'stats' | 'matrix' | 'lore';
const STAT: Record<StatId, string> = { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD', crit: 'CRIT' };
/** text colour of each pattern: the light step of its spool's thread */
const PATTERN_TINT: Record<string, string> = {
  lifethread: '#a2f56a', tension: '#ffd060', selvage: '#dff2ff', glint: '#ff8ad0', quickweft: '#ffe890', fraybite: '#d89cff', bloodweft: '#ff6a5a', wardknot: '#90f5e2',
};
/** grade name colour: the cap metal */
const GRADE_TINT = ['#a08a7a', '#cfd8e6', '#efc04a'];

/** "ATK +7%", "SPD +3" */
function statText(s: StatId, v: number): string {
  return s === 'spd' ? `${STAT[s]} +${v}` : `${STAT[s]} +${v}%`;
}

/** What a slot takes: "DEF", "SPD, or ATK, HP or DEF %", "ATK, HP or DEF %". */
function ruleText(n: StatNode): string {
  if (n.kind === 'fixed') return STAT[n.stat];
  const special = n.stats.filter((s) => s === 'spd' || s === 'crit');
  const p = n.stats.filter((s) => s !== 'spd' && s !== 'crit').map((s) => STAT[s]);
  const pct = `${p.slice(0, -1).join(', ')} or ${p[p.length - 1]} %`;
  return special.length ? `${special.map((s) => STAT[s]).join(', ')}, or ${pct}` : pct;
}

/** The rule written inside an empty slot. */
function emptyLabel(n: StatNode): string[] {
  if (n.kind === 'fixed') return [STAT[n.stat]];
  const special = n.stats.find((s) => s === 'spd' || s === 'crit');
  return special ? [STAT[special], 'or %'] : ['%'];
}

/** A strand as it counts in its slot: "ATK +2% +1" when attuned. */
function strandText(m: WeaverMatrix, i: SlotIndex, st: StatBonus): string {
  const extra = strandValue(m, i, st) - st.value;
  return `${statText(st.stat, st.value)}${extra ? ` +${extra}` : ''}`;
}


export class ChampionScreen extends BaseScreen {
  private c: ChampionDef;
  private tab: Tab = 'skills';
  /** the chosen slot on the MATRIX tab */
  private slot: SlotIndex = 0;
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
    this.diorama = new Diorama(app, homeZone(this.c.faction).id);
    this.seen();
  }

  private seen() {
    if (this.archivist.reliquary.markSeen(this.c.id)) this.app.save();
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
    const own = isUnlocked(this.archivist, c.id);
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
    ui.text(ctx, c.name, px + 12, py + 10, { color: c.color, variant: 'display' });
    ui.text(ctx, c.title, px + 12 + ui.measure(c.name, 'display') + 6, py + 16, { color: COLORS.dim });
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
    for (const t of ['skills', 'stats', 'matrix', 'lore'] as Tab[]) {
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
    if (this.tab === 'matrix') this.matrix(ctx, bx, by, bwid);
    else if (this.tab === 'skills') this.skills(ctx, bx, by, bwid);
    else if (this.tab === 'stats') this.stats(ctx, bx, by, bwid);
    else this.lore(ctx, bx, by, bwid);
  }

  /** The Weaver Matrix: the rose of six slots, the chosen slot's spool, the stats it gives and the stock. */
  private matrix(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
    const ui = this.ui;
    const img = this.a.ui.img;
    const c = this.c;
    const rel = this.archivist.reliquary;
    const own = rel.has(c.id);
    const m = own ? rel.file(c.id).matrix : WeaverMatrix.empty(MATRIX_LAYOUT);
    const sel = this.slot;
    const isFixed = (i: number) => m.slots[i].node.kind === 'fixed';
    const grade = (s: ThreadSpool) => GRADES[s.grade];
    const name = (s: ThreadSpool) => PATTERN_NAMES[s.pattern as keyof typeof PATTERN_NAMES] ?? s.pattern;

    // the rose: the fixed triangle in gold, the choice triangle in arcane light
    const rx = x, ry = y - 2, half = 72;
    blit(ctx, img, ui.part('matrix_rose'), rx, ry);
    const at = (i: number) => {
      const a = ((i * 60 - 90) * Math.PI) / 180;
      return [Math.round(rx + half + Math.cos(a) * 42), Math.round(ry + half + Math.sin(a) * 42)];
    };
    const neighbours = isFixed(sel) ? [] : [(sel + 5) % 6, (sel + 1) % 6];
    m.slots.forEach((slot, i) => {
      const [lx, ly] = at(i);
      const s = slot.spool;
      if (s) blit(ctx, img, ui.part(`spool_${s.pattern}_${s.grade}`), lx - 9, ly - 9);
      else {
        const lines = emptyLabel(slot.node);
        lines.forEach((t, k) => ui.text(ctx, t, lx, ly - (lines.length === 1 ? 4 : 9) + k * 10, { color: isFixed(i) ? '#c8a050' : '#7fb4f0', align: 'center' }));
      }
      if (i === sel) blit(ctx, img, ui.part('lobe_sel'), lx - 23, ly - 23);
      else if (neighbours.includes(i)) blit(ctx, img, ui.part('lobe_attune'), lx - 23, ly - 23);
      ui.regions.push({
        id: `mx_slot_${i}`, x: lx - 18, y: ly - 18, w: 36, h: 36,
        click: () => (this.slot = i as SlotIndex),
        tip: () => (s
          ? { title: `Slot ${i + 1}: ${name(s)} spool`, body: `${grade(s)}. Main ${statText(s.main.stat, s.main.value)}; strands ${s.strands.map((st) => strandText(m, i as SlotIndex, st)).join(', ')}.`, color: PATTERN_TINT[s.pattern] }
          : { title: `Slot ${i + 1}: empty`, body: `${isFixed(i) ? 'Fixed' : 'Choice'} slot. Takes ${ruleText(slot.node)}.` }),
      });
    });
    const gem = ui.part('gem_' + c.affinity);
    blit(ctx, img, gem, rx + half - Math.floor(gem[2] / 2), ry + half - Math.floor(gem[3] / 2));

    // stats with the matrix, under the rose
    const sy = y + 150;
    ui.text(ctx, 'WITH MATRIX', x, sy, { color: COLORS.goldHi, variant: 'bold' });
    const base = c.stats, wov = wovenStats(base, m);
    const pct = (k: number) => `${Math.round(k * 1000) / 10}%`;
    const rows: [string, string, number, string][] = [
      ['HP', String(wov.hp), wov.hp - base.hp, `+${wov.hp - base.hp}`],
      ['ATK', String(wov.atk), wov.atk - base.atk, `+${wov.atk - base.atk}`],
      ['DEF', String(wov.def), wov.def - base.def, `+${wov.def - base.def}`],
      ['SPD', String(wov.spd), wov.spd - base.spd, `+${wov.spd - base.spd}`],
      ['CRIT', pct(wov.crit), wov.crit - base.crit, `+${Math.round((wov.crit - base.crit) * 1000) / 10}`],
    ];
    rows.forEach(([n, v, d, dt], i) => {
      const yy = sy + 13 + i * 11;
      ui.text(ctx, n, x, yy, { color: COLORS.dim, variant: 'bold' });
      ui.text(ctx, v, x + 76, yy, { color: COLORS.text, align: 'right' });
      if (d > 1e-9) ui.text(ctx, dt, x + 82, yy, { color: COLORS.good });
    });

    // the chosen slot and its spool
    const x2 = x + 154, cw = w - 154;
    const node = m.slots[sel].node;
    ui.text(ctx, `SLOT ${sel + 1}`, x2, y, { color: isFixed(sel) ? COLORS.gold : '#5aa8ff', variant: 'bold' });
    ui.text(ctx, isFixed(sel) ? 'FIXED' : 'CHOICE', x2 + ui.measure(`SLOT ${sel + 1}`, 'bold') + 6, y, { color: COLORS.faint, variant: 'bold' });
    ui.text(ctx, `Takes ${ruleText(node)}`, x2, y + 11, { color: COLORS.dim });
    const tuned = attunedStats(m, sel);
    if (tuned.length) ui.text(ctx, `Attuned: ${tuned.map((s) => STAT[s]).join(' and ')} strands +${ATTUNE_BONUS}`, x2, y + 22, { color: '#c8a050' });
    const py = y + 36, ph = 88;
    ui.panel(ctx, 'dark', x2, py, cw, ph);
    const held = m.slots[sel].spool;
    if (held) {
      blit(ctx, img, ui.part(`spool_${held.pattern}_${held.grade}`), x2 + 8, py + 8);
      ui.text(ctx, name(held).toUpperCase(), x2 + 30, py + 8, { color: PATTERN_TINT[held.pattern], variant: 'bold' });
      ui.text(ctx, grade(held).toUpperCase(), x2 + 30, py + 19, { color: GRADE_TINT[held.grade] });
      ui.text(ctx, 'MAIN', x2 + 10, py + 36, { color: COLORS.faint, variant: 'bold' });
      ui.text(ctx, statText(held.main.stat, held.main.value), x2 + 44, py + 32, { color: COLORS.goldHi, variant: 'display' });
      ui.text(ctx, 'STRANDS', x2 + 10, py + 56, { color: COLORS.faint, variant: 'bold' });
      held.strands.forEach((st, k) => {
        const line = statText(st.stat, st.value);
        ui.text(ctx, line, x2 + 70, py + 56 + k * 11, { color: COLORS.text });
        if (strandValue(m, sel, st) > st.value) ui.text(ctx, `+${ATTUNE_BONUS} ATTUNED`, x2 + 70 + ui.measure(line) + 6, py + 56 + k * 11, { color: COLORS.gold });
      });
      if (own) {
        ui.button(ctx, 'mx_out', x2 + cw - 72, py + 6, 64, 16, 'TAKE OUT', {
          kind: 'small',
          click: () => {
            rel.unequip(c.id, sel);
            this.app.save();
          },
        });
      }
    } else {
      ui.text(ctx, 'EMPTY', x2 + 10, py + 10, { color: COLORS.faint, variant: 'bold' });
      ui.para(ctx, own ? 'Pick a spool from the stock below. It keeps the slot until you take it out.' : `Recruit ${c.name} to weave a matrix.`, x2 + 10, py + 24, cw - 20, { color: COLORS.dim }, 10);
    }

    // the stock: spools that fit the chosen slot are lit, the others dimmed
    const groups: { s: ThreadSpool; n: number }[] = [];
    for (const s of rel.spools()) {
      const g = groups.find((e) => sameSpool(e.s, s));
      if (g) g.n++;
      else groups.push({ s, n: 1 });
    }
    groups.sort((a, b) => Number(fits(node, b.s)) - Number(fits(node, a.s)) || b.s.grade - a.s.grade);
    const ky = y + 130, per = 8, max = per * 3;
    ui.text(ctx, 'STOCK', x2, ky, { color: COLORS.goldHi, variant: 'bold' });
    const total = rel.spools().length;
    ui.text(ctx, total ? `${total} spools, lit ones fit slot ${sel + 1}` : 'empty', x2 + ui.measure('STOCK', 'bold') + 6, ky, { color: COLORS.faint });
    groups.slice(0, max).forEach(({ s, n }, i) => {
      const gx = x2 + (i % per) * 23, gy = ky + 12 + Math.floor(i / per) * 22;
      const ok = fits(node, s);
      ctx.save();
      if (!ok) ctx.globalAlpha = 0.3;
      blit(ctx, img, ui.part(`spool_${s.pattern}_${s.grade}`), gx, gy);
      ctx.restore();
      if (n > 1) ui.tinyNum(ctx, n, gx + 14, gy + 13);
      ui.regions.push({
        id: `mx_stock_${i}`, x: gx, y: gy, w: 20, h: 20,
        click: own && ok ? () => {
          rel.equip(c.id, sel, s);
          this.app.save();
        } : undefined,
        tip: () => ({
          title: `${name(s)} spool`,
          body: `${grade(s)}. Main ${statText(s.main.stat, s.main.value)}; strands ${s.strands.map((st) => statText(st.stat, st.value)).join(', ')}. ${ok ? `Fits slot ${sel + 1}.` : `Slot ${sel + 1} cannot take ${STAT[s.main.stat]}.`}`,
          color: PATTERN_TINT[s.pattern],
        }),
      });
    });
    if (groups.length > max) ui.text(ctx, `+${groups.length - max} more`, x2 + cw - 4, ky, { color: COLORS.faint, align: 'right' });

    // legend
    const ly0 = y + 212;
    const key = (lx: number, color: string, label: string, dotted = false) => {
      ctx.fillStyle = color;
      if (dotted) for (let k = 0; k < 7; k += 2) ctx.fillRect(lx + k, ly0 + 2, 1, 5);
      else ctx.fillRect(lx, ly0 + 2, 6, 5);
      ui.text(ctx, label, lx + 10, ly0, { color: COLORS.dim });
      return lx + 10 + ui.measure(label) + 10;
    };
    let kx = key(x2, COLORS.gold, 'fixed');
    kx = key(kx, '#5aa8ff', 'choice');
    key(kx, COLORS.gold, 'attunes', true);
    void w;
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
      ['DEF', st.def, STAT_LIMITS.def, '#5aa8ff', 'Defense: damage taken is multiplied by 40 / DEF. Twice the DEF, half the damage.'],
      ['SPD', st.spd, STAT_LIMITS.spd, '#ffe070', 'Speed: how fast the Turn Meter fills.'],
      ['CRIT', st.crit, STAT_LIMITS.crit, '#ff5ac0', 'Critical rate: chance for each hit to deal double damage.'],
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
    const beats = AFFINITIES[aff.beats].name;
    const loses = Object.values(AFFINITIES).find((a) => a.beats === this.c.affinity)?.name;
    ui.text(ctx, 'AFFINITY', x, cy, { color: COLORS.dim, variant: 'bold' });
    cy += 12;
    cy += ui.para(ctx, `Strong hits against ${beats}, weak hits against ${loses}.`, x, cy, w, { color: COLORS.text });
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
    cy += ui.para(ctx, fac.desc, x, cy, w, { color: COLORS.dim }) + 4;
    if (fac.standard) cy += ui.para(ctx, `Standard: ${fac.standard}`, x, cy, w, { color: COLORS.dim }) + 6;
    else cy += 6;
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
