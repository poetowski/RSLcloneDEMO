// Champion art registry. Order matches src/game/data/champions/index.ts.
import { ChampionArt, CharDef } from '../char.ts';
import { archer } from './archer.ts';
import { associate } from './associate.ts';
import { automatedSoul } from './automated_soul.ts';
import { bellringer } from './bellringer.ts';
import { bigEars } from './big_ears.ts';
import { blackRhino } from './black_rhino.ts';
import { bloodhound } from './bloodhound.ts';
import { captainGareth } from './captain_gareth.ts';
import { dominionMedic } from './dominion_medic.ts';
import { enforcer } from './enforcer.ts';
import { follower } from './follower.ts';
import { groveKeeper } from './grove_keeper.ts';
import { harvestSpecialist } from './harvest_specialist.ts';
import { irvingWellbington } from './irving_wellbington.ts';
import { emissaryHandlings } from './emissary_handlings.ts';
import { jungleHerder } from './jungle_herder.ts';
import { ashWidow } from './ash_widow.ts';
import { bristleback } from './bristleback.ts';
import { hiveTender } from './hive_tender.ts';
import { toadcap } from './toadcap.ts';
import { gravedigger } from './gravedigger.ts';
import { juniorWard } from './junior_ward.ts';
import { lastRiter } from './last_riter.ts';
import { lineholder } from './lineholder.ts';
import { necromancer } from './necromancer.ts';
import { chiefEngineerCj } from './chief_engineer_cj.ts';
import { deadKnightAmstron } from './dead_knight_amstron.ts';
import { forestGargoyle } from './forest_gargoyle.ts';
import { paladin } from './paladin.ts';
import { quartermaster } from './quartermaster.ts';
import { redCloak } from './red_cloak.ts';
import { rimeScholar } from './rime_scholar.ts';
import { rotHulk } from './rot_hulk.ts';
import { sentry } from './sentry.ts';
import { skeleton } from './skeleton.ts';
import { skirmisher } from './skirmisher.ts';
import { crossbowman } from './crossbowman.ts';
import { overlordOfentol } from './overlord_ofentol.ts';
import { verdantLuminary } from './verdant_luminary.ts';
import { warTigress } from './war_tigress.ts';
import { silkfang } from './silkfang.ts';
import { bogTroll } from './bog_troll.ts';
import { mothSeer } from './moth_seer.ts';
import { rootfather } from './rootfather.ts';
import { astronomerRoyal } from './astronomer_royal.ts';
import { azulTheBlade } from './azul_the_blade.ts';
import { cinderSylph } from './cinder_sylph.ts';
import { hexWarden } from './hex_warden.ts';
import { transfusionist } from './transfusionist.ts';
import { sirSiroslav } from './sir_siroslav.ts';
import { coffinsLegs } from './coffins_legs.ts';
import { wraith } from './wraith.ts';
import { haruspex } from './haruspex.ts';
import { strongman } from './strongman.ts';
import { townGuard } from './town_guard.ts';
import { walkingBush } from './walking_bush.ts';
import { wildSpeaker } from './wild_speaker.ts';

export const CHAMPION_ART: Record<string, ChampionArt> = {
  azul_the_blade: azulTheBlade,   sir_siroslav: sirSiroslav, coffins_legs: coffinsLegs, wraith, haruspex, crossbowman, overlord_ofentol: overlordOfentol, verdant_luminary: verdantLuminary, war_tigress: warTigress, silkfang, bog_troll: bogTroll, moth_seer: mothSeer, rootfather, astronomer_royal: astronomerRoyal, cinder_sylph: cinderSylph, hex_warden: hexWarden, transfusionist, captain_gareth: captainGareth, rime_scholar: rimeScholar, follower, skirmisher, strongman, town_guard: townGuard, last_riter: lastRiter, archer, harvest_specialist: harvestSpecialist, sentry, junior_ward: juniorWard, gravedigger, ash_widow: ashWidow, toadcap, bristleback, hive_tender: hiveTender, dominion_medic: dominionMedic, lineholder, bloodhound, quartermaster, enforcer,
  walking_bush: walkingBush, wild_speaker: wildSpeaker, jungle_herder: jungleHerder, associate, emissary_handlings: emissaryHandlings, black_rhino: blackRhino, red_cloak: redCloak, grove_keeper: groveKeeper, big_ears: bigEars, skeleton, rot_hulk: rotHulk, bellringer, necromancer, automated_soul: automatedSoul, irving_wellbington: irvingWellbington, paladin, chief_engineer_cj: chiefEngineerCj, forest_gargoyle: forestGargoyle, dead_knight_amstron: deadKnightAmstron,
};

/** Rig + animations by champion id (what the frame tools work with). */
export const HEROES: Record<string, CharDef> = Object.fromEntries(Object.entries(CHAMPION_ART).map(([id, a]) => [id, a.char]));
