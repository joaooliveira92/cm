# Issue: Error path coverage spec

Type: grilling
Status: resolved

## Question

Given the catalog of UI-reachable error paths (ticket 05), which ones merit e2e coverage, and what does each test assert?

- For each candidate: should it be a smoke test (just assert the UI shows _some_ error state) or a journey (assert the specific error message/icon/behavior)?
- Can all chosen paths be covered through the existing/planned seed scenarios, or do some need additional seeds?
- How do we group them (extension of existing per-screen tests, a dedicated error-path test file)?
- Are there error paths that look reachable in the catalog but are actually dead code (e.g., error type exists but no UI state can trigger it)?

## Answer

**4 tests in a dedicated `error-paths.spec.ts`: generic transfer failure smoke, changeTactics/InvalidTacticError journey, sacking error smoke, loadSave silent-no-op smoke.** Seed-dependent tests (sacking) wait on ticket 01 resolution; fallback to `fresh` seed for reachable-only subset. See [Agent Note](../../../.agents/notes/proposed/testing/2026-08-28-error-path-coverage-spec.md).