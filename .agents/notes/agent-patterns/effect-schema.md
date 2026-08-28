# Effect Schema patterns in this project

All contract types live in `packages/contracts/src/schemas.ts` and are wired up as
`payload`/`success`/`error` schemas in `packages/contracts/src/rpc.ts`. Effect is pinned to the v4
`rc` line (`effect: 4.0.0-rc.112` in `pnpm-workspace.yaml`), so use v4 idioms, not v3 examples from
older blog posts.

## Shape of a schema module

`schema.ts` exports three kinds of thing. Keep the distinction visible in the names.

- `*View`, `*Summary`, `*Result` are classes (`Schema.Class`) describing RPC responses and
  persisted rows.
- `*Schema` are plain `Schema` values for literals and small unions (enums, discriminated payloads).
- `*Error` are `Schema.TaggedError` classes for typed failures.

Nothing in `contracts` imports from `@cm-clone/game-engine`. Command payloads that mirror engine
structs (`ChangeTacticsCommandPayload`, `ForceOffCommandPayload`, `MatchCommandPayload`) are
duplicated here deliberately to keep the contract package decoupled. Do the same: never import
engine types into `schemas.ts`.

## Common constructors and combinators

Primitive and collection fields used throughout `schemas.ts`:

```ts
Schema.String; Schema.Number; Schema.Boolean; Schema.Void; Schema.Never;
Schema.Array(SquadPlayerView);      // homogenous list
Schema.Record(Schema.String, Schema.Number); // keyed map (conditions by playerId)
Schema.NullOr(Tactic);              // Tactic | null, for "not yet set"
Schema.optional(Schema.Number);     // undefined allowed, used for optional RPC params
```

Enums are derived from the shared `as const` arrays so the string set never drifts from the game
data. Prefer this over hand-listing literals:

```ts
export const PositionSchema = Schema.Literals(POSITIONS);            // from @cm-clone/shared
export const SeasonPhaseSchema = Schema.Literals(SEASON_PHASES);     // local `as const`
export const VerdictSchema = Schema.Literals(VERDICTS);
```

Inline literals only when the vocabulary is local to the schema, as in `InjuryView.trigger`:

```ts
trigger: Schema.Literals(["contact", "non-contact"]),
```

### Deriving the TS type

The `Schema.Class` returns the schema as its own type; you never write a parallel `interface`. To
read a plain value's type off any schema use `Schema.Schema.Type<typeof X>` (used in `rpc.ts` for
`RpcPayload`/`RpcSuccess`/`RpcFailure`):

```ts
export type RpcPayload<M extends AppRpcMethod> = Schema.Schema.Type<
  (typeof AppRpcs)[M]["payload"]
>;
```

## Encoding and decoding

Decoding from untrusted input is the whole entry-point flow. The server handler decode loop in
`apps/desktop/src/main/rpcServer.ts` is the canonical example: parse the wire `unknown` into the
typed payload, then hand the typed value to the domain function.

```ts
const { saveId, tactic } = yield* Schema.decodeUnknownEffect(AppRpcs.changeTactics.payload)(payload);
```

Decode is also used to turn raw SQL rows into typed views, which is exactly what schema validation
is for. The value comes back already validated, so the domain code never re-checks shape:

```ts
// saves.ts
return yield* Schema.decodeUnknownEffect(SaveSummary)(rows[0]);

// tactics.ts, assembling a nested row result before validating the whole thing
return yield* Schema.decodeUnknownEffect(Tactic)({ ...tacticRows[0], slots: slotRows });
```

Use the `*Effect` (effect-returning, formerly `decodeUnknown`) variants inside `Effect.gen`.
Prefer `decode`/`decodeUnknown` over the sync `decodeUnknownSync` unless you are in sync code and
have already guarded against a malformed shape. Encoding is rarely used in this codebase because
the SQL writes field-by-field (see `persistTactic`); reach for `Schema.encode` only when you hand a
typed value back to the wire, not for internal persistence.

## Transformation patterns

The project favors plain typed structs over `transform`. Nested composition happens through field
types (a `Tactic` class containing a `TacticSlot` array, a `TacticsScreenView` containing a
`SquadPlayerView` array), and a `Schema.Union` selects the right payload by its `_tag` literal:

```ts
export const MatchCommandPayload = Schema.Union([
  ChangeTacticsCommandPayload,
  MakeSubstitutionCommandPayload,
  ForceOffCommandPayload,
]);
```

Keep it that way. Only add a `Schema.transform`/`compose` when the wire shape genuinely differs from
the domain shape (e.g. dates as strings, a legacy field renamed). Prefer aliasing via `as const`
`Record`s in `@cm-clone/shared` (like `POSITION_ROLES`) over a transform that maps one literal set
to another.

## Error handling patterns

Typed failures are `Schema.TaggedError` classes, one per distinguishable failure, each carrying the
fields a caller needs to render a message. The `_tag` is what the RPC layer matches on.

```ts
export class InvalidTacticError extends Schema.TaggedError<InvalidTacticError>()(
  "InvalidTacticError",
  { reason: Schema.String },
) {}

export class InsufficientTransferBudgetError extends Schema.TaggedError<InsufficientTransferBudgetError>()(
  "InsufficientTransferBudgetError",
  { clubId: Schema.String, amount: Schema.Number, remaining: Schema.Number },
) {}
```

Name the tag exactly the class name. Construct with an object literal (constructor validates the
fields):

```ts
return yield* new InvalidTacticError({ reason: `${tactic.formation} needs ${n} slots` });
```

### Wiring errors into an RPC

A method's `error` schema is the union of every failure it can raise. `Schema.Never` means "cannot
fail" and is used for read-only methods that only throw `SaveNotFoundError`... no, actually those
fail with `SaveNotFoundError`. Use `Never` only for methods whose success is unconditional
(`ping`, `listSaves`, `createSave`). For anything that can throw, list the typed union:

```ts
advanceCalendar: {
  payload: Schema.Struct({ saveId: Schema.String }),
  success: AdvanceCalendarResult,
  error: Schema.Union([SaveNotFoundError, SeasonCompleteError, SaveSackedError]),
},
```

The union members are all TaggedError classes, so the UI dispatches on `_tag` without pattern
matching on shape. Keep the failure set honest: only include errors the handler actually raises.

## What to avoid

- Do not import game-engine types into `schemas.ts`. Duplicate the shape and note why (see
  `ChangeTacticsCommandPayload`).
- Do not hand-write TypeScript interfaces next to a schema. `Schema.Class` and
  `Schema.Schema.Type` cover it.
- Do not inline string literals for vocab that already lives in `@cm-clone/shared` as an `as const`
  array; derive `Schema.Literals` from the exported array.
- Do not use `transform` to map one set of literals to another when a shared `Record`/`as const`
  array already describes the mapping.
- Avoid `as any` / `as unknown` casts to make a schema compile; a failing `decode` is a bug at the
  boundary, not something to paper over.
- Keep error payloads small and typed. A catch-all `error: Schema.String` should be a
  `TaggedError` with real fields instead.