# Champion worksheet

Fill this in before writing code, and show it to the user when they are around: it is the design they approve. Every line maps to a field or a rule in the codebase.

## Identity

| Field | Value | Rule |
| --- | --- | --- |
| id | | lowercase, one word, unique (`src/game/data/champions/index.ts`) |
| Name, title | | "Name" + "the Title"; name fits on a 112 px card (about 14 characters) |
| Faction | | Azure Crown, Sanguine Dominion, Court of Root, Ashveil Reign (`meta.ts`; DESIGN_DECISIONS.md 3) |
| Role | | Tank, Damage, Support; tags such as bruiser or control describe the kit |
| Rarity | | Common, Elite, Heroic, Mythic; sets the stat budget: 390, 425, 440, 455 |
| Affinity | | Ember > Bloom > Tide > Ember; independent of the faction; check the matchups of the stage that brings them |
| Joins by | | starter, or the stage whose first clear brings them (fought there or not) |

## Look

| Field | Value | Rule |
| --- | --- | --- |
| Silhouette feature | | the one thing recognisable in solid black (locked cards show exactly that) |
| Signature hue | | not a hue family already used in the faction (ART_GUIDE 2.4) |
| Materials | | from `MAT` in `tools/art/palette.ts`; a new ramp only if nothing fits (6 steps, hue-shifted) |
| Weapon / focus | | a function in the art module, reused by the icons |
| Height | | 66-80 px body, audit range 64-96 |
| Closest existing champion | | the art module to start from: two bearded axes `azure_warrior`, staff caster `sanguine_support`; the proof of concept's modules are in git history at tag `poc-v1` (`tools/art/champions/`: sword `knight`, two-hander `dreadknight`, polearm `jackal` or `sunspear`, dual blades `stalker`, bow `archer`, staff casters `frostmage` and `starsinger`, unarmed `monk` and `colossus`, a mummy king `tomblord`) |

## Kit

| Slot | Name | Target, approach | Hits (mult each) | Effects | Animation (frames, hit frames, events) | Effects (fx names) |
| --- | --- | --- | --- | --- | --- | --- |
| A1 (CD 0) | | | total 0.9-1.25 (AoE 0.5-0.8) | chance-based debuff at most | `attack1` | |
| A2 (CD 3) | | | total 1.1-1.6 (AoE 0.5-1.1) | | | |
| A3 (CD 4-5) | | | total 1.3-2.6 (AoE 0.7-1.2) | the only slot that may guarantee a 1-turn Stun/Freeze | | |
| Passive | | | | `undying` and `overdrive` exist; a new kind needs rules, tests and an Academy entry | | |

Stats (HP / ATK / DEF / SPD / CRIT): ______ ; statScore = HP/12 + ATK x 1.1 + (DEF - 40) x 2.25 + SPD x 1.3 + CRIT x 300 = ______ (within 5% of the budget).

## Checks after building

- [ ] `npm run art -- champions <id>`, `npm run art -- ui`, (`-- fx` if new effects)
- [ ] `npm run audit` all ok (palette, height, frame box, literals)
- [ ] `npm test` all ok (norms, animations vs hits, icons, effects, recruit stage)
- [ ] `npm run balance` all ok (impact 40-60%, campaign curve bands)
- [ ] contact sheet reviewed, both facings
- [ ] every skill watched with `?demo=<skill_id>`
- [ ] card, champion page and recruit ceremony captured and reviewed
