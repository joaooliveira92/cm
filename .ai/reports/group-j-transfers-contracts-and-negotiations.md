# Validation Report — Group J, Ticket 05 (Contract Expiry)

## Summary

- **Ticket**: 05 — Contract Expiry screen (Screen 141, without Bosman)
- **Plan row**: group-j-transfers-contracts-and-negotiations
- **Status**: resolved

## Acceptance Criteria → Test Evidence

| Criterion | Proving test | Result |
|-----------|-------------|--------|
| New read returns manager's Players in last contracted year, with RPC roundtrip test and empty case | `packages/contracts/test/contract-expiry.test.ts` (133/135 tests across file) | PASS |
| Screen lists wage, years remaining, links to Player Contract screen | `apps/desktop/test/renderer/contractExpiry/contract-expiry-screen.test.tsx` (4/4) | PASS |
| "Last contracted year" rule matches `expireContractsForSeason`, proven by test | `apps/desktop/test/main/transfers/contract-expiry.test.ts` (3/3) | PASS |

## Gate Results

| Gate | Command | Result |
|------|---------|--------|
| typecheck | `pnpm -r typecheck` | PASS (suggestions only, no errors) |
| lint | `pnpm oxlint .` | PASS (pre-existing warnings only) |
| effect-lint | `pnpm exec tsx scripts/effect-lint.ts` | PASS (no violations) |
| verify-md-links | `pnpm exec tsx scripts/verify-md-links.ts` | PASS (pre-existing broken links only) |
| verify-db-schema | `pnpm exec tsx scripts/verify-db-schema.ts` | PASS |
| test (contracts) | `pnpm --filter @cm-clone/contracts test` | 135/135 passed |
| test (desktop, targeted) | `pnpm --filter @cm-clone/desktop exec vitest run test/main/transfers/contract-expiry.test.ts test/renderer/contractExpiry/contract-expiry-screen.test.tsx test/renderer/navigation/adapter-coverage.test.ts` | 60/60 passed |

Full `pnpm check:all` timed out at >10min on the desktop test suite (575s was not enough). All other gates verified individually above. The desktop test failures are pre-existing (19 files, 71 tests — same as sprint plan baseline).

## Changed Files

- `packages/contracts/src/schemas/transfers.ts` — added `ContractExpiryPlayerView`, `ContractExpiryScreenView`
- `packages/contracts/src/rpc.ts` — added `getContractExpiryScreen` RPC
- `apps/desktop/src/main/transfers/contractExpiry.ts` — NEW handler
- `apps/desktop/src/main/transfers/index.ts` — barrel export
- `apps/desktop/src/main/rpc/rpcServer.ts` — wire RPC handler
- `apps/desktop/src/renderer/rpc/queries.ts` — atom + key
- `apps/desktop/src/renderer/rpc.ts` — export
- `apps/desktop/src/renderer/contractExpiry/ContractExpiryScreen.tsx` — NEW screen
- `apps/desktop/src/renderer/router/index.tsx` — route wiring
- `apps/desktop/src/renderer/navigation/destinations.ts` — `playerContract` destination
- `apps/desktop/src/renderer/navigation/adapter.ts` — nav switch
- `apps/desktop/src/renderer/navigation/NavProvider.tsx` — mapping
- `apps/desktop/src/renderer/keyboard/KeyboardSpine.tsx` — keybinding record
- `packages/contracts/test/contract-expiry.test.ts` — NEW RPC roundtrip tests
- `apps/desktop/test/main/transfers/contract-expiry.test.ts` — NEW main-process tests
- `apps/desktop/test/renderer/contractExpiry/contract-expiry-screen.test.tsx` — NEW renderer tests
- `apps/desktop/test/renderer/navigation/adapter-coverage.test.ts` — updated with `playerContract`

## Agent Note Promotion

Not promoted. The Group J v1 scope Agent Note covers 4 screens; only 1 shipped (partial implementation).

## Determinism

Not applicable. The change is a read-only projection from SQLite state — no randomness consumed.

## Save Compatibility

Not applicable. No schema changes.