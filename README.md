# cm-clone

A local, single-player Football-management sim (Championship Manager 2003/04-style), built as an
Electron desktop app. Game state is event-sourced. See [CONTEXT.md](CONTEXT.md) for the domain
model and glossary, and [docs/adr/](docs/adr/) for design decisions.

## Stack

- Electron desktop shell ([apps/desktop](apps/desktop)), React renderer
- [Effect](https://effect.website/) for the domain layer, `@effect/rpc` as the only channel
  between renderer and main process
- SQLite (`@effect/sql-sqlite-node`) for persistence
- pnpm workspaces + TypeScript project references

## Project layout

Here is the structured table summarizing the codebase directories and their functions:

| Directory / File | Type | Description |
|---|---|---|
| [apps/desktop](apps/desktop)  | Application | Electron app containing main, preload, and renderer processes, along with Playwright end-to-end tests. |
| [packages/contracts](packages/contracts)  | Package | Contains the @effect/rpc contract shared between the renderer and main processes. |
| packages/gasme-engine | Package | Handles match simulation. |
| packages/shared | Package | Contains domain logic and game-design data (e.g., position/role weights, commentary templates) shared across all packages. |
| docs/adr/ | Documentation | Architectural Decision Records (ADRs) tracking structural design choices. |
| docs/agents/, AGENTS.md | Documentation | Operational guidelines and conventions for AI or automated agents working in the repository. |
| .scratch/ | Tooling / Logs | Internal repository issue tracker (referenced via docs/agents/issue-tracker.md). |







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

From [apps/desktop](apps/desktop)ßß, `pnpm test:e2e` runs the Playwright end-to-end suite, and `pnpm package`
builds a distributable via electron-builder.
