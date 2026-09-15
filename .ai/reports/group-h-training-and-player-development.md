# Validation Report: group-h-training-and-player-development

## Sprint

- Effort: `.scratch/group-h-training-and-player-development/`
- Tickets closed: `05-workload-and-recovery` (Screen 112, `8ec0c94`), `06-individual-training-plan` (Screen 108)
- Branch: `dev`
- Commits: `8ec0c94` (ticket 05); ticket 06 in the commit that adds its section below

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Workload screen shows player Condition and recovery status per player | `apps/desktop/test/renderer/training/workload-screen.test.tsx`, `recovery-status.test.ts`, `apps/desktop/e2e/training-workload.spec.ts` | pass |
| 2 | Workload gauge component is extractable for reuse in Screens 105 and 114 | `apps/desktop/test/renderer/training/workload-gauge.test.tsx` renders `WorkloadGauge` with no provider, router or atom | pass |
| 3 | Reads from existing player fitness data | `apps/desktop/test/main/club/workload.test.ts` (ledger rows read back, Rest/Active at 74/40/75, read leaves ledger untouched, missing save), `packages/contracts/test/workload.test.ts` (roundtrip + rejections) | pass |

## Gate

| Gate | Command | Result |
|---|---|---|
| focused | `vitest run test/renderer/training test/main/club/workload.test.ts test/renderer/navigation/adapter-coverage.test.ts` (desktop) | 8 files, 90 tests passed |
| focused | `vitest run test/workload.test.ts` (contracts) | 17 passed |
| check:all | `pnpm check:all` | exit 1, pre-existing failures only (below) |
| typecheck | inside check:all; also `pnpm --filter @cm-clone/{contracts,desktop} typecheck` | 0 errors |
| effect-lint | inside check:all | no violations (785 files) |
| verify-db-schema | inside check:all | pass |
| lint | inside check:all | fail, pre-existing errors only |
| verify-md-links | `tsx scripts/verify-md-links.ts` after the map link fix | 18 broken links, the recorded baseline |
| tests | inside check:all | shared 457/457, contracts 97/97, game-engine 50/50; desktop 70 failed / 1624 passed across 19 files |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | 10 failed / 25 passed; new `training-workload.spec.ts` passes. The same suite on clean HEAD `349bafc`: 10 failed / 24 passed, identical failing specs |
| determinism | — | not applicable: no simulation, seeding or Player Development change |
| save compatibility | — | not applicable: no schema or persistence change; `getWorkload` is a read-only query |

### Desktop test regression check

The 19 failing files were re-run in a detached worktree at HEAD `349bafc` (no ticket 05 changes):
69 failed / 140 passed. The working tree fails those same 69 plus one:
`test/renderer/assets/club-badge-library.test.ts`, which reports missing badge keys for
`club_prt_1_*` in the `portuguese-primeira-liga-licensed` pack. That pack is uncommitted work from a
parallel session in the same worktree and is not part of this commit. Ticket 05 adds no failures.

## Behavior changes

- New screen at `/career/$saveId/training/workload`, reached from Coaching Assignments' "Workload and
  recovery" button. `/career/$saveId/training` became a parent route whose index is still Coaching
  Assignments, mirroring the Tactics editor; `g 3` and the nav active state are unchanged.
- New read-only RPC `getWorkload`. The Rest/Active indicator is derived in main from stored
  Condition against `NON_CONTACT_CONDITION_THRESHOLD` (75) on every read. Nothing is persisted, and
  no save is affected.

## Decision records

- ADRs added: none.
- Agent Notes written (`proposed/`): none. The Rest/Active rule and stored-versus-projected Condition
  choice are recorded in `spec.md` and the map's Decisions so far.
- Agent Notes promoted (`implemented/`): none. `2026-09-15-group-h-v1-scope.md` covers six screens;
  two have shipped.

## Pre-existing failures

- lint: `apps/desktop/test/renderer/training/fixtures.ts:2` (`consistent-type-imports`) and
  `packages/contracts/src/rpc.ts:35` (unused `CoachAssignmentView`), both from ticket 04; plus
  errors in `player.ts`, `PlayerProfileScreen.tsx`, `PlayerContractScreen.tsx`,
  `PlayerDevelopmentScreen.tsx`, `MatchHomeTeamScreen.tsx`, `MatchPreviewScreen.tsx`,
  `PostMatchSummary.tsx`, `MatchDayScreen.tsx`.
- verify-md-links: 18 links in `.scratch/group-c-club-information/RECONCILIATION.md` and
  `.scratch/group-d-player-and-staff-records/issues/02-staff-screens-scope.md`. The group-h
  `map.md:23` link to the scope note (one `../` too many since `54566c9`) is fixed in this commit.
- e2e (same on clean HEAD): `app.spec.ts` Squad view selector and Match Day live control;
  `journeys.spec.ts` save persistence, both substitution journeys, transfer bid; `keybindings.spec.ts`
  rebind survives restart; `keyboard.spec.ts` g-key navigation and Escape layering; `router.spec.ts`
  Match Day resume (AC-15). The recorded 5-failure baseline at `8f95c8f` is out of date.
