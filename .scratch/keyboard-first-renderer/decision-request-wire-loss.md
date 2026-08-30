# Decision Request: Effect TaggedError fields are erased crossing the Electron IPC boundary

Written when a stop condition fired during review of the keyboard-first-renderer effort. Saved to
`.scratch/keyboard-first-renderer/decision-request-wire-loss.md`.

A decision request is not a request for permission. It is a request for a **decision only a human can
make**: one that changes what the game is, not how it is built.

## Question

How do typed domain errors cross the main→renderer IPC boundary, given that Electron's structured
clone erases the custom fields (`_tag`, payloads) of Effect `Schema.TaggedError` objects?

## Why this is blocking

The RPC seam (keyboard-first AC-02/AC-12) promises a typed `RemoteFailure` union, but every remote
failure currently descends into `ContractDecodeFailure` ("The game returned an unexpected response.")
because the wire receives `{}`. The fix changes the main-side failure path and possibly the wire
format in `packages/contracts` — outside the keyboard-first effort's scope. Guessing the wrong home
(fix in main vs. reshape the contract) touches the save/contract boundary and is exactly the class of
call that lives in ADRs.

## What is already settled

- The renderer seam decodes both wire branches with method schemas and distinguishes transport,
  contract-decode, and typed remote failures (`atom-adoption-shape` note, AC-02 tests).
- The envelope is `{ _tag: "Success" | "Failure", error }` and `error` is currently the raw tagged
  error (`main/rpcServer.ts:183-186`).
- `Schema.TaggedError` is Effect's error encoding; the seam's `RemoteFailure` decodes a specific
  `_tag` schema per method.
- ENGINEERING-CONTRACT § RPC: "Errors crossing the boundary are typed and intentional. Raw internal
  errors, stack traces, and filesystem paths do not reach the renderer."

## Options

### Option A — Plain-object serialization at the main boundary

Convert each tagged error to a plain record (`{ _tag, ...fields }`) in `rpcServer.ts`'s failure path
before IPC, using the method's error schema to drive the mapping.

- **What the player experiences**: typed messages ("That save could not be found.") instead of a
  generic "unexpected response".
- **What it costs to build**: schema-driven mapper around the error schema per method; small, owned.
- **What it forecloses**: nothing; the wire keeps its shape, renderer stays unchanged.
- **Save compatibility**: none.

### Option B — Serializer probe then targeted fix

First prove the Electron (WebIDL-family) serializer's behaviour on the pinned `effect` rc with a real
round-trip, then choose a fix based on evidence.

- **What the player experiences**: same as A.
- **What it costs to build**: one probe test + whichever fix the probe shows is needed.
- **What it forecloses**: nothing.
- **Save compatibility**: none.

### Option C — Reshape the failure contract

Make the wire failure format the authority (define failure payloads as plain schemas upstream) so the
decoder and encoder agree by construction.

- **What the player experiences**: same as A, plus future-proofing.
- **What it costs to build**: touches `packages/contracts` failure schemas and every roundtrip test.
- **What it forecloses**: larger blast radius; contract-wide change for a renderer-only symptom.
- **Save compatibility**: none (wire format, not saves).

## Recommendation

Option A with Option B's probe as its first step. Confirm Electron's serializer on the pinned rc in a
real `ipcRenderer.invoke` round-trip, then add the plain-object mapper in `rpcServer.ts` driven by the
method's error schema. Until it lands, keyboard-first AC-12's typed half stays re-scoped to
"structure-distinct" and this request stays open. It becomes its own ticket, owned outside this
effort.