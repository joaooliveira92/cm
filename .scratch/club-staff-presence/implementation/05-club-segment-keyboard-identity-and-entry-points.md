# 05: The club segment's keyboard identity and the two club drill-downs' entry points

**What to build:** the answer to a question ticket 03 exposed rather than created — what a
club-scoped route *is* to the keyboard model, and how a league table row reaches two club surfaces
instead of one. Ticket 03 shipped `clubStaff` by pointing the league table row at it; the row was
already the Team Scout Report's only entry point, so the report is now reachable only by typing a
URL. Both problems have the same root, which is why they are one ticket.

**Why they are one root:** every other drill-down in the app hangs off a career screen and inherits
its identity. `tacticsEditor` lives at `/career/$saveId/tactics/editor` and registers with
`screenId="tactics"` — the parent career screen — so `screenIdOfPath` yields `tactics`,
`isCareerScreen` is true, and the career-global actions the editor needs are in the active set
without anything special being said. The club segment hangs off the **save**, not off a career
screen, so `/career/$saveId/club/$clubId/staff` yields the screen id `club`, which is not a career
screen and never will be. There is no parent to inherit from. That is the gap.

**What it costs today:** `KeyboardSpine` registers the career nav handlers on club paths
(`currentScreen === "club"`), but `activeSet` gates career-globals on `isCareerScreen(current)`,
which is false there. The registry and the behaviour disagree: the palette and help overlay do not
list the actions, `available()` is never consulted, and `g b` fires only because the
`complete-prefix` branch dispatches without an availability check. `g b` therefore passes its
acceptance criterion by a bypass. Adding an availability check to prefix completion — a reasonable
hardening nobody would expect to be load-bearing — silently breaks Back on every club surface.

**Decisions to make:**

- **Does a club-scoped drill-down count as "inside a career" for the career-global tier?** The
  three tiers today are app-global, career-global, and screen. A drill-down that inherits a career
  screen's id gets the middle tier for free; one that cannot inherit needs the tier to be defined
  by something other than `isCareerScreen`. Whatever the answer, `screenIdOfPath` and `activeSet`
  should agree on it, so registration and availability stop disagreeing.
- **How does one league table row reach two club surfaces?** Ticket 03 reserved the shape of the
  answer without committing to it: "a `club` parent destination is added only when a second club
  surface exists." A second club surface now exists. Either the row grows a second affordance, or
  it lands on a club destination that offers both, or the report's entry point moves elsewhere and
  the scout report effort's ticket 05 is reopened to say so.

**Blocked by:** none — ticket 03's code ships or does not ship independently of this.

**Status:** ready-for-agent

**Files:** `apps/desktop/src/renderer/keyboard/KeyboardSpine.tsx` (`screenIdOfPath`, the `nav`
branch), `apps/desktop/src/renderer/actions/registry.ts` (`isCareerScreen`, `activeSet`),
`apps/desktop/src/renderer/navigation/destinations.ts`,
`apps/desktop/src/renderer/leagueTable/LeagueTableScreen.tsx`, and the renderer tests covering
club-scoped keyboard scope and league table entry points.

- [ ] A club-scoped route's keyboard identity is defined once, and `screenIdOfPath` and `activeSet`
      agree on it: any action the spine registers on a club path is in that path's active set, and
      any action not in the active set cannot be dispatched.
- [ ] `g b` on a club surface works because Back is available there, not because prefix completion
      skips the availability check. A test asserts the availability path, not just the keypress.
- [ ] The Team Scout Report is reachable from the UI again, and a test asserts its reachability
      that cannot be satisfied by renaming it onto another destination.
- [ ] The Club Staff screen stays reachable, with its own reachability test.
- [ ] If the answer moves the scout report's entry point, `.scratch/team-scout-report/issues/05-club-scoped-route-team-scout-report.md`
      is reconciled in the same commit — its checked entry-point criterion is currently false.
- [ ] `pnpm check:all` is green at this commit.
