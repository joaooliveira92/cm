# Agent Note: Table and grid navigation

Status: proposed

## Problem

The renderer has four table surfaces (Squad, Transfers Market/Free Agents, bid tables, League Table) with zero keyboard navigation, sorting, filtering, or column management. The keyboard-first effort requires a consistent model for which tables adopt TanStack Table, how keyboard grid navigation works (row vs cell, ARIA grid vs native table), where row actions live (bid input currently inside each market row), how sorting/filtering is triggered by keyboard, and how focus behaves across sort, filter, and async refetch.

## Proposal

Adopt **TanStack Table** for Squad, Transfers Market, and Free Agents. Keep bid tables and League Table hand-rendered (small, status-driven, or pre-sorted). Use **semantic HTML `<table>` markup** with row-oriented roving focus — no `role="grid"`. Move the bid input out of market rows into a persistent contextual Actions region. Provide sortable header buttons (native Tab order) and equivalent command-palette Actions. Preserve focus across mutations using stable row identity and neighbor-based fallbacks.

### TanStack adoption boundary

| Table | TanStack? | Rationale |
|-------|-----------|-----------|
| Squad (~25 × 30+) | Yes | Sorting, column visibility/pinning, presets — needs the full state machinery |
| Transfers Market (~475 × 6) | Yes | Sorting, filtering, search — shared row model with Free Agents |
| Free Agents (~20 × 6) | Yes | Same row renderer as Market; TanStack adoption is free once Market is built |
| Incoming/Outgoing Bids | No | 5–15 rows, status-driven, per-row actions — hand-rendered is clearer |
| League Table (20 × 10) | No | Pre-sorted, level 2, no sorting/filtering needed |

### Shared table layer

```
table/
├── useDataTable.ts          # TanStack instantiation with Bluewave defaults
├── tableState.ts            # Session-scoped state per TableId
├── columnPreferences.ts     # Persisted user preferences (Squad visibility/pinning)
├── focusBookmark.ts         # CollectionFocusBookmark with neighbor fallback
└── features/
    ├── sorting.ts           # Controlled sort state + action wiring
    ├── filtering.ts         # Controlled filter state + palette + visible controls
    └── visibility.ts        # Column toggle + preset definitions
```

Screen-specific column definitions live separately:

```
squad/squadColumns.ts
transfers/marketColumns.ts
transfers/freeAgentColumns.ts
```

**Ownership split**: TanStack owns row derivation, sorting/filtering/visibility/pinning state machinery. Bluewave owns selection, focus/keyboard navigation, Action availability, persistence, styling, announcements, and domain-specific filter semantics. Action registry logic does not go inside column definitions.

### Feature set per table

**Squad**: sorting (any column, header button or palette), column visibility (per-column toggle + presets: Overview, Physical, Technical, Mental, Goalkeeping, All attributes), pinned identity column (Name is non-hideable), position and nationality filtering, persistent preferences (`SquadTablePreferences` with `visibleColumnIds`, `pinnedColumnIds`, `activePresetId`), "Restore defaults" action.

**Market/Free Agents**: sorting (Name, OVR, Age, Value), position filtering, player name search, optional nationality filtering. No configurable column visibility, no pinning, no presets.

### Navigation model: row-oriented, native table, no ARIA grid

- **ArrowUp/ArrowDown**: change current row
- **Shift+ArrowLeft/Shift+ArrowRight**: horizontal scroll by fixed increment (Squad only)
- **Home/End**: first/last row
- **Space**: toggle selection on current row
- **Enter**: activate the row's primary action (open player details)
- **Tab/Shift+Tab**: exit/enter the row-navigation sequence to reach native controls

**One focusable element per row** — a meaningful control inside the row (e.g., player name button), never a bare `<tr tabindex="0">`. Sortable headers are native `<button>` elements inside `<th>` with `aria-sort`. A table may contain a small number of tabbable sort buttons in the header plus one current-row control in the body — this is intentional, not a violation of "one Tab stop per region."

### Bid input: contextual Actions region

The bid input and related controls move from inside each Market/Free Agent row into a persistent **Actions region** below the table, shown when a player is selected:

```
Place bid
Player: Maya Okafor
Value: $8.4m
Your bid: [________]
[Place bid]
```

