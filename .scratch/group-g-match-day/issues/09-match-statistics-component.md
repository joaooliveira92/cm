# 06: Match Statistics component (95/100 shared)

**What to build:** A shared `MatchStatsView` component for both live and post-match statistics. The match engine produces events (Goal, ShotOnTarget, ShotMissed, etc.) but no aggregated statistics view model exists yet. This ticket delivers:
- A statistics aggregation projection in the main process
- A shared React component that renders the aggregated stats
- RPC endpoint or view model for the renderer to consume

**Blocked by:** None (can start immediately)

**Status:** resolved

- [ ] Statistics aggregation projection computes shots, shots on target, possession, corners, fouls, cards, offsides — shots, shots on target and cards done; possession, corners, fouls and offsides open on [decision request 02](../decision-request-02-unsimulated-match-statistics.md)
- [x] Aggregated stats are available via a view or RPC endpoint
- [x] `MatchStatsView` component renders the aggregated stats for both teams
- [x] Component works in both live-match and post-match contexts
- [x] Loading and error states are handled

## Comments

**From ticket 08 review.** The Post-Match Summary links here through a destination that carries only
`saveId` (`navigation/destinations.ts`). The match session is cleared at full time, so this screen
cannot learn which match to show from the session: add `matchId` to its destination (and route) when
building it, and update the summary's link in `match/PostMatchSummary.tsx`.

**Shipped (2026-09-14).** `getMatchStatistics` returns team totals (goals, attempts, shots on and off
target, big chances, yellow and red cards, injuries, substitutions) folded from the Match Events by
the pure `aggregateMatchStatistics` in `main/match/statistics.ts`, plus the four statistics the model
does not simulate, named as unavailable. `match/MatchStatsView.tsx` renders them as an accessible
table with each total's definition; `matchStats/MatchStatsScreen.tsx` replaces the stub, and the live
Match day section links to it.

**Live cut by position, not minute.** A live match is cut after the number of Match Events Match day
has revealed (`session.ts` `revealedEvents`; one Commentary Line per event). Minutes repeat across
first-half stoppage time, half time and the second half, so a minute cut counted unrevealed goals or
dropped revealed ones. The same flaw in ticket 07's command stamping is [ticket 16](16-live-commands-stamped-by-revealed-minute.md).

**Deviation: no `matchId` in the route.** The ticket 08 review asked for one. The screen instead binds:
live session → the awaiting Fixture's match (in full only if this renderer saw it reach full time,
otherwise cut at zero) → the controlled club's latest played match, resolved in the main process. It
is correct on every path the app offers today (live button, post-commit summary link). Reached from
history after later matches, it shows the latest match rather than the one first opened. A route
`matchId` settles that when a surface needs to open an older match.

**Review.** Pass 1 NEEDS_REWORK (minute cut wrong around stoppage and half time; view not bound to a
Fixture). Pass 2 NEEDS_REWORK (restart mid-match leaked full totals through the awaiting match id).
Repaired as above; the stale-request race fixed by waiting for the season read.

