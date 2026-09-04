# 02 — Extract TransferMarketProvider and split TransfersScreen into explicit variants

Type: task
Status: claimed

## Problem

`TransfersScreen.tsx` (1134 lines) is a massive monolithic component violating multiple composition patterns:

1. **Excessive state** – 9 useState calls (status, bidAlert, selected, draftState, counters, counterAmount, counterError, etc.) all in one component
2. **Boolean prop proliferation** – `enableNameSearch`, `enablePositionFilter`, `busy`, `windowOpen`
3. **Prop drilling** – Two `TablePanel` instances each receive ~15 props including callbacks
4. **Duplicated logic** – Market and Free Agents tables have nearly identical sort/filter/handling logic
5. **Multiple concerns mixed** – Market management, bid lifecycle, counter-offers, incoming/outgoing bid tables all in one component
6. **Prop proliferation** – Total of 30+ props flowing through the component tree

## Solution

### Phase 1: Create `TransferMarketProvider` context
Lift all shared state (selected player, draft state, bid counters) into a `TransferMarketProvider`. Define generic context interface:

```tsx
interface TransferMarketState {
  selected: PlayerId | null
  draftState: BidDraftState
  counters: Record<string, number>
  busy: boolean
}

interface TransferMarketActions {
  selectPlayer: (id: PlayerId | null) => void
  submitBid: (playerId: PlayerId, amount: number) => void
  respondToBid: (bidId: BidId, action: BidAction) => void
  signFreeAgent: (playerId: PlayerId) => void
}

interface TransferMarketMeta {
  // refs, bookmarks, etc.
}
```

### Phase 2: Extract explicit variant components
Replace the monolithic component with explicit variants:
- `MarketTable` – the transfer market with TanStack table
- `FreeAgentTable` – the free agents table
- `IncomingBidsTable` – incoming bid management
- `OutgoingBidsTable` – outgoing bid management
- `BidActionsRegion` – the bid placement and counter-offer region

### Phase 3: Replace boolean props with composition
- Remove `enableNameSearch`, `enablePositionFilter` boolean props
- Use compound components for filters: `TableFilters.Search`, `TableFilters.Position`

### Phase 4: Extract dirty-draft lifecycle
Move the Keep/Discard dialog logic into a dedicated `DraftLifecycle` compound component.

## Blocking

- Blocked by: none (can be worked independently)

## Done When

- `TransfersScreen.tsx` reduced to under 200 lines
- No boolean prop proliferation in transfer components
- `TransferMarketProvider` exists with generic state/actions/meta interface
- Duplicated sort/filter logic extracted into shared hooks
- `pnpm check:all` passes

## Answer

<!-- to be filled by implementation -->

## Comments

- **Superseded** by tickets 12–16 in this directory. This ticket's proposed `TransferMarketProvider` draft dropped the stable-handler ref mechanism (a stale-closure correctness risk) and described state that does not match the code. The superseding set preserves those refs as a standalone prefactoring (12) before lifting state to a provider (13), then splits the presentational leaves (14), the bid composer and counter-offer modal (15), and finally thins the shell (16). This ticket's approved body is left unchanged.
- This refactor addresses CRITICAL composition violations and duplicated logic between market and free agent tables.
- The shared sort/filter logic should be extracted into a `useTableSortAndFilter` hook before splitting components.
- The dirty-draft lifecycle is a good candidate for an explicit variant component since it represents a distinct UI flow.
- Both market and free agent tables could share a generic `TablePanel` compound component.