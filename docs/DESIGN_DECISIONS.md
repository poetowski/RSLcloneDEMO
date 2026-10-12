# Design Decisions

The living record of Jakub's design decisions: the premise, the enums and the
factions, the starter champions, the campaign, the Weaver Matrix, the combat
rules and champion stats, and the game's name and lexicon. Records he handed
over keep his words; when a later decision changes one, the change is marked
where it stands, with its date. Campaign zones are **not locked** — they are
working notes.

Stand-ins (the numbers, texts and art the game needs before he sets them) are
not recorded here: CLAUDE.md lists them, and each is marked where it lives.
Section 7 lists what is not decided.

### Changes

| Date | Change | Section |
|---|---|---|
| 2026-10-10 | First export: premise, enums, factions, starter champions, campaign notes | 1-7 |
| 2026-10-10 | The gold of the Azure Crown confirmed; standards of the Court of Root and the Ashveil Reign | 3.6 |
| 2026-10-10 | The map and campaign nodes | 5.4a |
| 2026-10-10 | Starter Heroes: Captain Gareth and the Rime Scholar | 8 |
| 2026-10-11 | Zone 1's battle background (brief, then "i like how it looks now in game") | 5.3a |
| 2026-10-11 | Champions carry no subtitle | 10 |
| 2026-10-11 | Weaver Matrix slot names and the core Weave Patterns | 9.3 |
| 2026-10-11 | Accuracy against Resistance decides whether a debuff lands | 10 |
| 2026-10-11 | Recorded here from earlier approvals: the name, direction and lexicon (2026-10-08), the gear system (2026-10-08, 2026-10-10) and its combat rules | 9, 10, 11 |
| 2026-10-11 | Cleanup: section 4 points to section 8, answered questions closed, section 7 refreshed | 4, 5.3, 7 |
| 2026-10-11 | Zone names: Zone 1 the Fracture Reach, Zone 2 the Verdant Grove; Zone 2 is not about an arena | 5.3, 5.4, 7 |
| 2026-10-11 | The world map redrawn: no edges, the rift reworked, the areas and the forest closer, growing east area by area | 5.4a |
| 2026-10-11 | The redrawn world map approved as built ("i love it") | 5.4a |
| 2026-10-11 | The Skirmisher, a Common of the Azure Crown | 12 |
| 2026-10-11 | Affinity is abstract: it dictates no colours, elements or anything else | 2.1, 7 |
| 2026-10-11 | The Lineholder, a Common of the Azure Crown | 13 |
| 2026-10-12 | The interface's affinity marks stay; Gareth's and the Skirmisher's cuts made plain | 2.1, 7 |
| 2026-10-12 | Balance, the stage that brings each champion and every stage's enemies: Jakub dictates them later | 7 |
| 2026-10-12 | The Quartermaster, a Common of the Azure Crown | 14 |

---

## 1. Premise

The game is set after a **celestial divine loom** broke. When it broke is
unknown — nobody knows when. The break is not a recent event in the world's
memory; it is an event outside memory.

The break has consequences that are **dimensional, spatial, and temporal**.
Reality does not hold together the way it should. Places, times, and worlds
that would never naturally meet can be connected by the break.

**There are no dim nations.** The factions of the world are not diminished
versions of what they were. They are what they are.

**The player is an Archivist.** The Archivist's presence is **more celestial
than physical** — they are not simply a person walking the world, in the same
way the champions they collect are not simply people. The Archivist and the
champions exist in the same register: collected, reconstructed, more-than-
physical.

**The central verb is recollection.** Champions are **fragmented souls of
legendary champions**, collected and reconstructed. With their help, the
Archivist works to repair the loom.

---

## 2. Enums (locked)

### 2.1 Affinity

Three values, rock-paper-scissors cycle. No Void.

| Affinity | Beats |
|---|---|
| Ember | Bloom |
| Bloom | Tide |
| Tide | Ember |

Void is reserved as a future neutral affinity and is not part of the current
enum. Mechanism (damage, crit, landing, all three) is deferred.

**Affinity is abstract** (2026-10-11), in Jakub's words:

```
remember in your drawing or designing skills that affinity should not dictate colors or elements or anything. these three affinity choices are very abstract
```

An affinity sets no colour, element or anything else in a champion's look:
Ember is not fire, Bloom is not plants, Tide is not water. A champion's
colours, materials, smears and effects come from who the champion is and what
the skill does. The fire and water glosses in sections 6 and 8 are how the
affinities were first described; they set nothing in the art.

On 2026-10-12, in Jakub's words:

```
affinity marks are ok. you can rework gareths ember cuts and skirmishers leaf green cuts to more plain.
```

