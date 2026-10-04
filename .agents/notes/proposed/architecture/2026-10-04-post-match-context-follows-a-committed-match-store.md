# Agent Note: The post-match context follows a committed-match store

Status: proposed

## Problem

`Accept result` clears the live session (`clearActiveMatch`) by design: the scoreboard header, the
mid-match command panels and the suspended Continue all key off `getActiveMatch` being null once the
result is committed. But the match screens stay open on the result. Every flat match route
(`/match`, `/match-stats`, `/match-report-latest`, …) parses as `live-match`, because the path alone
cannot say whether the match is live or accepted. So after a commit the tab bar stays **Live Match**,
Report — post-match only — is unreachable, and the Possession bar disappears with the session it
followed.

The route cannot express the phase on its own, and the match id is gone from the session, so a
post-match screen has no other way to name the match it is about.

## Proposal

A module-level **committed-match store** beside `activeMatch` (`match/session/committedMatch.ts`),
single-slot and keyed by save, holding the accepted match's `MatchSummary`.

- `useMatchLifecycle` writes it in the same effect that clears the live session at commit, and a new
  kickoff clears it. The always-mounted career chrome clears it when a *different* Fixture is awaiting
  a kickoff, so advancing the calendar from any screen ends the context rather than leaving the bar
  until Match day is next opened. The season read still naming the just-accepted Fixture while its
  refresh is in flight does not clear it, so the context survives the commit transition.
- `CareerShell`, which can see the store, passes `matchPhaseOverride="post-match"` to `ContextTabs`
  when a committed match exists and no live session does. `ContextTabs` applies the override only to a
  route that already parses as `live-match`, so pre-match and entity contexts keep the phase their path
  names, and Report stays absent live and pre-match.
- `PossessionBar` falls back to the committed match when no live session exists, reading its
  full-time statistics.
- `MatchDayLayout` renders the Post-match Summary from the committed match when a remount leaves it
  with no live match of its own, so a tab click back to Summary shows the result rather than the
  kickoff panel.

## Alternatives considered

**Phase-carrying routes** (`matches/$matchId/post/<tab>`). Rejected: the match id is still needed past
commit — the session is cleared, so the id has to be retained somewhere anyway — and this shape adds a
second route tree and a tab segment for every post-match tab on top of that store, where the override
adds one prop.

**Keep the live session and mark it committed.** Rejected: the scoreboard header, the mid-match
command panels and the Continue suspension all test `getActiveMatch`, and a committed session would
have to be excluded from each, spreading the phase check across every consumer instead of one store.

**Derive the phase from the report read.** Rejected: it makes the tab bar depend on a save-scoped read
for a fact the renderer already holds in hand, and it cannot serve the Possession bar's match id.

## Acceptance criteria

- After a result is accepted the tab bar is Post-match, and Report opens the report for the match just
  played.
- Post-match context survives tab clicks; Latest Scores still resolves the day's results.
- The Possession bar renders on every post-match tab.
- Live and pre-match bars are unchanged; Report stays absent live and pre-match.

## Risks

- The store is in memory, like `activeMatch`; a renderer reload loses the post-match context. Accepted:
  the live session has the same lifetime, and a reload is a fresh match-screen session.
- The Possession bar shows on non-match screens until the next Fixture is awaiting, consistent with
  the live bar following the session across screens.
