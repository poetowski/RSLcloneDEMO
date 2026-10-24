// Weaving: the storage of every Thread Spool the archivist holds, loose or
// woven into a champion's Weaver Matrix (Jakub, 2026-10-24: a main-menu section
// of its own, "be consistent with UI and match how we now have champions"; the
// button first read WEAVING STORAGE, then just WEAVING). As on the Champions
// screen the cards stand in groups, here one per Weave Pattern under its spool
// and name, the finest grade first and every grade on rows of its own; the
// filters by slot (the slots a spool fits) and by state (new, loose, woven)
// combine. The panel on the right reads the chosen spool out and weaves it into
// a champion, takes it out or unravels it; with none chosen it tells what the
// storage holds and where spools are found. A new find wears the NEW badge
// until it is chosen or Weaving is left. The grid scrolls like the collection.
import { H, W } from '../../engine/screen';
import { App } from '../app';
import { frontier, locationOpen, roster, spoolsHeld } from '../archivist';
import { LOCATIONS, zoneOf } from '../data/campaign';
import { champion } from '../data/champions';
import { CORE_WEAVE_PATTERNS, GRADES, MATRIX_LAYOUT, pattern, patternBonusText, SLOT_NAMES, SPOOL_STATS, STAT_IDS, STAT_NAME } from '../data/matrix';
import { RARITIES } from '../data/meta';
import { WeavePatternDef } from '../data/types';
import { fits, SlotIndex, slotsFor, strandValue, ThreadSpool, WeavePatternEvaluator, WeaverMatrix, wovenStats } from '../reliquary/matrix';
import { drawScrollHints, Scroller } from '../ui/scroll';
import { emptyLabel, fitsText, GRADE_TINT, PATTERN_TINT, patternName, roseMark, ruleText, spoolArt, spoolIcon, statText, strandText } from '../ui/spools';
import { COLORS, Tip } from '../ui/ui';
import { blit, nine, Rect4 } from '../view/assets';
import { BaseScreen, Diorama } from './base';
import { statValue } from './champion';
import { shade } from './collection';

/** Where a spool sits: in a champion's slot, or loose in the stock (null). */
type Where = { champion: string; slot: SlotIndex } | null;

/** The chosen spool: its value and where it sits. */
export interface SpoolPick {
  spool: ThreadSpool;
  where: Where;
}

/** The state filters: the new finds Weaving opened with, the loose spools, the woven ones. */
type StateFilter = 'new' | 'loose' | 'woven';

/** How Weaving opens: its filters, the champion a weave goes to first, the spool shown, the scroll, and where BACK goes (the main menu by default). */
export interface WeavingAt {
  slot?: SlotIndex;
  state?: StateFilter;
  champion?: string;
  pick?: SpoolPick;
  scroll?: number;
  back?: () => void;
}

/** A card: one spool, loose (identical loose spools share a card and its count) or woven in a champion's slot. */
interface Card {
  key: string;
  spool: ThreadSpool;
  count: number;
  fresh: boolean;
  where: Where;
}

/** Card grid geometry, the window it scrolls in (left, below the filter tabs) and the panel on the right. */
const CW = 66, CH = 62, GAP = 5, COLS = 5;
const VIEW: Rect4 = [0, 54, 376, H - 54];
const GRID_X = 12, GRID_W = COLS * CW + (COLS - 1) * GAP;
/** room above the first row for the NEW badges, and below the last */
const PAD_TOP = 5, PAD_BOTTOM = 6;
/** a pattern's header above its cards, and the space before the next pattern */
const HEAD = 22, GROUP_GAP = 6;
const PX = 384, PY = 36, PW = W - PX - 8, PH = H - PY - 8;
/** the weave dialog */
const DX = 70, DY = 44, DW = 500, DH = 290;
/** the grade's card frame (`card_ashen` ...) */
const GRADE_KEY = ['ashen', 'silver', 'gilded'];

const spoolKey = (s: ThreadSpool) => `${s.pattern}|${s.grade}|${s.main.stat}|${s.strands.map((t) => t.stat + t.value).join(',')}`;
const cardKey = (s: ThreadSpool, where: Where) => `${spoolKey(s)}@${where ? `${where.champion}.${where.slot}` : 'stock'}`;
/** Within a grade's rows: by main stat in catalog order, the richer strands first, loose before woven. */
const byStat = (a: Card, b: Card) =>
  SPOOL_STATS.indexOf(a.spool.main.stat) - SPOOL_STATS.indexOf(b.spool.main.stat) ||
  strandSum(b.spool) - strandSum(a.spool) ||
  Number(!!a.where) - Number(!!b.where);
const strandSum = (s: ThreadSpool) => s.strands.reduce((n, t) => n + t.value, 0);

export class WeavingScreen extends BaseScreen {
  private slot: SlotIndex | null;
  private state: StateFilter | null;
  private pick: SpoolPick | null;
  private diorama: Diorama;
  private scroll = new Scroller();
  /** the new finds Weaving opened with: they stay under the NEW filter for this visit, badge or not */
  private news: Set<string>;
  /** the weave dialog: choosing a champion, then one of its slots that takes the spool */
  private dialog: { champion: string | null; hover: SlotIndex | null } | null = null;
  /** UNRAVEL asks first */
  private confirm = false;
  private toast: { text: string; t: number } | null = null;
  /** every card, rebuilt each frame */
  private all: Card[] = [];

