# 01: Group J screen inventory survey

Type: task
Status: resolved

## Question

For each of the 15 Group J screens (132-146), what already exists: renderer screen and route, RPC reads
and commands, domain rules in `packages/shared`, persistence? Classify each as **Built**, **Partial** or
**Absent**, list the transfer and contract models that exist (Bids, contracts, budgets, Free Agents,
renewals, transfer history), and note which screens show another club's Player.

## Answer

### Classification

| Screen | Status | What exists |
|---|---|---|
| 132 Transfer Centre | **Partial** | `renderer/transfers/TransfersScreen.tsx` and its tables on route `transfers`; RPC `getTransfersScreen` (budgets, window, incoming and outgoing Bids, Free Agents, market) |
| 133 Incoming Transfer Offer | **Partial** | `IncomingBidsTable.tsx`, `CounterOfferModal.tsx`; RPC `respondToBid` (accept, reject, counter) |
| 134 Make Transfer Offer | **Partial** | `BidComposer.tsx`; RPC `placeBid` (amount only) |
| 135 Transfer Negotiation | **Partial** | one counter round: `respondAsBidder` (accept, withdraw) |
| 136 Loan Offer and Negotiation | **Absent** | no loan model |
| 137 Player Contract Offer | **Absent** | `signFreeAgent` with formula wage and optional years; no terms UI |
| 138 Player Contract Negotiation | **Absent** | — |
| 139 Staff Contract Offer and Negotiation | **Absent** | 13-line stub `staffContract/StaffContractScreen.tsx`; no Staff wages or hiring |
| 140 Contract Renewal | **Partial** | RPC `renewContract` (event `ContractRenewed`) with no consumer; read-only `playerContract/PlayerContractScreen.tsx` over `getPlayerContract` |
| 141 Contract Expiry and Bosman Status | **Absent** | `expireContractsForSeason` in `main/transfers/budgets.ts` frees expired players, with no event; no Bosman or pre-contract rule |
| 142 Transfer Completion and Registration | **Absent** | completion is immediate in `completeTransfer`; no registration |
| 143 Transfer Cancellation and Withdrawal | **Absent** | only `withdraw` on `respondAsBidder` and Bid lapse |
| 144 Transfer Clauses and Installments | **Absent** | — |
| 145 Transfer Budget and Wage Budget Review | **Partial** | one-line budget summary on Transfers; `club_budgets`, `TRANSFER_BUDGET_BY_TIER`, `WAGE_BUDGET_BY_TIER` |
| 146 Transfer History and Audit Trail | **Absent** | `player_transfers` table written by `recordTransfer`, no read; stubs `clubTransfersDetail`, `playerHistory` |

### Constraints found

- CONTEXT.md (Bid, Contract, Free Agent): Bids are single-round, Contracts are never renegotiated mid-term, Free Agents sign with no negotiation. Screens 135, 136, 138, 139, 141's Bosman part and 144 contradict the domain as written, not only the code.
- The market table and `BidComposer` show another club's Player with exact `overallRating` and `transferValue`. CONTEXT.md disagrees with itself on this: Listed relies on "full-information Transfer Value", Attribute Range makes Transfer Value a range below Fully Scouted. See Group I's [decision request 01](../../group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md).

