# Domain Model (DDD)

How Oathbound's domain is cut into bounded contexts, what every term means and which identifier carries it, which objects own which rules, which invariants must always hold and what enforces them, and how to extend the model without breaking it. [MDA.md](MDA.md) says what the game must make the player feel; this document says how the code must stay shaped so that it keeps doing so, iteration after iteration.

Companion guides: [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) (the rules), [GAME_STRUCTURE.md](GAME_STRUCTURE.md) (content and screens), [ART_GUIDE.md](ART_GUIDE.md), [UI_GUIDE.md](UI_GUIDE.md).

Snapshot: commit `8dd9a26`, 2026-10-06. Every dependency rule in section 8 and every "true today" in section 6 was checked against that commit.

---

## 1. The domain

**Core domain:** a turn-meter battle whose outcome is decided by readable, data-defined kits, and which is shown as frame-accurate pixel-art choreography. Everything else exists to feed it content, to present it, or to keep it honest.

| Subdomain | Type | Why it matters | Code |
| --- | --- | --- | --- |
| Combat resolution | core | the heart of play; must stay pure, deterministic and tested | `src/game/battle/` |
| Content design: kits, stages, norms | core | the game's variety lives in the kits; the norms hold their quality | `src/game/data/`, `norms.ts`, `tools/balance.ts` |
| Battle presentation | core (experience) | turns rule events into spectacle ([MDA.md](MDA.md) AE2) | `src/game/view/` |
| Procedural art | supporting, strategic | the entire look, generated and versioned | `tools/art/`, `public/assets/` |
| Progression and collection | supporting | the recruit loop, stars, unlocks | `src/game/profile.ts`, `campaign.ts`, `src/game/screens/` |
| Teaching (the Academy) | supporting | learnability ([MDA.md](MDA.md) AE4) | `codex.ts`, `screens/academy.ts` |
| Quality tooling | supporting | the guardrails | `tests/`, `tools/balance.ts`, `tools/art/audit.ts`, `tools/shots.ts` |
| Engine and UI kit | generic | canvas scaling, game clock, font, particles, immediate-mode UI | `src/engine/`, `src/game/ui/` |
| Persistence | generic | the save game | `profile.ts` (`localStorage`) |

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
| Status application | the rule that places a status: chance, turns, recipients, value, per hit | `StatusApp` |
| RESIST | a debuff whose chance roll failed | `resist` event |
| Shield | absorbs damage before HP; its value is a fraction of the caster's max HP | `shield`, `StatusInst.value` |
| Strong / weak hit | ±20% damage from the affinity cycle | `affinityEdge`, `edge` |
| Execute | bonus multiplier against targets below an HP fraction | `SkillDef.execute` |
| Dispel | removes every buff from the targets before the first hit | `stripBuffs`, `dispel` event |
| Cleanse | removes one debuff from each ally on the last hit | `cleanse` |
| Lifesteal | heals the actor by a fraction of the HP damage dealt | `lifesteal` |
| Turn meter boost / drain | adds to the other allies' meters, or takes from the targets' | `tmAllies`, `tmTargets`, `tm` event |
| Kept meter | the actor ends its turn with this meter instead of 0 | `selfTm`, `Unit.pendingTm` |
| Counterattack | the `counter` status, and the A1 it answers with | `counter`, `SkillResult.counter` |
| Passive | a rule that wakes by itself: Undying, Overdrive | `PassiveDef.kind`, `Unit.revived`, `Unit.overdriven` |
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
| Kit | a champion's three skills and its passive | `ChampionDef.skills`, `.passive` |
| Rarity | sets the stat budget and the card frame | `Rarity`, `RARITIES`, `RARITY_BUDGET` |
| Affinity | Force, Wild, Arcane (a cycle) and Void (outside it) | `Affinity`, `AFFINITIES` |
| Role | Tank, Bruiser, Damage, Support, Control: how the budget is spent | `Role`, `ROLES` |
| Faction | one of the seven peoples; picks the home zone and the material language | `FactionId`, `FACTIONS` |
| Signature hue | the champion's colour in the UI and its art | `ChampionDef.color` |
| Muzzle | where projectiles leave a ranged champion's sprite | `ChampionDef.muzzle` |
| Approach | how the actor travels before the attack | `Approach` |
| Stat score, budget | weighted stat sum, and its target per rarity (±5%) | `statScore`, `budgetDelta`, `BUDGET_TOLERANCE` |
| Norms | the numeric guardrails for stats, skills and statuses | `norms.ts`, `auditChampion` |
| Impact | win rate of random teams that include a champion | `tools/balance.ts` section 3 |
| Campaign curve | auto win rate of every ownable team against each stage | `tools/balance.ts` section 4 |