- desktop unit tests: the 69 failures listed above, including `display-names.test.ts`, which flags
  ticket 04's staff query in `club/training.ts`.

## Deferred and known limitations

- Condition shown is the stored ledger value, not a projection to the next kickoff through
  `conditionAfterDays`.
- The ledger keeps the last injury Severity until Season start, so the detail line states it as a
  fact about the Season rather than a live recovery state.
- "Workload", "Rest" and "Active" are ticket vocabulary without CONTEXT.md entries.
- The renderer's pre-existing `@cm-clone/game-engine` import in `table/squad/playerStatus.tsx` is
  untouched; this ticket no longer adds a consumer of it.

## Review

Reviewer verdict: APPROVE (no blocker or high). Findings addressed before the gate:

- S1 (medium): detail line claimed "Recovering"/"Fully recovered" states the ledger cannot support.
  Now "No injury this Season" / "Last injury this Season: <Severity>".
- T1 (medium): the renderer read the engine threshold through a new re-export. The indicator is now
  computed in main and carried on `WorkloadPlayerView.recovery`; the re-export is reverted.
- T2 (low): rounded percentage could read 75% beside Rest. Display now floors.
- T4 (low): the error-state test now asserts "That save could not be found."
- S3 (low): the spec's "No new RPCs expected" line is updated.
- T3 (low): renderer Severity and indicator types now derive from `WorkloadPlayerView`.

Push and PR: not done. Commit is local on `dev`.

---

# Ticket 06: Individual Training Plan (Screen 108)

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Per-player training plan shows current focus with a clear picker | `test/renderer/training/training-plan-screen.test.tsx` (focus read from `getSquad`, Goalkeeping offered only with goalkeeping Attributes, loading, error, not-your-player), `training-focus-picker.test.tsx` (incl. off-rule current focus pressed and disabled) | pass |
| 2 | Set or clear training focus via existing `setTrainingFocus` RPC | `training-plan-screen.test.tsx` (set payload and re-read, clear sends `focus: null`, pending, error, cross-player error isolation), `test/renderer/playerDevelopment/player-development-screen.test.tsx` | pass |
| 3 | Plan summary card component is extractable for reuse in Screens 105 and 114 | `training-plan-summary-card.test.tsx` renders it with no provider | pass |
| — | Reachable path | `workload-screen.test.tsx`, `adapter-coverage.test.ts`, `e2e/training-plan.spec.ts` | pass |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` (before review repairs) | exit 1; typecheck, effect-lint, verify-db-schema pass; lint and verify-md-links pre-existing only; shared 457/457, contracts 97/97, game-engine 50/50; desktop 70 failed / 1650 passed. The 70 failing tests are identical by name to the ticket 05 run above (69 on clean HEAD plus the other session's badge-library failure) |
| focused, after repairs | `vitest run test/renderer/training test/renderer/playerDevelopment` (desktop) | 11 files, 71 tests passed |
| typecheck, after repairs | `pnpm --filter @cm-clone/desktop typecheck` | 0 errors |
| verify-md-links, after repairs | `tsx scripts/verify-md-links.ts` | 18 broken links, the recorded baseline |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | after repairs: 10 failed / 26 passed; `training-plan.spec.ts` and `training-workload.spec.ts` pass; failing specs identical to clean HEAD `349bafc` |
| determinism | — | not applicable: no simulation or Player Development rule change |
| save compatibility | — | not applicable: no schema change; no new RPC |

## Behavior changes

- New screen at `/career/$saveId/training/plan/$playerId`, reached from a "Training plan" button on
  each Workload and Recovery row.
- Player Development's Training Focus buttons are replaced by the shared picker: it now shows the
  current focus, hides Goalkeeping for players without goalkeeping Attributes, and shows a message
  instead of always-failing buttons for another club's player.
- The lint error at `test/renderer/training/fixtures.ts:2` (ticket 04) is fixed.

## Review

Reviewer verdict: APPROVE. Addressed:

- Finding 2 (medium): an off-rule saved focus (Goalkeeping on an outfield player, possible through
  the old picker) left nothing pressed. It now shows pressed and disabled; tested.
- Finding 4 (low): None copy said Player Development "runs unmodified", which ignores the coach
  modifier. Now "No Category receives a larger share of Player Development".
- Finding 5 (low): Screen 108 decisions recorded in `spec.md` and the map.

Deferred:

- Finding 1 (medium): `setTrainingFocus` in main does not enforce the Goalkeeping rule. Filed as
  [ticket 10](../../.scratch/group-h-training-and-player-development/issues/10-enforce-goalkeeping-focus-rule.md).
- Finding 3 (low): the Training nav item does not highlight on the plan route, matching other
  player drill-downs.
- Outside this effort: `apps/desktop/src/renderer/table/squad/playerStatus.tsx:22` imports
  `@cm-clone/game-engine`, which the engineering contract forbids (from `ce7f3db`). Not filed as a
  group-h ticket because it belongs to no charted effort; a human should decide where it goes.
