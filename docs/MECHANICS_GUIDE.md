# Mechanics Guiderails

How a battle works, how a skill is defined, and the contract between the rules (`src/game/battle`) and the presentation (`src/game/view`). The model is the turn-meter battler of RAID: Shadow Legends and Star Wars: Galaxy of Heroes. Stats are placeholders: the point of this proof of concept is the loop and the feel.

---

## 1. The battle

- **3 vs 3**. The player's team stands on the left, the enemy on the right.
- Formation slots: `0` front (closest to the enemy), `1` back-top, `2` back-bottom. Feet positions are in `public/assets/zone/zone.json` (`spawns`).
- The battle ends when one team has no living heroes.

## 2. Turn meter

Every hero has a **turn meter (TM) from 0 to 100%**. Meters fill continuously in proportion to **Speed**; the first to reach 100% acts.

```
time to act  t_i = (100 - TM_i) / SPD_i
next actor   = the hero with the smallest t_i (ties: higher SPD)
then         TM_j += SPD_j * t_min  for every living hero
```

- Meters start at a random 0-12% so the opening order is not fixed.
- After acting, the actor's TM resets to **0**.
- Effective Speed = base x (1 + 0.25 with SPD Up) x (1 - 0.25 with SPD Down).
- Skills can add to or remove from a meter directly (`tmTargets`, e.g. Arrow Rain: -15%).
- The HUD track at the top shows every hero's meter live: allies above the track, enemies below.

## 3. Turn structure

```
advance()                  meters fill until someone reaches 100%
startTurn(actor)           Poison: lose 5% max HP.  Regen: heal 7.5% max HP.
  if Stun or Freeze        the turn is skipped (shown as STUNNED / FROZEN)
choose                     player: pick a skill (1/2/3 or click), pick a target
                           enemy / auto: AI decision (section 8)
useSkill(actor, skill, t)  resolve damage, heals and statuses -> SkillResult
perform(result)            the view plays it (section 9)
endTurn(actor)             TM = 0, every status on the actor ticks down 1 turn,
                           every cooldown ticks down 1
```

Status durations count **the affected hero's own turns**, as in RAID: a 1-turn Stun means "skip your next turn".

## 4. Skills

Every hero has exactly three skills:

| Slot | Role | Cooldown |
| --- | --- | --- |
| **A1** | basic attack, always available | 0 |
| **A2** | special | 3 turns |
| **A3** | signature / ultimate | 4 turns |

A cooldown of N means the skill is unavailable for N of the hero's turns after use (the HUD shows the remaining number on the icon).

### 4.1 Schema (`src/game/data/types.ts`)

```ts
interface SkillDef {
  id: string; name: string; tag: string; desc: string;
  slot: 1 | 2 | 3;
  cooldown: number;
  target: 'enemy' | 'enemies' | 'ally' | 'allies' | 'self';
  anim: string;                 // hero animation to play
  approach: 'melee' | 'ranged' | 'center' | 'leap' | 'none';
  hits: { mult: number; fx?: string }[];   // one entry per hit frame of the animation
  statuses?: { status; turns; chance?; to: 'targets' | 'self' | 'allies'; value? }[];
  healAllies?: number;          // fraction of each ally's max HP
  cleanse?: boolean;            // remove one debuff from each ally
  lifesteal?: number;           // fraction of damage dealt healed to the actor
  tmTargets?: number;           // turn meter change for targets, in %
  execute?: { below: number; mult: number };
  projectile?: string; castFx?: string; shake?: number;   // presentation
  ai?: { priority: number; when?: 'allyHurt' };
}
```

### 4.2 Targeting

| `target` | Player clicks | Affects |
| --- | --- | --- |
| `enemy` | one enemy (Taunt restricts the choice) | that enemy |
| `enemies` | any enemy, or the skill again | all living enemies |
| `ally` | one ally | that ally |
| `allies` | any ally, or the skill again | all living allies |
| `self` | the skill again | the actor |

**Taunt**: while any hero with Taunt is alive, single-target enemy skills must target a taunting hero. AoE skills are unaffected.