### 2.3 Campaign and progression

| Term | Meaning | In code |
| --- | --- | --- |
| Location (chapter) | a campaign chapter with one zone, opened by a `requires` stage | `LocationDef` |
| Stage | one battle of the campaign, id `"<chapter>-<n>"` | `StageDef` |
| Recruit, first clear | the first win of a stage recruits its champion | `StageDef.recruit`, `recordClear` |
| Starters | the champions owned from the start | `STARTERS` |
| Roster | the champions the player owns | `roster()` |
| Collection | every champion, owned or locked | `CollectionScreen` |
| Open / cleared / locked | a stage the player may fight / has won / may not fight yet | `stageOpen`, `cleared` |
| Frontier | the newest playable stage | `frontier()` |
| Stars | 3, 2 or 1 by champions lost; the best is kept | `starsFor`, `Profile.stars` |
| Profile | the save game | `Profile`, `loadProfile`, `saveProfile` |
| Fresh (NEW) | recruited, not yet opened on the champion page | `Profile.fresh` |

### 2.4 World, presentation and art

| Term | Meaning | In code |
| --- | --- | --- |
| Zone (combat background) | where battles happen: behaviour, art, built layout, runtime renderer | `ZoneDef`, `ZoneArt` (art module), `ZoneJson`, `ZoneView` |
| Home zone | the zone a faction's champions stand in outside battle | `homeZone()` |
| Diorama | a living zone behind a menu, with champions standing in it | `Diorama`, `Figure` |
| Prop, prop kind | a zone sprite and how it behaves: static, loop, pulse, fire | `PropKind`, `PropPlacement` |
| Ambient | the zone's weather: snow, sand, motes | `ZoneDef.ambient` |
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
| Chapter, block, figure (Academy) | a page of the Academy, its parts, a live illustration | `Chapter`, `Block`, `FigureId` |

### 2.5 Homonyms

The same word means different things in different contexts. That is legitimate in DDD, but it must be known.

| Word | Meanings | Rule |
| --- | --- | --- |
| Champion | `ChampionDef` (catalog), `Unit` (battle), `UnitView` (screen), `Figure` (diorama) | rules code speaks of units; content code of champions |
| `ChampionArt` | the art module (`tools/art/char.ts`) vs the loaded atlas (`src/game/view/assets.ts`) | qualify by context: "art module" vs "atlas" |
| `ZoneArt` | the painter module (`tools/art/zones/shared.ts`) vs the loaded images (`src/game/view/assets.ts`) | same |
| Figure | an Academy illustration (`FigureId`) vs a champion in a diorama (`Figure`) | say "Academy figure" or "diorama figure" |
| Screen | the canvas (`engine/screen.ts`, imported as `Canvas`) vs a route state (`app.ts`) | keep the `Canvas` alias |
| Turn | a unit's turn vs the global counter "Turn N" vs a status duration ("2 turns" of the holder) | a duration always counts the holder's own turns |
| Effect | a visual effect (fx) vs a status effect | say "status" for rules, "effect" or "fx" for visuals |
| Hit | a `HitDef`, a hit frame, the `hit` index of an event | they are one concept seen from three sides and must stay equal in number |
| Power | stage `power` vs balance "impact" vs stat score | never call a stat score "power" |

## 3. Bounded contexts

