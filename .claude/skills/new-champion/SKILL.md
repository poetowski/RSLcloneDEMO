---
name: new-champion
description: Design and add a new champion (hero, enemy or boss) to The Loom: Reliquary of Legends — kit and stats inside the balance norms, procedural pixel-art sprite with every animation, skill icons, effects, campaign placement, and verification of mechanics, difficulty, graphics and in-battle presentation. Use whenever the user asks for a new champion, hero, enemy, boss or skill kit, or wants to rework an existing one.
---

# New champion

A champion is two modules that must agree, plus the content around them:

| Piece | File | Proven by |
| --- | --- | --- |
| Rules: identity, stats, one to three skills, passive | `src/game/data/champions/<id>.ts` + `champions/index.ts` | `tests/content.test.ts` (norms), `npm run balance` |
| Pixels: rig, animations, skill icons | `tools/art/champions/<id>.ts` + `champions/index.ts` | `npm run audit`, contact sheets |
| Effects the skills name | `tools/art/fx/<faction>.ts` | content tests (fx exist) |
| Where the player meets and recruits them | `src/game/data/campaign.ts` | content tests, balance curve |

Read first: `docs/DESIGN_DECISIONS.md` (Jakub's world, categories, factions and starting champions), `docs/MECHANICS_GUIDE.md` (sections 4-10), `docs/ART_GUIDE.md` (sections 2-8), `docs/GAME_STRUCTURE.md`. Templates sit next to this file.

## 1. Design (worksheet first)

1. Copy `templates/worksheet.md` into your notes and fill every line. Show Jakub the worksheet (name, concept, stats, kit, numbers, placement, art direction) and wait for his yes before building; without his answer, stop at the worksheet (CLAUDE.md, Content approval).
2. The four categories are Jakub's (DESIGN_DECISIONS.md 2), independent of each other: a faction does not imply an affinity, a role or a rarity.
   - **Faction:** the Azure Crown, the Sanguine Dominion, the Court of Root or the Ashveil Reign.
   - **Rarity:** Common, Elite, Heroic or Mythic (sets the stat budget).
   - **Affinity:** Ember, Bloom or Tide (Ember beats Bloom, Bloom beats Tide, Tide beats Ember; no Void). An affinity is abstract (Jakub, 2026-10-11: "affinity should not dictate colors or elements or anything"): never derive a colour, material, element or effect from it. Ember is not fire, Bloom is not leaves, Tide is not water.
   - **Role:** Tank, Damage or Support. There is no fourth role: control, bruiser, assassin and the like are descriptive tags.
3. Pick the **role** first, then shape the kit around it:
   - Tank: a taunt or shield A2/A3, high HP/DEF, A1 with a defensive rider (DEF Down, ATK Down). Without a Taunt the AI ignores a Tank until the others are low (MDA T20).
   - Damage: multi-hit or execute, high ATK/SPD/CRIT, low DEF. Tagged *bruiser*: sustain (lifesteal, shields) plus a big A3. Tagged *control*: chance-based debuffs on A1/A2, one guaranteed 1-turn control on A3.
   - Support: heal/cleanse/buff on A2, a team-wide payoff on A3.
4. Give the kit one idea the roster does not have yet. A heal can be a share of the healer's max HP (`healOf: 'caster'`) and a skill can lend turn meter to the ally lowest on HP after its heals (`tmLowestAlly`), as the Quartermaster's Field Rations does. The engine has Counterattack, Undying, ally Turn Meter, Dispel and skill control with no champion using them today; check `docs/MECHANICS_GUIDE.md` sections 8-9 for what exists. A passive is `undying`, `overdrive` (statuses the first time its holder drops below a share of its HP, any damage, once: the Bellringer's Last Peal, its own effect shown through `holderFx`), `rebuke` (the Rime Scholar's Cold Rebuke), `stat`, a stat raised in every battle (the Enforcer's Keen Edge, +10% C.RATE; the Skeleton's Bare Bones, +20 RES), `tend`, statuses at the end of its holder's turn on the ally with the lowest max HP, then a rest (the Jungle Herder's Herder's Ward), `ward`, a chance of statuses on an ally an enemy struck, after the hit (Emissary Handlings' Unbroken Flag), `fallen`, a stat raised for each fallen ally up to a cap (Big Ears' Hidden in the Undergrowth), `retaliate`, a chance of debuffs on an enemy whose attack hit the holder (the Associate's Bitter Motes), `remedy`, a chance of buffs on an ally an enemy debuffed (the Grove Keeper's Keeper's Balm), or `defy`, statuses and a heal for its holder when an enemy's critical hit leaves it standing (Irving Wellbington's Old Grudge); a ward with `self` guards its holder alone (the Black Rhino's Thick Hide) (`PassiveDef` in `types.ts`). A passive that acts in the flow of the fight names its effects: `fx` on whom it reaches, `holderFx` on its holder. A new kind follows step 2.6. A blow can heal its user (`healSelf`, the Grove Keeper's Thornburst), and a skill can lift every debuff from its targets (`cleanseAll`, his Cleansing Rite, kept by the AI for an afflicted ally with `ai.when: 'allyDebuffed'`). A kit has one to three skills (the Rime Scholar has no A3, the Skirmisher only an A1, the Dominion Medic only an A1 that heals). An A1 need not strike: one that hits no enemy never counterattacks, as counters answer with A1. A status the champion places on itself starts counting at its next turn (Iron Blow's ATK Up and the Lineholder's Brace cover two turns). A skill can be aimed at one chosen ally (`target: 'ally'`); with a `to: 'self'` status as well it gives both, and the player picks among the others (the Walking Bush's Thicket); so does one that heals its user (`healSelf`: the Bellringer's Warning Toll, a Shield on one ally and a heal for himself). A skill can raise a fallen ally (`target: 'fallen'` with `revive`, the share of max HP it gets up with): the Necromancer's Raise Dead takes one at random and is ready only while one has fallen. A status can be placed before a skill's first hit (`before: true` on its application), so the hit carries it: the Automated Soul's Pinning Shot places ATK Up on him, then shoots. A skill can fill its user's own turn meter for its next turn (`selfTm`, the Paladin's Beacon: 35%), and one aimed at every enemy can strike none (`hits: [{ mult: 0 }]`: Beacon's Slow on them, with DEF Up on his line).
5. When Jakub's brief leaves it open, choose an **affinity** that makes the stage that brings the champion interesting against the player's likely teams (team select shows strong/weak counts). It changes matchups, never the look (step 2).

