# 08: wire up `oxc-transform-react` (automatic memoization) in the renderer build

Type: task
Status: ready-for-agent

## Bucket

The second half of the [oxc React Compiler post](https://oxc.rs/blog/2026-08-18-react-compiler-support):
`oxc-transform-react`, the compiler that auto-memoizes components and hooks at build time.

## Why it has not shipped

The Vite integration needs `@vitejs/plugin-react` >= 6.1.0 (which needs Vite 8); the repo is on
plugin-react 5 / Vite 7 (`apps/desktop/vite.renderer.config.ts`). Enabling `react({ compiler: true })`
also auto-memoizes a renderer full of `ref.current = …` writes — the compiler deliberately skips
anything it cannot vouch for, and 125 of those sites exist (see
[01-refs-latest-value-refs.md](01-refs-latest-value-refs.md)).

## Exit criteria

- Vite 8 + `@vitejs/plugin-react` >= 6.1 upgrade lands in `apps/desktop`.
- `transformSync`/`react({ compiler: true })` is wired and the renderer builds.
- The match/live-match e2e suites still pass (memoization is behaviour-changing by design).