# 01: Group C reconciliation — confirm screen 38 shipped

**What to build:** Confirm that screen 38 (Club Staff) is fully implemented, tested, and shipping as delivered by the `club-staff-presence` effort. Verify that all rows in [RECONCILIATION.md](../RECONCILIATION.md) accurately describe the shipped code. No code changes required — this is an audit-and-close ticket.

The owned screens (33-37, 39-49) remain unconciled; this ticket does not touch them.

**Decisions:**

- Staff are two bound roles (President/Coach/Scouts/Physio), not a 24-person bureau. See [Staff entity and bindings](../../../.agents/notes/proposed/feature/2026-09-01-staff-entity-and-bindings.md).
- Presence Staff are derived, never stored. See [Presence Staff](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md).
- Club Staff page has exactly three states (loading, ready, error). See [club-staff-presence ticket 04](../../club-staff-presence/issues/04-what-the-club-staff-page-shows.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] spec.md exists with correct `Status: ready-for-slicing`.
- [x] RECONCILIATION.md accurately describes the shipped Club Staff screen per the `club-staff-presence` effort.
- [x] All screens 33-37, 39-49 are marked `Not yet audited` in the coverage table.
- [x] No stale `claimed` tickets remain in this effort.
- [x] Effort is ready for review and close.

## Answer

All acceptance criteria met. Club Staff (screen 38) is shipped end-to-end:
route at `/career/$saveId/club/$clubId/staff`, `ClubStaffScreen` component,
`getClubStaff` RPC with three view states, main-process derivation handler,
renderer atom, league-table entry points, 3 e2e tests, 25+ unit tests across
6 renderer specs and 1 main-process spec. The `club-staff-presence` effort
delivered and closed on 2026-09-09. No stale `claimed` tickets exist in this
effort. Screens 33-37, 39-49 remain unreconciled per RECONCILIATION.md
coverage table.