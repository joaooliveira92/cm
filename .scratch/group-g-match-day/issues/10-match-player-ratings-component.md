# 07: Match Player Ratings component (96/101 shared)

**What to build:** A shared `MatchRatingsView` component for both live and post-match player ratings. No ratings computation exists yet. This ticket delivers:
- A player ratings projection in the domain layer
- A shared React component that renders per-player ratings
- RPC endpoint or view model for the renderer to consume

**Blocked by:** [decision request 03](../decision-request-03-match-player-rating-formula.md) (the rating formula)

**Status:** needs-info

- [ ] Player ratings projection computes a rating (1-10) per player based on match events
- [ ] Ratings are available via a view or RPC endpoint
- [ ] `MatchRatingsView` component renders per-player ratings in a list/table
- [ ] Component works in both live-match and post-match contexts
- [ ] Loading and error states are handled

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

**Parked (2026-09-14).** No rating formula exists in CONTEXT.md, the Agent Notes or the engine, and
choosing inputs and weights is a balance decision. The Match Events name only shooters, card and
injury recipients and substituted players, so an event-only formula would give goalkeepers and most
defenders the same rating every match. Options and a recommendation are in
[decision request 03](../decision-request-03-match-player-rating-formula.md). Every criterion here
serves or renders the rating, so no part ships until that is answered. The ticket 08 note above about
adding `matchId` to the destination still applies.
