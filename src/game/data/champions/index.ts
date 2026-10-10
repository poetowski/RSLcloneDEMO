// Champion registry. Adding a champion = one data module here + one art module
// in tools/art/champions/ (see .claude/skills/new-champion). The roster is
// Jakub's (docs/DESIGN_DECISIONS.md section 4): the starter and the second
// champion; everything else waits for his design.
import { ChampionDef } from '../types';
import { azureWarrior } from './azure_warrior';
import { sanguineSupport } from './sanguine_support';

/** Collection order: the order champions join. */
export const CHAMPIONS: ChampionDef[] = [azureWarrior, sanguineSupport];

const byId = new Map(CHAMPIONS.map((c) => [c.id, c]));

export function champion(id: string): ChampionDef {
  const c = byId.get(id);
  if (!c) throw new Error(`unknown champion "${id}"`);
  return c;
}

export { azureWarrior, sanguineSupport };