| Context | Responsibility | Owns | Code | Must not |
| --- | --- | --- | --- | --- |
| C1 Combat | resolve battles | `Battle`, `Unit`, `StatusInst`, `SkillResult`, `BattleEvent`, `decide`, `simulate`, `Rng` | `src/game/battle/` | import view, screens, profile or engine; read `Math.random` or the clock |
| C2 Catalog | define content | `ChampionDef`, `SkillDef`, `StatusDef`, categories, `LocationDef`, `StageDef`, `ZoneDef`, `Chapter` | `src/game/data/` | import anything but `types.ts` (ARCH-1); hold behaviour beyond lookups and pure helpers |
| C3 Balance governance | keep content inside the norms | norms, impact and curve bands | `norms.ts`, `tests/content.test.ts`, `tools/balance.ts` | change content by itself; it only judges |
| C4 Progression | the player's state and what it unlocks | `Profile` and its policies | `src/game/profile.ts` | know about rendering |
| C5 Battle presentation | play rule events as choreography | `BattleScene`, `UnitView`, `FxLayer`, `Hud`, `ZoneView`, `Assets` | `src/game/view/` | decide outcomes; import screens, app or profile |
| C6 Application and screens | routes, input, flow between screens | `App`, `Router`, screens, `Ui`, `Scroller` | `src/game/app.ts`, `src/main.ts`, `src/game/screens/`, `src/game/ui/` | duplicate rules |
| C7 Academy | teach the rules | chapters and figures | `codex.ts`, `screens/academy.ts` | invent numbers (it restates C1 and C2) |
| C8 Art pipeline | generate every pixel | `CharDef`, `ChampionArt`, `FxDef`, `ZoneArt`, palette, renderer, build, audit | `tools/art/` | be imported by `src/` |
| C9 Engine | generic runtime services | `Screen`, `Clock`, `BitmapFont`, `Particles` | `src/engine/` | import anything from `src/game` |

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
        └──────────────────────────────────┘      │ (profile.ts)         │
                                                   └──────────────────────┘
   C7 Academy restates C1 and C2 in text and figures (conformist copy).
   C9 Engine serves C5 and C6.
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
| C6 → C4 | application service → domain + repository | `stageOpen`, `recordClear`, `saveProfile` | content tests (profile) | screens also mutate `Profile` fields directly (DR-15) |
| C6 → C5 | anti-corruption seam | `BattleHooks` (`finish`, `next`, `retry`, `exit`, `settings`) | design | none: the scene knows nothing of profiles or routes, keep it so |

## 4. Tactical model

### 4.1 Combat (C1)

- **Aggregate root: `Battle`.** The consistency boundary is one fight. It owns the units, the seeded `Rng` and the turn counter. State changes go through its methods: `advance`, `startTurn`, `useSkill`, `endTurn`, `addStatus`, `applyDamage`, `heal`.
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
3. Dispel: every buff removed from the targets (events at hit 0).
4. For each hit `k`, for each living target: roll damage, then apply it (the shield absorbs first and expires at 0; then death, Undying or Overdrive), then the lifesteal heal, then the per-hit status rolls.
5. On the last hit: ally heals, cleanse, status applications in the order written in the skill (recipients by `to`), target meter change, ally meter change.
6. The kept meter (`selfTm`) waits for `endTurn`.
7. Counterattacks: each damaged, living enemy defender that holds Counter and is neither stunned nor frozen answers once with its A1 at the actor. Counters set no cooldown, keep no meter and are never countered.

### 4.2 Catalog (C2)

- **`ChampionDef` is the root of a definition:** identity, stats, exactly three skills (a tuple type), an optional passive. Definitions are treated as immutable at runtime, by convention only: they are plain objects, not frozen.
- **Registries:** `CHAMPIONS` (array order = collection order), `STATUSES` (keyed by `StatusId`, exhaustive by type), `LOCATIONS` (array order = campaign order; stage order inside a location = unlock order), `ZONES`, `CHAPTERS`, and `RARITIES`, `AFFINITIES`, `FACTIONS`, `ROLES` (keyed by their union types, exhaustive by type).
- **Lookups fail fast:** `champion()`, `stage()`, `locationOf()`, `zone()` and `chapter()` throw on an unknown id.
- **Ids are the integration keys between contexts**, and therefore published identifiers:

