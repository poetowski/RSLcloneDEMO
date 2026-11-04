// How Gold reads on screen (the Merchant, its label in Loomfall): its colour and
// words. The name itself is in data/economy.ts.
import { CURRENCY } from '../data/economy';

/** Gold's warm yellow. */
export const GOLD_TINT = '#ffd56a';

/** "120 Gold". */
export function goldText(n: number): string {
  return `${n} ${CURRENCY.name}`;
}
