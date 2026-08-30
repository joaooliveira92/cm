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

- TanStack Table for Squad, Market, and Free Agents; semantic `<table>` with row-oriented roving, no ARIA grid; contextual Actions region for bid entry; sortable header buttons + palette Actions; identity-based focus restoration across sort/filter/refetch. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-table-and-grid-navigation.md).

**Blocked by:** 18.

**Status:** ready-for-agent

- [ ] AC-27: Squad, Market, Free Agents adopt TanStack Table; bid tables and League Table stay hand-rendered; session-scoped state per table id; only Squad column preferences survive restart, reconciled.
- [ ] AC-28: Row-oriented roving, semantic `<table>` (no ARIA grid), one focus control per row, sortable header buttons in native Tab order with `aria-sort`, `aria-selected` on selection.
- [ ] AC-29: Bid entry lives in the contextual Actions region with a single BidDraft and the dirty-draft lifecycle; no silent discard.
- [ ] AC-30: Sorting and filtering keyboard-reachable via header buttons *and* palette Actions, with visible filter controls showing active state.
- [ ] AC-31: Focus restored by stable ID after sort/filter/refetch with neighbor fallback; selection cleared when the selected row is filtered out (explicit).
- [ ] AC-32: Explicit result/refresh states render the specified statuses; polite status announcer per table; `role="alert"` for blocking errors; announcements deduplicated.

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 5 — tables).