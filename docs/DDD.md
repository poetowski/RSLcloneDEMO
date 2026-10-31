# Domain Model (DDD)

How the domain of The Loom: Reliquary of Legends (code name TLROL) is cut into bounded contexts, what every term means and which identifier carries it, which objects own which rules, which invariants must always hold and what enforces them, and how to extend the model without breaking it. [MDA.md](MDA.md) says what the game must make the player feel; this document says how the code must stay shaped so that it keeps doing so, iteration after iteration.

Companion guides: [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) (the rules), [GAME_STRUCTURE.md](GAME_STRUCTURE.md) (content and screens), [ART_GUIDE.md](ART_GUIDE.md), [UI_GUIDE.md](UI_GUIDE.md).

Snapshot: commit `8dd9a26`, 2026-10-06. Every dependency rule in section 8 and every "true today" in section 6 was checked against that commit. The save, the Reliquary and their rules (sections 2.3, 2.6, 3, 4.4, 4.7, 6.3, 6.5, 8) were checked again on 2026-10-08, the gear system and the DEF and crit rules on 2026-10-10, and the content from Jakub's design decisions ([DESIGN_DECISIONS.md](DESIGN_DECISIONS.md): the categories, the factions, the two starting champions, Zone 1; sections 2.2, 2.3, 2.5, 2.7, 6.2, 6.3, 9, 10) the same day.

---

## 1. The domain

**Core domain:** a turn-meter battle whose outcome is decided by readable, data-defined kits, and which is shown as frame-accurate pixel-art choreography. Everything else exists to feed it content, to present it, or to keep it honest.

| Subdomain | Type | Why it matters | Code |
| --- | --- | --- | --- |
| Combat resolution | core | the heart of play; must stay pure, deterministic and tested | `src/game/battle/` |
| Content design: kits, stages, norms | core | the game's variety lives in the kits; the norms hold their quality | `src/game/data/`, `norms.ts`, `tools/balance.ts` |
| Battle presentation | core (experience) | turns rule events into spectacle ([MDA.md](MDA.md) AE2) | `src/game/view/` |
| Procedural art | supporting, strategic | the entire look, generated and versioned | `tools/art/`, `public/assets/` |
| Progression and collection | supporting | the summoning loop, stars, unlocks | `src/game/archivist.ts`, `src/game/reliquary/`, `campaign.ts`, `src/game/screens/` |
| Growth: the Weaver Matrix | supporting | how champions grow through gear; outline approved, content not yet | `src/game/reliquary/`, `src/game/data/matrix.ts` |
| Teaching (the Academy) | supporting | learnability ([MDA.md](MDA.md) AE4) | `codex.ts`, `screens/academy.ts` |
| Quality tooling | supporting | the guardrails | `tests/`, `tools/balance.ts`, `tools/art/audit.ts`, `tools/shots.ts` |
| Engine and UI kit | generic | canvas scaling, game clock, font, particles, immediate-mode UI | `src/engine/`, `src/game/ui/` |
| Persistence | generic | the save game | `archivist.ts` (`localStorage`) |

## 2. Ubiquitous language

One word, one meaning, inside a context. Use these words in code, docs, commit messages and conversation.

### 2.1 Combat

