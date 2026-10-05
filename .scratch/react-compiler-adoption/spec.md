# React Compiler Support (oxc) — adoption

## Overview

Adopt the React Compiler support announced in
[the oxc blog post](https://oxc.rs/blog/2026-08-18-react-compiler-support): the 22
React Compiler-powered lint rules in oxlint's `react` plugin, which catch violations of the
Rules of React.

## What shipped

The lint side is adopted in [.oxlintrc.json](../../.oxlintrc.json):

- `plugins` gains `react`.
- The 22 React Compiler rules are configured explicitly. Rules the codebase already passes
  ship at `error`; rules with findings ship at `warn` so the lint gate is not red while the
  debt is worked down.
- The classic (non-compiler) `react/*` and `react-hooks/*` rules that the plugin would
  auto-enable are turned `off` — the classic plugin is a separate, unevaluated adoption.

Buckets clear so far: `react/hooks` (ticket 06), `react/refs` (ticket 01) and
`react/set-state-in-effect` (ticket 02) are `error` with zero findings.

## What is deliberately not shipped (yet)

`oxc-transform-react` — the compiler's automatic memoization — is not wired into the build.
It needs `@vitejs/plugin-react` >= 6.1.0 (Vite 8) where the repo is on plugin-react 5 / Vite 7,
and auto-memoizing a renderer that already leans on deliberate `ref.current = …` memoization
(125 findings) would change runtime behaviour. Revisit once the `warn` buckets below are clear.

## Debt buckets (`warn` today, graduate to `error` as they clear)

Findings counted on 2026-09-16 at `b19c3b8` with this config:

| # | Rule | Findings | What it flags in this codebase |
|---|---|---|---|
| 01 | `react/refs` | 104 | `ref.current = …` writes and reads during render — the deliberate latest-value-ref memoization idiom; also what stops the compiler optimising these components. **Cleared (ticket 01); rule now `error`.** |
| 02 | `react/set-state-in-effect` | 27 | setState calls from inside effects. **Cleared (ticket 02); rule now `error`.** |
| 03 | `react/exhaustive-effect-dependencies` | 29 | deliberately scoped effect dependency arrays (some carry `eslint-disable-line react-hooks/exhaustive-deps`) |
| 04 | `react/todo` | 19 | constructors the compiler would emit Todo diagnostics for |
| 05 | `react/memo-dependencies` | 16 | memo/effect dependencies on Effect atom reads |
| 06 | `react/hooks` | 12 | Rules-of-Hooks violations (compiler variant of `rules-of-hooks`) |
| 07 | small buckets | 17 | `immutability` (5), `static-components` (3), `rule-suppression` (3), `no-deriving-state-in-effects` (2), `incompatible-library` (2), `globals` (2) |

## References

- [oxc blog: React Compiler Support](https://oxc.rs/blog/2026-08-18-react-compiler-support)
- [React Compiler](https://react.dev/learn/react-compiler)
- Lint baseline quirk: the repo's lint gate is red at `b19c3b8` before this adoption (12
  pre-existing `eslint(no-unused-vars)` / `typescript(no-explicit-any)` /
  `import(no-duplicates)` errors in committed files). This adoption adds zero net errors; it
  adds the compiler rules as warnings only.