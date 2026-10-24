# MDA: Mechanics, Dynamics, Aesthetics

The Loom: Reliquary of Legends is designed backwards from the experience it has to create. This document names the experiences the game is built for (**aesthetics**), the patterns that emerge when its rules run (**dynamics**), and the rules, numbers, content and presentation that produce them (**mechanics**). Every claim is traced to the code and every dynamic is measured, so a change can be judged before it ships. A change is good when it serves a target aesthetic, keeps every dynamic inside its band and passes the guardrails.

Rules in detail: [MECHANICS_GUIDE.md](MECHANICS_GUIDE.md). Domain model, invariants and change playbooks: [DDD.md](DDD.md). Pixels: [ART_GUIDE.md](ART_GUIDE.md). Screens: [UI_GUIDE.md](UI_GUIDE.md).

Baselines (section 6): Zone 1 on Jakub's own content, 2026-10-10 (6.0); the proof of concept's thirteen champions and ten stages at commit `8dd9a26`, 2026-10-06 (6.1-6.4), kept as the reference for how the engine behaves with a full roster.

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
- **Working when:** the numbers taught equal the numbers used; the campaign stays inside its bands; difficulty rises in steps the player can see coming (the stage list shows the enemy line-up and its power).
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

The `Baseline` lines below were measured on the proof of concept's roster and campaign, which Jakub's content replaced on 2026-10-10 ([DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)). With two champions and stand-in enemies most dynamics cannot be measured yet; Zone 1's numbers are in 6.0, and every dynamic is re-measured as his roster grows.

### DY1 The opening race

- **Happens:** Speed and a small random head start decide who acts first and in which order the openers fire. Lapping (one champion acting twice before another acts once) almost never happens.
- **Driven by:** `Battle.advance()` (time to act = (100 - TM) / SPD, ties to the higher SPD), roster SPD 92-118 inside the limits 90-125, starting meters 0-12%, SPD Up/Down at ±25%, and the turn-meter skills: Arrow Rain and Resonance -15%, Rhythm of the March +20%, Mirage Assault keeps 25%.
- **Baseline:** the fastest champion acts 1.28x as often as the slowest, so lapping needs SPD Up, SPD Down or a meter skill. The measured proxy, the same champion acting twice in a row, happens 0.07 times per battle (0.00-0.14 by stage). The player side opens in 21% (2-1) to 80% (2-4) of battles, depending on the line-ups.
- **Band:** fewer than 0.5 double turns per battle unless a kit is explicitly about tempo; SPD inside the limits.
- **Serves:** AE1. **Watch:** widening SPD or stacking SPD Up with meter boosts creates lapping, which snowballs and frustrates (AE4). See T1.

### DY2 The opener decides

- **Happens:** a battle gives each champion about 3.5 turns, so most A3s fire once, and the AI fires them first. The first round of A3s and A2s shapes the fight; holding an A3 for the right moment is the clearest edge a person has over auto.
- **Driven by:** cooldowns (A2 3-5, A3 4-6: a skill used now is ready again N + 1 own turns later), `decide()` (the highest-priority ready skill first), battle length (DY3).
- **Baseline:** 20.7 actions per random 3v3 battle (8-56), so about 3.5 turns per champion. AI slot use: A1 40%, A2 27%, A3 33%. Execute skills are spent as openers: Mirage Assault is cast on Akhet's first turn 96% of the time, with its target already below the 40% threshold only 2% of the time when cast; Skullsplitter 88% and 21%.
- **Band:** 12-30 actions per campaign battle on average, so cooldowns matter and every champion gets at least three turns (1-1, the tutorial, is exempt).
- **Serves:** AE1, AE2 (A2 and A3 are the set pieces, with banners). **Watch:** under about 12 actions, battles become one-shot races where cooldowns stop mattering; over about 35, they become A1 attrition. Auto play under-measures timing kits: the Damage role sits at 42-44% impact (T2).

### DY3 Focus fire and time-to-kill

- **Happens:** removing one enemy early, and with it all its turns, is the main tactical axis. Protection matters because it breaks focus.
- **Driven by:** damage = ATK x mult x 4.8 x 40 / DEF x modifiers (since 2026-10-10; 100 / (100 + DEF) before); the AI focusing the lowest HP% 70% of the time; Taunt, Shield, heals and execute.
- **Baseline:** with crits counted and the roster's average DEF (68.5), one A1 takes 18% (Sir Aldric) to 34% (Brakka) of an average champion's 1,302 HP: 2.9 to 5.6 A1s to kill. Campaign battles last 10-26 actions on average.
- **Band:** A1 time-to-kill against the average champion between 2.5 and 6 hits. A full-HP one-shot happens only as the rare product of set-up, crit and a strong hit, never as a kit's plan.
- **Serves:** AE1, AE2. **Watch:** raising an ATK limit or a multiplier norm shortens time-to-kill for everyone and collapses DY2 and DY6.

### DY4 Counter-picking by affinity

