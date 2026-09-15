# 13: Mount the match tab bar so live-match screens are reachable by tab

**What to build:** `navigation/components/SecondaryNav.tsx` and `navigation/match-nav-config.ts` define
pre-, live- and post-match tab sets, but `SecondaryNav` is mounted nowhere in `apps/desktop/src`, and
nothing routes a tab id to the flat `match-*` routes. Tickets 06 and 07 list "accessible via the
live-match tab navigation" as a criterion that cannot hold until this exists; ticket 07 shipped
buttons on the live Match day section instead. The live tab set also has no Substitutions tab.

Found in review of [ticket 07](07-tactics-substitutions-ui.md).

**Blocked by:** None (can start immediately)

**Status:** needs-triage

- [ ] The match tab bar renders on Match day and the match sub-screens
- [ ] Each live-match tab navigates to its screen, including Tactics and Substitutions
- [ ] Each post-match tab (Summary, Statistics, Player Ratings, Report) navigates to its screen —
      ticket 08's criterion "accessible via the post-match tab navigation" lands here
- [ ] Decide whether the ticket 07 and 08 buttons stay once the tab bar exists
