# Agent Note: The competition graph, and how clubs move between divisions

Status: proposed

> **Partially supersedes** [the calendar advances by Matchday, not by calendar date](../../implemented/architecture/2026-08-27-fixture-driven-calendar.md).
> That note's "Fixture generation and tie-breaks" section justifies unseeded fixture generation on the
> grounds that "there is no promotion, relegation, or qualification bracket to seed against — the
> League's 20 clubs are a fixed set". That premise no longer holds. The rest of that note — Matchday as
> the Calendar's unit, Transfer Window boundaries, and the League Table tie-break chain — is untouched
> here and is the subject of a separate open decision.

## Problem

Competition is defined in `CONTEXT.md` as anything a club can take part in — a League, a domestic cup,
a reserve competition, or a cross-border tournament — carrying dependency edges, and has no table
behind it. A save's world is one fixed 20-club League: `clubs` has no competition column, `season` is a
save-wide singleton, and `fixtures` hard-codes a 1–38 matchday range.

The MVP world is the one the League Selection Snapshot already promises: several Nations, their
pyramids, and dependency-closed competitions at three Simulation Depths. Promotion and relegation ship,
which the shipped domain model currently denies. Nothing yet says what a Competition is on disk, where
the structure joining Competitions lives, how a club's division membership is tracked across seasons,
or what happens at the boundary of the scope a player chose.

Two facts constrain any answer. The setup catalogue deliberately ships **parallel regional divisions at
one tier** (Spain, Brazil), with a standing instruction that structure must never be derived from tier
numbers. And **cups own no clubs** — `clubCount` is 0 and entrants are drawn from other loaded
competitions.

## Proposal

### The catalogue stays code; the save records the resolved world

`LEAGUE_SETUP_INDEX` in `packages/shared/src/leagueSetup.ts` remains the catalogue, versioned by its
`fingerprint`. Dependency edges (`requires`) are **not** persisted into a save. They are setup-time
input to closure resolution, and once the world exists the fact that a top division required its
national cup governs nothing a simulation reads.

The save gains a `competitions` table with one row per **activated** competition — the Effective
Selection's output, not the whole catalogue. Each row carries the canonical id (the catalogue's own id,
so the two join), a nation reference, kind, tier, Simulation Depth, and `club_count`. Competitions
resolved to `not_loaded` get no row. `generation_manifest` gains the catalogue fingerprint, so a save is
always traceable to the catalogue that shaped it.

The dividing line is whether a fact has meaning *after* generation. Dependency edges do not.
Promotion structure does — it is consulted at every season rollover for the life of the save — and is
therefore persisted, even though it originates in the same catalogue.

### Exchange Links, not promotion slots

Movement between divisions is persisted as `competition_links`: `(higher_competition_id,
lower_competition_id, slots)`, with `slots >= 1`. One row expresses promotion and relegation as the
same fact read in two directions.

A `promotion_slots` count on the competition row cannot work, because with parallel regional divisions
feeding one division above, there is no arithmetic on tier that identifies the destination. Two regional
feeders become two links of one slot each; the division above relegates two clubs, one into each region,
and the assignment is determined by the link rather than guessed.

Symmetry is the load-bearing property: because a single `slots` value governs both directions, no
rollover can change a league's size. That invariant is checked against `competitions.club_count`, which
is why the count is stored as an authoritative column rather than derived from participant rows —
counting participants against participants only proves last season equalled last season. `club_count` is
`NULL` for cups, whose entrant count is a function of their sources.

Asymmetric exchange ("three up, four down") is not expressible. It is a real feature of real football
that MVP does not need, and league-size stability is worth more than expressing it.

### The world is closed at the edge of the chosen scope

A link exists only when **both** endpoints are competitions loaded in this save. The lowest loaded
division never relegates; the highest never promotes.

The consequence is deliberate and visible: a player managing in the bottom division of a narrow scope
can never be relegated, which flattens a genuine part of the game. The mitigation is that League Scope
Options already exist — choosing the full pyramid is how a player buys the drop.

The alternative, letting clubs fall out of the loaded scope and generating replacements, requires a
club-generation path that runs mid-career. Nothing else in the schema does that, and it would break the
property that `world_seed` plus the generator and ruleset versions reproduce the world exactly.

### Cup entry is its own relation

`competition_entrants`: `(cup_competition_id, source_competition_id)` — the competitions whose clubs
enter a given cup. Persisted for the same reason Exchange Links are: it is read at every season start.

It is a separate table rather than a `kind` discriminator on `competition_links`, because an entry edge
has no slot count. Merging them would make `slots` nullable and meaningless for half the rows, which is
the shape that invites queries to forget the discriminator.

### Membership is participation, with no denormalized copy

A club's current competition is **not** a column on `clubs`. It is the club's participant row for the
current season, on the per-competition-per-season row that ticket 06 owns.

