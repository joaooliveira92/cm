# 12-e2e-strategy

Type: grilling
Status: open
Blocked by: 05, 06, 10

## Question

What does the Playwright suite assert once the app is keyboard-first?

Today the suite is 37 `click()` calls and zero keyboard interactions across `app.spec.ts`,
`journeys.spec.ts`, `error-paths.spec.ts` and `save-management.spec.ts`. If the keyboard becomes the
primary interaction path, the suite is exercising the secondary one.

This ticket decides strategy only. Test authoring happens during implement.

Decide:

- **Convert, duplicate, or add**: whether existing journeys switch to keyboard driving, whether both
  paths are asserted (doubling suite runtime, against a suite already running `workers: 1` and
  `fullyParallel: false`), or whether a small keyboard smoke is added beside the unchanged clicks.
- **What keyboard coverage is actually worth having**: navigation between screens, the command
  palette, grid navigation, and the Match Day substitution flow are candidates with very different
  cost and value.
- **Selector strategy**: keyboard tests assert on focus position, which the current selectors do not
  express. Decide whether this needs test ids, roles, or focus assertions, and whether the app gains
  any attributes purely for testability — the two prior e2e efforts both held a hard line against
  app testability seams, and this ticket should either uphold or consciously break it.
- **Where the reliability contract binds**: the wave-1 contract is `retries: 2` CI-only, per-test
  `timeout: 30_000`. Keyboard tests that wait on focus transitions have different flake modes than
  click tests; say whether the contract still holds.
- **Regression risk on existing tests**: adding `tabIndex` and focus management to nine screens can
  change what `click()` resolves to. Name whether the existing suite is expected to survive
  unchanged.
