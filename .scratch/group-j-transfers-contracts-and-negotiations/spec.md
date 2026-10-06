# Group J: Transfers, Contracts and Negotiations — Reconciled Spec

Status: ready-for-slicing

## Problem Statement

The Transfers, Contracts and Negotiations screens (132-146) describe a full transfer workflow. The game
has one working Transfers screen, a `renewContract` command nothing reaches, a `player_transfers` table
nothing reads, and budgets shown as one line. A manager cannot renew a Contract, see who is about to
become a Free Agent, review budgets, or look back at transfers.

## Solution

Build four own-club screens on existing models, in order: Contract Renewal (140), Contract Expiry (141,
without Bosman), Budget Review (145), Transfer History (146). Eleven screens are deferred. See
[Agent Note: Group J v1 scope](../../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md).

## User Stories

1. As a manager, I want to renew a Player's Contract for a length I choose, so a Player I want to keep does
   not become a Free Agent. (Screen 140)
2. As a manager, I want to see which of my Players are in their last contracted year, so I renew them in
   time. (Screen 141)
3. As a manager, I want to see my Transfer Budget, Wage Budget and committed wages together, so I know
   what I can afford. (Screen 145)
4. As a manager, I want to see my club's past transfers, so I can review what came and went. (Screen 146)

## Implementation Decisions

- **Own club only.** No v1 screen shows a Player outside the manager's club, so none depends on Group I's
  [decision request 01](../group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md). (Ticket 02.)
- **Build order**: 140, 141, 145, 146. (Ticket 03.)
- **140 Contract Renewal** adds a renew action with a length choice (the `MIN_CONTRACT_YEARS` to
  `MAX_CONTRACT_YEARS` range in `rules/transfers.ts`) to the Player Contract screen at
  `player/$playerId/contract`, for a Player on the manager's club, through `renewContract`. Refusals
  (`TransferWindowClosedError`, `WageBudgetExceededError`, `InvalidBidActionError`) show inline. The wage is
  the formula wage; there is no negotiation (CONTEXT.md, Contract).
- **141 Contract Expiry** lists the manager's Players whose `years_remaining` shows they are in their last
  contracted year, with wage, each linking to renewal. No Bosman, pre-contract or approach rules.
- **145 Budget Review** shows Transfer Budget remaining, Wage Budget, and the sum of the squad's Contract
  wages, from `club_budgets` and `contracts`. No projection or history.
- **146 Transfer History** reads `player_transfers` for transfers into or out of the manager's club: date,
  Player name, from Club, to Club, fee. Rows for Players the world no longer contains are already removed by
  `discardSquadsForClubs`.

## Testing Decisions

- Main-process tests in `apps/desktop/test/main/transfers/` for each new read, including an empty result.
- RPC roundtrip tests in `packages/contracts/test/` for each new read.
- Renderer tests per screen, and a Playwright spec per reachable screen in `apps/desktop/e2e/`.
- Renewal needs the Transfer Window open; e2e seeding must not advance the Calendar by playing Matchdays
  beyond what `e2e/seedSaves.ts` already offers.

## Out of Scope

- Screens 132-139, 142-144 and 141's Bosman part, per ticket 02.
- Knowledge-limiting the market (Group I decision request 01).
- Any change to CONTEXT.md's Bid, Contract or Free Agent rules.

## Further Notes

- `renewContract` returns the whole `TransfersScreenView`; the renewal UI reads only what it needs.
- Stubs `clubTransfersDetail/ClubTransfersDetailScreen.tsx` and `playerHistory/PlayerHistoryScreen.tsx`
  exist on their routes; 146 decides whether to fill the club one or add a route.