| Term | Meaning | In code |
| --- | --- | --- |
| Battle | one fight between two teams, from the first meter fill to a winner | `Battle` (aggregate root) |
| Team | player (left) or enemy (right) | `TeamId` |
| Formation slot | 0 front, 1 back-top, 2 back-bottom; feet positions fixed in every zone | `Unit.slot`, `SPAWNS` (`tools/art/zones/shared.ts`) |
| Combatant | a champion entering a battle, optionally as a boss | `Combatant` |
| Unit | a champion inside one battle, identified by team and slot (`p0`-`p2`, `e0`-`e2`) | `Unit` |
| Turn meter (TM) | 0-100 gauge that fills with Speed; at 100 the unit acts | `Unit.tm`, `TURN_FULL` |
| Turn | one unit's chance to act: start-of-turn ticks, at most one skill, end-of-turn ticks. The HUD counter "Turn N" counts every unit's turns | `advance`, `startTurn`, `endTurn`, `Battle.turn` |
| Action | the skill used in a turn and everything it caused, counterattacks included | `SkillResult` |
| Skill, slot | A1 (basic), A2 (special), A3 (signature) | `SkillDef`, `SkillDef.slot` |
| Cooldown | the number of its own turns before a skill is ready again | `SkillDef.cooldown`, `Unit.cooldowns` |
| Hit | one damage instance of a skill against every target; one per hit frame of the animation | `HitDef`, `BattleEvent.hit` |
| Multiplier | the ATK factor of a hit; a skill's total multiplier is the sum over its hits | `HitDef.mult`, `totalMult` |
| Status | a buff or debuff with a duration in the holder's own turns | `StatusId`, `StatusDef`, `StatusInst` |
| Fresh status | a status placed during its holder's own turn (a self-buff, a Rebuke's Freeze on the attacker); it starts counting at the holder's next turn | `StatusInst.fresh`, `Battle.acting` |
| Status application | the rule that places a status: chance, turns, recipients, value, per hit | `StatusApp` |
| RESIST | a debuff whose chance roll failed | `resist` event |
| Shield | absorbs damage before HP; its value is a fraction of the caster's max HP | `shield`, `StatusInst.value` |
| Strong / weak hit | ±20% damage from the affinity cycle | `affinityEdge`, `edge` |
| Execute | bonus multiplier against targets below an HP fraction | `SkillDef.execute` |
| Dispel | removes every buff from the targets before the first hit | `stripBuffs`, `dispel` event |
| Cleanse | removes one debuff from each ally on the last hit; a full cleanse removes every debuff from the skill's targets (Cleansing Rite: one ally) | `cleanse`, `cleanseAll` |
| Self-heal | a blow that heals its user by a share of its own max HP on the last hit (Thornburst) | `healSelf` |
| Lifesteal | heals the actor by a fraction of the HP damage dealt | `lifesteal` |
| Heal | restores HP, never past the maximum: a share of each ally's own max HP, or of the healer's | `healAllies`, `healOf`, `heal` event |
| Turn meter boost / drain | adds to the other allies' meters or to the one lowest on HP after the heals, or takes from the targets' | `tmAllies`, `tmLowestAlly`, `tmTargets`, `tm` event |
| Kept meter | the actor ends its turn with this meter instead of 0 (the Paladin's Beacon: 35%, shown over him as `+35% TURN` as his turn ends) | `selfTm`, `Unit.pendingTm` |
| Purge | a passive that, at the start of its holder's turn, lifts one random debuff from every ally (Chief Engineer CJ's Master's Eye) | `PassiveDef.kind: 'purge'`, `Battle.purge` |
| Brace | a passive that gives its holder statuses at the start of its turn (the Forest Gargoyle's Heartwood) | `PassiveDef.kind: 'brace'`, `Battle.brace` |
| Immune | a passive naming one debuff that never lands on its holder (Dead Knight Amstron's Unbreached Plate) | `PassiveDef.kind: 'immune'`, `immuneTo` |
| Counterattack | the `counter` status, and the A1 it answers with | `counter`, `SkillResult.counter` |
| Passive | a rule that wakes by itself: Undying, Overdrive, Rebuke (answers a critical hit below a threshold, then rests); a tend (Herder's Ward: at the end of its holder's turn the ally with the lowest max HP gets a Shield, then it rests); a ward (Unbroken Flag: an ally an enemy struck may get a Shield after the hit; Thick Hide, a ward of its holder alone, `self`, after every hit); a retaliation (Bitter Motes: a hit on its holder may be answered with Poison on the attacker); a remedy (Keeper's Balm: an ally an enemy debuffs may get Regen); a defy (Old Grudge: a critical hit that leaves its holder standing gives it Taunt and a heal); a stat passive, a stat raised in every battle (Keen Edge, C.RATE +10%; Bare Bones, RES +20: extra to the budget, outside battle only its text); or a fallen passive, a stat raised for each fallen ally up to a cap (Hidden in the Undergrowth) | `PassiveDef.kind`, `PassiveDef.cooldown`, `PassiveDef.stat`, `PassiveDef.chance`, `PassiveDef.max`, `PassiveDef.self`, `PassiveDef.fx`, `PassiveDef.holderFx`, `battleStats`, `Battle.critRate`, `Battle.fallenBonus`, `Unit.revived`, `Unit.overdriven`, `Unit.cooldowns[passive id]` |
| Boss | an enemy slot with x1.6 HP, a crown and an intro | `EnemySlot.boss`, `BOSS_HP` |
| Power | a stage's multiplier on enemy HP and ATK | `StageDef.power`, `BattleOptions.enemyPower` |
| Battle event | one fact the rules produced, for the view to present | `BattleEvent` |
| Decision | a skill and a target, chosen by the player or the AI | `Decision`, `decide` |
| Auto | the AI playing the player's team | `BattleScene.auto` |
| Seed | the number that fixes every roll of a battle | `BattleOptions.seed`, `Rng` |

### 2.2 Catalog and balance

| Term | Meaning | In code |
| --- | --- | --- |
| Champion | the definition of a hero, enemy or boss: identity, stats, kit, lore | `ChampionDef` |
| Kit | a champion's one to three skills and its passive | `ChampionDef.skills`, `.passive` |
| Rarity | Common, Elite, Heroic, Mythic; sets the stat budget and the card frame (what it gates in play is not decided) | `Rarity`, `RARITIES`, `RARITY_BUDGET` |
| Affinity | Ember, Bloom, Tide, a cycle: Ember beats Bloom, Bloom beats Tide, Tide beats Ember (no Void) | `Affinity`, `AFFINITIES`, `affinityEdge` |
| Role | Tank, Damage, Support: how the budget is spent (no fourth role; Control, Bruiser and the like are descriptive tags) | `Role`, `ROLES` |
| Faction | one of four powers: the Azure Crown, the Sanguine Dominion, the Court of Root, the Ashveil Reign; story and standard, no mechanics | `FactionId`, `FACTIONS`, `FactionDef.standard` |
| Standard | a faction's heraldry: the Azure Crown a gold crown on blue, the Sanguine Dominion a red hexagon on black, the Court of Root a brown paw on green, the Ashveil Reign a white bone across a dark grey | `FactionDef.standard`, `emblem_<faction>` |
| Signature hue | the champion's own colour in the UI and its art (Gareth's amber, the Rime Scholar's frost, the Skirmisher's blue leather, the Lineholder's dark-blue shield on charcoal, the Quartermaster's brown leather, the Enforcer's crimson, the Bloodhound's tan, the Dominion Medic's rose, the Follower's wolf grey, the Walking Bush's bark, the Wild Speaker's tattoo teal, the Jungle Herder's russet hide, Emissary Handlings' bright azure, Red Cloak's scarlet, Big Ears' dusky mauve), never its faction's and never its affinity's (affinity is abstract, Jakub 2026-10-11) | `ChampionDef.color`, `ChampionArt.iconBg` |
| Footprint | how long a champion's shadow is, as a share of a standing champion's: a beast on four legs casts a longer one (the Bloodhound and the Follower 1.9, the round Walking Bush 1.3) | `CharDef.footprint`, the atlas json, `UnitView.footprint` |
| Burning blade | where a champion's weapon burns in each frame, from its base to its tip, and how hot: the game lights the air round it and throws embers off it (the Paladin's sword) | `CharDef.glow`, the atlas json `glow`, `drawBladeGlow`, `UnitView.bladePoint` |
| Muzzle | where projectiles leave a ranged champion's sprite | `ChampionDef.muzzle` |
| Approach | how the actor travels before the attack | `Approach` |
| Stat score, budget | weighted stat sum, and its target per rarity (±5%) | `statScore`, `budgetDelta`, `BUDGET_TOLERANCE` |
| Norms | the numeric guardrails for stats, skills and statuses | `norms.ts`, `auditChampion` |
| Impact | win rate of random teams that include a champion | `tools/balance.ts` section 3 |
| Campaign curve | auto win rate of every ownable team against each stage | `tools/balance.ts` section 4 |

### 2.3 Campaign and progression

| Term | Meaning | In code |
| --- | --- | --- |
| Location (area, campaign node) | an area of the campaign: one node on the world map whose stage list opens from it, one zone for its stages, opened by a `requires` stage; it may have no stages yet | `LocationDef`, `CampaignScreen` |
| Stage | one battle of the campaign, called by its id `"<chapter>-<n>"`; stages have no names and no place on the map: they open from their area's node | `StageDef` |
| Recruit, first clear | the first win of a stage brings its champion, fought there or not: since summoning only 1-1's, the Rime Scholar (the second champion joins after the first battle without being fought) | `StageDef.recruit`, `recordClear`, `Reliquary.recruit` |
| Summon | spending a Soulstar at the Wishing Star: a rarity drawn at 70 / 25 / 5% (Common, Elite, Heroic), then a champion of it not yet owned, those the wish names likelier; how every champion but the starter and 1-1's comes | `summon`, `drawSummon`, `summonPool`, `SummonScreen`, `MasterArchivist.summons` |
| Stardust, Soulstar | the summoning currency (names proposed, his to choose): Stardust, the fragments every campaign victory finds; a Soulstar, 100 Stardust merged, spent on one summon | `MasterArchivist.fragments`, `MasterArchivist.shards`, `fragmentDrop`, `mergeShard`, `FRAGMENTS_PER_SHARD` |
| Wish | the faction and role the Archivist hopes for: within the rarity drawn, each part a champion matches makes it twice as likely; never a promise | `Wish`, `MasterArchivist.wish`, `wishWeight`, `wishChance` |
| Wishing Star | the Sanctum's place in the sky where Stardust is merged and champions summoned | `SummonScreen`, the `summon` place of `menu.json` |
| Still scattered | the champions a summon can still bring: not owned, not a starter, brought by no stage | `summonPool` |
| Starters | the champions owned from the start | `STARTERS` |
| Roster | the champions the player owns | `roster()` |
| Collection | every champion, owned or locked | `CollectionScreen` |
| Open / cleared / locked | a stage the player may fight / has won / may not fight yet | `stageOpen`, `cleared` |
| Frontier | the newest playable stage | `frontier()` |
| World map, overview | the campaign map in world pixels (1920x360, growing east area by area), scrolled sideways under a camera: the campaign is a line of areas crossed from left to right; the overview draws the same world on one screen | `WORLD_MAP`, `CampaignScreen` |
| Stars | 3, 2 or 1 by champions lost; the best is kept | `starsFor`, `MasterArchivist.stars` |
| Master Archivist | the player and their save: stars, last team, Academy chapters read, settings, the tutorial's state and lessons, the Journey's claims, the Stardust, Soulstars, wish and summons, and the Reliquary | `MasterArchivist`, `loadArchivist`, `saveArchivist`, `readSave`, `writeSave` |
| Challenges | the main-menu place of quests, in three tabs: Daily and Persistent (placeholders) and the Journey | `ChallengesScreen`, `CHALLENGE_TABS` |
| Journey, quest | quests in an order, each opened by claiming the one before it; a quest has a goal read from the save and a reward; its state is locked, open, ready or claimed | `JOURNEY`, `QuestDef`, `questState`, `claimQuest`, `MasterArchivist.claimed` |
| Tutorial | the guided first visit of a new account: the Sanctum, the campaign, stage 1-1 and its rewards, the Challenges; finished by its first victory (the Journey's first quest), or skipped; and a later lesson, the first summon, once a summon waits | `Tutorial`, `tutorialDue`, `summonLessonDue`, `MasterArchivist.tutorial`, `MasterArchivist.lessons` |
| Fresh (NEW) | recruited or summoned, not yet opened on the champion page | `HeroSoulFile.fresh`, `isFresh`, `Reliquary.markSeen` |

### 2.4 World, presentation and art

| Term | Meaning | In code |
| --- | --- | --- |
| Zone (combat background) | where battles happen: behaviour, art, built layout, runtime renderer | `ZoneDef`, `ZoneArt` (art module), `ZoneJson`, `ZoneView` |
| Home zone | the zone a faction's champions stand in outside battle | `homeZone()` |
| Diorama | a living zone behind a menu, with champions standing in it | `Diorama`, `Figure` |
| Sanctum | the main menu's own diorama: the island under the broken Loom, its places (the Starbridge Gate, the Reliquary, the Weaver's Spire, the Observatory, the astrolabe) clicked to go on, a few owned champions on its plaza | `SanctumView`, `MenuPlace`, `MenuJson` |
| Prop, prop kind | a zone sprite and how it behaves: static, loop, pulse, fire (its own flames or the shared one), bob, drift (across the sky, coming round again), roam (to and fro along its row, an animal grazing at each end); in a layer: far, back, floor, fg | `PropKind`, `PropPlacement` |
| Spark emitter | a line of a zone that sheds sparks (Zone 1's rift) | `SparkEmitter`, `ZoneJson.sparks` |
| Sky flash | a rare moment when a zone's sky lights up in a strange colour (Zone 1's rift, every 10-25 s) | `ZoneDef.flash`, `ZoneView.drawFlash` |
| Ambient | the zone's weather: snow, sand, motes, leaves, pollen, spores, seeds, flurries | `ZoneDef.ambient` |
| Effect (fx) | a named visual sequence: impact, projectile, cast circle, actor flare | `FxDef`, `fx.json`, `FxLayer` |
| Hit frame | the animation frame where a hit lands | atlas `anims.<name>.hits` |
| Animation event | `jump`, `shoot`, `cast` on a frame | atlas `anims.<name>.events` |
| Choreography | how the view plays an action: approach, animation, hits, return | `BattleScene.perform` |
| Unit view | what a unit looks like now: sprite, displayed HP, overlays | `UnitView` |
| Demo | one skill replayed in a loop (Academy "See it", `?demo=`) | `BattleScene.demo` |
| Ramp | a palette row: 6 steps for materials (`MAT`), 5 for effects and the interface (`FXR`, `UIR`); single colours in `ACCENT` and `INK` | `palette.ts` |
| Key light | the single top-left light of every pixel | `LIGHT_DIR` |
| Frame box, pivot | 208x160 frame for every champion frame; feet at (104, 140) | `FRAME_W`, `FRAME_H`, `PIVOT` |
| Atlas | packed frames plus metadata for one champion | `public/assets/champions/<id>.png/.json` |
| Font face | `regular` and `bold` for running text, `display` for titles, names in headers and big numbers, `micro` digits for counters on status icons; one family | `Variant`, `FontJson.faces`, `tools/art/font.ts` |
| Chapter, block, figure (Academy) | a page of the Academy, its parts, a live illustration | `Chapter`, `Block`, `FigureId` |

### 2.5 Homonyms

The same word means different things in different contexts. That is legitimate in DDD, but it must be known.

| Word | Meanings | Rule |
| --- | --- | --- |
| Champion | `ChampionDef` (catalog), `HeroSoulFile` (owned, in the Reliquary), `Unit` (battle), `UnitView` (screen), `Figure` (diorama) | rules code speaks of units; content code of champions |
| `ChampionArt` | the art module (`tools/art/char.ts`) vs the loaded atlas (`src/game/view/assets.ts`) | qualify by context: "art module" vs "atlas" |
| `ZoneArt` | the painter module (`tools/art/zones/shared.ts`) vs the loaded images (`src/game/view/assets.ts`) | same |
| Figure | an Academy illustration (`FigureId`) vs a champion in a diorama (`Figure`) | say "Academy figure" or "diorama figure" |
| Screen | the canvas (`engine/screen.ts`, imported as `Canvas`) vs a route state (`app.ts`) | keep the `Canvas` alias |
| Turn | a unit's turn vs the global counter "Turn N" vs a status duration ("2 turns" of the holder) | a duration always counts the holder's own turns |
| Effect | a visual effect (fx) vs a status effect | say "status" for rules, "effect" or "fx" for visuals |
| Hit | a `HitDef`, a hit frame, the `hit` index of an event | they are one concept seen from three sides and must stay equal in number |
| Power | stage `power` vs balance "impact" vs stat score | never call a stat score "power" |
| Slot | formation slot (0-2, `Unit.slot`), skill slot (A1-A3, `SkillDef.slot`), matrix slot (0-5, `MatrixSlot`) | always say which: formation slot, skill slot, matrix slot |
| Zone | in Jakub's notes a campaign area ("Zone 1", a location with its stages: `LocationDef`) vs in code a combat background (`ZoneDef`, `ZoneArt`) | in code "location" is the area and "zone" the background; Zone 1 is the location `zone1` whose background is the zone `zone1` |
| Archivist | the player in Jakub's premise (a celestial presence that recollects champions) vs `MasterArchivist`, the save | the premise's Archivist is not modelled yet; `MasterArchivist` is the save |

### 2.6 Reliquary and the Weaver Matrix

The language of the final game (approved 2026-10-08). Heroes keep the word *champion*: "Reliquary of Legends" is the game's subtitle, not a rename.

| Term | Meaning | In code |
| --- | --- | --- |
| The Loom: Reliquary of Legends | the game; *The Loom* for short; code name TLROL | `tlrol.save.v3` |
| Master Archivist | the player; in code, the player's save | `MasterArchivist` |
| Reliquary | the vault of everything the archivist owns: one soul file per champion and the loose spools; the aggregate root of both | `Reliquary` |
| Hero Soul File | one owned champion's record: which champion, its NEW badge, its Weaver Matrix | `HeroSoulFile` |
| Weaver Matrix | a champion's gear: six slots in two triangles | `WeaverMatrix` |
| Matrix slot | one of the six, numbered 0 (top) clockwise to 5 and named by Jakub: Zenith, East Meridian, East Horizon, Nadir, West Horizon, West Meridian; holds at most one spool | `MatrixSlot`, `SlotIndex`, `SLOT_NAMES` |
| Stat node | a slot's rule for a spool's main stat: fixed (one stat) or variable (one of a list) | `StatNode` |
| Matrix layout | the six stat nodes, the same for every champion: flat ATK, DEF and HP fixed in Zenith, East Horizon and West Horizon; East Meridian SPD or a base stat in %, Nadir C.RATE, C.DMG or a %, West Meridian ACC, RES or a % | `MatrixLayout`, `MATRIX_LAYOUT` |
| Fixed slot, choice slot | the two triangles: a fixed slot takes one stat, a choice slot one of a list | `StatNode.kind` |
| Thread Spool | a piece of gear: a pattern, a grade, a main stat and strands; a value, never changed in place | `ThreadSpool`, `threadSpool()`, `rollSpool()`, `sameSpool()` |
| Grade | Ashen, Silver or Gilded: sets the main value and the number of strands | `Grade`, `GRADES`, `MAIN_VALUE`, `STRAND_COUNT` |
| Main stat | the spool's stat that decides the slots it fits; its value follows the grade | `ThreadSpool.main`, `SpoolStat` |
| Strand | an additional stat on a spool, rolled once in its grade's range | `ThreadSpool.strands`, `STRAND_RANGE` |
| Attunement | a choice slot's bond to the fixed stats beside it; a strand of that stat gains +1 there | `attunedStats`, `strandValue`, `ATTUNE_BONUS` |
| Woven stats | a champion's stats with its matrix, the stats it brings to battle | `wovenStats`, `matrixBonus`, `battleStats` |
| Stock | the spools in the Reliquary that sit in no slot | `Reliquary.spools()`, `Reliquary.entries()` |
| Weaving | the main-menu section that stores the spools (Jakub, 2026-10-24; first called Weaving Storage): every spool held, loose or woven, as cards in groups by pattern; choosing, weaving, taking out, unravelling | `WeavingScreen` (`screens/weaving.ts`) |
| New find | a spool a victory found that nobody has looked at yet: its NEW badge in Weaving and on Weaving's menu button | `StockEntry.fresh`, `markSpoolSeen`, `markStockSeen`, `freshCount` |
| Drop | the spools a campaign victory finds: each of one of its area's two Weave Patterns, its grade by the stage, its main stat by slot | `rollDrops`, `gradeOdds`, `rollMainStat`, `DROPS`, `LocationDef.patterns`, `recordVictory` |
| Unravel | to remove a loose spool for good | `Reliquary.unravel` |
| Weave Pattern | a set bonus woven by 2 or 4 spools of one pattern, wherever they sit: Jakub's eight core patterns, each 2-piece and adding one stat (Pulse SPD, Sunder ATK, Ward DEF, Vigor HP, Needle C.RATE, Apex C.DMG, Focus ACC, Tranquility RES) | `WeavePatternDef`, `CORE_WEAVE_PATTERNS` |
| Woven | a pattern complete in a matrix, and how many times (6 spools of a 2-piece pattern: 3 times) | `WovenPattern`, `WeavePatternEvaluator` |
| Spindle of Fate | a seventh, central piece of gear (Jakub, 2026-10-24); a placeholder until its system is made, with no code yet | - |

### 2.7 The world (Jakub's premise)

The language of [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) section 1. None of it is modelled in code yet beyond the names it gives to content.

| Term | Meaning | In code |
| --- | --- | --- |
| The loom | a celestial divine loom whose breaking, at a time nobody knows, broke reality across dimensions, space and time | - |
| The broken realm | the world after the break: floating islands, places and worlds connected that would never meet | the world map (`tools/art/map.ts`) |
| Archivist | the player, more celestial than physical, who collects and reconstructs champions to repair the loom | `MasterArchivist` (the save) |
| Recollection | the central verb: champions are fragmented souls of legendary champions, collected and reconstructed | `HeroSoulFile` (the record of one) |
| World (of a faction) | the Azure Crown and the Sanguine Dominion come from separate worlds and meet only where the loom connects them | `FactionDef.desc` |
| Starter, second champion | Captain Gareth of the Azure Crown, there from the start, and the Rime Scholar of the Sanguine Dominion, who joins after the first battle (DESIGN_DECISIONS.md 8) | `captain_gareth`, `rime_scholar`, `STARTERS` |

## 3. Bounded contexts

| Context | Responsibility | Owns | Code | Must not |
| --- | --- | --- | --- | --- |
| C1 Combat | resolve battles | `Battle`, `Unit`, `StatusInst`, `SkillResult`, `BattleEvent`, `decide`, `simulate`, `Rng` | `src/game/battle/` | import view, screens, the archivist, the Reliquary or engine; read `Math.random` or the clock |
| C2 Catalog | define content | `ChampionDef`, `SkillDef`, `StatusDef`, categories, `LocationDef`, `StageDef`, `ZoneDef`, `Chapter` | `src/game/data/` | import anything but `types.ts` (ARCH-1); hold behaviour beyond lookups and pure helpers |
| C3 Balance governance | keep content inside the norms | norms, impact and curve bands | `norms.ts`, `tests/content.test.ts`, `tools/balance.ts` | change content by itself; it only judges |
| C4 Progression | the Master Archivist: the save and what it unlocks | `MasterArchivist` and its policies, the save repository and its migration | `src/game/archivist.ts` | know about rendering |
| C5 Battle presentation | play rule events as choreography | `BattleScene`, `UnitView`, `FxLayer`, `Hud`, `ZoneView`, `Assets` | `src/game/view/` | decide outcomes; import screens, app, the archivist or the Reliquary |
| C6 Application and screens | routes, input, flow between screens | `App`, `Router`, screens, `Ui`, `Scroller` | `src/game/app.ts`, `src/main.ts`, `src/game/screens/`, `src/game/ui/` | duplicate rules |
| C7 Academy | teach the rules | chapters and figures | `codex.ts`, `screens/academy.ts` | invent numbers (it restates C1 and C2) |
| C8 Art pipeline | generate every pixel | `CharDef`, `ChampionArt`, `FxDef`, `ZoneArt`, palette, renderer, build, audit | `tools/art/` | be imported by `src/` |
| C9 Engine | generic runtime services | `Screen`, `Clock`, `BitmapFont`, `Particles` | `src/engine/` | import anything from `src/game` |
| C10 Reliquary | what the archivist owns and how champions grow | `Reliquary`, `HeroSoulFile`, `WeaverMatrix`, `MatrixSlot`, `ThreadSpool`, `WeavePatternEvaluator` | `src/game/reliquary/` | import anything but `src/game/data` and its own modules; reach battles except through a combatant's stats (phase 3) |

### 3.1 Context map

```
                       ┌───────────────────────────────┐
                       │ C2 Catalog (src/game/data)    │  types.ts: shared kernel
                       └──┬──────────┬──────────┬──────┘
             definitions  │          │ ids      │ ids: champion, skill, fx, zone, stage
        ┌─────────────────▼───┐  ┌───▼────────┐ └─────────────┐
        │ C1 Combat (battle/) │  │ C3 Balance │  ┌────────────▼────────────┐
        │ pure, seeded        │◄─┤ governance │  │ C8 Art pipeline         │
        └──┬──────────────────┘  └────────────┘  │ (tools/art, build time) │
           │ SkillResult + BattleEvent           └────────────┬────────────┘
           │ (published language)                             │ atlases + JSON
        ┌──▼──────────────────────────────────────────────────▼──┐  (published language)
        │ C5 Battle presentation (view/)                          │
        └──┬──────────────────────────────────────────────────────┘
           │ BattleScene + BattleHooks
        ┌──▼───────────────────────────────┐      ┌──────────────────────┐
        │ C6 Application and screens       ├─────►│ C4 Progression       │
        └──────────────────────────────────┘      │ (archivist.ts)       │
                                                   └──────────┬───────────┘
                                                              │ holds
                                                   ┌──────────▼───────────┐
                                                   │ C10 Reliquary        │
                                                   │ (reliquary/)         │
                                                   └──────────────────────┘
   C7 Academy restates C1 and C2 in text and figures (conformist copy).
   C9 Engine serves C5 and C6.
   C2 gives C10 the matrix catalog; C10 will reach C1 only through a combatant's stats (phase 3, not built).
```

### 3.2 Relationships

| Upstream → downstream | Pattern | Contract | Protected by | Risk |
| --- | --- | --- | --- | --- |
| C2 → C1, C5, C6, C8 | shared kernel | `types.ts` (`ChampionDef`, `SkillDef`, ...) | `npm run typecheck` | a field change ripples into four contexts |
| C1 → C5 | published language; C5 is conformist | `SkillResult`, `BattleEvent` (`kind`, `target`, `hit`) | typecheck on the union | a new event kind compiles and shows nothing: the presentation switch is not exhaustive (DR-14) |
| C2 → C8 | id contract | champion id → art module; skill id → icon; fx names; zone id → zone module; `UIR.faction` → emblem | content tests act as contract tests | ids are strings: a rename is a migration (section 9) |
| C8 → C5 | published language | atlas, fx, zone and UI JSON | content tests check presence only | every schema is declared twice, producer and consumer (DR-3) |
| C1, C2 → C7 | conformist copy | numbers written into prose and figures | "every status is taught" test only | drift (DR-1, DR-5) |
| C2, C1 → C3 | policy reads the model | `auditChampion`, `simulate` | `npm test`, `npm run balance` | the bands are calibrated on the AI (see [MDA.md](MDA.md) T2) |
| C6 → C4 | application service → domain + repository | `stageOpen`, `recordClear`, `saveArchivist` | content tests (save) | screens also write `team`, `read` and `settings` directly (DR-15) |
| C4 → C10 | the archivist holds the Reliquary; one save document | `Reliquary` methods, `ReliquaryJson` | tests (round trip, migration, salvage) | a layout change strands spools: loading moves every spool its slot no longer takes to the stock (INV-R5) |
| C2 → C10 | catalog | `StatNode`, `MatrixLayout`, `MATRIX_LAYOUT`, `SLOT_NAMES`, grades, values, strand rules, `SPOOL_STATS`, `CORE_WEAVE_PATTERNS` | typecheck, tests | approved 2026-10-10; slot names and Weave Patterns set by Jakub 2026-10-11 |
| C10 → C1 | stats only | `Combatant.stats` from `battleStats` (archivist) | tests | spools never reach the rules except as stats; enemies wear none |
| C6 → C5 | anti-corruption seam | `BattleHooks` (`finish`, `next`, `retry`, `exit`, `settings`) | design | none: the scene knows nothing of the save or routes, keep it so |

## 4. Tactical model

### 4.1 Combat (C1)

- **Aggregate root: `Battle`.** The consistency boundary is one fight. It owns the units, the seeded `Rng`, the turn counter and the acting unit (`acting`, from `startTurn` to `endTurn`). State changes go through its methods: `advance`, `startTurn`, `useSkill`, `endTurn`, `addStatus`, `applyDamage`, `heal`.
- **Entity: `Unit`.** Identity is team plus slot (`p0`-`e2`). Mutable state: `hp`, `tm`, `statuses`, `cooldowns`, `alive`, `revived`, `overdriven`, `pendingTm`. Its fields are public: tests, `BattleScene.demo` (which resets units between loops) and the `?hp=` screenshot option write them directly. Treat those writes as exceptions; new code goes through `Battle` (R-10).
- **Inside a unit:** `StatusInst` is unique per `StatusId` on a unit; its `turns` and `value` change in place.
- **Value objects:** `Stats`, `Combatant`, `BattleOptions`, `Decision`, `HitDef`, `StatusApp`.
- **Domain events:** `BattleEvent` (12 kinds, section 5), batched per action in `SkillResult`, with counterattacks nested in `counters`.
- **Domain services:** `decide` (the AI policy), `affinityEdge`, `starsFor`, `simulate` (the headless turn loop), `flatten`.

**A turn**, the same in `simulate()` and `BattleScene.run()` (two implementations, DR-4):

```
advance()          meters fill; the unit with the smallest (100 - TM) / SPD acts (ties: higher SPD, then unit order)
startTurn(u)       Poison, Burn, Regen tick; a Stunned or Frozen unit skips
  [choose]         player input, or decide() for enemies and auto
  useSkill(u, s)   resolve (order below) -> SkillResult
endTurn(u)         TM = 0 or the kept meter (max 99); statuses and cooldowns tick down 1
                   (also on a skipped turn and when the unit died of a tick)
winner()           checked before choosing and after every action
```

**Resolution order inside `useSkill`.** Every rule addition must say where in this order it lands.

1. Targets: Taunt narrows single-target enemy skills; counterattacks ignore Taunt; a target that is not valid falls back to the first valid one.
2. Cooldown: set to `cooldown + 1`, because `endTurn` of this same turn ticks it once.
3. Dispel: every buff removed from the targets (events at hit 0); then the statuses marked `before`, placed on their recipients (events at hit -1), so the hits carry them.
4. For each hit `k`, for each living target: roll damage, then apply it (the shield absorbs first and expires at 0; then death, Undying or Overdrive), then, on a critical hit, the target's Rebuke (its statuses land on the actor), then the lifesteal heal, then the per-hit status rolls.
5. On the last hit: ally heals, the self-heal, cleanse, full cleanse, the raise (`revive`: the fallen ally targeted gets up), status applications in the order written in the skill (recipients by `to`), target meter change, ally meter change, the meter of the ally lowest on HP.
6. The kept meter (`selfTm`) waits for `endTurn`.
7. Counterattacks: each damaged, living enemy defender that holds Counter and is neither stunned nor frozen answers once with its A1 at the actor. Counters set no cooldown, keep no meter and are never countered.

### 4.2 Catalog (C2)

- **`ChampionDef` is the root of a definition:** identity, stats, one to three skills (a tuple type: A1, then an optional A2 and A3), an optional passive. Definitions are treated as immutable at runtime, by convention only: they are plain objects, not frozen.
- **Registries:** `CHAMPIONS` (array order = collection order), `STATUSES` (keyed by `StatusId`, exhaustive by type), `LOCATIONS` (array order = campaign order; stage order inside a location = unlock order), `ZONES`, `CHAPTERS`, and `RARITIES`, `AFFINITIES`, `FACTIONS`, `ROLES` (keyed by their union types, exhaustive by type).
- **Lookups fail fast:** `champion()`, `stage()`, `locationOf()`, `zone()` and `chapter()` throw on an unknown id.
- **Ids are the integration keys between contexts**, and therefore published identifiers:

| Id | Joins |
| --- | --- |
| champion id | data module, art module, atlas file, portrait, `HeroSoulFile.champion`, `MasterArchivist.team`, `STARTERS`, stage `enemies` and `recruit`, URLs (`&team=`, `&champion=`) |
| skill id | skill icon, Academy demo, `?demo=`, special cases in `scene.ts` (`arrow_rain`) |
| fx name | `hits[].fx`, `projectile`, `castFx`, `actorFx`, the `ADDITIVE` set and special cases in `scene.ts` |
| zone id | `ZoneDef`, `ZoneArt`, `public/assets/zones/<id>/`, `LocationDef.zone`, `homeZone()` |
| stage id | `MasterArchivist.stars` keys, `LocationDef.requires`, URLs (`&stage=`, `?progress=`) |
| status id | `StatusId`, status icon, Academy `statuses` blocks, `status_<id>` chapter icons |

### 4.3 Balance governance (C3)

- **Policies:** `statScore` and the budget per rarity, `STAT_LIMITS`, `SKILL_NORMS`, `STATUS_NORMS` (all through `auditChampion`), `IMPACT_BAND` and `CURVE_BANDS` (in `tools/balance.ts`, DR-10).
- **The reference player is the AI.** Every band is measured on auto play; changing `ai.ts` re-calibrates all of them ([MDA.md](MDA.md) T2).

### 4.4 Progression (C4)

- **Aggregate root: `MasterArchivist`**: `stars`, `team`, `read`, `settings`, and the `reliquary` it holds (C10).
- **Policies:** `isUnlocked` (the champion has a soul file), `isFresh`, `anyFresh`, `roster`, `cleared`, `locationOpen`, `stageOpen`, `frontier`, `recordClear` (stars only go up; recruit on the first clear only), `recordVictory` (and the Stardust a victory finds), `totalStars`, `unlockEverything`; summoning's in `src/game/summoning.ts`: `summonPool`, `rarityOdds`, `summonChances`, `wishChance`, `drawSummon`, `mergeShard`, `summon`, `summonsReady`, `summonLessonDue`, `joinsBy`.
- **Repository:** `loadArchivist` and `saveArchivist` under `tlrol.save.v2`, through the pure `readSave` and `writeSave`; every access is guarded. A version 1 save (`oathbound.profile.v1`) is migrated once and left in place; another version, or unreadable text, starts a new game. Loading drops champion and stage ids the catalog lacks and gives every starter its soul file.
- **Writers:** `recordClear` saves by itself; the champion page clears the NEW badge through `Reliquary.markSeen`; screens write `team`, `read` and `settings` directly and call `app.save()` (DR-15).

### 4.5 Presentation (C5)

- **`BattleScene`** is the application service of one battle and its view model: the interactive turn loop, player choice (`awaitChoice`, `pickSkill`, `clickUnit`), choreography (`perform`), rendering and input.
- **`UnitView`** holds displayed values (HP, lag HP, shield, TM, statuses) that chase the rules while events play; `snap()` sets them to the rules' state at the end of every top-level action.
- **`FxLayer`** (effects, projectiles, floating text), **`Hud`** (meter track, bars, panels, results), **`ZoneView`** (backdrop, tiles, props, ambience, light).
- **Presentation policy written as code, keyed by id:** the `ADDITIVE` effect list, projectile trails (hex colours), arcs and speeds, the Arrow Rain volley, and special placement for `crack`, `holy` and `ice_spikes` (DR-13).

### 4.6 Art pipeline (C8)

- **Models:** `CharDef` (rig, dims, animations, `build`), `ChampionArt` (`char`, `iconBg`, icons keyed by skill id), `FxDef`, `ZoneArt` (tiles, backdrop, props, `kinds`, `layout`, `horizon`), the palette tables (`MAT`, `ACCENT`, `INK`, `FXR`, `UIR`) and `LIGHT_DIR`.
- **Products:** `build.ts` writes atlases and JSON to `public/assets/` (and zone previews to `docs/images/`); the output is meant to be byte-identical between runs and is committed with the code that needs it.
- **Proof:** `audit.ts` checks the products against [ART_GUIDE.md](ART_GUIDE.md).

### 4.7 Reliquary (C10)

- **Aggregate root: `Reliquary`.** It holds the soul files and the stock and is their only writer: `recruit`, `markSeen`, `keepOnly`, `addSpool` (a new find with its NEW badge), `equip`, `unequip`, `unravel`, `markSpoolSeen`, `markStockSeen`. A spool moves between the stock and a slot in one step, so it is never lost or copied; only unravelling removes one, and only from the stock.
- **Entity: `HeroSoulFile`.** Identity: the champion id, one file per champion. Frozen; the Reliquary replaces it on every change.
- **Value objects:** `ThreadSpool` and `StatBonus` (frozen, equal when their fields are equal: `sameSpool`), `StockEntry` (a loose spool and its NEW badge), `MatrixSlot`, `WeaverMatrix` (every change returns a new matrix), `WovenPattern`. Weaving shows identical loose spools as one card with their count; a woven spool is told apart by the slot it sits in.
- **Domain service: `WeavePatternEvaluator`.** Counts spools per pattern over the whole matrix, never by slot; a pattern is woven `floor(count / pieces)` times; results follow catalog order; an unknown pattern throws.
- **Domain service: the drops (`reliquary/drops.ts`).** `rollDrops` makes what a victory on a stage finds: `dropCount` spools, each of one of the area's two patterns, its grade by `gradeOdds`, its main stat by `rollMainStat`, its strands by `rollSpool`. The archivist's `recordVictory` records the clear and puts the finds into the stock as new.
- **Spool rules:** `threadSpool` enforces them (main value from the grade, strand count by grade, no repeats, values in range, SPD strands +1); `rollSpool` draws a valid spool. `attunedStats`, `strandValue`, `matrixBonus` (SPD strands capped at +4) and `wovenStats` turn a matrix into stats; the archivist's `battleStats` hands them to `Combatant.stats`.
- **Persistence:** `toJSON` and `fromJSON` (`ReliquaryJson`) keep spools by slot index; a new find in the stock is saved with `fresh: true`. Loading puts a spool back into its slot when the slot still takes it, otherwise into the stock, and drops malformed entries and spools of a pattern the catalog no longer has.
- **Built (2026-10-10, 2026-10-11, 2026-10-24):** the layout, grades, strands, attunement, the bridge into combat and the MATRIX tab; Jakub's slot names and his eight core Weave Patterns, whose bonuses `wovenStats` adds once per weave; spools dropping from every stage, two patterns per area, and Weaving, the section that stores them. **Not defined yet:** materials; improving spools; the Spindle of Fate's system; the drop numbers (stand-ins); the stage powers are measured again with spools in mind (MDA T11).

## 5. Domain events

`BattleEvent` is the language in which the rules tell the view what happened. Every kind must have a cue on screen ([MDA.md](MDA.md) DY11).

| Kind | Emitted by | `hit` | Payload | On screen | Taught in |
| --- | --- | --- | --- | --- | --- |
| `damage` | `applyDamage` (skill hits, Poison and Burn ticks) | hit index; 0 for ticks | `amount` after shields, `absorbed`, `crit`, `edge`, `dot` | number (crit: gold, 2x, `CRITICAL`), `STRONG HIT` / `WEAK HIT`, `ABSORB n`, flash, hurt, sparks, hit-stop | Damage & Critical Hits, Affinities |
| `heal` | `heal` (lifesteal, ally heals, Regen) | hit index, last hit, or 0 | `amount` | green `+n`, sparkles | Buffs (Regen), Special Mechanics (lifesteal) |
| `blocked` | `heal` under Heal Block | as `heal` | - | `HEAL BLOCKED` and its icon | Debuffs |
| `status` | `tryApply`, Overdrive | last hit, or the hit for per-hit rolls; -1 for one placed before the hits (`before`) | `status`, `turns` | the status name, plus a cue (Taunt, Poison, Burn, Counter, or a buff/debuff burst); stun stars and the ice block as overlays | Buffs, Debuffs, Crowd Control |
| `resist` | `tryApply` (failed debuff roll; failed buff rolls emit nothing) | as `status` | `status` | `RESIST` | Debuffs |
| `expire` | `endTurn`; a shield used up in `applyDamage` | 0, or the hit | `status` | the icon disappears; ice shatters | Buffs, Debuffs |
| `cleanse` | `useSkill` | last | `status` | the debuff's name, `-POISON` | Special Mechanics |
| `dispel` | `useSkill`, before the hits | 0 | `status` | `-NAME` and a dispel burst | Buffs, Special Mechanics |
| `tm` | `useSkill` (`tmTargets`, `tmAllies`, `tmLowestAlly`) | last | `delta` | `+n% TURN` / `-n% TURN` | Turn Meter & Speed, Special Mechanics |
| `revive` | `applyDamage` (Undying) | hit | `hp` | fall, tomb-light helix, `UNDYING!`, rise | Special Mechanics |
| `raise` | `useSkill` (`revive`: Raise Dead) | last | `hp` | the skill's effect where the ally fell, its death played backwards, `RAISED!`; the battle waits for it | Skills & Cooldowns, Special Mechanics |
| `passive` | `applyDamage` (Overdrive; a fallen passive as an ally dies), `endTurn` (a tend), `useSkill` (a ward, a defy, a retaliation), `tryApply` (a remedy, as an enemy's debuff lands) | hit; 0 for a tend; the last hit for a ward, a defy or a retaliation; the debuff's hit for a remedy | `name`, `effect`, `source` (the holder of a tend, a ward, a defy, a retaliation or a remedy; the attacker for a Rebuke) | Overdrive: banner, burst, `OVERDRIVE!` (fixed text, DR-14); a tend, a ward, a retaliation or a remedy: its name over the holder, its `holderFx` on the holder and its `fx` on whom it reaches (no banner: they act often); fallen: banner, the stat it gains, the undergrowth at the holder's feet | Special Mechanics |
| `death` | `applyDamage` | hit | - | death animation, fade | The Basics |

**Ordering guarantees.** Start of turn: `damage` (Poison), `damage` (Burn), `heal` or `blocked` (Regen). Inside one damage instance: `expire` (a used-up shield), `damage`, then `revive`, `death` or `passive` with its `status` events. Within an action, the resolution order of section 4.1, then a ward's `passive` and `status` events for each ally struck (before any counterattack). A death may be followed by a fallen passive's `passive` on its holder. End of turn: a tend's `passive` and `status` first, then one `expire` per status that ran out. Counterattack results follow the action that provoked them, in the order the defenders were hit, and the view plays them after the attacker is back in formation.

## 6. Invariants

What must always be true, and what holds it true. **Type**: the compiler. **Test**: `npm test` (`tests/battle.test.ts`, `tests/content.test.ts`). **Balance**: `npm run balance`. **Audit**: `npm run audit`. **Code**: one code path, with no check. **Convention**: nothing; true today because people kept it. Every convention is a gap that section 11 proposes to close.

### 6.1 Combat

| ID | Invariant | Enforced by |
| --- | --- | --- |
| INV-C1 | Same teams, options and seed give the same battle, event for event | code (only `Rng` draws numbers in `battle/`); no test (R-3) |
| INV-C2 | The next actor has the smallest (100 - TM) / SPD; ties go to higher SPD, then unit order | code; test "fastest unit acts first" |
| INV-C3 | TM stays within 0-100; after acting it is 0 or the kept meter (max 99); a dead unit has TM 0 | code; tests on reset and `selfTm` |
| INV-C4 | A status appears at most once per unit; reapplying keeps the longer duration and the larger shield | code (`addStatus`); no test |
| INV-C5 | Durations count the holder's own turns and tick at its turn end, also on a skipped turn; a status placed during the holder's own turn first ticks at its next turn end | code in both turn loops; tests on Freeze and on a self-buff |
| INV-C6 | A skill with cooldown N is unavailable for the holder's next N turns | code; test (a synthetic A2 on cooldown 3) |
| INV-C7 | Single-target enemy skills must target a taunter while one lives; AoE and counterattacks ignore Taunt | code; test (Taunt vs single and AoE; the counter case is untested) |
| INV-C8 | Every hit deals at least 1; shields absorb before HP, except Poison and Burn | code; tests on shields and ticks |
| INV-C9 | Heal Block stops every heal (skills, Regen, lifesteal) and says so | code; test for skill heals only |
| INV-C10 | Each damaged, living enemy defender with Counter and no control answers once with A1; counters are never countered | code; test |
| INV-C11 | Undying fires once, leaves `value` x max HP, removes debuffs, keeps buffs | code; test |
| INV-C12 | Overdrive fires once, only on non-lethal damage, a hit or a tick, that ends below `value` | code; tests |
| INV-C13 | A dead unit has no statuses and is never a target | code; test |
| INV-C14 | A battle ends when one side has no living unit; it always ends | code; test (40 seeded auto battles); termination relies on every A1 dealing damage |
| INV-C15 | A Rebuke answers only a critical, non-lethal hit by an enemy that leaves its holder below `value`; then it rests for `cooldown` of the holder's turns | code; tests |
| INV-C16 | A debuff placed on an enemy lands with at most its chance: all of it while the placer's ACC is at least the target's RES, cut by `landShare` above; buffs and effects on allies never meet RES; when ACC is at least RES the random draws are the same as without the rule | code (`tryApply`); tests |
| INV-C17 | A skill aimed at one ally that also helps its user (a status on it, or `healSelf`) is aimed at another ally while one stands (alone, the user is its own target); a status reaches each unit once per skill | code (`validTargets`, `useSkill`); test |
| INV-C18 | A tend acts at the end of each of its holder's turns, skipped ones too, while it is ready: the living ally with the lowest max HP, the holder included (ties: the lower HP share, then the front), gets its statuses worth `value` x the holder's max HP; then it rests `cooldown` of the holder's turns | code (`Battle.tend`); tests |
| INV-C19 | A ward answers each ally an enemy skill damaged and left standing, the holder included, once per skill, after the skill's last hit, with its chance; its own side's skills never trigger it | code (`Battle.ward`); tests |
| INV-C21 | A retaliation answers an enemy skill that damaged its holder and left it standing, once per skill, after the skill's last hit, with its chance, while the attacker stands; the debuff meets the attacker's RES; its own side's skills never trigger it | code (`Battle.retaliate`); tests |
| INV-C22 | A remedy answers each debuff an enemy lands on an ally of its holder, the holder included, once per debuff, with its chance; a resisted debuff never triggers it, and it gives buffs only, so it never answers itself | code (`Battle.remedy`, from `tryApply`), norms; tests |
| INV-C23 | A ward of its holder alone (`self`) answers only blows on its holder; with no chance it answers every one | code (`Battle.ward`); test |
| INV-C24 | A full cleanse removes every debuff from the skill's living targets on the last hit; a self-heal heals the actor after the damage, and Heal Block stops it | code (`Battle.useSkill`); tests |
| INV-C20 | A fallen passive adds `value` per fallen ally of its holder, up to `max`, to the stat it names, in battle only; the champion's own stats never change; its event shows only while the bonus grows | code (`Battle.fallenBonus`, `critRate`, `mourn`); test |
| INV-C25 | A skill aimed at the fallen (`target: 'fallen'`) is ready only while an ally of its user has fallen, and takes one of them at random; with `revive` that ally gets up on the last hit with that share of its max HP (at least 1), no statuses and an empty turn meter, its cooldowns and its spent once-a-battle passives unchanged; it never reaches an enemy | code (`Battle.ready`, `Battle.fallen`, `useSkill`); tests |
| INV-C26 | A status marked `before` is placed on its recipients before the skill's first hit (event hit -1), so the skill's own hits carry it; it counts like any status placed on its holder's own turn, and it reaches each unit once per skill like any other | code (`Battle.useSkill`); test |
| INV-C27 | A defy answers an enemy skill that landed a critical hit on its holder and left it standing, once per skill, after the skill's last hit: the holder takes its statuses and heals by its share of max HP (Heal Block stops the heal); a crit that fells the holder, or a hit that is not critical, never wakes it | code (`Battle.defy`), norms; test |

### 6.2 Catalog

| ID | Invariant | Enforced by |
| --- | --- | --- |
| INV-K1 | Champion ids are unique; rarity, affinity, faction and role exist | test |
| INV-K2 | Stats within ±5% of the rarity budget and inside the limits | test, balance 1 |
| INV-K3 | Slots in order A1-A2(-A3); cooldowns, multipliers, durations and the guaranteed-control slot within the norms; a passive's control lasts one turn, a Rebuke has a cooldown, a stat passive names its stat, a fallen passive its stat and cap, a tend, a ward, a retaliation or a remedy its statuses, any chance it rolls lies in (0, 1], a retaliation places debuffs and a remedy gives buffs, only a ward guards its holder alone, and a passive acting in the flow of a fight names its `fx` (content test) | type (tuple of two or three), test, balance 2 |
| INV-K4 | `hits.length` equals the hit frames of the animation; leap needs `jump`, `actorFx` needs `cast`; Undying needs `rise` | test |
| INV-K5 | Every effect a skill names exists; a champion with a projectile has a `muzzle` | test |
| INV-K6 | Every champion has an atlas, a portrait and one icon per skill | test |
| INV-K7 | Every status has an icon and is taught in the Academy; Academy demos and icons exist | test |
| INV-K8 | Every faction, affinity, role and rarity has its UI part (`emblem_`, `gem_`, `role_`, `card_`) | convention: screens throw on a missing part (R-6) |
| INV-K9 | An A1 that strikes no enemy (the Dominion Medic's heal) never counterattacks, because counterattacks answer with A1; every other A1 targets a single enemy | code (`useSkill`), test |
| INV-K10 | Effect names are unique across effect modules (a later module would silently override an earlier one) | convention, true today: 104 names (R-6) |
| INV-K11 | Every faction has a deliberate home zone | convention: `homeZone()` returns the first zone for every faction until zones belong to factions (DR-12) |
| INV-K12 | Numbers in skill descriptions equal the data | convention, true today for all 29 skills and the five passives (R-1) |
| INV-K13 | Numbers in the Academy, its figures and the stat tips equal the rules | test for the turn-meter numbers it quotes; the rest by convention (DR-5, R-1) |
| INV-K14 | Definitions do not change at runtime | convention: objects are not frozen |
| INV-K15 | The interface ramps repeat the category colours: `UIR.rarity` and `UIR.affinity` base entries (`palette.ts`) equal the colours in `meta.ts`; faction medallions follow the standards instead (the Azure Crown's crown is gold on its blue field) | convention, true today for all 7 (R-6) |
| INV-K16 | Jakub's locked decisions hold: the four enums and their order, the affinity cycle, the factions' names, the two starting champions' names, rarity, role, faction and affinity, their kits' skills, shapes and riders (Starter Heroes), the second joining after the first battle, a ten-stage first zone | test ("design decisions" in `tests/content.test.ts`); a change there is a change to his design |

### 6.3 Campaign and progression

| ID | Invariant | Enforced by |
| --- | --- | --- |
| INV-P1 | Stage ids are unique; 1-3 enemies, all known champions; an area with stages names a known zone; campaign nodes inside the world, clear of its frame and the header | test |
| INV-P9 | The world map and its overview have the sizes `WORLD_MAP` declares; the overview fits one screen (`WORLD_MAP.w / overview` at most 640); each area's node stands east of the one before | test |
| INV-P2 | Every location ends on a boss stage; `requires` names an existing stage | test |
| INV-P3 | Only 1-1 brings a champion (the Rime Scholar); every other non-starter can be summoned (Jakub, 2026-10-25) | test |
| INV-P4 | A stage opens when its location is open and the previous stage there is cleared | test (save); the battle route does not check it (DR-11) |
| INV-P5 | A recruit happens on the first clear only, and only if not owned; stars only go up | test |
| INV-P6 | Every champion and stage id in the save exists in the catalog | test: loading drops unknown ids (`readSave`) |
| INV-P7 | A team holds 1-3 different owned champions | the team screen only |
| INV-P8 | The save has version 3 under `tlrol.save.v3`; an older save (version 2 under `tlrol.save.v2`, version 1 under `oathbound.profile.v1`) gives only its settings and Academy reading to a new game, once, and is left in place; missing fields take defaults; another version starts a new game | test |
| INV-P10 | Every cleared stage's champion has its soul file (a save survives a stage that changes what it brings) | test (`readSave`) |
| INV-P11 | Every area with stages holds exactly two different Weave Patterns, both in the catalog, and every pattern drops in some area (Jakub, 2026-10-24) | test |
| INV-P12 | The Journey is claimed in order: a quest opens only when the one before it is claimed, is claimed at most once, and a save keeps only the claims up to the first gap | test |
| INV-P13 | The tutorial starts on its own only for a save with no stage cleared whose tutorial is neither finished nor skipped; skipping never undoes a finish | test (`tutorialDue`); `Tutorial.stop` |
| INV-P14 | A summon spends exactly one Soulstar and brings a champion not owned, never a starter or a stage's champion; the rarity odds are his (70 / 25 / 5%), a found-out rarity's share going to the others; a wish never changes a rarity's odds | test (`summon`, `rarityOdds`, `summonChances`) |
| INV-P15 | 100 Stardust make one Soulstar; Stardust and Soulstars never go below 0, in play or in a save | test (`mergeShard`, `readSave`) |

### 6.4 Presentation and art

| ID | Invariant | Enforced by |
| --- | --- | --- |
| INV-V1 | The view never decides an outcome; after every action displayed HP and statuses equal the rules | code (`snap`); `demo` resets units directly by design |
| INV-V2 | Events with `hit` k play when the animation enters hit frame k, or when the projectile lands; dispels first; leftovers before the return | code (`perform`) |
| INV-V3 | Every event kind has a presentation | code switch, not exhaustive (DR-14, R-5) |
| INV-V4 | Sprites are never mirrored at runtime; effects may be | code (`UnitView` draws the facing's frames) |
| INV-G1 | Champion pixels only from `MAT`, `ACCENT`, `INK`; idle height 64-96; frames inside 208x160; no colour literals in champion modules | audit |
| INV-G2 | Backdrop 640x200; tiles on the 32 px grid; colour budgets 220 / 160; prop kinds have frames (pulse 2+, fire needs `flame`, birds need `bird`); 3 + 3 spawns | audit, test |
| INV-G3 | Skill icons 40x40, status icons 12x12 | audit |
| INV-G4 | The art build is deterministic and committed | convention: no check rebuilds and compares (R-15) |
| INV-G5 | Each asset JSON has one schema for producer and consumer | not true today (DR-3, R-4) |
| INV-G6 | No effect frame is cut off at the edge of its box; padding (`FxDef.pad`) never moves a ground effect's anchor across `ay` 0.8 | audit |
| INV-G7 | Every character of the game text has a glyph in `regular` and `bold`; every title, champion name and big number has one in `display`; `micro` has every digit and fits a status-icon badge; body faces keep cap 7 / cell 9 and the display cell is two body cells | test |

### 6.5 Reliquary

| ID | Invariant | Enforced by |
| --- | --- | --- |
| INV-R1 | A Weaver Matrix has six slots in two triangles (flat ATK, DEF, HP fixed; SPD only in East Meridian, C.RATE and C.DMG only in Nadir, ACC and RES only in West Meridian); a slot holds at most one spool, and only one its stat node takes | type (`MatrixLayout`), code (`equip`), test |
| INV-R2 | A Weave Pattern counts its spools wherever they sit and is woven `floor(count / pieces)` times: a 2-piece pattern up to three times, a 4-piece pattern once | test (every arrangement over the six slots) |
| INV-R3 | A spool is in exactly one place, the stock or one slot; only the Reliquary moves spools | code, test (2000 random moves) |
| INV-R4 | One soul file per champion; every starter has one | code (`recruit`, `readSave`), test |
| INV-R5 | A save never loses a valid spool: one its slot no longer takes goes to the stock on load (a spool of a pattern the catalog no longer has is not valid, and is dropped) | test |
| INV-R6 | Thread Spools never change: frozen, and equal fields make the same spool | code (`threadSpool`), test |
| INV-R7 | A spool's main value follows its grade; it has one strand per grade step, none repeating a stat, each in its grade's range, SPD strands +1; a save cannot raise a stored value | code (`threadSpool`, `readSpool`), test |
| INV-R8 | Strands add at most +4 SPD to a matrix; attunement adds +1 only on choice slots, for the fixed stats beside them | code (`matrixBonus`), test |
| INV-R9 | The matrix reaches battle only as the stats a combatant brings; without them a unit fights with its base stats | code (`Battle`), test |
| INV-R10 | A victory on a stage finds only spools of its area's two Weave Patterns: one, and a second when nobody fell, each within the spool rules; a defeat finds none | code (`rollDrops`, `BattleScreen`), test |
| INV-R11 | A new find wears the NEW badge, through a save, until it is chosen in Weaving or Weaving is left; a spool coming back from a slot is never new | code, test |
| INV-R12 | Only a loose spool is unravelled, and it leaves the Reliquary for good | code (`unravel`), test |
| INV-R13 | `?spools=1` adds its sample once: a sample spool already held, loose or woven, is not added again | test (`stockSample`) |

## 7. Policies: where decisions live

| Policy | Decides | Lives in |
| --- | --- | --- |
| Turn order | who acts next | `Battle.advance` |
| Targeting | who may be chosen; Taunt | `Battle.validTargets` |
| Damage | how much a hit deals | `Battle.rollDamage` |
| Status rules | apply, refresh, resist, tick, expire | `tryApply`, `addStatus`, `endTurn` |
| Cooldowns | when a skill is ready (a skill aimed at the fallen also needs one) | `useSkill`, `endTurn`, `ready` |
| Death and passives | death, Undying, Overdrive, a fallen passive's growth | `Battle.applyDamage`, `mourn` |
| Passives that shield | Herder's Ward at the end of its holder's turn, Unbroken Flag after a blow on an ally, Thick Hide after a blow on its holder | `Battle.tend` (from `endTurn`), `Battle.ward` (from `useSkill`) |
| Passives that answer | Bitter Motes on the attacker after a blow on its holder; Keeper's Balm on an ally as an enemy's debuff lands; Old Grudge on its holder after a critical hit | `Battle.retaliate` and `Battle.defy` (from `useSkill`), `Battle.remedy` (from `tryApply`) |
| Live stats | the critical rate a unit strikes with | `Battle.critRate` |
| AI | skill and target | `ai.ts`: highest `ai.priority` ready skill (a heal with priority 4 and `allyHurt` goes before the A3 when an ally is hurt); `allyHurt` below 70% HP or with a debuff; control aims at the uncontrolled with the highest ATK; dispel at the most buffed; otherwise 70% lowest HP%, 30% random |
| Stars | 3 / 2 / 1 | `starsFor` |
| Unlocks | open stages and locations | `stageOpen`, `locationOpen`, `frontier` |
| Rewards | recruit on 1-1's first clear; Stardust on every victory; a summon per Soulstar | `recordClear`, `recordVictory`, `fragmentDrop`, `summon`, `Reliquary.recruit` |
| Spool placement | which slot takes a spool | `fits`, `StatNode`, `MATRIX_LAYOUT` |
| Pattern completion | which Weave Patterns a matrix weaves, and how often | `WeavePatternEvaluator` |
| Difficulty | enemy scaling | `Battle` constructor (`power` on HP and ATK, `bossHp`), `campaign.ts` |
| Home zone | where a faction stands outside battle | `homeZone()` |
| Demo casting | who demonstrates a skill | `screens/battle.ts`: the owner and two companions against three from the far end of the roster, seed 7 |
| Presentation | approach, layers, additive light, projectiles | `BattleScene.perform`, `spawnHitFx`, `ADDITIVE` |

## 8. Architecture rules

All true on the snapshot commit. Each rule is a fitness function: a check that fails when the shape of the code degrades.

| ID | Rule |
| --- | --- |
| ARCH-1 | Catalog modules import only `types.ts`; the champion registry also imports its champion modules. Catalog modules do not import each other. |
| ARCH-2 | `src/game/battle` imports only `src/game/data` and its own modules: no view, screens, UI, app, archivist, Reliquary or engine. |
| ARCH-3 | The rules read no global randomness and no clock: only `Rng` draws numbers. |
| ARCH-4 | `src/game/view` never imports screens, the app, the archivist or the Reliquary; it talks back through `BattleHooks`. |
| ARCH-5 | `src/engine` imports nothing from the game. |
| ARCH-6 | `src/` never imports `tools/`. Tools may import `src/game/data` and `src/game/battle` (the balance tool, the world map). |
| ARCH-7 | Files in `public/assets` and the generated `docs/images` are rebuilt by `npm run art`, never edited by hand, and committed with the code that needs them. |
| ARCH-8 | `src/game/reliquary` imports only `src/game/data` and its own modules. |

Checks for ARCH-1 to ARCH-6 and ARCH-8; each prints nothing when the rule holds (verified to catch a planted violation):

```bash
grep -rnE "^import" src/game/data | grep -vE "from '\.\.?/types'|champions/index\.ts:"   # ARCH-1
grep -rnE "from '\.\./(view|screens|ui|app|archivist|reliquary)|engine/" src/game/battle   # ARCH-2
grep -rnE "Math\.random|Date\.now|performance\.now" src/game/battle src/game/data          # ARCH-3
grep -rnE "from '\.\./(screens|app|archivist|reliquary)" src/game/view                     # ARCH-4
grep -rnE "^import .* from '\.\./game" src/engine                                          # ARCH-5
grep -rnE "^import .*tools/" src                                                           # ARCH-6
grep -rnE "^import" src/game/reliquary | grep -vE "from '(\.\./data/|\./)"                 # ARCH-8
```

Run them before merging structural changes. R-2 proposes moving them into a test file so that `npm test` fails when a rule breaks.

## 9. Change playbooks

The project skills cover the two most common changes. The others touch several contexts and are listed here in dependency order.

| Change | Touch, in order | Gates |
| --- | --- | --- |
| New champion | the **new-champion** skill (`.claude/skills/new-champion/`); then [MDA.md](MDA.md) ME3, the answer table in DY6, and the baseline | test, audit, balance, typecheck, captures |
| New combat background | the **new-combat-background** skill | test, audit, typecheck, captures |
| New status | `StatusId` (`types.ts`) → `statuses.ts` → its rule in `battle.ts` → a test → its icon (`tools/art/ui/status.ts`, `npm run art -- ui`) → its cue in `scene.ts` (`applyEvent`, overlays in `unit.ts` if the body changes) → an Academy `statuses` block → `STATUS_NORMS` if it is control → MECHANICS_GUIDE 7, [MDA.md](MDA.md) ME1, section 2 here | test, audit, balance, `?demo=` of a skill that uses it |
| New skill field (a mechanic) | `SkillDef` with a doc comment → its place in the resolution order (4.1) and its events → presentation → norms (does it count toward a budget?) → AI (does `decide` need to understand it?) → test → Academy → MECHANICS_GUIDE 4.1 and 8 | test, balance re-baseline |
| New passive kind | `PassiveDef.kind` → the rule (in `applyDamage` or a new hook) with a once-flag on `Unit`, reset in `BattleScene.demo` → an event (make `passive` carry its kind, DR-14) → a required animation in the content test (like `rise`) → Academy → tests: fires once, lethal hits, ticks, Undying interplay | test, balance |
| New event kind | the `BattleEvent` union → its place in the order (section 5) → a case in `applyEvent` (and in `playTicks` for start-of-turn events) → MECHANICS_GUIDE 12, section 5 here | test, captures |
| New stage or location | `campaign.ts` (a stage: enemies in formation order, the champion its first clear brings; a location: its node position in `WORLD_MAP` pixels, its zone, its landmark in `tools/art/map.ts`) → `npm run art -- map` (check the world and the overview) → tune `power` with `npm run balance` → [MDA.md](MDA.md) ME4 lean and DY9 shape → GAME_STRUCTURE 3 | test, balance |
| New faction | `FactionId`, `FACTIONS` → `UIR.faction` ramp and `emblem()` (`tools/art/ui/menu.ts`), `npm run art -- ui` → `homeZone()` → the Academy `champions` chapter (it names every faction) → the champion template and worksheet lists → ART_GUIDE 2.4 | test, audit |
| A rule constant | the constant → every copy listed in [MDA.md](MDA.md) ME1 → tests that assert the number → balance, and stage `power` re-tuned if the curve moved → [MDA.md](MDA.md) section 6 | test, balance |
| Rename an id | data and art modules and registries → `npm run art` → stages, `STARTERS`, tests, docs, URLs → a rename in `readSave` for stored ids (champion, stage); without one, loading drops the old id and its progress → special cases keyed by id in `scene.ts` | test, audit, typecheck |
| New AI behaviour | `ai.ts` → a test → MECHANICS_GUIDE 11 → full re-baseline: every band is calibrated on the AI | test, balance |
| New screen | [UI_GUIDE.md](UI_GUIDE.md) section 6 | typecheck, captures |
| Change the matrix layout | after approval, `MATRIX_LAYOUT` (`data/matrix.ts`) → tests → saved spools a slot no longer takes move to the stock on load (INV-R5) → the matrix screen → GAME_STRUCTURE 4, section 2.6 here | test, typecheck |

## 10. Drift register

Inconsistencies found while writing this document. Close one by fixing it and recording the fix here; never delete the row.

| ID | Severity | Where | What | Fix |
| --- | --- | --- | --- | --- |
| DR-1 | medium | `src/game/data/codex.ts` (Special Mechanics) | the Academy says Resonance drains 10% turn meter; the data (`starsinger.ts`) and MECHANICS_GUIDE say 15% | closed 2026-10-07: the text says 15%, and a content test compares every turn-meter number the Academy quotes with the skill (the first piece of R-1) |
| DR-2 | medium | `tests/battle.test.ts` | "runs every champion through battles" lists 10 champions by hand: Imara, Kwesi and Mwamba never run | closed 2026-10-10: the test iterates `CHAMPIONS`, and every rule test runs on synthetic champions (`tests/fixtures.ts`), so the rules stay proven whatever the roster |
| DR-3 | medium | `tools/art/build.ts`, `tools/art/fx/kit.ts`, `tools/art/zones/shared.ts`, `tools/art/ui/index.ts`, `tools/art/font.ts` vs `src/game/view/assets.ts`, `src/engine/font.ts` | `ChampionAtlasJson`, `FxJson`, `ZoneJson` with `PropKind`, `UiJson` and `FontJson` are each declared twice, producer and consumer | R-4 |
| DR-4 | medium | `src/game/battle/sim.ts`, `src/game/view/scene.ts` | the turn structure is written twice; the balance numbers come from one copy, play from the other | R-7 |
| DR-5 | low | `statuses.ts`, `codex.ts`, `screens/academy.ts`, `screens/champion.ts` | rule numbers restated by hand: status texts, the Academy damage figure (4.8, ±20%, x1.25, x1.5, 0.92-1.08), the turn-meter figure's SPD values, the stat tips, the list of factions | R-1, R-8 |
| DR-6 | low | `.claude/skills/new-champion/templates/` | worksheet and data template list factions without `nyota`; the worksheet says only `undying` exists as a passive (`overdrive` does too) | closed 2026-10-10: the lists name today's categories and both passives |
| DR-7 | low | `.claude/skills/new-combat-background/templates/worksheet.md` | ambient options list `snow` and `sand`, not `motes` (nor `leaves`, since 2026-10-11) | update the list |
| DR-8 | low | `src/game/data/statuses.ts` | the header points to `tools/art/ui.ts STATUS`; icons live in `tools/art/ui/status.ts` | fix the comment |
| DR-9 | low | `tools/review.sh` | passes `seed=` and `target=` in the URL; the game reads neither (demos use seed 7 and the first target) | read them in `main.ts`, or drop them |
| DR-10 | low | CLAUDE.md, `tools/balance.ts` | "numbers stay inside norms.ts", but the impact and curve bands live in the balance tool and the rule constants in `battle.ts` | state the rule precisely, or move the bands into `norms.ts` |
| DR-11 | low | `src/game/screens/battle.ts`, `src/main.ts` | the battle route checks neither stage access nor ownership: deep links can record clears out of order | intended for screenshots; R-13 if progress ever carries value |
| DR-12 | low | `src/game/data/zones.ts` | `homeZone()` maps factions in code; a new faction silently gets Frostfang. Since 2026-10-10 it returns the first zone for every faction (one zone exists) | R-6 |
| DR-13 | low | `src/game/view/scene.ts` | choreography keyed by id: the Arrow Rain volley, projectile trails as hex literals, arcs, slow projectiles, `crack` / `holy` / `ice_spikes`, the `ADDITIVE` list; each new projectile or light effect needs a code edit | R-9 |
| DR-14 | low | `src/game/view/scene.ts` | `applyEvent` is not exhaustive: a new event kind compiles and shows nothing; `passive` always reads `OVERDRIVE!` whatever the passive | R-5; in part 2026-10-10: the `passive` event carries its `effect`, and a Rebuke has its own cue |
| DR-15 | low | `src/game/profile.ts` (now `archivist.ts`), screens | profile fields are written from several screens and stored ids are never validated: a renamed champion makes `champion()` throw on load | R-10, R-11; in part 2026-10-08: loading drops unknown ids, and the NEW badge goes through `Reliquary.markSeen`; 2026-10-10: a team whose champions are all gone (the stand-ins renamed to `captain_gareth` and `rime_scholar`) starts over from the starters (test) |
| DR-16 | low | `src/game/screens/base.ts`, `src/game/screens/menu.ts` | menu dioramas and the Sanctum draw shadows with `ctx.ellipse` (anti-aliased); battle shadows are built pixel by pixel | build the diorama shadow the same way |
| DR-17 | low | `src/game/screens/battle.ts` | battle seeds come from `Math.random` and are never shown: a reported battle cannot be replayed | R-12 |
| DR-18 | low | `tools/balance.ts` | re-implements the mulberry32 generator instead of using `Rng` | import `Rng` |
| DR-19 | trivial | `src/main.ts` | `?? STARTERS.join(',')` is unreachable (`join` never returns nullish) | simplify |
| DR-20 | trivial | MECHANICS_GUIDE 2 | says the actor's meter resets to `selfTm`; the code caps it at 99 | add "(at most 99)" |
| DR-21 | medium | `src/main.ts`, `src/game/screens/academy.ts`, `src/game/screens/options.ts` | placeholder content is named in engine code: the deep-link defaults (`knight`, `monk`), the Academy demo cast and figures (`knight`, `monk`, `frostmage`, `tomblord`), the default zone `frostfang`; replacing the content breaks them | closed 2026-10-10: the defaults, the turn-meter racers, the skills figure and the dioramas come from the data (first and last champion, first zone); the demo line-up repeats a small roster |
| DR-26 | low | `src/game/data/campaign.ts` | Zone 1's enemies are copies of the two champions the player owns (stand-ins for the warriors of both worlds), so every stage is a near mirror match and the balance curve has one team per stage | design the enemies of Zone 1 (Jakub) |
| DR-27 | low | `tools/art/fx/`, `tools/art/palette.ts` | the effect groups are named after the proof of concept's zones (`sunscar.ts`, `nyota.ts`) and hold effects no champion uses any more; 31 of the 57 `MAT` materials are used by no module today | regroup by use; keep the materials as a library. In part 2026-10-10: the starters' effects live in faction modules (`azure_crown.ts`, `sanguine_dominion.ts`) |
| DR-28 | trivial | `tests/battle.test.ts`, `BattleScene.demo` | a status counts as fresh only when `startTurn` named its holder the acting unit: rule tests and demos that call `useSkill` alone place nothing fresh, so a self-buff there ticks at the next `endTurn` (the old rule). The fresh-status test calls `startTurn` first; the demo never ends a turn | call `startTurn` before `useSkill` in any new test about durations |
| DR-22 | medium | `src/game/battle/battle.ts` (`speed`, `attack`, `defense`) | status sizes (ATK Up/Down 25%, DEF Up 40%, DEF Down 30%, SPD Up/Down 25%) live in rule code instead of `StatusDef`; the status texts restate them | R-8: sizes as status data, texts built from them |
| DR-23 | low | `src/game/profile.ts` (now `archivist.ts`) | the save key `oathbound.profile.v1` carries the placeholder name; renaming the game, or a champion (DR-15), loses or breaks saves | closed 2026-10-08: the name is final and the save moved to `tlrol.save.v2`; a version 1 save is migrated once |
| DR-24 | low | `src/game/view/fx.ts` (`FxLayer.text`) | floating battle words stack by count, not by size: `RESIST` and `CRITICAL` can print over a damage number (seen with critical hits and resisted debuffs) | stack by each text's height, or give words and numbers their own lanes |
| DR-25 | low | `tools/art/font.ts` | bold made by a 1 px dilation filled m, w, M and W; `%` read as X; titles were bold scaled 2x-4x | closed 2026-10-07 (font A, e943256): hand-drawn bold, a redrawn `%`, a display face, micro digits |

## 11. Evolution roadmap

Small steps, each closing a gap from sections 6 and 10. Higher rows first: they are cheap and guard what already exists.

| ID | Step | Closes |
| --- | --- | --- |
| R-1 | Correct the Academy number, then add a content test that reads the numbers in skill descriptions, passive texts and Academy text (for example "Resonance: -15%") and compares them with the data | DR-1, INV-K12, INV-K13 |
| R-2 | Move the section 8 checks into a new test file (`tests/architecture.test.ts`) | section 8 |
| R-3 | Determinism test: two battles with the same teams and seed produce identical event logs | INV-C1 |
| R-4 | One module of asset schemas (atlas, fx, zone, UI JSON), imported by the art pipeline and by `view/assets.ts` | DR-3, INV-G5 |
| R-5 | `assertNever` default in `applyEvent`; the `passive` event carries its kind and the text comes from it | DR-14, INV-V3 |
| R-6 | Content tests: every A1 targets one enemy; effect names unique across modules; every category has its UI part and its colour in the interface ramps; the home zone as data (`FactionDef.zone`) with a test | INV-K8 to INV-K11, INV-K15, DR-12 |
| R-7 | One turn runner shared by `simulate()` and `BattleScene`, split where the player may need time: for example `Battle.beginTurn()` (advance, ticks, skip) and `Battle.finishTurn(decision)` (resolve, end of turn), so the interactive loop awaits the player between the two | DR-4 |
| R-8 | Rule constants in one exported module; status texts, Academy figures and stat tips built from them | DR-5, [MDA.md](MDA.md) ME1 |
| R-9 | Presentation metadata as data in `FxDef` / `fx.json` (additive, trail, arc, speed, anchor policy); the Arrow Rain volley as a projectile pattern instead of an id check | DR-13 |
| R-10 | Archivist methods (`setTeam`, `markRead`, `setSettings`; `markSeen` is done, on the Reliquary) and `Battle` methods for the demo reset, so writes go through their aggregates | DR-15, section 4.1 |
| R-11 | Save validation on load (drop unknown ids) and a migration hook for version 2 and id renames; done 2026-10-08 except renames (a rename table in `readSave`) | INV-P6 |
| R-12 | Show the seed on the results panel and accept `&seed=` for replays and bug reports | DR-17, [MDA.md](MDA.md) T7 |
| R-13 | Guard the battle route (stage open, team owned) unless a debug flag is set | DR-11, INV-P4 |
| R-14 | Add the dynamics KPIs of [MDA.md](MDA.md) 5.2 to `npm run balance` as section 5 | [MDA.md](MDA.md) 5.2 |
| R-15 | A check that runs `npm run art` and fails if `public/assets` changes | INV-G4 |

## 12. Definition of done for domain changes

- **Language:** new terms are in section 2; a new homonym is listed in 2.5.
- **Contexts:** the section 8 checks pass; nothing new crosses a "must not" in section 3.
- **Invariants:** a new rule has a row in section 6 and a check behind it (a type, a test, the balance tool or the audit); "convention" needs a reason.
- **Events:** a new event kind has its order (section 5), its cue on screen and its place in the Academy.
- **Text:** every number in skill descriptions, status texts, the Academy and the guides equals its source of truth.
- **Docs:** MECHANICS_GUIDE, GAME_STRUCTURE, [MDA.md](MDA.md) (impact card, baseline, decision log) and this document are updated in the same change.
