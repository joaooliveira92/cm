Status: ready-for-agent

# E2E coverage spec — Wave 2

An extension to the wave 1 e2e coverage spec (`.scratch/e2e-coverage/spec.md`) covering the next wave of features: free agent signing, incoming bid response, counter-offer flow, match day substitution interaction, save management edge cases, and UI-reachable error paths. The wave 1 spec's terms (reliability contract, seed-save helper, assertion philosophy) apply unchanged — this document only describes what wave 2 adds.

## Reliability contract

Unchanged from wave 1. See [wave 1 spec](../e2e-coverage/spec.md): `retries: 2` on CI only, per-test `timeout: 30_000`, `workers: 1`, `fullyParallel: false`.

## Seed-save helper

The wave 1 helper at `apps/desktop/e2e/seedSaves.ts` is extended with three new seeds:

| Seed | Build | Used by |
|------|-------|---------|
| `seedWithFreeAgent` | create + free 2 AI-club players (`UPDATE players SET club_id = NULL`), inflate user wage budget | free agent smoke + journey in `transfer-features.spec.ts` |
| `seedWithIncomingBid` | create + INSERT a `pending` bid from an AI club on the user's first player, inflate AI budget | incoming bid smoke + journey in `transfer-features.spec.ts` |
| `seedWithCounteredBid` | create + INSERT a `countered` bid on an AI club's market player, inflate user budget | counter-offer smoke + journey in `transfer-features.spec.ts` |

Each seed produces a deterministic save state. The seed functions live in `apps/desktop/e2e/seedSaves.ts` and follow the same pattern as the wave 1 seeds (Effect-layered in-process generator, no checked-in `.sqlite` fixtures).

## Test structure

Wave 2 adds 3 new test files alongside the wave 1 smoke/journeys/error-paths files. No wave 1 file is modified — wave 2 coverage is purely additive.

### New files

| File | Tests | Seeds used |
|------|-------|------------|
| `e2e/transfer-features.spec.ts` | 3 smokes + 3 journeys (free agent, incoming bid, counter-offer) | `seedWithFreeAgent`, `seedWithIncomingBid`, `seedWithCounteredBid` |
| `e2e/save-management.spec.ts` | 1 journey (empty name) + 2 smokes (duplicate name, stale save) | `fresh` |

### Existing files extended from wave 1

| File | Additions |
|------|-----------|
| `e2e/app.spec.ts` | Match Day smoke asserts sub panel structure (Off/On labels, Make substitution button, cap display) |
| `e2e/journeys.spec.ts` | Substitution click-through journey (select off-player + on-player from selects, confirm, assert status text) |
| `e2e/error-paths.spec.ts` | 4 tests: generic transfer failure smoke, InvalidTacticError journey, sacking error smoke (skipped), loadSave no-op smoke |

### Wave 1 files unchanged

`e2e/app.spec.ts` smoke tests (squad, tactics, existing transfers, league table, fixtures, season summary) and `e2e/journeys.spec.ts` journeys (persistence, tactic-into-matchday, calendar advance, transfer settlement) remain as-is.

## Per-feature coverage

### Transfer features — `transfer-features.spec.ts`

Three features, each with a smoke test (structural assertions) and a journey (exact-value assertions on seeded amounts):

- **Free agent signing**: smoke asserts Free Agents section has ≥1 row and a "Sign" button per row. Journey clicks Sign, asserts toast appears, player disappears from list, budget reflects spend.
- **Incoming bid response**: smoke asserts "Incoming Bids" heading + ≥1 row + Accept/Counter/Reject buttons. Journey accepts the bid, asserts player row disappears and budget reflects the sale.
- **Counter-offer flow**: smoke asserts "Outgoing Bids" heading + a `countered` row + Accept counter/Withdraw buttons. Journey accepts the counter, asserts player appears in squad and budget reflects spend.

Three separate journeys on three separate seeds — no chaining. The existing Transfers smoke in `app.spec.ts` stays on `fresh` (tests empty-section render).

