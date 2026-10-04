// Diagnostic: average battle length and win rate over many seeds (not a test).
import { decide } from '../src/game/battle/ai';
import { Battle } from '../src/game/battle/battle';
import { ENEMY_TEAM, PLAYER_TEAM } from '../src/game/data/heroes';

let wins = 0, turns = 0;
const N = 500;
for (let seed = 1; seed <= N; seed++) {
  const b = new Battle(PLAYER_TEAM, ENEMY_TEAM, seed);
  let t = 0;
  while (!b.winner() && t < 400) {
    const a = b.advance();
    t++;
    const st = b.startTurn(a);
    if (a.alive && !st.skip && !b.winner()) {
      const d = decide(b, a);
      b.useSkill(a, d.skill, d.target);
    }
    b.endTurn(a);
  }
  if (b.winner() === 'player') wins++;
  turns += t;
}
console.log(`player win rate ${((wins / N) * 100).toFixed(1)}%, avg turns ${(turns / N).toFixed(1)}`);