A `clubs.competition_id` maintained alongside participant rows puts one fact in two places, and the
rollover — the only moment membership changes — is precisely where they drift. A club's *generated
home* competition needs no storage either: it is the participant row for season 1, exactly and
permanently. Adding a provenance column that simulation is forbidden to trust repeats the weakest part
of `generation_manifest.generated_at` without its diagnostic justification.

If the join proves hot, a cached current-membership projection belongs in the read-model layer, which
keeps the authoritative copy singular.

### Promotion is top N, and the order that decided it is frozen

The clubs that go up are the top N of the final League Table, by the existing tie-break chain. There is
no promotion playoff in MVP.

League Table is a projection recomputed from resolved fixtures, and the next season's fixtures overwrite
its inputs. Promotion reads it at exactly one instant. At `SeasonConcluded` the rollover therefore writes
final positions into the per-competition-per-season row, freezing them as history rather than leaving
them derivable-in-principle from a table about to be replaced.

### Ticket boundaries this decision respects

`competitions` establishes that competition **identity is stable across seasons** and that per-season
state hangs off a separate per-competition-per-season row. It does not name or shape that row: ticket 06
generalizes `season` and `fixtures`, and that generalization is the same table. Simulation Depth is
written as a column here; what each value *implies* on disk is ticket 07's. The nation reference points
at ticket 03's nations table.

## Vocabulary

Three terms enter `CONTEXT.md`:

- **Exchange Link** — one pairing of a higher and a lower Competition, and the number of clubs that swap
  between them at the end of each Season.
- **Pyramid** — a Nation's Leagues, ordered by Tier and joined by Exchange Links.
- **Tier** — promoted from a parenthetical inside *League* to its own entry, now that it is load-bearing
  structure rather than a naming preference.

The **Season** entry loses only its false clause about promotion and relegation not existing. Its full
redefinition for a multi-competition world belongs to ticket 06; **Matchday**, **Calendar**, and
**Fixture** are untouched here.

## Alternatives considered

- **Persisting the whole catalogue, dependency edges included, into every save.** Rejected: it copies
  identical data into every save file and creates a migration burden for facts nothing reads after
  generation. The fingerprint on `generation_manifest` provides the traceability that motivated it.
- **`promotion_slots` and `relegation_slots` columns on `competitions`.** Rejected: they say how many but
  never where to, and parallel regional divisions make the destination underivable from tier.
- **Separate directed rows for promotion and relegation, with independent counts.** Rejected: it buys
  asymmetric exchange, which MVP does not need, and gives up the structural guarantee that a league
  cannot silently change size.
- **A porous world, generating replacement clubs as others fall out of scope.** Rejected: it requires
  mid-career club generation and destroys seed-based reproducibility, in exchange for a scenario a
  broader League Scope Option already covers.
- **A generalized `competition_edges` table with a `kind` discriminator.** Rejected: `slots` would be
  meaningless for entry edges, and a nullable column that half the rows ignore is a query hazard.
- **`clubs.competition_id` as the authoritative current membership.** Rejected: two homes for one fact,
  drifting at the rollover. Read models are the correct place for a query-shaped copy.
- **Promotion playoffs.** Not rejected — deferred. They are a knockout bracket seeded from league
  positions, which is ticket 06's cup machinery pointed at a league plus a calendar window ticket 01 has
  not settled. Recorded as fog rather than ruled out, because they are plausibly cheap once brackets
  exist.

## Acceptance criteria

- A save contains a `competitions` row for every competition in its Effective Selection and none for
  those resolved to `not_loaded`, each keyed by the catalogue's own canonical id.
- `generation_manifest` records the catalogue fingerprint the save was generated against.
- No table stores a dependency (`requires`) edge.
- Every `competition_links` row names two competitions that both have rows in this save.
- For every competition and every season, the participant count equals `competitions.club_count`.
- No column anywhere stores a club's current or generated-home competition; both are answered from
  participant rows.
- After a rollover, the previous season's final positions are readable from the per-competition-per-season
  row without recomputing from fixtures.
- `CONTEXT.md` defines Exchange Link, Pyramid, and Tier, and the Season entry no longer denies promotion
  and relegation.

## Risks

- **The closed world is a visible gameplay flattening.** A player in the bottom division of a two-division
  scope has nothing to fear. This is a knowing trade for reproducibility, and it lands hardest on exactly
  the narrow scope a new player is most likely to pick.
- **Symmetric Exchange Links cannot express real competition formats.** Any future pyramid needing
  asymmetric exchange, or a division that changes size between seasons, forces a schema change rather
  than a data change.
- **Membership through participant rows costs a join on hot paths.** No measurement backs the claim that
  this is affordable; if it is not, the fix is a read model, but the cost is not yet known.
- **The `competitions` / per-competition-per-season split is agreed at a boundary neither ticket owns
  fully.** If ticket 06 shapes the season row differently than assumed here, the membership and frozen-
  standings decisions both need revisiting.
- **Deferring playoffs to fog risks them never being specified**, leaving promotion permanently blunter
  than the reference games it draws from.
