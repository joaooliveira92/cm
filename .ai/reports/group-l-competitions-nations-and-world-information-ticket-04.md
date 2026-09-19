# Validation Report: group-l-competitions-nations-and-world-information, ticket 04

## Sprint

- Effort: `.scratch/group-l-competitions-nations-and-world-information/`
- Tickets closed: `04-competition-fixtures-screen`
- Ticket filed: `05-competition-read-followups` (`ready-for-agent`)
- Branch: `dev` (no feature branch, per AUTONOMOUS-AGENT § Git policy)
- Commit: see below

Competition Fixtures (Screen 163): the WIP `<h1>` stub at `competition/$id/fixtures` becomes a real
Fixture list, fed by a new `getCompetitionFixtures` RPC scoped by `competitionId` rather than by
widening `getFixtures`, which stays the human's own calendar.

## Acceptance criteria → evidence

The seven criteria were written by the **orchestrator before dispatch**, from ticket 03's shipped
shape and the v1 scope in ticket 02 — not by the implementation describing itself. The review raised
their provenance as a MEDIUM on the assumption the implementator authored them; that assumption was
wrong, and the ratification is recorded in the ticket.

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Lists date, home club, away club, score/unplayed state | `CompetitionFixturesDetailScreen.test.tsx` → "lists each fixture with its date, home club and away club" (asserts home and away by column, so a transposition fails) | pass |
| 2 | New `getCompetitionFixtures` RPC in `packages/contracts`, schemas both ways, scoped to the URL's Competition | `packages/contracts/test/competition-fixtures.test.ts` (5 cases) + `apps/desktop/test/main/season/dated-fixtures.test.ts` → "the competition-scoped read returns that competition's fixtures, not the human's" | pass |
| 3 | Played/unplayed distinct, no fabricated score | `CompetitionFixturesDetailScreen.test.tsx` → asserts `data-played`, real `3 - 1`, literal `Unplayed`, and negatively neither `null` nor `0 - 0` | pass |
| 4 | Loading and error states matching `CompetitionTableScreen` | "shows a loading state while the read is in flight", "handles error state" | pass |
| 5 | Follows the `CompetitionTableScreen` DataTable pattern | Structural, not test-provable — same `CompetitionMain` wrapper and `Table*` primitives, same branch order | pass, by inspection |
| 6 | Filters, round/stage nav, export, calendar-period nav deferred | Nothing of the kind shipped; deferral recorded in ticket 05 rather than closed by a checkbox | pass |
| 7 | Tests cover heading, rows, played/unplayed, error | 6 renderer tests | pass |

Criterion 2 was **not** proven when the implementator reported done: the contract test only
exercised schemas and the renderer test discarded the payload, so nothing asserted the one thing the
ticket adds to the backend. Both gaps were closed during rework.

### Mutation evidence

The scoping test was verified to have teeth rather than assumed to. Mutant: `getCompetitionFixtures`
ignores its `competitionId` argument and folds `loadHumanCompetitionId` instead.

```
pnpm --filter @cm-clone/desktop test test/main/season/dated-fixtures.test.ts
  → Test Files 1 failed (1) | Tests 1 failed | 4 passed (5)
```

The mutant killed exactly the new test. Source restored and re-verified.

## Gate

Baseline measured on a clean tree **before** any change, and again after. The gate is red on `dev`
independently of this sprint.

| Gate | Baseline (clean `dev`) | After this change |
|---|---|---|
| typecheck | ✓ | ✓ |
| lint | ✗ | ✗ (unchanged) |
| effect-lint | ✓ | ✓ |
| verify-md-links | ✗ | ✗ (unchanged) |
| verify-db-schema | ✓ | ✓ |
| test | ✗ — 61 failed / 1895 passed, 15 files | ✗ — 61 failed / 1900 passed, 15 files |

`pnpm check:all`, both runs. The delta is **+5 passing, +0 failing** on the first gate run, and the
rework adds 2 more tests on top. The 61 failures are the same pre-existing cluster in the same 15
files, almost all `ReferenceError: window is not defined` at
`apps/desktop/src/renderer/navigation/scroll-state.ts:21`. `lint` and `verify-md-links` failures are
likewise pre-existing and were confirmed by the implementator via `git stash -u` on both of its
files, not inferred.

