import type { Tactic } from "@cm-clone/contracts";
import type { PlayerAttributes } from "@cm-clone/shared";

/** The match engine's own name for a `Tactic` (ticket 03/11) — kept as a type alias so this
 * package stays decoupled from the RPC/persistence concerns `@cm-clone/contracts` also carries. */
export type MatchTactic = Tactic;

export interface MatchPlayerInput {
  readonly id: string;
  readonly attributes: PlayerAttributes;
}

export interface MatchTeamSetup {
  readonly clubId: string;
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
