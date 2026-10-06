# gate-red-on-dev ticket 11 — a conjured squad is born for the Season it joins

**Outcome:** resolved 2026-09-22. [Ticket](../../.scratch/gate-red-on-dev/issues/11-conjured-squads-are-age-correct.md).
The gate-red-on-dev queue is empty again.

## Validation

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 0. Shared 500, contracts 181, game-engine 95, desktop 2199 passed. |
| determinism | the seed-5150 promotion test in `simulation-depth.test.ts` | Season 2 conjured squad spans [16, 34] on its opening date, as Season 1 does; the implementator showed it fails ([17, 35]) without the fix |
| e2e | not run | no screen changed |

The implementator's own `check:all` was killed before its desktop step finished and is not counted.

## Review

Reviewed inline by the orchestrator: a one-line change to the year passed to the conjured squad's
generation, which feeds only birth dates. World generation and the Youth Intake are unaffected.
