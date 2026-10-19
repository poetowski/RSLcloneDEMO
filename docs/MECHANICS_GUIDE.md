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
- Effective Speed = base x (1 + 0.25 with SPD Up) x (1 - 0.25 with Slow).
- `tmTargets` adds to or drains targets' meters (Arrow Rain: -15%).

## 3. Turn structure

```
advance()                  meters fill until someone reaches 100%
startTurn(actor)           Poison -5% max HP, Burn -6% max HP (both ignore shields), Regen +15%
  if Stun or Freeze        the turn is skipped (STUNNED / FROZEN), statuses still tick
choose                     player: skill (1/2/3 or click) and target;  enemy / auto: AI (section 11)
useSkill(actor, skill, t)  resolve -> SkillResult, including any counterattacks it provoked
perform(result)            the view plays it (section 12)
endTurn(actor)             a passive that acts at the end of the turn (tend: Herder's Ward); TM = 0 (or selfTm); the actor's statuses tick down 1; its cooldowns tick down 1
```

Status durations count **the affected champion's own turns**: a 1-turn Stun means "skip your next turn". A status placed on a champion **during its own turn** starts counting at its next turn: it does not tick at the end of the turn it was placed in. So Iron Blow's 2-turn ATK Up covers Gareth's next two turns, and a Freeze that a Rebuke places on an attacker in the middle of the attacker's turn still takes the attacker's next turn (`StatusInst.fresh` in `battle.ts`). Refreshing such a status compares what is left after this turn's tick with the new duration. A status marked `before` is placed before the skill's first hit instead of on its last, so the skill's own hits carry it (the Automated Soul's Pinning Shot: ATK Up on him, then the shot); it counts like any other placed on its holder's own turn.

## 4. Skills

| Slot | Role | Cooldown |
| --- | --- | --- |
| **A1** | basic, always available | 0 |
| **A2** | special | 3-5 |
| **A3** | signature | 4-6 |

A cooldown of N makes the skill unavailable for N of the champion's turns after use; it is ready again on the (N+1)th turn. The HUD shows the turns left on the icon.

### 4.1 Schema (`src/game/data/types.ts`)

```ts
interface SkillDef {
  id; name; tag; desc; slot: 1 | 2 | 3; cooldown;
  target: 'enemy' | 'enemies' | 'ally' | 'allies' | 'self' | 'fallen';
  anim: string;                                  // champion animation
  approach: 'melee' | 'ranged' | 'center' | 'leap' | 'blink' | 'none';
  hits: { mult: number; fx?: string }[];         // one entry per hit frame of the animation
  statuses?: { status; turns; chance?; to: 'targets' | 'self' | 'allies'; value?; perHit?; before? }[];
  healAllies?: number;      // fraction of each ally's max HP
  healOf?: 'ally' | 'caster'; // whose max HP healAllies is a share of (default: each ally's own)
  cleanse?: boolean;        // remove one debuff from each ally
  cleanseAll?: boolean;     // remove every debuff from the targets, on the last hit (the Grove Keeper's Cleansing Rite)
  healSelf?: number;        // heal the actor by this fraction of its own max HP, on the last hit (his Thornburst)
  stripBuffs?: boolean;     // dispel: remove every buff from the targets before the first hit
  lifesteal?: number;       // fraction of damage dealt healed to the actor
  tmTargets?: number;       // turn meter change for targets, in %
  tmAllies?: number;        // turn meter change for every ally except the actor, in % (capped at 100)
  tmLowestAlly?: number;    // turn meter change for the ally (not the actor) lowest on HP share once the heals have landed
  selfTm?: number;          // actor ends the turn with this TM instead of 0
  execute?: { below: number; mult: number };
  revive?: number;          // with target 'fallen': the ally raised gets up with this fraction of its max HP, on the last hit (Raise Dead)
  projectile?: string; castFx?: string; actorFx?: string; shake?: number;   // presentation
  volley?: string;          // presentation: `projectile` loosed into the sky on `shoot`, this one coming down on every target (Sundering Volley)
  allyFx?: string;          // presentation: the effect on each ally a buff of an attack reaches (Onrush's gust)
  ai?: { priority: number; when?: 'allyHurt' | 'allyDebuffed' };
}
```

`ChampionDef` adds identity (`name, role, rarity, affinity, faction, color, lore`; champions carry no subtitle), `stats`, one to three skills (A1, and usually an A2 and an A3: the Rime Scholar has no A3, the Skirmisher only an A1, and the keys of missing skills do nothing), an optional `passive` (`undying`, `overdrive`, `rebuke`, `stat`, `tend`, `ward`, `fallen`, `retaliate`, `remedy` or `defy`; its presentation in `fx`, on whom it reaches, and `holderFx`, on its holder) and, for champions that throw projectiles, a `muzzle` point where projectiles leave the sprite.

### 4.2 Targeting

| `target` | Player clicks | Affects |
| --- | --- | --- |
| `enemy` | one enemy (Taunt restricts the choice) | that enemy |
| `enemies` | any enemy, or the skill again | all living enemies |
| `ally` | one ally; another ally while one stands, when the skill also helps its user, with a status (the Walking Bush's Thicket) or a heal (the Bellringer's Warning Toll) | that ally, and the user through its `self` status or its `healSelf`; a status reaches each unit once per skill |
| `allies` | any ally, or the skill again | all living allies |
| `self` | the skill again | the actor |
| `fallen` | the skill again; it is ready only while an ally has fallen | one fallen ally, chosen at random (the Necromancer's Raise Dead) |

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
       x execute bonus                   (target HP below the threshold)
       x (1 + C.DMG)                     (critical hit, chance = C.RATE, rolled per hit; C.DMG 100% = double)
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
| Regen | buff | heals 15% max HP at turn start |
| Counterattack | buff | answers an enemy skill that damaged it with its A1, once per enemy action |
| Stun | debuff | skips the next turn |
| Freeze | debuff | skips the next turn (encased in ice) |
| Poison | debuff | -5% max HP at turn start, ignores shields |
| Burn | debuff | -6% max HP at turn start, ignores shields |
| DEF Down | debuff | -12% Defense |
| Slow | debuff | -25% Speed (id `spd_down`; Jakub's name for it) |
| ATK Down | debuff | -25% Attack |
| Heal Block | debuff | cannot be healed: heals, Regen and lifesteal show `HEAL BLOCKED` |

- Reapplying a status refreshes it to the longer duration (and the larger shield); it never stacks.
- **Accuracy against Resistance** (Jakub, 2026-10-11): a debuff placed on an enemy, by a skill or a passive, compares the placer's ACC against the target's RES. While ACC is at least RES the debuff keeps its chance; above it, the chance is multiplied by 100 / (100 + RES − ACC), so RES 100 over ACC halves it and 300 over leaves a quarter, and even a certain debuff can be resisted (the curve is a stand-in: `landShare`, `RES_SCALE` in `battle.ts`). ACC above RES adds nothing. Buffs, and effects on allies, never meet RES. Every champion has ACC 0 and RES 0, so only the Weaver Matrix moves them.
- A debuff that fails its roll shows `RESIST`; a failed buff roll is silent.
- Death removes all statuses and empties the turn meter.

## 8. Special mechanics

| Mechanic | Rule |
| --- | --- |
| Counterattack | resolved inside `useSkill`: each damaged defender with Counter (not stunned or frozen) answers once with its A1 at the attacker, ignoring Taunt; counters cannot be countered; a champion whose A1 strikes no enemy (the Dominion Medic's heal) does not counter |
| Dispel | `stripBuffs` removes every buff from the targets before the hit |
| Cleanse | `cleanse` removes one debuff from each ally; `cleanseAll` removes every debuff from the skill's targets, Stun and Freeze too, on the last hit (the Grove Keeper's Cleansing Rite: the one ally he chooses, himself possible) |
| Self-heal | `healSelf` heals the actor by a share of its own max HP on the last hit, after the damage (Thornburst: 7%); Heal Block stops it |
| Lifesteal | heals the actor for a fraction of damage dealt (blocked by Heal Block) |
| Execute | `mult` bonus against targets below `below` x max HP |
| Heals | `healAllies` heals every ally on the last hit by a share of each ally's own max HP, or of the healer's with `healOf: 'caster'`; never past the maximum; Heal Block stops it |
| Turn Meter boost | `tmAllies` adds to every other ally's turn meter on the last hit; `tmLowestAlly` adds to the other ally with the lowest HP share once the skill's heals have landed; `tmTargets` drains enemies |
| Revive | `target: 'fallen'` with `revive`: on the last hit one fallen ally, chosen at random, gets up with `revive` x its max HP, nothing on it and an empty turn meter; its cooldowns stand as they were when it fell and its once-a-battle passives (Undying, Overdrive) stay spent. The skill is ready only while an ally has fallen, and the AI uses it as soon as it is (Raise Dead: 30%, cooldown 6; Jakub, 2026-10-18). Shows as a `raise` event: the skill's effect on the spot where the ally fell, then the ally gets up through its own `death` played backwards, `RAISED!`; the battle waits for it |
| Undying (passive) | the first lethal hit leaves the champion at `value` x max HP with every debuff removed |
| Overdrive (passive) | the first time damage, a hit or a tick of Poison or Burn, leaves the champion alive below `value` x max HP, it gains the passive's `statuses`, once a battle; a lethal hit never triggers it (the Bellringer's Last Peal: DEF Up for 2 turns below 50%). Shows as a `passive` event: the banner, then the passive's `holderFx` on its holder (Last Peal: the bell tolls by itself and gold closes round him), or without one the core-flare and `OVERDRIVE!` |
| Rebuke (passive) | while the champion is below `value` x max HP **after** a hit, an enemy whose **critical** hit landed on it receives the passive's `statuses` (Cold Rebuke: Freeze, 1 turn); then the passive rests for `cooldown` of the champion's own turns. A hit that kills never triggers it. Shows as a `passive` event with the attacker as `source`: the passive's banner, a burst of ice round the holder, `REBUKE!`, a shard flying to the attacker; the Freeze lands once the attacker is back in formation |
| Stat passive | `kind: 'stat'` adds `value` to the champion's `stat` in every battle, on top of its stats and its Weaver Matrix (`battleStats` in `battle.ts`; Keen Edge: C.RATE +10%; Bare Bones: RES +20, so a debuff from an enemy at ACC 0 lands on the Skeleton with 100/120 of its chance). It is extra, outside the stat budget, and the collection and the champion page show the stats without it, with the passive's text under the skills (Jakub, 2026-10-12). No event: it is always there |
| Tend (passive) | `kind: 'tend'`: at the end of each of its holder's turns, a skipped one too (a passive is no action), while it is ready, the living ally with the lowest max HP, the holder included, receives the passive's `statuses`, a Shield worth `value` x the holder's max HP; a tie goes to the lower HP share, then to the front; then the passive rests `cooldown` of the holder's turns (Herder's Ward: 10% for 1 turn, cooldown 1, so every second turn from the first; Jakub, 2026-10-17). It acts in `endTurn` while the turn is still the holder's, so a Shield on himself lasts through his next turn, like any status placed on his turn. Shows as a `passive` event on the ally with the holder as `source`, returned by `endTurn`: no banner, its name over the holder, the chime of his bell, the hook of light settling on the ally; the battle pauses a moment for it |
| Ward (passive) | `kind: 'ward'`: when an enemy skill damages an ally of the holder, the holder included, and leaves it standing, a `chance` roll gives that ally the passive's `statuses` after the skill's last hit, once per skill however many hits it took (Unbroken Flag: 50%, a Shield worth 15% of the Emissary's max HP for 1 turn; Jakub, 2026-10-17: after the hit, also on himself). A counterattack is an attack too; a stunned holder still answers. Shows as a `passive` event on the ally with the holder as `source`, on the skill's last hit: no banner, its name over the holder, a band of azure light and a kite shield of gold on the ally |
| Ward of its holder alone | a ward with `self` answers only blows on its holder, and with no `chance` every one of them (the Black Rhino's Thick Hide: a Shield of 10% of his max HP for 1 turn after every enemy attack that hits him; Jakub, 2026-10-17). Placed on the enemy's turn, it lasts until the end of his next turn, and each new blow refreshes it to the larger value. Shows on him like a ward: its name over him, a shell of dull light closing over him |
| Retaliate (passive) | `kind: 'retaliate'`: when an enemy skill damages the holder and leaves it standing, a `chance` roll places the passive's `statuses` on the attacker after the skill's last hit, once per skill, while the attacker stands; the debuff meets the attacker's RES (Bitter Motes: 35%, Poison for 1 turn; placed on the attacker's own turn it ticks once). A counterattack is an attack too. Shows as a `passive` event on the attacker with the holder as `source`: no banner, its name over the holder, her motes swarming the attacker |
| Remedy (passive) | `kind: 'remedy'`: whenever an enemy lands a debuff on an ally of the holder, the holder included (from a skill or a passive; a resisted one was never placed), a `chance` roll gives that ally the passive's `statuses`, once for each debuff (Keeper's Balm: 35%, Regen for 1 turn). Shows as a `passive` event on the ally with the holder as `source`: no banner, its name over the holder, a sprig of green light at the ally's feet. A remedy gives buffs only (the norms check), so it never answers itself |
| Fallen (passive) | `kind: 'fallen'`: in battle, `value` added to the holder's `stat` for each fallen ally, up to `max` (`critRate` in `battle.ts`; Hidden in the Undergrowth: +15% C.RATE for each, up to +30%). Extra to the stat budget and in battle only, like a stat passive. Each fall that raises it shows as a `passive` event on the holder: its banner, `+15% C.RATE` over it, the undergrowth stirring round its feet and its eye catching the light |
| Defy (passive) | `kind: 'defy'`: when an enemy skill lands a critical hit on the holder and leaves it standing, after the skill's last hit and once per skill, the holder takes the passive's `statuses` and heals by `value` x its max HP; a crit that fells it never wakes it, and Heal Block stops the heal (Old Grudge: Taunt for 1 turn and 20%; Jakub, 2026-10-19). Placed on the enemy's turn, the Taunt lasts through the holder's next turn. Shows as a `passive` event on the holder: no banner, its name over it, its `holderFx` (the runes of his shield blazing), then the Taunt and the heal |

No champion of today's roster uses Undying, dispels, cleanses, lifesteal or execute, and only the Quartermaster boosts turn meter (one ally, with Field Rations); the Bloodhound's Bay and the Jungle Herder's Bellwether are its Taunts and Bellwether its only Counterattack, the Walking Bush's Thicket its only skill aimed at one chosen ally, and the Wild Speaker's Quell its only ATK Down. Since 2026-10-17 Emissary Handlings' Banner Strike places Stun by chance (the first control on a skill; the other is the Rime Scholar's Cold Rebuke), Red Cloak places Burn (Crimson Blade) and SPD Up on his line (Onrush), Big Ears Poison (Poison Dart) and Heal Block (Dart Volley), and Shields come from the Herder's and the Emissary's passives. With the three Elites after them (2026-10-17), the Associate places ATK Down by chance (Mote Bolt), SPD Up and ATK Up on her line (Quickening) and Poison through her passive; the Black Rhino places Stun by chance (Gore), DEF Up on his line and Counterattack on himself (War Bellow) and shields himself (Thick Hide); the Grove Keeper heals himself with his blow (Thornburst), cleanses every debuff from one ally (Cleansing Rite) and answers debuffs with Regen (Keeper's Balm), the roster's first cleanse and first Regen. With the Bellringer (2026-10-18) a skill places a Shield for the first time (Warning Toll, on one ally, healing its user too), and his Last Peal is the roster's first Overdrive. With the Necromancer (2026-10-18) a skill raises a fallen ally for the first time (Raise Dead). With the Automated Soul a skill places a status before its hit for the first time (Pinning Shot's ATK Up), his Pinning Shot is the roster's first certain Stun, and his Sundering Volley its first DEF Down on every enemy. Irving Wellbington's Old Grudge (2026-10-19) is the first passive that answers a critical hit on its holder with something for the holder (a Taunt and a heal). The rules stay in the engine and are proven by the rule tests on synthetic champions (`tests/fixtures.ts`).

## 9. Champion kits

The kits are Jakub's ([DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) 8, Starter Heroes, 12, the Skirmisher, 13, the Lineholder, 14, the Quartermaster, 15, the Enforcer, 16, the Bloodhound, 17, the Dominion Medic, 18, the Follower, 19, the Walking Bush, 20, the Wild Speaker, 21, the Jungle Herder, 22, Emissary Handlings, 23, Red Cloak, 24, Big Ears, 25, the Associate, 26, the Black Rhino, 27, the Grove Keeper, 28, the Skeleton, 29, the Rot Hulk, 30, the Bellringer, 31, the Necromancer, 32, the Automated Soul, and 33, Irving Wellbington): which skills, their shapes and riders, Cold Rebuke's 35% threshold and 1-turn Freeze, Rend's 50% chance of DEF Down for 2 turns, Thicket's DEF Up for 1 turn on the Walking Bush and one chosen ally, Quell's 50% chance of ATK Down for 2 turns, and all the numbers of the seven Elites of 2026-10-17 but their multipliers (the Herder's Taunt, Counterattack, cooldown and ward; the Emissary's Stun chance, DEF Up, cooldown and flag; Red Cloak's Burn, SPD Up and cooldowns; Big Ears' Poison, Heal Block, cooldown and passive; the Associate's ATK Down, SPD Up, ATK Up, cooldown and Poison; the Black Rhino's Stun, DEF Up, Counterattack, cooldown and Shield; the Grove Keeper's 7% heal, cleanse, cooldown and Regen), and the numbers of the Skeleton (+20 RES), the Rot Hulk (a 25% chance of Poison for 2 turns), the Bellringer (a Shield of 10% of his max HP for 1 turn, a heal of 10%, DEF Up for 2 turns below 50% HP) the Necromancer (a 35% chance of Slow for 1 turn; Poison and SPD Up for 2 turns on a cooldown of 4; one fallen ally raised at random on a cooldown of 6) the Automated Soul (DEF Down for 2 turns on every enemy on a cooldown of 4; ATK Up on himself for 2 turns before the shot, then Stun for 1 turn, on a cooldown of 4) and Irving Wellbington (a 35% chance of Slow for 1 turn; DEF Up for 2 turns and Counterattack for 1 on himself on a cooldown of 4; Taunt for 1 turn and a heal of 20% when a crit leaves him standing). Their affinities are stand-ins until Jakub sets them. The numbers he has not set are stand-ins, in italics:

| Champion | A1 | A2 | A3 | Passive |
| --- | --- | --- | --- | --- |
| **Captain Gareth**, Damage, Ember | Line Cut: one enemy, *1.0* | Iron Blow (CD *3*): one enemy, *1.5*; then ATK Up on himself for 2 turns, after the hit, never gated by a crit | Wide Sweep (CD *4*): all enemies, *0.95*, damage only | none |
| **Rime Scholar**, Support, Tide | Pale Strike: one enemy, *1.0*, a pale shard thrown from her hand, nothing else | Rimebind (CD *3*): all enemies, *0.5*; Slow for *2* turns on every enemy | none | Cold Rebuke: below 35% HP, an enemy whose critical hit lands on her is Frozen for 1 turn; rests *3* turns |
| **Skirmisher**, Damage, Bloom, Common | *Twin Cut*: one enemy, two hits of *0.6*, one with each short sword; always hits twice | none | none | none |
| **Quartermaster**, Support, Bloom, Common | *Stick Rap*: one enemy, *0.9*, a plain rap of the walking stick | *Field Rations* (CD *3*): heals every ally by 15% of his max HP, then 15% Turn Meter to the ally (not himself) lowest on HP after the heal | none | none |
| **Lineholder**, Tank, Tide, Common | Guard Cut: one enemy, *1.0*, *a mace blow from behind the shield, damage only* | Brace (CD *3*): DEF Up on himself for 2 turns, no damage | none | none |
| **Bloodhound**, Tank, Ember, Common | *Bite*: one enemy, *1.0*, a lunge and a bite | *Bay* (CD 4): Taunt on himself for 1 turn, no damage | none | none |
| **Dominion Medic**, Support, Tide, Common | *Tonic*: all allies, no damage; heals every ally by 10% of his max HP | none | none | none |
| **Enforcer**, Damage, Ember, Common | *Heavy Cut*: one enemy, *1.0*, a two-handed cut of the long bastard sword | none | none | *Keen Edge*: +10% C.RATE in every battle, always on (12.5% with his own 2.5%) |
| **Follower**, Damage, Tide, Common | *Snap*: one enemy, *1.0*, a lunge and a snap of the jaws | *Rend* (CD 4): one enemy, *1.4*, a leap and a tear; then a 50% chance of DEF Down on the target for 2 turns, after the hit | none | none |
| **Walking Bush**, Tank, Bloom, Common | *Root Lash*: one enemy, *1.0*, a lash of a root arm | *Thicket* (CD 3): one chosen ally, no damage; DEF Up for 1 turn on that ally and on himself | none | none |
| **Wild Speaker**, Support, Ember, Common | *Staff Blow*: one enemy, *1.0*, a thrust of his long stick | *Quell* (CD 4): one enemy, *1.3*, an overhead blow of the stick; then a 50% chance of ATK Down on the target for 2 turns, after the hit | none | none |
| **Jungle Herder**, Tank, *Bloom*, Elite | *Crook Strike*: one enemy, *1.0*, the hook of his crook brought down | *Bellwether* (CD 4): Taunt on himself for 1 turn and Counterattack for 2, no damage; he rings the bell at his belt | none | *Herder's Ward*: at the end of his turn a Shield of 10% of his max HP for 1 turn on the ally with the lowest max HP, himself included; every second turn from his first |
| **Emissary Handlings**, Tank, *Tide*, Elite | Banner Strike: one enemy, *1.0*, a swing of the banner's pole; a 20% chance of Stun for *1* turn | Rallying Standard (CD 5): DEF Up on all allies for 2 turns, himself included, no damage | none | Unbroken Flag: when an enemy skill damages an ally, himself included, a 50% chance of a Shield of 15% of his max HP for 1 turn on it, after the hit |
| **Red Cloak**, Damage, *Bloom*, Elite | *Cleave*: one enemy, *1.0*, the zweihander from his shoulder | Crimson Blade (CD 3): one enemy, *1.3*; a 50% chance of one Burn for 2 turns, after the hit | *Onrush* (CD 5): one enemy, *1.8*, a lunge point first; then SPD Up on all allies for 2 turns, himself included | none |
| **Associate**, Support, *Ember*, Elite | *Mote Bolt*: one enemy, *1.0*, the motes of her staff in one bolt; a 50% chance of ATK Down for 1 turn | *Quickening* (CD 5): all allies, no damage; SPD Up for 2 turns and ATK Up for 1, herself included | none | *Bitter Motes*: when an enemy attack hits her, a 35% chance of Poison on that enemy for 1 turn, after the hit |
| **Black Rhino**, Tank, *Bloom*, Elite | *Gore*: one enemy, *1.0*, a charge and a thrust of his tusks; a 20% chance of Stun for 1 turn | *War Bellow* (CD 5): all allies, no damage; DEF Up for 2 turns, himself included, and Counterattack on himself for 2 | none | *Thick Hide*: after every enemy attack that hits him, a Shield of 10% of his max HP for 1 turn on himself |
| **Grove Keeper**, Support, *Tide*, Elite | *Thornburst*: one enemy, *1.0*, thorns from the ground; then he heals by 7% of his max HP | *Cleansing Rite* (CD 3): one ally, himself possible, no damage; removes every debuff from it | none | *Keeper's Balm*: when an enemy places a debuff on an ally, himself included, a 35% chance of Regen on it for 1 turn |
| **Skeleton**, Damage, Tide, Common | *Rusty Hack*: one enemy, *1.0*, a hack of the rusty sword | none | none | *Bare Bones*: +20 RES in every battle, always on |
| **Rot Hulk**, Tank, Ember, Common | *Putrid Slam*: one enemy, *1.0*, both fists brought down; a 25% chance of Poison for 2 turns, after the hit | none | none | none |
| **Bellringer**, Support, Ember, Common | *Warning Toll*: one ally (another while one stands), no damage; a Shield of 10% of his max HP on it for 1 turn, and he heals by 10% of his max HP | none | none | *Last Peal*: the first time he drops below 50% HP, DEF Up on himself for 2 turns |
| **Necromancer**, Support, Bloom, Elite | *Grave Chill*: one enemy, *1.0*, the black motes flung from his hand; a 35% chance of Slow for 1 turn | *Plague Verse* (CD 4): one enemy, *1.2*, a verse read from his book; Poison on it for 2 turns, and SPD Up for 2 turns on all allies, himself included | *Raise Dead* (CD 6): one fallen ally, chosen at random, no damage; it gets up with *30%* of its max HP; ready only while an ally has fallen | none |
| **Automated Soul**, Damage, Tide, Elite | *Unerring Shot*: one enemy, *1.0*, an arrow | *Sundering Volley* (CD 4): all enemies, *0.6* each, a volley loosed into the sky; DEF Down on them for 2 turns | *Pinning Shot* (CD 4): ATK Up on himself for 2 turns first, then one enemy, *1.3*, an arrow at full draw; Stun on it for 1 turn | none |
| **Irving Wellbington**, Tank, Bloom, Elite | *Shield Bash*: one enemy, *1.0*, the face of his shield; a 35% chance of Slow for 1 turn | *Bulwark Slam* (CD 4): one enemy, *1.2*, the shield's rim brought down; then DEF Up on himself for 2 turns and Counterattack for 1 | none | *Old Grudge*: when an enemy's critical hit lands on him and he stands, Taunt on himself for 1 turn and a heal of 20% of his max HP, once per enemy skill |
| **Big Ears**, Damage, *Ember*, Elite | *Poison Dart*: one enemy, *1.0*, a dart from his blowpipe; a 35% chance of Poison for 1 turn | Dart Volley (CD 5): all enemies, three darts of *0.2* each; then Heal Block on all enemies for 2 turns | none | Hidden in the Undergrowth: +15% C.RATE for each fallen ally, up to +30%, in battle |

Stats (stand-ins inside the Elite budget): Gareth HP 1150, ATK 122, DEF 62, SPD 104, CRIT 2.5% (score 422: his crit sits at the floor of the norms, as crit is deliberately not introduced on him); the Rime Scholar HP 1250, ATK 96, DEF 66, SPD 106, CRIT 2.5% (score 414, her passive paid for from the budget); the Skirmisher, on the Common budget, HP 960, ATK 108, DEF 57, SPD 110, CRIT 3.5% (score 391); the Lineholder, on the Common budget, HP 1320, ATK 78, DEF 72, SPD 92, CRIT 2.5% (score 395): the sturdiest and slowest of the five and the weakest hitter; the Quartermaster, on the Common budget, HP 1140, ATK 88, DEF 64, SPD 104, CRIT 2.5% (score 389): his heal is 171 HP to every ally; the Enforcer, on the Common budget, HP 1040, ATK 108, DEF 62, SPD 98, CRIT 2.5% (score 390, Keen Edge's +10% outside it by Jakub's rule); the Bloodhound, on the Common budget, HP 1300, ATK 82, DEF 64, SPD 100, CRIT 2.5% (score 390); the Dominion Medic, on the Common budget, HP 1360, ATK 70 (the floor: he never strikes), DEF 64, SPD 106, CRIT 2.5% (score 390): his heal is 136 HP to every ally, every turn; the Follower, on the Common budget, HP 980, ATK 104, DEF 56, SPD 114, CRIT 2.5% (score 388): the fastest champion and, after the Skirmisher, the frailest; the Walking Bush, on the Common budget, HP 1400, ATK 74, DEF 70, SPD 90, CRIT 2.5% (score 390): the most HP of all and the slowest; the Wild Speaker, on the Common budget, HP 1100, ATK 94, DEF 60, SPD 106, CRIT 2.5% (score 385); the Jungle Herder, on the Elite budget and a little under it for his passive, HP 1500, ATK 80, DEF 72, SPD 94, CRIT 2.5% (score 415): his ward is 150 HP; Emissary Handlings HP 1400, ATK 84, DEF 74, SPD 96, CRIT 2.5% (score 418, a little under for his passive): his flag's Shield is 210 HP; Red Cloak HP 1120, ATK 126, DEF 58, SPD 110, CRIT 2.5% (score 423): the hardest hitter; Big Ears HP 960, ATK 124, DEF 56, SPD 118, CRIT 5% (score 421; his passive outside it): the frailest Elite and the fastest of the four; the Associate HP 1220, ATK 96, DEF 64, SPD 112, CRIT 2.5% (score 414, a little under for her passive); the Black Rhino HP 1520, ATK 80, DEF 74, SPD 90, CRIT 2.5% (score 416, a little under for his passive): his hide's Shield is 152 HP, after every blow; the Grove Keeper HP 1320, ATK 92, DEF 66, SPD 105, CRIT 2.5% (score 414, a little under for his passive): his Thornburst heals him 92 HP; the Skeleton, on the Common budget, HP 950, ATK 108, DEF 58, SPD 108, CRIT 2.5% (score 386, Bare Bones' +20 RES outside it by Jakub's rule); the Rot Hulk, on the Common budget, HP 1500, ATK 80, DEF 64, SPD 90, CRIT 2.5% (score 392): the most HP of the Commons and, with the Walking Bush, their slowest; the Bellringer, on the Common budget and a little under it for his passive, HP 1300, ATK 70 (the floor: he never strikes), DEF 60, SPD 110, CRIT 2.5% (score 381): his Shield and his heal are 130 HP each; the Necromancer, on the Elite budget and a little under it for his revive, HP 1240, ATK 100, DEF 62, SPD 114, CRIT 2.5% (score 419): the fastest Support; the Automated Soul, on the Elite budget, HP 1100, ATK 120, DEF 64, SPD 104, CRIT 2.5% (score 420); Irving Wellbington, on the Elite budget and a little under it for his passive, HP 1460, ATK 82, DEF 76, SPD 90, CRIT 2.5% (score 417): his heal is 292 HP. Zone 1's enemies are copies of the two and crit as rarely, so Cold Rebuke seldom fires there; Jakub's note is that crit must be taught at or before the point Cold Rebuke first fires meaningfully.

## 10. Difficulty guardrails

Numbers are tuned against explicit norms, not by feel. `src/game/data/norms.ts` holds them; `tests/content.test.ts` enforces the static ones and `npm run balance` measures the rest.

| Guardrail | Rule |
| --- | --- |
| Stat budget | `statScore = HP/12 + ATK x 1.1 + (DEF - 40) x 2.25 + SPD x 1.3 + CRIT x 300` within **5%** of the rarity budget: Common 390, Elite 425, Heroic 440, Mythic 455 (the proof of concept's Common, Rare, Epic and Legendary budgets carried over: what rarity gates is not decided). A passive that raises a stat is extra and never counts (Jakub, 2026-10-12); other passives are paid for from the budget. |
| Stat limits | HP 900-1700, ATK 70-130, DEF 56-80, SPD 90-125, CRIT 2.5-15%; every champion has C.DMG 100%, ACC 0 and RES 0, outside the budget until Jakub sets base values |
| Skill multipliers (sum of hits) | A1 single 0.9-1.25 / AoE 0.5-0.8; A2 1.1-1.6 / 0.5-1.1; A3 1.3-2.6 / 0.7-1.2 |
| Cooldowns | A1 0, A2 3-5 (4 since Jakub's Bloodhound, 2026-10-12; 5 since his Emissary Handlings and Big Ears, 2026-10-17, and his Associate and Black Rhino after them), A3 4-6 (6 since his Necromancer's Raise Dead, 2026-10-18) |
| Statuses | hard control lasts 1 turn and is guaranteed only on an A3; anything else at most 3 turns |
| Impact | `npm run balance` section 3: random 3v3 teams that include the champion win **40-60%** against random teams (960 battles per champion). It needs six champions for two teams of three and is skipped below that. Since the Enforcer (2026-10-12) the roster has six, since the four Elites of 2026-10-17 fifteen, with the three after them eighteen, with the Skeleton, the Rot Hulk and the Bellringer (2026-10-18) twenty-one, with the Necromancer twenty-two, with the Automated Soul twenty-three, and with Irving Wellbington twenty-four: the Automated Soul 77%, Gareth 73%, Red Cloak 69%, the Black Rhino 62%, the Jungle Herder, the Necromancer and Big Ears 61%, Emissary Handlings 60%, the Rime Scholar 57%, the Associate 54%, Irving Wellbington 53%, the Grove Keeper 51%, the Wild Speaker 46%, the Enforcer and the Skirmisher 45%, the Follower 43%, the Rot Hulk 41%, the Skeleton 40%, the Quartermaster 38%, the Bloodhound 34%, the Dominion Medic 31%, the Walking Bush 30%, the Lineholder 29%, the Bellringer 21%. Over the band are seven Elites, the Automated Soul highest (a certain Stun every four turns and DEF Down on the whole enemy line, which the stat budget does not price: 82% with his first stand-ins, 78% with his multipliers near the floor of the norms, MDA T22) and the Necromancer among them (a team that takes him gets its fallen back); under it the Tanks with no Taunt, who hit least and draw no fire (the Lineholder and the Walking Bush: the AI aims elsewhere, MDA T20), the Bloodhound and the Quartermaster, and the two Supports who never strike, the Dominion Medic and, lowest of all, the Bellringer: a team that takes him gives up an attacker for one Shield of 130 a turn. They wait for Jakub's balance; no champion was retuned |
| Campaign curve | section 4: every team the player can own at that point (three champions, or all of them while they own fewer), auto-battled 20 times: first stage 85-100%, normal 55-92%, boss 40-80% (humans win more than the AI) |

Stage difficulty is set by `power` (enemy HP and ATK multiplier) and bosses take `BOSS_HP = 1.6` x HP. In Zone 1 the player owns one champion at 1-1, two from 1-2, three from 1-5 (the Follower joins on the first clear of 1-4), four from 1-6 (the Skirmisher, 1-5), five from 1-7 (the Dominion Medic, 1-6), six from 1-8 (the Lineholder, 1-7), seven from 1-9 (the Bloodhound, 1-8) and eight at 1-10 (the Quartermaster, 1-9); the Enforcer joins on the first clear of 1-10, after the last stage. Up to 1-5 every stage has one team; 1-6 averages the four teams of three, 1-7 the ten, 1-8 the twenty, 1-9 the thirty-five, 1-10 the fifty-six. In Zone 2 the player owns all nine at 2-1, which averages the eighty-four teams of three, ten at 2-2 (the Walking Bush joins on the first clear of 2-1), which averages the hundred and twenty, eleven at 2-3 (the Wild Speaker, 2-2), which averages the hundred and sixty-five, twelve at 2-4 and 2-5 (the Jungle Herder joins on the first clear of 2-3), which average the two hundred and twenty, thirteen at 2-6 and 2-7 (Emissary Handlings, 2-5), the two hundred and eighty-six, fourteen at 2-8 and 2-9 (Red Cloak, 2-7), the three hundred and sixty-four, and all fifteen at 2-10 (Big Ears, 2-9), the four hundred and fifty-five. With the Associate (2-4), the Black Rhino (2-6) and the Grove Keeper (2-8) the player owns twelve at 2-4, thirteen at 2-5, fourteen at 2-6, fifteen at 2-7, sixteen at 2-8, seventeen at 2-9 and all eighteen at 2-10. The powers of its ten placeholder stages (2026-10-13) were found by search for a curve from 89% to 54% on the report's sample; with the Walking Bush every stage from 2-3 got harder and 2-9 fell under the band, so it runs at 0.83 (was 0.84); with the Wild Speaker the stages from 2-3 moved by five points or less, each by its lean (an Ember, he hits the Bloom enemies strong and the Tide ones hit him strong), and stayed in their bands, so no power changed. With the four Elites (2026-10-17) every stage from 2-4 got easier, the most from 2-8 on (2-8 60% to 78%, 2-9 55% to 75%, 2-10 45% to 71%), and each stayed in its band, so no power changed: the decline the placeholder powers were searched for has flattened to 79%-68%; with the three Elites after them every stage stayed in its band again (2-4 79%, 2-5 83%, 2-6 80%, 2-7 71%, 2-8 81%, 2-9 81%, 2-10 78%, on the report's sample), so no power changed; the powers wait for Jakub's balance. In Zone 3 (the Moonlit Basin, 2026-10-17) the player owns all eighteen at every stage, so each averages the eight hundred and sixteen teams of three; the powers of its ten placeholder stages were found by search over all of them with the report's 20 seeds, for a curve from 86% down to the boss's 57%: 3-1 0.92 (86%), 3-2 0.84 (84%), 3-3 0.75 (80%), 3-4 0.81 (76%), 3-5 0.86 (73%), 3-6 0.84 (72%), 3-7 0.81 (69%), 3-8 0.75 (66%), 3-9 0.81 (62%), 3-10 0.76 (57%, boss). The Skeleton joins on the first clear of 3-1 (2026-10-18, a stand-in), so 3-2 to 3-10 average the nine hundred and sixty-nine teams of nineteen; a Common in the pool lowered them by up to three points (3-2 84%, 3-3 79%, 3-4 75%, 3-5 71%, 3-6 73%, 3-7 67%, 3-8 65%, 3-9 59%, 3-10 55%), all in band, so no power changed. The Rot Hulk joins on the first clear of 3-2 (2026-10-18, a stand-in), so 3-3 to 3-10 average the thousand one hundred and forty teams of twenty; another Common lowered them by up to three points more (3-3 78%, 3-4 72%, 3-5 71%, 3-6 71%, 3-7 66%, 3-8 63%, 3-9 59%, 3-10 53%), all in band, so no power changed. The Bellringer joins on the first clear of 3-3 (2026-10-18, a stand-in), so 3-4 to 3-10 average the thousand three hundred and thirty teams of twenty-one; a Common who never strikes lowered them by five to seven points (3-4 66%, 3-5 65%, 3-6 64%, 3-7 61%, 3-8 57%, 3-10 50%) and 3-9 fell under its band (54%), so it runs at 0.80 (was 0.81; 56%). Made an Ember the same day (Jakub; Bloom before), he takes the Tide enemies' blows strong and the Bloom ones' weak, and every stage moved by a point at most (3-6 65%, 3-7 60%, 3-10 49%), all in band. From 3-4, 0.1-3.3% of the battles stall at the balance tool's 400 turns, nearly all with only a Bellringer or a Dominion Medic left on the player's side, and count as losses (DESIGN_DECISIONS.md 7, MDA T21). In Zone 4 (Earth Scars, 2026-10-18) the player owns all twenty-one at 4-1, which averages the thousand three hundred and thirty teams of three; the powers of its ten placeholder stages were found by search over all of them with the report's 20 seeds, for a curve from 86% down to the boss's 56%: 4-1 0.83 (86%), 4-2 0.84 (83%), 4-3 0.81 (81%), 4-4 0.66 (77%), 4-5 0.95 (74%), 4-6 0.82 (71%), 4-7 0.71 (68%), 4-8 0.87 (65%), 4-9 0.84 (61%), 4-10 0.81 (56%, boss); 0-0.9% of its battles stall at the 400 turns, all with only non-strikers left on the player's side. The Necromancer joins on the first clear of 4-1 (2026-10-18, a stand-in), so 4-2 to 4-10 average the thousand five hundred and forty teams of twenty-two; an Elite in the pool made them one to five points easier (4-2 85%, 4-3 83%, 4-4 79%, 4-5 75%, 4-6 75%, 4-7 72%, 4-8 67%, 4-9 63%, 4-10 61%), all in band, so no power changed; 0-0.8% of the battles stall, all with only non-strikers left. The Automated Soul joins on the first clear of 4-2 (2026-10-18, a stand-in), so 4-3 to 4-10 average the thousand seven hundred and seventy-one teams of twenty-three; the strongest champion in the pool made them two to five points easier again (4-3 85%, 4-4 81%, 4-5 78%, 4-6 78%, 4-7 75%, 4-8 71%, 4-9 68%, 4-10 65%), all in band, so no power changed; 0-0.8% of the battles stall. Irving Wellbington joins on the first clear of 4-3 (2026-10-19, a stand-in), so 4-4 to 4-10 average the two thousand and twenty-four teams of twenty-four; a Tank in the band moved them by a point at most (4-4 82%, 4-5 77%, 4-6 79%, 4-7 76%, 4-8 71%, 4-9 68%, 4-10 65%), all in band; 0-0.7% of the battles stall. In Zone 5 (the Snowy Mesa, 2026-10-19) the player owns all twenty-four at every stage, so each averages the two thousand and twenty-four teams of three; the powers of its ten placeholder stages were found by search over all of them with the report's 20 seeds, for a curve from 86% down to the boss's 56%: 5-1 0.89 (86%), 5-2 0.70 (85%), 5-3 0.80 (81%), 5-4 0.74 (78%), 5-5 0.81 (76%), 5-6 0.81 (71%), 5-7 0.94 (70%), 5-8 0.70 (67%), 5-9 0.77 (61%), 5-10 0.67 (56%, boss); 0.1-0.9% of its battles stall at the 400 turns, all with only non-strikers left on the player's side. The Bellringer is no stage's enemy there: left alone on the enemy side he shields and heals himself faster than many teams can hurt him, and a first 5-1 with him stalled 3.4% of its battles. The powers, the stages that bring champions and the enemies are stand-ins: Jakub will dictate them (2026-10-12). Powers were chosen against 300 battles per team for a smooth decline (retuned 2026-10-10 for the Starter Heroes kits, 2026-10-11 from 1-6 for a team of three and from 1-8 for four teams, 2026-10-12 at 1-9 and 1-10 for the Bloodhound, then at 1-7, 1-9 and 1-10 for the Dominion Medic, and at 1-5 for the Follower, 2026-10-13), and the report's 20-battle sample checks them. The Rime Scholar hits Gareth's copies strong and they hit her weak, so stages of Gareths take more power than stages with a Rime Scholar. The Follower, Tide like her, hits them strong too: with him the team of three at 1-5 won every battle at its old power (0.67), so 1-5 runs at 0.92, and 1-6 to 1-8 got easier (79 / 79 / 76% from 81 / 71 / 65%) without leaving the band, so their powers stay. From 1-8 the four teams split wide: Gareth and the Rime Scholar with either Common win 77-100%, the Rime Scholar with both Commons 47-63%, Gareth with both Commons 9-22%. To bring the average into the band, 1-8 to 1-10 run at lower powers, so the best teams win almost always there (MDA T20):

| Stage | Enemies | Power | Win (300) | Win (report) | Band |
| --- | --- | --- | --- | --- | --- |
| 1-1 | 2 Gareths | 0.48 | 93% | 95% | first |
| 1-2 | Gareth, Rime Scholar | 0.81 | 87% | 90% | normal |
| 1-3 | 2 Gareths | 1.03 | 85% | 90% | normal |
| 1-4 | Gareth, Rime Scholar | 0.86 | 82% | 80% | normal |
| 1-5 | 2 Gareths, Rime Scholar | 0.92 | 78% | 90% | normal |
| 1-6 | Gareth, 2 Rime Scholars | 0.90 | 79% | 80% | normal |
| 1-7 | 2 Gareths, Rime Scholar | 0.73 | 79% | 84% | normal |
| 1-8 | 3 Gareths | 0.71 | 76% | 79% | normal |
| 1-9 | 2 Gareths, Rime Scholar | 0.68 | 67% | 69% | normal |
| 1-10 | Gareth (boss), 2 Rime Scholars | 0.70 | 50% | 52% | boss |
| 2-1 | 2 Followers | 1.03 | 89% | 89% | normal |
| 2-2 | 3 Followers | 0.70 | 87% | 83% | normal |
| 2-3 | Lineholder, Follower, Quartermaster | 0.89 | 78% | 76% | normal |
| 2-4 | Bloodhound, Follower, Dominion Medic | 0.99 | 79% | 79% | normal |
| 2-5 | Enforcer, Skirmisher, Follower | 0.82 | 81% | 80% | normal |
| 2-6 | Lineholder, Rime Scholar, Follower | 0.81 | 81% | 79% | normal |
| 2-7 | Bloodhound, Enforcer, Quartermaster | 1.02 | 68% | 68% | normal |
| 2-8 | Gareth, 2 Followers | 0.76 | 78% | 77% | normal |
| 2-9 | Gareth, Rime Scholar, Dominion Medic | 0.83 | 75% | 76% | normal |
| 2-10 | Follower (boss), Gareth, Rime Scholar | 0.71 | 71% | 72% | boss |

## 11. AI (`src/game/battle/ai.ts`)

Used for enemies and for the player's team in Auto mode.

1. Take the ready skills, highest `ai.priority` first (A3, then A2, then A1).
2. Skip support skills marked `when: 'allyHurt'` unless an ally is below 70% HP or carries a debuff, and those marked `when: 'allyDebuffed'` (a cleanse) unless an ally carries a debuff.
3. Targets: Taunt is respected; control skills avoid already-disabled champions and pick the highest Attack; dispels pick the most-buffed enemy; a `cleanseAll` picks the ally carrying the most debuffs, the one lower on HP on a tie; otherwise 70% of the time focus the lowest HP%, 30% a random valid target.

## 12. Presentation contract

`Battle.useSkill` returns a `SkillResult`: an ordered list of events, each tagged with the `hit` index it belongs to, plus the counterattacks it provoked (already resolved).

```
damage  { target, amount, crit, absorbed, edge, hit, dot? }   edge: +1 strong, -1 weak; dot: 'poison' | 'burn' ticks
heal    { target, amount, hit }            blocked { target, hit }      (Heal Block)
status  { target, status, turns, hit }     resist  { target, status, hit }
cleanse { target, status, hit }            dispel  { target, status, hit }
expire  { target, status }                 tm      { target, delta, hit }
revive  { target, hp, hit }                death   { target, hit }
raise   { target, hp, hit }                (a fallen ally raised by a skill: Raise Dead)
passive { target, name, hit, effect, source? }   (a passive acts mid-fight: Overdrive; Rebuke names the attacker; a ward, a tend or
                                                  a remedy targets the ally it helps and names its holder; a retaliation targets
                                                  the attacker and names its holder; fallen and defy target the holder)
```

The view (`BattleScene.perform`) turns that into choreography:

1. **Banner** with the skill name for A2/A3 (`COUNTERATTACK` for counters, with the crossed-blades cue).
2. **Approach** according to `approach`; dispel events land before the first hit, and so do statuses placed before it (hit -1: Pinning Shot's ATK Up shows on the actor before he draws).
3. **Cast circle** under the actor if `castFx` is set; `actorFx` at the head on the `cast` event.
4. **Animation**: every time the animation enters hit frame `k`, effects play and the events with `hit === k` are presented. Projectiles leave the champion's `muzzle` and present their events when they land; a volley (`volley`) is loosed into the sky on the `shoot` event and comes down on every target, a few arrows apiece, before its events show (Sundering Volley); AoE effects are staggered across the line; ground-anchored effects stand on the target's feet.
5. **Impact feel**: hit-stop (55 ms, 90 ms on crits), white flash, sprite shake, sparks, screen shake for heavy skills, floating numbers (crits in the larger title face with `CRITICAL`, `STRONG HIT` / `WEAK HIT` tags).
6. **Lifesteal** sends soul wisps back to the actor before the heal number; a self-heal from a blow (`healSelf` on a skill aimed at an enemy) sends three motes of green sap back from the target; one from a skill aimed at an ally shows as the skill lands (the Bellringer's toll).
7. The actor returns home; death and revive animations finish (Undying: fall, tomb-light helix, `UNDYING!`, `rise`; a raised ally: the skill's effect where it fell, its `death` played backwards as it gets up, `RAISED!`). An Overdrive shows the passive's name as a banner and, the moment the hit lands, its `holderFx` on the champion (the Bellringer's bell tolling), or without one the core-flare and `OVERDRIVE!`. A passive acting in the flow of the fight (a ward, a tend, a retaliation, a remedy, a defy) shows without a banner: its name over its holder, its `holderFx` on the holder, then its `fx` on whom it reaches. A ward (Unbroken Flag) shows on the ally the moment the last hit lands: a band of azure light and a kite shield of gold, then `SHIELD` (Thick Hide: a shell of dull light over the Black Rhino); a tend (Herder's Ward) the same way at the end of its holder's turn, with the chime of his bell and a hook of warm light, and the battle waits a moment for it; a retaliation (Bitter Motes) swarms the attacker with her motes, then `POISON`; a remedy (Keeper's Balm) sprouts a sprig of green light at the ally's feet, then `REGEN`; a cleanse names each debuff it lifts (`-POISON`); a fallen passive (Hidden in the Undergrowth) shows its banner, the stat it gains over its holder and the undergrowth stirring round its feet as the ally falls. A buff an attack gives its side plays the skill's `allyFx` on each ally instead of the rising arrows (Onrush's gust). A Rebuke shows its banner, the ice burst and `REBUKE!` on the holder the moment the critical hit lands, and a shard flies to the attacker; buffs the actor gives itself appear on the hit that grants them (Iron Blow's ATK Up), while control placed on the actor (the Rebuke's Freeze) lands once it is back in formation.
8. **Counterattacks** then play in order, each with its own approach.
9. Displayed HP snaps to the rules' state at the end of the whole action, so the view can never drift from the truth.
10. **Victory**: the winners play their `victory` animation (the captain's salute, the Rime Scholar's lifted censer), or their in-place cast when they have none.

This split keeps the rules testable without a browser (`npm test`) and lets the presentation change freely.

## 13. Controls

| Input | Action |
| --- | --- |
| Click a skill / `1` `2` `3` | select A1 / A2 / A3 (`3` does nothing for a champion without an A3) |
| Click a highlighted unit / arrows + `Enter` | use the selected skill on it |
| Click an AoE / ally skill again, `Enter` / `Space` | confirm |
| `A` or AUTO | auto battle (saved as the default) |
| `S` or the speed button | x1 / x2 / x3 (saved as the default) |
| `Esc` / `P` or MENU | pause menu: resume, auto, speed, retreat |
| Campaign map | drag to move; arrows jump between areas; `W` `A` `S` `D` or `Shift` + arrows slide; `M` whole map; `Enter` opens a stage, then PREPARE |
| MATRIX tab (champion page) | click a slot, then a lit spool in the stock to weave it; TAKE OUT returns the slot's spool to the stock |

URL parameters: `?screen=menu|campaign|team|battle|collection|champion|academy|options|recruit`, `&stage=1-5`, `&team=captain_gareth,rime_scholar`, `&champion=rime_scholar`, `&chapter=buffs`, `?demo=<skill_id>` (loops one skill), `?unlockall=1`, `?reset=1`, `?spools=1` (adds 24 sample spools to the stock), and for screenshots `&hp=0.1` (scales enemy HP).

## 14. The Weaver Matrix (`src/game/reliquary/`, `src/game/data/matrix.ts`)

Every owned champion has a Weaver Matrix: six slots in two triangles that hold Thread Spools. What the matrix adds reaches battle as the champion's stats (`Combatant.stats`, built by `battleStats`); enemies wear no spools. The slot names, what each slot takes and the eight core Weave Patterns are Jakub's ([DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) 9, 2026-10-11); the spool values, the strands, attunement and the way the pattern values are read below are stand-ins. Spools have no sources yet: the stock stays empty in play (`?spools=1` adds a sample for development).

| Slot | Name | Kind | Takes a spool whose main stat is |
| --- | --- | --- | --- |
| 1 (top) | Zenith | fixed | flat ATK |
| 2 | East Meridian | choice | SPD, or ATK, HP or DEF % |
| 3 | East Horizon | fixed | flat DEF |
| 4 (bottom) | Nadir | choice | C.RATE or C.DMG, or ATK, HP or DEF % |
| 5 | West Horizon | fixed | flat HP |
| 6 | West Meridian | choice | ACC or RES, or ATK, HP or DEF % |

"Base stats" in his record are read as ATK, HP and DEF in % of the champion's base.

**Spools.** A spool has a Weave Pattern, a grade (Ashen, Silver, Gilded), one main stat whose value the grade sets, and strands: additional stats, one per grade step. Strands are ATK, HP or DEF %, C.RATE or SPD; never a flat stat, C.DMG, ACC or RES.

| | Ashen | Silver | Gilded |
| --- | --- | --- | --- |
| Main flat ATK | +5 | +8 | +11 |
| Main flat HP | +50 | +85 | +120 |
| Main flat DEF | +3 | +5 | +7 |
| Main ATK, HP or DEF % | +4% | +7% | +10% |
| Main SPD | +2 | +3 | +4 |
| Main C.RATE | +4% | +7% | +10% |
| Main C.DMG | +6% | +10% | +15% |
| Main ACC or RES | +8 | +14 | +20 |
| Strands | 1 | 2 | 3 |
| Each ATK, HP or DEF % or C.RATE strand | +1 | +1 to 2 | +1 to 3 |
| Each SPD strand | +1 | +1 | +1 |

The flat main values are sized to what 4, 7 and 10% of a starter's base stat give.

**Weave Patterns** (Jakub's `CoreWeavePatterns`). Every spool carries one of the eight. Every 2 spools of one pattern in a matrix, wherever they sit, weave it once; 4 weave it twice and 6 three times, and each weave adds its value again.

| Pattern | Pieces | His stat and value | Each weave adds |
| --- | --- | --- | --- |
| Pulse | 2 | Speed 0.12 | +12% of base SPD |
| Sunder | 2 | Attack 0.15 | +15% of base ATK |
| Ward | 2 | Defense 0.15 | +15% of base DEF |
| Vigor | 2 | Health 0.15 | +15% of base HP |
| Needle | 2 | CritRate 0.12 | +12% C.RATE (points) |
| Apex | 2 | CritDamage 0.20 | +20% C.DMG (points) |
| Focus | 2 | Accuracy 20 | +20 ACC |
| Tranquility | 2 | Resistance 20 | +20 RES |

The last column is how the game reads his values (a stand-in until he confirms it): fractions for the four base stats, points for critical rate and damage, flat for ACC and RES. A save holding spools of a pattern the catalog no longer has (the draft patterns, removed 2026-10-11) drops them on load.

**Rules.**
1. A strand never repeats the spool's main stat, and a spool never carries the same strand twice (a flat ATK spool may carry an ATK % strand).
2. Strand values are rolled once, when the spool is found, and never change.
3. A matrix's strands add at most +4 SPD together.
4. **Attunement:** each fixed slot attunes the two choice slots beside it. A strand on a choice slot gains +1 when its stat belongs to a neighbouring fixed slot (an ATK % strand counts as ATK): East Meridian is attuned to ATK and DEF, Nadir to DEF and HP, West Meridian to HP and ATK.
5. Weaving a spool into a slot and taking it out are free; a spool you take out returns to the stock.

**Stats with the matrix:** ATK, HP and DEF = base x (1 + the summed % + the woven fractions) + the flat sum, rounded; SPD = base + the summed SPD + base x the woven fraction, rounded; C.RATE and C.DMG rise by the summed points; ACC and RES by the flat sum. The MATRIX tab on the champion page shows the result and the woven patterns.

**Critical damage, Accuracy and Resistance.** Every champion starts at C.DMG 100%, so a critical hit deals double damage as before (section 5); the matrix raises it. ACC and RES decide whether a debuff lands (section 7).
