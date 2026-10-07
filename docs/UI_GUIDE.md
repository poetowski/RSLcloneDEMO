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
| Backdrops | menus stand in front of a living combat background (`Diorama`), dimmed 0.4 (main menu) to 0.8 (Academy) so text stays readable |
| Modal | dim the scene (0.55-0.62), then a gold panel |

## 2. Parts (`tools/art/ui/`, `public/assets/ui/ui.json`)

| Part | Use |
| --- | --- |
| `panel`, `panel_gold`, `panel_red` | nine-slice panels (6 px corners): dark for HUD info, gold for primary content and modals, red for enemies, defeat and locked notices |
| `well` | inset area inside panels (tips, formulas, key tables) |
| `big_up/hover/down/off` | menu buttons (8 px corners), bold label, optional `mi_*` glyph |
| `btn_up/hover/down/off` | small HUD and toggle buttons (4 px corners) |
| `tab_on`, `tab_off` | tab strips (collection filters, champion page) |
| `card_<rarity>`, `card_locked` | card frames with transparent centers: draw the card content first, the frame last |
| `gem_<affinity>`, `emblem_<faction>`, `role_<role>` | category glyphs; always next to their name the first time a screen shows them |
| `star_s/m/l(_off)` | stage stars on the map (s), panels (m), results (l) |
| `lock`, `crown`, `check`, `new` | locked content, bosses, finished items, unseen recruits |
| `node_open/cleared/locked/boss`, `node_glow_0-2` | world map nodes and the pulsing frontier ring |
| `logo`, `divider`, `podium`, `arrow_l/r`, `banner` | title, section rules, formation and showcase podiums, paging, location and skill banners |
| `mi_*` | 16x16 menu glyphs: campaign, champions, academy, options, back, fight, play |

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
- **Anything that grows with the roster scrolls** instead of running off the screen: the collection grid (vertically) and the team-select roster strip (sideways). Use `Scroller` (`src/game/ui/scroll.ts`): `extent()` every frame, the wheel and paging keys move it, and `reveal()` pulls the keyboard-focused item into view. Clip the drawing to the window and give each item's region `clip: window` so a half-hidden card can never be clicked or hovered outside it; items scrolled fully out of view keep their region so arrow keys still reach them. Show where more content is: a scrollbar and a fading edge with a bobbing chevron (collection), or `arrow_l/r` that dim at the ends (roster strip); both are clickable for touch screens, which have no wheel.

## 5. Text rules

- Three faces of one font: `regular` for running text, `bold` for names, labels and headings, `display` for titles, a champion's name in its header or ceremony, and big numbers (cooldowns, critical hits). Display text is always capitals. Never draw `regular` or `bold` at a scale above 1; reach for `display` instead.
- Headings in caps, body in sentence case. Numbers as digits (`3 turns`, `+25% Attack`).
- Name what the player sees: "Clear stage 2-3", "Heal Block", "STRONG HIT"; never internal ids.
- Status names and numbers in the UI come from `statuses.ts` and the Academy text from `codex.ts`; keep them identical to the rules in `battle.ts`.

## 6. Adding a screen

1. Extend `BaseScreen` (`src/game/screens/base.ts`): implement `draw(ctx)`, optionally `update(dt)` and `back()`.
2. Use `this.header()`, `ui.panel()`, `ui.button(id, ...)`, `ui.para()`; give every button a stable id.
3. Add a route to `Router` in `src/game/app.ts` and `src/main.ts`, plus a `?screen=` deep link.
4. Capture it with `npx tsx tools/shots.ts "http://localhost:5173/?screen=<name>" out "w2500,B1:0"` and look at the 2x image before calling it done.
