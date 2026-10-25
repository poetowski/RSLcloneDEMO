// Drops: what a campaign victory finds. Every stage of an area drops spools
// of the area's two Weave Patterns (Jakub, 2026-10-24); how many, of which
// grade and with which main stat are stand-ins (`DROPS` in data/matrix.ts).
// Every victory also finds Stardust, the fragments that merge into Soulstars
// (Jakub, 2026-10-25: "campaign nodes drop these fragments"); how much is a
// stand-in (`FRAGMENT_DROPS` in data/summoning.ts). Rules:
// docs/MECHANICS_GUIDE.md 14 and 16.
import { LOCATIONS, locationOf } from '../data/campaign';
import { DROPS, MATRIX_LAYOUT } from '../data/matrix';
import { FRAGMENT_DROPS } from '../data/summoning';
import { MatrixLayout, PatternId, SpoolStat } from '../data/types';
import { Grade, rollSpool, ThreadSpool } from './matrix';

/** The two Weave Patterns a stage's spools are woven in: its area's. */
export function stagePatterns(stageId: string): readonly [PatternId, PatternId] {
  const loc = locationOf(stageId);
  if (!loc.patterns) throw new Error(`area "${loc.id}" holds no Weave Patterns`);
  return loc.patterns;
}

/** The chance of each grade [Ashen, Silver, Gilded] on a stage: stepping evenly from its area's first stage to its last. */
export function gradeOdds(stageId: string): [number, number, number] {
  const loc = locationOf(stageId);
  const i = loc.stages.findIndex((s) => s.id === stageId);
  const k = loc.stages.length > 1 ? i / (loc.stages.length - 1) : 1;
  const [a, s, g] = DROPS.firstStage.map((v, n) => v + (DROPS.lastStage[n] - v) * k);
  return [a, s, g];
}

/** How many spools a victory finds: one, and a second when nobody fell. */
export function dropCount(stars: number): number {
  return DROPS.perVictory + (stars >= 3 ? DROPS.flawlessBonus : 0);
}

/** A main stat drawn by slot: a slot at random, then one of the stats it takes, so every slot gets its share. */
export function rollMainStat(rng: () => number, layout: MatrixLayout = MATRIX_LAYOUT): SpoolStat {
  const node = layout[Math.floor(rng() * layout.length)];
  return node.kind === 'fixed' ? node.stat : node.stats[Math.floor(rng() * node.stats.length)];
}

/** The spools a victory on a stage finds: each of one of its area's two patterns, its grade by the stage's odds. */
export function rollDrops(stageId: string, stars: number, rng: () => number): ThreadSpool[] {
  const patterns = stagePatterns(stageId);
  const [ashen, silver] = gradeOdds(stageId);
  return Array.from({ length: dropCount(stars) }, () => {
    const pattern = patterns[Math.floor(rng() * patterns.length)];
    const r = rng();
    const grade: Grade = r < ashen ? 0 : r < ashen + silver ? 1 : 2;
    return rollSpool(pattern, grade, rollMainStat(rng), rng);
  });
}

/** The Stardust a victory on a stage finds: its area's share, and more when nobody fell. */
export function fragmentDrop(stageId: string, stars: number): number {
  const i = Math.min(LOCATIONS.indexOf(locationOf(stageId)), FRAGMENT_DROPS.byArea.length - 1);
  return FRAGMENT_DROPS.byArea[i] + (stars >= 3 ? FRAGMENT_DROPS.flawless : 0);
}
