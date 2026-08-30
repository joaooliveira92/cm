# Decision request: structured-clone erases Effect TaggedError fields across the IPC boundary

`:triage: needs-triage`

Type: decision
Status: open

## Context

The renderer RPC seam (Stage 1) decodes both wire branches with method schemas and promises a typed
`RemoteFailure` — the whole point of the `atom-adoption-shape` note. In production that promise is
unreachable: Effect `Schema.TaggedError` instances are `Error` subclasses, and Electron's
structured-clone IPC serializer serializes `Error` by `name`/`message`/`stack` only. Probing the
pinned `effect@4.0.0-rc.112`, `structuredClone(new SaveNotFoundError({ id }))` returns `{}` — `_tag`
and `id` are lost. `main/rpcServer.ts:183-186` puts the raw tagged error in the `{ _tag: "Failure",
error }` envelope untouched; `renderer/rpc/call.ts` then fails to decode `{}` against the method's
error schema and surfaces `ContractDecodeFailure` → "The game returned an unexpected response." For
**every** remote failure.

Why it surfaces now: no UI path reached a missing save before routing existed (ticket 16 added the
malformed-vs-missing route surface), so the latent Stage-1 bug was invisible until AC-12's typed
missing-save failure could not be exercised end-to-end.

## Options

1. **Plain-object payload in `handleRpc`'s failure path**: map each tagged error to a plain record
   (`{ _tag, ...fields }`) in `main/rpcServer.ts` before it hits IPC. Renderer decodes normally. This
   is likely the smallest correct fix, but the field-mapping must be schema-driven or it duplicates
   each error's shape by hand.
2. **Preload/Electron serializer probe first**: confirm the WebIDL-family serializer used inside
   Electron (not Node's `structuredClone`) has the same Error special-casing before choosing.
3. **Serialize at the seam contract**: change `packages/contracts` so failure payloads are written
   as plain schema objects upstream (already the shape the decoder wants), i.e. make the wire format
   the authority.

## Why it matters

A typed-error seam that never delivers a typed error is worse than no seam: the renderer string-renders
a generic message for every failure, which the contract's "errors crossing the boundary are typed and
intentional" clause (ENGINEERING-CONTRACT § RPC) forbids. This is a main-side defect — out of the
keyboard-first effort's scope — but the effort's AC-12 second clause depends on it.

## Recommendation

Open a fix ticket (or the effort's tracker) scoped to main + preload + contracts. First step: an
actual Electron round-trip probe of a tagged error to confirm shape, then the minimal plain-object
serialization at the main boundary. Re-scope the keyboard-first AC-12 until it lands.

Requested by: orchestrator, while reviewing `.scratch/keyboard-first-renderer/issues/16-router-adoption.md`.