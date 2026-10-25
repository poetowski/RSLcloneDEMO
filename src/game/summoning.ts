// Summoning: how champions come to the Archivist (Jakub, 2026-10-25; the
// numbers and names in data/summoning.ts). Every campaign victory finds
// Stardust; 100 Stardust merge into a Soulstar; a Soulstar spent at the
// Wishing Star summons a champion: its rarity by his odds (70% Common, 25%
// Elite, 5% Heroic), then one champion of that rarity. A wish (a faction, a
// role) makes every champion it names likelier, never certain. A summon
// brings a champion not in the Reliquary yet (a stand-in: a champion is one
// soul, recollected once), so a rarity whose champions are all found gives
// its share to the others; the starters and the champion a stage brings (1-1's
// Rime Scholar) are never summoned. Rules: docs/MECHANICS_GUIDE.md 16.
import { MasterArchivist, saveArchivist } from './archivist';
import { allStages, STARTERS } from './data/campaign';
import { CHAMPIONS } from './data/champions';
import { FRAGMENTS_PER_SHARD, SUMMON_ODDS, Wish, WISH_WEIGHT } from './data/summoning';
import { ChampionDef, Rarity } from './data/types';

const RARITY_ORDER: readonly Rarity[] = ['common', 'elite', 'heroic', 'mythic'];

/** How a champion comes to the Archivist: from the start, on a stage's first clear (1-1's Rime Scholar), or summoned. */
export function joinsBy(id: string): { kind: 'start' } | { kind: 'stage'; stage: string } | { kind: 'summon' } {
  if (STARTERS.includes(id)) return { kind: 'start' };
  const st = allStages().find((s) => s.recruit === id);
  return st ? { kind: 'stage', stage: st.id } : { kind: 'summon' };
}

/** Champions a summon can bring: every one not in the Reliquary yet, but the starters and those a stage brings. */
export function summonPool(a: MasterArchivist): ChampionDef[] {
  const earned = new Set<string>([...STARTERS, ...allStages().flatMap((s) => (s.recruit ? [s.recruit] : []))]);
  return CHAMPIONS.filter((c) => !earned.has(c.id) && !a.reliquary.has(c.id));
}

/** Whether a champion is everything the wish names (a wish of nothing names nobody). */
export function wished(c: ChampionDef, w: Wish): boolean {
  return (!!w.faction || !!w.role) && (!w.faction || c.faction === w.faction) && (!w.role || c.role === w.role);
}

/** A champion's weight in its rarity's draw: multiplied for each part of the wish it matches. */
export function wishWeight(c: ChampionDef, w: Wish): number {
  return (w.faction && c.faction === w.faction ? WISH_WEIGHT : 1) * (w.role && c.role === w.role ? WISH_WEIGHT : 1);
}

/** The odds of each rarity on the next summon from `pool`: his odds, a rarity with no champion left giving its share to the others in proportion. */
export function rarityOdds(pool: readonly ChampionDef[]): Record<Rarity, number> {
  const left = RARITY_ORDER.filter((r) => SUMMON_ODDS[r] > 0 && pool.some((c) => c.rarity === r));
  const total = left.reduce((s, r) => s + SUMMON_ODDS[r], 0);
  const odds = { common: 0, elite: 0, heroic: 0, mythic: 0 };
  for (const r of left) odds[r] = SUMMON_ODDS[r] / total;
  return odds;
}

/** Every champion of the pool with its chance on the next summon. */
export function summonChances(pool: readonly ChampionDef[], w: Wish): { c: ChampionDef; p: number }[] {
  const odds = rarityOdds(pool);
  return RARITY_ORDER.flatMap((r) => {
    const of = pool.filter((c) => c.rarity === r);
    const total = of.reduce((s, c) => s + wishWeight(c, w), 0);
    return of.map((c) => ({ c, p: odds[r] ? (odds[r] * wishWeight(c, w)) / total : 0 }));
  });
}

/** The chance the next summon brings a champion the wish names (0 for a wish of nothing); `weighted` false: the chance of one without wishing. */
export function wishChance(pool: readonly ChampionDef[], w: Wish, weighted = true): number {
  return summonChances(pool, weighted ? w : {}).reduce((s, x) => s + (wished(x.c, w) ? x.p : 0), 0);
}

/** One summon's draw from the pool: a rarity by its odds, then a champion of it by the wish's weights. Null when the pool is empty. */
export function drawSummon(pool: readonly ChampionDef[], w: Wish, rng: () => number): ChampionDef | null {
  const odds = rarityOdds(pool);
  let r = rng();
  const rarity = RARITY_ORDER.find((k) => odds[k] > 0 && (r -= odds[k]) < 0) ?? RARITY_ORDER.filter((k) => odds[k] > 0).pop();
  if (!rarity) return null;
  const of = pool.filter((c) => c.rarity === rarity);
  let x = rng() * of.reduce((s, c) => s + wishWeight(c, w), 0);
  return of.find((c) => (x -= wishWeight(c, w)) < 0) ?? of[of.length - 1];
}

/** Whether there is enough Stardust to merge a Soulstar. */
export function canMerge(a: MasterArchivist): boolean {
  return a.fragments >= FRAGMENTS_PER_SHARD;
}

/** Merges 100 Stardust into a Soulstar; false when there is too little. */
export function mergeShard(a: MasterArchivist): boolean {
  if (!canMerge(a)) return false;
  a.fragments -= FRAGMENTS_PER_SHARD;
  a.shards += 1;
  saveArchivist(a);
  return true;
}

/** What a summon brought: the champion, and whether the wish came true. */
export interface Summoned {
  champion: string;
  wished: boolean;
}

/** Spends a Soulstar on a summon: the champion joins the Reliquary with the NEW badge. Null without a Soulstar or a champion left to find. */
export function summon(a: MasterArchivist, rng: () => number = Math.random): Summoned | null {
  if (a.shards < 1) return null;
  const c = drawSummon(summonPool(a), a.wish, rng);
  if (!c) return null;
  a.shards -= 1;
  a.summons += 1;
  a.reliquary.recruit(c.id);
  saveArchivist(a);
  return { champion: c.id, wished: wished(c, a.wish) };
}

/** How many summons wait: the Soulstars and the Stardust for more, as many as there are champions left to find. */
export function summonsReady(a: MasterArchivist): number {
  return Math.min(summonPool(a).length, a.shards + Math.floor(a.fragments / FRAGMENTS_PER_SHARD));
}

/** The tutorial's lesson on summoning is due: the first summon waits, nobody was summoned yet, the tutorial was not skipped and the lesson not seen. */
export function summonLessonDue(a: MasterArchivist): boolean {
  return a.tutorial !== 'skipped' && !a.lessons.includes('summon') && a.summons === 0 && summonsReady(a) > 0;
}
