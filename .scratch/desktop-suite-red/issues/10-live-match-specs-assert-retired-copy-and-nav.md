# 10: Live-match e2e specs assert copy and navigation the screen no longer has

**What to fix:** since [ticket 08](08-before-matchday-seed-offers-no-fixture.md), three tests start a
match and then fail on text or navigation the live-match screen dropped:

- `journeys.spec.ts` (AC-33, around :137) and `app.spec.ts` "Match Day starts a match…" (around
  :113) wait for `/Applied — the engine may still reject/`. `647b19e` removed that string, and since
  `45fa6ca` a ChangeTactics command reads "Accepted — the change takes effect from the current
  minute." (`src/renderer/match/commandStatus.ts`). The `/^Applied —/` check for MakeSubstitution
  still matches and needs no change.
- `journeys.spec.ts` Screen 97 test (around :162) clicks `navigation "Live match screens"` → button
  "Substitutions". `f52c2c6` replaced those buttons with `SecondaryNav`, a labelled `<nav>` around a
  `role="tablist"`. Read the exact accessible name from a page snapshot before changing the locator.

A temporary regex change to the Accepted label made the `app.spec.ts` test pass in full, including its
substitution steps.

**Blocked by:** None

**Status:** resolved

- [x] Each assertion checks the copy or tab the screen actually shows for the same outcome as before
- [x] No assertion is dropped. Where a test asserted "Applied or Failed", it still distinguishes success from failure

## Answer

Resolved 2026-09-16. The assertions changed as follows:

- **`app.spec.ts` Match Day test.** The old regex accepted `Applied — …|Failed to submit command`,
  meaning any definitive outcome. It now accepts
  `Accepted — the change takes effect from the current minute.|Rejected — `. A ChangeTactics command
  ends only as `accepted`, or as `rejected` when the call fails (`commandStatus.ts`,
  `useMatchControl.runSubmission`). The pending line still fails the test.
- **`journeys.spec.ts` AC-33.** The old assertion checked for success only, and so does the new one:
  `Accepted — the change takes effect from the current minute.`
- **`journeys.spec.ts` Screen 97.** It now uses `navigation "Live Match tabs"` → `tab "Substitutions"`,
  names read from a live-match page snapshot. The Substitutions screen's `/^Applied —/` check was
  already right.

All three now pass: `pnpm test:e2e e2e/app.spec.ts:90 e2e/journeys.spec.ts:96 e2e/journeys.spec.ts:163`
reported 3 passed. None of the runs after the fix reached full time mid-test, but the baseline
snapshots show that the race in [ticket 11](11-live-match-reaches-full-time-mid-test.md) is real. The
snapshot also shows the tablist named "Squad" on the live-match screen, filed as
[two-row-nav 08](../../two-row-nav/issues/08-match-context-tablist-named-after-the-section.md).
