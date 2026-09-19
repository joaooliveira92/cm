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
  tacticsAtom,
  tacticsOverviewAtom,
  leagueTableAtom,
  competitionTableAtom,
  competitionFixturesAtom,
  fixturesAtom,
  seasonSummaryAtom,
  managerProfileAtom,
  transfersAtom,
  contractExpiryAtom,
  budgetReviewAtom,
  transferHistoryAtom,
  saveSummaryAtom,
  newsInboxAtom,
  scoutingAtom,
  scoutingKnowledgeAtom,
  teamScoutReportAtom,
  teamScoutReadingsAtom,
  boardConfidenceAtom,
  clubFinancesAtom,
  clubFixturesAtom,
  clubInformationAtom,
  clubTransfersAtom,
  clubStaffAtom,
  coachingAssignmentsAtom,
  workloadAtom,
  playerDevelopmentHistoryAtom,
  squadDevelopmentAtom,
  playerProfileAtom,
  playerContractAtom,
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
} from "./rpc/queries.js";

export {
  INVALIDATION_RULES,
  advanceCalendarMutation,
  assignScoutToClubMutation,
  changeTacticsMutation,
  placeBidMutation,
  signFreeAgentMutation,
  respondToBidMutation,
  respondAsBidderMutation,
  retireManagerMutation,
  setNewsMessageStateMutation,
  setTrainingFocusMutation,
  submitMatchCommandMutation,
  unassignScoutMutation,
} from "./rpc/mutations.js";

export {
  ping,
  listSaves,
  loadSave,
  beginCareer,
  discardCareer,
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

export { commitMatchday, startMatch, resumeSimulation, getTeamSheet, getPostMatchSummary, getMatchStatistics, getMatchReport } from "./rpc/match.js";

export {
  REVEAL_INTERVAL_MS,
  POLL_INTERVAL_MS,
  REFETCH_THRESHOLD,
} from "./rpc/pacing.js";

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