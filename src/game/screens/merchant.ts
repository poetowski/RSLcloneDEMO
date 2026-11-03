// The Merchant (Jakub, 2026-11-03: "create a screen for Merchant and put object on
// main menu and make it navigational to a new merchant screen. on merchant screen
// player see their current gold and they will be able to buy and sell items, but
// this will be implemented later"). Reached from the Merchant's stall in the
// Sanctum. The purse shows the Gold held; BUY and SELL are tabs whose wares wait
// for his design: empty slots on the counter and the word that they come later.
import { W } from '../../engine/screen';
import { App } from '../app';
import { frontier } from '../archivist';
import { zoneOf } from '../data/campaign';
import { CURRENCY } from '../data/economy';
import { GOLD_TINT, goldText } from '../ui/gold';
import { COLORS } from '../ui/ui';
import { nine } from '../view/assets';
import { BaseScreen, Diorama } from './base';

export type MerchantTab = 'buy' | 'sell';

const TABS: readonly { id: MerchantTab; name: string; later: string }[] = [
  { id: 'buy', name: 'BUY', later: 'The Merchant has nothing to sell yet.' },
  { id: 'sell', name: 'SELL', later: 'The Merchant buys nothing yet.' },
];

/** the purse, under the tabs on the right */
const PURSE = { x: W - 214, y: 40, w: 200, h: 46 };
/** the counter's slots: columns, rows, a slot's size and the gap between */
const SLOTS = { cols: 6, rows: 2, w: 72, h: 84, gap: 10, y: 104 };

export class MerchantScreen extends BaseScreen {
  private diorama: Diorama;

  constructor(
    app: App,
    private tab: MerchantTab = 'buy',
  ) {
    super(app);
    this.diorama = new Diorama(app, zoneOf(frontier(this.archivist)));
    this.ui.focusId = 'tab_' + tab;
  }

  protected back() {
    this.app.router.menu();
  }

  protected update(dt: number) {
    this.diorama.update(dt);
  }

  protected draw(ctx: CanvasRenderingContext2D) {
    this.diorama.draw(ctx, this.t, 0.72);
    this.header(ctx, 'MERCHANT', "The Merchant's Stall");
    this.tabs(ctx);
    this.purse(ctx);
    this.counter(ctx);
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
      ui.regions.push({ id, x: tx, y: 36, w, h: 16, click: () => (this.tab = t.id) });
      tx += w + 4;
    }
  }

  /** The Gold held: the coins, the sum, the coin's name under it. */
  private purse(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const { x, y, w, h } = PURSE;
    ui.panel(ctx, 'gold', x, y, w, h);
    ui.blit(ctx, 'biggold', x + 12, y + 11);
    ui.text(ctx, 'YOUR PURSE', x + 46, y + 9, { color: COLORS.dim });
    ui.text(ctx, goldText(this.archivist.gold), x + 46, y + 23, { color: GOLD_TINT, variant: 'bold' });
  }

  /** The counter: rows of empty slots for the wares, and the word that they come later. */
  private counter(ctx: CanvasRenderingContext2D) {
    const ui = this.ui;
    const { cols, rows, w, h, gap, y } = SLOTS;
    const x0 = Math.round(W / 2 - (cols * w + (cols - 1) * gap) / 2);
    ui.panel(ctx, 'well', x0 - 12, y - 12, cols * w + (cols - 1) * gap + 24, rows * h + (rows - 1) * gap + 24);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = x0 + c * (w + gap), sy = y + r * (h + gap);
        ctx.globalAlpha = 0.55 - r * 0.15;
        ui.panel(ctx, 'dark', sx, sy, w, h);
        ctx.fillStyle = '#26364f';
        ctx.fillRect(sx + w / 2 - 14, sy + 16, 28, 28);
        ctx.fillRect(sx + 10, sy + 54, w - 20, 5);
        ctx.fillRect(sx + 18, sy + 66, w - 36, 4);
        ctx.globalAlpha = 1;
      }
    }
    const def = TABS.find((t) => t.id === this.tab)!;
    const ty = y + rows * h + (rows - 1) * gap + 24;
    ui.text(ctx, def.later, W / 2, ty, { color: COLORS.text, align: 'center', variant: 'bold' });
    ui.text(ctx, `Buying and selling for ${CURRENCY.name} come later.`, W / 2, ty + 15, { color: COLORS.dim, align: 'center' });
  }
}
