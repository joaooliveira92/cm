# 03: Split `main/transfers.ts` into `main/transfers/`

**What to build:** `apps/desktop/src/main/transfers.ts` (983 lines) becomes `main/transfers/` with
a barrel keeping all 9 import sites naming the same symbols.

| Target | Symbols |
|---|---|
| `transfers/economics.ts` | `ageFromDateOfBirth`, `attributeSelectList`, `PlayerEconRow`, `PlayerEcon`, `loadAllPlayersEcon`, `loadPlayerEcon`, `toMarketPlayerView` |
| `transfers/budgets.ts` | `ClubBudgetRow`, `loadClubBudgetRow`, `loadWageBudgetUsed`, `initializeSeasonEconomy`, `expireContractsForSeason` |
| `transfers/bids.ts` | `BidStatus`, `BidRow`, `loadBidRow`, `loadBidsForClub`, `appendHumanClubEvents`, `recordTransfer`, `completeTransfer` |
| `transfers/ai.ts` | `resolveAiCounterOffer`, `aiPlaceBid`, `aiSignFreeAgent`, `decideAiSellerResponse` |
| `transfers/commands.ts` | `buildTransfersScreenView`, `getTransfersScreen`, `clampYears`, `placeBid`, `respondToBid`, `respondAsBidder`, `signFreeAgent`, `renewContract`, `currentWage` |

`decideAiSellerResponse` is currently filed under the "Commands" banner but is AI-side logic called
by `placeBid`; moving it to `ai.ts` corrects an existing misfiling.

Dependency flow is strictly one-way and cycle-free:
`commands -> {ai, bids, budgets, economics, currentSeason}`, `ai -> {bids, budgets, economics}`.

The duplicated season-row block at the top of `transfers.ts` is deleted in favour of ticket 01's
module.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] `main/transfers.ts` is gone; `main/transfers/index.ts` re-exports the identical public surface.
- [ ] The duplicated `SeasonRow`/`loadSeasonRow`/`toSeasonView` block is gone.
- [ ] All 9 import sites updated, and the affected specs were run (tests are not typechecked).
- [ ] Pure move: no behaviour or signature changes.
- [ ] `pnpm check:all` is green at this commit.
