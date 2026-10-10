---
name: new-champion
description: Design and add a new champion (hero, enemy or boss) to The Loom: Reliquary of Legends — kit and stats inside the balance norms, procedural pixel-art sprite with every animation, skill icons, effects, campaign placement, and verification of mechanics, difficulty, graphics and in-battle presentation. Use whenever the user asks for a new champion, hero, enemy, boss or skill kit, or wants to rework an existing one.
---

# New champion

A champion is two modules that must agree, plus the content around them:

| Piece | File | Proven by |
| --- | --- | --- |
| Rules: identity, stats, three skills, passive | `src/game/data/champions/<id>.ts` + `champions/index.ts` | `tests/content.test.ts` (norms), `npm run balance` |
| Pixels: rig, animations, skill icons | `tools/art/champions/<id>.ts` + `champions/index.ts` | `npm run audit`, contact sheets |
| Effects the skills name | `tools/art/fx/<faction>.ts` | content tests (fx exist) |
| Where the player meets and recruits them | `src/game/data/campaign.ts` | content tests, balance curve |

Read first: `docs/DESIGN_DECISIONS.md` (Jakub's world, categories, factions and starting champions), `docs/MECHANICS_GUIDE.md` (sections 4-10), `docs/ART_GUIDE.md` (sections 2-8), `docs/GAME_STRUCTURE.md`. Templates sit next to this file.

## 1. Design (worksheet first)

1. Copy `templates/worksheet.md` into your notes and fill every line. Show Jakub the worksheet (name, concept, stats, kit, numbers, placement, art direction) and wait for his yes before building; without his answer, stop at the worksheet (CLAUDE.md, Content approval).
2. The four categories are Jakub's (DESIGN_DECISIONS.md 2), independent of each other: a faction does not imply an affinity, a role or a rarity.
   - **Faction:** the Azure Crown, the Sanguine Dominion, the Court of Root or the Ashveil Reign.
   - **Rarity:** Common, Elite, Heroic or Mythic (sets the stat budget).
   - **Affinity:** Ember, Bloom or Tide (Ember beats Bloom, Bloom beats Tide, Tide beats Ember; no Void).
   - **Role:** Tank, Damage or Support. There is no fourth role: control, bruiser, assassin and the like are descriptive tags.
3. Pick the **role** first, then shape the kit around it:
   - Tank: a taunt or shield A2/A3, high HP/DEF, A1 with a defensive rider (DEF Down, Weaken).
   - Damage: multi-hit or execute, high ATK/SPD/CRIT, low DEF. Tagged *bruiser*: sustain (lifesteal, shields) plus a big A3. Tagged *control*: chance-based debuffs on A1/A2, one guaranteed 1-turn control on A3.
   - Support: heal/cleanse/buff on A2, a team-wide payoff on A3.
4. Give the kit one idea the roster does not have yet. The engine has Counterattack, Undying, ally Turn Meter, Overdrive, Dispel and control with no champion using them today; check `docs/MECHANICS_GUIDE.md` sections 8-9 for what exists. A passive is `undying` or `overdrive` (`PassiveDef` in `types.ts`); a new kind follows step 2.6.
5. Choose an **affinity** that makes the stage that brings the champion interesting against the player's likely teams (team select shows strong/weak counts).

## 2. Rules module

1. Copy `templates/champion-data.template.ts` to `src/game/data/champions/<id>.ts`; register it in `src/game/data/champions/index.ts` (array order = collection order, group by faction).
2. Stats: `statScore = HP/12 + ATK x 1.1 + (DEF - 40) x 2.25 + SPD x 1.3 + CRIT x 300` within **5%** of the rarity budget (Common 390, Elite 425, Heroic 440, Mythic 455); limits HP 900-1700, ATK 70-130, DEF 56-80, SPD 90-125, CRIT 0.025-0.15 (DEF divides damage as 40 / DEF; a critical hit deals double). A passive is paid for from the budget.
3. Skills: total multiplier per slot (A1 single 0.9-1.25 / AoE 0.5-0.8; A2 1.1-1.6 / 0.5-1.1; A3 1.3-2.6 / 0.7-1.2), cooldowns A1 0, A2 3, A3 4-5; statuses last at most 3 turns, Stun/Freeze 1 turn and guaranteed only on A3.
4. `hits` has **one entry per hit frame** of the animation you will author. `fx` names must exist (or be created in step 4). `ai.priority` 1/2/3 by slot; `when: 'allyHurt'` for heals that should wait.
5. Presentation fields: `approach` (`melee`, `center` for AoE melee, `ranged`, `leap` with a `jump` event, `blink` to strike from behind, `none` for in-place casts), `projectile` + champion `muzzle` for ranged, `castFx` ground circle, `actorFx` on the `cast` event, `shake` for heavy hits. Measure the `muzzle` instead of guessing it: `npx tsx tools/art/measure.ts <id> <anim>` prints the hands at every hit frame; projectiles spawn there on the hit frame (a new projectile also gets a trail and, if it should, an arc in `perform()` of `scene.ts`).
6. A new status or mechanic is a bigger change: add the `StatusId` (`types.ts`), its text (`statuses.ts`), the rule (`src/game/battle/battle.ts`) with a test in `tests/battle.test.ts`, a 12x12 icon (`tools/art/ui/status.ts`), its presentation in `src/game/view/scene.ts`, and a line in an Academy chapter (`src/game/data/codex.ts`).

## 3. Art module

1. Copy `templates/champion-art.template.ts` to `tools/art/champions/<id>.ts` (or the closest existing champion, see the worksheet) and register it in `tools/art/champions/index.ts`.
2. Dims within the proportions of ART_GUIDE 2.2; materials only from `MAT`, `ACCENT`, `INK` — **no color literals** in the module.
3. Build order in `build()`: things behind the body (cape, wings, back weapon) -> far leg and arm (`shade: -1`) -> torso and costume -> head -> near leg -> weapon (+ `smear` on frames flagged `smear`) -> near arm. Use `parts.ts` (`leg`, `arm`, `torsoPts`, `cape`, `sword`, `smear`, and `robe` for long robes and dresses, which also stays right when the champion falls) and `common.ts` (`face`, `glint`).
4. The silhouette feature must survive a solid-black fill; check it in the collection (locked cards) or by filling the lineup.
   Check the details at pixel level with `npx tsx tools/art/zoom.ts <id> idle 0 out.png 9`. Typical problems it catches: a band drawn as a capsule along a limb turns into a blob (draw thin rings across the limb instead), jewellery hidden behind the jaw, a hat that reads as a different hat.
5. Animations: `idle` (6-8 frames, whole-pixel breathing), `run` (8), every `anim` the skills name, `hurt` (3), `death` (6, last frame 600 ms; capes below the feet are clipped automatically), plus `rise` if the champion has Undying. Attacks follow anticipation -> strike (`hit: true`, `smear: true`) -> follow-through -> recovery. Events: `shoot`, `jump`, `cast`; pose channel `turn: 1` flips one frame.
6. Icons: three entries in `icons`, keys equal to the skill ids, built with `glyph()` + `compose(iconBg, ...)` from `tools/art/icons.ts`; reuse the weapon function so the icon matches the sprite, or write a compact icon version of it when the full weapon does not fit 40x40 (`iconSpear` in `sunspear.ts`). Review: `npx tsx tools/art/iconpreview.ts <id>,<neighbour> out.png 6`.

## 4. Effects

New `fx` names go into `tools/art/fx/<faction>.ts` (or `common.ts`), built from `fx/kit.ts` (`crescent`, `cut`, `burst`, `sparks`, `ring`, `shard`, `flame`, `motes`, `stamp`, `crossedBlades`) with `FXR` ramps. Chest impacts use `ay 0.5`; ground pillars and circles `ay 0.9-1.0` (the battle plants them on the feet). Light effects are additive (add the name to `ADDITIVE` in `src/game/view/scene.ts`). Preview: `npx tsx tools/art/fxpreview.ts out.png 2 name1,name2`.

## 5. Campaign placement

Set `recruit` to its id on the stage whose first clear brings the champion (`src/game/data/campaign.ts`); it may be among that stage's enemies or not (the Sanguine Support joins after the first battle without being fought). An enemy goes into a stage's `enemies`; a boss gets `boss: true` (x1.6 HP, crown, boss intro). A new stage needs a `map` position on the world map (`WORLD_MAP` pixels, 1280x360) that does not overlap other nodes, also on the overview at half the size; the road follows the stage order automatically after `npm run art -- map`.

## 6. Build and verify (all must pass)

```bash
npm run art -- champions <id>     # atlas
npm run art -- ui                 # icons + portraits for every champion
npm run art -- fx                 # if you added effects
npm run art -- map                # if you added a stage
npm run audit                     # palette, height 64-96, frame box, no literals
npm test                          # norms, anims vs hits, icons, effects, recruit rules
npm run balance                   # impact 40-60%, campaign curve bands; tune and re-run
npm run typecheck
```

Visual review — look at every image before calling it done:

```bash
npx tsx tools/art/preview.ts <id> 2 out.png all both      # every animation, both facings
npx tsx tools/art/review.ts <id> out.png 3 both           # the same, cropped tight, with hit and event ticks
npx tsx tools/art/groundcheck.ts                          # feet, robes or gear sinking through the floor
npx tsx tools/art/fxcheck.ts                              # new effects cut off at their box (give them pad)
npx tsx tools/art/lineup.ts lineup.png 3                  # next to the other champions
npm run dev                                               # then, in another shell:
npx tsx tools/shots.ts "http://localhost:5173/?demo=<skill_id>" out "w3500,B12:150"
npx tsx tools/shots.ts "http://localhost:5173/?unlockall=1&screen=champion&champion=<id>" out "w2500,B1:0"
npx tsx tools/shots.ts "http://localhost:5173/?screen=recruit&champion=<id>" out "w2500,B1:0"
```

Look for: silhouette and hue distinct from the lineup, weapon arcs that read, hit frames that land when the effect plays, effects facing the right way on both sides, numbers and statuses not hidden by the HUD.

## 7. Done means

- The worksheet is filled and approved by Jakub.
- Data and art registered; `npm run audit`, `npm test`, `npm run balance`, `npm run typecheck` pass.
- Every skill watched in `?demo=`; card, champion page and recruit ceremony reviewed; with `?unlockall=1` the new card is reachable in the collection and in the team-select roster (both scroll as the roster grows).
- `docs/MECHANICS_GUIDE.md` section 9 (kits) and `docs/GAME_STRUCTURE.md` (roster table) updated; the Academy mentions any new mechanic.
- Assets regenerated and committed together with the code (`public/assets` is versioned).