## 2. Rules module

1. Copy `templates/champion-data.template.ts` to `src/game/data/champions/<id>.ts`; register it in `src/game/data/champions/index.ts` (array order = collection order, group by faction).
2. Stats: `statScore = HP/12 + ATK x 1.1 + (DEF - 40) x 2.25 + SPD x 1.3 + CRIT x 300` within **5%** of the rarity budget (Common 390, Elite 425, Heroic 440, Mythic 455); limits HP 900-1700, ATK 70-130, DEF 56-80, SPD 90-125, CRIT 0.025-0.15 (DEF divides damage as 40 / DEF; a critical hit deals double). A passive that raises a stat (`kind: 'stat'`) is extra: it never comes out of the budget, and it applies in combat only, so the collection and the champion page show the stats without it (Jakub, 2026-10-12). Other passives are paid for from the budget.
3. Skills: total multiplier per slot (A1 single 0.9-1.25 / AoE 0.5-0.8; A2 1.1-1.6 / 0.5-1.1; A3 1.3-2.6 / 0.7-1.2), cooldowns A1 0, A2 3-5 (4: Jakub's Bloodhound; 5: his Emissary Handlings, Big Ears, the Associate and the Black Rhino), A3 4-6 (6: his Necromancer's Raise Dead); statuses last at most 3 turns, Stun/Freeze 1 turn and guaranteed only on A3.
4. `hits` has **one entry per hit frame** of the animation you will author. `fx` names must exist (or be created in step 4). `ai.priority` 1/2/3 by slot; `when: 'allyHurt'` for heals that should wait.
5. Presentation fields: `allyFx` for an attack that buffs its own side (the effect on each ally the buff reaches, Onrush's gust), `approach` (`melee`, `center` for AoE melee, `ranged`, `leap` with a `jump` event, `blink` to strike from behind, `none` for in-place casts), `projectile` + champion `muzzle` for ranged, `volley` for arrows loosed into the sky that come down on every target (the Automated Soul's Sundering Volley), `castFx` ground circle, `actorFx` on the `cast` event, `shake` for heavy hits. Measure the `muzzle` instead of guessing it: `npx tsx tools/art/measure.ts <id> <anim>` prints the hands at every hit frame; projectiles spawn there on the hit frame (a new projectile also gets a trail and, if it should, an arc in `perform()` of `scene.ts`).
6. A new status or mechanic is a bigger change: add the `StatusId` (`types.ts`), its text (`statuses.ts`), the rule (`src/game/battle/battle.ts`) with a test in `tests/battle.test.ts`, a 12x12 icon (`tools/art/ui/status.ts`), its presentation in `src/game/view/scene.ts`, and a line in an Academy chapter (`src/game/data/codex.ts`).

