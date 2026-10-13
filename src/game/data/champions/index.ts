// Champion registry. Adding a champion = one data module here + one art module
// in tools/art/champions/ (see .claude/skills/new-champion). The roster is
// Jakub's (docs/DESIGN_DECISIONS.md sections 4, 8 and 12-20): the starter,
// Captain Gareth; the Rime Scholar, who joins after the first battle; the
// Skirmisher, the Lineholder and the Quartermaster, Commons of the Azure Crown;
// the Dominion Medic, the Bloodhound and the Enforcer, Commons of the Sanguine
// Dominion; the Follower, the Walking Bush and the Wild Speaker, Commons of the
// Court of Root; everything else waits for his design.
import { ChampionDef } from '../types';
import { bloodhound } from './bloodhound';
import { captainGareth } from './captain_gareth';
import { dominionMedic } from './dominion_medic';
import { enforcer } from './enforcer';
import { follower } from './follower';
import { lineholder } from './lineholder';
import { quartermaster } from './quartermaster';
import { rimeScholar } from './rime_scholar';
import { skirmisher } from './skirmisher';
import { walkingBush } from './walking_bush';
import { wildSpeaker } from './wild_speaker';

/** Collection order: the order champions join. */
export const CHAMPIONS: ChampionDef[] = [captainGareth, rimeScholar, follower, skirmisher, dominionMedic, lineholder, bloodhound, quartermaster, enforcer, walkingBush, wildSpeaker];

const byId = new Map(CHAMPIONS.map((c) => [c.id, c]));

export function champion(id: string): ChampionDef {
  const c = byId.get(id);
  if (!c) throw new Error(`unknown champion "${id}"`);
  return c;
}

export { bloodhound, captainGareth, dominionMedic, enforcer, follower, lineholder, quartermaster, rimeScholar, skirmisher, walkingBush, wildSpeaker };
