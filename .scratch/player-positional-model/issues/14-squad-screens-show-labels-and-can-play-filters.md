# 14: Squad, search, transfer and profile screens show compact labels and can-play filters

**What to build:** Wherever a player's position is shown (squad, club squad, player search,
transfer lists, player comparison, player profile), the manager sees the compact CM label. The
position column sorts by pitch order of the player's best line, then side (R, L, C); squad grouping
uses the best natural line; a position filter returns every player who can play there (suitability
15 or more in any cell of the chosen rows and sides). No contract or view carries a raw positional
rating.

Seam: the read models behind those screens and their IPC contracts. No new failure channel: the label
and suitability are derived on read from data the read already holds.

**Decisions:**

- **CM Scout's reconstruction exactly: threshold 15, GK short-circuit, SW/D/DM/M/AM/F-or-S with its M and AM suppression, the F/S rule, no WB, sides in R-L-C order after a space.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-29-compact-position-label-follows-cm-scout.md).
- **The compact label as the column, sorted by pitch order of the best line then side; grouping by best natural line; filters match suitability ≥ 15; raw ratings hidden everywhere, with per-cell suitability on the Tactics screen.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-29-positional-ratings-stay-hidden.md).

**Blocked by:** 13

**Status:** ready-for-agent

- [ ] Every listed screen shows the label from one shared function.
- [ ] Sorting the position column orders GK first and F/S last, then by side R, L, C.
- [ ] A filter for D R returns exactly the players whose suitability for the D R cell is 15 or more, including a wing-back whose D line is below 15 but whose WB line qualifies him.
- [ ] A contract-level test asserts no view schema exposes Line, Side or Free Role Ratings.
- [ ] Renderer tests for the squad table's column, sort and filter pass.
- [ ] `pnpm check:all` is green, and the affected e2e specs pass.

## Comments

2026-09-29: claimed and released unstarted. A parallel session has uncommitted changes in files this
ticket must edit (`SquadTable.tsx`, `ClubSquadScreen.tsx`, the `clubSquad` and `transfers`
contracts); take it once those land.