## 3. Art module

1. Copy `templates/champion-art.template.ts` to `tools/art/champions/<id>.ts` (or the closest existing champion, see the worksheet) and register it in `tools/art/champions/index.ts`.
2. Dims within the proportions of ART_GUIDE 2.2; materials only from `MAT`, `ACCENT`, `INK` — **no color literals** in the module. The look comes from the brief and the champion's own story, never from its affinity (step 1.2, ART_GUIDE 2.4).
3. Build order in `build()`: things behind the body (cape, wings, back weapon) -> far leg and arm (`shade: -1`) -> torso and costume -> head -> near leg -> weapon (+ `smear` on frames flagged `smear`) -> near arm. Use `parts.ts` (`leg`, `arm`, `torsoPts`, `cape`, `sword`, `smear`, and `robe` for long robes and dresses, which also stays right when the champion falls) and `common.ts` (`face`, `glint`).
A champion on four legs (the Bloodhound, the Follower, the Black Rhino) solves its own skeleton from the shared pose (`solveDog` in `bloodhound.ts`, `solveWolf` in `follower.ts`, `solveBull` in `black_rhino.ts`: the pose's torso is the body's axis, `armN`/`armF` and `legN`/`legF` are the paws on the ground, and its Dims make the shared solver's head its head, for the portrait), stands its body a little behind the pivot so effects land at its chest, keeps its head up for the 64 px idle height, and sets `footprint` on its CharDef for a longer shadow.
4. The silhouette feature must survive a solid-black fill; check it in the collection (locked cards) or by filling the lineup.
   Markings on bare skin (the Wild Speaker's tattoos) are 1 px lines of an `INK` colour across the limb, drawn in the limb's own render group so no separation line rings them. Decals laid over several shapes (the Rot Hulk's stitches, staples and drips) go in one `pixels` layer with `line: 'none'`, or the separation pass rings every pixel and a seam turns into a dark band.
   Things that hang swing with the travel of what they hang from since the last frame (`info.prev`): the Jungle Herder's bell and Big Ears' gourd; a standard hangs from its crossbar and trails its pole, the travel clamped so a fast swing never flips the cloth (Emissary Handlings). Something a skill shows off must not hide behind the head or the far arm: lift it in the near hand, and free that hand first (the Herder drives his crook into the ground behind him before he rings the bell).
   A skeleton is built bone by bone from one placement of every bone per frame (a `BoneSet`), so in its death the bones can fall apart toward their resting places (`HEAP`, `fallApart`) on one pose channel (`heap`, 0..1); the bones, limbs, vertebrae and frames are shared in `tools/art/bones.ts` (the Skeleton, the Bellringer), each skeleton keeping its own trunk, skull and proportions. Something fixed to an arm in place of the hand can hang from a hinged collar and swing on its own (the Bellringer's bell: the pose channel `bell` turns it off the forearm's line).
   Key a texture to the shape, not to the screen, or it swims as the shape breathes: the `Hit` a `tex` receives carries the shape's `u` and `v` (the Black Rhino's coat and mane, the Associate's weave). Curly hair reads as round bunches, each lit on its own (the Associate).
   A weapon that burns burns in every frame: flames drawn into the sprite, rising up the screen whichever way it points and trailing its swing, flickering on whole cycles of a loop, and `CharDef.glow` naming where it burns so the game lights the air round it (the Paladin's sword; ART_GUIDE 7.4).
   Check the details at pixel level with `npx tsx tools/art/zoom.ts <id> idle 0 out.png 9`. Typical problems it catches: a band drawn as a capsule along a limb turns into a blob (draw thin rings across the limb instead), jewellery hidden behind the jaw, a hat that reads as a different hat.
5. Animations: `idle` (6-8 frames, whole-pixel breathing), `run` (8), every `anim` the skills name, `hurt` (3), `death` (6, last frame 600 ms; capes below the feet are clipped automatically), plus `rise` if the champion has Undying. A champion raised by Raise Dead gets up through its `death` played backwards, so a death must read in reverse too. Attacks follow anticipation -> strike (`hit: true`, `smear: true`) -> follow-through -> recovery. Events: `shoot`, `jump`, `cast`; pose channel `turn: 1` flips one frame. An in-between made by blending two poses (`mid`, `tween`) turns every joint the short way round: a swing that must travel the long way (a forearm going over the head from behind into a downward hack) folds backward in the blend, so author that frame instead (the Skeleton's `RH_OVER`). A body that falls must lie on the floor: the death clip hides up to 8 px of one sunk into it, so lift the pose until `npx tsx tools/art/groundcheck.ts 2` names none of its frames (the Rot Hulk on his back).
6. Icons: one entry in `icons` per skill, keys equal to the skill ids (a passive may add one under its own id, shown on the champion page), built with `glyph()` + `compose(iconBg, ...)` from `tools/art/icons.ts`; reuse the weapon function so the icon matches the sprite, or write a compact icon version of it when the full weapon does not fit 40x40 (`iconSpear` in `sunspear.ts`). Review: `npx tsx tools/art/iconpreview.ts <id>,<neighbour> out.png 6`.

## 4. Effects

New `fx` names go into `tools/art/fx/<faction>.ts` (or `common.ts`), built from `fx/kit.ts` (`crescent`, `cut`, `burst`, `sparks`, `ring`, `shard`, `flame`, `motes`, `stamp`, `crossedBlades`) with `FXR` ramps. Chest impacts use `ay 0.5`; ground pillars and circles `ay 0.9-1.0` (the battle plants them on the feet). Light effects are additive (add the name to `ADDITIVE` in `src/game/view/scene.ts`). An effect shows what the skill does with the weapon or the body (a cut, a blow, a shield set), in the champion's own materials or in neutral light and dust, never its affinity (step 1.2): the Lineholder is Tide, and his mace lands in a dull white flash and dust. An effect played at the actor's head point (`actorFx`, on the `cast` event: 8 px ahead of the feet and 8 below the top of the idle sprite) can be anchored onto something the actor holds: measure where it is in that frame and offset the anchor (the Bellringer's `toll_rings`). Preview: `npx tsx tools/art/fxpreview.ts out.png 2 name1,name2`.

## 5. Campaign placement

Set `recruit` to its id on the stage whose first clear brings the champion (`src/game/data/campaign.ts`); it may be among that stage's enemies or not (the Rime Scholar joins after the first battle without being fought). An enemy goes into a stage's `enemies`; a boss gets `boss: true` (x1.6 HP, crown, boss intro). A new stage needs a `map` position on the world map (`WORLD_MAP` pixels, 1280x360) that does not overlap other nodes, also on the overview at half the size; the road follows the stage order automatically after `npm run art -- map`.

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
