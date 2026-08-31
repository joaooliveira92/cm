# Development guide

The setup tutorial takes a new contributor from prerequisites to a working checkout. The
contributor reference that follows covers repository layout, daily workflow, and CI organization.
Design rationale belongs in [CONTEXT.md](../CONTEXT.md), [.agents/notes/](../.agents/notes/), and
[notes](../.agents/notes/).

## Setup tutorial

### Prerequisites

- Node.js >= 22.18.0.
- pnpm (workspace-driven install, no other package manager works here).
- Git.

### First-time setup

Install dependencies from the repo root:

```sh
pnpm install
```

Install also runs the `prepare` script (`effect-tsgo patch --typescript --oxlint`), which patches
the local TypeScript install for `effect-tsgo`. No further setup step is required.

Run typecheck once after a fresh clone:

```sh
pnpm typecheck
```

Setup is complete when `pnpm typecheck` exits successfully.

## Contributor reference

### Project layout

| Directory | Role |
|---|---|
| `apps/desktop` | The Electron app: main process (RPC server, SQLite access, save/world generation), preload (`contextBridge`), React renderer, and the Playwright e2e suite. The only app — there is no separate server. |
| `packages/contracts` | The `@effect/rpc`-shaped `AppRpcs` contract plus every `Schema.Class` payload/view/error shared between renderer and main process. |
| `packages/game-engine` | Pure, DB-agnostic decider/projector/match-sim logic, unit-testable without Electron. |
| `packages/shared` | Game-design constants and pure functions with no Effect/Node dependency: Position/Role taxonomy, Attribute weights, ratings math, world generation. Imported by both main process and renderer. |

See [docs/architecture.md](architecture.md) for the data-flow diagram and the rationale behind the
main/preload/renderer split, and [CONTEXT.md](../CONTEXT.md) for the domain glossary.

Business logic lives in `packages/game-engine` and `packages/shared` wherever it can, so it stays
unit-testable without Electron; `apps/desktop/src/main` wires that logic to SQLite and the RPC
channel.

### Daily commands

```sh
pnpm dev          # run the desktop app in dev mode
pnpm build        # build all packages
pnpm test         # run tests in all packages
pnpm typecheck    # typecheck all packages
pnpm lint         # oxlint the repo
pnpm verify-md-links  # check that Markdown links resolve
```

From [apps/desktop](../apps/desktop), `pnpm test:e2e` runs the Playwright end-to-end suite (it
builds the app first via `pretest:e2e`), and `pnpm package` builds a distributable via
electron-builder. See [docs/e2e.md](e2e.md) for the suite layout, reliability contract, and seed
saves.

Select the smallest checks that cover the changed surface — a `packages/shared` change rarely
needs the e2e suite; a renderer or main-process change usually does.

### CI gates

The [CI workflow](../.github/workflows/ci.yml) installs with a frozen lockfile, runs
`pnpm run check:ci`, then installs Electron's Linux system dependencies and runs the Playwright
e2e suite under `xvfb`. `check:ci` and the local `check:all` command are both defined in
[scripts/run-gates.ts](../scripts/run-gates.ts), the single source of truth for gate composition,
so CI and a local full run never drift apart:

- `typecheck` — `pnpm -r typecheck`
- `lint` — `pnpm run lint`
- `verify-md-links` — `pnpm run verify-md-links`
- `test` — `pnpm -r test`

`check:all` and `check:ci` currently run the same gates; `check:ci`'s comment notes that
`test:e2e` stays out because it needs OS-level setup (`xvfb`, system libs) that only the CI
workflow provisions.

Run the comprehensive local gate set with:

```sh
pnpm run check:all
```

### TODO markers

Use one of three comment tags to flag known issues in the code, ordered by urgency:

- `FIXME` — an issue that should block a new release.
- `TODO` — an issue that should be fixed soon, once we have the resources.
- `XXX` — an issue that we may fix someday; lowest priority, no commitment.

Pick the tag that matches the urgency so anyone scanning the code can tell a release blocker from
a someday-maybe.

### Agent workflow

This repo is developed with heavy agent involvement. See [AGENTS.md](../AGENTS.md) for the issue
tracker (`.scratch/<feature>/`), triage labels, Agent Notes, and the `cm-*` skill suite used to
plan and implement work.
