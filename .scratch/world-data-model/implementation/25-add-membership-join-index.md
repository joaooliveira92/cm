# 25: Add the club-keyed membership-join index

**What to build:** `competition_participants` carries the index `(club_id, season_number)`, so the
club-keyed membership read (`clubStrength` in `season.ts`) seeks the pair instead of scanning the
table. Open question 21 measured and decided this; this ticket is the execution half.

**Decisions:**

- `competition_participants(club_id, season_number)` ships, and the composite rather than `(club_id)`
  alone. The reader walks a club's rows checking the season, and that walk grows by one row per
  season forever because participant rows are never pruned; the composite seeks the pair, so its cost
  is flat in the age of the save. Measured: 8.866 ms → **0.0053 ms** a call, 141.67 s → **0.08 s** a
  Continue at season 20, +8.0 MB on a 28.5 MB table, 77 ms of index build. Full numbers and plans:
  [RESULTS.md](../../../apps/desktop/src/main/db/prototype-scale-probe/RESULTS.md).

**Blocked by:** —

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/test/main/season/query-plans.test.ts` (the index-count list and a membership plan
check).

- [ ] The index on `competition_participants(club_id, season_number)` ships through `pnpm db:generate`,
      and `verify-db-schema` is green.
- [ ] A test asserts `EXPLAIN QUERY PLAN` on the club-keyed membership read uses the index rather than
      scanning.
- [ ] The index-count test names this index.