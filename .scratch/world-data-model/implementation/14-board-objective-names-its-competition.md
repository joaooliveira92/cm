# 14: The board objective names the competition it judges

**What to build:** the board's verdict on a season says which competition it was judging, rather
than leaving it to be inferred from the fact that there used to be only one. The objective's final
position is read from the frozen participant row for that competition and season rather than
recomputed, so a verdict cannot disagree with the table it was judged against.

A cup run is unjudged in MVP. Whether relegation is automatically a missed objective, and whether a
promoted club's band is recomputed against its new division, are board rules rather than shapes on
disk and are out of scope here.

The slice's edge promise: judging a season reads authoritative frozen state and produces a verdict;
its failure channel is unchanged. A season with no frozen participant row for the judged competition
is a defect, since the rollover freezes before it judges.

**Decisions:**

- One `competition_participants` table carrying frozen final positions replaces both the `season`
  generalization and ticket 02's unnamed per-Season row. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-season-fixture-and-cup-schedule.md).

**Blocked by:** 07, 13.

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/src/main/season.ts` (`judgeSeasonEnd`), `packages/shared/src/board.ts`,
`apps/desktop/test/boardObjectives.test.ts`.

- [ ] `board_objective` gains a competition reference, keeping its one-row-per-season-for-the-human's-club
      shape and its verdict `CHECK`.
- [ ] The objective's final position is read from the frozen participant row for the named
      competition and season, and a test asserts the verdict matches the frozen table.
- [ ] A cup competition is never judged, and a test asserts no objective row names one.
- [ ] `pnpm check:all` is green at this commit.
