// The Merchant's trade (Jakub, 2026-11-03; the numbers in data/economy.ts): spools
// priced by grade alone, a spool costing twenty times what the Merchant pays for
// it. The wares are 5 Ashen, 3 Silver and 2 Gilded spools of random patterns and
// main stats, rolled the first time the Merchant is opened and kept in the save,
// each sold once; for 5000 Gold the player has them rotated, ten fresh ones rolled
// in place of all of them. Buying takes the price in Gold and puts the spool in
// storage as a new find; selling takes a loose
// spool out of storage for good and pays its price; a woven spool must be taken
// out of its slot first, as for unravelling. Rules: docs/MECHANICS_GUIDE.md 17.
import type { MasterArchivist } from './archivist';
import { buyPrice, MERCHANT_WARES, ROTATE_PRICE, sellPrice } from './data/economy';
import { PATTERN_IDS } from './data/matrix';
import { rollMainStat } from './reliquary/drops';
import { Grade, rollSpool, sameSpool, ThreadSpool } from './reliquary/matrix';

/** A spool on the Merchant's counter, and whether it has been bought. */
export interface Ware {
  readonly spool: ThreadSpool;
  sold: boolean;
}

/** Fresh wares: so many spools of each grade, Ashen first, each of a random pattern and main stat. */
export function rollWares(rng: () => number = Math.random): Ware[] {
  const out: Ware[] = [];
  MERCHANT_WARES.forEach((n, g) => {
    for (let i = 0; i < n; i++) {
      const pattern = PATTERN_IDS[Math.floor(rng() * PATTERN_IDS.length)];
      out.push({ spool: rollSpool(pattern, g as Grade, rollMainStat(rng), rng), sold: false });
    }
  });
  return out;
}

/** The wares, rolled on the first visit. Returns whether they were rolled now (the save should be written). */
export function stockMerchant(a: MasterArchivist, rng: () => number = Math.random): boolean {
  if (a.wares.length) return false;
  a.wares = rollWares(rng);
  return true;
}

/** Rotates the wares: their price in Gold, then fresh wares in place of all of them. Returns whether the purse could pay. */
export function rotateWares(a: MasterArchivist, rng: () => number = Math.random): boolean {
  if (a.gold < ROTATE_PRICE) return false;
  a.gold -= ROTATE_PRICE;
  a.wares = rollWares(rng);
  return true;
}

export type BuyResult = 'bought' | 'sold out' | 'too dear';

/** Buys the ware at `index`: its price in Gold, the spool into storage as a new find. */
export function buyWare(a: MasterArchivist, index: number): BuyResult {
  const w = a.wares[index];
  if (!w || w.sold) return 'sold out';
  const price = buyPrice(w.spool.grade);
  if (a.gold < price) return 'too dear';
  a.gold -= price;
  w.sold = true;
  a.reliquary.addSpool(w.spool, true);
  return 'bought';
}

/** Sells a loose spool: it leaves storage for good and pays its price. Returns the Gold paid, 0 when it is not loose in storage. */
export function sellSpool(a: MasterArchivist, spool: ThreadSpool): number {
  if (!a.reliquary.spools().some((s) => sameSpool(s, spool))) return 0;
  a.reliquary.unravel(spool);
  const paid = sellPrice(spool.grade);
  a.gold += paid;
  return paid;
}
