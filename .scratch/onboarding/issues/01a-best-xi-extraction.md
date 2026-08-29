# 01a: Extract `selectBestFormationXI` to `packages/shared`

**What to build:** Extract the best-XI algorithm from `pickBestFormationTactic` in `aiClubs.ts` into a pure, partial function `selectBestFormationXI` in `packages/shared/src/bestXi.ts`, and create `packages/shared/src/squadQuality.ts` with the six absolute Squad Quality bands and their exhaustive typed registry. The AI club Tactic assignment wrapper in `aiClubs.ts` calls the shared function, preserving all existing tie-breaks and ordering. No player-facing behaviour changes.

**Decisions:**

- `selectBestFormationXI` is pure and partial: it takes player ids + precomputed position ratings, returns the best formation + slot assignments + mean position rating, and documents its precondition rather than pretending totality. See [Agent Note](../../../.agents/notes/implemented/feature/2026-08-29-squad-quality-summary-bands.md).
- Six absolute bands — Very Weak (<35), Weak (35–41), Competitive (42–48), Strong (49–55), Very Strong (56–62), Elite (≥63) — in `squadQuality.ts` with exhaustive typed registries so drift fails `check:all`. See [Agent Note](../../../.agents/notes/implemented/feature/2026-08-29-squad-quality-summary-bands.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `selectBestFormationXI` exists in `packages/shared/src/bestXi.ts`, taking player id + `Record<Position, number>` ratings, returning chosen Formation, slot assignments, and mean Position Rating
- [ ] `packages/shared/src/squadQuality.ts` owns the `SquadQualityBand` union, six absolute thresholds, and exhaustive label registry
- [ ] `pickBestFormationTactic` in `aiClubs.ts` calls the shared function; `SquadTooSmallError` + `Tactic` construction stay in the wrapper
- [ ] Player ties break on stable player id, formation ties on `FORMATIONS` canonical order; input ordering never changes the result
- [ ] All five supported formations evaluated, greedy slot fill, no player used twice
- [ ] Tests: boundary tests at 35/42/49/56/63; partiality (fails with too-small squad); ties stable; existing AI assignment order preserved
- [ ] `packages/shared/test` seam exercises `selectBestFormationXI` + squad quality thresholds