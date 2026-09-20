# Map: Group Q — Awards, Honours and Season Transitions

Label: `wayfinder:map`

## Destination

A reconciliation spec and deviation register for screens 236–249 (Awards Centre through Pre-Season
Readiness Checklist), deciding per screen whether it is in v1 scope, deferred, renamed,
contradicted, or out of scope.

## Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer.

**Existing codebase overlap**: The `season_summary` read model exists in the schema and is used in
shipped code — it derives from `competition_participants` and `board_objective`. CONTEXT.md defines
`Season Concluded`, `Board Objective Judged`, `Manager Warned`, `Manager Sacked`, `Manager Retired`,
`Archived Save`, and `Verdict` — all domain concepts Group Q would build on.

**The job-market note depends on Group Q**: The Agent Note deferring Group N says reopening should
wait until Group Q is reconciled, because a job market depends on season transitions.

**Known disagreements between the spec and shipped game:**
- Screens 244 (Promotion Relegation) and 246 (Season Transition / Competition Rollover) are
  load-bearing: rollover already exists in the shipped game, so the spec may partially contradict
  shipped behaviour.
- The spec's "resumable, checkpointed" rollover conflicts with the one-transaction advance recorded
  in the Group B ledger for Screen 23.
- Awards screens (236–241) are entirely new — no awards model exists.

## Decisions so far

- [01 — Screen inventory](issues/01-screen-inventory.md): zero Group Q screens have a dedicated
  route or component. Six screens have partial data-layer overlap (season_summary, rollover,
  budgets); the rest are entirely absent.
- [02 — v1 scope](issues/02-v1-scope.md): **Awaiting human.** Recommended: Band 1 (overlapping
  infrastructure) and Band 2 (awards/honours) all deferred. See full analysis in the ticket.