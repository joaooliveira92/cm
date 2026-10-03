# 05: `react/memo-dependencies` — memo reads whose dependencies change

Type: task
Status: ready-for-agent

## Bucket

`react/memo-dependencies` — 16 findings, `warn` in `.oxlintrc.json`.

## What it flags

`useMemo`/`useCallback` reading values (from renderer React state and Effect atom reads) in
ways the compiler cannot memoise — dependencies it sees as unstable or missing, so the memo
either re-runs every render or is skipped as un-memoizable.

## Exit criteria

- `react/memo-dependencies` graduates from `warn` to `error` in `.oxlintrc.json`.
- `pnpm lint` still reports zero `react/memo-dependencies` findings.