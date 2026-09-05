# 02: Split `main/season.ts` into `main/season/`

**What to build:** `apps/desktop/src/main/season.ts` (1886 lines) becomes `main/season/` with a
barrel, along these seams. Every one was traced during the audit; cross-section references are few
and point downward.

| Target | Symbols |
|---|---|
| `season/start.ts` | `loadLeagueFields`, `scheduleRounds`, `loadHumanCompetitionId`, `generateLeagueFixtures`, `startNextSeason`, `startSeason`, `CalendarSlotsExhaustedError`, `STREAM_TYPE`, `PLAYABLE_DEPTH` |
| `season/fixtureGeneration.ts` | `shuffle`, `GeneratedFixture`, `generateRoundRobinFixtures`, `FixtureGenerationError` -- pure, but stays in `main/` (see the spec's note on why it cannot move to `packages/shared`) |
| `season/matchday.ts` | `getTacticForClub`, `FixtureResult`, `RECOVERY_DAYS_PER_MATCHDAY`, `recoverClubFitness`, `recordFixtureConditions`, `clubStrength`, `FixtureScore`, `resolveFixtureScore`, `discardSquadsForClubs`, `playerIdsForClubs`, `FullTimeWhistleMissingError` |
| `season/cups.ts` | `loadCups`, `loadCupField`, `loadCupRounds`, `materialiseCupRounds`, `cupFinishingOrder`, `cupRoundsOutstanding`, `nextCupRoundDate` |
| `season/standings.ts` | `standingsForSummary`, `matchRecordFor`, `freezeFinalStandings`, `ClubTally`, `emptyTally`, `computeStandings` |
| `season/rollover.ts` | `rolloverToNextSeason`, `pruneConcludedSeason`, `reconcileSquadsWithDepth`, `positionRatingsFor` |
| `season/advance.ts` | `resolveDueFixtures`, `loadCalendarHorizon`, `judgeSeasonEnd`, `expireStalePendingBids`, `advanceCalendar`, `retireManager` |
| `season/queries.ts` | `getFixtures`, `getLeagueTable`, `getSeasonSummary` |

Three of these clusters (`cups`, `standings`, `matchday`) currently have members filed under the
wrong banner comment -- `cupFinishingOrder`, `cupRoundsOutstanding` and `nextCupRoundDate` all sit
outside the cup section today. Pulling them in is part of the ticket.

The 16 import sites (`saves.ts`, `rpcServer.ts`, 13 tests, `e2e/seedSaves.ts`) change their path
from `./season.js` to `./season/index.js` and keep naming the same symbols.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] `main/season.ts` is gone; `main/season/index.ts` re-exports the identical public surface.
- [ ] No file in `main/season/` exceeds ~450 lines.
- [ ] `advanceCalendar`'s body is intact and unsplit, with its ordering comments attached.
- [ ] All 16 import sites updated. Because desktop tests are not typechecked, each of the 13
      affected specs was actually run, not just typechecked.
- [ ] Pure move: no behaviour or signature changes.
- [ ] `pnpm check:all` is green at this commit.
