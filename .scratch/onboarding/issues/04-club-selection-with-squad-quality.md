# 04: Club selection screen with Squad Quality

**What to build:** A mandatory club selection step (Step 2 of the creation flow — the stepper UI itself is built by ticket 05) where all 20 generated clubs are freely selectable with no reputation gate, no default, and no Archetype interaction. The screen shows a compact list (club identity, Stature Tier, Board Objective, Squad Quality band) plus a detail panel (Transfer Budget, Wage Budget, expectation context). Squad Quality is derived on read via `selectBestFormationXI` as one of six absolute bands. `is_user_club = index === 0` is deleted everywhere; club ownership is by stable `clubId`.

**Decisions:**

- All 20 clubs freely selectable after world generation, chosen by stable `clubId` and committed atomically; the screen states resources, squad, and expectations explicitly but never as a numeric difficulty score; Archetype and club stay orthogonal. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-club-selection-at-new-game.md).
- Squad Quality is the mean Position Rating of the strongest formation-valid XI, cut into six absolute bands, derived on read and never persisted; Squad Depth and the Challenge label are both removed. See [Agent Note](../../../.agents/notes/implemented/feature/2026-08-29-squad-quality-summary-bands.md).

**Blocked by:** 01a (needs `selectBestFormationXI`), 02 (needs persisted budgets via lifted `initializeSeasonEconomy`)

**Status:** ready-for-agent

- [ ] All 20 generated clubs selectable; no reputation gate, Archetype gate, or default selection
- [ ] Compact row: club identity, Stature Tier, Board Objective, Squad Quality band
- [ ] Detail panel: Transfer Budget, Wage Budget, expectation context
- [ ] No Challenge label, no Challenge prose, no Squad Depth, no numeric difficulty score, no raw Squad Quality score
- [ ] No last-season position shown
- [ ] Club selection by stable `clubId`; `is_user_club = index === 0` deleted; no derivation from collection order or display order
- [ ] Archetype and club stay orthogonal; no recommended pairings, no optimal-Archetype labeling
- [ ] Board Objective shown on the screen reads from `BOARD_OBJECTIVE_BANDS[statureTier]` (the same constant `startSeason` uses), not from a row; the persisted row is created only for the selected club at `commitCareer`
- [ ] Cross-tier inversions displayed honestly; Squad Quality never clamped, smoothed, or banded within tier
- [ ] `SQUAD_COMPOSITION` unchanged
- [ ] Tests: `selectBestFormationXI` partiality; Squad Quality bands at shared-package seam; every club selectable; commitment by stable id