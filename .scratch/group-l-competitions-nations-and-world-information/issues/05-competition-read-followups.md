# 05: Competition read follow-ups — error union, shared unplayed wording, deferred fixture surface

Filed by the orchestrator from the ticket 04 review. Three unrelated-but-adjacent items, none of
which belonged in ticket 04's scope.

## 1. `getCompetitionTable` omits `PendingFixtureIntegrityError` (shipped defect, ticket 03)

`packages/contracts/src/rpc.ts` declares `getCompetitionTable.error` as
`Schema.Union([SaveNotFoundError])`, but the query folds `toSeasonView`, which raises
`PendingFixtureIntegrityError`. Its sibling `getLeagueTable` declares both.

Ticket 04 hit the identical bug in `getCompetitionFixtures` and fixed it there. This is the same
defect one commit earlier, in code that already shipped. Typecheck cannot catch it: the RPC handler
is typed `Effect<unknown, unknown>`, so the mismatch only shows at runtime, where the encode fails
and the raw error reaches the renderer — the exact thing
ENGINEERING-CONTRACT § Boundaries forbids.

- [x] `getCompetitionTable.error` declares `PendingFixtureIntegrityError`
- [x] A contract roundtrip test covers it
- [x] Audit the remaining RPC error unions for the same mismatch rather than fixing only this one

Audited every method in `AppRpcs` by typing the handler map against each method's declared error
schema and reading what typecheck rejected. Fixed, all schema'd errors a handler demonstrably
raises: `getCompetitionTable` (+`PendingFixtureIntegrityError`), `getManagerProfile` and
`getManagerProfileScreen` (+`ManagerProfileNotFoundError`), `respondToBid` and `respondAsBidder`
(+`PlayerNotFoundError`, +`PendingFixtureIntegrityError`), `signFreeAgent` and `renewContract`
(+`PendingFixtureIntegrityError`).

Also fixed after review: `createSave` declared `Schema.Never` and was first filed below as a design
question. That was wrong for most of it. Four of its undeclared errors —
`InvalidLeagueSelectionError`, `PresetFingerprintMismatchError`, `InvalidPillarDistributionError`,
`ClubNotFoundError` — are already contract-schema'd and already rendered by `describeRpcError`, so
declaring them carried no design question at all. They are now declared. Its *engine* failures still
are not; the entry was mixed, not deferred.

Left open, because the correct union is a genuine design question rather than an omission. All three
are carried by
[decision-request-01](../decision-request-01-rpc-error-channel.md) so they outlive this ticket:

- `SqlError` is in the error channel of roughly every save-scoped handler and is declared by none.
  It is `@effect/sql`'s, with no contract schema, so declaring it means deciding first whether a
  failed query on a local save file is a domain error or a defect.
- `commitCareer`, `advanceCalendar`, `commitMatchday` and the remainder of `createSave` omit engine
  errors (`CalendarSlotsExhaustedError`, `FixtureGenerationError`, `SquadTooSmallError`,
  `FullTimeWhistleMissingError`, `InvalidTacticError`). These are invariant violations, and whether
  they belong in `E` or in the `Cause` is not this ticket's to settle.
- Payload `SchemaError` sits in every method's `E` and is declared by none. Unlike the two above this
  is a deliberate accepted position, documented at `rpcServer.ts:489-491` — a payload that fails to
  decode is reported as a contract decode failure. Listed here so the audit's "left open" set is
  complete rather than selectively honest.

The audit method is reusable and worth recording: type the handler map against each method's own
declared error schema and read what `tsc` rejects. It names every mismatch in one run, and
decision-request-01 recommends adopting it as a permanent gate. An AST rule in `effect-lint.ts` is
the wrong tool — the needed fact is a type, not a syntax pattern, so a grep-shaped proxy would miss
exactly the transitively-raised errors that shipped twice.

## 2. Two fixture lists disagree on how an unplayed Fixture reads

`CompetitionFixturesDetailScreen` renders `Unplayed`; the older `FixturesScreen` renders `-` for the
same state. Both are defensible alone; together a player sees one concept two ways. "Unplayed" is
the CONTEXT.md-aligned wording — CONTEXT.md uses the phrase "unplayed Fixture" in its own prose
(lines 448, 458, 797). It is also the more accessible one: a word survives where a bare `-` does not.
(An earlier draft cited CONTEXT.md's **Schedule** _Avoid_ entry here. That entry is why ticket 04
rejected "Scheduled", but neither screen ever said "Schedule", so it has no bearing on `-`.)

- [x] One wording across both screens, with the loser updated — `FixturesScreen` now reads `Unplayed`
- [x] Neither screen communicates played/unplayed by colour alone — the word carries it on both; `CompetitionFixturesDetailScreen`'s muted italic and `data-played` are redundant with it

## 3. Deferred Competition Fixtures surface

Split out to [06](06-competition-fixtures-deferred-surface.md) and labelled `needs-info`. It is a
scope question for a human, not a build step, and leaving it as an unticked box here would have held
this ticket open as a lock over work that is finished.

## Untested branch (low)

~~`CompetitionFixturesDetailScreen`'s untyped-`Failure` branch ("Failed to load competition fixtures")
has no test, and `CompetitionTableScreen` has the same hole.~~ Done: one test each, driving the
branch with a preload answer that is neither wire branch.

**Blocked by:** None

**Status:** resolved
