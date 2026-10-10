# Game Structure

How the content of The Loom: Reliquary of Legends fits together: champions and their categories, the campaign, combat backgrounds, the Academy, the player's save and the screens that present them. Rules of combat: [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md). Pixels: [ART_GUIDE.md](ART_GUIDE.md). Screens: [UI_GUIDE.md](UI_GUIDE.md).

> **Status: Jakub's own content is coming in.** The name and the logo are final: **The Loom: Reliquary of Legends** (code name TLROL), high fantasy with a gothic arcane look. The categories, the factions, the two starting champions and Zone 1 follow his design decisions ([DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)); what he has not designed yet stands in, marked as such below. The engine, the tools and the guardrails stay.

---

## 1. The content model

```
LocationDef ──zone──> ZoneDef (behaviour) + ZoneArt (pixels)
   │
   └─ stages: StageDef ──enemies──> ChampionDef ──skills──> SkillDef x3   (a location is a node on the map; its stages open from it)
                │                        ▲
                └─recruit────────────────┘   (the first clear brings this champion)
```

Every piece of content is plain data in `src/game/data/`, paired with an art module in `tools/art/`:

| Content | Data (rules, text) | Art (pixels) | Registry |
| --- | --- | --- | --- |
| Champion | `src/game/data/champions/<id>.ts` (`ChampionDef`) | `tools/art/champions/<id>.ts` (`ChampionArt`: rig, animations, skill icons) | `champions/index.ts` in both places |
| Combat background | `src/game/data/zones.ts` (`ZoneDef`: ambience, glow, shadows, tint) | `tools/art/zones/<id>.ts` (`ZoneArt`: tiles, backdrop, props, layout) | `ZONES` / `ZONE_ART` |
| Campaign | `src/game/data/campaign.ts` (`LocationDef` with `StageDef`s) | the world map's landmarks and road come from the same data (`tools/art/map.ts`) | `LOCATIONS` |
| Status effect | `src/game/data/statuses.ts` | `tools/art/ui/status.ts` (12x12 icon) | `STATUSES` / `STATUS_ICONS` |
| Combat effect | named by skills (`hits[].fx`, `projectile`, `castFx`, `actorFx`) | `tools/art/fx/<group>.ts` | `FX` |
| Academy chapter | `src/game/data/codex.ts` | figures drawn by `src/game/screens/academy.ts` | `CHAPTERS` |

`tests/content.test.ts` checks that all of these agree with each other and with the generated assets.

## 2. Champion categories (`src/game/data/meta.ts`)

The four enums are Jakub's ([DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) 2): independent axes, fixed per champion when it is authored. What each one does in play is still open; where the game needs a rule today it keeps the proof of concept's, marked below.

