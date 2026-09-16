# 06: Three navigation tests sweep hand-kept lists, so a forgotten destination degrades all of them

**What to fix:** `CAREER_SCREEN_TYPES` (`src/renderer/navigation/destinations.ts:132`) is the repo's
codification of "top-level career screen", and several tests sweep it. Nothing forces it to stay
complete. Add a top-level screen, wire the navbar and the router, forget that one array, and every
guard passes:

- `route-index.test.ts`'s "every persistent career screen has a home in some navbar section" passes
  vacuously — the screen simply is not in the array it filters.
- `registry.test.ts:175-203` passes: it pins `CAREER_SCREEN_TYPES.length` to **22** and sweeps a
  hand-listed copy of the names. This is also the frozen literal that ticket 05 was meant to
  eliminate, surviving at a different address — adding a top-level screen still means editing a
  test.
- `adapter-coverage.test.ts:54-75` goes quietly less-covering: `ALL_DESTINATIONS` spreads
  `CAREER_SCREEN_TYPES` and then hand-lists the sub-surfaces. It is currently missing
  `contractExpiry`, `budgetReview` and `transferHistory` — the three most recent screens — so the
  adapter fall-through bug that file exists to prevent is unguarded for all of them. Its own doc
  comment, "over the real set rather than a hand-kept copy of it", is false today.

One omission silently weakens four tests at once. An always-red test is visibly broken; a green
partial guard reads as a guarantee, which is worse.

**Unlike ticket 05's navbar case, a derivable fix exists here**: the `CareerDestination` union is
the real closed set, and an exhaustive sweep over `CareerDestination["type"]` needs no hand-kept
copy. `adapter-coverage.test.ts` is the clearest candidate.

## Also reconcile

`test/renderer/router/stage2.test.ts:85-104` asserts `reached` **equals** `CAREER_SCREEN_TYPES`,
while `route-index.test.ts` asserts only containment. The equality is false today — the navbar
reaches 26 destinations against the list's 22, the extras being `trainingCoaching`,
`transferHistory`, `scoutingAssignment` and `scoutingKnowledge`, all deliberate sub-surfaces. It is
masked because `stage2.test.ts` dies at import in the known jsdom `window is not defined` family.
Whoever repairs that family inherits a red test asserting the opposite of its sibling. Decide which
is intended and leave one.

**Decisions:**

- Found during the desktop-suite-red ticket 05 review, 2026-09-16.

**Blocked by:** None

**Status:** claimed

- [ ] Adding a top-level career screen without updating `CAREER_SCREEN_TYPES` fails some test
- [ ] `registry.test.ts` no longer pins a hard-coded count and name list
- [ ] `adapter-coverage.test.ts` sweeps the `CareerDestination` union exhaustively, covering the
      three missing screens
- [ ] `stage2.test.ts`'s equality and `route-index.test.ts`'s containment no longer contradict
