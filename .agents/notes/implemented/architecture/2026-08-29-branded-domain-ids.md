# Agent Note: Branded domain IDs across the contract, engine, and renderer

Status: implemented

## Problem

Every entity identifier in the app was a bare `string`. `packages/contracts` declared 57 ID fields as `Schema.String`, and the main process, game engine, and renderer all typed their own ID parameters, row types, and React props as `string`. Nothing distinguished a save id from a club id from a player id.

The concrete failure this allows: `startMatch`'s payload is `{ saveId, opponentClubId }`, two structurally identical strings in adjacent positions. Transposing them was not a type error anywhere in the codebase — not at the call site, not in the RPC decode, not in the handler. The same hazard ran through `placeBid({ saveId, playerId })`, `respondToBid({ saveId, bidId })`, and every SQL row read that fed a view.

Found while reading the Effect v4 code-style docs; see [2026-08-29-effect-code-style-section-sweep.md](../process/2026-08-29-effect-code-style-section-sweep.md), finding 1.

## Decision

Six nominal brands live in [`schemas.ts`](../../../../packages/contracts/src/schemas.ts) — `SaveId`, `ClubId`, `PlayerId`, `MatchId`, `FixtureId`, `BidId` — each `Schema.String.pipe(Schema.brand("…"))` with a matching exported type. `Schema.brand` is nominal: it narrows the decoded type and adds no runtime check, so this costs nothing at runtime and the SQLite schema is untouched.

The brands are applied at three layers, and the layering is the point:

- **Contract** — all 57 `Schema.String` ID fields in `schemas.ts` and `rpc.ts` now name a brand. Decoding an RPC payload therefore hands the main process values that only fit the parameter they belong to.
- **Main process and engine** — row types, domain record interfaces, and function signatures carry the brands rather than `string`. `packages/game-engine` already depended on `@cm-clone/contracts`, so `MatchEvent`, `MatchCommand`, and the simulation's runtime maps (`playersById`, `conds`, `penalties`, `gkStandIns`) are branded too. Without this the engine/contract crossing would need a cast at every view construction.
- **Renderer** — screen props and `useState` holders are branded, so an id read out of one view can only be passed to a payload field of the same kind.

`Schema.brand` leaves the *constructor* input unbranded (`~type.make.in` stays `string`), so `new BidView({ id: row.id, … })` still accepts what the row gives it. That is why 57 contract fields cost only a few dozen call-site changes rather than a cast at every construction: enforcement lands on the read side, which is where the transposition bug lives.

`X.make(value)` appears only where a string genuinely enters the domain for the first time: `randomUUID()` in `saves.ts`/`match.ts`/`transfers.ts`/`worldGeneration.ts`, DOM `event.target.value` in the renderer's `<select>` handlers, and the empty-string placeholders those selects start from.

`packages/shared` stays out of it — it does not depend on contracts, and contracts depends on it, so importing the brands back would close a package cycle. Instead `bestXi.ts` is generic over its id type (`PositionRatingsLike<Id extends string = string>`), so a caller holding `PlayerId` gets `PlayerId` back; `commentary.ts`'s name resolvers keep plain `string` parameters, which branded ids satisfy. `shared`'s one affected test mints fixture ids off the event type rather than importing the brands.

## Alternatives considered

- **`Brand.nominal<T>()` constructors instead of `Schema.brand`.** Rejected: the ids already cross a `Schema` decode boundary on every RPC call. Branding the schema makes decode itself the minting operation, so no hand-construction is needed on the payload path at all. A separate `Brand.nominal` constructor would sit beside the schema and have to be remembered.
- **`Brand.make` with validation (non-empty, UUID shape).** Rejected for now: the empty-string placeholder is a real state in the tactics and substitution selects (`"Unassigned"` / `"Select player"`), so a non-empty check would reject a value the UI legitimately holds. Nominal branding is the part that catches the bug that motivated this; validation is a separable decision.
- **Brand the contract only, cast at the engine boundary.** Rejected: `MatchEvent` ids flow straight into `InjuryView`, `MatchSummary`, and `ResumeSimulationView`, so this would have put a cast at roughly a dozen view-construction sites. Casts there defeat the check exactly where the values are being reshaped, which is where a mistake is most likely.
- **Brand `packages/shared` too.** Rejected: `contracts` depends on `shared`, so this closes a package cycle. The generic-`Id` seam in `bestXi.ts` gets the same type safety for callers without the dependency.
- **Leave the ids as `string` and add a lint rule.** Rejected: no grep-shaped rule can tell `startMatch({ saveId, opponentClubId })` from `startMatch({ saveId: opponentId, opponentClubId: saveId })`. Only the type system sees it.

## Consequences

1. Transposing two ids of different kinds is a compile error. Verified by swapping `saveId` and `opponentClubId` at the `startMatch` call in `MatchDayScreen.tsx`: `tsc` reports `Type 'string & Brand<"ClubId">' is not assignable to type 'string & Brand<"SaveId">'`.
2. Zero runtime change. Nominal brands are erased; no validation was added, no SQL or persisted-save format was touched, and all 222 tests pass unchanged in behaviour.
3. 41 files changed across `contracts`, `shared`, `game-engine`, and `apps/desktop`. `pnpm check:all` is green on all five gates.
4. New code that introduces an id must say which kind it is. A raw `string` no longer flows into a contract field, so `X.make(...)` at a genuine entry point (a UUID, a DOM value) is now the explicit and greppable way in.
5. `newConditionLedger` lost its `<T extends string>` generic and is now concretely `PlayerId`-keyed — it only ever had one caller shape.
6. Adding a seventh entity id means adding a brand rather than another `Schema.String`; the existing six are the pattern to copy.
