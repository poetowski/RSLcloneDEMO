# UI Guide

Every screen is drawn into the same 640x360 buffer as the battle, with the pixel font and the generated UI parts. This guide fixes the layout grid, the parts, the interaction rules and the text rules, so a new screen looks like it was always there.

---

## 1. Layout

| Rule | Value |
| --- | --- |
| Screen | 640 x 360, whole-number scaled |
| Header | 0-30 px: dark bar, gold rule at y 30; BACK at (6, 5) 64x20; title in bold gold at x 82, subtitle in dim; star counter top-right |
| Margins | 8 px from the screen edge for panels, 12-16 px inside panels |
| Gaps | 4 px between related buttons, 8 px between cards, 6 px between text blocks |
| Text width | wrap at the panel width minus 24-40 px; never more than ~70 characters per line |
| Backdrops | the main menu is the Sanctum, a diorama of its own (section 4); the other menus stand in front of a living combat background (`Diorama`), dimmed 0.66 (champion page) to 0.8 (Academy) so text stays readable |
| Modal | dim the scene (0.55-0.62), then a gold panel |

## 2. Parts (`tools/art/ui/`, `public/assets/ui/ui.json`)

| Part | Use |
| --- | --- |
| `panel`, `panel_gold`, `panel_red` | nine-slice panels (6 px corners): dark for HUD info, gold for primary content and modals, red for enemies, defeat and locked notices |
| `well` | inset area inside panels (tips, formulas, key tables) |
| `big_up/hover/down/off` | menu buttons (8 px corners), bold label, optional `mi_*` glyph |
| `btn_up/hover/down/off` | small HUD and toggle buttons (4 px corners) |
| `tab_on`, `tab_off` | tab strips (the collection's affinity and class filters, Weaving's slot and state filters, champion page) |
| `card_<rarity>`, `card_locked` | card frames with transparent centers: draw the card content first, the frame last |
| `gem_<affinity>`, `emblem_<faction>`, `role_<role>` | category glyphs; always next to their name the first time a screen shows them |
| `star_s/m/l(_off)` | stage stars on the map (s), panels (m), results (l) |
| `lock`, `crown`, `check`, `new` | locked content, bosses, finished items, unseen recruits and new spools |
| `camp_open/cleared/locked`, `camp_glow_0-2` | campaign nodes on the world map (33x33 medallions; the runtime writes the numeral) and the pulsing ring around the current area |
| `node_open/cleared/locked/boss`, `node_glow_0-2` | stages in an area's stage list, and the pulsing ring around the selected stage |
| `logo`, `divider`, `podium`, `arrow_l/r`, `banner` | title, section rules, formation and showcase podiums, paging, location and skill banners |
| `mi_*` | 16x16 menu glyphs: campaign, champions, weaving (a spool unwinding a thread of light to a spark), academy, options, back, fight, play |
| `matrix_rose`, `lobe_sel`, `lobe_attune` | the MATRIX tab and Weaving's weave dialog: the 144 px rose (gold rods join the fixed slots, a thread of arcane light the choice slots), the ring of the chosen slot, the dotted rings of the slots that attune it (in the dialog: the other slots that take the spool) |
| `spool_<pattern>_<grade>` | 18x18 spool icons, one per core Weave Pattern id and grade (`spool_pattern_pulse_0` ... `spool_pattern_tranquility_2`): cap metal = grade, thread colour = pattern; spools that do not fit the chosen slot are drawn at 30% |
| `bigspool_<pattern>_<grade>` | 22x35 spools for Weaving's cards (and its panel, at 2x): a finial, a domed cap, a crystal holding two turns of the thread (the far turn dim), a foot; the cap metal shows the grade, Silver adds an engraved band and studs, Gilded studs, filigree and a jewel of the thread's colour |
| `card_ashen`, `card_silver`, `card_gilded` | spool card frames, one per grade (`UIR.grade`) |
| `rose_0` ... `rose_5`, `rose_135` | 13x13 small roses that light the slots a spool fits (one slot; or the three choice slots, for a base stat in %): Weaving's slot filters and the top-left corner of its cards |

## 3. Colors

| Token (`COLORS` in `src/game/ui/ui.ts`) | Use |
| --- | --- |
| `goldHi` #ffe070 | titles, focused labels, skill names |
| `gold` #f0c650 | headings, rules, the zone name |
| `text` #e8eef8 | body text |
| `dim` #9fb0cc | secondary text, subtitles |
| `faint` #6f7f9c | hints and footers |
| `good` #8cff7a / `bad` #ff8a7a | positive / negative values, strong / weak matchups, warnings |
| rarity, affinity, faction colors | from `meta.ts`; a champion's own name uses its signature `color` |

Every text is drawn with a 1 px dark outline (`ink`), so it reads on any background.

## 4. Interaction

