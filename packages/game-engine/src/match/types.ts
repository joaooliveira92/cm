import type { ClubId, PlayerId, Tactic } from "@cm-clone/contracts";
import type { PlayerAttributes } from "@cm-clone/shared";

/** The match engine's own name for a `Tactic` (ticket 03/11) — kept as a type alias so this
 * package stays decoupled from the RPC/persistence concerns `@cm-clone/contracts` also carries. */
export type MatchTactic = Tactic;

export interface MatchPlayerInput {
  readonly id: PlayerId;
  readonly attributes: PlayerAttributes;
  /** The player's Condition (%) at kickoff — defaults to full (100) when absent. Lets a not-fully-
   * recovered player from the previous fixture (ticket 09) start the match below full Condition. */
  readonly startingCondition?: number;
}

export interface MatchTeamSetup {
  readonly clubId: ClubId;
  readonly squad: ReadonlyArray<MatchPlayerInput>;
  readonly tactic: MatchTactic;
}

/** Flat multiplier/bias struct (ADR-0002/0003) — the only shape of tactics the engine consumes. */
export interface TacticalModifiers {
  readonly attack: number;
  readonly midfield: number;
  readonly defense: number;
  readonly tempo: number;
  readonly pressingAggression: number;
  readonly fatigueDecayMultiplier: number;
  readonly eventOddsBias: number;
}

export interface PhaseStrengths {
  readonly attack: number;
  readonly midfield: number;
  readonly defense: number;
}
