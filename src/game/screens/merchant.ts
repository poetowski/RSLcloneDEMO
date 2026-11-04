// The Merchant (Jakub, 2026-11-03: "create a screen for Merchant and put object on
// main menu and make it navigational to a new merchant screen. on merchant screen
// player see their current gold and they will be able to buy and sell items"; then
// the spools' prices and wares the same day). Reached from the Merchant's Wagon in
// Loomfall's square. The purse shows the Gold held. BUY lays out the wares, 5 Ashen, 3
// Silver and 2 Gilded spools, each with its price; SELL the loose spools in storage,
// each with what the Merchant pays. Choosing a spool shows it on the right with its
// price and the button that trades it. Rules: src/game/merchant.ts.
import { W } from '../../engine/screen';
import { App } from '../app';
import { frontier, saveArchivist } from '../archivist';
import { zoneOf } from '../data/campaign';
import { BUY_FACTOR, buyPrice, CURRENCY, ROTATE_PRICE, sellPrice } from '../data/economy';
import { GRADES, pattern, patternBonusText } from '../data/matrix';
import { buyWare, rotateWares, sellSpool, stockMerchant } from '../merchant';
import { sameSpool, ThreadSpool } from '../reliquary/matrix';
import { GOLD_TINT, goldText } from '../ui/gold';
import { drawScrollHints, Scroller } from '../ui/scroll';
import { fitsText, GRADE_TINT, PATTERN_TINT, patternName, roseMark, spoolArt, statText } from '../ui/spools';
import { COLORS } from '../ui/ui';
import { blit, nine, Rect4 } from '../view/assets';
import { BaseScreen, Diorama } from './base';
import { shade } from './collection';

export type MerchantTab = 'buy' | 'sell';

const TABS: readonly { id: MerchantTab; name: string }[] = [
  { id: 'buy', name: 'BUY' },
  { id: 'sell', name: 'SELL' },
];

/** the purse, under the header on the right */
const PURSE = { x: W - 214, y: 38, w: 200, h: 46 };
/** the cards: their size, the gap, five to a row, in a window that scrolls (SELL) */
const CW = 66, CH = 74, GAP = 8, COLS = 5;
const VIEW: Rect4 = [16, 96, COLS * CW + (COLS - 1) * GAP, 2 * CH + GAP + 64];
/** the chosen spool, on the right */
const DETAIL: Rect4 = [VIEW[0] + VIEW[2] + 14, 94, 0, 0];
DETAIL[2] = W - 14 - DETAIL[0];
DETAIL[3] = VIEW[3] + 4;
const GRADE_KEY = ['ashen', 'silver', 'gilded'];

/** What a card shows: the spool, its price, and whether it can still be had. */
interface Card {
  key: string;
  spool: ThreadSpool;
  price: number;
  sold?: boolean;
}

export class MerchantScreen extends BaseScreen {
  private diorama: Diorama;
  private scroll = new Scroller();
  /** the card chosen on each tab */
  private chosen: Record<MerchantTab, string | null> = { buy: null, sell: null };
  /** what the last trade did, shown under the button */
  private note: { text: string; color: string } | null = null;

  constructor(
    app: App,
    private tab: MerchantTab = 'buy',
  ) {
    super(app);
    this.diorama = new Diorama(app, zoneOf(frontier(this.archivist)));
    if (stockMerchant(this.archivist)) saveArchivist(this.archivist);
    this.ui.focusId = 'tab_' + tab;
  }

  protected back() {
    this.app.router.menu();
  }

  protected update(dt: number) {
    this.diorama.update(dt);
    this.scroll.update(dt);
  }

  wheel(dy: number) {
    if (this.tab === 'sell') this.scroll.by(Math.sign(dy) * Math.min(CH + GAP, Math.max(36, Math.abs(dy))));
  }

  /** A finger (or the mouse) dragging the spools on SELL. */
  drag(_dx: number, dy: number) {
    if (this.tab === 'sell') this.scroll.shift(-dy);
  }

  private setTab(t: MerchantTab) {
    this.tab = t;
    this.note = null;
    this.scroll.to(0);
  }

