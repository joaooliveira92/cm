# 06: `react/hooks` — Rules-of-Hooks violations

Type: task
Status: ready-for-agent

## Bucket

`react/hooks` — 12 findings, `warn` in `.oxlintrc.json`.

## What it flags

Compile-time Rules-of-Hooks violations: calls to hooks from conditional/looped/early-return
positions, hooks invoked outside a hook call, or similar structure the compiler refuses to
memorize because the hook topology is not static.

## Exit criteria

- `react/hooks` graduates from `warn` to `error` in `.oxlintrc.json`.
- `pnpm lint` still reports zero `react/hooks` findings.