| Id | Joins |
| --- | --- |
| champion id | data module, art module, atlas file, portrait, `Profile.unlocked/team/fresh`, `STARTERS`, stage `enemies` and `recruit`, URLs (`&team=`, `&champion=`) |
| skill id | skill icon, Academy demo, `?demo=`, special cases in `scene.ts` (`arrow_rain`) |
| fx name | `hits[].fx`, `projectile`, `castFx`, `actorFx`, the `ADDITIVE` set and special cases in `scene.ts` |
| zone id | `ZoneDef`, `ZoneArt`, `public/assets/zones/<id>/`, `LocationDef.zone`, `homeZone()` |
| stage id | `Profile.stars` keys, `LocationDef.requires`, URLs (`&stage=`, `?progress=`) |
| status id | `StatusId`, status icon, Academy `statuses` blocks, `status_<id>` chapter icons |

### 4.3 Balance governance (C3)

- **Policies:** `statScore` and the budget per rarity, `STAT_LIMITS`, `SKILL_NORMS`, `STATUS_NORMS` (all through `auditChampion`), `IMPACT_BAND` and `CURVE_BANDS` (in `tools/balance.ts`, DR-10).
- **The reference player is the AI.** Every band is measured on auto play; changing `ai.ts` re-calibrates all of them ([MDA.md](MDA.md) T2).

### 4.4 Progression (C4)

- **Aggregate root: `Profile`** (`version: 1`): `unlocked`, `stars`, `team`, `fresh`, `read`, `settings`.
- **Policies:** `isUnlocked` (starters are implied), `roster`, `cleared`, `locationOpen`, `stageOpen`, `frontier`, `recordClear` (stars only go up; recruit on the first clear only), `totalStars`, `unlockEverything`.
- **Repository:** `loadProfile` and `saveProfile` under `oathbound.profile.v1`; every access is guarded; missing fields take defaults; another version resets the profile.
- **Writers:** `recordClear` saves by itself; screens write `team`, `fresh`, `read` and `settings` directly and call `app.save()` (DR-15).

### 4.5 Presentation (C5)

- **`BattleScene`** is the application service of one battle and its view model: the interactive turn loop, player choice (`awaitChoice`, `pickSkill`, `clickUnit`), choreography (`perform`), rendering and input.
- **`UnitView`** holds displayed values (HP, lag HP, shield, TM, statuses) that chase the rules while events play; `snap()` sets them to the rules' state at the end of every top-level action.
- **`FxLayer`** (effects, projectiles, floating text), **`Hud`** (meter track, bars, panels, results), **`ZoneView`** (backdrop, tiles, props, ambience, light).
- **Presentation policy written as code, keyed by id:** the `ADDITIVE` effect list, projectile trails (hex colours), arcs and speeds, the Arrow Rain volley, and special placement for `crack`, `holy` and `ice_spikes` (DR-13).

### 4.6 Art pipeline (C8)

- **Models:** `CharDef` (rig, dims, animations, `build`), `ChampionArt` (`char`, `iconBg`, icons keyed by skill id), `FxDef`, `ZoneArt` (tiles, backdrop, props, `kinds`, `layout`, `horizon`), the palette tables (`MAT`, `ACCENT`, `INK`, `FXR`, `UIR`) and `LIGHT_DIR`.
- **Products:** `build.ts` writes atlases and JSON to `public/assets/` (and zone previews to `docs/images/`); the output is meant to be byte-identical between runs and is committed with the code that needs it.
- **Proof:** `audit.ts` checks the products against [ART_GUIDE.md](ART_GUIDE.md).

## 5. Domain events

`BattleEvent` is the language in which the rules tell the view what happened. Every kind must have a cue on screen ([MDA.md](MDA.md) DY11).

