# 10: Continue advances by date

**What to build:** the game tells the player the date, and Continue moves it. Advancing resolves
everything in the world dated on or before where it lands, so no league is silently behind another,
and it stops only where a playable competition has a fixture, so a background third division playing
on a Tuesday does not interrupt the player. A career begins some weeks before the first league round,
so there is a pre-season to stand in, and a season ends at the last dated fixture of any loaded
competition, cup final included, rather than at a tidy invented end date.

Transfer windows become pairs of dates, so window legality reads the same way in every nation — but
legality is still read through the season's phase, so the existing window checks are untouched.

This is the contract half of the calendar conversion begun in ticket 09. The season row keeps its
singleton shape with a current date replacing its current matchday, the global matchday column and
its 0-to-38 and 1-to-38 bounds are deleted, and the advance sweeps dates rather than round numbers.
Per-competition progress is derived from that competition's own fixture rows and is never stored.

The slice's edge promise: advancing is an effect over the save's SQL client whose observable failures
are the ones it has today — a match that produces no full-time whistle, an archived career. Landing
on a date with no fixture at all is not a failure; it is what the pre-season looks like.

**Decisions:**

- The Calendar becomes date-bearing: fixtures carry an ISO date plus a competition-local round, one
  August-to-May shape serves every nation, Continue resolves everything dated on or before the target
  date and stops only at playable fixtures, `season` stays a singleton keyed on `current_date`,
  Matchday is redefined as a date and Round is the competition-local number, and Transfer Windows
  become date ranges still read through `season.phase`. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-date-bearing-calendar.md).

**Blocked by:** 09.

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/src/main/season.ts` (`startSeason`, `nextCalendarBoundary`, `advanceCalendar`,
`resolveMatchday`, `judgeSeasonEnd`), `apps/desktop/src/main/transfers.ts` (window bounds),
`packages/contracts/src/schemas.ts` and `rpc.ts` (the season view),
`apps/desktop/test/season.test.ts`, `apps/desktop/test/transfers.test.ts`,
`apps/desktop/test/boardObjectives.test.ts`.

- [ ] `season` keeps its singleton row and its phase `CHECK`, with an ISO current date replacing
      `current_matchday`; the `0..38` `CHECK` is gone.
- [ ] `fixtures` no longer carries the global matchday column or its `1..38` `CHECK`.
- [ ] Advancing to a date leaves no unplayed fixture in the world dated on or before it, and lands
      on a date carrying a fixture of a playable competition. A test covers a background competition
      playing on a date the advance passes through without stopping.
- [ ] A career starts in a pre-season some weeks before the first league round, and season
      conclusion fires exactly once per season, after the last dated fixture of any loaded
      competition.
- [ ] Transfer window bounds are month-day pairs rather than matchday numbers, and every existing
      window-legality call site still reads the season phase and is otherwise unchanged.
- [ ] No event payload and no column anywhere carries a field named `matchday`.
- [ ] Per-competition progress is derived from that competition's fixture rows; no column stores it.
- [ ] `pnpm check:all` is green at this commit.
