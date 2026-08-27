# cm-clone

A local, single-player Football-management sim (Championship Manager 2003/04-style), built as an
Electron desktop app. Game state is event-sourced. See [CONTEXT.md](CONTEXT.md) for the domain
model and glossary, and [docs/adr/](docs/adr/) for design decisions.

## Stack

- Electron desktop shell (`apps/desktop`), React renderer
- [Effect](https://effect.website/) for the domain layer, `@effect/rpc` as the only channel
  between renderer and main process
- SQLite (`@effect/sql-sqlite-node`) for persistence
- pnpm workspaces + TypeScript project references

## Project layout

- `apps/desktop` — Electron app (main, preload, renderer) and Playwright e2e tests
- `packages/contracts` — the `@effect/rpc` contract shared between renderer and main
- `packages/game-engine` — match simulation
- `packages/shared` — domain logic and game-design data (position/role weights, commentary
  templates, etc.) shared across packages
- `docs/adr/` — architecture decision records
- `docs/agents/`, `AGENTS.md` — conventions for agents working in this repo
- `.scratch/` — issue tracker (see [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md))

## Requirements

- Node.js >= 22.18.0
- pnpm

## Getting started

```bash
pnpm install
pnpm dev          # run the desktop app in dev mode
```

Other workspace-wide scripts:

```bash
pnpm build        # build all packages
pnpm test         # run tests in all packages
pnpm typecheck    # typecheck all packages
```

From `apps/desktop`, `pnpm test:e2e` runs the Playwright end-to-end suite, and `pnpm package`
builds a distributable via electron-builder.
