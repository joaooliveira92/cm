# Decision Request: does a failed SQLite query cross the RPC boundary as a typed error, or die as a defect?

Filed by the orchestrator from the ticket 05 audit. This is a structural question with repo-wide
reach, so it recommends a map rather than starting one.

## Question

`SqlError` sits in the error channel of roughly 50 of the ~70 RPC handlers and is declared by **none**
of them. Should it be (a) declared as a typed error on every union that can raise it, (b) turned into
a defect at the save seam with `Effect.orDie`, or (c) declared once as an infrastructure escape hatch
in the handler type without appearing in individual contract unions?

The same question governs four engine errors — `CalendarSlotsExhaustedError`,
`FixtureGenerationError`, `SquadTooSmallError`, `FullTimeWhistleMissingError` — which are
main-process `Data.TaggedError`s with no contract schema, undeclared on `createSave`,
`commitCareer`, `advanceCalendar` and `commitMatchday`.

## Why this is blocking

Not blocking any current ticket. It blocks the *permanent fix* for a defect class that has now
shipped twice in consecutive commits.

Tickets 04 and 05 each found an RPC declaring a narrower `error:` union than its handler can raise.
The consequence is concrete and identical each time: the server fails to encode the error against the
method's schema, logs "RPC error did not encode with the method's error schema", and re-raises the
raw error. Electron's structured clone flattens it to name/message, the renderer's `typedError`
yields `null`, and the screen shows a generic failure — discarding an error `describeRpcError`
already knows how to render. ENGINEERING-CONTRACT § Boundaries forbids exactly this: *errors crossing
the boundary are typed and intentional; raw internal errors do not reach the renderer.*

Typecheck cannot see any of it, because the handler map is typed
`Effect.Effect<unknown, unknown>` (`apps/desktop/src/main/rpc/rpcServer.ts:70`).

## What is already settled

- ENGINEERING-CONTRACT § Boundaries (typed errors, no raw internal errors reaching the renderer) and
  § Effect discipline (tagged errors on every seam that can fail).
- Ticket 05's audit result, recorded in that ticket: 11 mismatches across 11 methods, 7 fixed.
- The mechanical detection method is known and proven, not hypothetical. Replacing the handler type
  with a method-indexed mapped type whose error channel is
  `Schema.Schema.Type<(typeof AppRpcs)[M]["error"]> | Schema.SchemaError` makes `tsc` name every
  mismatch (the Effect language service reports `TS377003: Missing errors <X> in the expected Effect
  type`). It found all 11 in one run. It costs one type alias, no new script, and fires inside the
  existing `typecheck` gate.
- An AST rule in `scripts/effect-lint.ts` is **not** the right tool and this is settled, not open:
  the needed fact is a *type* ("what can this Effect fail with, including helpers folded three levels
  down"), which syntax cannot compute. Any grep-shaped proxy would miss transitively-raised errors —
  precisely the class that shipped twice. Its failure mode would be false negatives.

## Options

### Option A — `Effect.orDie` at the `withExistingSave` seam

- **What the player experiences**: a failed query on a local save file becomes a crash/defect rather
  than a rendered message. Arguably honest: a corrupt or unreadable save is not a domain outcome the
  player can act on.
- **What it costs to build**: one seam change, then the mapped-type gate adopts cleanly as written.
- **What it forecloses**: any future per-screen recovery from a transient SQL failure.
- **Save compatibility**: unaffected — no schema or wire change.

### Option B — infrastructure escape hatch in the handler type

- Handler error channel becomes `... | Schema.SchemaError | SqlError`, leaving contract unions to
  cover domain errors only.
- **What the player experiences**: unchanged today; `SqlError` still arrives untyped.
- **What it costs to build**: small and reliable. Would have caught all 11 of today's mismatches.
- **What it forecloses**: nothing; it is compatible with doing Option A later.
- **Save compatibility**: unaffected.

### Option C — declare `SqlError` on every union that can raise it

- **What it costs to build**: a contract schema for `SqlError` plus ~50 union edits, and a
  `describeRpcError` case that has to say something useful about a SQLite failure.
- **What it forecloses**: little, but it puts an infrastructure concern in the domain contract.
- **Save compatibility**: unaffected.

## Recommendation

**Option B now, Option A as the follow-up.** B is small, reversible, and closes the detection gap
immediately — it makes the compiler enforce what two consecutive reviews had to catch by hand, which
is the whole point of routing a repeat finding into tooling per AGENTS.md. A is the cleaner end state
but requires deciding that an unreadable save is a defect, which is a real call and should not ride
along inside a tooling change.

C is not recommended: it spreads an infrastructure failure across ~50 domain contracts to no
player-visible benefit.

The four engine errors should be settled in the same map, since the same defect-vs-domain-error
question governs them.

**Suggested map**: an `rpc-error-channel` effort covering the handler-type gate, the `SqlError`
decision, and the four engine-error unions.

**Status:** needs-info
