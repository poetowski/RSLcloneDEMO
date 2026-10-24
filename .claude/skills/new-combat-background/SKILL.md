---
name: new-combat-background
description: Paint and add a new combat background (zone / battle arena / location backdrop) to The Loom: Reliquary of Legends — procedural tiles, backdrop, animated props and ambience that follow the game's light, palette and readability rules, wired into the campaign and verified in battle. Use whenever the user asks for a new battle background, arena, zone, location or environment, or wants to rework one.
---

# New combat background

A combat background ("zone") is one art module and one behaviour entry:

| Piece | File | Proven by |
| --- | --- | --- |
| Pixels: tiles, backdrop, props, layout | `tools/art/zones/<id>.ts` (a `ZoneArt`) + `zones/index.ts` | `npm run audit`, the composed preview |
| Behaviour: ambience, light pools, shadows, tint, birds, haze | `src/game/data/zones.ts` (a `ZoneDef`) | `tests/content.test.ts` |
| Where it is used | a `LocationDef.zone` in `src/game/data/campaign.ts` | content tests |

The contract (`ZoneArt`, `PropKind`, rows, spawns) is in `tools/art/zones/shared.ts`. Reference zone: `zone1.ts` (Zone 1, the *Fracture Reach*: dawn in autumn, a grass floor seamless across variants, a burning field and a broken cart, the faction standards as props, bulky floating islands, a rift in the sky shedding sparks and waving cosmic fabric; a far prop layer, spark emitters and the `leaves` ambience) and `zone2.ts` (Zone 2, the *Verdant Grove*: a jungle ruin at midday; a table mountain of rock columns with temples, a waterfall and the great stair; a wall carved with a serpent in relief tile by tile; statues drawn with the champion renderer; a flagstone court as one floor prop; drifting clouds, sunbeams, the `pollen` ambience and butterflies) and `zone3.ts` (Zone 3, the *Moonlit Basin*: night under the moon, a key light that is itself in the sky; crags drawn back to front; a backlit treeline as one silhouette mask rimmed where it faces the moon; a far basin and a near floor sharing one perspective (`world()`), so the moss runs on into the distance without streaks; cellular moss clumps; tide-pools that shimmer and ripple once a loop; glass reeds that sway and glint; breathing pulses; the `spores` ambience and rare `shootingStars`) and `zone4.ts` (Zone 4, *Earth Scars*: the steppe by day; two snowy mountains shaded as cones that meet along a crease (`coneAt`), their snow thinning in streaks; the haze as hazed copies of the ground's ramps, dithered level by level so no checkerboard shows; a ravine's far wall in strata, in its own shade since the sun stands beyond it, darker with depth and cut by rain gullies; grass tufts placed in world space and drawn back to front; yurts, flag poles with fluttering chains of flags, smoke, a cairn; yaks drawn from a pose (`yak()`) for grazing and walking frames; gusts through the grass as loops masked to it; the `seeds` ambience, eagles, and a zeppelin that drifts against the wind) and `zone5.ts` (Zone 5, the *Snowy Mesa*: before sunset on a mesa's snowy top; a sea of cloud far below as a height field rendered near to far in true perspective, keeping its depth per pixel so the clouds take the mesas' feet; mesas drawn far to near with fluted cliffs, strata, cornices and hazed copies of their ramps; a storm of billows bulging over one another; a statue drawn with the champion renderer, candles flickering on its plinth each on a whole number of cycles a loop; pines of heaped needle lumps; the `flurries` ambience, choughs, lightning as the zone's `flash`). The proof of concept's `frostfang.ts` (night, snow, stone arches), `sunscar.ts` (sunset, sand, reliefs, a gate framing the desert) and `nyota.ts` (cosmic dusk, painted panels, floating islands with waterfalls) are in git history at tag `poc-v1`. The world's places come from Jakub's notes (`docs/DESIGN_DECISIONS.md` section 5): floating islands, each broken in its own way. Read `docs/ART_GUIDE.md` sections 3, 4 and 10 first.

## 1. Design (worksheet first)

Copy `templates/worksheet.md` into your notes and fill it in. Show Jakub the name, composition and palette and wait for his yes before painting; without his answer, stop at the worksheet (CLAUDE.md, Content approval). Be ambitious with the set dressing — the reference zones each carry a story (offering reliefs, a toppled colossus, a frozen throne room) — but never at the cost of the floor's readability.

Rules that are not negotiable:

1. **The key light is in the upper-left** (sun, moon, fire). Every tile, prop and carving is lit from there: top/left edges bright, bottom/right edges dark; in sunk relief the upper-left lip is in shadow.
2. **The floor (rows 6-11) is mid value and low contrast.** Champions are outlined and high contrast; the floor must never compete. Put bright, saturated set pieces on the wall, in the backdrop or at the edges.
3. **Formation spots are fixed** (player 216,250 / 152,216 / 136,284; enemy 424,250 / 488,216 / 504,284). No tall `back` prop directly behind them, no `fg` prop near them.
4. **Openings earn their keep**: every transparent gap in the wall shows something composed in the backdrop (the gap in Zone 1's wall frames the path running out to the island's edge, the cloud sea and a drifting island). Check the backdrop against the wall: an element the architecture half hides (a beam rising from behind a pylon, the sliver of an island beside a tower) reads as a glitch, so move it into an opening or leave it out.
5. **No smooth gradients, no anti-aliasing**: ramps with 4x4 Bayer dithering (`rampDither`, `dith`).
6. **Seamless tiles**: joints on the right/bottom edges, bevel light on the top/left, so any tiles can sit side by side.

## 2. Art module

1. Copy `templates/zone-art.template.ts` to `tools/art/zones/<id>.ts`, rename the export, register it in `tools/art/zones/index.ts`.
2. Palette block at the top of the module: every color of the zone is declared there as a ramp (sky, stone, ground, accents, fire). Reuse `flames(ramp)` from `shared.ts` for fires.
3. **Backdrop** (640x200): sky ramp top to `horizon`, the light source upper-left with a dithered halo, then distance layers from far (low contrast, hazy, cooler) to near (warmer, more contrast). Set `horizon` to where land meets sky.
4. **Tiles** (32x32 painters `(b, seed) => void`): floor variants (6-9 so the grid does not repeat visibly), edge transitions (drifts, rubble), wall pieces (plain, dark, crown, base, special pieces), multi-tile set pieces cut from a 64x64 painting (see `quarter()` in `sunscar.ts`). Each tile is painted once and repeated wherever it is placed: a crack or stain in a common floor variant shows up all over the arena, so keep damage to one rarely placed variant.
5. **Props**: one bitmap list per kind; describe each in `kinds` with an `anchor` and a `mode` (`static`, `loop` with `ms`, `pulse` = frame 1 breathes over frame 0) and `fire: { dy }` for anything that burns (needs a `flame` kind). Characters-like props (statues, urns) can use the champion renderer (`sprite()` in `sunscar.ts`) so they share the champions' shading. When a prop gets a dark `outline()`, outline the solid parts only and paint water, spray, smoke and light after it: an outline around every dithered droplet turns a waterfall into a chain.
6. **Layout**: fill `ground` rows 6-11 and `wall` rows 1-5 by tile name; place props with layers `far` (behind the tiles: sky pieces, distant scenery), `back` (on the wall), `floor` (under units), `fg` (edges only). Floating things can `bob`; clouds can `drift` sideways across the sky (`drift: { speed }`, px a second, coming round again; a negative speed drifts west); an animal can `roam` to and fro along its row (`roam: { span, speed, pause, walk }`: the first `walk` frames its walk cycle, the rest its grazing; it faces the way it walks, so draw it facing right; match `speed` to the stride of the walk frames, or its hooves slide); a `pulse` breathes once every `ms`; a prop that paints its own fire sets `fire: { dy, flame: false }`; a line that sheds sparks (a rift, a crackling crystal) is a `sparks` emitter on the `ZoneArt` (`every`, `speed`, `life`: something gigantic sheds slow sparks that linger). Keep motion calm: Jakub found a fast, synchronized fire "very busy and weird" (2026-10-12), so give each tongue of a fire its own pace. A texture on the floor or the far ground that scales with the row must measure x from one centre (a vanishing point), or it shears into diagonal streaks: share one perspective between the backdrop's ground and the floor props (`world()` in `zone3.ts`). Every phase in a looping prop must run a whole number of cycles per loop, or the loop jumps where it restarts (he spotted it on the haystack). Every `floor` prop is drawn after every `back` prop: keep them apart where the back prop should stand in front.

## 3. Behaviour entry

Add a `ZoneDef` with the same id to `src/game/data/zones.ts`:

| Field | Meaning |
| --- | --- |
| `ambient` | `snow`, `sand`, `motes` (star-dust and shooting stars), `leaves` (autumn leaves tumbling in the wind), `pollen` (pollen drifting in the sunlight), `spores` (glowing dust-motes drifting in soft pearl halos, far ones behind the champions, near ones in front: Zone 3) `seeds` (feather-grass seeds sailing across on the wind from the left, a few close to the camera: Zone 4) or `flurries` (snowflakes blown in from the right ahead of a storm, melting away as they cross: Zone 5); a new kind needs code in `src/game/view/zone.ts` (`spawnAmbient` and the ambient's count in `update`, or a system of its own like the spores) |
| `butterflies` | optional: the spots butterflies flutter about, one butterfly each (Zone 2) |
| `embers` | optional colors of the embers rising from fire props (first color, then the fade), e.g. teal for plasma braziers |
| `glow` | RGB of the light pools around fire props |
| `shadow` | `{ dx, stretch }` of unit shadows: high light `1 / 1`, low sun `6 / 1.35` |
| `tint` | optional full-screen mood overlay `{ color, alpha, op }` (keep alpha under 0.1) |
| `birds`, `haze` | circling birds (needs a `bird` prop kind with frames; `birdsAt`: the spots they circle, the birds shared out among them in turn; the kind's `ms` for the wingbeat), heat shimmer around `horizon` |
| `flash` | optional: now and then the sky lights up for a moment in a strange colour, `{ at, every, ms, colors }` (Zone 1: from its rift every 10-25 s for 1.7 s); preview with `?skyflash=1` |
| `shootingStars` | optional: now and then a shooting star crosses the sky, every `[min, max]` ms (Zone 3: 14-32 s); rare events stay rare, a content test keeps both at 10 s or more |

Then point a location at it (`zone: '<id>'` in `campaign.ts`); while the location has no stages, `&zone=<id>` on the battle and team deep links shows the background with any stage. Champions whose `faction` belongs to the place show it behind their detail page and in their Academy demos: map the faction to the zone in `homeZone()` (`src/game/data/zones.ts`). The collection and Weaving stand in the zone of the newest open location; the main menu is the Sanctum, a diorama of its own (`tools/art/sanctum.ts`), and no zone stands behind it.

## 4. Build and verify (all must pass)

```bash
npm run art -- zones <id>     # writes public/assets/zones/<id>/ and docs/images/zone_<id>.png
npm run audit                 # backdrop 640x200, tiles on the grid, color budgets
npm test                      # assets exist, prop kinds and frames, spawns
npm run typecheck
```

Visual review — look at every image at 2x before calling it done:

```bash
# first look at docs/images/zone_<id>.png (the static composition), then check it live:
npm run dev
npx tsx tools/shots.ts "http://localhost:5173/?unlockall=1&screen=battle&stage=<a stage using it>&team=captain_gareth,rime_scholar" out "w6000,ka,B6:700"
npx tsx tools/shots.ts "http://localhost:5173/?unlockall=1&screen=team&stage=<stage>" out "w2500,B1:0"
```

Pick a test team with a light, a dark and a saturated champion (today Captain Gareth's steel and amber and the Rime Scholar's dark green and blonde; add a light and a saturated champion when the roster has them): all must read against the floor, their HP bars and numbers must stay legible over the wall, and nothing in the foreground may cover them.

## 5. Done means

- Worksheet filled and approved by Jakub.
- Art module and `ZoneDef` registered; a location uses it; `npm run audit`, `npm test`, `npm run typecheck` pass.
- Preview, battle and team-select captures reviewed at 2x.
- `docs/ART_GUIDE.md` section 10 shows the new preview next to the others; `docs/GAME_STRUCTURE.md` lists the location.
- Assets regenerated and committed with the code (`public/assets` is versioned).
