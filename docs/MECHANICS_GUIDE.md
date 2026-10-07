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
       x 100 / (100 + DEF)
       x 1.2 strong hit / 0.8 weak hit   (affinity, section 6)
       x 1.25                            (target Weakened)
       x execute bonus                   (target HP below the threshold)
       x 1.5                             (critical hit, chance = CRIT, rolled per hit)
       x random 0.92-1.08
ATK x (1 +/- 0.25) with ATK Up / ATK Down;  DEF x 1.4 with DEF Up, x 0.7 with DEF Down
```

**Shields** absorb damage before HP (shown as `ABSORB n`); Poison and Burn ignore them. A shield's value is a fraction of the **caster's** max HP.

## 6. Affinities

Force beats Wild, Wild beats Arcane, Arcane beats Force; **Void** stands outside the cycle and never deals or takes strong or weak hits. Strong hit +20% (`STRONG HIT`), weak hit -20% (`WEAK HIT`). Team select counts each champion's strong (+) and weak (-) matchups against the stage.

## 7. Status effects (`src/game/data/statuses.ts`)

| Status | Type | Effect |
| --- | --- | --- |
| ATK Up | buff | +25% Attack |
| DEF Up | buff | +40% Defense |
| SPD Up | buff | +25% Speed |
| Shield | buff | absorbs damage up to its value |
| Taunt | buff | enemies' single-target skills must target this champion |
| Regen | buff | heals 7.5% max HP at turn start |
| Counterattack | buff | answers an enemy skill that damaged it with its A1, once per enemy action |
| Stun | debuff | skips the next turn |
| Freeze | debuff | skips the next turn (encased in ice) |
| Poison | debuff | -5% max HP at turn start, ignores shields |
| Burn | debuff | -6% max HP at turn start, ignores shields |
| DEF Down | debuff | -30% Defense |
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
| Turn Meter boost | `tmAllies` adds to every other ally's turn meter on the last hit (Rhythm of the March: +20%); `tmTargets` drains enemies (Arrow Rain -15%, Resonance -15%) |
| Undying (passive) | the first lethal hit leaves the champion at `value` x max HP with every debuff removed (Anhotep: 25%) |
| Overdrive (passive) | the first time a hit leaves the champion alive below `value` x max HP, it gains the passive's `statuses` (Mwamba: below 50%, ATK Up + DEF Up 2t); a lethal hit never triggers it. Shows as a `passive` event: banner, core-flare, `OVERDRIVE!` |

## 9. Champion kits

| Champion | A1 | A2 (CD 3) | A3 (CD 4) |
| --- | --- | --- | --- |
| **Sir Aldric**, Tank, Arcane | Valiant Strike 1.0, 35% DEF Down 2t | Shield Bash 1.3, 75% Stun 1t | Aegis Oath: allies Shield 20% + DEF Up 2t, self Taunt 2t |
| **Brakka**, Damage, Force | Rending Chop 2 x 0.6 | Whirlwind: all, 2 x 0.5 | Skullsplitter (leap) 2.2, x1.5 below 50%, DEF Down 2t |
| **Sylwen**, Damage, Wild | Swift Shot 1.05 | Venom Arrow 1.1, Poison 3t, 50% SPD Down 2t | Arrow Rain: all 0.8, TM -15% |
| **Master Tenzo**, Support, Wild | Flurry 0.38 + 0.38 + 0.46 | Serenity: heal 18%, cleanse, Regen 2t | Dragon Kick (leap) 1.9, 60% Stun 1t |
| **Ysolde**, Control, Arcane | Ice Shard 1.0, 30% SPD Down 2t | Blizzard: all 0.75, 50% SPD Down 2t | Glacial Prison 1.5, Freeze 1t |
| **Vorhaal**, Bruiser, Void | Cursed Cleave 1.0, 30% ATK Down 2t | Soul Rend 1.45, lifesteal 60% | Dread Sweep: all 1.05, 60% DEF Down 2t |
| **Akhet**, Damage, Force | Twin Fangs 2 x 0.55, 25% Poison per hit | Scorpion Sting (blink) 1.45, Heal Block + Weaken 2t | Mirage Assault (blink) 4 x 0.5, x1.5 below 40%, ends at 25% TM |
| **Kha'zir**, Tank, Force | Jackal's Bite 1.0, 30% Weaken 2t | Warden's Vigil: allies Counter 2t, self Taunt 2t | Weighing of Hearts: dispel, 1.8, Weaken 2t |
| **Nefret**, Support, Arcane | Solar Lance 1.0, 35% Burn 2t | Blessing of Dawn: heal 15%, ATK Up 2t | Wrath of the Sun: all 0.85, Heal Block 2t, 60% Burn 2t |
| **Anhotep**, Control, Void | Grave Touch 1.0, 40% Poison 2t | Curse of Ages: all 0.6, 40% Weaken + 40% SPD Down 2t | Eternal Tomb 1.3, Stun 1t, Heal Block 2t |
| **Imara**, Bruiser, Force | Sunspear Flurry 2 x 0.55, 50% self Shield 10% 2t | Spiral of Spears (center): all 2 x 0.45, 40% DEF Down 2t | Sunfall Javelin (ranged) 2.0, Weaken 2t |
| **Kwesi**, Support, Wild | Resonance (ranged) 1.1, TM -15% | Rhythm of the March: other allies TM +20%, SPD Up 2t, cleanse | Starsong Crescendo: all 1.0, heal allies 15% |
| **Mwamba**, Tank, Arcane | Gravity Fist 1.05, 30% SPD Down 2t | Magnetic Pull: all 0.6, 50% ATK Down 2t, self Taunt 2t | Starfall Protocol (CD 5): all 1.0, 35% Stun 1t |

Anhotep also has **Undying** (25%); Mwamba has **Overdrive** (below 50%: ATK Up + DEF Up 2t).

## 10. Difficulty guardrails

Numbers are tuned against explicit norms, not by feel. `src/game/data/norms.ts` holds them; `tests/content.test.ts` enforces the static ones and `npm run balance` measures the rest.

| Guardrail | Rule |
| --- | --- |
| Stat budget | `statScore = HP/12 + ATK x 1.1 + DEF x 0.9 + SPD x 1.3 + CRIT x 150` within **5%** of the rarity budget: common 390, uncommon 410, rare 425, epic 440, legendary 455. A passive is paid for from the budget (Anhotep sits at -5%). |
| Stat limits | HP 900-1700, ATK 70-130, DEF 40-100, SPD 90-125, CRIT 5-30% |
| Skill multipliers (sum of hits) | A1 single 0.9-1.25 / AoE 0.5-0.8; A2 1.1-1.6 / 0.5-1.1; A3 1.3-2.6 / 0.7-1.2 |
| Cooldowns | A1 0, A2 3, A3 4-5 |
| Statuses | hard control lasts 1 turn and is guaranteed only on an A3; anything else at most 3 turns |
| Impact | `npm run balance` section 3: random 3v3 teams that include the champion win **40-60%** against random teams |
| Campaign curve | section 4: every team the player can own at that point, auto-battled 20 times: first stage 85-100%, normal 55-92%, boss 40-80% (humans win more than the AI) |

Stage difficulty is set by `power` (enemy HP and ATK multiplier) and bosses take `BOSS_HP = 1.6` x HP. The current report:

| Stage | Power | Avg win | Band |
| --- | --- | --- | --- |
| 1-1 The Frozen Gate | 0.85 | 100% | first |
| 1-2 Hall of Icicles | 0.92 | 79% | normal |
| 1-3 Throne of the Dread Knight | 0.95 | 60% | boss |
| 2-1 Dunes of Ash | 1.35 | 84% | normal |
| 2-2 The Sunken Colonnade | 0.88 | 72% | normal |
| 2-3 Temple of the Burning Sun | 0.90 | 71% | normal |
| 2-4 Tomb of Anhotep | 0.80 | 69% | boss |
| 3-1 The Baobab Steps | 1.35 | 82% | normal |
| 3-2 The Hall of Echoes | 0.98 | 80% | normal |
| 3-3 Heart of the Skyforge | 0.85 | 63% | boss |

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

URL parameters: `?screen=menu|campaign|team|battle|collection|champion|academy|options|recruit`, `&stage=3-3`, `&team=knight,monk,frostmage`, `&champion=colossus`, `&chapter=buffs`, `?demo=<skill_id>` (loops one skill), `?unlockall=1`, `?reset=1`, and for screenshots `&hp=0.1` (scales enemy HP).
