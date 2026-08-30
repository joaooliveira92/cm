# Agent Note: Table and grid navigation

Status: implemented

## Problem

The renderer has four table surfaces (Squad, Transfers Market/Free Agents, bid tables, League Table) with zero keyboard navigation, sorting, filtering, or column management. The keyboard-first effort requires a consistent model for which tables adopt TanStack Table, how keyboard grid navigation works (row vs cell, ARIA grid vs native table), where row actions live (bid input currently inside each market row), how sorting/filtering is triggered by keyboard, and how focus behaves across sort, filter, and async refetch.

## Decision

TanStack Table powers the Squad, Transfers Market, and Free Agent tables; the small, status-driven bid tables and the pre-sorted League Table stay hand-rendered. Each table is semantic HTML `<table>` markup with row-oriented roving focus — no `role="grid"`. Bid entry lives in a persistent contextual Actions region below the table, not in the rows. Sorting and filtering are reachable both through sortable header buttons (native Tab order) and parameterized command-palette Actions, with visible filter controls showing active state. Focus survives sort/filter/refetch against stable row identity with neighbor-based fallbacks. Grounded in one shared `table/` layer; screen column definitions live separately.

### TanStack adoption boundary

| Table | TanStack? | Rationale (implemented) |
|-------|-----------|--------------------------|
| Squad (~25 × 30+) | Yes | Sorting, column visibility/pinning, presets |
| Transfers Market (~475 × 6) | Yes | Sorting, filtering, search — shared row model with Free Agents |
| Free Agents (~20 × 6) | Yes | Same row renderer as Market |
| Incoming/Outgoing Bids | No | Status-driven, per-row actions — hand-rendered |
| League Table (20 × 10) | No | Pre-sorted, level 2 |

### Shared table layer

`table/` owns the TanStack instantiation (`useDataTable.ts`), session-scoped state per `TableId` (`tableState.ts`), persisted Squad column preferences (`columnPreferences.ts`), the focus bookmark with neighbor fallback (`focusBookmark.ts`), and the features (`features/sorting.ts`, `features/filtering.ts`, `features/visibility.ts`). Screen column definitions live in `squad/squadColumns.ts`, `transfers/marketColumns.ts`, `transfers/freeAgentColumns.ts`. TanStack owns row derivation and the sort/filter/visibility state machinery; the app owns selection, focus/keyboard navigation, Action availability, persistence, styling, announcements, and domain-specific filter semantics. Action registry logic stays out of column definitions.

### Navigation model: row-oriented, native table, no ARIA grid

- ArrowUp/ArrowDown move the current row; Home/End jump to first/last; Space toggles selection; Tab/Shift+Tab exits the roving sequence to reach native controls.
- One focusable element per row — the player-name button, never a bare `<tr tabindex="0">`.
- Sortable headers are native `<button>` elements inside `<th>` with `aria-sort`; the header region is in native Tab order, which is intentional, not a "one Tab stop per region" violation.

### Bid input: contextual Actions region

The bid input and related controls move out of the Market/Free Agent rows into a persistent Actions region shown when a player is selected. One explicit `BidDraft { playerId, amountInput, dirty }` with the lifecycle: selection change on an empty draft retargets or clears; on a dirty draft it keeps the selected player or requests explicit discard (no silent loss); arrow-key focus movement never touches the draft (focus ≠ selection); successful submission, save reload, or player-unavailability clears it, and unavailability also disables submission and announces.

### Sorting and filtering by keyboard

Two mechanisms, backing the same application command: (1) sortable header buttons in native Tab order toggling ascending/descending/none with a visible indicator and `aria-sort`; (2) parameterized palette Actions (`SortTableActionInput`, `FilterTableActionInput`) dispatched with their params. Filtering always has visible compact controls (position/name/nationality) so active state, discoverability, and removal paths exist for pointer users too.

### Focus restoration and selection rule

`CollectionFocusBookmark` restores the same player by stable ID after sort/filter/refetch; a filtered-out player falls back to the old next visible neighbor → old previous visible neighbor → first visible row → empty-result target. Selection is cleared when the selected row is filtered out — explicit, not emergent from TanStack's visible-row model.