### 4.3 Movement (`approach`)

Every attack moves the hero toward the target and back. This is the RAID/SWGOH rhythm:

| Approach | Movement |
| --- | --- |
| `melee` | runs up to the target (stops 38px in front), attacks, runs home |
| `center` | runs to the middle of the enemy line (AoE melee), attacks, runs home |
| `ranged` | advances 72px toward the enemy, shoots or casts, walks home |
| `leap` | crouches in place, takes off on the `jump` event and arcs onto the target, landing exactly on the hit frame |
| `none` | performs in place (buffs and heals that target allies) |

### 4.4 Hits

`hits` has one entry per hit frame in the animation. Each entry is a damage instance against every target (`mult` x ATK). Multi-hit skills (Rending Chop 2, Whirlwind 2, Flurry of Fists 3) therefore show several numbers. Status effects, heals, cleanses and TM changes resolve **on the last hit**.

## 5. Damage

```
damage = ATK x 4.8 x mult
       x 100 / (100 + DEF)
       x execute bonus      (if target HP < threshold)
       x 1.5                (critical hit, chance = hero crit rate)
       x random 0.92-1.08
ATK x (1 +/- 0.25) with ATK Up / ATK Down
DEF x (1 + 0.40) with DEF Up, x (1 - 0.30) with DEF Down
```

**Shields** absorb damage before HP (shown as `ABSORB n`). Poison ignores shields.

Balance target (`npx tsx tests/balance.sim.ts`, AI vs AI over 500 seeds): about 22 actions per battle, player team wins about 60%. A human playing well wins more.

## 6. Status effects

| Status | Type | Effect |
| --- | --- | --- |
| ATK Up | buff | +25% Attack |
| DEF Up | buff | +40% Defense |
| SPD Up | buff | +25% Speed |
| Shield | buff | absorbs damage up to its value |
| Taunt | buff | enemies' single-target skills must target this hero |
| Regen | buff | heals 7.5% max HP at turn start |
| Stun | debuff | skips the next turn (stars circle the head) |
| Freeze | debuff | skips the next turn (encased in ice) |
| Poison | debuff | loses 5% max HP at turn start |
| DEF Down | debuff | -30% Defense |
| SPD Down | debuff | -25% Speed |
| ATK Down | debuff | -25% Attack |

- Reapplying a status refreshes it to the longer duration; it never stacks.
- A status with a `chance` that fails shows `RESIST` (debuffs only).
- Death removes all statuses and empties the turn meter.

## 7. Hero kits

