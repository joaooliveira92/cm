# 12: `app.spec.ts` expects an `h1` on Squad, and the default view has none

**What to fix:** `app.spec.ts:20` ("Squad opens…") waits for `window.locator("h1")` and fails before
and after ticket 08, also when run alone. The page snapshot shows `main "Squad"` with only an
`h2 "Players (Position(s))"`. The only Squad `h1` is in `SquadTable.tsx`, which the default
position-list view does not render. It probably dates from the squad layout rework (`4470e3e`).

Triage first. Either the missing `h1` is an accessibility defect in the Squad screen (every other
screen owns its section `<h1>`, per the career chrome note), or the assertion is stale.

**Blocked by:** None

**Status:** needs-triage

- [ ] Decided whether Squad should render an `h1`, and the screen or the spec is changed to match
