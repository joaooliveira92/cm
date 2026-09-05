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
- **Two specs reach for source files by filesystem path**, so typecheck cannot see them and a
  move must update the string by hand: `test/aiClubs.test.ts` (`../src/main/.../aiClubs.ts`) and
  `test/career-chrome.test.tsx` (`src/renderer/.../LeagueTableScreen.tsx`). Both read through
  `readFile`, which **throws** on a path that no longer resolves -- corrected 2026-09-05, an
  earlier revision of this spec claimed `aiClubs.test.ts` "fails open", and it does not. The real
  hazard is narrower: both assertions are negative (`not.toContain`), so a path retargeted at the
  *wrong but existing* file passes vacuously.
- **The desktop tests are now typechecked** (ticket 05, resolved 2026-09-05).
  `apps/desktop/tsconfig.json` covers `src`, `test`, `e2e` and `scripts`, so a move that breaks a
  spec's import fails `pnpm -r typecheck` in seconds rather than surfacing in a 15-minute vitest
  run. This is what makes the remaining move tickets cheap to verify.
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

## Round 2 (2026-09-05, second audit pass)

A follow-up folder audit ran after 01-03 landed. It found the `main/` decomposition on track and
added five tickets outside the original scope, four of which are unblocked today:

| Ticket | Why it was missed the first time |
|---|---|
| 06 mirror `test/` onto `src/` | The first pass audited `src/`. `apps/desktop/test/` is 100 flat files with two competing naming conventions -- the largest single navigation cost left in the repo. |
| 07 renderer root screens | `0890d19` moved most screens into feature folders and left six behind, so `renderer/` root now reads as two organising schemes at once. |
| 08 split `contracts/schemas.ts` | 1099 lines. Unlike `db/schema.ts` it carries no whole-file invariant, and nearly every screen imports it. |
| 09 split `shared/setup/leagueSelection.ts` | 716 lines, four spec-sectioned concerns; its 699-line spec splits the same way. |
| 10 split `game-engine/match/simulate.ts` | 651 lines. Constants, team state, resolvers and clock loop in one file. |

Sequencing: 08, 09 and 10 are each confined to a single package and independent of everything else.
05 comes before 04 and 07 so that a broken import in a moved file fails typecheck in seconds
instead of a 15-minute vitest run. 06 comes last -- it rewrites the import in all ~100 spec files,
so it must follow every ticket that moves a source path.

Files deliberately left alone: `main/db/schema.ts` (whole-schema invariant, drizzle-pinned path),
`external-reference/` (documented, gate-excluded, not ours), the renderer component splits already
claimed under `.scratch/react-composition-audit/`, and `docs/specs/` (a 300-file reference corpus
that is correctly shaped for what it is).

## Round 3 (2026-09-05, third pass)

A third audit ran once 08-10 had landed. It confirmed the repo's documentation trees are already
coherent and mapped from the root [README.md](../../README.md) -- the five parallel agent
directories (`docs/`, `.agents/`, `.ai/`, `.opencode/`, `.scratch/`) each carry their own index and
cross-link, and the apparent skill duplication is two deliberate arrangements, not drift: the short
names (`triage`, `to-spec`, ...) are alias stubs for the `cm-*` forks, and the `vercel-*` trees are
vendored upstream and hash-pinned by `skills-lock.json`. None of it should be "tidied".

What it did find was that rounds 1 and 2 audited `src/` and the packages, and never measured the
renderer's hooks or the test tree. Three tickets close that gap:

| Ticket | File | Lines |
|---|---|---|
| 11 split `renderer/transfers/useTransfersScreen.ts` | the largest splittable source file left | 717 |
| 12 split `renderer/create/ManagerIdentityStep.tsx` | one file holding a step machine, its copy tables and its pillar arithmetic | 621 |
| 13 split `test/season.test.ts` | ticket 02 split its subject into eight modules; its spec never followed | 1200 |

13 is folded into 06 rather than run separately -- it is the same rewrite over the same files.

Files confirmed as deliberately out of scope, in addition to round 2's list:
`renderer/components/ui/` (vendored shadcn, customized in place), `docs/specs/` (a 277-file
reference corpus), and the three renderer files in the 400-600 band
(`squad/useSquadScreen.ts` 502, `leagueSelection/viewModel.ts` 418, `create/useCreateSession.ts`
418) -- none crosses the 600-line bar this effort works to, and splitting on line count alone is
how a decomposition effort turns into churn.
