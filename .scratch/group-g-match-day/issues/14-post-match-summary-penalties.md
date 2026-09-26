# 14: Post-Match Summary shows a Cup Tie's penalty outcome

**What to build:** A Cup Tie level after the match is decided on penalties at commit
(`commitMatchday` writes `home_penalties`), and penalties are not Match Events, so the Post-Match
Summary ([ticket 08](08-post-match-summary-enhancement.md)) shows a level score and no winner. Add the
shoot-out result and the competition outcome (who progresses) to `PostMatchSummaryView` and render it.
Screen 99 spec §1/§17 lists competition consequences.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [ ] A Cup Tie decided on penalties shows the shoot-out score and the side that progresses
- [ ] A league Fixture's summary is unchanged
- [ ] Contract roundtrip and main-process tests cover the penalty fields
