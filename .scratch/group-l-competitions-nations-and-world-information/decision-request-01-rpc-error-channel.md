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

**Status:** partially-resolved

## Answer (2026-09-18) — Option B adopted, scoped; the `SqlError` half still needs a human

The human directed this to be worked. **Option B is implemented**: `rpcServer.ts`'s handler type is
now per-method,

```ts
type Handler<M extends AppRpcMethod> = M extends UngatedMethod
  ? (payload: unknown, ctx: RpcContext) => Effect.Effect<unknown, unknown>
  : (payload: unknown, ctx: RpcContext) => Effect.Effect<
      unknown,
      Schema.Schema.Type<(typeof AppRpcs)[M]["error"]> | Schema.SchemaError | SqlError
    >;
```

so an RPC declaring a narrower `error:` union than its handler can raise is now a **compile error**
rather than a runtime surprise. Proved rather than assumed: narrowing `getCompetitionFixtures` back
to `SaveNotFoundError` alone reproduces

```
error TS2322: Type 'Effect<FixturesView, PendingFixtureIntegrityError | ...>' is not assignable ...
error TS377003: Missing errors PendingFixtureIntegrityError in the expected Effect type.
```

and restoring the union returns typecheck to zero errors. The defect class that shipped twice in
consecutive tickets, and needed two manual review passes to find, now costs zero review attention.

### What implementing it corrected in this document's own analysis

This request claimed Option B was "small and reliable" and blocked only by `SqlError`. **That was
wrong, and adopting it is what showed the error.** With `SqlError` admitted, `tsc` still rejected
four methods — `createSave`, `commitCareer`, `advanceCalendar`, `commitMatchday` — exactly the four
whose engine invariant errors this request listed *separately*. So Option B as originally scoped does
not compile: the engine-error question blocks the gate just as `SqlError` does.

Rather than abandon the gate or take the engine decision unilaterally, those four are named in an
explicit `UngatedMethod` list and typed loosely, with the exception documented at the type. **58 of
62 methods are gated; 4 are not.** The list is finite and by name, so shrinking it is a visible act
and growing it requires taking the decision first.

A second thing implementation revealed: the dispatch site needs a cast, because indexing `handlers`
by a union of methods yields a union of function types that cannot be called. That is inherent to
dynamic dispatch and does not weaken the gate — enforcement happens at each handler's definition
site, which is where an author writes the mistake.

### Still open, still a human's call

1. **`SqlError`** — declared by none of ~62 methods, admitted here as an escape hatch. Option A
   (`Effect.orDie` at the `withExistingSave` seam, on the grounds that an unreadable local save is a
   defect rather than a domain outcome) remains the recommendation and would let the escape hatch be
   deleted.
2. **The four engine errors** — `CalendarSlotsExhaustedError`, `FixtureGenerationError`,
   `SquadTooSmallError`, `FullTimeWhistleMissingError` have no contract schema. Declaring them means
   deciding whether an invariant violation belongs in `E` or the `Cause`. Answering this empties
   `UngatedMethod`.
3. A `SqlError`'s `message` can carry the save's filesystem path across the boundary, which
   ENGINEERING-CONTRACT § Boundaries covers. Pre-existing; resolved by (1) either way.

Both remaining questions are narrower than when this was filed, and neither now blocks a gate — they
only determine how much of the escape hatch survives.

---

## Answer — Option B now, Option A as the follow-up, 2026-09-19

**`SqlError` gets an infrastructure escape hatch in the handler type** — declared once, not spread across
50 domain contracts. It makes the compiler enforce what two consecutive reviews caught by hand, which is
what AGENTS.md asks for when a finding recurs, and it **unblocks ticket 05's permanent gate**: the audit
probe becomes a type alias, so a narrow error union becomes a compile error.

**Option A's premise is settled here rather than left open: an unreadable save is a defect.** There is no
recovery action, nothing to present, and no branch a caller could usefully write. So `Effect.orDie` at the
`withExistingSave` seam is the intended end state, filed as its own follow-up. The sequencing this request
asked for is right; the answer did not need to wait, and leaving it open is how B becomes permanent by
accident.

**The four engine errors, settled in the same place, on agency rather than severity:**

| Error | Ruling |
|---|---|
| `SquadTooSmallError` | **Domain error** — schema it, join the unions. A manager hits this and can act: sign a player, promote from the reserves. |
| `CalendarSlotsExhaustedError` | **Defect** — `orDie`. |
| `FixtureGenerationError` | **Defect** — `orDie`. |
| `FullTimeWhistleMissingError` | **Defect** — `orDie`. An engine invariant violation: a match that ended without ending. |

An error the player can respond to belongs in the contract so a screen can present it. An error meaning
the program is wrong belongs nowhere near a union.

Recorded as
[infrastructure failures are defects; domain failures are typed](../../.agents/notes/proposed/architecture/2026-09-19-infrastructure-failures-are-defects-domain-failures-are-typed.md).
Decided under the human's standing delegation ("i need you to solve the decisions").
