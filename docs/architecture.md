# cm-clone Architecture

A pnpm monorepo for a local, single-player Championship Manager-style Electron game. See
[CONTEXT.md](../CONTEXT.md) for the domain glossary and [docs/adr/](adr/) for the rationale behind
the decisions below.

## Packages

| Package | Role |
| --- | --- |
| `apps/desktop` | Electron shell: main process (RPC server, SQLite access, save/world generation), preload (`contextBridge`), and a React renderer. The only app — there is no separate server. |
| `packages/contracts` | The `@effect/rpc`-shaped `AppRpcs` `RpcGroup` (hand-rolled stand-in until a v4-compatible `@effect/rpc` ships) plus every `Schema.Class` payload/view/error the renderer and main process share. |
| `packages/game-engine` | Pure, DB-agnostic decider/projector/match-sim logic, unit-testable without Electron. Mostly a placeholder scaffold today; real deciders land as later tickets are implemented. |
| `packages/shared` | Game-design constants and pure functions with no Effect/Node dependency: Position/Role taxonomy, Attribute weights, ratings math, world generation. Imported directly by both the main process and the renderer. |

## Data flow

1. **Renderer → main**: the renderer calls `window.cmClone.call(method, payload)` (exposed by
   `apps/desktop/src/preload/index.ts` via `contextBridge`), which does `ipcRenderer.invoke` over a
   single `RPC_CHANNEL`.
2. **Main**: `apps/desktop/src/main/rpcServer.ts` dispatches by `AppRpcMethod` to a handler module
   (`saves.ts`, `squad.ts`, `tactics.ts`, ...), decoding the payload against the `AppRpcs` schema
   first.
3. **Persistence**: one SQLite file per save under Electron's `userData` dir, opened per-call via
   `@effect/sql-sqlite-node`'s `SqliteClient.layer`, no ORM. `apps/desktop/src/main/schema.ts` holds
   the DDL, run once at save creation.
4. **Read views**: handler modules query SQLite directly and shape the result into a `Schema.Class`
   view (e.g. `SquadView`, `TacticsScreenView`) — derived values like Overall Rating, Position
   Rating, and Role Rating are computed on read from `packages/shared`, never stored.

There is no event-sourced command/decider pipeline wired up yet for gameplay actions — `saves.ts`,
`squad.ts`, and `tactics.ts` currently read/write SQLite directly per RPC call, matching each
ticket's scope so far. The event-sourced Decider architecture described in
[ADR-0007](adr/0007-domain-bounded-deciders-and-chunked-match-resimulation.md) is where later
tickets (match engine, transfers, season/calendar) are expected to introduce it.

## What's implemented so far

- **Save management** (`saves.ts`): create/list/load a save, each backed by its own SQLite file.
  Creating a save generates the fixed 20-club League and every club's squad
  (`worldGeneration.ts`, `packages/shared`'s `generateSquad`/`generatePlayer`).
- **Squad screen** (`squad.ts`, `SquadScreen.tsx`): lists the user's club's players with computed
  Overall Rating, per-Position Rating, and full attribute breakdown.
- **Tactics screen** (`tactics.ts`, `TacticsScreen.tsx`): pick one of the 5 v1 Formations, assign a
  squad player to each of its 11 slots (Role is auto-derived from Position — v1 has exactly one
  Role per Position, see [ADR-0003](adr/0003-role-rating-outside-match-engine.md)), set the 3 Team
  Instructions, and persist via `ChangeTactics`. Slot validation (formation shape, Role/Position
  pairing, no duplicate players) happens server-side before the write.

Everything else in the v1 scope (match engine, transfers, season/calendar, board objectives) is
still only a spec under `.scratch/cm-clone/issues/` — see [CONTEXT.md](../CONTEXT.md) and the ADRs
for the intended shape before implementing it.

## Testing

- `packages/shared`, `packages/game-engine`, `apps/desktop` each run `vitest` (`@effect/vitest` for
  Effect-based tests) via `pnpm test` / `pnpm -r test`.
- `apps/desktop/e2e/` runs Playwright against the built Electron app (`pnpm build && playwright
  test`), covering full user flows (create a save, load the squad, set and persist a tactic, restart
  and reload).
