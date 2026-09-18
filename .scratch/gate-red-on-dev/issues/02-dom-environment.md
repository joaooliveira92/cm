# 02: Renderer tests run in the node environment and cannot see `window` or `document`

**The defect:** `apps/desktop/vitest.config.ts` sets no `environment`, so the default is `node`.
Renderer tests opt into jsdom per file with a `// @vitest-environment jsdom` first-line pragma. About
14 failures across the suite are renderer tests that exercise DOM-touching code without that pragma:

- 9× `TypeError: Cannot read properties of undefined (reading 'body')`
- 5× `ReferenceError: window is not defined` at `src/renderer/navigation/scroll-state.ts:21`, reached
  from `enrichHistoryState` (`navigation/adapter.ts:34`) via `navigate` / `navigateBack`

The trigger was scroll-position preservation (§10.1): `navigate` now captures scroll state into
`window.history` on every call, so any test calling the navigation adapter needs a DOM. The tests
predate that and were never moved.

Known files lacking the pragma while importing navigation or focus code:
`test/renderer/clubStaff/club-staff-route.test.ts`, `test/renderer/navigation/adapter-coverage.test.ts`,
`test/renderer/router/stage2.test.ts`, `test/renderer/router/team-scout-report-route.test.ts`,
`test/renderer/match/liveMatchDayHarness.tsx`.

**Fix the environment, not the production code.** Guarding `enrichHistoryState` with
`typeof window === "undefined"` would add a branch that is never false in the renderer — the only
place this code runs — and would silently disable scroll capture if it ever were. A renderer test
belongs in the renderer's environment.

Consider whether the per-file pragma is the right long-term answer or whether
`apps/desktop/vitest.config.ts` should declare projects (renderer → jsdom, main → node). The pragma
is the smaller change; the projects split stops this recurring. Recommend one, with reasoning — the
config change has blast radius across ~200 test files, so do not make it unilaterally if the pragma
clears the gate.

Acceptance:
- [ ] Every failure with signature `window is not defined` or `undefined (reading 'body')` is gone
- [ ] No production source file gained an environment guard to satisfy a test
- [ ] No test was skipped, loosened or deleted
- [ ] A recommendation on pragma-vs-projects, with reasoning

**Blocked by:** None

**Status:** claimed
