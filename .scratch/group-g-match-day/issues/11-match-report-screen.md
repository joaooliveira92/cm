# 08: Match Report screen (103)

**What to build:** A match report screen showing a narrative summary of the match — key events timeline, goalscorers, cards, substitutions, injuries, and match statistics summary. No report generation logic exists yet. This ticket delivers:
- Match report generation logic in the domain layer
- A React component that renders the report
- RPC endpoint or view model for the renderer to consume

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Match report generation produces a structured summary of all key events
- [x] Report includes goalscorers, cards, substitutions, injuries, and final score
- [x] Report screen renders the narrative summary
- [x] Screen is accessible via the post-match tab navigation
- [x] Loading and error states are handled

## Comments

**From ticket 08 review.** The Post-Match Summary links here through a destination that carries only
`saveId` (`navigation/destinations.ts`). The match session is cleared at full time, so this screen
cannot learn which match to show from the session: add `matchId` to its destination (and route) when
building it, and update the summary's link in `match/PostMatchSummary.tsx`.

**From ticket 09.** Ticket 09 did not add `matchId` to its route; that is recorded as a deviation on
[ticket 09](09-match-statistics-component.md), not a settled pattern. Its screen binds, in order: the
live session's match, cut after `getRevealedEvents` (a timeline position — minutes repeat across
stoppage time and half time, so never cut a live view by minute); the started Fixture awaiting its
result (`season.awaitingFixture.matchId`) — in full only when `reachedFullTime` says this renderer saw
it finish, otherwise cut at zero, since that id is set from kickoff and survives a restart; else `matchId: null`, which the main process resolves to the
controlled club's latest played match. A ratings or report screen that follows it inherits the same
limitation when reached from history after later matches.

## Answer

Implemented. `getMatchReport` (`apps/desktop/src/main/match/report.ts`) re-derives the match stream
and returns the final and half-time score, every Goal, card, Injury and Substitution in match order
with names, and the full-match statistics from ticket 09. It refuses with `MatchNotCompleteError`
until the Fixture's result is committed. Otherwise the report would be reachable by address and could
show a timeline ahead of Match day. The screen writes the result as one sentence and lists
goalscorers per side, the timeline and the statistics table.

The destination and route now carry `matchId` (`/career/$saveId/match-report/$matchId`), as the
ticket 08 review asked. The Post-Match Summary's link passes it.

Also fixed: a whole-match statistics read returned `throughMinute: 0` instead of `null`, so full-match
statistics showed "Up to 0'".

Not in scope: Screen 103's lineups, formations, officials, attendance and match-revision binding.
Follow-up: [17](17-stoppage-minutes-read-as-second-half.md) (how stoppage-time minutes are shown).
