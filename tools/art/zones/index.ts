// Combat background registry. Adding one = a ZoneArt module here plus a
// ZoneDef in src/game/data/zones.ts (see .claude/skills/new-combat-background).
import { buildZone, ZoneArt } from './shared.ts';
import { zone1 } from './zone1.ts';
import { zone2 } from './zone2.ts';
import { zone3 } from './zone3.ts';
import { zone4 } from './zone4.ts';
import { zone5 } from './zone5.ts';

export const ZONE_ART: Record<string, ZoneArt> = { zone1, zone2, zone3, zone4, zone5 };

export function buildZones(out: string, only?: string) {
  for (const z of Object.values(ZONE_ART)) if (!only || only === z.id) buildZone(z, out);
}
