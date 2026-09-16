# 08: The before-matchday seed no longer offers a fixture, so Match Day has no `Start match`

**What to fix:** four e2e tests reach Match Day and then fail waiting for a `Start match` button:
`router.spec.ts:184`, `journeys.spec.ts:92` and `:158`, and `keyboard.spec.ts:158`. The page snapshot
the navbar-keyboard-intent 03 implementator read showed "Calendar: Season 1 · Pre-season" and "No
Fixture is waiting. Continue the career to reach your next one." The review of that ticket did not
find this cause in the saved logs, so re-observe it first.

`router.spec.ts:184` enters with `enterCareer`, the other three with `seedBeforeMatchday`. Check
whether both seeds changed, or whether the match-day screen changed what it needs. Repo memory notes
that Continue now costs a played Matchday and that advance loops in tests must go through
`boundary-helpers.ts`. That is a likely suspect.

**Blocked by:** None

**Status:** resolved

- [x] The cause is observed in a page snapshot, not inferred
- [x] The four tests reach a startable match again, without loosening what they assert afterwards

## Answer

Resolved 2026-09-16. **Observed:** the baseline `error-context.md` page snapshots of all four failing
tests show "Calendar: Season 1 · Pre-season" and, under `main "Match day"`, "No Fixture is waiting.
Continue the career to reach your next one." That is `KickoffPanel.tsx`'s literal copy for
`pending === null`. The code then confirmed the cause.

Cause, all from `f1c5681`:

- The Calendar stops before the human club's Fixture, and Match Day offers a match only when a
  Fixture is waiting. `seedBeforeMatchday` was a bare `createSave`, so it stood in pre-season, as
  did `enterCareer`'s fresh save in `router.spec.ts`.
- The kickoff buttons are "Play match" and "Quick result". Nothing is named "Start match" any more.
- The Tactic fallback is gone, so the router test also has to set a Tactic.

The memory note about Continue costing a played Matchday was not the mechanism. One `advanceCalendar`
reaches the boundary and plays nothing.

Fix: `seedBeforeMatchday` runs one real `advanceCalendar` and fails with `NoPendingFixtureError` if no
Fixture is waiting. It can always reach one, because league round 1 precedes every cup date and
fixture generation refuses odd club counts. `router.spec.ts` uses that seed and sets a Tactic. The
locators now say "Play match". `app.spec.ts` "Match Day starts a match…" had the same cause and was
fixed too. `seed-saves.test.ts` now covers the seed's invariant.

Result: `router.spec.ts:195` and `keyboard.spec.ts:158` pass. `journeys.spec.ts:96` and `:162`, and
`app.spec.ts:90`, now start their match and fail later on problems this ticket had been hiding:
[10](10-live-match-specs-assert-retired-copy-and-nav.md) (retired copy and nav) and
[11](11-live-match-reaches-full-time-mid-test.md) (the match reaches full time mid-test). Also filed:
[12](12-squad-screen-has-no-h1.md) (Squad `h1`) and
[13](13-transfer-bid-spec-collides-on-duplicate-player-names.md) (duplicate generated names).
