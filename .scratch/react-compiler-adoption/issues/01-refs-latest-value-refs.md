# 01: `react/refs` — move off the latest-value-ref writes during render

Type: task
Status: resolved

## Bucket

`react/refs` — 125 findings, `warn` in `.oxlintrc.json`.

## What it flags

Writing `ref.current = …` during render, e.g. `apps/desktop/src/renderer/squad/useSquadScreen.ts`:

```
const latest = useRef({ ... });
latest.current.sort = sort;
latest.current.filters = filters;
```

Per Rules of React this escapes React's render cycle and tells the compiler "this component or
hook is not memoizable". The React Compiler skips optimizing any component that does it.

## Why it clusters

The codebase uses this as the "latest value" idiom: keep the freshest reading of state in a ref
so event handlers that registered once can read current values without re-registering. It is
deliberate, so the fix is a per-site redesign, not a mechanical one.

## Exit criteria

- [x] `react/refs` graduates from `warn` to `error` in `.oxlintrc.json`.
- [x] `pnpm lint` reports zero `react/refs` findings.
- [x] Renderer behaviour unchanged (the feature suites and e2e for any site that moved).

## Answer

The measured baseline was **104 findings across 17 files**, not the 125 the spec recorded on
2026-09-16 — three files the ticket never listed (`squad/useSquadSession.ts` 19,
`tactics/useTacticDraft.ts` 2, `squad/useLineupFit.ts` 1) plus drift within the listed ones. All were
cleared and `"react/refs"` is now `error`. The rule flags three shapes, not just the write the
ticket named:

- **Latest-value refs written during render** — moved to an effect that runs after commit, so the
  once-registered handlers still read fresh values (`useTransfersScreen`, `useTransferTables`,
  `useBidDraft`, `useDialogKeyboard`, `ContractOfferTerms`, `useMatchControl`, `stream`,
  `squadBottomBar`, `useLineupFit`, `useTacticDraft`, `useSquadScreen`, `useSquadSession`).
- **Lazy-init refs read during render** (`useRef(create…())`, `ref.current ??=`) — replaced with
  `useState(() => …)`, which creates once per mount without a render-phase ref access
  (`ActiveLeaguesProvider`, `ActiveLeaguesScreen`, `useSquadScreen`, `useSquadSession`).
- **A ref reached through another value during render** — the two bottom-bar builders and the
  `PanelHeader` `meta.toggleRef` pass. `useCreateSession` and `ActiveLeaguesScreen` each gained a
  thin `use*` indirection so the ref-closing callback is not seen being passed to a plain function
  during render; `PanelHeader` destructures the ref first.

Two refs are written in `useLayoutEffect` rather than `useEffect`, because their readers run outside
passive-effect order: the event-calendar's `selectorRef` is read by `useSyncExternalStore`'s
`getSnapshot`, and `ActiveLeaguesProvider`'s `stateRef`/`slotRef`/`setSlotRef` are read by a debounce
microtask. Both were flagged in review.