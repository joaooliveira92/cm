# 24: Add the calendar-sweep index

**What to build:** `fixtures` carries the index `(played, scheduled_date)`, so the calendar advance's
date sweep and `loadCalendarHorizon`'s unplayed-row `MIN`/`MAX` seek instead of scanning. Open
question 20 measured and decided this; this ticket is the execution half. Nothing observable changes
but the query plan and the file size.

**Decisions:**

- `fixtures(played, scheduled_date)` ships. Leading on `played` is the point: the sweep always asks
  for `played = 0` and range-scans the date inside the shrinking unplayed set, which is the only
  candidate with no temp B-tree for the `ORDER BY` and the only one whose per-advance cost is flat
  across the season (5.6 ms at matchday 1, 5.2 ms at 38). `(scheduled_date)` alone is worse than no
  index late in a season (39.6 ms at matchday 38 against 14.8 ms unindexed). Measured: sweep
  636 ms → **208 ms** a season, horizon 1,380 ms → **1 ms** a season, +5.9 MB on a 28.7 MB table,
  ~150 ms of index build, ~194 ms a season of extra write. Full numbers and plans:
  [RESULTS.md](../../../apps/desktop/src/main/db/prototype-scale-probe/RESULTS.md).

**Blocked by:** — (the decision is resolved, and an index is additive).

**Status:** resolved

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/test/main/season/query-plans.test.ts` (the index-count list and a sweep plan check).

- [x] The index on `fixtures(played, scheduled_date)` ships through `pnpm db:generate`, and
      `verify-db-schema` is green.
- [x] A test asserts `EXPLAIN QUERY PLAN` on the date sweep uses the index rather than scanning.
- [x] The index-count test names this index, and still fails if a decisionless index appears.