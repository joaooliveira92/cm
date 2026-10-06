# Agent Note: The post-match context follows a committed-match store

Status: implemented

## Problem

`Accept result` clears the live session (`clearActiveMatch`) by design: the mid-match command panels
and the suspended Continue key off `getActiveMatch` being null once the result is committed. But the
match screens stay open on the result. Every flat match route (`/match`, `/match-stats`,
`/match-report-latest`, …) parses as `live-match`, because the path alone cannot say whether the match
is live or accepted. So after a commit the tab bar stays **Live Match**, Report — post-match only — is
unreachable, and the Possession bar and the scoreboard disappear with the session they followed.

The route cannot express the phase on its own, and the match id is gone from the session, so a
post-match screen has no other way to name the match it is about.

## Decision

A module-level **committed-match store** beside `activeMatch` (`match/session/committedMatch.ts`),
single-slot and keyed by save, holding the accepted match's `MatchSummary` and its final score.

- `useMatchLifecycle` writes it in the same step that clears the live session at commit — taking the
  final score from the `commitMatchday` result, which `MatchSummary` does not carry — and a new kickoff
  clears it. The always-mounted career chrome clears it when a *different* Fixture is awaiting a
  kickoff, so advancing the calendar from any screen ends the context rather than leaving the bar until
  Match day is next opened. The season read still naming the just-accepted Fixture while its refresh is
  in flight does not clear it, so the context survives the commit transition.
- `CareerShell`, which can see the store, passes `matchPhaseOverride="post-match"` to `ContextTabs`
  when a committed match exists and no live session does. `ContextTabs` applies the override only to a
  route that already parses as `live-match`, so pre-match and entity contexts keep the phase their path
  names, and Report stays absent live and pre-match.
- `useMatchScoreboard` falls back to the committed match when no live session exists, so the career
  header stays the scoreboard with `FT` and the final score. Its state carries a `committed` flag, and
  the bottom bar keeps `Continue` available post-match by excluding the committed case from
  `matchInProgress`.
- `PossessionBar`, `MatchDayLayout` and `CommentaryScreen` fall back to the committed match when no
  live session exists — the bar reads its full-time statistics, the layout renders the Post-match
  Summary, and the commentary screen lists the whole match instead of "No match in play".

## Alternatives considered

**Phase-carrying routes** (`matches/$matchId/post/<tab>`). Rejected: the match id is still needed past
commit — the session is cleared, so the id has to be retained somewhere anyway — and this shape adds a
second route tree and a tab segment for every post-match tab on top of that store, where the override
adds one prop.

**Keep the live session and mark it committed.** Rejected: the mid-match command panels and the
Continue suspension test `getActiveMatch`, and a committed session would have to be excluded from each,
spreading the phase check across every consumer instead of one store. The scoreboard is served instead
by letting the committed store carry the final score and the header fall back to it.

**Derive the phase from the report read.** Rejected: it makes the tab bar depend on a save-scoped read
for a fact the renderer already holds in hand, and it cannot serve the Possession bar's match id.

**Let the scoreboard end at Accept.** Rejected: [ticket 05](../../../../.scratch/match-screen-cm-layout/issues/05-one-tab-bar-for-two-tab-rows.md)
promises the match header persists across the post-match tabs, and the final score is free in the
commit result.

## Consequences

- After a result is accepted the tab bar is Post-match, Report opens the report for the match just
  played, and the scoreboard stays up with `FT` and the final score until a new Fixture is awaited.
- Post-match context survives tab clicks; Latest Scores still resolves the day's results, Commentary
  lists the whole match, and the Possession bar renders on every post-match tab.
- Live and pre-match bars are unchanged; Report stays absent live and pre-match.
- The store is in memory, like `activeMatch`; a renderer reload loses the post-match context. Accepted:
  the live session has the same lifetime, and a reload is a fresh match-screen session.
- The Possession bar shows on non-match screens until the next Fixture is awaiting, consistent with
  the live bar following the session across screens.
