# 16 — Thin the TransfersScreen shell to pure composition

Type: task
Status: resolved

**What to build:** `TransfersScreen` becomes a thin, state-free shell. Mounting the provider, it composes the screen from the extracted leaves in their screen order — title and budget/status header, the two hand-rendered bid tables, the Free Agents and Market tables, the bid composer, and the counter-offer modal — plus the two guard views (blocking load failure with retry, and the initial loading state).

The shell owns no state and no wiring: every useState, ref, effect, RPC call, mutation, and command now resolves as either a `useTransfers()` read or the component it was moved into (tickets 12–15). The resulting file is small enough that a reader sees the screen's structure at a glance and a future screen change touches only the relevant leaf.

Ashley the acceptance target: this ticket's only job is that the shell shrinks and still renders the identical screen.

**Blocked by:** 14 (table leaves) and 15 (bid composer / counter-offer modal) — the shell cannot be thinned until all leaves it composes exist.

**Status:** ready-for-agent

- [x] `TransfersScreen` is a thin composition (target: well under ~100 lines of body, dominated by provider mount + ordered leaf composition + the two guard views), with no useState/useEffect/refs/RPC/mutation/command of its own.
- [x] The screen renders identically to before the whole change set: budget header, status/refresh lines, incoming/outgoing bid tables, Free Agents and Market tables with all their interactions, the contextual Actions region, keep/discard dialog, and counter-offer modal.
- [x] `pnpm check:all` passes.
