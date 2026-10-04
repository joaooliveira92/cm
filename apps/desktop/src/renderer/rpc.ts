/**
 * The renderer's one public data boundary. Career screens import ONLY this
 * module — never `window.cmClone.call`, `@effect/atom-react`, or
 * `effect/unstable/reactivity`. The physical decomposition behind it lives in
 * `./rpc/*`; a later migration off the hand-rolled RPC group (to
 * `effect/unstable/rpc`) happens here in one file without touching a screen.
 */
export type { RpcClientError } from "./rpc/errors.js";
export { describeRpcError, typedError } from "./rpc/errors.js";
export { readState, type ReadState } from "./rpc/readState.js";

export {
  squadAtom,
  clubSquadAtom,
  playerProfileAtom,
  playerContractAtom,
  playerFormAtom,
  contractExpiryAtom,
  playerDevelopmentHistoryAtom,
  squadDevelopmentAtom,
  workloadAtom,
  staffProfileAtom,
} from "./rpc/squadQueries.js";

export {
  leagueTableAtom,
  competitionTableAtom,
  competitionFixturesAtom,
  fixturesAtom,
  seasonSummaryAtom,
  competitionOverviewAtom,
  competitionsAtom,
} from "./rpc/leagueQueries.js";

export {
  transfersAtom,
  clubTransfersAtom,
  clubFinancesAtom,
  budgetReviewAtom,
  transferHistoryAtom,
} from "./rpc/transferQueries.js";

export {
  scoutingAtom,
  scoutingKnowledgeAtom,
  teamScoutReportAtom,
  teamScoutReadingsAtom,
} from "./rpc/scoutingQueries.js";

export {
  clubInformationAtom,
  clubFixturesAtom,
  clubStaffAtom,
} from "./rpc/clubQueries.js";

export {
  coachingAssignmentsAtom,
  trainingScheduleAtom,
} from "./rpc/trainingQueries.js";

export {
  tacticsAtom,
  tacticsOverviewAtom,
  managerProfileAtom,
  saveSummaryAtom,
  newsInboxAtom,
  boardConfidenceAtom,
} from "./rpc/queries.js";

export {
  saveKey,
  squadKey,
  transfersKey,
  contractExpiryKey,
  transferHistoryKey,
  economyKey,
  tacticsKey,
  matchKey,
  newsKey,
  scoutingKey,
} from "./rpc/keys.js";

export { playerSearchAtom } from "./rpc/playerSearchQueries.js";
export { playerComparisonAtom } from "./rpc/playerComparisonQueries.js";
export { contractOfferAtom } from "./rpc/contractOfferQueries.js";

export {
  INVALIDATION_RULES,
  advanceCalendarMutation,
  assignScoutMutation,
  assignScoutToClubMutation,
  changeTacticsMutation,
  changeTrainingScheduleMutation,
  setTrainingScheduleDelegationMutation,
  commitMatchdayMutation,
  placeBidMutation,
  signFreeAgentMutation,
  respondToBidMutation,
  respondAsBidderMutation,
  renewContractMutation,
  retireManagerMutation,
  saveCareerMutation,
  setNewsMessageStateMutation,
  setRetrainingTargetMutation,
  setTrainingFocusMutation,
  startMatchMutation,
  submitMatchCommandMutation,
  unassignScoutMutation,
} from "./rpc/mutations.js";

export {
  ping,
  listSaves,
  loadSave,
  beginCareer,
  discardCareer,
  deleteSave,
  getCareerSetupSummary,
  getClubSelection,
  createSave,
  getManagerProfile,
  commitCareer,
  getLeagueSetupIndex,
  resolveLeagueSelection,
  submitLeagueSelection,
  saveSetupDraft,
  loadSetupDraft,
  buildLeaguePreset,
  listLeaguePresets,
  saveLeaguePreset,
  applyLeaguePreset,
} from "./rpc/precareer.js";

export { getAwaitingMatch, resumeSimulation, getTeamSheet, getPostMatchSummary, getMatchStatistics, getMatchRatings, getMatchPlayerStats, getMatchOverview, getMatchReport } from "./rpc/match.js";

export {
  REVEAL_INTERVAL_MS,
  POLL_INTERVAL_MS,
  REFETCH_THRESHOLD,
} from "./rpc/pacing.js";

export {
  chooseCommentaryFile,
  getCommentaryFileStatus,
  openCommentaryFile,
  resetCommentaryFile,
  updateCommentaryFile,
} from "./rpc/commentaryFile.js";

export {
  getKeyBindingOverrides,
  setKeyBindingOverride,
  resetKeyBinding,
  resetAllKeyBindings,
  EMPTY_KEY_BINDING_OVERRIDES,
  type KeyBindingOverrides,
} from "./rpc/keybindings.js";

export {
  RegistryProvider,
  useAtomValue,
  useAtom,
  useAtomSet,
  useAtomRefresh,
} from "@effect/atom-react";
export { AsyncResult } from "effect/unstable/reactivity";
export { Atom } from "effect/unstable/reactivity";