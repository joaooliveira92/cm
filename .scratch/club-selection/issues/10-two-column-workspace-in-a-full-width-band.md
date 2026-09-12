# 10: Two-column workspace in a full-width creation band

**What to build:** The create flow's shell widens so a step can fill the available height, and the
Club Selection stage renders a two-column workspace: a left rail of clubs beside a right detail
panel. Each rail row carries exactly three facts — the club name, its stature tier, and a
six-segment squad-quality meter with its band label — so a column of clubs reads comparatively.
The panel greets the player with a league summary (club count and stature-tier distribution)
before any club is picked; nothing is auto-selected and there is no empty state. The rail loads
independently of the panel — skeleton rows while loading, and a load failure rendered inline in the
rail so the selector and chrome stay in place. One parent owns the in-screen selection state; the
rail and the panel are sibling children taking props. A selected row is coded redundantly —
selected fill, a left accent bar, and a marker in the row's badge slot — against the single focus
ring, and the selected row keeps its stature-tier badge; a focused row carries only the focus ring.
Board objective and both budgets are detail-panel-only and never appear in the rail.

The slice's edge: the screen renders over the existing single club-selection read — one query in,
one presentable array out, nothing per club. The only failure a caller can observe is the read's
load failure, rendered inline in the rail rather than replacing the workspace. No new services
enter the effect's requirements.

**Decisions:**

- The rail row carries name, stature tier and a squad-quality meter; the panel shows a league
  summary until a club is picked, with no auto-selection and no empty state; the rail loads and
  fails independently of the panel; selection is redundantly coded (fill, accent bar, badge)
  against the single focus ring. See [Agent Note: The Club Selection two-column workspace](../../../.agents/notes/implemented/architecture/2026-09-01-club-selection-workspace-shape.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The creation shell hosts a full-height, full-width step band for this stage; the league and
      manager steps keep rendering correctly (existing create-flow tests stay green).
- [x] A club row shows exactly name, stature tier, and the squad-quality meter; no budget or board
      objective appears in the rail.
- [x] With no club selected, the detail panel renders the league summary — not a spinner, not an
      empty state, not a club.
- [x] The rail shows skeleton rows while loading and renders a load failure inline, with the
      selector slot and `Pick a team for me` chrome still mounted.
- [x] A selected row and a focused row are distinguishable from each other, and a selected row is
      identifiable in greyscale; the selected row still shows its stature tier.
- [x] The rail and the panel render independently of each other; a slow read does not blank the
      whole screen.