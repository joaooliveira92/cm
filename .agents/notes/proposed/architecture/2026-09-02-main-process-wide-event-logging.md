# Agent Note: Main-process RPC requests emit one JSON wide event

Status: proposed

## Problem

The app had no logging subsystem. The Effect runtime was never configured (no `Logger` layer, no
minimum log level), and the only structured log call in the whole codebase was a lone
`Effect.logWarning` in `leagueSelection.ts`. Every renderer→main RPC call flowed through
`handleRpc` in `apps/desktop/src/main/rpcServer.ts`, where the terminal `Effect.catch` swallowed
handler failures into a `{ _tag: "Failure" }` result with no record anywhere — there was no way to
answer "which RPC failed, for which save, and how long did it take" from any log.

## Decision

Stand up the logging subsystem in the main process and emit **one wide (canonical) event per RPC
request**, at completion:

- **`apps/desktop/src/main/logging.ts`** is the single source of the logger. It exports
  `LoggerLayer` = `Logger.consoleJson` (JSON to stdout) merged with a configurable minimum level
  (default `Debug`, `CMC_LOG_LEVEL` override). It also exports `withWideEvent`, the middleware-style
  wrapper that:
  - mints a fresh `request_id` per call,
  - measures `duration_ms`,
  - and on the full `Exit` (`Effect.onExit`) emits exactly one line — `Effect.logInfo` on success,
    `Effect.logError` on failure — carrying `method`, `saveId` (when the payload is save-scoped),
    `outcome`, `duration_ms`, and a failure `_tag` when present.
- **`handleRpc`** wraps its handler with `withWideEvent`, so the infrastructure lives in one place
  and the 40-odd handlers stay untouched (business context can deepen per-handler later).
- **`apps/desktop/src/main/index.ts`** runs each RPC effect through `LoggerLayer` via
  `Effect.provide`, so every request carries the JSON logger with the configured level.

This is deliberately the *foundations + main-process* slice of a broader logging story. Renderer
logging, the `atom-react` runtime, `game-engine`/`shared`, and the committed `external-reference/`
borrow are out of scope for this change.

## Alternatives considered

- **Custom `Logger.make` flattening annotations into top-level fields** — rejected. In Effect v4 the
  `Logger.Options` handed to `Logger.make` exposes `message`, `logLevel`, `cause`, `fiber`, `date`
  but not the annotations, so a custom logger cannot read `request_id`/`method` directly. Using
  `Logger.consoleJson` and emitting the structured wide event as the *message* keeps the payload
  readable and fully testable.
- **Scatter `Effect.log` through every handler** — rejected. That is the skill's explicit
  anti-pattern (multiple log lines per request, no shared timing/outcome), and it would touch every
  handler for worse observability.
- **Full app-wide coverage in one pass** — rejected for scope; this change establishes the
  pattern and the highest-value boundary (the RPC channel) so later slices compose on top.

## Consequences

1. `apps/desktop/src/main/logging.ts` is the single home for the logger; imports stay in main only
   for now.
2. Exactly one `info` or `error` JSON line is emitted per main-process RPC request, on the configured
   level, to stdout.
3. `handleRpc`'s success/failure contract (`RpcResult`) and all handler signatures are unchanged.
4. The `external-reference/` and tooling `console.*` calls are untouched; they are reference/CLI
   code, not app logs.
5. `tsc --noEmit` passes, `pnpm --filter @cm-clone/desktop test` passes, and the focused
   `test/logging.test.ts` asserts one wide event per call (request_id, saveId, outcome, errorTag).