| Hero | A1 | A2 (CD 3) | A3 (CD 4) |
| --- | --- | --- | --- |
| **Sir Aldric**, Tank | **Valiant Strike**: 1.0x, 35% DEF Down 2t | **Shield Bash**: 1.3x, 75% Stun 1t | **Aegis Oath**: all allies Shield (15% of Aldric's HP) + DEF Up 2t, Aldric Taunts 2t |
| **Brakka**, Damage | **Rending Chop**: 2 x 0.6x | **Whirlwind**: all enemies, 2 x 0.5x | **Skullsplitter** (leap): 2.2x, +50% below 50% HP, DEF Down 2t |
| **Sylwen**, Damage | **Swift Shot**: 1.05x | **Venom Arrow**: 1.1x, Poison 3t, 50% SPD Down 2t | **Arrow Rain**: all enemies 0.8x, -15% turn meter |
| **Ysolde**, Control | **Ice Shard**: 1.0x, 30% SPD Down 2t | **Blizzard**: all enemies 0.75x, 50% SPD Down 2t | **Glacial Prison**: 1.5x, Freeze 1t |
| **Vorhaal**, Bruiser | **Cursed Cleave**: 1.0x, 30% ATK Down 2t | **Soul Rend**: 1.45x, heals 50% of damage dealt | **Dread Sweep**: all enemies 0.95x, 60% DEF Down 2t |
| **Master Tenzo**, Support | **Flurry of Fists**: 0.38x + 0.38x + 0.46x | **Serenity**: heal all allies 18%, cleanse 1 debuff each, Regen 2t | **Dragon Kick** (leap): 1.9x, 60% Stun 1t |

Base stats (HP / ATK / DEF / SPD / crit): Aldric 1500/78/95/98/10%, Brakka 1200/120/55/104/20%, Sylwen 1020/112/48/112/22%, Ysolde 1080/104/50/108/15%, Vorhaal 1550/98/82/96/12%, Tenzo 1150/94/60/116/15%.

## 8. AI (`src/game/battle/ai.ts`)

Used for enemies and for the player's team in Auto mode.

1. Take the ready skills, highest `ai.priority` first (A3, then A2, then A1).
2. Skip support skills marked `when: 'allyHurt'` unless an ally is below 70% HP or carries a debuff.
3. Target selection:
   - Taunt is respected automatically (`validTargets`).
   - Control skills (Stun, Freeze) avoid already-disabled heroes and pick the highest Attack.
   - Otherwise 70% of the time focus the lowest HP%, 30% a random valid target.

## 9. Presentation contract

`Battle.useSkill` returns a `SkillResult` with an ordered list of events, each tagged with the `hit` index it belongs to:

```
damage  { target, amount, crit, absorbed, hit }
heal    { target, amount, hit }
status  { target, status, turns, hit }     resist { target, status, hit }
cleanse { target, status, hit }            expire { target, status }
tm      { target, delta, hit }             death  { target, hit }
```

The view (`BattleScene.perform`) turns that into choreography:

1. **Banner** with the skill name for A2/A3.
2. **Approach** according to `approach`.
3. **Cast circle** under the actor if `castFx` is set.
4. **Animation**: every time the animation enters a hit frame `k`:
   - melee: play `hits[k].fx` on each target and present the events with `hit === k`;
   - `projectile`: launch the projectile from the hero's muzzle point and present the events when it lands;
   - Arrow Rain: arrows fly up on `shoot` events and rain on each enemy after the hit frame;
   - ground effects (`ice_spikes`, `shockwave`) erupt under each target, staggered by distance;
   - ally skills: a holy beam or heal burst on each ally in turn.
5. **Impact feel**: hit-stop (55 ms, 90 ms on crits), white flash, sprite shake, sparks, screen shake for heavy skills, floating numbers (crits larger and orange with a CRITICAL tag).
6. **Lifesteal** plays soul wisps flying from the target back to the actor before the heal number.
7. Any remaining events (self buffs, heals) are presented, the hero returns home and plays `idle`.
8. Death animations finish before the next turn starts. Displayed HP snaps to the rules' state at the end of every action, so the view can never drift from the truth.

This split keeps the rules testable without a browser (`npm test`) and lets the presentation be changed freely.

## 10. Controls

| Input | Action |
| --- | --- |
| Click a skill / `1` `2` `3` | select A1 / A2 / A3 |
| Click a highlighted unit | use the selected skill on it |
| Click an AoE / ally skill again, `Enter` / `Space` | confirm (single target: the hovered or first valid target) |
| `A` or the AUTO button | auto battle |
| `S` or the speed button | x1 / x2 / x3 |
| `P` / `Esc` or the STOP button | pause |

URL parameters: `?seed=N` replays a battle, `?auto=1` starts in auto mode, `?speed=2` starts fast, `?demo=<skill_id>` loops one skill as a showcase (e.g. `?demo=whirlwind`, `&target=1` picks the second target).

## 11. Adding a skill or a hero

1. Add or edit the `SkillDef` in `src/game/data/heroes.ts`. Keep `hits.length` equal to the number of hit frames in the animation.
2. If it needs a new animation, author it in `tools/art/heroes/<hero>.ts` with `hit: true` on the strike frames (and `event: 'shoot' | 'jump' | 'cast'` where relevant), then `npm run art`.
3. Add its icon in `tools/art/ui.ts` (`SKILL_ICONS`).
4. Add a rules test in `tests/battle.test.ts` if it introduces a new mechanic, and run `npm test`.
5. Check it in the browser with `?demo=<skill_id>`.
