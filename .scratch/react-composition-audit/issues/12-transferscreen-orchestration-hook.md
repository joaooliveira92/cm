# 12 — Extract TransfersScreen orchestration into a useTransfersScreen hook

Type: task
Status: resolved

**What to build:** The transfers screen stops doing all of its own wiring inside the component body and instead delegates every non-rendering concern to a single `useTransfersScreen(saveId)` hook that returns one plain state object. The caller (initially `TransfersScreen`) simply renders that state.

Concretely, move out of the component body: the transfers RPC view atom and its refresh, all four mutations (bid, sign, respond-to-bid, respond-as-bidder) plus the shared status/`run` wrapper, the shared player selection, the single bid draft and its dirty-draft reducer dispatch, the counter-offer modal state, the per-table session state hub that is currently sourced through the existing per-table state hook, all derived rows/ids/focus values, the live-row and handler refs, the availability and visibility-clearing effects, the focus-restoration effects for both tables, and the one-time action-handler registration effect (bid/sign/respond/focus-bid/retry/palette sort-and-filter).

This is a pure extraction: behaviour is byte-identical, no state is added or removed, and no JSX changes. It is the prefactoring seam — the highest-risk step — so it lands on its own, before any component split.

The critical non-negotiable: the refs (the live-view ref, the draft ref, the selected ref, and the per-table row/active/id refs) must survive the extraction exactly as they are today. The action handlers are registered once per save and read the current value through these refs precisely so they never hold a stale closure; if the hook drops or reorders them, `place-bid`, `respond-*`, `focus-bid` and the palette handlers will silently act on stale state.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The screen's non-JSX state and wiring all resolve through a single `useTransfersScreen(saveId)` hook call in the component body.
- [x] Every ref today read inside the action-handler registration still exists in the hook with identical read/write order, so the once-per-save handlers see current state (verify the bid/respond/focus-bid/palette action paths actually round-trip).
- [x] The bid-draft, keep/discard, counter-offer, selection, availability/visibility, and both focus-restoration behaviours are unchanged.
- [x] `pnpm check:all` passes.

## Comments

- Supersedes the earlier draft in `02-transferscreen-explicit-variants.md`, which proposed lifting state to context without preserving the stable-handler ref mechanism (a stale-closure correctness risk). This ticket isolates that preservation as a standalone, reviewable prefactoring first.
