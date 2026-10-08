# MDA: Mechanics, Dynamics, Aesthetics

The Loom: Reliquary of Legends is designed backwards from the experience it has to create. This document names the experiences the game is built for (**aesthetics**), the patterns that emerge when its rules run (**dynamics**), and the rules, numbers, content and presentation that produce them (**mechanics**). Every claim is traced to the code and every dynamic is measured, so a change can be judged before it ships. A change is good when it serves a target aesthetic, keeps every dynamic inside its band and passes the guardrails.

Rules in detail: [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md). Domain model, invariants and change playbooks: [DDD.md](DDD.md). Pixels: [ART_GUIDE.md](ART_GUIDE.md). Screens: [UI_GUIDE.md](UI_GUIDE.md).

Baseline: commit `8dd9a26`, 2026-10-06 (section 6).

---

## 0. How to use it

```
the designer reads   AESTHETICS  ->  DYNAMICS  ->  MECHANICS
the player meets     MECHANICS   ->  DYNAMICS  ->  AESTHETICS
```

| Step | Do | Section |
| --- | --- | --- |
| 1. Aim | name the aesthetic the change serves; a change that serves none is cut or re-scoped | 1 |
| 2. Predict | list the dynamics it moves, and in which direction | 2 |
| 3. Trace | find the mechanics it touches and the checks they require | 3, 4 |
| 4. Measure | run the checks and compare with the baseline; leaving a band is a decision, and it is logged | 5, 6, 9 |
| 5. Review | fill in the impact card in the pull request | 7 |

IDs: **AE** aesthetics, **DY** dynamics, **ME** mechanics, **T** tensions. A1, A2 and A3 always mean skill slots.

## 1. Aesthetic targets

Ranked. When two targets conflict, the higher one wins.

| ID | Aesthetic | MDA category | The player says | Rank |
| --- | --- | --- | --- | --- |
| AE1 | Tactical mastery | Challenge | "I won because I read the fight: who acts next, whom to focus, when to spend my A3." | 1 |
| AE2 | Readable spectacle | Sensation | "Every hit lands with weight, and I can see exactly what happened." | 1 |
| AE3 | Heroic collection | Fantasy, Discovery | "Everyone I beat can join me, and each one is a character with an idea of its own." | 2 |
| AE4 | Fair, learnable challenge | Challenge, Discovery | "When I lose, I know why and what to try next." | 2 |
| AE5 | A crafted, coherent world | Sensation, Fantasy, Narrative | "One hand painted all of this, and every place has a story." | 2 |
| AE6 | Respect for my time | Submission | "The game never wastes my time or fights my hands." | 3 |

**Not targeted, on purpose:** Fellowship (no multiplayer, no PvP), Expression beyond team building (no skins; gear comes with the Weaver Matrix, T11) and every monetisation dynamic (no currency, energy, gacha or pay walls: champions are recruited by play). A proposal that brings one of these in changes this table first. These exclusions were made for the proof of concept; for the real game they are open questions (section 8, T11-T18).

### AE1 Tactical mastery

- **Built from:** the turn-meter track in the HUD, cooldowns, Taunt, control and dispel answers, affinities with matchup counts, and an AI that a careful player beats.
- **Working when:** each turn offers at least one non-obvious choice (spend or hold an A3, which target, whom to protect); manual play beats auto by a visible margin; a lost battle can be explained from what was on screen.
- **Broken when:** one team or one skill dominates (impact outside 40-60%); outcomes follow RNG streaks more than choices; auto wins as often as a careful player.

### AE2 Readable spectacle

- **Built from:** frame-accurate hits (one `hits` entry per hit frame), hit-stop, flashes, shake, smears, floating numbers and keywords, banners for A2/A3, one key light, outlined champions on a low-contrast floor.
- **Working when:** every rules event has a cue at the moment it resolves; numbers and status icons stay legible; displayed HP equals the rules after every action.
- **Broken when:** effects or text cover units and bars; an event resolves silently; the view disagrees with the rules; the light or the palette breaks.

### AE3 Heroic collection

- **Built from:** the first-clear recruit and its ceremony, locked silhouettes in the collection, the champion page with every animation, lore and factions, a unique silhouette and hue per champion, and one signature mechanic per kit.
- **Working when:** every recruit changes which teams are possible (a new mechanic or a new answer, DY6); every champion is recognisable as a black silhouette.
- **Broken when:** a recruit is a stat variation of someone else; two champions read alike; a reward feels arbitrary (recruiting someone never fought is already blocked by a content test).

### AE4 Fair, learnable challenge

- **Built from:** the Academy (12 chapters, 5 live demos), tooltips on every unit, skill and status, on-screen keywords (`RESIST`, `STRONG HIT`, `HEAL BLOCKED`, `ABSORB`, `COUNTER`, `UNDYING!`, `OVERDRIVE!`), matchup counts in team select, deterministic rules, the balance norms, the campaign curve, stars as a mastery goal and a defeat panel that points to the Academy.
- **Working when:** the numbers taught equal the numbers used; the campaign stays inside its bands; difficulty rises in steps the player can see coming (the stage panel shows the enemy line-up and its power).
- **Broken when:** text and rules drift ([DDD.md](DDD.md) DR-1, closed 2026-10-07; DR-5 open); a stage spikes outside its band; a rule acts without a visible word.

### AE5 A crafted, coherent world

- **Built from:** the procedural pipeline (one palette, one top-left key light, cel bands, coloured outlines), zones with set dressing and ambience, faction material languages, stage blurbs and lore.
- **Working when:** `npm run audit` passes; new art cannot be told apart in style from the old; the floor frames the fight and the walls tell the story.
- **Broken when:** a sprite is mirrored (light on the wrong side), a gradient is smooth, a shape is anti-aliased, a floor is busy, or a hue family repeats inside a faction.

### AE6 Respect for my time

- **Built from:** auto battle and speed x1/x2/x3 saved as defaults, pause, retry, keyboard parity with the mouse, lists that scroll, short battles, no grind gates.
- **Working when:** a replay at x3 on auto takes well under a minute (14-30 s today); every screen works with arrows and Enter; input is ignored only while a screen dissolve covers the screen (170 ms).
- **Broken when:** an action takes longer than about 4 s at x1, a non-destructive action asks for confirmation, or a screen traps the keyboard.

