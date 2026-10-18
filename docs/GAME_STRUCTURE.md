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
| Faction | Azure Crown, Sanguine Dominion, Court of Root, Ashveil Reign | story and standard (the medallion on cards and pages, named on the champion page's lore tab); no mechanics. Standards: a gold crown on blue, a red hexagon on black, a brown paw on green, a white bone across a dark grey |

The roster today:

| Champion | Rarity | Affinity | Role | Faction | How you get them |
| --- | --- | --- | --- | --- | --- |
| Captain Gareth (`captain_gareth`) | Elite | Ember | Damage | Azure Crown | starter |
| Rime Scholar (`rime_scholar`) | Elite | Tide | Support | Sanguine Dominion | after the first battle (clear 1-1) |
| Follower (`follower`) | Common | Tide | Damage | Court of Root | clear 1-4 (a stand-in) |
| Skirmisher (`skirmisher`) | Common | Bloom | Damage | Azure Crown | clear 1-5 (a stand-in) |
| Dominion Medic (`dominion_medic`) | Common | Tide | Support | Sanguine Dominion | clear 1-6 (a stand-in) |
| Lineholder (`lineholder`) | Common | Tide | Tank | Azure Crown | clear 1-7 (a stand-in) |
| Bloodhound (`bloodhound`) | Common | Ember | Tank | Sanguine Dominion | clear 1-8 (a stand-in) |
| Quartermaster (`quartermaster`) | Common | Bloom | Support | Azure Crown | clear 1-9 (a stand-in) |
| Enforcer (`enforcer`) | Common | Ember | Damage | Sanguine Dominion | clear 1-10 (a stand-in) |
| Walking Bush (`walking_bush`) | Common | Bloom | Tank | Court of Root | clear 2-1 (a stand-in) |
| Wild Speaker (`wild_speaker`) | Common | Ember | Support | Court of Root | clear 2-2 (a stand-in) |
| Jungle Herder (`jungle_herder`) | Elite | Bloom (a stand-in) | Tank | Court of Root | clear 2-3 (a stand-in) |
| Associate (`associate`) | Elite | Ember (a stand-in) | Support | Azure Crown | clear 2-4 (a stand-in) |
| Emissary Handlings (`emissary_handlings`) | Elite | Tide (a stand-in) | Tank | Azure Crown | clear 2-5 (a stand-in) |
| Black Rhino (`black_rhino`) | Elite | Bloom (a stand-in) | Tank | Sanguine Dominion | clear 2-6 (a stand-in) |
| Red Cloak (`red_cloak`) | Elite | Bloom (a stand-in) | Damage | Sanguine Dominion | clear 2-7 (a stand-in) |
| Grove Keeper (`grove_keeper`) | Elite | Tide (a stand-in) | Support | Court of Root | clear 2-8 (a stand-in) |
| Big Ears (`big_ears`) | Elite | Ember (a stand-in) | Damage | Court of Root | clear 2-9 (a stand-in) |
| Skeleton (`skeleton`) | Common | Tide | Damage | Ashveil Reign | clear 3-1 (a stand-in) |
| Rot Hulk (`rot_hulk`) | Common | Ember | Tank | Ashveil Reign | clear 3-2 (a stand-in) |
| Bellringer (`bellringer`) | Common | Ember | Support | Ashveil Reign | clear 3-3 (a stand-in) |

Names, looks and kits are Jakub's Starter Heroes record (DESIGN_DECISIONS.md 8): Gareth's Line Cut, Iron Blow and Wide Sweep, no passive; the Rime Scholar's Pale Strike and Rimebind, no A3, and the passive Cold Rebuke. The Skirmisher is his brief of 2026-10-11 (DESIGN_DECISIONS.md 12): one A1 that always hits twice. The Lineholder is his brief of the same day (DESIGN_DECISIONS.md 13): Guard Cut, and Brace, DEF Up on himself for 2 turns. The Quartermaster is his brief of 2026-10-12 (DESIGN_DECISIONS.md 14): a plain A1, and an A2 that heals every ally by 15% of his max HP, then lends 15% Turn Meter to the ally lowest on HP. The Enforcer is his brief of the same day (DESIGN_DECISIONS.md 15): a plain A1, and the passive Keen Edge, +10% C.RATE in every battle, extra to his stats and not shown with them outside battle. The Bloodhound is his brief of the same day too (DESIGN_DECISIONS.md 16), the first champion on four legs: a plain A1, and an A2 that puts Taunt on himself for 1 turn, cooldown 4. The Dominion Medic is his brief of the same day (DESIGN_DECISIONS.md 17): one skill, an A1 that heals every ally by 10% of his max HP and strikes nobody. The Follower is his brief of 2026-10-13 (DESIGN_DECISIONS.md 18), the Court of Root's first champion and the second on four legs, a grey wolf: an A1 on one enemy, and an A2 on one enemy with a 50% chance of DEF Down for 2 turns, cooldown 4. The Walking Bush is his brief of the same day (DESIGN_DECISIONS.md 19), a small weak ent grown from a bush: an A1 on one enemy, and an A2 that gives DEF Up for 1 turn to himself and one chosen ally, cooldown 3. The Wild Speaker is his brief of the same day too (DESIGN_DECISIONS.md 20), a tattooed man with a long stick and two green ribbons at its head: an A1 on one enemy, and an A2 on one enemy with, after the hit, a 50% chance of ATK Down for 2 turns, cooldown 4. The four Elites are his proposals of 2026-10-17 (DESIGN_DECISIONS.md 21-24; he sets their affinities later): the Jungle Herder, a hunchbacked herder of the Court of Root with a crook and a bell at his belt: an A1 on one enemy, an A2 of Taunt for 1 turn and Counterattack for 2 on himself, and the passive Herder's Ward, a Shield of 10% of his max HP at the end of every second turn of his on the ally with the lowest max HP; Emissary Handlings, a proud banner-bearer of the Azure Crown: Banner Strike with a 20% chance of Stun, Rallying Standard, DEF Up on all allies for 2 turns, cooldown 5, and the passive Unbroken Flag, a 50% chance of a Shield of 15% of his max HP on an ally an enemy has struck; Red Cloak, a bald knight of the Sanguine Dominion in plate with a red cloak and a silver zweihander: an A1, Crimson Blade with a 50% chance of Burn for 2 turns, and an A3 that gives every ally SPD Up for 2 turns; Big Ears, a small big-eared creature of the Court of Root with a blowpipe: an A1 with a 35% chance of Poison, Dart Volley on every enemy with Heal Block for 2 turns, cooldown 5, and the passive Hidden in the Undergrowth, +15% C.RATE for each fallen ally, up to +30% (his face made more animal and his ears smaller and curved on Jakub's word the same day). Three more Elites are his proposals of the same day (DESIGN_DECISIONS.md 25-27; their affinities are not set): the Associate, a woman mage of the Azure Crown in an azure robe with a staff of white motes: an A1 with a 50% chance of ATK Down for 1 turn, an A2 of SPD Up for 2 turns and ATK Up for 1 on all allies, cooldown 5, and the passive Bitter Motes, a 35% chance of Poison for 1 turn on an enemy whose attack hits her; the Black Rhino, a great black bull of the Sanguine Dominion with prosthetic tusks and a red X painted on his back: an A1 with a 20% chance of Stun, an A2 of DEF Up for 2 turns on all allies and Counterattack for 2 on himself, cooldown 5, and the passive Thick Hide, a Shield of 10% of his max HP on himself after every enemy attack that hits him; the Grove Keeper, an old druid of the Court of Root with antlers: an A1 that heals him by 7% of his max HP, an A2 that removes every debuff from one ally, cooldown 3, and the passive Keeper's Balm, a 35% chance of Regen for 1 turn on an ally an enemy debuffs. The Skeleton is his brief of 2026-10-18 (DESIGN_DECISIONS.md 28), the Ashveil Reign's first champion, a short skeleton with a rusty sword and strips of cloth round his neck: a plain A1, and the passive Bare Bones, +20 RES in every battle, extra to his stats and not shown with them outside battle. The Rot Hulk is his brief of the same day (DESIGN_DECISIONS.md 29), the Reign's second, a big, fat abomination of patched flesh: one skill, an A1 on one enemy with a 25% chance of Poison for 2 turns. The Bellringer is his brief of the same day too (DESIGN_DECISIONS.md 30), the Reign's third, a very tall skeleton with no jaw and a golden bell fixed to his arm: one skill, an A1 that shields one ally by 10% of his max HP for 1 turn and heals him by 10% of his max HP, and the passive Last Peal, DEF Up for 2 turns the first time he drops below 50% HP. Their stats and the numbers in their skills are stand-ins ([MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 9). A champion has one to three skills; a save whose champions no longer exist (the stand-ins `azure_warrior` and `sanguine_support`) keeps its progress, regains the champions its cleared stages bring and starts its team over from the starters.

## 3. The campaign (`src/game/data/campaign.ts`)

- A **location** is an area: one **campaign node** on the world map (its `map` position; the landmark is drawn above it), a combat background for its stages and an optional `requires` stage that opens it. Choosing the node opens its **stage list**: every stage with its stars, lock or boss crown, and for the selected stage its story, enemies, power, reward and the way into team select. Stages have no place on the map of their own and no names: a stage is its id (`1-3`). An area whose stages are not designed yet has a node and no stages.
- A **stage** lists up to three enemies in formation order (front, back-top, back-bottom), a `power` multiplier for their HP and ATK, an optional boss flag per enemy (x1.6 HP, a crown), a map position (world pixels, see below) and the champion its first clear brings (`recruit`), who need not be among its enemies: the second champion joins after the first battle without being fought there.
- A stage opens when the previous stage of its location is cleared; the first stage of a location opens when the location does.
- Difficulty follows the curve in [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) section 10; tune `power` with `npm run balance`.
- The **world map** is `WORLD_MAP` (1280x360, two screens wide and one tall, growing east area by area: ART_GUIDE.md 10; the overview at half the size fills the screen's width, so a wider map needs a smaller overview): the campaign is a line of areas crossed from left to right (DESIGN_DECISIONS.md 5.1). Location `map` positions are in its pixels. The campaign screen scrolls it under a camera: drag to move (a click fires on release), Left and Right step between areas in campaign order and the camera keeps the focused node in view, `W` `A` `S` `D` or `Shift` + arrows slide it, and `M` (or WHOLE MAP) shows the overview, the same world drawn at half the size on one screen; clicking the overview goes there. Coming back from team select or a battle opens the stage list on that stage.

| Location | Zone | Stages |
| --- | --- | --- |
| I. Fracture Reach | `zone1` | 1-1 to 1-10 (1-1 brings the Rime Scholar, 1-4 the Follower, 1-5 the Skirmisher, 1-6 the Dominion Medic, 1-7 the Lineholder, 1-8 the Bloodhound, 1-9 the Quartermaster; 1-10 is the boss and brings the Enforcer) |
| II. Verdant Grove (after 1-10) | `zone2` | 2-1 to 2-10, placeholders to test the area (2026-10-13; 2-1 brings the Walking Bush, 2-2 the Wild Speaker, 2-3 the Jungle Herder, 2-4 the Associate, 2-5 Emissary Handlings, 2-6 the Black Rhino, 2-7 Red Cloak, 2-8 the Grove Keeper, 2-9 Big Ears); 2-10 is the boss |
| III. Moonlit Basin (after 2-10) | `zone3` | 3-1 to 3-10, placeholders so the area can be played (2026-10-17); 3-1 brings the Skeleton, 3-2 the Rot Hulk and 3-3 the Bellringer (2026-10-18); 3-10 is the boss |

Zone 1 follows Jakub's working notes (DESIGN_DECISIONS.md 5.3), which are not locked: the stage texts quote them (contact, the settlement, escalation, the turning point, leaving). Its enemies are copies of the two champions, standing in for the warriors of both worlds until enemies are designed. Zone 2 (a jungle ruin in Court of Root territory, its battle background painted on Jakub's brief: DESIGN_DECISIONS.md 5.4b) has its node in the jungle, its background and ten placeholder stages Jakub asked for to test the area in game (2026-10-13): their texts quote the arc of his notes (approach, arrival, the contest, the outcome), their enemies are copies of the roster's champions (the Follower, the Court of Root's only one, in eight of them), 2-1 brings the Walking Bush, 2-2 the Wild Speaker, and 2-3 to 2-9 the seven Elites of 2026-10-17; texts, enemies, powers and the recruits are stand-ins. Zone 3, the Moonlit Basin, was named and described by Jakub on 2026-10-17 (DESIGN_DECISIONS.md 5.6): its node stands in the sunken basin east of the grove, its battle background is a night under the moon, and its ten placeholder stages (my addition, so the background can be seen in game) walk his description from the grove's roots to the eastern hills, their enemies copies of the roster's champions; 3-1 brings the Skeleton, 3-2 the Rot Hulk and 3-3 the Bellringer; texts, enemies, powers and the recruits are stand-ins. The world map follows his briefs (DESIGN_DECISIONS.md 5.4a): a rift in the west, the reach, the river and the forest of the grove, and since 2026-10-17 the basin under its own night and the eastern hills along the east edge.

