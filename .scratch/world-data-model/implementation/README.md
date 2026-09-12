# Implementation tickets: the MVP world data model

These are the **implementation** tickets sliced from [spec.md](../spec.md), the finished output of
the world-data-model wayfinder map. They live here rather than in [issues/](../issues) because that
directory holds the map's thirteen **decision** tickets, all resolved and now history; putting
implementation work into the same numeric sequence would make two different kinds of ticket share
one set of numbers. The file conventions are the tracker's own — one file per ticket, `NN-<slug>.md`
numbered from `01`, a `Status:` line near the top, comments appended at the bottom. See
[issue-tracker.md](../../../docs/agents/issue-tracker.md).

Numbering is dependency order: blockers come before the tickets they block. It is not a schedule —
several tickets have no blockers and can run in parallel.

## What these tickets cover

The spec's table set: ten new tables, seven changed, one dropped column, and two indexes, together
with the three bodies of work the spec explicitly hands off — the Drizzle migration, the generator
rewrite, and the query-layer changes.

The schema is defined once in `apps/desktop/src/main/db/schema.ts`, and the DDL that runs is
generated from it by `pnpm db:generate`. No ticket edits the generated module by hand; every ticket
that changes a table regenerates it and leaves the `verify-db-schema` gate green.

`clubs.name` is deleted across two tickets rather than one, because six main-process modules and
several tests read it and no single change could remove the column and rewire every reader while
staying green. Ticket 04 is the expand half and ticket 06 the contract half. The calendar conversion
is split the same way: ticket 09 adds dates and rounds beside the old global matchday column, and
ticket 10 removes it and switches the advance.

## Sequence

| # | Ticket | Blocked by |
|---|---|---|
| 01 | [Seed the background match deterministically](01-deterministic-background-match-seed.md) | — |
| 02 | [Nations and cities become unconditional rows](02-nations-and-cities-rows.md) | — |
| 03 | [Generation reads the snapshot, and the save records what produced it](03-generation-provenance-and-snapshot-handoff.md) | — |
| 04 | [Display names resolve through the content pack](04-display-names-through-the-content-pack.md) | — |
| 05 | [The competition graph is persisted as the resolved world](05-competition-graph-tables.md) | 02, 03 |
| 06 | [Clubs are generated per competition, with a hometown and a ground](06-clubs-generated-per-competition.md) | 02, 04, 05 |
| 07 | [Membership and standings live on participant rows](07-competition-participants.md) | 05, 06 |
| 08 | [Player provenance — nationality, birthplace, and nation-keyed names](08-player-provenance-and-name-pools.md) | 02, 06 |
| 09 | [Fixtures become competition-scoped and dated](09-fixtures-competition-scoped-and-dated.md) | 06, 07, 23 |
| 10 | [Continue advances by date](10-continue-advances-by-date.md) | 09 |
| 11 | [Simulation Depth collapses on disk to has-a-squad or not](11-simulation-depth-on-disk.md) | 06, 10 |
| 12 | [Domestic cups with real bracket progression](12-domestic-cups.md) | 05, 09, 10, 11 |
| 13 | [Promotion and relegation at the season rollover](13-promotion-and-relegation-rollover.md) | 07, 10, 11 |
| 14 | [The board objective names the competition it judges](14-board-objective-names-its-competition.md) | 07, 13 |
| 15 | [Staff — a named coach and named scouts at the human's club](15-staff-coach-and-scouts.md) | — |
| 16 | [Scouting — assignments keyed on the scout, progress kept sparse](16-scouting-assignments-and-progress.md) | 15 |
| 17 | [The log records only facts no table holds, and transfers become a table](17-event-log-restriction-and-player-transfers.md) | 10, 11, 22 |
| 18 | [Retention at rollover](18-rollover-retention-and-stream-pruning.md) | 13, 17 |
| 19 | [The two indexes, and the league table stops reading the world](19-the-two-indexes.md) | 07, 09 |

Five tickets can start immediately: 01, 02, 03, 04, and 15. Ticket 01 is a defect fix and should go
first regardless of what else is running, because the determinism criteria in tickets 06, 11, 12, and
13 are all false while it stands.

## Open questions — decisions, not execution

Four gaps the map did not reach. The spec records them unanswered, and so do these tickets: none of
them may be settled by whoever happens to be writing the surrounding code. Each carries
`Status: ready-for-human` for that reason, and each says what work would settle it — three of them a
measurement against the prototype scale-probe harness at
[prototype-scale-probe](../../../apps/desktop/src/main/db/prototype-scale-probe/RESULTS.md), the
fourth a design call.

| # | Open question | Gates | Blocked by |
|---|---|---|---|
| 20 | [An index for the calendar advance's date sweep](20-open-question-calendar-sweep-index.md) | nothing — a possible follow-up index | 10 |
| 21 | [An index for the club-keyed membership join](21-open-question-membership-join-index.md) | nothing — a possible follow-up index | 07 |
| 22 | [`player_transfers`' primary key and player-keyed index](22-open-question-player-transfers-key.md) | 17 | — |
| 23 | [Whether the paired-penalty invariant is a `CHECK`](23-open-question-paired-penalty-check.md) | 09 | — |

Tickets 22 and 23 gate implementation work because each decides a shape that a ticket below would
otherwise have to invent: a primary key for a new table, and whether two columns carry a constraint.
Tickets 20 and 21 gate nothing — an index is additive, so measuring can follow the work it measures.

## What is deliberately not here

- **Anything on the map's [Out of scope](../map.md) list.** In particular the read-path defects the
  scale probe measured — the N+1 club loop, the quadratic position filter, and the world-wide
  standings tally — are query-layer bugs rather than shapes on disk. Ticket 19 adds the competition
  predicate the shipping index needs and nothing more.
- **Glossary reconciliation.** Every `CONTEXT.md` entry this effort changed was reconciled when its
  own decision ticket landed, per the map's standing preference; the spec verifies each one present
  at HEAD. No implementation ticket owes a glossary change, and any that finds one has found a
  contradiction worth raising rather than a chore.
- **Content and tuning.** The ~480 curated city rows, the ~2,400 name-pool entries, the base pack's
  names for the 382 club ids the catalogue implies, the club-strength curve constants, and the
  concrete calendar dates. Tickets 02, 04, 06, and 08 ship the shapes these fill; filling them needs
  no further schema change.
- **Save format migration.** The spec leaves it answerable but unanswered, and nothing in these
  tickets assumes either answer.

## Agent Notes

Every ticket's Decisions section links the `proposed/` Agent Notes it implements, with the gist
copied verbatim from the spec. Promotion to `implemented/` happens in the commit that ships the last
ticket carrying a given note, per [notes.md](../../../docs/agents/notes.md) — several notes are split
across more than one ticket here, so a note is not promoted by the first ticket that touches it.
