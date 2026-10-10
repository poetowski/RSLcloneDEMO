# Mechanics Guiderails

How a battle works, how a skill is defined, how difficulty is kept honest, and the contract between the rules (`src/game/battle`) and the presentation (`src/game/view`). The model is the turn-meter battler of RAID: Shadow Legends and Star Wars: Galaxy of Heroes. Every rule here is also taught in-game by the Academy (`src/game/data/codex.ts`); change both together.

Recipes: [new champion skill](../.claude/skills/new-champion/SKILL.md). Content model and screens: [GAME_STRUCTURE.md](GAME_STRUCTURE.md).

---

## 1. The battle

- **Up to 3 vs 3**. The player's team stands on the left, the enemy on the right.
- Formation slots: `0` front, `1` back-top, `2` back-bottom. Feet positions are the same in every zone (`SPAWNS` in `tools/art/zones/shared.ts`).
- The battle ends when one team has no living champion. Stars: 3 if nobody fell, 2 if one fell, 1 otherwise.

## 2. Turn meter

Every champion has a **turn meter (TM) from 0 to 100%** that fills in proportion to **Speed**; the first to reach 100% acts.

```
time to act  t_i = (100 - TM_i) / SPD_i
next actor   = the champion with the smallest t_i (ties: higher SPD)
then         TM_j += SPD_j * t_min  for every living champion
```

- Meters start at a random 0-12%.
- After acting, the actor's TM resets to **0**, or to `selfTm` if the skill grants it (Mirage Assault: 25%).
- Effective Speed = base x (1 + 0.25 with SPD Up) x (1 - 0.25 with SPD Down).
- `tmTargets` adds to or drains targets' meters (Arrow Rain: -15%).

## 3. Turn structure

```
advance()                  meters fill until someone reaches 100%
startTurn(actor)           Poison -5% max HP, Burn -6% max HP (both ignore shields), Regen +7.5%
  if Stun or Freeze        the turn is skipped (STUNNED / FROZEN), statuses still tick
choose                     player: skill (1/2/3 or click) and target;  enemy / auto: AI (section 11)
useSkill(actor, skill, t)  resolve -> SkillResult, including any counterattacks it provoked
perform(result)            the view plays it (section 12)
endTurn(actor)             TM = 0 (or selfTm); the actor's statuses tick down 1; its cooldowns tick down 1
```

Status durations count **the affected champion's own turns**: a 1-turn Stun means "skip your next turn".

## 4. Skills

| Slot | Role | Cooldown |
| --- | --- | --- |
| **A1** | basic, always available | 0 |
| **A2** | special | 3 |
| **A3** | signature | 4-5 |

A cooldown of N makes the skill unavailable for N of the champion's turns after use; it is ready again on the (N+1)th turn. The HUD shows the turns left on the icon.

### 4.1 Schema (`src/game/data/types.ts`)

```ts
interface SkillDef {
  id; name; tag; desc; slot: 1 | 2 | 3; cooldown;
  target: 'enemy' | 'enemies' | 'ally' | 'allies' | 'self';
  anim: string;                                  // champion animation
  approach: 'melee' | 'ranged' | 'center' | 'leap' | 'blink' | 'none';
  hits: { mult: number; fx?: string }[];         // one entry per hit frame of the animation
  statuses?: { status; turns; chance?; to: 'targets' | 'self' | 'allies'; value?; perHit? }[];
  healAllies?: number;      // fraction of each ally's max HP
  cleanse?: boolean;        // remove one debuff from each ally
  stripBuffs?: boolean;     // dispel: remove every buff from the targets before the first hit
  lifesteal?: number;       // fraction of damage dealt healed to the actor
  tmTargets?: number;       // turn meter change for targets, in %
  tmAllies?: number;        // turn meter change for every ally except the actor, in % (capped at 100)
  selfTm?: number;          // actor ends the turn with this TM instead of 0
  execute?: { below: number; mult: number };
  projectile?: string; castFx?: string; actorFx?: string; shake?: number;   // presentation
  ai?: { priority: number; when?: 'allyHurt' };
}
```

`ChampionDef` adds identity (`name, title, role, rarity, affinity, faction, color, lore`), `stats`, the three skills, an optional `passive` (`undying` or `overdrive`) and, for ranged champions, a `muzzle` point where projectiles leave the sprite.

### 4.2 Targeting

| `target` | Player clicks | Affects |
| --- | --- | --- |
| `enemy` | one enemy (Taunt restricts the choice) | that enemy |
| `enemies` | any enemy, or the skill again | all living enemies |
| `ally` | one ally | that ally |
| `allies` | any ally, or the skill again | all living allies |
| `self` | the skill again | the actor |

**Taunt**: while a champion with Taunt is alive, single-target enemy skills must target a taunting champion. AoE skills and counterattacks ignore it.

