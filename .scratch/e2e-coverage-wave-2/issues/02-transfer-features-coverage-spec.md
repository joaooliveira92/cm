# Issue: Transfer features coverage spec

Type: grilling
Status: resolved
Blocked by: 01
Assignee: joao

## Answer

**Six design decisions settled (round 1, all approved):**

1. **File structure**: dedicated `transfer-features.spec.ts` — three features × (smoke + journey) would clutter the core files.
2. **Free agent signing — smoke extension**: extend the existing Transfers smoke to assert Free Agents `tbody tr` count ≥1 and a "Sign" button per row. Structural and deterministic from `seedWithFreeAgent`.
3. **Incoming bid response — smoke + journey**: smoke asserts "Incoming Bids" heading + ≥1 row + Accept/Counter/Reject buttons. Journey accepts the bid, asserts player row disappears and budget reflects the sale (exact-value on seeded amounts).
4. **Counter-offer flow — smoke + journey**: smoke asserts "Outgoing Bids" heading + a `countered` row + Accept counter/Withdraw buttons. Journey accepts the counter, asserts player appears in squad and budget reflects the spend (exact-value on `counterAmount`).
5. **Three separate journeys**, one per seed — no chaining.
6. **Existing Transfers smoke stays on `fresh` seed** — it tests screen render for a standard save; the new smoke in `transfer-features.spec.ts` tests populated sections.

See [Agent Note: Transfer features e2e coverage design](../../../.agents/notes/implemented/testing/2026-08-29-transfer-features-e2e-coverage.md).