## 2. Dynamics

For each dynamic: what happens, what drives it, the measured baseline, the band to hold, the aesthetics it serves, and what to watch. Sources of the numbers: section 6.

### DY1 The opening race

- **Happens:** Speed and a small random head start decide who acts first and in which order the openers fire. Lapping (one champion acting twice before another acts once) almost never happens.
- **Driven by:** `Battle.advance()` (time to act = (100 - TM) / SPD, ties to the higher SPD), roster SPD 92-118 inside the limits 90-125, starting meters 0-12%, SPD Up/Down at ±25%, and the turn-meter skills: Arrow Rain and Resonance -15%, Rhythm of the March +20%, Mirage Assault keeps 25%.
- **Baseline:** the fastest champion acts 1.28x as often as the slowest, so lapping needs SPD Up, SPD Down or a meter skill. The measured proxy, the same champion acting twice in a row, happens 0.07 times per battle (0.00-0.14 by stage). The player side opens in 21% (2-1) to 80% (2-4) of battles, depending on the line-ups.
- **Band:** fewer than 0.5 double turns per battle unless a kit is explicitly about tempo; SPD inside the limits.
- **Serves:** AE1. **Watch:** widening SPD or stacking SPD Up with meter boosts creates lapping, which snowballs and frustrates (AE4). See T1.

### DY2 The opener decides

- **Happens:** a battle gives each champion about 3.5 turns, so most A3s fire once, and the AI fires them first. The first round of A3s and A2s shapes the fight; holding an A3 for the right moment is the clearest edge a person has over auto.
- **Driven by:** cooldowns (A2 3, A3 4-5: a skill used now is ready again N + 1 own turns later), `decide()` (the highest-priority ready skill first), battle length (DY3).
- **Baseline:** 20.7 actions per random 3v3 battle (8-56), so about 3.5 turns per champion. AI slot use: A1 40%, A2 27%, A3 33%. Execute skills are spent as openers: Mirage Assault is cast on Akhet's first turn 96% of the time, with its target already below the 40% threshold only 2% of the time when cast; Skullsplitter 88% and 21%.
- **Band:** 12-30 actions per campaign battle on average, so cooldowns matter and every champion gets at least three turns (1-1, the tutorial, is exempt).
- **Serves:** AE1, AE2 (A2 and A3 are the set pieces, with banners). **Watch:** under about 12 actions, battles become one-shot races where cooldowns stop mattering; over about 35, they become A1 attrition. Auto play under-measures timing kits: the Damage role sits at 42-44% impact (T2).

### DY3 Focus fire and time-to-kill

- **Happens:** removing one enemy early, and with it all its turns, is the main tactical axis. Protection matters because it breaks focus.
- **Driven by:** damage = ATK x mult x 4.8 x 100 / (100 + DEF) x modifiers; the AI focusing the lowest HP% 70% of the time; Taunt, Shield, heals and execute.
- **Baseline:** with crits counted and the roster's average DEF (68.5), one A1 takes 18% (Sir Aldric) to 34% (Brakka) of an average champion's 1,302 HP: 2.9 to 5.6 A1s to kill. Campaign battles last 10-26 actions on average.
- **Band:** A1 time-to-kill against the average champion between 2.5 and 6 hits. A full-HP one-shot happens only as the rare product of set-up, crit and a strong hit, never as a kit's plan.
- **Serves:** AE1, AE2. **Watch:** raising an ATK limit or a multiplier norm shortens time-to-kill for everyone and collapses DY2 and DY6.

### DY4 Counter-picking by affinity

- **Happens:** team select is a real decision when a stage leans toward one or two affinities.
- **Driven by:** Force > Wild > Arcane > Force at ±20%, Void neutral; the `+n -n` matchup counts on every roster card; the three starters covering the three cycle affinities.
- **Baseline:** in random battles 22% of hits are strong and 22% weak. The lean per stage (enemies hit strong / weak by each attacking affinity) is in ME4. Chapter I rewards Wild, chapter II Arcane (2-2: Arcane +3, Wild -3), chapter III Force (3-2: +2). The final boss 3-3 is neutral: every cycle affinity is +1 / -1.
- **Band:** every chapter has at least one stage with a lean of 2 or more for some affinity. A neutral line-up is a deliberate exam, normally a boss.
- **Serves:** AE1, AE4.

### DY5 Control and denial

- **Happens:** a few turns per battle are taken away; landing control just before the enemy's big turn is a timing skill.
- **Driven by:** Stun and Freeze for 1 turn (guaranteed only on an A3), chance debuffs on A1/A2 with `RESIST`, the AI aiming control at champions not already controlled, controlled champions not counterattacking.
- **Baseline:** 1.47 skipped turns per random battle, about 7% of all turns (0.39-2.07 per battle by stage, at most 11.5% of the actions in the short 1-1). 29% of status rolls show `RESIST` (11-31% by stage).
- **Band:** skipped turns at most 12% of actions; at most 35% of status rolls resisted; hard control 1 turn (norm).
- **Serves:** AE1. **Watch:** a chance stun on an A2 (Shield Bash, 75%) plus a guaranteed A3 stun on the same team can chain one target, and there is no immunity window (T10).

### DY6 Protection versus answers

- **Happens:** rock-paper-scissors at the status layer. Every protection has an answer, and each recruit tends to bring one.
- **Driven by:** Taunt against AoE (AoE ignores Taunt); Shield against Poison and Burn (both ignore shields) and Dispel; heals, Regen and lifesteal against Heal Block; Counterattack against control (a controlled champion cannot counter) and careful target choice; buffs, Overdrive included, against Dispel; debuffs on your team against Cleanse.
- **Baseline:** 1.27 counterattacks per random battle (3.09 in 2-4, where Kha'zir's Vigil covers the whole team); about one dispel per battle in the Sunscar stages (0.79-1.33).
- **Band (answer availability):** every protection the player meets has an answer the player can own by then.

