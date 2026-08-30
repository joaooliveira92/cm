import type { MatchTactic } from "./types.js";
import type { ClubId, PlayerId } from "@cm-clone/contracts";

export interface ChangeTacticsCommand {
  readonly _tag: "ChangeTactics";
  readonly clubId: ClubId;
  readonly tactic: MatchTactic;
}

export interface MakeSubstitutionCommand {
  readonly _tag: "MakeSubstitution";
  readonly clubId: ClubId;
  readonly outPlayerId: PlayerId;
  readonly inPlayerId: PlayerId;
}

/**
 * Manager forces an on-pitch player off (ticket 11's orange "bring off" / no-subs flow): empties
 * the player's slot so the team plays with 10 (reusing the red path's empty-slot / last-GK
 * stand-in fallback), consuming no substitution and no window. Tactic-blind like every other
 * command — the only slot awareness is the `isGoalkeeper` flag the GK fallback needs.
 */
export interface ForceOffCommand {
  readonly _tag: "ForceOff";
  readonly clubId: ClubId;
  readonly playerId: PlayerId;
}

/** Mid-match commands the Match Decider accepts (ticket 12) — driven from the UI starting ticket 14. */
export type MatchCommand = ChangeTacticsCommand | MakeSubstitutionCommand | ForceOffCommand;

export const MAX_SUBSTITUTIONS_PER_TEAM = 5;
export const MAX_SUBSTITUTION_WINDOWS_PER_TEAM = 3;
