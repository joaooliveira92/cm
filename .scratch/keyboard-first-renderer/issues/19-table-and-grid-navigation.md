# 19: Table and grid navigation (Squad, Market, Free Agents)

**What to build:** the level-3 grid layer over TanStack Table for the Squad, Market, and Free Agent
tables — row-oriented roving focus on a semantic `<table>` (no ARIA grid) with one focus control per
row (the player name), sortable header buttons, keyboard sorting/filtering both through header
buttons and parameterized palette Actions, a contextual Actions region for bid entry (the Bid draft
with its dirty-draft lifecycle), identity-based focus restoration across sort/filter/refetch with
neighbor fallback, explicit result/refresh states with a polite status announcer, and session-scoped
table state (Squad column preferences survive restart, reconciled). Selected-row-cleared-on-filter-out
is explicit. Bid tables and the League Table stay hand-rendered.

**Decisions:**

- TanStack Table for Squad, Market, and Free Agents; semantic `<table>` with row-oriented roving, no ARIA grid; contextual Actions region for bid entry; sortable header buttons + palette Actions; identity-based focus restoration across sort/filter/refetch. See [Agent Note](../../../.agents/notes/implemented/feature/2026-08-29-table-and-grid-navigation.md).

**Blocked by:** 18.

**Status:** resolved

- [x] AC-27: Squad, Market, Free Agents adopt TanStack Table; bid tables and League Table stay hand-rendered; session-scoped state per table id; only Squad column preferences survive restart, reconciled. (`table-session.test.ts`, `table-column-preferences.test.ts`, `table-save-switch.test.tsx` — per-TableId session, save-switch clear, reconcile: unknown dropped, Name always visible+pinned; bid inbox and League Table plain `<table>`.)
- [x] AC-28: Row-oriented roving, semantic `<table>` (no ARIA grid), one focus control per row, sortable header buttons in native Tab order with `aria-sort`, `aria-selected` on selection. (`table-grid-navigation.test.tsx` — one player-name button per row, no `role="grid"`, ArrowDown roves, Space=selection≠focus; header buttons `tabIndex=0` + `aria-sort`.)
- [x] AC-29: Bid entry lives in the contextual Actions region with a single BidDraft and the dirty-draft lifecycle; no silent discard. (`table-bid-draft.test.ts`, `transfers-dialog-keyboard.test.tsx`, `table-grid-navigation.test.tsx` — single draft, retarget/discard, keep/discard dialog, dirty guard.)
- [x] AC-30: Sorting and filtering keyboard-reachable via header buttons *and* palette Actions, with visible filter controls showing active state. (`table-sorting.test.ts`, `table-sort-filter.test.ts`, `table-grid-navigation.test.tsx` — cycle law single home, palette input spelling, visible controls reflect the commanded state.)
- [x] AC-31: Focus restored by stable ID after sort/filter/refetch with neighbor fallback; selection cleared when the selected row is filtered out (explicit). (`table-focus-bookmark.test.ts`, `table-focus-restore.test.tsx`, `table-grid-navigation.test.tsx` — neighbor chain incl. filter-out, never `document.body`.)
- [x] AC-32: Explicit result/refresh states render the specified statuses; polite status announcer per table; `role="alert"` for blocking errors; announcements deduplicated. (`table-view-state.test.ts`, `table-grid-navigation.test.tsx` — five states, RefreshFailed keep-rows + Retry on Squad and Transfers, blocking `role="alert"` + Retry, announcer survives zero-rows, one polite status per table.)

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 5 — tables).
- Implemented, reviewed (first review APPROVE with AC-32 partial), repaired to close AC-32, re-reviewed (APPROVE, all six ACs green). Repair folded: refresh-failure keep-rows + nonblocking Retry wired through `deriveRefreshState.refreshFailed` on Squad and Transfers (the SWR seam flips to `Failure` with previous success on revalidation failure — verified against the atom source and empirically); Transfers blocking-error Retry; polite announcer hoisted to persist through the zero-rows transition; sort-cycle law delegated to `cycleSort`; dead session fields removed; NaN-safe `isValidBidAmount`. Gate green (`pnpm check:all`: typecheck/lint/effect-lint/verify-md-links ✓, 363 desktop tests). Note `2026-08-29-table-and-grid-navigation` promoted proposed → implemented; `intra-screen-focus-model` stays proposed (match-day tier-3 widget interaction unshipped, ticket 20).