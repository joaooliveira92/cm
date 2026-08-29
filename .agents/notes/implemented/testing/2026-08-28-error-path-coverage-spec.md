# Agent Note: Error path coverage spec

Status: implemented

## Problem

The UI-reachable error paths catalog (ticket 05) identified ~30 UI-reachable error paths across 10 RPCs in the desktop app. Most errors map to identical generic `"X: failed."` status text. The decision to resolve was: which of these paths merit e2e coverage, at what depth (smoke vs journey), and where do the tests live?

## Decision

4 e2e tests added in a dedicated `error-paths.spec.ts` file, covering each distinct error-surface pattern once:

1. **Generic transfer failure (smoke)** — triggers `InsufficientTransferBudgetError` by bidding 999,999,999 on a market player and asserts `"Bid: failed."` appears. Covers all `signFreeAgent`, `respondToBid`, `respondAsBidder`, `placeBid` errors generically.
2. **changeTactics / InvalidTacticError (journey)** — the sole RPC with a distinct error hint text (`"Failed to save tactic — check every slot has a unique player assigned."`). Asserts the specific message appears after saving a tactic with a duplicated player (set via DOM event dispatch to bypass the frontend duplicate-player filter, which prevents the selection through standard UI but not the backend validation).
3. **Sacking error (smoke)** — skipped. Seed-dependent: requires a sacking seed from ticket 01 which is unresolved. Falls back to no-op when a sacking seed does not exist.
4. **loadSave / SaveNotFoundError (smoke)** — clicks a stale save entry whose `.sqlite` file has been deleted and asserts the landing screen stays visible (silent no-op).

## Alternatives considered

- **Test every reachable error path individually**: Rejected. ~30 paths all render the same generic status text; testing each adds combinatorial cost for zero assertion-value gain.
- **Extend existing per-screen test files**: Rejected. Error-path tests are about error states, not feature behavior. A dedicated file keeps signal-to-noise ratio clear when debugging CI failures.
- **Skip error-path e2e entirely, rely on unit tests**: Rejected. The misleading sacking messages and generic failure patterns are UI-level concerns that unit tests cannot surface.

## Consequences

- `error-paths.spec.ts` exists at `apps/desktop/e2e/error-paths.spec.ts` with 4 tests (3 active, 1 skipped)
- Generic transfer failure smoke passes on `fresh` seed
- `InvalidTacticError` journey passes on `fresh` seed (uses `page.evaluate` to bypass the frontend duplicate-player filter)
- Sacking error smoke is skipped pending ticket 01's sacking seed
- `loadSave` no-op smoke passes on `fresh` seed (file deletion between render and click)
- All tests pass under the wave 1 reliability contract (`retries: 2` CI-only, `timeout: 30_000`)
- If future UI work adds error-type-specific messages, the generic transfer failure test becomes under-assertive and must be revisited