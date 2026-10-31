# Game Structure

How the content of The Loom: Reliquary of Legends fits together: champions and their categories, the campaign, combat backgrounds, the Academy, the player's save and the screens that present them. Rules of combat: [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md). Pixels: [ART_GUIDE.md](ART_GUIDE.md). Screens: [UI_GUIDE.md](UI_GUIDE.md).

> **Status: Jakub's own content is coming in.** The name and the logo are final: **The Loom: Reliquary of Legends** (code name TLROL), high fantasy with a gothic arcane look. The categories, the factions, the two starting champions and Zone 1 follow his design decisions ([DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)); what he has not designed yet stands in, marked as such below. The engine, the tools and the guardrails stay.

---

## 1. The content model

```
LocationDef ──zone──> ZoneDef (behaviour) + ZoneArt (pixels)
   │
   └─ stages: StageDef ──enemies──> ChampionDef ──skills──> SkillDef x3   (a location is a node on the map; its stages open from it)
                │                        ▲          ▲
                └─recruit────────────────┘          └── summoned at the Wishing Star (every champion but the starter and 1-1's)
                   (1-1's first clear brings the Rime Scholar)
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
| Rarity | Common, **Elite**, **Heroic**, **Mythic** | the stat budget (`norms.ts`, the proof of concept's budgets carried over), the card frame color and, since 2026-10-25, the odds in a summon (70 / 25 / 5%, his); what else rarity gates is not decided |
| Affinity | **Ember**, **Bloom**, **Tide** | Ember > Bloom > Tide > Ember; a strong hit deals +20% damage and a weak hit -20% (the proof of concept's rule: the mechanism is not decided) |
| Role | Tank, Damage, Support | how the budget is spent and what the kit does; whether roles are mechanical is not decided |
| Faction | Azure Crown, Sanguine Dominion, Court of Root, Ashveil Reign | story and standard (the medallion on cards and pages, named on the champion page's lore tab); no mechanics. Standards: a gold crown on blue, a red hexagon on black, a brown paw on green, a white bone across a dark grey |

The roster today:

| Champion | Rarity | Affinity | Role | Faction | How you get them |
| --- | --- | --- | --- | --- | --- |
| Captain Gareth (`captain_gareth`) | Elite | Ember | Damage | Azure Crown | starter |
| Rime Scholar (`rime_scholar`) | Elite | Tide | Support | Sanguine Dominion | after the first battle (clear 1-1): the only champion a stage brings |
| Follower (`follower`) | Common | Tide | Damage | Court of Root | summoned |
| Skirmisher (`skirmisher`) | Common | Bloom | Damage | Azure Crown | summoned |
| Dominion Medic (`dominion_medic`) | Common | Tide | Support | Sanguine Dominion | summoned |
| Lineholder (`lineholder`) | Common | Tide | Tank | Azure Crown | summoned |
| Bloodhound (`bloodhound`) | Common | Ember | Tank | Sanguine Dominion | summoned |
| Quartermaster (`quartermaster`) | Common | Bloom | Support | Azure Crown | summoned |
| Enforcer (`enforcer`) | Common | Ember | Damage | Sanguine Dominion | summoned |
| Walking Bush (`walking_bush`) | Common | Bloom | Tank | Court of Root | summoned |
| Wild Speaker (`wild_speaker`) | Common | Ember | Support | Court of Root | summoned |
| Jungle Herder (`jungle_herder`) | Elite | Bloom (a stand-in) | Tank | Court of Root | summoned |
| Associate (`associate`) | Elite | Ember (a stand-in) | Support | Azure Crown | summoned |
| Emissary Handlings (`emissary_handlings`) | Elite | Tide (a stand-in) | Tank | Azure Crown | summoned |
| Black Rhino (`black_rhino`) | Elite | Bloom (a stand-in) | Tank | Sanguine Dominion | summoned |
| Red Cloak (`red_cloak`) | Elite | Bloom (a stand-in) | Damage | Sanguine Dominion | summoned |
| Grove Keeper (`grove_keeper`) | Elite | Tide (a stand-in) | Support | Court of Root | summoned |
| Big Ears (`big_ears`) | Elite | Ember (a stand-in) | Damage | Court of Root | summoned |
| Skeleton (`skeleton`) | Common | Tide | Damage | Ashveil Reign | summoned |
| Rot Hulk (`rot_hulk`) | Common | Ember | Tank | Ashveil Reign | summoned |
| Bellringer (`bellringer`) | Common | Ember | Support | Ashveil Reign | summoned |
| Necromancer (`necromancer`) | Elite | Bloom | Support | Ashveil Reign | summoned |
| Automated Soul (`automated_soul`) | Elite | Tide | Damage | Ashveil Reign | summoned |
| Irving Wellbington (`irving_wellbington`) | Elite | Bloom | Tank | Ashveil Reign | summoned |
| Paladin (`paladin`) | Heroic | Ember | Tank | Azure Crown | summoned (the reward of a quest line Jakub designs later) |
| Chief Engineer CJ (`chief_engineer_cj`) | Heroic | Bloom | Tank | Sanguine Dominion | summoned |

Names, looks and kits are Jakub's Starter Heroes record (DESIGN_DECISIONS.md 8): Gareth's Line Cut, Iron Blow and Wide Sweep, no passive; the Rime Scholar's Pale Strike and Rimebind, no A3, and the passive Cold Rebuke. The Skirmisher is his brief of 2026-10-11 (DESIGN_DECISIONS.md 12): one A1 that always hits twice. The Lineholder is his brief of the same day (DESIGN_DECISIONS.md 13): Guard Cut, and Brace, DEF Up on himself for 2 turns. The Quartermaster is his brief of 2026-10-12 (DESIGN_DECISIONS.md 14): a plain A1, and an A2 that heals every ally by 15% of his max HP, then lends 15% Turn Meter to the ally lowest on HP. The Enforcer is his brief of the same day (DESIGN_DECISIONS.md 15): a plain A1, and the passive Keen Edge, +10% C.RATE in every battle, extra to his stats and not shown with them outside battle. The Bloodhound is his brief of the same day too (DESIGN_DECISIONS.md 16), the first champion on four legs: a plain A1, and an A2 that puts Taunt on himself for 1 turn, cooldown 4. The Dominion Medic is his brief of the same day (DESIGN_DECISIONS.md 17): one skill, an A1 that heals every ally by 10% of his max HP and strikes nobody. The Follower is his brief of 2026-10-13 (DESIGN_DECISIONS.md 18), the Court of Root's first champion and the second on four legs, a grey wolf: an A1 on one enemy, and an A2 on one enemy with a 50% chance of DEF Down for 2 turns, cooldown 4. The Walking Bush is his brief of the same day (DESIGN_DECISIONS.md 19), a small weak ent grown from a bush: an A1 on one enemy, and an A2 that gives DEF Up for 1 turn to himself and one chosen ally, cooldown 3. The Wild Speaker is his brief of the same day too (DESIGN_DECISIONS.md 20), a tattooed man with a long stick and two green ribbons at its head: an A1 on one enemy, and an A2 on one enemy with, after the hit, a 50% chance of ATK Down for 2 turns, cooldown 4. The four Elites are his proposals of 2026-10-17 (DESIGN_DECISIONS.md 21-24; he sets their affinities later): the Jungle Herder, a hunchbacked herder of the Court of Root with a crook and a bell at his belt: an A1 on one enemy, an A2 of Taunt for 1 turn and Counterattack for 2 on himself, and the passive Herder's Ward, a Shield of 10% of his max HP at the end of every second turn of his on the ally with the lowest max HP; Emissary Handlings, a proud banner-bearer of the Azure Crown: Banner Strike with a 20% chance of Stun, Rallying Standard, DEF Up on all allies for 2 turns, cooldown 5, and the passive Unbroken Flag, a 50% chance of a Shield of 15% of his max HP on an ally an enemy has struck; Red Cloak, a bald knight of the Sanguine Dominion in plate with a red cloak and a silver zweihander: an A1, Crimson Blade with a 50% chance of Burn for 2 turns, and an A3 that gives every ally SPD Up for 2 turns; Big Ears, a small big-eared creature of the Court of Root with a blowpipe: an A1 with a 35% chance of Poison, Dart Volley on every enemy with Heal Block for 2 turns, cooldown 5, and the passive Hidden in the Undergrowth, +15% C.RATE for each fallen ally, up to +30% (his face made more animal and his ears smaller and curved on Jakub's word the same day). Three more Elites are his proposals of the same day (DESIGN_DECISIONS.md 25-27; their affinities are not set): the Associate, a woman mage of the Azure Crown in an azure robe with a staff of white motes: an A1 with a 50% chance of ATK Down for 1 turn, an A2 of SPD Up for 2 turns and ATK Up for 1 on all allies, cooldown 5, and the passive Bitter Motes, a 35% chance of Poison for 1 turn on an enemy whose attack hits her; the Black Rhino, a great black bull of the Sanguine Dominion with prosthetic tusks and a red X painted on his back: an A1 with a 20% chance of Stun, an A2 of DEF Up for 2 turns on all allies and Counterattack for 2 on himself, cooldown 5, and the passive Thick Hide, a Shield of 10% of his max HP on himself after every enemy attack that hits him; the Grove Keeper, an old druid of the Court of Root with antlers: an A1 that heals him by 7% of his max HP, an A2 that removes every debuff from one ally, cooldown 3, and the passive Keeper's Balm, a 35% chance of Regen for 1 turn on an ally an enemy debuffs. The Skeleton is his brief of 2026-10-18 (DESIGN_DECISIONS.md 28), the Ashveil Reign's first champion, a short skeleton with a rusty sword and strips of cloth round his neck: a plain A1, and the passive Bare Bones, +20 RES in every battle, extra to his stats and not shown with them outside battle. The Rot Hulk is his brief of the same day (DESIGN_DECISIONS.md 29), the Reign's second, a big, fat abomination of patched flesh: one skill, an A1 on one enemy with a 25% chance of Poison for 2 turns. The Bellringer is his brief of the same day too (DESIGN_DECISIONS.md 30), the Reign's third, a very tall skeleton with no jaw and a golden bell fixed to his arm: one skill, an A1 that shields one ally by 10% of his max HP for 1 turn and heals him by 10% of his max HP, and the passive Last Peal, DEF Up for 2 turns the first time he drops below 50% HP. The Necromancer is his brief of the same day too (DESIGN_DECISIONS.md 31), the Reign's first Elite, a man in a black robe and hood with a book of the dead in one hand and black motes circling the other: an A1 on one enemy with a 35% chance of Slow for 1 turn, an A2 on one enemy that places Poison for 2 turns and SPD Up on all allies for 2 turns, and an A3 that raises one fallen ally, chosen at random, with 30% of its max HP. The Automated Soul is his brief of the same day too (DESIGN_DECISIONS.md 32), the Reign's second Elite, an archer skeleton with no head in shiny azure and gold plate, with a wooden longbow: an A1 on one enemy, an A2 on all enemies that places DEF Down on them for 2 turns, and an A3 that places ATK Up on him for 2 turns before it strikes one enemy, then Stuns it for 1 turn. Irving Wellbington is his brief of the next day (DESIGN_DECISIONS.md 33), the Reign's third Elite, a dwarf skeleton with a big horned helmet and a robust round shield cut with runes: an A1 with a 35% chance of Slow for 1 turn, an A2 that places DEF Up for 2 turns and Counterattack for 1 on himself, and the passive Old Grudge, Taunt for 1 turn and a heal of 20% of his max HP when an enemy's critical hit leaves him standing. The Paladin is his brief of 2026-10-24 (DESIGN_DECISIONS.md 34), the Azure Crown's sixth champion and the roster's first Heroic, Ember (Tide in the brief, Ember on his word the same day), the reward of a quest line he designs later: a tall young knight in silver plate with wide ornate pauldrons, a long dark-blue cloak with three white crowns, bareheaded and blonde, a big Swiss-shaped shield with a double cross and a wide, very bright sword with animated flames: an A1 on one enemy with ATK Down for 1 turn, an A2 that places DEF Up on all allies and Slow on all enemies for 2 turns with no damage and fills his own turn meter by 35%, an A3 that places Taunt for 2 turns and Regen for 3 on him, then strikes all enemies, and the passive Unbowed, +50 RES in battle, the first champion with three skills and a passive. Their stats and the numbers in their skills are stand-ins ([MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 9). A champion has one to three skills; a save whose champions no longer exist (the stand-ins `azure_warrior` and `sanguine_support`) keeps its progress, regains the champions its cleared stages bring and starts its team over from the starters. Since 2026-10-25 every champion but the starter and the Rime Scholar is summoned ([MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 16); a save keeps every champion it already has.

## 3. The campaign (`src/game/data/campaign.ts`)

- A **location** is an area: one **campaign node** on the world map (its `map` position; the landmark is drawn above it), a combat background for its stages and an optional `requires` stage that opens it. Choosing the node opens its **stage list**: every stage with its stars, lock or boss crown, and for the selected stage its story, enemies, power, reward and the way into team select. Stages have no place on the map of their own and no names: a stage is its id (`1-3`). An area whose stages are not designed yet has a node and no stages.
- A **stage** lists up to three enemies in formation order (front, back-top, back-bottom), a `power` multiplier for their HP and ATK, an optional boss flag per enemy (x1.6 HP, a crown), a map position (world pixels, see below) and the champion its first clear brings (`recruit`), who need not be among its enemies: the second champion joins after the first battle without being fought there. Since summoning (2026-10-25) only 1-1 has one.
- A stage opens when the previous stage of its location is cleared; the first stage of a location opens when the location does.
- Difficulty follows the curve in [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) section 10; tune `power` with `npm run balance`.
- The **world map** is `WORLD_MAP` (1600x360, two and a half screens wide and one tall, growing east area by area: ART_GUIDE.md 10; the overview two and a half times smaller fills the screen's width, so a wider map needs a smaller overview): the campaign is a line of areas crossed from left to right (DESIGN_DECISIONS.md 5.1). Location `map` positions are in its pixels. The campaign screen scrolls it under a camera: drag to move (a click fires on release), Left and Right step between areas in campaign order and the camera keeps the focused node in view, `W` `A` `S` `D` or `Shift` + arrows slide it, and `M` (or WHOLE MAP) shows the overview, the same world drawn at half the size on one screen; clicking the overview goes there. Coming back from team select or a battle opens the stage list on that stage.

| Location | Zone | Stages |
| --- | --- | --- |
| I. Fracture Reach | `zone1` | 1-1 to 1-10 (1-1 brings the Rime Scholar; 1-10 is the boss) |
| II. Verdant Grove (after 1-10) | `zone2` | 2-1 to 2-10, placeholders to test the area (2026-10-13); 2-10 is the boss |
| III. Moonlit Basin (after 2-10) | `zone3` | 3-1 to 3-10, placeholders so the area can be played (2026-10-17); 3-10 is the boss |
| IV. Earth Scars (after 3-10) | `zone4` | 4-1 to 4-10, placeholders Jakub asked for (2026-10-18); 4-10 is the boss |
| V. Snowy Mesa (after 4-10) | `zone5` | 5-1 to 5-10, placeholders Jakub asked for (2026-10-19); 5-10 is the boss |

Every victory finds Stardust for the Wishing Star as well as spools ([MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 14, 16). Until 2026-10-25 the stages of Zones 1 to 5 brought the champions one by one (1-4 to 1-10, 2-1 to 2-9, 3-1 to 3-3, 4-1 to 4-3, 5-10); now they are summoned.

Zone 1 follows Jakub's working notes (DESIGN_DECISIONS.md 5.3), which are not locked: the stage texts quote them (contact, the settlement, escalation, the turning point, leaving). Its enemies are copies of the two champions, standing in for the warriors of both worlds until enemies are designed. Zone 2 (a jungle ruin in Court of Root territory, its battle background painted on Jakub's brief: DESIGN_DECISIONS.md 5.4b) has its node in the jungle, its background and ten placeholder stages Jakub asked for to test the area in game (2026-10-13): their texts quote the arc of his notes (approach, arrival, the contest, the outcome), their enemies are copies of the roster's champions (the Follower, the Court of Root's only one, in eight of them); texts, enemies and powers are stand-ins. Zone 3, the Moonlit Basin, was named and described by Jakub on 2026-10-17 (DESIGN_DECISIONS.md 5.6): its node stands in the sunken basin east of the grove, its battle background is a night under the moon, and its ten placeholder stages (my addition, so the background can be seen in game) walk his description from the grove's roots to the eastern hills, their enemies copies of the roster's champions; texts, enemies and powers are stand-ins. Zone 4, Earth Scars, was named and described by Jakub on 2026-10-18 (DESIGN_DECISIONS.md 5.7): its node stands on the steppe between the two ravines east of the eastern hills, its battle background is the steppe by day, and its ten placeholder stages (his request) walk his description from the ravines to the zeppelin, their enemies copies of the roster's champions; texts, enemies and powers are stand-ins. Zone 5, the Snowy Mesa, was named and described by Jakub on 2026-10-19 (DESIGN_DECISIONS.md 5.8): its node stands on the arbiter's mesa beyond the brink of Earth Scars, its battle background is the snowy top of a tabletop mountain before sunset, and its ten placeholder stages (his request) walk his description from the mesa's top to the arbiter, their enemies copies of the roster's champions; texts, enemies and powers are stand-ins. The world map follows his briefs (DESIGN_DECISIONS.md 5.4a): a rift in the west, the reach, the river and the forest of the grove, since 2026-10-17 the basin under its own night and the eastern hills, since 2026-10-18 the steppe beyond their crest with its two ravines, and since 2026-10-19 the gulf of cloud beyond the steppe's brink with the snowy mesas rising out of it.

## 4. The save: the Master Archivist and the Reliquary

The Master Archivist (`src/game/archivist.ts`) is the player and their save, stored in `localStorage` under `tlrol.save.v3`; every access is guarded so the game runs without storage.

| Field | Meaning |
| --- | --- |
| `stars` | best stars per stage id |
| `team` | last team, restored in team select |
| `read` | Academy chapters read |
| `settings` | default battle speed and auto |
| `reliquary` | the champions owned, starters included |
| `tutorial` | `todo` (never finished), `skipped` or `done`; a save without it reads `todo` |
| `claimed` | the Journey's quests claimed, in order (only a prefix of the Journey is kept on load) |
| `fragments`, `shards` | Stardust found and not merged, Soulstars merged and not spent (summoning, [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 16); never below 0 |
| `wish` | the faction and role wished for at the Wishing Star (either may be absent; unknown ones are dropped on load) |
| `summons` | champions summoned so far |
| `lessons` | the tutorial's later lessons shown or closed (`summon`: the first summon) |

A save from before 2026-10-25 reads none of the last five: no Stardust, no Soulstar, no wish, no summons, no lessons.

The Reliquary (`src/game/reliquary/`) holds one Hero Soul File per owned champion, with its NEW badge (recruited, not yet opened on the champion page) and its Weaver Matrix of six slots, and the loose Thread Spools. The Weaver Matrix has its approved slots (named by Jakub: Zenith, East Meridian, East Horizon, Nadir, West Horizon, West Meridian), grades, strands, attunement and his eight core Weave Patterns ([MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 14) and shows on the champion page's MATRIX tab. Spools drop from every campaign stage, of the two Weave Patterns its area holds ([MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 14), and are kept in Weaving; a new find keeps its NEW badge in the save until it is looked at. `?spools=1` adds a sample for development, once however often the link is opened.

Loading drops champion and stage ids the catalog no longer has, and gives every cleared stage's champion its soul file (so a save survives a stage that changes what it brings). An older save (`tlrol.save.v2` from before Jakub's content, or the proof of concept's `oathbound.profile.v1`) holds champions and stages that no longer exist: only its settings and the Academy chapters read carry over, once, into a new game, and the old entry is left in place.

A new account (`tutorial` still `todo` and no stage cleared, `tutorialDue`) meets the tutorial on the main menu ([UI_GUIDE.md](UI_GUIDE.md) 4); it is finished by its first victory, which is the Journey's first quest ([MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 15).

Helpers: `stageOpen`, `locationOpen`, `frontier` (the newest playable stage), `recordVictory` (stars, first-clear recruit, the spools and the Stardust found), `recordClear` (stars and recruit without spools or Stardust: `?progress=`), `spoolsHeld`, `stockSample` (`?spools=1`), `isFresh`, `unlockEverything` (Options, demo use). Summoning's (`src/game/summoning.ts`): `summonPool`, `rarityOdds`, `summonChances`, `wishChance`, `drawSummon`, `mergeShard`, `summon`, `summonsReady`, `joinsBy`, `summonLessonDue`.

## 5. Screens and flow

```
            ┌─────────────────────────── Main menu ───────────────────────────────────┬──────────────┐
            │            │               │              │             │             │              │
        Campaign     Champions        Weaving        Academy       Options     Challenges      Summon (the Wishing Star)
        (world map)  (collection)     (spools)       (chapters) ─── See it ──> skill demo in the arena    MERGE, wish, SUMMON
                                         ^                                       Daily, Persistent,        │
                                         └──── OPEN WEAVING (a quest's way) ──── Journey: CLAIM ──>   ceremony ──> back to the star
                                                                                 (TO THE WISHING STAR)
            │            │               │
       stage list    champion page <─────┘  a woven spool's champion; the MATRIX
            │                               tab's "+N more" opens Weaving on its slot
       Team select
            │
         Battle ── pause: resume / auto / speed / retreat
            │
         Results ── victory: stars, Stardust and spools found, 1-1's recruit ──> Recruit ceremony ──> Campaign
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
| Weaving | `screens/weaving.ts` | `?screen=weaving` |
| Academy | `screens/academy.ts` | `?screen=academy&chapter=debuffs` |
| Options | `screens/options.ts` | `?screen=options` |
| Challenges | `screens/challenges.ts` | `?screen=challenges&tab=daily` (opens on the Journey) |
| Recruit ceremony | `screens/recruit.ts` | `?screen=recruit&champion=rime_scholar` (also a summon's ceremony) |
| Summon (the Wishing Star) | `screens/summon.ts` | `?screen=summon` (`&stardust=250`, `&soulstars=2` set what the save holds) |
| Skill demo | `screens/battle.ts` (demo mode) | `?demo=iron_blow` |

The main menu is the Sanctum (`src/game/view/sanctum.ts`, art `tools/art/sanctum.ts`): the island under the broken Loom, whose places are the menu: the Starbridge Gate (campaign), the Reliquary (champions), the Weaver's Spire (Weaving), the Observatory (Academy), the astrolabe (options), the Herald's Board (Challenges) and, in its sky, the Wishing Star (summoning); a few owned champions, a different few each visit, stand on its plaza ([UI_GUIDE.md](UI_GUIDE.md) 4).

All navigation goes through `app.router` (`src/main.ts`), which wraps each switch in a dithered dissolve. `?unlockall=1`, `?reset=1`, `?spools=1`, `?stardust=<n>` and `?soulstars=<n>` change the save before the first screen opens.
