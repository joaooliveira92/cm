/** Public surface of the match simulation: the three `simulateMatch*` entry points and their
 * input/output types. The tuning constants, per-team runtime state and event resolvers behind them
 * stay internal to this directory. */
export {
  simulateMatch,
  simulateMatchWithCondition,
  simulateMatchWithCounts,
  resolveSlice,
  type MatchPlayerCountEntry,
  type RecordedLineup,
  type SimulateMatchInput,
} from "./loop.js";

export {
  createLineupRecorder,
  type LineupChangeKind,
  type LineupChangeOrigin,
  type LineupJournalEntry,
  type LineupRecorder,
  type LineupSubstitutionRole,
  type RuntimeFrame,
  type RuntimeSlot,
} from "./lineupRecording.js";

export { kickoffFrameOf, materialiseFrames } from "./materialiseFrames.js";

export * from "./phaseStrengthResolver.js";
export * from "./eventResolver.js";
export * from "./setPieceResolvers.js";

export type { AiController, AiControllerInput, TacticalDecision } from "../aiController.js";