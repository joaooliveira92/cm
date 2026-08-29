# Agent Note: Transfer features e2e coverage design

Status: implemented

## Problem

Wave 2 of e2e coverage for `@cm-clone/desktop` needs to cover three transfer-related features — free agent signing, incoming bid response, and counter-offer flow — each with dedicated seeds from ticket 01. The design must decide: file structure, smoke vs journey split, which assertions are structural vs exact-value, and whether to chain or split the journeys.

## Decision

A dedicated `transfer-features.spec.ts` file covers all three features:

- **Free agent signing**: smoke asserts Free Agents section has ≥1 row and Sign button per row. Journey clicks Sign, asserts success toast, player disappears from list, budget reflects spend.
- **Incoming bid response**: smoke asserts Incoming Bids heading + ≥1 row + Accept/Counter/Reject buttons per row. Journey accepts the bid, asserts player row disappears and budget reflects sale.
- **Counter-offer flow**: smoke asserts Outgoing Bids heading + a `countered` row + Accept counter/Withdraw buttons. Journey accepts the counter, asserts player appears in squad and budget reflects spend.

Three separate journeys, one per seed. Existing Transfers smoke in `app.spec.ts` stays on `fresh` seed (tests empty-section render).

## Alternatives considered

- **Add to existing `journeys.spec.ts`**: rejected — would bloat a focused file with 3+ tests per feature, obscuring the single-flow-per-journey signal.
- **Chain all three into one end-to-end journey**: rejected — coupling between seeds means one failure masks others; harder to debug and maintain.
- **Update existing Transfers smoke to use `seedWithFreeAgent`**: rejected — the existing smoke tests screen render for a standard save; populated-section coverage belongs in its own smoke.

## Consequences

- `transfer-features.spec.ts` exists with one smoke and one journey per transfer feature (6 tests total).
- Existing `app.spec.ts` Transfers smoke unchanged (uses `fresh`).
- All tests pass with `seedWithFreeAgent`, `seedWithIncomingBid`, `seedWithCounteredBid`.
- Spec extension at `.scratch/e2e-coverage-wave-2/spec.md` documents the new file, its seeds, and assertion philosophy.
- The `seedWithCounteredBid` journey asserts an exact-value budget change; if the seed's `counterAmount` changes, the test hard-fails. Mitigated by documenting the fixed value in the spec and the test comment.
- Free agent signing journey may be flaky if the wage-budget inflate overshoots; mitigated by testing the toast (deterministic surface) as the primary assertion and budget change as structural (after < before, not exact).