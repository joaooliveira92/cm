# Agent Note: Season, fixture, and cup bracket generalization

Status: proposed

> Builds directly on [The Calendar becomes date-bearing](../../implemented/architecture/2026-09-02-date-bearing-calendar.md), which
> supplied the date a fixture carries and the rule that a date is a pure function of
> `(season number, competition, round)`, and on
> [The competition graph](2026-09-01-competition-graph-and-promotion.md), which required a
> per-competition-per-Season row and frozen final standings without naming their shape. This note
> names them, and revises that requirement: the row is the participant row, not a header above it.
>
> Partially supersedes the fixture-generation half of
> [The calendar advances by Matchday, not by calendar date](../../implemented/architecture/2026-08-27-fixture-driven-calendar.md):
> its "shuffled double round-robin, regenerated from scratch, no seeding by prior standings, because
> the League's 20 clubs are a fixed set" no longer describes a world with cups and pyramids. Its
> League Table tie-break rule still stands.

## Problem

`season` is a per-save singleton whose `current_matchday` is CHECKed to `0..38`, and `fixtures`
hard-codes a `1..38` round range and a home/away pair with a played flag. Neither survives multiple
concurrent competitions, and neither can express a knockout tie: a tie has participants that are not
known when the round is scheduled, and it must produce a winner where a league fixture may draw.

Charting settled that domestic cups ship as real knockout competitions with bracket progression, so
the scheduling tables have to carry both shapes. Ticket 02 additionally left two obligations here —
membership must be answered by participation rather than by a column on `clubs`, and final standings
must be frozen at `SeasonConcluded` rather than derived later, because promotion reads the League
Table at exactly one instant and the next Season's fixtures overwrite its inputs.

## Proposal

### The tables

The `season` singleton stays as the date-bearing calendar left it: `season_number`, `game_date`,
`phase`. It answers "which Season is the save in" and nothing about any individual competition.

One new table, `competition_participants`, keyed `(competition_id, season_number, club_id)`. It
answers every question ticket 02 raised: a club's **current** competition is its participant row for
the current Season, its **generated home** is its participant row for Season 1, and ticket 02's
invariant — participant count equals `competitions.club_count` — becomes a countable fact, checked for
leagues and skipped for cups, whose `club_count` is NULL because their field is a function of their
sources.

At `SeasonConcluded` the rollover **freezes the outcome onto the participant row**: `final_position`,
points, goal difference, goals for. A cup winner is the participant whose `final_position` is 1.

There is deliberately **no `competition_seasons` header table**. It was proposed and then dropped once
its contents were worked out: every field it would hold — the champion, the concluded flag, the
participant list — is derivable from its own children, and the existence of participant rows for
`(competition, season)` already records that the competition ran that Season. A header row whose every
column is a derivation of its children is a second source for facts that already have one.

The rollover order is: freeze final positions, apply each Exchange Link to produce the next Season's
participant rows, draw each cup's field from `competition_entrants`, then generate fixtures and their
dates.

### One fixtures table, league and cup alike

`fixtures` carries `competition_id`, `season_number`, `round`, `scheduled_date`, the home and away
club ids, goals, and a played flag — plus **nullable `home_penalties` and `away_penalties`**. NULL in
both means the tie did not go to a shootout, which is every league fixture and most cup ties.

There is no `cup_ties` table and no `winner_club_id`. Under single-leg ties a tie *is* a fixture, so a
tie table would hold one row per fixture row; and a winner column would store what goals plus
penalties already determine, giving one fact two sources that can disagree.

`fixtures.id` becomes an **integer** primary key. A canonical composite id would cost roughly 60 bytes
across the ~300k rows a 16,000-club world generates each Season, and would restate four columns that
are already columns. Ticket 03's canonical-id rule governs entities a content pack names; nothing
outside the save ever names a fixture. Generation order is deterministic, so integer ids reproduce,
and per the seeding rule below no seed keys on them — which is the only thing that would have made a
stable fixture id load-bearing.

