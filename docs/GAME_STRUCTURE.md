# Game Structure

How Oathbound's content fits together: champions and their categories, the campaign, combat backgrounds, the Academy, the player's profile and the screens that present them. Rules of combat: [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md). Pixels: [ART_GUIDE.md](ART_GUIDE.md). Screens: [UI_GUIDE.md](UI_GUIDE.md).

---

## 1. The content model

```
LocationDef ──zone──> ZoneDef (behaviour) + ZoneArt (pixels)
   │
   └─ stages: StageDef ──enemies──> ChampionDef ──skills──> SkillDef x3
                │                        │
                └─recruit────────────────┘   (first clear joins your collection)
```

Every piece of content is plain data in `src/game/data/`, paired with an art module in `tools/art/`:

| Content | Data (rules, text) | Art (pixels) | Registry |
| --- | --- | --- | --- |
| Champion | `src/game/data/champions/<id>.ts` (`ChampionDef`) | `tools/art/champions/<id>.ts` (`ChampionArt`: rig, animations, skill icons) | `champions/index.ts` in both places |
| Combat background | `src/game/data/zones.ts` (`ZoneDef`: ambience, glow, shadows, tint) | `tools/art/zones/<id>.ts` (`ZoneArt`: tiles, backdrop, props, layout) | `ZONES` / `ZONE_ART` |
| Campaign | `src/game/data/campaign.ts` (`LocationDef` with `StageDef`s) | world map nodes and road come from the same data (`tools/art/map.ts`) | `LOCATIONS` |
| Status effect | `src/game/data/statuses.ts` | `tools/art/ui/status.ts` (12x12 icon) | `STATUSES` / `STATUS_ICONS` |
| Combat effect | named by skills (`hits[].fx`, `projectile`, `castFx`, `actorFx`) | `tools/art/fx/<group>.ts` | `FX` |
| Academy chapter | `src/game/data/codex.ts` | figures drawn by `src/game/screens/academy.ts` | `CHAPTERS` |

`tests/content.test.ts` checks that all of these agree with each other and with the generated assets.

## 2. Champion categories (`src/game/data/meta.ts`)

| Category | Values | Meaning |
| --- | --- | --- |
| Rarity | Common, Uncommon, **Rare**, **Epic**, **Legendary** | the stat budget (`norms.ts`); the card frame color |
| Affinity | **Force**, **Wild**, **Arcane**, Void | Force > Wild > Arcane > Force for +/-20% damage; Void is neutral |
| Role | Tank, Bruiser, Damage, Support, Control | how the budget is spent and what the kit does |
| Faction | Order of Dawn, Clans of the North, Wildwood, Frostfang Coven, Temple of the Still Peak, Sunscar Dynasty, Free City of Nyota | story and visual family; picks the champion's home background (`homeZone()` in `zones.ts`) |

The roster today:

| Champion | Rarity | Affinity | Role | Faction | How you get them |
| --- | --- | --- | --- | --- | --- |
| Sir Aldric | Epic | Arcane | Tank | Order of Dawn | starter |
| Brakka Ironhide | Rare | Force | Damage | Clans of the North | starter |
| Sylwen | Rare | Wild | Damage | Wildwood | starter |
| Master Tenzo | Epic | Wild | Support | Temple of the Still Peak | clear 1-1 |
| Ysolde | Epic | Arcane | Control | Frostfang Coven | clear 1-2 |
| Vorhaal | Legendary | Void | Bruiser | Frostfang Coven | clear 1-3 (boss) |
| Akhet | Rare | Force | Damage | Sunscar Dynasty | clear 2-1 |
| Kha'zir | Epic | Force | Tank | Sunscar Dynasty | clear 2-2 |
| Nefret | Epic | Arcane | Support | Sunscar Dynasty | clear 2-3 |
| Anhotep | Legendary | Void | Control | Sunscar Dynasty | clear 2-4 (boss) |
| Imara | Epic | Force | Bruiser | Free City of Nyota | clear 3-1 |
| Kwesi | Rare | Wild | Support | Free City of Nyota | clear 3-2 |
| Mwamba | Legendary | Arcane | Tank | Free City of Nyota | clear 3-3 (boss) |

