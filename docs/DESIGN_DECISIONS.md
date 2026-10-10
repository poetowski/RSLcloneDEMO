# Design Decisions — Export

Consolidated record of decisions made in design conversation.

Covers: enum design, faction naming, the game premise, and the current state
of campaign zone thinking. Campaign zones are **not locked** — they are
working notes.

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

Her job is to teach the player sustain.

### 4.3 Deliberate faction / affinity mismatch

Azure Crown (blue standard) is paired with **Ember** (fire).
Sanguine Dominion (black-and-red standard) is paired with **Tide** (water).

The mismatch is intentional. Players who assume "Azure Crown = Tide" or
"Sanguine Dominion = Ember" are meant to be wrong. Faction and affinity are
orthogonal axes and the assignment demonstrates that from the first two
champions.

### 4.4 Structural subtext

Ember loses to Tide. The starter and the second champion are therefore
structural counters: if they ever fought, she would win. They travel together
from the first zone onward. This is subtext, not mechanics.

### 4.5 The pair under the premise

The starter is Azure Crown; the second is Sanguine Dominion. Under the
premise, these two would **never naturally meet** — they come from different
worlds. They are together only because the broken loom has connected them,
and because both are now fragments being reconstructed by the Archivist.

Their pairing is not "two soldiers from two nations." It is **two people
from two realities, standing in the same impossible place.** This is
structural to who they are.

### 4.6 Open

- Both characters are deliberately **not locked** beyond the table above.
  Names, personalities, backstories, and the reason she joins are all open.
- Whether champions are *fragments recovered during the campaign* or already
  whole at the start is undecided. This affects whether the starter is
  collected in Zone 1 or is present from the beginning.

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
   they find him?
2. Is the Archivist present as a character in the scene, or only as a
   celestial presence guiding the fragments?
3. Why does the second champion join? Both are fragments; the pair is
   impossible; the reason they stay together may be the Archivist's doing,
   or something else.
4. Does the "expected attack" thread pay off later, or stay unresolved?
5. When the two worlds touch in Zone 1, do the factions *know* they are
   touching, or is the contact disorienting and unexplained to them?
6. Does the Archivist know what broke the loom, or is that the mystery?

### 5.4 Zone 2 — working sketch

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
- In the west, a rift.
- Going east, the land turns to jungle.
- Stages are not dots on the map: each area is one campaign node, and its
  stages open from it (a popup). A second node stands in the jungle.
- Stages are not named.

### 5.5 Visual throughline

Zone 1 and Zone 2 should contrast clearly so the horizontal scroll reads as
"arriving somewhere new":
- Zone 1: open sky, dim island, small settlement, contact between worlds,
  recent and disorienting.
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

- Affinity mechanics (multipliers, what they affect, visibility)
- Rarity gating (stats, kits, ascension, recruit pools)
- Role mechanics (whether roles change battle rules, AI, or nothing)
- Faction mechanics (synergies, team-building constraints, UI filtering)
- Champion schema (what fields a champion has beyond the enums)
- Kit / skill design
- Art pipeline specification
- Save and progression
- Campaign count of zones
- Names of the starter pair
- Whether champions are fragments collected during play or present from the
  start
- Whether the Archivist appears as a character or as a presence
- The relationship of Ashveil Reign to the loom's breaking
- Whether Court of Root wants the loom repaired
- Whether Court of Root and Ashveil Reign come from their own worlds