The interface keeps its affinity marks (the gems, the tinted card
backgrounds). The cuts of Gareth and the Skirmisher, made before the rule,
are plain now.

### 2.2 Rarity

Four values, ascending.

| Tier | Name |
|---|---|
| 1 | Common |
| 2 | Elite |
| 3 | Heroic |
| 4 | Mythic |

Rarity is fixed per champion at authoring time. Gating (stats, kits,
ascension, recruit pools) is deferred.

### 2.3 Role

Three values.

- Tank
- Damage
- Support

No fourth role. Control, Bruiser, Assassin and similar are descriptive tags,
not roles. Whether roles are mechanical or descriptive is deferred.

### 2.4 Faction

Four values.

- Azure Crown
- Sanguine Dominion
- Court of Root
- Ashveil Reign

Faction is fixed per champion at authoring time. Mechanics deferred.

---

## 3. Factions

### 3.1 Azure Crown

**Status:** locked as a name and standard.

**What it is.** A faction from **its own world**. Not a new power — an
established power in the world it comes from.

**Standard:** blue, with a gold crown. *(gold confirmed 2026-10-10)*

**Relationship to Sanguine Dominion.** Natural contact between the two is
impossible — they are factions from separate worlds. They meet only when the
broken loom connects their warriors. Where contact happens, skirmishes
happen. Their conflict is **limited and relatively new** — limited because
contact is rare, new because it only exists where the loom has connected
them.

Open questions:
1. What is the world Azure Crown comes from — its character, its magic, its
   people?
2. What is "Azure" — a place, a heraldic color, a symbol, a lineage?
3. Primary champion register — knights, scholars, zealots, something else?

### 3.2 Sanguine Dominion

**Status:** locked as a name and standard.

**What it is.** A faction from **its own world**. Not a new power — an
established power in the world it comes from.

**Standard:** black, with a red hexagon inside.

**On the name.** "Sanguine" here means **blood — they are alive**. It does
not mean evil, malicious, or dark. The name is about vitality and life, not
about menace. The black-and-red standard is not a signal of evil either; it
is their heraldry.

**Relationship to Azure Crown.** See 3.1. They meet only through the broken
loom.

Open questions:
1. What is the world Sanguine Dominion comes from?
2. What is "Sanguine" in their own understanding — blood as lineage, blood as
   life, blood as bond?
3. How is their culture distinct from Azure Crown, given both are established
   powers from their own worlds?
4. Does the red hexagon carry specific meaning for them?

### 3.3 Court of Root

**Status:** locked.

**Standard:** green, with a brown claw. *(decided 2026-10-10)*

**What it is.** The faction for everything with no crown, no dominion, no
reign: semi-wild primitive tribes, animals, and very intelligent feral
entities. Its defining trait is the *absence* of shared rule — shared nature,
no shared hierarchy. Internally conflicted; they fight each other as readily
as outsiders. Also defined by hiddenness — things that naturally hide in
jungle or forest.

**Recast under the premise.** Court of Root are not hiding from a war. They
retreated into the wild when the loom broke, and have been there since.
Their incoherence is a consequence of the break — coherence was something the
loom provided. Their territory may be *less* broken or *differently* broken
than the rest of the world.

**Name rationale.** "Court" is ambiguous between a royal court (hierarchy)
and a courtyard (a place of gathering). The faction takes the second sense: a
gathering-place, not a seat of rule. "Root" carries hiddenness, depth, and
forest without saying any of those words. No color, no thorns, no `-kin` /
`-folk` postfix.

**Roster scope.** Wider than "beast-people." Includes tribal peoples, pack
animals, and solitary feral intelligences. The constraint on membership is
"not part of a hierarchy," not "is an animal-person."

**Names considered and passed.** Beastfolk, The Untamed, The Unsworn,
Kinless, Clanless, Tribeless, Wildfolk, Wilding, Elderwild, Deeproot,
Underroot, Root Court, House of Root, Seat of Root, Circle of Root, Throne of
Root, March of Root, Hold of Root.

Open questions:
1. Empty-throne flavor or courtyard flavor? The name supports both.
2. Internal conflict background flavor or mechanical identity?
3. What hides here — tribes, beasts, feral intelligences, or all three?
4. Does Court of Root *want* the loom fixed? They retreated because it broke;
   they may not want it repaired.
5. Does Court of Root come from its own world, like Azure Crown and Sanguine
   Dominion do, or is it native to the broken realm?

### 3.4 Ashveil Reign

**Status:** locked.

**Standard:** dark grey (about 80%, not black), with one white bone laid
horizontally. *(decided 2026-10-10)*

**What it is.** An occult power — undead, demonic, or both — framed as a
ruling power rather than a cult. Register is heraldic, same as Azure Crown
and Sanguine Dominion.