Flow: focus market table → arrow to a player → Space to select → Tab to Actions region → type amount → Enter to submit.

**Bid draft lifecycle** — single explicit `BidDraft { playerId, amountInput, dirty }`:

| Event | Behaviour |
|-------|-----------|
| Selection changes, draft empty | Retarget or clear automatically |
| Selection changes, draft dirty | Keep existing selected player or request explicit discard |
| Arrow-key focus movement | No effect (focus ≠ selection) |
| Successful submission | Clear draft |
| Save reload | Clear draft |
| Player becomes unavailable | Clear draft, disable submission, announce |

### Sorting and filtering by keyboard

**Two mechanisms**:

1. **Sortable header buttons** — native `<button>` inside each `<th>`, in native Tab order, toggling ascending/descending/none. Visible `SortIndicator` and `aria-sort`.

2. **Command palette** — parameterized Actions:
   ```typescript
   type SortTableActionInput = { tableId: TableId; columnId: ColumnId; direction: "ascending" | "descending" }
   type FilterTableActionInput = { tableId: TableId; filter: FilterClause }
   ```

**Filtering is not palette-only**. Visible filter controls (compact filter region above each table with native controls) are required to communicate active state, support pointer users, make available dimensions discoverable, and give obvious removal paths. Palette and visible controls back the same application command.

### Focus restoration

**CollectionFocusBookmark** with stable ID:

```typescript
type CollectionFocusBookmark = {
  tableId: TableId
  itemId: string
  previousItemId?: string
  nextItemId?: string
}
```

**After sort**: restore same player by stable ID; scroll into view.

**After filter**: if player remains visible, restore them. If removed: prefer old next visible neighbor → old previous visible neighbor → first visible row → empty-result focus target.

**Selection and filter rule**: a filtered-out player may remain selected only if the Actions region explicitly says the selected player is hidden by current filters. For simplicity in the first implementation, clear selection when the selected row is filtered out — whichever rule is chosen must be explicit, not emergent from TanStack's visible row model.

### Table state lifetime

```
type TableId = "squad" | "transfer-market" | "free-agents" | "incoming-bids" | "outgoing-bids" | "league-table"
```

| Scope | Survives |
|-------|----------|
| Component rerender | All interaction state (sort, filters, visibility, focus, scroll, selection, bid draft) |
| Screen navigation | Session-scoped per `TableId`: sort, filters, focus bookmark, scroll, Squad column visibility/pinning/preset. Cleared: selection (unless navigating to related detail with return promise), dirty bid draft |
| Save reload | Cleared: sort, filters, focus, scroll, selection, bid draft. Kept: Squad column preferences (reconciled — unknown IDs dropped, mandatory columns restored, Name always visible+pinned) |
| App restart | Persisted via IPC preferences channel: Squad visible columns, column order (if configurable), pinned columns, preferred preset. NOT persisted: focus, scroll, selection, sort, filters, bid draft |

### Empty and result states

```typescript
type TableViewState =
  | { _tag: "InitialLoading" }
  | { _tag: "LoadError"; error: TableLoadError }
  | { _tag: "EmptyDataset" }
  | { _tag: "NoFilterResults"; activeFilterCount: number }
  | { _tag: "Populated"; visibleRowCount: number }

type RefreshState =
  | { _tag: "Idle" }
  | { _tag: "Refreshing" }
  | { _tag: "RefreshFailed"; error: TableLoadError }
```

**Initial loading**: stable heading, skeleton or loading status, `aria-busy="true"`, no spinner focus, no repeated announcements.

**Empty Squad**: "No players are currently in your squad." + "Explore free agents" / "Go to Transfer Market" (visible controls + registered Actions).

**Empty Market**: "No players are currently listed on the transfer market." No "Clear filters" unless filters are active.

**Empty Free Agents**: "No free agents are currently available." Optional "Go to Transfer Market."

**No filtered results**: "No players match the current filters." + "Clear all filters" / per-filter-chip removal.

**Error**: "We could not load the players." + "Retry." If a refresh fails while existing rows remain usable, preserve rows and show nonblocking error.

### Screen-reader announcements