## 4. The save: the Master Archivist and the Reliquary

The Master Archivist (`src/game/archivist.ts`) is the player and their save, stored in `localStorage` under `tlrol.save.v3`; every access is guarded so the game runs without storage.

| Field | Meaning |
| --- | --- |
| `stars` | best stars per stage id |
| `team` | last team, restored in team select and shown on the main menu |
| `read` | Academy chapters read |
| `settings` | default battle speed and auto |
| `reliquary` | the champions owned, starters included |

The Reliquary (`src/game/reliquary/`) holds one Hero Soul File per owned champion, with its NEW badge (recruited, not yet opened on the champion page) and its Weaver Matrix of six slots, and the loose Thread Spools. The Weaver Matrix has its approved slots (named by Jakub: Zenith, East Meridian, East Horizon, Nadir, West Horizon, West Meridian), grades, strands, attunement and his eight core Weave Patterns ([MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 14) and shows on the champion page's MATRIX tab. Spools have no sources yet, so the stock stays empty in play; `?spools=1` adds a sample for development.

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
| Battle | `screens/battle.ts` + `view/scene.ts` | `?screen=battle&stage=1-3&team=captain_gareth,rime_scholar` |
| Collection | `screens/collection.ts` | `?screen=collection` |
| Champion page | `screens/champion.ts` | `?screen=champion&champion=captain_gareth` |
| Academy | `screens/academy.ts` | `?screen=academy&chapter=debuffs` |
| Options | `screens/options.ts` | `?screen=options` |
| Recruit ceremony | `screens/recruit.ts` | `?screen=recruit&champion=rime_scholar` |
| Skill demo | `screens/battle.ts` (demo mode) | `?demo=iron_blow` |

All navigation goes through `app.router` (`src/main.ts`), which wraps each switch in a dithered dissolve. `?unlockall=1`, `?reset=1` and `?spools=1` change the save before the first screen opens.
