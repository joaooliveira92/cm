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
