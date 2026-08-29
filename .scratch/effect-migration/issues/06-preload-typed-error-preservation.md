# 06: Preload bridge typed-error preservation

## Question

The preload bridge (`apps/desktop/src/preload/index.ts:14`) receives `{_tag: "Success", value}` or
`{_tag: "Failure", error}` from the main process's `Effect.runPromise` boundary. On `Failure`, it
throws `new Error(stringified_tag)`, which destroys the structured error object. The renderer
`.catch()` blocks only see a generic string, losing the typed error schemas defined in
`contracts/src/rpc.ts`.

Fix: pass the full `RpcResult` envelope through without throwing, so the renderer can match on the
actual error shape. The renderer-side call pattern stays Promise-based (per ticket 05), but
receives the full tagged union instead of a stringified error.

This may mean:
- Changing `window.cmClone.call()` to return `Promise<RpcResult<M>>` (Success or Failure) instead
  of `Promise<RpcSuccess<M>>`
- Or keeping the return type as `Promise<RpcSuccess<M>>` and re-throwing the structured error
  object instead of a string
- Updating the 7 screen `.catch()` blocks to match on the structured error shape

The seam is the preload bridge; the renderer call sites are the conversion surface.

Type: task
Blocked by: 05 (renderer boundary posture, which decided the seam stays Promise-based)
Status: resolved

## Answer

Chosen option: **pass `RpcResult<M>` through without throwing** (not re-throw the structured error).

### Changes

**Preload bridge** (`apps/desktop/src/preload/index.ts`):
- Return `Promise<RpcResult<M>>` directly from `ipcRenderer.invoke`, no throw on `Failure`
- Import `RpcResult` instead of `RpcSuccess`

**Type declaration** (`apps/desktop/src/renderer/window.d.ts`):
- Changed `window.cmClone.call` return type from `Promise<RpcSuccess<M>>` to `Promise<RpcResult<M>>`

**All 16 renderer call sites** across 7 files — each now discriminates `result._tag`:
- `result._tag === "Failure"` → business logic error, shows screen-specific message
- `.catch()` kept as transport-error safety net for `try/catch` blocks; removed from `.then()` chains since business errors no longer throw

### Files changed

| File | Call sites |
|---|---|
| `src/preload/index.ts` | 1 (the bridge itself) |
| `src/renderer/window.d.ts` | 1 (type decl) |
| `src/renderer/App.tsx` | 4 |
| `src/renderer/FixturesScreen.tsx` | 1 |
| `src/renderer/LeagueTableScreen.tsx` | 2 |
| `src/renderer/MatchDayScreen.tsx` | 5 |
| `src/renderer/SeasonSummaryScreen.tsx` | 1 |
| `src/renderer/SquadScreen.tsx` | 1 |
| `src/renderer/TacticsScreen.tsx` | 2 |
| `src/renderer/TransfersScreen.tsx` | 6 + `run()` helper |

### Gate

- `pnpm -r typecheck`: clean (zero errors)
- `pnpm -r test`: 184 tests pass

### Agent Note

No durable note required — mechanical implementation of the renderer boundary posture already decided by ticket 05. No new architectural decision asserted.