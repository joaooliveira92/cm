# 15: Match Incidents and the fixture panel

**What to build:** The live Match tab and the post-match Summary show Match Incidents (each side's
scorers in order of first goal with every minute, "(pen)" on penalty goals, "Sent off: <name> <min>"),
"Score at half time: H-A" once half time is revealed and not before, and a fixture panel with
competition and round, game date, and the home club's ground and city. Incidents come from a
main-process read that is cut at the revealed position live; the screen only composes text. The read
fails as the statistics read does. Defined in [06](06-the-overview-incidents-and-fixture-panel.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] A scorer with two goals reads as one line with both minutes; stoppage minutes use the existing minute formatting.
- [x] A Goal directly after the same player's Penalty event is marked "(pen)".
- [x] The half-time line is absent before HalfTimeReached is revealed.
- [x] The fixture panel shows no referee, weather or attendance.