### The bracket materialises as it resolves

A cup fixture row is created **when its participants are known**, not at Season start. Its date is
computed at that moment from the date-bearing calendar's template, which is a pure function of
`(season, competition, round)` — so the slot allocator reserves a round's date without a row existing
for it, and the round's date is the same whether it was computed in August or in March.

The rejected alternative was materialising the whole bracket at Season start with nullable club ids.
That would make `home_club_id` nullable for every row in the table, including the ~300k league
fixtures where it is never null — the shape that invites a query to forget the check. A separate
bracket-slot table with nullable participants feeding non-null fixtures was also rejected: it restates
what the fixture rows already encode.

### A drawn tie goes straight to penalties

**Single leg, no extra time, no replays, no two-legged ties.** A drawn cup tie is settled by a
shootout: a deterministic function of the match seed and the two squads, resolved outside the minute
loop and recorded as penalty scores on the fixture.

The match engine plays exactly two halves — `simulate.ts` loops `for (const half of [1, 2] as const)`
and emits `FullTimeWhistle` at minute 90 — and its condition and fatigue model is calibrated against
90 minutes. Extra time means halves 3 and 4 plus a recalibration of a model nothing else is asking to
change. Replays add fixtures on dates nobody reserved, and the calendar's slot allocator fails loudly
rather than double-booking. Two legs double a cup's fixture count and need aggregate and away-goal
rules.

**This is a visible fidelity gap.** MVP cups have no second legs, no replays, and no extra time,
against real competitions that have all three. It is accepted to keep the engine untouched.

### Determinism is a chain, not a table

Both seeds are hashes of canonical ids: the **draw** seed from `(world_seed, competition_id,
season_number, round)`, and each **match** seed from that plus the two club ids.

The same world seed therefore produces the same round-1 draw, the same results, and so the same
round-2 draw. Nothing about the bracket has to be stored to reproduce it. Seeding from a row id or an
insertion ordinal was rejected against ticket 10's rule that seeds key on canonical ids alone; storing
a seed column per fixture was rejected because it makes the seed a stored fact that can drift from the
inputs it was derived from.

### Byes, not preliminary rounds

A cup field that is not a power of two is padded with **byes in round 1**, assigned to clubs from the
highest-tier source competitions, ties broken by canonical id. Fields of 44 or 92 are normal, because
`competition_entrants` derives the field from whichever source competitions the save loaded.

Byes need no dates, and they mirror how real cups let top-flight clubs enter later. A preliminary
round would need dates reserved for a round that only some Seasons use. Constraining catalogue cups to
power-of-two fields was rejected on the same grounds the calendar rejected capping league sizes: it
puts a bracket limitation into world data, where nothing explains it.

### Simulation Depth changes how a fixture resolves, never whether it exists

Every loaded competition gets fixture rows, `results-only` included. Depth decides the resolution
path — the match engine for clubs with squads, a Results Strength collapse otherwise — and decides
nothing about the schema.

A `results-only` competition without fixtures would have nothing on the dates the calendar sweeps and
no table for promotion to read at the instant it needs one. It would also contradict ticket 13's
principle that Depth conditions what hangs beneath a club, never the world structure above it. The
cost is roughly 304k league fixtures a Season for a 16,000-club world, about 15 MB against ticket 04's
measured 335 MB.

### Past Seasons keep only what the human played

At rollover, past-Season fixtures are retained **only for competitions the human's club participated
in**, and every other competition's fixtures are deleted. The retained set is around fifty rows a
Season, defined by participation, so it needs no Depth check.

Retaining everything would cost ~15 MB a Season permanently and roughly double a twenty-Season save
on rows nothing reads. Deleting everything would make it impossible to show the human their own last
Season.