- **Mouse and keyboard are equal.** Every clickable element is a region with a stable `id`; arrows move focus to the nearest region in that direction, `Enter`/`Space` activates it, `Esc` goes back. Hover and focus share one highlight.
- Buttons light up (gold label, brighter fill) when hot; disabled buttons are grey and ignore clicks.
- Tooltips: any region can carry `tip()`; the gold tooltip panel follows the mouse or the focused region, flipping below when there is no room above.
- Destructive actions (reset progress) ask inline: `Sure? YES / NO`, never a browser dialog.
- Screen changes use the dithered dissolve (`App.go`); input is ignored while it plays.
- Animated sprites in menus use `drawChampion` / `frameAt`; hovering a recruited card plays its A1.
- **The campaign map scrolls** under a camera (two `Scroller`s; the map is one screen tall, so it moves sideways today). Keyboard focus moves between the areas' nodes and the camera follows it; `W` `A` `S` `D` or `Shift` + arrows slide the map; dragging moves it at once. A screen that implements `drag` gets its click on release, and only when the pointer moved less than 3 px, so a drag never selects. `M` toggles the whole-world overview. Map regions are clipped to the view under the header, and a focused item outside its clip shows no tooltip.
- **The main menu is a place, not a list** (Jakub, 2026-10-24: "instead of navigational buttons user can click on objects or building from diorama"). The Sanctum's places lead on: the Starbridge Gate to the campaign, the Reliquary to the champions, the Weaver's Spire to Weaving, the Observatory to the Academy, the astrolabe to the options. A place is hit on its own pixels or the ring of light round them, never on its box (`SanctumView.placeAt`, reading the scene atlas's alpha once); under the pointer or the keyboard's focus it gets that ring, breathing, and its label lights with the place's name under it. Each label hangs on the island's face below its place and carries what the old buttons did: the frontier stage or `replay`, the roster count, the spools held, the unread chapters, the NEW badges. The arrows walk the places (each has a region with its box for the keyboard) and Enter goes. Only the champions change between visits: a few of those you own, at random, on the plaza.
- **The collection** (Jakub, 2026-10-12) groups the cards by faction, in the factions' order, each group under its emblem and name; inside a group the rarest come first and every rarity starts rows of its own, so a row never holds two rarities. Filters by affinity and by class (Damage, Tank, Support) combine; a lit tab clicked again lets go of its filter, ALL lets go of both. The champion page's arrows walk the cards in this order.
- **Weaving** (Jakub, 2026-10-24: "be consistent with UI and match how we now have champions") lays its spools out as the collection lays out champions: cards in groups by Weave Pattern, in catalog order, each under its Gilded spool, its name in its thread's colour, a count and what two spools weave; inside a group the finest grade first, every grade on rows of its own. The grid (five 66x62 cards a row) takes the left of the screen and a gold panel the right. Filters: ALL, the six slots (a small rose each; a tooltip names the slot and what it takes), then NEW, LOOSE and WOVEN; a slot and a state combine, a lit tab clicked again lets go. A card: the spool in a window tinted by its thread, a pool of its light, the grade's frame, its main stat on the plate, the rose of the slots it fits top left, the face of the champion wearing it top right, how many lie alike bottom right, the NEW badge on a new find. Identical loose spools share one card; each woven spool has its own. Clicking a card chooses it (clicked again, it lets go) and the panel reads it out with its actions at the foot; with none chosen the panel tells what the storage holds and where spools are found. WEAVE opens a modal dialog: the champions first (a green + marks a free slot for the spool), then the champion's rose and one button per slot that takes the spool, the hovered one previewing the stats it changes and the patterns it completes or breaks. UNRAVEL asks inline (`Unravel it for good? YES / NO`). After an action a short line in the good colour says what happened. Opened from a champion's MATRIX tab ("+N more"), Weaving filters to that slot, weaves into that champion first, and BACK returns to the tab.
- **Anything that grows with the roster scrolls** instead of running off the screen: the collection grid and Weaving's spools (vertically) and the team-select roster strip (sideways). Use `Scroller` (`src/game/ui/scroll.ts`): `extent()` every frame, the wheel and paging keys move it, and `reveal()` pulls the keyboard-focused item into view. Clip the drawing to the window and give each item's region `clip: window` so a half-hidden card can never be clicked or hovered outside it; items scrolled fully out of view keep their region so arrow keys still reach them. Show where more content is: a scrollbar and a fading edge with a bobbing chevron (collection), or `arrow_l/r` that dim at the ends (roster strip); both are clickable for touch screens, which have no wheel.

## 5. Text rules

- Four faces of one font: `regular` for running text, `bold` for names, labels and headings, `display` for titles, a champion's name in its header or ceremony, and big numbers (cooldowns, critical hits), and `micro` digits on a dark badge for counters on status icons (`ui.tinyNum`). Display text is always capitals. Never draw `regular` or `bold` at a scale above 1; reach for `display` instead.
- Headings in caps, body in sentence case. Numbers as digits (`3 turns`, `+25% Attack`).
- Name what the player sees: "Clear stage 2-3", "Heal Block", "STRONG HIT"; never internal ids.
- Status names and numbers in the UI come from `statuses.ts` and the Academy text from `codex.ts`; keep them identical to the rules in `battle.ts`.

## 6. Adding a screen

1. Extend `BaseScreen` (`src/game/screens/base.ts`): implement `draw(ctx)`, optionally `update(dt)` and `back()`.
2. Use `this.header()`, `ui.panel()`, `ui.button(id, ...)`, `ui.para()`; give every button a stable id.
3. Add a route to `Router` in `src/game/app.ts` and `src/main.ts`, plus a `?screen=` deep link.
4. Capture it with `npx tsx tools/shots.ts "http://localhost:5173/?screen=<name>" out "w2500,B1:0"` and look at the 2x image before calling it done.
