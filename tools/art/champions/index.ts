// Champion art registry. Order matches src/game/data/champions/index.ts.
import { ChampionArt, CharDef } from '../char.ts';
import { bloodhound } from './bloodhound.ts';
import { captainGareth } from './captain_gareth.ts';
import { dominionMedic } from './dominion_medic.ts';
import { enforcer } from './enforcer.ts';
import { follower } from './follower.ts';
import { lineholder } from './lineholder.ts';
import { quartermaster } from './quartermaster.ts';
import { rimeScholar } from './rime_scholar.ts';
import { skirmisher } from './skirmisher.ts';

export const CHAMPION_ART: Record<string, ChampionArt> = { captain_gareth: captainGareth, rime_scholar: rimeScholar, follower, skirmisher, dominion_medic: dominionMedic, lineholder, bloodhound, quartermaster, enforcer };

/** Rig + animations by champion id (what the frame tools work with). */
export const HEROES: Record<string, CharDef> = Object.fromEntries(Object.entries(CHAMPION_ART).map(([id, a]) => [id, a.char]));
