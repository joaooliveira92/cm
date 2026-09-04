# 14 — Split the transfers presentational table leaves into explicit variants

Type: task
Status: ready-for-agent

**What to build:** The transfers screen's table sections become explicit components instead of two near-identical inline blocks. Four composed leaves render from `useTransfers()`: a Market table, a Free Agents table, an incoming-bids table, and an outgoing-bids table.

Market and Free Agents are *explicit variants*, not one component toggled by a boolean: each owns its own key, column set, copy, and row handling, and each renders the existing generic table panel leaf (which itself owns nothing — state flows in). They share the same selection and submission by reading `useTransfers()`, which is how the two tables keep operating as one market with one subject.

The incoming and outgoing bid tables are extracted as-is from their current inline renderers — hand-rendered rows driven by the shared view plus the same dispatch/response commands — with no behavioural change.

Do not collapse Market and Free Agents into a single configurable component behind `isMarket`-style flags; that is the boolean-prop trap this is meant to remove.

**Blocked by:** 13 (the provider must be live so the table leaves can read shared state).

**Status:** ready-for-agent

- [ ] Four leaves exist (Market, Free Agents, Incoming Bids, Outgoing Bids), each composed from `useTransfers()` and rendering the existing table infrastructure.
- [ ] Market and Free Agents are two explicit variants with no `isMarket`/mode boolean; their shared selection still behaves as one subject across both tables.
- [ ] No behaviour change: sorting, filtering, roving focus, selection, bookmarks, and announcements work exactly as before on both tables, and the incoming/outgoing bid actions (accept/reject/counter/accept-counter/withdraw) still dispatch correctly.
- [ ] `pnpm check:all` passes.
