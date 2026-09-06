/**
 * The match subsystem's public surface — every symbol `main/match.ts` exported before it became
 * this directory, minus the free-opponent exhibition path that a scheduled Fixture replaced, plus
 * `deriveFixtureMatchSeed` — the pure seed policy a Fixture's match is played under.
 *
 * The modules behind it, in the order a match runs through them: `start` (the kickoff snapshot a
 * `StartMatch` freezes into the stream), `stream` (the persisted shapes and the pure re-derivation
 * over them), `view` (a derived timeline turned into the next chunk after a cursor), `queries`
 * (the opponent list and `ResumeSimulation`), and `commands` (the manager's mid-match commands).
 */

export { submitMatchCommand } from "./commands.js";
export { resumeSimulation } from "./queries.js";
export { MatchSeedSource, deriveFixtureMatchSeed, startMatch } from "./start.js";
