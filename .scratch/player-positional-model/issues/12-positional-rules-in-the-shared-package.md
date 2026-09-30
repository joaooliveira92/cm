# 12: The positional rules in the shared package

**What to build:** The pure rules every later slice reads, with no behaviour change anywhere in the
app yet. The shared package gains: the twelve positional ratings (eight Line Ratings, three Side
Ratings, the Free Role Rating) as a type on 1-20; the Slot as a (row, column) type with pitch-order
sorting and display (`D RC`); phase by row; suitability of a player for a cell; the Familiarity Tier
derived from suitability; the compact label; Position Weights keyed by row and width, with the four
new tables (SW, DM wide, AM wide, F wide) authored as design values; Position Rating and Overall
Rating over cells; and the transitional mapping from today's ten Positions onto cells (DC → D C,
DL → D L, DR → D R, DM → DM C, MC → M C, ML → M L, MR → M R, AMC → AM C, ST → F C, GK → GK), which the
formations-and-instructions spec later deletes.

Seam: pure functions, no services, no error channel; invalid inputs are unrepresentable by type (a
rating outside 1-20 is a defect caught at the storage boundary in ticket 13, not here). See [the spec](../spec.md),
Testing Decisions, seam 1.

**Decisions:**

- **Line × side, as CM stored it: eight 1-20 Line Ratings (GK, SW, D, DM, M, AM, F, WB) and three 1-20 Side Ratings (R, L, C), persisted like Attributes but not Attributes, in one row per player replacing `player_positions`.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-players-store-cm-line-and-side-ratings.md).
- **Free Role is a twelfth 1-20 positional rating, stored with the lines and hidden from every screen; the Free Role player instruction belongs to the formations-and-instructions effort and its effect scales with this rating.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-players-store-cm-line-and-side-ratings.md).
- **A slot is its own (row, column) type: rows GK, SW, D, DM, M, AM, F and columns L, LC, C, RC, R; Position Weights keyed by row and width (twelve tables, four new); phase by row.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-slots-are-row-column-cells-weighted-by-row-and-width.md).
- **suitability = min(line for the row, side for the column), with LC/RC reading C, wide D and DM reading max(line, WB), M reading max(M, AM − 5); Familiarity Tier derived (natural 18-20, competent 15-17, unfamiliar ≤14); Overall Rating unchanged; a match cost for poor suitability moves to formations-and-instructions ticket 08.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-slot-suitability-min-of-line-and-side.md).
- **CM Scout's reconstruction exactly: threshold 15, GK short-circuit, SW/D/DM/M/AM/F-or-S with its M and AM suppression, the F/S rule, no WB, sides in R-L-C order after a space.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-compact-position-label-follows-cm-scout.md).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Suitability returns min(line, side) with each special case covered by a test: LC and RC read C, D L/R and DM L/R read max(line, WB), M reads max(M, AM − 5), GK reads GK only.
- [x] Tiers derive at the stated thresholds (18-20 natural, 15-17 competent, ≤14 unfamiliar), with boundary tests.
- [x] A table-driven label test covers every rule, including the research's worked examples (`AM/F RC`, `D/DM RC`, `D RC`, `AM RLC`, `GK`, an M-suppressed DM, an `S` striker).
- [x] Every one of the 31 cells resolves to exactly one weights table and one phase; the four new tables exist with a comment marking them as design values.
- [x] Phase by row agrees with today's phase table for all ten mapped Positions.
- [x] `pnpm check:all` is green.

## Comments

2026-09-29: shipped in 8b2692a8 and review fixes ca2b214f. Verified: `pnpm -r typecheck` and oxlint
exit 0; shared (601 + new), game-engine and contracts suites pass. The desktop suite was not waited
on, at the user's instruction: this ticket adds pure code with no caller yet. effect-lint's one
violation (`actionsRowClasses.ts`) is in a parallel session's staged file, not this change.

Later the same day: the background desktop run finished with 38 failures in 16 files. Ten node files
timed out, consistent with contention from parallel runs. The renderer failures are in club detail,
club information and club staff screens, which a parallel session's staged work touches; this ticket
changed only shared-package exports and the repo typechecks. Not investigated further, per the
user's instruction not to wait on the desktop suite.