**Recast under the premise.** May be connected to *why* the loom broke, or to
what came through when it did. To be designed.

**Name rationale.** "Reign" puts the faction on the same footing as Crown and
Dominion — ruling nouns, one set. "Ashveil" gives it a distinctive seat
without being a plain hue.

**Names considered and passed.** Ashveiled Cult — framed the faction as an
occult order rather than a power. Rejected because all four factions are now
ruling powers. Also considered: The Ashen Choir, Hollow Choir, Pale
Communion, Obsidian Veil, The Ossuary.

Open questions:
1. Primarily undead, primarily demonic, or both?
2. What is "Ashveil" — a place, a throne, a substance, a veiling ritual?
3. Does the faction have a leader figure, or is it leaderless?
4. Relationship to the loom's breaking — cause, consequence, or neither?
5. Does Ashveil Reign come from its own world, or is it a product of the
   broken realm?

### 3.5 Naming register note

Three of four factions happen to follow a `[qualifier] + [ruling noun]`
shape: Azure Crown, Sanguine Dominion, Ashveil Reign. Court of Root breaks
the pattern — it uses "of" and its head noun is a gathering-place, not a seat
of rule. The break is deliberate: the faction is defined by the absence of
rule, and its name reflects that.

The pattern is not a rule to be applied to future factions.

### 3.6 Standards

| Faction | Standard |
|---|---|
| Azure Crown | Blue, with a gold crown |
| Sanguine Dominion | Black, with a red hexagon inside |
| Court of Root | Green, with a brown claw |
| Ashveil Reign | Dark grey (about 80%), with one horizontal white bone |

*Updated 2026-10-10: Jakub confirmed the gold of the Azure Crown's crown and
set the standards of the Court of Root and the Ashveil Reign (they were "not
yet designed" in the first export).*

---

## 4. Starter champions (locked)

The core of the starters as first decided. Section 8 is the full record:
names, looks, kits, what each teaches, and the pair.

### 4.1 Starter — male warrior

| Field | Value |
|---|---|
| Rarity | Elite |
| Role | Damage |
| Faction | Azure Crown |
| Affinity | Ember |
| Joins | From the start |

His job is to teach the player how damage works.

### 4.2 Second — female support

| Field | Value |
|---|---|
| Rarity | Elite |
| Role | Support |
| Faction | Sanguine Dominion |
| Affinity | Tide |
| Joins | After the first battle |

Her job is to teach the player that statuses exist. *(2026-10-10: section 8
replaced "sustain" with this.)*

### 4.3 The pair

The deliberate faction / affinity mismatch, the structural subtext (Ember
loses to Tide) and the pair under the premise are recorded in section 8, The
Pair. *(2026-10-11: moved there, as the two copies repeated each other.)*

### 4.4 Settled since

- Names, looks and kits: section 8 (2026-10-10), Captain Gareth and the Rime
  Scholar.
- Both are **fragments** recollected by the Archivist. Gareth is with the
  Archivist from the start; the Rime Scholar joins after the first battle
  (section 8). This answers whether champions are fragments or already whole,
  and whether the starter is found in Zone 1.
- Still open: their backstories, and why she joins (5.3, question 3).

---

## 5. Campaign — working notes (not locked)

### 5.1 Structure

- Campaign is a **horizontally scrollable linear** sequence of biomes/areas.
- Each area has several stages (target ~10; not fixed).
- Structure: **Zone 1 is a full 10-stage zone**, not a short prologue.
- After Zone 1, the player continues elsewhere.

### 5.2 The world

The land is a **broken, random realm**. The loom broke reality across
dimensions, space, and time, so geography does not follow natural rules.
**Floating islands** are a native expression of the premise.

Randomness applies to *content* (what each island is broken by / contains),
not to *structure*. Each island shares a grammar:
- It is broken in its own way.
- It holds a fragment, or a clue to one.
- It has a faction presence, or a remnant of one.
- The Archivist has a reason to be there.

### 5.3 Zone 1 — working sketch

**Setting:** a dim island. Small settlement — a village, ruin, outpost, or
camp.

**What actually happened.** The broken loom has **connected warriors from
two worlds** — Azure Crown and Sanguine Dominion — in this place. They would
never meet naturally. They are meeting here because reality is broken. The
skirmish in Zone 1 is a **consequence of the loom's dimensional breaks**, not
of a war between neighbors.

**The "expected attack."** Something triggered the skirmish. Possibilities
include a false flag, counter-intelligence, a rebellion, or a drunken
accident. The campaign does not have to answer which. The ambiguity is
deliberate.

**Arc (rough, ~10 stages):**
- Stages 1–2: contact. Azure Crown and Sanguine Dominion warriors meet where
  they should not be able to. First battle. The second champion joins.
- Stages 3–5: the settlement and its surroundings. The pair together for the
  first time.
- Stages 6–8: escalation. The presence of both factions in one place draws
  more through, or triggers a larger engagement.
- Stage 9: turning point.
- Stage 10: leaving. Transition to Zone 2.

**Open questions:**
1. Is the starter fragment already with the Archivist, or is Zone 1 where
   they find him? *(Answered 2026-10-10, section 8: he is with the Archivist
   from the start.)*
2. Is the Archivist present as a character in the scene, or only as a
   celestial presence guiding the fragments?
3. Why does the second champion join? Both are fragments; the pair is
   impossible; the reason they stay together may be the Archivist's doing,
   or something else.
4. Does the "expected attack" thread pay off later, or stay unresolved?
5. When the two worlds touch in Zone 1, do the factions *know* they are
   touching, or is the contact disorienting and unexplained to them?
6. Does the Archivist know what broke the loom, or is that the mystery?
7. Is the rift in Zone 1's sky (5.3a) the rift in the west of the map (5.4a)?
   Zone 1's node is the first on the road that starts at it. *(Asked
   2026-10-11.)*