| Kind | Emitted by | `hit` | Payload | On screen | Taught in |
| --- | --- | --- | --- | --- | --- |
| `damage` | `applyDamage` (skill hits, Poison and Burn ticks) | hit index; 0 for ticks | `amount` after shields, `absorbed`, `crit`, `edge`, `dot` | number (crit: gold, 2x, `CRITICAL`), `STRONG HIT` / `WEAK HIT`, `ABSORB n`, flash, hurt, sparks, hit-stop | Damage & Critical Hits, Affinities |
| `heal` | `heal` (lifesteal, ally heals, Regen) | hit index, last hit, or 0 | `amount` | green `+n`, sparkles | Buffs (Regen), Special Mechanics (lifesteal) |
| `blocked` | `heal` under Heal Block | as `heal` | - | `HEAL BLOCKED` and its icon | Debuffs |
| `status` | `tryApply`, Overdrive | last hit, or the hit for per-hit rolls | `status`, `turns` | the status name, plus a cue (Taunt, Poison, Burn, Counter, or a buff/debuff burst); stun stars and the ice block as overlays | Buffs, Debuffs, Crowd Control |
| `resist` | `tryApply` (failed debuff roll; failed buff rolls emit nothing) | as `status` | `status` | `RESIST` | Debuffs |
| `expire` | `endTurn`; a shield used up in `applyDamage` | 0, or the hit | `status` | the icon disappears; ice shatters | Buffs, Debuffs |
| `cleanse` | `useSkill` | last | `status` | `CLEANSED` | Special Mechanics |
| `dispel` | `useSkill`, before the hits | 0 | `status` | `-NAME` and a dispel burst | Buffs, Special Mechanics |
| `tm` | `useSkill` (`tmTargets`, `tmAllies`) | last | `delta` | `+n% TURN` / `-n% TURN` | Turn Meter & Speed, Special Mechanics |
| `revive` | `applyDamage` (Undying) | hit | `hp` | fall, tomb-light helix, `UNDYING!`, rise | Special Mechanics |
| `passive` | `applyDamage` (Overdrive) | hit | `name` | banner with the name, burst, `OVERDRIVE!` (fixed text, DR-14) | Special Mechanics |
| `death` | `applyDamage` | hit | - | death animation, fade | The Basics |

**Ordering guarantees.** Start of turn: `damage` (Poison), `damage` (Burn), `heal` or `blocked` (Regen). Inside one damage instance: `expire` (a used-up shield), `damage`, then `revive`, `death` or `passive` with its `status` events. Within an action, the resolution order of section 4.1. End of turn: one `expire` per status that ran out. Counterattack results follow the action that provoked them, in the order the defenders were hit, and the view plays them after the attacker is back in formation.

## 6. Invariants

What must always be true, and what holds it true. **Type**: the compiler. **Test**: `npm test` (`tests/battle.test.ts`, `tests/content.test.ts`). **Balance**: `npm run balance`. **Audit**: `npm run audit`. **Code**: one code path, with no check. **Convention**: nothing; true today because people kept it. Every convention is a gap that section 11 proposes to close.

### 6.1 Combat

| ID | Invariant | Enforced by |
| --- | --- | --- |
| INV-C1 | Same teams, options and seed give the same battle, event for event | code (only `Rng` draws numbers in `battle/`); no test (R-3) |
| INV-C2 | The next actor has the smallest (100 - TM) / SPD; ties go to higher SPD, then unit order | code; test "fastest unit acts first" |
| INV-C3 | TM stays within 0-100; after acting it is 0 or the kept meter (max 99); a dead unit has TM 0 | code; tests on reset and `selfTm` |
| INV-C4 | A status appears at most once per unit; reapplying keeps the longer duration and the larger shield | code (`addStatus`); no test |
| INV-C5 | Durations count the holder's own turns and tick at its turn end, also on a skipped turn | code in both turn loops; test on Freeze |
| INV-C6 | A skill with cooldown N is unavailable for the holder's next N turns | code; test on Shield Bash |
| INV-C7 | Single-target enemy skills must target a taunter while one lives; AoE and counterattacks ignore Taunt | code; test (Taunt vs single and AoE; the counter case is untested) |
| INV-C8 | Every hit deals at least 1; shields absorb before HP, except Poison and Burn | code; tests on shields and ticks |
| INV-C9 | Heal Block stops every heal (skills, Regen, lifesteal) and says so | code; test for skill heals only |
| INV-C10 | Each damaged, living enemy defender with Counter and no control answers once with A1; counters are never countered | code; test |
| INV-C11 | Undying fires once, leaves `value` x max HP, removes debuffs, keeps buffs | code; test |
| INV-C12 | Overdrive fires once, only on a non-lethal hit that ends below `value` | code; tests |
| INV-C13 | A dead unit has no statuses and is never a target | code; test |
| INV-C14 | A battle ends when one side has no living unit; it always ends | code; test (40 seeded auto battles); termination relies on every A1 dealing damage |

