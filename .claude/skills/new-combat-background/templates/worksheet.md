# Combat background worksheet

Fill this in before painting, and show it to the user when they are around. A background is a stage set: the fight happens on the floor, everything else frames it.

## Identity

| Field | Value | Rule |
| --- | --- | --- |
| id | | lowercase, one word; folder `public/assets/zones/<id>/` |
| Name, subtitle | | shown in the battle top bar and on the map label |
| Location / stages | | which `LocationDef` uses it (`src/game/data/campaign.ts`) |
| Time of day, mood | | decides the sky ramp and the tint |
| Key light | | always upper-left: sun, moon, a great fire, a rift... name it and place it there |

## Composition (640 x 360)

| Band | Rows / px | Your plan |
| --- | --- | --- |
| Sky | rows 0-1 (0-64) and above the wall | |
| Back wall | rows 2-5 (64-192): left section / center / right section | |
| Openings | gates, arches, gaps: what the backdrop shows through each | |
| Horizon | backdrop y where land meets sky (`horizon`) | |
| Floor | rows 6-11 (192-360): material, edges (drifts, water, rubble), centerpiece | |
| Foreground | at the screen edges only (x < 60, x > 580) | |

Formation spots stay fixed: player (216,250) (152,216) (136,284), enemy (424,250) (488,216) (504,284). Keep tall props and bright details away from them.

## Palette

| Ramp | Colors (dark -> light) | Notes |
| --- | --- | --- |
| Sky | | 8-12 steps, darkest at the top |
| Main stone / ground | | 6-7 steps, step 0 = joints, last = lit edges |
| Accent (paint, metal, plants) | | |
| Fire | | reuse the warm flame ramp unless the fire is magical |

Budget: backdrop at most 220 colors, tileset at most 160 (`npm run audit`).

## Behaviour (`ZoneDef` in `src/game/data/zones.ts`)

| Field | Value | Options |
| --- | --- | --- |
| ambient | | `snow` (falling flakes) or `sand` (blowing grains and gusts); a new kind needs code in `src/game/view/zone.ts` |
| glow | | RGB of fire light pools |
| shadow | | `{ dx, stretch }`: 1/1 for a high light, 6/1.35 for a low sun |
| tint | | optional `{ color, alpha, op }` mood overlay |
| birds, haze | | birds need `bird` prop frames; haze shimmers rows around `horizon` |

## Props

| Kind | Layer | Mode | Notes |
| --- | --- | --- | --- |
| | back / floor / fg | static / loop / pulse (+ fire) | |

## Checks after building

- [ ] `npm run art -- zones <id>` and the preview `docs/images/zone_<id>.png` reviewed at 2x
- [ ] `npm run audit` ok (size, grid, color budget)
- [ ] `npm test` ok (assets, kinds, frames, spawns)
- [ ] battle captured in the zone with champions of light and dark palettes: everyone reads against the floor
- [ ] menu diorama (main menu, team select) captured if a location uses it
