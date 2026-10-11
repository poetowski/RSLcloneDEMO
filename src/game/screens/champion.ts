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
import { ATTUNE_BONUS, CORE_WEAVE_PATTERNS, GRADES, MATRIX_LAYOUT, pattern, patternBonusText, SLOT_NAMES, SPOOL_STAT_NAME, STAT_NAME } from '../data/matrix';
import { ChampionDef, SpoolStat, StatId, StatNode } from '../data/types';
import { homeZone } from '../data/zones';
import { attunedStats, fits, sameSpool, SlotIndex, StatBonus, strandValue, ThreadSpool, WeavePatternEvaluator, WeaverMatrix, wovenStats } from '../reliquary/matrix';
import { COLORS } from '../ui/ui';
import { blit, nine } from '../view/assets';
import { drawChampion, frameAt } from '../view/unit';
import { BaseScreen, Diorama } from './base';

type Tab = 'skills' | 'stats' | 'matrix' | 'lore';
/** text colour of each pattern: the light step of its spool's thread (tools/art/ui/matrix.ts); Pulse a step deeper, apart from Needle's gold */
const PATTERN_TINT: Record<string, string> = {
  pattern_pulse: '#ffa030', pattern_sunder: '#ff6a5a', pattern_ward: '#9fd0ff', pattern_vigor: '#a2f56a',
  pattern_needle: '#ffe890', pattern_apex: '#ff8ad0', pattern_focus: '#d89cff', pattern_tranquility: '#6ad8bc',
};
/** grade name colour: the cap metal */
const GRADE_TINT = ['#a08a7a', '#cfd8e6', '#efc04a'];
const patternName = (id: string) => pattern(id)?.name ?? id;

/** "ATK +8", "ATK % +7%", "C.DMG +10%", "ACC +14" */
function statText(s: SpoolStat, v: number): string {
  const pct = s === 'atkPct' || s === 'hpPct' || s === 'defPct' || s === 'crit' || s === 'critDmg';
  return `${SPOOL_STAT_NAME[s].replace(' %', '')} +${v}${pct ? '%' : ''}`;
}

/** What a slot takes: "flat ATK", "SPD or a base stat in %", "C.RATE, C.DMG or a base stat in %". */
function ruleText(n: StatNode): string {
  if (n.kind === 'fixed') return `flat ${SPOOL_STAT_NAME[n.stat]}`;
  const special = n.stats.filter((s) => s !== 'atkPct' && s !== 'hpPct' && s !== 'defPct').map((s) => SPOOL_STAT_NAME[s]);
  return `${special.join(', ')} or a base stat in %`;
}

/** The rule written inside an empty slot: its own stats, one a line, then "or %". */
function emptyLabel(n: StatNode): string[] {
  if (n.kind === 'fixed') return [SPOOL_STAT_NAME[n.stat]];
  const special = n.stats.filter((s) => s !== 'atkPct' && s !== 'hpPct' && s !== 'defPct');
  return [...(special.includes('crit') ? ['CRIT'] : special.map((s) => SPOOL_STAT_NAME[s])), 'or %'];
}

/** A strand as it counts in its slot: "ATK +2% +1" when attuned. */
function strandText(m: WeaverMatrix, i: SlotIndex, st: StatBonus): string {
  const extra = strandValue(m, i, st) - st.value;
  return `${statText(st.stat, st.value)}${extra ? ` +${extra}` : ''}`;
}

