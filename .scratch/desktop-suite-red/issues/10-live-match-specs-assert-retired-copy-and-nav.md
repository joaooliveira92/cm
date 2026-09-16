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

**Status:** ready-for-agent

- [ ] Each assertion checks the copy or tab the screen actually shows for the same outcome as before
- [ ] No assertion is dropped. Where a test asserted "Applied or Failed", it still distinguishes success from failure
