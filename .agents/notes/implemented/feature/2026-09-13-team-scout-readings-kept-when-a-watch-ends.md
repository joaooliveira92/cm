# Agent Note: Team Scout Report readings are kept when a Club watch ends

Status: implemented

## Problem

Ticket 08 (Previous Reports) lists earlier readings of a club, but a Team Scout Report was derived
live from `scouting_progress` on every read, and that table keeps moving. Nothing held an earlier
reading, and one cannot be re-derived after the fact. The moment a reading gets written down decides
both storage growth and what "previous report" means. See
[the decision request](../../../../.scratch/team-scout-report/decision-request-01-when-a-reading-is-kept.md).

## Decision

**A reading is filed when a Club-targeted assignment ends**: the scout is redirected to a player or
another club, or unassigned. It is filed inside the same transaction as the change, just before it, so
the reading still names its scout.

- **Take-over files nothing.** When another scout takes the club over, the club is still watched.
- **Same club, same date replaces.** Both filings derive from the same knowledge at the same revision.
- **A club with nothing scouted files nothing.** There is no reading to keep.
- **Leaving the club deletes readings**, together with the rest of that club's scouting in
  `discardScoutingForClubs`. Knowledge belongs to the club that gathered it.
- **"Renew" needs no special case.** It is offered only when nobody watches the club, which means the
  earlier watch has already ended and filed its reading.

Storage is `team_scout_readings (club_id, target_club_id, observed_on, report)`, with the whole encoded
`TeamScoutReportView` as JSON and no index. A reading is therefore self-contained: it renders however
far the target's squad, name, or competition has since moved, because rendering it reads nothing else.
`getTeamScoutReadings` returns them newest first. The primary key makes the date a total order.

The renderer compares a chosen reading with the current report through a pure `compareReports`. It
matches findings by kind, area and note, and key players by id, so reordering is never a change.
Ability changes are shown as ranges, the same as the wire.

## Alternatives considered

- **File on Renew only.** It misses a watch that simply ended.
- **File every Matchday a scout watches.** About 40 rows per watched club per season, it needs a
  retention rule, and it makes the noisiest list.
- **Store only a diff or summary.** Smaller, but a reading would no longer render on its own, and
  comparing two arbitrary readings would need reconstruction.

## Consequences

- Another new table without a migration, following the same precedent as the Club-target column
  ([Club-targeted scouting assignments ride the assignment row](2026-09-13-club-scouting-assignments.md)).
- A watch that never ends (a scout left on a club indefinitely) files nothing. Its current report is
  the live one, which is what the screen already shows.
- Proven by `apps/desktop/test/main/club/club-scouting.test.ts` ("files a reading when a Club watch
  ends, and only then"), `apps/desktop/test/renderer/scouting/compare-reports.test.ts`, and
  `apps/desktop/test/renderer/scouting/previous-reports-panel.test.tsx`.