### Match day — structural extension

The match day smoke in `app.spec.ts` adds structural assertions for the substitution panel: Off/On labels, "Make substitution" button, and cap usage display. Force-off (orange injury prompt, shorthanded banner) is intentionally skipped — it depends on non-deterministic match events and is unreachable from a seeded save; unit tests cover force-off command-level correctness.

A new substitution journey in `journeys.spec.ts` selects an on-pitch player (off) and a bench player (on) from the deterministic `<select>` options, clicks "Make substitution", and asserts the status text appears.

### Save management — `save-management.spec.ts`

Three tests on the `fresh` seed covering the landing screen's save management:

- **Empty save name** (journey): clicks "Create" with an empty name, asserts no save appears in the "Continue career" list and the app does not crash. Locks in the current silent-no-op behaviour.
- **Duplicate save name** (smoke): creates two saves with the same name via the frontend, asserts both appear in the list. Confirms the app permits duplicates.
- **Nonexistent save** (smoke): creates a save, deletes its `.sqlite` file from disk, clicks the stale entry, and asserts the user stays on the landing screen with no crash or error banner.

### Error paths — `error-paths.spec.ts`

Four tests in a dedicated file covering each distinct error-surface pattern once:

1. **Generic transfer failure (smoke)**: triggers `InsufficientTransferBudgetError` by bidding 999,999,999 on a market player and asserts `"Bid: failed."` appears. Covers all transfer error paths generically.
2. **InvalidTacticError (journey)**: the sole RPC with a distinct error hint text. Asserts `"Failed to save tactic — check every slot has a unique player assigned."` after dispatching a native DOM event to bypass the frontend duplicate-player filter.
3. **Sacking error (smoke)**: skipped — requires a multi-season seed not yet available. Covers the pattern where `changeTactics`, `startMatch`, `submitMatchCommand`, and `advanceCalendar` render opaque failure messages after sacking.
4. **loadSave / SaveNotFoundError (smoke)**: clicks a stale save entry whose `.sqlite` file was deleted and asserts the landing screen stays visible (silent no-op).

The remaining ~26 UI-reachable error paths from the [error-paths catalog](research/05-error-paths-catalog.md) are not individually tested — they all render the same generic status text, and testing each adds combinatorial cost for zero assertion-value gain.

## Implementation decisions

- Force-off e2e skipped; sub interaction gets full click-through flow in journeys.spec.ts; structural sub panel assertions extend existing smoke in app.spec.ts. See [Agent Note](../../.agents/notes/implemented/testing/2026-08-28-match-day-structural-extension.md).
- All three edge cases get e2e coverage in save-management.spec.ts: empty-name journey, duplicate-name smoke, nonexistent-save smoke; fresh seed suffices. See [Agent Note](../../.agents/notes/implemented/testing/2026-08-28-save-management-edge-cases.md).
- 4 tests in error-paths.spec.ts: generic transfer failure smoke, InvalidTacticError journey, sacking error smoke (skipped), loadSave no-op smoke; fresh seed suffices. See [Agent Note](../../.agents/notes/implemented/testing/2026-08-28-error-path-coverage-spec.md).
- Dedicated transfer-features.spec.ts with one smoke + one journey per transfer feature, three separate seeds, three separate journeys; existing Transfers smoke stays on fresh. See [Agent Note](../../.agents/notes/implemented/testing/2026-08-29-transfer-features-e2e-coverage.md).

## Ticket map

- [07 — Seed scenarios spec section](issues/07-seed-scenarios-spec-section.md)
- [08 — Match day spec section](issues/08-match-day-spec-section.md)
- [09 — Save management spec section](issues/09-save-management-spec-section.md)
- [10 — Error paths spec section](issues/10-error-paths-spec-section.md)
- [11 — Transfer features spec section](issues/11-transfer-features-spec-section.md)
- [12 — Assemble complete spec](issues/12-assemble-complete-spec.md)