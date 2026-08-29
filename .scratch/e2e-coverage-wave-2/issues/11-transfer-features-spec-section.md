Type: task
Status: ready-for-agent
Blocked by: 07 (seed scenarios spec section)

## Work

A spec section documenting `transfer-features.spec.ts` — one smoke + one journey per transfer feature (free agent, incoming bid, counter-offer), seed mappings, and assertion philosophy (structural vs exact-value). Three separate journeys on three separate seeds.

## Decisions

- Dedicated transfer-features.spec.ts with one smoke + one journey per transfer feature, three separate seeds, three separate journeys; existing Transfers smoke stays on fresh. See [Agent Note](../../../.agents/notes/implemented/testing/2026-08-29-transfer-features-e2e-coverage.md).

- [ ] Spec documents 6 tests (3 smoke + 3 journey) with seed per test
- [ ] Spec records which assertions are structural vs exact-value
- [ ] Spec notes that existing Transfers smoke in app.spec.ts stays unchanged on fresh
- [ ] Spec does not introduce test details not covered by the Agent Note