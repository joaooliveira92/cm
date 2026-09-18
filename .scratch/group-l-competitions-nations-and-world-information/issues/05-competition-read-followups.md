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

- [ ] `getCompetitionTable.error` declares `PendingFixtureIntegrityError`
- [ ] A contract roundtrip test covers it
- [ ] Audit the remaining RPC error unions for the same mismatch rather than fixing only this one

## 2. Two fixture lists disagree on how an unplayed Fixture reads

`CompetitionFixturesDetailScreen` renders `Unplayed`; the older `FixturesScreen` renders `-` for the
same state. Both are defensible alone; together a player sees one concept two ways. "Unplayed" is
the CONTEXT.md-aligned and more accessible wording (CONTEXT.md lists **Schedule** as _Avoid_).

- [ ] One wording across both screens, with the loser updated
- [ ] Neither screen communicates played/unplayed by colour alone

## 3. Deferred Competition Fixtures surface

Ticket 04 deliberately shipped a flat list of the current Season's fixtures. The imported spec
[163](../163_competition_fixtures.md) also describes filters (date, round, stage, club, venue,
status), round/stage navigation, calendar-period navigation, and export. These are deferred, not
dropped — recorded here so a ticked checkbox on 04 is not mistaken for full coverage.

Screens 164 (Competition Results) and 161 (Competition Overview) are the remaining v1 scope from
[02 — v1 scope](02-v1-scope.md) and still have no ticket.

- [ ] Decide which of the deferred controls belong in v1 at all before building any of them

## Untested branch (low)

`CompetitionFixturesDetailScreen`'s untyped-`Failure` branch ("Failed to load competition fixtures")
has no test, and `CompetitionTableScreen` has the same hole. Worth one test each once item 1 makes
that branch genuinely unreachable for declared errors.

**Blocked by:** None

**Status:** ready-for-agent
