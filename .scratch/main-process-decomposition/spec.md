# Spec: Decompose the main-process wiring layer

Status: ready-for-agent

> Written during the 2026-09-05 folder-organization audit. The audit split `packages/shared`,
> reorganized the renderer into feature folders, and renamed `main/schema.ts`. The two largest
> files in the repo were left untouched and are specified here.

## Problem Statement

`apps/desktop/src/main/` is a flat directory of ~30 files with no grouping. Two of them are the
largest source files in the repository:

| File | Lines |
|---|---|
| `apps/desktop/src/main/season.ts` | 1886 |
| `apps/desktop/src/main/transfers.ts` | 983 |

`season.ts` is not one concern. It holds season start, matchday resolution, cup materialisation,
standings, promotion/relegation rollover, the calendar state machine and the read-side queries,
separated only by banner comments. Nothing about it is navigable by an agent: locating the cup
logic means scrolling past four unrelated subsystems.

There is a second, sharper problem underneath the size. `packages/AGENTS.md:20` states that
`apps/desktop/src/main` is "the wiring layer (SQLite + RPC channel), **not a logic home**", and
`season.ts` breaks that rule -- it contains pure, DB-free algorithms exported only so tests can
reach them.

Separately, "the current season row" is implemented six times: `season.ts` and `transfers.ts` hold
byte-for-byte duplicates of `SeasonRow`/`loadSeasonRow`/`toSeasonView`, `decider.ts`,
`managerProfile.ts` and `training.ts` each re-spell the same `ORDER BY season_number DESC LIMIT 1`,
and `match.ts` and `squad.ts` use `(SELECT MAX(season_number) ...)` sub-selects.

## Constraints discovered during the audit

These are load-bearing. A ticket that violates one will fail a gate or, worse, pass while breaking
something no gate covers.

- **`main/db/schema.ts` (1110 lines) must not be split.** It is one flat drizzle declaration list
  whose file-level docstring asserts whole-schema invariants ("the save carries exactly three
  indexes"). `drizzle.config.ts:11` pins its exact path; changing it forces `pnpm db:generate` and
  a gate-blocking regenerated-artifact diff over a file whose header says "Do not edit".
- **`main/index.ts` must stay at exactly that path** -- it is the `vite.main.config.ts:9` build
  entry. No test catches a break here; only `pnpm build` does.
- **Do not decompose the body of `advanceCalendar`.** It is one transaction whose statement
  ordering is the specification, explained by its own comments. Split the file around it.
- **`test/aiClubs.test.ts` reads `../src/main/aiClubs.ts` by path** as a layering assertion and
  **fails open** -- if the path stops resolving it passes vacuously rather than erroring.
- **The desktop tests are not typechecked.** `apps/desktop/tsconfig.json` has
  `"include": ["src", ...]`, so `pnpm -r typecheck` says "Done" while `test/` is never checked.
  Moving a symbol a test imports will not be caught by typecheck. Grep and run the specs.
- **Pure code cannot simply move to `packages/shared`.** `shared` now has zero dependencies (the
  audit removed a real runtime cycle to get there) and `contracts` depends on `shared`. Anything
  needing `ClubId` or `Effect` cannot live in `shared` without recreating the cycle. Only code
  whose sole external need is already inside `shared` may move there.

## Implementation Decisions

- Each split file gets a barrel `index.ts` re-exporting the previous public surface, so call sites
  change only in their import *path*, never in the symbols they name.
- Use `main/season/index.ts` rather than leaving a `season.ts` beside a `season/` directory. A file
  and a directory sharing a basename is the exact confusion the audit removed from
  `main/schema.ts` vs `main/db/schema.ts`.
- Splits are pure moves. No behaviour change, no signature change, no opportunistic cleanup.
