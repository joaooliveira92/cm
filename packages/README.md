# Packages

The `@cm-clone/*` libraries behind the app. See [README.md](../README.md) for the stack overview,
[CONTEXT.md](../CONTEXT.md) for the domain glossary, [docs/adr/](../docs/adr/) for design rationale,
and [docs/architecture.md](../docs/architecture.md) for the data-flow diagram and the role each
package plays in it.

## Hierarchy

A pnpm monorepo over `apps/*` and `packages/*`. `apps/desktop` is the only app — there is no
separate server. The packages are pure libraries, imported by the main process and the renderer
through the `AppRpcs` contract:

| Package | Role |
|---|---|
| [contracts/](contracts/) | The `@effect/rpc`-shaped `AppRpcs` `RpcGroup` plus every `Schema.Class` payload/view/error the renderer and main process share. Depends only on `shared`. |
| [game-engine/](game-engine/) | Pure, DB-agnostic decider/projector/match-sim logic, unit-testable without Electron. Depends on `contracts` and `shared`. |
| [shared/](shared/) | Game-design constants and pure functions with no Effect/Node dependency: Position/Role taxonomy, Attribute weights, ratings math, world generation. Imported by both the main process and the renderer. |

Business logic lives in `game-engine` and `shared` wherever it can, so it stays unit-testable
without Electron; `apps/desktop/src/main` wires that logic to SQLite and the RPC channel. A new
package joins the workspace via `pnpm-workspace.yaml` and earns a row here.

## Conventions

- Consult [docs/development.md](../docs/development.md) for layout, daily commands, and the CI
  gates, and [docs/agents/notes.md](../docs/agents/notes.md) for when a change earns an Agent Note.
- Package rules for agents editing them live in [AGENTS.md](AGENTS.md).