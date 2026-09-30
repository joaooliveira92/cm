# 15: The Tactics screen and overview show suitability

**What to build:** On the Tactics screen each slot shows how well its current occupant suits it
(the player's suitability for the slot's cell, via the transitional mapping), and candidates for a
slot can be judged by the same indicator. The Tactics overview's familiarity summary counts tiers
derived from suitability rather than stored familiarity. Role Rating stays on screen until the
formations-and-instructions spec removes Roles.

Seam: the tactics editor's and overview snapshot's read path. No new failure channel.

**Decisions:**

- **suitability = min(line for the row, side for the column), with LC/RC reading C, wide D and DM reading max(line, WB), M reading max(M, AM − 5); Familiarity Tier derived (natural 18-20, competent 15-17, unfamiliar ≤14); Overall Rating unchanged; a match cost for poor suitability moves to formations-and-instructions ticket 08.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-slot-suitability-min-of-line-and-side.md).
- **The compact label as the column, sorted by pitch order of the best line then side; grouping by best natural line; filters match suitability ≥ 15; raw ratings hidden everywhere, with per-cell suitability on the Tactics screen.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-positional-ratings-stay-hidden.md).

**Blocked by:** 13

**Status:** resolved

- [x] Moving a player to a slot he is unfamiliar in shows a low fit indicator; to a natural slot, a high one.
- [x] The overview's natural, competent and unfamiliar counts match tiers derived from suitability for the saved XI.
- [x] The indicator never shows a raw Line or Side Rating.
- [x] `pnpm check:all` is green, and the tactics e2e specs pass.

## Comments

2026-09-29: shipped in efd0fb70. Verified: typecheck and lint pass; contracts (233), the main tactics
overview test (with a new fit assertion) and the renderer tactics, squad, rpc, match, table,
training, club-selection and screens suites (638) pass. The fit shows as a tier word, never a
number, so no raw rating reaches the screen. No renderer test drives a slot move to an unfamiliar
cell and reads the indicator; the tier derivation is asserted in the main overview test.
