// Champion art registry. Order matches src/game/data/champions/index.ts.
import { ChampionArt, CharDef } from '../char.ts';
import { archer } from './archer.ts';
import { dreadknight } from './dreadknight.ts';
import { frostmage } from './frostmage.ts';
import { jackal } from './jackal.ts';
import { knight } from './knight.ts';
import { monk } from './monk.ts';
import { priestess } from './priestess.ts';
import { stalker } from './stalker.ts';
import { tomblord } from './tomblord.ts';
import { warrior } from './warrior.ts';

export const CHAMPION_ART: Record<string, ChampionArt> = { knight, warrior, archer, monk, frostmage, dreadknight, stalker, jackal, priestess, tomblord };

/** Rig + animations by champion id (what the frame tools work with). */
export const HEROES: Record<string, CharDef> = Object.fromEntries(Object.entries(CHAMPION_ART).map(([id, a]) => [id, a.char]));
