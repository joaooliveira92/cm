# 09: Monorepo scaffold, walking skeleton & save management

**What to build:** The pnpm monorepo mirroring pingdotgg/t3code's patterns (`apps/desktop`,
`packages/contracts`, `packages/game-engine`, `packages/shared`), with Electron launching a renderer
that talks to the main process over one real `@effect/rpc` `RpcGroup` round trip (Electron IPC via
`contextBridge`, no websocket). One SQLite file per save/career persists under Electron's `userData`
dir. A "new save / continue career" screen lists existing saves and lets the player create or load
one — even though a freshly created save has no clubs or players in it yet.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

**Note (2026-08-27):** Implementation is in place but two boxes below can't be checked as literally
written. `@effect/rpc`'s latest release (0.76.2) peer-depends on `effect@^3.22.1`; there is no
`rc`/`next`/`snapshot` dist-tag compatible with the pinned `effect@4.0.0-rc.112`. The renderer↔main
call was instead built as a hand-rolled method-table shim over `ipcMain.handle`/`ipcRenderer.invoke`
(`packages/contracts/src/rpc.ts`, `apps/desktop/src/main/rpcServer.ts`,
`apps/desktop/src/preload/index.ts`) — functionally equivalent (single typed round-trip, single IPC
transport) but not `@effect/rpc`'s `RpcGroup`. `vite-plus` was likewise never adopted; the app uses
plain `vite` configs. Needs a maintainer call: accept the shim as the permanent design (and amend the
spec), or leave this blocked on upstream `@effect/rpc` support for effect 4.x.

- [ ] `apps/desktop`, `packages/contracts`, `packages/game-engine`, `packages/shared` scaffolded with
      the pinned Effect `rc`/`next` toolchain (`effect@rc`, `@effect/platform-node`,
      `@effect/sql-sqlite-node`, `@effect/rpc`, `@effect/vitest`), `vite-plus`, `electron-builder`,
      React, Tailwind v4 — done except `@effect/rpc` (not installed, see note) and `vite-plus` (not
      adopted, see note)
- [ ] Electron app launches a renderer window and executes at least one typed RpcGroup method
      round-trip from renderer to main and back — renderer↔main round-trip works, but via a hand-rolled
      shim, not `@effect/rpc`'s `RpcGroup` (see note)
- [x] Creating a new save creates a new SQLite file under `userData`, accessed via
      `@effect/sql-sqlite-node` with no ORM
- [x] "Continue career" screen lists all existing save files and can load one
- [ ] No transport other than the RpcGroup-over-IPC exists between renderer and main — single IPC
      channel confirmed, but it isn't `RpcGroup`-based (see note)
