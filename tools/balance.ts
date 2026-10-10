// Balance report: the difficulty guardrail for new champions and stages.
//   npm run balance            full report
//   npm run balance -- quick   fewer battles (faster, noisier)
// Sections:
//   1. stat budget per rarity           (norms.ts RARITY_BUDGET, +-5%)
//   2. kit norms                        (norms.ts SKILL_NORMS / STATUS_NORMS)
//   3. impact: win rate of random teams that include the champion, against
//      random enemy teams from the roster. Healthy band: 40-60%.
//   4. campaign curve: win rate of every 3-champion team the player can own
//      at that point, against the stage. Bands per stage kind (below).
import { combatants, Combatant } from '../src/game/battle/battle';
import { simulate } from '../src/game/battle/sim';
import { BOSS_HP, LOCATIONS, STARTERS } from '../src/game/data/campaign';
import { CHAMPIONS, champion } from '../src/game/data/champions';
import { auditChampion, budgetDelta, RARITY_BUDGET, statScore } from '../src/game/data/norms';
import { ChampionDef } from '../src/game/data/types';

const quick = process.argv.includes('quick');
// 960 battles keep the impact noise near +-1.6 points; 240 left about +-3 and flagged noise as failures
const SAMPLES = quick ? 60 : 960;
const STAGE_SEEDS = quick ? 6 : 20;
export const IMPACT_BAND: [number, number] = [0.4, 0.6];
/** Auto-battle win rate bands for the campaign curve (humans win more). */
export const CURVE_BANDS = { first: [0.85, 1], normal: [0.55, 0.92], boss: [0.4, 0.8] } as const;

let failures = 0;
const pct = (x: number) => `${(x * 100).toFixed(0).padStart(3)}%`;
const flag = (ok: boolean) => (ok ? '  ok ' : (failures++, ' FAIL'));

function rngFor(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickTeam(r: () => number, pool: ChampionDef[], size: number, must?: ChampionDef): ChampionDef[] {
  const rest = pool.filter((c) => c !== must);
  const team: ChampionDef[] = must ? [must] : [];
  while (team.length < size) {
    const c = rest.splice(Math.floor(r() * rest.length), 1)[0];
    team.push(c);
  }
  // random formation slot for the subject
  for (let i = team.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [team[i], team[j]] = [team[j], team[i]];
  }
  return team;
}

console.log('\n== 1. Stat budget (score vs rarity target, tolerance 5%) ==');
for (const c of CHAMPIONS) {
  const d = budgetDelta(c);
  console.log(`${flag(Math.abs(d) <= 0.05)} ${c.id.padEnd(12)} ${c.rarity.padEnd(10)} score ${statScore(c.stats).toFixed(0)} / ${RARITY_BUDGET[c.rarity]}  (${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%)`);
}

console.log('\n== 2. Kit norms ==');
for (const c of CHAMPIONS) {
  const issues = auditChampion(c).filter((x) => !x.startsWith('stat score'));
  console.log(`${flag(issues.length === 0)} ${c.id.padEnd(12)} ${issues.length ? issues.join('; ') : 'within norms'}`);
}

console.log(`\n== 3. Impact (random 3v3 teams from the roster, ${SAMPLES} battles each, band ${pct(IMPACT_BAND[0])}-${pct(IMPACT_BAND[1])}) ==`);
const impacts: [string, number][] = [];
for (const c of CHAMPIONS) {
  const r = rngFor(1000 + CHAMPIONS.indexOf(c));
  let wins = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const mine = pickTeam(r, CHAMPIONS, 3, c);
    const theirs = pickTeam(r, CHAMPIONS.filter((x) => x !== c), 3);
    // alternate sides so no side advantage leaks into the number
    if (i % 2 === 0) wins += simulate(combatants(mine), combatants(theirs), { seed: i + 1 }).winner === 'player' ? 1 : 0;
    else wins += simulate(combatants(theirs), combatants(mine), { seed: i + 1 }).winner === 'enemy' ? 1 : 0;
  }
  impacts.push([c.id, wins / SAMPLES]);
}
for (const [id, w] of impacts.sort((a, b) => b[1] - a[1])) {
  console.log(`${flag(w >= IMPACT_BAND[0] && w <= IMPACT_BAND[1])} ${id.padEnd(12)} ${pct(w)}  ${'#'.repeat(Math.round(w * 40))}`);
}

console.log(`\n== 4. Campaign curve (every team the player can own, ${STAGE_SEEDS} seeds per team) ==`);
const owned = [...STARTERS];
for (const loc of LOCATIONS) {
  loc.stages.forEach((s, si) => {
    const pool = owned.map((id) => champion(id));
    const teams: ChampionDef[][] = [];
    for (let a = 0; a < pool.length; a++) for (let b = a + 1; b < pool.length; b++) for (let c = b + 1; c < pool.length; c++) teams.push([pool[a], pool[b], pool[c]]);
    const enemy: Combatant[] = s.enemies.map((e) => ({ def: champion(e.champion), boss: e.boss }));
    let wins = 0, total = 0, best = 0;
    for (const t of teams) {
      let tw = 0;
      for (let seed = 1; seed <= STAGE_SEEDS; seed++) {
        const r = simulate(combatants(t), enemy, { seed, enemyPower: s.power, bossHp: BOSS_HP });
        if (r.winner === 'player') tw++;
      }
      wins += tw;
      total += STAGE_SEEDS;
      best = Math.max(best, tw / STAGE_SEEDS);
    }
    const w = wins / total;
    const kind = loc === LOCATIONS[0] && si === 0 ? 'first' : s.enemies.some((e) => e.boss) ? 'boss' : 'normal';
    const [lo, hi] = CURVE_BANDS[kind];
    console.log(`${flag(w >= lo && w <= hi)} ${s.id} ${s.name.padEnd(28)} power ${s.power.toFixed(2)}  avg ${pct(w)}  best team ${pct(best)}  (${kind} band ${pct(lo)}-${pct(hi)}, ${teams.length} teams)`);
    if (s.recruit && !owned.includes(s.recruit)) owned.push(s.recruit);
  });
}

console.log(failures ? `\n${failures} check(s) outside the guardrails.` : '\nAll balance checks within the guardrails.');
process.exitCode = failures ? 1 : 0;
