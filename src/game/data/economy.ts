// The game's coin and its Merchant (Jakub, 2026-11-03: "i want to implement ingame
// currency and merchant. lets call currency as gold for now, but maybe i will rename
// it ... on merchant screen player see their current gold and they will be able to
// buy and sell items, but this will be implemented later. make starting gold of
// players 0"). Then the spools' prices (the same day): "by grade only. buy price is
// always 20x higher than sell price. ashen sell price is 100 gold. silver sell price
// is 300 gold. gilded sell price is 500 gold. in buy section, generate 5 random
// ashen spools for sale, 3 random silver spools for sale and 2 random gilded spools
// for sale", and "player can rotate merchant wares if player pays 5000 gold, then
// it regenerates wares for sale".
import type { Grade } from '../reliquary/matrix';

/** The coin's name, in one place so it can be renamed (his "for now"). */
export const CURRENCY = { name: 'Gold' };

/** Gold on a new account (his). */
export const STARTING_GOLD = 0;

/** What the Merchant pays for a spool, by grade: Ashen, Silver, Gilded (his). */
export const SPOOL_SELL_PRICE: readonly [number, number, number] = [100, 300, 500];

/** A spool costs this many times what the Merchant pays for it (his). */
export const BUY_FACTOR = 20;

/** The spools the Merchant has for sale, by grade: Ashen, Silver, Gilded (his); each of a random pattern and main stat. */
export const MERCHANT_WARES: readonly [number, number, number] = [5, 3, 2];

/** What it costs to have the Merchant lay out fresh wares (his). */
export const ROTATE_PRICE = 5000;

/** What the Merchant pays for a spool of this grade. */
export const sellPrice = (grade: Grade) => SPOOL_SELL_PRICE[grade];

/** What a spool of this grade costs at the Merchant. */
export const buyPrice = (grade: Grade) => SPOOL_SELL_PRICE[grade] * BUY_FACTOR;