  constructor(
    app: App,
    private at: WeavingAt = {},
  ) {
    super(app);
    this.slot = at.slot ?? null;
    this.state = at.state ?? null;
    this.pick = at.pick ?? null;
    this.diorama = new Diorama(app, zoneOf(frontier(this.archivist)));
    this.news = new Set(this.archivist.reliquary.entries().filter((e) => e.fresh).map((e) => spoolKey(e.spool)));
    this.all = this.cards();
    const { placed, height } = this.layout();
    // back from a champion page: where the grid was left, at once
    this.scroll.extent(height, VIEW[3]);
    this.scroll.to(at.scroll ?? 0);
    this.scroll.pos = this.scroll.target;
    const picked = this.chosen();
    this.ui.focusId = picked ? 'card_' + picked.key : placed[0] ? 'card_' + placed[0].k.key : 'tab_all';
  }

  /** Leaving Weaving: every NEW badge has been seen. */
  leave() {
    if (this.archivist.reliquary.markStockSeen()) this.app.save();
  }

  protected back() {
    if (this.dialog) this.dialogBack();
    else if (this.confirm) this.confirm = false;
    else if (this.at.back) this.at.back();
    else this.app.router.menu();
  }

  protected update(dt: number) {
    this.diorama.update(dt);
    this.scroll.update(dt);
  }

  wheel(dy: number) {
    if (!this.dialog) this.scroll.by(Math.sign(dy) * Math.min(CH + GAP, Math.max(36, Math.abs(dy))));
  }

  key(k: string) {
    const page = VIEW[3] - 40;
    if (this.dialog) super.key(k);
    else if (k === 'PageDown') this.scroll.by(page);
    else if (k === 'PageUp') this.scroll.by(-page);
    else if (k === 'Home') this.scroll.to(0);
    else if (k === 'End') this.scroll.to(this.scroll.max);
    else super.key(k);
  }

  /** How it stands now, to come back to from a champion page. */
  private snapshot(): WeavingAt {
    return { slot: this.slot ?? undefined, state: this.state ?? undefined, champion: this.at.champion, pick: this.pick ?? undefined, scroll: this.scroll.target, back: this.at.back };
  }

  // ---------------------------------------------------------------------------
  // the cards

  /** Every spool held as cards: identical loose spools share one, each woven spool has its own (champions in catalog order). */
  private cards(): Card[] {
    const rel = this.archivist.reliquary;
    const loose = new Map<string, Card>();
    for (const e of rel.entries()) {
      const key = cardKey(e.spool, null);
      const c = loose.get(key);
      if (c) {
        c.count++;
        c.fresh ||= e.fresh;
      } else loose.set(key, { key, spool: e.spool, count: 1, fresh: e.fresh, where: null });
    }
    const woven: Card[] = [];
    for (const id of roster(this.archivist)) {
      for (const s of rel.file(id).matrix.slots) {
        if (!s.spool) continue;
        const where = { champion: id, slot: s.index };
        woven.push({ key: cardKey(s.spool, where), spool: s.spool, count: 1, fresh: false, where });
      }
    }
    return [...loose.values(), ...woven];
  }

  private passes(k: Card): boolean {
    if (this.slot !== null && !fits(MATRIX_LAYOUT[this.slot], k.spool)) return false;
    if (this.state === 'new') return !k.where && this.news.has(spoolKey(k.spool));
    if (this.state === 'loose') return !k.where;
    if (this.state === 'woven') return !!k.where;
    return true;
  }

  private setFilter(slot: SlotIndex | null, state: StateFilter | null) {
    this.slot = slot;
    this.state = state;
    this.scroll.to(0);
  }

  /**
   * The cards in groups by Weave Pattern, in catalog order: each group under its
   * header, the finest grade first, every grade starting rows of its own, so a
   * row never holds two grades (as a Champions row never holds two rarities).
   */
  private layout(): { placed: { k: Card; x: number; y: number }[]; heads: { p: WeavePatternDef; y: number; n: number }[]; height: number } {
    const shown = this.all.filter((k) => this.passes(k));
    const placed: { k: Card; x: number; y: number }[] = [];
    const heads: { p: WeavePatternDef; y: number; n: number }[] = [];
    let y = PAD_TOP;
    for (const p of CORE_WEAVE_PATTERNS) {
      const mine = shown.filter((k) => k.spool.pattern === p.id);
      if (!mine.length) continue;
      heads.push({ p, y, n: mine.reduce((n, k) => n + k.count, 0) });
      y += HEAD;
      for (const g of [2, 1, 0]) {
        const row = mine.filter((k) => k.spool.grade === g).sort(byStat);
        for (let i = 0; i < row.length; i += COLS) {
          row.slice(i, i + COLS).forEach((k, n) => placed.push({ k, x: GRID_X + n * (CW + GAP), y }));
          y += CH + GAP;
        }
      }
      y += GROUP_GAP;
    }
    return { placed, heads, height: placed.length ? y - GAP - GROUP_GAP + PAD_BOTTOM : 0 };
  }

  /** The card of the chosen spool, if it is still held where it was. */
  private chosen(): Card | null {
    const p = this.pick;
    if (!p) return null;
    const key = cardKey(p.spool, p.where);
    return this.all.find((k) => k.key === key) ?? null;
  }

  private isPicked(k: Card): boolean {
    return !!this.pick && cardKey(this.pick.spool, this.pick.where) === k.key;
  }

  /** Chooses a card (the chosen one clicked again lets go); a new find loses its badge. */
  private choose(k: Card) {
    this.confirm = false;
    if (this.isPicked(k)) {
      this.pick = null;
      return;
    }
    this.pick = { spool: k.spool, where: k.where };
    if (!k.where && this.archivist.reliquary.markSpoolSeen(k.spool)) this.app.save();
  }