**What this gives up is unrecoverable**: a background competition's past results are gone, so no
screen can ever show a rival nation's history, and the frozen participant standings are all that
remains of it. Results cannot be regenerated after the fact, because the determinism chain reproduces
them only by replaying the Season forward from the world seed.

### Board Objective

One Board Objective per Season for the human's club, as today, with a **`competition_id` column added**
so the competition it judges is named rather than inferred. `final_position` reads the frozen
participant row.

A cup run is unjudged in MVP: an objective per competition would need a cup vocabulary ("reach the
quarter-final") that the Stature-Tier band table cannot express. Leaving the judged competition
implicit was rejected because it is true only while a club plays in exactly one competition, which is
precisely what this note ends.

## Glossary reconciliation

`CONTEXT.md`'s Season, Fixture, Matchday, and League Table entries were already corrected by the
date-bearing calendar. This change adds **Cup Tie**, **Bye**, and **Penalty Shootout**, extends
**Board Objective** to name the competition it judges, and records on **Simulation Depth** that it
governs how a fixture resolves rather than whether one exists.

## Alternatives considered

- **A `competition_seasons` header table.** Proposed while shaping the tables, dropped once its
  contents were enumerated: every column derives from its own children.
- **Participants as a serialised list on a header row.** Rejected: ticket 02's count invariant stops
  being queryable.
- **Membership as a column on `clubs`.** Already rejected by ticket 02; restated here because the
  participant table is what replaces it.
- **The whole bracket materialised at Season start with nullable club ids.** Rejected above.
- **A separate bracket-slot table.** Rejected above.
- **Extra time, replays, and two-legged ties.** Each rejected above, on engine, calendar, and scope
  grounds respectively.
- **A `winner_club_id` column, or a `cup_ties` table.** Rejected: one fact, two sources.
- **Canonical composite fixture ids.** Rejected on cost and redundancy.
- **A preliminary round instead of byes; power-of-two-only cup fields.** Rejected above.
- **No fixtures for `results-only` competitions.** Rejected above.
- **Retaining all past fixtures, or none.** Rejected above.
- **An objective per competition entered.** Rejected: no band vocabulary for a cup run.

## Acceptance criteria

- `competition_participants` exists keyed `(competition_id, season_number, club_id)` and carries the
  frozen `final_position`, points, goal difference, and goals for; no `competition_seasons` table
  exists.
- For every league competition and Season, participant count equals `competitions.club_count`.
- `fixtures` serves both kinds, carries `competition_id`, `round`, `scheduled_date`, and nullable
  penalty scores, and has no nullable club id and no round upper bound.
- A cup fixture exists only once both participants are known, and its `scheduled_date` matches what
  the template yields for its round.
- Two saves from the same world seed produce identical bracket draws through every round.
- A cup field of 44 produces a valid bracket, with byes held by clubs from the highest-tier sources.
- A `results-only` competition has a full fixture list and a populated final standing.
- After a rollover, fixtures survive only for competitions the human's club played in.
- `board_objective` names its competition and reads `final_position` from the frozen participant row.

## Risks

- **Cup fidelity is visibly thin.** No extra time, no replays, no two legs. Anyone who knows the
  competitions being modelled will notice immediately.
- **Background history is destroyed at rollover, irreversibly.** If a later feature wants a rival
  nation's past results, they cannot be recovered from a save — only by replaying from the world seed.
- **The determinism chain is fragile in a way a stored bracket would not be.** Any change to the match
  engine, the collapse function, or the draw hash changes every round after the first. That is already
  true of the world seed, but the bracket makes it compound within a single Season.
- **Freezing onto the participant row leaves no place to record a competition that ran and was
  abandoned.** A Season whose fixtures exist but never concluded is indistinguishable from one that
  concluded with all positions unset.
- **Shootouts are resolved outside the minute loop**, so they produce no match events. A shootout is
  invisible in the timeline read model, which shows a drawn 90 minutes and a winner from elsewhere.