8. Zone 1's name. *(Answered 2026-10-11: the **Fracture Reach**.)*

### 5.3a Zone 1's battle background (decided 2026-10-11)

Jakub's brief for the redesign, in his words where possible:

- Less symmetrical, "something more broken".
- A cartwheel on the right side.
- Maybe some field, and something burning, on the left side.
- The floating islands bulkier and less flat.
- In the background, a big rift in the cosmos that lights in blue and white
  sparks, with cosmic fabrics waving from the rift around it; some animation.
- Autumn on the ground; the light of dawn.
- "Be creative."

**As built** (2026-10-11; Jakub: "i like how it looks now in game"): the
morning after a raid on the island's farm. On the left, a stubble field with
its sheaves behind a broken fence, a haystack burning, its smoke leaning east,
scorched ground, and the Azure Crown's standard torn and leaning. On the
right, what is left of a dry-stone wall with autumn ivy, an autumn tree, a hay
cart tipped over with a wheel off and pumpkins spilled, and the Sanguine
Dominion's standard snapped across it. Between them the road runs past arrows
in the ground to a farm burnt in the night. In the sky, the dawn sun between
lilac peaks, bulky floating islands that slowly bob, and the rift: a tear of
deep space with white-hot lips that pulses and sheds sparks, three veils of
star-threaded cosmic fabric waving out of it. Leaves tumble across the arena.

### 5.4 Zone 2 — working sketch

*(2026-10-11: the area is the **Verdant Grove**. It is not about an arena:
its battles only take place in something that looks like one. Its art waits
for Jakub.)*

**Setting:** a **mystic arena in a deep forest**, inside Court of Root
territory.

**Why an arena.** It implies contest — a place where something is still
being decided by combat. It gives Court of Root a **practice** and a culture,
not just hostility. It fits the Archivist premise: an arena is where
fragments of champions would be known to be.

**Possible nature of the arena:**
- Where fragments are tested or awakened.
- Where Court of Root decide things — leadership, disputes, worthiness.
- A place where the broken loom's effects are visible, or where magic still
  works.
- A trial the Archivist must pass.

**Arc (rough):**
- Approach: traveling through forest. Court of Root as presence, not just
  enemies.
- Arrival: meeting Court of Root. They have rules.
- The contest: fighting in the arena. Bulk of stages.
- Outcome: winning, losing, being judged. Second fragment or story beat.
- Departure: leaving with what was gained, or not leaving freely.

**Open questions:**
1. Why does the Archivist go to the arena — fragment, person, answer, trial?
2. How do Court of Root feel about the Archivist — hostile, indifferent,
   testing, curious?
3. Who runs the arena, given Court of Root has no shared hierarchy? Is this
   the one place they come together?
4. Does the arena change the Archivist's goal, or just provide the next step?
5. Does Court of Root want the loom fixed?

### 5.4a Map and campaign nodes (decided 2026-10-10)

- The world map is the edge of a continent: a band of land running west to
  east; north and south of it there is nothing to see, only its edges.
  *(Changed 2026-10-11: no edges, the land fills the map; below.)*
- In the west, a rift.
- Going east, the land turns to jungle.
- Stages are not dots on the map: each area is one campaign node, and its
  stages open from it (a popup). A second node stands in the jungle.
- Stages are not named.

**Redrawn (2026-10-11)**, Jakub's brief:

- Zone 1 and Zone 2 closer together.
- No map edge at the top or the bottom: every pixel is map.
- In the west a rift, reworked, and not vertical; the details of the west
  part reworked, then the village.
