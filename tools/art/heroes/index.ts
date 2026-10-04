import { CharDef } from '../char.ts';
import { archer } from './archer.ts';
import { dreadknight } from './dreadknight.ts';
import { frostmage } from './frostmage.ts';
import { knight } from './knight.ts';
import { monk } from './monk.ts';
import { warrior } from './warrior.ts';

/** Player team first (left side), enemies after (right side). */
export const HEROES: Record<string, CharDef> = { knight, warrior, archer, frostmage, dreadknight, monk };
