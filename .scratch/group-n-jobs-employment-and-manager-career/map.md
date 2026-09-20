# Map: Group N — Jobs, Employment and Manager Career

Label: `wayfinder:map`

## Destination

A reconciliation spec and deviation register for screens 194–207 (Job Centre through Employment
History and Career Milestones), stating per screen what the implementation must do and what
deviations exist from the imported spec at
`docs/specs/group_n_jobs_employment_and_manager_career/`.

## Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer. Charted following the Group M reconciliation precedent: inventory each screen against the
existing implementation, decide v1 scope, record deviations (out-of-scope, contradicted, deferred,
renamed), then spec → slice → implement.

**Skill**: `cm-wayfinder` for charting.

**Existing architecture note**: [The job market is deferred; a sacking still ends the career]
(../../../.agents/notes/implemented/architecture/2026-09-13-job-market-deferred-sacking-stays-terminal.md)
already rules the core question: Group N is deferred with anchor `unscheduled`, and sacking stays
terminal. This map's job is to confirm that finding per screen and produce the deviation register.

**What makes this group different from M.** Group M was unsettled — CONTEXT.md's exclusion was spread
across two non-obvious lines and could have been overturned. Group N's exclusion is explicit and
recorded in an `implemented` Agent Note with proving tests. The charting here is a confirmation pass,
not an open scope question.

**Grounding**: all 14 screens are absent from the shipped renderer, RPC layer, schema, and shared
domain — no stubs, no routes, no tables, no components. The existing codebase models only:
- **Manager Profile** (Screen 19) — identity, Pillars, retirement
- **Manager Status** — `consecutive_misses`, `archived_cause`, `last_outcome`
- **Board Verdict** — `advance.ts` fires seasons and judges objectives
- **Sacking/Retirement events** — `ManagerSacked`, `ManagerRetired` archive the save

Screen 203 (Dismissal) and Screen 202 (Resign) overlap the existing Manager Sacked / Manager
Retired events as views of the terminal outcome. Screen 207 (Employment History) overlaps Manager
History (Screen 30).

## Decisions so far

- [01 — Screen inventory](issues/01-screen-inventory.md): all 14 screens are Absent — no routes, no
  stubs, no RPCs, no DB tables, no components, no shared models. Narrow overlap exists for Screens
  202, 203 and 207 against existing Manager Sacked / Manager Retired events and Manager History,
  but no dedicated Group N implementation surface uses any of them.
- [02 — v1 scope](issues/02-v1-scope.md): the existing deferred decision holds. All 14 screens stay
  out of v1, deferred unscheduled. CONTEXT.md's job market exclusion (810-812) and _Avoid_ of
  Resignation (821) remain accurate.

## Not yet specified

Nothing. The existing Agent Note settles the core question; this map closes on the inventory and
confirmation pass.

## Out of scope

- **A job market.** Vacancies, applications, interviews, offers, appointments, and the multi-club
  career path they imply are deferred per the existing Agent Note. Screen 194–201 as imported.
- **Manager reputation systems.** Screen 205 — no reputation model exists, and no data stores it.
- **Coaching badges and qualifications.** Screen 206 — no qualifications model exists, and the
  Manager Pillar system is the shipped substitute.
- **Resignation as a job-market transition.** Screen 202 as imported — the game has no referent for
  leaving a club for another. Manager Retired is the existing terminal-resignation equivalent.
- **Multiplayer and administration surfaces.** Group R's territory, even where a career screen
  implies a shared or hosted context.