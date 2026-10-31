// Champion registry. Adding a champion = one data module here + one art module
// in tools/art/champions/ (see .claude/skills/new-champion). The roster is
// Jakub's (docs/DESIGN_DECISIONS.md sections 4, 8, 12-34 and 37-39): the starter,
// Captain Gareth; the Rime Scholar, who joins after the first battle; the
// Skirmisher, the Lineholder and the Quartermaster, Commons of the Azure Crown;
// the Dominion Medic, the Bloodhound and the Enforcer, Commons of the Sanguine
// Dominion; the Follower, the Walking Bush and the Wild Speaker, Commons of the
// Court of Root; and seven Elites, the Jungle Herder, the Grove Keeper and Big
// Ears of the Court of Root, Emissary Handlings and the Associate of the Azure
// Crown, and Red Cloak and the Black Rhino of the Sanguine Dominion; and the
// Skeleton, the Rot Hulk and the Bellringer, Commons of the Ashveil Reign, and
// the Necromancer, the Automated Soul and Irving Wellbington, its Elites; and
// the Paladin, the Azure Crown's Heroic and the roster's first, Chief
// Engineer CJ, the Sanguine Dominion's, the Forest Gargoyle, the Court of
// Root's, and Dead Knight Amstron, the Ashveil Reign's; everything else waits for his design.
import { ChampionDef } from '../types';
import { archer } from './archer';
import { associate } from './associate';
import { automatedSoul } from './automated_soul';
import { bellringer } from './bellringer';
import { bigEars } from './big_ears';
import { blackRhino } from './black_rhino';
import { bloodhound } from './bloodhound';
import { captainGareth } from './captain_gareth';
import { chiefEngineerCj } from './chief_engineer_cj';
import { deadKnightAmstron } from './dead_knight_amstron';
import { dominionMedic } from './dominion_medic';
import { emissaryHandlings } from './emissary_handlings';
import { enforcer } from './enforcer';
import { follower } from './follower';
import { forestGargoyle } from './forest_gargoyle';
import { groveKeeper } from './grove_keeper';
import { irvingWellbington } from './irving_wellbington';
import { jungleHerder } from './jungle_herder';
import { lastRiter } from './last_riter';
import { lineholder } from './lineholder';
import { necromancer } from './necromancer';
import { paladin } from './paladin';
import { quartermaster } from './quartermaster';
import { redCloak } from './red_cloak';
import { rimeScholar } from './rime_scholar';
import { rotHulk } from './rot_hulk';
import { skeleton } from './skeleton';
import { skirmisher } from './skirmisher';
import { strongman } from './strongman';
import { townGuard } from './town_guard';
import { walkingBush } from './walking_bush';
import { wildSpeaker } from './wild_speaker';

/** Collection order: the order champions join. */
export const CHAMPIONS: ChampionDef[] = [
  captainGareth, rimeScholar, follower, skirmisher, dominionMedic, lineholder, bloodhound, quartermaster, enforcer,
  walkingBush, wildSpeaker, jungleHerder, associate, emissaryHandlings, blackRhino, redCloak, groveKeeper, bigEars, skeleton, rotHulk, bellringer, necromancer, automatedSoul, irvingWellbington, paladin, chiefEngineerCj, forestGargoyle, deadKnightAmstron, strongman, townGuard, lastRiter, archer,
];

const byId = new Map(CHAMPIONS.map((c) => [c.id, c]));

export function champion(id: string): ChampionDef {
  const c = byId.get(id);
  if (!c) throw new Error(`unknown champion "${id}"`);
  return c;
}

export { archer, associate, automatedSoul, bellringer, bigEars, blackRhino, bloodhound, captainGareth, chiefEngineerCj, deadKnightAmstron, dominionMedic, emissaryHandlings, enforcer, follower, forestGargoyle, groveKeeper, irvingWellbington, jungleHerder, lastRiter, lineholder, necromancer, paladin, quartermaster, redCloak, rimeScholar, rotHulk, skeleton, skirmisher, strongman, townGuard, walkingBush, wildSpeaker };
