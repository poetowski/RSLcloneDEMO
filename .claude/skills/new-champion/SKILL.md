---
name: new-champion
description: Design and add a new champion (hero, enemy or boss) to Oathbound — kit and stats inside the balance norms, procedural pixel-art sprite with every animation, skill icons, effects, campaign placement, and verification of mechanics, difficulty, graphics and in-battle presentation. Use whenever the user asks for a new champion, hero, enemy, boss or skill kit, or wants to rework an existing one.
---

# New champion

A champion is two modules that must agree, plus the content around them:

| Piece | File | Proven by |
| --- | --- | --- |
| Rules: identity, stats, three skills, passive | `src/game/data/champions/<id>.ts` + `champions/index.ts` | `tests/content.test.ts` (norms), `npm run balance` |
| Pixels: rig, animations, skill icons | `tools/art/champions/<id>.ts` + `champions/index.ts` | `npm run audit`, contact sheets |
| Effects the skills name | `tools/art/fx/<faction>.ts` | content tests (fx exist) |
| Where the player meets and recruits them | `src/game/data/campaign.ts` | content tests, balance curve |

Read first: `docs/MECHANICS_GUIDE.md` (sections 4-10), `docs/ART_GUIDE.md` (sections 2-8), `docs/GAME_STRUCTURE.md`. Templates sit next to this file.

## 1. Design (worksheet first)

1. Copy `templates/worksheet.md` into your notes and fill every line. When the user is in the conversation, show them the worksheet and get a yes on concept, kit and placement before building.
2. Pick the **role** first, then shape the kit around it:
   - Tank: a taunt or shield A2/A3, high HP/DEF, A1 with a defensive rider (DEF Down, Weaken).
   - Bruiser: sustain (lifesteal, shields) plus a big A3.
   - Damage: multi-hit or execute, high ATK/SPD/CRIT, low DEF.
   - Support: heal/cleanse/buff on A2, a team-wide payoff on A3.
   - Control: chance-based debuffs on A1/A2, one guaranteed 1-turn control on A3.