### 6.2 Catalog

| ID | Invariant | Enforced by |
| --- | --- | --- |
| INV-K1 | Champion ids are unique; rarity, affinity, faction and role exist | test |
| INV-K2 | Stats within ±5% of the rarity budget and inside the limits | test, balance 1 |
| INV-K3 | Slots in order A1-A2-A3; cooldowns, multipliers, durations and the guaranteed-control slot within the norms | type (tuple of three), test, balance 2 |
| INV-K4 | `hits.length` equals the hit frames of the animation; leap needs `jump`, `actorFx` needs `cast`; Undying needs `rise` | test |
| INV-K5 | Every effect a skill names exists; a champion with a projectile has a `muzzle` | test |
| INV-K6 | Every champion has an atlas, a portrait and one icon per skill | test |
| INV-K7 | Every status has an icon and is taught in the Academy; Academy demos and icons exist | test |
| INV-K8 | Every faction, affinity, role and rarity has its UI part (`emblem_`, `gem_`, `role_`, `card_`) | convention: screens throw on a missing part (R-6) |
| INV-K9 | Every A1 targets a single enemy, because counterattacks answer with A1 | convention, true today (R-6) |
| INV-K10 | Effect names are unique across effect modules (a later module would silently override an earlier one) | convention, true today: 63 names (R-6) |
| INV-K11 | Every faction has a deliberate home zone | convention: `homeZone()` falls back to Frostfang (DR-12) |
| INV-K12 | Numbers in skill descriptions equal the data | convention, true today for all 39 skills (R-1) |
| INV-K13 | Numbers in the Academy, its figures and the stat tips equal the rules | convention, one drift today (DR-1, DR-5, R-1) |
| INV-K14 | Definitions do not change at runtime | convention: objects are not frozen |
| INV-K15 | The interface ramps repeat the category colours: `UIR.rarity` and `UIR.affinity` base entries and `UIR.faction` glyphs (`palette.ts`) equal the colours in `meta.ts` | convention, true today for all 16 (R-6) |

### 6.3 Campaign and progression

| ID | Invariant | Enforced by |
| --- | --- | --- |
| INV-P1 | Stage ids are unique; 1-3 enemies, all known champions; zones known; map positions inside the map | test |
| INV-P2 | Every location ends on a boss stage; `requires` names an existing stage | test |
| INV-P3 | Every non-starter is recruited by exactly one stage, and only where it is fought | test |
| INV-P4 | A stage opens when its location is open and the previous stage there is cleared | test (profile); the battle route does not check it (DR-11) |
| INV-P5 | A recruit happens on the first clear only, and only if not owned; stars only go up | test |
| INV-P6 | Every id stored in the profile exists in the catalog | convention: an unknown id makes `champion()` throw (DR-15) |
| INV-P7 | A team holds 1-3 different owned champions | the team screen only |
| INV-P8 | The profile has schema version 1; missing fields take defaults; another version resets it | code (`loadProfile`) |

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

## 7. Policies: where decisions live

