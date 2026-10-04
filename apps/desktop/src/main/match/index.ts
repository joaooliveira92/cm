/**
 * The match subsystem's public surface — every symbol `main/match.ts` exported before it became
 * this directory, minus the free-opponent exhibition path that a scheduled Fixture replaced, plus
 * `deriveFixtureMatchSeed` — the pure seed policy a Fixture's match is played under.
 *
 * The modules behind it, in the order a match runs through them: `start` (the kickoff snapshot a
 * `StartMatch` freezes into the stream), `view` (a derived timeline turned into the next chunk after a cursor), `queries`
 * (the awaiting match Match day resumes, and `ResumeSimulation`), and `commands` (the manager's mid-match commands).
 * The persisted stream shapes and the pure re-derivation and pitch/substitution projections over them
 * live in `packages/game-engine`.
 * `seedOverride` sits beside them: the test-only boot-time override the entry module reads.
 */

export { submitMatchCommand } from "./commands.js";
export { getPostMatchSummary } from "./postMatchSummary.js";
export { getMatchReport, reportEvents } from "./report.js";
export { aggregateMatchStatistics, getMatchStatistics } from "./statistics.js";
export { getMatchRatings } from "./ratings.js";
export { getMatchPlayerStats } from "./playerStats.js";
export { getPlayerForm } from "./playerForm.js";
export { getMatchOverview } from "./matchOverview.js";
export { getTeamSheet } from "./teamSheet.js";
export { getAwaitingMatch, resumeSimulation } from "./queries.js";
export { MatchSeedSource, deriveFixtureMatchSeed, startMatch } from "./start.js";
export {
  MATCH_SEED_ENV,
  pinnedMatchSeedLayer,
  resolveMatchSeedOverride,
  type MatchSeedOverride,
} from "./seedOverride.js";
