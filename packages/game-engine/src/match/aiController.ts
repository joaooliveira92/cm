import type { ClubId } from "@cm-clone/contracts";
import type { TeamInstructions } from "@cm-clone/shared";
import type { MatchHalf } from "./events.js";

/**
 * Input state for an AI controller's `resolve` call. The controller owns its own
 * mentality and men-behind-the-ball state — the loop never reads them from the
 * team state for the controller's sake.
 */
export interface AiControllerInput {
  readonly minute: number;
  readonly half: MatchHalf;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly justHadRedCard: boolean;
  readonly justHadGoal: boolean;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
}

/**
 * An AI controller's decision: what tactical changes to apply.
 * Each field is optional — a controller returns only what it wants to change.
 */
export interface TacticalDecision {
  readonly mentality?: TeamInstructions["mentality"];
  readonly menBehindTheBall?: boolean;
}

/**
 * AI controller strategy interface.
 *
 * One controller per AI team, owns the team's mentality and men-behind-the-ball
 * state across calls. The simulation loop calls `resolve` at regular intervals;
 * the controller returns a `TacticalDecision` that the loop applies.
 *
 * Swappable per match: inject a stub controller in tests instead of mocking the
 * loop, and multiple AI strategies can coexist behind this interface.
 */
export interface AiController {
  readonly clubId: ClubId;
  resolve(input: AiControllerInput): TacticalDecision;
}