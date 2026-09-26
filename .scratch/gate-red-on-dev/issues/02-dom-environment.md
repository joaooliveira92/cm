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

## What the fix actually was

Two distinct causes hid behind the two signatures, and only one was the missing pragma.

**`window is not defined` (5 failures) — missing pragma, as diagnosed.** Added
`// @vitest-environment jsdom` to `club-staff-route.test.ts`, `stage2.test.ts` and
`team-scout-report-route.test.ts`. `adapter-coverage.test.ts` was not failing: it carried a
hand-rolled `vi.stubGlobal("window", { … history, document })` polyfill. That was replaced with the
pragma too — a fake `window` that has to be extended every time the adapter touches a new DOM API is
the same defect one refactor from recurring.

**`undefined (reading 'body')` (9 failures) — not a pragma problem.** All nine were in
`router/main-menu.test.tsx`, which *already had* the jsdom pragma. `mainMenu.tsx`'s
`handleQuitConfirmed` calls `window.close()` on non-macOS; jsdom honours that by tearing the window
down, so `document` goes undefined and every *later* test in the file dies in `render`/`cleanup`.
One test reaching the quit path destroyed the fixture for eight others. Neutralising
`window.close` in `beforeEach` (`vi.spyOn(window, "close")`) confines the blast to the one test that
causes it. That one still fails, on its own assertion — it stubs `electronAPI.showQuitGuard`, an API
`window.d.ts` does not declare and `mainMenu.tsx` does not call — which is ticket 03's business.

## Recommendation: pragma now, projects split as its own ticket

Keep the pragma for this gate; it clears it. But 100 of 144 renderer test files already carry the
pragma and 0 of 63 main tests do, so the config is documenting the wrong default: the split already
exists, it is just spelled out 100 times by hand and silently absent on the 101st. That absence is
not detectable until a renderer helper happens to touch the DOM, which is exactly how this ticket
was born.

The projects split (renderer → jsdom, main → node) is the right end state, but not as a side effect
of a red-gate fix: it flips 44 renderer files from node to jsdom in one move, and at least one of
them (`level1-a11y.test.tsx`, with its `isServer` failures) is sensitive to which environment it
runs in. It needs its own ticket and its own full-suite run.

Acceptance:

- [x] Every failure with signature `window is not defined` or `undefined (reading 'body')` is gone
- [x] No production source file gained an environment guard to satisfy a test
- [x] No test was skipped, loosened or deleted
- [x] A recommendation on pragma-vs-projects, with reasoning

**Blocked by:** None

**Status:** resolved
