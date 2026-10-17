// Champion art registry. Order matches src/game/data/champions/index.ts.
import { ChampionArt, CharDef } from '../char.ts';
import { associate } from './associate.ts';
import { bigEars } from './big_ears.ts';
import { blackRhino } from './black_rhino.ts';
import { bloodhound } from './bloodhound.ts';
import { captainGareth } from './captain_gareth.ts';
import { dominionMedic } from './dominion_medic.ts';
import { enforcer } from './enforcer.ts';
import { follower } from './follower.ts';
import { groveKeeper } from './grove_keeper.ts';
import { emissaryHandlings } from './emissary_handlings.ts';
import { jungleHerder } from './jungle_herder.ts';
import { lineholder } from './lineholder.ts';
import { quartermaster } from './quartermaster.ts';
import { redCloak } from './red_cloak.ts';
import { rimeScholar } from './rime_scholar.ts';
import { skirmisher } from './skirmisher.ts';
import { walkingBush } from './walking_bush.ts';
import { wildSpeaker } from './wild_speaker.ts';

export const CHAMPION_ART: Record<string, ChampionArt> = {
  captain_gareth: captainGareth, rime_scholar: rimeScholar, follower, skirmisher, dominion_medic: dominionMedic, lineholder, bloodhound, quartermaster, enforcer,
  walking_bush: walkingBush, wild_speaker: wildSpeaker, jungle_herder: jungleHerder, associate, emissary_handlings: emissaryHandlings, black_rhino: blackRhino, red_cloak: redCloak, grove_keeper: groveKeeper, big_ears: bigEars,
};

/** Rig + animations by champion id (what the frame tools work with). */
export const HEROES: Record<string, CharDef> = Object.fromEntries(Object.entries(CHAMPION_ART).map(([id, a]) => [id, a.char]));
