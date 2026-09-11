# 05: Match-context navigation

**What to build:** Navigation for the three match states: pre-match, live-match, and post-match. Each context replaces the secondary row with match-specific tabs.

Pre-match (spec §7): activated when the next calendar event is the manager's match. Tabs: Overview, Team Selection, Tactics, Opposition, Past Meetings, Conditions. The user cannot start the match while mandatory lineup requirements are unresolved — the UI must identify each blocking issue.

Live-match (spec §8): activated when a match is in progress. Tabs: Match, Commentary, Statistics, Player Ratings, Tactics, Opposition, Live Table (conditional). The primary progression control changes to match-engine state: Pause, Play, Continue, Skip to Next Highlight, Make Changes, Confirm Changes.

Post-match (spec §9): activated after a match resolves. Tabs: Summary, Statistics, Player Ratings, Commentary, Other Results, Table (when applicable). Post-match state persists and remains accessible after the user continues to later dates.

Route patterns: `/pre-match/:fixtureId/*`, `/live-match/:matchId/*`, `/post-match/:matchId/*`. The existing match state machine determines which context is active; this ticket reads that state and renders the correct secondary row.

**Blocked by:** 03 (SecondaryNav).

**Status:** ready-for-agent

- [ ] Pre-match context shows correct secondary tabs and blocks progression on unresolved lineup issues (identifies each blocking requirement)
- [ ] Live-match context replaces tabs with match-specific set; Live Table appears conditionally
- [ ] Live-match control updates to match-engine state (Pause, Play, Continue, etc.)
- [ ] Post-match context replaces tabs with post-match set; Table appears when applicable
- [ ] Post-match report accessible after user continues to later dates
- [ ] Selecting Tactics during a live match keeps user inside the match context (does not navigate to out-of-match tactics)
- [ ] Tests cover: context activation, tab switching, progression gates