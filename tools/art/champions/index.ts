// Champion art registry. Order matches src/game/data/champions/index.ts.
import { ChampionArt, CharDef } from '../char.ts';
import { azureWarrior } from './azure_warrior.ts';
import { sanguineSupport } from './sanguine_support.ts';

export const CHAMPION_ART: Record<string, ChampionArt> = { azure_warrior: azureWarrior, sanguine_support: sanguineSupport };

/** Rig + animations by champion id (what the frame tools work with). */
export const HEROES: Record<string, CharDef> = Object.fromEntries(Object.entries(CHAMPION_ART).map(([id, a]) => [id, a.char]));
