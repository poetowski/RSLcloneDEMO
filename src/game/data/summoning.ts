// Summoning (Jakub, 2026-10-25: "all champions are being spawned like in rsl
// from a special currency, something like a spawning shard. but propose better
// naming. campaign nodes drop these fragments. each 100 fragments can be merged
// to 1 spawning shard. then we need to have an option to spawn random champion.
// maybe player could a bit change randomness by choosing which faction and role
// he would like to get, but this is not guaranteed but just a better chance for
// that wish. ... chances are 70% for common, 25% for elite and 5% for heroic
// champion."). His: fragments from the campaign, 100 of them to a shard, a
// shard for each summon, the odds, the wish as a better chance and no more.
// Stand-ins (DESIGN_DECISIONS.md 36): the names, how much a victory finds,
// how strong a wish is, and that a summon never brings a champion twice.
// The rules: src/game/summoning.ts.
import { FactionId, Rarity, Role } from './types';

/** What the fragments, the shard and the place are called: my proposal for his "fragments" and "spawning shard". */
export const SUMMONING = {
  /** the fragments: a mass noun ("120 Stardust") */
  fragment: 'Stardust',
  shard: 'Soulstar',
  shards: 'Soulstars',
  /** the place in the Sanctum's sky, as a sentence names it */
  place: 'the Wishing Star',
};

/** Fragments that merge into one shard (his number). */
export const FRAGMENTS_PER_SHARD = 100;

/** Fragments a campaign victory finds: by area, in the campaign's order; three stars find `flawless` more (stand-ins). */
export const FRAGMENT_DROPS = { byArea: [20, 25, 30, 35, 40], flawless: 10 };

/** The odds of each rarity on a summon (his). */
export const SUMMON_ODDS: Record<Rarity, number> = { common: 0.7, elite: 0.25, heroic: 0.05, mythic: 0 };

/** How much likelier a champion is for each part of the wish it matches (a stand-in): twice for the faction or the role, four times for both. */
export const WISH_WEIGHT = 2;

/** What the Archivist wishes for at the Wishing Star: a faction, a role, both or neither. */
export interface Wish {
  faction?: FactionId;
  role?: Role;
}
