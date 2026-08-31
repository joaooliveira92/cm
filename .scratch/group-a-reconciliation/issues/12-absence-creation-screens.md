# 12 — Absence: Screens 3, 4, 5 (creation-form screens)

Type: task
Status: resolved
Assignee: joao
Blocked by: 03

## Answer

2026-08-30. Screens 3, 4, and 5 audited against the implementation. All three are entirely absent: no routes, components, or screens exist. The surviving sections of each screen (33 of Screen 3, 40 of Screen 4, ~40 of Screen 5) are classified `contradicted` — the game's fixed single 20-club league (CONTEXT.md) and three-step Manager→Club→Review creation flow (new-game-flow-sequence note) leave no room for league/nation selection, competition detail configuration, or database-size/performance options. Each screen's ledger updated to `Reviewed` with a single `contradicted` row covering all surviving sections. No new fog surfaced. No Agent Note written — pure audit application of existing design decisions; no new choice asserted.

## Question

Three imported specs describe creation-form screens that exist in no route or component:

- **Screen 3: League and Nation Selection** — `03_league_and_nation_selection.md`, 35 sections. `CONTEXT.md` fixes a single 20-club league with no nation/selection concept. Contradicted by design.
- **Screen 4: Competition Detail Selection** — `04_competition_detail_selection.md`, 42 sections. The largest fully-surviving spec with zero implementation.
- **Screen 5: Database Size and Performance Options** — `05_database_size_and_performance_options.md`, 49 sections. Blanket trim removed all memory-budget clauses; world size is fixed.

All three carry blanket-trim rows in the ledger already. This ticket scans the surviving sections, distributes them across `out-of-scope` / `contradicted` / `deferred`, registers survivors, and flips the cluster to `Reviewed`.

## Done when

All three screens have a `Reviewed` status in `RECONCILIATION.md`, each with rows for every section the implementation does not follow, and no `unscheduled` rows remain.