  private say(text: string) {
    this.toast = { text, t: this.t };
  }

  // ---------------------------------------------------------------------------
  // drawing

  protected draw(ctx: CanvasRenderingContext2D) {
    this.all = this.cards();
    if (this.pick && !this.chosen()) this.pick = null;
    this.diorama.draw(ctx, this.t, 0.72);
    const held = spoolsHeld(this.archivist);
    const forC = this.at.champion ? `, weaving for ${champion(this.at.champion).name}` : '';
    this.header(ctx, 'WEAVING', `${held} spool${held === 1 ? '' : 's'} held${forC}`);
    const live = !this.dialog;
    this.tabs(ctx, live);
    this.grid(ctx, live);
    this.panel(ctx, live);
    if (this.dialog) this.drawDialog(ctx);
  }

  /** Filter tabs: ALL, the six slots (a small rose lights each), then NEW, LOOSE and WOVEN; a slot and a state combine, a lit tab clicked again lets go. */
  private tabs(ctx: CanvasRenderingContext2D, live: boolean) {
    const ui = this.ui;
    let tx = 12;
    const tab = (id: string, label: string, icon: string | null, on: boolean, click: () => void, tip?: () => Tip) => {
      const w = label ? ui.measure(label) + (icon ? 29 : 16) : 23;
      const hot = live && ui.hot(id, tx, 36, w, 16);
      nine(ctx, this.a.ui.img, ui.part(on || (hot && !label) ? 'tab_on' : 'tab_off'), tx, 36, w, 16, 5);
      if (icon) ui.blit(ctx, icon, tx + 5, 37);
      if (label) ui.text(ctx, label, tx + (icon ? 21 : 8), 40, { color: on || hot ? COLORS.goldHi : COLORS.dim });
      if (live) ui.regions.push({ id, x: tx, y: 36, w, h: 16, click, tip });
      tx += w + 4;
    };
    tab('tab_all', 'ALL', null, this.slot === null && !this.state, () => this.setFilter(null, null));
    for (let i = 0; i < 6; i++) {
      const s = i as SlotIndex;
      tab('tab_slot' + i, '', 'rose_' + i, this.slot === s, () => this.setFilter(this.slot === s ? null : s, this.state), () => ({
        title: SLOT_NAMES[s],
        sub: `${MATRIX_LAYOUT[s].kind === 'fixed' ? 'Fixed' : 'Choice'} slot`,
        body: `The spools it takes: ${ruleText(MATRIX_LAYOUT[s])}.`,
      }));
    }
    tx += 8;
    const states: [StateFilter, string, string][] = [
      ['new', 'NEW', 'The spools found since Weaving was last opened.'],
      ['loose', 'LOOSE', 'The spools in storage, woven into no matrix.'],
      ['woven', 'WOVEN', "The spools in your champions' matrices."],
    ];
    for (const [st, label, body] of states) tab('tab_' + st, label, null, this.state === st, () => this.setFilter(this.slot, this.state === st ? null : st), () => ({ title: label, body }));
  }

