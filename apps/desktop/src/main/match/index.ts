/**
 * The match subsystem's public surface — every symbol `main/match.ts` exported before it became
 * this directory, and nothing more. Call sites changed their import *path* and not one of the
 * names they ask for.
 *
 * The modules behind it, in the order a match runs through them: `start` (the kickoff snapshot a
 * `StartMatch` freezes into the stream), `stream` (the persisted shapes and the pure re-derivation
 * over them), `view` (a derived timeline turned into the next chunk after a cursor), `queries`
 * (the opponent list and `ResumeSimulation`), and `commands` (the manager's mid-match commands).
 */

export { submitMatchCommand } from "./commands.js";
export { listOpponentClubs, resumeSimulation } from "./queries.js";
export { startMatch } from "./start.js";
