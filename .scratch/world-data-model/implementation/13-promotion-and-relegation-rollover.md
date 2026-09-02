# 13: Promotion and relegation at the season rollover

**What to build:** a career has a direction beyond one table. At the end of a season the final
standings are frozen onto the participant rows, and clubs exchange divisions along the graph's
links: the same number up as down, so a division keeps the same number of clubs every season and
parallel regional divisions feed the division above them correctly. The lowest division the player
loaded never relegates anyone out of the world — the world is closed at the edge of the chosen
scope, and choosing a wider scope is how a player buys the drop.

A club promoted out of a `results-only` division arrives with a squad, generated so its strength
matches how it was performing, so its first fixture does not contradict its last. A club relegated
into a `results-only` tier loses its player rows, and that deletion is irreversible: player identity
does not survive the round trip. If a later effort ever makes results-only players visible, that
deletion becomes user-visible data loss and the depth decision must be reopened rather than patched.

Freezing happens once, at season conclusion: after the rollover the previous season's final
positions are readable without recomputing anything from fixtures.

The slice's edge promise: the rollover is one effect inside the advance's existing transaction, so a
world is never half-promoted. A links graph whose exchange would change a division's size is a defect
caught by ticket 05's symmetric slot count, not a failure this ticket handles.

**Decisions:**

- The catalogue stays code and the save records the resolved world: an activated-only `competitions`
  table, symmetric Exchange Links carrying promotion and relegation as one fact, a closed world at
  the edge of the chosen scope, and membership answered from participant rows rather than a column.
  See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-01-competition-graph-and-promotion.md).
- One `competition_participants` table carrying frozen final positions replaces both the `season`
  generalization and ticket 02's unnamed per-Season row. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-season-fixture-and-cup-schedule.md).

**Blocked by:** 07, 10, 11.

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/season.ts` (season conclusion and the new season's start),
`apps/desktop/src/main/worldGeneration.ts` (generating a squad for a promoted results-only club),
`apps/desktop/test/season.test.ts`.

- [ ] At season conclusion every participant row for that season is frozen with its final position,
      points, goal difference, and goals for, and a test asserts the frozen table survives into the
      next season unchanged.
- [ ] Clubs are exchanged along every link with the link's slot count in both directions, and a test
      asserts every division's participant count is identical in season 2 and season 1.
- [ ] A test covers a pyramid whose tier below is two parallel regional divisions feeding one
      division above.
- [ ] No club is relegated out of the lowest loaded competition and none is promoted out of the
      highest, and a test asserts it.
- [ ] A club promoted out of a `results-only` division has a full squad at the start of the next
      season, generated to a strength consistent with its Results Strength in its last one.
- [ ] A club relegated into a `results-only` division has its player rows deleted, together with
      everything keyed on those players.
- [ ] `pnpm check:all` is green at this commit.
