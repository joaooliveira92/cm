# cm-clone

A local, single-player Football-management sim (Championship Manager 2003/04-style), built as an
Electron desktop app. Game state is event-sourced with an Effect-based domain layer.

See [CONTEXT.md](CONTEXT.md) for the domain model and glossary, and [.agents/notes/](.agents/notes/)
for design decisions.

## Current state

The game is playable through a full season cycle. Shipped capabilities include:

- **World generation** — seeded worlds with nations, cities, clubs, generated players, and
  staff, driven by content packs that support real and fictional identities.
- **Player system** — 1–20 Attributes, seeded Potential Ability with deterministic fractional
  Player Development, Training Focus, Position Rating / Overall Rating / Transfer Value as
  read-time projections, and scouting with attribute-range uncertainty.
- **Match engine** — deterministic minute-by-minute simulation with Phase Strength (Attack /
  Midfield / Defense), seeded randomness, contact and non-contact injuries, Condition decay,
  tactical modifiers, and templated commentary.
- **Tactics** — formations (4-4-2, 4-3-3, 4-5-1, 3-5-2, 5-3-2), Roles with Role Ratings,
  Team Instructions (Mentality / Tempo / Pressing), and Tactic saves with conflict-safe
  revision tracking.
- **Season & calendar** — fixture generation, fixture-driven calendar, promotion/relegation
  via Exchange Links, board objectives with manager sacking verdicts, transfer windows, and
  results-only competitions.
- **Transfers** — Bid system, Transfer Budget / Wage Budget per club, free agents, scouting
  assignments with progress and team scout reports.
- **Staff** — derived presence staff (President, Physio) and bound staff (Coach, Scout) with
  seeded quality.
- **Career setup** — league and nation selection with simulation depth (full / standard /
  results-only), manager creation with Archetypes and Pillar Distribution (Tactical Acumen,
  Influence, Regimen, Technical Coaching).
- **Keyboard-first UI** — action registry, command palette, key binding overrides, table and
  grid navigation (TanStack Table), hash-routed navigation with focus restoration.
- **Screens** — 80+ renderer screens covering squad, transfers, tactics, match day, scouting,
  staff, clubs, competitions, nations, league tables, news, manager profile, and more.

## Stack

- Electron desktop shell ([apps/desktop](apps/desktop)), React renderer
- [Effect](https://effect.website/) v4 for the domain layer, `@effect/rpc` as the only channel
  between renderer and main process
- Effect Atom for the renderer data layer
- SQLite (`@effect/sql-sqlite-node`) for persistence
- pnpm workspaces + TypeScript project references
- Vitest for unit tests, Playwright for e2e

## Project layout

| Directory / File | Type | Description |
|---|---|---|
| [apps/desktop](apps/desktop) | Application | Electron app, and the largest tree here -- see its own [AGENTS.md](apps/desktop/AGENTS.md) for the layout. `src/main` (SQLite + RPC wiring, grouped into subsystems behind barrels), `src/preload`, `src/renderer` (React, one folder per feature), plus `test/` unit tests and `e2e/` Playwright specs. |
| [packages/contracts](packages/contracts) | Package | The `@effect/rpc` contract shared between renderer and main. `rpc.ts` is the whole IPC surface as one object; `schemas/` is the shared schema vocabulary, one module per domain over `schemas/ids.ts`. |
| [packages/game-engine](packages/game-engine) | Package | Match simulation. |
| [packages/shared](packages/shared) | Package | Domain logic and game-design data (position/role weights, commentary templates, nation and club content) used across packages. |
| [scripts/](scripts/) | Tooling | Repo gates and agent tooling: `run-gates.ts` defines the `check:all` / `check:ci` profiles that CI and local runs share. |
| [docs/](docs/) | Documentation | Human-facing docs, indexed by [docs/README.md](docs/README.md): contributor guides, CM 03/04 design reference, and the per-screen specs in [docs/specs/](docs/specs/). |
| [CONTEXT.md](CONTEXT.md) | Documentation | The domain model and glossary. Read this before touching game logic. |
| [.agents/notes/](.agents/notes/) | Documentation | Agent Notes: the decision record, tracking structural and feature design choices through a proposed to implemented lifecycle. |
| [.agents/skills/](.agents/skills/) | Tooling | The skill library -- the single source of truth. `.claude/skills/` is nothing but symlinks into it; never put real files there. |
| [docs/agents/](docs/agents/), [AGENTS.md](AGENTS.md) | Documentation | Conventions for agents working in this repository. |
| [.ai/](.ai/) | Tooling | Autonomous-sprint governance: the engineering contract, orchestration rules, `SPRINT-PLAN.md` (the work queue) and `TRACEABILITY.md` (ADR identifier map). |
| [.opencode/](.opencode/) | Tooling | The opencode CLI harness (agents and slash commands) over the same `.agents/skills/` library that `.claude/` uses. |
| [.scratch/](.scratch/) | Tooling | The repository issue tracker: one directory per effort, holding its spec, map and issues. See [issue-tracker.md](docs/agents/issue-tracker.md). |

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

From [apps/desktop](apps/desktop), `pnpm test:e2e` runs the Playwright end-to-end suite, and `pnpm package`
builds a distributable via electron-builder.
