# 18: Renderer follow-through

**What to build:** The per-player Home/Away Stats tables and Form rows gain the new columns in CM order;
the Form season block gains Tck and Fls Ag; the Statistics tab gains Possession, Tackles, Interceptions
and Headers won; the bottom bar shows Possession. No new screen and no new match-screen decision. Old
data reads "-". Sequenced after the match-screen fold, column-list, Form and Latest Scores tickets.

**Decisions:**

- The new figures extend the match-screen fold and reads; no new screen.
  See [ticket 11](11-screen-follow-through.md).

**Blocked by:** 14, 16, [match-screen 19](../../match-screen-cm-layout/issues/19-form-tab-recent-games.md), [match-screen 20](../../match-screen-cm-layout/issues/20-form-season-block-and-player-of-the-match.md)

**Status:** resolved

- [x] New columns and rows render live and post-match, cut at the revealed position.
- [x] Possession is on the bar, with both percentages as text and "not tracked" before any tally.
- [x] Old data reads "-"; no pass or completion column exists.