- The forest much closer, worked in even at some points near the edges.
- Zone 2 is not about an arena (5.4), and its artwork is not made yet.
- The map will be extended to the east, area by area; for now it need not be
  very wide. Horizontally scrollable.
- Fantasy, very big detail.

**As built** (2026-10-11; Jakub: "i love it"): the land fills the map in
autumn, with forest along both edges. In the west a rift torn diagonally from
the west edge to the south edge onto the cosmos, pieces of land floating in
it, dark cracks fanning out from it, and beyond it the broken land with an
old watchtower and the old road ending at a broken bridge. East of it the
Fracture Reach: the village (cottages, a chapel, a windmill, a well, a farm
burnt in the night, a haystack burning) in its fields, the standards of the
two worlds by the road. Then the river under a stone bridge and the forest,
autumn turning green, around the Verdant Grove's glade. The map is 960 pixels
wide and grows east area by area.

### 5.5 Visual throughline

Zone 1 and Zone 2 should contrast clearly so the horizontal scroll reads as
"arriving somewhere new":
- Zone 1: open sky, dim island, small settlement, contact between worlds,
  recent and disorienting. *(As built: a farm at dawn in autumn, under the
  rift, 5.3a.)*
- Zone 2: enclosed forest, ancient ritual, deliberately apart from the world.

---

## 6. Cross-cutting

**Four independent axes.** Affinity, rarity, role, and faction are
orthogonal. No coupling is implied between any of them. The starter pair
demonstrates this deliberately (blue standard with fire affinity, black-and-
red standard with water affinity).

If a signature-affinity-per-faction idea is wanted later, that is a new
decision, not an amendment to this one.

**Worlds.** Azure Crown and Sanguine Dominion are factions from **separate
worlds**. Contact between them exists only through the broken loom. This is
true for other faction pairings unless later decided otherwise — Court of
Root and Ashveil Reign may or may not come from their own worlds; see their
open questions.

---

## 7. Explicitly not decided

- Affinity mechanics (multipliers, what they affect, visibility) *(the game
  stands in ±20% damage)*
- Rarity gating (stats, kits, ascension, recruit pools) *(the game stands in a
  stat budget per rarity)*
- Role mechanics (whether roles change battle rules, AI, or nothing) *(a
  Tank draws no fire today: enemies hit whoever is lowest on HP; MDA T20)*
- Faction mechanics (synergies, team-building constraints, UI filtering)
- Champion schema (what fields a champion has beyond the enums) *(partly
  decided 2026-10-11: no subtitle, eight stats; section 10)*
- Kit / skill design *(the starter pair's kits decided 2026-10-10, section 8,
  the Skirmisher's and the Lineholder's 2026-10-11, sections 12 and 13, and
  the Quartermaster's 2026-10-12, section 14; their numbers are not)*
- Art pipeline specification
- Save and progression *(gear decided: the Weaver Matrix, section 9; levels,
  ranks, ascension and skill upgrades are not)*
- Where spools and materials come from
- How far Resistance must exceed Accuracy to resist a debuff *(the game
  stands in a curve, section 10)*
- Zone 1's enemies *(the game stands in copies of the two starters)*
- Balance, the stage that brings each champion and every stage's enemies:
  Jakub, 2026-10-12, "regarding balancing and where is what spawned and what
  is composition of each stage, i will dictate these later" *(the game's
  stage powers, recruiting stages and enemies are stand-ins)*
