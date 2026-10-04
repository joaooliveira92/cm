# 16: Statistics read gains possession and defensive totals

**What to build:** `apps/desktop/src/main/match/statistics.ts` moves `possession` out of
`UNAVAILABLE_MATCH_STATISTICS` into a counted row read from the last `PossessionTally` at or before the
revealed position, and adds per-side Tackles won, Interceptions and Headers won. A timeline with no
tally shows possession unavailable, never 0 or 50. The bottom bar shows Possession; Attacks stays a
Statistics row. `computePossession` becomes `attackShare` and is labelled Attacks.

**Decisions:**

- Possession leaves the unavailable list and drives the bottom bar; Attacks stays a row.
  See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-possession-is-the-share-of-minutes-with-the-ball.md)
  and [ticket 11](11-screen-follow-through.md).

**Blocked by:** 12, 13

**Status:** resolved

- [x] Possession is cut at the revealed position and returns the last tally at or before it.
- [x] A pre-change timeline shows possession unavailable, not 0 or 50.
- [x] Tackles, interceptions and headers won read per side; old data reads "-".