## 3. The campaign (`src/game/data/campaign.ts`)

- A **location** is a chapter with one combat background, a label on the world map and an optional `requires` stage that opens it.
- A **stage** lists up to three enemies in formation order (front, back-top, back-bottom), a `power` multiplier for their HP and ATK, an optional boss flag per enemy (x1.6 HP, a crown), a map position (world pixels, see below) and the champion it **recruits** on the first clear. Only champions the player actually faced in that stage can be recruited there.
- A stage opens when the previous stage of its location is cleared; the first stage of a location opens when the location does.
- Difficulty follows the curve in [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) section 10; tune `power` with `npm run balance`.
- The **world map** is `WORLD_MAP` (1920x720, three screens wide and two tall). Stage and location `map` positions are in its pixels. The campaign screen scrolls it under a camera: drag to move (a click fires on release), arrows jump between stages and the camera keeps the focused stage in view, `W` `A` `S` `D` or `Shift` + arrows slide it, and `M` (or WHOLE MAP) shows the overview, the same world drawn at a third of the size on one screen; clicking the overview goes there.

| Location | Zone | Stages |
| --- | --- | --- |
| I. Frostfang Ruins | `frostfang` | 1-1 The Frozen Gate, 1-2 Hall of Icicles, 1-3 Throne of the Dread Knight (boss Vorhaal) |
| II. Sunscar Ruins (after 1-3) | `sunscar` | 2-1 Dunes of Ash, 2-2 The Sunken Colonnade, 2-3 Temple of the Burning Sun, 2-4 Tomb of Anhotep (boss Anhotep) |
| III. Nyota Highlands (after 2-4) | `nyota` | 3-1 The Baobab Steps, 3-2 The Hall of Echoes, 3-3 Heart of the Skyforge (boss Mwamba) |

## 4. The profile (`src/game/profile.ts`)

Saved in `localStorage` under `oathbound.profile.v1`; every access is guarded so the game runs without storage.

| Field | Meaning |
| --- | --- |
| `unlocked` | recruited champions (starters are implied) |
| `stars` | best stars per stage id |
| `team` | last team, restored in team select and shown on the main menu |
| `fresh` | recruited champions not yet opened (NEW badges) |
| `read` | Academy chapters read |
| `settings` | default battle speed and auto |

Helpers: `stageOpen`, `locationOpen`, `frontier` (the newest playable stage), `recordClear` (stars + first-clear recruit), `unlockEverything` (Options, demo use).

## 5. Screens and flow

```
            ┌──────────────── Main menu ────────────────┐
            │            │              │               │
        Campaign     Champions       Academy         Options
        (world map)  (collection)    (chapters) ─── See it ──> skill demo in the arena
            │            │
       stage panel   champion page
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
| Campaign map | `screens/campaign.ts` | `?screen=campaign&stage=2-3` |
| Team select | `screens/team.ts` | `?screen=team&stage=1-2` |
| Battle | `screens/battle.ts` + `view/scene.ts` | `?screen=battle&stage=1-3&team=knight,monk,frostmage` |
| Collection | `screens/collection.ts` | `?screen=collection` |
| Champion page | `screens/champion.ts` | `?screen=champion&champion=tomblord` |
| Academy | `screens/academy.ts` | `?screen=academy&chapter=debuffs` |
| Options | `screens/options.ts` | `?screen=options` |
| Recruit ceremony | `screens/recruit.ts` | `?screen=recruit&champion=jackal` |
| Skill demo | `screens/battle.ts` (demo mode) | `?demo=eternal_tomb` |

All navigation goes through `app.router` (`src/main.ts`), which wraps each switch in a dithered dissolve. `?unlockall=1` and `?reset=1` change the profile before the first screen opens.