- **Happens:** team select is a real decision when a stage leans toward one or two affinities.
- **Driven by:** Ember > Bloom > Tide > Ember at ±20% (the proof of concept's size of the edge: what an edge does is not decided), no neutral affinity; the `+n -n` matchup counts on every roster card. Today the starter is Ember and the second champion Tide: a counter pair on purpose (DESIGN_DECISIONS.md 4.4), so the pair covers two of the three affinities.
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

Debuffs on the player's team (SPD Down from 1-1, DEF Down from 1-2, Poison from 2-1) are answered by Cleanse: Tenzo from 1-2 on, Kwesi from 3-3 on.

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
| Defense | x 40 / DEF (`DEF_SCALE`) | `Battle.rollDamage` | MECHANICS_GUIDE 5, Academy `damage`, champion page stat tip |
| Critical hit | x2, rolled per hit with CRIT | `CRIT_MULT` | MECHANICS_GUIDE 5, Academy, champion page stat tip |
| Spread | x0.92-1.08; at least 1 damage | `Battle.rollDamage` | MECHANICS_GUIDE 5, Academy figure |
| Affinity | ±20% (Ember > Bloom > Tide > Ember; the size is the proof of concept's) | `AFFINITY_BONUS`, `affinityEdge` (`meta.ts`) | MECHANICS_GUIDE 6, Academy `affinity`, `AFFINITIES` texts |
| ATK Up / ATK Down | ±25% | `Battle.attack` (inline) | `statuses.ts`, MECHANICS_GUIDE 5 and 7 |
| DEF Up / DEF Down | +16% / -12% | `DEF_UP`, `DEF_DOWN` (`battle.ts`) | `statuses.ts`, MECHANICS_GUIDE 5 and 7, Academy `damage` |
| SPD Up / Slow | ±25% | `Battle.speed` (inline) | `statuses.ts`, MECHANICS_GUIDE 2 |
| Poison / Burn | -5% / -6% max HP at turn start, through shields | `POISON_PCT`, `BURN_PCT` | `statuses.ts`, MECHANICS_GUIDE 3 and 7, Academy |
| Regen | +15% max HP at turn start (Jakub, 2026-10-12) | `REGEN_PCT` | `statuses.ts`, MECHANICS_GUIDE 7 |
| Shield | absorbs up to `value` x the caster's max HP | `Battle.tryApply`, `Battle.applyDamage` | MECHANICS_GUIDE 5 |
| Durations | the holder's own turns, ticking at its turn end; a status placed during the holder's own turn starts counting at its next; reapplying refreshes to the longer one, never stacks | `Battle.endTurn`, `Battle.addStatus` (`StatusInst.fresh`) | MECHANICS_GUIDE 3 and 7, Academy `basics`, `buffs`, `debuffs` |
| Cooldowns | A1 0, A2 3-5, A3 4-6 | `SKILL_NORMS` (`norms.ts`) | MECHANICS_GUIDE 4 and 10 |
| Hard control | 1 turn, guaranteed only on an A3 | `STATUS_NORMS` | MECHANICS_GUIDE 10, Academy `control` |
| Boss HP | x1.6 | `BOSS_HP` (`campaign.ts`) and the `Battle` default | MECHANICS_GUIDE 10, Academy `campaign` ("60% more HP") |
| Stage power | multiplies enemy HP and ATK | `StageDef.power`, `Battle` constructor | stage list ("power 85%") |
| Stars | 3 / 2 / 1 by champions lost | `starsFor` (`sim.ts`) | MECHANICS_GUIDE 1, Academy `campaign`, results panel |
| AI | highest priority first; `allyHurt` below 70% HP or with a debuff; `allyDebuffed` only with a debuff on an ally; control spares the disabled and picks the highest ATK; dispel picks the most buffed; a full cleanse the most afflicted ally; else 70% lowest HP%, 30% random | `ai.ts` | MECHANICS_GUIDE 11 |
| Hit-stop | 55 ms, 90 ms on a crit, real time | `BattleScene.applyEvent`, `Clock.hitStop` | MECHANICS_GUIDE 12 |

### ME2 The skill vocabulary

Every skill is data (`SkillDef` in `types.ts`); these are the levers a kit can pull, with how many of the 39 skills pull them.

| Lever | Drives | Used by |
| --- | --- | --- |
| `target`: `enemy`, `enemies`, `allies` | focus vs spread (DY3), Taunt interplay (DY6) | 24, 10, 5; `ally` and `self` are supported but unused (T8) |
| `hits` (one per hit frame) | crit and per-hit status chances, impact rhythm (AE2) | 32 single-hit, 5 two-hit, 1 three-hit, 1 four-hit |
| `statuses` (`chance`, `turns`, `to`, `value`, `perHit`) | control (DY5), protection and answers (DY6) | all 16 statuses are used; 19 skills roll a chance |
| `healAllies`, `cleanse`, `lifesteal` | sustain (DY6) | 3, 2, 1 |
| `healSelf`, `cleanseAll`, `ai.when: 'allyDebuffed'` (2026-10-17) | sustain and answers (DY6) | the Grove Keeper's Thornburst and Cleansing Rite |
| `stripBuffs` | dispel (DY6, DY7) | 1 (Weighing of Hearts) |
| `tmTargets`, `tmAllies`, `selfTm` | tempo (DY1) | 2, 1, 1 |
| `healOf: 'caster'`, `tmLowestAlly` (2026-10-12) | sustain and tempo (DY6, DY1) | the Quartermaster's Field Rations |
| `execute` | timing (DY2, DY3) | 2 (Skullsplitter, Mirage Assault) |
| `ai.priority`, `ai.when` | the reference player (DY2, T2) | every skill; `allyHurt` on Serenity only |
| `approach`, `projectile`, `castFx`, `actorFx`, `shake` | spectacle and pacing (AE2, DY10) | ranged 14, melee 11, none 7, center 3, leap 2, blink 2; projectile 7, castFx 13, actorFx 2, shake 13 |

### ME3 The roster

Jakub's champions ([DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) 4 and 8, Starter Heroes; 12, the Skirmisher; 13, the Lineholder; 14, the Quartermaster; 15, the Enforcer; 16, the Bloodhound; 17, the Dominion Medic; 18, the Follower; 19, the Walking Bush; 20, the Wild Speaker; 21-24, the Jungle Herder, Emissary Handlings, Red Cloak and Big Ears; 25-27, the Associate, the Black Rhino and the Grove Keeper; 28, the Skeleton; 29, the Rot Hulk; 30, the Bellringer; 31, the Necromancer; 32, the Automated Soul; 33, Irving Wellbington): names, looks, kits and what each teaches are his; stats and the numbers in the skills are stand-ins, and so are the seven Elites' affinities, which he sets later.

| Champion (`id`) | Role, rarity, affinity, faction | SPD | Signature idea | Met / joins |
| --- | --- | --- | --- | --- |
| Captain Gareth (`captain_gareth`) | Damage, elite, Ember, Azure Crown | 104 | a plain cut; a heavy blow that leaves ATK Up for his next two turns; one sweep through every enemy. Teaches how damage works: skills hit harder, change future turns, have shapes. Crit is not introduced on him (2.5%) | starter |
| Rime Scholar (`rime_scholar`) | Support, elite, Tide, Sanguine Dominion | 106 | a plain attack; Slow on every enemy; no A3; Cold Rebuke freezes whoever crits her below 35% HP. Teaches that statuses exist, that a Support can deny, and that statuses can answer being hurt | after the first battle (1-1), not fought there |
| Follower (`follower`) | Damage, common, Tide, Court of Root | 114 | Snap, a plain bite (1.0); Rend, a leap and a tear (1.4) with a 50% chance of DEF Down for 2 turns, on a cooldown of 4: the roster's first debuff left to a chance and its first DEF Down, the Court of Root's first champion and the fastest of all. Frail (HP 980); Tide, so he hits the Gareth copies strong | after 1-4 (a stand-in), not fought there |
| Skirmisher (`skirmisher`) | Damage, common, Bloom, Azure Crown | 110 | one skill: two quick cuts, one with each short sword, every turn; the roster's first Common and first Bloom, and the fastest. Fragile (HP 960): the Ember copies hit him strong | after 1-5 (a stand-in), not fought there |
| Dominion Medic (`dominion_medic`) | Support, common, Tide, Sanguine Dominion | 106 | one skill and no damage: Tonic heals every ally by 10% of his max HP (136) every turn; the roster's first A1 that strikes nobody, so he never counterattacks | after 1-6 (a stand-in), not fought there |
| Lineholder (`lineholder`) | Tank, common, Tide, Azure Crown | 92 | Guard Cut, one mace blow from behind the shield; Brace, DEF Up on himself for 2 turns: the roster's first Tank and first skill aimed only at its user. The sturdiest (HP 1320, DEF 72), the slowest and the weakest hitter (ATK 78); with no Taunt, the AI ignores him until the others are low (T20) | after 1-7 (a stand-in), not fought there |
| Bloodhound (`bloodhound`) | Tank, common, Ember, Sanguine Dominion | 100 | a plain bite (1.0); Bay, Taunt on himself for 1 turn on a cooldown of 4: the roster's first Taunt, so the first Tank that draws fire while it lasts, and its first champion on four legs | after 1-8 (a stand-in), not fought there |
| Quartermaster (`quartermaster`) | Support, common, Bloom, Azure Crown | 104 | a plain rap of his walking stick; Field Rations heals every ally by 15% of his own max HP, then lends 15% Turn Meter to the ally lowest on HP: the roster's first heal and its first turn meter boost | after 1-9 (a stand-in), not fought there |
| Enforcer (`enforcer`) | Damage, common, Ember, Sanguine Dominion | 98 | Heavy Cut, one plain two-handed cut (1.0); Keen Edge, +10% C.RATE in every battle (12.5%): the roster's first stat passive, extra to the budget and only its text outside battle, and the first champion who crits often | after 1-10 (a stand-in), not fought there |
| Walking Bush (`walking_bush`) | Tank, common, Bloom, Court of Root | 90 | Root Lash, a plain lash of a root arm (1.0); Thicket, DEF Up for 1 turn on himself and one chosen ally, on a cooldown of 3: the roster's first skill aimed at one chosen ally and its first buff shared with another. The most HP (1400) and the slowest; with no Taunt, the AI aims elsewhere (T20) | after 2-1 (a stand-in), not fought there |
| Wild Speaker (`wild_speaker`) | Support, common, Ember, Court of Root | 106 | Staff Blow, a thrust of his long stick (1.0); Quell, an overhead blow (1.3) with a 50% chance of ATK Down for 2 turns, on a cooldown of 4: the roster's first ATK Down, and its first Support whose skills only strike. Ember, so he hits the Bloom enemies strong and the Tide ones hit him strong | after 2-2 (a stand-in), not fought there |
| Jungle Herder (`jungle_herder`) | Tank, elite, Bloom (a stand-in), Court of Root | 94 | Crook Strike, a plain blow of his crook (1.0); Bellwether, Taunt for 1 turn and Counterattack for 2 on himself, on a cooldown of 4: the roster's first Counterattack and second Taunt; Herder's Ward, a Shield of 10% of his max HP (150) for 1 turn on the ally with the lowest max HP, himself included, at the end of every second turn of his: the first passive that protects an ally, the first that acts at the end of a turn | after 2-3 (a stand-in), not fought there |
| Emissary Handlings (`emissary_handlings`) | Tank, elite, Tide (a stand-in), Azure Crown | 96 | Banner Strike (1.0) with a 20% chance of Stun: the roster's first control on a skill; Rallying Standard, DEF Up on all allies for 2 turns on a cooldown of 5: the first A2 that rests five turns and the first team buff; Unbroken Flag, a 50% chance of a Shield of 15% of his max HP (210) on an ally an enemy has struck, after the hit: the first passive that answers a blow on someone else | after 2-5 (a stand-in), not fought there |
| Red Cloak (`red_cloak`) | Damage, elite, Bloom (a stand-in), Sanguine Dominion | 110 | Cleave (1.0); Crimson Blade (1.3) with a 50% chance of Burn for 2 turns: the roster's first Burn; Onrush (1.8) that gives every ally SPD Up for 2 turns on a cooldown of 5: its first SPD Up and the first attack that buffs its own line. The hardest hitter (ATK 126) | after 2-7 (a stand-in), not fought there |
| Big Ears (`big_ears`) | Damage, elite, Ember (a stand-in), Court of Root | 118 | Poison Dart (1.0) with a 35% chance of Poison for 1 turn: the roster's first Poison and its first darts; Dart Volley, three darts of 0.2 at every enemy, then Heal Block on all of them for 2 turns, on a cooldown of 5: the first Heal Block; Hidden in the Undergrowth, +15% C.RATE for each fallen ally, up to +30%: the first passive that grows as the battle turns. The frailest Elite (HP 960) and its first to crit at 5% | after 2-9 (a stand-in), not fought there |
| Associate (`associate`) | Support, elite, Ember (a stand-in), Azure Crown | 112 | Mote Bolt (1.0) with a 50% chance of ATK Down for 1 turn; Quickening, SPD Up for 2 turns and ATK Up for 1 on all allies, on a cooldown of 5: the roster's first ATK Up for the whole line; Bitter Motes, a 35% chance of Poison for 1 turn on an enemy whose attack hits her: the first passive that answers any hit on its holder | after 2-4 (a stand-in), not fought there |
| Black Rhino (`black_rhino`) | Tank, elite, Bloom (a stand-in), Sanguine Dominion | 90 | Gore (1.0) with a 20% chance of Stun; War Bellow, DEF Up on all allies for 2 turns and Counterattack on himself for 2, on a cooldown of 5; Thick Hide, a Shield of 10% of his max HP (152) on himself after every enemy attack that hits him: the first passive that guards its holder alone, and the third champion on four legs, the largest | after 2-6 (a stand-in), not fought there |
| Grove Keeper (`grove_keeper`) | Support, elite, Tide (a stand-in), Court of Root | 105 | Thornburst (1.0), then a heal of 7% of his max HP (92): the first blow that heals its user; Cleansing Rite, every debuff off one ally, on a cooldown of 3: the roster's first cleanse; Keeper's Balm, a 35% chance of Regen for 1 turn on an ally an enemy debuffs: its first Regen and the first passive that answers an affliction | after 2-8 (a stand-in), not fought there |
| Skeleton (`skeleton`) | Damage, common, Tide, Ashveil Reign | 108 | Rusty Hack, a hack of his rusty sword (1.0); Bare Bones, +20 RES in every battle: the roster's first RES, so the roster's debuffs (ACC 0) land on him with 83% of their chance; the Ashveil Reign's first champion | after 3-1 (a stand-in), not fought there |
| Rot Hulk (`rot_hulk`) | Tank, common, Ember, Ashveil Reign | 90 | Putrid Slam, both fists brought down on one enemy (1.0) with a 25% chance of Poison for 2 turns: the roster's first Poison on a Common and the first to last two turns, the Ashveil Reign's first debuff. The most HP of the Commons (1500) and, with the Walking Bush and the Black Rhino, the slowest; with no Taunt, the AI aims elsewhere (T20) | after 3-2 (a stand-in), not fought there |
| Bellringer (`bellringer`) | Support, common, Ember, Ashveil Reign | 110 | Warning Toll, a Shield of 10% of his max HP (130) for 1 turn on one ally, another while one stands, and a heal of 10% of his max HP for himself, no attack: the roster's first Shield from a skill; Last Peal, DEF Up for 2 turns the first time he drops below 50% HP: its first Overdrive. The tallest champion; he never strikes, so alone he outlasts a soft-hitting enemy and never beats it (T21) | after 3-3 (a stand-in), not fought there |
| Necromancer (`necromancer`) | Support, elite, Bloom, Ashveil Reign | 114 | Grave Chill, the black motes flung at one enemy (1.0) with a 35% chance of Slow for 1 turn; Plague Verse (1.2), Poison for 2 turns on one enemy and SPD Up for 2 turns on all allies, on a cooldown of 4; Raise Dead, one fallen ally, chosen at random, raised with 30% of its max HP, on a cooldown of 6 and ready only while an ally has fallen: the roster's first revive on a skill and its first A3 that rests six turns. The Ashveil Reign's first Elite and the fastest Support | after 4-1 (a stand-in), not fought there |
| Automated Soul (`automated_soul`) | Damage, elite, Tide, Ashveil Reign | 104 | Unerring Shot, an arrow at one enemy (1.0); Sundering Volley (0.6 on each enemy), a volley into the sky with DEF Down on every enemy for 2 turns, on a cooldown of 4: the roster's first DEF Down on the whole enemy line; Pinning Shot (1.3), ATK Up on himself for 2 turns placed before the shot, then a certain Stun for 1 turn, on a cooldown of 4: its first status placed before a hit and its first certain Stun. The Ashveil Reign's second Elite, an archer, and the strongest champion of the roster (T22) | after 4-2 (a stand-in), not fought there |
| Irving Wellbington (`irving_wellbington`) | Tank, elite, Bloom, Ashveil Reign | 90 | Shield Bash, the face of his shield driven into one enemy (1.0) with a 35% chance of Slow for 1 turn; Bulwark Slam (1.2), the rim brought down, then DEF Up for 2 turns and Counterattack for 1 on himself, on a cooldown of 4; Old Grudge, Taunt for 1 turn and a heal of 20% of his max HP (292) when an enemy's critical hit leaves him standing: the first passive that answers a crit on its holder for the holder. A dwarf skeleton behind a big round shield, the Ashveil Reign's third Elite, and the first Elite in the impact band (53%) | after 4-3 (a stand-in), not fought there |

Spread: roles Damage 8, Tank 8, Support 8; affinities Tide 8, Ember 8, Bloom 8 (the seven Elites' of 2026-10-17 are stand-ins, chosen to even them out, two of each in every faction; the Bellringer became an Ember on Jakub's word, 2026-10-18, the Necromancer is a Bloom, the Automated Soul a Tide and Irving Wellbington a Bloom on his); rarities Elite 12, Common 12 (Heroic and Mythic have budgets but no champions, T8); factions Azure Crown 6, Sanguine Dominion 6, Court of Root 6, the Ashveil Reign 6.

### ME4 The campaign

Zone 1, the *Fracture Reach*, from Jakub's working notes (DESIGN_DECISIONS.md 5.3, not locked). Its enemies are copies of the two champions, standing in for the warriors of both worlds until enemies are designed, so the leans are thin: the warrior copies are Ember, the support copies Tide.

| Stage | Enemies | Power | Kind | Lean (Ember / Tide attackers) | First introduces |
| --- | --- | --- | --- | --- | --- |
| 1-1 | 2 Gareths | 0.48 | first | Tide +2 (not owned yet) | the fight: Line Cut, Iron Blow and its ATK Up, Wide Sweep through two enemies; brings the Rime Scholar |
| 1-2 | Gareth, Rime Scholar | 0.81 | normal | Ember -1, Tide +1 | Slow on the player's team (an enemy Rimebind); an enemy's Cold Rebuke |
| 1-3 | 2 Gareths | 1.03 | normal | Tide +2 | duplicate enemies, stronger than the player's own |
| 1-4 | Gareth, Rime Scholar | 0.86 | normal | Ember -1, Tide +1 | brings the Follower |
| 1-5 | 2 Gareths, Rime Scholar | 0.92 | normal | Ember -1, Tide +2 | three enemies; a full team of three; brings the Skirmisher |
| 1-6 | Gareth, 2 Rime Scholars | 0.90 | normal | Ember -2, Tide +1 | four champions to choose three from; two Rimebinds: the team slowed for long stretches; brings the Dominion Medic |
| 1-7 | 2 Gareths, Rime Scholar | 0.73 | normal | Ember -1, Tide +2 | five champions to choose three from; brings the Lineholder |
| 1-8 | 3 Gareths | 0.71 | normal | Tide +3 | three Wide Sweeps; six champions to choose three from; brings the Bloodhound |
| 1-9 | 2 Gareths, Rime Scholar | 0.68 | normal | Ember -1, Tide +2 | seven champions to choose three from; brings the Quartermaster |
| 1-10 | Gareth (boss), 2 Rime Scholars | 0.70 | boss | Ember -2, Tide +1 | boss HP and crown; eight champions to choose three from; brings the Enforcer |

Zone 2, the *Verdant Grove*: ten placeholder stages Jakub asked for to test the area in game (2026-10-13). Their texts quote the arc of his notes (DESIGN_DECISIONS.md 5.4: approach, arrival, the contest, the outcome); their enemies are copies of the roster's champions, the Court of Root's only one, the Follower, in eight of them, and stand in until he dictates them. The player owns all nine champions at 2-1 (84 teams of three), ten at 2-2 (120 teams), eleven at 2-3 (165 teams), twelve at 2-4 and 2-5 (220 teams), thirteen at 2-6 and 2-7 (286), fourteen at 2-8 and 2-9 (364) and fifteen at 2-10 (455), as the first clears of 2-1, 2-2, 2-3, 2-5, 2-7 and 2-9 bring the Walking Bush, the Wild Speaker, the Jungle Herder, Emissary Handlings, Red Cloak and Big Ears (stand-ins); since the three Elites after them, 2-4, 2-6 and 2-8 bring the Associate, the Black Rhino and the Grove Keeper, so the player owns twelve at 2-4, one more at each stage after it and all eighteen at 2-10.

| Stage | Enemies | Power | Kind | Lean (Ember / Bloom / Tide attackers) | First introduces |
| --- | --- | --- | --- | --- | --- |
| 2-1 | 2 Followers | 1.03 | normal | Ember -2, Bloom +2, Tide 0 | the Follower as an enemy: two wolves faster than most of the roster; brings the Walking Bush |
| 2-2 | 3 Followers | 0.70 | normal | Ember -3, Bloom +3, Tide 0 | a pack of three; brings the Wild Speaker |
| 2-3 | Lineholder, Follower, Quartermaster | 0.89 | normal | Ember -1, Bloom +2, Tide -1 | a Tank and a healer among the enemies; brings the Jungle Herder |
| 2-4 | Bloodhound, Follower, Dominion Medic | 0.99 | normal | Ember -2, Bloom +1, Tide +1 | an enemy Taunt and an enemy who heals every turn; brings the Associate |
| 2-5 | Enforcer, Skirmisher, Follower | 0.82 | normal | even | three Damage dealers, one of each affinity; brings Emissary Handlings |
| 2-6 | Lineholder, Rime Scholar, Follower | 0.81 | normal | Ember -3, Bloom +3, Tide 0 | Rimebind and Cold Rebuke in the Grove; brings the Black Rhino |
| 2-7 | Bloodhound, Enforcer, Quartermaster | 1.02 | normal | Ember +1, Bloom -2, Tide +1 | a slow, sturdy line: the player opens most battles; brings Red Cloak |
| 2-8 | Gareth, 2 Followers | 0.76 | normal | Ember -2, Bloom +1, Tide +1 | an Elite among the enemies; brings the Grove Keeper |
| 2-9 | Gareth, Rime Scholar, Dominion Medic | 0.83 | normal | Ember -2, Bloom +1, Tide +1 | both Elites with a healer; brings Big Ears |
| 2-10 | Follower (boss), Gareth, Rime Scholar | 0.71 | boss | Ember -2, Bloom +1, Tide +1 | a boss wolf with both Elites |

Zone 3, the *Moonlit Basin*: ten placeholder stages (2026-10-17), my addition so its background can be seen in game, like Zone 2's. Their texts walk Jakub's description (DESIGN_DECISIONS.md 5.6), their enemies are copies of the roster's champions, newer Elites among them, and stand in until he dictates them; 3-1 brings the Skeleton, 3-2 the Rot Hulk and 3-3 the Bellringer (2026-10-18, stand-ins), so 3-1 averages 816 teams of three, 3-2 969, 3-3 1140 and 3-4 to 3-10 all 1330.

| Stage | Enemies | Power | Kind | Lean (Ember / Bloom / Tide attackers) | First introduces |
| --- | --- | --- | --- | --- | --- |
| 3-1 | Associate, Follower, Walking Bush | 0.92 | normal | even | the basin; one enemy of each affinity; brings the Skeleton (2026-10-18) |
| 3-2 | Grove Keeper, Wild Speaker, Follower | 0.84 | normal | Ember -2, Bloom +1, Tide +1 | an enemy who cleanses his allies and heals himself; brings the Rot Hulk (2026-10-18) |
| 3-3 | Jungle Herder, Big Ears, Follower | 0.75 | normal | even | an enemy Taunt and Shields with Poison darts behind them; brings the Bellringer (2026-10-18) |
| 3-4 | Emissary Handlings, Skirmisher, Rime Scholar | 0.81 | normal | Ember -1, Bloom +2, Tide -1 | an enemy line that Stuns, guards and Freezes |
| 3-5 | Black Rhino, Enforcer, Dominion Medic | 0.86 | normal | even | an enemy Counterattack and a healer |
| 3-6 | Red Cloak, Bloodhound, Associate | 0.84 | normal | Ember +1, Bloom -2, Tide +1 | Burn, SPD Up and Quickening on the enemy side |
| 3-7 | Jungle Herder, Grove Keeper, Big Ears | 0.81 | normal | even | the Court of Root's three Elites together |
| 3-8 | Emissary Handlings, Gareth, Associate | 0.75 | normal | Ember -1, Bloom -1, Tide +2 | the Azure Crown's three Elites together |
| 3-9 | Black Rhino, Red Cloak, Dominion Medic | 0.80 | normal | Ember +1, Bloom +1, Tide -2 | the Sanguine Dominion's two Elites with its healer |
| 3-10 | Black Rhino (boss), Grove Keeper, Big Ears | 0.76 | boss | even | a boss bull, the last stage of the area |

Zone 4, *Earth Scars*: ten placeholder stages (2026-10-18) on Jakub's request ("create also 10 placehold levels like in the past"). Their texts walk his description (DESIGN_DECISIONS.md 5.7), their enemies are copies of the roster's champions, the Ashveil Reign's Skeleton and Rot Hulk among them for the first time, and stand in until he dictates them; 4-1 brings the Necromancer and 4-2 the Automated Soul (2026-10-18), 4-3 Irving Wellbington (2026-10-19; all three stand-ins), so 4-1 averages 1330 teams of three, 4-2 1540, 4-3 1771 and 4-4 to 4-10 all 2024; no enemy line holds a champion that never strikes.

| Stage | Enemies | Power | Kind | Lean (Ember / Bloom / Tide attackers) | First introduces |
| --- | --- | --- | --- | --- | --- |
| 4-1 | Skeleton, Follower, Wild Speaker | 0.83 | normal | Ember -2, Bloom +1, Tide +1 | the steppe; the Ashveil Reign among the enemies: a Skeleton's +20 RES; brings the Necromancer (2026-10-18) |
| 4-2 | Rot Hulk, Skirmisher, Enforcer | 0.84 | normal | Ember +1, Bloom -2, Tide +1 | the Rot Hulk's Poison on the enemy side; brings the Automated Soul (2026-10-18) |
| 4-3 | Skeleton, Skeleton, Big Ears | 0.81 | normal | Ember -2, Bloom +1, Tide +1 | two Skeletons in one line; brings Irving Wellbington (2026-10-19) |
| 4-4 | Black Rhino, Red Cloak, Grove Keeper | 0.66 | normal | Ember +1, Bloom +1, Tide -2 | the strongest line: Counterattack and Thick Hide, Burn, a cleanse |
| 4-5 | Rot Hulk, Associate, Bloodhound | 0.95 | normal | Ember 0, Bloom -3, Tide +3 | three Embers: a stage for Tide teams |
| 4-6 | Jungle Herder, Skeleton, Rime Scholar | 0.82 | normal | Ember -1, Bloom +2, Tide -1 | Taunt and Shields in front of a Skeleton and Freeze |
| 4-7 | Emissary Handlings, Red Cloak, Follower | 0.71 | normal | Ember -1, Bloom +2, Tide -1 | Stun, DEF Up and Burn from three factions |
| 4-8 | Lineholder, Big Ears, Associate | 0.87 | normal | Ember -1, Bloom -1, Tide +2 | quick Poisoners behind a Tank: the player seldom opens |
| 4-9 | Rot Hulk, Gareth, Grove Keeper | 0.84 | normal | Ember -1, Bloom -1, Tide +2 | a slow line: the player opens most battles |
| 4-10 | Red Cloak (boss), Skeleton, Rot Hulk | 0.81 | boss | even | a boss Red Cloak, the last stage of the area |

Zone 5, the *Snowy Mesa*: ten placeholder stages (2026-10-19) on Jakub's request ("create also combat background and 10 placeholder stages"). Their texts walk his description (DESIGN_DECISIONS.md 5.8), their enemies are copies of the roster's champions, the Ashveil Reign's three Elites among them, and stand in until he dictates them; no champion joins there, so every stage averages all 2024 teams of three. No enemy line holds a champion that never strikes: a first 5-1 with the Bellringer in it stalled 3.4% of its battles, a lone Bellringer outlasting many teams (T21).

| Stage | Enemies | Power | Kind | Lean (Ember / Bloom / Tide attackers) | First introduces |
| --- | --- | --- | --- | --- | --- |
| 5-1 | Skeleton, Rot Hulk, Follower | 0.89 | normal | Ember -2, Bloom +1, Tide +1 | the mesa's top; the Reign's two Commons in one line |
| 5-2 | Black Rhino, Associate, Follower | 0.70 | normal | even | Gore's Stun and Thick Hide behind SPD Up |
| 5-3 | Irving Wellbington, Skirmisher, Wild Speaker | 0.80 | normal | Ember +2, Bloom -1, Tide -1 | Irving Wellbington on the enemy side: Old Grudge answers the player's crits |
| 5-4 | Jungle Herder, Necromancer, Enforcer | 0.74 | normal | Ember +2, Bloom -1, Tide -1 | Raise Dead on the enemy side: a fallen enemy gets up again |
| 5-5 | Lineholder, Automated Soul, Quartermaster | 0.81 | normal | Ember -1, Bloom +2, Tide -1 | the Automated Soul's Stun and DEF Down on the player's line |
| 5-6 | Emissary Handlings, Big Ears, Grove Keeper | 0.81 | normal | Ember -2, Bloom +1, Tide +1 | quick Poison and Heal Block behind a banner, a cleanse |
| 5-7 | Bloodhound, Red Cloak, Dominion Medic | 0.94 | normal | even | Taunt in front of Burn, and a healer |
| 5-8 | Rot Hulk, Automated Soul, Necromancer | 0.70 | normal | even | the Reign's line: Poison, Stun and a raised ally |
| 5-9 | Irving Wellbington, Gareth, Rime Scholar | 0.77 | normal | even | the starters behind a Tank who answers crits |
| 5-10 | Irving Wellbington (boss), Necromancer, Automated Soul | 0.67 | boss | Ember +1, Bloom +1, Tide -2 | a boss Irving Wellbington with the Reign's other Elites, the last stage of the area |

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
| Frontier | the newest playable stage: map focus, the collection's and Weaving's backdrop, the menu's CAMPAIGN label | `frontier` |
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

### 6.0 Zone 1 (2026-10-10)

Jakub's content: Captain Gareth and the Rime Scholar (the Starter Heroes record, kits with stand-in numbers), the Skirmisher from 1-6 and the Lineholder from 1-8 (both re-measured 2026-10-11), the Bloodhound from 1-9 and the Dominion Medic from 1-7 (re-measured 2026-10-12), the Follower from 1-5 (re-measured 2026-10-13) and Zone 1 with stand-in enemies (copies of the first two). `npm test`, `npm run typecheck`, `npm run audit` and `npm run balance` passed with impact skipped (it needs six champions) until the Enforcer made six (2026-10-12; see the end of this section). Every team the player can own at that point (the champions owned by then, three at most: one team up to 1-5, four at 1-6, ten at 1-7, twenty at 1-8, thirty-five at 1-9, fifty-six at 1-10) is auto-battled 300 times (seeds 1000-1299) with the 6.5 loop; a row averages its teams:

| Stage | Power | Team size | Auto win | Actions | 3-star share of wins | Player opens | Strong / weak hits | Skipped turns | Cold Rebukes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1-1 | 0.48 | 1 | 93% | 6.8 | 100% | 31% | 0% / 0% | 0.00 | 0.00 |
| 1-2 | 0.81 | 2 | 90% | 11.2 | 62% | 50% | 28% / 20% | 0.03 | 0.07 |
| 1-3 | 1.03 | 2 | 81% | 9.6 | 20% | 59% | 33% / 23% | 0.02 | 0.04 |
| 1-4 | 0.86 | 2 | 87% | 11.8 | 48% | 50% | 28% / 20% | 0.04 | 0.07 |
| 1-5 | 0.92 | 3 | 79% | 12.6 | 26% | 90% | 28% / 26% | 0.01 | 0.04 |
| 1-6 | 0.90 | 3 (4 teams) | 78% | 15.1 | 29% | 84% | 26% / 31% | 0.04 | 0.09 |
| 1-7 | 0.73 | 3 (10 teams) | 78% | 17.3 | 45% | 82% | 25% / 36% | 0.02 | 0.04 |
| 1-8 | 0.71 | 3 (20 teams) | 76% | 16.3 | 39% | 80% | 32% / 51% | 0.01 | 0.01 |
| 1-9 | 0.68 | 3 (35 teams) | 65% | 19.7 | 37% | 69% | 24% / 34% | 0.02 | 0.04 |
| 1-10 | 0.70 | 3 (56 teams) | 50% | 26.3 | 16% | 61% | 25% / 31% | 0.04 | 0.06 |

(Skipped turns and Cold Rebukes are per battle.) Since 2026-10-13 the Follower fights from 1-5: the fastest champion (SPD 114), so the player opens 90% of the battles there, and a Tide wolf who hits the Gareth copies strong, so the team of three won every battle at 1-5's old power (0.67) and 1-5 runs at 0.92; 1-6 to 1-10 got easier (78 / 78 / 76 / 65 / 50% from 81 / 71 / 65 / 60 / 46%) inside their bands, so their powers stay. At 1-6 Gareth, the Follower and the Skirmisher win 49%, the other three teams 81-95%. From 1-6 the Skirmisher fights too: the player opens most battles (his SPD 110), weak hits outnumber strong ones (his Bloom cuts the Gareth copies weak, and their Ember cuts him strong), and flawless wins all but vanish at 1-6 and 1-7 (12-18% of wins): with HP 960 he is the one who falls, and three stars need all three standing. From 1-8 the Lineholder joins and the four teams split wide: Gareth and the Rime Scholar with either Common win 77-100% (flawless in 8-69% of wins), the Rime Scholar with both Commons 47-63%, Gareth with both Commons 9-22%. The rows average them, so 1-8 to 1-10 run at lower powers (T20), and flawless wins come back (9-42%). From 1-7 the Dominion Medic joins, who heals and never strikes: the teams that take him in place of an attacker fight longer (battles now run to 27.7 actions at 1-10) and Gareth with the Skirmisher and him wins only 12-28%; Gareth and the Rime Scholar with any third still win 92-100%, and the teams of Commons alone 0-16%. Averaged over four, ten, twenty and thirty-five teams, 1-7, 1-9 and 1-10 run at lower powers (0.82 -> 0.73, 0.71 -> 0.68, 0.72 -> 0.70; 1-8 stays at 0.71). The curve falls from 93% to 50%; on these seeds 1-4 sits a few points above 1-3, inside the noise of 300 battles (on seeds 1-300 the curve falls but for 1-6 and 1-7, a point above 1-5, see MECHANICS_GUIDE 10). Battles run 6.8 to 26.3 actions. The Rime Scholar hits Gareth's copies strong, so strong hits now outnumber weak ones, and stages of Gareths need more power; their Wide Sweeps make flawless wins rare there (18-20% of wins). Cold Rebuke fires once in 8 to 25 battles: both kits crit at 2.5%, as Jakub keeps crit out of Gareth's kit, so it rarely meets a critical hit in Zone 1; it is the roster's only control (T19).

Impact (2026-10-12, `npm run balance` section 3, 960 battles per champion, band 40-60%), with the Enforcer six champions (Gareth 83%, the Rime Scholar 71%, the Enforcer 44%, the Skirmisher 44%, the Quartermaster 37%, the Lineholder 23%), with the Bloodhound seven, with the Dominion Medic eight (Gareth 84%, the Rime Scholar 72%, the Skirmisher 52%, the Enforcer 49%, the Quartermaster 43%, the Bloodhound 42%, the Lineholder 30%, the Dominion Medic 28%), with the Follower nine (Gareth 80%, the Rime Scholar 72%, the Skirmisher 56%, the Follower 55%, the Enforcer 45%, the Quartermaster 45%, the Bloodhound 39%, the Lineholder 33%, the Dominion Medic 28%), with the Walking Bush ten (Gareth 84%, the Rime Scholar 73%, the Follower 57%, the Skirmisher 56%, the Enforcer 51%, the Quartermaster 44%, the Bloodhound 40%, the Walking Bush 34%, the Lineholder 32%, the Dominion Medic 29%), with the Wild Speaker eleven (2026-10-13: Gareth 81%, the Rime Scholar 74%, the Follower 57%, the Skirmisher 55%, the Wild Speaker 51%, the Enforcer 48%, the Bloodhound 41%, the Quartermaster 40%, the Walking Bush 34%, the Lineholder 33%, the Dominion Medic 30%), with the four Elites fifteen (2026-10-17): Gareth 74%, Red Cloak 74%, the Jungle Herder 63%, Emissary Handlings 63%, Big Ears 62%, the Rime Scholar 62%, the Skirmisher 50%, the Wild Speaker 50%, the Follower 48%, the Enforcer 46%, the Bloodhound 38%, the Quartermaster 37%, the Lineholder 31%, the Dominion Medic 31%, the Walking Bush 29%; with the Skeleton nineteen (2026-10-18): Gareth 77%, Red Cloak 73%, Emissary Handlings 64%, the Jungle Herder, Big Ears, the Rime Scholar and the Black Rhino 62%, the Associate 57%, the Grove Keeper 51%, the Skirmisher 47%, the Follower 45%, the Wild Speaker and the Enforcer 44%, the Skeleton 41%, the Quartermaster 37%, the Bloodhound 32%, the Dominion Medic 31%, the Lineholder 29%, the Walking Bush 28% (a Common more among the opponents lifts the Elites: three of them crossed 60%); with the Rot Hulk twenty (2026-10-18): Gareth 76%, Red Cloak 75%, Big Ears, the Jungle Herder and Emissary Handlings 64%, the Black Rhino 61%, the Rime Scholar 60%, the Associate 56%, the Grove Keeper 55%, the Skirmisher 51%, the Follower 47%, the Wild Speaker 45%, the Enforcer 44%, the Skeleton 43%, the Rot Hulk 40% (a hair under the band, above the other Common Tanks), the Quartermaster 35%, the Bloodhound 34%, the Dominion Medic 32%, the Lineholder 30%, the Walking Bush 27%; with the Bellringer twenty-one (2026-10-18): Gareth 78%, Red Cloak 73%, Emissary Handlings 66%, the Black Rhino 64%, the Jungle Herder 63%, the Rime Scholar 63%, Big Ears 62%, the Associate 56%, the Grove Keeper 55%, the Follower 48%, the Wild Speaker 47%, the Skirmisher 46%, the Enforcer 45%, the Rot Hulk and the Skeleton 43%, the Quartermaster 38%, the Bloodhound 34%, the Dominion Medic 33%, the Walking Bush 31%, the Lineholder 29%, the Bellringer 20% (as an Ember; 21% as a Bloom; the roster's lowest: he never strikes; a weaker Common in the random pool lifts the Rot Hulk back into the band); with the Necromancer twenty-two (2026-10-18): Gareth 76%, Red Cloak 70%, the Necromancer 66%, Emissary Handlings 64%, the Jungle Herder 63%, the Black Rhino 62%, the Rime Scholar and Big Ears 60% (she a hair over the band, he a hair inside it), the Associate 57%, the Grove Keeper 52%, the Follower 48%, the Enforcer 47%, the Skirmisher and the Wild Speaker 46%, the Rot Hulk 43%, the Skeleton 41%, the Quartermaster 37%, the Dominion Medic and the Bloodhound 34%, the Lineholder 29%, the Walking Bush 28%, the Bellringer 21% (an Elite more among the opponents pulls the other Elites down by up to three points; a team that takes him gets its fallen back); with the Automated Soul twenty-three (2026-10-18): the Automated Soul 78%, Gareth 72%, Red Cloak 70%, the Necromancer 63%, the Black Rhino and the Jungle Herder 61%, Emissary Handlings 60% (a hair over the band), Big Ears 59%, the Rime Scholar 57%, the Associate 53%, the Grove Keeper 50%, the Skirmisher 47%, the Follower and the Wild Speaker 46%, the Enforcer 42%, the Skeleton and the Rot Hulk 41%, the Quartermaster 37%, the Bloodhound 35%, the Dominion Medic 31%, the Lineholder 30%, the Walking Bush 29%, the Bellringer 20% (his kit, a certain Stun every four turns and DEF Down on the whole enemy line, makes him the roster's strongest: 82% with his first stand-ins, 78% with his multipliers near the floor of the norms, T22); with Irving Wellbington twenty-four (2026-10-19): the Automated Soul 77%, Gareth 73%, Red Cloak 69%, the Black Rhino 62%, the Jungle Herder, the Necromancer and Big Ears 61%, Emissary Handlings 60%, the Rime Scholar 57%, the Associate 54%, Irving Wellbington 53%, the Grove Keeper 51%, the Wild Speaker 46%, the Enforcer and the Skirmisher 45%, the Follower 43%, the Rot Hulk 41%, the Skeleton 40%, the Quartermaster 38%, the Bloodhound 34%, the Dominion Medic 31%, the Walking Bush 30%, the Lineholder 29%, the Bellringer 21% (the first Elite in the band: a Tank whose Taunt comes only with a crit, and whose Counterattack answers with a blow of 1.0). Random teams pit the Elites against mostly Commons, so whoever has them wins; with more Elites among the opponents Gareth and the Rime Scholar fall back toward the band, and the Bloodhound and the Quartermaster slip under it; the two Tanks with no Taunt hit least and draw no fire, and the Medic never strikes (T20). The thirteen lines out of band wait for Jakub's balance (decision log, 2026-10-12, 2026-10-13, 2026-10-17 and 2026-10-18).

### 6.0b Zone 2's placeholder stages (2026-10-13)

Measured the same way over every team the player owns there (all nine champions at 2-1, 84 teams; ten at 2-2, 120 teams; eleven at 2-3, 165 teams; then 220, 286, 364 and 455 teams as the four Elites join), 300 battles each (seeds 1000-1299), re-measured with the Walking Bush and again with the Wild Speaker (2026-10-13), and with the four Elites (2026-10-17):

| Stage | Power | Team size | Auto win | Actions | 3-star share of wins | Player opens | Strong / weak hits | Skipped turns | Cold Rebukes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2-1 | 1.03 | 3 (84 teams) | 89% | 14.4 | 40% | 16% | 32% / 24% | 0.00 | 0.01 |
| 2-2 | 0.70 | 3 (120 teams) | 88% | 18.9 | 37% | 9% | 32% / 27% | 0.01 | 0.01 |
| 2-3 | 0.89 | 3 (165 teams) | 78% | 29.0 | 29% | 26% | 35% / 31% | 0.01 | 0.01 |
| 2-4 | 0.99 | 3 (220 teams) | 79% | 37.7 | 57% | 23% | 33% / 36% | 0.01 | 0.01 |
| 2-5 | 0.82 | 3 (220 teams) | 81% | 18.0 | 37% | 19% | 34% / 32% | 0.01 | 0.02 |
| 2-6 | 0.81 | 3 (286 teams) | 81% | 25.9 | 42% | 21% | 33% / 30% | 0.16 | 0.06 |
| 2-7 | 1.02 | 3 (286 teams) | 68% | 29.9 | 32% | 71% | 34% / 37% | 0.22 | 0.02 |
| 2-8 | 0.76 | 3 (364 teams) | 78% | 17.4 | 43% | 13% | 33% / 34% | 0.06 | 0.01 |
| 2-9 | 0.83 | 3 (364 teams) | 75% | 31.9 | 58% | 52% | 32% / 32% | 0.23 | 0.05 |
| 2-10 | 0.71 | 3 (455 teams) | 71% | 20.7 | 40% | 34% | 31% / 34% | 0.11 | 0.04 |

The powers were found by search against the report's 20 battles per team, for a curve from 89% down to 54% (MECHANICS_GUIDE 10). The Walking Bush joins after 2-1: a team that takes him in place of an attacker fights longer and wins less, so from 2-3 the averages fell 3-10 points (2-9 under the band, its power 0.84 -> 0.83) and battles run longer (2-4 to 39.5 actions on average). The Wild Speaker joins after 2-2, an Ember who strikes with both skills: each stage moved by its lean, 2-7 (a Bloom Quartermaster among its enemies, Ember +1) up 5 points and 2-5 up 4, 2-6 (three Tide enemies, Ember -3) down 3 and 2-10 down 2, the rest by 2 points or less, all inside their bands, so no power changed; 2-4 now runs to 38.5 actions. Teams split wide on every stage: the best win every battle, while the weakest wins about a third of the battles at 2-1 and 2-2 and almost none from 2-3 on (0-4%). Wherever Followers stand among the enemies the player seldom opens (9-27%): at SPD 114 they outpace every other champion. The four Elites join after 2-3, 2-5, 2-7 and 2-9 (2026-10-17): every later stage got easier, most from 2-8 on (2-8 59% to 78%, 2-9 56% to 75%, 2-10 45% to 71%), all in band, so no power changed and the decline the powers were searched for has flattened; flawless wins rose (to 32-58% of wins), as Shields, a second Taunt and SPD Up keep the frail standing; skipped turns rose at 2-6, 2-7 and 2-9 (0.16-0.23 a battle), where Emissary Handlings' Banner Strike Stuns the enemy line by chance.

### 6.0c Zone 3's placeholder stages (2026-10-17)

Measured with the copy of the loop in 6.5 over every team the player owns there (all eighteen champions at 3-1, 816 teams of three; with the Skeleton nineteen at 3-2, 969 teams; with the Rot Hulk twenty at 3-3, 1140 teams; with the Bellringer twenty-one from 3-4, 1330 teams; re-measured 2026-10-18, the Bellringer an Ember), with the balance tool's seeds 1-20 per team, so the win column is the report's own:

| Stage | Power | Team size | Auto win | Actions | 3-star share of wins | Player opens | Strong / weak hits | Skipped turns | Cold Rebukes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3-1 | 0.92 | 3 (816 teams) | 86% | 25.8 | 32% | 26% | 32% / 33% | 0.25 | 0.01 |
| 3-2 | 0.84 | 3 (969 teams) | 84% | 22.2 | 36% | 32% | 30% / 36% | 0.18 | 0.01 |
| 3-3 | 0.75 | 3 (1140 teams) | 78% | 20.3 | 37% | 13% | 33% / 34% | 0.15 | 0.01 |
| 3-4 | 0.81 | 3 (1330 teams) | 66% | 31.2 | 37% | 51% | 37% / 33% | 1.03 | 0.05 |
| 3-5 | 0.86 | 3 (1330 teams) | 65% | 58.7 | 65% | 82% | 29% / 40% | 2.69 | 0.01 |
| 3-6 | 0.84 | 3 (1330 teams) | 65% | 27.1 | 18% | 38% | 29% / 32% | 0.22 | 0.00 |
| 3-7 | 0.81 | 3 (1330 teams) | 60% | 26.9 | 35% | 18% | 33% / 33% | 0.23 | 0.01 |
| 3-8 | 0.75 | 3 (1330 teams) | 57% | 32.0 | 27% | 46% | 32% / 31% | 0.99 | 0.01 |
| 3-9 | 0.80 | 3 (1330 teams) | 56% | 48.6 | 53% | 51% | 30% / 41% | 2.17 | 0.00 |
| 3-10 | 0.76 | 3 (1330 teams) | 49% | 42.1 | 40% | 18% | 32% / 36% | 2.16 | 0.01 |

The powers were found by search over all 816 teams for a curve from 86% down to 57% (MECHANICS_GUIDE 10); with the Skeleton in the pool from 3-2 the stages after it fell by up to three points (to 55% at the boss), with the Rot Hulk from 3-3 by up to three more, and with the Bellringer from 3-4, a Common who never strikes, by five to seven more (3-4 72% to 66%, the boss 53% to 50%): 3-9 fell under its band (54%) and runs at 0.80 (was 0.81; 56%), and every other power stayed; made an Ember the same day, he moved every stage by a point at most. Teams split as wide as ever: on every stage the weakest team wins no battle and the best wins them all; the median team wins 95-100% up to 3-3, 80% at 3-4 and 50% at the boss. From 3-4 some battles stall at the 400-turn cap, 0.1-3.3% of them (the most at 3-5 and 3-9), nearly all with only a Bellringer or a Dominion Medic left on the player's side: they count as losses and lengthen the average (T21). Where the Black Rhino stands among the enemies (3-5, 3-9, 3-10) battles run longest (42-59 actions) and turns are skipped most (2.1-2.7 a battle), as Gore Stuns by chance and War Bellow's Counterattack and Thick Hide keep him standing; flawless wins are commonest there too (40-65% of wins), as the enemy line hits slowly. Where the Follower or Big Ears stands among them the player seldom opens (13-32%).

### 6.0d Zone 4's placeholder stages (2026-10-18)

Measured with the copy of the loop in 6.5 over every team the player owns there (all twenty-one champions at 4-1, 1330 teams of three; with the Necromancer twenty-two at 4-2, 1540 teams; with the Automated Soul twenty-three at 4-3, 1771 teams; with Irving Wellbington twenty-four from 4-4, 2024 teams; re-measured 2026-10-19), with the balance tool's seeds 1-20 per team, so the win column is the report's own:

| Stage | Power | Team size | Auto win | Actions | 3-star share of wins | Player opens | Strong / weak hits | Skipped turns | Cold Rebukes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4-1 | 0.83 | 3 (1330 teams) | 86% | 21.2 | 36% | 28% | 30% / 34% | 0.11 | 0.01 |
| 4-2 | 0.84 | 3 (1540 teams) | 85% | 23.1 | 44% | 56% | 30% / 33% | 0.16 | 0.01 |
| 4-3 | 0.81 | 3 (1771 teams) | 85% | 16.9 | 48% | 18% | 32% / 35% | 0.10 | 0.00 |
| 4-4 | 0.66 | 3 (2024 teams) | 82% | 29.2 | 53% | 51% | 37% / 32% | 1.05 | 0.01 |
| 4-5 | 0.95 | 3 (2024 teams) | 77% | 30.6 | 37% | 43% | 30% / 34% | 0.31 | 0.01 |
| 4-6 | 0.82 | 3 (2024 teams) | 79% | 25.3 | 44% | 60% | 35% / 32% | 0.25 | 0.04 |
| 4-7 | 0.71 | 3 (2024 teams) | 76% | 25.0 | 37% | 31% | 37% / 32% | 0.81 | 0.00 |
| 4-8 | 0.87 | 3 (2024 teams) | 71% | 26.0 | 37% | 14% | 34% / 33% | 0.22 | 0.00 |
| 4-9 | 0.84 | 3 (2024 teams) | 68% | 25.9 | 36% | 76% | 33% / 33% | 0.21 | 0.00 |
| 4-10 | 0.81 | 3 (2024 teams) | 65% | 24.9 | 22% | 48% | 32% / 33% | 0.30 | 0.01 |

The powers were found by search over all 1330 teams for a curve from 86% down to 56% (MECHANICS_GUIDE 10); with the Necromancer from 4-2 every stage got one to five points easier, and with the Automated Soul from 4-3 two to five more (the boss 65%, 56% before them both); Irving Wellbington from 4-4 moved them by a point at most; all in band, so no power changed. Teams split as wide as in Zone 3: on every stage the weakest team wins no battle and the best wins them all; the median team wins every battle up to 4-4 and at 4-6, and 80% at the boss. 4-4 runs at the lowest power: the Black Rhino's Counterattack and Thick Hide, Red Cloak's Burn and the Grove Keeper's cleanse make the strongest line, and its battles skip the most turns (1.05 a battle, Gore's Stun; Pinning Shot adds up to a tenth of a turn a battle on every stage) and have the most flawless wins (53%). 4-5, three Embers, runs at the highest power: Tide teams hit all three strong (Tide +3). The player opens most at 4-9 (76%: a slow line) and least at 4-8 (14%: Big Ears and the Associate are quick). Flawless wins are rarest at the boss (22% of wins): Red Cloak's sweep and Burn wear the line down. 0-0.7% of the battles stall at the 400-turn cap (0-0.9% before the Necromancer), all with only a Bellringer or a Dominion Medic left on the player's side (T21).

### 6.0e Zone 5's placeholder stages (2026-10-19)

Measured with the copy of the loop in 6.5 over every team the player owns there (all twenty-four champions at every stage, 2024 teams of three), with the balance tool's seeds 1-20 per team, so the win column is the report's own:

| Stage | Power | Team size | Auto win | Actions | 3-star share of wins | Player opens | Strong / weak hits | Skipped turns | Cold Rebukes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5-1 | 0.89 | 3 (2024 teams) | 86% | 23.4 | 40% | 32% | 31% / 34% | 0.17 | 0.01 |
| 5-2 | 0.70 | 3 (2024 teams) | 85% | 29.3 | 57% | 27% | 32% / 34% | 1.14 | 0.01 |
| 5-3 | 0.80 | 3 (2024 teams) | 81% | 26.0 | 44% | 51% | 31% / 34% | 0.21 | 0.01 |
| 5-4 | 0.74 | 3 (2024 teams) | 78% | 26.9 | 48% | 33% | 33% / 31% | 0.25 | 0.01 |
| 5-5 | 0.81 | 3 (2024 teams) | 76% | 29.1 | 37% | 79% | 36% / 32% | 1.32 | 0.01 |
| 5-6 | 0.81 | 3 (2024 teams) | 71% | 30.7 | 46% | 16% | 34% / 32% | 0.82 | 0.00 |
| 5-7 | 0.94 | 3 (2024 teams) | 70% | 34.1 | 39% | 51% | 30% / 37% | 0.38 | 0.00 |
| 5-8 | 0.70 | 3 (2024 teams) | 67% | 26.7 | 35% | 35% | 33% / 33% | 1.11 | 0.00 |
| 5-9 | 0.77 | 3 (2024 teams) | 61% | 25.4 | 33% | 75% | 33% / 34% | 0.27 | 0.04 |
| 5-10 | 0.67 | 3 (2024 teams) | 56% | 31.1 | 31% | 33% | 32% / 33% | 1.19 | 0.01 |

The powers were found by search over all 2024 teams for a curve from 86% down to 56% (MECHANICS_GUIDE 10), every stage in its band. Teams split as wide as in Zone 4: on every stage the weakest team wins no battle and the best wins them all; the median team wins every battle up to 5-3, 95% at 5-4 and 5-5, 85% from 5-6 to 5-8, 70% at 5-9 and 60% at the boss. 5-7 runs at the highest power (0.94) and its battles are the longest (34.1 actions): the Bloodhound's Taunt keeps the blows off Red Cloak while the Medic heals. 5-2 and 5-8 run at the lowest (0.70), and with 5-5 and the boss their battles skip the most turns (1.1-1.3 a battle): the Black Rhino's Gore and the Automated Soul's Pinning Shot Stun. The player opens most at 5-5 (79%) and 5-9 (75%), slow lines, and least at 5-6 (16%: Big Ears is quick). Flawless wins are commonest at 5-2 (57% of wins) and rarest at the boss (31%). 0.1-0.9% of the battles stall at the 400-turn cap, all with only non-strikers left on the player's side (T21).

The sections below are the proof of concept's baseline (commit `8dd9a26`, 2026-10-06, 39 tests): thirteen champions and ten stages that no longer exist, kept as the reference for a full roster.

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
| T3 | The AI is predictable: always the highest-priority ready skill. Good for learning (enemies telegraph), thin as a late-game challenge. Zone 1's two kits have no skill that rewards waiting, so it does not show there yet. | boss-specific AI (for example, a boss holding its A3 until its second act) |
| T4 | A finale's affinity lean is a design choice: the proof of concept's last boss was neutral on purpose. Zone 1's enemies are stand-ins, so its leans (Tide favoured throughout) say nothing yet. | decide the lean on purpose for every finale once enemies are designed |
| T5 | Stars only count losses: after 3 stars there is nothing left to chase, and there is no economy by design. | medals for turn count or no-auto clears, challenge modifiers, or accept it |
| T6 | Chapter gates run at power 1.35, shown in red as "power 135%", yet they are among the easier stages (82-84% on auto) because they field two enemies. The number frightens more than the fight does. | a difficulty rating that counts the enemies, or accept it |
| T7 | Battles are seeded with `Math.random` and the seed is never shown: a surprising loss cannot be replayed or reported. | show the seed on the results panel and accept `&seed=` ([DDD.md](DDD.md) R-12) |
| T8 | Latent vocabulary: the target `ally`, the rarities Heroic and Mythic, two of four factions, control, Counterattack, turn meter skills, Undying (and Overdrive until the Bellringer's Last Peal, 2026-10-18) exist in the model with no content today, so they are untested in play (the rules have tests on synthetic champions). | content using them gets a presentation review (ally markers, prompts) and rules tests |
| T9 | A failed buff roll (a chance Shield, say) is silent while a failed debuff shows `RESIST`. | decide whether the player should see it |
| T10 | Control can chain: a chance stun on an A2 and a guaranteed A3 stun on the same team can lock one enemy; there is no immunity window. The skipped share is fine today (at most 11.5%). | watch the skipped share whenever control is added; an immunity rule if it rises |
| T11 | Champion growth: gear is decided (the Weaver Matrix, section 9) and found in play since 2026-10-24 (spools drop from every stage); champions still have no levels, ranks or skill upgrades. Gear moves every balance band: the curve will need an expected matrix per stage, and `npm run balance` still plays without spools, so a farmed matrix makes every stage easier than its band says. | gear alone; or also levels, ascension, skill books |
| T12 | Acquisition: one recruit per first clear ties the size of the roster to the size of the campaign. | keep it; shards, summoning, fixed rewards or events |
| T13 | Team size is 3 (RSL 4-5, SWGOH 5). Formation slots, zone spawns, the HUD and every balance number depend on it. | decide early; 3, 4 or 5 |
| T14 | Team-building levers are few: no leader skills or auras, and formation is visual only (the front row does not protect the back). | leader skills or auras; positional rules |
| T16 | Status variety: no immunities, one revive (the Necromancer's Raise Dead, since 2026-10-18), ally-target skills unused (T8), four passive kinds (the stat passive since 2026-10-12; seven with tend, ward and fallen and nine with retaliate and remedy since 2026-10-17, and the first cleanse and Regen). | grow the vocabulary with the roster; every new protection needs an answer (DY6) |
| T17 | Modes: the campaign is the only mode; no dungeons, boss modes or events; PvP is excluded. | decide which modes the game has |
| T18 | Platform: a 640x360 web canvas with mouse and keyboard; RSL and SWGOH are phone games (touch, short sessions). | web only; or phones too (touch-first input, layout) |
| T20 | A Tank draws no fire: the AI hits the lowest HP share 70% of the time and nothing protects allies (the Lineholder has no Taunt, formation is visual only, T14), so his HP and DEF count only once the others are low. The Bloodhound (2026-10-12) is the first Tank with a Taunt (Bay, 1 turn on a cooldown of 4): while it lasts the enemies' single-target skills must hit him. The Jungle Herder (2026-10-17) is the second (Bellwether, with Counterattack), and he and Emissary Handlings are the first who protect allies, with Shields from their passives. Teams that pair the two Commons lose most late battles in Zone 1 (9-63%), and as the curve averages every team the player can own, 1-8 to 1-10 are tuned so the best teams win 95-100%. | Jakub decides what roles do (DESIGN_DECISIONS.md 7): a Taunt or a protect rule for Tanks, AI targeting by threat; or measure the curve on the teams a player would pick |
| T19 | Crit is load-bearing for Cold Rebuke, but crit is kept out of Gareth's kit (2.5%, the floor of the norms) and Zone 1's enemies are copies of the two, so the passive fires once in 8 to 25 battles there. The Enforcer crits at 12.5% in battle (Keen Edge, 2026-10-12), but he joins after 1-10 (a stand-in) and is not among Zone 1's enemies; Big Ears (2026-10-17) crits at 5%, up to 35% as his allies fall, and joins after 2-9. Jakub: crit must be taught at or before the point Cold Rebuke first fires meaningfully. | Jakub decides: enemies that crit (Zone 1's real enemies, or Zone 2), a crit teacher among the champions, or the Academy alone |
| T21 | A battle can stall: a side left only with champions that never strike can neither win nor lose. The Bellringer (2026-10-18) alone shields himself by 10% of his max HP and heals 10% every turn, so a lone enemy that hits softly never brings him down, and he never strikes back; a lone Bellringer against a lone Dominion Medic (3-9 fields one) cannot end at all. The battle runs until the player retreats (the pause menu); the balance tool stops at 400 turns and counts a loss: 0.1-3.3% of the battles from 3-4 on, 0-0.9% in Zone 4 (2026-10-18), 0.1-0.9% in Zone 5 (2026-10-19), where no stage fields the Bellringer (a first 5-1 with him stalled 3.4%). | Jakub decides (DESIGN_DECISIONS.md 7): a turn limit that ends the battle as a loss, a rule that a side which cannot strike loses, or accept it with RETREAT |
| T22 | A kit the stat budget cannot price: the budget weighs stats, and the statuses a kit places ride free. The Automated Soul (2026-10-18), a certain Stun every four turns on his A3 and DEF Down on the whole enemy line on his A2, wins 78% of random battles with his multipliers near the floor of the norms and his stats on budget (82% with his first stand-ins; about 76% with his ATK and multipliers lowered further), the roster's highest. | Jakub's balance; a longer cooldown on certain control; or a price for statuses in the budget (MECHANICS_GUIDE 10) |

## 9. Decision log

Record every change that moves a dynamic out of its band, changes a band, or changes a target aesthetic.

| Date | Change | Serves | Moves | Before -> after | Decision |
| --- | --- | --- | --- | --- | --- |
| 2026-10-06 | MDA baseline established (this document) | - | - | section 6 | reference point for later changes |
| 2026-10-08 | Final name and domain lexicon (The Loom: Reliquary of Legends); T11 decided in part: champions grow through gear, the Weaver Matrix | AE1, AE3 | none yet: the layout is a placeholder and no spools exist | - | outline approved by Jakub: six slots with fixed or variable stat nodes, Thread Spools, 2- and 4-piece Weave Patterns counted wherever their spools sit, a 2-piece pattern up to three times. Layout, spools, pattern bonuses and spool sources wait for the Weaver Matrix proposal |
| 2026-10-10 | Jakub's design decisions replace the proof-of-concept content ([DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)): the four category enums (Ember / Bloom / Tide, Common / Elite / Heroic / Mythic, Tank / Damage / Support, four factions), the two starting champions, Zone 1 of ten stages on a new map and background; everything else of the proof of concept removed | AE3, AE5 | every dynamic: thirteen champions become two (stand-in bodies and kits), ten stages become Zone 1 with stand-in enemies; impact cannot be measured below six champions | section 6.1-6.4 -> 6.0 | approved by Jakub ("go, implement the changes"). Stand-ins until he designs them: names, kits, stats, bodies, enemies, the size of an affinity edge, rarity budgets; Zone 1's art is a first take on his notes. The first stage fields two weak copies (power 0.35) so the first battle lasts about five actions instead of two |
| 2026-10-10 | The campaign map: the edge of a continent with a rift in the west and jungle in the east, nothing beyond its north and south edges; one node per area whose stage list opens as a popup instead of a dot per stage; stages unnamed; a second node (Zone 2, its stages not designed) | AE2, AE6 | none: the same stages and powers | ten dots on the map -> two nodes; names -> ids | set by Jakub |
| 2026-10-10 | Faction standards: the Court of Root a brown claw on green, the Ashveil Reign one white bone across a dark grey (about 80%), the Azure Crown's crown confirmed gold | AE5 | none | question marks -> designed medallions | set by Jakub |
| 2026-10-11 | Champions carry no subtitle: the stand-in titles ("Azure Crown captain", "Sanguine Dominion ice mage") removed from the data, the battle panel, the champion page, the recruit ceremony, the boss intro and the tooltips | AE2 | none | name + title -> name | set by Jakub ("I don't like these subtitles at all") |
| 2026-10-11 | Zone 1's battle background redesigned on Jakub's brief (DESIGN_DECISIONS.md 5.3a): asymmetric and broken, a burning field on the left, an overturned cart and its wheel on the right, bulky floating islands, a rift in the cosmos shedding sparks and waving veils of cosmic fabric, autumn and dawn. Engine: a far layer behind the tiles, bobbing props, spark emitters, the `leaves` ambience, fire props that paint their own flames | AE2, AE5 | none: art only; the floor stays mid value and low contrast | dusk settlement -> dawn after a raid | set by Jakub; the raid, the fence, the cart's load, the burnt farm, the arrows and the tree are a first take |
| 2026-10-10 | Jakub's Starter Heroes record: Captain Gareth (Line Cut; Iron Blow, ATK Up on himself after the hit; Wide Sweep, damage only; no passive) and the Rime Scholar (Pale Strike; Rimebind, Slow on every enemy; no A3; Cold Rebuke: below 35% HP, a critical hit on her freezes its attacker for 1 turn, with a cooldown), their looks and art. Rules: a champion may have two skills; the passive kind `rebuke`; a status placed during its holder's own turn starts counting at its next turn (needed for Iron Blow's two turns and for the Freeze to cost the attacker a turn); SPD Down named Slow | AE1, AE2, AE5, AE6 | the curve, re-tuned: stage powers 0.48-1.03 (were 0.35-0.89); 3-star share down on stages of Gareths; skipped turns appear (0.01-0.08 per battle) | section 6.0 re-measured | set by Jakub ("also generate high quality new art"). Stand-ins: stats (crit at the 2.5% floor, as crit is not introduced on Gareth), multipliers, cooldowns, Slow's 2 turns, Cold Rebuke's 3-turn rest, the titles, the heads and faces his record leaves open, the effects |
| 2026-10-10 | The gear system: the two-triangle layout, spools with a main stat (Ashen, Silver, Gilded) and strands, attunement, the MATRIX tab; DEF and CRIT closed on ATK and HP in the rules (damage x 40 / DEF, crits x2, every champion's DEF remapped and crit halved so battles stay the same) | AE1, AE3 | impact within ±3 points, curve -1 to +4 points; the impact measure now plays 960 battles per champion (240 flagged noise as a failure) | section 6 stays the reference; numbers moved inside the noise | approved by Jakub ("this looks like a good gear system"). Weave Patterns and spool sources are not defined yet; stage powers are re-measured once sources set how fast spools arrive |
| 2026-10-11 | Jakub's Weaver Matrix record (DESIGN_DECISIONS.md 9): the slots named Zenith, East Meridian, East Horizon, Nadir, West Horizon, West Meridian; the fixed slots take flat ATK, DEF and HP, the choice slots a base stat in % or their own (SPD; C.RATE or C.DMG; ACC or RES); his eight core Weave Patterns replace the draft ones, each 2-piece and adding one stat per weave. New stats: C.DMG (every champion 100%, so crits still deal double), ACC and RES (no rule uses them yet, T15) | AE1, AE3 | none in play: spools have no sources, so the curve and the impact measure are unchanged (`npm run balance` all ok) | crit x2 -> x (1 + C.DMG); draft patterns -> core patterns | set by Jakub; the spool values, strands and the reading of the pattern values are stand-ins |
| 2026-10-11 | Accuracy against Resistance (Jakub: "ACC and RES works for detrimental effects. If you want to place debuff on enemy, your acc is compared against enemy res."): a debuff on an enemy keeps its chance while ACC is at least RES, else x 100 / (100 + RES - ACC), a stand-in curve; Cold Rebuke's Freeze included. T15 resolved | AE1, AE4 | none in play: every champion has ACC 0 and RES 0 and spools have no sources (`npm run balance` unchanged, stage for stage) | debuffs on a flat chance -> the chance cut by RES over ACC | set by Jakub; the curve is a stand-in |
| 2026-10-11 | DESIGN_DECISIONS.md cleaned up into the living record: a change list, section 4 pointing to 8, answered questions closed, section 7 refreshed (with the defaults he never set: team size, acquisition, zone names), and the earlier approvals recorded there (gear, combat rules, name, direction, lexicon) | AE5 | none | - | Jakub: "cleanup docs" |
| 2026-10-11 | Zone 1 named the Fracture Reach and Zone 2 the Verdant Grove (not about an arena); the world map redrawn on Jakub's brief: the land fills the map with forest along both edges, the rift diagonal with dark cracks fanning out and land floating in it, the village reworked in its fields, the two nodes 400 px apart instead of 740, the map 960 px wide and growing east area by area | AE5, AE6 | none: the same stages | 1280 px with void north and south -> 960 px of land | set by Jakub; the map as built approved ("i love it") |
| 2026-10-11 | The Skirmisher (Jakub's brief, DESIGN_DECISIONS.md 12): Common, Damage, Bloom, Azure Crown, one A1 that always hits twice; joins on the first clear of 1-5 (a stand-in), so 1-6 to 1-10 are played by three and their powers rise (0.68 / 0.70 / 0.775 / 0.71 / 0.59 -> 0.90 / 0.82 / 0.80 / 0.87 / 0.86). Rules: a kit may have one skill | AE3, AE4 | auto win 1-6 to 1-10 81 / 73 / 72 / 65 / 55% (was 81 / 75 / 76 / 73 / 65%); flawless wins there fall to 3-18% of wins; the player opens 68-80% of battles | 6.0 re-measured | set by Jakub; the numbers, the skill's name and the recruiting stage are stand-ins |
| 2026-10-11 | Affinity is abstract (Jakub: "affinity should not dictate colors or elements or anything. these three affinity choices are very abstract"): no colour, element or effect follows from an affinity | AE5 | none in play | effects by affinity -> effects by what the skill does | set by Jakub; whether Gareth's ember cuts and the Skirmisher's leaf-green ones change waits for him |
| 2026-10-11 | The Lineholder (Jakub's brief, DESIGN_DECISIONS.md 13): Common, Tank, Tide, Azure Crown; Guard Cut, and Brace, DEF Up on himself for 2 turns; joins on the first clear of 1-7 (a stand-in), so from 1-8 the curve averages four teams, two of which pair the Commons and lose most battles; 1-8 to 1-10 powers fall (0.80 / 0.87 / 0.86 -> 0.71 / 0.74 / 0.76) | AE3, AE4 | auto win 1-8 to 1-10 72 / 65 / 55% -> 71 / 65 / 57% (all teams), the best teams 95-100%; flawless wins there 3 / 7 / 4% -> 42 / 28 / 10% of wins; T20 | 6.0 re-measured | set by Jakub; the numbers, the texts and the recruiting stage are stand-ins |
| 2026-10-12 | Jakub: the interface's affinity marks stay; Gareth's ember cuts and the Skirmisher's leaf-green ones made plain (effects renamed `sword_cut`, `heavy_blow`, `sword_sweep`, `blade_cut`, `blade_cut_rise`); balance, recruiting stages and stage enemies are his to dictate later | AE2, AE5 | none in play | ember and leaf-green -> white streaks, light, dust and chips | set by Jakub |
| 2026-10-12 | The Quartermaster (Jakub's brief, DESIGN_DECISIONS.md 14): Common, Support, Tide, Azure Crown; a plain A1 (0.9); Field Rations heals every ally by 15% of his max HP, then 15% Turn Meter to the ally lowest on HP. Rules: `healOf: 'caster'`, `tmLowestAlly`; demos wound the healer's team first. Joins on the first clear of 1-9 (a stand-in), so 1-10 averages ten teams | AE3, AE4 | auto win 1-10 57% -> 52% (all ten teams; the best 97%), still in the boss band; no power changed | 6.0 re-measured | set by Jakub; names, texts, numbers and the recruiting stage are stand-ins |
| 2026-10-12 | The Quartermaster's affinity set to Bloom (Jakub: "quartermaster affinity should be bloom. change it"; Tide before) | AE3 | auto win 1-10 52% -> 49% (all ten teams; the best 96%), still in the boss band; nothing in his art changes, as an affinity sets nothing there | 6.0 re-measured | set by Jakub |
| 2026-10-12 | The Enforcer (Jakub's brief, DESIGN_DECISIONS.md 15): Common, Damage, Ember, Sanguine Dominion; Heavy Cut (1.0) and Keen Edge, +10% C.RATE always on. Rules: a passive kind `stat`, extra to the stat budget and applied in battle only (Jakub: "this is just extra", "passive is applied during combat"); his helmet made lighter so he looks weaker. Joins on the first clear of 1-10 (a stand-in) | AE3 | the curve unchanged (he joins after the last stage); the roster reaches six, so impact runs for the first time: Gareth 83%, the Rime Scholar 71%, the Enforcer 44%, the Skirmisher 44%, the Quartermaster 37%, the Lineholder 23%, four outside 40-60% (the Elites against Commons; T20) | impact skipped -> measured | set by Jakub; names, texts, numbers and the recruiting stage are stand-ins; the four impact lines wait for his balance, no champion retuned |
| 2026-10-12 | The Bloodhound (Jakub's brief, DESIGN_DECISIONS.md 16): Common, Tank, Ember, Sanguine Dominion, the first champion on four legs; Bite (1.0) and Bay, Taunt on himself for 1 turn on a cooldown of 4. Rules: the A2 cooldown norm 3 -> 3-4; a champion's shadow length (`footprint`). Joins on the first clear of 1-8 (a stand-in), so 1-9 averages ten teams and 1-10 twenty, and their powers fall (0.74 / 0.76 -> 0.71 / 0.72) | AE3, AE4 | auto win 1-9 / 1-10 66% / 49% (unchanged; at the old powers they fell to 46% / 34%); impact with seven: Gareth 87%, the Rime Scholar 71%, the Skirmisher 46%, the Enforcer 46%, the Quartermaster 40%, the Bloodhound 35%, the Lineholder 25%, four outside 40-60% | 6.0 re-measured | set by Jakub; names, texts, numbers, the recruiting stage and the two powers are stand-ins; no champion retuned |
| 2026-10-12 | Zone 1's battle background changed on Jakub's brief (DESIGN_DECISIONS.md 5.3a): a broken windmill in the middle field; the haystack's fire calmer, each tongue at its own pace, its light and embers slower; the rift slower (veils about 3x, a 9 s pulse, fewer and slower sparks that linger); a rare flash of strange light across the sky; more details (crows wheeling and perched, stooks, fence posts, puddles). Engine: `ZoneDef.flash` and `birdsAt`, a pulse's own period, a spark's lifetime | AE5, AE6 | none in play | - | set by Jakub; the windmill's look, the details and the flash's colours and timing are a first take |
| 2026-10-12 | Zone 1 on Jakub's next message: the sky flash every 10-25 s (was 24-52); things round the mill; distant rocks in the left sky; tools in the fields and toward the centre; four more ravens over the burning field, one on the fallen standard, one pecking by the fence; the haystack's flames and the rift's veils loop without a jump (every phase a whole number of cycles per loop). Engine: `birdsAt` takes several spots | AE5, AE6 | none in play | - | set by Jakub; what the details are and where they stand is a first take |
| 2026-10-12 | The Dominion Medic (Jakub's brief, DESIGN_DECISIONS.md 17): Common, Support, Tide, Sanguine Dominion (read from his name); one skill, Tonic, an A1 healing every ally by 10% of his max HP, nothing else. Rules: an A1 that strikes no enemy never counterattacks. Joins on the first clear of 1-6 (a stand-in), so 1-7 averages four teams, 1-8 ten, 1-9 twenty, 1-10 thirty-five; powers 1-7 / 1-9 / 1-10 0.82 / 0.71 / 0.72 -> 0.73 / 0.68 / 0.70 | AE3, AE4 | auto win 1-7 to 1-10 71 / 65 / 60 / 46% (was 73 / 71 / 66 / 49%); battles up to 27.7 actions; impact with eight: Gareth 84%, the Rime Scholar 72%, the Skirmisher 52%, the Enforcer 49%, the Quartermaster 43%, the Bloodhound 42%, the Lineholder 30%, the Dominion Medic 28%, four outside 40-60% | 6.0 re-measured | set by Jakub; the name Tonic, the stats, the recruiting stage and the three powers are stand-ins; no champion retuned |
| 2026-10-13 | The Follower (Jakub's brief, DESIGN_DECISIONS.md 18): Common, Damage, Tide, Court of Root, the faction's first champion and the second on four legs, a grey wolf; Snap (1.0), and Rend (1.4) with a 50% chance of DEF Down for 2 turns on a cooldown of 4: the roster's first debuff left to a chance and its first DEF Down. Joins on the first clear of 1-4 (a stand-in), so 1-5 is played by three and its power rises (0.67 -> 0.92) | AE3, AE4 | auto win 1-5 to 1-10 79 / 78 / 78 / 76 / 65 / 50% (was 85 / 81 / 71 / 65 / 60 / 46%); the player opens 61-90% of battles; impact with nine: Gareth 80%, the Rime Scholar 72%, the Skirmisher 56%, the Follower 55%, the Enforcer 45%, the Quartermaster 45%, the Bloodhound 39%, the Lineholder 33%, the Dominion Medic 28%, five outside 40-60% (the Bloodhound new, a point under: the Follower's Tide hits him strong, and no number of the Follower's moved him) | 6.0 re-measured | set by Jakub; the names Snap and Rend, their numbers, the stats, the recruiting stage and 1-5's power are stand-ins; no champion retuned |
| 2026-10-13 | The Court of Root's standard: a brown paw in place of the claw (Jakub: "logo of court of root should be a pawn instead of root on background"; "pawn" read as a paw) | AE5 | none in play | the talon charge -> a paw print | set by Jakub |
| 2026-10-13 | Zone 2's ten placeholder stages (Jakub: "i want you to add 10 placeholder stages in area 2 like we have for area 1, so i can test it there ingame"): 2-1 to 2-10 on the Verdant Grove, texts quoting the arc of his notes, enemies copied from the roster (the Follower in eight), 2-10 a boss; no champion joins there | AE4, AE6 | the curve goes on past 1-10: auto win 89% at 2-1 down to 53% at 2-10 (84 teams each, every stage in band); battles up to 36.9 actions (2-4) | 6.0b measured | set by Jakub; the enemies, powers and texts are stand-ins |
| 2026-10-13 | The Walking Bush (Jakub's brief, DESIGN_DECISIONS.md 19): Common, Tank, Bloom, Court of Root, a small weak ent grown from a bush; Root Lash (1.0), and Thicket, DEF Up for 1 turn on himself and one chosen ally, cooldown 3. Rules: a skill aimed at one ally that also gives its user a status is aimed at another ally while one stands; a status reaches each unit once per skill. Joins on the first clear of 2-1 (a stand-in), so 2-2 to 2-10 average 120 teams, and 2-9's power falls 0.84 -> 0.83 | AE3, AE4 | auto win 2-2 to 2-10 88 / 77 / 72 / 72 / 72 / 57 / 58 / 56 / 47% (was 88 / 82 / 79 / 79 / 75 / 67 / 64 / 61 / 53%); impact with ten: Gareth 84%, the Rime Scholar 73%, the Follower 57%, the Skirmisher 56%, the Enforcer 51%, the Quartermaster 44%, the Bloodhound 40%, the Walking Bush 34%, the Lineholder 32%, the Dominion Medic 29%, five outside 40-60% (the Walking Bush new, beside the Lineholder: Tanks with no Taunt, T20; the Bloodhound back in band) | 6.0b re-measured | set by Jakub; the names Root Lash and Thicket, the numbers, the stats, the recruiting stage and 2-9's power are stand-ins; no champion retuned |
| 2026-10-13 | The Wild Speaker (Jakub's brief, DESIGN_DECISIONS.md 20): Common, Support, Ember, Court of Root, a tattooed man with a long stick and two green ribbons at its head; Staff Blow (1.0), and Quell (1.3), then a 50% chance of ATK Down for 2 turns, cooldown 4: the roster's first ATK Down. No new rule. Joins on the first clear of 2-2 (a stand-in), so 2-3 to 2-10 average 165 teams; no power changed | AE3, AE4 | auto win 2-3 to 2-10 78 / 74 / 76 / 69 / 62 / 59 / 56 / 45% (was 77 / 72 / 72 / 72 / 57 / 58 / 56 / 47%), each stage moved by its lean, all in band; impact with eleven: Gareth 81%, the Rime Scholar 74%, the Follower 57%, the Skirmisher 55%, the Wild Speaker 51%, the Enforcer 48%, the Bloodhound 41%, the Quartermaster 40%, the Walking Bush 34%, the Lineholder 33%, the Dominion Medic 30%, the same five outside 40-60% | 6.0b re-measured | set by Jakub; the names Staff Blow and Quell, the numbers, the stats and the recruiting stage are stand-ins; no champion retuned |
| 2026-10-17 | The four Elites of Jakub's proposals (DESIGN_DECISIONS.md 21-24, his answers verbatim there; he sets their affinities later, the game stands in Bloom, Tide, Bloom and Ember): the Jungle Herder, Court of Root, Tank (Crook Strike; Bellwether, Taunt 1 and Counterattack 2 on himself, cooldown 4; Herder's Ward); Emissary Handlings, Azure Crown, Tank (Banner Strike, 20% Stun; Rallying Standard, DEF Up on all allies for 2 turns, cooldown 5; Unbroken Flag); Red Cloak, Sanguine Dominion, Damage (Cleave; Crimson Blade, 50% Burn for 2 turns; Onrush, SPD Up on all allies for 2 turns, cooldown 5); Big Ears, Court of Root, Damage (Poison Dart, 35% Poison for 1 turn; Dart Volley, Heal Block on all enemies for 2 turns, cooldown 5; Hidden in the Undergrowth). Rules: three passive kinds, `tend` (at the end of its holder's turn, from the first, the ally with the lowest max HP, the holder included, gets a Shield, then a rest), `ward` (an ally an enemy skill struck may get a Shield after the hit, once per skill) and `fallen` (a stat per fallen ally, up to a cap, extra to the budget like a stat passive); the A2 cooldown norm 3-4 -> 3-5; `allyFx` for an attack's buff on allies. They join on the first clears of 2-3, 2-5, 2-7 and 2-9 (stand-ins), so 2-4 to 2-10 average 220 to 455 teams; no power changed | AE1, AE3, AE4 | auto win 2-4 to 2-10 79 / 81 / 81 / 68 / 78 / 75 / 71% (was 74 / 76 / 69 / 62 / 59 / 56 / 45%), all in band; flawless wins 32-58% of wins; skipped turns up to 0.23 a battle (the Emissary's Stun); impact with fifteen: Gareth 74%, Red Cloak 74%, the Jungle Herder 63%, Emissary Handlings 63%, Big Ears 62%, the Rime Scholar 62%, the Skirmisher 50%, the Wild Speaker 50%, the Follower 48%, the Enforcer 46%, the Bloodhound 38%, the Quartermaster 37%, the Lineholder 31%, the Dominion Medic 31%, the Walking Bush 29%: eleven outside 40-60% (the six Elites over it; the Bloodhound and the Quartermaster new under it, as Elites joined the random pool) | 6.0b re-measured; the Zone 2 curve flattened | set by Jakub; the affinities, the names Crook Strike, Bellwether, Herder's Ward, Cleave, Onrush and Poison Dart, all texts, multipliers and stats, the Stun's 1 turn and the recruiting stages are stand-ins; no champion retuned and no power changed |
| 2026-10-17 | The three Elites of Jakub's updated proposals (DESIGN_DECISIONS.md 25-27, verbatim there with his message; their affinities not set, the game stands in Ember, Bloom and Tide): the Associate, Azure Crown, Support (Mote Bolt, 50% ATK Down for 1 turn; Quickening, SPD Up 2 turns and ATK Up 1 on all allies, cooldown 5; Bitter Motes); the Black Rhino, Sanguine Dominion, Tank (Gore, 20% Stun; War Bellow, DEF Up on all allies for 2 turns and Counterattack 2 on himself, cooldown 5; Thick Hide); the Grove Keeper, Court of Root, Support (Thornburst, a 7% self-heal; Cleansing Rite, every debuff off one ally, cooldown 3; Keeper's Balm). And on his word, Big Ears' face made more animal (a snout, a slit-pupilled eye, fangs) and his ears smaller and curved. Rules: passive kinds `retaliate` (a hit on the holder may be answered on the attacker, after the hit, once per skill) and `remedy` (an enemy's debuff on an ally may be answered with a buff, once per debuff), a ward of its holder alone (`self`) with no chance; `healSelf`, `cleanseAll`, `ai.when: 'allyDebuffed'`; a passive's presentation in its data (`fx`, `holderFx`). They join on the first clears of 2-4, 2-6 and 2-8 (stand-ins); no power changed | AE1, AE3, AE4 | auto win 2-4 to 2-10 79 / 83 / 80 / 71 / 81 / 81 / 78%, all in band; impact with eighteen: Gareth 76%, Red Cloak 73%, Emissary Handlings 63%, Big Ears 61%, the Jungle Herder 59%, the Rime Scholar 58%, the Black Rhino 58%, the Associate 56%, the Grove Keeper 50%, the Wild Speaker 46%, the Follower 46%, the Skirmisher 44%, the Enforcer 41%, the Quartermaster 36%, the Bloodhound 33%, the Dominion Medic 31%, the Lineholder 27%, the Walking Bush 26%: nine outside 40-60% (the three new Elites in it; the Jungle Herder and the Rime Scholar back in it) | 6.0b re-measured | set by Jakub; the affinities, all names, texts, multipliers and stats, and the recruiting stages are stand-ins; no champion retuned and no power changed |
| 2026-10-17 | Zone 3, the Moonlit Basin (DESIGN_DECISIONS.md 5.4a, 5.6; Jakub named and described it: "extend world map to the east and create new dynamic zone, third area battle background"): its battle background (a night under the moon, alive throughout with calm motion; the ambience `spores` and rare `shootingStars`), the world map extended east to 1280 (everything west of x 832 unchanged, the overview fills the screen's width), and ten placeholder stages (my addition so the area can be seen in game): texts walking his description, enemies copied from the roster, 3-10 a boss Black Rhino, powers searched for a curve from 86% to 57% over all 816 teams; no champion joins there | AE4, AE6 | the curve goes on past 2-10: 86% at 3-1 down to 57% at 3-10, every stage in its band; Zones 1 and 2 unchanged |
| 2026-10-18 | The Skeleton (Jakub's brief, DESIGN_DECISIONS.md 28): Common, Damage, Tide, the Ashveil Reign's first champion; Rusty Hack (1.0) and Bare Bones, +20 RES always on, a stat passive (extra to the budget, in combat only). No new rule: the stat passive reaches RES. Joins on the first clear of 3-1 (a stand-in) | AE3 | the curve after 3-1 fell by up to three points, all stages in band, no power changed; impact: the Skeleton 41%, in band; the Jungle Herder, the Rime Scholar and the Black Rhino crossed 60% (62%), as a Common more among the opponents lifts the Elites (T20) | 9 lines out -> 12 | set by Jakub; names, texts, numbers and the recruiting stage are stand-ins; no champion retuned |
| 2026-10-18 | The Rot Hulk (Jakub's brief, DESIGN_DECISIONS.md 29): Common, Tank, Ember, the Ashveil Reign's second champion, a big, fat abomination in patches of many colours; Putrid Slam (1.0) with a 25% chance of Poison for 2 turns, no other skill and no passive. No new rule. Joins on the first clear of 3-2 (a stand-in), so 3-3 to 3-10 average 1140 teams | AE3 | auto win 3-3 to 3-10 78 / 72 / 71 / 71 / 66 / 63 / 59 / 53% (was 79 / 75 / 71 / 73 / 67 / 65 / 59 / 55%), all in band, no power changed; impact: the Rot Hulk 40%, a hair under the band and above every other Common Tank (27-34%); the Black Rhino and the Rime Scholar still over 60%, by a point or less | 12 lines out -> 13 | set by Jakub; the name Putrid Slam, its text, A1's 1.0, the stats and the recruiting stage are stand-ins; no champion retuned |
| 2026-10-18 | The Bellringer (Jakub's brief, DESIGN_DECISIONS.md 30): Common, Support, Bloom, the Ashveil Reign's third champion, a very tall skeleton with no jaw and a golden bell fixed to his arm, in boots; Warning Toll, a Shield of 10% of his max HP on one ally for 1 turn and a heal of 10% of his max HP for himself, no attack; Last Peal, DEF Up for 2 turns the first time he drops below 50% HP (the engine's Overdrive, any damage). Rules: a skill aimed at one ally that heals its user is aimed at another ally while one stands, like one that gives its user a status (the Walking Bush's Thicket); an Overdrive with its own `holderFx` shows it in place of the core-flare. Joins on the first clear of 3-3 (a stand-in), so 3-4 to 3-10 average 1330 teams | AE3, AE4 | auto win 3-4 to 3-10 66 / 65 / 64 / 61 / 57 / 56 / 50% (was 72 / 71 / 71 / 66 / 63 / 59 / 53%): 3-9 fell under its band (54%) and runs at 0.80 (was 0.81); impact: the Bellringer 21%, the roster's lowest (he never strikes), the Rot Hulk back in band (44%); 0.1-3.3% of the battles from 3-4 stall with only non-strikers left on the player's side (T21) | 13 lines out; 3-9 retuned | set by Jakub; the names Warning Toll and Last Peal, the texts, the stats, the recruiting stage and 3-9's power are stand-ins; no champion retuned |
| 2026-10-18 | Zone 4, Earth Scars (DESIGN_DECISIONS.md 5.4a, 5.7; Jakub named and described it: "create area 4. name of area = earth scars"): its battle background (the steppe by day; the ambience `seeds` and a prop that walks to and fro, `roam`, both new), the world map extended east to 1600 (everything west of x 1224 unchanged, the overview two and a half times smaller) and ten placeholder stages (his request): texts walking his description, enemies copied from the roster (the Skeleton and the Rot Hulk among them), 4-10 a boss Red Cloak, powers searched for a curve from 86% to 56% over all 1330 teams; no champion joins there | AE4, AE6 | the curve goes on past 3-10: 86% at 4-1 down to 56% at 4-10, every stage in its band; 0-0.9% of the battles stall (T21); Zones 1-3 unchanged | 6.0d measured | named and described by Jakub; the stages' enemies, powers and texts are stand-ins |
| 2026-10-18 | The Bellringer's affinity set to Ember (Jakub: "change bellring affinity to ember."; Bloom before) | AE3 | he never strikes, so his affinity only changes the blows he takes (the Tide enemies' strong on him now, the Bloom ones' weak): impact 20% (was 21%), every other line within a point; auto win 3-4 to 3-10 66 / 65 / 65 / 60 / 57 / 56 / 49%, each within a point of before and in band; nothing in his art changes, as an affinity sets nothing there | 6.0c re-measured | set by Jakub |
| 2026-10-18 | The Necromancer (Jakub's brief, DESIGN_DECISIONS.md 31): Elite, Support, Bloom, the Ashveil Reign's first Elite, a man in a black robe and hood with a book of the dead in one hand and black motes circling the other; Grave Chill (1.0) with a 35% chance of Slow for 1 turn; Plague Verse (1.2, cooldown 4), Poison for 2 turns on one enemy and SPD Up for 2 turns on all allies; Raise Dead (cooldown 6), one fallen ally, chosen at random, raised with 30% of its max HP. Rules: the target `fallen` and `revive` (ready only while an ally has fallen; the raised ally comes back with nothing on it and an empty turn meter and gets up through its own death played backwards, `RAISED!`); the A3 cooldown band widened from 4-5 to 4-6 for his kit. Joins on the first clear of 4-1 (a stand-in), so 4-2 to 4-10 average 1540 teams | AE1, AE3 | impact: the Necromancer 66%, over the band like the other Elites; Big Ears back in band (60%); auto win 4-2 to 4-10 85 / 83 / 79 / 75 / 75 / 72 / 67 / 63 / 61% (was 83 / 81 / 77 / 74 / 71 / 68 / 65 / 61 / 56%), all in band; 0-0.8% of Zone 4's battles stall (was 0-0.9%) | 13 lines out; A3 cooldown band 4-6; 6.0d re-measured | set by Jakub; the names Grave Chill, Plague Verse and Raise Dead, the texts, the multipliers, the 30%, the stats, the lore line and the recruiting stage are stand-ins; no power or champion retuned |
| 2026-10-18 | The Automated Soul (Jakub's brief, DESIGN_DECISIONS.md 32): Elite, Damage, Tide, the Ashveil Reign's second Elite, an archer skeleton with no head in shiny azure and gold plate, with a wooden longbow; Unerring Shot (1.0), one arrow; Sundering Volley (0.6 on each enemy, cooldown 4), a volley into the sky with DEF Down on every enemy for 2 turns; Pinning Shot (1.3, cooldown 4), ATK Up on himself for 2 turns before the shot, then Stun for 1 turn. Rules: a status can be placed before a skill's first hit (`before`, events at hit -1), so the hit carries it; a volley (`volley`) comes down on every target (the proof of concept's arrow rain, now data). Joins on the first clear of 4-2 (a stand-in), so 4-3 to 4-10 average 1771 teams | AE1, AE3 | impact: the Automated Soul 78%, the roster's highest (82% with his first stand-ins, so his multipliers were set near the floor of the norms), 13 lines out; auto win 4-3 to 4-10 85 / 81 / 78 / 78 / 75 / 71 / 68 / 65% (was 83 / 79 / 75 / 75 / 72 / 67 / 63 / 61%), all in band; 0-0.8% of Zone 4's battles stall | 13 lines out; 6.0d re-measured; T22 | set by Jakub; the names Unerring Shot, Sundering Volley and Pinning Shot, the texts, the multipliers, the stats, the lore line and the recruiting stage are stand-ins; no power or other champion retuned |
| 2026-10-19 | Irving Wellbington (Jakub's brief, DESIGN_DECISIONS.md 33): Elite, Tank, Bloom, the Ashveil Reign's third Elite, a dwarf skeleton with a big horned helmet and a robust round shield with ancient runes (much bigger on his word, mid-build); Shield Bash (1.0) with a 35% chance of Slow for 1 turn; Bulwark Slam (1.2, cooldown 4), then DEF Up for 2 turns and Counterattack for 1 on himself; Old Grudge, Taunt for 1 turn and a heal of 20% of his max HP when an enemy's critical hit leaves him standing. Rules: the passive `defy` (once per enemy skill, after its last hit; a crit that fells him never wakes it; Heal Block stops the heal). Joins on the first clear of 4-3 (a stand-in), so 4-4 to 4-10 average 2024 teams | AE1, AE3 | impact: Irving Wellbington 53%, the first Elite in the band; the Automated Soul 77%, 13 lines out; auto win 4-4 to 4-10 82 / 77 / 79 / 76 / 71 / 68 / 65%, each within a point of before, all in band; 0-0.7% of Zone 4's battles stall | 13 lines out; 6.0d re-measured | set by Jakub; the names Shield Bash, Bulwark Slam and Old Grudge, the texts, the multipliers, the stats, the lore line and the recruiting stage are stand-ins; no power or other champion retuned |
| 2026-10-19 | Zone 5, the Snowy Mesa (DESIGN_DECISIONS.md 5.4a, 5.8; Jakub named and described it: "i want you to create area 5"): its battle background (the top of a snowy tabletop mountain before sunset; the ambience `flurries`, new), the world map extended east to 1920 (everything west of x 1544 unchanged, the overview three times smaller) and ten placeholder stages (his request): texts walking his description, enemies copied from the roster (the Ashveil Reign's Elites among them, no Bellringer), 5-10 a boss Irving Wellbington, powers searched for a curve from 86% to 56% over all 2024 teams; no champion joins there | AE4, AE6 | the curve goes on past 4-10: 86% at 5-1 down to 56% at 5-10, every stage in its band; 0.1-0.9% of the battles stall (T21); Zones 1-4 unchanged, impact unchanged (13 lines out) | 6.0e measured | named and described by Jakub; the stages' enemies, powers and texts are stand-ins |
| 2026-10-24 | Weaving and spool drops (Jakub, DESIGN_DECISIONS.md 9.4): WEAVING on the main menu, a full inventory screen laid out like the Champions screen (cards in groups by Weave Pattern, one grade per row, filters by slot and state, a panel that weaves a spool into a champion with a preview, takes it out or unravels it); every campaign victory finds a spool of its area's two Weave Patterns and a flawless one a second, the grade by the stage (Ashen / Silver / Gilded 70 / 25 / 5% at an area's first stage to 30 / 45 / 25% at its last), the main stat by slot; new finds wear the NEW badge; `?spools=1` adds its sample once | AE1, AE3 | T11: gear reaches play. A full Gilded matrix takes Captain Gareth's ATK 122 -> 209 (two Sunder and a Needle; C.RATE 2.5% -> 39.5%) or his SPD 104 -> 149 (three Pulse); the stage powers were searched without spools, so a farming player finds the curve easier than its band | the stock empty in play -> 1-2 spools a victory | set by Jakub: the section and its button, drops from every stage, two patterns per area, no improving for now; stand-ins: which two patterns each area holds, every number, unravelling, the texts; no power retuned |
| 2026-10-24 | The main menu redesigned on Jakub's brief (DESIGN_DECISIONS.md 10): the Sanctum, a diorama of its own under the broken celestial Loom, its places clicked instead of buttons (the Starbridge Gate, the Reliquary, the Weaver's Spire, the Observatory, the astrolabe), hit on their own pixels, a few owned champions on the plaza changing each visit; calm motion throughout | AE5, AE6, AE3 | none on the rules; the menu no longer previews the frontier's enemies or the last team (the CAMPAIGN label still names the frontier stage) | the frontier zone with the last team and the next enemies, and a column of buttons -> the Sanctum | set by Jakub: the redesign and its rules; everything in it is a first take |

## 10. Keeping this document true

- **When a champion, stage, status, rule constant or AI behaviour changes:** update ME1-ME4 and re-measure section 6. Re-measure also when `npm run balance` moves any number by more than 3 points.
- **When a band is left on purpose:** add a decision log entry, then update the band.
- **When a tension is resolved:** move it to the decision log with what was decided.
- **Who:** the author of the change fills in the impact card; the reviewer checks it against sections 4 and 5.