None of that was repaired here — it has no ticket, and folding unrelated repairs into a sprint is
forbidden by AUTONOMOUS-AGENT § Failure policy. It is flagged in SPRINT-PLAN as needing one.

| Gate | Command | Result |
|---|---|---|
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | **not run.** A screen changed, so the contract asks for it. Not run because the suite takes ~10 min and drifts against UI redesigns independently of this change. This is a known omission, not a pass. |
| determinism | — | not applicable: no simulation, seeding or Player Development code touched; the new read is read-only SQLite |
| save compatibility | — | not applicable: no schema change, no migration, no write path |

## Behavior changes

No change to any player-visible or seeded outcome outside the new screen.

One existing read was refactored: the SQL and `FixtureView` mapping shared by both fixture lists
moved into `fixturesForCompetition`, so `getFixtures` now calls it. Verified behaviour-preserving:
the helper keeps `competitionId` typed `string | null` and binds SQL `NULL` unchanged, so the
"no club chosen yet" case still yields an empty list exactly as before. The implementator originally
coerced this to `?? ""`; that was reverted during rework to avoid erasing a distinction the type
system was carrying. Regression cover is the 15 existing `test/main/season/` files (63 tests, green).

## Review findings and disposition

Reviewer verdict: **NEEDS_REWORK**, one HIGH. All repairs made by the orchestrator before commit
(`SendMessage` is unavailable in this harness, so the implementator could not be resumed with its
context; the findings were bounded and in scope per IMPLEMENTATION-PROMPT § 7).

| Finding | Severity | Disposition |
|---|---|---|
| `getCompetitionFixtures.error` omits `PendingFixtureIntegrityError` | HIGH | **Fixed.** The read folds `toSeasonView`, which raises it. Typecheck cannot see this because the RPC handler is typed `Effect<unknown, unknown>`; at runtime the encode fails and the raw error reaches the renderer, violating ENGINEERING-CONTRACT § Boundaries. Added to the union, plus a roundtrip test. |
| No main-process test proves the scoping | MEDIUM | **Fixed**, with mutation evidence above. |
| Acceptance criteria authored post-hoc | MEDIUM | **Rejected on the facts** — the orchestrator wrote them pre-dispatch. Ratified explicitly in the ticket; criterion 6's deferral recorded in ticket 05. |
| Effort records not updated | MEDIUM | **Fixed** — `map.md` Decisions-so-far and SPRINT-PLAN, this commit. |
| `competitionId ?? ""` erases the null | LOW | **Fixed** — parameter typed `string \| null`. |
| Renderer test discards the RPC payload | LOW | **Fixed** — payload now recorded and asserted. |
| `Unplayed` vs `FixturesScreen`'s `-` | LOW | **Deferred** to ticket 05 item 2 — cross-screen wording, not this ticket's. |
| Untyped-`Failure` branch untested | LOW | **Deferred** to ticket 05. |
| `claimed` never set | NIT | **Incorrect** — the orchestrator set `claimed` before dispatch; `resolve-ticket` then flipped it to `resolved`. |

The review independently confirmed three implementator claims: the `aria-label` change breaks no
dependant (`data-focus-id` is what the action registry keys on), `Unplayed` is the CONTEXT.md-correct
term (**Schedule** is an _Avoid_), and no Agent Note is warranted.

### Escaped to ticket 05

`getCompetitionTable` — shipped in the previous commit — carries the **same** missing-error-union
defect. Not fixed here: it is prior shipped code, outside this ticket. Two identical boundary defects
in consecutive tickets is a pattern, so ticket 05 asks for an audit of the remaining RPC error unions
rather than a third one-off fix.

## Decision records

- ADRs added: none
- Agent Notes written (`proposed/`): none
- Agent Notes promoted (`implemented/`): none

Nothing crossed the contract's threshold. The nested `Atom.family` pattern and the
scope-by-`competitionId` choice were both settled and recorded by ticket 03; this ticket introduces
no new structural decision, package boundary, persistence change or determinism concern. Reviewer
agreed independently. The record this sprint owed was the `map.md` entry, which is written.

## Known limitations

- e2e not run for a screen change (above).
- Screens 164 (Competition Results) and 161 (Competition Overview) remain v1 scope with no ticket.
- The Competition Fixtures screen shows the current Season only; no round, stage, or historical
  edition scoping, which the imported spec describes at length.
