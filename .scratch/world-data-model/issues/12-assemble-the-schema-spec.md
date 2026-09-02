# 12 - Assemble the MVP world schema spec

Type: task
Status: open
Blocked by: 01, 02, 03, 05, 06, 07, 08, 09, 10, 11

## Question

The destination. With every decision above resolved, write the spec the effort exists to produce:

- The complete table list for an MVP save, each with what it is authoritative for, its columns, its
  invariants (including the `CHECK` constraints that encode domain rules, per the existing schema's
  convention), and its relationships.
- Which tables are authoritative state, which are read models projected from events, and which are
  derived-on-read and deliberately absent.
- The row-count budget per table at a representative world size, in ticket 04's measured units
  (~450 bytes/player, ~2.4 KB/club, linear to 400k players).
- **The index list.** Ticket 04 found the save currently has zero indexes and that one on
  `players(club_id)` is worth 140x on the squad view. The spec names every index, what query justifies
  it, and its byte cost — an unindexed table in the spec is a deliberate choice, stated as one.
- The delta from today's sixteen tables: added, changed, removed — enough that `cm-to-tickets` can
  slice implementation without reopening a decision.
- The list of `CONTEXT.md` entries this effort changed, and confirmation each was reconciled when its
  ticket landed rather than deferred to here.

Publish as `.scratch/world-data-model/spec.md`. This ticket writes the spec; it does not write the
migration.

## Comments

- From [09](09-scouting-persistence.md): scouting claims **no index beyond its two primary keys** —
  `scouting_assignments(scout_id)` and `scouting_progress(club_id, player_id)`. Every read is either
  the `club_id` prefix or the full key. Stated as a claim for this ticket to verify, not to
  rediscover.

- From [13](13-results-only-geography-cost.md): the spec must state the rule that separates the two
  halves of the catalogue, or it reads as inconsistency. `nations` and `cities` are **unconditional**
  (copied wholesale from code, because something outside the loaded world points at them —
  `players.nationality` and `players.birth_city_id`); `competitions` and `clubs` are **activated-only**.
  The same section carries the invariant that Simulation Depth conditions only the rows beneath a club,
  never the catalogue and never a column on `clubs`.
