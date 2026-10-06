# 07: Typed RPC errors survive the IPC boundary

**What to build:** `handleRpc` in `apps/desktop/src/main/rpc/rpcServer.ts` returns `{ _tag: "Failure", error }` with `error` still the tagged-error instance, an `Error` subclass. Electron's IPC copy keeps only `name` and `message` of an `Error`, so the renderer receives `{ name: "Error" }`, fails to decode it against the method's error schema, and shows "The game returned an unexpected response" for every typed error in the app. Encode the error with the method's error schema before it leaves main. An error outside the method's union keeps today's behaviour: it is sent as-is and the renderer reports a contract decode failure.

Found while implementing [04](04-scouting-assignment-screen.md): assigning a Scout to an unscouted Club needs `ClubNotScoutedError.currentReportId`, which never arrives.

**Decisions:**

- ENGINEERING-CONTRACT § Boundaries: errors crossing the boundary are typed and intentional.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] A typed error returned by `handleRpc` still decodes against the method's error schema after `structuredClone`
- [x] An error outside the method's union is still returned as a Failure, not a defect

## Answer

`handleRpc` encodes a failure with `AppRpcs[method].error` before returning it. An error that does not encode is logged as a warning and sent unchanged, so the renderer still reports a contract decode failure. `apps/desktop/test/main/rpc/typed-errors-over-ipc.test.ts` runs a `SaveNotFoundError` through `structuredClone`, the algorithm Electron's IPC copy uses, and decodes it; it failed before the fix.

