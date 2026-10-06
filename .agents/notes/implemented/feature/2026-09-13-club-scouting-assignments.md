# Agent Note: Club-targeted scouting assignments ride the assignment row

Status: implemented

## Problem

[Team Scout Reports supersede the opponent-analysis cut](../architecture/2026-09-07-team-scout-reports-supersede-opponent-analysis-cut.md)
put a Club target into **Scouting Assignment**, but shipped only the read path. Its *Left open*
section named three things the command would have to settle:

- how the Club target is stored without fanning out into one row per player against the scout cap;
- what happens when a Club assignment and a Player assignment cover the same player;
- (via team-scout-report ticket 07) what "revision-bound" means for a command issued from a report.

## Decision

**Storage.** `scouting_assignments` gains a nullable `target_club_id`, and `player_id` becomes
nullable. A `CHECK` keeps exactly one of the two set, and `UNIQUE` on each keeps one scout per player
and one per club. The row stays keyed on `scout_id`, so a Club target still occupies exactly one
scout. The squad is expanded only inside `accrueScoutingProgress`, so nothing is stored per player.

**Overlap.** A player watched both directly and through their club advances **once** per advance, at
the better scout's rate. Monotonic progress made stacking harmless to correctness, but stacking would
let one player outrun the per-scout accrual rate by spending two scouts. That is the breadth-versus-depth
trade a Club target exists to force.

**Stale readings.** `assignScoutToClub` carries `expectedReportId`, the id of the reading the manager
acted from. A reading is pinned to its calendar date (`<clubId>:<date>`), so an id that no longer
matches the current date is refused with `StaleReportError`, which names the current id. The
not-scouted answer carries the same id (`ClubNotScoutedError.currentReportId`), so "send a scout" is
guarded exactly like "renew". This is not the career revision the Group B ledger disposed of. There is
no second writer; the guard protects a manager from acting on a reading the calendar has already moved
past, for example after pressing Continue in the chrome.

**Idempotency.** An assignment is a state, not an event. The same scout on the same club again finds
the row already saying so and has no second effect, so no request-id log table is needed. Contrast
the Tactic, whose writes replace a value and do need one.

**Own club.** Refused with `OwnClubNotScoutableError`. Own-squad players are read in full and never
carry Scouting Progress, so accruing such an assignment would write the very rows that rule forbids.
Accrual also skips the human club defensively.

## Alternatives considered

- **Fan a Club target out into player rows.** Rejected by the superseding note: it exhausts an N-scout
  cap on the first assignment.
- **A separate `club_scouting_assignments` table.** It would need a cross-table rule for "a scout holds
  one assignment", which the single row expresses by its primary key.
- **Stack accrual on overlap.** Correct but exploitable, as described above.
- **A Tactic-style request-id log for idempotency.** Pays for replay protection a set-valued command
  already has.

## Consequences

- The schema change ships without a migration, following the Tactic revision precedent (`be040c0`).
  Saves created before it lack `target_club_id`.
- A Team Scout Report's `scout` is the scout on the Club when there is one, otherwise a scout on one of
  its players. `freshness` is `current` while either is watching.
- The Assign Scout tab lists every scout, busy ones included, because redirecting is legitimate.
- Proven by `apps/desktop/test/main/club/club-scouting.test.ts` and
  `apps/desktop/test/renderer/scouting/assign-scout-panel.test.tsx`.
