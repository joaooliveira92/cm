# 04 — Screen 27: what survives of background processing

Type: grilling

Blocked by: 01

## Question

[27_background_processing_and_updating_game.md](../../../docs/specs/group_b_global_navigation_and_inbox/27_background_processing_and_updating_game.md)
describes the progress, cancellation, and worker machinery behind an advance. Almost all of it is
already disposed of by rulings this map inherits:

- Worker pools, memory budgets, and resource-policy tuning are out of scope (Group A).
- The advance dialog, progress UI, task checklist, and cancellation are already `Reviewed` and
  disposed of on screen 23's ledger rows.
- §10 is the multiplayer axis.

The question is whether **anything survives**, and the answer is not assumed to be "no". The candidate
residue is the failure path: what the player is told when an advance *fails*, which
[continue-and-advance-time](../../continue-and-advance-time/map.md) records as currently silent outside
the League table, plus §18 Observability, where local structured logging is explicitly still in scope.

Blocked on ticket 01 because the Continue control and its result rendering
(`ContinueResult.tsx`, `ContinueOutstanding.tsx`) live in the chrome; auditing them twice would
produce two sets of rows over the same code.

Resolve as a disposal: either the residue is empty and the screen is `Audited` with everything
classified, or the residue is real and this ticket states exactly what it is and where it belongs.

No code changes.

## Done when

- Screen 27 moves off `Not yet audited`.
- Every section is classified, with inherited rulings cited by name rather than re-argued.
- The failure-path residue is either written into the spec or explicitly handed to
  `continue-and-advance-time` as already-owned.
