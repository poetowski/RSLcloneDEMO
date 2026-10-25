// How Stardust and Soulstars read on screen (the Wishing Star, the results
// panel, the campaign's stage list, the Journey): their colours and words.
// The names themselves are in data/summoning.ts.
import { SUMMONING } from '../data/summoning';

/** Stardust's pale gold, a Soulstar's lilac light. */
export const STARDUST_TINT = '#ffe9a8';
export const SOULSTAR_TINT = '#d8ccff';

/** "120 Stardust". */
export function fragmentsText(n: number): string {
  return `${n} ${SUMMONING.fragment}`;
}

/** "1 Soulstar", "3 Soulstars". */
export function shardsText(n: number): string {
  return `${n} ${n === 1 ? SUMMONING.shard : SUMMONING.shards}`;
}
