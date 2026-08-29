# Agent Note: Match day structural extension coverage

Status: implemented

## Problem

The match day subs and force-off UI needs e2e coverage decisions. The orange injury prompt and shorthanded banner are unreachable from a seeded save (no deterministic match seed), while the substitution panel and controls are always reachable. Where to draw the line between what gets e2e coverage and what stays covered by unit tests, and where the new tests live.

## Decision

Three decisions:

1. **Force-off coverage**: skipped entirely at e2e level. The orange injury prompt, shorthanded banner, and bring-off button depend on non-deterministic match events and aren't reachable from a seeded save. Unit tests in `matchCommands.test.ts` already cover `ForceOff` command-level correctness (brings off to 10 men, bench-player no-op).

2. **Substitution interaction**: full click-through flow added. Selects an on-pitch player (off) and a bench player (on) from the deterministic `<select>` options, clicks "Make substitution", asserts the status text appears. Same interaction depth as the existing tactics-change test.

3. **Test location**: structural assertions (panel sections render, select elements present, button exists) extend the existing smoke test in `app.spec.ts`. The full substitution interaction flow goes in `journeys.spec.ts`.

## Alternatives considered

- **Full force-off e2e test via trial-and-error**: repeatedly start matches until an orange injury occurs. Rejected: violates the wave 1 reliability contract (`timeout: 30_000`, `retries: 2`) — would be flaky and slow.
- **Every sub/force-off scenario in one test**: Rejected: keeps smoke and journey concerns separate per wave 1 convention.
- **All sub assertions in the smoke test**: Rejected: would blow up `app.spec.ts` beyond the ~100-line pattern established by wave 1.

## Consequences

- No e2e test asserts force-off/injury/shorthanded UI state
- `app.spec.ts` match day smoke test asserts structural sub panel elements: "Off"/"On" labels, "Make substitution" button, cap display text
- `journeys.spec.ts` has a test that selects players from the sub selects, clicks "Make substitution", and asserts the status text appears
- All new tests follow the wave 1 reliability contract: `timeout: 30_000`, no exact-value match day assertions
- If a future deterministic match seed becomes available, the force-off decision should be revisited
- The sub interaction test may be flaky if the engine silently rejects the sub — the status text has two possible values, handled via regex match