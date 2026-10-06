# gate-red-on-dev ticket 10 — a squad generated for a promoted club signs Contracts

**Outcome:** resolved 2026-09-22. [Ticket](../../.scratch/gate-red-on-dev/issues/10-promoted-squads-sign-contracts.md).

## Validation

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 0. Shared 500, contracts 181, game-engine 95, desktop 2199 passed. |
| determinism | the extended seed-5150 promotion test in `apps/desktop/test/main/world/simulation-depth.test.ts`, and a pure test on colliding club seeds | passed in the gate; every Contract length and id derives from a full-path seed, independent of write order |
| save compatibility | no schema change | new `contracts` rows only; world generation's ids unchanged, pinned by `youth-intake.test.ts` |
| e2e | not run | no screen changed |

## Review

Reviewed inline by the orchestrator: one Contract helper (`signGeneratedSquad`) now serves both rollover
generators, the promoted path gets the full-path id derivation 07 introduced, and attribute seeds are
untouched. Filed ticket 11: conjured squads are generated against the Season 1 year.
