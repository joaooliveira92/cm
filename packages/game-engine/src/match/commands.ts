import type { MatchTactic } from "./types.js";

export interface ChangeTacticsCommand {
  readonly _tag: "ChangeTactics";
  readonly clubId: string;
  readonly tactic: MatchTactic;
}

export interface MakeSubstitutionCommand {
  readonly _tag: "MakeSubstitution";
  readonly clubId: string;
  readonly outPlayerId: string;
  readonly inPlayerId: string;
}

/** Mid-match commands the Match Decider accepts (ticket 12) — driven from the UI starting ticket 14. */
export type MatchCommand = ChangeTacticsCommand | MakeSubstitutionCommand;

export const MAX_SUBSTITUTIONS_PER_TEAM = 5;
export const MAX_SUBSTITUTION_WINDOWS_PER_TEAM = 3;
