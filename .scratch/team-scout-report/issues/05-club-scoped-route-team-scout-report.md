# 05: Club-scoped route and shell entry for the team scout report

Type: task

**What to build:** Navigation to the Team Scout Report as a club-scoped destination, reusing the established reusable club segment. A closed destination union member `teamScoutReport` carries `saveId` and `clubId`, resolved to the club route segment, registered in the navigation adapter, the career shell's route index, and the focus coordinator. The screen is reached from the target club's context (a league table row, which already names a club and is the established entry point for club surfaces); Back is the shell's existing history navigation. The report is a drill-down sub-surface, so it gets no `g` binding and appears in no screen registry that would give it a top-level binding; everything a route needs is the fixed screen id, never the club id, so focus restoration works unchanged.

A route whose `clubId` names no club in the save is the RPC's club-not-found failure, rendered by the screen — never a redirect to another destination.

**Blocked by:** 04 (the report RPC the screen will call).

**Status:** resolved

- [x] Navigating to `teamScoutReport` with a `saveId` and `clubId` resolves to the club route and renders the report screen with the correct target club.
- [x] The target club's context (league table row) can reach the report for that club; other clubs' rows reach other clubs' reports.
- [x] Back from the report returns via history to the surface the manager came from.
- [x] The report destination has no `g` binding and joins no top-level screen registry, matching the drill-down rule.
- [x] A `clubId` naming no club reaches the report screen's club-not-found failure state — it never redirects and never throws.
- [x] Focus restoration after navigating into and out of the report works (the fixed screen id is enough to re-focus).

All screens that follow reuse the same `club/$clubId` segment, so keep the route shape stable.
---

**Comment (club-staff-presence ticket 05):** the league table row's entry point was briefly lost
and has been restored. Ticket 03 of the club-staff-presence effort pointed the row's club-name
button at the new `clubStaff` destination, which was this report's only entry point — for three
commits the report was reachable only by typing its URL, and the spec file guarding that was
renamed onto the new behaviour rather than joined by a sibling, so the suite stayed green.

The row now carries one control per club surface: the club name reaches Club Staff, and a
`Scout report` control beside it reaches this screen. Both are asserted by destination in
`apps/desktop/test/renderer/leagueTable/club-surface-entries.test.tsx`, which is parameterised over
the two surfaces so a future rename cannot satisfy one case by deleting the other. Every criterion
above holds again; nothing here needed rewriting.