| Category | Values | Meaning today |
| --- | --- | --- |
| Rarity | Common, **Elite**, **Heroic**, **Mythic** | the stat budget (`norms.ts`, the proof of concept's budgets carried over) and the card frame color; what rarity gates is not decided |
| Affinity | **Ember**, **Bloom**, **Tide** | Ember > Bloom > Tide > Ember; a strong hit deals +20% damage and a weak hit -20% (the proof of concept's rule: the mechanism is not decided) |
| Role | Tank, Damage, Support | how the budget is spent and what the kit does; whether roles are mechanical is not decided |
| Faction | Azure Crown, Sanguine Dominion, Court of Root, Ashveil Reign | story and standard (the medallion on cards and pages, named on the champion page's lore tab); no mechanics. Standards: a gold crown on blue, a red hexagon on black, a brown claw on green, a white bone across a dark grey |

The roster today:

| Champion | Rarity | Affinity | Role | Faction | How you get them |
| --- | --- | --- | --- | --- | --- |
| Azure Warrior (name to come) | Elite | Ember | Damage | Azure Crown | starter |
| Sanguine Support (name to come) | Elite | Tide | Support | Sanguine Dominion | after the first battle (clear 1-1) |

Their names, personalities, kits and art are not designed: the proof of concept's berserker and sun priestess stand in for their bodies, stats and skills, with plainly renamed skills.

## 3. The campaign (`src/game/data/campaign.ts`)

- A **location** is an area: one **campaign node** on the world map (its `map` position; the landmark is drawn above it), a combat background for its stages and an optional `requires` stage that opens it. Choosing the node opens its **stage list**: every stage with its stars, lock or boss crown, and for the selected stage its story, enemies, power, reward and the way into team select. Stages have no place on the map of their own and no names: a stage is its id (`1-3`). An area whose stages are not designed yet (Zone 2) has a node and no stages.
- A **stage** lists up to three enemies in formation order (front, back-top, back-bottom), a `power` multiplier for their HP and ATK, an optional boss flag per enemy (x1.6 HP, a crown), a map position (world pixels, see below) and the champion its first clear brings (`recruit`), who need not be among its enemies: the second champion joins after the first battle without being fought there.
- A stage opens when the previous stage of its location is cleared; the first stage of a location opens when the location does.
- Difficulty follows the curve in [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) section 10; tune `power` with `npm run balance`.
- The **world map** is `WORLD_MAP` (1280x360, two screens wide and one tall): the campaign is a line of areas crossed from left to right (DESIGN_DECISIONS.md 5.1). Location `map` positions are in its pixels. The campaign screen scrolls it under a camera: drag to move (a click fires on release), Left and Right step between areas in campaign order and the camera keeps the focused node in view, `W` `A` `S` `D` or `Shift` + arrows slide it, and `M` (or WHOLE MAP) shows the overview, the same world drawn at half the size on one screen; clicking the overview goes there. Coming back from team select or a battle opens the stage list on that stage.

| Location | Zone | Stages |
| --- | --- | --- |
| I. A Dim Island | `zone1` | 1-1 to 1-10 (1-1 brings the Sanguine Support; 1-10 is the boss) |
| II. A Mystic Arena (after 1-10) | none yet | not designed |

Zone 1 follows Jakub's working notes (DESIGN_DECISIONS.md 5.3), which are not locked: the stage texts quote them (contact, the settlement, escalation, the turning point, leaving). Its enemies are copies of the two champions, standing in for the warriors of both worlds until enemies are designed. Zone 2 (the mystic arena in a Court of Root forest) has its node in the jungle and no stages yet. The world map follows his brief (DESIGN_DECISIONS.md 5.4a): the edge of a continent, a rift in the west, jungle toward the east, nothing beyond its north and south edges.

## 4. The save: the Master Archivist and the Reliquary

The Master Archivist (`src/game/archivist.ts`) is the player and their save, stored in `localStorage` under `tlrol.save.v3`; every access is guarded so the game runs without storage.

| Field | Meaning |
| --- | --- |
| `stars` | best stars per stage id |
| `team` | last team, restored in team select and shown on the main menu |
| `read` | Academy chapters read |
| `settings` | default battle speed and auto |
| `reliquary` | the champions owned, starters included |

The Reliquary (`src/game/reliquary/`) holds one Hero Soul File per owned champion, with its NEW badge (recruited, not yet opened on the champion page) and its Weaver Matrix of six slots, and the loose Thread Spools. The Weaver Matrix has its approved slots, grades, strands and attunement ([MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 14) and shows on the champion page's MATRIX tab. Spools have no sources yet and Weave Patterns are not defined, so the stock stays empty in play; `?spools=1` adds a sample for development.

Loading drops champion and stage ids the catalog no longer has, and gives every cleared stage's champion its soul file (so a save survives a stage that changes what it brings). An older save (`tlrol.save.v2` from before Jakub's content, or the proof of concept's `oathbound.profile.v1`) holds champions and stages that no longer exist: only its settings and the Academy chapters read carry over, once, into a new game, and the old entry is left in place.

Helpers: `stageOpen`, `locationOpen`, `frontier` (the newest playable stage), `recordClear` (stars + first-clear recruit), `isFresh`, `unlockEverything` (Options, demo use).

## 5. Screens and flow

```
            ┌──────────────── Main menu ────────────────┐
            │            │              │               │
        Campaign     Champions       Academy         Options
        (world map)  (collection)    (chapters) ─── See it ──> skill demo in the arena
            │            │
       stage list    champion page
            │
       Team select
            │
         Battle ── pause: resume / auto / speed / retreat
            │
         Results ── victory: stars, first-clear recruit ──> Recruit ceremony ──> Campaign
                    defeat:  retry / map
```

| Screen | File | Route |
| --- | --- | --- |
| Main menu | `src/game/screens/menu.ts` | `?screen=menu` (default) |
| Campaign map | `screens/campaign.ts` | `?screen=campaign&stage=1-6` |
| Team select | `screens/team.ts` | `?screen=team&stage=1-2` |
| Battle | `screens/battle.ts` + `view/scene.ts` | `?screen=battle&stage=1-3&team=azure_warrior,sanguine_support` |
| Collection | `screens/collection.ts` | `?screen=collection` |
| Champion page | `screens/champion.ts` | `?screen=champion&champion=azure_warrior` |
| Academy | `screens/academy.ts` | `?screen=academy&chapter=debuffs` |
| Options | `screens/options.ts` | `?screen=options` |
| Recruit ceremony | `screens/recruit.ts` | `?screen=recruit&champion=sanguine_support` |
| Skill demo | `screens/battle.ts` (demo mode) | `?demo=leaping_blow` |

All navigation goes through `app.router` (`src/main.ts`), which wraps each switch in a dithered dissolve. `?unlockall=1`, `?reset=1` and `?spools=1` change the save before the first screen opens.
