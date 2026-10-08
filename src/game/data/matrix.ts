// Weaver Matrix catalog: the stats a Thread Spool can carry and the six stat
// nodes every matrix has (docs/DDD.md 4.7).
//
// PLACEHOLDER LAYOUT: no node rules are approved yet (they come with the
// Weaver Matrix proposal), so every slot takes every stat. Players never meet
// it: no spools exist until spools and patterns are approved.
import { MatrixLayout, StatId, StatNode } from './types';

/** Every stat once; the record type makes the compiler insist on all of them. */
const STATS: Record<StatId, true> = { hp: true, atk: true, def: true, spd: true, crit: true };
export const STAT_IDS: readonly StatId[] = Object.keys(STATS) as StatId[];

const ANY: StatNode = { kind: 'variable', stats: STAT_IDS };

export const MATRIX_LAYOUT: MatrixLayout = [ANY, ANY, ANY, ANY, ANY, ANY];
