# 15: Leaving Match day at full time before accepting the result strands the Matchday

**What to build:** When a match reaches full time, `MatchProvider` calls `clearActiveMatch`, dropping
the in-memory session. If the manager navigates away (navbar, palette) before pressing Accept result,
Match day comes back with no match: it offers kickoff again, `startMatch` fails with
`MatchAlreadyStartedError` (`main/match/start.ts`), and the only Accept result control is unreachable.
Keep the session until the result is committed, or rebuild the post-full-time state from the season's
`awaitingMatchId` on arrival.

Found in review of [ticket 08](08-post-match-summary-enhancement.md); ticket 08 avoids adding a new
route out at that moment by showing its review links only after commit.

**Blocked by:** None (can start immediately)

## Status

**Status:** resolved

- [x] Navigating away at full time and back still offers Accept result
- [x] Accepting after that return commits the Matchday once
- [x] A renderer test covers leave-and-return at full time
- [x] Leaving while the commit is in flight (`committing`) is covered too: since ticket 08 no session
      is recorded at `committing`/`committed`, so that return also lands on a missing match
- [x] Returning to Match day after an accepted result shows the next state, not Kick off for the
      committed Fixture: `commitMatchday` (`renderer/rpc/match.ts`) invalidates nothing, and
      `leagueTableAtom` does not revalidate on mount, so `awaitingFixture` stays stale until something
      else refreshes it — ticket 08's review links make this leave-and-return a main path
