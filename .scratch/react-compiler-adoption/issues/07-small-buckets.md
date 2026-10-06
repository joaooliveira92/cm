# 07: small compiler buckets — immutability, static-components, rule-suppression, no-deriving-state-in-effects, incompatible-library, globals

Type: task
Status: ready-for-agent

## Bucket

Six rules, 17 findings total, `warn` in `.oxlintrc.json`:

| Rule | Findings | Typical site |
|---|---|---|
| `react/immutability` | 5 | mutating a value returned from `useState()` instead of using the setter |
| `react/static-components` | 3 | a component that could be statically hoisted |
| `react/rule-suppression` | 3 | suppression patterns the compiler does not honour |
| `react/no-deriving-state-in-effects` | 2 | deriving state inside an effect |
| `react/incompatible-library` | 2 | a React API usage the compiler cannot support |
| `react/globals` | 2 | reliance on a global the compiler treats as un-memoizable |

## Exit criteria

Each rule independently graduates from `warn` to `error` in `.oxlintrc.json` as its findings
clear; `pnpm lint` reports zero findings for that rule.