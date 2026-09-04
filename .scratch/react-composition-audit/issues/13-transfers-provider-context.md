# 13 — Provide the Transfers screen state through a TransfersProvider context

Type: task
Status: ready-for-agent

**What to build:** The transfers screen exposes its state to sibling components through a `TransfersProvider` that wraps the `useTransfersScreen` hook and delivers one generic, typed context value via a `useTransfers()` read hook. Callers never see how the state is held (it remains React state plus refs inside the provider); they only see a single interface of data, actions, focus helpers, and meta.

This is the lift-state step: the Market table and the Free Agents table are two siblings that must read and write the *same* shared selection and submit through the same command set, and `BidComposer` and the counter-offer modal read the same draft and counter state. A provider is what gives them that sibling access without prop-drilling every command through the screen.

Keep the context value as one coherent interface — state, actions, and meta — not a grab-bag. The provider is the only module that may call the underlying state hook; everything else goes through `useTransfers()`. The once-per-save action-handler registration stays owned where live-handler refs live (in the hook), so the provider does not need to re-register anything.

`TransfersScreen` mounts the provider around its render and reads through `useTransfers()`; the shell itself still renders the same JSX, unchanged.

**Blocked by:** 12 (the orchestration hook must exist first so the provider has something to wrap).

**Status:** ready-for-agent

- [ ] A `TransfersProvider` exposes a single typed context value and companion `useTransfers()` read hook; only the provider calls the underlying state hook.
- [ ] `TransfersScreen` mounts the provider and renders from `useTransfers()`; no behaviour change.
- [ ] The once-per-save action-handler registration and all live-handler refs remain intact (no re-registration, no stale closures).
- [ ] `pnpm check:all` passes.