3. Give the kit one idea the roster does not have yet (Counterattack for Kha'zir, Undying for Anhotep). Check `docs/MECHANICS_GUIDE.md` section 9 for what exists.
4. Choose an **affinity** that makes the recruiting stage interesting against the player's likely teams (team select shows strong/weak counts).

## 2. Rules module

1. Copy `templates/champion-data.template.ts` to `src/game/data/champions/<id>.ts`; register it in `src/game/data/champions/index.ts` (array order = collection order, group by faction).
2. Stats: `statScore = HP/12 + ATK x 1.1 + DEF x 0.9 + SPD x 1.3 + CRIT x 150` within **5%** of the rarity budget (common 390, uncommon 410, rare 425, epic 440, legendary 455); limits HP 900-1700, ATK 70-130, DEF 40-100, SPD 90-125, CRIT 0.05-0.30. A passive is paid for from the budget.
3. Skills: total multiplier per slot (A1 single 0.9-1.25 / AoE 0.5-0.8; A2 1.1-1.6 / 0.5-1.1; A3 1.3-2.6 / 0.7-1.2), cooldowns A1 0, A2 3, A3 4-5; statuses last at most 3 turns, Stun/Freeze 1 turn and guaranteed only on A3.
4. `hits` has **one entry per hit frame** of the animation you will author. `fx` names must exist (or be created in step 4). `ai.priority` 1/2/3 by slot; `when: 'allyHurt'` for heals that should wait.
5. Presentation fields: `approach` (`melee`, `center` for AoE melee, `ranged`, `leap` with a `jump` event, `blink` to strike from behind, `none` for in-place casts), `projectile` + champion `muzzle` for ranged, `castFx` ground circle, `actorFx` on the `cast` event, `shake` for heavy hits.
6. A new status or mechanic is a bigger change: add the `StatusId` (`types.ts`), its text (`statuses.ts`), the rule (`src/game/battle/battle.ts`) with a test in `tests/battle.test.ts`, a 12x12 icon (`tools/art/ui/status.ts`), its presentation in `src/game/view/scene.ts`, and a line in an Academy chapter (`src/game/data/codex.ts`).

## 3. Art module

1. Copy `templates/champion-art.template.ts` to `tools/art/champions/<id>.ts` (or the closest existing champion, see the worksheet) and register it in `tools/art/champions/index.ts`.
2. Dims within the proportions of ART_GUIDE 2.2; materials only from `MAT`, `ACCENT`, `INK` — **no color literals** in the module.
3. Build order in `build()`: things behind the body (cape, wings, back weapon) -> far leg and arm (`shade: -1`) -> torso and costume -> head -> near leg -> weapon (+ `smear` on frames flagged `smear`) -> near arm. Use `parts.ts` (`leg`, `arm`, `torsoPts`, `cape`, `sword`, `smear`) and `common.ts` (`face`, `glint`).
4. The silhouette feature must survive a solid-black fill; check it in the collection (locked cards) or by filling the lineup.
5. Animations: `idle` (6-8 frames, whole-pixel breathing), `run` (8), every `anim` the skills name, `hurt` (3), `death` (6, last frame 600 ms; capes below the feet are clipped automatically), plus `rise` if the champion has Undying. Attacks follow anticipation -> strike (`hit: true`, `smear: true`) -> follow-through -> recovery. Events: `shoot`, `jump`, `cast`; pose channel `turn: 1` flips one frame.
6. Icons: three entries in `icons`, keys equal to the skill ids, built with `glyph()` + `compose(iconBg, ...)` from `tools/art/icons.ts`; reuse the weapon function so the icon matches the sprite.

## 4. Effects

New `fx` names go into `tools/art/fx/<faction>.ts` (or `common.ts`), built from `fx/kit.ts` (`crescent`, `cut`, `burst`, `sparks`, `ring`, `shard`, `flame`, `motes`, `stamp`, `crossedBlades`) with `FXR` ramps. Chest impacts use `ay 0.5`; ground pillars and circles `ay 0.9-1.0` (the battle plants them on the feet). Light effects are additive (add the name to `ADDITIVE` in `src/game/view/scene.ts`). Preview: `npx tsx tools/art/fxpreview.ts out.png 2 name1,name2`.

## 5. Campaign placement

Put the champion into a stage's `enemies` and set that stage's `recruit` to its id (`src/game/data/campaign.ts`); a champion can only be recruited where the player fought it. A boss gets `boss: true` (x1.6 HP, crown, boss intro). A new stage needs a `map` position on the world map that does not overlap other nodes; the road follows the stage order automatically after `npm run art -- map`.

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
npx tsx tools/art/lineup.ts lineup.png 3                  # next to the other champions
npm run dev                                               # then, in another shell:
npx tsx tools/shots.ts "http://localhost:5173/?demo=<skill_id>" out "w3500,B12:150"
npx tsx tools/shots.ts "http://localhost:5173/?unlockall=1&screen=champion&champion=<id>" out "w2500,B1:0"
npx tsx tools/shots.ts "http://localhost:5173/?screen=recruit&champion=<id>" out "w2500,B1:0"
```

Look for: silhouette and hue distinct from the lineup, weapon arcs that read, hit frames that land when the effect plays, effects facing the right way on both sides, numbers and statuses not hidden by the HUD.

## 7. Done means

- The worksheet is filled and (if the user is present) approved.
- Data and art registered; `npm run audit`, `npm test`, `npm run balance`, `npm run typecheck` pass.
- Every skill watched in `?demo=`; card, champion page and recruit ceremony reviewed.
- `docs/MECHANICS_GUIDE.md` section 9 (kits) and `docs/GAME_STRUCTURE.md` (roster table) updated; the Academy mentions any new mechanic.
- Assets regenerated and committed together with the code (`public/assets` is versioned).
