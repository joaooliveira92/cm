# Agent Note: Scouting persistence — two tables, sparse progress, and a scoutable set defined by existence

Status: proposed

## Problem

Scouting is fully designed and entirely unbuilt: three proposed notes describe the resource model, the
accrual and Attribute Range formulas, and a technical contract, and no table exists. The MVP world data
model has to decide what scouting actually puts on disk, and two decisions taken since those notes were
written have moved the ground under them.

[Staff are two bound roles](../feature/2026-09-01-staff-entity-and-bindings.md) turned a Scout from a
fungible slot into a row with a stable id and a quality that sets its accrual rate, so
`AssignScout(player)` became `AssignScout(scout, player)` and the club's N slots became N rows.
[What each Simulation Depth stores](2026-09-01-simulation-depth-persistence.md) established that a
`results-only` club has no player rows at all, and that a club relegated into a results-only tier has
its existing player rows **deleted** — introducing, for the first time, a player who ceases to exist
mid-save.

That leaves open: what the assignment and progress tables are keyed on and which invariants are
structural rather than checked in application code; whether a progress row exists for every scoutable
player or only for players actually scouted; whether anything in a `results-only` competition can be
scouted when there is nothing to key a row to; what happens to progress when a scouted player is
deleted; whether progress follows the manager or the club across a career move; whether AI clubs carry
scouting state once the world spans multiple nations; and where Tactical Acumen's long-deferred
scouting binding lands.

## Proposal

Scouting persists **two tables and one new primitive**. Scouting Progress is the only value stored;
everything else scouting displays is derived from it.

### Assignments target a Player, never a Club

`CONTEXT.md` defined a Scouting Assignment as targeting "a Player or Club". No design ever gave the
Club half a meaning, and it does not ship: assignments target a Player only, and the glossary is
corrected in the same change.

A club has no fogged surface for scouting to reveal. Attribute Range is defined over Player
Attributes, Potential Ability, Injury Proneness, and Transfer Value; there is no hidden club-level
value — finances, youth setup, and facilities are all absent or unfogged — so a club assignment would
accrue progress against nothing readable. It would also consume one of the same N slots, making it a
strictly worse use of a scout than any player assignment.

Club-scouting returns only if a hidden club-level value ships that fog would be meaningful over.

### The scoutable set is exactly the players who have rows

A player in a `results-only` competition cannot be scouted, because no player row exists to key a
progress row to. This needs no depth branch anywhere in scouting: the search surface's data source
cannot return what is not in `players`, so the rule enforces itself.

Generating a squad on demand when a results-only player is scouted was rejected. It reintroduces per
club exactly the ~11 KB and ~25 inserts that `results-only` exists to avoid, and it contradicts that
tier's own ruling that its clubs have no persistent squads — a conjured player would be scouted, then
discarded and replaced by a different player on promotion.

The gameplay consequence is real and deliberate: **the human cannot sign from a `results-only` nation,
because nobody there is visible.** Simulation Depth is therefore not only a simulation-cost valve; it
is also the boundary of the transfer market the manager can see into.

### Deletion of a player deletes the scouting of that player

When a club is relegated into a `results-only` tier and its player rows are deleted, any
`scouting_progress` and `scouting_assignments` rows referencing those players are deleted with them,
and the scout's slot silently reopens.

Retaining the progress row so it survives a round trip was rejected: player identity does not survive
that round trip. A club returning from a results-only spell comes back with *different* players, so
retained progress would attach to a person who no longer exists.

A scout can therefore lose a target to a relegation the manager neither caused nor was warned about.
Surfacing that loss is an inbox concern rather than a shape on disk, and this decision does not build
one.

### `scouting_assignments`: keyed on the scout, so the cap is structural

```
scouting_assignments (
  scout_id  PRIMARY KEY  -> staff.id
  player_id UNIQUE       -> players.id
)
```

The primary key on `scout_id` gives each scout at most one assignment, and because the club has
exactly N scout rows, the N-slot cap ceases to be a rule that can be violated: it is the row count of
a table whose key is the scout. The earlier contract's live count of active assignments against
`scoutCountForTier(statureTier)` is gone, and with it the "already at cap" and "duplicate assignment"
error cases, which are no longer reachable states rather than errors that must be raised.

`club_id` is not a column. A scout's club is `staff.club_id`; duplicating it would be the same column
the competition-graph decision already refused to put on `clubs`.

`UNIQUE(player_id)` carries "at most one Scout on a player at a time". It is exactly right only
because scout rows exist for the human's clubs alone, and it stays right only under the rule below.

### Leaving a club discards its backroom and its scouting

When the manager leaves a club — sacked or otherwise — that club's `staff` rows, and every assignment
and progress row belonging to it, are deleted. Staff are materialised lazily for whichever club the
human manages, so without this rule a career accumulates the backrooms of every former club, and
`UNIQUE(player_id)` would wrongly forbid the new club from scouting a player the old one was watching.

