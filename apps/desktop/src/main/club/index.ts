/**
 * The club subsystem's public surface: everything a manager does to the eleven and the squad
 * behind it.
 *
 * `squad` (the squad read side and the one home for "the user's club"), `tactics` (the persisted
 * Tactic and its validation), `training` (per-player Training Focus), `scouting` (scout
 * assignments and the knowledge they accrue), `development` (the per-season attribute drift the
 * calendar applies), and `aiClubs` (the same decisions taken for every club the human does not
 * manage).
 */

export {
  ELEVEN,
  SquadTooSmallError,
  assignAiTactics,
  computeLeagueAveragePositionRatings,
  identifyWeakPositions,
  pickBestFormationTactic,
  runAiTransferWindow,
} from "./aiClubs.js";
export { developPlayersForSeason } from "./development.js";
export {
  FULLY_SCOUTED,
  accrueScoutingProgress,
  assignScout,
  discardScoutingForClubs,
  discardScoutingForPlayers,
  getScouting,
  unassignScout,
} from "./scouting.js";
export { getSquad, loadSquadPlayers, loadUserClub } from "./squad.js";
export { changeTactics, getTactics, loadPersistedTactic, persistTactic, validateTactic } from "./tactics.js";
export { setTrainingFocus } from "./training.js";
