# 03: Seven assertion failures that are not environment problems

**These are the ones that matter.** They were hidden for several sprints behind an inaccurate
"61 tests failing `window is not defined`" summary in SPRINT-PLAN. Only 5 were that error. These 7
are assertions about behaviour, and each is either a real defect or a test whose expectation has
legitimately gone stale. **Diagnose each before changing anything.**

Observed signatures:

- `expected [ 'club/training.ts' ] to deeply equal []` — looks like an architectural guard listing
  files that violate a rule. If so, the list being non-empty is the guard working, and the fix is the
  violation, not the expectation.
- `expected [ …(10) ] to deeply equal []` — same shape, 10 entries.
- `expected 'Continue✓SpaceRebind' not to contain '✓'` — UI copy assertion.
- `expected "vi.fn()" to be called 1 times, but got 0 times` — a handler that stopped firing.
- `expected 'false' to be 'true'` ×2, `expected true to be false` ×1.
- Plus `TypeError: Cannot read properties of null (reading 'isServer')` in `useListState`'s
  `useLocation` (`test/renderer/level1-a11y.test.tsx`, 3 failures) — a missing router context rather
  than a missing DOM, so it is not ticket 02's cluster.

For each: state the root cause, then say explicitly whether you are fixing **code** or **expectation**
and why. AUTONOMOUS-AGENT § Failure policy is binding here — never delete, skip, loosen or blindly
regenerate a test to go green, and if a test encodes an ambiguous game rule, stop and ask rather than
guessing. A guard test that is correctly catching a real violation must be fixed by removing the
violation.

If any turns out to be a real product defect too large to fix here, file it as its own ticket and
leave this one's checkbox unticked rather than papering over it.

Acceptance:
- [x] Every one of the 7 diagnosed, with root cause stated
- [x] For each, an explicit code-vs-expectation call with reasoning
- [x] `test/renderer/level1-a11y.test.tsx`'s 3 `isServer` failures resolved or ticketed
- [x] No test skipped, loosened or deleted

**Blocked by:** [02 — DOM environment](02-dom-environment.md)

**Status:** resolved
