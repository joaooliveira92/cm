# Validation Report: group-i-scouting-and-recruitment

## Sprint

- Effort: `.scratch/group-i-scouting-and-recruitment/`
- Charted, specced and sliced: tickets 01-03 resolved, spec published, tickets 04-06 filed (`c926086`, `351df88`)
- Tickets closed: `07-typed-rpc-errors-survive-ipc`, `04-scouting-assignment-screen` (Screen 121)
- Branch: `dev`

## Acceptance criteria → evidence

| Ticket | Criterion | Proving test | Result |
|---|---|---|---|
| 07 | A typed error still decodes against the method's error schema after `structuredClone` | `apps/desktop/test/main/rpc/typed-errors-over-ipc.test.ts` (failed before the fix) | pass |
| 07 | An error outside the method's union is still a Failure | same file | pass |
| 04 | Screen lists every Scout with quality, target and Scouting Progress | `test/renderer/scouting/scouting-assignment-screen.test.tsx`, `scout-roster-row.test.tsx`, `e2e/scouting-assignment.spec.ts` | pass |
| 04 | Assigning to a Club and ending an assignment go through the existing commands and refresh the list | `scouting-assignment-screen.test.tsx` (free and busy Scout, end, inline refusal, Archived Save), `test/renderer/rpc/seam.test.ts`, `e2e/scouting-assignment.spec.ts` (assign and end in the built app) | pass |
| 04 | Scout roster row reusable on Screen 118 | `scout-roster-row.test.tsx` mounts it with no router or atoms | pass |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` (tickets 04 and 07 together) | exit 1; typecheck, effect-lint (820 files), verify-db-schema pass; lint errors only in files outside this diff; verify-md-links 18, the baseline; shared 461/461, contracts 113/113, game-engine 50/50; desktop 71 failed / 1732 passed |
| desktop failures | failing file list compared with the ticket 10 run (`b611e82`) | same 19 files, same 71 failures |
| focused | `vitest run test/main/rpc` | 20 passed |
| e2e | `pnpm build`, then `npx playwright test e2e/scouting-assignment.spec.ts` | 1 passed. The full e2e suite was run once by the implementator before the IPC fix: 24 passed / 15 failed, not compared with HEAD |
| determinism | — | not applicable |
| save compatibility | — | not applicable: no schema, event or persistence change |

`test/renderer/navigation/route-index.test.ts` "covers exactly the career screens" gained
`scoutingAssignment` and still fails, on 14 destinations already missing from its list at HEAD.

## Behavior changes

- Every typed RPC error now reaches the renderer with its fields. Before, each showed "The game returned
  an unexpected response".
- New screen at `/career/$saveId/scouting-assignment`, with a "Scouting Assignment" item under
  Recruitment. New renderer mutation `unassignScoutMutation`.

## Decision records

- Agent Note written (`proposed/`): `2026-09-15-group-i-v1-scope.md`. Not promoted: one of three screens has shipped.
- Decision request 01: knowledge-limited Player reads, blocking deferred Screens 119 and 129.

## Review

Reviewer verdict: APPROVE for both tickets on both axes, no blocker or high. Addressed: the e2e spec
located the club name by Tailwind classes (medium), removed; own-club exclusion stays proven in the unit
test. The encode fallback in `handleRpc` now logs a warning instead of failing silently (low).

Declined or deferred:

- `ScoutingAssignmentScreen`'s assign handler repeats `AssignScoutPanel.onAssign`, and the
  `currentReportId` lookup repeats `TeamScoutReportScreen` (medium). A shared helper is a follow-up.
- The roster row says "Club: X" / "No assignment" where `AssignScoutPanel` says "Watching X" / "Free"
  (medium). The row's form keeps a Club and a Player target apart; aligning the panel is outside 04.
- Until the squad read lands, the manager's own club can show in the picker; main refuses it with
  `OwnClubNotScoutableError`, shown inline (low).
- Mixed alert styles, Club casing in copy, the `Roster` prop combination, and missing tests for the
  League Table failure branch (low).

# Ticket 05: Scouting Knowledge screen (Screen 126)

- Commit: `aa1ac8a`; spec, plan and this section in the follow-up docs commit.

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | New read returns per-Club coverage and Knowledge Confidence and per-Player Scouting Progress, with an RPC roundtrip test | `packages/contracts/test/scouting-knowledge.test.ts` (incl. figure fields dropped on encode), `apps/desktop/test/main/club/scouting-knowledge.test.ts` (whole-squad coverage, counts, confidence), `test/renderer/scouting/scouting-knowledge-screen.test.tsx`, `e2e/scouting-knowledge.spec.ts` | pass |
| 2 | A save with no scouting reads as empty, not an error; own-squad Players never appear | `scouting-knowledge.test.ts` (empty save, own-squad Player with a progress row excluded, unscouted Club absent, encoded keys carry no figure), renderer empty state | pass |
| 3 | Coverage summary reusable on Screen 118 | `test/renderer/scouting/scouting-coverage-summary.test.tsx` mounts it with no router or atoms | pass |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1; typecheck, effect-lint, verify-db-schema pass; lint errors only outside this diff; verify-md-links 18, the baseline; shared 461/461, contracts 128/128, game-engine 50/50; desktop 71 failed / 1745 passed |
| desktop failures | failing test names compared with the tickets 04 and 07 run | identical, 71 tests |
| after review fixes | `vitest run test/renderer/scouting`; `pnpm --filter @cm-clone/desktop typecheck` | 44 passed; 0 errors |
| e2e | `pnpm build`, then `npx playwright test e2e/scouting-knowledge.spec.ts e2e/scouting-assignment.spec.ts` | 2 passed |
| determinism | — | not applicable: read-only |
| save compatibility | — | not applicable: no schema, event or persistence change |

## Behavior changes

- New screen at `/career/$saveId/scouting-knowledge` with a "Scouting Knowledge" item under Recruitment,
  and new read-only RPC `getScoutingKnowledge` (`SaveNotFoundError`).
- `squadCoverage` in `packages/shared` accepts any list of `{ progress }`; behaviour unchanged.
- CONTEXT.md, Knowledge Confidence: it also reads live per Club on the Scouting Knowledge screen.
- `ScoutRosterRow` uses the shared `scoutingProgressLabel`.

## Review

Reviewer verdict: APPROVE on both axes, no blocker or high. Addressed: Knowledge Confidence used per
Club beyond its glossary entry (medium), recorded in CONTEXT.md; `scoutingProgressLabel` duplicated in
`ScoutRosterRow` (medium); literal `100` for `FULLY_SCOUTED` (low); "Clubs scouted" copy against "what a
Scout observes is always Players" (low), now "Clubs with scouted Players".

Declined or deferred:

- Zero-padding in main to feed `squadCoverage` could become a shared coverage helper taking progresses
  and squad size (low).
- Count fields use `Schema.Finite` without range checks, matching sibling schemas (low).
- `seedScouted` in `e2e/seedSaves.ts` stops silently with fewer than two rival Clubs (low).

# Ticket 06: Scouting Centre screen (Screen 118)

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Scouting Centre renders the Scout roster and the coverage summary from existing reads | `test/renderer/scouting/scouting-centre-screen.test.tsx` (rows carry no actions), `e2e/scouting-centre.spec.ts` | pass |
| 2 | Links to Scouting Assignment and Scouting Knowledge | `scouting-centre-screen.test.tsx` (routes navigated), `e2e/scouting-centre.spec.ts` (both sub-screen headings) | pass |
| 3 | Empty states for a club with no Scouts and for no scouting yet | `scouting-centre-screen.test.tsx`, a test per state plus both reads failing | pass |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1; typecheck, effect-lint, verify-db-schema pass; lint errors only outside this diff; verify-md-links 18, the baseline; shared 461/461, contracts 128/128, game-engine 50/50; desktop 71 failed / 1750 passed |
| desktop failures | failing test names compared with the ticket 05 run | identical, 71 tests |
| e2e | `pnpm build`, then `npx playwright test e2e/scouting-centre.spec.ts e2e/scouting-assignment.spec.ts e2e/scouting-knowledge.spec.ts` | 3 passed |
| determinism, save compatibility | — | not applicable: renderer only |

## Behavior changes

- The `scouting` route shows the Scouting Centre instead of a placeholder.
- "Loading your scouts..." reads "Loading your Scouts..." on the Centre, Scouting Assignment and the Team Scout Report's panel.

## Decision records

- Agent Note promoted to `implemented/`: `2026-09-15-group-i-v1-scope.md`, all three v1 screens shipped.

## Review

Reviewer verdict: APPROVE on both axes, no blocker or high. Addressed: lowercase "scouts" in loading copy (low).

Declined or deferred:

- The loading/failure/message code is now repeated in five places (medium): filed as ticket 08.
- Section headings sit in plain `div`s beside an `aria-label`ed summary (low).
- No test fails one read while the other succeeds; the e2e count check does not retry (low).
