# 01: `react/refs` — move off the latest-value-ref writes during render

Type: task
Status: ready-for-agent

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

- `react/refs` graduates from `warn` to `error` in `.oxlintrc.json`.
- `pnpm lint` still reports zero `react/refs` findings.
- Renderer behaviour unchanged (the feature suites and e2e for any site that moved).