- Where crit is taught, at or before the point Cold Rebuke first fires
  meaningfully (section 8, the Rime Scholar's notes)
- Team size *(the game uses 3)* and how champions are acquired *(one recruit
  per first clear)*
- Campaign count of zones
- Whether the Archivist appears as a character or as a presence
- The relationship of Ashveil Reign to the loom's breaking
- Whether Court of Root wants the loom repaired
- Whether Court of Root and Ashveil Reign come from their own worlds

Decided since the first export: the names of the starter pair, and that
champions are fragments, the first one with the Archivist from the start
(section 8); the zone names, the Fracture Reach and the Verdant Grove (5.3,
5.4); that the interface keeps its affinity marks and the cuts made before
the affinity rule are plain (2.1).

---

## 8. Starter Heroes (received 2026-10-10)

Jakub's record, verbatim (headings one level down).

### Starter Heroes

The two champions the player begins the game with.

Both are **Elite** rarity. Both are fragments recollected by the Archivist.
Both come from worlds that would never naturally meet — the broken loom is
the only reason they can be in the same place.

---

### Captain Gareth

| | |
|---|---|
| Rarity | Elite |
| Role | Damage |
| Faction | Azure Crown |
| Affinity | Ember |
| Joins | From the start |

#### Character

An Azure Crown captain. His faction comes from its own world; he would never
naturally meet anyone from Sanguine Dominion. He is a fragment now — the
Archivist reassembles him, but he remembers being Captain Gareth.

His job in the game is to **teach the player how damage works**.

#### Appearance

**Weapon.** A straight single-handed sword. Functional, worn at the grip, no
ornament. No glow or fire effect on the weapon itself — his Ember affinity is
expressed in what he does with the sword, not in the sword. *(2026-10-11:
affinity is abstract and sets nothing in the art, 2.1; 2026-10-12: his cuts
made plain.)*

**Wearing.** Mid-weight military armor: breastplate, pauldrons, greaves, in
dull steel and worn leather. A tabard or coat underneath in deep amber-brown.
A short, faded cloak. A captain's insignia on the pauldron or chest, small
and worn.

**Colors.** Steel, worn leather, deep amber-brown, small amounts of darkened
gold. Warm, weathered, functional.

**Heraldry note.** He does not wear Azure Crown's standard colors. He serves
a faction with a blue-and-crown standard, but his armor is field armor, not
parade dress. Faction standards are heraldry — banners, sigils — and
champions in the field are not walking banners.

#### Skills

**A1 — Line Cut**
Single-target basic attack.

**A2 — Iron Blow**
Single-target heavy strike. On hit, Gareth gains **Attack Up** on himself for
2 turns. The buff is applied *after* the hit, so Iron Blow's own damage is not
boosted by the buff it grants.

**A3 — Wide Sweep**
AoE hit on all enemies. Deals damage only; no rider, no secondary effect.

**Passive — none.**

#### What Gareth teaches

- **A1** — attacking exists.
- **A2** — skills hit harder than basics, and skills can change your future
  turns (the buff).
- **A3** — skills have shapes, not just sizes. AoE is different from
  single-target, not just bigger.

#### Notes

- **No crit gate on Iron Blow's buff.** The buff is unconditional. Crit is
  deliberately not introduced on this champion.
- **No faction word in any skill name.** His skills never say "Azure," and
  never say "Ember." Faction is his identity; affinity is expressed in
  visuals, not names.

---

### Rime Scholar

| | |
|---|---|
| Rarity | Elite |
| Role | Support |
| Faction | Sanguine Dominion |
| Affinity | Tide |
| Joins | After the first battle |

#### Character

A Sanguine Dominion ice mage. Her world's name means **blood = life**; she is
not evil-coded, and neither is her faction. Black-and-red is heraldry, not
menace.

She is a fragment, like Gareth. She and Gareth come from worlds that would
never naturally meet. Their being together is only possible because the
broken loom has connected them.

Her job in the game is to **teach the player that statuses exist** — and that
Support can mean "deny the enemy" rather than "heal."

#### Appearance

**Weapon.** A censer, with small ice flakes flowing around it. She does not
swing it in combat; it is a focus. Her basic attack (Pale Strike) is a short
close motion, almost incidental.

**Wearing.** Long blonde hair, normal skin tone — not pale. A dark green
dress with a blue circle on the back.

**Silhouette.** Tall and still. She reads as *cold*, and cold is motionless.
When she moves, it is deliberate.

**Heraldry note.** She does not wear Sanguine Dominion's standard colors. The
dark green dress is not faction dress; the blue circle is not a faction mark.

#### Skills

**A1 — Pale Strike**
A plain single-target attack. No rider, no status, no secondary effect.

**A2 — Rimebind**
An AoE attack that applies **Slow** to all enemies, with small damage. The
slow is the payload; the damage is incidental.

**Passive — Cold Rebuke**
While Rime Scholar is below 35% HP, an enemy that lands a **critical hit** on
her is **Frozen** for 1 turn. The passive has a cooldown.

#### What Rime Scholar teaches

- **A1** — attacking exists (reinforced, no new mechanic).
- **A2** — statuses exist, and a Support can affect every enemy at once.
- **Passive** — statuses can be reactive: things can happen *in response* to
  being hurt.

- **Affinity has nothing to do with in-world symbols.** The blue circle on
  her back is not an affinity marker and not a faction mark. It is a detail
  of her dress.
- **Cold Rebuke depends on crit existing.** Crit is load-bearing for her
  passive. Wherever crit is taught in the game, it should come at or before
  the point Cold Rebuke first fires meaningfully.

---

### The Pair

#### Deliberate faction / affinity mismatch

| Champion | Faction | Affinity |
|---|---|---|
| Captain Gareth | Azure Crown | **Ember** (fire) |
| Rime Scholar | Sanguine Dominion | **Tide** (water) |

The mismatch is **intentional**. Players who assume "Azure Crown = Tide" or
"Sanguine Dominion = Ember" are meant to be wrong. Faction and affinity are
orthogonal axes, and the starter pair demonstrates this from the first two
champions.

#### Structural subtext

Ember loses to Tide. Gareth and Rime Scholar are therefore **structural
counters**: if they ever fought, she would win. They travel together from the
first zone onward. This is subtext, not mechanics.

#### Under the premise

They come from **different worlds**. Under the broken loom, they would never
have met naturally. They are in the same place only because reality is
broken. This is structural to who they are, not incidental backstory.

---

## 9. Weaver Matrix (gear)

Champions grow through gear: every champion has a Weaver Matrix of six slots
that hold Thread Spools. The full rules, with the stand-in numbers, are in
[MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 14.

### 9.1 Outline (approved 2026-10-08)

- Six slots, each with a stat node: fixed (one stat) or variable (one stat
  from a list).
- Two triangles: slots 1, 3 and 5 fixed (ATK, DEF, HP); slots 2, 4 and 6
  choice slots (SPD or a %, CRIT or a %, a %). *(Names and what each takes
  set in 9.3.)*
- Thread Spools fill the slots. Weave Patterns are 2- and 4-piece sets,
  counted wherever their spools sit; a 2-piece pattern can be woven up to
  three times.

### 9.2 Spools (approved 2026-10-10)

- A spool has a grade (Ashen, Silver, Gilded), one main stat whose value the
  grade sets, and strands: additional stats, one per grade step, rolled once,
  never repeating a stat.
- SPD strands add at most +4 to a matrix.
- Attunement: each fixed slot attunes the two choice slots beside it; a strand
  there whose stat matches the fixed slot gains +1.
- The MATRIX tab on the champion page. Jakub: "this looks like a good gear
  system". The combat rules approved with it are in section 10.

### 9.3 Slots and Weave Patterns (received 2026-10-11)

Jakub's record, verbatim. The names of the Weaver Matrix slots:

```csharp
        Zenith       = 1, // Fixed Flat ATK
        EastMeridian = 2, // Variable SPD / Base Stats
        EastHorizon  = 3, // Fixed Flat DEF
        Nadir        = 4, // Variable C.RATE / C.DMG / Base Stats
        WestHorizon  = 5, // Fixed Flat HP
        WestMeridian = 6  // Variable ACC / RES / Base Stats
```

The real Weave Pattern sets, replacing every placeholder pattern:

```csharp
    public static class CoreWeavePatterns
    {
        public static readonly WeavePattern Pulse       = new("pattern_pulse", "Pulse", StatType.Speed, 0.12f, 2);
        public static readonly WeavePattern Sunder      = new("pattern_sunder", "Sunder", StatType.Attack, 0.15f, 2);
        public static readonly WeavePattern Ward        = new("pattern_ward", "Ward", StatType.Defense, 0.15f, 2);
        public static readonly WeavePattern Vigor       = new("pattern_vigor", "Vigor", StatType.Health, 0.15f, 2);
        public static readonly WeavePattern Needle      = new("pattern_needle", "Needle", StatType.CritRate, 0.12f, 2);
        public static readonly WeavePattern Apex        = new("pattern_apex", "Apex", StatType.CritDamage, 0.20f, 2);
        public static readonly WeavePattern Focus       = new("pattern_focus", "Focus", StatType.Accuracy, 20f, 2);
        public static readonly WeavePattern Tranquility = new("pattern_tranquility", "Tranquility", StatType.Resistance, 20f, 2);
    }
}
```

How the game reads the values, and what the record leaves open, are in
[MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 14: stand-ins until Jakub confirms
them.

---

## 10. Combat rules and champion stats

- **Defense divides damage** (approved 2026-10-10 with the gear system,
  option A, "100%"): damage taken is multiplied by 40 / DEF, so twice the DEF
  takes half the damage; DEF Up is +16% and DEF Down −12%. This brought DEF
  and CRIT level with ATK and HP.
- **Critical hits** deal 1 + C.DMG times the damage; every champion starts at
  C.DMG 100%, double damage (2026-10-10: double; 2026-10-11: C.DMG, from the
  Apex pattern).
- **Eight stats** (2026-10-11, the stats of the core Weave Patterns): HP,
  ATK, DEF, SPD, C.RATE, C.DMG, ACC, RES.
- **Accuracy and Resistance** (2026-10-11), Jakub's words: "ACC and RES works
  for detrimental effects. If you want to place debuff on enemy, your acc is
  compared against enemy res." How far RES must exceed ACC to resist is a
  stand-in ([MECHANICS_GUIDE.md](MECHANICS_GUIDE.md) 7).
- **No subtitles** (2026-10-11): champions carry no title anywhere in the
  game. Jakub: "i actually dont like these subtitles at all".

---

## 11. Name, direction and lexicon (approved 2026-10-08)

- **Name:** The Loom: Reliquary of Legends (code name TLROL). "Reliquary of
  Legends" is the subtitle; heroes stay *champions*, and recruiting stays
  *recruit*.
- **Direction:** high fantasy with a gothic arcane look. No science fiction,
  and no literal yarn or craft look: the loom's threads, spools and patterns
  are arcane relics, never sewing things.
- **Logo:** a gothic rose window (six jewelled lobes, as the Weaver Matrix
  holds six spools) before THE LOOM in cast gold, with RELIQUARY OF LEGENDS
  beneath.
- **Lexicon:** the Master Archivist (the player), the Reliquary (the vault of
  everything the Archivist holds), a Hero Soul File (one champion's record),
  the Weaver Matrix (a champion's gear), a Thread Spool (one piece of gear), a
  Weave Pattern (a set bonus). The Spindle of Fate is a placeholder name with
  no meaning yet.

---

## 12. The Skirmisher (received 2026-10-11)

Jakub's brief, verbatim:

```
create one new common champion for azure crown.
name Skirmisher. can have conditioned double hit on A1 and maybe simple A2?
damage type. affinity bloom.
art: light armored man with leather helmer and two short sword. leather is blue with azure insignia
```

and, the same day, settling the kit:

```
he must look weeker but he has no a2 only a1 with guaranteed double hit
```

| | |
|---|---|
| Rarity | Common |
| Role | Damage |
| Faction | Azure Crown |
| Affinity | Bloom |
| Kit | one skill: an A1 that always hits twice; no A2, no A3, no passive |
| Look | a light-armoured man, weaker-looking than the starters: a leather helmet, two short swords, blue leather with the Azure insignia |

What the game fills in (stand-ins, listed in CLAUDE.md): the skill's name
(Twin Cut), text and multipliers, the stats, the lore line, the stage that
brings him (the first clear of 1-5), and the details of his art.

## 13. The Lineholder (received 2026-10-11)

Jakub's brief, verbatim:

```
i want new common hero for azure crown.
rarity = common
name= Lineholder
affinity= tide
tank
A1 Guard Cut.
A2 buffs himself defense up for 2 turns. name of ability = Brace
design = big shield dark blue with two small crowns on it. he has mace dark iron with wooden handler.. helmet blue over his head maybe similar to skirmisher. dress dark with some blue strips.
design properly graphics
```

| | |
|---|---|
| Rarity | Common |
| Role | Tank |
| Faction | Azure Crown |
| Affinity | Tide |
| Kit | A1 Guard Cut; A2 Brace: DEF Up on himself for 2 turns (the brief names no A3 and no passive) |
| Look | a big dark-blue shield with two small crowns on it; a mace of dark iron with a wooden handle; a blue helmet over his head, maybe like the Skirmisher's; dark clothes with some blue stripes |

While he was being drawn Jakub set the affinity rule (2.1): his Tide sets
nothing in his look or his effects.

What the game fills in (stand-ins, listed in CLAUDE.md): Guard Cut's text and
multiplier (one blow, damage only), Brace's text and cooldown, the stats, the
lore line, the stage that brings him (the first clear of 1-7), and the
details of his art and effects.

## 14. The Quartermaster (received 2026-10-12)

Jakub's brief, verbatim (the message also carried the decisions recorded in
2.1 and 7):

```
for now i want new hero:
name = Quartermaster
this is support common champion of azure crown.
he wield walking stick. he has leather brown cloth with backpack with blue insignia on front.
his A1 is basic hit, not strong.
his A2 heals all allies by 15% of this champion max hp. and grants 15% turn meter to ally with lowest HP after heal.
```

and, the same day:

```
quartermaster affinity should be tide.
```

| | |
|---|---|
| Rarity | Common |
| Role | Support |
| Faction | Azure Crown |
| Affinity | Tide |
| Kit | A1 a basic hit, not strong; A2 heals all allies by 15% of his max HP, then grants 15% Turn Meter to the ally with the lowest HP after the heal (the brief names no A3 and no passive) |
| Look | a walking stick; brown leather clothes; a backpack; a blue insignia on the front |

What the game fills in (stand-ins, listed in CLAUDE.md): both skills' names
(Stick Rap, Field Rations) and texts, A1's multiplier (0.9, the floor of
the norms), A2's cooldown, the stats, the lore line, the stage that brings
him (the first clear of 1-9), and the details of his art and effects. Read
by the game: "lowest HP" is the lowest share of max HP; the Turn Meter goes
to an ally other than himself (his own meter resets as his turn ends); the
heal includes him; the insignia is on his chest.

