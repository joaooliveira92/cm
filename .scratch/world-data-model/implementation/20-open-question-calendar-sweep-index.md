# 20: [Open question] Is there an index for the calendar advance's date sweep?

**Type:** open question — a decision, not execution. Do not implement an answer from this file; the
answer does not exist yet.

**The question, unanswered:** the date-bearing calendar makes "every unplayed fixture scheduled on or
before this date" the hot query of every Continue, replacing the season-and-played scan the scale
probe measured. No decision in the world-data-model map prices an index for it, and the shipping
fixture index does not serve it — that index leads on the competition, and the sweep names no
competition. So the sweep's cost at world scale is unknown, and whether an index on the scheduled
date, or a composite over the scheduled date and the played flag, is worth its write cost is
undecided.

The map did not reach this. It is recorded here rather than answered because guessing an index is how
a save acquires cost nobody priced, and because the whole point of the index list being two is that
each entry is measured.

**What would settle it:** a measurement against the existing prototype scale-probe harness at
`apps/desktop/src/main/db/prototype-scale-probe/`, extended to the dated fixture shape. Generate a
representative world — the probe's documented ceiling is 16,000 clubs, 400,000 players, and roughly
304,000 league fixtures per season — and record, for the sweep query:

- the unindexed cost and the query plan;
- the cost and plan with an index on the scheduled date alone;
- the cost and plan with a composite over the scheduled date and the played flag;
- each candidate's byte cost and its added generation time, in the probe's own units.

Then decide, and record the decision the way the spec records the other two: the query it serves, its
measured value, and its cost — or a per-table line saying why it is unindexed. If the answer is an
index, adding it is a small follow-up ticket; the shape on disk does not otherwise change.

**Blocked by:** 10 (the sweep query only exists once the advance is date-driven).

**Status:** ready-for-human

**Files:** `apps/desktop/src/main/db/prototype-scale-probe/calendar-sweep-index-probe.ts` and its results document;
`apps/desktop/src/main/db/schema.ts` only if the answer is an index.

- [x] The sweep is measured at the probe's representative world, unindexed and under each candidate
      index, with query plans recorded.
- [ ] A decision is recorded with its measured value and its cost, in the same units as the two
      shipping indexes.
- [ ] If the answer is an index, a follow-up implementation ticket exists for it; if it is not, the
      fixture table's unindexed-by-choice line says so and why.

## Measured, not answered

The measurement the ticket asked for is done — `calendar-sweep-index-probe.ts` and the *calendar
advance's date sweep* section of
[RESULTS.md](../../../apps/desktop/src/main/db/prototype-scale-probe/RESULTS.md). The decision is
still open, and this file is still `ready-for-human`.

What the numbers say, at 800 competitions and 304,000 live fixtures played through a whole season:

| Candidate | File | Sweep / season | Horizon / season | Mark-played / season |
|---|---|---|---|---|
| Shipping index only | 28.7 MB | 636 ms | 1,380 ms | 1,380 ms |
| `+ (scheduled_date)` | 34.3 MB | 887 ms | 58 ms | 1,403 ms |
| `+ (scheduled_date, played)` | 34.6 MB | 385 ms | 6 ms | 1,592 ms |
| `+ (played, scheduled_date)` | 34.6 MB | 214 ms | 1 ms | 1,574 ms |

Three findings the question did not anticipate, and each of them bears on the decision:

- **The date alone is worse than no index.** It leads on a range that widens as the season runs, so
  matchday 38 costs 39.6 ms against 14.8 ms unindexed. The candidate the ticket names first is the
  one to rule out.
- **`played` belongs before the date.** Leading on the flag seeks to the shrinking unplayed set and
  range-scans the date inside it — the only plan with no temp B-tree for the `ORDER BY`, and the only
  one whose per-advance cost is flat across the season (5.4 ms at matchday 1, 5.3 ms at 38).
- **The horizon read, not the sweep, is where the cost is.** `loadCalendarHorizon`'s `MIN`/`MAX` over
  unplayed rows costs 1,380 ms a season unindexed — more than double the sweep — and 1 ms under
  `(played, scheduled_date)`. The ticket priced the wrong query; the same index serves both.

Cost, in the spec's units: 5.9 MB on a 28.7 MB table, ~153 ms of index build, and ~194 ms a season of
extra write on marking fixtures played, against ~2,600 ms a season saved on reads.

What is left is the call itself, and it is a real one: a two-value leading column is normally the
argument *against* an index, and adopting `(played, scheduled_date)` means saying why this query is
the exception. Whoever takes it should record the answer in the spec's form — the query it serves,
its measured value, its cost — or a per-table line saying the fixture table stays as it is and why.
