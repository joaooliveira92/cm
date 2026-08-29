# 04: run* audit — edge-only

## Question

`rg` finds `Effect.runPromise` at `rpcServer.ts:154` (main-process IPC edge) and in
`apps/desktop/e2e/seedSaves.ts` (script edge). Both look correctly placed. Verify there is no
mid-program `run*` anywhere else in `apps/desktop` (including the renderer, which currently imports
no Effect), and confirm `runSync` is never used where the effect can fail or go async. Move any
leakage found to the edge; record the edge inventory in the answer so later tickets know where the
runners live.

Type: task
Blocked by: none (can start immediately)
Status: resolved

## Answer

Audit complete — no mid-program `run*` leakage found. The edge inventory is:

| Location | Runner | Edge | Notes |
|---|---|---|---|
| `src/main/rpcServer.ts:154` | `Effect.runPromise` | Main-process IPC dispatch | Handlers composed with `Effect.catch`, wrapped in `runPromise`. Correct — the IPC boundary is the program edge. |
| `e2e/seedSaves.ts:20,25,29,45` | `Effect.runPromise` | Script entry point | E2E seed scripts; correct — script edge, not program logic. |

- **No `Effect.runSync`** found anywhere in `apps/desktop/src/` or `apps/desktop/e2e/`.
- **No `runFork` or `runSyncExit` / `runPromiseExit`** found anywhere in `apps/desktop/`.
- **Renderer** (`src/renderer/`) and **preload** (`src/preload/`) have zero Effect imports or `run*` calls.

Satisfies ticket 04's green gate: `pnpm typecheck` + `pnpm test` pass without changes (audit only, no code edits needed).