One `role="status"` polite announcer per active table. Announce: sort direction changes, filter result counts, selection confirmations, hidden-selection warnings, bid submissions. Do **not** announce every arrow-key movement (focused row's accessible name suffices). Do **not** use `aria-live="assertive"` for routine loading.

**Errors** (blocking task failure): use contextual `<div role="alert">`. Examples: bid submission failed, selected player became unavailable, table could not load at all.

**Sort state** on `<th aria-sort="...">`. **Selection state** via `aria-selected` on `<tr>` where semantics and AT testing support it.

**Deduplicate identical announcements** via `TableAnnouncement { tableId, eventId, message, priority }`.

## Alternatives considered

- **Cell-level ARIA grid navigation**: Would provide two-dimensional focus movement (arrow keys between individual cells) but creates 30+ focus stops per row in Squad — the focus model (ticket 06) explicitly rules out making static table cells into focus stops. The only cell that warrants interaction is the player-name control. ARIA grid also imposes directional focus-management expectations that the row-oriented model does not meet, making a native `<table>` more honest semantically.

- **Flat tab order through all columns**: No roving at all — every cell is a tab stop. Rejected as unusable on a 30-column table; contradicts the level-3 ambition.

- **Roving header region plus body region**: The user rejected this as too complex — sortable headers use native Tab-order buttons within the table, not a separate roving region. "One Tab stop per region" is not a dogma that forces controls out of the table.

- **Bid input per row with roving cells**: Keeping the input + button inside each market row would require cell-level focus within the row, breaking the row-oriented model. Moving the input into a persistent Actions region is the cleanest resolution.

- **TanStack for all tables**: Rejected for bid tables (too small, status-driven) and League Table (pre-sorted, level 2, no feature set). The abstraction cost is not earned there.

- **Three independent TanStack implementations**: Rejected in favor of a single shared `table/` layer with screen-specific column definitions.

- **Persisting sort/filters across app restart**: Rejected — these are session preferences, not user preferences. Can be revisited if testing shows players expect them to survive restart.

- **aria-live="assertive" for loading**: Rejected — asserts interrupt speech. Use `aria-busy` and polite status for loading; reserve assertive for blocking errors.

## Acceptance criteria

- Squad uses TanStack Table with sorting, column visibility (per-column + presets), pinned Name column, position/nationality filtering, and persistent preferences
- Market and Free Agents use TanStack Table with sorting (Name/OVR/Age/Value), position filtering, and name search
- Bid tables and League Table remain hand-rendered
- Row-oriented roving focus with one meaningful control per row (player name button)
- No `role="grid"` — semantic `<table>` with `aria-sort` on sortable headers
- Bid input lives in a contextual Actions region below the table, with a single `BidDraft` and the dirty-draft lifecycle rules
- Sorting via native header buttons (Tab-order) and command-palette Actions
- Filtering via visible compact controls and equivalent palette Actions
- Focus restored by stable ID after sort, filter, and refetch; neighbor-based fallback
- Selection cleared when selected row is filtered out (first implementation)
- Table state session-scoped per `TableId`; preferences-only across app restart
- Five explicit `TableViewState` states; `RefreshState` orthogonal
- Polite `role="status"` announcements for user-relevant changes; contextual `role="alert"` for blocking errors
- `aria-sort` on active sort column, `aria-selected` on selected rows
- Verified with keyboard-only testing and at least one screen reader

## Risks

- **475 rows in Market without virtualization**: TanStack computes row models efficiently, but DOM rendering cost depends on row/column complexity. Profile after adoption; add virtualization only if measurements justify it, since it complicates focus restoration, screen-reader positioning, and scrolling.
- **Dirty-bid-draft lifecycle**: The rule "keep existing selected player or request explicit discard" requires a confirmation dialog. If the implementation shortcuts to silent discard, bids-in-progress will be lost. Code review must enforce the rule.
- **Screen-reader compatibility with roving row control**: A `<button>` inside `<th scope="row">` for the player name is nonstandard. Test with NVDA/VoiceOver and iterate if row-header+button is confusing.
- **Persistent Squad preferences reconciliation**: New columns added in a future update must appear, removed column IDs must be silently dropped, and Name must always be visible and pinned. The reconciliation logic is small but critical — it runs on every restart.
- **Horizontal scroll on Shift+Arrow**: Browser default behaviour may conflict. The shortcut must be explicit and clearly documented in the key map (ticket 05) and keyboard-help overlay.