### 4.3 Movement (`approach`)

| Approach | Movement |
| --- | --- |
| `melee` | runs up to the target (stops 38px in front), attacks, runs home |
| `center` | runs to the middle of the enemy line (AoE melee), attacks, runs home |
| `ranged` | advances 72px toward the enemy, shoots or casts, walks home |
| `leap` | takes off on the `jump` event and arcs onto the target, landing exactly on the hit frame |
| `blink` | vanishes in a puff of sand and reappears **behind** the target facing it, strikes, blinks home |
| `none` | performs in place (buffs and heals) |

### 4.4 Hits

`hits` has one entry per hit frame in the animation (the content tests enforce it). Each entry is a damage instance against every target. Statuses, heals, cleanses and TM changes resolve **on the last hit**, except statuses marked `perHit`, which roll on every damaging hit (Twin Fangs). A dispel (`stripBuffs`) resolves **before** the first hit.

## 5. Damage

```
damage = ATK x mult x 4.8
       x 40 / DEF                        (twice the DEF, half the damage)
       x 1.2 strong hit / 0.8 weak hit   (affinity, section 6)
       x 1.25                            (target Weakened)
       x execute bonus                   (target HP below the threshold)
       x 2                               (critical hit, chance = CRIT, rolled per hit)
       x random 0.92-1.08
ATK x (1 +/- 0.25) with ATK Up / ATK Down;  DEF x 1.16 with DEF Up, x 0.88 with DEF Down
```

**Shields** absorb damage before HP (shown as `ABSORB n`); Poison and Burn ignore them. A shield's value is a fraction of the **caster's** max HP.

## 6. Affinities

