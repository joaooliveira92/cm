# Group B Screens — Implementation Spec

Status: ready-for-slicing

## Scope

This spec covers all eleven Group B screens from the import at
[docs/specs/group_b_global_navigation_and_inbox/](../../docs/specs/group_b_global_navigation_and_inbox/).
It does not re-state the import. Per screen it says what the implementation must do, and where the
import and this game disagree it points at the
[reconciliation ledger](../../docs/specs/group_b_global_navigation_and_inbox/RECONCILIATION.md) for the
full reasoning.

## Screens

### Screen 22 — Global Application Shell

**Status: Reviewed** (ticket 01). The career chrome as implemented — `CareerChrome.tsx`, its header/,
bottom-bar/, navigation/, and the two Continue bands — is the surface the import describes, expressed
in this game's own navigation model (compile-time sections with per-read placeholders, no `GlobalShellState`
aggregate, Back as unfiltered `history.back()`). The gap rows (deferred accessibility, i18n,
responsive layout, and the per-read failure-indistinguishable-from-loading gap) are `unscheduled`.

Implementation must: continue rendering the career chrome as-is. No new shell-level state machine.
Deferred gaps are ticketed separately.

### Screen 23 — Continue and Advance Time

**Status: Reviewed** (continue-and-advance-time effort). The design is not the import. It is two
implemented Agent Notes:
[Continue as the global career loop](../../.agents/notes/implemented/feature/2026-08-29-continue-as-global-career-loop.md)
and [The human Fixture's pre-match boundary](../../.agents/notes/implemented/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
The single control in the chrome, the one Continue command, the structured result band
(`ContinueResultBand`), the readiness model (`ContinueOutstandingBand`), the pre-match boundary state,
and the durably-at-commit persistence are the shipped design. Owned by the
[continue-and-advance-time](../continue-and-advance-time) effort.

Implementation must: continue the existing Continue control. The pre-match boundary and single-flight
guard are ticketed in the owning effort.

### Screen 24 — News Inbox, Screen 25 — Individual News Message, Screen 26 — News Filters

**Status: Reviewed** (ticket 02). All three are one list-and-detail route (`NewsInboxScreen.tsx` +
`MessagePane` + inline filter bar). The import's three screens are three specs over one implementation.

Implementation must: continue the existing news inbox, message pane, and filter bar. Deferred gaps
(multi-criteria filters, sender summary, entity links, saved presets, focus restoration, i18n,
responsive layout) are `unscheduled`.

### Screen 27 — Background Processing and Updating Game

**Status: Audited** (ticket 04). Entirely disposed. No screen, dialog, progress UI, task checklist,
cancellation mechanism, worker pool, or resource-policy surface exists or is planned. The one real
need — what the player sees when an advance fails — is satisfied by `ContinueResultBand` in the
career chrome.

Implementation must: nothing. The advance's failure path is already reported by `ContinueResultBand`.
No background-processing screen will be built.

### Screen 28 — Calendar and Schedule

**Status: Reviewed** (ticket 05). FixturesScreen.tsx is the Calendar screen under another name. It
shows match events grouped by date. The import's richer features (month grid, reminders, event-type
filters, view switching, date-jump control) would enhance the Fixtures screen, not create a new one.

Implementation must: continue the existing Fixtures screen. Calendar-style enhancements (month view,
reminders, date navigation) are `unscheduled` and belong as Fixtures extensions if ticketed.

### Screen 29 — Manager Notebook

**Status: Disposed in full.** The notebook has no referent anywhere in this game. Nothing to implement.

### Screen 30 — Manager History

**Status: Reviewed** (ticket 06). A career record partially exists (per-season league positions in
`board_objective`, lifetime state in `manager_status`). Season Summary is the surface it belongs to:
an "all seasons" view on Season Summary would list past positions, verdicts, and the terminal outcome.

Implementation must: no new screen. If the multi-season view is ticketed, it extends Season Summary.
Manager Profile must not acquire career-record data (it is creation-time identity only per the Group A
Agent Note). Honour and match-count aggregates are `unscheduled`.

### Screen 31 — Manager Profile

**Status: Reviewed** (ticket 03, complement to Group A's ticket 06). The existing `ManagerProfileScreen.tsx`
is the implementation. It shows creation-time identity (name, Archetype, Pillars), club context (name,
Season, tenure), and an active/archived badge. The complement rows (languages, qualifications,
relationships, tabs, entity links, notebook/ownership/resignation actions) are contradicted.

Implementation must: continue the existing Manager Profile screen. No additions for languages,
qualifications, background, relationships, reputation, tabs, entity links, notebook, ownership, or
resignation. The career-record question goes to Season Summary (ticket 06), not Manager Profile.

### Screen 32 — Manager Chat and Multiplayer Communication

**Status: Disposed in full.** There is one human manager per Save. Nothing to implement.

## Consolidation

### Inherited axes

Three axes inherited from Group A are not re-argued here. Every screen that touches them cites the
existing ruling rather than restating it:

- **Worker pools, memory budgets, resource-policy tuning** — ruled out at Group A charting.
  Consumes most of Screen 27; Screen 23's advance dialog rows also rule it out. Cited by name in
  Screen 27's ledger row.
- **Off-device telemetry, crash reporting, product analytics** — ruled out at Group A. Local
  structured logging is unaffected and stays in scope. Screen 23's §18 row states the disposal.
- **Resignation and the unemployed-manager job market** — deferred to Group N. Referenced by Screen
  30's career-record question (one club per Save makes it moot) and Screen 31's complement row.

### Multiplayer axis

The multiplayer, network, and multi-manager axis consumes §10 of all eleven files and recurs in §3,
§6, §8, §9, §11, §16, §17, §18, and §19 under three disguises (the active manager, the career
revision, the permission context). Every screen that carries those sections has a blanket row under
*The multiplayer axis* in the ledger. Not re-argued per screen.

### Map fog

The map's Not-yet-specified section had three patches:
- **Where new Group B surfaces land in the navigation model** — resolved: no new screens were
  warranted. The Calendar is Fixtures; the career record lives on Season Summary.
- **The News Message taxonomy** — unresolved but belongs to the News screen's own design, not the
  reconciliation effort. Carried forward to the News screen's own tickets.
- **Navigation history and focus restoration** — identified in Screen 22's audit as the
  [`Intra-screen focus model`](../../.agents/notes/proposed/architecture/2026-08-29-intra-screen-focus-model.md)
  Agent Note, which remains `proposed`. Owned by that note's promotion ticket.

### Ledger coverage

All eleven screens are off `Not yet audited`. The Coverage table at the ledger's header is the
single source of truth for each screen's status.