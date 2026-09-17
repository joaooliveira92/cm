# 07: Assign or renew a scouting assignment from the report

Type: task
Status: resolved

**Follow-on (parked for a later session):** beyond the first tracer-bullet pass (tickets 01-06).

**What to build:** From inside the report screen, the manager can point a scout at the target club and renew an expiring report. The Assign Scout tab becomes functional: it lists the human club's free scouts, assigns one to the target club, and lets the manager renew when a report's freshness has decayed past a threshold. The assignment builds on the existing per-player scouting — assigning to a club assigns to the club's squad through the same rules — and the mutation is idempotent and revision-bound: submitting the same assignment twice has no second effect, and a stale revision is rejected rather than silently applied.

**Blocked by:** 06 (the report screen), 04 (the report RPC the assignment flows through).

**Status:** resolved

- [x] From the report, a manager can assign a free scout to the target club and see the assignment take effect.
- [x] A report whose freshness has decayed can be renewed from the report screen.
- [x] Submitting the same assignment twice is a no-op the second time (idempotency test).
- [x] A mutation submitted against a stale revision is rejected, not applied.
- [x] The screen reflects the post-mutation report state without a full reload.
## Answer

Built on 2026-09-13. The decisions (storage, overlap, what "revision-bound" means here, own club)
are recorded in the Agent Note
[Club-targeted scouting assignments ride the assignment row](../../../.agents/notes/implemented/feature/2026-09-13-club-scouting-assignments.md).

- **Command.** `assignScoutToClub {saveId, scoutId, clubId, expectedReportId}`. A Club target is
  stored on the assignment row (`target_club_id`, exclusive with `player_id`) and occupies one scout.
  The failures are `UnknownScoutError`, `ClubNotFoundError`, `SaveArchivedError`, `StaleReportError`
  and `OwnClubNotScoutableError`.
- **Accrual.** A Club target advances its whole squad, and a player watched both ways advances once,
  at the better scout's rate.
- **Stale revision.** The report id is the revision: `<clubId>:<calendar date>`. A command issued
  from an older reading is refused and changes nothing. `ClubNotScoutedError` now carries
  `currentReportId`, so a scout can be sent from the not-scouted answer too.
- **Idempotency.** Set semantics: the same assignment twice leaves both tables byte-identical.
- **Screen.** The Assign Scout tab lists every scout with their current target. It reads "Renew this
  report" when freshness is `aging` or `stale`, and "Send a scout" on the not-scouted answer. It is
  read-only on an Archived Save, and a refusal shows as the RPC's sentence. The mutation invalidates
  `["scouting", saveId]`, which the report also reads, so the new watcher appears without a reload.

Save compatibility: the schema changed without a migration, following the Tactic revision precedent.
Saves created before this change do not have `target_club_id`.

Proven by `apps/desktop/test/main/club/club-scouting.test.ts` (2 tests: one scout per club, no-op
repeat, stale/own/unknown refusals changing nothing, take-over, whole-squad accrual once per player,
report names the club's scout) and `apps/desktop/test/renderer/scouting/assign-scout-panel.test.tsx`
(5 tests: assign and live report update, renew, stale refusal sentence, send from not-scouted, and
archived).