| Policy | Decides | Lives in |
| --- | --- | --- |
| Turn order | who acts next | `Battle.advance` |
| Targeting | who may be chosen; Taunt | `Battle.validTargets` |
| Damage | how much a hit deals | `Battle.rollDamage` |
| Status rules | apply, refresh, resist, tick, expire | `tryApply`, `addStatus`, `endTurn` |
| Cooldowns | when a skill is ready | `useSkill`, `endTurn`, `ready` |
| Death and passives | death, Undying, Overdrive | `Battle.applyDamage` |
| AI | skill and target | `ai.ts`: highest `ai.priority` ready skill (Serenity's 4 puts healing above the A3 when an ally is hurt); `allyHurt` below 70% HP or with a debuff; control aims at the uncontrolled with the highest ATK; dispel at the most buffed; otherwise 70% lowest HP%, 30% random |
| Stars | 3 / 2 / 1 | `starsFor` |
| Unlocks | open stages and locations | `stageOpen`, `locationOpen`, `frontier` |
| Rewards | recruit on first clear | `recordClear` |
| Difficulty | enemy scaling | `Battle` constructor (`power` on HP and ATK, `bossHp`), `campaign.ts` |
| Home zone | where a faction stands outside battle | `homeZone()` |
| Demo casting | who demonstrates a skill | `screens/battle.ts`: the owner and two companions against three from the far end of the roster, seed 7 |
| Presentation | approach, layers, additive light, projectiles | `BattleScene.perform`, `spawnHitFx`, `ADDITIVE` |

## 8. Architecture rules

All true on the snapshot commit. Each rule is a fitness function: a check that fails when the shape of the code degrades.

| ID | Rule |
| --- | --- |
| ARCH-1 | Catalog modules import only `types.ts`; the champion registry also imports its champion modules. Catalog modules do not import each other. |
| ARCH-2 | `src/game/battle` imports only `src/game/data` and its own modules: no view, screens, UI, app, profile or engine. |
| ARCH-3 | The rules read no global randomness and no clock: only `Rng` draws numbers. |
| ARCH-4 | `src/game/view` never imports screens, the app or the profile; it talks back through `BattleHooks`. |
| ARCH-5 | `src/engine` imports nothing from the game. |
| ARCH-6 | `src/` never imports `tools/`. Tools may import `src/game/data` and `src/game/battle` (the balance tool, the world map). |
| ARCH-7 | Files in `public/assets` and the generated `docs/images` are rebuilt by `npm run art`, never edited by hand, and committed with the code that needs them. |

Checks for ARCH-1 to ARCH-6; each prints nothing when the rule holds (verified to catch a planted violation):

```bash
grep -rnE "^import" src/game/data | grep -vE "from '\.\.?/types'|champions/index\.ts:"   # ARCH-1
grep -rnE "from '\.\./(view|screens|ui|app|profile)|engine/" src/game/battle               # ARCH-2
grep -rnE "Math\.random|Date\.now|performance\.now" src/game/battle src/game/data          # ARCH-3
grep -rnE "from '\.\./(screens|app|profile)" src/game/view                                 # ARCH-4
grep -rnE "^import .* from '\.\./game" src/engine                                          # ARCH-5
grep -rnE "^import .*tools/" src                                                           # ARCH-6
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
| New stage or location | `campaign.ts` (enemies in formation order, `recruit` among them, map position) → `npm run art -- map` → tune `power` with `npm run balance` → [MDA.md](MDA.md) ME4 lean and DY9 shape → GAME_STRUCTURE 3 | test, balance |
| New faction | `FactionId`, `FACTIONS` → `UIR.faction` ramp and `emblem()` (`tools/art/ui/menu.ts`), `npm run art -- ui` → `homeZone()` → the Academy `champions` chapter (it names every faction) → the champion template and worksheet lists → ART_GUIDE 2.4 | test, audit |
| A rule constant | the constant → every copy listed in [MDA.md](MDA.md) ME1 → tests that assert the number → balance, and stage `power` re-tuned if the curve moved → [MDA.md](MDA.md) section 6 | test, balance |
| Rename an id | data and art modules and registries → `npm run art` → stages, `STARTERS`, tests, docs, URLs → a profile migration for stored ids (champion, stage) → special cases keyed by id in `scene.ts` | test, audit, typecheck |
| New AI behaviour | `ai.ts` → a test → MECHANICS_GUIDE 11 → full re-baseline: every band is calibrated on the AI | test, balance |
| New screen | [UI_GUIDE.md](UI_GUIDE.md) section 6 | typecheck, captures |

## 10. Drift register

Inconsistencies found while writing this document. Close one by fixing it and recording the fix here; never delete the row.

| ID | Severity | Where | What | Fix |
| --- | --- | --- | --- | --- |
| DR-1 | medium | `src/game/data/codex.ts` (Special Mechanics) | the Academy says Resonance drains 10% turn meter; the data (`starsinger.ts`) and MECHANICS_GUIDE say 15% | correct the text; R-1 |
| DR-2 | medium | `tests/battle.test.ts` | "runs every champion through battles" lists 10 champions by hand: Imara, Kwesi and Mwamba never run | iterate `CHAMPIONS` |
| DR-3 | medium | `tools/art/build.ts`, `tools/art/fx/kit.ts`, `tools/art/zones/shared.ts`, `tools/art/ui/index.ts` vs `src/game/view/assets.ts` | `ChampionAtlasJson`, `FxJson`, `ZoneJson` with `PropKind`, and `UiJson` are each declared twice, producer and consumer | R-4 |
| DR-4 | medium | `src/game/battle/sim.ts`, `src/game/view/scene.ts` | the turn structure is written twice; the balance numbers come from one copy, play from the other | R-7 |
| DR-5 | low | `statuses.ts`, `codex.ts`, `screens/academy.ts`, `screens/champion.ts` | rule numbers restated by hand: status texts, the Academy damage figure (4.8, ±20%, x1.25, x1.5, 0.92-1.08), the turn-meter figure's SPD values, the stat tips, the list of factions | R-1, R-8 |
| DR-6 | low | `.claude/skills/new-champion/templates/` | worksheet and data template list factions without `nyota`; the worksheet says only `undying` exists as a passive (`overdrive` does too) | update the lists |
| DR-7 | low | `.claude/skills/new-combat-background/templates/worksheet.md` | ambient options list `snow` and `sand`, not `motes` | update the list |
| DR-8 | low | `src/game/data/statuses.ts` | the header points to `tools/art/ui.ts STATUS`; icons live in `tools/art/ui/status.ts` | fix the comment |
| DR-9 | low | `tools/review.sh` | passes `seed=` and `target=` in the URL; the game reads neither (demos use seed 7 and the first target) | read them in `main.ts`, or drop them |
| DR-10 | low | CLAUDE.md, `tools/balance.ts` | "numbers stay inside norms.ts", but the impact and curve bands live in the balance tool and the rule constants in `battle.ts` | state the rule precisely, or move the bands into `norms.ts` |
| DR-11 | low | `src/game/screens/battle.ts`, `src/main.ts` | the battle route checks neither stage access nor ownership: deep links can record clears out of order | intended for screenshots; R-13 if progress ever carries value |
| DR-12 | low | `src/game/data/zones.ts` | `homeZone()` maps factions in code; a new faction silently gets Frostfang | R-6 |
| DR-13 | low | `src/game/view/scene.ts` | choreography keyed by id: the Arrow Rain volley, projectile trails as hex literals, arcs, slow projectiles, `crack` / `holy` / `ice_spikes`, the `ADDITIVE` list; each new projectile or light effect needs a code edit | R-9 |
| DR-14 | low | `src/game/view/scene.ts` | `applyEvent` is not exhaustive: a new event kind compiles and shows nothing; `passive` always reads `OVERDRIVE!` whatever the passive | R-5 |
| DR-15 | low | `src/game/profile.ts`, screens | profile fields are written from several screens and stored ids are never validated: a renamed champion makes `champion()` throw on load | R-10, R-11 |
| DR-16 | low | `src/game/screens/base.ts` | menu dioramas draw shadows with `ctx.ellipse` (anti-aliased); battle shadows are built pixel by pixel | build the diorama shadow the same way |
| DR-17 | low | `src/game/screens/battle.ts` | battle seeds come from `Math.random` and are never shown: a reported battle cannot be replayed | R-12 |
| DR-18 | low | `tools/balance.ts` | re-implements the mulberry32 generator instead of using `Rng` | import `Rng` |
| DR-19 | trivial | `src/main.ts` | `?? STARTERS.join(',')` is unreachable (`join` never returns nullish) | simplify |
| DR-20 | trivial | MECHANICS_GUIDE 2 | says the actor's meter resets to `selfTm`; the code caps it at 99 | add "(at most 99)" |

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
| R-10 | Profile methods (`setTeam`, `markSeen`, `markRead`, `setSettings`) and `Battle` methods for the demo reset, so writes go through their aggregates | DR-15, section 4.1 |
| R-11 | Profile validation on load (drop unknown ids) and a migration hook for version 2 and id renames | INV-P6 |
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
