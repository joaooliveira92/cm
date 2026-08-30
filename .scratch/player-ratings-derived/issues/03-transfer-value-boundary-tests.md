# Transfer Value command-boundary tests

Status: ready-for-agent

## Summary

Add tests proving Transfer Value is derived at the authoritative decision boundary and that a stale
renderer-supplied value cannot influence seller-response or bid-resolution logic.

## Acceptance criteria

- `decideAiSellerResponse` is tested as a pure function: same inputs → same outputs, no DB dependency
- A test verifies the seller-response resolver re-derives Transfer Value from current player state
  (Attributes, age, Potential Ability), not from a Bid's `amount` or any precomputed value
- A test verifies that if Attributes change between a market-screen read and a bid, the
  bid-resolution outcome uses the *current* value, not the stale one (via direct DB mutation
  between the two)
- Formula determinism tests: same authoritative inputs produce identical Transfer Value
- Age-sensitivity tests: age changes produce the formula-defined result
- Potential Ability contribution is tested without exposing it as player-visible

## Rationale

The code already follows this pattern (see `transfers.ts`'s `decideAiSellerResponse` and
`placeBid`). These tests document the contract and prevent regression.

## References

- Agent Note: `.agents/notes/proposed/architecture/2026-08-29-player-ratings-are-derived-projections.md`
- Transfer logic: `apps/desktop/src/main/transfers.ts`
- Shared formula: `packages/shared/src/ratings.ts`