  private grid(ctx: CanvasRenderingContext2D, live: boolean) {
    const ui = this.ui;
    const { placed, heads, height } = this.layout();
    const [vx, vy, vw, vh] = VIEW;
    this.scroll.extent(height, vh);
    // keyboard focus pulls its card (and the header above it) into view
    const focused = placed.find((p) => 'card_' + p.k.key === ui.focusId);
    if (live && ui.keyboard && focused) this.scroll.reveal(Math.max(0, focused.y - HEAD), CH + HEAD + PAD_BOTTOM, vh);
    const oy = vy - this.scroll.offset;
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx, vy, vw, vh);
    ctx.clip();
    for (const h of heads) this.head(ctx, h, GRID_X, oy + h.y, GRID_W);
    for (const p of placed) this.card(ctx, p.k, p.x, oy + p.y, live);
    if (!placed.length) {
      const mid = GRID_X + GRID_W / 2;
      if (!this.all.length) {
        ui.text(ctx, 'NO SPOOLS YET', mid, vy + 70, { color: COLORS.goldHi, variant: 'bold', align: 'center' });
        ui.text(ctx, 'Every campaign victory finds one.', mid, vy + 84, { color: COLORS.dim, align: 'center' });
      } else ui.text(ctx, 'No spool here: let go of a filter.', mid, vy + 70, { color: COLORS.dim, align: 'center' });
    }
    ctx.restore();
    drawScrollHints(ui, ctx, this.scroll, VIEW, CH + GAP, this.t);
  }

  /** A pattern's header: its Gilded spool, its name in its thread's colour, how many are shown, a rule, what it weaves. */
  private head(ctx: CanvasRenderingContext2D, h: { p: WeavePatternDef; n: number }, x: number, y: number, w: number) {
    if (y + HEAD < VIEW[1] || y > VIEW[1] + VIEW[3]) return;
    const ui = this.ui;
    ui.blit(ctx, `spool_${h.p.id}_2`, x, y);
    const name = h.p.name.toUpperCase();
    ui.text(ctx, name, x + 22, y + 5, { color: PATTERN_TINT[h.p.id], variant: 'bold' });
    const count = String(h.n);
    ui.text(ctx, count, x + 28 + ui.measure(name, 'bold'), y + 5, { color: COLORS.faint });
    const bonus = `${h.p.pieces} spools: ${patternBonusText(h.p)}`;
    ui.text(ctx, bonus, x + w, y + 5, { color: COLORS.dim, align: 'right' });
    const lx = x + 34 + ui.measure(name, 'bold') + ui.measure(count), rx = x + w - ui.measure(bonus) - 6;
    if (rx <= lx) return;
    ctx.fillStyle = '#a8701e';
    ctx.fillRect(lx, y + 9, rx - lx, 1);
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(lx, y + 10, rx - lx, 1);
  }

  /** A spool card: the spool in a window tinted by its thread, its main stat on the plate, the frame of its grade; the rose of the slots it fits, the face of the champion wearing it, how many lie alike, the NEW badge. */
  private card(ctx: CanvasRenderingContext2D, k: Card, x: number, y: number, live: boolean) {
    const ui = this.ui;
    const id = 'card_' + k.key;
    const click = () => this.choose(k);
    // cards scrolled out of the window are not drawn, but keep their region so arrow keys can reach them
    if (y + CH + 4 < VIEW[1] || y - 4 > VIEW[1] + VIEW[3]) {
      if (live) ui.regions.push({ id, x, y, w: CW, h: CH, clip: VIEW, click });
      return;
    }
    const img = this.a.ui.img;
    const hot = live && ui.hot(id, x, y, CW, CH, VIEW);
    const sel = this.isPicked(k);
    const tint = PATTERN_TINT[k.spool.pattern];
    ui.bands(ctx, x + 3, y + 3, CW - 6, 42, '#080a12', shade(tint, 0.3), 6);
    ctx.fillStyle = 'rgba(5,7,12,0.88)';
    ctx.fillRect(x + 3, y + 45, CW - 6, CH - 48);
    // the spool in a pool of its own light; it lifts a pixel under the pointer
    ui.glow(ctx, x + CW / 2, y + 25, 17, 15, tint, hot || sel ? 0.5 : 0.28);
    const art = ui.part(spoolArt(k.spool));
    blit(ctx, img, art, x + Math.round(CW / 2 - art[2] / 2), y + 7 - (hot ? 1 : 0));
    nine(ctx, img, ui.part('card_' + GRADE_KEY[k.spool.grade]), x, y, CW, CH, 8);
    ui.blit(ctx, roseMark(k.spool), x + 5, y + 5);
    ui.text(ctx, statText(k.spool.main.stat, k.spool.main.value), x + CW / 2, y + 48, { color: sel || hot ? COLORS.goldHi : COLORS.text, align: 'center' });
    if (k.where) this.face(ctx, k.where.champion, x + CW - 21, y + 5);
    if (k.count > 1) ui.tinyNum(ctx, k.count, x + CW - 10 - (k.count > 9 ? 4 : 0), y + 38);
    if (k.fresh) ui.blit(ctx, 'new', x + CW - 24, y - 3);
    if (sel) {
      ctx.strokeStyle = COLORS.goldHi;
      ctx.strokeRect(x - 1.5, y - 1.5, CW + 3, CH + 3);
      ctx.strokeStyle = COLORS.ink;
      ctx.strokeRect(x - 2.5, y - 2.5, CW + 5, CH + 5);
    } else if (hot) {
      ctx.strokeStyle = COLORS.goldHi;
      ctx.strokeRect(x - 0.5, y - 0.5, CW + 1, CH + 1);
    }
    if (live) ui.regions.push({ id, x, y, w: CW, h: CH, clip: VIEW, click, tip: () => this.cardTip(k) });
  }

  private cardTip(k: Card): Tip {
    const s = k.spool;
    const where = k.where ? `Woven: ${champion(k.where.champion).name}, ${SLOT_NAMES[k.where.slot]}.` : k.count > 1 ? `${k.count} alike in storage.` : 'In storage.';
    return {
      title: `${patternName(s.pattern)} spool`,
      sub: `${GRADES[s.grade]}, fits ${fitsText(s)}`,
      body: `Main ${statText(s.main.stat, s.main.value)}; strands ${s.strands.map((t) => statText(t.stat, t.value)).join(', ')}. ${where}`,
      color: PATTERN_TINT[s.pattern],
    };
  }

  /** A champion's face (14x14 from its portrait) on a gold-rimmed badge. */
  private face(ctx: CanvasRenderingContext2D, id: string, x: number, y: number) {
    const pr = this.a.ui.json.portraits[id];
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(x - 1, y - 1, 18, 18);
    ctx.fillStyle = '#a8701e';
    ctx.fillRect(x, y, 16, 16);
    ctx.drawImage(this.a.ui.img, pr[0] + 6, pr[1] + 4, 14, 14, x + 1, y + 1, 14, 14);
  }

  // ---------------------------------------------------------------------------
  // the panel

  private panel(ctx: CanvasRenderingContext2D, live: boolean) {
    const ui = this.ui;
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(PX + 3, PY + 3, PW - 6, PH - 6);
    ui.panel(ctx, 'gold', PX, PY, PW, PH);
    const k = this.chosen();
    if (k) this.readOut(ctx, k, live);
    else this.overview(ctx, live);
    if (this.toast && this.t - this.toast.t < 3200) {
      ctx.globalAlpha = Math.min(1, (3200 - (this.t - this.toast.t)) / 500);
      ui.para(ctx, this.toast.text, PX + 12, PY + PH - 58, PW - 24, { color: COLORS.good }, 10);
      ctx.globalAlpha = 1;
    }
  }

  /** No spool chosen: what the storage holds, and where spools are found. */
  private overview(ctx: CanvasRenderingContext2D, live: boolean) {
    const ui = this.ui;
    const p = this.archivist;
    const x = PX + 12, w = PW - 24;
    let y = PY + 10;
    ui.text(ctx, 'THE STORAGE', x, y, { color: COLORS.goldHi, variant: 'bold' });
    const held = spoolsHeld(p);
    ui.text(ctx, `${held} spool${held === 1 ? '' : 's'}`, x + w, y, { color: COLORS.dim, align: 'right' });
    y += 14;
    // how many of each grade, the finest first
    const spools = this.all.flatMap((k) => Array<ThreadSpool>(k.count).fill(k.spool));
    let gx = x;
    for (const g of [2, 1, 0]) {
      const label = `${GRADES[g]} ${spools.filter((s) => s.grade === g).length}`;
      ui.text(ctx, label, gx, y, { color: GRADE_TINT[g] });
      gx += ui.measure(label) + 12;
    }
    y += 12;
    const woven = this.all.filter((k) => k.where).length;
    ui.text(ctx, `${held - woven} in storage, ${woven} woven`, x, y, { color: COLORS.dim });
    y += 14;
    ui.divider(ctx, PX + 8, y, PW - 16);
    y += 12;
    ui.text(ctx, 'WHERE SPOOLS ARE FOUND', x, y, { color: COLORS.goldHi, variant: 'bold' });
    y += 16;
    for (const loc of LOCATIONS) {
      if (!loc.patterns) continue;
      const open = locationOpen(p, loc);
      ui.text(ctx, `${loc.chapter}. ${loc.name}`, x, y, { color: open ? COLORS.text : COLORS.faint });
      // its two patterns on the right, each a spool and a name
      let rx = x + w;
      for (const id of [...loc.patterns].reverse()) {
        const name = patternName(id);
        ui.text(ctx, name, rx, y, { color: open ? PATTERN_TINT[id] : COLORS.faint, align: 'right' });
        rx -= ui.measure(name) + 20;
        if (!open) ctx.globalAlpha = 0.45;
        ui.blit(ctx, `spool_${id}_1`, rx, y - 5);
        ctx.globalAlpha = 1;
        rx -= 6;
      }
      if (live) {
        ui.regions.push({
          x, y: y - 4, w, h: 18,
          tip: () => ({ title: `${loc.chapter}. ${loc.name}`, sub: open ? undefined : `Opens after stage ${loc.requires}`, body: `Every stage here finds ${loc.patterns!.map(patternName).join(' or ')} spools.`, color: COLORS.goldHi }),
        });
      }
      y += 20;
    }
    y += 2;
    y += ui.para(ctx, "Every victory finds a spool of its area's two patterns, and a flawless one a second. The later stages of an area find finer grades more often.", x, y, w, { color: COLORS.dim }, 10) + 6;
    ui.para(ctx, 'Choose a spool to read it, weave it into a champion or unravel it.', x, y, w, { color: COLORS.faint }, 10);
  }

  /** The chosen spool read out: its art, pattern, grade and stats, the slots it fits, where it is found and where it is now; then what can be done with it. */
  private readOut(ctx: CanvasRenderingContext2D, k: Card, live: boolean) {
    const ui = this.ui;
    const s = k.spool;
    const tint = PATTERN_TINT[s.pattern];
    const x = PX + 12, w = PW - 24;
    // the spool at twice its size, in a pool of its light
    ui.glow(ctx, PX + 36, PY + 50, 30, 42, tint, 0.5);
    const art = ui.part(spoolArt(s));
    ctx.drawImage(this.a.ui.img, art[0], art[1], art[2], art[3], PX + 14, PY + 14, art[2] * 2, art[3] * 2);
    const x2 = PX + 68;
    ui.text(ctx, patternName(s.pattern).toUpperCase(), x2, PY + 14, { color: tint, variant: 'bold' });
    ui.text(ctx, `${GRADES[s.grade]} spool`, x2, PY + 26, { color: GRADE_TINT[s.grade] });
    ui.text(ctx, 'MAIN', x2, PY + 42, { color: COLORS.faint, variant: 'bold' });
    ui.text(ctx, statText(s.main.stat, s.main.value), x2, PY + 52, { color: COLORS.goldHi, variant: 'display' });
    ui.blit(ctx, roseMark(s), x2, PY + 76);
    ui.para(ctx, `Fits ${fitsText(s)}`, x2 + 17, PY + 78, PX + PW - 12 - x2 - 17, { color: COLORS.dim }, 10);
    let y = PY + 100;
    ui.divider(ctx, PX + 8, y, PW - 16);
    y += 12;
    // strands: in a matrix as they count in their slot (attuned ones in gold)
    const m = k.where ? this.archivist.reliquary.file(k.where.champion).matrix : null;
    ui.text(ctx, 'STRANDS', x, y, { color: COLORS.dim, variant: 'bold' });
    y += 12;
    for (const st of s.strands) {
      const tuned = !!m && !!k.where && strandValue(m, k.where.slot, st) > st.value;
      ui.text(ctx, m && k.where ? strandText(m, k.where.slot, st) : statText(st.stat, st.value), x + 8, y, { color: tuned ? COLORS.gold : COLORS.text });
      y += 10;
    }
    y += 6;
    const p = pattern(s.pattern);
    ui.text(ctx, 'WEAVE PATTERN', x, y, { color: COLORS.dim, variant: 'bold' });
    y += 12;
    if (p) y += ui.para(ctx, `Every ${p.pieces} ${p.name} spools in a matrix weave ${patternBonusText(p)}, wherever they sit.`, x, y, w, { color: COLORS.text }, 10);
    y += 6;
    ui.text(ctx, 'FOUND IN', x, y, { color: COLORS.dim, variant: 'bold' });
    y += 12;
    const found = LOCATIONS.filter((l) => l.patterns?.includes(s.pattern)).map((l) => `${l.chapter}. ${l.name}`);
    y += ui.para(ctx, found.length ? found.join(', ') : 'No area yet.', x, y, w, { color: COLORS.text }, 10);
    y += 6;
    if (k.where) {
      const c = champion(k.where.champion);
      ui.text(ctx, 'WOVEN', x, y, { color: COLORS.dim, variant: 'bold' });
      this.face(ctx, c.id, x + 50, y - 4);
      ui.text(ctx, c.name, x + 72, y - 3, { color: c.color, variant: 'bold' });
      ui.text(ctx, SLOT_NAMES[k.where.slot], x + 72, y + 7, { color: COLORS.dim });
    } else {
      ui.text(ctx, 'IN STORAGE', x, y, { color: COLORS.dim, variant: 'bold' });
      ui.text(ctx, k.count > 1 ? `${k.count} alike` : 'loose', x + ui.measure('IN STORAGE', 'bold') + 8, y, { color: COLORS.text });
    }
    if (!live) return;
    // the actions at the panel's foot
    const by = PY + PH - 32, bw = Math.floor((w - 6) / 2);
    if (this.confirm) {
      ui.text(ctx, 'Unravel it for good?', x, by + 7, { color: COLORS.bad, variant: 'bold' });
      ui.button(ctx, 'w_yes', x + w - 92, by + 1, 44, 20, 'YES', { kind: 'small', click: () => this.unravel(k) });
      ui.button(ctx, 'w_no', x + w - 44, by + 1, 44, 20, 'NO', { kind: 'small', click: () => (this.confirm = false) });
    } else if (k.where) {
      const where = k.where;
      ui.button(ctx, 'w_out', x, by, bw, 22, 'TAKE OUT', { kind: 'small', click: () => this.takeOut(where), tip: () => ({ title: 'Take out', body: `Back to storage; ${SLOT_NAMES[where.slot]} stands empty.` }) });
      ui.button(ctx, 'w_view', x + bw + 6, by, bw, 22, 'CHAMPION', { kind: 'small', icon: 'mi_champions', click: () => this.viewChampion(where), tip: () => ({ title: champion(where.champion).name, body: 'Open the champion page on its matrix.' }) });
    } else {
      ui.button(ctx, 'w_weave', x, by, bw, 22, 'WEAVE', { icon: 'mi_weaving', click: () => this.openDialog(), tip: () => ({ title: 'Weave', body: `Into a champion's ${fitsText(s)}. A spool already there goes back to storage.` }) });
      ui.button(ctx, 'w_unravel', x + bw + 6, by, bw, 22, 'UNRAVEL', { kind: 'small', color: COLORS.bad, click: () => (this.confirm = true), tip: () => ({ title: 'Unravel', body: 'The spool is gone for good: its thread returns to the Loom. Spools are not improved or traded in yet.' }) });
    }
  }

  // ---------------------------------------------------------------------------
  // actions

  private takeOut(where: NonNullable<Where>) {
    const k = this.chosen();
    if (!k) return;
    this.archivist.reliquary.unequip(where.champion, where.slot);
    this.app.save();
    this.pick = { spool: k.spool, where: null };
    this.say(`Taken out of ${champion(where.champion).name}'s ${SLOT_NAMES[where.slot]}: back in storage.`);
  }

  private unravel(k: Card) {
    this.archivist.reliquary.unravel(k.spool);
    this.app.save();
    this.confirm = false;
    if (k.count <= 1) this.pick = null;
    this.say(`${patternName(k.spool.pattern)} spool unravelled: its thread returns to the Loom.`);
  }

  private viewChampion(where: NonNullable<Where>) {
    this.app.router.champion(where.champion, roster(this.archivist), { tab: 'matrix', slot: where.slot, back: () => this.app.router.weaving(this.snapshot()) });
  }

  /** The weave dialog opens on the champion Weaving was opened for, else on choosing one. */
  private openDialog() {
    const k = this.chosen();
    if (!k || k.where) return;
    const pre = this.at.champion && roster(this.archivist).includes(this.at.champion) ? this.at.champion : null;
    this.dialog = { champion: pre, hover: null };
    this.ui.focusId = pre ? 'w_slot_' + slotsFor(MATRIX_LAYOUT, k.spool)[0] : 'w_c_' + roster(this.archivist)[0];
  }

  /** Esc or BACK in the dialog: from a slot back to the champions, else closed. */
  private dialogBack() {
    const d = this.dialog;
    if (d?.champion) {
      this.ui.focusId = 'w_c_' + d.champion;
      d.champion = null;
      d.hover = null;
    } else this.closeDialog();
  }

  private closeDialog() {
    const k = this.chosen();
    this.dialog = null;
    this.ui.focusId = k ? 'w_weave' : 'tab_all';
  }

  private weaveInto(id: string, slot: SlotIndex) {
    const k = this.chosen();
    if (!k || k.where) return;
    const rel = this.archivist.reliquary;
    const held = rel.file(id).matrix.slots[slot].spool;
    rel.equip(id, slot, k.spool);
    this.app.save();
    const where = { champion: id, slot };
    this.pick = { spool: k.spool, where };
    this.dialog = null;
    this.ui.focusId = 'card_' + cardKey(k.spool, where);
    this.say(`Woven into ${champion(id).name}'s ${SLOT_NAMES[slot]}.${held ? ` The ${patternName(held.pattern)} spool it held is back in storage.` : ''}`);
  }

  // ---------------------------------------------------------------------------
  // the weave dialog

  private drawDialog(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const k = this.chosen();
    const d = this.dialog;
    if (!k || !d) {
      this.dialog = null;
      return;
    }
    ui.dim(ctx, 0.6);
    // a click beside the dialog closes it; the dialog itself stops clicks
    ui.regions.push({ x: 0, y: 0, w: W, h: H, click: () => this.closeDialog() });
    ui.regions.push({ x: DX, y: DY, w: DW, h: DH });
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(DX + 3, DY + 3, DW - 6, DH - 6);
    ui.panel(ctx, 'gold', DX, DY, DW, DH);
    const s = k.spool;
    ui.blit(ctx, spoolIcon(s), DX + 12, DY + 9);
    ui.text(ctx, 'WEAVE', DX + 36, DY + 10, { color: COLORS.goldHi, variant: 'bold' });
    const line = `${patternName(s.pattern)}, ${GRADES[s.grade]}, ${statText(s.main.stat, s.main.value)}`;
    ui.text(ctx, line, DX + 42 + ui.measure('WEAVE', 'bold'), DY + 10, { color: PATTERN_TINT[s.pattern] });
    ui.text(ctx, `Fits ${fitsText(s)}`, DX + 36, DY + 21, { color: COLORS.dim });
    ui.divider(ctx, DX + 10, DY + 34, DW - 20);
    if (d.champion) this.slotStep(ctx, k, d.champion);
    else this.championStep(ctx, k);
  }

  /** Step one: every champion you own; a green + marks one with a free slot for the spool. */
  private championStep(ctx: CanvasRenderingContext2D, k: Card) {
    const ui = this.ui;
    const rel = this.archivist.reliquary;
    const own = roster(this.archivist);
    const slots = slotsFor(MATRIX_LAYOUT, k.spool);
    ui.text(ctx, 'CHOOSE A CHAMPION', DX + 14, DY + 46, { color: COLORS.dim, variant: 'bold' });
    ui.text(ctx, '+ a free slot for it', DX + DW - 14, DY + 46, { color: COLORS.faint, align: 'right' });
    const cw = 40, chh = 48, gap = 6, per = 10;
    const gx0 = DX + Math.round((DW - (per * (cw + gap) - gap)) / 2);
    own.forEach((id, i) => {
      const c = champion(id);
      const x = gx0 + (i % per) * (cw + gap), y = DY + 60 + Math.floor(i / per) * (chh + 8);
      const fid = 'w_c_' + id;
      const hot = ui.hot(fid, x, y, cw, chh);
      const m = rel.file(id).matrix;
      ctx.fillStyle = hot ? '#2a3a5a' : '#141c30';
      ctx.fillRect(x + 2, y + 2, cw - 4, chh - 4);
      blit(ctx, this.a.ui.img, this.a.ui.json.portraits[id], x + 6, y + 4);
      nine(ctx, this.a.ui.img, ui.part('card_' + c.rarity), x, y, cw, chh, 8);
      ui.blit(ctx, 'gem_' + c.affinity, x + 3, y + 24);
      if (slots.some((i) => !m.slots[i].spool)) ui.text(ctx, '+', x + cw - 10, y + 34, { color: COLORS.good, variant: 'bold' });
      if (hot) {
        ctx.strokeStyle = COLORS.goldHi;
        ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, chh - 1);
      }
      ui.regions.push({
        id: fid, x, y, w: cw, h: chh,
        click: () => {
          this.dialog = { champion: id, hover: null };
          this.ui.focusId = 'w_slot_' + slots[0];
        },
        tip: () => ({
          title: c.name,
          sub: `${RARITIES[c.rarity].name} ${c.role}`,
          body: slots.map((i) => {
            const held = m.slots[i].spool;
            return `${SLOT_NAMES[i]}: ${held ? `${patternName(held.pattern)} ${statText(held.main.stat, held.main.value)}` : 'empty'}.`;
          }).join(' '),
          color: c.color,
        }),
      });
    });
    ui.button(ctx, 'w_cancel', DX + DW - 14 - 96, DY + DH - 34, 96, 22, 'CANCEL', { kind: 'small', click: () => this.closeDialog() });
  }

  /**
   * Step two: the champion's matrix rose, the slots that take the spool ringed;
   * a button for each of them, the one under the pointer previewing what the
   * champion's stats and woven patterns become.
   */
  private slotStep(ctx: CanvasRenderingContext2D, k: Card, id: string) {
    const ui = this.ui;
    const img = this.a.ui.img;
    const c = champion(id);
    const m = this.archivist.reliquary.file(id).matrix;
    const slots = slotsFor(MATRIX_LAYOUT, k.spool);
    const d = this.dialog!;
    // the champion
    const pr = this.a.ui.json.portraits[id];
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(DX + 14, DY + 42, 30, 30);
    ctx.fillStyle = RARITIES[c.rarity].color;
    ctx.fillRect(DX + 15, DY + 43, 28, 28);
    blit(ctx, img, pr, DX + 15, DY + 43);
    ui.text(ctx, c.name, DX + 50, DY + 46, { color: c.color, variant: 'bold' });
    ui.text(ctx, `${RARITIES[c.rarity].name} ${c.role}`, DX + 50, DY + 58, { color: COLORS.dim });
    // its rose: the slots that take the spool ringed, the hovered one bright; the others faded
    const rx = DX + 16, ry = DY + 80, half = 72;
    blit(ctx, img, ui.part('matrix_rose'), rx, ry);
    const target = d.hover ?? slots[0];
    m.slots.forEach((slot, i) => {
      const a = ((i * 60 - 90) * Math.PI) / 180;
      const lx = Math.round(rx + half + Math.cos(a) * 42), ly = Math.round(ry + half + Math.sin(a) * 42);
      const takes = slots.includes(i as SlotIndex);
      ctx.globalAlpha = takes ? 1 : 0.35;
      if (slot.spool) blit(ctx, img, ui.part(spoolIcon(slot.spool)), lx - 9, ly - 9);
      else {
        const lines = emptyLabel(slot.node);
        const pitch = lines.length > 2 ? 9 : 10, top = ly - 4 - Math.floor(((lines.length - 1) * pitch) / 2);
        lines.forEach((t, n) => ui.text(ctx, t, lx, top + n * pitch, { color: slot.node.kind === 'fixed' ? '#c8a050' : '#7fb4f0', align: 'center' }));
      }
      ctx.globalAlpha = 1;
      if (!takes) return;
      blit(ctx, img, ui.part(i === target ? 'lobe_sel' : 'lobe_attune'), lx - 23, ly - 23);
      ui.regions.push({ x: lx - 18, y: ly - 18, w: 36, h: 36, click: () => this.weaveInto(id, i as SlotIndex), hover: () => (d.hover = i as SlotIndex) });
    });
    const gem = ui.part('gem_' + c.affinity);
    blit(ctx, img, gem, rx + half - Math.floor(gem[2] / 2), ry + half - Math.floor(gem[3] / 2));
    // a button for each slot that takes the spool: its name, and what it holds now
    const bx = DX + 182, bw = DW - 182 - 14;
    ui.text(ctx, slots.length > 1 ? 'CHOOSE A SLOT' : 'WEAVE INTO', bx, DY + 46, { color: COLORS.dim, variant: 'bold' });
    let y = DY + 60;
    for (const i of slots) {
      const held = m.slots[i].spool;
      const bid = 'w_slot_' + i;
      if (ui.button(ctx, bid, bx, y, bw, 24, '', { kind: 'small', click: () => this.weaveInto(id, i) })) d.hover = i;
      const on = ui.focusId === bid;
      ui.text(ctx, SLOT_NAMES[i].toUpperCase(), bx + 8, y + 8, { color: on ? COLORS.goldHi : COLORS.text, variant: 'bold' });
      if (held) {
        blit(ctx, img, ui.part(spoolIcon(held)), bx + bw - 26, y + 3);
        ui.text(ctx, `${patternName(held.pattern)} ${statText(held.main.stat, held.main.value)}`, bx + bw - 30, y + 8, { color: PATTERN_TINT[held.pattern], align: 'right' });
      } else ui.text(ctx, 'empty', bx + bw - 10, y + 8, { color: COLORS.faint, align: 'right' });
      y += 28;
    }
    // what the champion becomes with the spool in the target slot
    y += 4;
    const after = m.equip(target, k.spool).matrix;
    ui.text(ctx, `IN ${SLOT_NAMES[target].toUpperCase()}`, bx, y, { color: COLORS.dim, variant: 'bold' });
    y += 13;
    const b0 = wovenStats(c.stats, m), b1 = wovenStats(c.stats, after);
    const col = (n: number) => bx + (n % 2) * Math.floor(bw / 2);
    let n = 0;
    for (const st of STAT_IDS) {
      if (Math.abs(b1[st] - b0[st]) < 1e-9) continue;
      const cy = y + Math.floor(n / 2) * 11;
      ui.text(ctx, STAT_NAME[st], col(n), cy, { color: COLORS.dim, variant: 'bold' });
      ui.text(ctx, `${statValue(st, b0[st])} > ${statValue(st, b1[st])}`, col(n) + 46, cy, { color: b1[st] > b0[st] ? COLORS.good : COLORS.bad });
      n++;
    }
    y += Math.ceil(n / 2) * 11 + 4;
    // patterns that the weave completes or breaks
    const ev = new WeavePatternEvaluator(CORE_WEAVE_PATTERNS);
    const times = (mx: WeaverMatrix) => new Map(ev.evaluate(mx).map((wp) => [wp.pattern.id, wp.times]));
    const t0 = times(m), t1 = times(after);
    for (const p of CORE_WEAVE_PATTERNS) {
      const a = t0.get(p.id) ?? 0, b = t1.get(p.id) ?? 0;
      if (a === b) continue;
      const text = b > a ? `Weaves ${p.name}${b > 1 ? ` x${b}` : ''}: ${patternBonusText(p, b)}` : `${p.name} comes apart${b ? ` (x${b} left)` : ''}`;
      ui.text(ctx, text, bx, y, { color: b > a ? PATTERN_TINT[p.id] : COLORS.bad });
      y += 11;
    }
    const held = m.slots[target].spool;
    if (held) ui.para(ctx, `The ${patternName(held.pattern)} spool in ${SLOT_NAMES[target]} goes back to storage.`, bx, y + 2, bw, { color: COLORS.faint }, 10);
    // the way back
    const fy = DY + DH - 34;
    ui.button(ctx, 'w_back', bx, fy, 120, 22, 'OTHER CHAMPION', { kind: 'small', click: () => this.dialogBack() });
    ui.button(ctx, 'w_cancel', DX + DW - 14 - 96, fy, 96, 22, 'CANCEL', { kind: 'small', click: () => this.closeDialog() });
  }
}