This makes the discard consistent with how a relegated squad is discarded: state belonging to a
context the human has left does not linger.

### `scouting_progress`: sparse, and the club's rather than the manager's

```
scouting_progress (
  club_id, player_id  PRIMARY KEY   -> clubs.id, players.id
  progress            0..100
)
```

**A row exists only for a player who has actually been scouted.** Absence means Unscouted. No code
path ever writes a progress-0 row, and progress never returns to zero, since Attribute Range narrows
monotonically and never widens or resets — so a row's existence means "this club has investigated this
player at some point", and the table's row count is a meaningful measure of a manager's scouting
activity rather than a restatement of world size.

A dense table — one row per (human club, scoutable player) — was rejected on measured units. At ticket
04's ~450 bytes per row, a 400,000-player world would write ~180 MB of zeroes at save creation, plus
the generation time to produce them, to record the default state of every player the manager will
never look at. The realistic sparse population is the low hundreds of rows across a career.

Progress belongs to the **club**, not to the manager: a career move starts the new club Unscouted on
everyone, and combined with the discard rule above, the old club's rows are gone rather than orphaned.
This is what makes `club_id` load-bearing in the key rather than a constant, and it matches the
fiction — the observation was done by that club's scouts, who do not follow the manager. A manager
sacked mid-season loses every partially-scouted target.

### Progress is stored; the reason it is stored has changed

Scouting Progress remains a stored value, incremented at the existing per-matchday hook, but the
justification recorded in the [technical contract](2026-08-28-scouting-technical-contract.md) no longer
holds and must not be relied on again. That note argued from Matchday numbering resetting every season
with no stable time axis to diff a stored start point against. The Calendar becoming date-bearing
supplies exactly that axis, so the original argument is void.

Storage survives on different grounds. Scout quality now varies the accrual rate per assignment, and
progress pauses and resumes as scouts are reassigned. Deriving progress on read is therefore not a
subtraction of two points in time but a fold over the whole assignment history of that player — every
span, each at whichever scout's rate held it — which means replaying `ScoutAssigned`/`ScoutUnassigned`
events to serve an ordinary read. ADR-0007 treats the event log as non-authoritative for serving
reads, so that is the wrong shape regardless of what the calendar offers.

This is the one place in this map where the derived-on-read default loses, and it loses to variable
rate and pause/resume, not to a calendar quirk.

### Attribute Range is never stored

Progress is the only new persisted primitive. Attribute Range, the fogged Transfer Value range, and
every narrowed attribute bound are pure functions of Progress and the true stored value, and no table
serves any of them.

Storing a range would be a third copy of information already held twice, free to drift from both
sources. This extends the same rule that
[player ratings are derived projections](2026-08-29-player-ratings-are-derived-projections.md) applies
at the player level and that Results Strength applies at the club level. Which RPC surfaces expose the
range is a query-layer question handed off with the rest of that layer.

### AI clubs carry no scouting state, and that rule is now load-bearing

AI clubs never scout and always read full information. The staff decision already reinforced this from
the other side: only the human's clubs have scout rows, so there is no actor to hold an assignment.

What has changed is the cost of overturning it. Scouting for AI clubs means a progress table keyed on
(any club, any player) rather than (human club, scouted player), which is the quadratic row count both
the scale probe and the depth decision refused, plus per-matchday accrual across every club in the
world. The rule is no longer a "keep AI clubs dumb" convenience; it is what keeps scouting's row count
bounded by manager attention instead of world size.

### Tactical Acumen has no scouting binding in MVP

`CONTEXT.md` deferred Tactical Acumen's application to "the interpretation of scouting reports" to the
Scouting effort, with the constraint that it affect only information quality and never replace a
Scout's own evaluation capability. Scouting now ships, and the binding still does not land. The
glossary is updated so the deferral names a condition rather than an effort that has already arrived.

Scouting has two numeric terms. The accrual rate has an owner in scout quality. The noise band's
`maxWidth` is the only other, and Tactical Acumen scaling it would make the same scout produce
different fog for two different managers — which reads as the manager's own eyes rather than the
report's quality, and sits against the constraint the glossary itself imposes. A genuine binding needs
a third term for report *interpretation*, distinct from observation, and inventing one so a Pillar has
somewhere to live is backwards.

It returns if a scouting surface ships that distinguishes what a scout observed from what the manager
concludes from it.

### Event and index cost

The batched per-club `ScoutingProgressed` event per matchday stands. Under sparse progress and the
per-scout cap, each batch holds at most N entries, N being a single-digit scout count.

Scouting needs **no index beyond its primary keys**. Every read is either all progress for one club
(the `club_id` prefix of the progress key) or a point lookup joining onto a market player list (the
full key). This is stated as a claim for the schema-assembly ticket to verify rather than rediscover,
since that ticket owns the index list and the save currently has none.

## Relationship to the earlier scouting notes

