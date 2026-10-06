// Headless AI-vs-AI battles for tests and the balance tool.
import { decide } from './ai';
import { Battle, BattleOptions, Combatant, SkillResult } from './battle';
import { TeamId } from '../data/types';

export interface SimResult {
  winner: TeamId | null;
  /** actions taken (one per unit turn) */
  turns: number;
  /** living player units at the end */
  survivors: number;
}

export function simulate(player: Combatant[], enemy: Combatant[], opts: BattleOptions = {}, maxTurns = 400): SimResult {
  const b = new Battle(player, enemy, opts);
  let turns = 0;
  while (!b.winner() && turns < maxTurns) {
    const a = b.advance();
    turns++;
    const st = b.startTurn(a);
    if (a.alive && !st.skip && !b.winner()) {
      const d = decide(b, a);
      b.useSkill(a, d.skill, d.target);
    }
    b.endTurn(a);
  }
  return { winner: b.winner(), turns, survivors: b.alive('player').length };
}

/** Flattens a result and its counterattacks in presentation order. */
export function flatten(r: SkillResult): SkillResult[] {
  return [r, ...r.counters.flatMap(flatten)];
}

/** Stars for a won battle: 3 with nobody lost, 2 with one loss, 1 otherwise. */
export function starsFor(teamSize: number, survivors: number): 1 | 2 | 3 {
  const lost = teamSize - survivors;
  return lost <= 0 ? 3 : lost === 1 ? 2 : 1;
}
