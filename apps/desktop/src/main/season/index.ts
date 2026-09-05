/**
 * The season subsystem's public surface — every symbol `main/season.ts` exported before it became
 * this directory, and nothing more. Call sites changed their import *path* and not one of the
 * names they ask for.
 *
 * The modules behind it, in the order a season runs through them: `start` (fixture calendar and
 * season one), `fixtureGeneration` (the pure round-robin draw), `matchday` (resolving a fixture
 * into a score), `cups` (brackets drawn round by round), `standings` (tables, live and frozen),
 * `rollover` (promotion, relegation, the world a year on), `advance` (the calendar state machine),
 * `queries` (the read side), and `currentSeason` (the one home for "the save's current season").
 */

export { advanceCalendar, expireStalePendingBids, retireManager } from "./advance.js";
export { FixtureGenerationError, generateRoundRobinFixtures, type GeneratedFixture } from "./fixtureGeneration.js";
export { discardSquadsForClubs, recoverClubFitness } from "./matchday.js";
export { getFixtures, getLeagueTable, getSeasonSummary } from "./queries.js";
export { CalendarSlotsExhaustedError, startSeason } from "./start.js";
