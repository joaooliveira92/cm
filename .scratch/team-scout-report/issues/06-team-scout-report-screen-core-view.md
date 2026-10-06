# 06: Team Scout Report screen — core view

Type: task
Status: resolved

**What to build:** The Team Scout Report screen (screen 49), the first pass showing everything a report contains. The user lands on it aimed at a target club and sees: a header naming the scout, the report's updated date, and its knowledge confidence; the predicted formation and the target's recent form; the strengths and weaknesses findings; the key players (the scouted members, each opening a visible player profile); and the set-piece findings. A tab shell is present — Squad, Tactical View, Previous Reports, Assign Scout — with the non-first-pass tabs present but disabled and labelled as not yet available. An action opens the upcoming fixture against the target club.

The screen distinguishes the seven view states — loading, ready, refreshing, empty, filtered_empty, permission_limited, unavailable, error — and preserves the last valid view during a recoverable refresh failure (spec §10). Unknown information stays Unknown on screen; hidden exact attributes never surface through prose or sorting. Back and keyboard/assistive-technology access come from the shell's shared controls; asynchronous requests are cancellable so a late response from a prior club or revision is discarded. All text renders as text, never as untrusted structured content.

**Blocked by:** 05 (the club-scoped route and shell entry).

**Status:** resolved

- [x] Reading the report for a scouted target shows header (scout, updated date, knowledge confidence), formation, recent form, strengths, weaknesses, key players, and set-piece findings.
- [x] The tab shell renders Squad, Tactical View, Previous Reports, and Assign Scout; non-first-pass tabs show an explicit not-yet-available state rather than functioning.
- [x] Opening the upcoming fixture against the target from the report navigates to that fixture.
- [x] The screen distinguishes loading, ready, empty, permission-limited, unavailable, and error states — each as its own distinguishable view, never color alone.
- [x] A late asynchronous response from a previously viewed club is discarded (stale-response test).
- [x] No hidden exact attribute of a below-Fully-Scouted player renders anywhere on the screen.
- [x] Keyboard-only and assistive-technology users can reach every visible information item and action.
- [x] Focus returns to the entry point after navigating back from the report.
## Answer

Resumed on 2026-09-13 from an abandoned claim. The last work was `eacef5d` (2026-09-07), the pure
view-state machine; the screen half was never started.

- `scouting/TeamScoutReportScreen.tsx` now holds the admitted report separately from the atom.
  `admitReport` gates arrivals by club, and a report admitted for a previous club is never a fallback
  for the current one. `reportViewState` picks the state, which is exposed as `data-report-state`.
  A `RemoteFailure` is unwrapped to its domain tag, so `ClubNotScoutedError` reads as `empty` and
  `ClubNotFoundError` as `unavailable`.
- `scouting/reportSections.tsx` holds the read-only sections and `upcomingFixtureAgainst`. That
  function matches the human club (from `getSquad`, the one renderer read that names it by id) and
  the target by id on both sides, then picks the earliest unplayed meeting. The action opens Match
  day when the Calendar is stopped at that Fixture and Fixtures otherwise, since a later Fixture has
  no screen of its own.
- Tab shell: Squad (key players, each opening `playerDetail`), Tactical View (predicted formation and
  set-piece findings), and Previous Reports and Assign Scout, whose panels say "Not yet available"
  and point at tickets 08 and 07. The tabs stay enabled rather than `disabled` so keyboard and
  assistive-technology users can reach the explanation.
- Ability renders as `low–high`, and as one figure only when the wire's bounds coincide.

Proven by `apps/desktop/test/renderer/scouting/team-scout-report-screen.test.tsx`: contents, tabs,
both fixture destinations, the player link, all five reachable view states, the range-only ability,
and a late response for the previously viewed club being discarded. Focus return after Back comes from
the shared `RouteView` restoration that ticket 05 already verified; this ticket adds no test of its own for it.
