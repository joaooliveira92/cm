# Group C: Club Information — Implementation Spec

## Status

**Effort complete** — 2026-09-14. Screen 38 (Club Staff) is shipped via the
`club-staff-presence` effort. All other screens remain unreconciled. See
[RECONCILIATION.md](RECONCILIATION.md).

## Scope

This spec covers Group C (Club Information) from the import at
[../../docs/specs/group_c_club_information/](../../docs/specs/group_c_club_information/).
It does not re-state the import. Per screen it says what the implementation must do.

This effort ships screen 38 (Club Staff) only. Screens 33-37 and 39-49 are
**unreconciled** — no design decision has been made about them, and this spec
does not commit to building them.

## Screens

### Screen 38 — Club Staff

**Status: Audited** (club-staff-presence effort, 2026-09-07). Implementation shipped.

The screen the import describes (24-person staff bureau with contracts, roles,
workload, vacancies, responsibilities, search, permissions) is not this game's
screen. The project closed the role set at four (President, Coach, Scouts,
Physio) and cut contracts, wages, hiring, firing, and vacancies repo-wide. What
exists is a read-only list of four named people grouped by department, reached
at `/career/$saveId/club/$clubId/staff` — the first club-scoped route.

The full reconciliation is recorded in
[RECONCILIATION.md](RECONCILIATION.md), every row linked to its controlling
Agent Note or decision ticket in the `club-staff-presence` effort.

Implementation must: nothing. The screen is built, tested, and shipping. No
re-opening.

### Screens 33-37, 39-49

**Status: Not yet audited.** No design has been produced for these screens.
The import files describe features (club overview, squad lists by seniority,
finances, fixtures, results, transfers, history, records, honours, facilities,
supporter confidence, club comparison) that no project decision has committed
to building.

Implementation must: nothing. These screens are outside this effort's scope.
If ticketed, they need a separate reconciliation effort.

## Inherited axes

- **Multiplayer, network, multi-manager** — ruled out per Group A. Screens
  mentioning multiple managers, chat, or shared save state are disposed.
- **Worker pools, memory budgets, resource tuning** — ruled out per Group A.
- **Off-device telemetry** — ruled out per Group A.
- **Non-normative import scaffolding** (Condensed LLM brief, Suggested Git
  commit, Next planned item) — disposed per Group A.

## Ledger coverage

Screen 38 is `Audited`. All other screens remain `Not yet audited`. The
Coverage table in [RECONCILIATION.md](RECONCILIATION.md) is the single source
of truth for each screen's status.