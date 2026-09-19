# Map: The gate is red on `dev`

Label: `wayfinder:map`

## Destination

`pnpm check:all` passes on `dev`, or every remaining failure is a ticketed, deliberate exception with
a reason recorded. Chartered 2026-09-18 at the human's explicit request.

## Notes

The gate has been red for long enough that SPRINT-PLAN records it as a standing condition: every
sprint delivers against a red gate and "pre-existing" has to be re-proved by hand each time. That is
the actual cost — not the failures themselves, but that a red gate cannot distinguish a new
regression from old noise, so it stops being a gate at all.

**Triage as observed on 2026-09-18** (`pnpm check:all`, 15 failing files / 61 failing tests):

| Cluster | Count | Signature |
|---|---|---|
| Missing DOM environment | ~14 | 9× `TypeError: Cannot read properties of undefined (reading 'body')`, 5× `ReferenceError: window is not defined` |
| Router/location context | 1 | `TypeError: Cannot read properties of null (reading 'isServer')` in `useListState`'s `useLocation` |
| Genuine assertion failures | 7 | see ticket 03 — these are the ones that may be real defects |
| lint | 13 errors | unused imports/vars, `no-explicit-any`, `consistent-type-imports`, duplicate import |
| verify-md-links | 18 | broken links under group-c / group-d |

An earlier characterisation in SPRINT-PLAN — "61 unit tests failing `ReferenceError: window is not
defined`" — was wrong and was repeated for several sprints. Only 5 are that error. The assertion
cluster was hidden behind it.

## Decisions so far

- [01 — lint and links](issues/01-lint-and-links.md): both mechanical gates clean. oxlint 0 errors
  (the three `no-explicit-any` removed without a replacement cast), verify-md-links 1207 files. All
  18 link failures were wrong relative depth, not missing targets.
- [02 — DOM environment](issues/02-dom-environment.md): 61 → 48 failures, 13 fixed, 0 new. **The
  charted diagnosis was half wrong.** The 5 `window is not defined` were a missing pragma as
  described. The 9 `reading 'body'` were not: all nine were in `main-menu.test.tsx`, which *already*
  had the pragma. `handleQuitConfirmed` calls `window.close()` on non-macOS, jsdom honours it and
  tears the window down, so one test destroyed the fixture for eight others. Neutralising the
  teardown in `beforeEach` made failures attributable and exposed a real one underneath — a test
  stubbing `showQuitGuard`, an API that does not exist (ticket 03). No production source touched, no
  test skipped or loosened.

## Not yet specified

Nothing. The pragma-vs-projects question graduated into [04](issues/04-vitest-projects-split.md):
100 of 144 renderer test files already carry the pragma and 0 of 63 main tests do, so the split
exists and is merely hand-written. It is sequenced after ticket 03 so it moves against a baseline
with no outstanding assertion failures.

## Out of scope

- The `oxlint` **warnings** (~30, mostly `no-console` in `.scratch/vendor-quarantine/` and
  `tmp-probe/`). The gate fails on errors; warnings are noise to be triaged separately.
- e2e. `check:all` does not include it.
