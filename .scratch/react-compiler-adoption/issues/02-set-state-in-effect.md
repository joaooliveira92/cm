# 02: `react/set-state-in-effect` — stop calling state setters from inside effects

Type: task
Status: ready-for-agent

## Bucket

`react/set-state-in-effect` — 43 findings, `warn` in `.oxlintrc.json`.

## What it flags

Calling a state setter (setState, or an Effect atom setter/filler) from inside an effect
(useEffect / useCallback / useMemo body). Per the Rules of React, state should change in
response to render or events, not as a side effect of another state change.

## Exit criteria

- `react/set-state-in-effect` graduates from `warn` to `error` in `.oxlintrc.json`.
- `pnpm lint` still reports zero `react/set-state-in-effect` findings.
- Any behaviour change (an update firing differently) is justified per site.