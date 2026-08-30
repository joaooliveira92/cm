# 22: Keyboard e2e conversion

**What to build:** the Playwright suite re-targeted per ticket 12, as the final stage asserting the
finished keyboard path: the level-3 journeys (Match Day, Transfers, Tactics, Squad) rewritten to
drive by keyboard with `toBeFocused` (auto-retrying) and ARIA-state assertions on role/text locators
— no data-testids or other app testability seams; creation, save-management, and error-paths specs
staying as clicks; the reliability contract (`workers: 1`, `fullyParallel: false`, CI-only
`retries: 2`, per-test `timeout: 30_000`) unchanged. The five mandated coverages each get a
keyboard test (application screen `g <key>` navigation, the command palette, the Squad grid, the
Match Day substitution flow, and Escape layering), and the existing click suite's results are
recorded before and after — a click break is an app regression, not a test edit.

**Decisions:**

- Convert the level-3 journeys to keyboard driving, keep creation/save-management/error-paths as clicks; cover navigation, palette, the Squad grid, the Match Day substitution flow, and Escape layering; uphold the no-testability-seam line — assert focus with `toHaveFocus()` on role/text locators plus ARIA states; the reliability contract holds unchanged with `toBeFocused` (auto-retrying) as the authoring rule; the existing click suite is expected to survive unchanged, and any break is app regression, not a test to edit. See [Agent Note](../../../.agents/notes/proposed/testing/2026-08-30-e2e-keyboard-strategy.md).

**Blocked by:** 21, 20, 19.

**Status:** ready-for-agent

- [ ] AC-37: Level-3 journeys drive by keyboard; creation/save-management/error-paths stay clicks; the five mandated coverages each have a keyboard test. (Scope now also includes ticket 21's deferred Stage-6 journey: a rebind applied in the help overlay survives an app restart — recorded as a deferral on ticket 21, since AC-34's mapped Playwright class was not deliverable in Stage 6.)
- [ ] AC-38: Focus asserted via `toBeFocused` on role/text locators and ARIA only; no `data-testid`/test-only attributes; existing click suite result recorded before and after, behavior unchanged; reliability contract values unchanged.

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 7).