### Table state lifetime

State is session-scoped per `TableId` across component rerenders and screen navigation. A save reload clears sort, filters, focus, scroll, selection, and the bid draft but reconciles Squad column preferences (unknown IDs dropped, mandatory columns restored, Name always visible and pinned). Only Squad column preferences survive app restart, persisted as a renderer-local preference blob; focus, scroll, selection, sort, filters, and the bid draft never do. Session state lives in module scope keyed by save identity, cleared at the career boundary when the save switches so a reload can never serve a previous save's table session.

### Result, refresh, and announcement states

`TableViewState` is one of `InitialLoading` (stable heading, `aria-busy="true"`, no repeated announcements), `LoadError` (blocking, contextual `role="alert"`, message + Retry), `EmptyDataset`, `NoFilterResults` (with the active filter count and a clear-filters path), or `Populated`, with a persisted polite region rendering the current line. `RefreshState` is orthogonal: `Idle` / `Refreshing` / `RefreshFailed`. A failed background refresh that still has usable rows preserves the rows and shows a nonblocking "Refresh failed." line with its own Retry — it never replaces the table with a blocking alert. One `role="status"` polite announcer per table, rendered outside the populated branch so it survives the zero-rows transition; announcements are deduplicated via a per-table announcement key. `aria-sort` reflects the active sort column; `aria-selected` marks selected rows.

## Verification

- `test/table-grid-navigation.test.tsx` — AC-28 roving (one focusable player-name button per row, no `role="grid"`, ArrowDown roves, Space=selection ≠ focus, `aria-selected`), AC-30 header buttons + palette drive the same command, AC-31 filtered-out selection cleared and announced, AC-32 InitialLoading/`aria-busy`, blocking `role="alert"`, empty copy per table, one polite status per table collapsed/composed, refresh-failure keep-rows + Retry, filter-to-zero announcer persistence, F8 NaN-safe bid.
- `test/table-session.test.ts`, `test/table-save-switch.test.tsx`, `test/table-column-preferences.test.ts` — AC-27 session-scoped per `TableId`, save-switch clear, Squad preferences reconciliation.
- `test/table-bid-draft.test.ts`, `test/transfers-dialog-keyboard.test.tsx` — AC-29 single BidDraft dirty-draft lifecycle, no silent discard, keep/discard dialog keyboard.
- `test/table-sorting.test.ts`, `test/table-sort-filter.test.ts` — AC-30 sort-cycle law with a single home (`cycleSort`), palette input spelling, filter semantics, malformed params → null.
- `test/table-focus-bookmark.test.ts`, `test/table-focus-restore.test.tsx` — AC-31 stable-ID restoration with neighbor fallback, never `document.body`.
- `test/table-view-state.test.ts` — AC-32 five result states, three refresh states, copy lines, dedup.
- `pnpm check:all` green.

## Risks

- **475 rows in Market without virtualization.** TanStack's row model is efficient but DOM cost depends on row/column complexity; add virtualization only if profiling justifies it, since it complicates focus restoration, screen-reader positioning, and scrolling.
- **Dirty-bid-draft lifecycle.** "Keep selected player or request explicit discard" demands the confirmation dialog; the implementator must not shortcut to silent discard. Enforced by `table-bid-draft.test.ts` and `transfers-dialog-keyboard.test.tsx`.
- **Screen-reader compatibility with the row control.** A `<button>`-in-row model is nonstandard; the note's open risk of AT verification (self-voice) persists and is deferred to the Stage 7 keyboard-e2e / AT pass.
- **Reconciliation of persisted Squad preferences.** New columns must appear, removed IDs must drop silently, Name must stay visible and pinned; runs on every restart and is pinned by `table-column-preferences.test.ts`.
- **Non-numeric counter-offer guard.** The bid-amount validity rule (`isValidBidAmount`) covers the Bid draft; the same family's counter-offer submit still guards on `amount > 0` rather than finite-validity — folded into ticket 20's Transfers tier-3 scope.