Three affinities in a cycle (Jakub's, [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) 2.1): **Ember** beats **Bloom**, Bloom beats **Tide**, Tide beats Ember. There is no Void; it is reserved as a possible later neutral affinity. What beating does (damage, crit, landing chance, or all three) is not decided: until it is, the proof of concept's rule stands, a strong hit +20% (`STRONG HIT`) and a weak hit -20% (`WEAK HIT`). Team select counts each champion's strong (+) and weak (-) matchups against the stage.

## 7. Status effects (`src/game/data/statuses.ts`)

| Status | Type | Effect |
| --- | --- | --- |
| ATK Up | buff | +25% Attack |
| DEF Up | buff | +16% Defense |
| SPD Up | buff | +25% Speed |
| Shield | buff | absorbs damage up to its value |
| Taunt | buff | enemies' single-target skills must target this champion |
| Regen | buff | heals 7.5% max HP at turn start |
| Counterattack | buff | answers an enemy skill that damaged it with its A1, once per enemy action |
| Stun | debuff | skips the next turn |
| Freeze | debuff | skips the next turn (encased in ice) |
| Poison | debuff | -5% max HP at turn start, ignores shields |
| Burn | debuff | -6% max HP at turn start, ignores shields |
| DEF Down | debuff | -12% Defense |
| SPD Down | debuff | -25% Speed |
| ATK Down | debuff | -25% Attack |
| Weaken | debuff | +25% damage taken |
| Heal Block | debuff | cannot be healed: heals, Regen and lifesteal show `HEAL BLOCKED` |

- Reapplying a status refreshes it to the longer duration (and the larger shield); it never stacks.
- A status with a failed `chance` shows `RESIST` (debuffs only).
- Death removes all statuses and empties the turn meter.

## 8. Special mechanics

| Mechanic | Rule |
| --- | --- |
| Counterattack | resolved inside `useSkill`: each damaged defender with Counter (not stunned or frozen) answers once with its A1 at the attacker, ignoring Taunt; counters cannot be countered |
| Dispel | `stripBuffs` removes every buff from the targets before the hit |
| Cleanse | removes one debuff from each ally |
| Lifesteal | heals the actor for a fraction of damage dealt (blocked by Heal Block) |
| Execute | `mult` bonus against targets below `below` x max HP |
| Turn Meter boost | `tmAllies` adds to every other ally's turn meter on the last hit; `tmTargets` drains enemies |
| Undying (passive) | the first lethal hit leaves the champion at `value` x max HP with every debuff removed |
| Overdrive (passive) | the first time a hit leaves the champion alive below `value` x max HP, it gains the passive's `statuses`; a lethal hit never triggers it. Shows as a `passive` event: banner, core-flare, `OVERDRIVE!` |

No champion of today's roster uses turn meter boosts, Counterattack, control, Undying or Overdrive; the rules stay in the engine and are proven by the rule tests on synthetic champions (`tests/fixtures.ts`).

## 9. Champion kits

The two champions' kits are not designed yet ([DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) 7). The proof of concept's berserker and sun priestess stand in, with their mechanics unchanged and their skills renamed plainly:

| Champion | A1 | A2 (CD 3) | A3 (CD 4) |
| --- | --- | --- | --- |
| **Azure Warrior**, Damage, Ember | Strike 2 x 0.6 | Whirlwind: all, 2 x 0.5 | Leaping Blow (leap) 2.2, x1.5 below 50%, DEF Down 2t |
| **Sanguine Support**, Support, Tide | Bolt (ranged) 1.0, 35% Burn 2t | Mending: heal 15%, ATK Up 2t | Smite: all 0.85, Heal Block 2t, 60% Burn 2t |

## 10. Difficulty guardrails

Numbers are tuned against explicit norms, not by feel. `src/game/data/norms.ts` holds them; `tests/content.test.ts` enforces the static ones and `npm run balance` measures the rest.

| Guardrail | Rule |
| --- | --- |
| Stat budget | `statScore = HP/12 + ATK x 1.1 + (DEF - 40) x 2.25 + SPD x 1.3 + CRIT x 300` within **5%** of the rarity budget: Common 390, Elite 425, Heroic 440, Mythic 455 (the proof of concept's Common, Rare, Epic and Legendary budgets carried over: what rarity gates is not decided). A passive is paid for from the budget. |
| Stat limits | HP 900-1700, ATK 70-130, DEF 56-80, SPD 90-125, CRIT 2.5-15% |
| Skill multipliers (sum of hits) | A1 single 0.9-1.25 / AoE 0.5-0.8; A2 1.1-1.6 / 0.5-1.1; A3 1.3-2.6 / 0.7-1.2 |
| Cooldowns | A1 0, A2 3, A3 4-5 |
| Statuses | hard control lasts 1 turn and is guaranteed only on an A3; anything else at most 3 turns |
| Impact | `npm run balance` section 3: random 3v3 teams that include the champion win **40-60%** against random teams (960 battles per champion). It needs six champions for two teams of three and is skipped below that (today's roster has two) |
| Campaign curve | section 4: every team the player can own at that point (three champions, or all of them while they own fewer), auto-battled 20 times: first stage 85-100%, normal 55-92%, boss 40-80% (humans win more than the AI) |

Stage difficulty is set by `power` (enemy HP and ATK multiplier) and bosses take `BOSS_HP = 1.6` x HP. In Zone 1 the player owns at most the two champions, so every stage has one team; its powers were chosen against 300 battles each for a smooth decline, and the report's 20-battle sample checks them:

| Stage | Enemies | Power | Win (300) | Win (report) | Band |
| --- | --- | --- | --- | --- | --- |
| 1-1 Contact | 2 warriors | 0.35 | 95% | 90% | first |
| 1-2 Contact | warrior, support | 0.84 | 89% | 85% | normal |
| 1-3 The Settlement | 2 warriors | 0.78 | 85% | 60% | normal |
| 1-4 The Settlement | warrior, support | 0.89 | 82% | 85% | normal |
| 1-5 The Settlement | 2 warriors, support | 0.54 | 79% | 80% | normal |
| 1-6 Escalation | warrior, 2 supports | 0.66 | 76% | 75% | normal |
| 1-7 Escalation | 2 warriors, support | 0.59 | 71% | 70% | normal |
| 1-8 Escalation | 3 warriors | 0.66 | 69% | 65% | normal |
| 1-9 The Turning Point | 2 warriors, support | 0.59 | 67% | 75% | normal |
| 1-10 Leaving | warrior (boss), 2 supports | 0.59 | 61% | 60% | boss |

## 11. AI (`src/game/battle/ai.ts`)

Used for enemies and for the player's team in Auto mode.

1. Take the ready skills, highest `ai.priority` first (A3, then A2, then A1).
2. Skip support skills marked `when: 'allyHurt'` unless an ally is below 70% HP or carries a debuff.
3. Targets: Taunt is respected; control skills avoid already-disabled champions and pick the highest Attack; dispels pick the most-buffed enemy; otherwise 70% of the time focus the lowest HP%, 30% a random valid target.

## 12. Presentation contract

`Battle.useSkill` returns a `SkillResult`: an ordered list of events, each tagged with the `hit` index it belongs to, plus the counterattacks it provoked (already resolved).

```
damage  { target, amount, crit, absorbed, edge, hit, dot? }   edge: +1 strong, -1 weak; dot: 'poison' | 'burn' ticks
heal    { target, amount, hit }            blocked { target, hit }      (Heal Block)
status  { target, status, turns, hit }     resist  { target, status, hit }
cleanse { target, status, hit }            dispel  { target, status, hit }
expire  { target, status }                 tm      { target, delta, hit }
revive  { target, hp, hit }                death   { target, hit }
passive { target, name, hit }              (a passive wakes mid-fight: Overdrive)
```

The view (`BattleScene.perform`) turns that into choreography:

1. **Banner** with the skill name for A2/A3 (`COUNTERATTACK` for counters, with the crossed-blades cue).
2. **Approach** according to `approach`; dispel events land before the first hit.
3. **Cast circle** under the actor if `castFx` is set; `actorFx` at the head on the `cast` event.
4. **Animation**: every time the animation enters hit frame `k`, effects play and the events with `hit === k` are presented. Projectiles leave the champion's `muzzle` and present their events when they land; AoE effects are staggered across the line; ground-anchored effects stand on the target's feet.
5. **Impact feel**: hit-stop (55 ms, 90 ms on crits), white flash, sprite shake, sparks, screen shake for heavy skills, floating numbers (crits in the larger title face with `CRITICAL`, `STRONG HIT` / `WEAK HIT` tags).
6. **Lifesteal** sends soul wisps back to the actor before the heal number.
7. The actor returns home; death and revive animations finish (Undying: fall, tomb-light helix, `UNDYING!`, `rise`). An Overdrive shows the passive's name as a banner, the core-flare on the champion and `OVERDRIVE!` the moment the hit lands.
8. **Counterattacks** then play in order, each with its own approach.
9. Displayed HP snaps to the rules' state at the end of the whole action, so the view can never drift from the truth.

This split keeps the rules testable without a browser (`npm test`) and lets the presentation change freely.

## 13. Controls

| Input | Action |
| --- | --- |
| Click a skill / `1` `2` `3` | select A1 / A2 / A3 |
| Click a highlighted unit / arrows + `Enter` | use the selected skill on it |
| Click an AoE / ally skill again, `Enter` / `Space` | confirm |
| `A` or AUTO | auto battle (saved as the default) |
| `S` or the speed button | x1 / x2 / x3 (saved as the default) |
| `Esc` / `P` or MENU | pause menu: resume, auto, speed, retreat |
| Campaign map | drag to move; arrows jump between stages; `W` `A` `S` `D` or `Shift` + arrows slide; `M` whole map; `Enter` opens a stage, then PREPARE |
| MATRIX tab (champion page) | click a slot, then a lit spool in the stock to weave it; TAKE OUT returns the slot's spool to the stock |

URL parameters: `?screen=menu|campaign|team|battle|collection|champion|academy|options|recruit`, `&stage=1-5`, `&team=azure_warrior,sanguine_support`, `&champion=sanguine_support`, `&chapter=buffs`, `?demo=<skill_id>` (loops one skill), `?unlockall=1`, `?reset=1`, `?spools=1` (adds 24 sample spools to the stock), and for screenshots `&hp=0.1` (scales enemy HP).

## 14. The Weaver Matrix (`src/game/reliquary/`, `src/game/data/matrix.ts`)

Every owned champion has a Weaver Matrix: six slots in two triangles that hold Thread Spools. What the matrix adds reaches battle as the champion's stats (`Combatant.stats`, built by `battleStats`); enemies wear no spools. Weave Patterns and the sources of spools are not defined yet: spools carry a draft pattern id that only colours them, and the stock stays empty in play (`?spools=1` adds a sample for development).

| Slot | Kind | Takes a spool whose main stat is |
| --- | --- | --- |
| 1 (top) | fixed | ATK |
| 2 | choice | SPD, or ATK, HP or DEF % |
| 3 | fixed | DEF |
| 4 (bottom) | choice | CRIT, or ATK, HP or DEF % |
| 5 | fixed | HP |
| 6 | choice | ATK, HP or DEF % |

**Spools.** A spool has a grade (Ashen, Silver, Gilded), one main stat whose value the grade sets, and strands: additional stats, one per grade step.

| | Ashen | Silver | Gilded |
| --- | --- | --- | --- |
| Main ATK, HP, DEF | +4% | +7% | +10% |
| Main CRIT (chance) | +4% | +7% | +10% |
| Main SPD | +2 | +3 | +4 |
| Strands | 1 | 2 | 3 |
| Each ATK, HP, DEF or CRIT strand | +1 | +1 to 2 | +1 to 3 |
| Each SPD strand | +1 | +1 | +1 |

**Rules.**
1. A strand never repeats the spool's main stat, and a spool never carries the same strand twice.
2. Strand values are rolled once, when the spool is found, and never change.
3. A matrix's strands add at most +4 SPD together.
4. **Attunement:** each fixed slot attunes the two choice slots beside it. A strand on a choice slot gains +1 when its stat matches a neighbouring fixed slot: slot 2 is attuned to ATK and DEF, slot 4 to DEF and HP, slot 6 to HP and ATK.
5. Weaving a spool into a slot and taking it out are free; a spool you take out returns to the stock.

**Stats with the matrix:** ATK, HP and DEF rise by the summed percent of the champion's base stat (rounded), CRIT by the summed points of chance, SPD by the flat sum. The MATRIX tab on the champion page shows the result.
