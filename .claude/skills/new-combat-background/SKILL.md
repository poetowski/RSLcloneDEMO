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

The contract (`ZoneArt`, `PropKind`, rows, spawns) is in `tools/art/zones/shared.ts`. Reference zones: `frostfang.ts` (night, snow, stone arches), `sunscar.ts` (sunset, sand, reliefs, a gate and a colonnade framing the desert) and `nyota.ts` (cosmic dusk, painted panels, a mud-brick gate whose portal is a pulsing prop, pylons over an open void with floating islands). Read `docs/ART_GUIDE.md` sections 3, 4 and 10 first.

## 1. Design (worksheet first)

Copy `templates/worksheet.md` into your notes and fill it in. Show Jakub the name, composition and palette and wait for his yes before painting; without his answer, stop at the worksheet (CLAUDE.md, Content approval). Be ambitious with the set dressing — the reference zones each carry a story (offering reliefs, a toppled colossus, a frozen throne room) — but never at the cost of the floor's readability.

Rules that are not negotiable:

1. **The key light is in the upper-left** (sun, moon, fire). Every tile, prop and carving is lit from there: top/left edges bright, bottom/right edges dark; in sunk relief the upper-left lip is in shadow.
2. **The floor (rows 6-11) is mid value and low contrast.** Champions are outlined and high contrast; the floor must never compete. Put bright, saturated set pieces on the wall, in the backdrop or at the edges.
3. **Formation spots are fixed** (player 216,250 / 152,216 / 136,284; enemy 424,250 / 488,216 / 504,284). No tall `back` prop directly behind them, no `fg` prop near them.
4. **Openings earn their keep**: every transparent gap in the wall shows something composed in the backdrop (the Sunscar gate frames the great pyramid). Check the backdrop against the wall: an element the architecture half hides (a beam rising from behind a pylon, the sliver of an island beside a tower) reads as a glitch, so move it into an opening or leave it out.
5. **No smooth gradients, no anti-aliasing**: ramps with 4x4 Bayer dithering (`rampDither`, `dith`).
6. **Seamless tiles**: joints on the right/bottom edges, bevel light on the top/left, so any tiles can sit side by side.

## 2. Art module

1. Copy `templates/zone-art.template.ts` to `tools/art/zones/<id>.ts`, rename the export, register it in `tools/art/zones/index.ts`.
2. Palette block at the top of the module: every color of the zone is declared there as a ramp (sky, stone, ground, accents, fire). Reuse `flames(ramp)` from `shared.ts` for fires.
3. **Backdrop** (640x200): sky ramp top to `horizon`, the light source upper-left with a dithered halo, then distance layers from far (low contrast, hazy, cooler) to near (warmer, more contrast). Set `horizon` to where land meets sky.
4. **Tiles** (32x32 painters `(b, seed) => void`): floor variants (6-9 so the grid does not repeat visibly), edge transitions (drifts, rubble), wall pieces (plain, dark, crown, base, special pieces), multi-tile set pieces cut from a 64x64 painting (see `quarter()` in `sunscar.ts`). Each tile is painted once and repeated wherever it is placed: a crack or stain in a common floor variant shows up all over the arena, so keep damage to one rarely placed variant.
5. **Props**: one bitmap list per kind; describe each in `kinds` with an `anchor` and a `mode` (`static`, `loop` with `ms`, `pulse` = frame 1 breathes over frame 0) and `fire: { dy }` for anything that burns (needs a `flame` kind). Characters-like props (statues, urns) can use the champion renderer (`sprite()` in `sunscar.ts`) so they share the champions' shading. When a prop gets a dark `outline()`, outline the solid parts only and paint water, spray, smoke and light after it: an outline around every dithered droplet turns a waterfall into a chain.
6. **Layout**: fill `ground` rows 6-11 and `wall` rows 1-5 by tile name; place props with layers `back` (on the wall), `floor` (under units), `fg` (edges only).

## 3. Behaviour entry

Add a `ZoneDef` with the same id to `src/game/data/zones.ts`:

| Field | Meaning |
| --- | --- |
| `ambient` | `snow`, `sand` or `motes` (star-dust and shooting stars); a new kind needs code in `src/game/view/zone.ts` `spawnAmbient` |
| `embers` | optional colors of the embers rising from fire props (first color, then the fade), e.g. teal for plasma braziers |
| `glow` | RGB of the light pools around fire props |
| `shadow` | `{ dx, stretch }` of unit shadows: high light `1 / 1`, low sun `6 / 1.35` |
| `tint` | optional full-screen mood overlay `{ color, alpha, op }` (keep alpha under 0.1) |
| `birds`, `haze` | circling birds (needs a `bird` prop kind with frames), heat shimmer around `horizon` |

Then point a location at it (`zone: '<id>'` in `campaign.ts`). Champions whose `faction` belongs to the place show it behind their detail page and in their Academy demos: map the faction to the zone in `homeZone()` (`src/game/data/zones.ts`). The main menu stands in the zone of the newest open location.

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
npx tsx tools/shots.ts "http://localhost:5173/?unlockall=1&screen=battle&stage=<a stage using it>&team=knight,dreadknight,stalker" out "w6000,ka,B6:700"
npx tsx tools/shots.ts "http://localhost:5173/?unlockall=1&screen=team&stage=<stage>" out "w2500,B1:0"
```

Pick a test team with a light, a dark and a saturated champion (Sir Aldric, Vorhaal, Akhet): all three must read against the floor, their HP bars and numbers must stay legible over the wall, and nothing in the foreground may cover them.

## 5. Done means

- Worksheet filled and approved by Jakub.
- Art module and `ZoneDef` registered; a location uses it; `npm run audit`, `npm test`, `npm run typecheck` pass.
- Preview, battle and team-select captures reviewed at 2x.
- `docs/ART_GUIDE.md` section 10 shows the new preview next to the others; `docs/GAME_STRUCTURE.md` lists the location.
- Assets regenerated and committed with the code (`public/assets` is versioned).
