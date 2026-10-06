// Champion registry. Adding a champion = one data module here + one art module
// in tools/art/champions/ (see .claude/skills/new-champion).
import { ChampionDef } from '../types';
import { archer } from './archer';
import { dreadknight } from './dreadknight';
import { frostmage } from './frostmage';
import { jackal } from './jackal';
import { knight } from './knight';
import { monk } from './monk';
import { priestess } from './priestess';
import { stalker } from './stalker';
import { tomblord } from './tomblord';
import { warrior } from './warrior';

/** Collection order: by faction, then the order champions are met in the campaign. */
export const CHAMPIONS: ChampionDef[] = [knight, warrior, archer, monk, frostmage, dreadknight, stalker, jackal, priestess, tomblord];

const byId = new Map(CHAMPIONS.map((c) => [c.id, c]));

export function champion(id: string): ChampionDef {
  const c = byId.get(id);
  if (!c) throw new Error(`unknown champion "${id}"`);
  return c;
}

export { archer, dreadknight, frostmage, jackal, knight, monk, priestess, stalker, tomblord, warrior };
