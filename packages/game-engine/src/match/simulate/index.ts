/** Public surface of the match simulation: the three `simulateMatch*` entry points and their
 * input/output types. The tuning constants, per-team runtime state and event resolvers behind them
 * stay internal to this directory. */
export {
  simulateMatch,
  simulateMatchWithCondition,
  simulateMatchWithCounts,
  resolveSlice,
  type AiTacticalChange,
  type AiTacticalController,
  type MatchPlayerCountEntry,
  type SimulateMatchInput,
} from "./loop.js";

export * from "./phaseStrengthResolver.js";
export * from "./eventResolver.js";
export * from "./setPieceResolver.js";