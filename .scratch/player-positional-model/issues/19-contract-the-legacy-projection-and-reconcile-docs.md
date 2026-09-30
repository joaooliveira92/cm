# 19: Contract: delete the legacy position projection and reconcile the docs

**What to build:** No code reads the transitional (Position, Familiarity Tier) projection or any
stored-familiarity shape any more, so both are deleted. `CONTEXT.md`'s Position and Familiarity
Tier entries are rewritten for the new model and Slot and Suitability are added; this effort's
proposed Agent Notes move to `implemented/`; notes that described the old model get their
supersession blocks. The `Position` type and the transitional Position-to-cell mapping stay: the
Tactic still uses them until the formations-and-instructions spec replaces it.

Seam: a deletion with no behaviour change.

**Decisions:**

- **Line × side, as CM stored it: eight 1-20 Line Ratings (GK, SW, D, DM, M, AM, F, WB) and three 1-20 Side Ratings (R, L, C), persisted like Attributes but not Attributes, in one row per player replacing `player_positions`.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-players-store-cm-line-and-side-ratings.md).
- **A slot is its own (row, column) type: rows GK, SW, D, DM, M, AM, F and columns L, LC, C, RC, R; Position Weights keyed by row and width (twelve tables, four new); phase by row.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-slots-are-row-column-cells-weighted-by-row-and-width.md).
- **suitability = min(line for the row, side for the column), with LC/RC reading C, wide D and DM reading max(line, WB), M reading max(M, AM − 5); Familiarity Tier derived (natural 18-20, competent 15-17, unfamiliar ≤14); Overall Rating unchanged; a match cost for poor suitability moves to formations-and-instructions ticket 08.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-slot-suitability-min-of-line-and-side.md).
- **CM Scout's reconstruction exactly: threshold 15, GK short-circuit, SW/D/DM/M/AM/F-or-S with its M and AM suppression, the F/S rule, no WB, sides in R-L-C order after a space.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-compact-position-label-follows-cm-scout.md).
- **Retraining only: one line-or-side target per player, rising through the weekly training tick, no decay, no growth from playing.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-positions-retrain-through-training-only.md).
- **The compact label as the column, sorted by pitch order of the best line then side; grouping by best natural line; filters match suitability ≥ 15; raw ratings hidden everywhere, with per-cell suitability on the Tactics screen.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-positional-ratings-stay-hidden.md).

**Blocked by:** 14, 15, 16, 17

**Status:** ready-for-agent

- [ ] No source file references the legacy projection or a stored familiarity value.
- [ ] `CONTEXT.md` has no stored-familiarity or ten-Position definitions, and defines Line Rating, Side Rating, Free Role Rating, Slot and Suitability.
- [ ] Every Agent Note linked above is under `implemented/`, and superseded notes carry their blocks.
- [ ] `pnpm check:all` is green, and the full e2e suite passes.
