# Where a player's match line lives

Type: grilling
Status: resolved
Blocked by: 02, 04

## Question

The CM Form tab lists, for one player, every recent club fixture with that player's per-match line, and
season totals beneath. Today only the user's own match keeps a timeline (`MatchTimelineRecorded`,
appended in `commitMatchday`); every other fixture is simulated by `resolveFixtureScore` in
`season/matchday.ts`, which keeps the score, conditions and injuries and discards the events. Group D
ruled Player Form out of scope (screen 53, ticket 04) because no per-player match history is modelled.
What record makes Form possible, where is it written, and for which fixtures?

## Answer

**A new `player_match_lines` table, one row per player per squad-bearing fixture, written in the
Matchday's commit transaction for the user's fixture and every AI fixture alike; it stores counts,
never a rating.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-10-03-player-match-lines-are-written-at-resolution.md).
