# 17: Stoppage-time and half-time minutes read as second-half minutes

**What to build:** The Match Report timeline (`matchReport/MatchReportScreen.tsx`) and the Post-Match
Summary (`match/PostMatchSummary.tsx`) print each event's raw `minute`. In the engine
(`packages/game-engine/src/match/simulate/loop.ts`), a first-half stoppage event carries a minute
above 45, and half-time substitutions are stamped 45 after those events. A first-half stoppage goal
therefore reads "47'", the same as a second-half goal at 47. The timeline can also read 47', 45', 46'.
The report view already sends `half` for each event. Decide how a minute is shown (for example `45+2'`
for first-half stoppage) and apply that rule on every match screen that shows minutes.

**Blocked by:** None

**Status:** resolved

- [x] One display rule for minutes, covering first-half stoppage, half-time changes and second-half stoppage
- [x] Match Report and Post-Match Summary follow it

## Comments

Found in review of [ticket 11](11-match-report-screen.md). Related:
[ticket 16](16-live-commands-stamped-by-revealed-minute.md) (commands stamped by minute).
