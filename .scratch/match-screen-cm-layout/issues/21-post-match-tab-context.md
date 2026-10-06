# 21: The post-match tab context

**What to build:** Make the post-match tab bar reachable and correct. After a result is accepted, the
match tab bar should be the **Post-match** bar (Summary, Statistics, Home Stats, Away Stats, Player
Ratings, Report, Commentary, Latest Scores, the conditional Table), stay in that context across tab
clicks, and keep the Possession bar on every tab.

**Why it is missing.** `MATCH_TAB_CONFIGS["post-match"]` and `tabDestination`'s post-match map exist,
and `parseNavState` understands `post-match` and `matches/$matchId/<phase>` segments — but the router
registers no route that yields the post-match context. Every flat `match-*` route parses as
`live-match`, and the `matches/$matchId/<phase>` branch has no registered route (and no tab segment).
So after accepting, the URL stays on `match`, the bar stays **Live Match**, and Report — post-match
only — cannot be reached from the bar. `Report` currently ships with the save-scoped
`getLatestMatchReport` read and is reachable only from the Post-Match Summary links.

**Decide first:** how the phase reaches `ContextTabs`, which sits outside `MatchProvider` and reads only
the URL today. Two shapes:

- a committed-match store (module-level, like `activeMatch`) that `ContextTabs` consults when the route
  is a match route; or
- phase-carrying routes (`matches/$matchId/post/<tab>`), which need the match id retained past commit —
  the session is cleared at commit by design.

Either way, a tab click must not fall back to live-match, and the Possession bar must read the committed
match's statistics (it hides today because `getActiveMatch` is empty post-commit).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] After a result is accepted the tab bar is Post-match, and Report opens the report for the match
      just played.
- [x] Post-match context survives tab clicks; Latest Scores still resolves the day's results.
- [x] The Possession bar renders on every post-match tab.
- [x] Live and pre-match bars are unchanged; Report stays absent live and pre-match.

Supersedes the unreachable half of [17](17-report-in-the-post-match-tab-bar.md); see
[05](05-one-tab-bar-for-two-tab-rows.md) and
[possession is the share of minutes with the ball](../../../.agents/notes/implemented/feature/2026-10-03-possession-is-the-share-of-minutes-with-the-ball.md).

## Answer

A module-level committed-match store, written at commit and cleared when a different Fixture awaits a
kickoff, carries the accepted match past `clearActiveMatch`. `CareerShell` reads it and passes a
`matchPhaseOverride` to `ContextTabs`; `PossessionBar` and `MatchDayLayout` read it directly. The
decision, alternatives and risks are in [the post-match context
note](../../../.agents/notes/implemented/architecture/2026-10-04-post-match-context-follows-a-committed-match-store.md).
