// Combat background registry. Adding one = a ZoneArt module here plus a
// ZoneDef in src/game/data/zones.ts (see .claude/skills/new-combat-background).
import { frostfang } from './frostfang.ts';
import { buildZone, ZoneArt } from './shared.ts';
import { sunscar } from './sunscar.ts';

export const ZONE_ART: Record<string, ZoneArt> = { frostfang, sunscar };

export function buildZones(out: string, only?: string) {
  for (const z of Object.values(ZONE_ART)) if (!only || only === z.id) buildZone(z, out);
}