  /** The cards of the tab shown: the wares on BUY, the loose spools on SELL. */
  private cards(): Card[] {
    const a = this.archivist;
    if (this.tab === 'buy') return a.wares.map((w, i) => ({ key: 'w' + i, spool: w.spool, price: buyPrice(w.spool.grade), sold: w.sold }));
    // the loose spools, best first; alike ones each have their own card
    return a.reliquary
      .spools()
      .map((spool, i) => ({ key: 's' + i, spool, price: sellPrice(spool.grade) }))
      .sort((p, q) => q.spool.grade - p.spool.grade || p.spool.pattern.localeCompare(q.spool.pattern));
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    this.diorama.draw(ctx, this.t, 0.72);
    this.header(ctx, 'MERCHANT', "The Merchant's Wagon");
    this.tabs(ctx);
    this.purse(ctx);
    const cards = this.cards();
    if (!cards.some((c) => c.key === this.chosen[this.tab])) this.chosen[this.tab] = cards.find((c) => !c.sold)?.key ?? cards[0]?.key ?? null;
    this.grid(ctx, cards);
    if (this.tab === 'buy') this.rotateButton(ctx);
    this.detail(ctx, cards.find((c) => c.key === this.chosen[this.tab]));
  }

  /** BUY and SELL. */
  private tabs(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    let tx = 12;
    for (const t of TABS) {
      const id = 'tab_' + t.id;
      const w = ui.measure(t.name) + 16;
      const on = this.tab === t.id;
      const hot = ui.hot(id, tx, 36, w, 16);
      nine(ctx, this.a.ui.img, ui.part(on ? 'tab_on' : 'tab_off'), tx, 36, w, 16, 5);
      ui.text(ctx, t.name, tx + 8, 40, { color: on || hot ? COLORS.goldHi : COLORS.dim });
      ui.regions.push({ id, x: tx, y: 36, w, h: 16, click: () => this.setTab(t.id) });
      tx += w + 4;
    }
    const hint = this.tab === 'buy' ? `A spool costs ${BUY_FACTOR} times what the Merchant pays for it.` : 'Only loose spools: take one out of its slot in Weaving to sell it.';
    ui.text(ctx, hint, 12, 60, { color: COLORS.faint });
  }

  /** The Gold held: the coins, the sum. */
  private purse(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const { x, y, w, h } = PURSE;
    ui.panel(ctx, 'gold', x, y, w, h);
    ui.blit(ctx, 'biggold', x + 12, y + 11);
    ui.text(ctx, 'YOUR PURSE', x + 46, y + 9, { color: COLORS.dim });
    ui.text(ctx, goldText(this.archivist.gold), x + 46, y + 23, { color: GOLD_TINT, variant: 'bold' });
  }