/** A champion stat's value as shown: "1150", "2.5%", "100%". */
function statValue(k: StatId, v: number): string {
  return k === 'crit' || k === 'critDmg' ? `${Math.round(v * 1000) / 10}%` : String(v);
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
      ui.text(ctx, st ? `Clear stage ${st.id}` : '', sx + 6, 72, { color: COLORS.dim, align: 'center' });
    }
    // animation preview buttons
    const anims: [string, string][] = [['IDLE', 'idle'], ['RUN', 'run'], ...c.skills.map((s, i) => [`A${i + 1}`, s.anim] as [string, string])];
    if (art.json.anims.rise) anims.push(['RISE', 'rise']);
    if (art.json.anims.victory) anims.push(['WIN', 'victory']);
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

  /** The Weaver Matrix: the rose of six slots, the chosen slot's spool, the woven patterns, the stats it gives and the stock. */
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
    const name = (s: ThreadSpool) => patternName(s.pattern);
    const spoolBody = (s: ThreadSpool) => {
      const p = pattern(s.pattern);
      return `${grade(s)}. Main ${statText(s.main.stat, s.main.value)}; strands ${s.strands.map((st) => statText(st.stat, st.value)).join(', ')}.${p ? ` ${p.pieces} ${p.name} spools weave ${patternBonusText(p)}.` : ''}`;
    };

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
        const pitch = lines.length > 2 ? 9 : 10, top = ly - 4 - Math.floor(((lines.length - 1) * pitch) / 2);
        lines.forEach((t, k) => ui.text(ctx, t, lx, top + k * pitch, { color: isFixed(i) ? '#c8a050' : '#7fb4f0', align: 'center' }));
      }
      if (i === sel) blit(ctx, img, ui.part('lobe_sel'), lx - 23, ly - 23);
      else if (neighbours.includes(i)) blit(ctx, img, ui.part('lobe_attune'), lx - 23, ly - 23);
      ui.regions.push({
        id: `mx_slot_${i}`, x: lx - 18, y: ly - 18, w: 36, h: 36,
        click: () => (this.slot = i as SlotIndex),
        tip: () => (s
          ? { title: `${SLOT_NAMES[i]}: ${name(s)} spool`, body: `${grade(s)}. Main ${statText(s.main.stat, s.main.value)}; strands ${s.strands.map((st) => strandText(m, i as SlotIndex, st)).join(', ')}.`, color: PATTERN_TINT[s.pattern] }
          : { title: `${SLOT_NAMES[i]}: empty`, body: `${isFixed(i) ? 'Fixed' : 'Choice'} slot. Takes ${ruleText(slot.node)}.` }),
      });
    });
    const gem = ui.part('gem_' + c.affinity);
    blit(ctx, img, gem, rx + half - Math.floor(gem[2] / 2), ry + half - Math.floor(gem[3] / 2));

    // stats with the matrix, under the rose, in two columns
    const sy = y + 148;
    ui.text(ctx, 'WITH MATRIX', x, sy, { color: COLORS.goldHi, variant: 'bold' });
    const base = c.stats, wov = wovenStats(base, m);
    const cols: StatId[][] = [['hp', 'atk', 'def', 'spd'], ['crit', 'critDmg', 'acc', 'res']];
    cols.forEach((keys, ci) => {
      const cx0 = x + ci * 78;
      keys.forEach((k, ri) => {
        const yy = sy + 13 + ri * 11;
        const up = wov[k] - base[k] > 1e-9;
        ui.text(ctx, STAT_NAME[k], cx0, yy, { color: COLORS.dim, variant: 'bold' });
        ui.text(ctx, statValue(k, wov[k]), cx0 + 72, yy, { color: up ? COLORS.good : COLORS.text, align: 'right' });
        ui.regions.push({
          x: cx0, y: yy - 1, w: 74, h: 11,
          tip: () => ({ title: STAT_NAME[k], sub: `base ${statValue(k, base[k])}${up ? `, with the matrix ${statValue(k, wov[k])}` : ''}`, body: k === 'acc' || k === 'res' ? 'Carried and shown; no battle rule uses it yet.' : k === 'critDmg' ? 'What a critical hit adds: 100% is double damage.' : '' }),
        });
      });
    });

    // the chosen slot and its spool
    const x2 = x + 158, cw = w - 158;
    const node = m.slots[sel].node;
    ui.text(ctx, SLOT_NAMES[sel].toUpperCase(), x2, y, { color: isFixed(sel) ? COLORS.gold : '#5aa8ff', variant: 'bold' });
    ui.text(ctx, isFixed(sel) ? 'FIXED' : 'CHOICE', x2 + ui.measure(SLOT_NAMES[sel].toUpperCase(), 'bold') + 6, y, { color: COLORS.faint, variant: 'bold' });
    ui.text(ctx, `Takes ${ruleText(node)}`, x2, y + 11, { color: COLORS.dim });
    const tuned = attunedStats(m, sel);
    if (tuned.length) ui.text(ctx, `Attuned: ${tuned.map((s) => STAT_NAME[s]).join(' and ')} strands +${ATTUNE_BONUS}`, x2, y + 22, { color: '#c8a050' });
    const py = y + 34, ph = 70;
    ui.panel(ctx, 'dark', x2, py, cw, ph);
    const held = m.slots[sel].spool;
    if (held) {
      blit(ctx, img, ui.part(`spool_${held.pattern}_${held.grade}`), x2 + 8, py + 7);
      ui.text(ctx, name(held).toUpperCase(), x2 + 30, py + 6, { color: PATTERN_TINT[held.pattern], variant: 'bold' });
      ui.text(ctx, grade(held).toUpperCase(), x2 + 30, py + 16, { color: GRADE_TINT[held.grade] });
      // two columns: the main stat, and the strands one a line
      const tx = x2 + 88;
      ui.text(ctx, 'MAIN', x2 + 10, py + 28, { color: COLORS.faint, variant: 'bold' });
      ui.text(ctx, statText(held.main.stat, held.main.value), x2 + 10, py + 38, { color: COLORS.goldHi, variant: 'bold' });
      ui.text(ctx, 'STRANDS', tx, py + 28, { color: COLORS.faint, variant: 'bold' });
      held.strands.forEach((st, k) => {
        ui.text(ctx, strandText(m, sel, st), tx, py + 38 + k * 10, { color: strandValue(m, sel, st) > st.value ? COLORS.gold : COLORS.text });
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
      ui.text(ctx, 'EMPTY', x2 + 10, py + 8, { color: COLORS.faint, variant: 'bold' });
      ui.para(ctx, own ? 'Pick a spool from the stock below. It keeps the slot until you take it out.' : `Recruit ${c.name} to weave a matrix.`, x2 + 10, py + 22, cw - 20, { color: COLORS.dim }, 10);
    }

    // the woven patterns: what every complete set adds, on up to two lines
    const wy = py + ph + 5, wx0 = x2 + ui.measure('WOVEN', 'bold') + 6, wEnd = x2 + cw - 4;
    const pieces = CORE_WEAVE_PATTERNS[0].pieces;
    ui.text(ctx, 'WOVEN', x2, wy, { color: COLORS.goldHi, variant: 'bold' });
    ui.regions.push({
      x: x2, y: wy - 1, w: wx0 - x2 - 2, h: 11,
      tip: () => ({ title: 'Weave Patterns', body: `Every ${pieces} spools of one pattern, wherever they sit, weave it once: ${CORE_WEAVE_PATTERNS.map((p) => `${p.name} ${patternBonusText(p)}`).join(', ')}.` }),
    });
    const woven = new WeavePatternEvaluator(CORE_WEAVE_PATTERNS).evaluate(m);
    if (!woven.length) ui.text(ctx, `none: ${pieces} spools of one pattern`, wx0, wy, { color: COLORS.faint });
    const flow = (labels: string[]) => {
      let lx = wx0, row = 0;
      return labels.map((label) => {
        const lw = ui.measure(label);
        if (lx > wx0 && lx + lw > wEnd) {
          lx = wx0;
          row++;
        }
        const at = { label, x: lx, y: wy + row * 10, w: lw };
        lx += lw + 8;
        return at;
      });
    };
    // names and bonuses when they fit on two lines, else the bonuses alone (the names are in the tooltips)
    let placed = flow(woven.map((wp) => `${wp.pattern.name}${wp.times > 1 ? ` x${wp.times}` : ''} ${patternBonusText(wp.pattern, wp.times)}`));
    if (placed.some((p) => p.y > wy + 10)) placed = flow(woven.map((wp) => patternBonusText(wp.pattern, wp.times)));
    placed.forEach((at, k) => {
      const wp = woven[k];
      ui.text(ctx, at.label, at.x, at.y, { color: PATTERN_TINT[wp.pattern.id] });
      ui.regions.push({ x: at.x, y: at.y - 1, w: at.w, h: 11, tip: () => ({ title: wp.pattern.name, sub: `${wp.pattern.pieces}-piece Weave Pattern, woven ${wp.times} time${wp.times > 1 ? 's' : ''}`, body: `${patternBonusText(wp.pattern)} for every ${wp.pattern.pieces} ${wp.pattern.name} spools, wherever they sit.`, color: PATTERN_TINT[wp.pattern.id] }) });
    });

    // the stock: spools that fit the chosen slot are lit, the others dimmed
    const groups: { s: ThreadSpool; n: number }[] = [];
    for (const s of rel.spools()) {
      const g = groups.find((e) => sameSpool(e.s, s));
      if (g) g.n++;
      else groups.push({ s, n: 1 });
    }
    groups.sort((a, b) => Number(fits(node, b.s)) - Number(fits(node, a.s)) || b.s.grade - a.s.grade);
    const ky = wy + 24, per = 8, max = per * 3;
    ui.text(ctx, 'STOCK', x2, ky, { color: COLORS.goldHi, variant: 'bold' });
    const total = rel.spools().length, sx0 = x2 + ui.measure('STOCK', 'bold') + 6;
    const lit = [`${total} spools, lit ones fit ${SLOT_NAMES[sel]}`, `${total} spools, lit ones fit the slot`].find((t) => sx0 + ui.measure(t) <= x2 + cw - 4);
    ui.text(ctx, total ? (lit ?? `${total} spools`) : 'empty', sx0, ky, { color: COLORS.faint });
    groups.slice(0, max).forEach(({ s, n }, i) => {
      const gx = x2 + (i % per) * 22, gy = ky + 11 + Math.floor(i / per) * 21;
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
          body: `${spoolBody(s)} ${ok ? `Fits ${SLOT_NAMES[sel]}.` : `${SLOT_NAMES[sel]} cannot take ${SPOOL_STAT_NAME[s.main.stat]}.`}`,
          color: PATTERN_TINT[s.pattern],
        }),
      });
    });
    if (groups.length > max) ui.text(ctx, `+${groups.length - max} more`, x2 + cw - 4, ky, { color: COLORS.faint, align: 'right' });

    // legend
    const ly0 = y + 214;
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
      // a passive with its own icon reads like a skill row
      const icon = this.a.ui.json.icons[p.id];
      const tx = icon ? x + 50 : x;
      if (icon) {
        ctx.fillStyle = COLORS.ink;
        ctx.fillRect(x, cy, 42, 42);
        blit(ctx, this.a.ui.img, icon, x + 1, cy + 1);
      }
      ui.text(ctx, p.name, tx, cy, { color: '#a2f56a', variant: 'bold' });
      ui.text(ctx, 'Passive', tx + ui.measure(p.name, 'bold') + 8, cy, { color: COLORS.faint });
      ui.para(ctx, p.desc, tx, cy + 12, w - (tx - x), { color: COLORS.text }, 10);
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
      ['C.RATE', st.crit, STAT_LIMITS.crit, '#ff5ac0', 'Critical rate: the chance of each hit to be critical.'],
    ];
    rows.forEach(([name, val, [lo, hi], color, tip], i) => {
      const cy = y + i * 17;
      ui.text(ctx, name, x, cy + 2, { color: COLORS.dim, variant: 'bold' });
      const k = 0.15 + ((val - lo) / (hi - lo)) * 0.85;
      ui.bar(ctx, x + 48, cy + 3, w - 108, 6, k, color, '#ffffff');
      ui.text(ctx, name === 'C.RATE' ? statValue('crit', val) : String(val), x + w, cy + 2, { color: COLORS.text, align: 'right' });
      ui.regions.push({ x, y: cy, w, h: 14, tip: () => ({ title: name, body: tip }) });
    });
    // the stats with no budget yet: critical damage, accuracy, resistance
    const extra: [StatId, string][] = [
      ['critDmg', 'Critical damage: what a critical hit adds. 100% is double damage.'],
      ['acc', 'Accuracy. Carried by spools and patterns; no battle rule uses it yet.'],
      ['res', 'Resistance. Carried by spools and patterns; no battle rule uses it yet.'],
    ];
    extra.forEach(([k, tip], i) => {
      const ex = x + i * Math.floor(w / 3);
      ui.text(ctx, STAT_NAME[k], ex, y + 88, { color: COLORS.dim, variant: 'bold' });
      ui.text(ctx, statValue(k, st[k]), ex + ui.measure(STAT_NAME[k], 'bold') + 6, y + 88, { color: COLORS.text });
      ui.regions.push({ x: ex, y: y + 86, w: Math.floor(w / 3) - 4, h: 13, tip: () => ({ title: STAT_NAME[k], body: tip }) });
    });
    let cy = y + 112;
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
    ui.text(ctx, STARTERS.includes(this.c.id) ? 'Joins you from the start.' : st ? `Joins on the first clear of stage ${st.id}.` : '', x, cy, { color: COLORS.faint });
  }

  key(k: string) {
    if (k === 'ArrowLeft' && !this.ui.keyboard) return this.cycle(-1);
    if (k === 'ArrowRight' && !this.ui.keyboard) return this.cycle(1);
    if (k === 'q') return this.cycle(-1);
    if (k === 'e') return this.cycle(1);
    super.key(k);
  }
}
