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

- [05 — `MatchNotReadyError` flake](issues/05-match-not-ready-flake.md): **the premise was wrong.**
  Nothing leaked between specs. `createSave` forwarded neither of `beginCareer`'s deterministic
  inputs, so every spec played a different world on every run; 3 worlds in 400 leave the human club
  on ten players after a season of contract expiries, and `readyPendingFixture` handed that club's
  Fixture to `startMatch` anyway. Test worlds are now seeded
  ([note](../../.agents/notes/implemented/testing/2026-09-19-every-test-world-is-seeded.md)) and the
  helper raises `HumanClubCannotFieldElevenError` instead of letting `match/start.ts` take the blame.
  Proved by a mutant that reproduces the original error at `start.ts:161` on demand. Squad decay past
  season 2 is a game-design gap, filed as
  [decision request 01](decision-request-01-squad-decay-has-no-floor.md).
- [Decision request 01](decision-request-01-squad-decay-has-no-floor.md): answered 2026-09-21, Option B
  then A. A Youth Intake at each rollover brings every club back to 16, and a readiness advisory warns
  before the human club's squad runs short. Tickets [07](issues/07-youth-intake-at-rollover.md) and
  [08](issues/08-short-squad-advisory.md).

- [06 — the environment pragma](issues/06-pragma-lint-rule.md): `vitest-environment-pragma` added to
  `scripts/effect-lint.ts`, non-AST like the line ceiling. It fires on a *mention* as well as a use,
  because that is the actual bug — ticket 04's guard was disabled by prose explaining the pragma, and
  vitest cannot tell the two apart. Proved twice: an 8-case spec covering both firing and silence,
  and a demonstrated red run on a real test file. `career-harness.tsx` aligned on
  `import.meta.dirname`, its comment corrected — jsdom rewrites the `new URL(...)` pattern, not
  `import.meta.url`.

## Not yet specified

Nothing. The pragma-vs-projects question graduated into [04](issues/04-vitest-projects-split.md):
100 of 144 renderer test files already carry the pragma and 0 of 63 main tests do, so the split
exists and is merely hand-written. It is sequenced after ticket 03 so it moves against a baseline
with no outstanding assertion failures.

## Out of scope

- The `oxlint` **warnings** (~30, mostly `no-console` in `.scratch/vendor-quarantine/` and
  `tmp-probe/`). The gate fails on errors; warnings are noise to be triaged separately.
- e2e. `check:all` does not include it.
