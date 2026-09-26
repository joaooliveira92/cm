# gate-red-on-dev ticket 09 — player ages read the game date

**Outcome:** resolved 2026-09-22. [Ticket](../../.scratch/gate-red-on-dev/issues/09-player-ages-read-the-game-date.md).

## What it was for

Four main-process helpers measured a player's age against the real date, so ages never advanced with the
Seasons and Player Development and wages depended on when the game was run: the same seed could give a
different result on another day. Found in the review of ticket 07, where a Youth Intake player showed as 15.

## Validation

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 0. Shared 500, contracts 181, game-engine 95, desktop 2198 passed. |
| determinism | `pnpm --filter @cm-clone/desktop exec vitest run test/main/club/ages-read-the-game-date.test.ts`, twice | passed both runs; the test itself plays one seeded world under system dates 2019-02-03 and 2043-11-20 and compares wages, ages, Transfer Values and development |
| lint proof | `no-wall-clock` fixture and `apps/desktop/test/shared/no-wall-clock-lint.test.ts` | 10 passed; the real tree has no violations |
| e2e | not run | no renderer file changed |

## Review

APPROVE. Folded in by the orchestrator: `match/` added to the rule's scope; the AGENTS.md gate row
updated; criterion 3 amended to "on the date they join". Save compatibility: no schema change; existing
saves keep their stored wages, and their future development and prices follow the game date.