| Protection | First met | Answer the player can own by then (stage that recruits it) |
| --- | --- | --- |
| Heals, Regen, cleanse | 1-1 (Tenzo) | focus the healer first; Heal Block later: Akhet (2-1) |
| Lifesteal | 1-2 (Vorhaal) | focus and control: Tenzo (1-1) |
| Taunt | 2-1 (Kha'zir) | AoE: Whirlwind, Arrow Rain (starters); Dispel: Kha'zir (2-2) |
| Counterattack | 2-1 (Kha'zir) | Freeze and Stun: Tenzo (1-1), Ysolde (1-2); target choice |
| Undying | 2-4 (Anhotep) | two kills, with Heal Block and burst kept for the second life: Akhet (2-1), Nefret (2-3) |
| Shield on an enemy | 3-1 (Imara) | Poison and Burn: Sylwen (starter), Akhet (2-1), Nefret (2-3); Dispel: Kha'zir (2-2) |
| Overdrive | 3-3 (Mwamba) | Dispel: Kha'zir (2-2); burst from above half to low in one go |

Debuffs on the player's team (SPD Down from 1-1, DEF Down from 1-2, Poison and Weaken from 2-1) are answered by Cleanse: Tenzo from 1-2 on, Kwesi from 3-3 on.

- **Serves:** AE1, AE3 (each recruit is an answer), AE4.

### DY7 Boss second acts

- **Happens:** from chapter II on, every boss has a visible turning point the player can plan for. Vorhaal (1-3) is a plain HP boss: the first boss teaches only the crown and the extra HP.
- **Driven by:** `BOSS_HP` x1.6, the crown and boss intro, Undying (Anhotep rises once at 25% HP with every debuff removed), Overdrive (Mwamba below 50% HP: ATK Up and DEF Up for 2 turns, once), and the Academy chapter that tells the plan.
- **Baseline:** Undying fires in 96% of 2-4 battles, Overdrive in 89% of 3-3 battles. Boss stages win 60-69% on auto.
- **Band:** each turning point fires in at least 80% of its boss battles and has a banner, an effect and a word; boss stages stay inside 40-80% on auto.
- **Serves:** AE2, AE3, AE1.

### DY8 Losses and stars

- **Happens:** winning is common; winning without losses is the mastery goal.
- **Driven by:** `starsFor` (3 when nobody fell, 2 for one loss, 1 otherwise), the best result kept per stage, every battle starting fresh.
- **Baseline:** auto wins in random battles split 26% / 46% / 28% into 3 / 2 / 1 stars. In the campaign 22-46% of auto wins earn 3 stars outside 1-1 (100%).
- **Band:** 15-60% of auto wins earn 3 stars on every stage except the tutorial, so a replay always has a goal that is reachable.
- **Serves:** AE1, AE4, AE6.

### DY9 Collection-driven progression

- **Happens:** every first clear widens the pool of teams. Each chapter introduces its faction in a two-enemy gate, works through three-enemy stages and ends on a boss.
- **Driven by:** `STARTERS`, the recruit on first clear (only someone fought there), locations opened by the previous boss, `power` per stage, and a balance curve computed over every team the player can own at that point.
- **Baseline:** the teams the player can field grow 1 → 4 → 10 → 20 → 35 → 56 → 84 → 120 → 165 → 220 from 1-1 to 3-3; auto win rates are 100 / 79 / 60 / 84 / 72 / 71 / 69 / 82 / 80 / 63%. The chapter gates (2-1, 3-1) field two enemies at power 1.35; the bosses run at power 0.80-0.95 with x1.6 HP.
- **Band:** the curve bands (first stage 85-100%, normal 55-92%, boss 40-80%); every chapter keeps the gate → stages → boss shape.
- **Serves:** AE3, AE4.

### DY10 Pacing

- **Happens:** at x1 a battle is a show worth watching; at x3 on auto it is a quick replay.
- **Driven by:** the choreography timings in `scene.ts` (meter slide 360 ms, AI pause 420 ms for enemies and 260 ms on auto, runs at 340-420 px/s, banners 1.5 s, pauses of 150-300 ms between steps and 750 ms on a skipped turn), the animation timings (ART_GUIDE section 7), hit-stop in real time, and `Clock.speed`.
- **Baseline (timed auto battles):** x1 takes 2.9-3.4 s per action, 60-90 s per battle; x3 takes 1.1-1.4 s per action, 14-30 s per battle. x3 is about 2.5x faster than x1, not 3x: hit-stop runs in real time, and the timing includes loading and the screen dissolve.
- **Band:** at most 4 s per action at x1, at most 1.5 s per action at x3.
- **Serves:** AE2 at x1, AE6 at x3.

### DY11 Learning by seeing

- **Happens:** the player learns each rule from the screen at the moment it applies, and can look anything up.
- **Driven by:** a number or keyword for every event, tooltips on units, skills and statuses, the Academy with demos that replay real skills, NEW badges and the count of unread chapters, matchup counts.
- **Baseline:** 16 of 16 statuses are taught (content test). Every battle event has a cue, and all except `expire` (the icon disappears) and `death` (an animation) carry a word. A failed buff roll (Imara's 50% Shield) is silent while a failed debuff shows `RESIST` (T9). The turn-meter numbers the Academy quotes match the skills (content test since 2026-10-07, DR-1 closed); its other numbers are restated by hand (DR-5).
- **Band:** every rule the player can trigger shows a word or an icon when it happens; every number in the Academy equals the rule.
- **Serves:** AE4, AE1.

## 3. Mechanics inventory

### ME1 Rule constants and where they live

The first source column is the truth. The last column lists every hand-written copy: when the number changes, all of them change in the same commit ([DDD.md](DDD.md) R-8 proposes deriving them instead). Numbers after a guide's name are its section numbers; Academy names are chapter ids in `codex.ts`.

| Mechanic | Value | Source of truth | Also written in |
| --- | --- | --- | --- |
| Turn meter | fills with SPD; next actor = smallest (100 - TM) / SPD, ties to higher SPD | `Battle.advance`, `TURN_FULL` | MECHANICS_GUIDE 2, Academy `turnmeter` |
| Starting meter | random 0-12% | `Battle` constructor | MECHANICS_GUIDE 2, Academy tip |
| Meter after acting | 0, or `selfTm` capped at 99 | `Battle.endTurn` | MECHANICS_GUIDE 2-3 |
| Damage | ATK x mult x 4.8 | `DAMAGE_SCALE` | MECHANICS_GUIDE 5, Academy damage figure (`academy.ts`) |
| Defense | x 100 / (100 + DEF) | `Battle.rollDamage` | MECHANICS_GUIDE 5, Academy `damage`, champion page stat tip |
| Critical hit | x1.5, rolled per hit with CRIT | `CRIT_MULT` | MECHANICS_GUIDE 5, Academy, champion page stat tip |
| Spread | x0.92-1.08; at least 1 damage | `Battle.rollDamage` | MECHANICS_GUIDE 5, Academy figure |
| Affinity | ±20%, Void neutral | `AFFINITY_BONUS`, `affinityEdge` (`meta.ts`) | MECHANICS_GUIDE 6, Academy `affinity`, `AFFINITIES` texts |
| Weaken | +25% damage taken | `WEAKEN_MULT` | `statuses.ts`, MECHANICS_GUIDE 5 and 7, Academy figure |
| ATK Up / ATK Down | ±25% | `Battle.attack` (inline) | `statuses.ts`, MECHANICS_GUIDE 5 and 7 |
| DEF Up / DEF Down | +40% / -30% | `Battle.defense` (inline) | `statuses.ts`, MECHANICS_GUIDE 5 and 7, Academy `damage` |
| SPD Up / SPD Down | ±25% | `Battle.speed` (inline) | `statuses.ts`, MECHANICS_GUIDE 2 |
| Poison / Burn | -5% / -6% max HP at turn start, through shields | `POISON_PCT`, `BURN_PCT` | `statuses.ts`, MECHANICS_GUIDE 3 and 7, Academy |
| Regen | +7.5% max HP at turn start | `REGEN_PCT` | `statuses.ts`, MECHANICS_GUIDE 7 |
| Shield | absorbs up to `value` x the caster's max HP | `Battle.tryApply`, `Battle.applyDamage` | MECHANICS_GUIDE 5 |
| Durations | the holder's own turns, ticking at its turn end; reapplying refreshes to the longer one, never stacks | `Battle.endTurn`, `Battle.addStatus` | MECHANICS_GUIDE 3 and 7, Academy `buffs`, `debuffs` |
| Cooldowns | A1 0, A2 3, A3 4-5 | `SKILL_NORMS` (`norms.ts`) | MECHANICS_GUIDE 4 and 10 |
| Hard control | 1 turn, guaranteed only on an A3 | `STATUS_NORMS` | MECHANICS_GUIDE 10, Academy `control` |
| Boss HP | x1.6 | `BOSS_HP` (`campaign.ts`) and the `Battle` default | MECHANICS_GUIDE 10, Academy `campaign` ("60% more HP") |
| Stage power | multiplies enemy HP and ATK | `StageDef.power`, `Battle` constructor | stage panel ("power 85%") |
| Stars | 3 / 2 / 1 by champions lost | `starsFor` (`sim.ts`) | MECHANICS_GUIDE 1, Academy `campaign`, results panel |
| AI | highest priority first; `allyHurt` below 70% HP or with a debuff; control spares the disabled and picks the highest ATK; dispel picks the most buffed; else 70% lowest HP%, 30% random | `ai.ts` | MECHANICS_GUIDE 11 |
| Hit-stop | 55 ms, 90 ms on a crit, real time | `BattleScene.applyEvent`, `Clock.hitStop` | MECHANICS_GUIDE 12 |

### ME2 The skill vocabulary

Every skill is data (`SkillDef` in `types.ts`); these are the levers a kit can pull, with how many of the 39 skills pull them.

| Lever | Drives | Used by |
| --- | --- | --- |
| `target`: `enemy`, `enemies`, `allies` | focus vs spread (DY3), Taunt interplay (DY6) | 24, 10, 5; `ally` and `self` are supported but unused (T8) |
| `hits` (one per hit frame) | crit and per-hit status chances, impact rhythm (AE2) | 32 single-hit, 5 two-hit, 1 three-hit, 1 four-hit |
| `statuses` (`chance`, `turns`, `to`, `value`, `perHit`) | control (DY5), protection and answers (DY6) | all 16 statuses are used; 19 skills roll a chance |
| `healAllies`, `cleanse`, `lifesteal` | sustain (DY6) | 3, 2, 1 |
| `stripBuffs` | dispel (DY6, DY7) | 1 (Weighing of Hearts) |
| `tmTargets`, `tmAllies`, `selfTm` | tempo (DY1) | 2, 1, 1 |
| `execute` | timing (DY2, DY3) | 2 (Skullsplitter, Mirage Assault) |
| `ai.priority`, `ai.when` | the reference player (DY2, T2) | every skill; `allyHurt` on Serenity only |
| `approach`, `projectile`, `castFx`, `actorFx`, `shake` | spectacle and pacing (AE2, DY10) | ranged 14, melee 11, none 7, center 3, leap 2, blink 2; projectile 7, castFx 13, actorFx 2, shake 13 |

### ME3 The roster

Proof-of-concept content: every champion here is a placeholder until it is reviewed.

| Champion (`id`) | Role, rarity, affinity | SPD | Signature idea | Met / recruited |
| --- | --- | --- | --- | --- |
| Sir Aldric (`knight`) | Tank, epic, Arcane | 100 | team Shield and DEF Up with a self Taunt | starter |
| Brakka (`warrior`) | Damage, rare, Force | 104 | two-hit AoE; leap execute below 50% | starter |
| Sylwen (`archer`) | Damage, rare, Wild | 112 | AoE turn-meter drain; guaranteed Poison | starter |
| Master Tenzo (`monk`) | Support, epic, Wild | 116 | team heal, cleanse and Regen when allies are hurt | 1-1 / 1-1 |
| Ysolde (`frostmage`) | Control, epic, Arcane | 108 | guaranteed Freeze; AoE SPD Down | 1-1 / 1-2 |
| Vorhaal (`dreadknight`) | Bruiser, legendary, Void | 100 | lifesteal | 1-2 / 1-3 boss |
| Akhet (`stalker`) | Damage, rare, Force | 118 | per-hit Poison, blink, Heal Block and Weaken, ends at 25% meter | 2-1 / 2-1 |
| Kha'zir (`jackal`) | Tank, epic, Force | 97 | team Counterattack; Dispel | 2-1 / 2-2 |
| Nefret (`priestess`) | Support, epic, Arcane | 110 | team heal and ATK Up; AoE Heal Block and Burn | 2-3 / 2-3 |
| Anhotep (`tomblord`) | Control, legendary, Void | 96 | Undying; guaranteed Stun and Heal Block | 2-4 / 2-4 boss |
| Imara (`sunspear`) | Bruiser, epic, Force | 106 | self Shield on A1 (50%); two-hit AoE spin | 3-1 / 3-1 |
| Kwesi (`starsinger`) | Support, rare, Wild | 114 | ally meter +20%, SPD Up, cleanse; AoE damage that heals | 3-1 / 3-2 |
| Mwamba (`colossus`) | Tank, legendary, Arcane | 92 | Overdrive; AoE Taunt; AoE stun chance | 3-3 / 3-3 boss |

Spread: roles Tank 3, Damage 3, Support 3, Control 2, Bruiser 2; affinities Force 4, Arcane 4, Wild 3, Void 2; rarities epic 6, rare 4, legendary 3 (common and uncommon have budgets but no champions, T8).

### ME4 The campaign

Proof-of-concept content: locations, stages and their numbers are placeholders until reviewed.

Lean = enemies each attacking affinity hits strong (+) or weak (-); only the notable ones are listed.

| Stage | Enemies (affinity) | Power | Kind | Lean | First introduces |
| --- | --- | --- | --- | --- | --- |
| 1-1 The Frozen Gate | Tenzo (W), Ysolde (A) | 0.85 | first | Wild +1; Force +1/-1 | enemy heals, Freeze, stun chance, SPD Down |
| 1-2 Hall of Icicles | Vorhaal (V), Tenzo, Ysolde | 0.92 | normal | Wild +1 | lifesteal, ATK Down, DEF Down |
| 1-3 Throne of the Dread Knight | Vorhaal (boss), Tenzo, Ysolde | 0.95 | boss | Wild +1 | boss HP and crown |
| 2-1 Dunes of Ash | Kha'zir (F), Akhet (F) | 1.35 | chapter gate | Arcane +2, Wild -2 | Taunt, Counterattack, Dispel, Heal Block, Weaken, blink |
| 2-2 The Sunken Colonnade | Kha'zir, Akhet, Akhet | 0.88 | normal | Arcane +3, Wild -3 | duplicate enemies |
| 2-3 Temple of the Burning Sun | Kha'zir, Nefret (A), Akhet | 0.90 | normal | Arcane +2, Wild +1/-2 | Burn, AoE Heal Block, team heal and ATK Up |
| 2-4 Tomb of Anhotep | Anhotep (V, boss), Kha'zir, Nefret | 0.80 | boss | Arcane +1 | Undying, guaranteed Stun |
| 3-1 The Baobab Steps | Imara (F), Kwesi (W) | 1.35 | chapter gate | Force +1, Arcane +1/-1 | ally meter boost, SPD Up, enemy Shield |
| 3-2 The Hall of Echoes | Imara, Kwesi, Kwesi | 0.98 | normal | Force +2, Arcane +1/-2 | duplicate enemies |
| 3-3 Heart of the Skyforge | Mwamba (A, boss), Imara, Kwesi | 0.85 | boss | neutral: +1/-1 for every cycle affinity | Overdrive, AoE Taunt, AoE stun |

### ME5 Feel: the presentation mechanics

| Cue | Value | Where |
| --- | --- | --- |
| Hit-stop | 55 ms (90 ms on a crit); game time runs at 6% meanwhile | `BattleScene.applyEvent`, `Clock.update` |
| Flash | the sprite flashes white on every damage; the screen flashes on crits (0.18) and Overdrive (0.12) | `UnitView.flash`, `BattleScene.flash` |
| Shake | the sprite shakes on every damage; the screen shakes by the skill's `shake` (2-6) | `BattleScene.shake` |
| Sparks | 6 particles per damage, 10 on a crit | `BattleScene.applyEvent` |
| Numbers and words | white numbers; crits gold in the title face with `CRITICAL`; `STRONG HIT`, `WEAK HIT`, `ABSORB n`, green `+n`; texts on one unit stack upward | `BattleScene.applyEvent`, `FxLayer.text` |
| HP lag | the lost part of a bar stays pale, then drains (about 0.9 s for a full bar) | `UnitView.update` |
| Banners and titles | skill name on every A2/A3 and `COUNTERATTACK` (1.5 s); `BOSS`, `FIGHT!`, `VICTORY`, `DEFEAT` | `Hud`, `BattleScene.intro` |
| Approach | melee stops 38 px in front; `center` to the middle of the line; ranged steps 72 px forward; leap arcs 46 px high and lands on the hit frame; blink reappears behind the target | `BattleScene.perform` |
| Effects | cast circles on 13 skills, projectiles with trails and arcs on 7, AoE impacts staggered 90 ms per target | `BattleScene.perform`, `spawnHitFx` |
| Death and revival | death animation, then a 500 ms fade; Undying: fall, tomb-light helix, `UNDYING!`, rise | `BattleScene.applyEvent` |
| Victory | survivors play their `skill` pose; stars pop in from 600 ms, 260 ms apart | `BattleScene.outro`, `Hud.drawResults` |

### ME6 Meta mechanics

| Mechanic | Rule | Where |
| --- | --- | --- |
| Starters | Sir Aldric, Brakka, Sylwen: one per cycle affinity | `STARTERS` |
| Recruit | the first clear recruits the stage's champion; ceremony; NEW badge until the champion page is opened | `recordClear`, `RecruitScreen`, `HeroSoulFile.fresh` |
| Unlocks | a stage opens after the previous stage of its location; a location after its `requires` stage | `stageOpen`, `locationOpen` |
| Frontier | the newest playable stage: map focus, menu diorama, collection backdrop | `frontier` |
| Stars | best per stage; the total shows in every header | `MasterArchivist.stars`, `totalStars` |
| Academy | 12 chapters, read marks, "n new" on the menu | `CHAPTERS`, `MasterArchivist.read` |
| Settings | auto and speed, saved as defaults from battle and Options | `MasterArchivist.settings` |
| Shortcuts | `?unlockall=1`, `?progress=<stage>`, `?reset=1`, `?demo=<skill>`, `?hp=<k>` | `main.ts`, `screens/battle.ts` |

## 4. Traceability

### 4.1 Aesthetic to guardrail

| Aesthetic | Dynamics | Mechanics | Automated guardrails | Human review |
| --- | --- | --- | --- | --- |
| AE1 Tactical mastery | DY1-DY6 | ME1, ME2, ME3, `ai.ts`, team select matchups | `npm test` (rules, norms), `npm run balance` 2-3 | play the changed stage by hand; is there a real choice on most turns? |
| AE2 Readable spectacle | DY7, DY10, DY11 | ME5, hit frames, `fx/`, `hud.ts` | content tests (hits = hit frames, effects exist, `jump`/`cast` events), `npm run audit` | `?demo=<skill>` bursts at 2x, both facings |
| AE3 Heroic collection | DY6, DY7, DY9 | ME3, ME6, silhouettes, collection, champion and recruit screens | content tests (obtainable, recruited where fought), `npm run audit` | lineup, locked silhouette, recruit ceremony capture |
| AE4 Fair, learnable | DY4, DY5, DY8, DY9, DY11 | norms, curve, `codex.ts`, tooltips, keywords | `npm run balance` 4, content tests (statuses taught, demos exist) | every number the change touches read against the Academy and the guides |
| AE5 Crafted world | DY10; zone ambience (weather, props, light pools) | `tools/art`, palette, zones, `ZoneDef`, lore | `npm run audit` | zone and battle captures with Sir Aldric, Vorhaal and Akhet |
| AE6 Respect for time | DY8, DY10 | `Clock` speeds, auto, settings, keyboard focus, deep links | `npm run typecheck`, `npm run build`; pacing is not automated yet | time one battle at x1 and at x3 |

### 4.2 Change index: if you change this, re-check that

| You change | It moves | Re-run and re-check |
| --- | --- | --- |
| a champion's stats (SPD above all) | DY1, DY3, DY4 | `npm run balance`; double turns and opener share (5.2); ME3 |
| a multiplier or a cooldown | DY2, DY3 | norms test; balance 3-4; battle length (5.2) |
| a status chance, duration or size | DY5, DY6 | norms; balance; `RESIST` and skipped-turn share (5.2); every copy listed in ME1 |
| a rule constant (`src/game/battle/battle.ts`, `meta.ts`) | every dynamic | rules tests; every copy in ME1; full re-baseline (section 6) |
| the AI | DY2, DY5 and the calibration of every band | balance (all bands are measured on the AI); re-baseline; MECHANICS_GUIDE 11 |
| a stage's enemies or power | DY4, DY8, DY9 | balance 4; lean in ME4; 3-star share (5.2) |
| a new champion | DY6, DY9 | the new-champion skill; the answer table in DY6; ME3 |
| a new status or mechanic | DY5, DY6, DY11 | [DDD.md](DDD.md) playbooks; Academy; on-screen cue; ME1, ME2 |
| choreography or animation timings | DY10 | pacing (5.2); `?demo=` captures |
| zone art | AE5, AE2 | audit; captures with a light, a dark and a saturated champion |
| UI and screens | AE6, AE4 | UI_GUIDE; keyboard pass; captures at 2x |

## 5. Guardrails and quality bars

### 5.1 Enforced today

| Layer | Guardrail | Check |
| --- | --- | --- |
| Mechanics | stat budget ±5%, stat limits, slot multipliers, cooldowns, status durations, guaranteed control only on A3 | `npm test` (norms), `npm run balance` 1-2 |
| Mechanics | `hits` = animation hit frames; leap needs `jump`, `actorFx` needs `cast`; every effect exists; projectiles need a `muzzle` | `npm test` |
| Mechanics | every status has an icon and an Academy entry; Academy demos and icons exist | `npm test` |
| Dynamics | impact of every champion 40-60% | `npm run balance` 3 |
| Dynamics | campaign curve: first 85-100%, normal 55-92%, boss 40-80% | `npm run balance` 4 |
| Progression | every champion obtainable exactly once, recruited where fought; every location ends on a boss | `npm test` |
| Aesthetics | palette-only pixels, heights 64-96, frame box, no colour literals, zone colour budgets, icon sizes | `npm run audit` |
| Aesthetics | every change reviewed in screenshots | `tools/shots.ts`, `?demo=`, CLAUDE.md quality bar |

### 5.2 Dynamics bands (measured by hand today)

These complete the balance report. Until they are automated ([DDD.md](DDD.md) R-14), measure them with an instrumented copy of the `simulate()` loop (section 6.5) whenever the change index (4.2) says so.

| KPI | Definition | Band | Baseline |
| --- | --- | --- | --- |
| Battle length | average actions per battle, per stage | 12-30 (1-1 exempt) | 14.3-26.1; 1-1 10.4 |
| Double turns | the same unit acting twice in a row, per battle | below 0.5 | 0.00-0.14 |
| Skipped share | Stun/Freeze skips over all actions, per stage | at most 12% | 2.5-11.5% |
| Resisted share | `resist` over `resist` + `status` events | at most 35% | 11-31% |
| Three-star share | 3-star wins over auto wins, per stage | 15-60% (1-1 exempt) | 22-46% |
| Boss turning point | battles in which the boss passive fires | at least 80% | Undying 96%, Overdrive 89% |
| Time-to-kill | A1s to kill an average champion (crit expectation, average DEF) | 2.5-6 | 2.9-5.6 |
| Pacing | wall time per action, auto battle | x1 at most 4.0 s, x3 at most 1.5 s | x1 2.9-3.4 s, x3 1.1-1.4 s |
| Opener share | battles in which the player side acts first | watch only | 21-80% |
| Execute timing | execute casts whose target is already below the threshold | watch only | 2% (Mirage Assault), 21% (Skullsplitter) |

### 5.3 Aesthetic quality bars (reviewed by people)

1. Every rules event has a visible cue at the moment it resolves ([DDD.md](DDD.md) section 5 lists them).
2. No floating text, effect or foreground prop hides an HP bar or a status row for longer than its own animation.
3. Every A2 and A3 has a banner; every hit frame has an impact effect; heavy skills shake.
4. One key light, top-left; sprites rendered for both facings, never mirrored; no smooth gradients, no anti-aliased shapes.
5. A new champion is recognisable as a black silhouette and does not repeat a hue family inside its faction.
6. A new kit brings one idea the roster does not have, or a new answer (DY6).
7. Every number the player reads equals the rule: skill descriptions, status texts, the Academy, the guides.
8. Every new interactive element has a stable region id, so it works with the keyboard.
9. Pacing stays inside its budget (5.2).

## 6. Baseline

Commit `8dd9a26`, 2026-10-06. `npm test` (39 tests), `npm run typecheck`, `npm run audit` and `npm run balance` all pass.

### 6.1 Champions

Impact is `npm run balance` section 3 (random 3v3 teams including the champion, 240 battles). A1 share is the expected A1 damage, crits included, against the roster's average DEF (68.5), as a share of the average HP (1,302).

| Champion | Role | Impact | A1 share of average HP | A1s to kill |
| --- | --- | --- | --- | --- |
| Imara | Bruiser | 56% | 28.0% | 3.6 |
| Anhotep | Control | 55% | 23.2% | 4.3 |
| Master Tenzo | Support | 54% | 27.0% | 3.7 |
| Mwamba | Tank | 54% | 20.6% | 4.9 |
| Ysolde | Control | 53% | 25.4% | 3.9 |
| Sir Aldric | Tank | 52% | 17.9% | 5.6 |
| Vorhaal | Bruiser | 52% | 24.1% | 4.1 |
| Nefret | Support | 49% | 23.2% | 4.3 |
| Brakka | Damage | 44% | 34.1% | 2.9 |
| Kha'zir | Tank | 43% | 18.8% | 5.3 |
| Akhet | Damage | 43% | 31.5% | 3.2 |
| Kwesi | Support | 43% | 24.5% | 4.1 |
| Sylwen | Damage | 42% | 28.6% | 3.5 |

### 6.2 Campaign

Every team the player can own at that point, 20 seeds each, auto battle on both sides. The win column is `npm run balance` section 4; the rest comes from the instrumented loop (6.5).

| Stage | Power | Teams | Auto win | Actions | Skips per battle | Counters per battle | 3-star share | Player opens | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1-1 | 0.85 | 1 | 100% | 10.4 | 1.20 | 0 | 100% | 30% | tutorial |
| 1-2 | 0.92 | 4 | 79% | 23.5 | 1.77 | 0 | 46% | 48% | |
| 1-3 | 0.95 | 10 | 60% | 26.1 | 2.07 | 0 | 22% | 36% | boss |
| 2-1 | 1.35 | 20 | 84% | 15.2 | 0.91 | 1.80 | 40% | 21% | dispels 1.33 per battle |
| 2-2 | 0.88 | 35 | 72% | 14.3 | 0.39 | 0.98 | 27% | 25% | dispels 1.18 |
| 2-3 | 0.90 | 56 | 71% | 16.7 | 0.42 | 2.17 | 35% | 34% | dispels 1.01 |
| 2-4 | 0.80 | 84 | 69% | 22.4 | 1.54 | 3.09 | 27% | 80% | boss; Undying in 96% |
| 3-1 | 1.35 | 120 | 82% | 15.4 | 0.73 | 0.51 | 38% | 43% | |
| 3-2 | 0.98 | 165 | 80% | 17.3 | 0.51 | 0.78 | 41% | 33% | |
| 3-3 | 0.85 | 220 | 63% | 23.6 | 1.66 | 0.72 | 31% | 56% | boss; Overdrive in 89% |

### 6.3 Random battles

2,000 battles between random 3-champion teams drawn from the whole roster:

| Measure | Value |
| --- | --- |
| Player-side wins (side symmetry) | 51.5%; the player side opens 52% of battles |
| Actions per battle | 20.7 on average, 8 to 56 |
| Skipped turns | 1.47 per battle |
| Counterattacks / dispels / revives / Overdrives | 1.27 / 0.27 / 0.33 / 0.38 per battle |
| Crits | 14.2% of hits |
| Strong / weak hits | 22.3% / 22.1% of hits |
| Resisted status rolls | 28.8% |
| Double turns | 0.07 per battle |
| AI slot use | A1 39.7%, A2 27.4%, A3 32.9% |
| Stars on wins | 3: 26.0%, 2: 45.8%, 1: 28.2% |

### 6.4 Pacing

Auto battles in headless Chromium at 1280x720, timed from page load to the results panel (asset loading, intro and outro included).

| Speed | Stage | Team | Result | Actions | Time | Per action |
| --- | --- | --- | --- | --- | --- | --- |
| x1 | 1-2 | Sir Aldric, Brakka, Sylwen | won, 1 star | 31 | 89.8 s | 2.90 s |
| x1 | 2-3 | Sir Aldric, Tenzo, Ysolde | won, 2 stars | 24 | 81.2 s | 3.38 s |
| x1 | 3-3 | Vorhaal, Anhotep, Nefret | won, 3 stars | 19 | 60.3 s | 3.17 s |
| x3 | 1-2 | Sir Aldric, Brakka, Sylwen | won, 3 stars | 12 | 14.4 s | 1.20 s |
| x3 | 2-3 | Sir Aldric, Tenzo, Ysolde | won, 2 stars | 22 | 29.9 s | 1.36 s |
| x3 | 3-3 | Vorhaal, Anhotep, Nefret | won, 3 stars | 22 | 23.7 s | 1.08 s |

### 6.5 Reproducing the baseline

- `npm run balance`: section 6.1 impact and the win column of 6.2.
- The other columns come from a copy of the `simulate()` loop (`src/game/battle/sim.ts`) that counts the events of every `startTurn` and of every `SkillResult` (counterattacks included, through `flatten`): skips are `startTurn().skip` on a living unit; double turns are the same `uid` returned by `advance()` twice in a row; the resisted share is `resist / (resist + status)`; stars use `starsFor`. Use the balance tool's teams and seeds (`seed` 1-20 per team) so the win column matches `npm run balance` exactly, which also proves the copy is faithful.
- Pacing: run `npm run dev`, set auto on and speed x1 (or x3) in Options, open `?unlockall=1&screen=battle&stage=<id>&team=<ids>` and time until `window.app.scene.scene.results` is set.

## 7. MDA review for every change

### 7.1 Impact card

Paste it into the pull request description.

```markdown
### MDA impact
- Serves: AE_ (why, in one line)
- Moves: DY_ (direction, expected size), DY_ ...
- Touches: files and ids (champions, skills, stages, statuses)
- Evidence: npm test / npm run balance / npm run audit / npm run typecheck, captures
- Baseline: KPI before -> after for every dynamic it moves (section 5.2)
- Text: numbers changed in descriptions, statuses, Academy, guides (or "none")
- Bands left: none, or which and why (decision log entry)
```

### 7.2 Questions to answer

- **Aesthetics:** which target does it serve? Does it weaken a higher-ranked one? What does the player see at the moment it happens?
- **Dynamics:** which KPI moves, and how far? Did the AI change (then every band needs re-measuring)? Does it create a dominant team or skill? Does it add a protection without an answer, or an answer without a protection (DY6)?
- **Mechanics:** is every number inside the norms? Does the rule live in one place, and are its copies (ME1) updated? Is it tested?

### 7.3 Release gate

1. `npm test`, `npm run balance`, `npm run audit` and `npm run typecheck` all pass.
2. No KPI outside its band without a decision log entry (section 9).
3. The drift register in [DDD.md](DDD.md) did not grow, or the new entry is recorded there.
4. The baseline (section 6) is refreshed when its numbers moved.
5. Captures are reviewed for every changed skill, screen or zone.

## 8. Tensions and open questions

| ID | Tension | Options |
| --- | --- | --- |
| T1 | The Academy calls Speed "the most valuable stat in the game", but the roster's SPD range almost never produces lapping (0.07 double turns per battle): Speed decides the opening order, not extra turns. | widen the SPD limits with care; add tempo kits; or rephrase the Academy line to "Speed decides who opens" |
| T2 | The reference player is the AI, and it plays timing kits badly: executes fire as openers, control fires as soon as it is ready. Impact under-rates timing kits (Damage role 42-44%) and the curve measures auto, not people. | `ai.when` conditions such as "target below the execute threshold"; a smarter upper-bound policy in the balance tool; playtest data |
| T3 | The AI is predictable: always the highest-priority ready skill. Good for learning (enemies telegraph), thin as a late-game challenge. | boss-specific AI (for example, Mwamba holding Starfall Protocol until Overdrive) |
| T4 | The final boss 3-3 is affinity-neutral (+1/-1 for every cycle affinity), so team select gives no hint there. | keep it as the deliberate exam, and decide it on purpose for every future finale |
| T5 | Stars only count losses: after 3 stars there is nothing left to chase, and there is no economy by design. | medals for turn count or no-auto clears, challenge modifiers, or accept it |
| T6 | Chapter gates run at power 1.35, shown in red as "power 135%", yet they are among the easier stages (82-84% on auto) because they field two enemies. The number frightens more than the fight does. | a difficulty rating that counts the enemies, or accept it |
| T7 | Battles are seeded with `Math.random` and the seed is never shown: a surprising loss cannot be replayed or reported. | show the seed on the results panel and accept `&seed=` ([DDD.md](DDD.md) R-12) |
| T8 | Latent vocabulary: targets `ally` and `self` and the rarities common and uncommon exist in the model with no content, so they are untested in play. | content using them gets a presentation review (ally markers, prompts) and rules tests |
| T9 | A failed buff roll (Imara's 50% Shield) is silent while a failed debuff shows `RESIST`. | decide whether the player should see it |
| T10 | Control can chain: a chance stun on an A2 and a guaranteed A3 stun on the same team can lock one enemy; there is no immunity window. The skipped share is fine today (at most 11.5%). | watch the skipped share whenever control is added; an immunity rule if it rises |
| T11 | Champion growth: gear is decided (the Weaver Matrix, section 9); champions still have no levels, ranks or skill upgrades. Gear moves every balance band: the curve will need an expected matrix per stage. | gear alone; or also levels, ascension, skill books |
| T12 | Acquisition: one recruit per first clear ties the size of the roster to the size of the campaign. | keep it; shards, summoning, fixed rewards or events |
| T13 | Team size is 3 (RSL 4-5, SWGOH 5). Formation slots, zone spawns, the HUD and every balance number depend on it. | decide early; 3, 4 or 5 |
| T14 | Team-building levers are few: no leader skills or auras, and formation is visual only (the front row does not protect the back). | leader skills or auras; positional rules |
| T15 | Five stats: no Accuracy or Resistance (a debuff lands on a flat chance) and no crit damage stat. | add Accuracy/Resistance, crit damage; or keep five on purpose |
| T16 | Status variety: no immunities, no revives, ally-target skills unused (T8), two passive kinds. | grow the vocabulary with the roster; every new protection needs an answer (DY6) |
| T17 | Modes: the campaign is the only mode; no dungeons, boss modes or events; PvP is excluded. | decide which modes the game has |
| T18 | Platform: a 640x360 web canvas with mouse and keyboard; RSL and SWGOH are phone games (touch, short sessions). | web only; or phones too (touch-first input, layout) |

## 9. Decision log

Record every change that moves a dynamic out of its band, changes a band, or changes a target aesthetic.

| Date | Change | Serves | Moves | Before -> after | Decision |
| --- | --- | --- | --- | --- | --- |
| 2026-10-06 | MDA baseline established (this document) | - | - | section 6 | reference point for later changes |
| 2026-10-08 | Final name and domain lexicon (The Loom: Reliquary of Legends); T11 decided in part: champions grow through gear, the Weaver Matrix | AE1, AE3 | none yet: the layout is a placeholder and no spools exist | - | outline approved by Jakub: six slots with fixed or variable stat nodes, Thread Spools, 2- and 4-piece Weave Patterns counted wherever their spools sit, a 2-piece pattern up to three times. Layout, spools, pattern bonuses and spool sources wait for the Weaver Matrix proposal |

## 10. Keeping this document true

- **When a champion, stage, status, rule constant or AI behaviour changes:** update ME1-ME4 and re-measure section 6. Re-measure also when `npm run balance` moves any number by more than 3 points.
- **When a band is left on purpose:** add a decision log entry, then update the band.
- **When a tension is resolved:** move it to the decision log with what was decided.
- **Who:** the author of the change fills in the impact card; the reviewer checks it against sections 4 and 5.
