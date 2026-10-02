import type { TeamRuntimeState } from "./teamState.js";
import type { MatchEvent, MatchHalf } from "../events.js";
import type { RandomSource } from "@cm-clone/shared";
import { resolveSetPieces } from "./setPieceResolvers.js";
import type { MatchPlayerInput } from "../types.js";

/**
 * Input for set piece resolution, provided by the simulation loop.
 */
export interface SetPieceInput {
  readonly attacker: TeamRuntimeState;
  readonly defender: TeamRuntimeState;
  readonly minute: number;
  readonly half: MatchHalf;
  readonly score: { home: number; away: number };
  readonly attackerIsHome: boolean;
  readonly home: TeamRuntimeState;
  readonly away: TeamRuntimeState;
  readonly eventCountBeforeSlice: number;
  readonly random: RandomSource;
}

/**
 * Resolves set pieces from events emitted during a minute-slice.
 * This includes: corners from saved/blocked shots and cleared crosses;
 * free kicks and penalties from fouls.
 */
export class SetPieceResolver {
  /**
   * Resolves set pieces based on the events emitted in the current slice.
   * The eventCountBeforeSlice parameter distinguishes events emitted this slice
   * from events emitted in previous slices.
   */
  static resolve(input: SetPieceInput, events: Array<MatchEvent>): void {
    resolveSetPieces(
      input.attacker,
      input.defender,
      input.minute,
      input.half,
      input.score,
      input.attackerIsHome,
      input.home,
      input.away,
      input.eventCountBeforeSlice,
      input.random,
      events,
    );
  }
}