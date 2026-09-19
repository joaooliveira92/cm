# Validation Report: two-row-nav

## Ticket 08 — in a match context the tablist is named after the section, 2026-09-16

- Ticket closed: [08](../../.scratch/two-row-nav/issues/08-match-context-tablist-named-after-the-section.md)
- Follow-up filed: [desktop-suite-red 14](../../.scratch/desktop-suite-red/issues/14-incoming-bids-test-assumes-exactly-one-bid.md) (flaky unit test seen in this gate run)

### Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | In match and entity contexts the tablist name describes the context | `secondary-nav.test.tsx` "names the live-match tablist after the match context…", "names an entity's tablist after the entity" | pass; both fail with the old label |
| 2 | A unit test asserts the tablist name in a match context | as above | pass |

### Gate

| Gate | Command | Result |
|---|---|---|
| unit | `pnpm exec vitest run test/renderer/navigation` | 318 passed |
| check:all | `pnpm check:all` | exit 1. Typecheck, effect-lint and verify-db-schema ✓. Lint and md-link counts unchanged. Desktop **69 failed / 1797 passed**: the previous run's 68 failing cases plus `test/main/transfers/incoming-bids.test.ts` "guarantees a fresh bid in a later window" (`2 !== 1`). That test is main-process transfers code this change does not touch, and it passes alone (`pnpm exec vitest run test/main/transfers/incoming-bids.test.ts`: 19 passed). It assumes no organic AI bid in a random world; filed as desktop-suite-red 14. |
| e2e | `pnpm test:e2e e2e/journeys.spec.ts --grep "Screen 97"` | 1 failed. The status read "Applied — the match shows the change.", but the count was `2/5` instead of `1/5`: the re-simulation added a forced substitution. This is the known group-g-match-day 18 defect. The locator `navigation "Live Match tabs"` resolved, so the nav label is unchanged. |

Implemented and reviewed inline by the orchestrator. The diff is one derived name in `SecondaryNav.tsx`
and three unit tests.
