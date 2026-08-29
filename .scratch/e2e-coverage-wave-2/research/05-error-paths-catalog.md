# UI-Reachable Error Paths Catalog

Produced by research subagent on 2026-08-28.

Sources:
- `packages/contracts/src/rpc.ts` — RPC method/error declarations
- `apps/desktop/src/main/{transfers,match,season,tactics,saves,training,squad}.ts` — handler implementations
- `apps/desktop/src/renderer/{App,TransfersScreen,MatchDayScreen,TacticsScreen,LeagueTableScreen,FixturesScreen,SeasonSummaryScreen,SquadScreen}.tsx` — frontend handling

Legend: ✅ = reachable, ❌ = not reachable, N/A = not handled differently from generic failure

| RPC | Error | UI-reachable? | Frontend handling | Triggering action |
|-----|-------|---------------|-------------------|-------------------|
| `signFreeAgent` | `SaveNotFoundError` | ❌ | N/A — save already loaded | Save deleted between screen mount and action |
| `signFreeAgent` | `PlayerNotFoundError` | ✅ | Generic status: `"Sign: failed."` | Sign a free agent whose ID is no longer in the DB (player row removed by concurrent AI activity — theoretical) |
| `signFreeAgent` | `PlayerNotFreeAgentError` | ✅ | Generic status: `"Sign: failed."` | Click "Sign" on a free agent who was already signed by an AI club between the page load and the click |
| `signFreeAgent` | `TransferWindowClosedError` | ✅ | Generic status: `"Sign: failed."` | Click "Sign" outside a transfer window (pre-season or mid-window only) |
| `signFreeAgent` | `WageBudgetExceededError` | ✅ | Generic status: `"Sign: failed."` | Sign a free agent when the club's wage budget is fully used |
| `signFreeAgent` | `SaveSackedError` | ✅ | Generic status: `"Sign: failed."` | Click "Sign" after the manager has been sacked (save is read-only) |
| `respondToBid` | `SaveNotFoundError` | ❌ | N/A — save already loaded | — |
| `respondToBid` | `BidNotFoundError` | ✅ | Generic status: `"Accept: failed."` / `"Reject: failed."` / `"Counter: failed."` | Action button for an incoming bid that was withdrawn by the AI bidder between page load and click |
| `respondToBid` | `TransferWindowClosedError` | ✅ | Generic status: `"Accept: failed."` / `"Reject: failed."` / `"Counter: failed."` | Respond to an incoming bid outside the transfer window |
| `respondToBid` | `InvalidBidActionError` (not your player) | ❌ | N/A — only user's own incoming bids are shown | — |
| `respondToBid` | `InvalidBidActionError` (not pending) | ✅ | Generic status: `"Accept: failed."` / etc. | Accept a bid whose status changed (AI withdrew) between page load and click |
| `respondToBid` | `InvalidBidActionError` (counter needs positive amount) | ✅ | N/A — `prompt()` allows any positive number through; passing `undefined` or `0` via direct API call | User enters 0 or negative in the counter-offer prompt |
| `respondToBid` | `InsufficientTransferBudgetError` | ✅ | Generic status: `"Accept: failed."` | Accept an incoming bid where the AI bidding club's budget was exhausted between the bid and the accept (deducted from bidding club, not user) |
| `respondToBid` | `WageBudgetExceededError` | ✅ | Generic status: `"Accept: failed."` | Same scenario — bidding AI's wage budget exhausted since the bid was placed |
| `respondToBid` | `SaveSackedError` | ✅ | Generic status: `"Accept: failed."` / etc. | Respond to a bid after being sacked |
| `respondAsBidder` | `SaveNotFoundError` | ❌ | N/A | — |
| `respondAsBidder` | `BidNotFoundError` | ✅ | Generic status: `"Accept counter: failed."` / `"Withdraw: failed."` | Action button for an outgoing bid that the seller already accepted/rejected between page load and click |
| `respondAsBidder` | `TransferWindowClosedError` | ✅ | Generic status: `"Accept counter: failed."` | Accept a counter-offer outside the transfer window |
| `respondAsBidder` | `InvalidBidActionError` (not your bid) | ❌ | N/A — only user's own outgoing bids are shown | — |
| `respondAsBidder` | `InvalidBidActionError` (nothing to withdraw) | ✅ | Generic status: `"Withdraw: failed."` | Withdraw a bid that the seller already accepted/rejected between page load and click |
| `respondAsBidder` | `InvalidBidActionError` (no counter to accept) | ✅ | Generic status: `"Accept counter: failed."` | Click "Accept counter" on a bid where the seller's counter was withdrawn by AI logic between page load and click |
| `respondAsBidder` | `InsufficientTransferBudgetError` | ✅ | Generic status: `"Accept counter: failed."` | Accept a counter-offer when the user's transfer budget has been spent since the bid was placed |
| `respondAsBidder` | `WageBudgetExceededError` | ✅ | Generic status: `"Accept counter: failed."` | Accept a counter-offer when the user's wage budget is fully used |
| `respondAsBidder` | `SaveSackedError` | ✅ | Generic status: `"Accept counter: failed."` / `"Withdraw: failed."` | Respond as bidder after being sacked |
| `placeBid` | `SaveNotFoundError` | ❌ | N/A | — |
| `placeBid` | `PlayerNotFoundError` | ✅ | Generic status: `"Bid: failed."` | Place a bid on a player who was transferred away (by AI) between page load and bid click |
| `placeBid` | `TransferWindowClosedError` | ✅ | Generic status: `"Bid: failed."` | Place a bid outside the transfer window |
| `placeBid` | `InsufficientTransferBudgetError` | ✅ | Generic status: `"Bid: failed."` | Place a bid exceeding the remaining transfer budget |
| `placeBid` | `WageBudgetExceededError` | ✅ | Generic status: `"Bid: failed."` | Place a bid that, if accepted (outright), would push the club over the wage budget |
| `placeBid` | `SaveSackedError` | ✅ | Generic status: `"Bid: failed."` | Place a bid after being sacked |
| `placeBid` | `InvalidBidActionError` (your own player) | ❌ | N/A — market view filters user's own club out | — |
| `placeBid` | `InvalidBidActionError` (free agent) | ❌ | N/A — free agents get "Sign" button, not "Bid" | — |
| `changeTactics` | `SaveNotFoundError` | ❌ | N/A | — |
| `changeTactics` | `InvalidTacticError` | ✅ | Status text: `"Failed to save tactic — check every slot has a unique player assigned."` | Save a tactic with: wrong slot count for formation, wrong position in slot, wrong role, non-squad player, or duplicate player assignment |
| `changeTactics` | `SaveSackedError` | ✅ | Status text: `"Failed to save tactic — check every slot has a unique player assigned."` | Save a tactic after being sacked (misleading message — doesn't mention sacking) |
| `startMatch` | `SaveNotFoundError` | ❌ | N/A | — |
| `startMatch` | `ClubNotFoundError` | ❌ | Error banner: `"Failed to start match"` | Opponent club deleted between list load and start (theoretical — no UI path deletes clubs) |
| `startMatch` | `SaveSackedError` | ✅ | Error banner: `"Failed to start match"` | Start a match after being sacked (misleading message — doesn't mention sacking) |
| `submitMatchCommand` | `SaveNotFoundError` | ❌ | N/A | — |
| `submitMatchCommand` | `MatchNotFoundError` | ❌ | Status text: `"Applied — the engine may still reject an invalid/over-cap command silently."` | Submit a command for a match that doesn't exist (theoretical — matchId comes from a started match) |
| `submitMatchCommand` | `SaveSackedError` | ✅ | Status text: `"Applied — the engine may still reject an invalid/over-cap command silently."` | Submit a match command after being sacked (misleading message — doesn't mention sacking) |
| `advanceCalendar` | `SaveNotFoundError` | ❌ | N/A | — |
| `advanceCalendar` | `SeasonCompleteError` | ✅ | Button disabled when `season.phase === "season_complete"`; otherwise error banner: `"Failed to advance the calendar"` | Click "Advance Calendar" on a completed season (prevented by disabled button, but direct API call would hit this) |
| `advanceCalendar` | `SaveSackedError` | ✅ | Error banner: `"Failed to advance the calendar"` | Advance calendar after being sacked (misleading message — doesn't mention sacking) |
| `createSave` | None (Schema.Never) | — | — | — |
| `loadSave` | `SaveNotFoundError` | ✅ | Silent no-op (result ignored) | Click on a save whose file was deleted between list and load |
| `renewContract` | All errors (SaveNotFoundError, PlayerNotFoundError, InvalidBidActionError, TransferWindowClosedError, WageBudgetExceededError, SaveSackedError) | ❌ | No UI binding exists — no button or action in any screen calls `renewContract` | — |
| `setTrainingFocus` | All errors (SaveNotFoundError, PlayerNotFoundError, NotYourPlayerError, SaveSackedError) | ❌ | No UI binding exists — no button or action in any screen calls `setTrainingFocus` | — |

## Observations

1. **Generic error handling**: Almost all errors map to a single generic failure message for the entire RPC. No error-type-specific feedback (e.g., "Insufficient transfer budget" vs "Window is closed"). The sole exception is `changeTactics` / `InvalidTacticError` which has a hint about player assignment.

2. **Misleading messages after sacking**: `changeTactics`, `startMatch`, `submitMatchCommand`, and `advanceCalendar` all return opaque "failed" messages when the real cause is the save being read-only due to sacking. The SeasonSummaryScreen does render a proper sacked banner, but the mutating RPCs don't check or surface it.

3. **Disabled button for SeasonCompleteError**: The "Advance Calendar" button is disabled when `phase === "season_complete"`, correctly preventing the error through the UI. `SeasonCompleteError` is only reachable via direct RPC call.

4. **`renewContract` and `setTrainingFocus`**: Both RPCs are implemented server-side with full error handling but have zero frontend UI — they're dead code from a user's perspective. The ticket spec says they should exist but they have no UI binding.

5. **Transport-level error handling**: The `run()` helper in `TransfersScreen` wraps calls in try/catch for transport failures (catch sets "failed" message), so IPC-level errors are also handled generically.