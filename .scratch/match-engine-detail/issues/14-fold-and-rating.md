# 14: Match Player Line fold and rating weights extend

**What to build:** The pure fold in `packages/shared/src/rules/matchPlayerLine.ts` gains, in CM order
between Key and Off, Tck, Won (tackles, with attempts derived as won + fouls), Hea, Won (headers), Int,
Run (the `RunWithBall` creator) and Fld (counted only where `fouledPlayerId` is present). The Match
Rating gains weights tackle won +0.10, interception +0.10, header won +0.05, foul suffered +0.03, and
`MATCH_RATING_GOAL_AGAINST_SHARE.defense` moves from -0.4 to -0.3. A header lost and derived tackles
attempted carry no weight. The live table, post-match table and stored line still call one fold.

**Decisions:**

- The fold and the rating read recorded involvement; passes, completion and key headers stay absent.
  See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-the-match-player-line-folds-only-recorded-events.md)
  and [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-the-match-rating-reads-recorded-involvement.md).
- Run counts from the `RunWithBall` creator. **The fold note's absent-column list names Run as absent
  and conflicts with [ticket 11](11-screen-follow-through.md); this ticket follows ticket 11 and must
  amend the note's absent list in the same change.**

**Blocked by:** 12

**Status:** resolved

- [x] One test per new column and per rating weight; the defence share is -0.3.
- [x] Tackles attempted equals tackles won plus fouls committed.
- [x] The fold note's absent-column list is amended, or ticket 11 revisited, before the fold changes.
- [x] `matchRating.ts` remains the only file naming a rating weight.
