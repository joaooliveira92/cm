# 09: Fixtures become competition-scoped and dated

**What to build:** every loaded competition gets a full fixture list, and every fixture carries the
date it is played on and the round of its own competition it belongs to. A fixture now says which
competition it belongs to, which is what makes a league table readable without touching another
competition's fixtures, and it has room for a penalty shootout score.

Dates come from a code-held slot template: one August-to-May shape serves every nation, weekends
before midweeks, cups reserving their slots first. Generation fails loudly rather than double-booking
when a competition's rounds exceed the season's slots. A club never plays twice on one date — upheld
by the generator and a test rather than by an index, because a unique index on either club column
misses a club playing home in a league fixture and away in a cup tie on the same day.

This is the expand half of the calendar conversion. The old global matchday column is still present
and still written for the human's competition, and Continue still walks matchdays, so the change
lands green; ticket 10 removes it and switches the advance to dates. Splitting it this way is what
keeps each half reviewable: the fixture table's shape and the Continue loop are separately large.

The slice's edge promise: scheduling is part of generation's transaction. Exhausting the slot
template is a typed failure a caller can report, not a silent double-booking and not a defect —
it is reachable from a catalogue that describes more rounds than the season holds.

**Decisions:**

- One `fixtures` table serves leagues and cups with nullable penalty scores; cup fixtures materialise
  as their participants become known, with dates still a pure function of round; `results-only`
  competitions get full fixture lists. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-season-fixture-and-cup-schedule.md).
- The Calendar becomes date-bearing: fixtures carry an ISO date plus a competition-local round, one
  August-to-May shape serves every nation, Continue resolves everything dated on or before the target
  date and stops only at playable fixtures, `season` stays a singleton keyed on `current_date`,
  Matchday is redefined as a date and Round is the competition-local number, and Transfer Windows
  become date ranges still read through `season.phase`. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-date-bearing-calendar.md).

**Blocked by:** 06, 07, 23 (the paired-penalty invariant must be assigned to a constraint or to a
writer before the two columns are defined).

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL, a calendar slot-template
module in `packages/shared/src`, `apps/desktop/src/main/season.ts` (`generateRoundRobinFixtures`,
`startSeason`, `getFixtures`), `apps/desktop/test/season.test.ts`,
`apps/desktop/test/db-schema.test.ts`.

- [ ] `fixtures` has an integer primary key in place of its text one, and gains a competition
      reference, a competition-local round with `CHECK round >= 1` and no upper bound, an ISO
      scheduled date, and nullable home and away penalty columns. Its `CHECK played IN (0,1)` is
      unchanged, and no club id is nullable.
- [ ] There is no winner column and no separate cup-tie table; goals plus penalties determine a
      winner.
- [ ] Every loaded competition, including a `results-only` one, gets a full league fixture list at
      season start, with dates from the shared slot template.
- [ ] A test asserts no club holds two fixtures on one date in a generated world, and that
      generation raises a typed failure rather than double-booking when a competition's rounds
      exceed the season's slots.
- [ ] The old global matchday column is still present and still populated, and the existing Continue
      loop and its tests are unchanged by this ticket.
- [ ] The fixture list read path returns the date and the round.
- [ ] `pnpm check:all` is green at this commit.
