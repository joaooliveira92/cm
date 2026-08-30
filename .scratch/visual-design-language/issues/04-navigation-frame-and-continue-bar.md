# 04 — Navigation frame and Continue/date bar

Type: task
Status: ready-for-agent
Blocked by: 02

## Question

How does the clone render the persistent navigation frame, calendar/date display, and Continue affordance, informed by `docs/ui-elements.md` §7 and the current `App.tsx` career nav?

### Current state

The current renderer has a horizontal tab bar (squad, tactics, transfers, league table, fixtures, match day, season summary) with active-tab highlighting and a "Back to saves" button. There is no date display, no Continue button, no contextual navigation.

### Decisions

1. **Date/Continue bar**: CM 03/04 had a persistent area showing the current game date, a Continue Game button (which changed to "Go to Match" on match days), and navigation between recently viewed screens. Where does this bar sit in the clone's layout? What does it show?

2. **Tab navigation vs hierarchical navigation**: CM 03/04 used a hierarchical navigation — select a club, then select a section (Squad, Tactics, etc.). The current clone uses flat tabs. Should the clone move toward CM's model (club context → sections), keep flat tabs, or do something else? The keyboard-first effort's `g <key>` navigation already assumes global destinations for career screens.

3. **Contextual club navigation**: In CM 03/04, the club area gave access to squad/tactics/training/fixtures/results/staff/finances/information. Some of these are in the clone, some are not. How should the nav bar evolve as new sections are added?

4. **Back/forward navigation**: CM had recently-viewed screen navigation. Does the clone implement navigation history?

5. **Screen title bar**: CM had a contextual title bar showing the current club, section, or player name. The current clone has an `<h1>` heading per screen. Should there be a persistent title bar that's part of the chrome?

6. **Composition with keyboard-first**: The keyboard-first map's ticket 05 (global key map) decided `g <key>` navigation with an explicit registry. The Action registry (ticket 03) makes every operation a dispatchable Action. This ticket's visual frame must align with those interaction decisions — the nav is rendered by the keyboard-first Action model, not independent of it.