This note **partially supersedes** the
[scouting technical contract](2026-08-28-scouting-technical-contract.md). Superseded: the
`(clubId, playerId)` assignment key, the app-level scout-count cap and its two error cases, and the
stored-progress justification. Still standing and not reopened here: the batched `ScoutingProgressed`
event at the matchday hook, discard-on-own-squad-join as a direct call at the transfer-completion
site, the command shapes, and the read-model and RPC surface.

The [Progress accrual & Attribute Range](../feature/2026-08-28-progress-accrual-and-attribute-range.md)
formulas are untouched; this note only confirms that none of their output is persisted. The
[Scout resource & assignment model](../feature/2026-08-28-scout-resource-and-assignment-model.md) was
already partially superseded by the staff decision, and this note supersedes one further clause: its
"target Player leaves the game entirely: not applicable — v1 has no retirement mechanic" no longer
holds, because relegation into `results-only` deletes players.

## Alternatives considered

- **Assignments target a Club as well as a Player**, per the glossary as written: rejected. No hidden
  club-level value exists for fog to narrow, so club progress would accrue against nothing readable,
  while consuming a slot that a player assignment uses productively.
- **Materialise a results-only squad on demand when scouted**: rejected. It pays back per club exactly
  the generation and storage cost that tier exists to avoid, and the conjured players are discarded on
  promotion, so the manager would scout someone who provably will not exist.
- **Retain progress for a player deleted by relegation**: rejected. Player identity does not survive a
  results-only round trip, so the retained row would describe a person the world no longer contains.
- **A dense `scouting_progress` row per scoutable player**: rejected on measured cost — ~180 MB of
  progress-0 rows at 400k players, recording a default that absence already expresses.
- **Progress belongs to the manager and follows them across clubs**: rejected. It contradicts the
  glossary's per-(Player, human club) definition, makes `club_id` in the key meaningless, and breaks
  the fiction that the observation was performed by staff who do not move with the manager.
- **Keep the app-level scout-count cap** with a `(club_id, player_id)` assignment key: rejected once
  scouts became rows. Keying on `scout_id` makes the cap unviolatable rather than checked, deleting
  two error cases instead of implementing them.
- **Retain a former club's staff and scouting rows** after the manager leaves: rejected. It
  accumulates dead backrooms across a career and forces `UNIQUE(player_id)` down to an application
  check, since two clubs could then hold assignments on one player.
- **Derive Progress on read** now that the Calendar is date-bearing: rejected, though its original
  objection is void. Variable per-scout accrual rates and pause/resume spans make the derivation a
  fold over assignment history, which would serve ordinary reads from the event log.
- **Store Attribute Range**: rejected. A pure function of two stored values, free to drift from both.
- **Tactical Acumen scales the noise band `maxWidth`**: rejected as the only non-double-booking option
  available, because it varies a scout's output by who employs them, against the glossary's own
  constraint that the Pillar must not replace the Scout's evaluation capability.

## Acceptance criteria

- Exactly two scouting tables exist: `scouting_assignments (scout_id PK, player_id UNIQUE)` and
  `scouting_progress (club_id, player_id) PK` with a `progress` integer constrained to 0..100.
- Neither table carries a redundant `club_id` on the assignment side; a scout's club is read through
  `staff.club_id`.
- No code path writes a `scouting_progress` row with `progress = 0`; a row's existence implies the
  player has been scouted.
- No scouting table is writable for a club that has never been human-managed.
- Deleting a player's rows deletes that player's assignment and progress rows; the scout's slot
  becomes free.
- The manager leaving a club deletes that club's staff, assignment, and progress rows.
- No player belonging to a `results-only` competition appears in any scoutable set, without a
  depth-dependent branch in scouting code.
- No table stores an Attribute Range, a narrowed attribute bound, or a fogged Transfer Value.
- Scouting adds no index beyond the two primary keys.

## Risks

- **Losing a target to relegation is invisible.** The assignment vanishes and the slot reopens with no
  surface telling the manager why. Until an inbox message exists, a scout appearing idle is
  indistinguishable from a bug.
- **A career move is a total scouting reset.** A manager sacked late in a season loses every
  partially-scouted target with no way to carry anything forward. This follows from the glossary's own
  definition, but it is the first thing to revisit if scouting feels punishing across a career.
- **`results-only` now hides a transfer market, not just a simulation.** The tier was justified purely
  on per-matchday simulation cost; this decision gives it a second, unbudgeted effect on what the
  manager can do. A world configured with many results-only nations silently shrinks the signable
  player pool, and nothing warns the player at setup.
- **Stored Progress can desync.** A missed or double-fired matchday hook leaves Progress disagreeing
  with elapsed time, recoverable only by replaying the event log. Inherited knowingly from the
  technical contract, and the variable accrual rate makes recomputation strictly harder than it was
  when the rate was flat.
- **`UNIQUE(player_id)` depends on a rule enforced elsewhere.** It is correct only while scout rows
  exist for a single current club. If a later effort ever lets the human hold two clubs, or retains a
  former club's backroom, that constraint silently becomes wrong rather than merely unnecessary.
