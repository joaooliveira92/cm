# 12: Compact squad detail panel over one widened payload

**What to build:** Once a club is chosen, the detail panel carries a compact squad readout built
from data already loaded in the initial read — no second fetch and no loading flash, so scanning
clubs is continuous. The panel shows the board expectation restated as prose from the shared band
table (never the raw min–max pair), labeled **Transfer Budget** and **Wage Budget** rows in
Credits through a shared formatter, squad size and average age as subordinate figures, and the top
five players by overall rating with their name and strongest Position. Before any pick the panel
keeps the league summary the workspace slice built. The read query itself widens so every club
ships its detail up front, computed server-side from the squads it is already loading — its only
new cost is transfer, not computation — and the renderer's currency formatting for this screen
moves to the shared Credits formatter, with the old inline `$` formatting gone. No facilities,
prior-season, or raw player objects cross the boundary, and no per-club RPC exists.

The slice's edge: one widened read query — no new RPC method and no new error channel for the
detail data; the panel fills from the first response, so it has no loading state of its own. The
expectation prose and the currency formatting derive from shared constants and a shared helper,
never from UI-local band tables or format leftovers.

**Decisions:**

- The panel is a compact squad readout — board expectation as prose from the shared constant,
  labeled Transfer/Wage Budget rows in Credits, squad size + average age (subordinate), and a
  top-five-by-`overallRating` players row — shipped in one widened `ClubSelectionView` payload (no
  per-club RPC), with a shared `formatCredits` replacing the inline `$`. See [Agent Note: The club
  detail panel is a compact squad readout over one payload](../../../.agents/notes/implemented/architecture/2026-09-01-club-detail-contract.md).

**Blocked by:** 11 — World-bound selection record that reaches commitCareer.

**Status:** resolved

- [x] The club-selection read returns, per club, the existing row fields plus a compact detail
      block: expectation context, Transfer and Wage Budget, squad size, average age, and the top
      five players by `overallRating` with name and strongest Position — computed from the
      generated squad at query time, never hardcoded onto a club definition.
- [x] The renderer derives the expectation prose from the shared band constant, not from a UI-local
      band table.
- [x] Budgets render as two labeled rows through the shared Credits formatter; no inline `$` /
      `toFixed(0)` formatting remains on this screen.
- [x] The panel fills from the already-fetched payload on pick with no additional method call and
      no loading state for the detail block.
- [x] No facilities or prior-season values appear in the panel.