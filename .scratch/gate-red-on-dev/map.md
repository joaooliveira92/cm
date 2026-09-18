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

<!-- charting session -->

## Not yet specified

- Whether the DOM-environment cluster is one fix (a per-file pragma) or wants a vitest project split
  (renderer → jsdom by default, main → node). The latter is the real fix if renderer tests keep
  acquiring the pragma by hand, but it is a config change with blast radius across 200 files.

## Out of scope

- The `oxlint` **warnings** (~30, mostly `no-console` in `.scratch/vendor-quarantine/` and
  `tmp-probe/`). The gate fails on errors; warnings are noise to be triaged separately.
- e2e. `check:all` does not include it.