  /** The cards in their window, five to a row; SELL's scroll. */
  private grid(ctx: CanvasRenderingContext2D, cards: Card[]) {
    const ui = this.ui;
    const [vx, vy, vw, vh] = VIEW;
    ui.panel(ctx, 'well', vx - 8, vy - 8, vw + 16, vh + 16);
    if (!cards.length) {
      ui.text(ctx, 'No loose spools to sell.', vx + vw / 2, vy + vh / 2 - 10, { color: COLORS.text, align: 'center', variant: 'bold' });
      ui.text(ctx, 'Spools come from campaign victories and the Journey.', vx + vw / 2, vy + vh / 2 + 4, { color: COLORS.dim, align: 'center' });
      return;
    }
    const rows = Math.ceil(cards.length / COLS);
    this.scroll.extent(rows * (CH + GAP) - GAP, vh);
    const focused = cards.findIndex((c) => 'card_' + c.key === ui.focusId);
    if (ui.keyboard && focused >= 0) this.scroll.reveal(Math.floor(focused / COLS) * (CH + GAP), CH, vh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(vx - 4, vy - 4, vw + 8, vh + 8);
    ctx.clip();
    cards.forEach((c, i) => this.card(ctx, c, vx + (i % COLS) * (CW + GAP), vy + Math.floor(i / COLS) * (CH + GAP) - Math.round(this.scroll.offset)));
    ctx.restore();
    drawScrollHints(ui, ctx, this.scroll, VIEW, CH + GAP, this.t);
  }

  /** A card: the spool in a window tinted by its thread, the frame of its grade, its main stat, its price; SOLD across a ware bought. */
  private card(ctx: CanvasRenderingContext2D, c: Card, x: number, y: number) {
    const ui = this.ui;
    const id = 'card_' + c.key;
    const click = () => {
      this.chosen[this.tab] = c.key;
      this.note = null;
    };
    if (y + CH + 4 < VIEW[1] || y - 4 > VIEW[1] + VIEW[3]) {
      ui.regions.push({ id, x, y, w: CW, h: CH, clip: VIEW, click });
      return;
    }
    const img = this.a.ui.img;
    const hot = ui.hot(id, x, y, CW, CH, VIEW);
    const sel = this.chosen[this.tab] === c.key;
    const tint = PATTERN_TINT[c.spool.pattern];
    ctx.globalAlpha = c.sold ? 0.45 : 1;
    ui.bands(ctx, x + 3, y + 3, CW - 6, 42, '#080a12', shade(tint, 0.3), 6);
    ctx.fillStyle = 'rgba(5,7,12,0.88)';
    ctx.fillRect(x + 3, y + 45, CW - 6, CH - 48);
    ui.glow(ctx, x + CW / 2, y + 25, 17, 15, tint, hot || sel ? 0.5 : 0.28);
    const art = ui.part(spoolArt(c.spool));
    blit(ctx, img, art, x + Math.round(CW / 2 - art[2] / 2), y + 7 - (hot ? 1 : 0));
    nine(ctx, img, ui.part('card_' + GRADE_KEY[c.spool.grade]), x, y, CW, CH, 8);
    ui.blit(ctx, roseMark(c.spool), x + 5, y + 5);
    ui.text(ctx, statText(c.spool.main.stat, c.spool.main.value), x + CW / 2, y + 48, { color: sel || hot ? COLORS.goldHi : COLORS.text, align: 'center' });
    const price = String(c.price), pw = ui.measure(price) + 13;
    ui.blit(ctx, 'gold', Math.round(x + CW / 2 - pw / 2), y + 59);
    ui.text(ctx, price, Math.round(x + CW / 2 - pw / 2) + 13, y + 60, { color: this.affordable(c) ? GOLD_TINT : COLORS.dim });
    ctx.globalAlpha = 1;
    if (c.sold) ui.text(ctx, 'SOLD', x + CW / 2, y + 22, { color: COLORS.bad, align: 'center', variant: 'bold' });
    if (sel) {
      ctx.strokeStyle = COLORS.goldHi;
      ctx.strokeRect(x - 1.5, y - 1.5, CW + 3, CH + 3);
      ctx.strokeStyle = COLORS.ink;
      ctx.strokeRect(x - 2.5, y - 2.5, CW + 5, CH + 5);
    } else if (hot) {
      ctx.strokeStyle = COLORS.goldHi;
      ctx.strokeRect(x - 0.5, y - 0.5, CW + 1, CH + 1);
    }
    ui.regions.push({ id, x, y, w: CW, h: CH, clip: VIEW, click });
  }

  /** On BUY, whether the purse holds the price; on SELL always. */
  private affordable(c: Card): boolean {
    return this.tab === 'sell' || (!c.sold && this.archivist.gold >= c.price);
  }

  /** The chosen spool: its name, grade and slots, its stats, its pattern's bonus, its price and the button that trades it. */
  private detail(ctx: CanvasRenderingContext2D, c: Card | undefined) {
    const ui = this.ui;
    const [x, y, w, h] = DETAIL;
    ui.panel(ctx, 'gold', x, y, w, h);
    if (!c) {
      ui.para(ctx, 'Nothing to show.', x + 12, y + 14, w - 24, { color: COLORS.dim });
      return;
    }
    const s = c.spool;
    const tint = PATTERN_TINT[s.pattern];
    ui.glow(ctx, x + 30, y + 32, 20, 18, tint, 0.4);
    const art = ui.part(spoolArt(s));
    blit(ctx, this.a.ui.img, art, x + 30 - Math.round(art[2] / 2), y + 14);
    ui.text(ctx, `${patternName(s.pattern)} spool`, x + 56, y + 14, { color: tint, variant: 'bold' });
    ui.text(ctx, GRADES[s.grade], x + 56, y + 27, { color: GRADE_TINT[s.grade] });
    let cy = y + 58;
    cy += ui.para(ctx, `Fits ${fitsText(s)}.`, x + 12, cy, w - 24, { color: COLORS.dim }) + 4;
    ui.text(ctx, `Main ${statText(s.main.stat, s.main.value)}`, x + 12, cy, { color: COLORS.text });
    cy += 12;
    cy += ui.para(ctx, `Strands ${s.strands.map((t) => statText(t.stat, t.value)).join(', ')}`, x + 12, cy, w - 24, { color: COLORS.text }) + 4;
    const p = pattern(s.pattern);
    if (p) cy += ui.para(ctx, `${p.pieces} ${p.name} spools weave ${patternBonusText(p)}.`, x + 12, cy, w - 24, { color: COLORS.faint });
    // the price and the trade
    const by = y + h - 58;
    ui.divider(ctx, x + 10, by - 6, w - 20);
    ui.blit(ctx, 'gold', x + 12, by + 2);
    ui.text(ctx, `${c.price} ${CURRENCY.name}`, x + 26, by + 3, { color: GOLD_TINT, variant: 'bold' });
    ui.text(ctx, this.tab === 'buy' ? 'to buy' : 'paid to you', x + w - 12, by + 3, { color: COLORS.dim, align: 'right' });
    const bw = w - 24, bx = x + 12, bty = by + 16;
    if (this.tab === 'buy') {
      const can = this.affordable(c);
      ui.button(ctx, 'trade', bx, bty, bw, 22, c.sold ? 'SOLD' : 'BUY', { disabled: !can, click: () => this.buy(c) });
      if (!c.sold && !can && !this.note) ui.text(ctx, `${c.price - this.archivist.gold} ${CURRENCY.name} short.`, x + w / 2, bty + 26, { color: COLORS.faint, align: 'center' });
    } else ui.button(ctx, 'trade', bx, bty, bw, 22, 'SELL', { click: () => this.sell(c) });
    if (this.note) ui.text(ctx, this.note.text, x + w / 2, bty + 26, { color: this.note.color, align: 'center' });
  }

  /** Under the wares: fresh ones for a price. */
  private rotateButton(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const [vx, vy, , vh] = VIEW;
    const can = this.archivist.gold >= ROTATE_PRICE;
    const y = vy + vh + 14, w = 150;
    ui.button(ctx, 'rotate', vx, y, w, 20, 'ROTATE WARES', { kind: 'small', disabled: !can, click: () => this.rotate() });
    ui.blit(ctx, 'gold', vx + w + 10, y + 5);
    ui.text(ctx, `${ROTATE_PRICE} ${CURRENCY.name}: ten fresh spools for sale.`, vx + w + 24, y + 6, { color: can ? GOLD_TINT : COLORS.dim });
  }

  private rotate() {
    if (!rotateWares(this.archivist)) return;
    saveArchivist(this.archivist);
    this.chosen.buy = null;
    this.note = { text: 'Fresh wares on the counter.', color: COLORS.good };
  }

  private buy(c: Card) {
    const r = buyWare(this.archivist, Number(c.key.slice(1)));
    if (r !== 'bought') return;
    saveArchivist(this.archivist);
    this.note = { text: 'Bought: it waits in Weaving.', color: COLORS.good };
  }

  private sell(c: Card) {
    const paid = sellSpool(this.archivist, c.spool);
    if (!paid) return;
    saveArchivist(this.archivist);
    // the next card of the same kind stays chosen, so a row of alike spools sells one click at a time
    const next = this.cards().find((k) => sameSpool(k.spool, c.spool)) ?? this.cards()[0];
    this.chosen.sell = next?.key ?? null;
    this.note = { text: `Sold for ${goldText(paid)}.`, color: COLORS.good };
  }
}
