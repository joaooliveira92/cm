# Validation Report: desktop-suite-red ticket 14

## Sprint

- Effort: `.scratch/desktop-suite-red/`
- Tickets closed: 14-incoming-bids-test-assumes-exactly-one-bid
- Branch: `dev`
- Commits: `07da27a` fix(desktop-suite-red): relax incoming-bids assertion to allow organic bids

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Test does not depend on world producing no organic bid | `ok((yield* pendingCount) >= 1)` — accepts 1+ pending bids | PASS |
| 2 | Still fails if guarantee stops firing in later window | `ok(sawSecond)` at line 488 — fails if no pending bid in 30 advances | PASS |

## Gate

| Gate | Command | Result |
|---|---|---|
| typecheck | `pnpm -r typecheck` | ✓ (suggestions only) |
| lint | `pnpm run lint` (oxlint) | ✗ (12 pre-existing errors, none in changed file) |
| effect-lint | `pnpm run effect-lint` | ✓ (865 files, no violations) |
| verify-md-links | `pnpm run verify-md-links` | ✗ (10 pre-existing broken links in group-c/group-d) |
| verify-db-schema | `pnpm run verify-db-schema` | ✓ |
| test (focused) | `vitest run test/main/transfers/incoming-bids.test.ts` | ✓ 19/19 passed (5.71s) |
| test (full suite) | `pnpm -r test` | ✗ 61 failed / 1884 passed — all pre-existing failures |
| e2e | N/A | not applicable — test-only change, no UI change |
| determinism | N/A | not applicable — no simulation change |
| save compatibility | N/A | not applicable — no persistence change |

## Behavior changes

None. Test assertion relaxed from strict equality to `>= 1` to tolerate organic AI bids. No player-visible or seeded outcome affected.

## Decision records

None needed — one-line assertion change in a test file.

## Pre-existing failures

- 12 lint errors (unused imports/vars, `no-explicit-any`, duplicate imports) in unrelated files
- 10 broken markdown links in group-c/group-d (documented in SPRINT-PLAN gate state)
- 61 test failures across 15 files (pre-existing, documented in SPRINT-PLAN)

## Deferred and known limitations

None.

## Review

Reviewer verdict: **APPROVE**. One low-severity optional finding (ambiguous comment on sibling helper function). No repair list.